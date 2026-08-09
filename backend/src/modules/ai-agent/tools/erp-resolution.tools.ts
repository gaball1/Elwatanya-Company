import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';
import { AgentHttpClient } from './http-client';
import { ToolResult } from '../dto/agent-response.dto';
import { pickBest, formatMoney } from './resolution.utils';

export interface ResolvedContractor {
  id: string;
  name: string;
  workType?: string;
  status?: string;
}

export interface ResolvedBuilding {
  id: string;
  name: string;
  code?: string;
  projectId: string;
  projectName?: string;
}

export interface ResolvedExtract {
  id: string;
  buildingId: string;
  buildingName: string;
  projectId: string;
  projectName: string;
  contractorId: string;
  contractorName: string;
  date: string;
  status: string;
  runningNumber?: number | null;
  label?: string | null;
  netPayable: number;
  totalWorkValue: number;
  previousPaid: number;
  totalDeductions: number;
}

export interface ResolvedPayment {
  id: string;
  buildingId: string;
  buildingName: string;
  projectId: string;
  projectName: string;
  contractorId: string;
  contractorName: string;
  extractId: string | null;
  amount: number;
  date: string;
  notes?: string | null;
}

async function loadProjects(api: AgentHttpClient, user: any): Promise<any[]> {
  const data = await api.get('/api/v1/projects', user.token);
  return data?.data?.items || data?.data?.projects || data?.data || [];
}

async function loadBuildingsForProject(api: AgentHttpClient, projectId: string, user: any): Promise<any[]> {
  const data = await api.get(`/api/v1/projects/${projectId}/buildings`, user.token);
  return data?.data?.buildings || data?.data?.items || data?.data || [];
}

async function loadContractors(api: AgentHttpClient, user: any): Promise<any[]> {
  const data = await api.get('/api/v1/subcontractors', user.token);
  return data?.data?.items || data?.data || [];
}

async function loadBuildingSubcontractors(api: AgentHttpClient, buildingId: string, user: any): Promise<any[]> {
  const data = await api.get(`/api/v1/buildings/${buildingId}/subcontractors`, user.token);
  return data?.data?.items || data?.data || [];
}

/**
 * Resolve a project from an id, code or (partial/Arabic) name.
 * A fresh name in the current request wins over a stale id from a previous
 * conversation turn.
 */
async function resolveProject(
  api: AgentHttpClient,
  args: Record<string, any>,
  user: any,
): Promise<{ project: any; found: boolean }> {
  const freshName = args.query || args.projectName || args.name;
  const ctxName = args.currentProjectName;

  const nameQuery = freshName || ctxName;
  if (nameQuery) {
    const projects = await loadProjects(api, user);
    const best = pickBest(projects, nameQuery, (p: any) => `${p.code} ${p.name}`);
    if (best) return { project: best, found: true };
    if (freshName) return { project: null, found: false }; // explicit name unmatched — do not fall back to a stale id
  }

  const projectId = args.projectId || args.id || args.currentProjectId;
  if (projectId) {
    try {
      const data = await api.get(`/api/v1/projects/${projectId}`, user.token);
      const project = data?.data?.project || data?.data;
      if (project) return { project, found: true };
    } catch {
      return { project: null, found: false };
    }
  }
  return { project: null, found: false };
}

/**
 * Resolve a contractor from an id or a (partial/Arabic/English) name.
 * A fresh name in the current request wins over a stale id from a previous
 * conversation turn; the id path also maps the nested `.props` entity shape
 * returned by the detail endpoint.
 */
async function resolveContractor(
  api: AgentHttpClient,
  args: Record<string, any>,
  user: any,
): Promise<{ contractor: any; found: boolean }> {
  const freshName = args.query || args.contractorName || args.name;
  const ctxName = args.currentContractorName;

  const nameQuery = freshName || ctxName;
  if (nameQuery) {
    const contractors = await loadContractors(api, user);
    const best = pickBest(contractors, nameQuery, (c: any) => `${c.name} ${c.workType || ''}`);
    if (best) return { contractor: best, found: true };
    if (freshName) return { contractor: null, found: false }; // explicit name unmatched — do not fall back to a stale id
  }

  const contractorId = args.contractorId || args.id || args.currentContractorId;
  if (contractorId) {
    try {
      const data = await api.get(`/api/v1/subcontractors/${contractorId}`, user.token);
      const entity = data?.data?.subcontractor || data?.data;
      const props = entity?.props || {};
      const contractor = {
        id: entity?.id || entity?._id?.value || props?._id?.value || contractorId,
        name: entity?.name || props.name,
        workType: entity?.workType || props.workType,
        status: entity?.status || props.status,
      };
      if (contractor.id && contractor.name) return { contractor, found: true };
    } catch {
      return { contractor: null, found: false };
    }
  }
  return { contractor: null, found: false };
}

/**
 * Resolve the buildings of a project that a contractor is assigned to.
 * If projectId is missing, all projects are searched (multi-project support).
 */
async function resolveContractorBuildings(
  api: AgentHttpClient,
  contractorId: string,
  args: Record<string, any>,
  user: any,
): Promise<ResolvedBuilding[]> {
  const resolved: ResolvedBuilding[] = [];
  let projects: any[] = [];

  if (args.projectId) {
    try {
      const data = await api.get(`/api/v1/projects/${args.projectId}`, user.token);
      const project = data?.data?.project || data?.data;
      if (project) projects = [project];
    } catch {
      projects = [];
    }
  } else {
    projects = await loadProjects(api, user);
  }

  for (const project of projects) {
    const buildings = await loadBuildingsForProject(api, project.id, user);
    for (const building of buildings) {
      const assignments = await loadBuildingSubcontractors(api, building.id, user);
      const assigned = assignments.some(
        (a: any) =>
          a.subcontractorId === contractorId ||
          a.subcontractor?.id === contractorId ||
          a.subcontractor?.subcontractorId === contractorId,
      );
      if (assigned) {
        resolved.push({
          id: building.id,
          name: building.name,
          code: building.code,
          projectId: project.id,
          projectName: project.name || project.code,
        });
      }
    }
  }
  return resolved;
}

/**
 * Shared multi-building extract retrieval. Each result is annotated with
 * project / building / contractor names so the response never needs UUIDs.
 */
async function collectExtracts(
  api: AgentHttpClient,
  args: Record<string, any>,
  user: any,
): Promise<{ extracts: ResolvedExtract[]; contractor: any; project: any; buildings: ResolvedBuilding[] }> {
  const { contractor, found } = await resolveContractor(api, args, user);
  if (!found) return { extracts: [], contractor: null, project: null, buildings: [] };

  const buildings = await resolveContractorBuildings(api, contractor.id, args, user);
  const extracts: ResolvedExtract[] = [];

  for (const building of buildings) {
    try {
      const data = await api.get(
        `/api/v1/buildings/${building.id}/contractors/${contractor.id}/extracts`,
        user.token,
      );
      const items = data?.data?.items || data?.items || [];
      for (const item of items) {
        extracts.push({
          id: item.id,
          buildingId: building.id,
          buildingName: building.name,
          projectId: building.projectId,
          projectName: building.projectName || '',
          contractorId: contractor.id,
          contractorName: contractor.name,
          date: item.date || item.extractDate || '',
          status: item.status || 'running',
          runningNumber: item.runningNumber ?? item.sequenceNumber ?? null,
          label: item.label ?? null,
          netPayable: Number(item.netPayable ?? 0),
          totalWorkValue: Number(item.totalWorkValue ?? 0),
          previousPaid: Number(item.previousPaid ?? 0),
          totalDeductions: Number(item.totalDeductions ?? 0),
        });
      }
    } catch {
      // building has no contractor BOQ -> no extracts
    }
  }

  extracts.sort((a, b) => (a.date < b.date ? 1 : -1));
  return { extracts, contractor, project: buildings[0] ?? null, buildings };
}

async function collectPayments(
  api: AgentHttpClient,
  args: Record<string, any>,
  user: any,
): Promise<{ payments: ResolvedPayment[]; contractor: any; buildings: ResolvedBuilding[] }> {
  const { contractor, found } = await resolveContractor(api, args, user);
  if (!found) return { payments: [], contractor: null, buildings: [] };

  const buildings = await resolveContractorBuildings(api, contractor.id, args, user);
  const payments: ResolvedPayment[] = [];

  for (const building of buildings) {
    try {
      const data = await api.get(
        `/api/v1/buildings/${building.id}/contractors/${contractor.id}/payments`,
        user.token,
      );
      const items = data?.data?.items || data?.items || [];
      for (const item of items) {
        payments.push({
          id: item.id,
          buildingId: building.id,
          buildingName: building.name,
          projectId: building.projectId,
          projectName: building.projectName || '',
          contractorId: contractor.id,
          contractorName: contractor.name,
          extractId: item.extractId ?? item.statementId ?? null,
          amount: Number(item.amount ?? 0),
          date: item.date || item.paidAt || item.createdAt || '',
          notes: item.notes ?? null,
        });
      }
    } catch {
      // building has no payments
    }
  }

  payments.sort((a, b) => (a.date < b.date ? 1 : -1));
  return { payments, contractor, buildings };
}

async function collectApprovals(
  api: AgentHttpClient,
  extractIds: string[],
  user: any,
): Promise<any[]> {
  if (extractIds.length === 0) return [];
  try {
    const data = await api.get('/api/v1/approvals?entityType=extract', user.token);
    const items = data?.data?.items || data?.items || [];
    const idSet = new Set(extractIds);
    return items.filter((a: any) => idSet.has(a.entityId));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// find_project
// ---------------------------------------------------------------------------
@Injectable()
export class FindProjectTool extends BaseTool {
  readonly name = 'find_project';
  readonly description = 'Find a project by code or name (partial, Arabic, case-insensitive).';
  readonly requiresPermission = 'projects.read';
  readonly requiredEntity = 'project';

  constructor(private readonly api: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<ToolResult> {
    try {
      const { project, found } = await resolveProject(this.api, args, user);
      if (!found) {
        const query = args.query || args.projectName || args.name || args.projectId;
        const projects = await loadProjects(this.api, user);
        const names = projects.map((p: any) => `${p.code} (${p.name})`).slice(0, 10).join(', ');
        return this.fail(
          query
            ? `I couldn't find a project matching "${query}". Available projects: ${names || 'none'}.`
            : 'Please provide a project code or name (e.g. NCT-2026).',
        );
      }
      return this.success({ id: project.id, code: project.code, name: project.name, status: project.status, progress: project.progress });
    } catch (e: any) {
      return this.fail(`Project lookup failed: ${e.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// list_project_buildings
// ---------------------------------------------------------------------------
@Injectable()
export class ListProjectBuildingsTool extends BaseTool {
  readonly name = 'list_project_buildings';
  readonly description = 'List the buildings of a project, resolving the project from context or name if needed.';
  readonly requiresPermission = 'buildings.read';
  readonly requiredEntity = 'building';

  constructor(private readonly api: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<ToolResult> {
    try {
      const { project, found } = await resolveProject(this.api, args, user);
      if (!found) return this.fail('I need a project to list its buildings. Please provide a project name or code.');
      const buildings = await loadBuildingsForProject(this.api, project.id, user);
      return this.success({
        projectId: project.id,
        projectName: project.name || project.code,
        items: buildings.map((b: any) => ({ id: b.id, name: b.name, code: b.code, type: b.type, status: b.status })),
      });
    } catch (e: any) {
      return this.fail(`Building lookup failed: ${e.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// find_building
// ---------------------------------------------------------------------------
@Injectable()
export class FindBuildingTool extends BaseTool {
  readonly name = 'find_building';
  readonly description = 'Find a building by name within a project (partial/Arabic/case-insensitive).';
  readonly requiresPermission = 'buildings.read';
  readonly requiredEntity = 'building';

  constructor(private readonly api: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<ToolResult> {
    try {
      const { project, found } = await resolveProject(this.api, args, user);
      if (!found) return this.fail('I need a project to find a building. Please provide a project name or code.');

      if (args.buildingId) {
        const data = await this.api.get(`/api/v1/buildings/${args.buildingId}`, user.token);
        const building = data?.data?.building || data?.data;
        return building
          ? this.success({ id: building.id, name: building.name, code: building.code, type: building.type, projectId: project.id })
          : this.fail('Building not found.');
      }

      const query = args.query || args.buildingName || args.name;
      if (!query) {
        const buildings = await loadBuildingsForProject(this.api, project.id, user);
        if (buildings.length === 1) {
          return this.success({ id: buildings[0].id, name: buildings[0].name, code: buildings[0].code, type: buildings[0].type, projectId: project.id });
        }
        return this.success({
          projectId: project.id,
          ambiguous: true,
          items: buildings.map((b: any) => ({ id: b.id, name: b.name, code: b.code })),
        });
      }

      const buildings = await loadBuildingsForProject(this.api, project.id, user);
      const best = pickBest(buildings, query, (b: any) => `${b.code} ${b.name}`);
      if (!best) {
        const names = buildings.map((b: any) => b.name).slice(0, 10).join(', ');
        return this.fail(`No building named "${query}". Buildings in ${project.name || project.code}: ${names || 'none'}.`);
      }
      return this.success({ id: best.id, name: best.name, code: best.code, type: best.type, projectId: project.id });
    } catch (e: any) {
      return this.fail(`Building lookup failed: ${e.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// find_contractor
// ---------------------------------------------------------------------------
@Injectable()
export class FindContractorTool extends BaseTool {
  readonly name = 'find_contractor';
  readonly description = 'Find a subcontractor by name (partial, Arabic, English, case-insensitive).';
  readonly requiresPermission = 'subcontractors.read';
  readonly requiredEntity = 'contractor';

  constructor(private readonly api: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<ToolResult> {
    try {
      const { contractor, found } = await resolveContractor(this.api, args, user);
      if (!found) {
        const query = args.query || args.contractorName || args.name || args.contractorId;
        const contractors = await loadContractors(this.api, user);
        const names = contractors.map((c: any) => c.name).slice(0, 10).join(', ');
        return this.fail(
          query
            ? `I couldn't find a contractor matching "${query}". Contractors: ${names || 'none'}.`
            : 'Please provide a contractor name (e.g. مقاولات الأهرام للبناء).',
        );
      }
      return this.success({ id: contractor.id, name: contractor.name, workType: contractor.workType, status: contractor.status });
    } catch (e: any) {
      return this.fail(`Contractor lookup failed: ${e.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// list_contractor_extracts  (multi-building, merged unified history)
// ---------------------------------------------------------------------------
@Injectable()
export class ListContractorExtractsTool extends BaseTool {
  readonly name: string = 'list_contractor_extracts';
  readonly description: string = 'List the extract history of a contractor across all of the contractor\'s buildings (multi-building merged), auto-resolving the project and contractor from context or names.';
  readonly requiresPermission: string | null = 'extracts.read';
  readonly requiredEntity: string | null = 'extract';

  constructor(private readonly api: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<ToolResult> {
    try {
      const { extracts, contractor, buildings } = await collectExtracts(this.api, args, user);
      if (!contractor) {
        const query = args.query || args.contractorName || args.name || args.contractorId;
        return this.fail(query ? `No contractor found for "${query}".` : 'Please provide a contractor name.');
      }

      const statusFilter = args.status ? String(args.status).toLowerCase() : null;
      let items = extracts;
      if (statusFilter) items = items.filter((e) => e.status.toLowerCase() === statusFilter);

      if (items.length === 0) {
        return this.success({
          contractor: { id: contractor.id, name: contractor.name, workType: contractor.workType },
          items: [],
          total: 0,
          note: `No ${statusFilter ? statusFilter + ' ' : ''}extracts found for ${contractor.name}${buildings.length ? '' : ' in any building'}.`,
        });
      }

      return this.success({
        contractor: { id: contractor.id, name: contractor.name, workType: contractor.workType },
        buildings: buildings.map((b) => ({ id: b.id, name: b.name, projectName: b.projectName })),
        items,
        total: items.length,
        totalWorkValue: items.reduce((s, e) => s + e.totalWorkValue, 0),
        totalNetPayable: items.reduce((s, e) => s + e.netPayable, 0),
      });
    } catch (e: any) {
      return this.fail(`Extract retrieval failed: ${e.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// list_extract_payments
// ---------------------------------------------------------------------------
@Injectable()
export class ListExtractPaymentsTool extends BaseTool {
  readonly name: string = 'list_extract_payments';
  readonly description: string = 'List the payment records made to a contractor across all of the contractor\'s buildings, optionally filtered by extract.';
  readonly requiresPermission: string | null = 'payments.read';
  readonly requiredEntity: string | null = 'payment';

  constructor(private readonly api: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<ToolResult> {
    try {
      const { payments, contractor, buildings } = await collectPayments(this.api, args, user);
      if (!contractor) {
        const query = args.query || args.contractorName || args.name || args.contractorId;
        return this.fail(query ? `No contractor found for "${query}".` : 'Please provide a contractor name.');
      }

      let items = payments;
      if (args.extractId) items = items.filter((p) => p.extractId === args.extractId);

      return this.success({
        contractor: { id: contractor.id, name: contractor.name, workType: contractor.workType },
        buildings: buildings.map((b) => ({ id: b.id, name: b.name, projectName: b.projectName })),
        items,
        total: items.length,
        totalPaid: items.reduce((s, p) => s + p.amount, 0),
      });
    } catch (e: any) {
      return this.fail(`Payment retrieval failed: ${e.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// list_extract_approvals
// ---------------------------------------------------------------------------
@Injectable()
export class ListExtractApprovalsTool extends BaseTool {
  readonly name = 'list_extract_approvals';
  readonly description = 'List approval records for a contractor\'s extracts (approved / rejected / pending).';
  readonly requiresPermission = 'approvals.read';
  readonly requiredEntity = 'approval';

  constructor(private readonly api: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<ToolResult> {
    try {
      let extractIds: string[] = args.extractIds || [];
      let extractsContext: ResolvedExtract[] = [];

      if (extractIds.length === 0) {
        const { extracts } = await collectExtracts(this.api, args, user);
        extractsContext = extracts;
        extractIds = extracts.map((e) => e.id);
      }

      const approvals = await collectApprovals(this.api, extractIds, user);
      const statusFilter = args.status ? String(args.status).toLowerCase() : null;
      let items = approvals;
      if (statusFilter) items = items.filter((a: any) => String(a.status).toLowerCase() === statusFilter);

      return this.success({
        items: items.map((a: any) => ({
          id: a.id,
          entityId: a.entityId,
          entityType: a.entityType,
          status: a.status,
          requestedBy: a.requestedBy,
          comment: a.comment || '',
          createdAt: a.createdAt,
          approvedAt: a.approvedAt,
        })),
        total: items.length,
        extractIds,
      });
    } catch (e: any) {
      return this.fail(`Approval retrieval failed: ${e.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// find_extract (latest / unpaid / approved / rejected)
// ---------------------------------------------------------------------------
@Injectable()
export class FindExtractTool extends BaseTool {
  readonly name = 'find_extract';
  readonly description = 'Find a specific extract of a contractor: latest, unpaid, approved or rejected.';
  readonly requiresPermission = 'extracts.read';
  readonly requiredEntity = 'extract';

  constructor(private readonly api: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<ToolResult> {
    try {
      const { extracts, contractor, buildings } = await collectExtracts(this.api, args, user);
      if (!contractor) return this.fail('Please provide a contractor name to find an extract.');
      if (extracts.length === 0) {
        return this.success({ contractor: { name: contractor.name }, found: false, note: `No extracts found for ${contractor.name}.` });
      }

      let payments: ResolvedPayment[] = [];
      if (args.unpaid || args.latest) {
        const { payments: ps } = await collectPayments(this.api, { ...args, contractorId: contractor.id }, user);
        payments = ps;
      }

      let approvals: any[] = [];
      if (args.approved || args.rejected) {
        approvals = await collectApprovals(this.api, extracts.map((e) => e.id), user);
      }

      let target: ResolvedExtract | null = null;

      if (args.extractId) {
        target = extracts.find((e) => e.id === args.extractId) || null;
      } else if (args.status) {
        const status = String(args.status).toLowerCase();
        target = extracts.find((e) => e.status.toLowerCase() === status) || null;
      } else if (args.unpaid) {
        const paidByExtract = new Map<string, number>();
        for (const p of payments) paidByExtract.set(p.extractId || '', (paidByExtract.get(p.extractId || '') || 0) + p.amount);
        target = extracts
          .filter((e) => (paidByExtract.get(e.id) || 0) < e.netPayable)
          .sort((a, b) => b.netPayable - a.netPayable)[0] || null;
        if (!target) {
          return this.success({ contractor: { name: contractor.name }, found: false, note: `All ${extracts.length} extract(s) of ${contractor.name} are fully paid.` });
        }
      } else if (args.approved || args.rejected) {
        const want = args.approved ? 'approved' : 'rejected';
        const approvedIds = new Set(approvals.filter((a) => String(a.status).toLowerCase() === want).map((a) => a.entityId));
        target = extracts.filter((e) => approvedIds.has(e.id)).sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;
        if (!target) {
          return this.success({ contractor: { name: contractor.name }, found: false, note: `No ${want} extract found for ${contractor.name}.` });
        }
      } else {
        // latest
        target = extracts[0];
      }

      if (!target) return this.fail('Extract not found.');

      const extractPayments = payments.filter((p) => p.extractId === target!.id);
      const extractApprovals = approvals.filter((a) => a.entityId === target!.id);

      return this.success({
        found: true,
        contractor: { id: contractor.id, name: contractor.name, workType: contractor.workType },
        building: { id: target.buildingId, name: target.buildingName, projectName: target.projectName },
        extract: target,
        payments: extractPayments,
        approvals: extractApprovals,
        paidAmount: extractPayments.reduce((s, p) => s + p.amount, 0),
        remaining: Math.max(0, target.netPayable - extractPayments.reduce((s, p) => s + p.amount, 0)),
      });
    } catch (e: any) {
      return this.fail(`Extract lookup failed: ${e.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// get_contractor_dues  (dues / balance / remaining payments)
// ---------------------------------------------------------------------------
@Injectable()
export class GetContractorDuesTool extends BaseTool {
  readonly name = 'get_contractor_dues';
  readonly description = 'Compute a contractor\'s financial position: total work value, net payable, total paid, remaining dues and outstanding extracts.';
  readonly requiresPermission = 'extracts.read';
  readonly requiredEntity = 'contractor';

  constructor(private readonly api: AgentHttpClient) { super(); }

  async execute(args: Record<string, any>, user: any): Promise<ToolResult> {
    try {
      const { extracts, contractor, buildings } = await collectExtracts(this.api, args, user);
      if (!contractor) return this.fail('Please provide a contractor name to compute dues.');

      const { payments } = await collectPayments(this.api, { ...args, contractorId: contractor.id }, user);

      const paidByExtract = new Map<string, number>();
      for (const p of payments) paidByExtract.set(p.extractId || '', (paidByExtract.get(p.extractId || '') || 0) + p.amount);

      const totalWorkValue = extracts.reduce((s, e) => s + e.totalWorkValue, 0);
      const totalDeductions = extracts.reduce((s, e) => s + e.totalDeductions, 0);
      const totalNetPayable = extracts.reduce((s, e) => s + e.netPayable, 0);
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      const remaining = Math.max(0, totalNetPayable - totalPaid);

      const outstanding = extracts
        .filter((e) => (paidByExtract.get(e.id) || 0) < e.netPayable)
        .map((e) => ({
          id: e.id,
          buildingName: e.buildingName,
          runningNumber: e.runningNumber,
          date: e.date,
          status: e.status,
          netPayable: e.netPayable,
          paid: paidByExtract.get(e.id) || 0,
          remaining: Math.max(0, e.netPayable - (paidByExtract.get(e.id) || 0)),
        }));

      return this.success({
        contractor: { id: contractor.id, name: contractor.name, workType: contractor.workType },
        buildings: buildings.map((b) => ({ id: b.id, name: b.name, projectName: b.projectName })),
        summary: {
          extractCount: extracts.length,
          totalWorkValue,
          totalDeductions,
          totalNetPayable,
          totalPaid,
          remaining,
          outstandingCount: outstanding.length,
        },
        outstanding,
      });
    } catch (e: any) {
      return this.fail(`Dues computation failed: ${e.message}`);
    }
  }
}

/** Formats a dues/balance summary into a user-facing sentence (no UUIDs). */
export function formatDuesSummary(data: any): string {
  if (!data?.contractor) return 'Contractor not found.';
  const s = data.summary;
  const name = data.contractor.name;
  const lines: string[] = [];
  lines.push(`**${name}** — financial position:`);
  lines.push(`• Extracts: ${s.extractCount} (total work ${formatMoney(s.totalWorkValue)} EGP, net payable ${formatMoney(s.totalNetPayable)} EGP)`);
  lines.push(`• Paid: ${formatMoney(s.totalPaid)} EGP`);
  lines.push(`• Remaining dues: ${formatMoney(s.remaining)} EGP`);
  if (s.outstandingCount > 0) {
    lines.push(`• Outstanding extracts: ${s.outstandingCount}`);
  } else {
    lines.push('• No outstanding extracts — all dues are settled.');
  }
  return lines.join('\n');
}
