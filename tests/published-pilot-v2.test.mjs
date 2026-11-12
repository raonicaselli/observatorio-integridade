import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateMigrationV1V2 } from '../scripts/lib/migration-v1-v2.mjs'
import { timelineV2, validateTransicaoV2 } from '../scripts/lib/casos-v2.mjs'

const bytes = name => readFileSync(new URL('../' + name, import.meta.url))
const read = name => JSON.parse(bytes(name))
const data = read('public/data/casos-v2.json')
const manifest = read('public/data/migracao-v1-v2.json')
const options = { cadastros: [read('public/data/eleitos-2022.json'), read('public/data/eleitos-2026.json')] }

test('pacote público corresponde ao snapshot e ao manifesto revisados', () => {
 const result = validateMigrationV1V2(manifest, bytes('docs/auditorias/migracao-v2-2026-11-12/origem-v1.json'), bytes('public/data/casos-v2.json'), options)
 assert.ok(result.ocorrenciasMapeadas > 0)
 assert.equal(result.ocorrenciasMapeadas + result.ocorrenciasMantidasEmV1,
  read('docs/auditorias/migracao-v2-2026-11-12/origem-v1.json').ocorrencias.length)
})

test('piloto distingue trânsito da condenação e decisão posterior de execução, com defesa e limites', () => {
 const mapping = manifest.correspondencias.find(row => row.ocorrenciaId === 'stf-eduardo-ap2782-2026')
 const events = timelineV2(data, mapping.participacaoId, options)
 const finality = events.find(row => row.tipo === 'transito_em_julgado')
 const execution = events.find(row => row.id === 'evento-ap2782-execucao')
 assert.equal(finality.data, '2026-10-03')
 assert.equal(finality.transitoEmJulgado.data, finality.data)
 assert.equal(execution.data, '2026-10-07')
 assert.equal(execution.transitoEmJulgado.situacao, 'nao_verificado')
 assert.equal(execution.recurso.situacao, 'nao_verificado')
 assert.equal(execution.relacao.eventoId, finality.id)
 for (const event of events) {
  assert.ok(event.defesa.descricao.startsWith(mapping.registroOriginal.posicionamentoEnvolvido))
  assert.ok(event.limites.includes(mapping.registroOriginal.limites))
 }
 const pdf = data.fontes.find(row => row.id === 'fonte-ap2782-decisao')
 assert.equal(pdf.dataConsulta, '2026-11-11', 'Resposta vazia posterior não renova consulta do documento')
})

test('transição do pacote aprovado bloqueia alteração de fontes e eventos', () => {
 for (const collection of ['fontes', 'eventos']) {
  const changed = structuredClone(data)
  changed[collection].pop()
  assert.throws(() => validateTransicaoV2(data, changed, options))
 }
})
