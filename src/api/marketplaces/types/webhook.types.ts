/**
 * ML Webhook Events
 * https://developers.mercadolivre.com.br/pt_br/notificacoes
 */

export type MlWebhookTopic =
  | 'orders'        // Novo pedido criado
  | 'order_approved' // Pedido aprovado (pago)
  | 'order_cancelled' // Pedido cancelado
  | 'order_closed'  // Pedido fechado
  | 'invoices'      // Fatura disponível
  | 'payments'      // Pagamento atualizado
  | 'shipments'     // Envio atualizado
  | 'items'         // Item atualizado
  | 'items_liquidations'; // Liquidação de item

export interface MlWebhookPayload {
  topic: MlWebhookTopic;
  resource: string;      // URL do recurso (ex: /orders/123456)
  resource_id: string;   // ID do recurso
  user_id: number;       // ID do vendedor
  application_id: number;
}

export interface MlWebhookEvent {
  topic: MlWebhookTopic;
  resourceId: string;
  userId: string;
  receivedAt: Date;
  rawPayload: MlWebhookPayload;
}

/**
 * Parses incoming webhook payload from ML
 */
export function parseWebhookPayload(body: unknown): MlWebhookPayload | null {
  if (!body || typeof body !== 'object') return null;

  const payload = body as Record<string, unknown>;

  const topic = payload.topic as string | undefined;
  const resource = payload.resource as string | undefined;
  const resource_id = payload.resource_id as string | undefined;
  const user_id = payload.user_id as number | undefined;

  if (!topic || !resource_id || !user_id) return null;

  return {
    topic: topic as MlWebhookTopic,
    resource: resource ?? '',
    resource_id: String(resource_id),
    user_id,
    application_id: (payload.application_id as number) ?? 0,
  };
}

/**
 * Extracts resource ID from ML webhook resource URL
 * Example: /orders/123456789 -> 123456789
 */
export function extractResourceId(resourceUrl: string): string {
  const match = resourceUrl.match(/\/(\d+)$/);
  return match ? match[1] : '';
}