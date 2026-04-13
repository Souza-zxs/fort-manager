import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/api/marketplaces/infra/database/supabase';
import { IntegrationRepository } from '@/api/marketplaces/repositories/integration.repository';
import { OrdersRepository } from '@/api/marketplaces/repositories/orders.repository';
import { PaymentsRepository } from '@/api/marketplaces/repositories/payments.repository';
import { createClient } from '@supabase/supabase-js';
import { UnauthorizedError } from '@/api/marketplaces/shared/errors/errors';

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
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ── GET /api/marketplaces/orders/:integrationId ──
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  const { integrationId } = await params;
  const url = new URL(request.url);
  const isFinanceSummary = url.pathname.endsWith('/finance/summary');
  
  if (isFinanceSummary) {
    return withErrorHandling(async () => {
      const userId = await getUserIdFromRequest(request);
      const db = getSupabaseClient();
      
      const integrationRepo = new IntegrationRepository(db);
      const ordersRepo = new OrdersRepository(db);
      const paymentsRepo = new PaymentsRepository(db);
      
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      
      const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = to ? new Date(to) : new Date();
      
      const integrations = await integrationRepo.findByUserId(userId);
      const integrationIds = integrations.map((i) => i.id);
      
      const [summary, orders] = await Promise.all([
        paymentsRepo.getFinanceSummary(integrationIds, fromDate, toDate),
        ordersRepo.findByUserId(userId, integrationIds),
      ]);
      
      const ordersInPeriod = orders.filter(
        (o) => o.orderCreatedAt >= fromDate && o.orderCreatedAt <= toDate,
      );
      
      return {
        ...summary,
        totalOrders: ordersInPeriod.length,
        completedOrders: ordersInPeriod.filter((o) => o.status === 'COMPLETED').length,
        cancelledOrders: ordersInPeriod.filter((o) => o.status === 'CANCELLED').length,
      };
    });
  }
  
  // GET /api/marketplaces/orders/:integrationId
  return withErrorHandling(async () => {
    await getUserIdFromRequest(request); // apenas valida auth
    const db = getSupabaseClient();
    const ordersRepo = new OrdersRepository(db);
    const orders = await ordersRepo.findByIntegrationId(integrationId);
    return orders;
  });
}
