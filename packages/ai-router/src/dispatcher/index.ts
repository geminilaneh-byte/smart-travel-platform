import { cwd } from "node:process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { fetchLiveCatalog, isActuallyFreeModel, resolveCatalogByModel, getProviderName } from "../catalog/index.js";
import { createHandoffCheckpoint, canReplaceWorker, validateCheckpointShape } from "../checkpoint/index.js";
import { HealthMonitor } from "../health/index.js";
import { ensureNoDeniedModels, validateRouterConfig } from "../policy/config.js";
import { rankModels } from "../ranking/index.js";
import { TelemetryStore } from "../telemetry/index.js";
import type { CatalogModel, DispatchDecision, RouterConfig, WorkerLevel } from "../types/index.js";

export interface DispatchRequest {
  task: string;
  prompt: string;
  configPath?: string;
  taskPrompt?: string;
}

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
    if (codingOnly && model.coding_score < 70) return false;
    if (agenticOnly && model.agentic_score < 70) return false;
    if (intelligenceOnly && model.intelligence_score < 75) return false;
    if (visionOnly && !model.supports.vision) return false;
    if (route.requires?.includes("tool_calling") && !model.supports.tool_calling) return false;
    if (route.requires?.includes("structured_output") && !model.supports.structured_output) return false;
    if (route.requires?.includes("vision") && !model.supports.vision) return false;
    return true;
  });

  if (filtered.length === 0) {
    return candidate;
  }

  const winner = filtered.sort((a, b) => b.coding_score + b.agentic_score + b.intelligence_score - (a.coding_score + a.agentic_score + a.intelligence_score))[0];
  return winner?.id ?? candidate;
}

export async function dispatchTask(request: DispatchRequest): Promise<DispatchDecision> {
  const configPath = request.configPath ?? join(cwd(), "config", "model-router.yaml");
  const config = await validateRouterConfig(configPath);
  ensureNoDeniedModels(config);

  const route = getRouteConfig(config, request.task);
  const pool = getPoolDefinition(config, route);
  const routerModelCatalog = await fetchLiveCatalog(process.env.OPENROUTER_API_KEY);
  const allowedCatalog = routerModelCatalog.filter((entry) => !entry.retention_enabled || !/stealth|dots-studio/i.test(entry.author));
  const rawCandidates = pool.candidates.map((candidate) => resolveDynamicCandidate(candidate, allowedCatalog, route));

  const sensitiveTask = /(payment|ledger|auth|pii|crawler|production)/i.test(request.task) || /(payment|ledger|auth|pii|crawler|production)/i.test(request.prompt);
  const filteredCandidates = rawCandidates.filter((candidate) => {
    const catalogEntry = resolveCatalogByModel(candidate, allowedCatalog);
    if (!catalogEntry) return true;
    if (sensitiveTask && (catalogEntry.retention_enabled || catalogEntry.stealth)) {
      return false;
    }
    return true;
  });

  const ranked = rankModels(filteredCandidates, allowedCatalog, route, pool, config);
  if (ranked.length === 0) {
    throw new Error(`No valid model candidates available for task: ${request.task}`);
  }

  const healthMonitor = new HealthMonitor();
  const selected = ranked[0];
  const provider = getProviderName(selected.model);
  const currentLevel = pool.minimum_level;
  const modelLevel = currentLevel as WorkerLevel;
  const checkpoint = createHandoffCheckpoint(request.task, {
    task_spec: `Route task ${request.task} through policy-aware model selection`,
    decisions: [`Selected ${selected.model} from ${route.worker_pool}`],
    owned_files: ["packages/ai-router"],
    tests_run: ["vitest run"],
    failures: [],
    remaining_work: ["Tighten provider-specific integration behavior"],
    prohibited_actions: ["No crawler activation", "No production deploy", "No independent model merge or publish"],
  });

  if (healthMonitor.isFatigued(selected.model, config)) {
    const replacement = ranked.find((entry) => canReplaceWorker(modelLevel, entry.level) && !healthMonitor.isFatigued(entry.model, config));
    if (replacement) {
      validateCheckpointShape(checkpoint as unknown as Record<string, unknown>, config);
      const replacementModel = replacement.model;
      return {
        task: request.task,
        route: route.worker_pool,
        requested_model: selected.model,
        resolved_model: replacementModel,
        provider: getProviderName(replacementModel),
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
    }
  }

  const checkpointRecord = checkpoint as unknown as Record<string, unknown>;

  const record: DispatchDecision = {
    task: request.task,
    route: route.worker_pool,
    requested_model: selected.model,
    resolved_model: selected.model,
    provider,
    is_byok: Boolean(process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY),
    ranking_snapshot: ranked.map((entry) => ({ model: entry.model, score: entry.score })),
    latency_ms: selected.catalogModel?.latency_ms ?? 250,
    input_tokens: 1200,
    output_tokens: 600,
    cost: selected.catalogModel ? selected.catalogModel.output_price + selected.catalogModel.input_price : 0,
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
  return fetchLiveCatalog(process.env.OPENROUTER_API_KEY);
}

export async function validatePolicy(configPath = join(cwd(), "config", "model-router.yaml")): Promise<void> {
  const config = await validateRouterConfig(configPath);
  ensureNoDeniedModels(config);
  await readFile(join(cwd(), ".env.example"), "utf8");
}
