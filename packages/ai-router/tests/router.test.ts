import { describe, expect, it } from "vitest";

import {
  filterForbiddenAuthors,
  isActuallyFreeModel,
  normalizeCatalog,
  resolveCatalogByModel,
} from "../src/catalog/index.js";
import {
  assertRequestedModelMatches,
  dispatchTask,
  verifyExecutionResponseModel,
} from "../src/dispatcher/index.js";
import { HealthMonitor } from "../src/health/index.js";
import { isDeniedModel, validateRouterConfig } from "../src/policy/config.js";
import { rankModels } from "../src/ranking/index.js";
import type { CatalogFetchResult } from "../src/types/index.js";

const configPath = "config/model-router.yaml";

function liveCatalog(entries: Array<Record<string, unknown>>): CatalogFetchResult {
  return {
    catalog: normalizeCatalog(entries, "openrouter_live"),
    meta: { source: "openrouter_live", live_request_succeeded: true, warning: null },
  };
}

describe("ai-router policy and dispatch", () => {
  it("excludes denied OpenAI and Anthropic models", async () => {
    const config = await validateRouterConfig(configPath);
    expect(isDeniedModel("openai/gpt-4o", config)).toBe(true);
    expect(isDeniedModel("anthropic/claude-3.5", config)).toBe(true);

    const candidates = normalizeCatalog([
      { id: "openai/gpt-4o", author: "openai", pricing: { prompt: 1, completion: 2 } },
      { id: "anthropic/claude-3.5", author: "anthropic", pricing: { prompt: 1, completion: 2 } },
      { id: "google/gemini-3.7-flash", author: "google", pricing: { prompt: 0, completion: 0 }, retention_enabled: false },
    ]);

    expect(filterForbiddenAuthors(candidates).map((entry) => entry.author)).toEqual(["google"]);
  });

  it("marks free only from complete zero-priced live data", () => {
    expect(isActuallyFreeModel({ catalog_source: "openrouter_live", pricing: { prompt: 0, completion: 0 } })).toBe(true);
    expect(isActuallyFreeModel({ catalog_source: "openrouter_live", pricing: { prompt: 0.1, completion: 0 } })).toBe(false);
    expect(isActuallyFreeModel({ catalog_source: "openrouter_live", pricing: { prompt: 0, completion: null } })).toBe(false);
    expect(isActuallyFreeModel({ catalog_source: "static_fallback", pricing: { prompt: 0, completion: 0 } })).toBe(false);
  });

  it("keeps unknown quality scores null and ranks without fabricating them", async () => {
    const config = await validateRouterConfig(configPath);
    const catalog = normalizeCatalog([
      {
        id: "mistralai/unknown-model",
        author: "mistralai",
        pricing: { prompt: 0, completion: 0 },
        retention_enabled: false,
        supports: { tool_calling: true, structured_output: true, vision: false, long_context: true },
      },
    ]);
    expect(catalog[0].intelligence_score).toBeNull();
    expect(catalog[0].coding_score).toBeNull();
    expect(catalog[0].agentic_score).toBeNull();

    const ranked = rankModels(
      ["mistralai/unknown-model"],
      catalog,
      config.routes.coding_general,
      config.worker_pools.senior,
      config,
    );
    expect(ranked).toHaveLength(1);
    expect(ranked[0].score_source).toBe("unknown");
    expect(ranked[0].catalogModel?.intelligence_score).toBeNull();
  });

  it("uses exact model identifiers only", () => {
    const catalog = normalizeCatalog([
      { id: "qwen/qwen3-8b", author: "qwen", pricing: { prompt: 0, completion: 0 }, retention_enabled: false },
      { id: "qwen/qwen3.8-27b", author: "qwen", pricing: { prompt: 0, completion: 0 }, retention_enabled: false },
    ]);
    expect(resolveCatalogByModel("qwen/qwen3-8b", catalog)?.id).toBe("qwen/qwen3-8b");
    expect(resolveCatalogByModel("qwen/qwen3", catalog)).toBeUndefined();
  });

  it("defaults missing classification to sensitive and excludes stealth or retention models", async () => {
    const result = liveCatalog([
      {
        id: "qwen/qwen3.8-27b",
        author: "qwen",
        pricing: { prompt: 0, completion: 0 },
        retention_enabled: true,
        stealth: true,
        supports: { tool_calling: true, structured_output: true, vision: true, long_context: true },
      },
      {
        id: "google/gemini-3.7-flash",
        author: "google",
        pricing: { prompt: 1, completion: 1 },
        retention_enabled: false,
        stealth: false,
        supports: { tool_calling: true, structured_output: true, vision: true, long_context: true },
      },
    ]);

    const decision = await dispatchTask(
      { task: "coding_general", prompt: "customer profile sync", configPath },
      { catalogFetcher: async () => result, healthMonitor: new HealthMonitor() },
    );
    expect(decision.resolved_model).toBe("google/gemini-3.7-flash");
  });

  it("persists fatigue and replaces only after a validated checkpoint", async () => {
    const config = await validateRouterConfig(configPath);
    const monitor = new HealthMonitor();
    monitor.recordOutcome("qwen/qwen3.8-27b", "L3", "error", 9000, 10);
    monitor.recordOutcome("qwen/qwen3.8-27b", "L3", "error", 9000, 10);
    expect(monitor.isFatigued("qwen/qwen3.8-27b", config)).toBe(true);

    const result = liveCatalog([
      {
        id: "qwen/qwen3.8-27b",
        author: "qwen",
        pricing: { prompt: 0, completion: 0 },
        retention_enabled: false,
        supports: { tool_calling: true, structured_output: true, vision: true, long_context: true },
      },
      {
        id: "google/gemini-3.7-flash",
        author: "google",
        pricing: { prompt: 1, completion: 1 },
        retention_enabled: false,
        supports: { tool_calling: true, structured_output: true, vision: true, long_context: true },
      },
    ]);
    const decision = await dispatchTask(
      { task: "coding_general", prompt: "public code", configPath, data_classification: "public" },
      { catalogFetcher: async () => result, healthMonitor: monitor },
    );
    expect(decision.requested_model).toBe("qwen/qwen3.8-27b");
    expect(decision.resolved_model).toBe("google/gemini-3.7-flash");
    expect(decision.result).toBe("fallback");
    expect(decision.checkpoint).toBeDefined();
  });

  it("separates transport, author and upstream provider metadata", async () => {
    const result = liveCatalog([
      {
        id: "google/gemini-3.7-flash",
        author: "google",
        upstream_provider_if_known: "google",
        pricing: { prompt: 1, completion: 1 },
        retention_enabled: false,
        supports: { tool_calling: true, structured_output: true, vision: true, long_context: true },
      },
    ]);
    const decision = await dispatchTask(
      { task: "coding_general", prompt: "public code", configPath, data_classification: "public" },
      { catalogFetcher: async () => result, healthMonitor: new HealthMonitor() },
    );
    expect(decision.transport_provider).toBe("openrouter");
    expect(decision.author).toBe("google");
    expect(decision.upstream_provider_if_known).toBe("google");
    expect(decision.catalog_source).toBe("openrouter_live");
  });

  it("distinguishes live and static catalog metadata", () => {
    const live = normalizeCatalog([{ id: "google/gemini-3.7-flash", author: "google", pricing: { prompt: 0, completion: 0 } }], "openrouter_live");
    const fallback = normalizeCatalog([{ id: "google/gemini-3.7-flash", author: "google", pricing: { prompt: 0, completion: 0 } }], "static_fallback");
    expect(live[0].catalog_source).toBe("openrouter_live");
    expect(live[0].free).toBe(true);
    expect(fallback[0].catalog_source).toBe("static_fallback");
    expect(fallback[0].free).toBe(false);
  });

  it("rejects provider execution model mismatches", () => {
    expect(() => assertRequestedModelMatches("google/gemini-3.7-flash", "qwen/qwen3.8-27b")).toThrow(/Requested model mismatch/);
    expect(() => verifyExecutionResponseModel("google/gemini-3.7-flash", "qwen/qwen3.8-27b")).toThrow(/Requested model mismatch/);
  });
});
