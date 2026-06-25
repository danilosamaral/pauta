"use client"; // Faz a chamada de "aceitar convite" -> roda no navegador.

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Fase = "convite" | "entrando" | "ok" | "erro";

export default function ClaimInvite({ token }: { token: string }) {
  const [fase, setFase] = useState<Fase>("convite");
  const [banda, setBanda] = useState("");
  const [jaEra, setJaEra] = useState(false); // a pessoa já era membro
  const [msg, setMsg] = useState("");

  async function entrar() {
    setFase("entrando");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("claim_invite", {
      invite_token: token,
    });
    if (error) {
      setMsg(traduzErro(error.message));
      setFase("erro");
      return;
    }
    // A função retorna { band_id, band_name, already }.
    // already = true significa que a pessoa JÁ era membro — também é sucesso.
    const obj = data as { band_id: string; band_name: string; already: boolean };
    setBanda(obj.band_name);
    setJaEra(obj.already);
    setFase("ok");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">
        Pauta<span className="text-brand">.</span>
      </h1>

      {fase === "ok" ? (
        <>
          <p className="text-lg">
            {jaEra ? "Você já está em " : "Você entrou em "}
            <span className="font-semibold text-brand">{banda}</span>! 🎉
          </p>
          <Link
            href="/bandas"
            className="rounded-lg bg-brand px-4 py-3 font-semibold text-brand-ink active:scale-[0.98]"
          >
            Ver minhas bandas
          </Link>
        </>
      ) : fase === "erro" ? (
        <>
          <p className="text-busy">{msg}</p>
          <Link href="/bandas" className="text-sm text-dim underline">
            Ir para minhas bandas
          </Link>
        </>
      ) : (
        <>
          <p className="text-dim">
            Você recebeu um convite para entrar em uma banda no Pauta.
          </p>
          <button
            onClick={entrar}
            disabled={fase === "entrando"}
            className="rounded-lg bg-brand px-4 py-3 font-semibold text-brand-ink active:scale-[0.98] disabled:opacity-60"
          >
            {fase === "entrando" ? "Entrando…" : "Entrar na banda"}
          </button>
        </>
      )}
    </main>
  );
}

function traduzErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("outro número") || m.includes("outro numero"))
    return "Este convite foi feito para outro número de telefone. Peça um convite para o seu número.";
  if (m.includes("já utilizado") || m.includes("ja utilizado"))
    return "Este convite já foi utilizado.";
  if (m.includes("expirado") || m.includes("expired")) return "Convite expirado.";
  if (m.includes("inválido") || m.includes("invalid")) return "Convite inválido.";
  return "Não consegui aceitar o convite. Tente abrir o link de novo.";
}
