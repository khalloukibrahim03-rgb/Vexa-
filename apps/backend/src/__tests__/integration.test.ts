import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { hashPassword } from '../utils/crypto.js';

// Mock database operations securely
vi.mock('@vexa/database', () => {
  const usersDb = new Map<string, any>();
  const mockPrisma = {
    user: {
      findUnique: vi.fn().mockImplementation((args) => {
        const email = args.where.email;
        const user = Array.from(usersDb.values()).find(u => u.email === email);
        return Promise.resolve(user || null);
      }),
      create: vi.fn().mockImplementation((args) => {
        const id = `usr_${Math.random().toString(36).substr(2, 9)}`;
        const newUser = { id, ...args.data, createdAt: new Date(), updatedAt: new Date() };
        usersDb.set(id, newUser);
        return Promise.resolve(newUser);
      }),
    },
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

describe('VEXA Backend API Integration Tests', () => {
  const testUser = {
    email: 'newuser@vexa.ai',
    password: 'supersecurepassword123',
  };

  it('should return 200 OK on health check', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  it('should return agent status and initial MANUAL mode configuration', async () => {
    const res = await request(app).get('/api/v1/agent/status');
    expect(res.status).toBe(200);
    expect(res.body.agentId).toBe('vexa_brain_v1');
    expect(res.body.mode).toBe('MANUAL');
  });

  it('should register a new user successfully with a hashed password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.id).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('should fail registration if input payload is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid input schema');
  });

  it('should fail login if the email does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'missing@vexa.ai', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('should successfully authenticate registered user with correct credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send(testUser);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('should reject authentication if password is incorrect', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });
});
