import { MercadoLivreAdapter } from '../adapters/ml.adapter';
import {
  MeliItem,
  MeliCreateItemPayload,
  MeliUpdateItemPayload,
  MeliOrder,
  MeliPayment,
  MeliAccountMovement,
  MeliBalanceSummary,
} from '../types/mercadolivre-types';

// ─────────────────────────────────────────────────────────────────────────────
// Camada de repositório: orquestra chamadas ao adapter e expõe métodos
// orientados ao domínio da aplicação.
// ─────────────────────────────────────────────────────────────────────────────

export class MercadoLivreRepository {
  constructor(
    private readonly adapter: MercadoLivreAdapter,
    private readonly userId: number,
  ) {}

  // ── Anúncios ──────────────────────────────────────────────────────────────

  /**
   * Retorna TODOS os anúncios do vendedor, paginando automaticamente.
   * Status: 'active' | 'paused' | 'closed' | 'under_review' | 'inactive'
   */
  async getAllItems(status?: string): Promise<MeliItem[]> {
    const LIMIT = 50;
    let offset  = 0;
    let total   = Infinity;
    const ids: string[] = [];

    // Coleta todos os IDs primeiro
    while (offset < total) {
      const result = await this.adapter.searchItems(this.userId, {
        status,
        limit: LIMIT,
        offset,
      });
      total = result.paging.total;
      ids.push(...result.results);
      offset += LIMIT;
    }

    // Busca detalhes em lotes de 20 (limite do multiget)
    const items: MeliItem[] = [];
    for (let i = 0; i < ids.length; i += 20) {
      const batch = await this.adapter.getItemsBatch(ids.slice(i, i + 20));
      items.push(...batch);
    }
    return items;
  }

  async getItem(itemId: string): Promise<MeliItem> {
    return this.adapter.getItem(itemId);
  }

  async publishItem(payload: MeliCreateItemPayload): Promise<MeliItem> {
    return this.adapter.createItem(payload);
  }

  async editItem(itemId: string, changes: MeliUpdateItemPayload): Promise<MeliItem> {
    return this.adapter.updateItem(itemId, changes);
  }

  async pauseItem(itemId: string)    { return this.adapter.pauseItem(itemId); }
  async activateItem(itemId: string) { return this.adapter.activateItem(itemId); }
  async closeItem(itemId: string)    { return this.adapter.closeItem(itemId); }

  // ── Pedidos ───────────────────────────────────────────────────────────────

  /**
   * Pedidos num intervalo de datas (YYYY-MM-DD).
   * Pagina automaticamente até obter todos.
   */
  async getOrdersByDateRange(dateFrom: string, dateTo: string): Promise<MeliOrder[]> {
    const LIMIT = 50;
    let offset  = 0;
    let total   = Infinity;
    const orders: MeliOrder[] = [];

    while (offset < total) {
      const result = await this.adapter.searchOrders(this.userId, {
        date_created_from: `${dateFrom}T00:00:00.000-03:00`,
        date_created_to:   `${dateTo}T23:59:59.000-03:00`,
        limit:  LIMIT,
        offset,
      });
      total = result.paging.total;
      orders.push(...result.results);
      offset += LIMIT;
    }
    return orders;
  }

  async getOrder(orderId: number): Promise<MeliOrder> {
    return this.adapter.getOrder(orderId);
  }

  async getMe() {
    return this.adapter.getMe();
  }

  async getAddresses(): Promise<unknown[]> {
    return this.adapter.getUserAddresses(this.userId);
  }

  // ── Financeiro ────────────────────────────────────────────────────────────

  async getPayment(paymentId: string): Promise<MeliPayment> {
    return this.adapter.getPayment(paymentId);
  }

  /**
   * Extrato de movimentações (créditos e débitos) da conta.
   */
  async getMovements(dateFrom: string, dateTo: string): Promise<MeliAccountMovement[]> {
    const LIMIT = 50;
    let offset  = 0;
    const all: MeliAccountMovement[] = [];

    // A API não expõe total neste endpoint — itera até retornar menos de LIMIT
    while (true) {
      const batch = await this.adapter.getAccountMovements(this.userId, {
        date_from: dateFrom,
        date_to:   dateTo,
        limit:     LIMIT,
        offset,
      });
      all.push(...batch);
      if (batch.length < LIMIT) break;
      offset += LIMIT;
    }
    return all;
  }

  async getBalance(): Promise<MeliBalanceSummary> {
    return this.adapter.getBalance(this.userId);
  }

  /**
   * Resumo financeiro calculado a partir de um intervalo de pedidos.
   * Retorna faturamento bruto, taxa do ML, frete e líquido estimado.
   */
  async getFinancialSummary(dateFrom: string, dateTo: string) {
    const orders = await this.getOrdersByDateRange(dateFrom, dateTo);

    let grossRevenue  = 0;
    let totalFees     = 0;
    let totalShipping = 0;
    let unitsSold     = 0;

    for (const order of orders) {
      if (order.status !== 'paid' && order.status !== 'partially_paid') continue;

      grossRevenue  += order.total_amount;
      totalShipping += order.shipping_cost ?? 0;

      for (const item of order.order_items) {
        totalFees += item.sale_fee ?? 0;
        unitsSold += item.quantity;
      }
    }

    const netRevenue = grossRevenue - totalFees - totalShipping;

    return {
      dateFrom,
      dateTo,
      ordersTotal:   orders.length,
      paidOrders:    orders.filter((o) => o.status === 'paid').length,
      unitsSold,
      grossRevenue,
      totalFees,
      totalShipping,
      netRevenue,
    };
  }
}