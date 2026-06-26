"use client"; // Formulário interativo -> roda no navegador.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * TELA "CRIE SUA SENHA" (6 dígitos)
 *
 * Aparece logo depois que a pessoa entra pelo convite. Ela define a própria
 * senha (atrelada à conta/telefone) chamando updateUser({ password }). A
 * partir daí dá pra entrar por telefone + senha, em qualquer aparelho.
 *
 * É opcional ("agora não"), mas recomendado — sem senha, só dá pra voltar
 * por um novo link de convite.
 */
export default function CriarSenhaPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    // Validação simples: exatamente 6 dígitos e as duas iguais.
    if (!/^\d{6}$/.test(senha)) {
      setErro("A senha precisa ter exatamente 6 dígitos.");
      return;
    }
    if (senha !== confirma) {
      setErro("As duas senhas não conferem.");
      return;
    }

    setSalvando(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    // Define a senha da própria conta.
    const { error: upErr } = await supabase.auth.updateUser({ password: senha });
    if (upErr) {
      setSalvando(false);
      setErro(traduzErro(upErr.message));
      return;
    }

    // Marca que a pessoa já criou a senha.
    await supabase
      .from("profiles")
      .update({ password_set: true })
      .eq("id", user.id);

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Pauta<span className="text-brand">.</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-dim">
          Crie uma senha de <strong className="text-text">6 dígitos</strong> para
          entrar depois por telefone + senha, de qualquer aparelho.
        </p>
      </div>

      <form
        onSubmit={salvar}
        className="flex flex-col gap-4 rounded-pauta border border-line bg-surface p-5"
      >
        <div>
          <label htmlFor="senha" className="text-sm text-dim">
            Sua senha (6 dígitos)
          </label>
          <input
            id="senha"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={6}
            placeholder="••••••"
            value={senha}
            onChange={(e) => setSenha(e.target.value.replace(/\D/g, ""))}
            className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-3 text-center font-mono text-lg tracking-[0.3em] text-text outline-none focus:border-brand"
          />
        </div>
        <div>
          <label htmlFor="confirma" className="text-sm text-dim">
            Repita a senha
          </label>
          <input
            id="confirma"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={6}
            placeholder="••••••"
            value={confirma}
            onChange={(e) => setConfirma(e.target.value.replace(/\D/g, ""))}
            className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-3 text-center font-mono text-lg tracking-[0.3em] text-text outline-none focus:border-brand"
          />
        </div>

        {erro && <p className="text-sm text-busy">{erro}</p>}

        <button
          type="submit"
          disabled={salvando}
          className="rounded-lg bg-brand px-4 py-3 font-semibold text-brand-ink transition active:scale-[0.98] disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Salvar senha"}
        </button>

        {/* Pular: segue logado neste aparelho, mas sem senha pra voltar depois. */}
        <button
          type="button"
          onClick={() => router.replace("/")}
          className="text-sm text-dim underline"
        >
          Agora não
        </button>
      </form>
    </main>
  );
}

function traduzErro(msg: string): string {
  const m = msg.toLowerCase();
  // O Supabase pode recusar senhas muito comuns/curtas, conforme a config.
  if (m.includes("weak") || m.includes("pwned") || m.includes("leaked") || m.includes("common"))
    return "Essa senha é muito comum. Escolha 6 dígitos menos óbvios.";
  if (m.includes("should be at least") || m.includes("length"))
    return "A senha precisa ter 6 dígitos.";
  return "Não consegui salvar a senha. Tente de novo.";
}
