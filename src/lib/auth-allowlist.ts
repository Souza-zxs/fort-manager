import { ALLOWED_LOGIN_EMAIL } from "@/constants/auth";

/** Verifica se o e-mail pertence à única conta autorizada no painel. */
export function isAllowedAppUserEmail(email: string | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === ALLOWED_LOGIN_EMAIL.toLowerCase();
}
