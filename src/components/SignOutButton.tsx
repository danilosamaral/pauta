"use client"; // Botão interativo -> roda no navegador.

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Botão "Sair": encerra a sessão no Supabase e volta para o login.
 */
export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function sair() {
    await supabase.auth.signOut(); // apaga a sessão (cookies)
    router.replace("/login");
    router.refresh(); // força o servidor a reconhecer que saiu
  }

  return (
    <button
      onClick={sair}
      className="rounded-lg border border-line bg-surface px-4 py-2 text-sm text-dim transition active:scale-[0.98] hover:border-brand hover:text-text"
    >
      Sair
    </button>
  );
}
