import React from 'react'

export default function ElectionScopeNotice({ metadata }) {
 if (!metadata?.turnos?.includes(2)) return null
 const second = metadata.distribuicaoPorTurno?.['2'] || 0
 return <p className="import-notice">
  Fonte: TSE, consulta em {metadata.atualizadoEm}. Cobertura dos dois turnos: {second} {second === 1 ? 'titular deste recorte eleito' : 'titulares deste recorte eleitos'} no segundo turno.
  {' '}Vices e suplentes não estão incluídos. Resultados sujeitos a retotalizações e decisões judiciais posteriores.
 </p>
}
