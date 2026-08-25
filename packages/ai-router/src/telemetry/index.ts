import type { DispatchDecision } from "../types/index.js";

export class TelemetryStore {
  public readonly records: DispatchDecision[] = [];

  record(entry: DispatchDecision): void {
    this.records.push(entry);
  }

  exportSummary(): Record<string, unknown> {
    return {
      total: this.records.length,
      successRate: this.records.length === 0 ? 0 : (this.records.filter((record) => record.result === "success").length / this.records.length) * 100,
      recent: this.records.slice(-5),
    };
  }
}
