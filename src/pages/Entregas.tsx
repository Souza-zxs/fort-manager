import { useState } from "react";
import { Search, MapPin, Package, Clock, CheckCircle2, Truck, XCircle, Eye, Filter, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getProductImage } from "@/lib/productImages";

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

const deliveries: Delivery[] = [
  { id: "1", orderId: "#FT-2847", customer: "João Silva", address: "Rua das Flores, 123", city: "São Paulo - SP", product: "Jogo de Chaves Allen", tracking: "BR1234567890", status: "Em Trânsito", date: "04/03/2026", estimatedDelivery: "08/03/2026", carrier: "Shopee Express" },
  { id: "2", orderId: "#FT-2846", customer: "Maria Santos", address: "Av. Brasil, 456", city: "Rio de Janeiro - RJ", product: "Furadeira de Impacto", tracking: "BR0987654321", status: "Preparando", date: "04/03/2026", estimatedDelivery: "10/03/2026", carrier: "Correios" },
  { id: "3", orderId: "#FT-2845", customer: "Carlos Oliveira", address: "Rua XV, 789", city: "Curitiba - PR", product: "Kit Parafusos Sextavados", tracking: "BR1122334455", status: "Entregue", date: "01/03/2026", estimatedDelivery: "03/03/2026", carrier: "Shopee Express" },
  { id: "4", orderId: "#FT-2844", customer: "Ana Costa", address: "Rua Augusta, 321", city: "São Paulo - SP", product: "Serra Circular 7¼\"", tracking: "BR5566778899", status: "Saiu para Entrega", date: "02/03/2026", estimatedDelivery: "04/03/2026", carrier: "Jadlog" },
  { id: "5", orderId: "#FT-2843", customer: "Pedro Souza", address: "Av. Paulista, 1000", city: "São Paulo - SP", product: "Nível a Laser", tracking: "BR9988776655", status: "Entregue", date: "28/02/2026", estimatedDelivery: "02/03/2026", carrier: "Correios" },
  { id: "6", orderId: "#FT-2842", customer: "Lucia Ferreira", address: "Rua Bahia, 55", city: "Belo Horizonte - MG", product: "Alicate Universal 8\"", tracking: "BR4433221100", status: "Coletado", date: "03/03/2026", estimatedDelivery: "07/03/2026", carrier: "Shopee Express" },
  { id: "7", orderId: "#FT-2841", customer: "Roberto Lima", address: "Av. Independência, 88", city: "Porto Alegre - RS", product: "Parafusadeira 12V", tracking: "BR6677889900", status: "Devolvido", date: "25/02/2026", estimatedDelivery: "01/03/2026", carrier: "Correios" },
];

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  "Preparando": { icon: Package, color: "text-warning", bg: "bg-warning/15" },
  "Coletado": { icon: Package, color: "text-accent", bg: "bg-accent/15" },
  "Em Trânsito": { icon: Truck, color: "text-primary", bg: "bg-primary/15" },
  "Saiu para Entrega": { icon: MapPin, color: "text-accent", bg: "bg-accent/15" },
  "Entregue": { icon: CheckCircle2, color: "text-success", bg: "bg-success/15" },
  "Devolvido": { icon: XCircle, color: "text-destructive", bg: "bg-destructive/15" },
};

const allStatuses = ["Preparando", "Coletado", "Em Trânsito", "Saiu para Entrega", "Entregue", "Devolvido"];

const steps = ["Preparando", "Coletado", "Em Trânsito", "Saiu para Entrega", "Entregue"];

const Entregas = () => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const { toast } = useToast();

  const filtered = deliveries.filter((d) => {
    const matchSearch = d.customer.toLowerCase().includes(search.toLowerCase()) || d.tracking.toLowerCase().includes(search.toLowerCase()) || d.orderId.toLowerCase().includes(search.toLowerCase());
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
          const count = deliveries.filter((d) => d.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
              className={`gradient-card rounded-lg border p-3 text-center transition-all ${filterStatus === status ? "border-primary glow-red" : "border-border hover:border-primary/30"}`}
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
              <th className="text-left p-4 font-medium">Previsão</th>
              <th className="text-right p-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => {
              const config = statusConfig[d.status];
              return (
                <tr key={d.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                  <td className="p-4 font-mono text-sm text-primary">{d.orderId}</td>
                  <td className="p-4 text-sm">{d.customer}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-md overflow-hidden bg-secondary flex-shrink-0">
                        {(() => { const img = getProductImage(d.product); return img ? <img src={img} alt={d.product} className="w-full h-full object-cover" /> : null; })()}
                      </div>
                      <span className="text-sm text-muted-foreground">{d.product}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <button onClick={() => copyTracking(d.tracking)} className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">
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
                  <td className="p-4 text-sm text-muted-foreground">{d.estimatedDelivery}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => setSelectedDelivery(d)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
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
          {selectedDelivery && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Detalhes da Entrega {selectedDelivery.orderId}</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 mt-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Cliente:</span><p className="font-medium">{selectedDelivery.customer}</p></div>
                  <div><span className="text-muted-foreground">Produto:</span><p className="font-medium">{selectedDelivery.product}</p></div>
                  <div><span className="text-muted-foreground">Endereço:</span><p className="font-medium">{selectedDelivery.address}</p></div>
                  <div><span className="text-muted-foreground">Cidade:</span><p className="font-medium">{selectedDelivery.city}</p></div>
                  <div><span className="text-muted-foreground">Transportadora:</span><p className="font-medium">{selectedDelivery.carrier}</p></div>
                  <div><span className="text-muted-foreground">Rastreio:</span><p className="font-medium font-mono text-xs">{selectedDelivery.tracking}</p></div>
                </div>

                {/* Timeline */}
                <div>
                  <p className="text-sm font-medium mb-3">Progresso da Entrega</p>
                  <div className="flex items-center gap-1">
                    {steps.map((step, i) => {
                      const currentStep = getStepIndex(selectedDelivery.status);
                      const isCompleted = i <= currentStep;
                      const isCurrent = i === currentStep;
                      return (
                        <div key={step} className="flex-1 flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-all ${
                            isCompleted ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                          } ${isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}>
                            {i + 1}
                          </div>
                          <p className={`text-[9px] text-center leading-tight ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>{step}</p>
                          {i < steps.length - 1 && (
                            <div className={`absolute h-0.5 w-full ${isCompleted ? "bg-primary" : "bg-secondary"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {selectedDelivery.status === "Devolvido" && (
                    <p className="text-destructive text-xs mt-2 text-center font-medium">⚠ Este pedido foi devolvido</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Entregas;
