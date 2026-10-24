import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

// Exercise the real JSX component using the application's existing toolchain.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
after(() => server.close())
const { default: CasesExplorer } = await server.ssrLoadModule('/src/CasesExplorer.jsx')
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
