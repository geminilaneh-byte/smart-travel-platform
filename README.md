# Smart Travel Platform — Architecture Pack

بسته اجرایی مرحله صفر برای پلتفرم گردشگری پنج‌کشوری: امارات، ترکیه، ایران، عربستان و عراق.

این مخزن هنوز کد محصول نیست. وظیفه آن تثبیت معماری، قراردادهای عامل‌های هوش مصنوعی، سیاست خزش، رجیستری منابع و دروازه‌های امنیتی پیش از توسعه است.

## محتوا

- `AGENTS.md`: قانون واحد تمام عامل‌ها و مدل‌ها
- `docs/EXECUTIVE_ARCHITECTURE_FA.md`: معماری محصول، داده و استقرار
- `docs/CRAWLING_AND_COMPLIANCE_FA.md`: معماری خزش مجاز و دقیق
- `docs/TRAVEL_CONNECTIVITY_PAYMENTS_FA.md`: سیم‌کارت و پرداخت توریستی
- `config/model-router.yaml`: مسیریابی چندمدلی و fallback
- `config/sources.json`: رجیستری اولیه منابع پنج کشور
- `.codex/skills/*`: مهارت‌های پروژه

## اصل حاکم

Commander پروژه مستقل از provider است و Gemini، مدل‌های مجاز OpenRouter و مدل‌های محلی Workerهای قابل جایگزینی‌اند. OpenAI/Codex و Anthropic/Claude تا دستور صریح کاربر ممنوع‌اند. هیچ مدل زبانی به‌تنهایی اجازه ادغام در `main`، تغییر پرداخت، تغییر ledger، فعال‌سازی crawler جدید یا انتشار production را ندارد.

## اعتبارسنجی

```bash
node scripts/validate-project.mjs
```

## وضعیت انتشار

این بسته برای ایجاد repository و اولین Pull Request آماده است. پیش از انتشار عمومی باید نام برند، مجوز مخزن و کشور محل ثبت شرکت تعیین شود.
