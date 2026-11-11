import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { validateCasosV2, validateTransicaoV2, timelineV2 } from '../scripts/lib/casos-v2.mjs'

const path = fileURLToPath(new URL('../docs/exemplos/casos-v2-ficticios.json', import.meta.url))
const fixture = () => JSON.parse(readFileSync(path, 'utf8'))
const options = { exemplo: true }
const event = (d, id) => d.eventos.find(e => e.id === id)

function production() {
 const data = fixture()
 data.metadados.finalidade = 'publicacao'
 // Invented paths for offline tests only: no documents or real proceedings are asserted.
 for (const f of data.fontes) f.url = 'https://www.tse.jus.br/exemplo-ficticio/' + f.id
 // Fake catalog used only to exercise the boundary; this never approves real identities.
 const cadastros = [{ pessoas: data.candidaturas.map(c => ({
  id: c.tseId, ano: c.ano, uf: c.uf, cargo: c.cargo, partido: c.partido
 })) }]
 return { data, config: { cadastros } }
}

test('caso com condenação, absolvição parcial, recurso, reforma e arquivamento é válido', () => {
 const d = fixture(), copy = structuredClone(d)
 assert.deepEqual(validateCasosV2(d, options), { pessoas: 2, casos: 1, eventos: 7 })
 assert.deepEqual(d, copy, 'A validação não pode filtrar ou promover dados')
})

test('linha do tempo preserva decisões desfavoráveis e favoráveis sem propagá-las a outro participante', () => {
 const d = fixture()
 d.eventos.reverse()
 const ana = timelineV2(d, 'participacao-ana', options)
 assert.deepEqual(ana.map(e => e.tipo), ['condenacao', 'absolvicao', 'recurso_interposto', 'absolvicao', 'retificacao'])
 assert.equal(ana.find(e => e.id === 'evento-reforma').relacao.eventoId, 'evento-condenacao')
 const bia = timelineV2(d, 'participacao-bia', options)
 assert.deepEqual(bia.map(e => e.tipo), ['arquivamento', 'transito_em_julgado'])
 ana[0].descricao = 'Alteração somente na cópia'
 assert.notEqual(event(d, 'evento-condenacao').descricao, ana[0].descricao)
})

test('não identifica pessoas por coincidência de nome', () => {
 const d = fixture()
 d.pessoas[1].nome = d.pessoas[0].nome
 assert.doesNotThrow(() => validateCasosV2(d, options))
 assert.equal(timelineV2(d, 'participacao-bia', options).length, 2)
})

for (const tipo of ['denuncia_rejeitada', 'arquivamento', 'extincao_sem_merito']) {
 test(`aceita desfecho favorável ${tipo} sem exigir condenação`, () => {
  const d = fixture()
  event(d, 'evento-arquivamento').tipo = tipo
  assert.doesNotThrow(() => validateCasosV2(d, options))
 })
}

for (const collection of ['pessoas', 'candidaturas', 'casos', 'processos', 'participacoes', 'fontes', 'eventos']) {
 test(`bloqueia pacote inteiro com ${collection} em revisão final`, () => {
  const d = fixture()
  d[collection][0].statusEditorial = 'revisao_final'
  assert.throws(() => validateCasosV2(d, options), /somente registros publicados/)
 })
}

for (const [name, mutate, error] of [
 ['sem identidade confirmada', d => { d.pessoas[0].identidade.estado = 'inconclusiva' }, /identidade não confirmada/],
 ['aprovação textual', d => { d.eventos[0].revisao.liberacaoPublica = 'true' }, /aprovação pública ausente/],
 ['atualização não conferida', d => { d.eventos[0].verificacaoAtualizacao = false }, /atualização não conferida/],
 ['evento órfão', d => { d.eventos[0].processoId = 'processo-ausente' }, /referência inexistente/],
 ['ID duplicado', d => { d.eventos.push(structuredClone(d.eventos[0])) }, /ID duplicado/],
 ['mesmo ato com novo ID e ordem', d => { const e = structuredClone(d.eventos[0]); e.id = 'evento-duplicado'; e.ordemNoDia = 20; d.eventos.push(e) }, /ato duplicado/],
 ['ordem ambígua', d => { d.eventos[1].ordemNoDia = 1 }, /ordem ambígua/],
 ['data inexistente', d => { d.eventos[0].data = '2026-02-30' }, /data inexistente/],
 ['consulta anterior ao ato', d => { d.eventos[0].data = '2026-06-05' }, /consulta anterior ao ato/],
 ['consulta posterior à revisão', d => { d.fontes[0].dataConsulta = '2026-06-11' }, /consulta posterior à revisão/],
 ['publicação posterior à consulta', d => { d.fontes[0].dataPublicacao = '2026-06-02' }, /publicação posterior/],
 ['reforma antes da decisão', d => { event(d, 'evento-reforma').data = '2026-02-01' }, /ato anterior/],
 ['retificação sem referência', d => { event(d, 'evento-retificacao').relacao = null }, /retificação exige/],
 ['recurso sem decisão', d => { event(d, 'evento-recurso').relacao = null }, /recurso exige/],
 ['recurso de outro participante', d => { event(d, 'evento-recurso').relacao.eventoId = 'evento-arquivamento' }, /outra pessoa/],
 ['reforma de outra imputação', d => { event(d, 'evento-reforma').relacao.eventoId = 'evento-absolvicao-parcial' }, /outra imputação/],
 ['imputação inexistente', d => { d.eventos[0].imputacaoId = 'imputacao-inexistente' }, /imputação inexistente/],
 ['processos em ciclo', d => { d.processos[0].processoOrigemId = 'processo-recurso' }, /ciclo entre processos/],
 ['número não público sem motivo', d => { d.processos[0].numero = null }, /motivoNumeroIndisponivel/],
 ['defesa sem fonte', d => { d.eventos[0].defesa.fontesIds = [] }, /referências obrigatórias/],
 ['recurso pendente sem fonte', d => { event(d, 'evento-recurso').recurso.fontesIds = [] }, /referências obrigatórias/],
 ['trânsito sem fonte', d => { event(d, 'evento-transito').transitoEmJulgado.fontesIds = [] }, /referências obrigatórias/],
 ['trânsito com recurso pendente', d => { event(d, 'evento-transito').recurso.situacao = 'pendente' }, /trânsito incompatível/],
 ['trânsito anterior ao ato', d => { event(d, 'evento-transito').transitoEmJulgado.data = '2026-01-01' }, /data de trânsito incompatível/],
 ['trânsito posterior à consulta da fonte', d => { event(d, 'evento-transito').transitoEmJulgado.data = '2026-06-05' }, /consulta anterior ao trânsito/],
 ['fonte sem HTTPS', d => { d.fontes[0].url = 'http://example.org/fonte' }, /HTTPS/],
 ['fonte oficial ausente', d => { for (const f of d.fontes) f.tipo = 'imprensa' }, /fonte oficial obrigatória/],
 ['anotações privadas inesperadas', d => { d.eventos[0].anotacaoPrivada = 'Não deve sair no pacote' }, /campo não permitido/],
 ['candidatura de duas pessoas', d => { const c = structuredClone(d.candidaturas[0]); c.id = 'candidatura-duplicada'; c.pessoaId = d.pessoas[1].id; d.candidaturas.push(c) }, /candidatura duplicada/]
]) {
 test(`rejeita pacote ${name}`, () => {
  const d = fixture(); mutate(d)
  assert.throws(() => validateCasosV2(d, options), error)
 })
}

test('permite defesa explicitamente não localizada e número indisponível sem inventar informação', () => {
 const d = fixture()
 d.processos[0].numero = null
 d.processos[0].motivoNumeroIndisponivel = 'Número não localizado nas fontes documentadas.'
 d.eventos[0].defesa = { situacao: 'nao_localizada', descricao: 'Não localizada nas fontes consultadas; limitação explícita.', fontesIds: [] }
 assert.doesNotThrow(() => validateCasosV2(d, options))
})

test('modo público rejeita exemplo fictício, mesmo com flags editoriais positivas', () => {
 assert.throws(() => validateCasosV2(fixture()), /Finalidade incompatível/)
})

test('modo público cruza candidaturas com os cadastros fornecidos sem aprovar identidade automaticamente', () => {
 const { data, config } = production()
 assert.doesNotThrow(() => validateCasosV2(data, config))
 assert.throws(() => validateCasosV2(data), /ausente dos cadastros/)
 data.candidaturas[0].uf = 'RJ'
 assert.throws(() => validateCasosV2(data, config), /uf diverge/)
})

test('não permite esconder pacote público atrás do modo de exemplo', () => {
 const { data } = production()
 assert.throws(() => validateCasosV2(data, options), /Finalidade incompatível/)
})

test('nova versão pode acrescentar retificação, preservando o evento original', () => {
 const next = fixture(), previous = fixture()
 previous.eventos = previous.eventos.filter(e => e.id !== 'evento-retificacao')
 assert.doesNotThrow(() => validateTransicaoV2(previous, next, options))
 assert.equal(next.eventos.length, previous.eventos.length + 1)
})

for (const [name, mutate, error] of [
 ['apagar evento favorável', d => { d.eventos = d.eventos.filter(e => e.id !== 'evento-absolvicao-parcial'); event(d, 'evento-retificacao').relacao.eventoId = 'evento-condenacao'; event(d, 'evento-retificacao').imputacaoId = 'imputacao-alfa' }, /registro publicado removido/],
 ['reescrever a descrição de decisão', d => { d.eventos[0].descricao = 'Descrição alterada silenciosamente' }, /registro publicado alterado/],
 ['alterar fonte publicada', d => { d.fontes[0].url = 'https://example.org/outra-fonte' }, /registro publicado alterado/],
 ['trocar as pessoas das participações', d => { [d.participacoes[0].pessoaId, d.participacoes[1].pessoaId] = [d.participacoes[1].pessoaId, d.participacoes[0].pessoaId] }, /associação publicada alterada/],
 ['mudar identidade eleitoral', d => { d.candidaturas[0].tseId = '00000000009' }, /associação publicada alterada/]
]) {
 test(`transição impede ${name}`, () => {
  const previous = fixture(), next = fixture(); mutate(next)
  assert.doesNotThrow(() => validateCasosV2(next, options), 'O teste deve alcançar a barreira de histórico, não falhar só na estrutura')
  assert.throws(() => validateTransicaoV2(previous, next, options), error)
 })
}

test('participação pode receber nova imputação sem reatribuir resultados anteriores', () => {
 const previous = fixture(), next = fixture()
 next.participacoes[0].imputacoes.push({ id: 'imputacao-nova', descricao: 'Nova imputação fictícia ainda sem evento neste exemplo.' })
 assert.doesNotThrow(() => validateTransicaoV2(previous, next, options))
})

test('CLI exige escolha explícita do arquivo e do modo; não modifica a entrada', () => {
 const script = fileURLToPath(new URL('../scripts/validate-casos-v2.mjs', import.meta.url))
 const original = readFileSync(path)
 const run = args => spawnSync(process.execPath, [script, ...args], { cwd: tmpdir(), encoding: 'utf8' })
 assert.notEqual(run([]).status, 0)
 assert.notEqual(run(['--arquivo', path]).status, 0)
 assert.notEqual(run(['--arquivo', path, '--exemplo', '--publicar']).status, 0)
 const result = run(['--arquivo', path, '--exemplo'])
 assert.equal(result.status, 0, result.stderr)
 assert.match(result.stdout, /EXEMPLO FICTÍCIO/)
 assert.deepEqual(readFileSync(path), original)
})

test('CLI compara snapshot anterior e falha em atualização não aprovada', () => {
 const directory = mkdtempSync(join(tmpdir(), 'casos-v2-'))
 try {
  const oldPath = join(directory, 'anterior.json'), nextPath = join(directory, 'proposto.json')
  const previous = fixture(), next = fixture()
  writeFileSync(oldPath, JSON.stringify(previous))
  next.eventos[0].revisao.liberacaoPublica = false
  writeFileSync(nextPath, JSON.stringify(next))
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/validate-casos-v2.mjs', import.meta.url)),
   '--arquivo', nextPath, '--anterior', oldPath, '--exemplo'], { encoding: 'utf8' })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /aprovação pública ausente/)
 } finally { rmSync(directory, { recursive: true, force: true }) }
})


test('modo público recusa domínio comercial autodeclarado oficial e sufixo enganoso', () => {
 const { data, config } = production()
 for (const url of ['https://example.org/oficial', 'https://tse.jus.br.example.org/oficial']) {
  data.fontes[0].url = url
  assert.throws(() => validateCasosV2(data, config), /domínio não reconhecido como oficial/)
 }
})
