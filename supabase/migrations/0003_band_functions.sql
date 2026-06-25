-- =============================================================
-- Migração 0003 — funções de banda (Passo 5)
-- (aplicada no projeto Supabase via MCP; versionada aqui para histórico)
-- =============================================================

-- Criar banda + virar moderador (transação única).
create or replace function public.create_band(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_band_id uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'não autenticado'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'nome obrigatório'; end if;

  insert into public.bands (name, created_by)
    values (trim(p_name), uid)
    returning id into new_band_id;

  insert into public.memberships (band_id, profile_id, role)
    values (new_band_id, uid, 'moderator');

  return new_band_id;
end; $$;

-- Gerar convite (só moderador). Retorna um token aleatório.
create or replace function public.create_invite(
  p_band_id uuid,
  p_role text default 'member',
  p_instrument text default null
)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); new_token text;
begin
  if uid is null then raise exception 'não autenticado'; end if;
  if not public.is_moderator_of(p_band_id) then
    raise exception 'apenas moderador pode convidar';
  end if;

  new_token := replace(gen_random_uuid()::text, '-', '')
            || replace(gen_random_uuid()::text, '-', '');

  insert into public.invites (band_id, token, role, instrument, created_by, expires_at)
    values (p_band_id, new_token, coalesce(p_role, 'member'), p_instrument, uid,
            now() + interval '14 days');

  return new_token;
end; $$;

-- Aceitar convite: valida o token e cria a participação de quem está logado.
create or replace function public.claim_invite(invite_token text)
returns json language plpgsql security definer set search_path = public as $$
declare inv public.invites; uid uuid := auth.uid(); bname text;
begin
  if uid is null then raise exception 'não autenticado'; end if;

  select * into inv from public.invites where token = invite_token;
  if inv.id is null then raise exception 'convite inválido'; end if;
  if inv.expires_at is not null and inv.expires_at < now() then
    raise exception 'convite expirado';
  end if;

  select name into bname from public.bands where id = inv.band_id;

  if not exists (
    select 1 from public.memberships m
     where m.band_id = inv.band_id and m.profile_id = uid
  ) then
    insert into public.memberships (band_id, profile_id, role, instrument)
      values (inv.band_id, uid, coalesce(inv.role, 'member'), inv.instrument);
    update public.invites
       set claimed_by = uid, claimed_at = now()
     where id = inv.id and claimed_by is null;
  end if;

  return json_build_object('band_id', inv.band_id, 'band_name', bname);
end; $$;
