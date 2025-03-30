import request from 'supertest';
import { app } from '../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const prisma = new PrismaClient();

describe('Authentication Endpoints', () => {
  let testUser: { id: string; email: string; password: string };
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    // Create a test user
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' },
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe('newuser@example.com');
      expect(res.body.user.name).toBe('New User');
    });

    it('should not register user with existing email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('User already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'testpassword123',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.name).toBe('Test User');

      // Store tokens for other tests
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('should not login with invalid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.accessToken).not.toBe(accessToken);
      expect(res.body.refreshToken).not.toBe(refreshToken);

      // Update tokens for subsequent tests
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('should not refresh with invalid refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: 'invalid_token',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid refresh token');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const res = await request(app).post('/api/auth/logout').send({
        refreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('User logged out successfully');
    });

    it('should not logout with invalid refresh token', async () => {
      const res = await request(app).post('/api/auth/logout').send({
        refreshToken: 'invalid_token',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid input data');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('test@example.com');
      expect(res.body.name).toBe('Test User');
    });

    it('should not get profile without token', async () => {
      const res = await request(app).get('/api/auth/profile');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('No token provided');
    });
  });
});
