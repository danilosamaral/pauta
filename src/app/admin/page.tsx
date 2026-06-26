// =============================================================
// PÁGINA /admin — só para o super-admin.
// Lista os pedidos de acesso (access_requests). Aprovar/recusar acontece
// no componente de cliente, via funções do banco.
// =============================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import AdminClient, { type Pedido } from "@/components/admin/AdminClient";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Só super-admin entra aqui.
  const { data: ehAdmin } = await supabase.rpc("is_super_admin");
  if (!ehAdmin) redirect("/");

  // RLS garante que só o super-admin enxerga os pedidos.
  const { data } = await supabase
    .from("access_requests")
    .select(
      "id, name, phone, band_name, message, status, created_at, resulting_token, receipt_path",
    )
    .order("created_at", { ascending: false });

  const pedidos = (data ?? []) as Pedido[];

  return (
    <>
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-6 px-6 py-10 pb-28">
        <AppHeader />
        <AdminClient inicial={pedidos} />
      </main>
      <BottomNav />
    </>
  );
}
