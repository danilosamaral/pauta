"use client"; // Formulários e ações interativas -> roda no navegador.

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PAISES } from "@/lib/constants";

// Convite já gerado: guardamos o link e para quem ele é (número/nome).
type ConviteGerado = {
  url: string;
  telefoneDigitos: string; // só dígitos com código do país (ex.: 5567984541353)
  telefoneVisivel: string; // bonitinho pra mostrar (ex.: +55 67984541353)
  nome: string;
};

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

  // Convite gerado, por banda. E controle de "copiado".
  const [convitePorBanda, setConvitePorBanda] = useState<
    Record<string, ConviteGerado>
  >({});
  const [gerando, setGerando] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  // Formulário de convite: qual banda está com o form aberto + os campos.
  const [formAberto, setFormAberto] = useState<string | null>(null);
  const [convPais, setConvPais] = useState(PAISES[0].ddi); // padrão +55
  const [convNumero, setConvNumero] = useState("");
  const [convNome, setConvNome] = useState("");

  // Abre o formulário de convite zerado para uma banda.
  function abrirForm(bandId: string) {
    setErro(null);
    setConvPais(PAISES[0].ddi);
    setConvNumero("");
    setConvNome("");
    setFormAberto(bandId);
  }

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

  // ----- Gerar convite amarrado ao número (só moderador) -----
  async function gerarConvite(bandId: string) {
    setErro(null);

    // Normalização IGUAL à do login: código do país (só dígitos) + dígitos
    // do número, sem "+", espaços ou parênteses. Ex.: 55 + 67984541353.
    const paisDigitos = PAISES.find((p) => p.ddi === convPais)?.digitos ?? "55";
    const numeroDigitos = convNumero.replace(/\D/g, "");
    if (numeroDigitos.length < 8) {
      setErro("Confira o número do convidado (com DDD).");
      return;
    }
    const telefoneDigitos = `${paisDigitos}${numeroDigitos}`;

    setGerando(bandId);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_invite", {
      p_band_id: bandId,
      p_invited_phone: telefoneDigitos,
      p_invited_name: convNome.trim() || undefined,
      p_role: "member",
      p_instrument: undefined,
    });
    setGerando(null);
    if (error || !data) {
      setErro("Não consegui gerar o convite.");
      return;
    }

    const url = `${window.location.origin}/convite/${data}`;
    setConvitePorBanda((m) => ({
      ...m,
      [bandId]: {
        url,
        telefoneDigitos,
        telefoneVisivel: `${convPais} ${numeroDigitos}`,
        nome: convNome.trim(),
      },
    }));
    setFormAberto(null); // fecha o formulário, mostra o link pronto
  }

  // Texto pronto pro WhatsApp, deixando claro que o convite é pra aquele número.
  function textoConvite(bandName: string, c: ConviteGerado): string {
    const ola = c.nome ? `Oi, ${c.nome}!` : "Oi!";
    return (
      `${ola} Você foi convidado(a) pra banda "${bandName}" no Pauta. ` +
      `Esse convite é só pro seu número (${c.telefoneVisivel}). ` +
      `Entra por aqui: ${c.url}`
    );
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
            {/* Tocar no topo abre o calendário da banda. */}
            <Link
              href={`/bandas/${banda.id}`}
              className="flex items-center gap-3"
            >
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
              <span className="text-xl text-dim">›</span>
            </Link>

            {/* Convite (só moderador) */}
            {banda.role === "moderator" && (
              <div className="mt-3 border-t border-line pt-3">
                {convitePorBanda[banda.id] ? (
                  // Convite já gerado: link + textos prontos.
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-dim">
                      Convite para{" "}
                      <strong className="text-text">
                        {convitePorBanda[banda.id].nome || "o número"}
                      </strong>{" "}
                      ({convitePorBanda[banda.id].telefoneVisivel}). Só esse
                      número consegue entrar.
                    </p>
                    <p className="break-all rounded-lg border border-line bg-ink px-3 py-2 font-mono text-[11px] text-dim">
                      {convitePorBanda[banda.id].url}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          copiar(banda.id, convitePorBanda[banda.id].url)
                        }
                        className="flex-1 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink active:scale-[0.98]"
                      >
                        {copiado === banda.id ? "Copiado! ✓" : "Copiar link"}
                      </button>
                      <a
                        href={`https://wa.me/${convitePorBanda[banda.id].telefoneDigitos}?text=${encodeURIComponent(
                          textoConvite(banda.name, convitePorBanda[banda.id]),
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-center text-sm font-semibold text-text active:scale-[0.98]"
                      >
                        WhatsApp
                      </a>
                    </div>
                    <button
                      onClick={() => abrirForm(banda.id)}
                      className="text-xs text-dim underline"
                    >
                      Convidar outra pessoa
                    </button>
                  </div>
                ) : formAberto === banda.id ? (
                  // Formulário do convite (número + nome).
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-dim">Convidar pelo número</p>
                    <div className="flex items-center gap-2">
                      <select
                        value={convPais}
                        onChange={(e) => setConvPais(e.target.value)}
                        aria-label="Código do país"
                        className="rounded-lg border border-line bg-surface-2 px-2 py-2.5 font-mono text-sm text-text outline-none focus:border-brand"
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
                        placeholder="DDD + número"
                        value={convNumero}
                        onChange={(e) => setConvNumero(e.target.value)}
                        className="flex-1 rounded-lg border border-line bg-ink px-3 py-2.5 text-text outline-none focus:border-brand"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Nome do convidado (opcional)"
                      value={convNome}
                      onChange={(e) => setConvNome(e.target.value)}
                      className="rounded-lg border border-line bg-ink px-3 py-2.5 text-text outline-none focus:border-brand"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFormAberto(null)}
                        className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm font-semibold text-text active:scale-[0.98]"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => gerarConvite(banda.id)}
                        disabled={gerando === banda.id}
                        className="flex-1 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink active:scale-[0.98] disabled:opacity-60"
                      >
                        {gerando === banda.id ? "Gerando…" : "Gerar convite"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => abrirForm(banda.id)}
                    className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm font-semibold text-text active:scale-[0.98]"
                  >
                    Convidar
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
