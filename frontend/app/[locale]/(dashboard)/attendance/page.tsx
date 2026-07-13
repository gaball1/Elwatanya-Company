/* eslint-disable */
"use client";

import { useParams } from "next/navigation";
import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Save,
  User,
  Clock3,
} from "lucide-react";
import { mockEmployees, mockAttendance } from "@/lib/mockData";
import { useToast } from "@/components/ui/Toast";

type AttendanceStatus = "present" | "absent" | "late" | "vacation";

export default function AttendancePage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "ar";
  const isArabic = locale === "ar";
  const { showToast, ToastComponent } = useToast();

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "all">(
    "all"
  );

  const [attendanceRecords, setAttendanceRecords] = useState(() => {
    const existing = mockAttendance.filter((a) => a.date === selectedDate);
    const records: Record<string, any> = {};
    mockEmployees.forEach((emp) => {
      const existingRecord = existing.find((e) => e.employeeId === emp.id);
      if (existingRecord) {
        records[emp.id] = existingRecord;
      } else {
        records[emp.id] = {
          id: "",
          employeeId: emp.id,
          employeeName: emp.name,
          date: selectedDate,
          checkIn: "",
          checkOut: "",
          status: "absent" as AttendanceStatus,
          hoursWorked: 0,
          notes: "",
        };
      }
    });
    return records;
  });

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    const existing = mockAttendance.filter((a) => a.date === date);
    const newRecords: Record<string, any> = {};
    mockEmployees.forEach((emp) => {
      const existingRecord = existing.find((e) => e.employeeId === emp.id);
      if (existingRecord) {
        newRecords[emp.id] = existingRecord;
      } else {
        newRecords[emp.id] = {
          id: "",
          employeeId: emp.id,
          employeeName: emp.name,
          date: date,
          checkIn: "",
          checkOut: "",
          status: "absent" as AttendanceStatus,
          hoursWorked: 0,
          notes: "",
        };
      }
    });
    setAttendanceRecords(newRecords);
  };

  const updateAttendance = useCallback(
    (employeeId: string, field: string, value: any) => {
      setAttendanceRecords((prev) => ({
        ...prev,
        [employeeId]: { ...prev[employeeId], [field]: value },
      }));
    },
    []
  );

  const calculateHours = useCallback((checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const [inHour, inMin] = checkIn.split(":").map(Number);
    const [outHour, outMin] = checkOut.split(":").map(Number);
    let hours = outHour - inHour;
    let mins = outMin - inMin;
    if (mins < 0) {
      hours -= 1;
      mins += 60;
    }
    return Number((hours + mins / 60).toFixed(1));
  }, []);

  const handleSave = useCallback(() => {
    showToast(
      isArabic ? "تم حفظ الحضور بنجاح" : "Attendance saved successfully",
      "success"
    );
  }, [isArabic]);

  const exportToExcel = useCallback(() => {
    const records = Object.values(attendanceRecords);
    const headers = [
      "الموظف",
      "القسم",
      "الحالة",
      "وقت الدخول",
      "وقت الخروج",
      "عدد الساعات",
      "ملاحظات",
    ];
    const rows = records.map((r: any) => {
      const employee = mockEmployees.find((e) => e.id === r.employeeId);
      const statusText =
        r.status === "present"
          ? "حاضر"
          : r.status === "absent"
          ? "غائب"
          : r.status === "late"
          ? "متأخر"
          : "إجازة";
      return [
        r.employeeName,
        employee?.role || "",
        statusText,
        r.checkIn || "—",
        r.checkOut || "—",
        r.hoursWorked || 0,
        r.notes || "—",
      ];
    });
    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isArabic ? "تم تصدير التقرير" : "Report exported", "success");
  }, [attendanceRecords, selectedDate, isArabic]);

  const stats = useMemo(() => {
    const records = Object.values(attendanceRecords);
    const present = records.filter((r: any) => r.status === "present").length;
    const absent = records.filter((r: any) => r.status === "absent").length;
    const late = records.filter((r: any) => r.status === "late").length;
    const vacation = records.filter((r: any) => r.status === "vacation").length;
    return { present, absent, late, vacation, total: records.length };
  }, [attendanceRecords]);

  const filteredRecords = useMemo(() => {
    let records = Object.values(attendanceRecords);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      records = records.filter((r: any) =>
        r.employeeName.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== "all") {
      records = records.filter((r: any) => r.status === statusFilter);
    }
    return records;
  }, [attendanceRecords, searchTerm, statusFilter]);

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800 border-green-200";
      case "absent":
        return "bg-red-100 text-red-800 border-red-200";
      case "late":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "vacation":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-500";
    }
  };

  // دالة مساعدة لإضافة suppressHydrationWarning للعناصر الديناميكية
  const suppressProps = { suppressHydrationWarning: true };

  return (
    <div className="min-h-screen bg-gray-light" {...suppressProps}>
      {ToastComponent}

      <div className="bg-white border-b px-6 py-4" {...suppressProps}>
        <div
          className="flex justify-between items-center flex-wrap gap-4"
          {...suppressProps}
        >
          <div {...suppressProps}>
            <h1 className="text-2xl font-bold text-primary" {...suppressProps}>
              {isArabic ? "الحضور والانصراف" : "Attendance"}
            </h1>
            <p className="text-sm text-gray-500 mt-1" {...suppressProps}>
              {isArabic
                ? "تسجيل حضور وانصراف الموظفين"
                : "Record employee attendance"}
            </p>
          </div>
          <div className="flex gap-2" {...suppressProps}>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 border border-gold text-gold rounded-lg hover:bg-gold hover:text-white transition"
              suppressHydrationWarning
            >
              <Download size={18} />{" "}
              {isArabic ? "تصدير تقرير" : "Export Report"}
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
              suppressHydrationWarning
            >
              <Save size={18} /> {isArabic ? "حفظ الحضور" : "Save Attendance"}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6"
        {...suppressProps}
      >
        <Card className="p-4 text-center" {...suppressProps}>
          <div
            className="flex items-center justify-center gap-2 text-green-600"
            {...suppressProps}
          >
            <CheckCircle size={20} />
            <span className="text-sm">{isArabic ? "حاضر" : "Present"}</span>
          </div>
          <p className="text-2xl font-bold text-primary">{stats.present}</p>
        </Card>
        <Card className="p-4 text-center" {...suppressProps}>
          <div
            className="flex items-center justify-center gap-2 text-red-600"
            {...suppressProps}
          >
            <XCircle size={20} />
            <span className="text-sm">{isArabic ? "غائب" : "Absent"}</span>
          </div>
          <p className="text-2xl font-bold text-primary">{stats.absent}</p>
        </Card>
        <Card className="p-4 text-center" {...suppressProps}>
          <div
            className="flex items-center justify-center gap-2 text-yellow-600"
            {...suppressProps}
          >
            <AlertCircle size={20} />
            <span className="text-sm">{isArabic ? "متأخر" : "Late"}</span>
          </div>
          <p className="text-2xl font-bold text-primary">{stats.late}</p>
        </Card>
        <Card className="p-4 text-center" {...suppressProps}>
          <div
            className="flex items-center justify-center gap-2 text-blue-600"
            {...suppressProps}
          >
            <Calendar size={20} />
            <span className="text-sm">{isArabic ? "إجازة" : "Vacation"}</span>
          </div>
          <p className="text-2xl font-bold text-primary">{stats.vacation}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-white border-b px-6 py-4" {...suppressProps}>
        <div
          className="flex flex-wrap gap-4 items-center justify-between"
          {...suppressProps}
        >
          <div className="flex flex-wrap gap-3 items-center" {...suppressProps}>
            <div className="relative" {...suppressProps}>
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gold"
                suppressHydrationWarning
              />
            </div>
            <div className="relative" {...suppressProps}>
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={isArabic ? "بحث عن موظف..." : "Search employee..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 pl-4 py-2 border border-gray-200 rounded-lg w-64 focus:outline-none focus:border-gold"
                suppressHydrationWarning
              />
            </div>
            <div className="relative" {...suppressProps}>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as AttendanceStatus | "all")
                }
                className="pr-10 pl-4 py-2 border border-gray-200 rounded-lg appearance-none focus:outline-none focus:border-gold"
                suppressHydrationWarning
              >
                <option value="all">
                  {isArabic ? "كل الحالات" : "All Status"}
                </option>
                <option value="present">{isArabic ? "حاضر" : "Present"}</option>
                <option value="absent">{isArabic ? "غائب" : "Absent"}</option>
                <option value="late">{isArabic ? "متأخر" : "Late"}</option>
                <option value="vacation">
                  {isArabic ? "إجازة" : "Vacation"}
                </option>
              </select>
            </div>
          </div>
          <div className="text-sm text-gray-500" {...suppressProps}>
            {isArabic
              ? `إجمالي الموظفين: ${stats.total}`
              : `Total Employees: ${stats.total}`}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="p-6" {...suppressProps}>
        <Card className="overflow-hidden" {...suppressProps}>
          <div className="overflow-x-auto" {...suppressProps}>
            <table className="w-full" {...suppressProps}>
              <thead className="bg-gray-50" {...suppressProps}>
                <tr {...suppressProps}>
                  <th className="p-3 text-right" {...suppressProps}>
                    #
                  </th>
                  <th className="p-3 text-right" {...suppressProps}>
                    {isArabic ? "الموظف" : "Employee"}
                  </th>
                  <th className="p-3 text-center" {...suppressProps}>
                    {isArabic ? "الحالة" : "Status"}
                  </th>
                  <th className="p-3 text-center" {...suppressProps}>
                    {isArabic ? "وقت الدخول" : "Check In"}
                  </th>
                  <th className="p-3 text-center" {...suppressProps}>
                    {isArabic ? "وقت الخروج" : "Check Out"}
                  </th>
                  <th className="p-3 text-center" {...suppressProps}>
                    {isArabic ? "عدد الساعات" : "Hours"}
                  </th>
                  <th className="p-3 text-right" {...suppressProps}>
                    {isArabic ? "ملاحظات" : "Notes"}
                  </th>
                </tr>
              </thead>
              <tbody {...suppressProps}>
                {filteredRecords.length === 0 ? (
                  <tr {...suppressProps}>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-gray-500"
                      {...suppressProps}
                    >
                      {isArabic ? "لا توجد بيانات" : "No data found"}
                    </td>
                  </tr>
                ) : (
                  (filteredRecords as any[]).map((record, idx) => (
                    <tr
                      key={record.employeeId}
                      className="border-t hover:bg-gray-50"
                      {...suppressProps}
                    >
                      <td className="p-3" {...suppressProps}>
                        {idx + 1}
                      </td>
                      <td className="p-3" {...suppressProps}>
                        <div
                          className="flex items-center gap-2"
                          {...suppressProps}
                        >
                          <User size={16} className="text-gold" />
                          <span className="font-medium">
                            {record.employeeName}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center" {...suppressProps}>
                        <select
                          value={record.status}
                          onChange={(e) => {
                            const newStatus = e.target
                              .value as AttendanceStatus;
                            updateAttendance(
                              record.employeeId,
                              "status",
                              newStatus
                            );
                            if (newStatus === "absent") {
                              updateAttendance(
                                record.employeeId,
                                "checkIn",
                                ""
                              );
                              updateAttendance(
                                record.employeeId,
                                "checkOut",
                                ""
                              );
                              updateAttendance(
                                record.employeeId,
                                "hoursWorked",
                                0
                              );
                            }
                          }}
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            record.status
                          )} focus:outline-none`}
                          suppressHydrationWarning
                        >
                          <option value="present">
                            {isArabic ? "حاضر" : "Present"}
                          </option>
                          <option value="absent">
                            {isArabic ? "غائب" : "Absent"}
                          </option>
                          <option value="late">
                            {isArabic ? "متأخر" : "Late"}
                          </option>
                          <option value="vacation">
                            {isArabic ? "إجازة" : "Vacation"}
                          </option>
                        </select>
                      </td>
                      <td className="p-3 text-center" {...suppressProps}>
                        <input
                          type="time"
                          value={record.checkIn}
                          onChange={(e) => {
                            const newCheckIn = e.target.value;
                            updateAttendance(
                              record.employeeId,
                              "checkIn",
                              newCheckIn
                            );
                            const hours = calculateHours(
                              newCheckIn,
                              record.checkOut
                            );
                            updateAttendance(
                              record.employeeId,
                              "hoursWorked",
                              hours
                            );
                          }}
                          disabled={record.status === "absent"}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-28 text-center disabled:bg-gray-100 focus:outline-none focus:border-gold"
                          suppressHydrationWarning
                        />
                      </td>
                      <td className="p-3 text-center" {...suppressProps}>
                        <input
                          type="time"
                          value={record.checkOut}
                          onChange={(e) => {
                            const newCheckOut = e.target.value;
                            updateAttendance(
                              record.employeeId,
                              "checkOut",
                              newCheckOut
                            );
                            const hours = calculateHours(
                              record.checkIn,
                              newCheckOut
                            );
                            updateAttendance(
                              record.employeeId,
                              "hoursWorked",
                              hours
                            );
                          }}
                          disabled={record.status === "absent"}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-28 text-center disabled:bg-gray-100 focus:outline-none focus:border-gold"
                          suppressHydrationWarning
                        />
                      </td>
                      <td className="p-3 text-center" {...suppressProps}>
                        <div
                          className="flex items-center justify-center gap-1"
                          {...suppressProps}
                        >
                          <Clock3 size={14} className="text-gold" />
                          <span className="font-medium">
                            {record.hoursWorked || 0}
                          </span>
                        </div>
                      </td>
                      <td className="p-3" {...suppressProps}>
                        <input
                          type="text"
                          placeholder={isArabic ? "ملاحظات..." : "Notes..."}
                          value={record.notes}
                          onChange={(e) =>
                            updateAttendance(
                              record.employeeId,
                              "notes",
                              e.target.value
                            )
                          }
                          className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-gold"
                          suppressHydrationWarning
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
