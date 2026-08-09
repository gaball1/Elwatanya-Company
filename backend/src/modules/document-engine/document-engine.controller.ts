import { Controller, Get, Post, Put, Delete, Param, Body, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { DocumentEngineService } from './document-engine.service';
import { TemplateRegistry } from './templates/template.registry';
import { CreateTemplateDto, UpdateTemplateDto, CreateDocumentDto, GenerateFromTemplateDto } from './dto/template.dto';
import { sendFileResponse } from '../../common/pdf-header.util';

@ApiTags('Document Engine')
@ApiBearerAuth()
@Controller('document-engine')
export class DocumentEngineController {
  constructor(
    private readonly service: DocumentEngineService,
    private readonly registry: TemplateRegistry,
  ) {}

  // ─── Enterprise Templates ───────────────────────────────────────

  @Get('enterprise-templates')
  @ApiOperation({ summary: 'List all enterprise document templates' })
  async listEnterpriseTemplates() {
    return { templates: this.registry.getDefinitions() };
  }

  @Post('enterprise-templates/:name/generate')
  @ApiOperation({ summary: 'Generate a PDF from an enterprise template' })
  async generateEnterpriseTemplate(
    @Param('name') name: string,
    @Body() params: any,
    @Res() res: Response,
  ) {
    const template = this.registry.get(name);
    const result = await template.generate(params);
    sendFileResponse(res, result.buffer, result.filename, result.mimeType, 'inline');
  }

  // ─── Templates (CRUD) ──────────────────────────────────────────

  @Post('templates')
  @ApiOperation({ summary: 'Create a document template' })
  async createTemplate(@Body() dto: CreateTemplateDto) {
    return { template: await this.service.createTemplate(dto) };
  }

  @Get('templates')
  @ApiOperation({ summary: 'List templates' })
  async getTemplates(@Query('category') category?: string) {
    return { templates: await this.service.getTemplates(category) };
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template by ID' })
  async getTemplate(@Param('id') id: string) {
    return { template: await this.service.getTemplate(id) };
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update template' })
  async updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return { template: await this.service.updateTemplate(id, dto) };
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete template' })
  async deleteTemplate(@Param('id') id: string) {
    await this.service.deleteTemplate(id);
    return { deleted: true };
  }

  @Post('templates/:id/render')
  @ApiOperation({ summary: 'Preview template with variables' })
  async renderTemplate(@Param('id') id: string, @Body() body: { variables: Record<string, any> }) {
    return this.service.renderTemplate(id, body.variables);
  }

  // ─── Documents ─────────────────────────────────────────────────

  @Post('documents')
  @ApiOperation({ summary: 'Create a document' })
  async createDocument(@Body() dto: CreateDocumentDto) {
    return { document: await this.service.createDocument(dto) };
  }

  @Post('documents/generate')
  @ApiOperation({ summary: 'Generate document from template' })
  async generateFromTemplate(@Body() dto: GenerateFromTemplateDto) {
    const { rendered, missingVariables } = await this.service.renderTemplate(dto.templateId, dto.variables);
    const doc = await this.service.createDocument({
      title: dto.title || 'Generated Document',
      templateId: dto.templateId,
      variables: dto.variables,
    });
    return { document: doc, preview: rendered, missingVariables };
  }

  @Get('documents')
  @ApiOperation({ summary: 'List documents' })
  async getDocuments(
    @Query('category') category?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return { documents: await this.service.getDocuments(category, entityType, entityId) };
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Get document by ID' })
  async getDocument(@Param('id') id: string) {
    return { document: await this.service.getDocument(id) };
  }

  @Put('documents/:id')
  @ApiOperation({ summary: 'Update document' })
  async updateDocument(@Param('id') id: string, @Body() body: any) {
    return { document: await this.service.updateDocument(id, body) };
  }

  @Post('documents/:id/finalize')
  @ApiOperation({ summary: 'Finalize document' })
  async finalizeDocument(@Param('id') id: string) {
    return { document: await this.service.finalizeDocument(id) };
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete document' })
  async deleteDocument(@Param('id') id: string) {
    await this.service.deleteDocument(id);
    return { deleted: true };
  }
}
