import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Landing from "@/components/sections/Landing";
import { getLiveLanding, getSettings } from "@/lib/data";
import { hasLang, t } from "@/lib/i18n";
import { alternates, jsonLd, siteUrl } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLang(lang)) return {};
  const s = await getSettings();
  return { title: { absolute: t(s?.defaultSeo?.title, lang) || "Madhuram" }, alternates: alternates(lang) };
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLang(lang)) notFound();
  const [sections, s] = await Promise.all([getLiveLanding(), getSettings()]);
  const org = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: "Madhuram",
    url: `${siteUrl}/${lang}`,
    logo: `${siteUrl}/logo.png`,
    image: `${siteUrl}/logo.png`,
    telephone: s?.phone,
    email: s?.email,
    address: t(s?.address, lang),
    ...(s?.geo?.lat ? { geo: { "@type": "GeoCoordinates", latitude: s.geo.lat, longitude: s.geo.lng } } : {}),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(org)} />
      <Landing sections={sections} lang={lang} />
    </>
  );
}
