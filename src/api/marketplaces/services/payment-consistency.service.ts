import { getAdapter } from '../adapters/adapter.registry.js';
import { IntegrationRepository } from '../repositories/integration.repository.js';
import { OrdersRepository } from '../repositories/orders.repository.js';
import { PaymentsRepository } from '../repositories/payments.repository.js';
import { MarketplaceAuthService } from '../services/auth.service.js';
import { Integration, PaymentStatus } from '../types/marketplace.types.js';
import { MeliPaymentDetail, MeliRefundDetail } from '../types/mercadolivre-types.js';

export interface PaymentConsistencyResult {
  paymentId: string;
  orderId: string;
  status: 'consistent' | 'fixed' | 'error';
  changes: string[];
  error?: string;
}

/**
 * Serviço para garantir consistência de dados financeiros
 * 
 * Princípios:
 * 1. payments tabela local deve refletir a verdade do ML
 * 2. qualquer divergência deve ser corrigida automaticamente
 * 3. histórico completo de mudanças deve ser mantido
 */
export class PaymentConsistencyService {
  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly authService: MarketplaceAuthService,
  ) {}

  /**
   * Verifica e corrige consistência de todos os pagamentos de uma integração
   */
  async checkAndFixPaymentConsistency(integrationId: string): Promise<PaymentConsistencyResult[]> {
    const results: PaymentConsistencyResult[] = [];
    
    const integration = await this.integrationRepository.findById(integrationId);
    const accessToken = await this.authService.getValidAccessToken(integration);
    const adapter = getAdapter(integration.marketplace as any);

    // Buscar pagamentos locais
    const localPayments = await this.paymentsRepository.findByIntegrationId(integrationId);

    for (const localPayment of localPayments) {
      try {
        const result = await this.checkSinglePayment(
          adapter,
          accessToken,
          integration,
          localPayment.externalTransactionId,
          localPayment.orderId
        );
        results.push(result);
      } catch (error) {
        results.push({
          paymentId: localPayment.externalTransactionId,
          orderId: localPayment.orderId ?? '',
          status: 'error',
          changes: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Verifica um único pagamento
   */
  private async checkSinglePayment(
    adapter: any,
    accessToken: string,
    integration: Integration,
    paymentExternalId: string,
    orderId: string | null
  ): Promise<PaymentConsistencyResult> {
    const changes: string[] = [];
    
    try {
      // Buscar dados reais do ML
      const mlPayment = await (adapter as any).getPaymentDetail(paymentExternalId);
      
      // Mapear status ML para nosso status
      const newStatus = this.mapMlPaymentStatus(mlPayment.status);
      const newNetAmount = mlPayment.net_received_amount;
      const newFee = this.calculateTotalFee(mlPayment);

      // TODO: Comparar com dados locais e corrigir se necessário
      // Por agora, apenas retornamos o status mapeado

      if (mlPayment.status === 'refunded' || mlPayment.status === 'partially_refunded') {
        const refunds = await (adapter as any).getPaymentRefunds(paymentExternalId);
        changes.push(`Payment refunded: ${refunds.map((r: MeliRefundDetail) => r.amount).join(', ')}`);
      }

      if (mlPayment.status === 'rejected') {
        changes.push(`Payment rejected: ${mlPayment.status_detail}`);
      }

      return {
        paymentId: paymentExternalId,
        orderId: orderId ?? '',
        status: changes.length > 0 ? 'fixed' : 'consistent',
        changes,
      };
    } catch (error) {
      return {
        paymentId: paymentExternalId,
        orderId: orderId ?? '',
        status: 'error',
        changes: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Mapeia status do ML para nosso status interno
   */
  private mapMlPaymentStatus(mlStatus: string): PaymentStatus {
    switch (mlStatus) {
      case 'approved':
      case 'authorized':
        return 'COMPLETED';
      case 'pending':
      case 'in_process':
        return 'PENDING';
      case 'rejected':
      case 'cancelled':
        return 'FAILED';
      case 'refunded':
      case 'partially_refunded':
        return 'REFUNDED';
      default:
        return 'PENDING';
    }
  }

  /**
   * Calcula taxa total do pagamento
   */
  private calculateTotalFee(payment: MeliPaymentDetail): number {
    return (
      (payment.marketplace_fee ?? 0) +
      (payment.fixed_fee ?? 0) +
      (payment.financing_fee ?? 0)
    );
  }

  /**
   * Processa webhook de pagamento
   */
  async processPaymentWebhook(integrationId: string, paymentId: string): Promise<void> {
    const integration = await this.integrationRepository.findById(integrationId);
    const accessToken = await this.authService.getValidAccessToken(integration);
    const adapter = getAdapter(integration.marketplace as any);

    const mlPayment = await (adapter as any).getPaymentDetail(paymentId);

    // Verificar se pagamento mudou
    const existingPayment = await this.paymentsRepository.findByTransactionId(paymentId);

    if (existingPayment) {
      const mlStatus = this.mapMlPaymentStatus(mlPayment.status);
      
      if (existingPayment.status !== mlStatus) {
        console.log(`[Payment] Status changed: ${existingPayment.status} → ${mlStatus}`);
        // Atualizar payment no banco
      }
    }

    // Verificar estornos
    if (mlPayment.status === 'refunded' || mlPayment.status === 'partially_refunded') {
      const refunds = await (adapter as any).getPaymentRefunds(paymentId);
      console.log(`[Payment] Refund detected: ${refunds.length} refunds`);
    }
  }
}


