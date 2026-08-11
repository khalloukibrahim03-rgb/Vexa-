export interface VoiceSynthesizeOptions {
  voiceId?: string;          // e.g., 'en-US-Neural-A'
  speakingRate?: number;     // e.g., 1.0 (normal) to 1.25 (fast)
  pitch?: number;            // e.g., 0.0 (normal)
  style?: 'narrative' | 'excited' | 'educational' | 'dramatic';
}

export interface IVoiceProvider {
  /**
   * Synthesizes text dialogue into a speech file (returns local temp file path or buffer).
   */
  synthesizeSpeech(text: string, options?: VoiceSynthesizeOptions): Promise<string>;

  /**
   * Returns the provider name.
   */
  getProviderName(): string;
}
