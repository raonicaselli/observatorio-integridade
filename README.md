# Observatório de Integridade Política

Protótipo de plataforma pública para consultar dados eleitorais com metodologia transparente, documentação das fontes e possibilidade de solicitar correções.

**Estado do projeto:** MVP eleitoral — nenhuma alegação jurídica ou classificação de integridade é publicada na versão atual.

**Site:** https://raonicaselli.github.io/observatorio-integridade/

## O que já funciona

- 234 candidaturas eleitas para cargos titulares pelo **PL nas eleições gerais de 2022**, reconciliadas entre candidaturas e resumos de votação.
- Pesquisa por nome, nome de urna ou identificador TSE.
- Filtros por UF e cargo, resultados paginados e ficha individual.
- Link compartilhável para cada candidatura: `?id=SQ_CANDIDATO`.
- Exportação de dados eleitorais em CSV.
- Estrutura da camada de ocorrências jurídicas, ainda vazia, com validação editorial automatizada e exibição contextual em fichas individuais.
- Página de metodologia e [solicitação de correções](https://github.com/raonicaselli/observatorio-integridade/issues/new?template=correcao-de-dados.yml).

Os dados podem ser consultados em `public/data/eleitos-2022.json` e `public/data/eleitos-2022.csv`.

## Limitações

Esses registros são **candidaturas de uma eleição**, não pessoas únicas entre eleições. Recontagens, decisões posteriores e mudanças de filiação podem afetar a interpretação histórica. Ausência de informação jurídica publicada **não significa ausência de investigação nem ficha limpa**.

O projeto não é afiliado ao Tribunal Superior Eleitoral. A partir dos arquivos originais de candidaturas e votação do TSE enviados para esta pesquisa, os registros de 2022 foram conferidos pelo identificador `SQ_CANDIDATO` e pela situação de totalização.

## Executar localmente

Requer Node.js 22 ou mais recente:

```sh
npm install
npm run validate:data
npm run validate:ocorrencias
npm run dev
```

Para gerar o site estático:

```sh
npm run build
```

A saída fica em `dist/`. O deploy automático do GitHub Pages ocorre após alterações aprovadas na branch `main` por meio de `.github/workflows/deploy.yml`.

## Política editorial: futuro módulo jurídico

O planejamento para ocorrências documentadas está em [docs/modelo-ocorrencias.md](docs/modelo-ocorrencias.md), e o [contrato de publicação](docs/contrato-ocorrencias-publicadas.md) descreve a estrutura da base pública vazia e suas validações. Nenhum rascunho que contenha acusações não verificadas deve ser enviado a este repositório público, inclusive em branches.

Uma publicação futura dependerá de identificação confirmada da pessoa, fonte verificável, contexto da filiação, estágio processual atualizado, informações sobre desfecho e revisão editorial humana.

## Como contribuir

Use o [formulário público de correção](https://github.com/raonicaselli/observatorio-integridade/issues/new?template=correcao-de-dados.yml) para reportar divergências, sempre com fontes públicas e sem dados pessoais sensíveis. Os pedidos não são publicados automaticamente na base de dados.

O projeto está em desenvolvimento; sugestões e problemas técnicos também podem ser discutidos nas issues.
