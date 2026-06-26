-- 0007 — Login pelo convite (sem SMS): validade do convite cai para 48 horas.
-- (aplicada no projeto Supabase via MCP; versionada aqui para histórico)
--
-- Contexto: o link de convite passa a CRIAR SESSÃO (via Edge Function
-- claim-and-login). As três travas que substituem a proteção do SMS:
--   1) uso único  -> claimed_by preenchido após o primeiro uso
--   2) validade curta -> 48h (esta migração)
--   3) sessão no aparelho -> fica logado só naquele dispositivo
--
-- Observação: invites.token é UNIQUE, ou seja, já possui índice — a busca
-- por token continua rápida sem precisar de índice extra.

create or replace function public.create_invite(
  p_band_id       uuid,
  p_invited_phone text default null,
  p_invited_name  text default null,
  p_role          text default 'member',
  p_instrument    text default null
)
returns text language plpgsql security definer set search_path to 'public' as
$function$
declare uid uuid := auth.uid(); new_token text;
begin
  if uid is null then raise exception 'não autenticado'; end if;
  if not public.is_moderator_of(p_band_id) then
    raise exception 'apenas moderador pode convidar';
  end if;

  new_token := replace(gen_random_uuid()::text, '-', '')
            || replace(gen_random_uuid()::text, '-', '');

  insert into public.invites
    (band_id, token, invited_phone, invited_name, role, instrument, created_by, expires_at)
  values
    (p_band_id, new_token,
     nullif(public.only_digits(p_invited_phone), ''),
     nullif(trim(p_invited_name), ''),
     coalesce(p_role, 'member'), p_instrument, uid,
     now() + interval '48 hours');

  return new_token;
end; $function$;
