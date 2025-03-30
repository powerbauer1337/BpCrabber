import { PrismaClient } from '@prisma/client';
import { logger } from '../shared/utils/logger';

const prisma = new PrismaClient();

export async function setupDatabase(): Promise<void> {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connection established');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

export { prisma };
