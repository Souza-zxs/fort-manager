import { useState, useEffect } from "react";
import { Search, Package, Truck, MapPin, CheckCircle2, XCircle, Eye, Filter, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { marketplaceApi, type OrderDto } from "@/lib/marketplaceApi";

interface Delivery {
  id: string;
  orderId: string;
  customer: string;
  address: string;
  city: string;
  product: string;
  tracking: string;
  status: "Preparando" | "Coletado" | "Em Trânsito" | "Saiu para Entrega" | "Entregue" | "Devolvido";
  date: string;
  estimatedDelivery: string;
  carrier: string;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  "Preparando":        { icon: Package,      color: "text-warning",     bg: "bg-warning/15" },
  "Coletado":          { icon: Package,      color: "text-accent",      bg: "bg-accent/15" },
  "Em Trânsito":       { icon: Truck,        color: "text-primary",     bg: "bg-primary/15" },
  "Saiu para Entrega": { icon: MapPin,       color: "text-accent",      bg: "bg-accent/15" },
  "Entregue":          { icon: CheckCircle2, color: "text-success",     bg: "bg-success/15" },
  "Devolvido":         { icon: XCircle,      color: "text-destructive", bg: "bg-destructive/15" },
};

const allStatuses = ["Preparando", "Coletado", "Em Trânsito", "Saiu para Entrega", "Entregue", "Devolvido"];
const steps       = ["Preparando", "Coletado", "Em Trânsito", "Saiu para Entrega", "Entregue"];

function mapOrderToDelivery(order: OrderDto): Delivery {
  const statusMap: Record<string, Delivery["status"]> = {
    COMPLETED:     "Entregue",
    CANCELLED:     "Devolvido",
    READY_TO_SHIP: "Saiu para Entrega",
    UNPAID:        "Preparando",
    PAID:          "Coletado",
    SHIPPED:       "Em Trânsito",
  };

  return {
    id:                order.id,
    orderId:           `#${order.externalOrderId.toString().slice(-6)}`,
    customer:          order.buyerUsername ?? "—",
    address:           "—",
    city:              "—",
    product:           "—",
    tracking:          order.trackingNumber ?? "—",
    status:            statusMap[order.status] ?? "Preparando",
    date:              new Date(order.orderCreatedAt).toLocaleDateString("pt-BR"),
    estimatedDelivery: "—",
    carrier:           order.shippingCarrier ?? "—",
  };
}

const Entregas = () => {
  const [deliveries, setDeliveries]         = useState<Delivery[]>([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState("");
  const [filterStatus, setFilterStatus]     = useState<string>("all");
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    marketplaceApi.getOrders()
      .then(orders => setDeliveries(orders.map(mapOrderToDelivery)))
      .catch(() => toast({ title: "Erro ao carregar entregas", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const filtered = deliveries.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = d.customer.toLowerCase().includes(q) || d.tracking.toLowerCase().includes(q) || d.orderId.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const copyTracking = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Código de rastreio copiado!" });
  };

  const getStepIndex = (status: string) => {
    if (status === "Devolvido") return -1;
    return steps.indexOf(status);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Entregas</h1>
        <p className="text-muted-foreground text-sm mt-1">Acompanhe todas as entregas dos seus pedidos</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {allStatuses.map((status) => {
          const config = statusConfig[status];
          const count  = deliveries.filter((d) => d.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
              className={`gradient-card rounded-lg border p-3 text-center transition-all ${
                filterStatus === status ? "border-primary glow-red" : "border-border hover:border-primary/30"
              }`}
            >
              <config.icon size={20} className={`${config.color} mx-auto mb-1`} />
              <p className="font-display text-xl font-bold">{count}</p>
              <p className="text-[10px] text-muted-foreground">{status}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por cliente, pedido ou rastreio..." className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-52">
            <Filter size={14} className="mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {allStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="gradient-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
              <th className="text-left p-4 font-medium">Pedido</th>
              <th className="text-left p-4 font-medium">Cliente</th>
              <th className="text-left p-4 font-medium">Produto</th>
              <th className="text-left p-4 font-medium">Rastreio</th>
              <th className="text-left p-4 font-medium">Transportadora</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-left p-4 font-medium">Data</th>
              <th className="text-right p-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">
                  Carregando entregas...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">
                  Nenhuma entrega encontrada.
                </td>
              </tr>
            ) : filtered.map((d) => {
              const config = statusConfig[d.status];
              return (
                <tr key={d.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                  <td className="p-4 font-mono text-sm text-primary">{d.orderId}</td>
                  <td className="p-4 text-sm">{d.customer}</td>
                  <td className="p-4 text-sm text-muted-foreground max-w-[160px] truncate">{d.product}</td>
                  <td className="p-4">
                    <button
                      onClick={() => copyTracking(d.tracking)}
                      className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {d.tracking} <Copy size={12} />
                    </button>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{d.carrier}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                      <config.icon size={12} />
                      {d.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{d.date}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedDelivery(d)}
                      className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedDelivery && (() => {
            const config   = statusConfig[selectedDelivery.status];
            const stepIdx  = getStepIndex(selectedDelivery.status);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Pedido</p>
                      <DialogTitle className="font-display text-xl mt-0.5">{selectedDelivery.orderId}</DialogTitle>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                      <config.icon size={13} />
                      {selectedDelivery.status}
                    </span>
                  </div>
                </DialogHeader>

                <div className="space-y-3 mt-1">
                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Cliente",        value: selectedDelivery.customer },
                      { label: "Transportadora", value: selectedDelivery.carrier },
                      { label: "Previsão",       value: selectedDelivery.estimatedDelivery },
                      { label: "Data do pedido", value: selectedDelivery.date },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-secondary/60 rounded-lg px-3 py-2.5">
                        <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
                        <p className="text-sm font-medium">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-secondary/60 rounded-lg px-3 py-2.5">
                    <p className="text-[11px] text-muted-foreground mb-0.5">Endereço</p>
                    <p className="text-sm font-medium">{selectedDelivery.address}{selectedDelivery.city !== "—" ? ` — ${selectedDelivery.city}` : ""}</p>
                  </div>

                  <div className="bg-secondary/60 rounded-lg px-3 py-2.5">
                    <p className="text-[11px] text-muted-foreground mb-0.5">Produto</p>
                    <p className="text-sm font-medium">{selectedDelivery.product}</p>
                  </div>

                  {/* Tracking */}
                  <div className="bg-secondary/60 rounded-lg px-3 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-0.5">Código de rastreio</p>
                      <p className="font-mono text-sm font-medium">{selectedDelivery.tracking}</p>
                    </div>
                    <button
                      onClick={() => copyTracking(selectedDelivery.tracking)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1.5 transition-colors bg-background"
                    >
                      <Copy size={12} /> Copiar
                    </button>
                  </div>

                  {/* Timeline */}
                  {selectedDelivery.status !== "Devolvido" ? (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-3">Progresso da entrega</p>
                      <div className="flex items-start">
                        {steps.map((step, i) => {
                          const done      = i <= stepIdx;
                          const isCurrent = i === stepIdx;
                          const isLast    = i === steps.length - 1;
                          return (
                            <div key={step} className="flex-1 flex flex-col items-center relative">
                              {!isLast && (
                                <div className={`absolute top-[13px] left-1/2 w-full h-px ${i < stepIdx ? "bg-primary" : "bg-border"}`} />
                              )}
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium z-10 relative transition-all
                                ${done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}
                                ${isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
                              `}>
                                {i < stepIdx ? <CheckCircle2 size={13} /> : i + 1}
                              </div>
                              <p className={`text-[9px] text-center mt-1.5 leading-tight max-w-[52px] ${done ? "text-foreground" : "text-muted-foreground"}`}>
                                {step}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg px-3 py-2.5 text-sm font-medium">
                      <XCircle size={15} /> Este pedido foi devolvido
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Entregas;