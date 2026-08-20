import { Controller, Get, Post, Param, Query, UploadedFile, UseInterceptors, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ImportExportService } from './import-export.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { FormatType } from './domain/import-export-handler.interface';
import { MAX_FILE_SIZE_BYTES } from '../file/domain/file-security.constants';

@ApiTags('Import / Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('import-export')
export class ImportExportController {
  constructor(private readonly service: ImportExportService) {}

  @Post('import/:entityType')
  @ApiOperation({ summary: 'Import data from file' })
  @ApiConsumes('multipart/form-data')
  @RequirePermission('import-export:import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 } }))
  async import(
    @Param('entityType') entityType: string,
    @Query('format') format: FormatType,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const result = await this.service.importFromBuffer(entityType, file.buffer, format);
    return result;
  }

  @Get('export/:entityType')
  @ApiOperation({ summary: 'Export data to file' })
  @RequirePermission('import-export:export')
  async export(
    @Param('entityType') entityType: string,
    @Query('format') format: FormatType,
    @Res() res: Response,
  ) {
    const { buffer, mimeType } = await this.service.exportToBuffer(entityType, format);
    const ext = format === FormatType.JSON ? 'json' : format === FormatType.CSV ? 'csv' : 'xlsx';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${entityType}.${ext}"`);
    res.send(buffer);
  }

  @Get('handlers')
  @ApiOperation({ summary: 'List available import/export handlers' })
  @RequirePermission('import-export:view')
  async listHandlers() {
    return { handlers: [] };
  }
}
