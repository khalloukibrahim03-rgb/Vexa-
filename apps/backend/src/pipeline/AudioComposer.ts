import { logger } from '../utils/logger.js';

export interface DuckingEvent {
  start: number;   // seconds
  end: number;     // seconds
}

export class AudioComposer {
  /**
   * Generates a precise FFmpeg audio filter command to duck background natural ambient sound during active narration dialogue.
   * NO MUSIC TRACK IS USED anywhere in the pipeline.
   * Amplitudes:
   * - standardAmbientVolume: 0.15 (when narration is silent)
   * - duckedAmbientVolume: 0.03 (when narration is speaking, dialogue remains crisp)
   */
  static generateDuckingFilter(
    events: DuckingEvent[],
    standardAmbientVolume = 0.15,
    duckedAmbientVolume = 0.03
  ): string {
    logger.info({ eventsCount: events.length }, 'Audio Composer computing precise ambient sound ducking filter');

    if (events.length === 0) {
      return `volume=${standardAmbientVolume}`;
    }

    let expression = `${standardAmbientVolume}`;

    for (const event of events) {
      const { start, end } = event;
      expression = `if(between(t,${start},${end}),${duckedAmbientVolume},${expression})`;
    }

    const filterString = `[1:a]volume='${expression}'[ambient_ducked];[0:a][ambient_ducked]amix=inputs=2:duration=first[a_mixed]`;
    logger.info({ filterString }, 'Computed professional ambient sound audio ducking envelope');

    return filterString;
  }
}
export default AudioComposer;
