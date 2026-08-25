import type { CatalogModel, ProviderType } from "../types/index.js";

const FALLBACK_MODELS: CatalogModel[] = [
  {
    id: "google/gemini-3.7-flash",
    author: "google",
    provider: "gemini",
    providerName: "Gemini",
    input_price: 0.0,
    output_price: 0.0,
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
    free: true,
    retention_enabled: false,
    stealth: false,
    is_live: true,
  },
  {
    id: "qwen/qwen3.8-27b",
    author: "qwen",
    provider: "openrouter",
    providerName: "OpenRouter",
    input_price: 0.0,
    output_price: 0.0,
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
    free: true,
    retention_enabled: false,
    stealth: false,
    is_live: true,
  },
  {
    id: "z-ai/glm-5.3",
    author: "z-ai",
    provider: "openrouter",
    providerName: "OpenRouter",
    input_price: 0.35,
    output_price: 0.7,
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
    free: false,
    retention_enabled: false,
    stealth: false,
    is_live: true,
  },
  {
    id: "stealth/ox-alpha",
    author: "stealth",
    provider: "openrouter",
    providerName: "OpenRouter",
    input_price: 0.0,
    output_price: 0.0,
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
    free: true,
    retention_enabled: true,
    stealth: true,
    is_live: true,
  },
  {
    id: "dots-studio/dots-3-note-preview:free",
    author: "dots-studio",
    provider: "openrouter",
    providerName: "OpenRouter",
    input_price: 0.0,
    output_price: 0.0,
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
    free: true,
    retention_enabled: false,
    stealth: false,
    is_live: true,
  },
];

export function normalizePrice(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

export function isActuallyFreeModel(model: Partial<CatalogModel>): boolean {
  const prompt = normalizePrice(model.pricing?.prompt ?? model.input_price ?? 0);
  const completion = normalizePrice(model.pricing?.completion ?? model.output_price ?? 0);
  return prompt === 0 && completion === 0;
}

export function normalizeCatalog(entries: Array<Record<string, unknown>>): CatalogModel[] {
  return entries.map((entry) => {
    const pricing = {
      prompt: normalizePrice((entry.pricing as Record<string, unknown> | undefined)?.prompt ?? entry.input_price ?? 0),
      completion: normalizePrice((entry.pricing as Record<string, unknown> | undefined)?.completion ?? entry.output_price ?? 0),
      currency: "USD",
    };

    const supports = {
      tool_calling: Boolean((entry.supports as Record<string, unknown> | undefined)?.tool_calling ?? true),
      structured_output: Boolean((entry.supports as Record<string, unknown> | undefined)?.structured_output ?? true),
      vision: Boolean((entry.supports as Record<string, unknown> | undefined)?.vision ?? false),
      long_context: Boolean((entry.supports as Record<string, unknown> | undefined)?.long_context ?? true),
    };

    return {
      id: String(entry.id ?? "unknown/model"),
      author: String(entry.author ?? entry.id?.toString().split("/")[0] ?? "unknown"),
      provider: String((entry.provider as string | undefined) ?? (entry.id as string).split("/")[0] ?? "openrouter"),
      providerName: String((entry.provider_name as string | undefined) ?? "OpenRouter"),
      input_price: pricing.prompt,
      output_price: pricing.completion,
      pricing,
      context_length: Number((entry.context_length as number | undefined) ?? 32000),
      supports,
      intelligence_score: Number((entry.intelligence_score as number | undefined) ?? 0),
      coding_score: Number((entry.coding_score as number | undefined) ?? 0),
      agentic_score: Number((entry.agentic_score as number | undefined) ?? 0),
      vision_score: Number((entry.vision_score as number | undefined) ?? 0),
      tool_success_rate: Number((entry.tool_success_rate as number | undefined) ?? 0.8),
      health: Number((entry.health as number | undefined) ?? 0.8),
      latency_ms: Number((entry.latency_ms as number | undefined) ?? 500),
      free: isActuallyFreeModel({ pricing }),
      retention_enabled: Boolean((entry.retention_enabled as boolean | undefined) ?? false),
      stealth: Boolean((entry.stealth as boolean | undefined) ?? false),
      is_live: Boolean((entry.is_live as boolean | undefined) ?? true),
    } satisfies CatalogModel;
  });
}

export async function fetchLiveCatalog(apiKey?: string): Promise<CatalogModel[]> {
  if (!apiKey) {
    return [...FALLBACK_MODELS];
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Referer: "https://smart-travel-platform.local",
        "X-Title": "Smart Travel Platform",
      },
    });

    if (!response.ok) {
      return [...FALLBACK_MODELS];
    }

    const payload = (await response.json()) as { data?: Array<Record<string, unknown>> };
    const models = Array.isArray(payload.data) ? payload.data : [];
    return normalizeCatalog(models.length > 0 ? models : []);
  } catch {
    return [...FALLBACK_MODELS];
  }
}

export function resolveCatalogByModel(modelName: string, catalog: CatalogModel[]): CatalogModel | undefined {
  return catalog.find((entry) => entry.id.toLowerCase() === modelName.toLowerCase()) ??
    catalog.find((entry) => entry.id.toLowerCase().includes(modelName.toLowerCase().split("/")[1] ?? ""));
}

export function getProviderName(modelId: string): ProviderType | string {
  if (modelId.toLowerCase().includes("gemini")) return "gemini";
  return "openrouter";
}
