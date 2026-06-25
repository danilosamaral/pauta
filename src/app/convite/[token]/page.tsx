// =============================================================
// PÁGINA /convite/[token] — entrar numa banda pelo link.
// Lê o token da URL e entrega para o componente que faz o "aceite".
// (O middleware já garante que a pessoa esteja logada aqui.)
// =============================================================

import ClaimInvite from "@/components/bandas/ClaimInvite";

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params; // no Next 15, params é assíncrono
  return <ClaimInvite token={token} />;
}
