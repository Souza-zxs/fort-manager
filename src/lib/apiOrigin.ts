/**
 * Origem HTTP onde o backend expõe `/api/*` (Express).
 *
 * Produção (ex.: Vercel com mesmo host do SPA): defina
 * `VITE_API_URL=https://fort-manager.vercel.app` (somente origem, sem path).
 * Se vazio, no browser usa `window.location.origin`; fora do browser, dev default.
 */
export function resolveApiOrigin(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3001';
}
