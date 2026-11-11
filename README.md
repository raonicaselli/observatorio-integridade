# Observatório de Integridade Política

Protótipo de plataforma pública para consultar dados eleitorais com metodologia transparente, documentação das fontes e possibilidade de solicitar correções.

**Estado do projeto:** consulta eleitoral e documental, com cobertura jurídica parcial e revisão editorial. Não há rankings de integridade nem presunção de culpa.

**Site:** https://raonicaselli.github.io/observatorio-integridade/

## O que já funciona

- 234 candidaturas eleitas para cargos titulares pelo **PL nas eleições gerais de 2022**, reconciliadas entre candidaturas e resumos de votação.
- Resultados de 2026 consultados em 11/11/2026: 358 candidaturas titulares do PL, com conferência dos dois turnos. Nenhum novo titular do recorte foi eleito no segundo turno; os registros exportados foram eleitos no primeiro. [Método e auditoria](docs/atualizacao-eleitoral-2026.md).
- Pesquisa por nome, nome de urna ou identificador TSE.
- Filtros por UF e cargo, resultados paginados e ficha individual.
- Link compartilhável para cada candidatura: `?id=SQ_CANDIDATO`.
- Exportação eleitoral em CSV para 2022 e JSON para 2026.
- 13 ocorrências jurídicas publicadas, com validação editorial automatizada, fontes e ressalvas. Isso não significa pesquisa completa nem atualização dos autos nesta entrega eleitoral.
- Separação entre **apuração jornalística**, **pedido de apuração**, **investigação oficial** e **processo/decisão**, com critérios distintos para fontes e contraditório.
- Controle auditável de cobertura dos 234 eleitos em `public/data/cobertura-pesquisa-2022.json`: triagem inicial não significa revisão concluída.
- Página de metodologia e [solicitação de correções](https://github.com/raonicaselli/observatorio-integridade/issues/new?template=correcao-de-dados.yml).

Os dados estão em `public/data/eleitos-2022.json`, `public/data/eleitos-2022.csv` e `public/data/eleitos-2026.json`. Os registros de 2026 usam votos nominais válidos do turno em que cada candidatura foi eleita; fontes e hashes estão nos metadados.

## Limitações

Esses registros são **candidaturas de uma eleição**, não pessoas únicas entre eleições. Recontagens, decisões posteriores e mudanças de filiação podem afetar a interpretação histórica. Ausência de informação jurídica publicada **não significa ausência de investigação nem ficha limpa**.

O projeto não é afiliado ao Tribunal Superior Eleitoral. A partir dos arquivos originais de candidaturas e votação do TSE enviados para esta pesquisa, os registros de 2022 foram conferidos pelo identificador `SQ_CANDIDATO` e pela situação de totalização.

## Executar localmente

Requer Node.js 22+ e Python 3.10+ (importação e testes):

```sh
npm install --package-lock=false
npm test
npm run validate:2026
npm run validate:data
npm run validate:ocorrencias
npm run validate:coverage
npm run dev
```

Para gerar o site estático:

```sh
npm run build
```

A saída fica em `dist/`. O deploy automático do GitHub Pages ocorre após alterações aprovadas na branch `main` por meio de `.github/workflows/deploy.yml`.

## Política editorial e evolução do módulo jurídico

O planejamento para ocorrências documentadas está em [docs/modelo-ocorrencias.md](docs/modelo-ocorrencias.md), e o [contrato de publicação](docs/contrato-ocorrencias-publicadas.md) descreve a estrutura da base pública e suas validações. Apenas registros aprovados são aceitos; revisão final permanece em ambiente privado. Nenhum rascunho que contenha acusações não verificadas deve ser enviado a este repositório público, inclusive em branches.

Toda nova publicação depende de identificação confirmada da pessoa, fonte verificável, contexto da filiação, estágio processual atualizado, informações sobre desfecho e revisão editorial humana.

## Como contribuir

Use o [formulário público de correção](https://github.com/raonicaselli/observatorio-integridade/issues/new?template=correcao-de-dados.yml) para reportar divergências, sempre com fontes públicas e sem dados pessoais sensíveis. Os pedidos não são publicados automaticamente na base de dados.

O projeto está em desenvolvimento; sugestões e problemas técnicos também podem ser discutidos nas issues.
