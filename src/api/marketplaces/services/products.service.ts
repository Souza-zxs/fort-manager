import { IntegrationRepository } from '../repositories/integration.repository.js';
import { ProductsRepository } from '../repositories/products.repository.js';
import { getAdapter } from '../adapters/adapter.registry.js';
import { Product, ProductSyncResult } from '../types/marketplace.types.js';

export class ProductsService {
  constructor(
    private readonly integrationRepo: IntegrationRepository,
    private readonly productsRepo: ProductsRepository,
  ) {}

  async syncProducts(integrationId: string): Promise<ProductSyncResult> {
    const errors: string[] = [];

    const integration = await this.integrationRepo.findById(integrationId);
    if (!integration) throw new Error(`Integration ${integrationId} not found`);

    const adapter = getAdapter(integration.marketplace);

    try {
      const products = await adapter.getProducts(
        integration.accessToken,
        integration.shopId,
      );

      const dtos = products.map((p) => ({
        integrationId,
        ...p,
      }));

      await this.productsRepo.upsertMany(dtos);

      return {
        integrationId,
        productsSynced: products.length,
        errors,
        syncedAt: new Date(),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
      return { integrationId, productsSynced: 0, errors, syncedAt: new Date() };
    }
  }

  async listProducts(userId: string): Promise<Product[]> {
    return this.productsRepo.findByUser(userId);
  }

  async listProductsByIntegration(integrationId: string): Promise<Product[]> {
    return this.productsRepo.findByIntegration(integrationId);
  }
}