const normalize = value => String(value ?? '')
 .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
 .trim().replace(/\s+/g, ' ')

// Process numbers can be entered with or without spaces and punctuation.
// Keep letters so case classes remain distinct (for example AP and PET).
const compactProcess = value => normalize(value).replace(/[^a-z0-9]/g, '')

export function searchPublishedOccurrences(occurrences, byCandidateId, { query = '', type = '' } = {}) {
 const textQuery = normalize(query)
 const processQuery = compactProcess(query)
 const hasProcessNumber = /[0-9]/.test(processQuery)
 return occurrences.filter(occurrence => {
  if (occurrence.statusEditorial !== 'publicado') return false
  if (type && occurrence.tipoRegistro !== type) return false
  if (!textQuery) return true
  const candidate = byCandidateId.get(String(occurrence.candidaturaId))
  const text = [occurrence.titulo, occurrence.resumo, occurrence.processoNumero,
   occurrence.orgao, candidate?.nome, candidate?.nomeUrna].map(normalize).join(' ')
  return text.includes(textQuery) ||
   (hasProcessNumber && compactProcess(occurrence.processoNumero).includes(processQuery))
 }).sort((a, b) => b.dataMarco.localeCompare(a.dataMarco))
}
