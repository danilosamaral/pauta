-- 0006 — Convite amarrado ao número (e de uso único)

create or replace function public.only_digits(p text)
returns text language sql immutable as
$$ select regexp_replace(coalesce(p, ''), '\D', '', 'g'); $$;

drop function if exists public.create_invite(uuid, text, text);

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
     now() + interval '14 days');

  return new_token;
end; $function$;

create or replace function public.claim_invite(invite_token text)
returns json language plpgsql security definer set search_path to 'public' as
$function$
declare
  inv        public.invites;
  uid        uuid := auth.uid();
  bname      text;
  user_phone text;
begin
  if uid is null then raise exception 'não autenticado'; end if;

  select * into inv from public.invites where token = invite_token;
  if inv.id is null then raise exception 'convite inválido'; end if;
  if inv.expires_at is not null and inv.expires_at < now() then
    raise exception 'convite expirado';
  end if;

  select name into bname from public.bands where id = inv.band_id;

  if exists (select 1 from public.memberships m
              where m.band_id = inv.band_id and m.profile_id = uid) then
    return json_build_object('band_id', inv.band_id, 'band_name', bname, 'already', true);
  end if;

  if inv.claimed_by is not null then
    raise exception 'convite já utilizado';
  end if;

  if inv.invited_phone is not null then
    select phone into user_phone from public.profiles where id = uid;
    if public.only_digits(user_phone) is distinct from public.only_digits(inv.invited_phone) then
      raise exception 'este convite foi feito para outro número de telefone';
    end if;
  end if;

  insert into public.memberships (band_id, profile_id, role, instrument)
    values (inv.band_id, uid, coalesce(inv.role, 'member'), inv.instrument);

  update public.invites set claimed_by = uid, claimed_at = now() where id = inv.id;

  return json_build_object('band_id', inv.band_id, 'band_name', bname, 'already', false);
end; $function$;

revoke execute on function public.create_invite(uuid, text, text, text, text) from anon, public;
revoke execute on function public.claim_invite(text) from anon, public;
grant execute on function public.create_invite(uuid, text, text, text, text) to authenticated;
grant execute on function public.claim_invite(text) to authenticated;
