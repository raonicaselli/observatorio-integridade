import assert from 'node:assert/strict'
import { assertIsoDate as date } from './iso-date.mjs'
import { validateCoverageSource } from './coverage-sources.mjs'

export const COVERAGE_STATES = Object.freeze(['nao_iniciado', 'pendente_documentacao', 'triagem_inicial', 'em_revisao', 'revisao_concluida'])
const LEGACY_STATES = COVERAGE_STATES.filter(state => state !== 'pendente_documentacao')
const GROUPS = ['stf', 'stj', 'justica_eleitoral', 'justica_estadual', 'justica_federal', 'ministerio_publico', 'policia_federal']
const REQUIREMENTS = [
 ['stf', 'BR'], ['stj', 'BR'], ['justica_eleitoral', 'BR'], ['justica_eleitoral', 'UF'],
 ['justica_estadual', 'UF'], ['justica_federal', 'UF'], ['ministerio_publico', 'BR'],
 ['ministerio_publico', 'UF'], ['policia_federal', 'BR']
]
const check = (ok, message) => assert.ok(ok, message)
const text = (value, name, minimum = 3) => check(typeof value === 'string' && value.trim().length >= minimum, `${name}: texto obrigatório`)
const key = (year, id) => `${year}:${id}`
const counts = () => Object.fromEntries(COVERAGE_STATES.map(state => [state, 0]))
const legacyFields = record => ({ estado: record.estado, atualizadoEm: record.atualizadoEm, verificadoIntegralmenteEm: record.verificadoIntegralmenteEm })
function shape(object, fields, label) {
 check(object && typeof object === 'object' && !Array.isArray(object), `${label}: objeto obrigatório`)
 assert.deepEqual(Object.keys(object).sort(), [...fields].sort(), `${label}: campos incompatíveis com o contrato`)
}

function indexCatalogs(cadastros) {
 const result = new Map()
 for (const base of cadastros) for (const candidate of base.pessoas) {
  check([2022, 2026].includes(candidate.ano), 'Ano eleitoral fora do recorte')
  const id = key(candidate.ano, candidate.id)
  check(!result.has(id), `Cadastro duplicado: ${id}`)
  result.set(id, candidate)
 }
 check(result.size > 0, 'Cadastros eleitorais vazios')
 return result
}
function published(ocorrencias) {
 const result = new Set()
 for (const item of ocorrencias.ocorrencias) {
  // v1 only links 2022. No inferred cross-election links are permitted here.
  if (item.statusEditorial === 'publicado') result.add(key(2022, item.candidaturaId))
 }
 return result
}
function latestByRequirement(consultas) {
 const result = new Map()
 for (const query of [...consultas].sort((a, b) => a.sequencia - b.sequencia)) {
  result.set(`${query.fonte.grupo}:${query.abrangencia}`, query)
 }
 return result
}
function requiredKeys(candidate) {
 // BR is the national scope for a presidential candidacy; no UF is invented.
 return REQUIREMENTS.filter(([, scope]) => scope !== 'UF' || candidate.uf !== 'BR')
  .map(([group, scope]) => `${group}:${scope === 'UF' ? candidate.uf : scope}`)
}
function completeQueries(consultas, candidate, reviewDate) {
 const latest = latestByRequirement(consultas)
 return requiredKeys(candidate).map(requirement => {
  const query = latest.get(requirement)
  check(query, `Escopo incompleto: falta ${requirement}`)
  assert.equal(query.resultado, 'realizada', `Acesso indisponível em ${requirement} não conclui pesquisa`)
  check(query.proximaRevisao > reviewDate, `Consulta vencida em ${requirement}`)
  return query
 })
}

function validateQueries(consultas, { candidate, atualizadoEm, queryIds }) {
 const sequences = new Set(), byId = new Map()
 for (const q of consultas) {
  shape(q, ['id', 'sequencia', 'fonte', 'abrangencia', 'dataConsulta', 'responsavel', 'escopo', 'limitacoes', 'resultado', 'proximaRevisao', 'revisao'], 'consulta')
  check(typeof q.id === 'string' && /^[a-z][a-z0-9-]{2,79}$/.test(q.id) && !queryIds.has(q.id), 'Consulta com ID inválido, duplicado ou copiado entre candidaturas')
  queryIds.add(q.id); byId.set(q.id, q)
  check(Number.isSafeInteger(q.sequencia) && q.sequencia > 0 && !sequences.has(q.sequencia), 'Sequência de consulta inválida ou duplicada'); sequences.add(q.sequencia)
  shape(q.fonte, ['grupo', 'orgao', 'url'], 'consulta.fonte')
  check(GROUPS.includes(q.fonte.grupo), 'Grupo de fonte desconhecido'); text(q.fonte.orgao, 'fonte.orgao', 2)
  check(q.abrangencia === 'BR' || q.abrangencia === candidate.uf, 'Consulta refere-se a outra UF')
  validateCoverageSource(q.fonte, q.abrangencia)
  date(q.dataConsulta, 'consulta.dataConsulta'); date(q.proximaRevisao, 'consulta.proximaRevisao')
  check(q.dataConsulta <= atualizadoEm && q.proximaRevisao > q.dataConsulta, 'Consulta futura ou próxima revisão inválida')
  for (const field of ['responsavel', 'escopo', 'limitacoes']) text(q[field], `consulta.${field}`)
  check(['realizada', 'acesso_indisponivel'].includes(q.resultado), 'Resultado não pode representar conclusão jurídica')
  shape(q.revisao, ['responsavel', 'data', 'liberacaoPublica'], 'consulta.revisao')
  text(q.revisao.responsavel, 'consulta.revisao.responsavel'); date(q.revisao.data, 'consulta.revisao.data')
  assert.equal(q.revisao.liberacaoPublica, true, 'Metadados de consulta sem aprovação pública')
  check(q.dataConsulta <= q.revisao.data && q.revisao.data <= atualizadoEm, 'Revisão de consulta incompatível com datas')
 }
 const ordered = [...consultas].sort((a, b) => a.sequencia - b.sequencia)
 for (let i = 1; i < ordered.length; i++) check(ordered[i - 1].dataConsulta <= ordered[i].dataConsulta, 'Sequência de consultas com datas invertidas')
 return byId
}

function validateReviews(revisoes, byId, { candidate, atualizadoEm, reviewIds }) {
 const consultas = [...byId.values()]
 let lastReview = null
 for (const review of revisoes) {
  shape(review, ['id', 'data', 'responsavel', 'escopo', 'limitacoes', 'consultasIds', 'proximaRevisao', 'liberacaoPublica'], 'revisao')
  check(typeof review.id === 'string' && /^[a-z][a-z0-9-]{2,79}$/.test(review.id) && !reviewIds.has(review.id), 'Revisão com ID inválido ou duplicado'); reviewIds.add(review.id)
  date(review.data, 'revisao.data'); date(review.proximaRevisao, 'revisao.proximaRevisao')
  check(review.data <= atualizadoEm && review.proximaRevisao > review.data, 'Data de conclusão ou próxima revisão inválida')
  for (const field of ['responsavel', 'escopo', 'limitacoes']) text(review[field], `revisao.${field}`)
  assert.equal(review.liberacaoPublica, true, 'Conclusão de cobertura sem aprovação')
  check(Array.isArray(review.consultasIds) && review.consultasIds.length > 0 && new Set(review.consultasIds).size === review.consultasIds.length, 'Referências de consultas vazias ou duplicadas')
  const queries = review.consultasIds.map(id => { check(byId.has(id), 'Revisão aponta para consulta desconhecida'); return byId.get(id) })
  for (const q of queries) check(q.revisao.data <= review.data, 'Conclusão anterior à revisão das consultas')
  const required = completeQueries(queries, candidate, review.data)
  const cutoff = Math.max(...queries.map(q => q.sequencia))
  const alreadyPerformed = consultas.filter(q => q.dataConsulta < review.data || (q.dataConsulta === review.data && q.sequencia <= cutoff))
  const effective = completeQueries(alreadyPerformed, candidate, review.data)
  check(effective.every(q => review.consultasIds.includes(q.id)), 'Conclusão ignora uma consulta já realizada')
  check(required.every(q => review.proximaRevisao <= q.proximaRevisao), 'Conclusão ultrapassa a validade de uma consulta')
  check(lastReview === null || lastReview.data <= review.data, 'Revisões devem preservar ordem cronológica')
  lastReview = review
 }
 return lastReview
}

/** Preserve and validate the original v1 workload log; never reinterpret its dates as source consultations. */
export function validateLegacyCoverage(data, base) {
 assert.equal(data.metadados.versao, 1)
 date(data.metadados.atualizadoEm, 'legado.atualizadoEm')
 const catalog = new Map(base.pessoas.map(p => [String(p.id), p]))
 const seen = new Set(), totals = Object.fromEntries(LEGACY_STATES.map(state => [state, 0]))
 assert.equal(data.metadados.total, catalog.size)
 assert.equal(data.registros.length, catalog.size)
 for (const r of data.registros) {
  const id = String(r.candidaturaId)
  check(catalog.has(id) && !seen.has(id), `Cobertura legada desconhecida ou duplicada: ${id}`)
  seen.add(id)
  for (const field of ['nome', 'uf', 'cargo']) assert.equal(r[field], catalog.get(id)[field], `Legado divergente: ${id}/${field}`)
  check(LEGACY_STATES.includes(r.estado), `Estado legado inválido: ${id}`)
  totals[r.estado]++
  if (r.estado === 'nao_iniciado') assert.equal(r.atualizadoEm, null)
  else { date(r.atualizadoEm, 'legado.data'); check(r.atualizadoEm <= data.metadados.atualizadoEm, 'Data legada posterior aos metadados') }
  if (r.estado === 'revisao_concluida') {
   date(r.verificadoIntegralmenteEm, 'legado.verificadoIntegralmenteEm')
   check(r.verificadoIntegralmenteEm <= r.atualizadoEm, 'Conclusão legada posterior à atualização')
  } else assert.equal(r.verificadoIntegralmenteEm, null)
 }
 assert.equal(data.metadados.triagemInicial, totals.triagem_inicial)
 assert.equal(data.metadados.emRevisao, totals.em_revisao)
 assert.equal(data.metadados.revisaoConcluida, totals.revisao_concluida)
 return totals
}

export function validateCoverage(data, { cadastros, legado, ocorrencias, origemLegado, dataReferencia }) {
 shape(data, ['metadados', 'registros'], 'cobertura')
 shape(data.metadados, ['versao', 'protocolo', 'atualizadoEm', 'recortes', 'total', 'origemLegado'], 'metadados')
 assert.equal(data.metadados.versao, 2)
 assert.equal(data.metadados.protocolo, 'pesquisa-documental-v1')
 date(data.metadados.atualizadoEm, 'metadados.atualizadoEm')
 date(dataReferencia, 'dataReferencia')
 check(dataReferencia >= data.metadados.atualizadoEm, 'Diagnóstico anterior à atualização do controle')
 shape(data.metadados.origemLegado, ['arquivo', 'sha256'], 'origemLegado')
 text(data.metadados.origemLegado.arquivo, 'origemLegado.arquivo')
 check(/^[a-f0-9]{64}$/.test(data.metadados.origemLegado.sha256), 'Hash de origem legada inválido')
 assert.deepEqual(data.metadados.origemLegado, origemLegado, 'Proveniência legada divergente')
 const catalog = indexCatalogs(cadastros)
 const years = [...new Set([...catalog.values()].map(p => p.ano))].sort()
 assert.deepEqual(data.metadados.recortes, years)
 check(Array.isArray(data.registros), 'Registros devem ser lista')
 assert.equal(data.metadados.total, catalog.size)
 assert.equal(data.registros.length, catalog.size)
 const old = new Map(legado.registros.map(r => [key(2022, r.candidaturaId), r]))
 const approved = published(ocorrencias)
 const seen = new Set(), queryIds = new Set(), reviewIds = new Set()
 const summary = { dataReferencia, total: catalog.size, porAno: {}, pendenciasDocumentacao: [], divergenciasLegado: [], revisoesVencidas: [] }
 for (const r of data.registros) {
  shape(r, ['ano', 'candidaturaId', 'estado', 'consultas', 'revisoes', 'legado'], 'registro')
  check(typeof r.candidaturaId === 'string' && /^\d{8,16}$/.test(r.candidaturaId), 'ID TSE inválido')
  check(Number.isInteger(r.ano) && years.includes(r.ano), 'Ano da cobertura deve ser inteiro do recorte')
  const id = key(r.ano, r.candidaturaId), candidate = catalog.get(id)
  check(candidate && !seen.has(id), `Candidatura desconhecida ou duplicada: ${id}`); seen.add(id)
  check(COVERAGE_STATES.includes(r.estado), `Estado de cobertura inválido: ${id}`)
  summary.porAno[r.ano] ??= counts()
  summary.porAno[r.ano][r.estado]++
  const previous = old.get(id)
  const expectedLegacy = previous && previous.estado !== 'nao_iniciado' ? legacyFields(previous) : null
  assert.deepEqual(r.legado, expectedLegacy, `${id}: histórico legado alterado ou inventado`)
  const pending = expectedLegacy !== null || approved.has(id)
  if (approved.has(id) && previous?.estado === 'nao_iniciado') summary.divergenciasLegado.push({ ano: r.ano, candidaturaId: r.candidaturaId, motivo: 'publicacao_com_nao_iniciado_no_legado' })
  check(Array.isArray(r.consultas) && Array.isArray(r.revisoes), `${id}: consultas e revisões devem ser listas`)
  const reviewContext = { candidate, atualizadoEm: data.metadados.atualizadoEm, queryIds, reviewIds }
  const byId = validateQueries(r.consultas, reviewContext)
  const lastReview = validateReviews(r.revisoes, byId, reviewContext)
  if (r.estado === 'nao_iniciado') {
   check(!pending && r.consultas.length === 0 && r.revisoes.length === 0, `${id}: não iniciado incompatível com histórico ou publicação`)
  } else if (r.estado === 'pendente_documentacao') {
   check(pending && r.consultas.length === 0 && r.revisoes.length === 0, `${id}: pendência deve representar histórico sem consultas rastreáveis`)
   summary.pendenciasDocumentacao.push({ ano: r.ano, candidaturaId: r.candidaturaId })
  } else {
   check(r.consultas.length > 0, `${id}: progresso sem consulta rastreável`)
   if (r.estado === 'triagem_inicial') check(r.revisoes.length === 0, 'Triagem não pode apagar revisão anterior')
   if (r.estado === 'revisao_concluida') {
    check(lastReview, `${id}: conclusão sem revisão documentada`)
    const required = completeQueries(r.consultas, candidate, lastReview.data)
    check(required.every(q => lastReview.consultasIds.includes(q.id)), 'Conclusão ignora uma consulta posterior')
    if (lastReview.proximaRevisao <= dataReferencia) summary.revisoesVencidas.push({ ano: r.ano, candidaturaId: r.candidaturaId, proximaRevisao: lastReview.proximaRevisao })
   }
  }
 }
 return summary
}

/** Initialize once, then only add new candidates. Never discard existing consultations. */
export function syncCoverage(existing, { cadastros, legado, ocorrencias, origemLegado, atualizadoEm }) {
 date(atualizadoEm, 'atualizadoEm')
 const catalog = indexCatalogs(cadastros), approved = published(ocorrencias)
 const old = new Map(legado.registros.map(r => [key(2022, r.candidaturaId), r]))
 const data = existing ? structuredClone(existing) : { metadados: { versao: 2, protocolo: 'pesquisa-documental-v1', atualizadoEm,
  recortes: [], total: 0, origemLegado }, registros: [] }
 if (existing) check(existing.metadados.atualizadoEm <= atualizadoEm, 'Sincronização com data anterior ao controle')
 let changed = existing === null || existing === undefined
 const known = new Set()
 for (const r of data.registros) {
  const id = key(r.ano, r.candidaturaId)
  check(catalog.has(id), `${id}: cadastro retirou candidatura; reconciliação manual necessária para preservar histórico`)
  check(!known.has(id), `Cobertura duplicada: ${id}`); known.add(id)
  if (r.estado === 'nao_iniciado' && approved.has(id)) { r.estado = 'pendente_documentacao'; changed = true }
 }
 for (const [id, candidate] of catalog) if (!known.has(id)) {
  changed = true
  const previous = old.get(id)
  const legacy = previous && previous.estado !== 'nao_iniciado' ? legacyFields(previous) : null
  data.registros.push({ ano: candidate.ano, candidaturaId: String(candidate.id),
   estado: legacy || approved.has(id) ? 'pendente_documentacao' : 'nao_iniciado', consultas: [], revisoes: [], legado: legacy })
 }
 data.metadados.total = data.registros.length
 data.metadados.recortes = [...new Set([...catalog.values()].map(p => p.ano))].sort()
 if (changed) data.metadados.atualizadoEm = atualizadoEm
 return data
}

/** A trusted previous snapshot is needed to detect silent loss of editorial work. */
export function validateCoverageTransition(previous, next, context) {
 const summary = validateCoverage(next, context)
 assert.equal(previous.metadados.versao, 2)
 assert.deepEqual(previous.metadados.origemLegado, next.metadados.origemLegado, 'Origem legada alterada entre versões')
 check(previous.metadados.atualizadoEm <= next.metadados.atualizadoEm, 'Controle atualizado com data anterior')
 const current = new Map(next.registros.map(r => [key(r.ano, r.candidaturaId), r]))
 const seen = new Set()
 for (const old of previous.registros) {
  const id = key(old.ano, old.candidaturaId)
  check(!seen.has(id), `Snapshot anterior duplicado: ${id}`); seen.add(id)
  const record = current.get(id)
  check(record, `${id}: cobertura publicada removida`)
  assert.deepEqual(record.legado, old.legado, `${id}: histórico legado alterado`)
  const queries = new Map(record.consultas.map(q => [q.id, q]))
  const oldIds = new Set(old.consultas.map(q => q.id))
  for (const query of old.consultas) assert.deepEqual(queries.get(query.id), query, `${id}: consulta publicada alterada ou removida`)
  const highestSequence = Math.max(0, ...old.consultas.map(q => q.sequencia))
  for (const query of record.consultas) if (!oldIds.has(query.id)) check(query.sequencia > highestSequence, `${id}: nova consulta inserida antes do histórico publicado`)
  assert.deepEqual(record.revisoes.slice(0, old.revisoes.length), old.revisoes, `${id}: revisão publicada alterada ou removida`)
 }
 return summary
}
