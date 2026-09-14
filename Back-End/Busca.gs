/**
 * ============================================================================
 * PGO — Busca.gs · achar um caso que a fila não mostra mais
 * ============================================================================
 * O Dashboard mostra os últimos 30 dias. Isso é de propósito: ele responde
 * "o que eu tenho que trabalhar hoje". Quando o cliente liga citando um
 * protocolo de abril, é aqui que se procura.
 *
 * A REGRA QUE SUSTENTA ESTA TELA: **ler a coluna antes de ler as linhas.**
 *
 *   Uma base da RET com 200 mil linhas por 39 colunas são 7,8 milhões de
 *   células. Ler tudo para procurar um protocolo estoura o tempo do Apps
 *   Script e a cota da conta. Ler UMA coluna são 200 mil células; ler cinco
 *   colunas de busca é um milhão. Depois de saber QUAIS linhas casam — que
 *   costumam ser uma ou duas —, aí sim se lê a linha inteira.
 *
 * A comparação IGNORA MÁSCARA quando a coluna é identificador ou documento:
 * quem digita "1-2345678901" acha "12345678901", e quem digita
 * "123.456.789-01" acha "12345678901". Exigir o formato exato transformaria
 * a busca em adivinhação.
 *
 * E há a PLANILHA LEGADA: o histórico que ficou no sistema anterior. Ela é
 * lida como está — primeira linha é cabeçalho, e nada mais é assumido —,
 * porque não temos contrato sobre ela e nunca vamos ter.
 * ============================================================================
 */

/** Quantos casos a busca devolve, no máximo, por origem. */
const RECC_MAXIMO_DA_BUSCA = 100;

/** Menos que isto é termo curto demais: acharia meia base. */
const RECC_MINIMO_DO_TERMO = 3;

/**
 * O que a tela precisa saber ao abrir: onde dá para procurar.
 */
function opcoesDaBusca() {
  var quem = exigirTela_('buscarCaso');

  return {
    mesas: mesasVisiveis_().map(function (mesa) {
      return {
        id: mesa.id,
        nome: mesa.nome,
        icone: mesa.icone,
        procuraEm: colunasDaBusca_(mesa).map(function (coluna) {
          return coluna.cabecalho;
        })
      };
    }),
    legado: descricaoDoLegado_(),
    minimo: RECC_MINIMO_DO_TERMO,
    maximo: RECC_MAXIMO_DA_BUSCA,
    escopo: quem.permissoes.escopo
  };
}

/**
 * Procura o termo nas mesas escolhidas e, se estiver ligada, na base legada.
 *
 * `ondeProcurar` é a lista de ids de mesa; vazio procura em todas as que a
 * pessoa enxerga. `incluirLegado` diz se a planilha antiga entra.
 */
function buscarCasos(termo, ondeProcurar, incluirLegado) {
  var quem = exigirTela_('buscarCaso');

  var procurado = String(termo || '').trim();
  if (procurado.length < RECC_MINIMO_DO_TERMO) {
    throw new Error('Digite ao menos ' + RECC_MINIMO_DO_TERMO + ' caracteres. ' +
      'Com menos que isso a busca traria meia base, e nenhuma delas seria a ' +
      'que você procura.');
  }

  var escolhidas = (ondeProcurar || []).map(converterParaIdentificador_);
  var resultados = [];

  mesasVisiveis_().forEach(function (mesa) {
    if (escolhidas.length && escolhidas.indexOf(converterParaIdentificador_(mesa.id)) < 0) {
      return;
    }
    resultados.push(procurarNaMesa_(mesa, procurado, quem));
  });

  if (incluirLegado) {
    var doLegado = procurarNoLegado_(procurado);
    if (doLegado) resultados.push(doLegado);
  }

  var total = resultados.reduce(function (soma, origem) {
    return soma + origem.casos.length;
  }, 0);

  registrarAuditoria_('busca', 'BUSCA', '', procurado);
  return { termo: procurado, total: total, origens: resultados };
}

// ============================================================================
// A BUSCA NA BASE PRÓPRIA
// ============================================================================

/**
 * As colunas em que a mesa procura.
 *
 * Declaradas em `MESAS.ColunasDaBusca`, e não adivinhadas: adivinhar acerta
 * na mesa de hoje e erra na próxima. Sem nada declarado, procura na coluna
 * da situação e na da data — pouco, mas nunca na base inteira.
 */
function colunasDaBusca_(mesa) {
  var estrutura = estruturaDaAba_(mesa.aba);

  return String(mesa.colunasDaBusca || '')
    .split(',')
    .map(function (nome) { return nome.trim(); })
    .filter(function (nome) {
      return nome !== '' && posicaoDaColuna_(estrutura, nome) >= 0;
    })
    .map(function (nome) {
      var posicao = posicaoDaColuna_(estrutura, nome);
      return {
        cabecalho: estrutura.cabecalhos[posicao],
        tipo: estrutura.tipos[posicao]
      };
    });
}

/**
 * Procura numa mesa, lendo coluna por coluna e só depois as linhas que casam.
 */
function procurarNaMesa_(mesa, termo, quem) {
  var colunas = colunasDaBusca_(mesa);
  var aviso = '';

  if (!colunas.length) {
    return {
      tipo: 'mesa',
      id: mesa.id,
      nome: mesa.nome,
      icone: mesa.icone,
      colunas: [],
      casos: [],
      aviso: 'Esta mesa não declarou em quais colunas procurar. ' +
        'Isso se ajusta em Configurações → Mesas de trabalho.'
    };
  }

  // Passo 1: ler só as colunas de busca, e anotar em QUAIS linhas o termo
  // aparece. É aqui que a tela não estoura numa base grande.
  var linhasQueCasam = {};
  var ordemDasLinhas = [];

  colunas.forEach(function (coluna) {
    var valores = lerColunaInteira_(mesa.aba, coluna.cabecalho);
    for (var i = 0; i < valores.length; i++) {
      var numeroDaLinha = i + 2;   // a linha 1 é o cabeçalho
      if (linhasQueCasam[numeroDaLinha]) continue;
      if (!casaComOTermo_(valores[i], termo, coluna.tipo)) continue;

      linhasQueCasam[numeroDaLinha] = coluna.cabecalho;
      ordemDasLinhas.push(numeroDaLinha);
    }
  });

  if (ordemDasLinhas.length > RECC_MAXIMO_DA_BUSCA) {
    aviso = 'A busca achou ' + ordemDasLinhas.length + ' casos e mostra os ' +
      RECC_MAXIMO_DA_BUSCA + ' mais recentes. Um termo mais específico ' +
      'chega mais perto.';
    // Os mais recentes são os do fim da base, que só acrescenta no fim.
    ordemDasLinhas = ordemDasLinhas.slice(-RECC_MAXIMO_DA_BUSCA);
  }

  // Passo 2: agora sim, ler as linhas inteiras — só essas.
  ordemDasLinhas.sort(function (uma, outra) { return outra - uma; });
  var registros = lerLinhasEspecificas_(mesa.aba, ordemDasLinhas)
    .filter(function (registro) {
      // Caso ocultado não volta na busca. A linha continua na planilha, e
      // um administrador ainda a enxerga por lá.
      return normalizarParaComparar_(registro._Visivel) !== 'nao';
    });

  var meus = filtrarPeloAlcance_(registros, mesa.aba, quem);

  return {
    tipo: 'mesa',
    id: mesa.id,
    nome: mesa.nome,
    icone: mesa.icone,
    colunas: colunasDaFila_(mesa),
    casos: montarFila_(meus.slice().reverse(), mesa),
    ondeAchou: linhasQueCasam,
    procurouEm: colunas.map(function (coluna) { return coluna.cabecalho; }),
    aviso: aviso
  };
}

/**
 * O valor da célula casa com o que a pessoa digitou?
 *
 * Identificador e documento comparam só os DÍGITOS, dos dois lados: quem
 * digita "123.456.789-01" acha "12345678901", e vice-versa. O resto compara
 * texto sem acento e sem caixa, procurando o termo dentro do valor.
 */
function casaComOTermo_(valor, termo, tipo) {
  if (valor === '' || valor === null || valor === undefined) return false;

  if (tipo === RECC_TIPO_DE_DADO.IDENTIFICADOR) {
    var digitosDoTermo = apenasDigitos_(termo);
    if (!digitosDoTermo) return false;
    return apenasDigitos_(valor).indexOf(digitosDoTermo) >= 0;
  }

  return normalizarParaComparar_(valor)
    .indexOf(normalizarParaComparar_(termo)) >= 0;
}

// ============================================================================
// A PLANILHA LEGADA
// ============================================================================

/** O que está configurado sobre a base antiga, sem tentar abri-la. */
function descricaoDoLegado_() {
  var id = String(valorDaConfiguracao_('LEGADO.PLANILHA_ID', '')).trim();
  return {
    ligado: id !== '',
    rotulo: String(valorDaConfiguracao_('LEGADO.ROTULO', 'Base legada')),
    aba: String(valorDaConfiguracao_('LEGADO.ABA', '')).trim()
  };
}

/**
 * Procura na planilha do sistema anterior.
 *
 * Ela não tem contrato: a primeira linha é entendida como cabeçalho e nada
 * mais é assumido — nem tipo de coluna, nem nome, nem ordem. Procura em
 * TODAS as colunas, porque não há como saber quais importam.
 *
 * Falhar aqui não pode derrubar a busca na base própria: uma planilha que
 * saiu do ar, ou uma permissão que caiu, viram um recado ao lado dos
 * resultados de verdade.
 */
function procurarNoLegado_(termo) {
  var configurado = descricaoDoLegado_();
  if (!configurado.ligado) return null;

  var id = String(valorDaConfiguracao_('LEGADO.PLANILHA_ID', '')).trim();
  var aba;
  try {
    var planilha = abrirPlanilhaDeFora_(id);
    aba = configurado.aba
      ? planilha.getSheetByName(configurado.aba)
      : planilha.getSheets()[0];
    if (!aba) {
      return recadoDoLegado_(configurado, 'A aba "' + configurado.aba +
        '" não existe na planilha legada.');
    }
  } catch (erro) {
    // Aqui a falha NÃO derruba a busca: a base própria já respondeu, e perder
    // o histórico antigo é melhor que perder a busca inteira. O recado sai
    // junto do resultado, na origem "legado".
    return recadoDoLegado_(configurado, 'Não consegui abrir a planilha legada. '
      + (erro.message || erro));
  }

  var totalDeLinhas = aba.getLastRow();
  var totalDeColunas = aba.getLastColumn();
  if (totalDeLinhas < 2 || totalDeColunas < 1) {
    return recadoDoLegado_(configurado, 'A planilha legada está vazia.');
  }

  var tudo = aba.getRange(1, 1, totalDeLinhas, totalDeColunas).getValues();
  var cabecalhos = tudo[0].map(function (celula, i) {
    return String(celula || '').trim() || ('Coluna ' + (i + 1));
  });

  var achados = [];
  for (var linha = 1; linha < tudo.length && achados.length < RECC_MAXIMO_DA_BUSCA; linha++) {
    var casou = false;
    for (var coluna = 0; coluna < cabecalhos.length; coluna++) {
      // Sem tipo declarado, tentamos as duas comparações: por dígitos e por
      // texto. É o preço de ler uma planilha sobre a qual não temos contrato.
      if (casaComOTermo_(tudo[linha][coluna], termo, RECC_TIPO_DE_DADO.TEXTO)
        || casaComOTermo_(tudo[linha][coluna], termo,
          RECC_TIPO_DE_DADO.IDENTIFICADOR)) {
        casou = true;
        break;
      }
    }
    if (!casou) continue;

    achados.push({
      id: 'legado-' + (linha + 1),
      celulas: [cabecalhos.map(function (cabecalho, i) {
        return {
          cabecalho: cabecalho,
          valor: paraTexto_(tudo[linha][i], RECC_TIPO_DE_DADO.TEXTO),
          ehStatus: false
        };
      })],
      situacao: '',
      tom: 'neutro'
    });
  }

  return {
    tipo: 'legado',
    id: 'legado',
    nome: configurado.rotulo,
    icone: '',
    colunas: [{ titulo: 'Registro', colunas: [] }],
    cabecalhos: cabecalhos,
    casos: achados,
    // Um caso do legado NÃO abre no modal: ele não é um caso do sistema, é
    // uma linha de histórico. Prometer edição ali seria mentira.
    somenteLeitura: true,
    aviso: achados.length >= RECC_MAXIMO_DA_BUSCA
      ? 'Mostrando os ' + RECC_MAXIMO_DA_BUSCA + ' primeiros da base legada.'
      : ''
  };
}

function recadoDoLegado_(configurado, mensagem) {
  return {
    tipo: 'legado',
    id: 'legado',
    nome: configurado.rotulo,
    icone: '',
    colunas: [],
    cabecalhos: [],
    casos: [],
    somenteLeitura: true,
    aviso: mensagem
  };
}

// ============================================================================
// CONFIGURAÇÃO DA BASE LEGADA
// ============================================================================

/** O que a tela de Configurações mostra sobre a base antiga. */
function configuracaoDoLegado() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  return {
    planilhaId: String(valorDaConfiguracao_('LEGADO.PLANILHA_ID', '')),
    aba: String(valorDaConfiguracao_('LEGADO.ABA', '')),
    rotulo: String(valorDaConfiguracao_('LEGADO.ROTULO', 'Base legada'))
  };
}

/**
 * Aponta a base legada, conferindo NA HORA se dá para abri-la.
 *
 * Guardar um Id que não abre deixaria a busca com um recado de erro para
 * sempre, e ninguém saberia se o Id estava errado ou se a planilha tinha
 * sumido. Melhor recusar aqui, com o motivo.
 */
function salvarConfiguracaoDoLegado(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var id = String(dados.planilhaId || '').trim();
  var aba = String(dados.aba || '').trim();

  if (id) {
    // Aqui a falha DERRUBA, e é de propósito: guardar um Id que não abre
    // deixaria a busca com um recado de erro para sempre, sem ninguém saber
    // se o Id estava errado ou se a planilha sumiu depois.
    var planilha = abrirPlanilhaDeFora_(id);
    if (aba && !planilha.getSheetByName(aba)) {
      throw new Error('A planilha abriu, mas não tem uma aba chamada "' + aba +
        '". As abas dela são: ' + planilha.getSheets().map(function (uma) {
          return uma.getName();
        }).join(', ') + '.');
    }
  }

  gravarConfiguracao_('LEGADO.PLANILHA_ID', id);
  gravarConfiguracao_('LEGADO.ABA', aba);
  gravarConfiguracao_('LEGADO.ROTULO',
    String(dados.rotulo || '').trim() || 'Base legada');

  registrarAuditoria_('legado.configurar', 'CONFIG', '', id ? 'ligada' : 'desligada');
  return configuracaoDoLegado();
}
