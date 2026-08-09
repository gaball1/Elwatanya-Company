import { Injectable, Inject } from '@nestjs/common';
import { SettingsService } from '../settings.service';

@Injectable()
export class AISettings {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  get embeddingProvider(): Promise<string> { return this.settings.getOrThrow('ai', 'embeddingProvider'); }
  get vectorStore(): Promise<string> { return this.settings.getOrThrow('ai', 'vectorStore'); }
  get llmModel(): Promise<string> { return this.settings.getOrThrow('ai', 'llmModel'); }
  get maxTokens(): Promise<number> { return this.settings.getOrThrow('ai', 'maxTokens'); }
  get temperature(): Promise<number> { return this.settings.getOrThrow('ai', 'temperature'); }
}
