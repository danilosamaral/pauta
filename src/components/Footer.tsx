import { CONTATO_WHATSAPP, CREDITO_NOME } from "@/lib/constants";

/**
 * Rodapé de crédito do criador, usado nas telas iniciais (login, solicitar,
 * criar senha, convite). Inclui um link de contato pelo WhatsApp.
 */
export default function Footer() {
  return (
    <footer className="mt-2 text-center text-xs leading-relaxed text-dim">
      Desenvolvido por{" "}
      <span className="font-semibold text-text">{CREDITO_NOME}</span>
      <br />
      <a
        href={`https://wa.me/${CONTATO_WHATSAPP}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand underline"
      >
        Falar no WhatsApp
      </a>
    </footer>
  );
}
