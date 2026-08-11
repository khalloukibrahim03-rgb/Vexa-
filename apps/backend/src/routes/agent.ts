import { Router, Request, Response, RequestHandler } from 'express';
import { logger } from '../utils/logger.js';

const router = Router();

const statusHandler: RequestHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    logger.debug('Queried agent operational status');
    res.status(200).json({
      agentId: 'vexa_brain_v1',
      status: 'IDLE',
      mode: 'MANUAL', // MANUAL vs AUTONOMOUS
      version: '1.0.0',
      activeChannelCount: 1,
      lastDecisionOutcome: 'DO_NOTHING',
      activeJobsCount: 0,
      systemHealth: 'OK',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, 'Error in agent status handler');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

router.get('/status', statusHandler);

export default router;
