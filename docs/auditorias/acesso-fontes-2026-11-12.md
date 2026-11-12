# Reconsulta técnica de fontes — 12/11/2026

Esta entrega verifica o acesso a oito URLs usadas na rodada de 11/11 e registra
seus limites. Não altera as 13 ocorrências, não atualiza sua data de revisão,
não declara cobertura concluída e não certifica o estágio atual dos processos.
A issue #14 permanece aberta. O [manifesto técnico](acesso-fontes-2026-11-12.json)
registra URL, instante da tentativa, status, tamanho e hash dos bytes recebidos
quando disponíveis. O hash é da **resposta**, não uma certificação de documento.

## Resultados de acesso

| Fonte | Resultado observado nesta tentativa | Consequência |
| --- | --- | --- |
| Extratos de andamentos das APs 2782, 2670 e 1053 e do Inq 4974 | HTTP 200 com conteúdo público recebido | Exige leitura e revisão do conteúdo antes de qualquer atualização jurídica; disponibilidade não comprova ausência de recurso. |
| Aba pública de partes da AP 2782 | HTTP 200 com conteúdo recebido | Não constitui confirmação automática de identidade civil ou entre eleições. |
| PDF da AP 2782 já citado na base | HTTP 200 com **zero bytes** | A tentativa não obteve uma nova cópia legível da peça. Não renovar a data de consulta do documento preservado de 11/11. |
| Página inicial da consulta unificada PJe eleitoral | HTTP 200 com página de proteção, sem a aplicação de consulta | Não foram recuperados andamentos eleitorais; não se conclui que inexistam recursos. Não foram contornadas proteções ou restrições. |
| URL do script ES2015 registrada na rodada anterior | HTTP 503 | Trata-se da URL anteriormente conhecida, não de comprovação de falha de todos os scripts ou do serviço para qualquer usuário. |

A cópia do PDF preservada na rodada de 11/11 teve seu hash conferido contra o
relatório anterior. Ela continua sendo uma fonte consultada naquela data; uma
resposta vazia em 12/11 não renova sua consulta nem invalida automaticamente o
conteúdo preservado. Peças integrais, dados pessoais desnecessários e anotações
jurídicas sem aprovação permanecem fora do repositório público.

## Efeito sobre a sequência de trabalho

A preparação de uma migração v2 deve distinguir data do ato, publicação,
certificação, consulta e revisão editorial. Deve registrar a proveniência real
da versão do documento usada e explicar a indisponibilidade da reconsulta,
sem preencher lacunas com datas de outra fonte ou de outro acontecimento.
Nenhum registro se torna aprovado por estar estruturalmente válido.

A seleção de um primeiro caso para migração pode avançar em ambiente privado.
O pacote público depende da revisão humana da identidade, das fontes, do escopo
e das informações preservadas. Esta tentativa de acesso não fornece essa
aprovação e não propõe novos resultados jurídicos.

As revisões de acompanhamento propostas para 18/11 e 24/11 continuam futuras.
Não se antecipa o resultado de sessões previstas nem se registra uma consulta
futura como realizada.

## Validação e revisão própria

Foram conferidos formato JSON, correspondência com o manifesto privado das
requisições, hashes dos bytes disponíveis e preservação da base pública. Na
revisão própria, status HTTP foi separado de conteúdo útil; a tentativa ao script
foi identificada como uso de URL anterior, e a consulta do PDF preservado não foi
redatada. Esta é revisão própria, não revisão jurídica independente. Não foram
executados testes da aplicação: a entrega modifica somente este relatório e
seu manifesto, sem lógica, interface, workflows ou dados consumidos pelo site.
