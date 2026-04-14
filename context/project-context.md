# Fort Manager - Contexto do Projeto

## Visão Geral

**Fort Manager** é um painel de gerenciamento de e-commerce para vendedores brasileiros em marketplaces. O projeto integra pedidos, produtos e finanças do Mercado Livre e Shopee em uma única plataforma.

## Stack Tecnológica

### Frontend
- **React 18** + TypeScript
- **Vite** (build tool)
- **Tailwind CSS** + shadcn-ui
- **React Router** (roteamento)
- **TanStack Query** (estado do servidor)
- **Recharts** (visualização de dados)
- **Zod** + React Hook Form (validação)
- **Supabase** (auth + banco de dados)

### Backend
- **Express.js** (servidor API)
- **TypeScript** (tsx para hot reload)

### Banco de Dados
- **PostgreSQL** via Supabase
- Row-level security (RLS)

## Estrutura de Diretórios

```
fort-manager/
├── src/                          # Frontend React
│   ├── pages/                    # Páginas da aplicação
│   │   ├── Dashboard.tsx         # Métricas e overview
│   │   ├── Pedidos.tsx           # Gestão de pedidos
│   │   ├── Produtos.tsx          # Catálogo de produtos
│   │   ├── Entregas.tsx          # Rastreamento de entregas
│   │   ├── Financeiro.tsx        # Receitas, taxas e payouts
│   │   ├── Integracoes.tsx       # Conexão OAuth marketplaces
│   │   ├── AdicionarProdutoML.tsx
│   │   ├── AuthCallback.tsx      # Callback OAuth
│   │   └── DiagnosticoML.tsx     # Diagnóstico de integração ML
│   │
│   ├── components/
│   │   ├── ui/                   # Componentes shadcn-ui
│   │   ├── AppLayout.tsx         # Layout principal
│   │   ├── Sidebar.tsx           # Menu lateral
│   │   └── NavLink.tsx           # Link de navegação
│   │
│   ├── lib/                      # Utilitários e clientes API
│   │   ├── supabase.ts           # Configuração Supabase
│   │   ├── mercadoLivre.ts       # API Mercado Livre
│   │   ├── marketplaceApi.ts     # Adaptadores de marketplace
│   │   ├── apiOrigin.ts          # URL da API
│   │   └── utils.ts              # Funções utilitárias
│   │
│   ├── hooks/                    # Custom React hooks
│   │   └── (hooks personalizados para orders, integrations, etc.)
│   │
│   └── api/                      # Camada de integração API
│       └── marketplaces/          # Adaptadores ML, Shopee
│
├── server/                       # Backend Express.js
│   ├── routes/                   # Rotas da API
│   │   ├── index.ts
│   │   ├── marketplace.ts
│   │   ├── orders.ts
│   │   ├── products.ts
│   │   └── financeiro.ts
│   ├── index.ts                  # Entry point do servidor
│   └── app.ts                    # Configuração Express
│
└── supabase/
    └── migrations/               # Schema do banco de dados
```

## Funcionalidades

1. **Dashboard** - Métricas em tempo real e overview de pedidos
2. **Pedidos** - Rastreamento e gestão de pedidos de múltiplos marketplaces
3. **Produtos** - Gestão do catálogo de produtos
4. **Entregas** - Rastreamento de envio e status
5. **Financeiro** - Receitas, taxas e acompanhamento de payouts
6. **Integrações** - Conexão OAuth para Mercado Livre / Shopee

## Variáveis de Ambiente

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Mercado Livre
VITE_ML_CLIENT_ID=your_ml_client_id
VITE_ML_CLIENT_SECRET=your_ml_client_secret
VITE_ML_REDIRECT_URI=http://localhost:5173/integracoes
```

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia frontend + backend |
| `npm run dev:frontend` | Frontend only (port 5173) |
| `npm run dev:backend` | Backend only (port 3001) |
| `npm run build` | Build para produção |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest tests |

## Tabelas do Banco de Dados

- `integrations` - Contas de marketplace conectadas
- `orders` - Pedidos sincronizados
- `order_items` - Itens de cada pedido
- `payments` - Transações de pagamento
- `fees` - Taxas dos marketplaces
- `payouts` - Registros de payout/repasse

## Convenções de Código

- TypeScript com tipagem explícita
- Componentes funcionais com hooks
- shadcn-ui para componentes base
- React Router para navegação
- TanStack Query para fetching de dados
- Zod para validação de schemas