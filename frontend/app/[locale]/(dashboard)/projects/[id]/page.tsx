import { redirect } from "next/navigation";

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  redirect(`/${locale}/projects/${id}/buildings`);
}
