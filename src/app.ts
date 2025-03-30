import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { setupSecurityPolicies } from './config/security';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { authRouter } from './routes/auth';
import { trackRouter } from './routes/track';
import { beatportRouter } from './routes/beatport';
import { playlistRouter } from './routes/playlist';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
setupSecurityPolicies(app);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimiter);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/tracks', trackRouter);
app.use('/api/beatport', beatportRouter);
app.use('/api/playlists', playlistRouter);

// Error handling
app.use(errorHandler);

export default app;
