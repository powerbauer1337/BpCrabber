/**
 * Main Entry Point
 * @module index
 */

import express from 'express';
import helmet from 'helmet';
import { config } from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { setupRoutes } from './routes';
import { setupDatabase } from './config/database';
import { authenticateToken } from './middleware/authMiddleware';
import { app } from './app';

// Load environment variables
config();

const port = process.env.PORT || 3000;

// Middleware
const appMiddleware = express();
appMiddleware.use(helmet());
appMiddleware.use(express.json());
appMiddleware.use(express.urlencoded({ extended: true }));

// Public routes
appMiddleware.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Protected routes
appMiddleware.use('/api/tracks', authenticateToken);
appMiddleware.use('/api/playlists', authenticateToken);

// Setup routes
setupRoutes(appMiddleware);

// Error handling
appMiddleware.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Initialize database
    await setupDatabase();

    // Start the server
    app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();
