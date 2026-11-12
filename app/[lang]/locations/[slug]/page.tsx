import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Browse } from "@/components/Browse";
import { Breadcrumb, Img, Row, WaIcon } from "@/components/ui";
import { getLocations, getProjects, getSettings } from "@/lib/data";
import { getDictionary, hasLang, langs, t } from "@/lib/i18n";
import { alternates, jsonLd, siteUrl, waLink } from "@/lib/site";

export async function generateStaticParams() {
  const locs = await getLocations();
  return langs.flatMap((lang) => locs.map((l) => ({ lang, slug: l.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/locations/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const loc = (await getLocations()).find((l) => l.slug === slug);
  if (!hasLang(lang) || !loc) return {};
  const count = (await getProjects()).filter((p) => p.location === loc._id).length;
  return {
    title: getDictionary(lang).location.heading.replace("{city}", t(loc.name, lang)),
    description: t(loc.seoIntro, lang) || undefined,
    alternates: alternates(lang, `/locations/${slug}`),
    robots: count ? undefined : { index: false }, // empty locations stay out of the index
  };
}

export default async function LocationPage({ params, searchParams }: PageProps<"/[lang]/locations/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLang(lang)) notFound();
  const [locations, projects, settings] = await Promise.all([getLocations(), getProjects(), getSettings()]);
  const loc = locations.find((l) => l.slug === slug);
  if (!loc) notFound();
  const dict = getDictionary(lang);
  const name = t(loc.name, lang);
  const list = projects.filter((p) => p.location === loc._id);
  const others = locations.filter((l) => l._id !== loc._id && projects.some((p) => p.location === l._id));
  const crumbs = [{ name: dict.nav.home, href: `/${lang}` }, { name }];
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: list.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${siteUrl}/${lang}/projects/${p.slug}`, name: t(p.name, lang) })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: dict.nav.home, item: `${siteUrl}/${lang}` },
        { "@type": "ListItem", position: 2, name },
      ],
    },
  ];

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <div>
        <Breadcrumb items={crumbs} />
        <h1 className="text-2xl font-bold">{dict.location.heading.replace("{city}", name)}</h1>
        {t(loc.seoIntro, lang) && <p className="mt-2 text-muted">{t(loc.seoIntro, lang)}</p>}
      </div>
      {list.length ? (
        <Browse lang={lang} list={list} sp={searchParams} path={`/${lang}/locations/${slug}`} pills={["type", "locality"]} />
      ) : (
        <div className="rounded-xl border border-line bg-surface p-6 text-center">
          <p className="mb-4 font-medium">{dict.location.comingSoon}</p>
          <a href={waLink(settings?.whatsappNumber, t(settings?.enquiryMsg, lang))} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-lg bg-wa px-4 py-2.5 font-medium text-wa-ink">
            <WaIcon /> {dict.contact.whatsapp}
          </a>
        </div>
      )}
      {others.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">{dict.location.other}</h2>
          <Row>
            {others.map((l) => (
              <Link key={l._id} href={`/${lang}/locations/${l.slug}`} className="flex w-20 shrink-0 flex-col items-center gap-1">
                <span className="relative aspect-square w-full overflow-hidden rounded-full border-2 border-accent bg-line">
                  {l.image && <Img src={l.image} alt="" fill sizes="80px" className="object-cover" />}
                </span>
                <span className="text-center text-xs">{t(l.name, lang)}</span>
              </Link>
            ))}
          </Row>
        </section>
      )}
    </div>
  );
}
