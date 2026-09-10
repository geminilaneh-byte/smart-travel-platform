# Medication Safety Assistant v2

## Product goal

Turn the app from a simple alarm into a medication safety assistant that helps a person understand *what to take, when, how, why it may matter, and when to ask a clinician or pharmacist* without pretending to diagnose, prescribe, stop, start, or change dose.

## Safety boundary

The app may explain, organize, remind, surface source-backed warnings, calculate inventory/refill dates, and generate questions for a clinician. It must not autonomously prescribe, diagnose, recommend dose changes, or tell a user to stop a prescribed medicine.

For interaction safety, keep separate categories for drug-drug, drug-food/beverage, and drug-condition interactions. FDA explicitly distinguishes these categories. Pregnancy/breastfeeding, allergies, OTC products, vitamins, minerals, botanicals, and supplements must be treated as relevant context. Source: https://www.fda.gov/drugs/resources-drugs/drug-interactions-what-you-should-know

## Authoritative data strategy

1. **Medication identity:** normalize brand/generic text to a canonical identifier before medical lookup. RxNorm/RxNav-style terminology mapping is preferred where available.
2. **Official labeling:** DailyMed v2 REST services are suitable for current Structured Product Label retrieval: https://dailymed.nlm.nih.gov/dailymed/app-support-web-services.cfm
3. **Machine-readable FDA data:** openFDA drug labeling can provide structured labeling fields. It is not itself a clinical decision system and must not be used as the sole basis for medical-care decisions: https://open.fda.gov/apis/drug/label/how-to-use-the-endpoint/
4. **AI:** AI is a language/reasoning layer over retrieved evidence, never the source of truth. Every safety answer should carry source provenance, freshness, uncertainty, and escalation guidance.

## Architecture

### Layer A — Local profile and accessibility

Store the minimum useful profile locally by default:
- age/date of birth
- sex as clinically relevant when needed
- pregnancy/breastfeeding state
- allergies
- kidney/liver disease flags
- relevant chronic conditions
- accessibility preferences: large text, high contrast, spoken guidance, strong vibration/visual alarm

Sensitive fields must be optional and user-controlled.

Android accessibility rules used as baseline:
- at least 48dp touch targets
- meaningful labels/content descriptions
- do not rely on color alone
- complete TalkBack traversal of critical flows
- test with TalkBack and Accessibility Scanner

References:
- https://developer.android.com/guide/topics/ui/accessibility/apps.html
- https://developer.android.com/guide/topics/ui/accessibility/testing

### Layer B — Medication registry

Each medication record should support:
- user-entered name
- canonical generic/ingredient identity when known
- strength and dose instructions
- photo
- schedule
- meal relation: before meal / with meal / after meal / empty stomach / bedtime / custom
- quantity on hand
- units consumed per administration
- prescriber name and optional contact
- refill lead time
- treatment start/end when applicable
- user-entered reason prescribed
- source-backed common uses kept visually separate from personal indication

### Layer C — Scheduling and inventory

The local engine remains usable offline. It owns alarms, taken/skipped state, stock decrement, days remaining, and refill reminders.

Do not infer refill eligibility. The app can say "your recorded supply may run out in N days" and "consider arranging a refill/appointment" based on user-entered supply and schedule.

### Layer D — Medical evidence and interaction engine

The backend fetches and caches trusted medication evidence. Deterministic safety rules should run before AI. Important findings carry severity, evidence source, date, and a safe action such as contacting a pharmacist or clinician.

Absence of a detected interaction must never be shown as a guarantee of safety.

### Layer E — AI gateway

The Android client must never contain provider secrets. It talks to a backend AI gateway. The gateway can route among providers and models.

Suggested response schema:
```json
{
  "summary": "plain-language explanation",
  "uses": [],
  "timing": {"meal_relation":"", "notes":""},
  "warnings": [{"severity":"info|caution|urgent", "message":"", "source_id":""}],
  "interaction_explanations": [],
  "questions_for_clinician": [],
  "uncertainty": "",
  "sources": [{"title":"", "url":"", "retrieved_at":""}]
}
```

The AI gateway rejects unsupported claims, requires citations for medical assertions, and provides an explicit uncertainty value. Emergency symptoms must use a deterministic escalation path rather than free-form AI advice.

## Release sequence

### v2.0 foundation
- local user profile
- accessibility preferences
- prescriber and meal-timing fields
- inventory/refill calculations
- preserve existing alarm behavior and photo support

### v2.1 evidence
- medication identity normalization
- DailyMed/openFDA evidence retrieval through backend
- cached source provenance

### v2.2 safety
- deterministic interaction rules
- warning severity and source display
- clinician/pharmacist escalation

### v2.3 AI assistant
- AI gateway
- Persian plain-language explanation
- source-grounded questions and summaries
- provider abstraction and cost controls

## Definition of done for every release

- existing SQLite data migrates without destructive reset
- release APK builds in CI and is verified by apksigner
- no API keys or health profile data are committed to Git
- alarm/taken/refill flows have regression tests or repeatable manual test cases
- TalkBack can complete the primary flow
- failure of network/AI never breaks medication alarms
- medical claims display provenance and uncertainty
