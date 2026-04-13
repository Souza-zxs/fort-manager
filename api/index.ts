/**
 * Entrada serverless na Vercel: rewrites enviam `/api/*` para esta função.
 * Exportar o app Express é o formato suportado por `@vercel/node`.
 */
import app from '../server/app.js';

export default app;
