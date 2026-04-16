export type MarketplaceName = 'shopee' | 'mercadolivre';

export type OrderStatus =
  | 'UNPAID'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RETURN_REFUND';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'REFUNDED' | 'FAILED';

export type ProductStatus = 'active' | 'paused' | 'closed' | 'under_review';


export interface MarketplaceAuthorizationUrl {
  url: string;
  state: string;
}

export interface MarketplaceProduct {
  externalItemId: string;
  title: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  price: number;
  availableQuantity: number;
  soldQuantity: number;
  status: ProductStatus;
  thumbnail: string;
  permalink: string;
}

export interface Product {
  id: string;
  integrationId: string;
  externalItemId: string;
  title: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  price: number;
  availableQuantity: number;
  soldQuantity: number;
  status: ProductStatus;
  thumbnail: string;
  permalink: string;
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDto {
  integrationId: string;
  externalItemId: string;
  title: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  price: number;
  availableQuantity: number;
  soldQuantity: number;
  status: ProductStatus;
  thumbnail: string;
  permalink: string;
}

export interface ProductSyncResult {
  integrationId: string;
  productsSynced: number;
  errors: string[];
  syncedAt: Date;
}


export interface MarketplaceTokenSet {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  shopId: string;
  shopName: string;
  openId?: string;
}

export interface MarketplaceOrderItem {
  externalItemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface MarketplaceOrder {
  externalOrderId: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  buyerUsername: string;
  shippingCarrier: string;
  trackingNumber: string;
  items: MarketplaceOrderItem[];
  createdAt: Date;
  updatedAt: Date;
  paidAt: Date | null;
}

export interface MarketplacePayment {
  externalTransactionId: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  marketplaceFee: number;
  netAmount: number;
  status: PaymentStatus;
  transactionDate: Date;
  description: string;
}

export interface MarketplaceOrdersParams {
  timeFrom: number;
  timeTo: number;
  pageSize: number;
  cursor?: string;
  status?: OrderStatus;
}

export interface MarketplacePaymentsParams {
  timeFrom: number;
  timeTo: number;
  pageSize: number;
  pageNo?: number;
}

export interface MarketplacePaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface Integration {
  id: string;
  userId: string;
  marketplace: MarketplaceName;
  shopId: string;
  shopName: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Dados extras do marketplace (user_id do ML, etc)
  extra?: Record<string, unknown>;
}

export interface CreateIntegrationDto {
  userId: string;
  marketplace: MarketplaceName;
  shopId: string;
  shopName: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export interface UpdateTokensDto {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export interface Order {
  id: string;
  integrationId: string;
  externalOrderId: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  buyerUsername: string;
  shippingCarrier: string;
  trackingNumber: string;
  paidAt: Date | null;
  orderCreatedAt: Date;
  orderUpdatedAt: Date;
  syncedAt: Date;
  createdAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  externalItemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
}

export interface Payment {
  id: string;
  integrationId: string;
  orderId: string | null;
  externalTransactionId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  marketplaceFee: number;
  netAmount: number;
  status: PaymentStatus;
  transactionDate: Date;
  description: string;
  syncedAt: Date;
  createdAt: Date;
}

export interface CreateOrderDto {
  integrationId: string;
  externalOrderId: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  buyerUsername: string;
  shippingCarrier: string;
  trackingNumber: string;
  paidAt: Date | null;
  orderCreatedAt: Date;
  orderUpdatedAt: Date;
  items: CreateOrderItemDto[];
}

export interface CreateOrderItemDto {
  externalItemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CreatePaymentDto {
  integrationId: string;
  orderId: string | null;
  externalTransactionId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  marketplaceFee: number;
  netAmount: number;
  status: PaymentStatus;
  transactionDate: Date;
  description: string;
}

export interface FinanceSummary {
  totalRevenue: number;
  totalFees: number;
  totalNetAmount: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  currency: string;
  period: { from: Date; to: Date };
}

export type FeeType =
  | 'commission'
  | 'transaction'
  | 'shipping'
  | 'service'
  | 'advertising'
  | 'other';

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Fee {
  id: string;
  integrationId: string;
  orderId: string | null;
  externalFeeId: string;
  feeType: FeeType;
  amount: number;
  currency: string;
  description: string;
  feeDate: Date;
  syncedAt: Date;
  createdAt: Date;
}

export interface CreateFeeDto {
  integrationId: string;
  orderId: string | null;
  externalFeeId: string;
  feeType: FeeType;
  amount: number;
  currency: string;
  description: string;
  feeDate: Date;
}

export interface Payout {
  id: string;
  integrationId: string;
  externalPayoutId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  bankAccount: string;
  scheduledAt: Date;
  completedAt: Date | null;
  syncedAt: Date;
  createdAt: Date;
}

export interface CreatePayoutDto {
  integrationId: string;
  externalPayoutId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  bankAccount: string;
  scheduledAt: Date;
  completedAt: Date | null;
}

export interface SyncResult {
  integrationId: string;
  marketplace: MarketplaceName;
  shopId: string;
  ordersSynced: number;
  paymentsSynced: number;
  errors: string[];
  syncedAt: Date;
}


