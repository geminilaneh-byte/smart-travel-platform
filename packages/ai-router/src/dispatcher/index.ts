import { cwd } from "node:process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { fetchCatalog, filterForbiddenAuthors, isActuallyFreeModel, resolveCatalogByModel, isForbiddenAuthor, isForbiddenModelId } from "../catalog/index.js";
import { createHandoffCheckpoint, canReplaceWorker, validateCheckpointShape } from "../checkpoint/index.js";
import { HealthMonitor } from "../health/index.js";
import { ensureNoDeniedModels, validateRouterConfig } from "../policy/config.js";
import { rankModels } from "../ranking/index.js";
import { TelemetryStore } from "../telemetry/index.js";
import type { CatalogFetchResult, CatalogModel, DataClassification, DispatchDecision, RouterConfig, WorkerLevel } from "../types/index.js";

export interface DispatchRequest {
  task: string;
  prompt: string;
  configPath?: string;
  taskPrompt?: string;
  data_classification?: DataClassification;
}

export interface RouterRuntime {
  healthMonitor?: HealthMonitor;
  catalogFetcher?: (apiKey?: string) => Promise<CatalogFetchResult>;
}

export const defaultHealthMonitor = new HealthMonitor();

function getRouteConfig(config: RouterConfig, task: string) {
  return config.routes[task] ?? {
    worker_pool: "senior",
    reasoning: config.defaults.reasoning,
    requires: ["structured_output"],
  };
}

function getPoolDefinition(config: RouterConfig, route: { worker_pool: string }) {
  return config.worker_pools[route.worker_pool] ?? {
    minimum_level: "L3",
    required: ["structured_output"],
    candidates: ["google/gemini-3.7-flash"],
    replacement: "same_or_higher_level",
  };
}

function resolveDynamicCandidate(candidate: string, catalog: CatalogModel[], route: ReturnType<typeof getRouteConfig>): string {
  if (!candidate.startsWith("dynamic:")) return candidate;

  const requirement = candidate.replace(/^dynamic:/, "");
  const freeOnly = requirement.includes("free");
  const codingOnly = requirement.includes("coding");
  const agenticOnly = requirement.includes("agentic");
  const intelligenceOnly = requirement.includes("intelligence");
  const visionOnly = requirement.includes("vision");

  const filtered = catalog.filter((model) => {
    if (freeOnly && !isActuallyFreeModel(model)) return false;
    if (codingOnly && (model.coding_score === null || model.coding_score < 70)) return false;
    if (agenticOnly && (model.agentic_score === null || model.agentic_score < 70)) return false;
    if (intelligenceOnly && (model.intelligence_score === null || model.intelligence_score < 75)) return false;
    if (visionOnly && !model.supports.vision) return false;
    if (route.requires?.includes("tool_calling") && !model.supports.tool_calling) return false;
    if (route.requires?.includes("structured_output") && !model.supports.structured_output) return false;
    if (route.requires?.includes("vision") && !model.supports.vision) return false;
    return true;
  });

  if (filtered.length === 0) {
    return candidate;
  }

  const averageKnownScores = (model: CatalogModel): number => {
    const scores = [model.coding_score, model.agentic_score, model.intelligence_score].filter((score): score is number => score !== null);
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : Number.NEGATIVE_INFINITY;
  };
  const winner = filtered.sort((a, b) => averageKnownScores(b) - averageKnownScores(a))[0];
  return winner?.id ?? candidate;
}

export function assertRequestedModelMatches(requestedModel: string, resolvedModel: string): void {
  if (requestedModel.trim() !== resolvedModel.trim()) {
    throw new Error(`Requested model mismatch: requested=${requestedModel}, resolved=${resolvedModel}`);
  }
}

export function verifyExecutionResponseModel(requestedModel: string, providerResponseModel: string): void {
  assertRequestedModelMatches(requestedModel, providerResponseModel);
}

function isPolicyAllowed(model: CatalogModel, config: RouterConfig): boolean {
  const author = model.author.toLowerCase();
  const allowedAuthors = new Set(config.provider_policy.allowed_authors.map((entry) => entry.toLowerCase()));
  return allowedAuthors.has(author) && !isForbiddenAuthor(author) && !isForbiddenModelId(model.id);
}

export async function dispatchTask(request: DispatchRequest, runtime: RouterRuntime = {}): Promise<DispatchDecision> {
  const configPath = request.configPath ?? join(cwd(), "config", "model-router.yaml");
  const config = await validateRouterConfig(configPath);
  ensureNoDeniedModels(config);

  const route = getRouteConfig(config, request.task);
  const pool = getPoolDefinition(config, route);
  const catalogResult = await (runtime.catalogFetcher ?? fetchCatalog)(process.env.OPENROUTER_API_KEY);
  const classification = request.data_classification ?? "sensitive";
  const allowedCatalog = filterForbiddenAuthors(catalogResult.catalog)
    .filter((entry) => isPolicyAllowed(entry, config))
    .filter((entry) => classification === "public" || (!entry.retention_enabled && !entry.stealth));
  const rawCandidates = [...new Set(pool.candidates
    .map((candidate) => resolveDynamicCandidate(candidate, allowedCatalog, route))
    .filter((candidate) => !isForbiddenAuthor(candidate.split("/")[0]) && !isForbiddenModelId(candidate)))];

  const denied = rawCandidates.filter((candidate) => isForbiddenModelId(candidate) || isForbiddenAuthor(candidate.split("/")[0]) || isForbiddenAuthor(resolveCatalogByModel(candidate, allowedCatalog)?.author));
  if (denied.length > 0) {
    throw new Error(`Denied author or model in dispatch candidates: ${denied.join(", ")}`);
  }

  const filteredCandidates = rawCandidates.filter((candidate) => {
    const catalogEntry = resolveCatalogByModel(candidate, allowedCatalog);
    return catalogEntry !== undefined && isPolicyAllowed(catalogEntry, config);
  });

  const ranked = rankModels(filteredCandidates, allowedCatalog, route, pool, config);
  if (ranked.length === 0) {
    throw new Error(`No valid model candidates available for task: ${request.task}`);
  }

  for (const rankedModel of ranked) {
    if (isForbiddenAuthor(rankedModel.catalogModel?.author) || isForbiddenModelId(rankedModel.model)) {
      throw new Error(`Policy recheck failed for candidate: ${rankedModel.model}`);
    }
  }

  const healthMonitor = runtime.healthMonitor ?? defaultHealthMonitor;
  const selected = ranked[0];
  const currentLevel = pool.minimum_level;
  const modelLevel = currentLevel as WorkerLevel;
  const checkpoint = createHandoffCheckpoint(request.task, {
    task_spec: `Route task ${request.task} through policy-aware model selection`,
    decisions: [`Selected ${selected.model} from ${route.worker_pool}`],
    owned_files: ["packages/ai-router"],
    tests_run: [],
    failures: [],
    remaining_work: ["Tighten provider-specific integration behavior"],
    prohibited_actions: ["No crawler activation", "No production deploy", "No independent model merge or publish"],
  });

  if (healthMonitor.isFatigued(selected.model, config)) {
    const replacement = ranked.slice(1).find((entry) => {
      const model = entry.catalogModel;
      return model !== undefined
        && canReplaceWorker(modelLevel, entry.level)
        && !healthMonitor.isFatigued(entry.model, config)
        && isPolicyAllowed(model, config);
    });
    if (replacement) {
      validateCheckpointShape(checkpoint as unknown as Record<string, unknown>, config);
      const replacementModel = replacement.model;
      const replacementCatalogModel = replacement.catalogModel;
      if (!replacementCatalogModel || !isPolicyAllowed(replacementCatalogModel, config)) {
        throw new Error(`Policy recheck failed for replacement: ${replacementModel}`);
      }
      const replacementRecord: DispatchDecision = {
        task: request.task,
        route: route.worker_pool,
        requested_model: selected.model,
        resolved_model: replacementModel,
        provider: replacementCatalogModel.transport_provider,
        transport_provider: replacementCatalogModel.transport_provider,
        author: replacementCatalogModel.author,
        upstream_provider_if_known: replacementCatalogModel.upstream_provider_if_known,
        catalog_source: replacementCatalogModel.catalog_source,
        score_source: replacement.score_source,
        execution_verified: false,
        is_byok: Boolean(process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY),
        ranking_snapshot: ranked.map((entry) => ({ model: entry.model, score: entry.score })),
        latency_ms: 180,
        input_tokens: 1200,
        output_tokens: 600,
        cost: 0,
        attempts: 2,
        cache_hit: false,
        result: "fallback",
        checkpoint: checkpoint as unknown as Record<string, unknown>,
      };
      const telemetry = new TelemetryStore();
      telemetry.record(replacementRecord);
      return replacementRecord;
    }
  }

  const checkpointRecord = checkpoint as unknown as Record<string, unknown>;
  const selectedCatalogModel = selected.catalogModel;
  if (!selectedCatalogModel || !isPolicyAllowed(selectedCatalogModel, config)) {
    throw new Error(`Policy recheck failed before dispatch: ${selected.model}`);
  }

  const record: DispatchDecision = {
    task: request.task,
    route: route.worker_pool,
    requested_model: selected.model,
    resolved_model: selected.model,
    provider: selectedCatalogModel.transport_provider,
    transport_provider: selectedCatalogModel.transport_provider,
    author: selectedCatalogModel.author,
    upstream_provider_if_known: selectedCatalogModel.upstream_provider_if_known,
    catalog_source: selectedCatalogModel.catalog_source,
    score_source: selected.score_source,
    execution_verified: false,
    is_byok: Boolean(process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY),
    ranking_snapshot: ranked.map((entry) => ({ model: entry.model, score: entry.score })),
    latency_ms: selected.catalogModel?.latency_ms ?? 250,
    input_tokens: 1200,
    output_tokens: 600,
    cost: (selectedCatalogModel.output_price ?? 0) + (selectedCatalogModel.input_price ?? 0),
    attempts: 1,
    cache_hit: false,
    result: "success",
    checkpoint: checkpointRecord,
  };

  const telemetry = new TelemetryStore();
  telemetry.record(record);
  return record;
}

export async function getModelList(): Promise<CatalogModel[]> {
  return (await fetchCatalog(process.env.OPENROUTER_API_KEY)).catalog;
}

export async function validatePolicy(configPath = join(cwd(), "config", "model-router.yaml")): Promise<void> {
  const config = await validateRouterConfig(configPath);
  ensureNoDeniedModels(config);
  await readFile(join(cwd(), ".env.example"), "utf8");
}
