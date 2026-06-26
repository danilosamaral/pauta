"use client"; // Formulário público -> roda no navegador.

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PAISES, PIX } from "@/lib/constants";
import { pixCopiaECola } from "@/lib/pix";
import Footer from "@/components/Footer";

/**
 * SOLICITAR ACESSO (página pública)
 *
 * Um fundador de outra banda pede acesso ao Pauta. O pedido entra na tabela
 * access_requests (status "pending"). O super-admin (Danilo) revisa em /admin
 * e, se aprovar, gera um link de acesso para o número informado.
 */
export default function SolicitarPage() {
  const [pais, setPais] = useState(PAISES[0].ddi);
  const [fone, setFone] = useState("");
  const [nome, setNome] = useState("");
  const [banda, setBanda] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  // Copia um texto (chave ou o "copia e cola") para a área de transferência.
  async function copiar(qual: string, texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      /* alguns navegadores bloqueiam */
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    // Telefone normalizado: código do país (dígitos) + número (dígitos).
    const paisDigitos = PAISES.find((p) => p.ddi === pais)?.digitos ?? "55";
    const telefone = `${paisDigitos}${fone.replace(/\D/g, "")}`;
    if (telefone.length < 10) {
      setErro("Confira o número (com DDD).");
      return;
    }

    setEnviando(true);
    const supabase = createClient();
    const { error } = await supabase.from("access_requests").insert({
      name: nome.trim(),
      phone: telefone,
      band_name: banda.trim(),
      message: mensagem.trim() || null,
    });
    setEnviando(false);
    if (error) {
      setErro("Não consegui enviar o pedido. Confira os dados e tente de novo.");
      return;
    }
    setEnviado(true);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Pauta<span className="text-brand">.</span>
        </h1>
        <p className="mt-3 text-sm text-dim">
          Quer usar o Pauta com a sua banda? Peça acesso.
        </p>
      </div>

      {enviado ? (
        <div className="rounded-pauta border border-line bg-surface p-5 text-center text-sm text-dim">
          <p className="text-text">Pedido enviado! 🎉</p>
          <p className="mt-2">
            Assim que for aprovado, você recebe um link de acesso no WhatsApp do
            número informado.
          </p>
          <Link href="/login" className="mt-4 inline-block text-brand underline">
            Voltar
          </Link>
        </div>
      ) : (
        <>
          {/* Aviso de cobrança (PIX) */}
          <div className="rounded-pauta border border-brand/40 bg-brand/10 p-4 text-sm">
            <p className="font-display text-base font-bold text-text">
              Acesso ao Pauta — {PIX.valorVisivel}
            </p>
            <p className="mt-1 text-dim">
              Valor único promocional de lançamento, pago via{" "}
              <strong className="text-text">PIX</strong> (sem cartão).
            </p>

            {/* Chave PIX */}
            <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-line bg-ink px-3 py-2">
              <span className="truncate font-mono text-xs text-dim">
                {PIX.chaveVisivel}
              </span>
              <button
                type="button"
                onClick={() => copiar("chave", PIX.chave)}
                className="flex-none rounded-md bg-surface-2 px-2 py-1 text-xs font-semibold text-text"
              >
                {copiado === "chave" ? "Copiado!" : "Copiar chave"}
              </button>
            </div>

            {/* PIX copia e cola (com valor embutido) */}
            <button
              type="button"
              onClick={() => copiar("pix", pixCopiaECola())}
              className="mt-2 w-full rounded-lg bg-brand px-3 py-2.5 text-sm font-semibold text-brand-ink active:scale-[0.98]"
            >
              {copiado === "pix" ? "Copiado! ✓" : "Copiar PIX copia e cola"}
            </button>

            <p className="mt-2 text-xs text-dim">
              Recebedor: {PIX.nome}. Já fez o PIX? Preencha seus dados abaixo
              para solicitar o acesso.
            </p>
          </div>

          <form
            onSubmit={enviar}
            className="flex flex-col gap-4 rounded-pauta border border-line bg-surface p-5"
          >
          <div>
            <label className="text-sm text-dim">Seu nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-3 text-text outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="text-sm text-dim">Seu telefone (com DDD)</label>
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
                type="tel"
                inputMode="numeric"
                placeholder="11 91234 5678"
                value={fone}
                onChange={(e) => setFone(e.target.value)}
                required
                className="flex-1 rounded-lg border border-line bg-ink px-3 py-3 text-text outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-dim">Nome da sua banda</label>
            <input
              type="text"
              value={banda}
              onChange={(e) => setBanda(e.target.value)}
              required
              className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-3 text-text outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="text-sm text-dim">Mensagem (opcional)</label>
            <input
              type="text"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Conte rapidinho sobre a banda"
              className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-3 text-text outline-none focus:border-brand"
            />
          </div>

          {erro && <p className="text-sm text-busy">{erro}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-brand px-4 py-3 font-semibold text-brand-ink transition active:scale-[0.98] disabled:opacity-60"
          >
            {enviando ? "Enviando…" : "Enviar pedido"}
          </button>

          <Link href="/login" className="text-center text-sm text-dim underline">
            Já tenho acesso
          </Link>
          </form>
        </>
      )}

      <Footer />
    </main>
  );
}
