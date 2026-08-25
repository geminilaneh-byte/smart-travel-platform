import { fileURLToPath } from "node:url";

import { fetchLiveCatalog } from "../catalog/index.js";
import { validateRouterConfig } from "../policy/config.js";

const configPath = fileURLToPath(new URL("../../../../config/model-router.yaml", import.meta.url));
const config = await validateRouterConfig(configPath);
const catalog = await fetchLiveCatalog(process.env.OPENROUTER_API_KEY);

console.log(JSON.stringify({
  config_ok: true,
  env: {
    OPENROUTER_API_KEY: Boolean(process.env.OPENROUTER_API_KEY),
    GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
  },
  providers: {
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
  },
  route_count: Object.keys(config.routes).length,
  model_count: catalog.length,
  free_model_count: catalog.filter((model) => model.free).length,
  denied_authors: config.provider_policy.denied_authors,
}, null, 2));
