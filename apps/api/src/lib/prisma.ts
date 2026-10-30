import { PrismaClient } from '@prisma/client';
import { env, isDev } from '../config/env.js';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDev ? ['warn', 'error'] : ['error'],
    datasources: { db: { url: env.DATABASE_URL } },
  });

if (isDev) globalForPrisma.prisma = prisma;