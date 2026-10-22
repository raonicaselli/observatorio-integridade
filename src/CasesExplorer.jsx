import React, { useMemo, useState } from 'react'
import { ArrowUpRight, Search, FileWarning, ShieldCheck } from 'lucide-react'

const names={investigacao_oficial:'Investigação oficial',processo_ou_decisao:'Processo ou decisão',pedido_de_apuracao:'Pedido de apuração',apuracao_jornalistica:'Apuração jornalística'}
export default function CasesExplorer({ data, records, onOpen }) {
 const [type,setType]=useState('')
 const [search,setSearch]=useState('')
 const published=(data?.ocorrencias||[]).filter(o=>o.statusEditorial==='publicado')
 const byId=useMemo(()=>new Map(records.map(p=>[String(p.id),p])),[records])
 const clean=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 const list=published.filter(o=>(!type||o.tipoRegistro===type)&&(!search||clean([o.titulo,o.resumo,byId.get(String(o.candidaturaId))?.nome,byId.get(String(o.candidaturaId))?.nomeUrna].join(' ')).includes(clean(search)))).sort((a,b)=>b.dataMarco.localeCompare(a.dataMarco))
 return <main className="shell cases-page" id="casos">
  <div className="kicker">BASE DOCUMENTAL / PILOTO 2022</div>
  <h1>Investigações, processos e decisões</h1>
  <p className="cases-lead">Documentos públicos com fontes, manifestações das pessoas envolvidas e distinção entre investigação e condenação. <strong>O levantamento ainda é parcial:</strong> não encontrar um nome aqui não significa que a pessoa não tenha processos.</p>
  <div className="cases-metrics"><div><strong>{published.length}</strong><span>Registros publicados</span></div><div><strong>{new Set(published.map(x=>x.idCaso)).size}</strong><span>Episódios independentes</span></div><div><strong>{new Set(published.map(x=>x.candidaturaId)).size}</strong><span>Políticos com registros</span></div></div>
  <div className="cases-filter"><label><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar nomes, processos ou assuntos…" aria-label="Pesquisar ocorrências"/></label><select aria-label="Filtrar por natureza jurídica" value={type} onChange={e=>setType(e.target.value)}><option value="">Todos os tipos</option>{Object.entries(names).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></div>
  <p className="cases-count">{list.length} registros correspondentes</p>
  <div className="cases-results">{list.map(o=>{const p=byId.get(String(o.candidaturaId));return <article className="case-card" key={o.id}><div className="case-meta"><span>{names[o.tipoRegistro]||'Ocorrência documentada'}</span><time>{o.dataMarco.split('-').reverse().join('/')}</time></div><h2>{o.titulo}</h2><p>{o.resumo}</p><div className="case-situation"><strong>Situação comprovada:</strong> {o.descricaoSituacao}</div><p className="case-limit"><FileWarning size={15}/> {o.limites}</p><div className="case-footer"><span>{p?.nomeUrna||p?.nome||'Registro vinculado ao TSE'} · {p?.uf||''}</span>{p&&<button onClick={()=>onOpen(p)}>Ver ficha e fontes <ArrowUpRight size={16}/></button>}</div></article>})}</div>
  {list.length===0&&<div className="cases-none"><ShieldCheck size={20}/>Nenhum registro correspondente na base publicada. Isso não comprova ausência de ocorrências.</div>}
  <p className="cases-footnote">Os documentos são publicados com data de revisão e links oficiais nas fichas individuais. Investigações não presumem culpa; decisões judiciais podem ser reformadas. Os dados refletem apenas os casos pesquisados e não uma varredura completa dos 234 eleitos.</p>
 </main>
}
