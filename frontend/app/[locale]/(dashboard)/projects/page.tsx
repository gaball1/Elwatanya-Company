/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui";
import {
  Plus,
  X,
  Edit2,
  Trash2,
} from "lucide-react";
import { Can } from '@/components/Can';
import { projectService, type Project, type CreateProjectData } from '@/services/project.service';
import { useToast } from "@/components/ui/Toast";

export default function ProjectsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(
    null
  );
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await projectService.getProjects();
        setProjects(data);
      } catch (error) {
        console.error('Failed to fetch projects', error);
      }
    };
    fetchProjects();
  }, []);

  const [projectForm, setProjectForm] = useState({
    code: "",
    name: "",
    location: "",
    description: "",
    client: "",
    startDate: "",
    plannedDurationMonths: 24,
    status: "active",
    progress: 0,
  });

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setProjectForm((prev) => ({
        ...prev,
        [name]: name === "progress" || name === "plannedDurationMonths" ? (Number(value) || 0) : value,
      }));
    },
    []
  );

  const openAddModal = useCallback(() => {
    setEditingProject(null);
    setProjectForm({ code: "", name: "", location: "", description: "", client: "", startDate: "", plannedDurationMonths: 24, status: "active", progress: 0 });
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((project: Project) => {
    setEditingProject(project);
    setProjectForm({
      code: project.code || "",
      name: project.name,
      location: project.location || "",
      description: project.description || "",
      client: project.client || "",
      startDate: project.startDate ? project.startDate.split("T")[0] : "",
      plannedDurationMonths: project.plannedDurationMonths ?? 24,
      status: project.status || "active",
      progress: project.progress ?? 0,
    });
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const payload: CreateProjectData = {
          code: projectForm.code,
          name: projectForm.name,
          location: projectForm.location,
          description: projectForm.description,
          client: projectForm.client,
          startDate: projectForm.startDate || undefined,
          plannedDurationMonths: projectForm.plannedDurationMonths || undefined,
          status: projectForm.status,
          progress: projectForm.progress,
        };
        if (editingProject) {
          const { code: _, ...updatePayload } = payload;
          await projectService.updateProject(editingProject.id, updatePayload);
          showToast(isArabic ? "تم تحديث المشروع" : "Project updated", "success");
        } else {
          await projectService.createProject(payload);
          showToast(isArabic ? "تم إضافة المشروع" : "Project added", "success");
        }
        const refreshed = await projectService.getProjects();
        setProjects(refreshed);
      } catch (error: any) {
        showToast(error?.message || (isArabic ? "حدث خطأ" : "An error occurred"), "error");
      }
      setShowModal(false);
      setEditingProject(null);
    },
    [editingProject, projectForm, isArabic]
  );

  const handleDelete = useCallback(async () => {
    if (deletingProjectId) {
      try {
        await projectService.deleteProject(deletingProjectId);
        const refreshed = await projectService.getProjects();
        setProjects(refreshed);
        showToast(isArabic ? "تم حذف المشروع" : "Project deleted", "success");
      } catch (error: any) {
        showToast(error?.message || "Error", "error");
      }
      setShowDeleteConfirm(false);
      setDeletingProjectId(null);
    }
  }, [deletingProjectId, isArabic]);

  return (
    <div>
      {ToastComponent}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">
          {isArabic ? "المشاريع" : "Projects"}
        </h1>
        <Can permission="projects.create">
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
          >
            <Plus size={18} />
            {isArabic ? "إضافة مشروع" : "Add Project"}
          </button>
        </Can>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project: Project) => (
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
                {project.code && (
                  <span className="text-xs px-2 py-1 rounded-full bg-surface-tertiary text-text-secondary font-mono">
                    {project.code}
                  </span>
                )}
                <Can permission="projects.update">
                  <button
                    onClick={() => openEditModal(project)}
                    className="p-1 text-text-muted hover:text-info"
                  >
                    <Edit2 size={16} />
                  </button>
                </Can>
                <Can permission="projects.delete">
                  <button
                    onClick={() => {
                      setDeletingProjectId(project.id);
                      setShowDeleteConfirm(true);
                    }}
                    className="p-1 text-text-muted hover:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                </Can>
              </div>
            </div>
            <Link href={`/${locale}/projects/${project.id}`}>
              <div className="space-y-1 text-xs text-text-secondary">
                {project.client && (
                  <p>{isArabic ? "العميل:" : "Client:"} {project.client}</p>
                )}
                {project.location && (
                  <p>{isArabic ? "الموقع:" : "Location:"} {project.location}</p>
                )}
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${project.status === "active" ? "bg-success" : project.status === "completed" ? "bg-info" : "bg-warning"}`} />
                  <span>{project.status === "active" ? (isArabic ? "نشط" : "Active") : project.status === "completed" ? (isArabic ? "مكتمل" : "Completed") : (isArabic ? "معلق" : "On Hold")}</span>
                  <span className="text-text-muted">— {project.progress}%</span>
                </div>
                <p className="text-text-muted mt-1">
                  {isArabic ? "تاريخ الإنشاء:" : "Created:"}{" "}
                  {project.createdAt ? new Date(project.createdAt).toLocaleDateString(isArabic ? "ar-EG" : "en-US") : "—"}
                </p>
              </div>
            </Link>
          </Card>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-primary">
                {editingProject
                  ? isArabic ? "تعديل المشروع" : "Edit Project"
                  : isArabic ? "إضافة مشروع جديد" : "Add New Project"}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X size={24} className="text-text-muted" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {!editingProject && (
                <input
                  type="text"
                  name="code"
                  placeholder={isArabic ? "كود المشروع (مثال: PRJ-001)" : "Project Code (e.g. PRJ-001)"}
                  value={projectForm.code}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-xl"
                  required
                  pattern="^[A-Za-z0-9][A-Za-z0-9_-]*$"
                  maxLength={50}
                />
              )}
              <input
                type="text"
                name="name"
                placeholder={isArabic ? "اسم المشروع" : "Project Name"}
                value={projectForm.name}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-xl"
                required
                maxLength={200}
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="client"
                  placeholder={isArabic ? "اسم العميل" : "Client Name"}
                  value={projectForm.client}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-xl"
                  maxLength={200}
                />
                <input
                  type="text"
                  name="location"
                  placeholder={isArabic ? "الموقع" : "Location"}
                  value={projectForm.location}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-xl"
                  maxLength={300}
                />
              </div>
              <textarea
                name="description"
                placeholder={isArabic ? "وصف المشروع" : "Project Description"}
                value={projectForm.description}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-xl"
                rows={3}
                maxLength={1000}
              />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <input
                    type="date"
                    name="startDate"
                    value={projectForm.startDate}
                    onChange={handleInputChange}
                    className="w-full p-3 border rounded-xl"
                  />
                  <span className="text-xs text-text-muted mt-1">{isArabic ? "تاريخ البدء" : "Start Date"}</span>
                </div>
                <select
                  name="status"
                  value={projectForm.status}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-xl"
                >
                  <option value="active">{isArabic ? "نشط" : "Active"}</option>
                  <option value="completed">{isArabic ? "مكتمل" : "Completed"}</option>
                  <option value="on_hold">{isArabic ? "معلق" : "On Hold"}</option>
                </select>
                <div>
                  <input
                    type="number"
                    name="progress"
                    min={0}
                    max={100}
                    value={projectForm.progress}
                    onChange={handleInputChange}
                    className="w-full p-3 border rounded-xl"
                  />
                  <span className="text-xs text-text-muted mt-1">{isArabic ? "نسبة الإنجاز %" : "Progress %"}</span>
                </div>
              </div>
              <div>
                <input
                  type="number"
                  name="plannedDurationMonths"
                  min={1}
                  max={480}
                  value={projectForm.plannedDurationMonths}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-xl"
                />
                <span className="text-xs text-text-muted mt-1">{isArabic ? "المدة المخططة للتنفيذ (شهر)" : "Planned Duration (months)"}</span>
              </div>
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
                    ? isArabic ? "تحديث" : "Update"
                    : isArabic ? "حفظ" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
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
                  className="flex-1 px-4 py-2 bg-danger text-white rounded-xl"
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
