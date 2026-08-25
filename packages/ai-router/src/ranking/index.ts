import type { CatalogModel, RouteDefinition, RouterConfig, WorkerLevel, WorkerPoolDefinition } from "../types/index.js";

export function workerLevelValue(level: WorkerLevel): number {
  return { L1: 1, L2: 2, L3: 3, L4: 4 }[level] ?? 0;
}

export function levelFromPool(pool: WorkerPoolDefinition): WorkerLevel {
  return pool.minimum_level;
}

export function rankModels(
  candidateModels: string[],
  catalog: CatalogModel[],
  route: RouteDefinition,
  pool: WorkerPoolDefinition,
  config: RouterConfig,
): Array<{ model: string; level: WorkerLevel; score: number; catalogModel?: CatalogModel }> {
  const requiredCapabilities = route.requires ?? [];
  const lookup = new Map(catalog.map((entry) => [entry.id.toLowerCase(), entry]));

  const scored = candidateModels
    .map((candidate) => {
      const model = lookup.get(candidate.toLowerCase()) ?? lookup.get(candidate.toLowerCase().replace(/:free$/, ""));
      const fallback = model ?? {
        id: candidate,
        author: candidate.split("/")[0] ?? "unknown",
        provider: candidate.includes("gemini") ? "gemini" : "openrouter",
        providerName: candidate.includes("gemini") ? "Gemini" : "OpenRouter",
        input_price: 0,
        output_price: 0,
        pricing: { prompt: 0, completion: 0, currency: "USD" },
        context_length: 32768,
        supports: { tool_calling: true, structured_output: true, vision: false, long_context: true },
        intelligence_score: 80,
        coding_score: 80,
        agentic_score: 75,
        vision_score: 50,
        tool_success_rate: 0.8,
        health: 0.8,
        latency_ms: 500,
        free: true,
        retention_enabled: false,
        stealth: false,
        is_live: true,
      } as CatalogModel;

      let score = 0;
      score += fallback.intelligence_score * 1.2;
      score += fallback.coding_score * 1.15;
      score += fallback.agentic_score * 1.1;
      score += fallback.health * 100;
      score += fallback.tool_success_rate * 100;
      score += fallback.vision_score * 0.5;
      score += Math.max(0, 100 - fallback.latency_ms / 10);
      score -= fallback.input_price * 50;
      score -= fallback.output_price * 60;

      if (requiredCapabilities.includes("tool_calling") && fallback.supports.tool_calling) score += 30;
      if (requiredCapabilities.includes("structured_output") && fallback.supports.structured_output) score += 25;
      if (requiredCapabilities.includes("vision") && fallback.supports.vision) score += 25;
      if (requiredCapabilities.includes("long_context") && fallback.supports.long_context) score += 20;

      if (config.defaults.free_first && fallback.free) score += 20;
      if (route.worker_pool === "strategic") score += 10;
      if (route.worker_pool === "senior") score += 8;

      const level = levelFromPool(pool);
      score += workerLevelValue(level) * 25;

      return {
        model: candidate,
        level,
        score,
        catalogModel: fallback,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored;
}
