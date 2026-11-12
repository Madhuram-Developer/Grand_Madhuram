import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Browse } from "@/components/Browse";
import { Breadcrumb } from "@/components/ui";
import { getProjects } from "@/lib/data";
import { getDictionary, hasLang } from "@/lib/i18n";
import { alternates } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/projects">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLang(lang)) return {};
  return { title: getDictionary(lang).nav.projects, alternates: alternates(lang, "/projects") };
}

export default async function ProjectsPage({ params, searchParams }: PageProps<"/[lang]/projects">) {
  const { lang } = await params;
  if (!hasLang(lang)) notFound();
  const dict = getDictionary(lang);
  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      <Breadcrumb items={[{ name: dict.nav.home, href: `/${lang}` }, { name: dict.nav.projects }]} />
      <h1 className="mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">{dict.nav.projects}</h1>
      <Browse lang={lang} list={await getProjects()} sp={searchParams} path={`/${lang}/projects`} filter />
    </div>
  );
}
