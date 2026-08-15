import { Injectable, Logger } from '@nestjs/common';
import { LlmProvider } from './llm-provider.interface';
import { LlmConfig, LlmChatOptions, LlmChatResult, LlmMessage, LlmToolDefinition, LlmToolCall } from './llm.types';

/**
 * OpenAI-compatible chat completions provider (no external dependencies).
 * Works with OpenAI and any compatible endpoint via OPENAI_BASE_URL.
 */
@Injectable()
export class OpenAiCompatibleProvider implements LlmProvider {
  readonly name = 'openai-compatible';

  private readonly logger = new Logger(OpenAiCompatibleProvider.name);

  constructor(private readonly config: LlmConfig) {}

  isAvailable(): boolean {
    return this.config.enabled;
  }

  async chatCompletion(
    messages: LlmMessage[],
    tools: LlmToolDefinition[],
    options?: LlmChatOptions,
  ): Promise<LlmChatResult> {
    const body: Record<string, any> = {
      model: this.config.model,
      messages: messages.map((m) => this.toOpenAiMessage(m)),
      temperature: options?.temperature ?? this.config.temperature,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      stream: false,
    };

    if (tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters ?? { type: 'object', properties: {} },
        },
      }));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`LLM request failed (${res.status}): ${detail.slice(0, 400)}`);
      }

      const json = await res.json();
      return this.fromOpenAiResponse(json);
    } finally {
      clearTimeout(timeout);
    }
  }

  private toOpenAiMessage(message: LlmMessage): Record<string, any> {
    switch (message.role) {
      case 'tool':
        return {
          role: 'tool',
          content: message.content,
          tool_call_id: message.toolCallId,
        };
      case 'assistant': {
        const msg: Record<string, any> = { role: 'assistant', content: message.content || null };
        if (message.toolCalls?.length) {
          msg.tool_calls = message.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments ?? {}) },
          }));
        }
        return msg;
      }
      default:
        return { role: message.role, content: message.content };
    }
  }

  private fromOpenAiResponse(json: any): LlmChatResult {
    const choice = json?.choices?.[0];
    const finishReason: string = choice?.finish_reason ?? 'stop';
    const message = choice?.message ?? {};
    const toolCalls: LlmToolCall[] = (message.tool_calls ?? []).map((tc: any) => {
      let args: Record<string, any> = {};
      try {
        args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
      } catch {
        args = { _raw: tc.function.arguments };
      }
      return { id: tc.id, name: tc.function.name, arguments: args };
    });
    return {
      content: message.content ?? null,
      toolCalls,
      finishReason,
      model: json?.model,
    };
  }
}
