# سند معماری اجرایی

## 1. مرز محصول

پلتفرم یک marketplace چندطرفه با پنج actor است: مسافر، میزبان اقامتگاه، مالک/شرکت خودرو، عرضه‌کننده خدمات و اپراتور. قابلیت‌های هسته:

- جست‌وجو و رزرو اقامتگاه کوتاه‌مدت
- اجاره خودرو و در فاز بعد خرید خودرو/lead marketplace
- بسته سفر پویا
- کیف پول، اعتبار خریداری‌شده و امتیاز وفاداری
- راهنمای خرید، سیم‌کارت و پرداخت در مقصد
- price intelligence بر پایه منابع مجاز
- تجربه سه‌بعدی اختیاری و تور 360

خریدوفروش آزاد امتیاز در MVP فعال نمی‌شود. ابتدا ledger، KYC، AML، مالیات، refund و قوانین هر کشور بررسی می‌شوند.

## 2. معماری منطقی

شروع با modular monolith و workerهای جداست، نه microserviceهای زودهنگام:

```text
apps/web             تجربه مسافر و SEO
apps/partner         میزبان و مالک خودرو
apps/admin           عملیات، تقلب، اختلاف و محتوا
apps/api             API ماژولار
apps/workers         crawl, media, notification, settlement
packages/domain      contracts و value objects
packages/database    schema و migrations
packages/ledger      double-entry ledger
packages/booking     availability و reservation state machine
packages/search      index و ranking
packages/ai-router   routing, policy, telemetry
packages/crawlers    connector SDK و normalization
packages/three       sceneهای lazy و fallback
```

## 3. فناوری پایه

- TypeScript end-to-end؛ Next.js برای web؛ Fastify/Nest-compatible API.
- PostgreSQL + PostGIS؛ Redis برای cache، lock و queue؛ object storage سازگار با S3.
- OpenSearch/Meilisearch پس از اثبات نیاز؛ در MVP PostgreSQL FTS قابل قبول است.
- OpenTelemetry، Sentry-compatible error tracking و audit log تغییرناپذیر.
- Docker برای محیط یکسان؛ CI با lint، typecheck، test، secret scan و dependency scan.

نسخه dependencyها هنگام bootstrap از release پایدار جاری pin می‌شود و Renovate/Dependabot آن‌ها را مدیریت می‌کند؛ نسخه‌ها در این سند hard-code نمی‌شوند.

## 4. bounded contextها

| Context | منبع حقیقت | نکته حیاتی |
|---|---|---|
| Identity | users/organizations/roles | MFA برای operator و partner |
| Catalog | properties/vehicles/services | نسخه‌بندی و moderation |
| Availability | inventory calendars | timezone و overlap constraint |
| Pricing | rate plans/quotes | quote دارای expiry و breakdown |
| Booking | reservations/orders | state machine و idempotency |
| Payments | payment intents/refunds | PSP abstraction و webhook verify |
| Ledger | accounts/entries | double-entry، append-only |
| Loyalty | earn/burn/transfer rules | جدا از پول واقعی |
| Crawl | sources/runs/raw/normalized | provenance و compliance |
| Trust | KYC/risk/disputes/reviews | داده حساس جدا و حداقل‌گرا |

## 5. چرخه رزرو

`DRAFT → QUOTED → HELD → PAYMENT_PENDING → CONFIRMED → IN_PROGRESS → COMPLETED`

شاخه‌های `EXPIRED`, `CANCELLED`, `REFUND_PENDING`, `REFUNDED`, `DISPUTED` صریح‌اند. webhook تکراری نباید رزرو یا اعتبار را دوبار اعمال کند. Hold دارای TTL و unique/exclusion constraint است.

## 6. اعتبار و امتیاز

سه مفهوم جدا می‌ماند:

1. `reward_points`: وفاداری، غیرقابل برداشت در MVP.
2. `purchased_credit`: اعتبار مصرف در پلتفرم، تابع قوانین refund/expiry.
3. `cash_payable`: بدهی واقعی پلتفرم به partner.

هر جابه‌جایی حداقل دو entry متوازن دارد. currency و minor unit اجباری‌اند. تبدیل بین کشورها quote نرخ ارز، provider و timestamp دارد. نگهداری وجوه مشتری بدون بررسی مجوز پرداخت ممنوع است.

## 7. معماری تجربه سه‌بعدی

- landing story: نمای مقصد → نزدیک‌شدن به ویلا → ورود → انتقال به خودرو → بسته سفر.
- assetها با glTF/Draco/KTX2 و CDN؛ scene chunk مستقل.
- server-rendered poster و محتوای متنی همیشه موجود.
- scene پس از تعامل یا idle بارگذاری می‌شود؛ checkout بدون canvas است.
- معیارهای Web Vitals در CI و real-user monitoring کنترل می‌شوند.

## 8. چندکشوری

- Locale: `fa-IR`, `ar-SA`, `ar-IQ`, `ar-AE`, `tr-TR`, `en`.
- RTL/LTR در design token و component، نه CSS موردی.
- پول، مالیات، شماره تلفن، تقویم و timezone value object مستقل دارند.
- داده کشورها در یک schema مشترک، اما policy پرداخت/KYC به‌صورت adapter کشوری.

## 9. امنیت و حریم خصوصی

- threat model برای account takeover، fake listing، double booking، payment replay، gift-card fraud، scraping abuse و insider access.
- encryption in transit/at rest؛ secret manager؛ short-lived credentials.
- RBAC + object-level authorization؛ audit برای عملیات حساس.
- PII vault منطقی؛ retention و deletion policy؛ exportهای مدیریتی watermark و access log دارند.
- تصاویر آپلودی malware scan، metadata stripping و moderation می‌شوند.

## 10. مراحل اجرا

### Gate 0 — اکنون

معماری، قوانین عامل‌ها، source registry، compliance و router.

### Gate 1 — Foundation

monorepo، auth، design system، database، observability و CI.

### Gate 2 — Marketplace MVP

catalog، search، availability، quote، booking و پنل partner.

### Gate 3 — Money

PSP sandbox، ledger، refund، settlement و fraud review.

### Gate 4 — Data intelligence

connectorهای مجاز، price history، deduplication و quality dashboard.

### Gate 5 — Immersive

یک مسیر سه‌بعدی پرچم‌دار با performance budget، سپس توسعه تدریجی.

## 11. تصمیم‌های باز پیش از کدنویسی محصول

- کشور ثبت شرکت و بازار لانچ اول
- PSP و امکان marketplace settlement
- مدل درآمد: commission، subscription، lead یا principal
- مسئولیت حقوقی خودرو و اقامتگاه
- وضعیت انتقال/خریدوفروش اعتبار
- برند، دامنه و زبان پیش‌فرض

## 12. فرماندهی چندمدلی

سامانه یک Commander مستقل از provider دارد. تمام مدل‌ها Worker هستند و براساس سطح، capability و health در pool قرار می‌گیرند. Dispatcher برای هر task یک lease محدود صادر می‌کند؛ Worker فقط فایل‌ها و ابزارهای همان lease را در اختیار دارد.

هنگام Rate Limit، افت کیفیت، پرشدن context، افزایش latency یا عبور از بودجه، Worker خسته اعلام می‌شود. پیش از تعویض، checkpoint شامل spec، تصمیم‌ها، diff، تست‌ها و کار باقی‌مانده ثبت می‌شود. جانشین باید هم‌سطح یا قوی‌تر و دارای capabilityهای یکسان باشد. Commander نتیجه را با تست و review می‌پذیرد، نه با اعتماد به نام مدل.
