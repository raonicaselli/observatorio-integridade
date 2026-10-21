import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'))
const data = read('../public/data/ocorrencias-publicadas.json')
const eleitos = read('../public/data/eleitos-2022.json')
const cadastro = new Set(eleitos.pessoas.map(p=>String(p.id)))
const categories = new Set(['eleitoral','penal','civel','administrativa','outra'])
const types = new Set(['apuracao_jornalistica','pedido_de_apuracao','investigacao_oficial','processo_ou_decisao'])
const situations = new Set([
 'apuracao_jornalistica','pedido_de_apuracao','investigacao','denuncia_recebida',
 'acao_em_andamento','decisao_nao_definitiva','decisao_definitiva',
 'arquivado','absolvido','extinto_sem_merito','outro'
])
const iso = /^\d{4}-\d{2}-\d{2}$/
const dateOk = s=>typeof s==='string'&&iso.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&
 new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s
const requireText=(v,field,id,min=3)=>{
 assert.ok(typeof v==='string'&&v.trim().length>=min,`Campo ${field} ausente ou curto em ${id}`)
}
assert.equal(data.metadados.versao,1)
assert.ok(Array.isArray(data.ocorrencias))
assert.equal(data.metadados.total,data.ocorrencias.length)
const ids=new Set()
for(const occ of data.ocorrencias){
 assert.match(String(occ.id),/^[a-z0-9][a-z0-9-]{4,80}$/i,'ID inválido')
 assert.ok(!ids.has(occ.id),`Ocorrência duplicada: ${occ.id}`)
 ids.add(occ.id)
 assert.ok(cadastro.has(String(occ.candidaturaId)),`Candidatura inexistente: ${occ.candidaturaId}`)
 assert.ok(['publicado','revisao_final'].includes(occ.statusEditorial),`Estado editorial inválido: ${occ.id}`)
 if(occ.statusEditorial==='publicado')assert.equal(occ.revisao?.liberacaoPublica,true,`Publicação sem aprovação: ${occ.id}`)
 assert.ok(types.has(occ.tipoRegistro),`Tipo de registro inválido: ${occ.id}`)
 requireText(occ.idCaso,'idCaso',occ.id,5)
 requireText(occ.titulo,'titulo',occ.id)
 requireText(occ.resumo,'resumo',occ.id)
 requireText(occ.descricaoSituacao,'descricaoSituacao',occ.id)
 requireText(occ.limites,'limites',occ.id,15)
 requireText(occ.posicionamentoEnvolvido,'posicionamentoEnvolvido',occ.id,10)
 assert.ok(categories.has(occ.categoria),`Categoria inválida: ${occ.id}`)
 assert.ok(situations.has(occ.situacaoProcessual),`Situação inválida: ${occ.id}`)
 assert.ok(dateOk(occ.dataMarco),`Data do marco inválida: ${occ.id}`)
 assert.ok(dateOk(occ.dataRevisao),`Data de revisão inválida: ${occ.id}`)
 requireText(occ.periodoFatos,'periodoFatos',occ.id)
 requireText(occ.partidoNosFatos,'partidoNosFatos',occ.id)
 assert.ok(occ.revisao&&occ.revisao.confirmacaoIdentidade===true,`Identidade não conferida: ${occ.id}`)
 if(occ.statusEditorial==='publicado')assert.ok(occ.revisao.verificacaoAtualizacao===true&&occ.revisao.liberacaoPublica===true,`Revisão de publicação incompleta: ${occ.id}`)
 else assert.equal(occ.revisao.liberacaoPublica,false,`Rascunho marcado para publicação: ${occ.id}`)
 requireText(occ.revisao.responsavel,'revisao.responsavel',occ.id)
 assert.ok(dateOk(occ.revisao.data)&&occ.revisao.data<=occ.dataRevisao,`Data editorial inválida: ${occ.id}`)
 assert.ok(Array.isArray(occ.fontes)&&occ.fontes.length>=1,`Fonte ausente: ${occ.id}`)
 const urls=new Set()
 const dominios=new Set()
 let fontesOficiais=0,reportagens=0
 for(const fonte of occ.fontes){
  requireText(fonte.titulo,'fonte.titulo',occ.id)
  requireText(fonte.instituicao,'fonte.instituicao',occ.id)
  assert.ok(['oficial','imprensa','outro'].includes(fonte.tipo),`Tipo de fonte inválido: ${occ.id}`)
  assert.ok(/^https:\/\//i.test(fonte.url)&&new URL(fonte.url).hostname,`Fonte não HTTPS: ${occ.id}`)
  assert.ok(!urls.has(fonte.url),`Fonte repetida: ${occ.id}`)
  urls.add(fonte.url)
  if(fonte.tipo==='oficial')fontesOficiais++
  if(fonte.tipo==='imprensa'){reportagens++;dominios.add(new URL(fonte.url).hostname.replace(/^www\d?\./i,''))}
 }
 if(occ.tipoRegistro==='apuracao_jornalistica'){
  assert.equal(occ.situacaoProcessual,'apuracao_jornalistica',`Não classificar matéria como investigação oficial: ${occ.id}`)
  assert.ok(reportagens>=2 && dominios.size>=2,`Apuração jornalística requer duas matérias de veículos distintos: ${occ.id}`)
  requireText(occ.evidenciasDocumentais,'evidenciasDocumentais',occ.id,15)
  assert.ok(occ.orgao===null||occ.orgao===undefined,`Apuração jornalística sem procedimento não pode atribuir órgão judicial: ${occ.id}`)
  assert.ok(!occ.processoNumero,`Matéria sem processo não pode ter número de processo: ${occ.id}`)
 }else{
  assert.ok(fontesOficiais>=1,`Investigação/ação oficial exige documento oficial: ${occ.id}`)
  requireText(occ.orgao,'orgao',occ.id)
  if(occ.tipoRegistro==='pedido_de_apuracao') assert.equal(occ.situacaoProcessual,'pedido_de_apuracao',`Pedido não é investigação aberta: ${occ.id}`)
  if(occ.tipoRegistro==='investigacao_oficial') assert.equal(occ.situacaoProcessual,'investigacao',`Investigação não é ação judicial: ${occ.id}`)
  if(occ.tipoRegistro==='processo_ou_decisao')assert.ok(!['apuracao_jornalistica','pedido_de_apuracao','investigacao'].includes(occ.situacaoProcessual),`Processo requer fase judicial: ${occ.id}`)
 }
}
console.log(`Validador editorial: ${data.ocorrencias.length} registros na base; ${data.ocorrencias.filter(o=>o.statusEditorial==='publicado').length} publicados, ${data.ocorrencias.filter(o=>o.statusEditorial==='revisao_final').length} aguardando revisão final.`)
