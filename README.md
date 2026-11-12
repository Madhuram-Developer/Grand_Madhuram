# Madhuram site

Bilingual (en/hi) real-estate site. Next.js 16 (App Router, Cache Components) · Tailwind v4 · MongoDB/Mongoose. Plan: `PLAN.md`.

## Setup
```bash
cp .env.example .env.local   # fill MONGODB_URI, AUTH_SECRET, NEXT_PUBLIC_SITE_URL
npm install
npm run seed                 # demo content (wipes content, keeps users)
npm run create-superadmin -- owner   # prints a one-time password
npm run dev                  # http://localhost:3000  → /en, admin at /admin
```

## Where things live
- Colors: `app/theme.css` only. Fonts + page shell: `components/Chrome.tsx`.
- Public reads (cached, tagged): `lib/data.ts`. Admin saves call `updateTag()` in `lib/actions.ts`.
- Admin forms are generated from field specs in `lib/admin.ts` (one entry per collection) and rendered by `components/admin/Form.tsx`.
- Landing editor: `/admin/landing` (draft auto-saves, iframe `/preview/[lang]`, Publish copies draft → live).
- Permissions: checked in every admin page and server action via `requirePerm()` (`lib/auth.ts`).

## Deploy (Vercel + Atlas + Cloudinary)
1. Atlas cluster → `MONGODB_URI`; allow Vercel IPs (or 0.0.0.0/0 with strong password).
2. Vercel project → env vars from `.env.example` (`CLOUDINARY_URL` + `NEXT_PUBLIC_MEDIA_URL=https://res.cloudinary.com/<cloud>/image/upload` required for uploads).
3. Cloudinary: Settings → Security → allow "PDF and ZIP files delivery" so brochures download.
4. After first deploy: `npm run create-superadmin -- <name>` with production `MONGODB_URI`.
5. Search Console: add domain property, submit `/sitemap.xml`. Google Business Profile: link to `/en`.

## Analytics (admin dashboard)
- **Project page views**: counted by the site itself (`/api/track`, stored per project per day in `pageviews`). Works out of the box.
- **Google Search Console** (clicks, impressions, CTR, position, top searches): Google Cloud → enable *Google Search Console API* → service account → JSON key. In Search Console add the service account email as a user on the property. Set `GSC_CLIENT_EMAIL`, `GSC_PRIVATE_KEY` (the key with `\n` line breaks) and `GSC_SITE_URL` (`sc-domain:example.com` or `https://www.example.com/`).
- Who sees it: superadmin, or admins with the `analytics` permission (Users page).
