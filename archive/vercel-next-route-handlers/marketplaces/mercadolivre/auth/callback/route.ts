import { NextRequest, NextResponse } from 'next/server';
import { MercadoLivreAdapter } from '@/api/marketplaces/adapters/ml.adapter';

// ── GET /api/marketplaces/mercadolivre/auth/callback ──
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  try {
    const tokens = await MercadoLivreAdapter.exchangeCode(
      process.env.MELI_APP_ID!,
      process.env.MELI_CLIENT_SECRET!,
      process.env.MELI_REDIRECT_URI!,
      code,
    );

    return NextResponse.json({
      user_id: tokens.user_id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
