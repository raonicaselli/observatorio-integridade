import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateMigrationV1V2 } from './lib/migration-v1-v2.mjs'

const args = process.argv.slice(2)
const parsed = {}
for (let i = 0; i < args.length; i++) {
 const flag = args[i]
 assert.ok(['--manifesto', '--origem', '--destino', '--exemplo'].includes(flag), `Opção desconhecida: ${flag}`)
 assert.ok(!Object.hasOwn(parsed, flag), `Opção repetida: ${flag}`)
 if (flag === '--exemplo') parsed[flag] = true
 else {
  assert.ok(args[i + 1] && !args[i + 1].startsWith('--'), `Falta valor para ${flag}`)
  parsed[flag] = args[++i]
 }
}
for (const flag of ['--manifesto', '--origem', '--destino']) assert.ok(parsed[flag], `Arquivo explícito obrigatório: ${flag}`)
const readJson = path => JSON.parse(readFileSync(path, 'utf8'))
const exemplo = parsed['--exemplo'] === true
const options = { exemplo, cadastros: exemplo ? [] : ['eleitos-2022.json', 'eleitos-2026.json'].map(name =>
 readJson(new URL('../public/data/' + name, import.meta.url))) }
const result = validateMigrationV1V2(readJson(parsed['--manifesto']), readFileSync(parsed['--origem']), readFileSync(parsed['--destino']), options)
console.log(exemplo ? 'EXEMPLO FICTÍCIO: correspondências validadas.' : 'Correspondências estruturais validadas; não comprova revisão humana nem publica dados.')
console.log(JSON.stringify(result))
