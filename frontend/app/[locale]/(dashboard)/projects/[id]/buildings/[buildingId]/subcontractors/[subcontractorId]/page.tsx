import { redirect } from "next/navigation";

export default async function SubcontractorPage({
  params,
}: {
  params: Promise<{
    locale: string;
    id: string;
    buildingId: string;
    subcontractorId: string;
  }>;
}) {
  const { locale, id, buildingId, subcontractorId } = await params;
  redirect(
    `/${locale}/projects/${id}/buildings/${buildingId}/subcontractors/${subcontractorId}/estimate`
  );
}
