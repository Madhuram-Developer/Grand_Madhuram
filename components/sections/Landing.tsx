import Link from "next/link";
import { EnquiryForm, Filter, SearchBar } from "@/components/client";
import { ButtonLink, Card, Pill } from "@/components/kit";
import { Img, MapPreview, ProjectCard, Row, SectionTitle, WaIcon } from "@/components/ui";
import { collectionProjects, getCtx, getProjects, getTestimonials, getLiveLanding } from "@/lib/data";
import { getDictionary, t, type L, type Lang } from "@/lib/i18n";
import { toSlim } from "@/lib/filter";
import { waLink } from "@/lib/site";
import TrustCarousel, { type Slide } from "./TrustCarousel";

type Section = Awaited<ReturnType<typeof getLiveLanding>>[number];
type RawSlide = { image?: string; alt?: L; headline?: L; subline?: L; link?: string }; // headline/subline: legacy per-slide text

/** Renders landing sections (live or draft) in their saved order. */
export default async function Landing({ sections, lang }: { sections: Section[]; lang: Lang }) {
  const dict = getDictionary(lang);
  const [ctx, projects, testimonials] = await Promise.all([getCtx(), getProjects(), getTestimonials()]);
  const { locations, types } = ctx;
  const slim = projects.map(toSlim);
  const withProjects = locations.filter((l) => projects.some((p) => p.location === l._id));

  const render = async (s: Section) => {
    const title = t(s.title, lang);
    const subtitle = t(s.subtitle, lang);
    switch (s.key) {
      case "trust": {
        const raw = (s.items ?? []) as RawSlide[];
        const slides: Slide[] = raw.filter((x) => x.image).map((x) => ({ image: x.image!, alt: t(x.alt, lang), link: x.link }));
        return (
          <TrustCarousel
            slides={slides}
            headline={title || t(raw[0]?.headline, lang)}
            subline={subtitle || t(raw[0]?.subline, lang)}
            stats={(s.stats ?? []).map((x) => ({ value: x.value ?? "", label: t(x.label, lang) }))}
          />
        );
      }
      case "about":
        return (
          <section>
            <SectionTitle as="h1" title={title} subtitle={subtitle} />
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
              <SearchBar lang={lang} dict={dict} />
              <Filter lang={lang} dict={dict} projects={slim} locations={locations} types={types} showBudget={s.variant !== "noBudget"} />
            </div>
          </section>
        );
      case "locations":
        if (!withProjects.length) return null;
        return (
          <section>
            <SectionTitle title={title} subtitle={subtitle} />
            {s.variant === "tiles" ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {withProjects.map((l) => (
                  <Link key={l._id} href={`/${lang}/locations/${l.slug}`} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-line hover:border-brand">
                    {l.image && <Img src={l.image} alt="" fill sizes="(min-width:640px) 25vw, 50vw" className="object-cover" />}
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-badge p-3 font-bold text-badge-ink lg:text-lg">{t(l.name, lang)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <Row>
                {withProjects.map((l) => (
                  <Link key={l._id} href={`/${lang}/locations/${l.slug}`} className="group flex w-20 shrink-0 snap-start flex-col items-center gap-2 sm:w-24 lg:w-28">
                    {/* true circle: aspect-square + rounded-full */}
                    <span className="relative aspect-square w-full overflow-hidden rounded-full border-2 border-brand bg-line transition-colors group-hover:border-accent">
                      {l.image && <Img src={l.image} alt="" fill sizes="112px" className="object-cover" />}
                    </span>
                    <span className="text-center text-xs font-medium group-hover:text-accent lg:text-sm">{t(l.name, lang)}</span>
                  </Link>
                ))}
              </Row>
            )}
          </section>
        );
      case "topProjects": {
        const list = await collectionProjects(s.collectionId);
        if (!list.length) return null;
        return (
          <section>
            <SectionTitle title={title} subtitle={subtitle} />
            {/* grid, not a slider: 2×2 (4) on phones/tablets, 4×2 (8) on desktop */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
              {list.slice(0, 8).map((p, i) => (
                <div key={p._id} className={`flex ${i >= 4 ? "max-lg:hidden" : ""}`}>
                  <ProjectCard p={p} ctx={ctx} lang={lang} dict={dict} heading="h3" />
                </div>
              ))}
            </div>
            <div className="mt-6 text-center lg:mt-8">
              <ButtonLink href={`/${lang}/projects`} variant="outline" size="lg">{dict.card.more} →</ButtonLink>
            </div>
          </section>
        );
      }
      case "types": {
        const tops = types.filter((x) => !x.parent && projects.some((p) => p.types?.includes(x._id)));
        if (!tops.length) return null;
        return (
          <section>
            <SectionTitle title={title} subtitle={subtitle} />
            <div className="grid gap-3 sm:grid-cols-2">
              {tops.map((tp) => (
                <Card key={tp._id} className="p-4 lg:p-5">
                  <Link href={`/${lang}/types/${tp.slug}`} className="font-bold hover:text-accent lg:text-lg">{t(tp.name, lang)} →</Link>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {types.filter((x) => x.parent === tp._id).map((sub) => (
                      <Pill key={sub._id} href={`/${lang}/types/${tp.slug}/${sub.slug}`}>{t(sub.name, lang)}</Pill>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        );
      }
      case "testimonials":
        if (!testimonials.length) return null;
        return (
          <section>
            <SectionTitle title={title} subtitle={subtitle} />
            <Row>
              {testimonials.map((x) => (
                <Card key={x._id} className="w-64 shrink-0 snap-start p-4 lg:w-80 lg:p-5">
                  <figure>
                    {x.rating && <div className="text-accent" aria-label={`${x.rating}/5`}>{"★".repeat(x.rating)}</div>}
                    <blockquote className="mt-1 text-sm lg:text-base">{t(x.text, lang)}</blockquote>
                    <figcaption className="mt-3 flex items-center gap-2 text-sm font-medium">
                      {x.photo && <Img src={x.photo} alt="" width={32} height={32} className="aspect-square rounded-full object-cover" />}
                      {x.name}
                    </figcaption>
                  </figure>
                </Card>
              ))}
            </Row>
          </section>
        );
      case "enquiry":
        return (
          <section>
            <SectionTitle title={title} subtitle={subtitle} />
            <Card className="mx-auto max-w-2xl p-4 sm:p-6">
              <EnquiryForm lang={lang} dict={dict} projects={projects.map((p) => t(p.name, lang))} />
            </Card>
          </section>
        );
      case "contact":
        return <Contact lang={lang} title={title} subtitle={subtitle} />;
    }
  };

  const visible = sections.filter((s) => s.visible);
  const out = await Promise.all(visible.map(render));
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-10 px-4 py-4 lg:gap-16 lg:py-8">
      {out.map((node, k) => node && <div key={visible[k].key} id={visible[k].key}>{node}</div>)}
    </div>
  );
}

export async function Contact({ lang, title, subtitle }: { lang: Lang; title?: string; subtitle?: string }) {
  const dict = getDictionary(lang);
  const { settings: s } = await getCtx();
  if (!s) return null;
  return (
    <section>
      <SectionTitle title={title} subtitle={subtitle} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="grid content-start gap-3 p-4 text-sm lg:p-5 lg:text-base">
          <ButtonLink href={waLink(s.whatsappNumber, t(s.enquiryMsg, lang))} external variant="wa" size="lg" block>
            <WaIcon /> {dict.contact.whatsapp}
          </ButtonLink>
          {s.phone && <ButtonLink href={`tel:${s.phone.replace(/\s/g, "")}`} variant="ghost" size="lg" block>📞 {s.phone}</ButtonLink>}
          {s.email && <ButtonLink href={`mailto:${s.email}`} variant="ghost" size="lg" block>✉️ {s.email}</ButtonLink>}
          {t(s.hours, lang) && <p className="text-center text-xs text-muted lg:text-sm">{t(s.hours, lang)}</p>}
        </Card>
        {t(s.address, lang) && (
          <MapPreview lat={s.geo?.lat} lng={s.geo?.lng} query={t(s.address, lang)} address={t(s.address, lang)} title="Madhuram office map" openLabel={getDictionary(lang).project.openMap} />
        )}
      </div>
    </section>
  );
}
