"use client"; // Usa o caminho atual (usePathname) -> roda no navegador.

import Link from "next/link";
import { usePathname } from "next/navigation";

// As duas abas da Fase 1.
const ABAS = [
  { href: "/", rotulo: "Minha agenda", emoji: "📅" },
  { href: "/bandas", rotulo: "Bandas", emoji: "🎸" },
];

/**
 * Barra de navegação inferior (estilo app de celular).
 * Fica fixa embaixo e destaca a aba atual.
 */
export default function BottomNav() {
  const caminho = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[430px] border-t border-line bg-ink/95 backdrop-blur">
      {ABAS.map((aba) => {
        const ativo = caminho === aba.href;
        return (
          <Link
            key={aba.href}
            href={aba.href}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs ${
              ativo ? "text-brand" : "text-dim"
            }`}
          >
            <span className="text-lg">{aba.emoji}</span>
            {aba.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
