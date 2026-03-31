# Guia - Adicionar Produtos no Mercado Livre

## Como Acessar

1. **Via Integrações**:
   - Vá em `/integracoes`
   - No card do Mercado Livre (conectado)
   - Clique no botão **"Adicionar Produto"**

2. **Via URL direta**:
   - Acesse `/integracoes/adicionar-produto`

## Pré-requisitos

✅ Conta do Mercado Livre conectada  
✅ Token de acesso válido  
✅ Backend rodando (`npm run dev`)

## Campos do Formulário

### Informações Básicas

#### Título do Produto * (obrigatório)
- Máximo 60 caracteres
- Seja descritivo e inclua palavras-chave
- Exemplo: "Furadeira de Impacto 750W Profissional"

#### Condição * (obrigatório)
- **Novo**: Produto nunca usado
- **Usado**: Produto com uso anterior

#### Categoria * (obrigatório)
Categorias disponíveis:
- **MLB1499**: Ferramentas
- **MLB1500**: Construção
- **MLB1648**: Informática
- **MLB1051**: Celulares
- **MLB5726**: Eletrodomésticos

#### Descrição (opcional)
- Descreva características, especificações técnicas
- Inclua informações sobre garantia
- Destaque diferenciais do produto

### Imagens

- **Mínimo**: 1 imagem (obrigatório)
- **Máximo**: 10 imagens
- **Formato**: URL pública da imagem
- **Primeira imagem**: Será a imagem principal do anúncio

**Como adicionar**:
1. Cole a URL da imagem no campo
2. Clique em "Adicionar" ou pressione Enter
3. A imagem aparecerá na galeria
4. Para remover, passe o mouse e clique em "Remover"

**Dica**: Use serviços como Imgur, Cloudinary ou seu próprio servidor para hospedar imagens.

### Preço e Estoque

#### Preço (R$) * (obrigatório)
- Use ponto ou vírgula para decimais
- Exemplo: 299.90 ou 299,90
- Não inclua o símbolo R$

#### Quantidade * (obrigatório)
- Quantidade disponível em estoque
- Número inteiro positivo
- Exemplo: 50

### Tipo de Anúncio

#### Tipo de Listagem * (obrigatório)
- **Clássico** (`gold_special`): Anúncio padrão
- **Premium** (`gold_pro`): Mais destaque, melhor posição
- **Grátis** (`free`): Sem custo, menos visibilidade

## Exemplo Completo

```
Título: Furadeira de Impacto 750W Profissional
Condição: Novo
Categoria: Ferramentas (MLB1499)
Descrição:
  Furadeira de impacto profissional com motor de 750W.
  
  Características:
  - Potência: 750W
  - Velocidade variável: 0-3000 RPM
  - Mandril: 13mm
  - Impacto: 48.000 BPM
  - Bivolt automático
  
  Garantia: 12 meses
  
Imagens:
  1. https://exemplo.com/furadeira-frente.jpg
  2. https://exemplo.com/furadeira-lateral.jpg
  3. https://exemplo.com/furadeira-uso.jpg
  
Preço: 289.90
Quantidade: 50
Tipo: Premium
```

## Fluxo de Publicação

1. **Preencher formulário** com todos os dados
2. **Adicionar pelo menos 1 imagem**
3. **Clicar em "Publicar Produto"**
4. **Aguardar confirmação** (pode levar alguns segundos)
5. **Sucesso**: Produto criado no Mercado Livre
6. **Redirecionamento** para página de integrações

## Mensagens de Sucesso/Erro

### ✅ Sucesso
```
Produto criado com sucesso!
ID: MLB123456789 - Furadeira de Impacto 750W
```

### ❌ Erros Comuns

**"Campos obrigatórios"**
- Preencha título, preço e quantidade

**"Imagem obrigatória"**
- Adicione pelo menos uma imagem

**"Token não encontrado"**
- Reconecte sua conta do Mercado Livre

**"Falha ao criar produto: [erro]"**
- Verifique se todos os campos estão corretos
- Confirme que as URLs das imagens são válidas
- Verifique se o backend está rodando

## Verificar Produto Criado

Após criar o produto:

1. **No Mercado Livre**:
   - Acesse sua conta no ML
   - Vá em "Meus anúncios"
   - Produto aparecerá na lista

2. **Na aplicação**:
   - Vá em `/integracoes`
   - Clique em "Sincronizar agora"
   - Estatísticas serão atualizadas

## Dicas e Boas Práticas

### Título
- ✅ Use palavras-chave relevantes
- ✅ Seja específico (modelo, marca, tamanho)
- ❌ Não use CAPS LOCK excessivo
- ❌ Evite caracteres especiais desnecessários

### Imagens
- ✅ Use imagens de alta qualidade
- ✅ Mostre o produto de vários ângulos
- ✅ Inclua fotos de uso/contexto
- ❌ Não use imagens com marca d'água excessiva

### Preço
- ✅ Pesquise concorrência
- ✅ Considere custos de envio
- ✅ Seja competitivo

### Descrição
- ✅ Seja detalhado e honesto
- ✅ Liste especificações técnicas
- ✅ Mencione garantia e suporte
- ❌ Não faça promessas falsas

## Limitações Atuais

- ⚠️ Não suporta variações (tamanhos, cores)
- ⚠️ Não suporta atributos personalizados
- ⚠️ Categorias limitadas (5 principais)
- ⚠️ Upload de imagem via URL apenas

## Próximas Melhorias

- [ ] Upload de imagens direto do computador
- [ ] Busca de categorias completa
- [ ] Suporte a variações de produto
- [ ] Atributos obrigatórios por categoria
- [ ] Preview do anúncio antes de publicar
- [ ] Edição de produtos existentes
- [ ] Duplicar produto existente

## Troubleshooting

### Imagem não carrega
- Verifique se a URL é pública
- Teste a URL no navegador
- Use HTTPS (não HTTP)

### Erro ao publicar
1. Verifique logs do backend
2. Confirme que token não expirou
3. Teste com dados simples primeiro
4. Verifique se categoria existe

### Produto não aparece no ML
- Aguarde alguns minutos
- Produto pode estar em moderação
- Verifique "Meus anúncios" no ML

## Suporte

- Documentação ML: https://developers.mercadolivre.com.br/pt_br/itens-e-buscas
- API Reference: https://developers.mercadolivre.com.br/pt_br/api-docs-pt-br

## Exemplo de Requisição (Debug)

Se precisar debugar, a requisição enviada é:

```json
POST /api/mercadolivre/items
Authorization: Bearer {access_token}

{
  "title": "Furadeira de Impacto 750W",
  "category_id": "MLB1499",
  "price": 289.90,
  "currency_id": "BRL",
  "available_quantity": 50,
  "buying_mode": "buy_it_now",
  "listing_type_id": "gold_special",
  "condition": "new",
  "pictures": [
    { "source": "https://exemplo.com/img1.jpg" },
    { "source": "https://exemplo.com/img2.jpg" }
  ],
  "sale_terms": [
    {
      "id": "WARRANTY_TYPE",
      "value_name": "Garantia do vendedor"
    },
    {
      "id": "WARRANTY_TIME",
      "value_name": "90 dias"
    }
  ]
}
```

**Nota**: A descrição é adicionada separadamente após criar o item:

```json
POST /api/mercadolivre/items/{ITEM_ID}/description
Authorization: Bearer {access_token}

{
  "plain_text": "Descrição do produto..."
}
```
