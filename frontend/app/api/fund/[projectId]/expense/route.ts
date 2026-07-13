import { NextResponse } from "next/server";
import {
  rateLimit,
  jsonError,
  sanitizeApiString,
} from "@/server/middleware/apiSecurity";
import {
  getProjectFund,
  recordMiscExpense,
  recordPurchaseExpense,
} from "@/server/services/treasuryService";
import type { MiscellaneousRecord, PurchaseRecord } from "@/types/finance";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { projectId } = await params;

  try {
    const body = await request.json();
    const fund = getProjectFund(projectId);

    if (body.type === "purchase") {
      const data = body.data as PurchaseRecord;
      const total = Number(data.total);
      if (!Number.isFinite(total) || total <= 0) {
        return jsonError("Invalid purchase amount");
      }
      if (total > fund.currentBalance) {
        return jsonError("رصيد العهدة غير كافٍ");
      }

      const purchase: PurchaseRecord = {
        id: data.id || `p-${Date.now()}`,
        projectId,
        name: sanitizeApiString(data.name, 200),
        quantity: Number(data.quantity) || 1,
        unit: sanitizeApiString(data.unit, 50),
        price: Number(data.price) || 0,
        total,
        date: data.date || new Date().toISOString().split("T")[0],
        supplier: sanitizeApiString(data.supplier || "", 200),
        notes: sanitizeApiString(data.notes || "", 500),
      };

      const saved = recordPurchaseExpense(purchase);
      return NextResponse.json(
        { purchase: saved, fund: getProjectFund(projectId) },
        { status: 201 }
      );
    }

    if (body.type === "miscellaneous") {
      const data = body.data as MiscellaneousRecord;
      const amount = Number(data.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return jsonError("Invalid amount");
      }
      if (amount > fund.currentBalance) {
        return jsonError("رصيد العهدة غير كافٍ");
      }

      const item: MiscellaneousRecord = {
        id: data.id || `m-${Date.now()}`,
        projectId,
        description: sanitizeApiString(data.description, 300),
        amount,
        category: sanitizeApiString(data.category, 50),
        date: data.date || new Date().toISOString().split("T")[0],
        notes: sanitizeApiString(data.notes || "", 500),
        createdBy: sanitizeApiString(data.createdBy, 100),
      };

      const saved = recordMiscExpense(item);
      return NextResponse.json(
        { item: saved, fund: getProjectFund(projectId) },
        { status: 201 }
      );
    }

    return jsonError("Unknown expense type");
  } catch {
    return jsonError("Invalid request body");
  }
}
