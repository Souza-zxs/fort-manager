import app from './app.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
  console.log(`📦 Marketplaces API: http://localhost:${PORT}/api/marketplaces`);
  console.log(`🛒 Mercado Livre API: http://localhost:${PORT}/api/marketplaces/mercadolivre`);
});


