import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TemplateEngineService } from './template-engine.service';
import { CreateTemplateDto, UpdateTemplateDto, CreateDocumentDto } from './dto/template.dto';

@Injectable()
export class DocumentEngineService {
  private readonly logger = new Logger(DocumentEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateEngine: TemplateEngineService,
  ) {}

  // ─── Templates ─────────────────────────────────────────────────

  async createTemplate(dto: CreateTemplateDto) {
    return this.prisma.documentTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category || 'general',
        content: dto.content,
        variables: dto.variables || [],
      },
    });
  }

  async getTemplates(category?: string) {
    const where = category ? { category } : {};
    return this.prisma.documentTemplate.findMany({ where, orderBy: { updatedAt: 'desc' } });
  }

  async getTemplate(id: string) {
    const template = await this.prisma.documentTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto) {
    await this.getTemplate(id);
    return this.prisma.documentTemplate.update({ where: { id }, data: dto });
  }

  async deleteTemplate(id: string) {
    await this.getTemplate(id);
    await this.prisma.documentTemplate.delete({ where: { id } });
  }

  async renderTemplate(templateId: string, variables: Record<string, any>) {
    const template = await this.getTemplate(templateId);
    const rendered = this.templateEngine.render(template.content, variables);
    const placeholders = this.templateEngine.extractPlaceholders(template.content)
      .filter((p) => !(p in variables));
    return { rendered, missingVariables: placeholders };
  }

  // ─── Documents ─────────────────────────────────────────────────

  async createDocument(dto: CreateDocumentDto) {
    let rendered: string | undefined;
    let variables = dto.variables || {};

    if (dto.templateId) {
      const template = await this.getTemplate(dto.templateId);
      const result = this.templateEngine.render(template.content, variables);
      rendered = result;
    }

    return this.prisma.document.create({
      data: {
        title: dto.title,
        templateId: dto.templateId,
        category: dto.category || 'general',
        status: 'draft',
        content: rendered,
        variables,
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
    });
  }

  async getDocuments(category?: string, entityType?: string, entityId?: string) {
    const where: any = {};
    if (category) where.category = category;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    return this.prisma.document.findMany({
      where,
      include: { template: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getDocument(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { template: { select: { id: true, name: true } } },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async getDocumentByNumber(documentNumber: string) {
    const doc = await this.prisma.document.findFirst({
      where: { documentNumber },
      include: { template: { select: { id: true, name: true } } },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async updateDocument(id: string, data: { title?: string; content?: string; status?: string; variables?: any }) {
    await this.getDocument(id);
    return this.prisma.document.update({ where: { id }, data });
  }

  async deleteDocument(id: string) {
    await this.getDocument(id);
    await this.prisma.document.delete({ where: { id } });
  }

  async finalizeDocument(id: string) {
    const doc = await this.getDocument(id);
    return this.prisma.document.update({
      where: { id },
      data: { status: 'final', version: doc.version },
    });
  }
}
