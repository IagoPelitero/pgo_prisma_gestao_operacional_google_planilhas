# RECC — Arquitetura do sistema (documento de desenho)

> **Estado: Etapas 1 a 3 construídas e testadas. Etapas 4 a 12 em desenho.**
> Este documento existe para fechar o modelo de dados no Google Planilhas e o
> funcionamento do Apps Script **antes** da implementação. Ele é o contrato:
> o que estiver aqui é o que será construído.
>
> Sistema novo, do zero. O PGO 5.x **não** é base, não é referência de código e
> não será migrado. A única coisa herdada dele são as armadilhas já pagas caro
> (seção 11).

---

## 1. O que é

**PGO** é a plataforma — pensada para servir a diferentes operações de
atendimento. **RECC — Relacionamento Estratégico de Clientes e Corretores** é a
operação que está sendo montada agora, em Porto Seguro, sobre Google Planilhas +
Google Apps Script.

O nome que aparece na barra superior é **RECC**, e é **editável**: mora em
`CONFIG`, junto com subtítulo, logo e cor primária. Usar a mesma plataforma em
outra operação é trocar essas linhas, não é mexer em código.

| Chave em `CONFIG` | Valor inicial |
|---|---|
| `IDENTIDADE.NOME` | `RECC` |
| `IDENTIDADE.NOME_LONGO` | `Relacionamento Estratégico de Clientes e Corretores` |
| `IDENTIDADE.OPERACAO` | `Porto Seguro` |
| `IDENTIDADE.LOGO_URL` | (definido em Configurações) |
| `IDENTIDADE.COR_PRIMARIA` | azul Porto Seguro |

O sistema atende **dois canais de trabalho** hoje, e precisa aceitar uma terceira
sem tocar em código:

| Canal | Base | O que é |
|---|---|---|
| **RET Vida** | `BASE_RET` | Retenção — relacionamento estratégico de clientes |
| **Mesa Diamante** | `BASE_MESA` | Atendimento a casos prioritários |

### Telas (menu lateral, presente em todas as abas)

`Dashboard` · `Cadastrar Caso` · `Minha Performance` · `Buscar Caso` ·
`Tabela de Corretoras` · `Painel Analítico` · `Configurações`

### Barra superior (presente em todas as abas)

Título + subtítulo da tela · Busca global (`Ctrl + K`) · Seletor de período ·
Seletor de tema (4 bolinhas) · Identificação do usuário (nome + cargo).

### Temas

Quatro paletas, trocáveis a qualquer momento, memorizadas por usuário:
**Padrão** (azul Porto Seguro) · **Rosa** · **Dark** · **Brasil**.

---

## 2. As seis decisões que sustentam o sistema

Estas decisões vêm antes de qualquer tela. Mudar qualquer uma delas depois
significa reescrever o sistema.

### Decisão 1 — A coluna é encontrada pelo NOME do cabeçalho, nunca pela posição

O sistema lê a **linha 1** de cada aba, normaliza (sem acento, sem caixa, sem
espaço extra) e monta o mapa `cabeçalho → índice da coluna`.

Consequência prática, que é o pedido central: **você pode reordenar colunas,
inserir uma coluna no meio ou renomear uma aba direto na planilha, e o sistema
continua funcionando.** Nada quebra por causa de posição.

> No PGO antigo a validação era posição a posição e a estrutura era imutável —
> qualquer mexida na planilha derrubava a operação. É a diferença mais
> importante entre os dois sistemas.

**O que acontece quando um cabeçalho é renomeado:** o sistema não adivinha. Ele
detecta "sumiu a coluna X, apareceu a coluna Y" e abre uma tela de reconciliação
em Configurações: *"A coluna `SUSEP` virou `Cod SUSEP`?"* — um clique resolve.
Adivinhar seria pior do que perguntar.

### Decisão 2 — Campo novo do formulário vira COLUNA NOVA na base, não linha

O sistema anterior guardava campo dinâmico como linha numa tabela de valores
(um atendimento com 15 campos gerava 16 linhas). Isso quebra o objetivo de
integração: o Power BI recebe um emaranhado, não uma tabela.

**Aqui: um caso = uma linha. Sempre.** Campo novo criado em Configurações vira
uma coluna nova no fim da aba do canal.

| Ação em Configurações | O que acontece na planilha |
|---|---|
| Criar campo | Coluna nova **no fim** da aba, com cabeçalho e formato corretos |
| Desativar campo | **Nada.** A coluna e os dados permanecem; some só da tela |
| Excluir campo | **Nada é apagado.** Marca como excluído; a coluna fica na planilha |
| Reordenar campos | Muda a ordem **na tela**; a planilha não é mexida |

Criar ou remover coluna é **ação explícita**, exige senha de ADM, e **nunca**
acontece durante um salvamento comum.

### Decisão 3 — Colunas obrigatórias são protegidas; o resto é livre

Os 20 cabeçalhos de `BASE_MESA` e os 35 de `BASE_RET` são marcados
`Protegido = SIM`. O sistema **não deixa** a interface renomeá-los nem
excluí-los — no máximo escondê-los da tela. Colunas criadas depois são livres.

### Decisão 4 — Identificador é TEXTO. Medida é NÚMERO. Data é DATA.

Esta é a regra que impede corrupção silenciosa de dado.

| Natureza | Exemplo | Na planilha | Por quê |
|---|---|---|---|
| **Identificador** | ID, CPF, SUSEP, protocolo, apólice, proposta | **Texto**, só dígitos | `0000000000` num campo numérico vira `0`. `000000E1` vira `0` (notação científica) |
| **Medida** | tentativas de contato, contagens | **Número** nativo | Power BI soma direto, sem conversão |
| **Dinheiro** | valor do prêmio, prêmio retido, prêmio mensal | **Número** nativo + formato `R$ #,##0.00` | O valor gravado é número puro; o `R$` é formato da célula, não texto |
| **Data** | data de entrada, data de finalização | **Data** nativa | Power BI reconhece; filtro por período funciona |
| **Hora** | horário, hora resposta | **Hora** nativa | |
| **Texto / seleção** | analista, status, canal, motivo | **Texto** | |

**A coluna é formatada como texto (`@`) na linha, imediatamente antes de
gravar.** Formatar depois não desfaz a conversão. Formatar só na criação da aba
não cobre linha nova. É na linha, antes do `setValues`.

**Dinheiro é a exceção que confirma a regra.** As colunas de valor recebem o
formato de moeda `"R$ "#,##0.00` — que o Planilhas renderiza como `R$ 1.234,56`
e o Power BI lê como `1234.56`. Funciona porque **formato não é conteúdo**: a
célula guarda o número `1234.56` e o `R$`, o ponto de milhar e a vírgula
decimal são só a maneira de mostrar. Ninguém precisa limpar nada na integração,
e o operador vê o valor com cara de dinheiro.

> É o oposto do que acontece com CPF. Lá o formato **não** salva: o valor
> gravado seria `12345678` e o zero à esquerda já se perdeu antes de qualquer
> formatação. Por isso identificador é texto e dinheiro é número — a diferença
> não é gosto, é onde o dado se perde.

### Decisão 5 — Máscara é aparência; a planilha recebe só dígitos

O que o usuário digita e o que vai para a planilha são coisas diferentes.

| Campo | Na tela | Na planilha |
|---|---|---|
| CPF | `000.000.000-00` | `00012345678` |
| Protocolo | `0-0000000000` | `01234567890` |
| Apólice / SUSEP | máscara configurável | só dígitos |

A máscara fica em `CAMPOS`, é editável em Configurações e é aplicada nos dois
sentidos: **exibe** com máscara, **grava** sem. Sem traço, ponto ou vírgula —
como pedido, para o Power BI cruzar sem tratamento.

> Atenção ao que "sem pontuação" **não** significa: não significa virar número.
> `00012345678` como número é `12345678` — CPF diferente, cruzamento quebrado.
> Dígitos **em texto** é o que atende os dois lados.

### Decisão 6 — Excluir some da tela, nunca da planilha

Toda aba de dados ganha colunas de controle no fim, prefixadas com `_`:

| Coluna | Valores | Para quê |
|---|---|---|
| `_Visivel` | `SIM` / `NAO` | `NAO` = some do sistema, permanece na planilha |
| `_ExcluidoEm` | data/hora | Quando saiu |
| `_ExcluidoPor` | ID do usuário | Quem tirou |
| `_Origem` | `SISTEMA` / `PLANILHA` | Se a linha nasceu na tela ou digitada direto |

O `_Visivel` é editável **na mão, direto na planilha** — é assim que uma linha
volta a aparecer. O prefixo `_` marca coluna de sistema e sinaliza ao Power BI
o que ignorar.

> **A EXCEÇÃO: o CASO é apagado de verdade.**
>
> Esta decisão vale para corretora, produto, SUSEP bloqueada e usuário. Para o
> **caso**, o PO decidiu o contrário: *"o caso deve ser excluído
> definitivamente da planilha"*. A linha sai, e não há como trazer de volta.
>
> A razão é de operação: caso oculto continua ocupando linha, e a base da RET
> caminha para 200 mil — onde cada linha conta contra o teto de 10 milhões de
> células.
>
> Duas coisas compensam a falta de desfazer:
>
> 1. **A auditoria guarda o conteúdo da linha antes de apagar** — quem, quando,
>    e o que havia no caso. Sem isso, um caso apagado por engano não deixaria
>    nem rastro de que existiu, e alguém iria jurar que cadastrou.
> 2. **A pergunta na tela diz a verdade**: "A LINHA SAI DA PLANILHA. Não dá
>    para desfazer, nem por um administrador." Prometer desfazer quando não dá
>    é pior que não avisar — a pessoa confirma tranquila e descobre depois.
>
> E **qualquer pessoa cadastrada exclui, em qualquer canal**, também por
> decisão do PO. É o único ponto do sistema sem trava de nível nem de escopo,
> e está escrito assim de propósito em `excluirCaso` — para ninguém
> "consertar" achando que foi esquecimento.

---

## 3. O modelo no Google Planilhas

**Uma planilha, 13 abas fixas** + as abas de análise que o próprio sistema gera.
Nenhuma aba de dados nasce preenchida: os dados entram quando a operação
começar.

### 3.1 Bases operacionais

#### `BASE_RET` — Retenção Vida (35 colunas + controle)

```
id | data de recepção do protocolo | analista | SUSEP | segmento |
Código origem da proposta | número da proposta | nome do cliente |
cod produto | produto | grupo | sistema | valor do prêmio |
valor do prêmio retido | prêmio mensal retido | agente da central | canal |
relacionamento | contato | protocolo | cod_sucursal | cod_ramo |
Num_apolice | CPF | status | Forma de pagamento | dados do pagamento |
descrição | telefones de contato | e-mail | Novo cod origem proposta |
novo numero da proposta | motivo do cancelamento | data da transmissão |
tentativas de contato
```

- `analista` grava **o nome**, não o ID — conforme pedido.
- Identificadores em texto: `id`, `SUSEP`, `Código origem da proposta`,
  `número da proposta`, `cod produto`, `protocolo`, `cod_sucursal`, `cod_ramo`,
  `Num_apolice`, `CPF`, `Novo cod origem proposta`, `novo numero da proposta`.
- Dinheiro em número com formato `R$ #,##0.00`: `valor do prêmio`,
  `valor do prêmio retido`, `prêmio mensal retido`.
- Medida em número puro: `tentativas de contato`.

#### `BASE_MESA` — Mesa Diamante (20 colunas + controle)

```
ID | Analista | Status | Canal | Data de entrada | Horário | Tipo |
Abertura indevida | Título do e-mail | Nome do segurado | Documento (CPF) |
Corretora | SUSEP | Ramo | Assunto | Área responsável | Data resposta |
Hora resposta | Data da finalização | horário da finalização
```

**Indicador "finalizado na célula"** (pedido explícito): não é coluna gravada, é
métrica calculada — `Data da finalização` preenchida **E** `Área responsável`
vazia. Vira card no Dashboard da Mesa Diamante. Calcular em vez de gravar evita o campo
mentir quando alguém edita a área responsável direto na planilha.

**`Abertura indevida`**: `SIM` / `NAO`, também vira indicador.

### 3.2 Cadastros

| Aba | Colunas |
|---|---|
| `USUARIOS` | `Id` · `Nome` · `Email` · `Canal que atende` · `CargoId` · `NivelAcessoId` · `Ativo` · `Matricula` · `DataCadastro` · `UltimoAcesso` |
| `CORRETORAS` | `Id` · `Nome` · `Canal` · `SUSEP` · `Corretora` · `Segmento` |
| `PRODUTOS` | `Id` · `Produto` · `CodigoProduto` |
| `SUSEP_BLOQUEADAS` | `Id` · `SUSEP` · `NomeCorretora` · `CpfReincidente` · `Motivo` · `BloqueadaEm` |

**Código e descrição nunca dividem a mesma célula.** `PRODUTOS` tem `Produto` e
`CodigoProduto` em colunas separadas, e o mesmo vale para proposta, sucursal,
ramo e apólice — é por isso que `CATALOGO` ganhou a coluna `Codigo`: qualquer
item de catálogo carrega o código ao lado do nome, e o Power BI cruza pelo
código sem depender do texto, que muda.

**`USUARIOS` precisou crescer** além de `id · nome · canal que atende`: o acesso
é pelo e-mail autenticado do Google conferido contra esta aba, e o nível de
acesso decide o que a pessoa pode fazer. Sem `Email`, `NivelAcessoId` e `Ativo`
não existe login nem permissão. As três colunas são obrigatórias.

**`CORRETORAS`** responde a pergunta do segmento no formulário e no dashboard:
`Diamante` · `Demais corretoras` · `Não encontrado` (quando a SUSEP não está na
aba). "Não encontrado" é resposta legítima, diferente de vazio.

**`SUSEP_BLOQUEADAS`** alimenta o selo `SUSEP OK` / `SUSEP BLOQUEADA` exibido no
formulário (no momento em que a SUSEP é digitada) e no dashboard.

### 3.3 Sistema

| Aba | Colunas | Para quê |
|---|---|---|
| `CANAIS` | `Id` · `Nome` · `Descricao` · `Aba` · `Icone` · `Ordem` · `Ativo` | Registro dos canais. Canal nova = linha nova, sem código |
| `CAMPOS` | `Id` · `CanalId` · `Aba` · `ChaveTecnica` · `Cabecalho` · `Rotulo` · `Descricao` · `TipoCampo` · `Secao` · `Mascara` · `Obrigatorio` · `Protegido` · `Ativo` · `Ordem` · `VisivelPara` · `ValorPadrao` · `Configuracao` | O catálogo do formulário e o mapa coluna↔campo |
| `CATALOGO` | `Id` · `CanalId` · `Tipo` · `Codigo` · `Nome` · `Rotulo` · `PaiId` · `Cor` · `Ordem` · `Ativo` · `Configuracao` | Status, motivos, origens, tipos, ramos, áreas responsáveis, cargos, níveis de acesso, segmentos |
| `PAINEIS` | `Id` · `Tela` · `CanalId` · `Titulo` · `TipoComponente` · `CampoDimensao` · `CampoMedida` · `Agregacao` · `Limite` · `Filtro` · `Ordem` · `Largura` · `VisivelPara` · `Ativo` | Os cards e gráficos de cada tela, configuráveis |
| `CONFIG` | `Id` · `Chave` · `Valor` · `Descricao` · `AtualizadoPor` · `Data` | Parâmetros gerais (nome do sistema, janela de dias, metas…) |
| `AUDITORIA` | `Id` · `DataHora` · `UsuarioId` · `Acao` · `Entidade` · `RegistroId` · `Detalhe` | Trilha das ações relevantes. Sem dado pessoal |
| `ANALISES` | `Id` · `Nome` · `Descricao` · `CanalId` · `Colunas` · `Filtros` · `Dias` · `Ordem` · `Ativo` · `GeradaEm` · `GeradaPor` · `Linhas` | A **receita** de cada aba `ANALISE_*`. A aba gerada é outra coisa, e não está no contrato |

### 3.4 Abas de análise (geradas pelo sistema)

Pedido: *"permitir criar uma aba exclusiva que irá criar uma aba no planilhas
para análise de dados."*

Em Configurações › Análise, o ADM define: canal, colunas, filtros, período. O
sistema cria/atualiza uma aba chamada `ANALISE_<nome>` com os dados achatados,
prontos para tabela dinâmica ou Power BI.

- **Retrato** (padrão): valores gravados de uma vez, atualizados por botão ou por gatilho
  de horário. Estável, não pesa a planilha. Uma aba de `=FILTER(...)` seria
  "sempre atualizada", e recalcularia 30 mil linhas a cada abertura da
  planilha — com três dessas, a planilha inteira fica lenta o dia todo.
- Nunca sobrescreve uma aba que não tenha o prefixo `ANALISE_`. É a trava mais
  importante do arquivo: uma análise chamada "BASE_RET" apagaria a base, e
  nenhuma outra proteção pegaria, porque apagar seria exatamente o que o
  código se propôs a fazer.
- Recriar uma aba de análise existente exige senha de ADM. Criar pela primeira
  vez não pede: criar não destrói nada.
- A aba é **reaproveitada**, nunca apagada e recriada. Apagar mudaria o
  identificador interno dela, e todo Power BI apontado para aquela aba
  perderia o alvo em silêncio.
- Para atualizar sem clicar, aponte um acionador de tempo para
  `atualizarAnalisesAgendadas`. Ela é a única função do arquivo que não pede
  senha nem permissão — um gatilho de horário roda sem ninguém logado, e não
  haveria quem digitasse a senha.

### 3.5 Regras do ID

- **Decimal, progressivo, 10 casas, começando em `0000000000`.** Teto de
  10 bilhões de combinações.
- **Uma sequência por aba**, guardada em Script Properties (`SEQ_<ABA>`), nunca
  na planilha.
- **`LockService`** em volta de ler-incrementar-gravar. Sem trava, dois usuários
  salvando no mesmo segundo recebem o mesmo ID.
- **A sequência nunca anda para trás.** Ao reconciliar, vale
  `max(sequência guardada, maior ID da aba + 1)`. Foi assim que o sistema
  anterior reemitiu ID já em uso.
- **Linha digitada direto na planilha, sem ID:** um gatilho `onEdit` instalável
  carimba ID e origem. Para o que já entrou sem gatilho, existe a ação
  "Normalizar base" em Configurações.

---

## 4. Como o Apps Script funciona

### 4.1 Camadas

Os arquivos são **agrupados por assunto**, e cada um responde a uma pergunta.
São 19 no total: 7 do servidor, 12 de tela. O agrupamento é o que decide onde
mexer — se você não sabe em qual arquivo está o que procura, é porque o
agrupamento está errado, não porque você não conhece o sistema.

```
NAVEGADOR (uma página só, servida por HtmlService)

  Index.html ......... o esqueleto; manda incluir todos os outros
  Estilos.html ....... toda a aparência e as 4 paletas, em CSS custom properties
  Comuns.html ........ as peças que MAIS DE UMA tela usa:
                         Moldura ............. menu lateral e barra superior
                         SenhaDeAdministrador  o diálogo das ações sem desfazer
                         SeletorDeCanal ....... RET Vida ou Mesa Diamante
                         Formulario .......... o formulário montado por CAMPOS
                         CasoEmModal ......... o caso aberto por cima da fila
                         Graficos ............ os desenhos em SVG
  Aplicacao.html ..... a ponte com o servidor e o roteador entre telas

  Uma por item do menu (7):
    Dashboard · CadastrarCaso · MinhaPerformance · BuscarCaso
    TabelaCorretoras · PainelAnalitico · Configuracoes

  SemAcesso.html ..... servida sozinha, a quem não está cadastrado
        │
        │  google.script.run  (assíncrono, sem transação)
        ▼
APPS SCRIPT

  Base.gs ......... ►► COMO O SISTEMA FALA COM A PLANILHA ◄◄
                       o contrato das abas e o tipo de cada coluna
                       o Id decimal de 10 casas, com LockService
                       a porta única: vínculo por cabeçalho, leitura em
                       bloco, formato texto antes de gravar

  Entrada.gs ...... QUEM ENTRA E O QUE PODE
                       doGet e o pacote de partida
                       níveis, escopo, senha de administrador, auditoria
                       o cadastro de quem pode entrar

  Casos.gs ........ O CASO, DO FORMULÁRIO À BUSCA
                       o motor do formulário (a aba CAMPOS)
                       criar, editar, trocar situação, ocultar
                       busca na base própria e em planilha legada

  Indicadores.gs .. OS NÚMEROS
                       os cartões do dia e a fila (Dashboard)
                       os gráficos da operação (Painel Analítico)
                       a tela em que o analista se vê (Performance)

  Cadastros.gs .... QUEM TRAZ O CASO PARA DENTRO
                       corretoras, produtos, SUSEPs bloqueadas
                       colar / conferir / aplicar listas em lote

  Config.gs ....... O QUE SE AJUSTA SEM PROGRAMADOR
                       as nove seções da tela de Configurações
                       o gerador das abas ANALISE_*

  Instalacao.gs ... CRIAR E CONFERIR A INSTALAÇÃO
                       instalarRECC() — a única rotina que cria estrutura
                       diagnosticoRECC() — o laudo desta instalação

  ATENÇÃO AOS NOMES: no Apps Script não existe pasta. Todos os arquivos ficam
  num projeto só, e o nome é único INDEPENDENTE da extensão — por isso o
  servidor de Configurações se chama Config.gs: Configuracoes.html já ocupa
  esse nome.
        │
        ▼
GOOGLE PLANILHAS  (13 abas + ANALISE_*)
```

**`Base.gs` é o coração.** Nenhum outro arquivo chama `SpreadsheetApp`
diretamente. Toda leitura e gravação passa por ele — é o que garante, num lugar
só, o vínculo por cabeçalho e o formato texto antes da gravação.

**Por que `Indicadores.gs` junta três telas.** Dashboard, Painel Analítico e
Minha Performance contam os MESMOS casos e respondem perguntas diferentes.
Separá-los convida ao erro de mudar a regra de contagem num e esquecer dos
outros dois — e aí o cartão diz 12, o gráfico diz 9, e ninguém sabe qual está
certo. Juntos, a regra é uma só porque está à vista.

### 4.2 O que acontece ao abrir o sistema

1. `doGet` identifica o e-mail autenticado (`Session.getActiveUser`).
2. Procura o e-mail em `USUARIOS`, com `Ativo = SIM`.
3. **Não encontrou** → serve `SemAcesso.html`: tela cheia, logo Porto Seguro,
   mensagem de usuário não cadastrado e como pedir acesso. Nenhum dado é
   carregado.
4. **Encontrou** → serve a página e devolve, **numa única chamada**, o pacote de
   partida: usuário, permissões, canais, catálogo, campos, painéis e tema.
   Uma ida ao servidor, não sete.
5. `ensureEstrutura()` só **confere** as abas obrigatórias. Faltando algo, para
   com mensagem dizendo exatamente o que falta — não cria nada sozinho.

### 4.3 Desempenho: as regras que não se negocia

O Apps Script tem ~6 minutos por execução e cada chamada ao Sheets é rede.

| Regra | Por quê |
|---|---|
| Ler **um bloco** com `getValues()`, nunca célula a célula | 1 chamada de rede em vez de 5.000 |
| Gravar **um bloco** com `setValues()` | Idem |
| A fila de trabalho lê só a **janela recente** (30 dias, configurável) | Não se lê 200 mil linhas para mostrar 40 |
| A base **só acrescenta no fim**, nunca reordena | O recente é sempre o fim da aba — leitura barata |
| Catálogo guardado em memória (`CacheService`), renovado por versão | O catálogo muda uma vez por semana, é lido a cada clique |
| Totais guardados em memória, com chave formada por canal + filtros + período | Dez pessoas abrindo o mesmo painel = um cálculo |
| `LockService` em toda gravação | Sheets não tem transação. Dois salvamentos simultâneos se atropelam |

### 4.4 Busca

**Buscar Caso** cobre dois casos, e a diferença é o pedido dos 30 dias:

| Alcance | Onde busca | Como |
|---|---|---|
| Recente (≤ 30 dias) | Janela guardada em memória | Instantâneo |
| Histórico | Base completa | Lê **só a coluna** escolhida → acha as posições → lê **só as linhas** que casaram |
| Legado | Planilha externa, por ID | Abre somente leitura, lista as abas, lê a linha 1 como cabeçalho |

O fluxo do legado é exatamente o descrito: escolhe a planilha → escolhe a aba →
o sistema lê a primeira linha e entende que é cabeçalho → escolhe a coluna
(ex.: `protocolo`) → digita o dado (ex.: `1-2345678901`) → **devolve a linha
inteira**, rotulada pelo cabeçalho.

Detalhe que evita resultado vazio bobo: a busca compara **sem máscara** dos dois
lados. `1-2345678901`, `12345678901` e ` 1-2345678901 ` acham a mesma linha.

Ler a coluna antes das linhas não é preciosismo: numa base de 200 mil linhas ×
35 colunas, ler tudo são 7 milhões de células e estoura o tempo; ler uma coluna
são 200 mil, e depois só as linhas que interessam.

---

## 5. Configurabilidade

*"Tudo deve ser configurável e ajustável"* — o que isso significa em concreto:

| O que | Onde | Exige ADM |
|---|---|---|
| Nome das telas do menu | `CONFIG` | Sim |
| Campos do formulário (criar, tipo, máscara, seção, ordem, obrigatório) | `CAMPOS` | Criar/remover coluna: sim |
| Quem vê cada campo | `CAMPOS.VisivelPara` | Sim |
| Cards e gráficos de cada tela | `PAINEIS` | Sim |
| Limite dos rankings (TOP 5, TOP 10, TOP N) | `PAINEIS.Limite` | Não |
| Status, motivos, origens, ramos, áreas | `CATALOGO` | Não |
| Cargos e níveis de acesso | `CATALOGO` | Sim |
| Canais | `CANAIS` | Sim |
| Tema | Por usuário | Não |
| Metas individuais | `CONFIG` | Sim |

### Tipos de campo suportados

`texto` · `texto longo` · `número` · `moeda` · `data` · `hora` · `data e hora` ·
`seletor` · `seletor múltiplo` · `sim/não` · `e-mail` · `telefone` ·
`documento (com máscara)` · `percentual`

### Tipos de gráfico suportados

`pizza / rosca` · `linha` · `barras verticais` · `barras horizontais` ·
`barras + linha (dois eixos)` · `card indicador com minigráfico` ·
`barra de progresso` · `ranking` · `tabela`

Cada componente em `PAINEIS` é: **fonte** (canal) + **dimensão** (agrupa por) +
**medida** (o que conta/soma) + **agregação** + **filtro** + **limite** +
**quem vê**. Um gráfico novo é uma linha nova na aba, sem código.

---

## 6. Acesso e segurança

- **Entrar exige cadastro.** Não cadastrado vê a tela institucional, não uma
  tela vazia nem um erro.
- **Cargo ≠ nível de acesso.** Cargo é o que a pessoa *é*; nível é o que ela
  *pode*. Toda permissão sai do nível. Nunca `if (cargo === 'ADM')`.
- **Cargos padrão** (editáveis e excluíveis, nada fixado em código):
  `Analista RET` · `Analista Mesa Diamante` · `ADM` · `Coordenação` ·
  `Analista Sênior`.
- **ADM libera tudo para si e define, item a item, o que cada nível pode.**

### O nível de acesso é a unidade de tudo

Um nível de acesso não é uma etiqueta: é **o pacote inteiro do que a pessoa vê e
faz**. Quatro coisas saem dele, e nenhuma sai do cargo:

| O que o nível decide | Granularidade |
|---|---|
| **Quais telas** aparecem no menu | Tela a tela |
| **Quais campos** do formulário a pessoa vê | Campo a campo: `oculto` · `só leitura` · `edição` |
| **Quais cards e gráficos** aparecem em cada painel | Um a um |
| **Quais ações** pode executar | Criar · editar · ocultar · exportar · configurar |
| **Que dados alcança** (escopo) | `PRÓPRIOS` · `EQUIPE` · `CANAL` · `TODOS` |

Por isso `CAMPOS.VisivelPara` e `PAINEIS.VisivelPara` guardam **níveis de
acesso**, nunca cargos. Duas pessoas com o mesmo cargo podem enxergar telas
diferentes; duas pessoas com cargos diferentes podem enxergar a mesma coisa. O
cargo é só o rótulo organizacional que aparece embaixo do nome na barra
superior.

> A tela de Configurações do mockup mostra a caixa "Visibilidade por perfil" —
> aquela lista é de **níveis de acesso**, e é o mesmo controle usado para telas,
> campos e componentes.
- **Ação de alto impacto exige senha de ADM**: criar/remover coluna, criar ou
  apagar canal, mexer em níveis de acesso, gerar aba de análise sobre uma
  existente, normalizar base, ocultar dados em massa.
  Senha em SHA-256 com *salt*, guardada em Script Properties — **nunca na
  planilha**. Sessão liberada por poucos minutos; erro seguido bloqueia.
- **Esconder botão não é segurança.** Toda função sensível revalida no servidor.
- **Escopo de dados** por nível: `PRÓPRIOS` · `EQUIPE` · `CANAL` · `TODOS`.

---

## 7. Ordem de construção

Cada etapa entrega algo que funciona sozinho e pode ser conferido na planilha.

| # | Etapa | Entrega | Estado |
|---|---|---|---|
| 1 | Fundação | `Base.gs` e `Instalacao.gs`, as 13 abas, Id de 10 casas, formato texto | **pronta** |
| 2 | Acesso | Login pelo e-mail, `USUARIOS`, cargos, níveis, tela de não cadastrado | **pronta** |
| 3 | Casca | Menu lateral, barra superior, 4 temas, roteador | **pronta** |
| 4 | Cadastrar Caso | Formulário dirigido por `CAMPOS`, máscaras, validação, selo de SUSEP | **pronta** |
| 5 | Dashboard | Seletor de canal, cards, fila de trabalho com filtros | **pronta** |
| 6 | Configurações | Campos, catálogo, usuários, níveis, senha de ADM, reconciliação de colunas | **pronta** |
| 7 | Buscar Caso | Base própria + planilha legada | **pronta** |
| 8 | Painel Analítico | Componentes configuráveis, exportação | **pronta** |
| 9 | Minha Performance | Indicadores individuais, meta, ranking | **pronta** |
| 10 | Tabela de Corretoras | `CORRETORAS` + segmento + SUSEP bloqueada | **pronta** |
| 11 | Abas de análise | Gerador `ANALISE_*` | **pronta** |
| 12 | Diagnóstico | Verificação de build e de contrato | **pronta** |

---

## 8. O teto do Google Planilhas

> **Medido, não estimado.** `node Evolucao/Testes/estresse.js 200000` carrega
> 200 mil casos e mede cada operação. Resultado: tudo cabe nos seis minutos de
> uma execução com folga grande — a operação mais cara usa 2,5% do teto. O que
> não cabe é o ESPAÇO: `BASE_RET` com 200 mil casos ocupa 78% do teto de
> células sozinha, e com uma aba de análise a planilha chega a 96,7%. O limite
> desta arquitetura é da ordem de **200 mil casos por planilha**, e quem decide
> é a célula, não o relógio.


**O limite do Google Planilhas não é em linhas. É em células: 10 milhões por
planilha**, somando todas as abas. Quantas linhas cabem depende de quantas
colunas a aba tem:

```
linhas disponíveis  =  10.000.000  ÷  colunas da aba
```

Isso explica o teto de 1 milhão de linhas que a base antiga bateu: uma aba de
**10 colunas** chega a 1 milhão de linhas e fecha exatamente os 10 milhões de
células. Não foi um limite de linha — foi o de célula, expresso em linhas
naquele número de colunas.

### O orçamento desta planilha

| Aba | Colunas | Custo por linha |
|---|---|---|
| `BASE_RET` | 39 | 39 células |
| `BASE_MESA` | 24 | 24 células |
| As 10 abas de sistema e cadastro | 3 a 16 | poucos milhares no total |

Com as duas bases crescendo juntas, cada caso novo custa ~63 células, então o
teto fica em torno de **150 mil casos em cada base**, ao mesmo tempo. Se só uma
crescer, `BASE_RET` sozinha vai a ~250 mil linhas.

**Onde vocês estão hoje:** 30 mil linhas somadas gastam por volta de 900 mil
células — **9% do limite**. Sobra muito espaço.

### A pegadinha: célula vazia também conta

Uma aba nova no Sheets nasce com 1.000 linhas × 26 colunas = **26.000 células
ocupadas do orçamento, todas vazias**. Uma aba esquecida com 1 milhão de linhas
em branco come 10% do teto sem guardar nada.

Por isso o instalador **corta cada aba** para exatamente as colunas do contrato
e uma reserva modesta de linhas, e as bases crescem conforme entram os dados.
(Limite adicional que raramente aparece: 18.278 colunas por aba — coluna `ZZZ`.)

### O teto que chega antes: desempenho

Muito antes das 150 mil linhas, por volta de **50 mil por base**, leitura e
agregação começam a pesar — é aí que guardar em memória deixa de ser conforto e vira
necessidade. O desenho já conta com isso: fila lê só a janela recente, base é
a base só acrescenta no fim, e os totais ficam guardados em memória.

### E depois disso

O caminho é a base virar BigQuery (ou equivalente) e o Planilhas continuar só
como tela de entrada. O desenho já favorece essa saída: uma linha por caso,
colunas tipadas, identificador em texto e `_Visivel` para exclusão lógica. É
exatamente o formato que um banco de verdade ingere sem tratamento.

---

## 9. Decisões fechadas com o PO

| # | Pergunta | Resposta |
|---|---|---|
| 1 | Nome do produto | **PGO é a plataforma; RECC é esta operação.** A barra superior mostra `RECC`, e o nome é editável em `CONFIG` |
| 2 | Perfis do mockup × cargos | Valem **os 5 cargos do texto**. Acesso não vem do cargo: o nível decide telas, campos, componentes e ações, item a item |
| 3 | Código e descrição | **Duas colunas, sempre.** Vale para produto, proposta, sucursal, ramo e apólice. `CATALOGO` ganhou a coluna `Codigo` |
| 4 | Tipos de dado | Confirmado: **data, dinheiro, texto e número** convertidos para leitura direta no Power BI |
| 5 | Uma planilha ou duas | **Uma planilha, abas diferentes.** O teto está na seção 8 — e não é o que parecia |
| 6 | Logo | Vai para `CONFIG` como **URL ou upload**, nunca para o repositório: assim a marca troca junto com o nome quando a plataforma servir outra operação |

---

## 9a. Como o código é escrito

Regra única, registrada em [`02-padrao-de-codigo.md`](02-padrao-de-codigo.md):
**tudo em português, por extenso, sem abreviação.** Quem abrir este código
daqui a dois anos precisa entender sem perguntar para ninguém — inclusive
estagiário no primeiro dia.

| Não | Sim |
|---|---|
| `plLer_` | `lerRegistros_` |
| `seqProximoId_` | `proximoIdentificador_` |
| `{ c: 'CPF', t: 'id', p: true }` | `{ cabecalho: 'CPF', tipo: 'identificador', protegido: true }` |
| `def`, `ss`, `qtd` | `esquema`, `planilha`, `quantidade` |

As únicas exceções são os nomes do próprio Google (`SpreadsheetApp`,
`getValues`, `onEdit`) e de produtos (`Power BI`), porque renomeá-los deixaria
você sem conseguir procurar na documentação quando precisasse.

As pastas se chamam **`Back-End`** e **`Front-End`**.

---

## 9b. Como rodar os testes

A suíte **fica no repositório**, em `Testes/`. No sistema anterior ela
morava numa pasta temporária e se perdia quando o `%TEMP%` era limpo.

```bash
node Evolucao/Testes/rodar.js
```

São 77 testes, separados por etapa. O critério é **5 execuções seguidas sem falha** —
rodar uma vez não detecta teste instável.

O simulador (`Evolucao/Testes/simulador.js`) **converte valores igual ao Google
Planilhas**: `'00000010'` numa célula de formato Geral vira o número `10`, e
`'000000E1'` vira `0`. É o que dá valor ao teste — o simulador do sistema
anterior gravava texto como texto, e por isso nenhum teste enxergou o bug que
corrompeu 4.328 Ids em produção. Há um teste dedicado só a provar que o
simulador realmente corrompe quando o formato não é `@`.

---

## 10. O que o sistema NUNCA faz

1. Deduzir coluna por posição.
2. Criar, renomear ou apagar coluna durante um salvamento comum.
3. Apagar linha de base operacional. Exclusão é lógica (`_Visivel = NAO`).
4. Gravar identificador em célula de formato Geral.
5. Decidir comportamento pelo nome do cargo.
6. Confiar em validação de tela — o servidor revalida tudo.
7. Ler a planilha inteira quando precisa de uma coluna.
8. Semear dado operacional. Base nasce vazia.
9. Sobrescrever aba que não comece com `ANALISE_`.
10. Deixar a instalação sem nenhum administrador.

---

## 11. Armadilhas herdadas do PGO 5.x

Não é código reaproveitado — é experiência. Cada item abaixo foi bug em
produção no sistema anterior.

| Armadilha | Como o RECC evita |
|---|---|
| Sheets converteu identificador em número: `00000010` → `10`, `000000E1` → `0`. Deu **4.328 colisões** de ID em 200 mil registros | Formato texto na linha, antes do `setValues` (Decisão 4) |
| Gerador de sequência rebaixou o piso e reemitiu ID em uso | Sequência nunca anda para trás |
| Instalação nova nascia inacessível: aba de usuários vazia, ninguém entrava | Quem instala é cadastrado como o primeiro ADM |
| Menu vazio confundido com falta de permissão | Falha de acesso se anuncia com o motivo técnico |
| Três cópias da regra de permissão, fora de sincronia | Uma fonte só, no servidor |
| Código de topo dependendo de outro arquivo derrubava o projeto inteiro | Nenhum arquivo tem código de topo que dependa de outro |
| Diagnóstico que pulava bloco quando o arquivo faltava, e aprovava o build | `rodarBloco_` embrulha cada bloco: qualquer erro dentro dele vira item de **falha**, com o erro escrito. Bloco que não devolve item nenhum também é falha. Tem teste para os dois |
| Simulador de teste que gravava texto como texto — nenhum teste via o bug real | O simulador converte igual ao Sheets |
| Grade fixa em formulário variável deixava linha pela metade | Formulário em flex, com base por campo |

---

<sub>Pelitero Labs · documento de desenho · versão 1 · setembro de 2026</sub>
