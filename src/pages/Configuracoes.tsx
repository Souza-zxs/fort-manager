import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { Loader2, Mail, UserRound, KeyRound, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

function getDisplayName(user: User | null): string {
  if (!user) return "";
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const name = meta?.full_name ?? meta?.name;
  return typeof name === "string" ? name : "";
}

const Configuracoes = () => {
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [sendingReset, setSendingReset] = useState(false);

  const syncFromUser = useCallback((user: User | null) => {
    setName(getDisplayName(user));
    setEmail(user?.email ?? "");
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      syncFromUser(s?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      syncFromUser(nextSession?.user ?? null);
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncFromUser]);

  const user = session?.user ?? null;
  const hasVerifiedEmail = Boolean(user?.email);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const nextEmail = email.trim();
      const { error } = await supabase.auth.updateUser(
        nextEmail && nextEmail !== user.email
          ? { email: nextEmail, data: { full_name: name.trim() } }
          : { data: { full_name: name.trim() } },
      );
      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description:
          nextEmail && nextEmail !== user.email
            ? "Confirme o novo e-mail pelo link que enviamos para a caixa de entrada."
            : "Seu nome foi salvo.",
      });
    } catch (err) {
      toast({
        title: "Não foi possível salvar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendPasswordEmail = async () => {
    if (!user?.email) {
      toast({
        title: "E-mail necessário",
        description: "Cadastre um e-mail no perfil para receber o link de redefinição.",
        variant: "destructive",
      });
      return;
    }
    setSendingReset(true);
    try {
      const redirectTo = `${window.location.origin}/configuracoes`;
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo,
      });
      if (error) throw error;
      toast({
        title: "E-mail enviado",
        description:
          "Abra o link que enviamos para definir uma nova senha. Ele expira após alguns minutos.",
      });
    } catch (err) {
      toast({
        title: "Falha ao enviar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSendingReset(false);
    }
  };

  const handleCompleteRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({
        title: "Senha inválida",
        description: "Use pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        variant: "destructive",
      });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setRecoveryMode(false);
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Senha atualizada",
        description: "Sua nova senha já está valendo.",
      });
    } catch (err) {
      toast({
        title: "Não foi possível alterar a senha",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Carregando perfil…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="mt-1 text-muted-foreground">
          Gerencie seus dados e a segurança da conta.
        </p>
      </div>

      {recoveryMode && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <CardTitle>Definir nova senha</CardTitle>
            </div>
            <CardDescription>
              Você abriu o link enviado por e-mail. Escolha uma nova senha para concluir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCompleteRecovery} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando…
                  </>
                ) : (
                  "Salvar nova senha"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-xl">Perfil</CardTitle>
          </div>
          <CardDescription>Nome e e-mail exibidos na sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasVerifiedEmail && (
            <div className="mb-4 flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Sem e-mail cadastrado, não é possível enviar o link de redefinição de senha. Informe um
                e-mail válido abaixo e salve — você receberá uma confirmação se necessário.
              </span>
            </div>
          )}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nome</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">E-mail</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="voce@exemplo.com"
              />
              <p className="text-xs text-muted-foreground">
                Se alterar o e-mail, a troca só vale após confirmação na caixa de entrada.
              </p>
            </div>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                "Salvar alterações do perfil"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-xl">Senha</CardTitle>
          </div>
          <CardDescription>
            Por segurança, a senha não é alterada aqui diretamente. Enviamos um link para seu e-mail;
            só após abrir o link você poderá definir uma nova senha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />
          <p className="text-sm text-muted-foreground">
            Use o botão abaixo para receber o e-mail com o link de redefinição. O link expira após um
            tempo — se precisar, solicite outro.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={handleSendPasswordEmail}
            disabled={sendingReset || !hasVerifiedEmail}
          >
            {sendingReset ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando…
              </>
            ) : (
              <>
                <KeyRound className="mr-2 h-4 w-4" />
                Enviar link por e-mail para redefinir senha
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Configuracoes;
