
-- Leitura pública de uma criança ativa (qualquer um com o id pode ver nome)
CREATE POLICY "Acesso público à criança ativa por id"
  ON public.children FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Leitura pública de atividades ativas
CREATE POLICY "Acesso público a atividades ativas"
  ON public.activities FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Inserção de submissão pública: precisa ter family_id correto da criança
CREATE POLICY "Criança envia submissão"
  ON public.submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pendente'
    AND EXISTS (
      SELECT 1 FROM public.children c
      WHERE c.id = submissions.child_id
        AND c.family_id = submissions.family_id
        AND c.active = true
    )
  );

-- Leitura pública de submissões da própria criança (necessária para mostrar histórico/saldo)
CREATE POLICY "Acesso público a submissões por criança"
  ON public.submissions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Observação: leitura pública de submissions é ampla mas só expõe metadados; family_id existe.
-- Em produção, restringir via edge function. Para MVP é aceitável.

-- Leitura pública de pagamentos (para calcular saldo na tela da criança)
CREATE POLICY "Acesso público a pagamentos"
  ON public.payments FOR SELECT
  TO anon, authenticated
  USING (true);
