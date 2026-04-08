# Fort Manager

A full-stack e-commerce management dashboard for Brazilian marketplace sellers. Built with React, Express, and Supabase to centralize orders, products, and finances from Mercado Livre and Shopee.

## 🏗 Architecture

```
├── src/                    # React frontend (Vite + TypeScript)
│   ├── api/               # API integration layer
│   │   └── marketplaces/  # Marketplace adapters (ML, Shopee)
│   ├── components/        # UI components (shadcn-ui)
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and API clients
│   └── pages/            # Application pages
│
├── server/               # Express.js backend
│   ├── routes/           # API routes
│   └── index.ts          # Server entry point
│
└── supabase/             # Database migrations
    └── migrations/       # SQL schema definitions
```

## 🛠 Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn-ui
- React Router (routing)
- TanStack Query (server state)
- Recharts (data visualization)
- Zod + React Hook Form (validation)

**Backend:**
- Express.js (API server)
- TypeScript (tsx for hot reload)
- Supabase (database + auth)

**Database:**
- PostgreSQL (via Supabase)
- Row-level security (RLS)

## 📋 Features

- **Dashboard** - Real-time metrics and order overview
- **Orders** - Track and manage orders from multiple marketplaces
- **Products** - Product catalog management
- **Deliveries** - Shipping tracking and status
- **Finance** - Revenue, fees, and payout tracking
- **Integrations** - OAuth connection for Mercado Livre / Shopee

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm or bun
- Supabase account (for database + auth)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/fort-manager.git
cd fort-manager

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Mercado Livre (if using)
VITE_ML_CLIENT_ID=your_ml_client_id
VITE_ML_CLIENT_SECRET=your_ml_client_secret
VITE_ML_REDIRECT_URI=http://localhost:5173/integracoes
```

### Running the Development Server

```bash
# Start both frontend and backend
npm run dev

# Or run them separately:
npm run dev:frontend  # Frontend only (port 8080)
npm run dev:backend   # Backend only (port 3001)
```

### Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## 📁 Project Structure

| Directory | Description |
|-----------|-------------|
| `src/pages/` | React page components (Dashboard, Pedidos, Produtos, etc.) |
| `src/components/ui/` | shadcn-ui component library |
| `src/hooks/` | Custom React hooks (useOrders, useIntegrations) |
| `src/lib/` | API clients, utilities, Supabase config |
| `server/routes/` | Express API routes |
| `supabase/migrations/` | Database schema SQL files |

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## 📦 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (frontend + backend) |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest tests |
| `npm run preview` | Preview production build |

## 🔌 API Endpoints

### Marketplace Integration

- `GET /api/marketplaces` - List connected integrations
- `POST /api/marketplaces/:marketplace/auth-url` - Get OAuth URL
- `POST /api/marketplaces/:marketplace/callback` - Handle OAuth callback
- `POST /api/marketplaces/:id/sync` - Trigger manual sync
- `GET /api/marketplaces/orders` - List all orders
- `GET /api/marketplaces/finance/summary` - Financial summary

### Mercado Livre (Legacy)

- `POST /api/mercadolivre/token` - Exchange auth code
- `POST /api/mercadolivre/token/refresh` - Refresh token
- `GET /api/mercadolivre/user/:id` - Get user data
- `GET /api/mercadolivre/items` - List items
- `POST /api/mercadolivre/items` - Create item

## 🗄 Database Schema

The database includes these main tables:

- `integrations` - Connected marketplace accounts
- `orders` - Synced orders from marketplaces
- `order_items` - Line items for each order
- `payments` - Payment transactions
- `fees` - Marketplace fees
- `payouts` - Payout/repasse records

See `supabase/migrations/` for the complete schema.

## 📄 License

MIT License - feel free to use this project for your own purposes.