import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { assertIsoDate } from './iso-date.mjs'
import { validateCasosV2 } from './casos-v2.mjs'

export const snapshotHash = bytes => createHash('sha256').update(bytes).digest('hex')
const requiredText = value => assert.ok(typeof value === 'string' && value.trim().length >= 3, 'Texto de conferência obrigatório')
function keys(value, expected) {
 assert.ok(value && typeof value === 'object' && !Array.isArray(value), 'Objeto obrigatório')
 assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), 'Campos desconhecidos ou ausentes no manifesto')
}
const checks = ['identidade', 'textosELimites', 'resultadosEDefesa', 'recursosETransito', 'fontesEDatas']

/** Read-only validation of an explicitly reviewed migration. Never builds or approves a package. */
export function validateMigrationV1V2(manifest, originBytes, destinationBytes, options = {}) {
 keys(manifest, ['versao', 'finalidade', 'origemSha256', 'destinoSha256', 'data', 'revisao', 'correspondencias'])
 assert.equal(manifest.versao, 1, 'Versão de manifesto inválida')
 assert.equal(manifest.finalidade, options.exemplo ? 'exemplo_ficticio' : 'publicacao', 'Finalidade de migração incompatível')
 assert.equal(manifest.origemSha256, snapshotHash(originBytes), 'Snapshot v1 diferente do revisado')
 assert.equal(manifest.destinoSha256, snapshotHash(destinationBytes), 'Snapshot v2 diferente do revisado')
 const origin = JSON.parse(originBytes.toString())
 const destination = JSON.parse(destinationBytes.toString())
 validateCasosV2(destination, options)
 if (options.exemplo) assert.equal(origin.metadados?.finalidade, 'exemplo_ficticio', 'Origem deve ser exemplo fictício')
 else assert.notEqual(origin.metadados?.finalidade, 'exemplo_ficticio', 'Origem fictícia não pode ser migração pública')
 assertIsoDate(manifest.data, 'Data da migração')
 const today = options.dataReferencia ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
 assertIsoDate(today, 'Data de referência')
 assert.ok(manifest.data <= today, 'Revisão de migração futura')
 assert.equal(manifest.data, destination.metadados.atualizadoEm, 'Migração e pacote devem ter a mesma data de revisão')
 keys(manifest.revisao, ['responsavel', 'data', 'justificativa', 'liberacaoPublica'])
 requiredText(manifest.revisao.responsavel)
 requiredText(manifest.revisao.justificativa)
 assert.equal(manifest.revisao.data, manifest.data, 'Data da revisão incompatível')
 assert.equal(manifest.revisao.liberacaoPublica, true, 'Migração sem aprovação declarada')
 assert.ok(Array.isArray(origin.ocorrencias) && origin.ocorrencias.length > 0, 'Snapshot v1 sem ocorrências')
 const legacy = new Map()
 for (const row of origin.ocorrencias) {
  requiredText(row.id)
  assert.ok(!legacy.has(row.id), 'ID v1 duplicado')
  legacy.set(row.id, row)
 }
 assert.ok(Array.isArray(manifest.correspondencias) && manifest.correspondencias.length > 0, 'Correspondências obrigatórias')
 const index = name => new Map(destination[name].map(row => [row.id, row]))
 const candidacies = index('candidaturas'), participations = index('participacoes')
 const events = index('eventos'), sources = index('fontes'), processes = index('processos'), people = index('pessoas')
 const seenLegacy = new Set(), seenEvents = new Set(), seenCandidacies = new Set(), seenParticipations = new Set()
 const cases = new Map(), reverseCases = new Map()
 for (const mapping of manifest.correspondencias) {
  keys(mapping, ['ocorrenciaId', 'candidaturaId', 'participacaoId', 'eventosIds', 'registroOriginal', 'conferencias'])
  const old = legacy.get(mapping.ocorrenciaId)
  assert.ok(old && !seenLegacy.has(old.id), 'Ocorrência v1 ausente ou repetida no mapa')
  assert.equal(old.statusEditorial, 'publicado', 'Origem não publicada')
  assert.ok(['pedido_de_apuracao', 'investigacao_oficial', 'processo_ou_decisao'].includes(old.tipoRegistro), 'Apuração jornalística não pode ser convertida em ato oficial')
  for (const field of ['confirmacaoIdentidade', 'verificacaoAtualizacao', 'liberacaoPublica']) {
   assert.equal(old.revisao?.[field], true, `Aprovação v1 ausente: ${field}`)
  }
  requiredText(old.revisao.responsavel)
  assert.equal(old.revisao.data, old.dataRevisao, 'Datas de revisão v1 incompatíveis')
  assert.deepEqual(mapping.registroOriginal, old, 'Registro v1 original alterado ou incompleto')
  assertIsoDate(old.dataRevisao, 'Revisão de origem')
  assert.ok(old.dataRevisao <= manifest.data, 'Migração anterior à revisão de origem')
  keys(mapping.conferencias, checks)
  for (const check of checks) assert.equal(mapping.conferencias[check], true, `Conferência humana ausente: ${check}`)
  const candidate = candidacies.get(mapping.candidaturaId)
  const participation = participations.get(mapping.participacaoId)
  assert.ok(candidate && participation, 'Candidatura ou participação inexistente')
  assert.equal(candidate.tseId, old.candidaturaId, 'Candidatura v1 transferida a outro identificador')
  assert.equal(candidate.ano, 2022, 'Este contrato migra apenas candidaturas v1 de 2022')
  assert.equal(candidate.pessoaId, participation.pessoaId, 'Participação atribuída a outra pessoa')
  requiredText(old.idCaso)
  assert.ok(!cases.has(old.idCaso) || cases.get(old.idCaso) === participation.casoId, 'Caso v1 dividido sem correspondência')
  assert.ok(!reverseCases.has(participation.casoId) || reverseCases.get(participation.casoId) === old.idCaso, 'Casos v1 distintos fundidos')
  cases.set(old.idCaso, participation.casoId)
  reverseCases.set(participation.casoId, old.idCaso)
  assert.ok(Array.isArray(mapping.eventosIds) && mapping.eventosIds.length > 0, 'Eventos de destino obrigatórios')
  const sourceIds = new Set([...candidate.fontesIds, ...people.get(candidate.pessoaId).identidade.fontesIds, ...participation.fontesIds])
  for (const eventId of mapping.eventosIds) {
   const event = events.get(eventId)
   assert.ok(event && !seenEvents.has(eventId), 'Evento ausente ou mapeado mais de uma vez')
   assert.equal(event.participacaoId, participation.id, 'Evento de outro participante')
   seenEvents.add(eventId)
   for (const source of [...event.fontesIds, ...event.defesa.fontesIds, ...event.recurso.fontesIds,
    ...event.transitoEmJulgado.fontesIds, ...processes.get(event.processoId).fontesIds]) sourceIds.add(source)
  }
  const urls = new Set([...sourceIds].map(id => new URL(sources.get(id).url).href))
  assert.ok(Array.isArray(old.fontes) && old.fontes.length > 0, 'Fontes v1 obrigatórias')
  for (const source of old.fontes) assert.ok(urls.has(new URL(source.url).href), 'Fonte v1 não preservada no contexto do participante')
  seenLegacy.add(old.id)
  seenCandidacies.add(candidate.id)
  seenParticipations.add(participation.id)
 }
 // Move complete cases, including other participants and their favorable outcomes.
 for (const old of legacy.values()) {
  if (cases.has(old.idCaso)) assert.ok(seenLegacy.has(old.id), 'Migração parcial omite participante ou registro do mesmo caso')
 }
 assert.equal(seenEvents.size, events.size, 'Pacote contém eventos sem correspondência v1')
 assert.equal(seenCandidacies.size, candidacies.size, 'Pacote contém candidaturas sem correspondência v1')
 assert.equal(seenParticipations.size, participations.size, 'Pacote contém participações sem correspondência v1')
 return { ocorrenciasMapeadas: seenLegacy.size, ocorrenciasMantidasEmV1: legacy.size - seenLegacy.size,
  casos: cases.size, eventos: seenEvents.size }
}
