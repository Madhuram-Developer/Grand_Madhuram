import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui";
import { getSettings } from "@/lib/data";
import { getDictionary, hasLang, t } from "@/lib/i18n";
import { DEFAULT_COOKIES, DEFAULT_PRIVACY, fillLegal } from "@/lib/legal";
import { alternates } from "@/lib/site";

type Kind = "privacy" | "cookies";
const field = { privacy: "privacyPolicy", cookies: "cookiePolicy" } as const;
const fallback = { privacy: DEFAULT_PRIVACY, cookies: DEFAULT_COOKIES };

export async function legalMetadata(kind: Kind, lang: string): Promise<Metadata> {
  if (!hasLang(lang)) return {};
  return { title: getDictionary(lang).legal[kind], alternates: alternates(lang, `/${kind}`) };
}

/** Privacy / cookie policy page: admin text from Settings (per language, falls back to English), else the built-in default. */
export async function LegalPage({ kind, lang }: { kind: Kind; lang: string }) {
  if (!hasLang(lang)) notFound();
  const dict = getDictionary(lang);
  const s = await getSettings();
  const text = fillLegal(t(s?.[field[kind]], lang) || fallback[kind], s ?? {});
  const title = dict.legal[kind];
  // lines without a full stop that are followed by text read as sub-headings in the default copy
  const blocks = text.split(/\n{2,}/);
  return (
    <article className="mx-auto max-w-3xl px-4 py-6 lg:py-10">
      <Breadcrumb items={[{ name: dict.nav.home, href: `/${lang}` }, { name: title }]} />
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl lg:text-4xl">{title}</h1>
      <div className="grid gap-5 leading-relaxed text-ink/90 lg:text-lg">
        {blocks.map((b, i) => {
          const [first, ...rest] = b.split("\n");
          const heading = rest.length > 0 && !/[.:]$/.test(first) && first.length < 60;
          return (
            <section key={i}>
              {heading && <h2 className="mb-2 text-lg font-bold text-brand lg:text-xl">{first}</h2>}
              <p className="whitespace-pre-line">{heading ? rest.join("\n") : b}</p>
            </section>
          );
        })}
      </div>
    </article>
  );
}
