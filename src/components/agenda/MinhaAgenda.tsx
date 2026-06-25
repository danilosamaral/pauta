"use client"; // Calendário interativo -> roda no navegador.

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DIAS_SEMANA_CURTOS,
  MESES,
  dataLonga,
  diasNoMes,
  ehFimDeSemana,
  hoje,
  primeiroDiaSemana,
  ymd,
} from "@/lib/dates";

// Os dois estados que GRAVAMOS no banco. "livre" não se grava (ausência = livre).
type Estado = "maybe" | "busy";

// O que sabemos sobre um dia: o que a própria pessoa marcou (self, editável)
// e/ou um bloqueio vindo de evento de banda (event, só leitura).
type InfoDia = { self?: Estado; event?: Estado; note?: string | null };

// Mapa "AAAA-MM-DD" -> InfoDia, com tudo do mês visível.
type Mapa = Record<string, InfoDia>;

export default function MinhaAgenda({ userId }: { userId: string }) {
  // Mês visível (começa no mês de hoje). mes0 é 0-based (janeiro = 0).
  const inicio = hoje();
  const [ano, setAno] = useState(inicio.ano);
  const [mes0, setMes0] = useState(inicio.mes0);

  const [mapa, setMapa] = useState<Mapa>({});
  const [carregando, setCarregando] = useState(true);

  // Dia aberto no "sheet" (gaveta de baixo). null = fechado.
  const [diaAberto, setDiaAberto] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  // ----- Carrega a disponibilidade do mês visível -----
  const carregarMes = useCallback(async () => {
    setCarregando(true);
    const supabase = createClient();
    const primeiro = ymd(ano, mes0, 1);
    const ultimo = ymd(ano, mes0, diasNoMes(ano, mes0));

    // RLS garante que só vejo as minhas linhas; filtramos pelo intervalo do mês.
    const { data } = await supabase
      .from("availability")
      .select("day, status, source, note")
      .eq("profile_id", userId)
      .gte("day", primeiro)
      .lte("day", ultimo);

    // Monta o mapa por dia, separando o que é meu (self) do que é evento.
    const novo: Mapa = {};
    for (const linha of data ?? []) {
      const atual = novo[linha.day] ?? {};
      const estado = linha.status as Estado;
      if (linha.source === "self") {
        atual.self = estado;
        atual.note = linha.note;
      } else {
        atual.event = estado;
      }
      novo[linha.day] = atual;
    }
    setMapa(novo);
    setCarregando(false);
  }, [ano, mes0, userId]);

  useEffect(() => {
    carregarMes();
  }, [carregarMes]);

  // ----- Navegação de mês -----
  function mesAnterior() {
    if (mes0 === 0) {
      setAno(ano - 1);
      setMes0(11);
    } else setMes0(mes0 - 1);
  }
  function mesSeguinte() {
    if (mes0 === 11) {
      setAno(ano + 1);
      setMes0(0);
    } else setMes0(mes0 + 1);
  }

  // ----- Salvar o estado de um dia -----
  // livre  -> apaga a linha 'self' (ausência = livre)
  // maybe/busy -> apaga a 'self' antiga e insere a nova (com recado opcional)
  async function definir(dia: number, estado: Estado | "free", recado: string) {
    const chave = ymd(ano, mes0, dia);
    setSalvando(true);
    const supabase = createClient();

    // Sempre removemos a linha 'self' anterior do dia (no máx. 1 existe).
    await supabase
      .from("availability")
      .delete()
      .eq("profile_id", userId)
      .eq("day", chave)
      .eq("source", "self");

    if (estado !== "free") {
      await supabase.from("availability").insert({
        profile_id: userId,
        day: chave,
        status: estado,
        source: "self",
        note: recado.trim() || null,
      });
    }

    // Atualiza o mapa local (sem precisar recarregar tudo do servidor).
    setMapa((m) => {
      const novo = { ...m };
      const info = { ...(novo[chave] ?? {}) };
      if (estado === "free") {
        delete info.self;
        delete info.note;
      } else {
        info.self = estado;
        info.note = recado.trim() || null;
      }
      // Se não sobrou nada relevante no dia, remove a entrada.
      if (!info.self && !info.event) delete novo[chave];
      else novo[chave] = info;
      return novo;
    });

    setSalvando(false);
    setDiaAberto(null);
  }

  // Estado "efetivo" exibido na célula = pior entre o meu e o de evento.
  function estadoEfetivo(dia: number): "free" | Estado {
    const info = mapa[ymd(ano, mes0, dia)];
    if (!info) return "free";
    if (info.self === "busy" || info.event === "busy") return "busy";
    if (info.self === "maybe" || info.event === "maybe") return "maybe";
    return "free";
  }
  // Dia travado por evento de banda? (não editável aqui)
  function travado(dia: number): boolean {
    return !!mapa[ymd(ano, mes0, dia)]?.event;
  }

  const totalDias = diasNoMes(ano, mes0);
  const offset = primeiroDiaSemana(ano, mes0); // quantas células vazias no começo
  const h = hoje();
  const ehHoje = (dia: number) =>
    h.ano === ano && h.mes0 === mes0 && h.dia === dia;

  return (
    <section>
      {/* Cabeçalho da tela */}
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
        Minha agenda
      </p>
      <h2 className="font-display text-xl font-bold">Sua disponibilidade</h2>
      <p className="mt-1 text-sm leading-relaxed text-dim">
        Os dias começam livres (verde). Toque só pra avisar quando estiver
        ocupado ou em dúvida.
      </p>

      {/* Legenda */}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-dim">
        <Legenda cor="bg-free" texto="Livre" />
        <Legenda cor="bg-maybe" texto="Talvez" />
        <Legenda cor="bg-busy" texto="Ocupado" />
        <Legenda cor="bg-brand" texto="🔒 Banda" />
      </div>

      {/* Navegação de mês */}
      <div className="mb-3 mt-5 flex items-center justify-between">
        <span className="font-display text-lg font-bold">
          {MESES[mes0]} {ano}
        </span>
        <div className="flex gap-2">
          <BotaoMes onClick={mesAnterior} rotulo="‹" />
          <BotaoMes onClick={mesSeguinte} rotulo="›" />
        </div>
      </div>

      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7">
        {DIAS_SEMANA_CURTOS.map((d, i) => (
          <span
            key={i}
            className={`text-center font-mono text-[10.5px] ${
              ehFimDeSemana(i) ? "text-[#cdb0e8]" : "text-dim"
            }`}
          >
            {d}
          </span>
        ))}
      </div>

      {/* Grade do mês */}
      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {/* células vazias antes do dia 1 */}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`vazio-${i}`} />
        ))}

        {Array.from({ length: totalDias }).map((_, i) => {
          const dia = i + 1;
          const est = estadoEfetivo(dia);
          return (
            <button
              key={dia}
              onClick={() => setDiaAberto(dia)}
              className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-[13px] border transition active:scale-95 ${corCelula(
                est,
              )} ${ehHoje(dia) ? "!border-brand" : ""}`}
            >
              {travado(dia) && (
                <span className="absolute right-1 top-0.5 text-[9px]">🔒</span>
              )}
              <span
                className={`font-mono text-sm ${
                  ehHoje(dia) ? "text-[#d9b6ff]" : "text-text"
                }`}
              >
                {dia}
              </span>
              <span
                className="h-2 w-2 rounded-full"
                style={{ boxShadow: "0 0 7px -1px currentColor" }}
              >
                <span className={`block h-full w-full rounded-full ${corPip(est)}`} />
              </span>
            </button>
          );
        })}
      </div>

      {carregando && (
        <p className="mt-4 text-center text-sm text-dim">Carregando…</p>
      )}

      {/* Sheet (gaveta) de marcação */}
      {diaAberto !== null && (
        <SheetDia
          titulo={dataLonga(ano, mes0, diaAberto)}
          travado={travado(diaAberto)}
          estadoAtual={mapa[ymd(ano, mes0, diaAberto)]?.self}
          recadoAtual={mapa[ymd(ano, mes0, diaAberto)]?.note ?? ""}
          salvando={salvando}
          aoFechar={() => setDiaAberto(null)}
          aoSalvar={(estado, recado) => definir(diaAberto, estado, recado)}
        />
      )}
    </section>
  );
}

// ---------- Subcomponentes ----------

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${cor}`} />
      {texto}
    </span>
  );
}

function BotaoMes({ onClick, rotulo }: { onClick: () => void; rotulo: string }) {
  return (
    <button
      onClick={onClick}
      className="h-8 w-8 rounded-[10px] border border-line bg-surface text-text active:scale-95"
    >
      {rotulo}
    </button>
  );
}

// Classes de cor da célula conforme o estado.
function corCelula(est: "free" | Estado): string {
  if (est === "busy")
    return "bg-busy/[0.13] border-busy/40 text-busy";
  if (est === "maybe")
    return "bg-maybe/[0.13] border-maybe/40 text-maybe";
  return "bg-free/[0.12] border-free/30 text-free";
}
function corPip(est: "free" | Estado): string {
  if (est === "busy") return "bg-busy";
  if (est === "maybe") return "bg-maybe";
  return "bg-free";
}

// Gaveta inferior para escolher o estado do dia.
function SheetDia({
  titulo,
  travado,
  estadoAtual,
  recadoAtual,
  salvando,
  aoFechar,
  aoSalvar,
}: {
  titulo: string;
  travado: boolean;
  estadoAtual?: Estado;
  recadoAtual: string;
  salvando: boolean;
  aoFechar: () => void;
  aoSalvar: (estado: Estado | "free", recado: string) => void;
}) {
  // "free" representa o estado padrão (sem linha no banco).
  const [escolha, setEscolha] = useState<Estado | "free">(estadoAtual ?? "free");
  const [recado, setRecado] = useState(recadoAtual);

  return (
    <>
      {/* Fundo escurecido; toque fecha */}
      <div
        onClick={aoFechar}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
      />
      {/* Gaveta */}
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[430px] rounded-t-[24px] border-t border-line bg-surface px-5 pb-7 pt-2">
        <div className="mx-auto mt-2 mb-3.5 h-1 w-9 rounded-full bg-line" />
        <h3 className="font-display text-lg font-bold">{titulo}</h3>

        {travado ? (
          // Dia travado por evento de banda — só leitura.
          <div className="mt-3 rounded-pauta border border-line bg-ink p-4 text-sm text-dim">
            Você tem um <strong className="text-text">compromisso de banda</strong>{" "}
            nesse dia. Marcado pelo moderador — pra mudar, fale no grupo da banda.
          </div>
        ) : (
          <>
            <p className="mb-4 mt-1 text-sm text-dim">Como está esse dia pra você?</p>

            <div className="flex flex-col gap-2">
              <OpcaoEstado
                cor="bg-free"
                titulo="Livre"
                descricao="Pode marcar à vontade"
                selecionado={escolha === "free"}
                onClick={() => setEscolha("free")}
              />
              <OpcaoEstado
                cor="bg-maybe"
                titulo="Talvez"
                descricao="Ocupado, mas dá pra conversar"
                selecionado={escolha === "maybe"}
                onClick={() => setEscolha("maybe")}
              />
              <OpcaoEstado
                cor="bg-busy"
                titulo="Ocupado"
                descricao="Esse dia não rola"
                selecionado={escolha === "busy"}
                onClick={() => setEscolha("busy")}
              />
            </div>

            {/* Recado opcional (faz sentido p/ talvez e ocupado) */}
            {escolha !== "free" && (
              <div className="mt-4">
                <label className="text-sm text-dim">Recado pras bandas (opcional)</label>
                <input
                  type="text"
                  value={recado}
                  onChange={(e) => setRecado(e.target.value)}
                  placeholder="ex: posso remarcar o outro compromisso"
                  className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-text outline-none focus:border-brand"
                />
              </div>
            )}

            <button
              onClick={() => aoSalvar(escolha, recado)}
              disabled={salvando}
              className="mt-5 w-full rounded-lg bg-brand px-4 py-3 font-semibold text-brand-ink transition active:scale-[0.98] disabled:opacity-60"
            >
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          </>
        )}
      </div>
    </>
  );
}

function OpcaoEstado({
  cor,
  titulo,
  descricao,
  selecionado,
  onClick,
}: {
  cor: string;
  titulo: string;
  descricao: string;
  selecionado: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-pauta border px-4 py-3 text-left transition ${
        selecionado ? "border-brand bg-surface-2" : "border-line bg-ink"
      }`}
    >
      <span className={`h-3 w-3 flex-none rounded-full ${cor}`} />
      <span className="flex-1">
        <span className="block text-sm font-semibold text-text">{titulo}</span>
        <span className="block text-xs text-dim">{descricao}</span>
      </span>
      {selecionado && <span className="text-brand">✓</span>}
    </button>
  );
}
