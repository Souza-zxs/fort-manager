import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  MeliCredentials,
  MeliTokenResponse,
  MeliUser,
  MeliItem,
  MeliItemSearchResult,
  MeliCreateItemPayload,
  MeliUpdateItemPayload,
  MeliOrder,
  MeliOrderSearchResult,
  MeliPayment,
  MeliAccountMovement,
  MeliBalanceSummary,
  MeliShipment,
  MeliShipmentLabelResponse,
  MeliPaymentDetail,
  MeliRefundDetail,
  MeliItemVariation,
  MeliInventoryUpdate,
  MeliInventoryUpdateResponse,
  MeliItemWithVariations,
} from '../types/mercadolivre-types';

const BASE_URL = 'https://api.mercadolibre.com';
const SITE_ID  = 'MLB'; // Brasil

// Retry config for ML API
const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 5000;

// ─────────────────────────────────────────────────────────────────────────────

function isRetryableError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    // Retry on 429, 5xx, network errors
    return (
      status === 429 ||
      status === 503 ||
      status === 504 ||
      !status // Network error (no response)
    );
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('timeout') || msg.includes('econnrefused') || msg.includes('socket');
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MercadoLivreAdapter {
  private client: AxiosInstance;
  private credentials: MeliCredentials;

  constructor(credentials: MeliCredentials) {
    this.credentials = credentials;
    this.client = axios.create({ baseURL: BASE_URL, timeout: 30_000 });
    this._setupInterceptors();
  }

  // ── Configuração interna ──────────────────────────────────────────────────

  private _setupInterceptors() {
    // Injeta o Bearer token automaticamente em todas as requisições
    this.client.interceptors.request.use(async (config) => {
      // Retry refresh token if needed
      await this.refreshTokenWithRetry();
      config.headers['Authorization'] = `Bearer ${this.credentials.access_token}`;
      config.headers['Content-Type']  = 'application/json';
      return config;
    });

    // Trata erros globais
    this.client.interceptors.response.use(
      (res) => res,
      (err: { response?: { status?: number; data?: { message?: string } }; message?: string }) => {
        const msg = err.response?.data?.message ?? err.message ?? 'Unknown error';
        throw new Error(`[MercadoLivre] ${err.response?.status ?? 0}: ${msg}`);
      },
    );
  }

  /**
   * Refresh with retry for interceptor use
   */
  private async refreshTokenWithRetry(): Promise<void> {
    if (!this._isTokenExpired()) return;

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
      try {
        await this.refreshToken();
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!isRetryableError(error) || attempt === RETRY_MAX_ATTEMPTS) {
          throw lastError;
        }

        const delay = Math.min(
          RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1),
          RETRY_MAX_DELAY_MS
        );
        await sleep(delay);
      }
    }
    throw lastError;
  }

  private _isTokenExpired(): boolean {
    return new Date() >= new Date(this.credentials.expires_at);
  }

  // ── Auth ─────────────────────────────────────────────────────────────────

  /**
   * Gera a URL de autorização OAuth para redirecionar o usuário
   */
  static getAuthUrl(appId: string, redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: appId,
      redirect_uri: redirectUri,
      ...(state ? { state } : {}),
    });
    return `https://auth.mercadolivre.com.br/authorization?${params.toString()}`;
  }

  /**
   * Troca o authorization_code por access_token + refresh_token
   */
  static async exchangeCode(
    appId: string,
    clientSecret: string,
    redirectUri: string,
    code: string,
  ): Promise<MeliTokenResponse> {
    const { data } = await axios.post<MeliTokenResponse>(
      `${BASE_URL}/oauth/token`,
      new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     appId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        code,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30_000 },
    );
    return data;
  }

  /**
   * Renova o access_token usando o refresh_token (tokens expiram em 6h)
   * Com retry para API instável
   */
  async refreshToken(): Promise<MeliTokenResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
      try {
        const { data } = await axios.post<MeliTokenResponse>(
          `${BASE_URL}/oauth/token`,
          new URLSearchParams({
            grant_type:    'refresh_token',
            client_id:     this.credentials.app_id,
            client_secret: this.credentials.client_secret,
            refresh_token: this.credentials.refresh_token,
          }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30_000 },
        );

        this.credentials.access_token  = data.access_token;
        this.credentials.refresh_token = data.refresh_token;
        this.credentials.expires_at   = new Date(Date.now() + data.expires_in * 1000);
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!isRetryableError(error) || attempt === RETRY_MAX_ATTEMPTS) {
          throw lastError;
        }

        const delay = Math.min(
          RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1),
          RETRY_MAX_DELAY_MS
        );
        console.warn(`[ML] refreshToken attempt ${attempt} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }

    throw lastError;
  }

  // ── Usuário ───────────────────────────────────────────────────────────────

  async getMe(): Promise<MeliUser> {
    const { data } = await this.client.get<MeliUser>('/users/me');
    return data;
  }

  async getUserAddresses(userId: number): Promise<unknown[]> {
    const { data } = await this.client.get<unknown[]>(`/users/${userId}/addresses`);
    return data;
  }

  // ── Items / Anúncios ──────────────────────────────────────────────────────

  /**
   * Lista todos os IDs de anúncios do vendedor (paginado)
   */
  async searchItems(
    userId: number,
    params: { status?: string; offset?: number; limit?: number } = {},
  ): Promise<MeliItemSearchResult> {
    const { data } = await this.client.get<MeliItemSearchResult>(
      `/users/${userId}/items/search`,
      { params: { limit: 50, offset: 0, ...params } },
    );
    return data;
  }

  /**
   * Busca até 20 itens em uma única chamada (multiget)
   */
  async getItemsBatch(itemIds: string[]): Promise<MeliItem[]> {
    const ids = itemIds.slice(0, 20).join(',');
    const { data } = await this.client.get<Array<{ code: number; body: MeliItem }>>(
      `/items?ids=${ids}`,
    );
    return data.filter((r) => r.code === 200).map((r) => r.body);
  }

  /**
   * Busca um item específico
   */
  async getItem(itemId: string): Promise<MeliItem> {
    const { data } = await this.client.get<MeliItem>(`/items/${itemId}`);
    return data;
  }

  /**
   * Publica um novo anúncio
   */
  async createItem(payload: MeliCreateItemPayload): Promise<MeliItem> {
    const { data } = await this.client.post<MeliItem>('/items', payload);
    return data;
  }

  /**
   * Edita título, preço, estoque ou status de um anúncio
   */
  async updateItem(itemId: string, payload: MeliUpdateItemPayload): Promise<MeliItem> {
    const { data } = await this.client.put<MeliItem>(`/items/${itemId}`, payload);
    return data;
  }

  /**
   * Pausa um anúncio ativo
   */
  async pauseItem(itemId: string): Promise<void> {
    await this.updateItem(itemId, { status: 'paused' });
  }

  /**
   * Reativa um anúncio pausado
   */
  async activateItem(itemId: string): Promise<void> {
    await this.updateItem(itemId, { status: 'active' });
  }

  /**
   * Encerra (fecha) um anúncio
   */
  async closeItem(itemId: string): Promise<void> {
    await this.updateItem(itemId, { status: 'closed' });
  }

  // ── Inventário / Variações ─────────────────────────────────────────────────

  /**
   * Busca item completo com variações
   */
  async getItemWithVariations(itemId: string): Promise<MeliItemWithVariations> {
    const { data } = await this.client.get<MeliItemWithVariations>(
      `/items/${itemId}`,
      { params: { include: 'variations,attributes,pictures' } },
    );
    return data;
  }

  /**
   * Atualiza variação específica (preço/estoque)
   * IMPORTANTE: ML não permite atualizar diretamente. 
   * Deve usar PUT /items/{itemId}/variations/{variationId}
   */
  async updateVariation(
    itemId: string,
    variationId: number,
    payload: { price?: number; available_quantity?: number; seller_custom_field?: string },
  ): Promise<MeliItemVariation> {
    const { data } = await this.client.put<MeliItemVariation>(
      `/items/${itemId}/variations/${variationId}`,
      payload,
    );
    return data;
  }

  /**
   * Atualiza estoque de uma variação usando variação por attribute (SKU)
   * Busca variation_id pelo seller_custom_field (SKU)
   */
  async updateInventoryBySku(
    itemId: string,
    sku: string,
    updates: { price?: number; available_quantity?: number },
  ): Promise<MeliInventoryUpdateResponse> {
    // Primeiro, buscar o item para encontrar a variação pelo SKU
    const item = await this.getItemWithVariations(itemId);
    const variation = item.variations.find(v => v.seller_custom_field === sku);

    if (!variation) {
      throw new Error(`Variação com SKU "${sku}" não encontrada no item ${itemId}`);
    }

    const payload: any = {};
    if (updates.price !== undefined) payload.price = updates.price;
    if (updates.available_quantity !== undefined) payload.available_quantity = updates.available_quantity;

    const updated = await this.updateVariation(itemId, variation.id, payload);

    return {
      id: itemId,
      status: item.status,
      price: updated.price,
      available_quantity: updated.available_quantity,
      variations: item.variations,
    };
  }

  /**
   * Atualiza inventário em lote (até 200 por chamada)
   * Formato: Array de { item_id, variation_id?, price?, quantity? }
   */
  async bulkUpdateInventory(
    updates: Array<{
      item_id: string;
      variation_id?: number;
      price?: number;
      available_quantity?: number;
    }>,
  ): Promise<{ item_id: string; status: string; error?: string }[]> {
    const { data } = await this.client.put<Array<{ item_id: string; status: string; error?: string }>>(
      `/items/bulk`,
      { updates },
    );
    return data;
  }

  /**
   * Remove uma variação
   */
  async deleteVariation(itemId: string, variationId: number): Promise<void> {
    await this.client.delete(`/items/${itemId}/variations/${variationId}`);
  }

  // ── Pedidos ───────────────────────────────────────────────────────────────

  /**
   * Lista pedidos do vendedor por data (máx 50 por chamada)
   */
  async searchOrders(
    userId: number,
    params: {
      status?: string;
      date_created_from?: string;  // ISO8601
      date_created_to?: string;
      offset?: number;
      limit?: number;
    } = {},
  ): Promise<MeliOrderSearchResult> {
    const { data } = await this.client.get<MeliOrderSearchResult>(
      `/orders/search`,
      {
        params: {
          seller: userId,
          sort:   'date_desc',
          limit:  50,
          offset: 0,
          ...params,
        },
      },
    );
    return data;
  }

  /**
   * Detalhes de um pedido específico
   */
  async getOrder(orderId: number): Promise<MeliOrder> {
    const { data } = await this.client.get<MeliOrder>(`/orders/${orderId}`);
    return data;
  }

  // ── Financeiro ────────────────────────────────────────────────────────────

  /**
   * Detalhes de um pagamento (via Mercado Pago)
   */
  async getPayment(paymentId: string): Promise<MeliPayment> {
    const { data } = await this.client.get<MeliPayment>(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
    );
    return data;
  }

  /**
   * Extrato de movimentações da conta do vendedor
   * date_from / date_to: formato YYYY-MM-DD
   */
  async getAccountMovements(
    userId: number,
    params: { date_from?: string; date_to?: string; offset?: number; limit?: number } = {},
  ): Promise<MeliAccountMovement[]> {
    const { data } = await this.client.get<{ results: MeliAccountMovement[] }>(
      `/users/${userId}/mercadopago_account/movements`,
      { params: { limit: 50, offset: 0, ...params } },
    );
    return data.results;
  }

  /**
   * Saldo disponível na conta do vendedor
   */
  async getBalance(userId: number): Promise<MeliBalanceSummary> {
    const { data } = await this.client.get<MeliBalanceSummary>(
      `/users/${userId}/mercadopago_account/balance`,
    );
    return data;
  }

  /**
   * Taxa de venda para um tipo de anúncio + categoria
   */
  async getListingFee(
    listingTypeId: string,
    categoryId: string,
    price: number,
  ): Promise<number> {
    const { data } = await this.client.get<Array<{ sale_fee_amount: number }>>(
      `/sites/${SITE_ID}/listing_prices`,
      { params: { price, listing_type_id: listingTypeId, category_id: categoryId, currency_id: 'BRL' } },
    );
    return data[0]?.sale_fee_amount ?? 0;
  }

  // ── Shipments / Envios ─────────────────────────────────────────────────────

  /**
   * Busca dados de um envio específico
   */
  async getShipment(shipmentId: number): Promise<MeliShipment> {
    const { data } = await this.client.get<MeliShipment>(`/shipments/${shipmentId}`);
    return data;
  }

  /**
   * Lista opções de envio disponíveis para uma região
   */
  async getShippingOptions(
    dimensions: { weight: number; height: number; width: number },
    postalCodeFrom: string,
    postalCodeTo: string,
  ): Promise<{
    options: Array<{ id: number; name: string; currency_id: string; cost: number; delivery_type: string }>;
  }> {
    const { data } = await this.client.get<{
      options: Array<{ id: number; name: string; currency_id: string; cost: number; delivery_type: string }>;
    }>(
      `/shipping_options`,
      {
        params: {
          weight: dimensions.weight,
          height: dimensions.height,
          width: dimensions.width,
          postal_code_from: postalCodeFrom,
          postal_code_to: postalCodeTo,
        },
      },
    );
    return data;
  }

  /**
   * Gera etiqueta de envio (PDF)
   * Requer que o pedido esteja com status 'approved'
   */
  async createShipmentLabel(orderId: number): Promise<MeliShipmentLabelResponse> {
    const { data } = await this.client.post<{ id: number }[]>(
      `/shipments.labels`,
      { orders: [orderId] },
    );

    if (!data || data.length === 0) {
      throw new Error('Falha ao gerar etiqueta');
    }

    // Busca os dados do shipment para obter a URL da etiqueta
    const shipmentId = data[0].id;
    const shipment = await this.getShipment(shipmentId);

    return {
      shipment_id: shipment.id,
      tracking_number: shipment.tracking_number ?? '',
      tracking_method: shipment.tracking_method ?? '',
      label_url: `https://api.mercadolibre.com/shipments/${shipmentId}/label`,
      label_format: 'pdf',
    };
  }

  /**
   * Atualiza código de rastreamento manualmente
   * Útil quando a transportadora fornece outro código
   */
  async updateTrackingNumber(shipmentId: number, trackingNumber: string): Promise<MeliShipment> {
    const { data } = await this.client.put<MeliShipment>(
      `/shipments/${shipmentId}`,
      { tracking_number: trackingNumber },
    );
    return data;
  }

  /**
   * Cancela um envio (se ainda não foi postado)
   */
  async cancelShipment(shipmentId: number): Promise<{ cancellation: boolean }> {
    const { data } = await this.client.put<{ cancellation: boolean }>(
      `/shipments/${shipmentId}`,
      { status: 'cancelled' },
    );
    return data;
  }

  // ── Payments / Pagamentos ─────────────────────────────────────────────────

  /**
   * Busca detalhes de um pagamento específico (via Mercado Pago API)
   */
  async getPaymentDetail(paymentId: string): Promise<MeliPaymentDetail> {
    const { data } = await this.client.get<MeliPaymentDetail>(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
    );
    return data;
  }

  /**
   * Lista pagamentos de um pedido
   */
  async getOrderPayments(orderId: number): Promise<MeliPaymentDetail[]> {
    const { data } = await this.client.get<MeliPaymentDetail[]>(
      `/orders/${orderId}/payments`,
    );
    return data;
  }

  /**
   * Lista estornos de um pagamento
   */
  async getPaymentRefunds(paymentId: string): Promise<MeliRefundDetail[]> {
    const { data } = await this.client.get<MeliRefundDetail[]>(
      `https://api.mercadopago.com/v1/payments/${paymentId}/refunds`,
    );
    return data;
  }

  /**
   * Lista todos os estornos ( chargebacks)
   */
  async getRefunds(params: {
    offset?: number;
    limit?: number;
    range_date_created?: string;
  } = {}): Promise<{
    results: MeliRefundDetail[];
    paging: { total: number; limit: number; offset: number };
  }> {
    const { data } = await this.client.get<{
      results: MeliRefundDetail[];
      paging: { total: number; limit: number; offset: number };
    }>(
      `/collections/search`,
      { params: { status: 'refunded', ...params } },
    );
    return data;
  }

  /**
   * Verifica se houve chargeback (estorno forçado pelo cliente)
   */
  async hasChargeback(paymentId: string): Promise<boolean> {
    const refunds = await this.getPaymentRefunds(paymentId);
    return refunds.some(r => r.reason === 'chargeback');
  }
}

