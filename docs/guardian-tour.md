# Guardião e a Primeira Jornada

O tutorial usa a tabela `guardian_tutorial_progress`, identificada por `user_id`. O estado pertence a cada responsável e não altera, cria ou apaga entidades de negócio durante a navegação.

Estados suportados: `not_started`, `in_progress`, `completed` e `dismissed`. O progresso armazena versão, fase, passo e horário de atualização. A política RLS permite somente o próprio usuário ler, inserir ou alterar sua linha.

## Fluxos

- O onboarding inicia a orientação na primeira vez e destaca cada campo da Primeira Jornada.
- Ao concluir o cadastro, o estado passa para a fase `app` como `not_started`.
- A primeira entrada de um responsável oferece a visita guiada. Perfis já existentes sem registro não recebem uma visita automática.
- `Ajuda: repetir jornada` reinicia somente o tutorial. Não recria família, filhos, atividades, missões, recompensas, Auris ou pagamentos.
- Rotas infantis (`/c`, `/entrar` e derivadas) não montam o `AppLayout`; por isso o Guardião não aparece nelas.

## Alvos

Os alvos são `data-tour`, definidos nas telas de Crianças, Atividades, Missões, Pendências e Mercador. Se um alvo não existir (por exemplo, a missão Dentes Fortes tiver sido excluída), o Guardião mostra uma orientação geral e oferece a rota correspondente. Não há tentativas infinitas.

## Operação

Aplicar a migração `20261019213000_create_guardian_tutorial_progress.sql` antes de publicar o front-end. Depois, regenere os tipos Supabase caso o ambiente use geração automática.
