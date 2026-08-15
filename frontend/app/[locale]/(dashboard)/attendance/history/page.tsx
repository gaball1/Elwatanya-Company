/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, Badge, Pagination, Dialog } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { usePagination } from "@/hooks/usePagination";
import {
  Search,
  X,
  Download,
  Printer,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Camera,
  Copy,
  ExternalLink,
  Calendar,
  Filter,
  Eye,
  List,
} from "lucide-react";
import { attendanceService, type Attendance } from "@/services/attendance.service";
import { employeeService, type Employee } from "@/services/employee.service";
import { projectService, type Project } from "@/services/project.service";
import { buildingService, type Building } from "@/services/building.service";
import { printAsPDF } from "@/lib/printUtils";
import { useHasPermission } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";

const STATUS_OPTIONS = [
  { value: "", labelKey: "all" },
  { value: "present", labelKey: "present" },
  { value: "late", labelKey: "late" },
  { value: "absent", labelKey: "absent" },
  { value: "halfDay", labelKey: "halfDay" },
  { value: "earlyLeave", labelKey: "earlyLeave" },
  { value: "onLeave", labelKey: "onLeave" },
  { value: "holiday", labelKey: "holiday" },
  { value: "weekend", labelKey: "weekend" },
  { value: "remote", labelKey: "remote" },
  { value: "outsideSite", labelKey: "outsideSite" },
  { value: "pendingApproval", labelKey: "pendingApproval" },
  { value: "rejected", labelKey: "rejected" },
] as const;

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  all: { ar: "الكل", en: "All" },
  present: { ar: "حاضر", en: "Present" },
  late: { ar: "متأخر", en: "Late" },
  absent: { ar: "غائب", en: "Absent" },
  halfDay: { ar: "نصف يوم", en: "Half Day" },
  earlyLeave: { ar: "خروج مبكر", en: "Early Leave" },
  onLeave: { ar: "إجازة", en: "On Leave" },
  holiday: { ar: "عطلة رسمية", en: "Holiday" },
  weekend: { ar: "عطلة أسبوعية", en: "Weekend" },
  remote: { ar: "عن بعد", en: "Remote" },
  outsideSite: { ar: "خارج الموقع", en: "Outside Site" },
  pendingApproval: { ar: "بانتظار الموافقة", en: "Pending Approval" },
  rejected: { ar: "مرفوض", en: "Rejected" },
};

const STATUS_BADGE: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  present: "success",
  checkedOut: "success",
  late: "warning",
  absent: "danger",
  checkedIn: "info",
  outsideSite: "warning",
  pending: "default",
  pendingApproval: "default",
  rejected: "danger",
  onLeave: "info",
  holiday: "info",
  weekend: "default",
  remote: "info",
  halfDay: "warning",
  earlyLeave: "warning",
};

function formatTime(val: string | null | undefined): string {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return val;
  }
}

function formatWorked(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function getStatusLabel(status: string | undefined, isArabic: boolean): string {
  const key = status ?? "";
  return STATUS_LABELS[key]?.[isArabic ? "ar" : "en"] ?? status ?? "—";
}

function getStatusBadgeVariant(status: string | undefined): "success" | "warning" | "danger" | "info" | "default" {
  return STATUS_BADGE[status ?? ""] ?? "default";
}

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

interface DetailModalProps {
  record: Attendance | null;
  open: boolean;
  onClose: () => void;
  isArabic: boolean;
  employeeName: string;
  projectName: string;
  buildingName: string;
}

function DetailModal({ record, open, onClose, isArabic, employeeName, projectName, buildingName }: DetailModalProps) {
  if (!record) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const gpsText = record.checkInLatitude != null && record.checkInLongitude != null
    ? `${record.checkInLatitude.toFixed(6)}, ${record.checkInLongitude.toFixed(6)}`
    : null;

  const fields = [
    { label: isArabic ? "الموظف" : "Employee", value: employeeName },
    { label: isArabic ? "التاريخ" : "Date", value: record.date },
    { label: isArabic ? "المشروع" : "Project", value: projectName || "—" },
    { label: isArabic ? "المبنى" : "Building", value: buildingName || "—" },
  ];

  const checkInFields = [
    { label: isArabic ? "وقت الحضور" : "Check In Time", value: formatTime(record.checkInTime) },
    { label: isArabic ? "عنوان الحضور" : "Check In Address", value: record.checkInAddress || "—" },
    { label: isArabic ? "دقة الموقع" : "Accuracy", value: record.checkInAccuracy != null ? `${record.checkInAccuracy.toFixed(1)}m` : "—" },
  ];

  const checkOutFields = [
    { label: isArabic ? "وقت الانصراف" : "Check Out Time", value: formatTime(record.checkOutTime) },
    { label: isArabic ? "عنوان الانصراف" : "Check Out Address", value: record.checkOutAddress || "—" },
    { label: isArabic ? "دقة الموقع" : "Accuracy", value: record.checkOutAccuracy != null ? `${record.checkOutAccuracy.toFixed(1)}m` : "—" },
  ];

  const infoFields = [
    { label: isArabic ? "المسافة من الموقع" : "Distance From Site", value: record.distanceFromSite != null ? `${record.distanceFromSite.toFixed(1)}m` : "—" },
    { label: isArabic ? "ساعات العمل" : "Worked Minutes", value: formatWorked(record.workedMinutes) },
  ];

  return (
    <Dialog open={open} onClose={onClose} title={isArabic ? "تفاصيل تسجيل الحضور" : "Attendance Record Details"} size="full">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {fields.map((f) => (
            <div key={f.label}>
              <p className="text-xs text-text-muted mb-0.5">{f.label}</p>
              <p className="text-sm font-medium text-text-primary">{f.value}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Clock size={16} className="text-gold" />
            {isArabic ? "تسجيل الحضور" : "Check In"}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {checkInFields.map((f) => (
              <div key={f.label}>
                <p className="text-xs text-text-muted mb-0.5">{f.label}</p>
                <p className="text-sm text-text-primary">{f.value}</p>
              </div>
            ))}
          </div>
          {record.checkInSelfie && (
            <div className="mt-3">
              <p className="text-xs text-text-muted mb-1">
                <Camera size={12} className="inline mr-1" />
                {isArabic ? "صورة الحضور" : "Check In Selfie"}
              </p>
              <img
                src={record.checkInSelfie}
                alt="Check In Selfie"
                className="w-32 h-32 object-cover rounded-xl border border-border"
              />
            </div>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Clock size={16} className="text-gold" />
            {isArabic ? "تسجيل الانصراف" : "Check Out"}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {checkOutFields.map((f) => (
              <div key={f.label}>
                <p className="text-xs text-text-muted mb-0.5">{f.label}</p>
                <p className="text-sm text-text-primary">{f.value}</p>
              </div>
            ))}
          </div>
          {record.checkOutSelfie && (
            <div className="mt-3">
              <p className="text-xs text-text-muted mb-1">
                <Camera size={12} className="inline mr-1" />
                {isArabic ? "صورة الانصراف" : "Check Out Selfie"}
              </p>
              <img
                src={record.checkOutSelfie}
                alt="Check Out Selfie"
                className="w-32 h-32 object-cover rounded-xl border border-border"
              />
            </div>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <MapPin size={16} className="text-gold" />
            {isArabic ? "الإحداثيات" : "GPS Coordinates"}
          </h4>
          {gpsText ? (
            <div className="flex items-center gap-2">
              <code className="bg-surface-secondary px-3 py-1.5 rounded-lg text-sm font-mono">{gpsText}</code>
              <button
                onClick={() => copyToClipboard(gpsText)}
                className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded-md hover:bg-surface-secondary"
                title={isArabic ? "نسخ" : "Copy"}
              >
                <Copy size={16} />
              </button>
              <a
                href={`https://www.google.com/maps?q=${record.checkInLatitude},${record.checkInLongitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-text-muted hover:text-info transition-colors rounded-md hover:bg-surface-secondary"
                title={isArabic ? "فتح في الخريطة" : "Open in Maps"}
              >
                <ExternalLink size={16} />
              </a>
            </div>
          ) : (
            <p className="text-sm text-text-muted">—</p>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {infoFields.map((f) => (
              <div key={f.label}>
                <p className="text-xs text-text-muted mb-0.5">{f.label}</p>
                <p className="text-sm font-medium text-text-primary">{f.value}</p>
              </div>
            ))}
            <div>
              <p className="text-xs text-text-muted mb-0.5">{isArabic ? "الحالة" : "Status"}</p>
              <Badge variant={getStatusBadgeVariant(record.attendanceStatus)}>
                {getStatusLabel(record.attendanceStatus, isArabic)}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-0.5">{isArabic ? "معلومات الجهاز" : "Device Info"}</p>
              <p className="text-xs font-mono text-text-primary truncate max-w-[200px]" title={record.deviceInfo ?? ""}>{record.deviceInfo || "—"}</p>
            </div>
          </div>
        </div>

        {record.notes && (
          <div className="border-t border-border pt-4">
            <p className="text-xs text-text-muted mb-1">{isArabic ? "ملاحظات" : "Notes"}</p>
            <p className="text-sm text-text-primary">{record.notes}</p>
          </div>
        )}
      </div>
    </Dialog>
  );
}

export default function AttendanceHistoryPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();
  const canManage = useHasPermission("attendance.update");
  const { loading: authLoading } = useAuth();

  const [records, setRecords] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [detailRecord, setDetailRecord] = useState<Attendance | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!canManage) return;
    try {
      setLoading(true);
      const loadList = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
        try {
          return await fn();
        } catch {
          return fallback;
        }
      };
      const [recs, emps, projs, bldgs] = await Promise.all([
        attendanceService.list(),
        loadList(() => employeeService.list(), [] as Employee[]),
        loadList(() => projectService.getProjects(), [] as Project[]),
        loadList(() => buildingService.list(), [] as Building[]),
      ]);
      setRecords(recs);
      setEmployees(emps);
      setProjects(projs);
      setBuildings(bldgs);
    } catch {
      showToast(isArabic ? "خطأ في تحميل البيانات" : "Error loading data", "error");
    } finally {
      setLoading(false);
    }
  }, [canManage, isArabic]);

  useEffect(() => { loadData(); }, [loadData]);


  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const buildingMap = useMemo(() => {
    const map = new Map<string, Building>();
    buildings.forEach((b) => map.set(b.id, b));
    return map;
  }, [buildings]);

  const filteredBuildings = useMemo(() => {
    if (!filterProject) return buildings;
    return buildings.filter((b) => b.projectId === filterProject);
  }, [buildings, filterProject]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterEmployee && r.employeeId !== filterEmployee) return false;
      if (filterProject && r.projectId !== filterProject) return false;
      if (filterBuilding && r.buildingId !== filterBuilding) return false;
      if (filterDateFrom && r.date < filterDateFrom) return false;
      if (filterDateTo && r.date > filterDateTo) return false;
      if (filterStatus) {
        if (filterStatus === "present" && !["checkedIn", "checkedOut"].includes(r.attendanceStatus)) return false;
        if (filterStatus === "late" && r.attendanceStatus !== "late") return false;
        if (filterStatus === "absent" && r.attendanceStatus !== "absent") return false;
        if (filterStatus !== "present" && filterStatus !== "late" && filterStatus !== "absent") {
          if (r.attendanceStatus !== filterStatus) return false;
        }
      }
      return true;
    });
  }, [records, filterEmployee, filterProject, filterBuilding, filterDateFrom, filterDateTo, filterStatus]);

  const { currentItems, currentPage, totalPages, goToPage } = usePagination(filteredRecords, 15);

  const summary = useMemo(() => {
    const total = filteredRecords.length;
    let present = 0, late = 0, absent = 0;
    filteredRecords.forEach((r) => {
      if (["checkedIn", "checkedOut"].includes(r.attendanceStatus)) present++;
      if (r.attendanceStatus === "late") late++;
      if (r.attendanceStatus === "absent") absent++;
    });
    return { total, present, late, absent };
  }, [filteredRecords]);

  const clearFilters = useCallback(() => {
    setFilterEmployee("");
    setFilterProject("");
    setFilterBuilding("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterStatus("");
  }, []);

  const openDetail = useCallback((record: Attendance) => {
    setDetailRecord(record);
    setDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailRecord(null);
  }, []);

  const getEmployeeName = useCallback((employeeId: string): string => {
    const emp = employeeMap.get(employeeId);
    return emp?.fullName ?? employeeId;
  }, [employeeMap]);

  const exportCSV = useCallback(() => {
    const headers = [
      isArabic ? "الموظف" : "Employee",
      isArabic ? "التاريخ" : "Date",
      isArabic ? "وقت الحضور" : "Check In",
      isArabic ? "وقت الانصراف" : "Check Out",
      isArabic ? "ساعات العمل" : "Worked Hours",
      isArabic ? "متأخر (دقيقة)" : "Late (min)",
      isArabic ? "خروج مبكر (دقيقة)" : "Early Leave (min)",
      isArabic ? "المسافة (م)" : "Distance (m)",
      isArabic ? "خط العرض" : "Latitude",
      isArabic ? "خط الطول" : "Longitude",
      isArabic ? "الحالة" : "Status",
    ];
    const rows = filteredRecords.map((r) => {
      const empName = getEmployeeName(r.employeeId).replace(/,/g, " ");
      return [
        empName,
        r.date,
        formatTime(r.checkInTime),
        formatTime(r.checkOutTime),
        formatWorked(r.workedMinutes),
        "",
        "",
        r.distanceFromSite != null ? r.distanceFromSite.toFixed(1) : "",
        r.checkInLatitude != null ? r.checkInLatitude.toFixed(6) : "",
        r.checkInLongitude != null ? r.checkInLongitude.toFixed(6) : "",
        getStatusLabel(r.attendanceStatus, false),
      ];
    });
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `attendance_history_${getTodayStr()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isArabic ? "تم تصدير البيانات" : "Data exported", "success");
  }, [filteredRecords, getEmployeeName, isArabic]);

  const exportPDF = useCallback(() => {
    const headers = [
      isArabic ? "الموظف" : "Employee",
      isArabic ? "التاريخ" : "Date",
      isArabic ? "الحضور" : "Check In",
      isArabic ? "الانصراف" : "Check Out",
      isArabic ? "ساعات العمل" : "Worked Hours",
      isArabic ? "الحالة" : "Status",
    ];
    const rows = filteredRecords.map((r) => [
      getEmployeeName(r.employeeId),
      r.date,
      formatTime(r.checkInTime),
      formatTime(r.checkOutTime),
      formatWorked(r.workedMinutes),
      getStatusLabel(r.attendanceStatus, isArabic),
    ]);
    printAsPDF(
      rows,
      headers,
      isArabic ? "سجل الحضور والانصراف" : "Attendance History Report",
      isArabic
    );
  }, [filteredRecords, getEmployeeName, isArabic]);

  const hasActiveFilters = filterEmployee || filterProject || filterBuilding || filterDateFrom || filterDateTo || filterStatus;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      </div>
    );
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 space-y-6">
      {ToastComponent}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isArabic ? "سجل الحضور والانصراف" : "Attendance History"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isArabic ? "عرض وتصفية سجلات الحضور والانصراف" : "View and filter attendance records"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition text-sm"
          >
            <Download size={16} />
            {isArabic ? "Excel" : "Excel"}
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition text-sm"
          >
            <Printer size={16} />
            {isArabic ? "PDF" : "PDF"}
          </button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-gold" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {isArabic ? "تصفية" : "Filters"}
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {isArabic ? "الموظف" : "Employee"}
            </label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <option value="">{isArabic ? "الكل" : "All"}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {isArabic ? "المشروع" : "Project"}
            </label>
            <select
              value={filterProject}
              onChange={(e) => { setFilterProject(e.target.value); setFilterBuilding(""); }}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <option value="">{isArabic ? "الكل" : "All"}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {isArabic ? "المبنى" : "Building"}
            </label>
            <select
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <option value="">{isArabic ? "الكل" : "All"}</option>
              {filteredBuildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {isArabic ? "من تاريخ" : "From Date"}
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {isArabic ? "إلى تاريخ" : "To Date"}
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {isArabic ? "الحالة" : "Status"}
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {STATUS_LABELS[opt.labelKey][isArabic ? "ar" : "en"]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => {}}
              className="flex-1 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm flex items-center justify-center gap-1"
            >
              <Search size={15} />
              {isArabic ? "بحث" : "Search"}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm"
                title={isArabic ? "مسح التصفية" : "Clear Filters"}
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">{isArabic ? "إجمالي السجلات" : "Total Records"}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{summary.total}</p>
        </Card>
        <Card className="p-4 text-center border-l-4 border-green-500">
          <p className="text-xs text-gray-500 dark:text-gray-400">{isArabic ? "حاضر" : "Present"}</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{summary.present}</p>
        </Card>
        <Card className="p-4 text-center border-l-4 border-amber-500">
          <p className="text-xs text-gray-500 dark:text-gray-400">{isArabic ? "متأخر" : "Late"}</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{summary.late}</p>
        </Card>
        <Card className="p-4 text-center border-l-4 border-red-500">
          <p className="text-xs text-gray-500 dark:text-gray-400">{isArabic ? "غائب" : "Absent"}</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{summary.absent}</p>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "الموظف" : "Employee"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "التاريخ" : "Date"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "الحضور" : "Check In"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "الانصراف" : "Check Out"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "ساعات العمل" : "Worked"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "متأخر" : "Late"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "خروج مبكر" : "Early"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "المسافة" : "Dist."}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "الموقع" : "Location"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "الحالة" : "Status"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "الصورة" : "Selfie"}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">
                  {isArabic ? "الإجراءات" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-gray-400">
                    {isArabic ? "لا توجد سجلات مطابقة" : "No matching records"}
                  </td>
                </tr>
              ) : (
                currentItems.map((record) => {
                  const empName = getEmployeeName(record.employeeId);
                  const lateMin = (() => {
                    if (!record.checkInTime) return null;
                    const checkIn = new Date(record.checkInTime);
                    const expected = new Date(checkIn);
                    expected.setHours(8, 0, 0, 0);
                    const diff = Math.round((checkIn.getTime() - expected.getTime()) / 60000);
                    return diff > 0 ? diff : null;
                  })();
                  const earlyMin = (() => {
                    if (!record.checkOutTime) return null;
                    const checkOut = new Date(record.checkOutTime);
                    const expected = new Date(checkOut);
                    expected.setHours(17, 0, 0, 0);
                    const diff = Math.round((expected.getTime() - checkOut.getTime()) / 60000);
                    return diff > 0 ? diff : null;
                  })();
                  const gpsDisplay = record.checkInLatitude != null && record.checkInLongitude != null
                    ? `${record.checkInLatitude.toFixed(2)}, ${record.checkInLongitude.toFixed(2)}`
                    : "—";
                  return (
                    <tr
                      key={record.id}
                      className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                      onClick={() => openDetail(record)}
                    >
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium whitespace-nowrap">
                        {empName}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {record.date}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap font-mono text-xs">
                        {formatTime(record.checkInTime)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap font-mono text-xs">
                        {formatTime(record.checkOutTime)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs">
                        {formatWorked(record.workedMinutes)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {lateMin != null ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">{lateMin}m</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {earlyMin != null ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">{earlyMin}m</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs">
                        {record.distanceFromSite != null ? `${record.distanceFromSite.toFixed(0)}m` : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap font-mono text-xs">
                        {gpsDisplay}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={getStatusBadgeVariant(record.attendanceStatus)} size="sm">
                          {getStatusLabel(record.attendanceStatus, isArabic)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {record.checkInSelfie ? (
                          <img
                            src={record.checkInSelfie}
                            alt="selfie"
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <Camera size={14} className="text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={(e) => { e.stopPropagation(); openDetail(record); }}
                          className="p-1.5 text-gray-400 hover:text-primary transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                          title={isArabic ? "عرض التفاصيل" : "View Details"}
                        >
                          <Eye size={16} />
                        </button>
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
          total={filteredRecords.length}
        />
      </Card>

      <DetailModal
        record={detailRecord}
        open={detailOpen}
        onClose={closeDetail}
        isArabic={isArabic}
        employeeName={detailRecord ? getEmployeeName(detailRecord.employeeId) : ""}
        projectName={detailRecord?.projectId ? (projectMap.get(detailRecord.projectId)?.name ?? "—") : "—"}
        buildingName={detailRecord?.buildingId ? (buildingMap.get(detailRecord.buildingId)?.name ?? "—") : "—"}
      />
    </div>
  );
}
