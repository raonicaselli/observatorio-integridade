import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { validateIdentityDecisions } from './lib/identity-decisions.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const args = process.argv.slice(2)
const options = {}
for (let i = 0; i < args.length; i += 2) {
 const flag = args[i], value = args[i + 1]
 if (!['--arquivo', '--anterior', '--data'].includes(flag) || !value || value.startsWith('--') || flag in options) {
  throw new Error('Uso: validate-identity-decisions.mjs [--arquivo caminho] [--anterior caminho] [--data AAAA-MM-DD]')
 }
 options[flag] = value
}
const read = path => JSON.parse(readFileSync(path, 'utf8'))
const evidenceBytes = readFileSync(resolve(root, 'docs/auditorias/evidencias-identidade-2026-11-11.json'))
const context = {
 evidence: JSON.parse(evidenceBytes),
 evidenceSha256: createHash('sha256').update(evidenceBytes).digest('hex'),
 today: options['--data'] ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()),
}
const data = read(options['--arquivo'] ?? resolve(root, 'docs/registro-decisoes-identidade.json'))
const previous = options['--anterior'] ? read(options['--anterior']) : undefined
console.log(JSON.stringify(validateIdentityDecisions(data, context, previous), null, 2))
