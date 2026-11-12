import { Mukta } from "next/font/google";
import Link from "next/link";
import { LangSwitch, MobileMenu, NavLink, NavLinks } from "@/components/client";
import { ButtonLink } from "@/components/kit";
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
    <html lang={lang} data-scroll-behavior="smooth" className={`${body.variable} antialiased`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}

const Logo = ({ src }: { src?: string | null }) =>
  src ? <Img src={src} alt="Madhuram" width={140} height={40} className="h-9 w-auto lg:h-10" /> : <span className="text-lg font-bold uppercase tracking-[0.3em] text-brand lg:text-xl">Madhuram</span>;

/** Public header + footer + floating WhatsApp. */
export async function SiteChrome({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const dict = getDictionary(lang);
  const s = await getSettings();
  const wa = waLink(s?.whatsappNumber, t(s?.enquiryMsg, lang));
  const items = [
    { href: `/${lang}`, label: dict.nav.home },
    { href: `/${lang}/projects`, label: dict.nav.projects },
    { href: `/${lang}#locations`, label: dict.nav.locations },
    { href: `/${lang}#contact`, label: dict.nav.contact },
  ];
  const socials = Object.entries((s?.socials ?? {}) as Record<string, string>).filter(([, url]) => url);
  const tel = s?.phone?.replace(/\s/g, "");
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg [.menu-open_&]:z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 lg:h-20">
          <Link href={`/${lang}`} aria-label={dict.nav.home} className="shrink-0">
            <Logo src={s?.logo} />
          </Link>
          <nav aria-label="Main" className="ml-auto hidden items-center md:flex">
            <NavLinks items={items} />
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-4">
            <LangSwitch lang={lang} label={dict.nav.switchLang} />
            {s?.whatsappNumber && (
              <ButtonLink href={wa} external variant="wa" size="sm" className="max-sm:hidden lg:h-10 lg:px-4 lg:text-sm">
                <WaIcon className="size-4" /> WhatsApp
              </ButtonLink>
            )}
            <MobileMenu items={items} label={dict.nav.menu}>
              {s?.whatsappNumber && <ButtonLink href={wa} external variant="wa" size="lg" block><WaIcon /> {dict.contact.whatsapp}</ButtonLink>}
              {tel && <ButtonLink href={`tel:${tel}`} variant="outline" size="lg" block>📞 {s?.phone}</ButtonLink>}
            </MobileMenu>
          </div>
        </div>
      </header>
      <main className="pb-24">{children}</main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-3 lg:text-base">
          <div className="grid content-start gap-2">
            <Logo src={s?.logo} />
            {t(s?.address, lang) && <p className="text-muted">{t(s?.address, lang)}</p>}
            {t(s?.hours, lang) && <p className="text-xs text-muted lg:text-sm">{t(s?.hours, lang)}</p>}
          </div>
          <nav aria-label="Footer" className="grid content-start gap-2">
            {items.map((it) => <NavLink key={it.href} href={it.href} className="text-muted hover:text-accent">{it.label}</NavLink>)}
          </nav>
          <div className="grid content-start gap-2">
            {tel && <a href={`tel:${tel}`} className="hover:text-accent">📞 {s?.phone}</a>}
            {s?.email && <a href={`mailto:${s.email}`} className="hover:text-accent">✉️ {s.email}</a>}
            {socials.length > 0 && (
              <>
                <p className="mt-2 text-xs uppercase tracking-wider text-muted">{dict.nav.follow}</p>
                <div className="flex flex-wrap gap-2">
                  {socials.map(([k, url]) => <ButtonLink key={k} href={url} external variant="ghost" size="sm" className="capitalize">{k}</ButtonLink>)}
                </div>
              </>
            )}
          </div>
        </div>
        <p className="border-t border-line py-4 text-center text-xs text-muted">© Madhuram</p>
      </footer>
      {s?.whatsappNumber && (
        <a href={wa} target="_blank" rel="noopener" aria-label={dict.contact.whatsapp}
          className="fixed bottom-4 right-4 z-40 grid size-14 place-items-center rounded-full bg-wa text-wa-ink shadow-lg transition-transform hover:scale-105 max-sm:[body:has(.sticky-bar)_&]:hidden">
          <WaIcon className="size-7" />
        </a>
      )}
    </>
  );
}
