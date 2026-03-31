import { Router } from 'express';
import {
  getAuthUrl,
  handleCallback,
  listItems,
  getItem,
  createItem,
  updateItem,
  pauseItem,
  activateItem,
  listOrders,
  getOrder,
  getBalance,
  getMovements,
  getFinancialSummary,
  getPayment,
} from '../marketplaces/controllers/mercadolivre.controller';
import { meliAuthMiddleware } from '../marketplaces/shared/middleware/mercadolivre.auth.middleware';

// ─────────────────────────────────────────────────────────────────────────────
// Para usar: importe este router no seu routes.ts existente:
//
//   import meliRoutes from './marketplaces/mercadolivre.routes';
//   router.use('/marketplaces/mercadolivre', meliRoutes);
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

// Auth (sem middleware — são os endpoints de handshake OAuth)
router.get('/auth/url',      getAuthUrl);
router.get('/auth/callback', handleCallback);

// Todas as rotas abaixo exigem credenciais válidas
router.use(meliAuthMiddleware);

// Anúncios
router.get  ('/items',                  listItems);
router.post ('/items',                  createItem);
router.get  ('/items/:itemId',          getItem);
router.patch('/items/:itemId',          updateItem);
router.patch('/items/:itemId/pause',    pauseItem);
router.patch('/items/:itemId/activate', activateItem);

// Pedidos
router.get('/orders',          listOrders);
router.get('/orders/:orderId', getOrder);

// Financeiro
router.get('/finance/balance',          getBalance);
router.get('/finance/movements',        getMovements);
router.get('/finance/summary',          getFinancialSummary);
router.get('/finance/payments/:paymentId', getPayment);

export default router;