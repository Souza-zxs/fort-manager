# Deploy na Vercel - Guia Completo

## ✅ Backend Convertido para Serverless Functions

O backend foi convertido para **Vercel Serverless Functions** e agora pode ser deployado junto com o frontend!

## 📁 Estrutura

```
fort-shopper-manager/
├── api/                              # Serverless Functions (Backend)
│   ├── health.ts                    # Health check
│   └── mercadolivre/
│       ├── token.ts                 # OAuth token
│       ├── orders.ts                # Buscar pedidos
│       ├── user/
│       │   ├── [userId].ts          # Buscar usuário
│       │   └── [userId]/
│       │       └── addresses.ts     # Buscar endereços
│       └── items/
│           ├── index.ts             # Criar/buscar produtos
│           └── [itemId]/
│               └── description.ts   # Adicionar descrição
├── src/                             # Frontend React
└── vercel.json                      # Configuração Vercel
```

## 🚀 Deploy na Vercel

### Opção 1: Via CLI (Recomendado)

#### 1. Instalar Vercel CLI

```bash
npm install -g vercel
```

#### 2. Login

```bash
vercel login
```

#### 3. Deploy

```bash
vercel --prod
```

Durante o setup:
- **Set up and deploy?** → Yes
- **Which scope?** → Sua conta
- **Link to existing project?** → No
- **Project name?** → fort-shopper-manager
- **Directory?** → ./
- **Override settings?** → No

#### 4. Configurar Variáveis de Ambiente

```bash
vercel env add VITE_ML_CLIENT_ID
# Cole: 8329571954844533

vercel env add VITE_ML_CLIENT_SECRET
# Cole: k8b3ooCSVOcvjRyS6SWK2E39oDO1xVsU

vercel env add VITE_ML_REDIRECT_URI
# Cole: https://fort.oryondigital.com/integracoes
```

**Importante**: Selecione **Production, Preview, Development** para todas as variáveis.

#### 5. Redeploy com Variáveis

```bash
vercel --prod
```

---

### Opção 2: Via Dashboard (Interface Web)

#### 1. Conectar Repositório

1. Acesse: https://vercel.com/new
2. Import seu repositório do GitHub
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

#### 2. Adicionar Variáveis de Ambiente

Em **Environment Variables**, adicione:

```
VITE_ML_CLIENT_ID = 8329571954844533
VITE_ML_CLIENT_SECRET = k8b3ooCSVOcvjRyS6SWK2E39oDO1xVsU
VITE_ML_REDIRECT_URI = https://fort.oryondigital.com/integracoes
```

#### 3. Deploy

Clique em **Deploy**

---

## 🔗 Configurar Domínio Customizado

### 1. No Dashboard da Vercel

1. Vá no seu projeto
2. Settings → Domains
3. Adicione: `fort.oryondigital.com`

### 2. No seu DNS (Registro.br ou outro)

Adicione um registro:

**Tipo A** ou **CNAME**:
```
Host: fort
Type: CNAME
Value: cname.vercel-dns.com
```

Ou siga as instruções específicas que a Vercel mostrar.

---

## 🧪 Testar Após Deploy

### 1. Verificar Health Check

```bash
curl https://fort.oryondigital.com/api/health
```

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "2026-03-26T...",
  "service": "Fort Shopper Manager API"
}
```

### 2. Testar Integração

1. Acesse: `https://fort.oryondigital.com/integracoes`
2. Desconecte e reconecte o Mercado Livre (para gerar novo token)
3. Clique em "Adicionar Produto"
4. Preencha e publique

---

## 📋 Endpoints Disponíveis

Todos em: `https://fort.oryondigital.com/api/...`

- `GET /api/health` - Health check
- `POST /api/mercadolivre/token` - OAuth token
- `GET /api/mercadolivre/user/:userId` - Dados do usuário
- `GET /api/mercadolivre/user/:userId/addresses` - Endereços
- `GET /api/mercadolivre/items?user_id=X` - Produtos
- `POST /api/mercadolivre/items` - Criar produto
- `POST /api/mercadolivre/items/:itemId/description` - Adicionar descrição
- `GET /api/mercadolivre/orders?user_id=X` - Pedidos

---

## 🔧 Atualizar Mercado Livre

No painel do ML (https://developers.mercadolivre.com.br/):

Certifique-se que a **Redirect URI** está cadastrada:
- `https://fort.oryondigital.com/integracoes`

---

## 🐛 Troubleshooting

### Erro 404 nas APIs

Verifique se a pasta `api/` foi deployada:
```bash
vercel ls
```

### Erro 500 nas APIs

Verifique logs:
```bash
vercel logs
```

Ou no dashboard: Project → Deployments → Clique no deployment → Functions

### Variáveis não carregando

```bash
# Listar variáveis
vercel env ls

# Adicionar novamente
vercel env add NOME_DA_VARIAVEL
```

---

## 💡 Vantagens da Vercel

- ✅ Frontend + Backend no mesmo lugar
- ✅ Deploy automático via Git
- ✅ SSL grátis
- ✅ CDN global
- ✅ Logs integrados
- ✅ Domínio customizado grátis
- ✅ Serverless (escala automaticamente)

---

## 📊 Custos

- **Hobby Plan**: Grátis
  - 100GB bandwidth/mês
  - Serverless Functions ilimitadas
  - 1 domínio customizado

- **Pro Plan**: $20/mês
  - Mais bandwidth
  - Múltiplos domínios
  - Suporte prioritário

---

## 🔄 Deploy Automático

Após o primeiro deploy, toda vez que você fizer `git push`:
- ✅ Vercel detecta automaticamente
- ✅ Faz build e deploy
- ✅ Atualiza o site

---

## 📝 Comandos Úteis

```bash
# Deploy para produção
vercel --prod

# Deploy preview (teste)
vercel

# Ver logs
vercel logs

# Ver domínios
vercel domains ls

# Ver variáveis
vercel env ls

# Remover deployment
vercel remove [deployment-url]
```

---

## ✅ Checklist de Deploy

- [ ] Código commitado no Git
- [ ] Vercel CLI instalado
- [ ] Login na Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy executado
- [ ] Health check testado
- [ ] Domínio customizado configurado
- [ ] Redirect URI atualizado no ML
- [ ] Integração testada
- [ ] Produto criado com sucesso

---

## 🎉 Pronto!

Após o deploy, sua aplicação estará 100% funcional em:
- **Frontend**: https://fort.oryondigital.com
- **Backend**: https://fort.oryondigital.com/api

Tudo no mesmo domínio, sem problemas de CORS! 🚀
