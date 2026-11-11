import test from 'node:test'
import assert from 'node:assert/strict'
import { validateIdentityDecisions } from '../scripts/lib/identity-decisions.mjs'

const hash = 'a'.repeat(64)
const pair = (a, b) => ({ candidaturaId2022: a, candidaturaId2026: b,
 resultadoConferencia: 'coincidencia_documental', qualidadeFonte2022: 'apto_para_comparacao', qualidadeFonte2026: 'apto_para_comparacao' })
const context = () => ({ evidenceSha256: hash, today: '2026-11-11', evidence: {
 metadados: { dataConferencia: '2026-11-10', fontesOficiais: [{ url: 'https://oficial.test/2022' }, { url: 'https://oficial.test/2026' }] },
 pares: [pair('a', 'b'), pair('a', 'c'), pair('d', 'b')],
} })
const decision = (extra = {}) => ({ id: 'revisao-001', candidaturaId2022: 'a', candidaturaId2026: 'b',
 estado: 'confirmado', data: '2026-11-11', revisor: 'Revisor fictício', metodo: 'Conferência fictícia dos cadastros',
 justificativa: 'Exemplo sintético de revisão documental', fontes: ['https://oficial.test/2022', 'https://oficial.test/2026'],
 evidenciaSha256: hash, substitui: null, ...extra })
const registry = (...rows) => ({ versao: 1, decisoes: rows })

test('registro vazio não confirma evidências automaticamente', () => {
 assert.deepEqual(validateIdentityDecisions(registry(), context()), { decisoes: 0, paresRevisados: 0, confirmados: 0, pendentes: 3 })
})
test('decisão documentada contabiliza somente o par revisado', () => {
 assert.equal(validateIdentityDecisions(registry(decision()), context()).confirmados, 1)
})
test('correção inconclusiva revoga confirmação e preserva histórico', () => {
 const old = registry(decision())
 const next = registry(decision(), decision({ id: 'revisao-002', estado: 'inconclusivo', substitui: 'revisao-001' }))
 assert.equal(validateIdentityDecisions(next, context(), old).confirmados, 0)
})
test('histórico não pode ser apagado, editado ou reordenado', () => {
 const first = decision(), second = decision({ id: 'revisao-002', estado: 'divergente', substitui: first.id })
 const old = registry(first, second)
 for (const next of [registry(first), registry({ ...first, justificativa: 'Mudança' }, second), registry(second, first)]) {
  assert.throws(() => validateIdentityDecisions(next, context(), old))
 }
})
test('confirmações concorrentes em qualquer ano são rejeitadas', () => {
 for (const extra of [{ candidaturaId2026: 'c' }, { candidaturaId2022: 'd' }]) {
  assert.throws(() => validateIdentityDecisions(registry(decision(), decision({ id: 'revisao-002', ...extra })), context()), /incompatíveis/)
 }
})
test('não aceita par desconhecido ou hash de evidência trocado', () => {
 for (const extra of [{ candidaturaId2022: 'desconhecido' }, { evidenciaSha256: 'b'.repeat(64) }]) {
  assert.throws(() => validateIdentityDecisions(registry(decision(extra)), context()))
 }
})
test('confirmação exige coincidência e fontes aptas nos dois anos', () => {
 for (const extra of [{ resultadoConferencia: 'divergencia_documental' }, { resultadoConferencia: 'dados_insuficientes' },
  { qualidadeFonte2022: 'repetido_no_recorte' }, { qualidadeFonte2026: 'nao_localizado' }]) {
  const ctx = context(); Object.assign(ctx.evidence.pares[0], extra)
  assert.throws(() => validateIdentityDecisions(registry(decision()), ctx))
 }
})
test('fontes desconhecidas, duplicadas ou incompletas impedem confirmação', () => {
 for (const fontes of [[], ['https://oficial.test/2022'], ['https://outro.test'], ['https://oficial.test/2022', 'https://oficial.test/2022']]) {
  assert.throws(() => validateIdentityDecisions(registry(decision({ fontes })), context()))
 }
})
test('datas impossíveis, futuras ou anteriores à evidência são rejeitadas', () => {
 for (const data of ['2026-02-30', '2026-11-12', '2026-11-09']) {
  assert.throws(() => validateIdentityDecisions(registry(decision({ data })), context()))
 }
})
test('autoria, método e justificativa são obrigatórios e campos extras proibidos', () => {
 for (const extra of [{ revisor: ' ' }, { metodo: '' }, { justificativa: null }, { cpf: 'proibido' }, { estado: 'automatico' }]) {
  assert.throws(() => validateIdentityDecisions(registry(decision(extra)), context()))
 }
})
test('correção exige último ID do mesmo par e data não regressiva', () => {
 for (const extra of [{ substitui: null }, { substitui: 'outro-par' }, { substitui: 'revisao-001', data: '2026-11-10' }]) {
  assert.throws(() => validateIdentityDecisions(registry(decision(), decision({ id: 'revisao-002', ...extra })), context()))
 }
})
test('IDs repetidos e formatos inválidos são rejeitados', () => {
 assert.throws(() => validateIdentityDecisions(registry(decision(), decision()), context()))
 assert.throws(() => validateIdentityDecisions(registry(decision({ id: '' })), context()))
})

test('comparação com versão anterior aceita acréscimos e rejeita reordenação de pares independentes', () => {
 const first = decision({ estado: 'inconclusivo' })
 const second = decision({ id: 'revisao-002', candidaturaId2026: 'c', estado: 'divergente' })
 assert.equal(validateIdentityDecisions(registry(first, second), context(), registry(first)).decisoes, 2)
 assert.throws(() => validateIdentityDecisions(registry(second, first), context(), registry(first, second)), /Histórico alterado/)
})
