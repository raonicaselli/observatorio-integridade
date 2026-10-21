import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read=relative=>JSON.parse(readFileSync(new URL(relative,import.meta.url),'utf8'))
const base=read('../public/data/eleitos-2022.json').pessoas
const c=read('../public/data/cobertura-pesquisa-2022.json')
const idsBase=new Set(base.map(x=>String(x.id)))
assert.equal(idsBase.size,234)
assert.equal(c.metadados.versao,1)
assert.equal(c.metadados.total,234)
assert.ok(Array.isArray(c.registros))
assert.equal(c.registros.length,234)
const idVistos=new Set(),estadoContagem={nao_iniciado:0,triagem_inicial:0,em_revisao:0,revisao_concluida:0}
const iso=/^\d{4}-\d{2}-\d{2}$/
for(const p of c.registros){
 const id=String(p.candidaturaId)
 assert.ok(idsBase.has(id),`Candidatura de cobertura desconhecida: ${id}`)
 assert.ok(!idVistos.has(id),`Candidatura duplicada: ${id}`)
 idVistos.add(id)
 const basePessoa=base.find(x=>String(x.id)===id)
 assert.equal(p.nome,basePessoa.nome,`Nome alterado: ${id}`)
 assert.equal(p.uf,basePessoa.uf,`UF alterada: ${id}`)
 assert.equal(p.cargo,basePessoa.cargo,`Cargo alterado: ${id}`)
 assert.ok(Object.hasOwn(estadoContagem,p.estado),`Estado de pesquisa inválido: ${id}`)
 estadoContagem[p.estado]++
 if(p.estado==='nao_iniciado')assert.equal(p.atualizadoEm,null,`Não iniciado com data: ${id}`)
 else assert.ok(iso.test(p.atualizadoEm),`Data da pesquisa ausente: ${id}`)
 if(p.estado==='revisao_concluida')assert.ok(iso.test(p.verificadoIntegralmenteEm||''),`Data de revisão completa ausente: ${id}`)
 else assert.equal(p.verificadoIntegralmenteEm,null,`Revisão completa marcada indevidamente: ${id}`)
}
assert.equal(estadoContagem.triagem_inicial,c.metadados.triagemInicial)
assert.equal(estadoContagem.em_revisao,c.metadados.emRevisao)
assert.equal(estadoContagem.revisao_concluida,c.metadados.revisaoConcluida)
console.log('Cobertura de 2022 validada:',JSON.stringify(estadoContagem))
