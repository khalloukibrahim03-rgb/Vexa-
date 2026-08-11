import { describe, it, expect, vi } from 'vitest';
import { prisma } from '../index.js';

vi.mock('../index.js', () => {
  const mockPrisma = {
    channel: {
      create: vi.fn().mockImplementation((args) => Promise.resolve({ id: 'mock-channel-id', ...args.data })),
      findUnique: vi.fn().mockImplementation((args) => Promise.resolve({ id: args.where.id, name: 'Mock Channel' })),
    },
    decisionRecord: {
      create: vi.fn().mockImplementation((args) => Promise.resolve({ id: 'mock-decision-id', ...args.data })),
    },
    job: {
      create: vi.fn().mockImplementation((args) => Promise.resolve({ id: 'mock-job-id', ...args.data })),
    },
    user: {
      create: vi.fn().mockImplementation((args) => Promise.resolve({ id: 'mock-user-id', ...args.data })),
    },
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

describe('VEXA Database Client Operations', () => {
  it('should successfully mock creation of a channel', async () => {
    const data = { name: 'VEXA AI Hub', platform: 'YOUTUBE', platformId: 'yt-123', userId: 'mock-user-id' };
    const channel = await prisma.channel.create({ data });

    expect(channel).toBeDefined();
    expect(channel.name).toBe('VEXA AI Hub');
    expect(channel.id).toBe('mock-channel-id');
  });

  it('should successfully fetch unique channels', async () => {
    const channel = await prisma.channel.findUnique({ where: { id: 'some-id' } });
    expect(channel).toBeDefined();
    expect(channel?.name).toBe('Mock Channel');
  });

  it('should create decision records and jobs linked to channels', async () => {
    const decision = await prisma.decisionRecord.create({
      data: {
        channelId: 'mock-channel-id',
        decision: 'PRODUCE',
        confidenceScore: 0.95,
        context: {},
        evidence: {},
        alternatives: {},
        strategyVersionId: 'strat-1',
      },
    });

    const job = await prisma.job.create({
      data: {
        correlationId: 'corr-123',
        status: 'QUEUED',
        payload: { videoName: 'Advanced Agent Tech' },
        idempotencyKey: 'idem-123',
      },
    });

    expect(decision).toBeDefined();
    expect(decision.decision).toBe('PRODUCE');
    expect(job).toBeDefined();
    expect(job.status).toBe('QUEUED');
  });
});
