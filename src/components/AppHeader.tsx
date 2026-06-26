/**
 * Cabeçalho do app (logo), usado nas telas autenticadas.
 *
 * Observação: NÃO há botão "Sair" aqui. No modelo de login por convite não
 * existe re-login self-service (sair travaria a pessoa). Para deixar uma
 * banda, use "Sair da banda" no painel de Integrantes — isso é diferente de
 * deslogar.
 */
export default function AppHeader() {
  return (
    <header className="flex items-center justify-between">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">
        Pauta<span className="text-brand">.</span>
      </h1>
    </header>
  );
}
