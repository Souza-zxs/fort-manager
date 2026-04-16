import { MarketplaceAuthorizationUrl, MarketplaceTokenSet, MarketplaceOrder, MarketplacePayment, MarketplaceOrdersParams, MarketplacePaymentsParams, MarketplacePaginatedResult, MarketplaceName, MarketplaceProduct,} from '../types/marketplace.types.js';

export interface MarketplaceAdapter {
  readonly marketplace: MarketplaceName;

getAuthorizationUrl(state: string, codeVerifier: string): MarketplaceAuthorizationUrl;

 exchangeCode(
  code: string,
  shopId?: string,
  codeVerifier?: string,
): Promise<MarketplaceTokenSet>;

  refreshTokens(
    refreshToken: string,
    shopId: string,
  ): Promise<MarketplaceTokenSet>;

  getOrders(
    accessToken: string,
    shopId: string,
    params: MarketplaceOrdersParams,
  ): Promise<MarketplacePaginatedResult<MarketplaceOrder>>;

  getAllOrders(
    accessToken: string,
    shopId: string,
    params: Omit<MarketplaceOrdersParams, 'cursor'>,
  ): Promise<MarketplaceOrder[]>;

  getPayments(
    accessToken: string,
    shopId: string,
    params: MarketplacePaymentsParams,
  ): Promise<MarketplacePaginatedResult<MarketplacePayment>>;

  getAllPayments(
    accessToken: string,
    shopId: string,
    params: MarketplacePaymentsParams,
  ): Promise<MarketplacePayment[]>;

  getProducts(
    accessToken: string,
    shopId: string,
  ): Promise<MarketplaceProduct[]>;
}



