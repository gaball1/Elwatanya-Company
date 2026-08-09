import { describe, it, expect } from 'vitest';
import { computeAttendanceIntelligence } from './attendance-intelligence';
import type { AnalyticsDataset, AttendanceRow, EmployeeRow, DepartmentRow } from '../domain/analytics.types';

function emptyDataset(): AnalyticsDataset {
  return {
    project: null,
    buildings: [],
    employerItems: [],
    analyticalItems: [],
    finalBoqItems: [],
    components: [],
    contractorBoqs: [],
    contractorBoqItems: [],
    statements: [],
    statementItems: [],
    payments: [],
    purchases: [],
    fund: null,
    fundTransactions: [],
    miscellaneous: [],
    inventoryItems: [],
    stockMovements: [],
    attendance: [],
    employees: [],
    departments: [],
    subcontractors: [],
    clientStatements: [],
    subcontractorStatements: [],
    pendingApprovals: 0,
  };
}

function attendance(over: Partial<AttendanceRow>): AttendanceRow {
  return {
    id: 'a1',
    employeeId: 'e1',
    date: new Date('2026-07-01'),
    workedMinutes: 480,
    hoursWorked: 0,
    attendanceStatus: 'present',
    status: 'present',
    buildingId: 'b1',
    ...over,
  };
}

function employee(over: Partial<EmployeeRow>): EmployeeRow {
  return { id: 'e1', fullName: 'Emp', salary: 1000, status: 'active', departmentId: 'd1', ...over };
}

function department(over: Partial<DepartmentRow>): DepartmentRow {
  return { id: 'd1', name: 'Engineering', ...over };
}

describe('attendance intelligence', () => {
  it('computes empty defaults when there are no records', () => {
    const res = computeAttendanceIntelligence(emptyDataset());
    expect(res.totalRecords).toBe(0);
    expect(res.attendanceRate).toBe(0);
    expect(res.absenceRate).toBe(0);
    expect(res.lateArrivalRate).toBe(0);
    expect(res.averageWorkingHours).toBe(0);
    expect(res.overtimeHours).toBe(0);
    expect(res.activeWorkforce).toBe(0);
    expect(res.dailyTrend).toEqual([]);
    expect(res.byBuilding).toEqual([]);
    expect(res.byDepartment).toEqual([]);
    expect(res.byContractor).toEqual([]);
  });

  it('computes rates from present/late/absent counts', () => {
    const ds = emptyDataset();
    ds.attendance = [
      attendance({ id: '1', attendanceStatus: 'present', status: 'present' }),
      attendance({ id: '2', attendanceStatus: 'checkedin', status: 'present' }),
      attendance({ id: '3', attendanceStatus: 'checkedout', status: 'present' }),
      attendance({ id: '4', attendanceStatus: 'late', status: 'late' }),
      attendance({ id: '5', attendanceStatus: 'absent', status: 'absent' }),
      attendance({ id: '6', attendanceStatus: 'absent', status: 'absent' }),
    ];
    const res = computeAttendanceIntelligence(ds);
    expect(res.totalRecords).toBe(6);
    expect(res.present).toBe(4);
    expect(res.late).toBe(1);
    expect(res.absent).toBe(2);
    expect(res.attendanceRate).toBe(66.67);
    expect(res.absenceRate).toBe(33.33);
    expect(res.lateArrivalRate).toBe(16.67);
  });

  it('counts unique present employees as active workforce', () => {
    const ds = emptyDataset();
    ds.attendance = [
      attendance({ id: '1', employeeId: 'e1', attendanceStatus: 'present' }),
      attendance({ id: '2', employeeId: 'e1', attendanceStatus: 'present' }),
      attendance({ id: '3', employeeId: 'e2', attendanceStatus: 'checkedout' }),
      attendance({ id: '4', employeeId: 'e3', attendanceStatus: 'absent' }),
    ];
    const res = computeAttendanceIntelligence(ds);
    expect(res.activeWorkforce).toBe(2); // e1, e2 (absent e3 excluded)
  });

  it('computes average working hours and overtime', () => {
    const ds = emptyDataset();
    ds.attendance = [
      attendance({ id: '1', workedMinutes: 480 }), // 8h
      attendance({ id: '2', workedMinutes: 600 }), // 10h -> 2h overtime
      attendance({ id: '3', workedMinutes: 480, hoursWorked: 1 }), // 9h -> 1h overtime
      attendance({ id: '4', workedMinutes: 300, attendanceStatus: 'absent', status: 'absent' }), // excluded
    ];
    const res = computeAttendanceIntelligence(ds);
    expect(res.averageWorkingHours).toBe(9); // (8+10+9)/3
    expect(res.overtimeHours).toBe(2); // workedMinutes-based only: 600-480=2h; 480 no overtime
  });

  it('builds daily trend sorted by date', () => {
    const ds = emptyDataset();
    ds.attendance = [
      attendance({ id: '1', date: new Date('2026-07-02'), attendanceStatus: 'late', status: 'late' }),
      attendance({ id: '2', date: new Date('2026-07-02'), attendanceStatus: 'present' }),
      attendance({ id: '3', date: new Date('2026-07-01'), attendanceStatus: 'absent', status: 'absent' }),
    ];
    const res = computeAttendanceIntelligence(ds);
    expect(res.dailyTrend).toHaveLength(2);
    expect(res.dailyTrend[0]).toMatchObject({ date: '2026-07-01', total: 1, absent: 1, present: 0 });
    expect(res.dailyTrend[1]).toMatchObject({ date: '2026-07-02', total: 2, present: 2, late: 1 });
  });

  it('breaks down by building using the building name', () => {
    const ds = emptyDataset();
    ds.buildings = [{ id: 'b1', name: 'Block A', code: 'A', status: 'active', startDate: null }];
    ds.attendance = [
      attendance({ id: '1', buildingId: 'b1', attendanceStatus: 'present' }),
      attendance({ id: '2', buildingId: 'b1', attendanceStatus: 'late', status: 'late' }),
      attendance({ id: '3', buildingId: null, attendanceStatus: 'absent', status: 'absent' }),
    ];
    const res = computeAttendanceIntelligence(ds);
    expect(res.byBuilding).toHaveLength(2);
    const blockA = res.byBuilding.find((b) => b.name === 'Block A');
    expect(blockA).toMatchObject({ total: 2, present: 2, late: 1, attendanceRate: 100 });
    const unassigned = res.byBuilding.find((b) => b.key === 'unassigned');
    expect(unassigned).toMatchObject({ name: 'Unassigned', total: 1, absent: 1, attendanceRate: 0 });
  });

  it('breaks down by department via the employee mapping', () => {
    const ds = emptyDataset();
    ds.employees = [employee({ id: 'e1', departmentId: 'd1' }), employee({ id: 'e2', departmentId: 'd2' })];
    ds.departments = [department({ id: 'd1', name: 'Engineering' }), department({ id: 'd2', name: 'Operations' })];
    ds.attendance = [
      attendance({ id: '1', employeeId: 'e1', attendanceStatus: 'present' }),
      attendance({ id: '2', employeeId: 'e2', attendanceStatus: 'absent', status: 'absent' }),
      attendance({ id: '3', employeeId: 'e1', attendanceStatus: 'late', status: 'late' }),
      attendance({ id: '4', employeeId: 'e9', attendanceStatus: 'present' }), // no employee -> unassigned
    ];
    const res = computeAttendanceIntelligence(ds);
    const eng = res.byDepartment.find((d) => d.name === 'Engineering');
    expect(eng).toMatchObject({ total: 2, present: 2, late: 1, attendanceRate: 100 });
    const ops = res.byDepartment.find((d) => d.name === 'Operations');
    expect(ops).toMatchObject({ total: 1, absent: 1, attendanceRate: 0 });
    const unassigned = res.byDepartment.find((d) => d.key === 'unassigned');
    expect(unassigned).toMatchObject({ total: 1, present: 1 });
  });

  it('leaves contractor breakdown empty until employee-contractor linking exists', () => {
    const ds = emptyDataset();
    ds.attendance = [attendance({ id: '1', attendanceStatus: 'present' })];
    const res = computeAttendanceIntelligence(ds);
    expect(res.byContractor).toEqual([]);
  });
});
