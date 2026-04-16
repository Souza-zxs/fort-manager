import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, Truck, Link2, X,
  ChevronRight, Settings, ShoppingCart, DollarSign, LogOut,
} from "lucide-react";
import fortLogo from "../assets/fort-logo.png";
import { supabase } from "@/lib/supabase";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard",   path: "/"           },
  { icon: Package,         label: "Produtos",    path: "/produtos"   },
  { icon: ShoppingCart,    label: "Pedidos",     path: "/pedidos"    },
  { icon: Truck,           label: "Entregas",    path: "/entregas"   },
  { icon: DollarSign,      label: "Financeiro",  path: "/financeiro" },
  { icon: Link2,           label: "Integrações", path: "/integracoes"},
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      onClick={collapsed ? () => setCollapsed(false) : undefined}
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none motion-reduce:duration-0 ${
        collapsed ? "w-16 cursor-pointer" : "w-64"
      }`}
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-sidebar-border p-4">
        <div className={`flex min-w-0 flex-1 items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <img src={fortLogo} alt="Fort Ferramentas" className="h-10 w-10 shrink-0 rounded object-contain" />
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="font-display text-lg font-bold leading-tight text-foreground">FORT</h1>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Ferramentas</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(true);
            }}
            className="ml-auto shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Fechar menu lateral"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={(e) => collapsed && e.stopPropagation()}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all group ${
                isActive
                  ? "bg-primary/15 text-primary glow-red"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon size={20} className={isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && isActive && <ChevronRight size={14} className="ml-auto text-primary" />}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border p-2">
        <Link
          to="/configuracoes"
          onClick={(e) => collapsed && e.stopPropagation()}
          className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-all hover:bg-sidebar-accent hover:text-foreground ${
            location.pathname === "/configuracoes"
              ? "bg-primary/15 text-primary glow-red"
              : "text-muted-foreground"
          }`}
        >
          <Settings size={18} className={location.pathname === "/configuracoes" ? "text-primary" : ""} />
          {!collapsed && <span>Configurações</span>}
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-foreground"
        >
          <LogOut size={18} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
