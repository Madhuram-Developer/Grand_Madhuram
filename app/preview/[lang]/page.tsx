import { notFound } from "next/navigation";
import Landing from "@/components/sections/Landing";
import { requirePerm } from "@/lib/auth";
import { getDraftLanding } from "@/lib/data";
import { hasLang } from "@/lib/i18n";

/** Draft landing for the admin editor iframe. Auth required, never cached, noindex (layout). */
export default async function Preview({ params }: PageProps<"/preview/[lang]">) {
  const { lang } = await params;
  if (!hasLang(lang)) notFound();
  await requirePerm("landing");
  return <Landing sections={await getDraftLanding()} lang={lang} />;
}
