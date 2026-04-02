import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createMarketplaceRouter } from '../src/api/marketplaces/routes.js';
import meliRoutes from '../src/api/marketplaces/mercadolivre-routes.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  process.env.VITE_ML_REDIRECT_URI?.replace(/\/auth\/callback$/, ''),
  process.env.MELI_REDIRECT_URI?.replace(/\/auth\/callback$/, ''),
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS bloqueado: ${origin}`));
    }
  },
  credentials: true,
}));

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
