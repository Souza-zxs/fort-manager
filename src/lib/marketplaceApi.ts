import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { supabase } from './supabase';

const http = axios.create({
  baseURL: `/api/marketplaces`,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Erro tipado ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Helpers internos ──────────────────────────────────────────────────────────

async function getToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new ApiError('Sessão expirada. Faça login para continuar.', 401);
  }
  return session.access_token;
}

/** Evita crash quando o servidor devolve HTML, objeto ou null em vez de JSON array. */
function ensureJsonArray<T>(value: string): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Resposta de auth-url deve ser JSON { url, state }. HTML (404 SPA) ou {} quebra o OAuth
 * e `window.location.href = undefined` vira navegação para /undefined.
 */
function parseAuthUrlDto(raw: string): AuthUrlDto {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ApiError(
      'Resposta inválida ao pedir URL de autorização. Confirme se o backend Express está no ar em /api/marketplaces (deploy da API, não só o front estático).',
      502,
    );
  }
  const o = raw as Record<string, string>;
  const url = o.url;
  const state = o.state;
  const isHttpUrl =
    typeof url === 'string' &&
    url.length > 0 &&
    (url.startsWith('https://') || url.startsWith('http://'));
  if (!isHttpUrl) {
    throw new ApiError(
      'URL de autorização ausente ou inválida. No servidor, configure MELI_APP_ID, MELI_CLIENT_SECRET e MELI_REDIRECT_URI (ou equivalentes VITE_ML_*).',
      502,
    );
  }
  if (typeof state !== 'string' || state.length === 0) {
    throw new ApiError('Resposta do servidor sem state OAuth. Tente conectar novamente.', 502);
  }
  return { url, state };
}

async function request<T>(
  path: string,
  config: AxiosRequestConfig = {},
  requireAuth = true,
): Promise<T> {
  const extraHeaders: Record<string, string> = {};

  if (requireAuth) {
    extraHeaders['Authorization'] = `Bearer ${await getToken()}`;
  }

  try {
    const { data } = await http.request<T>({
      url: path,
      ...config,
      headers: {
        ...extraHeaders,
        ...(config.headers as Record<string, string>),
      },
    });
    return data;
  } catch (err) {
    if (err instanceof AxiosError) {
      const status = err.response?.status ?? 0;
      const body = err.response?.data as { error?: string; message?: string };
      throw new ApiError(body?.error ?? body?.message ?? err.message, status);
    }
    throw err;
  }
}

// ── DTOs / contratos ──────────────────────────────────────────────────────────

export interface IntegrationDto {
  id: string;
  marketplace: string;
  shopName: string;
  shopId: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthUrlDto {
  url: string;
  state: string;
}

export interface CallbackResultDto {
  id: string;
  marketplace: string;
  shopName: string;
  shopId: string;
}

export interface SyncResultDto {
  integrationId: string;
  marketplace: string;
  shopId: string;
  ordersSynced: number;
  paymentsSynced: number;
  errors: string[];
  syncedAt: string;
}

export interface FinanceSummaryDto {
  totalRevenue: number;
  totalFees: number;
  totalNetAmount: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  currency: string;
  period: { from: string; to: string };
}

export interface OrderDto {
  id: string;
  integrationId: string;
  externalOrderId: string;
  status: string;
  totalAmount: number;
  currency: string;
  buyerUsername: string;
  shippingCarrier: string;
  trackingNumber: string;
  paidAt: string;
  orderCreatedAt: string;
  orderUpdatedAt: string;
  syncedAt: string;
  createdAt: string;
  marketplace: string;
}

// ── API pública ────────────────────────────────────────────────────────────────

export const marketplaceApi = {
  /** Obtém a URL de autorização OAuth do ML/Shopee. Não exige login. */
  getAuthUrl(marketplace: string): Promise<AuthUrlDto> {
    const m = encodeURIComponent(marketplace);
    return request<string>(`/integrations/${m}/auth-url`, {}, false).then(parseAuthUrlDto);
  },

  /**
   * Envia o code OAuth ao backend para trocar por access_token + refresh_token
   * e persistir a integração no Supabase.
   */
  handleCallback(marketplace: string, code: string, shopId?: string): Promise<CallbackResultDto> {
    const params = new URLSearchParams({ code });
    if (shopId) params.set('shop_id', shopId);
    const m = encodeURIComponent(marketplace);
    return request<CallbackResultDto>(
      `/integrations/${m}/callback?${params.toString()}`,
    );
  },

  /** Lista todas as integrações ativas do usuário logado. */
  listIntegrations(): Promise<IntegrationDto[]> {
    return request<unknown>('/integrations').then(ensureJsonArray<IntegrationDto>);
  },

  /** Desconecta (desativa) uma integração. */
  disconnect(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/integrations/${id}`, { method: 'DELETE' });
  },

  /** Dispara sincronização de pedidos e pagamentos para uma integração. */
  triggerSync(id: string): Promise<SyncResultDto> {
    return request<SyncResultDto>(`/integrations/${id}/sync`, { method: 'POST' }).then((raw) => {
      if (!raw || typeof raw !== 'object') {
        return {
          integrationId: '',
          marketplace: 'mercadolivre',
          shopId: '',
          ordersSynced: 0,
          paymentsSynced: 0,
          errors: [],
          syncedAt: new Date().toISOString(),
        };
      }
      const o = raw as SyncResultDto;
      return { ...o, errors: Array.isArray(o.errors) ? o.errors : [] };
    });
  },

  /** Lista pedidos (todos ou filtrados por integração). */
  getOrders(integrationId?: string): Promise<OrderDto[]> {
    const path = integrationId ? `/orders/${integrationId}` : '/orders';
    return request<unknown>(path).then(ensureJsonArray<OrderDto>);
  },

  /** Resumo financeiro do período. */
  getFinanceSummary(from?: Date, to?: Date): Promise<FinanceSummaryDto> {
    const params = new URLSearchParams();
    if (from) params.set('from', from.toISOString());
    if (to)   params.set('to',   to.toISOString());
    const q = params.toString() ? `?${params.toString()}` : '';
    return request<FinanceSummaryDto>(`/finance/summary${q}`);
  },
} as const;

// ── Helpers OAuth (localStorage) ──────────────────────────────────────────────

const OAUTH_STATE_PREFIX = 'oauth_state_';

/** Persiste o marketplace associado ao state OAuth antes do redirect. */
export function storeOAuthState(state: string, marketplace: string): string{
    localStorage.setItem(`${OAUTH_STATE_PREFIX}${state}`, marketplace);
    return marketplace;
  }

/** Recupera (e remove) o marketplace associado ao state OAuth após o redirect. */
export function consumeOAuthState(state: string): string {
  const key   = `${OAUTH_STATE_PREFIX}${state}`;
  const value = localStorage.getItem(key);
  if (value) localStorage.removeItem(key);
  return value;
}
