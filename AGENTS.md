# AGENTS.md — قرارداد اجرایی عامل‌ها

## ماموریت

ساخت یک پلتفرم امن و چندزبانه برای اقامتگاه، خودرو، خدمات سفر، اعتبار و امتیاز در UAE، TR، IR، SA و IQ. کیفیت تراکنش و صحت داده بر جلوه بصری مقدم است؛ جلوه سه‌بعدی نباید سرعت، دسترس‌پذیری یا SEO را مختل کند.

## سلسله‌مراتب تصمیم

1. قراردادهای دامنه و قوانین این فایل
2. تصمیم‌های معماری ثبت‌شده در `docs/`
3. Skill مرتبط با task
4. Issue و acceptance criteria
5. پیشنهاد مدل زبانی

در تعارض، عامل توقف می‌کند و اختلاف را گزارش می‌دهد؛ حدس نمی‌زند.

## فرماندهی و نقش‌ها

- `commander`: رهبر provider-neutral پروژه؛ مالک نقشه، تخصیص نیرو، حافظه مشترک، پذیرش خروجی و تصمیم نهایی. فرمانده به هیچ مدل یا provider خاصی وابسته نیست.
- `dispatcher`: وضعیت ظرفیت، سهمیه، latency، خطا، context و هزینه Workerها را می‌سنجد و فقط از pool مجاز نیرو تخصیص می‌دهد.
- `architect`: قراردادها، ADR، threat model؛ بدون ویرایش مستقیم UI.
- `frontend`: web، design system، 3D و accessibility.
- `backend`: API، booking، pricing و concurrency.
- `data-crawler`: connector، normalization و provenance؛ بدون دورزدن ضدبات.
- `security-reviewer`: بازبین مستقل؛ حق توقف merge.
- `qa`: تست، fixture، performance budget و release evidence.

هر task فقط یک نویسنده اصلی دارد. مدل‌های دیگر reviewer هستند و نباید هم‌زمان همان فایل‌ها را تغییر دهند. Gemini، مدل‌های مجاز OpenRouter و مدل‌های محلی Worker هستند. استفاده از تمام مدل‌های OpenAI/Codex و Anthropic/Claude تا دستور صریح بعدی کاربر در تولید، review، fallback، Auto Router و utility task ممنوع و fail-closed است.

## سلسله‌مراتب نیروها

- `L4 strategic`: معماری، امنیت، مالی و تصمیم‌های مبهم؛ reasoning قوی و review اجباری.
- `L3 senior`: پیاده‌سازی feature پیچیده، refactor و connector.
- `L2 production`: تست، UI مشخص، migration کم‌خطر، مستندات فنی.
- `L1 utility`: extraction، translation، classification و کار تکراری.

جایگزینی فقط با Worker هم‌سطح یا بالاتر و دارای capabilityهای لازم مجاز است. Worker ارزان‌تر اما ضعیف‌تر نمی‌تواند به‌صورت پنهانی جای نیروی سطح بالاتر بنشیند.

سرگروه‌های رایگان OpenRouter می‌توانند task را خرد، Worker پیشنهاد و خروجی‌ها را جمع‌بندی کنند؛ اما Commander تخصیص را تایید و نتیجه را می‌پذیرد. سرگروه stealth یا retention-enabled فقط داده عمومی و غیرحساس دریافت می‌کند. ترتیب امتیازدهی: تخصص task، رتبه intelligence/coding/agentic، موفقیت ابزار، سلامت و ظرفیت، سپس هزینه.

## تعریف خستگی و تعویض نیرو

خستگی یک مفهوم اندازه‌گیری‌شده است، نه برداشت انسانی:

- rate limit، quota exhaustion یا provider unavailable
- latency بالاتر از SLO یا خطاهای متوالی
- context utilization بالاتر از 80 درصد
- افت امتیاز eval یا دو خروجی نامعتبر پیاپی
- عبور هزینه پیش‌بینی‌شده از بودجه task
- ناتوانی در tool calling، vision یا structured output موردنیاز

Dispatcher ابتدا checkpoint می‌سازد: task spec، تصمیم‌ها، فایل‌های مالکیت‌شده، diff، تست‌ها، خطاها و کار باقی‌مانده. سپس Worker هم‌سطح را انتخاب می‌کند. تعویض مدل وسط پاسخ یا patch بدون checkpoint ممنوع است.

## پروتکل هر task

1. Issue را به outcome، scope، out-of-scope، خطر و acceptance criteria تبدیل کن.
2. Skill مرتبط را بخوان؛ فقط منابع لازم آن را بارگذاری کن.
3. فایل‌های هدف و مالک task را ثبت کن.
4. کمترین تغییر کامل را انجام بده.
5. format، lint، typecheck، unit و تست دامنه مرتبط را اجرا کن.
6. برای پرداخت، ledger، auth، PII و crawler یک review مستقل لازم است.
7. خلاصه تغییر، شواهد تست، خطر باقیمانده و rollback را در PR بنویس.

## قوانین Git

- branchها: `feat/*`, `fix/*`, `data/*`, `docs/*`, `security/*`.
- commit اتمیک و Conventional Commits.
- push مستقیم به `main` ممنوع.
- merge فقط با CI سبز، یک review انسانی و CODEOWNERS مرتبط.
- secret، cookie، token، session، dump تولید و داده شخصی هرگز commit نشود.
- تغییر schema باید migration رو به جلو و برنامه rollback داشته باشد.

## دروازه‌های غیرقابل مذاکره

- پول با floating point ذخیره نمی‌شود؛ minor unit + currency.
- موجودی از ledger دوطرفه محاسبه می‌شود؛ `balance` منبع حقیقت نیست.
- رزرو با idempotency key، قفل/constraint و expiration قطعی انجام می‌شود.
- هیچ crawler بدون ثبت مالک، robots، ToS، rate limit و مجوز فعال نمی‌شود.
- CAPTCHA، login wall، device fingerprint و access control دور زده نمی‌شود.
- داده آگهی دارای `source`, `source_url`, `observed_at`, `content_hash`, `confidence` است.
- شماره تماس، آدرس دقیق و شناسه کاربر از منبع ثالث به‌صورت عمومی بازنشر نمی‌شود.
- توصیه سیم‌کارت/کارت مالی باید تاریخ بررسی و منبع رسمی داشته باشد.
- ادعاهایی مثل «تخفیف واقعی» فقط از price history محاسبه می‌شوند، نه متن فروشنده.

## UI و سه‌بعدی

- SSR/HTML قابل استفاده، سپس progressive enhancement.
- WebGL فقط پس از capability check و consent مناسب برای مصرف داده.
- fallback ویدئو/تصویر برای دستگاه ضعیف و `prefers-reduced-motion`.
- بودجه اولیه: LCP <= 2.5s در p75، CLS <= 0.1، INP <= 200ms.
- checkout، جست‌وجو و صفحات SEO به scene سه‌بعدی وابسته نیستند.

## مدل‌ها و Router

- تصمیم‌های پرخطر: مدل قوی + review مستقل.
- کار تکراری: مدل سریع و کم‌هزینه.
- انتخاب براساس capability و health است، نه نام تجاری یا ترتیب ثابت provider.
- fallback فقط در مرز checkpoint؛ تعویض مدل وسط patch بدون ثبت ممنوع.
- نام مدل انتخاب‌شده، provider، latency، token، cost و نتیجه در telemetry ثبت شود.
- subscription وب با API credit یکی فرض نشود.
- مدل خارجی برای داده حساس فقط با سیاست ZDR/عدم نگهداری تاییدشده.
- Commander خروجی Worker را evidence تلقی نمی‌کند؛ تست، diff و reviewer معیار پذیرش‌اند.

## Definition of Done

کد build می‌شود؛ تست مرتبط سبز است؛ اسناد و schema همگام‌اند؛ security/privacy بررسی شده؛ telemetry و rollback مشخص‌اند؛ هیچ TODO پنهان یا secret وجود ندارد.
