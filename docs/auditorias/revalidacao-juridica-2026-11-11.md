# Revisão documental dos 13 registros — 11/11/2026

Esta rodada foi solicitada pelo mantenedor e realizada com checagem assistida
por IA. É uma proposta para revisão no PR, não revisão jurídica independente nem
certificação integral dos autos. Não foram incluídos novos registros ou envolvidos.

## Método e preservação

- As 19 URLs distintas já citadas responderam HTTP 200. Foram lidos os trechos
  relevantes de notícias, manifestações reproduzidas e do informativo do TSE.
  Acesso bem-sucedido não foi considerado comprovação automática da redação.
- Seguindo os links e os serviços públicos do STF, foram consultados identificação,
  partes e andamentos disponibilizados das ações relevantes. Foram examinados
  o dispositivo da decisão da AP 2782 e o registro nominal de Ramagem na AP 2668.
- Foram diferenciados data do julgamento, data da assinatura, lançamento no
  andamento e publicação. Uma previsão para depois do trânsito em julgado não
  foi tratada como certidão de que ele já ocorreu.
- Fontes anteriores foram preservadas. O [relatório JSON](revalidacao-juridica-2026-11-11.json)
  guarda URLs, datas de consulta, hashes dos bytes recebidos, justificativa e
  valores antes/depois por campo. Os hashes da base e da proposta permitem
  conferir a versão desta rodada, não autenticar semanticamente uma decisão.
- Os corpos dos documentos, CPFs, endereços e peças integrais não foram incluídos
  no repositório. O relatório contém apenas informações necessárias sobre os
  registros já publicados. A decisão pública da PET 16669 foi localizada pelo
  link da notícia oficial, com leitura dirigida do dispositivo, não revisão
  integral de suas 150 páginas.

A conferência de nomes foi feita sem associar as 142 sugestões entre eleições.
Na AP 2670 foram cotejados os nomes de Josimar Cunha Rodrigues e Gildenemir de
Lima Sousa; nas ações individuais, os nomes disponibilizados nas partes foram
comparados ao cadastro eleitoral. No Inq 4999, a aba de partes não forneceu dados
legíveis: o cadastro oficial da Câmara confirmou a correspondência entre Gilvan
da Federal, Gilvan Aguiar Costa e ES, em conjunto com o cadastro TSE já usado.
Isso não representa certificação independente de identidade civil.

## Resultado por registro

| Registro | Resultado da rodada | Limitação que permanece |
| --- | --- | --- |
| Josimar — AP 2670 | Condenação por corrupção passiva e absolvição por organização criminosa preservadas; embargos e identificação nominal cotejados | Não foi confirmada certidão de trânsito específica do parlamentar no material exibido |
| Pastor Gil — AP 2670 | Mesma distinção entre condenação e absolvição, com conferência individual | Resultado de outro réu não foi transferido a ele |
| Cláudio Castro — TSE | Notícias sobre decisão eleitoral e embargos relidas; ficha jurídica inalterada | Andamentos posteriores não recuperados; não se afirma trânsito |
| Jorginho Mello — TRE-SC | Notícia sustenta multa de R$ 5 mil e remoção de propaganda; ficha jurídica inalterada | Interface PJe não forneceu andamentos verificáveis nesta rodada |
| Jorge Seif — TSE | Informativo, página 1, confirma rejeição favorável da ação e julgamento de embargos | O resultado favorável não substitui os argumentos da defesa; recursos posteriores não confirmados |
| Sóstenes — PET 14918 | Investigação preservada; corrigida atribuição de defesa para a explicação de venda de imóvel efetivamente reproduzida pelo STF | Portal indica sigilo; não se certifica fase integral atual |
| Carlos Jordy — PET 14918 | Investigação e manifestação de defesa preservadas com fontes | Portal indica sigilo; não se transfere a ele resultado de outro alvo |
| Mario Frias — PET 16669 | Medidas investigativas documentadas; defesa atribuída à reportagem que a reproduz | Notícia e decisão divulgadas não certificam andamento posterior de autos indicados como sigilosos |
| Alexandre Ramagem — AP 2668 | Definitividade sustentada por registro nominal do referendo de 26/11/2025 | AP 2737 permanece distinta; não se atribui a ela o mesmo desfecho |
| Eduardo Bolsonaro — AP 2782 | **Corrigido para decisão definitiva**, com dispositivo de 07/10/2026 que declara trânsito e início da execução | A efetivação das ordens de execução e medidas autônomas posteriores não foi integralmente auditada |
| Eduardo Bolsonaro — AP 1053 | Condenação preservada; ata publicada em 30/09/2026 e ressalva sobre trânsito | A definitividade da AP 2782 não foi transferida à AP 1053 |
| Gustavo Gayer — Inq 4974 | Pauta de embargos registrada em 04/11, prevista para 13–23/11/2026 | Agendamento não é julgamento concluído nem condenação; exige nova checagem após a sessão |
| Gilvan da Federal — Inq 4999 | Publicação do acórdão em 01/10/2026 e identificação nominal cotejadas | Apenas andamentos públicos parciais; publicação do acórdão não equivale a condenação |

### Correção material na AP 2782

A ficha anterior dizia não ter sido verificado trânsito em julgado. Na consulta
atual, os andamentos exibiram o registro e uma decisão que o declara expressamente.
O PDF oficial é identificado como AP 2782, nomeia Eduardo Nantes Bolsonaro e,
nas páginas 6–7, declara o trânsito e determina início de execução.

A peça é datada de **7 de outubro de 2026**, embora apareça no andamento de
**8 de outubro**. O novo marco usa a data da decisão. A alteração não afirma que
a pena já foi efetivamente cumprida nem modifica o estado de outras ações.
Os argumentos da defesa pela DPU permanecem na ficha.

### Correção de atribuição de defesa

A ficha de Sóstenes reunia uma alegação de perseguição política e uma explicação
sobre venda de imóvel. A reportagem da Agência Brasil citada reproduz declaração
de **Carlos Jordy** e informa que buscava contato com Sóstenes ou sua defesa.
Já a notícia do STF de 01/07/2026 reproduz a explicação do imóvel atribuída a
Sóstenes. A nova redação se limita a isso, sem transferir a manifestação de Jordy.

No caso de Seif, foi explicitado que resultado processual favorável não é
manifestação de defesa. Não se inventou contato, negativa ou argumento não localizado.

## Acessos inconclusivos

- Abas de recursos do STF retornaram HTTP 200 com corpo vazio. Isso **não** foi
  interpretado como ausência de recurso. Foram usados andamentos e peças
  efetivamente disponibilizados.
- PET 14918, PET 16669 e Inq 4999 indicam sigilo na identificação pública. No
  último, há andamentos públicos limitados, mas a aba de partes ficou sem conteúdo
  legível. Não foram usados meios de contornar restrições de acesso.
- A consulta unificada eleitoral carregou seu HTML, mas o script principal
  ES2015 retornou HTTP 503. O pacote de compatibilidade ES5 e o runtime foram
  obtidos posteriormente, mas isso não constitui sessão interativa ou consulta aos
  autos. Os andamentos eleitorais não foram recuperados de forma verificável
  nesta rodada; não se conclui daí que não existam recursos.
- Pesquisa por número pode trazer decisões sobre outros procedimentos. Elas não
  foram usadas para afirmar arquivamento, condenação ou absolvição nestes casos.

## Cobertura registrada e próximos passos

Foram propostas **17 entradas de consulta pontual em 12 candidaturas**, incluindo
as tentativas de acesso cujo resultado foi inconclusivo. O controle passa a ter
12 triagens iniciais em 2022, 222 não iniciadas em 2022 e 358 não iniciadas em 2026.
Nenhuma pesquisa foi marcada como concluída; o histórico legado permanece intacto.
As duas divergências históricas continuam visíveis no diagnóstico.

As próximas revisões de 18/11 são propostas de acompanhamento, não consultas
já realizadas. Para o Inq 4974, foi proposta revisão em 24/11, após o período
previsto da sessão, sujeita a eventual mudança de pauta.

A issue #14 deve continuar aberta. Faltam acompanhamento da pauta, recuperação
dos andamentos eleitorais e reavaliação dos procedimentos com acesso restrito,
além do restante do protocolo de cobertura. A migração v2 e a pesquisa de novos
casos continuam separadas desta atualização.

## Validação e revisão própria

Na revisão própria foram conferidos IDs, candidaturas, casos, absolvições e
fontes antigas preservadas, hashes dos documentos recebidos e correspondência
dos valores antes/depois no relatório. Foram corrigidas as distinções entre
assinatura e lançamento da decisão, a atribuição da defesa e inferências sobre
alvos de outra fase. Não houve alteração da lógica da aplicação.
Os validadores estruturais e testes não conferem a verdade jurídica da pesquisa.
O merge do PR continua sendo a etapa de revisão da proposta pelo mantenedor.
