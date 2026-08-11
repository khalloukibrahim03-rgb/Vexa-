import { IAIProvider } from '../providers/interfaces/IAIProvider.js';
import { logger } from '../utils/logger.js';

export interface SectionOutline {
  heading: string;
  talkingPoints: string[];
}

export interface ContentOutline {
  title: string;
  hook: string;
  sections: SectionOutline[];
  callToAction: string;
}

export class ContentStrategyPlanner {
  constructor(private aiProvider: IAIProvider) {}

  /**
   * Plans a structured content outline for a validated high-momentum topic.
   */
  async planOutline(topic: string): Promise<ContentOutline> {
    logger.info({ topic, provider: this.aiProvider.getProviderName() }, 'Content Strategy Planner initiated outline drafting');

    const prompt = `
      You are an elite, highly performant content strategist. Draft a structured, high-retention video outline for the following topic:
      Topic: "${topic}"

      Your output must be a valid, parsed JSON object containing:
      - title: string (the video title)
      - hook: string (the opening 5-second hook dialogue)
      - sections: array of objects containing (heading: string, talkingPoints: string[])
      - callToAction: string (the closing statement)

      Strict Constraint: Output ONLY valid, parsed JSON. No markdown backticks, no wrap tags.
    `;

    try {
      const responseText = await this.aiProvider.generateText(prompt, {
        systemInstruction: 'You output only strict raw JSON. No wrappers.',
        responseJson: true,
        temperature: 0.7,
      });

      const parsed: ContentOutline = JSON.parse(responseText);
      logger.info({ title: parsed.title }, 'Successfully drafted structured content outline');
      return parsed;
    } catch (error) {
      logger.error({ err: error }, 'Failed to draft content outline. Returning fallback deterministic outline.');
      // Return highly structured fallback outline on JSON or AI failure
      return {
        title: `Mastering ${topic}`,
        hook: `Everyone talks about ${topic}. But today we show you how to do it in 5 minutes.`,
        sections: [
          { heading: 'The Big Mistake', talkingPoints: ['Common errors in this niche', 'Why traditional approaches fail'] },
          { heading: 'Step by Step Solution', talkingPoints: ['Implementation strategy', 'Real-world benchmarks'] }
        ],
        callToAction: 'Watch more of our agent production cycles to master this topic!'
      };
    }
  }
}
export default ContentStrategyPlanner;
