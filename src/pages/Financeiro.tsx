import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign, TrendingUp, TrendingDown, ShoppingCart,
  RefreshCw, CalendarDays, CheckCircle2, XCircle,
} from "lucide-react";
import { marketplaceApi, type FinanceSummaryDto } from "@/lib/marketplaceApi";
import { ApiError } from "@/lib/marketplaceApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style:    "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(iso));
}

// ── Períodos predefinidos ─────────────────────────────────────────────────────

type PeriodKey = "7d" | "30d" | "90d" | "custom";

const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: "7d",  label: "7 dias",   days: 7  },
  { key: "30d", label: "30 dias",  days: 30 },
  { key: "90d", label: "90 dias",  days: 90 },
];

function periodDates(days: number): { from: Date; to: Date } {
  const to   = new Date();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return { from, to };
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title:    string;
  value:    string;
  sub?:     string;
  icon:     React.ElementType;
  iconCls?: string;
  loading:  boolean;
}

function KpiCard({ title, value, sub, icon: Icon, iconCls = "text-primary", loading }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon size={18} className={iconCls} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-28 mt-1" />
        ) : (
          <>
            <p className="text-2xl font-bold font-display tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Financeiro() {
  const [period, setPeriod] = useState<PeriodKey>("30d");

  const { from, to } = periodDates(
    PERIODS.find((p) => p.key === period)?.days ?? 30,
  );

  const { data, isLoading, isError, error, refetch, isFetching } =
    useQuery<FinanceSummaryDto>({
      queryKey: ["finance-summary", period],
      queryFn:  () => marketplaceApi.getFinanceSummary(from, to),
      staleTime: 60_000,
    });

  const currency   = data?.currency ?? "BRL";
  const netMargin  = data
    ? data.totalRevenue > 0
      ? ((data.totalNetAmount / data.totalRevenue) * 100).toFixed(1)
      : "0.0"
    : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Resumo de receita, taxas e margem líquida
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

      {/* Seletor de período */}
      <div className="flex items-center gap-2 flex-wrap">
        <CalendarDays size={14} className="text-muted-foreground" />
        {PERIODS.map((p) => (
          <Button
            key={p.key}
            variant={period === p.key ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </Button>
        ))}

        <span className="text-xs text-muted-foreground ml-auto">
          {formatDate(from.toISOString())} – {formatDate(to.toISOString())}
        </span>
      </div>

      {/* Erro */}
      {isError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Erro ao carregar dados financeiros."}
        </div>
      )}

      {/* KPIs — linha 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Receita Bruta"
          value={data ? formatCurrency(data.totalRevenue, currency) : "—"}
          sub="Total dos pedidos concluídos"
          icon={DollarSign}
          iconCls="text-green-500"
          loading={isLoading}
        />
        <KpiCard
          title="Taxas & Comissões"
          value={data ? formatCurrency(data.totalFees, currency) : "—"}
          sub="Taxas do marketplace"
          icon={TrendingDown}
          iconCls="text-red-500"
          loading={isLoading}
        />
        <KpiCard
          title="Receita Líquida"
          value={data ? formatCurrency(data.totalNetAmount, currency) : "—"}
          sub={`Margem: ${netMargin}%`}
          icon={TrendingUp}
          iconCls="text-primary"
          loading={isLoading}
        />
        <KpiCard
          title="Total de Pedidos"
          value={data ? String(data.totalOrders) : "—"}
          sub={data ? `${data.completedOrders} concluídos · ${data.cancelledOrders} cancelados` : undefined}
          icon={ShoppingCart}
          loading={isLoading}
        />
      </div>

      {/* Breakdown detalhado */}
      {!isLoading && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Taxa efetiva */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Taxa efetiva do marketplace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Receita bruta</span>
                <span>{formatCurrency(data.totalRevenue, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxas descontadas</span>
                <span className="text-red-500">− {formatCurrency(data.totalFees, currency)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between font-semibold">
                <span>Receita líquida</span>
                <span className="text-primary">{formatCurrency(data.totalNetAmount, currency)}</span>
              </div>
              {/* Barra de progresso da margem */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Margem líquida</span>
                  <span>{netMargin}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(parseFloat(netMargin) || 0, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status dos pedidos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Status dos pedidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  label: "Concluídos",
                  value: data.completedOrders,
                  total: data.totalOrders,
                  icon: CheckCircle2,
                  color: "bg-green-500",
                  textColor: "text-green-500",
                },
                {
                  label: "Cancelados",
                  value: data.cancelledOrders,
                  total: data.totalOrders,
                  icon: XCircle,
                  color: "bg-red-500",
                  textColor: "text-red-500",
                },
                {
                  label: "Outros",
                  value: data.totalOrders - data.completedOrders - data.cancelledOrders,
                  total: data.totalOrders,
                  icon: ShoppingCart,
                  color: "bg-muted-foreground",
                  textColor: "text-muted-foreground",
                },
              ].map(({ label, value, total, icon: Icon, color, textColor }) => {
                const pct = total > 0 ? (value / total) * 100 : 0;
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Icon size={13} className={textColor} />
                        {label}
                      </span>
                      <span className="font-medium">
                        {value} <span className="text-muted-foreground text-xs">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Skeleton do breakdown */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
      )}
    </div>
  );
}
