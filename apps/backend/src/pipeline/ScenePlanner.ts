import { VideoScript } from './ScriptGenerator.js';
import { logger } from '../utils/logger.js';

export interface CompositionLayer {
  type: 'video' | 'image' | 'text' | 'audio';
  sourceUrl: string;
  start: number;
  end: number;
  position?: { x: number; y: number; width: number; height: number };
}

export interface CompositionTimeline {
  durationSeconds: number;
  layers: CompositionLayer[];
}

export class ScenePlanner {
  /**
   * Compiles a master scene-by-scene Composition Timeline ready for raw video synthesis.
   */
  static planTimeline(script: VideoScript): CompositionTimeline {
    logger.info({ scenesCount: script.scenes.length }, 'Scene Planner initiated timeline layout computation');
    const layers: CompositionLayer[] = [];
    let currentTimelineSeconds = 0;

    for (const scene of script.scenes) {
      const sceneStart = currentTimelineSeconds;
      const sceneEnd = currentTimelineSeconds + scene.durationSeconds;

      // 1. Background Visual Layer (mock texture placeholder based on guideline keywords)
      const bgType = scene.visualGuideline.toLowerCase().includes('animation') ? 'video' : 'image';
      layers.push({
        type: bgType,
        sourceUrl: `https://assets.vexa.ai/textures/scene_${scene.sceneNumber}.mp4`,
        start: sceneStart,
        end: sceneEnd,
        position: { x: 0, y: 0, width: 1920, height: 1080 },
      });

      // 2. Caption Text Overlay Layer
      layers.push({
        type: 'text',
        sourceUrl: scene.narrationDialogue,
        start: sceneStart,
        end: sceneEnd,
        position: { x: 960, y: 800, width: 1400, height: 200 }, // Centered subtitle region
      });

      // Update timing track
      currentTimelineSeconds = sceneEnd;
    }

    logger.info({ totalDuration: currentTimelineSeconds, totalLayersCount: layers.length }, 'Successfully planned Composition Timeline');

    return {
      durationSeconds: currentTimelineSeconds,
      layers,
    };
  }
}
export default ScenePlanner;
