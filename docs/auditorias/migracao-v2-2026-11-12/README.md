# Primeiro lote documental v2 — AP 2782

## Escopo e revisão

Em 12/11/2026, depois da apresentação da ficha privada do piloto AP 2782, o
mantenedor respondeu **“verificado”** nesta sessão. A confirmação foi registrada
como aprovação da ficha para preparar este pacote e seu manifesto, restritos a
uma candidatura de 2022, um caso, um processo e dois eventos. A preparação foi
assistida por IA; não se declara revisão jurídica independente.

O pacote aprovado está em `public/data/casos-v2.json`; a correspondência está em
`public/data/migracao-v1-v2.json`. As referências no pacote preservam o nome,
`SQ_CANDIDATO`, UF, cargo e partido da candidatura de 2022. Não há confirmação ou
transferência de histórico para 2026: os 144 pares entre eleições continuam
pendentes no registro específico de decisões de identidade.

## Preservação e limites da transformação

O [snapshot de origem](origem-v1.json) preserva os bytes da base v1 aprovada na
`main` `6720bb5`, antes da migração. SHA-256:
`feecb74c456b90a9c5a5603fb0dd7021dc1a0bf9d1232e9774e780844a05b365`.
É um arquivo histórico, não uma segunda base ativa. O manifesto mantém também a
ocorrência selecionada integralmente e registra os hashes da origem e do destino.

Somente `stf-eduardo-ap2782-2026` tem correspondência neste lote. As outras 12
ocorrências permanecem exclusivamente representadas em v1. A base v1 ativa
permanece inalterada, com 13 registros; o build ainda usa essa base na interface.
O pacote v2 é acessível como JSON após o deploy, mas não é somado à contagem de
ocorrências nem apresentado como nova pesquisa concluída.

| Evento v2 | Data | Sustentação e limite |
| --- | --- | --- |
| Trânsito da condenação | 03/10/2026 | Página 6 da decisão posterior cita expressamente a certidão; a certidão individual não foi obtida separadamente. |
| Decisão que determina início da execução | 07/10/2026 | Dispositivo nas páginas 6–7; não comprova cumprimento efetivo da pena. |

A certificação de 05/10 e o lançamento no andamento de 08/10 são datas distintas,
não eventos substitutos. Julgamento, publicação e recursos anteriores permanecem
na síntese histórica aprovada; não são desmembrados em eventos novos neste lote.

O evento de 03/10 registra a definitividade da condenação, sustentada pela peça.
Já o campo de trânsito do evento de 07/10 é `nao_verificado`: não declara a
definitividade da **decisão posterior de execução** nem desfaz a informação do
evento anterior. Seus recursos ou medidas posteriores não foram integralmente
auditados. A relação `desdobramento_de` explicita a sequência entre os atos.
A interface futura deve manter essa distinção, sem resumir o caso pelo estado
do último evento.

Os argumentos atribuídos à DPU foram conservados nos dois eventos como contexto
do julgamento anterior, com fonte institucional explícita. Não são apresentados
como nova manifestação sobre execução. A filiação na data específica dos fatos
continua desconhecida; o partido eleitoral não é copiado para esse campo.
Datas precisas dos fatos e imputações adicionais não são inventadas.

## Fontes e consultas

As cinco URLs da ocorrência original continuam no contexto correto, com uma
sexta fonte eleitoral para a candidatura. Datas e hashes foram reaproveitados
das evidências efetivamente preservadas nas auditorias de 11 e 12/11, sem
apresentar a montagem do pacote como nova consulta judicial.

- PDF: cópia consultada em **11/11**, hash conferido; o HTTP 200 vazio em 12/11 não
  renova sua consulta. O localizador descreve páginas e limitações.
- Notícia institucional e página de detalhe: consulta de **11/11**, sem alegar
  releitura em 12/11. A notícia não é inteiro teor.
- Extrato de andamentos e aba de partes: conteúdo recebido em **12/11**, com hash
  próprio. Ausência de novidade visível não comprova ausência de medidas externas.
- TSE: consulta ao ZIP de candidaturas de 2022 em **11/11**, por `SQ_CANDIDATO`.
  O hash é do ZIP completo. CPFs, peças integrais e dados pessoais desnecessários
  não são exportados.

A data de publicação das fontes fica `null` quando não foi individualmente
estabelecida neste lote. A data do ato não foi copiada para a publicação da fonte.

## Validação e publicação

```sh
npm run validate:piloto-v2
npm run validate:casos-v2 -- --arquivo public/data/casos-v2.json
npm test
npm run build
```

CI e deploy validam o manifesto e, quando houver pacote anterior, comparam o v2
com o commit de origem para impedir remoção ou alteração de eventos e fontes.
O workflow de atualização eleitoral também valida o piloto antes de propor PR.
Uma eventual retirada da candidatura por retotalização deverá ser resolvida
com cadastro histórico revisado, sem apagar os fatos jurídicos.

A revisão própria conferiu associações, datas, atribuição da defesa, referências,
preservação dos bytes e a distinção entre os dois estados de trânsito. Foram
adicionados testes de integração do pacote real com o manifesto, além dos testes
fictícios do contrato. Testes estruturais não constituem nova auditoria dos autos.
O próximo PR de interface deverá consumir o v2 com fallback v1, sem duplicações.
