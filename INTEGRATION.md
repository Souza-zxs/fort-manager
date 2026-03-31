# Integração Mercado Livre - Guia Completo

## Arquitetura

A integração funciona com:
- **Frontend React**: Interface de usuário e OAuth flow
- **Backend Express**: Proxy para API do Mercado Livre (resolve CORS)

## Como funciona

1. **Autenticação OAuth**:
   - Usuário clica em "Conectar com Mercado Livre"
   - Redireciona para autorização do ML
   - ML retorna com `code` na URL
   - Frontend envia `code` para backend
   - Backend troca `code` por `access_token`
   - Token é salvo no localStorage

2. **Chamadas à API**:
   - Frontend faz requisições ao backend local
   - Backend adiciona credenciais e chama API do ML
   - Backend retorna dados para o frontend

## Setup Local

### 1. Configurar variáveis de ambiente

Crie/edite `.env.local`:

```env
VITE_ML_CLIENT_ID=8329571954844533
VITE_ML_CLIENT_SECRET=k8b3ooCSVOcvjRyS6SWK2E39oDO1xVsU
VITE_ML_REDIRECT_URI=http://localhost:5173/integracoes
VITE_API_URL=http://localhost:3001
PORT=3001
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Rodar aplicação completa

```bash
npm run dev
```

Isso inicia:
- Frontend em `http://localhost:5173`
- Backend em `http://localhost:3001`

### 4. Testar integração

1. Abra `http://localhost:5173/integracoes`
2. Clique em "Conectar com Mercado Livre"
3. Autorize no Mercado Livre
4. Você será redirecionado de volta conectado

## Setup Produção

### Frontend (fort.oryondigital.com)

1. Configure variáveis de ambiente na plataforma:
```env
VITE_ML_CLIENT_ID=8329571954844533
VITE_ML_CLIENT_SECRET=k8b3ooCSVOcvjRyS6SWK2E39oDO1xVsU
VITE_ML_REDIRECT_URI=https://fort.oryondigital.com/integracoes
VITE_API_URL=https://api.fort.oryondigital.com
```

2. Build e deploy:
```bash
npm run build
# Upload pasta dist/ para servidor
```

### Backend (api.fort.oryondigital.com)

Opções de deploy:

#### Opção 1: Vercel Serverless Functions
```bash
# Converter rotas Express para Vercel Functions
# Ver: https://vercel.com/docs/functions/serverless-functions
```

#### Opção 2: Heroku/Railway
```bash
# Adicionar Procfile:
web: npm run server

# Deploy:
git push heroku main
```

#### Opção 3: VPS/Cloud
```bash
# Instalar Node.js no servidor
# Clonar repositório
# npm install
# npm run server
# Usar PM2 ou similar para manter rodando
```

### Configurar no Mercado Livre

No painel de desenvolvedor (https://developers.mercadolivre.com.br/):

1. Acesse sua aplicação
2. Em "Redirect URIs", adicione:
   - `https://fort.oryondigital.com/integracoes`
3. Salve

## Funcionalidades Disponíveis

### ✅ Implementado

- OAuth 2.0 flow completo
- Troca de código por token
- Buscar dados do usuário
- Buscar produtos ativos
- Buscar pedidos

### 🔜 Próximos passos

- Sincronização automática de produtos
- Webhook para notificações de pedidos
- Atualização de estoque
- Gestão de envios
- Refresh token automático

## Estrutura de Arquivos

```
fort-shopper-manager/
├── src/
│   ├── lib/
│   │   └── mercadoLivre.ts          # Cliente API ML
│   └── pages/
│       └── Integracoes.tsx          # Página de integrações
├── server/
│   ├── index.ts                     # Servidor Express
│   ├── routes/
│   │   └── mercadolivre.ts          # Rotas API ML
│   └── README.md                    # Docs do backend
├── .env.local                       # Variáveis locais (não commitado)
├── .env.example                     # Template de variáveis
└── INTEGRATION.md                   # Este arquivo
```

## Troubleshooting

### Erro 403 no OAuth
- Verifique se `VITE_ML_REDIRECT_URI` está cadastrado no painel do ML
- Confirme que o App ID está correto

### Erro CORS
- Certifique-se que o backend está rodando
- Verifique `VITE_API_URL` no frontend

### Token expirado
- Implementar refresh token (TODO)
- Por enquanto, reconectar manualmente

## Suporte

Documentação oficial: https://developers.mercadolivre.com.br/
