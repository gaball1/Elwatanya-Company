import { apiClient } from '@/lib/api/apiClient';

export interface AgentResponse {
  success: boolean;
  message: string;
  data?: any;
  intent?: string;
  requiresFollowUp?: boolean;
  followUpQuestion?: string;
  conversationId?: string;
}

export interface ChatMessage {
  message: string;
  conversationId?: string;
  context?: Record<string, any>;
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
  async getAnalytics(): Promise<any> {
    const data = await apiClient<{ success: boolean; data: any }>('/ai-agent/analytics', { method: 'GET' });
    return data.data;
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
