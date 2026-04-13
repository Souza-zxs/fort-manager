import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createMarketplaceRouter } from '../src/api/marketplaces/routes.js';
import meliRoutes from '../src/api/marketplaces/mercadolivre-routes.js';
import { errorHandler } from '../src/api/marketplaces/shared/middleware/error-handler.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(repoRoot, '.env.local') });
dotenv.config({ path: path.join(repoRoot, '.env') });

const app = express();

const extraOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...extraOrigins,
  process.env.VITE_ML_REDIRECT_URI?.replace(/\/auth\/callback$/, ''),
  process.env.MELI_REDIRECT_URI?.replace(/\/auth\/callback$/, ''),
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
].filter(Boolean) as string[];

const isProduction = process.env.NODE_ENV === 'production';

app.use(
  cors({
    origin: isProduction
      ? (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error(`CORS bloqueado: ${origin}`));
          }
        }
      : true,
    credentials: true,
  }),
);

app.use(express.json());

app.use('/api/marketplaces', createMarketplaceRouter());
app.use('/api/marketplaces/mercadolivre', meliRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

export default app;
