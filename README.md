# CACTUS JARVIS — Founder Command Center (Next.js + Neon + Jarvis AI)

## Ishga tushirish (3 qadam)
1. `.env.local` faylini oching va to'ldiring:
   - `DATABASE_URL` — Neon (console.neon.tech) → Connection string
   - `ANTHROPIC_API_KEY` — Jarvis uchun (console.anthropic.com)
   - `AUTH_SECRET` — istalgan uzun tasodifiy matn
2. `yarn` (bir marta, paketlarni o'rnatadi)
3. `yarn dev` → http://localhost:3000

`yarn dev` o'zi Neon'da jadvallarni yaratadi va birinchi marta demo ma'lumot qo'shadi.

## Kirish
- Rahbar (ГАП): `admin@cactus.uz` / `Cactus2026!`
- Jamoa (demo): `kamol@cactus.uz`, `muazzam@cactus.uz`, `elmira@cactus.uz` ... / `cactus123`
- Birinchi kirishdan keyin parollarni "Сотрудники → Изменить → Сбросить пароль" orqali almashtiring.

## Jarvis
- Chrome/Edge'da "🎙 Включить голос" → "Jarvis, ..." deb ayting yoki yozing.
- Imkoniyatlar: umumiy holat, xodim foizi, kechikkanlarni topib ogohlantirish, xodim/vazifa/loyiha qo'shish, tekshiruvdan o'tkazish, soat hisoboti, moliya (faqat ГАП).
- Jarvis har doim kirgan foydalanuvchi huquqlari bilan ishlaydi (server tekshiradi).
- Kechikish nazorati: ilova ochiq bo'lganda har ~5 daqiqada avtomatik (muddati o'tgan, grafikdan orqada, bugun taymer yoqmagan xodimlar).

## Eslatma
- Yuklangan fayllar `storage/` papkasida saqlanadi (productionda S3/Vercel Blob tavsiya).
- Model: `JARVIS_MODEL` (default `claude-sonnet-5-5`).
