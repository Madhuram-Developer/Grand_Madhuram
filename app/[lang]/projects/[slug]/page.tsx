import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiteYouTube, TrackView } from "@/components/client";
import { Badge, ButtonLink, Card } from "@/components/kit";
import { Breadcrumb, cityOf, Img, MapPreview, ProjectCard, Row, WaIcon } from "@/components/ui";
import { collectionProjects, getCtx, getProject, getProjectPage, getProjects } from "@/lib/data";
import { getDictionary, hasLang, langs, t, type Lang } from "@/lib/i18n";
import { cloudinaryUrl, media } from "@/lib/media";
import { PROJECT_SECTIONS, withAllSections } from "@/lib/models";
import { alternates, jsonLd, priceLink, siteUrl, ytId } from "@/lib/site";

export async function generateStaticParams() {
  const slugs = (await getProjects()).map((p) => p.slug);
  // Cache Components fails the build on an empty list (fresh/empty DB): fall back to a placeholder the page 404s.
  return langs.flatMap((lang) => (slugs.length ? slugs : ["_"]).map((slug) => ({ lang, slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/projects/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const p = await getProject(slug);
  if (!hasLang(lang) || !p) return {};
  const title = t(p.seo?.title, lang) || t(p.name, lang);
  const description = t(p.seo?.description, lang) || t(p.shortDesc, lang);
  const img = p.images?.[0];
  return {
    title,
    description,
    alternates: alternates(lang, `/projects/${slug}`),
    openGraph: { title, description, images: img?.url ? [{ url: cloudinaryUrl(media(img.url), 1200), alt: t(img.alt, lang) }] : undefined },
  };
}

export default async function ProjectPage({ params }: PageProps<"/[lang]/projects/[slug]">) {
  const { lang: l, slug } = await params;
  if (!hasLang(l)) notFound();
  const lang: Lang = l;
  const [p, ctx, page] = await Promise.all([getProject(slug), getCtx(), getProjectPage()]);
  if (!p) notFound();
  const dict = getDictionary(lang);
  const s = ctx.settings;
  const city = cityOf(p, ctx, lang);
  const loc = ctx.locations.find((x) => x._id === p.location);
  // 'Similar projects' collection; if none is set, other published projects (same city first)
  const picked = (await collectionProjects(page?.similar)).filter((x) => x._id !== p._id);
  const others = (await getProjects()).filter((x) => x._id !== p._id).sort((a, b) => Number(b.location === p.location) - Number(a.location === p.location));
  const similar = (picked.length ? picked : others).slice(0, 8);
  const ytVideos = (p.videos ?? []).map((v) => ({ ...v, id: ytId(v.youtubeUrl ?? "") })).filter((v) => v.id);
  const price = (config = "") => priceLink(s, p, lang, city, config);

  // Section content, keyed like projectPage.sections. null = hide.
  const body: Record<string, React.ReactNode> = {
    overview:
      t(p.description, lang) || p.highlights?.length ? (
        <>
          {t(p.description, lang) && <p className="whitespace-pre-line leading-relaxed">{t(p.description, lang)}</p>}
          {!!p.highlights?.length && (
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {p.highlights.map((h, i) => <li key={i} className="flex gap-2"><span className="text-brand">✓</span>{t(h, lang)}</li>)}
            </ul>
          )}
        </>
      ) : null,
    floorPlans: p.configs?.length ? (
      <div className="grid gap-3 sm:grid-cols-2">
        {p.configs.map((c, i) => (
          <Card key={i} className="p-3 lg:p-4">
            {c.floorPlan && (
              <div className="relative mb-2 aspect-[4/3] overflow-hidden rounded-lg bg-bg">
                <Img src={c.floorPlan} alt={`${t(c.label, lang)} floor plan`} fill sizes="(min-width:640px) 50vw, 100vw" className="object-contain" />
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-bold lg:text-lg">{t(c.label, lang)}</p>
                {c.sizeSqft && <p className="text-xs text-muted lg:text-sm">{c.sizeSqft} {dict.project.size}</p>}
              </div>
              <ButtonLink href={price(t(c.label, lang))} external variant="wa">
                <WaIcon className="size-4" /> {dict.card.price}
              </ButtonLink>
            </div>
          </Card>
        ))}
      </div>
    ) : null,
    videos: ytVideos.length ? (
      <div className="grid gap-3 sm:grid-cols-2">
        {ytVideos.map((v) => (
          <figure key={v.id}>
            <LiteYouTube id={v.id} title={t(v.title, lang) || t(p.name, lang)} />
            {t(v.title, lang) && <figcaption className="mt-1 text-sm">{t(v.title, lang)}</figcaption>}
          </figure>
        ))}
      </div>
    ) : null,
    documents: p.documents?.length ? (
      <ul className="grid gap-2 sm:grid-cols-2">
        {p.documents.map((d, i) => (
          <li key={i}>
            <Card href={media(d.pdfUrl) || "#"} external className="flex items-center justify-between gap-3 px-4 py-3">
              <span>📄 {t(d.title, lang)}</span> <span className="text-sm font-medium text-brand">{dict.project.download} ↓</span>
            </Card>
          </li>
        ))}
      </ul>
    ) : null,
    amenities: p.amenities?.length ? (
      <ul className="flex flex-wrap gap-2">
        {p.amenities.map((a, i) => <li key={i} className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm">{t(a, lang)}</li>)}
      </ul>
    ) : null,
    location: (
      <div className="grid gap-3">
        <MapPreview
          lat={p.geo?.lat}
          lng={p.geo?.lng}
          query={[t(p.address, lang) || t(p.name, lang), t(p.locality, lang), city].filter(Boolean).join(", ")}
          address={[t(p.address, lang), t(p.locality, lang), city].filter(Boolean).join(", ")}
          title={`${t(p.name, lang)} map`}
          openLabel={dict.project.openMap}
        />
        {!!p.nearby?.length && (
          <div>
            <h3 className="mb-1 font-bold">{dict.project.nearby}</h3>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {p.nearby.map((n, i) => <li key={i} className="flex justify-between border-b border-line py-1"><span>{t(n.name, lang)}</span><span className="text-muted">{n.distance}</span></li>)}
            </ul>
          </div>
        )}
      </div>
    ),
    similar: similar.length ? <Row>{similar.map((x) => <ProjectCard key={x._id} p={x} ctx={ctx} lang={lang} dict={dict} inRow />)}</Row> : null,
  };

  // Order/titles/visibility come from Project page settings; any section not listed there still shows (default order + title)
  type Key = (typeof PROJECT_SECTIONS)[number];
  const sections = withAllSections(page?.sections ?? [])
    .map((sec) => ({ key: sec.key as Key, visible: sec.visible, title: "title" in sec ? sec.title : undefined }))
    .filter((sec) => sec.visible && !p.hiddenSections?.includes(sec.key) && body[sec.key])
    .map((sec) => ({ key: sec.key, title: t(p.sectionTitles?.[sec.key], lang) || t(sec.title, lang) || dict.sections[sec.key] }));

  const crumbs = [
    { name: dict.nav.home, href: `/${lang}` },
    ...(loc ? [{ name: city, href: `/${lang}/locations/${loc.slug}` }] : []),
    { name: t(p.name, lang) },
  ];
  const url = `${siteUrl}/${lang}/projects/${p.slug}`;
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "Residence",
      name: t(p.name, lang),
      description: t(p.shortDesc, lang) || t(p.description, lang),
      url,
      image: p.images?.map((i) => media(i.url)),
      address: { "@type": "PostalAddress", streetAddress: t(p.address, lang), addressLocality: t(p.locality, lang), addressRegion: city, addressCountry: "IN" },
      ...(p.geo?.lat ? { geo: { "@type": "GeoCoordinates", latitude: p.geo.lat, longitude: p.geo.lng } } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.href ? siteUrl + c.href : url })),
    },
    ...ytVideos.map((v) => ({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: t(v.title, lang) || t(p.name, lang),
      description: t(p.shortDesc, lang) || t(p.name, lang),
      thumbnailUrl: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${v.id}`,
      contentUrl: `https://www.youtube.com/watch?v=${v.id}`,
      uploadDate: p.createdAt,
    })),
  ];

  return (
    <article className="mx-auto max-w-6xl px-4 py-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <TrackView slug={p.slug} />
      {/* swipe gallery: native scroll-snap, no JS */}
      {!!p.images?.length && (
        <div className="-mx-4 mb-4 flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] sm:mx-0 sm:rounded-2xl">
          {p.images.map((img, i) => (
            <div key={i} className="relative aspect-[4/3] w-full shrink-0 snap-center sm:aspect-[16/9]">
              <Img src={img.url ?? ""} alt={t(img.alt, lang) || `${t(p.name, lang)} ${i + 1}`} fill sizes="(min-width:1024px) 1024px, 100vw" className="object-cover" preload={i === 0} fetchPriority={i === 0 ? "high" : "low"} loading={i === 0 ? "eager" : "lazy"} />
              <span className="absolute bottom-2 right-2 rounded bg-badge px-1.5 text-xs text-badge-ink">{i + 1}/{p.images!.length}</span>
            </div>
          ))}
        </div>
      )}
      <Breadcrumb items={crumbs} />
      {t(p.badge, lang) && <Badge className="mb-2">{t(p.badge, lang)}</Badge>}
      <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">{t(p.name, lang)}</h1>
      <p className="text-muted lg:text-lg">{[t(p.locality, lang), city].filter(Boolean).join(", ")}</p>

      {!!p.facts?.length && (
        <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
          {p.facts.map((f, i) => (
            <Card key={i} className="p-3 lg:p-4">
              <dt className="text-xs text-muted lg:text-sm">{t(f.label, lang)}</dt>
              <dd className="font-bold lg:text-lg">{t(f.value, lang)}</dd>
            </Card>
          ))}
        </dl>
      )}

      {sections.map((sec) => (
        <section key={sec.key} id={sec.key} className="mt-8">
          {sec.title && <h2 className="mb-4 text-xl font-bold lg:text-2xl">{sec.title}</h2>}
          {body[sec.key]}
        </section>
      ))}

      {/* sticky phone bar */}
      <div className="sticky-bar fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-2 border-t border-line bg-surface p-2 sm:hidden">
        <ButtonLink href={price()} external variant="wa" size="lg">
          <WaIcon /> WhatsApp
        </ButtonLink>
        {s?.phone && (
          <ButtonLink href={`tel:${s.phone.replace(/\s/g, "")}`} variant="outline" size="lg">
            📞 {dict.contact.call}
          </ButtonLink>
        )}
      </div>
    </article>
  );
}
