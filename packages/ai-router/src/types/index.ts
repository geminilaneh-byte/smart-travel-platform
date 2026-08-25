export type WorkerLevel = "L1" | "L2" | "L3" | "L4";

export type ProviderType = "openrouter" | "gemini";

export type ReasoningLevel = "low" | "medium" | "high" | "xhigh";

export type RouteTask = string;

export interface ModelCapabilitySet {
  tool_calling: boolean;
  structured_output: boolean;
  vision: boolean;
  long_context: boolean;
}

export interface Pricing {
  prompt: number;
  completion: number;
  currency?: string;
}

export interface CatalogModel {
  id: string;
  author: string;
  provider: ProviderType | string;
  providerName: string;
  input_price: number;
  output_price: number;
  pricing: Pricing;
  context_length: number;
  supports: ModelCapabilitySet;
  intelligence_score: number;
  coding_score: number;
  agentic_score: number;
  vision_score: number;
  tool_success_rate: number;
  health: number;
  latency_ms: number;
  free: boolean;
  retention_enabled: boolean;
  stealth: boolean;
  is_live: boolean;
}

export interface RouteDefinition {
  worker_pool: string;
  reviewer_pool?: string;
  reasoning?: ReasoningLevel;
  human_approval?: boolean;
  repository_write?: "patch_only";
  fallback_pool?: string;
  requires?: string[];
  allowed_authors?: string[];
}

export interface WorkerPoolDefinition {
  minimum_level: WorkerLevel;
  required?: string[];
  candidates: string[];
  leader_pool?: string;
  replacement: "same_or_higher_level";
  selection_sort?: string[];
  reviewer_pool?: string;
}

export interface RouterDefaults {
  orchestrator: string;
  provider_neutral: boolean;
  selection_strategy: string;
  free_first: boolean;
  reasoning: ReasoningLevel;
  timeout_ms: number;
  max_retries: number;
  require_structured_output: boolean;
  log_router_metadata: boolean;
}

export interface RouterPolicy {
  allowed_authors: string[];
  denied_authors: string[];
  denied_model_patterns: string[];
  denied_until: string;
  enforcement: "fail_closed";
}

export interface PrivacyPolicy {
  secrets_to_models: "never";
  pii_mode: "redact";
  external_provider_default: {
    data_collection: "deny";
    zdr: boolean;
  };
}

export interface HealthPolicy {
  context_soft_limit_percent: number;
  context_hard_limit_percent: number;
  consecutive_invalid_outputs: number;
  consecutive_provider_errors: number;
  latency_slo_multiplier: number;
  cooldown_seconds: number;
  circuit_breaker_seconds: number;
}

export interface RouteGuard {
  id: string;
  rule: string;
  match?: string[];
  require?: string[];
}

export interface RouterConfig {
  version: number;
  defaults: RouterDefaults;
  provider_policy: RouterPolicy;
  privacy: PrivacyPolicy;
  routes: Record<string, RouteDefinition>;
  worker_pools: Record<string, WorkerPoolDefinition>;
  live_catalog_policy: {
    refresh_seconds: number;
    endpoint: string;
    filters: Record<string, boolean | string | number>;
    ranking_dimensions: string[];
    free_definition: {
      prompt_price_per_million: number;
      completion_price_per_million: number;
    };
    expiration_handling: string;
  };
  guards: RouteGuard[];
  health_policy: HealthPolicy;
  handoff_checkpoint: { required_fields: string[] };
  telemetry: { fields: string[] };
}

export interface ModelCandidate {
  model: string;
  provider: ProviderType | string;
  level: WorkerLevel;
  isFree: boolean;
  score: number;
  catalogModel?: CatalogModel;
}

export interface DispatchDecision {
  task: string;
  route: string;
  requested_model: string;
  resolved_model: string;
  provider: ProviderType | string;
  is_byok: boolean;
  ranking_snapshot: Array<{ model: string; score: number }>; 
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  attempts: number;
  cache_hit: boolean;
  result: "success" | "rejected" | "fallback" | "error";
  checkpoint?: Record<string, unknown>;
}
