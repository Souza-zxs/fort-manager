# Teste em Produção - Solução Temporária

## Problema Atual

Você está testando em `fort.oryondigital.com` (produção), mas o backend está em `localhost:3001` (local).

```
Frontend (produção): https://fort.oryondigital.com
         ↓ tenta chamar
Backend (local):     http://localhost:3001  ❌ NÃO FUNCIONA!
```

## Soluções

### Opção 1: Testar Localmente (Mais Rápido - 2 minutos)

```bash
# 1. Iniciar servidor
npm run dev

# 2. Acessar no navegador
http://localhost:8080

# 3. Testar a funcionalidade
```

**Vantagens**:
- ✅ Funciona imediatamente
- ✅ Não precisa deploy
- ✅ Pode debugar facilmente

**Desvantagens**:
- ❌ Só funciona no seu computador

---

### Opção 2: Deploy do Backend (Produção Real - 10 minutos)

#### A) Railway (Recomendado - CLI)

```bash
# 1. Instalar CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Criar projeto
railway init

# 4. Configurar variáveis
railway variables set VITE_ML_CLIENT_ID=8329571954844533
railway variables set VITE_ML_CLIENT_SECRET=k8b3ooCSVOcvjRyS6SWK2E39oDO1xVsU  
railway variables set VITE_ML_REDIRECT_URI=https://fort.oryondigital.com/integracoes
railway variables set PORT=3001

# 5. Deploy
railway up

# 6. Pegar URL
railway domain
# Exemplo: https://fort-api.up.railway.app
```

#### B) Render (Interface Web)

1. Acesse: https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Configure:
   - **Name**: fort-api
   - **Build Command**: `npm install`
   - **Start Command**: `npm run server`
   - **Environment Variables**:
     ```
     VITE_ML_CLIENT_ID=8329571954844533
     VITE_ML_CLIENT_SECRET=k8b3ooCSVOcvjRyS6SWK2E39oDO1xVsU
     VITE_ML_REDIRECT_URI=https://fort.oryondigital.com/integracoes
     PORT=3001
     ```
5. Deploy

#### Depois do Deploy:

1. **Copie a URL do backend** (ex: `https://fort-api.up.railway.app`)

2. **Configure no frontend**:
   - Se usa Vercel/Netlify: Adicione variável `VITE_API_URL=https://fort-api.up.railway.app`
   - Se usa servidor próprio: Edite `.env` no servidor

3. **Rebuild frontend**:
   ```bash
   npm run build
   ```

4. **Redeploy frontend** (upload da pasta `dist/`)

---

### Opção 3: Proxy Temporário (Hack Rápido)

Se você só quer testar AGORA sem fazer deploy, posso criar um proxy temporário que roda no seu computador e expõe via ngrok/localtunnel.

```bash
# 1. Instalar localtunnel
npm install -g localtunnel

# 2. Iniciar backend
npm run server

# 3. Em outro terminal, expor
lt --port 3001

# Vai dar uma URL tipo: https://random-name.loca.lt
```

Depois configure `VITE_API_URL=https://random-name.loca.lt` e rebuilde.

**Atenção**: Essa URL muda toda vez que você reinicia!

---

## Recomendação

**Para desenvolvimento/teste**: Use Opção 1 (localhost)
**Para produção real**: Use Opção 2 (Railway ou Render)

---

## Checklist

Antes de testar em produção, confirme:

- [ ] Backend deployado e rodando
- [ ] URL do backend anotada
- [ ] `VITE_API_URL` configurado no frontend
- [ ] Frontend rebuilded com nova variável
- [ ] Frontend redeployado
- [ ] Mercado Livre conectado
- [ ] Endereço cadastrado no ML

---

## Comandos Úteis

```bash
# Ver variáveis configuradas (Railway)
railway variables

# Ver logs do backend (Railway)
railway logs

# Testar backend manualmente
curl https://sua-api.railway.app/api/health
```

---

## Suporte

Se tiver dúvidas em qualquer etapa, me avise!
