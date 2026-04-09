import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/api/marketplaces/infra/database/supabase';
import { IntegrationRepository } from '@/api/marketplaces/repositories/integration.repository';
import { OrdersRepository } from '@/api/marketplaces/repositories/orders.repository';
import { PaymentsRepository } from '@/api/marketplaces/repositories/payments.repository';
import { MarketplaceAuthService } from '@/api/marketplaces/services/auth.service';
import { MarketplaceSyncService } from '@/api/marketplaces/services/sync.service';
import { createClient } from '@supabase/supabase-js';
import { UnauthorizedError, BadRequestError } from '@/api/marketplaces/shared/errors/errors';

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

// ── DELETE /api/marketplaces/integrations/:id ──
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  return withErrorHandling(async () => {
    await getUserIdFromRequest(request); // apenas valida auth
    const db = getSupabaseClient();
    const integrationRepo = new IntegrationRepository(db);
    await integrationRepo.deactivate(id);
    return { message: 'Integration disconnected' };
  });
}

// ── POST /api/marketplaces/integrations/:id/sync ──
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  return withErrorHandling(async () => {
    const userId = await getUserIdFromRequest(request);
    const db = getSupabaseClient();
    
    const integrationRepo = new IntegrationRepository(db);
    const ordersRepo = new OrdersRepository(db);
    const paymentsRepo = new PaymentsRepository(db);
    
    const authService = new MarketplaceAuthService(integrationRepo);
    const syncService = new MarketplaceSyncService(authService, integrationRepo, ordersRepo, paymentsRepo);
    
    const result = await syncService.syncOrders(id);
    return result;
  });
}
