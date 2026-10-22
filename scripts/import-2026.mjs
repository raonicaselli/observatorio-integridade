import { writeFileSync } from 'node:fs'

const source='https://colinhas.com.br/dados/candidatos-votos-2026.csv'
const response=await fetch(source,{headers:{'User-Agent':'ObservatorioIntegridade/1.0 (pesquisa eleitoral)'}})
if(!response.ok)throw Error('Fonte CSV indisponível: HTTP '+response.status)
const csv=await response.text()
function parseCSV(input){
 const rows=[];let row=[],field='',quoted=false
 for(let i=0;i<input.length;i++){const c=input[i]
  if(c==='"'){if(quoted&&input[i+1]==='"'){field+='"';i++}else quoted=!quoted}
  else if(c===','&&!quoted){row.push(field);field=''}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&input[i+1]==='\n')i++;row.push(field);if(row.some(v=>v!==''))rows.push(row);row=[];field=''}
  else field+=c
 }
 if(quoted)throw Error('CSV com aspas não fechadas')
 if(field!==''||row.length){row.push(field);rows.push(row)}
 const head=rows.shift()?.map((s,i)=>i===0?s.replace(/^\uFEFF/,'').trim():s.trim())||[]
 const required=['sq_candidato','nome_urna','nome','partido','cargo','uf','votos','situacao','eleito']
 for(const h of required)if(!head.includes(h))throw Error('Coluna obrigatória ausente: '+h)
 return rows.map(x=>Object.fromEntries(head.map((h,i)=>[h,x[i]||''])))
}
const records=parseCSV(csv)
const elected=v=>/^(1|s|sim|true)$/i.test(String(v).trim())
const notTwo=v=>!/2.?\s*turno/i.test(v)
const selected=records.filter(x=>x.partido.trim().toUpperCase()==='PL'&&elected(x.eleito)&&notTwo(x.situacao))
const unique=new Set();const arr=selected.map(r=>{
 const id=String(r.sq_candidato).trim()
 if(!/^\d{8,16}$/.test(id)||unique.has(id))throw Error('ID ausente ou duplicado: '+id)
 unique.add(id)
 const cargo=r.cargo.trim().toUpperCase(),uf=r.uf.trim().toUpperCase()
 const nome=r.nome.trim(),nomeUrna=r.nome_urna.trim()
 if(!nome||!nomeUrna||!/^[A-Z]{2}$/.test(uf))throw Error('Nome/UF inválido: '+id)
 return {id,ano:2026,turno:1,nome,nomeUrna,cargo,uf,partido:'PL',votosValidos:Number(String(r.votos).replace(/[.\s]/g,''))||0,situacaoTotalizacao:r.situacao.trim(),situacaoPesquisa:'nao_iniciada'}
}).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'))
const federais=arr.filter(x=>/DEPUTADO FEDERAL/.test(x.cargo)).length
if(federais!==121)throw Error('Total de deputados federais PL inesperado: '+federais+' (esperado 121). Importação interrompida para revisão.')
if(arr.length<121)throw Error('Total de eleitos abaixo do esperado')
const output={metadados:{ano:2026,turno:1,partido:'PL',quantidade:arr.length,atualizadoEm:new Date().toISOString().slice(0,10),situacao:'apuracao_do_primeiro_turno_sujeita_a_retotalizacao',fonteAgregadora:source,fontePrimaria:'https://resultados.tse.jus.br/',aviso:'Lista sujeita a retotalizações e decisões eleitorais posteriores. Governadores ainda em segundo turno não estão incluídos.'},pessoas:arr}
writeFileSync(new URL('../public/data/eleitos-2026.json',import.meta.url),JSON.stringify(output,null,2)+'\n')
console.log('Eleitos do PL em 2026:',arr.length,'deputados federais:',federais)
