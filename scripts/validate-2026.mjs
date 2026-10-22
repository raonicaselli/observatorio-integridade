import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const file=JSON.parse(readFileSync(new URL('../public/data/eleitos-2026.json',import.meta.url),'utf8'))
assert.equal(file.metadados.ano,2026)
assert.equal(file.metadados.turno,1)
assert.equal(file.metadados.partido,'PL')
assert.equal(file.metadados.quantidade,file.pessoas.length)
const set=new Set()
for(const p of file.pessoas){
 assert.ok(/^\d{8,16}$/.test(String(p.id)),'Identificador eleitoral inválido')
 assert.ok(!set.has(String(p.id)),'Identificador duplicado: '+p.id)
 set.add(String(p.id))
 assert.equal(p.ano,2026)
 assert.equal(p.turno,1)
 assert.equal(p.partido,'PL')
 assert.ok(typeof p.nome==='string'&&p.nome.trim(),'Nome ausente')
 assert.ok(typeof p.nomeUrna==='string'&&p.nomeUrna.trim(),'Nome de urna ausente')
 assert.ok(/^[A-Z]{2}$/.test(p.uf),'UF inválida')
 assert.ok(Number.isInteger(p.votosValidos)&&p.votosValidos>=0,'Votos inválidos')
}
if(file.pessoas.length===0){
 assert.equal(file.metadados.situacao,'aguardando_importacao_validada','Base vazia sem aviso de pendência')
 console.log('Base 2026 ainda não importada — nenhuma candidatura considerada validada.')
}else{
 const federais=file.pessoas.filter(p=>p.cargo==='DEPUTADO FEDERAL').length
 assert.equal(federais,121,'Total divergente de deputados federais do PL no primeiro turno de 2026')
 assert.ok(file.pessoas.length>=federais)
 assert.equal(file.metadados.situacao,'apuracao_do_primeiro_turno_sujeita_a_retotalizacao')
 console.log('Base 2026 validada:',file.pessoas.length,'candidaturas; federais:',federais)
}
