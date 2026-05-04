## Objetivo

Melhorar a tela **Painel** (`/app`) com duas mudanças:

1. **Ganho total de Auris por criança** (histórico desde a entrada no app), exibido junto ao saldo atual.
2. **Cards do topo clicáveis** com navegação/detalhamento.

---

## 1) Saldos por criança — mostrar ganho total

Hoje o card "Saldos por criança" mostra apenas o saldo (aprovado − pago). Vamos exibir **dois valores** por criança:

- **Saldo atual** (já existe): aprovado − pago
- **Ganho total**: soma de todos os `reward_auris` de submissões `aprovado` desde sempre (sem subtrair pagamentos)

Layout proposto por linha:

```text
Gael                          Saldo: ✦ 120  ≈ R$ 120,00
                              Total ganho: ✦ 540
```

Os dados já são carregados em `Dashboard.tsx` (`allApproved`); basta acumular um segundo mapa `earnedTotals` em paralelo a `balances` e renderizar.

## 2) Cards do topo clicáveis

Os 4 cards ("Crianças", "Atividades ativas", "Pendentes", "Auris no mês") viram links:

| Card             | Destino                                  |
|------------------|------------------------------------------|
| Crianças         | `/app/criancas`                          |
| Atividades ativas| `/app/atividades`                        |
| Pendentes        | `/app/pendencias`                        |
| Auris no mês     | `/app/auris-mes` (nova rota — ver abaixo)|

Implementação: envolver cada `<Card>` em `<Link to=...>` com `hover` e cursor-pointer. Adicionar atributo `to` no array `cards`.

## 3) Nova tela: Auris do mês (`/app/auris-mes`)

Página nova `src/pages/app/AurisMonth.tsx` listando todas as submissões **aprovadas** do mês corrente da família, com:

- Filtro de mês (seletor mês/ano, default = mês atual)
- Tabela: Data | Criança | Atividade | Auris (✦) | Revisado por
- Totais no topo: total de Auris no mês + contagem de submissões
- Agrupamento opcional por criança (subtotal)

Fonte de dados: `submissions` filtrando `family_id`, `status = 'aprovado'`, `completed_at` no intervalo do mês, com joins para `children.name` e `activities.name`.

Adicionar rota em `src/App.tsx`:
```tsx
<Route path="auris-mes" element={<AurisMonth />} />
```

(Não adicionar ao sidebar — acesso apenas via card do Painel, conforme pedido.)

---

## Arquivos afetados

- `src/pages/app/Dashboard.tsx` — calcular `earnedTotals`, renderizar ganho total, transformar cards em `Link`.
- `src/pages/app/AurisMonth.tsx` — **novo**, tela de detalhamento mensal.
- `src/App.tsx` — registrar rota `auris-mes`.

Sem mudanças de banco nem RLS.
