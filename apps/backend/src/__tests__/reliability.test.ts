import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { JobCoordinator } from '../orchestrator/JobCoordinator.js';
import { DLQRouter } from '../orchestrator/DLQRouter.js';
import { createRateLimiter } from '../security/rateLimiter.js';
import { authorizeRoles } from '../security/authorizer.js';
import { signToken } from '../utils/crypto.js';

// Mock database operations cleanly
vi.mock('@vexa/database', () => {
  const jobsDb = new Map<string, any>();
  const mockPrisma = {
    job: {
      findMany: vi.fn().mockImplementation((args) => {
        const isRunning = args.where.status === 'RUNNING';
        if (isRunning && args.where.leaseExpiry) {
          // Return expired jobs
          return Promise.resolve(
            Array.from(jobsDb.values()).filter(
              (job) => job.status === 'RUNNING' && job.leaseExpiry < new Date()
            )
          );
        }
        return Promise.resolve(
          Array.from(jobsDb.values()).filter((job) => job.status === args.where.status)
        );
      }),
      create: vi.fn().mockImplementation((args) => {
        const id = `job_${Math.random().toString(36).substr(2, 9)}`;
        const record = { id, ...args.data, createdAt: new Date(), updatedAt: new Date() };
        jobsDb.set(id, record);
        return Promise.resolve(record);
      }),
      update: vi.fn().mockImplementation((args) => {
        const id = args.where.id;
        const record = jobsDb.get(id);
        if (!record) return Promise.resolve(null);
        const updated = { ...record, ...args.data, updatedAt: new Date() };
        jobsDb.set(id, updated);
        return Promise.resolve(updated);
      }),
    },
    $transaction: vi.fn().mockImplementation(async (callback) => {
      return callback(mockPrisma);
    }),
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

describe('VEXA Reliability & Security Unit Tests', () => {
  describe('Crash Recovery & Heartbeats', () => {
    it('should successfully transition expired lease jobs to RETRYING or DEAD_LETTER', async () => {
      const { prisma } = await import('@vexa/database');

      // 1. Register a crashed active job (lease expired 1 hour ago)
      await prisma.job.create({
        data: {
          correlationId: 'corr-crash-1',
          status: 'RUNNING',
          idempotencyKey: 'idem-crash-1',
          payload: {},
          retryCount: 0,
          leaseExpiry: new Date(Date.now() - 60 * 60 * 1000),
        },
      });

      const recovered = await JobCoordinator.recoverStandbyCrashedJobs();
      expect(recovered.length).toBe(1);
      expect(recovered[0]!.status).toBe('RETRYING');
      expect(recovered[0]!.retryCount).toBe(1);
    });
  });

  describe('Dead Letter Queue & Requeues', () => {
    it('should fetch and requeue isolated DEAD_LETTER jobs', async () => {
      const { prisma } = await import('@vexa/database');

      // 1. Register a dead lettered job
      const deadJob = await prisma.job.create({
        data: {
          correlationId: 'corr-dead',
          status: 'DEAD_LETTER',
          idempotencyKey: 'idem-dead-1',
          payload: {},
          retryCount: 3,
        },
      });

      const dlqList = await DLQRouter.getDLQJobs();
      expect(dlqList.length).toBe(1);

      const requeued = await DLQRouter.requeueJob(deadJob.id);
      expect(requeued.status).toBe('QUEUED');
      expect(requeued.retryCount).toBe(0);
    });
  });

  describe('Rate Limiting & Security Authorization Middleware', () => {
    const app = express();
    app.use(express.json());

    // Setup rate limiter (max 2 requests)
    app.use('/limited', createRateLimiter({ windowMs: 10000, maxRequests: 2 }));
    app.get('/limited', (_req, res) => res.status(200).send('success'));

    // Setup route authorization
    app.get('/admin-only', authorizeRoles(['admin']), (_req, res) => res.status(200).send('admin success'));

    it('should block clients and return 429 when rate limit window is breached', async () => {
      await request(app).get('/limited');
      await request(app).get('/limited');
      const res = await request(app).get('/limited');

      expect(res.status).toBe(429);
      expect(res.body.error).toBe('Too Many Requests');
    });

    it('should reject requests with 401 if token bearer is missing', async () => {
      const res = await request(app).get('/admin-only');
      expect(res.status).toBe(401);
    });

    it('should reject requests with 403 if role clearances are insufficient', async () => {
      // Sign token as a standard "user" role
      const token = signToken({ userId: 'u-1', email: 'user@vexa.ai', role: 'user' });
      const res = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('should permit access with 200 if role is authorized', async () => {
      // Sign token as "admin"
      const token = signToken({ userId: 'u-admin', email: 'admin@vexa.ai', role: 'admin' });
      const res = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.text).toBe('admin success');
    });
  });
});
