# دفتر نیروهای هوش مصنوعی

آخرین snapshot: 2026-08-25. این فایل سیاست است؛ قیمت، availability و رتبه قبل از dispatch از کاتالوگ زنده خوانده می‌شود.

## فرماندهی

Commander تصمیم نهایی، حافظه مشترک، تقسیم task، پذیرش evidence و merge را نگه می‌دارد. مدل‌های زیر می‌توانند سرگروه موقت باشند، نه فرمانده نهایی.

| شناسه OpenRouter | نقش مناسب | قیمت snapshot | محدودیت |
|---|---|---:|---|
| `stealth/ox-alpha` | سرگروه agentic/coding غیرحساس | رایگان | provider ناشناس و retention؛ بدون PII/secret/payment |
| `dots-studio/dots-3-note-preview:free` | سرگروه/Worker رایگان long-context | رایگان | حذف اعلام‌شده در 2026-09-30 |
| `qwen/qwen3.8-27b` | Senior vision/coding/research | پولی | free تلقی نشود؛ structured output قوی |
| `z-ai/glm-5.3` | Strategic software/long-horizon | پولی | reasoning همیشه روشن؛ بودجه لازم |
| `google/gemini-3.7-flash` | Vision، agentic سریع، research و review | پولی/سهمیه Google | ظرفیت مستقیم Google و OpenRouter جدا سنجیده شود |

## انتخاب پویا

برای هر task کاتالوگ OpenRouter با فیلتر capability و author مجاز خوانده و براساس تخصص task، intelligence، coding، agentic، Design Arena، tool success، throughput، latency، health و هزینه مرتب می‌شود. امتیاز تخصصی task بالاتر از رتبه عمومی است.

مدل رایگان فقط وقتی رایگان محسوب می‌شود که هر دو قیمت prompt و completion در endpoint زنده صفر باشند. مدل منقضی، unavailable، فاقد capability یا زیر سطح task حذف می‌شود.

## ممنوعیت جاری

تمام authorها و aliasهای OpenAI/Codex و Anthropic/Claude در تولید، review، fallback، auto routing و utility task مسدود هستند. رفع ممنوعیت فقط با دستور صریح کاربر و تغییر ثبت‌شده policy انجام می‌شود.

## داده حساس

Taskهای payment، ledger، auth، PII، قرارداد خصوصی و strategy منتشرنشده به مدل stealth یا retention-enabled ارسال نمی‌شوند. اگر هیچ Worker مجاز مطابق privacy موجود نباشد، task متوقف می‌شود؛ policy برای ادامه ضعیف نمی‌شود.
