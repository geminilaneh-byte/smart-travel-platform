---
name: crawl-source-onboarding
description: Onboard or change a marketplace, classifieds, property, vehicle, accommodation, telecom, or payment information source for the five-country smart travel project. Use for source discovery, permission review, connector design, parser changes, crawling, provenance, and price-history ingestion.
---

# Crawl Source Onboarding

1. Read `docs/CRAWLING_AND_COMPLIANCE_FA.md` and the target row in `config/sources.json`.
2. Resolve official API/feed first. Record robots URL, ToS URL, owner, purpose, retention, rate and review date.
3. Do not implement when access requires CAPTCHA, login bypass, private API, proxy evasion or session reuse.
4. Create sanitized golden fixtures; never store contact details or precise private addresses.
5. Implement discover/fetch/parse/normalize/validate/emit separately.
6. Add conditional requests, per-host token bucket, backoff, kill switch and provenance fields.
7. Run contract, fixture and canary tests. Report null rate, duplicate rate and freshness.
8. Keep status at `test_only` until legal/owner approval; activation needs human approval.

Output: permission record, connector patch, tests, metrics expectation and rollback.
