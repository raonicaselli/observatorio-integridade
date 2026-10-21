import React from 'react'
import { ExternalLink, FileSearch, ShieldAlert } from 'lucide-react'

const categorias = {
 eleitoral:'Direito eleitoral',
 penal:'Direito penal',
 civel:'Direito civil',
 administrativa:'Esfera administrativa',
 outra:'Outra natureza'
}
export default function OccurrencesPanel({ candidaturaId, dados, indisponivel=false }) {
 const publicadas = (dados?.ocorrencias || []).filter(o =>
  o.statusEditorial === 'publicado' && String(o.candidaturaId) === String(candidaturaId)
 ).sort((a,b)=>String(b.dataMarco).localeCompare(String(a.dataMarco)))

 return <section className="occ-section" aria-labelledby="occ-heading">
  <h3 id="occ-heading">Ocorrências documentadas</h3>
  {indisponivel ? <div className="occ-empty"><ShieldAlert size={20}/><p>A consulta das ocorrências está temporariamente indisponível. Nenhuma conclusão pode ser tirada daqui.</p></div> :
   publicadas.length===0 ? <div className="occ-empty"><FileSearch size={20}/><p>Nenhuma ocorrência jurídica revisada foi publicada para este perfil nesta versão. Isso <strong>não</strong> significa ausência de processos, investigações ou antecedentes.</p></div> :
   <div className="occ-list">{publicadas.map(o=><article key={o.id} className="occ-item">
    <div className="occ-category"><span>{categorias[o.categoria] || 'Outra natureza'}</span><span>{o.dataMarco}</span></div>
    <h4>{o.titulo}</h4>
    <p>{o.resumo}</p>
    <div className="occ-process"><strong>Situação documentada:</strong> {o.descricaoSituacao}</div>
    <div className="occ-metadata"><span>Órgão: {o.orgao}</span><span>Período dos fatos: {o.periodoFatos}</span><span>Filiação nos fatos: {o.partidoNosFatos}</span><span>Revisão: {o.dataRevisao}</span></div>
    <div className="occ-sources"><strong>Fontes</strong>{o.fontes.map(f=><a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer">{f.instituicao} — {f.titulo} <ExternalLink size={13}/></a>)}</div>
   </article>)}</div>
  }
  <p className="occ-caption">A plataforma apresenta apenas ocorrências aprovadas editorialmente. Uma investigação ou denúncia não equivale a condenação; uma decisão pode ser revista ou reformada.</p>
 </section>
}
