export enum IntentCategory {
  KNOWLEDGE_QUERY = 'KNOWLEDGE_QUERY',
  DATA_RETRIEVAL = 'DATA_RETRIEVAL',
  EXECUTE_OPERATION = 'EXECUTE_OPERATION',
  BUSINESS_ANALYSIS = 'BUSINESS_ANALYSIS',
  WORKFLOW = 'WORKFLOW',
}

export interface IntentDefinition {
  category: IntentCategory;
  action: string;
  description: string;
  toolName?: string;
  requiredPermissions?: string[];
  requiresFollowUp?: boolean;
  followUpQuestion?: string;
  entities?: string[];
  requiresWorkflow?: string;
}
