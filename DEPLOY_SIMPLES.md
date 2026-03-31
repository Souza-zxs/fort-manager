# Deploy Simplificado - SEM Backend Separado

## ✅ Solução Implementada

O código agora chama a **API do Mercado Livre diretamente** do frontend, sem precisar de backend separado!

## 🚀 Como Fazer Deploy

### Passo 1: Fazer Commit

```bash
git add .
git commit -m "Integração Mercado Livre completa"
git push origin main
```

### Passo 2: Deploy

Você tem várias opções:

#### A) Vercel (Recomendado)

```bash
npm install -g vercel
vercel login
vercel --prod
```

Ou conecte seu repo no dashboard: https://vercel.com/new

#### B) Netlify

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=dist
```

#### C) Qualquer Hospedagem

```bash
npm run build
# Upload da pasta dist/ para seu servidor
```

### Passo 3: Configurar Variáveis de Ambiente

**Na plataforma de hospedagem**, adicione:

```
VITE_ML_CLIENT_ID=8329571954844533
VITE_ML_CLIENT_SECRET=k8b3ooCSVOcvjRyS6SWK2E39oDO1xVsU
VITE_ML_REDIRECT_URI=https://fort.oryondigital.com/integracoes
```

### Passo 4: Redeploy (se necessário)

Se já deployou antes de adicionar as variáveis, faça redeploy.

---

## ⚠️ Limitações do CORS

Algumas chamadas podem falhar com CORS:
- ❌ Buscar usuário (não crítico)
- ❌ Buscar endereços (pode falhar)
- ✅ OAuth token (funciona)
- ✅ Criar produto (funciona se tiver endereço)

### Solução para CORS

Se tiver problemas de CORS:

1. **Buscar endereços**: O código tenta buscar, se falhar, você precisa informar manualmente
2. **Criar produto**: Funciona se você já tiver endereço cadastrado no ML

---

## 🎯 Teste Rápido

Depois do deploy:

1. Acesse `https://fort.oryondigital.com/integracoes`
2. Desconecte e reconecte o Mercado Livre
3. Vá em "Adicionar Produto"
4. Preencha:
   - Título: "Produto Teste - Não Comprar"
   - Preço: 100
   - Quantidade: 10
   - Imagem: URL válida
5. Publique!

---

## 📝 Checklist

- [x] Código atualizado para chamar API direta ✅
- [x] Build gerado ✅
- [ ] Deploy feito
- [ ] Variáveis configuradas
- [ ] Mercado Livre reconectado
- [ ] Produto criado com sucesso

---

## 💡 Dica

Se o erro `address_pending` persistir:

1. **Desconecte** a integração
2. **Cadastre o endereço** no ML: https://www.mercadolivre.com.br/vendas/configuracao/dados
3. **Aguarde 5-10 minutos**
4. **Reconecte** a integração (novo token)
5. **Tente publicar**

O token OAuth "fotografa" o estado da sua conta. Se você cadastrou o endereço depois de conectar, precisa reconectar para o token ter as novas permissões.

---

## 🎉 Pronto!

Agora é só fazer o deploy e testar! 🚀
