import { Request, Response, NextFunction } from 'express';

// ─────────────────────────────────────────────────────────────────────────────
// Middleware: carrega as credenciais do Mercado Livre e as injeta em
// res.locals.meliCredentials para que os controllers possam utilizá-las.
//
// Adapte o bloco "loadCredentials" para buscar do seu banco de dados
// (ex: tabela "integrations" filtrada pelo user_id da sessão autenticada).
// ─────────────────────────────────────────────────────────────────────────────

export async function meliAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // ── Carregue as credenciais da sua fonte de dados ──────────────────────
    // Exemplo usando variáveis de ambiente (conta própria / single-tenant):
    const credentials = {
      app_id:        process.env.MELI_APP_ID!,
      client_secret: process.env.MELI_CLIENT_SECRET!,
      redirect_uri:  process.env.MELI_REDIRECT_URI!,
      access_token:  process.env.MELI_ACCESS_TOKEN!,
      refresh_token: process.env.MELI_REFRESH_TOKEN!,
      user_id:       Number(process.env.MELI_USER_ID),
      expires_at:    new Date(process.env.MELI_EXPIRES_AT ?? 0),
    };

    // Exemplo multi-tenant (busca no banco pelo userId da sessão):
    // const userId = req.user?.id;
    // const integration = await db.integrations.findOne({
    //   where: { user_id: userId, marketplace: 'mercadolivre' },
    // });
    // if (!integration) return res.status(401).json({ error: 'Mercado Livre não conectado.' });
    // const credentials = {
    //   app_id:        process.env.MELI_APP_ID!,
    //   client_secret: process.env.MELI_CLIENT_SECRET!,
    //   redirect_uri:  process.env.MELI_REDIRECT_URI!,
    //   access_token:  integration.access_token,
    //   refresh_token: integration.refresh_token,
    //   user_id:       integration.meli_user_id,
    //   expires_at:    integration.token_expires_at,
    // };

    if (!credentials.access_token) {
      return res.status(401).json({ error: 'Mercado Livre não autenticado.' });
    }

    res.locals.meliCredentials = credentials;
    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}