import { describe, it, expect, vi } from 'vitest';
import { MockPublishingProvider } from '../providers/publishing/MockPublishingProvider.js';
import { PublishingOrchestrator } from '../pipeline/PublishingOrchestrator.js';

// Mock database operations cleanly
vi.mock('@vexa/database', () => {
  const jobsDb = new Map<string, any>();
  const mockPrisma = {
    job: {
      findUnique: vi.fn().mockImplementation((args) => {
        const key = args.where.idempotencyKey;
        return Promise.resolve(jobsDb.get(key) || null);
      }),
      create: vi.fn().mockImplementation((args) => {
        const id = `job_${Math.random().toString(36).substr(2, 9)}`;
        const record = { id, ...args.data, createdAt: new Date(), updatedAt: new Date() };
        jobsDb.set(args.data.idempotencyKey, record);
        return Promise.resolve(record);
      }),
      update: vi.fn().mockImplementation((args) => {
        let matchedKey = '';
        for (const [k, v] of jobsDb.entries()) {
          if (v.id === args.where.id) {
            matchedKey = k;
            break;
          }
        }
        if (!matchedKey) return Promise.resolve(null);
        const record = jobsDb.get(matchedKey);
        const updated = { ...record, ...args.data, updatedAt: new Date() };
        jobsDb.set(matchedKey, updated);
        return Promise.resolve(updated);
      }),
    },
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

describe('VEXA Publishing & Idempotency Protection Unit Tests', () => {
  const provider = new MockPublishingProvider();
  const orchestrator = new PublishingOrchestrator(provider);

  it('should successfully publish mock video metadata', async () => {
    const details = await provider.publishVideo('clip.mp4', 'Make AI Agents', 'Tech guide', ['ai', 'agent']);
    expect(details.platformVideoId).toBeDefined();
    expect(details.publishUrl).toContain('youtube.com/watch?v=');
  });

  it('should successfully schedule video publication calendars', async () => {
    const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const details = await provider.scheduleVideo('clip.mp4', 'Make AI Agents', 'Tech guide', ['ai', 'agent'], date);
    expect(details.platformVideoId).toBeDefined();
    expect(details.metadata['scheduledPublishAt']).toBe(date.toISOString());
  });

  describe('Publishing Orchestrator Idempotency Protection', () => {
    it('should complete new jobs and persist them as COMPLETED', async () => {
      const idemKey = 'idem-job-999';
      const result = await orchestrator.executePublishJob(
        idemKey,
        'corr-11',
        'clip.mp4',
        'Advanced workflows',
        'Desc',
        ['tag']
      );

      expect(result.success).toBe(true);
      expect(result.jobStatus).toBe('COMPLETED');
      expect(result.details).toBeDefined();
    });

    it('should trigger idempotency protections on identical COMPLETED keys and deny duplicate publish', async () => {
      const idemKey = 'idem-job-999';
      const result = await orchestrator.executePublishJob(
        idemKey,
        'corr-11',
        'clip.mp4',
        'Advanced workflows',
        'Desc',
        ['tag']
      );

      expect(result.success).toBe(true);
      expect(result.jobStatus).toBe('COMPLETED');
      expect(result.message).toBe('Idempotent bypass: Video already published previously.');
    });

    it('should lock out duplicate executions on active RUNNING jobs', async () => {
      const idemKey = 'idem-job-active';
      // First, simulate running job by bypassing orchestrator and adding active mock state
      const { prisma } = await import('@vexa/database');
      await prisma.job.create({
        data: {
          correlationId: 'corr-active',
          status: 'RUNNING',
          idempotencyKey: idemKey,
          payload: {},
        },
      });

      const result = await orchestrator.executePublishJob(
        idemKey,
        'corr-active',
        'clip.mp4',
        'Active video publish',
        'Desc',
        ['tag']
      );

      expect(result.success).toBe(false);
      expect(result.jobStatus).toBe('RUNNING');
      expect(result.message).toBe('Idempotent lockout: This job is already actively processing in the worker queue.');
    });
  });
});
