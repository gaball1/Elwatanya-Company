import { redirect } from "next/navigation";

export default async function BuildingDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; buildingId: string }>;
}) {
  const { locale, id, buildingId } = await params;
  redirect(`/${locale}/projects/${id}/buildings/${buildingId}/estimates`);
}
