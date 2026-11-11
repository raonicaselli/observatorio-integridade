import test from 'node:test'
import assert from 'node:assert/strict'
import { searchPublishedOccurrences } from '../src/lib/occurrence-search.mjs'

// All identities and case details in these fixtures are fictional.
const candidate = { id: 'candidatura-ficticia', nome: 'Pessoa Fictícia', nomeUrna: 'Nome de Urna Fictício' }
const byId = new Map([[candidate.id, candidate]])
const occurrence = (extra = {}) => ({ id: 'ocorrencia-ficticia', candidaturaId: candidate.id,
 statusEditorial: 'publicado', tipoRegistro: 'processo_ou_decisao', dataMarco: '2026-11-01',
 titulo: 'Decisão fictícia', resumo: 'Resumo sintético', orgao: 'Tribunal Fictício',
 processoNumero: 'AP 9876 — número único 1234567-89.2026.1.00.0000', ...extra })
const search = (query, rows = [occurrence()], type = '') => searchPublishedOccurrences(rows, byId, { query, type })

test('busca pelo processo encontra registro sem número no título ou no resumo', () => {
 assert.equal(search('9876').length, 1)
 assert.equal(search('AP 9876').length, 1)
})
test('aceita classe e numeração com espaços e pontuação diferentes', () => {
 for (const query of ['ap9876', 'AP 9.876', ' AP   9876 ', '1234567-89.2026.1.00.0000', '12345678920261000000']) {
  assert.equal(search(query).length, 1, query)
 }
 assert.equal(search('PET 9876').length, 0)
})
test('não confunde números de processos diferentes ou inventa igualdade parcial de classe', () => {
 assert.equal(search('AP 9877').length, 0)
 assert.equal(search('12345678920261000001').length, 0)
})
test('busca textual preserva nomes, nome de urna, título e assunto, sem acentos ou caixa', () => {
 for (const query of ['PESSOA FICTICIA', 'nome de urna ficticio', 'decisao ficticia', 'resumo sintetico']) {
  assert.equal(search(query).length, 1, query)
 }
})
test('órgão também pode ser pesquisado', () => {
 assert.equal(search('TRIBUNAL FICTICIO').length, 1)
})
test('filtro de natureza combina com busca por processo', () => {
 const rows = [occurrence(), occurrence({ id: 'investigacao-ficticia', tipoRegistro: 'investigacao_oficial' })]
 assert.deepEqual(search('9876', rows, 'investigacao_oficial').map(row => row.id), ['investigacao-ficticia'])
})
test('registros não publicados nunca entram na busca nem na lista sem consulta', () => {
 const rows = [occurrence({ statusEditorial: 'revisao_final' })]
 assert.equal(search('9876', rows).length, 0)
 assert.equal(search('', rows).length, 0)
})
test('busca não associa nomes de outras candidaturas', () => {
 const other = occurrence({ candidaturaId: 'outra-candidatura-ficticia' })
 assert.equal(search('Pessoa Fictícia', [other]).length, 0)
 assert.equal(search('9876', [other]).length, 1)
})
test('número e órgão ausentes não geram correspondência artificial', () => {
 const rows = [occurrence({ processoNumero: null, orgao: null })]
 for (const query of ['9876', 'undefined', 'null', '---']) assert.equal(search(query, rows).length, 0)
 assert.equal(search('Resumo', rows).length, 1)
})
test('consulta em branco mantém a ordenação temporal e não modifica a entrada', () => {
 const rows = [occurrence(), occurrence({ id: 'mais-recente', dataMarco: '2026-11-02' })]
 const original = structuredClone(rows)
 assert.deepEqual(search('  \n ', rows).map(row => row.id), ['mais-recente', 'ocorrencia-ficticia'])
 assert.deepEqual(rows, original)
})
test('caso compartilhado preserva registros por participante, inclusive resultado favorável', () => {
 const rows = [occurrence({ idCaso: 'caso-compartilhado', titulo: 'Condenação fictícia' }),
  occurrence({ id: 'absolvicao-ficticia', idCaso: 'caso-compartilhado', candidaturaId: 'outro-participante', titulo: 'Absolvição fictícia' })]
 assert.deepEqual(search('9876', rows).map(row => row.titulo), ['Condenação fictícia', 'Absolvição fictícia'])
})
