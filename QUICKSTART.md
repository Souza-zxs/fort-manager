# Guia Rápido - Testar Integração Mercado Livre

## 1. Configuração Inicial (já feito ✅)

Seu `.env.local` já está configurado com:
```env
VITE_ML_CLIENT_ID=8329571954844533
VITE_ML_CLIENT_SECRET=k8b3ooCSVOcvjRyS6SWK2E39oDO1xVsU
VITE_ML_REDIRECT_URI=https://fort.oryondigital.com/integracoes
VITE_API_URL=http://localhost:3001
```

## 2. Rodar a Aplicação Completa

Execute um único comando que inicia frontend + backend:

```bash
npm run dev
```

Isso vai iniciar:
- ✅ Frontend React em `http://localhost:5173` (ou porta disponível)
- ✅ Backend Express em `http://localhost:3001`

Você verá no terminal:
```
🚀 Backend rodando em http://localhost:3001
📦 API Mercado Livre: http://localhost:3001/api/mercadolivre

VITE v5.4.19  ready in XXX ms
➜  Local:   http://localhost:XXXX/
```

## 3. Testar Localmente (Desenvolvimento)

### Opção A: Testar com localhost

1. **Atualizar `.env.local`** para usar localhost:
   ```env
   VITE_ML_REDIRECT_URI=http://localhost:5173/integracoes
   ```

2. **Atualizar no Mercado Livre**:
   - Acesse https://developers.mercadolivre.com.br/
   - Adicione `http://localhost:5173/integracoes` nas Redirect URIs

3. **Reiniciar** o servidor:
   ```bash
   # Ctrl+C para parar
   npm run dev
   ```

4. **Testar**:
   - Abra `http://localhost:5173/integracoes`
   - Clique em "Conectar com Mercado Livre"
   - Autorize
   - Volte conectado ✅

### Opção B: Testar com domínio (Produção)

Mantenha como está e faça deploy para `fort.oryondigital.com`.

## 4. Funcionalidades Disponíveis

Após conectar, você pode:

### ✅ Ver status da conexão
- Card mostra "Conectado"
- Exibe User ID

### ✅ Sincronizar dados reais
- Clique em **"Sincronizar agora"**
- Busca produtos e pedidos reais da sua conta ML
- Atualiza estatísticas no card

### ✅ Desconectar
- Clique em "Desconectar"
- Remove token do localStorage

## 5. Verificar se Backend está Funcionando

Teste o health check:

```bash
curl http://localhost:3001/api/health
```

Deve retornar:
```json
{"status":"ok","timestamp":"2026-03-26T..."}
```

## 6. Logs e Debug

### Ver logs do backend
Os logs aparecem no terminal onde você rodou `npm run dev`, procure por:
```
🚀 Backend rodando em http://localhost:3001
```

### Ver logs do frontend
Abra o DevTools do navegador (F12) → Console

### Erros comuns

**Backend não inicia:**
```bash
# Verificar se porta 3001 está livre
netstat -ano | findstr :3001

# Matar processo se necessário
taskkill /PID <PID> /F
```

**CORS error:**
- Certifique-se que `VITE_API_URL` está correto
- Backend deve estar rodando

**Token expirado:**
- Desconecte e reconecte

## 7. Deploy para Produção

Quando estiver pronto para produção:

1. **Frontend**: Já está em `fort.oryondigital.com`
2. **Backend**: Precisa hospedar em algum lugar

### Opções de hospedagem do backend:

**Railway** (Recomendado - Simples):
```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

**Render**:
- Conecte seu repositório
- Build command: `npm install`
- Start command: `npm run server`

**Heroku**:
```bash
heroku create fort-api
git push heroku main
```

Depois de hospedar o backend, atualize:
```env
VITE_API_URL=https://sua-api.railway.app
```

## 8. Próximos Passos

- [ ] Deploy do backend
- [ ] Atualizar `VITE_API_URL` para URL de produção
- [ ] Testar sincronização em produção
- [ ] Implementar refresh token automático
- [ ] Adicionar webhooks do ML

## Precisa de Ajuda?

- Documentação ML: https://developers.mercadolivre.com.br/
- Ver logs: Terminal onde rodou `npm run dev`
- Ver erros: DevTools (F12) → Console
