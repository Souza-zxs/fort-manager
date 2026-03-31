import { Package, Truck, DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { getProductImage } from "@/lib/productImages";

const stats = [
  { label: "Produtos Ativos", value: "847", change: "+12%", up: true, icon: Package, color: "text-primary" },
  { label: "Entregas Pendentes", value: "23", change: "-5%", up: false, icon: Truck, color: "text-accent" },
  { label: "Faturamento Mensal", value: "R$ 45.280", change: "+18%", up: true, icon: DollarSign, color: "text-success" },
  { label: "Vendas Hoje", value: "34", change: "+8%", up: true, icon: TrendingUp, color: "text-chrome" },
];

const recentOrders = [
  { id: "#FT-2847", product: "Jogo de Chaves Allen", customer: "João Silva", status: "Enviado", date: "04/03/2026" },
  { id: "#FT-2846", product: "Furadeira de Impacto", customer: "Maria Santos", status: "Preparando", date: "04/03/2026" },
  { id: "#FT-2845", product: "Kit Parafusos Sextavados", customer: "Carlos Oliveira", status: "Entregue", date: "03/03/2026" },
  { id: "#FT-2844", product: "Serra Circular 7¼\"", customer: "Ana Costa", status: "Enviado", date: "03/03/2026" },
  { id: "#FT-2843", product: "Nível a Laser", customer: "Pedro Souza", status: "Entregue", date: "02/03/2026" },
];

const statusStyles: Record<string, string> = {
  "Enviado": "bg-accent/15 text-accent",
  "Preparando": "bg-warning/15 text-warning",
  "Entregue": "bg-success/15 text-success",
  "Cancelado": "bg-destructive/15 text-destructive",
};

const revenueData = [
  { month: "Set", valor: 28400 },
  { month: "Out", valor: 32100 },
  { month: "Nov", valor: 38700 },
  { month: "Dez", valor: 52300 },
  { month: "Jan", valor: 41200 },
  { month: "Fev", valor: 39800 },
  { month: "Mar", valor: 45280 },
];

const salesByCategory = [
  { name: "Parafusos", vendas: 320 },
  { name: "Furadeiras", vendas: 185 },
  { name: "Chaves", vendas: 240 },
  { name: "Serras", vendas: 95 },
  { name: "Medição", vendas: 150 },
  { name: "Alicates", vendas: 210 },
];

const deliveryStatusData = [
  { name: "Entregue", value: 68, color: "hsl(142, 70%, 45%)" },
  { name: "Em Trânsito", value: 15, color: "hsl(0, 85%, 50%)" },
  { name: "Preparando", value: 10, color: "hsl(38, 92%, 50%)" },
  { name: "Devolvido", value: 7, color: "hsl(0, 0%, 55%)" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="gradient-card border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-display font-bold text-foreground">
          {typeof payload[0].value === "number" && payload[0].value > 1000
            ? `R$ ${payload[0].value.toLocaleString("pt-BR")}`
            : payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do seu negócio na Shopee</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="gradient-card rounded-lg border border-border p-5 hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <stat.icon size={22} className={stat.color} />
              <span className={`flex items-center gap-1 text-xs font-medium ${stat.up ? "text-success" : "text-destructive"}`}>
                {stat.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {stat.change}
              </span>
            </div>
            <p className="font-display text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="lg:col-span-2 gradient-card rounded-lg border border-border p-5">
          <h2 className="font-display text-lg font-semibold mb-4">Faturamento Mensal</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0, 85%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(0, 85%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(0, 0%, 55%)", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(0, 0%, 55%)", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="valor" stroke="hsl(0, 85%, 50%)" strokeWidth={2} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Delivery pie chart */}
        <div className="gradient-card rounded-lg border border-border p-5">
          <h2 className="font-display text-lg font-semibold mb-4">Status das Entregas</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={deliveryStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                {deliveryStatusData.map((entry, index) => (
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
            {deliveryStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-medium ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sales by category */}
      <div className="gradient-card rounded-lg border border-border p-5">
        <h2 className="font-display text-lg font-semibold mb-4">Vendas por Categoria</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={salesByCategory} barSize={32}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(0, 0%, 55%)", fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(0, 0%, 55%)", fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="vendas" fill="hsl(0, 85%, 50%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent orders */}
      <div className="gradient-card rounded-lg border border-border">
        <div className="p-5 border-b border-border">
          <h2 className="font-display text-xl font-semibold">Pedidos Recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left p-4 font-medium">Pedido</th>
                <th className="text-left p-4 font-medium">Produto</th>
                <th className="text-left p-4 font-medium">Cliente</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => {
                const img = getProductImage(order.product);
                return (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                    <td className="p-4 font-mono text-sm text-primary">{order.id}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md overflow-hidden bg-secondary flex-shrink-0">
                          {img ? <img src={img} alt={order.product} className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
                        </div>
                        <span className="text-sm">{order.product}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{order.customer}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{order.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
