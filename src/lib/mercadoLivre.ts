const ML_AUTH_BASE = import.meta.env.VITE_ML_AUTH_URL?.trim() || "https://auth.mercadolibre.com/authorization";
// Se VITE_API_URL não estiver definido, usa a mesma origem (funciona na Vercel)
const API_BASE = import.meta.env.VITE_API_URL?.trim() || (typeof window !== 'undefined' ? window.location.origin : "http://localhost:3001");

const ACCESS_TOKEN_KEY = "ml_access_token";
const REFRESH_TOKEN_KEY = "ml_refresh_token";
const EXPIRES_AT_KEY = "ml_expires_at";
const USER_ID_KEY = "ml_user_id";
const NICKNAME_KEY = "ml_nickname";

interface MercadoLivreTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
}

interface MercadoLivreUser {
  id: number;
  nickname: string;
}

function getRequiredEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value || String(value).trim().length === 0) {
    throw new Error(`Variavel ${name} nao configurada.`);
  }

  return String(value).trim();
}

export function getMercadoLivreAuthUrl(): string {
  const clientId = getRequiredEnv("VITE_ML_CLIENT_ID");
  const redirectUri = import.meta.env.VITE_ML_REDIRECT_URI?.trim() || `${window.location.origin}/integracoes`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    // Solicitar permissões necessárias
    scope: "offline_access read write",
  });

  return `${ML_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<void> {
  const clientId = getRequiredEnv("VITE_ML_CLIENT_ID");
  const clientSecret = getRequiredEnv("VITE_ML_CLIENT_SECRET");
  const redirectUri = import.meta.env.VITE_ML_REDIRECT_URI?.trim() || `${window.location.origin}/integracoes`;

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao gerar token do Mercado Livre: ${errorText || response.status}`);
  }

  const data = (await response.json()) as MercadoLivreTokenResponse;
  const expiresAt = Date.now() + data.expires_in * 1000;

  localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
  localStorage.setItem(USER_ID_KEY, String(data.user_id));
}

export async function fetchCurrentUser(): Promise<MercadoLivreUser> {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const userId = localStorage.getItem(USER_ID_KEY);

  if (!accessToken || !userId) {
    throw new Error("Token do Mercado Livre nao encontrado.");
  }

  const response = await fetch(`https://api.mercadolibre.com/users/${userId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao consultar usuario Mercado Livre: ${errorText || response.status}`);
  }

  const data = (await response.json()) as MercadoLivreUser;
  localStorage.setItem(NICKNAME_KEY, data.nickname);

  return data;
}

export function getStoredMercadoLivreAccount(): { userId: string; nickname: string | null } | null {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const userId = localStorage.getItem(USER_ID_KEY);

  if (!accessToken || !userId) {
    return null;
  }

  return { userId, nickname: localStorage.getItem(NICKNAME_KEY) };
}

export function clearMercadoLivreSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(NICKNAME_KEY);
}

export async function fetchMercadoLivreItems(): Promise<any> {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const userId = localStorage.getItem(USER_ID_KEY);

  if (!accessToken || !userId) {
    throw new Error("Token do Mercado Livre nao encontrado.");
  }

  const response = await fetch(`${API_BASE}/api/mercadolivre/items?user_id=${userId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(`Falha ao buscar produtos: ${errorData.error || response.status}`);
  }

  return response.json();
}

export async function fetchMercadoLivreOrders(): Promise<any> {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const userId = localStorage.getItem(USER_ID_KEY);

  if (!accessToken || !userId) {
    throw new Error("Token do Mercado Livre nao encontrado.");
  }

  const response = await fetch(`${API_BASE}/api/mercadolivre/orders?user_id=${userId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(`Falha ao buscar pedidos: ${errorData.error || response.status}`);
  }

  return response.json();
}

export async function createMercadoLivreItem(itemData: any): Promise<any> {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (!accessToken) {
    throw new Error("Token do Mercado Livre nao encontrado.");
  }

  const response = await fetch("https://api.mercadolibre.com/items", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(itemData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(`Falha ao criar produto: ${errorData.error || response.status}`);
  }

  return response.json();
}

export async function fetchMercadoLivreAddresses(): Promise<any> {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const userId = localStorage.getItem(USER_ID_KEY);

  if (!accessToken || !userId) {
    throw new Error("Token do Mercado Livre nao encontrado.");
  }

  const response = await fetch(`https://api.mercadolibre.com/users/${userId}/addresses`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao buscar enderecos: ${errorText || response.status}`);
  }

  return response.json();
}

export async function addMercadoLivreDescription(itemId: string, description: string): Promise<any> {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (!accessToken) {
    throw new Error("Token do Mercado Livre nao encontrado.");
  }

  const response = await fetch(`https://api.mercadolibre.com/items/${itemId}/description`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plain_text: description }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao adicionar descricao: ${errorText || response.status}`);
  }

  return response.json();
}
