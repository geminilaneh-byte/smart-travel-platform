import { fileURLToPath } from "node:url";

import { fetchLiveCatalog } from "../catalog/index.js";
import { validateRouterConfig } from "../policy/config.js";

const configPath = fileURLToPath(new URL("../../../../config/model-router.yaml", import.meta.url));
const config = await validateRouterConfig(configPath);
const catalog = await fetchLiveCatalog(process.env.OPENROUTER_API_KEY);
const models = catalog
  .filter((entry) => entry.is_live)
  .sort((a, b) => Number(b.free) - Number(a.free) || b.intelligence_score - a.intelligence_score)
  .map((entry) => ({
    id: entry.id,
    author: entry.author,
    free: entry.free,
    provider: entry.provider,
    intelligence_score: entry.intelligence_score,
    coding_score: entry.coding_score,
    agentic_score: entry.agentic_score,
  }));

console.log(JSON.stringify({
  task: "ai:models",
  model_count: models.length,
  allowed_authors: config.provider_policy.allowed_authors,
  denied_authors: config.provider_policy.denied_authors,
  models,
}, null, 2));
