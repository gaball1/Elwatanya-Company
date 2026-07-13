/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { DollarSign, Plus, Eye, Edit2, Trash2 } from "lucide-react";
import UploadFromDeviceButton from "@/components/shared/UploadFromDeviceButton";
import DeleteConfirmModal from "@/components/boq/DeleteConfirmModal";
import { financeApi } from "@/lib/api/financeApi";
import type { ContractorExtract } from "@/types/boq";

export default function ContractorExtractsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;
  const contractorId = params.subcontractorId as string;
  const [list, setList] = useState<ContractorExtract[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const base = `/${locale}/projects/${projectId}/buildings/${buildingId}/subcontractors/${contractorId}/extracts`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { extracts } = await financeApi.listExtracts(buildingId, contractorId);
      setList(extracts);
    } finally {
      setLoading(false);
    }
  }, [buildingId, contractorId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await financeApi.deleteExtract(deleteId, buildingId, contractorId, projectId);
    setDeleteId(null);
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h3 className="font-bold text-primary">
          {isArabic ? "مستخلصات المقاول" : "Contractor Extracts"}
        </h3>
        <div className="flex gap-2">
          <UploadFromDeviceButton isArabic={isArabic} onUpload={load} />
          <Link
            href={`${base}/new`}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-sm"
          >
            <Plus size={14} />
            {isArabic ? "مستخلص جديد" : "New Extract"}
          </Link>
        </div>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-gray-400">
          {isArabic ? "جاري التحميل..." : "Loading..."}
        </Card>
      ) : list.length === 0 ? (
        <Card className="p-8 text-center">
          <DollarSign size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            {isArabic ? "لا توجد مستخلصات" : "No extracts"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((e) => (
            <Card key={e.id} hover className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-primary">{e.label}</h4>
                  <p className="text-xs text-gray-500">{e.date}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {isArabic ? "قيمة الأعمال:" : "Work:"}{" "}
                    {e.totalWorkValue?.toLocaleString() ?? "—"} |{" "}
                    {isArabic ? "استقطاعات:" : "Deductions:"}{" "}
                    {e.totalDeductions?.toLocaleString() ?? "—"}
                  </p>
                </div>
                <p className="font-bold text-teal-700 text-lg">
                  {e.netPayable.toLocaleString()} ج.م
                </p>
              </div>
              <div className="flex gap-3 mt-3">
                <Link
                  href={`${base}/${e.id}`}
                  className="text-gold text-sm flex items-center gap-1 hover:underline"
                >
                  <Eye size={14} />
                  {isArabic ? "عرض" : "View"}
                </Link>
                <Link
                  href={`${base}/${e.id}/edit`}
                  className="text-blue-500 text-sm flex items-center gap-1 hover:underline"
                >
                  <Edit2 size={14} />
                  {isArabic ? "تعديل" : "Edit"}
                </Link>
                <button
                  onClick={() => setDeleteId(e.id)}
                  className="text-red-500 text-sm flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  {isArabic ? "حذف" : "Delete"}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {deleteId && (
        <DeleteConfirmModal
          isArabic={isArabic}
          message={isArabic ? "حذف هذا المستخلص؟" : "Delete this extract?"}
          onCancel={() => setDeleteId(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
