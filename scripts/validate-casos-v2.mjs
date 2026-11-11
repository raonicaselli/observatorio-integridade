import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateCasosV2, validateTransicaoV2 } from './lib/casos-v2.mjs'

const args = process.argv.slice(2)
const parsed = {}
for (let i = 0; i < args.length; i++) {
 const flag = args[i]
 assert.ok(['--arquivo', '--anterior', '--exemplo'].includes(flag), `Opção desconhecida: ${flag}`)
 assert.ok(!Object.hasOwn(parsed, flag), `Opção repetida: ${flag}`)
 if (flag === '--exemplo') parsed[flag] = true
 else {
  assert.ok(args[i + 1] && !args[i + 1].startsWith('--'), `Falta valor para ${flag}`)
  parsed[flag] = args[++i]
 }
}
assert.ok(parsed['--arquivo'], 'Uso: npm run validate:casos-v2 -- --arquivo pacote.json [--anterior snapshot.json] [--exemplo]')
const read = path => JSON.parse(readFileSync(path, 'utf8'))
const exemplo = parsed['--exemplo'] === true
const options = { exemplo, cadastros: exemplo ? [] : ['eleitos-2022.json', 'eleitos-2026.json'].map(name =>
 read(new URL('../public/data/' + name, import.meta.url))) }
const data = read(parsed['--arquivo'])
const summary = parsed['--anterior'] ? validateTransicaoV2(read(parsed['--anterior']), data, options) : validateCasosV2(data, options)
console.log(exemplo ? 'EXEMPLO FICTÍCIO validado; não autoriza publicação.' : 'Estrutura v2 validada; não substitui revisão humana nem publica dados.')
console.log(JSON.stringify(summary))
