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
  
  // Variações (SKU)
  export interface MeliItemVariation {
    id: number;
    item_id: string;
    price: number;
    attribute_combinations: Array<{
      id: string;
      name: string;
      value_id: string | null;
      value_name: string;
    }>;
    available_quantity: number;
    sold_quantity: number;
    picture_ids: string[];
    seller_custom_field?: string;  // SKU da variação
    start_time: string;
    last_update: string;
  }

  // Atributos (características do produto)
  export interface MeliItemAttribute {
    id: string;
    name: string;
    value_name: string | null;
    value_id: string | null;
  }

  // Imagem
  export interface MeliItemPicture {
    id: string;
    url: string;
    secure_url: string;
    size: string;
    max_size: string;
    quality: string;
  }

  // Item completo com variações
  export interface MeliItemWithVariations extends MeliItem {
    variations: MeliItemVariation[];
    attributes: MeliItemAttribute[];
    pictures: MeliItemPicture[];
  }

  // Dados para atualizar preço/estoque
  export interface MeliInventoryUpdate {
    itemId: string;
    variationId?: number;
    price?: number;
    available_quantity?: number;
    seller_custom_field?: string;  // SKU
  }

  // Resposta da atualização
  export interface MeliInventoryUpdateResponse {
    id: string;
    status: MeliItemStatus;
    price: number;
    available_quantity: number;
    variations: MeliItemVariation[];
  }
  
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

  // ─── Payments / Pagamentos ───────────────────────────────────────────────
  
  /**
   * Status de pagamento ML
   * https://developers.mercadopago.com.br/pt-br/reference/payments
   */
  export type MeliPaymentStatus = 
    | 'pending'           // Aguardando pagamento
    | 'approved'          // Pagamento aprovado
    | 'authorized'        // Pagamento autorizado (não capturado)
    | 'in_process'        // Em análise
    | 'in_mediation'      // Em disputa/mediação
    | 'rejected'          // Pagamento recusado
    | 'cancelled'         // Pagamento cancelado
    | 'refunded'          // Estornado (devolução total)
    | 'partially_refunded'; // Estorno parcial

  export interface MeliPaymentDetail {
    id: string;
    order_id: number;
    merchant_order_id: number;
    status: MeliPaymentStatus;
    status_detail: string;
    payment_type: string;                 // 'credit_card', 'ticket', 'account_money'
    payment_method_id: string;            // 'master', 'bolbradesco', etc
    transaction_amount: number;          // Valor total
    transaction_amount_refunded: number;  // Valor estornado
    currency_id: string;
    
    // Valores detalhados
    net_received_amount: number;          // Valor líquido recebido
    total_paid_amount: number;            // Total pago pelo cliente
    shipping_cost: number;
    discount_amount: number;
    
    // Taxas
    marketplace_fee: number;              // Taxa do ML
    fixed_fee: number;                    // Taxa fixa
    financing_fee: number;                // Taxa de parcelamento
    
    // Datas
    date_approved: string | null;
    date_created: string;
    date_last_updated: string;
    date_of_expiration: string | null;
    
    // Dados do cartão (se適用)
    card?: {
      id: string;
      last_four_digits: string;
      card_brand: string;
      cardholder: {
        name: string;
        identification: { type: string; number: string };
      };
    };
    
    // Identificação
    payer: {
      id: number;
      email: string;
      identification: { type: string; number: string } | null;
    };
    
    //维权
    external_reference: string | null;
    description: string | null;
  }

  // ─── Refunds / Estornos ──────────────────────────────────────────────────
  
  /**
   * Status de estorno
   */
  export type MeliRefundStatus = 
    | 'pending'     // Estorno em processamento
    | 'approved'    // Estorno aprovado
    | 'rejected'    // Estorno recusado
    | 'cancelled';  // Estorno cancelado

  export interface MeliRefund {
    id: string;
    payment_id: string;
    amount: number;
    currency_id: string;
    status: MeliRefundStatus;
    reason: string | null;               // Motivo do estorno
    external_reference: string | null;
    
    // Datas
    date_created: string;
    date_approved: string | null;
    date_last_updated: string;
    
    // Relacionamentos
    payment_status: string;               // Status do pagamento associado
    order_id: number | null;
    
    // Movimento relacionado
    movement_type: 'current_account' | 'card'; // Tipo de movimentação
  }

  /**
   * Dados detalhados de estorno
   */
  export interface MeliRefundDetail extends MeliRefund {
    refund_mode: string;                  // 'instant', 'standard'
    amount_refunded_to_payer: number;     // Valor retornado ao cliente
    amount_refunded_from_platform: number; // Valor retornado pela plataforma
  }

  // ─── Shipments / Envios ─────────────────────────────────────────────────────
  
  /**
   * Status de envio ML
   * https://developers.mercadolivre.com.br/pt_br/gerenciamento-de-envios
   */
  export type MeliShipmentStatus = 
    | 'pending'           // Pendente de aprovação
    | 'approved'          // Aprovado, pronto para postagem
    | 'in_transit'        // Em trânsito
    | 'delivered'         // Entregue
    | 'cancelled'         // Cancelado
    | 'not_delivered';    // Não entregue

  export interface MeliShipment {
    id: number;
    order_id: number;
    status: MeliShipmentStatus;
    status_history: {
      date: string;
      status: string;
      description: string;
    }[];
    tracking_number: string | null;       // Código de rastreamento
    tracking_method: string | null;        // Método (PAC, SEDEX, etc)
    carrier_id: number | null;
    carrier_name: string | null;
    shipping_option: {
      id: number;
      name: string;
      currency_id: string;
      cost: number;
      delivery_type: string;               // 'drop_off', 'home_delivery'
    };
    sender_id: number;
    receiver_id: number;
    receiver_address: {
      id: number;
      address_line: string;
      street: string;
      street_number: string;
      complement: string | null;
      city: { id: string; name: string };
      state: { id: string; name: string };
      country: { id: string; name: string };
      zip_code: string;
      latitude: number | null;
      longitude: number | null;
    };
    created_at: string;
    updated_at: string;
    delivery_date: string | null;
  }

  /**
   * Resposta ao criar uma etiqueta de envio
   */
  export interface MeliShipmentLabelResponse {
    shipment_id: number;
    tracking_number: string;
    tracking_method: string;
    label_url: string;           // URL do PDF da etiqueta
    label_format: string;        // 'pdf', 'zpl', 'zpl2'
  }

  /**
   * Dados para criar/imprimir etiqueta
   */
  export interface MeliCreateShipmentParams {
    order_id: number;
    shipping_option_id: number;
    sender_id?: number;
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
    