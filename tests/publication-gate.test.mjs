import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { validateOcorrencias } from '../scripts/validate-ocorrencias.mjs'

// Entirely fictitious data: never use pending research about real people as fixtures.
const cadastro = { pessoas: [{ id: '00000000001' }] }
function approved() {
 return {
  metadados: { versao: 1, total: 1 },
  ocorrencias: [{
   id: 'ocorrencia-ficticia', idCaso: 'caso-ficticio', candidaturaId: '00000000001',
   statusEditorial: 'publicado', tipoRegistro: 'processo_ou_decisao', categoria: 'penal',
   situacaoProcessual: 'absolvido', titulo: 'Exemplo inteiramente fictício',
   resumo: 'Resultado favorável em um exemplo sem pessoas reais.',
   descricaoSituacao: 'Absolvição documentada neste exemplo fictício.',
   limites: 'Este exemplo não corresponde a um procedimento real.',
   posicionamentoEnvolvido: 'Manifestação fictícia preservada para o teste.',
   dataMarco: '2026-10-20', dataRevisao: '2026-10-22',
   periodoFatos: 'nao_apurado', partidoNosFatos: 'nao_apurado', orgao: 'Órgão fictício',
   revisao: { responsavel: 'Revisor fictício', data: '2026-10-22',
    confirmacaoIdentidade: true, verificacaoAtualizacao: true, liberacaoPublica: true },
   fontes: [{ url: 'https://example.org/documento-ficticio', titulo: 'Documento fictício',
    instituicao: 'Instituição fictícia', tipo: 'oficial' }]
  }]
 }
}

test('aceita registro aprovado, inclusive com resultado favorável', () => {
 assert.doesNotThrow(() => validateOcorrencias(approved(), cadastro))
})

for (const status of ['rascunho', 'em_verificacao', 'revisao_final', 'corrigir_ou_retirar', '', undefined]) {
 test(`rejeita estado editorial ${String(status)} mesmo com flags de aprovação`, () => {
  const data = approved()
  data.ocorrencias[0].statusEditorial = status
  assert.throws(() => validateOcorrencias(data, cadastro), /somente registros publicados/)
 })
}

for (const [field, message] of [
 ['liberacaoPublica', /Publicação sem aprovação/],
 ['confirmacaoIdentidade', /Identidade não conferida/],
 ['verificacaoAtualizacao', /Revisão de publicação incompleta/]
]) {
 for (const value of [false, undefined, 'true']) {
  test(`rejeita ${field}=${String(value)} apesar do estado publicado`, () => {
   const data = approved()
   data.ocorrencias[0].revisao[field] = value
   assert.throws(() => validateOcorrencias(data, cadastro), message)
  })
 }
}

test('rejeita publicação sem objeto de revisão', () => {
 const data = approved()
 delete data.ocorrencias[0].revisao
 assert.throws(() => validateOcorrencias(data, cadastro), /Publicação sem aprovação/)
})

test('rejeita o pacote inteiro se houver um único registro pendente', () => {
 const data = approved()
 const pending = structuredClone(data.ocorrencias[0])
 pending.id = 'segundo-exemplo-ficticio'
 pending.statusEditorial = 'revisao_final'
 pending.revisao.liberacaoPublica = false
 data.ocorrencias.push(pending)
 data.metadados.total = 2
 assert.throws(() => validateOcorrencias(data, cadastro), /somente registros publicados/)
})

test('rejeita referência eleitoral desconhecida mesmo com aprovação', () => {
 assert.throws(() => validateOcorrencias(approved(), { pessoas: [] }), /Candidatura inexistente/)
})

test('rejeita fonte ausente mesmo com aprovação', () => {
 const data = approved()
 data.ocorrencias[0].fontes = []
 assert.throws(() => validateOcorrencias(data, cadastro), /Fonte ausente/)
})

test('base real continua válida sem alteração ou reaprovação automática', () => {
 const read = name => JSON.parse(readFileSync(new URL(`../public/data/${name}`, import.meta.url), 'utf8'))
 assert.doesNotThrow(() => validateOcorrencias(read('ocorrencias-publicadas.json'), read('eleitos-2022.json')))
})

test('CLI funciona fora do diretório do checkout', () => {
 const script = new URL('../scripts/validate-ocorrencias.mjs', import.meta.url)
 const result = spawnSync(process.execPath, [script.pathname], { cwd: '/tmp', encoding: 'utf8' })
 assert.equal(result.status, 0, result.stderr)
 assert.match(result.stdout, /registros publicados e aprovados na base pública/)
})
