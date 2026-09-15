/**
 * ============================================================================
 * PGO — Casos.gs · o caso, do formulário à busca
 * ============================================================================
 * A vida de um caso em três tempos: as perguntas que o formulário faz,
 * a gravação na planilha, e como achá-lo meses depois.
 *
 * O QUE TEM AQUI DENTRO, nesta ordem:
 *
 *   1. O MOTOR DO FORMULÁRIO   (era Campos.gs)
 *   2. REGISTRAR, EDITAR E OCULTAR   (era Casos.gs)
 *   3. ACHAR UM CASO QUE A FILA NÃO MOSTRA MAIS   (era Busca.gs)
 *
 * Procure pelo banner com ##### para pular de uma seção à outra.
 * ============================================================================
 */

/* ############################################################################
   #
   #  SEÇÃO 1 de 3 · O MOTOR DO FORMULÁRIO
   #
   #  Era o arquivo Back-End/Campos.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * ============================================================================
 * PGO — Campos.gs · o motor do formulário
 * ============================================================================
 * O formulário NÃO está escrito em lugar nenhum do código. Ele é montado a
 * partir da aba CAMPOS, campo a campo, toda vez que a tela abre.
 *
 * É isso que permite ao administrador criar, esconder, reordenar e mascarar
 * campo sem programador. E é isso que obriga o servidor a revalidar tudo: se o
 * formulário é dado, o que chega da tela também é — e dado não se confia.
 *
 * O caminho de um valor, da tela até a célula:
 *
 *   tela          000.123.456-78     como a pessoa digita, com máscara
 *   servidor      00012345678        só dígitos, conferido contra a máscara
 *   célula        00012345678        texto, formatado ANTES de gravar
 *
 * A máscara é aparência. O que cruza com outro sistema são os dígitos.
 * ============================================================================
 */

/**
 * O formulário de uma mesa, pronto para a tela desenhar.
 *
 * Já vem filtrado pelo nível de acesso de quem pediu: campo marcado como
 * oculto para o nível não aparece na resposta — e não aparecer na resposta é
 * diferente de vir escondido no HTML. Esconder no HTML é enfeite; quem não
 * pode ver, não recebe.
 */
function formularioDaMesa(idDaMesa) {
  var quem = exigirPermissao_(RECC_ACOES.CRIAR);
  var mesa = mesaPeloId_(idDaMesa);

  var porSecao = {};
  var ordemDasSecoes = [];

  camposAtivosDaMesa_(mesa.id).forEach(function (campo) {
    var visibilidade = visibilidadeDoCampo_(quem.permissoes, campo.ChaveTecnica);
    if (visibilidade === RECC_VISIBILIDADE.OCULTO) return;

    var secao = String(campo.Secao || 'Geral');
    if (!porSecao[secao]) {
      porSecao[secao] = [];
      ordemDasSecoes.push(secao);
    }
    porSecao[secao].push(campoParaATela_(campo, mesa.id, visibilidade));
  });

  return {
    mesa: mesa,
    secoes: ordemDasSecoes.map(function (nome) {
      return { nome: nome, campos: porSecao[nome] };
    })
  };
}

/** Os campos ativos de uma mesa, na ordem escolhida pelo administrador. */
function camposAtivosDaMesa_(idDaMesa) {
  var alvo = converterParaIdentificador_(idDaMesa);
  return lerRegistros_('CAMPOS')
    .filter(function (campo) {
      return converterParaIdentificador_(campo.MesaId) === alvo
        && normalizarParaComparar_(campo.Ativo) === 'sim';
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    });
}

/** Uma linha de CAMPOS vira a descrição que a tela sabe desenhar. */
function campoParaATela_(campo, idDaMesa, visibilidade) {
  var configuracao = lerConfiguracaoDoCampo_(campo);
  return {
    chave: String(campo.ChaveTecnica),
    cabecalho: String(campo.Cabecalho),
    rotulo: String(campo.Rotulo || campo.Cabecalho),
    descricao: String(campo.Descricao || ''),
    tipo: String(campo.TipoCampo || 'texto'),
    secao: String(campo.Secao || 'Geral'),
    mascara: String(campo.Mascara || ''),
    obrigatorio: normalizarParaComparar_(campo.Obrigatorio) === 'sim',
    somenteLeitura: visibilidade === RECC_VISIBILIDADE.LEITURA,
    valorPadrao: String(campo.ValorPadrao || ''),
    largura: Number(configuracao.largura) || 1,
    opcoes: opcoesDoCampo_(configuracao, idDaMesa)
  };
}

/**
 * A coluna Configuracao guarda um JSON.
 * Vazia ou quebrada devolve objeto vazio: uma configuração com defeito não
 * pode derrubar o formulário inteiro — o campo apenas perde os extras.
 */
function lerConfiguracaoDoCampo_(campo) {
  var texto = String(campo.Configuracao || '').trim();
  if (!texto) return {};
  try {
    var lido = JSON.parse(texto);
    return lido && typeof lido === 'object' ? lido : {};
  } catch (erro) {
    Logger.log('Configuração inválida no campo "' + campo.Cabecalho + '": ' +
      erro.message);
    return {};
  }
}

/**
 * As opções de um seletor. Três origens possíveis:
 *
 *   { "catalogo": "STATUS" }      da aba CATALOGO, da mesa ou global
 *   { "listaDe": "usuarios" }     de um cadastro: usuários, produtos, canais
 *   { "opcoes": ["Sim", "Não"] }  lista escrita à mão na configuração
 */
function opcoesDoCampo_(configuracao, idDaMesa) {
  if (Array.isArray(configuracao.opcoes)) {
    return configuracao.opcoes.map(function (opcao) {
      return { valor: String(opcao), rotulo: String(opcao) };
    });
  }
  if (configuracao.listaDe) return opcoesDeUmCadastro_(configuracao.listaDe);
  if (!configuracao.catalogo) return [];

  var tipo = normalizarParaComparar_(configuracao.catalogo);
  var daMesa = converterParaIdentificador_(idDaMesa);

  return lerRegistros_('CATALOGO')
    .filter(function (item) {
      if (normalizarParaComparar_(item.Tipo) !== tipo) return false;
      if (normalizarParaComparar_(item.Ativo) !== 'sim') return false;
      // Item sem mesa é global e serve a todas; com mesa, só à dela.
      var mesaDoItem = converterParaIdentificador_(item.MesaId);
      return !mesaDoItem || mesaDoItem === daMesa;
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (item) {
      return {
        valor: String(item.Nome),
        rotulo: String(item.Rotulo || item.Nome),
        codigo: String(item.Codigo || '')
      };
    });
}

/**
 * Opções vindas de um cadastro, e não do catálogo.
 *
 * O caso que motivou isto é o analista: a lista de quem atende já existe na
 * aba USUARIOS, e repetir os mesmos nomes no catálogo criaria duas verdades
 * sobre a mesma coisa — bastaria alguém sair da equipe para as duas
 * divergirem.
 */
function opcoesDeUmCadastro_(qualCadastro) {
  var cadastro = String(qualCadastro).toLowerCase();

  if (cadastro === 'usuarios') {
    return lerRegistros_('USUARIOS')
      .filter(function (usuario) {
        return normalizarParaComparar_(usuario.Ativo) === 'sim';
      })
      .map(function (usuario) { return String(usuario.Nome); })
      .sort()
      .map(function (nome) { return { valor: nome, rotulo: nome }; });
  }

  if (cadastro === 'produtos') {
    return lerRegistros_('PRODUTOS').map(function (produto) {
      return {
        valor: String(produto.Produto),
        rotulo: String(produto.Produto),
        codigo: String(produto.CodigoProduto || '')
      };
    });
  }

  if (cadastro === 'canais') {
    return lerRegistros_('CANAIS').map(function (canal) {
      return { valor: String(canal.Nome), rotulo: String(canal.Nome) };
    });
  }

  throw new Error('Cadastro desconhecido em listaDe: "' + qualCadastro + '". ' +
    'Os cadastros são usuarios, produtos e canais.');
}

function mesaPeloId_(idDaMesa) {
  var alvo = converterParaIdentificador_(idDaMesa);
  var mesas = mesasVisiveis_();
  for (var i = 0; i < mesas.length; i++) {
    if (converterParaIdentificador_(mesas[i].id) === alvo) return mesas[i];
  }
  throw new Error('Mesa "' + idDaMesa + '" não existe ou está desativada.');
}

// ============================================================================
// VALIDAÇÃO — no servidor, sempre
// ============================================================================

/**
 * Confere o que veio da tela e devolve os valores prontos para gravar,
 * com as chaves iguais aos cabeçalhos das colunas.
 *
 * Junta todos os problemas antes de reclamar. Devolver um erro por vez faria a
 * pessoa corrigir, salvar, descobrir o segundo, corrigir, salvar de novo.
 */
function validarValores_(idDaMesa, valoresDaTela, quem) {
  var mesa = mesaPeloId_(idDaMesa);
  var problemas = [];
  var paraGravar = {};

  camposAtivosDaMesa_(mesa.id).forEach(function (campo) {
    var visibilidade = visibilidadeDoCampo_(quem.permissoes, campo.ChaveTecnica);

    // Campo que a pessoa não pode ver ou não pode editar é IGNORADO, mesmo
    // que a tela mande um valor. A tela é do lado de lá; ela não decide.
    if (visibilidade !== RECC_VISIBILIDADE.EDICAO) return;

    var descricao = campoParaATela_(campo, mesa.id, visibilidade);
    var bruto = valoresDaTela[descricao.chave];
    if (bruto === undefined) bruto = valoresDaTela[descricao.cabecalho];
    if (bruto === undefined || bruto === null) bruto = '';

    var problema = conferirCampo_(descricao, bruto);
    if (problema) {
      problemas.push({ campo: descricao.chave, rotulo: descricao.rotulo, erro: problema });
      return;
    }
    if (String(bruto).trim() !== '') paraGravar[descricao.cabecalho] = bruto;
  });

  if (problemas.length) {
    var erro = new Error('Confira ' + problemas.length + ' campo(s): '
      + problemas.map(function (p) { return p.rotulo + ' — ' + p.erro; }).join('; '));
    erro.problemas = problemas;
    throw erro;
  }
  return paraGravar;
}

/** Devolve a mensagem do problema, ou string vazia quando está tudo certo. */
function conferirCampo_(campo, valor) {
  var texto = String(valor === null || valor === undefined ? '' : valor).trim();

  if (texto === '') {
    return campo.obrigatorio ? 'é obrigatório' : '';
  }

  if (campo.tipo === 'identificador' || campo.tipo === 'documento') {
    var digitos = converterParaIdentificador_(texto);
    if (!digitos) return 'precisa ter ao menos um dígito';
    var esperados = quantosDigitosAMascaraPede_(campo.mascara);
    if (esperados && digitos.replace(/;/g, '').length !== esperados) {
      return 'precisa ter ' + esperados + ' dígitos (veio com '
        + digitos.replace(/;/g, '').length + ')';
    }
    return '';
  }

  if (campo.tipo === 'numero' || campo.tipo === 'moeda' || campo.tipo === 'percentual') {
    if (converterParaNumero_(texto) === '') return 'precisa ser um número';
    return '';
  }

  if (campo.tipo === 'data') {
    var data = converterParaData_(texto);
    if (!data) return 'precisa ser uma data no formato dd/mm/aaaa';
    if (dataEstaNoFuturo_(data)) {
      return 'não pode ser no futuro — o caso descreve algo que já aconteceu';
    }
    return '';
  }

  if (campo.tipo === 'hora') {
    if (!converterParaHora_(texto)) return 'precisa ser uma hora no formato hh:mm';
    return '';
  }

  if (campo.tipo === 'email' && texto.indexOf('@') < 0) {
    return 'precisa ser um e-mail';
  }

  // Seletor com lista VAZIA aceita o que for digitado. Um cadastro ainda não
  // preenchido não pode travar o campo: sem esta linha, escolher "produtos"
  // como origem antes de cadastrar produto nenhum deixaria o campo
  // impossível de preencher e sem explicação na tela.
  if (campo.tipo === 'seletor' && campo.opcoes.length) {
    for (var i = 0; i < campo.opcoes.length; i++) {
      if (normalizarParaComparar_(campo.opcoes[i].valor) === normalizarParaComparar_(texto)) {
        return '';
      }
    }
    return 'não é uma das opções da lista';
  }

  return '';
}

/** Numa máscara, cada zero é um dígito: 000.000.000-00 pede 11. */
function quantosDigitosAMascaraPede_(mascara) {
  var zeros = String(mascara || '').match(/0/g);
  return zeros ? zeros.length : 0;
}

/**
 * Hoje em São Paulo, e não em UTC.
 * O Apps Script roda em UTC: depois das 21 h, "hoje" viraria amanhã e o
 * sistema recusaria um caso registrado à noite.
 */
function dataEstaNoFuturo_(data) {
  var agora = new Date();
  var hojeAqui = Utilities.formatDate(agora, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
  var aDataDela = Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
  return aDataDela > hojeAqui;
}

/* ############################################################################
   #
   #  SEÇÃO 2 de 3 · REGISTRAR, EDITAR E OCULTAR
   #
   #  Era o arquivo Back-End/Casos.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

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

/* ############################################################################
   #
   #  SEÇÃO 3 de 3 · ACHAR UM CASO QUE A FILA NÃO MOSTRA MAIS
   #
   #  Era o arquivo Back-End/Busca.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

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
