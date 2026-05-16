## Objetivo
Substituir as imagens dos 6 avatares humanos comuns existentes pelas 6 novas ilustrações enviadas, mantendo IDs, nomes, raridade e todos os desbloqueios já feitos pelas crianças.

## Mapeamento proposto (mantém os nomes atuais)

| Avatar atual | Nova imagem |
|---|---|
| Lia (menina_clara) | Menina_Branca_Castanho.png |
| Theo (menino_claro) | Menino_Branco_Castanho.png |
| Maitê (menina_parda) | Menina_Loira.png |
| Davi (menino_pardo) | Menino_Loiro.png |
| Aisha (menina_negra) | Menina_Negra.png |
| Kayo (menino_negro) | Menino_Negro.png |

Observação: as novas artes de Maitê/Davi têm aparência loira (não parda). O nome é mantido conforme escolha, mas se preferir, posso renomeá-los depois.

## Passos técnicos
1. Copiar as 6 imagens de `user-uploads://` para arquivos locais temporários.
2. Fazer upload ao bucket público `avatars-catalog` com novos nomes (`humano_v2_*.png`) para invalidar cache do CDN.
3. Atualizar `avatars.image_url` das 6 linhas existentes (UPDATE pelo id), preservando todo o resto.
4. Verificar via SELECT que os 6 URLs apontam para as novas imagens.

Nenhuma alteração em schema, RLS, código frontend ou edge functions é necessária — `EquippedAvatar`, `ChildShowcase` e `WardrobeDialog` já consomem `image_url` da tabela.

## Avatares não tocados
Os 4 humanos raros (Mei, Kenji, Iara, Tainá) e os 10 fantásticos permanecem inalterados.
