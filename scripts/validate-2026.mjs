import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function validate2026(file) {
 const m = file.metadados
 assert.equal(m.ano, 2026)
 assert.deepEqual(m.turnos, [1, 2], 'A base deve declarar cobertura dos dois turnos')
 assert.equal(m.partido, 'PL')
 assert.equal(m.situacao, 'resultados_dos_dois_turnos_sujeitos_a_retotalizacao')
 assert.match(m.atualizadoEm, /^\d{4}-\d{2}-\d{2}$/)
 assert.equal(new Date(m.atualizadoEm + 'T00:00:00Z').toISOString().slice(0, 10), m.atualizadoEm)
 assert.ok(Array.isArray(file.pessoas) && file.pessoas.length > 0, 'Base vazia não é resultado consolidado')
 assert.equal(m.quantidade, file.pessoas.length)
 const ufs = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '))
 const cargos = new Set(['PRESIDENTE', 'GOVERNADOR', 'SENADOR', 'DEPUTADO FEDERAL', 'DEPUTADO ESTADUAL', 'DEPUTADO DISTRITAL'])
 const situations = new Set(['ELEITO', 'ELEITO POR QP', 'ELEITO POR MÉDIA', 'ELEITO POR MEDIA'])
 const ids = new Set(), porCargo = {}, porTurno = {}, majoritarios = new Set()
 for (const p of file.pessoas) {
  assert.match(String(p.id), /^\d{8,16}$/, 'Identificador eleitoral inválido')
  assert.ok(!ids.has(String(p.id)), 'Identificador duplicado: ' + p.id)
  ids.add(String(p.id))
  assert.equal(p.ano, 2026)
  assert.ok([1, 2].includes(p.turno), 'Turno inválido')
  assert.equal(p.partido, 'PL')
  assert.ok(typeof p.nome === 'string' && p.nome.trim(), 'Nome ausente')
  assert.ok(typeof p.nomeUrna === 'string' && p.nomeUrna.trim(), 'Nome de urna ausente')
  assert.ok(cargos.has(p.cargo), 'Cargo inválido ou suplência')
  assert.ok(ufs.has(p.uf) || (p.uf === 'BR' && p.cargo === 'PRESIDENTE'), 'UF inválida')
  assert.equal(p.uf === 'BR', p.cargo === 'PRESIDENTE', 'Presidência exige abrangência BR')
  assert.ok(p.turno === 1 || ['PRESIDENTE', 'GOVERNADOR'].includes(p.cargo), 'Cargo não admite segundo turno')
  assert.ok(Number.isSafeInteger(p.votosValidos) && p.votosValidos >= 0, 'Votos inválidos')
  assert.ok(situations.has(p.situacaoTotalizacao), 'Situação não corresponde a eleito')
  if (['PRESIDENTE', 'GOVERNADOR'].includes(p.cargo)) {
   const key = p.cargo + ':' + p.uf
   assert.ok(!majoritarios.has(key), 'Dois titulares para o mesmo cargo/UF')
   majoritarios.add(key)
  }
  porCargo[p.cargo] = (porCargo[p.cargo] || 0) + 1
  porTurno[p.turno] = (porTurno[p.turno] || 0) + 1
 }
 assert.deepEqual(m.distribuicaoPorCargo, porCargo, 'Distribuição por cargo divergente')
 assert.deepEqual(m.distribuicaoPorTurno, porTurno, 'Distribuição por turno divergente')
 const expected = [
  'https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip',
  'https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2026.zip'
 ]
 assert.ok(Array.isArray(m.arquivosOriginais))
 assert.deepEqual(m.arquivosOriginais.map(f => f.url).sort(), expected.sort(), 'Arquivos oficiais ausentes')
 for (const fonte of m.arquivosOriginais) assert.match(fonte.sha256, /^[a-f0-9]{64}$/)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 const file = JSON.parse(readFileSync(new URL('../public/data/eleitos-2026.json', import.meta.url), 'utf8'))
 validate2026(file)
 console.log('Base 2026 validada:', file.pessoas.length, 'candidaturas; turnos:', JSON.stringify(file.metadados.distribuicaoPorTurno))
}
