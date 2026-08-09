import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfEngineService } from '../../pdf-engine/application/pdf-engine.service';
import { QrCodeService } from '../../pdf-engine/application/qr-code.service';
import { BaseTemplate, TemplateParams } from './base-template';

@Injectable()
export class ProjectProgressTemplate extends BaseTemplate {
  readonly name = 'project_progress';
  readonly displayName = 'Project Progress Report';
  readonly description = 'Comprehensive project progress report with buildings, contracts, and completion status';
  readonly requiresProject = true;
  readonly requiresBuilding = false;

  constructor(prisma: PrismaService, pdfEngine: PdfEngineService, qrCode: QrCodeService) {
    super(prisma, pdfEngine, qrCode);
  }

  protected getArabicTitle(): string {
    return 'تقرير تقدم المشروع';
  }

  async buildSections(params: TemplateParams): Promise<string> {
    const project = params.projectId
      ? await this.prisma.project.findUnique({ where: { id: params.projectId } })
      : null;
    const buildings = params.projectId
      ? await this.prisma.building.findMany({ where: { projectId: params.projectId } })
      : [];
    const boqs = params.projectId
      ? await this.prisma.finalBoq.findMany({ where: { projectId: params.projectId } })
      : [];
    const subcontractors = params.projectId
      ? await this.prisma.buildingSubcontractor.findMany({
          where: { building: { projectId: params.projectId } },
        })
      : [];

    const completedContracts = boqs.filter(b => b.status === 'approved').length;
    const activeBuildings = buildings.filter(b => b.status === 'active').length;

    return `
      ${this.kpiRow([
        { label: 'Buildings', value: buildings.length.toString(), color: '#1e40af' },
        { label: 'Active', value: activeBuildings.toString(), color: '#059669' },
        { label: 'Contracts', value: boqs.length.toString(), color: '#0891b2' },
        { label: 'Progress', value: `${project?.progress || 0}%`, color: '#d97706' },
      ])}
      ${this.card('Project Overview', `
        <p><strong>Project:</strong> ${project?.name || 'N/A'}</p>
        <p><strong>Status:</strong> ${project?.status || 'N/A'}</p>
        <p><strong>Location:</strong> ${project?.location || 'N/A'}</p>
        <p><strong>Client:</strong> ${project?.client || 'N/A'}</p>
        <p><strong>Progress:</strong> ${project?.progress || 0}%</p>
        <div style="background:#e2e8f0;border-radius:8px;height:24px;margin-top:12px;overflow:hidden">
          <div style="width:${project?.progress || 0}%;background:${(project?.progress || 0) >= 80 ? '#059669' : (project?.progress || 0) >= 50 ? '#d97706' : '#dc2626'};height:100%;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:13px">${project?.progress || 0}%</div>
        </div>
      `)}
      ${buildings.length > 0 ? this.card('Buildings', this.table(
        ['Building', 'Code', 'Type', 'Status'],
        buildings.map(b => [b.name, b.code || '', b.type || '', b.status || '']),
      )) : ''}
      ${this.note(`Project progress as of ${new Date().toLocaleDateString('en-CA')}. ${subcontractors.length} subcontractor assignments.`)}
    `;
  }

  async buildExecutiveSummary(params: TemplateParams): Promise<string> {
    const project = params.projectId
      ? await this.prisma.project.findUnique({ where: { id: params.projectId } })
      : null;
    return `<p>Project <strong>${project?.name || 'N/A'}</strong>: ${project?.progress || 0}% complete. Status: <strong>${project?.status || 'N/A'}</strong>.</p>`;
  }
}
