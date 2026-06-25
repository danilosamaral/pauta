// =============================================================
// PÁGINA /bandas — lista as bandas da pessoa (Server Component).
// Carrega no servidor as participações + dados da banda e a contagem
// de integrantes, e entrega para o componente de tela.
// =============================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NOME_PROVISORIO } from "@/lib/constants";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import BandasClient, { type BandaItem } from "@/components/bandas/BandasClient";

export default async function BandasPage() {
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

  // Minhas participações + dados básicos da banda.
  const { data: minhas } = await supabase
    .from("memberships")
    .select("role, band:bands(id, name)")
    .eq("profile_id", user.id);

  const lista = (minhas ?? []) as Array<{
    role: string;
    band: { id: string; name: string } | null;
  }>;

  // Conta integrantes por banda (RLS deixa ver os membros das minhas bandas).
  const ids = lista.map((m) => m.band?.id).filter(Boolean) as string[];
  const contagem: Record<string, number> = {};
  if (ids.length) {
    const { data: todos } = await supabase
      .from("memberships")
      .select("band_id")
      .in("band_id", ids);
    for (const m of todos ?? [])
      contagem[m.band_id] = (contagem[m.band_id] ?? 0) + 1;
  }

  const bandas: BandaItem[] = lista
    .filter((m) => m.band)
    .map((m) => ({
      id: m.band!.id,
      name: m.band!.name,
      role: m.role === "moderator" ? "moderator" : "member",
      memberCount: contagem[m.band!.id] ?? 1,
    }));

  return (
    <>
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-6 px-6 py-10 pb-28">
        <AppHeader />
        <BandasClient inicial={bandas} />
      </main>
      <BottomNav />
    </>
  );
}
