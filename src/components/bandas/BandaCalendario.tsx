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
import { baixarIcs, googleAgendaUrl, textoWhatsApp } from "@/lib/share";

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
  userId,
}: {
  bandId: string;
  bandName: string;
  souModerador: boolean;
  integrantes: Integrante[];
  userId: string;
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
          ano={ano}
          mes0={mes0}
          dia={diaAberto}
          bandId={bandId}
          bandName={bandName}
          userId={userId}
          souModerador={souModerador}
          reserva={reservas[ymd(ano, mes0, diaAberto)]}
          roster={rosterDoDia(diaAberto)}
          aoFechar={() => setDiaAberto(null)}
          aoMudar={carregar}
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

type Reserva = {
  kind: string;
  location: string | null;
  start_time: string | null;
  hold: string;
};

function SheetDiaBanda({
  ano,
  mes0,
  dia,
  bandId,
  bandName,
  userId,
  souModerador,
  reserva,
  roster,
  aoFechar,
  aoMudar,
}: {
  ano: number;
  mes0: number;
  dia: number;
  bandId: string;
  bandName: string;
  userId: string;
  souModerador: boolean;
  reserva?: Reserva;
  roster: { livres: StatusMembro[]; talvez: StatusMembro[]; ocupados: StatusMembro[] };
  aoFechar: () => void;
  aoMudar: () => Promise<void> | void;
}) {
  // 'ver' = roster/detalhe; 'form' = formulário de reserva.
  const [modo, setModo] = useState<"ver" | "form">("ver");

  return (
    <>
      <div onClick={aoFechar} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]" />
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88%] max-w-[430px] overflow-y-auto rounded-t-[24px] border-t border-line bg-surface px-5 pb-7 pt-2">
        <div className="mx-auto mt-2 mb-3.5 h-1 w-9 rounded-full bg-line" />
        <h3 className="font-display text-lg font-bold">{dataLonga(ano, mes0, dia)}</h3>

        {reserva ? (
          // Dia já reservado: detalhe + compartilhar + (moderador) cancelar.
          <ReservaConfirmada
            ano={ano}
            mes0={mes0}
            dia={dia}
            bandId={bandId}
            bandName={bandName}
            souModerador={souModerador}
            reserva={reserva}
            aoMudar={aoMudar}
          />
        ) : modo === "form" ? (
          // Formulário de reserva (só moderador chega aqui).
          <FormularioReserva
            ano={ano}
            mes0={mes0}
            dia={dia}
            bandId={bandId}
            userId={userId}
            aoCancelar={() => setModo("ver")}
            aoMudar={aoMudar}
          />
        ) : (
          // Detalhe do dia: quem está em cada cor + (moderador) reservar.
          <div className="mt-3 flex flex-col gap-4">
            <GrupoRoster titulo="Livres" cor="bg-free" gente={roster.livres} />
            <GrupoRoster titulo="Talvez" cor="bg-maybe" gente={roster.talvez} comNota />
            <GrupoRoster titulo="Ocupados" cor="bg-busy" gente={roster.ocupados} comNota />

            {souModerador && (
              <button
                onClick={() => setModo("form")}
                className="mt-1 w-full rounded-lg bg-brand px-4 py-3 font-semibold text-brand-ink active:scale-[0.98]"
              >
                Reservar esta data
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ---------- Formulário de reserva ----------
function FormularioReserva({
  ano,
  mes0,
  dia,
  bandId,
  userId,
  aoCancelar,
  aoMudar,
}: {
  ano: number;
  mes0: number;
  dia: number;
  bandId: string;
  userId: string;
  aoCancelar: () => void;
  aoMudar: () => Promise<void> | void;
}) {
  const [kind, setKind] = useState<"rehearsal" | "show">("rehearsal");
  const [local, setLocal] = useState("");
  const [hora, setHora] = useState("");
  const [hold, setHold] = useState<"full" | "partial">("full");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    setErro(null);
    setSalvando(true);
    const supabase = createClient();
    // Inserir o evento dispara o GATILHO que bloqueia a data de cada
    // integrante nas OUTRAS bandas (auto-bloqueio cross-band).
    const { error } = await supabase.from("events").insert({
      band_id: bandId,
      day: ymd(ano, mes0, dia),
      kind,
      location: local.trim() || null,
      start_time: hora || null,
      hold,
      created_by: userId,
    });
    setSalvando(false);
    if (error) {
      setErro("Não consegui reservar (essa data já pode estar reservada).");
      return;
    }
    await aoMudar(); // recarrega -> o dia vira "marcado" e mostra o compartilhar
  }

  return (
    <div className="mt-3 flex flex-col gap-4">
      {/* Tipo */}
      <div>
        <p className="mb-2 text-sm text-dim">Tipo</p>
        <div className="flex gap-2">
          <Toggle ativo={kind === "rehearsal"} onClick={() => setKind("rehearsal")}>
            🎸 Ensaio
          </Toggle>
          <Toggle ativo={kind === "show"} onClick={() => setKind("show")}>
            🎤 Apresentação
          </Toggle>
        </div>
      </div>

      {/* Local + hora */}
      <div>
        <label className="text-sm text-dim">Local (opcional)</label>
        <input
          type="text"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder="Ex.: Estúdio do Zé"
          className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-text outline-none focus:border-brand"
        />
      </div>
      <div>
        <label className="text-sm text-dim">Horário (opcional)</label>
        <input
          type="time"
          value={hora}
          onChange={(e) => setHora(e.target.value)}
          className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-text outline-none focus:border-brand"
        />
      </div>

      {/* Modo de reserva */}
      <div>
        <p className="mb-2 text-sm text-dim">Como esse dia afeta as outras bandas?</p>
        <div className="flex flex-col gap-2">
          <Toggle ativo={hold === "full"} onClick={() => setHold("full")} bloco>
            🔒 Trava o dia — nas outras bandas você fica <b>ocupado</b>
          </Toggle>
          <Toggle ativo={hold === "partial"} onClick={() => setHold("partial")} bloco>
            🟡 Parcial — nas outras bandas você fica <b>talvez</b> (dá pra encaixar)
          </Toggle>
        </div>
      </div>

      {erro && <p className="text-sm text-busy">{erro}</p>}

      <div className="flex gap-2">
        <button
          onClick={aoCancelar}
          className="flex-1 rounded-lg border border-line bg-surface-2 px-4 py-3 font-semibold text-text active:scale-[0.98]"
        >
          Voltar
        </button>
        <button
          onClick={confirmar}
          disabled={salvando}
          className="flex-1 rounded-lg bg-brand px-4 py-3 font-semibold text-brand-ink active:scale-[0.98] disabled:opacity-60"
        >
          {salvando ? "Reservando…" : "Confirmar reserva"}
        </button>
      </div>
    </div>
  );
}

// ---------- Reserva confirmada: detalhe + compartilhar + cancelar ----------
function ReservaConfirmada({
  ano,
  mes0,
  dia,
  bandId,
  bandName,
  souModerador,
  reserva,
  aoMudar,
}: {
  ano: number;
  mes0: number;
  dia: number;
  bandId: string;
  bandName: string;
  souModerador: boolean;
  reserva: Reserva;
  aoMudar: () => Promise<void> | void;
}) {
  const [cancelando, setCancelando] = useState(false);

  const ev = {
    bandName,
    kind: reserva.kind,
    location: reserva.location,
    ano,
    mes0,
    dia,
    hora: reserva.start_time ? reserva.start_time.slice(0, 5) : null,
  };

  async function cancelar() {
    setCancelando(true);
    const supabase = createClient();
    // Apagar o evento remove os bloqueios cross-band (ON DELETE CASCADE).
    await supabase.from("events").delete().eq("band_id", bandId).eq("day", ymd(ano, mes0, dia));
    setCancelando(false);
    await aoMudar();
  }

  return (
    <div className="mt-3 flex flex-col gap-4">
      <div className="rounded-pauta border border-brand/40 bg-brand/10 p-4 text-sm">
        <p className="font-semibold text-[#d4aaff]">
          {reserva.kind === "show" ? "🎤 Apresentação" : "🎸 Ensaio"} marcado
        </p>
        <p className="mt-1 text-dim">📍 {reserva.location || "local a definir"}</p>
        {reserva.start_time && <p className="text-dim">🕘 {reserva.start_time.slice(0, 5)}</p>}
        <p className="mt-1 text-dim">
          {reserva.hold === "full"
            ? "🔒 Dia travado nas outras bandas"
            : "🟡 Parcial — ainda dá pra encaixar"}
        </p>
      </div>

      {/* Compartilhar */}
      <div>
        <p className="mb-2 text-sm font-semibold text-text">Compartilhar</p>
        <div className="flex flex-col gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(textoWhatsApp(ev))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-brand px-4 py-3 text-center font-semibold text-brand-ink active:scale-[0.98]"
          >
            Enviar no WhatsApp
          </a>
          <a
            href={googleAgendaUrl(ev)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-line bg-surface-2 px-4 py-3 text-center font-semibold text-text active:scale-[0.98]"
          >
            Salvar no Google Agenda
          </a>
          <button
            onClick={() => baixarIcs(ev)}
            className="rounded-lg border border-line bg-surface-2 px-4 py-3 font-semibold text-text active:scale-[0.98]"
          >
            Baixar .ics (iPhone / Apple)
          </button>
        </div>
      </div>

      {souModerador && (
        <button
          onClick={cancelar}
          disabled={cancelando}
          className="rounded-lg border border-busy/40 bg-busy/10 px-4 py-2.5 text-sm font-semibold text-busy active:scale-[0.98] disabled:opacity-60"
        >
          {cancelando ? "Cancelando…" : "Cancelar reserva"}
        </button>
      )}
    </div>
  );
}

// Botão de alternância (toggle) reutilizável.
function Toggle({
  ativo,
  onClick,
  children,
  bloco,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
  bloco?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`${bloco ? "w-full text-left" : "flex-1"} rounded-lg border px-3 py-2.5 text-sm transition ${
        ativo ? "border-brand bg-surface-2 text-text" : "border-line bg-ink text-dim"
      }`}
    >
      {children}
    </button>
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
