# Progresso

O estado de cada etapa, o que ela entregou e o que falta. Atualizado a cada
entrega.

**Estado geral:** 6 de 12 etapas construídas, mais o Dashboard reformado ·
184 testes passando.

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
| 7 | Buscar Caso | ⏳ | — |
| 8 | Painel Analítico | ⏳ | — |
| 9 | Minha Performance | ⏳ | — |
| 10 | Tabela de Corretoras | ⏳ | — |
| 11 | Abas de análise | ⏳ | — |
| 12 | Diagnóstico | ⏳ | — |

---

## Etapa 1 — Fundação ✅

**O alicerce: como o dado entra e sai da planilha sem se corromper.**

| Arquivo | Entrega |
|---|---|
| `Back-End/Esquema.gs` | O contrato das 12 abas: cabeçalhos exatos e tipo de cada coluna |
| `Back-End/Planilha.gs` | A porta única para o Planilhas — nenhum outro arquivo chama `SpreadsheetApp` |
| `Back-End/Sequencia.gs` | Id decimal de 10 casas, que nunca anda para trás |
| `Back-End/Instalador.gs` | Cria as abas numa planilha vazia e cadastra o primeiro administrador |

As duas regras que nasceram aqui e valem para sempre: a coluna é encontrada
pelo **nome do cabeçalho**, nunca pela posição; e a faixa é **formatada antes**
de receber o valor.

**Bugs pegos:** 3 (ver [`04-bugs-capturados.md`](04-bugs-capturados.md) 1 a 3).

## Etapa 2 — Acesso ✅

**Quem entra, e o que cada um pode.**

| Arquivo | Entrega |
|---|---|
| `Back-End/Acesso.gs` | Níveis, escopo, senha de administrador, auditoria |
| `Back-End/Usuarios.gs` | Cadastro de quem pode entrar |
| `Back-End/Principal.gs` | `doGet`, pacote de partida, identidade visual |
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
| `Front-End/Moldura.html` | Menu lateral e barra superior |
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
| `Back-End/Campos.gs` | O motor: monta o formulário a partir de `CAMPOS` e valida o que volta |
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
| `Back-End/Painel.gs` | Cartões, fila, filtros e o detalhe de um caso |
| `Front-End/Dashboard.html` | A tela |
| `Front-End/SeletorDeMesa.html` | A escolha da mesa, usada aqui e no cadastro |

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

`Back-End/Configuracoes.gs` e `Front-End/Configuracoes.html`, 35 testes.

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

## O que ainda está em aberto

| Assunto | Situação |
|---|---|
| **Escopo `EQUIPE`** | Implementado como "mesmo canal que atende", única noção de equipe que a estrutura tem. Se a operação usa hierarquia de supervisão, vira uma coluna nova em `USUARIOS` e só `filtrarPeloAlcance_` muda |
| **Logo da operação** | A chave `IDENTIDADE.LOGO_URL` aceita endereço `https` ou a imagem embutida em texto. Enquanto vazia, o nome faz as vezes da logo |
| **Nome das telas, janela da fila e tema padrão** | Moram em `CONFIG` e ainda se ajustam só na planilha. São os próximos a ganhar tela |
| **Criar e apagar mesa** | A tela ajusta as mesas que existem. Criar uma mesa nova é estrutura (cria aba), e ainda não passa por Configurações |
| **Volume** | 30 mil linhas hoje ocupam ~9% do teto de 10 milhões de células. Ver a seção 8 de [`01-arquitetura.md`](01-arquitetura.md) |
