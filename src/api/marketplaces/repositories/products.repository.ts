import { SupabaseClient } from '@supabase/supabase-js';
import { Product, CreateProductDto } from '../types/marketplace.types.js';

interface ProductRow {
  id: string;
  integration_id: string;
  external_item_id: string;
  title: string;
  sku: string;
  category_id: string;
  category_name: string;
  price: number;
  available_quantity: number;
  sold_quantity: number;
  status: string;
  thumbnail_url: string;
  permalink: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

function rowToProduct(row: ProductRow): Product {
  return {
    id:                row.id,
    integrationId:     row.integration_id,
    externalItemId:    row.external_item_id,
    title:             row.title,
    sku:               row.sku,
    categoryId:        row.category_id,
    categoryName:      row.category_name,
    price:             Number(row.price),
    availableQuantity: row.available_quantity,
    soldQuantity:      row.sold_quantity,
    status:            row.status as Product['status'],
    thumbnail:         row.thumbnail_url,
    permalink:         row.permalink,
    syncedAt:          new Date(row.synced_at),
    createdAt:         new Date(row.created_at),
    updatedAt:         new Date(row.updated_at),
  };
}

export class ProductsRepository {
  constructor(private readonly db: SupabaseClient) {}

  async upsertMany(products: CreateProductDto[]): Promise<void> {
  if (products.length === 0) return;

  const rows = products.map((p) => ({
    integration_id:     p.integrationId,
    external_item_id:   p.externalItemId,
    category_id:        p.categoryId,
    category_name:      p.categoryName,
    title:              p.title,
    sku:                p.sku ?? null,
    price:              p.price,
    available_quantity: p.availableQuantity,
    sold_quantity:      p.soldQuantity ?? 0,
    status:             p.status,
    thumbnail_url:      p.thumbnail,  
    permalink:          p.permalink ?? null,
    synced_at:          new Date().toISOString(),
    updated_at:         new Date().toISOString(),
  }));

  const { error } = await (this.db as SupabaseClient)
    .from('products')
    .upsert(rows, { onConflict: 'integration_id,external_item_id' });

  if (error) throw new Error(`ProductsRepository.upsertMany: ${error.message}`);
}

  async findByIntegration(integrationId: string): Promise<Product[]> {
    const { data, error } = await (this.db as SupabaseClient)
      .from('products')
      .select('*')
      .eq('integration_id', integrationId)
      .order('title', { ascending: true });

    if (error) throw new Error(`ProductsRepository.findByIntegration: ${error.message}`);
    return (data as ProductRow[]).map(rowToProduct);
  }

  async findByUser(userId: string): Promise<Product[]> {
    const { data, error } = await (this.db as SupabaseClient)
      .from('products')
      .select('*, integrations!inner(user_id)')
      .eq('integrations.user_id', userId)
      .order('title', { ascending: true });

    if (error) throw new Error(`ProductsRepository.findByUser: ${error.message}`);
    return (data as ProductRow[]).map(rowToProduct);
  }
}