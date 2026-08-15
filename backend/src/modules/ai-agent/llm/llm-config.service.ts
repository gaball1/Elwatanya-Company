import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmConfig } from './llm.types';

/**
 * Reads the LLM configuration from the environment.
 *
 * - OPENAI_API_KEY        — required for the LLM path. When absent, the agent
 *                           falls back to the deterministic planner.
 * - OPENAI_BASE_URL       — optional, defaults to https://api.openai.com/v1.
 *                           Any OpenAI-compatible endpoint works (Azure, Groq,
 *                           OpenRouter, local Ollama/LM Studio, ...).
 * - OPENAI_MODEL          — optional, defaults to gpt-4o-mini.
 * - AI_AGENT_API_URL      — optional, local API base of this backend. Defaults
 *                           to API_URL or http://localhost:3001.
 */
@Injectable()
export class LlmConfigService {
  constructor(private readonly config: ConfigService) {}

  getConfig(): LlmConfig {
    const apiKey = this.config.get<string>('OPENAI_API_KEY') || null;
    const baseUrl = (this.config.get<string>('OPENAI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const model = this.config.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';
    const apiUrl = (
      this.config.get<string>('AI_AGENT_API_URL') ||
      this.config.get<string>('API_URL') ||
      'http://localhost:3001'
    ).replace(/\/+$/, '');

    return {
      enabled: !!apiKey,
      apiKey,
      baseUrl,
      model,
      temperature: Number(this.config.get<string>('OPENAI_TEMPERATURE') || '0.2'),
      maxTokens: Number(this.config.get<string>('OPENAI_MAX_TOKENS') || '1500'),
      maxIterations: Number(this.config.get<string>('OPENAI_MAX_ITERATIONS') || '6'),
      apiUrl,
    };
  }
}
