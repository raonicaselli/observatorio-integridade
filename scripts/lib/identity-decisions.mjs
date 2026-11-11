import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import { assertIsoDate } from './iso-date.mjs'

function keys(value, expected) {
 assert.ok(value && typeof value === 'object' && !Array.isArray(value), 'Objeto obrigatório')
 assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), 'Campos desconhecidos ou ausentes')
}
function text(value, label) {
 assert.ok(typeof value === 'string' && value.trim().length > 0, `${label}: texto obrigatório`)
}
const pairKey = row => JSON.stringify([row.candidaturaId2022, row.candidaturaId2026])

/** Structural checks cannot establish who reviewed the evidence or its factual truth. */
export function validateIdentityDecisions(data, { evidence, evidenceSha256, today }, previous) {
 keys(data, ['versao', 'decisoes'])
 assert.equal(data.versao, 1, 'Versão inválida')
 assert.ok(Array.isArray(data.decisoes), 'Lista de decisões obrigatória')
 assertIsoDate(today, 'Data de referência')
 assert.ok(/^[a-f0-9]{64}$/.test(evidenceSha256), 'Hash de evidências inválido')
 const pairs = new Map(evidence.pares.map(row => [pairKey(row), row]))
 const sources = evidence.metadados.fontesOficiais.map(source => source.url)
 const ids = new Set()
 const latest = new Map()
 for (const row of data.decisoes) {
  keys(row, ['id', 'candidaturaId2022', 'candidaturaId2026', 'estado', 'data', 'revisor',
   'metodo', 'justificativa', 'fontes', 'evidenciaSha256', 'substitui'])
  assert.ok(typeof row.id === 'string' && /^[a-z0-9][a-z0-9-]{2,79}$/.test(row.id), 'ID de decisão inválido')
  assert.ok(!ids.has(row.id), 'ID de decisão repetido')
  ids.add(row.id)
  const key = pairKey(row)
  const pair = pairs.get(key)
  assert.ok(pair, 'Par ausente das evidências')
  assert.equal(row.evidenciaSha256, evidenceSha256, 'Evidência alterada ou desconhecida')
  assert.ok(['confirmado', 'divergente', 'inconclusivo'].includes(row.estado), 'Estado inválido')
  assertIsoDate(row.data, 'Data da decisão')
  assert.ok(row.data >= evidence.metadados.dataConferencia && row.data <= today, 'Data fora do intervalo da revisão')
  for (const field of ['revisor', 'metodo', 'justificativa']) text(row[field], field)
  assert.ok(Array.isArray(row.fontes) && row.fontes.length > 0, 'Fontes obrigatórias')
  assert.equal(new Set(row.fontes).size, row.fontes.length, 'Fonte repetida')
  assert.ok(row.fontes.every(url => sources.includes(url)), 'Fonte fora do snapshot oficial')
  if (row.estado === 'confirmado') {
   assert.equal(pair.resultadoConferencia, 'coincidencia_documental', 'Confirmação exige coincidência documental')
   assert.equal(pair.qualidadeFonte2022, 'apto_para_comparacao', 'Fonte 2022 insuficiente')
   assert.equal(pair.qualidadeFonte2026, 'apto_para_comparacao', 'Fonte 2026 insuficiente')
   assert.ok(sources.every(url => row.fontes.includes(url)), 'Confirmação exige fontes dos dois anos')
  }
  const last = latest.get(key)
  assert.equal(row.substitui, last?.id ?? null, 'Correção deve substituir a última decisão do mesmo par')
  if (last) assert.ok(row.data >= last.data, 'Correção anterior à decisão substituída')
  latest.set(key, row)
 }
 // Only the latest decision is active; an inconclusive correction withdraws confirmation.
 const left = new Set(), right = new Set()
 let confirmed = 0
 for (const row of latest.values()) {
  if (row.estado !== 'confirmado') continue
  assert.ok(!left.has(row.candidaturaId2022) && !right.has(row.candidaturaId2026), 'Confirmações incompatíveis entre candidaturas')
  left.add(row.candidaturaId2022)
  right.add(row.candidaturaId2026)
  confirmed++
 }
 if (previous !== undefined) {
  validateIdentityDecisions(previous, { evidence, evidenceSha256, today })
  assert.ok(data.decisoes.length >= previous.decisoes.length, 'Histórico removido')
  previous.decisoes.forEach((row, index) => {
   assert.ok(isDeepStrictEqual(row, data.decisoes[index]), 'Histórico alterado ou reordenado')
  })
 }
 return { decisoes: data.decisoes.length, paresRevisados: latest.size, confirmados: confirmed,
  pendentes: pairs.size - latest.size }
}
