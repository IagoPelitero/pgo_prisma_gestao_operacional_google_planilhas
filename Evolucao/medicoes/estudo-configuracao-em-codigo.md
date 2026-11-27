# Estudo — o que pode virar código em vez de ir na planilha (27/11/2026)

**Pedido do PO:** "faça um estudo no Prisma para ver o que pode virar código ao invés de ir na
planilha". Só estudo: **nada foi mudado no sistema.**

Todos os números são do **SIMULADOR**, na planilha do tamanho da do PO (RET com 3.571 casos,
CORRETORAS com 7.126 linhas). Valem para comparar, não como tempo de verdade.

**Como medir de novo:** `node Evolucao/Testes/medir-por-aba.js`

## 1. O que o sistema lê da planilha hoje

São três grupos:

| Grupo | Abas | Onde mora | Pode virar código? |
|---|---|---|---|
| **Já é código** | O contrato das abas (colunas, tipos), as ações e permissões possíveis, as regras de prazo, os textos das telas | `Base.gs` e os outros `.gs` | Já é |
| **Configuração** | CONFIG, CANAIS, CAMPOS, CATALOGO, USUARIOS, SINALIZADORES, PAINEIS | Planilha, editada em **Configurações** | Poderia, mas perde as telas de Configurações |
| **Dados da operação** | BASE_RET, BASE_MESA, BASE_VG, CORRETORAS, SUSEP_BLOQUEADAS, AUDITORIA, ERROS… | Planilha | **Não**: mudam a cada caso |

As 7 abas de configuração **já ficam guardadas por 5 minutos** no cache do script
(`RECC_ABAS_DO_CACHE`, `RECC_SEGUNDOS_DO_CACHE = 300`), e cada gravação feita pelas telas de
Configurações limpa esse cache. Com o cache quente, ler a configuração custa quase o mesmo que ela
estar escrita no código.

## 2. As medidas por aba

Chamadas à planilha em cada função. "Quente": o cache da configuração ainda vale. "Frio": o primeiro
clique depois que os 5 minutos vencem.

| Função | Quente | Da configuração (quente) | Frio | Da configuração (frio) |
|---|---:|---:|---:|---:|
| Abrir o sistema (`pacoteDePartida`) | 19 | 1 | 44 | 26 |
| Trabalho RET, aba 1 | 16 | 5 | 53 | 42 |
| Trabalho Mesa, aba 1 | 16 | 5 | 53 | 42 |
| Abrir o caso (`casoParaEditar`) | 10 | 3 | 42 | 35 |
| Alterar status: abrir (`situacoesParaTrocar`) | 8 | 1 | 33 | 26 |
| Alterar status: campos (`camposDaSituacao`) | 8 | 1 | 35 | 28 |
| Alterar status: salvar | 15 | 2 | 47 | 34 |
| Formulário do Cadastrar | 5 | 1 | 32 | 28 |
| Cadastrar caso | 17 | 2 | 49 | 34 |
| Buscar (RET, CPF) | 14 | 2 | 46 | 34 |
| Produtividade RET | 11 | 2 | 48 | 39 |

**O que os números mostram**

- **Com o cache quente**, a configuração custa de 1 a 5 chamadas por clique. O resto (e as
  células: 16 mil no Trabalho, 40 mil na Produtividade) é a **base de casos**, que é dado e não
  pode virar código. É o mesmo que a aba ERROS mostrou: a lentidão vem do tamanho das bases.
- **Com o cache frio**, a configuração custa de **26 a 42 chamadas** a mais. Na régua técnica (25 ms
  por chamada) são cerca de 0,7 a 1 s a mais, no primeiro clique depois de cada 5 minutos. Com a
  equipe trabalhando o dia todo, isso acontece umas 12 vezes por hora, sempre com alguém.
- **Sobras com o cache quente** (achadas pela pilha de chamadas):
  - `sinalizadoresDoCanal_` pergunta se a aba SINALIZADORES existe a cada uso: **4 vezes** em cada
    clique do Trabalho e 1 nas outras telas;
  - `tiposDeclaradosPeloAdministrador_` pergunta pela aba CAMPOS: 1 vez por clique.
- **Ao abrir o sistema**, 18 das 19 chamadas leem as últimas linhas das 3 bases, para a data do
  "último registro" na barra superior. É dado, não configuração.

## 3. Os caminhos

| | Caminho | Ganho | Custo e risco |
|---|---|---|---|
| **A** | Cache da configuração de **5 min → 6 h** (o máximo do Apps Script) | O "frio" passa de ~12 vezes por hora a ~1 vez a cada 6 h | O que for editado **direto na planilha** (e não pelas telas) demora até 6 h para valer. O mais sensível é a USUARIOS: desligar alguém direto na planilha. Proteções possíveis: deixar a USUARIOS com 5 min, e/ou um gatilho `onEdit` que limpa o cache quando alguém edita uma aba de configuração à mão |
| **B** | Lembrar dentro da execução que as abas SINALIZADORES e CAMPOS existem | −4 chamadas no Trabalho, −1 nas outras (cerca de 0,1 s por clique) | Nenhum comportamento muda |
| **C** | Escrever CANAIS, CAMPOS, CATALOGO… **no código** | O mesmo ganho de A | **Perde as telas de Configurações**: cada mudança de campo, status ou canal vira uma versão nova colada. Desfaz pedidos do PO de várias etapas. **Não recomendado** |
| **D** | Guardar as **colunas das bases** no cache | −3 a 4 chamadas por clique | **Perigoso:** se alguém inserir uma coluna na planilha, o sistema gravaria na coluna errada. **Não recomendado** |

**Recomendação do estudo:** **A** (com a USUARIOS em 5 min e o gatilho de edição) e **B**. Os dois
mantêm as Configurações como estão e não tocam em regra de negócio, permissão, indicador ou
estrutura das planilhas. **C e D, não.** Nada disso foi implementado: depende da aprovação do PO.
