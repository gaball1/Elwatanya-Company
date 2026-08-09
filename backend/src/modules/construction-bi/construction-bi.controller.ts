import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConstructionBiService } from './application/construction-bi.service';

@ApiTags('Construction BI')
@Controller('bi')
export class ConstructionBiController {
  constructor(private readonly service: ConstructionBiService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'List all registered KPI definitions' })
  getKpis() {
    return this.service.getRegisteredKpis();
  }

  @Get('kpis/:key')
  @ApiOperation({ summary: 'Evaluate a single KPI' })
  evaluateKpi(@Param('key') key: string, @Query('projectId') projectId?: string) {
    return this.service.evaluateKpi(key, projectId);
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate all KPIs for a project' })
  evaluateAll(@Body('projectId') projectId?: string) {
    return this.service.evaluateAll(projectId);
  }

  @Get('dashboard/:projectId')
  @ApiOperation({ summary: 'Get full project dashboard with KPIs' })
  getDashboard(@Param('projectId') projectId: string) {
    return this.service.getProjectDashboard(projectId);
  }
}
