# Preparação e conferência de migração v1 → v2

Esta entrega adiciona uma conferência de correspondências. Não converte registros,
atribui revisores, publica pacotes ou altera a aplicação. O modelo v2 continua
separado da base pública v1. O exemplo é inteiramente fictício.

## Preparar um lote em ambiente privado

1. Preserve os bytes do snapshot v1 aprovado e seu SHA-256. Escolha casos
   completos: uma seleção deve incluir todas as ocorrências daquele `idCaso`,
   inclusive outros participantes e decisões favoráveis. Outros casos podem
   permanecer em v1.
2. Revise as fontes, identidade, datas, defesa, recursos e desfechos de cada
   participante. Conserve a data real da consulta de cada versão do documento:
   uma resposta vazia não renova a consulta de uma cópia anteriormente preservada.
3. Prepare privadamente o pacote v2 e a tabela de correspondência. Preserve o
   registro v1 integral, inclusive resumo, defesa, limites, fontes e revisão.
   A data de uma certidão, publicação ou decisão não substitui a data de outro ato.
4. Submeta o lote e a correspondência à revisão humana. Rascunhos não aprovados
   permanecem fora de branches, PRs e outros locais públicos. Não gere aprovação
   ou modifique campos de revisão para fazer a validação passar.
5. Depois da aprovação, execute os validadores com os arquivos aprovados. Uma
   futura integração de publicação deverá preservar a baseline confiável e
   validar transições v2; este comando não implementa essa integração.

## Manifesto fechado, versão 1

O [manifesto fictício](exemplos/migracao-v1-v2-ficticia/manifesto.json) aponta para
uma [origem fictícia](exemplos/migracao-v1-v2-ficticia/origem-v1.json) e para o
[pacote v2 fictício existente](exemplos/casos-v2-ficticios.json). Contém:

- `versao: 1` e `finalidade`: `publicacao` ou `exemplo_ficticio`, sem promoção entre modos.
- `origemSha256` e `destinoSha256`: hashes dos bytes completos dos dois arquivos.
  Mudanças de conteúdo ou formatação exigem nova conferência do par de snapshots.
- `data`: mesma data da atualização do pacote v2, não futura nem anterior à
  revisão de qualquer ocorrência migrada.
- `revisao`: responsável, data, justificativa e liberação pública explícita da
  migração. São declarações editoriais, não comprovação automática de autoria.
- `correspondencias`: uma entrada por ocorrência selecionada, com `ocorrenciaId`,
  `candidaturaId` v2, `participacaoId`, `eventosIds`, `registroOriginal` e
  `conferencias`.

`registroOriginal` deve ser uma cópia integral, sem alteração, da ocorrência v1
identificada. Esse arquivo preserva a redação histórica para revisão e futura
exposição do legado; não insira pesquisa nova nesse campo.

`conferencias` exige declarações positivas para `identidade`, `textosELimites`,
`resultadosEDefesa`, `recursosETransito` e `fontesEDatas`. O revisor deve conferir
se a apresentação v2 conserva o sentido da informação antiga. Preservar o texto
original no manifesto **não comprova equivalência semântica** do resumo novo.

## O que a rotina verifica

O pacote v2 precisa passar no contrato existente, inclusive aprovação, fontes,
participações, resultados e referências. O manifesto exige os hashes corretos,
aprovação declarada, estrutura fechada e correspondências explícitas.

A origem selecionada deve ter aprovação editorial completa. Apuração exclusivamente
jornalística não é convertida em ato oficial; permanece em v1.

A migração inicial aceita somente a origem v1 de candidaturas de 2022 e preserva
seu `SQ_CANDIDATO`. Não conecta 2026 por nome ou por sugestões de identidade.
Cada participação deve pertencer à pessoa da candidatura; cada evento mapeado
precisa pertencer àquela participação. Casos distintos não podem ser fundidos,
e um caso não pode ser dividido em vários IDs de destino por esta rotina.

O lote deve contemplar todas as ocorrências dos casos selecionados. Nenhum evento,
candidatura ou participação do pacote pode ficar sem correspondência v1. Eventos
não podem ser mapeados duas vezes. Se a origem tiver duplicações que precisem
convergir para um mesmo evento, interrompa o lote e revise explicitamente a
modelagem; não crie atos artificiais para satisfazer essa regra conservadora.

As URLs originais devem continuar referenciadas no contexto da pessoa: identidade,
candidatura, participação, eventos, defesa, recursos, trânsito ou processos dos
eventos mapeados. Uma URL citada apenas para outra pessoa não basta. A conferência
não abre links nem certifica o conteúdo, a data ou a autenticidade de uma fonte.

## Executar sem escrever arquivos

Exemplo fictício, validado também pelos testes automatizados:

```sh
node scripts/validate-migration-v1-v2.mjs \
  --origem docs/exemplos/migracao-v1-v2-ficticia/origem-v1.json \
  --destino docs/exemplos/casos-v2-ficticios.json \
  --manifesto docs/exemplos/migracao-v1-v2-ficticia/manifesto.json \
  --exemplo
```

Lote real já aprovado, ainda em ambiente editorial privado:

```sh
node scripts/validate-migration-v1-v2.mjs \
  --origem /caminho/privado/snapshot-v1-aprovado.json \
  --destino /caminho/privado/pacote-v2-aprovado.json \
  --manifesto /caminho/privado/manifesto-aprovado.json
```

O modo público cruza candidaturas com os catálogos eleitorais do repositório.
Um snapshot histórico que precise de catálogo arquivado exige configuração
revisada da API, como no contrato v2. O CLI exige arquivos explícitos e não baixa,
não exporta, não filtra e não corrige registros. Falhas retornam código não zero.
Não execute com rascunhos em CI público: mensagens de erro podem incluir trechos
dos objetos comparados.

## Próxima entrega de dados

O primeiro PR com dados reais depende de lote documental revisado e aprovação
humana da correspondência. Deverá manter a base v1 durante a transição e incluir
justificativa de cada adaptação, snapshot de origem e uma estratégia revisada de
publicação. A interface de linha do tempo vem depois dessa entrega. Este
validador não migra pessoas, não transfere histórico entre eleições e não torna
uma pesquisa concluída.
