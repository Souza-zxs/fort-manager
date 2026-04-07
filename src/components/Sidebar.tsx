import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, Truck, Link2, Menu, X,
  ChevronRight, Settings, ShoppingCart, DollarSign,
} from "lucide-react";
import fortLogo from "../assets/fort-logo.png";

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

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-50 transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
      <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
        <img src={fortLogo} alt="Fort Ferramentas" className="h-10 w-10 object-contain rounded" />
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-display font-bold text-lg text-foreground leading-tight">FORT</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Ferramentas</p>
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
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

      <div className="p-2 border-t border-sidebar-border space-y-1">
        <button className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all w-full">
          <Settings size={18} />
          {!collapsed && <span>Configurações</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
