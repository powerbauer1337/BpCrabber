import { Express } from 'express';
import { trackRoutes } from './trackRoutes';
import { playlistRoutes } from './playlistRoutes';
import { authRoutes } from './authRoutes';
import { beatportRoutes } from './beatportRoutes';

export function setupRoutes(app: Express): void {
  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/tracks', trackRoutes);
  app.use('/api/playlists', playlistRoutes);
  app.use('/api/beatport', beatportRoutes);
}
