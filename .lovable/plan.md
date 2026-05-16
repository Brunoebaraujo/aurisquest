## Objetivo
Adicionar as 8 novas artes ao catálogo de itens cosméticos, todas como **comum/starter** (desbloqueadas automaticamente para todas as crianças).

## Itens

### Novos (5 inserts)
| Nome | Categoria | Imagem |
|---|---|---|
| Elmo Azul | elmo | Elmo.png |
| Armadura Azul | armadura | Armadura_Azul.png |
| Armadura Rosa | armadura | Armadura_Rosa.png |
| Armadura Roxa | armadura | Armadura_Roxa.png |
| Armadura Verde | armadura | Armadura_Verde.png |

### Atualizações de itens existentes (3 updates "in-place")
Em vez de DELETE (que quebraria FKs em `child_equipment` e `child_unlocked_items` de quem já equipou/desbloqueou), faço UPDATE in-place mantendo os IDs — efeito visual é o mesmo do "substituir tudo":

| ID atual | Antes | Depois |
|---|---|---|
| `d0a98428…` Espada (épico / medalhas≥6) | imagem antiga | nova arte, **rarity=comum, unlock=starter** |
| `f0de9298…` Cajado (raro / auris≥300) | imagem antiga | nova arte, **rarity=comum, unlock=starter** |
| `bda4bd83…` Tiara Floral (raro / auris≥200) | imagem antiga | renomeado **"Tiara Rosa"**, nova arte, **rarity=comum, unlock=starter** |

## Passos técnicos
1. Copiar as 8 imagens de `user-uploads://` para `/tmp/`.
2. Fazer upload ao bucket público `cosmetics` em paths novos (`elmo/elmo_azul.png`, `armadura/armadura_azul.png` …, e `arma/espada_v2.png`, `arma/cajado_v2.png`, `elmo/tiara_rosa.png` para invalidar cache).
3. `UPDATE cosmetic_items` para os 3 existentes (nome quando aplicável, image_url, rarity='comum', unlock_rule_type='starter', unlock_threshold=0).
4. `INSERT INTO cosmetic_items` para os 5 novos (rarity='comum', unlock_rule_type='starter', sort_order coerente por categoria).
5. Para que todas as crianças já existentes recebam os novos starters (a função `evaluate_cosmetic_unlocks` só roda em novas submissões aprovadas), executar um backfill: para cada criança ativa, inserir em `child_unlocked_items` os novos itens starter (ON CONFLICT DO NOTHING).

## Não precisa mexer
- Nenhum schema, RLS, trigger, edge function ou código frontend muda. `WardrobeDialog`, `ParentWardrobeDialog`, `ChildShowcase` e `useFamilyCosmetics` já leem do catálogo dinamicamente.
