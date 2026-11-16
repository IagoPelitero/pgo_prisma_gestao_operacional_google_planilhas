/**
 * ============================================================================
 * PGO — Cadastros.gs · quem traz o caso para dentro
 * ============================================================================
 * Corretoras Diamante e SUSEPs bloqueadas — e o jeito de trazer essas duas
 * listas de fora sem digitar uma a uma.
 *
 * O QUE TEM AQUI DENTRO, nesta ordem:
 *
 *   1. OS DOIS CADASTROS
 *   2. COLAR, CONFERIR E APLICAR EM LOTE
 *
 * Procure pelo banner com ##### para pular de uma seção à outra.
 * ============================================================================
 */

/* ############################################################################
   #
   #  SEÇÃO 1 de 2 · OS TRÊS CADASTROS
   #
   ############################################################################ */

/**
 * ============================================================================
 * Quem traz o caso para dentro
 * ============================================================================
 * Três cadastros que sustentam o resto do sistema e que, até aqui, só se
 * ajustavam abrindo a planilha:
 *
 *   CORRETORAS             corretoras, corretores e agentes, com o segmento
 *   SUSEP_BLOQUEADAS   quem está impedido, e por quê
 *
 * O QUE FAZ ESTA TELA VALER MAIS QUE UMA LISTA: ela cruza o cadastro com os
 * CASOS. Uma tabela de corretoras sem volume é uma agenda telefônica; com o
 * volume ao lado, ela responde "quem me dá trabalho" — e, principalmente,
 * mostra as SUSEPs que aparecem nos casos e NÃO estão cadastradas.
 *
 * Essa última é a informação mais útil daqui. Uma SUSEP fora do cadastro faz
 * o selo do formulário dizer "não encontrada" toda vez, e ninguém descobre
 * por quê — porque o sintoma aparece em outra tela, uma pessoa de cada vez.
 * Aqui elas aparecem juntas, com quantos casos cada uma já trouxe.
 * ============================================================================
 */

/** Quantas corretoras a tela lista de uma vez. */
const RECC_MAXIMO_DE_CORRETORAS = 300;

/**
 * A tela inteira: os três cadastros e o cruzamento com os casos.
 */
function tabelaDeCorretoras(procurar, segmento) {
  var quem = exigirTela_('tabelaCorretoras');

  var volumes = volumePorSusep_();
  var termo = normalizarParaComparar_(procurar);
  // Vários segmentos de uma vez (Etapa 72); um só, como antes, continua valendo.
  var segmentosProcurados = opcoesEscolhidas_(segmento);

  var todas = lerRegistros_('CORRETORAS').map(function (linha) {
    var susep = susepComoSeEscreve_(linha.SUSEP);
    return {
      id: linha.__id,
      susep: susep,
      corretora: String(linha.Corretora || ''),
      sucursal: String(linha.Sucursal || ''),
      // Cadastro sem segmento não vira "Diamante" por descuido: vira o que
      // ele é, "Não encontrado", e a tela mostra isso.
      segmento: String(linha.Segmento || '') || 'Não encontrado',
      consultor: String(linha.Consultor || ''),
      casos: volumes.porSusep[chaveDaSusep_(susep)] || 0
    };
  });

  /*
   * CORRETORA DIAMANTE NÃO TEM STATUS DE BLOQUEADA, e esta tabela não cruza
   * mais com a lista de bloqueios.
   *
   * Decisão do PO: "corretoras Diamante não podem ter status de bloqueada por
   * gentileza mesmo que o SUSEP esteja na lista de bloqueadas. Pertence a
   * outra lista". Eram duas listas com dois donos e dois propósitos, e a
   * pastilha vermelha aqui misturava as duas — quem olhava a tabela Diamante
   * via um bloqueio que não é dela.
   *
   * O mesmo vale no selo do Cadastrar Caso: ver `consultarSusep`.
   */
  var filtradas = todas.filter(function (uma) {
    if (segmentosProcurados.length
      && segmentosProcurados.indexOf(normalizarParaComparar_(uma.segmento)) < 0) return false;
    if (!termo) return true;
    if (normalizarParaComparar_(uma.corretora).indexOf(termo) >= 0) return true;
    if (normalizarParaComparar_(uma.sucursal).indexOf(termo) >= 0) return true;
    if (normalizarParaComparar_(uma.consultor).indexOf(termo) >= 0) return true;
    // A SUSEP procura por TEXTO, e não por dígito: "RET" acha "RET00J".
    return chaveDaSusep_(uma.susep).indexOf(termo) >= 0;
  }).sort(function (uma, outra) {
    // Quem mais traz caso primeiro: a tela existe para trabalhar, e o volume
    // é o que dá ordem de importância a uma lista de trezentos nomes.
    if (outra.casos !== uma.casos) return outra.casos - uma.casos;
    return uma.corretora < outra.corretora ? -1 : 1;
  });

  return {
    corretoras: filtradas.slice(0, RECC_MAXIMO_DE_CORRETORAS),
    truncada: filtradas.length > RECC_MAXIMO_DE_CORRETORAS,
    quantasNoTotal: todas.length,
    quantasFiltradas: filtradas.length,
    segmentos: segmentosConhecidos_(todas),
    // As SUSEPs que os casos citam e o cadastro não conhece. É o achado desta
    // tela: enquanto elas não entram, o selo do formulário diz "não
    // encontrada" toda vez, e ninguém liga uma coisa à outra.
    foraDoCadastro: susepsForaDoCadastro_(volumes, todas),
    podeMexer: podeFazer_(quem.permissoes, RECC_ACOES.CONFIGURAR),
    podeExportar: podeFazer_(quem.permissoes, RECC_ACOES.EXPORTAR),
    // De onde vieram estes cadastros. A tela precisa dizer: editar achando que
    // mexeu numa planilha e ter mexido em outra é o tipo de confusão que só
    // aparece quando já tem gente trabalhando em cima do dado errado.
    origem: {
      corretoras: deOndeVemAAba_('CORRETORAS'),
      suseps: deOndeVemAAba_('SUSEP_BLOQUEADAS')
    }
  };
}

/** Quantos casos cada SUSEP trouxe, somando os canais. */
function volumePorSusep_() {
  var porSusep = {};
  var nomePorSusep = {};
  // Como a SUSEP aparece ESCRITA nos casos. A chave é normalizada para
  // comparar; a tela precisa mostrar "RET00J", e não "ret00j".
  var comoSeEscreve = {};

  canaisVisiveis_().forEach(function (canal) {
    var estrutura;
    try {
      estrutura = estruturaDaAba_(canal.aba);
    } catch (erro) {
      return;   // aba que sumiu não derruba a tela
    }

    var colunaDaSusep = '';
    var colunaDaCorretora = '';
    estrutura.cabecalhos.forEach(function (cabecalho) {
      var comparavel = normalizarParaComparar_(cabecalho);
      if (comparavel === 'susep') colunaDaSusep = cabecalho;
      if (comparavel === 'corretora') colunaDaCorretora = cabecalho;
    });
    if (!colunaDaSusep) return;

    // Só a coluna da SUSEP, e a da corretora: a mesma regra da busca — ler as
    // 39 colunas de todas as linhas para contar uma coisa não se paga.
    var suseps = lerColunaInteira_(canal.aba, colunaDaSusep);
    var corretoras = colunaDaCorretora
      ? lerColunaInteira_(canal.aba, colunaDaCorretora) : [];

    for (var i = 0; i < suseps.length; i++) {
      // A chave é de TEXTO: a SUSEP tem letra. Ver chaveDaSusep_.
      var susep = chaveDaSusep_(suseps[i]);
      if (!susep) continue;
      porSusep[susep] = (porSusep[susep] || 0) + 1;
      if (!comoSeEscreve[susep]) comoSeEscreve[susep] = susepComoSeEscreve_(suseps[i]);
      if (!nomePorSusep[susep] && corretoras[i]) {
        nomePorSusep[susep] = String(corretoras[i]);
      }
    }
  });

  return {
    porSusep: porSusep,
    nomePorSusep: nomePorSusep,
    comoSeEscreve: comoSeEscreve
  };
}

/** As SUSEPs que aparecem nos casos e não estão no cadastro de canais. */
function susepsForaDoCadastro_(volumes, cadastradas) {
  var conhecidas = {};
  cadastradas.forEach(function (uma) {
    if (uma.susep) conhecidas[chaveDaSusep_(uma.susep)] = true;
  });

  /*
   * A LISTA DE BLOQUEADAS NÃO CONTA MAIS COMO "CONHECIDA".
   *
   * Contava, enquanto o selo do formulário mostrava o bloqueio: uma SUSEP
   * bloqueada era reconhecida, e listá-la como "fora do cadastro" seria um
   * aviso que não batia com a tela. Agora o selo ignora o bloqueio quando a
   * corretora é Diamante, e as duas listas são de donos diferentes — uma
   * SUSEP que só está na lista de bloqueios continua FORA do cadastro de
   * corretoras, e é isso que esta lista existe para dizer.
   */
  var fora = [];
  Object.keys(volumes.porSusep).forEach(function (susep) {
    if (conhecidas[susep]) return;
    fora.push({
      susep: volumes.comoSeEscreve[susep] || susep,
      // O nome que os próprios casos usam. É um palpite, e a tela diz que é:
      // ele serve para a pessoa reconhecer a corretora, não para cadastrar
      // no automático.
      nomeNosCasos: volumes.nomePorSusep[susep] || '',
      casos: volumes.porSusep[susep]
    });
  });

  return fora.sort(function (uma, outra) { return outra.casos - uma.casos; });
}

/** Os segmentos que aparecem, para o filtro não ser uma lista escrita à mão. */
function segmentosConhecidos_(todas) {
  var vistos = {};
  var lista = [];
  todas.forEach(function (uma) {
    var chave = normalizarParaComparar_(uma.segmento);
    if (vistos[chave]) return;
    vistos[chave] = true;
    lista.push(uma.segmento);
  });
  return lista.sort();
}

// ============================================================================
// MEXER NO CADASTRO
// ============================================================================

/**
 * Cria ou altera uma corretora.
 *
 * A SUSEP é única: duas linhas com a mesma SUSEP fariam o selo do formulário
 * escolher uma delas — e a escolha seria a ordem da planilha, que ninguém
 * controla.
 */
function salvarCorretora(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');
  dados = dadosDaTela_(dados);

  var susep = susepComoSeEscreve_(dados.susep);
  if (!susep) throw new Error('Informe a SUSEP — é ela que liga a corretora ao caso.');

  var corretora = String(dados.corretora || '').trim();
  if (!corretora) throw new Error('Informe o nome da corretora.');

  var id = converterParaIdentificador_(dados.id);
  // Repetida pela CHAVE, não pelo texto: "ret00j" e "RET00J" são a mesma
  // SUSEP, e deixar as duas entrarem faria o selo do formulário escolher uma
  // delas pela ordem da planilha, que ninguém controla.
  var repetida = lerRegistros_('CORRETORAS').filter(function (linha) {
    return chaveDaSusep_(linha.SUSEP) === chaveDaSusep_(susep)
      && converterParaIdentificador_(linha.Id) !== id;
  })[0];
  if (repetida) {
    throw new Error('A SUSEP ' + susep + ' já está cadastrada para "' +
      repetida.Corretora + '". Duas linhas com a mesma SUSEP fariam o selo do ' +
      'formulário escolher uma delas pela ordem da planilha.');
  }

  var campos = {
    SUSEP: susep,
    Corretora: corretora,
    Sucursal: String(dados.sucursal || '').trim(),
    Segmento: String(dados.segmento || '').trim() || 'Não encontrado',
    Consultor: String(dados.consultor || '').trim()
  };

  if (id) {
    atualizarRegistro_('CORRETORAS', id, campos);
    registrarAuditoria_('corretora.editar', 'CORRETORAS', id, corretora);
    return id;
  }
  var criada = inserirRegistro_('CORRETORAS', campos);
  registrarAuditoria_('corretora.criar', 'CORRETORAS', criada.__id, corretora);
  return criada.__id;
}

/** Tira a corretora da tela. A linha permanece na planilha. */
function ocultarCorretora(idDaCorretora) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var alvo = converterParaIdentificador_(idDaCorretora);
  var atual = buscarRegistros_('CORRETORAS', 'Id', alvo, 1)[0];
  if (!atual) throw new Error('A corretora ' + alvo + ' não existe.');

  ocultarRegistro_('CORRETORAS', alvo, quem.usuario.Id);
  registrarAuditoria_('corretora.ocultar', 'CORRETORAS', alvo, String(atual.Corretora));
  return true;
}

// ============================================================================
// AS SUSEPs BLOQUEADAS
// ============================================================================

/*
 * QUEM BLOQUEOU: A COMPANHIA OU A CORRETORA.
 *
 * Pedido do PO: "as suseps bloqueadas são por 2 tipos: bloqueadas pela
 * companhia e bloqueada pela corretora". O valor gravado na coluna
 * `BloqueadaPor` é um destes dois, escrito sempre igual — a planilha filtra
 * por ele, e "companhia", "Cia" e "COMPANHIA" seriam três tipos para o filtro.
 *
 * Em branco é o terceiro estado, e é de propósito: as linhas que já existiam
 * antes da coluna ficam SEM TIPO, decisão do PO, até alguém editar e escolher.
 */
var RECC_QUEM_BLOQUEOU = ['Companhia', 'Corretora'];

/** 'companhia', 'CORRETORA ' → 'Companhia', 'Corretora'. O resto vira ''. */
function quemBloqueou_(texto) {
  var procurado = normalizarParaComparar_(texto);
  return RECC_QUEM_BLOQUEOU.filter(function (tipo) {
    return normalizarParaComparar_(tipo) === procurado;
  })[0] || '';
}

/** A aba já tem a coluna? Planilha que não rodou `atualizarPGO()` ainda não. */
function abaTemBloqueadaPor_() {
  return posicaoDaColuna_(estruturaDaAba_('SUSEP_BLOQUEADAS'), 'BloqueadaPor') >= 0;
}

/**
 * Como criar a coluna que falta. Depende de onde a aba mora: aqui, o
 * `atualizarPGO()` cria; na planilha de cadastros de fora, quem cria é quem
 * cuida dela — o PGO não mexe na estrutura de uma planilha que não é sua.
 */
function comoCriarAColuna_(nomeDaAba, cabecalho) {
  return abaVemDeOutraPlanilha_(nomeDaAba)
    ? 'A aba ' + nomeDaAba + ' da planilha de cadastros ainda não tem a coluna "'
      + cabecalho + '". Acrescente essa coluna lá, na primeira linha.'
    : 'A aba ' + nomeDaAba + ' ainda não tem a coluna "' + cabecalho
      + '". Peça ao administrador para rodar atualizarPGO().';
}

/*
 * A LISTA DE SUSEPs BLOQUEADAS com 151 mil linhas (Etapa 55, pedido do PO: elas
 * vão para a segunda base, "pela corretora e pela Porto"). Antes a lista ia
 * INTEIRA para a tela — com 151 mil linhas, uns 20 MB e o erro dos 40 segundos.
 * Agora o servidor lê só as colunas de procura, escolhe até 100 linhas e lê só
 * essas: primeiro as que aparecem nos casos (é o que a tela existe para
 * mostrar), depois as mais recentes. A busca procura nas 151 mil.
 */
const RECC_MAXIMO_DE_BLOQUEADAS_NA_TELA = 100;

/** A lista e as contagens, para a tela: quantas há, quantas a busca achou, se cortou. */
function resumoDasSusepsBloqueadas(procurar) {
  var quem = exigirTela_('tabelaCorretoras');
  var volumes = volumePorSusep_();
  var termo = normalizarParaComparar_(procurar);
  var estrutura = estruturaDaAba_('SUSEP_BLOQUEADAS');
  var coluna = function (cabecalho) {
    return posicaoDaColuna_(estrutura, cabecalho) >= 0
      ? lerColunaInteira_('SUSEP_BLOQUEADAS', cabecalho) : [];
  };

  var suseps = coluna('SUSEP');
  var visiveis = coluna('_Visivel');
  // Etapa 63: com termo, o localizador do Sheets diz em quais linhas ele
  // aparece, sem trazer as três colunas que só servem à busca. Sem o
  // localizador, elas são lidas e comparadas aqui, como antes.
  var achadasPeloTermo = termo ? linhasDoTermoNasBloqueadas_(estrutura, termo) : null;
  var deProcura = termo && !achadasPeloTermo
    ? ['NomeCorretora', 'Sucursal', 'CoordenadorComercial'].map(coluna) : [];

  var quantasNoTotal = 0;
  var candidatas = [];
  for (var i = 0; i < suseps.length; i++) {
    if (visiveis.length && normalizarParaComparar_(visiveis[i]) === 'nao') continue;
    var chave = chaveDaSusep_(suseps[i]);
    if (!chave) continue;
    quantasNoTotal++;
    if (termo && (achadasPeloTermo ? !achadasPeloTermo[i + 2]
      : chave.indexOf(termo) < 0 && !deProcura.some(function (valores) {
        return normalizarParaComparar_(valores[i]).indexOf(termo) >= 0;
      }))) continue;
    candidatas.push({ linha: i + 2, casos: volumes.porSusep[chave] || 0 });
  }
  // As que mais trazem caso primeiro; empatadas, as mais recentes (mais embaixo).
  candidatas.sort(function (uma, outra) {
    return outra.casos - uma.casos || outra.linha - uma.linha;
  });
  var escolhidas = candidatas.slice(0, RECC_MAXIMO_DE_BLOQUEADAS_NA_TELA);

  var bloqueadas = lerLinhasEspecificas_('SUSEP_BLOQUEADAS',
    escolhidas.map(function (uma) { return uma.linha; }))
    .map(function (linha) {
      var susep = susepComoSeEscreve_(linha.SUSEP);
      return {
        id: linha.__id,
        susep: susep,
        corretora: String(linha.NomeCorretora || ''),
        sucursal: String(linha.Sucursal || ''),
        coordenadorComercial: String(linha.CoordenadorComercial || ''),
        bloqueadaPor: quemBloqueou_(linha.BloqueadaPor),
        bloqueadaEm: linha.BloqueadaEm
          ? formatarData_(new Date(linha.BloqueadaEm), 'dd/MM/yyyy')
          : '',
        casos: volumes.porSusep[chaveDaSusep_(susep)] || 0
      };
    });

  return {
    bloqueadas: bloqueadas,
    quantasNoTotal: quantasNoTotal,
    quantasAchadas: candidatas.length,
    truncada: candidatas.length > bloqueadas.length,
    procurar: String(procurar || ''),
    podeMexer: podeFazer_(quem.permissoes, RECC_ACOES.CONFIGURAR)
  };
}

/**
 * As linhas da SUSEP_BLOQUEADAS em que o termo aparece — na SUSEP, na
 * corretora, na sucursal ou no coordenador —, pelo localizador: { linha: true }.
 * null quando a busca rápida não está disponível.
 */
function linhasDoTermoNasBloqueadas_(estrutura, termo) {
  var linhas = {};
  var colunas = ['SUSEP', 'NomeCorretora', 'Sucursal', 'CoordenadorComercial'];
  for (var c = 0; c < colunas.length; c++) {
    var posicao = posicaoDaColuna_(estrutura, colunas[c]);
    if (posicao < 0) continue;
    var achadas = linhasDaBuscaRapida_(estrutura, posicao, termo, false, false);
    if (achadas === null) return null;
    achadas.forEach(function (linha) { linhas[linha] = true; });
  }
  return linhas;
}

/**
 * Bloqueia uma SUSEP.
 *
 * Bloquear não apaga caso nenhum e não impede cadastrar: o formulário passa a
 * mostrar o selo vermelho com o motivo, e quem está atendendo decide. Bloqueio
 * que impedisse o cadastro faria a pessoa registrar o caso em outro lugar —
 * num caderno, num e-mail — e o sistema perderia o caso de vista.
 */
function bloquearSusep(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');
  dados = dadosDaTela_(dados);

  var susep = susepComoSeEscreve_(dados.susep);
  if (!susep) throw new Error('Informe a SUSEP a bloquear.');

  /*
   * O MOTIVO SAIU DAS PERGUNTAS, a pedido do PO: "SUSEP's bloqueadas deve
   * pedir: SUSEP, Corretora, Sucursal e coordenador comercial".
   *
   * Ele era obrigatório, e o argumento era bom — quem vê o selo vermelho seis
   * meses depois precisa saber o que fazer com a informação. Quem responde por
   * isso agora é o COORDENADOR COMERCIAL: tem nome, e dá para perguntar.
   */
  var id = converterParaIdentificador_(dados.id);
  // Só a coluna da SUSEP, e as linhas em que ela bateu (Etapa 55): ler as 151
  // mil linhas inteiras para conferir uma SUSEP estourava o tempo.
  var jaBloqueada = buscarRegistros_('SUSEP_BLOQUEADAS', 'SUSEP', susep).filter(function (linha) {
    if (normalizarParaComparar_(linha._Visivel) === 'nao') return false;
    return chaveDaSusep_(linha.SUSEP) === chaveDaSusep_(susep)
      && converterParaIdentificador_(linha.Id) !== id;
  })[0];
  if (jaBloqueada) {
    throw new Error('A SUSEP ' + susep + ' já está bloqueada.');
  }

  var campos = {
    SUSEP: susep,
    NomeCorretora: String(dados.corretora || '').trim(),
    Sucursal: String(dados.sucursal || '').trim(),
    CoordenadorComercial: String(dados.coordenadorComercial || '').trim()
  };

  /*
   * QUEM BLOQUEOU é obrigatório em todo bloqueio NOVO. Na edição, só muda se
   * vier: quem chama sem o campo não está mexendo nele, e apagar o tipo em
   * silêncio seria perder a resposta que alguém já deu.
   */
  var vieramOTipo = dados.bloqueadaPor !== undefined;
  var tipo = quemBloqueou_(dados.bloqueadaPor);
  if ((!id || vieramOTipo) && !tipo) {
    throw new Error('Informe quem bloqueou a SUSEP: a companhia ou a corretora.');
  }
  if (tipo) {
    if (!abaTemBloqueadaPor_()) {
      throw new Error(comoCriarAColuna_('SUSEP_BLOQUEADAS', 'BloqueadaPor'));
    }
    campos.BloqueadaPor = tipo;
  }

  if (id) {
    atualizarRegistro_('SUSEP_BLOQUEADAS', id, campos);
    registrarAuditoria_('susep.editar', 'SUSEP_BLOQUEADAS', id, susep);
    return id;
  }
  campos.BloqueadaEm = new Date();
  var criada = inserirRegistro_('SUSEP_BLOQUEADAS', campos);
  registrarAuditoria_('susep.bloquear', 'SUSEP_BLOQUEADAS', criada.__id, susep);
  return criada.__id;
}

/** Libera uma SUSEP. A linha permanece na planilha, com a data do bloqueio. */
function desbloquearSusep(idDoBloqueio) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var alvo = converterParaIdentificador_(idDoBloqueio);
  var atual = buscarRegistros_('SUSEP_BLOQUEADAS', 'Id', alvo, 1)[0];
  if (!atual) throw new Error('Este bloqueio não existe.');

  ocultarRegistro_('SUSEP_BLOQUEADAS', alvo, quem.usuario.Id);
  registrarAuditoria_('susep.desbloquear', 'SUSEP_BLOQUEADAS', alvo,
    susepComoSeEscreve_(atual.SUSEP));
  return true;
}

// ============================================================================
// DE ONDE VEM CADA CADASTRO
// ============================================================================

/**
 * De onde vem cada cadastro desta tela, numa chamada só.
 *
 * A tela tem duas abas de cadastro — corretoras e SUSEPs bloqueadas — e cada
 * uma carrega por conta própria. Perguntar a origem em cada carga seriam duas
 * idas ao servidor para uma resposta que não muda enquanto a tela está aberta.
 *
 * Havia aqui uma terceira aba, PRODUTOS, e as funções dela. Saiu a pedido do
 * PO: "produtos pode eliminar". A aba da planilha é apagada pela migração,
 * `atualizarPGO()`, porque ele pediu a aba também.
 */
function origemDosCadastros() {
  exigirTela_('tabelaCorretoras');

  var resposta = {};
  ['CORRETORAS', 'SUSEP_BLOQUEADAS'].forEach(function (aba) {
    resposta[aba] = deOndeVemAAba_(aba);
  });
  return resposta;
}

// ============================================================================
// EXPORTAR
// ============================================================================

/** As corretoras em texto, do jeito que o Excel em português abre. */
function exportarCorretoras(procurar, segmento) {
  exigirPermissao_(RECC_ACOES.EXPORTAR);
  var tabela = tabelaDeCorretoras(procurar, segmento);

  var linhas = [['SUSEP', 'Corretora', 'Sucursal', 'Segmento', 'Consultor',
    'Casos'].join(';')];

  tabela.corretoras.forEach(function (uma) {
    linhas.push([uma.susep, uma.corretora, uma.sucursal, uma.segmento,
      uma.consultor, uma.casos].join(';'));
  });

  registrarAuditoria_('corretoras.exportar', 'CORRETORAS', '',
    tabela.corretoras.length + ' linhas');
  return { nome: 'corretoras.csv', conteudo: linhas.join('\n') };
}

/* ############################################################################
   #
   #  SEÇÃO 2 de 2 · COLAR, CONFERIR E APLICAR EM LOTE
   #
   ############################################################################ */

/**
 * Trazer listas prontas para dentro do sistema
 * ============================================================================
 * O cadastro de corretoras e a lista de SUSEPs bloqueadas já EXISTEM na
 * operação, em planilha, antes de o PGO nascer. Digitar centenas de linhas
 * uma a uma dentro do sistema não é trabalho: é desperdício, e é o caminho
 * mais curto para o cadastro nascer pela metade.
 *
 * Esta tela resolve isso com três passos, sempre nesta ordem:
 *
 *   1. APONTAR  de dois jeitos, à escolha de quem importa:
 *               COLANDO — copia da planilha dela e cola aqui. Aceita o que o
 *               Excel e o Google Planilhas colocam na área de transferência —
 *               colunas separadas por TAB — e também ponto e vírgula.
 *               PELO Id  — informa o Id de outra planilha e o nome da aba, e o
 *               sistema lê de lá. É o caminho para as listas grandes: colar
 *               sete mil SUSEPs numa caixa de texto é o que ninguém faz duas
 *               vezes. Daqui para baixo as duas fontes são a mesma coisa.
 *   2. CONFERIR o servidor lê o texto e devolve o que VAI acontecer com cada
 *               linha, sem gravar nada: nova, atualiza a que existe, ou
 *               recusada — e neste último caso, por quê.
 *   3. APLICAR  só então grava.
 *
 * Duas decisões que valem a pena estar escritas:
 *
 * O SEGUNDO PASSO NÃO É ENFEITE. Importação é a ação com maior alcance do
 * sistema: um erro escreve em quinhentas linhas de uma vez. Ver antes é o que
 * transforma "colei a coluna errada" num susto em vez de num estrago.
 *
 * O TERCEIRO PASSO NÃO CONFIA NO SEGUNDO. `aplicarImportacao` lê a FONTE
 * de novo e refaz a conferência inteira — não recebe do navegador a lista já
 * conferida. Se recebesse, bastaria alterar a lista no caminho para gravar o
 * que o servidor nunca aprovou.
 *
 * Nada aqui APAGA. Uma SUSEP que está no cadastro e não está no arquivo colado
 * fica onde está: o arquivo é uma correção, não a verdade inteira. Quem quiser
 * tirar uma corretora tira uma a uma, na tabela, e mesmo assim a linha
 * permanece na planilha.
 * ============================================================================
 */

/** Quantas linhas o passo de conferência mostra na tela. */
var RECC_LINHAS_NA_CONFERENCIA = 200;

/** Teto de linhas por importação, para não estourar o tempo do Apps Script. */
var RECC_MAXIMO_DA_IMPORTACAO = 2000;

/**
 * O que dá para importar.
 *
 * Cada tipo diz em que aba grava, qual coluna é a CHAVE (a que decide se a
 * linha é nova ou é atualização) e quais colunas ele entende. A tela desenha o
 * cabeçalho de exemplo a partir daqui — assim o que a tela promete e o que o
 * servidor aceita não podem divergir.
 */
var RECC_IMPORTACOES = {
  corretoras: {
    titulo: 'Corretoras Diamante',
    aba: 'CORRETORAS',
    chave: 'susep',
    explicacao: 'Uma linha por corretora. A SUSEP é o que liga a corretora ao '
      + 'caso, e é por ela que o sistema sabe se a linha é nova ou já existe. '
      + 'Ela tem letra e número — por exemplo RET00J.',
    colunas: [
      // A SUSEP é TEXTO: "RET00J". Com `identificador`, a importação guardaria
      // "00" e o cadastro inteiro entraria errado de uma vez — o jeito mais
      // rápido que existe de estragar sete mil linhas.
      { chave: 'susep', titulo: 'SUSEP', coluna: 'SUSEP',
        tipo: 'texto', obrigatoria: true },
      { chave: 'corretora', titulo: 'Corretora', coluna: 'Corretora',
        tipo: 'texto', obrigatoria: true },
      { chave: 'sucursal', titulo: 'Sucursal', coluna: 'Sucursal',
        tipo: 'texto' },
      { chave: 'segmento', titulo: 'Segmento', coluna: 'Segmento',
        tipo: 'texto', padrao: 'Não encontrado' },
      { chave: 'consultor', titulo: 'Consultor', coluna: 'Consultor',
        tipo: 'texto' }
    ]
  },

  susepsBloqueadas: {
    titulo: 'SUSEPs bloqueadas',
    aba: 'SUSEP_BLOQUEADAS',
    chave: 'susep',
    explicacao: 'Uma linha por SUSEP bloqueada. É outra lista, de outro dono: '
      + 'uma SUSEP que esteja no cadastro de corretoras Diamante continua '
      + 'saindo liberada no selo do formulário.',
    colunas: [
      { chave: 'susep', titulo: 'SUSEP', coluna: 'SUSEP',
        tipo: 'texto', obrigatoria: true },
      { chave: 'corretora', titulo: 'Corretora', coluna: 'NomeCorretora',
        tipo: 'texto' },
      { chave: 'sucursal', titulo: 'Sucursal', coluna: 'Sucursal',
        tipo: 'texto' },
      { chave: 'coordenadorComercial', titulo: 'Coordenador comercial',
        coluna: 'CoordenadorComercial', tipo: 'texto' },
      // "Companhia" ou "Corretora". Fora disso a linha é recusada — o tipo
      // escrito de três jeitos viraria três tipos no filtro da planilha.
      { chave: 'bloqueadaPor', titulo: 'Bloqueada por', coluna: 'BloqueadaPor',
        tipo: 'quemBloqueou' }
    ]
  }
};

// ============================================================================
// O QUE A TELA PRECISA SABER
// ============================================================================

/**
 * Os tipos de importação e as colunas de cada um.
 *
 * A tela não guarda essa lista: pede aqui. Acrescentar um tipo novo é mexer
 * em RECC_IMPORTACOES e em mais lugar nenhum.
 */
function opcoesDaImportacao() {
  exigirTela_('tabelaCorretoras');

  return Object.keys(RECC_IMPORTACOES).map(function (tipo) {
    var receita = RECC_IMPORTACOES[tipo];
    return {
      tipo: tipo,
      titulo: receita.titulo,
      explicacao: receita.explicacao,
      maximo: RECC_MAXIMO_DA_IMPORTACAO,
      colunas: receita.colunas.map(function (coluna) {
        return {
          chave: coluna.chave,
          titulo: coluna.titulo,
          obrigatoria: !!coluna.obrigatoria
        };
      })
    };
  });
}

// ============================================================================
// LER A FONTE — O TEXTO COLADO OU A ABA DE OUTRA PLANILHA
// ============================================================================

/**
 * Descobre o separador das colunas.
 *
 * O Excel e o Google Planilhas colocam TAB na área de transferência. Quem
 * salvou um CSV em português tem ponto e vírgula. Vírgula fica por último de
 * propósito: nome de corretora tem vírgula ("SILVA, SOUZA & CIA"), e chutar
 * vírgula quebraria justamente as linhas mais compridas.
 */
function separadorDoTexto_(primeiraLinha) {
  if (primeiraLinha.indexOf('\t') >= 0) return '\t';
  if (primeiraLinha.indexOf(';') >= 0) return ';';
  return ',';
}

/**
 * Reconhece a linha de cabeçalho.
 *
 * Quem copia da planilha quase sempre traz o cabeçalho junto. Sem reconhecer,
 * ele viraria uma corretora chamada "Corretora" com SUSEP "SUSEP" — recusada
 * por não ter dígito, mas aparecendo como erro numa importação que estava
 * certa.
 */
function ehCabecalho_(pedacos, receita) {
  var conhecidos = 0;
  for (var i = 0; i < pedacos.length; i++) {
    var texto = normalizarParaComparar_(pedacos[i]);
    for (var j = 0; j < receita.colunas.length; j++) {
      if (normalizarParaComparar_(receita.colunas[j].titulo) === texto) {
        conhecidos++;
        break;
      }
    }
  }
  return conhecidos >= 2;
}

/**
 * A ordem das colunas do texto colado.
 *
 * Com cabeçalho, a ordem é a que o cabeçalho disser — a pessoa pode ter
 * colado as colunas em qualquer ordem, e um título que o sistema não conhece
 * vira uma posição vazia, ignorada.
 *
 * Sem cabeçalho, a ordem é a declarada em RECC_IMPORTACOES. É a razão de a
 * primeira coluna de cada tipo ser sempre a chave e a segunda ser sempre a
 * obrigatória: quem cola sem cabeçalho cola o essencial.
 */
function ordemDasColunas_(pedacos, receita) {
  if (!ehCabecalho_(pedacos, receita)) {
    return receita.colunas.map(function (coluna) { return coluna.chave; });
  }
  return pedacos.map(function (pedaco) {
    var texto = normalizarParaComparar_(pedaco);
    var achada = receita.colunas.filter(function (coluna) {
      return normalizarParaComparar_(coluna.titulo) === texto;
    })[0];
    return achada ? achada.chave : '';
  });
}

/**
 * A grade de uma importação de cadastro: uma lista de { numero, celulas }.
 *
 * Existe porque a MESMA conferência passou a servir duas fontes: o texto que a
 * pessoa cola e uma aba de OUTRA planilha, lida pelo Id. Antes disto, o leitor
 * só sabia partir texto — e a única forma de aproveitar a conferência inteira
 * com uma planilha de fora seria remontar as células num texto com separador,
 * que estraga a primeira corretora chamada "SILVA, SOUZA & CIA".
 *
 * `numero` é a linha de verdade — a da planilha de fora, ou a do texto colado
 * contando as vazias. A pessoa procura "a linha 14" onde o dado dela está, e
 * não na décima quarta linha que sobrou depois de o sistema pular as brancas.
 */
function gradeDoTextoDaImportacao_(texto) {
  var linhas = String(texto || '').split(/\r\n|\r|\n/);

  var cheias = linhas.filter(function (linha) { return linha.trim().length > 0; });
  if (!cheias.length) return [];
  var separador = separadorDoTexto_(cheias[0]);

  var grade = [];
  for (var i = 0; i < linhas.length; i++) {
    // A linha NÃO é aparada antes de ser partida. Parecia inofensivo, e não é:
    // com TAB como separador, aparar come a primeira coluna quando ela vem
    // vazia — e aí "«vazio» TAB Corretora Alfa" vira uma corretora chamada
    // "Corretora Alfa" com SUSEP "Corretora Alfa", deslocando a linha inteira.
    // Quem apara é cada CÉLULA, depois de partida.
    if (!linhas[i].trim().length) continue;
    grade.push({
      numero: i + 1,
      celulas: linhas[i].split(separador).map(function (celula) {
        return String(celula).replace(/^"|"$/g, '').trim();
      })
    });
  }
  return grade;
}

/**
 * A grade de uma ABA DE OUTRA PLANILHA, pelo Id.
 *
 * Reaproveita `gradeDeOutraPlanilha_`, que é a mesma porta que a importação de
 * casos usa: uma ida só ao serviço, e `getDisplayValues` para a SUSEP chegar
 * como a pessoa a VÊ lá — "RET00J" inteiro, e não o que o número viraria.
 *
 * Linha toda vazia é pulada, mas sem mexer na contagem: buraco no meio da
 * planilha de origem é comum e não é erro de ninguém.
 */
function gradeDaPlanilhaDaImportacao_(planilhaId, nomeDaAba) {
  var lida = gradeDeOutraPlanilha_(planilhaId, nomeDaAba);
  var grade = [];
  for (var i = 0; i < lida.length; i++) {
    var celulas = (lida[i] || []).map(function (celula) {
      return String(celula === null || celula === undefined ? '' : celula).trim();
    });
    if (!celulas.join('').length) continue;
    grade.push({ numero: i + 1, celulas: celulas });
  }
  return grade;
}

/**
 * A grade, venha ela do texto colado ou de outra planilha.
 *
 * Aceita a STRING crua de propósito: `conferirImportacao` e `aplicarImportacao`
 * nasceram recebendo o texto, e há chamada em tela e em teste que manda só
 * isso. Quebrar essas chamadas para ganhar um campo `tipo` seria trocar
 * trabalho de verdade por formalidade.
 */
function gradeDaFonteDoCadastro_(fonte) {
  if (typeof fonte === 'string' || fonte === null || fonte === undefined) {
    return gradeDoTextoDaImportacao_(fonte);
  }
  if (normalizarParaComparar_(fonte.tipo) === 'planilha') {
    return gradeDaPlanilhaDaImportacao_(fonte.planilhaId, fonte.aba);
  }
  return gradeDoTextoDaImportacao_(fonte.texto);
}

/**
 * Transforma a grade numa lista de linhas com os campos nomeados.
 *
 * Não decide nada sobre gravar: só lê. Quem decide é `conferirImportacao_`.
 */
function lerGradeDaImportacao_(grade, receita) {
  if (!grade.length) return { ordem: [], linhas: [], tinhaCabecalho: false };

  var primeira = grade[0].celulas;
  var ordem = ordemDasColunas_(primeira, receita);
  var tinhaCabecalho = ehCabecalho_(primeira, receita);
  var comeco = tinhaCabecalho ? 1 : 0;

  var lidas = [];
  for (var i = comeco; i < grade.length; i++) {
    var celulas = grade[i].celulas;
    var valores = {};
    for (var c = 0; c < ordem.length; c++) {
      if (!ordem[c]) continue;
      valores[ordem[c]] = String(celulas[c] === undefined ? '' : celulas[c]).trim();
    }
    lidas.push({ numero: grade[i].numero, valores: valores });
  }
  return { ordem: ordem, linhas: lidas, tinhaCabecalho: tinhaCabecalho };
}

// ============================================================================
// CONFERIR
// ============================================================================

/**
 * O que vai acontecer com cada linha — sem gravar nada.
 *
 * É a mesma função que `aplicarImportacao` usa antes de escrever, e é de
 * propósito: conferência e gravação que seguem regras diferentes acabam
 * discordando, e a tela passa a mentir sobre o que o botão faz.
 *
 * `fonte` é o texto colado (uma string, ou { tipo: 'colado', texto }) ou uma
 * aba de outra planilha ({ tipo: 'planilha', planilhaId, aba }). Daqui para
 * baixo não há diferença entre as duas: o que chega é sempre uma grade.
 */
function conferirImportacao_(tipo, fonte) {
  var receita = RECC_IMPORTACOES[tipo];
  if (!receita) {
    throw new Error('Não sei importar "' + tipo + '". Existem: '
      + Object.keys(RECC_IMPORTACOES).join(', ') + '.');
  }

  var lido = lerGradeDaImportacao_(gradeDaFonteDoCadastro_(fonte), receita);
  if (lido.linhas.length > RECC_MAXIMO_DA_IMPORTACAO) {
    throw new Error('São ' + lido.linhas.length + ' linhas, e o limite por vez '
      + 'é ' + RECC_MAXIMO_DA_IMPORTACAO + '. Divida em partes: o Apps Script '
      + 'tem tempo máximo de execução, e uma importação interrompida no meio '
      + 'grava metade.');
  }

  // Ler o cadastro UMA vez, e não uma por linha. Com quinhentas linhas
  // coladas, uma leitura por linha seriam quinhentas leituras da planilha.
  var colunaChave = colunaChaveDaImportacao_(receita);
  var existentes = {};
  lerRegistros_(receita.aba).forEach(function (linha) {
    var chave = chaveDaLinhaDaImportacao_(linha[colunaChave.coluna], colunaChave);
    if (chave) existentes[chave] = linha;
  });

  var vistas = {};
  var resultado = lido.linhas.map(function (linha) {
    return conferirUmaLinha_(linha, receita, existentes, vistas);
  });

  return {
    tipo: tipo,
    titulo: receita.titulo,
    colunas: receita.colunas.map(function (coluna) {
      return { chave: coluna.chave, titulo: coluna.titulo };
    }),
    // Com cabeçalho reconhecido, dizer isso na tela evita a dúvida mais comum
    // de todas: "ele contou o meu cabeçalho como corretora?".
    tinhaCabecalho: lido.tinhaCabecalho,
    linhas: resultado.slice(0, RECC_LINHAS_NA_CONFERENCIA),
    naoMostradas: Math.max(0, resultado.length - RECC_LINHAS_NA_CONFERENCIA),
    resumo: {
      total: resultado.length,
      novas: contarSituacao_(resultado, 'nova'),
      atualizadas: contarSituacao_(resultado, 'atualiza'),
      iguais: contarSituacao_(resultado, 'igual'),
      recusadas: contarSituacao_(resultado, 'recusada')
    },
    // A lista completa fica aqui para `aplicarImportacao` usar. A tela recebe
    // só as primeiras — e nem precisaria delas, já que quem grava é o servidor.
    todas: resultado
  };
}

/**
 * A chave de uma linha, para decidir se ela é nova ou atualização.
 *
 * Normaliza do mesmo jeito que o resto do sistema compara: identificador por
 * dígito, texto por `normalizarParaComparar_`. Importa porque a SUSEP é texto
 * desde que o PO corrigiu o formato — sem isto, "ret00j" colado sobre um
 * cadastro que tem "RET00J" entraria como linha NOVA, e o cadastro ficaria com
 * a mesma corretora duas vezes.
 */
function chaveDaLinhaDaImportacao_(valor, colunaChave) {
  return colunaChave.tipo === 'identificador'
    ? converterParaIdentificador_(valor)
    : normalizarParaComparar_(valor);
}

/** A coluna que decide se a linha é nova ou é atualização. */
function colunaChaveDaImportacao_(receita) {
  return receita.colunas.filter(function (coluna) {
    return coluna.chave === receita.chave;
  })[0];
}

function contarSituacao_(linhas, situacao) {
  return linhas.filter(function (linha) {
    return linha.situacao === situacao;
  }).length;
}

/**
 * O veredito de uma linha só.
 *
 * `vistas` guarda as chaves que já apareceram NESTE texto: duas linhas com a
 * mesma SUSEP no mesmo arquivo colado são um erro de quem montou o arquivo, e
 * gravar as duas deixaria o cadastro com a duplicidade que a tela de cadastro
 * recusa uma a uma.
 */
function conferirUmaLinha_(linha, receita, existentes, vistas) {
  var campos = {};
  var problemas = [];

  receita.colunas.forEach(function (coluna) {
    var bruto = linha.valores[coluna.chave];
    var valor = coluna.tipo === 'identificador'
      ? converterParaIdentificador_(bruto)
      : String(bruto === undefined ? '' : bruto).trim();

    if (coluna.tipo === 'quemBloqueou' && valor) {
      if (!quemBloqueou_(valor)) {
        problemas.push(coluna.titulo + ' "' + valor
          + '" — use Companhia ou Corretora');
      }
      valor = quemBloqueou_(valor);
    }

    if (!valor && coluna.padrao) valor = coluna.padrao;
    if (!valor && coluna.obrigatoria) {
      problemas.push(coluna.tipo === 'identificador' && String(bruto || '').trim()
        ? coluna.titulo + ' sem nenhum dígito ("' + bruto + '")'
        : coluna.titulo + ' em branco');
    }
    campos[coluna.chave] = valor;
  });

  var chave = chaveDaLinhaDaImportacao_(campos[receita.chave],
    colunaChaveDaImportacao_(receita));

  if (problemas.length) {
    return { numero: linha.numero, campos: campos, situacao: 'recusada',
      porque: problemas.join('; ') };
  }
  if (vistas[chave]) {
    return { numero: linha.numero, campos: campos, situacao: 'recusada',
      porque: 'repetida — a linha ' + vistas[chave] + ' já trouxe esta '
        + colunaChaveDaImportacao_(receita).titulo };
  }
  vistas[chave] = linha.numero;

  var atual = existentes[chave];
  if (!atual) {
    return { numero: linha.numero, campos: campos, situacao: 'nova', porque: '' };
  }

  var mudancas = mudancasDaLinha_(campos, atual, receita);
  if (!mudancas.length) {
    return { numero: linha.numero, campos: campos, situacao: 'igual',
      porque: 'já está assim no cadastro', id: atual.__id };
  }
  return { numero: linha.numero, campos: campos, situacao: 'atualiza',
    porque: mudancas.join('; '), id: atual.__id };
}

/**
 * O que muda de fato entre a linha colada e a que já está no cadastro.
 *
 * Campo vazio no arquivo NÃO apaga o que existe. Quem cola só SUSEP e
 * Segmento para reclassificar um lote não quer perder o canal cadastrado —
 * e descobrir isso depois de gravar não tem desfazer.
 */
function mudancasDaLinha_(campos, atual, receita) {
  var mudancas = [];
  receita.colunas.forEach(function (coluna) {
    var novo = campos[coluna.chave];
    if (!novo) return;
    var velho = coluna.tipo === 'identificador'
      ? converterParaIdentificador_(atual[coluna.coluna])
      : String(atual[coluna.coluna] === undefined ? '' : atual[coluna.coluna]).trim();
    if (novo === velho) return;
    mudancas.push(coluna.titulo + ': "' + velho + '" → "' + novo + '"');
  });
  return mudancas;
}

// ============================================================================
// AS DUAS FUNÇÕES QUE A TELA CHAMA
// ============================================================================

/** Passo 2: o que vai acontecer. Não grava nada. */
function conferirImportacao(tipo, fonte) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var conferido = conferirImportacao_(tipo, fonte);
  delete conferido.todas;   // a tela não precisa da lista inteira
  return conferido;
}

/**
 * Passo 3: grava.
 *
 * Pede a senha de administrador. Não é excesso de zelo: é a única ação do
 * sistema que escreve em centenas de linhas com um clique, e o critério para
 * pedir senha sempre foi o alcance, nunca a dificuldade.
 */
function aplicarImportacao(tipo, fonte) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');
  exigirSenhaDeAdministrador_();

  var receita = RECC_IMPORTACOES[tipo];
  var conferido = conferirImportacao_(tipo, fonte);

  /*
   * COLUNA QUE A ABA AINDA NÃO TEM — a `BloqueadaPor`, numa planilha que não
   * rodou `atualizarPGO()`. Em branco no arquivo, é só não escrever nela. Com
   * valor, para ANTES de gravar a primeira linha: parar no meio deixaria
   * metade do arquivo gravada e a outra metade não.
   */
  var faltando = colunasDaImportacaoQueFaltam_(receita);
  var perderia = faltando.filter(function (coluna) {
    return conferido.todas.some(function (linha) {
      return linha.situacao !== 'recusada' && linha.campos[coluna.chave];
    });
  })[0];
  if (perderia) throw new Error(comoCriarAColuna_(receita.aba, perderia.coluna));

  var paraCriar = [];
  var criadas = 0;
  var atualizadas = 0;

  conferido.todas.forEach(function (linha) {
    if (linha.situacao === 'nova') {
      paraCriar.push(camposParaAAba_(linha.campos, receita, true, faltando));
    } else if (linha.situacao === 'atualiza') {
      atualizarRegistro_(receita.aba, linha.id,
        camposParaAAba_(linha.campos, receita, false, faltando));
      atualizadas++;
    }
  });

  if (paraCriar.length) {
    criadas = inserirVariosRegistros_(receita.aba, paraCriar).length;
  }

  registrarAuditoria_('importacao.aplicar', receita.aba, '',
    receita.titulo + ': ' + criadas + ' criadas, ' + atualizadas + ' atualizadas, '
    + conferido.resumo.recusadas + ' recusadas');

  return {
    titulo: receita.titulo,
    criadas: criadas,
    atualizadas: atualizadas,
    iguais: conferido.resumo.iguais,
    recusadas: conferido.resumo.recusadas,
    por: quem.usuario.Nome
  };
}

/** As colunas da importação que a aba de destino não tem. */
function colunasDaImportacaoQueFaltam_(receita) {
  var estrutura = estruturaDaAba_(receita.aba);
  return receita.colunas.filter(function (coluna) {
    return posicaoDaColuna_(estrutura, coluna.coluna) < 0;
  });
}

/**
 * Traduz os campos da importação para os nomes de coluna da aba.
 *
 * Numa atualização, campo vazio é OMITIDO — não vai como texto vazio. É o que
 * faz a regra do "vazio não apaga" valer também na hora de escrever, e não só
 * na hora de conferir.
 */
function camposParaAAba_(campos, receita, ehNova, faltando) {
  var linha = {};
  receita.colunas.forEach(function (coluna) {
    if ((faltando || []).indexOf(coluna) >= 0) return;
    var valor = campos[coluna.chave];
    if (!valor && !ehNova) return;
    linha[coluna.coluna] = valor || '';
  });

  // A coluna que a importação não pergunta, mas a aba espera: a data do
  // bloqueio é do SISTEMA, e não de quem cola a planilha.
  //
  // Havia aqui também um `Nome` para a CORRETORAS, copiado do nome da
  // corretora. A coluna saiu do contrato nesta rodada, a pedido do PO: ela
  // duplicava `Corretora` e ninguém sabia qual era qual.
  if (ehNova && receita.aba === 'SUSEP_BLOQUEADAS') {
    linha.BloqueadaEm = new Date();
  }
  return linha;
}

/* ############################################################################
   A AGENDA DA MESA: AS REUNIÕES COM CORRETORES (Etapa 79)
   ############################################################################
   Pedido do PO: "a Mesa faz reuniões com corretores. Não é recorrente, mas
   documentamos isso. Eu queria que a Mesa registrasse isso e fosse para a
   segunda base, onde ficam as SUSEPs" — "um formulário diferente em Cadastrar
   Caso, e na aba Trabalho tem que ter uma sub aba de reunião ao clicar em Mesa
   Diamante".

   A aba se chama Agenda, JÁ EXISTE na planilha de cadastros e JÁ TEM DADOS. Por
   isso o sistema não a cria, não lhe dá Id nem colunas de controle e não mexe
   no que encontra: lê os cabeçalhos que ela tem, acha os dezesseis pelo nome
   (sem acento, caixa nem espaço) e escreve só neles. Uma reunião é uma linha;
   quem a identifica é o número da linha, e a edição confere antes de gravar se
   a linha ainda é a mesma — alguém pode ter ordenado a planilha.

   É registro, e não caso: não tem prazo, cartão nem Produtividade.
   ############################################################################ */

/** Como a aba se chama na planilha de cadastros. Ajustável na CONFIG. */
const RECC_ABA_DA_AGENDA = 'Agenda';
const RECC_CHAVE_DA_ABA_DA_AGENDA = 'AGENDA.ABA';
/** Quantas reuniões a lista mostra de uma vez — as mais recentes. */
const RECC_REUNIOES_NA_LISTA = 200;

/** Os status de uma reunião, como o PO listou. */
const RECC_STATUS_DA_REUNIAO = ['Pendente', 'Em andamento', 'Concluído', 'Acompanhar por 3 meses'];

/**
 * Os dezesseis campos, na ordem do PO. `cabecalho` é como ele escreveu; o que
 * vale para achar a coluna é o nome sem acento, caixa, espaço nem pontuação.
 * Os três reports guardam A DATA em que o acompanhamento foi feito.
 */
const RECC_CAMPOS_DA_AGENDA = [
  { chave: 'data', cabecalho: 'Data', rotulo: 'Data da reunião', tipo: 'data', obrigatorio: true },
  { chave: 'gerente', cabecalho: 'gerente', rotulo: 'Gerente', tipo: 'texto' },
  { chave: 'consultor', cabecalho: 'consultor', rotulo: 'Consultor', tipo: 'texto' },
  { chave: 'corretora', cabecalho: 'corretora', rotulo: 'Corretora', tipo: 'texto', obrigatorio: true },
  { chave: 'analista', cabecalho: 'analista', rotulo: 'Analista', tipo: 'analista' },
  { chave: 'area', cabecalho: 'área', rotulo: 'Área', tipo: 'texto' },
  { chave: 'segurado', cabecalho: 'segurado/estipulante', rotulo: 'Segurado / estipulante', tipo: 'texto' },
  { chave: 'participantes', cabecalho: 'participantes', rotulo: 'Participantes', tipo: 'texto' },
  { chave: 'assunto', cabecalho: 'assunto', rotulo: 'Assunto', tipo: 'texto', obrigatorio: true },
  { chave: 'obs', cabecalho: 'obs', rotulo: 'Observações', tipo: 'textoLongo' },
  { chave: 'acoes', cabecalho: 'ações', rotulo: 'Ações', tipo: 'textoLongo' },
  { chave: 'chamado', cabecalho: 'chamado', rotulo: 'Chamado', tipo: 'texto' },
  { chave: 'status', cabecalho: 'status', rotulo: 'Status', tipo: 'status' },
  { chave: 'report1', cabecalho: '1 report (15 dias)', rotulo: '1º report (15 dias) — feito em', tipo: 'data' },
  { chave: 'report2', cabecalho: '2 report (30 dias)', rotulo: '2º report (30 dias) — feito em', tipo: 'data' },
  { chave: 'report3', cabecalho: '3 report (45 dias)', rotulo: '3º report (45 dias) — feito em', tipo: 'data' }
];

/**
 * A aba Agenda aberta, com a posição de cada um dos dezesseis campos.
 * Derruba com o motivo quando falta a planilha, a aba ou alguma coluna — uma
 * lista vazia diria "nenhuma reunião registrada", que seria mentira.
 */
function abaDaAgenda_() {
  if (!idDaPlanilhaDeCadastros_()) {
    throw new Error('A Agenda mora na planilha de cadastros (a segunda base), e nenhuma está '
      + 'ligada. Ligue-a em Configurações › Estrutura.');
  }
  var nome = String(valorDaConfiguracao_(RECC_CHAVE_DA_ABA_DA_AGENDA, '') || RECC_ABA_DA_AGENDA).trim();
  var aba = planilhaDeCadastros_().getSheetByName(nome);
  if (!aba) {
    throw new Error('A planilha de cadastros não tem uma aba chamada "' + nome + '". Confira o nome '
      + 'da aba lá — ou escreva o nome certo na CONFIG, em ' + RECC_CHAVE_DA_ABA_DA_AGENDA + '.');
  }

  var largura = aba.getLastColumn();
  var cabecalhos = largura > 0 ? aba.getRange(1, 1, 1, largura).getValues()[0] : [];
  var ondeEsta = {};
  cabecalhos.forEach(function (cabecalho, i) {
    var chave = normalizarParaComparar_(cabecalho);
    if (chave && ondeEsta[chave] === undefined) ondeEsta[chave] = i;
  });

  var posicoes = {};
  var faltam = [];
  RECC_CAMPOS_DA_AGENDA.forEach(function (campo) {
    var i = ondeEsta[normalizarParaComparar_(campo.cabecalho)];
    if (i === undefined) faltam.push(campo.cabecalho); else posicoes[campo.chave] = i;
  });
  if (faltam.length) {
    throw new Error('A aba "' + nome + '" não tem ' + (faltam.length === 1 ? 'a coluna' : 'as colunas')
      + ': ' + faltam.join(', ') + '. Os cabeçalhos ficam na primeira linha; maiúscula, acento e '
      + 'espaço não fazem diferença.');
  }
  return { aba: aba, nome: nome, largura: largura, posicoes: posicoes };
}

/** Só quem enxerga a Mesa Diamante chega à Agenda — a mesma porta do canal. */
function canalDaAgenda_(idDoCanal, quem) {
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  if (canal.aba !== 'BASE_MESA') throw new Error('A Agenda de reuniões é da Mesa Diamante.');
  return canal;
}

/** O valor da célula como a tela mostra: data em dd/mm/aaaa, o resto em texto. */
function celulaDaAgendaParaATela_(valor, campo) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (campo.tipo === 'data') {
    var data = converterParaData_(valor);
    return data ? formatarData_(data, 'dd/MM/yyyy') : String(valor);
  }
  return String(valor);
}

/** O formulário da reunião: os campos, as listas e o que já vem preenchido. */
function formularioDaAgenda_(canal, quem) {
  // Os analistas da Mesa — e quem está registrando, mesmo que não seja dela:
  // a coordenação também participa de reunião.
  var meuNome = String((quem.usuario || {}).Nome || '').trim();
  var analistas = analistasParaDistribuir_(canal).map(function (um) { return um.nome; });
  if (meuNome && analistas.indexOf(meuNome) < 0) analistas.push(meuNome);
  return RECC_CAMPOS_DA_AGENDA.map(function (campo) {
    return {
      chave: campo.chave, rotulo: campo.rotulo, obrigatorio: campo.obrigatorio === true,
      tipo: campo.tipo === 'analista' || campo.tipo === 'status' ? 'lista' : campo.tipo,
      opcoes: campo.tipo === 'analista' ? analistas
        : (campo.tipo === 'status' ? RECC_STATUS_DA_REUNIAO.slice() : []),
      padrao: campo.chave === 'data' ? formatarData_(new Date(), 'dd/MM/yyyy')
        : (campo.chave === 'analista' && analistas.indexOf(meuNome) >= 0 ? meuNome
          : (campo.chave === 'status' ? RECC_STATUS_DA_REUNIAO[0] : ''))
    };
  });
}

/**
 * A lista de reuniões da Mesa: as mais recentes da planilha primeiro, com a
 * busca em qualquer coluna. Vem junto o formulário, para a mesma chamada
 * servir a sub-aba do Trabalho e o Cadastrar Caso.
 */
function agendaDaMesa(idDoCanal, procurar) {
  var quem = exigirTela_('trabalho');
  var canal = canalDaAgenda_(idDoCanal, quem);
  var agenda = abaDaAgenda_();

  var total = Math.max(agenda.aba.getLastRow() - 1, 0);
  var valores = total ? agenda.aba.getRange(2, 1, total, agenda.largura).getValues() : [];
  var termo = normalizarParaComparar_(procurar);

  var reunioes = [];
  valores.forEach(function (linha, i) {
    var celulas = {};
    var temAlgo = false;
    RECC_CAMPOS_DA_AGENDA.forEach(function (campo) {
      celulas[campo.chave] = celulaDaAgendaParaATela_(linha[agenda.posicoes[campo.chave]], campo);
      if (celulas[campo.chave] !== '') temAlgo = true;
    });
    if (!temAlgo) return;   // linha em branco no meio da planilha não é reunião
    if (termo && !RECC_CAMPOS_DA_AGENDA.some(function (campo) {
      return normalizarParaComparar_(celulas[campo.chave]).indexOf(termo) >= 0;
    })) return;
    reunioes.push({ linha: i + 2, valores: celulas });
  });
  reunioes.reverse();

  return {
    canal: { id: canal.id, nome: canal.nome },
    campos: formularioDaAgenda_(canal, quem),
    total: reunioes.length,
    reunioes: reunioes.slice(0, RECC_REUNIOES_NA_LISTA),
    podeRegistrar: podeFazer_(quem.permissoes, RECC_ACOES.CRIAR),
    podeEditar: podeFazer_(quem.permissoes, RECC_ACOES.EDITAR)
  };
}

/** Só o formulário, para o Cadastrar Caso — sem ler as reuniões. */
function formularioDaReuniao(idDoCanal) {
  var quem = exigirPermissao_(RECC_ACOES.CRIAR);
  exigirTela_('cadastrarCaso');
  var canal = canalDaAgenda_(idDoCanal, quem);
  abaDaAgenda_();   // a aba e as colunas existem? melhor saber antes de preencher
  return { canal: { id: canal.id, nome: canal.nome }, campos: formularioDaAgenda_(canal, quem) };
}

/**
 * O que a tela mandou, conferido e pronto para a planilha: { chave: valor }.
 * Data vira data de verdade; o obrigatório vazio e a data impossível recusam.
 */
function reuniaoConferida_(valores) {
  valores = valores || {};
  var pronta = {};
  var erros = [];
  RECC_CAMPOS_DA_AGENDA.forEach(function (campo) {
    var texto = String(valores[campo.chave] === null || valores[campo.chave] === undefined
      ? '' : valores[campo.chave]).trim();
    if (!texto) {
      if (campo.obrigatorio) erros.push(campo.rotulo + ' é obrigatório');
      pronta[campo.chave] = '';
      return;
    }
    if (campo.tipo === 'data') {
      var data = converterParaData_(texto);
      if (!data) { erros.push(campo.rotulo + ': "' + texto + '" não é uma data'); return; }
      pronta[campo.chave] = data;
      return;
    }
    pronta[campo.chave] = texto;
  });
  if (erros.length) throw new Error(erros.join('; ') + '.');
  return pronta;
}

/** Registra uma reunião: uma linha nova no fim da Agenda. */
function registrarReuniao(idDoCanal, valores, envio) {
  var quem = exigirPermissao_(RECC_ACOES.CRIAR);
  var canal = canalDaAgenda_(idDoCanal, quem);
  var pronta = reuniaoConferida_(valores);

  return comEnvioUnico_(envio, function () {
    var agenda = abaDaAgenda_();
    var trava = LockService.getScriptLock();
    if (!esperarATrava_(trava, 25000)) {
      throw new Error('A planilha está ocupada com outra gravação. Tente de novo.');
    }
    var linha;
    try {
      var nova = [];
      for (var i = 0; i < agenda.largura; i++) nova.push('');
      RECC_CAMPOS_DA_AGENDA.forEach(function (campo) {
        nova[agenda.posicoes[campo.chave]] = pronta[campo.chave];
      });
      linha = agenda.aba.getLastRow() + 1;
      agenda.aba.getRange(linha, 1, 1, agenda.largura).setValues([nova]);
    } finally {
      trava.releaseLock();
    }
    registrarAuditoria_('agenda.registrar', agenda.nome, String(linha),
      canal.nome + ' · ' + pronta.corretora + ' · ' + pronta.assunto);
    return { linha: linha };
  });
}

/**
 * Salva a edição de uma reunião. `original` é a data, a corretora e o assunto
 * que a tela mostrava: se a linha já não for essa — alguém ordenou ou apagou
 * linhas na planilha —, recusa em vez de gravar por cima de outra reunião.
 */
function salvarReuniao(idDoCanal, linha, valores, original) {
  var quem = exigirPermissao_(RECC_ACOES.EDITAR);
  var canal = canalDaAgenda_(idDoCanal, quem);
  var pronta = reuniaoConferida_(valores);
  var agenda = abaDaAgenda_();
  var numero = Number(linha);
  if (!numero || numero < 2 || Math.floor(numero) !== numero || numero > agenda.aba.getLastRow()) {
    throw new Error('Esta reunião não está mais na Agenda. Recarregue a lista.');
  }

  var trava = LockService.getScriptLock();
  if (!esperarATrava_(trava, 25000)) {
    throw new Error('A planilha está ocupada com outra gravação. Tente de novo.');
  }
  try {
    var faixa = agenda.aba.getRange(numero, 1, 1, agenda.largura);
    var atual = faixa.getValues()[0];
    original = original || {};
    var mudou = ['data', 'corretora', 'assunto'].some(function (chave) {
      var campo = RECC_CAMPOS_DA_AGENDA.filter(function (um) { return um.chave === chave; })[0];
      return celulaDaAgendaParaATela_(atual[agenda.posicoes[chave]], campo)
        !== String(original[chave] === undefined ? '' : original[chave]);
    });
    if (mudou) {
      throw new Error('A Agenda mudou na planilha desde que esta lista foi aberta, e a linha '
        + numero + ' já é outra reunião. Recarregue a lista e edite de novo.');
    }
    // Só as dezesseis colunas da reunião: o que mais a aba tiver fica como está.
    RECC_CAMPOS_DA_AGENDA.forEach(function (campo) {
      atual[agenda.posicoes[campo.chave]] = pronta[campo.chave];
    });
    faixa.setValues([atual]);
  } finally {
    trava.releaseLock();
  }
  registrarAuditoria_('agenda.editar', agenda.nome, String(numero),
    canal.nome + ' · ' + pronta.corretora + ' · ' + pronta.assunto);
  return { linha: numero };
}
