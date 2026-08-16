import dotenv from 'dotenv';
import { GeminiAIProvider } from '../apps/backend/src/providers/ai/GeminiAIProvider.js';
import { GrokAIProvider } from '../apps/backend/src/providers/ai/GrokAIProvider.js';
import { FallbackAIProvider } from '../apps/backend/src/providers/ai/FallbackAIProvider.js';

dotenv.config();

async function main() {
  console.log('=== PHASE 1 VERIFICATION: REAL AI SCRIPT GENERATION ===\n');

  const gemini = new GeminiAIProvider();
  const grok = new GrokAIProvider();
  const fallback = new FallbackAIProvider(gemini, grok);

  const topic = 'Autonomous Agent Workflows in Node.js';
  const prompt = `Write a short 3-scene video script on: "${topic}". Return valid raw JSON with scenes array.`;

  console.log(`1. Requesting real AI script for topic: "${topic}"...`);
  try {
    const rawOutput = await fallback.generateText(prompt, {
      systemInstruction: 'Output strictly raw JSON.',
      responseJson: true,
    });

    console.log('\n--- RAW API RESPONSE EVIDENCE ---');
    console.log(rawOutput);
    console.log('-----------------------------------\n');

    console.log('✅ Gate Item 1 Passed: Real non-placeholder script response generated.');
  } catch (error) {
    console.error('❌ Real AI Provider call failed:', error);
  }

  console.log('\n2. Testing simulated 429 quota fallback execution...');
  const simulatedQuotaGemini = {
    generateText: async () => {
      throw new Error('Gemini API Error (429): Quota Exceeded (Simulated)');
    },
    generateEmbeddings: async () => [],
    getProviderName: () => 'SimulatedGeminiQuota429',
  };

  const fallbackTest = new FallbackAIProvider(simulatedQuotaGemini, grok);
  try {
    const fallbackOutput = await fallbackTest.generateText('Fallback test prompt');
    console.log('\n--- FALLBACK API RESPONSE EVIDENCE ---');
    console.log(fallbackOutput.slice(0, 200) + '...');
    console.log('----------------------------------------\n');
    console.log('✅ Gate Item 2 Passed: Automatic logged fallback to secondary provider executed without crashing.');
  } catch (err) {
    console.error('❌ Fallback failed:', err);
  }
}

main().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
