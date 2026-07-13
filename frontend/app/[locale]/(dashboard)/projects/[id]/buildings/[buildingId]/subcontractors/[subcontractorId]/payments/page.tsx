/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { ExternalLink } from "lucide-react";
import { financeApi } from "@/lib/api/financeApi";
import type { ContractorPayment } from "@/types/boq";

export default function ContractorPaymentsPage() {
  const params = useParams();
  const isArabic = (params.locale as string) === "ar";
  const locale = (params.locale as string) ?? "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;
  const contractorId = params.subcontractorId as string;
  const [payments, setPayments] = useState<ContractorPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    financeApi
      .listPayments(buildingId, contractorId)
      .then(({ payments: p }) => setPayments(p))
      .finally(() => setLoading(false));
  }, [buildingId, contractorId]);

  const total = payments.reduce((s, p) => s + p.amount, 0);
  const base = `/${locale}/projects/${projectId}/buildings/${buildingId}/subcontractors/${contractorId}/extracts`;

  return (
    <div>
      <Card className="p-4 mb-4 text-center bg-teal-50 border border-teal-200">
        <p className="text-gray-500 text-sm">
          {isArabic
            ? "إجمالي الدفعات (من المستخلصات)"
            : "Total Payments (from extracts)"}
        </p>
        <p className="text-2xl font-bold text-teal-700">
          {total.toLocaleString()} ج.م
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {isArabic
            ? "تُسجَّل تلقائياً عند حفظ كل مستخلص"
            : "Auto-recorded when each extract is saved"}
        </p>
      </Card>

      {loading ? (
        <Card className="p-6 text-center text-gray-400">
          {isArabic ? "جاري التحميل..." : "Loading..."}
        </Card>
      ) : payments.length === 0 ? (
        <Card className="p-6 text-center text-gray-500">
          {isArabic ? "لا توجد دفعات بعد" : "No payments yet"}
        </Card>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <Card key={p.id} className="p-3 flex justify-between items-center">
              <div>
                <p className="font-medium">{p.date}</p>
                <p className="text-xs text-gray-500">{p.notes}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-bold text-primary">
                  {p.amount.toLocaleString()} ج.م
                </p>
                {p.extractId && (
                  <Link
                    href={`${base}/${p.extractId}`}
                    className="text-gold hover:underline flex items-center gap-1 text-xs"
                  >
                    <ExternalLink size={14} />
                    {isArabic ? "المستخلص" : "Extract"}
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
