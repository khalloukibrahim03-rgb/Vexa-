import { IVoiceProvider, VoiceSynthesizeOptions } from '../interfaces/IVoiceProvider.js';
import { logger } from '../../utils/logger.js';

/**
 * MockVoiceProvider — [MOCKED / SIMULATED]
 * Simulates speech synthesis output files for our video production timelines.
 */
export class MockVoiceProvider implements IVoiceProvider {
  async synthesizeSpeech(text: string, options?: VoiceSynthesizeOptions): Promise<string> {
    const voiceId = options?.voiceId || 'en-US-Neural-A';
    const style = options?.style || 'narrative';

    // Clearly log the mock operation
    logger.info({ voiceId, style, textLength: text.length }, '[MOCKED / SIMULATED] synthesizeSpeech invoked');

    // Return a simulated absolute path to a generated voice mp3 file
    const hash = Buffer.from(text).slice(0, 8).toString('hex');
    return `/tmp/vexa/voice_${hash}.mp3`;
  }

  getProviderName(): string {
    return 'MockVoiceProvider';
  }
}
export default MockVoiceProvider;
