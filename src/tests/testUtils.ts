import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function createTestUser(email: string, password: string): Promise<User> {
  const hashedPassword = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Test User',
    },
  });
}

export function generateTestToken(user: User): string {
  return jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, {
    expiresIn: '1h',
  });
}

export async function cleanupTestData(): Promise<void> {
  await prisma.$transaction([prisma.track.deleteMany(), prisma.user.deleteMany()]);
  await prisma.$disconnect();
}
