import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { supabase } from "@/lib/supabase";
import type { MeliItem, MeliUser } from "@/api/marketplaces/types/mercadolivre-types";

const API_BASE = (
  import.meta.env.VITE_API_URL?.trim() ||
  (typeof window !== "undefined" ? window.location.origin : "https://fort-manager.vercel.app/integracoes")
).replace(/\/$/, "");

const mlHttp = axios.create({
  baseURL: `${API_BASE}/api/marketplaces/mercadolivre`,
  timeout: 20_000,
});

function mlErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const body = err.response?.data as { error?: string; message?: string } | undefined;
    return body?.error ?? body?.message ?? err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

async function authRequest<T>(path: string, config: AxiosRequestConfig = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Sessão expirada. Faça login para continuar.");
  }

  try {
    const { data } = await mlHttp.request<T>({
      url: path,
      ...config,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(config.headers as Record<string, string> | undefined),
      },
    });
    return data;
  } catch (err) {
    throw new Error(mlErrorMessage(err));
  }
}

export interface MeliAddress {
  id: number;
  address_line?: string;
  city?: { name?: string };
  state?: { name?: string };
}

export async function fetchCurrentUser(): Promise<MeliUser> {
  return authRequest<MeliUser>("/me", { method: "GET" });
}

export async function fetchMercadoLivreItems(): Promise<MeliItem[]> {
  const data = await authRequest<{ items: MeliItem[] }>("/items?status=active", { method: "GET" });
  return data.items ?? [];
}

export async function fetchMercadoLivreAddresses(): Promise<MeliAddress[]> {
  return authRequest<MeliAddress[]>("/me/addresses", { method: "GET" });
}

export async function createMercadoLivreItem(itemData: Record<string, unknown>): Promise<MeliItem> {
  return authRequest<MeliItem>("/items", { method: "POST", data: itemData });
}

export async function addMercadoLivreDescription(itemId: string, description: string): Promise<void> {
  await authRequest(`/items/${itemId}`, {
    method: "PATCH",
    data: { description: { plain_text: description } },
  });
}
