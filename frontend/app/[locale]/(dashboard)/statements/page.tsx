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
  Trash2,
  Edit2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { subcontractorStatementService, type SubcontractorStatement } from "@/services/subcontractor-statement.service";
import { useToast } from "@/components/ui/Toast";
import BackButton from "@/components/shared/BackButton";
import DataLoader from "@/components/shared/DataLoader";
import UploadFromDeviceButton, {
  type UploadedFileInfo,
} from "@/components/shared/UploadFromDeviceButton";
import { Can } from "@/components/Can";

export default function StatementsPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [statements, setStatements] = useState<SubcontractorStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchStatements = useCallback(async () => {
    try {
      setLoading(true);
      const data = await subcontractorStatementService.list();
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
          s.subcontractorName.toLowerCase().includes(term) ||
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

  // حذف مستخلص
  const handleDelete = async () => {
    if (deletingId) {
      try {
        await subcontractorStatementService.remove(deletingId);
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
      statementNumber: `UP-${Date.now()}`,
      projectId: "",
      projectName: isArabic ? "مرفوع من الجهاز" : "Uploaded from device",
      buildingId: "",
      buildingName: "—",
      subcontractorId: "",
      subcontractorName: file.name.replace(/\.[^/.]+$/, ""),
      workType: "—",
      date: new Date().toISOString().split("T")[0],
      status: "draft",
      blockNumber: "",
      formNumber: "",
      insurancePercent: 5,
      totalWorkValue: 0,
      totalInsurance: 0,
      totalDeductions: 0,
      previousPaid: 0,
      netPayable: 0,
      source: "device" as string,
      uploadedFile: file,
      items: [],
      deductions: [],
      signatures: [],
      runningNumber: statements.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setStatements([newStatement as SubcontractorStatement, ...statements]);
    showToast(
      isArabic ? "تم رفع المستخلص بنجاح" : "Statement uploaded successfully",
      "success"
    );
  };

  // نسخ مستخلص (Duplicate)
  const handleDuplicate = (statement: any) => {
    const newId = (statements.length + 1).toString();
    const newStatement = {
      ...statement,
      id: newId,
      statementNumber: `${statement.statementNumber}-copy`,
      status: "draft",
      date: new Date().toISOString().split("T")[0],
    };
    setStatements([...statements, newStatement]);
    showToast(
      isArabic ? "تم نسخ المستخلص بنجاح" : "Statement duplicated successfully",
      "success"
    );
  };

  if (loading) {
    return <DataLoader />;
  }

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
                {isArabic ? "مستخلصات المقاولين" : "Subcontractor Statements"}
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                {isArabic
                  ? "إدارة مستخلصات المقاولين الباطنين"
                  : "Manage subcontractor statements"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <UploadFromDeviceButton
              isArabic={isArabic}
              onUpload={handleUploadStatement}
            />
            <Can permission="subcontractor-statements.create">
              <Link href={`/${locale}/client-statements/new`}>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm font-medium">
                  <Plus size={18} />
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
                        {isArabic ? "المقاول" : "Subcontractor"}:{" "}
                        {statement.subcontractorName} ({statement.workType})
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
                        <Link href={`/${locale}/statements/${statement.id}`}>
                          <button
                            className="p-2 text-text-secondary hover:text-primary transition"
                            title={isArabic ? "عرض" : "View"}
                          >
                            <Eye size={18} />
                          </button>
                        </Link>
                      )}
                      <Can permission="subcontractor-statements.update">
                        {statement.status === "approved" ? (
                          <button
                            disabled
                            title={isArabic ? "لا يمكن تعديل مستخلص معتمد" : "Approved statement is locked"}
                            className="p-2 text-text-muted cursor-not-allowed"
                          >
                            <Edit2 size={18} />
                          </button>
                        ) : (
                          <Link href={`/${locale}/statements/${statement.id}/edit`}>
                            <button
                              className="p-2 text-text-secondary hover:text-info transition"
                              title={isArabic ? "تعديل" : "Edit"}
                            >
                              <Edit2 size={18} />
                            </button>
                          </Link>
                        )}
                      </Can>
                      <button
                        onClick={() => handleDuplicate(statement)}
                        disabled={statement.status === "approved"}
                        title={statement.status === "approved" ? (isArabic ? "لا يمكن نسخ مستخلص معتمد" : "Approved statement cannot be duplicated") : (isArabic ? "نسخ" : "Duplicate")}
                        className={`p-2 text-text-secondary hover:text-success transition ${statement.status === "approved" ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        <Copy size={18} />
                      </button>
                      <Can permission="subcontractor-statements.delete">
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

      {/* Delete Confirmation Modal */}
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
                  ? "هل أنت متأكد من حذف هذا المستخلص؟ لا يمكن التراجع عن هذا الإجراء."
                  : "Are you sure you want to delete this statement? This action cannot be undone."}
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-border-dark rounded-xl hover:bg-surface-secondary transition"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-danger text-white rounded-xl hover:bg-danger-dark transition"
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
