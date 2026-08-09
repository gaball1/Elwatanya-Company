"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui";
import Link from "next/link";
import { Users, Plus, X, Trash2, ExternalLink } from "lucide-react";
import {
  buildingSubcontractorService,
  type BuildingSubcontractor,
} from "@/services/building-subcontractor.service";
import { subcontractorService, type Subcontractor } from "@/services/subcontractor.service";
import { useToast } from "@/components/ui/Toast";

export default function BuildingSubcontractorsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;
  const { showToast, ToastComponent } = useToast();

  const [assignments, setAssignments] = useState<BuildingSubcontractor[]>([]);
  const [availableSubs, setAvailableSubs] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [assigned, allSubs] = await Promise.all([
        buildingSubcontractorService.listByBuilding(buildingId),
        subcontractorService.list(),
      ]);
      setAssignments(assigned);
      const assignedIds = new Set(assigned.map((a) => a.subcontractorId));
      setAvailableSubs(allSubs.filter((s) => !assignedIds.has(s.id) && s.status === "active"));
    } catch {
      showToast(isArabic ? "حدث خطأ في تحميل البيانات" : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [buildingId, isArabic, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubId) return;
    setSaving(true);
    try {
      await buildingSubcontractorService.assign(buildingId, selectedSubId);
      showToast(isArabic ? "تم تعيين المقاول" : "Subcontractor assigned", "success");
      setShowModal(false);
      setSelectedSubId("");
      loadData();
    } catch {
      showToast(isArabic ? "فشل التعيين" : "Assignment failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (subcontractorId: string, name: string) => {
    try {
      await buildingSubcontractorService.remove(buildingId, subcontractorId);
      showToast(
        isArabic ? `تم إزالة ${name}` : `${name} removed`,
        "success"
      );
      loadData();
    } catch {
      showToast(isArabic ? "فشل الإزالة" : "Remove failed", "error");
    }
  };

  return (
    <div>
      {ToastComponent}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-primary">
          {isArabic ? "مقاولو المبنى" : "Building Subcontractors"}
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-gold text-white rounded-lg text-sm hover:bg-gold/80 transition"
        >
          <Plus size={16} />
          {isArabic ? "تعيين مقاول" : "Assign Subcontractor"}
        </button>
      </div>

      {loading ? (
        <Card className="p-8 text-center">
          <Users size={48} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-secondary">{isArabic ? "جاري التحميل..." : "Loading..."}</p>
        </Card>
      ) : assignments.length === 0 ? (
        <Card className="p-8 text-center">
          <Users size={48} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-secondary">
            {isArabic
              ? "لا يوجد مقاولين معينين في هذا المبنى"
              : "No subcontractors assigned to this building"}
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="p-4 relative group">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gold/10 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary">
                      {assignment.subcontractor.name}
                    </h3>
                    <p className="text-xs text-gold">
                      {assignment.workType || assignment.subcontractor.workType || ""}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/${locale}/projects/${projectId}/buildings/${buildingId}/subcontractors/${assignment.subcontractorId}/estimate`}
                    className="p-1.5 text-text-muted hover:text-info transition"
                  >
                    <ExternalLink size={14} />
                  </Link>
                  <button
                    onClick={() => handleRemove(assignment.subcontractorId, assignment.subcontractor.name)}
                    className="p-1.5 text-text-muted hover:text-danger transition opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-text-secondary">
                <span>{assignment.subcontractor.phone}</span>
                {assignment.agreedPrice && (
                  <span>
                    {isArabic ? "السعر المتفق عليه" : "Agreed Price"}:{" "}
                    {Number(assignment.agreedPrice).toLocaleString()} {isArabic ? "ج.م" : "EGP"}
                  </span>
                )}
              </div>
              <div className="mt-2 pt-2 border-t border-border-light text-xs text-text-muted">
                <Link
                  href={`/${locale}/projects/${projectId}/buildings/${buildingId}/subcontractors/${assignment.subcontractorId}/estimate`}
                  className="text-gold hover:underline"
                >
                  {isArabic ? "مقايسة · مستخلصات · دفعات" : "BOQ · Extracts · Payments"}
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-lg">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "تعيين مقاول للمبنى" : "Assign Subcontractor"}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X size={24} className="text-text-muted" />
              </button>
            </div>
            <form onSubmit={handleAssign} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {isArabic ? "اختر المقاول" : "Select Subcontractor"}
                </label>
                <select
                  value={selectedSubId}
                  onChange={(e) => setSelectedSubId(e.target.value)}
                  className="w-full p-3 border rounded-xl"
                  required
                >
                  <option value="">
                    {isArabic ? "-- اختر --" : "-- Select --"}
                  </option>
                  {availableSubs.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} - {sub.workType}
                    </option>
                  ))}
                </select>
              </div>
              {availableSubs.length === 0 && (
                <p className="text-sm text-text-muted">
                  {isArabic
                    ? "جميع المقاولين النشطين معينون بالفعل"
                    : "All active subcontractors are already assigned"}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border rounded-xl"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedSubId || availableSubs.length === 0}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl disabled:opacity-50"
                >
                  {saving
                    ? isArabic
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : isArabic
                      ? "تعيين"
                      : "Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
