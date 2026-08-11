import { logger } from '../utils/logger.js';

export interface DuckingEvent {
  start: number;   // seconds
  end: number;     // seconds
}

export class AudioComposer {
  /**
   * Generates a precise FFmpeg audio filter command to duck background music during active narration clips.
   * Amplitudes:
   * - standardMusicVolume: 0.25 (when narration is silent)
   * - duckedMusicVolume: 0.05 (when narration is active, to keep dialogue crisp)
   */
  static generateDuckingFilter(
    events: DuckingEvent[],
    standardMusicVolume = 0.25,
    duckedMusicVolume = 0.05
  ): string {
    logger.info({ eventsCount: events.length }, 'Audio Composer computing precise ducking filters');

    if (events.length === 0) {
      return `volume=${standardMusicVolume}`;
    }

    // We build an volume envelope using the volume filter's expression syntax:
    // volume='if(between(t,start1,end1),ducked_vol,if(between(t,start2,end2),ducked_vol,standard_vol))'
    let expression = `${standardMusicVolume}`;

    for (const event of events) {
      const { start, end } = event;
      expression = `if(between(t,${start},${end}),${duckedMusicVolume},${expression})`;
    }

    const filterString = `[1:a]volume='${expression}'[music_ducked];[0:a][music_ducked]amix=inputs=2:duration=first[a_mixed]`;
    logger.info({ filterString }, 'Computed professional timing-based audio ducking envelope');

    return filterString;
  }
}
export default AudioComposer;
