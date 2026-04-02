// ─── Auth ────────────────────────────────────────────────────────────────────

export interface MeliTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;       // segundos (21600 = 6h)
    scope: string;
    user_id: number;
    refresh_token: string;
  }
  
  export interface MeliCredentials {
    app_id: string;
    client_secret: string;
    redirect_uri: string;
    access_token: string;
    refresh_token: string;
    user_id: number;
    expires_at: Date;         // calculado: Date.now() + expires_in * 1000
  }
  
  // ─── Usuário ─────────────────────────────────────────────────────────────────
  
  export interface MeliUser {
    id: number;
    nickname: string;
    site_id: string;
    email: string;
    seller_reputation: {
      level_id: string | null;
      transactions: { total: number; completed: number; canceled: number };
    };
  }
  
  // ─── Item / Anúncio ──────────────────────────────────────────────────────────
  
  export type MeliListingType = 'gold_pro' | 'gold_special' | 'gold_premium' | 'free';
  export type MeliCondition  = 'new' | 'used';
  export type MeliItemStatus = 'active' | 'paused' | 'closed' | 'under_review' | 'inactive';
  
  export interface MeliItemSearchResult {
    seller_id: number;
    results: string[];          // array de item IDs
    paging: { limit: number; offset: number; total: number };
  }
  
  export interface MeliItem {
    id: string;
    title: string;
    category_id: string;
    price: number;
    currency_id: string;
    available_quantity: number;
    sold_quantity: number;
    condition: MeliCondition;
    listing_type_id: MeliListingType;
    status: MeliItemStatus;
    thumbnail: string;
    permalink: string;
    date_created: string;
    last_updated: string;
    pictures?: Array<{ id: string; url: string }>;
    description?: { plain_text: string };
    attributes?: Array<{ id: string; name: string; value_name: string }>;
    shipping?: { free_shipping: boolean; mode: string };
    seller_custom_field?: string;  // SKU do vendedor
  }
  
  export interface MeliCreateItemPayload {
    title: string;
    category_id: string;
    price: number;
    currency_id: string;         // 'BRL' para MLB
    available_quantity: number;
    buying_mode: 'buy_it_now';
    condition: MeliCondition;
    listing_type_id: MeliListingType;
    description?: { plain_text: string };
    pictures?: Array<{ source: string }>;
    attributes?: Array<{ id: string; value_name: string }>;
    shipping?: { mode: string; free_shipping: boolean };
    seller_custom_field?: string;
  }
  
  export interface MeliUpdateItemPayload {
    title?: string;
    price?: number;
    available_quantity?: number;
    status?: MeliItemStatus;
  }
  
  // ─── Pedidos ─────────────────────────────────────────────────────────────────
  
  export type MeliOrderStatus =
    | 'confirmed'
    | 'payment_required'
    | 'payment_in_process'
    | 'partially_paid'
    | 'paid'
    | 'cancelled';
  
  export interface MeliOrder {
    id: number;
    date_created: string;
    last_updated: string;
    date_closed: string;
    pack_id: number | null;
    status: MeliOrderStatus;
    total_amount: number;
    paid_amount: number;
    currency_id: string;
    shipping_cost: number;
    buyer: { id: number; nickname: string };
    seller: { id: number; nickname: string };
    order_items: Array<{
      item: { id: string; title: string; seller_sku: string | null };
      quantity: number;
      unit_price: number;
      full_unit_price: number;
      sale_fee: number;
    }>;
    payments: Array<{
      id: string;
      status: string;
      transaction_amount: number;
      date_created: string;
    }>;
    shipping: { id: number; status: string } | null;
    tags: string[];
  }
  
  export interface MeliOrderSearchResult {
    query: string;
    results: MeliOrder[];
    paging: { limit: number; offset: number; total: number };
  }
  
  // ─── Financeiro ──────────────────────────────────────────────────────────────
  
  export interface MeliPayment {
    id: string;
    date_created: string;
    date_approved: string;
    status: string;
    status_detail: string;
    transaction_amount: number;
    total_paid_amount: number;
    net_amount: number;
    fee_details: Array<{ type: string; amount: number; fee_payer: string }>;
    currency_id: string;
    order_id: number;
  }
  
  export interface MeliAccountMovement {
    id: string;
    date: string;
    type:
      | 'creditPayment'
      | 'debitFee'
      | 'debitShipping'
      | 'creditRefund'
      | 'debitRefund'
      | 'debitDiscount';
    amount: number;
    currency_id: string;
    description: string;
    order_id?: number;
  }
  
  export interface MeliBalanceSummary {
    available: number;
    unavailable: number;
    currency_id: string;
  }
  
  export interface MeliShop {
    id: number;
    name: string;
    permalink: string;
    seller_reputation:{
      level_id: string;
      power_seller_status: string;
      transactions: {
        total: number;
        completed: number;
        canceled: number;
      };
    };
    buyer_reputation: {
      level_id: string;
      power_seller_status: string;
      transactions: {
        total: number;
        completed: number;
        canceled: number;
    }
  }
  }
    