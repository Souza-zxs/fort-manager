import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getStoredMercadoLivreAccount } from "@/lib/mercadoLivre";

const API_BASE = import.meta.env.VITE_API_URL?.trim() || "http://localhost:3001";

interface DiagnosticResult {
  check: string;
  status: "success" | "error" | "warning";
  message: string;
  details?: any;
}

const DiagnosticoML = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const mlAccount = getStoredMercadoLivreAccount();

  const runDiagnostic = async () => {
    if (!mlAccount) {
      toast({
        title: "Mercado Livre não conectado",
        description: "Conecte sua conta primeiro",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    setResults([]);
    const diagnosticResults: DiagnosticResult[] = [];

    try {
      const accessToken = localStorage.getItem("ml_access_token");

      // 1. Verificar token
      diagnosticResults.push({
        check: "Token de Acesso",
        status: accessToken ? "success" : "error",
        message: accessToken ? "Token encontrado" : "Token não encontrado",
      });

      if (!accessToken) {
        setResults(diagnosticResults);
        setIsChecking(false);
        return;
      }

      // 2. Buscar dados do usuário
      try {
        const userResponse = await fetch(`${API_BASE}/api/mercadolivre/user/${mlAccount.userId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          diagnosticResults.push({
            check: "Dados do Usuário",
            status: "success",
            message: `Usuário: ${userData.nickname || userData.id}`,
            details: {
              id: userData.id,
              nickname: userData.nickname,
              email: userData.email,
              status: userData.status?.site_status,
            },
          });
        } else {
          diagnosticResults.push({
            check: "Dados do Usuário",
            status: "error",
            message: "Erro ao buscar dados do usuário",
          });
        }
      } catch (error) {
        diagnosticResults.push({
          check: "Dados do Usuário",
          status: "error",
          message: "Erro ao buscar dados do usuário",
        });
      }

      // 3. Verificar endereços
      try {
        const addressResponse = await fetch(`${API_BASE}/api/mercadolivre/user/${mlAccount.userId}/addresses`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (addressResponse.ok) {
          const addresses = await addressResponse.json();
          
          if (Array.isArray(addresses) && addresses.length > 0) {
            diagnosticResults.push({
              check: "Endereços Cadastrados",
              status: "success",
              message: `${addresses.length} endereço(s) encontrado(s)`,
              details: addresses,
            });
          } else {
            diagnosticResults.push({
              check: "Endereços Cadastrados",
              status: "error",
              message: "Nenhum endereço cadastrado",
              details: "Cadastre um endereço em: https://www.mercadolivre.com.br/vendas/configuracao/dados",
            });
          }
        } else {
          diagnosticResults.push({
            check: "Endereços Cadastrados",
            status: "warning",
            message: "Não foi possível verificar endereços",
          });
        }
      } catch (error) {
        diagnosticResults.push({
          check: "Endereços Cadastrados",
          status: "warning",
          message: "Erro ao verificar endereços",
        });
      }

      // 4. Testar criação de item (dry run)
      diagnosticResults.push({
        check: "Permissão para Publicar",
        status: "warning",
        message: "Tente publicar um produto de teste para verificar",
      });

    } catch (error) {
      toast({
        title: "Erro no diagnóstico",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setResults(diagnosticResults);
      setIsChecking(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="text-green-500" size={20} />;
      case "error":
        return <XCircle className="text-red-500" size={20} />;
      case "warning":
        return <AlertCircle className="text-yellow-500" size={20} />;
      default:
        return <AlertCircle className="text-gray-500" size={20} />;
    }
  };

  if (!mlAccount) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/integracoes")}>
          <ArrowLeft size={16} />
          Voltar
        </Button>
        <Card className="gradient-card border-border/50">
          <CardContent className="p-6 text-center">
            <XCircle size={48} className="mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Mercado Livre não conectado</h3>
            <p className="text-muted-foreground mb-4">
              Conecte sua conta do Mercado Livre antes de executar o diagnóstico.
            </p>
            <Button onClick={() => navigate("/integracoes")}>
              Ir para Integrações
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate("/integracoes")} className="mb-2">
            <ArrowLeft size={16} />
            Voltar
          </Button>
          <h1 className="text-2xl font-display font-bold text-foreground">Diagnóstico - Mercado Livre</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Verifique o status da sua integração
          </p>
        </div>
        <Button onClick={runDiagnostic} disabled={isChecking}>
          {isChecking ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Executar Diagnóstico
            </>
          )}
        </Button>
      </div>

      <Card className="gradient-card border-border/50">
        <CardHeader>
          <CardTitle>Conta Conectada</CardTitle>
          <CardDescription>
            User ID: {mlAccount.userId}
            {mlAccount.nickname && ` - ${mlAccount.nickname}`}
          </CardDescription>
        </CardHeader>
      </Card>

      {results.length > 0 && (
        <Card className="gradient-card border-border/50">
          <CardHeader>
            <CardTitle>Resultados do Diagnóstico</CardTitle>
            <CardDescription>Verificações realizadas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <p className="font-medium text-foreground">{result.check}</p>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-primary cursor-pointer">Ver detalhes</summary>
                      <pre className="mt-2 p-2 bg-secondary rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {results.length === 0 && !isChecking && (
        <Card className="gradient-card border-border/50">
          <CardContent className="p-6 text-center">
            <AlertCircle size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Clique em "Executar Diagnóstico" para verificar sua integração
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DiagnosticoML;
