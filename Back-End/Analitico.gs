/**
 * ============================================================================
 * PGO — Analitico.gs · os números por trás da operação
 * ============================================================================
 * O Dashboard responde "o que eu tenho que trabalhar hoje". Esta tela responde
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
 * O painel inteiro: todos os gráficos da mesa, já calculados.
 *
 * Vem numa chamada só porque a tela abre mostrando todos ao mesmo tempo —
 * seis idas ao servidor fariam a tela montar aos pedaços.
 */
function painelAnalitico(idDaMesa, filtros, dias) {
  var quem = exigirTela_('painelAnalitico');
  var mesa = mesaPeloId_(idDaMesa);

  var janela = Number(dias) || Number(valorDaConfiguracao_('OPERACAO.JANELA_DIAS', '30')) || 30;
  var recentes = lerRegistros_(mesa.aba, { ultimas: RECC_LINHAS_QUE_O_PAINEL_OLHA });
  var truncada = recentes.length === RECC_LINHAS_QUE_O_PAINEL_OLHA;

  var noPeriodo = filtrarPeloPeriodo_(recentes, mesa, janela, 0);
  var meus = filtrarPeloAlcance_(noPeriodo, mesa.aba, quem);

  var disponiveis = filtrosDaMesa_(mesa, quem);
  var casos = aplicarFiltros_(meus, disponiveis, filtros || {});

  var componentes = componentesDaMesa_(mesa).map(function (componente) {
    return calcularComponente_(componente, casos, mesa);
  });

  return {
    mesa: { id: mesa.id, nome: mesa.nome, icone: mesa.icone },
    periodo: { dias: janela, rotulo: 'últimos ' + janela + ' dias' },
    total: casos.length,
    truncada: truncada,
    filtrosDisponiveis: disponiveis,
    componentes: componentes,
    podeExportar: podeFazer_(quem.permissoes, RECC_ACOES.EXPORTAR)
  };
}

/** Os gráficos declarados para esta mesa, na ordem escolhida. */
function componentesDaMesa_(mesa) {
  var daMesa = converterParaIdentificador_(mesa.id);

  return lerRegistros_('PAINEIS')
    .filter(function (linha) {
      if (normalizarParaComparar_(linha.Tela) !== 'painelanalitico') return false;
      if (normalizarParaComparar_(linha.Ativo) !== 'sim') return false;
      var mesaDaLinha = converterParaIdentificador_(linha.MesaId);
      return !mesaDaLinha || mesaDaLinha === daMesa;
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
function calcularComponente_(componente, casos, mesa) {
  var estrutura = estruturaDaAba_(mesa.aba);
  var posicaoDaDimensao = posicaoDaColuna_(estrutura, componente.dimensao);

  if (posicaoDaDimensao < 0) {
    return semDados_(componente, 'A coluna "' + componente.dimensao +
      '" não existe na aba ' + mesa.aba + '. Ajuste em Configurações → Painéis.');
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

  var pintado = pintarPontos_(pontos, componente, mesa, ehTempo);

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
function pintarPontos_(pontos, componente, mesa, ehTempo) {
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

  var doCatalogo = coresDoCatalogo_(mesa);
  var ordemEstavel = ordemEstavelDaDimensao_(mesa, componente.dimensao);

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

/** O tom que o catálogo já declarou para cada valor desta mesa. */
function coresDoCatalogo_(mesa) {
  var daMesa = converterParaIdentificador_(mesa.id);
  var cores = {};
  lerRegistros_('CATALOGO').forEach(function (item) {
    var mesaDoItem = converterParaIdentificador_(item.MesaId);
    if (mesaDoItem && mesaDoItem !== daMesa) return;
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
function ordemEstavelDaDimensao_(mesa, cabecalho) {
  var campo = null;
  camposAtivosDaMesa_(mesa.id).forEach(function (umCampo) {
    if (normalizarParaComparar_(umCampo.Cabecalho)
      === normalizarParaComparar_(cabecalho)) campo = umCampo;
  });
  if (!campo) return [];

  return opcoesDoCampo_(lerConfiguracaoDoCampo_(campo), mesa.id)
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
function detalharComponente(idDaMesa, idDoComponente, chaveDoPonto, filtros, dias) {
  var quem = exigirTela_('painelAnalitico');
  var mesa = mesaPeloId_(idDaMesa);

  var componente = null;
  componentesDaMesa_(mesa).forEach(function (um) {
    if (converterParaIdentificador_(um.id)
      === converterParaIdentificador_(idDoComponente)) componente = um;
  });
  if (!componente) {
    throw new Error('Este gráfico não existe mais. Recarregue a tela.');
  }

  var janela = Number(dias) || Number(valorDaConfiguracao_('OPERACAO.JANELA_DIAS', '30')) || 30;
  var recentes = lerRegistros_(mesa.aba, { ultimas: RECC_LINHAS_QUE_O_PAINEL_OLHA });
  var meus = filtrarPeloAlcance_(
    filtrarPeloPeriodo_(recentes, mesa, janela, 0), mesa.aba, quem);
  var casos = aplicarFiltros_(meus, filtrosDaMesa_(mesa, quem), filtros || {});

  var estrutura = estruturaDaAba_(mesa.aba);
  var posicao = posicaoDaColuna_(estrutura, componente.dimensao);
  var ehTempo = posicao >= 0 && (estrutura.tipos[posicao] === RECC_TIPO_DE_DADO.DATA
    || estrutura.tipos[posicao] === RECC_TIPO_DE_DADO.DATA_HORA);

  var procurado = String(chaveDoPonto || '');
  var escolhidos;

  if (procurado === '__outros') {
    // "Outros" é o resto: os casos que NÃO estão em nenhuma das fatias
    // mostradas. Calculamos de novo quais são elas, para a conta bater com o
    // gráfico — e não com uma segunda regra que um dia diverge.
    var mostradas = calcularComponente_(componente, casos, mesa).pontos
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
    colunas: colunasDaFila_(mesa),
    casos: montarFila_(escolhidos, mesa),
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
function exportarComponente(idDaMesa, idDoComponente, filtros, dias) {
  var quem = exigirPermissao_(RECC_ACOES.EXPORTAR);
  exigirTela_('painelAnalitico');

  var painel = painelAnalitico(idDaMesa, filtros, dias);
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
function opcoesDoPainelAnalitico(idDaMesa) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var mesa = mesaPeloId_(idDaMesa);
  var estrutura = estruturaDaAba_(mesa.aba);

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
    mesa: { id: mesa.id, nome: mesa.nome },
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

/** Os gráficos de uma mesa, para a tela de Configurações editar. */
function listarComponentesDoPainel(idDaMesa) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var mesa = mesaPeloId_(idDaMesa);

  return lerRegistros_('PAINEIS')
    .filter(function (linha) {
      if (normalizarParaComparar_(linha.Tela) !== 'painelanalitico') return false;
      return converterParaIdentificador_(linha.MesaId)
        === converterParaIdentificador_(mesa.id);
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
        largura: Number(linha.Largura) || 1,
        mostrar: normalizarParaComparar_(linha.Ativo) === 'sim'
      };
    });
}

/** Grava a lista inteira de gráficos de uma mesa, como os cards do Dashboard. */
function salvarComponentesDoPainel(idDaMesa, componentes) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var mesa = mesaPeloId_(idDaMesa);
  var estrutura = estruturaDaAba_(mesa.aba);
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
    conferirQueAColunaExiste_(estrutura, componente.dimensao, mesa.aba);
    if (agregacaoValida_(componente.agregacao) !== 'contagem') {
      if (!String(componente.medida || '').trim()) {
        throw new Error('"' + componente.titulo + '" soma um valor, mas não diz ' +
          'qual. Escolha a coluna da medida.');
      }
      conferirQueAColunaExiste_(estrutura, componente.medida, mesa.aba);
    }
  });

  var jaGravados = lerRegistros_('PAINEIS').filter(function (linha) {
    if (normalizarParaComparar_(linha.Tela) !== 'painelanalitico') return false;
    return converterParaIdentificador_(linha.MesaId)
      === converterParaIdentificador_(mesa.id);
  });
  var continuam = {};

  lista.forEach(function (componente, posicao) {
    var campos = {
      Tela: 'painelAnalitico',
      MesaId: mesa.id,
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
    mesa.nome + ' · ' + lista.length + ' gráficos');
  return true;
}
