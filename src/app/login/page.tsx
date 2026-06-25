"use client"; // Esta tela roda no navegador (tem formulário e estado interativo).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PAISES } from "@/lib/constants";

/**
 * TELA DE LOGIN — por telefone, com código OTP (6 dígitos).
 *
 * Fluxo em duas etapas:
 *  1) "fone": a pessoa digita o telefone -> pedimos o código (signInWithOtp).
 *  2) "codigo": a pessoa digita o código recebido -> validamos (verifyOtp).
 *
 * Na demo, o código não chega por SMS de verdade: ele aparece nos logs de
 * Auth do Supabase (números de teste). Em produção, viria por SMS (Twilio).
 */
export default function LoginPage() {
  const router = useRouter();

  // Em qual etapa estamos.
  const [etapa, setEtapa] = useState<"fone" | "codigo">("fone");
  // Código do país escolhido (padrão: Brasil +55).
  const [pais, setPais] = useState(PAISES[0].ddi);
  // O que a pessoa digita.
  const [fone, setFone] = useState(""); // só os dígitos (DDD + número)
  const [codigo, setCodigo] = useState("");
  // Estados de carregamento e erro, para dar feedback na tela.
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Monta o telefone no formato E.164 que o Supabase exige: +<código> + dígitos.
  function telefoneE164() {
    const apenasDigitos = fone.replace(/\D/g, "");
    return `${pais}${apenasDigitos}`;
  }

  // Etapa 1: pedir o código.
  async function pedirCodigo(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    // Criamos o cliente AQUI (no clique), e não durante a renderização.
    // Isso evita que o build quebre ao pré-renderizar a página sem as
    // variáveis de ambiente.
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone: telefoneE164(),
    });

    setCarregando(false);
    if (error) {
      setErro(traduzErro(error.message));
      return;
    }
    setEtapa("codigo"); // deu certo -> vai para digitar o código
  }

  // Etapa 2: validar o código e entrar.
  async function validarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      phone: telefoneE164(),
      token: codigo.trim(),
      type: "sms",
    });

    setCarregando(false);
    if (error) {
      setErro(traduzErro(error.message));
      return;
    }
    // Logado! Se viemos de um link protegido (ex.: convite), voltamos pra ele;
    // senão, para a home. Só aceitamos caminhos internos (começam com "/").
    const next = new URLSearchParams(window.location.search).get("next");
    const destino = next && next.startsWith("/") ? next : "/";
    router.replace(destino);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center gap-8 px-6">
      {/* Marca */}
      <div className="text-center">
        <h1 className="font-display text-5xl font-extrabold tracking-tight">
          Pauta<span className="text-brand">.</span>
        </h1>
        <p className="mt-3 text-sm text-dim">
          Entre com seu telefone para começar.
        </p>
      </div>

      {/* Cartão do formulário */}
      <div className="rounded-pauta border border-line bg-surface p-5">
        {etapa === "fone" ? (
          <form onSubmit={pedirCodigo} className="flex flex-col gap-4">
            <label className="text-sm text-dim" htmlFor="fone">
              Seu telefone (com DDD)
            </label>
            <div className="flex items-center gap-2">
              {/* Seletor de país (código do país) */}
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

            {erro && <p className="text-sm text-busy">{erro}</p>}

            <button
              type="submit"
              disabled={carregando}
              className="rounded-lg bg-brand px-4 py-3 font-semibold text-brand-ink transition active:scale-[0.98] disabled:opacity-60"
            >
              {carregando ? "Enviando..." : "Enviar código"}
            </button>
          </form>
        ) : (
          <form onSubmit={validarCodigo} className="flex flex-col gap-4">
            <label className="text-sm text-dim" htmlFor="codigo">
              Código enviado para {telefoneE164()}
            </label>
            <input
              id="codigo"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
              className="rounded-lg border border-line bg-ink px-3 py-3 text-center font-mono text-lg tracking-[0.3em] text-text outline-none focus:border-brand"
            />

            {erro && <p className="text-sm text-busy">{erro}</p>}

            <button
              type="submit"
              disabled={carregando}
              className="rounded-lg bg-brand px-4 py-3 font-semibold text-brand-ink transition active:scale-[0.98] disabled:opacity-60"
            >
              {carregando ? "Verificando..." : "Entrar"}
            </button>

            {/* Volta para corrigir o telefone */}
            <button
              type="button"
              onClick={() => {
                setEtapa("fone");
                setCodigo("");
                setErro(null);
              }}
              className="text-sm text-dim underline"
            >
              Usar outro telefone
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

// Traduz as mensagens de erro mais comuns do Supabase para algo amigável.
function traduzErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid") && m.includes("otp"))
    return "Código inválido ou expirado. Tente novamente.";
  if (m.includes("rate") || m.includes("frequency"))
    return "Aguarde alguns segundos antes de pedir um novo código.";
  if (m.includes("phone"))
    return "Telefone inválido. Confira o DDD e o número.";
  return "Algo deu errado. Tente novamente.";
}
