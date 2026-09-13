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
