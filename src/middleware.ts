// =============================================================
// MIDDLEWARE do Next.js — roda ANTES de cada página/rota.
// Aqui só delegamos para o nosso helper que cuida da sessão do Supabase
// e da proteção de rotas (ver src/lib/supabase/middleware.ts).
// =============================================================

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // O matcher define em quais caminhos o middleware roda.
  // Excluímos arquivos estáticos e imagens (não precisam de checagem de login).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
