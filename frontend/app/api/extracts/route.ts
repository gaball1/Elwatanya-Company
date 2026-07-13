import { NextResponse } from "next/server";
import {
  rateLimit,
  jsonError,
  sanitizeApiString,
} from "@/server/middleware/apiSecurity";
import {
  createOrUpdateExtract,
  getPreviousPaidForNewExtract,
  listExtracts,
} from "@/server/services/extractService";
import {
  getPreviousQuantitiesStore,
  nextRunningNumberStore,
} from "@/server/store/dataStore";
import type { ContractorExtract } from "@/types/boq";

export async function GET(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const buildingId = searchParams.get("buildingId");
  const contractorId = searchParams.get("contractorId");
  const meta = searchParams.get("meta");

  if (!buildingId || !contractorId) {
    return jsonError("buildingId and contractorId are required");
  }

  if (meta === "1") {
    const runningNumber = Number(searchParams.get("runningNumber") || "1");
    return NextResponse.json({
      previousPaid: getPreviousPaidForNewExtract(
        buildingId,
        contractorId,
        "running",
        runningNumber
      ),
      previousQuantities: getPreviousQuantitiesStore(
        buildingId,
        contractorId,
        runningNumber
      ),
      nextRunningNumber: nextRunningNumberStore(buildingId, contractorId),
    });
  }

  return NextResponse.json({
    extracts: listExtracts(buildingId, contractorId),
  });
}

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const extract = body as ContractorExtract;
    const manualDeductions = (body.manualDeductions || []).map(
      (d: { id?: string; name: string; amount: number; percent?: number }) => ({
        id: d.id || `ded-${Date.now()}`,
        name: sanitizeApiString(d.name, 200),
        amount: Number(d.amount) || 0,
        percent: d.percent,
        type: "manual" as const,
      })
    );

    if (
      !extract.buildingId ||
      !extract.contractorId ||
      !extract.projectId ||
      !extract.items?.length
    ) {
      return jsonError("Invalid extract payload");
    }

    extract.label = sanitizeApiString(extract.label, 100);
    const saved = createOrUpdateExtract(extract, manualDeductions);
    return NextResponse.json({ extract: saved }, { status: 201 });
  } catch {
    return jsonError("Invalid request body");
  }
}
