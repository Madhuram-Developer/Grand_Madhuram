import type { Metadata } from "next";
import { Suspense } from "react";
import { Html, SiteChrome } from "@/components/Chrome";
import { hasLang } from "@/lib/i18n";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "hi" }];
}

export default async function PreviewLayout({ children, params }: LayoutProps<"/preview/[lang]">) {
  const { lang } = await params;
  const l = hasLang(lang) ? lang : "en";
  return (
    <Html lang={l}>
      <SiteChrome lang={l}>
        <Suspense fallback={<p className="p-4 text-sm text-muted">Loading preview…</p>}>{children}</Suspense>
      </SiteChrome>
    </Html>
  );
}
