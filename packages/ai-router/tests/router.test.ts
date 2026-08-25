import { describe, expect, it } from "vitest";

import { isActuallyFreeModel, normalizeCatalog } from "../src/catalog/index.js";
import { HealthMonitor } from "../src/health/index.js";
import { isDeniedModel, validateRouterConfig } from "../src/policy/config.js";
import { dispatchTask } from "../src/dispatcher/index.js";

describe("ai-router policy and dispatch", () => {
  it("validates the router config without allowing denied models", async () => {
    const config = await validateRouterConfig("config/model-router.yaml");
    expect(config.defaults.orchestrator).toBe("commander");
    expect(isDeniedModel("openai/gpt-4o", config)).toBe(true);
    expect(() => isDeniedModel("google/gemini-3.7-flash", config)).not.toThrow();
  });

  it("only marks a model free when both prices are zero", () => {
    expect(isActuallyFreeModel({ pricing: { prompt: 0, completion: 0 } })).toBe(true);
    expect(isActuallyFreeModel({ pricing: { prompt: 0.1, completion: 0 } })).toBe(false);
    expect(isActuallyFreeModel({ pricing: { prompt: 0, completion: 0.2 } })).toBe(false);
  });

  it("routes a coding task through the configured worker pool", async () => {
    const result = await dispatchTask({ task: "coding_general", prompt: "Build a safe TypeScript validator", configPath: "config/model-router.yaml" });
    expect(result.result).toBe("success");
    expect(result.route).toBe("senior");
    expect(result.ranking_snapshot.length).toBeGreaterThan(0);
  });

  it("implements fatigue handling and circuit cooldown", () => {
    const monitor = new HealthMonitor();
    monitor.recordOutcome("test/model", "L3", "error", 9000, 10);
    monitor.recordOutcome("test/model", "L3", "error", 9000, 10);
    expect(monitor.isFatigued("test/model", {
      defaults: { timeout_ms: 180000, reasoning: "medium" },
      health_policy: { consecutive_invalid_outputs: 2, consecutive_provider_errors: 2, cooldown_seconds: 300, circuit_breaker_seconds: 900, latency_slo_multiplier: 1.5, context_soft_limit_percent: 70, context_hard_limit_percent: 80 },
    } as any)).toBe(true);
  });

  it("normalizes the live catalog and preserves free detection", () => {
    const normalized = normalizeCatalog([
      { id: "google/gemini-3.7-flash", author: "google", pricing: { prompt: 0, completion: 0 }, supports: { tool_calling: true, structured_output: true, vision: true, long_context: true } },
      { id: "openai/gpt-4o", author: "openai", pricing: { prompt: 1, completion: 2 }, supports: { tool_calling: true, structured_output: true, vision: true, long_context: true } },
    ]);

    expect(normalized[0].free).toBe(true);
    expect(normalized[1].free).toBe(false);
  });
});
