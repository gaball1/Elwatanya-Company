import { NextResponse } from "next/server";
import {
  rateLimit,
  jsonError,
  assertPositiveNumber,
  sanitizeApiString,
} from "@/server/middleware/apiSecurity";
import {
  addTreasuryAdjustment,
  getProjectTreasury,
} from "@/server/services/treasuryService";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  return NextResponse.json(getProjectTreasury(projectId));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { projectId } = await params;

  try {
    const body = await request.json();
    const amount = assertPositiveNumber(body.amount, "amount");
    if (amount === null) return jsonError("Invalid amount");

    const description =
      sanitizeApiString(body.description, 300) ||
      "إضافة رصيد للخزنة";

    const transaction = addTreasuryAdjustment(projectId, amount, description);
    return NextResponse.json({ transaction }, { status: 201 });
  } catch {
    return jsonError("Invalid request body");
  }
}
