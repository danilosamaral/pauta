// =============================================================
// Constantes compartilhadas do app.
// =============================================================

// Nome provisório que o gatilho do banco coloca no profile recém-criado.
// Quando o display_name ainda é este valor, o app pede para a pessoa
// escolher como quer ser chamada.
export const NOME_PROVISORIO = "Novo músico";

// Código do país padrão da demo (Brasil). Montamos o telefone no formato
// internacional E.164 exigido pelo Supabase: +55 + DDD + número.
export const DDI_BRASIL = "+55";

// Países aceitos no login e no convite. "ddi" é o que mostramos (+55) e
// "digitos" é o código do país SÓ com números (55), usado para montar o
// telefone normalizado. IMPORTANTE: login e convite usam a MESMA lista,
// pra normalização bater (senão a comparação do convite nunca acerta).
export type Pais = { nome: string; ddi: string; digitos: string };
export const PAISES: Pais[] = [
  { nome: "Brasil", ddi: "+55", digitos: "55" },
  { nome: "Paraguai", ddi: "+595", digitos: "595" },
];

