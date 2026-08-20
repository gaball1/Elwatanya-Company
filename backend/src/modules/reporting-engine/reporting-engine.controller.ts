import { Controller, Get, Post, Param, Query, Body, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportingEngineService } from './application/reporting-engine.service';
import { ReportFormat } from './domain/report-definition.entity';
import { GenerateReportParams } from './domain/report-handler.interface';
import { sendFileResponse } from '../../common/pdf-header.util';
import { RequirePermission } from '@/common/decorators/permissions.decorator';
import { Permissions } from '@/common/constants/permissions.constant';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Reporting Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reporting')
export class ReportingEngineController {
  constructor(private readonly service: ReportingEngineService) {}

  @Get('reports')
  @ApiOperation({ summary: 'List all available reports' })
  @RequirePermission(Permissions.Reports.Read)
  getAvailableReports() {
    return this.service.getAvailableReports();
  }

  @Post(':reportName/generate')
  @ApiOperation({ summary: 'Generate a report in specified format' })
  @RequirePermission(Permissions.Reports.Generate)
  async generateReport(
    @Param('reportName') reportName: string,
    @Query('format') format: ReportFormat,
    @Body() params: GenerateReportParams,
    @Res() res: Response,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.service.generateReport(reportName, format || 'pdf', params, user);

    sendFileResponse(res, result.buffer, result.filename, result.mimeType, 'attachment');
  }

  @Get(':reportName/preview')
  @ApiOperation({ summary: 'Preview a report as HTML' })
  @RequirePermission(Permissions.Reports.Read)
  async previewReport(
    @Param('reportName') reportName: string,
    @Query() params: GenerateReportParams,
  ) {
    const result = await this.service.previewReport(reportName, params);
    return { html: result };
  }
}
