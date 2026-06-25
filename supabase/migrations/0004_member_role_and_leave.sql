-- =============================================================
-- Migração 0004 — papéis (co-moderador) e sair da banda (Passo 8)
-- (aplicada no projeto Supabase via MCP; versionada aqui para histórico)
-- Regra de ouro: a banda nunca pode ficar sem nenhum moderador.
-- =============================================================

create or replace function public.set_member_role(
  p_band_id uuid,
  p_profile_id uuid,
  p_role text
)
returns void language plpgsql security definer set search_path = public as $$
declare qtd_mods int;
begin
  if not public.is_moderator_of(p_band_id) then
    raise exception 'apenas moderador pode alterar papéis';
  end if;
  if p_role not in ('moderator', 'member') then
    raise exception 'papel inválido';
  end if;

  if p_role = 'member'
     and exists (
       select 1 from public.memberships
        where band_id = p_band_id and profile_id = p_profile_id and role = 'moderator'
     )
  then
    select count(*) into qtd_mods
      from public.memberships
     where band_id = p_band_id and role = 'moderator';
    if qtd_mods <= 1 then
      raise exception 'a banda precisa de pelo menos um moderador';
    end if;
  end if;

  update public.memberships
     set role = p_role
   where band_id = p_band_id and profile_id = p_profile_id;
end; $$;

create or replace function public.leave_band(p_band_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); qtd_mods int;
begin
  if uid is null then raise exception 'não autenticado'; end if;

  if exists (
    select 1 from public.memberships
     where band_id = p_band_id and profile_id = uid and role = 'moderator'
  ) then
    select count(*) into qtd_mods
      from public.memberships
     where band_id = p_band_id and role = 'moderator';
    if qtd_mods <= 1 then
      raise exception 'promova outro moderador antes de sair';
    end if;
  end if;

  delete from public.memberships where band_id = p_band_id and profile_id = uid;
end; $$;
