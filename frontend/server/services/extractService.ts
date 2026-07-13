import type { ContractorExtract, ContractorPayment } from "@/types/boq";
import type { ExtractDeduction } from "@/types/finance";
import {
  buildInsuranceDeduction,
  buildPreviousPaidDeduction,
  calcNetPayable,
  mergeDeductions,
  sumDeductions,
  sumWorkValue,
} from "@/server/lib/calculations";
import {
  deleteExtractStore,
  deletePaymentByExtractStore,
  getExtractByIdStore,
  getExtractsStore,
  getPreviousQuantitiesStore,
  nextRunningNumberStore,
  removeTreasuryBySourceStore,
  saveExtractStore,
  savePaymentStore,
  upsertTreasuryBySourceStore,
  getPreviousPaidStore,
} from "@/server/store/dataStore";

export function computeExtractTotals(
  items: ContractorExtract["items"],
  insurancePercent: number,
  manualDeductions: ExtractDeduction[],
  previousPaid: number,
  isArabic = true
) {
  const totalWorkValue = sumWorkValue(items);
  const insurance = buildInsuranceDeduction(
    totalWorkValue,
    insurancePercent,
    isArabic
  );
  const prevRow = buildPreviousPaidDeduction(previousPaid, isArabic);
  const deductions = mergeDeductions(manualDeductions, insurance, prevRow);
  const totalDeductions = sumDeductions(deductions);
  const netPayable = calcNetPayable(totalWorkValue, deductions);

  return {
    totalWorkValue,
    previousPaid,
    totalDeductions,
    netPayable,
    deductions,
  };
}

export function getPreviousPaidForNewExtract(
  buildingId: string,
  contractorId: string,
  status: ContractorExtract["status"],
  runningNumber?: number,
  excludeExtractId?: string
): number {
  const list = getExtractsStore(buildingId, contractorId).filter(
    (e) => e.id !== excludeExtractId
  );

  if (status === "final") {
    return list.reduce((sum, e) => sum + e.netPayable, 0);
  }

  return list
    .filter((e) => {
      if (e.status !== "running") return false;
      if (!runningNumber) return true;
      return (e.runningNumber || 0) < runningNumber;
    })
    .reduce((sum, e) => sum + e.netPayable, 0);
}

export function listExtracts(buildingId: string, contractorId: string) {
  return getExtractsStore(buildingId, contractorId).sort((a, b) =>
    b.date.localeCompare(a.date)
  );
}

export function getExtract(
  buildingId: string,
  contractorId: string,
  extractId: string
) {
  return getExtractByIdStore(buildingId, contractorId, extractId);
}

export function createOrUpdateExtract(
  input: ContractorExtract,
  manualDeductions: ExtractDeduction[]
): ContractorExtract {
  const previousPaid = getPreviousPaidForNewExtract(
    input.buildingId,
    input.contractorId,
    input.status,
    input.runningNumber,
    input.id
  );

  const totals = computeExtractTotals(
    input.items,
    input.insurancePercent,
    manualDeductions.filter((d) => d.type === "manual"),
    previousPaid
  );

  const extract: ContractorExtract = {
    ...input,
    ...totals,
    deductions: totals.deductions,
  };

  saveExtractStore(extract);
  syncPaymentAndTreasury(extract);
  return extract;
}

function syncPaymentAndTreasury(extract: ContractorExtract) {
  deletePaymentByExtractStore(
    extract.buildingId,
    extract.contractorId,
    extract.id
  );

  const payment: ContractorPayment = {
    id: `pay-${extract.id}`,
    buildingId: extract.buildingId,
    contractorId: extract.contractorId,
    date: extract.date,
    amount: extract.netPayable,
    extractId: extract.id,
    notes: `دفعة ${extract.label}`,
  };
  savePaymentStore(payment);

  upsertTreasuryBySourceStore(extract.projectId, "extract", extract.id, {
    amount: -extract.netPayable,
    description: `مستخلص ${extract.label}`,
    date: extract.date,
    metadata: {
      buildingId: extract.buildingId,
      contractorId: extract.contractorId,
      extractLabel: extract.label,
    },
  });
}

export function deleteExtractService(
  buildingId: string,
  contractorId: string,
  extractId: string,
  projectId: string
) {
  deleteExtractStore(buildingId, contractorId, extractId);
  removeTreasuryBySourceStore(projectId, "extract", extractId);
}

export {
  getPreviousQuantitiesStore as getPreviousQuantities,
  nextRunningNumberStore as nextRunningNumber,
  getPreviousPaidStore as getPreviousPaid,
};
