import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  marketplaceApi,
  storeOAuthState,
  ApiError,
} from '@/lib/marketplaceApi';
import { useToast } from './use-toast';

// ── Nomes legíveis por marketplace ─────────────────────────────────────────────

export function marketplaceLabel(id: string): string {
  const labels: Record<string, string> = {
    mercadolivre: 'Mercado Livre',
    shopee: 'Shopee',
  };
  return labels[id] ?? id;
}

// ── Consultar integrações ──────────────────────────────────────────────────────

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: () => marketplaceApi.listIntegrations(),
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) return false;
      return failureCount < 2;
    },
  });
}

// ── Iniciar OAuth ─────────────────────────────────────────────────────────────

export function useStartOAuth() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (marketplace: string) => {
      const { url, state } = await marketplaceApi.getAuthUrl(marketplace);
      if (!url?.startsWith('http://') && !url?.startsWith('https://')) {
        throw new Error('URL de autorização inválida. Verifique o backend e as variáveis MELI_* no servidor.');
      }
      if (!state) {
        throw new Error('Resposta OAuth incompleta (state ausente). Tente novamente.');
      }
      storeOAuthState(state, marketplace);
      window.location.assign(url);
    },
    onError: (err: Error) => {
      toast({
        title: 'Não foi possível iniciar a conexão',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}

// ── Trocar code OAuth por integração ──────────────────────────────────────────

export function useHandleCallback() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      marketplace,
      code,
      shopId,
    }: {
      marketplace: string;
      code: string;
      shopId?: string;
    }) => marketplaceApi.handleCallback(marketplace, code, shopId),

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast({
        title: `${marketplaceLabel(data.marketplace)} conectado!`,
        description: data.shopName
          ? `Loja "${data.shopName}" vinculada com sucesso.`
          : 'Integração salva com sucesso.',
      });
    },

    onError: (err: Error) => {
      toast({
        title: 'Falha ao conectar',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}

// ── Desconectar ────────────────────────────────────────────────────────────────

export function useDisconnect() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => marketplaceApi.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast({ title: 'Integração desconectada' });
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro ao desconectar',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}

// ── Sincronizar agora ─────────────────────────────────────────────────────────

export function useTriggerSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => marketplaceApi.triggerSync(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      const errText = result.errors.length > 0 ? ` (${result.errors.length} erro(s))` : '';
      toast({
        title: 'Sincronização concluída',
        description: `${result.ordersSynced} pedidos e ${result.paymentsSynced} pagamentos sincronizados.${errText}`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Falha na sincronização',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}
