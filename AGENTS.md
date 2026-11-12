# AGENTS.md

Guide for AI agents (and humans) working on this repo. Setup/deploy steps: `README.md`. Original spec: `PLAN.md`.

## What this is
Bilingual (English `en` / Hindi `hi`) real-estate site for Madhuram Developer. Public pages are browsed mostly on phones and convert via WhatsApp. An admin panel at `/admin` lets staff edit everything without code.

## Stack (versions matter)
- **Next.js 16.4** App Router, Turbopack, `cacheComponents: true`, `partialPrefetching: true` (`next.config.ts`).
- React 19.3, TypeScript, Tailwind v4 (`@tailwindcss/turbopack`), Mongoose 9, jose (JWT), bcryptjs, tsx.
- **Next 16 APIs differ from older Next / training data.** Read the bundled docs at `node_modules/next/dist/docs` before using an unfamiliar API. Known differences:
  - `PageProps<"/route">`, `LayoutProps`, `RouteContext` are global types (generated on build/dev).
  - `next/image`: `preload` replaces `priority`; use `fetchPriority="high"` on the LCP image.
  - `updateTag()` only works inside server actions.
  - Request data (`cookies()`, `searchParams`) must render inside `<Suspense>`; no `new Date()` in cached/static output.
  - Middleware is `proxy.ts` (none used currently).

## Commands
```bash
npm run dev                          # localhost:3000 → redirects to /en
npm run build && npm start           # production check
npm run lint
npx tsc --noEmit
npm run seed                         # demo content; wipes content, keeps users
npm run create-superadmin -- <name>  # prints one-time password
```
Needs `.env.local` (see `.env.example`): `MONGODB_URI`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` (sign uploads), optional `NEXT_PUBLIC_MEDIA_URL` (media base; `next.config.ts` defaults it from the cloud name).

## Map
| Path | Role |
|---|---|
| `app/[lang]/` | Public site: home (landing), `projects`, `projects/[slug]`, `locations/[slug]`, `types/[...slug]` |
| `app/admin/` | Admin: login, dashboard, `users`, `landing` editor, generic `[entity]` list/edit |
| `app/preview/[lang]/` | Auth-gated preview of the **draft** landing (iframe in editor) |
| `app/api/` | `search` (suggestions), `upload` (auth-checked Cloudinary signature; browser then uploads directly to Cloudinary) |
| `app/sitemap.ts`, `app/robots.ts` | SEO |
| `app/theme.css` | **Only place colors live** (CSS tokens → Tailwind via `@theme inline`) |
| `components/Chrome.tsx` | `<Html>` shell (font), header/footer, floating WhatsApp button |
| `components/kit.tsx` | **Central UI kit** (buttons, fields, pills, cards); custom dropdown lives in `components/Select.tsx` |
| `lib/analytics.ts`, `lib/gsc.ts`, `lib/range.ts` | Dashboard data: first-party page views (`PageView`), Search Console API (service account, cached 1h), date ranges |
| `lib/media.ts` | `media(path)`: stored media path → full URL |
| `components/ui.tsx` | Server-safe pieces: `Img`, `ProjectCard`, `MapPreview`, `Row`, `Grid`, `Breadcrumb` |
| `components/client.tsx` | Client pieces: `LangSwitch`, `NavLinks`, `MobileMenu`, `SearchBar`, `Filter`, `LiteYouTube` |
| `components/sections/` | Landing sections renderer + `TrustCarousel` |
| `components/Browse.tsx` | Filtered project grid (listing/location/type pages) |
| `components/admin/` | `Form.tsx` (generic field renderer), `Panels.tsx` (login, users, landing editor) |
| `lib/models.ts` | All 9 Mongoose models + `PERMISSIONS`, `PROJECT_SECTIONS`, `LANDING_SECTIONS` |
| `lib/data.ts` | Public reads, cached + tagged |
| `lib/actions.ts` | All server actions (auth, CRUD, users, landing draft/publish) |
| `lib/admin.ts` | `ENTITIES`: field specs per admin collection |
| `lib/auth.ts` | Session cookie, `getUser`, `requireUser`, `requirePerm`, login lockout |
| `lib/site.ts` | `siteUrl`, WhatsApp links (`waLink`, `priceLink`), `alternates` (hreflang), `jsonLd` |
| `lib/filter.ts` | Shared filter logic (server + client) with built-in self-test |
| `lib/i18n.ts`, `dictionaries/*.json` | Languages, `t()`, UI labels |

## Conventions (follow these)
- **Bilingual content**: DB text is `L = { en, hi? }`; always render with `t(value, lang)` (falls back to `en`). Fixed UI strings go in **both** `dictionaries/en.json` and `hi.json`.
- **Caching**: public reads in `lib/data.ts` use `"use cache: remote"` (shared across all server instances; plain `"use cache"` is per-instance memory) + `cacheLife("content")` + `cacheTag(...)`. Tags: `settings`, `landing`, `projects`, `taxonomy`, `testimonials`. Any server action that writes must call `updateTag()` for the affected tag(s).
- **Admin CRUD is generic**: to add a field, add it to the model in `lib/models.ts` **and** to the entity's field spec in `lib/admin.ts`. No per-entity form code. Saves use `doc.overwrite` + `clean()`, so cleared fields actually clear.
- **Admin navigation**: grouped, collapsible full-height sidebar (left side) + dashboard both read `NAV` in `lib/admin.ts`. New admin screen = one line there.
- **Landing sections**: every section gets a centered heading + optional sub-heading via `SectionTitle` (fields `title`/`subtitle`). Headings use the display serif (`font-display`, Playfair; Hindi falls back to Mukta) with a copper italic accent: words wrapped in `*asterisks*`, else the last word (`splitAccent`). New section = add key to `LANDING_SECTIONS`, a `case` in `components/sections/Landing.tsx`, and fields in `app/admin/landing/page.tsx`.
- **Enquiries**: public form → `submitEnquiry` (server-validated, honeypot, in-memory per-IP limit) → `Enquiry` model → `/admin/enquiries` (`enquiries` permission).
- **Legal pages**: `/[lang]/privacy`, `/[lang]/cookies`; text from Settings → Legal pages, else defaults in `lib/legal.ts`. Keep those defaults truthful if you add cookies, trackers or new data collection.
- **Admin action bar**: every admin screen's title + actions go in `ActionBar` (`components/admin/ActionBar.tsx`), sticky at the top. Main action (Save / Publish / + New) is always rightmost; destructive actions (Discard) sit left of a `Divider`. Delete lives on each row of the list screen (`DeleteButton`), not inside the edit form.
- **Admin loading**: every admin route segment has a `loading.tsx` (re-exporting `app/admin/loading.tsx`); add one for new admin pages or Next flags "uncached data during navigation".
- **Permissions**: every admin page and every server action calls `requirePerm(...)` / `requireUser()`. Never rely on hiding UI. Superadmin-only: users. New admin areas need a permission in `PERMISSIONS`.
- **Colors**: dark-only black + copper theme. Never hardcode colors in components; add/modify tokens in `app/theme.css`.
- **UI kit**: every button, input, select, checkbox, pill, card, badge comes from `components/kit.tsx` (`Button`, `ButtonLink`, `Input`, `Textarea`, `Select`, `Checkbox`, `FieldRow`, `Pill`, `Card`, `Badge`, `Alert`). No raw styled `<button>`/`<input>`/`<select>` elsewhere; extend the kit instead.
- **Maps**: `MapPreview` in `components/ui.tsx` (Google embed, no key, lazy). Exact pin needs `geo.lat/lng` on the project/settings; otherwise it searches the address.
- **Media paths**: DB stores only the path after `NEXT_PUBLIC_MEDIA_URL` (e.g. `madhuram/abc123.jpg`), never a full URL. Resolve with `media()` from `lib/media.ts` anywhere a URL is needed outside `Img` (OG images, JSON-LD, PDF links, admin previews).
- **Images**: use `Img` from `components/ui.tsx` (calls `media()` itself) (auto-unoptimized for non-whitelisted hosts). New remote hosts go in `next.config.ts` `images.remotePatterns` and the `OPTIMIZABLE` regex.
- **Phone first**: grid wrappers that hold scroll rows need `grid-cols-[minmax(0,1fr)]` or they overflow on phones.
- Keep it simple: few files, no new dependencies without a strong reason.

## Performance (keep these)
- **Region**: Vercel functions run in `bom1` (Mumbai, `vercel.json`) because Atlas is in AWS `ap-south-1`. Moving either one apart adds ~200 ms to every query.
- **Images**: Cloudinary assets load straight from Cloudinary's CDN via the loader in `components/Img.tsx` (`f_auto,q_auto,w_…`). Never render a stored media path with a plain `<img>` at full size; use `Img`, or `mediaThumb()` for small previews (originals are often 1–2 MB).
- **Admin pages**: `await connection()` first, then run `requirePerm(...)` and the data queries together in one `Promise.all` (the redirect rejects it, so nothing leaks). Don't await auth and then query.
- **Admin queries**: select only the fields a screen shows (`listFields` on entities, `.select("name")` for dropdowns).
- **Public cache**: `cacheLife("content")` (custom profile in `next.config.ts`): instant refresh on admin save via `updateTag`, plus a 5-minute re-check so edits made outside this deployment appear.
- **Admin mutations**: server actions call `refresh()` (from `next/cache`) so the updated page comes back in the same response. Don't add `router.refresh()` on the client; it's a second full round trip.
- **Cold starts**: shared remote cache means a fresh Vercel instance serves public data without connecting to MongoDB; only admin, enquiries and page-view writes need a connection.
- **DB**: one pooled connection per server instance (`lib/db.ts`, `maxPoolSize: 10`, 5 s server selection); a failed connect is not cached.

## Gotchas (learned the hard way)
- **No `backdrop-blur` / `backdrop-filter` on sticky/fixed elements**: caused ~1.8s TBT in Lighthouse.
- Font (Mukta, latin+devanagari) uses `preload: false` and only weights 400/700; preloading Devanagari starved LCP.
- Mongoose reserves the key `collection`: landing sections use `collectionId`.
- `notFound()` pages stream with HTTP 200 + `noindex` (Cache Components behavior), not 404.
- After an admin save, the first hit on a project page may serve stale once (stale-while-revalidate); next hit is fresh.
- Login lockout is in-memory (per server instance).
- Deleting a location/type does not clean up projects that reference it.

## Verify before calling work done
1. `npx tsc --noEmit` and `npm run lint` clean.
2. `npm run build` passes.
3. Hit changed routes (`curl -s -o /dev/null -w "%{http_code}" localhost:3000/en/...`) and check both `/en` and `/hi`.
4. UI changes: check phone width (375px) for horizontal overflow.
5. Admin changes: confirm a non-permitted admin is denied (page **and** action).

## Never
- Commit `.env*` (except `.env.example`).
- Print or commit passwords/secrets.
- Run `npm run seed` against a production `MONGODB_URI` (it wipes content).
