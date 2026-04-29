CREATE POLICY "Anon upload de provas"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'proofs');