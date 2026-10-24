# Auditoria técnica e plano documental

Consulta: 24/10/2026. Base auditada: commit
`e60ebd621506163591ec6be27ef74317890af514`, igual à `main` remota no momento da consulta.
Esta auditoria verifica código e consistência dos arquivos. Não constitui revisão
dos autos, confirmação de identidade pessoal nem atualização jurídica das fontes.

## Estado verificado

| Item | Resultado observado |
| --- | --- |
| Eleitos 2022 | 234 candidaturas únicas; 26 UFs |
| Eleitos 2026 | 358 candidaturas; 121 deputados federais; primeiro turno sujeito a retotalização |
| Ocorrências | 13 publicadas; nenhuma em revisão final |
| Agrupamento | 11 valores distintos de `idCaso`; 12 candidaturas com registros |
| Cobertura 2022 | 224 não iniciadas; 10 em revisão; nenhuma concluída |
| Reconciliação | 142 sugestões; todas pendentes de revisão humana |
| Datas de revisão das ocorrências | 21 e 22/10/2026; não revalidadas juridicamente nesta auditoria |

Os dois casos compartilhados por mais de uma candidatura não são, por si só,
duplicações: pessoas distintas podem participar do mesmo procedimento. A contagem
de `idCaso` não comprova independência jurídica dos episódios. A contagem de
candidaturas também não substitui uma contagem de pessoas com identidade reconciliada.

Executados com sucesso nesta consulta: `npm run validate:data`,
`npm run validate:ocorrencias`, `npm run validate:coverage`,
`npm run validate:2026` e `npm run build`. Ambiente: Node 24.19.0,
npm 11.9.0; CI configurado para Node 22. Não há suíte de testes comportamentais
nem testes de regressão dos validadores. Build e validações estruturais não
comprovam correção jurídica, acessibilidade ou interação no navegador.

## Achados priorizados

### P0 — Disponibilidade e controle editorial

1. `App.jsx` captura erro das ocorrências, mas não repassa esse estado a
   `CasesExplorer`. Este converte `null` em lista vazia e exibe a mensagem de
   nenhum registro. Diferenciar carregamento, indisponibilidade e resultado vazio
   é necessário para não produzir uma conclusão documental a partir de falha técnica.
2. `validate:ocorrencias` aceita `revisao_final` dentro de `public/data`.
   Filtrar na interface não impede acesso ao JSON nem ao histórico Git.
   Há conflito entre a seção final do contrato v1.1 e a orientação de manter
   pesquisa não aprovada fora do repositório. Atualmente os 13 registros estão
   publicados; não há registros nesse estado a remover.
3. O workflow de atualização eleitoral escreve diretamente na `main`. Antes do
   commit roda a validação de 2026, mas não todas as validações do site nem o build.
   Alterações de dados devem chegar por PR revisável com verificações completas;
   nenhuma rotina de importação deve promover registros jurídicos automaticamente.
4. Uma fonte marcada `oficial` é aceita pelo validador por autodeclaração.
   Não há comprovação automatizada da origem ou do conteúdo. Validação técnica
   nunca deve ser apresentada como substituta da conferência humana do documento.

### P1 — Histórico processual e cobertura

1. O modelo tem `idCaso`, órgão e número processual, mas não eventos estruturados,
   relações entre processos, resultados por imputação ou decisões por participante.
   Absolvição parcial e condenação por outro fato precisam coexistir no mesmo caso.
2. As 25 referências de fontes não têm data de consulta individual. `dataRevisao`
   não demonstra quando cada documento ou andamento foi efetivamente consultado.
3. Duas candidaturas com ocorrências publicadas continuam `nao_iniciado` na
   cobertura: `90001652508` e `80001615730`. O validador de cobertura não cruza
   publicações. Isso exige conciliação editorial com proveniência; não se deve
   inventar data de pesquisa ou marcar revisão completa automaticamente.
4. Cobertura só existe para 2022. Nenhuma pesquisa concluída é declarada.
   As 142 sugestões entre eleições usam nome e UF e corretamente não transferem
   ocorrências. Não promover esses pares sem evidências adicionais de identidade.
5. Datas de cobertura são verificadas por expressão regular; datas impossíveis
   podem passar. Também faltam testes negativos para publicação sem aprovação,
   associação indevida de pessoa e perda de resultados favoráveis.

### P2 — Interface, documentação e reprodução

1. README e documentos ainda descrevem uma camada jurídica futura ou vazia,
   enquanto a interface já apresenta 13 ocorrências. Documentação precisa indicar
   cobertura parcial e separar dados eleitorais de revisão jurídica.
2. A busca de ocorrências anuncia pesquisa por processo, mas não inclui
   `processoNumero` nos campos consultados. A métrica eleitoral mantém a legenda
   de 2022 quando o usuário seleciona 2026.
3. Não existe lockfile. `npm install` no CI pode resolver versões diferentes;
   introduzir lockfile e instalação congelada em mudança específica e validada.
4. Perfil não apresenta `processoNumero` em campo próprio; não há linha do tempo.
   Essas adaptações devem acompanhar o contrato de dados, sem rankings.

## Issues e limites de acesso

As páginas e os comentários disponíveis das issues foram consultados no GitHub:

- [#14](https://github.com/raonicaselli/observatorio-integridade/issues/14): aberta;
  documenta cotejo inicial das antigas 11 entradas com notícias oficiais, mas
  mantém pendente a conferência dos andamentos e recursos diretamente nos autos.
  O trabalho anterior não equivale a certificação de trânsito em julgado.
- [#15](https://github.com/raonicaselli/observatorio-integridade/issues/15): aberta;
  exige evidências reprodutíveis de identidade para confirmar pares entre eleições.
- [#21](https://github.com/raonicaselli/observatorio-integridade/issues/21): aberta;
  contém pistas de pesquisa, com zero novas ocorrências aprovadas na rodada
  registrada. Não importar essas pistas para a base pública.

HTTPS Git funcionou para conferir a ponta da `main`. A API do GitHub, inclusive
consulta de PRs por `gh`, retornou bloqueio `Forbidden` pelo acesso de rede.
O site público em `raonicaselli.github.io` também retornou bloqueio do túnel
HTTP 403. Assim, foi inspecionado o workflow de Pages, mas não foi confirmado
o último run, o SHA implantado ou o comportamento do site público nesta consulta.
Não há evidência para concluir que o deploy falhou. Teste de navegador não executado.

## Plano de entregas e critérios de aceite

Cada linha corresponde a um PR independente. Dados jurídicos existentes só
devem mudar com fonte, justificativa e revisão rastreáveis; correções não devem
apagar decisões anteriores ou promover pesquisa pendente.

| Ordem | Entrega | Aceite e validação |
| --- | --- | --- |
| 1 | Disponibilidade documental | Estados explícitos de carregamento, erro e vazio; teste de falha HTTP não pode resultar em mensagem de ausência de registros; preservar comportamento dos perfis. |
| 2 | Barreira de publicação | JSON público aceita somente registros aprovados; alinhar contrato; testes negativos para revisão pendente, identidade não confirmada e aprovação ausente; todos os 13 registros atuais preservados. |
| 3 | Contrato de casos e eventos v2 | Contrato versionado e exemplos fictícios; validar referências, datas reais, ordem temporal, unicidade e resultados por pessoa/imputação; aceitar absolvições, rejeição de denúncia, arquivamento e recursos; migração sem publicação automática. |
| 4 | Cobertura reproduzível | Registro de fonte consultada, consulta, responsável, escopo, limitações e próxima revisão; distinguir pesquisa de aprovação de ocorrência; detectar os dois conflitos atuais sem inventar datas; contemplar 2026. |
| 5 | Identidade entre eleições (#15) | Estados confirmado/divergente/inconclusivo, evidência oficial, método e revisor; teste de homônimo e de UF alterada; nenhum vínculo pendente pode transferir histórico jurídico. |
| 6 | Pesquisa e atualização (#14/#21) | Coleta em ambiente privado; identidade, documento primário, estágio, defesa, recursos, consulta e aprovação por registro; registrar também decisão de adiar sem expor rascunhos no repositório público. |
| 7 | Linha do tempo e busca | Apresentar eventos por caso e participante, processo, fonte, data e limites; testar resultados favoráveis e desfavoráveis simultâneos, indisponibilidade e busca por número; sem ranking. |
| 8 | Reprodução e deploy | Lockfile, instalação congelada e testes em CI; importação eleitoral via PR; verificar build e dados do artefato, e comparar SHA publicado quando houver acesso ao Pages/Actions. |

### Decisões de modelagem para o PR 3

- Separar pessoa, candidatura, caso, processo, participação, evento e fonte.
  Um caso pode ter vários processos e participantes; o resultado de um participante
  não deve ser atribuído automaticamente a todos os demais.
- Distinguir data do fato/ato, publicação da fonte, consulta e revisão editorial.
  Ordem de consulta não substitui ordem dos atos processuais.
- Cada evento referencia fonte e participante afetado, natureza do ato, órgão,
  resultado documentado, defesa quando disponível, recursos e limites conhecidos.
- Não inferir trânsito em julgado, culpa ou estado atual pela última manchete.
  Decisão favorável e desfavorável podem coexistir por imputação e instância.
- Eventos publicados devem preservar sua proveniência. Retificação referencia o
  evento anterior e registra motivo, fonte e revisão, sem reescrever o passado.
- Preservar v1 durante transição. Migrar somente informação já documentada;
  campos desconhecidos permanecem explicitamente desconhecidos, sem datas inventadas.
- Testes com pessoas e processos fictícios devem cobrir eventos duplicados,
  referência órfã, reforma de decisão, absolvição parcial, recurso pendente e
  bloqueio de exportação não aprovada. O fluxo de exportação deve falhar fechado.

## Limite desta entrega

Este documento conclui a auditoria inicial e define os próximos recortes.
Não altera dados jurídicos, não certifica fontes externas e não implementa o
contrato v2. As validações existentes passaram; as lacunas acima continuam
pendentes até os respectivos PRs e revisões editoriais.
