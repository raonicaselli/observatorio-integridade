import assert from 'node:assert/strict'

/** Require a real calendar day; Date.parse alone normalizes impossible dates. */
export function assertIsoDate(value, label) {
 assert.ok(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), `${label}: data ISO obrigatória`)
 const parsed = new Date(value + 'T00:00:00Z')
 assert.ok(!Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value, `${label}: data inexistente`)
}
