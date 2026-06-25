// =============================================================
// Compartilhar a confirmação de um evento.
//  - texto pronto pro WhatsApp;
//  - link "TEMPLATE" do Google Agenda;
//  - arquivo .ics (Apple Calendar / iPhone / Outlook).
//
// Datas: o evento tem dia + hora opcional. Se houver hora, viramos um
// evento de 2h; sem hora, vira um evento de "dia inteiro".
// =============================================================

import { MESES } from "./dates";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export type DadosEvento = {
  bandName: string;
  kind: string; // 'rehearsal' | 'show'
  location: string | null;
  ano: number;
  mes0: number;
  dia: number;
  hora: string | null; // "HH:MM" ou null
};

// Título legível do evento.
export function tituloEvento(ev: DadosEvento): string {
  const tipo = ev.kind === "show" ? "Apresentação" : "Ensaio";
  return `${ev.bandName} — ${tipo}`;
}

// "26 de junho de 2026"
function dataPorExtenso(ev: DadosEvento): string {
  return `${ev.dia} de ${MESES[ev.mes0].toLowerCase()} de ${ev.ano}`;
}

// Calcula início e fim. Retorna componentes prontos para formatar.
function intervalo(ev: DadosEvento) {
  if (!ev.hora) {
    // Dia inteiro: fim é o dia seguinte (padrão do formato all-day).
    const fim = new Date(ev.ano, ev.mes0, ev.dia + 1);
    return {
      diaInteiro: true as const,
      ini: { y: ev.ano, m0: ev.mes0, d: ev.dia, h: 0, min: 0 },
      fim: { y: fim.getFullYear(), m0: fim.getMonth(), d: fim.getDate(), h: 0, min: 0 },
    };
  }
  const [h, min] = ev.hora.split(":").map(Number);
  const ini = new Date(ev.ano, ev.mes0, ev.dia, h, min);
  const fim = new Date(ini.getTime() + 2 * 60 * 60 * 1000); // +2h
  return {
    diaInteiro: false as const,
    ini: { y: ini.getFullYear(), m0: ini.getMonth(), d: ini.getDate(), h: ini.getHours(), min: ini.getMinutes() },
    fim: { y: fim.getFullYear(), m0: fim.getMonth(), d: fim.getDate(), h: fim.getHours(), min: fim.getMinutes() },
  };
}

// AAAAMMDD ou AAAAMMDDTHHMMSS (horário "flutuante", como digitado).
function fmtData(p: { y: number; m0: number; d: number }): string {
  return `${p.y}${pad2(p.m0 + 1)}${pad2(p.d)}`;
}
function fmtDataHora(p: { y: number; m0: number; d: number; h: number; min: number }): string {
  return `${fmtData(p)}T${pad2(p.h)}${pad2(p.min)}00`;
}

// ----- Texto pro WhatsApp -----
export function textoWhatsApp(ev: DadosEvento): string {
  const tipo = ev.kind === "show" ? "🎤 Apresentação" : "🎸 Ensaio";
  const linhas = [
    `✅ Confirmado — ${ev.bandName}!`,
    "",
    tipo,
    `📅 ${dataPorExtenso(ev)}${ev.hora ? ` · ${ev.hora}` : ""}`,
    `📍 ${ev.location || "local a definir"}`,
    "",
    "Tá na agenda? 👇",
  ];
  return linhas.join("\n");
}

// ----- Link do Google Agenda (TEMPLATE) -----
export function googleAgendaUrl(ev: DadosEvento): string {
  const { diaInteiro, ini, fim } = intervalo(ev);
  const datas = diaInteiro
    ? `${fmtData(ini)}/${fmtData(fim)}`
    : `${fmtDataHora(ini)}/${fmtDataHora(fim)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: tituloEvento(ev),
    dates: datas,
    details: "Marcado pelo Pauta 🎶",
    location: ev.location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ----- Conteúdo do arquivo .ics -----
export function conteudoIcs(ev: DadosEvento): string {
  const { diaInteiro, ini, fim } = intervalo(ev);
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@pauta`;
  const agora = new Date();
  const stamp =
    `${agora.getUTCFullYear()}${pad2(agora.getUTCMonth() + 1)}${pad2(agora.getUTCDate())}` +
    `T${pad2(agora.getUTCHours())}${pad2(agora.getUTCMinutes())}${pad2(agora.getUTCSeconds())}Z`;

  const dt = diaInteiro
    ? [`DTSTART;VALUE=DATE:${fmtData(ini)}`, `DTEND;VALUE=DATE:${fmtData(fim)}`]
    : [`DTSTART:${fmtDataHora(ini)}`, `DTEND:${fmtDataHora(fim)}`];

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pauta//PT-BR//",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    ...dt,
    `SUMMARY:${tituloEvento(ev)}`,
    `LOCATION:${ev.location || ""}`,
    "DESCRIPTION:Marcado pelo Pauta",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

// Dispara o download do .ics no navegador.
export function baixarIcs(ev: DadosEvento): void {
  const blob = new Blob([conteudoIcs(ev)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${tituloEvento(ev).replace(/[^\w]+/g, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
