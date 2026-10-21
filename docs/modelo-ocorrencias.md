# Modelo editorial de ocorrências documentadas (rascunho metodológico)

Este documento especifica uma **camada futura** do Observatório. A primeira versão publicada contém apenas resultados eleitorais.

## Princípios

- Uma candidatura (identificada por `SQ_CANDIDATO`) e uma pessoa não são a mesma entidade; candidaturas em anos diferentes precisam de reconciliação de identidade.
- Uma **ocorrência** é um fato ou procedimento documentado, com descrição neutra, data, natureza jurídica, fonte e pessoa(s) envolvida(s), sem implicar culpa.
- Uma ocorrência pode ter diferentes **eventos processuais**: investigação, denúncia, decisão, recurso, arquivamento, absolvição, condenação etc.
- A filiação no ano da eleição não determina automaticamente a filiação quando o fato ocorreu ou quando o procedimento foi iniciado.
- A ausência de ocorrência no portal significa somente que nenhuma ocorrência foi **publicada e revisada**.

## Entidades mínimas

### `pessoas`
`pessoa_id` (interno), nome canônico, nomes históricos, estado de verificação da identidade, evidências de correspondência.

### `candidaturas`
`SQ_CANDIDATO`, ano, partido na candidatura, cargo, UF, votos, situação totalizada, origem, data da última verificação.

### `ocorrencias`
`ocorrencia_id`, `pessoa_id`, título descritivo, síntese factual com atribuição, tipo, data ou período dos fatos, fase atual, verificação editorial, data da última revisão.

### `eventos_processuais`
`evento_id`, `ocorrencia_id`, data, tipo de movimentação, órgão competente, resumo, fonte documental, recurso conhecido e eventuais retificações.

### `fontes`
`fonte_id`, `ocorrencia_id`, URL canônica, instituição/veículo, título, data de publicação (quando disponível), data de acesso, tipo (primária/oficial ou secundária).

## Estados editoriais (não confundir com estados jurídicos)

- `rascunho`: coleta inicial, **não publicar**.
- `em_verificacao`: identidade, fontes e estado processual em conferência, **não publicar**.
- `revisao_final`: aguardando conferência jurídica/editorial, **não publicar**.
- `publicado`: aprovado por revisor e liberado para exportação pública.
- `corrigir_ou_retirar`: requer intervenção, retirar da base publicada até revisão.

**Atenção:** o repositório GitHub está público. Portanto, **nem mesmo rascunhos que contenham alegações não verificadas devem ser commitados aqui**. Manter pesquisas preliminares em um repositório privado ou sistema editorial restrito. A publicação ocorrerá por importação de dados expressamente aprovados.

## Requisitos mínimos para publicação

1. Identidade da pessoa confirmada e vinculada ao registro eleitoral correto.
2. Descrição objetiva sem juízo de culpa e sem detalhes sensíveis desnecessários.
3. Fonte pública verificável, preferencialmente documento primário oficial; a decisão não pode ser inferida apenas de uma manchete.
4. Estado atual do procedimento revisado, registrando recursos, arquivamento ou absolvição quando conhecidos.
5. Data dos fatos, data da atualização e relação com a filiação partidária documentadas ou marcadas como desconhecidas.
6. Revisão humana com responsável, data e justificativa rastreáveis.
7. Canal para correções e contestação, sem prometer ausência de ocorrências quando nada foi localizado.

## Métricas públicas

Evitar rankings automáticos de indivíduos ou partidos baseados na mera contagem de notícias, ações ou investigações. As categorias jurídicas devem ser consultáveis separadamente, distinguindo alegações, decisões não definitivas e condenações transitadas em julgado.

## Fluxo sugerido

Coleta privada → checagem de identidade → checagem de fontes → revisão de estágio/desfecho → aprovação editorial → publicação de pacote JSON validado → histórico de correções.
