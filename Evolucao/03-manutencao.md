# Manutenção

Para quem vai mexer neste sistema depois — inclusive você mesmo daqui a seis
meses, que não vai lembrar de nada.

Leia antes: [`01-arquitetura.md`](01-arquitetura.md) explica **por que** o
sistema é assim. Este arquivo explica **como** mexer nele sem quebrar.

---

## 1. Definição de pronto

Uma etapa só está concluída quando as três coisas valem ao mesmo tempo:

1. **Funciona.** Não é código escrito — é tela que abre, botão que responde e
   dado que chega na célula certa. Conferido rodando, não lendo.
2. **A suíte passa**, cinco execuções seguidas.
3. **Está no GitHub.** Commitada e enviada, com a documentação da pasta
   `Evolucao/` atualizada junto.

Etapa que fica só na máquina de alguém não existe. Etapa que passa no teste
mas nunca foi aberta no navegador também não.

---

## 2. A regra de ouro

**Rode a suíte antes e depois de qualquer mudança.**

```bash
node Evolucao/Testes/rodar.js
```

Cinco execuções seguidas sem falha. Rodar uma vez não detecta teste instável —
isso já aconteceu no sistema anterior, com uma comparação de carimbo de tempo
que falhava quando duas gravações caíam no mesmo milissegundo.

Se a suíte reprovar depois da sua mudança, **a suíte está certa até você provar
o contrário.** Cada teste ali nasceu de um problema real.

---

## 3. As tarefas que aparecem toda semana

> **Como rodar uma função no editor.** As funções sem `_` no fim —
> `atualizarPGO`, `diagnosticoRECC`, `verificarEstruturaRECC`,
> `normalizarBase` — aparecem na lista do editor: escolha e clique em
> *Executar*; o resultado sai no registro de execução. As que terminam com `_`
> são internas, não aparecem na lista e algumas pedem parâmetro. Para rodar uma
> delas, crie uma função de uma linha, execute e apague em seguida:
>
> ```javascript
> function rodarUmaVez() { adicionarColuna_('BASE_MESA', 'Nome da coluna', 'texto'); }
> ```

### Preciso de uma coluna nova numa base

**Pela tela, sempre que der:** Configurações › Cadastrar Caso › novo campo. Pede
a senha de administrador, cria a coluna no fim da aba e o campo no formulário.

Não edite o cabeçalho na planilha à mão. Se a coluna não for um campo do
formulário, pelo editor:

```javascript
adicionarColuna_('BASE_MESA', 'Nome da coluna', 'texto');
```

Os tipos válidos estão em `RECC_TIPO_DE_DADO`, no `Back-End/Base.gs`.
A função cria a coluna no **fim** da aba, aplica o formato de célula certo e
registra o tipo em `CAMPOS`. Sem esse registro, na próxima execução a coluna
voltaria a ser lida como texto — e uma coluna de moeda guardaria
`"R$ 2.500,00"` em vez de `2500`.

### Alguém digitou linhas direto na planilha

Linha digitada à mão nasce sem Id. Sem Id o sistema não consegue editá-la.
No editor, execute **`normalizarBase`**: ela dá Id a quem está sem, em todas as
abas, realinha as sequências e não toca em mais nada da linha.

### Duas linhas com o mesmo Id

O diagnóstico e a edição do caso avisam. Qual das duas é a cópia é decisão de
gente: apague o Id da linha que é a cópia, na planilha, e execute
`normalizarBase` — ela dá um Id novo a quem ficou sem.

### Um cabeçalho mudou de nome na planilha

Execute **`verificarEstruturaRECC`**. Só lê: mostra o que sumiu e o que
apareceu, sem consertar nada. O conserto é decisão de gente: ou renomeia de
volta na planilha, ou ajusta o contrato no `Back-End/Base.gs`.

### Quero um campo que só aparece com certos valores de outro

Pela tela: Configurações › Cadastrar Caso › o campo › **Quando este campo
aparece**. Guarda `{ "mostrarSe": { "campo": "status", "valores": ["Retido"] } }`
na coluna `Configuracao` da aba `CAMPOS` — e a forma antiga, de um valor só
(`"valor"`), continua sendo lida. A regra vale no servidor também (ver
`condicaoDoCampo_` e `condicaoBate_`, no `Casos.gs`).

### O prazo de um status só deve parar com uma condição

É o caso do Retido na RET. Em Configurações › Sinalizadores, a **condição de
parada**: o status, a coluna, os valores e a coluna da data. Essa coluna é do
sistema — ele a carimba quando a condição passa a valer
(`carimbarAParadaDoPrazo_`, no `Casos.gs`) — e precisa existir na base como data e
hora (`Data do status proposta`, na RET; `atualizarPGO()` a cria).

### O prazo deve começar só quando o caso muda de status

É o caso da RET. O sinalizador conta de **`Data da primeira mudança de status`**
(Configurações › Sinalizadores › de onde conta). O sistema a carimba na primeira
vez que o caso sai do status em que nasce — o valor padrão do campo Status
(`carimbarAPrimeiraMudancaDeStatus_`, no `Casos.gs`). Sem ela e ainda no status
de nascimento, o selo mostra o prazo cheio (`prazoQueNaoComecou_`, no
`Indicadores.gs`). Outro canal que queira o mesmo precisa da coluna na base
(data e hora, do sistema) e de apontar o sinalizador para ela.

### A planilha do chat mudou de colunas

Configurações › Estrutura › **Planilha dos atendimentos do chat**: troque o nome da
coluna e use **Conferir a planilha** — ela mostra as últimas linhas já traduzidas.
Quando a planilha não abre ou perde uma coluna, a Produtividade da Mesa continua
com os números do sistema e escreve o motivo em cima. Para o chat passar a trazer
mais uma informação (hoje: data, analista, SUSEP, corretora, assunto, consultor e
vida individual/grupo), acrescente o item em `RECC_COLUNAS_DO_CHAT` e um campo em
`atendimentosDaMesa_` (`Indicadores.gs`), e um gráfico em `graficoDeAtendidos_`. A
tela não muda: ela desenha o que o servidor manda.

### Tirei um registro de cadastro e quero de volta

Nos cadastros (usuários, corretoras, SUSEPs, itens de configuração), tirar
pela tela **oculta**: some do sistema e continua na planilha, com `_Visivel`
= `NAO`, e `_ExcluidoEm` e `_ExcluidoPor` dizem quando e quem. Para trazer de
volta, troque `_Visivel` para `SIM` na célula.

O **caso** é diferente: a pedido da operação, excluir apaga a linha de vez, e o
que estava gravado fica na aba `AUDITORIA`.

### Quero ver as telas sem publicar no Apps Script

```bash
node Evolucao/Testes/gerar-previa.js
```

Escreve `previa/sistema.html` e `previa/sem-acesso.html`, que abrem em
qualquer navegador. São montados pelo **mesmo código do servidor** — só a ponte
com o Google é substituída.

---

## 4. Onde mexer, por tipo de mudança

São **19 arquivos**, agrupados por assunto: 7 do servidor e 12 de tela. Se
você não souber em qual está o que procura, o agrupamento está errado — não
você. Abra uma questão.

| Quero mudar | Mexo em |
|---|---|
| Uma coluna, um tipo de dado, uma aba | `Back-End/Base.gs` |
| Como o sistema lê ou grava na planilha | `Back-End/Base.gs` |
| A regra do Id | `Back-End/Base.gs` |
| O que cada nível de acesso pode | `Back-End/Entrada.gs` |
| Quem pode entrar | `Back-End/Entrada.gs` |
| O que a tela recebe ao abrir (o `doGet`) | `Back-End/Entrada.gs` |
| As perguntas do formulário, a validação | `Back-End/Casos.gs` |
| Gravar, editar ou excluir um caso | `Back-End/Casos.gs` |
| Como a busca procura | `Back-End/Casos.gs` |
| Os cartões do Trabalho e a fila | `Back-End/Indicadores.gs` |
| As contas dos gráficos | `Back-End/Indicadores.gs` |
| Os números de uma pessoa, a meta, o ranking | `Back-End/Indicadores.gs` |
| Corretoras, produtos, SUSEPs bloqueadas | `Back-End/Cadastros.gs` |
| A importação em lote | `Back-End/Cadastros.gs` |
| Uma seção da tela de Configurações | `Back-End/Config.gs` |
| O gerador das abas `ANALISE_*` | `Back-End/Config.gs` |
| O que o instalador cria numa planilha nova | `Back-End/Instalacao.gs` |
| O que o diagnóstico confere | `Back-End/Instalacao.gs` |
| A aparência, as cores, os temas | `Front-End/Estilos.html` |
| O menu, a barra superior, o formulário, os gráficos | `Front-End/Comuns.html` |
| A ponte com o servidor e a navegação | `Front-End/Aplicacao.html` |
| Uma tela do menu | `Front-End/<NomeDaTela>.html` |
| Nome, logo, cor, nomes das telas | **Configurações › Identidade** (guardado na aba `CONFIG`) — não o código |

A última linha é a mais importante. Boa parte do que parece código é
configuração: nome do sistema, logo, cor, títulos do menu, status, motivos,
cargos, níveis, canais, campos do formulário e sinalizadores de prazo vivem na
planilha, e se ajustam pela tela de Configurações.

---

## 5. Publicar no Apps Script

O projeto do Apps Script **não tem pastas**. As pastas aqui são organização do
repositório.

| Aqui | No editor do Apps Script |
|---|---|
| `Back-End/Entrada.gs` | `Entrada.gs` |
| `Front-End/Index.html` | `Index.html` |
| `Evolucao/` | **não vai** — roda no seu computador |

A ordem da cópia não importa: o Apps Script avalia os `.gs` em ordem
alfabética, e **nenhum arquivo tem código de topo que dependa de outro**. Essa
regra não é estilo — no sistema anterior, uma constante de topo lida antes da
hora derrubava a carga do projeto inteiro com um erro que aparecia longe da
causa.

Depois de publicar, rode `verificarEstruturaRECC()` no editor. Nenhum teste
rodado fora do Apps Script pega um arquivo que ficou para trás na cópia.

### Vai rodar no Apps Script? A conferência em quatro camadas

A suíte roda em **Node**, e o sistema roda no **Google**. São dois ambientes
diferentes, e um teste verde aqui não é, sozinho, promessa de que roda lá. As
quatro camadas abaixo existem para fechar essa distância, cada uma pegando o
que a anterior não pega.

| Camada | Comando | O que só ela pega |
|---|---|---|
| **1. A suíte** | `node Evolucao/Testes/rodar.js` | Regra de negócio, conversão de tipo, permissão. E erro de sintaxe em qualquer `.gs`: o simulador avalia os sete para poder rodar, então um arquivo quebrado derruba tudo na primeira linha |
| **2. Os dois mundos** | (dentro da suíte, bloco *O projeto do Apps Script*) | `.gs` usando `document`; `.html` chamando `SpreadsheetApp`; `require` em qualquer um dos dois; `<script>` sem fechar; nome de arquivo que colide ignorando a extensão |
| **3. O navegador** | `conferir-responsividade.js`, `clicar-em-tudo.js`, `ponta-a-ponta.js`, `clicar-com-base-suja.js` | O que só aparece com a tela montada: botão cortado, **um elemento por cima do outro**, classe de CSS que não existe, clique que estoura, `undefined` escrito na tela, código guardado na base que rodaria na tela |
| **3½. A varredura geral** | `varredura-geral.js` (e a parte do dia a dia, dentro da suíte) | O que nenhum pedido testou: cada função pública com o inesperado, por cada nível e por quem não tem cadastro; as chamadas reais da tela com um campo estragado; o tamanho das respostas com 5.000 casos. Rode depois de mudar o que a tela manda — e regrave `chamadas-gravadas.json` (ver o cabeçalho da ferramenta) |
| **4. Lá dentro** | `diagnosticoRECC()` no editor | O que depende da INSTALAÇÃO: arquivo que ficou para trás na cópia, aba apagada, coluna fora do contrato, fuso horário do projeto, sequência de Id corrompida |

**As três primeiras rodam aqui e não provam a quarta.** É por isso que a
quarta existe, e é por isso que ela mora dentro do sistema em vez de na suíte
— ver o achado 25.

#### O que é proibido em cada lado, e por quê

O `.gs` roda no servidor do Google; o `.html` roda no navegador de quem usa.
Eles não compartilham nada além do que passa pela ponte `google.script.run`.

| Não pode aparecer em `.gs` | Não pode aparecer em `.html` | Não pode em nenhum dos dois |
|---|---|---|
| `document`, `window`, `navigator` | `SpreadsheetApp`, `DriveApp` | `require(`, `module.exports` |
| `localStorage`, `sessionStorage` | `PropertiesService`, `LockService` | `process.env`, `__dirname` |
| `alert(`, `fetch(`, `XMLHttpRequest` | `Session.`, `HtmlService`, `ScriptApp` | `import`, `export` |
| `google.script.run` | `MailApp`, `UrlFetchApp` | |

Um `document` num `.gs` é `ReferenceError` na primeira execução, e o recado que
chega à tela é "erro no servidor", sem dizer qual. Um `SpreadsheetApp` num
`.html` é `undefined`: a tela trava sem log nenhum, porque o erro acontece
antes de qualquer tratamento — é o achado 27.

A guarda procura **palavra inteira**, e não pedaço de texto. A primeira versão
procurava a substring `document` e reprovou três arquivos por causa da palavra
portuguesa **"documento"**, que é um tipo de campo do sistema. Guarda que
reprova o código certo ensina a ignorar o vermelho, e aí ela não serve mais
para nada. Há um teste que confere as duas pontas: que a lista dispara num
trecho fabricado com `document` e `SpreadsheetApp` dentro, e que ela NÃO
dispara num trecho escrito em português.

#### Coisas do Apps Script que a suíte não vê, e que valem lembrar

- **Sem pastas, e nome único ignorando a extensão.** `Configuracoes.html` e
  `Configuracoes.gs` não convivem — foi o achado 26, e por isso o arquivo do
  servidor se chama `Config.gs`.
- **Os `.gs` compartilham UM escopo global.** Duas funções com o mesmo nome em
  arquivos diferentes: vence a do arquivo avaliado por último, sem aviso. E a
  ordem é a dos arquivos **no projeto**, não a alfabética — na Parte 4 os
  sete arquivos foram carregados nas 5.040 ordens possíveis, sem erro.
- **Toda função sem "_" no fim pode ser chamada pelo navegador**, por quem
  estiver com o sistema aberto — o `google.script.run` não sabe quais funções
  a tela usa. Função feita só para o editor confere a porta:
  `exigirPortaDoEditor_()` (achado 68).
- **Motor V8.** O servidor usa recursos que o motor antigo não tem. Projeto
  novo já nasce em V8; confira em *Configurações do projeto*.
- **Cada `google.script.run` é uma EXECUÇÃO NOVA.** Nada sobrevive entre uma
  chamada e outra além do que está na planilha ou no PropertiesService. É isso
  que torna seguro o memo por execução do `Base.gs`.
- **Seis minutos por execução.** O custo é a IDA ao serviço (~25 ms cada), e
  não a conta em JavaScript — o relógio do Node não paga esse pedágio e por
  isso não enxerga o problema. Ver os achados 28 e 29.
- **Scriptlet roda até dentro de comentário de HTML.**
- **A chave de uma tela só se troca com o sistema fora do ar.** O título é
  configurável justamente para não precisar mexer na chave; trocar a chave
  apaga rota guardada e nível de acesso de uma vez.

---

## 6. As armadilhas que já custaram caro

Não repita nenhuma delas. A lista completa, com sintoma e causa, está em
[`04-bugs-capturados.md`](04-bugs-capturados.md).

1. **Gravar identificador sem formatar a célula como texto antes.**
   O Sheets converte: `00000010` vira `10`, `000000E1` vira `0`.
2. **Deduzir coluna pela posição.** Só pelo nome do cabeçalho.
3. **Escrever cor à mão num componente do CSS.** Ela sobrevive à troca de tema.
4. **Decidir permissão pelo nome do cargo.** Permissão vem do nível, sempre.
5. **Deixar uma falha virar lista de permissões vazia.** Menu vazio é lido como
   "não tenho acesso", e manda a pessoa procurar no lugar errado.
6. **Escrever a sintaxe de scriptlet dentro de comentário de HTML.** O Apps
   Script executa scriptlet até em comentário.
7. **Código de topo num `.gs` que dependa de outro arquivo.**
8. **Usar `document` num `.gs`, ou `SpreadsheetApp` num `.html`.** São dois
   ambientes, e o erro só aparece em produção. A guarda da camada 2 pega.
9. **Usar CSS que só existe em navegador recente** — `:has()`, por exemplo.
   Regra que o navegador não entende ele ignora CALADO: fica desalinhado em
   algumas máquinas e certo nas outras, e o defeito só chega por relato. (O
   achado 69 tirou os `:has()` que tinham entrado. As cores usam
   `color-mix()`, de 2023: o navegador mínimo é **Chrome ou Edge 111**, o que
   o navegador corporativo atualizado já é.)
10. **Ler um registro pelo nome que está em CAMPOS ou em CANAIS.** O registro
    tem as chaves como estão no cabeçalho da planilha; CAMPOS pode ter outra
    grafia ("descrição" × "Descrição"). Ache a posição com `posicaoDaColuna_`
    e leia `registro[estrutura.cabecalhos[posicao]]` — ou use
    `valorPelaGrafiaDaAba_` / `grafiaDaColuna_`. O canal que vem de
    `canalPeloId_` já chega com as colunas na grafia da planilha; quem percorre
    vários canais por `canaisVisiveis_` chama `comAGrafiaDaAba_(canal)` antes
    de ler. O achado 88 apagava a descrição assim.
11. **Gravar `new Date()` numa coluna que o sistema não sabe que é de data.**
    Coluna sua é texto para o sistema, e o `Date` vira "Wed Oct 14 2026 …". Todo
    carimbo passa por `carimboParaAColuna_`, que decide pela coluna (achado 93).
12. **Aplicar a regra do tipo do campo à SUSEP.** O tipo é editável; a SUSEP tem
    letra. Quem confere ou grava a SUSEP pergunta `ehASusep_` antes (achado 90).
13. **Mandar para a tela o que ela não vai mostrar.** Toda resposta do
    `google.script.run` atravessa como JSON, e o tamanho custa tempo: a fila do
    Trabalho com 5.000 casos (6 MB) estourava os 40 segundos (achado 95). Mande o
    que a tela mostra agora, compacto, e deixe o resto sob pedido.
14. **Ler `dados.x` sem conferir que `dados` chegou.** Página antiga guardada no
    navegador manda o que a versão dela mandava. Toda função que grava um
    formulário começa por `dados = dadosDaTela_(dados)`, depois da permissão; lista
    que vem da tela passa por `listaDaTela_` (achado 96). A varredura geral cobra.

---

## 7. Nunca commite

CPF, nome de cliente, protocolo real, e-mail corporativo, Id de planilha,
senha, token, URL privada ou caminho de máquina local.

Os dados dos testes e da prévia são **inventados** — mantenha assim.
