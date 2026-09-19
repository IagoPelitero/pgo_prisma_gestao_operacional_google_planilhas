/**
 * ============================================================================
 * PGO — Indicadores.gs · os números
 * ============================================================================
 * Três telas que contam os mesmos casos e respondem perguntas diferentes:
 * "o que eu trabalho hoje", "o que está acontecendo na operação" e
 * "como eu estou indo". Por isso moram juntas — mudar a regra de contagem
 * num lugar e esquecer dos outros dois é o erro que este arquivo evita.
 *
 * O QUE TEM AQUI DENTRO, nesta ordem:
 *
 *   1. OS CARTÕES DO DIA E A FILA   (era Painel.gs)
 *   2. OS GRÁFICOS DA OPERAÇÃO   (era Analitico.gs)
 *   3. A TELA EM QUE O ANALISTA SE VÊ   (era Performance.gs)
 *
 * Procure pelo banner com ##### para pular de uma seção à outra.
 * ============================================================================
 */

/* ############################################################################
   #
   #  SEÇÃO 1 de 3 · OS CARTÕES DO DIA E A FILA
   #
   #  Era o arquivo Back-End/Painel.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * ============================================================================
 * PGO — Painel.gs · os números do dia e a fila de trabalho
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
 * Quantas linhas do FIM da aba os painéis leem antes de filtrar por data.
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
function resumoDoCanal(idDoCanal, filtros) {
  var quem = exigirTela_('trabalho');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var dias = Number(valorDaConfiguracao_('OPERACAO.JANELA_DIAS', '30')) || 30;

  // A base só acrescenta no fim, então o recente está nas últimas linhas.
  // Ler por data exigiria percorrer tudo; ler o fim e depois filtrar por data
  // custa uma leitura só, e o `truncada` avisa quando a janela não coube.
  var recentes = lerRegistros_(canal.aba, { ultimas: linhasQueOPainelOlha_() });
  var truncada = recentes.length >= linhasQueOPainelOlha_();

  var noPeriodo = filtrarPeloPeriodo_(recentes, canal, dias, 0);
  var meus = filtrarPeloAlcance_(noPeriodo, canal.aba, quem);

  // O período ANTERIOR, do mesmo tamanho, só para dizer se subiu ou desceu.
  var anterior = filtrarPeloAlcance_(
    filtrarPeloPeriodo_(recentes, canal, dias, dias), canal.aba, quem);

  var disponiveis = filtrosDoCanal_(canal, quem);
  var filtrados = aplicarFiltros_(meus, disponiveis, filtros || {});
  var anterioresFiltrados = aplicarFiltros_(anterior, disponiveis, filtros || {});

  return {
    canal: canal,
    periodo: { dias: dias, rotulo: 'últimos ' + dias + ' dias' },
    cartoes: contarCartoes_(filtrados, anterioresFiltrados, canal),
    filtrosDisponiveis: disponiveis,
    colunas: colunasDaFila_(canal),
    fila: montarFila_(filtrados, canal),
    total: filtrados.length,
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

// ============================================================================
// O PERÍODO — três maneiras de escolher, uma só de contar
// ============================================================================

/**
 * As três maneiras de a operação dizer "deste tempo aqui".
 *
 *   ATALHO    — "últimos 30 dias". É o que se usa no dia a dia, e continua
 *               sendo a abertura da tela.
 *   INTERVALO — "de 01/09 a 15/09". É o que responde uma pergunta específica:
 *               a semana da campanha, os dias da virada do sistema.
 *   MÊS       — "setembro de 2026". É como a operação REPORTA, e é diferente
 *               de "últimos 30 dias" — no dia 20 de outubro, os últimos 30
 *               dias pegam metade de setembro e metade de outubro, e nenhum
 *               fechamento mensal se faz assim.
 *
 * O servidor é quem resolve as três numa coisa só: duas datas. A tela escolhe;
 * ela não calcula. Se ela calculasse, o dia que aparece no gráfico e o dia que
 * o servidor contou seriam dois relógios diferentes — o do navegador de quem
 * está olhando e o da planilha —, e num fechamento de mês essa diferença é um
 * dia inteiro de casos.
 */
const RECC_TIPOS_DE_PERIODO = { dias: 'Atalho', intervalo: 'De / até', mes: 'Mês fechado' };

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
  // que a Minha Performance e o Trabalho fazem, e não há motivo para mexer
  // neles — a pergunta deles é sempre "os últimos N dias".
  if (typeof pedido === 'number' || typeof pedido === 'string') {
    return periodoPorDias_(Number(pedido) || padrao);
  }

  var tipo = normalizarParaComparar_(pedido.tipo);

  if (tipo === 'intervalo') {
    var de = converterParaData_(pedido.de);
    var ate = converterParaData_(pedido.ate);
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
  var colunaDoStatus = normalizarParaComparar_(canal.colunaDoStatus || '');
  var campos = camposAtivosDoCanal_(canal.id).slice().sort(function (um, outro) {
    var umEhStatus = normalizarParaComparar_(um.Cabecalho) === colunaDoStatus;
    var outroEhStatus = normalizarParaComparar_(outro.Cabecalho) === colunaDoStatus;
    if (umEhStatus === outroEhStatus) return 0;
    return umEhStatus ? -1 : 1;
  });

  campos.forEach(function (campo) {
    if (disponiveis.length >= 4) return;   // mais que isso vira parede de caixas
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
  var canonicas = ['total', 'situacao', 'naCelula', 'preenchido'];
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

  return cartoesDoCanal_(canal, tela).map(function (cartao) {
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

    var chave = normalizarParaComparar_(cartao.filtro);
    return montarCartao_(chave, cartao.titulo, agora[chave] || 0,
      antes[chave] || 0, cartao.cor || tons[chave] || 'neutro', '');
  }).filter(function (cartao) { return cartao !== null; });
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
        colunaDeCarimbo: String(item.ColunaDeCarimbo || '').trim()
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
 * Coluna que não existe na aba é DESCARTADA em silêncio aqui, e não é
 * descuido: a fila é leitura, e derrubar o Trabalho inteiro porque alguém
 * renomeou uma coluna seria pior. Quem cobra o nome errado é Configurações,
 * na hora de salvar o canal.
 */
function colunasDaFila_(canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var declarado = String(canal.colunasDaFila || '');

  // Sem nenhum dois-pontos, é a escrita plana: cada coluna vira um grupo com
  // o próprio nome. É o que faz um canal antiga continuar funcionando igual,
  // sem ninguém precisar reescrever a linha dela na planilha.
  var pedacos = declarado.indexOf(':') < 0
    ? declarado.split(',')
    : declarado.split(';');

  return pedacos
    .map(function (pedaco) { return grupoDaFila_(pedaco, estrutura, canal); })
    .filter(function (grupo) { return grupo && grupo.colunas.length; });
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
    .map(function (nome) { return nome.trim(); })
    .filter(function (nome) {
      return nome !== '' && posicaoDaColuna_(estrutura, nome) >= 0;
    })
    .map(function (nome) {
      var posicao = posicaoDaColuna_(estrutura, nome);
      return {
        cabecalho: estrutura.cabecalhos[posicao],
        tipo: estrutura.tipos[posicao],
        ehStatus: normalizarParaComparar_(nome)
          === normalizarParaComparar_(canal.colunaDoStatus)
      };
    });

  return {
    // Sem título declarado, o grupo se chama como a sua única coluna — é o
    // que faz a escrita plana continuar valendo, sem um segundo caminho.
    titulo: titulo || (colunas.length ? colunas[0].cabecalho : ''),
    colunas: colunas
  };
}


function montarFila_(registros, canal) {
  var grupos = colunasDaFila_(canal);

  // A cor de cada situação, para a etiqueta da fila sair pintada. Numa fila
  // de trinta linhas, é a cor que faz "não trabalhado" saltar aos olhos.
  var tons = {};
  situacoesDoCanal_(canal).forEach(function (situacao) {
    tons[situacao.chave] = situacao.tom;
  });

  return registros.slice().reverse().map(function (registro) {
    var celulas = grupos.map(function (grupo) {
      return grupo.colunas.map(function (coluna) {
        return {
          cabecalho: coluna.cabecalho,
          valor: paraTexto_(registro[coluna.cabecalho], coluna.tipo),
          ehStatus: coluna.ehStatus
        };
      });
    });
    var situacao = canal.colunaDoStatus
      ? String(registro[canal.colunaDoStatus] || '') : '';
    return {
      id: registro.__id,
      celulas: celulas,
      situacao: situacao,
      tom: tons[normalizarParaComparar_(situacao)] || 'neutro'
    };
  });
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
  return String(valor);
}

/**
 * Um caso inteiro, para a fila abrir sem recarregar a tela.
 * Devolve só o que o nível pode ver — a mesma regra do formulário.
 */
function detalhesDoCaso(idDoCanal, idDoCaso) {
  var quem = exigirTela_('trabalho');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var registro = buscarRegistros_(canal.aba, 'Id', idDoCaso, 1)[0];
  if (!registro) {
    throw new Error('O caso ' + idDoCaso + ' não existe no canal ' + canal.nome + '.');
  }
  exigirAlcanceSobre_(registro, canal, quem);

  var estrutura = estruturaDaAba_(canal.aba);
  var linhas = [];

  camposAtivosDoCanal_(canal.id).forEach(function (campo) {
    if (visibilidadeDoCampo_(quem.permissoes, campo.ChaveTecnica)
      === RECC_VISIBILIDADE.OCULTO) return;

    var posicao = posicaoDaColuna_(estrutura, campo.Cabecalho);
    if (posicao < 0) return;

    // Campo vazio aparece com um travessão, e não sumindo. Sumir faria a
    // pessoa achar que o campo não existe naquelo canal, quando na verdade
    // ele existe e está em branco — que é uma informação.
    linhas.push({
      chave: String(campo.ChaveTecnica),
      rotulo: String(campo.Rotulo || campo.Cabecalho),
      valor: paraTexto_(registro[campo.Cabecalho], estrutura.tipos[posicao]),
      secao: String(campo.Secao || 'Geral')
    });
  });

  var situacao = canal.colunaDoStatus
    ? String(registro[canal.colunaDoStatus] || '') : '';
  var tom = 'neutro';
  situacoesDoCanal_(canal).forEach(function (uma) {
    if (uma.chave === normalizarParaComparar_(situacao)) tom = uma.tom;
  });

  return {
    id: registro.__id,
    canal: canal.nome,
    situacao: situacao,
    tom: tom,
    atualizadoEm: quandoFoiMexido_(canal.aba, registro.__id),
    linhas: linhas,
    linhaDoTempo: linhaDoTempoDoCaso_(registro, canal),
    historico: historicoDoCaso_(canal.aba, registro.__id),
    podeEditar: podeFazer_(quem.permissoes, RECC_ACOES.EDITAR)
  };
}

/**
 * Por onde este caso passou, e quando.
 *
 * Sai dos CARIMBOS: cada status diz, no catálogo, em qual coluna ele grava a
 * data e a hora de quando o caso chegou nele. É o que responde a pergunta da
 * operação — "a data e a hora de cada contato" — sem abrir a planilha.
 *
 * Vem na ordem do CATÁLOGO, e não na ordem das datas. A ordem do catálogo é a
 * jornada como a operação a desenhou, então uma etapa que ficou para trás
 * aparece no lugar dela, vazia, e se lê como o que é: um buraco. Ordenar por
 * data esconderia isso, porque o que não tem data não teria onde ficar.
 *
 * Status sem coluna de carimbo fica de fora: ele não tem o que contar.
 */
function linhaDoTempoDoCaso_(registro, canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var agora = normalizarParaComparar_(canal.colunaDoStatus
    ? registro[canal.colunaDoStatus] : '');

  var etapas = [];
  situacoesDoCanal_(canal).forEach(function (situacao) {
    if (!situacao.colunaDeCarimbo) return;

    var posicao = posicaoDaColuna_(estrutura, situacao.colunaDeCarimbo);
    if (posicao < 0) return;

    var valor = registro[situacao.colunaDeCarimbo];
    etapas.push({
      status: situacao.nome,
      tom: situacao.tom,
      quando: paraTexto_(valor, estrutura.tipos[posicao]),
      cumprida: String(valor === null || valor === undefined ? '' : valor).trim() !== '',
      ehOndeEstaAgora: situacao.chave === agora
    });
  });
  return etapas;
}

/**
 * O que já aconteceu com este caso, do mais antigo para o mais recente.
 *
 * Sai da trilha de auditoria, e não de uma coluna de histórico na base: a
 * trilha já registra quem fez o quê e quando, e uma segunda memória da mesma
 * coisa é uma que um dia diverge da outra.
 */
function historicoDoCaso_(nomeDaAba, idDoCaso) {
  var nomes = {};
  lerRegistros_('USUARIOS').forEach(function (usuario) {
    nomes[usuario.__id] = String(usuario.Nome);
  });

  var comoSeChama = {
    'caso.criar': 'Caso cadastrado',
    'caso.editar': 'Caso alterado',
    'caso.status': 'Situação alterada',
    'caso.ocultar': 'Caso ocultado'
  };

  return lerRegistros_('AUDITORIA')
    .filter(function (linha) {
      if (normalizarParaComparar_(linha.Entidade)
        !== normalizarParaComparar_(nomeDaAba)) return false;
      return converterParaIdentificador_(linha.RegistroId)
        === converterParaIdentificador_(idDoCaso);
    })
    .map(function (linha) {
      var acao = String(linha.Acao || '');
      return {
        acao: comoSeChama[acao] || acao,
        detalhe: String(linha.Detalhe || ''),
        quem: nomes[converterParaIdentificador_(linha.UsuarioId)] || 'Sem dados',
        quando: linha.DataHora
          ? Utilities.formatDate(new Date(linha.DataHora), RECC_FUSO_HORARIO,
            'dd/MM/yyyy, HH:mm')
          : ''
      };
    });
}

/** Quando o caso foi mexido pela última vez, segundo a trilha. */
function quandoFoiMexido_(nomeDaAba, idDoCaso) {
  var passos = historicoDoCaso_(nomeDaAba, idDoCaso);
  return passos.length ? passos[passos.length - 1].quando : '';
}

/* ############################################################################
   #
   #  SEÇÃO 2 de 3 · OS GRÁFICOS DA OPERAÇÃO
   #
   #  Era o arquivo Back-End/Analitico.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * ============================================================================
 * PGO — Analitico.gs · os números por trás da operação
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
 * Quantas fatias a pizza aguenta antes de virar confete.
 *
 * Acima disto, o resto vira "Outros" — e não uma cor nova. Cor gerada na hora
 * fica indistinguível das outras para quem não enxerga cor, e quebra a
 * separação que a paleta garante.
 */
const RECC_MAXIMO_DE_FATIAS = 6;

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

  var recentes = lerRegistros_(canal.aba, { ultimas: linhasQueOPainelOlha_() });
  var truncada = recentes.length >= linhasQueOPainelOlha_();

  // Linha sem data FICA no atalho e SAI dos períodos fechados. Num "últimos 30
  // dias" ela é um caso mal preenchido que precisa aparecer; num "setembro" ela
  // é um caso sobre o qual não dá para afirmar que é de setembro.
  var guardarSemData = (periodo.tipo === 'dias');

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
    cartoes: contarCartoes_(casos, casosDeAntes, canal, 'produtividade'),
    componentes: componentes,
    podeExportar: podeFazer_(quem.permissoes, RECC_ACOES.EXPORTAR)
  };
}

// ----------------------------------------------------------------------------
// O ALCANCE DESTA TELA
// ----------------------------------------------------------------------------

/**
 * A Produtividade RECC mostra SEMPRE a equipe. Não há vista individual aqui.
 *
 * As duas telas de número responderam a mesma pergunta por um tempo, com um
 * par de botões em cada uma para escolher "eu" ou "a equipe". A operação
 * cortou isso, e a divisão ficou mais clara do que estava:
 *
 *   MINHA PERFORMANCE é sobre MIM — as minhas inclusões, sempre.
 *   PRODUTIVIDADE RECC é sobre A EQUIPE — sempre.
 *
 * Duas telas, duas perguntas, nenhum botão para errar. Quem quiser o número de
 * uma pessoa dentro da equipe usa o filtro de Analista, que é outra coisa:
 * recortar a equipe, e não trocar de assunto.
 *
 * O ALARGAMENTO, que é a parte que merece atenção. Um analista com escopo
 * "próprios" enxerga só os casos dele no Trabalho e na Busca — e continua
 * assim nessas telas. AQUI ele passa a ver a equipe, porque uma tela chamada
 * "Produtividade RECC" que mostrasse uma pessoa só não seria a tela que a
 * operação pediu. É uma decisão de produto, tomada pelo PO, e vale só nesta
 * tela: as outras seguem obedecendo ao escopo do nível.
 *
 * A equipe é quem está cadastrado no mesmo canal que a pessoa atende — a mesma
 * definição que o escopo "equipe" usa. Quem não pertence a canal nenhum (quem
 * administra) já enxerga tudo pelo escopo dele, e não precisa de alargamento.
 */
function alcanceDaProdutividade_(registros, canal, quem) {
  if (quem.permissoes.escopo !== RECC_ESCOPOS.PROPRIOS) {
    return filtrarPeloAlcance_(registros, canal.aba, quem);
  }

  var coluna = colunaDoResponsavel_(estruturaDaAba_(canal.aba));
  var minhaEquipe = nomesDaMinhaEquipe_(quem);

  // Sem coluna de responsável não há como recortar por pessoa, e sem equipe
  // declarada não há equipe para alargar. Nos dois casos o alcance normal
  // vale — mostrar a base inteira porque faltou um cadastro seria trocar uma
  // regra de acesso por um descuido.
  if (!coluna || !minhaEquipe || !minhaEquipe.length) {
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
      '" não existe na aba ' + canal.aba + '. Ajuste em Configurações → Painéis.');
  }

  var tipoDaDimensao = estrutura.tipos[posicaoDaDimensao];
  var ehTempo = (tipoDaDimensao === RECC_TIPO_DE_DADO.DATA
    || tipoDaDimensao === RECC_TIPO_DE_DADO.DATA_HORA);

  if (componente.agregacao !== 'contagem' && !componente.medida) {
    return semDados_(componente, 'Este gráfico soma um valor, mas não diz qual. ' +
      'Escolha a coluna da medida em Configurações → Painéis.');
  }

  var somas = {};
  var quantidades = {};
  var ordemDasChaves = [];

  casos.forEach(function (caso) {
    var chave = ehTempo
      ? diaDoCaso_(caso[componente.dimensao])
      : String(caso[componente.dimensao] || '').trim();
    if (chave === '') chave = 'Sem informação';

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
  // o estado normal de um gráfico sobre o tombamento antes do primeiro
  // tombamento. A tela mostra o recado, que explica, no lugar do desenho, que
  // não explica.
  if (ordemDasChaves.length === 1 && ordemDasChaves[0] === 'Sem informação') {
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

  var dobrados = 0;
  if (!ehTempo) {
    var teto = componente.limite > 0
      ? componente.limite
      : (componente.tipo === 'pizza' ? RECC_MAXIMO_DE_FATIAS : pontos.length);
    if (componente.tipo === 'pizza' && teto > RECC_MAXIMO_DE_FATIAS) {
      teto = RECC_MAXIMO_DE_FATIAS;
    }
    if (pontos.length > teto) {
      var resto = pontos.slice(teto);
      dobrados = resto.length;
      var soma = resto.reduce(function (total, ponto) { return total + ponto.valor; }, 0);
      var casosDoResto = resto.reduce(function (total, ponto) {
        return total + ponto.casos;
      }, 0);
      pontos = pontos.slice(0, teto);
      // "Demais valores", e não "Outros": várias listas da operação já têm
      // um item chamado "Outros", e duas linhas com o mesmo nome no mesmo
      // gráfico — uma real e uma somada — não têm como ser distinguidas.
      //
      // E é uma fatia só, nunca uma cor nova: cor gerada na hora fica igual
      // às outras para quem não enxerga cor.
      pontos.push({ chave: '__outros', rotulo: 'Demais valores', valor: soma,
        casos: casosDoResto, ehOutros: true });
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
    dobradosEmOutros: dobrados,
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
    dobradosEmOutros: 0,
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
  periodoPedido) {
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
  var recentes = lerRegistros_(canal.aba, { ultimas: linhasQueOPainelOlha_() });
  // O MESMO período e o MESMO alcance do painel. Sem isto, clicar numa barra
  // abriria uma lista de tamanho diferente do número que a barra mostrava — e
  // a pessoa concluiria, com razão, que um dos dois está errado.
  var meus = alcanceDaProdutividade_(
    entreDuasDatas_(recentes, canal, periodo.de, periodo.ate,
      periodo.tipo === 'dias'),
    canal, quem);
  var casos = aplicarFiltros_(meus, filtrosDoCanal_(canal, quem), filtros || {});

  var estrutura = estruturaDaAba_(canal.aba);
  var posicao = posicaoDaColuna_(estrutura, componente.dimensao);
  var ehTempo = posicao >= 0 && (estrutura.tipos[posicao] === RECC_TIPO_DE_DADO.DATA
    || estrutura.tipos[posicao] === RECC_TIPO_DE_DADO.DATA_HORA);

  var procurado = String(chaveDoPonto || '');
  var escolhidos;

  if (procurado === '__outros') {
    // "Outros" é o resto: os casos que NÃO estão em nenhuma das fatias
    // mostradas. Calculamos de novo quais são elas, para a conta bater com o
    // gráfico — e não com uma segunda regra que um dia diverge.
    var mostradas = calcularComponente_(componente, casos, canal).pontos
      .filter(function (ponto) { return !ponto.ehOutros; })
      .map(function (ponto) { return normalizarParaComparar_(ponto.chave); });

    escolhidos = casos.filter(function (caso) {
      var valor = String(caso[componente.dimensao] || '').trim() || 'Sem informação';
      return mostradas.indexOf(normalizarParaComparar_(valor)) < 0;
    });
  } else {
    escolhidos = casos.filter(function (caso) {
      var valor = ehTempo
        ? diaDoCaso_(caso[componente.dimensao])
        : (String(caso[componente.dimensao] || '').trim() || 'Sem informação');
      return normalizarParaComparar_(valor) === normalizarParaComparar_(procurado);
    });
  }

  return {
    titulo: componente.titulo,
    ponto: ehTempo ? rotuloDoDia_(procurado)
      : (procurado === '__outros' ? 'Demais valores' : procurado),
    colunas: colunasDaFila_(canal),
    casos: montarFila_(escolhidos, canal),
    total: escolhidos.length
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
  var quem = exigirPermissao_(RECC_ACOES.EXPORTAR);
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
    maximoDeFatias: RECC_MAXIMO_DE_FATIAS
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
   #  SEÇÃO 3 de 3 · A TELA EM QUE O ANALISTA SE VÊ
   #
   #  Era o arquivo Back-End/Performance.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * ============================================================================
 * PGO — Performance.gs · a tela em que o analista se vê
 * ============================================================================
 * As outras telas mostram a operação. Esta mostra UMA PESSOA — e por isso o
 * cuidado aqui é de outra natureza. Um número mal escolhido no Trabalho
 * atrapalha uma decisão; um número mal escolhido aqui atrapalha alguém.
 *
 * QUATRO DECISÕES, e cada uma tem motivo:
 *
 *   1. O RANKING SEGUE O ALCANCE DO NÍVEL. Quem só enxerga os próprios casos
 *      NÃO vê uma lista com o nome dos colegas — vê a própria posição contra
 *      a MÉDIA da equipe. Mostrar a lista a quem não pode ver os casos dos
 *      outros seria uma porta dos fundos, e ainda por cima a mais constrangedora.
 *
 *   2. TODO NÚMERO VEM COM A SUA BASE. "8 casos" sozinho não diz nada; "8 de
 *      uma média de 6" diz. Comparação sem referência é o jeito mais rápido
 *      de transformar um painel em ansiedade.
 *
 *   3. O QUE NÃO DÁ PARA CALCULAR NÃO APARECE. Tempo médio exige que o canal
 *      declare a coluna de finalização. Sem ela, o indicador some — e não
 *      aparece zerado, que pareceria um desempenho ruim.
 *
 *   4. A META É DECLARADA, NUNCA INVENTADA. Canal sem meta em `CANAIS` não
 *      ganha barra de progresso. Um alvo tirado do nada é pior que alvo
 *      nenhum: ele parece oficial.
 * ============================================================================
 */

/** Quantas pessoas o ranking mostra em volta de quem está olhando. */
const RECC_VIZINHOS_NO_RANKING = 2;

/**
 * Os números de quem está olhando, no canal e no período escolhidos.
 */
function minhaPerformance(idDoCanal, dias) {
  var quem = exigirTela_('minhaPerformance');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var janela = Number(dias) || Number(valorDaConfiguracao_('OPERACAO.JANELA_DIAS', '30')) || 30;
  var recentes = lerRegistros_(canal.aba, { ultimas: linhasQueOPainelOlha_() });
  // Bateu no teto de leitura: pode haver caso do período que ficou de fora.
  // Aqui isto pesa mais que nas outras telas — esta é a tela sobre UMA PESSOA,
  // e número incompleto vira julgamento errado sobre alguém.
  var truncada = recentes.length >= linhasQueOPainelOlha_();
  var noPeriodo = filtrarPeloPeriodo_(recentes, canal, janela, 0);
  var anterior = filtrarPeloPeriodo_(recentes, canal, janela, janela);

  var coluna = colunaDoResponsavel_(estruturaDaAba_(canal.aba));
  var meuNome = String(quem.usuario.Nome || '');

  // SEMPRE as minhas inclusões. Esta tela é sobre UMA PESSOA, e por decisão da
  // operação ela não troca de assunto: quem quiser o número da equipe abre a
  // Produtividade RECC, que é a tela da equipe. Duas telas, duas perguntas.
  //
  // O que a equipe ainda faz aqui é dar REFERÊNCIA: o bloco "Você e a equipe",
  // mais abaixo, mostra a média e a posição de quem está olhando. Saber que se
  // fez 8 não diz nada sem saber que a média é 6.
  var minhaEquipe = nomesDaMinhaEquipe_(quem);
  var olhados = casosDaPessoa_(noPeriodo, coluna, meuNome);
  var olhadosAntes = casosDaPessoa_(anterior, coluna, meuNome);

  return {
    canal: { id: canal.id, nome: canal.nome, icone: canal.icone },
    pessoa: {
      nome: meuNome,
      cargo: quem.cargo,
      nivel: quem.nivel,
      canal: String(quem.usuario['Canal que atende'] || '')
    },
    periodo: { dias: janela, rotulo: 'últimos ' + janela + ' dias' },
    truncada: truncada,
    linhasLidas: recentes.length,
    // Sem coluna de responsável não há "meus casos", e a tela diz isso em vez
    // de mostrar zero — zero pareceria que a pessoa não trabalhou.
    temResponsavel: !!coluna,
    indicadores: indicadoresDaPessoa_(olhados, olhadosAntes, canal),
    meta: metaDaPessoa_(olhados, canal, janela, 1),
    porDia: serieDoPeriodo_(olhados, canal, janela),
    porSituacao: distribuicao_(olhados, canal, canal.colunaDoStatus, 'Situação'),
    porCanal: distribuicao_(olhados, canal, colunaDoCanal_(canal), 'Canal'),
    // O ranking compara DENTRO da equipe: é a pergunta "como eu vou em relação
    // a quem faz o mesmo que eu". Rankear contra o canal inteiro colocaria o
    // analista da RET ao lado de quem nem atende RET.
    equipe: comoVaiAEquipe_(noPeriodo, coluna, meuNome, quem, canal, minhaEquipe),
    recentes: oQueEuFiz_(quem, canal)
  };
}

/** Os casos em que a pessoa é a responsável. */
function casosDaPessoa_(registros, coluna, nome) {
  if (!coluna) return [];
  var procurado = normalizarParaComparar_(nome);
  return registros.filter(function (registro) {
    return normalizarParaComparar_(registro[coluna]) === procurado;
  });
}

/** A coluna de canal do canal, quando ela tem uma. */
function colunaDoCanal_(canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var achada = '';
  estrutura.cabecalhos.forEach(function (cabecalho) {
    if (achada) return;
    if (normalizarParaComparar_(cabecalho) === 'canal') achada = cabecalho;
  });
  return achada;
}

// ============================================================================
// OS INDICADORES
// ============================================================================

/**
 * Os números da pessoa, cada um com o do período anterior ao lado.
 *
 * Todo indicador carrega a comparação: "8 casos" sozinho não diz nada, "8
 * contra 6 no período anterior" diz. E o que não dá para calcular neste canal
 * simplesmente não entra na lista.
 */
function indicadoresDaPessoa_(meus, meusAntes, canal) {
  var lista = [];

  lista.push(indicador_('trabalhados', 'Casos trabalhados',
    meus.length, meusAntes.length, 'casos',
    'Todos os casos em que você é a pessoa responsável no período.'));

  if (canal.colunaDoStatus) {
    var concluidos = contarConcluidos_(meus, canal);
    lista.push(indicador_('concluidos', 'Concluídos',
      concluidos, contarConcluidos_(meusAntes, canal), 'casos',
      'Casos que chegaram a uma situação de conclusão.'));

    lista.push(indicador_('emAberto', 'Ainda em aberto',
      meus.length - concluidos, meusAntes.length - contarConcluidos_(meusAntes, canal),
      'casos', 'O que continua esperando alguma tratativa sua.'));
  }

  var tempo = tempoMedioDeTratativa_(meus, canal);
  if (tempo !== null) {
    lista.push(indicador_('tempoMedio', 'Tempo médio até concluir',
      tempo, tempoMedioDeTratativa_(meusAntes, canal), 'dias',
      'Da entrada do caso até a finalização, nos que você concluiu.',
      // Aqui, MENOS é melhor: a tela precisa saber disso para não pintar de
      // vermelho uma queda que é boa notícia.
      true));
  }

  var naCelula = resolvidosSemEncaminhar_(meus, canal);
  if (naCelula !== null) {
    lista.push(indicador_('naCelula', 'Resolvidos sem encaminhar',
      naCelula, resolvidosSemEncaminhar_(meusAntes, canal), 'casos',
      'Concluídos por você, sem passar para outra área.'));
  }

  return lista;
}

function indicador_(chave, rotulo, valor, anterior, unidade, explicacao, menorEhMelhor) {
  var variacao = null;
  if (anterior > 0) {
    variacao = Math.round(((valor - anterior) / anterior) * 100);
  }
  return {
    chave: chave,
    rotulo: rotulo,
    valor: valor,
    anterior: anterior,
    // Sem base de comparação a variação fica VAZIA, e não "+100%": subir de
    // zero para um não é dobrar, e "+100%" ali é ruído que a operação aprende
    // a ignorar — junto com a variação que importa.
    variacao: variacao,
    unidade: unidade,
    explicacao: explicacao,
    menorEhMelhor: !!menorEhMelhor
  };
}

/** Uma situação conta como conclusão quando o nome dela começa com "conclu". */
function contarConcluidos_(casos, canal) {
  if (!canal.colunaDoStatus) return 0;
  return casos.filter(function (caso) {
    return normalizarParaComparar_(caso[canal.colunaDoStatus]).indexOf('conclu') === 0;
  }).length;
}

/**
 * Quantos dias, em média, entre a entrada do caso e a finalização.
 *
 * Devolve null quando o canal não declara a coluna de finalização, ou quando
 * ninguém concluiu nada no período: um "0 dias" ali pareceria um desempenho
 * excelente, e é só ausência de dado.
 */
function tempoMedioDeTratativa_(casos, canal) {
  if (!canal.colunaDaData || !canal.colunaDaFinalizacao) return null;

  var soma = 0;
  var quantos = 0;
  casos.forEach(function (caso) {
    var entrada = converterParaData_(caso[canal.colunaDaData]);
    var fim = converterParaData_(caso[canal.colunaDaFinalizacao]);
    if (!entrada || !fim) return;
    var dias = (fim.getTime() - entrada.getTime()) / (1000 * 60 * 60 * 24);
    if (dias < 0) return;   // data invertida na planilha não vira média negativa
    soma += dias;
    quantos++;
  });

  if (!quantos) return null;
  return Math.round((soma / quantos) * 10) / 10;
}

/** Concluídos sem encaminhar para outra área. Null quando não dá para saber. */
function resolvidosSemEncaminhar_(casos, canal) {
  return contarFinalizadosNaCelula_(casos, canal);
}

// ============================================================================
// A META
// ============================================================================

/**
 * O progresso contra a meta do canal, proporcional ao período escolhido.
 *
 * Devolve null quando o canal não declarou meta. Alvo tirado do nada é pior
 * que alvo nenhum: ele parece oficial, e ninguém sabe de onde saiu.
 */
function metaDaPessoa_(meus, canal, dias, quantasPessoas) {
  var mensal = Number(canal.metaMensalPorPessoa) || 0;
  if (!mensal) return null;

  // `quantasPessoas` é sempre 1 hoje: a Minha Performance é de uma pessoa só.
  // O parâmetro ficou porque a conta é a mesma para um grupo — meta por pessoa
  // vezes o tamanho do grupo —, e o dia em que alguma tela somar gente ela não
  // vai precisar reescrever isto. Comparar o resultado de cinco pessoas com a
  // meta de uma faria toda equipe parecer 400% acima do alvo.
  var pessoas = Number(quantasPessoas) || 1;
  var alvo = Math.round((mensal / 30) * dias) * pessoas;
  var feito = contarConcluidos_(meus, canal);

  return {
    alvo: alvo,
    feito: feito,
    pessoas: pessoas,
    // Passar da meta não vira 140% de barra: a barra enche e o número diz o
    // resto. Barra estourando a caixa é defeito, não conquista.
    percentual: alvo ? Math.min(Math.round((feito / alvo) * 100), 100) : 0,
    percentualReal: alvo ? Math.round((feito / alvo) * 100) : 0,
    mensal: mensal,
    rotulo: alvo + ' caso(s) em ' + dias + ' dias, na proporção da meta de '
      + mensal + ' por mês'
      + (pessoas > 1 ? ' para cada uma das ' + pessoas + ' pessoas' : '')
  };
}

// ============================================================================
// A EVOLUÇÃO E A DISTRIBUIÇÃO
// ============================================================================

/**
 * Quantos casos por dia, no formato que o desenho de gráfico já entende.
 *
 * Dia sem caso entra ZERADO, e não some: uma linha que pula os dias vazios
 * mente sobre o ritmo — dois casos em dois dias seguidos e dois casos com
 * uma semana de intervalo desenhariam a mesma linha.
 */
function serieDoPeriodo_(meus, canal, dias) {
  if (!canal.colunaDaData) return null;

  var porDia = {};
  meus.forEach(function (caso) {
    var data = converterParaData_(caso[canal.colunaDaData]);
    if (!data) return;
    var chave = Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
    porDia[chave] = (porDia[chave] || 0) + 1;
  });

  var pontos = [];
  var hoje = new Date();
  // No máximo 45 colunas: acima disso a linha vira um borrão e cada ponto
  // fica menor que o dedo de quem tenta tocar nele.
  var quantos = Math.min(dias, 45);
  for (var i = quantos - 1; i >= 0; i--) {
    var dia = new Date(hoje.getTime() - i * 24 * 60 * 60 * 1000);
    var chave = Utilities.formatDate(dia, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
    pontos.push({
      chave: chave,
      rotulo: Utilities.formatDate(dia, RECC_FUSO_HORARIO, 'dd/MM'),
      valor: porDia[chave] || 0,
      casos: porDia[chave] || 0,
      tom: '',
      serie: 0
    });
  }

  return {
    titulo: 'Seus casos por dia',
    tipo: 'barrasComLinha',
    largura: 2,
    unidade: 'casos',
    agregacao: 'contagem',
    dimensao: 'Dia',
    ehTempo: true,
    pontos: pontos,
    tendencia: mediaMovel_(pontos, 7),
    aviso: ''
  };
}

/** Uma pizza dos casos da pessoa, por uma coluna qualquer. */
function distribuicao_(meus, canal, coluna, titulo) {
  if (!coluna) return null;

  var cores = coresDoCatalogo_(canal);
  var ordem = ordemEstavelDaDimensao_(canal, coluna);
  var soma = {};
  var chaves = [];

  meus.forEach(function (caso) {
    var valor = String(caso[coluna] || '').trim() || 'Sem informação';
    if (!Object.prototype.hasOwnProperty.call(soma, valor)) {
      soma[valor] = 0;
      chaves.push(valor);
    }
    soma[valor]++;
  });

  var pontos = chaves.map(function (chave) {
    var normalizado = normalizarParaComparar_(chave);
    var posicao = ordem.indexOf(normalizado);
    return {
      chave: chave,
      rotulo: chave,
      valor: soma[chave],
      casos: soma[chave],
      // A mesma regra do Painel: a cor segue a entidade, e não a posição.
      tom: cores[normalizado] || '',
      serie: posicao >= 0 ? (posicao % 6) + 1 : 6
    };
  }).sort(function (um, outro) { return outro.valor - um.valor; });

  return {
    titulo: titulo, tipo: 'pizza', largura: 1, unidade: 'casos',
    agregacao: 'contagem', dimensao: titulo, ehTempo: false,
    pontos: pontos.slice(0, RECC_MAXIMO_DE_FATIAS), tendencia: null, aviso: ''
  };
}

// ============================================================================
// A EQUIPE
// ============================================================================

/**
 * Como a pessoa está em relação à equipe — e o que ela pode ver disso.
 *
 * Quem só enxerga os próprios casos NÃO recebe a lista com o nome dos
 * colegas: recebe a própria posição contra a média. Mostrar a lista a quem
 * não pode ver os casos dos outros seria uma porta dos fundos — e, ainda por
 * cima, a mais constrangedora que existe num sistema de trabalho.
 *
 * Quem pode ver recebe a lista, mas com a MÉDIA marcada: "abaixo da média"
 * sem saber qual é a média não é informação, é só desconforto.
 */
function comoVaiAEquipe_(noPeriodo, coluna, meuNome, quem, canal, minhaEquipe) {
  if (!coluna) return { podeVerNomes: false, disponivel: false };

  // Quando a pessoa TEM equipe, o ranking é dentro dela. Antes era dentro do
  // canal inteiro, e isso colocava um analista ao lado de gente que nem atende
  // a mesma coisa — a posição dizia menos do que parecia dizer. Quem não tem
  // equipe (quem administra) continua vendo o canal, que é o que faz sentido
  // para quem olha de cima.
  var soEstes = null;
  if (minhaEquipe && minhaEquipe.length) {
    soEstes = {};
    minhaEquipe.forEach(function (nome) {
      soEstes[normalizarParaComparar_(nome)] = true;
    });
  }

  var porPessoa = {};
  var nomes = [];
  noPeriodo.forEach(function (caso) {
    var nome = String(caso[coluna] || '').trim();
    if (!nome) return;
    if (soEstes && !soEstes[normalizarParaComparar_(nome)]) return;
    if (!Object.prototype.hasOwnProperty.call(porPessoa, nome)) {
      porPessoa[nome] = 0;
      nomes.push(nome);
    }
    porPessoa[nome]++;
  });

  if (!nomes.length) return { podeVerNomes: false, disponivel: false };

  var lista = nomes.map(function (nome) {
    return { nome: nome, valor: porPessoa[nome],
      souEu: normalizarParaComparar_(nome) === normalizarParaComparar_(meuNome) };
  }).sort(function (um, outro) { return outro.valor - um.valor; });

  lista.forEach(function (um, i) { um.posicao = i + 1; });

  var soma = lista.reduce(function (total, um) { return total + um.valor; }, 0);
  var media = Math.round((soma / lista.length) * 10) / 10;
  var eu = lista.filter(function (um) { return um.souEu; })[0] || null;

  var podeVerNomes = quem.permissoes.escopo === RECC_ESCOPOS.TODOS
    || quem.permissoes.escopo === RECC_ESCOPOS.CANAL
    || quem.permissoes.escopo === RECC_ESCOPOS.EQUIPE;

  return {
    disponivel: true,
    podeVerNomes: podeVerNomes,
    quantasPessoas: lista.length,
    media: media,
    minhaPosicao: eu ? eu.posicao : null,
    meuValor: eu ? eu.valor : 0,
    // A lista sai com os vizinhos de quem está olhando — e não do primeiro ao
    // último. Um pódio completo diz muito pouco a quem está no meio e diz
    // demais sobre quem está embaixo.
    lista: podeVerNomes ? vizinhosNoRanking_(lista, eu) : []
  };
}

function vizinhosNoRanking_(lista, eu) {
  if (!eu) return lista.slice(0, RECC_VIZINHOS_NO_RANKING * 2 + 1);

  var meu = eu.posicao - 1;
  var de = Math.max(0, meu - RECC_VIZINHOS_NO_RANKING);
  var ate = Math.min(lista.length, de + RECC_VIZINHOS_NO_RANKING * 2 + 1);
  de = Math.max(0, ate - (RECC_VIZINHOS_NO_RANKING * 2 + 1));
  return lista.slice(de, ate);
}

// ============================================================================
// O QUE EU FIZ
// ============================================================================

/**
 * As últimas ações da própria pessoa, tiradas da trilha de auditoria.
 *
 * Só as dela: a trilha completa é da tela de Configurações, para quem
 * administra. Aqui é a memória de quem está olhando.
 */
function oQueEuFiz_(quem, canal) {
  var comoSeChama = {
    'caso.criar': 'Cadastrou um caso',
    'caso.editar': 'Alterou um caso',
    'caso.status': 'Mudou a situação',
    'caso.ocultar': 'Excluiu um caso',
    'busca': 'Procurou um caso'
  };

  var meuId = converterParaIdentificador_(quem.usuario.Id);

  return lerRegistros_('AUDITORIA', { ultimas: 400 })
    .filter(function (linha) {
      if (converterParaIdentificador_(linha.UsuarioId) !== meuId) return false;
      // Só o que é TRABALHO. Mexer numa configuração é ação de quem
      // administra, e a trilha completa dessas está em Configurações — aqui
      // é a memória de quem atende, e ela não pode virar um log de sistema.
      return Object.prototype.hasOwnProperty.call(comoSeChama, String(linha.Acao));
    })
    .reverse()
    .slice(0, 12)
    .map(function (linha) {
      return {
        acao: comoSeChama[String(linha.Acao)] || String(linha.Acao),
        detalhe: String(linha.Detalhe || ''),
        registro: String(linha.RegistroId || ''),
        entidade: String(linha.Entidade || ''),
        // O caso só abre quando é deste canal: um Id da outra base abriria a
        // tela errada, ou nada.
        abre: normalizarParaComparar_(linha.Entidade)
          === normalizarParaComparar_(canal.aba) && !!linha.RegistroId,
        quando: linha.DataHora
          ? Utilities.formatDate(new Date(linha.DataHora), RECC_FUSO_HORARIO,
            'dd/MM/yyyy, HH:mm')
          : ''
      };
    });
}
