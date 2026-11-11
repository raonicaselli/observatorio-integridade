# Evidências para revisão de identidade entre eleições

A etapa da issue #15 compara os cadastros oficiais de candidaturas, sem aprovar
vínculos pessoais ou transportar ocorrências jurídicas entre anos. O arquivo
`public/data/vinculos-eleitorais-pendentes.json` permanece inalterado: suas 142
sugestões por nome e UF continuam pendentes de revisão humana.

## Conferência de 11 de novembro de 2026

O [relatório de evidências](auditorias/evidencias-identidade-2026-11-11.json)
registra 144 pares com coincidência documental, todos pendentes. As 234
candidaturas de 2022 e 358 de 2026 foram localizadas nos arquivos nacionais do
TSE, com identificadores fiscais válidos e unívocos no respectivo recorte.
Nenhum campo público comparado apresentou diferença em relação ao catálogo.

As 142 sugestões anteriores tiveram coincidência de identificador. Dois pares
adicionais foram encontrados apesar das diferenças nos nomes cadastrados:

| Candidatura de 2022 | Candidatura de 2026 |
| --- | --- |
| 250001610130 — FABIANA DE LIMA BARROSO | 250002536380 — FABIANA DE LIMA BARROSO SOUZA |
| 250001611333 — LUIZ PHILIPPE DE ORLEANS E BRAGANÇA | 250002535958 — LUIZ PHILIPPE DE ORLEANS BRAGANCA |

Esses resultados não atestam ausência de erros nos cadastros oficiais. Não
constituem pesquisa jurídica nem confirmam identidade em autos judiciais.
Nenhuma decisão editorial ou alteração da interface faz parte desta entrega.

## Método e reprodução

O comando usa somente a biblioteca padrão do Python 3 e não acessa a rede.
Obtenha os ZIPs oficiais pelos URLs registrados no relatório e mantenha-os em
armazenamento privado, fora do checkout público. Não envie os arquivos, CPFs,
hashes individuais ou outros dados pessoais ao Git ou aos logs de CI.

```sh
python3 scripts/compare-identities.py \
  --cand-2022 /caminho/privado/consulta_cand_2022.zip \
  --cand-2026 /caminho/privado/consulta_cand_2026.zip \
  --data 2026-11-11 \
  --output /caminho/novo/relatorio.json
```

A leitura considera exclusivamente o CSV nacional `BRASIL`, associa cada linha
ao `SQ_CANDIDATO` do catálogo e compara `NR_CPF_CANDIDATO` apenas em memória.
Exige onze dígitos e verificadores válidos; rejeita sequências uniformes. Não
completa identificadores truncados e não tenta resolver lacunas pelo nome.
Linhas repetidas entre turnos são aceitas somente se consistentes. Dados
mascarados, ausentes, conflitantes ou identificadores repetidos entre candidatos
do mesmo recorte impedem a comparação do candidato afetado.

O resultado distingue coincidência, divergência e dados insuficientes, mantendo
sempre `pendente_revisao_humana`. Preserva os pares originais e acrescenta apenas
coincidências documentais unívocas. O relatório contém os IDs das candidaturas,
resultados agregados e hashes dos arquivos completos, sem identificadores fiscais
nem hashes individuais. Uma saída existente só pode ser reutilizada se seu
conteúdo for idêntico; uma nova conferência exige outro arquivo.

Os URLs oficiais são mutáveis. Confira os hashes SHA-256 dos ZIPs e das bases
registrados no relatório antes de reproduzir esta fotografia; o hash sozinho
não conserva o arquivo original. A versão de 2026 consultada nesta etapa pode
diferir da usada na importação eleitoral anterior. Esta conferência não altera
os votos, os resultados eleitorais ou sua proveniência.

## Revisão humana e próximos critérios de aceite

Antes de promover qualquer vínculo, um revisor deve conferir os dois registros
oficiais, os IDs de candidatura, a qualidade das fontes e eventuais mudanças de
nome, UF ou cargo. Deve registrar fonte, data, método, justificativa e autoria da
decisão. Divergências e insuficiências precisam permanecer explícitas; não devem
ser convertidas em confirmação por semelhança nominal.

O registro validado descrito abaixo separa decisões humanas das evidências
automáticas, preserva decisões anteriores e bloqueia associações incompatíveis.
Somente vínculos confirmados poderão fundamentar uma pessoa estável e navegação
entre eleições. A associação dessa pessoa a processos ainda exige identificação
documental própria. A issue #15 permanece aberta.

## Registro de decisões humanas (versão 1)

O arquivo [registro-decisoes-identidade.json](registro-decisoes-identidade.json)
começa vazio. As 144 coincidências continuam pendentes. O registro fica fora de
`public/` e não é consumido pela aplicação. A inclusão de uma decisão exige
revisão documental humana e PR revisável; o comando não cria decisões.

Cada entrada deve conter exatamente:

| Campo | Regra |
| --- | --- |
| `id` | Identificador único da decisão, 3–80 caracteres minúsculos, números ou hífens; começa por letra ou número. |
| `candidaturaId2022`, `candidaturaId2026` | Strings correspondentes a um par no snapshot de evidências. |
| `estado` | `confirmado`, `divergente` ou `inconclusivo`. |
| `data` | Dia real ISO, a partir da conferência das evidências e até a data da validação. |
| `revisor` | Identificação pública do responsável, como seu usuário GitHub; nunca credenciais ou dados pessoais desnecessários. |
| `metodo`, `justificativa` | Descrição da conferência efetivamente realizada e da decisão, sem copiar identificadores fiscais. |
| `fontes` | URLs oficiais do snapshot consultadas; confirmação exige as fontes dos dois anos. |
| `evidenciaSha256` | SHA-256 dos bytes completos do relatório de evidências utilizado. |
| `substitui` | `null` na primeira decisão do par; depois, ID da última decisão desse mesmo par. |

O validador está vinculado ao snapshot de 11/11/2026. Não altere esse snapshot
para acomodar novas fontes: uma futura evolução do contrato deverá suportar
outras versões sem invalidar o histórico existente. O hash pode ser consultado
com `sha256sum docs/auditorias/evidencias-identidade-2026-11-11.json`.

```sh
npm run validate:identidades
npm run validate:identidades -- --arquivo /caminho/registro-proposto.json \
  --anterior /caminho/registro-anterior.json --data 2026-11-11
```

Uma correção acrescenta uma nova decisão, preservando todas as anteriores e sua
ordem. Vale o último estado de cada par; corrigir para `inconclusivo` ou
`divergente` retira a confirmação anterior. Duas confirmações ativas não podem
compartilhar uma candidatura de nenhum dos anos. O CI e o deploy comparam o
registro com o commit anterior e recusam remoções, edições ou reordenação do
histórico. Mudanças nos argumentos do comando e nos validadores também exigem
revisão de código.

A validação estrutural não prova quem revisou os documentos nem sua veracidade.
Uma coincidência automática é requisito para confirmação neste contrato, mas
não substitui a decisão humana. Diferenças públicas sinalizadas no relatório
precisam ser examinadas e explicadas na justificativa. Não inclua CPFs, hashes
individuais, cópias dos ZIPs ou pesquisa jurídica não aprovada no registro.

Critérios desta etapa: estados distintos, fontes e autoria obrigatórias,
rastreabilidade para o snapshot, correções sem perda de histórico, bloqueio de
associações incompatíveis e testes automatizados. Permanecem para etapas
posteriores a revisão efetiva dos pares, a definição de pessoas estáveis e a
navegação entre eleições. Nenhuma associação a processos é autorizada por esse
registro isoladamente.
