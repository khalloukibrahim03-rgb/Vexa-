import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';

vi.mock('../providers/ai/GeminiAIProvider.js', () => {
  class GeminiAIProvider {
    async generateText(prompt: string) {
      if (prompt.includes('topic')) {
        return 'Autonomous Cloud Rendering';
      }
      if (prompt.includes('content outline')) {
        return JSON.stringify({
          title: 'Mastering Cloud Production',
          hook: 'Welcome to VEXA cloud production.',
          sections: [{ heading: 'Introduction', talkingPoints: ['AI rendering'] }],
          callToAction: 'Subscribe for more updates.',
        });
      }
      return JSON.stringify({
        scenes: [
          {
            sceneNumber: 1,
            visualGuideline: 'A modern cloud workstation layout',
            narrationDialogue: 'Cloud rendering is faster and automated.',
            durationSeconds: 8,
          },
        ],
      });
    }
    async generateEmbeddings() {
      return new Array(768).fill(0);
    }
    getProviderName() {
      return 'GeminiAIProvider';
    }
  }
  return { GeminiAIProvider };
});

vi.mock('@vexa/database', () => {
  const jobsDb = new Map<string, any>();
  const mockPrisma = {
    job: {
      create: vi.fn().mockImplementation((args) => {
        const id = `job_${Math.random().toString(36).substring(2, 9)}`;
        const newJob = {
          id,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        jobsDb.set(id, newJob);
        return Promise.resolve(newJob);
      }),
      findUnique: vi.fn().mockImplementation((args) => {
        const id = args.where.id;
        return Promise.resolve(jobsDb.get(id) || null);
      }),
      findMany: vi.fn().mockImplementation(() => {
        return Promise.resolve(Array.from(jobsDb.values()));
      }),
    },
    user: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'usr_mock' }),
    },
    channel: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'chn_mock' }),
    },
    memoryEntry: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

describe('VEXA Backend Jobs Router Tests', () => {
  it('should create a new cloud production job via POST /api/v1/jobs/produce', async () => {
    const res = await request(app)
      .post('/api/v1/jobs/produce')
      .send({ topic: 'Autonomous Cloud Rendering' });

    expect(res.status).toBe(202);
    expect(res.body.jobId).toBeDefined();
    expect(res.body.status).toBe('QUEUED');
    expect(res.body.actionsRunUrl).toContain('github.com');
  });

  it('should retrieve job status via GET /api/v1/jobs/:id', async () => {
    const createRes = await request(app)
      .post('/api/v1/jobs/produce')
      .send({ topic: 'Test Status Retrieval' });

    const jobId = createRes.body.jobId;

    const res = await request(app).get(`/api/v1/jobs/${jobId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(jobId);
    expect(res.body.status).toBe('QUEUED');
  });

  it('should return 404 for a non-existent job ID', async () => {
    const res = await request(app).get('/api/v1/jobs/non_existent_id');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Job 'non_existent_id' not found");
  });
});
