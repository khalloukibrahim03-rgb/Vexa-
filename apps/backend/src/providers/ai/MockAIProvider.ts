import { IAIProvider, AIGenerateOptions } from '../interfaces/IAIProvider.js';

/**
 * MockAIProvider — [MOCKED / SIMULATED]
 * Provides deterministic simulation outputs for text generation, embeddings, and structured metadata.
 */
export class MockAIProvider implements IAIProvider {
  async generateText(prompt: string, options?: AIGenerateOptions): Promise<string> {
    // console.log(`[MOCKED / SIMULATED] generateText invoked with prompt length: ${prompt.length}`);

    // If options specify JSON formatting, output mock structured outlines or scripts
    if (options?.responseJson) {
      if (prompt.toLowerCase().includes('outline')) {
        return JSON.stringify({
          title: 'Advanced Agent Workflows in Node.js',
          hook: 'Most developers build chatbots. But the future belongs to autonomous agents that act on their own.',
          sections: [
            { heading: 'Introduction to Autonomous Loop', talkingPoints: ['Chatbot vs Agent loop', 'State tracking', 'Decision record persistence'] },
            { heading: 'PostgreSQL transactional job queues', talkingPoints: ['SKIP LOCKED performance benefits', 'Lease expiry heartbeats'] },
            { heading: 'Multi-category persistent memories', talkingPoints: ['Versioning rules', 'Lessons rollback capabilities'] }
          ],
          callToAction: 'Approve this phase to watch the agent produce the complete video!'
        });
      }

      if (prompt.toLowerCase().includes('script')) {
        return JSON.stringify({
          scenes: [
            {
              sceneNumber: 1,
              visualGuideline: 'A dark tech-themed animation showing a state-based loop switching between Research and Decide.',
              narrationDialogue: 'Most developers build chatbots. But the future belongs to autonomous agents that act on their own.',
              durationSeconds: 8
            },
            {
              sceneNumber: 2,
              visualGuideline: 'Code block zoom in showing SELECT FOR UPDATE SKIP LOCKED query executing.',
              narrationDialogue: 'Using simple database transactional queries, we can build robust, parent-child queues that operate at zero cost.',
              durationSeconds: 10
            },
            {
              sceneNumber: 3,
              visualGuideline: 'A professional dark layout dashboard showcasing real-time completed jobs tickers.',
              narrationDialogue: 'This is VEXA. Your autonomous, self-learning AI production studio. Approve this phase to proceed.',
              durationSeconds: 7
            }
          ]
        });
      }
    }

    return 'This is a deterministic, secure simulation output representing standard LLM completions.';
  }

  async generateEmbeddings(_text: string): Promise<number[]> {
    // Return a standard mock 1536-dimensional mock vector
    return new Array(1536).fill(0).map(() => Math.random());
  }

  getProviderName(): string {
    return 'MockAIProvider';
  }
}
export default MockAIProvider;
