# Backend API - Fort Shopper Manager

Backend Node.js/Express para integração com Mercado Livre, resolvendo problemas de CORS.

## Estrutura

```
server/
├── index.ts              # Servidor Express principal
├── routes/
│   └── mercadolivre.ts   # Rotas da API do Mercado Livre
└── tsconfig.json         # Configuração TypeScript
```

## Endpoints Disponíveis

### Health Check
```
GET /api/health
```

### Mercado Livre - Trocar código por token
```
POST /api/mercadolivre/token
Body: { "code": "TG-xxx", "redirect_uri": "https://..." }
```

### Mercado Livre - Buscar usuário
```
GET /api/mercadolivre/user/:userId
Headers: Authorization: Bearer {access_token}
```

### Mercado Livre - Buscar produtos
```
GET /api/mercadolivre/items?user_id={userId}
Headers: Authorization: Bearer {access_token}
```

### Mercado Livre - Buscar pedidos
```
GET /api/mercadolivre/orders?user_id={userId}
Headers: Authorization: Bearer {access_token}
```

## Como rodar

### Desenvolvimento (Frontend + Backend)
```bash
npm run dev
```

### Apenas Backend
```bash
npm run server
```

O backend roda em `http://localhost:3001` por padrão.

## Variáveis de Ambiente

Configure no `.env.local`:

```env
VITE_ML_CLIENT_ID=seu_client_id
VITE_ML_CLIENT_SECRET=seu_client_secret
VITE_ML_REDIRECT_URI=https://seu-dominio.com/integracoes
VITE_API_URL=http://localhost:3001
PORT=3001
```

## Deploy

Para produção, você pode:

1. **Vercel/Netlify Functions**: Converter para serverless
2. **Heroku/Railway**: Deploy direto do servidor Express
3. **Docker**: Containerizar a aplicação

Lembre-se de configurar as variáveis de ambiente no serviço de hospedagem.
