import { MarketplaceAdapter } from './marketplace.adapter.js';
import { createShopeeAdapter } from './shopee.adapter.js';
import { createMercadoLivreMarketplaceAdapter } from './mercadolivre-marketplace.adapter.js';
import { MarketplaceName } from '../types/marketplace.types.js';
import { BadRequestError } from '../shared/errors/errors.js';

const statelessAdapters = new Map<MarketplaceName, MarketplaceAdapter>();

export function getAdapter(marketplace: MarketplaceName): MarketplaceAdapter {
  if (marketplace === 'shopee') {
    let adapter = statelessAdapters.get('shopee');
    if (!adapter) {
      adapter = createShopeeAdapter();
      statelessAdapters.set('shopee', adapter);
    }
    return adapter;
  }

  if (marketplace === 'mercadolivre') {
    return createMercadoLivreMarketplaceAdapter();
  }

  throw new BadRequestError(`Unsupported marketplace: ${marketplace}`);
}