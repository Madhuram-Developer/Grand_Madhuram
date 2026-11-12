// Small shared presentational pieces (server-safe, no hooks).
import Image, { type ImageProps } from "next/image";
import Link from "next/link";
import type { Ctx, ProjectT } from "@/lib/data";
import { t, type Dict, type Lang } from "@/lib/i18n";
import { priceLink } from "@/lib/site";

// ponytail: next/image only optimizes whitelisted hosts; anything else renders as-is instead of crashing
const OPTIMIZABLE = /^(\/|https:\/\/(res\.cloudinary\.com|picsum\.photos)\/)/;
export function Img(props: ImageProps & { src: string }) {
  return <Image {...props} alt={props.alt} unoptimized={!OPTIMIZABLE.test(props.src)} />;
}

export function WaIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z" />
    </svg>
  );
}

export function SectionTitle({ title, subtitle }: { title?: string; subtitle?: string }) {
  if (!title && !subtitle) return null;
  return (
    <div className="mb-4">
      {title && <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>}
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

/** Horizontal scroll row on phones, wraps on desktop. */
export function Row({ children }: { children: React.ReactNode }) {
  return <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">{children}</div>;
}

export function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

export const cityOf = (p: ProjectT, ctx: Ctx, lang: Lang) => t(ctx.locations.find((l) => l._id === p.location)?.name, lang);

export function ProjectCard({ p, ctx, lang, dict, inRow }: { p: ProjectT; ctx: Ctx; lang: Lang; dict: Dict; inRow?: boolean }) {
  const href = `/${lang}/projects/${p.slug}`;
  const city = cityOf(p, ctx, lang);
  const pt = p.types?.map((id) => ctx.types.find((x) => x._id === id)).filter(Boolean) ?? [];
  const type = pt.find((x) => x?.parent) ?? pt[0];
  const img = p.images?.[0];
  const facts = (p.facts ?? []).filter((f) => f.onCard).slice(0, 3);
  const configs = (p.configs ?? []).map((c) => t(c.label, lang)).join(", ");
  const H = inRow ? "h3" : "h2"; // rows sit under a section h2; grids sit under the page h1
  return (
    <article className={`flex flex-col overflow-hidden rounded-xl border border-line bg-surface ${inRow ? "w-[150px] shrink-0 snap-start sm:w-[200px] lg:w-[240px]" : "w-full max-w-[240px]"}`}>
      <Link href={href} className="relative block aspect-[4/3] bg-line">
        {img?.url && <Img src={img.url} alt={t(img.alt, lang) || t(p.name, lang)} fill sizes="(min-width:1024px) 240px, (min-width:640px) 200px, 150px" className="object-cover" />}
        {t(p.badge, lang) && <span className="absolute left-2 top-2 rounded bg-badge px-1.5 py-0.5 text-[10px] font-medium text-badge-ink">{t(p.badge, lang)}</span>}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        {type && <span className="text-[11px] uppercase tracking-wide text-brand">{t(type.name, lang)}</span>}
        <H className="text-sm font-bold leading-tight">
          <Link href={href}>{t(p.name, lang)}</Link>
        </H>
        <p className="text-xs text-muted">{[t(p.locality, lang), city].filter(Boolean).join(", ")}</p>
        {facts.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-xs">
            {facts.map((f, i) => (
              <li key={i}>
                <span className="text-muted">{t(f.label, lang)}:</span> {t(f.value, lang)}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto grid gap-1.5 pt-2 text-xs font-medium">
          <Link href={href} className="rounded-lg border border-brand px-2 py-1.5 text-center text-brand">
            {dict.card.view}
          </Link>
          <a href={priceLink(ctx.settings, p, lang, city, configs)} target="_blank" rel="noopener" className="flex items-center justify-center gap-1 rounded-lg bg-wa px-2 py-1.5 text-wa-ink">
            <WaIcon className="size-3.5" /> {dict.card.price}
          </a>
        </div>
      </div>
    </article>
  );
}

export function Breadcrumb({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 text-xs text-muted">
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && " / "}
          {it.href ? <Link href={it.href} className="underline-offset-2 hover:underline">{it.name}</Link> : <span className="text-ink">{it.name}</span>}
        </span>
      ))}
    </nav>
  );
}
