# Atualização dos resultados eleitorais de 2026

## Recorte e significado

A base registra candidaturas titulares eleitas pelo PL em 2026, considerando os
resultados disponíveis dos dois turnos. Vice-presidentes, vice-governadores e
suplentes permanecem fora do recorte. O partido considerado é o da candidatura,
não o da coligação, do titular da chapa ou de uma filiação posterior.

Eleição encerrada não significa resultado imutável: retotalizações e decisões
posteriores podem afetar os registros. A data da consulta e os hashes identificam
o estado efetivamente importado; não constituem certificação de diplomação.

## Método

1. Baixar os ZIPs oficiais de candidaturas e votação por município/zona do TSE.
2. Validar os ZIPs e registrar SHA-256, sem desativar TLS ou verificações do arquivo.
3. Usar o CSV `BRASIL` quando disponível. Caso contrário, exigir o conjunto
   completo de arquivos das 27 UFs e da abrangência `BR`. Nunca somar os arquivos
   regionais ao nacional: eles representam abrangências sobrepostas.
4. Considerar apenas eleição ordinária de 2026. Confirmar a presença dos dois
   turnos e de todas as UFs no arquivo de votação.
5. Para cada candidatura titular do PL, escolher o último turno disponível no
   cadastro. Conferir a situação desse turno na votação; somente situações de
   eleito entram na base. Uma derrota no segundo turno não pode ser substituída
   pelo resultado do primeiro. Conferir também participantes PL do segundo turno
   que não foram eleitos, sem exportá-los como eleitos.
6. Somar `QT_VOTOS_NOMINAIS_VALIDOS` por município/zona apenas do turno de eleição.
   Não usar `QT_VOTOS_NOMINAIS` como substituto, não somar turnos e rejeitar linhas
   duplicadas. `ST_VOTO_EM_TRANSITO` e destinação diferenciam linhas legítimas.
7. Publicar um registro por `SQ_CANDIDATO`, com `turno` individual. Os metadados
   usam `turnos: [1, 2]` para a cobertura da pesquisa; isso não implica haver
   titulares eleitos do PL em ambos os turnos.
8. Validar metadados, identidade eleitoral, cargos, situações, totais e fontes.
   Não impor como verdade os totais históricos de 358 registros ou 121 federais.
9. Gerar comparação com a versão anterior e sugestões de vínculos entre eleições.
   Estas continuam pendentes de revisão humana, sem transferir ocorrências.
10. Revisar o PR e seu relatório antes do merge. A importação não muda a base jurídica.

## Reprodução local

Requer Python 3.10+ e Node 22+. Na raiz do repositório:

```sh
npm run import:2026
npm run validate:2026
node scripts/reconcile-elections.mjs
npm test
npm run validate:data
npm run validate:ocorrencias
npm run validate:coverage
npm run build
```

O comando de importação usa exclusivamente arquivos oficiais. O antigo script
Node é apenas um encaminhamento para o importador Python; CSV de fonte agregadora
não pode mais sobrescrever a base consolidada. A opção antiga `--file` não é aceita.

Para reusar downloads sem alterá-los:

```sh
npm run import:2026 -- --cand-zip /caminho/consulta_cand_2026.zip --votes-zip /caminho/votacao_candidato_munzona_2026.zip --output /tmp/eleitos-2026-proposta.json
node scripts/compare-elections-2026.mjs public/data/eleitos-2026.json /tmp/eleitos-2026-proposta.json /tmp/comparacao-2026.json
```

O arquivo grande de votação exige espaço em disco, mas o CSV é lido em streaming
sem extração integral. Na consulta de 11/11/2026, os ZIPs somavam aproximadamente
469 MB. Uma única abrangência da votação tinha aproximadamente 3,2 GB descomprimidos.
A saída só substitui o destino depois da leitura e das verificações completas.

## Resultado da consulta de 11/11/2026

- 358 candidaturas titulares mantidas; nenhuma inclusão ou exclusão.
- 121 federais, 207 estaduais, 19 senadores, 5 distritais e 6 governadores.
- Nenhum novo titular PL eleito no segundo turno no recorte: os 358 registros
  exportados têm `turno: 1`, embora as fontes dos dois turnos tenham sido conferidas.
- Correção de `votosValidos` nos 358 registros. Os valores anteriores eram
  exatamente o dobro dos calculados pela leitura nacional única dos votos válidos.
  O importador anterior somava o CSV nacional e os regionais do mesmo ZIP.
- O relatório JSON em `docs/auditorias/atualizacao-2026-11-11.json` preserva os
  metadados e hashes anteriores e novos, além dos valores antes/depois por ID.
- Nenhuma alteração nas ocorrências jurídicas nem confirmação automática de pessoas.

## Atualizações futuras pelo GitHub

O workflow manual **Propor atualização dos resultados PL 2026** importa, testa,
valida e compila antes de enviar uma branch `data/resultados-2026-*` e propor um PR.
Ele não escreve diretamente na `main`, não faz merge e guarda os dados e o
relatório como artefatos. Exige acesso HTTPS a `cdn.tse.jus.br` e npm.

A criação automática do PR exige que o repositório permita que GitHub Actions
crie pull requests. Se essa permissão estiver desativada, a branch já enviada e
os artefatos continuam disponíveis para abertura manual. Não é necessário enviar
um token pessoal ao projeto. Eventos criados com `GITHUB_TOKEN` podem não disparar
novos workflows: confira a execução que gerou a proposta e quaisquer verificações
obrigatórias antes do merge; não dispense proteções de branch para contornar isso.

A revisão humana deve investigar inclusões, exclusões ou alterações inesperadas.
Mudanças de quantidade não são, por si só, erro nem autorização para publicação.
