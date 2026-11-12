# Madhuram site — build plan

Visual version: https://claude.ai/artifact/Pez7ZZtKDk2nxaEFzHmjJM

## Goal
Mobile-first, bilingual (en/hi) real estate site. Main conversion = WhatsApp chat. Landing page fully controlled from admin with live preview.

## Stack
Next.js (App Router, TS) · Tailwind v4 · MongoDB + Mongoose · Server Actions for admin writes · jose (signed httpOnly cookie) + bcryptjs for auth.
Defaults to confirm: Vercel + Atlas hosting, Cloudinary for images + PDFs.

## Rules
- Colors only in `app/theme.css` (CSS vars, exposed to Tailwind via `@theme inline`). No hex in components.
- Every admin-entered text is `{ en, hi? }`. Read via `t(value, lang)` → falls back to en.
- Fixed UI labels in `dictionaries/en.json`, `hi.json`.
- URLs: `/en/...`, `/hi/...`; `/` → `/en`. `hreflang` on every page.
- Cards small: ~150px wide on phone rows, max 240px on desktop. 4:3 image with status badge, type, name, locality + city, up to 3 facts (`facts` with `onCard`), [View property] [Know price].
- Location circles are true circles (1:1, `aspect-ratio: 1`), never ovals.
- No price shown anywhere. `priceMin/Max` stored only for the budget filter.
- "Know price" = plain `wa.me/<num>?text=<template>` link; template from settings (per-language), optional per-project override. Placeholders `{project} {location} {config} {link}`.
- Permissions checked server-side in every admin action.
- **Title rule (project pages):** `t(project.sectionTitles?.[key] ?? projectPage.sections[key].title, lang)`. Sections with no content hide themselves.
- Facts are display-only. Filters/search use structured fields (types, location, configs.bhk, price range).

## Landing sections (order/visibility/titles/variant editable)
0. **Trust carousel** (first thing seen) — `landing.trust.slides[{image, alt L, headline L, subline L, link}]`. 1 slide = static, no dots. 2+ = auto-advance every 3s, seamless infinite loop (clone first slide at end, reset without transition), dots, swipe, pause on touch / hidden tab, no autoplay under `prefers-reduced-motion`. First image `priority` (LCP), rest lazy. Optional `trust.stats[{value, label L}]` row below. Component: `components/sections/TrustCarousel.tsx`.
1. About + search bar (project/locality/city, en or hi, instant suggestions via `/api/search`; Enter → `/projects?q=`) + filter (tabs = top-level types; sub-type, location, bedrooms, budget; "N projects found")
2. Projects by location — variant `circles` | `tiles`
3. Top projects — shows a project **collection**
4. Projects by type (types → sub-types pills)
5. Testimonials
6. Contact (WhatsApp, address, phone, email, map) + floating WhatsApp button

## Routes
`/[lang]` · `/[lang]/projects` (filters + `q` in query) · `/[lang]/projects/[slug]` · `/[lang]/locations/[slug]` · `/[lang]/types/[...slug]` · `/preview/[lang]` (draft, auth) · `/admin/*` (noindex) · `sitemap.ts` · `robots.ts` · `api/upload` (images + PDFs) · `api/search`

## Project detail page (`/[lang]/projects/[slug]`)
Swipe gallery (1st image = OG) · breadcrumb · name, locality · facts grid (all facts) · overview + highlights · floor plans per config, each with own "Know price" · videos (multiple YouTube, titled, thumbnail-first lite embed) · downloads (multiple PDFs, titled) · amenities · map preview linking to Google Maps (no embed) · nearby places · similar projects (shared collection, current project excluded) · sticky phone bar [WhatsApp][Call] · JSON-LD Residence + BreadcrumbList + VideoObject.
Section keys: `overview, floorPlans, videos, documents, amenities, location, similar`.

## Location page (`/[lang]/locations/[slug]`)
H1 "Projects in <city>" · admin intro text (L) · type pills + locality pills (derived from projects' `locality`) · sort · 2-col grid phone / 4-col desktop of all published projects with that location · other locations circles · 0 projects → "coming soon" + WhatsApp, excluded from sitemap · JSON-LD ItemList + BreadcrumbList.

## Collections (9)
- **projects**: slug, name L, shortDesc L, description L, location→locations, locality L, types[]→types, configs[{bhk, label L, sizeSqft, floorPlan}], facts[{label L, value L, onCard}], highlights[L], nearby[{name L, distance}], priceMin, priceMax, images[{url, alt L}], videos[{title L, youtubeUrl}], documents[{title L, pdfUrl}], amenities[L], address L, geo, whatsappMsg L?, sectionTitles{[key]: L} (overrides only), hiddenSections[], seo{title L, description L}, status
- **locations**: slug, name L, image, order, seoIntro L
- **types**: slug, name L, parent→types|null, order (2 levels)
- **testimonials**: name, text L, project?, photo, rating, order, active
- **collections**: name (internal), projects[]→projects (ordered). Used by landing Top projects + project-page Similar.
- **projectPage** (singleton): sections[{key, title L, visible}] (ordered), defaultFacts[{label L}], similar→collections
- **settings** (singleton): whatsappNumber, phone, email, address L, geo, hours, socials, priceMsg L, enquiryMsg L, defaultSeo L, logo
- **landing** (singleton): draft.sections[], live.sections[] — each `{key, visible, title L, subtitle L, variant, items[]}`; publishedAt, publishedBy
- **users**: username, passwordHash, role superadmin|admin, permissions[projects|taxonomy|testimonials|landing|settings], active, lastLoginAt
  (`projects` permission covers collections + project page settings)

## Admin
- Superadmin: everything incl. Users. Admin: only ticked areas, never Users.
- New admin: username + permissions → server generates 16-char password, stores hash, shows once with Copy. Reset = same flow.
- Project edit tabs: Basics · Card & facts · Sections (title overrides, placeholder = shared default, per-project hide) · Media (photos, videos, PDFs) · Floor plans · SEO.
- Project page settings: shared section titles + order, default facts for new projects, which collection = Similar.
- Landing editor: left = section list (drag reorder, hide, edit bilingual fields, variant); right = iframe `/preview/[lang]` with phone/desktop + EN/HI toggles. Debounced auto-save to `draft`, iframe reloads. Publish copies draft→live + `revalidatePath`.

## Phases
1. **Foundation** — scaffold, theme.css, fonts (incl. Devanagari), db + 9 models, seed script, `[lang]` routing + `t()`. Done: `/en` and `/hi` render.
2. **Public site** — sections, card, search + filter, listing/detail/location/type pages, videos, downloads, similar, WhatsApp links. Done: works on phone with seed data.
3. **Auth + users** — login, create-superadmin script, users CRUD w/ one-time password, permission guard. Done: limited admin can't touch other areas.
4. **Content CRUD** — projects (photos, videos, PDFs, facts, title overrides), collections, project page settings, locations, types, testimonials, settings; revalidate on save. Done: all seed data replaceable from admin.
5. **Landing editor** — draft/live, preview iframe, publish/discard. Done: edits preview in ~1s, live only after Publish.
6. **SEO + launch** — metadata, hreflang, JSON-LD, sitemap, OG, Lighthouse 90+ mobile, deploy, Search Console, Google Business Profile.

## Open decisions (defaults in brackets)
Hosting [Vercel+Atlas] · Images/PDFs [Cloudinary] · Apartment/Villa/Plot filter [no, use sub-types] · Budget slider [yes, admin can hide] · Hindi copy [client team] · PDFs gated behind WhatsApp [no, free download] · Click tracking [not v1]
