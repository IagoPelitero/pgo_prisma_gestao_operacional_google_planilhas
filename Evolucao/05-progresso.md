# Progresso

O estado de cada etapa, o que ela entregou e o que falta. Atualizado a cada
entrega.

**Estado geral:** 5 de 12 etapas construídas, a 6ª em obra · 163 testes
passando.

---

## Como as etapas foram organizadas

A ordem não é arbitrária: **cada etapa depende da anterior**, e cada uma
entrega algo que funciona sozinho e pode ser conferido na planilha. Nada de
"faz metade de tudo" — é uma camada de cada vez, testada antes da seguinte.

| # | Etapa | Estado | Testes |
|---|---|---|---|
| 1 | Fundação | ✅ pronta | 32 |
| 2 | Acesso | ✅ pronta | 30 |
| 3 | Casca | ✅ pronta | 27 |
| 4 | Cadastrar Caso | ✅ pronta | 26 |
| 5 | Dashboard | ✅ pronta | 18 |
| 6 | Configurações | 🔨 servidor pronto, tela em construção | 25 |
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

## Etapa 6 — Configurações 🔨

**A tela mais importante do produto: tudo o que as outras fazem sai daqui.**

O servidor está pronto e testado — `Back-End/Configuracoes.gs`, 25 testes.
A tela é o que falta.

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

### O que falta

A tela: o submenu das seis seções, a lista central, o painel de propriedades à
direita e o diálogo da senha.

---

## O que ainda está em aberto

| Assunto | Situação |
|---|---|
| **Escopo `EQUIPE`** | Implementado como "mesmo canal que atende", única noção de equipe que a estrutura tem. Se a operação usa hierarquia de supervisão, vira uma coluna nova em `USUARIOS` e só `filtrarPeloAlcance_` muda |
| **Logo da operação** | A chave `IDENTIDADE.LOGO_URL` aceita endereço `https` ou a imagem embutida em texto. Enquanto vazia, o nome faz as vezes da logo |
| **Editar um caso pela fila** | `editarCaso` já existe e está testado, mas ainda não há tela para isso — a fila abre o detalhe em leitura. Entra junto de Configurações |
| **Volume** | 30 mil linhas hoje ocupam ~9% do teto de 10 milhões de células. Ver a seção 8 de [`01-arquitetura.md`](01-arquitetura.md) |
