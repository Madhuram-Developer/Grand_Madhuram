import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Html, SiteChrome } from "@/components/Chrome";
import { getSettings } from "@/lib/data";
import { hasLang, langs, t } from "@/lib/i18n";
import { siteUrl } from "@/lib/site";

export function generateStaticParams() {
  return langs.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLang(lang)) return {};
  const seo = (await getSettings())?.defaultSeo;
  const title = t(seo?.title, lang) || "Madhuram";
  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s · Madhuram` },
    description: t(seo?.description, lang),
    openGraph: { siteName: "Madhuram Developer", locale: lang === "hi" ? "hi_IN" : "en_IN", type: "website", images: [{ url: "/logo.png", width: 633, height: 422, alt: "Madhuram Developer" }] },
  };
}

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLang(lang)) notFound();
  return (
    <Html lang={lang}>
      <SiteChrome lang={lang}>{children}</SiteChrome>
    </Html>
  );
}
