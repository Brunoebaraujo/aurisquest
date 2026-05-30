-- Seed default suggested behavior activities for every family.
-- Activities remain family-scoped through family_id; no responsible-private ownership is introduced.

create or replace function public.seed_comportamento_activities_for_family(_family_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
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
    _family_id,
    suggested.name,
    suggested.description,
    'rotina'::public.activity_tier,
    'Comportamento',
    'diaria',
    true
  from (
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
    where a.family_id = _family_id
      and lower(a.name) = lower(suggested.name)
  );
$$;

create or replace function public.seed_comportamento_activities_after_family_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_comportamento_activities_for_family(new.id);
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'seed_comportamento_activities_after_family_insert'
  ) then
    create trigger seed_comportamento_activities_after_family_insert
      after insert on public.families
      for each row
      execute function public.seed_comportamento_activities_after_family_insert();
  end if;
end $$;

select public.seed_comportamento_activities_for_family(id)
from public.families;
