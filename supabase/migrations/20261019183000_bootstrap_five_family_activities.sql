-- Bootstrap five editable activities per new family.
-- Existing families with activities remain untouched; empty families receive a one-time repair.
-- Overrides the previous behavior-only seed while keeping the trigger name stable.
create or replace function public.seed_comportamento_activities_for_family(_family_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.activities (
    family_id, name, description, tier, reward_auris, category, frequency_hint, active, icon_key
  )
  select _family_id, suggested.name, suggested.description,
         suggested.tier::public.activity_tier,
         case when suggested.tier = 'rotina' then 1 else 3 end, suggested.category,
         suggested.frequency_hint, true, suggested.icon_key
  from (
    values
      ('Escovar os dentes', 'Escovar os dentes de manhã e antes de dormir.', 'rotina', 'Higiene', 'diaria', 'escovar-dentes'),
      ('Arrumar a cama', 'Arrumar a própria cama ao levantar.', 'rotina', 'Casa', 'diaria', 'arrumar-cama'),
      ('Fazer a lição de casa', 'Concluir as atividades escolares combinadas.', 'responsabilidade', 'Estudos', 'diaria', 'licao-de-casa'),
      ('Organizar o quarto', 'Guardar brinquedos e manter o quarto organizado.', 'responsabilidade', 'Casa', 'diaria', 'organizar-quarto'),
      ('Ajudar nas tarefas da casa', 'Colaborar com uma tarefa apropriada à idade.', 'responsabilidade', 'Casa', 'semanal', 'ajudar-cozinha')
  ) as suggested(name, description, tier, category, frequency_hint, icon_key)
  where not exists (
    select 1 from public.activities a
    where a.family_id = _family_id and lower(a.name) = lower(suggested.name)
  );
$$;

-- Install family creation trigger (not present in the deployed schema). 
create or replace function public.seed_comportamento_activities_after_family_insert()
returns trigger language plpgsql security definer set search_path = public as $
begin
  perform public.seed_comportamento_activities_for_family(new.id);
  return new;
end; $;

drop trigger if exists seed_comportamento_activities_after_family_insert on public.families;
create trigger seed_comportamento_activities_after_family_insert
  after insert on public.families for each row
  execute function public.seed_comportamento_activities_after_family_insert();

-- Repair empty families and the Senna family, preserving all existing activities.
select public.seed_comportamento_activities_for_family(f.id)
from public.families f
where not exists (select 1 from public.activities a where a.family_id = f.id)
   or lower(trim(f.name)) = 'senna';

revoke execute on function public.seed_comportamento_activities_for_family(uuid) from public, anon, authenticated;
revoke execute on function public.seed_comportamento_activities_after_family_insert() from public, anon, authenticated;
