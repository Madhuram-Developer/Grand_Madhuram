import Link from "next/link";
import { Filter, SearchBar } from "@/components/client";
import { Img, ProjectCard, Row, SectionTitle, WaIcon } from "@/components/ui";
import { collectionProjects, getCtx, getProjects, getTestimonials, getLiveLanding } from "@/lib/data";
import { getDictionary, t, type L, type Lang } from "@/lib/i18n";
import { toSlim } from "@/lib/filter";
import { waLink } from "@/lib/site";
import TrustCarousel, { type Slide } from "./TrustCarousel";

type Section = Awaited<ReturnType<typeof getLiveLanding>>[number];
type RawSlide = { image?: string; alt?: L; headline?: L; subline?: L; link?: string };

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
        const slides: Slide[] = ((s.items ?? []) as RawSlide[]).filter((x) => x.image).map((x) => ({
          image: x.image!, alt: t(x.alt, lang), headline: t(x.headline, lang), subline: t(x.subline, lang), link: x.link,
        }));
        return <TrustCarousel slides={slides} stats={(s.stats ?? []).map((x) => ({ value: x.value ?? "", label: t(x.label, lang) }))} />;
      }
      case "about":
        return (
          <section>
            {title && <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>}
            {subtitle && <p className="mb-4 mt-1 text-muted">{subtitle}</p>}
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
                  <Link key={l._id} href={`/${lang}/locations/${l.slug}`} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-line">
                    {l.image && <Img src={l.image} alt="" fill sizes="(min-width:640px) 25vw, 50vw" className="object-cover" />}
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-badge p-2 font-bold text-badge-ink">{t(l.name, lang)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <Row>
                {withProjects.map((l) => (
                  <Link key={l._id} href={`/${lang}/locations/${l.slug}`} className="flex w-20 shrink-0 snap-start flex-col items-center gap-1 sm:w-24">
                    {/* true circle: aspect-square + rounded-full */}
                    <span className="relative aspect-square w-full overflow-hidden rounded-full border-2 border-accent bg-line">
                      {l.image && <Img src={l.image} alt="" fill sizes="96px" className="object-cover" />}
                    </span>
                    <span className="text-center text-xs font-medium">{t(l.name, lang)}</span>
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
            <Row>{list.map((p) => <ProjectCard key={p._id} p={p} ctx={ctx} lang={lang} dict={dict} inRow />)}</Row>
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
                <div key={tp._id} className="rounded-xl border border-line bg-surface p-3">
                  <Link href={`/${lang}/types/${tp.slug}`} className="font-bold">{t(tp.name, lang)}</Link>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {types.filter((x) => x.parent === tp._id).map((sub) => (
                      <Link key={sub._id} href={`/${lang}/types/${tp.slug}/${sub.slug}`} className="rounded-full bg-bg px-3 py-1 text-sm">
                        {t(sub.name, lang)}
                      </Link>
                    ))}
                  </div>
                </div>
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
                <figure key={x._id} className="w-64 shrink-0 snap-start rounded-xl border border-line bg-surface p-4">
                  {x.rating && <div className="text-accent" aria-label={`${x.rating}/5`}>{"★".repeat(x.rating)}</div>}
                  <blockquote className="mt-1 text-sm">{t(x.text, lang)}</blockquote>
                  <figcaption className="mt-3 flex items-center gap-2 text-sm font-medium">
                    {x.photo && <Img src={x.photo} alt="" width={32} height={32} className="aspect-square rounded-full object-cover" />}
                    {x.name}
                  </figcaption>
                </figure>
              ))}
            </Row>
          </section>
        );
      case "contact":
        return <Contact lang={lang} title={title} subtitle={subtitle} />;
    }
  };

  const visible = sections.filter((s) => s.visible);
  const out = await Promise.all(visible.map(render));
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-10 px-4 py-4">
      {out.map((node, k) => node && <div key={visible[k].key} id={visible[k].key}>{node}</div>)}
    </div>
  );
}

export async function Contact({ lang, title, subtitle }: { lang: Lang; title?: string; subtitle?: string }) {
  const dict = getDictionary(lang);
  const { settings: s } = await getCtx();
  if (!s) return null;
  const maps = s.geo?.lat ? `https://www.google.com/maps/search/?api=1&query=${s.geo.lat},${s.geo.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t(s.address, lang))}`;
  return (
    <section>
      <SectionTitle title={title} subtitle={subtitle} />
      <div className="grid gap-3 rounded-xl border border-line bg-surface p-4 text-sm sm:grid-cols-2">
        <a href={waLink(s.whatsappNumber, t(s.enquiryMsg, lang))} target="_blank" rel="noopener" className="flex items-center justify-center gap-2 rounded-lg bg-wa px-4 py-3 font-medium text-wa-ink sm:col-span-2">
          <WaIcon /> {dict.contact.whatsapp}
        </a>
        {s.phone && <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="rounded-lg border border-line px-4 py-3">📞 {s.phone}</a>}
        {s.email && <a href={`mailto:${s.email}`} className="rounded-lg border border-line px-4 py-3">✉️ {s.email}</a>}
        {t(s.address, lang) && (
          <a href={maps} target="_blank" rel="noopener" className="rounded-lg border border-line px-4 py-3 sm:col-span-2">
            📍 {t(s.address, lang)} {t(s.hours, lang) && <span className="block text-xs text-muted">{t(s.hours, lang)}</span>}
          </a>
        )}
      </div>
    </section>
  );
}
