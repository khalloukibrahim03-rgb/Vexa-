import { IAIProvider, AIGenerateOptions } from '../interfaces/IAIProvider.js';
import { logger } from '../../utils/logger.js';

export class FallbackAIProvider implements IAIProvider {
  constructor(
    private primaryProvider: IAIProvider,
    private secondaryProvider: IAIProvider
  ) {}

  async generateText(prompt: string, options?: AIGenerateOptions): Promise<string> {
    try {
      return await this.primaryProvider.generateText(prompt, options);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isQuotaOrRateLimit =
        errorMsg.includes('429') ||
        errorMsg.toLowerCase().includes('quota') ||
        errorMsg.toLowerCase().includes('rate limit') ||
        errorMsg.toLowerCase().includes('resource_exhausted');

      if (isQuotaOrRateLimit) {
        logger.warn(
          { primary: this.primaryProvider.getProviderName(), secondary: this.secondaryProvider.getProviderName(), errorMsg },
          'Primary AI provider hit 429/quota limit. Automatically executing logged fallback to secondary provider.'
        );
        return await this.secondaryProvider.generateText(prompt, options);
      }

      // Re-throw if it is an unrecoverable non-quota error
      throw error;
    }
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      return await this.primaryProvider.generateEmbeddings(text);
    } catch (error) {
      logger.warn(
        { primary: this.primaryProvider.getProviderName(), secondary: this.secondaryProvider.getProviderName() },
        'Primary AI provider embeddings failed. Falling back to secondary provider.'
      );
      return await this.secondaryProvider.generateEmbeddings(text);
    }
  }

  getProviderName(): string {
    return `FallbackAIProvider(${this.primaryProvider.getProviderName()} -> ${this.secondaryProvider.getProviderName()})`;
  }
}

export default FallbackAIProvider;
