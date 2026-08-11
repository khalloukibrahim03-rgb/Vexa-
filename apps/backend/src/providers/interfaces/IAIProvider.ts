export interface AIGenerateOptions {
  systemInstruction?: string;
  temperature?: number;
  responseJson?: boolean;
}

export interface IAIProvider {
  /**
   * Generates a text response from a prompt.
   */
  generateText(prompt: string, options?: AIGenerateOptions): Promise<string>;

  /**
   * Generates vector embeddings for a given input text.
   */
  generateEmbeddings(text: string): Promise<number[]>;

  /**
   * Returns the configuration provider name.
   */
  getProviderName(): string;
}
