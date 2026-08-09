import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiAgentService } from './ai-agent.service';
import { ChatMessageDto } from './dto/chat.dto';
import {
  ConversationQueryDto,
  UpdateConversationDto,
} from './dto/conversation.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { ErpKnowledgeService } from './knowledge/erp-knowledge.service';
import { AgentAnalyticsService } from './analytics/agent-analytics.service';
import { ConversationMemoryService } from './memory/conversation-memory.service';

@ApiTags('AI Agent')
@ApiBearerAuth()
@Controller('ai-agent')
export class AiAgentController {
  constructor(
    private readonly agent: AiAgentService,
    private readonly knowledge: ErpKnowledgeService,
    private readonly analytics: AgentAnalyticsService,
    private readonly conversations: ConversationMemoryService,
  ) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: 'Send a message to the AI ERP Agent' })
  async chat(
    @Body() dto: ChatMessageDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    const enrichedUser = {
      sub: user.sub,
      email: user.email,
      permissions: user.permissions || [],
      role: user.role,
      token,
    };

    return this.agent.processMessage(dto, enrichedUser);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List AI conversations for the current user' })
  async listConversations(
    @Query() query: ConversationQueryDto,
    @CurrentUser() user: any,
  ) {
    const items = await this.conversations.listConversations(user.sub, query.search);
    return { success: true, data: { items }, timestamp: new Date().toISOString() };
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a single AI conversation with its messages' })
  async getConversation(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const conversation = await this.conversations.getConversation(id, user.sub);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return { success: true, data: { conversation }, timestamp: new Date().toISOString() };
  }

  @Patch('conversations/:id')
  @ApiOperation({ summary: 'Rename or pin/unpin an AI conversation' })
  async updateConversation(
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
    @CurrentUser() user: any,
  ) {
    if (dto.title !== undefined) {
      await this.conversations.renameConversation(id, user.sub, dto.title);
    }
    if (dto.isPinned !== undefined) {
      await this.conversations.togglePin(id, user.sub, dto.isPinned);
    }
    const conversation = await this.conversations.getConversation(id, user.sub);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return { success: true, data: { conversation }, timestamp: new Date().toISOString() };
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an AI conversation' })
  async deleteConversation(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.conversations.deleteConversation(id, user.sub);
  }

  @Get('topics')
  @ApiOperation({ summary: 'List available ERP knowledge topics' })
  getTopics() {
    return { topics: this.knowledge.getAllTopics() };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get AI Agent usage analytics' })
  getAnalytics() {
    return { success: true, data: this.analytics.getStats() };
  }
}
