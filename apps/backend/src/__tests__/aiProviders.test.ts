import { describe, it, expect, vi } from 'vitest';
import { FallbackAIProvider } from '../providers/ai/FallbackAIProvider.js';
import { IAIProvider } from '../providers/interfaces/IAIProvider.js';

describe('VEXA Fallback AI Provider Unit Tests', () => {
  const mockPrimarySuccess: IAIProvider = {
    generateText: vi.fn().mockResolvedValue('Primary Provider Script Output'),
    generateEmbeddings: vi.fn().mockResolvedValue([0.1, 0.2]),
    getProviderName: () => 'MockPrimarySuccess',
  };

  const mockPrimaryQuotaError: IAIProvider = {
    generateText: vi.fn().mockRejectedValue(new Error('Gemini API Error (429): Quota Exceeded')),
    generateEmbeddings: vi.fn().mockRejectedValue(new Error('429 Rate limit')),
    getProviderName: () => 'MockPrimaryQuotaError',
  };

  const mockSecondary: IAIProvider = {
    generateText: vi.fn().mockResolvedValue('Grok Secondary Provider Script Output'),
    generateEmbeddings: vi.fn().mockResolvedValue([0.3, 0.4]),
    getProviderName: () => 'MockSecondary',
  };

  it('should use primary provider output when primary provider succeeds', async () => {
    const fallbackProvider = new FallbackAIProvider(mockPrimarySuccess, mockSecondary);
    const result = await fallbackProvider.generateText('Write script');

    expect(result).toBe('Primary Provider Script Output');
    expect(mockPrimarySuccess.generateText).toHaveBeenCalled();
    expect(mockSecondary.generateText).not.toHaveBeenCalled();
  });

  it('should automatically fall back to secondary provider on primary 429/quota error without crashing', async () => {
    const fallbackProvider = new FallbackAIProvider(mockPrimaryQuotaError, mockSecondary);
    const result = await fallbackProvider.generateText('Write script');

    expect(result).toBe('Grok Secondary Provider Script Output');
    expect(mockPrimaryQuotaError.generateText).toHaveBeenCalled();
    expect(mockSecondary.generateText).toHaveBeenCalled();
  });
});
