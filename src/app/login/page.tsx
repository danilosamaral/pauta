// =============================================================
// TELA INICIAL / ENTRADA
//
// O Pauta agora entra por CONVITE (sem SMS). Quem não tem sessão cai aqui.
// Não há formulário de código: a pessoa entra pelo link que o moderador
// envia no WhatsApp (esse link cria a sessão via Edge Function).
//
// Para o moderador fundador (que ninguém convidou): ele é "semeado" — se
// ficar sem acesso, gera-se um link de acesso pontual para o número dele.
// =============================================================

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center gap-6 px-6 text-center">
      <div>
        <h1 className="font-display text-5xl font-extrabold tracking-tight">
          Pauta<span className="text-brand">.</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-dim">
          A agenda compartilhada de bandas.
        </p>
      </div>

      <div className="rounded-pauta border border-line bg-surface p-5 text-sm leading-relaxed text-dim">
        Para entrar, abra o <strong className="text-text">link de convite</strong>{" "}
        que o moderador da sua banda te enviou no WhatsApp. É só tocar no link —
        você entra direto, sem código.
        <br />
        <br />
        Ainda não tem convite? Peça pro moderador da banda gerar um pra você.
      </div>
    </main>
  );
}
