/* eslint-disable */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import DataLoader from "@/components/shared/DataLoader";
import { auditService, type AuditLogItem } from "@/services/audit.service";
import {
  History, Search, Filter, ChevronLeft, ChevronRight,
  User, Calendar, ArrowRight, RefreshCw,
} from "lucide-react";

const ENTITY_LABELS: Record<string, { ar: string; en: string }> = {
  project: { ar: "مشروع", en: "Project" },
  building: { ar: "مبنى", en: "Building" },
  employee: { ar: "موظف", en: "Employee" },
  user: { ar: "مستخدم", en: "User" },
  supplier: { ar: "مورد", en: "Supplier" },
  subcontractor: { ar: "مقاول", en: "Subcontractor" },
  "inventory-item": { ar: "صنف مخزون", en: "Inventory Item" },
  "project-fund": { ar: "عهدة مشروع", en: "Project Fund" },
  "fund-transaction": { ar: "معاملة مالية", en: "Fund Transaction" },
  attendance: { ar: "حضور", en: "Attendance" },
  "employer-boq": { ar: "مقايسة العميل", en: "Employer BOQ" },
  "final-boq": { ar: "مقايسة نهائية", en: "Final BOQ" },
  "contractor-boq": { ar: "مقايسة مقاول", en: "Contractor BOQ" },
  "client-statement": { ar: "بيان حساب عميل", en: "Client Statement" },
  "subcontractor-statement": { ar: "بيان حساب مقاول", en: "Subcontractor Statement" },
  extract: { ar: "مستخلص", en: "Extract" },
  purchase: { ar: "مشتريات", en: "Purchase" },
  payment: { ar: "دفعة", en: "Payment" },
  notification: { ar: "إشعار", en: "Notification" },
  role: { ar: "دور", en: "Role" },
  department: { ar: "قسم", en: "Department" },
  warehouse: { ar: "مستودع", en: "Warehouse" },
  holiday: { ar: "عطلة", en: "Holiday" },
  leave: { ar: "إجازة", en: "Leave" },
};

const ACTION_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  create: { ar: "إنشاء", en: "Create", color: "text-success" },
  update: { ar: "تعديل", en: "Update", color: "text-info" },
  delete: { ar: "حذف", en: "Delete", color: "text-danger" },
  restore: { ar: "استعادة", en: "Restore", color: "text-success" },
  login: { ar: "تسجيل دخول", en: "Login", color: "text-info" },
  logout: { ar: "تسجيل خروج", en: "Logout", color: "text-text-secondary" },
};

export default function AuditLogPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ entity: "", action: "", userId: "" });
  const [appliedFilters, setAppliedFilters] = useState({ entity: "", action: "", userId: "" });

  const take = 20;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await auditService.list({
        ...appliedFilters,
        skip: page * take,
        take,
      });
      setLogs(result.items || []);
      setTotal(result.total || 0);
    } catch {
      showToast(isArabic ? "فشل تحميل سجل العمليات" : "Failed to load audit log", "error");
    } finally {
      setLoading(false);
    }
  }, [page, appliedFilters, isArabic, showToast]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleSearch = () => {
    setPage(0);
    setAppliedFilters({ ...filters });
  };

  const totalPages = Math.ceil(total / take);

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleString(isArabic ? "ar-EG" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const getEntityLabel = (entity: string) =>
    isArabic ? (ENTITY_LABELS[entity]?.ar || entity) : (ENTITY_LABELS[entity]?.en || entity);

  const getActionLabel = (action: string) =>
    isArabic ? (ACTION_LABELS[action]?.ar || action) : (ACTION_LABELS[action]?.en || action);

  const getActionColor = (action: string) => ACTION_LABELS[action]?.color || "text-text-secondary";

  return (
    <div className="space-y-6">
      {ToastComponent}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <History size={24} />
            {isArabic ? "سجل العمليات" : "Audit Log"}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {isArabic ? "تتبع جميع العمليات التي تمت في النظام" : "Track all operations performed in the system"}
          </p>
        </div>
        <span className="text-sm text-text-muted">
          {isArabic ? `${total.toLocaleString()} عملية` : `${total.toLocaleString()} entries`}
        </span>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-text-secondary mb-1">{isArabic ? "الكيان" : "Entity"}</label>
            <select
              value={filters.entity}
              onChange={(e) => setFilters((f) => ({ ...f, entity: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-surface text-text-primary"
            >
              <option value="">{isArabic ? "الكل" : "All"}</option>
              {Object.entries(ENTITY_LABELS).map(([key, labels]) => (
                <option key={key} value={key}>{isArabic ? labels.ar : labels.en}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-text-secondary mb-1">{isArabic ? "الإجراء" : "Action"}</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-surface text-text-primary"
            >
              <option value="">{isArabic ? "الكل" : "All"}</option>
              {Object.entries(ACTION_LABELS).map(([key, labels]) => (
                <option key={key} value={key}>{isArabic ? labels.ar : labels.en}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-text-secondary mb-1">{isArabic ? "معرف المستخدم" : "User ID"}</label>
            <input
              type="text"
              value={filters.userId}
              onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
              placeholder={isArabic ? "بحث بالمستخدم..." : "Search by user..."}
              className="w-full px-3 py-2 border rounded-lg text-sm bg-surface text-text-primary"
            />
          </div>
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition"
          >
            <Search size={16} />
            {isArabic ? "بحث" : "Search"}
          </button>
          <button
            onClick={() => { setFilters({ entity: "", action: "", userId: "" }); setAppliedFilters({ entity: "", action: "", userId: "" }); setPage(0); }}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-surface transition"
          >
            <RefreshCw size={14} />
            {isArabic ? "إعادة ضبط" : "Reset"}
          </button>
        </div>
      </Card>

      {/* Log Table */}
      {loading ? (
        <DataLoader />
      ) : logs.length === 0 ? (
        <Card className="p-12 text-center">
          <History size={48} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-secondary">{isArabic ? "لا توجد سجلات" : "No logs found"}</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="px-4 py-3 text-start">{isArabic ? "التاريخ" : "Date"}</th>
                  <th className="px-4 py-3 text-start">{isArabic ? "الإجراء" : "Action"}</th>
                  <th className="px-4 py-3 text-start">{isArabic ? "الكيان" : "Entity"}</th>
                  <th className="px-4 py-3 text-start">{isArabic ? "معرف السجل" : "Record ID"}</th>
                  <th className="px-4 py-3 text-start">{isArabic ? "المستخدم" : "User"}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border-light hover:bg-surface-secondary/50">
                    <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        {formatTime(log.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${getActionColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-surface-secondary text-text-secondary">
                        {getEntityLabel(log.entity)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">
                      {log.entityId?.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-text-muted" />
                        <span>{log.userName || log.userEmail || log.userId?.slice(0, 8) || "-"}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-text-muted">
                {isArabic ? `صفحة ${page + 1} من ${totalPages}` : `Page ${page + 1} of ${totalPages}`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-surface transition"
                >
                  {isArabic ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-surface transition"
                >
                  {isArabic ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
