# Contrato v2 — casos, processos e eventos documentados

A versão 1 continua sendo usada em `public/data/ocorrencias-publicadas.json` e
nas sínteses da interface; a linha do tempo acrescenta os eventos v2 aprovados
às fichas com correspondência revisada. O [primeiro lote aprovado](auditorias/migracao-v2-2026-11-12/README.md)
coexiste no pacote v2, com dois eventos da AP 2782 e correspondência rastreável.
O contrato não migra nem reaprova automaticamente os demais registros.

A implementação normativa é `scripts/lib/casos-v2.mjs`; o
[exemplo JSON](exemplos/casos-v2-ficticios.json) tem duas pessoas, um caso, dois
processos e sete eventos **inteiramente fictícios**. Nomes, identidades, datas,
revisões e fontes são simulados. `example.org` não é tribunal ou fonte oficial.
Nada nesse exemplo descreve uma pessoa real ou comprova resultados judiciais.

## Objetivo e recorte desta versão

Representar o que aconteceu em cada procedimento, com resultado por participante
e imputação, distinguindo acusação, decisão, recurso e desfecho. Não gerar ranking,
presumir culpa ou tratar ausência de registros como inexistência de processos.

O v2 representa atos oficiais: pedido de apuração, investigação e fases
processuais. Apuração exclusivamente jornalística continua sujeita ao contrato v1;
não convertê-la em ato oficial para encaixar neste modelo. O contrato não
implementa coleta remota, exportador ou banco de dados. A publicação estática do
piloto tem validação própria; a interface mantém v1 e apresenta a linha do tempo
v2 apenas nos registros com correspondência revisada.

## Pacote e regras comuns

O pacote possui exatamente `metadados`, `pessoas`, `candidaturas`, `casos`,
`processos`, `participacoes`, `fontes` e `eventos`. Nesta primeira versão, todas as
coleções devem ser não vazias e formar um conjunto documental coerente.

`metadados` contém:

| Campo | Regra |
| --- | --- |
| `versao` | Número `2` |
| `finalidade` | `publicacao` ou `exemplo_ficticio`, sem conversão automática |
| `atualizadoEm` | Data ISO real `AAAA-MM-DD`, limite superior para as revisões |
| `escopo`, `limites` | Textos obrigatórios sobre recorte e limitações |

Cada entidade das sete coleções tem `id`, `statusEditorial` e `revisao`:

- `id`: string estável de 3–80 caracteres, iniciada por letra minúscula, seguida
  de letras minúsculas, dígitos ou hífens. Única dentro de cada coleção.
- `statusEditorial`: exclusivamente `publicado`. Rascunhos, revisão final e
  pesquisa não autorizada pertencem a ambiente privado, inclusive antes de um PR.
- `revisao`: `{responsavel, data, justificativa, liberacaoPublica: true}`. A data
  precisa ser válida e não pode ser posterior à atualização do pacote.

As estruturas são fechadas: campos desconhecidos são rejeitados para evitar que
anotações internas sejam exportadas por engano. Campos descritos como anuláveis
precisam existir com `null`; ausência e informação desconhecida são distintas.
Referências usam IDs explícitos, nunca correspondência por nome. Listas de
referências não podem repetir IDs.

Textos exigem ao menos três caracteres úteis, exceto siglas partidárias, órgão e classe (dois) e número de processo (um).
Datas são dias de calendário, sem horário. Uma data precisa que a fonte não
permite determinar **não pode ser inventada** para passar na validação.

## Entidades

### Pessoas e candidaturas

`pessoas`: `{id, nome, identidade, statusEditorial, revisao}`.

`identidade`: `{estado: "confirmada", metodo, fontesIds}`. Exige evidência oficial
e descrição do método de conferência. A rotina verifica a declaração e as
referências, não comprova por si só a identidade civil.

`candidaturas`: `{id, tseId, ano, pessoaId, uf, cargo, partido, fontesIds,
statusEditorial, revisao}`.

- `tseId` preserva `SQ_CANDIDATO` como string de 8–16 dígitos.
- O recorte inicial admite 2022 e 2026; a combinação ano/ID não pode aparecer
  duas vezes ou apontar para duas pessoas.
- Cargos são os seis cargos titulares da base eleitoral; presidência exige
  abrangência `BR`. Vices e suplentes continuam fora deste recorte.
- No modo público, ano/ID, UF, cargo e partido são conferidos nos cadastros
  eleitorais fornecidos. O CLI usa as bases atuais de 2022 e 2026 do repositório.
- Nome e UF não bastam para vincular uma pessoa entre eleições. As 142 sugestões
  atuais não podem ser promovidas a identidade confirmada por este comando.
- Cada pessoa no pacote precisa de ao menos uma candidatura no recorte.

### Casos e processos

`casos`: `{id, titulo, resumo, categoria, periodoFatos, limites,
statusEditorial, revisao}`.

`categoria`: `eleitoral`, `penal`, `civel`, `administrativa` ou `outra`.
`periodoFatos`: `{inicio, fim, descricao}`; as datas podem ser `null`, mas a
explicação é obrigatória. Datas conhecidas devem ser reais, ordenadas e não
posteriores à consulta do pacote. Caso é o episódio documental, não cada notícia.

`processos`: `{id, casoId, orgao, classe, numero, motivoNumeroIndisponivel,
instancia, processoOrigemId, fontesIds, statusEditorial, revisao}`.

- Número público conhecido: string com motivo `null`.
- Número não localizado ou não público: `numero: null` e motivo explícito.
  Não criar um número ou divulgar dado sigiloso para completar o pacote.
- Órgão, classe e número conhecido formam uma chave de duplicação normalizada
  sem acentos, espaços ou pontuação. Ainda cabe ao revisor reconhecer processos
  renumerados ou relacionados; a rotina não faz pesquisa judicial.
- `processoOrigemId` é `null` ou aponta para processo do mesmo caso, sem ciclos.
  A relação deve estar documentada; processos de recursos podem ter IDs próprios.
- Exige fonte oficial. Cada processo e caso precisa de ao menos um evento.

### Participações e imputações

`participacoes`: `{id, casoId, pessoaId, descricaoVinculo, partidoNosFatos,
motivoPartidoDesconhecido, imputacoes, fontesIds, statusEditorial, revisao}`.

Uma pessoa tem no máximo uma participação por caso. Sua função no procedimento
precisa estar descrita e sustentada em fonte oficial; mera citação em notícia ou
em autos não equivale a ser investigada. Cada participação precisa de um evento.

Filiação desconhecida usa `partidoNosFatos: null` com motivo. Se conhecida, o
motivo é `null`. A filiação da candidatura não é copiada automaticamente.

`imputacoes` é uma lista, inclusive vazia, de `{id, descricao}` com IDs únicos na
participação. São alegações individualizadas, não fatos considerados provados.
Resultados favoráveis e desfavoráveis de imputações diferentes devem ser eventos
distintos, mesmo quando pertencem à mesma sentença.

### Fontes

`fontes`: `{id, url, titulo, instituicao, tipo, dataPublicacao, dataConsulta,
localizador, sha256, statusEditorial, revisao}`.

- URL HTTPS sem usuário ou senha; tipo `oficial`, `imprensa` ou `outro`.
- No modo público, fonte `oficial` exige domínio `jus.br`, `mp.br`, `gov.br` ou
  `leg.br`, ou subdomínio efetivo desses domínios. Um nome como
  `tse.jus.br.example.org` é rejeitado. Essa regra conservadora não certifica
  autenticidade, disponibilidade, teor do documento ou que o ato é judicial.
  Fonte oficial hospedada fora dessa política exige revisão do contrato antes
  da inclusão, não uma classificação falsa para contornar a validação.
- Publicação desconhecida usa `dataPublicacao: null`. Consulta é obrigatória,
  posterior ou igual à publicação conhecida e anterior ou igual à revisão.
- `localizador` descreve página, trecho ou referência dentro da fonte. Notícia
  institucional não deve ser descrita como inteiro teor de decisão.
- `sha256` é hash hexadecimal de 64 caracteres quando o documento foi efetivamente
  preservado e calculado; caso contrário, `null`. Nunca gerar hash fictício.
- Mesmo URL, consulta, localizador e hash não podem criar duas fontes; reutilize o
  ID. Nova consulta ou versão pode criar nova fonte preservando a anterior.

Uma fonte consultada depois da revisão da entidade não pode sustentá-la sem nova
revisão real. A rotina não abre links, não baixa documentos e não prova que uma
fonte sustenta a redação: essa conferência permanece humana.

## Eventos e linha do tempo

Cada evento contém os campos comuns mais:

| Campo | Significado |
| --- | --- |
| `atoId` | Identidade estável do ato, compartilhável entre participantes e imputações |
| `casoId`, `processoId`, `participacaoId` | Referências pertencentes ao mesmo caso |
| `imputacaoId` | ID pertencente à participação, ou `null` para ato sem imputação individualizada |
| `tipo` | Natureza do acontecimento, conforme lista abaixo |
| `data`, `ordemNoDia` | Data real e inteiro positivo para ordenar eventos da mesma participação no dia |
| `descricao`, `limites` | Resumo atribuído e limitações explícitas |
| `fontesIds` | Ao menos uma fonte oficial consultada após ou no dia do ato |
| `defesa` | `{situacao, descricao, fontesIds}` |
| `recurso` | `{situacao, descricao, fontesIds}` conhecido no contexto do evento |
| `transitoEmJulgado` | `{situacao, data, fontesIds}` |
| `relacao` | `null` ou `{tipo, eventoId, justificativa}` |
| `verificacaoAtualizacao` | Booleano `true`, declaração de conferência humana |

Tipos admitidos: `pedido_apuracao`, `abertura_investigacao`, `denuncia_oferecida`,
`denuncia_recebida`, `denuncia_rejeitada`, `acao_em_andamento`, `condenacao`,
`absolvicao`, `arquivamento`, `extincao_sem_merito`, `decisao_outro`,
`recurso_interposto`, `julgamento_recurso`, `transito_em_julgado`, `retificacao`.

O mesmo ato pode gerar absolvição de uma imputação e condenação por outra, ou
resultados distintos para participantes diferentes. A combinação ato,
participação, imputação e tipo não pode ser duplicada com outro ID ou outra
notícia. Reconhecer que documentos diferentes tratam do mesmo ato ainda depende
revisão humana: mudar artificialmente `atoId` não torna o caso independente.

`ordemNoDia` não é horário comprovado. Serve à exposição determinística, com
valores estáveis, preferencialmente espaçados para futuras inserções. Relações de
precedência precisam de sustentação documental, mesmo quando o validador aceita
sua ordem. A função `timelineV2` ordena por data e ordem, devolve cópia dos eventos
e não calcula culpa, ranking ou um resultado único pela última notícia.

### Defesa, recursos e trânsito

Defesa admite `registrada`, `nao_localizada` ou `nao_aplicavel`. A descrição é
sempre obrigatória; defesa registrada exige fonte. Não localizada deve explicitar
onde a pesquisa encontrou limites, sem inventar tentativa de contato.

Recurso admite `nao_verificado`, `pendente`, `nao_interposto`, `julgado` ou
`nao_aplicavel`. Pendente, julgado ou não interposto exigem comprovação oficial.
Ausência de informação deve ser `nao_verificado`, nunca inferência de que não houve
recurso. Um evento novo preserva o que se sabia e atualiza o histórico.

Trânsito em julgado não verificado usa data `null` e lista de fontes vazia.
Confirmado exige data entre o ato e a revisão, fonte oficial consultada após ou
no dia do trânsito e estado de recurso compatível. Um evento do tipo
`transito_em_julgado` não pode ter situação desconhecida. A decisão de uma pessoa
ou imputação não confirma trânsito para todas as demais.

### Relações, reformas e retificações

- `recurso_de`: interposição que referencia decisão anterior.
- `reforma_de`: nova decisão que referencia a decisão reformada.
- `retifica`: evento próprio de retificação, com justificativa e fonte.
- `desdobramento_de`: outra relação documental explicitada.

Referências devem apontar para evento anterior da mesma participação, caso e
imputação. Relações no mesmo dia exigem ordem crescente. Retificação e interposição
não são aceitas sem relação correspondente. Não se podem formar ciclos temporais
nem atribuir reforma ou recurso a outro participante.

## Preservação entre snapshots aprovados

`validateTransicaoV2(anterior, proposto, opções)` verifica os dois pacotes e impede:

- Exclusão ou alteração de eventos e fontes publicados, inclusive defesa, recursos,
  ressalvas e proveniência. Correções são novos eventos referenciados.
- Exclusão de IDs publicados, troca de pessoa/caso de uma participação ou troca
  da identidade e dos dados eleitorais de uma candidatura.
- Troca de caso, órgão, classe, instância ou número conhecido de um processo.
- Remoção da proveniência de processos, participações ou candidaturas, ou
  reescrita/remoção de uma imputação já publicada.

É possível acrescentar eventos, fontes e imputações; esclarecer número antes
indisponível; atualizar descrições/revisões de entidades com nova conferência;
preservar os respectivos vínculos estáveis. Novo snapshot não pode anteceder o
anterior. Alterações materiais precisam de fonte e justificativa editorial,
mesmo quando a estrutura permite uma atualização.

**Validar somente o pacote novo não detecta exclusão do histórico.** A futura
integração de publicação deve comparar com o snapshot aprovado de origem confiável.
Este PR disponibiliza a função e o CLI de comparação; não implementa um exportador
nem afirma que a publicação v1 já dispõe dessas proteções de histórico.

## Comandos e CI

Na raiz do repositório:

```sh
npm run validate:exemplo-v2
npm test
```

Validação estrutural de um pacote real já aprovado em ambiente editorial privado:

```sh
npm run validate:casos-v2 -- --arquivo /caminho/privado/pacote-aprovado.json
npm run validate:casos-v2 -- --arquivo /caminho/privado/proposto.json --anterior /caminho/privado/snapshot-aprovado.json
```

Para comparar apenas exemplos, acrescente `--exemplo` e mantenha ambos com
`finalidade: "exemplo_ficticio"`. O modo público rejeita o exemplo por finalidade,
e o modo de exemplo rejeita um pacote marcado como publicação. Não mudar a marca
para contornar isso. Candidaturas fictícias não correspondem aos cadastros reais.

O CLI exige arquivo explícito, retorna erro não zero em falhas, rejeita flags
desconhecidas e não escreve arquivos. Não filtra registros pendentes nem altera
flags de revisão para fazer um pacote passar. CI e deploy conferem o exemplo, executam os testes e validam o piloto real com
`npm run validate:piloto-v2`, comparando o v2 anterior quando disponível. Nada em
`docs/exemplos` é copiado para o site pelo build atual.

## Migração dos registros existentes: próxima entrega

A [conferência de correspondências v1/v2](migracao-v1-v2.md) verifica um manifesto
explicitamente revisado, com preservação do registro original e dos vínculos.
Ela não converte ou publica os dados e não substitui as etapas abaixo.

1. Revalidar cada registro real em fontes oficiais, com data da consulta efetiva,
   recursos, resultados favoráveis e defesa. Não copiar `dataRevisao` como se fosse
   data de consulta de uma fonte que não foi registrada.
2. Confirmar a identidade e manter vínculos entre eleições pendentes até evidência
   suficiente; preservar os IDs v1 e uma tabela de correspondência rastreável.
3. Identificar casos, processos, atos, participantes e imputações; separar os
   resultados sem multiplicar notícias do mesmo episódio.
4. Registrar informações desconhecidas explicitamente. Adiar a migração se faltam
   data precisa do ato, consulta, identificação ou aprovação suficiente.
5. Validar pacote e comparação com baseline confiável, revisar divergências e só
   então integrar uma exportação e a interface de linha do tempo em PR separado.

O CLI inicialmente cruza as bases eleitorais vigentes de 2022/2026. Se uma
retotalização retirar uma candidatura, uma migração histórica precisará fornecer
à API do validador o cadastro histórico oficial correspondente, preservado e
revisado. Não apagar histórico jurídico só porque a candidatura saiu da lista atual.

Não há banco editorial privado. O piloto v2 é publicado como JSON após validação,
com consumo na linha do tempo das fichas mapeadas. Caso seja preciso
corrigir identidade, retirar material ou cumprir restrição de
acesso, o fluxo de correção precisa ser desenvolvido e revisado antes de usar
este contrato em produção; o validador não resolve essas decisões jurídicas.
