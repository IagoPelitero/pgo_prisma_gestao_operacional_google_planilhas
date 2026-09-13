/**
 * ============================================================================
 * PGO — Casos.gs · registrar, editar e ocultar um caso
 * ============================================================================
 * É aqui que o dado entra na planilha. Três coisas acontecem, nesta ordem, e
 * nenhuma pode ser pulada:
 *
 *   1. confere a permissão      quem não pode criar, não cria — mesmo que a
 *                               tela tenha mostrado o botão
 *   2. valida os valores        campo a campo, contra a definição da aba
 *                               CAMPOS, no SERVIDOR
 *   3. grava                    pela porta única, que formata a linha antes
 *
 * A tela também valida, para a pessoa não descobrir o erro só depois de
 * clicar. Mas a validação da tela é cortesia; a que conta é esta.
 * ============================================================================
 */

/**
 * Registra um caso novo.
 *
 * Devolve o Id gerado. A data e a hora de entrada são preenchidas pelo
 * SERVIDOR quando a mesa declara essas colunas e a tela não mandou nada —
 * deixar o relógio do navegador decidir daria horários de fusos diferentes na
 * mesma base.
 */
function cadastrarCaso(idDaMesa, valores) {
  var quem = exigirPermissao_(RECC_ACOES.CRIAR);
  var mesa = mesaPeloId_(idDaMesa);

  var paraGravar = validarValores_(mesa.id, valores || {}, quem);
  preencherEntradaAutomatica_(mesa, paraGravar);
  preencherResponsavelAutomatico_(mesa, paraGravar, quem);

  var gravado = inserirRegistro_(mesa.aba, paraGravar, { origem: RECC_ORIGEM_SISTEMA });
  registrarAuditoria_('caso.criar', mesa.aba, gravado.__id, mesa.nome);

  return { id: gravado.__id, mesa: mesa.nome, aba: mesa.aba };
}

/**
 * Altera um caso existente.
 *
 * A data de entrada NÃO é reescrita: histórico não muda sozinho. Se o campo
 * vier na alteração, ele é respeitado — mas o preenchimento automático só age
 * na criação.
 */
function editarCaso(idDaMesa, idDoCaso, valores) {
  var quem = exigirPermissao_(RECC_ACOES.EDITAR);
  var mesa = mesaPeloId_(idDaMesa);

  var alvo = converterParaIdentificador_(idDoCaso);
  if (!alvo) throw new Error('Informe qual caso deve ser alterado.');

  var atual = buscarRegistros_(mesa.aba, 'Id', alvo, 1)[0];
  if (!atual) {
    throw new Error('O caso ' + alvo + ' não existe na mesa ' + mesa.nome + '.');
  }
  exigirAlcanceSobre_(atual, mesa, quem);

  var paraGravar = validarValores_(mesa.id, valores || {}, quem);
  atualizarRegistro_(mesa.aba, alvo, paraGravar);
  registrarAuditoria_('caso.editar', mesa.aba, alvo, mesa.nome);

  return { id: alvo, mesa: mesa.nome };
}

/**
 * Troca só a situação de um caso.
 *
 * Existe separado de `editarCaso` porque é o gesto mais frequente da
 * operação: o analista atende, muda a situação e segue. Abrir o formulário
 * inteiro de trinta e cinco campos para mexer num só é atrito que se paga
 * dezenas de vezes por dia.
 *
 * Segue a permissão de EDITAR: trocar a situação é editar o caso.
 */
function alterarSituacaoDoCaso(idDaMesa, idDoCaso, situacaoNova) {
  var quem = exigirPermissao_(RECC_ACOES.EDITAR);
  var mesa = mesaPeloId_(idDaMesa);
  var alvo = converterParaIdentificador_(idDoCaso);

  if (!mesa.colunaDoStatus) {
    throw new Error('A mesa ' + mesa.nome + ' não declarou qual coluna guarda ' +
      'a situação, então não há o que trocar. Isso se ajusta em Configurações.');
  }

  var atual = buscarRegistros_(mesa.aba, 'Id', alvo, 1)[0];
  if (!atual) {
    throw new Error('O caso ' + alvo + ' não existe na mesa ' + mesa.nome + '.');
  }
  exigirAlcanceSobre_(atual, mesa, quem);

  var escolhida = String(situacaoNova || '').trim();
  var conhecidas = situacoesDaMesa_(mesa);
  var achada = null;
  conhecidas.forEach(function (uma) {
    if (normalizarParaComparar_(uma.gravadoComo)
      === normalizarParaComparar_(escolhida)) achada = uma;
  });
  if (!achada) {
    throw new Error('A situação "' + escolhida + '" não existe na mesa ' +
      mesa.nome + '. As situações dela são: ' + conhecidas.map(function (uma) {
        return uma.gravadoComo;
      }).join(', ') + '.');
  }

  var antes = String(atual[mesa.colunaDoStatus] || '') || 'sem situação';
  var alteracao = {};
  alteracao[mesa.colunaDoStatus] = achada.gravadoComo;

  // Concluir preenche a data de finalização quando a mesa tem essa coluna e
  // ela ainda está vazia — é o que a operação faria à mão logo em seguida.
  if (mesa.colunaDaFinalizacao && !atual[mesa.colunaDaFinalizacao]
    && normalizarParaComparar_(achada.gravadoComo).indexOf('conclu') === 0) {
    alteracao[mesa.colunaDaFinalizacao] = new Date();
  }

  atualizarRegistro_(mesa.aba, alvo, alteracao);
  registrarAuditoria_('caso.status', mesa.aba, alvo,
    'de "' + antes + '" para "' + achada.gravadoComo + '"');

  return { id: alvo, situacao: achada.gravadoComo, tom: achada.tom };
}

/**
 * As situações que a mesa oferece, para o diálogo de troca.
 *
 * A situação que o caso tem hoje vem marcada. Se ela tiver sido desligada
 * depois, continua aparecendo — a pessoa precisa entender o que o caso tem,
 * mesmo que não possa escolher aquilo de novo.
 */
function situacoesParaTrocar(idDaMesa, idDoCaso) {
  var quem = exigirPermissao_(RECC_ACOES.EDITAR);
  var mesa = mesaPeloId_(idDaMesa);

  var atual = buscarRegistros_(mesa.aba, 'Id',
    converterParaIdentificador_(idDoCaso), 1)[0];
  if (!atual) {
    throw new Error('O caso ' + idDoCaso + ' não existe na mesa ' + mesa.nome + '.');
  }
  exigirAlcanceSobre_(atual, mesa, quem);

  var hoje = mesa.colunaDoStatus
    ? String(atual[mesa.colunaDoStatus] || '') : '';
  var opcoes = situacoesDaMesa_(mesa).map(function (uma) {
    return { valor: uma.gravadoComo, rotulo: uma.nome, tom: uma.tom };
  });

  var conhecida = opcoes.some(function (uma) {
    return normalizarParaComparar_(uma.valor) === normalizarParaComparar_(hoje);
  });
  if (hoje && !conhecida) {
    opcoes.unshift({ valor: hoje, rotulo: hoje + ' (desligada)', tom: 'neutro' });
  }

  return { atual: hoje, opcoes: opcoes };
}

/**
 * Os valores de um caso, prontos para o formulário de edição.
 *
 * Devolve pelo CHAVE TÉCNICA do campo, que é como o formulário identifica
 * cada caixa — o mesmo formato que `cadastrarCaso` recebe de volta.
 */
function casoParaEditar(idDaMesa, idDoCaso) {
  var quem = exigirPermissao_(RECC_ACOES.EDITAR);
  var mesa = mesaPeloId_(idDaMesa);

  var registro = buscarRegistros_(mesa.aba, 'Id',
    converterParaIdentificador_(idDoCaso), 1)[0];
  if (!registro) {
    throw new Error('O caso ' + idDoCaso + ' não existe na mesa ' + mesa.nome + '.');
  }
  exigirAlcanceSobre_(registro, mesa, quem);

  var estrutura = estruturaDaAba_(mesa.aba);
  var valores = {};

  camposAtivosDaMesa_(mesa.id).forEach(function (campo) {
    var posicao = posicaoDaColuna_(estrutura, campo.Cabecalho);
    if (posicao < 0) return;
    valores[String(campo.ChaveTecnica)] =
      paraTexto_(registro[campo.Cabecalho], estrutura.tipos[posicao]);
  });

  return { id: registro.__id, mesa: mesa.nome, valores: valores };
}

/** Tira o caso da tela. A linha permanece na planilha, e volta editando _Visivel. */
function ocultarCaso(idDaMesa, idDoCaso) {
  var quem = exigirPermissao_(RECC_ACOES.OCULTAR);
  var mesa = mesaPeloId_(idDaMesa);
  var alvo = converterParaIdentificador_(idDoCaso);

  var atual = buscarRegistros_(mesa.aba, 'Id', alvo, 1)[0];
  if (!atual) {
    throw new Error('O caso ' + alvo + ' não existe na mesa ' + mesa.nome + '.');
  }
  exigirAlcanceSobre_(atual, mesa, quem);

  ocultarRegistro_(mesa.aba, alvo, quem.usuario.Id);
  registrarAuditoria_('caso.ocultar', mesa.aba, alvo, mesa.nome);
  return true;
}

/**
 * O escopo do nível também vale para escrever, não só para ler.
 *
 * Quem enxerga só os próprios casos não pode editar o caso de outra pessoa
 * mandando o Id direto — a tela não ofereceria o botão, mas a chamada existe.
 */
function exigirAlcanceSobre_(registro, mesa, quem) {
  var alcance = filtrarPeloAlcance_([registro], mesa.aba, quem);
  if (!alcance.length) {
    throw new Error('Este caso está fora do seu alcance. Seu nível enxerga ' +
      'apenas os casos com escopo ' + quem.permissoes.escopo + '.');
  }
}

/** Data e hora de entrada, decididas pelo servidor, só quando faltam. */
function preencherEntradaAutomatica_(mesa, paraGravar) {
  var agora = new Date();
  if (mesa.colunaDaData && !paraGravar[mesa.colunaDaData]) {
    paraGravar[mesa.colunaDaData] =
      Utilities.formatDate(agora, RECC_FUSO_HORARIO, 'dd/MM/yyyy');
  }
  if (mesa.colunaDaHora && !paraGravar[mesa.colunaDaHora]) {
    paraGravar[mesa.colunaDaHora] =
      Utilities.formatDate(agora, RECC_FUSO_HORARIO, 'HH:mm');
  }
}

/** O analista do caso é quem o registrou, quando a tela não disse outro. */
function preencherResponsavelAutomatico_(mesa, paraGravar, quem) {
  var estrutura = estruturaDaAba_(mesa.aba);
  var coluna = colunaDoResponsavel_(estrutura);
  if (coluna && !paraGravar[coluna]) paraGravar[coluna] = quem.usuario.Nome;
}

// ============================================================================
// O SELO DA SUSEP
// ============================================================================

/**
 * A situação de uma SUSEP, para a tela mostrar no instante em que ela é
 * digitada.
 *
 * Três respostas possíveis, e as três são informação — inclusive a terceira:
 *
 *   BLOQUEADA        está na aba SUSEP_BLOQUEADAS
 *   OK               está no cadastro de canais, com o segmento dela
 *   NAO_ENCONTRADA   não está em lugar nenhum. Isso NÃO é erro nem vazio:
 *                    é uma corretora que o cadastro não conhece, e a operação
 *                    precisa saber disso antes de seguir
 */
function consultarSusep(susep) {
  exigirPermissao_(RECC_ACOES.CRIAR);

  var procurada = converterParaIdentificador_(susep);
  if (!procurada) {
    return { situacao: 'VAZIA', mensagem: 'Digite a SUSEP.' };
  }

  var bloqueada = lerRegistros_('SUSEP_BLOQUEADAS').filter(function (linha) {
    return converterParaIdentificador_(linha.SUSEP) === procurada;
  })[0];

  if (bloqueada) {
    return {
      situacao: 'BLOQUEADA',
      susep: procurada,
      corretora: String(bloqueada.NomeCorretora || ''),
      motivo: String(bloqueada.Motivo || ''),
      mensagem: 'SUSEP bloqueada'
        + (bloqueada.NomeCorretora ? ' — ' + bloqueada.NomeCorretora : '')
    };
  }

  var canal = lerRegistros_('CANAIS').filter(function (linha) {
    return converterParaIdentificador_(linha.SUSEP) === procurada;
  })[0];

  if (!canal) {
    return {
      situacao: 'NAO_ENCONTRADA',
      susep: procurada,
      segmento: 'Não encontrado',
      mensagem: 'SUSEP não encontrada no cadastro de canais'
    };
  }

  return {
    situacao: 'OK',
    susep: procurada,
    corretora: String(canal.Corretora || ''),
    canal: String(canal.Canal || ''),
    segmento: String(canal.Segmento || 'Não encontrado'),
    mensagem: 'SUSEP liberada'
  };
}
