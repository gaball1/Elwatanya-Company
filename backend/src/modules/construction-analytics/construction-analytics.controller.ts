import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './application/analytics.service';

@ApiTags('Construction Analytics')
@Controller('analytics')
export class ConstructionAnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('projects')
  @ApiOperation({ summary: 'List all projects with analytics' })
  listProjects() {
    return this.service.listProjects();
  }

  @Get('executive')
  @ApiOperation({ summary: 'Company-wide executive dashboard across all projects' })
  getExecutive() {
    return this.service.getExecutive();
  }

  @Get('project/:projectId/dashboard')
  @ApiOperation({ summary: 'Full project dashboard with KPIs, EVM, progress, cost, intelligence and risks' })
  getDashboard(@Param('projectId') projectId: string) {
    return this.service.getDashboard(projectId);
  }

  @Get('project/:projectId/kpis')
  @ApiOperation({ summary: 'Project KPI metrics' })
  getKpis(@Param('projectId') projectId: string) {
    return this.service.getKpis(projectId);
  }

  @Get('project/:projectId/evm')
  @ApiOperation({ summary: 'Earned value management metrics (PV, EV, AC, CPI, SPI, EAC)' })
  getEvm(@Param('projectId') projectId: string) {
    return this.service.getEvm(projectId);
  }

  @Get('project/:projectId/progress')
  @ApiOperation({ summary: 'Progress by project, building, category and BOQ' })
  getProgress(@Param('projectId') projectId: string) {
    return this.service.getProgress(projectId);
  }

  @Get('project/:projectId/costs')
  @ApiOperation({ summary: 'Cost breakdown by BOQ item' })
  getCosts(@Param('projectId') projectId: string) {
    return this.service.getCostBreakdown(projectId);
  }

  @Get('project/:projectId/boq')
  @ApiOperation({ summary: 'BOQ intelligence: profit/loss, delays, highest cost and revenue items' })
  getBoq(@Param('projectId') projectId: string) {
    return this.service.getBoqAnalysis(projectId);
  }

  @Get('project/:projectId/contractors')
  @ApiOperation({ summary: 'Subcontractor performance analysis' })
  getContractors(@Param('projectId') projectId: string) {
    return this.service.getContractors(projectId);
  }

  @Get('project/:projectId/purchases')
  @ApiOperation({ summary: 'Purchase intelligence: budget, orders, suppliers' })
  getPurchases(@Param('projectId') projectId: string) {
    return this.service.getPurchases(projectId);
  }

  @Get('project/:projectId/treasury')
  @ApiOperation({ summary: 'Treasury intelligence: cash flow, balances, forecast' })
  getTreasury(@Param('projectId') projectId: string) {
    return this.service.getTreasury(projectId);
  }

  @Get('project/:projectId/inventory')
  @ApiOperation({ summary: 'Inventory intelligence: stock levels and reorder items' })
  getInventory(@Param('projectId') projectId: string) {
    return this.service.getInventory(projectId);
  }

  @Get('project/:projectId/employees')
  @ApiOperation({ summary: 'Employee/attendance intelligence' })
  getEmployees(@Param('projectId') projectId: string) {
    return this.service.getEmployees(projectId);
  }

  @Get('project/:projectId/attendance')
  @ApiOperation({ summary: 'Attendance intelligence: rates, working hours, overtime, workforce, daily trend, building and department breakdowns' })
  getAttendance(@Param('projectId') projectId: string) {
    return this.service.getAttendance(projectId);
  }

  @Get('project/:projectId/buildings')
  @ApiOperation({ summary: 'Per-building dashboards' })
  getBuildings(@Param('projectId') projectId: string) {
    return this.service.getBuildings(projectId);
  }

  @Get('project/:projectId/risks')
  @ApiOperation({ summary: 'Project risk engine output' })
  getRisks(@Param('projectId') projectId: string) {
    return this.service.getRisks(projectId);
  }

  @Get('project/:projectId/drilldown')
  @ApiOperation({ summary: 'Drill-down detail for a specific KPI' })
  getDrillDown(@Param('projectId') projectId: string, @Query('kpi') kpi: string) {
    return this.service.getDrillDown(projectId, kpi);
  }

  @Get('project/:projectId/summary')
  @ApiOperation({ summary: 'AI-ready executive summary with actions' })
  getSummary(@Param('projectId') projectId: string) {
    return this.service.getSummary(projectId);
  }
}
