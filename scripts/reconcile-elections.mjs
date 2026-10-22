import {readFileSync,writeFileSync} from 'node:fs'
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'))
const p22=read('../public/data/eleitos-2022.json').pessoas
const d26=read('../public/data/eleitos-2026.json')
const outFile=new URL('../public/data/vinculos-eleitorais-pendentes.json',import.meta.url)
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim()
const byName=new Map()
for(const p of p22){
 for(const value of [p.nome,p.nomeUrna]){
  const key=norm(value)
  if(!key)continue
  const a=byName.get(key)||[]
  if(!a.some(x=>x.id===p.id))a.push(p)
  byName.set(key,a)
 }
}
const matches=[]
for(const p of d26.pessoas){
 const options=[...new Map([...(byName.get(norm(p.nome))||[]),...(byName.get(norm(p.nomeUrna))||[])].map(x=>[x.id,x])).values()]
 const sameUf=options.filter(x=>x.uf===p.uf)
 if(sameUf.length!==1)continue
 const q=sameUf[0]
 matches.push({candidaturaId2022:q.id,candidaturaId2026:p.id,nome2022:q.nome,nome2026:p.nome,uf:p.uf,status:'pendente_revisao_humana',nota:'Correspondência sugerida por nome e UF; NÃO é prova de identidade e NÃO autoriza vincular ocorrências jurídicas.'})
}
const data={metadados:{geradoEm:new Date().toISOString().slice(0,10),base2022:p22.length,base2026:d26.pessoas.length,totalSugestoes:matches.length,aviso:'Somente sugestões para reconciliação humana. Nenhum vínculo é declarado como confirmado.'},sugestoes:matches.sort((a,b)=>a.nome2026.localeCompare(b.nome2026,'pt-BR'))}
writeFileSync(outFile,JSON.stringify(data,null,2)+'\n')
console.log('Sugestões de vinculação para revisão humana:',matches.length,'sem vínculos automáticos.')
