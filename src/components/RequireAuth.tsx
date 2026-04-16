import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ALLOWED_LOGIN_EMAIL } from "@/constants/auth";

function emailIsAllowed(email: string | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === ALLOWED_LOGIN_EMAIL.toLowerCase();
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [status, setStatus] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    let cancelled = false;

    const evaluate = async (session: Awaited<
      ReturnType<typeof supabase.auth.getSession>
    >["data"]["session"]) => {
      if (!session?.user) {
        if (!cancelled) setStatus("denied");
        return;
      }
      if (!emailIsAllowed(session.user.email ?? undefined)) {
        await supabase.auth.signOut();
        if (!cancelled) setStatus("denied");
        return;
      }
      if (!cancelled) setStatus("ok");
    };

    supabase.auth.getSession().then(({ data: { session } }) => evaluate(session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      evaluate(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-background text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span>Verificando sessão…</span>
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
