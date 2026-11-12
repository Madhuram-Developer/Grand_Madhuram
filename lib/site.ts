import type { Metadata } from "next";
import { langs, t, type L, type Lang } from "./i18n";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** wa.me link; template placeholders {project} {location} {config} {link}. */
export function waLink(number: string | undefined | null, template = "", vars: Record<string, string> = {}) {
  const text = template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "").replace(/\s+/g, " ").replace(/\(\s*\)/g, "").trim();
  return `https://wa.me/${(number ?? "").replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

type PriceCtx = { whatsappNumber?: string | null; priceMsg?: L | null };
type PriceProject = { slug: string; name: L; whatsappMsg?: L | null };
export function priceLink(s: PriceCtx | null, p: PriceProject, lang: Lang, location: string, config = "") {
  const tpl = t(p.whatsappMsg, lang) || t(s?.priceMsg, lang);
  return waLink(s?.whatsappNumber, tpl, { project: t(p.name, lang), location, config, link: `${siteUrl}/${lang}/projects/${p.slug}` });
}

/** canonical + hreflang for a path that lives under /[lang]. */
export function alternates(lang: Lang, path = ""): Metadata["alternates"] {
  return {
    canonical: `/${lang}${path}`,
    languages: { ...Object.fromEntries(langs.map((l) => [l, `/${l}${path}`])), "x-default": `/en${path}` },
  };
}

export const jsonLd = (data: unknown) => ({ __html: JSON.stringify(data).replace(/</g, "\\u003c") });

export const ytId = (url: string) => url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1] ?? "";
