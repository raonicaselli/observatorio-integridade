# Cobertura documental rastreável

O controle em `public/data/cobertura-pesquisa.json` registra **trabalho de pesquisa**,
não antecedentes, culpa ou ausência de processos. A aprovação de uma ocorrência
e a conclusão da pesquisa de uma candidatura são decisões distintas.

A estrutura tem versão 2 e abrange 2022/2026. Não depende da migração dos casos
jurídicos para v2: a base de ocorrências atual permanece em v1. Esta entrega não
faz consultas judiciais, não muda os 13 registros publicados nem confirma os
142 vínculos sugeridos entre eleições.

## Migração administrativa de 11/11/2026

| Recorte | Não iniciado | Documentação pendente | Triagem | Em revisão rastreável | Concluído |
| --- | --- | --- | --- | --- | --- |
| 2022 | 222 | 12 | 0 | 0 | 0 |
| 2026 | 358 | 0 | 0 | 0 | 0 |

O arquivo antigo `cobertura-pesquisa-2022.json` é preservado integralmente, com
SHA-256 registrado em `metadados.origemLegado` do novo controle:

- Os dez estados antigos `em_revisao`, datados de 21/10/2026, permanecem em
  `registro.legado`. Sem fontes, responsáveis e consultas rastreáveis, o controle
  atual os marca como `pendente_documentacao`. Isso não nega o trabalho anterior
  nem o transforma em uma nova pesquisa.
- Duas candidaturas com ocorrências publicadas estavam `nao_iniciado` no legado:
  `80001615730` e `90001652508`. O diagnóstico expõe a divergência histórica e as
  coloca entre as pendências atuais, sem inventar consulta ou revisão retroativa.
- Os outros 222 registros de 2022 e os 358 de 2026 começam sem consultas ou
  revisões registradas. Nenhuma pessoa é marcada como livre de processos.

A data de atualização do controle é administrativa. Datas de consulta e revisão
só são preenchidas quando os respectivos atos ocorrerem e forem documentados.

## Estrutura pública

`metadados` contém `versao: 2`, `protocolo: "pesquisa-documental-v1"`,
`atualizadoEm`, `recortes`, `total` e `origemLegado: {arquivo, sha256}`.

Cada registro tem exatamente:

| Campo | Regra |
| --- | --- |
| `ano`, `candidaturaId` | Ano numérico e `SQ_CANDIDATO` como string; uma entrada por candidatura de cada cadastro atual |
| `estado` | Um dos estados descritos abaixo |
| `consultas` | Lista de metadados públicos de consultas reais, inicialmente vazia |
| `revisoes` | Histórico de conclusões revisadas, inicialmente vazio |
| `legado` | Estado e datas originais quando houve atividade registrada em 2022; caso contrário `null` |

Nomes, cargos e UF são obtidos dos cadastros eleitorais, evitando cópias que
possam divergir. Registros em anos diferentes são separados: nome igual, UF igual
ou correspondência sugerida não autorizam copiar uma pesquisa ou um histórico.

Estados:

- `nao_iniciado`: sem consultas, revisões, atividade legada ou ocorrência publicada.
- `pendente_documentacao`: atividade legada ou publicação já existente, mas sem
  consultas rastreáveis. Não significa ocorrência ainda não aprovada.
- `triagem_inicial`: consulta pontual documentada, sem conclusão anterior.
- `em_revisao`: trabalho documentado em andamento, inclusive reabertura de uma
  conclusão anterior. As revisões anteriores permanecem no histórico.
- `revisao_concluida`: revisão aprovada que cobre o protocolo e as últimas
  consultas relevantes. Não significa pesquisa exaustiva de todos os autos.

## Como registrar uma consulta

Uma consulta exige:

- `id` estável em minúsculas/hífens, único em todo o controle, e `sequencia`
  inteira positiva, única e crescente no registro. Sequências não podem inverter
  datas; permitem distinguir tentativas no mesmo dia.
- `fonte: {grupo, orgao, url}` e `abrangencia: "BR"` ou UF da candidatura.
- `dataConsulta`, `responsavel`, `escopo` e `limitacoes` reais e explícitos.
- `resultado: "realizada"` ou `"acesso_indisponivel"`. Não há resultado
  "sem processos", "ficha limpa" ou contagem de acusações neste controle.
- `proximaRevisao`: data futura em relação à consulta, escolhida e justificada
  no escopo do trabalho; não é produzida automaticamente.
- `revisao: {responsavel, data, liberacaoPublica: true}` para liberar apenas os
  metadados de trabalho. A revisão não pode anteceder a consulta.

URL deve ser portal HTTPS sem credenciais, busca, query string ou fragmentos.
O grupo e a abrangência precisam corresponder ao domínio oficial esperado.
Não colocar nomes pesquisados, números de processos não aprovados, alegações,
peças sigilosas ou rascunhos no controle público. Material e termos de busca
ficam no ambiente editorial privado; URLs oficiais sozinhas não autorizam
publicar uma acusação. Campos não previstos são rejeitados, mas a conferência
do conteúdo dos textos permanece humana.

## Protocolo inicial e seus limites

O protocolo `pesquisa-documental-v1` exige registro nos seguintes recortes:

| Grupo | Abrangência | Portais aceitos inicialmente |
| --- | --- | --- |
| STF | Nacional (`BR`) | `stf.jus.br` e subdomínios |
| STJ | Nacional | `stj.jus.br` e subdomínios |
| Justiça eleitoral | Nacional e UF | TSE e TRE da UF |
| Justiça estadual | UF | TJ da UF; no DF, TJDFT |
| Justiça federal | UF | TRF competente ou seção judiciária `jf<uf>.jus.br` |
| Ministério Público | Nacional e UF | MPF e MP da UF; no DF, MPDFT |
| Polícia Federal | Nacional | `pf.gov.br` ou seção `/pf` em `gov.br`/`www.gov.br` |

São nove requisitos para uma candidatura de UF. Para presidência (`UF: BR`),
o protocolo não inventa uma UF e exige apenas os cinco recortes nacionais.
Essa é uma limitação explícita do protocolo, não uma auditoria territorial completa.

A seleção de UF segue a candidatura; o responsável precisa apontar no escopo
outras jurisdições relevantes e os limites da busca. Região federal segue a
competência atual dos TRFs, incluindo MG no TRF6. O contrato de domínios é
conservador: se um portal legítimo mudar, revisar a política em código e testes,
sem rotular um órgão incorreto para fazer a validação passar.

Registrar período pesquisado, método de identificação, bases efetivamente
consultadas e restrições no material editorial privado. No campo público de
escopo, descrever a abrangência sem expor investigação pendente. Uma visita à
página inicial não comprova uma pesquisa; o validador não navega nos portais e
não verifica a veracidade da declaração de quem pesquisou.

## Conclusão, reabertura e prazos

Uma conclusão em `revisoes` contém `id`, `data`, `responsavel`, `escopo`,
`limitacoes`, `consultasIds`, `proximaRevisao` e `liberacaoPublica: true`.

- As consultas referenciadas pertencem ao mesmo registro e já tiveram metadados
  revisados; a conclusão não pode preceder essa revisão.
- Todos os requisitos devem estar cobertos por consultas realizadas e ainda
  válidas na data da conclusão. Acesso indisponível mantém a pesquisa incompleta.
- Uma tentativa mais recente no mesmo recorte prevalece, inclusive uma falha.
  Não reutilizar uma consulta antiga para ocultar uma falha posterior.
- Revisões históricas não podem ignorar consultas já realizadas antes da sua
  data. No mesmo dia, a sequência das referências delimita a conclusão sem
  inventar horário; novas tentativas posteriores exigem reavaliação do estado.
- A próxima revisão da conclusão não pode ultrapassar a validade da consulta
  necessária com prazo mais curto.
- Consulta posterior a uma conclusão exige reabrir o trabalho ou registrar nova
  revisão completa. Revisões anteriores não são apagadas.

O diagnóstico usa data de referência explícita; o CLI adota por padrão o dia em
`America/Sao_Paulo`. Uma revisão concluída fica marcada como vencida quando chega
sua próxima data de revisão. O estado histórico não é alterado automaticamente.
Nenhum prazo vencido comprova que houve ou não houve nova movimentação judicial.

## Comandos

```sh
npm run validate:coverage
npm run validate:coverage -- --data 2026-11-11
npm run validate:coverage -- --arquivo /caminho/proposto.json --anterior /caminho/snapshot-aprovado.json
npm run sync:coverage
npm test
```

A sincronização inicializa somente quando o arquivo não existe, acrescenta novas
candidaturas e transforma nova publicação sem cobertura em pendência documental.
Preserva consultas, revisões e legado existentes; sem mudanças administrativas,
não altera sequer a data do controle. Não cria consultas ou conclui pesquisas.
Grava a saída atomicamente, apenas depois de validá-la.

Se uma retotalização retirar candidatura, a sincronização para e exige
reconciliação humana, preservando todo o histórico. O fluxo de arquivamento de
candidaturas retiradas precisa de uma entrega específica; não descartar a pesquisa
para fazer uma importação passar.

A comparação com `--anterior` impede remover candidaturas do controle, alterar
consultas já publicadas, inserir novas consultas antes da sequência existente,
remover ou reescrever revisões e modificar o legado. Reabrir a pesquisa e adicionar
metadados novos é permitido; apagar o passado não é.

CI e deploy buscam o snapshot do commit-pai e aplicam a comparação quando o novo
controle já existe nesse pai. O checkout mantém dois commits para esse fim. Na
primeira criação, a validação cruza integralmente os cadastros e o arquivo legado.
O workflow eleitoral também preserva o controle anterior antes de sincronizá-lo
e inclui o resultado na proposta de PR; a escrita direta na `main` continua proibida.

## Próximo trabalho editorial

Priorizar as doze pendências, incluindo as duas divergências históricas. Revalidar
as 13 ocorrências em fontes oficiais, documentando consultas reais, recursos,
defesa e resultados favoráveis. Aprovar metadados de cobertura não reaprova uma
ocorrência nem autoriza promover pistas da issue #21.

O processo de code review final, correção de achados e repetição dos testes
relevantes está registrado em `AGENTS.md` para as próximas entregas.
