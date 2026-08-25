---
name: multimodel-routing
description: Select, route, audit, or change AI models and providers for the smart travel project, including OpenRouter auto routing, BYOK, fallbacks, cost controls, privacy, reviewers, and task-specific model choice.
---

# Multimodel Routing

1. Read `config/model-router.yaml`. Treat the Commander as provider-neutral; every named model is a replaceable Worker.
2. Classify task, risk, worker level, required modalities/tools, privacy and budget.
3. Enforce the denied-author list before selection, auto route, review, fallback and utility calls. Do not use OpenAI/Codex or Anthropic/Claude until the user explicitly re-enables them.
4. Select by task specialty first, then intelligence/coding/agentic rank, tool success, health, quota, context headroom, latency and cost. Prefer verified-free candidates without lowering the required level.
5. Verify free status and availability from the live OpenRouter catalog; names and old snapshots are not proof. Web subscriptions are not API credit pools.
6. Redact PII and secrets. Retention-enabled or stealth models may coordinate only public, non-sensitive work.
7. On fatigue or fallback, serialize the complete checkpoint and select only a same-level or higher-level healthy Worker.
8. Record requested/resolved model, provider, BYOK, ranking snapshot, attempts, tokens, cost, latency and result.
9. Commander accepts output only after diff/test evidence and independent review where required. High-risk outputs also require human approval.
