import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  Hanken_Grotesk,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

/**
 * LAYOUT RAIZ
 *
 * Todo arquivo de pagina do app fica "dentro" deste layout. E aqui que:
 * 1) carregamos as fontes do prototipo (o next/font baixa e otimiza no build);
 * 2) definimos a tag <html> e <body> com a estetica escura;
 * 3) declaramos os metadados (titulo, descricao) e o manifest do PWA.
 */

// Fonte dos TITULOS (logo, nomes de banda). Expoe a variavel CSS --font-display.
const fontDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-display",
});

// Fonte do CORPO de texto. Expoe --font-sans.
const fontSans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

// Fonte MONOESPACADA, usada em numeros e "eyebrows". Expoe --font-mono.
const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-mono",
});

// Metadados da pagina + ligacao com o manifest do PWA.
export const metadata: Metadata = {
  title: "Pauta — agenda compartilhada de bandas",
  description:
    "Cada musico mantem uma disponibilidade pessoal; cada banda descobre as datas livres pra todo mundo.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pauta",
  },
};

// Viewport: mobile-first. themeColor pinta a barra do navegador de roxo escuro.
export const viewport: Viewport = {
  themeColor: "#0E0B12",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // ocupa a area das telas com "notch"
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // lang pt-BR + as 3 variaveis de fonte disponiveis em todo o app.
    <html
      lang="pt-BR"
      className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
