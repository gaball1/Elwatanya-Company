import { LlmChatOptions, LlmChatResult, LlmMessage, LlmToolDefinition } from './llm.types';

export interface LlmProvider {
  readonly name: string;
  isAvailable(): boolean;
  chatCompletion(
    messages: LlmMessage[],
    tools: LlmToolDefinition[],
    options?: LlmChatOptions,
  ): Promise<LlmChatResult>;
}
