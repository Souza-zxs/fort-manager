import { MarketplaceAdapter } from './marketplace.adapter';
import { createShopeeAdapter } from './shopee.adapter';
import { createMercadoLivreMarketplaceAdapter } from './mercadolivre-marketplace.adapter';
import { MarketplaceName } from '../types/marketplace.types';
import { BadRequestError } from '../shared/errors/errors';

// Cache apenas para adapters SEM estado de autenticação
const statelessAdapters = new Map<MarketplaceName, MarketplaceAdapter>();

export function getAdapter(
  marketplace: MarketplaceName,
  credentials?: { clientId: string; clientSecret: string } // Para adapters stateful como ML
): MarketplaceAdapter {
 
  if (marketplace === 'shopee') {
    let adapter = statelessAdapters.get('shopee');
    if (!adapter) {
      adapter = createShopeeAdapter();
      statelessAdapters.set('shopee', adapter);
    }
    return adapter;
  }

  if (marketplace === 'mercadolivre') {
    if (!credentials) {
      throw new BadRequestError('Mercado Livre requires credentials');
    }
    return createMercadoLivreMarketplaceAdapter();
  }

  throw new BadRequestError(`Unsupported marketplace: ${marketplace}`);
}