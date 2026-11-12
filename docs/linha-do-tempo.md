# Linha do tempo documental nas fichas

A ficha da candidatura de 2022 vinculada à AP 2782 apresenta os dois eventos do
piloto aprovado. O resumo histórico, a defesa, as ressalvas e as fontes v1
permanecem no mesmo artigo. Não há nova ocorrência nem alteração da contagem da
página inicial. As demais fichas continuam com seus registros existentes.

A linha do tempo mostra data do ato, natureza, processo, descrição, limitações,
argumentos da defesa, recursos, estado do trânsito daquele ato e fontes com data
de consulta e localizador. Abrangência e limites do pacote ficam acessíveis em
um bloco de detalhes. Imputações e relações documentadas entre atos aparecem
quando estruturadas: absolvição de uma imputação não apaga condenação de outra,
e uma reforma identifica a decisão anterior correspondente.

O estado de trânsito se refere ao ato em que aparece. No piloto, o trânsito da
condenação em 03/10 é separado do estado não verificado da decisão posterior de
execução de 07/10. A interface não calcula culpa, resultado único do caso ou
situação atual pela última linha da cronologia. Eventos de outros participantes
não são incorporados por coincidência de caso ou nome.

## Leitura e falhas

O navegador carrega pacote e manifesto e compara o SHA-256 dos bytes recebidos
com `destinoSha256`. Isso detecta versões diferentes durante um deploy ou cache;
não é uma assinatura independente da origem. O CI continua responsável pela
validação integral do contrato e da migração.

O adaptador verifica publicação declarada, referências, fontes HTTPS e os vínculos
entre ocorrência, candidatura de 2022, pessoa, participação, processo e eventos.
A ocorrência atual precisa corresponder ao registro original preservado; mudanças
exigem nova correspondência revisada. Não se promove identidade de 2026 nem
associação nominal. A ordenação é uma cópia por data e ordem do ato, sem alterar
o pacote aprovado.

Carregamento ou falha da linha do tempo têm mensagens próprias e mantêm o registro
v1 disponível. Falha HTTP, JSON inválido, digest diferente, fonte ausente ou vínculo
incompatível impedem a apresentação do v2. Não são apresentados como ausência de
histórico. Se a base v1 falhar, permanece o aviso de indisponibilidade da consulta.

O digest usa Web Crypto, disponível no HTTPS do Pages e em localhost. Caso a API
não esteja disponível, o componente preserva o registro v1 e informa a falha.
Nenhum rascunho, documento integral ou dado pessoal novo é incorporado ao build.

## Verificação

- Testes de leitura: HTTP, digest, cancelamento, estrutura incompleta, vínculo,
  fonte insegura, tipos inesperados, ordenação e preservação da entrada.
- Renderização real dos componentes: defesa, desfechos favoráveis/desfavoráveis,
  imputações, reforma, datas, links, ausência de duplicação e estados de falha.
- Chromium com build de produção: pesquisa por AP2782, abertura da ficha,
  expansão dos detalhes, fechamento por Escape, viewports desktop e celular,
  ausência de rolagem horizontal e preservação do legado em HTTP404/digest inválido.

Essas verificações não constituem nova pesquisa jurídica ou auditoria completa
de acessibilidade. Dados e aprovações documentais são os do piloto já aprovado.
