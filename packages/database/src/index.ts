import { PrismaClient } from '@prisma/client';

// Export everything from the Prisma client so other packages can use the types (e.g., SubmissionStatus)
export * from '@prisma/client';

// Create a single shared instance of the Prisma Client
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;