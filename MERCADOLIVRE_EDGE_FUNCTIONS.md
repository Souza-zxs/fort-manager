# Supabase Edge Functions — Integração Mercado Livre

> Funções Deno implantadas em `supabase/functions/`. Cada diretório corresponde a uma função.
> Deploy: `supabase functions deploy <nome-da-função>`

---

## Variáveis de Ambiente (Supabase Secrets)

Configure no painel **Project Settings → Edge Functions → Secrets** ou via CLI:

```bash
supabase secrets set MELI_APP_ID=<seu_app_id>
supabase secrets set MELI_CLIENT_SECRET=<seu_client_secret>
supabase secrets set MELI_REDIRECT_URI=https://seudominio.com/integracoes
supabase secrets set SUPABASE_URL=https://<project>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

---

## 1. `integration-auth-start` — Gera a URL de autorização OAuth

```
POST /functions/v1/integration-auth-start
Body: { "marketplace": "mercadolivre" }
```

```typescript
// supabase/functions/integration-auth-start/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MELI_AUTH_URL  = "https://auth.mercadolivre.com.br/authorization";
const MELI_APP_ID    = Deno.env.get("MELI_APP_ID")!;
const MELI_REDIRECT  = Deno.env.get("MELI_REDIRECT_URI")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { marketplace } = await req.json() as { marketplace: string };

    if (marketplace !== "mercadolivre") {
      return new Response(
        JSON.stringify({ error: `Marketplace '${marketplace}' não suportado` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // state aleatório para proteção CSRF
    const state = crypto.randomUUID();

    const params = new URLSearchParams({
      response_type: "code",
      client_id:     MELI_APP_ID,
      redirect_uri:  MELI_REDIRECT,
      state,
    });

    const url = `${MELI_AUTH_URL}?${params.toString()}`;

    return new Response(
      JSON.stringify({ url, state }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
```

---

## 2. `integration-ml-callback` — Troca o `code` por tokens e salva a integração

```
POST /functions/v1/integration-ml-callback
Headers: Authorization: Bearer <supabase_jwt>
Body: { "code": "<authorization_code>", "state": "<state>" }
```

```typescript
// supabase/functions/integration-ml-callback/index.ts
import { serve }       from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ML_TOKEN_URL   = "https://api.mercadolibre.com/oauth/token";
const ML_API_BASE    = "https://api.mercadolibre.com";
const MELI_APP_ID    = Deno.env.get("MELI_APP_ID")!;
const MELI_SECRET    = Deno.env.get("MELI_CLIENT_SECRET")!;
const MELI_REDIRECT  = Deno.env.get("MELI_REDIRECT_URI")!;
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MeliTokenResponse {
  access_token:  string;
  refresh_token: string;
  expires_in:    number;
  user_id:       number;
  scope:         string;
  token_type:    string;
}

interface MeliUser {
  id:       number;
  nickname: string;
  email:    string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Autenticação: extrai user_id do JWT do Supabase
  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) {
    return new Response(
      JSON.stringify({ error: "Não autenticado" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Token inválido" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const { code } = await req.json() as { code: string; state?: string };

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Parâmetro "code" é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1. Trocar code por access_token
    // POST https://api.mercadolibre.com/oauth/token
    // Body: application/x-www-form-urlencoded
    //   grant_type=authorization_code
    //   client_id=<APP_ID>
    //   client_secret=<SECRET_KEY>
    //   code=<AUTHORIZATION_CODE>
    //   redirect_uri=<REDIRECT_URI>
    const tokenParams = new URLSearchParams({
      grant_type:    "authorization_code",
      client_id:     MELI_APP_ID,
      client_secret: MELI_SECRET,
      code,
      redirect_uri:  MELI_REDIRECT,
    });

    const tokenRes = await fetch(ML_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:   tokenParams,
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.json() as { error?: string; message?: string };
      throw new Error(errBody.error ?? errBody.message ?? `HTTP ${tokenRes.status}`);
    }

    const tokens = await tokenRes.json() as MeliTokenResponse;

    // 2. Buscar dados do vendedor
    const userRes = await fetch(`${ML_API_BASE}/users/${tokens.user_id}`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const meliUser = await userRes.json() as MeliUser;

    // 3. Salvar/atualizar integração no Supabase
    const accessExpiresAt  = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const refreshExpiresAt = new Date(Date.now() + 15_552_000 * 1000).toISOString(); // ~180 dias

    const { data: integration, error: dbError } = await supabase
      .from("integrations")
      .upsert({
        user_id:               user.id,
        marketplace:           "mercadolivre",
        shop_id:               String(tokens.user_id),
        shop_name:             meliUser.nickname,
        access_token:          tokens.access_token,
        refresh_token:         tokens.refresh_token,
        access_token_expires:  accessExpiresAt,
        refresh_token_expires: refreshExpiresAt,
        is_active:             true,
      }, {
        onConflict: "user_id, marketplace, shop_id",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (dbError) throw new Error(dbError.message);

    return new Response(
      JSON.stringify({
        id:          integration.id,
        marketplace: "mercadolivre",
        shopName:    meliUser.nickname,
        shopId:      String(tokens.user_id),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[integration-ml-callback]", (err as Error).message);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
```

---

## 3. `integration-list` — Lista integrações do usuário

```
GET /functions/v1/integration-list
Headers: Authorization: Bearer <supabase_jwt>
```

```typescript
// supabase/functions/integration-list/index.ts
import { serve }        from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient }  from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) {
    return new Response(
      JSON.stringify({ error: "Não autenticado" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Token inválido" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data, error } = await supabase
    .from("integrations")
    .select("id, marketplace, shop_name, shop_id, is_active, created_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const integrations = (data ?? []).map((row) => ({
    id:          row.id,
    marketplace: row.marketplace,
    shopName:    row.shop_name,
    shopId:      row.shop_id,
    isActive:    row.is_active,
    createdAt:   row.created_at,
  }));

  return new Response(
    JSON.stringify(integrations),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
```

---

## 4. `integration-sync` — Dispara sincronização de pedidos

```
POST /functions/v1/integration-sync
Headers: Authorization: Bearer <supabase_jwt>
Body: { "integrationId": "<uuid>" }
```

```typescript
// supabase/functions/integration-sync/index.ts
import { serve }        from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient }  from "https://esm.sh/@supabase/supabase-js@2";

const ML_API_BASE  = "https://api.mercadolibre.com";
const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token";
const MELI_APP_ID  = Deno.env.get("MELI_APP_ID")!;
const MELI_SECRET  = Deno.env.get("MELI_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshMeliToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type:    "refresh_token",
    client_id:     MELI_APP_ID,
    client_secret: MELI_SECRET,
    refresh_token: refreshToken,
  });

  const res = await fetch(ML_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:   params,
  });

  if (!res.ok) {
    const body = await res.json() as { error?: string };
    throw new Error(`Refresh token falhou: ${body.error ?? res.status}`);
  }

  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Token inválido" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { integrationId } = await req.json() as { integrationId: string };

    // 1. Buscar integração
    const { data: integration, error: intErr } = await supabase
      .from("integrations")
      .select("*")
      .eq("id", integrationId)
      .eq("user_id", user.id)
      .single();

    if (intErr || !integration) {
      return new Response(JSON.stringify({ error: "Integração não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken: string = integration.access_token;

    // 2. Renovar token se expirado ou prestes a expirar (< 5 min)
    const expiresAt  = new Date(integration.access_token_expires).getTime();
    const fiveMinMs  = 5 * 60 * 1000;
    if (Date.now() + fiveMinMs >= expiresAt) {
      const renewed = await refreshMeliToken(integration.refresh_token);
      accessToken   = renewed.access_token;

      await supabase
        .from("integrations")
        .update({
          access_token:         renewed.access_token,
          refresh_token:        renewed.refresh_token,
          access_token_expires: new Date(Date.now() + renewed.expires_in * 1000).toISOString(),
        })
        .eq("id", integrationId);
    }

    // 3. Buscar pedidos das últimas 24h
    const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const ordersRes = await fetch(
      `${ML_API_BASE}/orders/search?seller=${integration.shop_id}&sort=date_desc&limit=50&order.date_created.from=${encodeURIComponent(dateFrom)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!ordersRes.ok) {
      throw new Error(`Erro ao buscar pedidos: HTTP ${ordersRes.status}`);
    }

    const { results: orders } = await ordersRes.json() as { results: Array<{
      id: number;
      status: string;
      total_amount: number;
      currency_id: string;
      date_created: string;
      date_closed: string | null;
      buyer: { nickname: string };
      shipping?: { id: number };
      order_items: Array<{ item: { id: string; title: string }; quantity: number; unit_price: number }>;
    }> };

    let ordersSynced   = 0;
    let paymentsSynced = 0;
    const errors: string[] = [];

    for (const order of orders) {
      try {
        // Upsert do pedido
        const { data: savedOrder, error: orderErr } = await supabase
          .from("orders")
          .upsert({
            integration_id:    integrationId,
            external_order_id: String(order.id),
            status:            order.status.toUpperCase(),
            total_amount:      order.total_amount,
            currency:          order.currency_id,
            buyer_username:    order.buyer.nickname,
            shipping_carrier:  "",
            tracking_number:   "",
            paid_at:           order.date_closed,
            order_created_at:  order.date_created,
            order_updated_at:  order.date_created,
            synced_at:         new Date().toISOString(),
          }, { onConflict: "integration_id, external_order_id", ignoreDuplicates: false })
          .select("id")
          .single();

        if (orderErr || !savedOrder) {
          errors.push(`Pedido ${order.id}: ${orderErr?.message ?? "upsert falhou"}`);
          continue;
        }

        ordersSynced++;

        // Upsert dos itens do pedido
        for (const item of order.order_items) {
          await supabase.from("order_items").upsert({
            order_id:          savedOrder.id,
            external_item_id:  item.item.id,
            title:             item.item.title,
            quantity:          item.quantity,
            unit_price:        item.unit_price,
          }, { onConflict: "order_id, external_item_id", ignoreDuplicates: false });
        }

        // Buscar pagamento do pedido
        const payRes = await fetch(
          `${ML_API_BASE}/orders/${order.id}/payments`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        if (payRes.ok) {
          const payments = await payRes.json() as Array<{
            id: number;
            status: string;
            transaction_amount: number;
            currency_id: string;
            payment_method_id: string;
            date_approved: string | null;
          }>;

          for (const payment of payments) {
            const { error: payErr } = await supabase.from("payments").upsert({
              order_id:           savedOrder.id,
              external_payment_id: String(payment.id),
              status:             payment.status.toUpperCase(),
              amount:             payment.transaction_amount,
              currency:           payment.currency_id,
              payment_method:     payment.payment_method_id,
              paid_at:            payment.date_approved,
            }, { onConflict: "order_id, external_payment_id", ignoreDuplicates: false });

            if (!payErr) paymentsSynced++;
          }
        }
      } catch (orderError) {
        errors.push(`Pedido ${order.id}: ${(orderError as Error).message}`);
      }
    }

    // 4. Atualizar última sincronização
    await supabase
      .from("integrations")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", integrationId);

    return new Response(
      JSON.stringify({
        integrationId,
        marketplace:    integration.marketplace,
        shopId:         integration.shop_id,
        ordersSynced,
        paymentsSynced,
        errors,
        syncedAt:       new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[integration-sync]", (err as Error).message);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
```

---

## 5. `integration-disconnect` — Desativa uma integração

```
POST /functions/v1/integration-disconnect
Headers: Authorization: Bearer <supabase_jwt>
Body: { "integrationId": "<uuid>" }
```

```typescript
// supabase/functions/integration-disconnect/index.ts
import { serve }        from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient }  from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Token inválido" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { integrationId } = await req.json() as { integrationId: string };

    const { error } = await supabase
      .from("integrations")
      .update({ is_active: false, access_token: null, refresh_token: null })
      .eq("id", integrationId)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    return new Response(
      JSON.stringify({ message: "Integração desconectada com sucesso" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
```

---

## 6. `integration-refresh-token` — Renova tokens automaticamente (cron job)

Agende no painel **Database → Functions → Cron jobs** para rodar a cada hora:
`0 * * * *` → `supabase/functions/integration-refresh-token`

```typescript
// supabase/functions/integration-refresh-token/index.ts
import { serve }        from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient }  from "https://esm.sh/@supabase/supabase-js@2";

const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token";
const MELI_APP_ID  = Deno.env.get("MELI_APP_ID")!;
const MELI_SECRET  = Deno.env.get("MELI_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Busca integrações ativas com token expirando em menos de 1h
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { data: integrations, error } = await supabase
    .from("integrations")
    .select("id, refresh_token")
    .eq("marketplace", "mercadolivre")
    .eq("is_active", true)
    .lt("access_token_expires", oneHourFromNow);

  if (error || !integrations?.length) {
    return new Response(JSON.stringify({ renewed: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let renewed = 0;
  const errors: string[] = [];

  for (const integration of integrations) {
    if (!integration.refresh_token) continue;

    try {
      const params = new URLSearchParams({
        grant_type:    "refresh_token",
        client_id:     MELI_APP_ID,
        client_secret: MELI_SECRET,
        refresh_token: integration.refresh_token,
      });

      const res = await fetch(ML_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:   params,
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const tokens = await res.json() as {
        access_token:  string;
        refresh_token: string;
        expires_in:    number;
      };

      await supabase
        .from("integrations")
        .update({
          access_token:         tokens.access_token,
          refresh_token:        tokens.refresh_token,
          access_token_expires: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        })
        .eq("id", integration.id);

      renewed++;
    } catch (err) {
      errors.push(`${integration.id}: ${(err as Error).message}`);
    }
  }

  console.log(`[refresh-token] renewed=${renewed} errors=${errors.length}`);

  return new Response(
    JSON.stringify({ renewed, errors }),
    { headers: { "Content-Type": "application/json" } },
  );
});
```

---

## Como implantar todas as funções de uma vez

```bash
# Instale o Supabase CLI se ainda não tiver
npm install -g supabase

# Faça login
supabase login

# Link ao projeto
supabase link --project-ref <project_id>

# Configure os secrets
supabase secrets set \
  MELI_APP_ID=<app_id> \
  MELI_CLIENT_SECRET=<secret> \
  MELI_REDIRECT_URI=https://seudominio.com/integracoes

# Deploy de todas as funções
supabase functions deploy integration-auth-start
supabase functions deploy integration-ml-callback
supabase functions deploy integration-list
supabase functions deploy integration-sync
supabase functions deploy integration-disconnect
supabase functions deploy integration-refresh-token
```

---

## Estrutura de diretórios esperada

```
supabase/
├── functions/
│   ├── integration-auth-start/
│   │   └── index.ts
│   ├── integration-ml-callback/
│   │   └── index.ts
│   ├── integration-list/
│   │   └── index.ts
│   ├── integration-sync/
│   │   └── index.ts
│   ├── integration-disconnect/
│   │   └── index.ts
│   └── integration-refresh-token/
│       └── index.ts
└── migrations/
    └── 20260331000000_initial_schema.sql
```

---

## Mapeamento Frontend → Edge Function

| Ação no frontend           | Edge Function chamada        |
|----------------------------|------------------------------|
| Clicar "Conectar ML"       | `integration-auth-start`     |
| Retorno do OAuth (callback)| `integration-ml-callback`    |
| Listar integrações         | `integration-list`           |
| Sincronizar manualmente    | `integration-sync`           |
| Desconectar                | `integration-disconnect`     |
| Renovação automática       | `integration-refresh-token`  |

> **Nota**: O hook `useIntegrations.ts` do frontend chama as funções via
> `supabase.functions.invoke('<nome-da-funcao>', { body: ... })`.
