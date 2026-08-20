import { apiClient } from '@/lib/api/apiClient';

export interface AgentResponse {
  success: boolean;
  message: string;
  data?: unknown;
  intent?: string;
  requiresFollowUp?: boolean;
  followUpQuestion?: string;
  conversationId?: string;
}

export interface ChatMessage {
  message: string;
  conversationId?: string;
  context?: Record<string, unknown>;
}

export interface ConversationSummary {
  id: string;
  title: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  intent?: string;
  timestamp: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ConversationMessage[];
}

export interface IntentStat {
  intent: string;
  count: number;
}

export interface ToolStat {
  tool: string;
  count: number;
  success: number;
  failed: number;
}

export interface WorkflowStat {
  workflow: string;
  started: number;
  completed: number;
  failed: number;
}

export interface HourlyTraffic {
  hour: string;
  count: number;
}

export interface AgentAnalytics {
  summary: {
    totalRequests: number;
    totalErrors: number;
    uniqueIntents: number;
    uniqueTools: number;
    uptimeSeconds: number;
    errorRate: number;
  };
  topIntents: IntentStat[];
  toolStats: ToolStat[];
  workflowStats: WorkflowStat[];
  hourly: HourlyTraffic[];
}

export const aiAgentService = {
  async chat(body: ChatMessage): Promise<AgentResponse> {
    const data = await apiClient<AgentResponse>('/ai-agent/chat', {
      method: 'POST',
      body,
      skipUnwrap: true,
      timeout: 60000,
    });
    return data;
  },
  async getTopics(): Promise<string[]> {
    const data = await apiClient<{ topics: string[] }>('/ai-agent/topics', { method: 'GET' });
    return data.topics;
  },
  async getAnalytics(): Promise<AgentAnalytics> {
    const data = await apiClient<AgentAnalytics>('/ai-agent/analytics', { method: 'GET' });
    return data;
  },
  async listConversations(search?: string): Promise<ConversationSummary[]> {
    const data = await apiClient<{ items: ConversationSummary[] }>(
      `/ai-agent/conversations${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      { method: 'GET' }
    );
    return data.items;
  },
  async getConversation(id: string): Promise<ConversationDetail> {
    const data = await apiClient<{ conversation: ConversationDetail }>(
      `/ai-agent/conversations/${id}`,
      { method: 'GET' }
    );
    return data.conversation;
  },
  async renameConversation(id: string, title: string): Promise<ConversationDetail> {
    const data = await apiClient<{ conversation: ConversationDetail }>(
      `/ai-agent/conversations/${id}`,
      { method: 'PATCH', body: { title } }
    );
    return data.conversation;
  },
  async togglePin(id: string, isPinned: boolean): Promise<ConversationDetail> {
    const data = await apiClient<{ conversation: ConversationDetail }>(
      `/ai-agent/conversations/${id}`,
      { method: 'PATCH', body: { isPinned } }
    );
    return data.conversation;
  },
  async deleteConversation(id: string): Promise<void> {
    await apiClient(`/ai-agent/conversations/${id}`, { method: 'DELETE' });
  },
};
