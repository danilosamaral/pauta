// =============================================================
// CLIENTE SUPABASE — versão SERVIDOR (Server Components, Route Handlers)
//
// Diferente do cliente de navegador, este precisa ler/gravar os COOKIES
// da requisição para saber QUEM é o usuário logado (a sessão fica em cookies).
// Por isso ele recebe o helper cookies() do Next.js.
//
// Observação: em Server Components a gente só LÊ cookies; a escrita pode
// falhar (e tudo bem) porque o "set" de cookies só vale em Route Handlers
// ou no middleware. Por isso o try/catch silencioso no set.
// =============================================================

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

export async function createClient() {
  // No Next 15, cookies() é assíncrono — por isso o await.
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Lê todos os cookies da requisição.
        getAll() {
          return cookieStore.getAll();
        },
        // Tenta gravar cookies (renovação de sessão). Em Server Components
        // isso pode lançar erro — ignoramos, pois o middleware cuidará disso
        // quando entrarmos no fluxo de login (Passo 3).
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Ignorado de propósito (ver comentário acima).
          }
        },
      },
    },
  );
}
