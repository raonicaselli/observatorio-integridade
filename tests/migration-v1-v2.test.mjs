import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { validateMigrationV1V2, snapshotHash } from '../scripts/lib/migration-v1-v2.mjs'

const read = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url)))
const options = { exemplo: true, dataReferencia: '2026-11-12' }
function fixture() {
 return { origin: read('docs/exemplos/migracao-v1-v2-ficticia/origem-v1.json'),
  destination: read('docs/exemplos/casos-v2-ficticios.json'),
  manifest: read('docs/exemplos/migracao-v1-v2-ficticia/manifesto.json') }
}
const bytes = value => Buffer.from(JSON.stringify(value))
function validate(f) {
 const origin = bytes(f.origin), destination = bytes(f.destination)
 f.manifest.origemSha256 = snapshotHash(origin)
 f.manifest.destinoSha256 = snapshotHash(destination)
 return validateMigrationV1V2(f.manifest, origin, destination, options)
}

test('mapeia caso completo e preserva condenação, absolvição, defesa e outros participantes', () => {
 const f = fixture(), original = structuredClone(f)
 assert.deepEqual(validate(f), { ocorrenciasMapeadas: 2, ocorrenciasMantidasEmV1: 0, casos: 1, eventos: 7 })
 assert.deepEqual(f.origin, original.origin)
 assert.deepEqual(f.destination, original.destination)
})
test('lote pode manter casos não selecionados em v1', () => {
 const f = fixture()
 f.origin.ocorrencias.push({ ...structuredClone(f.origin.ocorrencias[0]), id: 'outra-ocorrencia-ficticia', idCaso: 'outro-caso-ficticio' })
 assert.equal(validate(f).ocorrenciasMantidasEmV1, 1)
})
test('hashes detectam snapshots diferentes mesmo sem mudança do mapa', () => {
 const f = fixture()
 for (const field of ['origemSha256', 'destinoSha256']) {
  const origin = bytes(f.origin), destination = bytes(f.destination)
  const manifest = { ...f.manifest, origemSha256: snapshotHash(origin), destinoSha256: snapshotHash(destination), [field]: '0'.repeat(64) }
  assert.throws(() => validateMigrationV1V2(manifest, origin, destination, options), /Snapshot/)
 }
})
test('não aceita apagar ou reescrever defesa, desfecho favorável, ressalvas ou fontes do legado', () => {
 for (const field of ['posicionamentoEnvolvido', 'descricaoSituacao', 'limites', 'fontes']) {
  const f = fixture()
  delete f.manifest.correspondencias[1].registroOriginal[field]
  assert.throws(() => validate(f), /original alterado ou incompleto/)
 }
})
test('migração não pode omitir outra ocorrência do mesmo caso', () => {
 const f = fixture()
 f.manifest.correspondencias.pop()
 assert.throws(() => validate(f), /omite participante/)
})
test('bloqueia troca de candidatura ou pessoa e evento de outro participante', () => {
 for (const field of ['candidaturaId', 'participacaoId']) {
  const f = fixture()
  f.manifest.correspondencias[0][field] = f.manifest.correspondencias[1][field]
  assert.throws(() => validate(f), /Candidatura v1 transferida|outra pessoa/)
 }
 const f = fixture()
 f.manifest.correspondencias[0].eventosIds = ['evento-arquivamento']
 assert.throws(() => validate(f), /Evento de outro participante/)
})
test('não considera eventos novos sem origem parte da migração', () => {
 const f = fixture()
 f.manifest.correspondencias[0].eventosIds.pop()
 assert.throws(() => validate(f), /eventos sem correspondência/)
})
test('origem e mapa não podem conter IDs duplicados', () => {
 const f = fixture(); f.origin.ocorrencias.push(f.origin.ocorrencias[0])
 assert.throws(() => validate(f), /ID v1 duplicado/)
 const g = fixture(); g.manifest.correspondencias.push(g.manifest.correspondencias[0])
 assert.throws(() => validate(g), /ausente ou repetida/)
})
test('não permite fundir dois casos de origem', () => {
 const f = fixture()
 f.origin.ocorrencias[1].idCaso = 'outro-caso-ficticio'
 f.manifest.correspondencias[1].registroOriginal = structuredClone(f.origin.ocorrencias[1])
 assert.throws(() => validate(f), /distintos fundidos/)
})
test('fonte precisa estar preservada no contexto da pessoa, não somente em outra parte do pacote', () => {
 const f = fixture()
 const source = { ...structuredClone(f.destination.fontes[0]), id: 'fonte-so-ana', url: 'https://example.org/exemplo-ficticio/so-ana' }
 f.destination.fontes.push(source)
 f.destination.participacoes[0].fontesIds.push(source.id)
 f.origin.ocorrencias[1].fontes[0].url = source.url
 f.manifest.correspondencias[1].registroOriginal = structuredClone(f.origin.ocorrencias[1])
 assert.throws(() => validate(f), /Fonte v1 não preservada/)
})
test('aprovação e todas as conferências são obrigatórias, sem promoção automática', () => {
 const f = fixture(); f.manifest.revisao.liberacaoPublica = false
 assert.throws(() => validate(f), /sem aprovação/)
 for (const field of Object.keys(f.manifest.correspondencias[0].conferencias)) {
  const g = fixture(); g.manifest.correspondencias[0].conferencias[field] = false
  assert.throws(() => validate(g), /Conferência humana ausente/)
 }
})
test('rejeita origem ainda em revisão mesmo com declaração positiva no manifesto', () => {
 const f = fixture()
 f.origin.ocorrencias[0].statusEditorial = 'revisao_final'
 f.manifest.correspondencias[0].registroOriginal = structuredClone(f.origin.ocorrencias[0])
 assert.throws(() => validate(f), /Origem não publicada/)
})
test('não retroage a revisão nem aceita datas futuras ou impossíveis', () => {
 const f = fixture()
 f.origin.ocorrencias[0].dataRevisao = '2026-06-11'
 f.origin.ocorrencias[0].revisao.data = '2026-06-11'
 f.manifest.correspondencias[0].registroOriginal = structuredClone(f.origin.ocorrencias[0])
 assert.throws(() => validate(f), /anterior à revisão/)
 for (const date of ['2026-02-30', '2027-01-01']) {
  const g = fixture(); g.manifest.data = date
  assert.throws(() => validate(g), /data inexistente|futura/)
 }
})
test('campos extras e finalidade pública não passam no modo de exemplo', () => {
 const f = fixture(); f.manifest.anotacaoPrivada = 'Não deve ser aceita'
 assert.throws(() => validate(f), /Campos desconhecidos/)
 const g = fixture(); g.manifest.finalidade = 'publicacao'
 assert.throws(() => validate(g), /Finalidade/)
})
test('CLI exige arquivos explícitos, não escreve e mantém exemplo fora do modo público', () => {
 const dir = mkdtempSync(join(tmpdir(), 'migration-v1-v2-'))
 try {
  const f = fixture(), origin = bytes(f.origin), destination = bytes(f.destination)
  f.manifest.origemSha256 = snapshotHash(origin); f.manifest.destinoSha256 = snapshotHash(destination)
  const files = [['origem.json', origin], ['destino.json', destination], ['mapa.json', bytes(f.manifest)]]
  for (const [name, content] of files) writeFileSync(join(dir, name), content)
  const args = ['scripts/validate-migration-v1-v2.mjs', '--origem', join(dir, 'origem.json'), '--destino', join(dir, 'destino.json'), '--manifesto', join(dir, 'mapa.json')]
  assert.equal(spawnSync(process.execPath, [...args, '--exemplo']).status, 0)
  assert.notEqual(spawnSync(process.execPath, args).status, 0)
  assert.notEqual(spawnSync(process.execPath, [args[0]]).status, 0)
  assert.notEqual(spawnSync(process.execPath, [...args, '--exemplo', '--exemplo']).status, 0)
  for (const [name, content] of files) assert.deepEqual(readFileSync(join(dir, name)), content)
 } finally { rmSync(dir, { recursive: true, force: true }) }
})


test('exemplo versionado confere os hashes reais dos arquivos, sem recalculá-los no manifesto', () => {
 const manifest = read('docs/exemplos/migracao-v1-v2-ficticia/manifesto.json')
 const origin = readFileSync(new URL('../docs/exemplos/migracao-v1-v2-ficticia/origem-v1.json', import.meta.url))
 const destination = readFileSync(new URL('../docs/exemplos/casos-v2-ficticios.json', import.meta.url))
 assert.equal(validateMigrationV1V2(manifest, origin, destination, options).eventos, 7)
})


test('origem publicada sem aprovação editorial completa não pode ser promovida', () => {
 for (const field of ['confirmacaoIdentidade', 'verificacaoAtualizacao', 'liberacaoPublica']) {
  const f = fixture()
  f.origin.ocorrencias[0].revisao[field] = false
  f.manifest.correspondencias[0].registroOriginal = structuredClone(f.origin.ocorrencias[0])
  assert.throws(() => validate(f), /Aprovação v1 ausente/)
 }
})
test('apuração exclusivamente jornalística não é convertida em ato oficial', () => {
 const f = fixture()
 f.origin.ocorrencias[0].tipoRegistro = 'apuracao_jornalistica'
 f.manifest.correspondencias[0].registroOriginal = structuredClone(f.origin.ocorrencias[0])
 assert.throws(() => validate(f), /Apuração jornalística/)
})
