import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '@vexa/database';
import { GeminiAIProvider } from '../providers/ai/GeminiAIProvider.js';
import { ContentStrategyPlanner } from '../pipeline/ContentStrategyPlanner.js';
import { ScriptGenerator } from '../pipeline/ScriptGenerator.js';
import { ScenePlanner } from '../pipeline/ScenePlanner.js';
import { logger } from '../utils/logger.js';

export const jobsRouter = Router();

const DEFAULT_REPO = 'khalloukibrahim03-rgb/Vexa-';

// POST /api/v1/jobs/produce — Triggers Cloud Production via GitHub Actions
jobsRouter.post('/produce', async (req: Request, res: Response) => {
  try {
    const aiProvider = new GeminiAIProvider();
    let topic: string = req.body?.topic;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      // Dynamic topic selection via AI if omitted
      try {
        const dynamicTopic = await aiProvider.generateText(
          'Suggest a single trending, high-momentum topic in 5 words or less regarding AI, software engineering, or autonomous agents.',
          { temperature: 0.8 }
        );
        topic = dynamicTopic.trim().replace(/^["']|["']$/g, '');
      } catch (e) {
        topic = 'Autonomous Agent Workflows in Node.js';
      }
    }

    logger.info({ topic }, 'Initiating Cloud Production pipeline job creation');

    // 1. Generate Content Strategy Outline
    const strategyPlanner = new ContentStrategyPlanner(aiProvider);
    const outline = await strategyPlanner.planOutline(topic);

    // 2. Generate Scene Script
    const scriptGenerator = new ScriptGenerator(aiProvider);
    const script = await scriptGenerator.generateScript(outline);

    // 3. Plan Composition Timeline
    const timeline = ScenePlanner.planTimeline(script);

    // 4. Create Job in Postgres database
    const correlationId = crypto.randomUUID();
    const fullScriptText = script.scenes.map((s) => s.narrationDialogue).join(' ');

    const job = await prisma.job.create({
      data: {
        correlationId,
        idempotencyKey: `cloud_produce_${correlationId}`,
        status: 'QUEUED',
        payload: JSON.parse(JSON.stringify({
          topic,
          title: outline.title,
          description: outline.hook,
          tags: ['AI', 'VEXA', 'Autonomous', 'Tech'],
          script: fullScriptText,
          outline,
          scriptData: script,
          timeline,
        })),
      },
    });

    // 5. Dispatch GitHub Actions workflow
    const repo = process.env['GITHUB_REPOSITORY'] || DEFAULT_REPO;
    const pat = process.env['GITHUB_PAT_ACTIONS'] || '';
    const dispatchUrl = `https://api.github.com/repos/${repo}/actions/workflows/produce-video.yml/dispatches`;
    const actionsRunUrl = `https://github.com/${repo}/actions`;

    let dispatchSuccess = false;
    let dispatchError: string | null = null;

    if (pat) {
      logger.info({ repo, jobId: job.id }, 'Dispatching GitHub Actions workflow via REST API');
      const ghRes = await fetch(dispatchUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${pat}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            jobId: job.id,
          },
        }),
      });

      if (ghRes.ok) {
        dispatchSuccess = true;
        logger.info({ jobId: job.id }, 'Successfully dispatched GitHub Actions produce-video workflow');
      } else {
        dispatchError = await ghRes.text();
        logger.error({ status: ghRes.status, dispatchError }, 'Failed to dispatch GitHub Actions workflow');
      }
    } else {
      dispatchError = 'GITHUB_PAT_ACTIONS environment variable is missing';
      logger.warn({ jobId: job.id }, 'GITHUB_PAT_ACTIONS missing; job saved in DB but workflow dispatch skipped');
    }

    res.status(202).json({
      jobId: job.id,
      status: job.status,
      actionsRunUrl,
      dispatchSuccess,
      dispatchError,
      payload: {
        topic,
        title: outline.title,
      },
      message: dispatchSuccess
        ? 'Job created and successfully dispatched to GitHub Actions runner.'
        : 'Job created in database, but GitHub Actions workflow dispatch had an error.',
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error creating cloud production job');
    res.status(500).json({ error: 'Failed to initiate cloud production job', details: error?.message });
  }
});

// GET /api/v1/jobs/:id — Poll job status and result
jobsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
    });

    if (!job) {
      res.status(404).json({ error: `Job '${req.params.id}' not found` });
      return;
    }

    const repo = process.env['GITHUB_REPOSITORY'] || DEFAULT_REPO;
    const actionsRunUrl = `https://github.com/${repo}/actions`;

    res.json({
      id: job.id,
      status: job.status,
      result: job.result,
      errorMessage: job.errorMessage,
      errorStack: job.errorStack,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      actionsRunUrl,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error fetching job status');
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

// GET /api/v1/jobs — List recent jobs
jobsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const jobs = await prisma.job.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    const repo = process.env['GITHUB_REPOSITORY'] || DEFAULT_REPO;
    const actionsRunUrl = `https://github.com/${repo}/actions`;

    res.json({
      jobs,
      actionsRunUrl,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error listing jobs');
    res.status(500).json({ error: 'Failed to list jobs' });
  }
});

export default jobsRouter;
