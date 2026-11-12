import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createTimelineIndex, loadCaseTimelines } from '../src/lib/case-timelines.mjs'

// The published pilot is only a structural integration fixture, not new legal research.
const read = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url)))
const fixture = () => ({ data: read('public/data/casos-v2.json'), manifest: read('public/data/migracao-v1-v2.json') })
const legacy = () => read('public/data/ocorrencias-publicadas.json')
const occurrenceId = 'stf-eduardo-ap2782-2026'

test('integra por IDs revisados sem duplicar registros nem alterar o pacote', () => {
 const bundle = fixture(), original = structuredClone(bundle)
 const index = createTimelineIndex(bundle, legacy())
 assert.equal(index.size, 1)
 assert.equal(index.get(occurrenceId).events.length, 2)
 assert.deepEqual(bundle, original)
 assert.equal(index.has('stf-eduardo-difamacao-tabata-2026'), false)
})
test('ordena eventos por data e preserva contexto anterior ao último ato', () => {
 const bundle = fixture(); bundle.data.eventos.reverse()
 const events = createTimelineIndex(bundle, legacy()).get(occurrenceId).events
 assert.deepEqual(events.map(row => row.data), ['2026-10-03', '2026-10-07'])
 assert.equal(events[0].transitoEmJulgado.situacao, 'confirmado')
 assert.equal(events[1].transitoEmJulgado.situacao, 'nao_verificado')
 assert.ok(events.every(row => row.defesa.descricao.includes('Defensoria Pública')))
})
test('rejeita troca de candidatura, ano, pessoa ou participação', () => {
 for (const mutate of [b => b.data.candidaturas[0].ano = 2026,
  b => b.data.candidaturas[0].tseId = 'outro-id', b => b.data.participacoes[0].pessoaId = 'outra-pessoa',
  b => b.data.eventos[0].participacaoId = 'outra-participacao']) {
  const bundle = fixture(); mutate(bundle)
  assert.throws(() => createTimelineIndex(bundle, legacy()))
 }
})
test('não aceita registros não aprovados ou conferências ausentes', () => {
 for (const mutate of [b => b.data.eventos[0].statusEditorial = 'revisao_final',
  b => b.manifest.revisao.liberacaoPublica = false,
  b => b.manifest.correspondencias[0].conferencias.identidade = false]) {
  const bundle = fixture(); mutate(bundle)
  assert.throws(() => createTimelineIndex(bundle, legacy()))
 }
})
test('registros antigos alterados exigem nova correspondência, não associação implícita', () => {
 const data = legacy()
 data.ocorrencias.find(row => row.id === occurrenceId).limites = 'Conteúdo diferente'
 assert.throws(() => createTimelineIndex(fixture(), data), /diferente do legado/)
})
test('ordem das chaves JSON não altera a identidade do registro legado', () => {
 const data = legacy()
 const row = data.ocorrencias.find(row => row.id === occurrenceId)
 data.ocorrencias[data.ocorrencias.indexOf(row)] = Object.fromEntries(Object.entries(row).reverse())
 assert.equal(createTimelineIndex(fixture(), data).size, 1)
})
test('fontes ausentes, links inseguros e dados incompletos falham antes de renderizar', () => {
 for (const mutate of [b => b.data.fontes[0].url = 'javascript:alert(1)',
  b => b.data.eventos[0].fontesIds = ['fonte-inexistente'],
  b => b.data.eventos[0].transitoEmJulgado.data = null,
  b => b.data.eventos[0].data = '2026-02-30',
  b => b.data.eventos[0].defesa.descricao = {},
  b => b.data.metadados.atualizadoEm = null,
  b => b.data.eventos[0].tipo = '__proto__',
  b => b.data.eventos[0].tipo = 'constructor',
  b => b.data.eventos[0].imputacaoId = 'imputacao-de-outra-pessoa',
  b => b.data.eventos[1].relacao.eventoId = b.data.eventos[1].id]) {
  const bundle = fixture(); mutate(bundle)
  assert.throws(() => createTimelineIndex(bundle, legacy()))
 }
})
test('mesmo caso não autoriza propagar evento de outro participante', () => {
 const bundle = fixture()
 bundle.data.eventos[0].participacaoId = 'outra-participacao'
 assert.throws(() => createTimelineIndex(bundle, legacy()), /outra participação/)
})
test('loader verifica digest e base URL do GitHub Pages', async () => {
 const bundle = fixture(), calls = []
 const bytes = readFileSync(new URL('../public/data/casos-v2.json', import.meta.url))
 const result = await loadCaseTimelines('/observatorio-integridade/', { fetcher: async url => {
  calls.push(url)
  return url.endsWith('casos-v2.json') ? new Response(bytes) : Response.json(bundle.manifest)
 } })
 assert.deepEqual(result, bundle)
 assert.deepEqual(calls, ['/observatorio-integridade/data/casos-v2.json', '/observatorio-integridade/data/migracao-v1-v2.json'])
})
test('loader rejeita 404, resposta inválida e pacote de versão diferente', async () => {
 const bundle = fixture()
 for (const fetcher of [async () => new Response('', { status: 404 }), async () => new Response('não é JSON'),
  async url => url.endsWith('casos-v2.json') ? Response.json(bundle.data) : Response.json(bundle.manifest)]) {
  await assert.rejects(loadCaseTimelines('/', { fetcher }))
 }
})
test('loader encaminha sinal de cancelamento às duas requisições', async () => {
 const controller = new AbortController(), signals = []
 const bundle = fixture(), bytes = readFileSync(new URL('../public/data/casos-v2.json', import.meta.url))
 await loadCaseTimelines('/', { signal: controller.signal, fetcher: async (url, options) => {
  signals.push(options.signal)
  return url.endsWith('casos-v2.json') ? new Response(bytes) : Response.json(bundle.manifest)
 } })
 assert.deepEqual(signals, [controller.signal, controller.signal])
})
