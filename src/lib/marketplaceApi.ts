import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { supabase } from './supabase';

// ── Base URL ──────────────────────────────────────────────────────────────────

const API_BASE = (
  import.meta.env.VITE_API_URL?.trim() ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')
).replace(/\/$/, '');

const http = axios.create({
  baseURL: `${API_BASE}/api/marketplaces`,
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
        ...(config.headers as Record<string, string> | undefined),
      },
    });
    return data;
  } catch (err) {
    if (err instanceof AxiosError) {
      const status = err.response?.status ?? 0;
      const body = err.response?.data as { error?: string; message?: string } | undefined;
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
  paidAt: string | null;
  orderCreatedAt: string;
  orderUpdatedAt: string;
  syncedAt: string;
  createdAt: string;
}

// ── API pública ────────────────────────────────────────────────────────────────

export const marketplaceApi = {
  /** Obtém a URL de autorização OAuth do ML/Shopee. Não exige login. */
  getAuthUrl(marketplace: string): Promise<AuthUrlDto> {
    return request<AuthUrlDto>(`/integrations/${marketplace}/auth-url`, {}, false);
  },

  /**
   * Envia o code OAuth ao backend para trocar por access_token + refresh_token
   * e persistir a integração no Supabase.
   */
  handleCallback(marketplace: string, code: string, shopId?: string): Promise<CallbackResultDto> {
    const params = new URLSearchParams({ code });
    if (shopId) params.set('shop_id', shopId);
    return request<CallbackResultDto>(
      `/integrations/${marketplace}/callback?${params.toString()}`,
    );
  },

  /** Lista todas as integrações ativas do usuário logado. */
  listIntegrations(): Promise<IntegrationDto[]> {
    return request<IntegrationDto[]>('/integrations');
  },

  /** Desconecta (desativa) uma integração. */
  disconnect(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/integrations/${id}`, { method: 'DELETE' });
  },

  /** Dispara sincronização de pedidos e pagamentos para uma integração. */
  triggerSync(id: string): Promise<SyncResultDto> {
    return request<SyncResultDto>(`/integrations/${id}/sync`, { method: 'POST' });
  },

  /** Lista pedidos (todos ou filtrados por integração). */
  getOrders(integrationId?: string): Promise<OrderDto[]> {
    const path = integrationId ? `/orders/${integrationId}` : '/orders';
    return request<OrderDto[]>(path);
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
export function storeOAuthState(state: string, marketplace: string): void {
  localStorage.setItem(`${OAUTH_STATE_PREFIX}${state}`, marketplace);
}

/** Recupera (e remove) o marketplace associado ao state OAuth após o redirect. */
export function consumeOAuthState(state: string): string | null {
  const key   = `${OAUTH_STATE_PREFIX}${state}`;
  const value = localStorage.getItem(key);
  if (value) localStorage.removeItem(key);
  return value;
}
