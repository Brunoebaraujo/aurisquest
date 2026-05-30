-- Seed default suggested behavior activities for every existing family.
-- Activities remain family-scoped through family_id; no responsible-private ownership is introduced.

insert into public.activities (
  family_id,
  name,
  description,
  tier,
  category,
  frequency_hint,
  active
)
select
  f.id,
  suggested.name,
  suggested.description,
  'rotina'::public.activity_tier,
  'Comportamento',
  'diaria',
  true
from public.families f
cross join (
  values
    ('Dia de comportamento exemplar', 'Reconhecer um dia com atitudes positivas, respeito e colaboração.'),
    ('Ajudar alguém da família', 'Valorizar quando a criança ajuda espontaneamente alguém em casa.'),
    ('Respeitar combinados', 'Cumprir acordos feitos com os responsáveis.'),
    ('Esperar a sua vez', 'Praticar paciência em brincadeiras, conversas ou atividades.'),
    ('Resolver conflito com calma', 'Conversar ou pedir ajuda sem gritar, bater ou ofender.'),
    ('Compartilhar brinquedos ou materiais', 'Dividir algo com outra criança ou familiar.'),
    ('Falar com educação', 'Usar palavras respeitosas como por favor, obrigado e desculpa.'),
    ('Seguir orientação na primeira vez', 'Atender uma orientação sem precisar de várias repetições.')
) as suggested(name, description)
where not exists (
  select 1
  from public.activities a
  where a.family_id = f.id
    and lower(a.name) = lower(suggested.name)
);
