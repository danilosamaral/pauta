"use client"; // Ações de aprovar/recusar -> roda no navegador.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Pedido = {
  id: string;
  name: string;
  phone: string;
  band_name: string;
  message: string | null;
  status: string;
  created_at: string;
  resulting_token: string | null;
  receipt_path: string | null;
};

export default function AdminClient({ inicial }: { inicial: Pedido[] }) {
  const [pedidos, setPedidos] = useState<Pedido[]>(inicial);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  async function aprovar(id: string) {
    setErro(null);
    setOcupado(id);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("approve_access_request", {
      p_request_id: id,
    });
    setOcupado(null);
    if (error || !data) {
      setErro("Não consegui aprovar. Tente de novo.");
      return;
    }
    const obj = data as { band_id: string; token: string };
    // Marca como aprovado e guarda o token (vira o link de acesso).
    setPedidos((lista) =>
      lista.map((p) =>
        p.id === id ? { ...p, status: "approved", resulting_token: obj.token } : p,
      ),
    );
  }

  async function recusar(id: string) {
    setErro(null);
    setOcupado(id);
    const supabase = createClient();
    const { error } = await supabase.rpc("reject_access_request", {
      p_request_id: id,
    });
    setOcupado(null);
    if (error) {
      setErro("Não consegui recusar. Tente de novo.");
      return;
    }
    setPedidos((lista) =>
      lista.map((p) => (p.id === id ? { ...p, status: "rejected" } : p)),
    );
  }

  // Abre o comprovante (bucket privado) via URL assinada temporária.
  async function verComprovante(path: string) {
    setErro(null);
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("comprovantes")
      .createSignedUrl(path, 120);
    if (error || !data?.signedUrl) {
      setErro("Não consegui abrir o comprovante.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function copiar(id: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(id);
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      /* alguns navegadores bloqueiam */
    }
  }

  const pendentes = pedidos.filter((p) => p.status === "pending");
  const tratados = pedidos.filter((p) => p.status !== "pending");

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
          Admin
        </p>
        <h2 className="font-display text-xl font-bold">Pedidos de acesso</h2>
        <p className="mt-1 text-sm text-dim">
          Aprovar cria a banda e gera um link de acesso para você enviar à pessoa.
        </p>
      </div>

      {erro && <p className="text-sm text-busy">{erro}</p>}

      {pendentes.length === 0 && (
        <p className="rounded-pauta border border-dashed border-line p-5 text-sm text-dim">
          Nenhum pedido pendente. 🎉
        </p>
      )}

      {pendentes.map((p) => (
        <div key={p.id} className="rounded-pauta border border-line bg-surface p-4">
          <p className="font-semibold">{p.band_name}</p>
          <p className="mt-0.5 text-sm text-dim">
            {p.name} · +{p.phone}
          </p>
          {p.message && (
            <p className="mt-2 text-sm text-dim">“{p.message}”</p>
          )}

          {p.receipt_path ? (
            <button
              onClick={() => verComprovante(p.receipt_path!)}
              className="mt-2 inline-block text-sm text-brand underline"
            >
              📎 Ver comprovante do PIX
            </button>
          ) : (
            <p className="mt-2 text-xs text-dim">Sem comprovante anexado.</p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => recusar(p.id)}
              disabled={ocupado === p.id}
              className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm font-semibold text-text active:scale-[0.98] disabled:opacity-60"
            >
              Recusar
            </button>
            <button
              onClick={() => aprovar(p.id)}
              disabled={ocupado === p.id}
              className="flex-1 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink active:scale-[0.98] disabled:opacity-60"
            >
              {ocupado === p.id ? "…" : "Aprovar"}
            </button>
          </div>
        </div>
      ))}

      {/* Tratados (aprovados mostram o link de acesso) */}
      {tratados.map((p) => {
        const url = p.resulting_token
          ? `${typeof window !== "undefined" ? window.location.origin : ""}/convite/${p.resulting_token}`
          : "";
        return (
          <div
            key={p.id}
            className="rounded-pauta border border-line bg-surface/60 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold">{p.band_name}</p>
              <span
                className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                  p.status === "approved"
                    ? "bg-free/15 text-free"
                    : "bg-busy/15 text-busy"
                }`}
              >
                {p.status === "approved" ? "Aprovado" : "Recusado"}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-dim">
              {p.name} · +{p.phone}
            </p>

            {p.status === "approved" && url && (
              <div className="mt-3 flex flex-col gap-2">
                <p className="break-all rounded-lg border border-line bg-ink px-3 py-2 font-mono text-[11px] text-dim">
                  {url}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => copiar(p.id, url)}
                    className="flex-1 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink active:scale-[0.98]"
                  >
                    {copiado === p.id ? "Copiado! ✓" : "Copiar link"}
                  </button>
                  <a
                    href={`https://wa.me/${p.phone}?text=${encodeURIComponent(
                      `Oi, ${p.name}! Seu acesso ao Pauta (banda "${p.band_name}") foi liberado. Entra por aqui: ${url}`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-center text-sm font-semibold text-text active:scale-[0.98]"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
