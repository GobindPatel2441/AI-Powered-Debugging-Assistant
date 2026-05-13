import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import apiRoutes from '../routes/index.js';
import { connectDatabase } from '../services/databaseService.js';
import { errorHandler, notFoundHandler } from '../middleware/errorMiddleware.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(__dirname, '../../.env') });
dotenv.config({ path: resolve(__dirname, '../.env'), override: true });

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (profile images, workspace logos)
app.use('/api/uploads', express.static(resolve(__dirname, '../uploads')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'DebugAI API' });
});

app.use('/api', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

await connectDatabase(process.env.MONGO_URI);

app.listen(port, () => {
  console.log(`DebugAI API running on http://localhost:${port}`);
});
