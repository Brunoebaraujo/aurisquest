
ALTER TYPE public.unlock_rule_type ADD VALUE IF NOT EXISTS 'aprovacoes';
ALTER TYPE public.unlock_rule_type ADD VALUE IF NOT EXISTS 'atividade';
ALTER TYPE public.unlock_rule_type ADD VALUE IF NOT EXISTS 'categoria';
ALTER TYPE public.unlock_rule_type ADD VALUE IF NOT EXISTS 'missao_grupo';

ALTER TABLE public.cosmetic_items
  ADD COLUMN IF NOT EXISTS scope_type text NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS scope_id uuid,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS unlock_condition_value jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.avatars
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS scope_type text NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS scope_id uuid,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS unlock_condition_value jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.cosmetic_items
  DROP CONSTRAINT IF EXISTS cosmetic_items_scope_type_check,
  ADD CONSTRAINT cosmetic_items_scope_type_check CHECK (scope_type IN ('global','group','family','child'));

ALTER TABLE public.avatars
  DROP CONSTRAINT IF EXISTS avatars_scope_type_check,
  ADD CONSTRAINT avatars_scope_type_check CHECK (scope_type IN ('global','group','family','child'));
