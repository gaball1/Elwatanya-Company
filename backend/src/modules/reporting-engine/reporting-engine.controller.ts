import { Controller, Get, Post, Param, Query, Body, Res, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportingEngineService } from './application/reporting-engine.service';
import { ReportFormat } from './domain/report-definition.entity';
import { GenerateReportParams } from './domain/report-handler.interface';
import { sendFileResponse } from '../../common/pdf-header.util';

@ApiTags('Reporting Engine')
@Controller('reporting')
export class ReportingEngineController {
  constructor(private readonly service: ReportingEngineService) {}

  @Get('reports')
  @ApiOperation({ summary: 'List all available reports' })
  getAvailableReports() {
    return this.service.getAvailableReports();
  }

  @Post(':reportName/generate')
  @ApiOperation({ summary: 'Generate a report in specified format' })
  async generateReport(
    @Param('reportName') reportName: string,
    @Query('format') format: ReportFormat,
    @Body() params: GenerateReportParams,
    @Res() res: Response,
    @Headers('authorization') auth: string,
  ) {
    const token = auth?.replace('Bearer ', '') || '';
    const user = { token, sub: '', email: '', permissions: [] as string[], role: '' };

    const result = await this.service.generateReport(reportName, format || 'pdf', params, user);

    sendFileResponse(res, result.buffer, result.filename, result.mimeType, 'attachment');
  }

  @Get(':reportName/preview')
  @ApiOperation({ summary: 'Preview a report as HTML' })
  async previewReport(
    @Param('reportName') reportName: string,
    @Query() params: GenerateReportParams,
  ) {
    const result = await this.service.previewReport(reportName, params);
    return { html: result };
  }
}
