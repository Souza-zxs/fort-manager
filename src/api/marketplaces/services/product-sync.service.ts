import { getAdapter } from '../adapters/adapter.registry.js';
import { IntegrationRepository } from '../repositories/integration.repository.js';
import { MarketplaceAuthService } from '../services/auth.service.js';
import { Integration } from '../types/marketplace.types.js';

export interface SyncProductResult {
  productId: string;
  mlItemId: string;
  status: 'created' | 'updated' | 'unchanged' | 'error';
  changes: string[];
  error?: string;
}

export interface BulkSyncResult {
  total: number;
  success: number;
  errors: number;
  results: SyncProductResult[];
}

/**
 * Serviço de sincronização de produtos
 * 
 * Fluxos:
 * 1. Pull: ML → Banco local (buscar itens e salvar)
 * 2. Push: Banco local → ML (atualizar preço/estoque)
 * 3. Bulk: Atualização em massa
 */
export class ProductSyncService {
  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly authService: MarketplaceAuthService,
  ) {}

  /**
   * Sincroniza todos os produtos de uma integração
   * Pull: busca do ML e salva no banco local
   */
  async syncAllProducts(integrationId: string): Promise<BulkSyncResult> {
    const integration = await this.integrationRepository.findById(integrationId);
    const accessToken = await this.authService.getValidAccessToken(integration);
    const adapter = getAdapter(integration.marketplace as any);
    
    const userId = integration.extra?.['user_id'] as number;
    if (!userId) {
      throw new Error('user_id não encontrado nas credenciais');
    }

    const results: SyncProductResult[] = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      // Buscar IDs dos itens
      const searchResult = await (adapter as any).searchItems(userId, {
        offset,
        limit,
        status: 'active',
      });

      if (searchResult.results.length === 0) {
        hasMore = false;
        continue;
      }

      // Buscar detalhes em batch (máx 20 por chamada)
      const batches = this.chunkArray(searchResult.results, 20);
      for (const batch of batches) {
        const items = await (adapter as any).getItemsBatch(batch);
        
        for (const item of items) {
          try {
            const result = await this.processItem(integrationId, item);
            results.push(result);
          } catch (error) {
            results.push({
              productId: item.id,
              mlItemId: item.id,
              status: 'error',
              changes: [],
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      offset += limit;
      hasMore = offset < searchResult.paging.total;
    }

    return {
      total: results.length,
      success: results.filter(r => r.status !== 'error').length,
      errors: results.filter(r => r.status === 'error').length,
      results,
    };
  }

  /**
   * Processa um item individual (salva no banco)
   */
  private async processItem(integrationId: string, item: any): Promise<SyncProductResult> {
    // TODO: Salvar no banco local via ProductsRepository
    // Por agora, apenas retorna o resultado
    
    const changes: string[] = [];
    const hasVariations = item.variations && item.variations.length > 0;
    
    if (hasVariations) {
      changes.push(`Variações: ${item.variations.length}`);
    }

    return {
      productId: item.id,
      mlItemId: item.id,
      status: 'created',
      changes,
    };
  }

  /**
   * Atualiza preço de um produto no ML
   * Push: Banco local → ML
   */
  async updatePrice(integrationId: string, mlItemId: string, newPrice: number): Promise<SyncProductResult> {
    const integration = await this.integrationRepository.findById(integrationId);
    const accessToken = await this.authService.getValidAccessToken(integration);
    const adapter = getAdapter(integration.marketplace as any);

    try {
      const updated = await (adapter as any).updateItem(mlItemId, { price: newPrice });
      
      return {
        productId: mlItemId,
        mlItemId: mlItemId,
        status: 'updated',
        changes: [`price: ${updated.price}`],
      };
    } catch (error) {
      return {
        productId: mlItemId,
        mlItemId: mlItemId,
        status: 'error',
        changes: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Atualiza estoque de um produto ou variação no ML
   */
  async updateStock(
    integrationId: string,
    mlItemId: string,
    quantity: number,
    sku?: string,
  ): Promise<SyncProductResult> {
    const integration = await this.integrationRepository.findById(integrationId);
    const accessToken = await this.authService.getValidAccessToken(integration);
    const adapter = getAdapter(integration.marketplace as any);

    try {
      let result: any;

      if (sku) {
        // Atualiza variação específica pelo SKU
        result = await (adapter as any).updateInventoryBySku(mlItemId, sku, {
          available_quantity: quantity,
        });
      } else {
        // Atualiza item sem variação
        result = await (adapter as any).updateItem(mlItemId, {
          available_quantity: quantity,
        });
      }

      return {
        productId: mlItemId,
        mlItemId: mlItemId,
        status: 'updated',
        changes: [`quantity: ${quantity}`],
      };
    } catch (error) {
      return {
        productId: mlItemId,
        mlItemId: mlItemId,
        status: 'error',
        changes: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Atualiza preço e estoque em uma única operação
   */
  async updatePriceAndStock(
    integrationId: string,
    mlItemId: string,
    price: number,
    quantity: number,
    sku?: string,
  ): Promise<SyncProductResult> {
    const integration = await this.integrationRepository.findById(integrationId);
    const accessToken = await this.authService.getValidAccessToken(integration);
    const adapter = getAdapter(integration.marketplace as any);

    try {
      let result: any;

      if (sku) {
        result = await (adapter as any).updateInventoryBySku(mlItemId, sku, {
          price,
          available_quantity: quantity,
        });
      } else {
        result = await (adapter as any).updateItem(mlItemId, {
          price,
          available_quantity: quantity,
        });
      }

      return {
        productId: mlItemId,
        mlItemId: mlItemId,
        status: 'updated',
        changes: [`price: ${price}`, `quantity: ${quantity}`],
      };
    } catch (error) {
      return {
        productId: mlItemId,
        mlItemId: mlItemId,
        status: 'error',
        changes: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Atualização em massa (até 200 itens por chamada)
   */
  async bulkUpdate(
    integrationId: string,
    updates: Array<{
      mlItemId: string;
      sku?: string;
      price?: number;
      quantity?: number;
    }>,
  ): Promise<BulkSyncResult> {
    const integration = await this.integrationRepository.findById(integrationId);
    const accessToken = await this.authService.getValidAccessToken(integration);
    const adapter = getAdapter(integration.marketplace as any);

    // Converter para formato do ML
    const mlUpdates = updates.map(u => ({
      item_id: u.mlItemId,
      price: u.price,
      available_quantity: u.quantity,
    }));

    try {
      const results = await (adapter as any).bulkUpdateInventory(mlUpdates);
      
      return {
        total: updates.length,
        success: results.filter(r => !r.error).length,
        errors: results.filter(r => r.error).length,
        results: results.map(r => ({
          productId: r.item_id,
          mlItemId: r.item_id,
          status: r.error ? 'error' as const : 'updated' as const,
          changes: [],
          error: r.error,
        })),
      };
    } catch (error) {
      return {
        total: updates.length,
        success: 0,
        errors: updates.length,
        results: updates.map(u => ({
          productId: u.mlItemId,
          mlItemId: u.mlItemId,
          status: 'error' as const,
          changes: [],
          error: error instanceof Error ? error.message : String(error),
        })),
      };
    }
  }

  /**
   * Sincroniza produto específico (busca dados atuais do ML)
   */
  async syncProduct(integrationId: string, mlItemId: string): Promise<SyncProductResult> {
    const integration = await this.integrationRepository.findById(integrationId);
    const accessToken = await this.authService.getValidAccessToken(integration);
    const adapter = getAdapter(integration.marketplace as any);

    try {
      // Buscar item com variações
      const item = await (adapter as any).getItemWithVariations(mlItemId);
      
      return this.processItem(integrationId, item);
    } catch (error) {
      return {
        productId: mlItemId,
        mlItemId: mlItemId,
        status: 'error',
        changes: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}


