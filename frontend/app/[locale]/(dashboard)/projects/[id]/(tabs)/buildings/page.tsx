/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui";
import {
  Building2,
  Plus,
  Eye,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
import { mockBuildings } from "@/lib/mockData";

export default function ProjectBuildingsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const projectId = params.id as string;

  const [buildings, setBuildings] = useState(
    mockBuildings.filter((b) => b.projectId === projectId)
  );
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
    });
    setShowBuildingModal(true);
  };

  const openEditBuildingModal = (building: any) => {
    setEditingBuilding(building);
    setBuildingForm({
      name: building.name,
      code: building.code || "",
      type: building.type || "",
      startDate: building.startDate || "",
      description: building.description || "",
    });
    setShowBuildingModal(true);
  };

  const openDeleteConfirm = (buildingId: string) => {
    setDeletingBuildingId(buildingId);
    setShowDeleteConfirm(true);
  };

  const handleBuildingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBuilding) {
      setBuildings(
        buildings.map((b) =>
          b.id === editingBuilding.id ? { ...b, ...buildingForm, projectId } : b
        )
      );
    } else {
      const newId = (buildings.length + 1).toString();
      setBuildings([
        ...buildings,
        {
          id: newId,
          ...buildingForm,
          projectId,
          status: "active",
        },
      ]);
    }
    setShowBuildingModal(false);
    setEditingBuilding(null);
  };

  const handleDeleteBuilding = () => {
    if (deletingBuildingId) {
      setBuildings(buildings.filter((b) => b.id !== deletingBuildingId));
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
        <button
          onClick={openAddBuildingModal}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition"
        >
          <Plus size={16} />
          {isArabic ? "إضافة مبنى" : "Add Building"}
        </button>
      </div>

      {buildings.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            {isArabic
              ? "لا توجد مباني في هذا المشروع بعد"
              : "No buildings in this project yet"}
          </p>
          <button
            onClick={openAddBuildingModal}
            className="mt-3 text-gold hover:underline"
          >
            {isArabic ? "أضف أول مبنى" : "Add first building"}
          </button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buildings.map((building) => (
            <Link
              key={building.id}
              href={`/${locale}/projects/${projectId}/buildings/${building.id}/estimates`}
            >
              <Card hover className="p-4 cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-primary">{building.name}</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        openEditBuildingModal(building);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-500 transition"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        openDeleteConfirm(building.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gold mb-2">{building.code}</p>
                <p className="text-gray-500 text-sm line-clamp-2">
                  {building.description}
                </p>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-xs text-gray-400">
                    {isArabic ? "تاريخ البدء" : "Start Date"}:{" "}
                    {building.startDate || "—"}
                  </span>
                  <Eye size={16} className="text-gold" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {showBuildingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleBuildingSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "اسم المبنى" : "Building Name"} *
                </label>
                <input
                  type="text"
                  name="name"
                  value={buildingForm.name}
                  onChange={handleBuildingInputChange}
                  required
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-gold"
                  placeholder={isArabic ? "مثال: العمارة A" : "Example: Building A"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "كود المبنى" : "Building Code"}
                </label>
                <input
                  type="text"
                  name="code"
                  value={buildingForm.code}
                  onChange={handleBuildingInputChange}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-gold"
                  placeholder={isArabic ? "مثال: B001" : "Example: B001"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "نوع المبنى" : "Building Type"}
                </label>
                <select
                  name="type"
                  value={buildingForm.type}
                  onChange={handleBuildingInputChange}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-gold"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "تاريخ البدء" : "Start Date"}
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={buildingForm.startDate}
                  onChange={handleBuildingInputChange}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? "الوصف" : "Description"}
                </label>
                <textarea
                  name="description"
                  value={buildingForm.description}
                  onChange={handleBuildingInputChange}
                  rows={3}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-gold resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBuildingModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
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
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-5 border-b">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "تأكيد الحذف" : "Confirm Delete"}
              </h2>
            </div>
            <div className="p-5">
              <p className="text-gray-600">
                {isArabic
                  ? "هل أنت متأكد من حذف هذا المبنى؟ سيتم حذف جميع المقايسات والمستخلصات المرتبطة به."
                  : "Are you sure you want to delete this building? All associated estimates and statements will be deleted."}
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={handleDeleteBuilding}
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
