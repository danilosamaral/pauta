/**
 * TELA INICIAL (provisoria)
 *
 * Esta pagina existe so para validar que o scaffold roda e que a estetica
 * "casa de show" esta correta: fundo escuro, logo "Pauta" com o ponto roxo
 * e a legenda dos tres LEDs (livre / talvez / ocupado).
 *
 * Nas proximas fases ela sera substituida pelo fluxo real (login, agenda...).
 */

// Pequeno componente de "LED" reutilizavel: uma bolinha colorida que brilha.
// 'color' recebe uma classe de cor de fundo do Tailwind (ex.: "bg-free").
function Led({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-dim">
      <span
        // O box-shadow da o efeito de brilho de LED, como no prototipo.
        className={`h-3 w-3 flex-none rounded-full ${color}`}
        style={{ boxShadow: "0 0 8px -1px currentColor" }}
      />
      {label}
    </div>
  );
}

export default function Home() {
  return (
    // min-h-dvh = altura total da tela do celular (dvh lida com a barra do navegador).
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col items-center justify-center gap-8 px-6">
      {/* Marca */}
      <div className="text-center">
        <h1 className="font-display text-5xl font-extrabold tracking-tight">
          Pauta<span className="text-brand">.</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-dim">
          A agenda compartilhada de bandas.
          <br />
          Uma disponibilidade pessoal, todas as suas bandas leem.
        </p>
      </div>

      {/* Legenda dos tres estados (os "LEDs" do app) */}
      <div className="flex flex-wrap items-center justify-center gap-5">
        {/* As cores usam currentColor para o brilho: por isso aplicamos a cor
            tanto no texto quanto no fundo via classes irmas. */}
        <span className="text-free">
          <Led color="bg-free" label="Livre" />
        </span>
        <span className="text-maybe">
          <Led color="bg-maybe" label="Talvez" />
        </span>
        <span className="text-busy">
          <Led color="bg-busy" label="Ocupado" />
        </span>
      </div>

      {/* Selo de fase, em fonte mono, so pra dar o tom "estudio". */}
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
        Fase 1 — demo
      </p>
    </main>
  );
}
