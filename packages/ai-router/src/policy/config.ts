import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import type { RouterConfig } from "../types/index.js";

const routeSchema = z.object({
  worker_pool: z.string(),
  reviewer_pool: z.string().optional(),
  reasoning: z.enum(["low", "medium", "high", "xhigh"]).optional(),
  human_approval: z.boolean().optional(),
  repository_write: z.enum(["patch_only"]).optional(),
  fallback_pool: z.string().optional(),
  requires: z.array(z.string()).optional(),
  allowed_authors: z.array(z.string()).optional(),
});

const workerPoolSchema = z.object({
  minimum_level: z.enum(["L1", "L2", "L3", "L4"]),
  required: z.array(z.string()).optional(),
  candidates: z.array(z.string()),
  leader_pool: z.string().optional(),
  replacement: z.literal("same_or_higher_level"),
  selection_sort: z.array(z.string()).optional(),
  reviewer_pool: z.string().optional(),
});

const routerConfigSchema = z.object({
  version: z.number(),
  defaults: z.object({
    orchestrator: z.string(),
    provider_neutral: z.boolean(),
    selection_strategy: z.string(),
    free_first: z.boolean(),
    reasoning: z.enum(["low", "medium", "high", "xhigh"]),
    timeout_ms: z.number(),
    max_retries: z.number(),
    require_structured_output: z.boolean(),
    log_router_metadata: z.boolean(),
  }),
  provider_policy: z.object({
    allowed_authors: z.array(z.string()),
    denied_authors: z.array(z.string()),
    denied_model_patterns: z.array(z.string()),
    denied_until: z.string(),
    enforcement: z.literal("fail_closed"),
  }),
  privacy: z.object({
    secrets_to_models: z.literal("never"),
    pii_mode: z.literal("redact"),
    external_provider_default: z.object({
      data_collection: z.literal("deny"),
      zdr: z.boolean(),
    }),
  }),
  routes: z.record(routeSchema),
  worker_pools: z.record(workerPoolSchema),
  live_catalog_policy: z.object({
    refresh_seconds: z.number(),
    endpoint: z.string(),
    filters: z.record(z.union([z.boolean(), z.string(), z.number()])),
    ranking_dimensions: z.array(z.string()),
    free_definition: z.object({
      prompt_price_per_million: z.number(),
      completion_price_per_million: z.number(),
    }),
    expiration_handling: z.string(),
  }),
  guards: z.array(z.object({
    id: z.string(),
    rule: z.string().optional(),
    match: z.array(z.string()).optional(),
    require: z.array(z.string()).optional(),
  })),
  health_policy: z.object({
    context_soft_limit_percent: z.number(),
    context_hard_limit_percent: z.number(),
    consecutive_invalid_outputs: z.number(),
    consecutive_provider_errors: z.number(),
    latency_slo_multiplier: z.number(),
    cooldown_seconds: z.number(),
    circuit_breaker_seconds: z.number(),
  }),
  handoff_checkpoint: z.object({
    required_fields: z.array(z.string()),
  }),
  telemetry: z.object({
    fields: z.array(z.string()),
  }),
});

export function isDeniedModel(model: string, config: RouterConfig): boolean {
  const value = model.trim().toLowerCase();
  if (!value) {
    return false;
  }

  const deniedAuthors = config.provider_policy.denied_authors.map((author) => author.toLowerCase());
  const selfAuthor = value.split("/")[0];

  if (deniedAuthors.includes(selfAuthor)) {
    return true;
  }

  for (const pattern of config.provider_policy.denied_model_patterns) {
    const regex = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`, "i");
    if (regex.test(value)) {
      return true;
    }
  }

  return value.includes("claude") || value.includes("codex") || value.includes("openai") || value.includes("anthropic");
}

export function collectStringValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectStringValues(entry));
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((entry) => collectStringValues(entry));
  }

  return typeof value === "string" ? [value] : [];
}

export function ensureNoDeniedModels(config: RouterConfig): void {
  const offenderStrings = collectStringValues(config).filter((candidate) => typeof candidate === "string" && candidate.includes("/") && !candidate.includes("*"));
  const denied = offenderStrings.filter((candidate) => isDeniedModel(candidate, config));

  if (denied.length > 0) {
    throw new Error(`Denied model reference detected: ${[...new Set(denied)].join(", ")}`);
  }
}

export async function validateRouterConfig(configPath: string): Promise<RouterConfig> {
  const content = await readFile(configPath, "utf8");
  const parsed = parse(content) as unknown;
  const config = routerConfigSchema.parse(parsed) as RouterConfig;

  ensureNoDeniedModels(config);
  return config;
}

export function buildConfigPath(projectRoot = process.cwd()): string {
  return join(projectRoot, "config", "model-router.yaml");
}
