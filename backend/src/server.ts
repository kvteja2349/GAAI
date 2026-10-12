// Load environment variables before any module reads process.env
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Route imports
import authRoutes from './routes/auth.js';
import creditsRoutes from './routes/credits.js';
import aiRoutes from './routes/ai.js';
import chatRoutes from './routes/chat.js';
import arcadeRoutes from './routes/arcade.js';
import searchRoutes from './routes/search.js';
import imagesRoutes from './routes/images.js';
import filesRoutes from './routes/files.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', limiter);

// Request Logger in dev
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// Health Check
app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'online',
    platform: 'GAAI (Gaming AI)',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timezone: process.env.DAILY_RESET_TIMEZONE || 'Asia/Kolkata',
    timestamp: new Date().toISOString()
  });
});

// Mount Versioned API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/credits', creditsRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/arcade', arcadeRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/images', imagesRoutes);
app.use('/api/v1/files', filesRoutes);
app.use('/api/v1/settings', settingsRoutes);

// 404 Handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Endpoint '${req.originalUrl}' not found.` });
});

// Centralized Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled Server Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error occurred.',
    timestamp: new Date().toISOString()
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 GAAI Backend Server running on port ${PORT}`);
    console.log(`📍 API Base: http://localhost:${PORT}/api/v1`);
    console.log(`⚡ Reset Timezone: ${process.env.DAILY_RESET_TIMEZONE || 'Asia/Kolkata'}`);
  });
}

export default app;
