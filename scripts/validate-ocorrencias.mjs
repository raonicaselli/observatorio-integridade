import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url),'utf8'))
const data = read('../public/data/ocorrencias-publicadas.json')
const candidaturas = read('../public/data/eleitos-2022.json')
const cadastro = new Set(candidaturas.pessoas.map(p=>String(p.id)))
const categories = new Set(['eleitoral','penal','civel','administrativa','outra'])
const situations = new Set([
 'investigacao','denuncia_recebida','acao_em_andamento','decisao_nao_definitiva',
 'decisao_definitiva','arquivado','absolvido','extinto_sem_merito','outro'
])
const iso = /^\d{4}-\d{2}-\d{2}$/
const dateOk = s=>typeof s==='string'&&iso.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&
 new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s
const requireText=(v,field,id)=>{
 assert.ok(typeof v==='string'&&v.trim().length>=3,`Campo ${field} ausente ou curto em ${id}`)
}
assert.equal(data.metadados.versao,1)
assert.ok(Array.isArray(data.ocorrencias))
assert.equal(data.metadados.total,data.ocorrencias.length)
const ids=new Set()
for(const occ of data.ocorrencias){
 assert.match(String(occ.id),/^[a-z0-9][a-z0-9-]{4,80}$/i,'ID inválido')
 assert.ok(!ids.has(occ.id),`Ocorrência duplicada: ${occ.id}`);ids.add(occ.id)
 assert.ok(cadastro.has(String(occ.candidaturaId)),`Candidatura inexistente: ${occ.candidaturaId}`)
 assert.equal(occ.statusEditorial,'publicado',`Registro ${occ.id} sem aprovação editorial`)
 requireText(occ.titulo,'titulo',occ.id)
 requireText(occ.resumo,'resumo',occ.id)
 requireText(occ.orgao,'orgao',occ.id)
 requireText(occ.descricaoSituacao,'descricaoSituacao',occ.id)
 assert.ok(categories.has(occ.categoria),`Categoria inválida: ${occ.id}`)
 assert.ok(situations.has(occ.situacaoProcessual),`Situação inválida: ${occ.id}`)
 assert.ok(dateOk(occ.dataMarco),`Data do marco inválida: ${occ.id}`)
 assert.ok(dateOk(occ.dataRevisao),`Data de revisão inválida: ${occ.id}`)
 assert.ok(typeof occ.periodoFatos==='string'&&occ.periodoFatos.trim(),`Período não informado: ${occ.id}`)
 assert.ok(typeof occ.partidoNosFatos==='string'&&occ.partidoNosFatos.trim(),`Filiação não informada: ${occ.id}`)
 assert.ok(occ.revisao&&occ.revisao.confirmacaoIdentidade===true&&occ.revisao.verificacaoAtualizacao===true&&occ.revisao.liberacaoPublica===true,`Revisão editorial incompleta: ${occ.id}`)
 requireText(occ.revisao.responsavel,'revisao.responsavel',occ.id)
 assert.ok(dateOk(occ.revisao.data)&&occ.revisao.data<=occ.dataRevisao,`Data editorial inválida: ${occ.id}`)
 assert.ok(Array.isArray(occ.fontes)&&occ.fontes.length>=1,`Fonte ausente: ${occ.id}`)
 const urls=new Set()
 for(const fonte of occ.fontes){
  requireText(fonte.titulo,'fonte.titulo',occ.id)
  requireText(fonte.instituicao,'fonte.instituicao',occ.id)
  assert.ok(['oficial','imprensa','outro'].includes(fonte.tipo),`Tipo de fonte inválido: ${occ.id}`)
  assert.ok(/^https:\/\//i.test(fonte.url)&&new URL(fonte.url).hostname,`Fonte não HTTPS: ${occ.id}`)
  assert.ok(!urls.has(fonte.url),`Fonte repetida: ${occ.id}`);urls.add(fonte.url)
 }
 assert.ok(occ.fontes.some(f=>f.tipo==='oficial'),`Exige ao menos uma fonte oficial: ${occ.id}`)
}
console.log(`Validador editorial: ${data.ocorrencias.length} ocorrências publicadas com revisão, fontes e vínculo eleitoral.`)
