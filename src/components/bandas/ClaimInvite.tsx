"use client"; // Faz o "login pelo convite" -> roda no navegador.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Fase = "entrando" | "erro";

export default function ClaimInvite({ token }: { token: string }) {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>("entrando");
  const [msg, setMsg] = useState("");
  // Evita rodar duas vezes (o efeito pode disparar 2x em desenvolvimento).
  const jaRodou = useRef(false);

  useEffect(() => {
    if (jaRodou.current) return;
    jaRodou.current = true;

    (async () => {
      const supabase = createClient();

      // Chama a Edge Function que valida o convite e devolve a sessão.
      const { data, error } = await supabase.functions.invoke("claim-and-login", {
        body: { token },
      });

      if (error || !data) {
        setMsg("Não consegui abrir o convite. Tente novamente.");
        setFase("erro");
        return;
      }

      // Sucesso com sessão -> grava a sessão e leva pra criar a senha
      // (primeiro acesso ou redefinição). Lá a pessoa pode pular se quiser.
      if (data.access_token && data.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        router.replace("/criar-senha");
        router.refresh();
        return;
      }

      // Convite já usado: se EU já estiver logado (sou o convidado que já
      // entrou), sigo pra agenda; senão, é um link queimado.
      if (data.already) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          router.replace("/");
          router.refresh();
          return;
        }
        setMsg("Este convite já foi utilizado. Peça um novo ao moderador.");
        setFase("erro");
        return;
      }

      // Erros de negócio (inválido / expirado).
      setMsg(traduzErro(String(data.error ?? "")));
      setFase("erro");
    })();
  }, [token, router]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">
        Pauta<span className="text-brand">.</span>
      </h1>

      {fase === "entrando" ? (
        <p className="text-dim">Entrando pelo seu convite…</p>
      ) : (
        <>
          <p className="text-busy">{msg}</p>
          <Link href="/login" className="text-sm text-dim underline">
            Ir para a tela inicial
          </Link>
        </>
      )}
    </main>
  );
}

function traduzErro(erro: string): string {
  const m = erro.toLowerCase();
  if (m.includes("expirado")) return "Convite expirado. Peça um novo ao moderador.";
  if (m.includes("já utilizado") || m.includes("ja utilizado"))
    return "Este convite já foi utilizado. Peça um novo ao moderador.";
  if (m.includes("inválido") || m.includes("invalid"))
    return "Convite inválido. Confira o link com o moderador.";
  return "Não consegui abrir o convite. Tente novamente.";
}
