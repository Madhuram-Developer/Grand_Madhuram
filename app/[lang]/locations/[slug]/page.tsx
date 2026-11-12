import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Browse } from "@/components/Browse";
import { ButtonLink, Card } from "@/components/kit";
import { Breadcrumb, Img, Row, WaIcon } from "@/components/ui";
import { getLocations, getProjects, getSettings } from "@/lib/data";
import { getDictionary, hasLang, langs, t } from "@/lib/i18n";
import { alternates, jsonLd, siteUrl, waLink } from "@/lib/site";

export async function generateStaticParams() {
  const slugs = (await getLocations()).map((l) => l.slug);
  // Cache Components fails the build on an empty list (fresh/empty DB): fall back to a placeholder the page 404s.
  return langs.flatMap((lang) => (slugs.length ? slugs : ["_"]).map((slug) => ({ lang, slug })));
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
    <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <div>
        <Breadcrumb items={crumbs} />
        <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">{dict.location.heading.replace("{city}", name)}</h1>
        {t(loc.seoIntro, lang) && <p className="mt-2 text-muted lg:text-lg">{t(loc.seoIntro, lang)}</p>}
      </div>
      {list.length ? (
        <Browse lang={lang} list={list} sp={searchParams} path={`/${lang}/locations/${slug}`} pills={["type", "locality"]} />
      ) : (
        <Card className="p-6 text-center lg:p-10">
          <p className="mb-4 font-medium lg:text-lg">{dict.location.comingSoon}</p>
          <ButtonLink href={waLink(settings?.whatsappNumber, t(settings?.enquiryMsg, lang))} external variant="wa" size="lg">
            <WaIcon /> {dict.contact.whatsapp}
          </ButtonLink>
        </Card>
      )}
      {others.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold lg:text-2xl">{dict.location.other}</h2>
          <Row>
            {others.map((l) => (
              <Link key={l._id} href={`/${lang}/locations/${l.slug}`} className="group flex w-20 shrink-0 flex-col items-center gap-2 lg:w-28">
                <span className="relative aspect-square w-full overflow-hidden rounded-full border-2 border-brand bg-line group-hover:border-accent">
                  {l.image && <Img src={l.image} alt="" fill sizes="112px" className="object-cover" />}
                </span>
                <span className="text-center text-xs group-hover:text-accent lg:text-sm">{t(l.name, lang)}</span>
              </Link>
            ))}
          </Row>
        </section>
      )}
    </div>
  );
}
