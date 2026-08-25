import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { cwd } from "node:process";

import { dispatchTask } from "../dispatcher/index.js";

const args = process.argv.slice(2);
let task: string | undefined;
let promptFile: string | undefined;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--task") task = args[index + 1];
  if (arg === "--prompt-file") promptFile = args[index + 1];
}

if (!task) {
  throw new Error("Usage: pnpm ai:route --task <task> --prompt-file <path>");
}

const prompt = promptFile ? String(await readFile(resolve(cwd(), promptFile), "utf8")) : `Task: ${task}`;
const decision = await dispatchTask({ task, prompt, configPath: join(cwd(), "config", "model-router.yaml") });
console.log(JSON.stringify(decision, null, 2));
