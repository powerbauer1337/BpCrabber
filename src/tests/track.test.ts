import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../app';
import { createTestUser, generateTestToken } from './testUtils';

const prisma = new PrismaClient();

describe('Track Endpoints', () => {
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    // Create test user and generate token
    const user = await createTestUser('tracktest@example.com', 'testpassword123');
    userId = user.id;
    accessToken = generateTestToken(user);

    // Create test track
    await prisma.track.create({
      data: {
        beatportId: 'test123',
        title: 'Test Track',
        artist: 'Test Artist',
        album: 'Test Album',
        duration: 390, // 6:30 in seconds
        bpm: 128,
        key: 'A min',
        genre: 'Test Genre',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.$transaction([
      prisma.track.deleteMany({
        where: { beatportId: 'test123' },
      }),
      prisma.user.deleteMany({
        where: { email: 'tracktest@example.com' },
      }),
    ]);
    await prisma.$disconnect();
  });

  describe('GET /api/tracks', () => {
    it('should get all tracks', async () => {
      const res = await request(app)
        .get('/api/tracks')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('beatportId', 'test123');
    });

    it('should not get tracks without token', async () => {
      const res = await request(app).get('/api/tracks');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/tracks/search', () => {
    it('should search tracks by query', async () => {
      const res = await request(app)
        .get('/api/tracks/search')
        .query({ q: 'Test' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('title', 'Test Track');
    });

    it('should not search without query parameter', async () => {
      const res = await request(app)
        .get('/api/tracks/search')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tracks/:id', () => {
    it('should get track by ID', async () => {
      const track = await prisma.track.findFirst({
        where: { beatportId: 'test123' },
      });

      const res = await request(app)
        .get(`/api/tracks/${track!.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('beatportId', 'test123');
    });

    it('should not get non-existent track', async () => {
      const res = await request(app)
        .get('/api/tracks/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/tracks', () => {
    it('should create new track', async () => {
      const newTrack = {
        beatportId: 'test456',
        title: 'New Track',
        artist: 'New Artist',
        genre: 'New Genre',
        key: 'C maj',
        bpm: 130,
        length: '7:00',
        releaseDate: new Date().toISOString(),
        price: 1.99,
        imageUrl: 'https://example.com/new-image.jpg',
        previewUrl: 'https://example.com/new-preview.mp3',
        downloadUrl: 'https://example.com/new-download.mp3',
      };

      const res = await request(app)
        .post('/api/tracks')
        .send(newTrack)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('beatportId', 'test456');

      // Clean up
      await prisma.track.deleteMany({
        where: { beatportId: 'test456' },
      });
    });

    it('should not create track with duplicate beatportId', async () => {
      const duplicateTrack = {
        beatportId: 'test123',
        title: 'Duplicate Track',
        artist: 'Duplicate Artist',
        genre: 'Duplicate Genre',
        key: 'D min',
        bpm: 125,
        length: '5:30',
        releaseDate: new Date().toISOString(),
        price: 3.99,
        imageUrl: 'https://example.com/duplicate-image.jpg',
        previewUrl: 'https://example.com/duplicate-preview.mp3',
        downloadUrl: 'https://example.com/duplicate-download.mp3',
      };

      const res = await request(app)
        .post('/api/tracks')
        .send(duplicateTrack)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/tracks/:id', () => {
    it('should update track', async () => {
      const track = await prisma.track.findFirst({
        where: { beatportId: 'test123' },
      });

      const updates = {
        title: 'Updated Track',
        artist: 'Updated Artist',
      };

      const res = await request(app)
        .put(`/api/tracks/${track!.id}`)
        .send(updates)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title', 'Updated Track');
      expect(res.body).toHaveProperty('artist', 'Updated Artist');
    });

    it('should not update non-existent track', async () => {
      const res = await request(app)
        .put('/api/tracks/non-existent-id')
        .send({ title: 'Updated Track' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/tracks/:id', () => {
    it('should delete track', async () => {
      const track = await prisma.track.findFirst({
        where: { beatportId: 'test123' },
      });

      const res = await request(app)
        .delete(`/api/tracks/${track!.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(204);

      const deletedTrack = await prisma.track.findFirst({
        where: { id: track!.id },
      });
      expect(deletedTrack).toBeNull();
    });

    it('should not delete non-existent track', async () => {
      const res = await request(app)
        .delete('/api/tracks/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });
});
