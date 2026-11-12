import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

// Exercise the real JSX component using the application's existing toolchain.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
after(() => server.close())
const { default: CasesExplorer } = await server.ssrLoadModule('/src/CasesExplorer.jsx')
const { default: ElectionScopeNotice } = await server.ssrLoadModule('/src/ElectionScopeNotice.jsx')
const { default: OccurrencesPanel } = await server.ssrLoadModule('/src/OccurrencesPanel.jsx')
const render = props => renderToStaticMarkup(React.createElement(CasesExplorer, {
 records: [], onOpen() {}, ...props
}))

test('consulta pendente não afirma ausência nem apresenta contagens zero', () => {
 const html = render({ data: null })
 assert.match(html, /role="status"/)
 assert.match(html, /Carregando ocorrências/)
 assert.doesNotMatch(html, /Nenhum registro|Registros publicados|registros correspondentes/)
})

test('falha de consulta anuncia indisponibilidade em vez de ausência', () => {
 const html = render({ data: null, indisponivel: true })
 assert.match(html, /role="alert"/)
 assert.match(html, /temporariamente indisponível/)
 assert.doesNotMatch(html, /Carregando|Nenhum registro|Registros publicados|registros correspondentes/)
})

test('erro tem prioridade sobre dados anteriormente carregados', () => {
 const html = render({ data: { ocorrencias: [] }, indisponivel: true })
 assert.match(html, /temporariamente indisponível/)
 assert.doesNotMatch(html, /Nenhum registro|Registros publicados/)
})

test('base vazia carregada mantém ressalva sobre ausência de ocorrências', () => {
 const html = render({ data: { ocorrencias: [] } })
 assert.match(html, /Nenhum registro correspondente na base publicada/)
 assert.match(html, /Isso não comprova ausência de ocorrências/)
 assert.doesNotMatch(html, /role="alert"|Carregando ocorrências/)
})

test('lista carregada mostra apenas registros publicados', () => {
 const common = { tipoRegistro: 'processo_ou_decisao', dataMarco: '2026-10-22',
 candidaturaId: 'ficticio', idCaso: 'caso-ficticio', resumo: 'Exemplo fictício',
 descricaoSituacao: 'Situação fictícia', limites: 'Sem dados reais' }
 const html = render({ data: { ocorrencias: [
  { ...common, id: 'publico', statusEditorial: 'publicado', titulo: 'Exemplo aprovado' },
  { ...common, id: 'pendente', statusEditorial: 'revisao_final', titulo: 'Exemplo pendente' }
 ] } })
 assert.match(html, /Exemplo aprovado/)
 assert.doesNotMatch(html, /Exemplo pendente|Nenhum registro correspondente|Carregando ocorrências/)
})


test('aviso distingue abrangência dos dois turnos de eleitos no segundo turno', () => {
 const html = renderToStaticMarkup(React.createElement(ElectionScopeNotice, {
  metadata: { turnos: [1, 2], atualizadoEm: '2026-11-11', distribuicaoPorTurno: { 1: 358 } }
 }))
 assert.match(html, /2026-11-11/)
 assert.match(html, /Cobertura dos dois turnos/)
 assert.match(html, /0.*titulares deste recorte eleitos/)
 assert.match(html, /Vices e suplentes não estão incluídos/)
 assert.match(html, /retotalizações/)
})

test('aviso não declara segundo turno para base antiga', () => {
 assert.equal(renderToStaticMarkup(React.createElement(ElectionScopeNotice, {
  metadata: { turno: 1 }
 })), '')
})


const documented = {
 id: 'ocorrencia-ficticia', idCaso: 'caso-ficticio', candidaturaId: 'candidatura-ficticia',
 statusEditorial: 'publicado', tipoRegistro: 'processo_ou_decisao', categoria: 'penal',
 dataMarco: '2026-11-01', titulo: 'Decisão inteiramente fictícia', resumo: 'Exemplo sintético',
 descricaoSituacao: 'Absolvição fictícia', limites: 'Sem valor documental real',
 posicionamentoEnvolvido: 'Defesa fictícia preservada', periodoFatos: 'Não informado',
 partidoNosFatos: 'Não informado', dataRevisao: '2026-11-11', orgao: 'Tribunal fictício',
 processoNumero: 'AP 9876 — número único 1234567-89.2026.1.00.0000',
 fontes: [{ instituicao: 'Fonte fictícia', titulo: 'Documento fictício', url: 'https://example.org/fonte-ficticia' }]
}

test('lista apresenta número de processo original e contagens de casos e candidaturas', () => {
 const html = render({ data: { ocorrencias: [documented] } })
 assert.match(html, /Processo:<\/strong> AP 9876 — número único 1234567-89.2026.1.00.0000/)
 assert.match(html, /Casos documentados/)
 assert.match(html, /Candidaturas com registros/)
 assert.doesNotMatch(html, /Episódios independentes|Políticos com registros/)
})

test('ficha mostra processo sem perder defesa, resultado favorável, ressalvas e fonte', () => {
 const html = renderToStaticMarkup(React.createElement(OccurrencesPanel, {
  candidaturaId: documented.candidaturaId, dados: { ocorrencias: [documented] }
 }))
 assert.match(html, /Processo:<\/strong> AP 9876 — número único 1234567-89.2026.1.00.0000/)
 assert.match(html, /Absolvição fictícia/)
 assert.match(html, /Defesa fictícia preservada/)
 assert.match(html, /Sem valor documental real/)
 assert.match(html, /href="https:\/\/example.org\/fonte-ficticia"/)
})

test('número ausente não inventa processo nem oculta ocorrência', () => {
 const row = { ...documented, processoNumero: null }
 const list = render({ data: { ocorrencias: [row] } })
 const profile = renderToStaticMarkup(React.createElement(OccurrencesPanel, {
  candidaturaId: row.candidaturaId, dados: { ocorrencias: [row] }
 }))
 for (const html of [list, profile]) {
  assert.doesNotMatch(html, /Processo:<\/strong>|undefined|null/)
  assert.match(html, /Decisão inteiramente fictícia/)
 }
})
