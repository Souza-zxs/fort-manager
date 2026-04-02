import axios, { AxiosInstance } from 'axios';
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
} from '../types/mercadolivre-types';

const BASE_URL = 'https://api.mercadolibre.com';
const SITE_ID  = 'MLB'; // Brasil

// ─────────────────────────────────────────────────────────────────────────────

export class MercadoLivreAdapter {
  private client: AxiosInstance;
  private credentials: MeliCredentials;

  constructor(credentials: MeliCredentials) {
    this.credentials = credentials;
    this.client = axios.create({ baseURL: BASE_URL });
    this._setupInterceptors();
  }

  // ── Configuração interna ──────────────────────────────────────────────────

  private _setupInterceptors() {
    // Injeta o Bearer token automaticamente em todas as requisições
    this.client.interceptors.request.use(async (config) => {
      if (this._isTokenExpired()) {
        await this.refreshToken();
      }
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
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    return data;
  }

  /**
   * Renova o access_token usando o refresh_token (tokens expiram em 6h)
   */
  async refreshToken(): Promise<MeliTokenResponse> {
    const { data } = await axios.post<MeliTokenResponse>(
      `${BASE_URL}/oauth/token`,
      new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     this.credentials.app_id,
        client_secret: this.credentials.client_secret,
        refresh_token: this.credentials.refresh_token,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    this.credentials.access_token  = data.access_token;
    this.credentials.refresh_token = data.refresh_token;
    this.credentials.expires_at    = new Date(Date.now() + data.expires_in * 1000);
    return data;
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
}