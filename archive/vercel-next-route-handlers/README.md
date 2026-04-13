# Handlers estilo Next.js (`route.ts`) — arquivados

Estes arquivos existiam em `api/marketplaces/**` e não são compatíveis com o deploy **Vite + Express** na Vercel: a plataforma trata cada arquivo em `/api` como função serverless, e `export async function GET` (estilo App Router) não é o formato esperado.

O backend oficial é o **Express** em `server/app.ts`, exposto na Vercel via `api/index.ts`.

Se precisar consultar a lógica antiga duplicada, os arquivos estão nesta pasta.
