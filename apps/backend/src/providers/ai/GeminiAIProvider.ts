import { IAIProvider, AIGenerateOptions } from '../interfaces/IAIProvider.js';
import { logger } from '../../utils/logger.js';

export class GeminiAIProvider implements IAIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model = 'gemini-1.5-flash') {
    this.apiKey = apiKey || process.env['GEMINI_API_KEY'] || '';
    this.model = model;
    if (!this.apiKey) {
      logger.warn('GeminiAIProvider initialized without GEMINI_API_KEY.');
    }
  }

  async generateText(prompt: string, options?: AIGenerateOptions): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is missing.');
    }

    logger.info({ provider: 'GeminiAIProvider', model: this.model }, 'Generating text from Gemini API');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const contents: any[] = [
      {
        parts: [{ text: prompt }],
      },
    ];

    const body: any = { contents };

    if (options?.systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: options.systemInstruction }],
      };
    }

    if (options?.responseJson) {
      body.generationConfig = {
        responseMimeType: 'application/json',
      };
    }

    if (options?.temperature !== undefined) {
      body.generationConfig = {
        ...(body.generationConfig || {}),
        temperature: options.temperature,
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const status = response.status;
      logger.error({ status, errorText }, 'Gemini API call failed');
      throw new Error(`Gemini API Error (${status}): ${errorText}`);
    }

    const json = await response.json();
    const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('Gemini API returned an empty text candidate.');
    }

    return candidateText;
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is missing.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini Embeddings API Error (${response.status}): ${errorText}`);
    }

    const json = await response.json();
    return json.embedding?.values || new Array(768).fill(0);
  }

  getProviderName(): string {
    return 'GeminiAIProvider';
  }
}

export default GeminiAIProvider;
