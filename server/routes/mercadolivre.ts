import express from 'express';
import axios, { AxiosError } from 'axios';

const router = express.Router();
const ML_API_BASE = 'https://api.mercadolibre.com';

// ── Helper ────────────────────────────────────────────────────────────────────

function mlErrorStatus(err: unknown): { status: number; message: string } {
  if (err instanceof AxiosError) {
    const body = err.response?.data as { message?: string; error?: string } | undefined;
    return {
      status:  err.response?.status ?? 500,
      message: body?.message ?? body?.error ?? err.message,
    };
  }
  return { status: 500, message: err instanceof Error ? err.message : String(err) };
}

// ── Token exchange ────────────────────────────────────────────────────────────

/**
 * POST /api/mercadolivre/token
 *
 * Troca o authorization_code por access_token + refresh_token.
 * Parâmetros conforme doc oficial:
 * https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao
 */
router.post('/token', async (req, res) => {
  const { code, redirect_uri } = req.body as { code?: string; redirect_uri?: string };

  if (!code) {
    return res.status(400).json({ error: 'Parâmetro "code" é obrigatório' });
  }

  const clientId     = process.env.MELI_APP_ID     || process.env.VITE_ML_CLIENT_ID;
  const clientSecret = process.env.MELI_CLIENT_SECRET || process.env.VITE_ML_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Credenciais do Mercado Livre não configuradas' });
  }

  const resolvedRedirectUri =
    redirect_uri ||
    process.env.MELI_REDIRECT_URI ||
    process.env.VITE_ML_REDIRECT_URI ||
    '';

  const params = new URLSearchParams({
    grant_type:    'authorization_code',
    client_id:     clientId,
    client_secret: clientSecret,
    code,
    redirect_uri:  resolvedRedirectUri,
  });

  try {
    const { data } = await axios.post(
      `${ML_API_BASE}/oauth/token`,
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30_000 },
    );
    return res.json(data);
  } catch (err) {
    const { status, message } = mlErrorStatus(err);
    console.error('[ML] Token exchange error:', message);
    return res.status(status).json({ error: message });
  }
});

// ── Refresh token ─────────────────────────────────────────────────────────────

/**
 * POST /api/mercadolivre/token/refresh
 *
 * Renova o access_token usando o refresh_token.
 */
router.post('/token/refresh', async (req, res) => {
  const { refresh_token } = req.body as { refresh_token?: string };

  if (!refresh_token) {
    return res.status(400).json({ error: 'Parâmetro "refresh_token" é obrigatório' });
  }

  const clientId     = process.env.MELI_APP_ID        || process.env.VITE_ML_CLIENT_ID;
  const clientSecret = process.env.MELI_CLIENT_SECRET || process.env.VITE_ML_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Credenciais do Mercado Livre não configuradas' });
  }

  const params = new URLSearchParams({
    grant_type:    'refresh_token',
    client_id:     clientId,
    client_secret: clientSecret,
    refresh_token,
  });

  try {
    const { data } = await axios.post(
      `${ML_API_BASE}/oauth/token`,
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30_000 },
    );
    return res.json(data);
  } catch (err) {
    const { status, message } = mlErrorStatus(err);
    console.error('[ML] Token refresh error:', message);
    return res.status(status).json({ error: message });
  }
});

// ── Usuário ───────────────────────────────────────────────────────────────────

router.get('/user/:userId', async (req, res) => {
  const { userId }    = req.params;
  const accessToken   = req.headers.authorization?.replace('Bearer ', '');

  if (!accessToken) {
    return res.status(401).json({ error: 'Token de acesso não fornecido' });
  }

  try {
    const { data } = await axios.get(
      `${ML_API_BASE}/users/${userId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return res.json(data);
  } catch (err) {
    const { status, message } = mlErrorStatus(err);
    return res.status(status).json({ error: message });
  }
});

router.get('/user/:userId/addresses', async (req, res) => {
  const { userId }  = req.params;
  const accessToken = req.headers.authorization?.replace('Bearer ', '');

  if (!accessToken) {
    return res.status(401).json({ error: 'Token de acesso não fornecido' });
  }

  try {
    const { data } = await axios.get(
      `${ML_API_BASE}/users/${userId}/addresses`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return res.json(data);
  } catch (err) {
    const { status, message } = mlErrorStatus(err);
    return res.status(status).json({ error: message });
  }
});

// ── Anúncios ──────────────────────────────────────────────────────────────────

router.get('/items', async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  const userId      = req.query['user_id'] as string | undefined;

  if (!accessToken) {
    return res.status(401).json({ error: 'Token de acesso não fornecido' });
  }
  if (!userId) {
    return res.status(400).json({ error: 'Parâmetro "user_id" é obrigatório' });
  }

  try {
    const { data } = await axios.get(
      `${ML_API_BASE}/users/${userId}/items/search`,
      {
        params: { status: 'active', limit: 50 },
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return res.json(data);
  } catch (err) {
    const { status, message } = mlErrorStatus(err);
    return res.status(status).json({ error: message });
  }
});

router.post('/items', async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');

  if (!accessToken) {
    return res.status(401).json({ error: 'Token de acesso não fornecido' });
  }

  try {
    const { data } = await axios.post(
      `${ML_API_BASE}/items`,
      req.body,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return res.json(data);
  } catch (err) {
    const { status, message } = mlErrorStatus(err);
    console.error('[ML] Create item error:', message);
    return res.status(status).json({ error: message });
  }
});

router.post('/items/:itemId/description', async (req, res) => {
  const { itemId }  = req.params;
  const accessToken = req.headers.authorization?.replace('Bearer ', '');

  if (!accessToken) {
    return res.status(401).json({ error: 'Token de acesso não fornecido' });
  }

  try {
    const { data } = await axios.post(
      `${ML_API_BASE}/items/${itemId}/description`,
      req.body,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return res.json(data);
  } catch (err) {
    const { status, message } = mlErrorStatus(err);
    return res.status(status).json({ error: message });
  }
});

// ── Pedidos ───────────────────────────────────────────────────────────────────

router.get('/orders', async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  const userId      = req.query['user_id'] as string | undefined;

  if (!accessToken) {
    return res.status(401).json({ error: 'Token de acesso não fornecido' });
  }
  if (!userId) {
    return res.status(400).json({ error: 'Parâmetro "user_id" é obrigatório' });
  }

  try {
    const { data } = await axios.get(
      `${ML_API_BASE}/orders/search`,
      {
        params: { seller: userId, sort: 'date_desc', limit: 50 },
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return res.json(data);
  } catch (err) {
    const { status, message } = mlErrorStatus(err);
    return res.status(status).json({ error: message });
  }
});

// ── Categorias (público) ──────────────────────────────────────────────────────

router.get('/categories', async (req, res) => {
  const categoryId = (req.query['category_id'] as string | undefined) ?? 'MLB1499';

  try {
    const { data } = await axios.get(`${ML_API_BASE}/categories/${categoryId}`);
    return res.json(data);
  } catch (err) {
    const { status, message } = mlErrorStatus(err);
    return res.status(status).json({ error: message });
  }
});

export default router;


