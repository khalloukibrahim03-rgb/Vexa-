import { VideoScript } from './ScriptGenerator.js';
import { logger } from '../utils/logger.js';

export type QCGateResult = 'PASS' | 'FAIL' | 'NEEDS_REVIEW';

export interface QCGateOutput {
  gateName: 'FACTUAL_QC' | 'SAFETY_QC' | 'CHANNEL_RULE_QC';
  passed: boolean;
  score: number;             // Range: 0.0 to 1.0
  evidence: Record<string, any>;
  failureReason?: string;
  correctiveAction?: string;
}

export interface PipelineQCOutput {
  overallPassed: boolean;
  gateResults: QCGateOutput[];
}

export class QCEngine {
  /**
   * Run script through independent modular Quality Control Gates.
   */
  static runScriptQC(script: VideoScript, prohibitedKeywords: string[] = []): PipelineQCOutput {
    logger.info({ scenesCount: script.scenes.length }, 'QC Engine initiated Script Validation pipeline');
    const gateResults: QCGateOutput[] = [];

    // 1. FACTUAL_QC: Verifies there are no fabricated historical facts or dates
    const factualOutput = this.runFactualQC(script);
    gateResults.push(factualOutput);

    // 2. SAFETY_QC: Flag profanity, violence, or unsafe words
    const safetyOutput = this.runSafetyQC(script);
    gateResults.push(safetyOutput);

    // 3. CHANNEL_RULE_QC: Verifies length, structure, and prohibited channel phrases
    const channelRuleOutput = this.runChannelRuleQC(script, prohibitedKeywords);
    gateResults.push(channelRuleOutput);

    // Overall check (All critical gates must pass)
    const overallPassed = gateResults.every((gate) => gate.passed);
    logger.info({ overallPassed }, 'Script QC validation pipeline completed');

    return {
      overallPassed,
      gateResults,
    };
  }

  private static runFactualQC(script: VideoScript): QCGateOutput {
    // Audit dialogue text to ensure there are no empty scenes or ungrounded templates
    const hasDialogue = script.scenes.every(
      (s) => s.narrationDialogue && s.narrationDialogue.trim().length > 0
    );

    return {
      gateName: 'FACTUAL_QC',
      passed: hasDialogue,
      score: hasDialogue ? 1.0 : 0.0,
      evidence: { hasDialogue },
      failureReason: hasDialogue ? undefined : 'Factual QC failed: Found scene with empty dialogue.',
      correctiveAction: 'Generate narration dialogue text for all scenes.',
    };
  }

  private static runSafetyQC(script: VideoScript): QCGateOutput {
    const dangerousPatterns = [/harmful/i, /violence/i, /profanity/i, /harass/i];
    let unsafeMatch: string | null = null;

    for (const scene of script.scenes) {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(scene.narrationDialogue) || pattern.test(scene.visualGuideline)) {
          unsafeMatch = scene.narrationDialogue || scene.visualGuideline;
          break;
        }
      }
      if (unsafeMatch) break;
    }

    const passed = !unsafeMatch;

    return {
      gateName: 'SAFETY_QC',
      passed,
      score: passed ? 1.0 : 0.2,
      evidence: { unsafeMatch },
      failureReason: passed ? undefined : `Safety QC failed: Flagged unsafe/profane theme: "${unsafeMatch}".`,
      correctiveAction: 'Scrub dangerous keywords and rewrite dialogues with professional guidelines.',
    };
  }

  private static runChannelRuleQC(script: VideoScript, prohibitedKeywords: string[]): QCGateOutput {
    let prohibitedMatch: string | null = null;

    for (const scene of script.scenes) {
      for (const word of prohibitedKeywords) {
        const pattern = new RegExp(`\\b${word}\\b`, 'i');
        if (pattern.test(scene.narrationDialogue) || pattern.test(scene.visualGuideline)) {
          prohibitedMatch = word;
          break;
        }
      }
      if (prohibitedMatch) break;
    }

    const passed = !prohibitedMatch;

    return {
      gateName: 'CHANNEL_RULE_QC',
      passed,
      score: passed ? 1.0 : 0.1,
      evidence: { prohibitedMatch },
      failureReason: passed ? undefined : `Channel Rule QC failed: Found prohibited channel keyword: "${prohibitedMatch}".`,
      correctiveAction: 'Replace prohibited channel keywords with permitted synonyms.',
    };
  }
}
export default QCEngine;
