import { existsSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { syncCoverage, validateCoverage } from './lib/coverage.mjs'
import { coveragePath, loadCoverageInputs, parseCoverageArgs, readCoverage, todayBrazil } from './lib/coverage-files.mjs'

const args = parseCoverageArgs(process.argv.slice(2), ['--arquivo', '--data'])
const target = args['--arquivo'] ?? fileURLToPath(coveragePath)
const date = args['--data'] ?? todayBrazil()
const context = loadCoverageInputs()
const existing = existsSync(target) ? readCoverage(target) : null
const result = syncCoverage(existing, { ...context, atualizadoEm: date })
const summary = validateCoverage(result, { ...context, dataReferencia: date })
const directory = mkdtempSync(join(dirname(resolve(target)), '.coverage-'))
const temporary = join(directory, 'snapshot.json')
try {
 writeFileSync(temporary, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
 renameSync(temporary, target)
} finally {
 rmSync(directory, { recursive: true, force: true })
}
console.log('Controle reconciliado sem criar consultas ou concluir pesquisas.')
console.log(JSON.stringify({ total: summary.total, porAno: summary.porAno }))
