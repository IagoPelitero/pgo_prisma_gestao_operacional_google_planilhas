/**
 * RECC — Analise.gs · as abas ANALISE_* que o sistema gera
 * ============================================================================
 * O pedido: *"permitir criar uma aba exclusiva que irá criar uma aba no
 * planilhas para análise de dados."*
 *
 * O administrador monta uma RECEITA — mesa, colunas, filtros, período — e o
 * sistema escreve o resultado numa aba nova, chamada `ANALISE_<Nome>`, pronta
 * para tabela dinâmica ou para o Power BI apontar.
 *
 * ---------------------------------------------------------------------------
 * TRÊS DECISÕES QUE VALEM ESTAR ESCRITAS
 * ---------------------------------------------------------------------------
 *
 * 1. É UM RETRATO, E NÃO UMA FÓRMULA. A aba recebe VALORES gravados de uma
 *    vez. Poderia ser uma aba de `=FILTER(...)`, e seria "sempre atualizada" —
 *    mas uma fórmula que varre 30 mil linhas recalcula a cada abertura da
 *    planilha, e com três abas dessas a planilha inteira fica lenta para todo
 *    mundo, o dia todo. Retrato é estável: pesa uma vez, quando alguém pede.
 *
 * 2. SÓ ESCREVE EM ABA COM O PREFIXO `ANALISE_`. É a trava mais importante
 *    deste arquivo. Uma análise chamada "BASE_RET" apagaria a base de
 *    produção — e nenhuma outra proteção do sistema pegaria isso, porque
 *    apagar seria exatamente o que o código se propôs a fazer.
 *
 * 3. REGERAR PEDE SENHA; CRIAR PELA PRIMEIRA VEZ, NÃO. Criar uma aba nova não
 *    destrói nada. Regerar apaga o retrato anterior — e quem tinha uma tabela
 *    dinâmica apontada para ele vê os números mudarem embaixo dela.
 *
 * ---------------------------------------------------------------------------
 * A ABA GERADA NÃO ESTÁ NO CONTRATO
 * ---------------------------------------------------------------------------
 * `conferirEstrutura_` não reclama dela, e o instalador não a cria. É saída,
 * não é base: pode ser apagada à mão a qualquer momento, e a próxima geração
 * a refaz. A RECEITA é que está no contrato, na aba `ANALISES`.
 * ============================================================================
 */

/** O prefixo obrigatório. Nenhuma aba sem ele é escrita por este arquivo. */
var RECC_PREFIXO_DA_ANALISE = 'ANALISE_';

/**
 * Teto de linhas por aba gerada.
 *
 * Não é medo de dado: é o teto de 10 milhões de células da planilha. Uma
 * análise de 50 mil linhas por 39 colunas são 1,95 milhão de células — um
 * quinto do orçamento inteiro numa aba só, que é saída e não base.
 */
var RECC_MAXIMO_DA_ANALISE = 50000;

// ============================================================================
// A RECEITA
// ============================================================================

/**
 * Traduz a linha da aba ANALISES para o formato que a tela usa.
 *
 * Vem junto o estado da aba GERADA — existe? quantas linhas? de quando? —
 * porque é isso que a tela precisa mostrar, e é o que separa "a análise está
 * configurada" de "a análise está pronta para usar".
 */
function analiseDaLinha_(linha, mesas) {
  var mesa = mesas.filter(function (uma) {
    return String(uma.id) === String(linha.MesaId);
  })[0];

  var nomeDaAba = nomeDaAbaDeAnalise_(linha.Nome);
  var aba = nomeDaAba ? planilhaAtiva_().getSheetByName(nomeDaAba) : null;

  return {
    id: linha.__id,
    nome: String(linha.Nome || ''),
    descricao: String(linha.Descricao || ''),
    mesaId: String(linha.MesaId || ''),
    mesaNome: mesa ? mesa.nome : '(mesa desligada)',
    colunas: separarPorVirgula_(linha.Colunas),
    filtros: lerFiltrosEscritos_(linha.Filtros),
    dias: Number(linha.Dias) || 0,
    ordem: Number(linha.Ordem) || 0,
    ativo: normalizarParaComparar_(linha.Ativo) === 'sim',
    aba: nomeDaAba,
    abaExiste: !!aba,
    geradaEm: linha.GeradaEm
      ? Utilities.formatDate(new Date(linha.GeradaEm), RECC_FUSO_HORARIO,
        'dd/MM/yyyy HH:mm')
      : '',
    linhasGeradas: Number(linha.Linhas) || 0
  };
}

/** O nome da aba de uma análise. Vazio se o nome não serve. */
function nomeDaAbaDeAnalise_(nome) {
  var limpo = String(nome || '').trim();
  if (!limpo) return '';
  return RECC_PREFIXO_DA_ANALISE + limpo;
}

/** 'a, b , c' → ['a', 'b', 'c']. Pedaço vazio some. */
function separarPorVirgula_(texto) {
  return String(texto || '')
    .split(',')
    .map(function (pedaco) { return pedaco.trim(); })
    .filter(function (pedaco) { return pedaco.length > 0; });
}

/**
 * 'Status=Pendente; Canal=Chat' → [{ coluna: 'Status', valor: 'Pendente' }, …]
 *
 * Pedaço sem '=' é ignorado em silêncio, e é o único silêncio deste arquivo:
 * quem grava o filtro é a tela, com seletores — o texto solto só existe para
 * quem editar a aba ANALISES na mão, e aí meio filtro é melhor que nenhum.
 */
function lerFiltrosEscritos_(texto) {
  return String(texto || '')
    .split(';')
    .map(function (pedaco) {
      var corte = pedaco.indexOf('=');
      if (corte < 0) return null;
      return {
        coluna: pedaco.substring(0, corte).trim(),
        valor: pedaco.substring(corte + 1).trim()
      };
    })
    .filter(function (filtro) { return filtro && filtro.coluna; });
}

/** O caminho de volta: a lista de filtros vira o texto que a aba guarda. */
function escreverFiltros_(filtros) {
  return (filtros || [])
    .filter(function (filtro) {
      return filtro && String(filtro.coluna || '').trim();
    })
    .map(function (filtro) {
      return String(filtro.coluna).trim() + '=' + String(filtro.valor || '').trim();
    })
    .join(';');
}

// ============================================================================
// O QUE A TELA CHAMA
// ============================================================================

/** Todas as análises montadas, com o estado da aba de cada uma. */
function listarAnalises() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var mesas = mesasVisiveis_();
  return lerRegistros_('ANALISES')
    .map(function (linha) { return analiseDaLinha_(linha, mesas); })
    .sort(function (uma, outra) { return uma.ordem - outra.ordem; });
}

/**
 * O que a tela oferece para montar uma análise: as mesas, e de cada uma as
 * colunas e os filtros possíveis.
 *
 * Sai da estrutura da planilha, e não de uma lista escrita aqui: coluna nova
 * na base aparece como opção sozinha, no dia seguinte.
 */
function opcoesDeAnalise() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  return {
    maximo: RECC_MAXIMO_DA_ANALISE,
    prefixo: RECC_PREFIXO_DA_ANALISE,
    mesas: mesasVisiveis_().map(function (mesa) {
      var estrutura = estruturaDaAba_(mesa.aba);
      return {
        id: mesa.id,
        nome: mesa.nome,
        aba: mesa.aba,
        temColunaDeData: !!mesa.colunaDaData,
        colunaDaData: mesa.colunaDaData || '',
        // As de controle ficam de fora da escolha: são do sistema, e numa
        // tabela dinâmica só atrapalham. A geração acrescenta o que precisa.
        colunas: estrutura.cabecalhos.filter(function (cabecalho) {
          return String(cabecalho).charAt(0) !== '_';
        }),
        filtros: filtrosPossiveisDaAnalise_(mesa)
      };
    })
  };
}

/**
 * Os campos da mesa que dão para usar como filtro: os que já são lista.
 *
 * Não é `filtrosDaMesa_`, do Dashboard, por um motivo só: lá o teto é QUATRO,
 * porque cinco caixas de seleção em cima da fila viram uma parede. Aqui não há
 * parede — escolhe-se um filtro por vez, num formulário —, e cortar em quatro
 * deixaria de fora justamente o campo pelo qual alguém quer recortar.
 */
function filtrosPossiveisDaAnalise_(mesa) {
  var achados = [];
  camposAtivosDaMesa_(mesa.id).forEach(function (campo) {
    var descricao = campoParaATela_(campo, mesa.id, RECC_VISIBILIDADE.EDICAO);
    if (descricao.tipo !== 'seletor' || !descricao.opcoes.length) return;
    achados.push({
      cabecalho: descricao.cabecalho,
      rotulo: descricao.rotulo,
      opcoes: descricao.opcoes
    });
  });
  return achados;
}

/**
 * Cria ou altera uma receita de análise. Não gera nada — quem gera é
 * `gerarAnalise`.
 *
 * Salvar e gerar são separados de propósito: montar a receita é ajuste, e
 * ajuste não pode custar trinta segundos de espera a cada campo mexido.
 */
function salvarAnalise(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var nome = String(dados.nome || '').trim();
  conferirNomeDaAnalise_(nome);

  var mesa = mesaPeloId_(dados.mesaId);
  var estrutura = estruturaDaAba_(mesa.aba);

  var colunas = separarPorVirgula_(dados.colunas);
  colunas.forEach(function (cabecalho) {
    if (posicaoDaColuna_(estrutura, cabecalho) < 0) {
      throw new Error('A mesa ' + mesa.nome + ' não tem a coluna "' + cabecalho
        + '". As colunas dela são: ' + estrutura.cabecalhos.join(', ') + '.');
    }
  });

  var filtros = dados.filtros || [];
  filtros.forEach(function (filtro) {
    if (posicaoDaColuna_(estrutura, filtro.coluna) < 0) {
      throw new Error('Não dá para filtrar por "' + filtro.coluna
        + '": a mesa ' + mesa.nome + ' não tem essa coluna.');
    }
  });

  var id = converterParaIdentificador_(dados.id);
  var repetida = lerRegistros_('ANALISES').filter(function (linha) {
    return normalizarParaComparar_(linha.Nome) === normalizarParaComparar_(nome)
      && converterParaIdentificador_(linha.Id) !== id;
  })[0];
  if (repetida) {
    throw new Error('Já existe uma análise chamada "' + nome + '". Duas com o '
      + 'mesmo nome escreveriam na mesma aba, e a segunda apagaria a primeira.');
  }

  var campos = {
    Nome: nome,
    Descricao: String(dados.descricao || '').trim(),
    MesaId: mesa.id,
    Colunas: colunas.join(','),
    Filtros: escreverFiltros_(filtros),
    Dias: Math.max(0, Number(dados.dias) || 0),
    Ordem: Number(dados.ordem) || 0,
    Ativo: dados.ativo === false ? false : true
  };

  if (id) {
    atualizarRegistro_('ANALISES', id, campos);
    registrarAuditoria_('analise.editar', 'ANALISES', id, nome);
    return id;
  }
  var criada = inserirRegistro_('ANALISES', campos);
  registrarAuditoria_('analise.criar', 'ANALISES', criada.__id, nome);
  return criada.__id;
}

/**
 * O nome vira nome de aba, e nome de aba tem regra.
 *
 * Espaço, acento e pontuação funcionariam na aba, mas obrigam a citá-la entre
 * aspas simples em toda fórmula — `='ANALISE_Ret Vida'!A1` — e é o tipo de
 * detalhe que ninguém lembra na hora de montar a tabela dinâmica.
 */
function conferirNomeDaAnalise_(nome) {
  if (!nome) throw new Error('Dê um nome à análise. Ele vira o nome da aba.');
  if (!/^[A-Za-z0-9_]+$/.test(nome)) {
    throw new Error('O nome "' + nome + '" tem caractere que complica na '
      + 'planilha. Use só letras sem acento, números e _ — o nome vira o nome '
      + 'da aba, e aba com espaço ou acento precisa de aspas em toda fórmula.');
  }
  if (nome.length > 40) {
    throw new Error('O nome tem ' + nome.length + ' caracteres, e o limite é '
      + '40 — com o prefixo ANALISE_ a aba não pode passar de 50.');
  }
}

/** Tira a análise da tela. A linha e a aba gerada permanecem. */
function ocultarAnalise(idDaAnalise) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var alvo = converterParaIdentificador_(idDaAnalise);
  var atual = buscarRegistros_('ANALISES', 'Id', alvo, 1)[0];
  if (!atual) throw new Error('Esta análise não existe.');

  ocultarRegistro_('ANALISES', alvo, quem.usuario.Id);
  registrarAuditoria_('analise.ocultar', 'ANALISES', alvo, String(atual.Nome));
  return true;
}

// ============================================================================
// A GERAÇÃO
// ============================================================================

/**
 * Escreve a aba `ANALISE_<Nome>`.
 *
 * Pede senha de administrador quando a aba JÁ EXISTE: regerar apaga o retrato
 * anterior, e quem tinha uma tabela dinâmica apontada para ele vê os números
 * mudarem embaixo dela. Criar pela primeira vez não destrói nada, e por isso
 * não pede.
 */
function gerarAnalise(idDaAnalise) {
  var quem = exigirPermissao_(RECC_ACOES.ESTRUTURA);

  var alvo = converterParaIdentificador_(idDaAnalise);
  var linha = buscarRegistros_('ANALISES', 'Id', alvo, 1)[0];
  if (!linha) throw new Error('Esta análise não existe.');

  var receita = analiseDaLinha_(linha, mesasVisiveis_());
  if (!receita.ativo) {
    throw new Error('A análise "' + receita.nome + '" está desligada. '
      + 'Ligue-a antes de gerar.');
  }
  if (receita.abaExiste) exigirSenhaDeAdministrador_();

  var mesa = mesaPeloId_(receita.mesaId);
  var conteudo = montarConteudoDaAnalise_(receita, mesa);

  escreverAbaDeAnalise_(receita.aba, conteudo.cabecalhos, conteudo.linhas);

  atualizarRegistro_('ANALISES', alvo, {
    GeradaEm: new Date(),
    GeradaPor: quem.usuario.Id,
    Linhas: conteudo.linhas.length
  });
  registrarAuditoria_('analise.gerar', 'ANALISES', alvo,
    receita.aba + ': ' + conteudo.linhas.length + ' linha(s)');

  return {
    nome: receita.nome,
    aba: receita.aba,
    linhas: conteudo.linhas.length,
    colunas: conteudo.cabecalhos.length,
    truncada: conteudo.truncada
  };
}

/**
 * Os dados da análise, já filtrados e recortados nas colunas escolhidas.
 *
 * O ALCANCE DE QUEM GERA NÃO SE APLICA AQUI, e é decisão, não esquecimento.
 * Dois motivos:
 *
 * 1. A aba gerada mora na MESMA planilha que a base. Quem consegue abrir
 *    ANALISE_Diamante consegue abrir BASE_RET ao lado — recortar por alcance
 *    não esconderia nada de ninguém, só deixaria a análise incompleta.
 * 2. O gatilho de horário roda sem ninguém logado. Se o recorte dependesse de
 *    quem gerou, a MESMA análise teria conteúdos diferentes conforme o botão
 *    ou o horário a tivesse gerado — e ninguém saberia qual dos dois está na
 *    aba naquele momento.
 *
 * Quem pode gerar é controlado onde tem de ser: `gerarAnalise` exige a
 * permissão de estrutura.
 */
function montarConteudoDaAnalise_(receita, mesa) {
  var estrutura = estruturaDaAba_(mesa.aba);

  var cabecalhos = receita.colunas.length
    ? receita.colunas
    : estrutura.cabecalhos.filter(function (cabecalho) {
      return String(cabecalho).charAt(0) !== '_';
    });

  var registros = lerRegistros_(mesa.aba);

  if (receita.dias > 0) {
    registros = filtrarPeloPeriodo_(registros, mesa, receita.dias, 0);
  }

  receita.filtros.forEach(function (filtro) {
    var procurado = normalizarParaComparar_(filtro.valor);
    registros = registros.filter(function (registro) {
      return normalizarParaComparar_(registro[filtro.coluna]) === procurado;
    });
  });

  var truncada = registros.length > RECC_MAXIMO_DA_ANALISE;
  if (truncada) registros = registros.slice(0, RECC_MAXIMO_DA_ANALISE);

  var linhas = registros.map(function (registro) {
    return cabecalhos.map(function (cabecalho) {
      var valor = registro[cabecalho];
      return valor === undefined || valor === null ? '' : valor;
    });
  });

  return { cabecalhos: cabecalhos, linhas: linhas, truncada: truncada };
}

/**
 * Escreve a aba, do zero.
 *
 * A TRAVA: recusa qualquer nome que não comece com `ANALISE_`. É a única
 * proteção que separa esta função de um apagador de base — e por isso ela é a
 * primeira linha, antes de qualquer outra coisa.
 *
 * A aba é REAPROVEITADA quando já existe, em vez de apagada e recriada. Apagar
 * mudaria o identificador interno dela, e todo Power BI ou tabela dinâmica
 * apontado para aquela aba perderia o alvo em silêncio.
 */
function escreverAbaDeAnalise_(nomeDaAba, cabecalhos, linhas) {
  if (String(nomeDaAba || '').indexOf(RECC_PREFIXO_DA_ANALISE) !== 0) {
    throw new Error('Recusado: "' + nomeDaAba + '" não começa com '
      + RECC_PREFIXO_DA_ANALISE + '. Este é o único lugar do sistema que '
      + 'reescreve uma aba inteira, e ele só faz isso nas abas que ele mesmo '
      + 'gera.');
  }

  var planilha = planilhaAtiva_();
  var aba = planilha.getSheetByName(nomeDaAba);
  if (!aba) aba = planilha.insertSheet(nomeDaAba);

  var totalDeLinhas = linhas.length + 1;
  var totalDeColunas = Math.max(1, cabecalhos.length);

  ajustarGrade_(aba, totalDeLinhas, totalDeColunas);
  aba.getRange(1, 1, aba.getMaxRows(), aba.getMaxColumns()).clearContent();

  aba.getRange(1, 1, 1, totalDeColunas).setValues([cabecalhos]);
  aba.getRange(1, 1, 1, totalDeColunas).setFontWeight('bold');
  if (linhas.length) {
    aba.getRange(2, 1, linhas.length, totalDeColunas).setValues(linhas);
  }
  aba.setFrozenRows(1);
  esquecerEstruturaLida_(nomeDaAba);
  return aba;
}

/**
 * Deixa a grade da aba com exatamente o tamanho pedido.
 *
 * Célula vazia também consome o teto de 10 milhões da planilha. Uma aba nova
 * nasce com 1000 por 26 = 26 mil células; três análises pequenas deixadas no
 * tamanho de fábrica gastam mais espaço do que os dados que elas mostram.
 */
function ajustarGrade_(aba, linhas, colunas) {
  var linhasAgora = aba.getMaxRows();
  if (linhas > linhasAgora) aba.insertRowsAfter(linhasAgora, linhas - linhasAgora);
  // Uma linha tem de sobrar: o Google Planilhas não aceita aba sem nenhuma.
  if (linhas < linhasAgora) aba.deleteRows(linhas + 1, linhasAgora - linhas);

  var colunasAgora = aba.getMaxColumns();
  if (colunas > colunasAgora) {
    aba.insertColumnsAfter(colunasAgora, colunas - colunasAgora);
  }
  if (colunas < colunasAgora) {
    aba.deleteColumns(colunas + 1, colunasAgora - colunas);
  }
}

/**
 * Regera todas as análises ligadas, uma atrás da outra.
 *
 * É esta a função para apontar um gatilho de horário no editor do Apps Script
 * (Acionadores › Adicionar acionador › `atualizarAnalisesAgendadas` › Baseado
 * em tempo). Ela é a única do arquivo que NÃO pede senha nem permissão: um
 * gatilho de horário roda sem ninguém logado, e uma senha ali não teria quem
 * digitar.
 *
 * Uma análise que estoura não derruba as outras: o erro é anotado e a próxima
 * segue. Uma aba com nome inválido não pode deixar as outras cinco sem
 * atualizar.
 */
function atualizarAnalisesAgendadas() {
  var mesas = mesasVisiveis_();
  var feitas = [];
  var falharam = [];

  lerRegistros_('ANALISES').forEach(function (linha) {
    var receita = analiseDaLinha_(linha, mesas);
    if (!receita.ativo) return;

    try {
      var mesa = mesaPeloId_(receita.mesaId);
      var conteudo = montarConteudoDaAnalise_(receita, mesa);
      escreverAbaDeAnalise_(receita.aba, conteudo.cabecalhos, conteudo.linhas);
      atualizarRegistro_('ANALISES', linha.__id, {
        GeradaEm: new Date(),
        GeradaPor: '',
        Linhas: conteudo.linhas.length
      });
      feitas.push(receita.aba + ' (' + conteudo.linhas.length + ')');
    } catch (erro) {
      falharam.push(receita.nome + ': ' + erro.message);
      Logger.log('Análise ' + receita.nome + ' falhou: ' + erro.message);
    }
  });

  registrarAuditoria_('analise.agendada', 'ANALISES', '',
    feitas.length + ' gerada(s)'
    + (falharam.length ? ', ' + falharam.length + ' com erro' : ''));

  return { geradas: feitas, falharam: falharam };
}
