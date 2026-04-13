import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { marketplaceApi, consumeOAuthState, ApiError } from "@/lib/marketplaceApi";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Página de retorno OAuth para Mercado Livre e Shopee.
 *
 * O redirect_uri registrado no portal do desenvolvedor deve apontar para:
 *   http://localhost:5173/auth/callback   (dev)
 *   https://seudominio.com/auth/callback  (prod)
 *
 * Parâmetros recebidos na URL:
 *   ?code=<authorization_code>           ← obrigatório (ML e Shopee)
 *   &state=<random_state>                ← ML envia; usado para detectar marketplace
 *   &shop_id=<id>                        ← Shopee envia; usado como fallback de detecção
 *   &error=<reason>                      ← enviado quando o usuário recusa a autorização
 */
export default function AuthCallback() {
  const location     = useLocation();
  const navigate     = useNavigate();
  const { toast }    = useToast();
  const queryClient  = useQueryClient();
  const processed    = useRef(false);

  const callbackMutation = useMutation({
    mutationFn: ({
      marketplace,
      code,
      shopId,
      state,
    }: { marketplace: string; code: string; shopId?: string; state?: string }) =>
      marketplaceApi.handleCallback(marketplace, code, shopId, state),

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast({
        title: `${data.marketplace === "mercadolivre" ? "Mercado Livre" : "Shopee"} conectado!`,
        description: data.shopName
          ? `Loja "${data.shopName}" vinculada com sucesso.`
          : "Integração salva com sucesso.",
      });
      navigate("/integracoes", { replace: true });
    },

    onError: (err: Error) => {
      toast({
        title: "Falha ao conectar",
        description:
          err instanceof ApiError
            ? err.message
            : "Não foi possível concluir a autenticação.",
        variant: "destructive",
      });
      navigate("/integracoes", { replace: true });
    },
  });

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const params   = new URLSearchParams(location.search);
    const code     = params.get("code");
    const state    = params.get("state");
    const shopId   = params.get("shop_id") ?? undefined;
    const oauthErr = params.get("error");

    // ── Erro retornado pelo marketplace ────────────────────────────────────────
    if (oauthErr) {
      toast({
        title: "Autorização recusada",
        description: oauthErr,
        variant: "destructive",
      });
      navigate("/integracoes", { replace: true });
      return;
    }

    // ── Sem code: rota acessada diretamente, redireciona ──────────────────────
    if (!code) {
      navigate("/integracoes", { replace: true });
      return;
    }

    // ── Detectar marketplace ───────────────────────────────────────────────────
    // ML envia `state` (salvo antes do redirect via storeOAuthState)
    // Shopee envia `shop_id` (sem state)
    let marketplace = "mercadolivre"; // padrão
    if (state) {
      const stored = consumeOAuthState(state);
      if (stored) marketplace = stored;
    } else if (shopId) {
      marketplace = "shopee";
    }

    callbackMutation.mutate({ marketplace, code, shopId, state: state ?? undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isError   = callbackMutation.isError;
  const isSuccess = callbackMutation.isSuccess;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
        {!isError && !isSuccess && (
          <>
            <Loader2 size={40} className="animate-spin text-primary" />
            <div>
              <p className="text-lg font-semibold">Finalizando conexão…</p>
              <p className="text-sm text-muted-foreground mt-1">
                Trocando o código de autorização por tokens de acesso.
              </p>
            </div>
          </>
        )}

        {isSuccess && (
          <>
            <CheckCircle2 size={40} className="text-green-500" />
            <div>
              <p className="text-lg font-semibold">Conectado com sucesso!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Redirecionando para Integrações…
              </p>
            </div>
          </>
        )}

        {isError && (
          <>
            <XCircle size={40} className="text-destructive" />
            <div>
              <p className="text-lg font-semibold">Falha na autenticação</p>
              <p className="text-sm text-muted-foreground mt-1">
                {callbackMutation.error instanceof Error
                  ? callbackMutation.error.message
                  : "Erro desconhecido. Redirecionando…"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
