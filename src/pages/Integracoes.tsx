import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Link2, RefreshCw, Settings, CheckCircle2, XCircle,
  ArrowUpDown, ShoppingCart, Clock, Plus, Activity, Loader2, AlertCircle,
} from "lucide-react";
import shopeeLogo from "@/assets/shopee-logo.png";
import mercadoLivreLogo from "@/assets/mercadolivre-logo.png";
import {
  useIntegrations,
  useStartOAuth,
  useDisconnect,
  useTriggerSync,
  marketplaceLabel,
} from "@/hooks/useMarketplaces";
import type { IntegrationDto } from "@/lib/marketplaceApi";

// ── Configuração estática de cada marketplace ─────────────────────────────────

interface MarketplaceMeta {
  id: string;
  name: string;
  logo: string;
  color: string;
  description: string;
}

const MARKETPLACE_META: MarketplaceMeta[] = [
  {
    id: "mercadolivre",
    name: "Mercado Livre",
    logo: mercadoLivreLogo,
    color: "bg-yellow-500",
    description:
      "Conecte sua conta do Mercado Livre para sincronizar anúncios, pedidos e financeiro automaticamente.",
  },
  {
    id: "shopee",
    name: "Shopee",
    logo: shopeeLogo,
    color: "bg-orange-500",
    description:
      "Conecte sua loja Shopee para sincronizar pedidos, taxas e relatórios financeiros.",
  },
];

// ── Componente principal ──────────────────────────────────────────────────────

const Integracoes = () => {
  const navigate = useNavigate();

  // Sincronização automática (estado local por enquanto)
  const [autoSync, setAutoSync] = useState<Record<string, boolean>>({});

  // ── Queries / Mutations ───────────────────────────────────────────────────

  const { data: integrations = [], isLoading, error } = useIntegrations();
  const startOAuth  = useStartOAuth();
  const disconnect  = useDisconnect();
  const triggerSync = useTriggerSync();

  // ── Helpers ───────────────────────────────────────────────────────────────

  function findIntegration(marketplaceId: string): IntegrationDto | undefined {
    return integrations.find((i) => i.marketplace === marketplaceId && i.isActive);
  }

  const handleConnect    = (marketplace: string) => startOAuth.mutate(marketplace);
  const handleDisconnect = (integration: IntegrationDto) => disconnect.mutate(integration.id);
  const handleSyncNow    = (integration: IntegrationDto) => triggerSync.mutate(integration.id);
  const toggleAutoSync   = (id: string) =>
    setAutoSync((prev) => ({ ...prev, [id]: !prev[id] }));

  // ── Render ────────────────────────────────────────────────────────────────

  const connectedCount    = integrations.filter((i) => i.isActive).length;
  const isCallbackLoading = false; // callback agora é tratado em /auth/callback

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Integrações</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Conecte seus marketplaces e sincronize produtos e pedidos
        </p>
      </div>

      {/* Callback em progresso */}
      {isCallbackLoading && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-primary/30 bg-primary/10 text-primary text-sm">
          <Loader2 size={16} className="animate-spin shrink-0" />
          Finalizando conexão com o marketplace…
        </div>
      )}

      {/* Erro de sessão */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">
          <AlertCircle size={16} className="shrink-0" />
          {error instanceof Error ? error.message : "Erro ao carregar integrações."}
          {error instanceof Error && error.message.includes("Sessão") && (
            <span className="ml-1 font-medium">
              Certifique-se de estar logado no Supabase.
            </span>
          )}
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="gradient-card border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/15">
              <Link2 size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Marketplaces Conectados</p>
              <p className="text-xl font-bold text-foreground">
                {isLoading ? "—" : `${connectedCount}/${MARKETPLACE_META.length}`}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="gradient-card border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/15">
              <ShoppingCart size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Integrações Ativas</p>
              <p className="text-xl font-bold text-foreground">
                {isLoading ? "—" : connectedCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Marketplace Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {MARKETPLACE_META.map((meta) => {
          const integration  = findIntegration(meta.id);
          const isConnected  = Boolean(integration);
          const isSyncing    = triggerSync.isPending && triggerSync.variables === integration?.id;
          const isConnecting = startOAuth.isPending && startOAuth.variables === meta.id;

          return (
            <Card key={meta.id} className="gradient-card border-border/50 overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={meta.logo}
                      alt={meta.name}
                      className="h-12 w-12 object-contain rounded-lg bg-white p-1"
                    />
                    <div>
                      <CardTitle className="text-lg">{meta.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5 mt-0.5">
                        {isConnected ? (
                          <>
                            <CheckCircle2 size={12} className="text-green-500" />
                            <span className="text-green-500 text-xs">Conectado</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={12} className="text-muted-foreground" />
                            <span className="text-xs">Desconectado</span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={isConnected ? "default" : "secondary"}
                    className={
                      isConnected
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : ""
                    }
                  >
                    {isConnected ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {isConnected && integration ? (
                  <>
                    {/* Info da loja conectada */}
                    <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
                      <p className="text-xs text-muted-foreground">Loja conectada</p>
                      <p className="text-sm font-medium text-foreground">
                        {integration.shopName || `ID: ${integration.shopId}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Conectado em{" "}
                        {new Date(integration.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Sincronização automática */}
                    <div className="flex items-center justify-between bg-secondary/30 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <RefreshCw size={14} className="text-muted-foreground" />
                        <span className="text-sm text-foreground">Sincronização automática</span>
                      </div>
                      <Switch
                        checked={autoSync[meta.id] ?? false}
                        onCheckedChange={() => toggleAutoSync(meta.id)}
                      />
                    </div>

                    {/* Última sync */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock size={12} />
                      <span>Integração ativa desde {new Date(integration.createdAt).toLocaleString("pt-BR")}</span>
                    </div>

                    {/* Botões de ação */}
                    <div className="space-y-2">
                      {meta.id === "mercadolivre" && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => navigate("/integracoes/adicionar-produto")}
                          >
                            <Plus size={14} />
                            Adicionar Produto
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => navigate("/integracoes/diagnostico")}
                          >
                            <Activity size={14} />
                            Diagnóstico
                          </Button>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          disabled={isSyncing}
                          onClick={() => handleSyncNow(integration)}
                        >
                          {isSyncing ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <RefreshCw size={14} />
                          )}
                          {isSyncing ? "Sincronizando…" : "Sincronizar"}
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Settings size={14} />
                          Configurar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={disconnect.isPending}
                          onClick={() => handleDisconnect(integration)}
                        >
                          Desconectar
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{meta.description}</p>

                    <Button
                      className="w-full"
                      disabled={isConnecting || isCallbackLoading}
                      onClick={() => handleConnect(meta.id)}
                    >
                      {isConnecting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Link2 size={16} />
                      )}
                      {isConnecting
                        ? "Abrindo autenticação…"
                        : `Conectar com ${meta.name}`}
                    </Button>

                    <div className="bg-secondary/40 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">Pré-requisitos:</p>
                      {meta.id === "mercadolivre" ? (
                        <ol className="list-decimal list-inside space-y-0.5">
                          <li>Preencha <code className="text-primary">MELI_APP_ID</code> e <code className="text-primary">MELI_CLIENT_SECRET</code> no <code>.env</code></li>
                          <li>Registre <code className="text-primary">MELI_REDIRECT_URI</code> no portal do desenvolvedor ML</li>
                          <li>Clique em "Conectar" acima</li>
                        </ol>
                      ) : (
                        <ol className="list-decimal list-inside space-y-0.5">
                          <li>Preencha <code className="text-primary">SHOPEE_PARTNER_ID</code> e <code className="text-primary">SHOPEE_PARTNER_KEY</code> no <code>.env</code></li>
                          <li>Registre <code className="text-primary">SHOPEE_REDIRECT_URI</code> no Shopee Partner Center</li>
                          <li>Clique em "Conectar" acima</li>
                        </ol>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Lista completa de integrações */}
      {integrations.length > 0 && (
        <Card className="gradient-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpDown size={16} className="text-primary" />
              Todas as integrações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {integrations.map((int) => (
                <div
                  key={int.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        int.marketplace === "mercadolivre"
                          ? mercadoLivreLogo
                          : shopeeLogo
                      }
                      alt={marketplaceLabel(int.marketplace)}
                      className="h-6 w-6 object-contain rounded bg-white p-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {int.shopName || `ID: ${int.shopId}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {marketplaceLabel(int.marketplace)} · Loja {int.shopId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={int.isActive ? "default" : "secondary"}
                      className={
                        int.isActive
                          ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs"
                          : "text-xs"
                      }
                    >
                      {int.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      disabled={triggerSync.isPending}
                      onClick={() => triggerSync.mutate(int.id)}
                    >
                      <RefreshCw size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Integracoes;
