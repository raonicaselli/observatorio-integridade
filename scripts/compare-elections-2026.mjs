import { readFileSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

export function compareElections(before, after) {
 const index = data => {
  const map = new Map()
  for (const p of data.pessoas) {
   const id = String(p.id)
   assert.ok(!map.has(id), 'Identificador duplicado: ' + id)
   map.set(id, p)
  }
  return map
 }
 const old = index(before), next = index(after)
 const alteracoes = []
 for (const [id, p] of next) {
  const previous = old.get(id)
  if (!previous) continue
  const campos = {}
  for (const key of new Set([...Object.keys(previous), ...Object.keys(p)])) {
   if (JSON.stringify(previous[key]) !== JSON.stringify(p[key])) {
    campos[key] = { antes: previous[key] ?? null, depois: p[key] ?? null }
   }
  }
  if (Object.keys(campos).length) alteracoes.push({ id, campos })
 }
 const inclusoes = [...next].filter(([id]) => !old.has(id)).map(([, p]) => p)
 const exclusoes = [...old].filter(([id]) => !next.has(id)).map(([, p]) => p)
 return { metadadosAntes: before.metadados, metadadosDepois: after.metadados,
  resumo: { antes: old.size, depois: next.size, inclusoes: inclusoes.length,
   exclusoes: exclusoes.length, alteracoes: alteracoes.length }, inclusoes, exclusoes, alteracoes }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 const [before, after, output] = process.argv.slice(2)
 assert.ok(before && after && output, 'Uso: node scripts/compare-elections-2026.mjs antes.json depois.json relatório.json')
 const read = path => JSON.parse(readFileSync(path, 'utf8'))
 const report = compareElections(read(before), read(after))
 writeFileSync(output, JSON.stringify(report, null, 2) + '\n')
 console.log('Comparação eleitoral:', JSON.stringify(report.resumo))
}
