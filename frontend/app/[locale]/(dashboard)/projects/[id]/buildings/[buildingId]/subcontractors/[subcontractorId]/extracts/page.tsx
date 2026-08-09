/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { DollarSign, Plus, Eye, Edit2, Trash2 } from "lucide-react";
import UploadFromDeviceButton from "@/components/shared/UploadFromDeviceButton";
import DeleteConfirmModal from "@/components/boq/DeleteConfirmModal";
import { extractService, type Extract } from "@/services/extract.service";
import { Can } from "@/components/Can";

export default function ContractorExtractsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;
  const contractorId = params.subcontractorId as string;
  const [list, setList] = useState<Extract[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const base = `/${locale}/projects/${projectId}/buildings/${buildingId}/subcontractors/${contractorId}/extracts`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await extractService.list(buildingId, contractorId);
      setList(data);
    } finally {
      setLoading(false);
    }
  }, [buildingId, contractorId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await extractService.remove(buildingId, contractorId, deleteId);
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
          <Can permission="extracts.create">
            <UploadFromDeviceButton isArabic={isArabic} onUpload={load} />
          </Can>
          <Can permission="extracts.create">
            <Link
              href={`${base}/new`}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-sm"
            >
              <Plus size={14} />
              {isArabic ? "مستخلص جديد" : "New Extract"}
            </Link>
          </Can>
        </div>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-text-muted">
          {isArabic ? "جاري التحميل..." : "Loading..."}
        </Card>
      ) : list.length === 0 ? (
        <Card className="p-8 text-center">
          <DollarSign size={48} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-secondary">
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
                  <p className="text-xs text-text-secondary">{e.date}</p>
                  <p className="text-xs text-text-muted mt-1">
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
                <Can permission="extracts.update">
                  <Link
                    href={`${base}/${e.id}/edit`}
                    className="text-info text-sm flex items-center gap-1 hover:underline"
                  >
                    <Edit2 size={14} />
                    {isArabic ? "تعديل" : "Edit"}
                  </Link>
                </Can>
                <Can permission="extracts.delete">
                  <button
                    onClick={() => setDeleteId(e.id)}
                    className="text-danger text-sm flex items-center gap-1"
                  >
                    <Trash2 size={14} />
                    {isArabic ? "حذف" : "Delete"}
                  </button>
                </Can>
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
