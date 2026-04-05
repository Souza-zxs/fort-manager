import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createMarketplaceRouter } from '../src/api/marketplaces/routes.js';
import meliRoutes from '../src/api/marketplaces/mercadolivre-routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(repoRoot, '.env.local') });
dotenv.config({ path: path.join(repoRoot, '.env') });

const app  = express();
const PORT = process.env.PORT || 3001;

const extraOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...extraOrigins,
  process.env.VITE_ML_REDIRECT_URI?.replace(/\/auth\/callback$/, ''),
  process.env.MELI_REDIRECT_URI?.replace(/\/auth\/callback$/, ''),
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
].filter(Boolean) as string[];

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Dev: `origin: true` reflete o header Origin (qualquer porta do Vite: 5173, 8080, etc.).
 * Produção: lista explícita (defina CORS_ORIGINS=https://seu-dominio.com para somar).
 */
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

// ── Rotas ──────────────────────────────────────────────────────────────────────

// Novo sistema: integração genérica Shopee + Mercado Livre
app.use('/api/marketplaces', createMarketplaceRouter());

// Rotas ML específicas (anúncios, financeiro) com meliAuthMiddleware
app.use('/api/marketplaces/mercadolivre', meliRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
  console.log(`📦 Marketplaces API: http://localhost:${PORT}/api/marketplaces`);
  console.log(`🛒 Mercado Livre API: http://localhost:${PORT}/api/marketplaces/mercadolivre`);
});
