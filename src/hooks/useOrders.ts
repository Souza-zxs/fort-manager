import { useQuery } from '@tanstack/react-query';
import { marketplaceApi, OrderDto } from '@/lib/marketplaceApi';

export function useOrders(integrationId?: string) {
  return useQuery({
    queryKey: ['orders', integrationId],
    queryFn: () => marketplaceApi.getOrders(integrationId),
    staleTime: 30_000, // 30 segundos
  });
}

export function useRecentOrders(limit = 5) {
  const { data: orders, ...rest } = useOrders();
  
  const recentOrders = orders
    ?.sort((a, b) => new Date(b.orderCreatedAt).getTime() - new Date(a.orderCreatedAt).getTime())
    .slice(0, limit)
    ?? [];

  return {
    ...rest,
    data: recentOrders,
  };
}

export type { OrderDto };