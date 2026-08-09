import { AnalyticsDataset, DrillDownNode } from '../domain/analytics.types';
import { num, round2, safeDiv } from './analytics-math';

export interface AttendanceBreakdown {
  key: string;
  name: string;
  total: number;
  present: number;
  late: number;
  absent: number;
  attendanceRate: number;
}

export interface AttendanceDayTrend {
  date: string;
  present: number;
  late: number;
  absent: number;
  total: number;
}

export interface AttendanceIntelligence {
  totalRecords: number;
  present: number;
  late: number;
  absent: number;
  attendanceRate: number;
  absenceRate: number;
  lateArrivalRate: number;
  averageWorkingHours: number;
  overtimeHours: number;
  activeWorkforce: number;
  dailyTrend: AttendanceDayTrend[];
  byBuilding: AttendanceBreakdown[];
  byDepartment: AttendanceBreakdown[];
  byContractor: AttendanceBreakdown[];
}

const PRESENT_STATUSES = ['present', 'checkedin', 'checkedout', 'late', 'pending'];

function isPresent(a: { attendanceStatus: string; status: string }): boolean {
  return PRESENT_STATUSES.includes(a.attendanceStatus.toLowerCase());
}

function isLate(a: { attendanceStatus: string; status: string }): boolean {
  return a.attendanceStatus.toLowerCase() === 'late' || a.status.toLowerCase() === 'late';
}

function isAbsent(a: { attendanceStatus: string; status: string }): boolean {
  return a.attendanceStatus.toLowerCase() === 'absent' || a.status.toLowerCase() === 'absent';
}

function workedHoursOf(a: { workedMinutes: number | null; hoursWorked: number }): number {
  return num(a.workedMinutes ?? 0) / 60 + num(a.hoursWorked);
}

function breakdown(
  rows: { key: string; name: string; status: { attendanceStatus: string; status: string } }[],
): AttendanceBreakdown[] {
  const map = new Map<string, { name: string; total: number; present: number; late: number; absent: number }>();
  for (const r of rows) {
    const entry = map.get(r.key) ?? { name: r.name, total: 0, present: 0, late: 0, absent: 0 };
    entry.total += 1;
    if (isPresent(r.status)) entry.present += 1;
    if (isLate(r.status)) entry.late += 1;
    if (isAbsent(r.status)) entry.absent += 1;
    map.set(r.key, entry);
  }
  return Array.from(map.entries())
    .map(([key, e]) => ({
      key,
      name: e.name,
      total: e.total,
      present: e.present,
      late: e.late,
      absent: e.absent,
      attendanceRate: safeDiv(e.present, e.total) * 100,
    }))
    .sort((a, b) => b.total - a.total);
}

export function computeAttendanceIntelligence(ds: AnalyticsDataset): AttendanceIntelligence {
  const total = ds.attendance.length;
  const present = ds.attendance.filter(isPresent).length;
  const late = ds.attendance.filter(isLate).length;
  const absent = ds.attendance.filter(isAbsent).length;

  const attendanceRate = safeDiv(present, total) * 100;
  const absenceRate = safeDiv(absent, total) * 100;
  const lateArrivalRate = safeDiv(late, total) * 100;

  const presentRecords = ds.attendance.filter((a) => isPresent(a) && workedHoursOf(a) > 0);
  const averageWorkingHours = safeDiv(
    presentRecords.reduce((s, a) => s + workedHoursOf(a), 0),
    presentRecords.length,
  );
  const overtimeHours = round2(
    ds.attendance.reduce((s, a) => s + Math.max(0, (num(a.workedMinutes ?? 0) - 480) / 60), 0),
  );

  const activeWorkforce = new Set(
    ds.attendance.filter((a) => isPresent(a)).map((a) => a.employeeId).filter(Boolean),
  ).size;

  const dayMap = new Map<string, AttendanceDayTrend>();
  for (const a of ds.attendance) {
    const date = a.date.toISOString().slice(0, 10);
    const entry = dayMap.get(date) ?? { date, present: 0, late: 0, absent: 0, total: 0 };
    entry.total += 1;
    if (isPresent(a)) entry.present += 1;
    if (isLate(a)) entry.late += 1;
    if (isAbsent(a)) entry.absent += 1;
    dayMap.set(date, entry);
  }
  const dailyTrend = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  const buildingName = new Map(ds.buildings.map((b) => [b.id, b.name]));
  const byBuilding = breakdown(
    ds.attendance.map((a) => ({
      key: a.buildingId ?? 'unassigned',
      name: a.buildingId ? (buildingName.get(a.buildingId) ?? 'Unknown Building') : 'Unassigned',
      status: a,
    })),
  );

  const employeeDept = new Map(ds.employees.map((e) => [e.id, e.departmentId]));
  const deptName = new Map(ds.departments.map((d) => [d.id, d.name]));
  const byDepartment = breakdown(
    ds.attendance.map((a) => {
      const deptId = a.employeeId ? (employeeDept.get(a.employeeId) ?? null) : null;
      return {
        key: deptId ?? 'unassigned',
        name: deptId ? (deptName.get(deptId) ?? 'Unknown Department') : 'Unassigned',
        status: a,
      };
    }),
  );

  const byContractor: AttendanceBreakdown[] = [];

  return {
    totalRecords: total,
    present,
    late,
    absent,
    attendanceRate: round2(attendanceRate),
    absenceRate: round2(absenceRate),
    lateArrivalRate: round2(lateArrivalRate),
    averageWorkingHours: round2(averageWorkingHours),
    overtimeHours,
    activeWorkforce,
    dailyTrend,
    byBuilding,
    byDepartment,
    byContractor,
  };
}

export type AttendanceDrilldownKpi = 'attendance_rate' | 'absence_rate' | 'late_rate' | 'overtime_hours' | 'active_workforce';

const ATTENDANCE_DRILLDOWN_KPIS = new Set<AttendanceDrilldownKpi>([
  'attendance_rate', 'absence_rate', 'late_rate', 'overtime_hours', 'active_workforce',
]);

export function isAttendanceDrilldownKpi(kpi: string): kpi is AttendanceDrilldownKpi {
  return ATTENDANCE_DRILLDOWN_KPIS.has(kpi as AttendanceDrilldownKpi);
}

function kpiValueFor(intel: AttendanceIntelligence, kpi: AttendanceDrilldownKpi): number {
  switch (kpi) {
    case 'attendance_rate': return intel.attendanceRate;
    case 'absence_rate': return intel.absenceRate;
    case 'late_rate': return intel.lateArrivalRate;
    case 'overtime_hours': return intel.overtimeHours;
    case 'active_workforce': return intel.activeWorkforce;
  }
}

function fmtKpi(kpi: AttendanceDrilldownKpi, value: number): string {
  if (kpi === 'overtime_hours') return `${value.toFixed(1)}h`;
  if (kpi === 'active_workforce') return `${value}`;
  return `${value.toFixed(1)}%`;
}

/** Drill-down tree project -> building -> department for a single attendance KPI. */
export function computeAttendanceDrillDown(ds: AnalyticsDataset, kpi: AttendanceDrilldownKpi): DrillDownNode | null {
  if (!ds.project) return null;

  const intel = computeAttendanceIntelligence(ds);
  const projectValue = kpiValueFor(intel, kpi);

  const buildingName = new Map(ds.buildings.map((b) => [b.id, b.name]));
  const employeeDept = new Map(ds.employees.map((e) => [e.id, e.departmentId]));
  const deptName = new Map(ds.departments.map((d) => [d.id, d.name]));

  const buildingNodes = ds.buildings.map((b) => {
    const rows = ds.attendance.filter((a) => a.buildingId === b.id);
    const buildingIntel = computeAttendanceIntelligence({ ...ds, attendance: rows, buildings: [b] });
    const bValue = kpiValueFor(buildingIntel, kpi);

    const deptMap = new Map<string, DrillDownNode>();
    for (const a of rows) {
      const deptId = a.employeeId ? (employeeDept.get(a.employeeId) ?? null) : null;
      const key = deptId ?? 'unassigned';
      const existing = deptMap.get(key);
      if (!existing) {
        deptMap.set(key, {
          level: 'department',
          id: key,
          name: deptId ? (deptName.get(deptId) ?? 'Unknown Department') : 'Unassigned',
          value: 0,
          display: '0',
          children: [],
        });
      }
      deptMap.get(key)!.children.push({
        level: 'attendance',
        id: a.id,
        name: `${a.date.toISOString().slice(0, 10)}`,
        value: 1,
        display: `${a.attendanceStatus}`,
        children: [],
      });
    }

    const deptNodes = Array.from(deptMap.values()).map((node) => {
      const deptRows = rows.filter((a) => {
        const deptId = a.employeeId ? (employeeDept.get(a.employeeId) ?? null) : null;
        return (deptId ?? 'unassigned') === node.id;
      });
      const deptIntel = computeAttendanceIntelligence({ ...ds, attendance: deptRows });
      const v = kpiValueFor(deptIntel, kpi);
      return { ...node, value: round2(v), display: fmtKpi(kpi, v) };
    });

    return {
      level: 'building',
      id: b.id,
      name: b.name,
      value: round2(bValue),
      display: fmtKpi(kpi, bValue),
      children: deptNodes,
    };
  });

  return {
    level: 'project',
    id: ds.project.id,
    name: ds.project.name,
    value: round2(projectValue),
    display: fmtKpi(kpi, projectValue),
    children: buildingNodes,
  };
}
