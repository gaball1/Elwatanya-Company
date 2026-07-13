/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import {
  FileText,
  Plus,
  Eye,
  Search,
  Filter,
  Edit2,
  Trash2,
  Download,
  ExternalLink,
} from "lucide-react";
import { mockClientStatements } from "@/lib/mockData";
import { useToast } from "@/components/ui/Toast";
import BackButton from "@/components/shared/BackButton";
import UploadFromDeviceButton, {
  type UploadedFileInfo,
} from "@/components/shared/UploadFromDeviceButton";

export default function ClientStatementsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();
  const [statements, setStatements] = useState([...mockClientStatements]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredStatements = useMemo(() => {
    let filtered = [...statements];
    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.statementNumber.toLowerCase().includes(term) ||
          s.clientName.toLowerCase().includes(term) ||
          s.projectName.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [statements, searchTerm, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return {
          text: isArabic ? "معتمد" : "Approved",
          className: "bg-green-100 text-green-800",
        };
      case "pending":
        return {
          text: isArabic ? "قيد الانتظار" : "Pending",
          className: "bg-yellow-100 text-yellow-800",
        };
      case "paid":
        return {
          text: isArabic ? "مدفوع" : "Paid",
          className: "bg-blue-100 text-blue-800",
        };
      default:
        return {
          text: isArabic ? "مسودة" : "Draft",
          className: "bg-gray-100 text-gray-600",
        };
    }
  };

  const handleDelete = () => {
    if (deletingId) {
      setStatements(statements.filter((s) => s.id !== deletingId));
      showToast(
        isArabic ? "تم حذف المستخلص بنجاح" : "Statement deleted successfully",
        "success"
      );
      setShowDeleteModal(false);
      setDeletingId(null);
    }
  };

  const handleUploadStatement = (file: UploadedFileInfo) => {
    const newStatement = {
      id: Date.now().toString(),
      statementNumber: `CS-UP-${Date.now()}`,
      projectId: "",
      projectName: isArabic ? "مرفوع من الجهاز" : "Uploaded from device",
      buildingId: "",
      buildingName: "—",
      clientId: "",
      clientName: file.name.replace(/\.[^/.]+$/, ""),
      date: new Date().toISOString().split("T")[0],
      status: "draft",
      totalWorkValue: 0,
      totalDeductions: 0,
      netPayable: 0,
      source: "device",
      uploadedFile: file,
      items: [],
      deductions: [],
      signatures: [],
    };
    setStatements([newStatement as (typeof statements)[number], ...statements]);
    showToast(
      isArabic ? "تم رفع المستخلص بنجاح" : "Statement uploaded successfully",
      "success"
    );
  };

  const exportToExcel = () => {
    const headers = [
      "رقم المستخلص",
      "العميل",
      "المشروع",
      "التاريخ",
      "إجمالي الأعمال",
      "الخصومات",
      "الصافي",
      "الحالة",
    ];
    const rows = filteredStatements.map((s) => [
      s.statementNumber,
      s.clientName,
      s.projectName,
      s.date,
      s.totalWorkValue,
      s.totalDeductions,
      s.netPayable,
      s.status === "paid" ? "مدفوع" : s.status === "pending" ? "معلق" : "مسودة",
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
      `client-statements_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isArabic ? "تم تصدير البيانات" : "Data exported", "success");
  };

  return (
    <div className="min-h-screen bg-gray-light">
      {ToastComponent}

      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <BackButton fallbackHref={`/${locale}/admin`} />
            <div>
              <h1 className="text-2xl font-bold text-primary">
                {isArabic ? "مستخلصات جهة الإسناد" : "Client Statements"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {isArabic
                  ? "إدارة مستخلصات العملاء وجهات الإسناد"
                  : "Manage client statements"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <UploadFromDeviceButton
              isArabic={isArabic}
              onUpload={handleUploadStatement}
            />
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition"
            >
              <Download size={18} /> {isArabic ? "تصدير Excel" : "Export Excel"}
            </button>
            <Link href={`/${locale}/client-statements/new`}>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
                <Plus size={18} />{" "}
                {isArabic ? "إنشاء مستخلص" : "Create Statement"}
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={isArabic ? "بحث..." : "Search..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 pl-4 py-1.5 border border-gray-200 rounded-lg w-64 text-sm focus:outline-none focus:border-gold"
            />
          </div>
          <div className="relative">
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pr-10 pl-4 py-1.5 border border-gray-200 rounded-lg appearance-none text-sm focus:outline-none focus:border-gold"
            >
              <option value="all">{isArabic ? "الكل" : "All"}</option>
              <option value="draft">{isArabic ? "مسودة" : "Draft"}</option>
              <option value="pending">
                {isArabic ? "قيد الانتظار" : "Pending"}
              </option>
              <option value="approved">
                {isArabic ? "معتمد" : "Approved"}
              </option>
              <option value="paid">{isArabic ? "مدفوع" : "Paid"}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statements List */}
      <div className="p-6">
        <div className="space-y-4">
          {filteredStatements.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText size={64} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {isArabic ? "لا توجد مستخلصات" : "No statements found"}
              </p>
            </Card>
          ) : (
            filteredStatements.map((statement) => {
              const status = getStatusBadge(statement.status);
              return (
                <Card key={statement.id} hover className="p-5">
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-bold text-primary">
                          {statement.statementNumber}
                        </h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${status.className}`}
                        >
                          {status.text}
                        </span>
                        {(statement as any).source === "device" && (
                          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                            {isArabic ? "من الجهاز" : "From Device"}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm">
                        {isArabic ? "المشروع" : "Project"}:{" "}
                        {statement.projectName} ({statement.buildingName})
                      </p>
                      <p className="text-gray-600 text-sm">
                        {isArabic ? "العميل" : "Client"}: {statement.clientName}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {statement.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {statement.netPayable.toLocaleString()} ج.م
                      </p>
                      <p className="text-sm text-gray-500">
                        {isArabic ? "صافي المستحق" : "Net Payable"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {(statement as any).uploadedFile ? (
                        <a
                          href={(statement as any).uploadedFile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-500 hover:text-primary transition"
                          title={isArabic ? "عرض الملف" : "View File"}
                        >
                          <ExternalLink size={18} />
                        </a>
                      ) : (
                        <Link
                          href={`/${locale}/client-statements/${statement.id}`}
                        >
                          <button
                            className="p-2 text-gray-500 hover:text-primary transition"
                            title={isArabic ? "عرض" : "View"}
                          >
                            <Eye size={18} />
                          </button>
                        </Link>
                      )}
                      <Link
                        href={`/${locale}/client-statements/${statement.id}/edit`}
                      >
                        <button
                          className="p-2 text-gray-500 hover:text-blue-500 transition"
                          title={isArabic ? "تعديل" : "Edit"}
                        >
                          <Edit2 size={18} />
                        </button>
                      </Link>
                      <button
                        onClick={() => {
                          setDeletingId(statement.id);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 text-gray-500 hover:text-red-500 transition"
                        title={isArabic ? "حذف" : "Delete"}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
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
                  ? "هل أنت متأكد من حذف هذا المستخلص؟"
                  : "Are you sure you want to delete this statement?"}
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteModal(false)}
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
