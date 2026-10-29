/**
 * ============================================================================
 * PGO — Indicadores.gs · os números
 * ============================================================================
 * Duas telas que contam os mesmos casos e respondem perguntas diferentes:
 * "o que eu trabalho hoje" e "o que está acontecendo na operação". Por isso
 * moram juntas — mudar a regra de contagem num lugar e esquecer do outro é o
 * erro que este arquivo evita. (Uma terceira, a Minha Performance, saiu na
 * Etapa 52, a pedido do PO.)
 *
 * O QUE TEM AQUI DENTRO, nesta ordem:
 *
 *   1. OS CARTÕES DO DIA E A FILA
 *   2. OS GRÁFICOS DA OPERAÇÃO
 *   3. O VALOR POR SITUAÇÃO E OS ATENDIDOS DO CHAT
 *
 * Procure pelo banner com ##### para pular de uma seção à outra.
 * ============================================================================
 */

/* ############################################################################
   #
   #  SEÇÃO 1 de 3 · OS CARTÕES DO DIA E A FILA
   #
   ############################################################################ */

/**
 * ============================================================================
 * Os números do dia e a fila de trabalho
 * ============================================================================
 * O Trabalho responde três perguntas, nesta ordem de importância:
 *
 *   quanto tem?        os cartões, contados por situação
 *   o que fazer agora? a fila, filtrável
 *   está atualizado?   a data do último registro, na barra superior
 *
 * Tudo respeita o ALCANCE do nível: quem enxerga só os próprios casos vê
 * cartões contando só os dele. Um cartão que conta o que a pessoa não pode
 * abrir é pior que cartão nenhum — ela passaria a tarde procurando um caso
 * que a fila nunca vai mostrar.
 * ============================================================================
 */

/**
 * Até quantas linhas os painéis leem de uma vez. Desde a Etapa 65 são linhas
 * DO PERÍODO, achadas pela coluna da data (ver registrosDosPeriodos_); o texto
 * abaixo conta a história de quando eram as linhas do FIM da aba — e continua
 * valendo para o chat da Mesa e para o canal sem coluna de data.
 *
 * A base só acrescenta no fim, então o recente está nas últimas linhas: ler o
 * fim e filtrar por data custa uma leitura só, em vez de percorrer tudo.
 *
 * O NÚMERO IMPORTA, E MUDA COM O VOLUME. Com 200 mil casos espalhados em um
 * ano, uma janela de 30 dias tem umas 15 mil linhas — e 5.000 mostrariam um
 * terço do período, calados. Por isso é configurável, e por isso toda tela que
 * usa esta janela devolve `truncada` quando bate no teto.
 *
 * Ler 50 mil linhas por 39 colunas são 1,95 milhão de células, cerca de dois
 * segundos: cabe. O que não cabe é ler a base inteira a cada abertura de tela.
 */
const RECC_LINHAS_DO_PAINEL_PADRAO = 5000;

/**
 * Quantos casos a FILA do Trabalho mostra de cara, e as outras quantidades
 * que a pessoa pode escolher.
 *
 * Pedido do PO, em três passos. Primeiro: "mostrar apenas os 5 mais
 * recentes". Depois: "deve ser possível escolher 5, 10, 20, 50, 100 ou todos".
 * Por fim, a correção que vale: "não queria um filtro; queria que visualmente
 * mostrasse 5, mas fosse possível mostrar todos, limitando nas opções que eu
 * informei caso tenha a quantidade".
 *
 * Por isso o servidor manda a fila INTEIRA, e quem mostra 5, 10 ou todos é a
 * tela — na hora, sem outra ida ao servidor. As opções moram aqui, num lugar
 * só, e a tela oferece só as que o canal tem: com 12 casos, 5, 10 e "todos".
 * Os cartões, a busca e os filtros continuam olhando todos os casos.
 */
const RECC_CASOS_NA_FILA = 5;
const RECC_OPCOES_DE_CASOS_NA_FILA = [5, 10, 20, 50, 100];

/**
 * Quantos casos da fila o Trabalho recebe ao ABRIR: os da maior opção do
 * "Mostrar" (100). "Todos" é que vai buscar o resto.
 *
 * O PO relatou: "a aba Trabalho vem demorando para carregar e, quando carrega,
 * traz o erro de 40 s para responder". A fila ia INTEIRA para a tela, e com
 * 5.000 casos no período a resposta tinha 6 MB — o Apps Script leva dezenas
 * de segundos para atravessar isso até o navegador, e a tela desistia nos 40.
 * Perguntado, ele escolheu: abrir com os 100 mais recentes (5, 10, 20, 50 e
 * 100 continuam na hora) e "Todos" ir ao servidor quando clicado. Os cartões,
 * os filtros e o aviso de prazo continuam olhando TODOS os casos.
 */
const RECC_FILA_NA_ABERTURA = RECC_OPCOES_DE_CASOS_NA_FILA[RECC_OPCOES_DE_CASOS_NA_FILA.length - 1];

function linhasQueOPainelOlha_() {
  var declarado = Number(valorDaConfiguracao_('OPERACAO.LINHAS_DO_PAINEL', ''));
  if (isFinite(declarado) && declarado > 0) return Math.floor(declarado);
  return RECC_LINHAS_DO_PAINEL_PADRAO;
}

/**
 * As cores que uma situação pode ter, na coluna Cor da aba CATALOGO.
 *
 * São nomes, e não códigos hexadecimais, de propósito: cada tema pinta o seu
 * "bom" e o seu "ruim". Gravar #15794A na planilha deixaria o verde do tema
 * claro aparecendo no tema escuro.
 */
const RECC_TONS = ['neutro', 'destaque', 'bom', 'atencao', 'ruim', 'violeta'];

function tomValido_(cor) {
  var tom = normalizarParaComparar_(cor);
  return RECC_TONS.indexOf(tom) >= 0 ? tom : 'neutro';
}

/**
 * Tudo que o Trabalho precisa, numa chamada.
 *
 * `filtros` é um objeto simples: { chaveDoCampo: valorEscolhido }. As chaves
 * vêm da própria resposta anterior, em `filtrosDisponiveis` — a tela não
 * inventa filtro, ela oferece o que o canal tem.
 */
function resumoDoCanal(idDoCanal, filtros, periodoPedido, quantosNaFila) {
  var quem = exigirTela_('trabalho');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  // O PERÍODO é escolhido na tela — por data ou por mês, abrindo do dia 1 do
  // mês até hoje. Antes era a janela fixa da CONFIG, igual para todo mundo: quem
  // precisasse fechar uma semana ou um mês tinha de exportar e contar fora.
  var periodo = resolverPeriodo_(periodoPedido);
  var antes = periodoAnterior_(periodo);

  // Linha sem data FICA no atalho e SAI dos períodos fechados — a mesma regra
  // da Produtividade RECC, pelo mesmo motivo: na abertura da tela ela é um
  // caso mal preenchido que precisa aparecer; num "setembro", é um caso sobre
  // o qual não dá para afirmar que é de setembro.
  var guardarSemData = guardaOsSemData_(periodo);

  // Só as linhas do período e do anterior, achadas pela coluna da data
  // (Etapa 65) — qualquer mês completo. Ver registrosDosPeriodos_.
  var lido = registrosDosPeriodos_(canal, [
    { de: periodo.de, ate: periodo.ate, guardarSemData: guardarSemData },
    { de: antes.de, ate: antes.ate }]);
  var recentes = lido.registros;
  var truncada = lido.truncada;

  var noPeriodo = entreDuasDatas_(recentes, canal, periodo.de, periodo.ate,
    guardarSemData);
  var meus = filtrarPeloAlcance_(noPeriodo, canal.aba, quem);

  // O período ANTERIOR, do mesmo tamanho, só para dizer se subiu ou desceu.
  var anterior = filtrarPeloAlcance_(
    entreDuasDatas_(recentes, canal, antes.de, antes.ate, false), canal.aba, quem);

  var disponiveis = filtrosDoCanal_(canal, quem);
  // A BUSCA DIGITADA entra junto com os filtros, e vale para os cartões E para
  // a fila: o número do cartão continua sendo o dos casos que a busca achou.
  var termo = String((filtros || {}).busca || '').trim();
  var filtrados = aplicarBusca_(aplicarFiltros_(meus, disponiveis, filtros || {}),
    canal, termo);
  var anterioresFiltrados = aplicarBusca_(
    aplicarFiltros_(anterior, disponiveis, filtros || {}), canal, termo);
  var pertoDeVencer = casosPertoDeVencer_(filtrados, canal);
  // O CARTÃO CLICADO filtra a FILA pelo que ele conta (Etapa 44) — o status, o
  // valor de uma coluna (o Status proposta), a coluna preenchida. Os cartões
  // continuam contando sem ele: clicar em "Pendente" não pode zerar os outros.
  var naFila = filtrarPeloCartao_(filtrados, canal, (filtros || {}).cartao);

  return {
    canal: canal,
    periodo: {
      tipo: periodo.tipo,
      dias: periodo.dias,
      mes: periodo.mes || '',
      de: comoSeEscreve_(periodo.de),
      ate: comoSeEscreve_(periodo.ate),
      rotulo: periodo.rotulo
    },
    mesesDisponiveis: mesesParaEscolher_(),
    cartoes: contarCartoes_(filtrados, anterioresFiltrados, canal),
    filtrosDisponiveis: disponiveis,
    colunas: colunasDaFila_(canal),
    // A fila, o mais recente em cima: os 100 mais recentes, ou todos quando a
    // tela pede "Todos". Ver RECC_FILA_NA_ABERTURA. Vai COMPACTA — só os
    // valores; o nome de cada coluna já está em `colunas`, e a tela remonta.
    // `total` continua sendo a fila inteira.
    fila: compactarFila_(montarFila_(quantosNaFila === 'todos'
      ? naFila : naFila.slice(-RECC_FILA_NA_ABERTURA), canal)),
    filaCompacta: true,
    // O aviso de prazo olha a fila INTEIRA — um caso perto de vencer que não
    // está entre os 100 mais recentes é justamente o que mais precisa do aviso.
    // A LISTA do aviso vai com até 100 (os mais recentes); o número, inteiro.
    // Um aviso de 2.000 linhas pesaria tanto quanto a fila — e ninguém o lê.
    pertoDeVencer: compactarFila_(montarFila_(
      pertoDeVencer.slice(-RECC_FILA_NA_ABERTURA), canal)),
    quantosPertoDeVencer: pertoDeVencer.length,
    mostrarNaFila: { padrao: RECC_CASOS_NA_FILA, opcoes: RECC_OPCOES_DE_CASOS_NA_FILA,
      naAbertura: RECC_FILA_NA_ABERTURA },
    total: naFila.length,
    totalNoPeriodo: meus.length,
    truncada: truncada,
    escopo: quem.permissoes.escopo,
    podeEditar: podeFazer_(quem.permissoes, RECC_ACOES.EDITAR)
  };
}

/**
 * Só o que entrou na janela.
 *
 * `recuo` desloca a janela para trás: 0 é o período atual, `dias` é o período
 * imediatamente anterior, do mesmo tamanho — é assim que sai a comparação
 * "vs. período anterior" dos cartões.
 *
 * Registro sem data FICA no período atual. Some-lo por omissão esconderia
 * justamente as linhas mal preenchidas, que são as que precisam de atenção.
 */
function filtrarPeloPeriodo_(registros, canal, dias, recuo) {
  if (!canal.colunaDaData) return recuo ? [] : registros;

  var fim = new Date();
  fim.setDate(fim.getDate() - recuo);
  var inicio = new Date();
  inicio.setDate(inicio.getDate() - recuo - dias);

  return entreDuasDatas_(registros, canal, inicio, fim, !recuo);
}

/**
 * Os registros cuja data está entre duas datas, inclusive as duas pontas.
 *
 * Compara em texto `yyyy-MM-dd`, e não em milissegundos: a hora não importa
 * aqui, e comparar objetos Date faria "hoje às 14h" ficar de fora de um
 * período que termina "hoje", porque hoje às 14h é depois de hoje às 00h.
 *
 * `guardarSemData` diz o que fazer com a linha que não tem data preenchida.
 * No período atual ela FICA: sumir por omissão esconderia justamente as linhas
 * mal preenchidas, que são as que precisam de atenção. Num período fechado —
 * "setembro", "de 01 a 15" — ela sai, porque não dá para afirmar que ela é
 * daquele mês.
 */
function entreDuasDatas_(registros, canal, inicio, fim, guardarSemData) {
  var de = Utilities.formatDate(inicio, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
  var ate = Utilities.formatDate(fim, RECC_FUSO_HORARIO, 'yyyy-MM-dd');

  return registros.filter(function (registro) {
    var data = converterParaData_(registro[canal.colunaDaData]);
    if (!data) return guardarSemData === true;
    var dela = Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
    return dela >= de && dela <= ate;
  });
}

/*
 * O PERÍODO LIDO PELA COLUNA DE DATA (Etapa 65, decisão do PO).
 *
 * Antes, o Trabalho e a Produtividade liam as últimas LINHAS_DO_PAINEL linhas
 * e filtravam por data: um mês de três meses atrás saía pela metade, com um
 * aviso que ninguém lia como "o número está errado". Agora a regra é a do
 * Buscar Caso — ler a coluna antes de ler as linhas: lê a coluna da data
 * inteira (uma coluna só), acha as linhas que caem nos períodos pedidos (o da
 * tela e o anterior, dos cartões) e lê só essas. Qualquer mês sai completo.
 *
 * A CONTA É A MESMA de antes, e não uma parecida: as linhas lidas passam pelo
 * mesmo entreDuasDatas_ de sempre. Esta função só decide QUAIS linhas trazer.
 *
 * O TETO é o de sempre, `OPERACAO.LINHAS_DO_PAINEL` (5.000), mas agora conta
 * linhas DO PERÍODO, e não do fim da base: o custo nunca passa do de antes, e
 * qualquer período com até 5.000 casos sai inteiro. Passou do teto: as linhas
 * do período da tela vêm primeiro (as mais recentes), o anterior completa o
 * que sobrar, e a tela avisa (`truncada`). Canal sem coluna de data: as
 * últimas linhas, como antes.
 *
 * A BASE FORA DE ORDEM. O caso entra no fim no dia em que chega, então as
 * linhas de um mês ficam juntas, e lê-las custa uma ou duas idas. Mas uma base
 * colada fora da ordem das datas espalha cada mês em dezenas de pedaços, e
 * cada pedaço é uma ida. Acima de RECC_PEDACOS_DO_PERIODO_NO_MAXIMO pedaços, o
 * PGO volta a ler as últimas linhas, como antes — e agora sabe dizer, pela
 * coluna da data, se ficou caso do período de fora (`truncada`).
 */
const RECC_PEDACOS_DO_PERIODO_NO_MAXIMO = 20;

/** As linhas dos períodos [{ de, ate, guardarSemData }]: { registros, truncada }. */
function registrosDosPeriodos_(canal, periodos) {
  var estrutura = estruturaDaAba_(canal.aba);
  var posicao = canal.colunaDaData ? posicaoDaColuna_(estrutura, canal.colunaDaData) : -1;
  if (posicao < 0) {
    var recentes = lerRegistros_(canal.aba, { ultimas: linhasQueOPainelOlha_() });
    return { registros: recentes, truncada: recentes.length >= linhasQueOPainelOlha_() };
  }

  var limites = periodos.map(function (periodo) {
    return {
      de: Utilities.formatDate(periodo.de, RECC_FUSO_HORARIO, 'yyyy-MM-dd'),
      ate: Utilities.formatDate(periodo.ate, RECC_FUSO_HORARIO, 'yyyy-MM-dd'),
      semData: periodo.guardarSemData === true
    };
  });
  var dele = function (limite, dela) {
    return dela ? dela >= limite.de && dela <= limite.ate : limite.semData;
  };
  var doPrimeiro = [];   // o período da tela
  var dosOutros = [];    // o anterior, dos cartões
  lerColunaInteira_(canal.aba, estrutura.cabecalhos[posicao]).forEach(function (valor, i) {
    var data = converterParaData_(valor);
    var dela = data ? Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd') : '';
    if (dele(limites[0], dela)) doPrimeiro.push(i + 2);
    else if (limites.slice(1).some(function (limite) { return dele(limite, dela); })) dosOutros.push(i + 2);
  });

  var teto = linhasQueOPainelOlha_();
  var truncada = doPrimeiro.length + dosOutros.length > teto;
  var linhas = doPrimeiro.slice(-teto);
  if (linhas.length < teto && dosOutros.length) {
    linhas = dosOutros.slice(-(teto - linhas.length)).concat(linhas)
      .sort(function (uma, outra) { return uma - outra; });
  }

  if (blocosDeLinhas_(linhas).length > RECC_PEDACOS_DO_PERIODO_NO_MAXIMO) {
    var primeiraDaJanela = Math.max(2, quantidadeDeRegistros_(estrutura) + 2 - teto);
    return {
      registros: lerRegistros_(canal.aba, { ultimas: teto }),
      truncada: doPrimeiro.concat(dosOutros).some(function (linha) { return linha < primeiraDaJanela; })
    };
  }

  // O que lerRegistros_ já tirava: a linha excluída e a linha toda em branco.
  var iVisivel = posicaoDaColuna_(estrutura, '_Visivel');
  var registros = lerLinhasEspecificas_(canal.aba, linhas).filter(function (registro) {
    if (iVisivel >= 0
      && normalizarParaComparar_(registro[estrutura.cabecalhos[iVisivel]]) === 'nao') return false;
    return estrutura.cabecalhos.some(function (cabecalho) {
      var v = cabecalho ? registro[cabecalho] : '';
      return v !== '' && v !== null && v !== undefined;
    });
  });
  return { registros: registros, truncada: truncada };
}

// ============================================================================
// O PERÍODO — duas maneiras de escolher, uma só de contar
// ============================================================================

/**
 * As duas maneiras de a operação dizer "deste tempo aqui" (Etapa 43: o PO
 * tirou o "Por dias" da tela).
 *
 *   INTERVALO — "de 01/09 a 15/09". É o que responde uma pergunta específica:
 *               a semana da campanha, os dias da virada do sistema. Sem as
 *               duas datas, é a abertura da tela: do dia 1 do mês até hoje
 *               (Etapa 56).
 *   MÊS       — "setembro de 2026". É como a operação REPORTA: o fechamento
 *               mensal.
 *
 * Os "últimos N dias" (periodoPorDias_) ficaram só para o pedido torto e para
 * quem chama com um número — a tela não oferece mais.
 *
 * O servidor é quem resolve as duas numa coisa só: duas datas. A tela escolhe;
 * ela não calcula. Se ela calculasse, o dia que aparece no gráfico e o dia que
 * o servidor contou seriam dois relógios diferentes — o do navegador de quem
 * está olhando e o da planilha —, e num fechamento de mês essa diferença é um
 * dia inteiro de casos.
 */
/** Quantos meses fechados a tela oferece para trás. */
const RECC_MESES_PARA_TRAS = 12;

const RECC_NOMES_DOS_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio',
  'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/**
 * Transforma o que a tela pediu em duas datas, um tamanho e um rótulo.
 *
 * Pedido torto NÃO estoura: cai no atalho padrão. Um endereço guardado, um
 * clique repetido ou uma data digitada pela metade chegam aqui o tempo todo, e
 * uma tela de número que mostra erro em vez de número é uma tela que ninguém
 * abre de novo.
 */
function resolverPeriodo_(pedido, diasPadrao) {
  var padrao = Number(diasPadrao)
    || Number(valorDaConfiguracao_('OPERACAO.JANELA_DIAS', '30')) || 30;
  pedido = pedido || {};

  // Compatibilidade: quem chamar só com um número continua funcionando. É o
  // que o Trabalho fazia, e não há motivo para mexer nele.
  if (typeof pedido === 'number' || typeof pedido === 'string') {
    return periodoPorDias_(Number(pedido) || padrao);
  }

  var tipo = normalizarParaComparar_(pedido.tipo);

  if (tipo === 'intervalo') {
    var de = converterParaData_(pedido.de);
    var ate = converterParaData_(pedido.ate);
    // "Por data" sem as duas datas é a ABERTURA da tela (Etapa 43: o PO tirou
    // o "Por dias" e pediu "Por data" como padrão). Etapa 56, pedido do PO: "o
    // de deve sempre iniciar no dia 01 de cada mês e o para deve sempre ser o
    // dia que estamos" — do dia 1 do mês corrente até hoje, já escrito como
    // datas, para as caixas de/até abrirem preenchidas. No dia 1, é só hoje.
    if (!pedido.de && !pedido.ate) {
      // As duas pontas à meia-noite: o período compara por dia (yyyy-MM-dd), e
      // com a hora de agora no "até" o tamanho arredondaria um dia para mais —
      // e a janela de comparação dos cartões sairia um dia mais longa.
      var agora = new Date();
      var hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
      var doDia1 = new Date(agora.getFullYear(), agora.getMonth(), 1);
      return {
        tipo: 'intervalo',
        // É a ABERTURA: o caso sem data continua aparecendo, como no antigo
        // "últimos 30 dias" (ver guardaOsSemData_). Etapa 44: sem esta marca, a
        // troca da abertura para "Por data" escondeu os casos importados sem
        // data de recepção — e os cartões passaram a contar menos.
        abertura: true,
        de: doDia1,
        ate: hoje,
        dias: diasEntre_(doDia1, hoje),
        rotulo: 'de ' + comoSeEscreve_(doDia1) + ' a ' + comoSeEscreve_(hoje)
      };
    }
    if (de && ate) {
      // Datas invertidas se endireitam em vez de devolver lista vazia. Quem
      // digitou "de 30/09 a 01/09" quis setembro, e uma tela zerada faria a
      // pessoa procurar defeito no dado.
      if (de > ate) { var troca = de; de = ate; ate = troca; }
      return {
        tipo: 'intervalo',
        de: de,
        ate: ate,
        dias: diasEntre_(de, ate),
        rotulo: 'de ' + comoSeEscreve_(de) + ' a ' + comoSeEscreve_(ate)
      };
    }
  }

  if (tipo === 'mes') {
    var escolhido = mesValido_(pedido.mes);
    if (escolhido) return periodoDoMes_(escolhido);
  }

  return periodoPorDias_(Number(pedido.dias) || padrao);
}

/**
 * O caso SEM data entra neste período? Na abertura da tela (e no antigo "por
 * dias"), sim: é um caso mal preenchido, e some-lo esconderia justamente quem
 * precisa de atenção. Num período escolhido de/até ou num mês, não: não dá
 * para afirmar que ele é desse período.
 */
function guardaOsSemData_(periodo) {
  return periodo.tipo === 'dias' || periodo.abertura === true;
}

function periodoPorDias_(dias) {
  var ate = new Date();
  var de = new Date();
  de.setDate(de.getDate() - dias);
  return {
    tipo: 'dias',
    de: de,
    ate: ate,
    dias: dias,
    rotulo: 'últimos ' + dias + ' dias'
  };
}

/** Do dia 1 ao último dia do mês. `mes` chega como "2026-09". */
function periodoDoMes_(mes) {
  var partes = mes.split('-');
  var ano = Number(partes[0]);
  var numero = Number(partes[1]);

  var de = new Date(ano, numero - 1, 1);
  // Dia ZERO do mês seguinte é o último dia deste. Evita a tabela de "30 ou
  // 31", e acerta fevereiro bissexto sem ninguém precisar lembrar dele.
  var ate = new Date(ano, numero, 0);

  return {
    tipo: 'mes',
    mes: mes,
    de: de,
    ate: ate,
    dias: diasEntre_(de, ate),
    rotulo: RECC_NOMES_DOS_MESES[numero - 1] + ' de ' + ano
  };
}

/**
 * O período imediatamente anterior, para a comparação dos cartões.
 *
 * Num MÊS, o anterior é o mês anterior inteiro — e não "os 30 dias antes do
 * dia 1". Comparar setembro com "os 30 dias antes de setembro" daria quase
 * agosto, mas não agosto: fevereiro contra os 30 dias antes dele pegaria três
 * dias de janeiro a mais, e a comparação que a operação reporta estaria errada
 * por três dias todo ano.
 *
 * Nos outros dois, é uma janela do mesmo tamanho, encostada antes.
 */
function periodoAnterior_(periodo) {
  if (periodo.tipo === 'mes') {
    var partes = periodo.mes.split('-');
    var ano = Number(partes[0]);
    var numero = Number(partes[1]) - 1;
    if (numero < 1) { numero = 12; ano = ano - 1; }
    return periodoDoMes_(ano + '-' + (numero < 10 ? '0' : '') + numero);
  }

  // O tamanho é o VÃO REAL entre as duas datas, e não o `dias` que o pedido
  // trouxe: "últimos 30 dias" pega 31 datas (de hoje-30 até hoje, com as duas
  // pontas), e usar o 30 aqui deixaria a janela anterior um dia mais curta que
  // a atual. Comparar duas janelas de tamanhos diferentes é o tipo de erro que
  // some numa variação de 3% e ninguém confere.
  var quantos = diasEntre_(periodo.de, periodo.ate);

  var ate = new Date(periodo.de.getTime());
  ate.setDate(ate.getDate() - 1);
  var de = new Date(ate.getTime());
  de.setDate(de.getDate() - (quantos - 1));

  return { tipo: periodo.tipo, de: de, ate: ate, dias: periodo.dias, rotulo: '' };
}

/**
 * Quantas DATAS o intervalo cobre, contando as duas pontas.
 *
 * De 10/09 a 19/09 são DEZ dias, e não nove. Contar a subtração crua daria
 * nove, e a janela de comparação sairia um dia mais curta que a medida.
 */
function diasEntre_(de, ate) {
  var umDia = 24 * 60 * 60 * 1000;
  var cru = Math.round((ate.getTime() - de.getTime()) / umDia);
  return Math.max(cru + 1, 1);
}

function comoSeEscreve_(data) {
  return Utilities.formatDate(data, RECC_FUSO_HORARIO, 'dd/MM/yyyy');
}

/** "2026-09" quando o texto é um mês de verdade; vazio quando não é. */
function mesValido_(texto) {
  var limpo = String(texto || '').trim();
  if (!/^\d{4}-\d{2}$/.test(limpo)) return '';
  var numero = Number(limpo.split('-')[1]);
  return (numero >= 1 && numero <= 12) ? limpo : '';
}

/** Os meses que a tela oferece: deste para trás, com o nome por extenso. */
function mesesParaEscolher_() {
  var lista = [];
  var hoje = new Date();
  for (var i = 0; i < RECC_MESES_PARA_TRAS; i++) {
    var quando = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    var numero = quando.getMonth() + 1;
    var chave = quando.getFullYear() + '-' + (numero < 10 ? '0' : '') + numero;
    lista.push({
      valor: chave,
      rotulo: RECC_NOMES_DOS_MESES[numero - 1] + ' de ' + quando.getFullYear()
    });
  }
  return lista;
}

/**
 * Os filtros que o canal oferece: os campos que já são lista.
 *
 * Não há lista de filtros escrita em código. Se o administrador transformar
 * um campo em seletor, ele vira filtro sozinho; se desligar o campo, o filtro
 * some junto.
 */
/** Quantas caixas de filtro o Trabalho mostra. Era 4; o PO pediu o Status proposta (Etapa 44). */
const RECC_FILTROS_NO_TRABALHO = 6;

function filtrosDoCanal_(canal, quem) {
  var disponiveis = [];

  // O STATUS VEM PRIMEIRO, sempre.
  //
  // O teto de quatro filtros pegava os quatro primeiros seletores na ordem em
  // que os campos aparecem no formulário. Quando a operação reordenou o
  // formulário e o Status foi para o fim — ele é a última coisa que se
  // preenche no atendimento —, ele caiu fora do corte. Sem erro nenhum: o
  // filtro mais usado do sistema simplesmente deixou de existir na tela.
  //
  // A ordem do FORMULÁRIO segue o caminho de quem atende; a ordem dos FILTROS
  // segue o que a operação recorta. Amarrar uma na outra foi o defeito.
  //
  // Etapa 44, pedido do PO: o filtro do Status proposta. Logo depois do Status
  // vêm os campos que APARECEM conforme o status (o Status proposta aparece no
  // Retido); depois os outros campos de lista. Até 6 caixas.
  var colunaDoStatus = normalizarParaComparar_(canal.colunaDoStatus || '');
  var ativos = camposAtivosDoCanal_(canal.id);
  var chaveDoStatus = '';
  ativos.forEach(function (campo) {
    if (normalizarParaComparar_(campo.Cabecalho) === colunaDoStatus) {
      chaveDoStatus = String(campo.ChaveTecnica);
    }
  });
  function prioridade(campo) {
    if (normalizarParaComparar_(campo.Cabecalho) === colunaDoStatus) return 0;
    var condicao = lerConfiguracaoDoCampo_(campo).mostrarSe;
    if (chaveDoStatus && condicao && String(condicao.campo) === chaveDoStatus) return 1;
    return 2;
  }
  var campos = ativos.map(function (campo, ordem) {
    return { campo: campo, prioridade: prioridade(campo), ordem: ordem };
  }).sort(function (um, outro) {
    return um.prioridade - outro.prioridade || um.ordem - outro.ordem;
  }).map(function (item) { return item.campo; });

  campos.forEach(function (campo) {
    if (disponiveis.length >= RECC_FILTROS_NO_TRABALHO) return;   // mais vira parede de caixas
    var visibilidade = visibilidadeDoCampo_(quem.permissoes, campo.ChaveTecnica);
    if (visibilidade === RECC_VISIBILIDADE.OCULTO) return;

    var descricao = campoParaATela_(campo, canal.id, visibilidade, quem);
    if (descricao.tipo !== 'seletor' || !descricao.opcoes.length) return;

    disponiveis.push({
      chave: descricao.chave,
      cabecalho: descricao.cabecalho,
      rotulo: descricao.rotulo,
      opcoes: descricao.opcoes
    });
  });

  return disponiveis;
}

function aplicarFiltros_(registros, disponiveis, escolhidos) {
  var ativos = disponiveis.filter(function (filtro) {
    return String(escolhidos[filtro.chave] || '').trim() !== '';
  });
  if (!ativos.length) return registros;

  return registros.filter(function (registro) {
    for (var i = 0; i < ativos.length; i++) {
      var esperado = normalizarParaComparar_(escolhidos[ativos[i].chave]);
      if (normalizarParaComparar_(registro[ativos[i].cabecalho]) !== esperado) {
        return false;
      }
    }
    return true;
  });
}

/**
 * A busca digitada do Trabalho: os casos em que o termo aparece.
 *
 * Pedido do PO: "o filtro por busca digitada para cada canal". Procura em
 * DOIS conjuntos de colunas, juntos:
 *
 *   · as que a FILA mostra — quem lê "Endosso urgente" na fila espera achar o
 *     caso digitando "endosso";
 *   · as COLUNAS DA BUSCA do canal (Configurações › Canais de trabalho) — as
 *     mesmas do Buscar Caso: CPF, apólice, protocolo.
 *
 * A comparação é a do Buscar Caso (`casaComOTermo_`): sem acento e sem caixa,
 * e só os dígitos nas colunas de identificador — "123.456.789-01" acha
 * "12345678901". A proposta da fila, que junta código e número, também é
 * procurada inteira: digitar "7-0000123" acha o caso.
 *
 * Procura só no que o período e os filtros já separaram, em memória: a base
 * já foi lida para montar o painel, e procurar de novo na planilha seria
 * pagar a leitura duas vezes.
 */
function aplicarBusca_(registros, canal, termo) {
  if (!termo) return registros;

  var onde = [];
  var jaTem = {};
  function guardar(coluna) {
    var chave = normalizarParaComparar_(coluna.cabecalho);
    if (jaTem[chave]) return;
    jaTem[chave] = true;
    onde.push(coluna);
  }
  colunasDaFila_(canal).forEach(function (grupo) {
    grupo.colunas.forEach(function (coluna) {
      if (coluna.juntar) {
        coluna.juntar.forEach(guardar);
        onde.push({ juntar: coluna.juntar });
      } else {
        guardar(coluna);
      }
    });
  });
  colunasDaBusca_(canal).forEach(guardar);
  // E TODAS as outras colunas do caso (Etapa 44, pedido do PO): "digitando
  // 'aguardando transmissão' não acha os casos" — o Status proposta, criado
  // fora do contrato, não estava na fila nem nas colunas da busca. As técnicas
  // ("_Visivel"…) ficam de fora.
  // Nas colunas de IDENTIFICADOR que entram só por esta regra, a busca vale
  // quando o termo parece um número (CPF, Id, protocolo): elas comparam só os
  // dígitos, e "Caso número 1" acharia o caso de Id 0000000001.
  var termoEhNumero = /^[\d\s.\-\/]+$/.test(String(termo).trim());
  var estrutura = estruturaDaAba_(canal.aba);
  estrutura.cabecalhos.forEach(function (cabecalho, posicao) {
    if (!cabecalho || String(cabecalho).charAt(0) === '_') return;
    var tipo = estrutura.tipos[posicao];
    if (tipo === RECC_TIPO_DE_DADO.IDENTIFICADOR && !termoEhNumero) return;
    guardar({ cabecalho: cabecalho, tipo: tipo });
  });

  return registros.filter(function (registro) {
    return onde.some(function (coluna) {
      if (coluna.juntar) {
        var inteira = coluna.juntar.map(function (pedaco) {
          return String(registro[pedaco.cabecalho] === undefined
            ? '' : registro[pedaco.cabecalho]);
        }).filter(function (texto) { return texto !== ''; }).join('-');
        return casaComOTermo_(inteira, termo, '');
      }
      // Pelo TEXTO da coluna, como a fila mostra, e não pelo valor cru: uma
      // data crua vira "Mon Oct 06 2026…", e buscar "Mon" de "Monkey"
      // acharia todo caso que tem data.
      var valor = coluna.tipo === RECC_TIPO_DE_DADO.IDENTIFICADOR
        ? registro[coluna.cabecalho]
        : paraTexto_(registro[coluna.cabecalho], coluna.tipo);
      return casaComOTermo_(valor, termo, coluna.tipo);
    });
  });
}

// ============================================================================
// OS CARTÕES
// ============================================================================

/**
 * Total, um cartão por situação, e — quando o canal tem as colunas para isso —
 * quantos foram finalizados na própria célula.
 *
 * A contagem por situação sai do CATÁLOGO, e não dos valores encontrados na
 * base: assim uma situação sem nenhum caso aparece com zero, em vez de sumir
 * do painel. Sumir esconde justamente a informação de que ela zerou.
 */
/**
 * A regra de contagem de um cartão, na forma canônica.
 *
 * Existe porque a comparação de textos do sistema ignora acento e caixa: sem
 * este mapa, o servidor devolvia `nacelula` para a tela e recusava o mesmo
 * `nacelula` de volta na hora de salvar. O que sai e o que entra têm de ser a
 * mesma coisa.
 */
function dimensaoDoCartao_(valor) {
  var canonicas = ['total', 'situacao', 'naCelula', 'preenchido', 'valor'];
  var procurado = normalizarParaComparar_(valor);
  for (var i = 0; i < canonicas.length; i++) {
    if (normalizarParaComparar_(canonicas[i]) === procurado) return canonicas[i];
  }
  return '';
}

function contarCartoes_(registros, anteriores, canal, tela) {
  var agora = canal.colunaDoStatus ? contarPorSituacao_(registros, canal) : {};
  var antes = canal.colunaDoStatus ? contarPorSituacao_(anteriores, canal) : {};

  var tons = {};
  situacoesDoCanal_(canal).forEach(function (situacao) {
    tons[situacao.chave] = situacao.tom;
  });

  // Cada cartão sai dizendo a regra pela qual contou (`dimensao`). É com ela que
  // o Trabalho decide se clicar filtra a fila pelo status: só o cartão de
  // status filtra. Antes a tela deduzia pela chave, e um cartão "Já passaram
  // por" clicado filtrava a fila por um status com o nome do cartão — fila
  // vazia, sem erro.
  var existentes = {};
  situacoesDoCanal_(canal).forEach(function (situacao) {
    existentes[normalizarParaComparar_(situacao.gravadoComo)] = true;
  });

  return cartoesDoCanal_(canal, tela).map(function (cartao) {
    // O cartão de um status que NÃO EXISTE MAIS (renomeado ou apagado em Ajustes
    // Gerais) some, em vez de aparecer com zero e parecer um problema da
    // operação. Em Configurações ele aparece marcado, para trocar ou remover.
    if (cartao.dimensao === 'situacao' && !existentes[normalizarParaComparar_(cartao.filtro)]) {
      return null;
    }
    var feito = umCartao(cartao);
    if (feito) {
      feito.dimensao = cartao.dimensao;
      // Clicar filtra a fila pelo que o cartão CONTA (Etapa 44). O "Total" é
      // o desligar; "Finalizados na célula" não é uma regra de linha.
      feito.id = cartao.id;
      feito.filtravel = cartao.dimensao !== 'naCelula';
    }
    return feito;
  }).filter(function (cartao) { return cartao !== null; });

  function umCartao(cartao) {
    if (cartao.dimensao === 'total') {
      return montarCartao_('total', cartao.titulo, registros.length,
        anteriores.length, cartao.cor, '');
    }
    if (cartao.dimensao === 'naCelula') {
      var naCelula = contarFinalizadosNaCelula_(registros, canal);
      if (naCelula === null) return null;
      return montarCartao_('naCelula', cartao.titulo, naCelula,
        contarFinalizadosNaCelula_(anteriores, canal), cartao.cor,
        'Concluídos sem encaminhar para nenhuma área');
    }
    if (cartao.dimensao === 'preenchido') {
      var quantos = contarComColunaPreenchida_(registros, canal, cartao.filtro);
      if (quantos === null) return null;
      return montarCartao_(normalizarParaComparar_(cartao.filtro), cartao.titulo,
        quantos, contarComColunaPreenchida_(anteriores, canal, cartao.filtro),
        cartao.cor, 'Casos com "' + cartao.filtro + '" preenchida');
    }
    if (cartao.dimensao === 'valor') {
      var comOValor = contarComOValor_(registros, canal, cartao.coluna, cartao.filtro);
      if (comOValor === null) return null;
      return montarCartao_('valor:' + normalizarParaComparar_(cartao.coluna) + ':'
        + normalizarParaComparar_(cartao.filtro), cartao.titulo, comOValor,
        contarComOValor_(anteriores, canal, cartao.coluna, cartao.filtro),
        cartao.cor, 'Casos com "' + cartao.coluna + '" igual a "' + cartao.filtro + '"');
    }

    var chave = normalizarParaComparar_(cartao.filtro);
    return montarCartao_(chave, cartao.titulo, agora[chave] || 0,
      antes[chave] || 0, cartao.cor || tons[chave] || 'neutro', '');
  }
}

/**
 * Os casos que um cartão conta — para a fila, quando a pessoa clica nele
 * (Etapa 44). A regra é a MESMA da contagem: o número do cartão e o tamanho da
 * fila filtrada têm de bater. Cartão que não existe (ou o "Total"): a fila
 * inteira.
 */
function filtrarPeloCartao_(registros, canal, idDoCartao) {
  var id = converterParaIdentificador_(idDoCartao);
  if (!id) return registros;
  var cartao = cartoesDoCanal_(canal, 'trabalho').filter(function (um) {
    return converterParaIdentificador_(um.id) === id;
  })[0];
  if (!cartao || cartao.dimensao === 'total' || cartao.dimensao === 'naCelula') return registros;

  var estrutura = estruturaDaAba_(canal.aba);
  var coluna = cartao.dimensao === 'situacao' ? canal.colunaDoStatus
    : (cartao.dimensao === 'valor' ? cartao.coluna : cartao.filtro);
  if (!coluna || posicaoDaColuna_(estrutura, coluna) < 0) return [];
  coluna = grafiaDaColuna_(canal.aba, coluna);

  if (cartao.dimensao === 'preenchido') {
    return registros.filter(function (registro) {
      return String(registro[coluna] === null || registro[coluna] === undefined
        ? '' : registro[coluna]).trim() !== '';
    });
  }
  var procurado = normalizarParaComparar_(cartao.filtro);
  return registros.filter(function (registro) {
    return normalizarParaComparar_(registro[coluna]) === procurado;
  });
}

/**
 * Quantos casos têm ESTE valor nesta coluna — "1ª tentativa de contato sem
 * sucesso" em Tentativa, "Sim" em Abertura indevida.
 *
 * Pedido do PO: os cartões não podiam ficar só no status. É a foto de HOJE,
 * como o cartão de status: o caso que sai do valor sai da conta. O que fica
 * para sempre é o carimbo ("Já passaram por").
 *
 * Compara sem acento e sem caixa, como o resto do sistema. Coluna que não
 * existe na base devolve null e o cartão some, igual ao "preenchido".
 */
function contarComOValor_(registros, canal, cabecalho, valor) {
  var coluna = String(cabecalho || '').trim();
  var procurado = normalizarParaComparar_(valor);
  if (!coluna || !procurado) return null;
  if (posicaoDaColuna_(estruturaDaAba_(canal.aba), coluna) < 0) return null;
  coluna = grafiaDaColuna_(canal.aba, coluna);

  var quantos = 0;
  registros.forEach(function (registro) {
    if (normalizarParaComparar_(registro[coluna]) === procurado) quantos++;
  });
  return quantos;
}

/**
 * Quantos casos têm ESTA coluna preenchida.
 *
 * É o que responde "quantos já contatou". Contar pelo STATUS não responderia:
 * um caso que já passou do "1º contato realizado" e hoje está em "Reteve"
 * continua tendo sido contatado, mas não conta mais em nenhum status. O
 * carimbo, esse, não some — é exatamente para isso que ele existe.
 *
 * Devolve null quando a coluna não existe na base. O cartão some, em vez de
 * aparecer zerado e parecer um problema da operação quando é de instalação.
 */
function contarComColunaPreenchida_(registros, canal, cabecalho) {
  var coluna = String(cabecalho || '').trim();
  if (!coluna) return null;
  if (posicaoDaColuna_(estruturaDaAba_(canal.aba), coluna) < 0) return null;

  var quantos = 0;
  registros.forEach(function (registro) {
    if (String(registro[coluna] === null || registro[coluna] === undefined
      ? '' : registro[coluna]).trim() !== '') quantos++;
  });
  return quantos;
}

/**
 * Os cartões declarados para o Trabalho deste canal, na ordem escolhida.
 *
 * Cada cartão é uma linha de `PAINEIS`, e não um pedaço de texto dentro de
 * `CANAIS`: assim ele tem nome, cor e ordem próprios, e o administrador
 * renomeia "Concluído" para "Resolvido no primeiro contato" sem que isso
 * mexa no que está gravado nos casos.
 *
 * Desligar um cartão só o tira da tela — nenhum caso é tocado.
 *
 * `tela` diz de qual tela são os cartões. O Trabalho tem os dele; a
 * Produtividade RECC tem os dela, que respondem outra pergunta — quantos
 * reteve, quantos contatou — e por isso não são os mesmos. Mesma máquina,
 * duas listas, e as duas se editam em Configurações › Painéis.
 */
function cartoesDoCanal_(canal, tela) {
  var doCanal = converterParaIdentificador_(canal.id);
  var qual = normalizarParaComparar_(tela || 'trabalho');

  return lerRegistros_('PAINEIS')
    .filter(function (linha) {
      if (normalizarParaComparar_(linha.Tela) !== qual) return false;
      if (normalizarParaComparar_(linha.TipoWidget) !== 'cartao') return false;
      if (normalizarParaComparar_(linha.Ativo) !== 'sim') return false;
      return converterParaIdentificador_(linha.CanalId) === doCanal;
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (linha) {
      return {
        id: linha.__id,
        titulo: String(linha.Titulo || ''),
        dimensao: dimensaoDoCartao_(linha.CampoDimensao) || 'total',
        filtro: String(linha.Filtro || ''),
        // Só o cartão "valor" usa: a coluna onde o valor do Filtro é procurado.
        coluna: String(linha.CampoMedida || ''),
        cor: tomValido_(linha.Cor)
      };
    });
}


function contarPorSituacao_(registros, canal) {
  var contagem = {};
  registros.forEach(function (registro) {
    var chave = normalizarParaComparar_(registro[canal.colunaDoStatus]);
    contagem[chave] = (contagem[chave] || 0) + 1;
  });
  return contagem;
}

/**
 * A variação vem como número ou como null.
 *
 * Sem nada no período anterior, NÃO existe variação — mostrar "+100%" porque
 * saiu de zero é ruído que a operação aprende a ignorar, e junto com ele
 * ignora a variação que importa.
 */
function montarCartao_(chave, rotulo, valor, valorAnterior, tom, explicacao) {
  var variacao = null;
  if (valorAnterior > 0) {
    variacao = Math.round(((valor - valorAnterior) / valorAnterior) * 100);
  }
  return {
    chave: chave,
    rotulo: rotulo,
    valor: valor,
    anterior: valorAnterior,
    variacao: variacao,
    tom: tom,
    explicacao: explicacao || ''
  };
}


function situacoesDoCanal_(canal) {
  var doCanal = converterParaIdentificador_(canal.id);
  return lerRegistros_('CATALOGO')
    .filter(function (item) {
      if (normalizarParaComparar_(item.Tipo) !== 'status') return false;
      if (normalizarParaComparar_(item.Ativo) !== 'sim') return false;
      var canalDoItem = converterParaIdentificador_(item.CanalId);
      return !canalDoItem || canalDoItem === doCanal;
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (item) {
      return {
        chave: normalizarParaComparar_(item.Nome),
        // O que a pessoa LÊ é o rótulo; o que está GRAVADO no caso é o nome.
        // Um cartão que apontasse para o rótulo pararia de contar no dia em
        // que alguém trocasse o texto da tela.
        nome: String(item.Rotulo || item.Nome),
        gravadoComo: String(item.Nome),
        tom: tomValido_(item.Cor),
        colunaDeCarimbo: String(item.ColunaDeCarimbo || '').trim(),
        final: normalizarParaComparar_(item.Final) === 'sim'
      };
    });
}

/**
 * Quantas demandas foram resolvidas sem sair da célula.
 *
 * A conta é: finalização preenchida E área responsável vazia. Não é coluna
 * gravada, é conta — assim ela não mente quando alguém edita a área
 * responsável direto na planilha.
 *
 * Devolve null quando o canal não declarou as duas colunas: o cartão não
 * aparece, em vez de aparecer sempre zerado e parecer um problema.
 */
function contarFinalizadosNaCelula_(registros, canal) {
  if (!canal.colunaDaFinalizacao || !canal.colunaDaAreaResponsavel) return null;

  var quantos = 0;
  registros.forEach(function (registro) {
    var finalizado = String(registro[canal.colunaDaFinalizacao] || '').trim() !== '';
    var semArea = String(registro[canal.colunaDaAreaResponsavel] || '').trim() === '';
    if (finalizado && semArea) quantos++;
  });
  return quantos;
}

// ============================================================================
// A FILA
// ============================================================================

/** As colunas que o canal escolheu mostrar na fila. */
/**
 * As colunas da fila, agrupadas.
 *
 * `ColunasDaFila` aceita duas escritas, e a diferença é só o dois-pontos:
 *
 *   plana      Data de entrada, Status, Nome do segurado
 *   agrupada   Situação: Data, Status; Dados cadastrais: Nome, CPF
 *
 * A agrupada existe porque um caso da RET tem trinta e cinco colunas. Seis
 * lado a lado perdem o resto; trinta e cinco não cabem na tela. Juntar as que
 * se leem de uma vez só — proposta com apólice, nome com CPF — resolve as
 * duas coisas.
 *
 * DUAS COLUNAS NUMA LINHA SÓ: "Código origem da proposta + número da
 * proposta" mostra "7-0000000". Pedido do PO para a fila da RET — a proposta
 * inteira em destaque, e não só o número. Os pedaços saem juntos com o hífen,
 * que é como a proposta é escrita no mundo; pedaço vazio não deixa hífen solto.
 *
 * Coluna que não existe na aba é DESCARTADA em silêncio aqui, e não é
 * descuido: a fila é leitura, e derrubar o Trabalho inteiro porque alguém
 * renomeou uma coluna seria pior. Quem cobra o nome errado é Configurações,
 * na hora de salvar o canal.
 */
function colunasDaFila_(canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var declarado = String(canal.colunasDaFila || '');

  // Sem nenhum dois-pontos, é a escrita plana: cada coluna vira um grupo com
  // o próprio nome. É o que faz um canal antigo continuar funcionando igual,
  // sem ninguém precisar reescrever a linha dela na planilha.
  var pedacos = declarado.indexOf(':') < 0
    ? declarado.split(',')
    : declarado.split(';');

  return pedacos
    .map(function (pedaco) { return grupoDaFila_(pedaco, estrutura, canal); })
    .filter(function (grupo) { return grupo && grupo.colunas.length; });
}

/**
 * Uma entrada da lista de um grupo — uma coluna, ou várias juntas com "+".
 * Null quando nenhuma das colunas citadas existe na aba.
 */
function colunaDaFila_(texto, estrutura, canal) {
  var existentes = String(texto || '').split('+')
    .map(function (nome) { return nome.trim(); })
    .filter(function (nome) {
      return nome !== '' && posicaoDaColuna_(estrutura, nome) >= 0;
    })
    .map(function (nome) {
      var posicao = posicaoDaColuna_(estrutura, nome);
      return { cabecalho: estrutura.cabecalhos[posicao], tipo: estrutura.tipos[posicao] };
    });
  if (!existentes.length) return null;

  if (existentes.length === 1) {
    return {
      cabecalho: existentes[0].cabecalho,
      tipo: existentes[0].tipo,
      ehStatus: normalizarParaComparar_(existentes[0].cabecalho)
        === normalizarParaComparar_(canal.colunaDoStatus)
    };
  }
  return {
    cabecalho: existentes.map(function (uma) { return uma.cabecalho; }).join(' + '),
    tipo: existentes[0].tipo,
    ehStatus: false,
    juntar: existentes
  };
}

/** Um pedaço de `ColunasDaFila` vira um grupo com o seu título. */
function grupoDaFila_(pedaco, estrutura, canal) {
  var texto = String(pedaco || '').trim();
  if (!texto) return null;

  var titulo = '';
  var lista = texto;
  var doisPontos = texto.indexOf(':');
  if (doisPontos > 0) {
    titulo = texto.substring(0, doisPontos).trim();
    lista = texto.substring(doisPontos + 1);
  }

  var colunas = lista.split(',')
    .map(function (nome) { return colunaDaFila_(nome, estrutura, canal); })
    .filter(function (coluna) { return coluna !== null; });

  return {
    // Sem título declarado, o grupo se chama como a sua única coluna — é o
    // que faz a escrita plana continuar valendo, sem um segundo caminho.
    titulo: titulo || (colunas.length ? colunas[0].cabecalho : ''),
    colunas: colunas
  };
}


function montarFila_(registros, canal) {
  var grupos = colunasDaFila_(canal);

  // O SLA só existe em canal que declara um. Os status finais e o "agora" são
  // calculados uma vez por fila, e não uma por caso.
  var comSla = Number(canal.slaHorasUteis) > 0;
  var finais = {};
  // Os sinalizadores (RET: 3 dias úteis; Mesa: 48h da área). O relógio é um
  // só por fila, e a leitura da aba também.
  var sinalizadores = sinalizadoresDoCanal_(canal);
  var situacoes = sinalizadores.length ? situacoesPorChave_(canal) : null;
  var agora = (comSla || sinalizadores.length) ? relogioDeParede_(new Date()) : null;

  // A cor de cada situação, para a etiqueta da fila sair pintada. Numa fila
  // de trinta linhas, é a cor que faz "não trabalhado" saltar aos olhos.
  var tons = {};
  situacoesDoCanal_(canal).forEach(function (situacao) {
    tons[situacao.chave] = situacao.tom;
    if (situacao.final) finais[situacao.chave] = true;
  });

  return registros.slice().reverse().map(function (registro) {
    var celulas = grupos.map(function (grupo) {
      return grupo.colunas.map(function (coluna) {
        /*
         * O ALERTA sai do valor que está na base, na hora de montar a fila.
         *
         * No VG são dois: vigência abaixo de 18 meses e margem abaixo de
         * 25,5. O PO pediu vermelho só aqui, nas telas — nunca na célula da
         * planilha. `recado` vem junto porque uma cor sozinha não diz o
         * motivo, e quem chega novo na operação não adivinha.
         */
        var faixa = faixaDaCelula_(canal.aba, coluna.cabecalho,
          registro[coluna.cabecalho]);

        // Colunas juntas ("código + número") saem numa linha só, com hífen.
        var valor = coluna.juntar
          ? coluna.juntar.map(function (pedaco) {
            return paraTexto_(registro[pedaco.cabecalho], pedaco.tipo);
          }).filter(function (texto) { return texto !== ''; }).join('-')
          : paraTexto_(registro[coluna.cabecalho], coluna.tipo);

        return {
          cabecalho: coluna.cabecalho,
          valor: valor,
          ehStatus: coluna.ehStatus,
          // O motivo da cor, para a dica; e a cor: vermelho ("ruim"), amarelo
          // ("atencao") ou verde ("bom") — as duas últimas, só na vigência do VG.
          alerta: faixa ? faixa.recado : '',
          tomDoAlerta: faixa ? faixa.tom : ''
        };
      });
    });
    var situacao = canal.colunaDoStatus
      ? String(registro[canal.colunaDoStatus] || '') : '';
    return {
      id: registro.__id,
      celulas: celulas,
      situacao: situacao,
      tom: tons[normalizarParaComparar_(situacao)] || 'neutro',
      // O SLA, quando o canal declara um (hoje, a Mesa Diamante).
      sla: comSla ? slaDoCaso_(registro, canal, finais, agora) : null,
      // Os sinalizadores deste caso, na ordem da aba. Vazio quando nenhum se
      // aplica — e é o que faz a tela não desenhar nada.
      sinais: sinalizadores.map(function (sinalizador) {
        return sinalDoCaso_(registro, canal, sinalizador, situacoes, agora);
      }).filter(function (sinal) { return sinal !== null; })
    };
  });
}

/**
 * A fila em forma COMPACTA, para atravessar até o navegador.
 *
 * Cada célula ia como um objeto com o nome da coluna, se é status e o alerta —
 * 1,1 KB por caso, quase tudo repetido. Aqui vai só o valor (ou, quando há
 * alerta, [valor, recado, tom]); o nome e o "é status" a tela tira de
 * `colunas`, que já vem na mesma resposta e na mesma ordem. Cinco vezes menor.
 * A tela remonta o formato de antes (`expandirFila`, em Trabalho.html), e o
 * resto do desenho não mudou.
 */
function compactarFila_(fila) {
  return fila.map(function (caso) {
    return {
      id: caso.id,
      v: caso.celulas.map(function (grupo) {
        return grupo.map(function (celula) {
          return celula.alerta || celula.tomDoAlerta
            ? [celula.valor, celula.alerta, celula.tomDoAlerta] : celula.valor;
        });
      }),
      situacao: caso.situacao,
      tom: caso.tom,
      sla: caso.sla,
      sinais: caso.sinais
    };
  });
}

/**
 * Os casos no AMARELO de algum sinalizador — o que o aviso do Trabalho mostra
 * ao entrar no canal. Mesma regra da tela: amarelo e ainda não encerrado.
 *
 * Olha todos os casos que a pessoa enxerga, e não só os da fila que foi para
 * a tela. O relógio e a leitura dos sinalizadores são uma vez só, como na fila.
 */
function casosPertoDeVencer_(registros, canal) {
  var sinalizadores = sinalizadoresDoCanal_(canal);
  if (!sinalizadores.length) return [];
  var situacoes = situacoesPorChave_(canal);
  var agora = relogioDeParede_(new Date());
  return registros.filter(function (registro) {
    return sinalizadores.some(function (sinalizador) {
      var sinal = sinalDoCaso_(registro, canal, sinalizador, situacoes, agora);
      return sinal !== null && sinal.tom === 'atencao' && !sinal.encerrado;
    });
  });
}

/** Os casos com algum prazo já estourado e ainda não encerrados (Etapa 67). */
function casosEstourados_(registros, canal) {
  var sinalizadores = sinalizadoresDoCanal_(canal);
  if (!sinalizadores.length) return [];
  var situacoes = situacoesPorChave_(canal);
  var agora = relogioDeParede_(new Date());
  return registros.filter(function (registro) {
    return sinalizadores.some(function (sinalizador) {
      var sinal = sinalDoCaso_(registro, canal, sinalizador, situacoes, agora);
      return sinal !== null && sinal.tom === 'ruim' && !sinal.encerrado;
    });
  });
}

/*
 * A TELA INICIAL (Etapa 67). Decisões do PO: abre o sistema, para todos, com
 * "Meu dia" (os meus abertos, perto de vencer e estourados), "O dia da
 * operação" (entradas e encerrados hoje, perto de vencer e estourados da
 * equipe — só para quem não tem o alcance restrito aos próprios casos),
 * atalhos e novidades da versão.
 *
 * O PERÍODO é o da abertura do Trabalho — do dia 1 do mês até hoje —, lido do
 * mesmo jeito (registrosDosPeriodos_). É de propósito: o número da tela inicial
 * leva ao Trabalho, e lá ele tem de ser o mesmo.
 */
function resumoDoInicio() {
  var quem = exigirTela_('inicio');
  var periodo = resolverPeriodo_({ tipo: 'intervalo', de: '', ate: '' });   // a abertura
  var hoje = Utilities.formatDate(new Date(), RECC_FUSO_HORARIO, 'yyyy-MM-dd');
  var doDia = function (valor) {
    var data = converterParaData_(valor);
    return !!data && Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd') === hoje;
  };
  var euMesmo = normalizarParaComparar_(quem.usuario.Nome);
  var daOperacao = quem.permissoes.escopo !== 'PROPRIOS';

  var canais = canaisQueEuVejo_(quem).map(function (umCanal) {
    var canal = comAGrafiaDaAba_(umCanal);
    var situacoes = situacoesPorChave_(canal);
    var ehFinal = function (registro) {
      var situacao = situacoes[normalizarParaComparar_(registro[canal.colunaDoStatus])];
      return !!(situacao && situacao.final);
    };
    var registros = filtrarPeloAlcance_(registrosDosPeriodos_(canal, [{ de: periodo.de,
      ate: periodo.ate, guardarSemData: true }]).registros, canal.aba, quem);
    var abertos = registros.filter(function (registro) { return !ehFinal(registro); });
    var responsavel = colunaDoResponsavel_(estruturaDaAba_(canal.aba));
    var meus = abertos.filter(function (registro) {
      return responsavel && normalizarParaComparar_(registro[responsavel]) === euMesmo;
    });

    return {
      id: canal.id,
      nome: canal.nome,
      icone: canal.icone,
      meuDia: {
        abertos: meus.length,
        pertoDeVencer: casosPertoDeVencer_(meus, canal).length,
        estourados: casosEstourados_(meus, canal).length
      },
      operacao: daOperacao ? {
        entradasHoje: canal.colunaDaData ? registros.filter(function (registro) {
          return doDia(registro[canal.colunaDaData]);
        }).length : 0,
        // Encerrado hoje: status Final, com a finalização, o carimbo do próprio
        // status ou a última mudança de status de hoje — num caso encerrado, a
        // última mudança É o encerramento.
        encerradosHoje: registros.filter(function (registro) {
          if (!ehFinal(registro)) return false;
          var situacao = situacoes[normalizarParaComparar_(registro[canal.colunaDoStatus])];
          return (canal.colunaDaFinalizacao && doDia(registro[canal.colunaDaFinalizacao]))
            || (situacao.colunaDeCarimbo && doDia(registro[situacao.colunaDeCarimbo]))
            || doDia(registro[RECC_COLUNA_QUANDO_MUDOU_O_STATUS]);
        }).length,
        abertos: abertos.length,
        pertoDeVencer: casosPertoDeVencer_(abertos, canal).length,
        estourados: casosEstourados_(abertos, canal).length
      } : null
    };
  });

  return {
    usuario: quem.usuario.Nome,
    periodo: periodo.rotulo,
    canais: canais,
    versao: RECC_VERSAO
  };
}

/* ============================================================================
   O SLA EM HORAS ÚTEIS
   ============================================================================
   Pedido do PO para a Mesa Diamante: "não mostra se o caso está dentro da SLA
   de 6 horas úteis. A célula funciona das 08:15 às 18:30". De segunda a
   sexta, escolha dele — e sem feriados, porque o sistema não tem mais a lista.

   A CONTA É FEITA NO RELÓGIO DE PAREDE de São Paulo, em minutos do dia, e não
   em milissegundos: "08:15" é 08:15 em qualquer dia, e misturar fuso com hora
   de planilha (que o Sheets ancora numa data antiga) foi o que já deslocou
   horários em minutos neste sistema.

   COMEÇA na data e hora de entrada. Caso que chega fora do expediente — às
   20h, no sábado — começa a contar na próxima abertura. Sem a hora, conta da
   abertura daquele dia.

   PARA NA PRIMEIRA RESPOSTA — palavra do PO: "a SLA conta até a data da
   primeira resposta". Sem a hora dela, vale a hora guardada junto da data; sem
   nenhuma das duas, o fim do expediente daquele dia.

   SEM RESPOSTA, PARA NO ENCERRAMENTO — decisão do PO, perguntada: caso que foi
   encerrado sem a primeira resposta preenchida para na mudança para o status
   final ou, sem ela, na data da finalização. Senão ficaria "fora do prazo"
   crescendo para sempre, num caso que ninguém mais vai trabalhar. O resto
   conta até agora.
   ============================================================================ */

/** O dia e o minuto do dia, no relógio de São Paulo. */
function relogioDeParede_(data) {
  var texto = Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd HH:mm');
  var partes = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(texto);
  return {
    dia: Math.round(Date.UTC(Number(partes[1]), Number(partes[2]) - 1,
      Number(partes[3])) / 86400000),
    minuto: Number(partes[4]) * 60 + Number(partes[5])
  };
}

/** Os minutos do dia de uma hora da planilha, ou de um texto "14:30". */
function minutoDaHora_(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return isNaN(valor.getTime()) ? null : relogioDeParede_(valor).minuto;
  }
  var partes = /^(\d{1,2}):(\d{2})/.exec(String(valor).trim());
  return partes ? Number(partes[1]) * 60 + Number(partes[2]) : null;
}

/** Minutos ÚTEIS entre dois pontos do relógio — segunda a sexta, no expediente. */
function minutosUteisEntre_(de, ate, abre, fecha) {
  if (ate.dia < de.dia || (ate.dia === de.dia && ate.minuto <= de.minuto)) return 0;
  var total = 0;
  for (var dia = de.dia; dia <= ate.dia; dia++) {
    var semana = new Date(dia * 86400000).getUTCDay();   // 0 domingo, 6 sábado
    if (semana === 0 || semana === 6) continue;
    var inicio = dia === de.dia ? Math.max(abre, de.minuto) : abre;
    var fim = dia === ate.dia ? Math.min(fecha, ate.minuto) : fecha;
    if (fim > inicio) total += fim - inicio;
  }
  return total;
}

/**
 * O ponto do relógio em que o prazo parou: o dia da data e a hora da coluna
 * de hora. Sem a hora, vale a guardada junto da data (quem conclui pelo
 * diálogo grava data e hora numa célula só); sem nenhuma, o fim do expediente.
 */
function pontoDoFim_(data, hora, fecha) {
  var relogio = relogioDeParede_(data);
  var minuto = minutoDaHora_(hora);
  if (minuto === null) minuto = relogio.minuto || fecha;
  return { dia: relogio.dia, minuto: minuto };
}

/*
 * A HORA DA FINALIZAÇÃO, ao lado da data (contrato da Mesa Diamante). Lida
 * pela grafia da planilha; canal sem a coluna usa a hora guardada na própria
 * data, ou o fim do expediente — ver `pontoDoFim_`.
 */
const RECC_COLUNA_HORA_DA_FINALIZACAO = 'horário da finalização';

/**
 * Quando o caso foi FINALIZADO, pela data e hora que estão na planilha — ou
 * null, sem a data.
 *
 * Etapa 58, pedido do PO: "o que deve prevalecer sempre é, se houver data e
 * hora de finalização, ela; na ausência, o status concluído e o carimbo da
 * data em que foi salvo. Caso seja ajustada depois, a data e hora da
 * finalização deve prevalecer". Antes valia a data da última mudança de
 * status — o dia em que alguém SALVOU —, e caso finalizado no prazo e
 * registrado depois aparecia como estourado.
 */
function pontoDaFinalizacao_(registro, canal, fecha) {
  if (!canal.colunaDaFinalizacao) return null;
  var data = converterParaDataEHora_(registro[canal.colunaDaFinalizacao]);
  if (!data) return null;
  var colunaDaHora = grafiaDaColuna_(canal.aba, RECC_COLUNA_HORA_DA_FINALIZACAO);
  return pontoDoFim_(data, registro[colunaDaHora], fecha);
}

/**
 * O canal FECHA o caso pela finalização? Sim quando algum status final carimba
 * a coluna de finalização do canal — na Mesa, Concluído e Concluído na mesa
 * carimbam a "Data da finalização". Na RET a coluna de finalização é a "data da
 * transmissão", que nenhum desfecho carimba: lá nada muda.
 */
function fechaPelaFinalizacao_(canal, situacoes) {
  if (!canal.colunaDaFinalizacao) return false;
  var finalizacao = normalizarParaComparar_(canal.colunaDaFinalizacao);
  return Object.keys(situacoes || {}).some(function (chave) {
    var situacao = situacoes[chave];
    return situacao.final && normalizarParaComparar_(situacao.colunaDeCarimbo) === finalizacao;
  });
}

/** "2h10", "45min", e a partir de um expediente inteiro, "3 dias úteis". */
function duracaoParaLer_(minutos, expediente) {
  if (minutos >= expediente) {
    var dias = Math.floor(minutos / expediente);
    return dias + (dias === 1 ? ' dia útil' : ' dias úteis');
  }
  if (minutos < 60) return minutos + 'min';
  var horas = Math.floor(minutos / 60);
  var resto = minutos % 60;
  return horas + 'h' + (resto ? (resto < 10 ? '0' : '') + resto : '');
}

/**
 * O SLA de um caso, pronto para o selo da fila — ou null, quando não dá para
 * contar (sem data de entrada, ou canal sem expediente válido).
 */
function slaDoCaso_(registro, canal, finais, agora) {
  var abre = minutoDaHora_(canal.inicioDoExpediente);
  var fecha = minutoDaHora_(canal.fimDoExpediente);
  if (abre === null || fecha === null || fecha <= abre) return null;

  var entrada = converterParaData_(registro[canal.colunaDaData]);
  if (!entrada) return null;
  var horaDaEntrada = canal.colunaDaHora
    ? minutoDaHora_(registro[canal.colunaDaHora]) : null;
  var de = {
    dia: relogioDeParede_(entrada).dia,
    minuto: horaDaEntrada === null ? abre : horaDaEntrada
  };

  // Onde o prazo parou: na primeira resposta, no encerramento ou em lugar
  // nenhum ainda ("agora"). A tela usa para explicar o selo na dica.
  var ate = agora;
  var parouEm = 'agora';
  var resposta = canal.colunaDaPrimeiraResposta
    ? converterParaData_(registro[canal.colunaDaPrimeiraResposta]) : '';
  if (resposta) {
    parouEm = 'resposta';
    ate = pontoDoFim_(resposta, canal.colunaDaHoraDaPrimeiraResposta
      ? registro[canal.colunaDaHoraDaPrimeiraResposta] : '', fecha);
  } else {
    var situacao = canal.colunaDoStatus
      ? normalizarParaComparar_(registro[canal.colunaDoStatus]) : '';
    var mudou = converterParaDataEHora_(registro[RECC_COLUNA_QUANDO_MUDOU_O_STATUS]);
    // A data e hora da finalização vêm antes da mudança de status: é o que o
    // analista informou, e não o dia em que alguém salvou (Etapa 58).
    var finalizado = pontoDaFinalizacao_(registro, canal, fecha);
    if (finalizado) {
      parouEm = 'encerramento';
      ate = finalizado;
    } else if (finais[situacao] && mudou) {
      parouEm = 'encerramento';
      ate = relogioDeParede_(mudou);
    }
  }
  var parou = parouEm !== 'agora';

  var prazo = Math.round(Number(canal.slaHorasUteis) * 60);
  var gasto = minutosUteisEntre_(de, ate, abre, fecha);
  var expediente = fecha - abre;
  var dentro = gasto <= prazo;

  var texto;
  if (parou) {
    texto = dentro ? 'SLA cumprido · em ' + duracaoParaLer_(gasto, expediente)
      : 'SLA estourado · ' + duracaoParaLer_(gasto - prazo, expediente) + ' além';
  } else {
    texto = dentro ? 'No prazo · faltam ' + duracaoParaLer_(prazo - gasto, expediente)
      : 'Fora do prazo · ' + duracaoParaLer_(gasto - prazo, expediente) + ' além';
  }
  return {
    dentro: dentro,
    parou: parou,
    parouEm: parouEm,
    tom: dentro ? 'bom' : 'ruim',
    texto: texto,
    minutosUteis: gasto,
    prazo: prazo
  };
}


/* ============================================================================
   OS SINALIZADORES DE PRAZO
   ============================================================================
   Pedido do PO: "um sinalizador de caso, na aba Trabalho e na Produtividade
   RECC". Na RET, o caso cadastrado tem 3 dias úteis para chegar a um status
   final; na Mesa, o caso tem 48 horas úteis, do status Em andamento até ser
   concluído.

   É o mesmo relógio do SLA da Mesa — minutos ÚTEIS, de segunda a sexta, dentro
   do expediente —, e por isso reaproveita as mesmas contas. O que muda é o que
   cada sinalizador declara na aba SINALIZADORES: quando vale, desde quando
   conta, quanto tempo tem e quando o amarelo acende. Nada disso é escrito
   aqui; o PO ajusta em Configurações › Sinalizadores.

   AS TRÊS CORES
     verde      dentro do prazo, com folga;
     amarelo    dentro do prazo, mas faltando pouco — por padrão, o último dia
                útil. Na RET: dias 1 e 2 verdes, dia 3 amarelo;
     vermelho   passou do prazo.
   "Faltando pouco" é uma MARGEM, e não "exatamente 3 dias": em tempo corrido
   o instante exato dura um minuto, e o amarelo nunca apareceria. Foi o PO quem
   escolheu esta leitura, perguntado.

   ATÉ QUANDO conta: até o caso chegar a um status FINAL — a lista de status
   finais do canal, que já existe. Parou, o selo vira "cumprido" (verde) ou
   "estourado" (vermelho): não é mais um aviso do que está correndo, é o
   resultado. Caso final sem nenhuma data de quando fechou — os antigos, de
   antes do carimbo — não ganha selo: não dá para dizer se cumpriu, e inventar
   vermelho em milhares de casos encerrados ensinaria a ignorar o vermelho.
   ============================================================================ */

/** Os sinalizadores LIGADOS de um canal, prontos para contar. */
function sinalizadoresDoCanal_(canal) {
  // A aba é nova: quem ainda não rodou `atualizarPGO()` segue com o Trabalho
  // funcionando, sem selo, em vez de uma tela que estoura.
  if (!planilhaAtiva_().getSheetByName('SINALIZADORES')) return [];

  var doCanal = converterParaIdentificador_(canal.id);
  return lerRegistros_('SINALIZADORES')
    .filter(function (linha) {
      return converterParaIdentificador_(linha.CanalId) === doCanal
        && normalizarParaComparar_(linha.Ativo) === 'sim';
    })
    .map(sinalizadorDaLinha_)
    .filter(function (sinalizador) { return sinalizador.prazo > 0; })
    .sort(function (um, outro) { return um.ordem - outro.ordem; })
    .map(function (sinalizador) { return colunasDoSinalizadorPelaGrafia_(sinalizador, canal); })
    .map(function (sinalizador) {
      // O prazo que conta da PRIMEIRA MUDANÇA DE STATUS fica cheio enquanto o
      // caso não sai do status em que nasce. Para saber qual é esse status,
      // uma leitura por canal, e não uma por caso.
      if (normalizarParaComparar_(sinalizador.colunaDaData)
        === normalizarParaComparar_(RECC_COLUNA_DATA_DA_PRIMEIRA_MUDANCA_DE_STATUS)) {
        sinalizador.statusDeNascimento = normalizarParaComparar_(statusPadraoDoCanal_(canal));
      }
      return sinalizador;
    });
}

/**
 * Os sinalizadores do canal que têm CONDIÇÃO DE PARADA — ligados ou não.
 *
 * Quem carimba a condição precisa enxergar também o sinalizador desligado:
 * o PO que o desliga por uma semana e o religa não pode encontrar os casos
 * dessa semana sem a data em que a proposta foi transmitida.
 */
function condicoesDeParadaDoCanal_(canal) {
  if (!planilhaAtiva_().getSheetByName('SINALIZADORES')) return [];
  var doCanal = converterParaIdentificador_(canal.id);
  return lerRegistros_('SINALIZADORES')
    .filter(function (linha) { return converterParaIdentificador_(linha.CanalId) === doCanal; })
    .map(sinalizadorDaLinha_)
    .filter(temCondicaoDeParada_)
    .map(function (sinalizador) { return colunasDoSinalizadorPelaGrafia_(sinalizador, canal); });
}

/**
 * As colunas que o sinalizador cita, pela grafia da planilha do canal — ver
 * `grafiaDaColuna_`. Sem isto, "Status proposta" escrito de outro jeito na
 * aba faria o Retido nunca encerrar o prazo, sem erro nenhum.
 */
function colunasDoSinalizadorPelaGrafia_(sinalizador, canal) {
  ['colunaQueLiga', 'colunaDaData', 'colunaDaHora', 'colunaDaCondicao',
    'colunaDaDataDaCondicao'].forEach(function (chave) {
    if (sinalizador[chave]) sinalizador[chave] = grafiaDaColuna_(canal.aba, sinalizador[chave]);
  });
  return sinalizador;
}

/** Uma linha da aba vira o sinalizador com as contas já resolvidas. */
function sinalizadorDaLinha_(linha) {
  var abre = minutoDaHora_(linha.InicioDoExpediente);
  var fecha = minutoDaHora_(linha.FimDoExpediente);
  // Expediente em branco, ilegível ou que termina antes de começar volta ao
  // padrão: contar com ele quebrado zeraria todos os prazos.
  if (abre === null || fecha === null || fecha <= abre) {
    abre = minutoDaHora_(RECC_EXPEDIENTE_PADRAO.abre);
    fecha = minutoDaHora_(RECC_EXPEDIENTE_PADRAO.fecha);
  }
  return {
    id: linha.__id,
    canalId: converterParaIdentificador_(linha.CanalId),
    nome: String(linha.Nome || '').trim() || 'Prazo',
    prazo: Math.max(0, Number(linha.Prazo) || 0),
    unidade: normalizarParaComparar_(linha.Unidade).indexOf('hora') === 0 ? 'horas' : 'dias',
    aviso: Math.max(0, Number(linha.AvisoFaltando) || 0),
    colunaQueLiga: String(linha.ColunaQueLiga || '').trim(),
    colunaDaData: String(linha.ColunaDaData || '').trim(),
    colunaDaHora: String(linha.ColunaDaHora || '').trim(),
    inicioDoExpediente: horaDoMinuto_(abre),
    fimDoExpediente: horaDoMinuto_(fecha),
    abre: abre,
    fecha: fecha,
    ordem: Number(linha.Ordem) || 0,
    ativo: normalizarParaComparar_(linha.Ativo) === 'sim',
    // O status que só encerra o prazo com uma condição ("Retido" só com o
    // Status proposta Transmitido ou Sem alteração). Os quatro vazios: não há.
    statusComCondicao: String(linha.StatusComCondicao || '').trim(),
    colunaDaCondicao: String(linha.ColunaDaCondicao || '').trim(),
    valoresDaCondicao: valoresDaCondicaoDoSinalizador_(linha.ValoresDaCondicao),
    colunaDaDataDaCondicao: String(linha.ColunaDaDataDaCondicao || '').trim()
  };
}

/** "Transmitido; Sem alteração" → ['Transmitido', 'Sem alteração']. */
function valoresDaCondicaoDoSinalizador_(texto) {
  return String(texto === undefined || texto === null ? '' : texto).split(';')
    .map(function (valor) { return valor.trim(); })
    .filter(function (valor) { return valor !== ''; });
}

/** O sinalizador tem condição de parada? (Os quatro campos, juntos.) */
function temCondicaoDeParada_(sinalizador) {
  return !!(sinalizador.statusComCondicao && sinalizador.colunaDaCondicao
    && sinalizador.valoresDaCondicao.length && sinalizador.colunaDaDataDaCondicao);
}

/** O valor da coluna da condição é um dos que encerram o prazo? */
function condicaoDeParadaCumprida_(sinalizador, registro) {
  return condicaoBate_({ valores: sinalizador.valoresDaCondicao },
    registro[sinalizador.colunaDaCondicao]);
}

/** 495 → "08:15". */
function horaDoMinuto_(minutos) {
  var horas = Math.floor(minutos / 60);
  var resto = minutos % 60;
  return (horas < 10 ? '0' : '') + horas + ':' + (resto < 10 ? '0' : '') + resto;
}

/** Um dia útil, em minutos, no expediente deste sinalizador. */
function minutosDeUmaUnidade_(sinalizador) {
  return sinalizador.unidade === 'dias' ? sinalizador.fecha - sinalizador.abre : 60;
}

/**
 * "1 dia útil", "2 dias úteis e 3h", "35h", "20min".
 *
 * Prazo em HORAS fala em horas: quem pediu "48 horas úteis" lê "faltam 46h30",
 * e não "4 dias úteis e 5h" — que obrigaria a refazer a conta de cabeça com
 * um dia de 10h15.
 */
function duracaoDoPrazo_(minutos, expediente, emHoras) {
  if (emHoras) return duracaoParaLer_(minutos, Number.MAX_VALUE);
  if (minutos < 60) return minutos + 'min';
  if (minutos < expediente) return duracaoParaLer_(minutos, expediente);
  var dias = Math.floor(minutos / expediente);
  var horas = Math.floor((minutos - dias * expediente) / 60);
  return dias + (dias === 1 ? ' dia útil' : ' dias úteis') + (horas ? ' e ' + horas + 'h' : '');
}

/** A regra por extenso, para a tela de Configurações e a Produtividade. */
function regraDoSinalizador_(sinalizador) {
  var unidade = sinalizador.unidade === 'dias' ? 'dia útil' : 'hora útil';
  var plural = sinalizador.unidade === 'dias' ? 'dias úteis' : 'horas úteis';
  function quanto(n) {
    return String(n).replace('.', ',') + ' ' + (n === 1 ? unidade : plural);
  }
  return quanto(sinalizador.prazo)
    + (sinalizador.aviso > 0 ? ' · amarelo quando faltar ' + quanto(sinalizador.aviso) : '')
    + (normalizarParaComparar_(sinalizador.colunaDaData)
      === normalizarParaComparar_(RECC_COLUNA_DATA_DA_PRIMEIRA_MUDANCA_DE_STATUS)
      ? ' · conta da primeira mudança de status (antes dela, prazo cheio)' : '')
    + (sinalizador.colunaQueLiga
      ? ' · só com "' + sinalizador.colunaQueLiga + '" preenchida' : '')
    + (temCondicaoDeParada_(sinalizador)
      ? ' · "' + sinalizador.statusComCondicao + '" só encerra quando "'
        + sinalizador.colunaDaCondicao + '" for ' + sinalizador.valoresDaCondicao.join(' ou ')
      : '');
}

/**
 * O sinalizador de UM caso — ou null, quando não se aplica ou não dá para
 * contar. `situacoes` é o catálogo do canal por chave: de lá sai se o status é
 * final e em que coluna ele carimba.
 */
function sinalDoCaso_(registro, canal, sinalizador, situacoes, agora) {
  // QUANDO VALE
  if (sinalizador.colunaQueLiga && String(
    registro[sinalizador.colunaQueLiga] === undefined ? '' : registro[sinalizador.colunaQueLiga]
  ).trim() === '') return null;

  // DESDE QUANDO. Sem coluna própria, a data e a hora de entrada do canal.
  var colunaDaData = sinalizador.colunaDaData || canal.colunaDaData;
  var colunaDaHora = sinalizador.colunaDaHora
    || (sinalizador.colunaDaData ? '' : canal.colunaDaHora);
  var inicio = colunaDaData ? converterParaData_(registro[colunaDaData]) : '';
  if (!inicio) return prazoQueNaoComecou_(registro, canal, sinalizador);

  var relogio = relogioDeParede_(inicio);
  var minutoDaHora = colunaDaHora ? minutoDaHora_(registro[colunaDaHora]) : null;
  var de = {
    dia: relogio.dia,
    // Sem hora declarada, vale a que a própria data carrega (o carimbo do
    // encaminhamento é data E hora); só data pura começa na abertura do dia.
    minuto: minutoDaHora !== null ? minutoDaHora : (relogio.minuto > 0 ? relogio.minuto : sinalizador.abre)
  };

  // ATÉ QUANDO: o status final — e, no status que declarou uma CONDIÇÃO, só
  // quando a condição vale. Na RET, "Retido" é um desfecho, mas só encerra o
  // prazo quando a proposta foi transmitida (ou não precisou mudar); antes
  // disso o relógio segue correndo, e é o que o PO pediu.
  var situacao = canal.colunaDoStatus
    ? situacoes[normalizarParaComparar_(registro[canal.colunaDoStatus])] : null;
  var comCondicao = temCondicaoDeParada_(sinalizador) && canal.colunaDoStatus
    && normalizarParaComparar_(registro[canal.colunaDoStatus])
      === normalizarParaComparar_(sinalizador.statusComCondicao);
  var encerrado = comCondicao
    ? condicaoDeParadaCumprida_(sinalizador, registro)
    : !!(situacao && situacao.final);
  var ate = agora;
  if (encerrado) {
    // Quando parou: pela condição, é o carimbo dela; pelo status, a última
    // mudança de status ou o carimbo do próprio status.
    // No canal que fecha pela finalização (a Mesa), a data e hora da
    // finalização vêm ANTES de tudo: é o que o analista informou (Etapa 58).
    var quandoFechou;
    var finalizado = !comCondicao && fechaPelaFinalizacao_(canal, situacoes)
      ? pontoDaFinalizacao_(registro, canal, sinalizador.fecha) : null;
    if (finalizado) {
      ate = finalizado;
    } else {
      if (comCondicao) {
        quandoFechou = converterParaDataEHora_(registro[sinalizador.colunaDaDataDaCondicao]);
      } else {
        var mudou = converterParaDataEHora_(registro[RECC_COLUNA_QUANDO_MUDOU_O_STATUS]);
        var carimbo = situacao.colunaDeCarimbo
          ? converterParaDataEHora_(registro[situacao.colunaDeCarimbo]) : '';
        quandoFechou = mudou || carimbo;
      }
      if (!quandoFechou) return null;
      ate = relogioDeParede_(quandoFechou);
    }
  }

  var porUnidade = minutosDeUmaUnidade_(sinalizador);
  var prazo = Math.round(sinalizador.prazo * porUnidade);
  var aviso = Math.round(sinalizador.aviso * porUnidade);
  var gasto = minutosUteisEntre_(de, ate, sinalizador.abre, sinalizador.fecha);
  var expediente = sinalizador.fecha - sinalizador.abre;
  var dentro = gasto <= prazo;
  var emHoras = sinalizador.unidade === 'horas';

  var tom, resto;
  if (encerrado) {
    tom = dentro ? 'bom' : 'ruim';
    resto = dentro ? 'cumprido em ' + duracaoDoPrazo_(gasto, expediente, emHoras)
      : 'estourado, ' + duracaoDoPrazo_(gasto - prazo, expediente, emHoras) + ' além';
  } else if (!dentro) {
    tom = 'ruim';
    resto = duracaoDoPrazo_(gasto - prazo, expediente, emHoras) + ' além do prazo';
  } else if (prazo - gasto <= aviso) {
    tom = 'atencao';
    // Exatamente no limite (ex.: a sexta fechou e o prazo acabou junto): o
    // próximo minuto de expediente já estoura. "vence em 0min" leria como erro.
    resto = prazo - gasto <= 0 ? 'no limite do prazo'
      : 'vence em ' + duracaoDoPrazo_(prazo - gasto, expediente, emHoras);
  } else {
    tom = 'bom';
    resto = 'faltam ' + duracaoDoPrazo_(prazo - gasto, expediente, emHoras);
  }

  return {
    id: sinalizador.id,
    nome: sinalizador.nome,
    tom: tom,
    texto: sinalizador.nome + ' · ' + resto,
    regra: regraDoSinalizador_(sinalizador),
    dentro: dentro,
    encerrado: encerrado,
    alem: dentro ? 0 : gasto - prazo,
    expediente: expediente
  };
}

/**
 * O selo do caso cujo prazo AINDA NÃO COMEÇOU: "Prazo de retorno · prazo cheio,
 * 3 dias úteis". Ou null, quando não é o caso.
 *
 * Só vale para o sinalizador que conta da primeira mudança de status (o da RET)
 * e para o caso que continua no status em que nasce — "casos não trabalhados
 * ficam com a SLA cheia", palavra do PO. Caso em outro status sem a data (uma
 * linha antiga que ninguém soube datar) fica sem selo, como sempre: dizer
 * "prazo cheio" para ele seria mentir.
 */
function prazoQueNaoComecou_(registro, canal, sinalizador) {
  if (sinalizador.statusDeNascimento === undefined || !canal.colunaDoStatus) return null;
  var status = normalizarParaComparar_(registro[canal.colunaDoStatus]);
  if (status && status !== sinalizador.statusDeNascimento) return null;

  var expediente = sinalizador.fecha - sinalizador.abre;
  var prazo = Math.round(sinalizador.prazo * minutosDeUmaUnidade_(sinalizador));
  return {
    id: sinalizador.id,
    nome: sinalizador.nome,
    tom: 'bom',
    texto: sinalizador.nome + ' · prazo cheio, '
      + duracaoDoPrazo_(prazo, expediente, sinalizador.unidade === 'horas'),
    regra: regraDoSinalizador_(sinalizador),
    dentro: true,
    encerrado: false,
    naoComecou: true,
    alem: 0,
    expediente: expediente
  };
}

/** Os status do canal por chave, para o sinalizador saber o que é final. */
function situacoesPorChave_(canal) {
  var porChave = {};
  situacoesDoCanal_(canal).forEach(function (situacao) {
    // O carimbo pela grafia da planilha: é lido caso a caso pelo sinalizador.
    if (situacao.colunaDeCarimbo) {
      situacao.colunaDeCarimbo = grafiaDaColuna_(canal.aba, situacao.colunaDeCarimbo);
    }
    porChave[situacao.chave] = situacao;
  });
  return porChave;
}

/** O texto que identifica o caso numa lista: a 1ª coluna do 2º grupo da fila. */
function rotuloDoCasoNaFila_(registro, grupos) {
  var grupo = grupos.length > 1 ? grupos[1] : grupos[0];
  var coluna = grupo && grupo.colunas[0];
  if (!coluna) return String(registro.__id || '');
  var valor = coluna.juntar
    ? coluna.juntar.map(function (pedaco) {
      return paraTexto_(registro[pedaco.cabecalho], pedaco.tipo);
    }).filter(function (texto) { return texto !== ''; }).join('-')
    : paraTexto_(registro[coluna.cabecalho], coluna.tipo);
  return valor || String(registro.__id || '');
}

/** Quantos casos cabem na lista da Produtividade; o resto vira "e mais N". */
const RECC_MAXIMO_NA_LISTA_DE_PRAZOS = 50;

/**
 * O resumo de prazos que a Produtividade RECC mostra: quantos estão em cada
 * cor, QUAIS casos passaram do prazo e de QUEM — "o nome do analista que
 * deixou estourar", palavra do PO.
 *
 * `avaliados` é uma lista de { registro, tom, encerrado, alem }: vale tanto
 * para o sinalizador quanto para o SLA da Mesa, que é o mesmo desenho.
 */
function resumirPrazos_(avaliados, canal, expediente, emHoras) {
  var grupos = colunasDaFila_(canal);
  var colunaDoAnalista = colunaDoResponsavel_(estruturaDaAba_(canal.aba));
  var r = { total: avaliados.length, noPrazo: 0, atencao: 0, fora: 0,
    cumpridos: 0, estourados: 0, lista: [], maisCasos: 0, porAnalista: [] };

  var passaram = [];
  avaliados.forEach(function (um) {
    if (um.tom === 'ruim') {
      if (um.encerrado) r.estourados++; else r.fora++;
      passaram.push(um);
    } else if (um.encerrado) {
      r.cumpridos++;
    } else if (um.tom === 'atencao') {
      r.atencao++;
    } else {
      r.noPrazo++;
    }
  });

  passaram.sort(function (um, outro) { return outro.alem - um.alem; });
  r.maisCasos = Math.max(0, passaram.length - RECC_MAXIMO_NA_LISTA_DE_PRAZOS);
  var quem = {};
  passaram.forEach(function (um, i) {
    var nome = colunaDoAnalista ? String(um.registro[colunaDoAnalista] || '').trim() : '';
    nome = nome || 'Sem analista';
    var linha = quem[nome] = quem[nome] || { analista: nome, fora: 0, estourados: 0, total: 0 };
    if (um.encerrado) linha.estourados++; else linha.fora++;
    linha.total++;
    if (i < RECC_MAXIMO_NA_LISTA_DE_PRAZOS) {
      r.lista.push({
        id: um.registro.__id,
        caso: rotuloDoCasoNaFila_(um.registro, grupos),
        analista: nome,
        situacao: canal.colunaDoStatus ? String(um.registro[canal.colunaDoStatus] || '') : '',
        encerrado: um.encerrado,
        alem: duracaoDoPrazo_(um.alem, expediente, emHoras)
      });
    }
  });
  r.porAnalista = Object.keys(quem).map(function (nome) { return quem[nome]; })
    .sort(function (um, outro) {
      return outro.total - um.total || um.analista.localeCompare(outro.analista);
    });
  return r;
}

/**
 * O controle de prazos da Produtividade RECC: o SLA do canal, quando ele tem,
 * e cada sinalizador ligado. `null` quando o canal não tem nenhum dos dois — e
 * aí a tela não desenha o bloco.
 */
function controleDePrazos_(casos, canal) {
  var situacoes = situacoesPorChave_(canal);
  var finais = {};
  Object.keys(situacoes).forEach(function (chave) {
    if (situacoes[chave].final) finais[chave] = true;
  });
  var agora = relogioDeParede_(new Date());

  var sla = null;
  if (Number(canal.slaHorasUteis) > 0) {
    var abre = minutoDaHora_(canal.inicioDoExpediente);
    var fecha = minutoDaHora_(canal.fimDoExpediente);
    var contados = [];
    var semConta = 0;
    casos.forEach(function (registro) {
      var um = slaDoCaso_(registro, canal, finais, agora);
      if (!um) { semConta++; return; }
      contados.push({ registro: registro, tom: um.tom, encerrado: um.parou,
        alem: Math.max(0, um.minutosUteis - um.prazo) });
    });
    sla = resumirPrazos_(contados, canal,
      (fecha !== null && abre !== null) ? fecha - abre : 615, true);
    sla.nome = 'SLA de ' + String(Number(canal.slaHorasUteis)).replace('.', ',')
      + ' horas úteis';
    sla.semConta = semConta;
  }

  var sinalizadores = sinalizadoresDoCanal_(canal).map(function (sinalizador) {
    var avaliados = [];
    var semPrazo = 0;
    casos.forEach(function (registro) {
      var um = sinalDoCaso_(registro, canal, sinalizador, situacoes, agora);
      if (um) avaliados.push({ registro: registro, tom: um.tom, encerrado: um.encerrado, alem: um.alem });
    });
    semPrazo = casos.length - avaliados.length;
    var resumo = resumirPrazos_(avaliados, canal, sinalizador.fecha - sinalizador.abre,
      sinalizador.unidade === 'horas');
    resumo.id = sinalizador.id;
    resumo.nome = sinalizador.nome;
    resumo.regra = regraDoSinalizador_(sinalizador);
    resumo.semPrazo = semPrazo;
    return resumo;
  });

  if (!sla && !sinalizadores.length) return null;
  return { sla: sla, sinalizadores: sinalizadores };
}


/**
 * O valor pronto para a tela.
 *
 * Data vira texto AQUI, no servidor. Um objeto de data atravessando a ponte
 * para o navegador chega com o fuso de quem abriu, e o mesmo caso apareceria
 * com dias diferentes para pessoas diferentes.
 */
function paraTexto_(valor, tipo) {
  if (valor === null || valor === undefined || valor === '') return '';

  if (tipo === RECC_TIPO_DE_DADO.DATA) {
    var data = converterParaData_(valor);
    return data ? Utilities.formatDate(data, RECC_FUSO_HORARIO, 'dd/MM/yyyy') : '';
  }
  if (tipo === RECC_TIPO_DE_DADO.HORA) {
    var hora = converterParaHora_(valor);
    return hora ? Utilities.formatDate(hora, RECC_FUSO_HORARIO, 'HH:mm') : '';
  }
  if (tipo === RECC_TIPO_DE_DADO.DATA_HORA) {
    var momento = converterParaDataEHora_(valor);
    return momento
      ? Utilities.formatDate(momento, RECC_FUSO_HORARIO, 'dd/MM/yyyy HH:mm') : '';
  }
  if (tipo === RECC_TIPO_DE_DADO.DINHEIRO) {
    var numero = converterParaNumero_(valor);
    if (numero === '') return '';
    return 'R$ ' + numero.toFixed(2).replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d)(?=,))/g, '.');
  }

  /*
   * NÚMERO sai em português: vírgula no decimal.
   *
   * Isto caía no `String(valor)` e a margem de contribuição aparecia na fila
   * como "19.8". Nenhum canal tinha mostrado antes: a RET só tem número
   * inteiro na fila, e inteiro sai igual nos dois idiomas. O VG foi o
   * primeiro com decimal, e o defeito estava ali desde sempre.
   *
   * Sem casas fixas: 27 continua "27", e não "27,00". A coluna guarda tanto
   * quantidade de vidas quanto porcentagem, e forçar duas casas encheria a
   * fila de zeros que não dizem nada.
   */
  if (tipo === RECC_TIPO_DE_DADO.NUMERO) {
    var quanto = converterParaNumero_(valor);
    if (quanto === '') return '';
    return String(quanto).replace('.', ',');
  }

  return String(valor);
}

/* ############################################################################
   #
   #  SEÇÃO 2 de 3 · OS GRÁFICOS DA OPERAÇÃO
   #
   ############################################################################ */

/**
 * ============================================================================
 * Os números por trás da operação
 * ============================================================================
 * O Trabalho responde "o que eu tenho que trabalhar hoje". Esta tela responde
 * outra pergunta: "o que está acontecendo na operação". São coisas diferentes,
 * e por isso são telas diferentes.
 *
 * NADA AQUI É ESCRITO EM CÓDIGO. Cada gráfico é uma linha da aba `PAINEIS`:
 * o tipo, o campo que vira eixo, o que se mede, o limite do TOP N e a ordem.
 * Acrescentar um gráfico é acrescentar uma linha, em Configurações.
 *
 * DUAS REGRAS DE LEITURA que o código obedece, e que valem a pena entender:
 *
 *   UM EIXO SÓ. "Barras com linha" não são duas escalas no mesmo gráfico —
 *   isso faz a mesma altura significar duas coisas, e é o erro mais comum de
 *   gráfico que existe. Aqui a linha é a MÉDIA MÓVEL da própria barra, na
 *   mesma escala: ela mostra a tendência por cima do ruído do dia a dia.
 *
 *   COR SEGUE A ENTIDADE, NUNCA A POSIÇÃO. "Concluído" é verde porque o
 *   catálogo diz que é, e continua verde quando um filtro o joga do primeiro
 *   para o quarto lugar. Cor por posição faria o gráfico inteiro se repintar
 *   a cada filtro, e ninguém conseguiria comparar duas telas.
 * ============================================================================
 */

/** Os tipos de gráfico que a tela sabe desenhar. */
const RECC_TIPOS_DE_GRAFICO = {
  pizza: 'Pizza',
  barras: 'Barras em pé',
  barrasDeitadas: 'Barras deitadas',
  linha: 'Linha',
  barrasComLinha: 'Barras com linha de tendência'
};

/** Como se mede. */
const RECC_AGREGACOES = {
  contagem: 'Contagem de casos',
  soma: 'Soma de um valor',
  media: 'Média de um valor'
};

/**
 * Quantos valores um gráfico da Produtividade RECC mostra: os 5 maiores (Etapa
 * 53, pedido do PO: "tirar dos gráficos os demais valores. Deve aparecer somente
 * o top 5 de cada tópico"). O resto NÃO vira uma fatia "Demais valores" — sai
 * do gráfico, e o rodapé avisa que a soma e as porcentagens são entre os
 * mostrados. Um gráfico com limite menor (TOP 3) fica com o dele.
 */
const RECC_TOPO_DOS_GRAFICOS = 5;

/**
 * As três colunas de prêmio da RET (Etapa 46): anual = "valor do prêmio",
 * mensal = "prêmio mensal", retido = "valor do prêmio retido". `null` quando o
 * canal não tem as três — e aí nada disto aparece (hoje, só a RET tem).
 */
function colunasDosPremios_(canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var achar = function (nome) {
    var posicao = posicaoDaColuna_(estrutura, nome);
    return posicao < 0 ? '' : estrutura.cabecalhos[posicao];
  };
  var colunas = { anual: achar('valor do prêmio'), mensal: achar('prêmio mensal'),
    retido: achar('valor do prêmio retido') };
  return colunas.anual && colunas.mensal && colunas.retido ? colunas : null;
}

function somaDaColuna_(casos, coluna) {
  return casos.reduce(function (soma, caso) {
    var numero = converterParaNumero_(caso[coluna]);
    return soma + (numero === '' || numero === null || isNaN(numero) ? 0 : Number(numero));
  }, 0);
}

/** "Prêmios: anual, mensal e retido" — três barras, a soma de cada coluna nos casos da tela. */
function graficoDosPremios_(casos, colunas) {
  var pontos = [['anual', 'Prêmio anual', colunas.anual], ['mensal', 'Prêmio mensal', colunas.mensal],
    ['retido', 'Prêmio retido', colunas.retido]].map(function (par) {
    var comValor = casos.filter(function (caso) {
      var numero = converterParaNumero_(caso[par[2]]);
      return numero !== '' && numero !== null && !isNaN(numero) && Number(numero) !== 0;
    }).length;
    return { chave: par[0], rotulo: par[1], valor: somaDaColuna_(casos, par[2]), casos: comValor,
      ehOutros: false, tom: par[0] === 'retido' ? 'bom' : '', serie: 0 };
  });
  return {
    titulo: 'Prêmios: anual, mensal e retido',
    tipo: 'barras',
    largura: 2,
    dimensao: 'Prêmio',
    medida: 'Valor',
    agregacao: 'soma',
    unidade: 'dinheiro',
    ehTempo: false,
    pontos: pontos,
    tendencia: null,
    // Somar anual, mensal e retido não dá um número que signifique alguma coisa.
    total: null,
    aviso: ''
  };
}

/**
 * O valor embaixo de cada cartão de status (Etapa 46, pedido do PO): "embaixo
 * de cada status deve ter o valor anual das propostas, sendo apenas o retido
 * que irá trazer o valor total dos retidos da coluna prêmio retido".
 *
 * O "Não trabalhado" soma o prêmio MENSAL (Etapa 54, pedido do PO): "na maioria
 * das vezes não são preenchidos os anuais, sendo mais os mensais".
 */
function somarPremiosNosCartoes_(cartoes, casos, canal, colunas) {
  var colunaDoStatus = canal.colunaDoStatus ? grafiaDaColuna_(canal.aba, canal.colunaDoStatus) : '';
  if (!colunaDoStatus) return;
  var porChave = {};
  situacoesDoCanal_(canal).forEach(function (situacao) {
    porChave[normalizarParaComparar_(situacao.gravadoComo)] = situacao.gravadoComo;
  });
  cartoes.forEach(function (cartao) {
    if (cartao.dimensao !== 'situacao') return;
    var doStatus = casos.filter(function (caso) {
      return normalizarParaComparar_(caso[colunaDoStatus]) === cartao.chave;
    });
    var qual = cartao.chave === 'retido' ? 'retido'
      : (cartao.chave === 'naotrabalhado' ? 'mensal' : 'anual');
    cartao.soma = somaDaColuna_(doStatus, colunas[qual]);
    cartao.rotuloDaSoma = 'prêmio ' + qual;
  });
}

/**
 * A produtividade de cada analista, uma linha por pessoa (Etapa 46, pedido do
 * PO: "por último a produtividade por analista mostrando tudo
 * individualmente"): o total, quantos em cada status e os três prêmios.
 */
function quadroPorAnalista_(casos, canal, colunas) {
  var estrutura = estruturaDaAba_(canal.aba);
  var colunaDoAnalista = colunaDoResponsavel_(estrutura);
  var colunaDoStatus = canal.colunaDoStatus ? grafiaDaColuna_(canal.aba, canal.colunaDoStatus) : '';
  var status = situacoesDoCanal_(canal).map(function (situacao) {
    return { chave: normalizarParaComparar_(situacao.gravadoComo), nome: situacao.nome };
  });
  var porAnalista = {};
  var ordem = [];
  casos.forEach(function (caso) {
    var nome = String((colunaDoAnalista ? caso[colunaDoAnalista] : '') || '').trim() || 'Sem analista';
    var chave = normalizarParaComparar_(nome);
    if (!porAnalista[chave]) {
      porAnalista[chave] = { analista: nome, total: 0, porStatus: {}, casos: [] };
      ordem.push(chave);
    }
    var linha = porAnalista[chave];
    linha.total++;
    linha.casos.push(caso);
    var doStatus = colunaDoStatus ? normalizarParaComparar_(caso[colunaDoStatus]) : '';
    linha.porStatus[doStatus] = (linha.porStatus[doStatus] || 0) + 1;
  });
  // Só os status que aparecem em alguém: uma coluna de zeros não diz nada.
  var usados = status.filter(function (s) {
    return ordem.some(function (chave) { return porAnalista[chave].porStatus[s.chave]; });
  });
  var linhas = ordem.map(function (chave) {
    var linha = porAnalista[chave];
    return {
      analista: linha.analista,
      total: linha.total,
      porStatus: usados.map(function (s) { return linha.porStatus[s.chave] || 0; }),
      anual: somaDaColuna_(linha.casos, colunas.anual),
      mensal: somaDaColuna_(linha.casos, colunas.mensal),
      retido: somaDaColuna_(linha.casos, colunas.retido)
    };
  }).sort(function (um, outro) {
    return outro.total - um.total || (um.analista < outro.analista ? -1 : 1);
  });
  return {
    status: usados.map(function (s) { return s.nome; }),
    linhas: linhas,
    totais: {
      total: casos.length,
      porStatus: usados.map(function (s) {
        return ordem.reduce(function (soma, chave) {
          return soma + (porAnalista[chave].porStatus[s.chave] || 0);
        }, 0);
      }),
      anual: somaDaColuna_(casos, colunas.anual),
      mensal: somaDaColuna_(casos, colunas.mensal),
      retido: somaDaColuna_(casos, colunas.retido)
    }
  };
}

/*
 * TENTATIVAS ATÉ O SUCESSO (Etapa 47, pedido do PO): "precisamos medir quantas
 * vezes precisamos contatar o cliente para ter sucesso". A regra da operação,
 * palavra do PO: enquanto tenta, o analista usa o status Contatando, e a 1ª e
 * a 2ª tentativa sem sucesso ficam carimbadas em "Data do 1º contato" e "Data
 * do 2º contato"; na 3ª, o status vira "Sem sucesso de contato". Sucesso é
 * Retido ou Não retido — falou com o cliente.
 *
 * Nada novo é gravado: a conta sai dos carimbos, que não se apagam quando o
 * caso muda de status. A coluna "tentativas de contato" NÃO entra — ela se
 * esvazia quando o caso sai do Contatando.
 */
const RECC_COLUNAS_DAS_TENTATIVAS = ['Data do 1º contato', 'Data do 2º contato'];
const RECC_STATUS_DE_SUCESSO = ['Retido', 'Não retido'];
const RECC_STATUS_SEM_SUCESSO = 'Sem sucesso de contato';
/** Quantos CPFs a tabela lista (os de mais contatos); o total vem sempre. */
const RECC_CPFS_LISTADOS = 100;
/** A tabela é dos clientes que voltaram: só o CPF com 2 casos ou mais (pedido do PO, 29/10). */
const RECC_CASOS_PARA_LISTAR_O_CPF = 2;

/**
 * Cada caso vira: quantos contatos houve e como terminou.
 *   sucesso      1 + as tentativas carimbadas (o contato que deu certo conta);
 *   semSucesso   1 + as tentativas carimbadas (a 3ª, que virou o status);
 *   emAndamento  só as tentativas carimbadas.
 * `null` no canal sem as colunas (hoje, só a RET as tem).
 */
function tentativasAteOSucesso_(casos, canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var achar = function (nome) {
    var posicao = posicaoDaColuna_(estrutura, nome);
    return posicao < 0 ? '' : estrutura.cabecalhos[posicao];
  };
  var colunasDasTentativas = RECC_COLUNAS_DAS_TENTATIVAS.map(achar);
  var colunaDoStatus = canal.colunaDoStatus ? grafiaDaColuna_(canal.aba, canal.colunaDoStatus) : '';
  if (colunasDasTentativas.some(function (coluna) { return !coluna; }) || !colunaDoStatus) return null;
  var colunaDoCpf = achar('CPF');
  var colunaDoCliente = achar('nome do cliente');
  var colunaDoAnalista = colunaDoResponsavel_(estrutura);

  var nomeDoStatus = {};
  situacoesDoCanal_(canal).forEach(function (situacao) {
    nomeDoStatus[normalizarParaComparar_(situacao.gravadoComo)] = situacao.nome;
  });
  var deSucesso = RECC_STATUS_DE_SUCESSO.map(normalizarParaComparar_);
  var semSucesso = normalizarParaComparar_(RECC_STATUS_SEM_SUCESSO);

  var lidos = casos.map(function (caso) {
    var status = normalizarParaComparar_(caso[colunaDoStatus]);
    var tentativas = colunasDasTentativas.filter(function (coluna) {
      return String(caso[coluna] === null || caso[coluna] === undefined ? '' : caso[coluna]).trim() !== '';
    }).length;
    var desfecho = deSucesso.indexOf(status) >= 0 ? 'sucesso'
      : (status === semSucesso ? 'semSucesso' : 'emAndamento');
    return {
      caso: caso,
      status: nomeDoStatus[status] || String(caso[colunaDoStatus] || '').trim() || 'Sem status',
      desfecho: desfecho,
      contatos: tentativas + (desfecho === 'emAndamento' ? 0 : 1)
    };
  });

  // Sucesso no 1º, 2º, 3º contato… — quantas faixas os dados pedirem.
  function faixas(grupo) {
    var porContato = [];
    grupo.forEach(function (lido) {
      if (lido.desfecho !== 'sucesso') return;
      porContato[lido.contatos - 1] = (porContato[lido.contatos - 1] || 0) + 1;
    });
    for (var i = 0; i < Math.max(porContato.length, 3); i++) porContato[i] = porContato[i] || 0;
    return porContato;
  }
  function resumo(grupo) {
    var sucessos = grupo.filter(function (lido) { return lido.desfecho === 'sucesso'; });
    var contatos = sucessos.reduce(function (soma, lido) { return soma + lido.contatos; }, 0);
    return {
      sucessos: sucessos.length,
      porContato: faixas(grupo),
      semSucesso: grupo.filter(function (lido) { return lido.desfecho === 'semSucesso'; }).length,
      emAndamento: grupo.filter(function (lido) { return lido.desfecho === 'emAndamento'; }).length,
      // Contatos por sucesso, com uma casa: "1,6 contato até falar com o cliente".
      media: sucessos.length ? Math.round(contatos / sucessos.length * 10) / 10 : null
    };
  }

  var geral = resumo(lidos);
  var ordinal = function (n) { return 'No ' + n + 'º contato'; };
  var pontos = geral.porContato.map(function (quantos, i) {
    return { chave: 'contato' + (i + 1), rotulo: ordinal(i + 1), valor: quantos, casos: quantos,
      ehOutros: false, tom: 'bom', serie: 0 };
  }).concat([{ chave: 'semsucesso', rotulo: 'Sem sucesso', valor: geral.semSucesso,
    casos: geral.semSucesso, ehOutros: false, tom: 'atencao', serie: 0 }]);

  // Por analista: a mesma conta, pessoa a pessoa.
  var porAnalista = {};
  var ordem = [];
  lidos.forEach(function (lido) {
    var nome = String((colunaDoAnalista ? lido.caso[colunaDoAnalista] : '') || '').trim() || 'Sem analista';
    var chave = normalizarParaComparar_(nome);
    if (!porAnalista[chave]) { porAnalista[chave] = { analista: nome, lidos: [] }; ordem.push(chave); }
    porAnalista[chave].lidos.push(lido);
  });
  var analistas = ordem.map(function (chave) {
    var linha = resumo(porAnalista[chave].lidos);
    linha.analista = porAnalista[chave].analista;
    return linha;
  });
  // Todas as linhas com as mesmas colunas (a conta geral tem as faixas de todos).
  analistas.forEach(function (linha) {
    for (var i = 0; i < geral.porContato.length; i++) linha.porContato[i] = linha.porContato[i] || 0;
  });
  analistas.sort(function (um, outro) {
    return outro.sucessos - um.sucessos || (um.analista < outro.analista ? -1 : 1);
  });

  // Por CPF: o mesmo cliente pode ter mais de um caso — os contatos somam.
  var porCpf = {};
  var cpfs = [];
  var semCpf = 0;
  lidos.forEach(function (lido) {
    var cpf = colunaDoCpf ? converterParaIdentificador_(lido.caso[colunaDoCpf]) : '';
    if (!cpf) { semCpf++; return; }
    if (!porCpf[cpf]) {
      porCpf[cpf] = { cpf: cpf, cliente: '', casos: 0, contatos: 0, desfechos: [] };
      cpfs.push(cpf);
    }
    var linha = porCpf[cpf];
    linha.casos++;
    linha.contatos += lido.contatos;
    var cliente = colunaDoCliente ? String(lido.caso[colunaDoCliente] || '').trim() : '';
    if (cliente) linha.cliente = cliente;
    var desfecho = lido.desfecho === 'sucesso'
      ? lido.status + ' no ' + lido.contatos + 'º contato' : lido.status;
    if (linha.desfechos.indexOf(desfecho) < 0) linha.desfechos.push(desfecho);
  });
  var deUmCasoSo = 0;
  var linhasDosCpfs = cpfs.filter(function (cpf) {
    if (porCpf[cpf].casos >= RECC_CASOS_PARA_LISTAR_O_CPF) return true;
    deUmCasoSo++;
    return false;
  }).map(function (cpf) {
    var linha = porCpf[cpf];
    return { cpf: linha.cpf, cliente: linha.cliente, casos: linha.casos, contatos: linha.contatos,
      desfecho: linha.desfechos.join(', ') };
  }).sort(function (um, outro) {
    return outro.contatos - um.contatos || outro.casos - um.casos || (um.cpf < outro.cpf ? -1 : 1);
  });

  return {
    titulo: 'Tentativas até o sucesso',
    sucessos: geral.sucessos,
    semSucesso: geral.semSucesso,
    emAndamento: geral.emAndamento,
    media: geral.media,
    grafico: {
      titulo: 'Em qual contato o cliente atendeu',
      tipo: 'barras', largura: 2, dimensao: 'Contato', medida: 'Casos',
      agregacao: 'contagem', unidade: 'casos', ehTempo: false,
      pontos: pontos, tendencia: null, total: null, aviso: ''
    },
    faixas: geral.porContato.map(function (quantos, i) { return ordinal(i + 1); }),
    porAnalista: analistas.map(function (linha) {
      return { analista: linha.analista, sucessos: linha.sucessos, porContato: linha.porContato,
        semSucesso: linha.semSucesso, media: linha.media };
    }),
    porCpf: {
      linhas: linhasDosCpfs.slice(0, RECC_CPFS_LISTADOS),
      total: linhasDosCpfs.length,
      semCpf: semCpf,
      deUmCasoSo: deUmCasoSo
    }
  };
}

/**
 * O painel inteiro: todos os gráficos do canal, já calculados.
 *
 * Vem numa chamada só porque a tela abre mostrando todos ao mesmo tempo —
 * seis idas ao servidor fariam a tela montar aos pedaços.
 */
function produtividadeDaEquipe(idDoCanal, filtros, periodoPedido) {
  var quem = exigirTela_('produtividade');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var periodo = resolverPeriodo_(periodoPedido);
  var antes = periodoAnterior_(periodo);

  // Linha sem data FICA no atalho e SAI dos períodos fechados. Na abertura ela
  // é um caso mal preenchido que precisa aparecer; num "setembro" ela é um
  // caso sobre o qual não dá para afirmar que é de setembro.
  var guardarSemData = guardaOsSemData_(periodo);

  // Só as linhas do período e do anterior, pela coluna da data (Etapa 65).
  var lido = registrosDosPeriodos_(canal, [
    { de: periodo.de, ate: periodo.ate, guardarSemData: guardarSemData },
    { de: antes.de, ate: antes.ate }]);
  var recentes = lido.registros;
  var truncada = lido.truncada;

  var noPeriodo = alcanceDaProdutividade_(
    entreDuasDatas_(recentes, canal, periodo.de, periodo.ate, guardarSemData),
    canal, quem);

  // O período ANTERIOR, para os cartões dizerem se subiu ou desceu. Um número
  // sozinho não diz nada: 40 retenções é bom ou ruim?
  var anterior = alcanceDaProdutividade_(
    entreDuasDatas_(recentes, canal, antes.de, antes.ate, false), canal, quem);

  var disponiveis = filtrosDoCanal_(canal, quem);
  var casos = aplicarFiltros_(noPeriodo, disponiveis, filtros || {});
  var casosDeAntes = aplicarFiltros_(anterior, disponiveis, filtros || {});

  var componentes = componentesDoCanal_(canal).map(function (componente) {
    return calcularComponente_(componente, casos, canal);
  });
  var colunasDosPremios = colunasDosPremios_(canal);
  var cartoes = contarCartoes_(casos, casosDeAntes, canal, 'produtividade');
  if (colunasDosPremios) somarPremiosNosCartoes_(cartoes, casos, canal, colunasDosPremios);

  return {
    canal: { id: canal.id, nome: canal.nome, icone: canal.icone },
    periodo: {
      tipo: periodo.tipo,
      dias: periodo.dias,
      mes: periodo.mes || '',
      de: comoSeEscreve_(periodo.de),
      ate: comoSeEscreve_(periodo.ate),
      rotulo: periodo.rotulo
    },
    // Os meses que a tela oferece, para ela não precisar calcular nenhum.
    mesesDisponiveis: mesesParaEscolher_(),
    total: casos.length,
    truncada: truncada,
    linhasLidas: recentes.length,
    filtrosDisponiveis: disponiveis,
    cartoes: cartoes,
    componentes: componentes,
    /*
      ETAPA 46, pedido do PO (só a RET por enquanto): "o gráfico que mostra o
      valor do prêmio anual total, mensal e retido deve ser o primeiro", e "por
      último a produtividade por analista mostrando tudo individualmente". Vêm
      FORA de `componentes`, como o valor por situação: são do canal (as
      colunas de prêmio), e não da lista que Configurações edita. `null` no
      canal que não tem as colunas de prêmio.
    */
    premios: colunasDosPremios ? graficoDosPremios_(casos, colunasDosPremios) : null,
    porAnalista: colunasDosPremios ? quadroPorAnalista_(casos, canal, colunasDosPremios) : null,
    // Etapa 47: em qual contato o cliente atendeu, por analista e por CPF.
    tentativas: tentativasAteOSucesso_(casos, canal),
    /*
      O VALOR POR SITUAÇÃO vem FORA de `componentes`, e de propósito.
      `componentes` é a lista que a tela de Configurações edita — tirar,
      reordenar, trocar a medida. Este gráfico não se edita ali: as duas
      coisas que ele precisa saber (a coluna do valor e quais situações
      destacar) moram na aba CANAIS, porque são do canal e não do painel.
      Misturá-lo na lista faria aparecer um gráfico que a tela de
      Configurações mostra e não consegue mexer.

      `null` quando o canal não declarou nada — e aí a tela não desenha nada.
    */
    valorPorSituacao: valorPorSituacao_(casos, canal),
    /*
      OS PRAZOS: o SLA do canal (dentro e fora) e cada sinalizador, com os
      casos que passaram do prazo e o nome de quem deixou passar. Vem FORA de
      `componentes` pelo mesmo motivo do valor por situação: o que ele mostra é
      ajustado em Configurações › Sinalizadores, e não na lista de gráficos.
      `null` quando o canal não tem prazo nenhum.
    */
    prazos: controleDePrazos_(casos, canal),
    /*
      OS ATENDIDOS DA MESA: o que está no sistema mais o que veio da planilha
      do chat. Vem FORA de `componentes` pelo mesmo motivo do valor por
      situação e dos prazos: não mora na aba PAINEIS, e a tela de Configurações
      não o edita. Usa o período e o alcance da tela, e NÃO os filtros — o chat
      não tem as colunas deles. `null` fora da Mesa.
    */
    atendimentos: atendimentosDaMesa_(noPeriodo, canal, quem, periodo),
    podeExportar: podeFazer_(quem.permissoes, RECC_ACOES.EXPORTAR)
  };
}

// ----------------------------------------------------------------------------
// O ALCANCE DESTA TELA
// ----------------------------------------------------------------------------

/**
 * De quem são os números desta tela. Quem responde é o NÍVEL DE ACESSO.
 *
 * A Produtividade RECC é a tela da equipe — é para isso que ela existe, e por
 * isso ela não tem botão de "só os meus". Quem quiser o número de uma pessoa
 * usa o filtro de Analista — isso é recortar a equipe.
 *
 * Mas QUEM vê a produtividade de quem não é decisão do código. Em algumas
 * equipes o analista acompanhar o grupo puxa todo mundo para cima; em outras,
 * o mesmo número vira constrangimento. Quem sabe qual é o caso é quem conduz a
 * equipe — então isto mora em Configurações › Níveis de acesso, com quatro
 * respostas possíveis:
 *
 *   BLOQUEADO  a tela não abre para este nível
 *   PROPRIOS   só os casos da própria pessoa
 *   EQUIPE     quem atende o mesmo canal que ela          (o padrão)
 *   CANAL      o canal inteiro, de todos os analistas
 *
 * ISTO NÃO ALARGA O RESTO. O escopo geral do nível continua mandando no
 * Trabalho, na Busca e em tudo mais: um analista com escopo "próprios" e
 * Produtividade em "equipe" vê a equipe AQUI e continua vendo só os casos dele
 * na fila de trabalho. São duas perguntas diferentes — "o que eu tenho para
 * fazer" e "como a equipe está indo" —, e elas não precisam ter a mesma
 * resposta.
 *
 * QUAIS canais o nível abre continua sendo a lista de canais dele. Um nível
 * que abre só a RET e tem "o canal inteiro" vê a RET inteira, e não a Mesa.
 */
function alcanceDaProdutividade_(registros, canal, quem) {
  var alcance = quem.permissoes.escopoNaProdutividade || 'EQUIPE';

  // O canal inteiro é o que a tela já mostraria sem recorte por pessoa. Não é
  // "ver tudo": a lista de canais do nível é quem diz quais canais existem
  // para ele, e essa conferência já aconteceu em canalQueEuPossoVer_.
  if (alcance === 'CANAL') return registros;

  var coluna = colunaDoResponsavel_(estruturaDaAba_(canal.aba));

  // Sem coluna de responsável não há como recortar por pessoa. Mostrar a base
  // inteira porque faltou uma coluna seria trocar uma regra de acesso por um
  // descuido de configuração — então vale o alcance normal do nível.
  if (!coluna) return filtrarPeloAlcance_(registros, canal.aba, quem);

  if (alcance === 'PROPRIOS') {
    var meuNome = normalizarParaComparar_((quem.usuario || {}).Nome);
    if (!meuNome) return [];
    return registros.filter(function (registro) {
      return normalizarParaComparar_(registro[coluna]) === meuNome;
    });
  }

  // EQUIPE, que é o padrão.
  var minhaEquipe = nomesDaMinhaEquipe_(quem);

  // Quem não pertence a canal nenhum — quem administra — não tem "a minha
  // equipe". Para ele o alcance normal do nível vale, e ele já é amplo.
  if (!minhaEquipe || !minhaEquipe.length) {
    return filtrarPeloAlcance_(registros, canal.aba, quem);
  }

  var indice = {};
  minhaEquipe.forEach(function (nome) {
    indice[normalizarParaComparar_(nome)] = true;
  });
  return registros.filter(function (registro) {
    return indice[normalizarParaComparar_(registro[coluna])] === true;
  });
}

/** Os gráficos declarados para este canal, na ordem escolhida. */
function componentesDoCanal_(canal) {
  var doCanal = converterParaIdentificador_(canal.id);

  return lerRegistros_('PAINEIS')
    .filter(function (linha) {
      if (normalizarParaComparar_(linha.Ativo) !== 'sim') return false;
      // Um gráfico SEM canal vale para todos — é como se declara um gráfico
      // comum às duas operações. Por isso a conferência do canal é aqui, e
      // não dentro de ehGraficoDoPainel_, que responde sobre um canal certo.
      var canalDaLinha = converterParaIdentificador_(linha.CanalId);
      if (canalDaLinha && canalDaLinha !== doCanal) return false;
      return ehGraficoDoPainel_(linha, canalDaLinha || doCanal);
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (linha) {
      return {
        id: linha.__id,
        titulo: String(linha.Titulo || ''),
        tipo: tipoDeGraficoValido_(linha.TipoWidget),
        dimensao: String(linha.CampoDimensao || ''),
        medida: String(linha.CampoMedida || ''),
        agregacao: agregacaoValida_(linha.Agregacao),
        limite: Number(linha.Limite) || 0,
        largura: Number(linha.Largura) || 1
      };
    });
}

function tipoDeGraficoValido_(valor) {
  var procurado = normalizarParaComparar_(valor);
  var achado = 'barras';
  Object.keys(RECC_TIPOS_DE_GRAFICO).forEach(function (chave) {
    if (normalizarParaComparar_(chave) === procurado) achado = chave;
  });
  return achado;
}

function agregacaoValida_(valor) {
  var procurado = normalizarParaComparar_(valor);
  var achado = 'contagem';
  Object.keys(RECC_AGREGACOES).forEach(function (chave) {
    if (normalizarParaComparar_(chave) === procurado) achado = chave;
  });
  return achado;
}

// ============================================================================
// O CÁLCULO
// ============================================================================

/**
 * Um gráfico, já somado e ordenado, pronto para a tela desenhar.
 *
 * A tela recebe NÚMEROS, e não decide nada sobre eles: quem escolhe o TOP N,
 * quem dobra o resto em "Outros" e quem calcula a média móvel é aqui. Assim a
 * mesma conta vale para a tela, para a exportação e para o detalhamento.
 */
function calcularComponente_(componente, casos, canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var posicaoDaDimensao = posicaoDaColuna_(estrutura, componente.dimensao);

  if (posicaoDaDimensao < 0) {
    return semDados_(componente, 'A coluna "' + componente.dimensao +
      '" não existe na aba ' + canal.aba + '. Ajuste em Configurações › Painéis.');
  }

  var tipoDaDimensao = estrutura.tipos[posicaoDaDimensao];
  var ehTempo = (tipoDaDimensao === RECC_TIPO_DE_DADO.DATA
    || tipoDaDimensao === RECC_TIPO_DE_DADO.DATA_HORA);

  if (componente.agregacao !== 'contagem' && !componente.medida) {
    return semDados_(componente, 'Este gráfico soma um valor, mas não diz qual. ' +
      'Escolha a coluna da medida em Configurações › Painéis.');
  }

  var somas = {};
  var quantidades = {};
  var ordemDasChaves = [];

  // A situação traz TODOS os status do canal, até os zerados (pedido do PO,
  // 29/10): ver o que está em zero também é análise.
  var ehStatus = ehDimensaoDoStatus_(componente, canal);
  if (ehStatus) {
    situacoesDoCanal_(canal).forEach(function (situacao) {
      var chave = situacao.gravadoComo.trim();
      if (!chave || Object.prototype.hasOwnProperty.call(somas, chave)) return;
      somas[chave] = 0;
      quantidades[chave] = 0;
      ordemDasChaves.push(chave);
    });
  }

  casos.forEach(function (caso) {
    var chave = chaveDoCasoNoGrafico_(caso, componente, canal, ehTempo);

    if (!Object.prototype.hasOwnProperty.call(somas, chave)) {
      somas[chave] = 0;
      quantidades[chave] = 0;
      ordemDasChaves.push(chave);
    }
    quantidades[chave]++;
    somas[chave] += componente.agregacao === 'contagem'
      ? 1 : (converterParaNumero_(caso[componente.medida]) || 0);
  });

  // Coluna VAZIA em todos os casos não vira um gráfico com uma barra só
  // chamada "Sem informação". Esse gráfico não diz nada e parece defeito — e é
  // o estado normal de um gráfico sobre a importação antes do primeiro
  // importação. A tela mostra o recado, que explica, no lugar do desenho, que
  // não explica.
  if (casos.length && ordemDasChaves.every(function (chave) {
    return chave === 'Sem informação' || !quantidades[chave];
  })) {
    return semDados_(componente, 'Nenhum caso do período tem "'
      + componente.dimensao + '" preenchida, então não há o que agrupar.');
  }

  var pontos = ordemDasChaves.map(function (chave) {
    return {
      chave: chave,
      rotulo: ehTempo ? rotuloDoDia_(chave) : chave,
      valor: componente.agregacao === 'media'
        ? (quantidades[chave] ? somas[chave] / quantidades[chave] : 0)
        : somas[chave],
      casos: quantidades[chave]
    };
  });

  // Tempo se ordena pelo tempo; o resto, do maior para o menor — é o que a
  // pessoa quer ver primeiro num gráfico de magnitude.
  if (ehTempo) {
    pontos.sort(function (um, outro) {
      return um.chave < outro.chave ? -1 : (um.chave > outro.chave ? 1 : 0);
    });
  } else {
    pontos.sort(function (um, outro) { return outro.valor - um.valor; });
  }

  // O top 5, e só ele: o que passa SAI do gráfico (Etapa 53). O tempo não se
  // corta — cada dia do período é um ponto da linha —, e a situação também
  // não: ela traz todos os status.
  var foraDoTopo = 0;
  if (!ehTempo && !ehStatus) {
    var teto = componente.limite > 0
      ? Math.min(componente.limite, RECC_TOPO_DOS_GRAFICOS) : RECC_TOPO_DOS_GRAFICOS;
    if (pontos.length > teto) {
      foraDoTopo = pontos.length - teto;
      pontos = pontos.slice(0, teto);
    }
  }

  var pintado = pintarPontos_(pontos, componente, canal, ehTempo);

  return {
    id: componente.id,
    titulo: componente.titulo,
    tipo: componente.tipo,
    largura: componente.largura,
    dimensao: componente.dimensao,
    medida: componente.medida,
    agregacao: componente.agregacao,
    unidade: unidadeDaMedida_(componente, estrutura),
    ehTempo: ehTempo,
    pontos: pintado,
    tendencia: componente.tipo === 'barrasComLinha'
      ? mediaMovel_(pintado, 7) : null,
    total: pintado.reduce(function (soma, ponto) { return soma + ponto.valor; }, 0),
    // Quantos valores ficaram fora do top 5 — a tela avisa que a soma e as
    // porcentagens são só entre os mostrados.
    foraDoTopo: foraDoTopo,
    aviso: ''
  };
}

function semDados_(componente, aviso) {
  return {
    id: componente.id,
    titulo: componente.titulo,
    tipo: componente.tipo,
    largura: componente.largura,
    dimensao: componente.dimensao,
    medida: componente.medida,
    agregacao: componente.agregacao,
    unidade: '',
    ehTempo: false,
    pontos: [],
    tendencia: null,
    total: 0,
    foraDoTopo: 0,
    aviso: aviso
  };
}

/**
 * A cor de cada ponto — e ela SEGUE A ENTIDADE, nunca a posição no gráfico.
 *
 * Quando a dimensão é uma lista do catálogo, a cor já está declarada lá:
 * "Concluído" é verde porque o catálogo diz que é, e continua verde quando um
 * filtro o joga do primeiro para o quarto lugar. Sem isso, o gráfico inteiro
 * se repintaria a cada filtro e ninguém conseguiria comparar duas telas.
 *
 * Fora do catálogo, a cor sai da paleta categórica pela posição do valor na
 * lista COMPLETA da dimensão — que também não muda com o filtro.
 */
function pintarPontos_(pontos, componente, canal, ehTempo) {
  // Magnitude ao longo do tempo, ou barra simples: um tom só. Oito cores para
  // dizer "quanto" é o jeito mais rápido de enterrar a informação.
  if (ehTempo || componente.tipo === 'barras'
    || componente.tipo === 'barrasDeitadas' || componente.tipo === 'linha'
    || componente.tipo === 'barrasComLinha') {
    return pontos.map(function (ponto) {
      return {
        chave: ponto.chave, rotulo: ponto.rotulo, valor: ponto.valor,
        casos: ponto.casos, ehOutros: !!ponto.ehOutros,
        tom: '', serie: 0
      };
    });
  }

  var doCatalogo = coresDoCatalogo_(canal);
  var ordemEstavel = ordemEstavelDaDimensao_(canal, componente.dimensao);

  return pontos.map(function (ponto) {
    if (ponto.ehOutros) {
      return {
        chave: ponto.chave, rotulo: ponto.rotulo, valor: ponto.valor,
        casos: ponto.casos, ehOutros: true, tom: 'neutro', serie: 0
      };
    }
    var normalizado = normalizarParaComparar_(ponto.chave);
    var posicao = ordemEstavel.indexOf(normalizado);
    return {
      chave: ponto.chave,
      rotulo: ponto.rotulo,
      valor: ponto.valor,
      casos: ponto.casos,
      ehOutros: false,
      tom: doCatalogo[normalizado] || '',
      // 1 a 6, fixo pela entidade. Fora da lista conhecida, cai no último
      // slot em vez de inventar uma cor.
      serie: posicao >= 0 ? (posicao % 6) + 1 : 6
    };
  });
}

/** O tom que o catálogo já declarou para cada valor deste canal. */
function coresDoCatalogo_(canal) {
  var doCanal = converterParaIdentificador_(canal.id);
  var cores = {};
  lerRegistros_('CATALOGO').forEach(function (item) {
    var canalDoItem = converterParaIdentificador_(item.CanalId);
    if (canalDoItem && canalDoItem !== doCanal) return;
    if (!item.Cor) return;
    cores[normalizarParaComparar_(item.Nome)] = tomValido_(item.Cor);
  });
  return cores;
}

/**
 * A ordem COMPLETA dos valores possíveis de uma dimensão.
 *
 * Sai do catálogo, e não dos casos que sobraram no filtro: é isso que faz a
 * cor de um valor ser sempre a mesma, esteja ele em primeiro ou em último.
 */
function ordemEstavelDaDimensao_(canal, cabecalho) {
  var campo = null;
  camposAtivosDoCanal_(canal.id).forEach(function (umCampo) {
    if (normalizarParaComparar_(umCampo.Cabecalho)
      === normalizarParaComparar_(cabecalho)) campo = umCampo;
  });
  if (!campo) return [];

  return opcoesDoCampo_(lerConfiguracaoDoCampo_(campo), canal.id)
    .map(function (opcao) { return normalizarParaComparar_(opcao.valor); });
}

/** Em que unidade o número é lido, para a tela formatar certo. */
function unidadeDaMedida_(componente, estrutura) {
  if (componente.agregacao === 'contagem') return 'casos';
  var posicao = posicaoDaColuna_(estrutura, componente.medida);
  if (posicao < 0) return '';
  return estrutura.tipos[posicao] === RECC_TIPO_DE_DADO.DINHEIRO ? 'dinheiro' : '';
}

/** A data de um caso, no formato que ordena sozinho. */
/** O gráfico é sobre a coluna do status do canal. */
function ehDimensaoDoStatus_(componente, canal) {
  return !!canal.colunaDoStatus && normalizarParaComparar_(componente.dimensao)
    === normalizarParaComparar_(canal.colunaDoStatus);
}

/**
 * Em qual ponto do gráfico o caso entra. Uma conta só para o gráfico e para o
 * clique nele, senão a lista do clique sairia de tamanho diferente da barra.
 *
 * Os casos cadastrados no sistema não passam pela importação e vinham com as
 * duas colunas dela em branco (pedido do PO, 29/10). Só no gráfico — a planilha
 * não muda:
 *   Data da importação     vazia → a data de entrada do caso no canal; sem
 *                          ela, a data da primeira mudança de status;
 *   Origem da importação   vazia → "Sistema".
 */
function chaveDoCasoNoGrafico_(caso, componente, canal, ehTempo) {
  var dimensao = normalizarParaComparar_(componente.dimensao);
  var chave;
  if (ehTempo) {
    chave = diaDoCaso_(caso[componente.dimensao]);
    if (chave === '' && dimensao === normalizarParaComparar_(RECC_COLUNA_DATA_DA_IMPORTACAO)) {
      chave = (canal.colunaDaData ? diaDoCaso_(caso[canal.colunaDaData]) : '')
        || diaDoCaso_(caso[RECC_COLUNA_DATA_DA_PRIMEIRA_MUDANCA_DE_STATUS]);
    }
  } else {
    chave = String(caso[componente.dimensao] || '').trim();
    if (chave === '' && dimensao === normalizarParaComparar_(RECC_COLUNA_ORIGEM_DA_IMPORTACAO)) {
      chave = 'Sistema';
    }
  }
  return chave === '' ? 'Sem informação' : chave;
}

function diaDoCaso_(valor) {
  var data = converterParaData_(valor);
  if (!data) return '';
  return Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
}

function rotuloDoDia_(chave) {
  if (!chave) return 'Sem data';
  var partes = String(chave).split('-');
  return partes.length === 3 ? partes[2] + '/' + partes[1] : chave;
}

/**
 * A média móvel, que é a linha do "barras com linha".
 *
 * É a média dos últimos N pontos, na MESMA escala das barras. Não é um
 * segundo eixo: dois eixos no mesmo gráfico fazem a mesma altura significar
 * duas coisas diferentes, e é o erro de gráfico mais comum que existe.
 */
function mediaMovel_(pontos, janela) {
  return pontos.map(function (ponto, i) {
    var de = Math.max(0, i - janela + 1);
    var pedaco = pontos.slice(de, i + 1);
    var soma = pedaco.reduce(function (total, um) { return total + um.valor; }, 0);
    return { chave: ponto.chave, rotulo: ponto.rotulo, valor: soma / pedaco.length };
  });
}

// ============================================================================
// O DETALHAMENTO
// ============================================================================

/**
 * Os casos por trás de uma fatia ou de uma barra.
 *
 * É o que transforma um número numa lista de protocolos para trabalhar — sem
 * isso, o painel só informa, e informar não resolve caso nenhum.
 */
function detalharComponente(idDoCanal, idDoComponente, chaveDoPonto, filtros,
  periodoPedido, quantos) {
  var quem = exigirTela_('produtividade');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var componente = null;
  componentesDoCanal_(canal).forEach(function (um) {
    if (converterParaIdentificador_(um.id)
      === converterParaIdentificador_(idDoComponente)) componente = um;
  });
  if (!componente) {
    throw new Error('Este gráfico não existe mais. Recarregue a tela.');
  }

  var periodo = resolverPeriodo_(periodoPedido);
  var recentes = registrosDosPeriodos_(canal, [{ de: periodo.de, ate: periodo.ate,
    guardarSemData: guardaOsSemData_(periodo) }]).registros;
  // O MESMO período e o MESMO alcance do painel. Sem isto, clicar numa barra
  // abriria uma lista de tamanho diferente do número que a barra mostrava — e
  // a pessoa concluiria, com razão, que um dos dois está errado.
  var meus = alcanceDaProdutividade_(
    entreDuasDatas_(recentes, canal, periodo.de, periodo.ate,
      guardaOsSemData_(periodo)),
    canal, quem);
  var casos = aplicarFiltros_(meus, filtrosDoCanal_(canal, quem), filtros || {});

  var estrutura = estruturaDaAba_(canal.aba);
  var posicao = posicaoDaColuna_(estrutura, componente.dimensao);
  var ehTempo = posicao >= 0 && (estrutura.tipos[posicao] === RECC_TIPO_DE_DADO.DATA
    || estrutura.tipos[posicao] === RECC_TIPO_DE_DADO.DATA_HORA);

  var procurado = String(chaveDoPonto || '');
  // Sem "Demais valores" desde a Etapa 53: todo ponto clicável é um valor de
  // verdade da coluna.
  var escolhidos = casos.filter(function (caso) {
    var valor = chaveDoCasoNoGrafico_(caso, componente, canal, ehTempo);
    return normalizarParaComparar_(valor) === normalizarParaComparar_(procurado);
  });

  return {
    titulo: componente.titulo,
    ponto: ehTempo ? rotuloDoDia_(procurado) : procurado,
    colunas: colunasDaFila_(canal),
    // Os 100 mais recentes, compactos — "todos" quando a tela pede. Achado da
    // varredura geral (item 97): a lista ia INTEIRA, e com 5.000 casos o
    // clique numa fatia devolvia 6,6 MB e estourava os 40 segundos, o mesmo
    // defeito do Trabalho (item 95). O PO escolheu o mesmo remédio. `total`
    // continua sendo a fatia inteira.
    casos: compactarFila_(montarFila_(quantos === 'todos'
      ? escolhidos : escolhidos.slice(-RECC_FILA_NA_ABERTURA), canal)),
    filaCompacta: true,
    total: escolhidos.length,
    // "Trabalhar no caso" abre a EDIÇÃO; quem não pode editar não ganha o
    // botão, em vez de ganhar um botão que a chamada recusa.
    podeEditar: podeFazer_(quem.permissoes, RECC_ACOES.EDITAR)
  };
}

// ============================================================================
// EXPORTAR
// ============================================================================

/**
 * Os números de um gráfico em texto separado por ponto e vírgula.
 *
 * Ponto e vírgula, e não vírgula: o Excel em português abre assim sem pedir
 * nada. Vírgula abriria tudo numa coluna só, e a pessoa desistiria no meio.
 */
function exportarComponente(idDoCanal, idDoComponente, filtros, periodoPedido) {
  exigirPermissao_(RECC_ACOES.EXPORTAR);
  exigirTela_('produtividade');

  var painel = produtividadeDaEquipe(idDoCanal, filtros, periodoPedido);
  var componente = null;
  painel.componentes.forEach(function (um) {
    if (converterParaIdentificador_(um.id)
      === converterParaIdentificador_(idDoComponente)) componente = um;
  });
  if (!componente) throw new Error('Este gráfico não existe mais.');

  var linhas = [[componente.dimensao, componente.agregacao === 'contagem'
    ? 'Casos' : componente.medida, 'Casos'].join(';')];

  componente.pontos.forEach(function (ponto) {
    linhas.push([ponto.rotulo, formatarParaExportar_(ponto.valor),
      ponto.casos].join(';'));
  });

  registrarAuditoria_('painel.exportar', 'PAINEIS', componente.id, componente.titulo);
  return {
    nome: nomeDeArquivo_(componente.titulo) + '.csv',
    conteudo: linhas.join('\n')
  };
}

/** Número em vírgula decimal, que é como o Excel em português espera. */
function formatarParaExportar_(valor) {
  if (typeof valor !== 'number') return String(valor === undefined ? '' : valor);
  return (Math.round(valor * 100) / 100).toString().replace('.', ',');
}

function nomeDeArquivo_(titulo) {
  var limpo = normalizarParaComparar_(titulo).replace(/[^a-z0-9]+/g, '-');
  return limpo.replace(/^-+|-+$/g, '') || 'painel';
}

// ============================================================================
// CONFIGURAÇÃO DOS COMPONENTES
// ============================================================================

/** O que a tela de Configurações oferece ao montar um gráfico. */
function opcoesDosGraficos(idDoCanal) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var estrutura = estruturaDaAba_(canal.aba);

  var dimensoes = [];
  var medidas = [];
  estrutura.cabecalhos.forEach(function (cabecalho, i) {
    if (!cabecalho || cabecalho.charAt(0) === '_') return;
    var tipo = estrutura.tipos[i];
    if (tipo === RECC_TIPO_DE_DADO.DINHEIRO || tipo === RECC_TIPO_DE_DADO.NUMERO) {
      medidas.push(cabecalho);
    }
    // Identificador não vira eixo: agrupar por um Id dá um grupo por caso, e
    // um gráfico com trezentas barras de altura 1 não diz nada.
    if (tipo !== RECC_TIPO_DE_DADO.IDENTIFICADOR) dimensoes.push(cabecalho);
  });

  return {
    canal: { id: canal.id, nome: canal.nome },
    tipos: Object.keys(RECC_TIPOS_DE_GRAFICO).map(function (chave) {
      return { chave: chave, rotulo: RECC_TIPOS_DE_GRAFICO[chave] };
    }),
    agregacoes: Object.keys(RECC_AGREGACOES).map(function (chave) {
      return { chave: chave, rotulo: RECC_AGREGACOES[chave] };
    }),
    dimensoes: dimensoes,
    medidas: medidas,
    topoDosGraficos: RECC_TOPO_DOS_GRAFICOS
  };
}

/**
 * Esta linha de PAINEIS é um GRÁFICO da Produtividade RECC deste canal?
 *
 * A Produtividade RECC tem duas coisas na mesma aba: os cartões, em cima, e os
 * gráficos, embaixo. As duas se distinguem só pela coluna TipoWidget, e a
 * pergunta é feita em três lugares — desenhar, listar em Configurações e
 * gravar. Escrever a regra três vezes é como o `salvarComponentesDoPainel`
 * quase apagou os cartões: ele recolhia "tudo desta tela neste canal" e
 * desligava o que não estivesse na lista de gráficos. Os cartões não estavam.
 */
function ehGraficoDoPainel_(linha, idDoCanal) {
  if (normalizarParaComparar_(linha.Tela) !== 'produtividade') return false;
  if (normalizarParaComparar_(linha.TipoWidget) === 'cartao') return false;
  return converterParaIdentificador_(linha.CanalId)
    === converterParaIdentificador_(idDoCanal);
}

/** Os gráficos de um canal, para a tela de Configurações editar. */
function listarComponentesDoPainel(idDoCanal) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  return lerRegistros_('PAINEIS')
    .filter(function (linha) { return ehGraficoDoPainel_(linha, canal.id); })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (linha) {
      return {
        id: linha.__id,
        titulo: String(linha.Titulo || ''),
        tipo: tipoDeGraficoValido_(linha.TipoWidget),
        dimensao: String(linha.CampoDimensao || ''),
        medida: String(linha.CampoMedida || ''),
        agregacao: agregacaoValida_(linha.Agregacao),
        limite: Number(linha.Limite) || 0,
        largura: Number(linha.Largura) || 1,
        mostrar: normalizarParaComparar_(linha.Ativo) === 'sim'
      };
    });
}

/** Grava a lista inteira de gráficos de um canal, como os cards do Trabalho. */
function salvarComponentesDoPainel(idDoCanal, componentes) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var estrutura = estruturaDaAba_(canal.aba);
  var lista = Array.isArray(componentes) ? componentes : [];

  if (lista.length > RECC_MAXIMO_DE_CARTOES) {
    throw new Error('São no máximo ' + RECC_MAXIMO_DE_CARTOES + ' gráficos por ' +
      'painel. Acima disso ninguém lê a tela inteira.');
  }

  lista.forEach(function (componente) {
    if (!String(componente.titulo || '').trim()) {
      throw new Error('Todo gráfico precisa de um título — é o que diz o que ' +
        'ele responde.');
    }
    conferirQueAColunaExiste_(estrutura, componente.dimensao, canal.aba);
    if (agregacaoValida_(componente.agregacao) !== 'contagem') {
      if (!String(componente.medida || '').trim()) {
        throw new Error('"' + componente.titulo + '" soma um valor, mas não diz ' +
          'qual. Escolha a coluna da medida.');
      }
      conferirQueAColunaExiste_(estrutura, componente.medida, canal.aba);
    }
  });

  var jaGravados = lerRegistros_('PAINEIS').filter(function (linha) {
    return ehGraficoDoPainel_(linha, canal.id);
  });
  var continuam = {};

  lista.forEach(function (componente, posicao) {
    var campos = {
      Tela: 'produtividade',
      CanalId: canal.id,
      Titulo: String(componente.titulo).trim(),
      TipoWidget: tipoDeGraficoValido_(componente.tipo),
      CampoDimensao: String(componente.dimensao || ''),
      CampoMedida: agregacaoValida_(componente.agregacao) === 'contagem'
        ? '' : String(componente.medida || ''),
      Agregacao: agregacaoValida_(componente.agregacao),
      Limite: Number(componente.limite) || 0,
      Filtro: '',
      Ordem: posicao + 1,
      Largura: Number(componente.largura) === 2 ? 2 : 1,
      Cor: '',
      VisivelPara: '',
      Ativo: componente.mostrar === false ? 'NAO' : 'SIM'
    };

    var id = converterParaIdentificador_(componente.id);
    if (id && buscarRegistros_('PAINEIS', 'Id', id, 1)[0]) {
      atualizarRegistro_('PAINEIS', id, campos);
      continuam[id] = true;
      return;
    }
    continuam[inserirRegistro_('PAINEIS', campos).__id] = true;
  });

  jaGravados.forEach(function (linha) {
    if (!continuam[linha.__id]) {
      atualizarRegistro_('PAINEIS', linha.__id, { Ativo: 'NAO', Ordem: 0 });
    }
  });

  registrarAuditoria_('painel.graficos', 'PAINEIS', '',
    canal.nome + ' · ' + lista.length + ' gráficos');
  return true;
}

/* ############################################################################
   #
   #  SEÇÃO 3 de 3 · O VALOR POR SITUAÇÃO E OS ATENDIDOS DO CHAT
   #
   ############################################################################ */

/**
 * O VALOR POR SITUAÇÃO: quanto dinheiro está em cada desfecho.
 *
 * Pedido do PO, nestas palavras: "traga na produtividade RECC gráfico com
 * valor dos retidos, não retidos, sem sucesso, valor dos demais status e
 * total".
 *
 * POR QUE NÃO É UM COMPONENTE DA ABA PAINEIS. O motor de componentes agrupa
 * pelo valor da coluna e, quando passa do limite, fica com os maiores — os
 * menores saem do gráfico (o top 5, Etapa 53). Aqui a escolha é outra:
 * quem ganha barra própria são as situações que a operação DECLAROU, estejam
 * elas grandes ou zeradas. "Sem sucesso" sem nenhum caso no mês tem de
 * aparecer valendo zero; sumir da tela faria a conta parecer completa quando
 * ela está com um pedaço faltando.
 *
 * Quem decide QUAIS casos entram é quem chama: hoje, a Produtividade RECC.
 *
 * Devolve `null` quando o canal não declarou a coluna do valor ou as situações
 * destacadas: canal sem isso não ganha um gráfico de dinheiro chutado.
 */
function valorPorSituacao_(casos, canal) {
  var colunaDoValor = String(canal.colunaDoValor || '').trim();
  var colunaDoStatus = String(canal.colunaDoStatus || '').trim();
  var destacadas = situacoesDestacadas_(canal);

  if (!colunaDoValor || !colunaDoStatus || !destacadas.length) return null;

  var estrutura = estruturaDaAba_(canal.aba);
  if (posicaoDaColuna_(estrutura, colunaDoValor) < 0) {
    return {
      titulo: 'Valor por situação', tipo: 'barras', largura: 2,
      dimensao: colunaDoStatus, medida: colunaDoValor, agregacao: 'soma',
      unidade: 'dinheiro', ehTempo: false, pontos: [], tendencia: null,
      total: 0, totalDeCasos: 0,
      aviso: 'A coluna "' + colunaDoValor + '" não existe mais na aba '
        + canal.aba + '. Ajuste em Configurações › Canais de trabalho.'
    };
  }

  // Um balde por situação declarada, na ORDEM em que ela foi declarada —
  // "retidos, não retidos, sem sucesso" é como a operação lê o resultado, e
  // reordenar por tamanho embaralharia a leitura a cada mês.
  var baldes = destacadas.map(function (nome) {
    return { chave: nome, rotulo: nome, valor: 0, casos: 0 };
  });
  var porNome = {};
  baldes.forEach(function (balde) {
    porNome[normalizarParaComparar_(balde.chave)] = balde;
  });

  var demais = { chave: '__outros', rotulo: 'Demais situações', valor: 0,
    casos: 0, ehOutros: true };

  casos.forEach(function (caso) {
    var quanto = converterParaNumero_(caso[colunaDoValor]) || 0;
    var balde = porNome[normalizarParaComparar_(caso[colunaDoStatus])] || demais;
    balde.valor += quanto;
    balde.casos++;
  });

  var pontos = baldes.concat([demais]);
  var cores = coresDoCatalogo_(canal);

  return {
    titulo: 'Valor por situação',
    tipo: 'barras',
    largura: 2,
    dimensao: colunaDoStatus,
    medida: colunaDoValor,
    agregacao: 'soma',
    unidade: 'dinheiro',
    ehTempo: false,
    pontos: pontos.map(function (ponto) {
      return {
        chave: ponto.chave,
        rotulo: ponto.rotulo,
        valor: ponto.valor,
        casos: ponto.casos,
        ehOutros: !!ponto.ehOutros,
        // A cor segue a SITUAÇÃO, como em todo o resto do sistema: "Reteve" é
        // verde porque o catálogo diz que é, e continua verde em qualquer
        // filtro e em qualquer tela.
        tom: cores[normalizarParaComparar_(ponto.chave)] || '',
        serie: 0
      };
    }),
    tendencia: null,
    // O TOTAL é pedido explícito, e é a soma de TODAS as situações — inclusive
    // das que caíram em "Demais". Somar só as barras destacadas daria um total
    // menor que a realidade, e um total que não fecha é pior que total nenhum.
    total: pontos.reduce(function (soma, ponto) { return soma + ponto.valor; }, 0),
    totalDeCasos: pontos.reduce(function (soma, ponto) { return soma + ponto.casos; }, 0),
    aviso: ''
  };
}

/** As situações que o canal declarou destacar, já separadas e limpas. */
function situacoesDestacadas_(canal) {
  return String(canal.situacoesDestacadas || '')
    .split(',')
    .map(function (pedaco) { return String(pedaco).trim(); })
    .filter(function (pedaco) { return pedaco !== ''; });
}

/* ############################################################################
   #
   #  OS ATENDIMENTOS DO CHAT da Mesa Diamante — trazidos pela Importação
   #
   ############################################################################ */

/*
 * Pedido do PO: "implemente na Produtividade RECC, para a Mesa Diamante, a
 * leitura de uma planilha apartada de casos atendidos pelo chat" e, na
 * Produtividade da Mesa, "os gráficos de atendidos, somando os casos
 * cadastrados no sistema e os casos atendidos por nome do analista,
 * integrando o nome da corretora para mostrar a quantidade e o top 5; SUSEPs,
 * assuntos, consultor e vida individual ou em grupo, a mesma coisa".
 *
 * O QUE SOMA COM O QUÊ: o atendido do sistema é todo caso da Mesa no período
 * (o mesmo recorte e o mesmo alcance dos cartões), e o do chat é toda linha da
 * aba ATENDIMENTOS_CHAT no período. A soma NÃO tira repetido: se o mesmo atendimento estiver
 * nas duas bases, ele conta duas vezes — o sistema não tem como saber.
 */

/*
 * DESDE A ETAPA 39 O CHAT ENTRA PELA IMPORTAÇÃO. Antes o PO apontava, em
 * Configurações › Estrutura, a planilha do chat, a aba e qual coluna dela era
 * cada coisa — e o sistema lia de lá a cada abertura. Palavra dele: "ficou
 * confuso e não consegui fazer a junção". Agora os atendimentos são trazidos
 * pela tela de Importação, como os casos (colar ou link, de-para, conferência),
 * e moram na aba ATENDIMENTOS_CHAT do próprio PGO. A configuração antiga (as
 * chaves CHAT.* da CONFIG) deixou de ser lida.
 */

/**
 * As colunas da aba ATENDIMENTOS_CHAT. `palavras` serve só para SUGERIR, no
 * de-para da importação, qual coluna da origem é cada coisa; quem decide é a
 * pessoa.
 */
const RECC_COLUNAS_DO_CHAT = [
  { chave: 'data', cabecalho: 'Data', rotulo: 'Data do atendimento', obrigatoria: true,
    palavras: ['data', 'dataatendimento', 'datadoatendimento', 'dia'] },
  { chave: 'analista', cabecalho: 'Analista', rotulo: 'Analista', obrigatoria: true,
    palavras: ['analista', 'atendente', 'agente', 'operador', 'nomedoanalista'] },
  { chave: 'susep', cabecalho: 'SUSEP', rotulo: 'SUSEP', obrigatoria: false, palavras: ['susep'] },
  { chave: 'corretora', cabecalho: 'Corretora', rotulo: 'Corretora', obrigatoria: false,
    palavras: ['corretora', 'nomecorretora', 'nomedacorretora'] },
  { chave: 'assunto', cabecalho: 'Assunto', rotulo: 'Assunto', obrigatoria: false,
    palavras: ['assunto', 'motivo', 'tema', 'tipodeatendimento'] },
  { chave: 'consultor', cabecalho: 'Consultor', rotulo: 'Consultor', obrigatoria: false,
    palavras: ['consultor'] },
  { chave: 'ramo', cabecalho: 'Ramo', rotulo: 'Vida individual ou em grupo', obrigatoria: false,
    palavras: ['ramo', 'produto', 'segmento', 'vidaindividualougrupo'] },
  { chave: 'sucursal', cabecalho: 'Sucursal', rotulo: 'Sucursal', obrigatoria: false,
    palavras: ['sucursal', 'codsucursal', 'codigodasucursal'] },
  { chave: 'tabulacao', cabecalho: 'Tabulação', rotulo: 'Tabulação', obrigatoria: false,
    palavras: ['tabulacao', 'tabulacoes'] },
  { chave: 'subassunto', cabecalho: 'Sub assunto', rotulo: 'Sub assunto', obrigatoria: false,
    palavras: ['subassunto', 'submotivo'] },
  { chave: 'tmo', cabecalho: 'TMO', rotulo: 'TMO (em segundos)', obrigatoria: false,
    palavras: ['tmo', 'tempomedio', 'tempomediodeatendimento', 'tempodeatendimento'] },
  { chave: 'fila', cabecalho: 'Fila', rotulo: 'Fila', obrigatoria: false,
    palavras: ['fila', 'filadeatendimento', 'nomedafila'] }
];

/** As colunas de texto livre do chat, copiadas como vieram (sem espaço nas pontas). */
const RECC_TEXTOS_DO_CHAT = ['SUSEP', 'Corretora', 'Assunto', 'Consultor', 'Ramo', 'Sucursal',
  'Tabulação', 'Sub assunto', 'Fila'];

/**
 * O TMO em segundos, como a planilha de origem o escreve: o número (1152), o
 * texto com o ponto de milhar ("1.152") ou sem ele ("1152"), e a vírgula
 * decimal ("12,5"). Vazio é vazio; o que não for número devolve `null` — a
 * conferência conta essas linhas e o TMO delas fica em branco, em vez de virar
 * um número inventado.
 */
function segundosDoTmo_(valor) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'number') return isFinite(valor) && valor >= 0 ? valor : null;
  var texto = String(valor).trim().replace(/\s/g, '');
  if (!texto) return '';
  if (/^\d{1,3}(\.\d{3})+$/.test(texto)) return Number(texto.replace(/\./g, ''));
  if (/^\d+$/.test(texto)) return Number(texto);
  if (/^\d+,\d+$/.test(texto)) return Number(texto.replace(',', '.'));
  return null;
}

const RECC_ABA_DO_CHAT = 'ATENDIMENTOS_CHAT';

/** O de-para sugerido: cada coluna da origem para a do chat de mesmo sentido. */
function sugerirDeParaDoChat_(cabecalhosDaFonte) {
  var usadas = {};
  var porPosicao = {};
  RECC_COLUNAS_DO_CHAT.forEach(function (definicao) {
    var palavras = definicao.palavras.concat([normalizarParaComparar_(definicao.cabecalho)]);
    palavras.some(function (palavra) {
      return cabecalhosDaFonte.some(function (cabecalho, i) {
        if (usadas[i] || normalizarParaComparar_(cabecalho) !== palavra) return false;
        usadas[i] = true;
        porPosicao[i] = definicao.cabecalho;
        return true;
      });
    });
  });
  return cabecalhosDaFonte.map(function (cabecalho, i) {
    return { daFonte: String(cabecalho), paraAColuna: porPosicao[i] || '' };
  });
}

/** O que a tela de Importação precisa para trazer atendimentos do chat. */
function opcoesDaImportacaoDoChat() {
  exigirPermissao_(RECC_ACOES.IMPORTAR);
  exigirTela_('importacao');
  var existe = !!planilhaAtiva_().getSheetByName(RECC_ABA_DO_CHAT);
  return {
    canal: { id: '', nome: 'Atendimentos do chat (Mesa)', aba: RECC_ABA_DO_CHAT },
    abaExiste: existe,
    colunasDoCanal: RECC_COLUNAS_DO_CHAT.map(function (d) { return d.cabecalho; }),
    obrigatorias: RECC_COLUNAS_DO_CHAT.filter(function (d) { return d.obrigatoria; })
      .map(function (d) { return d.cabecalho; }),
    colunasDeCarimbo: [],
    analistas: [],
    foraDaDivisao: [],
    statusDoCanal: [],
    statusPadrao: '',
    lotes: existe ? lotesDoChat_() : [],
    limite: RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO,
    repeticaoPelaProposta: false,
    repeticaoPadrao: ''
  };
}

/** Os lotes do chat já importados, do mais recente para o mais antigo. */
function lotesDoChat_() {
  var porLote = {};
  lerRegistros_(RECC_ABA_DO_CHAT).forEach(function (linha) {
    var lote = String(linha.Lote || '').trim();
    if (!lote) return;
    porLote[lote] = (porLote[lote] || 0) + 1;
  });
  return Object.keys(porLote).map(function (lote) {
    return { origem: lote, casos: porLote[lote] };
  });
}

/**
 * Monta as linhas do chat a partir da fonte, e diz o que entra e o que fica de
 * fora — é o miolo da conferência e da gravação, que precisam concordar.
 *
 * Fica de fora: linha sem data ou sem analista (não há como recortar o período,
 * nem de quem somar), data que não é data, e a linha que JÁ ESTÁ na aba. Sem
 * esta última regra, importar a mesma planilha duas vezes contaria cada
 * atendimento em dobro.
 *
 * O "já está" conta QUANTAS vezes: duas linhas idênticas no mesmo arquivo são
 * dois atendimentos (o corretor que chamou duas vezes no dia, pelo mesmo
 * assunto) e entram as duas; se a aba já tem uma igual, entra só a outra. Assim
 * reimportar o mesmo arquivo não dobra nada, e nenhum atendimento de verdade
 * some por parecer com outro.
 */
function linhasDoChatDaFonte_(pedido) {
  var grade = gradeDaFonte_(pedido.fonte);
  if (grade.length < 2) {
    throw new Error('Preciso de pelo menos duas linhas: a primeira com os nomes das '
      + 'colunas e ao menos uma de atendimento. Recebi ' + grade.length + '.');
  }
  var cabecalhosDaFonte = grade[0];
  var corpo = grade.slice(1);
  var dePara = Array.isArray(pedido.dePara) && pedido.dePara.length
    ? pedido.dePara : sugerirDeParaDoChat_(cabecalhosDaFonte);

  var destinos = {};
  dePara.forEach(function (par) { if (par && par.paraAColuna) destinos[par.paraAColuna] = true; });
  var faltando = RECC_COLUNAS_DO_CHAT.filter(function (d) {
    return d.obrigatoria && !destinos[d.cabecalho];
  }).map(function (d) { return d.rotulo; });

  // As quatro colunas da Etapa 41 (sucursal, tabulação, sub assunto e TMO) NÃO
  // entram na chave: as linhas importadas antes delas existirem estão com elas
  // em branco, e reimportar o mesmo arquivo — agora com os valores — contaria
  // tudo em dobro.
  var chave = function (linha) {
    return [linha.Data ? Utilities.formatDate(linha.Data, RECC_FUSO_HORARIO, 'yyyy-MM-dd') : '',
      linha.Analista, linha.SUSEP, linha.Corretora, linha.Assunto, linha.Consultor, linha.Ramo]
      .map(normalizarParaComparar_).join('|');
  };
  var jaNaAba = {};
  if (planilhaAtiva_().getSheetByName(RECC_ABA_DO_CHAT)) {
    lerRegistros_(RECC_ABA_DO_CHAT).forEach(function (linha) {
      var data = linha.Data;
      var a = chave({ Data: Object.prototype.toString.call(data) === '[object Date]' ? data : '',
        Analista: linha.Analista, SUSEP: linha.SUSEP, Corretora: linha.Corretora,
        Assunto: linha.Assunto, Consultor: linha.Consultor, Ramo: linha.Ramo });
      jaNaAba[a] = (jaNaAba[a] || 0) + 1;
    });
  }

  var entram = [];
  var motivos = { vazia: 0, repetida: 0, semDataOuAnalista: 0 };
  var tmoQueNaoENumero = 0;
  corpo.forEach(function (bruta) {
    var linha = linhaDaFonteParaOCaso_(bruta, cabecalhosDaFonte, dePara);
    if (!temAlgumValor_(linha)) { motivos.vazia++; return; }
    var data = dataDoAtendimentoDoChat_(linha.Data);
    var analista = String(linha.Analista || '').trim();
    if (!data || !analista) { motivos.semDataOuAnalista++; return; }
    var pronta = { Data: data, Analista: analista };
    RECC_TEXTOS_DO_CHAT.forEach(function (coluna) {
      pronta[coluna] = String(linha[coluna] === undefined || linha[coluna] === null
        ? '' : linha[coluna]).trim();
    });

    var a = chave(pronta);
    if (jaNaAba[a] > 0) { jaNaAba[a]--; motivos.repetida++; return; }
    var tmo = segundosDoTmo_(linha.TMO);
    if (tmo === null) { tmoQueNaoENumero++; tmo = ''; }
    pronta.TMO = tmo;
    entram.push(pronta);
  });

  // O analista que o cadastro de usuários não conhece: a soma por analista
  // juntaria o chat a um nome que não existe no sistema — é a "junção" que o PO
  // não conseguia fazer. O laudo diz quem é, antes de gravar.
  var conhecidos = {};
  lerRegistros_('USUARIOS').forEach(function (usuario) {
    conhecidos[normalizarParaComparar_(usuario.Nome)] = true;
  });
  var desconhecidos = [];
  entram.forEach(function (linha) {
    var nome = linha.Analista;
    if (!conhecidos[normalizarParaComparar_(nome)] && desconhecidos.indexOf(nome) < 0) {
      desconhecidos.push(nome);
    }
  });

  return { cabecalhosDaFonte: cabecalhosDaFonte, corpo: corpo, dePara: dePara,
    faltando: faltando, entram: entram, motivos: motivos, desconhecidos: desconhecidos,
    tmoQueNaoENumero: tmoQueNaoENumero };
}

/** O passo "conferir antes de importar", para os atendimentos do chat. */
function conferirImportacaoDoChat(pedido) {
  exigirPermissao_(RECC_ACOES.IMPORTAR);
  exigirTela_('importacao');
  var montado = linhasDoChatDaFonte_(dadosDaTela_(pedido || {}));
  var pulam = montado.motivos.vazia + montado.motivos.repetida + montado.motivos.semDataOuAnalista;
  return {
    canal: { id: '', nome: 'Atendimentos do chat (Mesa)', aba: RECC_ABA_DO_CHAT },
    cabecalhosDaFonte: montado.cabecalhosDaFonte,
    colunasDoCanal: RECC_COLUNAS_DO_CHAT.map(function (d) { return d.cabecalho; }),
    colunasDeCarimbo: [],
    dePara: montado.dePara,
    linhasNaFonte: montado.corpo.length,
    vaoEntrar: montado.faltando.length ? 0 : montado.entram.length,
    vaoSerPuladas: pulam,
    motivosParaPular: { vazia: montado.motivos.vazia + montado.motivos.semDataOuAnalista,
      repetida: montado.motivos.repetida },
    semDataOuAnalista: montado.motivos.semDataOuAnalista,
    faltando: montado.faltando,
    analistasDesconhecidos: montado.desconhecidos,
    tmoQueNaoENumero: montado.tmoQueNaoENumero,
    limite: RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO,
    passaDoLimite: montado.corpo.length > RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO,
    amostra: montado.entram.slice(0, 3).map(function (linha) {
      var vista = {};
      Object.keys(linha).forEach(function (coluna) {
        vista[coluna] = coluna === 'Data'
          ? Utilities.formatDate(linha.Data, RECC_FUSO_HORARIO, 'dd/MM/yyyy') : linha[coluna];
      });
      return vista;
    }),
    analistas: [],
    foraDaDivisao: [],
    statusPadrao: ''
  };
}

/**
 * Grava os atendimentos do chat na aba ATENDIMENTOS_CHAT. `pedido.envio`: o
 * mesmo lote não entra duas vezes (Etapa 59, ver comEnvioUnico_).
 */
function importarAtendimentosDoChat(pedido) {
  return comEnvioUnico_((pedido || {}).envio, function () {
    return importarAtendimentosDoChatUmaVez_(pedido);
  });
}

function importarAtendimentosDoChatUmaVez_(pedido) {
  exigirPermissao_(RECC_ACOES.IMPORTAR);
  exigirTela_('importacao');
  pedido = dadosDaTela_(pedido || {});
  if (!planilhaAtiva_().getSheetByName(RECC_ABA_DO_CHAT)) {
    throw new Error('A aba ' + RECC_ABA_DO_CHAT + ' ainda não existe nesta planilha. Rode '
      + 'atualizarPGO() no editor do Apps Script.');
  }
  var lote = String(pedido.origem || '').trim();
  if (!lote) {
    throw new Error('Dê um nome ao lote — "Chat de outubro", por exemplo. É por ele que se '
      + 'acha uma leva importada errada.');
  }
  var montado = linhasDoChatDaFonte_(pedido);
  if (montado.corpo.length > RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO) {
    throw new Error('São no máximo ' + RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO + ' linhas por '
      + 'importação, e vieram ' + montado.corpo.length + '. Divida em levas.');
  }
  if (montado.faltando.length) {
    throw new Error('Diga qual coluna da origem é: ' + montado.faltando.join(' e ')
      + '. Sem a data não há como recortar o período, e sem o analista não há de quem somar.');
  }
  if (!montado.entram.length) {
    throw new Error('Nenhuma linha entraria: ' + montado.motivos.repetida + ' já estão na aba, '
      + montado.motivos.semDataOuAnalista + ' sem data ou sem analista e '
      + montado.motivos.vazia + ' em branco. Nada foi gravado.');
  }
  var agora = new Date();
  var gravados = inserirVariosRegistros_(RECC_ABA_DO_CHAT, montado.entram.map(function (linha) {
    return Object.assign({ Lote: lote, ImportadoEm: agora }, linha);
  }), { origem: RECC_ORIGEM_PLANILHA });
  registrarAuditoria_('chat.importar', RECC_ABA_DO_CHAT, '', lote + ' · ' + gravados.length
    + ' atendimentos');
  return {
    canal: 'Atendimentos do chat (Mesa)',
    origem: lote,
    entraram: gravados.length,
    pulados: { vazia: montado.motivos.vazia + montado.motivos.semDataOuAnalista,
      repetida: montado.motivos.repetida },
    analistas: [],
    analistasDesconhecidos: montado.desconhecidos,
    tmoQueNaoENumero: montado.tmoQueNaoENumero,
    primeiroId: gravados.length ? gravados[0].__id : '',
    ultimoId: gravados.length ? gravados[gravados.length - 1].__id : ''
  };
}

/**
 * Os atendimentos do chat, lidos da aba ATENDIMENTOS_CHAT — o fim dela, com o
 * mesmo teto de linhas que a tela usa para a base do sistema.
 *
 * Nunca lança: a Produtividade da Mesa continua com os números do sistema.
 * `ligado` é haver alguma linha — sem nada importado, a tela diz como trazer.
 */
function lerAtendimentosDoChat_() {
  var vazio = { ligado: false, linhas: [], aviso: '', truncada: false, lidas: 0 };
  try {
    if (!planilhaAtiva_().getSheetByName(RECC_ABA_DO_CHAT)) return vazio;
    var teto = linhasQueOPainelOlha_();
    var registros = lerRegistros_(RECC_ABA_DO_CHAT, { ultimas: teto });
    var linhas = registros.map(function (r) {
      return { data: r.Data, analista: String(r.Analista || '').trim(), susep: r.SUSEP,
        corretora: r.Corretora, assunto: r.Assunto, consultor: r.Consultor, ramo: r.Ramo,
        sucursal: r.Sucursal, tabulacao: r['Tabulação'], subassunto: r['Sub assunto'], tmo: r.TMO,
        fila: r.Fila };
    }).filter(function (linha) { return linha.data || linha.analista; });
    return { ligado: linhas.length > 0, linhas: linhas, aviso: '',
      truncada: registros.length >= teto, lidas: registros.length };
  } catch (erro) {
    return { ligado: true, linhas: [], aviso: erro.message || String(erro), truncada: false, lidas: 0 };
  }
}

/**
 * A data de uma linha do chat. Aceita a data de verdade (a da aba) e o texto:
 * "13/10/2026", "13/10/2026 14:05" e "2026-10-13…".
 */
function dataDoAtendimentoDoChat_(texto) {
  if (Object.prototype.toString.call(texto) === '[object Date]') {
    return isNaN(texto.getTime()) ? '' : texto;
  }
  var achou = String(texto || '').trim().match(/^(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
  return achou ? converterParaData_(achou[1]) : '';
}

/** "Vida individual" e "Vida em grupo", seja como for que cada base escreva. */
function ramoDoAtendimento_(texto) {
  var bruto = String(texto === null || texto === undefined ? '' : texto).trim();
  if (!bruto) return { chave: '', rotulo: '' };
  var n = normalizarParaComparar_(bruto);
  if (n === 'vi' || n.indexOf('individual') >= 0) return { chave: 'vi', rotulo: 'Vida individual' };
  if (n === 'vg' || n.indexOf('grupo') >= 0) return { chave: 'vg', rotulo: 'Vida em grupo' };
  return { chave: n, rotulo: bruto };
}

/** O cadastro de corretoras por SUSEP: o nome e o consultor que valem para os dois lados. */
function indiceDeCorretorasPorSusep_() {
  var indice = {};
  lerRegistros_('CORRETORAS').forEach(function (linha) {
    var chave = chaveDaSusep_(linha.SUSEP);
    if (!chave) return;
    var atual = indice[chave] || { corretora: '', consultor: '', sucursal: '' };
    if (!atual.corretora) atual.corretora = String(linha.Corretora || '').trim();
    if (!atual.consultor) atual.consultor = String(linha.Consultor || '').trim();
    if (!atual.sucursal) atual.sucursal = String(linha.Sucursal === undefined || linha.Sucursal === null
      ? '' : linha.Sucursal).trim();
    indice[chave] = atual;
  });
  return indice;
}

/**
 * Os gráficos de ATENDIDOS da Mesa Diamante: o que está no sistema mais o que
 * veio do chat.
 *
 * `casosDoSistema` já chega no recorte da tela (período e alcance da pessoa);
 * as linhas do chat passam pelas mesmas duas regras — o período pela data
 * delas, o alcance pelo nome do analista, pela MESMA função da tela. Devolve
 * `null` para qualquer canal que não seja a Mesa, e a tela não desenha nada.
 */
function atendimentosDaMesa_(casosDoSistema, canal, quem, periodo) {
  if (!canal || canal.aba !== 'BASE_MESA') return null;

  var estrutura = estruturaDaAba_(canal.aba);
  var achar = function (nome) {
    var posicao = posicaoDaColuna_(estrutura, nome);
    return posicao < 0 ? '' : estrutura.cabecalhos[posicao];
  };
  var colunaDoAnalista = colunaDoResponsavel_(estrutura) || 'Analista';
  var colunas = { susep: achar('SUSEP'), corretora: achar('Corretora'),
    assunto: achar('Assunto'), ramo: achar('Ramo') };

  // O CHAT: lê, recorta o período e o alcance.
  var doChat = lerAtendimentosDoChat_();
  var de = Utilities.formatDate(periodo.de, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
  var ate = Utilities.formatDate(periodo.ate, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
  var semData = 0;
  var doChatNoPeriodo = doChat.linhas.filter(function (linha) {
    var data = dataDoAtendimentoDoChat_(linha.data);
    if (!data) { semData++; return false; }
    var dela = Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
    return dela >= de && dela <= ate;
  });
  var comoRegistros = doChatNoPeriodo.map(function (linha) {
    var registro = { __chat: linha };
    registro[colunaDoAnalista] = linha.analista;
    return registro;
  });
  doChatNoPeriodo = alcanceDaProdutividade_(comoRegistros, canal, quem)
    .map(function (registro) { return registro.__chat; });

  // As duas listas viram uma só, com as mesmas seis dimensões.
  var cadastro = indiceDeCorretorasPorSusep_();
  var nomesDosUsuarios = {};
  lerRegistros_('USUARIOS').forEach(function (usuario) {
    var chave = normalizarParaComparar_(usuario.Nome);
    if (chave) nomesDosUsuarios[chave] = String(usuario.Nome).trim();
  });

  var atendimentos = [];
  function acrescentar(origem, bruto) {
    var susep = susepComoSeEscreve_(bruto.susep);
    var doCadastro = susep ? cadastro[chaveDaSusep_(susep)] : null;
    var analista = String(bruto.analista || '').trim();
    var ramo = ramoDoAtendimento_(bruto.ramo);
    atendimentos.push({
      origem: origem,
      analista: [normalizarParaComparar_(analista),
        nomesDosUsuarios[normalizarParaComparar_(analista)] || analista],
      susep: [chaveDaSusep_(susep), susep],
      // O nome do CADASTRO vale quando a SUSEP é conhecida: duas bases que
      // escrevem a mesma corretora de dois jeitos viram uma barra só.
      corretora: (function () {
        var nome = (doCadastro && doCadastro.corretora) || String(bruto.corretora || '').trim();
        return [normalizarParaComparar_(nome), nome];
      })(),
      assunto: [normalizarParaComparar_(bruto.assunto), String(bruto.assunto || '').trim()],
      consultor: (function () {
        var nome = (doCadastro && doCadastro.consultor) || String(bruto.consultor || '').trim();
        return [normalizarParaComparar_(nome), nome];
      })(),
      // A sucursal que o chat TROUXE vale (Etapa 41, a planilha de origem tem a
      // coluna); sem ela — o caso do sistema, ou o chat em branco —, a do
      // cadastro de corretoras, pela SUSEP.
      sucursal: (function () {
        var doChat = String(bruto.sucursal === undefined || bruto.sucursal === null
          ? '' : bruto.sucursal).trim();
        var nome = doChat || (doCadastro && doCadastro.sucursal) || '';
        return [normalizarParaComparar_(nome), nome];
      })(),
      ramo: [ramo.chave, ramo.rotulo],
      // Só o chat tem fila; o caso do sistema chega sem ela.
      fila: [normalizarParaComparar_(bruto.fila), String(bruto.fila || '').trim()]
    });
  }

  casosDoSistema.forEach(function (caso) {
    acrescentar('sistema', {
      analista: caso[colunaDoAnalista],
      susep: colunas.susep ? caso[colunas.susep] : '',
      corretora: colunas.corretora ? caso[colunas.corretora] : '',
      assunto: colunas.assunto ? caso[colunas.assunto] : '',
      ramo: colunas.ramo ? caso[colunas.ramo] : ''
    });
  });
  doChatNoPeriodo.forEach(function (linha) { acrescentar('chat', linha); });

  // AS VISÕES. A tela tem dois seletores — a origem (Todos / E-mail / Chat) e o
  // ramo (Total / Vida em grupo / Vida individual) — e trocar um deles não volta
  // ao servidor: cada combinação já vem pronta. O "Top 5" de Vida em grupo não
  // é o do total filtrado na tela (os cinco primeiros são outros), e por isso
  // cada visão é montada do zero, pela MESMA função dos gráficos. A visão
  // "todos|total" é a de sempre (`totais` e `graficos`); as outras oito vão em
  // `visoes`, para a resposta não carregar a mesma coisa duas vezes.
  //
  // E-MAIL é o caso cadastrado no sistema; CHAT, o atendimento importado. A
  // definição é do PO ("E-mail: casos do sistema e chat: casos importados"):
  // o campo Canal do caso (Chat, Retorno | chat, E-mail) não entra nela.
  var ORIGENS = [['todos', null], ['sistema', 'sistema'], ['chat', 'chat']];
  var RAMOS = [['total', null], ['vg', 'vg'], ['vi', 'vi']];
  var visoes = {};
  var padrao = null;
  ORIGENS.forEach(function (origem) {
    RAMOS.forEach(function (ramo) {
      var recorte = atendimentos.filter(function (atendimento) {
        return (!origem[1] || atendimento.origem === origem[1])
          && (!ramo[1] || atendimento.ramo[0] === ramo[1]);
      });
      var daOrigem = function (nome) {
        return recorte.filter(function (atendimento) { return atendimento.origem === nome; }).length;
      };
      var visao = {
        totais: { sistema: daOrigem('sistema'), chat: daOrigem('chat'), total: recorte.length },
        graficos: [
          graficoDeAtendidos_(recorte, 'analista', 'Atendidos por analista', 'Analista',
            'barrasDeitadas', 2, 15, 'Sem analista'),
          graficoDeAtendidos_(recorte, 'corretora', 'Top 5 corretoras', 'Corretora',
            'barrasDeitadas', 1, 5, ''),
          graficoDeAtendidos_(recorte, 'susep', 'Top 5 SUSEPs', 'SUSEP',
            'barrasDeitadas', 1, 5, ''),
          graficoDeAtendidos_(recorte, 'sucursal', 'Top 5 sucursais', 'Sucursal',
            'barrasDeitadas', 1, 5, ''),
          graficoDeAtendidos_(recorte, 'assunto', 'Top 5 assuntos', 'Assunto',
            'barrasDeitadas', 1, 5, ''),
          graficoDeAtendidos_(recorte, 'consultor', 'Top 5 consultores', 'Consultor',
            'barrasDeitadas', 1, 5, '')
        ]
      };
      // A rosca de Vida individual × Vida em grupo É a divisão por ramo: ela
      // só existe na visão "Total". Numa visão de um ramo só seria uma fatia de
      // 100%.
      if (!ramo[1]) {
        visao.graficos.push(graficoDeAtendidos_(recorte, 'ramo', 'Vida individual ou Vida em grupo',
          'Ramo', 'pizza', 1, 6, 'Sem informação'));
      }
      // A FILA é coluna só do chat (pedido do PO, 29/10): conta só as linhas
      // do chat, e a visão "E-mail" não tem o gráfico.
      if (origem[0] !== 'sistema') {
        visao.graficos.push(graficoDeAtendidos_(recorte.filter(function (atendimento) {
          return atendimento.origem === 'chat';
        }), 'fila', 'Atendimentos do chat por fila', 'Fila', 'barrasDeitadas', 1, 15, ''));
      }
      if (origem[0] === 'todos' && ramo[0] === 'total') padrao = visao;
      else visoes[origem[0] + '|' + ramo[0]] = visao;
    });
  });

  return {
    chat: {
      ligado: doChat.ligado,
      aviso: doChat.aviso,
      truncada: doChat.truncada,
      linhasLidas: doChat.lidas,
      semData: semData
    },
    totais: padrao.totais,
    graficos: padrao.graficos,
    visoes: visoes
  };
}

/**
 * UM gráfico de atendidos: conta por `dimensao`, separando sistema e chat.
 *
 * `topo` é quantas barras ficam; o resto sai do gráfico, sem "Demais valores"
 * (Etapa 53) — `foraDoTopo` diz quantos, para a tela avisar. `semNome`, quando preenchido, é o balde dos que não trazem a
 * informação e ENTRA no gráfico (analista, ramo); vazio, esses não entram no
 * ranking e são contados à parte em `semInformacao` — um top 5 de corretoras
 * liderado por "sem corretora" não diria nada.
 *
 * O formato é o que `Graficos` da tela já sabe desenhar. Não tem `id`: não mora
 * na aba PAINEIS, e por isso não detalha por clique (mesma regra do valor por
 * situação).
 */
function graficoDeAtendidos_(atendimentos, dimensao, titulo, rotuloDaDimensao, tipo, largura,
  topo, semNome) {
  var baldes = {};
  var ordem = [];
  var semInformacao = 0;

  atendimentos.forEach(function (atendimento) {
    var chave = atendimento[dimensao][0];
    var rotulo = atendimento[dimensao][1];
    if (!chave) {
      if (!semNome) { semInformacao++; return; }
      chave = '__sem';
      rotulo = semNome;
    }
    if (!Object.prototype.hasOwnProperty.call(baldes, chave)) {
      baldes[chave] = { chave: chave, rotulo: rotulo, sistema: 0, chat: 0 };
      ordem.push(chave);
    }
    baldes[chave][atendimento.origem]++;
  });

  var pontos = ordem.map(function (chave) {
    var balde = baldes[chave];
    return { chave: balde.chave, rotulo: balde.rotulo, sistema: balde.sistema, chat: balde.chat,
      valor: balde.sistema + balde.chat, casos: balde.sistema + balde.chat, ehOutros: false };
  }).sort(function (um, outro) {
    // O balde "sem informação" fica por último, e o resto por tamanho.
    if ((um.chave === '__sem') !== (outro.chave === '__sem')) return um.chave === '__sem' ? 1 : -1;
    return outro.valor - um.valor || (um.rotulo < outro.rotulo ? -1 : (um.rotulo > outro.rotulo ? 1 : 0));
  });

  var foraDoTopo = 0;
  if (topo && pontos.length > topo) {
    foraDoTopo = pontos.length - topo;
    pontos = pontos.slice(0, topo);
  }

  pontos = pontos.map(function (ponto, i) {
    // Barra: um tom só (a magnitude é o que importa). Rosca: uma cor por fatia.
    return Object.assign(ponto, {
      tom: ponto.ehOutros ? 'neutro' : '',
      serie: tipo === 'pizza' ? (ponto.ehOutros ? 0 : (i % 6) + 1) : 0
    });
  });

  return {
    titulo: titulo,
    tipo: tipo,
    largura: largura,
    dimensao: rotuloDaDimensao,
    medida: 'Atendimentos',
    agregacao: 'contagem',
    unidade: '',
    ehTempo: false,
    pontos: pontos,
    tendencia: null,
    total: pontos.reduce(function (soma, ponto) { return soma + ponto.valor; }, 0),
    foraDoTopo: foraDoTopo,
    semInformacao: semInformacao,
    aviso: ''
  };
}
