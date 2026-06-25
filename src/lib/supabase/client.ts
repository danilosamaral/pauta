// =============================================================
// CLIENTE SUPABASE — versão NAVEGADOR (browser)
//
// Use este em componentes que rodam no navegador do usuário
// (os marcados com "use client"). Ele lê duas variáveis de ambiente
// públicas (começam com NEXT_PUBLIC_, então podem ir pro navegador):
//   - NEXT_PUBLIC_SUPABASE_URL: o endereço do seu projeto Supabase
//   - NEXT_PUBLIC_SUPABASE_ANON_KEY: a chave PÚBLICA (não é segredo;
//     quem protege os dados é o RLS no banco, não a chave).
// =============================================================

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function createClient() {
  // O <Database> passa o "mapa" das tabelas para o cliente, dando
  // autocomplete e checagem de tipos nas consultas.
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
