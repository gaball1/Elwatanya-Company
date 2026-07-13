/* eslint-disable */
"use client";

import { useToast } from "@/components/ui/Toast";
import { useParams } from "next/navigation";
import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui";
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
  Printer,
} from "lucide-react";
import { mockEmployees } from "@/lib/mockData";
import { printAsPDF } from "@/lib/printUtils";

export default function EmployeesPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [employees, setEmployees] = useState([...mockEmployees]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "salary" | "hireDate">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [form, setForm] = useState({
    name: "",
    role: "",
    roleKey: "employee",
    email: "",
    phone: "",
    project: "",
    hireDate: new Date().toISOString().split("T")[0],
    salary: 0,
  });

  const roleOptions = [
    { value: "all", label: isArabic ? "الكل" : "All" },
    { value: "ceo", label: isArabic ? "مدير الشركة" : "CEO" },
    {
      value: "technical_office",
      label: isArabic ? "مدير المكتب الفني" : "Technical Office Manager",
    },
    {
      value: "site_engineer",
      label: isArabic ? "مهندس موقع" : "Site Engineer",
    },
    { value: "accountant", label: isArabic ? "محاسب" : "Accountant" },
    {
      value: "store_manager",
      label: isArabic ? "مدير مخازن" : "Store Manager",
    },
    { value: "employee", label: isArabic ? "موظف" : "Employee" },
  ];

  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = [...employees];
    if (roleFilter !== "all") {
      filtered = filtered.filter((emp) => emp.roleKey === roleFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.name.toLowerCase().includes(term) ||
          emp.email.toLowerCase().includes(term) ||
          emp.phone.includes(term)
      );
    }
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") comparison = a.name.localeCompare(b.name);
      else if (sortBy === "salary")
        comparison = (a.salary || 0) - (b.salary || 0);
      else if (sortBy === "hireDate")
        comparison = (a.hireDate || "").localeCompare(b.hireDate || "");
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return filtered;
  }, [employees, searchTerm, roleFilter, sortBy, sortOrder]);

  const getRoleLabel = useCallback((roleKey: string) => {
    return roleOptions.find((r) => r.value === roleKey)?.label || roleKey;
  }, []);

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
      role: "",
      roleKey: "employee",
      email: "",
      phone: "",
      project: "",
      hireDate: new Date().toISOString().split("T")[0],
      salary: 0,
    });
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((employee: any) => {
    setEditingEmployee(employee);
    setForm({
      name: employee.name,
      role: employee.role,
      roleKey: employee.roleKey,
      email: employee.email,
      phone: employee.phone,
      project: employee.project || "",
      hireDate: employee.hireDate || new Date().toISOString().split("T")[0],
      salary: employee.salary || 0,
    });
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const roleOption = roleOptions.find((r) => r.value === form.roleKey);
      if (editingEmployee) {
        setEmployees((prev) =>
          prev.map((emp) =>
            emp.id === editingEmployee.id
              ? { ...emp, ...form, role: roleOption?.label || form.roleKey }
              : emp
          )
        );
        showToast(
          isArabic ? "تم تحديث بيانات الموظف" : "Employee updated",
          "success"
        );
      } else {
        const newId = (employees.length + 1).toString();
        setEmployees((prev) => [
          ...prev,
          { id: newId, ...form, role: roleOption?.label || form.roleKey },
        ]);
        showToast(
          isArabic ? "تم إضافة الموظف بنجاح" : "Employee added",
          "success"
        );
      }
      setShowModal(false);
      setEditingEmployee(null);
    },
    [form, editingEmployee, employees.length, isArabic]
  );

  const handleDelete = useCallback(() => {
    if (deletingId) {
      setEmployees((prev) => prev.filter((emp) => emp.id !== deletingId));
      showToast(isArabic ? "تم حذف الموظف" : "Employee deleted", "success");
      setShowDeleteConfirm(false);
      setDeletingId(null);
    }
  }, [deletingId, isArabic]);

  const handlePrintPDF = useCallback(() => {
    const headers = [
      isArabic ? "الاسم" : "Name",
      isArabic ? "المنصب" : "Position",
      isArabic ? "البريد الإلكتروني" : "Email",
      isArabic ? "الهاتف" : "Phone",
      isArabic ? "المشروع" : "Project",
      isArabic ? "تاريخ التعيين" : "Hire Date",
      isArabic ? "المرتب" : "Salary",
    ];
    const rows = filteredAndSortedEmployees.map((emp: any) => [
      emp.name,
      emp.role,
      emp.email,
      emp.phone,
      emp.project || (isArabic ? "جميع المشاريع" : "All projects"),
      emp.hireDate || "—",
      `${emp.salary?.toLocaleString() || 0} ج.م`,
    ]);
    printAsPDF(
      rows,
      headers,
      isArabic ? "تقرير الموظفين" : "Employees Report",
      isArabic
    );
  }, [filteredAndSortedEmployees, isArabic]);

  const exportToExcel = useCallback(() => {
    const headers = [
      "الاسم",
      "المنصب",
      "البريد الإلكتروني",
      "الهاتف",
      "المشروع",
      "تاريخ التعيين",
      "المرتب",
    ];
    const rows = filteredAndSortedEmployees.map((emp: any) => [
      emp.name,
      emp.role,
      emp.email,
      emp.phone,
      emp.project || "جميع المشاريع",
      emp.hireDate || "",
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
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {isArabic ? "الموظفين" : "Employees"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isArabic
                ? "إدارة بيانات الموظفين والصلاحيات"
                : "Manage employee data and permissions"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-2 px-4 py-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition"
            >
              <Printer size={18} /> {isArabic ? "طباعة PDF" : "Print PDF"}
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition"
            >
              <Download size={18} /> {isArabic ? "تصدير Excel" : "Export Excel"}
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
            >
              <Plus size={18} /> {isArabic ? "إضافة موظف" : "Add Employee"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border-b px-6 py-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={isArabic ? "بحث..." : "Search..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 pl-4 py-2 border border-gray-200 rounded-lg w-64 focus:outline-none focus:border-gold"
              />
            </div>
            <div className="relative">
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="pr-10 pl-4 py-2 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:border-gold"
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-500">
              {isArabic ? "ترتيب حسب:" : "Sort by:"}
            </span>
            <button
              onClick={() => toggleSort("name")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition ${
                sortBy === "name"
                  ? "bg-gold text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {isArabic ? "الاسم" : "Name"} <ArrowUpDown size={14} />
            </button>
            <button
              onClick={() => toggleSort("salary")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition ${
                sortBy === "salary"
                  ? "bg-gold text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {isArabic ? "المرتب" : "Salary"} <ArrowUpDown size={14} />
            </button>
            <button
              onClick={() => toggleSort("hireDate")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition ${
                sortBy === "hireDate"
                  ? "bg-gold text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {isArabic ? "تاريخ التعيين" : "Hire Date"}{" "}
              <ArrowUpDown size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-3">
        <p className="text-sm text-gray-500">
          {isArabic
            ? `عرض ${filteredAndSortedEmployees.length} من ${employees.length} موظف`
            : `Showing ${filteredAndSortedEmployees.length} of ${employees.length} employees`}
        </p>
      </div>

      <div className="p-6 pt-0">
        {filteredAndSortedEmployees.length === 0 ? (
          <Card className="p-12 text-center">
            <Users size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
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
                        {emp.name}
                      </h3>
                      <p className="text-sm text-gold">{emp.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(emp)}
                      className="p-1 text-gray-400 hover:text-blue-500"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingId(emp.id);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-gray-500">
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
                    <span>
                      {emp.project ||
                        (isArabic ? "جميع المشاريع" : "All projects")}
                    </span>
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
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    {getRoleLabel(emp.roleKey)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                <X size={24} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <input
                type="text"
                name="name"
                placeholder={isArabic ? "الاسم بالكامل" : "Full Name"}
                value={form.name}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-xl"
                required
              />
              <select
                name="roleKey"
                value={form.roleKey}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-xl"
                required
              >
                {roleOptions
                  .filter((r) => r.value !== "all")
                  .map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
              </select>
              <input
                type="email"
                name="email"
                placeholder={isArabic ? "البريد الإلكتروني" : "Email"}
                value={form.email}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-xl"
                required
              />
              <input
                type="tel"
                name="phone"
                placeholder={isArabic ? "رقم الهاتف" : "Phone"}
                value={form.phone}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-xl"
                required
              />
              <input
                type="text"
                name="project"
                placeholder={isArabic ? "المشروع" : "Project"}
                value={form.project}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-xl"
              />
              <input
                type="date"
                name="hireDate"
                value={form.hireDate}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-xl"
              />
              <input
                type="number"
                name="salary"
                placeholder={isArabic ? "المرتب" : "Salary"}
                value={form.salary || ""}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-xl"
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
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-5 border-b">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "تأكيد الحذف" : "Confirm Delete"}
              </h2>
            </div>
            <div className="p-5">
              <p className="text-gray-600">
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
