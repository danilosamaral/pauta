-- 0012 — Endurecimento: fecha as funções para o público (anon) e os gatilhos.
-- (aplicada no projeto Supabase via MCP; versionada aqui para histórico)
--
-- Por padrão, funções recebem EXECUTE para PUBLIC (todos os papéis). Por isso
-- revogamos de PUBLIC e concedemos só a 'authenticated' onde faz sentido.
-- Os GATILHOS rodam independentemente de grant, então podem ser fechados de vez.

-- 1) Funções de gatilho: não devem ser chamáveis por API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_event_availability() from public, anon, authenticated;

-- 2) Funções que exigem login: só 'authenticated'.
revoke execute on function public.create_band(text) from public, anon;
grant  execute on function public.create_band(text) to authenticated;

revoke execute on function public.set_member_role(uuid, uuid, text) from public, anon;
grant  execute on function public.set_member_role(uuid, uuid, text) to authenticated;

revoke execute on function public.leave_band(uuid) from public, anon;
grant  execute on function public.leave_band(uuid) to authenticated;

revoke execute on function public.approve_access_request(uuid) from public, anon;
grant  execute on function public.approve_access_request(uuid) to authenticated;

revoke execute on function public.reject_access_request(uuid) from public, anon;
grant  execute on function public.reject_access_request(uuid) to authenticated;

-- 3) Auxiliares de RLS: usadas por usuários logados (e dentro das policies).
revoke execute on function public.is_super_admin() from public, anon;
grant  execute on function public.is_super_admin() to authenticated;

revoke execute on function public.is_member_of(uuid) from public, anon;
grant  execute on function public.is_member_of(uuid) to authenticated;

revoke execute on function public.is_moderator_of(uuid) from public, anon;
grant  execute on function public.is_moderator_of(uuid) to authenticated;

-- 4) only_digits: fixa o search_path (continua acessível — a tela pública de
--    pedido de acesso depende dela na policy de insert).
create or replace function public.only_digits(p text)
returns text language sql immutable set search_path = '' as
$$ select regexp_replace(coalesce(p, ''), '\D', '', 'g'); $$;
