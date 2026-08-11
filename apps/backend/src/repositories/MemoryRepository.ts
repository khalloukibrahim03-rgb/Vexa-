import { prisma, MemoryEntry } from '@vexa/database';

export class MemoryRepository {
  /**
   * Fetches the latest memory entry for a specific key and channel.
   */
  static async getMemory(channelId: string, key: string): Promise<MemoryEntry | null> {
    return prisma.memoryEntry.findUnique({
      where: {
        key,
        channelId,
      },
    });
  }

  /**
   * Sets or updates a memory entry. Increments the version instead of silently overwriting.
   */
  static async saveMemory(
    channelId: string,
    category: 'CHANNEL' | 'TOPIC' | 'CONTENT' | 'AUDIENCE' | 'PERFORMANCE' | 'STRATEGY' | 'FAILURE' | 'EXPERIMENT',
    key: string,
    data: Record<string, any>
  ): Promise<MemoryEntry> {
    const existing = await prisma.memoryEntry.findUnique({
      where: { key, channelId },
    });

    if (existing) {
      const nextVersion = existing.version + 1;
      return prisma.memoryEntry.update({
        where: { id: existing.id },
        data: {
          version: nextVersion,
          data,
          updatedAt: new Date(),
        },
      });
    }

    return prisma.memoryEntry.create({
      data: {
        channelId,
        category,
        key,
        version: 1,
        data,
      },
    });
  }

  /**
   * Fetches all memories for a channel within a specific category.
   */
  static async getMemoriesByCategory(
    channelId: string,
    category: string
  ): Promise<MemoryEntry[]> {
    return prisma.memoryEntry.findMany({
      where: {
        channelId,
        category,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }
}
export default MemoryRepository;
