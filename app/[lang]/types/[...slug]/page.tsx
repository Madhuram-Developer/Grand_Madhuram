import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Browse } from "@/components/Browse";
import { Breadcrumb } from "@/components/ui";
import { getProjects, getTypes } from "@/lib/data";
import { getDictionary, hasLang, langs, t, type Lang } from "@/lib/i18n";
import { alternates, jsonLd, siteUrl } from "@/lib/site";

export async function generateStaticParams() {
  const types = await getTypes();
  return langs.flatMap((lang) =>
    types.map((x) => {
      const parent = types.find((p) => p._id === x.parent);
      return { lang, slug: parent ? [parent.slug, x.slug] : [x.slug] };
    }),
  );
}

async function resolve(lang: string, slug: string[]) {
  if (!hasLang(lang) || slug.length > 2) return null;
  const types = await getTypes();
  const top = types.find((x) => x.slug === slug[0] && !x.parent);
  const sub = slug[1] ? types.find((x) => x.slug === slug[1] && x.parent === top?._id) : undefined;
  if (!top || (slug[1] && !sub)) return null;
  return { lang: lang as Lang, top, sub, types, current: sub ?? top };
}

export async function generateMetadata({ params }: PageProps<"/[lang]/types/[...slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const r = await resolve(lang, slug);
  if (!r) return {};
  return { title: t(r.current.name, r.lang), alternates: alternates(r.lang, `/types/${slug.join("/")}`) };
}

export default async function TypePage({ params, searchParams }: PageProps<"/[lang]/types/[...slug]">) {
  const { lang: l, slug } = await params;
  const r = await resolve(l, slug);
  if (!r) notFound();
  const { lang, top, sub, types, current } = r;
  const dict = getDictionary(lang);
  const list = (await getProjects()).filter((p) => p.types?.includes(current._id));
  const subs = types.filter((x) => x.parent === top._id);
  const crumbs = [
    { name: dict.nav.home, href: `/${lang}` },
    { name: t(top.name, lang), href: sub ? `/${lang}/types/${top.slug}` : undefined },
    ...(sub ? [{ name: t(sub.name, lang) }] : []),
  ];
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.href ? siteUrl + c.href : undefined })),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <Breadcrumb items={crumbs} />
      <h1 className="mb-3 text-2xl font-bold">{t(current.name, lang)}</h1>
      {subs.length > 0 && (
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
          <Link href={`/${lang}/types/${top.slug}`} className={`shrink-0 rounded-full px-3 py-1 text-sm ${!sub ? "bg-brand text-brand-ink" : "border border-line bg-surface"}`}>{dict.nav.allTypes}</Link>
          {subs.map((x) => (
            <Link key={x._id} href={`/${lang}/types/${top.slug}/${x.slug}`} className={`shrink-0 rounded-full px-3 py-1 text-sm ${sub?._id === x._id ? "bg-brand text-brand-ink" : "border border-line bg-surface"}`}>
              {t(x.name, lang)}
            </Link>
          ))}
        </div>
      )}
      <Browse lang={lang} list={list} sp={searchParams} path={`/${lang}/types/${slug.join("/")}`} />
    </div>
  );
}
