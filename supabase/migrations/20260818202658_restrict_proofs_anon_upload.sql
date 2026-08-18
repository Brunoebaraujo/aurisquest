-- Fecha o bucket proofs para upload anônimo irrestrito.
--
-- Situação anterior: qualquer requisição anon (sem token de criança, sem
-- login nenhum) podia inserir QUALQUER arquivo em QUALQUER caminho dentro
-- do bucket 'proofs' — funcionava como hospedagem de arquivo aberta na
-- internet. A policy nova restringe o upload a:
--   1. Caminhos no formato "{family_id}/{child_id}/arquivo" ou
--      "sidequests/{family_id}/{child_id}/arquivo", onde family_id/child_id
--      precisam corresponder a uma criança ativa de verdade no banco.
--   2. Apenas extensões de imagem comuns (evita upload de scripts,
--      executáveis, html etc. mesmo dentro de uma pasta válida).
--
-- Isso não substitui a validação forte por token de sessão (isso é a
-- Opção B, mais invasiva, registrada como próximo passo), mas fecha o
-- problema mais grave — upload arbitrário sem qualquer vínculo com uma
-- criança/família real — sem exigir nenhuma mudança de frontend.

DROP POLICY IF EXISTS "Anon upload de provas" ON storage.objects;

CREATE POLICY "Anon upload de provas restrito a criança ativa"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'proofs'
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'heic', 'heif')
    AND (
      -- padrão normal: {family_id}/{child_id}/arquivo
      (
        array_length(storage.foldername(name), 1) = 2
        AND EXISTS (
          SELECT 1 FROM public.children c
          WHERE c.family_id::text = (storage.foldername(name))[1]
            AND c.id::text = (storage.foldername(name))[2]
            AND c.active
        )
      )
      OR
      -- padrão sidequest: sidequests/{family_id}/{child_id}/arquivo
      (
        array_length(storage.foldername(name), 1) = 3
        AND (storage.foldername(name))[1] = 'sidequests'
        AND EXISTS (
          SELECT 1 FROM public.children c
          WHERE c.family_id::text = (storage.foldername(name))[2]
            AND c.id::text = (storage.foldername(name))[3]
            AND c.active
        )
      )
    )
  );
