export const eventLabels = Object.freeze({
 pedido_apuracao: 'Pedido de apuração', abertura_investigacao: 'Abertura de investigação',
 denuncia_oferecida: 'Denúncia oferecida', denuncia_recebida: 'Denúncia recebida', denuncia_rejeitada: 'Denúncia rejeitada',
 acao_em_andamento: 'Ação em andamento', condenacao: 'Condenação', absolvicao: 'Absolvição', arquivamento: 'Arquivamento',
 extincao_sem_merito: 'Extinção sem mérito', decisao_outro: 'Decisão judicial', recurso_interposto: 'Recurso interposto',
 julgamento_recurso: 'Julgamento de recurso', transito_em_julgado: 'Trânsito em julgado', retificacao: 'Retificação'
})
export const relationLabels = Object.freeze({ recurso_de: 'Recurso do ato de', reforma_de: 'Reforma do ato de', retifica: 'Retifica o ato de', desdobramento_de: 'Desdobramento do ato de' })

const fail = message => { throw new Error(message) }
const check = (condition, message) => { if (!condition) fail(message) }
const text = value => typeof value === 'string' && value.trim().length > 0
const isDate = value => {
 if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
 const parsed = new Date(value + 'T00:00:00Z')
 return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}
const canonical = value => {
 if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
 if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}'
 return JSON.stringify(value)
}

/** Check that the separately fetched package belongs to this migration manifest. */
export async function loadCaseTimelines(baseUrl, { fetcher = fetch, signal } = {}) {
 const paths = ['casos-v2.json', 'migracao-v1-v2.json']
 const responses = await Promise.all(paths.map(path => fetcher(baseUrl + 'data/' + path, { signal })))
 check(responses.every(response => response.ok), 'Linha do tempo indisponível')
 const [bytes, manifest] = await Promise.all([responses[0].arrayBuffer(), responses[1].json()])
 const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
 const hash = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('')
 check(manifest.destinoSha256 === hash, 'Pacote e manifesto de versões diferentes')
 return { data: JSON.parse(new TextDecoder().decode(bytes)), manifest }
}

/** Build views only through reviewed IDs; never infer identity or a final case outcome. */
export function createTimelineIndex({ data, manifest }, legacy) {
 check(data?.metadados?.versao === 2 && data.metadados.finalidade === 'publicacao', 'Pacote público v2 obrigatório')
 check(manifest?.versao === 1 && manifest.finalidade === 'publicacao' && manifest.revisao?.liberacaoPublica === true,
  'Manifesto aprovado obrigatório')
 check(isDate(data.metadados.atualizadoEm), 'Data de revisão inválida')
 check(text(data.metadados.escopo) && text(data.metadados.limites), 'Escopo e limites obrigatórios')
 const maps = {}
 for (const name of ['pessoas', 'candidaturas', 'casos', 'processos', 'participacoes', 'fontes', 'eventos']) {
  check(Array.isArray(data[name]) && data[name].length > 0, 'Coleção v2 ausente')
  maps[name] = new Map()
  for (const row of data[name]) {
   check(text(row.id) && !maps[name].has(row.id) && row.statusEditorial === 'publicado' && row.revisao?.liberacaoPublica === true,
    'Entidade v2 ausente, duplicada ou não aprovada')
   maps[name].set(row.id, row)
  }
 }
 for (const source of maps.fontes.values()) {
  const url = new URL(source.url)
  check(url.protocol === 'https:' && !url.username && !url.password, 'Fonte insegura')
  for (const field of ['titulo', 'instituicao', 'localizador']) check(text(source[field]), 'Fonte incompleta')
  check(isDate(source.dataConsulta), 'Data de consulta inválida')
 }
 check(Array.isArray(manifest.correspondencias), 'Correspondências ausentes')
 const originals = new Map(legacy.ocorrencias.map(row => [row.id, row]))
 const index = new Map()
 for (const mapping of manifest.correspondencias) {
  check(['identidade', 'textosELimites', 'resultadosEDefesa', 'recursosETransito', 'fontesEDatas'].every(key => mapping.conferencias?.[key] === true), 'Conferência da migração ausente')
  const original = originals.get(mapping.ocorrenciaId)
  const candidate = maps.candidaturas.get(mapping.candidaturaId)
  const participation = maps.participacoes.get(mapping.participacaoId)
  check(original?.statusEditorial === 'publicado' && !index.has(original.id), 'Origem ausente ou repetida')
  check(canonical(original) === canonical(mapping.registroOriginal), 'Registro v1 diferente do legado revisado')
  check(candidate?.ano === 2022 && candidate.tseId === original.candidaturaId && participation?.pessoaId === candidate.pessoaId,
   'Associação de identidade incompatível')
  check(maps.pessoas.has(candidate.pessoaId) && maps.casos.has(participation.casoId), 'Pessoa ou caso inexistente')
  check(Array.isArray(mapping.eventosIds) && mapping.eventosIds.length > 0 && new Set(mapping.eventosIds).size === mapping.eventosIds.length,
   'Eventos ausentes ou repetidos')
  const events = mapping.eventosIds.map(id => {
   const event = maps.eventos.get(id)
   const process = maps.processos.get(event?.processoId)
   check(event?.participacaoId === participation.id && event.casoId === participation.casoId && process?.casoId === event.casoId,
    'Evento de outra participação ou processo')
   for (const field of ['tipo', 'data', 'descricao', 'limites']) check(text(event[field]), 'Evento incompleto')
   check(isDate(event.data) && Number.isSafeInteger(event.ordemNoDia), 'Data ou ordem do evento inválida')
   check(Object.hasOwn(eventLabels,event.tipo), 'Tipo de evento inválido')
   check(text(process.orgao) && text(process.classe) && (process.numero === null || text(process.numero)), 'Processo incompleto')
   for (const field of ['defesa', 'recurso', 'transitoEmJulgado']) {
    check(text(event[field]?.situacao) && Array.isArray(event[field].fontesIds), 'Contexto do evento incompleto')
   }
   check(['nao_verificado', 'confirmado'].includes(event.transitoEmJulgado.situacao), 'Estado de trânsito inválido')
   if (event.transitoEmJulgado.situacao === 'confirmado') check(isDate(event.transitoEmJulgado.data), 'Data de trânsito inválida')
   check(text(event.defesa.descricao) && text(event.recurso.descricao), 'Defesa ou recurso incompleto')
   check(Array.isArray(event.fontesIds) && event.fontesIds.length > 0, 'Evento sem fontes')
   const ids = new Set([...event.fontesIds, ...event.defesa.fontesIds, ...event.recurso.fontesIds, ...event.transitoEmJulgado.fontesIds])
   const sources = [...ids].map(id => {
    const source = maps.fontes.get(id)
    check(source, 'Fonte inexistente')
    return source
   })
   const imputation = event.imputacaoId === null ? null : participation.imputacoes?.find(row => row.id === event.imputacaoId)
   check(event.imputacaoId === null || text(imputation?.descricao), 'Imputação de outra participação')
   let relation = null
   if (event.relacao !== null) {
    const prior = maps.eventos.get(event.relacao?.eventoId)
    check(Object.hasOwn(relationLabels,event.relacao?.tipo) && text(event.relacao.justificativa), 'Relação inválida')
    check(prior?.participacaoId === participation.id && prior.casoId === event.casoId && prior.imputacaoId === event.imputacaoId,
     'Relação de outro participante ou imputação')
    check(isDate(prior.data) && Object.hasOwn(eventLabels,prior.tipo) &&
     (prior.data < event.data || (prior.data === event.data && prior.ordemNoDia < event.ordemNoDia)), 'Relação sem ato anterior')
    relation = { type: event.relacao.tipo, date: prior.data, eventType: prior.tipo, justification: event.relacao.justificativa }
   }
   return { ...event, process, sources, imputation, relation }
  }).sort((a, b) => a.data.localeCompare(b.data) || a.ordemNoDia - b.ordemNoDia || a.id.localeCompare(b.id))
  index.set(original.id, { events, reviewedAt: data.metadados.atualizadoEm, scope: data.metadados.escopo, limits: data.metadados.limites })
 }
 return index
}
