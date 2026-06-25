"use client"; // Calendário interativo com busca de dados -> roda no navegador.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  DIAS_SEMANA_CURTOS,
  MESES,
  dataLonga,
  diaSemana,
  diasNoMes,
  ehFimDeSemana,
  hoje,
  primeiroDiaSemana,
  ymd,
} from "@/lib/dates";

export type Integrante = {
  id: string;
  nome: string;
  instrumento: string | null;
};

// Estado individual e estado agregado da banda no dia.
type Estado = "maybe" | "busy";
type Agregado = "free" | "maybe" | "busy" | "reserved";

// Como cada integrante está num dia (com recado, se houver).
type StatusMembro = { id: string; nome: string; estado: "free" | Estado; note: string | null };

export default function BandaCalendario({
  bandId,
  bandName,
  souModerador,
  integrantes,
}: {
  bandId: string;
  bandName: string;
  souModerador: boolean;
  integrantes: Integrante[];
}) {
  const inicio = hoje();
  const [ano, setAno] = useState(inicio.ano);
  const [mes0, setMes0] = useState(inicio.mes0);
  const [carregando, setCarregando] = useState(true);

  // disponibilidade por dia -> por integrante: { estado, note }
  const [porDia, setPorDia] = useState<
    Record<string, Record<string, { estado: Estado; note: string | null }>>
  >({});
  // dias reservados (eventos da banda) -> info do evento
  const [reservas, setReservas] = useState<
    Record<string, { kind: string; location: string | null; start_time: string | null; hold: string }>
  >({});

  const [diaAberto, setDiaAberto] = useState<number | null>(null);

  const idsIntegrantes = integrantes.map((m) => m.id);

  // ----- Carrega disponibilidade dos integrantes + reservas do mês -----
  const carregar = useCallback(async () => {
    setCarregando(true);
    const supabase = createClient();
    const primeiro = ymd(ano, mes0, 1);
    const ultimo = ymd(ano, mes0, diasNoMes(ano, mes0));

    // Disponibilidade de TODOS os integrantes (RLS permite ver colegas de banda).
    const { data: disp } = await supabase
      .from("availability")
      .select("profile_id, day, status, note, source")
      .in("profile_id", idsIntegrantes)
      .gte("day", primeiro)
      .lte("day", ultimo);

    // Monta o mapa dia -> integrante -> pior estado (busy vence maybe).
    const mapa: Record<string, Record<string, { estado: Estado; note: string | null }>> = {};
    for (const linha of disp ?? []) {
      const dia = linha.day;
      const mid = linha.profile_id;
      const estado = linha.status as Estado;
      mapa[dia] ??= {};
      const atual = mapa[dia][mid];
      if (!atual || (estado === "busy" && atual.estado === "maybe")) {
        mapa[dia][mid] = { estado, note: linha.note };
      } else if (atual.estado === estado && !atual.note && linha.note) {
        atual.note = linha.note;
      }
    }
    setPorDia(mapa);

    // Reservas (eventos) da banda no mês — entram em ação no Passo 7.
    const { data: evs } = await supabase
      .from("events")
      .select("day, kind, location, start_time, hold")
      .eq("band_id", bandId)
      .gte("day", primeiro)
      .lte("day", ultimo);

    const mr: Record<string, { kind: string; location: string | null; start_time: string | null; hold: string }> = {};
    for (const e of evs ?? []) {
      mr[e.day] = { kind: e.kind, location: e.location, start_time: e.start_time, hold: e.hold };
    }
    setReservas(mr);
    setCarregando(false);
    // idsIntegrantes é derivado de integrantes; usamos a versão estável abaixo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, mes0, bandId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ----- Cálculo do estado de cada integrante e do agregado -----
  function statusDoMembro(mid: string, dia: number): "free" | Estado {
    return porDia[ymd(ano, mes0, dia)]?.[mid]?.estado ?? "free";
  }

  function agregado(dia: number): Agregado {
    if (reservas[ymd(ano, mes0, dia)]) return "reserved";
    let temMaybe = false;
    for (const m of integrantes) {
      const s = statusDoMembro(m.id, dia);
      if (s === "busy") return "busy"; // 1 vermelho já decide
      if (s === "maybe") temMaybe = true;
    }
    return temMaybe ? "maybe" : "free";
  }

  // Lista de integrantes por cor, para o detalhe do dia.
  function rosterDoDia(dia: number): {
    livres: StatusMembro[];
    talvez: StatusMembro[];
    ocupados: StatusMembro[];
  } {
    const livres: StatusMembro[] = [];
    const talvez: StatusMembro[] = [];
    const ocupados: StatusMembro[] = [];
    for (const m of integrantes) {
      const info = porDia[ymd(ano, mes0, dia)]?.[m.id];
      const estado = info?.estado ?? "free";
      const item: StatusMembro = { id: m.id, nome: m.nome, estado, note: info?.note ?? null };
      if (estado === "busy") ocupados.push(item);
      else if (estado === "maybe") talvez.push(item);
      else livres.push(item);
    }
    return { livres, talvez, ocupados };
  }

  // ----- Faixa "datas livres pra todos" -----
  // Dias com agregado 'free', daqui pra frente, fim de semana primeiro.
  const totalDias = diasNoMes(ano, mes0);
  const h = hoje();
  const ehMesAtual = h.ano === ano && h.mes0 === mes0;
  const datasLivres: number[] = [];
  for (let d = 1; d <= totalDias; d++) {
    if (ehMesAtual && d < h.dia) continue; // só daqui pra frente
    if (agregado(d) === "free") datasLivres.push(d);
  }
  datasLivres.sort((a, b) => {
    const fa = ehFimDeSemana(diaSemana(ano, mes0, a)) ? 0 : 1;
    const fb = ehFimDeSemana(diaSemana(ano, mes0, b)) ? 0 : 1;
    return fa - fb || a - b;
  });
  const melhores = datasLivres.slice(0, 6);

  const offset = primeiroDiaSemana(ano, mes0);
  const ehHoje = (dia: number) =>
    h.ano === ano && h.mes0 === mes0 && h.dia === dia;

  function mesAnterior() {
    if (mes0 === 0) { setAno(ano - 1); setMes0(11); } else setMes0(mes0 - 1);
  }
  function mesSeguinte() {
    if (mes0 === 11) { setAno(ano + 1); setMes0(0); } else setMes0(mes0 + 1);
  }

  return (
    <section>
      {/* Cabeçalho da banda */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/bandas"
          className="grid h-9 w-9 flex-none place-items-center rounded-[11px] border border-line bg-surface text-lg"
        >
          ‹
        </Link>
        <div className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-gradient-to-br from-[#8a4fd6] to-[#6a30b8] font-display text-base font-extrabold text-white">
          {bandName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg font-bold">{bandName}</div>
          <div className="text-xs text-dim">
            {integrantes.length}{" "}
            {integrantes.length === 1 ? "integrante" : "integrantes"} ·{" "}
            {souModerador ? "você é moderador" : "você é membro"}
          </div>
        </div>
      </div>

      {/* Faixa: datas livres pra todos */}
      <div className="mb-4 rounded-pauta border border-line bg-gradient-to-br from-[#241a31] to-[#2c2140] p-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-dim">
          Datas livres pra todos · ⭐ fim de semana
        </p>
        {melhores.length === 0 ? (
          <p className="text-sm text-dim">
            Nenhuma data totalmente livre neste mês. Tente o próximo. ›
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {melhores.map((d) => {
              const fds = ehFimDeSemana(diaSemana(ano, mes0, d));
              return (
                <button
                  key={d}
                  onClick={() => setDiaAberto(d)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                    fds
                      ? "border-maybe/55 bg-maybe/[0.18] text-[#f7dd9c]"
                      : "border-free/40 bg-free/[0.14] text-[#9af0bd]"
                  }`}
                >
                  {fds && <span>⭐</span>}
                  {d}/{mes0 + 1}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-dim">
        <Legenda cor="bg-free" texto="Todos livres" />
        <Legenda cor="bg-maybe" texto="Algum talvez" />
        <Legenda cor="bg-busy" texto="Alguém ocupado" />
        <Legenda cor="bg-brand" texto="Marcado" />
      </div>

      {/* Navegação de mês */}
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-lg font-bold">
          {MESES[mes0]} {ano}
        </span>
        <div className="flex gap-2">
          <BotaoMes onClick={mesAnterior} rotulo="‹" />
          <BotaoMes onClick={mesSeguinte} rotulo="›" />
        </div>
      </div>

      {/* Dias da semana */}
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

      {/* Grade */}
      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`vazio-${i}`} />
        ))}
        {Array.from({ length: totalDias }).map((_, i) => {
          const dia = i + 1;
          const ag = agregado(dia);
          return (
            <button
              key={dia}
              onClick={() => setDiaAberto(dia)}
              className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-[13px] border transition active:scale-95 ${corCelula(
                ag,
              )} ${ehHoje(dia) ? "!border-brand" : ""}`}
            >
              <span
                className={`font-mono text-sm ${
                  ag === "reserved" ? "font-bold text-white" : "text-text"
                }`}
              >
                {dia}
              </span>
              <span className={`h-2 w-2 rounded-full ${corPip(ag)}`} />
            </button>
          );
        })}
      </div>

      {carregando && (
        <p className="mt-4 text-center text-sm text-dim">Carregando…</p>
      )}

      {/* Detalhe do dia */}
      {diaAberto !== null && (
        <SheetDiaBanda
          titulo={dataLonga(ano, mes0, diaAberto)}
          reserva={reservas[ymd(ano, mes0, diaAberto)]}
          roster={rosterDoDia(diaAberto)}
          aoFechar={() => setDiaAberto(null)}
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

function corCelula(ag: Agregado): string {
  if (ag === "reserved")
    return "border-[#a877e6] bg-gradient-to-br from-[#8a4fd6] to-[#6a30b8]";
  if (ag === "busy") return "border-busy/40 bg-busy/[0.10] opacity-70";
  if (ag === "maybe") return "border-maybe/40 bg-maybe/[0.10]";
  return "border-free/30 bg-free/[0.10]";
}
function corPip(ag: Agregado): string {
  if (ag === "reserved") return "bg-white";
  if (ag === "busy") return "bg-busy";
  if (ag === "maybe") return "bg-maybe";
  return "bg-free";
}

function SheetDiaBanda({
  titulo,
  reserva,
  roster,
  aoFechar,
}: {
  titulo: string;
  reserva?: { kind: string; location: string | null; start_time: string | null; hold: string };
  roster: { livres: StatusMembro[]; talvez: StatusMembro[]; ocupados: StatusMembro[] };
  aoFechar: () => void;
}) {
  return (
    <>
      <div onClick={aoFechar} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]" />
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85%] max-w-[430px] overflow-y-auto rounded-t-[24px] border-t border-line bg-surface px-5 pb-7 pt-2">
        <div className="mx-auto mt-2 mb-3.5 h-1 w-9 rounded-full bg-line" />
        <h3 className="font-display text-lg font-bold">{titulo}</h3>

        {reserva ? (
          <div className="mt-3 rounded-pauta border border-brand/40 bg-brand/10 p-4 text-sm">
            <p className="font-semibold text-[#d4aaff]">
              {reserva.kind === "show" ? "🎤 Apresentação" : "🎸 Ensaio"} marcado
            </p>
            <p className="mt-1 text-dim">📍 {reserva.location || "local a definir"}</p>
            {reserva.start_time && (
              <p className="text-dim">🕘 {reserva.start_time.slice(0, 5)}</p>
            )}
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            <GrupoRoster titulo="Livres" cor="bg-free" gente={roster.livres} />
            <GrupoRoster titulo="Talvez" cor="bg-maybe" gente={roster.talvez} comNota />
            <GrupoRoster titulo="Ocupados" cor="bg-busy" gente={roster.ocupados} comNota />
          </div>
        )}
      </div>
    </>
  );
}

function GrupoRoster({
  titulo,
  cor,
  gente,
  comNota,
}: {
  titulo: string;
  cor: string;
  gente: StatusMembro[];
  comNota?: boolean;
}) {
  if (gente.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-dim">
        <span className={`h-2.5 w-2.5 rounded-full ${cor}`} />
        {titulo} ({gente.length})
      </p>
      <ul className="flex flex-col gap-1">
        {gente.map((p) => (
          <li key={p.id} className="text-sm">
            {p.nome}
            {comNota && p.note && (
              <span className="text-dim"> — “{p.note}”</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
