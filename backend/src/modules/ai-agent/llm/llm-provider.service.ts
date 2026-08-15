import { Injectable, Logger } from '@nestjs/common';
import { LlmConfigService } from './llm-config.service';
import { LlmProvider } from './llm-provider.interface';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';
import { LlmChatOptions, LlmChatResult, LlmConfig, LlmMessage, LlmToolDefinition } from './llm.types';

/**
 * Facade over all registered LLM providers. Returns null results (with a log)
 * when no provider is configured so callers can transparently fall back to the
 * deterministic engine.
 */
@Injectable()
export class LlmProviderService {
  private readonly logger = new Logger(LlmProviderService.name);
  private readonly config: LlmConfig;
  private readonly providers: LlmProvider[] = [];

  constructor(private readonly configService: LlmConfigService) {
    this.config = this.configService.getConfig();
    if (this.config.enabled) {
      this.providers.push(new OpenAiCompatibleProvider(this.config));
    }
  }

  isAvailable(): boolean {
    return this.providers.some((p) => p.isAvailable());
  }

  getConfig(): LlmConfig {
    return this.config;
  }

  async chat(
    messages: LlmMessage[],
    tools: LlmToolDefinition[],
    options?: LlmChatOptions,
  ): Promise<LlmChatResult | null> {
    for (const provider of this.providers) {
      if (!provider.isAvailable()) continue;
      try {
        return await provider.chatCompletion(messages, tools, options);
      } catch (error: any) {
        this.logger.error(`LLM provider "${provider.name}" failed: ${error.message}`);
      }
    }
    return null;
  }
}
