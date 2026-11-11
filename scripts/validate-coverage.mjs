import { validateCoverage, validateCoverageTransition } from './lib/coverage.mjs'
import { loadCoverageInputs, parseCoverageArgs, readCoverage, todayBrazil } from './lib/coverage-files.mjs'

const args = parseCoverageArgs(process.argv.slice(2), ['--arquivo', '--data', '--anterior'])
const context = { ...loadCoverageInputs(), dataReferencia: args['--data'] ?? todayBrazil() }
const data = readCoverage(args['--arquivo'])
const summary = args['--anterior']
 ? validateCoverageTransition(readCoverage(args['--anterior']), data, context)
 : validateCoverage(data, context)
console.log('Cobertura documental validada; pendência não equivale a ausência de processos.')
console.log(JSON.stringify(summary, null, 2))
