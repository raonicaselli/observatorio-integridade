import React from 'react'
import { eventLabels, relationLabels } from './lib/case-timelines.mjs'

const date = value => value.split('-').reverse().join('/')

export default function CaseTimeline({ timeline }) {
 if (!timeline) return null
 return <section className="case-timeline" aria-label="Linha do tempo documentada">
  <h5>Linha do tempo documentada</h5>
  <p>Cada evento descreve um ato. O último evento não apaga decisões anteriores. Revisão do histórico: {date(timeline.reviewedAt)}.</p>
  <details className="timeline-scope"><summary>Abrangência e limites do histórico</summary>
   <p>{timeline.scope}</p><p>{timeline.limits}</p>
  </details>
  <ol>{timeline.events.map(event => <li key={event.id}>
   <time dateTime={event.data}>{date(event.data)}</time>
   <h6>{Object.hasOwn(eventLabels,event.tipo) ? eventLabels[event.tipo] : 'Ato documentado'}</h6>
   {event.imputation && <p><strong>Imputação:</strong> {event.imputation.descricao}</p>}
   <p>{event.descricao}</p>
   {event.relation && <p><strong>Relação entre atos:</strong> {relationLabels[event.relation.type]} {date(event.relation.date)} ({eventLabels[event.relation.eventType]}). {event.relation.justification}</p>}
   <p><strong>Processo:</strong> {event.process.classe} {event.process.numero || 'Número não informado'} · {event.process.orgao}</p>
   <p><strong>Limites:</strong> {event.limites}</p>
   <details>
    <summary>Defesa, recursos e fontes deste ato</summary>
    <p><strong>Defesa e contexto:</strong> {event.defesa.descricao}</p>
    <p><strong>Recursos:</strong> {event.recurso.descricao}</p>
    <p><strong>Trânsito em julgado deste ato:</strong> {event.transitoEmJulgado.situacao === 'confirmado'
     ? `confirmado em ${date(event.transitoEmJulgado.data)}.` : 'não verificado. Esse estado não substitui o de outros atos da linha do tempo.'}</p>
    <ul>{event.sources.map(source => <li key={source.id}>
     <a href={source.url} target="_blank" rel="noopener noreferrer">{source.instituicao} — {source.titulo}</a>
     <p>Consulta: {date(source.dataConsulta)}. {source.localizador}</p>
    </li>)}</ul>
   </details>
  </li>)}</ol>
 </section>
}
