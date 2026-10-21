# Publicação segura das ocorrências jurídicas — contrato de dados v1

A base pública é `public/data/ocorrencias-publicadas.json`. Ela começa **vazia intencionalmente**: os achados de pesquisa anteriores ainda não passaram pelo fluxo de revisão humana exigido.

## Regras essenciais

1. Cada ocorrência é vinculada à candidatura de 2022 por `candidaturaId` (`SQ_CANDIDATO`). No futuro, o vínculo evoluirá para `pessoaId` depois da desambiguação de homônimos.
2. Uma ocorrência não é sinônimo de irregularidade comprovada, e cada evento processual precisa de data, órgão, tipo e descrição.
3. `situacaoProcessual` e `statusEditorial` são conceitos distintos. **O validador só permite arquivos públicos com `statusEditorial: "publicado"`**.
4. Os dados exigem confirmação de identidade, verificação de atualização processual e autorização de publicação atribuída a um revisor identificável.
5. A descrição deve informar, sem inferir culpabilidade, a natureza da ocorrência e o último estágio comprovado. `partidoNosFatos` deve ser documentado, ou marcado explicitamente como `nao_apurado`.
6. Incluir pelo menos um link oficial HTTPS (TSE, TRE, STJ, STF, Ministério Público etc.) e, quando pertinente, fontes adicionais e a posição do envolvido.
7. O registro é público assim que entra neste JSON no GitHub: **não colocar rascunhos jurídicos, acusações não verificadas, material confidencial ou dados pessoais sensíveis em nenhum arquivo/branch deste repositório**.
8. O arquivo pode ser substituído por nova versão após revisão; manter histórico e, quando necessário, retratação/correção explícita. A validação automática verifica estrutura e metadados declarados, mas **não garante a veracidade, a atualidade ou a completude das informações**.

## Campos de cada ocorrência publicada

```json
{
  "id": "ocorrencia-0001",
  "candidaturaId": "12345678901",
  "statusEditorial": "publicado",
  "titulo": "Título factual, sem imputação de culpa",
  "resumo": "Síntese objetiva com contexto, limites e atribuição.",
  "categoria": "eleitoral",
  "situacaoProcessual": "decisao_nao_definitiva",
  "descricaoSituacao": "Descrição específica do andamento documentado e dos recursos conhecidos.",
  "dataMarco": "2026-09-17",
  "periodoFatos": "Ano ou intervalo documentado",
  "partidoNosFatos": "nao_apurado",
  "orgao": "Tribunal ou autoridade competente",
  "processoNumero": "Identificador processual público (se disponível)",
  "dataRevisao": "2026-10-21",
  "fontes": [
    {"url": "https://exemplo.gov.br/fonte-oficial", "titulo": "Fonte oficial", "instituicao": "Órgão oficial", "tipo": "oficial"}
  ],
  "revisao": {
    "responsavel": "Revisor editorial identificado",
    "data": "2026-10-21",
    "confirmacaoIdentidade": true,
    "verificacaoAtualizacao": true,
    "liberacaoPublica": true
  }
}
```

O exemplo é apenas descritivo: **não pertence à base pública**. Não utilizar o endereço de exemplo como fonte real.

## Comandos

- `npm run validate:data` — valida os dados eleitorais de 2022.
- `npm run validate:ocorrencias` — rejeita ausência de revisão, referência inexistente, fonte não HTTPS, categorias inválidas e registros não aprovados.

O CI e o deploy executam as duas validações antes de compilar a interface.
