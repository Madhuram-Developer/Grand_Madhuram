import { Mukta } from "next/font/google";
import Link from "next/link";
import { LangSwitch } from "@/components/client";
import { Img, WaIcon } from "@/components/ui";
import { getSettings } from "@/lib/data";
import { getDictionary, t, type Lang } from "@/lib/i18n";
import { waLink } from "@/lib/site";
import "@/app/globals.css";

// Mukta covers Latin + Devanagari in one family
// preload off: unicode-range means Devanagari files only download on pages that use them
const body = Mukta({ variable: "--font-body", subsets: ["latin", "devanagari"], weight: ["400", "700"], display: "swap", preload: false });

/** <html>/<body> shell shared by every root layout (site, preview, admin). */
export function Html({ lang, children }: { lang: string; children: React.ReactNode }) {
  return (
    <html lang={lang} className={`${body.variable} antialiased`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}

/** Public header + footer + floating WhatsApp. */
export async function SiteChrome({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const dict = getDictionary(lang);
  const s = await getSettings();
  const wa = waLink(s?.whatsappNumber, t(s?.enquiryMsg, lang));
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href={`/${lang}`} className="flex items-center gap-2 text-lg font-bold text-brand">
            {s?.logo ? <Img src={s.logo} alt="Madhuram" width={120} height={36} className="h-9 w-auto" /> : "Madhuram"}
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href={`/${lang}/projects`}>{dict.nav.projects}</Link>
            <LangSwitch lang={lang} label={dict.nav.switchLang} />
          </nav>
        </div>
      </header>
      <main className="pb-24">{children}</main>
      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        © Madhuram · {t(s?.address, lang)}
      </footer>
      {s?.whatsappNumber && (
        <a href={wa} target="_blank" rel="noopener" aria-label={dict.contact.whatsapp}
          className="fixed bottom-4 right-4 z-40 grid size-14 place-items-center rounded-full bg-wa text-wa-ink shadow-lg max-sm:[body:has(.sticky-bar)_&]:hidden">
          <WaIcon className="size-7" />
        </a>
      )}
    </>
  );
}
