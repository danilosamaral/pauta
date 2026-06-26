// =============================================================
// Edge Function: claim-and-login
//
// Login pelo convite, SEM SMS. Recebe { token } e, se o convite for
// válido/não-usado/não-expirado, garante o usuário do telefone convidado,
// coloca-o na banda, QUEIMA o convite (uso único) e devolve uma SESSÃO
// (access/refresh token) para o front gravar com setSession().
//
// SEGURANÇA (regra inegociável):
//  - roda com a chave service_role, que SÓ existe aqui (variável de ambiente
//    do projeto). Ela NUNCA vai para o front nem é devolvida ao navegador.
//  - a senha aleatória usada para emitir a sessão também nunca volta ao front;
//    só os tokens da sessão são devolvidos.
//
// Travas que substituem a proteção do SMS:
//  1) uso único  -> claimed_by é preenchido na primeira vez (e checado aqui);
//  2) validade curta -> expires_at (48h, definido no banco);
//  3) sessão no aparelho -> o front guarda a sessão localmente.
// =============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Cabeçalhos CORS (a função é chamada do navegador).
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Pré-voo CORS.
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { token } = await req.json().catch(() => ({}));
    if (!token) return json({ error: "convite inválido" });

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Cliente ADMIN (service_role) — só aqui no servidor.
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    // 1) Busca o convite pelo token.
    const { data: inv } = await admin
      .from("invites")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (!inv) return json({ error: "convite inválido" });
    if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
      return json({ error: "convite expirado" });
    }
    if (!inv.invited_phone) return json({ error: "convite inválido" });

    // 2) Convite já usado? -> idempotente, SEM emitir nova sessão.
    //    (Assim, quem reabrir o link depois não ganha uma sessão; o primeiro
    //     que usou já entrou. O front decide o que mostrar.)
    if (inv.claimed_by) return json({ already: true });

    // Telefone normalizado (só dígitos, com código do país) e e-mail sintético
    // interno (apenas para emitir a sessão; o telefone é a chave de verdade).
    const phone = String(inv.invited_phone).replace(/\D/g, "");
    const email = `${phone}@invite.pauta.app`;
    const password = `${crypto.randomUUID()}${crypto.randomUUID()}`;

    // 3) Resolve o usuário pelo telefone (via profiles).
    const { data: prof } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    let userId = prof?.id as string | undefined;

    if (!userId) {
      // Cria o usuário novo (telefone confirmado) — o gatilho cria o profile.
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        phone: `+${phone}`,
        phone_confirm: true,
        email,
        email_confirm: true,
        password,
        user_metadata: { display_name: inv.invited_name ?? "Novo músico" },
      });
      if (cErr || !created?.user) return json({ error: "falha ao criar usuário" }, 500);
      userId = created.user.id;
    } else {
      // Garante e-mail + senha para conseguirmos emitir a sessão.
      const { error: uErr } = await admin.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true,
        password,
      });
      if (uErr) return json({ error: "falha ao preparar usuário" }, 500);
    }

    // 4) Garante a participação na banda (idempotente).
    await admin.from("memberships").upsert(
      {
        band_id: inv.band_id,
        profile_id: userId,
        role: inv.role ?? "member",
        instrument: inv.instrument,
      },
      { onConflict: "band_id,profile_id", ignoreDuplicates: true },
    );

    // 5) QUEIMA o convite (uso único). O filtro is('claimed_by', null) protege
    //    contra dois cliques quase simultâneos.
    const { data: claimed } = await admin
      .from("invites")
      .update({ claimed_by: userId, claimed_at: new Date().toISOString() })
      .eq("id", inv.id)
      .is("claimed_by", null)
      .select("id")
      .maybeSingle();
    if (!claimed) return json({ already: true });

    // 6) Emite a SESSÃO no servidor (login com e-mail+senha sintéticos).
    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({
      email,
      password,
    });
    if (sErr || !signIn?.session) return json({ error: "falha ao iniciar sessão" }, 500);

    const { data: banda } = await admin
      .from("bands")
      .select("name")
      .eq("id", inv.band_id)
      .maybeSingle();

    return json({
      already: false,
      band_name: banda?.name ?? "",
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    });
  } catch (_e) {
    return json({ error: "erro inesperado" }, 500);
  }
});
