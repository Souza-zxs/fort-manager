import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Link2, RefreshCw, Settings, CheckCircle2, XCircle, 
  ArrowUpDown, Package, ShoppingCart, TrendingUp, Clock, Plus, Activity
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useNavigate } from "react-router-dom";
import shopeeLogo from "@/assets/shopee-logo.png";
import mercadoLivreLogo from "@/assets/mercadolivre-logo.png";
import {
  clearMercadoLivreSession,
  exchangeCodeForToken,
  fetchCurrentUser,
  fetchMercadoLivreItems,
  fetchMercadoLivreOrders,
  getMercadoLivreAuthUrl,
  getStoredMercadoLivreAccount,
} from "@/lib/mercadoLivre";

interface MarketplaceConfig {
  id: string;
  name: string;
  logo: string;
  connected: boolean;
  apiKey: string;
  secretKey: string;
  shopId: string;
  autoSync: boolean;
  syncInterval: string;
  lastSync: string | null;
  stats: {
    products: number;
    orders: number;
    revenue: string;
  };
  color: string;
}

const initialMarketplaces: MarketplaceConfig[] = [
  {
    id: "shopee",
    name: "Shopee",
    logo: shopeeLogo,
    connected: false,
    apiKey: "",
    secretKey: "",
    shopId: "",
    autoSync: false,
    syncInterval: "30",
    lastSync: null,
    stats: { products: 0, orders: 0, revenue: "R$ 0,00" },
    color: "bg-orange-500",
  },
  {
    id: "mercadolivre",
    name: "Mercado Livre",
    logo: mercadoLivreLogo,
    connected: false,
    apiKey: "",
    secretKey: "",
    shopId: "",
    autoSync: false,
    syncInterval: "30",
    lastSync: null,
    stats: { products: 0, orders: 0, revenue: "R$ 0,00" },
    color: "bg-yellow-500",
  },
];

const Integracoes = () => {
  const [marketplaces, setMarketplaces] = useState<MarketplaceConfig[]>(initialMarketplaces);
  const [configOpen, setConfigOpen] = useState<string | null>(null);
  const [formData, setFormData] = useState({ apiKey: "", secretKey: "", shopId: "" });
  const [isConnectingMercadoLivre, setIsConnectingMercadoLivre] = useState(false);
  const [mercadoLivreError, setMercadoLivreError] = useState<string | null>(null);
  const [didProcessOAuth, setDidProcessOAuth] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const mercadoLivreConfigured = useMemo(
    () => Boolean(import.meta.env.MELI_APP_ID && import.meta.env.MELI_CLIENT_SECRET),
    []
  );

  useEffect(() => {
    const storedAccount = getStoredMercadoLivreAccount();
    if (!storedAccount) {
      return;
    }

    setMarketplaces((prev) =>
      prev.map((m) =>
        m.id === "mercadolivre"
          ? {
              ...m,
              connected: true,
              apiKey: import.meta.env.MELI_APP_ID ?? "",
              secretKey: "********",
              shopId: storedAccount.userId,
              lastSync: new Date().toLocaleString("pt-BR"),
            }
          : m
      )
    );
  }, []);

  useEffect(() => {
    if (didProcessOAuth) {
      return;
    }

    const params = new URLSearchParams(location.search);
    const oauthCode = params.get("code");
    const oauthError = params.get("error");

    if (!oauthCode && !oauthError) {
      setDidProcessOAuth(true);
      return;
    }

    async function handleOAuthCallback() {
      if (oauthError) {
        setMercadoLivreError(`Autorizacao recusada: ${oauthError}`);
        toast({ title: "Falha ao autorizar Mercado Livre", description: oauthError, variant: "destructive" });
        setDidProcessOAuth(true);
        navigate("/integracoes", { replace: true });
        return;
      }

      if (!oauthCode) {
        setDidProcessOAuth(true);
        return;
      }

      try {
        setIsConnectingMercadoLivre(true);
        setMercadoLivreError(null);
        await exchangeCodeForToken(oauthCode);
        
        let userId = "";
        let nickname = "";
        
        try {
          const user = await fetchCurrentUser();
          userId = String(user.id);
          nickname = user.nickname;
        } catch (userError) {
          console.warn("Nao foi possivel buscar dados do usuario (CORS), usando user_id do token:", userError);
          const storedAccount = getStoredMercadoLivreAccount();
          userId = storedAccount?.userId || "";
          nickname = storedAccount?.nickname || "";
        }

        setMarketplaces((prev) =>
          prev.map((m) =>
            m.id === "mercadolivre"
              ? {
                  ...m,
                  connected: true,
                  apiKey: import.meta.env.MELI_APP_ID ?? "",
                  secretKey: "********",
                  shopId: userId,
                  lastSync: new Date().toLocaleString("pt-BR"),
                  stats: {
                    products: Math.floor(Math.random() * 50) + 10,
                    orders: Math.floor(Math.random() * 200) + 30,
                    revenue: `R$ ${(Math.random() * 50000 + 5000).toFixed(2).replace(".", ",")}`,
                  },
                }
              : m
          )
        );

        toast({
          title: "Mercado Livre conectado",
          description: nickname ? `Conta ${nickname} vinculada com sucesso.` : "Conta vinculada com sucesso.",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro inesperado ao conectar com Mercado Livre.";
        setMercadoLivreError(message);
        toast({
          title: "Nao foi possivel conectar",
          description: message,
          variant: "destructive",
        });
      } finally {
        setDidProcessOAuth(true);
        setIsConnectingMercadoLivre(false);
        navigate("/integracoes", { replace: true });
      }
    }

    void handleOAuthCallback();
  }, [didProcessOAuth, location.search, navigate, toast]);

  const handleConnect = (id: string) => {
    if (id === "mercadolivre") {
      if (!mercadoLivreConfigured) {
        const message = "Configure ML_APP_ID e ML_CLIENT_SECRET no .env.local antes de conectar.";
        setMercadoLivreError(message);
        toast({ title: "Credenciais nao configuradas", description: message, variant: "destructive" });
        return;
      }

      setMercadoLivreError(null);
      setIsConnectingMercadoLivre(true);

      try {
        window.location.href = getMercadoLivreAuthUrl();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Nao foi possivel iniciar autenticacao.";
        setIsConnectingMercadoLivre(false);
        setMercadoLivreError(message);
        toast({ title: "Falha ao iniciar conexao", description: message, variant: "destructive" });
      }
      return;
    }

    setMarketplaces((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              connected: true,
              apiKey: formData.apiKey,
              secretKey: formData.secretKey,
              shopId: formData.shopId,
              lastSync: new Date().toLocaleString("pt-BR"),
              stats: {
                products: Math.floor(Math.random() * 50) + 10,
                orders: Math.floor(Math.random() * 200) + 30,
                revenue: `R$ ${(Math.random() * 50000 + 5000).toFixed(2).replace(".", ",")}`,
              },
            }
          : m
      )
    );
    setFormData({ apiKey: "", secretKey: "", shopId: "" });
    setConfigOpen(null);
  };

  const handleDisconnect = (id: string) => {
    if (id === "mercadolivre") {
      clearMercadoLivreSession();
      setMercadoLivreError(null);
    }

    setMarketplaces((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, connected: false, apiKey: "", secretKey: "", shopId: "", lastSync: null, stats: { products: 0, orders: 0, revenue: "R$ 0,00" } }
          : m
      )
    );
  };

  const toggleAutoSync = (id: string) => {
    setMarketplaces((prev) =>
      prev.map((m) => (m.id === id ? { ...m, autoSync: !m.autoSync } : m))
    );
  };

  const handleSyncNow = async (id: string) => {
    if (id !== "mercadolivre") {
      toast({ title: "Sincronização não implementada", description: "Em breve para outros marketplaces" });
      return;
    }

    try {
      toast({ title: "Sincronizando...", description: "Buscando dados do Mercado Livre" });

      const [itemsData, ordersData] = await Promise.all([
        fetchMercadoLivreItems(),
        fetchMercadoLivreOrders(),
      ]);

      const totalProducts = itemsData.paging?.total || 0;
      const totalOrders = ordersData.paging?.total || 0;
      
      const revenue = ordersData.results?.reduce((sum: number, order: any) => {
        return sum + (order.total_amount || 0);
      }, 0) || 0;

      setMarketplaces((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                lastSync: new Date().toLocaleString("pt-BR"),
                stats: {
                  products: totalProducts,
                  orders: totalOrders,
                  revenue: `R$ ${revenue.toFixed(2).replace(".", ",")}`,
                },
              }
            : m
        )
      );

      toast({
        title: "Sincronização concluída",
        description: `${totalProducts} produtos e ${totalOrders} pedidos sincronizados.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao sincronizar dados";
      toast({
        title: "Falha na sincronização",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Integrações</h1>
        <p className="text-muted-foreground text-sm mt-1">Conecte seus marketplaces e sincronize produtos e pedidos</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="gradient-card border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/15">
              <Link2 size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Marketplaces Conectados</p>
              <p className="text-xl font-bold text-foreground">{marketplaces.filter((m) => m.connected).length}/{marketplaces.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="gradient-card border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/15">
              <ArrowUpDown size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Produtos Sincronizados</p>
              <p className="text-xl font-bold text-foreground">{marketplaces.reduce((a, m) => a + m.stats.products, 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="gradient-card border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/15">
              <ShoppingCart size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pedidos Totais</p>
              <p className="text-xl font-bold text-foreground">{marketplaces.reduce((a, m) => a + m.stats.orders, 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Marketplace Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {marketplaces.map((marketplace) => (
          <Card key={marketplace.id} className="gradient-card border-border/50 overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={marketplace.logo} alt={marketplace.name} className="h-12 w-12 object-contain rounded-lg bg-white p-1" />
                  <div>
                    <CardTitle className="text-lg">{marketplace.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1.5 mt-0.5">
                      {marketplace.connected ? (
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
                <Badge variant={marketplace.connected ? "default" : "secondary"} className={marketplace.connected ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}>
                  {marketplace.connected ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {marketplace.connected ? (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-secondary/50 rounded-lg p-3 text-center">
                      <Package size={16} className="mx-auto text-muted-foreground mb-1" />
                      <p className="text-lg font-bold text-foreground">{marketplace.stats.products}</p>
                      <p className="text-[10px] text-muted-foreground">Produtos</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-3 text-center">
                      <ShoppingCart size={16} className="mx-auto text-muted-foreground mb-1" />
                      <p className="text-lg font-bold text-foreground">{marketplace.stats.orders}</p>
                      <p className="text-[10px] text-muted-foreground">Pedidos</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-3 text-center">
                      <TrendingUp size={16} className="mx-auto text-muted-foreground mb-1" />
                      <p className="text-sm font-bold text-foreground">{marketplace.stats.revenue}</p>
                      <p className="text-[10px] text-muted-foreground">Faturamento</p>
                    </div>
                  </div>

                  {/* Sync Settings */}
                  <div className="flex items-center justify-between bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <RefreshCw size={14} className="text-muted-foreground" />
                      <span className="text-sm text-foreground">Sincronização automática</span>
                    </div>
                    <Switch checked={marketplace.autoSync} onCheckedChange={() => toggleAutoSync(marketplace.id)} />
                  </div>

                  {marketplace.lastSync && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock size={12} />
                      <span>Última sincronização: {marketplace.lastSync}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    {marketplace.id === "mercadolivre" && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" className="w-full" onClick={() => navigate("/integracoes/adicionar-produto")}>
                          <Plus size={14} />
                          Adicionar Produto
                        </Button>
                        <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/integracoes/diagnostico")}>
                          <Activity size={14} />
                          Diagnóstico
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleSyncNow(marketplace.id)}>
                        <RefreshCw size={14} />
                        Sincronizar
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Settings size={14} />
                        Configurar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDisconnect(marketplace.id)}>
                        Desconectar
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Conecte sua conta do {marketplace.name} para sincronizar produtos, pedidos e estoque automaticamente.
                  </p>
                  {marketplace.id === "mercadolivre" ? (
                    <div className="space-y-2">
                      <Button className="w-full" onClick={() => handleConnect(marketplace.id)} disabled={isConnectingMercadoLivre}>
                        <Link2 size={16} />
                        {isConnectingMercadoLivre ? "Conectando..." : "Conectar com Mercado Livre"}
                      </Button>
                      {!mercadoLivreConfigured && (
                        <p className="text-xs text-destructive">
                          Configure VITE_ML_CLIENT_ID e VITE_ML_CLIENT_SECRET no .env.local.
                        </p>
                      )}
                      {mercadoLivreError && (
                        <p className="text-xs text-destructive">{mercadoLivreError}</p>
                      )}
                    </div>
                  ) : (
                    <Dialog open={configOpen === marketplace.id} onOpenChange={(open) => setConfigOpen(open ? marketplace.id : null)}>
                      <DialogTrigger asChild>
                        <Button className="w-full">
                          <Link2 size={16} />
                          Conectar {marketplace.name}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-3">
                            <img src={marketplace.logo} alt={marketplace.name} className="h-8 w-8 object-contain rounded bg-white p-0.5" />
                            Conectar ao {marketplace.name}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">API Key / App ID</label>
                            <Input placeholder="Cole sua API Key aqui" value={formData.apiKey} onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Secret Key</label>
                            <Input type="password" placeholder="Cole sua Secret Key aqui" value={formData.secretKey} onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Shop ID / Seller ID</label>
                            <Input placeholder="ID da sua loja" value={formData.shopId} onChange={(e) => setFormData({ ...formData, shopId: e.target.value })} />
                          </div>
                          <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                            <p className="font-medium text-foreground">Como obter suas credenciais:</p>
                            <ol className="list-decimal list-inside space-y-0.5">
                              <li>Acesse o Shopee Partner Center</li>
                              <li>Vá em App Management → Create App</li>
                              <li>Copie o Partner ID e Key gerados</li>
                            </ol>
                          </div>
                          <Button className="w-full" onClick={() => handleConnect(marketplace.id)} disabled={!formData.apiKey || !formData.secretKey}>
                            <CheckCircle2 size={16} />
                            Conectar
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Integracoes;
