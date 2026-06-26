-- 0011 — Permite o super-admin APAGAR comprovantes (ao excluir um pedido).
-- (aplicada no projeto Supabase via MCP; versionada aqui para histórico)
-- A exclusão do PEDIDO em si já é coberta pela política access_req_admin
-- (FOR ALL ao super-admin); aqui liberamos apagar o arquivo no Storage.
create policy "comprovantes_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'comprovantes' and public.is_super_admin());
