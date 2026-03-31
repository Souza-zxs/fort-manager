import type { VercelRequest, VercelResponse } from '@vercel/node';

const ML_API_BASE = 'https://api.mercadolibre.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, redirect_uri } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'code é obrigatório' });
    }

    const clientId = process.env.VITE_ML_CLIENT_ID;
    const clientSecret = process.env.VITE_ML_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'Credenciais do Mercado Livre não configuradas' });
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirect_uri || process.env.VITE_ML_REDIRECT_URI || '',
    });

    const response = await fetch(`${ML_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: await response.text() };
      }
      return res.status(response.status).json({ error: JSON.stringify(errorData) });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Erro ao trocar code por token:', error);
    res.status(500).json({ error: 'Erro interno ao processar token' });
  }
}
