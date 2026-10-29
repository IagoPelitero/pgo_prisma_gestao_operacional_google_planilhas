# O que é configurável, e o que ainda não é

> **A pergunta que originou este arquivo:** *"As configurações permitem
> configurar tudo que existe no PGO?"*
>
> A resposta honesta é **quase**. Esta página é a lista completa, sem
> maquiagem: o que já se ajusta pela tela, o que só se ajusta na planilha, e o
> que ainda não se ajusta em lugar nenhum.

A régua é simples: **nada que a operação precise mudar no dia a dia pode
exigir um programador.** Onde essa régua ainda não é cumprida, está escrito
abaixo com o motivo.

---

## Já se ajusta pela tela de Configurações

| Assunto | O que dá para fazer | Onde |
|---|---|---|
| **Campos do formulário** | Rótulo, dica, seção, tipo, máscara, obrigatoriedade, ordem, lista de origem, ligar e desligar — e **quando o campo aparece**: sempre, ou só quando outro campo (o Status, por exemplo) for um destes valores, quantos forem necessários. É assim que o Status proposta aparece só com Retido, Pago ou Cancelado. O que não aparece não é cobrado nem gravado. E **quando o campo é obrigatório**: com "Obrigatório" marcado (sempre), ou só quando outro campo for um destes valores — é assim que o valor retido aparece em todos os status e é cobrado só no Retido, no cadastro, no Trabalhar no caso e no diálogo Alterar status A máscara aceita **formas alternativas separadas por `\|`** — `000.000.000-00\|00.000.000/0000-00` é CPF ou CNPJ: a tela troca pelo tamanho, e o servidor aceita qualquer um dos tamanhos | Cadastrar Caso |
| **Coluna nova na base** | Criar campo, que cria a coluna na planilha | Cadastrar Caso · **pede senha** |
| **Usuários** | Cadastrar, editar, trocar cargo e nível, canal que atende, tirar o acesso | Usuários |
| **Níveis de acesso** | Quais telas abrem, o que a pessoa pode fazer, até onde enxerga, quais canais | Níveis de acesso |
| **Quem vê a produtividade de quem** | Por nível: bloqueado, só os próprios, a equipe dele, ou o canal inteiro. É INDEPENDENTE do "até onde enxerga" — um analista pode ver só os casos dele na fila e a equipe inteira na Produtividade. E "bloqueado" tira a tela do menu | Níveis de acesso |
| **Listas** | Criar lista nova, renomear e excluir a que nenhum campo usa. Itens de qualquer lista — situações, canais, motivos, ramos, áreas, cargos, formas de pagamento, origens, produtos, assuntos: criar, renomear o rótulo, recolorir, reordenar, desligar e excluir (os casos mantêm o texto). Cada lista diz em quais campos é usada | Ajustes Gerais |
| **Em qual coluna cada status carimba** | Um status pode gravar data e hora numa coluna da base quando o caso chega nele. É o controle de produtividade — e o administrador aponta status novos para colunas novas, sem programador. A coluna se escolhe num **menu**, por canal: as colunas de data da base e as colunas suas | Ajustes Gerais → Situações |
| **Em qual coluna cada item de lista carimba** | O mesmo, para o item de uma lista que algum campo usa — a tentativa de contato, por exemplo: escolher o item no caso grava data e hora na coluna. A escolha fica no item, e trocar o rótulo não muda onde ele carimba | Ajustes Gerais → a lista |
| **Canal de cada item** | Em que canal o item aparece, ou "Todos os canais". Vem preenchido com o canal atual | Ajustes Gerais |
| **Quais status fecham o caso** | A marca "Fecha o caso (status final)" de cada status. O que é final encerra o prazo dos sinalizadores ("Encerrados no prazo", "Encerrados fora"). Não trava o caso. Na RET são Não retido, Retido, Sem sucesso de contato, Cancelado e Pago; na Mesa, Concluído, Concluído na mesa e Sem retorno; no VG, o PO ainda vai decidir — é aqui que ele decide | Ajustes Gerais → Situações |
| **Canais de trabalho** | **Criar um canal novo** (cria a aba na planilha; pede senha), nome, descrição, coluna da data, da hora, da situação, da finalização, da área responsável, colunas da fila e os grupos delas, ordem, ligar e desligar. As **colunas da fila se montam num editor visual**, por canal: grupos (renomear, subir, descer, criar, tirar), as linhas de cada grupo (acrescentar, subir, descer, tirar) e **"+ juntar…"**, que põe duas colunas numa linha só, com hífen — é assim que a RET mostra a proposta inteira. O **primeiro item de cada grupo é o destaque** | Canais de trabalho |
| **Status de todos os casos do lote** | Na hora de importar, quem importa escolhe o status com que os casos sem status na planilha nascem: o padrão do canal, qualquer status dele ou "sem status". O que a planilha trouxe fica, e a importação não carimba | Importação, no passo de conferir |
| **Repetição na importação** | Na hora de importar, quem importa escolhe como reconhecer o repetido: uma coluna, a **proposta no mês da importação** (canais com proposta em pedaços — hoje a RET, onde ela já vem marcada) ou trazer tudo. O laudo separa o que já está no PGO naquele mês do que se repete na própria planilha | Importação, no passo de conferir |
| **O de-para da importação** | Lembrado por canal: a próxima importação abre com o que a última gravou (fica na `CONFIG`, `IMPORTACAO.DEPARA.<Id do canal>`; apagar a chave esquece). O seletor tem busca e vem em ordem alfabética | Importação, no passo de conferir |
| **Data de recepção na importação** | Na RET: "a da planilha" (quem veio sem data fica com a de hoje) ou "a de hoje, para todos" | Importação, no passo de conferir |
| **Cartões do Trabalho** | Criar, renomear, escolher o que cada um conta, a cor, a ordem, mostrar ou ocultar, remover — até 12 por tela. Clicar no cartão filtra a fila pelo que ele conta. Card que aponta para status que não existe mais aparece marcado | Painéis → Cards do Trabalho |
| **Cartões da Produtividade RECC** | A mesma coisa, numa **lista separada**: o Trabalho mostra o que ainda dá trabalho, a Produtividade mostra o que já foi entregue | Painéis → Cartões da Produtividade |
| **O que um cartão conta** | O total, uma situação, os finalizados na célula, **"já passaram por"** — que lê a coluna de carimbo e por isso não zera quando o caso avança —, **o valor de um campo** (lista ou Sim/Não: "Tentativa: 1ª tentativa…") ou **"Preenchida: X"**, para qualquer outra coluna que não seja data | Painéis |
| **Gráficos da Produtividade RECC** | Criar, escolher a forma, o campo que vira eixo, o que medir, quantos mostrar (no máximo os 5 maiores, sem "Demais valores") e o tamanho na tela | Painéis → Gráficos |
| **SLA em horas úteis** | Por canal: quantas horas úteis (zero desliga), início e fim do expediente (como 08:15 e 18:30) e as colunas da data e da hora da **primeira resposta**, que é onde o prazo para (caso encerrado sem resposta para no encerramento). Conta de segunda a sexta, só dentro do expediente. A Mesa Diamante nasce com 6 horas, das 08:15 às 18:30, até "Data resposta" e "Hora resposta"; RET e VG, sem SLA. A tela recusa expediente que termina antes de começar | Canais de trabalho |
| **Sinalizadores de prazo** | Por canal, quantos prazos quiser: nome, prazo, **dias ou horas úteis**, quanto antes o amarelo acende, a coluna que liga o prazo (em branco: vale para todo caso), a coluna da data e da hora de onde conta, **a condição de parada de um status** (na RET: o Retido só encerra o prazo quando o Status proposta for Transmitido ou Sem alteração), o expediente, a ordem, ligar e desligar. A RET nasce com 3 dias contados da **primeira mudança de status** (antes dela, prazo cheio; amarelo no último dia), a Mesa com 48 horas contadas do status Em andamento (amarelo nas últimas 10). Quem estiver no amarelo aparece no **aviso** que o Trabalho abre ao entrar no canal e o VG com um sinalizador **desligado**, à espera da regra | Sinalizadores |
| **Corretoras e canais** | Cadastrar, editar o segmento, tirar do cadastro — e cadastrar direto as SUSEPs que os casos citam | Tabela de Corretoras |
| **SUSEPs bloqueadas** | Bloquear dizendo **quem bloqueou** — a companhia (selo vermelho) ou a corretora (selo violeta) —, **editar** (é assim que as antigas, sem tipo, ganham o tipo) e liberar. O histórico do bloqueio permanece | Tabela de Corretoras |
| **Importar em lote** | Colar a planilha de corretoras (SUSEP, corretora, canal, segmento) ou a de SUSEPs bloqueadas, conferir o que vai acontecer linha a linha, e só então gravar | Tabela de Corretoras → Importar · **pede senha** |
| **Importar uma base de casos** | Trazer cem ou trezentos casos de outra planilha — colando ou pelo link —, escolher para onde cada coluna vai, dividir entre os analistas em rodízio, pular o que já entrou e dar um nome ao lote | Importação · **ação `importar`** |
| **Identidade** | Nome curto, nome por extenso, operação, frase da tela de bloqueio, cor da operação, plataforma, fabricante, **logo** (escolhendo a imagem do computador) | Identidade |
| **Nome de cada tela** | Renomear qualquer item do menu. O menu, o cabeçalho da página e o título da janela obedecem; deixar em branco volta ao nome de fábrica. Foi assim que o Trabalho virou "Trabalho" | Identidade |
| **Senha de administrador** | Definir e trocar | Identidade |
| **Busca** | Em quais colunas cado canal procura. Vale para o Buscar Caso **e** para a busca digitada do Trabalho, que procura também nas colunas da fila e em todas as outras colunas do caso | Canais de trabalho |
| **Atendimentos do chat (Mesa)** | Trazer os atendimentos do chat pela Importação, como os casos: colar ou dar o link, confirmar o de-para (data e analista obrigatórios; SUSEP, corretora, assunto, consultor, vida individual/grupo, sucursal, tabulação, sub assunto e TMO em segundos opcionais — o que a origem não trouxer fica em branco), conferir — o laudo diz quem o cadastro de usuários não conhece — e importar com um nome de lote. A linha já importada é pulada. Alimentam a aba "Atendidos (e-mail + chat)" da Produtividade da Mesa, onde a pessoa escolhe a origem (Todos / E-mail / Chat) e o ramo (Total / Vida em grupo / Vida individual); a sucursal é a que o chat trouxe, ou a do cadastro de corretoras pela SUSEP | Importação → Mesa Diamante → Atendimentos do chat · **ação `importar`** |
| **Aplicar mudanças da planilha agora** | A configuração fica guardada por até 5 minutos para a tela responder rápido; o que se salva pelas telas vale na hora. Quem mexeu direto numa aba de configuração aperta este botão em vez de esperar | Estrutura |
| **Planilha de cadastros (a segunda base)** | O Id da outra planilha e **quais listas moram nela** — Corretoras, SUSEPs bloqueadas, Analistas da Central, Analistas da Cobrança (Etapa 55). As desmarcadas continuam aqui. O botão **Conferir** cobra só as marcadas; Id vazio traz tudo de volta | Estrutura · **pede senha** |
| **Planilha legada** | Apontar a base do sistema anterior — Id, aba e como ela aparece na busca. O Id é conferido na hora | Estrutura |
| **Estrutura** | Conferir o laudo da planilha e ler a trilha de auditoria | Estrutura |
| **Arquivo da auditoria** | O Id da planilha que recebe a auditoria com **mais de 2 meses** (conferido na hora, e não pode ser esta mesma), e o botão **Arquivar agora**. Copia, confere e só então apaga daqui. Para ser automático, a cada 2 meses: um acionador **mensal** no editor do Apps Script para `arquivarAuditoriaAgendada` | Estrutura · **pede senha** |
| **Quais colunas a importação pode preencher** | Ajustes Gerais → Situações, na coluna do carimbo de cada status | O carimbo nunca é sugerido sozinho, mas pode ser escolhido no de-para. Criar um status novo apontando para uma coluna já a torna escolhível |
| **Abas de análise** | Montar uma aba `ANALISE_*` na planilha: canal, quais colunas, filtros e janela de dias. Gerar quando quiser, ou apontar um acionador de tempo | Análises · **regerar pede senha** |
| **Diagnóstico** | Conferir o sistema inteiro — fuso, estrutura, sequências, Ids repetidos, canais, campos, painéis, análises, quem consegue configurar e a ligação entre cada botão e a função que ele chama | Estrutura · só lê |

---

## Só no código — para quem mantém

Funcionam, mas mudar exige mexer numa linha do código. Cada uma é uma constante
com nome, num lugar só.

| Assunto | Onde mora | Como está hoje |
|---|---|---|
| **Os limites e as cores do alerta** | `RECC_ALERTAS_DA_LINHA`, no `Base.gs` | Hoje só o VG tem: vigência abaixo de 18 em vermelho, exatamente 18 em amarelo (`noLimite`), acima de 18 em verde (`acima`); margem abaixo de 25,5 em vermelho. Acrescentar coluna, trocar o limite ou a faixa é uma linha. Ainda **não** tem tela |
| **Quantos casos a fila do Trabalho pode mostrar** | `RECC_OPCOES_DE_CASOS_NA_FILA` e `RECC_CASOS_NA_FILA`, no `Indicadores.gs` | A fila abre com 5, e a barra "Mostrar", em cima da tabela, oferece 10, 20, 50, 100 e todos — só as que o canal tem. As opções e o padrão são estas duas linhas: trocar ou acrescentar uma opção é mexer só nelas. A tela recebe de cara os casos da **maior opção** (`RECC_FILA_NA_ABERTURA`, hoje 100); "Todos" busca o resto no servidor. Os cartões, a busca, os filtros e o aviso de prazo olham todos os casos do período. A lista que abre ao clicar num gráfico da Produtividade segue a mesma regra: 100 de cara, "Mostrar todos (N)" sob pedido |
| **Quanto tempo a auditoria fica na planilha** | `RECC_MESES_QUE_A_AUDITORIA_GUARDA`, no `Config.gs` | 2 meses, pedido do PO. Vale para o "Arquivar agora" e para o acionador, que também usa o número para saber se já é hora de arquivar de novo |
| **Os tipos de bloqueio de SUSEP** | `RECC_QUEM_BLOQUEOU`, no `Cadastros.gs` | `Companhia` e `Corretora`. A cor de cada um no selo mora no `Comuns.html` e no `Estilos.html` |
| **Campo que aceita data no futuro** | `RECC_PADRAO_POR_ABA`, no `Instalacao.gs` | Só o `Início da vigência` do VG. Todas as outras datas continuam recusando futuro |
| **Coluna calculada** | `RECC_COLUNAS_CALCULADAS`, no `Base.gs` | Hoje só os meses de vigência do VG. Outra conta é uma linha aqui e um `if` na função |
| **Quantos filtros o Trabalho mostra** | `RECC_FILTROS_NO_TRABALHO`, no `Indicadores.gs` | 6. O Status vem primeiro, depois os campos que dependem dele (o Status proposta), depois os outros na ordem do formulário |
| **As colunas dos prêmios da RET** | `colunasDosPremios_`, no `Indicadores.gs`, e `RECC_PREMIOS_DA_IMPORTACAO`, no `Casos.gs` | Anual = `valor do prêmio`, mensal = `prêmio mensal`, retido = `valor do prêmio retido`. Alimentam o gráfico dos prêmios, a soma embaixo dos cartões de status, o quadro por analista e a soma da importação |
| **As tentativas até o sucesso** | `RECC_COLUNAS_DAS_TENTATIVAS`, `RECC_STATUS_DE_SUCESSO`, `RECC_STATUS_SEM_SUCESSO` e `RECC_CPFS_LISTADOS`, no `Indicadores.gs` | Tentativas = Data do 1º e do 2º contato; sucesso = Retido ou Não retido; sem sucesso = "Sem sucesso de contato"; 100 CPFs na tabela. Renomear um desses status em Ajustes Gerais pede mudar aqui também |
| **Quantos valores cada gráfico mostra** | `RECC_TOPO_DOS_GRAFICOS`, no `Indicadores.gs` | 5, pedido do PO (Etapa 53). O resto não aparece — não há "Demais valores". Os atendidos por analista da Mesa usam 15 |
| **Quantas SUSEPs bloqueadas a Tabela Corretoras mostra** | `RECC_MAXIMO_DE_BLOQUEADAS_NA_TELA`, no `Cadastros.gs` | 100 (Etapa 55, para as 151 mil da segunda base): as dos casos primeiro, depois as mais recentes. A busca procura em todas |
| **A hora da finalização** | `RECC_COLUNA_HORA_DA_FINALIZACAO`, no `Indicadores.gs` | "horário da finalização", ao lado da *Data da finalização* (a coluna de finalização do canal). O fim do prazo da Mesa é a data com essa hora (Etapa 58) |
| **A fila da auditoria** | `RECC_MAIOR_REGISTRO_NA_FILA` e `RECC_DESCARGA_DA_AUDITORIA`, no `Entrada.gs`; `RECC_FILA_DA_AUDITORIA_QUE_PREOCUPA`, no `Instalacao.gs` | Registro de até 8 mil caracteres vai para a fila (maior, direto na aba); até 500 registros por descarga; o diagnóstico avisa com 200 ou mais esperando (Etapa 61) |
| **Quantas propostas repetidas o laudo lista** | `RECC_REPETIDOS_LISTADOS`, no `Casos.gs` | 50 de cada motivo; o número total vem sempre |

---

## Ainda se ajusta só na planilha

Funciona, e é editável — mas exige abrir a aba e digitar na célula, o que não
é o mesmo que ser configurável.

| Assunto | Onde mora | Por que ainda não tem tela |
|---|---|---|
| **Janela da fila** (30 dias) | `CONFIG` → `OPERACAO.JANELA_DIAS` | Deixou de ser a abertura na Etapa 56: as telas abrem **do dia 1 do mês até hoje** (`resolverPeriodo_`, no `Indicadores.gs`). O número só vale quando um pedido chega sem período (uma página antiga, um endereço guardado) |
| **Tema padrão da operação** | `CONFIG` → `OPERACAO.TEMA_PADRAO` | Idem |
| **Visibilidade de campo por nível** | `CATALOGO` → `Configuracao.campos` | O servidor já respeita (oculto, leitura, edição). Falta a tela — hoje é um JSON |

---

## Ainda não se ajusta em lugar nenhum

Isto não é omissão: cada um tem uma razão para ainda não existir.

| Assunto | Por quê |
|---|---|
| **Apagar um canal** | Por decisão, o canal se **desliga** em vez de apagar: a aba dele guarda casos, e apagá-la perderia todos. Campo, lista e item de lista já se excluem pela tela |
| **Trocar o TIPO de uma coluna existente** | Mudar `texto` para `data` numa coluna com 30 mil linhas reinterpreta tudo o que já está gravado. Precisa de conversão e conferência, não de um seletor |
| **Renomear o cabeçalho de uma coluna** | É o nome que amarra o dado ao Power BI. Renomear na planilha e reconciliar aqui é o caminho seguro; um botão que fizesse isso quebraria relatório em silêncio |
| **A ordem das cores da paleta** | Os seis tons foram conferidos por régua — separação mínima sob daltonismo e em visão normal. Trocar um por gosto quebraria a garantia, então eles são do sistema, não da operação |

---

## As três perguntas que a operação fez, respondidas

**"As configurações ajustam tudo que o sistema possui?"** — as tabelas acima
são a resposta inteira. Resumindo: tudo o que a operação muda no dia a dia
está na primeira. "Só no código" são regras que mudam uma vez por ano, se
mudarem. "Só na planilha" são três ajustes que se fazem uma vez e quase nunca
se repetem. E o que não se ajusta em lugar nenhum está fora de propósito, cada
um com o motivo escrito.

**"Na Produtividade RECC tem tanto por área quanto por analista?"** — tem os
dois, e por caminhos diferentes, o que é de propósito:

- **Por área** é o seletor de canal no alto da tela. Não é um gráfico: RET
  e Mesa Diamante têm colunas diferentes, situações diferentes e volumes que
  não se comparam. Um gráfico "casos por área" com duas barras dessas ao lado
  responderia à pergunta errada — a Mesa Diamante sempre pareceria pequena, e nunca foi
  para ser grande.
- **Por analista** é um gráfico, e agora nasce junto com o sistema: *Casos por
  analista*, em barras deitadas, nos dois canais. Barra deitada porque nome de
  pessoa é comprido; em pé, os rótulos viram uma escadinha ilegível.

Além desses dois, qualquer coluna do canal pode virar eixo de um gráfico novo
em Configurações → Painéis, sem programador.

**"Temos uma lista de SUSEPs bloqueadas e quais corretoras são Diamante. Eu
teria que fazer manual?"** — não. Três coisas acontecem, e vale separar:

1. **O que o sistema descobre sozinho:** quais SUSEPs aparecem nos casos, o
   volume de cada uma e quais delas ainda não estão no cadastro. A Tabela de
   Corretoras abre com esse aviso — é a informação mais útil da tela.
2. **O que o sistema não tem como adivinhar:** que a corretora X é Diamante e
   que a SUSEP Y está bloqueada por fraude. Isso é conhecimento da operação, e
   nenhum sistema deduz do dado.
3. **Como isso entra sem digitação:** a aba **Importar**. Copia da planilha
   que a operação já tem, cola, confere o que vai acontecer com cada linha —
   cadastra, atualiza, já igual, recusada e por quê — e aplica. Depois disso,
   manter é uma linha aqui e outra ali.

A importação nunca apaga: uma corretora que está no cadastro e não veio no
texto colado continua onde estava, e um campo vazio no texto não limpa o que
já existe. O texto colado é uma correção, não a verdade inteira.

---

## Como pensar nisso

Três perguntas, nesta ordem:

1. **A operação muda isso no dia a dia?** Se sim, tem de estar na tela.
2. **Errar isso quebra dado gravado?** Se sim, pede senha, ou não passa pela
   tela nenhuma.
3. **Errar isso quebra só a aparência?** Então é livre, e nem confirmação
   precisa.

Quase tudo o que está na primeira lista respondeu "sim" à primeira pergunta e
"não" à segunda. O que está na terceira lista respondeu "sim" à segunda — e é
por isso que continua fora.
