Atualização proposta a partir dos ZIPs oficiais do TSE, considerando os dois turnos e preservando o turno de eleição de cada candidatura. A votação usa apenas QT_VOTOS_NOMINAIS_VALIDOS, com uma única abrangência por arquivo.

Verificar `docs/auditorias/ultima-atualizacao-2026.json`: inclusões, exclusões, campos alterados e hashes dos arquivos anteriores e novos. Vínculos entre eleições permanecem sugestões pendentes; a importação não autoriza associar históricos jurídicos.

O workflow executa os testes, quatro validadores e build antes de enviar esta branch. Conferir o resultado da execução em Actions. Alterações propostas exigem revisão humana; não há merge automático. PRs criados com GITHUB_TOKEN podem não disparar novos workflows automaticamente: se houver verificações obrigatórias pendentes, execute-as pelo fluxo autorizado do repositório antes do merge.
