# Progresso

O estado de cada etapa, o que ela entregou e o que falta. Atualizado a cada
entrega.

**Estado geral:** 10 de 12 etapas construídas · 269 testes passando.

---

## Como as etapas foram organizadas

A ordem não é arbitrária: **cada etapa depende da anterior**, e cada uma
entrega algo que funciona sozinho e pode ser conferido na planilha. Nada de
"faz metade de tudo" — é uma camada de cada vez, testada antes da seguinte.

| # | Etapa | Estado | Testes |
|---|---|---|---|
| 1 | Fundação | ✅ pronta | 32 |
| 2 | Acesso | ✅ pronta | 32 |
| 3 | Casca | ✅ pronta | 28 |
| 4 | Cadastrar Caso | ✅ pronta | 28 |
| 5 | Dashboard | ✅ pronta · reformado | 28 |
| 6 | Configurações | ✅ pronta | 35 |
| 7 | Buscar Caso | ✅ pronta | 17 |
| 8 | Painel Analítico | ✅ pronta | 24 |
| 9 | Minha Performance | ✅ pronta | 19 |
| 10 | Tabela de Corretoras | ✅ pronta | 22 |
| 11 | Abas de análise | ⏳ | — |
| 12 | Diagnóstico | ⏳ | — |

---

## Etapa 1 — Fundação ✅

**O alicerce: como o dado entra e sai da planilha sem se corromper.**

| Arquivo | Entrega |
|---|---|
| `Back-End/Base.gs` | O contrato das 13 abas: cabeçalhos exatos e tipo de cada coluna |
| `Back-End/Base.gs` | A porta única para o Planilhas — nenhum outro arquivo chama `SpreadsheetApp` |
| `Back-End/Base.gs` | Id decimal de 10 casas, que nunca anda para trás |
| `Back-End/Instalacao.gs` | Cria as abas numa planilha vazia e cadastra o primeiro administrador |

As duas regras que nasceram aqui e valem para sempre: a coluna é encontrada
pelo **nome do cabeçalho**, nunca pela posição; e a faixa é **formatada antes**
de receber o valor.

**Bugs pegos:** 3 (ver [`04-bugs-capturados.md`](04-bugs-capturados.md) 1 a 3).

## Etapa 2 — Acesso ✅

**Quem entra, e o que cada um pode.**

| Arquivo | Entrega |
|---|---|
| `Back-End/Entrada.gs` | Níveis, escopo, senha de administrador, auditoria |
| `Back-End/Entrada.gs` | Cadastro de quem pode entrar |
| `Back-End/Entrada.gs` | `doGet`, pacote de partida, identidade visual |
| `Front-End/SemAcesso.html` | A tela de quem não está cadastrado |

Cargo e nível de acesso ficaram separados de verdade: o cargo é rótulo
organizacional e não decide nada. E toda recusa **diz o motivo** — quatro
motivos distintos, cada um levando a um lugar diferente.

**Bugs pegos:** 3 (itens 4 a 6).

## Etapa 3 — Casca ✅

**O que aparece em toda tela.**

| Arquivo | Entrega |
|---|---|
| `Front-End/Index.html` | O esqueleto, que cola os outros dentro de si |
| `Front-End/Estilos.html` | Toda a aparência e os quatro temas |
| `Front-End/Comuns.html` | Menu lateral e barra superior |
| `Front-End/Aplicacao.html` | Ponte com o servidor, roteador e telas |

Menu lateral azul da marca com pastilha branca no item atual. Barra superior na
ordem: identidade → busca → bolinhas de cor → data do último registro →
pessoa. Quatro temas trocáveis (padrão, rosa, escuro, Brasil), guardados por
usuário.

Nasceu aqui o `Evolucao/Testes/gerar-previa.js`, que monta as telas com o mesmo
código do servidor e abre em qualquer navegador — sem publicar no Apps Script.

**Bugs pegos:** 4 (itens 7 a 10), sendo **dois encontrados olhando a tela**,
que teste nenhum pegaria.

![O sistema no tema padrão](imagens/sistema-tema-padrao.png)

---

## Etapa 4 — Cadastrar Caso ✅

**A primeira tela que grava dado de verdade.**

| Arquivo | Entrega |
|---|---|
| `Back-End/Casos.gs` | O motor: monta o formulário a partir de `CAMPOS` e valida o que volta |
| `Back-End/Casos.gs` | Registrar, editar, ocultar e o selo da SUSEP |
| `Front-End/CadastrarCaso.html` | A tela, com máscara, seleção de mesa e o selo |

O formulário **não está escrito em lugar nenhum do código**: é montado a
partir da aba `CAMPOS` toda vez que a tela abre. Campo criado em Configurações
aparece sozinho; campo oculto para o nível **nem chega ao navegador**.

E porque o formulário é dado, o que volta da tela também é — então o servidor
revalida tudo:

- todos os problemas de uma vez, e não um por vez
- valor de campo oculto mandado pela tela é **ignorado**, não gravado
- data no futuro é recusada: o caso descreve algo que já aconteceu
- seletor só aceita valor que está na lista
- o escopo do nível vale para **escrever**, não só para ler

A máscara vive só na tela. `000.123.456-78` chega à célula como
`00012345678`, em texto.

O selo da SUSEP tem três respostas, e as três são informação: **liberada**
(com o segmento), **bloqueada** (com o motivo) e **não encontrada** — que não
é erro, é uma corretora que o cadastro não conhece.

**Bugs pegos:** 4 (itens 11 a 14), sendo um encontrado numa foto de página
inteira e um que era defeito da própria ferramenta de prévia.

---

## Etapa 5 — Dashboard ✅

**A visão do dia: quanto tem, e o que fazer agora.**

| Arquivo | Entrega |
|---|---|
| `Back-End/Indicadores.gs` | Cartões, fila, filtros e o detalhe de um caso |
| `Front-End/Dashboard.html` | A tela |
| `Front-End/Comuns.html` | A escolha da mesa, usada aqui e no cadastro |

**Cartão e fila saem da mesma lista.** Contar de um lado e listar de outro
deixaria o cartão dizendo 12 e a fila mostrando 7, sem ninguém saber qual está
certo.

- Um cartão por situação, e **situação sem caso aparece zerada** — sumir do
  painel esconderia justamente a informação de que ela zerou
- **"Finalizados na célula"**: finalização preenchida e área responsável
  vazia. É conta, não coluna, então não mente quando alguém edita a área
  direto na planilha. A mesa que não declara essas colunas não ganha o cartão
- Os filtros **são os campos que já são lista**: nada escrito em código. Campo
  que virar seletor vira filtro sozinho
- O alcance do nível vale no painel: quem enxerga só os próprios casos tem
  cartões contando só os dele
- A fila abre o caso inteiro sem recarregar a tela, e o detalhe respeita a
  mesma regra de visibilidade do formulário

A mesa passou a declarar, na aba `MESAS`, onde guarda cada coisa:
`ColunaDoStatus`, `ColunasDaFila`, `ColunaDaFinalizacao` e
`ColunaDaAreaResponsavel`. Declarado, e não adivinhado pelo nome — adivinhar
acerta hoje e erra na mesa que vier depois.

![O Dashboard](imagens/tela-dashboard.png)

---

## Etapa 6 — Configurações ✅

**A tela mais importante do produto: tudo o que as outras fazem sai daqui.**

`Back-End/Config.gs` e `Front-End/Configuracoes.html`, 35 testes.

> **Por que o servidor se chama `Config.gs` e não `Configuracoes.gs`.** No Apps
> Script os arquivos moram todos num projeto só, sem pasta, e o nome é único
> **independente da extensão**: com um `Configuracoes.html` já lá, o
> `Configuracoes.gs` não pode ser criado. No repositório eles ficam em pastas
> diferentes e a colisão não aparece — ela só aparece na hora de colar. Hoje um
> teste da suíte confere que nenhum `.gs` tenha o mesmo nome de um `.html`.

### Três colunas

| Coluna | O que é |
|---|---|
| **Seções** | os sete assuntos, cada um com o seu tamanho ao lado |
| **Lista** | os itens da seção; clicar escolhe |
| **Propriedades** | o item escolhido, aberto para edição. Nada grava sem Salvar |

As sete seções: campos do formulário, usuários, níveis de acesso, listas,
mesas de trabalho, identidade e segurança, estrutura e auditoria.

### Três níveis de risco, três guardas

| O que se mexe | Guarda | Exemplo |
|---|---|---|
| **Conteúdo** | permissão `configurar` | renomear uma situação, cadastrar usuário |
| **Regra** | permissão `configurar` | o que um nível pode, quem vê qual campo |
| **Estrutura** | **+ senha de administrador** | criar coluna, apagar mesa |

A senha não é burocracia: criar coluna escreve na planilha de produção, e ali
não existe desfazer.

### As travas que o servidor já impõe

- **Trocar o cabeçalho de um campo é recusado** — cabeçalho é o nome da coluna
  na planilha. Rótulo, seção, máscara e obrigatoriedade são livres: isso é
  aparência, não endereço
- **Reordenar muda a tela, nunca a planilha.** Foi reordenando coluna que o
  sistema anterior corrompeu dado
- **Renomear um item de lista em uso é recusado**, dizendo em quantos casos ele
  está gravado — e oferecendo a saída certa, que é trocar o rótulo
- **Ninguém se tranca do lado de fora**: tirar Configurações do único nível que
  a tem, ou a estrutura do único que pode mexer nela, é recusado
- **Coluna apagada na planilha aparece marcada** na lista de campos, em vez de
  o campo parar de funcionar sem explicação

### E as travas que a tela acrescentou

- **A aba de uma mesa não muda por aqui** — os casos já gravados moram nela
- **Nome de coluna é escolhido numa lista**, nunca digitado: o nome que não
  existe é recusado dizendo quais existem, em vez de deixar o painel em branco
  dias depois
- **Desligar a última mesa ativa é recusado** — o Dashboard e o cadastro
  ficariam sem base nenhuma
- **A lista de telas é uma só.** `RECC_TELAS_DO_SISTEMA` alimenta o menu e a
  tela de níveis ao mesmo tempo; duas listas divergiriam, e a tela nova
  nasceria inacessível

### O diálogo da senha guarda a ação

Criar coluna pede a senha e, quando ela vem, **executa o que estava
pendente** — sem pedir o formulário de novo. Refazer tudo depois de digitar a
senha é o tipo de detalhe que faz alguém desistir no meio.

### A seção Painéis

Os cards do Dashboard deixaram de ser um texto separado por vírgula dentro da
mesa e viraram **linhas da aba `PAINEIS`**: cada um com nome, o que conta,
cor, ordem e o interruptor de mostrar. Até 12 por operação. Remover um card
não toca em caso nenhum — o card é uma forma de contar, e apagar a conta não
apaga o que foi contado.

### E o que ainda não é configurável

A lista completa, sem maquiagem, está em
[`06-o-que-e-configuravel.md`](06-o-que-e-configuravel.md): o que já se ajusta
pela tela, o que ainda exige abrir a planilha, e o que não se ajusta em lugar
nenhum — com o motivo de cada um.

---

## Dashboard, segunda passada 🔧

**A fila deixou de ser uma tabela e virou uma tela de trabalho.**

### A fila em grupos

Um caso da RET tem trinta e cinco colunas. Seis lado a lado perdem o resto;
trinta e cinco não cabem. A fila passou a aceitar **grupos**: várias colunas
debaixo de um título só, com a primeira em destaque e as outras de apoio.

```
Situação: data de recepção do protocolo, status
Dados da proposta: protocolo, número da proposta, Num_apolice, produto
Dados cadastrais: nome do cliente, CPF, e-mail
Motivo / assunto: motivo do cancelamento
Responsável: analista
```

A escrita antiga, sem dois-pontos, continua valendo: cada coluna vira um grupo
com o próprio nome. Nenhuma mesa precisou ser reescrita.

### O caso num modal

Clicar em **Ver detalhes** abre o caso por cima, e fechar devolve a fila
exatamente como estava — mesma rolagem, mesmo filtro, mesma linha. Sair e
voltar faria perder o lugar dezenas de vezes por dia.

Dentro do modal: o caso inteiro em duas colunas, **campo em branco com um
travessão** (sumir faria a pessoa achar que o campo não existe nesta mesa), o
**histórico do caso** tirado da trilha de auditoria, e o botão de editar.

A edição é o **mesmo formulário** de Cadastrar Caso — o `Formulario`, que
agora mora num arquivo só e é usado pelas duas telas. Dentro do modal ele
recebe um prefixo, porque a tela de cadastro pode estar atrás e os dois não
podem disputar os mesmos identificadores.

### As quatro ações da linha

| Ação | O que faz |
|---|---|
| **Ver detalhes** | abre o modal em leitura |
| **Editar** | abre o modal já em edição |
| **Alterar situação** | um diálogo pequeno, só com a situação — é o gesto mais frequente da operação, e abrir 35 campos para mexer num só é atrito que se paga dezenas de vezes por dia |
| **Excluir** | some do sistema para todo mundo; **a linha permanece na planilha** e pode voltar |

Concluir um caso preenche a data de finalização sozinho, quando a mesa tem
essa coluna e ela está vazia — é o que a operação faria à mão em seguida.

---

## Etapa 7 — Buscar Caso ✅

**O Dashboard mostra 30 dias. Aqui se acha o resto.**

`Back-End/Casos.gs` e `Front-End/BuscarCaso.html`, 17 testes.

### A regra que sustenta a tela

**Ler a coluna antes de ler as linhas.** Uma base da RET com 200 mil linhas
por 39 colunas são 7,8 milhões de células: ler tudo para procurar um
protocolo estoura o tempo do Apps Script e a cota da conta.

| Passo | Custo |
|---|---|
| 1. Ler só as **colunas de busca** e anotar em quais linhas o termo aparece | 5 colunas × 200 mil = 1 milhão de células |
| 2. Ler **inteiras** só as linhas que casaram | quase sempre uma ou duas |

Quais colunas cada mesa lê está em `MESAS.ColunasDaBusca`, e se ajusta em
Configurações. Mesa que não declara nenhuma **avisa** em vez de ler a base
toda.

### A comparação ignora máscara

`123.456.789-01` acha `12345678901`, e o contrário também. Nos dois sentidos,
porque a máscara pode estar de qualquer lado — no que a pessoa digitou ou no
que está gravado. Exigir o formato exato transformaria a busca em adivinhação.

Texto compara sem acento e sem caixa, procurando o termo **dentro** do valor:
`otavio` acha `Otávio Bandeira`.

### A planilha legada

O histórico que ficou no sistema anterior. Ela é lida **como está** — a
primeira linha é cabeçalho, e nada mais é assumido: nem tipo de coluna, nem
nome, nem ordem. Por isso procura em todas as colunas dela.

- O **Id é conferido na hora de apontar**. Guardar um Id que não abre deixaria
  a busca com um recado de erro para sempre, sem ninguém saber se era o Id ou
  a planilha que tinha sumido
- Uma linha do legado **não abre no modal**: ela não é um caso do sistema, é
  histórico. Prometer edição ali seria mentira
- A planilha fora do ar **não derruba** a busca na base própria: vira um
  recado ao lado dos resultados de verdade

### E o que a busca não faz

Não fura o alcance do nível. Quem só enxerga os próprios casos na fila também
só os acha na busca — esconder na fila e mostrar aqui seria uma porta dos
fundos. Caso ocultado também não volta.

---

## Etapa 8 — Painel Analítico ✅

**O Dashboard responde "o que eu tenho que trabalhar hoje". Aqui a pergunta é
outra: "o que está acontecendo na operação".**

`Back-End/Indicadores.gs` e `Front-End/PainelAnalitico.html`, 24 testes.

Cada gráfico é uma linha da aba `PAINEIS` — tipo, campo que vira eixo, o que
se mede, o TOP N e a ordem. Acrescentar um gráfico é acrescentar uma linha,
em Configurações → Painéis → Gráficos.

### Cinco formas, cada uma para um trabalho

| Forma | Para quê |
|---|---|
| **Pizza** (rosca) | "de que tipo são", de relance. No máximo 6 fatias; o total no meio |
| **Barras em pé** | comparar "quanto de cada", com nomes curtos |
| **Barras deitadas** | o mesmo, com nomes compridos — em pé, "Aumento do prêmio na renovação" vira escadinha |
| **Linha** | como variou no tempo |
| **Barras com linha** | o dia a dia, com a tendência por cima |

### Três regras de leitura, e o motivo de cada uma

**Um eixo só.** "Barras com linha" não são duas escalas: a linha é a **média
móvel de 7 dias da própria barra**, na mesma altura. Dois eixos fazem a mesma
altura significar duas coisas — é o erro de gráfico mais comum que existe, e
um teste confere que a linha nunca ultrapassa a maior barra.

**Cor para identidade, tom único para magnitude.** A pizza responde "de que
tipo" e usa cores; as barras respondem "quanto" e usam um tom só. Seis cores
para dizer *quanto* fazem o olho comparar cores em vez de alturas.

**Cor segue a entidade, nunca a posição.** "Concluído" é verde porque o
catálogo diz que é, e continua verde quando um filtro o joga do primeiro para
o quarto lugar. Cor por posição repintaria o gráfico a cada filtro, e ninguém
compararia duas telas.

### A paleta

Seis tons em ordem fixa, **conferidos por régua e não por gosto**: separação
mínima entre vizinhos de ΔE 9,1 para quem não distingue vermelho e verde, e
19,6 para visão normal. Um sétimo valor vira **"Demais valores"** — nunca uma
cor nova, porque cor gerada na hora fica indistinguível das outras sob
daltonismo.

Três dos seis ficam abaixo de 3:1 de contraste com o fundo claro. A regra que
compensa isso está em todo gráfico: **o número sempre visível** (rótulo
direto), uma **tabela de números** a um clique e a **dica** no passar do
mouse. Cor é a segunda leitura, nunca a única.

O tema escuro tem os seus próprios passos, conferidos contra o fundo escuro —
não é a paleta clara reaproveitada.

### Clicar leva ao caso

Clicar numa fatia ou numa barra abre a lista dos casos que a formam, e dali o
mesmo modal do Dashboard. Sem isso o painel só informa, e informar não resolve
caso nenhum.

### Exportar

Ponto e vírgula e vírgula decimal — que é como o Excel em português abre sem
perguntar nada. Segue a permissão de `exportar`.

---

## Etapa 9 — Minha Performance ✅

**As outras telas mostram a operação. Esta mostra uma pessoa — e o cuidado
aqui é de outra natureza.**

`Back-End/Indicadores.gs` e `Front-End/MinhaPerformance.html`, 19 testes.

Um número mal escolhido no Dashboard atrapalha uma decisão. Um número mal
escolhido aqui atrapalha alguém. Quatro decisões saíram disso:

### 1. O ranking segue o alcance do nível

Quem só enxerga os próprios casos **não vê nome de colega nenhum** — vê a
própria posição contra a média da equipe. Mostrar a lista a quem não pode ver
os casos dos outros seria uma porta dos fundos, e ainda por cima a mais
constrangedora que existe num sistema de trabalho.

Quem pode ver recebe a lista — mas dos **vizinhos**, não o pódio. Um pódio
completo diz muito pouco a quem está no meio e diz demais sobre quem está
embaixo.

### 2. Todo número vem com a sua base

"8 casos" sozinho não diz nada; "8 contra 6 no período anterior" diz. E a
média da equipe aparece **sempre**: "abaixo da média" sem saber qual é a média
não é informação, é só desconforto.

Sem base de comparação a variação fica **em branco** — inventar "+100%" porque
saiu de zero é ruído que a operação aprende a ignorar, junto com a variação
que importa.

### 3. Menos é melhor, às vezes

No **tempo médio até concluir**, cair 20% é boa notícia — e a tela pinta de
verde. A mesma seta para baixo em "concluídos" é o contrário. Pintar as duas
da mesma cor faria a tela dar a notícia errada.

### 4. O que não dá para calcular não aparece

Tempo médio exige que a mesa declare a coluna de finalização. Sem ela, o
indicador **some** — não aparece zerado, que pareceria desempenho ruim. Mesa
sem coluna de responsável não mostra zero: mostra o que falta configurar.

### A meta é declarada, nunca inventada

`MESAS.MetaMensalPorPessoa`, e zero desliga. Alvo tirado do nada é pior que
alvo nenhum: ele parece oficial, e ninguém sabe de onde saiu. A barra é
proporcional ao período escolhido, e passar da meta **enche a barra** — o
número diz o resto. Barra estourando a caixa é defeito, não conquista.

### "O que você fez"

A trilha da própria pessoa, e **só o que é trabalho**: cadastrou, alterou,
mudou situação, procurou. Mexer numa configuração é ação de quem administra, e
essa trilha completa vive em Configurações — aqui é a memória de quem atende,
e ela não pode virar log de sistema.

### E o desenho dos gráficos virou um módulo

`Front-End/Comuns.html`. Duas telas desenham gráficos e agora não têm duas
cópias — pela razão que já custou caro aqui: regra copiada em dois lugares é
regra que um dia diverge, e num gráfico a divergência não dá erro. Vira uma
barra um pouco mais alta do que devia.

---

## Etapa 10 — Tabela de Corretoras ✅

**Três cadastros que sustentam o resto do sistema e que, até aqui, só se
ajustavam abrindo a planilha.**

`Back-End/Cadastros.gs` e `Front-End/TabelaCorretoras.html`, 22 testes.

| Aba | O que é |
|---|---|
| **Corretoras e canais** | `CANAIS` — quem traz o caso, com o segmento |
| **Produtos** | `PRODUTOS` — o código é único, porque é ele que liga ao caso |
| **SUSEPs bloqueadas** | `SUSEP_BLOQUEADAS` — com o motivo, obrigatório |

### O que faz a tela valer mais que uma lista

**O volume ao lado de cada corretora.** Uma tabela de corretoras sem volume é
uma agenda telefônica; com ele, responde "quem me dá trabalho" — e a lista vem
ordenada por isso, não por ordem alfabética.

**E o aviso das SUSEPs fora do cadastro.** Esse é o achado. Enquanto uma SUSEP
não está em `CANAIS`, o selo do formulário diz "não encontrada" toda vez que
alguém a digita — e o sintoma aparece *na outra tela*, uma pessoa de cada vez,
sem ninguém ligar à causa. Aqui elas aparecem juntas, com quantos casos cada
uma já trouxe e o nome que os próprios casos usam, e cadastrar é um clique.

Uma SUSEP **bloqueada** não entra nessa lista: ela é conhecida, e o selo mostra
o bloqueio, não "não encontrada". Aviso que não bate com o que a pessoa vê na
outra tela é aviso que a operação aprende a ignorar.

### Três decisões

- **"Não encontrado" é atenção, não erro.** Cadastro incompleto não é corretora
  irregular; pintar de vermelho faria a operação achar que há problema com quem
  trouxe o caso
- **Bloquear não impede cadastrar.** O formulário mostra o selo vermelho com o
  motivo, e quem atende decide. Bloqueio que impedisse faria a pessoa registrar
  o caso num caderno, e o sistema perderia o caso de vista
- **O motivo do bloqueio é obrigatório.** Quem vir o selo vermelho daqui a seis
  meses precisa saber o que fazer com a informação

### A trava do cadastro

Duas corretoras com a mesma SUSEP são recusadas: o selo escolheria uma delas
pela ordem da planilha, que ninguém controla. O mesmo vale para o código do
produto.

---

## Configurações, segunda passada 🔧

Três perguntas da operação e um pedido de estilo, respondidos juntos.

### O menu ficou como o do PGO 5

Um cartão só, com os oito assuntos dentro, cada linha numa grade de três
colunas fixas — **ícone, título, quantidade**. As três colunas são o motivo de
a do meio ser `1fr` e não `auto`: com `auto`, o título manda na largura e os
números do lado direito param cada um num lugar.

Os títulos encurtaram (*Campos*, *Identidade*, *Estrutura*) porque não cabiam
em uma linha, e título que quebra em duas desalinha a contagem. O que eles
deixaram de dizer, a descrição diz — que saiu do menu, onde se repetia oito
vezes, e virou a primeira linha da coluna do meio.

**O item escolhido foi medido, não escolhido a olho.** Com o texto em
`--destaque-sobre`:

| tema | tom cheio | tom escuro |
|---|---|---|
| padrão | `#0B77CE` · 4,62 | `#095CA1` · **6,87** |
| rosa | `#C2185B` · 5,87 | `#8E1145` · **9,07** |
| brasil | `#0E7A3C` · 5,43 | `#0A5A2C` · **8,36** |
| dark | `#5C9DFF` · 6,55 | `#7FB4FF` · **8,37** |

No tema Dark o "escuro" é mais CLARO que o tom cheio, e o texto por cima é
quase preto. É por isso que o par certo é sempre `--destaque-escuro` com
`--destaque-sobre`: os dois viram juntos, tema a tema.

### Por analista virou gráfico

A operação perguntou se o Painel Analítico tinha os dois recortes. **Por área**
sempre teve, e não como gráfico: é o seletor de mesa. Um gráfico "casos por
área" com duas barras compararia RET Vida com Mesa Diamante, que têm colunas,
situações e volumes incomparáveis — a Mesa sempre pareceria pequena, e nunca
foi para ser grande.

**Por analista** faltava, e agora nasce junto com o sistema nas duas mesas, em
barras deitadas: nome de pessoa é comprido, e em pé o rótulo vira escadinha.

### A aba Importar

A pergunta era: *"temos uma lista de SUSEPs bloqueadas e quais corretoras são
Diamante — eu teria que fazer manual?"*

Não. Três passos, e o do meio é o que importa:

| passo | o que faz |
|---|---|
| **Colar** | Copia da planilha que a operação já tem. TAB (o que o Excel põe na área de transferência) ou ponto e vírgula, com ou sem cabeçalho |
| **Conferir** | O servidor diz o que vai acontecer com CADA linha — cadastra, atualiza, já igual, recusada e por quê. **Não grava nada** |
| **Aplicar** | Só então grava, e pede a senha de administrador |

**Aplicar não confia em Conferir.** Manda o TEXTO de novo, e o servidor refaz a
conferência inteira antes de escrever. Receber do navegador a lista já
conferida seria gravar o que o servidor aprovou — mas depois de passar por um
lugar onde qualquer coisa pode ter mudado.

**Nada apaga.** Uma corretora que está no cadastro e não veio no texto colado
continua onde estava; um campo vazio no texto não limpa o que já existe. O
texto colado é uma correção, não a verdade inteira.

Com cabeçalho, a ordem das colunas pode ser qualquer uma: quem exporta de
outro sistema não recebe as colunas na ordem do PGO, e exigir a ordem certa
devolveria à pessoa exatamente o trabalho manual que a tela veio tirar.

### O diálogo de senha saiu de Configurações

Virou `Comuns.html`, porque a Importação passou a precisar do
mesmo pedido. Dois diálogos escritos separados viram duas regras: um dia um
libera por 5 minutos e o outro por 30, e ninguém percebe.

### E um bug que só a tela mostrou

O [23](04-bugs-capturados.md): a linha colada era aparada ANTES de ser partida
em colunas, e com TAB isso comia a primeira coluna quando ela vinha vazia. A
linha inteira andava uma casa, e a recusa apontava o campo errado. Os quinze
testes da importação passavam — nenhum deles tinha primeira coluna vazia, e
escrever esse caso não teria ocorrido a ninguém antes de ver a linha torta na
tela.

**285 testes.**

---

## Etapa 11 — Abas de análise ✅

O pedido original: *"permitir criar uma aba exclusiva que irá criar uma aba no
planilhas para análise de dados."*

O administrador monta uma RECEITA — mesa, colunas, filtros, janela de dias — e
o sistema escreve o resultado numa aba `ANALISE_<Nome>`, achatada, pronta para
tabela dinâmica ou para o Power BI apontar.

### A trava que justifica o arquivo

`escreverAbaDeAnalise_` recusa qualquer nome que não comece com `ANALISE_`, e
essa é a primeira linha da função, antes de qualquer outra coisa. Sem ela, uma
análise chamada "BASE_RET" apagaria a base de produção — e nenhuma outra
proteção do sistema pegaria, porque apagar seria exatamente o que o código se
propôs a fazer.

O teste que prova isso tenta escrever em `BASE_MESA`, em `CONFIG` e em `''`, e
depois confere que a base continua inteira.

### Retrato, e não fórmula

A aba recebe VALORES gravados de uma vez. Poderia ser uma aba de
`=FILTER(...)`, "sempre atualizada" — mas uma fórmula que varre 30 mil linhas
recalcula a cada abertura da planilha, e com três abas dessas a planilha fica
lenta para todo mundo, o dia inteiro. Retrato pesa uma vez, quando alguém pede.

### Cinco decisões pequenas que mudam o dia a dia

| decisão | por quê |
|---|---|
| **Salvar ≠ gerar** | Montar a receita é ajuste, e ajuste não pode custar trinta segundos de espera a cada campo mexido |
| **Regerar pede senha; criar, não** | Criar não destrói nada. Regerar apaga o retrato anterior, e quem tinha uma tabela dinâmica apontada para ele vê os números mudarem embaixo |
| **A aba é reaproveitada** | Apagar e recriar mudaria o identificador dela, e todo Power BI apontado para aquela aba perderia o alvo em silêncio |
| **A grade encolhe junto** | Célula vazia também consome o teto de 10 milhões. Uma aba deixada em 1000 × 26 gasta 26 mil células para mostrar três linhas |
| **Nenhuma coluna marcada = todas** | Guardar a lista inteira congelaria as colunas de hoje, e uma coluna nova na base nunca apareceria na análise |

### O alcance não se aplica aqui

E é decisão, não esquecimento. A aba gerada mora na MESMA planilha que a base:
quem abre `ANALISE_Diamante` abre `BASE_RET` ao lado, e recortar por alcance
não esconderia nada — só deixaria a análise incompleta. Além disso, o gatilho
de horário roda sem ninguém logado; se o recorte dependesse de quem gerou, a
mesma análise teria conteúdos diferentes conforme o botão ou o horário a
tivesse gerado, e ninguém saberia qual dos dois está na aba naquele momento.

Quem pode gerar é controlado onde tem de ser: `gerarAnalise` exige a permissão
de **estrutura**, e montar a receita exige só **configurar**.

### O gatilho de horário

`atualizarAnalisesAgendadas` é a função para apontar um acionador de tempo no
editor do Apps Script. É a única do arquivo que não pede senha nem permissão —
um gatilho roda sem ninguém logado, e uma senha ali falharia toda madrugada, em
silêncio. Uma análise que estoura não derruba as outras: o erro é anotado e a
próxima segue.

### A aba gerada não está no contrato

`conferirEstrutura_` não a conhece e o instalador não a cria. É saída, não é
base: pode ser apagada à mão a qualquer momento, e a próxima geração a refaz —
tem teste para isso.

O que está no contrato é a **receita**, na aba `ANALISES` — a décima terceira.
Uma aba, e não um JSON dentro de `CONFIG`, pela mesma razão que os cartões do
Dashboard saíram de `MESAS`: é uma lista de coisas configuráveis, cada uma com
nome, mesa, colunas e filtro próprios.

**313 testes**, e o [bug 24](04-bugs-capturados.md) pelo caminho: a regra de
CSS escrita para campo de digitar esticou a caixa de marcar até empurrar o
rótulo para fora da tela.

---

## Etapa 12 — Diagnóstico ✅

A suíte prova que o **código** está certo. Ela não prova que **esta
instalação** está certa: a planilha é editável à mão, e o que a suíte conferiu
numa planilha de mentira pode não valer na de verdade seis meses depois.

`Back-End/Instalacao.gs` é a outra metade. Dez blocos, 49 verificações numa
instalação de partida, e uma pergunta só: *este sistema, aqui, agora, está
inteiro?*

### A regra que manda no arquivo

**Bloco que não consegue rodar é FALHA, nunca "pulado".**

Está nas armadilhas herdadas do PGO 5.x, e custou caro lá: o diagnóstico
antigo, quando um arquivo faltava, pulava o bloco que dependia dele — e
terminava aprovando o build. Um verificador que aprova o que não conseguiu
verificar é pior que verificador nenhum: dá confiança sem base.

`rodarBloco_` embrulha cada bloco. Qualquer erro dentro dele vira um item de
falha com o erro escrito, e bloco que devolve lista vazia também. Dois testes
trancam isso — um apaga uma função de que o bloco depende, outro faz um bloco
devolver nada.

### O que cada bloco confere

| bloco | o que pega |
|---|---|
| **Ambiente** | Fuso da planilha diferente do fuso da operação — um caso registrado depois das 21 h cai no dia seguinte. Senha de ADM não definida. Quanto do teto de 10 milhões de células a planilha já ocupa |
| **Estrutura** | Aba do contrato apagada, coluna do contrato faltando (falha), coluna a mais (atenção — o sistema ignora o que não conhece) |
| **Sequências** | Sequência ABAIXO do maior Id gravado, que é como o sistema anterior reemitiu Id em uso. E sequência com lixo |
| **Identificadores** | Id repetido, dizendo em quais linhas. Coluna de Id fora do formato texto — a causa das 4.328 colisões. Linha sem Id (atenção) |
| **Mesas** | Mesa apontando para aba que não existe, ou citando coluna que a aba não tem. Todas as mesas desligadas |
| **Campos** | Campo apontando para coluna que não existe. Campo obrigatório desligado (atenção: desligado, a obrigatoriedade deixa de valer) |
| **Painéis** | Card ou gráfico apontando para mesa ou coluna que não existe |
| **Análises** | Receita apontando para mesa ou coluna que não existe |
| **Acesso** | Usuário ativo com nível que sumiu, nível com JSON quebrado, e — a mais importante — **ninguém mais conseguindo abrir Configurações** |
| **Tela** | Toda função que a tela chama existe no servidor; toda tela do menu tem rota |

### O bloco da tela é o "build" desta etapa

A tela chama o servidor pelo **nome da função, em texto**. Renomear uma função
no servidor não quebra nada na hora: quebra quando alguém clica no botão,
semanas depois, e a mensagem que aparece é a do Apps Script, que não diz qual
função faltou.

O bloco lê os arquivos de tela com `getRawContent()`, junta todo
`Servidor.chamar('...')` e confere `typeof globalThis[nome] === 'function'`.
São 66 funções hoje. O teste apaga uma de propósito e cobra a falha, com o
nome da função e a tela em que ela é usada.

### Duas portas, e a do editor não pede nada

`diagnosticoRECC()` roda no editor do Apps Script, sem abrir o sistema — é a
porta que importa justamente quando o sistema **não abre**. Ela não exige
permissão nem senha, e não precisa: quem consegue abrir o editor já tem acesso
a tudo, e negar ali só atrapalharia quem foi consertar. Escreve o laudo no log
em texto, porque um JSON de trezentas linhas no log é ilegível, e ilegível é
o mesmo que ausente.

`diagnosticoDoSistema()` é a mesma coisa pela tela, em Configurações ›
Estrutura. Exige `configurar` e deixa rastro na auditoria.

### O laudo na tela esconde o que está certo

Bloco todo verde nasce **fechado**, com a contagem ao lado ("13 conferidos").
Bloco com atenção ou falha nasce aberto. Um laudo bom tem cinquenta linhas
verdes, e ler cinquenta linhas verdes para achar as três vermelhas é o mesmo
que não ter laudo. É `<details>` nativo — sem JavaScript, e já com o teclado
funcionando.

O "como arrumar" só aparece quando há o que arrumar. Repetir a instrução ao
lado de tudo que está certo faria o olho parar de ver as três que importam.

| Arquivo | Entrega |
|---|---|
| `Back-End/Instalacao.gs` | Os dez blocos, as duas portas e o laudo em texto |
| `Front-End/Configuracoes.html` | O laudo na tela, em Configurações › Estrutura |

### Uma conferência curta e uma completa, não duas regras

`verificarEstruturaRECC()`, do Instalador, continua sendo a de dois segundos
para logo depois de copiar os arquivos. As duas leem o mesmo
`conferirEstrutura_` — e tem teste cobrando que concordem. Duas versões da
mesma regra sempre acabam discordando, e aí uma das duas está mentindo.

### E o caso que chegou da operação enquanto isto era escrito

O sistema publicado não abria, e tudo o que dizia era *"nenhum arquivo html
com o nome formulario foi encontrado — linha 53"*. Verdade, e inútil: o
`Comuns.html` tinha ficado para trás na cópia, mas a mensagem não dizia de
onde tirar o arquivo, como nomeá-lo no Apps Script (sem `.html`, sem acento,
maiúsculas iguais) nem — o pior — **quantos outros faltavam**. Um por vez, com
uma recarga entre cada.

Virou o [bug 25](04-bugs-capturados.md), com três defesas: o `incluir_` agora
devolve um recado que resolve, `verificarEstruturaRECC()` passou a conferir os
arquivos de tela além das abas (o README já prometia isso e ela não fazia), e
o simulador ganhou `esconderTela(nome)` — um arquivo que está na pasta e não
está no projeto. Sem poder simular isso, o caminho de erro mais comum de uma
instalação nova continuaria sem teste.

**351 testes** — 38 desta etapa, e quase todos QUEBRAM alguma coisa de
propósito numa planilha nova para cobrar a falha correspondente. Provar que o
diagnóstico aprova uma instalação boa é o teste fácil e o menos útil: um
verificador que sempre responde "aprovado" também passaria nele.

---

## Pente-fino, antes do teste de estresse

Uma varredura arquivo por arquivo, procurando erro em vez de esperar que ele
apareça. O que ela achou:

### O que estava impedindo o sistema de rodar

**`Configuracoes.gs` e `Configuracoes.html` não podem existir juntos no Apps
Script.** No repositório eles moram em pastas diferentes e convivem em paz; no
Apps Script não existe pasta, e o nome é único **independente da extensão**.
O servidor virou **`Config.gs`**, e um teste confere que nenhum `.gs` tenha o
nome de um `.html` — nem ignorando maiúsculas, porque a plataforma diferencia
a caixa e quem copia à mão não.

### Por que a tela ficava em "Lendo o cadastro…"

Três defeitos empilhados, e o primeiro é o que escondia os outros:

| defeito | o que acontecia |
|---|---|
| **Função ausente estourava por fora do erro** | Com a função faltando no servidor, `google.script.run.nomeDela` é `undefined` e o `.apply` estoura *dentro* de `chamar()` — quando o `.senao` ainda nem foi registrado. As 73 chamadas tinham tratamento de falha e nenhuma delas era alcançada |
| **Resposta que chega depois de trocar de tela** | Ela procurava um elemento que não existe mais: `Cannot set properties of null` |
| **Resposta que chega depois de trocar de seção** | Dentro de Configurações, `carregarSecao` zera o `dados`, e a resposta atrasada tentava desenhar com um `dados` que não era o dela |

As três defesas: `chamar()` embrulha o disparo e diz **qual** função falta e
por quê; a ponte conta as trocas de tela e não entrega resposta para uma tela
que já saiu; e cada desenho de seção confere se ainda é a seção da vez.

> **Ter `.senao` em todo lugar não garante que o erro passe por ele.** É a
> lição do achado 27, e a mais cara desta rodada.

### O que a varredura confirmou

| conferência | resultado |
|---|---|
| Funções que as telas chamam | **66**, todas existem no servidor e todas conferem quem chama |
| Chamadas ao servidor com tratamento de falha | **73 de 73** |
| Funções `.gs` com nome repetido | nenhuma |
| Constantes globais repetidas | nenhuma |
| Funções nunca usadas | nenhuma |
| `SpreadsheetApp` fora do `Base.gs` | 2 → **0** (viraram `abrirPlanilhaDeFora_`) |
| ES6 fora do padrão nos `.gs` | nenhum |
| Ids de HTML repetidos | 4 → **0** |
| Arquivos de tela órfãos | nenhum |
| `<script>` que não compila | nenhum |
| Funções que a prévia não sabia responder | 3 → **0** |

Tudo isso virou teste. Não adianta conferir uma vez.

### E uma ferramenta nova

```bash
node Evolucao/Testes/clicar-em-tudo.js
```

Percorre as sete telas e **clica em 112 elementos**, ouvindo `pageerror` e
`console.error`, e procurando três textos que nunca deveriam chegar à tela:
`undefined`, `[object Object]` e o recado de função ausente. Os dois defeitos
de resposta atrasada só aparecem quando alguém clica rápido e desiste no meio
— que é o que as pessoas fazem o dia inteiro.

**362 testes.**

---

## Teste de estresse — 200 mil casos

```bash
node Evolucao/Testes/estresse.js            # até 50 mil
node Evolucao/Testes/estresse.js 200000     # o volume que a RET terá
```

### O que ele mede, e por que não é o relógio

No Apps Script o que custa não é a conta em JavaScript: é cada **ida ao
serviço** de planilha e de propriedades. Uma ida leva dezenas de
milissegundos, e a execução inteira tem **seis minutos**. Medir o relógio do
Node não diz nada sobre isso, porque o Node não paga o pedágio.

Então o simulador conta idas, células lidas e gravadas, e o teste converte
isso em tempo por uma régua conservadora: 25 ms por ida, 900 ms por milhão de
células, 12 ms por propriedade. Não é exata, e não precisa ser — serve para
dizer "cabe com folga", "apertado" ou "não cabe".

### O que ele achou

Três defeitos, e o terceiro não é lentidão.

| achado | antes | depois |
|---|---|---|
| **[28](04-bugs-capturados.md)** Um Id por vez, e cada um uma ida ao PropertiesService | gravar 5.000 casos: **10.003 idas, 2 min** | **5 idas, 275 ms** |
| **[29](04-bugs-capturados.md)** Uma ida por linha na segunda metade da busca | busca de 100 resultados: **100 idas** | agrupadas em blocos: **1 a 20** |
| **[30](04-bugs-capturados.md)** O painel mostrava um pedaço e **parecia o total** | silêncio | as três telas avisam |

O 30 é o grave. Os painéis leem só as últimas 5.000 linhas — de propósito, e
documentado. Com 200 mil casos em um ano, uma janela de 30 dias tem umas 15
mil: **o painel mostrava um terço do período**. O Dashboard avisava, mas o
aviso estava colado na fila e dava a entender que os cartões estavam completos;
o Painel Analítico calculava `truncada` e nunca mostrava; a Minha Performance
nem calculava — e é a tela sobre uma pessoa.

> Um sistema que fica lento avisa sozinho. Um que fica errado, não.

### O placar em 200 mil casos

| operação | idas | células | tempo est. |
|---|---:|---:|---:|
| Gravar 5.000 casos de uma vez | 5 | 195 mil | 275 ms |
| Dashboard: abrir a RET Vida | 16 | 202 mil | 581 ms |
| Buscar por protocolo | 21 | 1,0 mi | 1,4 s |
| Buscar termo que casa com milhares | 20 | 1,0 mi | 1,4 s |
| Painel Analítico: os 6 gráficos | 16 | 202 mil | 582 ms |
| Minha Performance | 14 | 201 mil | 531 ms |
| Cadastrar um caso | 25 | 7,6 mil | 580 ms |
| Diagnóstico completo | 59 | 403 mil | 1,7 s |
| Gerar `ANALISE_RetVida` | 23 | 9,6 mi | 9,1 s |
| Importar 2.000 corretoras | 19 | 24 mil | 445 ms |

**Todas cabem com folga** no teto de seis minutos. A mais cara — gerar a aba de
análise — usa 2,5% dele.

### O limite de verdade não é tempo: é espaço

| | células | % do teto |
|---|---:|---:|
| `BASE_RET` com 200 mil casos | 7.800.468 | **78%** |
| `ANALISE_RetVida` (cortada em 50 mil) | 1.750.035 | 18% |
| tudo somado | **9.672.905** | **96,7%** |

Com 200 mil casos a planilha está **cheia**. Não sobra espaço para a Mesa
Diamante crescer nem para uma segunda aba de análise. O diagnóstico já acusa
isso como FALHA acima de 95%, com o caminho escrito no laudo.

O teto real desta arquitetura, então, é da ordem de **200 mil casos por
planilha** — e o que decide não é a velocidade, é a célula. Passar disso pede
mover o histórico antigo para uma planilha de arquivo e apontá-la como planilha
legada, que a busca já lê.

### O que também foi testado

- **Dez cadastros em sequência imediata** — nenhum Id repetido. É a trava que
  o PGO 5.x não tinha, e que lá custou 4.328 colisões.
- **Linha suja digitada direto na planilha** — data que não é data, SUSEP
  inválida, linha sem Id. Dashboard, busca e diagnóstico seguem funcionando, e
  o diagnóstico aponta a linha.
- **Importação no teto** de 2.000 linhas.
- **Análise sobre a base inteira**, que bate no corte de 50 mil e o informa.

**366 testes.**

---

## O bloco que nasceu de uma pergunta da operação

*"Desconfigurou a estilização da página, o que pode ser?"*

CSS que não existe não reclama — só não pinta. Sem erro, sem exceção, sem log.
E do lado do repositório estava tudo certo: a prévia renderizava. O que estava
desatualizado era a **cópia do `Estilos` no projeto do Apps Script**.

O diagnóstico ganhou o bloco **A folha de estilos**, que responde três coisas
de dentro do Apps Script: o arquivo está no projeto; ele está **inteiro**
(chave desequilibrada denuncia a colagem de 70 KB que não foi até o fim); e
toda classe que as telas usam está **definida** — se não, o laudo lista os
nomes. "Está desconfigurado" vira "o Estilos deste projeto é mais antigo que
as telas, e faltam estas sete classes".

A investigação achou de quebra [três buracos](04-bugs-capturados.md) no próprio
repositório: `.ver` era classe morta em três telas, e `.config-mesas` e
`.config-legado` eram usadas sem nunca terem sido escritas.

**370 testes.**

---

## Ponta a ponta, e o pacote de três arquivos

### O buraco que faltava

A suíte provava o **servidor**. A prévia mostrava a **tela** — mas recusa toda
gravação, de propósito, para não fingir ter gravado o que não gravou.
Resultado: o caminho mais importante do sistema nunca era exercitado inteiro:

> formulário preenchido → servidor grava → planilha muda → tela recarrega

E é ali que moram os defeitos que nenhum dos dois lados enxerga: o campo que a
tela chama de `nivel` e o servidor espera como `nivelAcessoId`, a caixa de
marcar que volta como texto, o id que mudou num lado e não no outro.

```bash
node Evolucao/Testes/ponta-a-ponta.js
```

A página é gerada pelo `doGet` **de verdade**. No navegador,
`google.script.run` é substituído por uma ponte que devolve a chamada para o
Node, onde o servidor roda no simulador. Os valores atravessam em JSON, que é
exatamente o que o Apps Script faz — `Date` vira texto, `undefined` some.

DOM de verdade, servidor de verdade, planilha que se comporta como a de
verdade. Seis percursos: a aba Usuários carregando, cadastrar, editar,
desativar, e-mail repetido recusado, e cadastrar um caso.

**Achado de passagem:** o asterisco do campo obrigatório era só visual. Quem
usa leitor de tela ouvia "asterisco", ou nada. Agora os campos levam
`aria-required` — não `required`, porque o formulário é `novalidate` de
propósito: quem valida é o servidor, com mensagem melhor que o balão nativo.

### Os arquivos soltos viraram 3

```bash
node Evolucao/Testes/gerar-pacote.js
```

O repositório separa o código por assunto, um arquivo por assunto — e é assim que
tem de ser para alguém conseguir ler e consertar. Mas o Apps Script não tem
"importar pasta": cada um vira um arquivo criado à mão, com o nome digitado
certo. Trinta e cinco vezes. E o custo não é o tempo: **basta um ficar para
trás** para a tela congelar num "Lendo o cadastro…" que não explica nada — já
aconteceu duas vezes aqui, nos [achados 25 e 27](04-bugs-capturados.md).

`Evolucao/pacote/` tem três arquivos: `Codigo.gs` (todos os do servidor),
`Index.html` (o esqueleto com as telas coladas dentro), `SemAcesso.html`.
Mais um `COMO-USAR.txt`.

> **O pacote é testado como o original.** O ponta a ponta roda duas vezes —
> contra os arquivos soltos e contra os 3 — e cobra que se comportem igual. Se
> divergissem, haveria duas verdades, e a que a operação usa seria a que
> ninguém testa.

E há dois testes, não um. O primeiro prova que o **gerador** funciona: ele gera
numa pasta descartável e confere que nenhuma função e nenhuma tela ficou de
fora. O segundo prova que o **arquivo guardado no repositório** — o que alguém
vai baixar e colar — ainda é o código de hoje: gera uma cópia fresca, tira a
linha do carimbo dos dois lados e compara.

> **Por que dois.** Na primeira versão havia um só, e ele regerava o pacote por
> cima do repositório antes de conferi-lo. Provava que o gerador funciona e
> nada sobre o arquivo guardado, que podia estar semanas atrasado passando
> verde. É a armadilha do bloco que se aprova sozinho, da Etapa 12, dentro da
> própria suíte — o [achado 33](04-bugs-capturados.md). **Conferir o que você
> acabou de fabricar não é conferir nada.** O segundo teste nasceu depois, junto
> com a correção do cadastro, e está descrito aqui porque é aqui que ele mora.

**372 testes.**

---

## O cadastro de usuários, revisto

Três mudanças pedidas pela operação, e uma que veio junto.

### A mesa da pessoa

`USUARIOS` ganhou a coluna **`MesaId`** — a décima quarta do contrato — e o
formulário ganhou o campo. **Vazio é válido**, e é o caso de quem administra:
quem cuida do sistema não pertence a uma mesa, atende as duas e delega. Na
lista isso aparece como *"todas as mesas"*, e não em branco — em branco parece
cadastro pela metade.

Mesa preenchida tem de existir. Uma mesa que sumiu deixaria a pessoa apontando
para o nada, e ninguém descobriria até alguém estranhar o Dashboard vazio.

A lista passou a mostrar **e-mail · nível · cargo · mesa**, em vez de só
e-mail e nível.

### A senha de administrador só vale para quem não é administrador

A senha nunca foi uma segunda identidade: o sistema já sabe quem está
chamando, pela conta Google, e já conferiu a permissão. Ela é um **freio** —
um segundo de parada antes de uma ação sem desfazer. Para quem tem a permissão
de estrutura, esse freio é atrito sem ganho: a pessoa que pode mexer na
estrutura é a mesma que define a senha.

O efeito, por ação:

| ação | exige | quem é pedido |
|---|---|---|
| Criar campo (coluna nova) | `estrutura` | ninguém — só administrador chega lá |
| Regerar aba de análise | `estrutura` | ninguém, pelo mesmo motivo |
| **Importar em lote** | `configurar` | **quem configura sem administrar** |

A importação é onde o freio continua servindo: é a ação mais provável de ser
delegada, e escreve em centenas de linhas de uma vez.

Instalação **sem senha definida não libera ninguém** — continua barrando, e
dizendo onde definir. Do contrário, não definir senha viraria o jeito mais
fácil de desligar a guarda.

### As datas saem como texto

`listarUsuarios` devolvia `Date`; as irmãs dela já devolviam texto formatado.
Elas atravessam a fronteira do `google.script.run` em JSON, e um `Date`
atravessa como texto ISO que a tela teria de reinterpretar. Formatar no
servidor deixa uma regra só, do lado que conhece o fuso.

### E o relógio de desistência

O [achado 32](04-bugs-capturados.md): há falha que **não chega ao
`withFailureHandler`** — nada volta, nem sucesso nem erro, e a tela espera para
sempre. Agora a ponte desiste em quarenta segundos e diz qual função não
respondeu. Quarenta é folga enorme: a operação mais cara do sistema leva nove
segundos.

> Uma tela parada é o pior estado possível: não funciona **e não avisa**.

**384 testes**, e o ponta a ponta subiu para sete percursos.

---

## Responsividade

Uma conferência à parte, num navegador de verdade:

```bash
node Evolucao/Testes/conferir-responsividade.js
```

**7 telas × 12 larguras**, de 1600px a 320px, procurando a página rolar na
horizontal e o elemento que escapou da janela. Tabela dentro de uma caixa que
rola de propósito não conta — rolar a tabela é a solução, não o problema.

Na suíte ficam as regras estáticas que sustentam isso: nenhuma largura fixa
acima de 320px no CSS, toda tabela dentro de uma caixa que rola, e a grade dos
gráficos com `minmax(min(100%, 340px), 1fr)`, que encolhe sozinha sem media
query nenhuma.

---

## Menos arquivos, agrupados por assunto

Pedido do PO, e a razão dele é de manutenção, não de cópia: *"queria diminuir…
agrupe algumas funções do .gs que tem lógica estarem juntas em um arquivo"*.

Eram **35 arquivos** — 18 `.gs` e 17 `.html`. Agora são **19**: 7 e 12.

### Os sete do servidor

Cada um responde a UMA pergunta. É esse o critério, e não o tamanho: um
arquivo existe para que alguém que não conhece o sistema saiba onde procurar.

| Arquivo | Responde | Juntou |
|---|---|---|
| `Base.gs` | como o sistema fala com a planilha | Esquema, Sequencia, Planilha |
| `Cadastros.gs` | quem traz o caso para dentro | Corretoras, Importacao |
| `Casos.gs` | o caso, do formulário à busca | Campos, Casos, Busca |
| `Config.gs` | o que se ajusta sem programador | Config, Analise |
| `Entrada.gs` | quem entra e o que pode | Principal, Acesso, Usuarios |
| `Indicadores.gs` | os números | Painel, Analitico, Performance |
| `Instalacao.gs` | criar e conferir a instalação | Instalador, Diagnostico |

> **Por que `Indicadores.gs` junta três telas.** Dashboard, Painel Analítico e
> Minha Performance contam os MESMOS casos. Separados, convidam ao erro de
> mudar a regra de contagem num e esquecer dos outros dois — e aí o cartão diz
> 12, o gráfico diz 9, e ninguém sabe qual está certo. Juntos, a regra é uma
> só porque está à vista.

> **Por que `Base.gs` não levou o formulário junto.** A sugestão era juntar
> "criação de formulários e ajustes no Google Planilhas". São níveis
> diferentes: um é infraestrutura (como falamos com o Sheets), o outro é
> domínio (o que um caso pergunta). Misturar os dois faz a infraestrutura
> parecer que sabe o que é um caso — e é justamente o que `Base.gs` não pode
> saber, porque é ele que serve a todas as abas.

### Os doze de tela

Uma por item do menu (são 7), mais quatro de infraestrutura e a de bloqueio:

- `Index.html` — o esqueleto, que manda incluir os outros
- `Estilos.html` — toda a aparência e os quatro temas
- `Comuns.html` — as peças que mais de uma tela usa
- `Aplicacao.html` — a ponte com o servidor e o roteador
- `SemAcesso.html` — servida sozinha, a quem não está cadastrado

O `Comuns.html` guarda seis peças: Moldura, SenhaDeAdministrador,
SeletorDeMesa, Formulario, CasoEmModal e Graficos. Nenhuma é tela do menu, e
todas são usadas por mais de uma — o critério para morar ali é esse, escrito
no cabeçalho do arquivo.

> **Juntar não misturou nada.** Cada peça já era um módulo fechado
> (`var Nome = (function () { … })()`), com o estado dela dentro. Morar no
> mesmo arquivo não dá a uma acesso à outra: é exatamente o mesmo código, só
> que em um arquivo em vez de seis. Foi por isso que dava para juntar sem
> reescrever uma linha.

### O que o agrupamento quebrou, e como apareceu

Vinte e dois testes falharam de cara, todos com `ENOENT` — eles liam arquivos
de tela pelo nome. **Falhar alto assim é o resultado bom**: o risco de uma
mudança dessas é a que passa despercebida.

A correção não foi trocar nome por nome. Os testes ganharam `lerPeca(nome)` e
`scriptDaPeca(nome)`, nas ferramentas: procuram a peça onde ela estiver — como
arquivo próprio, ou como trecho de um arquivo maior, achando pelo banner. Se
amanhã as peças se separarem de novo, nenhum teste precisa mudar.

### E uma ferramenta que teria mentido

O `Evolucao/conferir-projeto.gs` carregava, escrito à mão, o mapa "arquivo →
funções que as telas chamam". Depois do agrupamento ele apontaria para sete
arquivos que não existem mais — e não como erro: com confiança, mandando
copiar o `Analitico.gs`.

Agora ele é **gerado** por `node Evolucao/Testes/gerar-conferidor.js`, a partir
do código de verdade, e um teste compara o gerado com o guardado. É o achado
33 pela segunda vez no mesmo mês, e é por isso que virou regra: **artefato que
repete informação do código não se digita, se gera — e se compara num teste.**

**385 testes.**

---

## O que ainda está em aberto

| Assunto | Situação |
|---|---|
| **Escopo `EQUIPE`** | Implementado como "mesmo canal que atende", única noção de equipe que a estrutura tem. Se a operação usa hierarquia de supervisão, vira uma coluna nova em `USUARIOS` e só `filtrarPeloAlcance_` muda |
| **Logo da operação** | A chave `IDENTIDADE.LOGO_URL` aceita endereço `https` ou a imagem embutida em texto. Enquanto vazia, o nome faz as vezes da logo |
| **Nome das telas, janela da fila e tema padrão** | Moram em `CONFIG` e ainda se ajustam só na planilha. São os próximos a ganhar tela |
| **Criar e apagar mesa** | A tela ajusta as mesas que existem. Criar uma mesa nova é estrutura (cria aba), e ainda não passa por Configurações |
| **Volume** | 30 mil linhas hoje ocupam ~9% do teto de 10 milhões de células. Ver a seção 8 de [`01-arquitetura.md`](01-arquitetura.md) |
