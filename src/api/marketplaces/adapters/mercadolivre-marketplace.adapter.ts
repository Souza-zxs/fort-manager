import axios from 'axios';
import { createHash, randomBytes } from 'crypto';
import { MercadoLivreAdapter } from './ml.adapter.js';
import { MarketplaceAdapter } from './marketplace.adapter.js';
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
  MarketplaceProduct,
} from '../types/marketplace.types.js';
import {
  MeliTokenResponse,
  MeliOrder,
  MeliOrderStatus,
  MeliAccountMovement,
  MeliItem,
} from '../types/mercadolivre-types.js';

const BASE_URL = 'https://api.mercadolibre.com';
const REFRESH_TOKEN_TTL_SECONDS = 15_552_000;

function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}
;

function mapMeliStatus(status: MeliOrderStatus): OrderStatus {
  switch (status) {
    case 'paid':      return 'COMPLETED';
    case 'cancelled': return 'CANCELLED';
    case 'confirmed': return 'READY_TO_SHIP';
    default:          return 'UNPAID';
  }
}

export class MercadoLivreMarketplaceAdapter implements MarketplaceAdapter {
  readonly marketplace: MarketplaceName = 'mercadolivre';

  private readonly appId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  private normalizeRelease = (raw: any): MarketplacePayment => {
  return {
    externalTransactionId: String(raw.id),
    orderId:               raw.source_id ? String(raw.source_id) : '',
    amount:                raw.amount,
    currency:              raw.currency_id,
    paymentMethod:         'mercado_pago',
    marketplaceFee:        raw.fee_amount ? Math.abs(raw.fee_amount) : 0,
    netAmount:             raw.net_credit_amount ?? raw.amount,
    status:                'COMPLETED' as PaymentStatus,
    transactionDate:       new Date(raw.date_created),
    description:           raw.type ?? '',
  };
};

  constructor() {
    this.appId =
      process.env.MELI_APP_ID ?? process.env.VITE_ML_CLIENT_ID ?? '';
    this.clientSecret =
      process.env.MELI_CLIENT_SECRET ?? process.env.VITE_ML_CLIENT_SECRET ?? '';
    this.redirectUri =
      process.env.MELI_REDIRECT_URI ?? process.env.VITE_ML_REDIRECT_URI ?? '';

    if (!this.appId || !this.clientSecret || !this.redirectUri) {
      throw new Error(
        'Missing Mercado Livre env: MELI_APP_ID, MELI_CLIENT_SECRET, MELI_REDIRECT_URI',
      );
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  // getAuthorizationUrl recebe o codeVerifier de fora
getAuthorizationUrl(state: string, codeVerifier: string): MarketplaceAuthorizationUrl {
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             this.appId,
    redirect_uri:          this.redirectUri,
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
  });

  return {
    url: `https://auth.mercadolivre.com.br/authorization?${params.toString()}`,
    state,
  };
}

// remove o parâmetro state — só codeVerifier importa
async exchangeCode(code: string, _shopId: string, codeVerifier?: string): Promise<MarketplaceTokenSet> {
    const body = new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     this.appId,
      client_secret: this.clientSecret,
      redirect_uri:  this.redirectUri,
      code,
    });

    if (codeVerifier) {
      body.set('code_verifier', codeVerifier);
    }

    const { data } = await axios.post<MeliTokenResponse>(
      `${BASE_URL}/oauth/token`,
      body,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const shopName = await this.fetchShopName(data.access_token, data.user_id);

    return {
      accessToken:           data.access_token,
      refreshToken:          data.refresh_token,
      accessTokenExpiresIn:  data.expires_in,
      refreshTokenExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
      shopId:                String(data.user_id),
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
  const offset   = ((params.pageNo ?? 1) - 1) * params.pageSize;
  const dateFrom = new Date(params.timeFrom * 1000).toISOString();
  const dateTo   = new Date(params.timeTo   * 1000).toISOString();

  const { data } = await axios.get(
    `${BASE_URL}/users/${shopId}/account/release/search`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        begin_date: dateFrom,
        end_date:   dateTo,
        offset,
        limit:      params.pageSize,
      },
    },
  );

  const results = data.results ?? [];

  return {
    items:   results.map(this.normalizeRelease),
    hasMore: results.length >= params.pageSize,
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


async getProducts(accessToken: string, shopId: string): Promise<MarketplaceProduct[]> {
  const adapter = this.buildMlAdapter(accessToken, shopId);
  const allIds: string[] = [];
  let offset = 0;
  const limit = 50;

  // 1. Coleta todos os IDs paginando
  while (true) {
    const result = await adapter.searchItems(Number(shopId), { offset, limit });
    allIds.push(...result.results);
    if (allIds.length >= result.paging.total) break;
    offset += limit;
  }

  // 2. Busca detalhes em lotes de 20 (limite do multiget ML)
  const products: MarketplaceProduct[] = [];
  for (let i = 0; i < allIds.length; i += 20) {
    const batch = await adapter.getItemsBatch(allIds.slice(i, i + 20));
    products.push(...batch.map(this.normalizeProduct));
  }

  return products;
}

private normalizeProduct = (raw: MeliItem): MarketplaceProduct => ({
  externalItemId:    raw.id,
  title:             raw.title,
  sku:               raw.seller_custom_field ?? '',
  categoryId:        raw.category_id,
  categoryName:      '',           // ML não retorna nome na listagem — buscaremos depois se necessário
  price:             raw.price,
  availableQuantity: raw.available_quantity,
  soldQuantity:      raw.sold_quantity,
  status:            raw.status as MarketplaceProduct['status'],
  thumbnail:         raw.thumbnail,
  permalink:         raw.permalink,
});

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



