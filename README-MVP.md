# Observatório de Integridade Política — MVP eleitoral

Protótipo responsivo para consulta de resultados eleitorais, **sem alegações jurídicas publicadas**.

## Escopo atual

- 234 registros de candidatos titulares eleitos pelo **PL em 2022**.
- 26 unidades federativas com registros do PL.
- Cargos: deputados estaduais, federais e distritais, senadores e governadores.
- Dados extraídos de arquivos do TSE enviados para a pesquisa e conciliados por `SQ_CANDIDATO` com os resultados de votação.
- Busca textual, filtros por UF e cargo, fichas individuais e exportação CSV.
- Situação jurídica: **não pesquisada/publicada neste release**.

## Executar localmente

```bash
npm install
npm run dev
```

Para compilar: `npm run build`. Saída em `dist/`.

## Publicação

O Vite utiliza `base: './'` para funcionar em caminhos de subdiretório como GitHub Pages. A branch `feat/mvp-observatorio` é uma proposta de alteração, não uma publicação automática. Antes da publicação, revisar os textos, dados, privacidade do repositório e eventuais requisitos editoriais. O GitHub Pages para repositório privado pode depender do plano.

## Dados

- `public/data/eleitos-2022.json`
- `public/data/eleitos-2022.csv`

Fonte: `consulta_cand_2022.zip`, `votacao_PL_2022.csv` e `resumo_PL_2022.csv`, obtidos de dados eleitorais do Tribunal Superior Eleitoral.
O resumo de votação foi agregado por identificador de candidato e turno; as contagens foram confrontadas com a situação de totalização na base de candidaturas.
Retotalizações posteriores à extração não foram completamente auditadas; o projeto não é afiliado ao TSE.

### Auditoria mínima realizada

- 1.620 identificadores únicos de candidaturas PL em 2022.
- 1.499 identificadores presentes no resumo de votação.
- 234 eleitos titulares presentes nas duas bases.
- Zero divergências de situação de totalização para os 234.
- Vices e suplentes excluídos da listagem principal.

## Diretrizes editoriais para a futura camada jurídica

Nenhuma pessoa deve ser tratada como condenada por corrupção com base apenas em matéria jornalística ou investigação. Cada ocorrência deverá preservar fonte original, identificação inequívoca, contexto, data, tipo de procedimento, estágio, desfecho, eventuais recursos e histórico de correções. As datas de filiação e os períodos dos fatos deverão ser documentados separadamente.

## Próximos passos

1. Revisar UX e acessibilidade, testar compilação.
2. Completar reconciliação dos eleitos de outras eleições e resolver homônimos.
3. Criar módulo editorial de ocorrências com status 'em revisão' e trilha de fontes.
4. Publicar piloto após revisão humana e estabelecer canal de contestação/correção.
5. Expandir para outras legendas com os mesmos critérios.
