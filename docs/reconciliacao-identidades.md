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

A próxima entrega deve definir um registro validado de decisões humanas,
separado das evidências automáticas, com estados confirmado, divergente e
inconclusivo, preservação de decisões anteriores e testes contra associação
indevida. Somente vínculos confirmados poderão fundamentar uma pessoa estável
e navegação entre eleições. A associação dessa pessoa a processos ainda exige
identificação documental própria. A issue #15 permanece aberta.
