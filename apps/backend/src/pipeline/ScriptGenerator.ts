import { IAIProvider } from '../providers/interfaces/IAIProvider.js';
import { ContentOutline } from './ContentStrategyPlanner.js';
import { logger } from '../utils/logger.js';

export interface ScriptScene {
  sceneNumber: number;
  visualGuideline: string;
  narrationDialogue: string;
  durationSeconds: number;
}

export interface VideoScript {
  scenes: ScriptScene[];
}

export class ScriptGenerator {
  constructor(private aiProvider: IAIProvider) {}

  /**
   * Generates a fully fleshed, scene-by-scene video script from a content outline.
   */
  async generateScript(outline: ContentOutline): Promise<VideoScript> {
    logger.info({ title: outline.title }, 'Script Generator initiated script compilation');

    const prompt = `
      You are an award-winning video scriptwriter. Compile a highly engaging, high-retention video script based on this content outline:
      Outline: ${JSON.stringify(outline)}

      Your output must be a valid, parsed JSON object containing:
      - scenes: array of objects containing (sceneNumber: number, visualGuideline: string, narrationDialogue: string, durationSeconds: number)

      Strict constraints:
      - Keep each scene duration between 5 and 12 seconds.
      - Ensure visual guidelines are detailed and describe motion/visual transitions for video rendering engines.
      - Output ONLY valid, parsed JSON. No wrappers or markdown formatting tags.
    `;

    try {
      const responseText = await this.aiProvider.generateText(prompt, {
        systemInstruction: 'You output only strict raw JSON. No wrappers.',
        responseJson: true,
        temperature: 0.7,
      });

      const parsed: VideoScript = JSON.parse(responseText);
      logger.info({ sceneCount: parsed.scenes.length }, 'Successfully compiled video script');
      return parsed;
    } catch (error) {
      logger.error({ err: error }, 'Failed to compile script. Returning fallback deterministic script.');
      // Return high quality fallback script on failures
      return {
        scenes: [
          {
            sceneNumber: 1,
            visualGuideline: 'A dark tech layout displaying the video title: Mastering ' + outline.title,
            narrationDialogue: outline.hook,
            durationSeconds: 8
          },
          {
            sceneNumber: 2,
            visualGuideline: 'A flowchart showing continuous optimization loops and state transitions.',
            narrationDialogue: 'To win, you must implement continuous validation, measuring predicted outcomes versus actual engagement scores.',
            durationSeconds: 10
          },
          {
            sceneNumber: 3,
            visualGuideline: 'A dark, modern call to action screen showing subscription metrics.',
            narrationDialogue: outline.callToAction,
            durationSeconds: 7
          }
        ]
      };
    }
  }
}
export default ScriptGenerator;
