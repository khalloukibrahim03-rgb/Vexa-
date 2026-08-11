import { describe, it, expect } from 'vitest';
import { MockAIProvider } from '../providers/ai/MockAIProvider.js';
import { ContentStrategyPlanner } from '../pipeline/ContentStrategyPlanner.js';
import { ScriptGenerator, VideoScript } from '../pipeline/ScriptGenerator.js';
import { QCEngine } from '../pipeline/QCEngine.js';
import { ScenePlanner } from '../pipeline/ScenePlanner.js';

describe('VEXA Content Strategy & Scripting Unit Tests', () => {
  const aiProvider = new MockAIProvider();
  const strategyPlanner = new ContentStrategyPlanner(aiProvider);
  const scriptGenerator = new ScriptGenerator(aiProvider);

  it('should successfully plan structured content outline', async () => {
    const outline = await strategyPlanner.planOutline('Autonomous Agent Workflows in Node.js');
    expect(outline).toBeDefined();
    expect(outline.title).toBeDefined();
    expect(outline.hook).toBeDefined();
    expect(outline.sections.length).toBeGreaterThan(0);
  });

  it('should successfully generate scene-by-scene script', async () => {
    const outline = await strategyPlanner.planOutline('Autonomous Agent Workflows');
    const script = await scriptGenerator.generateScript(outline);

    expect(script).toBeDefined();
    expect(script.scenes.length).toBeGreaterThan(0);
    expect(script.scenes[0]!.narrationDialogue).toBeDefined();
    expect(script.scenes[0]!.visualGuideline).toBeDefined();
    expect(script.scenes[0]!.durationSeconds).toBeGreaterThan(0);
  });

  describe('Modular QC Gate Engine Checks', () => {
    it('should PASS correct, safe scripts across all gates', () => {
      const validScript: VideoScript = {
        scenes: [
          { sceneNumber: 1, visualGuideline: 'Nice workflow', narrationDialogue: 'This is great.', durationSeconds: 5 }
        ]
      };

      const result = QCEngine.runScriptQC(validScript);
      expect(result.overallPassed).toBe(true);
      expect(result.gateResults.every(g => g.passed)).toBe(true);
    });

    it('should FAIL Factual QC gate if scene dialogue is empty', () => {
      const invalidFactualScript: VideoScript = {
        scenes: [
          { sceneNumber: 1, visualGuideline: 'Nice background', narrationDialogue: '', durationSeconds: 5 }
        ]
      };

      const result = QCEngine.runScriptQC(invalidFactualScript);
      expect(result.overallPassed).toBe(false);
      const factualGate = result.gateResults.find(g => g.gateName === 'FACTUAL_QC');
      expect(factualGate?.passed).toBe(false);
    });

    it('should FAIL Safety QC gate if bad themes are matched', () => {
      const unsafeScript: VideoScript = {
        scenes: [
          { sceneNumber: 1, visualGuideline: 'Tech view', narrationDialogue: 'This contains violence and harassment.', durationSeconds: 5 }
        ]
      };

      const result = QCEngine.runScriptQC(unsafeScript);
      expect(result.overallPassed).toBe(false);
      const safetyGate = result.gateResults.find(g => g.gateName === 'SAFETY_QC');
      expect(safetyGate?.passed).toBe(false);
    });

    it('should FAIL Channel Rule QC gate if prohibited keyword is encountered', () => {
      const scriptWithProhibitedWord: VideoScript = {
        scenes: [
          { sceneNumber: 1, visualGuideline: 'Zoom in code', narrationDialogue: 'Let us build a keyboard dependency.', durationSeconds: 5 }
        ]
      };

      const result = QCEngine.runScriptQC(scriptWithProhibitedWord, ['keyboard', 'android']);
      expect(result.overallPassed).toBe(false);
      const channelGate = result.gateResults.find(g => g.gateName === 'CHANNEL_RULE_QC');
      expect(channelGate?.passed).toBe(false);
    });
  });

  describe('Scene Planner Timeline Layouts', () => {
    it('should compile master Composition Timeline with background and caption tracks', () => {
      const validScript: VideoScript = {
        scenes: [
          { sceneNumber: 1, visualGuideline: 'Tech animation loop', narrationDialogue: 'Let us begin.', durationSeconds: 8 },
          { sceneNumber: 2, visualGuideline: 'Simple layout', narrationDialogue: 'Step two.', durationSeconds: 7 }
        ]
      };

      const timeline = ScenePlanner.planTimeline(validScript);
      expect(timeline).toBeDefined();
      expect(timeline.durationSeconds).toBe(15);
      expect(timeline.layers.length).toBe(4); // 2 background layers + 2 caption layers
      expect(timeline.layers[0]!.type).toBe('video'); // 'animation' matches background video
      expect(timeline.layers[2]!.type).toBe('image'); // matches background image
    });
  });
});
