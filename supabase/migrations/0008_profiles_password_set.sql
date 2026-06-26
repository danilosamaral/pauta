-- 0008 — Login por telefone + senha (criada pelo usuário)
-- (aplicada no projeto Supabase via MCP; versionada aqui para histórico)
--
-- password_set indica se a pessoa já definiu a PRÓPRIA senha de acesso.
-- Enquanto for false, o app mostra a tela "Crie sua senha" após o login
-- pelo convite. O telefone continua sendo a chave da pessoa.
alter table public.profiles
  add column if not exists password_set boolean not null default false;
