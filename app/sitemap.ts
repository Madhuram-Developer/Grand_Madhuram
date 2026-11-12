import type { MetadataRoute } from "next";
import { getLocations, getProjects, getTypes } from "@/lib/data";
import { langs } from "@/lib/i18n";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, locations, types] = await Promise.all([getProjects(), getLocations(), getTypes()]);
  const used = (id: string) => projects.some((p) => p.location === id || p.types?.includes(id));
  const paths: { path: string; lastModified?: string }[] = [
    { path: "" },
    { path: "/projects" },
    { path: "/privacy" },
    { path: "/cookies" },
    ...projects.map((p) => ({ path: `/projects/${p.slug}`, lastModified: p.updatedAt })),
    ...locations.filter((l) => used(l._id)).map((l) => ({ path: `/locations/${l.slug}` })), // empty locations excluded
    ...types.filter((x) => used(x._id)).map((x) => {
      const parent = types.find((p) => p._id === x.parent);
      return { path: `/types/${parent ? `${parent.slug}/` : ""}${x.slug}` };
    }),
  ];
  return paths.flatMap(({ path, lastModified }) =>
    langs.map((lang) => ({
      url: `${siteUrl}/${lang}${path}`,
      lastModified,
      alternates: { languages: Object.fromEntries(langs.map((l) => [l, `${siteUrl}/${l}${path}`])) },
    })),
  );
}
