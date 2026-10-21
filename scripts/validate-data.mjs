import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const path = new URL('../public/data/eleitos-2022.json', import.meta.url)
const data = JSON.parse(readFileSync(path,'utf-8'))
const pessoas = data.pessoas

assert.equal(data.metadados.quantidade,234,'Metadados devem informar 234 titulares')
assert.equal(pessoas.length,234,'Esperados 234 candidatos eleitos')
const ids = new Set()
const counts = {}
const ufs = new Set()

for (const p of pessoas) {
 assert.match(String(p.id),/^\d{9,16}$/,'Identificador TSE inválido')
 assert.ok(!ids.has(p.id),`ID duplicado: ${p.id}`)
 ids.add(p.id)
 assert.ok(p.nome && p.nomeUrna && p.uf, `Dados essenciais incompletos: ${p.id}`)
 assert.equal(p.ano,2022, `Ano inesperado para ${p.id}`)
 assert.equal(p.partido,'PL',`Partido inesperado para ${p.id}`)
 assert.ok(Number.isInteger(p.votosValidos) && p.votosValidos > 0, `Votação inválida para ${p.id}`)
 assert.ok(['ELEITO','ELEITO POR QP','ELEITO POR MÉDIA'].includes(p.situacaoTotalizacao), `Situação inesperada em ${p.id}`)
 assert.equal(p.situacaoPesquisa,'nao_publicada','O MVP não autoriza publicar conclusões jurídicas')
 ufs.add(p.uf)
 counts[p.cargo] = (counts[p.cargo] || 0) + 1
}
assert.deepEqual(counts,{
 'DEPUTADO ESTADUAL':122,
 'DEPUTADO FEDERAL':98,
 'DEPUTADO DISTRITAL':4,
 'GOVERNADOR':2,
 'SENADOR':8,
})
assert.equal(ufs.size,26,'Contagem de UFs alterada')
console.log('Validação concluída: 234 candidaturas únicas, 26 UFs, cargos e estados corretos.')
