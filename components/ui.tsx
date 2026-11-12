// Small shared presentational pieces (server-safe, no hooks).
import Link from "next/link";
import type { Ctx, ProjectT } from "@/lib/data";
import { t, type Dict, type Lang } from "@/lib/i18n";
import { priceLink } from "@/lib/site";
import { Badge, ButtonLink, Card } from "./kit";

import { Img } from "./Img";
export { Img };

export function WaIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z" />
    </svg>
  );
}

/**
 * Split a heading into [before, accent, after]. Admins mark the accent with *asterisks* ("What our *buyers* say");
 * without them the last word is the accent (none for one-word headings).
 */
export function splitAccent(text: string): [string, string, string] {
  const m = text.match(/^(.*?)\*(.+?)\*(.*)$/);
  if (m) return [m[1], m[2], m[3]];
  const i = text.trimEnd().lastIndexOf(" ");
  return i < 0 ? [text, "", ""] : [text.slice(0, i + 1), text.slice(i + 1).trimEnd(), ""];
}

// ponytail: self-check, run with `ACCENT_SELFTEST=1 npx tsx components/ui.tsx`
if (typeof process !== "undefined" && process.env?.ACCENT_SELFTEST) {
  const eq = (a: unknown, b: unknown) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${JSON.stringify(a)} !== ${JSON.stringify(b)}`); };
  eq(splitAccent("What our buyers say"), ["What our buyers ", "say", ""]);
  eq(splitAccent("What our *buyers* say"), ["What our ", "buyers", " say"]);
  eq(splitAccent("*Get in touch*"), ["", "Get in touch", ""]);
  eq(splitAccent("Testimonials"), ["Testimonials", "", ""]);
  eq(splitAccent("हमसे बात करें"), ["हमसे बात ", "करें", ""]);
  console.log("accent ok");
}

/** Centered section heading: display serif with an italic copper accent, muted sub-heading underneath. */
export function SectionTitle({ title, subtitle, as: H = "h2" }: { title?: string; subtitle?: string; as?: "h1" | "h2" }) {
  if (!title && !subtitle) return null;
  const [before, accent, after] = splitAccent(title ?? "");
  return (
    <div className="mx-auto mb-8 max-w-3xl text-center lg:mb-12">
      {title && (
        <H className="font-display text-3xl leading-tight font-normal tracking-tight sm:text-4xl lg:text-5xl">
          {before}
          {accent && <em className="text-brand">{accent}</em>}
          {after}
        </H>
      )}
      {subtitle && <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted lg:mt-4 lg:text-lg">{subtitle}</p>}
    </div>
  );
}

/** Horizontal scroll row on phones, wraps on desktop. */
export function Row({ children }: { children: React.ReactNode }) {
  // scroll-px matches px: snap points respect the padding, so the first card keeps its gutter instead of snapping flush left
  // auto margins on first/last child: centered when the row fits, normal left-start scrolling when it overflows
  return <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:gap-5 [&>:first-child]:ml-auto [&>:last-child]:mr-auto">{children}</div>;
}

export function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">{children}</div>;
}

export const cityOf = (p: ProjectT, ctx: Ctx, lang: Lang) => t(ctx.locations.find((l) => l._id === p.location)?.name, lang);

export function ProjectCard({ p, ctx, lang, dict, inRow, heading }: { p: ProjectT; ctx: Ctx; lang: Lang; dict: Dict; inRow?: boolean; heading?: "h2" | "h3" }) {
  const href = `/${lang}/projects/${p.slug}`;
  const city = cityOf(p, ctx, lang);
  const pt = p.types?.map((id) => ctx.types.find((x) => x._id === id)).filter(Boolean) ?? [];
  const type = pt.find((x) => x?.parent) ?? pt[0];
  const img = p.images?.[0];
  const facts = (p.facts ?? []).filter((f) => f.onCard).slice(0, 3);
  const configs = (p.configs ?? []).map((c) => t(c.label, lang)).join(", ");
  const H = heading ?? (inRow ? "h3" : "h2"); // rows sit under a section h2; page grids sit under the page h1
  return (
    <Card className={`group flex flex-col overflow-hidden transition-colors hover:border-brand ${inRow ? "w-[160px] shrink-0 snap-start sm:w-[220px] lg:w-[260px]" : "w-full"}`}>
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-line">
        {img?.url && <Img src={img.url} alt={t(img.alt, lang) || t(p.name, lang)} fill sizes="(min-width:1024px) 280px, (min-width:640px) 220px, 50vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />}
        {t(p.badge, lang) && <Badge className="absolute left-2 top-2">{t(p.badge, lang)}</Badge>}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3 lg:p-4">
        {type && <span className="text-[11px] uppercase tracking-wider text-brand lg:text-xs">{t(type.name, lang)}</span>}
        <H className="text-sm font-bold leading-tight lg:text-lg">
          <Link href={href} className="hover:text-accent">{t(p.name, lang)}</Link>
        </H>
        <p className="text-xs text-muted lg:text-sm">{[t(p.locality, lang), city].filter(Boolean).join(", ")}</p>
        {facts.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-xs lg:text-sm">
            {facts.map((f, i) => (
              <li key={i}>
                <span className="text-muted">{t(f.label, lang)}:</span> {t(f.value, lang)}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto grid gap-2 pt-3">
          <ButtonLink href={href} variant="outline" size="sm" block>{dict.card.view}</ButtonLink>
          <ButtonLink href={priceLink(ctx.settings, p, lang, city, configs)} external variant="wa" size="sm" block>
            <WaIcon className="size-3.5" /> {dict.card.price}
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}

/** Embedded Google map with the pin (no API key), lazy so it costs nothing above the fold. Dark-tinted to match theme. */
export function MapPreview({ lat, lng, query, title, address, openLabel }: { lat?: number | null; lng?: number | null; query: string; title: string; address?: string; openLabel: string }) {
  const q = lat != null && lng != null ? `${lat},${lng}` : query;
  const open = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  return (
    <Card className="overflow-hidden">
      <iframe
        src={`https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="block aspect-[4/3] w-full border-0 [filter:invert(0.9)_hue-rotate(180deg)_saturate(0.7)] sm:aspect-[21/9]"
      />
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 lg:p-4">
        {address && <p className="text-sm lg:text-base">📍 {address}</p>}
        <ButtonLink href={open} external variant="outline" size="sm">{openLabel} ↗</ButtonLink>
      </div>
    </Card>
  );
}

export function Breadcrumb({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 text-xs text-muted lg:text-sm">
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && " / "}
          {it.href ? <Link href={it.href} className="hover:text-accent">{it.name}</Link> : <span className="text-ink">{it.name}</span>}
        </span>
      ))}
    </nav>
  );
}
