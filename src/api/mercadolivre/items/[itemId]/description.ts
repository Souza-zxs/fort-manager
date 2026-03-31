import type { VercelRequest, VercelResponse } from '@vercel/node';

const ML_API_BASE = 'https://api.mercadolibre.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { itemId } = req.query;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    if (!accessToken) {
      return res.status(401).json({ error: 'Token de acesso não fornecido' });
    }

    const response = await fetch(`${ML_API_BASE}/items/${itemId}/description`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
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
    console.error('Erro ao adicionar descrição:', error);
    res.status(500).json({ error: 'Erro interno ao adicionar descrição' });
  }
}
