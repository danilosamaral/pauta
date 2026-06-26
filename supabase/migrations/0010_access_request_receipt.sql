-- 0010 — Comprovante de pagamento (PIX) no pedido de acesso.
-- (aplicada no projeto Supabase via MCP; versionada aqui para histórico)
-- Arquivo guardado em bucket PRIVADO; só o super-admin consegue ver.

alter table public.access_requests
  add column if not exists receipt_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes', 'comprovantes', false, 5242880,
        array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do nothing;

-- Qualquer pessoa (mesmo sem login) pode ENVIAR um comprovante para o bucket.
create policy "comprovantes_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'comprovantes');

-- Só o super-admin LÊ os comprovantes (para gerar a URL assinada e visualizar).
create policy "comprovantes_select_admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'comprovantes' and public.is_super_admin());
