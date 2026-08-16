import { IAIProvider, AIGenerateOptions } from '../interfaces/IAIProvider.js';
import { logger } from '../../utils/logger.js';

export class GrokAIProvider implements IAIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model = 'grok-beta') {
    this.apiKey = apiKey || process.env['GROK_API_KEY'] || '';
    this.model = model;
    if (!this.apiKey) {
      logger.warn('GrokAIProvider initialized without GROK_API_KEY.');
    }
  }

  async generateText(prompt: string, options?: AIGenerateOptions): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GROK_API_KEY is missing.');
    }

    logger.info({ provider: 'GrokAIProvider', model: this.model }, 'Generating text from Grok API');

    const url = 'https://api.x.ai/v1/chat/completions';

    const messages: any[] = [];

    if (options?.systemInstruction) {
      messages.push({
        role: 'system',
        content: options.systemInstruction,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const body: any = {
      model: this.model,
      messages,
      temperature: options?.temperature !== undefined ? options.temperature : 0.7,
    };

    if (options?.responseJson) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const status = response.status;
      logger.error({ status, errorText }, 'Grok API call failed');
      throw new Error(`Grok API Error (${status}): ${errorText}`);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Grok API returned an empty completion.');
    }

    return content;
  }

  async generateEmbeddings(_text: string): Promise<number[]> {
    // Return standard mock vector if Grok embedding is not enabled
    return new Array(1536).fill(0).map(() => Math.random());
  }

  getProviderName(): string {
    return 'GrokAIProvider';
  }
}

export default GrokAIProvider;
