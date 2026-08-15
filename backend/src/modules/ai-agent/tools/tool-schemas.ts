import { ToolParameterSchema } from './base.tool';

/**
 * Shared JSON-schema fragments for LLM function calling. Tools read entity
 * names/codes and resolve them to IDs at execution time, so the model can pass
 * a project code like "NCM-2026" without knowing its UUID.
 */

export const projectRefProps = {
  projectId: { type: 'string', description: 'Project UUID (rarely needed — a name or code works).' },
  projectName: { type: 'string', description: 'Project name or code, e.g. NCM-2026 or الأهرام.' },
};

export const contractorRefProps = {
  contractorId: { type: 'string', description: 'Subcontractor UUID (rarely needed — a name works).' },
  contractorName: { type: 'string', description: 'Subcontractor name, e.g. مقاولات الأهرام للبناء.' },
  query: { type: 'string', description: 'Free-text name to match.' },
};

export const statusProps = {
  status: {
    type: 'string',
    description: 'Status filter (approved, rejected, pending, draft, cancelled, active, completed, on_hold, running, paid, unpaid).',
  },
};

export function schema(properties: Record<string, any>, required: string[] = []): ToolParameterSchema {
  return { type: 'object', properties, required };
}

export function projectSchema(extra: Record<string, any> = {}, required: string[] = []): ToolParameterSchema {
  return schema({ ...projectRefProps, ...extra }, required);
}

export function contractorSchema(extra: Record<string, any> = {}, required: string[] = []): ToolParameterSchema {
  return schema({ ...contractorRefProps, ...extra }, required);
}
