import express from 'express';

const router = express.Router();

const ML_API_BASE = 'https://api.mercadolibre.com';

router.post('/token', async (req, res) => {
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
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Erro ao trocar code por token:', error);
    res.status(500).json({ error: 'Erro interno ao processar token' });
  }
});

router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    if (!accessToken) {
      return res.status(401).json({ error: 'Token de acesso não fornecido' });
    }

    const response = await fetch(`${ML_API_BASE}/users/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno ao buscar usuário' });
  }
});

router.get('/user/:userId/addresses', async (req, res) => {
  try {
    const { userId } = req.params;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    if (!accessToken) {
      return res.status(401).json({ error: 'Token de acesso não fornecido' });
    }

    const response = await fetch(`${ML_API_BASE}/users/${userId}/addresses`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar endereços:', error);
    res.status(500).json({ error: 'Erro interno ao buscar endereços' });
  }
});

router.get('/items', async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    const userId = req.query.user_id;

    if (!accessToken) {
      return res.status(401).json({ error: 'Token de acesso não fornecido' });
    }

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
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro interno ao buscar produtos' });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    const userId = req.query.user_id;

    if (!accessToken) {
      return res.status(401).json({ error: 'Token de acesso não fornecido' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'user_id é obrigatório' });
    }

    const response = await fetch(
      `${ML_API_BASE}/orders/search?seller=${userId}&sort=date_desc&limit=50`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ error: 'Erro interno ao buscar pedidos' });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categoryId = req.query.category_id || 'MLB1499';

    const response = await fetch(`${ML_API_BASE}/categories/${categoryId}`);

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ error: 'Erro interno ao buscar categorias' });
  }
});

router.post('/items', async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    if (!accessToken) {
      return res.status(401).json({ error: 'Token de acesso não fornecido' });
    }

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
    res.json(data);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro interno ao criar produto' });
  }
});

router.post('/items/:itemId/description', async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    const { itemId } = req.params;

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
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Erro ao adicionar descrição:', error);
    res.status(500).json({ error: 'Erro interno ao adicionar descrição' });
  }
});

export default router;
