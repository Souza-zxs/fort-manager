# Solução: Permissões de Endereço (403 PA_UNAUTHORIZED)

## O que mudou?

### 1. Adicionado Scope OAuth
Agora o link de autorização solicita **todas as permissões necessárias**:
```
scope: "offline_access read write"
```

Isso garante que o token tenha acesso a:
- ✅ Endereços
- ✅ Criar produtos
- ✅ Atualizar descrições
- ✅ Consultar pedidos

### 2. Campo Manual de Endereço
Se a API não conseguir buscar os endereços automaticamente (por falta de permissão no token antigo), você pode **informar o ID manualmente**.

#### Como encontrar o ID do endereço:
1. Acesse: https://www.mercadolivre.com.br/vendas/configuracao/dados
2. Veja seu endereço cadastrado
3. O ID pode aparecer na URL ou nos detalhes do endereço

Exemplo de ID: `1126268188`

## Como testar

### 1. Faça o deploy
```bash
npm run build
# Suba a pasta dist/ para seu servidor
```

### 2. **RECONECTE o Mercado Livre**
⚠️ **IMPORTANTE**: O token antigo não tem as novas permissões!

1. Acesse: https://fort.oryondigital.com/integracoes
2. Clique em **"Desconectar"** no card do Mercado Livre
3. Clique em **"Conectar"** novamente
4. Autorize com as novas permissões

### 3. Teste adicionar produto
1. Vá em **"Adicionar Produto"**
2. Se os endereços carregarem automaticamente: ótimo! ✅
3. Se não carregar: informe o ID manualmente no campo
4. Preencha o formulário e publique

## Troubleshooting

### Ainda dá erro 403?
- ✅ Você desconectou e reconectou?
- ✅ O token foi renovado com as novas permissões?
- ✅ Você tem endereço cadastrado no ML?

### Como verificar se o token tem permissões?
Abra o Console do navegador (F12) e execute:
```javascript
localStorage.getItem('ml_access_token')
```

Se aparecer um token, ele foi gerado. Mas só terá as novas permissões se você **reconectar** após o deploy.

## Resumo
1. ✅ Build feito com novas permissões OAuth
2. ✅ Campo manual para ID do endereço
3. 🚀 **Faça deploy e RECONECTE o ML**
4. 🎯 Teste criar produto

---

**Dica**: Se você já tinha conectado antes, o token antigo não serve. Sempre reconecte após mudanças no OAuth!
