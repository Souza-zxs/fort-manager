import { Request, Response, NextFunction } from 'express';
import { getSupabaseClient } from '../../infra/database/supabase';
import { IntegrationRepository } from '../../repositories/integration.repository';
import { AuthenticatedRequest } from './auth.middleware.js';

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
    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    const db = getSupabaseClient();
    const integrationRepo = new IntegrationRepository(db);
    const integrations = await integrationRepo.findByUserId(userId);
    const integration = integrations.find((i) => i.marketplace === 'mercadolivre' && i.isActive);

    if (!integration) {
      return res.status(401).json({ error: 'Mercado Livre não conectado para este usuário.' });
    }

    const credentials = {
      app_id:
        process.env.MELI_APP_ID ?? process.env.VITE_ML_CLIENT_ID ?? '',
      client_secret:
        process.env.MELI_CLIENT_SECRET ?? process.env.VITE_ML_CLIENT_SECRET ?? '',
      redirect_uri:
        process.env.MELI_REDIRECT_URI ?? process.env.VITE_ML_REDIRECT_URI ?? '',
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
      user_id: Number(integration.shopId),
      expires_at: integration.accessTokenExpiresAt,
    };

    if (!credentials.app_id || !credentials.client_secret || !credentials.redirect_uri) {
      return res.status(500).json({ error: 'Credenciais de app Mercado Livre não configuradas no servidor.' });
    }

    if (!credentials.access_token || !credentials.refresh_token || !credentials.user_id) {
      return res.status(401).json({ error: 'Mercado Livre não autenticado.' });
    }

    res.locals.meliCredentials = credentials;
    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}

