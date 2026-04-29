
-- Restringir EXECUTE da função SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.get_user_family_id(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_family_id(UUID) TO authenticated;

-- Substituir policy de leitura ampla dos buckets por uma que NÃO permite listing
DROP POLICY IF EXISTS "Leitura pública de provas" ON storage.objects;
DROP POLICY IF EXISTS "Leitura pública de avatares" ON storage.objects;

-- Permite GET de objetos individuais (URL conhecida) mas não listar (filtro por name garante objeto específico)
-- Como o bucket é público, GET por URL direta funciona via CDN sem passar por SELECT policy.
-- Removemos a policy de SELECT ampla; objetos continuam acessíveis via URL pública direta.
