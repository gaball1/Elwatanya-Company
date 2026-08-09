"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ExtractDeduction } from "@/types/finance";
import type { ExtractItem } from "@/types/boq";
import { extractService } from "@/services/extract.service";
import {
  buildInsuranceDeduction,
  buildPreviousPaidDeduction,
  calcNetPayable,
  mergeDeductions,
  sumDeductions,
  sumWorkValue,
} from "@/lib/extractCalculations";

export function useExtractCalculations(
  rows: ExtractItem[],
  insurancePercent: number,
  manualDeductions: ExtractDeduction[],
  previousPaid: number,
  isArabic: boolean
) {
  return useMemo(() => {
    const totalWorkValue = sumWorkValue(rows);
    const insurance = buildInsuranceDeduction(
      totalWorkValue,
      insurancePercent,
      isArabic
    );
    const prevRow = buildPreviousPaidDeduction(previousPaid, isArabic);
    const deductions = mergeDeductions(manualDeductions, insurance, prevRow);
    const totalDeductions = sumDeductions(deductions);
    const netPayable = calcNetPayable(totalWorkValue, deductions);

    return { totalWorkValue, deductions, totalDeductions, netPayable };
  }, [rows, insurancePercent, manualDeductions, previousPaid, isArabic]);
}

export function useExtractMeta(
  buildingId: string,
  contractorId: string,
  runningNumber: number
) {
  const [previousPaid, setPreviousPaid] = useState(0);
  const [previousQuantities, setPreviousQuantities] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await extractService.getMeta(buildingId, contractorId);
      setPreviousPaid(data.previousPaid || 0);
      setPreviousQuantities(data.previousQuantities ?? {});
    } finally {
      setLoading(false);
    }
  }, [buildingId, contractorId, runningNumber]);

  useEffect(() => {
    load();
  }, [load]);

  return { previousPaid, previousQuantities, loading, reload: load };
}
