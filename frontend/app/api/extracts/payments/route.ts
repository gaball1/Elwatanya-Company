import { NextResponse } from "next/server";
import { rateLimit } from "@/server/middleware/apiSecurity";
import { getPaymentsStore } from "@/server/store/dataStore";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const buildingId = searchParams.get("buildingId");
  const contractorId = searchParams.get("contractorId");

  if (!buildingId || !contractorId) {
    return NextResponse.json(
      { error: "buildingId and contractorId are required" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    payments: getPaymentsStore(buildingId, contractorId),
  });
}
