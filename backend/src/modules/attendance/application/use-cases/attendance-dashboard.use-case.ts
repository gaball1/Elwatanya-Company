import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface DashboardStats {
  presentToday: number;
  absentToday: number;
  lateToday: number;
  checkedOut: number;
  workingNow: number;
  outsideSite: number;
  avgWorkedMinutes: number;
  attendanceRate: number;
  totalEmployees: number;
  todayDate: string;
}

@Injectable()
export class AttendanceDashboardUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<{ stats: DashboardStats }> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;

    const todayStart = new Date(`${todayDate}T00:00:00.000Z`);
    const todayEnd = new Date(`${todayDate}T23:59:59.999Z`);

    const totalEmployees = await this.prisma.employee.count({
      where: { status: 'active', deletedAt: null },
    });

    const todayRecords = await this.prisma.attendance.findMany({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        deletedAt: null,
      },
      include: {
        building: true,
      },
    });

    const presentToday = todayRecords.filter(
      (r) => r.attendanceStatus === 'checkedIn' || r.attendanceStatus === 'checkedOut',
    ).length;

    const lateToday = todayRecords.filter(
      (r) => r.attendanceStatus === 'late',
    ).length;

    const checkedOut = todayRecords.filter(
      (r) => r.attendanceStatus === 'checkedOut',
    ).length;

    const workingNow = todayRecords.filter(
      (r) => r.attendanceStatus === 'checkedIn',
    ).length;

    const outsideSite = todayRecords.filter((r) => {
      if (r.distanceFromSite == null) return false;
      const radius = r.building?.allowedRadius ?? 100;
      return r.distanceFromSite > radius;
    }).length;

    const presentRecords = todayRecords.filter(
      (r) => r.attendanceStatus === 'checkedIn' || r.attendanceStatus === 'checkedOut',
    );
    const totalWorkedMinutes = presentRecords.reduce(
      (sum, r) => sum + (r.workedMinutes ?? 0),
      0,
    );
    const avgWorkedMinutes = presentRecords.length > 0
      ? Math.round(totalWorkedMinutes / presentRecords.length)
      : 0;

    const presentTodayCount = presentToday;
    const attendanceRate = totalEmployees > 0
      ? Math.round((presentTodayCount / totalEmployees) * 100)
      : 0;

    const absentToday = totalEmployees - presentTodayCount;

    return {
      stats: {
        presentToday,
        absentToday,
        lateToday,
        checkedOut,
        workingNow,
        outsideSite,
        avgWorkedMinutes,
        attendanceRate,
        totalEmployees,
        todayDate,
      },
    };
  }
}
