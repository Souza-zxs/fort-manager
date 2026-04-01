import axios, { AxiosError } from "axios";

// ── Constantes ────────────────────────────────────────────────────────────────

/**
 * Domínio oficial de autenticação do Mercado Livre Brasil.
 * Ref: https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao
 */
const ML_AUTH_URL = "https://auth.mercadolivre.com.br/authorization";
const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token";
const ML_API_BASE  = "https://api.mercadolibre.com";

const API_BASE = (
  import.meta.env.VITE_API_URL?.trim() ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3001")
).replace(/\/$/, "");

const ACCESS_TOKEN_KEY  = "ml_access_token";
const REFRESH_TOKEN_KEY = "ml_refresh_token";
const EXPIRES_AT_KEY    = "ml_expires_at";
const USER_ID_KEY       = "ml_user_id";
const NICKNAME_KEY      = "ml_nickname";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface MeliTokenResponse {
  access_token:  string;
  token_type:    string;
  expires_in:    number;
  scope:         string;
  user_id:       number;
  refresh_token: string;
}

interface MeliUser {
  id:       number;
  nickname: string;
  email?:   string;
}

export interface MeliItem {
  id:         string;
  title:      string;
  price:      number;
  currency_id: string;
  available_quantity: number;
  status:     string;
  thumbnail:  string;
  permalink:  string;
}

interface MeliItemsSearchResult {
  seller_id: number;
  results:   string[];
  paging:    { total: number; offset: number; limit: number };
}

export interface MeliOrder {
  id:             number;
  status:         string;
  total_amount:   number;
  currency_id:    string;
  date_created:   string;
  date_closed:    string | null;
  buyer: {
    id:       number;
    nickname: string;
  };
  order_items: Array<{
    item: { id: string; title: string };
    quantity: number;
    unit_price: number;
  }>;
}

interface MeliOrdersSearchResult {
  query:   string;
  results: MeliOrder[];
  paging:  { total: number; offset: number; limit: number };
}

// ── Helpers internos ──────────────────────────────────────────────────────────

function getRequiredEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value || String(value).trim().length === 0) {
    throw new Error(`Variável de ambiente ${name} não configurada.`);
  }
  return String(value).trim();
}

function mlErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const body = err.response?.data as { message?: string; error?: string } | undefined;
    return body?.message ?? body?.error ?? err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

// ── OAuth ─────────────────────────────────────────────────────────────────────

/**
 * Gera a URL de autorização OAuth do Mercado Livre.
 * Parâmetros conforme documentação oficial:
 * https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao
 */
export function getMercadoLivreAuthUrl(state?: string): string {
  const clientId   = getRequiredEnv("VITE_ML_CLIENT_ID");
  const redirectUri = (
    import.meta.env.VITE_ML_REDIRECT_URI?.trim() ||
    `${window.location.origin}/integracoes`
  );

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     clientId,
    redirect_uri:  redirectUri,
  });

  if (state) params.set("state", state);

  return `${ML_AUTH_URL}?${params.toString()}`;
}

/**
 * Troca o authorization_code por access_token + refresh_token.
 *
 * POST /oauth/token
 * Body (application/x-www-form-urlencoded):
 *   grant_type=authorization_code
 *   client_id=<APP_ID>
 *   client_secret=<SECRET_KEY>
 *   code=<SERVER_GENERATED_AUTHORIZATION_CODE>
 *   redirect_uri=<REDIRECT_URI>
 */
export async function exchangeCodeForToken(code: string): Promise<void> {
  const clientId     = getRequiredEnv("VITE_ML_CLIENT_ID");
  const clientSecret = getRequiredEnv("VITE_ML_CLIENT_SECRET");
  const redirectUri  = (
    import.meta.env.VITE_ML_REDIRECT_URI?.trim() ||
    `${window.location.origin}/integracoes`
  );

  const params = new URLSearchParams({
    grant_type:    "authorization_code",
    client_id:     clientId,
    client_secret: clientSecret,
    code,
    redirect_uri:  redirectUri,
  });

  try {
    const { data } = await axios.post<MeliTokenResponse>(
      ML_TOKEN_URL,
      params,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );

    const expiresAt = Date.now() + data.expires_in * 1000;
    localStorage.setItem(ACCESS_TOKEN_KEY,  data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    localStorage.setItem(EXPIRES_AT_KEY,    String(expiresAt));
    localStorage.setItem(USER_ID_KEY,       String(data.user_id));
  } catch (err) {
    throw new Error(`Falha ao trocar code por token: ${mlErrorMessage(err)}`);
  }
}

/**
 * Renova o access_token usando o refresh_token.
 *
 * POST /oauth/token
 * Body (application/x-www-form-urlencoded):
 *   grant_type=refresh_token
 *   client_id=<APP_ID>
 *   client_secret=<SECRET_KEY>
 *   refresh_token=<REFRESH_TOKEN>
 */
export async function refreshAccessToken(): Promise<void> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) throw new Error("Refresh token não encontrado.");

  const clientId     = getRequiredEnv("VITE_ML_CLIENT_ID");
  const clientSecret = getRequiredEnv("VITE_ML_CLIENT_SECRET");

  const params = new URLSearchParams({
    grant_type:    "refresh_token",
    client_id:     clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  try {
    const { data } = await axios.post<MeliTokenResponse>(
      ML_TOKEN_URL,
      params,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );

    const expiresAt = Date.now() + data.expires_in * 1000;
    localStorage.setItem(ACCESS_TOKEN_KEY,  data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    localStorage.setItem(EXPIRES_AT_KEY,    String(expiresAt));
    localStorage.setItem(USER_ID_KEY,       String(data.user_id));
  } catch (err) {
    throw new Error(`Falha ao renovar token: ${mlErrorMessage(err)}`);
  }
}

// ── Usuário ───────────────────────────────────────────────────────────────────

export async function fetchCurrentUser(): Promise<MeliUser> {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const userId      = localStorage.getItem(USER_ID_KEY);

  if (!accessToken || !userId) {
    throw new Error("Token do Mercado Livre não encontrado.");
  }

  try {
    const { data } = await axios.get<MeliUser>(
      `${ML_API_BASE}/users/${userId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    localStorage.setItem(NICKNAME_KEY, data.nickname);
    return data;
  } catch (err) {
    throw new Error(`Falha ao consultar usuário: ${mlErrorMessage(err)}`);
  }
}

export function getStoredMercadoLivreAccount(): { userId: string; nickname: string } {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const userId      = localStorage.getItem(USER_ID_KEY);

  if (!accessToken || !userId) {
    return { userId: "", nickname: "" };
  }

  return {
    userId,
    nickname: localStorage.getItem(NICKNAME_KEY) ?? "",
  };
}

export function clearMercadoLivreSession(): void {
  [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, EXPIRES_AT_KEY, USER_ID_KEY, NICKNAME_KEY]
    .forEach((k) => localStorage.removeItem(k));
}

// ── Produtos ──────────────────────────────────────────────────────────────────

export async function fetchMercadoLivreItems(): Promise<MeliItem[]> {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const userId      = localStorage.getItem(USER_ID_KEY);

  if (!accessToken || !userId) {
    throw new Error("Token do Mercado Livre não encontrado.");
  }

  try {
    // 1. Busca IDs dos anúncios ativos
    const { data: search } = await axios.get<MeliItemsSearchResult>(
      `${API_BASE}/api/mercadolivre/items`,
      {
        params: { user_id: userId },
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!search.results?.length) return [];

    // 2. Busca detalhes em lote (máx 20 por chamada)
    const ids = search.results.slice(0, 20).join(",");
    const { data: items } = await axios.get<MeliItem[]>(
      `${ML_API_BASE}/items`,
      {
        params: { ids },
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    return items;
  } catch (err) {
    throw new Error(`Falha ao buscar produtos: ${mlErrorMessage(err)}`);
  }
}

export async function createMercadoLivreItem(itemData: Record<string, unknown>): Promise<string> {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (!accessToken) {
    throw new Error("Token do Mercado Livre não encontrado.");
  }

  try {
    const { data } = await axios.post<{ id: string }>(
      `${API_BASE}/api/mercadolivre/items`,
      itemData,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return data.id;
  } catch (err) {
    throw new Error(`Falha ao criar produto: ${mlErrorMessage(err)}`);
  }
}

export async function addMercadoLivreDescription(itemId: string, description: string): Promise<void> {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (!accessToken) {
    throw new Error("Token do Mercado Livre não encontrado.");
  }

  try {
    await axios.post(
      `${API_BASE}/api/mercadolivre/items/${itemId}/description`,
      { plain_text: description },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  } catch (err) {
    throw new Error(`Falha ao adicionar descrição: ${mlErrorMessage(err)}`);
  }
}

// ── Pedidos ───────────────────────────────────────────────────────────────────

export async function fetchMercadoLivreOrders(): Promise<MeliOrder[]> {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const userId      = localStorage.getItem(USER_ID_KEY);

  if (!accessToken || !userId) {
    throw new Error("Token do Mercado Livre não encontrado.");
  }

  try {
    const { data } = await axios.get<MeliOrdersSearchResult>(
      `${API_BASE}/api/mercadolivre/orders`,
      {
        params: { user_id: userId },
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return data.results ?? [];
  } catch (err) {
    throw new Error(`Falha ao buscar pedidos: ${mlErrorMessage(err)}`);
  }
}

// ── Endereços ─────────────────────────────────────────────────────────────────

export async function fetchMercadoLivreAddresses(): Promise<unknown[]> {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const userId      = localStorage.getItem(USER_ID_KEY);

  if (!accessToken || !userId) {
    throw new Error("Token do Mercado Livre não encontrado.");
  }

  try {
    const { data } = await axios.get<unknown[]>(
      `${API_BASE}/api/mercadolivre/user/${userId}/addresses`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return data;
  } catch (err) {
    throw new Error(`Falha ao buscar endereços: ${mlErrorMessage(err)}`);
  }
}
