import { NextResponse } from "next/server";
import {
  rateLimit,
  jsonError,
  assertPositiveNumber,
  sanitizeApiString,
} from "@/server/middleware/apiSecurity";
import {
  addFundBalance,
  getProjectFund,
  initProjectFund,
  recordMiscExpense,
  recordPurchaseExpense,
} from "@/server/services/treasuryService";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  let fund = getProjectFund(projectId);
  if (!fund.transactions.length) {
    fund = initProjectFund(projectId, 0);
  }
  return NextResponse.json({ fund });
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
      sanitizeApiString(body.description, 300) || "إضافة عهدة";

    const fund = addFundBalance(projectId, amount, description);
    return NextResponse.json({ fund }, { status: 201 });
  } catch {
    return jsonError("Invalid request body");
  }
}
