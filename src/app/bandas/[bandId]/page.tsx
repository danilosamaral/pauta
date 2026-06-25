// =============================================================
// PÁGINA /bandas/[bandId] — calendário agregado da banda.
// Carrega no servidor: a banda, o papel do usuário e os integrantes
// (com nome e instrumento). O cálculo do "pior estado" por dia acontece
// no componente de cliente, que busca a disponibilidade do mês visível.
// =============================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NOME_PROVISORIO } from "@/lib/constants";
import BottomNav from "@/components/BottomNav";
import BandaCalendario, {
  type Integrante,
} from "@/components/bandas/BandaCalendario";

export default async function BandaPage({
  params,
}: {
  params: Promise<{ bandId: string }>;
}) {
  const { bandId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Sem nome ainda? Volta pra home pra definir o nome primeiro.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  if (!profile || profile.display_name === NOME_PROVISORIO) redirect("/");

  // A banda (o RLS só devolve se eu for membro dela).
  const { data: banda } = await supabase
    .from("bands")
    .select("id, name")
    .eq("id", bandId)
    .single();
  if (!banda) redirect("/bandas"); // não sou membro ou não existe

  // Meu papel nessa banda.
  const { data: minhaPart } = await supabase
    .from("memberships")
    .select("role")
    .eq("band_id", bandId)
    .eq("profile_id", user.id)
    .single();

  // Integrantes (nome + instrumento). RLS permite ver colegas de banda.
  const { data: parts } = await supabase
    .from("memberships")
    .select("profile_id, instrument, profile:profiles(display_name)")
    .eq("band_id", bandId);

  const integrantes: Integrante[] = (
    (parts ?? []) as Array<{
      profile_id: string;
      instrument: string | null;
      profile: { display_name: string } | null;
    }>
  ).map((p) => ({
    id: p.profile_id,
    nome: p.profile?.display_name ?? "Sem nome",
    instrumento: p.instrument,
  }));

  return (
    <>
      <main className="mx-auto w-full max-w-[430px] px-5 py-6 pb-28">
        <BandaCalendario
          bandId={banda.id}
          bandName={banda.name}
          souModerador={minhaPart?.role === "moderator"}
          integrantes={integrantes}
        />
      </main>
      <BottomNav />
    </>
  );
}
