import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import apiRoutes from '../routes/index.js';
import { connectDatabase } from '../services/databaseService.js';
import { errorHandler, notFoundHandler } from '../middleware/errorMiddleware.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(__dirname, '../../.env') });
dotenv.config({ path: resolve(__dirname, '../.env'), override: true });

// Enforce JWT_SECRET in production to prevent forged tokens
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET must be set in production. Refusing to start.');
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 5000;

// --- CORS: restrict to known origins in production ---
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, same-origin)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true
}));

// --- Security headers via Helmet ---
app.use(helmet({
  // Content Security Policy — relaxed for Vite dev proxy; tighten in production
  contentSecurityPolicy: false
}));

// --- Global rate limiting (prevent brute force & DoS) ---
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

// --- Strict rate limit for auth routes ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes.' }
});

// --- Strict rate limit for AI analysis (resource-intensive) ---
const analysisLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Analysis rate limit reached. Please wait a minute.' }
});

app.use(globalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (profile images, workspace logos)
app.use('/api/uploads', express.static(resolve(__dirname, '../uploads')));

// Health check (excluded from rate limit counts above)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'DebugAI API', timestamp: new Date().toISOString() });
});

// Apply specific rate limiters before routes
app.use('/api/auth', authLimiter);
app.use('/api/analyze-error', analysisLimiter);

app.use('/api', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

await connectDatabase(process.env.MONGO_URI);

app.listen(port, () => {
  console.log(`DebugAI API running on http://localhost:${port}`);
});
