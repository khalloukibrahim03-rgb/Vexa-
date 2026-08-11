import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

let prisma: PrismaClient;

if (process.env['NODE_ENV'] === 'production') {
  prisma = new PrismaClient();
} else {
  // In development, bind the client instance to global variable to prevent hot reload from spawning countless instances.
  const globalWithPrisma = global as typeof globalThis & {
    prisma?: PrismaClient;
  };
  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = new PrismaClient();
  }
  prisma = globalWithPrisma.prisma;
}

export { prisma };
export default prisma;
