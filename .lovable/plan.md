## Comprovação leve da SideQuest do Dia

Adicionar um modal mágico de conclusão exigindo pelo menos comentário OU foto, salvar no histórico e exibir esses registros em "Minhas Side-Quests". Sem aprovação do responsável.

### 1. Banco de dados (migration)

Adicionar colunas em `public.side_quests`:
- `child_comment text` (até 120 chars)
- `child_photo_url text`

Atualizar RPCs existentes para incluir esses campos no retorno:
- `get_child_side_quest_history` — incluir `child_comment` e `child_photo_url` em cada item.
- `complete_side_quest` — aceitar dois novos parâmetros `_child_comment text DEFAULT NULL` e `_child_photo_url text DEFAULT NULL`; validar que ao menos um seja não-nulo/não-vazio (caso contrário `RAISE EXCEPTION 'empty_proof'`); persistir no UPDATE; demais regras inalteradas (crédito de Auris, expiração, status). Limitar comentário a 120 chars no servidor.

Bucket de fotos: reutilizar `proofs` (já público) — caminho `sidequests/{family_id}/{child_id}/{timestamp}.{ext}`. Nenhuma migration de storage necessária — política atual `Upload de provas autenticado` é `TO authenticated`, e o child usa o anon client. Vamos relaxar essa policy adicionando role `anon` para `bucket_id = 'proofs'` (mesma migration), mantendo escrita restrita ao bucket de provas. Leitura já é pública.

### 2. Frontend

**`src/hooks/useActiveSideQuest.ts`** — estender `SideQuestHistoryItem` com `child_comment` e `child_photo_url`.

**Novo `src/components/sidequest/CompleteSideQuestDialog.tsx`** — modal estilo pergaminho:
- Cabeçalho mágico ("Como foi sua aventura hoje? ✨")
- Textarea (max 120) "Conte o que aconteceu..." com contador suave
- Botão "Enviar foto 📸" (input file `accept="image/*" capture="environment"`) com preview e botão remover
- Texto auxiliar: "Conte como foi sua missão ou envie uma foto ✨" (só aparece em vermelho amigável se tentar concluir vazio)
- Botão "Concluir missão" desabilitado quando ambos vazios
- Visual: gradiente âmbar/dourado, ring `cat.ring`, sparkles, sem aparência burocrática

**`src/components/sidequest/SideQuestScroll.tsx`** — trocar `onComplete: () => void` por `onRequestComplete: () => void`; o botão abre o novo modal (controlado pelo pai).

**`src/pages/ChildHome.tsx`** — refatorar fluxo de conclusão:
1. Botão do pergaminho abre `CompleteSideQuestDialog`.
2. Ao confirmar: se `file` presente, upload para `proofs` em `sidequests/...` (mesmo padrão do `submit`). Pegar publicUrl.
3. Chamar `supabase.rpc("complete_side_quest", { _token, _side_quest_id, _child_comment, _child_photo_url })`.
4. Toast de sucesso ("Pergaminho registrado no histórico ✨"), fechar modal, refresh, manter crédito de Auris.

**`src/components/sidequest/SideQuestHistory.tsx`** — para cada item concluído renderizar (quando existirem):
- Comentário do responsável (já temos via `parent_comment` — adicionar exibição se houver, em balão "💌")
- Comentário da criança em balão "🗯️"
- Miniatura clicável da foto (thumb 56–72px, `rounded-xl`, abre em nova aba)
- Manter ícone, nome, categoria · data, Auris, check verde

### 3. Critério de aceite

- Conclusão vazia bloqueada com mensagem amigável.
- Comentário OU foto (ou ambos) liberam a confirmação.
- Auris creditados automaticamente, sem aprovação do responsável.
- Histórico mostra comentário do responsável, comentário da criança e miniatura da foto quando existirem.
- Pergaminho ativo desaparece após conclusão; entra no histórico.
- Visual mantém estética mágica/RPG do Auris Quest.

### Arquivos

**Migration**: nova migration única — adiciona colunas, atualiza 2 RPCs, ajusta policy de upload do bucket `proofs` para incluir `anon`.

**Criar**: `src/components/sidequest/CompleteSideQuestDialog.tsx`

**Editar**: `src/components/sidequest/SideQuestScroll.tsx`, `src/components/sidequest/SideQuestHistory.tsx`, `src/pages/ChildHome.tsx`, `src/hooks/useActiveSideQuest.ts`

Aprove para eu executar a migration e implementar.