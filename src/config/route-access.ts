/**
 * Segurança do SPA: rotas que permanecem **públicas / anônimas** (não exigem login).
 *
 * Todas as demais URLs devem ficar sob `RequireAuth` + `AppLayout`.
 * Ao adicionar uma rota pública (ex.: termos, recuperação de senha), registre o path aqui
 * para documentação e inspeções futuras.
 */
export const ANONYMOUS_PUBLIC_PATHS = ["/login", "/auth/callback"] as const;

export type AnonymousPublicPath = (typeof ANONYMOUS_PUBLIC_PATHS)[number];

export function isAnonymousPublicPath(pathname: string): boolean {
  const normalized = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  return ANONYMOUS_PUBLIC_PATHS.some((p) => normalized === p || normalized.startsWith(`${p}/`));
}
