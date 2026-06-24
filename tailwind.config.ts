import type { Config } from "tailwindcss";

/**
 * Configuracao do Tailwind.
 *
 * "content" diz ao Tailwind onde procurar as classes que usamos, pra ele gerar
 * so o CSS necessario (mantem o app leve).
 *
 * Em "theme.extend" criamos os TOKENS de cor do Pauta — os mesmos valores do
 * prototipo (pauta-prototipo.html). Assim escrevemos, por exemplo, bg-ink-deep
 * ou text-brand em vez de repetir codigos hex espalhados pelo codigo.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Fundos escuros "casa de show"
        ink: { DEFAULT: "#161219", deep: "#0E0B12" },
        surface: { DEFAULT: "#211B28", 2: "#2A2233" },
        line: "#392F45", // linhas/bordas sutis
        // Texto
        text: "#F2ECF5", // texto principal
        dim: "#A296B0", // texto secundario (apagado)
        // Roxo de palco (cor de marca/interface)
        brand: { DEFAULT: "#B66EFF", ink: "#1c0f2b" },
        // LEDs de estado: livre / talvez / ocupado
        free: "#43D17A", // verde  -> livre
        maybe: "#F2C14E", // amarelo -> talvez
        busy: "#E5564E", // vermelho -> ocupado
      },
      borderRadius: {
        // Raio padrao do prototipo
        pauta: "18px",
      },
      fontFamily: {
        // Ligamos as fontes carregadas no layout.tsx (via variaveis CSS).
        display: ["var(--font-display)", "system-ui", "sans-serif"], // titulos
        sans: ["var(--font-sans)", "system-ui", "sans-serif"], // corpo
        mono: ["var(--font-mono)", "monospace"], // numeros/eyebrows
      },
    },
  },
  plugins: [],
};

export default config;
