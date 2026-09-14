# PGO — Prisma Gestão Operacional

**Sistema de gestão de casos sobre Google Planilhas e Google Apps Script.**
Sem servidor, sem banco de dados externo, sem custo de infraestrutura.

Desenvolvido por **Pelitero Labs**.

![O sistema em operação](Evolucao/imagens/sistema-tema-padrao.png)

> **Uma etapa só está pronta quando funciona, a suíte passa cinco vezes e
> está publicada aqui.** Etapa que fica na máquina de alguém não existe.

---

## O que é

**PGO** é a plataforma, pensada para servir a diferentes operações de
atendimento. **RECC — Relacionamento Estratégico de Clientes e Corretores** é a
operação montada sobre ela, em Porto Seguro.

Nome, subtítulo, logo, cor e até os títulos do menu vivem na **aba `CONFIG` da
planilha**. Servir outra operação é trocar essas linhas, não é mexer em código.

O sistema atende duas mesas de trabalho, e aceita uma terceira sem tocar em
código:

| Mesa | Base | O que é |
|---|---|---|
| **RET Vida** | `BASE_RET` | Retenção — relacionamento estratégico de clientes |
| **Mesa Diamante** | `BASE_MESA` | Atendimento a casos prioritários |

### As telas

`Dashboard` · `Cadastrar Caso` · `Minha Performance` · `Buscar Caso` ·
`Tabela de Corretoras` · `Painel Analítico` · `Configurações`

Cada uma aparece — ou não — conforme o **nível de acesso** de quem entrou.

### Os quatro temas

Trocáveis a qualquer momento, guardados por usuário: **Padrão** (azul da
marca), **Rosa**, **Escuro** e **Brasil**.

| | | |
|---|---|---|
| ![Rosa](Evolucao/imagens/sistema-tema-rosa.png) | ![Escuro](Evolucao/imagens/sistema-tema-escuro.png) | ![Brasil](Evolucao/imagens/sistema-tema-brasil.png) |

---

## Como o repositório está organizado

```
Back-End/     os arquivos .gs — rodam no Apps Script, no servidor do Google
Front-End/    os arquivos .html — rodam no navegador de quem usa
Evolucao/     tudo que NÃO vai para o Apps Script
```

Os nomes das duas primeiras pastas são **etiquetas de destino**: elas dizem
para onde cada arquivo vai no editor do Apps Script. O que separa de verdade os
dois grupos é onde o código executa — `.gs` no Google, `.html` no navegador.

Dentro de `Evolucao/`:

| Caminho | O que é |
|---|---|
| [`01-arquitetura.md`](Evolucao/01-arquitetura.md) | O modelo de dados e **por que** cada decisão foi tomada |
| [`02-padrao-de-codigo.md`](Evolucao/02-padrao-de-codigo.md) | Como os nomes são escolhidos, e as exceções |
| [`03-manutencao.md`](Evolucao/03-manutencao.md) | Como mexer sem quebrar — leia antes de tocar em código |
| [`04-bugs-capturados.md`](Evolucao/04-bugs-capturados.md) | Todo defeito encontrado, com sintoma, causa e defesa |
| [`05-progresso.md`](Evolucao/05-progresso.md) | O estado de cada uma das 12 etapas |
| [`06-o-que-e-configuravel.md`](Evolucao/06-o-que-e-configuravel.md) | O que se ajusta pela tela, o que só na planilha e o que ainda não se ajusta |
| `Testes/` | A suíte: 201 testes, que rodam no computador com `node` |
| `imagens/` | As telas |

---

## Instalação

1. Crie uma planilha **nova e vazia** no Google Planilhas, e um projeto do
   Apps Script vinculado a ela.

2. Copie os arquivos. **O projeto do Apps Script não tem pastas** — as daqui
   são organização do repositório:

   | Aqui | No editor do Apps Script |
   |---|---|
   | `Back-End/Acesso.gs` | `Acesso.gs` |
   | `Front-End/Index.html` | `Index.html` |
   | `Evolucao/` | **não vai** |

   A ordem da cópia não importa: o Apps Script avalia os `.gs` em ordem
   alfabética, e nenhum arquivo tem código de topo que dependa de outro.

3. Publique como **aplicativo da web** (executar como você).

4. No editor, execute **`instalarRECC()`** uma vez. Ela cria as 12 abas, semeia
   o catálogo e **cadastra você como o primeiro administrador**.

   > Esse último passo não é conveniência: o acesso é pelo e-mail autenticado
   > conferido contra a aba `USUARIOS`, e uma base nova tem essa aba vazia. Sem
   > ninguém dentro, ninguém entra — e sem entrar, ninguém cadastra.

5. Confira com **`verificarEstruturaRECC()`**. Ela só lê, e diz em segundos se
   algum arquivo ficou para trás na cópia. Nenhum teste rodado fora do Apps
   Script pega isso.

6. Abra o sistema e defina a senha de administrador.

**A instalação recusa rodar sobre uma planilha que já tenha dado.** É a única
rotina do sistema que cria estrutura; depois dela, nenhum caminho do produto
cria, renomeia, apaga ou reordena aba e coluna por conta própria.

Nenhum dado operacional é semeado: bases, canais, produtos e SUSEPs bloqueadas
nascem vazios.

---

## Rodar os testes

```bash
node Evolucao/Testes/rodar.js
```

201 testes. O critério de aceite é **cinco execuções seguidas sem falha** —
rodar uma vez não detecta teste instável.

A suíte roda contra um Google Planilhas falso que **converte valores igual ao
de verdade**: numa célula de formato Geral, `'00000010'` vira `10` e
`'000000E1'` vira `0`. Há um teste dedicado só a provar que o simulador
realmente corrompe — sem ele, os outros 200 não valeriam nada.

## Ver as telas sem publicar

```bash
node Evolucao/Testes/gerar-previa.js
```

Escreve `previa/sistema.html` e `previa/sem-acesso.html`, que abrem em qualquer
navegador. São montados pelo **mesmo código do servidor**; só a ponte com o
Google é substituída. Serve para conferir menu, temas e navegação sem publicar
a cada mudança.

---

## A visão do dia

Cartões e fila saem da **mesma lista**, já filtrada pelo alcance do nível — por
isso o número do cartão sempre bate com o que a fila mostra. Os filtros são os
campos que já são lista: nada escrito em código.

![O Dashboard](Evolucao/imagens/tela-dashboard.png)

A fila vem em **grupos**: várias colunas debaixo de um título só, com a
primeira em destaque. Um caso da RET tem trinta e cinco colunas — seis lado a
lado perdem o resto, e trinta e cinco não cabem.

Clicar em **Ver detalhes** abre o caso por cima, e fechar devolve a fila
exatamente como estava. Campo em branco aparece com um travessão: sumir faria
a pessoa achar que o campo não existe naquela mesa.

![O caso aberto](Evolucao/imagens/tela-caso-em-modal.png)

Cada linha tem quatro ações: ver, editar, **alterar situação** — um diálogo só
com a situação, porque é o gesto mais frequente da operação — e excluir, que
tira o caso do sistema e **mantém a linha na planilha**.

---

## O cadastro de casos

O formulário **não está escrito no código**. Ele é montado a partir da aba
`CAMPOS` toda vez que a tela abre — campo criado em Configurações aparece
sozinho, e campo oculto para o nível de acesso nem chega ao navegador.

![A tela de cadastro](Evolucao/imagens/tela-cadastrar-caso.png)

O selo da SUSEP responde três coisas, e as três são informação: **liberada**
com o segmento, **bloqueada** com o motivo, ou **não encontrada** — que não é
erro, é uma corretora que o cadastro ainda não conhece.

---

## Achar um caso que a fila não mostra mais

O Dashboard mostra os últimos 30 dias, de propósito. Quando o cliente liga
citando um protocolo de abril, é aqui que se procura.

![A busca](Evolucao/imagens/tela-buscar-caso.png)

A tela existe sobre uma regra: **ler a coluna antes de ler as linhas**. Uma
base de 200 mil linhas por 39 colunas são 7,8 milhões de células — ler tudo
estoura o tempo do Apps Script. Lemos só as **colunas de busca** que a mesa
declarou, anotamos em quais linhas o termo aparece, e só então lemos inteiras
as poucas que casaram.

A comparação **ignora máscara nos dois sentidos**: `123.456.789-01` acha
`12345678901` e vice-versa. E quando há uma **planilha legada** apontada, ela
entra como uma origem a mais — lida como está, em leitura, sem prometer
edição do que não é caso do sistema.

---

## Configurações, a tela que muda todas as outras

Três colunas: os **assuntos** à esquerda, os **itens** no meio, as
**propriedades** do que foi escolhido à direita. Nada é gravado sem apertar
Salvar.

![A tela de Configurações](Evolucao/imagens/tela-configuracoes.png)

Cada ação carrega a guarda que o estrago dela pede:

| O que se mexe | Guarda | Exemplo |
|---|---|---|
| **Conteúdo** | permissão `configurar` | renomear uma situação, cadastrar pessoa |
| **Regra** | permissão `configurar` | o que um nível pode, quem vê qual campo |
| **Estrutura** | **+ senha de administrador** | criar coluna na planilha |

E as três coisas que o sistema **recusa fazer**, por mais permissão que se
tenha: trocar o cabeçalho de um campo (é o nome da coluna, e o Power BI aponta
para ele), renomear um item de lista que já está gravado em casos, e tirar
Configurações do último nível que ainda a tem — ninguém se tranca do lado de
fora.

Os **cards do Dashboard** são configuráveis um a um: nome, o que cada um
conta, cor, ordem e mostrar ou ocultar. Até 12 por operação. Remover um card
não toca em caso nenhum — o card é uma forma de contar, e apagar a conta não
apaga o que foi contado.

![Os cards do Dashboard](Evolucao/imagens/tela-configuracoes-paineis.png)

**Configurações permite ajustar tudo?** Quase — e a lista completa, com o que
ainda falta e por quê, está em
[`06-o-que-e-configuravel.md`](Evolucao/06-o-que-e-configuravel.md).

---

## As regras que sustentam o produto

Não são preferências de estilo. Cada uma existe porque a alternativa já causou
prejuízo — a lista completa, com sintoma e causa, está em
[`04-bugs-capturados.md`](Evolucao/04-bugs-capturados.md).

| Regra | Por quê |
|---|---|
| A coluna é encontrada pelo **nome do cabeçalho**, nunca pela posição | Reordenar coluna na planilha não pode quebrar o sistema |
| **Identificador é texto**, formatado na linha antes da gravação | O Planilhas converte `00000010` em `10` e `000000E1` em `0` |
| **Dinheiro é número** com formato de moeda | O `R$` é formato da célula, não conteúdo. O Power BI soma direto |
| **Máscara é aparência**: a planilha recebe só dígitos | Cruzamento com outros sistemas sem tratamento |
| Um caso = **uma linha**, sempre | Campo novo vira coluna nova, não linha em tabela de valores |
| Permissão vem do **nível de acesso**, nunca do cargo | O nome do cargo é livre e muda |
| Excluir **some da tela, nunca da planilha** | Exclusão é lógica (`_Visivel`), e reversível na mão |
| **Erro alto** em vez de padrão silencioso | Dado errado calado é pior que operação parada |
| A estrutura da planilha **nunca muda sozinha** | Só o instalador cria estrutura, e só sobre planilha vazia |
| Esconder botão **não é segurança** | Toda função sensível revalida no servidor |

---

## Estado atual

**5 de 12 etapas construídas.** O detalhe de cada uma está em
[`05-progresso.md`](Evolucao/05-progresso.md).

| ✅ | Fundação · Acesso · Casca · Cadastrar Caso · Dashboard |
|---|---|
| 🔨 | Configurações |
| ⏳ | Buscar Caso · Painel Analítico · Minha Performance · Tabela de Corretoras · Abas de análise · Diagnóstico |

---

<sub>Pelitero Labs · PGO — Prisma Gestão Operacional</sub>
