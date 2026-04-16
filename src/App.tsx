import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { RequireAuth } from "@/components/RequireAuth";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Produtos from "@/pages/Produtos";
import Entregas from "@/pages/Entregas";
import Pedidos from "@/pages/Pedidos";
import Financeiro from "@/pages/Financeiro";
import Integracoes from "@/pages/Integracoes";
import AuthCallback from "@/pages/AuthCallback";
import AdicionarProdutoML from "@/pages/AdicionarProdutoML";
import DiagnosticoML from "@/pages/DiagnosticoML";
import Configuracoes from "@/pages/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* Callback OAuth — redirect_uri registrado no ML/Shopee deve apontar aqui */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/entregas" element={<Entregas />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/integracoes" element={<Integracoes />} />
            <Route path="/integracoes/adicionar-produto" element={<AdicionarProdutoML />} />
            <Route path="/integracoes/diagnostico" element={<DiagnosticoML />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
