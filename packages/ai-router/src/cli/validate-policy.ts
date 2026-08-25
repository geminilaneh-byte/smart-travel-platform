import { fileURLToPath } from "node:url";

import { validateRouterConfig } from "../policy/config.js";

const configPath = fileURLToPath(new URL("../../../../config/model-router.yaml", import.meta.url));
const config = await validateRouterConfig(configPath);
console.log(JSON.stringify({
  ok: true,
  version: config.version,
  default_orchestrator: config.defaults.orchestrator,
  denied_authors: config.provider_policy.denied_authors,
  denied_patterns: config.provider_policy.denied_model_patterns,
  routes: Object.keys(config.routes),
}, null, 2));
