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
 * O formulário de um canal, pronto para a tela desenhar.
 *
 * Já vem filtrado pelo nível de acesso de quem pediu: campo marcado como
 * oculto para o nível não aparece na resposta — e não aparecer na resposta é
 * diferente de vir escondido no HTML. Esconder no HTML é enfeite; quem não
 * pode ver, não recebe.
 */
function formularioDoCanal(idDoCanal) {
  var quem = exigirPermissao_(RECC_ACOES.CRIAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var porSecao = {};
  var ordemDasSecoes = [];

  camposAtivosDoCanal_(canal.id).forEach(function (campo) {
    var visibilidade = visibilidadeDoCampo_(quem.permissoes, campo.ChaveTecnica);
    if (visibilidade === RECC_VISIBILIDADE.OCULTO) return;

    var secao = String(campo.Secao || 'Geral');
    if (!porSecao[secao]) {
      porSecao[secao] = [];
      ordemDasSecoes.push(secao);
    }
    porSecao[secao].push(campoParaATela_(campo, canal.id, visibilidade, quem));
  });

  return {
    canal: canal,
    secoes: ordemDasSecoes.map(function (nome) {
      return { nome: nome, campos: porSecao[nome] };
    })
  };
}

/** Os campos ativos de um canal, na ordem escolhida pelo administrador. */
function camposAtivosDoCanal_(idDoCanal) {
  var alvo = converterParaIdentificador_(idDoCanal);
  return lerRegistros_('CAMPOS')
    .filter(function (campo) {
      return converterParaIdentificador_(campo.CanalId) === alvo
        && normalizarParaComparar_(campo.Ativo) === 'sim';
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    });
}

/** Uma linha de CAMPOS vira a descrição que a tela sabe desenhar. */
function campoParaATela_(campo, idDoCanal, visibilidade, quem) {
  var configuracao = lerConfiguracaoDoCampo_(campo);

  // O campo pode vir TRAVADO por dois motivos diferentes, e vale distinguir:
  // o nível pode dar só leitura (visibilidade), ou o campo pode ser de quem
  // não tem autorização para mexer nele — é o caso do Analista, que um
  // analista não troca para o nome de outra pessoa.
  var travadoPeloCargo = campoTravadoParaMim_(configuracao, quem);

  return {
    chave: String(campo.ChaveTecnica),
    cabecalho: String(campo.Cabecalho),
    rotulo: String(campo.Rotulo || campo.Cabecalho),
    descricao: String(campo.Descricao || ''),
    tipo: String(campo.TipoCampo || 'texto'),
    secao: String(campo.Secao || 'Geral'),
    mascara: String(campo.Mascara || ''),
    obrigatorio: normalizarParaComparar_(campo.Obrigatorio) === 'sim',
    somenteLeitura: visibilidade === RECC_VISIBILIDADE.LEITURA || travadoPeloCargo,
    travadoPeloCargo: travadoPeloCargo,
    valorPadrao: valorPadraoResolvido_(campo.ValorPadrao, quem),
    // Aparece só quando outro campo estiver com um valor específico. Guardado
    // como { campo: 'chave', valor: 'TEXTO' } — ver o formulário na tela.
    mostrarSe: configuracao.mostrarSe || null,
    largura: Number(configuracao.largura) || 1,
    opcoes: opcoesDoCampo_(configuracao, idDoCanal)
  };
}

/**
 * O valor padrão, com os atalhos que dependem de QUEM e de QUANDO resolvidos.
 *
 * Um valor padrão escrito à mão não sabe que dia é hoje. Estes três atalhos
 * sabem, e o servidor é quem os resolve — não a tela. O relógio do navegador
 * é o da máquina de quem está olhando, e uma data de recepção com o fuso
 * errado só aparece semanas depois, num relatório que não fecha.
 *
 *   @HOJE   a data de hoje          (dd/MM/yyyy)
 *   @AGORA  a data e a hora de agora (dd/MM/yyyy HH:mm)
 *   @EU     o nome de quem está cadastrando
 *
 * Qualquer outro texto passa inteiro, como sempre passou.
 */
function valorPadraoResolvido_(valorPadrao, quem) {
  var texto = String(valorPadrao || '').trim();
  if (texto.charAt(0) !== '@') return texto;

  var agora = new Date();
  switch (texto.toUpperCase()) {
    case '@HOJE':
      return Utilities.formatDate(agora, RECC_FUSO_HORARIO, 'dd/MM/yyyy');
    case '@AGORA':
      return Utilities.formatDate(agora, RECC_FUSO_HORARIO, 'dd/MM/yyyy HH:mm');
    case '@EU':
      return quem && quem.usuario ? String(quem.usuario.Nome || '') : '';
    default:
      return texto;
  }
}

/**
 * Este campo está travado para esta pessoa?
 *
 * O pedido da operação: o Analista já vem preenchido com o nome de quem está
 * cadastrando e, se o cargo for analista, não pode ser trocado — cadastrar em
 * nome de outra pessoa é coisa de quem coordena.
 *
 * A trava olha o CARGO, e quem a desfaz é uma AÇÃO do nível (editar). São
 * coisas diferentes de propósito: cargo diz o que a pessoa faz, nível diz o
 * que ela pode. Um analista que precise cadastrar para a equipe ganha a ação,
 * sem precisar trocar de cargo.
 */
function campoTravadoParaMim_(configuracao, quem) {
  var cargos = configuracao.travaPara;
  if (!Array.isArray(cargos) || !cargos.length) return false;
  if (!quem || !quem.cadastrado) return false;

  // Quem pode editar caso dos outros não é travado por cargo nenhum.
  if (podeFazer_(quem.permissoes, RECC_ACOES.EDITAR)
    && quem.permissoes.escopo !== RECC_ESCOPOS.PROPRIOS) {
    return false;
  }

  // COMPARA POR COMEÇO, não por igualdade.
  //
  // Os cargos da operação são "Analista RET" e "Analista Mesa Diamante", não
  // "Analista" seco. Uma comparação exata não travaria ninguém — e não daria
  // erro nenhum: o campo simplesmente ficaria editável, e só se descobriria
  // quando alguém cadastrasse em nome de outra pessoa.
  //
  // Por começo, "Analista" pega os três cargos de analista de hoje e pegará
  // o "Analista Pleno" que vier amanhã, sem ninguém precisar lembrar de
  // acrescentá-lo aqui.
  var meuCargo = normalizarParaComparar_(quem.cargo);
  if (!meuCargo) return false;
  return cargos.some(function (cargo) {
    var alvo = normalizarParaComparar_(cargo);
    return alvo !== '' && meuCargo.indexOf(alvo) === 0;
  });
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
 *   { "catalogo": "STATUS" }      da aba CATALOGO, do canal ou global
 *   { "listaDe": "usuarios" }     de um cadastro: usuários, produtos, canais
 *   { "opcoes": ["Sim", "Não"] }  lista escrita à mão na configuração
 */
function opcoesDoCampo_(configuracao, idDoCanal) {
  if (Array.isArray(configuracao.opcoes)) {
    return configuracao.opcoes.map(function (opcao) {
      return { valor: String(opcao), rotulo: String(opcao) };
    });
  }
  if (configuracao.listaDe) return opcoesDeUmCadastro_(configuracao.listaDe);
  if (!configuracao.catalogo) return [];

  var tipo = normalizarParaComparar_(configuracao.catalogo);
  var doCanal = converterParaIdentificador_(idDoCanal);

  return lerRegistros_('CATALOGO')
    .filter(function (item) {
      if (normalizarParaComparar_(item.Tipo) !== tipo) return false;
      if (normalizarParaComparar_(item.Ativo) !== 'sim') return false;
      // Item sem canal é global e serve a todas; com canal, só à dela.
      var canalDoItem = converterParaIdentificador_(item.CanalId);
      return !canalDoItem || canalDoItem === doCanal;
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
    return lerRegistros_('CORRETORAS').map(function (canal) {
      return { valor: String(canal.Nome), rotulo: String(canal.Nome) };
    });
  }

  throw new Error('Cadastro desconhecido em listaDe: "' + qualCadastro + '". ' +
    'Os cadastros são usuarios, produtos e canais.');
}

function canalPeloId_(idDoCanal) {
  var alvo = converterParaIdentificador_(idDoCanal);
  var canais = canaisVisiveis_();
  for (var i = 0; i < canais.length; i++) {
    if (converterParaIdentificador_(canais[i].id) === alvo) return canais[i];
  }
  throw new Error('Canal "' + idDoCanal + '" não existe ou está desativado.');
}

/**
 * O canal pedido, SE esta pessoa puder vê-lo.
 *
 * É esta que as telas usam, e não a de cima. A tela não oferecer o canal na
 * lista não protege nada: a chamada ao servidor existe, e basta mandar outro
 * Id. Quem decide é o servidor, sempre — a tela só escolhe o que mostrar.
 *
 * A recusa diz quais canais a pessoa TEM, porque "sem acesso" sozinho manda
 * procurar no lugar errado: quase sempre é o nível que ficou com o canal
 * errado marcado, e quem lê a mensagem precisa saber disso.
 */
function canalQueEuPossoVer_(idDoCanal, quem) {
  var canal = canalPeloId_(idDoCanal);
  var meus = canaisQueEuVejo_(quem);
  var alcanca = meus.some(function (um) {
    return converterParaIdentificador_(um.id)
      === converterParaIdentificador_(canal.id);
  });
  if (alcanca) return canal;

  throw new Error('O seu nível de acesso não enxerga o canal "' + canal.nome
    + '". ' + (meus.length
      ? 'Ele enxerga: ' + meus.map(function (um) { return um.nome; }).join(', ') + '.'
      : 'Ele não enxerga canal nenhum — peça a um administrador para ajustar '
        + 'o nível em Configurações › Níveis de acesso.'));
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
function validarValores_(idDoCanal, valoresDaTela, quem) {
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var problemas = [];
  var paraGravar = {};

  camposAtivosDoCanal_(canal.id).forEach(function (campo) {
    var visibilidade = visibilidadeDoCampo_(quem.permissoes, campo.ChaveTecnica);

    // Campo que a pessoa não pode ver ou não pode editar é IGNORADO, mesmo
    // que a tela mande um valor. A tela é do lado de lá; ela não decide.
    if (visibilidade !== RECC_VISIBILIDADE.EDICAO) return;

    var descricao = campoParaATela_(campo, canal.id, visibilidade, quem);
    var bruto = valoresDaTela[descricao.chave];
    if (bruto === undefined) bruto = valoresDaTela[descricao.cabecalho];
    if (bruto === undefined || bruto === null) bruto = '';

    var problema = conferirCampo_(descricao, bruto);
    if (problema) {
      problemas.push({ campo: descricao.chave, rotulo: descricao.rotulo, erro: problema });
      return;
    }
    if (String(bruto).trim() === '') return;

    // Um seletor pode alimentar DUAS colunas. É o caso do produto, que a
    // operação escolhe como "1101 - VIDA INDIVIDUAL" e a planilha guarda
    // separado: o código numa coluna, o nome na outra.
    //
    // Escolher uma coisa e gravar duas é de propósito. Uma caixa só é menos
    // uma chance de digitar o código de um produto e o nome de outro; e as
    // colunas separadas são o que deixa o painel agrupar por código e o
    // relatório mostrar o nome.
    var separa = lerConfiguracaoDoCampo_(campo).separaEm;
    if (separa && separa.codigo && separa.nome) {
      var partes = separarCodigoENome_(bruto);
      paraGravar[separa.codigo] = partes.codigo;
      paraGravar[separa.nome] = partes.nome;
      return;
    }

    paraGravar[descricao.cabecalho] = bruto;
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
 * SERVIDOR quando o canal declara essas colunas e a tela não mandou nada —
 * deixar o relógio do navegador decidir daria horários de fusos diferentes na
 * mesma base.
 */
function cadastrarCaso(idDoCanal, valores) {
  var quem = exigirPermissao_(RECC_ACOES.CRIAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var paraGravar = validarValores_(canal.id, valores || {}, quem);
  preencherEntradaAutomatica_(canal, paraGravar);
  preencherResponsavelAutomatico_(canal, paraGravar, quem);

  var gravado = inserirRegistro_(canal.aba, paraGravar, { origem: RECC_ORIGEM_SISTEMA });
  registrarAuditoria_('caso.criar', canal.aba, gravado.__id, canal.nome);

  return { id: gravado.__id, canal: canal.nome, aba: canal.aba };
}

/**
 * Altera um caso existente.
 *
 * A data de entrada NÃO é reescrita: histórico não muda sozinho. Se o campo
 * vier na alteração, ele é respeitado — mas o preenchimento automático só age
 * na criação.
 */
function editarCaso(idDoCanal, idDoCaso, valores) {
  var quem = exigirPermissao_(RECC_ACOES.EDITAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var alvo = converterParaIdentificador_(idDoCaso);
  if (!alvo) throw new Error('Informe qual caso deve ser alterado.');

  var atual = buscarRegistros_(canal.aba, 'Id', alvo, 1)[0];
  if (!atual) {
    throw new Error('O caso ' + alvo + ' não existe no canal ' + canal.nome + '.');
  }
  exigirAlcanceSobre_(atual, canal, quem);

  var paraGravar = validarValores_(canal.id, valores || {}, quem);
  atualizarRegistro_(canal.aba, alvo, paraGravar);
  registrarAuditoria_('caso.editar', canal.aba, alvo, canal.nome);

  return { id: alvo, canal: canal.nome };
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
function alterarSituacaoDoCaso(idDoCanal, idDoCaso, situacaoNova) {
  var quem = exigirPermissao_(RECC_ACOES.EDITAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var alvo = converterParaIdentificador_(idDoCaso);

  if (!canal.colunaDoStatus) {
    throw new Error('O canal ' + canal.nome + ' não declarou qual coluna guarda ' +
      'a situação, então não há o que trocar. Isso se ajusta em Configurações.');
  }

  var atual = buscarRegistros_(canal.aba, 'Id', alvo, 1)[0];
  if (!atual) {
    throw new Error('O caso ' + alvo + ' não existe no canal ' + canal.nome + '.');
  }
  exigirAlcanceSobre_(atual, canal, quem);

  var escolhida = String(situacaoNova || '').trim();
  var conhecidas = situacoesDoCanal_(canal);
  var achada = null;
  conhecidas.forEach(function (uma) {
    if (normalizarParaComparar_(uma.gravadoComo)
      === normalizarParaComparar_(escolhida)) achada = uma;
  });
  if (!achada) {
    throw new Error('A situação "' + escolhida + '" não existe no canal ' +
      canal.nome + '. As situações dela são: ' + conhecidas.map(function (uma) {
        return uma.gravadoComo;
      }).join(', ') + '.');
  }

  var alteracao = {};
  alteracao[canal.colunaDoStatus] = achada.gravadoComo;

  // Concluir preenche a data de finalização quando o canal tem essa coluna e
  // ela ainda está vazia — é o que a operação faria à mão logo em seguida.
  if (canal.colunaDaFinalizacao && !atual[canal.colunaDaFinalizacao]
    && normalizarParaComparar_(achada.gravadoComo).indexOf('conclu') === 0) {
    alteracao[canal.colunaDaFinalizacao] = new Date();
  }

  carimbarOStatus_(canal, achada, atual, alteracao);

  atualizarRegistro_(canal.aba, alvo, alteracao);

  // NÃO registra na auditoria, e isso é decisão da operação.
  //
  // Troca de status é o evento mais frequente do sistema: um caso passa por
  // quatro ou cinco antes de fechar. Numa base de 200 mil casos isso são
  // quase um milhão de linhas de auditoria — uma aba enorme, que empurra a
  // planilha para o teto de células, e da qual ninguém tira relatório.
  //
  // O que a operação precisa saber é QUANDO cada etapa aconteceu, e isso
  // agora fica carimbado na própria linha do caso, na aba do canal (ver
  // carimbarOStatus_). Mesma informação, no lugar em que ela é usada.
  //
  // A auditoria continua guardando o que é raro e sem volta: criar, editar,
  // ocultar, mexer em configuração.

  return { id: alvo, situacao: achada.gravadoComo, tom: achada.tom };
}

/**
 * Carimba data e hora na coluna que ESTE status declarou.
 *
 * Cada status diz, no catálogo, em qual coluna da base ele grava o momento em
 * que o caso chegou nele — "Data do 1º contato" na RET, "Data e horário de
 * finalização" na Mesa Diamante. É o que permite medir produtividade sem
 * cruzar duas abas.
 *
 * CARIMBA SÓ SE ESTIVER VAZIO. Um caso que volta para um status por onde já
 * passou não reescreve a data: o que interessa é quando aquilo aconteceu pela
 * primeira vez. Reescrever apagaria justamente o dado que se quer medir, e
 * apagaria em silêncio.
 *
 * Coluna declarada que não existe na base é ignorada, sem estourar: o caso
 * precisa ser salvo de qualquer jeito. Quem cobra isso é o diagnóstico, que
 * enxerga a instalação inteira e sabe explicar.
 */
function carimbarOStatus_(canal, situacao, registroAtual, alteracao) {
  var coluna = String(situacao.colunaDeCarimbo || '').trim();
  if (!coluna) return;

  var estrutura = estruturaDaAba_(canal.aba);
  if (posicaoDaColuna_(estrutura, coluna) < 0) return;

  var jaTem = String(registroAtual[coluna] || '').trim();
  if (jaTem) return;

  alteracao[coluna] = new Date();
}

/**
 * As situações que o canal oferece, para o diálogo de troca.
 *
 * A situação que o caso tem hoje vem marcada. Se ela tiver sido desligada
 * depois, continua aparecendo — a pessoa precisa entender o que o caso tem,
 * mesmo que não possa escolher aquilo de novo.
 */
function situacoesParaTrocar(idDoCanal, idDoCaso) {
  var quem = exigirPermissao_(RECC_ACOES.EDITAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var atual = buscarRegistros_(canal.aba, 'Id',
    converterParaIdentificador_(idDoCaso), 1)[0];
  if (!atual) {
    throw new Error('O caso ' + idDoCaso + ' não existe no canal ' + canal.nome + '.');
  }
  exigirAlcanceSobre_(atual, canal, quem);

  var hoje = canal.colunaDoStatus
    ? String(atual[canal.colunaDoStatus] || '') : '';
  var opcoes = situacoesDoCanal_(canal).map(function (uma) {
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
function casoParaEditar(idDoCanal, idDoCaso) {
  var quem = exigirPermissao_(RECC_ACOES.EDITAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var registro = buscarRegistros_(canal.aba, 'Id',
    converterParaIdentificador_(idDoCaso), 1)[0];
  if (!registro) {
    throw new Error('O caso ' + idDoCaso + ' não existe no canal ' + canal.nome + '.');
  }
  exigirAlcanceSobre_(registro, canal, quem);

  var estrutura = estruturaDaAba_(canal.aba);
  var valores = {};

  camposAtivosDoCanal_(canal.id).forEach(function (campo) {
    var posicao = posicaoDaColuna_(estrutura, campo.Cabecalho);
    if (posicao < 0) return;
    valores[String(campo.ChaveTecnica)] =
      paraTexto_(registro[campo.Cabecalho], estrutura.tipos[posicao]);
  });

  return { id: registro.__id, canal: canal.nome, valores: valores };
}

/** Tira o caso da tela. A linha permanece na planilha, e volta editando _Visivel. */
function excluirCaso(idDoCanal, idDoCaso) {
  // QUALQUER pessoa cadastrada exclui, em QUALQUER canal. Decisão do PO:
  // "todos os canais e níveis de acesso podem excluir um caso criado".
  //
  // É o único ponto do sistema sem trava de nível nem de escopo, e está
  // escrito assim de propósito, para ninguém "consertar" isso achando que foi
  // esquecimento. Continua exigindo estar CADASTRADO: quem não entra no
  // sistema não apaga nada.
  var quem = usuarioAtual_();
  if (!quem.cadastrado) throw new Error(quem.motivo);

  var canal = canalPeloId_(idDoCanal);
  var alvo = converterParaIdentificador_(idDoCaso);

  var atual = buscarRegistros_(canal.aba, 'Id', alvo, 1)[0];
  if (!atual) {
    throw new Error('O caso ' + alvo + ' não existe no canal ' + canal.nome + '.');
  }

  // A auditoria PRIMEIRO, com o conteúdo da linha — porque depois não existe
  // mais de onde tirar. Sem isto, um caso apagado por engano não deixa nem
  // rastro de que existiu, e alguém vai jurar que cadastrou.
  registrarAuditoria_('caso.excluir', canal.aba, alvo,
    canal.nome + ' — ' + resumoDoCasoParaAuditoria_(atual, canal));

  apagarRegistroDeVez_(canal.aba, alvo);
  return true;
}

/**
 * O caso em uma linha de texto, para a auditoria guardar antes de apagar.
 *
 * Não é o registro inteiro: uma linha da RET tem 36 colunas, e despejá-las
 * numa célula de auditoria daria um texto que ninguém lê. São os campos pelos
 * quais alguém procuraria o caso depois — quem era, de quem, e como estava.
 */
function resumoDoCasoParaAuditoria_(registro, canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var pedacos = [];

  var colunaDoDono = colunaDoResponsavel_(estrutura);
  if (colunaDoDono && registro[colunaDoDono]) {
    pedacos.push('analista ' + registro[colunaDoDono]);
  }
  if (canal.colunaDoStatus && registro[canal.colunaDoStatus]) {
    pedacos.push('status ' + registro[canal.colunaDoStatus]);
  }
  (canal.colunasDaBusca || '').split(',').forEach(function (cabecalho) {
    var nome = String(cabecalho).trim();
    if (!nome || !registro[nome]) return;
    if (pedacos.length >= 5) return;
    pedacos.push(nome + ': ' + registro[nome]);
  });

  return pedacos.length ? pedacos.join(' · ') : 'linha sem conteúdo';
}

/**
 * O escopo do nível também vale para escrever, não só para ler.
 *
 * Quem enxerga só os próprios casos não pode editar o caso de outra pessoa
 * mandando o Id direto — a tela não ofereceria o botão, mas a chamada existe.
 */
function exigirAlcanceSobre_(registro, canal, quem) {
  var alcance = filtrarPeloAlcance_([registro], canal.aba, quem);
  if (alcance.length) return;

  // A recusa nomeia o RESPONSÁVEL pelo caso, e não só o escopo.
  //
  // "Fora do seu alcance" sozinho manda a pessoa achar que o canal não
  // permite aquela ação — foi exatamente assim que a operação leu, ao tentar
  // excluir um caso da RET e conseguir na Mesa Diamante. Os dois canais
  // sempre permitiram; o que barrava era o caso ser de outra pessoa.
  var estrutura = estruturaDaAba_(canal.aba);
  var coluna = colunaDoResponsavel_(estrutura);
  var dono = coluna ? String(registro[coluna] || '').trim() : '';

  throw new Error('Este caso é de ' + (dono || 'outra pessoa')
    + ', e o seu nível (escopo ' + quem.permissoes.escopo + ') alcança '
    + (quem.permissoes.escopo === RECC_ESCOPOS.PROPRIOS
      ? 'apenas os casos em que você é a responsável. '
      : 'apenas parte dos casos. ')
    + 'Isso vale para qualquer canal, e não é uma regra do ' + canal.nome
    + '. Para alcançar os casos de outras pessoas, um administrador ajusta o '
    + 'escopo do seu nível em Configurações › Níveis de acesso.');
}

/**
 * Parte "1101 - VIDA INDIVIDUAL" em código e nome.
 *
 * O hífen separa, e só o PRIMEIRO separa: nome de produto pode ter hífen
 * dentro ("VIDA - PLANO A - OURO"), e partir em todos deixaria o nome pela
 * metade. Sem hífen nenhum, o texto inteiro é o nome e o código fica vazio —
 * é o que acontece com um produto antigo, cadastrado antes desta regra.
 */
function separarCodigoENome_(valor) {
  var texto = String(valor || '').trim();
  var corte = texto.indexOf('-');
  if (corte < 0) return { codigo: '', nome: texto };

  var codigo = texto.substring(0, corte).trim();
  var nome = texto.substring(corte + 1).trim();

  // Se o que veio antes do hífen não for um código, não há o que separar:
  // era um nome com hífen, e parti-lo perderia metade dele.
  //
  // O que distingue um código de uma palavra é TER DÍGITO. "1101" e "A12" são
  // códigos; "VIDA", em "VIDA - PLANO A", é o começo do nome. Aceitar
  // qualquer coisa curta guardaria "VIDA" como código do produto, calado.
  var pareceCodigo = codigo.length <= 10
    && /^[0-9A-Za-z.]+$/.test(codigo)
    && /[0-9]/.test(codigo);
  if (!pareceCodigo) return { codigo: '', nome: texto };
  return { codigo: codigo, nome: nome };
}

/** Data e hora de entrada, decididas pelo servidor, só quando faltam. */
function preencherEntradaAutomatica_(canal, paraGravar) {
  var agora = new Date();
  if (canal.colunaDaData && !paraGravar[canal.colunaDaData]) {
    paraGravar[canal.colunaDaData] =
      Utilities.formatDate(agora, RECC_FUSO_HORARIO, 'dd/MM/yyyy');
  }
  if (canal.colunaDaHora && !paraGravar[canal.colunaDaHora]) {
    paraGravar[canal.colunaDaHora] =
      Utilities.formatDate(agora, RECC_FUSO_HORARIO, 'HH:mm');
  }
}

/** O analista do caso é quem o registrou, quando a tela não disse outro. */
function preencherResponsavelAutomatico_(canal, paraGravar, quem) {
  var estrutura = estruturaDaAba_(canal.aba);
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

  // Procura pela COLUNA, não lendo a tabela inteira.
  //
  // Isto é digitado: o selo responde a cada SUSEP que alguém escreve no
  // formulário. Ler as duas tabelas inteiras a cada digitação era ler mais de
  // 140 mil células — com as 16 mil SUSEPs bloqueadas e as 7 mil do cadastro
  // que a operação vai importar, o formulário travaria a cada campo
  // preenchido, e travaria mais a cada corretora nova cadastrada.
  //
  // buscarRegistros_ lê só a coluna da SUSEP, acha em qual linha ela está, e
  // só então lê aquela linha inteira. É a mesma regra que sustenta a busca de
  // casos: ler a coluna antes de ler as linhas.
  var bloqueada = buscarRegistroVisivel_('SUSEP_BLOQUEADAS', 'SUSEP', procurada);

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

  var canal = buscarRegistroVisivel_('CORRETORAS', 'SUSEP', procurada);

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
    consultor: String(canal.Consultor || ''),
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
    // Só os canais desta pessoa. Oferecer os outros seria convidar a procurar
    // onde a busca depois vai recusar.
    canais: canaisQueEuVejo_(quem).map(function (canal) {
      return {
        id: canal.id,
        nome: canal.nome,
        icone: canal.icone,
        procuraEm: colunasDaBusca_(canal).map(function (coluna) {
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
 * Procura o termo nos canais escolhidas e, se estiver ligada, na base legada.
 *
 * `ondeProcurar` é a lista de ids de canal; vazio procura em todas as que a
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

  // E procura SÓ nos canais desta pessoa. A tela não oferecer os outros não
  // basta: a chamada existe, e nada impede mandar o Id de um canal alheio.
  canaisQueEuVejo_(quem).forEach(function (canal) {
    if (escolhidas.length && escolhidas.indexOf(converterParaIdentificador_(canal.id)) < 0) {
      return;
    }
    resultados.push(procurarNoCanal_(canal, procurado, quem));
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
 * As colunas em que o canal procura.
 *
 * Declaradas em `CANAIS.ColunasDaBusca`, e não adivinhadas: adivinhar acerta
 * no canal de hoje e erra na próxima. Sem nada declarado, procura na coluna
 * da situação e na da data — pouco, mas nunca na base inteira.
 */
function colunasDaBusca_(canal) {
  var estrutura = estruturaDaAba_(canal.aba);

  return String(canal.colunasDaBusca || '')
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
 * Procura num canal, lendo coluna por coluna e só depois as linhas que casam.
 */
function procurarNoCanal_(canal, termo, quem) {
  var colunas = colunasDaBusca_(canal);
  var aviso = '';

  if (!colunas.length) {
    return {
      tipo: 'canal',
      id: canal.id,
      nome: canal.nome,
      icone: canal.icone,
      colunas: [],
      casos: [],
      aviso: 'Esto canal não declarou em quais colunas procurar. ' +
        'Isso se ajusta em Configurações → Canais de trabalho.'
    };
  }

  // Passo 1: ler só as colunas de busca, e anotar em QUAIS linhas o termo
  // aparece. É aqui que a tela não estoura numa base grande.
  var linhasQueCasam = {};
  var ordemDasLinhas = [];

  colunas.forEach(function (coluna) {
    var valores = lerColunaInteira_(canal.aba, coluna.cabecalho);
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
  var registros = lerLinhasEspecificas_(canal.aba, ordemDasLinhas)
    .filter(function (registro) {
      // Caso ocultado não volta na busca. A linha continua na planilha, e
      // um administrador ainda a enxerga por lá.
      return normalizarParaComparar_(registro._Visivel) !== 'nao';
    });

  var meus = filtrarPeloAlcance_(registros, canal.aba, quem);

  return {
    tipo: 'canal',
    id: canal.id,
    nome: canal.nome,
    icone: canal.icone,
    colunas: colunasDaFila_(canal),
    casos: montarFila_(meus.slice().reverse(), canal),
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
