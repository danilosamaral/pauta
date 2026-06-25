// =============================================================
// HOME (autenticada) — Server Component.
//
// Esta página só é acessível logado (o middleware garante isso). Aqui:
//  - descobrimos QUEM é o usuário (getUser, validado no servidor);
//  - lemos o profile dele;
//  - se ainda está com o nome provisório, pedimos o nome (NameForm);
//  - senão, damos as boas-vindas (a agenda real entra nos próximos passos).
// =============================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NOME_PROVISORIO } from "@/lib/constants";
import NameForm from "@/components/NameForm";
import SignOutButton from "@/components/SignOutButton";
import MinhaAgenda from "@/components/agenda/MinhaAgenda";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Dupla proteção (o middleware já redireciona, mas garantimos aqui também).
  if (!user) redirect("/login");

  // Lê o profile da pessoa logada (RLS garante que só vê o próprio).
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, phone")
    .eq("id", user.id)
    .single();

  // Ainda sem nome de verdade? Mostramos o formulário de primeiro acesso.
  const precisaNome = !profile || profile.display_name === NOME_PROVISORIO;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-6 px-6 py-10">
      {/* Cabeçalho */}
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          Pauta<span className="text-brand">.</span>
        </h1>
        <SignOutButton />
      </header>

      {precisaNome ? (
        <>
          <p className="text-sm text-dim">
            Boas-vindas! Antes de tudo, como podemos te chamar?
          </p>
          <NameForm userId={user.id} />
        </>
      ) : (
        // Já tem nome: mostramos a tela principal — a Minha Agenda.
        <MinhaAgenda userId={user.id} />
      )}
    </main>
  );
}
