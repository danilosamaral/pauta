import SignOutButton from "@/components/SignOutButton";

/**
 * Cabeçalho do app (logo + botão sair), usado nas telas autenticadas.
 */
export default function AppHeader() {
  return (
    <header className="flex items-center justify-between">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">
        Pauta<span className="text-brand">.</span>
      </h1>
      <SignOutButton />
    </header>
  );
}
