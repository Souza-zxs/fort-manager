import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import fortLogo from "@/assets/fort-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { ALLOWED_LOGIN_EMAIL } from "@/constants/auth";
import { useToast } from "@/hooks/use-toast";

function emailIsAllowed(email: string | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === ALLOWED_LOGIN_EMAIL.toLowerCase();
}

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState(ALLOWED_LOGIN_EMAIL);
  const [password, setPassword] = useState("");

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user && emailIsAllowed(session.user.email ?? undefined)) {
        navigate(from, { replace: true });
        return;
      }
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [from, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const trimmed = email.trim().toLowerCase();
      if (trimmed !== ALLOWED_LOGIN_EMAIL.toLowerCase()) {
        toast({
          title: "Acesso negado",
          description: "Apenas a conta autorizada pode entrar neste painel.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });

      if (error) throw error;
      if (!data.user || !emailIsAllowed(data.user.email ?? undefined)) {
        await supabase.auth.signOut();
        toast({
          title: "Acesso negado",
          description: "Conta não autorizada.",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Bem-vindo" });
      navigate(from, { replace: true });
    } catch (err) {
      toast({
        title: "Falha no login",
        description: err instanceof Error ? err.message : "Verifique e-mail e senha.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-background text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <img src={fortLogo} alt="Fort Ferramentas" className="h-16 w-16 rounded-lg object-contain" />
        <h1 className="font-display text-2xl font-bold tracking-tight">FORT</h1>
        <p className="text-sm text-muted-foreground">Ferramentas — painel administrativo</p>
      </div>

      <Card className="w-full max-w-md border-border/80 shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Entrar</CardTitle>
          </div>
          <CardDescription>
            Use a conta autorizada para acessar o dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Senha</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando…
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Problemas para entrar? Confirme no Supabase Auth se o usuário{" "}
            <span className="font-mono text-[11px]">{ALLOWED_LOGIN_EMAIL}</span> existe com a senha
            correta.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
