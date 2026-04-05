import axios from 'axios';
import { MercadoLivreAdapter } from './ml.adapter';
import { MarketplaceAdapter } from './marketplace.adapter';
import {
  MarketplaceAuthorizationUrl,
  MarketplaceTokenSet,
  MarketplaceOrder,
  MarketplacePayment,
  MarketplaceOrdersParams,
  MarketplacePaymentsParams,
  MarketplacePaginatedResult,
  MarketplaceName,
  OrderStatus,
  PaymentStatus,
} from '../types/marketplace.types';
import {
  MeliTokenResponse,
  MeliOrder,
  MeliOrderStatus,
  MeliAccountMovement,
} from '../types/mercadolivre-types';

const BASE_URL = 'https://api.mercadolibre.com';

// ML access tokens duram 6h; refresh tokens duram ~180 dias
const REFRESH_TOKEN_TTL_SECONDS = 15_552_000;

function mapMeliStatus(status: MeliOrderStatus): OrderStatus {
  switch (status) {
    case 'paid':            return 'COMPLETED';
    case 'cancelled':       return 'CANCELLED';
    case 'confirmed':       return 'READY_TO_SHIP';
    default:                return 'UNPAID';
  }
}

export class MercadoLivreMarketplaceAdapter implements MarketplaceAdapter {
  readonly marketplace: MarketplaceName = 'mercadolivre';

  private readonly appId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    // Node carrega MELI_* no servidor; VITE_ML_* costuma existir no mesmo .env (fallback útil no dev)
    this.appId =
      process.env.MELI_APP_ID ?? process.env.VITE_ML_CLIENT_ID ?? '';
    this.clientSecret =
      process.env.MELI_CLIENT_SECRET ?? process.env.VITE_ML_CLIENT_SECRET ?? '';
    this.redirectUri =
      process.env.MELI_REDIRECT_URI ?? process.env.VITE_ML_REDIRECT_URI ?? '';

    if (!this.appId || !this.clientSecret || !this.redirectUri) {
      throw new Error(
        'Missing Mercado Livre env: MELI_APP_ID (ou VITE_ML_CLIENT_ID), MELI_CLIENT_SECRET (ou VITE_ML_CLIENT_SECRET), MELI_REDIRECT_URI (ou VITE_ML_REDIRECT_URI)',
      );
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  getAuthorizationUrl(state: string): MarketplaceAuthorizationUrl {
    return {
      url: MercadoLivreAdapter.getAuthUrl(this.appId, this.redirectUri, state),
      state,
    };
  }

  async exchangeCode(code: string): Promise<MarketplaceTokenSet> {
    const { data } = await axios.post<MeliTokenResponse>(
      `${BASE_URL}/oauth/token`,
      new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     this.appId,
        client_secret: this.clientSecret,
        redirect_uri:  this.redirectUri,
        code,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const shopName = await this.fetchShopName(data.access_token, data.user_id);

    return {
      accessToken:            data.access_token,
      refreshToken:           data.refresh_token,
      accessTokenExpiresIn:   data.expires_in,
      refreshTokenExpiresIn:  REFRESH_TOKEN_TTL_SECONDS,
      shopId:                 String(data.user_id),
      shopName,
    };
  }

  async refreshTokens(refreshToken: string, shopId: string): Promise<MarketplaceTokenSet> {
    const { data } = await axios.post<MeliTokenResponse>(
      `${BASE_URL}/oauth/token`,
      new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     this.appId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    return {
      accessToken:           data.access_token,
      refreshToken:          data.refresh_token,
      accessTokenExpiresIn:  data.expires_in,
      refreshTokenExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
      shopId:                String(data.user_id) || shopId,
      shopName:              '',
    };
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  async getOrders(
    accessToken: string,
    shopId: string,
    params: MarketplaceOrdersParams,
  ): Promise<MarketplacePaginatedResult<MarketplaceOrder>> {
    const adapter = this.buildMlAdapter(accessToken, shopId);
    const offset   = params.cursor ? Number(params.cursor) : 0;

    const result = await adapter.searchOrders(Number(shopId), {
      date_created_from: new Date(params.timeFrom * 1000).toISOString(),
      date_created_to:   new Date(params.timeTo * 1000).toISOString(),
      limit:             params.pageSize,
      offset,
    });

    const hasMore  = offset + result.paging.limit < result.paging.total;
    const nextOffset = offset + result.paging.limit;

    return {
      items:      result.results.map(this.normalizeOrder),
      hasMore,
      nextCursor: hasMore ? String(nextOffset) : undefined,
    };
  }

  async getAllOrders(
    accessToken: string,
    shopId: string,
    params: Omit<MarketplaceOrdersParams, 'cursor'>,
  ): Promise<MarketplaceOrder[]> {
    const all: MarketplaceOrder[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const result = await this.getOrders(accessToken, shopId, { ...params, cursor });
      all.push(...result.items);
      hasMore = result.hasMore;
      cursor  = result.nextCursor;
    }

    return all;
  }

  // ── Payments (movimentações da conta) ─────────────────────────────────────

  async getPayments(
    accessToken: string,
    shopId: string,
    params: MarketplacePaymentsParams,
  ): Promise<MarketplacePaginatedResult<MarketplacePayment>> {
    const adapter  = this.buildMlAdapter(accessToken, shopId);
    const offset   = ((params.pageNo ?? 1) - 1) * params.pageSize;
    const dateFrom = new Date(params.timeFrom * 1000).toISOString().substring(0, 10);
    const dateTo   = new Date(params.timeTo   * 1000).toISOString().substring(0, 10);

    const batch = await adapter.getAccountMovements(Number(shopId), {
      date_from: dateFrom,
      date_to:   dateTo,
      offset,
      limit:     params.pageSize,
    });

    return {
      items:   batch.map(this.normalizePayment),
      hasMore: batch.length >= params.pageSize,
    };
  }

  async getAllPayments(
    accessToken: string,
    shopId: string,
    params: MarketplacePaymentsParams,
  ): Promise<MarketplacePayment[]> {
    const all: MarketplacePayment[] = [];
    let pageNo = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.getPayments(accessToken, shopId, { ...params, pageNo });
      all.push(...result.items);
      hasMore = result.hasMore;
      pageNo += 1;
    }

    return all;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private buildMlAdapter(accessToken: string, shopId: string): MercadoLivreAdapter {
    return new MercadoLivreAdapter({
      app_id:        this.appId,
      client_secret: this.clientSecret,
      redirect_uri:  this.redirectUri,
      access_token:  accessToken,
      refresh_token: '',
      user_id:       Number(shopId),
      expires_at:    new Date(Date.now() + 3_600_000),
    });
  }

  private async fetchShopName(accessToken: string, userId: number): Promise<string> {
    try {
      const { data } = await axios.get<{ nickname: string }>(
        `${BASE_URL}/users/${userId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      return data.nickname;
    } catch {
      return '';
    }
  }

  private normalizeOrder = (raw: MeliOrder): MarketplaceOrder => ({
    externalOrderId: String(raw.id),
    status:          mapMeliStatus(raw.status),
    totalAmount:     raw.total_amount,
    currency:        raw.currency_id,
    buyerUsername:   raw.buyer.nickname,
    shippingCarrier: raw.shipping?.status ?? '',
    trackingNumber:  '',
    items: raw.order_items.map((item) => ({
      externalItemId: item.item.id,
      itemName:       item.item.title,
      sku:            item.item.seller_sku ?? '',
      quantity:       item.quantity,
      unitPrice:      item.unit_price,
      totalPrice:     item.unit_price * item.quantity,
    })),
    createdAt: new Date(raw.date_created),
    updatedAt: new Date(raw.last_updated),
    paidAt:    raw.date_closed ? new Date(raw.date_closed) : null,
  });

  private normalizePayment = (raw: MeliAccountMovement): MarketplacePayment => {
    const isCredit    = raw.type === 'creditPayment' || raw.type === 'creditRefund';
    const isFee       = raw.type === 'debitFee';
    const status: PaymentStatus = 'COMPLETED';

    return {
      externalTransactionId: raw.id,
      orderId:               raw.order_id ? String(raw.order_id) : '',
      amount:                raw.amount,
      currency:              raw.currency_id,
      paymentMethod:         'mercado_pago',
      marketplaceFee:        isFee ? Math.abs(raw.amount) : 0,
      netAmount:             isCredit ? raw.amount : 0,
      status,
      transactionDate:       new Date(raw.date),
      description:           raw.description,
    };
  };
}

export function createMercadoLivreMarketplaceAdapter(): MercadoLivreMarketplaceAdapter {
  return new MercadoLivreMarketplaceAdapter();
}
