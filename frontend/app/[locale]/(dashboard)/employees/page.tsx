/* eslint-disable */
"use client";

import { useToast } from "@/components/ui/Toast";
import { useParams } from "next/navigation";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui";
import { Can } from '@/components/Can';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  X,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  DollarSign,
  Search,
  Filter,
  Download,
  ArrowUpDown,
} from "lucide-react";
import PrintPdfButton from "@/components/shared/PrintPdfButton";
import { employeeService, type Employee, type CreateEmployeeData } from "@/services/employee.service";
import { printAsPDF } from "@/lib/printUtils";
import DataLoader from "@/components/shared/DataLoader";

export default function EmployeesPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "salary" | "hireDate">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [form, setForm] = useState({
    name: "",
    code: "",
    nationalId: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    hireDate: new Date().toISOString().split("T")[0],
    salary: 0,
  });

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const data = await employeeService.list();
      setEmployees(data);
    } catch {
      showToast(isArabic ? "حدث خطأ في تحميل البيانات" : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const statusOptions = [
    { value: "all", label: isArabic ? "الكل" : "All" },
    { value: "active", label: isArabic ? "نشط" : "Active" },
    { value: "inactive", label: isArabic ? "غير نشط" : "Inactive" },
  ];

  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = [...employees];
    if (roleFilter !== "all") {
      filtered = filtered.filter((emp) => emp.status === roleFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.fullName.toLowerCase().includes(term) ||
          emp.email.toLowerCase().includes(term) ||
          emp.phone.includes(term) ||
          emp.code.toLowerCase().includes(term)
      );
    }
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") comparison = a.fullName.localeCompare(b.fullName);
      else if (sortBy === "salary")
        comparison = (a.salary || 0) - (b.salary || 0);
      else if (sortBy === "hireDate")
        comparison = (a.hireDate ?? "").localeCompare(b.hireDate ?? "");
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return filtered;
  }, [employees, searchTerm, roleFilter, sortBy, sortOrder]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    []
  );

  const openAddModal = useCallback(() => {
    setEditingEmployee(null);
    setForm({
      name: "",
      code: "",
      nationalId: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      hireDate: new Date().toISOString().split("T")[0],
      salary: 0,
    });
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((employee: Employee) => {
    setEditingEmployee(employee);
    setForm({
      name: employee.fullName,
      code: employee.code ?? "",
      nationalId: employee.nationalId ?? "",
      email: employee.email,
      phone: employee.phone,
      address: employee.address ?? "",
      notes: employee.notes ?? "",
      hireDate: employee.hireDate ? employee.hireDate.split("T")[0] : new Date().toISOString().split("T")[0],
      salary: employee.salary || 0,
    });
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const payload: CreateEmployeeData = {
          fullName: form.name,
          nationalId: form.nationalId || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          address: form.address || undefined,
          notes: form.notes || undefined,
          hireDate: form.hireDate || undefined,
          salary: Number(form.salary) || 0,
          code: form.code || form.name.replace(/\s+/g, '_').toLowerCase(),
        };
        if (editingEmployee) {
          await employeeService.update(editingEmployee.id, payload);
          showToast(isArabic ? "تم تحديث بيانات الموظف" : "Employee updated", "success");
        } else {
          await employeeService.create(payload);
          showToast(isArabic ? "تم إضافة الموظف بنجاح" : "Employee added", "success");
        }
        setShowModal(false);
        setEditingEmployee(null);
        await fetchEmployees();
      } catch {
        showToast(isArabic ? "حدث خطأ في حفظ البيانات" : "Failed to save data", "error");
      }
    },
    [form, editingEmployee, isArabic, fetchEmployees]
  );

  const handleDelete = useCallback(async () => {
    if (deletingId) {
      try {
        await employeeService.remove(deletingId);
        showToast(isArabic ? "تم حذف الموظف" : "Employee deleted", "success");
        setShowDeleteConfirm(false);
        setDeletingId(null);
        await fetchEmployees();
      } catch {
        showToast(isArabic ? "حدث خطأ في حذف البيانات" : "Failed to delete data", "error");
      }
    }
  }, [deletingId, isArabic, fetchEmployees]);

  const handlePrintPDF = useCallback((logoUrl?: string) => {
    const headers = [
      isArabic ? "الاسم" : "Name",
      isArabic ? "الكود" : "Code",
      isArabic ? "البريد الإلكتروني" : "Email",
      isArabic ? "الهاتف" : "Phone",
      isArabic ? "الحالة" : "Status",
      isArabic ? "تاريخ التعيين" : "Hire Date",
      isArabic ? "المرتب" : "Salary",
    ];
    const rows = filteredAndSortedEmployees.map((emp) => [
      emp.fullName,
      emp.code,
      emp.email,
      emp.phone,
      emp.status === "active" ? (isArabic ? "نشط" : "Active") : (isArabic ? "غير نشط" : "Inactive"),
      emp.hireDate || "—",
      `${emp.salary?.toLocaleString() || 0} ${isArabic ? "ج.م" : "EGP"}`,
    ]);
    printAsPDF(
      rows,
      headers,
      isArabic ? "تقرير الموظفين" : "Employees Report",
      isArabic,
      { logoUrl }
    );
  }, [filteredAndSortedEmployees, isArabic]);

  const exportToExcel = useCallback(() => {
    const headers = [
      isArabic ? "الاسم" : "Name",
      isArabic ? "الكود" : "Code",
      isArabic ? "البريد الإلكتروني" : "Email",
      isArabic ? "الهاتف" : "Phone",
      isArabic ? "الحالة" : "Status",
      isArabic ? "تاريخ التعيين" : "Hire Date",
      isArabic ? "المرتب" : "Salary",
    ];
    const rows = filteredAndSortedEmployees.map((emp) => [
      emp.fullName,
      emp.code,
      emp.email,
      emp.phone,
      emp.status === "active" ? (isArabic ? "نشط" : "Active") : (isArabic ? "غير نشط" : "Inactive"),
      emp.hireDate ?? "",
      emp.salary || 0,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute(
      "download",
      `employees_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isArabic ? "تم تصدير البيانات" : "Data exported", "success");
  }, [filteredAndSortedEmployees, isArabic]);

  const toggleSort = useCallback(
    (field: "name" | "salary" | "hireDate") => {
      if (sortBy === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      else {
        setSortBy(field);
        setSortOrder("asc");
      }
    },
    [sortBy, sortOrder]
  );

  return (
    <div className="min-h-screen bg-gray-light">
      {ToastComponent}
      <div className="bg-surface border-b px-6 py-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {isArabic ? "الموظفين" : "Employees"}
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              {isArabic
                ? "إدارة بيانات الموظفين والصلاحيات"
                : "Manage employee data and permissions"}
            </p>
          </div>
          <div className="flex gap-2">
            <PrintPdfButton label={isArabic ? "طباعة PDF" : "Print PDF"} onPrint={handlePrintPDF} />
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 border border-success-dark text-success-dark rounded-lg hover:bg-success-dark hover:text-white transition"
            >
              <Download size={18} /> {isArabic ? "تصدير Excel" : "Export Excel"}
            </button>
            <Can permission="employees.create">
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
              >
                <Plus size={18} /> {isArabic ? "إضافة موظف" : "Add Employee"}
              </button>
            </Can>
          </div>
        </div>
      </div>

      <div className="bg-surface border-b px-6 py-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
              <input
                type="text"
                placeholder={isArabic ? "بحث..." : "Search..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 pl-4 py-2 border border-border rounded-lg w-64 focus:outline-none focus:border-gold"
              />
            </div>
            <div className="relative">
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="pr-10 pl-4 py-2 border border-border rounded-lg appearance-none focus:outline-none focus:border-gold"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-text-secondary">
              {isArabic ? "ترتيب حسب:" : "Sort by:"}
            </span>
            <button
              onClick={() => toggleSort("name")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition ${
                sortBy === "name"
                  ? "bg-gold text-white"
                  : "bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary"
              }`}
            >
              {isArabic ? "الاسم" : "Name"} <ArrowUpDown size={14} />
            </button>
            <button
              onClick={() => toggleSort("salary")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition ${
                sortBy === "salary"
                  ? "bg-gold text-white"
                  : "bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary"
              }`}
            >
              {isArabic ? "المرتب" : "Salary"} <ArrowUpDown size={14} />
            </button>
            <button
              onClick={() => toggleSort("hireDate")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition ${
                sortBy === "hireDate"
                  ? "bg-gold text-white"
                  : "bg-surface-tertiary text-text-secondary hover:bg-surface-tertiary"
              }`}
            >
              {isArabic ? "تاريخ التعيين" : "Hire Date"}{" "}
              <ArrowUpDown size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-3">
        <p className="text-sm text-text-secondary">
          {loading
            ? (isArabic ? "جاري التحميل..." : "Loading...")
            : isArabic
              ? `عرض ${filteredAndSortedEmployees.length} من ${employees.length} موظف`
              : `Showing ${filteredAndSortedEmployees.length} of ${employees.length} employees`}
        </p>
      </div>

      <div className="p-6 pt-0">
        {loading ? (
          <DataLoader />
        ) : filteredAndSortedEmployees.length === 0 ? (
          <Card className="p-12 text-center">
            <Users size={64} className="mx-auto text-text-muted mb-4" />
            <p className="text-text-secondary">
              {isArabic
                ? "لا يوجد موظفين مطابقين للبحث"
                : "No matching employees found"}
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedEmployees.map((emp) => (
              <Card key={emp.id} hover className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-primary">
                        {emp.fullName}
                      </h3>
                      <p className="text-sm text-text-muted">{emp.code}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Can permission="employees.update">
                      <button
                        onClick={() => openEditModal(emp)}
                        className="p-1 text-text-muted hover:text-info"
                      >
                        <Edit2 size={16} />
                      </button>
                    </Can>
                    <Can permission="employees.delete">
                      <button
                        onClick={() => {
                          setDeletingId(emp.id);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-1 text-text-muted hover:text-danger"
                      >
                        <Trash2 size={16} />
                      </button>
                    </Can>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-text-secondary">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gold" />
                    <span>{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gold" />
                    <span>{emp.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gold" />
                    <span>{emp.code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gold" />
                    <span>
                      {isArabic ? "تاريخ التعيين" : "Hire Date"}:{" "}
                      {emp.hireDate || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gold" />
                    <span>{emp.salary?.toLocaleString() || 0} ج.م</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border-light flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    emp.status === "active"
                      ? "bg-success-light text-success-dark"
                      : "bg-danger-light text-danger-dark"
                  }`}>
                    {emp.status === "active"
                      ? (isArabic ? "نشط" : "Active")
                      : (isArabic ? "غير نشط" : "Inactive")}
                  </span>
                  {emp.notes && <span className="text-xs text-text-muted truncate max-w-[150px]">{emp.notes}</span>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-primary">
                {editingEmployee
                  ? isArabic
                    ? "تعديل بيانات الموظف"
                    : "Edit Employee"
                  : isArabic
                  ? "إضافة موظف جديد"
                  : "Add New Employee"}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X size={24} className="text-text-muted" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{isArabic ? "الاسم بالكامل" : "Full Name"}</label>
                <input
                  type="text"
                  name="name"
                  placeholder={isArabic ? "أحمد محمد" : "Ahmed Mohamed"}
                  value={form.name}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{isArabic ? "كود الموظف" : "Employee Code"}</label>
                <input
                  type="text"
                  name="code"
                  placeholder={isArabic ? "EMP-001" : "EMP-001"}
                  value={form.code}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{isArabic ? "البريد الإلكتروني" : "Email"}</label>
                <input
                  type="email"
                  name="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{isArabic ? "رقم الهاتف" : "Phone"}</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder={isArabic ? "01001234567" : "01001234567"}
                  value={form.phone}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{isArabic ? "الرقم القومي" : "National ID"}</label>
                <input
                  type="text"
                  name="nationalId"
                  placeholder={isArabic ? "14 رقم" : "14 digits"}
                  value={form.nationalId}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{isArabic ? "العنوان" : "Address"}</label>
                <input
                  type="text"
                  name="address"
                  placeholder={isArabic ? "القاهرة" : "Cairo"}
                  value={form.address}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{isArabic ? "تاريخ التعيين" : "Hire Date"}</label>
                <input
                  type="date"
                  name="hireDate"
                  value={form.hireDate}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{isArabic ? "المرتب" : "Salary"}</label>
                <input
                  type="number"
                  name="salary"
                  min="0"
                  step="1"
                  placeholder={isArabic ? "5000" : "5000"}
                  value={form.salary ?? ""}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{isArabic ? "ملاحظات" : "Notes"}</label>
                <textarea
                  name="notes"
                  placeholder={isArabic ? "ملاحظات إضافية..." : "Additional notes..."}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-3 border rounded-xl"
                  rows={2}
                />
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
                  {editingEmployee
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
                  ? "هل أنت متأكد من حذف هذا الموظف؟"
                  : "Are you sure you want to delete this employee?"}
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
