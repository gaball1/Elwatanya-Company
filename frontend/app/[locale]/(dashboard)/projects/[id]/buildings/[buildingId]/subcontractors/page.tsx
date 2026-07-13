/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui";
import Link from "next/link";
import { Users, Plus, Trash2 } from "lucide-react";
import { mockBuildingSubcontractors, mockSubcontractors } from "@/lib/mockData";
import AddSubcontractorModal from "@/components/building/AddSubcontractorModal";
import UploadFromDeviceButton, { type UploadedFileInfo } from "@/components/shared/UploadFromDeviceButton";

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <Card className="p-8 text-center">
      <div className="mx-auto text-gray-300 mb-3">{icon}</div>
      <p className="text-gray-500">{message}</p>
    </Card>
  );
}

function SubcontractorCard({ sub, bs, isArabic, locale, projectId, buildingId, onDelete }: any) {
  return (
    <Link
      href={`/${locale}/projects/${projectId}/buildings/${buildingId}/subcontractors/${bs.subcontractorId}/estimate`}
    >
      <Card hover className="p-4 cursor-pointer">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-primary">{sub?.name}</h3>
            <p className="text-sm text-gold">{bs.workType}</p>
            <p className="text-xs text-gray-500 mt-1">
              {isArabic ? "مقايسة · مستخلصات · دفعات" : "BOQ · Extracts · Payments"}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
            className="p-1 text-gray-400 hover:text-red-500 transition"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </Card>
    </Link>
  );
}

export default function BuildingSubcontractorsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;
  const buildingId = params.buildingId as string;

  const [buildingSubs, setBuildingSubs] = useState(
    mockBuildingSubcontractors.filter((bs) => bs.buildingId === buildingId)
  );
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingSubId, setDeletingSubId] = useState<string | null>(null);

  const availableSubcontractors = useMemo(
    () =>
      mockSubcontractors.filter(
        (sub) => !buildingSubs.some((bs) => bs.subcontractorId === sub.id)
      ),
    [buildingSubs]
  );

  const handleAdd = useCallback((newSub: any) => {
    setBuildingSubs((prev) => [...prev, newSub]);
  }, []);

  const handleDeleteClick = useCallback((id: string) => {
    setDeletingSubId(id);
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deletingSubId) {
      setBuildingSubs((prev) => prev.filter((bs) => bs.id !== deletingSubId));
      setShowDeleteConfirm(false);
      setDeletingSubId(null);
    }
  }, [deletingSubId]);

  const handleUpload = (file: UploadedFileInfo) => {
    // handle uploaded subcontractor document
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-primary">
          {isArabic ? "مقاولو المبنى" : "Building Subcontractors"}
        </h2>
        <div className="flex gap-2">
          <UploadFromDeviceButton
            isArabic={isArabic}
            onUpload={handleUpload}
            label={isArabic ? "رفع من الجهاز" : "Upload from Device"}
          />
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition"
          >
            <Plus size={16} />
            {isArabic ? "إضافة مقاول" : "Add Subcontractor"}
          </button>
        </div>
      </div>

      {buildingSubs.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          message={
            isArabic
              ? "لا يوجد مقاولين في هذا المبنى"
              : "No subcontractors in this building"
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {buildingSubs.map((bs) => {
            const sub = mockSubcontractors.find(
              (s) => s.id === bs.subcontractorId
            );
            return (
              <SubcontractorCard
                key={bs.id}
                sub={sub}
                bs={bs}
                isArabic={isArabic}
                locale={locale}
                projectId={projectId}
                buildingId={buildingId}
                onDelete={() => handleDeleteClick(bs.id)}
              />
            );
          })}
        </div>
      )}

      <AddSubcontractorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAdd={handleAdd}
        availableSubcontractors={availableSubcontractors}
        buildingId={buildingId}
        isArabic={isArabic}
      />

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-5 border-b">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "تأكيد الحذف" : "Confirm Delete"}
              </h2>
            </div>
            <div className="p-5">
              <p className="text-gray-600">
                {isArabic
                  ? "هل أنت متأكد من إزالة هذا المقاول من المبنى؟"
                  : "Are you sure you want to remove this subcontractor?"}
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600"
                >
                  {isArabic ? "حذف" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
