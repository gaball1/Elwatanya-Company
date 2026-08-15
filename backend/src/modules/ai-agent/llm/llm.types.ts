export type LlmRole = 'system' | 'user' | 'assistant' | 'tool';

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface LlmMessage {
  role: LlmRole;
  content: string;
  toolCallId?: string;
  toolCalls?: LlmToolCall[];
}

export interface LlmToolDefinition {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface LlmChatOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface LlmChatResult {
  content: string | null;
  toolCalls: LlmToolCall[];
  finishReason: string;
  model?: string;
}

export interface LlmConfig {
  enabled: boolean;
  apiKey: string | null;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  maxIterations: number;
  /** Local HTTP URL of this backend's own API (tools resolve entities against it). */
  apiUrl: string;
}
