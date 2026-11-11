import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validate2026 } from '../scripts/validate-2026.mjs'
import { compareElections } from '../scripts/compare-elections-2026.mjs'
const read = () => JSON.parse(readFileSync(new URL('../public/data/eleitos-2026.json', import.meta.url), 'utf8'))

test('base importada tem proveniência e metadados coerentes', () => {
 assert.doesNotThrow(() => validate2026(read()))
})
for (const [name, mutate] of [
 ['ID duplicado', d => { d.pessoas.push(structuredClone(d.pessoas[0])); d.metadados.quantidade++ }],
 ['deputado no segundo turno', d => { d.pessoas.find(p => p.cargo === 'DEPUTADO FEDERAL').turno = 2 }],
 ['turno inválido', d => { d.pessoas[0].turno = 3 }],
 ['suplente', d => { d.pessoas[0].cargo = '1º SUPLENTE' }],
 ['não eleito', d => { d.pessoas[0].situacaoTotalizacao = 'NÃO ELEITO' }],
 ['votos negativos', d => { d.pessoas[0].votosValidos = -1 }],
 ['total por cargo divergente', d => { d.metadados.distribuicaoPorCargo.GOVERNADOR++ }],
 ['data impossível', d => { d.metadados.atualizadoEm = '2026-02-30' }],
 ['hash ausente', d => { delete d.metadados.arquivosOriginais[0].sha256 }],
 ['metadados antigos de primeiro turno', d => { delete d.metadados.turnos; d.metadados.turno = 1 }]
]) {
 test('validador rejeita ' + name, () => {
  const d = read(); mutate(d)
  assert.throws(() => validate2026(d))
 })
}

test('aceita governador eleito no segundo turno sem impor contagens antigas', () => {
 const d = read()
 const p = { ...d.pessoas.find(p => p.cargo === 'GOVERNADOR'), turno: 2 }
 d.pessoas = [p]
 d.metadados.quantidade = 1
 d.metadados.distribuicaoPorCargo = { GOVERNADOR: 1 }
 d.metadados.distribuicaoPorTurno = { 2: 1 }
 assert.doesNotThrow(() => validate2026(d))
})

test('comparação preserva inclusões, exclusões e valores anteriores', () => {
 const before = { metadados: { quantidade: 2 }, pessoas: [{ id: '1', votosValidos: 20 }, { id: '2', turno: 1 }] }
 const after = { metadados: { quantidade: 2 }, pessoas: [{ id: '1', votosValidos: 10 }, { id: '3', turno: 2 }] }
 const report = compareElections(before, after)
 assert.deepEqual(report.resumo, { antes: 2, depois: 2, inclusoes: 1, exclusoes: 1, alteracoes: 1 })
 assert.deepEqual(report.alteracoes[0].campos.votosValidos, { antes: 20, depois: 10 })
 assert.equal(report.inclusoes[0].id, '3')
 assert.equal(report.exclusoes[0].id, '2')
})

test('comparação idêntica não inventa mudanças', () => {
 const d = read()
 assert.deepEqual(compareElections(d, structuredClone(d)).resumo,
  { antes: d.pessoas.length, depois: d.pessoas.length, inclusoes: 0, exclusoes: 0, alteracoes: 0 })
})
