import { MarketplaceAdapter } from './marketplace.adapter';
import { createShopeeAdapter } from './shopee.adapter';
import { createMercadoLivreMarketplaceAdapter } from './mercadolivre-marketplace.adapter';
import { MarketplaceName } from '../types/marketplace.types';
import { BadRequestError } from '../shared/errors/errors';

const registry = new Map<MarketplaceName, MarketplaceAdapter>();

export function getAdapter(marketplace: MarketplaceName): MarketplaceAdapter {
  const cached = registry.get(marketplace);
  if (cached) return cached;

  let adapter: MarketplaceAdapter;

  if (marketplace === 'shopee') {
    adapter = createShopeeAdapter();
  } else if (marketplace === 'mercadolivre') {
    adapter = createMercadoLivreMarketplaceAdapter();
  } else {
    throw new BadRequestError(`Unsupported marketplace: ${marketplace}`);
  }

  registry.set(marketplace, adapter);
  return adapter;
}
