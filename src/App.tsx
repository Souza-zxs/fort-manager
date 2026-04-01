import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Produtos from "@/pages/Produtos";
import Entregas from "@/pages/Entregas";
import Pedidos from "@/pages/Pedidos";
import Financeiro from "@/pages/Financeiro";
import Integracoes from "@/pages/Integracoes";
import AuthCallback from "@/pages/AuthCallback";
import AdicionarProdutoML from "@/pages/AdicionarProdutoML";
import DiagnosticoML from "@/pages/DiagnosticoML";
import NotFound from "./pages/NotFound";
import { supabase } from "@/lib/supabase";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

/** Garante que sempre existe uma sessão Supabase (anônima ou existente). */
function AuthInit() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        supabase.auth.signInAnonymously().catch((err: Error) => {
          console.warn('[Auth] Falha no login anônimo:', err.message);
        });
      }
    });
  }, []);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthInit />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/entregas" element={<Entregas />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/financeiro" element={<Financeiro />} />
            {/* Callback OAuth — redirect_uri registrado no ML/Shopee deve apontar aqui */}
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/integracoes" element={<Integracoes />} />
            <Route path="/integracoes/adicionar-produto" element={<AdicionarProdutoML />} />
            <Route path="/integracoes/diagnostico" element={<DiagnosticoML />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
