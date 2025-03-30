import { PrismaClient } from '@prisma/client';
const { beforeAll, afterAll } = require('@jest/globals');

// Create a new Prisma client for tests
const prisma = new PrismaClient();

beforeAll(async () => {
  // Connect to the test database
  await prisma.$connect();
});

afterAll(async () => {
  // Disconnect from the test database
  await prisma.$disconnect();
});

export { prisma };
