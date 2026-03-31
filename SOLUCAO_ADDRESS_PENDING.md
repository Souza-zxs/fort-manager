# Solução: Erro "address_pending"

## Problema

Mesmo após cadastrar o endereço no Mercado Livre, o erro `address_pending` persiste.

## Causa

O **token OAuth** foi gerado **antes** de você cadastrar o endereço. O token guarda as permissões e status da conta no momento em que foi criado.

## Solução: Reconectar a Conta

### Passo 1: Desconectar

1. Vá em `/integracoes`
2. No card do **Mercado Livre**
3. Clique em **"Desconectar"**

### Passo 2: Verificar Endereço no ML

Antes de reconectar, confirme que o endereço está cadastrado:

1. Acesse: https://www.mercadolivre.com.br/vendas/configuracao/dados
2. Verifique se há um endereço na seção **"Endereço"**
3. Certifique-se que está **completo** (CEP, rua, número, bairro, cidade, estado)
4. Se não estiver, cadastre agora

**IMPORTANTE**: Não é o endereço de "Dados pessoais", é o endereço de **"Vendedor"** em:
- https://www.mercadolivre.com.br/vendas/configuracao/dados

### Passo 3: Reconectar

1. Volte para `/integracoes`
2. Clique em **"Conectar com Mercado Livre"**
3. Autorize novamente no Mercado Livre
4. Você será redirecionado de volta

### Passo 4: Testar

1. Vá em **"Adicionar Produto"**
2. Preencha o formulário
3. Tente publicar novamente

## Se Ainda Não Funcionar

### Opção 1: Verificar Status da Conta

Acesse: https://www.mercadolivre.com.br/vendas/configuracao

Verifique se há algum alerta ou pendência:
- ✅ Identidade verificada
- ✅ Telefone confirmado
- ✅ Email verificado
- ✅ Endereço completo
- ✅ Sem restrições

### Opção 2: Fazer Primeira Venda Manual

Às vezes o Mercado Livre exige que você faça a **primeira publicação manualmente** pelo site:

1. Acesse: https://www.mercadolivre.com.br/vender
2. Clique em "Publicar"
3. Crie um produto de teste
4. Complete todo o fluxo
5. Depois tente pela API novamente

### Opção 3: Aguardar Validação

Se você acabou de cadastrar o endereço:
- Aguarde **algumas horas**
- O Mercado Livre pode estar validando
- Tente novamente mais tarde

### Opção 4: Verificar Tipo de Conta

Sua conta precisa ser de **vendedor**:

1. Acesse: https://www.mercadolivre.com.br/
2. Vá em "Minha conta"
3. Verifique se aparece "Vender" no menu
4. Se não aparecer, você precisa ativar a conta como vendedor

## Checklist Completo

Antes de tentar publicar via API, confirme:

- [ ] Endereço cadastrado em "Vendas > Configuração > Dados"
- [ ] Endereço completo (CEP, rua, número, bairro, cidade, estado)
- [ ] Telefone verificado
- [ ] Email verificado
- [ ] Conta sem restrições
- [ ] Desconectou e reconectou a integração (novo token)
- [ ] Aguardou pelo menos 5 minutos após cadastrar endereço

## Código de Debug

Se quiser ver exatamente o que o ML está retornando, veja os logs do backend no terminal onde rodou `npm run dev`.

Procure por:
```
Erro ML API: {
  "message": "...",
  "cause": [...]
}
```

## Contato com Suporte ML

Se nada funcionar, entre em contato com o suporte do Mercado Livre:
- https://www.mercadolivre.com.br/ajuda
- Categoria: "Vender" → "Problemas com publicação"
- Mencione o erro: `seller.unable_to_list - address_pending`

## Alternativa: Testar com Usuário de Teste

Se você está desenvolvendo, pode usar um **usuário de teste** do Mercado Livre:
- https://developers.mercadolivre.com.br/pt_br/teste-usuarios

Usuários de teste já vêm configurados e prontos para publicar.
