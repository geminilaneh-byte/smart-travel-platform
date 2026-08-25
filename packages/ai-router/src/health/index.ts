import type { RouterConfig, WorkerLevel } from "../types/index.js";

export interface WorkerHealthState {
  model: string;
  level: WorkerLevel;
  consecutive_errors: number;
  consecutive_invalid_outputs: number;
  latency_ms: number;
  context_percent: number;
  cooldown_until: number;
  circuit_breaker_until: number;
  last_failure: number;
}

export class HealthMonitor {
  private readonly states = new Map<string, WorkerHealthState>();

  recordOutcome(model: string, level: WorkerLevel, outcome: "success" | "rate_limit" | "error" | "invalid_output", latencyMs: number, contextPercent: number): void {
    const state = this.states.get(model) ?? {
      model,
      level,
      consecutive_errors: 0,
      consecutive_invalid_outputs: 0,
      latency_ms: 0,
      context_percent: 0,
      cooldown_until: 0,
      circuit_breaker_until: 0,
      last_failure: 0,
    };

    if (outcome === "success") {
      state.consecutive_errors = 0;
      state.consecutive_invalid_outputs = 0;
      state.latency_ms = latencyMs;
      state.context_percent = contextPercent;
      this.states.set(model, state);
      return;
    }

    state.last_failure = Date.now();
    state.latency_ms = latencyMs;
    state.context_percent = contextPercent;

    if (outcome === "rate_limit" || outcome === "error") {
      state.consecutive_errors += 1;
      state.consecutive_invalid_outputs = 0;
    }

    if (outcome === "invalid_output") {
      state.consecutive_invalid_outputs += 1;
      state.consecutive_errors = 0;
    }

    const now = Date.now();
    if (state.consecutive_errors >= 2) {
      state.cooldown_until = now + 300000;
    }

    if (state.consecutive_invalid_outputs >= 2 || state.consecutive_errors >= 3) {
      state.circuit_breaker_until = now + 900000;
    }

    this.states.set(model, state);
  }

  isFatigued(model: string, config: RouterConfig): boolean {
    const state = this.states.get(model);
    if (!state) return false;

    const now = Date.now();
    if (now < state.cooldown_until || now < state.circuit_breaker_until) {
      return true;
    }

    const latencyLimit = state.latency_ms > (config.defaults.timeout_ms * config.health_policy.latency_slo_multiplier);
    const invalidOutputLimit = state.consecutive_invalid_outputs >= config.health_policy.consecutive_invalid_outputs;
    const errorLimit = state.consecutive_errors >= config.health_policy.consecutive_provider_errors;
    const contextAtRisk = state.context_percent > config.health_policy.context_hard_limit_percent;

    return latencyLimit || invalidOutputLimit || errorLimit || contextAtRisk;
  }

  shouldReplace(model: string, replacementLevel: WorkerLevel, config: RouterConfig): boolean {
    return this.isFatigued(model, config) && replacementLevel !== "L1";
  }
}
