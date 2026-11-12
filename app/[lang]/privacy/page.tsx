import { LegalPage, legalMetadata } from "@/components/Legal";

export const generateMetadata = async ({ params }: PageProps<"/[lang]/privacy">) => legalMetadata("privacy", (await params).lang);

export default async function Page({ params }: PageProps<"/[lang]/privacy">) {
  return <LegalPage kind="privacy" lang={(await params).lang} />;
}
