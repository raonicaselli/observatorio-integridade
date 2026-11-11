import assert from 'node:assert/strict'

const FEDERAL_REGIONS = [
 ['trf1.jus.br', 'AC AM AP BA DF GO MA MT PA PI RO RR TO'],
 ['trf2.jus.br', 'ES RJ'], ['trf3.jus.br', 'MS SP'],
 ['trf4.jus.br', 'PR RS SC'], ['trf5.jus.br', 'AL CE PB PE RN SE'], ['trf6.jus.br', 'MG']
]
const under = (host, domain) => host === domain || host.endsWith('.' + domain)

/** Conservative portal policy for the initial research protocol; it does not verify source content. */
export function validateCoverageSource(source, scope) {
 const url = new URL(source.url)
 assert.ok(url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash,
  'Fonte deve ser portal HTTPS sem credenciais, consultas ou fragmentos')
 assert.ok(['jus.br', 'mp.br', 'gov.br', 'leg.br'].some(domain => under(url.hostname, domain)),
  'Domínio de fonte não reconhecido como oficial')
 const state = scope.toLowerCase()
 let accepted = false
 switch (source.grupo) {
  case 'stf': accepted = scope === 'BR' && under(url.hostname, 'stf.jus.br'); break
  case 'stj': accepted = scope === 'BR' && under(url.hostname, 'stj.jus.br'); break
  case 'justica_eleitoral':
   accepted = under(url.hostname, scope === 'BR' ? 'tse.jus.br' : `tre-${state}.jus.br`); break
  case 'justica_estadual':
   accepted = scope !== 'BR' && under(url.hostname, scope === 'DF' ? 'tjdft.jus.br' : `tj${state}.jus.br`); break
  case 'justica_federal': {
   const region = FEDERAL_REGIONS.find(([, states]) => states.split(' ').includes(scope))?.[0]
   accepted = region !== undefined && (under(url.hostname, region) || under(url.hostname, `jf${state}.jus.br`)); break
  }
  case 'ministerio_publico':
   accepted = under(url.hostname, scope === 'BR' ? 'mpf.mp.br' : scope === 'DF' ? 'mpdft.mp.br' : `mp${state}.mp.br`); break
  case 'policia_federal':
   accepted = scope === 'BR' && (under(url.hostname, 'pf.gov.br') ||
    (['gov.br', 'www.gov.br'].includes(url.hostname) && (url.pathname === '/pf' || url.pathname.startsWith('/pf/')))); break
 }
 assert.ok(accepted, 'Portal incompatível com o órgão ou a abrangência da consulta')
}
