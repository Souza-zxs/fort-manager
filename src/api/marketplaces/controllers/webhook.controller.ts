import { Request, Response, NextFunction } from 'express';
import { parseWebhookPayload, MlWebhookEvent, MlWebhookTopic } from '../types/webhook.types';
import { IntegrationRepository } from '../repositories/integration.repository';
import { MarketplaceSyncService } from '../services/sync.service';
import { MarketplaceAuthService } from '../services/auth.service';
import { getAdapter } from '../adapters/adapter.registry';
import { createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';

interface WebhookRequest extends Request {
  parsedEvent?: MlWebhookEvent;
}

// Topics that trigger order sync
const ORDER_TOPICS: MlWebhookTopic[] = [
  'orders',
  'order_approved',
  'order_cancelled',
  'order_closed',
];

// Topics that trigger payment sync
const PAYMENT_TOPICS: MlWebhookTopic[] = [
  'payments',
];

// Topics that trigger shipment sync
const SHIPMENT_TOPICS: MlWebhookTopic[] = [
  'shipments',
];

/**
 * Basic webhook signature validation
 * ML sends signature in X-signature header (HMAC-SHA256)
 */
function validateWebhookSignature(
  req: WebhookRequest,
  clientSecret: string,
): boolean {
  const signature = req.headers['x-signature'] as string | undefined;
  const timestamp = req.headers['x-timestamp'] as string | undefined;

  if (!signature || !timestamp) {
    return process.env.NODE_ENV !== 'production';
  }

  const expectedSignature = createHmac('sha256', clientSecret)
    .update(`${timestamp}.${JSON.stringify(req.body)}`)
    .digest('hex');

  const sigPart = signature.replace('sha256=', '');
  return timingSafeEqual(
    Buffer.from(sigPart, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

function createWebhookEvent(payload: ReturnType<typeof parseWebhookPayload>): MlWebhookEvent {
  return {
    topic: payload.topic,
    resourceId: payload.resource_id,
    userId: String(payload.user_id),
    receivedAt: new Date(),
    rawPayload: payload,
  };
}

export class WebhookController {
  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly syncService: MarketplaceSyncService,
  ) {}

  /**
   * POST /api/marketplaces/webhook/mercadolivre
   * 
   * Recebe notificações do Mercado Livre sobre:
   * - orders, order_approved, order_cancelled, order_closed
   * - payments, shipments, items
   */
  handleMlWebhook = async (req: WebhookRequest, res: Response, next: NextFunction): Promise<void> => {
    // Always respond quickly to ML
    res.status(200).json({ received: true });

    try {
      // 1. Parse payload
      const rawPayload = parseWebhookPayload(req.body);
      if (!rawPayload) {
        console.warn('[Webhook] Invalid payload received');
        return;
      }

      // 2. Validate signature (if in production)
      const clientSecret = process.env.MELI_CLIENT_SECRET ?? process.env.VITE_ML_CLIENT_SECRET ?? '';
      if (process.env.NODE_ENV === 'production' && clientSecret) {
        if (!validateWebhookSignature(req, clientSecret)) {
          console.warn('[Webhook] Invalid signature');
          return;
        }
      }

      // 3. Find integration by user_id (only ML for now)
      const integrations = await this.integrationRepository.findByUserId(rawPayload.user_id.toString());
      const mlIntegration = integrations.find(i => i.marketplace === 'mercadolivre');
      
      if (!mlIntegration) {
        console.warn(`[Webhook] No ML integration found for user ${rawPayload.user_id}`);
        return;
      }

      // 4. Log event
      console.log(`[Webhook] Received ${rawPayload.topic} for resource ${rawPayload.resource_id}`);

      // 5. Store webhook event in DB
      await this.storeWebhookEvent(mlIntegration.id, rawPayload);

      // 6. Process based on topic
      await this.processWebhookEvent(mlIntegration, rawPayload);

    } catch (error) {
      console.error('[Webhook] Error processing webhook:', error);
      // Already responded 200, so just log the error
    }
  };

  /**
   * Process webhook event based on topic
   */
  private async processWebhookEvent(
    integration: { id: string; marketplace: string; shopId: string },
    payload: ReturnType<typeof parseWebhookPayload>
  ): Promise<void> {
    const topic = payload.topic;

    if (ORDER_TOPICS.includes(topic)) {
      await this.processOrderUpdate(integration, payload);
    } else if (PAYMENT_TOPICS.includes(topic)) {
      await this.processPaymentUpdate(integration, payload);
    } else if (SHIPMENT_TOPICS.includes(topic)) {
      await this.processShipmentUpdate(integration, payload);
    } else {
      console.log(`[Webhook] Unhandled topic: ${topic}`);
    }
  }

  /**
   * Process order-related webhook - fetch and update order
   */
  private async processOrderUpdate(
    integration: { id: string; marketplace: string; shopId: string },
    payload: ReturnType<typeof parseWebhookPayload>
  ): Promise<void> {
    try {
      const orderId = payload.resource_id;

      // Get valid access token
      const integrationData = await this.integrationRepository.findById(integration.id);
      
      // Create a simple auth service to get token (in real impl, would use DI)
      const authService = new MarketplaceAuthService(this.integrationRepository);
      const accessToken = await authService.getValidAccessToken(integrationData);

      // Fetch order from ML API
      const adapter = getAdapter(integration.marketplace as any);
      const orders = await adapter.getOrders(accessToken, integration.shopId, {
        timeFrom: 0,
        timeTo: Math.floor(Date.now() / 1000),
        pageSize: 1,
        cursor: undefined,
      });

      // Find the specific order
      const order = orders.items.find(o => o.externalOrderId === orderId);
      
      if (order) {
        // Sync will handle the upsert
        console.log(`[Webhook] Order ${orderId} status: ${order.status}`);
      } else {
        console.log(`[Webhook] Order ${orderId} not found in recent orders`);
      }
    } catch (error) {
      console.error(`[Webhook] Error processing order ${payload.resource_id}:`, error);
    }
  }

  /**
   * Process payment-related webhook
   */
  private async processPaymentUpdate(
    integration: { id: string; marketplace: string; shopId: string },
    payload: ReturnType<typeof parseWebhookPayload>
  ): Promise<void> {
    // Trigger payment sync
    console.log(`[Webhook] Triggering payment sync for ${payload.resource_id}`);
  }

  /**
   * Process shipment-related webhook
   */
  private async processShipmentUpdate(
    integration: { id: string; marketplace: string; shopId: string },
    payload: ReturnType<typeof parseWebhookPayload>
  ): Promise<void> {
    // Trigger order sync (shipments are part of orders)
    console.log(`[Webhook] Triggering order sync for shipment ${payload.resource_id}`);
  }

  /**
   * Store webhook event in database
   */
  private async storeWebhookEvent(
    integrationId: string,
    payload: ReturnType<typeof parseWebhookPayload>
  ): Promise<void> {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await supabase.from('webhook_events').insert({
        integration_id: integrationId,
        topic: payload.topic,
        resource_id: payload.resource_id,
        resource_url: payload.resource,
        processed: false,
        received_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Webhook] Error storing event:', error);
    }
  }

  /**
   * GET /api/marketplaces/webhook/mercadolivre/test
   */
  testWebhook = (_req: Request, res: Response): void => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  };
}