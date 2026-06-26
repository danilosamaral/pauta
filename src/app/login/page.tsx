"use client"; // Formulário interativo -> roda no navegador.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PAISES } from "@/lib/constants";

/**
 * TELA DE LOGIN — telefone + senha.
 *
 * Quem já criou senha entra por aqui (qualquer aparelho). Quem é a primeira
 * vez entra pelo LINK DE CONVITE (que cria a sessão e leva pra criar a senha).
 * Esqueceu a senha? Peça um novo link ao moderador e redefina.
 */
export default function LoginPage() {
  const router = useRouter();
  const [pais, setPais] = useState(PAISES[0].ddi); // padrão +55
  const [fone, setFone] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEntrando(true);

    const supabase = createClient();
    const telefone = `${pais}${fone.replace(/\D/g, "")}`; // E.164: +55 + dígitos
    const { error } = await supabase.auth.signInWithPassword({
      phone: telefone,
      password: senha,
    });

    setEntrando(false);
    if (error) {
      setErro("Telefone ou senha incorretos.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="font-display text-5xl font-extrabold tracking-tight">
          Pauta<span className="text-brand">.</span>
        </h1>
        <p className="mt-3 text-sm text-dim">Entre com telefone e senha.</p>
      </div>

      <form
        onSubmit={entrar}
        className="flex flex-col gap-4 rounded-pauta border border-line bg-surface p-5"
      >
        <div>
          <label htmlFor="fone" className="text-sm text-dim">
            Seu telefone (com DDD)
          </label>
          <div className="mt-2 flex items-center gap-2">
            <select
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              aria-label="Código do país"
              className="rounded-lg border border-line bg-surface-2 px-2 py-3 font-mono text-sm text-text outline-none focus:border-brand"
            >
              {PAISES.map((p) => (
                <option key={p.ddi} value={p.ddi}>
                  {p.ddi}
                </option>
              ))}
            </select>
            <input
              id="fone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="11 91234 5678"
              value={fone}
              onChange={(e) => setFone(e.target.value)}
              required
              className="flex-1 rounded-lg border border-line bg-ink px-3 py-3 text-text outline-none focus:border-brand"
            />
          </div>
        </div>

        <div>
          <label htmlFor="senha" className="text-sm text-dim">
            Senha (6 dígitos)
          </label>
          <input
            id="senha"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={6}
            placeholder="••••••"
            value={senha}
            onChange={(e) => setSenha(e.target.value.replace(/\D/g, ""))}
            required
            className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-3 text-center font-mono text-lg tracking-[0.3em] text-text outline-none focus:border-brand"
          />
        </div>

        {erro && <p className="text-sm text-busy">{erro}</p>}

        <button
          type="submit"
          disabled={entrando}
          className="rounded-lg bg-brand px-4 py-3 font-semibold text-brand-ink transition active:scale-[0.98] disabled:opacity-60"
        >
          {entrando ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="px-2 text-center text-xs leading-relaxed text-dim">
        Primeira vez? Entre pelo <strong className="text-text">link de convite</strong>{" "}
        que o moderador te enviou — lá você cria sua senha. Esqueceu a senha?
        Peça um novo link pro moderador.
      </p>
    </main>
  );
}
