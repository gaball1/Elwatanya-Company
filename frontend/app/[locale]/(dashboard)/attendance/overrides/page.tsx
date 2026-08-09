/* eslint-disable */
"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Badge, Dialog, Pagination } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { usePagination } from "@/hooks/usePagination";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Filter,
} from "lucide-react";
import { attendanceService, type AttendanceOverride } from "@/services/attendance.service";
import { useAuth } from "@/hooks/useAuth";
import { Can } from "@/components/Can";

export default function AttendanceOverridesPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { user } = useAuth();
  const { showToast, ToastComponent } = useToast();

  const [overrides, setOverrides] = useState<AttendanceOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const [actionTarget, setActionTarget] = useState<AttendanceOverride | null>(null);
  const [actionMode, setActionMode] = useState<"approve" | "reject" | "view" | null>(null);
  const [comment, setComment] = useState("");

  const loadData = useCallback(async (status?: string) => {
    try {
      setLoading(true);
      const items = await attendanceService.listOverrides(status || undefined);
      setOverrides(items);
    } catch {
      showToast(isArabic ? "خطأ في تحميل الطلبات" : "Error loading overrides", "error");
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => { loadData(statusFilter); }, [loadData, statusFilter]);

  const { currentItems, currentPage, totalPages, goToPage } = usePagination(overrides, 15);

  const summary = useMemo(() => {
    return {
      total: overrides.length,
      pending: overrides.filter((o) => o.status === "pending").length,
      approved: overrides.filter((o) => o.status === "approved").length,
      rejected: overrides.filter((o) => o.status === "rejected").length,
    };
  }, [overrides]);

  const openAction = useCallback((item: AttendanceOverride, mode: "approve" | "reject" | "view") => {
    setActionTarget(item);
    setActionMode(mode);
    setComment("");
  }, []);

  const closeAction = useCallback(() => {
    setActionTarget(null);
    setActionMode(null);
    setComment("");
  }, []);

  const submitAction = async () => {
    if (!actionTarget || !actionMode || actionMode === "view") return;
    try {
      if (actionMode === "approve") {
        await attendanceService.approveOverride(actionTarget.id, comment.trim());
        showToast(isArabic ? "تمت الموافقة على الطلب" : "Override approved", "success");
      } else {
        await attendanceService.rejectOverride(actionTarget.id, comment.trim());
        showToast(isArabic ? "تم رفض الطلب" : "Override rejected", "success");
      }
      closeAction();
      await loadData(statusFilter);
    } catch {
      showToast(isArabic ? "فشلت العملية" : "Action failed", "error");
    }
  };

  const formatDate = (val: string) => {
    try {
      return new Date(val).toLocaleString(isArabic ? "ar-EG" : "en-US");
    } catch {
      return val;
    }
  };

  if (loading && overrides.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 space-y-6">
      {ToastComponent}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isArabic ? "طلبات تصحيح الحضور" : "Attendance Overrides"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isArabic ? "مراجعة واعتماد طلبات التجاوز" : "Review and approve override requests"}
          </p>
        </div>
        <button
          onClick={() => loadData(statusFilter)}
          className="px-4 py-2 text-sm bg-gold text-white rounded-xl hover:bg-gold-dark disabled:opacity-50 transition-colors"
        >
          {isArabic ? "تحديث" : "Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">{isArabic ? "إجمالي الطلبات" : "Total"}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{summary.total}</p>
        </Card>
        <Card className="p-4 text-center border-l-4 border-amber-500">
          <p className="text-xs text-gray-500 dark:text-gray-400">{isArabic ? "بانتظار الموافقة" : "Pending"}</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{summary.pending}</p>
        </Card>
        <Card className="p-4 text-center border-l-4 border-green-500">
          <p className="text-xs text-gray-500 dark:text-gray-400">{isArabic ? "مقبول" : "Approved"}</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{summary.approved}</p>
        </Card>
        <Card className="p-4 text-center border-l-4 border-red-500">
          <p className="text-xs text-gray-500 dark:text-gray-400">{isArabic ? "مرفوض" : "Rejected"}</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{summary.rejected}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gold" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{isArabic ? "تصفية" : "Filter"}</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "", labelAr: "الكل", labelEn: "All" },
            { value: "pending", labelAr: "بانتظار الموافقة", labelEn: "Pending" },
            { value: "approved", labelAr: "مقبول", labelEn: "Approved" },
            { value: "rejected", labelAr: "مرفوض", labelEn: "Rejected" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                statusFilter === opt.value
                  ? "bg-primary text-white border-primary"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {isArabic ? opt.labelAr : opt.labelEn}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "النوع" : "Type"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "السبب" : "Reason"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "التاريخ" : "Date"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "الحالة" : "Status"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "ملاحظات" : "Comment"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "الإجراءات" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    {isArabic ? "لا توجد طلبات" : "No override requests"}
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="info" size="sm">
                        {item.type === "check_in"
                          ? (isArabic ? "حضور" : "Check-in")
                          : (isArabic ? "انصراف" : "Check-out")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200 max-w-[280px]">
                      <div className="line-clamp-2">{item.reason}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge
                        variant={item.status === "approved" ? "success" : item.status === "rejected" ? "danger" : "warning"}
                        size="sm"
                      >
                        {item.status === "approved"
                          ? (isArabic ? "مقبول" : "Approved")
                          : item.status === "rejected"
                          ? (isArabic ? "مرفوض" : "Rejected")
                          : (isArabic ? "بانتظار الموافقة" : "Pending")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-[200px]">
                      <div className="line-clamp-1">{item.comment || "—"}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openAction(item, "view")}
                          className="p-1.5 text-gray-400 hover:text-primary transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                          title={isArabic ? "عرض" : "View"}
                        >
                          <Eye size={16} />
                        </button>
                        {item.status === "pending" && (
                          <>
                            <Can permission="attendance.update">
                              <button
                                onClick={() => openAction(item, "approve")}
                                className="p-1.5 text-green-600 hover:text-green-700 transition-colors rounded-md hover:bg-green-50 dark:hover:bg-green-900/20"
                                title={isArabic ? "موافقة" : "Approve"}
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button
                                onClick={() => openAction(item, "reject")}
                                className="p-1.5 text-red-600 hover:text-red-700 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                                title={isArabic ? "رفض" : "Reject"}
                              >
                                <XCircle size={16} />
                              </button>
                            </Can>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          isArabic={isArabic}
          total={overrides.length}
        />
      </Card>

      <Dialog
        open={actionTarget !== null}
        onClose={closeAction}
        title={
          actionMode === "approve"
            ? (isArabic ? "الموافقة على الطلب" : "Approve Request")
            : actionMode === "reject"
            ? (isArabic ? "رفض الطلب" : "Reject Request")
            : (isArabic ? "تفاصيل الطلب" : "Request Details")
        }
      >
        {actionTarget && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-text-muted mb-1">{isArabic ? "السبب" : "Reason"}</p>
              <p className="text-sm text-text-primary bg-surface-secondary p-3 rounded-lg">{actionTarget.reason}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">{isArabic ? "تاريخ الطلب" : "Requested At"}</p>
              <p className="text-sm text-text-primary">{formatDate(actionTarget.createdAt)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-text-muted mb-1">{isArabic ? "النوع" : "Type"}</p>
                <p className="text-sm text-text-primary">
                  {actionTarget.type === "check_in"
                    ? (isArabic ? "حضور" : "Check-in")
                    : (isArabic ? "انصراف" : "Check-out")}
                </p>
              </div>
              {actionTarget.date && (
                <div>
                  <p className="text-xs text-text-muted mb-1">{isArabic ? "تاريخ الحضور" : "Attendance Date"}</p>
                  <p className="text-sm text-text-primary">{formatDate(actionTarget.date)}</p>
                </div>
              )}
              {actionTarget.distance != null && (
                <div>
                  <p className="text-xs text-text-muted mb-1">{isArabic ? "المسافة عن الموقع" : "Distance from site"}</p>
                  <p className="text-sm text-text-primary">{Math.round(actionTarget.distance)} م</p>
                </div>
              )}
              {(() => {
                const s = actionTarget.payload;
                if (!s) return null;
                const lat = actionTarget.type === "check_in" ? s.checkInLatitude : s.checkOutLatitude;
                const lng = actionTarget.type === "check_in" ? s.checkInLongitude : s.checkOutLongitude;
                const addr = actionTarget.type === "check_in" ? s.checkInAddress : s.checkOutAddress;
                if (lat == null && lng == null && !addr) return null;
                return (
                  <>
                    <div>
                      <p className="text-xs text-text-muted mb-1">{isArabic ? "عنوان الموقع" : "Location Address"}</p>
                      <p className="text-sm text-text-primary">{addr || "—"}</p>
                    </div>
                    {lat != null && lng != null && (
                      <div className="col-span-2">
                        <p className="text-xs text-text-muted mb-1">{isArabic ? "الإحداثيات" : "GPS Coordinates"}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-xs bg-surface-secondary px-2 py-1 rounded-lg font-mono">{lat.toFixed(6)}, {lng.toFixed(6)}</code>
                          <a
                            href={`https://www.google.com/maps?q=${lat},${lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary underline"
                          >
                            {isArabic ? "فتح على الخريطة" : "Open in Maps"}
                          </a>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
              {actionTarget.employeeId && (
                <div>
                  <p className="text-xs text-text-muted mb-1">{isArabic ? "رقم الموظف" : "Employee ID"}</p>
                  <p className="text-sm text-text-primary text-xs">{actionTarget.employeeId}</p>
                </div>
              )}
            </div>
            {actionMode === "view" && actionTarget.comment && (
              <div>
                <p className="text-xs text-text-muted mb-1">{isArabic ? "ملاحظات" : "Comment"}</p>
                <p className="text-sm text-text-primary bg-surface-secondary p-3 rounded-lg">{actionTarget.comment}</p>
              </div>
            )}
            {actionMode && actionMode !== "view" && (
              <>
                <div>
                  <label className="block text-xs text-text-muted mb-1">
                    {isArabic ? "ملاحظات (اختياري)" : "Comment (optional)"}
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-border rounded-xl text-sm bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder={isArabic ? "أضف ملاحظات..." : "Add comment..."}
                  />
                </div>
                <div className="flex gap-3 pt-3 border-t">
                  <button
                    onClick={closeAction}
                    className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface-secondary"
                  >
                    {isArabic ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    onClick={submitAction}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm text-white font-medium ${
                      actionMode === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {actionMode === "approve"
                      ? (isArabic ? "موافقة" : "Approve")
                      : (isArabic ? "رفض" : "Reject")}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
