import { describe, it, expect, vi } from 'vitest';
import { MemoryRepository } from '../repositories/MemoryRepository.js';

// Mock database operations cleanly
vi.mock('@vexa/database', () => {
  const db = new Map<string, any>();
  const mockPrisma = {
    memoryEntry: {
      findUnique: vi.fn().mockImplementation((args) => {
        const key = args.where.key;
        return Promise.resolve(db.get(key) || null);
      }),
      create: vi.fn().mockImplementation((args) => {
        const id = `mem_${Math.random().toString(36).substr(2, 9)}`;
        const record = { id, ...args.data, createdAt: new Date(), updatedAt: new Date() };
        db.set(args.data.key, record);
        return Promise.resolve(record);
      }),
      update: vi.fn().mockImplementation((args) => {
        let matchedKey = '';
        for (const [k, v] of db.entries()) {
          if (v.id === args.where.id) {
            matchedKey = k;
            break;
          }
        }
        if (!matchedKey) return Promise.resolve(null);
        const record = db.get(matchedKey);
        const updated = { ...record, ...args.data, updatedAt: new Date() };
        db.set(matchedKey, updated);
        return Promise.resolve(updated);
      }),
      findMany: vi.fn().mockImplementation((args) => {
        const category = args.where.category;
        return Promise.resolve(
          Array.from(db.values()).filter((rec) => rec.category === category)
        );
      }),
    },
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

describe('VEXA MemoryRepository Operations', () => {
  const channelId = 'chan-1';

  it('should initialize a memory entry at version 1', async () => {
    const key = 'tone_guideline';
    const data = { tone: 'professional', strict_safety: true };

    const entry = await MemoryRepository.saveMemory(channelId, 'CHANNEL', key, data);
    expect(entry).toBeDefined();
    expect(entry.version).toBe(1);
    expect(entry.data).toEqual(data);
  });

  it('should increment version on updates instead of overwriting silently', async () => {
    const key = 'tone_guideline';
    const updatedData = { tone: 'high density professional', strict_safety: true };

    const entry = await MemoryRepository.saveMemory(channelId, 'CHANNEL', key, updatedData);
    expect(entry).toBeDefined();
    expect(entry.version).toBe(2);
    expect(entry.data).toEqual(updatedData);
  });

  it('should fetch compiled memory lists by category', async () => {
    const memories = await MemoryRepository.getMemoriesByCategory(channelId, 'CHANNEL');
    expect(memories.length).toBe(1);
    expect(memories[0]!.version).toBe(2);
  });
});
