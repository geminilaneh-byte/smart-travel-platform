import type { RouterConfig } from "../types/index.js";

export interface HandoffCheckpoint {
  task_spec: string;
  acceptance_criteria: string[];
  decisions: string[];
  owned_files: string[];
  current_diff: string;
  tests_run: string[];
  failures: string[];
  remaining_work: string[];
  prohibited_actions: string[];
}

export function createHandoffCheckpoint(task: string, options: Partial<HandoffCheckpoint> = {}): HandoffCheckpoint {
  return {
    task_spec: options.task_spec ?? task,
    acceptance_criteria: options.acceptance_criteria ?? ["Build the orchestration foundation", "Verify tests and security policy"],
    decisions: options.decisions ?? [],
    owned_files: options.owned_files ?? [],
    current_diff: options.current_diff ?? "Initial implementation",
    tests_run: options.tests_run ?? [],
    failures: options.failures ?? [],
    remaining_work: options.remaining_work ?? [],
    prohibited_actions: options.prohibited_actions ?? ["Do not enable crawler", "Do not deploy production", "Do not publish from model alone"],
  };
}

export function canReplaceWorker(currentLevel: string, replacementLevel: string): boolean {
  const levels = { L1: 1, L2: 2, L3: 3, L4: 4 } as const;
  return (levels[replacementLevel as keyof typeof levels] ?? 0) >= (levels[currentLevel as keyof typeof levels] ?? 0);
}

export function validateCheckpointShape(checkpoint: Record<string, unknown> | object, config: RouterConfig): void {
  const record = checkpoint as Record<string, unknown>;
  const required = config.handoff_checkpoint.required_fields;
  for (const field of required) {
    if (!(field in record)) {
      throw new Error(`Missing checkpoint field: ${field}`);
    }
  }
}
