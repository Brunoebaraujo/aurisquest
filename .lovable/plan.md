
## Objetivo
Redesenhar visualmente duas telas para combinar com os mockups anexados, mantendo toda a lógica/funcionalidade existente.

## Telas afetadas

### 1. `src/pages/Auth.tsx` — Tela de login
Mockup: fundo de paisagem fantasia (céu azul, castelo, vila medieval, dragão), cristal Auri grande centralizado com brilho radiante, título "Auris Quest" em fonte display branca com sombra, card de login branco com cantos arredondados grandes flutuando sobre a paisagem.

Mudanças:
- Gerar via IA uma imagem de fundo de paisagem fantasia (céu azul, castelo à direita, vila medieval embaixo, dragão sutil no topo esquerdo) em `src/assets/auth-bg.jpg`.
- Aplicar como `background-image` cobrindo a tela inteira.
- Aumentar o cristal Auri (≈140px) com glow radiante azul atrás (blur + gradient).
- Título "Auris Quest" maior, fonte display, branco com drop-shadow forte.
- Card branco mais arredondado (rounded-[2rem]), com sombra suave, posicionado mais para baixo.
- Manter Tabs (Entrar / Criar conta), inputs, botão "Entrar" com gradiente azul, link "Esqueci minha senha".
- Rodapé "Para responsáveis..." em branco sobre o fundo.

### 2. `src/pages/app/ProfileSelector.tsx` — Tela "Quem entrará?"
Mockup: mesmo fundo de paisagem fantasia, cristal Auri no topo, título "Quem entrará?" grande em branco, card grande do "Responsável" no centro (com ilustração de mago/feiticeiro), cards menores de crianças embaixo em linha.

Mudanças:
- Reutilizar a mesma imagem de fundo `auth-bg.jpg`.
- Cristal Auri no topo (sem card de fundo), com glow.
- Título "Quem entrará?" em fonte display branca grande com sombra; subtítulo branco translúcido.
- Card "Responsável" destacado, maior, em destaque acima — usar ilustração de mago (gerar `src/assets/wizard.png` transparente via IA: mago encapuzado azul com bola de cristal) em vez do ícone Shield.
- Cards de crianças menores, em grid horizontal abaixo (3 colunas em desktop, 2 em mobile), com avatares circulares grandes e nome em fonte display bold.
- Manter toda a lógica de carregamento (`children`), navegação (`goParent`, `goChild`), botão "Sair da conta".

## Assets a gerar (via imagegen, modo build)
1. `src/assets/auth-bg.jpg` — paisagem fantasia (céu azul brilhante, castelo branco com torres à direita, vila medieval com casas de telhado azul embaixo, dragão azul voando à esquerda no topo, montanhas distantes). 1280x1920, premium quality.
2. `src/assets/wizard.png` — mago encapuzado em manto azul, barba branca, segurando bola de cristal brilhante, fundo transparente, estilo cartoon brilhante.

## Arquivos a editar
- `src/pages/Auth.tsx` — novo layout com background image + card flutuante.
- `src/pages/app/ProfileSelector.tsx` — novo layout com background image + card responsável destacado + grid de crianças.

## Sem alterações
- Lógica de auth, navegação, hooks, RLS, sessões — tudo preservado.
- `AuriIcon` já é usado e continua igual.
