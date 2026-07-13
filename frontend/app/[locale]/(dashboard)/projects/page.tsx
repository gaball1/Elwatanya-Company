/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useCallback } from "react";
import { Card } from "@/components/ui";
import {
  Building2,
  MapPin,
  Calendar,
  Plus,
  X,
  Edit2,
  Trash2,
} from "lucide-react";
import { mockProjects, mockBuildings, mockEstimates } from "@/lib/mockData";
import { useToast } from "@/components/ui/Toast";

export default function ProjectsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(
    null
  );
  const [projects, setProjects] = useState([...mockProjects]);
  const [buildings, setBuildings] = useState([...mockBuildings]);
  const [estimates, setEstimates] = useState([...mockEstimates]);
  const [projectForm, setProjectForm] = useState({
    name: "",
    location: "",
    description: "",
    client: "",
    startDate: "",
  });

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setProjectForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    []
  );

  const openAddModal = useCallback(() => {
    setEditingProject(null);
    setProjectForm({
      name: "",
      location: "",
      description: "",
      client: "",
      startDate: "",
    });
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((project: any) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name,
      location: project.location,
      description: project.description || "",
      client: project.client || "",
      startDate: project.startDate || "",
    });
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (editingProject) {
        const index = mockProjects.findIndex((p) => p.id === editingProject.id);
        if (index !== -1) {
          mockProjects[index] = { ...mockProjects[index], ...projectForm };
        }
        setProjects([...mockProjects]);
        showToast(isArabic ? "تم تحديث المشروع" : "Project updated", "success");
      } else {
        const newId = (mockProjects.length + 1).toString();
        const newProject = {
          id: newId,
          ...projectForm,
          startDate:
            projectForm.startDate || new Date().toISOString().split("T")[0],
          status: "active",
          progress: 0,
        };
        const newBuilding = {
          id: `b_${newId}_1`,
          name: "المبنى الرئيسي",
          code: `B00${newId}`,
          projectId: newId,
          type: "قيد الإنشاء",
          startDate: new Date().toISOString().split("T")[0],
          description: "مبنى افتراضي",
          status: "active",
        };
        const newEstimate = {
          id: `e_${newId}_1`,
          buildingId: newBuilding.id,
          type: "company",
          name: "مقايسة تحليلية - مبنى مؤقت",
          number: `EST-${newId}001`,
          date: new Date().toISOString().split("T")[0],
          totalAmount: 0,
          status: "draft",
          items: [],
        };
        mockProjects.push(newProject);
        mockBuildings.push(newBuilding);
        mockEstimates.push(newEstimate);
        setProjects([...mockProjects]);
        setBuildings([...mockBuildings]);
        setEstimates([...mockEstimates]);
        showToast(isArabic ? "تم إضافة المشروع" : "Project added", "success");
      }
      setShowModal(false);
      setEditingProject(null);
    },
    [editingProject, projectForm, isArabic]
  );

  const handleDelete = useCallback(() => {
    if (deletingProjectId) {
      const index = mockProjects.findIndex((p) => p.id === deletingProjectId);
      if (index !== -1) mockProjects.splice(index, 1);
      const buildingsToDelete = mockBuildings.filter(
        (b) => b.projectId === deletingProjectId
      );
      buildingsToDelete.forEach((b) => {
        const bIndex = mockBuildings.findIndex((mb) => mb.id === b.id);
        if (bIndex !== -1) mockBuildings.splice(bIndex, 1);
      });
      setProjects([...mockProjects]);
      setBuildings([...mockBuildings]);
      showToast(isArabic ? "تم حذف المشروع" : "Project deleted", "success");
      setShowDeleteConfirm(false);
      setDeletingProjectId(null);
    }
  }, [deletingProjectId, isArabic]);

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return isArabic ? "نشط" : "Active";
      case "completed":
        return isArabic ? "مكتمل" : "Completed";
      default:
        return isArabic ? "تخطيط" : "Planning";
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div>
      {ToastComponent}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">
          {isArabic ? "المشاريع" : "Projects"}
        </h1>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
        >
          <Plus size={18} />
          {isArabic ? "إضافة مشروع" : "Add Project"}
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card key={project.id} hover className="p-5">
            <div className="flex justify-between items-start mb-3">
              <Link
                href={`/${locale}/projects/${project.id}`}
                className="flex-1"
              >
                <h3 className="text-lg font-bold text-primary hover:text-gold transition">
                  {project.name}
                </h3>
              </Link>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(
                    project.status
                  )}`}
                >
                  {getStatusText(project.status)}
                </span>
                <button
                  onClick={() => openEditModal(project)}
                  className="p-1 text-gray-400 hover:text-blue-500"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => {
                    setDeletingProjectId(project.id);
                    setShowDeleteConfirm(true);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <Link href={`/${locale}/projects/${project.id}`}>
              <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                {project.description}
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gold" />
                  <span>{project.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gold" />
                  <span>
                    {isArabic ? "تاريخ البدء:" : "Start Date:"}{" "}
                    {project.startDate}
                  </span>
                </div>
                {project.client && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gold" />
                    <span>
                      {isArabic ? "جهة الإسناد:" : "Client:"} {project.client}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{isArabic ? "نسبة الإنجاز" : "Progress"}</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gold rounded-full h-2"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            </Link>
          </Card>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-primary">
                {editingProject
                  ? isArabic
                    ? "تعديل المشروع"
                    : "Edit Project"
                  : isArabic
                  ? "إضافة مشروع جديد"
                  : "Add New Project"}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X size={24} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <input
                type="text"
                name="name"
                placeholder={isArabic ? "اسم المشروع" : "Project Name"}
                value={projectForm.name}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-xl"
                required
              />
              <input
                type="text"
                name="location"
                placeholder={isArabic ? "الموقع" : "Location"}
                value={projectForm.location}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-xl"
                required
              />
              <input
                type="text"
                name="client"
                placeholder={isArabic ? "جهة الإسناد" : "Client"}
                value={projectForm.client}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-xl"
              />
              <input
                type="date"
                name="startDate"
                value={projectForm.startDate}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-xl"
              />
              <textarea
                name="description"
                placeholder={isArabic ? "الوصف" : "Description"}
                value={projectForm.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full p-3 border rounded-xl resize-none"
              />
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
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl"
                >
                  {editingProject
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

      {/* Delete Modal */}
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
                  ? "هل أنت متأكد من حذف هذا المشروع؟"
                  : "Are you sure you want to delete this project?"}
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border rounded-xl"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl"
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
