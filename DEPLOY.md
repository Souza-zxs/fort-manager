# Guia de Deploy - Fort Shopper Manager

## Visão Geral

A aplicação consiste em:
- **Frontend React** (Vite) → `fort.oryondigital.com`
- **Backend Express** (Node.js) → Precisa ser hospedado

## Opção 1: Railway (Recomendado)

### Vantagens
- Deploy automático via Git
- SSL grátis
- Fácil configuração
- $5/mês grátis

### Passos

1. **Criar conta**: https://railway.app

2. **Instalar CLI**:
```bash
npm i -g @railway/cli
railway login
```

3. **Criar projeto**:
```bash
railway init
```

4. **Configurar variáveis de ambiente**:
```bash
railway variables set VITE_ML_CLIENT_ID=8329571954844533
railway variables set VITE_ML_CLIENT_SECRET=k8b3ooCSVOcvjRyS6SWK2E39oDO1xVsU
railway variables set VITE_ML_REDIRECT_URI=https://fort.oryondigital.com/integracoes
railway variables set PORT=3001
```

5. **Deploy**:
```bash
railway up
```

6. **Pegar URL do backend**:
```bash
railway domain
# Exemplo: fort-api.railway.app
```

7. **Atualizar frontend**:
   - Edite `.env.local`:
     ```env
     VITE_API_URL=https://fort-api.railway.app
     ```
   - Rebuild e redeploy frontend

## Opção 2: Render

### Vantagens
- Free tier disponível
- Deploy automático
- SSL grátis

### Passos

1. **Criar conta**: https://render.com

2. **Criar Web Service**:
   - Connect repository
   - Name: `fort-api`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm run server`

3. **Configurar variáveis**:
   - VITE_ML_CLIENT_ID
   - VITE_ML_CLIENT_SECRET
   - VITE_ML_REDIRECT_URI
   - PORT (3001)

4. **Deploy automático** ao fazer push

5. **Pegar URL**: `https://fort-api.onrender.com`

6. **Atualizar frontend** com a URL

## Opção 3: Vercel (Serverless Functions)

### Vantagens
- Mesma plataforma do frontend
- Serverless (escala automaticamente)
- Deploy integrado

### Passos

1. **Converter para Vercel Functions**:

Criar `api/mercadolivre/token.ts`:
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Lógica do endpoint
}
```

2. **Criar `vercel.json`**:
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

3. **Deploy**:
```bash
vercel --prod
```

## Opção 4: Heroku

### Vantagens
- Tradicional e confiável
- Fácil de usar
- Addons disponíveis

### Passos

1. **Criar Procfile**:
```
web: npm run server
```

2. **Deploy**:
```bash
heroku create fort-api
heroku config:set VITE_ML_CLIENT_ID=8329571954844533
heroku config:set VITE_ML_CLIENT_SECRET=k8b3ooCSVOcvjRyS6SWK2E39oDO1xVsU
heroku config:set VITE_ML_REDIRECT_URI=https://fort.oryondigital.com/integracoes
git push heroku main
```

3. **Pegar URL**: `https://fort-api.herokuapp.com`

## Opção 5: VPS (DigitalOcean, AWS, etc)

### Para servidores próprios

1. **Instalar Node.js**:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Clonar repositório**:
```bash
git clone <repo-url>
cd fort-shopper-manager
npm install
```

3. **Configurar variáveis**:
```bash
nano .env.local
# Adicionar variáveis
```

4. **Instalar PM2**:
```bash
npm install -g pm2
```

5. **Rodar backend**:
```bash
pm2 start npm --name "fort-api" -- run server
pm2 save
pm2 startup
```

6. **Configurar Nginx** (proxy reverso):
```nginx
server {
    listen 80;
    server_name api.fort.oryondigital.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

7. **SSL com Certbot**:
```bash
sudo certbot --nginx -d api.fort.oryondigital.com
```

## Após Deploy do Backend

### 1. Atualizar Frontend

Edite `.env.local` (ou variáveis de ambiente da plataforma):
```env
VITE_API_URL=https://sua-api-url.com
```

### 2. Rebuild Frontend
```bash
npm run build
```

### 3. Redeploy Frontend
Upload da pasta `dist/` para `fort.oryondigital.com`

### 4. Testar

1. Acesse `https://fort.oryondigital.com/integracoes`
2. Clique em "Conectar com Mercado Livre"
3. Autorize
4. Verifique conexão
5. Clique em "Sincronizar agora"
6. Verifique se dados reais aparecem

## Checklist de Deploy

- [ ] Backend deployado e rodando
- [ ] Variáveis de ambiente configuradas no backend
- [ ] URL do backend anotada
- [ ] `VITE_API_URL` atualizado no frontend
- [ ] Frontend rebuilded
- [ ] Frontend redeployado
- [ ] Redirect URI cadastrado no Mercado Livre
- [ ] Testado OAuth flow
- [ ] Testado sincronização
- [ ] Logs monitorados

## Monitoramento

### Railway
```bash
railway logs
```

### Render
Ver logs no dashboard

### PM2 (VPS)
```bash
pm2 logs fort-api
pm2 monit
```

## Troubleshooting

### Backend não inicia
- Verificar logs
- Verificar variáveis de ambiente
- Verificar porta disponível

### CORS error
- Verificar `VITE_API_URL` no frontend
- Verificar configuração CORS no backend

### 401 Unauthorized
- Verificar se token está sendo enviado
- Verificar se token não expirou

### 500 Internal Server Error
- Ver logs do backend
- Verificar credenciais ML

## Custos Estimados

| Plataforma | Custo/mês |
|------------|-----------|
| Railway    | $5 (free tier) |
| Render     | $0 (free tier) |
| Vercel     | $0 (hobby) |
| Heroku     | $7 (eco dyno) |
| VPS        | $5-10 |

## Recomendação

Para começar: **Railway** (simples e rápido)
Para produção: **VPS** (mais controle) ou **Railway** (menos manutenção)
