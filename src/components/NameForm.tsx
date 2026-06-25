"use client"; // Formulário interativo -> roda no navegador.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Formulário de primeiro acesso: a pessoa escolhe como quer ser chamada.
 * Atualiza o display_name do profile (que veio com o nome provisório).
 *
 * Recebe o id do usuário logado para saber qual linha atualizar. O RLS
 * só deixa a pessoa editar o PRÓPRIO profile, então é seguro.
 */
export default function NameForm({ userId }: { userId: string }) {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: nome.trim() })
      .eq("id", userId);

    setSalvando(false);
    if (error) {
      setErro("Não consegui salvar. Tente de novo.");
      return;
    }
    router.refresh(); // recarrega a home já com o nome
  }

  return (
    <form
      onSubmit={salvar}
      className="rounded-pauta border border-line bg-surface p-5"
    >
      <label htmlFor="nome" className="text-sm text-dim">
        Como você quer ser chamado(a) nas bandas?
      </label>
      <input
        id="nome"
        type="text"
        placeholder="Ex.: Dani (baixo)"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        required
        className="mt-3 w-full rounded-lg border border-line bg-ink px-3 py-3 text-text outline-none focus:border-brand"
      />
      {erro && <p className="mt-2 text-sm text-busy">{erro}</p>}
      <button
        type="submit"
        disabled={salvando}
        className="mt-4 w-full rounded-lg bg-brand px-4 py-3 font-semibold text-brand-ink transition active:scale-[0.98] disabled:opacity-60"
      >
        {salvando ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
