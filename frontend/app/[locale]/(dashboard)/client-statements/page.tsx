/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useMemo, useEffect, useCallback } from "react";
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
import { clientStatementService, type ClientStatement } from "@/services/client-statement.service";
import { useToast } from "@/components/ui/Toast";
import BackButton from "@/components/shared/BackButton";
import UploadFromDeviceButton, {
  type UploadedFileInfo,
} from "@/components/shared/UploadFromDeviceButton";
import { Can } from "@/components/Can";

export default function ClientStatementsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();
  const [statements, setStatements] = useState<ClientStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchStatements = useCallback(async () => {
    try {
      setLoading(true);
      const data = await clientStatementService.list();
      setStatements(data);
    } catch {
      showToast(isArabic ? "حدث خطأ في تحميل البيانات" : "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => { fetchStatements(); }, [fetchStatements]);

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
          className: "bg-success-light text-success-dark",
        };
      case "pending":
        return {
          text: isArabic ? "قيد الانتظار" : "Pending",
          className: "bg-warning-light text-warning-dark",
        };
      case "paid":
        return {
          text: isArabic ? "مدفوع" : "Paid",
          className: "bg-info-light text-info-dark",
        };
      default:
        return {
          text: isArabic ? "مسودة" : "Draft",
          className: "bg-surface-tertiary text-text-secondary",
        };
    }
  };

  const handleDelete = async () => {
    if (deletingId) {
      try {
        await clientStatementService.remove(deletingId);
        await fetchStatements();
        showToast(
          isArabic ? "تم حذف المستخلص بنجاح" : "Statement deleted successfully",
          "success"
        );
      } catch {
        showToast(isArabic ? "حدث خطأ في الحذف" : "Delete failed", "error");
      }
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
      source: "device" as string,
      uploadedFile: file,
      items: [],
      deductions: [],
      signatures: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setStatements([newStatement as ClientStatement, ...statements]);
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
      <div className="bg-surface border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <BackButton fallbackHref={`/${locale}/admin`} />
            <div>
              <h1 className="text-2xl font-bold text-primary">
                {isArabic ? "مستخلصات جهة الإسناد" : "Client Statements"}
              </h1>
              <p className="text-sm text-text-secondary mt-1">
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
              className="flex items-center gap-2 px-4 py-2 border border-green-600 text-success-dark rounded-lg hover:bg-success-dark hover:text-white transition"
            >
              <Download size={18} /> {isArabic ? "تصدير Excel" : "Export Excel"}
            </button>
            <Can permission="client-statements.create">
              <Link href={`/${locale}/client-statements/new`}>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
                  <Plus size={18} />{" "}
                  {isArabic ? "إنشاء مستخلص" : "Create Statement"}
                </button>
              </Link>
            </Can>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface border-b px-6 py-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
            <input
              type="text"
              placeholder={isArabic ? "بحث..." : "Search..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 pl-4 py-1.5 border border-border rounded-lg w-64 text-sm focus:outline-none focus:border-gold"
            />
          </div>
          <div className="relative">
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pr-10 pl-4 py-1.5 border border-border rounded-lg appearance-none text-sm focus:outline-none focus:border-gold"
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
              <FileText size={64} className="mx-auto text-text-muted mb-4" />
              <p className="text-text-secondary">
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
                          <span className="text-xs px-2 py-1 rounded-full bg-info-light text-info-dark">
                            {isArabic ? "من الجهاز" : "From Device"}
                          </span>
                        )}
                      </div>
                      <p className="text-text-secondary text-sm">
                        {isArabic ? "المشروع" : "Project"}:{" "}
                        {statement.projectName} ({statement.buildingName})
                      </p>
                      <p className="text-text-secondary text-sm">
                        {isArabic ? "العميل" : "Client"}: {statement.clientName}
                      </p>
                      <p className="text-text-muted text-xs mt-1">
                        {statement.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {statement.netPayable.toLocaleString()} ج.م
                      </p>
                      <p className="text-sm text-text-secondary">
                        {isArabic ? "صافي المستحق" : "Net Payable"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {(statement as any).uploadedFile ? (
                        <a
                          href={(statement as any).uploadedFile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-text-secondary hover:text-primary transition"
                          title={isArabic ? "عرض الملف" : "View File"}
                        >
                          <ExternalLink size={18} />
                        </a>
                      ) : (
                        <Link
                          href={`/${locale}/client-statements/${statement.id}`}
                        >
                          <button
                            className="p-2 text-text-secondary hover:text-primary transition"
                            title={isArabic ? "عرض" : "View"}
                          >
                            <Eye size={18} />
                          </button>
                        </Link>
                      )}
                      <Can permission="client-statements.update">
                        {statement.status === "approved" ? (
                          <button
                            disabled
                            title={isArabic ? "لا يمكن تعديل مستخلص معتمد" : "Approved statement is locked"}
                            className="p-2 text-text-muted cursor-not-allowed"
                          >
                            <Edit2 size={18} />
                          </button>
                        ) : (
                          <Link
                            href={`/${locale}/client-statements/${statement.id}/edit`}
                          >
                            <button
                              className="p-2 text-text-secondary hover:text-info transition"
                              title={isArabic ? "تعديل" : "Edit"}
                            >
                              <Edit2 size={18} />
                            </button>
                          </Link>
                        )}
                      </Can>
                      <Can permission="client-statements.delete">
                        <button
                          onClick={() => {
                            if (statement.status === "approved") {
                              showToast(
                                isArabic
                                  ? "لا يمكن حذف مستخلص معتمد"
                                  : "Approved statement cannot be deleted",
                                "error"
                              );
                              return;
                            }
                            setDeletingId(statement.id);
                            setShowDeleteModal(true);
                          }}
                          disabled={statement.status === "approved"}
                          title={statement.status === "approved" ? (isArabic ? "لا يمكن حذف مستخلص معتمد" : "Approved statement cannot be deleted") : (isArabic ? "حذف" : "Delete")}
                          className={`p-2 text-text-secondary hover:text-danger transition ${statement.status === "approved" ? "opacity-40 cursor-not-allowed" : ""}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </Can>
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
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="p-5 border-b">
              <h2 className="text-xl font-bold text-primary">
                {isArabic ? "تأكيد الحذف" : "Confirm Delete"}
              </h2>
            </div>
            <div className="p-5">
              <p className="text-text-secondary">
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
