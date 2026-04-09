import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/api/marketplaces/infra/database/supabase';
import { IntegrationRepository } from '@/api/marketplaces/repositories/integration.repository';
import { OrdersRepository } from '@/api/marketplaces/repositories/orders.repository';
import { PaymentsRepository } from '@/api/marketplaces/repositories/payments.repository';
import { MarketplaceAuthService } from '@/api/marketplaces/services/auth.service';
import { MarketplaceSyncService } from '@/api/marketplaces/services/sync.service';
import { createClient } from '@supabase/supabase-js';
import { UnauthorizedError, BadRequestError } from '@/api/marketplaces/shared/errors/errors';
import type { MarketplaceName } from '@/api/marketplaces/types/marketplace.types';

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

// Helper: valida marketplace
function assertMarketplace(value: string): asserts value is MarketplaceName {
  if (value !== 'shopee' && value !== 'mercadolivre') {
    throw new BadRequestError(`Invalid marketplace: ${value}. Supported: shopee, mercadolivre`);
  }
}

// Helper: wrapper para tratar erros
async function withErrorHandling<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = error instanceof UnauthorizedError ? 401 : error instanceof BadRequestError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ── GET /api/marketplaces/integrations/:marketplace/auth-url ──
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ marketplace: string }> }
) {
  const { marketplace } = await params;
  return withErrorHandling(async () => {
    assertMarketplace(marketplace);
    const db = getSupabaseClient();
    const integrationRepo = new IntegrationRepository(db);
    const authService = new MarketplaceAuthService(integrationRepo);
    return authService.getAuthorizationUrl(marketplace);
  });
}

// ── POST /api/marketplaces/integrations/:marketplace/callback ──
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ marketplace: string }> }
) {
  const { marketplace } = await params;
  
  return withErrorHandling(async () => {
    assertMarketplace(marketplace);
    const userId = await getUserIdFromRequest(request);
    const { code, shop_id } = await request.json();

    if (!code) {
      throw new BadRequestError('Missing authorization code');
    }

    const db = getSupabaseClient();
    const integrationRepo = new IntegrationRepository(db);
    const authService = new MarketplaceAuthService(integrationRepo);

    const integration = await authService.handleCallback(marketplace, code, shop_id ?? '', userId);

    return {
      id: integration.id,
      marketplace: integration.marketplace,
      shopName: integration.shopName,
      shopId: integration.shopId,
    };
  });
}
