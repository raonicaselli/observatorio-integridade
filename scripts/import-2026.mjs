// Compatibility entry point. All imports now use the official TSE files.
// The former third-party CSV import could overwrite the consolidated base with first-turn data.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const script = fileURLToPath(new URL('./import-tse-2026.py', import.meta.url))
const result = spawnSync('python3', [script, ...process.argv.slice(2)], { stdio: 'inherit' })
if (result.error) throw result.error
process.exit(result.status ?? 1)
