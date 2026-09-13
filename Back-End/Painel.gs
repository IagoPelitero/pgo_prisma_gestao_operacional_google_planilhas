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

  var noPeriodo = filtrarPeloPeriodo_(recentes, mesa, dias, 0);
  var meus = filtrarPeloAlcance_(noPeriodo, mesa.aba, quem);

  // O período ANTERIOR, do mesmo tamanho, só para dizer se subiu ou desceu.
  var anterior = filtrarPeloAlcance_(
    filtrarPeloPeriodo_(recentes, mesa, dias, dias), mesa.aba, quem);

  var disponiveis = filtrosDaMesa_(mesa, quem);
  var filtrados = aplicarFiltros_(meus, disponiveis, filtros || {});
  var anterioresFiltrados = aplicarFiltros_(anterior, disponiveis, filtros || {});

  return {
    mesa: mesa,
    periodo: { dias: dias, rotulo: 'últimos ' + dias + ' dias' },
    cartoes: contarCartoes_(filtrados, anterioresFiltrados, mesa),
    filtrosDisponiveis: disponiveis,
    colunas: colunasDaFila_(mesa),
    fila: montarFila_(filtrados, mesa),
    total: filtrados.length,
    totalNoPeriodo: meus.length,
    truncada: truncada,
    escopo: quem.permissoes.escopo,
    podeEditar: podeFazer_(quem.permissoes, RECC_ACOES.EDITAR),
    podeOcultar: podeFazer_(quem.permissoes, RECC_ACOES.OCULTAR)
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
function filtrarPeloPeriodo_(registros, mesa, dias, recuo) {
  if (!mesa.colunaDaData) return recuo ? [] : registros;

  var fim = new Date();
  fim.setDate(fim.getDate() - recuo);
  var inicio = new Date();
  inicio.setDate(inicio.getDate() - recuo - dias);

  var de = Utilities.formatDate(inicio, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
  var ate = Utilities.formatDate(fim, RECC_FUSO_HORARIO, 'yyyy-MM-dd');

  return registros.filter(function (registro) {
    var data = converterParaData_(registro[mesa.colunaDaData]);
    if (!data) return !recuo;
    var dela = Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
    return dela >= de && dela <= ate;
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
/**
 * A regra de contagem de um cartão, na forma canônica.
 *
 * Existe porque a comparação de textos do sistema ignora acento e caixa: sem
 * este mapa, o servidor devolvia `nacelula` para a tela e recusava o mesmo
 * `nacelula` de volta na hora de salvar. O que sai e o que entra têm de ser a
 * mesma coisa.
 */
function dimensaoDoCartao_(valor) {
  var canonicas = ['total', 'situacao', 'naCelula'];
  var procurado = normalizarParaComparar_(valor);
  for (var i = 0; i < canonicas.length; i++) {
    if (normalizarParaComparar_(canonicas[i]) === procurado) return canonicas[i];
  }
  return '';
}

function contarCartoes_(registros, anteriores, mesa) {
  var agora = mesa.colunaDoStatus ? contarPorSituacao_(registros, mesa) : {};
  var antes = mesa.colunaDoStatus ? contarPorSituacao_(anteriores, mesa) : {};

  var tons = {};
  situacoesDaMesa_(mesa).forEach(function (situacao) {
    tons[situacao.chave] = situacao.tom;
  });

  return cartoesDaMesa_(mesa).map(function (cartao) {
    if (cartao.dimensao === 'total') {
      return montarCartao_('total', cartao.titulo, registros.length,
        anteriores.length, cartao.cor, '');
    }
    if (cartao.dimensao === 'naCelula') {
      var naCelula = contarFinalizadosNaCelula_(registros, mesa);
      if (naCelula === null) return null;
      return montarCartao_('naCelula', cartao.titulo, naCelula,
        contarFinalizadosNaCelula_(anteriores, mesa), cartao.cor,
        'Concluídos sem encaminhar para nenhuma área');
    }

    var chave = normalizarParaComparar_(cartao.filtro);
    return montarCartao_(chave, cartao.titulo, agora[chave] || 0,
      antes[chave] || 0, cartao.cor || tons[chave] || 'neutro', '');
  }).filter(function (cartao) { return cartao !== null; });
}

/**
 * Os cartões declarados para o Dashboard desta mesa, na ordem escolhida.
 *
 * Cada cartão é uma linha de `PAINEIS`, e não um pedaço de texto dentro de
 * `MESAS`: assim ele tem nome, cor e ordem próprios, e o administrador
 * renomeia "Concluído" para "Resolvido no primeiro contato" sem que isso
 * mexa no que está gravado nos casos.
 *
 * Desligar um cartão só o tira da tela — nenhum caso é tocado.
 */
function cartoesDaMesa_(mesa) {
  var daMesa = converterParaIdentificador_(mesa.id);

  return lerRegistros_('PAINEIS')
    .filter(function (linha) {
      if (normalizarParaComparar_(linha.Tela) !== 'dashboard') return false;
      if (normalizarParaComparar_(linha.TipoWidget) !== 'cartao') return false;
      if (normalizarParaComparar_(linha.Ativo) !== 'sim') return false;
      return converterParaIdentificador_(linha.MesaId) === daMesa;
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


function contarPorSituacao_(registros, mesa) {
  var contagem = {};
  registros.forEach(function (registro) {
    var chave = normalizarParaComparar_(registro[mesa.colunaDoStatus]);
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
        // O que a pessoa LÊ é o rótulo; o que está GRAVADO no caso é o nome.
        // Um cartão que apontasse para o rótulo pararia de contar no dia em
        // que alguém trocasse o texto da tela.
        nome: String(item.Rotulo || item.Nome),
        gravadoComo: String(item.Nome),
        tom: tomValido_(item.Cor)
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
 * descuido: a fila é leitura, e derrubar o Dashboard inteiro porque alguém
 * renomeou uma coluna seria pior. Quem cobra o nome errado é Configurações,
 * na hora de salvar a mesa.
 */
function colunasDaFila_(mesa) {
  var estrutura = estruturaDaAba_(mesa.aba);
  var declarado = String(mesa.colunasDaFila || '');

  // Sem nenhum dois-pontos, é a escrita plana: cada coluna vira um grupo com
  // o próprio nome. É o que faz uma mesa antiga continuar funcionando igual,
  // sem ninguém precisar reescrever a linha dela na planilha.
  var pedacos = declarado.indexOf(':') < 0
    ? declarado.split(',')
    : declarado.split(';');

  return pedacos
    .map(function (pedaco) { return grupoDaFila_(pedaco, estrutura, mesa); })
    .filter(function (grupo) { return grupo && grupo.colunas.length; });
}

/** Um pedaço de `ColunasDaFila` vira um grupo com o seu título. */
function grupoDaFila_(pedaco, estrutura, mesa) {
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
          === normalizarParaComparar_(mesa.colunaDoStatus)
      };
    });

  return {
    // Sem título declarado, o grupo se chama como a sua única coluna — é o
    // que faz a escrita plana continuar valendo, sem um segundo caminho.
    titulo: titulo || (colunas.length ? colunas[0].cabecalho : ''),
    colunas: colunas
  };
}


function montarFila_(registros, mesa) {
  var grupos = colunasDaFila_(mesa);

  // A cor de cada situação, para a etiqueta da fila sair pintada. Numa fila
  // de trinta linhas, é a cor que faz "não trabalhado" saltar aos olhos.
  var tons = {};
  situacoesDaMesa_(mesa).forEach(function (situacao) {
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
    var situacao = mesa.colunaDoStatus
      ? String(registro[mesa.colunaDoStatus] || '') : '';
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

    // Campo vazio aparece com um travessão, e não sumindo. Sumir faria a
    // pessoa achar que o campo não existe naquela mesa, quando na verdade
    // ele existe e está em branco — que é uma informação.
    linhas.push({
      chave: String(campo.ChaveTecnica),
      rotulo: String(campo.Rotulo || campo.Cabecalho),
      valor: paraTexto_(registro[campo.Cabecalho], estrutura.tipos[posicao]),
      secao: String(campo.Secao || 'Geral')
    });
  });

  var situacao = mesa.colunaDoStatus
    ? String(registro[mesa.colunaDoStatus] || '') : '';
  var tom = 'neutro';
  situacoesDaMesa_(mesa).forEach(function (uma) {
    if (uma.chave === normalizarParaComparar_(situacao)) tom = uma.tom;
  });

  return {
    id: registro.__id,
    mesa: mesa.nome,
    situacao: situacao,
    tom: tom,
    atualizadoEm: quandoFoiMexido_(mesa.aba, registro.__id),
    linhas: linhas,
    historico: historicoDoCaso_(mesa.aba, registro.__id),
    podeEditar: podeFazer_(quem.permissoes, RECC_ACOES.EDITAR),
    podeOcultar: podeFazer_(quem.permissoes, RECC_ACOES.OCULTAR)
  };
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

