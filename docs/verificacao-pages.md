# Instalação e verificação do GitHub Pages

## Instalação reproduzível

O projeto versiona `package-lock.json`. Use `npm ci` no desenvolvimento e nos
workflows de verificação, publicação e atualização eleitoral. O comando exige
coerência entre manifesto e lockfile e instala as versões registradas; não
reescreve o lockfile. Atualizações de dependências devem vir em PR próprio,
com revisão do diff e verificações apropriadas.

O primeiro lockfile foi gerado preservando as versões da árvore instalada usada
nos testes do MVP (React/React DOM 18.3.1, Lucide 0.468.0, Vite 6.4.5 e plugin
React 4.7.0), inclusive as versões transitivas já presentes. Não houve upgrade
intencional. Foram incluídas URLs e integridades do registro npm e dependências
opcionais de outras plataformas. Instalação limpa e testes verificam esta base;
o CI permanece em Node 22.

## Conferência da publicação em 12/11/2026

A [evidência de conferência](auditorias/verificacao-pages-2026-11-12.json)
registra a comparação entre os arquivos servidos no Pages e o artefato
`github-pages` do [deploy concluído](https://github.com/raonicaselli/observatorio-integridade/actions/runs/43221001459)
para o commit `6367f853784778a924a0c8cd8d860df259d18303` (merge do PR #32).

Os sete arquivos conferidos responderam HTTP 200 e foram idênticos byte a byte:
HTML, JavaScript, CSS, catálogo eleitoral de 2022 e 2026, ocorrências publicadas
e cobertura de pesquisa. O JSON público de 2026 contém 358 candidaturas;
seus metadados registram os dois turnos e nenhum titular do recorte eleito no
segundo. O JavaScript servido corresponde ao build aprovado, que apresenta o
aviso de retotalizações e abrangência dos turnos.

Essa comparação fornece evidência para a pendência de publicação da issue #13.
Não foi realizado teste interativo em navegador; a correspondência do artefato e
a renderização automatizada não comprovam todas as interações ou acessibilidade.
Também não certificam dados eleitorais posteriores nem situação jurídica atual.
A issue não foi alterada automaticamente nesta entrega.

## Como repetir

1. Identifique o SHA aprovado na `main` e o run bem-sucedido de publicação.
2. Consulte a configuração Pages e o deployment pelo GitHub; confirme o SHA.
3. Baixe o artefato `github-pages` desse run e leia seu `artifact.tar`.
4. Consulte o HTML, os assets referenciados por ele e os JSONs relevantes no
   site público. Compare bytes ou SHA-256 com os arquivos do artefato.
5. Registre data efetiva, SHA, run, URLs, respostas HTTP e hashes. Metadados do
   GitHub ou HTTP 200 isoladamente não comprovam que o site serve a versão certa.

Os hashes publicados registram a versão conferida. Novos deploys podem substituir
os arquivos do site e os artefatos do Actions têm retenção limitada; preserve o
artefato separadamente caso seja necessária reprodução histórica completa.
