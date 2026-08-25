import type { CatalogModel, ModelCandidate, RouteDefinition, RouterConfig, WorkerLevel, WorkerPoolDefinition } from "../types/index.js";

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
): ModelCandidate[] {
  type RankedCandidate = ModelCandidate & { catalogModel: CatalogModel };
  const requiredCapabilities = route.requires ?? [];
  const lookup = new Map(catalog.map((entry) => [entry.id.toLowerCase(), entry]));

  const scored = candidateModels
    .map((candidate) => {
      const model = lookup.get(candidate.toLowerCase());
      if (!model) return null;

      if (requiredCapabilities.includes("tool_calling") && !model.supports.tool_calling) return null;
      if (requiredCapabilities.includes("structured_output") && !model.supports.structured_output) return null;
      if (requiredCapabilities.includes("vision") && !model.supports.vision) return null;
      if (requiredCapabilities.includes("long_context") && !model.supports.long_context) return null;

      const qualityTerms = [
        { value: model.intelligence_score, weight: 1.2 },
        { value: model.coding_score, weight: 1.15 },
        { value: model.agentic_score, weight: 1.1 },
        { value: model.vision_score, weight: 0.5 },
      ].filter((term): term is { value: number; weight: number } => term.value !== null);

      const qualityWeight = qualityTerms.reduce((sum, term) => sum + term.weight, 0);
      const qualityScore = qualityWeight > 0
        ? qualityTerms.reduce((sum, term) => sum + term.value * term.weight, 0) / qualityWeight
        : null;

      let score = qualityScore ?? 0;
      if (model.health !== null) score += model.health * 30;
      if (model.tool_success_rate !== null) score += model.tool_success_rate * 30;
      if (model.latency_ms !== null) score += Math.max(0, 20 - model.latency_ms / 100);
      if (model.input_price !== null) score -= model.input_price * 50;
      if (model.output_price !== null) score -= model.output_price * 60;

      if (requiredCapabilities.includes("tool_calling")) score += 30;
      if (requiredCapabilities.includes("structured_output")) score += 25;
      if (requiredCapabilities.includes("vision")) score += 25;
      if (requiredCapabilities.includes("long_context")) score += 20;

      if (config.defaults.free_first && model.free) score += 20;
      if (route.worker_pool === "strategic") score += 10;
      if (route.worker_pool === "senior") score += 8;

      const level = levelFromPool(pool);
      score += workerLevelValue(level) * 25;

      return {
        model: candidate,
        provider: model.transport_provider,
        level,
        isFree: model.free,
        score,
        score_source: qualityScore === null ? "unknown" : model.score_source,
        catalogModel: model,
      };
    })
    .filter((entry): entry is RankedCandidate => entry !== null && entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored;
}
