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
| **Campos do formulário** | Rótulo, dica, seção, tipo, máscara, obrigatoriedade, ordem, lista de origem, ligar e desligar | Campos do formulário |
| **Coluna nova na base** | Criar campo, que cria a coluna na planilha | Campos do formulário · **pede senha** |
| **Usuários** | Cadastrar, editar, trocar cargo e nível, canal que atende, tirar o acesso | Usuários |
| **Níveis de acesso** | Quais telas abrem, o que a pessoa pode fazer, até onde enxerga, quais canais | Níveis de acesso |
| **Quem vê a produtividade de quem** | Por nível: bloqueado, só os próprios, a equipe dele, ou o canal inteiro. É INDEPENDENTE do "até onde enxerga" — um analista pode ver só os casos dele na fila e a equipe inteira na Produtividade. E "bloqueado" tira a tela do menu | Níveis de acesso |
| **Listas** | Situações, canais, motivos, ramos, áreas, cargos, formas de pagamento, origens: criar, renomear o rótulo, recolorir, reordenar, desligar | Listas |
| **Em qual coluna cada status carimba** | Um status pode gravar data e hora numa coluna da base quando o caso chega nele. É o controle de produtividade — e o administrador aponta status novos para colunas novas, sem programador | Listas → Situações |
| **Canais de trabalho** | Nome, descrição, coluna da data, da hora, da situação, da finalização, da área responsável, colunas da fila e os grupos delas, ordem, ligar e desligar | Canais de trabalho |
| **Cartões do Trabalho** | Criar, renomear, escolher o que cada um conta, a cor, a ordem, mostrar ou ocultar, remover — até 12 por tela | Painéis → Cards do Trabalho |
| **Cartões da Produtividade RECC** | A mesma coisa, numa **lista separada**: o Trabalho mostra o que ainda dá trabalho, a Produtividade mostra o que já foi entregue | Painéis → Cartões da Produtividade |
| **O que um cartão conta** | O total, uma situação, os finalizados na célula, ou **"já passaram por"** — que lê a coluna de carimbo e por isso não zera quando o caso avança | Painéis |
| **Gráficos da Produtividade RECC** | Criar, escolher a forma, o campo que vira eixo, o que medir, o TOP N e o tamanho na tela | Painéis → Gráficos |
| **Meta por pessoa** | Quantos casos por mês se espera de alguém no canal. Zero desliga a barra de progresso | Canais de trabalho |
| **Corretoras e canais** | Cadastrar, editar o segmento, tirar do cadastro — e cadastrar direto as SUSEPs que os casos citam | Tabela de Corretoras |
| **Produtos** | Nome e código, que é único | Tabela de Corretoras |
| **SUSEPs bloqueadas** | Bloquear com motivo, liberar. O histórico do bloqueio permanece | Tabela de Corretoras |
| **Importar em lote** | Colar a planilha de corretoras (SUSEP, corretora, canal, segmento) ou a de SUSEPs bloqueadas, conferir o que vai acontecer linha a linha, e só então gravar | Tabela de Corretoras → Importar · **pede senha** |
| **Tombar uma base de casos** | Trazer cem ou trezentos casos de outra planilha — colando ou pelo link —, escolher para onde cada coluna vai, dividir entre os analistas em rodízio, pular o que já entrou e dar um nome ao lote | Tombamento · **ação `tombar`** |
| **Identidade** | Nome curto, nome por extenso, operação, frase da tela de bloqueio, cor da operação, plataforma, fabricante, **logo** (escolhendo a imagem do computador) | Identidade e segurança |
| **Nome de cada tela** | Renomear qualquer item do menu. O menu, o cabeçalho da página e o título da janela obedecem; deixar em branco volta ao nome de fábrica. Foi assim que o Trabalho virou "Trabalho" | Identidade e segurança |
| **Senha de administrador** | Definir e trocar | Identidade e segurança |
| **Busca** | Em quais colunas cado canal procura | Canais de trabalho |
| **Planilha legada** | Apontar a base do sistema anterior — Id, aba e como ela aparece na busca. O Id é conferido na hora | Estrutura e auditoria |
| **Estrutura** | Conferir o laudo da planilha e ler a trilha de auditoria | Estrutura e auditoria |
| **Abas de análise** | Montar uma aba `ANALISE_*` na planilha: canal, quais colunas, filtros e janela de dias. Gerar quando quiser, ou apontar um acionador de tempo | Análises · **regerar pede senha** |
| **Diagnóstico** | Conferir o sistema inteiro — fuso, estrutura, sequências, Ids repetidos, canais, campos, painéis, análises, quem consegue configurar e a ligação entre cada botão e a função que ele chama | Estrutura · só lê |

---

## Ainda se ajusta só na planilha

Funciona, e é editável — mas exige abrir a aba e digitar na célula, o que não
é o mesmo que ser configurável.

| Assunto | Onde mora | Por que ainda não tem tela |
|---|---|---|
| **Janela da fila** (30 dias) | `CONFIG` → `OPERACAO.JANELA_DIAS` | Um número solto; é o próximo a ganhar campo. Agora é só a **abertura** das telas: quem está olhando troca o período na própria tela, por dias, por data ou por mês |
| **Tema padrão da operação** | `CONFIG` → `OPERACAO.TEMA_PADRAO` | Idem |
| **Visibilidade de campo por nível** | `CATALOGO` → `Configuracao.campos` | O servidor já respeita (oculto, leitura, edição). Falta a tela — hoje é um JSON |

---

## Ainda não se ajusta em lugar nenhum

Isto não é omissão: cada um tem uma razão para ainda não existir.

| Assunto | Por quê |
|---|---|
| **Criar canal nova** | Criar canal é criar aba na planilha. É a ação mais cara do sistema, e a única do contrato que ainda não passou por uma tela com senha |
| **Apagar canal, campo ou lista** | Por decisão, o sistema **desliga** em vez de apagar. Apagar de verdade sairia do princípio de que nenhuma linha se perde |
| **Trocar o TIPO de uma coluna existente** | Mudar `texto` para `data` numa coluna com 30 mil linhas reinterpreta tudo o que já está gravado. Precisa de conversão e conferência, não de um seletor |
| **Renomear o cabeçalho de uma coluna** | É o nome que amarra o dado ao Power BI. Renomear na planilha e reconciliar aqui é o caminho seguro; um botão que fizesse isso quebraria relatório em silêncio |
| **A ordem das cores da paleta** | Os seis tons foram conferidos por régua — separação mínima sob daltonismo e em visão normal. Trocar um por gosto quebraria a garantia, então eles são do sistema, não da operação |

---

## As três perguntas que a operação fez, respondidas

**"As configurações ajustam tudo que o sistema possui?"** — as três tabelas
acima são a resposta inteira. Resumindo: tudo o que a operação muda no dia a
dia está na primeira. O que sobrou na segunda são quatro ajustes que se fazem
uma vez e quase nunca se repetem. O que está na terceira está fora de
propósito, cada um com o motivo escrito.

**"Na Produtividade RECC tem tanto por área quanto por analista?"** — tem os
dois, e por caminhos diferentes, o que é de propósito:

- **Por área** é o seletor de canal no alto da tela. Não é um gráfico: RET
  e Mesa Diamante têm colunas diferentes, situações diferentes e volumes que
  não se comparam. Um gráfico "casos por área" com duas barras dessas ao lado
  responderia à pergunta errada — a Canal sempre pareceria pequena, e nunca foi
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
