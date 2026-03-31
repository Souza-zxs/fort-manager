import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mercadoLivreRoutes from './routes/mercadolivre.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.VITE_ML_REDIRECT_URI?.replace(/\/integracoes$/, '') || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

app.use('/api/mercadolivre', mercadoLivreRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
  console.log(`📦 API Mercado Livre: http://localhost:${PORT}/api/mercadolivre`);
});
