import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { syncCoverage, validateCoverage, validateLegacyCoverage, validateCoverageTransition } from '../scripts/lib/coverage.mjs'
import { loadCoverageInputs, readCoverage } from '../scripts/lib/coverage-files.mjs'

function fixture() {
 const makeCandidate = (id, ano, nome, uf) => ({ id, ano, nome, uf, cargo: 'DEPUTADO FEDERAL' })
 const cadastros = [
  { pessoas: [makeCandidate('00000000001', 2022, 'Pessoa fictícia Ana', 'SP'), makeCandidate('00000000002', 2022, 'Pessoa fictícia Bia', 'RJ')] },
  { pessoas: [makeCandidate('00000000003', 2026, 'Pessoa fictícia Caio', 'SP')] }
 ]
 const legado = { metadados: { versao: 1, atualizadoEm: '2026-10-21', total: 2, triagemInicial: 0, emRevisao: 1, revisaoConcluida: 0 },
  registros: cadastros[0].pessoas.map((p, i) => ({ candidaturaId: p.id, nome: p.nome, uf: p.uf, cargo: p.cargo,
   estado: i === 0 ? 'em_revisao' : 'nao_iniciado', atualizadoEm: i === 0 ? '2026-10-21' : null, verificadoIntegralmenteEm: null })) }
 const ocorrencias = { ocorrencias: [{ id: 'ocorrencia-ficticia', candidaturaId: '00000000002', statusEditorial: 'publicado' }] }
 const origemLegado = { arquivo: 'fixture-legado.json', sha256: createHash('sha256').update(JSON.stringify(legado)).digest('hex') }
 const context = { cadastros, legado, ocorrencias, origemLegado, atualizadoEm: '2026-11-11', dataReferencia: '2026-11-11' }
 return { context, data: syncCoverage(null, context) }
}
function completed() {
 const { context, data } = fixture(), r = data.registros[2]
 const entries = [
  ['stf', 'BR', 'https://portal.stf.jus.br/'], ['stj', 'BR', 'https://www.stj.jus.br/'],
  ['justica_eleitoral', 'BR', 'https://www.tse.jus.br/'], ['justica_eleitoral', 'SP', 'https://www.tre-sp.jus.br/'],
  ['justica_estadual', 'SP', 'https://www.tjsp.jus.br/'], ['justica_federal', 'SP', 'https://www.trf3.jus.br/'],
  ['ministerio_publico', 'BR', 'https://www.mpf.mp.br/'], ['ministerio_publico', 'SP', 'https://www.mpsp.mp.br/'],
  ['policia_federal', 'BR', 'https://www.gov.br/pf/pt-br']
 ]
 // Invented consultations about fictitious candidates. No real source visit is asserted.
 r.consultas = entries.map(([grupo, abrangencia, url], i) => ({ id: `consulta-ficticia-${i + 1}`, sequencia: i + 1,
  fonte: { grupo, orgao: 'Órgão fictício para teste', url }, abrangencia, dataConsulta: '2026-11-01',
  responsavel: 'Pesquisador fictício', escopo: 'Consulta simulada para teste do protocolo.', limitacoes: 'Exemplo sem pesquisa real, sem conclusão jurídica.',
  resultado: 'realizada', proximaRevisao: '2026-12-01',
  revisao: { responsavel: 'Revisora fictícia', data: '2026-11-02', liberacaoPublica: true } }))
 r.revisoes = [{ id: 'revisao-ficticia', data: '2026-11-02', responsavel: 'Revisora fictícia', escopo: 'Escopo fictício completo conforme protocolo.',
  limitacoes: 'Conclusão do trabalho delimitado, não certidão de ausência de processos.', consultasIds: r.consultas.map(q => q.id),
  proximaRevisao: '2026-11-25', liberacaoPublica: true }]
 r.estado = 'revisao_concluida'
 return { context, data, record: r }
}

test('migração conserva o histórico sem inventar consultas nem concluir pesquisa', () => {
 const { data, context } = fixture()
 const result = validateCoverage(data, context)
 assert.equal(result.total, 3)
 assert.equal(result.pendenciasDocumentacao.length, 2)
 assert.equal(result.divergenciasLegado.length, 1)
 assert.equal(data.registros[0].legado.atualizadoEm, '2026-10-21')
 for (const r of data.registros) { assert.deepEqual(r.consultas, []); assert.deepEqual(r.revisoes, []) }
 assert.equal(data.registros[2].estado, 'nao_iniciado')
})

test('legado mantém validação de datas reais e contagens', () => {
 const { context } = fixture()
 assert.doesNotThrow(() => validateLegacyCoverage(context.legado, context.cadastros[0]))
 context.legado.registros[0].atualizadoEm = '2026-02-30'
 assert.throws(() => validateLegacyCoverage(context.legado, context.cadastros[0]), /data inexistente/)
})

test('pesquisa concluída declara escopo e próxima revisão, sem resultado jurídico', () => {
 const { data, context } = completed()
 const before = structuredClone(data)
 const result = validateCoverage(data, context)
 assert.equal(result.porAno[2026].revisao_concluida, 1)
 assert.deepEqual(result.revisoesVencidas, [])
 assert.deepEqual(data, before)
 assert.equal(validateCoverage(data, { ...context, dataReferencia: '2026-11-25' }).revisoesVencidas.length, 1)
})

for (const [name, mutate, error] of [
 ['conclusão sem consultas', r => { r.consultas = [] }, /consulta desconhecida/],
 ['escopo incompleto', r => { r.revisoes[0].consultasIds.pop() }, /Escopo incompleto/],
 ['acesso indisponível', r => { r.consultas[0].resultado = 'acesso_indisponivel' }, /não conclui pesquisa/],
 ['fonte ausente', r => { r.consultas[0].fonte = null }, /objeto obrigatório/],
 ['fonte não oficial', r => { r.consultas[0].fonte.url = 'https://example.org/' }, /não reconhecido/],
 ['UF divergente', r => { r.consultas[3].abrangencia = 'RJ' }, /outra UF/],
 ['termos privados na URL', r => { r.consultas[0].fonte.url += '?q=nome' }, /sem credenciais/],
 ['consulta com data inexistente', r => { r.consultas[0].dataConsulta = '2026-02-30' }, /data inexistente/],
 ['consulta futura', r => { r.consultas[0].dataConsulta = '2026-11-12' }, /Consulta futura/],
 ['revisão antes da consulta', r => { r.consultas[0].revisao.data = '2026-10-31' }, /Revisão de consulta incompatível/],
 ['consulta sem aprovação', r => { r.consultas[0].revisao.liberacaoPublica = false }, /sem aprovação pública/],
 ['conclusão sem aprovação', r => { r.revisoes[0].liberacaoPublica = 'true' }, /Conclusão de cobertura sem aprovação/],
 ['resultado de ausência de processos', r => { r.consultas[0].resultado = 'sem_processos' }, /conclusão jurídica/],
 ['nova consulta ignorada', r => { const q = structuredClone(r.consultas[0]); q.id = 'consulta-nova'; q.sequencia = 10; r.consultas.push(q) }, /ignora uma consulta/],
 ['falha posterior ignorada', r => { const q = structuredClone(r.consultas[0]); q.id = 'consulta-nova'; q.sequencia = 10; q.resultado = 'acesso_indisponivel'; r.consultas.push(q) }, /não conclui pesquisa/],
 ['prazo maior que o da fonte', r => { r.revisoes[0].proximaRevisao = '2026-12-10' }, /ultrapassa a validade/],
 ['anotação interna', r => { r.consultas[0].notaPrivada = 'Campo indevido' }, /campos incompatíveis/],
 ['sequência duplicada', r => { r.consultas[1].sequencia = 1 }, /Sequência de consulta inválida/]
]) {
 test(`rejeita ${name}`, () => {
  const { data, context, record } = completed(); mutate(record)
  assert.throws(() => validateCoverage(data, context), error)
 })
}

test('reabertura de pesquisa preserva a revisão anterior', () => {
 const { data, context, record } = completed()
 const next = structuredClone(record.consultas[0])
 next.id = 'consulta-reabertura'; next.sequencia = 10; next.dataConsulta = '2026-11-03'; next.revisao.data = '2026-11-04'
 record.consultas.push(next); record.estado = 'em_revisao'
 assert.doesNotThrow(() => validateCoverage(data, context))
 assert.equal(record.revisoes.length, 1)
})

test('consulta não pode ser copiada para outra candidatura/eleição', () => {
 const { data, context, record } = completed()
 data.registros[0].estado = 'em_revisao'
 data.registros[0].consultas = structuredClone(record.consultas)
 assert.throws(() => validateCoverage(data, context), /copiado entre candidaturas/)
})

test('publicação jurídica não permite declarar pesquisa não iniciada', () => {
 const { data, context } = fixture()
 data.registros[1].estado = 'nao_iniciado'
 assert.throws(() => validateCoverage(data, context), /não iniciado incompatível/)
})

test('não cria um responsável ou uma data retroativa para sanar legado', () => {
 const { data, context } = fixture()
 data.registros[0].legado.atualizadoEm = '2026-11-11'
 assert.throws(() => validateCoverage(data, context), /histórico legado alterado/)
})

test('cobertura não pode omitir nem duplicar candidaturas', () => {
 const { data, context } = fixture()
 data.registros[2] = structuredClone(data.registros[0])
 assert.throws(() => validateCoverage(data, context), /desconhecida ou duplicada/)
})

test('sincronização acrescenta candidato sem apagar consultas existentes e é repetível', () => {
 const { data, context, record } = completed()
 const original = structuredClone(data)
 context.cadastros[1].pessoas.push({ id: '00000000004', ano: 2026, uf: 'SP', nome: 'Pessoa fictícia nova', cargo: 'SENADOR' })
 const next = syncCoverage(data, context)
 assert.deepEqual(next.registros[2], record)
 assert.equal(next.registros.at(-1).estado, 'nao_iniciado')
 assert.deepEqual(data, original)
 assert.doesNotThrow(() => validateCoverage(next, context))
 assert.deepEqual(syncCoverage(next, context), next)
})

test('retirada de candidatura exige reconciliação humana, não descarte de pesquisa', () => {
 const { data, context } = completed()
 context.cadastros[1].pessoas = []
 assert.throws(() => syncCoverage(data, context), /reconciliação manual necessária/)
})

for (const [name, mutate, error] of [
 ['consulta reescrita', d => { d.registros[2].consultas[0].escopo = 'Escopo modificado silenciosamente' }, /consulta publicada alterada/],
 ['revisão reescrita', d => { d.registros[2].revisoes[0].limitacoes = 'Ressalva anterior apagada' }, /revisão publicada alterada/],
 ['consulta apagada', d => { const r = d.registros[2]; r.estado = 'em_revisao'; r.consultas.pop(); r.revisoes = [] }, /consulta publicada alterada/]
]) {
 test(`histórico bloqueia ${name}`, () => {
  const { data, context } = completed(), next = structuredClone(data); mutate(next)
  assert.doesNotThrow(() => validateCoverage(next, context))
  assert.throws(() => validateCoverageTransition(data, next, context), error)
 })
}

test('CLI funciona fora do checkout e consulta o ledger real sem alterar arquivos', () => {
 const context = loadCoverageInputs(), data = readCoverage()
 const result = validateCoverage(data, { ...context, dataReferencia: data.metadados.atualizadoEm })
 assert.equal(result.total, context.cadastros.reduce((n, base) => n + base.pessoas.length, 0))
 assert.equal(result.pendenciasDocumentacao.length, data.registros.filter(r => r.estado === 'pendente_documentacao').length)
 const published = new Set(context.ocorrencias.ocorrencias.filter(o => o.statusEditorial === 'publicado').map(o => String(o.candidaturaId)))
 assert.equal(result.divergenciasLegado.length, context.legado.registros.filter(r => r.estado === 'nao_iniciado' && published.has(String(r.candidaturaId))).length)
 const script = fileURLToPath(new URL('../scripts/validate-coverage.mjs', import.meta.url))
 const run = spawnSync(process.execPath, [script, '--data', data.metadados.atualizadoEm], { cwd: '/tmp', encoding: 'utf8' })
 assert.equal(run.status, 0, run.stderr)
 assert.match(run.stdout, /pendência não equivale a ausência de processos/)
})


for (const [index, url] of [
 [0, 'https://www.stj.jus.br/'],
 [3, 'https://www.tre-rj.jus.br/'],
 [5, 'https://www.trf2.jus.br/'],
 [8, 'https://www.gov.br/fazenda/pt-br'],
 [8, 'https://fazenda.gov.br/pf/pt-br']
]) {
 test(`política rejeita portal incompatível: ${url}`, () => {
  const { data, context, record } = completed()
  record.consultas[index].fonte.url = url
  assert.throws(() => validateCoverage(data, context), /Portal incompatível/)
 })
}

test('ano deve ser numérico, sem coerção silenciosa', () => {
 const { data, context } = fixture()
 data.registros[2].ano = '2026'
 assert.throws(() => validateCoverage(data, context), /Ano da cobertura/)
})

test('sincronização sem alteração não reescreve data nem inventa atividade', () => {
 const { data, context } = completed()
 const later = { ...context, atualizadoEm: '2026-11-12' }
 assert.deepEqual(syncCoverage(data, later), data)
 assert.throws(() => syncCoverage(data, { ...context, atualizadoEm: '2026-10-01' }), /data anterior/)
})

test('nova publicação em candidatura já cadastrada cria pendência, nunca consulta retroativa', () => {
 const { context } = fixture()
 context.legado.registros[0].estado = 'nao_iniciado'
 context.legado.registros[0].atualizadoEm = null
 const previous = syncCoverage(null, context)
 assert.equal(previous.registros[0].estado, 'nao_iniciado')
 context.ocorrencias.ocorrencias.push({ candidaturaId: '00000000001', statusEditorial: 'publicado' })
 const next = syncCoverage(previous, context)
 assert.equal(next.registros[0].estado, 'pendente_documentacao')
 assert.deepEqual(next.registros[0].consultas, [])
 assert.deepEqual(next.registros[0].revisoes, [])
})

test('revisão antiga também não pode ignorar falha anterior à conclusão', () => {
 const { data, context, record } = completed()
 record.estado = 'em_revisao'
 const failed = structuredClone(record.consultas[0])
 failed.id = 'consulta-falha-anterior'; failed.sequencia = 10; failed.resultado = 'acesso_indisponivel'
 record.consultas.push(failed)
 assert.throws(() => validateCoverage(data, context), /não conclui pesquisa/)
})

test('CLI de sincronização é repetível e não sobrescreve arquivo inválido', () => {
 const directory = mkdtempSync(join(tmpdir(), 'coverage-cli-'))
 try {
  const target = join(directory, 'snapshot.json')
  const script = fileURLToPath(new URL('../scripts/sync-coverage.mjs', import.meta.url))
  const date = readCoverage().metadados.atualizadoEm
  const run = () => spawnSync(process.execPath, [script, '--arquivo', target, '--data', date], { cwd: tmpdir(), encoding: 'utf8' })
  let result = run()
  assert.equal(result.status, 0, result.stderr)
  const original = readFileSync(target)
  result = run()
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(readFileSync(target), original)
  writeFileSync(target, '{"arquivo":"inválido"}')
  const invalid = readFileSync(target)
  assert.notEqual(run().status, 0)
  assert.deepEqual(readFileSync(target), invalid)
 } finally { rmSync(directory, { recursive: true, force: true }) }
})
