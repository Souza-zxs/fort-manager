import { useMemo } from "react";
import { Package, Truck, DollarSign, TrendingUp } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Tooltip, XAxis, YAxis } from "recharts";
import { useOrders } from "@/hooks/useOrders";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { XAxisProps, YAxisProps } from "recharts";
import type { TooltipProps } from "recharts"; 

const yaxis: YAxisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fill: "hsl(0, 0%, 55%)", fontSize: 11 },
};

const xaxis: XAxisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fill: "hsl(0, 0%, 55%)", fontSize: 12 },
};


const statusStyles: Record<string, string> = {
  "SHIPPED": "bg-accent/15 text-accent",
  "READY_TO_SHIP": "bg-warning/15 text-warning",
  "COMPLETED": "bg-success/15 text-success",
  "CANCELLED": "bg-destructive/15 text-destructive",
  "UNPAID": "bg-muted/15 text-muted-foreground",
};

function formatCurrency(amount: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return format(new Date(iso), "dd/MM/yyyy", { locale: ptBR });
}

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    COMPLETED: "Entregue",
    SHIPPED: "Enviado",
    READY_TO_SHIP: "Preparando",
    CANCELLED: "Cancelado",
    UNPAID: "Pendente",
    PAID: "Pago",
  };
  return map[status] || status;
}

// Status para gráfico de pizzas
const deliveryStatusData = [
  { name: "Entregue", value: 0, color: "hsl(142, 70%, 45%)" },
  { name: "Em Trânsito", value: 0, color: "hsl(0, 85%, 50%)" },
  { name: "Preparando", value: 0, color: "hsl(38, 92%, 50%)" },
  { name: "Cancelado", value: 0, color: "hsl(0, 0%, 55%)" },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number | string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="gradient-card border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-display font-bold text-foreground">
          {typeof payload[0].value === "number" && payload[0].value > 1000
            ? `R$ ${Number(payload[0].value).toLocaleString("pt-BR")}`
            : payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const { data: orders, isLoading } = useOrders();

  // Calcular estatísticas dos pedidos
  const stats = useMemo(() => {
    const completedOrders = orders?.filter(o => o.status === "COMPLETED").length ?? 0;
    const pendingOrders = orders?.filter(o => o.status === "READY_TO_SHIP" || o.status === "UNPAID").length ?? 0;
    const totalRevenue = orders?.reduce((sum, o) => sum + (o.status !== "CANCELLED" ? o.totalAmount : 0), 0) ?? 0;
    const todayOrders = orders?.filter(o => {
      const orderDate = new Date(o.orderCreatedAt);
      const today = new Date();
      return orderDate.toDateString() === today.toDateString();
    }).length ?? 0;

    // Vendas por dia nos últimos 7 dias
    const salesByDay: Record<string, number> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const key = date.toLocaleDateString("pt-BR", { month: "short", day: "numeric" });
      salesByDay[key] = 0;
    }

    orders?.forEach(order => {
      const orderDate = new Date(order.orderCreatedAt);
      const daysDiff = Math.floor((today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0 && daysDiff <= 6) {
        const key = orderDate.toLocaleDateString("pt-BR", { month: "short", day: "numeric" });
        salesByDay[key] = (salesByDay[key] || 0) + 1;
      }
    });

    const revenueData = Object.entries(salesByDay).map(([month, valor]) => ({ month, valor }));

    // Status das entregas
    const statusCounts = {
      completed: orders?.filter(o => o.status === "COMPLETED").length ?? 0,
      shipped: orders?.filter(o => o.status === "SHIPPED").length ?? 0,
      preparing: orders?.filter(o => o.status === "READY_TO_SHIP").length ?? 0,
      cancelled: orders?.filter(o => o.status === "CANCELLED").length ?? 0,
    };

    const total = orders?.length ?? 0;
    const pieData = [
      { name: "Entregue", value: total > 0 ? Math.round((statusCounts.completed / total) * 100) : 0, color: "hsl(142, 70%, 45%)" },
      { name: "Em Trânsito", value: total > 0 ? Math.round((statusCounts.shipped / total) * 100) : 0, color: "hsl(0, 85%, 50%)" },
      { name: "Preparando", value: total > 0 ? Math.round((statusCounts.preparing / total) * 100) : 0, color: "hsl(38, 92%, 50%)" },
      { name: "Cancelado", value: total > 0 ? Math.round((statusCounts.cancelled / total) * 100) : 0, color: "hsl(0, 0%, 55%)" },
    ];

    return {
      activeProducts: 0, // precisaria de API de produtos
      pendingDeliveries: pendingOrders,
      monthlyRevenue: totalRevenue,
      todaySales: todayOrders,
      revenueData,
      deliveryPieData: pieData,
      ordersCount: total,
    };
  }, [orders]);

  const recentOrders = orders
    ?.sort((a, b) => new Date(b.orderCreatedAt).getTime() - new Date(a.orderCreatedAt).getTime())
    .slice(0, 5) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visão geral do seu negócio - {stats.ordersCount} pedido(s) sincronizado(s)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="gradient-card rounded-lg border border-border p-5 hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <Package size={22} className="text-primary" />
          </div>
          <p className="font-display text-2xl font-bold">{stats.ordersCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Total de Pedidos</p>
        </div>

        <div className="gradient-card rounded-lg border border-border p-5 hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <Truck size={22} className="text-accent" />
          </div>
          <p className="font-display text-2xl font-bold">{stats.pendingDeliveries}</p>
          <p className="text-xs text-muted-foreground mt-1">Entregas Pendentes</p>
        </div>

        <div className="gradient-card rounded-lg border border-border p-5 hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <DollarSign size={22} className="text-success" />
          </div>
          <p className="font-display text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">Faturamento Total</p>
        </div>

        <div className="gradient-card rounded-lg border border-border p-5 hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp size={22} className="text-chrome" />
          </div>
          <p className="font-display text-2xl font-bold">{stats.todaySales}</p>
          <p className="text-xs text-muted-foreground mt-1">Vendas Hoje</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="lg:col-span-2 gradient-card rounded-lg border border-border p-5">
          <h2 className="font-display text-lg font-semibold mb-4">Pedidos por Dia (Últimos 7 dias)</h2>
          {stats.revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={stats.revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 85%, 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0, 85%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(0, 0%, 55%)", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(0, 0%, 55%)", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="valor" stroke="hsl(0, 85%, 50%)" strokeWidth={2} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </div>

        {/* Delivery pie chart */}
        <div className="gradient-card rounded-lg border border-border p-5">
          <h2 className="font-display text-lg font-semibold mb-4">Status dos Pedidos</h2>
          {stats.ordersCount > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.deliveryPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                    {stats.deliveryPieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="gradient-card border border-border rounded-lg px-3 py-2 shadow-lg">
                          <p className="text-xs text-muted-foreground">{payload[0].name}</p>
                          <p className="text-sm font-display font-bold text-foreground">{payload[0].value}%</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {stats.deliveryPieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Nenhum pedido
            </div>
          )}
        </div>
      </div>

      {/* Sales by category - placeholder */}
      <div className="gradient-card rounded-lg border border-border p-5">
        <h2 className="font-display text-lg font-semibold mb-4">Pedidos por Marketplace</h2>
        <div className="text-sm text-muted-foreground">
          Liste suas integrações em "Integrações" para começar a receber pedidos
        </div>
      </div>

      {/* Recent orders */}
      <div className="gradient-card rounded-lg border border-border">
        <div className="p-5 border-b border-border">
          <h2 className="font-display text-xl font-semibold">Pedidos Recentes</h2>
        </div>
        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="text-left p-4 font-medium">Pedido</th>
                  <th className="text-left p-4 font-medium">Valor</th>
                  <th className="text-left p-4 font-medium">Cliente</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                    <td className="p-4 font-mono text-sm text-primary">{order.externalOrderId}</td>
                    <td className="p-4 font-medium">{formatCurrency(order.totalAmount, order.currency)}</td>
                    <td className="p-4 text-sm text-muted-foreground">{order.buyerUsername || "—"}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[order.status] || ""}`}>
                        {formatStatus(order.status)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{formatDate(order.orderCreatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <p>Nenhum pedido encontrado. Sincronize suas integrações para importar pedidos.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
