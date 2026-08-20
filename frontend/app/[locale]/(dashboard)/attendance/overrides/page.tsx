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
  RefreshCw,
  User,
  Calendar,
  MapPin,
} from "lucide-react";
import { attendanceService, type AttendanceOverride } from "@/services/attendance.service";
import { useAuth } from "@/hooks/useAuth";
import { Can } from "@/components/Can";
import { useHasPermission } from "@/hooks/usePermissions";
import DataLoader from "@/components/shared/DataLoader";
import ExportButtons from "@/components/shared/ExportButtons";

export default function AttendanceOverridesPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { user, loading: authLoading } = useAuth();
  const { showToast, ToastComponent } = useToast();
  const canManage = useHasPermission("attendance.update");

  const [overrides, setOverrides] = useState<AttendanceOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [actionTarget, setActionTarget] = useState<AttendanceOverride | null>(null);
  const [actionMode, setActionMode] = useState<"approve" | "reject" | "view" | null>(null);
  const [comment, setComment] = useState("");

  const loadData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    setLoading(true);
    try {
      const items = await attendanceService.listOverrides();
      setOverrides(items);
    } catch {
      showToast(isArabic ? "خطأ في تحميل الطلبات" : "Error loading overrides", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isArabic, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredOverrides = useMemo(() => {
    const q = employeeFilter.trim().toLowerCase();
    return overrides.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (q) {
        const name = o.employee?.fullName ?? "";
        const code = o.employee?.code ?? "";
        if (!name.toLowerCase().includes(q) && !code.toLowerCase().includes(q)) return false;
      }
      if (dateFilter) {
        const d = (o.date ?? "").slice(0, 10);
        if (d !== dateFilter) return false;
      }
      return true;
    });
  }, [overrides, statusFilter, employeeFilter, dateFilter]);

  const { currentItems, currentPage, totalPages, goToPage } = usePagination(filteredOverrides, 15);

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
      await loadData();
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

  const formatDay = (val?: string | null) => {
    if (!val) return "—";
    try {
      return new Date(val).toLocaleDateString(isArabic ? "ar-EG" : "en-US");
    } catch {
      return val;
    }
  };

  const formatTime = (val?: string | null) => {
    if (!val) return "—";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleTimeString(isArabic ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "—";
    }
  };

  const formatPlace = (lat?: number | null, lng?: number | null, address?: string | null) => {
    if (address) return address;
    if (lat != null && lng != null) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    return "—";
  };

  const computeWorkMinutes = (item: AttendanceOverride): number | null => {
    if (item.attendance?.workedMinutes != null) return item.attendance.workedMinutes;
    const p = item.payload;
    if (!p?.checkInTime || !p?.checkOutTime) return null;
    const ci = new Date(p.checkInTime).getTime();
    const co = new Date(p.checkOutTime).getTime();
    if (isNaN(ci) || isNaN(co)) return null;
    return Math.round((co - ci) / 60000);
  };

  const formatDuration = (minutes: number | null): string => {
    if (minutes == null) return "—";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${String(m).padStart(2, "0")}m`;
  };

  const statusLabel = (status: string) =>
    status === "approved"
      ? (isArabic ? "مقبول" : "Approved")
      : status === "rejected"
      ? (isArabic ? "مرفوض" : "Rejected")
      : (isArabic ? "بانتظار الموافقة" : "Pending");

  const statusVariant = (status: string) =>
    status === "approved" ? "success" : status === "rejected" ? "danger" : "warning";

  if (authLoading) {
    return <DataLoader fullPage />;
  }

  if (!canManage) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <AlertTriangle className="mx-auto text-amber-500" size={40} />
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            {isArabic ? "ليس لديك صلاحية الوصول" : "No access"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isArabic
              ? "هذه الصفحة متاحة للإدارة فقط"
              : "This page is restricted to management"}
          </p>
        </div>
      </div>
    );
  }

  if (loading && overrides.length === 0) {
    return <DataLoader fullPage />;
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
        <div className="flex items-center gap-2">
          <ExportButtons
            data={filteredOverrides}
            columns={[
              { key: "employee", labelAr: "الموظف", labelEn: "Employee", format: (_v: any, row: AttendanceOverride) => row.employee?.fullName ?? "—" },
              { key: "type", labelAr: "النوع", labelEn: "Type", format: (v: string) => v === "check_in" ? (isArabic ? "حضور" : "Check-in") : (isArabic ? "انصراف" : "Check-out") },
              { key: "date", labelAr: "التاريخ", labelEn: "Date", format: (v: string) => formatDay(v) },
              { key: "checkIn", labelAr: "الحضور", labelEn: "Check-in", format: (_v: any, row: AttendanceOverride) => formatTime(row.payload?.checkInTime) },
              { key: "checkOut", labelAr: "الانصراف", labelEn: "Check-out", format: (_v: any, row: AttendanceOverride) => formatTime(row.payload?.checkOutTime) },
              { key: "workHours", labelAr: "ساعات العمل", labelEn: "Work Hours", format: (_v: any, row: AttendanceOverride) => formatDuration(computeWorkMinutes(row)) },
              { key: "status", labelAr: "الحالة", labelEn: "Status", format: (v: string) => statusLabel(v) },
              { key: "reason", labelAr: "السبب", labelEn: "Reason", format: (_v: any, row: AttendanceOverride) => row.reason ?? "—" },
            ]}
            titleAr="تقرير تعديلات الحضور"
            titleEn="Attendance Overrides Report"
            filename="attendance_overrides"
            locale={locale}
          />
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gold text-white rounded-xl hover:bg-gold-dark disabled:opacity-50 transition-colors"
          >
            {refreshing && <RefreshCw size={14} className="animate-spin" />}
            {isArabic ? "تحديث" : "Refresh"}
          </button>
        </div>
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
        <div className="flex flex-wrap items-end gap-3">
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
          <div className="flex-1 min-w-[180px] max-w-xs">
            <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <User size={12} />
              {isArabic ? "اسم الموظف أو الكود" : "Employee name or code"}
            </label>
            <input
              type="text"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              placeholder={isArabic ? "بحث..." : "Search..."}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="min-w-[160px]">
            <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <Calendar size={12} />
              {isArabic ? "التاريخ" : "Date"}
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {(employeeFilter || dateFilter) && (
            <button
              onClick={() => { setEmployeeFilter(""); setDateFilter(""); }}
              className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-danger transition"
            >
              {isArabic ? "مسح" : "Clear"}
            </button>
          )}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "الموظف" : "Employee"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "النوع" : "Type"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "التاريخ" : "Date"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "الحضور" : "Check-in"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "الانصراف" : "Check-out"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "ساعات العمل" : "Work Hours"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "الحالة" : "Status"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "الإجراءات" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    {isArabic ? "لا توجد طلبات" : "No override requests"}
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => {
                  const workMinutes = computeWorkMinutes(item);
                  const p = item.payload;
                  const checkInPlace = formatPlace(p?.checkInLatitude, p?.checkInLongitude, p?.checkInAddress);
                  const checkOutPlace = formatPlace(p?.checkOutLatitude, p?.checkOutLongitude, p?.checkOutAddress);
                  return (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">
                          {(item.employee?.fullName ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {item.employee?.fullName ?? (isArabic ? "غير معروف" : "Unknown")}
                          </p>
                          {item.employee?.code && (
                            <p className="text-[11px] text-gray-400">{item.employee.code}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="info" size="sm">
                        {item.type === "check_in"
                          ? (isArabic ? "حضور" : "Check-in")
                          : (isArabic ? "انصراف" : "Check-out")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs">
                      {formatDay(item.date)}
                    </td>
                    <td className="px-4 py-3 min-w-[180px]">
                      <div className="flex items-center gap-1.5 text-xs text-gray-800 dark:text-gray-200">
                        <Clock size={12} className="text-gray-400 shrink-0" />
                        {formatTime(p?.checkInTime)}
                      </div>
                      {checkInPlace !== "—" && (
                        <div className="flex items-start gap-1.5 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                          <MapPin size={11} className="text-gray-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{checkInPlace}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 min-w-[180px]">
                      <div className="flex items-center gap-1.5 text-xs text-gray-800 dark:text-gray-200">
                        <Clock size={12} className="text-gray-400 shrink-0" />
                        {formatTime(p?.checkOutTime)}
                      </div>
                      {checkOutPlace !== "—" && (
                        <div className="flex items-start gap-1.5 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                          <MapPin size={11} className="text-gray-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{checkOutPlace}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                      {formatDuration(workMinutes)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={statusVariant(item.status)} size="sm">
                        {statusLabel(item.status)}
                      </Badge>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          isArabic={isArabic}
          total={filteredOverrides.length}
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
              {actionTarget.employee && (
                <div>
                  <p className="text-xs text-text-muted mb-1">{isArabic ? "الموظف" : "Employee"}</p>
                  <p className="text-sm text-text-primary">{actionTarget.employee.fullName}</p>
                  {actionTarget.employee.code && (
                    <p className="text-xs text-text-muted mt-0.5">{actionTarget.employee.code}</p>
                  )}
                </div>
              )}
              {(() => {
                const mins = computeWorkMinutes(actionTarget);
                return mins != null ? (
                  <div>
                    <p className="text-xs text-text-muted mb-1">{isArabic ? "ساعات العمل" : "Work Hours"}</p>
                    <p className="text-sm text-text-primary">{formatDuration(mins)}</p>
                  </div>
                ) : null;
              })()}
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
