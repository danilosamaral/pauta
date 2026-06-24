-- =============================================================
-- PAUTA — migração inicial (Fase 1 / demo A, B, C)
-- Princípio: disponibilidade é DA PESSOA, não da banda.
-- Rode no SQL Editor do Supabase. Ajuste se algo reclamar.
-- =============================================================

-- ---------- 1) PERFIL (estende auth.users) ----------
-- O telefone é a chave da pessoa que conecta todas as bandas dela.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  phone        text unique,
  created_at   timestamptz not null default now()
);

-- ---------- 2) BANDAS ----------
create table if not exists public.bands (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- 3) PARTICIPAÇÃO (pessoa <-> banda) ----------
-- role: moderator | member   |   instrument: baixo, voz, guitarra...
create table if not exists public.memberships (
  id         uuid primary key default gen_random_uuid(),
  band_id    uuid not null references public.bands(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('moderator','member')),
  instrument text,
  created_at timestamptz not null default now(),
  unique (band_id, profile_id)
);

-- ---------- 4) EVENTOS (reservas da banda) ----------
-- hold: full (trava o dia) | partial (reserva parcial -> vira "talvez" nas outras bandas)
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  band_id    uuid not null references public.bands(id) on delete cascade,
  day        date not null,
  kind       text not null check (kind in ('rehearsal','show')),
  location   text,
  start_time time,
  hold       text not null default 'full' check (hold in ('full','partial')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (band_id, day)  -- 1 reserva por banda por dia
);

-- ---------- 5) DISPONIBILIDADE PESSOAL ----------
-- Guarda SÓ exceções. Ausência de linha no dia = livre (verde).
-- source: 'self' (a própria pessoa marcou) | 'event' (gerado por reserva de banda)
create table if not exists public.availability (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  day             date not null,
  status          text not null check (status in ('maybe','busy')),
  note            text,
  source          text not null default 'self' check (source in ('self','event')),
  source_event_id uuid references public.events(id) on delete cascade,
  created_at      timestamptz not null default now()
);
create index if not exists availability_profile_day_idx on public.availability(profile_id, day);
-- no máximo 1 linha 'self' por pessoa/dia (as de evento podem coexistir)
create unique index if not exists availability_self_unique
  on public.availability(profile_id, day) where source = 'self';

-- ---------- 6) CONVITES (link gerado pelo moderador) ----------
create table if not exists public.invites (
  id            uuid primary key default gen_random_uuid(),
  band_id       uuid not null references public.bands(id) on delete cascade,
  token         text not null unique,
  invited_name  text,
  invited_phone text,
  role          text not null default 'member' check (role in ('moderator','member')),
  instrument    text,
  created_by    uuid not null references public.profiles(id),
  claimed_by    uuid references public.profiles(id),
  claimed_at    timestamptz,
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);

-- =============================================================
-- AUTO-BLOQUEIO CROSS-BAND
-- Ao reservar um evento, materializa a indisponibilidade de cada
-- integrante na tabela availability (sem revelar qual banda).
-- =============================================================
create or replace function public.sync_event_availability()
returns trigger language plpgsql security definer set search_path = public as $$
declare st text;
begin
  if (tg_op = 'DELETE') then
    -- as linhas de availability somem por ON DELETE CASCADE
    return old;
  end if;

  st := case when new.hold = 'full' then 'busy' else 'maybe' end;

  if (tg_op = 'UPDATE') then
    update public.availability
       set status = st
     where source_event_id = new.id;
    return new;
  end if;

  -- INSERT: cria uma linha por integrante da banda
  insert into public.availability (profile_id, day, status, note, source, source_event_id)
  select m.profile_id, new.day, st, 'comprometido com outra banda', 'event', new.id
    from public.memberships m
   where m.band_id = new.band_id;
  return new;
end; $$;

drop trigger if exists trg_event_availability on public.events;
create trigger trg_event_availability
  after insert or update or delete on public.events
  for each row execute function public.sync_event_availability();

-- =============================================================
-- HELPERS de permissão (usados nas políticas RLS)
-- =============================================================
create or replace function public.is_member_of(b uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists(select 1 from public.memberships m
                 where m.band_id = b and m.profile_id = auth.uid());
$$;

create or replace function public.is_moderator_of(b uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists(select 1 from public.memberships m
                 where m.band_id = b and m.profile_id = auth.uid()
                   and m.role = 'moderator');
$$;

-- =============================================================
-- RLS — ponto de partida (revise com os "advisors" do Supabase)
-- =============================================================
alter table public.profiles     enable row level security;
alter table public.bands        enable row level security;
alter table public.memberships  enable row level security;
alter table public.events       enable row level security;
alter table public.availability enable row level security;
alter table public.invites      enable row level security;

-- profiles: vejo o meu e o de quem compartilha banda comigo; edito só o meu
create policy profiles_read on public.profiles for select using (
  id = auth.uid() or exists (
    select 1 from public.memberships m1
    join public.memberships m2 on m1.band_id = m2.band_id
    where m1.profile_id = auth.uid() and m2.profile_id = profiles.id)
);
create policy profiles_write on public.profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

-- bands: vejo as minhas; crio sendo o dono
create policy bands_read on public.bands for select using (public.is_member_of(id));
create policy bands_insert on public.bands for insert with check (created_by = auth.uid());
create policy bands_update on public.bands for update using (public.is_moderator_of(id));

-- memberships: vejo as da minha banda; moderador gerencia
create policy mship_read on public.memberships for select using (public.is_member_of(band_id));
create policy mship_write on public.memberships for all
  using (public.is_moderator_of(band_id) or profile_id = auth.uid())
  with check (public.is_moderator_of(band_id) or profile_id = auth.uid());

-- events: vejo os da minha banda; moderador cria/edita/apaga
create policy events_read on public.events for select using (public.is_member_of(band_id));
create policy events_write on public.events for all
  using (public.is_moderator_of(band_id)) with check (public.is_moderator_of(band_id));

-- availability: vejo a minha e a de quem compartilha banda comigo; edito só a minha 'self'
create policy av_read on public.availability for select using (
  profile_id = auth.uid() or exists (
    select 1 from public.memberships m1
    join public.memberships m2 on m1.band_id = m2.band_id
    where m1.profile_id = auth.uid() and m2.profile_id = availability.profile_id)
);
create policy av_write_self on public.availability for all
  using (profile_id = auth.uid() and source = 'self')
  with check (profile_id = auth.uid() and source = 'self');

-- invites: moderador da banda gerencia
create policy invites_mod on public.invites for all
  using (public.is_moderator_of(band_id)) with check (public.is_moderator_of(band_id));
