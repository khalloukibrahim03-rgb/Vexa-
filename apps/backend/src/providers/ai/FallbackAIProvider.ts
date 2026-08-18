import { IAIProvider, AIGenerateOptions } from '../interfaces/IAIProvider.js';
import { logger } from '../../utils/logger.js';

export class FallbackAIProvider implements IAIProvider {
  constructor(
    private primaryProvider: IAIProvider,
    private secondaryProvider?: IAIProvider
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
        if (!this.secondaryProvider) {
          logger.warn(
            { primary: this.primaryProvider.getProviderName(), errorMsg },
            'Primary AI provider hit 429/quota limit. Secondary provider not configured; skipping fallback.'
          );
          throw error;
        }

        logger.warn(
          { primary: this.primaryProvider.getProviderName(), secondary: this.secondaryProvider.getProviderName(), errorMsg },
          'Primary AI provider hit 429/quota limit. Automatically executing logged fallback to secondary provider.'
        );
        try {
          return await this.secondaryProvider.generateText(prompt, options);
        } catch (secondaryError) {
          logger.warn(
            { secondary: this.secondaryProvider.getProviderName(), error: secondaryError instanceof Error ? secondaryError.message : String(secondaryError) },
            'Secondary AI provider fallback failed gracefully.'
          );
          throw error;
        }
      }

      // Re-throw if it is an unrecoverable non-quota error
      throw error;
    }
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      return await this.primaryProvider.generateEmbeddings(text);
    } catch (error) {
      if (!this.secondaryProvider) {
        logger.warn(
          { primary: this.primaryProvider.getProviderName() },
          'Primary AI provider embeddings failed. Secondary provider not configured; skipping fallback.'
        );
        throw error;
      }

      logger.warn(
        { primary: this.primaryProvider.getProviderName(), secondary: this.secondaryProvider.getProviderName() },
        'Primary AI provider embeddings failed. Falling back to secondary provider.'
      );
      try {
        return await this.secondaryProvider.generateEmbeddings(text);
      } catch (secondaryError) {
        logger.warn(
          { secondary: this.secondaryProvider.getProviderName() },
          'Secondary AI provider embeddings fallback failed gracefully.'
        );
        throw error;
      }
    }
  }

  getProviderName(): string {
    const secondaryName = this.secondaryProvider ? this.secondaryProvider.getProviderName() : 'None';
    return `FallbackAIProvider(${this.primaryProvider.getProviderName()} -> ${secondaryName})`;
  }
}

export default FallbackAIProvider;
