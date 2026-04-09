import { NextRequest, NextResponse } from 'next/server';
import { MercadoLivreAdapter } from '@/api/marketplaces/adapters/ml.adapter';

// ── GET /api/marketplaces/mercadolivre/auth/url ──
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state') ?? undefined;

  try {
    const authUrl = MercadoLivreAdapter.getAuthUrl(
      process.env.MELI_APP_ID!,
      process.env.MELI_REDIRECT_URI!,
      state,
    );
    return NextResponse.json({ url: authUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
