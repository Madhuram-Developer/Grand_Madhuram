import { LegalPage, legalMetadata } from "@/components/Legal";

export const generateMetadata = async ({ params }: PageProps<"/[lang]/cookies">) => legalMetadata("cookies", (await params).lang);

export default async function Page({ params }: PageProps<"/[lang]/cookies">) {
  return <LegalPage kind="cookies" lang={(await params).lang} />;
}
