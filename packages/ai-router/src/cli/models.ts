import { fileURLToPath } from "node:url";

import { fetchCatalog, filterForbiddenAuthors } from "../catalog/index.js";
import { validateRouterConfig } from "../policy/config.js";

const configPath = fileURLToPath(new URL("../../../../config/model-router.yaml", import.meta.url));
const config = await validateRouterConfig(configPath);
const catalogResult = await fetchCatalog(process.env.OPENROUTER_API_KEY);
const allowedAuthors = new Set(config.provider_policy.allowed_authors.map((author) => author.toLowerCase()));
const catalog = filterForbiddenAuthors(catalogResult.catalog).filter((entry) => allowedAuthors.has(entry.author.toLowerCase()));
const models = catalog
  .filter((entry) => entry.is_live)
  .sort((a, b) => Number(b.free) - Number(a.free) || Number((b.intelligence_score ?? 0)) - Number((a.intelligence_score ?? 0)))
  .map((entry) => ({
    id: entry.id,
    author: entry.author,
    free: entry.free,
    provider: entry.provider,
    transport_provider: entry.transport_provider,
    upstream_provider_if_known: entry.upstream_provider_if_known,
    intelligence_score: entry.intelligence_score,
    coding_score: entry.coding_score,
    agentic_score: entry.agentic_score,
    catalog_source: entry.catalog_source,
    score_source: entry.score_source,
  }));

console.log(JSON.stringify({
  task: "ai:models",
  model_count: models.length,
  allowed_authors: config.provider_policy.allowed_authors,
  denied_authors: config.provider_policy.denied_authors,
  catalog_source: catalogResult.meta.source,
  catalog_warning: catalogResult.meta.warning,
  models,
}, null, 2));
