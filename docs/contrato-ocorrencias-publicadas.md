# Contrato editorial — ocorrências documentadas v1.2

O projeto registra fatos de interesse público relacionados a pessoas eleitas. **Não é uma lista de culpados, um score de corrupção nem uma certidão negativa.** Todos os registros visíveis deverão ter revisão editorial humana e fontes acessíveis.

A base pública de ocorrências é `public/data/ocorrencias-publicadas.json` e aceita somente registros com `statusEditorial: "publicado"` e aprovação editorial completa. A coleta preliminar e a revisão final permanecem em ambiente privado, fora deste repositório público, mesmo nas branches de desenvolvimento. Esta revisão do contrato não muda a versão 1 da estrutura JSON.

## Tipos de registro (não são equivalentes)

| `tipoRegistro` | Nome público | Requisitos de comprovação | O que não significa |
|---|---|---|---|
| `apuracao_jornalistica` | Apuração jornalística | Reportagem investigativa substancial, elementos documentais descritos, **duas fontes de veículos diferentes** e revisão humana de independência editorial | Não prova que houve investigação oficial ou ilícito |
| `pedido_de_apuracao` | Pedido de apuração | Protocolo/representação documentada em fonte oficial | Não implica abertura de investigação |
| `investigacao_oficial` | Investigação oficial | Confirmação oficial do procedimento e vínculo inequívoco da pessoa | Não é denúncia recebida nem condenação |
| `processo_ou_decisao` | Processo ou decisão | Documento oficial indicando fase e resultado, com recursos e desfechos | Nem toda decisão implica culpa |

Para investigação jornalística com apenas uma reportagem ou com fontes anônimas não corroboradas, **não publicar** até surgirem elementos adicionais verificáveis. Reproduções de release ou da mesma notícia por diferentes sites não contam como duas fontes independentes. O validador checa apenas domínios distintos — cabe ao revisor verificar independência, evidências e confiabilidade.

**Notícia-crime apresentada por adversário político** é classificada como `pedido_de_apuracao`, e não como `investigacao_oficial` sem confirmação de abertura. Pessoas meramente citadas em inquérito, sem indicação de serem investigadas, também não entram automaticamente na categoria `investigacao_oficial`.

## Estrutura do registro

Campos obrigatórios:

- `id`: identificador de ocorrência estável.
- `idCaso`: identifica o **mesmo episódio** mesmo que novas fases ou matérias surjam; evita multiplicação indevida.
- `candidaturaId`: `SQ_CANDIDATO` do TSE 2022, até implementarmos identificador pessoal transversal.
- `statusEditorial`: exclusivamente `publicado` na base pública.
- `tipoRegistro`: uma das quatro categorias acima.
- `categoria`: eleitoral, penal, cível, administrativa ou outra.
- `situacaoProcessual`: `apuracao_jornalistica`, `pedido_de_apuracao`, `investigacao`, `denuncia_recebida`, `acao_em_andamento`, `decisao_nao_definitiva`, `decisao_definitiva`, `arquivado`, `absolvido`, `extinto_sem_merito`, `outro`.
- `titulo`, `resumo`, `descricaoSituacao`: descrições neutras, atribuindo a fonte e distinguindo fatos e alegações.
- `limites`: ressalvas explícitas, inclusive ausência de processo oficial e recursos ainda pendentes quando aplicáveis.
- `posicionamentoEnvolvido`: resposta do envolvido ou informação explícita de tentativas de contato e indisponibilidade.
- `dataMarco`, `dataRevisao`: datas ISO completas; não tratar um andamento antigo como atual.
- `periodoFatos` e `partidoNosFatos`: diferenciar partido da eleição e filiação quando os fatos ocorreram; usar `nao_apurado` se necessário.
- `fontes`: `[{url,titulo,instituicao,tipo: "oficial"|"imprensa"|"outro"}]`, URLs HTTPS rastreáveis.
- `revisao`: `{responsavel,data,confirmacaoIdentidade:true,verificacaoAtualizacao:true,liberacaoPublica:true}`.

Diferenças por tipo:

- `apuracao_jornalistica`: `situacaoProcessual: "apuracao_jornalistica"`, `evidenciasDocumentais` explícito, ao menos duas reportagens independentes, `orgao: null`, **sem** `processoNumero`.
- `pedido_de_apuracao`: `situacaoProcessual: "pedido_de_apuracao"` e pelo menos uma fonte oficial.
- `investigacao_oficial`: `situacaoProcessual: "investigacao"` e fonte oficial; não atribuir automaticamente a condição de investigado a quem é apenas mencionado.
- `processo_ou_decisao`: indicação do órgão e estágio, pelo menos uma fonte oficial, número do processo quando público e verificável.

## Revisão de desfechos

Um **mesmo caso** pode resultar em investigação, recebimento de denúncia, condenação por um delito e absolvição por outro. Registrar essas decisões separadamente, dentro do mesmo `idCaso`, para não converter absolvições em acusações vigentes ou somar múltiplas notícias como múltiplos casos.

## Cobertura dos eleitos em 2022

O arquivo `public/data/cobertura-pesquisa-2022.json` acompanha os 234 titulares do PL em quatro estados de trabalho: `nao_iniciado`, `triagem_inicial`, `em_revisao`, `revisao_concluida`.

**Triagem inicial NÃO significa pesquisa completa**; revisão concluída deve carregar data. Nunca exibir `nao_iniciado` como ausência de processos nem ausência de ocorrências publicadas como "ficha limpa".

## Verificação automatizada

- `npm run validate:data`: integridade do cadastro eleitoral.
- `npm run validate:coverage`: consistência dos estágios e 234 identificadores TSE.
- `npm run validate:ocorrencias`: requisitos estruturais, status editorial, fontes e distinção investigação/reportagem.
- `npm test`: testes de regressão, incluindo rejeição de registros pendentes, sem aprovação, sem identidade confirmada ou sem conferência de atualização.

O validador **não** pode comprovar que duas matérias são editorialmente independentes, que um processo não teve andamento posterior ou que uma pessoa é efetivamente investigada; esses pontos são de revisão humana.

## Regra de segurança

Não publicar em um GitHub público versões preliminares identificando pessoas em acusações sem validação editorial, inclusive em commits antigos, PRs e Issues. Registrar pesquisa sensível em ambiente privado e importar somente a versão autorizada.

## Revisão final em ambiente privado

Estados como `rascunho`, `em_verificacao`, `revisao_final` e `corrigir_ou_retirar` pertencem ao fluxo editorial privado e são rejeitados pelo validador da base pública. Isso vale mesmo quando há uma decisão oficial conhecida: a conferência de recursos, a atualização e a liberação humana individual precisam estar concluídas antes da inclusão no repositório.

Filtrar registros na interface não protege um JSON público, o artefato estático, um PR ou o histórico Git. Não enviar registros pendentes para nenhum desses locais. O CI e o workflow de deploy executam `validate:ocorrencias`, que falha se encontrar um registro não publicado ou aprovação incompleta. Para validar localmente, execute `npm test` e `npm run validate:ocorrencias` antes de propor alterações.

O validador confere declarações e estrutura; ele não concede aprovação nem comprova que a revisão ocorreu. A revisão humana deve ser real e rastreável. Os testes usam exemplos inteiramente fictícios, sem importar pesquisas ou acusações pendentes sobre pessoas reais. Esta regra impede novas inclusões pendentes no fluxo validado, mas não remove automaticamente conteúdo de commits históricos.
