import { getAdapter } from '../adapters/adapter.registry.js';
import { MarketplaceAuthService } from './auth.service.js';
import { IntegrationRepository } from '../repositories/integration.repository.js';
import { OrdersRepository } from '../repositories/orders.repository.js';
import { PaymentsRepository } from '../repositories/payments.repository.js';
import { SyncStateRepository } from '../repositories/sync-state.repository.js';
import { 
  Integration, 
  MarketplaceOrder, 
  MarketplacePayment, 
  CreateOrderDto, 
  CreatePaymentDto, 
  SyncResult,
  OrderStatus,
} from '../types/marketplace.types.js';
import { daysAgoUnix, nowUnix, unixToDate, dateToUnix } from '../shared/utils/index.js';

const SYNC_WINDOW_DAYS = 30;
const PAGE_SIZE = 50;

interface OrderSyncStats {
  inserted: number;
  updated: number;
  failed: number;
  errors: string[];
}

export class MarketplaceSyncService {
  constructor(
    private readonly authService: MarketplaceAuthService,
    private readonly integrationRepository: IntegrationRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly syncStateRepository: SyncStateRepository,
  ) {}

  async syncOrders(integrationId: string): Promise<SyncResult> {
    const integration = await this.integrationRepository.findById(integrationId);
    const errors: string[] = [];
    let ordersSynced = 0;
    let paymentsSynced = 0;

    try {
      ordersSynced = await this.syncIntegrationOrders(integration);
    } catch (error) {
      errors.push(`Orders: ${String(error)}`);
    }

    try {
      paymentsSynced = await this.syncIntegrationPayments(integration);
    } catch (error) {
      errors.push(`Payments: ${String(error)}`);
    }

    return {
      integrationId: integration.id,
      marketplace: integration.marketplace,
      shopId: integration.shopId,
      ordersSynced,
      paymentsSynced,
      errors,
      syncedAt: new Date(),
    };
  }

  async syncAllIntegrations(): Promise<SyncResult[]> {
    const integrations = await this.integrationRepository.findAllActive();
    return Promise.all(integrations.map((i) => this.syncOrders(i.id)));
  }

  /**
   * Sync orders with idempotency - handles updates correctly
   * Only fetches orders newer than last sync timestamp for efficiency
   */
  async syncIntegrationOrders(integration: Integration): Promise<number> {
    const accessToken = await this.authService.getValidAccessToken(integration);
    const adapter = getAdapter(integration.marketplace);

    // Get last sync timestamp for incremental sync
    const lastSyncAt = await this.getLastOrderSyncTimestamp(integration.id);

    // Fetch orders from the last sync (or default window if first sync)
    const timeFrom = lastSyncAt 
      ? dateToUnix(lastSyncAt) 
      : daysAgoUnix(SYNC_WINDOW_DAYS);

    const orders = await adapter.getAllOrders(accessToken, integration.shopId, {
      timeFrom,
      timeTo: nowUnix(),
      pageSize: PAGE_SIZE,
    });

    const stats = await this.upsertOrdersIdempotently(orders, integration.id);

    console.log(`[Sync] Orders for ${integration.marketplace}/${integration.shopId}: ` +
      `inserted=${stats.inserted}, updated=${stats.updated}, failed=${stats.failed}`);

    // Update last sync timestamp
    await this.updateLastOrderSyncTimestamp(integration.id, new Date());

    return stats.inserted + stats.updated;
  }

  /**
   * Upsert orders with idempotency - updates existing orders if changed
   * Returns stats for inserted/updated/failed
   */
  private async upsertOrdersIdempotently(
    orders: MarketplaceOrder[],
    integrationId: string
  ): Promise<OrderSyncStats> {
    const stats: OrderSyncStats = {
      inserted: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    for (const order of orders) {
      try {
        // Check if order exists
        const existing = await this.ordersRepository.findByExternalId(
          integrationId,
          order.externalOrderId
        );

        // Always upsert - handles both insert and update
        const dto = this.toOrderDto(order, integrationId);
        await this.ordersRepository.upsert(dto);

        if (existing) {
          // Check if status actually changed
          if (existing.status !== order.status) {
            stats.updated++;
            console.log(`[Sync] Order ${order.externalOrderId} status: ${existing.status} → ${order.status}`);
          } else {
            // Status unchanged - not counted as update (no actual change)
          }
        } else {
          stats.inserted++;
        }
      } catch (error) {
        stats.failed++;
        stats.errors.push(`${order.externalOrderId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return stats;
  }

  /**
   * Get last sync timestamp for incremental sync
   */
  private async getLastOrderSyncTimestamp(integrationId: string): Promise<Date | null> {
    return this.syncStateRepository.getLastSyncTimestamp(integrationId, 'orders');
  }

  /**
   * Update last sync timestamp
   */
  private async updateLastOrderSyncTimestamp(integrationId: string, timestamp: Date): Promise<void> {
    await this.syncStateRepository.upsertTimestamp(integrationId, 'orders', timestamp);
  }

  private async syncIntegrationPayments(integration: Integration): Promise<number> {
    const accessToken = await this.authService.getValidAccessToken(integration);
    const adapter = getAdapter(integration.marketplace);

    const payments = await adapter.getAllPayments(accessToken, integration.shopId, {
      timeFrom: daysAgoUnix(SYNC_WINDOW_DAYS),
      timeTo: nowUnix(),
      pageSize: PAGE_SIZE,
    });

    const dtos = payments.map((payment) => this.toPaymentDto(payment, integration.id));
    await this.paymentsRepository.upsertMany(dtos);

    return payments.length;
  }

  private toOrderDto(order: MarketplaceOrder, integrationId: string): CreateOrderDto {
    return {
      integrationId,
      externalOrderId: order.externalOrderId,
      status: order.status,
      totalAmount: order.totalAmount,
      currency: order.currency,
      buyerUsername: order.buyerUsername,
      shippingCarrier: order.shippingCarrier,
      trackingNumber: order.trackingNumber,
      paidAt: order.paidAt,
      orderCreatedAt: order.createdAt,
      orderUpdatedAt: order.updatedAt,
      items: order.items.map((item) => ({
        externalItemId: item.externalItemId,
        itemName: item.itemName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    };
  }

  private toPaymentDto(payment: MarketplacePayment, integrationId: string): CreatePaymentDto {
    return {
      integrationId,
      orderId: payment.orderId || null,
      externalTransactionId: payment.externalTransactionId,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      marketplaceFee: payment.marketplaceFee,
      netAmount: payment.netAmount,
      status: payment.status,
      transactionDate: payment.transactionDate,
      description: payment.description,
    };
  }
}




