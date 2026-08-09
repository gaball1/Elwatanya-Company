export class AgentResponseDto {
  success: boolean;
  message: string;
  data?: any;
  intent?: string;
  requiresFollowUp?: boolean;
  followUpQuestion?: string;
  conversationId?: string;
}

export class ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export class IntentResult {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  toolName?: string;
  requiredPermissions?: string[];
  requiresFollowUp?: boolean;
  followUpQuestion?: string;
  requiresWorkflow?: string;
}
