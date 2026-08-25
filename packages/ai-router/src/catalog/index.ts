import type { CatalogFetchResult, CatalogModel, CatalogSource, ProviderType, ScoreSource } from "../types/index.js";

const CURATED_MODEL_SCORES: Record<string, { intelligence_score: number; coding_score: number; agentic_score: number; vision_score: number }> = {
  "google/gemini-3.7-flash": { intelligence_score: 94, coding_score: 92, agentic_score: 88, vision_score: 96 },
  "qwen/qwen3.8-27b": { intelligence_score: 93, coding_score: 91, agentic_score: 82, vision_score: 91 },
  "z-ai/glm-5.3": { intelligence_score: 92, coding_score: 89, agentic_score: 91, vision_score: 60 },
  "stealth/ox-alpha": { intelligence_score: 86, coding_score: 88, agentic_score: 90, vision_score: 30 },
  "dots-studio/dots-3-note-preview:free": { intelligence_score: 82, coding_score: 84, agentic_score: 80, vision_score: 50 },
};

const FALLBACK_MODELS: Array<Record<string, unknown>> = [
  {
    id: "google/gemini-3.7-flash",
    author: "google",
    provider: "gemini",
    provider_name: "Gemini",
    pricing: { prompt: 0.0, completion: 0.0, currency: "USD" },
    context_length: 1048576,
    supports: { tool_calling: true, structured_output: true, vision: true, long_context: true },
    intelligence_score: 94,
    coding_score: 92,
    agentic_score: 88,
    vision_score: 96,
    tool_success_rate: 0.95,
    health: 0.94,
    latency_ms: 190,
    retention_enabled: false,
    stealth: false,
    is_live: true,
  },
  {
    id: "qwen/qwen3.8-27b",
    author: "qwen",
    provider: "openrouter",
    provider_name: "OpenRouter",
    pricing: { prompt: 0.0, completion: 0.0, currency: "USD" },
    context_length: 32768,
    supports: { tool_calling: true, structured_output: true, vision: true, long_context: true },
    intelligence_score: 93,
    coding_score: 91,
    agentic_score: 82,
    vision_score: 91,
    tool_success_rate: 0.93,
    health: 0.9,
    latency_ms: 220,
    retention_enabled: false,
    stealth: false,
    is_live: true,
  },
  {
    id: "z-ai/glm-5.3",
    author: "z-ai",
    provider: "openrouter",
    provider_name: "OpenRouter",
    pricing: { prompt: 0.35, completion: 0.7, currency: "USD" },
    context_length: 128000,
    supports: { tool_calling: true, structured_output: true, vision: false, long_context: true },
    intelligence_score: 92,
    coding_score: 89,
    agentic_score: 91,
    vision_score: 60,
    tool_success_rate: 0.9,
    health: 0.88,
    latency_ms: 260,
    retention_enabled: false,
    stealth: false,
    is_live: true,
  },
  {
    id: "stealth/ox-alpha",
    author: "stealth",
    provider: "openrouter",
    provider_name: "OpenRouter",
    pricing: { prompt: 0.0, completion: 0.0, currency: "USD" },
    context_length: 128000,
    supports: { tool_calling: true, structured_output: true, vision: false, long_context: true },
    intelligence_score: 86,
    coding_score: 88,
    agentic_score: 90,
    vision_score: 30,
    tool_success_rate: 0.88,
    health: 0.91,
    latency_ms: 280,
    retention_enabled: true,
    stealth: true,
    is_live: true,
  },
  {
    id: "dots-studio/dots-3-note-preview:free",
    author: "dots-studio",
    provider: "openrouter",
    provider_name: "OpenRouter",
    pricing: { prompt: 0.0, completion: 0.0, currency: "USD" },
    context_length: 65536,
    supports: { tool_calling: true, structured_output: true, vision: false, long_context: true },
    intelligence_score: 82,
    coding_score: 84,
    agentic_score: 80,
    vision_score: 50,
    tool_success_rate: 0.84,
    health: 0.8,
    latency_ms: 330,
    retention_enabled: false,
    stealth: false,
    is_live: true,
  },
];

export function normalizePrice(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
  return null;
}

export function parseOptionalNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function isForbiddenAuthor(author: string | undefined): boolean {
  const normalized = String(author ?? "").trim().toLowerCase();
  return normalized === "openai" || normalized === "anthropic";
}

export function isForbiddenModelId(modelId: string): boolean {
  const value = modelId.trim().toLowerCase();
  return value.includes("openai/") || value.includes("anthropic/") || value.includes("claude") || value.includes("codex");
}

export function isActuallyFreeModel(model: Partial<CatalogModel>): boolean {
  if (model.catalog_source !== "openrouter_live") return false;
  const prompt = normalizePrice(model.pricing?.prompt ?? model.prompt_price ?? model.input_price);
  const completion = normalizePrice(model.pricing?.completion ?? model.completion_price ?? model.output_price);
  return prompt !== null && completion !== null && prompt === 0 && completion === 0;
}

export function filterForbiddenAuthors(models: CatalogModel[]): CatalogModel[] {
  return models.filter((model) => !isForbiddenAuthor(model.author) && !isForbiddenModelId(model.id));
}

export function normalizeCatalog(entries: Array<Record<string, unknown>>, catalogSource: CatalogSource = "openrouter_live"): CatalogModel[] {
  return entries
    .filter((entry) => {
      const modelId = String(entry.id ?? "");
      const author = String(entry.author ?? modelId.split("/")[0] ?? "");
      return !isForbiddenAuthor(author) && !isForbiddenModelId(modelId);
    })
    .map((entry) => {
      const rawId = String(entry.id ?? "unknown/model");
      const author = String(entry.author ?? rawId.split("/")[0] ?? "unknown");
      const declaredProvider = String((entry.provider as string | undefined) ?? "");
      const transport_provider = catalogSource === "openrouter_live"
        ? "openrouter"
        : declaredProvider === "gemini" ? "gemini" : "openrouter";
      const providerName = String((entry.provider_name as string | undefined) ?? "OpenRouter");
      const pricing = {
        prompt: catalogSource === "openrouter_live"
          ? normalizePrice((entry.pricing as Record<string, unknown> | undefined)?.prompt ?? (entry as Record<string, unknown>).prompt_price ?? (entry as Record<string, unknown>).input_price)
          : null,
        completion: catalogSource === "openrouter_live"
          ? normalizePrice((entry.pricing as Record<string, unknown> | undefined)?.completion ?? (entry as Record<string, unknown>).completion_price ?? (entry as Record<string, unknown>).output_price)
          : null,
        currency: "USD",
      };

      const supports = {
        tool_calling: Boolean((entry.supports as Record<string, unknown> | undefined)?.tool_calling ?? true),
        structured_output: Boolean((entry.supports as Record<string, unknown> | undefined)?.structured_output ?? true),
        vision: Boolean((entry.supports as Record<string, unknown> | undefined)?.vision ?? false),
        long_context: Boolean((entry.supports as Record<string, unknown> | undefined)?.long_context ?? true),
      };

      const curatedScore = CURATED_MODEL_SCORES[rawId.toLowerCase()];
      const intelligence_score = curatedScore?.intelligence_score ?? parseOptionalNumber((entry.intelligence_score as number | string | undefined));
      const coding_score = curatedScore?.coding_score ?? parseOptionalNumber((entry.coding_score as number | string | undefined));
      const agentic_score = curatedScore?.agentic_score ?? parseOptionalNumber((entry.agentic_score as number | string | undefined));
      const vision_score = curatedScore?.vision_score ?? parseOptionalNumber((entry.vision_score as number | string | undefined));

      const scoreSource: ScoreSource = curatedScore ? "curated" : intelligence_score !== null || coding_score !== null || agentic_score !== null ? "live" : "unknown";
      const explicitUpstream = entry.upstream_provider_if_known ?? entry.upstream_provider;
      const upstream_provider_if_known = typeof explicitUpstream === "string" && explicitUpstream.trim() !== ""
        ? explicitUpstream
        : null;

      return {
        id: rawId,
        author,
        provider: transport_provider,
        providerName,
        transport_provider,
        upstream_provider_if_known,
        input_price: pricing.prompt,
        output_price: pricing.completion,
        pricing,
        prompt_price: pricing.prompt,
        completion_price: pricing.completion,
        context_length: Number((entry.context_length as number | undefined) ?? 32000),
        supports,
        intelligence_score,
        coding_score,
        agentic_score,
        vision_score,
        tool_success_rate: parseOptionalNumber((entry.tool_success_rate as number | string | undefined)),
        health: parseOptionalNumber((entry.health as number | string | undefined)),
        latency_ms: parseOptionalNumber((entry.latency_ms as number | string | undefined)) ?? 500,
        free: isActuallyFreeModel({ pricing, catalog_source: catalogSource }),
        retention_enabled: Boolean((entry.retention_enabled as boolean | undefined) ?? (catalogSource === "openrouter_live")),
        stealth: Boolean((entry.stealth as boolean | undefined) ?? false),
        is_live: Boolean((entry.is_live as boolean | undefined) ?? true),
        score_source: scoreSource,
        catalog_source: catalogSource,
      } satisfies CatalogModel;
    });
}

export async function fetchCatalog(apiKey?: string): Promise<CatalogFetchResult> {
  if (!apiKey) {
    const warning = "OPENROUTER_API_KEY is not configured; using static fallback catalog with unverified pricing.";
    console.warn(warning);
    return {
      catalog: normalizeCatalog(FALLBACK_MODELS, "static_fallback"),
      meta: { source: "static_fallback", live_request_succeeded: false, warning },
    };
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://smart-travel-platform.local",
        "X-Title": "Smart Travel Platform",
      },
    });

    if (!response.ok) {
      const warning = `OpenRouter catalog request failed with status ${response.status}; using static fallback catalog with unverified pricing.`;
      console.warn(warning);
      return {
        catalog: normalizeCatalog(FALLBACK_MODELS, "static_fallback"),
        meta: { source: "static_fallback", live_request_succeeded: false, warning },
      };
    }

    const payload = (await response.json()) as { data?: Array<Record<string, unknown>> };
    const models = Array.isArray(payload.data) ? payload.data : [];
    const filtered = filterForbiddenAuthors(normalizeCatalog(models, "openrouter_live"));
    if (filtered.length > 0) {
      return {
        catalog: filtered,
        meta: { source: "openrouter_live", live_request_succeeded: true, warning: null },
      };
    }

    const warning = "OpenRouter returned no policy-allowed models; using static fallback catalog with unverified pricing.";
    console.warn(warning);
    return {
      catalog: normalizeCatalog(FALLBACK_MODELS, "static_fallback"),
      meta: { source: "static_fallback", live_request_succeeded: true, warning },
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const warning = `OpenRouter live catalog fetch failed; using static fallback catalog with unverified pricing. ${detail}`;
    console.warn(warning);
    return {
      catalog: normalizeCatalog(FALLBACK_MODELS, "static_fallback"),
      meta: { source: "static_fallback", live_request_succeeded: false, warning },
    };
  }
}

export async function fetchLiveCatalog(apiKey?: string): Promise<CatalogModel[]> {
  return (await fetchCatalog(apiKey)).catalog;
}

export function resolveCatalogByModel(modelName: string, catalog: CatalogModel[]): CatalogModel | undefined {
  return catalog.find((entry) => entry.id.toLowerCase() === modelName.toLowerCase());
}

export function getProviderName(modelId: string): ProviderType | string {
  if (modelId.toLowerCase().includes("gemini")) return "gemini";
  return "openrouter";
}
