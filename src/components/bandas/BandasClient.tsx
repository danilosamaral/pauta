"use client"; // Formulários e ações interativas -> roda no navegador.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Formato de cada banda que a tela exibe.
export type BandaItem = {
  id: string;
  name: string;
  role: "moderator" | "member";
  memberCount: number;
};

export default function BandasClient({ inicial }: { inicial: BandaItem[] }) {
  // A lista começa com o que o servidor carregou; atualizamos localmente.
  const [bandas, setBandas] = useState<BandaItem[]>(inicial);

  // Form "criar banda".
  const [nome, setNome] = useState("");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Link de convite gerado, por banda. E controle de "copiado".
  const [linkPorBanda, setLinkPorBanda] = useState<Record<string, string>>({});
  const [gerando, setGerando] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  // ----- Criar banda (vira moderador automaticamente, via função do banco) -----
  async function criarBanda(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCriando(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_band", {
      p_name: nome.trim(),
    });
    setCriando(false);
    if (error || !data) {
      setErro("Não consegui criar a banda. Tente de novo.");
      return;
    }
    // Adiciona na lista sem recarregar a página.
    setBandas((b) => [
      ...b,
      { id: data as string, name: nome.trim(), role: "moderator", memberCount: 1 },
    ]);
    setNome("");
  }

  // ----- Gerar link de convite (só moderador) -----
  async function gerarConvite(bandId: string) {
    setErro(null);
    setGerando(bandId);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_invite", {
      p_band_id: bandId,
    });
    setGerando(null);
    if (error || !data) {
      setErro("Não consegui gerar o convite.");
      return;
    }
    // Monta o link completo usando o endereço atual do app.
    const url = `${window.location.origin}/convite/${data}`;
    setLinkPorBanda((m) => ({ ...m, [bandId]: url }));
  }

  async function copiar(bandId: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(bandId);
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      // Alguns navegadores bloqueiam a área de transferência; ignoramos.
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
          Bandas
        </p>
        <h2 className="font-display text-xl font-bold">Seus grupos</h2>
        <p className="mt-1 text-sm text-dim">
          Crie uma banda e convide a galera pelo link (mande no WhatsApp).
        </p>
      </div>

      {/* Lista de bandas */}
      {bandas.length === 0 ? (
        <p className="rounded-pauta border border-dashed border-line p-5 text-sm text-dim">
          Você ainda não está em nenhuma banda. Crie a primeira abaixo. 👇
        </p>
      ) : (
        bandas.map((banda) => (
          <div
            key={banda.id}
            className="rounded-pauta border border-line bg-surface p-4"
          >
            <div className="flex items-center gap-3">
              {/* Glifo com a inicial */}
              <div className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-gradient-to-br from-[#8a4fd6] to-[#6a30b8] font-display text-lg font-extrabold text-white">
                {banda.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-display text-base font-bold">
                    {banda.name}
                  </span>
                  <BadgePapel role={banda.role} />
                </div>
                <p className="mt-0.5 text-xs text-dim">
                  {banda.memberCount}{" "}
                  {banda.memberCount === 1 ? "integrante" : "integrantes"}
                </p>
              </div>
            </div>

            {/* Convite (só moderador) */}
            {banda.role === "moderator" && (
              <div className="mt-3 border-t border-line pt-3">
                {linkPorBanda[banda.id] ? (
                  <div className="flex flex-col gap-2">
                    <p className="break-all rounded-lg border border-line bg-ink px-3 py-2 font-mono text-[11px] text-dim">
                      {linkPorBanda[banda.id]}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copiar(banda.id, linkPorBanda[banda.id])}
                        className="flex-1 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink active:scale-[0.98]"
                      >
                        {copiado === banda.id ? "Copiado! ✓" : "Copiar link"}
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `Bora tocar? Entra na nossa banda "${banda.name}" no Pauta: ${linkPorBanda[banda.id]}`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-center text-sm font-semibold text-text active:scale-[0.98]"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => gerarConvite(banda.id)}
                    disabled={gerando === banda.id}
                    className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm font-semibold text-text active:scale-[0.98] disabled:opacity-60"
                  >
                    {gerando === banda.id
                      ? "Gerando…"
                      : "Gerar link de convite"}
                  </button>
                )}
              </div>
            )}
          </div>
        ))
      )}

      {/* Form: criar banda */}
      <form
        onSubmit={criarBanda}
        className="mt-2 rounded-pauta border border-line bg-surface p-4"
      >
        <label htmlFor="nomeBanda" className="text-sm text-dim">
          Criar uma nova banda
        </label>
        <input
          id="nomeBanda"
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Os Notívagos"
          required
          className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-3 text-text outline-none focus:border-brand"
        />
        {erro && <p className="mt-2 text-sm text-busy">{erro}</p>}
        <button
          type="submit"
          disabled={criando}
          className="mt-3 w-full rounded-lg bg-brand px-4 py-3 font-semibold text-brand-ink active:scale-[0.98] disabled:opacity-60"
        >
          {criando ? "Criando…" : "Criar banda"}
        </button>
      </form>
    </section>
  );
}

// Selo "Moderador" / "Membro".
function BadgePapel({ role }: { role: "moderator" | "member" }) {
  const ehMod = role === "moderator";
  return (
    <span
      className={`flex-none rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${
        ehMod
          ? "border border-brand/35 bg-brand/15 text-[#d4aaff]"
          : "border border-line bg-surface-2 text-dim"
      }`}
    >
      {ehMod ? "Moderador" : "Membro"}
    </span>
  );
}
