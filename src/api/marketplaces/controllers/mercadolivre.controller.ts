import { Request, Response } from 'express';
import { MercadoLivreAdapter } from '../adapters/ml.adapter.js';
import { MercadoLivreRepository } from '../repositories/mercadolivre.repository.js';
import { MeliCreateItemPayload, MeliUpdateItemPayload } from '../types/mercadolivre-types.js';

type ItemReq    = Request<{ itemId: string }>;
type OrderReq   = Request<{ orderId: string }>;
type PaymentReq = Request<{ paymentId: string }>;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: instancia o adapter + repository a partir das credenciais salvas
// no banco (ou variáveis de ambiente para uso próprio).
// ─────────────────────────────────────────────────────────────────────────────

function buildRepo(credentials: {
  app_id: string;
  client_secret: string;
  redirect_uri: string;
  access_token: string;
  refresh_token: string;
  user_id: number;
  expires_at: Date;
}): MercadoLivreRepository {
  const adapter = new MercadoLivreAdapter(credentials);
  return new MercadoLivreRepository(adapter, credentials.user_id);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unexpected error';
}

/** Extrai com segurança um string de um valor de query param do Express */
function qs(val: unknown): string | undefined {
  if (typeof val === 'string' && val.length > 0) return val;
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0] as string;
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /marketplaces/mercadolivre/auth/url
 * Retorna a URL de autorização OAuth para o frontend redirecionar o usuário.
 */
export async function getAuthUrl(req: Request, res: Response): Promise<void> {
  try {
    const url = MercadoLivreAdapter.getAuthUrl(
      process.env.MELI_APP_ID!,
      process.env.MELI_REDIRECT_URI!,
      req.query.state as string | undefined,
    );
    res.json({ url });
  } catch (err: unknown) {
    res.status(500).json({ error: errorMessage(err) });
  }
}

/**
 * GET /marketplaces/mercadolivre/auth/callback?code=...
 * Troca o authorization_code por tokens e salva na integração.
 */
export async function handleCallback(req: Request, res: Response): Promise<void> {
  try {
    const code = req.query.code as string;
    if (!code) {
      res.status(400).json({ error: 'Missing authorization code' });
      return;
    }

    const tokens = await MercadoLivreAdapter.exchangeCode(
      process.env.MELI_APP_ID!,
      process.env.MELI_CLIENT_SECRET!,
      process.env.MELI_REDIRECT_URI!,
      code,
    );

    res.json({
      user_id:       tokens.user_id,
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in:    tokens.expires_in,
    });
  } catch (err: unknown) {
    res.status(400).json({ error: errorMessage(err) });
  }
}

export async function getMe(_req: Request, res: Response): Promise<void> {
  try {
    const repo = buildRepo(res.locals.meliCredentials);
    const me = await repo.getMe();
    res.json(me);
  } catch (err: unknown) {
    res.status(500).json({ error: errorMessage(err) });
  }
}

export async function getAddresses(_req: Request, res: Response): Promise<void> {
  try {
    const repo = buildRepo(res.locals.meliCredentials);
    const addresses = await repo.getAddresses();
    res.json(addresses);
  } catch (err: unknown) {
    res.status(500).json({ error: errorMessage(err) });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Anúncios
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /marketplaces/mercadolivre/items?status=active
 * Lista todos os anúncios da loja (com paginação automática).
 */
export async function listItems(req: Request, res: Response): Promise<void> {
  try {
    const repo  = buildRepo(res.locals.meliCredentials);
    const items = await repo.getAllItems(qs(req.query.status));
    res.json({ total: items.length, items });
  } catch (err: unknown) {
    res.status(500).json({ error: errorMessage(err) });
  }
}

/**
 * GET /marketplaces/mercadolivre/items/:itemId
 * Detalhes de um anúncio.
 */
export async function getItem(req: ItemReq, res: Response): Promise<void> {
  try {
    const repo = buildRepo(res.locals.meliCredentials);
    const item = await repo.getItem(req.params.itemId);
    res.json(item);
  } catch (err: unknown) {
    res.status(404).json({ error: errorMessage(err) });
  }
}

/**
 * POST /marketplaces/mercadolivre/items
 * Publica um novo anúncio.
 *
 * Body: MeliCreateItemPayload
 */
export async function createItem(req: Request, res: Response): Promise<void> {
  try {
    const repo    = buildRepo(res.locals.meliCredentials);
    const payload = req.body as MeliCreateItemPayload;
    const item    = await repo.publishItem(payload);
    res.status(201).json(item);
  } catch (err: unknown) {
    res.status(400).json({ error: errorMessage(err) });
  }
}

/**
 * PATCH /marketplaces/mercadolivre/items/:itemId
 * Edita título, preço, estoque ou status de um anúncio.
 */
export async function updateItem(req: ItemReq, res: Response): Promise<void> {
  try {
    const repo    = buildRepo(res.locals.meliCredentials);
    const payload = req.body as MeliUpdateItemPayload;
    const item    = await repo.editItem(req.params.itemId, payload);
    res.json(item);
  } catch (err: unknown) {
    res.status(400).json({ error: errorMessage(err) });
  }
}

/**
 * PATCH /marketplaces/mercadolivre/items/:itemId/pause
 * Pausa um anúncio ativo.
 */
export async function pauseItem(req: ItemReq, res: Response): Promise<void> {
  try {
    const repo = buildRepo(res.locals.meliCredentials);
    await repo.pauseItem(req.params.itemId);
    res.json({ success: true, status: 'paused' });
  } catch (err: unknown) {
    res.status(400).json({ error: errorMessage(err) });
  }
}

/**
 * PATCH /marketplaces/mercadolivre/items/:itemId/activate
 * Reativa um anúncio pausado.
 */
export async function activateItem(req: ItemReq, res: Response): Promise<void> {
  try {
    const repo = buildRepo(res.locals.meliCredentials);
    await repo.activateItem(req.params.itemId);
    res.json({ success: true, status: 'active' });
  } catch (err: unknown) {
    res.status(400).json({ error: errorMessage(err) });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pedidos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /marketplaces/mercadolivre/orders?date_from=2025-01-01&date_to=2025-01-31
 * Lista pedidos num intervalo de datas.
 */
export async function listOrders(req: Request, res: Response): Promise<void> {
  try {
    const date_from = qs(req.query.date_from);
    const date_to   = qs(req.query.date_to);

    if (!date_from || !date_to) {
      res.status(400).json({ error: 'date_from e date_to são obrigatórios (YYYY-MM-DD)' });
      return;
    }

    const repo   = buildRepo(res.locals.meliCredentials);
    const orders = await repo.getOrdersByDateRange(date_from, date_to);
    res.json({ total: orders.length, orders });
  } catch (err: unknown) {
    res.status(500).json({ error: errorMessage(err) });
  }
}

/**
 * GET /marketplaces/mercadolivre/orders/:orderId
 * Detalhes de um pedido específico.
 */
export async function getOrder(req: OrderReq, res: Response): Promise<void> {
  try {
    const repo  = buildRepo(res.locals.meliCredentials);
    const order = await repo.getOrder(Number(req.params.orderId));
    res.json(order);
  } catch (err: unknown) {
    res.status(404).json({ error: errorMessage(err) });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Financeiro
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /marketplaces/mercadolivre/finance/balance
 * Saldo disponível na conta.
 */
export async function getBalance(req: Request, res: Response): Promise<void> {
  try {
    const repo    = buildRepo(res.locals.meliCredentials);
    const balance = await repo.getBalance();
    res.json(balance);
  } catch (err: unknown) {
    res.status(500).json({ error: errorMessage(err) });
  }
}

/**
 * GET /marketplaces/mercadolivre/finance/movements?date_from=2025-01-01&date_to=2025-01-31
 * Extrato de movimentações da conta.
 */
export async function getMovements(req: Request, res: Response): Promise<void> {
  try {
    const date_from = qs(req.query.date_from);
    const date_to   = qs(req.query.date_to);

    if (!date_from || !date_to) {
      res.status(400).json({ error: 'date_from e date_to são obrigatórios (YYYY-MM-DD)' });
      return;
    }

    const repo      = buildRepo(res.locals.meliCredentials);
    const movements = await repo.getMovements(date_from, date_to);
    res.json({ total: movements.length, movements });
  } catch (err: unknown) {
    res.status(500).json({ error: errorMessage(err) });
  }
}

/**
 * GET /marketplaces/mercadolivre/finance/summary?date_from=2025-01-01&date_to=2025-01-31
 * Resumo financeiro: faturamento bruto, taxas ML, frete, líquido estimado.
 */
export async function getFinancialSummary(req: Request, res: Response): Promise<void> {
  try {
    const date_from = qs(req.query.date_from);
    const date_to   = qs(req.query.date_to);

    if (!date_from || !date_to) {
      res.status(400).json({ error: 'date_from e date_to são obrigatórios (YYYY-MM-DD)' });
      return;
    }

    const repo    = buildRepo(res.locals.meliCredentials);
    const summary = await repo.getFinancialSummary(date_from, date_to);
    res.json(summary);
  } catch (err: unknown) {
    res.status(500).json({ error: errorMessage(err) });
  }
}

/**
 * GET /marketplaces/mercadolivre/finance/payments/:paymentId
 * Detalhes de um pagamento via Mercado Pago.
 */
export async function getPayment(req: PaymentReq, res: Response): Promise<void> {
  try {
    const repo    = buildRepo(res.locals.meliCredentials);
    const payment = await repo.getPayment(req.params.paymentId);
    res.json(payment);
  } catch (err: unknown) {
    res.status(404).json({ error: errorMessage(err) });
  }
}



