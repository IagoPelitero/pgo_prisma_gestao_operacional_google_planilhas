/**
 * ============================================================================
 * PGO — Painel.gs · os números do dia e a fila de trabalho
 * ============================================================================
 * O Dashboard responde três perguntas, nesta ordem de importância:
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

/** Quantas linhas do fim da aba o painel olha antes de filtrar por data. */
const RECC_LINHAS_QUE_O_PAINEL_OLHA = 5000;

/**
 * Tudo que o Dashboard precisa, numa chamada.
 *
 * `filtros` é um objeto simples: { chaveDoCampo: valorEscolhido }. As chaves
 * vêm da própria resposta anterior, em `filtrosDisponiveis` — a tela não
 * inventa filtro, ela oferece o que a mesa tem.
 */
function resumoDaMesa(idDaMesa, filtros) {
  var quem = exigirTela_('dashboard');
  var mesa = mesaPeloId_(idDaMesa);
  var dias = Number(valorDaConfiguracao_('OPERACAO.JANELA_DIAS', '30')) || 30;

  // A base só acrescenta no fim, então o recente está nas últimas linhas.
  // Ler por data exigiria percorrer tudo; ler o fim e depois filtrar por data
  // custa uma leitura só, e o `truncada` avisa quando a janela não coube.
  var recentes = lerRegistros_(mesa.aba, { ultimas: RECC_LINHAS_QUE_O_PAINEL_OLHA });
  var truncada = recentes.length === RECC_LINHAS_QUE_O_PAINEL_OLHA;

  var noPeriodo = filtrarPeloPeriodo_(recentes, mesa, dias);
  var meus = filtrarPeloAlcance_(noPeriodo, mesa.aba, quem);

  var disponiveis = filtrosDaMesa_(mesa, quem);
  var filtrados = aplicarFiltros_(meus, disponiveis, filtros || {});

  return {
    mesa: mesa,
    periodo: { dias: dias, rotulo: 'últimos ' + dias + ' dias' },
    cartoes: contarCartoes_(filtrados, mesa),
    filtrosDisponiveis: disponiveis,
    colunas: colunasDaFila_(mesa),
    fila: montarFila_(filtrados, mesa),
    total: filtrados.length,
    totalNoPeriodo: meus.length,
    truncada: truncada,
    escopo: quem.permissoes.escopo,
    podeOcultar: podeFazer_(quem.permissoes, RECC_ACOES.OCULTAR)
  };
}

/** Só o que entrou na janela. Registro sem data fica — não some por omissão. */
function filtrarPeloPeriodo_(registros, mesa, dias) {
  if (!mesa.colunaDaData) return registros;

  var limite = new Date();
  limite.setDate(limite.getDate() - dias);
  var corte = Utilities.formatDate(limite, RECC_FUSO_HORARIO, 'yyyy-MM-dd');

  return registros.filter(function (registro) {
    var data = converterParaData_(registro[mesa.colunaDaData]);
    if (!data) return true;
    return Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd') >= corte;
  });
}

/**
 * Os filtros que a mesa oferece: os campos que já são lista.
 *
 * Não há lista de filtros escrita em código. Se o administrador transformar
 * um campo em seletor, ele vira filtro sozinho; se desligar o campo, o filtro
 * some junto.
 */
function filtrosDaMesa_(mesa, quem) {
  var disponiveis = [];

  camposAtivosDaMesa_(mesa.id).forEach(function (campo) {
    if (disponiveis.length >= 4) return;   // mais que isso vira parede de caixas
    var visibilidade = visibilidadeDoCampo_(quem.permissoes, campo.ChaveTecnica);
    if (visibilidade === RECC_VISIBILIDADE.OCULTO) return;

    var descricao = campoParaATela_(campo, mesa.id, visibilidade);
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
 * Total, um cartão por situação, e — quando a mesa tem as colunas para isso —
 * quantos foram finalizados na própria célula.
 *
 * A contagem por situação sai do CATÁLOGO, e não dos valores encontrados na
 * base: assim uma situação sem nenhum caso aparece com zero, em vez de sumir
 * do painel. Sumir esconde justamente a informação de que ela zerou.
 */
function contarCartoes_(registros, mesa) {
  var cartoes = [{
    chave: 'total', rotulo: 'Total de casos', valor: registros.length, tom: 'destaque'
  }];

  if (mesa.colunaDoStatus) {
    var contagem = {};
    registros.forEach(function (registro) {
      var chave = normalizarParaComparar_(registro[mesa.colunaDoStatus]);
      contagem[chave] = (contagem[chave] || 0) + 1;
    });

    situacoesDaMesa_(mesa).forEach(function (situacao) {
      cartoes.push({
        chave: situacao.chave,
        rotulo: situacao.nome,
        valor: contagem[situacao.chave] || 0,
        tom: situacao.tom
      });
    });
  }

  var naCelula = contarFinalizadosNaCelula_(registros, mesa);
  if (naCelula !== null) {
    cartoes.push({
      chave: 'naCelula',
      rotulo: 'Finalizados na célula',
      valor: naCelula,
      tom: 'bom',
      explicacao: 'Concluídos sem encaminhar para nenhuma área'
    });
  }

  return cartoes;
}

function situacoesDaMesa_(mesa) {
  var daMesa = converterParaIdentificador_(mesa.id);
  return lerRegistros_('CATALOGO')
    .filter(function (item) {
      if (normalizarParaComparar_(item.Tipo) !== 'status') return false;
      if (normalizarParaComparar_(item.Ativo) !== 'sim') return false;
      var mesaDoItem = converterParaIdentificador_(item.MesaId);
      return !mesaDoItem || mesaDoItem === daMesa;
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (item) {
      return {
        chave: normalizarParaComparar_(item.Nome),
        nome: String(item.Rotulo || item.Nome),
        tom: String(item.Cor || '')
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
 * Devolve null quando a mesa não declarou as duas colunas: o cartão não
 * aparece, em vez de aparecer sempre zerado e parecer um problema.
 */
function contarFinalizadosNaCelula_(registros, mesa) {
  if (!mesa.colunaDaFinalizacao || !mesa.colunaDaAreaResponsavel) return null;

  var quantos = 0;
  registros.forEach(function (registro) {
    var finalizado = String(registro[mesa.colunaDaFinalizacao] || '').trim() !== '';
    var semArea = String(registro[mesa.colunaDaAreaResponsavel] || '').trim() === '';
    if (finalizado && semArea) quantos++;
  });
  return quantos;
}

// ============================================================================
// A FILA
// ============================================================================

/** As colunas que a mesa escolheu mostrar na fila. */
function colunasDaFila_(mesa) {
  var escolhidas = String(mesa.colunasDaFila || '')
    .split(',')
    .map(function (nome) { return nome.trim(); })
    .filter(function (nome) { return nome !== ''; });

  var estrutura = estruturaDaAba_(mesa.aba);
  return escolhidas
    .filter(function (cabecalho) {
      return posicaoDaColuna_(estrutura, cabecalho) >= 0;
    })
    .map(function (cabecalho) {
      var posicao = posicaoDaColuna_(estrutura, cabecalho);
      return {
        cabecalho: estrutura.cabecalhos[posicao],
        tipo: estrutura.tipos[posicao],
        ehStatus: normalizarParaComparar_(cabecalho)
          === normalizarParaComparar_(mesa.colunaDoStatus)
      };
    });
}

function montarFila_(registros, mesa) {
  var colunas = colunasDaFila_(mesa);

  return registros.slice().reverse().map(function (registro) {
    var valores = colunas.map(function (coluna) {
      return paraTexto_(registro[coluna.cabecalho], coluna.tipo);
    });
    return {
      id: registro.__id,
      valores: valores,
      situacao: mesa.colunaDoStatus
        ? String(registro[mesa.colunaDoStatus] || '') : ''
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
function detalhesDoCaso(idDaMesa, idDoCaso) {
  var quem = exigirTela_('dashboard');
  var mesa = mesaPeloId_(idDaMesa);

  var registro = buscarRegistros_(mesa.aba, 'Id', idDoCaso, 1)[0];
  if (!registro) {
    throw new Error('O caso ' + idDoCaso + ' não existe na mesa ' + mesa.nome + '.');
  }
  exigirAlcanceSobre_(registro, mesa, quem);

  var estrutura = estruturaDaAba_(mesa.aba);
  var linhas = [];

  camposAtivosDaMesa_(mesa.id).forEach(function (campo) {
    if (visibilidadeDoCampo_(quem.permissoes, campo.ChaveTecnica)
      === RECC_VISIBILIDADE.OCULTO) return;

    var posicao = posicaoDaColuna_(estrutura, campo.Cabecalho);
    if (posicao < 0) return;

    var valor = paraTexto_(registro[campo.Cabecalho], estrutura.tipos[posicao]);
    if (valor === '') return;   // campo vazio não ocupa espaço no detalhe

    linhas.push({
      rotulo: String(campo.Rotulo || campo.Cabecalho),
      valor: valor,
      secao: String(campo.Secao || 'Geral')
    });
  });

  return { id: registro.__id, mesa: mesa.nome, linhas: linhas };
}
