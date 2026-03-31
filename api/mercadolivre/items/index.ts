import type { VercelRequest, VercelResponse } from '@vercel/node';

const ML_API_BASE = 'https://api.mercadolibre.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    if (!accessToken) {
      return res.status(401).json({ error: 'Token de acesso não fornecido' });
    }

    if (req.method === 'GET') {
      const userId = req.query.user_id;

      if (!userId) {
        return res.status(400).json({ error: 'user_id é obrigatório' });
      }

      const response = await fetch(
        `${ML_API_BASE}/users/${userId}/items/search?status=active&limit=50`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

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
      return res.json(data);
    }

    if (req.method === 'POST') {
      const response = await fetch(`${ML_API_BASE}/items`, {
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
        console.error('Erro ML API:', JSON.stringify(errorData, null, 2));
        return res.status(response.status).json({ error: JSON.stringify(errorData) });
      }

      const data = await response.json();
      return res.json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Erro ao processar items:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
}
