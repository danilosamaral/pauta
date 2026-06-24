/**
 * PostCSS processa o CSS no build. Aqui ligamos dois plugins:
 * - tailwindcss: transforma as diretivas @tailwind nas classes utilitarias.
 * - autoprefixer: adiciona prefixos de navegador (-webkit- etc.) automaticamente.
 */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
