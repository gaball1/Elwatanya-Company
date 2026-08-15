import { ToolResult } from '../dto/agent-response.dto';

export interface ToolParameterSchema {
  type: 'object';
  properties: Record<string, any>;
  required?: string[];
}

export abstract class BaseTool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly requiresPermission: string | null;
  abstract readonly requiredEntity: string | null;

  /** JSON schema used by the LLM to fill arguments (function calling). */
  readonly parameters?: ToolParameterSchema;

  abstract execute(
    args: Record<string, any>,
    user: { sub: string; permissions: string[]; role: string; projectId?: string; token?: string },
    context?: Record<string, any>,
  ): Promise<ToolResult>;

  protected success(data?: any, metadata?: Record<string, any>): ToolResult {
    return { success: true, data, metadata };
  }

  protected fail(error: string): ToolResult {
    return { success: false, error };
  }
}
