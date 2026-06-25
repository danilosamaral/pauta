// =============================================================
// Utilitários de data — em português e "à prova de fuso horário".
//
// Importante: a coluna `day` no banco é uma DATA pura (sem hora/fuso).
// Por isso montamos as datas como texto "AAAA-MM-DD" a partir dos números
// (ano, mês, dia), SEM usar toISOString() — que converteria para UTC e
// poderia "pular" um dia dependendo do fuso do celular.
// =============================================================

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Rótulos do cabeçalho do calendário (domingo a sábado).
export const DIAS_SEMANA_CURTOS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
export const DIAS_SEMANA_LONGOS = [
  "domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado",
];

// Quantos dias tem o mês (mes0 é 0-based: janeiro=0).
export function diasNoMes(ano: number, mes0: number): number {
  return new Date(ano, mes0 + 1, 0).getDate();
}

// Em que dia da semana cai o dia 1 (0=domingo ... 6=sábado).
export function primeiroDiaSemana(ano: number, mes0: number): number {
  return new Date(ano, mes0, 1).getDay();
}

// Dia da semana de uma data específica.
export function diaSemana(ano: number, mes0: number, dia: number): number {
  return new Date(ano, mes0, dia).getDay();
}

// Garante 2 dígitos (ex.: 3 -> "03").
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Monta a chave "AAAA-MM-DD" usada no banco.
export function ymd(ano: number, mes0: number, dia: number): string {
  return `${ano}-${pad2(mes0 + 1)}-${pad2(dia)}`;
}

// Texto amigável: "Sexta, 26 de junho".
export function dataLonga(ano: number, mes0: number, dia: number): string {
  const wd = DIAS_SEMANA_LONGOS[diaSemana(ano, mes0, dia)];
  const capitalizado = wd.charAt(0).toUpperCase() + wd.slice(1);
  return `${capitalizado}, ${dia} de ${MESES[mes0].toLowerCase()}`;
}

// Data de hoje, já quebrada em ano/mes0/dia (no fuso do dispositivo).
export function hoje(): { ano: number; mes0: number; dia: number } {
  const d = new Date();
  return { ano: d.getFullYear(), mes0: d.getMonth(), dia: d.getDate() };
}

// Fim de semana de "casa de show": sexta e sábado em destaque (índices 5 e 6).
export function ehFimDeSemana(diaDaSemana: number): boolean {
  return diaDaSemana === 5 || diaDaSemana === 6;
}
