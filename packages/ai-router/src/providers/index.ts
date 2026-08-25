import type { CatalogModel } from "../types/index.js";

export class GeminiProvider {
  static readonly providerId = "gemini";

  static isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  static getBaseUrl(): string {
    return process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta";
  }

  static supports(model: CatalogModel): boolean {
    return model.author.toLowerCase() === "google" || model.id.toLowerCase().includes("gemini");
  }
}

export class OpenRouterProvider {
  static readonly providerId = "openrouter";

  static isConfigured(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY);
  }

  static getBaseUrl(): string {
    return process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
  }

  static supports(model: CatalogModel): boolean {
    return model.id.includes("/") && !model.id.toLowerCase().includes("gemini");
  }
}

export function getProviderForModel(modelId: string): string {
  return modelId.toLowerCase().includes("gemini") ? GeminiProvider.providerId : OpenRouterProvider.providerId;
}
