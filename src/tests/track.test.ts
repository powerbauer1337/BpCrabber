import request from 'supertest';
import { app } from '../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const prisma = new PrismaClient();

describe('Track Endpoints', () => {
  let testUser: { id: string; email: string; password: string };
  let accessToken: string;
  let testTrack: { id: string };

  beforeAll(async () => {
    // Create a test user
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'tracktest@example.com',
        password: hashedPassword,
        name: 'Track Test User',
      },
    });

    // Login to get access token
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'tracktest@example.com',
      password: 'testpassword123',
    });

    accessToken = loginRes.body.accessToken;

    // Create a test track
    testTrack = await prisma.track.create({
      data: {
        title: 'Test Track',
        artist: 'Test Artist',
        album: 'Test Album',
        duration: 180,
        bpm: 128,
        key: 'C',
        genre: 'House',
        beatportId: 'test123',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.track.deleteMany({
      where: { beatportId: 'test123' },
    });
    await prisma.user.deleteMany({
      where: { email: 'tracktest@example.com' },
    });
  });

  describe('GET /api/tracks', () => {
    it('should get all tracks', async () => {
      const res = await request(app)
        .get('/api/tracks')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should not get tracks without token', async () => {
      const res = await request(app).get('/api/tracks');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('No token provided');
    });
  });

  describe('GET /api/tracks/search', () => {
    it('should search tracks by query', async () => {
      const res = await request(app)
        .get('/api/tracks/search?query=Test')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].title).toContain('Test');
    });

    it('should not search without query parameter', async () => {
      const res = await request(app)
        .get('/api/tracks/search')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Search query is required');
    });
  });

  describe('GET /api/tracks/:id', () => {
    it('should get track by ID', async () => {
      const res = await request(app)
        .get(`/api/tracks/${testTrack.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testTrack.id);
    });

    it('should not get non-existent track', async () => {
      const res = await request(app)
        .get('/api/tracks/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Track not found');
    });
  });

  describe('POST /api/tracks', () => {
    it('should create new track', async () => {
      const res = await request(app)
        .post('/api/tracks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'New Track',
          artist: 'New Artist',
          album: 'New Album',
          duration: 200,
          bpm: 130,
          key: 'D',
          genre: 'Techno',
          beatportId: 'new123',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('New Track');
      expect(res.body.artist).toBe('New Artist');
    });

    it('should not create track with duplicate beatportId', async () => {
      const res = await request(app)
        .post('/api/tracks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Duplicate Track',
          artist: 'Duplicate Artist',
          album: 'Duplicate Album',
          duration: 180,
          bpm: 128,
          key: 'C',
          genre: 'House',
          beatportId: 'test123', // Same as testTrack
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Track with this Beatport ID already exists');
    });
  });

  describe('PUT /api/tracks/:id', () => {
    it('should update track', async () => {
      const res = await request(app)
        .put(`/api/tracks/${testTrack.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Updated Track',
          artist: 'Updated Artist',
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Track');
      expect(res.body.artist).toBe('Updated Artist');
    });

    it('should not update non-existent track', async () => {
      const res = await request(app)
        .put('/api/tracks/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Updated Track',
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Track not found');
    });
  });

  describe('DELETE /api/tracks/:id', () => {
    it('should delete track', async () => {
      const res = await request(app)
        .delete(`/api/tracks/${testTrack.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(204);
    });

    it('should not delete non-existent track', async () => {
      const res = await request(app)
        .delete('/api/tracks/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Track not found');
    });
  });
});
