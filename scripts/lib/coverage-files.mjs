import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { validateLegacyCoverage } from './coverage.mjs'

const read = path => JSON.parse(readFileSync(path, 'utf8'))
export const coveragePath = new URL('../../public/data/cobertura-pesquisa.json', import.meta.url)

export function loadCoverageInputs() {
 const cadastros = [2022, 2026].map(year => read(new URL(`../../public/data/eleitos-${year}.json`, import.meta.url)))
 const legacyPath = new URL('../../public/data/cobertura-pesquisa-2022.json', import.meta.url)
 const bytes = readFileSync(legacyPath)
 const legado = JSON.parse(bytes.toString('utf8'))
 validateLegacyCoverage(legado, cadastros[0])
 return { cadastros, legado,
  ocorrencias: read(new URL('../../public/data/ocorrencias-publicadas.json', import.meta.url)),
  origemLegado: { arquivo: 'public/data/cobertura-pesquisa-2022.json', sha256: createHash('sha256').update(bytes).digest('hex') } }
}

export function todayBrazil() {
 return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function parseCoverageArgs(args, allowed) {
 const parsed = {}
 for (let i = 0; i < args.length; i += 2) {
  const flag = args[i], value = args[i + 1]
  if (!allowed.includes(flag) || Object.hasOwn(parsed, flag) || !value || value.startsWith('--')) {
   throw new Error('Opção inválida ou sem valor: ' + flag)
  }
  parsed[flag] = value
 }
 return parsed
}
export function readCoverage(path = coveragePath) { return read(path) }
