"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ExtractDeduction } from "@/types/finance";
import type { ExtractItem } from "@/types/boq";
import { extractService } from "@/services/extract.service";
import {
  buildInsuranceDeduction,
  calcNetPayable,
  mergeDeductions,
  sumDeductions,
  sumWorkValue,
} from "@/lib/extractCalculations";

export function useExtractCalculations(
  rows: ExtractItem[],
  insurancePercent: number,
  manualDeductions: ExtractDeduction[],
  otherAmounts: number,
  isArabic: boolean,
  previousPaid = 0
) {
  return useMemo(() => {
    const totalWorkValue = sumWorkValue(rows);
    const insurance = buildInsuranceDeduction(
      totalWorkValue,
      insurancePercent,
      isArabic
    );
    const deductions = mergeDeductions(manualDeductions, insurance, previousPaid, isArabic);
    const totalDeductions = sumDeductions(deductions);
    const netPayable = calcNetPayable(totalWorkValue, otherAmounts, deductions);

    return { totalWorkValue, otherAmounts, deductions, totalDeductions, netPayable };
  }, [rows, insurancePercent, manualDeductions, otherAmounts, isArabic, previousPaid]);
}

export function useExtractMeta(
  buildingId: string,
  contractorId: string,
  runningNumber?: number,
  status: 'running' | 'final' = 'running'
) {
  const [previousPaid, setPreviousPaid] = useState(0);
  const [previousQuantities, setPreviousQuantities] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    try {
      const data = await extractService.getMeta(buildingId, contractorId, {
        runningNumber,
        status,
      });
      if (seq !== requestSeq.current) return;
      setPreviousPaid(data.previousPaid || 0);
      setPreviousQuantities(data.previousQuantities ?? {});
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [buildingId, contractorId, runningNumber, status]);

  useEffect(() => {
    load();
  }, [load]);

  return { previousPaid, previousQuantities, loading, reload: load };
}
