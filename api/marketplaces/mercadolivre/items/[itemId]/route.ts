import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/api/marketplaces/infra/database/supabase';
import { IntegrationRepository } from '@/api/marketplaces/repositories/integration.repository';
import { MarketplaceAuthService } from '@/api/marketplaces/services/auth.service';
import { createClient } from '@supabase/supabase-js';
import { UnauthorizedError } from '@/api/marketplaces/shared/errors/errors';
import { MercadoLivreAdapter } from '@/api/marketplaces/adapters/ml.adapter';
import { MercadoLivreRepository } from '@/api/marketplaces/repositories/mercadolivre.repository';
import type { MeliCreateItemPayload, MeliUpdateItemPayload } from '@/api/marketplaces/types/mercadolivre-types';

// Helper: extrai userId do token JWT
async function getUserIdFromRequest(request: NextRequest): Promise<string> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7);
  const supabaseUrl = process.env.SUPABASE_URL ?? '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? '';

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  return data.user.id;
}

// Helper: build repo a partir das credenciais salvas
function buildMeliRepo(credentials: {
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

// Helper: wrapper para tratar erros
async function withErrorHandling<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// Helper: obtém credenciais do ML para a integração do usuário
async function getMeliCredentials(userId: string) {
  const db = getSupabaseClient();
  const integrationRepo = new IntegrationRepository(db);
  const authService = new MarketplaceAuthService(integrationRepo);

  const integrations = await integrationRepo.findByUserId(userId);
  const meliIntegration = integrations.find(i => i.marketplace === 'mercadolivre' && i.isActive);

  if (!meliIntegration) {
    throw new UnauthorizedError('No active Mercado Livre integration found');
  }

  const accessToken = await authService.getValidAccessToken(meliIntegration);

  return {
    app_id: process.env.MELI_APP_ID!,
    client_secret: process.env.MELI_CLIENT_SECRET!,
    redirect_uri: process.env.MELI_REDIRECT_URI!,
    access_token: accessToken,
    refresh_token: meliIntegration.refreshToken,
    user_id: Number(meliIntegration.shopId),
    expires_at: new Date(meliIntegration.accessTokenExpiresAt),
  };
}

// ── GET /api/marketplaces/mercadolivre/items/:itemId ──
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  
  return withErrorHandling(async () => {
    const userId = await getUserIdFromRequest(request);
    const credentials = await getMeliCredentials(userId);
    const repo = buildMeliRepo(credentials);
    return repo.getItem(itemId);
  });
}

// ── POST /api/marketplaces/mercadolivre/items ──
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const userId = await getUserIdFromRequest(request);
    const credentials = await getMeliCredentials(userId);
    const repo = buildMeliRepo(credentials);
    
    const payload = await request.json() as MeliCreateItemPayload;
    const item = await repo.publishItem(payload);
    
    return NextResponse.json(item, { status: 201 });
  });
}

// ── PATCH /api/marketplaces/mercadolivre/items/:itemId ──
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  
  return withErrorHandling(async () => {
    const userId = await getUserIdFromRequest(request);
    const credentials = await getMeliCredentials(userId);
    const repo = buildMeliRepo(credentials);
    
    const payload = await request.json() as MeliUpdateItemPayload;
    const item = await repo.editItem(itemId, payload);
    
    return item;
  });
}
