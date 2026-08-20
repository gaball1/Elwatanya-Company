/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui";
import {
  Building2,
  Plus,
  Eye,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
import { buildingService, type Building } from "@/services/building.service";
import { Can } from "@/components/Can";
import ExportButtons from "@/components/shared/ExportButtons";

export default function ProjectBuildingsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;

  const [buildings, setBuildings] = useState<Building[]>([]);

  useEffect(() => {
    if (projectId) {
      buildingService.getBuildings(projectId).then((data) => setBuildings(data as any[])).catch(console.error);
    }
  }, [projectId]);
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingBuildingId, setDeletingBuildingId] = useState<string | null>(
    null
  );
  const [buildingForm, setBuildingForm] = useState({
    name: "",
    code: "",
    type: "",
    startDate: "",
    description: "",
    status: "active",
  });

  const handleBuildingInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setBuildingForm({ ...buildingForm, [e.target.name]: e.target.value });
  };

  const openAddBuildingModal = () => {
    setEditingBuilding(null);
    setBuildingForm({
      name: "",
      code: "",
      type: "",
      startDate: "",
      description: "",
      status: "active",
    });
    setShowBuildingModal(true);
  };

  const openEditBuildingModal = (building: Building) => {
    setEditingBuilding(building);
    setBuildingForm({
      name: building.name,
      code: building.code || "",
      type: building.type || "",
      startDate: building.startDate ? building.startDate.split("T")[0] : "",
      description: building.description || "",
      status: building.status || "active",
    });
    setShowBuildingModal(true);
  };

  const openDeleteConfirm = (buildingId: string) => {
    setDeletingBuildingId(buildingId);
    setShowDeleteConfirm(true);
  };

  const handleBuildingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        ...buildingForm,
        startDate: buildingForm.startDate || undefined,
        code: buildingForm.code || undefined,
        type: buildingForm.type || undefined,
        description: buildingForm.description || undefined,
      };
      if (editingBuilding) {
        await buildingService.updateBuilding(editingBuilding.id, body);
      } else {
        await buildingService.createBuilding(projectId, body);
      }
      const data = await buildingService.getBuildings(projectId);
      setBuildings(data as any[]);
    } catch (error) {
      console.error('Building operation failed', error);
    }
    setShowBuildingModal(false);
    setEditingBuilding(null);
  };

  const handleDeleteBuilding = async () => {
    if (deletingBuildingId) {
      try {
        await buildingService.deleteBuilding(deletingBuildingId);
        const data = await buildingService.getBuildings(projectId);
        setBuildings(data as any[]);
      } catch (error) {
        console.error('Delete building failed', error);
      }
      setShowDeleteConfirm(false);
      setDeletingBuildingId(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-primary">
          {isArabic ? "المباني" : "Buildings"}
        </h2>
        <div className="flex items-center gap-2">
          <ExportButtons
            data={buildings}
            columns={[
              { key: "name", labelAr: "اسم المبنى", labelEn: "Building Name" },
              { key: "code", labelAr: "الكود", labelEn: "Code" },
              { key: "type", labelAr: "النوع", labelEn: "Type" },
              { key: "startDate", labelAr: "تاريخ البدء", labelEn: "Start Date", format: (v) => v ? new Date(v).toLocaleDateString("ar-EG") : "—" },
              { key: "status", labelAr: "الحالة", labelEn: "Status", format: (v) => v === "active" ? "نشط" : v === "completed" ? "مكتمل" : "معلق" },
            ]}
            titleAr="تقرير المباني"
            titleEn="Buildings Report"
            filename={`buildings_${projectId}`}
            locale={locale}
          />
          <Can permission="buildings.create">
            <button
              onClick={openAddBuildingModal}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition"
            >
              <Plus size={16} />
              {isArabic ? "إضافة مبنى" : "Add Building"}
            </button>
          </Can>
        </div>
      </div>

      {buildings.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 size={48} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-secondary">
            {isArabic
              ? "لا توجد مباني في هذا المشروع بعد"
              : "No buildings in this project yet"}
          </p>
          <Can permission="buildings.create">
            <button
              onClick={openAddBuildingModal}
              className="mt-3 text-gold hover:underline"
            >
              {isArabic ? "أضف أول مبنى" : "Add first building"}
            </button>
          </Can>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buildings.map((building: Building) => (
            <Link
              key={building.id}
              href={`/${locale}/projects/${projectId}/buildings/${building.id}/estimates`}
            >
              <Card hover className="p-4 cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-primary">{building.name}</h3>
                  <div className="flex items-center gap-1">
                    <Can permission="buildings.update">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          openEditBuildingModal(building);
                        }}
                        className="p-1 text-text-muted hover:text-info transition"
                      >
                        <Edit2 size={14} />
                      </button>
                    </Can>
                    <Can permission="buildings.delete">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          openDeleteConfirm(building.id);
                        }}
                        className="p-1 text-text-muted hover:text-danger transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </Can>
                  </div>
                </div>
                <p className="text-xs text-gold mb-2">{building.code}</p>
                <p className="text-text-secondary text-sm line-clamp-2">
                  {building.description}
                </p>
                <div className="mt-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${building.status === "active" ? "bg-success" : building.status === "completed" ? "bg-info" : "bg-warning"}`} />
                    <span className="text-xs text-text-muted">
                      {building.status === "active" ? (isArabic ? "نشط" : "Active") : building.status === "completed" ? (isArabic ? "مكتمل" : "Completed") : (isArabic ? "معلق" : "On Hold")}
                    </span>
                  </div>
                  <Eye size={16} className="text-gold" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {showBuildingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-primary">
                {editingBuilding
                  ? isArabic
                    ? "تعديل المبنى"
                    : "Edit Building"
                  : isArabic
                    ? "إضافة مبنى جديد"
                    : "Add New Building"}
              </h2>
              <button
                onClick={() => setShowBuildingModal(false)}
                className="text-text-muted hover:text-text-secondary"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleBuildingSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "اسم المبنى" : "Building Name"} *
                </label>
                <input
                  type="text"
                  name="name"
                  value={buildingForm.name}
                  onChange={handleBuildingInputChange}
                  required
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:border-gold"
                  placeholder={isArabic ? "مثال: العمارة A" : "Example: Building A"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "كود المبنى" : "Building Code"}
                </label>
                <input
                  type="text"
                  name="code"
                  value={buildingForm.code}
                  onChange={handleBuildingInputChange}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:border-gold"
                  placeholder={isArabic ? "مثال: B001" : "Example: B001"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "نوع المبنى" : "Building Type"}
                </label>
                <select
                  name="type"
                  value={buildingForm.type}
                  onChange={handleBuildingInputChange}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:border-gold"
                >
                  <option value="">
                    {isArabic ? "-- اختر --" : "-- Select --"}
                  </option>
                  <option value="سكني">
                    {isArabic ? "سكني" : "Residential"}
                  </option>
                  <option value="إداري">
                    {isArabic ? "إداري" : "Administrative"}
                  </option>
                  <option value="تجاري">
                    {isArabic ? "تجاري" : "Commercial"}
                  </option>
                  <option value="خدمي">{isArabic ? "خدمي" : "Service"}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "تاريخ البدء" : "Start Date"}
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={buildingForm.startDate}
                  onChange={handleBuildingInputChange}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "الوصف" : "Description"}
                </label>
                <textarea
                  name="description"
                  value={buildingForm.description}
                  onChange={handleBuildingInputChange}
                  rows={3}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:border-gold resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {isArabic ? "الحالة" : "Status"}
                </label>
                <select
                  name="status"
                  value={buildingForm.status}
                  onChange={handleBuildingInputChange}
                  className="w-full p-3 border border-border rounded-xl focus:outline-none focus:border-gold"
                >
                  <option value="active">{isArabic ? "نشط" : "Active"}</option>
                  <option value="completed">{isArabic ? "مكتمل" : "Completed"}</option>
                  <option value="on_hold">{isArabic ? "معلق" : "On Hold"}</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBuildingModal(false)}
                  className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark"
                >
                  {editingBuilding
                    ? isArabic
                      ? "تحديث"
                      : "Update"
                    : isArabic
                      ? "حفظ"
                      : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="p-5 border-b">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "تأكيد الحذف" : "Confirm Delete"}
              </h2>
            </div>
            <div className="p-5">
              <p className="text-text-secondary">
                {isArabic
                  ? "هل أنت متأكد من حذف هذا المبنى؟ سيتم حذف جميع المقايسات والمستخلصات المرتبطة به."
                  : "Are you sure you want to delete this building? All associated estimates and statements will be deleted."}
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={handleDeleteBuilding}
                  className="flex-1 px-4 py-2 bg-danger text-white rounded-xl hover:bg-danger-dark"
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
