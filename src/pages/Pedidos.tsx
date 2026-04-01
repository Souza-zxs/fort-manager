import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart, RefreshCw, Search, ExternalLink,
  CheckCircle2, XCircle, Clock, Package,
} from "lucide-react";
import { marketplaceApi, type OrderDto } from "@/lib/marketplaceApi";
import { ApiError } from "@/lib/marketplaceApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  COMPLETED:     { label: "Concluído",  icon: CheckCircle2, variant: "default" },
  PAID:          { label: "Pago",       icon: CheckCircle2, variant: "default" },
  CANCELLED:     { label: "Cancelado",  icon: XCircle,      variant: "destructive" },
  READY_TO_SHIP: { label: "Pronto",     icon: Package,      variant: "secondary" },
  UNPAID:        { label: "Pendente",   icon: Clock,        variant: "outline" },
};

function statusConfig(status: string) {
  return STATUS_CONFIG[status] ?? { label: status, icon: Clock, variant: "outline" as const };
}

function formatCurrency(amount: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function OrderSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
      <ShoppingCart size={40} className="opacity-30" />
      <p className="text-sm">
        {filtered
          ? "Nenhum pedido encontrado para este filtro."
          : "Nenhum pedido encontrado. Sincronize suas integrações para importar pedidos."}
      </p>
    </div>
  );
}

function OrderRow({ order }: { order: OrderDto }) {
  const cfg = statusConfig(order.status);
  const Icon = cfg.icon;

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 hover:bg-accent/30 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-muted-foreground">
            #{order.externalOrderId}
          </span>
          <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0 gap-1">
            <Icon size={10} />
            {cfg.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
            {order.marketplace ?? "—"}
          </Badge>
        </div>
        <p className="mt-0.5 text-sm font-medium truncate">{order.buyerUsername || "—"}</p>
        {order.trackingNumber && (
          <p className="text-xs text-muted-foreground">
            Rastreio: <span className="font-mono">{order.trackingNumber}</span>
          </p>
        )}
      </div>

      <div className="text-right shrink-0">
        <p className="font-semibold text-sm">
          {formatCurrency(order.totalAmount, order.currency)}
        </p>
        <p className="text-xs text-muted-foreground">
          {order.paidAt ? formatDate(order.paidAt) : formatDate(order.orderCreatedAt)}
        </p>
      </div>

      <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7" asChild>
        <a
          href={`https://www.mercadolivre.com.br/vendas/${order.externalOrderId}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Ver no Mercado Livre"
        >
          <ExternalLink size={13} />
        </a>
      </Button>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Pedidos() {
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState<string>("all");
  const [marketFilter, setMarket]   = useState<string>("all");

  const { data: orders = [], isLoading, isError, error, refetch, isFetching } =
    useQuery({
      queryKey: ["orders"],
      queryFn:  () => marketplaceApi.getOrders(),
      staleTime: 60_000,
    });

  const filtered = orders.filter((o) => {
    const matchSearch =
      !search ||
      o.externalOrderId.includes(search) ||
      o.buyerUsername.toLowerCase().includes(search.toLowerCase()) ||
      (o.trackingNumber ?? "").includes(search);

    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchMarket = marketFilter === "all" || (o as OrderDto & { marketplace?: string }).marketplace === marketFilter;

    return matchSearch && matchStatus && matchMarket;
  });

  const totals = {
    all:       orders.length,
    completed: orders.filter((o) => o.status === "COMPLETED" || o.status === "PAID").length,
    pending:   orders.filter((o) => o.status === "UNPAID").length,
    cancelled: orders.filter((o) => o.status === "CANCELLED").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Pedidos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pedidos sincronizados de todos os marketplaces
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          Atualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",      value: totals.all,       icon: ShoppingCart, color: "text-foreground" },
          { label: "Concluídos", value: totals.completed, icon: CheckCircle2, color: "text-green-500" },
          { label: "Pendentes",  value: totals.pending,   icon: Clock,        color: "text-yellow-500" },
          { label: "Cancelados", value: totals.cancelled, icon: XCircle,      color: "text-red-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="py-3">
            <CardContent className="px-4 flex items-center gap-3">
              <Icon size={20} className={color} />
              <div>
                <p className="text-lg font-bold leading-none">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar pedido, comprador ou rastreio..."
            className="pl-8 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="COMPLETED">Concluído</SelectItem>
            <SelectItem value="PAID">Pago</SelectItem>
            <SelectItem value="READY_TO_SHIP">Pronto p/ enviar</SelectItem>
            <SelectItem value="UNPAID">Pendente</SelectItem>
            <SelectItem value="CANCELLED">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={marketFilter} onValueChange={setMarket}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="Marketplace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="mercadolivre">Mercado Livre</SelectItem>
            <SelectItem value="shopee">Shopee</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {isLoading ? "Carregando…" : `${filtered.length} pedido${filtered.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <OrderSkeleton />}

          {isError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
              {error instanceof ApiError ? error.message : "Erro ao carregar pedidos."}
            </div>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <EmptyState filtered={search !== "" || statusFilter !== "all" || marketFilter !== "all"} />
          )}

          {!isLoading && filtered.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
