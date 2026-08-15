/* eslint-disable */
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Button, Input, Dialog } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import {
  Search, Filter, Plus, UserCog, Shield, FolderKanban,
  CheckCircle, XCircle, Trash2, KeyRound, RefreshCw,
} from "lucide-react";
import { userService, roleService } from "@/services/user.service";
import { projectService } from "@/services/project.service";
import { employeeService, type Employee } from "@/services/employee.service";
import type { User, Role } from "@/services/user.service";
import type { Project } from "@/services/project.service";

export default function AdminUsersPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetPwdModal, setShowResetPwdModal] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form state
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", employeeId: "" });
  const [editForm, setEditForm] = useState<{ name: string; email: string; employeeId: string | null }>({ name: "", email: "", employeeId: null });
  const [resetPwdForm, setResetPwdForm] = useState({ newPassword: "" });
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, rolesData, projectsData, employeesData] = await Promise.all([
        userService.list(),
        roleService.list(),
        projectService.getProjects(),
        employeeService.list(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setProjects(projectsData);
      setEmployees(employeesData);
    } catch (err) {
      showToast(isArabic ? "فشل تحميل البيانات" : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredUsers = useMemo(() => {
    let result = [...users];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
      );
    }
    if (statusFilter) {
      result = result.filter((u) => u.status === statusFilter);
    }
    return result;
  }, [users, searchTerm, statusFilter]);

  const availableEmployees = useMemo(() => {
    const linkedIds = new Set(users.map((u) => u.employeeId).filter(Boolean) as string[]);
    return employees.filter((e) => !linkedIds.has(e.id));
  }, [employees, users]);

  const handleCreate = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      showToast(isArabic ? "يرجى ملء جميع الحقول" : "Please fill all fields", "error");
      return;
    }
    try {
      await userService.create({
        email: createForm.email,
        name: createForm.name,
        password: createForm.password,
        ...(createForm.employeeId ? { employeeId: createForm.employeeId } : {}),
      });
      showToast(isArabic ? "تم إنشاء المستخدم" : "User created", "success");
      setShowCreateModal(false);
      setCreateForm({ name: "", email: "", password: "", employeeId: "" });
      await loadData();
    } catch {
      showToast(isArabic ? "فشل إنشاء المستخدم" : "Failed to create user", "error");
    }
  };

  const handleEdit = async () => {
    if (!selectedUser) return;
    try {
      await userService.update(selectedUser.id, editForm);
      showToast(isArabic ? "تم تحديث المستخدم" : "User updated", "success");
      setShowEditModal(false);
      setSelectedUser(null);
      setEditForm({ name: "", email: "", employeeId: null });
      await loadData();
    } catch {
      showToast(isArabic ? "فشل تحديث المستخدم" : "Failed to update user", "error");
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await userService.remove(selectedUser.id);
      showToast(isArabic ? "تم حذف المستخدم" : "User deleted", "success");
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      await loadData();
    } catch {
      showToast(isArabic ? "فشل حذف المستخدم" : "Failed to delete user", "error");
    }
  };

  const handleActivate = async (user: User) => {
    try {
      await userService.activate(user.id);
      showToast(isArabic ? "تم تفعيل المستخدم" : "User activated", "success");
      await loadData();
    } catch {
      showToast(isArabic ? "فشل تفعيل المستخدم" : "Failed to activate user", "error");
    }
  };

  const handleDisable = async (user: User) => {
    try {
      await userService.disable(user.id);
      showToast(isArabic ? "تم تعطيل المستخدم" : "User disabled", "success");
      await loadData();
    } catch {
      showToast(isArabic ? "فشل تعطيل المستخدم" : "Failed to disable user", "error");
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !resetPwdForm.newPassword) return;
    try {
      await userService.resetPassword(selectedUser.id, resetPwdForm.newPassword);
      showToast(isArabic ? "تم إعادة تعيين كلمة المرور" : "Password reset", "success");
      setShowResetPwdModal(false);
      setResetPwdForm({ newPassword: "" });
      setSelectedUser(null);
    } catch {
      showToast(isArabic ? "فشل إعادة تعيين كلمة المرور" : "Failed to reset password", "error");
    }
  };

  const openRolesModal = (user: User) => {
    setSelectedUser(user);
    setSelectedRoleIds(user.roles.map((r) => r.id));
    setShowRolesModal(true);
  };

  const handleAssignRoles = async () => {
    if (!selectedUser) return;
    try {
      await userService.assignRoles(selectedUser.id, selectedRoleIds);
      showToast(isArabic ? "تم تعيين الصلاحيات" : "Roles assigned", "success");
      setShowRolesModal(false);
      setSelectedUser(null);
      await loadData();
    } catch {
      showToast(isArabic ? "فشل تعيين الصلاحيات" : "Failed to assign roles", "error");
    }
  };

  const openProjectsModal = (user: User) => {
    setSelectedUser(user);
    setSelectedProjectIds(user.projects.map((p) => p.id));
    setShowProjectsModal(true);
  };

  const handleAssignProjects = async () => {
    if (!selectedUser) return;
    try {
      await userService.assignProjects(selectedUser.id, selectedProjectIds);
      showToast(isArabic ? "تم تعيين المشاريع" : "Projects assigned", "success");
      setShowProjectsModal(false);
      setSelectedUser(null);
      await loadData();
    } catch {
      showToast(isArabic ? "فشل تعيين المشاريع" : "Failed to assign projects", "error");
    }
  };

  const toggleRoleId = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const toggleProjectId = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE": return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>;
      case "PENDING": return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</span>;
      case "DISABLED": return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Disabled</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {ToastComponent}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {isArabic ? "إدارة المستخدمين" : "User Management"}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {isArabic ? "إدارة المستخدمين والصلاحيات والمشاريع" : "Manage users, roles, and project assignments"}
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={18} /> {isArabic ? "مستخدم جديد" : "New User"}
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder={isArabic ? "بحث بالاسم أو البريد..." : "Search by name or email..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary"
            >
              <option value="">{isArabic ? "جميع الحالات" : "All status"}</option>
              <option value="ACTIVE">{isArabic ? "نشط" : "Active"}</option>
              <option value="PENDING">{isArabic ? "قيد الانتظار" : "Pending"}</option>
              <option value="DISABLED">{isArabic ? "موقوف" : "Disabled"}</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-secondary border-b border-border">
                <th className="text-right px-4 py-3 font-medium text-text-muted">{isArabic ? "الاسم" : "Name"}</th>
                <th className="text-right px-4 py-3 font-medium text-text-muted">{isArabic ? "الموظف" : "Employee"}</th>
                <th className="text-right px-4 py-3 font-medium text-text-muted">{isArabic ? "البريد" : "Email"}</th>
                <th className="text-right px-4 py-3 font-medium text-text-muted">{isArabic ? "الحالة" : "Status"}</th>
                <th className="text-right px-4 py-3 font-medium text-text-muted">{isArabic ? "الصلاحيات" : "Roles"}</th>
                <th className="text-right px-4 py-3 font-medium text-text-muted">{isArabic ? "المشاريع" : "Projects"}</th>
                <th className="text-right px-4 py-3 font-medium text-text-muted">{isArabic ? "تاريخ الإنشاء" : "Created"}</th>
                <th className="text-center px-4 py-3 font-medium text-text-muted">{isArabic ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-text-muted">
                    {isArabic ? "جاري التحميل..." : "Loading..."}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-text-muted">
                    {isArabic ? "لا يوجد مستخدمين" : "No users found"}
                  </td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-border hover:bg-surface-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-xs font-bold text-gold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">{user.name}</p>
                          <p className="text-xs text-text-muted">{user.roles.length > 0 ? user.roles.map(r => r.name).join(", ") : user.role}</p>
                        </div>
                      </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-text-secondary">
                      {user.employee?.fullName
                        ? `${user.employee.fullName}${user.employee.code ? ` (${user.employee.code})` : ""}`
                        : (isArabic ? "غير مرتبط" : "Not linked")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                  <td className="px-4 py-3">{statusBadge(user.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((r) => (
                        <span key={r.id} className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {r.name}
                        </span>
                      ))}
                      {user.roles.length === 0 && (
                        <span className="text-xs text-text-muted">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.projects.map((p) => (
                        <span key={p.id} className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          {p.name}
                        </span>
                      ))}
                      {user.projects.length === 0 && (
                        <span className="text-xs text-text-muted">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">
                    {new Date(user.createdAt).toLocaleDateString(isArabic ? "ar" : "en")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => { setSelectedUser(user); setEditForm({ name: user.name, email: user.email, employeeId: user.employeeId ?? null }); setShowEditModal(true); }}
                        className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-muted hover:text-text-primary transition-colors"
                        title={isArabic ? "تعديل" : "Edit"}
                      >
                        <UserCog size={16} />
                      </button>
                      {user.status === "ACTIVE" ? (
                        <button
                          onClick={() => handleDisable(user)}
                          className="p-1.5 rounded-lg hover:bg-surface-secondary text-amber-500 hover:text-amber-600 transition-colors"
                          title={isArabic ? "تعطيل" : "Disable"}
                        >
                          <XCircle size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(user)}
                          className="p-1.5 rounded-lg hover:bg-surface-secondary text-green-500 hover:text-green-600 transition-colors"
                          title={isArabic ? "تفعيل" : "Activate"}
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => { setSelectedUser(user); setResetPwdForm({ newPassword: "" }); setShowResetPwdModal(true); }}
                        className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-muted hover:text-text-primary transition-colors"
                        title={isArabic ? "إعادة تعيين كلمة المرور" : "Reset Password"}
                      >
                        <KeyRound size={16} />
                      </button>
                      <button
                        onClick={() => openRolesModal(user)}
                        className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-muted hover:text-text-primary transition-colors"
                        title={isArabic ? "تعيين الصلاحيات" : "Assign Roles"}
                      >
                        <Shield size={16} />
                      </button>
                      <button
                        onClick={() => openProjectsModal(user)}
                        className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-muted hover:text-text-primary transition-colors"
                        title={isArabic ? "تعيين المشاريع" : "Assign Projects"}
                      >
                        <FolderKanban size={16} />
                      </button>
                      <button
                        onClick={() => { setSelectedUser(user); setShowDeleteConfirm(true); }}
                        className="p-1.5 rounded-lg hover:bg-surface-secondary text-danger hover:text-danger/80 transition-colors"
                        title={isArabic ? "حذف" : "Delete"}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create User Modal */}
      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-bold">{isArabic ? "مستخدم جديد" : "New User"}</h2>
          <Input placeholder={isArabic ? "الاسم" : "Name"} value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
          <Input placeholder={isArabic ? "البريد الإلكتروني" : "Email"} type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
          <Input placeholder={isArabic ? "كلمة المرور" : "Password"} type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              {isArabic ? "ربط الموظف (اختياري)" : "Link Employee (optional)"}
            </label>
            <select
              value={createForm.employeeId}
              onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary"
            >
              <option value="">{isArabic ? "— بدون ربط —" : "— Not linked —"}</option>
              {availableEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName}{emp.code ? ` (${emp.code})` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-muted mt-1">
              {isArabic ? "يربط حساب المستخدم بملف الموظف ليتمكن من تسجيل الحضور الذاتي" : "Links the account to an employee so they can self-record attendance"}
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleCreate}>{isArabic ? "إنشاء" : "Create"}</Button>
          </div>
        </div>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)}>
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-bold">{isArabic ? "تعديل المستخدم" : "Edit User"}</h2>
          <Input placeholder={isArabic ? "الاسم" : "Name"} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input placeholder={isArabic ? "البريد الإلكتروني" : "Email"} type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              {isArabic ? "ربط الموظف" : "Link Employee"}
            </label>
            <select
              value={editForm.employeeId ?? ""}
              onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value || null })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary"
            >
              <option value="">{isArabic ? "— بدون ربط —" : "— Not linked —"}</option>
              {[...availableEmployees.filter((emp) => emp.id !== editForm.employeeId), ...(editForm.employeeId ? employees.filter((emp) => emp.id === editForm.employeeId) : [])].map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName}{emp.code ? ` (${emp.code})` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-muted mt-1">
              {isArabic ? "يربط حساب المستخدم بملف الموظف ليتمكن من تسجيل الحضور الذاتي" : "Links the account to an employee so they can self-record attendance"}
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleEdit}>{isArabic ? "حفظ" : "Save"}</Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-bold text-danger">{isArabic ? "حذف المستخدم" : "Delete User"}</h2>
          <p className="text-text-secondary">
            {isArabic
              ? `هل أنت متأكد من حذف المستخدم "${selectedUser?.name}"؟`
              : `Are you sure you want to delete "${selectedUser?.name}"?`
            }
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleDelete} className="bg-danger hover:bg-danger/90">{isArabic ? "حذف" : "Delete"}</Button>
          </div>
        </div>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={showResetPwdModal} onClose={() => setShowResetPwdModal(false)}>
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-bold">{isArabic ? "إعادة تعيين كلمة المرور" : "Reset Password"}</h2>
          <p className="text-text-muted text-sm">
            {isArabic
              ? `إعادة تعيين كلمة المرور للمستخدم "${selectedUser?.name}"`
              : `Reset password for "${selectedUser?.name}"`
            }
          </p>
          <Input
            placeholder={isArabic ? "كلمة المرور الجديدة" : "New password"}
            type="password"
            value={resetPwdForm.newPassword}
            onChange={(e) => setResetPwdForm({ newPassword: e.target.value })}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowResetPwdModal(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleResetPassword}>{isArabic ? "تعيين" : "Reset"}</Button>
          </div>
        </div>
      </Dialog>

      {/* Assign Roles Modal */}
      <Dialog open={showRolesModal} onClose={() => setShowRolesModal(false)}>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <h2 className="text-lg font-bold">{isArabic ? "تعيين الصلاحيات" : "Assign Roles"}</h2>
          <p className="text-text-muted text-sm">
            {isArabic
              ? `اختر الصلاحيات للمستخدم "${selectedUser?.name}"`
              : `Select roles for "${selectedUser?.name}"`
            }
          </p>
          <div className="space-y-2">
            {roles.map((role) => (
              <label key={role.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-secondary cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selectedRoleIds.includes(role.id)}
                  onChange={() => toggleRoleId(role.id)}
                  className="w-4 h-4 rounded border-border accent-gold"
                />
                <div>
                  <p className="text-sm font-medium text-text-primary">{role.name}</p>
                  {role.description && <p className="text-xs text-text-muted">{role.description}</p>}
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowRolesModal(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleAssignRoles}>{isArabic ? "حفظ" : "Save"}</Button>
          </div>
        </div>
      </Dialog>

      {/* Assign Projects Modal */}
      <Dialog open={showProjectsModal} onClose={() => setShowProjectsModal(false)}>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <h2 className="text-lg font-bold">{isArabic ? "تعيين المشاريع" : "Assign Projects"}</h2>
          <p className="text-text-muted text-sm">
            {isArabic
              ? `اختر المشاريع للمستخدم "${selectedUser?.name}"`
              : `Select projects for "${selectedUser?.name}"`
            }
          </p>
          <div className="space-y-2">
            {projects.map((project) => (
              <label key={project.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-secondary cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selectedProjectIds.includes(project.id)}
                  onChange={() => toggleProjectId(project.id)}
                  className="w-4 h-4 rounded border-border accent-gold"
                />
                <div>
                  <p className="text-sm font-medium text-text-primary">{project.name}</p>
                  <p className="text-xs text-text-muted">{project.code} - {project.location}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowProjectsModal(false)}>{isArabic ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleAssignProjects}>{isArabic ? "حفظ" : "Save"}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
