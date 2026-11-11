import assert from 'node:assert/strict'
import { assertIsoDate as date } from './iso-date.mjs'

const TYPES = new Set(['pedido_apuracao', 'abertura_investigacao', 'denuncia_oferecida',
 'denuncia_recebida', 'denuncia_rejeitada', 'acao_em_andamento', 'condenacao', 'absolvicao',
 'arquivamento', 'extincao_sem_merito', 'decisao_outro', 'recurso_interposto',
 'julgamento_recurso', 'transito_em_julgado', 'retificacao'])
const DECISIONS = new Set(['denuncia_recebida', 'denuncia_rejeitada', 'condenacao', 'absolvicao',
 'arquivamento', 'extincao_sem_merito', 'decisao_outro', 'julgamento_recurso'])
const COLLECTIONS = ['pessoas', 'candidaturas', 'casos', 'processos', 'participacoes', 'fontes', 'eventos']
const COMMON = ['id', 'statusEditorial', 'revisao']
const fail = (condition, message) => assert.ok(condition, message)
const text = (value, name, minimum = 3) => fail(typeof value === 'string' && value.trim().length >= minimum, `${name}: texto obrigatório`)
const id = (value, name) => fail(typeof value === 'string' && /^[a-z][a-z0-9-]{2,79}$/.test(value), `${name}: ID inválido`)
const oneOf = (value, allowed, name) => fail(allowed.includes(value), `${name}: valor inválido`)
function keys(object, allowed, name) {
 fail(object !== null && typeof object === 'object' && !Array.isArray(object), `${name}: objeto obrigatório`)
 for (const key of Object.keys(object)) fail(allowed.includes(key), `${name}: campo não permitido ${key}`)
 for (const key of allowed) fail(Object.hasOwn(object, key), `${name}: campo obrigatório ${key}`)
}

const canonical = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '')
const order = (a, b) => a.data.localeCompare(b.data) || a.ordemNoDia - b.ordemNoDia || a.id.localeCompare(b.id)

/** Validate a proposed public snapshot. No file writes, filtering or automatic approval. */
export function validateCasosV2(data, { exemplo = false, cadastros = [] } = {}) {
 keys(data, ['metadados', ...COLLECTIONS], 'pacote')
 keys(data.metadados, ['versao', 'finalidade', 'atualizadoEm', 'escopo', 'limites'], 'metadados')
 assert.equal(data.metadados.versao, 2, 'Versão do contrato deve ser 2')
 assert.equal(data.metadados.finalidade, exemplo ? 'exemplo_ficticio' : 'publicacao', 'Finalidade incompatível com o modo de validação')
 date(data.metadados.atualizadoEm, 'metadados.atualizadoEm')
 text(data.metadados.escopo, 'metadados.escopo')
 text(data.metadados.limites, 'metadados.limites')
 const maps = {}
 for (const name of COLLECTIONS) {
  fail(Array.isArray(data[name]) && data[name].length > 0, `${name}: lista não vazia obrigatória`)
  maps[name] = new Map()
  for (const item of data[name]) {
   id(item?.id, name)
   fail(!maps[name].has(item.id), `${name}: ID duplicado ${item.id}`)
   maps[name].set(item.id, item)
  }
 }
 const ref = (name, value) => {
  fail(maps[name].has(value), `${name}: referência inexistente ${value}`)
  return maps[name].get(value)
 }
 const refs = (name, values, label, minimum = 1) => {
  fail(Array.isArray(values) && values.length >= minimum, `${label}: referências obrigatórias`)
  fail(new Set(values).size === values.length, `${label}: referência duplicada`)
  return values.map(value => ref(name, value))
 }
 const review = item => {
  assert.equal(item.statusEditorial, 'publicado', `${item.id}: somente registros publicados`)
  keys(item.revisao, ['responsavel', 'data', 'justificativa', 'liberacaoPublica'], `${item.id}.revisao`)
  text(item.revisao.responsavel, 'revisao.responsavel')
  text(item.revisao.justificativa, 'revisao.justificativa')
  date(item.revisao.data, 'revisao.data')
  fail(item.revisao.data <= data.metadados.atualizadoEm, `${item.id}: revisão posterior ao pacote`)
  assert.equal(item.revisao.liberacaoPublica, true, `${item.id}: aprovação pública ausente`)
 }
 const sources = (values, owner, minimum = 1, official = false) => {
  const found = refs('fontes', values, `${owner.id}.fontesIds`, minimum)
  for (const f of found) fail(f.dataConsulta <= owner.revisao.data, `${owner.id}: consulta posterior à revisão`)
  if (official) fail(found.some(f => f.tipo === 'oficial'), `${owner.id}: fonte oficial obrigatória`)
  return found
 }
 const sourceKeys = new Set()
 for (const f of data.fontes) {
  keys(f, [...COMMON, 'url', 'titulo', 'instituicao', 'tipo', 'dataPublicacao', 'dataConsulta', 'localizador', 'sha256'], 'fonte')
  review(f)
  const url = new URL(f.url)
  fail(url.protocol === 'https:' && !url.username && !url.password, `${f.id}: fonte deve usar HTTPS sem credenciais`)
  text(f.titulo, 'fonte.titulo'); text(f.instituicao, 'fonte.instituicao'); text(f.localizador, 'fonte.localizador')
  oneOf(f.tipo, ['oficial', 'imprensa', 'outro'], 'fonte.tipo')
  if (!exemplo && f.tipo === 'oficial') {
   fail(['jus.br', 'mp.br', 'gov.br', 'leg.br'].some(domain =>
    url.hostname === domain || url.hostname.endsWith('.' + domain)), `${f.id}: domínio não reconhecido como oficial no contrato v2`)
  }
  date(f.dataConsulta, 'fonte.dataConsulta')
  fail(f.dataConsulta <= f.revisao.data, `${f.id}: consulta posterior à revisão`)
  if (f.dataPublicacao !== null) {
   date(f.dataPublicacao, 'fonte.dataPublicacao')
   fail(f.dataPublicacao <= f.dataConsulta, `${f.id}: publicação posterior à consulta`)
  }
  fail(f.sha256 === null || (typeof f.sha256 === 'string' && /^[a-f0-9]{64}$/.test(f.sha256)), `${f.id}: hash inválido`)
  const key = JSON.stringify([url.href, f.dataConsulta, f.localizador, f.sha256])
  fail(!sourceKeys.has(key), `${f.id}: fonte duplicada; reutilize seu ID`)
  sourceKeys.add(key)
 }
 for (const p of data.pessoas) {
  keys(p, [...COMMON, 'nome', 'identidade'], 'pessoa'); review(p); text(p.nome, 'pessoa.nome')
  keys(p.identidade, ['estado', 'metodo', 'fontesIds'], 'pessoa.identidade')
  assert.equal(p.identidade.estado, 'confirmada', `${p.id}: identidade não confirmada`)
  text(p.identidade.metodo, 'pessoa.identidade.metodo')
  sources(p.identidade.fontesIds, p, 1, true)
 }
 const electoral = new Map()
 for (const cadastro of cadastros) for (const p of cadastro.pessoas) {
  const key = `${p.ano}:${p.id}`
  fail(!electoral.has(key), `Cadastro eleitoral duplicado ${key}`)
  electoral.set(key, p)
 }
 const candidacyKeys = new Set()
 const ufs = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO BR'.split(' '))
 const cargos = ['PRESIDENTE', 'GOVERNADOR', 'SENADOR', 'DEPUTADO FEDERAL', 'DEPUTADO ESTADUAL', 'DEPUTADO DISTRITAL']
 for (const c of data.candidaturas) {
  keys(c, [...COMMON, 'tseId', 'ano', 'pessoaId', 'uf', 'cargo', 'partido', 'fontesIds'], 'candidatura')
  review(c); ref('pessoas', c.pessoaId)
  fail(typeof c.tseId === 'string' && /^\d{8,16}$/.test(c.tseId), `${c.id}: identificador TSE inválido`)
  fail(Number.isInteger(c.ano) && [2022, 2026].includes(c.ano), `${c.id}: ano fora do recorte`)
  fail(c.ano <= Number(data.metadados.atualizadoEm.slice(0, 4)), `${c.id}: candidatura posterior ao pacote`)
  fail(ufs.has(c.uf), `${c.id}: UF inválida`); oneOf(c.cargo, cargos, 'candidatura.cargo')
  assert.equal(c.uf === 'BR', c.cargo === 'PRESIDENTE', `${c.id}: abrangência incompatível com cargo`)
  text(c.partido, 'candidatura.partido', 2); sources(c.fontesIds, c, 1, true)
  const key = `${c.ano}:${c.tseId}`
  fail(!candidacyKeys.has(key), `${c.id}: candidatura duplicada ou associada a duas pessoas`)
  candidacyKeys.add(key)
  if (!exemplo) {
   fail(electoral.has(key), `${c.id}: candidatura ausente dos cadastros eleitorais fornecidos`)
   for (const field of ['uf', 'cargo', 'partido']) assert.equal(c[field], electoral.get(key)[field], `${c.id}: ${field} diverge do cadastro`)
  }
 }
 for (const p of data.pessoas) fail(data.candidaturas.some(c => c.pessoaId === p.id), `${p.id}: pessoa sem candidatura no recorte`)
 for (const c of data.casos) {
  keys(c, [...COMMON, 'titulo', 'resumo', 'categoria', 'periodoFatos', 'limites'], 'caso'); review(c)
  text(c.titulo, 'caso.titulo'); text(c.resumo, 'caso.resumo'); text(c.limites, 'caso.limites')
  oneOf(c.categoria, ['eleitoral', 'penal', 'civel', 'administrativa', 'outra'], 'caso.categoria')
  keys(c.periodoFatos, ['inicio', 'fim', 'descricao'], 'caso.periodoFatos')
  text(c.periodoFatos.descricao, 'caso.periodoFatos.descricao')
  for (const k of ['inicio', 'fim']) if (c.periodoFatos[k] !== null) {
   date(c.periodoFatos[k], `periodoFatos.${k}`)
   fail(c.periodoFatos[k] <= data.metadados.atualizadoEm, `${c.id}: fatos posteriores à consulta do pacote`)
  }
  if (c.periodoFatos.inicio !== null && c.periodoFatos.fim !== null) fail(c.periodoFatos.inicio <= c.periodoFatos.fim, `${c.id}: período invertido`)
 }
 const processKeys = new Set()
 for (const p of data.processos) {
  keys(p, [...COMMON, 'casoId', 'orgao', 'classe', 'numero', 'motivoNumeroIndisponivel', 'instancia', 'processoOrigemId', 'fontesIds'], 'processo')
  review(p); ref('casos', p.casoId)
  text(p.orgao, 'processo.orgao', 2); text(p.classe, 'processo.classe', 2); text(p.instancia, 'processo.instancia')
  if (p.numero === null) text(p.motivoNumeroIndisponivel, 'processo.motivoNumeroIndisponivel')
  else {
   text(p.numero, 'processo.numero', 1); assert.equal(p.motivoNumeroIndisponivel, null, `${p.id}: motivo exige número nulo`)
   const key = JSON.stringify([canonical(p.orgao), canonical(p.classe), canonical(p.numero)])
   fail(!processKeys.has(key), `${p.id}: processo duplicado`); processKeys.add(key)
  }
  sources(p.fontesIds, p, 1, true)
  const seen = new Set([p.id])
  let parent = p
  while (parent.processoOrigemId !== null) {
   parent = ref('processos', parent.processoOrigemId)
   assert.equal(parent.casoId, p.casoId, `${p.id}: processo de origem pertence a outro caso`)
   fail(!seen.has(parent.id), `${p.id}: ciclo entre processos`); seen.add(parent.id)
  }
 }
 const participationKeys = new Set()
 for (const p of data.participacoes) {
  keys(p, [...COMMON, 'casoId', 'pessoaId', 'descricaoVinculo', 'partidoNosFatos', 'motivoPartidoDesconhecido', 'imputacoes', 'fontesIds'], 'participacao')
  review(p); ref('casos', p.casoId); ref('pessoas', p.pessoaId)
  text(p.descricaoVinculo, 'participacao.descricaoVinculo'); sources(p.fontesIds, p, 1, true)
  if (p.partidoNosFatos === null) text(p.motivoPartidoDesconhecido, 'participacao.motivoPartidoDesconhecido')
  else { text(p.partidoNosFatos, 'participacao.partidoNosFatos', 2); assert.equal(p.motivoPartidoDesconhecido, null) }
  const key = JSON.stringify([p.casoId, p.pessoaId])
  fail(!participationKeys.has(key), `${p.id}: participação duplicada`); participationKeys.add(key)
  fail(Array.isArray(p.imputacoes), `${p.id}: imputações devem ser lista, inclusive vazia`)
  const seen = new Set()
  for (const charge of p.imputacoes) {
   keys(charge, ['id', 'descricao'], 'imputacao'); id(charge.id, 'imputacao'); text(charge.descricao, 'imputacao.descricao')
   fail(!seen.has(charge.id), `${p.id}: imputação duplicada`); seen.add(charge.id)
  }
 }
 const actKeys = new Set(), dayKeys = new Set()
 for (const e of data.eventos) {
  keys(e, [...COMMON, 'atoId', 'casoId', 'processoId', 'participacaoId', 'imputacaoId', 'tipo', 'data', 'ordemNoDia',
   'descricao', 'fontesIds', 'defesa', 'recurso', 'transitoEmJulgado', 'relacao', 'limites', 'verificacaoAtualizacao'], 'evento')
  review(e); id(e.atoId, 'evento.atoId'); fail(TYPES.has(e.tipo), `${e.id}: tipo de evento inválido`)
  date(e.data, 'evento.data'); fail(e.data <= e.revisao.data, `${e.id}: ato posterior à revisão`)
  fail(Number.isSafeInteger(e.ordemNoDia) && e.ordemNoDia > 0, `${e.id}: ordem no dia inválida`)
  text(e.descricao, 'evento.descricao'); text(e.limites, 'evento.limites')
  assert.equal(e.verificacaoAtualizacao, true, `${e.id}: atualização não conferida`)
  const p = ref('participacoes', e.participacaoId), process = ref('processos', e.processoId)
  ref('casos', e.casoId)
  assert.equal(p.casoId, e.casoId, `${e.id}: participação em outro caso`)
  assert.equal(process.casoId, e.casoId, `${e.id}: processo em outro caso`)
  fail(e.imputacaoId === null || p.imputacoes.some(c => c.id === e.imputacaoId), `${e.id}: imputação inexistente na participação`)
  const used = sources(e.fontesIds, e, 1, true)
  for (const f of used) fail(e.data <= f.dataConsulta, `${e.id}: consulta anterior ao ato`)
  const actKey = JSON.stringify([e.atoId, e.participacaoId, e.imputacaoId, e.tipo])
  fail(!actKeys.has(actKey), `${e.id}: ato duplicado para a mesma participação/imputação`); actKeys.add(actKey)
  const dayKey = JSON.stringify([e.participacaoId, e.data, e.ordemNoDia])
  fail(!dayKeys.has(dayKey), `${e.id}: ordem ambígua no mesmo dia`); dayKeys.add(dayKey)
  keys(e.defesa, ['situacao', 'descricao', 'fontesIds'], 'evento.defesa')
  oneOf(e.defesa.situacao, ['registrada', 'nao_localizada', 'nao_aplicavel'], 'defesa.situacao')
  text(e.defesa.descricao, 'defesa.descricao')
  sources(e.defesa.fontesIds, e, e.defesa.situacao === 'registrada' ? 1 : 0)
  keys(e.recurso, ['situacao', 'descricao', 'fontesIds'], 'evento.recurso')
  oneOf(e.recurso.situacao, ['nao_verificado', 'pendente', 'nao_interposto', 'julgado', 'nao_aplicavel'], 'recurso.situacao')
  text(e.recurso.descricao, 'recurso.descricao')
  sources(e.recurso.fontesIds, e, ['pendente', 'nao_interposto', 'julgado'].includes(e.recurso.situacao) ? 1 : 0,
   ['pendente', 'nao_interposto', 'julgado'].includes(e.recurso.situacao))
  keys(e.transitoEmJulgado, ['situacao', 'data', 'fontesIds'], 'evento.transitoEmJulgado')
  oneOf(e.transitoEmJulgado.situacao, ['nao_verificado', 'confirmado'], 'transito.situacao')
  if (e.transitoEmJulgado.situacao === 'confirmado') {
   date(e.transitoEmJulgado.data, 'transito.data')
   fail(e.data <= e.transitoEmJulgado.data && e.transitoEmJulgado.data <= e.revisao.data, `${e.id}: data de trânsito incompatível`)
   fail(!['pendente', 'nao_verificado'].includes(e.recurso.situacao), `${e.id}: trânsito incompatível com recurso`)
   const proof = sources(e.transitoEmJulgado.fontesIds, e, 1, true)
   for (const f of proof) fail(e.transitoEmJulgado.data <= f.dataConsulta, `${e.id}: consulta anterior ao trânsito comprovado`)
  } else {
   assert.equal(e.transitoEmJulgado.data, null, `${e.id}: trânsito desconhecido não admite data`)
   refs('fontes', e.transitoEmJulgado.fontesIds, 'transito.fontesIds', 0)
   assert.equal(e.transitoEmJulgado.fontesIds.length, 0, `${e.id}: trânsito desconhecido não admite comprovação`)
  }
  if (e.tipo === 'transito_em_julgado') assert.equal(e.transitoEmJulgado.situacao, 'confirmado', `${e.id}: trânsito exige comprovação`)
  if (e.relacao !== null) {
   keys(e.relacao, ['tipo', 'eventoId', 'justificativa'], 'evento.relacao')
   oneOf(e.relacao.tipo, ['recurso_de', 'reforma_de', 'retifica', 'desdobramento_de'], 'relacao.tipo')
   text(e.relacao.justificativa, 'relacao.justificativa')
   const previous = ref('eventos', e.relacao.eventoId)
   assert.equal(previous.participacaoId, e.participacaoId, `${e.id}: relação com outra pessoa/participação`)
   assert.equal(previous.casoId, e.casoId, `${e.id}: relação com outro caso`)
   assert.equal(previous.imputacaoId, e.imputacaoId, `${e.id}: relação com outra imputação`)
   fail(order(previous, e) < 0 && (previous.data !== e.data || previous.ordemNoDia < e.ordemNoDia), `${e.id}: relação deve apontar para ato anterior`)
   if (['recurso_de', 'reforma_de'].includes(e.relacao.tipo)) fail(DECISIONS.has(previous.tipo), `${e.id}: recurso/reforma exige decisão anterior`)
   if (e.relacao.tipo === 'reforma_de') fail(DECISIONS.has(e.tipo), `${e.id}: reforma exige nova decisão`)
   if (e.relacao.tipo === 'recurso_de') assert.equal(e.tipo, 'recurso_interposto', `${e.id}: relação de recurso exige interposição`)
   if (e.relacao.tipo === 'retifica') assert.equal(e.tipo, 'retificacao', `${e.id}: retificação deve ser evento próprio`)
  }
  if (e.tipo === 'retificacao') assert.equal(e.relacao?.tipo, 'retifica', `${e.id}: retificação exige referência e justificativa`)
  if (e.tipo === 'recurso_interposto') assert.equal(e.relacao?.tipo, 'recurso_de', `${e.id}: recurso exige decisão referenciada`)
 }
 for (const p of data.participacoes) fail(data.eventos.some(e => e.participacaoId === p.id), `${p.id}: participação sem eventos`)
 for (const p of data.processos) fail(data.eventos.some(e => e.processoId === p.id), `${p.id}: processo sem eventos`)
 for (const c of data.casos) fail(data.eventos.some(e => e.casoId === c.id), `${c.id}: caso sem eventos`)
 return { pessoas: data.pessoas.length, casos: data.casos.length, eventos: data.eventos.length }
}

/** Compare against the last approved snapshot, preserving published evidence and attribution. */
export function validateTransicaoV2(previous, next, options) {
 validateCasosV2(previous, options)
 const summary = validateCasosV2(next, options)
 fail(previous.metadados.atualizadoEm <= next.metadados.atualizadoEm, 'Pacote novo anterior ao snapshot aprovado')
 for (const name of ['eventos', 'fontes']) {
  const current = new Map(next[name].map(item => [item.id, item]))
  for (const item of previous[name]) {
   fail(current.has(item.id), `${name}: registro publicado removido ${item.id}`)
   assert.deepEqual(current.get(item.id), item, `${name}: registro publicado alterado ${item.id}; acrescente evento de retificação ou novo registro`)
  }
 }
 for (const [name, fields] of [
  ['participacoes', ['casoId', 'pessoaId']],
  ['processos', ['casoId', 'orgao', 'classe', 'instancia']],
  ['candidaturas', ['tseId', 'ano', 'pessoaId', 'uf', 'cargo', 'partido']]
 ]) {
  const current = new Map(next[name].map(item => [item.id, item]))
  for (const item of previous[name]) {
   fail(current.has(item.id), `${name}: registro publicado removido ${item.id}`)
   const newer = current.get(item.id)
   for (const field of fields) assert.deepEqual(newer[field], item[field], `${item.id}: associação publicada alterada (${field})`)
   if (name === 'processos' && item.numero !== null) assert.equal(newer.numero, item.numero, `${item.id}: número publicado alterado`)
   for (const source of item.fontesIds) fail(newer.fontesIds.includes(source), `${item.id}: proveniência publicada removida`)
   if (name === 'participacoes') for (const charge of item.imputacoes) {
    assert.deepEqual(newer.imputacoes.find(c => c.id === charge.id), charge, `${item.id}: imputação publicada alterada ou removida`)
   }
  }
 }
 for (const name of ['pessoas', 'casos']) {
  const current = new Set(next[name].map(item => item.id))
  for (const item of previous[name]) fail(current.has(item.id), `${name}: ID publicado removido ${item.id}`)
 }
 return summary
}

/** A timeline is a view of documented events, never a score or inference of current guilt. */
export function timelineV2(data, participacaoId, options) {
 validateCasosV2(data, options)
 fail(data.participacoes.some(p => p.id === participacaoId), 'Participação inexistente')
 return structuredClone(data.eventos.filter(e => e.participacaoId === participacaoId).sort(order))
}
