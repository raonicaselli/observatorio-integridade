import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { createTimelineIndex } from '../src/lib/case-timelines.mjs'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
after(() => server.close())
const { default: Panel } = await server.ssrLoadModule('/src/OccurrencesPanel.jsx')
const read = name => JSON.parse(readFileSync(new URL('../' + name, import.meta.url)))
const legacy = read('public/data/ocorrencias-publicadas.json')
const index = createTimelineIndex({ data: read('public/data/casos-v2.json'), manifest: read('public/data/migracao-v1-v2.json') }, legacy)
const render = (timelines, candidaturaId = '250001611374', extra = {}) => renderToStaticMarkup(React.createElement(Panel, {
 candidaturaId, dados: legacy, timelines, ...extra
}))

test('ficha mostra piloto no artigo existente sem duplicar a ocorrência ou perder legado', () => {
 const html = render({ status: 'ready', index })
 assert.equal((html.match(/class="occ-item"/g) || []).length, 2, 'Duas ocorrências v1 de Eduardo; nenhum artigo extra do v2')
 assert.equal((html.match(/aria-label="Linha do tempo documentada"/g) || []).length, 1)
 assert.match(html, /dateTime="2026-10-03"/)
 assert.match(html, /dateTime="2026-10-07"/)
 assert.match(html, /confirmado em 03\/10\/2026/)
 assert.match(html, /não verificado.*não substitui/)
 assert.match(html, /Defensoria Pública da União/)
 assert.match(html, /Consulta: 11\/11\/2026/)
 assert.match(html, /Páginas|Página/)
 assert.match(html, /href="https:\/\/portal.stf.jus.br\/processos\/downloadPeca/)
})
test('erro ou carregamento não escondem o registro original nem afirmam ausência', () => {
 for (const status of ['error', 'loading']) {
  const html = render({ status })
  assert.match(html, /role="alert"|role="status"/)
  assert.match(html, /registro documental permanece disponível/)
  assert.match(html, /Posicionamento do envolvido/)
  assert.equal((html.match(/class="occ-item"/g) || []).length, 2)
  assert.doesNotMatch(html, /aria-label="Linha do tempo documentada"|Nenhuma ocorrência jurídica/)
 }
})
test('perfis não mapeados continuam com seus registros v1', () => {
 const other = legacy.ocorrencias.find(row => row.candidaturaId !== '250001611374')
 const html = render({ status: 'ready', index }, other.candidaturaId)
 assert.ok(html.includes(other.titulo))
 assert.doesNotMatch(html, /aria-label="Linha do tempo documentada"|evento-ap2782/)
})
test('indisponibilidade da base original não se transforma em ausência de processos', () => {
 const html = render({ status: 'ready', index }, '250001611374', { dados: null, indisponivel: true })
 assert.match(html, /consulta das ocorrências está temporariamente indisponível/)
 assert.doesNotMatch(html, /aria-label="Linha do tempo documentada"|Nenhuma ocorrência jurídica/)
})
test('linha do tempo fictícia mantém absolvição, condenação e resultados de cada participante', async () => {
 const { default: Timeline } = await server.ssrLoadModule('/src/CaseTimeline.jsx')
 const data = read('docs/exemplos/casos-v2-ficticios.json')
 const fictionalLegacy = read('docs/exemplos/migracao-v1-v2-ficticia/origem-v1.json')
 const fictionalManifest = read('docs/exemplos/migracao-v1-v2-ficticia/manifesto.json')
 // Synthetic data adapted in memory only to exercise the public rendering boundary.
 data.metadados.finalidade = 'publicacao'
 fictionalManifest.finalidade = 'publicacao'
 const timeline = createTimelineIndex({ data, manifest: fictionalManifest }, fictionalLegacy).get('ocorrencia-ficticia-ana')
 const html = renderToStaticMarkup(React.createElement(Timeline, { timeline }))
 assert.match(html, /Condenação/)
 assert.match(html, /Absolvição/)
 assert.match(html, /Retificação/)
 assert.match(html, /Imputação alfa/)
 assert.match(html, /Imputação beta/)
 assert.match(html, /Reforma do ato de/)
 assert.match(html, /Abrangência e limites do histórico/)
 assert.doesNotMatch(html, /Arquivamento/)
})


test('tipo inesperado não resolve propriedade herdada como elemento React', async () => {
 const { default: Timeline } = await server.ssrLoadModule('/src/CaseTimeline.jsx')
 const timeline = structuredClone(index.get('stf-eduardo-ap2782-2026'))
 timeline.events[0].tipo = '__proto__'
 const html = renderToStaticMarkup(React.createElement(Timeline, { timeline }))
 assert.match(html, /Ato documentado/)
})
