

## Filtrar Veículos por Insight com Dias sem Atualização

### Problema
Ao clicar num insight (ex: "KM/Hora Desatualizado"), o link leva para `/veiculos` mas não filtra os veículos relevantes. O usuário precisa ver apenas os veículos que atendem à condição do insight, com a informação de quantos dias cada um está sem atualização.

### Solução

#### 1. Adicionar filtro `insightFilter` via query param
O insight "KM/Hora Desatualizado" já aponta para `/veiculos` — vamos usar um query param `insight=km_desatualizado` para ativar o filtro especial.

Atualizar a rota do insight em `useFleetInsights.tsx`:
```
route: '/veiculos?insight=km_desatualizado'
```

Fazer o mesmo para `retorno_atrasado`:
```
route: '/veiculos?insight=retorno_atrasado'
```

#### 2. `src/types/fleet.ts` — Estender `FilterOptions`
Adicionar campo opcional `insightFilter` ao tipo `FilterOptions`:
```ts
insightFilter?: 'km_desatualizado' | 'retorno_atrasado' | 'entregas_atrasadas' | null;
```

#### 3. `src/components/vehicles/VehiclesList.tsx` — Aplicar filtro de insight
- Ler `searchParams.get('insight')` e inicializar o filtro
- Na lógica de `filteredVehicles`, quando `insightFilter === 'km_desatualizado'`, filtrar veículos cuja `ultima_atualizacao` seja nula ou anterior a 30 dias
- Ordenar os resultados por dias sem atualização (mais antigos primeiro)

#### 4. `src/components/vehicles/VehicleCard.tsx` — Mostrar dias sem atualização
- Quando o filtro de insight `km_desatualizado` estiver ativo, exibir um badge/info no card mostrando "X dias sem atualização"
- Calcular usando `differenceInDays(hoje, ultima_atualizacao)`

#### 5. Aplicar mesmo padrão para outros insights
- `retorno_atrasado`: filtrar veículos com `retorno_patio` no passado, mostrar dias de atraso
- `entregas_atrasadas`: filtrar revisões em serviço com previsão de entrega vencida

### Arquivos alterados
- `src/hooks/useFleetInsights.tsx` — ajustar rotas dos insights
- `src/types/fleet.ts` — adicionar `insightFilter` ao `FilterOptions`
- `src/components/vehicles/VehiclesList.tsx` — lógica de filtragem por insight
- `src/components/vehicles/VehicleCard.tsx` — exibir dias sem atualização contextualmente

