---
name: booking-ledger-review
description: Design or review booking, availability, payment, wallet, purchased credit, loyalty points, refunds, partner settlement, idempotency, or financial concurrency for the smart travel project.
---

# Booking and Ledger Review

1. Read the booking and money sections of `docs/EXECUTIVE_ARCHITECTURE_FA.md`.
2. Model explicit states, failure states, retries, expiry and compensation.
3. Use integer minor units and currency; prohibit floating point money.
4. Use append-only double-entry ledger. Derived balance is not the source of truth.
5. Require idempotency keys, verified webhooks and database constraints for concurrency.
6. Separate loyalty points, purchased credit and partner payable.
7. Add invariant/property tests for balanced entries, replay and concurrent booking.
8. Require security review and human approval before merge.
