"use client";

import { useToast } from "@/components/ui/Toast";
import { useParams } from "next/navigation";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui";
import { Can } from '@/components/Can';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
} from "lucide-react";
import { roleService, fetchAllPermissions, type Role, type PermissionInfo } from "@/services/role.service";
import { Permissions } from "@/lib/permissions";

const PERMISSION_LABELS: Record<string, { labelAr: string; labelEn: string }> = {
  "projects.read": { labelAr: "عرض المشاريع", labelEn: "Read Projects" },
  "projects.create": { labelAr: "إنشاء مشاريع", labelEn: "Create Projects" },
  "projects.update": { labelAr: "تعديل مشاريع", labelEn: "Update Projects" },
  "projects.delete": { labelAr: "حذف مشاريع", labelEn: "Delete Projects" },
  "buildings.read": { labelAr: "عرض المباني", labelEn: "Read Buildings" },
  "buildings.create": { labelAr: "إنشاء مباني", labelEn: "Create Buildings" },
  "buildings.update": { labelAr: "تعديل مباني", labelEn: "Update Buildings" },
  "buildings.delete": { labelAr: "حذف مباني", labelEn: "Delete Buildings" },
  "employer-boq.read": { labelAr: "عرض موازنة المالك", labelEn: "Read Employer BOQ" },
  "employer-boq.write": { labelAr: "تعديل موازنة المالك", labelEn: "Write Employer BOQ" },
  "analytical-boq.read": { labelAr: "عرض الموازنة التحليلية", labelEn: "Read Analytical BOQ" },
  "analytical-boq.write": { labelAr: "تعديل الموازنة التحليلية", labelEn: "Write Analytical BOQ" },
  "analytical-boq.import": { labelAr: "استيراد موازنة تحليلية", labelEn: "Import Analytical BOQ" },
  "final-boq.read": { labelAr: "عرض الموازنة النهائية", labelEn: "Read Final BOQ" },
  "final-boq.write": { labelAr: "تعديل الموازنة النهائية", labelEn: "Write Final BOQ" },
  "final-boq.sync": { labelAr: "مزامنة الموازنة النهائية", labelEn: "Sync Final BOQ" },
  "final-boq.import": { labelAr: "استيراد موازنة نهائية", labelEn: "Import Final BOQ" },
  "final-boq.analyze": { labelAr: "تحليل الموازنة النهائية", labelEn: "Analyze Final BOQ" },
  "final-boq.manage-components": { labelAr: "إدارة مكونات الموازنة", labelEn: "Manage Final BOQ Components" },
  "contractor-boq.read": { labelAr: "عرض موازنة المقاول", labelEn: "Read Contractor BOQ" },
  "contractor-boq.write": { labelAr: "تعديل موازنة المقاول", labelEn: "Write Contractor BOQ" },
  "contractor-boq.allocate": { labelAr: "توزيع موازنة المقاول", labelEn: "Allocate Contractor BOQ" },
  "distribution.write": { labelAr: "توزيع بنود الموازنة", labelEn: "Write Distribution" },
  "extracts.read": { labelAr: "عرض الخلاصات", labelEn: "Read Extracts" },
  "extracts.write": { labelAr: "إنشاء وتعديل الخلاصات", labelEn: "Write Extracts" },
  "extracts.delete": { labelAr: "حذف الخلاصات", labelEn: "Delete Extracts" },
  "payments.read": { labelAr: "عرض المدفوعات", labelEn: "Read Payments" },
  "payments.write": { labelAr: "إنشاء المدفوعات", labelEn: "Write Payments" },
  "employees.read": { labelAr: "عرض الموظفين", labelEn: "Read Employees" },
  "employees.create": { labelAr: "إنشاء موظفين", labelEn: "Create Employees" },
  "employees.update": { labelAr: "تعديل موظفين", labelEn: "Update Employees" },
  "employees.delete": { labelAr: "حذف موظفين", labelEn: "Delete Employees" },
  "clients.read": { labelAr: "عرض العملاء", labelEn: "Read Clients" },
  "clients.create": { labelAr: "إنشاء عملاء", labelEn: "Create Clients" },
  "clients.update": { labelAr: "تعديل عملاء", labelEn: "Update Clients" },
  "clients.delete": { labelAr: "حذف عملاء", labelEn: "Delete Clients" },
  "subcontractors.read": { labelAr: "عرض المقاولين", labelEn: "Read Subcontractors" },
  "subcontractors.create": { labelAr: "إنشاء مقاولين", labelEn: "Create Subcontractors" },
  "subcontractors.update": { labelAr: "تعديل مقاولين", labelEn: "Update Subcontractors" },
  "subcontractors.delete": { labelAr: "حذف مقاولين", labelEn: "Delete Subcontractors" },
  "suppliers.read": { labelAr: "عرض الموردين", labelEn: "Read Suppliers" },
  "suppliers.create": { labelAr: "إنشاء موردين", labelEn: "Create Suppliers" },
  "suppliers.update": { labelAr: "تعديل موردين", labelEn: "Update Suppliers" },
  "suppliers.delete": { labelAr: "حذف موردين", labelEn: "Delete Suppliers" },
  "users.read": { labelAr: "عرض المستخدمين", labelEn: "Read Users" },
  "users.create": { labelAr: "إنشاء مستخدمين", labelEn: "Create Users" },
  "users.update": { labelAr: "تعديل مستخدمين", labelEn: "Update Users" },
  "users.delete": { labelAr: "حذف مستخدمين", labelEn: "Delete Users" },
  "users.assign-role": { labelAr: "تعيين صلاحيات", labelEn: "Assign Roles" },
  "users.assign-project": { labelAr: "تعيين مشروع", labelEn: "Assign Project" },
  "users.reset-password": { labelAr: "إعادة تعيين كلمة المرور", labelEn: "Reset Password" },
  "roles.read": { labelAr: "عرض الصلاحيات", labelEn: "Read Roles" },
  "roles.create": { labelAr: "إنشاء صلاحيات", labelEn: "Create Roles" },
  "roles.update": { labelAr: "تعديل صلاحيات", labelEn: "Update Roles" },
  "roles.delete": { labelAr: "حذف صلاحيات", labelEn: "Delete Roles" },
  "attendance.read": { labelAr: "عرض الحضور", labelEn: "Read Attendance" },
  "attendance.create": { labelAr: "تسجيل حضور", labelEn: "Create Attendance" },
  "attendance.update": { labelAr: "تعديل الحضور", labelEn: "Update Attendance" },
  "attendance.delete": { labelAr: "حذف الحضور", labelEn: "Delete Attendance" },
  "leaves.read": { labelAr: "عرض الإجازات", labelEn: "Read Leaves" },
  "leaves.create": { labelAr: "إنشاء إجازة", labelEn: "Create Leave" },
  "leaves.update": { labelAr: "تعديل الإجازات", labelEn: "Update Leaves" },
  "leaves.delete": { labelAr: "حذف الإجازات", labelEn: "Delete Leaves" },
  "holidays.read": { labelAr: "عرض العطلات", labelEn: "Read Holidays" },
  "holidays.create": { labelAr: "إنشاء عطلة", labelEn: "Create Holiday" },
  "holidays.update": { labelAr: "تعديل العطلات", labelEn: "Update Holidays" },
  "holidays.delete": { labelAr: "حذف العطلات", labelEn: "Delete Holidays" },
  "departments.read": { labelAr: "عرض الأقسام", labelEn: "Read Departments" },
  "departments.create": { labelAr: "إنشاء قسم", labelEn: "Create Department" },
  "departments.update": { labelAr: "تعديل الأقسام", labelEn: "Update Departments" },
  "departments.delete": { labelAr: "حذف الأقسام", labelEn: "Delete Departments" },
  "warehouses.read": { labelAr: "عرض المستودعات", labelEn: "Read Warehouses" },
  "warehouses.create": { labelAr: "إنشاء مستودعات", labelEn: "Create Warehouses" },
  "warehouses.update": { labelAr: "تعديل مستودعات", labelEn: "Update Warehouses" },
  "warehouses.delete": { labelAr: "حذف مستودعات", labelEn: "Delete Warehouses" },
  "categories.read": { labelAr: "عرض التصنيفات", labelEn: "Read Categories" },
  "categories.create": { labelAr: "إنشاء تصنيف", labelEn: "Create Category" },
  "categories.update": { labelAr: "تعديل التصنيفات", labelEn: "Update Categories" },
  "categories.delete": { labelAr: "حذف التصنيفات", labelEn: "Delete Categories" },
  "inventory.read": { labelAr: "عرض المخزون", labelEn: "Read Inventory" },
  "inventory.create": { labelAr: "إنشاء أصناف", labelEn: "Create Inventory" },
  "inventory.update": { labelAr: "تعديل الأصناف", labelEn: "Update Inventory" },
  "inventory.delete": { labelAr: "حذف الأصناف", labelEn: "Delete Inventory" },
  "stock-movements.read": { labelAr: "عرض حركة المخزون", labelEn: "Read Stock Movements" },
  "stock-movements.create": { labelAr: "إنشاء حركة مخزون", labelEn: "Create Stock Movement" },
  "stock-movements.update": { labelAr: "تعديل حركة المخزون", labelEn: "Update Stock Movement" },
  "stock-movements.delete": { labelAr: "حذف حركة المخزون", labelEn: "Delete Stock Movement" },
  "project-funds.read": { labelAr: "عرض صندوق المشروع", labelEn: "Read Project Funds" },
  "project-funds.create": { labelAr: "إنشاء صندوق مشروع", labelEn: "Create Project Fund" },
  "project-funds.update": { labelAr: "تعديل صندوق المشروع", labelEn: "Update Project Fund" },
  "project-funds.delete": { labelAr: "حذف صندوق المشروع", labelEn: "Delete Project Fund" },
  "fund-transactions.read": { labelAr: "عرض المعاملات المالية", labelEn: "Read Fund Transactions" },
  "fund-transactions.create": { labelAr: "إنشاء معاملة مالية", labelEn: "Create Fund Transaction" },
  "fund-transactions.update": { labelAr: "تعديل المعاملات المالية", labelEn: "Update Fund Transaction" },
  "fund-transactions.delete": { labelAr: "حذف المعاملات المالية", labelEn: "Delete Fund Transaction" },
  "purchases.read": { labelAr: "عرض المشتريات", labelEn: "Read Purchases" },
  "purchases.create": { labelAr: "إنشاء مشتريات", labelEn: "Create Purchase" },
  "purchases.update": { labelAr: "تعديل المشتريات", labelEn: "Update Purchase" },
  "purchases.delete": { labelAr: "حذف المشتريات", labelEn: "Delete Purchase" },
  "miscellaneous.read": { labelAr: "عرض المصروفات المتنوعة", labelEn: "Read Miscellaneous" },
  "miscellaneous.create": { labelAr: "إنشاء مصروفات متنوعة", labelEn: "Create Miscellaneous" },
  "miscellaneous.update": { labelAr: "تعديل المصروفات", labelEn: "Update Miscellaneous" },
  "miscellaneous.delete": { labelAr: "حذف المصروفات", labelEn: "Delete Miscellaneous" },
  "notifications.read": { labelAr: "عرض الإشعارات", labelEn: "Read Notifications" },
  "notifications.create": { labelAr: "إنشاء إشعار", labelEn: "Create Notification" },
  "notifications.update": { labelAr: "تعديل الإشعارات", labelEn: "Update Notification" },
  "notifications.delete": { labelAr: "حذف الإشعارات", labelEn: "Delete Notification" },
  "project-boards.read": { labelAr: "عرض لوحات المشاريع", labelEn: "Read Project Boards" },
  "project-boards.create": { labelAr: "إنشاء لوحة مشروع", labelEn: "Create Project Board" },
  "project-boards.update": { labelAr: "تعديل لوحات المشاريع", labelEn: "Update Project Board" },
  "project-boards.delete": { labelAr: "حذف لوحات المشاريع", labelEn: "Delete Project Board" },
  "client-statements.read": { labelAr: "عرض كشوف العملاء", labelEn: "Read Client Statements" },
  "client-statements.create": { labelAr: "إنشاء كشف عميل", labelEn: "Create Client Statement" },
  "client-statements.update": { labelAr: "تعديل كشوف العملاء", labelEn: "Update Client Statement" },
  "client-statements.delete": { labelAr: "حذف كشوف العملاء", labelEn: "Delete Client Statement" },
  "subcontractor-statements.read": { labelAr: "عرض كشوف المقاولين", labelEn: "Read Subcontractor Statements" },
  "subcontractor-statements.create": { labelAr: "إنشاء كشف مقاول", labelEn: "Create Subcontractor Statement" },
  "subcontractor-statements.update": { labelAr: "تعديل كشوف المقاولين", labelEn: "Update Subcontractor Statement" },
  "subcontractor-statements.delete": { labelAr: "حذف كشوف المقاولين", labelEn: "Delete Subcontractor Statement" },
  "profile.read": { labelAr: "عرض الملف الشخصي", labelEn: "Read Profile" },
  "profile.update": { labelAr: "تعديل الملف الشخصي", labelEn: "Update Profile" },
  "profile.change-password": { labelAr: "تغيير كلمة المرور", labelEn: "Change Password" },
  "audit.view": { labelAr: "عرض سجل التدقيق", labelEn: "View Audit Log" },
  "recycle-bin.view": { labelAr: "عرض سلة المحذوفات", labelEn: "View Recycle Bin" },
  "recycle-bin.restore": { labelAr: "استعادة العناصر المحذوفة", labelEn: "Restore Deleted Items" },
  "recycle-bin.delete": { labelAr: "حذف نهائي من السلة", labelEn: "Permanently Delete" },
  "approvals.read": { labelAr: "عرض طلبات الموافقة", labelEn: "Read Approvals" },
  "approvals.create": { labelAr: "إنشاء طلب موافقة", labelEn: "Create Approval Request" },
  "approvals.approve": { labelAr: "الموافقة على الطلبات", labelEn: "Approve Requests" },
  "approvals.reject": { labelAr: "رفض الطلبات", labelEn: "Reject Requests" },
};

export default function RolesPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [allPerms, setAllPerms] = useState<PermissionInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", permissionIds: [] as string[] });

  const allPermsByName = useMemo(() => {
    const map: Record<string, PermissionInfo> = {};
    for (const p of allPerms) {
      map[p.name] = p;
    }
    return map;
  }, [allPerms]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesData, permsData] = await Promise.all([
        roleService.list(),
        fetchAllPermissions(),
      ]);
      setRoles(rolesData);
      setAllPerms(permsData);
    } catch {
      showToast(isArabic ? "فشل تحميل البيانات" : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredRoles = useMemo(() => {
    if (!searchTerm) return roles;
    const term = searchTerm.toLowerCase();
    return roles.filter((r) => r.name.toLowerCase().includes(term) || (r.description || "").toLowerCase().includes(term));
  }, [roles, searchTerm]);

  const openAddModal = () => {
    setEditingRole(null);
    setForm({ name: "", description: "", permissionIds: [] });
    setShowModal(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      description: role.description || "",
      permissionIds: (role.permissions || []).map((p) => p.id),
    });
    setShowModal(true);
  };

  const togglePermission = (permId: string) => {
    setForm((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permId)
        ? prev.permissionIds.filter((id) => id !== permId)
        : [...prev.permissionIds, permId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      showToast(isArabic ? "الاسم مطلوب" : "Name is required", "error");
      return;
    }
    try {
      if (editingRole) {
        await roleService.update(editingRole.id, {
          name: form.name,
          description: form.description,
          permissionIds: form.permissionIds,
        });
        showToast(isArabic ? "تم تحديث الصلاحية" : "Role updated", "success");
      } else {
        await roleService.create({
          name: form.name,
          description: form.description,
          permissionIds: form.permissionIds,
        });
        showToast(isArabic ? "تم إنشاء الصلاحية" : "Role created", "success");
      }
      setShowModal(false);
      setEditingRole(null);
      await loadData();
    } catch {
      showToast(isArabic ? "فشل حفظ الصلاحية" : "Failed to save role", "error");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await roleService.remove(deletingId);
      showToast(isArabic ? "تم حذف الصلاحية" : "Role deleted", "success");
      setShowDeleteConfirm(false);
      setDeletingId(null);
      await loadData();
    } catch {
      showToast(isArabic ? "فشل حذف الصلاحية" : "Failed to delete role", "error");
    }
  };

  const getPermissionLabel = (name: string) => {
    const found = PERMISSION_LABELS[name];
    if (!found) return name;
    return isArabic ? found.labelAr : found.labelEn;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {ToastComponent}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {isArabic ? "إدارة الصلاحيات" : "Roles & Permissions"}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {isArabic ? "إدارة أدوار الصلاحيات والتصاريح" : "Manage roles and permissions"}
          </p>
        </div>
        <Can permission={Permissions.Roles.Create}>
          <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
            <Plus size={18} /> {isArabic ? "صلاحية جديدة" : "New Role"}
          </button>
        </Can>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder={isArabic ? "بحث بالاسم..." : "Search by name..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-4 py-2 border border-border rounded-lg focus:outline-none focus:border-gold bg-surface text-text-primary"
          />
        </div>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-10 text-text-muted">
            {isArabic ? "جاري التحميل..." : "Loading..."}
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="col-span-full text-center py-10 text-text-muted">
            <Shield size={48} className="mx-auto mb-4 opacity-50" />
            <p>{isArabic ? "لا توجد صلاحيات" : "No roles found"}</p>
          </div>
        ) : filteredRoles.map((role) => (
          <Card key={role.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Shield size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">{role.name}</h3>
                  {role.description && (
                    <p className="text-xs text-text-muted">{role.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Can permission={Permissions.Roles.Update}>
                  <button onClick={() => openEditModal(role)} className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-muted hover:text-text-primary transition-colors">
                    <Edit2 size={16} />
                  </button>
                </Can>
                <Can permission={Permissions.Roles.Delete}>
                  <button onClick={() => { setDeletingId(role.id); setShowDeleteConfirm(true); }} className="p-1.5 rounded-lg hover:bg-surface-secondary text-danger hover:text-danger/80 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </Can>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {(role.permissions || []).slice(0, 6).map((p) => (
                <span key={p.id} className="px-2 py-0.5 rounded text-xs bg-gold/10 text-gold">
                  {getPermissionLabel(p.name)}
                </span>
              ))}
              {(role.permissions || []).length > 6 && (
                <span className="px-2 py-0.5 rounded text-xs bg-surface-tertiary text-text-muted">
                  +{role.permissions.length - 6}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-surface z-10">
              <h2 className="text-xl font-bold text-text-primary">
                {editingRole
                  ? isArabic ? "تعديل الصلاحية" : "Edit Role"
                  : isArabic ? "صلاحية جديدة" : "New Role"}
              </h2>
              <button onClick={() => setShowModal(false)}><X size={24} className="text-text-muted" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <input
                type="text"
                placeholder={isArabic ? "اسم الصلاحية" : "Role Name"}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full p-3 border rounded-xl"
                required
                maxLength={200}
              />
              <textarea
                placeholder={isArabic ? "الوصف" : "Description"}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full p-3 border rounded-xl resize-none"
                rows={2}
                maxLength={500}
              />
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-3">
                  {isArabic ? "الصلاحيات" : "Permissions"}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2 border border-border rounded-xl">
                  {allPerms.map((perm) => (
                    <label key={perm.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-secondary cursor-pointer transition-colors text-sm">
                      <input
                        type="checkbox"
                        checked={form.permissionIds.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        className="w-4 h-4 rounded border-border accent-gold"
                      />
                      <span className="text-text-primary">{getPermissionLabel(perm.name)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-xl">
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-xl">
                  {editingRole ? (isArabic ? "تحديث" : "Update") : (isArabic ? "حفظ" : "Save")}
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
              <h2 className="text-xl font-bold text-danger">{isArabic ? "تأكيد الحذف" : "Confirm Delete"}</h2>
            </div>
            <div className="p-5">
              <p className="text-text-secondary">
                {isArabic ? "هل أنت متأكد من حذف هذه الصلاحية؟" : "Are you sure you want to delete this role?"}
              </p>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 border rounded-xl">
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-danger text-white rounded-xl">
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