# معماری خزش دقیق و مجاز

## هدف

جمع‌آوری داده عمومی و مجاز برای مقایسه قیمت، کشف مقصد و deep-link به منبع. سامانه نباید با بازنشر کامل آگهی، جایگزین منبع شود.

## ترتیب دسترسی

1. API رسمی یا feed شریک
2. affiliate/deep-link feed
3. sitemap/RSS عمومی
4. صفحات عمومی فقط در صورت اجازه robots و ToS
5. ورود دستی/قراردادی برای منابع منع‌شده

نبودن منع در `robots.txt` به‌تنهایی مجوز حقوقی نیست. ToS و حق پایگاه داده نیز بررسی می‌شوند.

## چرخه فعال‌سازی منبع

`DISCOVERED → LEGAL_REVIEW → TECH_REVIEW → TEST_ONLY → ACTIVE`

هر منبع می‌تواند به `PAUSED`, `BLOCKED`, `RETIRED` برود. مقدار پیش‌فرض رجیستری `manual_review` است؛ presence در فایل به معنی اجازه خزش نیست.

## Connector contract

هر connector باید این عملیات را پیاده کند:

```text
discover()       صفحه/شناسه‌های جدید
fetch(ref)       دریافت با conditional request
parse(raw)       تبدیل بدون تفسیر تجاری
normalize(item)  schema مشترک
validate(item)   صحت، currency، location و range
emit(item)       ثبت provenance و event
```

## داده اجباری

```json
{
  "source_id": "ir.divar",
  "source_item_id": "opaque-id",
  "source_url": "https://example/item",
  "observed_at": "RFC3339",
  "published_at": null,
  "content_hash": "sha256",
  "entity_type": "vehicle|property|product|service",
  "title": "...",
  "price": {"amount_minor": 0, "currency": "IRR", "kind": "asking"},
  "location": {"country": "IR", "city": null, "lat": null, "lng": null},
  "availability": "unknown",
  "confidence": 0.0,
  "parser_version": "..."
}
```

شماره تماس، پیام خصوصی، آدرس دقیق منزل، شناسه‌های session و داده پشت login جمع‌آوری نمی‌شوند.

## دقت قیمت و تشخیص تخفیف

عبارت فروشنده مانند «۸۰٪ تخفیف واقعی» evidence نیست. سامانه این شاخص‌ها را محاسبه می‌کند:

- قیمت فعلی در برابر median مشاهدات همان SKU/variant در 30/90 روز
- کمترین قیمت تاییدشده در بازه
- تغییر قیمت مرجع درست قبل از کمپین
- هزینه نهایی شامل VAT، shipping و fee
- seller، warranty، condition و region

فقط پس از product matching قابل اتکا، درصد تخفیف نمایش داده می‌شود. در غیر این صورت برچسب `advertised_discount` می‌آید.

## تطبیق و حذف تکرار

- محصول: GTIN/MPN/brand/model/variant؛ سپس fuzzy title.
- خودرو: VIN فقط با رضایت؛ در غیر این صورت make/model/year/trim/mileage/location.
- ملک: geohash کم‌دقت + ویژگی‌ها + تصویر perceptual hash؛ آدرس دقیق عمومی نمی‌شود.
- آگهی‌های cross-post با cluster id نگهداری می‌شوند، نه حذف خام.

## Scheduler و احترام به منبع

- token bucket جدا برای هر host؛ concurrency پیش‌فرض 1.
- conditional GET با ETag/Last-Modified.
- exponential backoff با jitter برای 429/5xx.
- توقف خودکار در افزایش 403، CAPTCHA، تغییر robots یا parser error.
- user-agent شفاف با URL تماس؛ cache و عدم واکشی مجدد بی‌دلیل.
- زمان‌بندی adaptive براساس نرخ تغییر، نه polling یکسان.

## ضدالگوهای ممنوع

- proxy rotation برای دورزدن محدودیت
- حل CAPTCHA یا شبیه‌سازی fingerprint
- استفاده از account شخصی برای برداشت داده
- استخراج API خصوصی اپ موبایل
- ذخیره cookie/token کاربر
- بازنشر تصویر یا توضیح کامل بدون مجوز
- تولید review یا امتیاز مصنوعی

## منابع اولیه

رجیستری `config/sources.json` شامل منابع شناخته‌شده است، از جمله:

- ایران: Divar، Sheypoor، Torob، Digikala، Basalam، Esam، Bama و منابع اقامتگاه.
- ترکیه: Sahibinden، Arabam، Hepsiemlak، Emlakjet، Trendyol، Hepsiburada، n11.
- امارات: dubizzle، Bayut، Property Finder، DubiCars، Amazon.ae، Noon.
- عربستان: Haraj، Aqar، Syarah، OpenSooq، Noon، Amazon.sa، Jarir و eXtra.
- عراق: OpenSooq Iraq، Miswag، Simma، Elryan و منابع محلی تاییدشده.

قبل از ساخت هر connector باید `robots_url`, `terms_url`, API/partner status و تاریخ review تکمیل شود.

## کنترل کیفیت

- golden fixtures نسخه‌بندی‌شده بدون PII
- contract test برای schema
- parser canary روزانه
- dashboard درصد null، تغییرات ناگهانی قیمت، duplicate rate و freshness
- quarantine برای داده خارج از range
- نمونه‌برداری انسانی برای هر release parser
