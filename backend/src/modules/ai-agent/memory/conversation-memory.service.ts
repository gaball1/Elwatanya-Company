import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface MemoryEntry {
  role: 'user' | 'assistant' | 'system';
  message: string;
  timestamp: Date;
  intent?: string;
  toolResults?: any[];
}

export interface ConversationListItem {
  id: string;
  title: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string;
}

@Injectable()
export class ConversationMemoryService {
  private readonly conversations = new Map<string, MemoryEntry[]>();
  private readonly MAX_HISTORY = 50;

  constructor(private readonly prisma: PrismaService) {}

  async ensureConversation(conversationId: string, userId: string, firstMessage?: string): Promise<void> {
    const existing = await this.prisma.aiConversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });
    if (existing) {
      return;
    }
    const title = firstMessage
      ? firstMessage.replace(/\s+/g, ' ').trim().slice(0, 80)
      : 'New conversation';
    await this.prisma.aiConversation.create({
      data: {
        id: conversationId,
        userId,
        title: title || 'New conversation',
      },
    });
  }

  async add(conversationId: string, entry: MemoryEntry, userId?: string): Promise<void> {
    if (userId) {
      await this.ensureConversation(conversationId, userId, entry.role === 'user' ? entry.message : undefined);
    }

    const history = this.conversations.get(conversationId) || [];
    history.push(entry);
    if (history.length > this.MAX_HISTORY) history.shift();
    this.conversations.set(conversationId, history);

    try {
      const conversation = await this.prisma.aiConversation.findUnique({
        where: { id: conversationId },
        select: { id: true, title: true, _count: { select: { messages: true } } },
      });
      if (conversation) {
        await this.prisma.aiConversationMessage.create({
          data: {
            conversationId,
            role: entry.role,
            content: entry.message,
            intent: entry.intent ?? null,
            toolData: entry.toolResults && entry.toolResults.length ? entry.toolResults : undefined,
          },
        });
        const isFirst = (conversation._count.messages ?? 0) === 0;
        if (isFirst && entry.role === 'user') {
          const title = entry.message.replace(/\s+/g, ' ').trim().slice(0, 80);
          await this.prisma.aiConversation.update({
            where: { id: conversationId },
            data: { title: title || 'New conversation', updatedAt: new Date() },
          });
        } else {
          await this.prisma.aiConversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });
        }
      }
    } catch (error: any) {
      // DB persistence failure should not break the chat response
    }
  }

  async getHistory(conversationId: string): Promise<MemoryEntry[]> {
    const cache = this.conversations.get(conversationId);
    if (cache && cache.length > 0) {
      return cache;
    }
    try {
      const rows = await this.prisma.aiConversationMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true, intent: true, toolData: true, createdAt: true },
        take: this.MAX_HISTORY,
      });
      const entries = rows.map((r) => ({
        role: r.role as MemoryEntry['role'],
        message: r.content,
        timestamp: r.createdAt,
        intent: r.intent ?? undefined,
        toolResults: (r.toolData as any[]) ?? undefined,
      }));
      if (entries.length) {
        this.conversations.set(conversationId, entries);
      }
      return entries;
    } catch {
      return cache || [];
    }
  }

  async getRecent(conversationId: string, count: number = 5): Promise<MemoryEntry[]> {
    const history = await this.getHistory(conversationId);
    return history.slice(-count);
  }

  async clear(conversationId: string): Promise<void> {
    this.conversations.delete(conversationId);
    try {
      await this.prisma.aiConversationMessage.deleteMany({ where: { conversationId } });
      await this.prisma.aiConversation.deleteMany({ where: { id: conversationId } });
    } catch {
      // ignore
    }
  }

  async listConversations(userId: string, search?: string): Promise<ConversationListItem[]> {
    const rows = await this.prisma.aiConversation.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
      },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        isPinned: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' as const },
          take: 1,
          select: { content: true },
        },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      isPinned: r.isPinned,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      messageCount: r._count.messages,
      lastMessage: r.messages[0]?.content,
    }));
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id: conversationId, userId, deletedAt: null },
      select: { id: true, title: true, isPinned: true, createdAt: true, updatedAt: true },
    });
    if (!conversation) {
      return null;
    }
    const messages = await this.prisma.aiConversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        intent: true,
        toolData: true,
        createdAt: true,
      },
    });
    return {
      id: conversation.id,
      title: conversation.title,
      isPinned: conversation.isPinned,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        intent: m.intent ?? undefined,
        toolData: m.toolData ?? undefined,
        timestamp: m.createdAt.toISOString(),
      })),
    };
  }

  async renameConversation(conversationId: string, userId: string, title: string): Promise<void> {
    await this.prisma.aiConversation.updateMany({
      where: { id: conversationId, userId, deletedAt: null },
      data: { title, updatedAt: new Date() },
    });
  }

  async togglePin(conversationId: string, userId: string, isPinned: boolean): Promise<void> {
    await this.prisma.aiConversation.updateMany({
      where: { id: conversationId, userId, deletedAt: null },
      data: { isPinned, updatedAt: new Date() },
    });
  }

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    this.conversations.delete(conversationId);
    await this.prisma.aiConversation.updateMany({
      where: { id: conversationId, userId, deletedAt: null },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
  }
}
