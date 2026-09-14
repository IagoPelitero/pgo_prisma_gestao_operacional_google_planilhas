/**
 * ============================================================================
 * PGO — Corretoras.gs · quem traz o caso para dentro
 * ============================================================================
 * Três cadastros que sustentam o resto do sistema e que, até aqui, só se
 * ajustavam abrindo a planilha:
 *
 *   CANAIS             corretoras, corretores e agentes, com o segmento
 *   PRODUTOS           o que a operação vende
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
  var bloqueadas = mapaDeBloqueadas_();
  var termo = normalizarParaComparar_(procurar);
  // Os dígitos do termo, SÓ quando ele tem algum. Sem esta guarda, procurar
  // por "agente" comparava '' contra a SUSEP — e `indexOf('')` é sempre zero,
  // então a busca casava com o cadastro inteiro e parecia não filtrar nada.
  var digitos = apenasDigitos_(procurar);
  var segmentoProcurado = normalizarParaComparar_(segmento);

  var todas = lerRegistros_('CANAIS').map(function (linha) {
    var susep = converterParaIdentificador_(linha.SUSEP);
    var bloqueio = bloqueadas[susep];
    return {
      id: linha.__id,
      nome: String(linha.Nome || ''),
      canal: String(linha.Canal || ''),
      susep: susep,
      corretora: String(linha.Corretora || ''),
      // Cadastro sem segmento não vira "Diamante" por descuido: vira o que
      // ele é, "Não encontrado", e a tela mostra isso.
      segmento: String(linha.Segmento || '') || 'Não encontrado',
      bloqueada: !!bloqueio,
      motivoDoBloqueio: bloqueio ? String(bloqueio.Motivo || '') : '',
      casos: volumes.porSusep[susep] || 0
    };
  });

  var filtradas = todas.filter(function (uma) {
    if (segmentoProcurado
      && normalizarParaComparar_(uma.segmento) !== segmentoProcurado) return false;
    if (!termo) return true;
    if (normalizarParaComparar_(uma.nome).indexOf(termo) >= 0) return true;
    if (normalizarParaComparar_(uma.corretora).indexOf(termo) >= 0) return true;
    if (normalizarParaComparar_(uma.canal).indexOf(termo) >= 0) return true;
    return !!digitos && apenasDigitos_(uma.susep).indexOf(digitos) >= 0;
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
    foraDoCadastro: susepsForaDoCadastro_(volumes, todas, bloqueadas),
    podeMexer: podeFazer_(quem.permissoes, RECC_ACOES.CONFIGURAR),
    podeExportar: podeFazer_(quem.permissoes, RECC_ACOES.EXPORTAR)
  };
}

/** Quantos casos cada SUSEP trouxe, somando as mesas. */
function volumePorSusep_() {
  var porSusep = {};
  var nomePorSusep = {};

  mesasVisiveis_().forEach(function (mesa) {
    var estrutura;
    try {
      estrutura = estruturaDaAba_(mesa.aba);
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
    var suseps = lerColunaInteira_(mesa.aba, colunaDaSusep);
    var corretoras = colunaDaCorretora
      ? lerColunaInteira_(mesa.aba, colunaDaCorretora) : [];

    for (var i = 0; i < suseps.length; i++) {
      var susep = converterParaIdentificador_(suseps[i]);
      if (!susep) continue;
      porSusep[susep] = (porSusep[susep] || 0) + 1;
      if (!nomePorSusep[susep] && corretoras[i]) {
        nomePorSusep[susep] = String(corretoras[i]);
      }
    }
  });

  return { porSusep: porSusep, nomePorSusep: nomePorSusep };
}

/** As SUSEPs que aparecem nos casos e não estão no cadastro de canais. */
function susepsForaDoCadastro_(volumes, cadastradas, bloqueadas) {
  var conhecidas = {};
  cadastradas.forEach(function (uma) {
    if (uma.susep) conhecidas[uma.susep] = true;
  });
  // Uma SUSEP BLOQUEADA também é conhecida: o selo do formulário mostra o
  // bloqueio, e não "não encontrada". Listá-la aqui daria um aviso que não
  // corresponde ao que a pessoa vê na outra tela — e aviso que não bate com
  // a realidade é o tipo de coisa que a operação aprende a ignorar.
  Object.keys(bloqueadas || {}).forEach(function (susep) {
    conhecidas[susep] = true;
  });

  var fora = [];
  Object.keys(volumes.porSusep).forEach(function (susep) {
    if (conhecidas[susep]) return;
    fora.push({
      susep: susep,
      // O nome que os próprios casos usam. É um palpite, e a tela diz que é:
      // ele serve para a pessoa reconhecer a corretora, não para cadastrar
      // no automático.
      nomeNosCasos: volumes.nomePorSusep[susep] || '',
      casos: volumes.porSusep[susep]
    });
  });

  return fora.sort(function (uma, outra) { return outra.casos - uma.casos; });
}

function mapaDeBloqueadas_() {
  var mapa = {};
  lerRegistros_('SUSEP_BLOQUEADAS').forEach(function (linha) {
    mapa[converterParaIdentificador_(linha.SUSEP)] = linha;
  });
  return mapa;
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

  var susep = converterParaIdentificador_(dados.susep);
  if (!susep) throw new Error('Informe a SUSEP — é ela que liga a corretora ao caso.');

  var corretora = String(dados.corretora || '').trim();
  if (!corretora) throw new Error('Informe o nome da corretora.');

  var id = converterParaIdentificador_(dados.id);
  var repetida = lerRegistros_('CANAIS').filter(function (linha) {
    return converterParaIdentificador_(linha.SUSEP) === susep
      && converterParaIdentificador_(linha.Id) !== id;
  })[0];
  if (repetida) {
    throw new Error('A SUSEP ' + susep + ' já está cadastrada para "' +
      repetida.Corretora + '". Duas linhas com a mesma SUSEP fariam o selo do ' +
      'formulário escolher uma delas pela ordem da planilha.');
  }

  var campos = {
    Nome: String(dados.nome || corretora).trim(),
    Canal: String(dados.canal || '').trim(),
    SUSEP: susep,
    Corretora: corretora,
    Segmento: String(dados.segmento || '').trim() || 'Não encontrado'
  };

  if (id) {
    atualizarRegistro_('CANAIS', id, campos);
    registrarAuditoria_('corretora.editar', 'CANAIS', id, corretora);
    return id;
  }
  var criada = inserirRegistro_('CANAIS', campos);
  registrarAuditoria_('corretora.criar', 'CANAIS', criada.__id, corretora);
  return criada.__id;
}

/** Tira a corretora da tela. A linha permanece na planilha. */
function ocultarCorretora(idDaCorretora) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var alvo = converterParaIdentificador_(idDaCorretora);
  var atual = buscarRegistros_('CANAIS', 'Id', alvo, 1)[0];
  if (!atual) throw new Error('A corretora ' + alvo + ' não existe.');

  ocultarRegistro_('CANAIS', alvo, quem.usuario.Id);
  registrarAuditoria_('corretora.ocultar', 'CANAIS', alvo, String(atual.Corretora));
  return true;
}

// ============================================================================
// AS SUSEPs BLOQUEADAS
// ============================================================================

function listarSusepsBloqueadas() {
  exigirTela_('tabelaCorretoras');
  var volumes = volumePorSusep_();

  return lerRegistros_('SUSEP_BLOQUEADAS')
    .map(function (linha) {
      var susep = converterParaIdentificador_(linha.SUSEP);
      return {
        id: linha.__id,
        susep: susep,
        corretora: String(linha.NomeCorretora || ''),
        cpfReincidente: converterParaIdentificador_(linha.CpfReincidente),
        motivo: String(linha.Motivo || ''),
        bloqueadaEm: linha.BloqueadaEm
          ? Utilities.formatDate(new Date(linha.BloqueadaEm), RECC_FUSO_HORARIO,
            'dd/MM/yyyy')
          : '',
        casos: volumes.porSusep[susep] || 0
      };
    })
    .sort(function (uma, outra) { return outra.casos - uma.casos; });
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

  var susep = converterParaIdentificador_(dados.susep);
  if (!susep) throw new Error('Informe a SUSEP a bloquear.');

  var motivo = String(dados.motivo || '').trim();
  if (!motivo) {
    throw new Error('Diga o motivo do bloqueio. Sem ele, quem vir o selo ' +
      'vermelho daqui a seis meses não vai saber o que fazer com a informação.');
  }

  var id = converterParaIdentificador_(dados.id);
  var jaBloqueada = lerRegistros_('SUSEP_BLOQUEADAS').filter(function (linha) {
    return converterParaIdentificador_(linha.SUSEP) === susep
      && converterParaIdentificador_(linha.Id) !== id;
  })[0];
  if (jaBloqueada) {
    throw new Error('A SUSEP ' + susep + ' já está bloqueada.');
  }

  var campos = {
    SUSEP: susep,
    NomeCorretora: String(dados.corretora || '').trim(),
    CpfReincidente: converterParaIdentificador_(dados.cpfReincidente),
    Motivo: motivo
  };

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
    converterParaIdentificador_(atual.SUSEP));
  return true;
}

// ============================================================================
// OS PRODUTOS
// ============================================================================

function listarProdutos() {
  exigirTela_('tabelaCorretoras');
  return lerRegistros_('PRODUTOS')
    .map(function (linha) {
      return {
        id: linha.__id,
        produto: String(linha.Produto || ''),
        codigo: converterParaIdentificador_(linha.CodigoProduto)
      };
    })
    .sort(function (um, outro) { return um.produto < outro.produto ? -1 : 1; });
}

function salvarProduto(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var produto = String(dados.produto || '').trim();
  if (!produto) throw new Error('Informe o nome do produto.');

  var codigo = converterParaIdentificador_(dados.codigo);
  var id = converterParaIdentificador_(dados.id);

  if (codigo) {
    var repetido = lerRegistros_('PRODUTOS').filter(function (linha) {
      return converterParaIdentificador_(linha.CodigoProduto) === codigo
        && converterParaIdentificador_(linha.Id) !== id;
    })[0];
    if (repetido) {
      throw new Error('O código ' + codigo + ' já é do produto "' +
        repetido.Produto + '". O código é o que liga o produto ao caso.');
    }
  }

  var campos = { Produto: produto, CodigoProduto: codigo };
  if (id) {
    atualizarRegistro_('PRODUTOS', id, campos);
    registrarAuditoria_('produto.editar', 'PRODUTOS', id, produto);
    return id;
  }
  var criado = inserirRegistro_('PRODUTOS', campos);
  registrarAuditoria_('produto.criar', 'PRODUTOS', criado.__id, produto);
  return criado.__id;
}

function ocultarProduto(idDoProduto) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var alvo = converterParaIdentificador_(idDoProduto);
  var atual = buscarRegistros_('PRODUTOS', 'Id', alvo, 1)[0];
  if (!atual) throw new Error('Este produto não existe.');

  ocultarRegistro_('PRODUTOS', alvo, quem.usuario.Id);
  registrarAuditoria_('produto.ocultar', 'PRODUTOS', alvo, String(atual.Produto));
  return true;
}

// ============================================================================
// EXPORTAR
// ============================================================================

/** As corretoras em texto, do jeito que o Excel em português abre. */
function exportarCorretoras(procurar, segmento) {
  exigirPermissao_(RECC_ACOES.EXPORTAR);
  var tabela = tabelaDeCorretoras(procurar, segmento);

  var linhas = [['SUSEP', 'Corretora', 'Canal', 'Nome', 'Segmento',
    'Situação', 'Casos'].join(';')];

  tabela.corretoras.forEach(function (uma) {
    linhas.push([uma.susep, uma.corretora, uma.canal, uma.nome, uma.segmento,
      uma.bloqueada ? 'Bloqueada' : 'Liberada', uma.casos].join(';'));
  });

  registrarAuditoria_('corretoras.exportar', 'CANAIS', '',
    tabela.corretoras.length + ' linhas');
  return { nome: 'corretoras.csv', conteudo: linhas.join('\n') };
}
