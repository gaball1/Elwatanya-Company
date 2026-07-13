import { NextResponse } from "next/server";
import {
  rateLimit,
  jsonError,
} from "@/server/middleware/apiSecurity";
import { deleteExtractService } from "@/server/services/extractService";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ extractId: string }> }
) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { extractId } = await params;
  const { searchParams } = new URL(request.url);
  const buildingId = searchParams.get("buildingId");
  const contractorId = searchParams.get("contractorId");
  const projectId = searchParams.get("projectId");

  if (!buildingId || !contractorId || !projectId) {
    return jsonError("buildingId, contractorId, projectId are required");
  }

  deleteExtractService(buildingId, contractorId, extractId, projectId);
  return NextResponse.json({ success: true });
}
