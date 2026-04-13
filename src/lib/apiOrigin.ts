/**
 * Origem HTTP onde o backend expõe `/api/*` (Express ou Vercel + mesmo host).
 *
 * Em produção na Vercel (SPA + API no mesmo domínio), deixe `VITE_API_URL` vazio
 * para usar `window.location.origin`. Em dev com API em outra porta, use
 * `VITE_API_URL=http://localhost:3001`.
 */
export function resolveApiOrigin(): string {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
  if (fromEnv && fromEnv.length > 0) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3001';
}