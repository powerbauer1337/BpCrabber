import request from 'supertest';
import { app } from '../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

describe('Beatport Integration', () => {
  let accessToken: string;
  const uploadDir = path.join(__dirname, '../../uploads');

  beforeAll(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    await prisma.user.create({
      data: {
        email: 'beatporttest@example.com',
        password: hashedPassword,
        name: 'Beatport Test User',
      },
    });

    // Login to get access token
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'beatporttest@example.com',
      password: 'testpassword123',
    });

    accessToken = loginRes.body.accessToken;

    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: 'beatporttest@example.com' },
    });

    // Cleanup test files
    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }
  });

  describe('GET /api/beatport/search', () => {
    it('should search Beatport tracks with pagination', async () => {
      const res = await request(app)
        .get('/api/beatport/search')
        .query({ query: 'test', page: 1, perPage: 20 })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('results');
      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body).toHaveProperty('totalResults');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('perPage');

      // Verify track structure
      if (res.body.results.length > 0) {
        const track = res.body.results[0];
        expect(track).toHaveProperty('id');
        expect(track).toHaveProperty('title');
        expect(track).toHaveProperty('artist');
      }
    }, 10000); // Increase timeout for real API call

    it('should require search query', async () => {
      const res = await request(app)
        .get('/api/beatport/search')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid search parameters');
    });
  });

  describe('GET /api/beatport/tracks/:beatportId', () => {
    let testTrackId: string;

    beforeAll(async () => {
      // Search for a track to use in tests
      const searchRes = await request(app)
        .get('/api/beatport/search')
        .query({ query: 'test' })
        .set('Authorization', `Bearer ${accessToken}`);

      if (searchRes.body.results.length > 0) {
        testTrackId = searchRes.body.results[0].id;
      } else {
        throw new Error('No test tracks found');
      }
    });

    it('should get track details', async () => {
      const res = await request(app)
        .get(`/api/beatport/tracks/${testTrackId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', testTrackId);
      expect(res.body).toHaveProperty('title');
      expect(res.body).toHaveProperty('artist');
    }, 10000);

    it('should handle non-existent track', async () => {
      const res = await request(app)
        .get('/api/beatport/tracks/nonexistent')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/beatport/tracks/:beatportId/download', () => {
    let downloadableTrackId: string;

    beforeAll(async () => {
      // Search for a track that has a download URL
      const searchRes = await request(app)
        .get('/api/beatport/search')
        .query({ query: 'test' })
        .set('Authorization', `Bearer ${accessToken}`);

      const downloadableTrack = searchRes.body.results.find((track: any) => track.downloadUrl);

      if (downloadableTrack) {
        downloadableTrackId = downloadableTrack.id;
      } else {
        throw new Error('No downloadable tracks found');
      }
    });

    it('should initiate track download', async () => {
      const res = await request(app)
        .get(`/api/beatport/tracks/${downloadableTrackId}/download`)
        .query({ format: 'mp3' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toMatch(/application\/octet-stream/);
    }, 30000); // Longer timeout for download

    it('should handle invalid format', async () => {
      const res = await request(app)
        .get(`/api/beatport/tracks/${downloadableTrackId}/download`)
        .query({ format: 'invalid' })
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid format specified');
    });
  });

  describe('GET /api/beatport/tracks/:beatportId/preview', () => {
    let previewableTrackId: string;

    beforeAll(async () => {
      // Search for a track that has a preview URL
      const searchRes = await request(app)
        .get('/api/beatport/search')
        .query({ query: 'test' })
        .set('Authorization', `Bearer ${accessToken}`);

      const previewableTrack = searchRes.body.results.find((track: any) => track.previewUrl);

      if (previewableTrack) {
        previewableTrackId = previewableTrack.id;
      } else {
        throw new Error('No previewable tracks found');
      }
    });

    it('should get track preview URL', async () => {
      const res = await request(app)
        .get(`/api/beatport/tracks/${previewableTrackId}/preview`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('previewUrl');
      expect(res.body.previewUrl).toMatch(/^https?:\/\//);
    }, 10000);

    it('should handle track without preview', async () => {
      // Use a track ID that we know doesn't exist
      const res = await request(app)
        .get('/api/beatport/tracks/nonexistent/preview')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });
});
