import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { app } from '../app';
import { PrismaClient } from '@prisma/client';
import { authService } from '../services/authService';
import { PlaylistService } from '../services/playlist.service';

const prisma = new PrismaClient();

describe('Playlist Routes', () => {
  let authToken: string;
  let userId: string;
  let trackId: string;
  let playlistId: string;

  beforeAll(async () => {
    // Create test user
    const userData = {
      email: 'playlist-test@example.com',
      password: 'test123',
      name: 'Test User',
    };

    const { user, accessToken } = await authService.register(userData);
    authToken = accessToken;
    userId = user.id;

    // Create test track
    const track = await prisma.track.create({
      data: {
        title: 'Test Track',
        artist: 'Test Artist',
        duration: 180,
      },
    });
    trackId = track.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.playlist.deleteMany({
      where: { userId },
    });
    await prisma.track.deleteMany();
    await prisma.user.delete({
      where: { id: userId },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/playlists', () => {
    it('should create a new playlist', async () => {
      const response = await request(app)
        .post('/api/playlists')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Playlist',
          description: 'A test playlist',
          trackIds: [trackId],
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Playlist');
      expect(response.body.tracks).toHaveLength(1);
      expect(response.body.tracks[0].id).toBe(trackId);

      playlistId = response.body.id;
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/playlists')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Missing name',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/playlists', () => {
    it('should return all playlists for the user', async () => {
      const response = await request(app)
        .get('/api/playlists')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/playlists/:id', () => {
    it('should return a specific playlist', async () => {
      const response = await request(app)
        .get(`/api/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(playlistId);
      expect(response.body.tracks).toHaveLength(1);
    });

    it('should return 404 for non-existent playlist', async () => {
      const response = await request(app)
        .get('/api/playlists/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/playlists/:id', () => {
    it('should update a playlist', async () => {
      const response = await request(app)
        .put(`/api/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Playlist Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Playlist Name');
    });
  });

  describe('POST /api/playlists/:id/tracks/:trackId', () => {
    it('should add a track to a playlist', async () => {
      // Create another track
      const newTrack = await prisma.track.create({
        data: {
          title: 'Another Track',
          artist: 'Another Artist',
          duration: 200,
        },
      });

      const response = await request(app)
        .post(`/api/playlists/${playlistId}/tracks/${newTrack.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tracks).toHaveLength(2);
    });
  });

  describe('DELETE /api/playlists/:id/tracks/:trackId', () => {
    it('should remove a track from a playlist', async () => {
      const response = await request(app)
        .delete(`/api/playlists/${playlistId}/tracks/${trackId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tracks).toHaveLength(1);
    });
  });

  describe('DELETE /api/playlists/:id', () => {
    it('should delete a playlist', async () => {
      const response = await request(app)
        .delete(`/api/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      // Verify playlist is deleted
      const getResponse = await request(app)
        .get(`/api/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });
});

describe('PlaylistService', () => {
  let playlistService;

  beforeEach(() => {
    playlistService = new PlaylistService(prisma);
  });

  afterEach(async () => {
    await prisma.playlist.deleteMany();
  });

  it('should create a new playlist', async () => {
    const playlistData = {
      name: 'Test Playlist',
      description: 'Test Description',
      userId: '123',
    };

    const playlist = await playlistService.createPlaylist(playlistData);

    expect(playlist).toBeDefined();
    expect(playlist.name).toBe(playlistData.name);
    expect(playlist.description).toBe(playlistData.description);
    expect(playlist.userId).toBe(playlistData.userId);
  });

  it('should get a playlist by id', async () => {
    const playlistData = {
      name: 'Test Playlist',
      description: 'Test Description',
      userId: '123',
    };

    const createdPlaylist = await playlistService.createPlaylist(playlistData);
    const playlist = await playlistService.getPlaylistById(createdPlaylist.id);

    expect(playlist).toBeDefined();
    expect(playlist?.id).toBe(createdPlaylist.id);
  });
});
