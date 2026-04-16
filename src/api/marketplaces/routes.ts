import { Router } from 'express';
import { getSupabaseClient } from './infra/database/supabase.js';
import { IntegrationRepository } from './repositories/integration.repository.js';
import { OrdersRepository } from './repositories/orders.repository.js';
import { PaymentsRepository } from './repositories/payments.repository.js';
import { SyncStateRepository } from './repositories/sync-state.repository.js';
import { ProductsRepository } from './repositories/products.repository.js';
import { MarketplaceAuthService } from './services/auth.service.js';
import { MarketplaceSyncService } from './services/sync.service.js';
import { ProductSyncService } from './services/product-sync.service.js';
import { IntegrationController } from './controllers/integration.controller.js';
import { OrdersController } from './controllers/orders.controller.js';
import { WebhookController } from './controllers/webhook.controller.js';
import { ProductsController } from './controllers/products.controller.js';
import { authMiddleware } from './shared/middleware/auth.middleware.js';

export function createMarketplaceRouter(): Router {
  const router = Router();
  const db = getSupabaseClient();

  const integrationRepo = new IntegrationRepository(db);
  const ordersRepo = new OrdersRepository(db);
  const paymentsRepo = new PaymentsRepository(db);
  const syncStateRepo = new SyncStateRepository(db);
  const productsRepo = new ProductsRepository(db);

  const authService = new MarketplaceAuthService(integrationRepo);
  const syncService = new MarketplaceSyncService(
    authService,
    integrationRepo,
    ordersRepo,
    paymentsRepo,
    syncStateRepo
  );
  const productSyncService = new ProductSyncService(
    integrationRepo,
    authService,
    productsRepo,
  );

  const integrationController = new IntegrationController(authService, syncService, integrationRepo);
  const ordersController = new OrdersController(ordersRepo, paymentsRepo, integrationRepo);
  const webhookController = new WebhookController(integrationRepo, syncService);
  const productsController = new ProductsController(productSyncService);

  // OAuth
  router.get('/integrations/:marketplace', authMiddleware, integrationController.getAuthUrl);
  router.post('/integrations/:marketplace', authMiddleware, integrationController.handleCallback);
  router.get('/integrations', authMiddleware, integrationController.listIntegrations);
  router.delete('/integrations/:id', authMiddleware, integrationController.disconnect);
  router.post('/integrations/:id/sync', authMiddleware, integrationController.triggerSync);

  // Orders
  router.get('/orders', authMiddleware, ordersController.listOrders);
  router.get('/orders/:integrationId', authMiddleware, ordersController.listOrdersByIntegration);
  router.get('/finance/summary', authMiddleware, ordersController.getFinanceSummary);

  // Products
  router.get('/products', authMiddleware, productsController.listProducts);
  router.post('/products/sync/:integrationId', authMiddleware, productsController.syncProducts);

  // Webhooks (no auth)
  router.post('/webhook/mercadolivre', webhookController.handleMlWebhook);
  router.get('/webhook/mercadolivre/test', webhookController.testWebhook);

  return router;
}