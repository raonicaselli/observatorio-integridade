import React, { useEffect, useMemo, useState } from 'react'
import OccurrencesPanel from './OccurrencesPanel.jsx'
import { Search, Scale, ShieldCheck, Database, ArrowUpRight, ChevronLeft, ChevronRight, X, Download, Menu, Info, Filter, Clock3, Github, MapPin, BriefcaseBusiness, Vote, Share2 } from 'lucide-react'

const cargoNome = {
 'DEPUTADO ESTADUAL':'Deputado estadual', 'DEPUTADO FEDERAL':'Deputado federal',
 'DEPUTADO DISTRITAL':'Deputado distrital', SENADOR:'Senador', GOVERNADOR:'Governador'
}
const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const fmt = new Intl.NumberFormat('pt-BR')
const PAGE_SIZE = 12

function App() {
 const [db,setDb] = useState(null)
 const [ocorrencias,setOcorrencias] = useState(null)
 const [erroOcorrencias,setErroOcorrencias] = useState(false)
 const [error,setError] = useState(false)
 const [query,setQuery] = useState('')
 const [uf,setUf] = useState('')
 const [cargo,setCargo] = useState('')
 const [page,setPage] = useState(1)
 const [selectedId,setSelectedId] = useState(() => new URLSearchParams(window.location.search).get('id'))
 const [copyState,setCopyState] = useState('')
 const [tab,setTab] = useState('explorar')
 const [mobile,setMobile] = useState(false)

 useEffect(() => {
  fetch(import.meta.env.BASE_URL+'data/eleitos-2022.json')
   .then(r => { if(!r.ok) throw Error('Falha na leitura dos dados'); return r.json() })
   .then(setDb).catch(()=>setError(true))
 },[])
 useEffect(() => {
  fetch(import.meta.env.BASE_URL+'data/ocorrencias-publicadas.json')
   .then(r=>{if(!r.ok)throw Error('Indisponível');return r.json()})
   .then(setOcorrencias).catch(()=>setErroOcorrencias(true))
 },[])
 const records = db?.pessoas || []
 const selected = records.find(p => p.id === selectedId) ?? null
 const ufs = useMemo(()=>[...new Set(records.map(x=>x.uf))].sort(),[records])
 const filtered = useMemo(()=>records.filter(x=>
  (!query || normalize(x.nome+' '+x.nomeUrna+' '+x.id).includes(normalize(query))) &&
  (!uf || x.uf===uf) && (!cargo || x.cargo===cargo)
 ),[records,query,uf,cargo])
 const pages = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE))
 const visible = filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE)
 const counts = useMemo(()=>({federais:records.filter(x=>x.cargo==='DEPUTADO FEDERAL').length,estaduais:records.filter(x=>x.cargo==='DEPUTADO ESTADUAL').length,senadores:records.filter(x=>x.cargo==='SENADOR').length}),[records])
 const reset=()=>{setQuery('');setUf('');setCargo('');setPage(1)}
 const profileUrl = id => {
  const url = new URL(window.location.href)
  url.searchParams.set('id',id)
  return url
 }
 const openProfile = p => {
  window.history.pushState({ id:p.id },'',profileUrl(p.id))
  setSelectedId(p.id)
  setCopyState('')
 }
 const closeProfile = () => {
  const url = new URL(window.location.href)
  url.searchParams.delete('id')
  window.history.pushState(null,'',url)
  setSelectedId(null)
  setCopyState('')
 }
 const copyProfileLink = async () => {
  if (!selected) return
  try {
   await navigator.clipboard.writeText(profileUrl(selected.id).toString())
   setCopyState('Link copiado!')
  } catch {
   setCopyState('Copie o endereço na barra do navegador')
  }
 }
 useEffect(() => {
  const onPopState = () => {
   setSelectedId(new URLSearchParams(window.location.search).get('id'))
   setCopyState('')
  }
  window.addEventListener('popstate',onPopState)
  return () => window.removeEventListener('popstate',onPopState)
 },[])
 useEffect(() => {
  if (!selected) return
  const originalOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  const onKeyDown = event => {
   if (event.key === 'Escape') closeProfile()
  }
  window.addEventListener('keydown',onKeyDown)
  return () => {
   document.body.style.overflow = originalOverflow
   window.removeEventListener('keydown',onKeyDown)
  }
 },[selectedId,db])
 const changeTab = v=>{setTab(v);setMobile(false);if (selectedId) closeProfile()}
 const links=[['explorar','Explorar dados'],['metodologia','Metodologia'],['sobre','Sobre o projeto']]
 return <div className="app">
  <header className="topbar"><div className="shell nav">
   <button className="brand" onClick={()=>changeTab('explorar')} aria-label="Ir à página inicial"><span className="brandmark"><Scale size={23} strokeWidth={1.8}/></span><span><strong>observatório<span className="branddot">.</span></strong><small>INTEGRIDADE POLÍTICA</small></span></button>
   <nav className={mobile?'navigation open':'navigation'} aria-label="Navegação principal">{links.map(([v,t])=><button key={v} className={tab===v?'navlink active':'navlink'} onClick={()=>changeTab(v)}>{t}</button>)}<a href="https://github.com/raonicaselli/observatorio-integridade" target="_blank" rel="noreferrer" className="github-link"><Github size={17}/> GitHub <ArrowUpRight size={13}/></a></nav>
   <button className="menubutton" aria-label="Abrir menu" onClick={()=>setMobile(!mobile)}>{mobile?<X/>:<Menu/>}</button>
  </div></header>
  {tab==='explorar' ? <>
   <section className="hero"><div className="shell hero-inner"><div><div className="eyebrow"><span className="statusdot"/> PROJETO EM DESENVOLVIMENTO <span className="eyebrow-line"/> RECORTE 2022</div><h1>Democracia precisa<br/>de <em>informação clara.</em></h1><p>Uma plataforma independente para explorar dados eleitorais e, futuramente, ocorrências jurídicas documentadas — sempre com fontes, contexto e transparência.</p><div className="hero-actions"><button className="primary" onClick={()=>document.getElementById('explorar')?.scrollIntoView({behavior:'smooth'})}>Explorar candidatos <ArrowUpRight size={17}/></button><button className="link-light" onClick={()=>changeTab('metodologia')}>Entenda a metodologia <ArrowUpRight size={15}/></button></div></div><div className="hero-art" aria-hidden="true"><div className="rings"><div className="ring r1"/><div className="ring r2"/><div className="ring r3"/><div className="ring r4"/><div className="ring-center"><Scale size={47} strokeWidth={1}/></div></div></div></div></section>
   <section className="metrics"><div className="shell metrics-inner"><div className="metric"><span>01 / ELEITOS TITULARES</span><strong>{db?fmt.format(records.length):'—'}</strong><small>Dados eleitorais conciliados</small></div><div className="metric"><span>02 / UNIDADES FEDERATIVAS</span><strong>{db?ufs.length:'—'}</strong><small>Estados e DF com registros</small></div><div className="metric"><span>03 / DEPUTADOS FEDERAIS</span><strong>{db?counts.federais:'—'}</strong><small>Eleitos pelo PL em 2022</small></div><div className="metric"><span>04 / ANO DE REFERÊNCIA</span><strong>2022</strong><small>Dados de candidatura e votação</small></div></div></section>
   <main className="shell main" id="explorar"><div className="section-head"><div><div className="kicker">BASE DE DADOS / 2022</div><h2>Explore os eleitos</h2><p>Pesquise por nome, estado ou cargo. Cada registro corresponde a uma candidatura eleita.</p></div><a className="export" href={import.meta.env.BASE_URL+'data/eleitos-2022.csv'} download><Download size={16}/> Exportar CSV</a></div>
   <div className="filters"><label className="searchbox"><Search size={20}/><input placeholder="Buscar por nome ou identificador do TSE…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} aria-label="Pesquisar políticos"/>{query&&<button aria-label="Limpar busca" onClick={()=>{setQuery('');setPage(1)}}><X size={16}/></button>}</label><div className="selectrow"><label><span>ESTADO</span><select value={uf} onChange={e=>{setUf(e.target.value);setPage(1)}}><option value="">Todas as UFs</option>{ufs.map(x=><option key={x} value={x}>{x}</option>)}</select></label><label><span>CARGO</span><select value={cargo} onChange={e=>{setCargo(e.target.value);setPage(1)}}><option value="">Todos os cargos</option>{Object.keys(cargoNome).map(x=><option value={x} key={x}>{cargoNome[x]}</option>)}</select></label><button className="clear" onClick={reset}><X size={15}/> Limpar filtros</button></div></div>
   <div className="result-heading"><span><strong>{fmt.format(filtered.length)}</strong> registros encontrados</span><span>Ordenação: nome A–Z</span></div>
   {error?<div className="empty"><Info/>Não foi possível carregar os dados. Recarregue a página.</div>:!db?<div className="empty">Carregando registros eleitorais…</div>:filtered.length===0?<div className="empty"><Search size={24}/><strong>Nenhum resultado</strong><span>Tente ajustar os filtros.</span><button onClick={reset}>Limpar filtros</button></div>:<>
   <div className="cards">{visible.map(p=><button className="person-card" key={p.id} onClick={()=>openProfile(p)}><span className="person-top"><span className="avatar">{p.nome.split(' ').slice(0,2).map(w=>w[0]).join('')}</span><span className="arrow"><ArrowUpRight size={18}/></span></span><strong>{p.nome}</strong><small>{p.nomeUrna&&p.nomeUrna!==p.nome?p.nomeUrna:'Candidatura eleitoral'}</small><span className="person-divider"/><span className="person-bottom"><span><MapPin size={14}/> {p.uf}</span><span>{cargoNome[p.cargo]||p.cargo}</span></span></button>)}</div>
   <div className="pagination"><span>Exibindo {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,filtered.length)} de {filtered.length}</span><div><button disabled={page===1} aria-label="Página anterior" onClick={()=>setPage(p=>p-1)}><ChevronLeft size={18}/></button><strong>{page} / {pages}</strong><button disabled={page===pages} aria-label="Próxima página" onClick={()=>setPage(p=>p+1)}><ChevronRight size={18}/></button></div></div></>}
   </main>
   <section className="disclaimer"><div className="shell disclaimer-inner"><ShieldCheck size={30}/><div><h3>Dados eleitorais não são antecedentes criminais.</h3><p>Esta versão apresenta apenas resultados eleitorais identificados nos arquivos do TSE. Não atribuímos irregularidades nem concluímos que alguém tem “ficha limpa” na ausência de pesquisa documental. Situações podem mudar após retotalizações ou decisões judiciais.</p></div><div className="disclaimer-actions"><button onClick={()=>changeTab('metodologia')}>Conheça os critérios <ArrowUpRight size={16}/></button><a href="https://github.com/raonicaselli/observatorio-integridade/issues/new?template=correcao-de-dados.yml" target="_blank" rel="noreferrer">Sugerir correção <ArrowUpRight size={14}/></a></div></div></section>
  </>:tab==='metodologia'?<main className="shell info-page"><div className="kicker">TRANSPARÊNCIA / METODOLOGIA</div><h1>Como os dados são construídos</h1><p className="lead">Uma pesquisa pública deve ser tão verificável quanto as informações que apresenta.</p><div className="info-grid"><article><Database/><h3>Origem dos dados</h3><p>Arquivos de candidaturas e votação por município/zona, disponibilizados pelo Tribunal Superior Eleitoral (TSE). O CSV consolidado de 2022 foi obtido a partir das bases fornecidas para este projeto.</p></article><article><Vote/><h3>O que significa “eleito”</h3><p>Registramos candidatos com situação de eleito, eleito por quociente partidário ou eleito por média, confirmados entre a base de candidaturas e a de votação. Vices e suplentes são excluídos deste conjunto de titulares.</p></article><article><ShieldCheck/><h3>Limites da validação</h3><p>Foram reconciliados 234 identificadores de candidaturas de 2022, sem divergência de situação entre os dois arquivos. Não foi realizada uma auditoria independente de todas as retotalizações posteriores. <a href="https://dadosabertos.tse.jus.br/dataset/resultados-2022" target="_blank" rel="noreferrer">Consultar resultados de 2022 no TSE <ArrowUpRight size={13}/></a></p></article><article><Clock3/><h3>Camada jurídica</h3><p>O módulo de exibição está preparado, mas nenhuma ocorrência jurídica foi aprovada para publicação nesta versão. Cada futuro registro exigirá fontes oficiais, identidade confirmada, datas, situação processual atualizada e aprovação editorial humana.</p></article></div><div className="method-note"><Info size={20}/><div><strong>Uma ausência não é uma certidão negativa</strong><p>Não encontrar uma ocorrência em bases consultadas não é prova de inexistência de investigações ou ações. Também não atribuímos a um partido fatos automaticamente ocorridos durante a filiação de um político a outro.</p></div></div><button className="primary dark" onClick={()=>changeTab('explorar')}>Voltar aos dados <ArrowUpRight size={16}/></button></main>:<main className="shell info-page"><div className="kicker">SOBRE / O PROJETO</div><h1>Dados públicos.<br/><em>Contexto acessível.</em></h1><p className="lead">O Observatório de Integridade Política é um protótipo independente voltado à organização transparente de informações eleitorais e registros documentais verificáveis.</p><div className="info-grid"><article><Scale/><h3>Sem juízo automático</h3><p>Notícias, investigações, processos, condenações e absolvições não são equivalentes. A plataforma deve registrar cada natureza e cada desfecho sem produzir acusações por associação.</p></article><article><Filter/><h3>Recorte atual</h3><p>O piloto contempla eleitos titulares pelo PL nas eleições gerais de 2022. A arquitetura poderá ser ampliada para outros partidos e períodos com critérios idênticos.</p></article><article><Github/><h3>Código e dados abertos</h3><p>O projeto é versionado em repositório GitHub. Nesta etapa, os dados eleitorais podem ser exportados diretamente em CSV. <a href="https://github.com/raonicaselli/observatorio-integridade/issues/new?template=correcao-de-dados.yml" target="_blank" rel="noreferrer">Solicitar correção <ArrowUpRight size={13}/></a></p></article><article><BriefcaseBusiness/><h3>Próximas entregas</h3><p>Perfis consolidados entre eleições, revisão de fontes jurídicas, histórico de correções e mecanismo de retificação e contestação.</p></article></div><button className="primary dark" onClick={()=>changeTab('explorar')}>Explorar dados <ArrowUpRight size={16}/></button></main>}
  <footer className="footer"><div className="shell foot"><div className="foot-brand"><Scale size={22}/><strong>observatório<span>.</span></strong></div><p>Protótipo em desenvolvimento · Dados eleitorais derivados de bases públicas do TSE · Sem afiliação ao TSE</p><a href="https://github.com/raonicaselli/observatorio-integridade" target="_blank" rel="noreferrer"><Github size={16}/> Código-fonte</a></div></footer>
  {selected&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)closeProfile()}}><section className="drawer" role="dialog" aria-modal="true" aria-labelledby="profile-title"><div className="drawer-top"><span>REGISTRO ELEITORAL / 2022</span><button onClick={closeProfile} aria-label="Fechar" autoFocus><X size={21}/></button></div><div className="drawer-body"><div className="large-avatar">{selected.nome.split(' ').slice(0,2).map(x=>x[0]).join('')}</div><h2 id="profile-title">{selected.nome}</h2><p className="ballot">{selected.nomeUrna}</p><div className="mini-pill">PL · Eleições gerais de 2022</div><div><button type="button" className="sharelink" onClick={copyProfileLink}><Share2 size={16}/>{copyState || 'Copiar link deste perfil'}</button></div><h3>Dados da candidatura</h3><dl><div><dt>Cargo</dt><dd>{cargoNome[selected.cargo]}</dd></div><div><dt>UF</dt><dd>{selected.uf}</dd></div><div><dt>Votos nominais válidos*</dt><dd>{fmt.format(selected.votosValidos)}</dd></div><div><dt>Situação registrada</dt><dd>{selected.situacaoTotalizacao}</dd></div><div><dt>Identificador TSE (SQ_CANDIDATO)</dt><dd className="mono">{selected.id}</dd></div></dl><OccurrencesPanel candidaturaId={selected.id} dados={ocorrencias} indisponivel={erroOcorrencias || ocorrencias === null}/><p className="drawer-footnote">* Agregação do arquivo de votação nominal por candidatura e turno, fornecido para o projeto. Alterações posteriores de totalização não auditadas.</p></div></section></div>}
 </div>
}
export default App
