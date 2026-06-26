-- 0009 — Inscrição de outras bandas com autorização do super-admin (abordagem A)
-- (aplicada no projeto Supabase via MCP; versionada aqui para histórico)

-- ---------- Super-admins ----------
create table if not exists public.app_admins (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
-- (sem políticas: ninguém lê direto; o acesso é via funções security definer)

-- Semeia o Danilo como super-admin (pelo telefone, sem hardcodear o id).
insert into public.app_admins (profile_id)
select id from public.profiles where public.only_digits(phone) = '5567984541353'
on conflict do nothing;

create or replace function public.is_super_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.app_admins a where a.profile_id = auth.uid());
$$;

-- ---------- Pedidos de acesso ----------
create table if not exists public.access_requests (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  phone             text not null,   -- só dígitos, com código do país
  band_name         text not null,
  message           text,
  status            text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at        timestamptz not null default now(),
  reviewed_by       uuid references public.profiles(id),
  reviewed_at       timestamptz,
  resulting_band_id uuid references public.bands(id),
  resulting_token   text
);
alter table public.access_requests enable row level security;

-- Qualquer pessoa (mesmo sem login) pode ENVIAR um pedido, com campos mínimos.
create policy access_req_insert on public.access_requests
  for insert to anon, authenticated
  with check (
    char_length(trim(name)) > 0 and
    char_length(trim(band_name)) > 0 and
    char_length(public.only_digits(phone)) >= 10
  );

-- Só o super-admin LÊ/gerencia os pedidos.
create policy access_req_admin on public.access_requests
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------- Aprovar / Recusar ----------
create or replace function public.approve_access_request(p_request_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare r public.access_requests; uid uuid := auth.uid(); new_band_id uuid; new_token text;
begin
  if not public.is_super_admin() then raise exception 'apenas admin'; end if;

  select * into r from public.access_requests where id = p_request_id;
  if r.id is null then raise exception 'pedido não encontrado'; end if;
  if r.status <> 'pending' then raise exception 'pedido já tratado'; end if;

  insert into public.bands (name, created_by)
    values (r.band_name, uid)
    returning id into new_band_id;

  new_token := replace(gen_random_uuid()::text, '-', '')
            || replace(gen_random_uuid()::text, '-', '');

  insert into public.invites
    (band_id, token, invited_phone, invited_name, role, created_by, expires_at)
  values
    (new_band_id, new_token, public.only_digits(r.phone), r.name, 'moderator', uid,
     now() + interval '48 hours');

  update public.access_requests
     set status = 'approved', reviewed_by = uid, reviewed_at = now(),
         resulting_band_id = new_band_id, resulting_token = new_token
   where id = r.id;

  return json_build_object('band_id', new_band_id, 'token', new_token);
end; $$;

create or replace function public.reject_access_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if not public.is_super_admin() then raise exception 'apenas admin'; end if;
  update public.access_requests
     set status = 'rejected', reviewed_by = uid, reviewed_at = now()
   where id = p_request_id and status = 'pending';
end; $$;
