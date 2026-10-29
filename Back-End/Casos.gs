/**
 * ============================================================================
 * PGO — Casos.gs · o caso, do formulário à busca
 * ============================================================================
 * A vida de um caso em três tempos: as perguntas que o formulário faz,
 * a gravação na planilha, e como achá-lo meses depois.
 *
 * O QUE TEM AQUI DENTRO, nesta ordem:
 *
 *   1. O MOTOR DO FORMULÁRIO
 *   2. REGISTRAR, EDITAR E EXCLUIR
 *   3. ACHAR UM CASO QUE A FILA NÃO MOSTRA MAIS
 *
 * Procure pelo banner com ##### para pular de uma seção à outra.
 * ============================================================================
 */

/* ############################################################################
   #
   #  SEÇÃO 1 de 3 · O MOTOR DO FORMULÁRIO
   #
   ############################################################################ */

/**
 * ============================================================================
 * O motor do formulário
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
    // Aparece só quando outro campo estiver com um destes valores: { campo:
    // 'chave', valores: ['Retido', 'Pago'] } — ver condicaoDoCampo_.
    mostrarSe: condicaoDoCampo_(configuracao),
    // OBRIGATÓRIO só quando outro campo estiver com um destes valores — pedido
    // do PO: "quando o status for Retido, o valor retido deve ser obrigatório".
    // Mesmo formato do mostrarSe; o campo continua aparecendo nos outros casos,
    // só deixa de ser cobrado.
    obrigatorioSe: condicaoDoCampo_({ mostrarSe: configuracao.obrigatorioSe }),
    largura: Number(configuracao.largura) || 1,
    /*
     * Data no futuro é RECUSADA por padrão: o caso descreve algo que já
     * aconteceu, e "10/09/2027" numa data de protocolo é dedo escorregando no
     * ano. Mas há campo em que o futuro é rotina — o início da vigência de uma
     * apólice que começa mês que vem —, e para esses a recusa é que estava
     * errada. Quem declara a exceção é o campo, em Configurações.
     */
    aceitaFuturo: configuracao.aceitaFuturo === true,
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
    registrarErro_('servidor', 'campo ' + campo.Cabecalho, 'Configuração inválida no campo "'
      + campo.Cabecalho + '": ' + erro.message, texto);
    return {};
  }
}

/**
 * A condição que faz um campo APARECER: { campo, valores } — ou null, quando o
 * campo aparece sempre.
 *
 * `campo` é a chave técnica do campo que manda; `valores`, os que fazem este
 * aparecer (qualquer um deles). A forma antiga, de um valor só
 * ({ campo, valor }), continua sendo lida: foi assim que o "Nome de quem
 * transferiu" e os "Dados do pagamento" nasceram.
 */
function condicaoDoCampo_(configuracao) {
  var regra = configuracao && configuracao.mostrarSe;
  if (!regra || !regra.campo) return null;
  var valores = Array.isArray(regra.valores) ? regra.valores
    : (regra.valor === undefined || regra.valor === null ? [] : [regra.valor]);
  valores = valores.map(String).filter(function (valor) { return valor.trim() !== ''; });
  return valores.length ? { campo: String(regra.campo), valores: valores } : null;
}

/**
 * O valor faz a condição valer? Compara sem acento e sem caixa — a MESMA
 * conta que a tela faz (mesmoTexto, no Comuns.html): se servidor e tela
 * discordassem, um campo apareceria na tela e seria ignorado na gravação.
 */
function condicaoBate_(condicao, valor) {
  function limpar(texto) {
    return String(texto === null || texto === undefined ? '' : texto).trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  var alvo = limpar(valor);
  return condicao.valores.some(function (esperado) { return limpar(esperado) === alvo; });
}

/**
 * As colunas dos campos que ACABARAM DE SUMIR: o campo que manda estava com um
 * valor que o mostrava, e agora está com outro.
 *
 * Só a TRANSIÇÃO limpa. Esconder o campo não apaga o que já estava gravado nele
 * — um caso importado pode trazer valor numa coluna cujo campo hoje está
 * escondido, e apagar isso só porque alguém abriu o caso seria perder dado.
 * Mas passar de Retido para Pago é a pessoa dizendo que "situação da proposta"
 * não se aplica mais, e o valor que ficasse ali voltaria sozinho no dia em que
 * o caso voltasse a Retido.
 *
 * `alteracao` é o que vai ser gravado, por cabeçalho; o que não está nela vale
 * o que o caso já tem.
 */
function dependentesQueSomem_(idDoCanal, atual, alteracao) {
  var ativos = camposAtivosDoCanal_(idDoCanal);
  var cabecalhoDe = {};
  // Pela grafia da planilha: `atual` vem dela, e `alteracao` já vem assim.
  ativos.forEach(function (campo) {
    cabecalhoDe[String(campo.ChaveTecnica)] = grafiaDaColuna_(campo.Aba, campo.Cabecalho);
  });

  var colunas = [];
  ativos.forEach(function (campo) {
    var condicao = condicaoDoCampo_(lerConfiguracaoDoCampo_(campo));
    var quemManda = condicao ? cabecalhoDe[condicao.campo] : '';
    if (!quemManda) return;

    var antes = atual[quemManda];
    var depois = Object.prototype.hasOwnProperty.call(alteracao, quemManda)
      ? alteracao[quemManda] : antes;
    if (condicaoBate_(condicao, antes) && !condicaoBate_(condicao, depois)) {
      colunasDoCampo_(campo, { cabecalho: String(campo.Cabecalho) }).forEach(function (bruta) {
        var coluna = grafiaDaColuna_(campo.Aba, bruta);
        if (colunas.indexOf(coluna) < 0) colunas.push(coluna);
      });
    }
  });
  return colunas;
}

/**
 * As opções de um seletor. Três origens possíveis:
 *
 *   { "catalogo": "STATUS" }      da aba CATALOGO, do canal ou global
 *   { "listaDe": "usuarios" }     de um cadastro: usuários, corretoras, canais
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
      // Item sem canal é global e serve a todos; com canal, só ao dele.
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

  /*
   * O cadastro de CORRETORAS. A chave `canais` continua aceita por ser a que
   * as instalações antigas gravaram em CAMPOS, de quando a aba CORRETORAS se
   * chamava CANAIS — trocar a chave sem mais apagaria a lista de um campo que
   * já estava configurado, e ninguém ligaria uma coisa à outra.
   *
   * Havia aqui também o cadastro de `produtos`, que saiu a pedido do PO.
   */
  if (cadastro === 'corretoras' || cadastro === 'canais') {
    return lerRegistros_('CORRETORAS').map(function (corretora) {
      var nome = String(corretora.Corretora || '');
      return { valor: nome, rotulo: nome };
    });
  }

  // As duas listas de analista que a operação mantém fora do PGO: quem
  // transferiu o caso, quem já tinha falado com o cliente. Não são usuários do
  // sistema — não entram no PGO —, e por isso vêm de cadastro próprio.
  if (cadastro === 'analistascentral') {
    return nomesAtivosDoCadastro_('ANALISTAS_CENTRAL');
  }
  if (cadastro === 'analistascobranca') {
    return nomesAtivosDoCadastro_('ANALISTAS_COBRANCA');
  }

  throw new Error('Cadastro desconhecido em listaDe: "' + qualCadastro + '". ' +
    'Os cadastros são usuarios, corretoras, analistasCentral e ' +
    'analistasCobranca.');
}

/**
 * Os nomes ativos de um cadastro de pessoas, em ordem.
 *
 * Aba que ainda não existe devolve LISTA VAZIA em vez de estourar. Estas duas
 * nasceram depois do resto, e uma instalação mais antiga não as tem: derrubar
 * o formulário inteiro por causa de um seletor que ninguém configurou ainda
 * seria trocar um campo vazio por uma tela que não abre.
 */
function nomesAtivosDoCadastro_(nomeDaAba) {
  var registros;
  try {
    registros = lerRegistros_(nomeDaAba);
  } catch (erro) {
    // Aba que não existe é de propósito (acima). A que existe e não se lê — a
    // segunda base fora do ar — vira erro registrado (Etapa 64): a lista vazia
    // no formulário não diz o motivo, e alguém precisa saber.
    try {
      if (abaVemDeOutraPlanilha_(nomeDaAba) || planilhaAtiva_().getSheetByName(nomeDaAba)) {
        registrarErro_('servidor', 'lista ' + nomeDaAba, 'A lista de ' + nomeDaAba
          + ' não pôde ser lida: ' + erro.message, '');
      }
    } catch (outro) { /* conferir a aba também falhou: nada a acrescentar */ }
    return [];
  }

  return registros
    .filter(function (linha) {
      // Sem coluna Ativo preenchida, a pessoa CONTA. Um cadastro que a
      // operação acabou de colar não tem essa coluna marcada, e esconder todo
      // mundo faria a lista parecer quebrada.
      var ativo = String(linha.Ativo === null || linha.Ativo === undefined
        ? '' : linha.Ativo).trim();
      return !ativo || normalizarParaComparar_(ativo) === 'sim';
    })
    .map(function (linha) { return String(linha.Nome || '').trim(); })
    .filter(function (nome) { return nome !== ''; })
    .sort()
    .map(function (nome) { return { valor: nome, rotulo: nome }; });
}

function canalPeloId_(idDoCanal) {
  var alvo = converterParaIdentificador_(idDoCanal);
  var canais = canaisVisiveis_();
  for (var i = 0; i < canais.length; i++) {
    if (converterParaIdentificador_(canais[i].id) === alvo) return comAGrafiaDaAba_(canais[i]);
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
 *
 * `ehCasoNovo` diz se o VALOR PADRÃO do campo entra quando nada veio da tela.
 * Num caso novo entra: o status da RET nasce em "Não trabalhado" mesmo que o
 * pedido chegue sem ele — é o que a importação precisa, porque uma base de 300
 * casos não traz status nenhum. Numa EDIÇÃO não entra: repor o padrão num
 * campo que a pessoa esvaziou seria desfazer o que ela acabou de fazer.
 */
function validarValores_(idDoCanal, valoresDaTela, quem, ehCasoNovo, registroAtual) {
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var problemas = [];
  var paraGravar = {};
  var ativos = camposAtivosDoCanal_(canal.id);

  // O valor que um campo VAI TER depois desta gravação, para decidir se o campo
  // que depende dele aparece: o que a tela mandou, senão o que o caso já tem,
  // senão — no cadastro — o padrão (o "Não trabalhado" da RET manda no campo
  // que depende do status, mesmo com a tela em branco).
  function valorQueVaiValer(chave) {
    var quemManda = ativos.filter(function (campo) {
      return String(campo.ChaveTecnica) === chave;
    })[0];
    if (!quemManda) return '';
    var cabecalho = String(quemManda.Cabecalho);
    var valor = valoresDaTela.hasOwnProperty(chave) ? valoresDaTela[chave]
      : (valoresDaTela.hasOwnProperty(cabecalho) ? valoresDaTela[cabecalho]
        : (registroAtual ? valorPelaGrafiaDaAba_(registroAtual, estruturaDaAba_(canal.aba), cabecalho) : ''));
    if (valor === undefined || valor === null) valor = '';
    if (String(valor).trim() === '' && ehCasoNovo) {
      valor = valorPadraoResolvido_(quemManda.ValorPadrao, quem) || '';
    }
    return valor;
  }

  ativos.forEach(function (campo) {
    var visibilidade = visibilidadeDoCampo_(quem.permissoes, campo.ChaveTecnica);

    // Campo que a pessoa não pode ver ou não pode editar é IGNORADO, mesmo
    // que a tela mande um valor. A tela é do lado de lá; ela não decide.
    if (visibilidade !== RECC_VISIBILIDADE.EDICAO) return;

    var descricao = campoParaATela_(campo, canal.id, visibilidade, quem);

    // Campo condicional que não é a vez dele não é perguntado: não se exige, e
    // nada se grava nele. A tela já esconde — mas a tela não decide, e um
    // campo obrigatório escondido não pode travar o salvamento.
    if (descricao.mostrarSe
      && !condicaoBate_(descricao.mostrarSe, valorQueVaiValer(descricao.mostrarSe.campo))) {
      return;
    }

    // "Obrigatório quando…": vale o valor que o campo que manda VAI TER — o
    // Retido escolhido agora cobra o valor retido nesta mesma gravação.
    if (descricao.obrigatorioSe
      && condicaoBate_(descricao.obrigatorioSe, valorQueVaiValer(descricao.obrigatorioSe.campo))) {
      descricao.obrigatorio = true;
    }

    var veioDaTela = valoresDaTela.hasOwnProperty(descricao.chave)
      || valoresDaTela.hasOwnProperty(descricao.cabecalho);
    var bruto = valoresDaTela[descricao.chave];
    if (bruto === undefined) bruto = valoresDaTela[descricao.cabecalho];
    if (bruto === undefined || bruto === null) bruto = '';

    // O padrão vem ANTES de conferir se é obrigatório, e é isso que faz o
    // "Não trabalhado" da RET valer de verdade. Conferir primeiro recusaria um
    // caso por falta de um valor que o próprio sistema tem guardado — e a tela
    // até esconderia o problema, porque ela preenche o padrão sozinha. Quem
    // pagaria a conta é a importação, que não passa por tela nenhuma.
    if (ehCasoNovo && String(bruto).trim() === '') {
      bruto = descricao.valorPadrao === undefined || descricao.valorPadrao === null
        ? '' : descricao.valorPadrao;
    }

    var problema = conferirCampo_(descricao, bruto);
    if (problema) {
      problemas.push({ campo: descricao.chave, rotulo: descricao.rotulo, erro: problema });
      return;
    }

    /*
     * CAMPO ESVAZIADO NA EDIÇÃO É APAGADO NA PLANILHA.
     *
     * Antes, vazio era sempre "não mexer": a pessoa apagava a Área
     * responsável, a tela dizia que salvou, e a área continuava lá — o caso
     * nunca mais contava como finalizado na célula. Agora apaga, desde que o
     * campo tenha VINDO no formulário (quem não manda a chave não está
     * pedindo para apagar nada) e não seja travado (o responsável que o
     * sistema preencheu, por exemplo, nem é enviado pela tela).
     * No cadastro, vazio continua sendo só vazio: não há o que apagar.
     */
    if (String(bruto).trim() === '') {
      if (!ehCasoNovo && veioDaTela && !descricao.somenteLeitura) {
        colunasDoCampo_(campo, descricao).forEach(function (cabecalho) {
          paraGravar[cabecalho] = '';
        });
      }
      return;
    }

    /*
     * ESPAÇO DE PONTA NÃO VAI PARA A PLANILHA.
     *
     * Quem copia a SUSEP de outra planilha traz " RET00J " junto, e o espaço
     * é invisível na tela. O selo continuava achando a corretora — ele
     * compara normalizado —, então nada parecia errado; o estrago aparecia
     * depois, no Power BI, onde o join é pelo texto cru e " RET00J " não casa
     * com "RET00J".
     *
     * Só as PONTAS. A SUSEP em si fica intacta: letra, dígito, caixa e
     * pontuação do meio continuam exatamente como a pessoa colou, que é o que
     * o PO pediu — "devem aceitar e colar exatamente essa susep". E vale para
     * todo campo de texto, porque colar com espaço não é problema só da SUSEP;
     * é assim que a importação já tratava, e as duas portas passam a
     * concordar.
     */
    if (typeof bruto === 'string') bruto = bruto.trim();

    // Um seletor pode alimentar DUAS colunas. É o caso do produto, que a
    // operação escolhe como "1101 - VIDA INDIVIDUAL" e a planilha guarda
    // separado: o código numa coluna, o nome na outra.
    //
    // Escolher uma coisa e gravar duas é de propósito. Uma caixa só é menos
    // uma chance de digitar o código de um produto e o nome de outro; e as
    // colunas separadas são o que deixa o painel agrupar por código e o
    // relatório mostrar o nome.
    var configuracaoDoCampo = lerConfiguracaoDoCampo_(campo);

    var separa = configuracaoDoCampo.separaEm;
    if (separa && separa.codigo && separa.nome) {
      var partes = separarCodigoENome_(bruto);
      paraGravar[separa.codigo] = partes.codigo;
      paraGravar[separa.nome] = partes.nome;
      return;
    }

    // Um campo pode PARTIR EM várias colunas pelo hífen. É o caso da proposta
    // e da apólice: digitadas inteiras, gravadas em pedaços. Ver
    // partirPorHifen_, que é quem recusa o formato errado.
    var partir = configuracaoDoCampo.partirEm;
    if (partir && partir.colunas && partir.colunas.length > 1) {
      var pedacos;
      try {
        pedacos = partirPorHifen_(bruto, partir, descricao.rotulo);
      } catch (erro) {
        problemas.push({ campo: descricao.chave, rotulo: descricao.rotulo,
          erro: erro.message });
        return;
      }
      partir.colunas.forEach(function (cabecalho, i) {
        paraGravar[cabecalho] = pedacos[i];
      });
      return;
    }

    // Documento é UM documento, e vai para a planilha só com os dígitos. Sem
    // isto, a barra do CNPJ ("12.345.678/0001-90") seria lida como separador
    // de lista — a regra dos telefones — e a célula receberia
    // "12345678;000190". Apareceu quando a Mesa passou a aceitar CNPJ.
    if (descricao.tipo === 'documento' && !ehASusep_(descricao.chave)
      && !ehASusep_(descricao.cabecalho)) bruto = apenasDigitos_(bruto);

    // O VALOR TEM DE CABER NA COLUNA. A coluna de número, de data ou de Id
    // converte o que recebe; o que não converte vira VAZIO — e era assim, calado,
    // que a tentativa de contato sumia (achado 98). Recusar com o motivo é melhor
    // do que dizer "salvo" e gravar em branco.
    var naoCabe = valorQueNaoCabeNaColuna_(canal.aba, descricao.cabecalho, bruto);
    if (naoCabe) {
      problemas.push({ campo: descricao.chave, rotulo: descricao.rotulo, erro: naoCabe });
      return;
    }

    paraGravar[descricao.cabecalho] = bruto;
  });

  // As chaves pela GRAFIA DA PLANILHA: é assim que o canal, os sinalizadores e
  // os carimbos procuram as colunas daqui para a frente (ver grafiaDaColuna_).
  paraGravar = comAsChavesDaAba_(canal.aba, paraGravar);

  // O campo que acabou de sumir (Retido → Pago) deixa o valor para trás? Não.
  if (!ehCasoNovo && registroAtual) {
    dependentesQueSomem_(canal.id, registroAtual, paraGravar).forEach(function (coluna) {
      paraGravar[coluna] = '';
    });
  }

  if (problemas.length) {
    var erro = new Error('Confira ' + problemas.length + ' campo(s): '
      + problemas.map(function (p) { return p.rotulo + ' — ' + p.erro; }).join('; '));
    erro.problemas = problemas;
    throw erro;
  }
  return paraGravar;
}

/**
 * As colunas da planilha que um campo do formulário preenche: uma, na maioria;
 * duas no seletor que separa código e nome (o produto); várias no campo que
 * se parte pelo hífen (a proposta e a apólice).
 */
function colunasDoCampo_(campo, descricao) {
  var configuracao = lerConfiguracaoDoCampo_(campo);
  var separa = configuracao.separaEm;
  if (separa && separa.codigo && separa.nome) return [separa.codigo, separa.nome];
  var partir = configuracao.partirEm;
  if (partir && partir.colunas && partir.colunas.length > 1) return partir.colunas.slice();
  return [descricao.cabecalho];
}

/** Devolve a mensagem do problema, ou string vazia quando está tudo certo. */
function conferirCampo_(campo, valor) {
  var texto = String(valor === null || valor === undefined ? '' : valor).trim();

  if (texto === '') {
    return campo.obrigatorio ? 'é obrigatório' : '';
  }

  // A SUSEP aceita só números, só letras ou os dois, seja qual for o tipo do
  // campo. Ver ehASusep_.
  if (ehASusep_(campo.chave) || ehASusep_(campo.cabecalho)) return '';

  if (campo.tipo === 'identificador' || campo.tipo === 'documento') {
    var digitos = converterParaIdentificador_(texto);
    if (!digitos) return 'precisa ter ao menos um dígito';
    // Máscaras alternativas, separadas por "|", aceitam qualquer um dos
    // tamanhos: "000.000.000-00|00.000.000/0000-00" é CPF (11) ou CNPJ (14).
    var aceitos = String(campo.mascara || '').split('|')
      .map(quantosDigitosAMascaraPede_)
      .filter(function (quantos) { return quantos > 0; });
    var veio = digitos.replace(/;/g, '').length;
    if (aceitos.length && aceitos.indexOf(veio) < 0) {
      return 'precisa ter ' + aceitos.join(' ou ') + ' dígitos (veio com '
        + veio + ')';
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
    if (dataEstaNoFuturo_(data) && !campo.aceitaFuturo) {
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
  // preenchido não pode travar o campo: sem esta linha, escolher "corretoras"
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

/**
 * O motivo de um valor NÃO caber no tipo da coluna da planilha — ou vazio, quando
 * cabe.
 *
 * Quem decide o tipo é o contrato da base (ou o campo, numa coluna criada por
 * Cadastrar Caso). Um texto numa coluna de número, ou de data, era convertido e
 * virava célula em branco, sem erro nenhum. Só reclama quando a conversão APAGA
 * o valor: número com vírgula, data em dd/mm/aaaa e o resto que a coluna entende
 * continuam passando como sempre.
 */
var RECC_O_QUE_A_COLUNA_GUARDA = {
  identificador: 'um código só de dígitos', numero: 'número', dinheiro: 'valor em dinheiro',
  data: 'data', dataHora: 'data e hora', hora: 'hora', simOuNao: 'Sim ou Não'
};

function valorQueNaoCabeNaColuna_(nomeDaAba, cabecalho, valor) {
  if (String(valor === null || valor === undefined ? '' : valor).trim() === '') return '';
  var estrutura = estruturaDaAba_(nomeDaAba);
  var posicao = posicaoDaColuna_(estrutura, cabecalho);
  if (posicao < 0) return '';
  var tipo = estrutura.tipos[posicao];
  if (!RECC_O_QUE_A_COLUNA_GUARDA[tipo]) return '';
  var convertido = converterParaOTipoDaColuna_(valor, tipo);
  if (convertido !== '' && convertido !== null && convertido !== undefined) return '';
  return 'a coluna "' + estrutura.cabecalhos[posicao] + '" da planilha guarda '
    + RECC_O_QUE_A_COLUNA_GUARDA[tipo] + ', e "' + String(valor).trim().slice(0, 60)
    + '" ficaria em branco nela. Escolha outro valor, ou peça para ajustar o tipo da coluna';
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
   #  SEÇÃO 2 de 3 · REGISTRAR, EDITAR E EXCLUIR
   #
   ############################################################################ */

/**
 * ============================================================================
 * Registrar, editar e ocultar um caso
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
 *
 * `envio` é o código de envio da tela: o mesmo código não grava duas vezes
 * (Etapa 59, ver comEnvioUnico_).
 */
function cadastrarCaso(idDoCanal, valores, envio) {
  return comEnvioUnico_(envio, function () { return cadastrarCasoUmaVez_(idDoCanal, valores); });
}

function cadastrarCasoUmaVez_(idDoCanal, valores) {
  var quem = exigirPermissao_(RECC_ACOES.CRIAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var paraGravar = validarValores_(canal.id, valores || {}, quem, true);
  preencherEntradaAutomatica_(canal, paraGravar);
  preencherResponsavelAutomatico_(canal, paraGravar, quem);
  carimbarOStatusDeNascimento_(canal, paraGravar);
  carimbarOEncaminhamento_(canal, null, paraGravar);
  carimbarAParadaDoPrazo_(canal, null, paraGravar);
  carimbarOsItensDeLista_(canal, null, paraGravar);
  preencherColunasCalculadas_(canal.aba, paraGravar, {});

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
 *
 * `envio`: ver cadastrarCaso. Sem ele, o segundo clique depois dos 40
 * segundos esbarrava na versão já gravada e dizia "outra pessoa alterou".
 */
function editarCaso(idDoCanal, idDoCaso, valores, versaoQueAbriu, colunasSuas, envio) {
  return comEnvioUnico_(envio, function () {
    return editarCasoUmaVez_(idDoCanal, idDoCaso, valores, versaoQueAbriu, colunasSuas);
  });
}

function editarCasoUmaVez_(idDoCanal, idDoCaso, valores, versaoQueAbriu, colunasSuas) {
  var quem = exigirPermissao_(RECC_ACOES.EDITAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var alvo = converterParaIdentificador_(idDoCaso);
  if (!alvo) throw new Error('Informe qual caso deve ser alterado.');

  var atual = buscarRegistros_(canal.aba, 'Id', alvo, 1)[0];
  if (!atual) {
    throw new Error('O caso ' + alvo + ' não existe no canal ' + canal.nome + '.');
  }
  exigirAlcanceSobre_(atual, canal, quem);

  /*
   * DUAS PESSOAS NO MESMO CASO. O formulário volta INTEIRO: quem abriu antes
   * regravaria, por cima, os valores velhos dos campos que a outra pessoa
   * acabou de mudar — sem erro e sem aviso. A versão é o retrato da linha no
   * momento em que o caso abriu; se a linha mudou desde então, recusa e diz
   * por quê. Sem versão (chamada direta, sem a tela), segue como antes.
   */
  if (versaoQueAbriu && versaoQueAbriu !== versaoDoCaso_(atual, canal.aba)) {
    throw new Error('Este caso foi alterado por outra pessoa depois que você o '
      + 'abriu. Para não apagar a mudança dela, nada foi gravado: feche, abra o '
      + 'caso de novo e refaça a sua alteração.');
  }

  var paraGravar = validarValores_(canal.id, valores || {}, quem, false, atual);
  acrescentarColunasSuas_(canal, colunasSuas, paraGravar);

  // Trocar a situação pelo formulário inteiro é a mesma coisa que trocar pelo
  // diálogo, e tem de deixar o mesmo rastro.
  carimbarSeOStatusMudou_(canal, atual, paraGravar, quem);
  carimbarOEncaminhamento_(canal, atual, paraGravar);
  carimbarAParadaDoPrazo_(canal, atual, paraGravar);
  carimbarOsItensDeLista_(canal, atual, paraGravar);

  // E a conta refaz: é o que faz o número acompanhar quando o analista
  // corrige a data de início da vigência.
  preencherColunasCalculadas_(canal.aba, paraGravar, atual);

  atualizarRegistro_(canal.aba, alvo, paraGravar);
  registrarAuditoria_('caso.editar', canal.aba, alvo, canal.nome);

  return { id: alvo, canal: canal.nome };
}

/**
 * As colunas SUAS que a pessoa corrigiu no "Trabalhar no caso" — e só elas.
 *
 * Confere de novo, no servidor, que cada uma é mesmo coluna do PO (nem do
 * contrato, nem de campo): a tela só desenha a caixa, e quem decide o que se
 * grava é daqui. Carimbo do sistema mandado por fora é recusado com o nome dele.
 * Vazio apaga — é a mesma regra do campo esvaziado na edição.
 */
function acrescentarColunasSuas_(canal, colunasSuas, paraGravar) {
  if (!colunasSuas || typeof colunasSuas !== 'object') return;
  var nomes = Object.keys(colunasSuas);
  if (!nomes.length) return;

  var suas = colunasSuasDaAba_(canal.aba);
  nomes.forEach(function (nome) {
    if (!suas[normalizarParaComparar_(nome)]) {
      throw new Error('A coluna "' + nome + '" não se edita no "Trabalhar no caso": ela é '
        + 'do sistema ou de um campo do formulário.');
    }
    var valor = colunasSuas[nome];
    paraGravar[grafiaDaColuna_(canal.aba, nome)] =
      String(valor === null || valor === undefined ? '' : valor).trim();
  });
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
 *
 * `envio`: ver cadastrarCaso — sem ele, o segundo clique contava duas
 * mudanças de status.
 */
function alterarSituacaoDoCaso(idDoCanal, idDoCaso, situacaoNova, valoresDosCampos, envio) {
  return comEnvioUnico_(envio, function () {
    return alterarSituacaoDoCasoUmaVez_(idDoCanal, idDoCaso, situacaoNova, valoresDosCampos);
  });
}

function alterarSituacaoDoCasoUmaVez_(idDoCanal, idDoCaso, situacaoNova, valoresDosCampos) {
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
  var achada = situacaoDoCanalPeloValor_(canal, escolhida);
  if (!achada) {
    throw new Error('A situação "' + escolhida + '" não existe no canal ' +
      canal.nome + '. As situações dele são: ' + conhecidas.map(function (uma) {
        return uma.gravadoComo;
      }).join(', ') + '.');
  }

  var alteracao = {};
  alteracao[canal.colunaDoStatus] = achada.gravadoComo;

  // OS CAMPOS QUE O STATUS PEDE. Pedido do PO: o valor retido é obrigatório no
  // Retido — e o diálogo de status, que só trocava o status, deixava passar um
  // Retido sem valor. Agora ele recebe os campos que aparecem ou são cobrados
  // no status escolhido (o valor retido, o Status proposta, a tentativa de
  // contato) e confere como o formulário confere. Ver camposDaSituacao.
  gravarOsCamposDaSituacao_(canal, quem, atual, achada.gravadoComo,
    valoresDosCampos || {}, alteracao);

  // Concluir preenche a data de finalização quando o canal tem essa coluna e
  // ela ainda está vazia — é o que a operação faria à mão logo em seguida.
  //
  // Continua pelo NOME ("conclu…"), e não pela coluna Final do catálogo, de
  // propósito: na RET a coluna de finalização do canal é a "data da
  // transmissão", e trocar para Final faria Retido, Pago e os outros
  // desfechos escreverem uma data de transmissão que não aconteceu.
  if (canal.colunaDaFinalizacao && !atual[canal.colunaDaFinalizacao]
    && !jaVeioNaAlteracao_(alteracao, canal.colunaDaFinalizacao)
    && normalizarParaComparar_(achada.gravadoComo).indexOf('conclu') === 0) {
    alteracao[canal.colunaDaFinalizacao] = new Date();
  }

  // Sair de Retido pelo diálogo também esvazia o que só fazia sentido nele.
  dependentesQueSomem_(canal.id, atual, alteracao).forEach(function (coluna) {
    alteracao[coluna] = '';
  });
  carimbarAParadaDoPrazo_(canal, atual, alteracao);

  carimbarOStatus_(canal, achada, atual, alteracao);
  registrarAMudancaDeStatus_(canal, atual, alteracao, quem);

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
 * Os campos que um status PEDE: os que aparecem só nele (mostrarSe do campo de
 * status) e os que ficam obrigatórios nele (obrigatorioSe). É o que o diálogo
 * de "Alterar status" mostra ao escolher o status.
 */
function camposPedidosPelaSituacao_(canal, quem, situacao) {
  var doStatus = '';
  var ativos = camposAtivosDoCanal_(canal.id);
  ativos.forEach(function (campo) {
    if (normalizarParaComparar_(campo.Cabecalho) === normalizarParaComparar_(canal.colunaDoStatus)) {
      doStatus = String(campo.ChaveTecnica);
    }
  });
  if (!doStatus) return [];
  var pedidos = [];
  ativos.forEach(function (campo) {
    if (String(campo.ChaveTecnica) === doStatus) return;
    if (visibilidadeDoCampo_(quem.permissoes, campo.ChaveTecnica) !== RECC_VISIBILIDADE.EDICAO) return;
    var descricao = campoParaATela_(campo, canal.id, RECC_VISIBILIDADE.EDICAO, quem);
    var aparece = descricao.mostrarSe && descricao.mostrarSe.campo === doStatus
      && condicaoBate_(descricao.mostrarSe, situacao);
    var cobrado = descricao.obrigatorioSe && descricao.obrigatorioSe.campo === doStatus
      && condicaoBate_(descricao.obrigatorioSe, situacao);
    // Campo que depende de OUTRO campo (não do status) e não aparece agora não
    // é pergunta deste diálogo.
    if (descricao.mostrarSe && descricao.mostrarSe.campo !== doStatus) return;
    if (!aparece && !cobrado) return;
    if (cobrado) descricao.obrigatorio = true;
    if (descricao.mostrarSe && !aparece) return;
    pedidos.push(descricao);
  });
  return pedidos;
}

/**
 * O que o diálogo de status mostra ao escolher um status: os campos que ele
 * pede, já com o valor que o caso tem.
 */
function camposDaSituacao(idDoCanal, idDoCaso, situacao) {
  var quem = exigirPermissao_(RECC_ACOES.EDITAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var atual = buscarRegistros_(canal.aba, 'Id', converterParaIdentificador_(idDoCaso), 1)[0];
  if (!atual) throw new Error('O caso ' + idDoCaso + ' não existe no canal ' + canal.nome + '.');
  exigirAlcanceSobre_(atual, canal, quem);
  var estrutura = estruturaDaAba_(canal.aba);
  return camposPedidosPelaSituacao_(canal, quem, String(situacao || '')).map(function (descricao) {
    // O valor como o formulário o espera: o dinheiro como NÚMERO (a tela o
    // escreve como R$, ver Formulario.preencher) e a data em dd/mm/aaaa.
    var valor = valorPelaGrafiaDaAba_(atual, estrutura, descricao.cabecalho);
    var tipoDaColuna = estrutura.tipos[posicaoDaColuna_(estrutura, descricao.cabecalho)];
    descricao.valor = Object.prototype.toString.call(valor) === '[object Date]'
      ? paraTexto_(valor, tipoDaColuna) : (valor === null || valor === undefined ? '' : valor);
    // Quem decidiu se o campo aparece e se é cobrado foi o servidor, agora,
    // para o status escolhido. A condição não vai para a tela: no diálogo o
    // status é o seletor dele, e não um campo "status" — o formulário, sem
    // achar quem manda, esconderia o campo que o status acabou de pedir.
    descricao.mostrarSe = null;
    descricao.obrigatorioSe = null;
    return descricao;
  });
}

/**
 * Confere e grava, na troca de status, os campos que o status pede.
 *
 * Vale o que a tela mandou; o que ela não mandou fica como está no caso. O
 * obrigatório vazio recusa a troca inteira — com o nome de cada campo —, e o
 * valor passa pelas MESMAS conferências do formulário (conferirCampo_ e o
 * "cabe na coluna"). Quem chama sem mandar nada (de fora da tela) também é
 * cobrado: o Retido sem valor não entra por nenhuma porta.
 */
function gravarOsCamposDaSituacao_(canal, quem, atual, situacao, valores, alteracao) {
  var estrutura = estruturaDaAba_(canal.aba);
  var problemas = [];
  camposPedidosPelaSituacao_(canal, quem, situacao).forEach(function (descricao) {
    var veio = Object.prototype.hasOwnProperty.call(valores, descricao.chave);
    var bruto = veio ? valores[descricao.chave]
      : valorPelaGrafiaDaAba_(atual, estrutura, descricao.cabecalho);
    if (bruto === null || bruto === undefined) bruto = '';
    if (typeof bruto === 'string') bruto = bruto.trim();
    var problema = conferirCampo_(descricao, bruto)
      || valorQueNaoCabeNaColuna_(canal.aba, descricao.cabecalho, bruto);
    if (problema) {
      problemas.push(descricao.rotulo + ' — ' + problema);
      return;
    }
    if (veio) alteracao[grafiaDaColuna_(canal.aba, descricao.cabecalho)] = bruto;
  });
  if (problemas.length) {
    throw new Error('Para "' + situacao + '", confira: ' + problemas.join('; ') + '.');
  }
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
  var posicao = posicaoDaColuna_(estrutura, coluna);
  if (posicao < 0) return;
  coluna = estrutura.cabecalhos[posicao];   // a grafia da planilha

  var jaTem = String(registroAtual[coluna] || '').trim();
  if (jaTem) return;
  // Nem o que a pessoa informou NESTE salvamento (Etapa 58): quem muda para
  // Concluído e digita a data da finalização na mesma hora tinha a data dele
  // trocada pelo "agora" do carimbo.
  if (jaVeioNaAlteracao_(alteracao, coluna)) return;

  alteracao[coluna] = carimboParaAColuna_(estrutura, posicao);
}

/** A alteração já traz valor nesta coluna, escrita como a planilha ou não? */
function jaVeioNaAlteracao_(alteracao, coluna) {
  var procurada = normalizarParaComparar_(coluna);
  return Object.keys(alteracao).some(function (chave) {
    var valor = alteracao[chave];
    return normalizarParaComparar_(chave) === procurada
      && String(valor === null || valor === undefined ? '' : valor).trim() !== '';
  });
}

/**
 * O "agora" do carimbo, do jeito que a coluna guarda.
 *
 * Coluna de data recebe a data. A coluna sua — criada direto na planilha —
 * o sistema não sabe que é de data, e grava como texto: um Date ali virava
 * "Wed Oct 14 2026 14:50:59 GMT+0000". Ela recebe "dd/MM/aaaa HH:mm", o mesmo
 * texto do @AGORA. O menu da coluna do carimbo oferece as colunas suas, e é
 * por isso que este cuidado passou a ser necessário.
 */
function carimboParaAColuna_(estrutura, posicao) {
  var tipo = estrutura.tipos[posicao];
  var agora = new Date();
  if (tipo === RECC_TIPO_DE_DADO.DATA || tipo === RECC_TIPO_DE_DADO.DATA_HORA) return agora;
  return Utilities.formatDate(agora, RECC_FUSO_HORARIO, 'dd/MM/yyyy HH:mm');
}

/**
 * A situação do canal que corresponde a este valor gravado.
 *
 * Compara sem acento e sem maiúscula, porque o valor pode ter sido digitado na
 * planilha à mão. Devolve null quando não é situação conhecida — e aí quem
 * chamou decide se isso é erro (o diálogo) ou se é só não carimbar (a edição).
 */
function situacaoDoCanalPeloValor_(canal, valor) {
  var procurado = normalizarParaComparar_(String(valor || '').trim());
  if (!procurado) return null;

  var achada = null;
  situacoesDoCanal_(canal).forEach(function (uma) {
    if (normalizarParaComparar_(uma.gravadoComo) === procurado) achada = uma;
  });
  return achada;
}

/**
 * Carimba a mudança de status vinda de QUALQUER porta.
 *
 * O PO pediu assim: "toda vez que mudar o status dos casos da RET ele deve
 * registrar". Toda vez — e não "toda vez que a pessoa usar o diálogo".
 *
 * O sistema tem duas portas para trocar a situação: o diálogo de situação, que
 * é o gesto de todo dia, e o formulário inteiro, aberto pelo lápis. Antes só o
 * diálogo carimbava. O mesmo caso, na mesma situação, ficava com data ou sem
 * data dependendo de onde a pessoa clicou — e a Produtividade RECC contava só
 * metade, sem errar em nada visível. Número que erra sozinho é o pior tipo.
 *
 * Só age quando a situação MUDOU de verdade: salvar o formulário sem mexer na
 * situação não é mudança, e contaria uma andada que não houve.
 */
function carimbarSeOStatusMudou_(canal, registroAtual, alteracao, quem) {
  if (!canal.colunaDoStatus) return;
  if (!alteracao.hasOwnProperty(canal.colunaDoStatus)) return;

  var agora = String(alteracao[canal.colunaDoStatus] || '').trim();
  var antes = String(registroAtual[canal.colunaDoStatus] || '').trim();
  if (!agora) return;
  if (normalizarParaComparar_(agora) === normalizarParaComparar_(antes)) return;

  // Situação que o catálogo não conhece ainda assim é mudança: as três colunas
  // de rastro registram. O que não dá é carimbar, porque não há coluna
  // declarada para ela — e inventar uma seria pior do que não ter.
  var achada = situacaoDoCanalPeloValor_(canal, agora);
  if (achada) carimbarOStatus_(canal, achada, registroAtual, alteracao);
  registrarAMudancaDeStatus_(canal, registroAtual, alteracao, quem);
}

/**
 * Carimba a situação em que o caso NASCE.
 *
 * Um caso cadastrado agora, em "Não trabalhado", chegou nessa situação agora —
 * e a Produtividade RECC precisa saber disso. Sem este carimbo, todo caso
 * nascido pelo formulário entrava sem data nenhuma, e só passava a ter data
 * quando alguém trocasse a situação pela primeira vez.
 *
 * NÃO vale para importação: lá o caso é antigo, e carimbar "agora" diria que
 * um contato de julho aconteceu hoje. A importação traz as datas da base
 * antiga, pelo de-para.
 */
function carimbarOStatusDeNascimento_(canal, paraGravar) {
  if (!canal.colunaDoStatus) return;

  var achada = situacaoDoCanalPeloValor_(canal, paraGravar[canal.colunaDoStatus]);
  if (!achada) return;

  // `paraGravar` nos dois lugares: se a coluna do carimbo já vier preenchida,
  // o que veio manda. O carimbo nunca reescreve o que alguém informou.
  carimbarOStatus_(canal, achada, paraGravar, paraGravar);

  // Caso que já NASCE trabalhado (cadastrado direto em "1º contato
  // realizado", por exemplo) começa o prazo agora: ele não ficou parado em
  // "Não trabalhado" nem um minuto.
  carimbarAPrimeiraMudancaDeStatus_(canal, null, paraGravar, estruturaDaAba_(canal.aba));
}

/**
 * Carimba QUANDO o caso foi encaminhado para a área.
 *
 * Um momento que só o sistema vê — deduzir de outra data (a de entrada, a da
 * resposta) contaria errado, e pedir ao analista que digite mais uma data seria
 * o jeito mais rápido de ela ficar em branco. Foi pensado para o prazo de 48
 * horas da área; o prazo da Mesa hoje conta de `Data em andamento`, e este
 * carimbo ficou como dado — e como base para um prazo do encaminhamento, se
 * a operação pedir um.
 *
 * QUANDO CARIMBA
 *   a área passou de vazia para escolhida     carimba agora;
 *   a área trocou de uma para outra           carimba agora: é um novo
 *                                             encaminhamento, com prazo novo;
 *   a área foi esvaziada                      limpa o carimbo: o caso voltou
 *                                             para a mesa, e não há prazo.
 * Salvar o formulário sem mexer na área não carimba nada — é o mesmo cuidado
 * do status: só a mudança de verdade conta.
 *
 * Canal sem coluna de área, ou base que ainda não ganhou a coluna do carimbo
 * (quem não rodou `atualizarPGO()`), segue gravando o caso: o diagnóstico é
 * quem cobra o que falta.
 *
 * `registroAtual` é null no cadastro.
 */
function carimbarOEncaminhamento_(canal, registroAtual, paraGravar) {
  var area = String(canal.colunaDaAreaResponsavel || '').trim();
  if (!area || !paraGravar.hasOwnProperty(area)) return;

  var estrutura = estruturaDaAba_(canal.aba);
  if (posicaoDaColuna_(estrutura, RECC_COLUNA_DATA_DO_ENCAMINHAMENTO) < 0) return;

  var agora = String(paraGravar[area] || '').trim();
  var antes = registroAtual ? String(registroAtual[area] || '').trim() : '';
  if (normalizarParaComparar_(agora) === normalizarParaComparar_(antes)) return;

  paraGravar[RECC_COLUNA_DATA_DO_ENCAMINHAMENTO] = agora ? new Date() : '';
}

/**
 * Carimba QUANDO a condição que encerra o prazo passou a valer.
 *
 * Na RET, o prazo do "Retido" só termina quando o Status proposta chega em
 * Transmitido ou Sem alteração — e o Status proposta é um campo, que guarda o
 * valor e não a data em que mudou. Sem este carimbo o sistema saberia QUE o
 * prazo terminou, e não QUANDO: não daria para dizer se foi dentro dos 3 dias.
 *
 * QUANDO CARIMBA, igual ao encaminhamento: o campo mudou de valor.
 *   passou a um valor que encerra     carimba agora;
 *   passou a outro valor, ou a vazio  limpa: o prazo voltou a correr.
 * Salvar sem mexer no campo não carimba nada. Vale para os três jeitos de
 * gravar (cadastro, formulário e troca de status), e a troca de status conta:
 * sair de Retido esvazia o Status proposta, e o carimbo sai junto.
 *
 * Coluna do carimbo que a base ainda não tem (quem não rodou o
 * `atualizarPGO()`) segue gravando o caso, sem carimbo.
 */
function carimbarAParadaDoPrazo_(canal, registroAtual, paraGravar) {
  condicoesDeParadaDoCanal_(canal).forEach(function (sinalizador) {
    var coluna = sinalizador.colunaDaCondicao;
    if (!Object.prototype.hasOwnProperty.call(paraGravar, coluna)) return;

    var estrutura = estruturaDaAba_(canal.aba);
    if (posicaoDaColuna_(estrutura, sinalizador.colunaDaDataDaCondicao) < 0) return;

    var agora = String(paraGravar[coluna] || '').trim();
    var antes = registroAtual ? String(registroAtual[coluna] || '').trim() : '';
    if (normalizarParaComparar_(agora) === normalizarParaComparar_(antes)) return;

    paraGravar[sinalizador.colunaDaDataDaCondicao] =
      condicaoBate_({ valores: sinalizador.valoresDaCondicao }, agora) ? new Date() : '';
  });
}

/**
 * Carimba data e hora quando um campo de LISTA chega num item que carimba.
 *
 * Pedido do PO: os status "1º contato realizado" e "2º contato realizado"
 * viraram um status só, "Contatando", com uma lista ao lado — "1ª tentativa
 * de contato sem sucesso", "2ª tentativa…". As colunas "Data do 1º contato" e
 * "Data do 2º contato" pararam de receber data, porque nenhum status apontava
 * mais para elas. Agora o ITEM da lista aponta, do mesmo jeito que o status:
 * "Coluna que recebe data e hora", em Configurações › Ajustes Gerais.
 *
 * A escolha mora na linha do item no CATÁLOGO (pelo Id), e não no nome dele:
 * trocar o rótulo do item não muda onde ele carimba.
 *
 * AS MESMAS REGRAS DO CARIMBO DE STATUS:
 *   - carimba só quando o campo MUDOU para aquele item (salvar sem mexer não
 *     carimba nada);
 *   - carimba só se a célula estiver vazia: voltar a um item por onde o caso
 *     já passou guarda a data da primeira vez;
 *   - coluna que a base não tem é ignorada, sem estourar — o caso é salvo.
 *
 * O status tem o carimbo dele (carimbarOStatus_), e por isso a lista de
 * STATUS fica de fora daqui: seriam dois carimbos para a mesma mudança.
 */
function carimbarOsItensDeLista_(canal, registroAtual, paraGravar) {
  var estrutura = estruturaDaAba_(canal.aba);
  var doCanal = converterParaIdentificador_(canal.id);
  var catalogo = null;

  lerRegistros_('CAMPOS').forEach(function (campo) {
    if (converterParaIdentificador_(campo.CanalId) !== doCanal) return;
    if (String(campo.TipoCampo || '') !== 'seletor') return;
    var configuracao = lerConfiguracaoDoCampo_(campo);
    var lista = normalizarParaComparar_(configuracao.catalogo);
    if (!lista || lista === 'status') return;
    if (configuracao.separaEm || configuracao.partirEm) return;

    var coluna = grafiaDaColuna_(canal.aba, campo.Cabecalho);
    if (!Object.prototype.hasOwnProperty.call(paraGravar, coluna)) return;
    var agora = String(paraGravar[coluna] || '').trim();
    var antes = registroAtual ? String(registroAtual[coluna] || '').trim() : '';
    if (!agora || normalizarParaComparar_(agora) === normalizarParaComparar_(antes)) return;

    catalogo = catalogo || lerRegistros_('CATALOGO');
    var item = null;
    catalogo.forEach(function (um) {
      if (item) return;
      if (normalizarParaComparar_(um.Tipo) !== lista) return;
      var canalDoItem = converterParaIdentificador_(um.CanalId);
      if (canalDoItem && canalDoItem !== doCanal) return;
      if (normalizarParaComparar_(um.Nome) === normalizarParaComparar_(agora)) item = um;
    });
    if (!item || !String(item.ColunaDeCarimbo || '').trim()) return;

    var posicao = posicaoDaColuna_(estrutura, item.ColunaDeCarimbo);
    if (posicao < 0) return;
    var destino = estrutura.cabecalhos[posicao];   // a grafia da planilha

    var jaTem = registroAtual ? String(registroAtual[destino] || '').trim() : '';
    if (jaTem || String(paraGravar[destino] || '').trim()) return;
    paraGravar[destino] = carimboParaAColuna_(estrutura, posicao);
  });
}

/**
 * As três colunas que TODA mudança de status atualiza, sempre.
 *
 * Diferente do carimbo, que grava só a primeira visita a cada status, estas
 * respondem "quando foi a última vez que alguém mexeu neste caso, quem mexeu
 * e quantas vezes o caso já andou". Um caso que vai e volta entre dois status
 * não mexe em carimbo nenhum — e sem estas colunas ele pareceria parado.
 *
 * É o pedido da operação: toda mudança de status precisa ficar registrada,
 * porque é disso que sai o controle de produtividade.
 *
 * Coluna que não existe na base é ignorada, sem estourar — igual ao carimbo.
 * Quem já tem o PGO instalado e ainda não tem estas colunas continua
 * trabalhando; o diagnóstico é que avisa o que falta.
 */
function registrarAMudancaDeStatus_(canal, registroAtual, alteracao, quem) {
  var estrutura = estruturaDaAba_(canal.aba);

  function temAColuna(cabecalho) {
    return posicaoDaColuna_(estrutura, cabecalho) >= 0;
  }

  if (temAColuna(RECC_COLUNA_QUANDO_MUDOU_O_STATUS)) {
    alteracao[RECC_COLUNA_QUANDO_MUDOU_O_STATUS] = new Date();
  }
  if (temAColuna(RECC_COLUNA_QUEM_MUDOU_O_STATUS)) {
    // `quem.email`, minúsculo: é assim que usuarioAtual_ devolve. `quem.usuario`
    // é a LINHA da aba USUARIOS, e ali a coluna se chama `Email`, com maiúscula.
    // São dois objetos diferentes no mesmo lugar, e trocar um pelo outro grava
    // vazio sem reclamar de nada — um teste pegou isso aqui.
    //
    // Guarda o e-mail, e não o Id: esta coluna é lida na própria planilha e no
    // Power BI, onde um Id de dez dígitos não diz quem trabalhou o caso.
    alteracao[RECC_COLUNA_QUEM_MUDOU_O_STATUS] = quem.email || '';
  }
  carimbarAPrimeiraMudancaDeStatus_(canal, registroAtual, alteracao, estrutura);
  if (temAColuna(RECC_COLUNA_QUANTAS_MUDANCAS_DE_STATUS)) {
    // O valor guardado pode chegar como número, como texto ou vazio — a
    // coluna é editável na planilha. Number('') é 0, e Number('abc') é NaN:
    // os dois viram 0 aqui, então o contador nunca grava lixo.
    var quantas = Number(registroAtual[RECC_COLUNA_QUANTAS_MUDANCAS_DE_STATUS]);
    if (!quantas || quantas < 0) quantas = 0;
    alteracao[RECC_COLUNA_QUANTAS_MUDANCAS_DE_STATUS] = Math.floor(quantas) + 1;
  }
}

/**
 * Carimba a PRIMEIRA vez que o caso sai do status em que nasce.
 *
 * É o início dos 3 dias úteis da RET — "a SLA deve ser somente se o caso mudar
 * de status; casos não trabalhados ficam com a SLA cheia", palavra do PO. Ver
 * `RECC_COLUNA_DATA_DA_PRIMEIRA_MUDANCA_DE_STATUS`.
 *
 * Uma vez só: já carimbado, nada mexe nele — nem o caso que volta para "Não
 * trabalhado" (o prazo já começou e continua correndo). E ir PARA o status de
 * nascimento não é começar: uma linha antiga com o status em branco que passa
 * a "Não trabalhado" continua sem prazo começado.
 *
 * Base sem a coluna (as que não são da RET, ou quem não rodou `atualizarPGO()`)
 * segue gravando, sem carimbo.
 */
function carimbarAPrimeiraMudancaDeStatus_(canal, registroAtual, alteracao, estrutura) {
  var coluna = RECC_COLUNA_DATA_DA_PRIMEIRA_MUDANCA_DE_STATUS;
  if (!canal.colunaDoStatus || posicaoDaColuna_(estrutura, coluna) < 0) return;
  if (registroAtual && String(registroAtual[coluna] || '').trim()) return;
  if (String(alteracao[coluna] || '').trim()) return;

  var novo = normalizarParaComparar_(alteracao[canal.colunaDoStatus]);
  if (!novo || novo === normalizarParaComparar_(statusPadraoDoCanal_(canal))) return;
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
 * O caso aberto em "Trabalhar no caso": os valores do formulário, e o resto
 * da linha como leitura.
 *
 * Os valores vêm pela CHAVE TÉCNICA do campo, que é como o formulário
 * identifica cada caixa — o mesmo formato que `cadastrarCaso` recebe de volta.
 *
 * Desde que o PO tirou a tela de leitura ("não tem necessidade do sistema
 * apenas mostrar o caso"), é aqui que o caso inteiro chega à tela. Por isso
 * vem também `doSistema` — ver abaixo.
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
  // As colunas que algum campo ocupa — inclusive o campo OCULTO para este
  // nível. Elas não podem reaparecer na lista de leitura abaixo: um campo
  // escondido do nível viraria visível pela porta dos fundos.
  var deAlgumCampo = {};

  camposAtivosDoCanal_(canal.id).forEach(function (campo) {
    colunasQueOCampoOcupa_(campo).forEach(function (cabecalho) {
      deAlgumCampo[normalizarParaComparar_(cabecalho)] = true;
    });
    // CAMPO GRAVADO EM VÁRIAS COLUNAS volta JUNTO — quem sabe remontar é
    // `valorDoCampoNaLinha_`. Ler a coluna do próprio campo devolveria um
    // pedaço só, e salvar em seguida apagaria os outros sem ninguém pedir.
    var valor = valorDoCampoNaLinha_(registro, campo, estrutura);
    if (valor === null) return;
    valores[String(campo.ChaveTecnica)] = valor;
  });

  /*
   * E TUDO O MAIS QUE ESTÁ PREENCHIDO NA PLANILHA, como leitura.
   *
   * Pedido antigo do PO, que a tela de leitura atendia e não podia sumir com
   * ela: "precisa trazer todos os dados que foram preenchidos na planilha".
   * Um caso importado chega com valor em colunas que o formulário não
   * pergunta — os carimbos de contato, a origem da importação, a data dela.
   *
   * Só o que TEM VALOR entra. Coluna vazia que ninguém declarou encheria a
   * tela de travessões e esconderia o que importa.
   *
   * É LEITURA, e não campo: deixar reescrever "Quem mudou o status" ou "Data
   * da última mudança de status" à mão estragaria o carimbo de produtividade
   * — o número da pessoa passaria a depender do que alguém digitou, e não do
   * que aconteceu.
   */
  /*
   * A COLUNA SUA SE CORRIGE AQUI. Pedido do PO: "preciso ter a opção de editar
   * esse modal, assim fica mais fácil caso algo fique fora de formato" — e,
   * perguntado, escolheu: só as colunas DELE (as escritas direto na planilha,
   * que nem o contrato nem o formulário conhecem). O carimbo do sistema segue só
   * leitura, pelo motivo de sempre. `editavel` diz qual é qual; quem grava é
   * `editarCaso`, que confere de novo.
   */
  var suas = colunasSuasDaAba_(canal.aba);
  var doSistema = [];
  estrutura.cabecalhos.forEach(function (cabecalho, posicao) {
    var nome = String(cabecalho || '');
    if (!nome || nome.charAt(0) === '_') return;
    if (normalizarParaComparar_(nome) === 'id') return;
    if (deAlgumCampo[normalizarParaComparar_(nome)]) return;

    var valor = paraTexto_(registro[nome], estrutura.tipos[posicao]);
    if (!String(valor).trim()) return;
    doSistema.push({ rotulo: nome, valor: valor,
      editavel: suas[normalizarParaComparar_(nome)] === true });
  });

  return { id: registro.__id, canal: canal.nome, valores: valores, doSistema: doSistema,
    versao: versaoDoCaso_(registro, canal.aba) };
}

/**
 * O retrato de uma linha: muda sempre que qualquer célula do caso muda.
 *
 * É um resumo (FNV-1a de 32 bits) do conteúdo, e não a data da última
 * gravação, porque a planilha não guarda essa data — e quem edita direto na
 * célula também tem de ser percebido.
 */
function versaoDoCaso_(registro, nomeDaAba) {
  var texto = estruturaDaAba_(nomeDaAba).cabecalhos.map(function (cabecalho) {
    var valor = registro[cabecalho];
    if (Object.prototype.toString.call(valor) === '[object Date]') return String(valor.getTime());
    return valor === null || valor === undefined ? '' : String(valor);
  }).join('\u0001');

  var resumo = 0x811c9dc5;
  for (var i = 0; i < texto.length; i++) {
    resumo ^= texto.charCodeAt(i);
    resumo = Math.imul(resumo, 0x01000193) >>> 0;
  }
  return texto.length + '-' + resumo.toString(16);
}

/**
 * Exclui o caso DEFINITIVAMENTE: a linha sai da planilha.
 *
 * Não há desfazer. Por isso a tela pergunta antes, num aviso de atenção (ver
 * `Formulario.confirmarExclusao`), e a auditoria guarda o que havia no caso.
 */
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

/**
 * Parte "12-1391-0000000" nos pedaços que vão para colunas separadas.
 *
 * Pedido do PO: a proposta e a apólice existem no mundo escritas com hífen, e
 * é assim que elas chegam ao analista. Na planilha elas precisam estar em
 * colunas separadas, porque é por elas que o relatório junta.
 *
 * O FORMATO É COBRADO, e isto é o ponto da função. "7-0000000" com duas
 * colunas vale; "70000000" não, porque não há como saber onde o código termina
 * — e adivinhar colocaria o número de uma proposta no campo do código de
 * outra, calado. Pedaço com letra também não: a coluna é de identificador, e
 * o relatório junta por ela.
 *
 * O QUE NÃO É COBRADO: quantos dígitos cada pedaço tem. O PO disse que o
 * código "pode ser 2 números ou um" e não falou do resto — fixar um tamanho
 * aqui recusaria amanhã uma proposta legítima, e o recado não explicaria nada
 * a quem a tem na mão.
 *
 * Lança o erro com o recado pronto para a tela: quem chama o transforma em
 * problema do campo, ao lado dele.
 */
function partirPorHifen_(valor, partir, rotulo) {
  var quantas = partir.colunas.length;
  var texto = String(valor || '').trim();
  var pedacos = texto.split('-').map(function (pedaco) {
    return String(pedaco).trim();
  });

  function recusar(porque) {
    return new Error(porque + ' Escreva com '
      + (quantas - 1) + ' hífen' + (quantas > 2 ? 's' : '')
      + (partir.exemplo ? ', assim: ' + partir.exemplo : '')
      + '. Cada pedaço vai para uma coluna da planilha: '
      + partir.colunas.join(', ') + '.');
  }

  if (pedacos.length !== quantas) {
    throw recusar('"' + texto + '" tem ' + pedacos.length + ' pedaço(s), e o '
      + 'campo "' + rotulo + '" pede ' + quantas + '.');
  }

  for (var i = 0; i < quantas; i++) {
    if (!pedacos[i]) {
      throw recusar('O ' + (i + 1) + 'º pedaço de "' + texto + '" está vazio.');
    }
    if (!/^[0-9]+$/.test(pedacos[i])) {
      throw recusar('O pedaço "' + pedacos[i] + '" tem algo que não é dígito.');
    }
  }
  return pedacos;
}

/**
 * Junta de volta o que `partirPorHifen_` separou, para o formulário de edição.
 *
 * Sem isto, abrir um caso para editar mostraria o campo da proposta VAZIO — o
 * formulário procura a coluna do próprio campo, e o valor está espalhado em
 * duas. A pessoa salvaria achando que não mexeu nele, e o campo em branco
 * apagaria as duas colunas.
 *
 * Pedaço faltando não inventa hífen solto: com um dos lados vazio, devolve o
 * que existe. "7-" na tela pareceria um dado pela metade que alguém digitou,
 * quando é um dado pela metade que estava na planilha.
 */
function juntarComHifen_(registro, partir, estrutura) {
  var pedacos = partir.colunas.map(function (cabecalho) {
    var valor = valorPelaGrafiaDaAba_(registro, estrutura, cabecalho);
    return String(valor === null || valor === undefined ? '' : valor).trim();
  }).filter(function (pedaco) { return pedaco !== ''; });

  return pedacos.join('-');
}

/**
 * Junta o código e o nome de volta no formato da lista: "1101 - VIDA INDIVIDUAL".
 *
 * É o inverso exato de `separarCodigoENome_`, e o espaço em volta do hífen não
 * é enfeite: é o formato que as opções do seletor usam. Remontar como
 * "1101-VIDA INDIVIDUAL" devolveria um valor que a lista não tem, e salvar
 * seria recusado com "não é uma das opções da lista".
 */
function juntarCodigoENome_(registro, separa, estrutura) {
  var noCodigo = valorPelaGrafiaDaAba_(registro, estrutura, separa.codigo);
  var noNome = valorPelaGrafiaDaAba_(registro, estrutura, separa.nome);
  var codigo = String(noCodigo === null || noCodigo === undefined ? '' : noCodigo).trim();
  var nome = String(noNome === null || noNome === undefined ? '' : noNome).trim();

  if (codigo && nome) return codigo + ' - ' + nome;
  return codigo || nome;
}

/**
 * O valor de um campo, remontado a partir das COLUNAS em que ele foi gravado.
 *
 * Existe porque um campo pode morar em MAIS DE UMA coluna, e nesse caso ler a
 * coluna do próprio campo devolve só um pedaço. Eram três casos, tratados em
 * dois lugares diferentes — e eles divergiram, com dois defeitos que a
 * operação sentiu:
 *
 *   `partirEm`  proposta e apólice. A edição já juntava; a antiga tela de
 *               leitura não, e mostrava "0000000" no lugar de "58-0000000".
 *   `separaEm`  o produto. NENHUMA das duas juntava: a leitura mostrava só
 *               "1101", e a edição devolvia "1101" para um seletor cuja lista
 *               só tem "1101 - VIDA INDIVIDUAL" — então salvar um caso da RET
 *               com produto era RECUSADO, num campo que a pessoa nem tocou.
 *
 * Agora é um lugar só. A tela de leitura saiu do sistema ("Trabalhar no caso"
 * abre direto a edição), e a regra continua num ponto só.
 */
function valorDoCampoNaLinha_(registro, campo, estrutura) {
  var configuracao = lerConfiguracaoDoCampo_(campo);

  var separa = configuracao.separaEm;
  if (separa && separa.codigo && separa.nome) {
    return juntarCodigoENome_(registro, separa, estrutura);
  }

  var partir = configuracao.partirEm;
  if (partir && partir.colunas && partir.colunas.length > 1) {
    return juntarComHifen_(registro, partir, estrutura);
  }

  var posicao = posicaoDaColuna_(estrutura, campo.Cabecalho);
  if (posicao < 0) return null;   // null = esta coluna não existe nesta aba
  return paraTexto_(registro[estrutura.cabecalhos[posicao]], estrutura.tipos[posicao]);
}

/**
 * O valor de uma coluna pela GRAFIA QUE ESTÁ NA ABA, e não pela que está em
 * CAMPOS.
 *
 * O DEFEITO QUE ISTO CONSERTA, relatado pelo PO: "na aba Trabalho, ao clicar
 * em Trabalhar no caso, a Descrição não vem junto para ser editada". O campo
 * em CAMPOS se chama "descrição"; na planilha, a coluna pode estar escrita
 * "Descrição" ou "DESCRIÇÃO". Gravar sempre funcionou — a gravação procura a
 * coluna sem ligar para maiúscula, acento ou espaço —, mas o registro lido da
 * planilha tem as chaves EXATAMENTE como estão no cabeçalho, e ler
 * `registro['descrição']` devolvia nada. O campo abria vazio e, pior, salvar o
 * caso em seguida APAGAVA a descrição, porque campo esvaziado na edição é
 * apagado na planilha.
 */
function valorPelaGrafiaDaAba_(registro, estrutura, cabecalho) {
  if (!estrutura) return registro[cabecalho];
  var posicao = posicaoDaColuna_(estrutura, cabecalho);
  return posicao < 0 ? undefined : registro[estrutura.cabecalhos[posicao]];
}

/**
 * As colunas da planilha que um campo ocupa — uma, duas ou três.
 *
 * Quem pergunta é `casoParaEditar`, para saber o que o formulário já mostra
 * antes de listar o resto da linha como leitura. Sem isto, a proposta apareceria duas
 * vezes: uma como campo ("58-0000000") e outra como coluna solta ("58").
 */
function colunasQueOCampoOcupa_(campo) {
  var configuracao = lerConfiguracaoDoCampo_(campo);

  var separa = configuracao.separaEm;
  if (separa && separa.codigo && separa.nome) return [separa.codigo, separa.nome];

  var partir = configuracao.partirEm;
  if (partir && partir.colunas && partir.colunas.length > 1) {
    return partir.colunas.slice();
  }

  return [String(campo.Cabecalho)];
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
function consultarSusep(susep, idDoCanal) {
  var quem = exigirPermissao_(RECC_ACOES.CRIAR);

  var procurada = susepComoSeEscreve_(susep);
  if (!chaveDaSusep_(procurada)) {
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
  /*
   * O CADASTRO DE CORRETORAS É CONSULTADO PRIMEIRO, e isto é decisão do PO.
   *
   * "Corretoras Diamante não podem ter status de bloqueada por gentileza mesmo
   * que o SUSEP esteja na lista de bloqueadas. Pertence a outra lista."
   *
   * São duas listas, com dois donos e dois propósitos. Quem está no cadastro
   * de corretoras é corretora Diamante, e para ela o selo é verde — mesmo que
   * a mesma SUSEP apareça na lista de bloqueios, que é mantida por outra
   * área. A ordem da consulta É a regra: o cadastro primeiro, o bloqueio
   * depois.
   *
   * Isso tem um custo que vale dizer em voz alta: uma SUSEP cadastrada por
   * engano como Diamante passa a sair liberada mesmo estando bloqueada. É o
   * que o PO pediu, e quem corrige é quem mantém o cadastro — tirando a linha
   * de Corretoras, na Tabela Corretoras.
   */
  var corretora = buscarRegistroVisivel_('CORRETORAS', 'SUSEP', procurada);

  if (corretora) {
    return {
      situacao: 'OK',
      susep: susepComoSeEscreve_(corretora.SUSEP) || procurada,
      corretora: String(corretora.Corretora || ''),
      sucursal: String(corretora.Sucursal || ''),
      segmento: String(corretora.Segmento || 'Não encontrado'),
      consultor: String(corretora.Consultor || ''),
      mensagem: 'SUSEP liberada'
    };
  }

  /*
   * A LISTA DE BLOQUEIOS SÓ É CONSULTADA SE O CANAL PEDIR.
   *
   * Palavra do PO: "no formulário de Mesa diamante não há necessidade de
   * verificar se a SUSEP está ou não bloqueada, pode remover esse detalhe".
   * Quem decide é a coluna CANAIS.ConfereSusepBloqueada, e não o nome do
   * canal escrito aqui dentro — amanhã a regra muda e ninguém vai querer
   * mexer em código para isso.
   *
   * Sem canal informado, confere. É o caso de quem chama de fora de um
   * formulário, e na dúvida a resposta mais completa é a mais segura.
   *
   * E economiza a leitura mais caro do selo: a coluna da aba de SUSEPs
   * bloqueadas, que a operação vai encher com 16 mil linhas.
   */
  if (!deveConferirOBloqueio_(idDoCanal, quem)) {
    return {
      situacao: 'NAO_ENCONTRADA',
      susep: procurada,
      segmento: 'Não encontrado',
      mensagem: 'SUSEP não encontrada no cadastro de corretoras'
    };
  }

  var bloqueada = buscarRegistroVisivel_('SUSEP_BLOQUEADAS', 'SUSEP', procurada);

  if (bloqueada) {
    // Quem bloqueou muda o selo: pela companhia é vermelho, pela corretora é
    // âmbar. Sem tipo — linha antiga, que ninguém classificou — fica vermelho,
    // que é o lado seguro.
    var por = quemBloqueou_(bloqueada.BloqueadaPor);
    return {
      situacao: 'BLOQUEADA',
      bloqueadaPor: por,
      susep: susepComoSeEscreve_(bloqueada.SUSEP) || procurada,
      corretora: String(bloqueada.NomeCorretora || ''),
      sucursal: String(bloqueada.Sucursal || ''),
      coordenadorComercial: String(bloqueada.CoordenadorComercial || ''),
      mensagem: 'SUSEP bloqueada'
        + (por ? ' pela ' + por.toLowerCase() : '')
        + (bloqueada.NomeCorretora ? ' — ' + bloqueada.NomeCorretora : '')
    };
  }

  return {
    situacao: 'NAO_ENCONTRADA',
    susep: procurada,
    segmento: 'Não encontrado',
    mensagem: 'SUSEP não encontrada no cadastro de corretoras'
  };
}

/**
 * Este canal confere a lista de SUSEPs bloqueadas?
 *
 * Canal que não existe, ou que esta pessoa não enxerga, cai no SIM: a
 * pergunta "o canal dispensa a conferência?" só tem resposta confiável para
 * um canal de verdade, e na dúvida conferir é o lado seguro.
 */
function deveConferirOBloqueio_(idDoCanal, quem) {
  var alvo = converterParaIdentificador_(idDoCanal);
  if (!alvo) return true;

  var canal = canaisQueEuVejo_(quem).filter(function (um) {
    return converterParaIdentificador_(um.id) === alvo;
  })[0];

  return canal ? canal.confereSusepBloqueada !== false : true;
}

// ============================================================================
// O SELO DA PROPOSTA
// ============================================================================

/**
 * A mesma proposta já cadastrada no MESMO MÊS, e com quem ela está.
 *
 * Pedido do PO: "na RET queria que houvesse um identificador de propostas
 * duplicadas num único mês e/ou que identificasse quando aquela proposta está
 * com o analista (...) algo pequeno mas que sinalizasse, tipo os das SUSEPs
 * bloqueadas".
 *
 * SINALIZA, NÃO IMPEDE. O selo aparece abaixo do campo, como o da SUSEP, e o
 * cadastro segue normal. Quem decide se a repetição é erro ou é um segundo
 * pedido do mesmo cliente é quem está atendendo — o sistema só não deixa
 * passar sem ninguém ver.
 *
 * QUAL CANAL: o que tem o campo da proposta gravando em pedaços (o
 * `partirEm` do campo `numerodaproposta`) — hoje, só a RET. Não há coluna
 * nova em CANAIS para ligar isto: canal sem proposta não tem o que repetir.
 *
 * QUAL MÊS: o da data do caso, que é a coluna de data do canal. Com a data
 * ainda em branco no formulário, vale o mês de hoje — é nele que o servidor
 * vai carimbar a entrada do caso (ver preencherEntradaAutomatica_).
 *
 * NA EDIÇÃO, o próprio caso não conta: `idDoCasoAberto` sai da conta, senão
 * todo caso aberto acusaria a si mesmo.
 *
 * O CUSTO segue a regra da busca — ler a coluna antes de ler as linhas: lê a
 * coluna do NÚMERO da proposta, e só as linhas em que ele bateu, que costumam
 * ser nenhuma ou uma.
 */
function conferirPropostaRepetida(proposta, idDoCanal, dataDoCaso, idDoCasoAberto) {
  var quem = exigirPermissao_(RECC_ACOES.CRIAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var partir = partirDaPropostaDoCanal_(canal);
  if (!partir) return { situacao: 'SEM_PROPOSTA', mensagem: '' };

  // Proposta pela metade não é conferida: o formato errado já é recusado ao
  // salvar, com a mensagem que diz como escrever. O selo só ficaria calado.
  var pedacos;
  try {
    pedacos = partirPorHifen_(proposta, partir, 'Número da proposta');
  } catch (erro) {
    return { situacao: 'VAZIA', mensagem: '' };
  }

  var mes = converterParaData_(dataDoCaso) || new Date();
  var nomeDoMes = RECC_NOMES_DOS_MESES[mes.getMonth()] + ' de ' + mes.getFullYear();

  // 1. Só a coluna do número — o último pedaço, o que distingue a proposta.
  var colunaDoNumero = partir.colunas[partir.colunas.length - 1];
  var numero = pedacos[pedacos.length - 1];
  var estrutura = estruturaDaAba_(canal.aba);
  // Etapa 63: o localizador do Sheets aponta as linhas, sem trazer a coluna.
  // As apontadas são conferidas abaixo, pedaço por pedaço, como sempre.
  var linhas = linhasDaBuscaRapida_(estrutura,
    exigirPosicaoDaColuna_(estrutura, colunaDoNumero), numero, true, true);
  if (linhas === null) {
    linhas = [];
    lerColunaInteira_(canal.aba, colunaDoNumero).forEach(function (valor, i) {
      if (converterParaIdentificador_(valor) === numero) linhas.push(i + 2);
    });
  }

  // 2. Só as linhas em que bateu: confere os outros pedaços, o mês e o Id.
  var colunaDoAnalista = colunaDoResponsavel_(estrutura);
  var abertoAgora = converterParaIdentificador_(idDoCasoAberto);

  var repetidas = lerLinhasEspecificas_(canal.aba, linhas).filter(function (registro) {
    if (normalizarParaComparar_(registro._Visivel) === 'nao') return false;
    if (abertoAgora && registro.__id === abertoAgora) return false;

    var mesmosPedacos = partir.colunas.every(function (cabecalho, i) {
      return converterParaIdentificador_(registro[cabecalho]) === pedacos[i];
    });
    if (!mesmosPedacos) return false;

    var quando = canal.colunaDaData ? converterParaData_(registro[canal.colunaDaData]) : '';
    return quando !== '' && quando.getMonth() === mes.getMonth()
      && quando.getFullYear() === mes.getFullYear();
  }).map(function (registro) {
    return {
      id: registro.__id,
      analista: colunaDoAnalista ? String(registro[colunaDoAnalista] || '').trim() : '',
      situacao: canal.colunaDoStatus
        ? String(registro[canal.colunaDoStatus] || '').trim() : ''
    };
  });

  if (!repetidas.length) {
    return {
      situacao: 'UNICA',
      mensagem: 'Nenhuma outra com esta proposta em ' + nomeDoMes + '.'
    };
  }

  // "com a Ana Martins (caso 0000000012, Pendente)" — quem está com ela é a
  // pergunta que o PO fez, então é a primeira coisa que o selo responde.
  var quais = repetidas.map(function (uma) {
    return (uma.analista ? 'com ' + uma.analista : 'sem analista')
      + ' (caso ' + uma.id + (uma.situacao ? ', ' + uma.situacao : '') + ')';
  });
  return {
    situacao: 'REPETIDA',
    mensagem: 'Já cadastrada em ' + nomeDoMes + ': ' + quais.join('; ') + '.',
    casos: repetidas
  };
}

/**
 * Como o canal parte a proposta em colunas — ou null, se ele não tem proposta.
 *
 * Vem do campo, e não de uma lista de nomes de coluna escrita aqui: quem
 * mudar as colunas da proposta em Configurações muda também a conferência.
 */
function partirDaPropostaDoCanal_(canal) {
  var campo = camposAtivosDoCanal_(canal.id).filter(function (um) {
    return normalizarParaComparar_(um.ChaveTecnica) === 'numerodaproposta';
  })[0];
  if (!campo) return null;

  var partir = lerConfiguracaoDoCampo_(campo).partirEm;
  if (!partir || !partir.colunas || partir.colunas.length < 2) return null;

  var estrutura = estruturaDaAba_(canal.aba);
  var todasExistem = partir.colunas.every(function (cabecalho) {
    return posicaoDaColuna_(estrutura, cabecalho) >= 0;
  });
  return todasExistem ? partir : null;
}

/* ############################################################################
   #
   #  SEÇÃO 3 de 3 · ACHAR UM CASO QUE A FILA NÃO MOSTRA MAIS
   #
   ############################################################################ */

/**
 * ============================================================================
 * Achar um caso que a fila não mostra mais
 * ============================================================================
 * O Trabalho mostra o período escolhido, e abre do dia 1 do mês até hoje.
 * Isso é de propósito: ele responde
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
    // Os casos arquivados (Etapa 66): a busca também procura lá.
    historico: { ligado: String(valorDaConfiguracao_(RECC_CHAVE_DO_HISTORICO_DA_BASE, '')).trim() !== '' },
    minimo: RECC_MINIMO_DO_TERMO,
    maximo: RECC_MAXIMO_DA_BUSCA,
    escopo: quem.permissoes.escopo
  };
}

/**
 * Procura o termo nos canais escolhidos e, se estiver ligada, na base legada.
 *
 * `ondeProcurar` é a lista de ids de canal; vazio procura em todas as que a
 * pessoa enxerga. `incluirLegado` diz se a planilha antiga entra.
 */
function buscarCasos(termo, ondeProcurar, incluirLegado, incluirHistorico) {
  var quem = exigirTela_('buscarCaso');

  var procurado = String(termo || '').trim();
  if (procurado.length < RECC_MINIMO_DO_TERMO) {
    throw new Error('Digite ao menos ' + RECC_MINIMO_DO_TERMO + ' caracteres. ' +
      'Com menos que isso a busca traria meia base, e nenhuma delas seria a ' +
      'que você procura.');
  }

  var escolhidas = listaDaTela_(ondeProcurar).map(converterParaIdentificador_);
  var resultados = [];

  // E procura SÓ nos canais desta pessoa. A tela não oferecer os outros não
  // basta: a chamada existe, e nada impede mandar o Id de um canal alheio.
  canaisQueEuVejo_(quem).forEach(function (canal) {
    if (escolhidas.length && escolhidas.indexOf(converterParaIdentificador_(canal.id)) < 0) {
      return;
    }
    resultados.push(procurarNoCanal_(canal, procurado, quem));
    // O que foi arquivado deste canal (Etapa 66) — só leitura.
    if (incluirHistorico) {
      var doHistorico = procurarNoHistorico_(canal, procurado, quem);
      if (doHistorico) resultados.push(doHistorico);
    }
  });

  if (incluirLegado) {
    var doLegado = procurarNoLegado_(procurado);
    if (doLegado) resultados.push(doLegado);
  }

  var total = resultados.reduce(function (soma, origem) {
    return soma + origem.casos.length;
  }, 0);

  // Só QUANTOS achou, nunca o termo: quem procura digita CPF e nome de
  // segurado, e a auditoria é, por contrato, sem dado pessoal.
  registrarAuditoria_('busca', 'BUSCA', '', total + ' resultado(s)');
  return {
    termo: procurado,
    total: total,
    origens: resultados,
    // A mesma resposta da fila do Trabalho: "Trabalhar no caso" e "Alterar
    // status" aparecem só para quem pode editar — o servidor recusaria.
    podeEditar: podeFazer_(quem.permissoes, RECC_ACOES.EDITAR)
  };
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
  comAGrafiaDaAba_(canal);
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
      aviso: 'Este canal não declarou em quais colunas procurar. ' +
        'Isso se ajusta em Configurações › Canais de trabalho.'
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

  // O alcance vem ANTES do corte: os 100 lugares são dos casos que eu posso ver.
  ordemDasLinhas = linhasNoMeuAlcance_(canal.aba, ordemDasLinhas, quem);

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
 * Procura no HISTÓRICO do canal (Etapa 66): a aba HIST_<aba> da planilha de
 * histórico, com as mesmas colunas de busca e o mesmo alcance da base. Volta
 * SÓ LEITURA: o caso arquivado está encerrado, e editar lá não voltaria para
 * cá. Sem nada arquivado deste canal, não volta origem nenhuma.
 */
function procurarNoHistorico_(canal, termo, quem) {
  var id = String(valorDaConfiguracao_(RECC_CHAVE_DO_HISTORICO_DA_BASE, '')).trim();
  if (!id) return null;
  comAGrafiaDaAba_(canal);
  var origem = { tipo: 'historico', id: canal.id, nome: canal.nome + ' · histórico',
    icone: canal.icone, colunas: colunasDaFila_(canal), casos: [], somenteLeitura: true, aviso: '' };
  var aba;
  try {
    aba = abrirPlanilhaDeFora_(id).getSheetByName(RECC_PREFIXO_DO_HISTORICO + canal.aba);
  } catch (erro) {
    origem.aviso = 'O histórico não abriu: ' + erro.message;
    return origem;
  }
  if (!aba || aba.getLastRow() < 2) return null;

  var total = aba.getLastRow() - 1;
  var largura = aba.getLastColumn();
  var cabecalhos = aba.getRange(1, 1, 1, largura).getValues()[0].map(function (v) {
    return String(v === null || v === undefined ? '' : v).trim();
  });
  var onde = {};
  cabecalhos.forEach(function (cabecalho, i) { if (cabecalho) onde[normalizarParaComparar_(cabecalho)] = i; });

  var linhas = [];
  var jaAchada = {};
  colunasDaBusca_(canal).forEach(function (coluna) {
    var i = onde[normalizarParaComparar_(coluna.cabecalho)];
    if (i === undefined) return;
    aba.getRange(2, i + 1, total, 1).getValues().forEach(function (valor, k) {
      if (!jaAchada[k + 2] && casaComOTermo_(valor[0], termo, coluna.tipo)) {
        jaAchada[k + 2] = true;
        linhas.push(k + 2);
      }
    });
  });
  if (!linhas.length) return origem;

  linhas.sort(function (uma, outra) { return uma - outra; });
  if (linhas.length > RECC_MAXIMO_DA_BUSCA) {
    origem.aviso = 'A busca achou ' + linhas.length + ' casos no histórico e mostra os '
      + RECC_MAXIMO_DA_BUSCA + ' mais recentes.';
    linhas = linhas.slice(-RECC_MAXIMO_DA_BUSCA);
  }
  var iId = onde[normalizarParaComparar_('Id')];
  var registros = linhas.map(function (linha) {
    var valores = aba.getRange(linha, 1, 1, largura).getValues()[0];
    var registro = { __linha: linha };
    cabecalhos.forEach(function (cabecalho, i) { if (cabecalho) registro[cabecalho] = valores[i]; });
    registro.__id = iId === undefined ? '' : converterParaIdentificador_(valores[iId]);
    return registro;
  });
  origem.casos = montarFila_(filtrarPeloAlcance_(registros, canal.aba, quem), canal);
  return origem;
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
  dados = dadosDaTela_(dados);

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

/* ############################################################################
   #
   #  SEÇÃO 4 de 4 · A IMPORTAÇÃO — TRAZER UMA BASE INTEIRA DE FORA
   #
   ############################################################################ */

/**
 * ============================================================================
 * A IMPORTAÇÃO
 * ============================================================================
 * Importar é trazer casos de OUTRA planilha para dentro do PGO, de uma vez: a
 * base de inadimplentes do Vida Individual, a do Vida em Grupo, a lista de
 * corretoras que a Mesa vai tratar com ação diferenciada. Cem casos, trezentos
 * casos, e geralmente toda semana.
 *
 * Por que não é "cadastrar caso num laço": porque as perguntas são outras.
 *
 *   ONDE ESTÁ O DADO. Numa planilha de fora, com os cabeçalhos DELA. Ninguém
 *   vai renomear as colunas da base de inadimplentes para agradar o PGO, então
 *   quem se adapta é o PGO: a importação casa cabeçalho com cabeçalho, sugere
 *   o que reconhece e deixa a pessoa corrigir o resto.
 *
 *   DE QUEM É O CASO. Uma base de trezentos chega sem responsável. O pedido da
 *   operação é dividir entre os analistas — então a importação distribui, em
 *   rodízio, entre os nomes escolhidos.
 *
 *   E SE JÁ ENTROU ANTES. A base é atualizada toda semana, e boa parte dela
 *   repete. Sem uma coluna que identifique o caso, o segunda importação
 *   duplica tudo. Com ela, o que já está dentro é PULADO, e o laudo diz quantos.
 *
 * A IMPORTAÇÃO NUNCA GRAVA SEM MOSTRAR ANTES. `conferirImportacaoDeCasos` devolve o
 * laudo — quantas linhas, para onde cada coluna vai, quantas serão puladas e
 * as três primeiras já traduzidas. `importarCasos` só então grava. Trezentas
 * linhas erradas dentro da base se desfazem apagando trezentas linhas na mão.
 * ============================================================================
 */

/**
 * O teto de linhas por importação.
 *
 * Não é medo de volume: `inserirVariosRegistros_` grava tudo numa ida só, e
 * duas mil linhas passam folgado dentro dos seis minutos. O teto existe porque
 * acima disso quem errou o mapeamento erra em escala — e porque uma base de
 * dez mil linhas colada numa caixa de texto quase nunca é o que a pessoa
 * queria fazer.
 */
const RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO = 2000;

/** Quantas linhas do laudo vêm já traduzidas, para a pessoa conferir. */
const RECC_LINHAS_DE_AMOSTRA = 3;

// ----------------------------------------------------------------------------
// LER A FONTE
// ----------------------------------------------------------------------------

/**
 * Transforma o texto colado numa grade de linhas e colunas.
 *
 * Aceita TABULAÇÃO e PONTO E VÍRGULA, e decide pela primeira linha: copiar de
 * uma planilha e colar dá tabulação; salvar como CSV em português dá ponto e
 * vírgula. Vírgula NÃO entra na disputa de propósito — "R$ 1.234,56" e
 * "Silva, João" são dado comum aqui, e um separador que parte esses dois no
 * meio erraria calado, deslocando todas as colunas da linha em diante.
 */
function separarTextoColado_(texto) {
  var inteiro = String(texto || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  var linhas = inteiro.split('\n').filter(function (uma) {
    return String(uma).trim() !== '';
  });
  if (!linhas.length) return [];

  var separador = linhas[0].indexOf('\t') >= 0 ? '\t' : ';';
  return linhas.map(function (uma) {
    return uma.split(separador).map(function (celula) {
      // Planilha exporta texto com aspas em volta quando ele tem o separador
      // dentro. Tirar as aspas das pontas é o mínimo para o valor chegar limpo.
      var valor = String(celula).trim();
      if (valor.length > 1 && valor.charAt(0) === '"'
        && valor.charAt(valor.length - 1) === '"') {
        valor = valor.substring(1, valor.length - 1).replace(/""/g, '"');
      }
      return valor;
    });
  });
}

/**
 * A grade de uma aba de OUTRA planilha, pelo Id e pelo nome da aba.
 *
 * Lê tudo de uma vez — uma ida só ao serviço. Ler linha por linha numa base de
 * trezentas seriam trezentas idas, e o pedágio de 25 ms cada come a execução.
 */
function gradeDeOutraPlanilha_(idDaPlanilha, nomeDaAba) {
  var planilha = abrirPlanilhaDeFora_(idDaPlanilha);
  var procurado = String(nomeDaAba || '').trim();

  var aba = procurado ? planilha.getSheetByName(procurado) : planilha.getSheets()[0];
  if (!aba) {
    throw new Error('A planilha abriu, mas não tem uma aba chamada "' + procurado
      + '". As abas dela são: ' + planilha.getSheets().map(function (uma) {
        return uma.getName();
      }).join(', ') + '.');
  }

  var ultima = aba.getLastRow();
  var largura = aba.getLastColumn();
  if (ultima < 1 || largura < 1) return [];

  // getDisplayValues, e não getValues: o valor vem como a pessoa VÊ na tela da
  // outra planilha. Um CPF formatado como texto ali chega inteiro; como número,
  // chegaria sem o zero à esquerda. E a data chega no formato que ela mostra,
  // que é o que converterParaData_ já sabe ler.
  return aba.getRange(1, 1, ultima, largura).getDisplayValues();
}

/** A grade, venha ela do texto colado ou de outra planilha. */
function gradeDaFonte_(fonte) {
  var tipo = normalizarParaComparar_((fonte || {}).tipo);
  if (tipo === 'planilha') {
    return gradeDeOutraPlanilha_(fonte.planilhaId, fonte.aba);
  }
  return separarTextoColado_((fonte || {}).texto);
}

// ----------------------------------------------------------------------------
// CASAR AS COLUNAS
// ----------------------------------------------------------------------------

/**
 * Para cada cabeçalho da fonte, qual coluna do canal ele parece ser.
 *
 * O casamento é por nome normalizado — acento e caixa não contam, que é a
 * mesma regra que o resto do sistema usa para achar coluna. Sugere apenas: a
 * pessoa confirma ou troca cada um na tela, e o que ela mandar é o que vale.
 *
 * Coluna preenchida pelo sistema NÃO é sugerida. O carimbo do 1º contato, a
 * origem da importação e a data dele são do sistema; deixar a fonte escrever
 * ali apagaria o controle de produtividade com dado de outra planilha.
 */
function sugerirDeParaDaImportacao_(cabecalhosDaFonte, canal) {
  // A lista do que PODE ser destino é uma só, e é a mesma que a tela oferece.
  // Já errei isto aqui: eu montava a lista pelo contrato, pulando as colunas do
  // sistema, e depois acrescentava "tudo o que está na aba e ainda não entrou"
  // para pegar as colunas criadas em Configurações. Só que as do sistema tinham
  // acabado de ficar de fora — então a segunda volta as trazia de novo, e o
  // carimbo do 1º contato voltava a ser sugerido como destino.
  var porNome = {};
  colunasQueAImportacaoSugere_(canal).forEach(function (cabecalho) {
    porNome[normalizarParaComparar_(cabecalho)] = cabecalho;
  });
  var lembrado = deParaLembrado_(canal);

  return cabecalhosDaFonte.map(function (cabecalho) {
    var daFonte = normalizarParaComparar_(cabecalho);
    // Primeiro o que a pessoa escolheu na última importação do canal (Etapa
    // 48) — inclusive o "não trazer". Só vale se a coluna ainda pode ser
    // sugerida: coluna que sumiu, ou carimbo, cai na regra do nome.
    if (Object.prototype.hasOwnProperty.call(lembrado, daFonte)) {
      var escolhida = normalizarParaComparar_(lembrado[daFonte]);
      if (!escolhida || porNome[escolhida]) {
        return { daFonte: String(cabecalho || ''), paraAColuna: escolhida ? porNome[escolhida] : '',
          lembrado: true };
      }
    }
    return {
      daFonte: String(cabecalho || ''),
      paraAColuna: porNome[daFonte] || ''
    };
  });
}

/*
 * O DE-PARA LEMBRADO (Etapa 48, pedido do PO): a importação de cada canal
 * guarda, ao gravar, para qual coluna foi cada cabeçalho da planilha de origem
 * — e a próxima já abre assim. A base que chega toda semana com os mesmos
 * cabeçalhos ("Nome do segurado", "Cod Proposta"…) não precisa ser casada de
 * novo, e ninguém precisa renomear coluna nenhuma da base para o nome casar.
 *
 * Fica na CONFIG, uma chave por canal, e vale para todo mundo que importa. A
 * importação seguinte soma ao que já estava: um cabeçalho que não veio desta
 * vez continua lembrado.
 */
const RECC_CHAVE_DO_DE_PARA_LEMBRADO = 'IMPORTACAO.DEPARA.';

/** { cabeçalho da origem (normalizado): coluna do canal, ou '' para "não trazer" }. */
function deParaLembrado_(canal) {
  var texto = valorDaConfiguracao_(RECC_CHAVE_DO_DE_PARA_LEMBRADO + canal.id, '');
  if (!texto) return {};
  try {
    var lido = JSON.parse(texto);
    return lido && typeof lido === 'object' && !Array.isArray(lido) ? lido : {};
  } catch (erro) {
    // Alguém mexeu na célula e deixou um texto que não é JSON: esquece e casa
    // pelo nome, como antes. Quebrar a importação por isso seria pior.
    return {};
  }
}

function lembrarODeParaDoCanal_(canal, dePara) {
  var lembrado = deParaLembrado_(canal);
  (dePara || []).forEach(function (par) {
    var daFonte = normalizarParaComparar_((par || {}).daFonte);
    if (!daFonte) return;
    lembrado[daFonte] = String(par.paraAColuna || '').trim();
  });
  gravarConfiguracao_(RECC_CHAVE_DO_DE_PARA_LEMBRADO + canal.id, JSON.stringify(lembrado));
}

/*
 * DUAS LISTAS, E A DIFERENÇA ENTRE ELAS É O PEDIDO DO PO.
 *
 * `Sugere` é o que a importação casa SOZINHA, olhando o nome da coluna.
 * `Aceita` é o que ela deixa a pessoa escolher no de-para.
 *
 * Elas eram uma só, e isso custava caro: o carimbo do 1º contato ficava fora
 * das duas, então 300 casos trazidos da base antiga entravam SEM data de
 * contato — e a Produtividade RECC dizia "Já contatados: 0" para uma leva
 * inteira de casos que tinham sido contatados, com a data guardada na planilha
 * de origem. O número estava errado e parecia certo.
 *
 * Sugerir continua proibido, e por um motivo que não mudou: uma coluna da
 * fonte chamada "Data do 1º contato" casando sozinha escreveria no controle de
 * produtividade sem ninguém decidir isso. Escolher, agora, pode — é uma
 * decisão consciente, tomada na tela de conferência, olhando as três primeiras
 * linhas já traduzidas.
 */

/** O que a importação casa sozinha: nada que o sistema preencha. */
function colunasQueAImportacaoSugere_(canal) {
  var doSistema = colunasPreenchidasPeloSistema_(canal);

  return estruturaDaAba_(canal.aba).cabecalhos.filter(function (cabecalho) {
    if (!cabecalho || cabecalho.charAt(0) === '_') return false;
    return !doSistema[normalizarParaComparar_(cabecalho)];
  });
}

/**
 * O que a importação aceita como destino, se a pessoa escolher.
 *
 * É a lista do `Sugere` MAIS as colunas de carimbo. Elas voltam porque a base
 * antiga sabe quando cada contato aconteceu, e essa é a única forma de esse
 * dado entrar — o sistema não tem como inventá-lo, e carimbar "agora" diria
 * que um contato de julho aconteceu hoje.
 *
 * O que NÃO volta, em hipótese nenhuma, é a origem e a data da importação:
 * essas duas são o rastro do próprio lote, e deixar a fonte escrevê-las
 * apagaria a única forma de saber de onde cada caso veio.
 */
function colunasQueAImportacaoAceita_(canal) {
  var carimbos = colunasDeCarimboDoCanal_(canal);
  var doSistema = colunasPreenchidasPeloSistema_(canal);

  return estruturaDaAba_(canal.aba).cabecalhos.filter(function (cabecalho) {
    if (!cabecalho || cabecalho.charAt(0) === '_') return false;
    var chave = normalizarParaComparar_(cabecalho);
    if (carimbos[chave]) return true;
    return !doSistema[chave];
  });
}

/** As colunas que o esquema marcou como preenchidas pelo sistema. */
function colunasPreenchidasPeloSistema_(canal) {
  var doSistema = {};
  esquemaDaAba_(canal.aba).colunas.forEach(function (coluna) {
    if (coluna.preenchidoPeloSistema === true) {
      doSistema[normalizarParaComparar_(coluna.cabecalho)] = true;
    }
  });
  return doSistema;
}

/**
 * As colunas em que os status deste canal carimbam.
 *
 * Sai do CATÁLOGO, e não de uma lista escrita aqui: o administrador cria
 * status novos em Configurações e aponta cada um para a sua coluna. Uma lista
 * fixa no código cobriria os sete de fábrica e deixaria de fora justamente os
 * que a operação criou depois — que são os que ela mais quer trazer.
 *
 * A origem e a data da importação NUNCA entram, mesmo que alguém aponte um
 * status para elas por engano: elas são o rastro do lote.
 */
function colunasDeCarimboDoCanal_(canal) {
  var nunca = {};
  nunca[normalizarParaComparar_(RECC_COLUNA_ORIGEM_DA_IMPORTACAO)] = true;
  nunca[normalizarParaComparar_(RECC_COLUNA_DATA_DA_IMPORTACAO)] = true;

  var carimbos = {};
  situacoesDoCanal_(canal).forEach(function (situacao) {
    var coluna = normalizarParaComparar_(situacao.colunaDeCarimbo);
    if (coluna && !nunca[coluna]) carimbos[coluna] = true;
  });
  return carimbos;
}

// ----------------------------------------------------------------------------
// O LAUDO, ANTES DE GRAVAR
// ----------------------------------------------------------------------------

/**
 * O que a importação vai fazer, sem fazer.
 *
 * Devolve o de-para sugerido, quantas linhas entram, quantas repetem e as
 * primeiras já traduzidas. É esta tela que evita o desastre: mapeamento errado
 * só aparece olhando o dado traduzido, e nunca olhando o cabeçalho.
 */
function conferirImportacaoDeCasos(idDoCanal, pedido) {
  var quem = exigirPermissao_(RECC_ACOES.IMPORTAR);
  exigirTela_('importacao');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  pedido = pedido || {};

  var grade = gradeDaFonte_(pedido.fonte);
  if (grade.length < 2) {
    throw new Error('Preciso de pelo menos duas linhas: a primeira com os '
      + 'nomes das colunas e ao menos uma de dado. Recebi ' + grade.length + '.');
  }

  var cabecalhosDaFonte = grade[0];
  var corpo = grade.slice(1);
  var deParaEscolhido = Array.isArray(pedido.dePara) && pedido.dePara.length
    ? pedido.dePara
    : sugerirDeParaDaImportacao_(cabecalhosDaFonte, canal);

  var regra = regraDeRepeticao_(canal, pedido.colunaQueIdentifica);
  var premios = premiosDoDePara_(deParaEscolhido, canal);
  var contagem = contarOQueEntraEOQuePula_(corpo, cabecalhosDaFonte,
    deParaEscolhido, regra, premios);

  return {
    canal: { id: canal.id, nome: canal.nome, aba: canal.aba },
    cabecalhosDaFonte: cabecalhosDaFonte,
    colunasDoCanal: colunasQueAImportacaoAceita_(canal),
    // Quais das oferecidas são CARIMBO. A tela marca essas na lista: escolher
    // uma delas escreve no controle de produtividade, e quem está mapeando
    // precisa saber disso antes, não depois.
    colunasDeCarimbo: Object.keys(colunasDeCarimboDoCanal_(canal)).length
      ? colunasQueAImportacaoAceita_(canal).filter(function (cabecalho) {
        return colunasDeCarimboDoCanal_(canal)[normalizarParaComparar_(cabecalho)];
      })
      : [],
    dePara: deParaEscolhido,
    linhasNaFonte: corpo.length,
    vaoEntrar: contagem.entram,
    vaoSerPuladas: contagem.pulam,
    motivosParaPular: contagem.motivos,
    limite: RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO,
    passaDoLimite: corpo.length > RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO,
    amostra: contagem.amostra,
    analistas: analistasParaDistribuir_(canal),
    foraDaDivisao: quemEstaForaDaDivisao_(canal),
    statusPadrao: statusDoLote_(canal, pedido.statusDoLote),
    premios: premios,
    dataDeRecepcao: dataDeRecepcaoNaImportacao_(canal)
  };
}

/**
 * A opção "proposta no mesmo mês" da importação, como a tela a envia.
 *
 * Começa com @ porque não pode ser confundida com o nome de uma coluna — as
 * outras opções da mesma lista são cabeçalhos da base.
 */
const RECC_REPETIR_PELA_PROPOSTA_NO_MES = '@PROPOSTA_NO_MES';

/**
 * Como a importação reconhece um caso REPETIDO — ou null, para trazer tudo.
 *
 * Duas regras, escolhidas na tela:
 *
 *   UMA COLUNA         a que já existia. O valor daquela coluna está na base,
 *                      em qualquer mês, ou repete dentro do próprio arquivo.
 *
 *   PROPOSTA NO MÊS    pedido do PO para a RET: "casos importados com a mesma
 *                      proposta não irem para divisão". Código E número iguais,
 *                      no MESMO MÊS do caso — a mesma regra do selo do
 *                      cadastro, perguntada e escolhida: a mesma proposta em
 *                      outro mês é pedido novo do cliente, e entra.
 *
 * O laudo e a gravação usam esta MESMA regra (ver ehRepetido_). Se o laudo
 * contasse por uma e a gravação gravasse por outra, a tela prometeria um
 * número e a base receberia outro.
 */
function regraDeRepeticao_(canal, escolha) {
  var escolhida = String(escolha || '').trim();
  if (!escolhida) return null;

  if (escolhida !== RECC_REPETIR_PELA_PROPOSTA_NO_MES) {
    return { coluna: escolhida, jaDentro: jaEstaNaBase_(canal, escolhida) };
  }

  var partir = partirDaPropostaDoCanal_(canal);
  if (!partir) {
    throw new Error('O canal ' + canal.nome + ' não tem campo de proposta, então '
      + 'não dá para conferir repetição pela proposta. Escolha uma coluna.');
  }

  // O caso IMPORTADO costuma chegar sem a data do canal — a importação não a
  // inventa. O mês dele é então o da importação, a mesma conta que o lado do
  // arquivo faz com "hoje". Sem esta reserva, a segunda importação da mesma
  // proposta no mês passaria, porque a primeira estaria "sem mês".
  var reserva = posicaoDaColuna_(estruturaDaAba_(canal.aba),
    RECC_COLUNA_DATA_DA_IMPORTACAO) >= 0 ? RECC_COLUNA_DATA_DA_IMPORTACAO : '';

  // A base, lida pelas COLUNAS: os pedaços da proposta e as datas do caso.
  // Poucas idas ao serviço, e não uma por linha.
  var colunas = {};
  partir.colunas
    .concat(canal.colunaDaData ? [canal.colunaDaData] : [])
    .concat(reserva ? [reserva] : [])
    .forEach(function (cabecalho) {
      colunas[cabecalho] = lerColunaInteira_(canal.aba, cabecalho);
    });

  var jaDentro = {};
  var quantas = colunas[partir.colunas[0]].length;
  for (var i = 0; i < quantas; i++) {
    var naBase = {};
    partir.colunas.forEach(function (cabecalho) {
      naBase[cabecalho] = colunas[cabecalho][i];
    });
    var daData = canal.colunaDaData ? converterParaData_(colunas[canal.colunaDaData][i]) : '';
    naBase.__mes = daData || (reserva ? converterParaData_(colunas[reserva][i]) : '');
    // Caso da base sem data NENHUMA não está em mês nenhum: não pode ser
    // repetição "no mesmo mês" de ninguém.
    var chave = chaveDaPropostaNoMes_(naBase, partir, '__mes', null);
    if (chave) jaDentro[chave] = true;
  }

  var hoje = new Date();
  return {
    partir: partir,
    // Etapa 45, pedido do PO: "ao invés de 30 dias, vamos limitar apenas no
    // mês vigente da importação". O caso da PLANILHA conta no mês de hoje,
    // qualquer que seja a data que ele traga; o do PGO, no mês da data de
    // recepção (ou, sem ela, da importação/cadastro). A mesma proposta que
    // entrou em setembro e volta em outubro entra de novo.
    colunaDaData: '',
    hoje: hoje,
    mes: RECC_NOMES_DOS_MESES[hoje.getMonth()] + ' de ' + hoje.getFullYear(),
    jaDentro: jaDentro
  };
}

/**
 * "7-0000123|2026-10": os pedaços da proposta e o mês do caso.
 *
 * Vazio quando não há número — sem número, não há proposta a comparar, e o
 * caso entra. Sem data, vale o mês de `hoje`; com `hoje` nulo (o lado da
 * base), caso sem data fica de fora.
 */
function chaveDaPropostaNoMes_(registro, partir, colunaDaData, hoje) {
  var pedacos = partir.colunas.map(function (cabecalho) {
    return converterParaIdentificador_(registro[cabecalho]);
  });
  if (!pedacos[pedacos.length - 1]) return '';

  var quando = colunaDaData ? converterParaData_(registro[colunaDaData]) : '';
  if (!quando) quando = hoje;
  if (!quando) return '';
  return pedacos.join('-') + '|' + quando.getFullYear() + '-' + (quando.getMonth() + 1);
}

/**
 * O caso repete? E, se não repete, fica anotado para a próxima linha do
 * MESMO arquivo — duas linhas iguais no lote também são repetição.
 */
function ehRepetido_(regra, caso, vistosNestaLeva) {
  if (!regra) return '';

  // Devolve POR QUE repete (Etapa 45, pedido do PO: "deve ficar claro o porquê
  // não foram importadas, se é pela planilha importada ou porque já tem no PGO
  // naquele mês"): 'base' (já está no PGO) ou 'arquivo' (repete na planilha).
  // Vazio quando não repete — e vazio é falso, para quem só pergunta se repete.
  if (regra.partir) {
    var chaveDoMes = chaveDaPropostaNoMes_(caso, regra.partir, regra.colunaDaData,
      regra.hoje);
    if (!chaveDoMes) return '';
    if (regra.jaDentro[chaveDoMes]) return 'base';
    if (vistosNestaLeva[chaveDoMes]) return 'arquivo';
    vistosNestaLeva[chaveDoMes] = true;
    return '';
  }

  var chave = normalizarParaComparar_(caso[regra.coluna]);
  var soDigitos = apenasDigitos_(caso[regra.coluna]);
  // As duas formas são conferidas porque não sabemos aqui se a coluna é
  // identificador: a base pode ter sido lida com um tipo e a fonte trazer o
  // valor com máscara. Pular por qualquer das duas é o lado seguro.
  if (regra.jaDentro[chave] || (soDigitos && regra.jaDentro[soDigitos])) return 'base';
  if (vistosNestaLeva[chave || soDigitos]) return 'arquivo';
  vistosNestaLeva[chave || soDigitos] = true;
  return '';
}

/** Como a proposta (ou o valor da coluna) repetida aparece na lista do laudo. */
function comoMostrarORepetido_(regra, caso) {
  if (regra.partir) {
    return regra.partir.colunas.map(function (cabecalho) {
      return converterParaIdentificador_(caso[cabecalho]);
    }).join('-');
  }
  return String(caso[regra.coluna] === undefined ? '' : caso[regra.coluna]).trim();
}

/** Quantas propostas repetidas o laudo lista, em cada motivo. */
const RECC_REPETIDOS_LISTADOS = 50;

/** Os motivos para pular, com a lista do que repetiu. */
function novosMotivosParaPular_(regra) {
  return { vazia: 0, repetida: 0, repetidaNoArquivo: 0, jaNoPgo: 0,
    listaNoArquivo: [], listaNoPgo: [], mes: regra && regra.mes ? regra.mes : '',
    pelaProposta: !!(regra && regra.partir) };
}

function anotarORepetido_(motivos, regra, caso, porque) {
  motivos.repetida++;
  var mostrar = comoMostrarORepetido_(regra, caso);
  if (porque === 'base') {
    motivos.jaNoPgo++;
    if (motivos.listaNoPgo.length < RECC_REPETIDOS_LISTADOS) motivos.listaNoPgo.push(mostrar);
  } else {
    motivos.repetidaNoArquivo++;
    if (motivos.listaNoArquivo.length < RECC_REPETIDOS_LISTADOS) motivos.listaNoArquivo.push(mostrar);
  }
}

/**
 * A data de recepção dos casos importados (Etapa 45, pedido do PO): "muitas
 * bases não têm uma data de recepção, e podemos escolher que venha com a data
 * de hoje ou deixar a da planilha".
 *   'hoje'     — a data de hoje em TODOS os casos (a da planilha é ignorada);
 *   'planilha' — a da planilha; o caso que veio sem data fica com a de hoje.
 * Sem escolha (página antiga), nada muda. Só vale para o canal que oferece a
 * escolha — a RET (ver `dataDeRecepcaoNaImportacao_`).
 */
function aplicarDataDeRecepcao_(caso, canal, escolha, agora) {
  var coluna = dataDeRecepcaoNaImportacao_(canal);
  if (!coluna) return;
  var qual = normalizarParaComparar_(escolha);
  if (qual === 'hoje') { caso[coluna] = agora; return; }
  if (qual === 'planilha' && String(caso[coluna] === undefined || caso[coluna] === null
    ? '' : caso[coluna]).trim() === '') {
    caso[coluna] = agora;
  }
}

/** A coluna da data de recepção que a importação deixa escolher — só no canal com proposta (a RET). */
function dataDeRecepcaoNaImportacao_(canal) {
  if (!canal.colunaDaData || !partirDaPropostaDoCanal_(canal)) return '';
  var estrutura = estruturaDaAba_(canal.aba);
  return posicaoDaColuna_(estrutura, canal.colunaDaData) >= 0
    ? grafiaDaColuna_(canal.aba, canal.colunaDaData) : '';
}

/**
 * O prêmio que está sendo importado (Etapa 45, pedido do PO): "quando vamos
 * tombar casos sempre colocamos prêmio mensal ou anual — mostre o valor que
 * está sendo importado, se tiver uma coluna ou ambas". O anual é a coluna
 * "valor do prêmio"; o mensal, "prêmio mensal". Só entra o que o de-para
 * ligou, e só dos casos que vão entrar.
 */
const RECC_PREMIOS_DA_IMPORTACAO = [
  { rotulo: 'Prêmio anual', coluna: 'valor do prêmio' },
  { rotulo: 'Prêmio mensal', coluna: 'prêmio mensal' }
];

function somarPremios_(premios, caso) {
  premios.forEach(function (premio) {
    var bruto = caso[premio.coluna];
    if (bruto === undefined || bruto === null || String(bruto).trim() === '') return;
    var numero = converterParaNumero_(bruto);
    if (numero === '' || numero === null || isNaN(numero)) return;
    premio.total += Number(numero);
    premio.casos++;
  });
}

/** Os prêmios que o de-para leva para alguma coluna, zerados para somar. */
function premiosDoDePara_(dePara, canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var destinos = {};
  (dePara || []).forEach(function (par) {
    if (par && par.paraAColuna) destinos[normalizarParaComparar_(par.paraAColuna)] = true;
  });
  return RECC_PREMIOS_DA_IMPORTACAO.filter(function (premio) {
    return posicaoDaColuna_(estrutura, premio.coluna) >= 0
      && destinos[normalizarParaComparar_(premio.coluna)];
  }).map(function (premio) {
    return { rotulo: premio.rotulo, coluna: premio.coluna, total: 0, casos: 0 };
  });
}

/**
 * Os valores que já estão na base, na coluna que identifica o caso.
 *
 * Lê a COLUNA inteira, e não as linhas: é a regra de desempenho da casa — uma
 * ida ao serviço para uma coluna, em vez de uma para cada linha. Sem a coluna
 * declarada, devolve um conjunto vazio, e nada é pulado.
 */
function jaEstaNaBase_(canal, cabecalho) {
  var dentro = {};
  if (!cabecalho) return dentro;

  var estrutura = estruturaDaAba_(canal.aba);
  var posicao = posicaoDaColuna_(estrutura, cabecalho);
  if (posicao < 0) {
    throw new Error('A coluna "' + cabecalho + '" não existe na aba '
      + canal.aba + ', então não dá para saber o que já entrou. '
      + 'Escolha uma das colunas do canal.');
  }

  lerColunaInteira_(canal.aba, cabecalho).forEach(function (valor) {
    // As DUAS formas entram no conjunto: a normalizada e a só-dígitos. Não
    // sabemos de que jeito a outra planilha escreve o CPF, e guardar as duas
    // aqui é mais barato que adivinhar na hora de comparar.
    var texto = normalizarParaComparar_(valor);
    if (texto) dentro[texto] = true;
    var soDigitos = apenasDigitos_(valor);
    if (soDigitos) dentro[soDigitos] = true;
  });
  return dentro;
}

/**
 * Percorre a fonte contando o que entra, o que pula e por quê.
 *
 * Conta e traduz no MESMO laço que a gravação usa (`linhaDaFonteParaOCaso_`),
 * de propósito: se o laudo contasse por uma regra e a gravação gravasse por
 * outra, o laudo prometeria um número e a base receberia outro — e ninguém
 * descobre isso olhando a tela.
 */
function contarOQueEntraEOQuePula_(corpo, cabecalhosDaFonte, dePara, regra, premios) {
  var motivos = novosMotivosParaPular_(regra);
  var amostra = [];
  var entram = 0;
  var vistosNestaLeva = {};

  for (var i = 0; i < corpo.length; i++) {
    var caso = linhaDaFonteParaOCaso_(corpo[i], cabecalhosDaFonte, dePara);

    if (!temAlgumValor_(caso)) { motivos.vazia++; continue; }

    var porque = ehRepetido_(regra, caso, vistosNestaLeva);
    if (porque) {
      anotarORepetido_(motivos, regra, caso, porque);
      continue;
    }

    entram++;
    if (premios) somarPremios_(premios, caso);
    if (amostra.length < RECC_LINHAS_DE_AMOSTRA) amostra.push(caso);
  }

  return {
    entram: entram,
    pulam: motivos.vazia + motivos.repetida,
    motivos: motivos,
    amostra: amostra
  };
}

/** Uma linha da fonte virada num caso, com as chaves iguais aos cabeçalhos. */
function linhaDaFonteParaOCaso_(linha, cabecalhosDaFonte, dePara) {
  var paraOnde = {};
  dePara.forEach(function (par) {
    if (!par || !par.paraAColuna) return;
    paraOnde[normalizarParaComparar_(par.daFonte)] = par.paraAColuna;
  });

  var caso = {};
  for (var i = 0; i < cabecalhosDaFonte.length; i++) {
    var destino = paraOnde[normalizarParaComparar_(cabecalhosDaFonte[i])];
    if (!destino) continue;
    var valor = linha[i];
    if (valor === undefined || valor === null) continue;
    if (String(valor).trim() === '') continue;
    caso[destino] = valor;
  }
  return caso;
}

function temAlgumValor_(caso) {
  return Object.keys(caso).some(function (chave) {
    return String(caso[chave]).trim() !== '';
  });
}

/**
 * Quem pode receber os casos: TODO MUNDO que está cadastrado e ativo.
 *
 * A primeira versão desta função só oferecia quem tivesse "Canal que atende"
 * igual ao nome do canal. Parecia certo e não funcionava: o campo era de
 * digitar livre, e a operação escrevia nele o que fazia sentido para ela —
 * "Vida Individual", "Vida em Grupo" —, quase nunca o nome do canal do PGO. O
 * resultado era a tela de Importação dizendo "nenhum analista cadastrado neste
 * canal" numa operação cheia de analistas. Só apareceu abrindo no navegador.
 *
 * Aquele campo saiu do cadastro desde então. A sugestão agora vem do CanalId,
 * que é escolha de lista e não texto digitado.
 *
 * TRÊS REGRAS, e as três são do PO:
 *
 *   1. SÓ QUEM É DO CANAL ESCOLHIDO. "Quero que quando for importar escolha o
 *      canal e ele distribua apenas para o canal que escolhi." Antes o canal
 *      só ORDENAVA a lista, e todo mundo aparecia — era proposital, para a
 *      operação em formação poder cruzar canais, e o PO decidiu o contrário.
 *      Quem administra, sem canal nenhum, também não entra: ele não é "do
 *      canal escolhido", e receber lote não é trabalho de quem administra.
 *
 *   2. SÓ QUEM ESTÁ DISPONÍVEL. Férias e afastamento tiram a pessoa da
 *      divisão sem tirar o acesso dela — ver `estaDisponivelParaReceber_`.
 *
 *   3. SÓ QUEM ESTÁ ATIVO E TEM NOME, que é a regra antiga e a mais
 *      importante: o nome tem de existir no cadastro, senão o caso fica no
 *      nome de ninguém e some da fila de todo mundo.
 *
 * A lista pode VOLTAR VAZIA, e isso é resposta, não erro: quer dizer que
 * ninguém deste canal está disponível hoje. Quem explica é a tela.
 */
function analistasParaDistribuir_(canal) {
  var doCanal = converterParaIdentificador_(canal.id);

  return lerRegistros_('USUARIOS')
    .filter(function (usuario) {
      if (normalizarParaComparar_(usuario.Ativo) !== 'sim') return false;
      if (!String(usuario.Nome || '').trim()) return false;
      if (converterParaIdentificador_(usuario.CanalId) !== doCanal) return false;
      return estaDisponivelParaReceber_(usuario);
    })
    .map(function (usuario) {
      return {
        nome: String(usuario.Nome),
        // Continua saindo, e continua sempre true agora que a lista é só
        // deste canal. A tela mostra a lista como ela vem, e um campo que
        // some quebraria a tela de quem ainda não recarregou.
        atendeEsteCanal: true
      };
    })
    .sort(function (um, outro) {
      return um.nome < outro.nome ? -1 : (um.nome > outro.nome ? 1 : 0);
    });
}

/**
 * Quem é deste canal, está ativo, e NÃO está disponível hoje.
 *
 * Vai junto da lista para a tela poder DIZER por que fulano não está lá. Sem
 * isto, a coordenação abre a Importação, não acha o nome de alguém que ela
 * sabe que trabalha ali, e a única conclusão possível é "o sistema está
 * errado" — quando o certo é "ela está de férias, e por isso não recebe".
 */
function quemEstaForaDaDivisao_(canal) {
  var doCanal = converterParaIdentificador_(canal.id);

  return lerRegistros_('USUARIOS')
    .filter(function (usuario) {
      return normalizarParaComparar_(usuario.Ativo) === 'sim'
        && String(usuario.Nome || '').trim()
        && converterParaIdentificador_(usuario.CanalId) === doCanal
        && !estaDisponivelParaReceber_(usuario);
    })
    .map(function (usuario) {
      return {
        nome: String(usuario.Nome),
        porque: String(usuario.Disponibilidade || '').trim()
      };
    })
    .sort(function (um, outro) {
      return um.nome < outro.nome ? -1 : (um.nome > outro.nome ? 1 : 0);
    });
}

/** Só os nomes, para quem precisa conferir se alguém está na lista. */
function nomesQuePodemReceberCasos_(canal) {
  return analistasParaDistribuir_(canal).map(function (um) { return um.nome; });
}

/**
 * O status com que o caso IMPORTADO nasce: o padrão do canal — menos quando
 * esse status carimba uma data.
 *
 * Pedido do PO para a Mesa: "casos de importação da Mesa não têm status, e só
 * devem contar quando for alterado para Em andamento". O "Em andamento" é o
 * status padrão da Mesa E carimba `Data em andamento`, de onde contam as 48
 * horas. Pôr esse status na importação diria que o caso entrou nele sem dizer
 * quando — e a importação não carimba, de propósito. Então o caso entra SEM
 * status, e a data nasce quando alguém o põe em Em andamento de verdade.
 *
 * Status padrão sem carimbo ("Não trabalhado" na RET, "Aguardando" no VG)
 * continua sendo posto: não há data nenhuma a mentir.
 */
function statusDaImportacaoDoCanal_(canal) {
  var padrao = statusPadraoDoCanal_(canal);
  var situacao = padrao ? situacaoDoCanalPeloValor_(canal, padrao) : null;
  if (situacao && String(situacao.colunaDeCarimbo || '').trim()) return '';
  return padrao;
}

/**
 * O status dos casos do LOTE — pedido do PO: "escolher importação deve permitir
 * que eu delegue o status de origem para todos os casos, e não mais por padrão
 * apenas Não trabalhado".
 *
 * `escolhido` undefined (quem chama sem escolher) é o padrão do canal, como
 * antes; vazio é "sem status", escolha de verdade; qualquer outro tem de ser um
 * status do canal. Vale para o caso que a fonte trouxe SEM status: o que veio
 * com status na coluna ligada no de-para continua com o dele.
 *
 * NÃO CARIMBA, por decisão do PO: o caso é antigo, e carimbar hoje diria que o
 * contato (ou o Retido) aconteceu hoje.
 */
function statusDoLote_(canal, escolhido) {
  if (escolhido === undefined || escolhido === null) return statusDaImportacaoDoCanal_(canal);
  var texto = String(escolhido).trim();
  if (!texto) return '';
  var achada = situacaoDoCanalPeloValor_(canal, texto);
  if (!achada) {
    throw new Error('O status "' + texto + '" não existe no canal ' + canal.nome + '. Os status '
      + 'dele são: ' + situacoesDoCanal_(canal).map(function (s) { return s.gravadoComo; }).join(', ')
      + '.');
  }
  return achada.gravadoComo;
}

/** O status com que o caso nasce no formulário, tirado do campo Status do canal. */
function statusPadraoDoCanal_(canal) {
  if (!canal.colunaDoStatus) return '';
  var achado = '';
  camposAtivosDoCanal_(canal.id).forEach(function (campo) {
    if (normalizarParaComparar_(campo.Cabecalho)
      === normalizarParaComparar_(canal.colunaDoStatus)) {
      achado = String(campo.ValorPadrao || '');
    }
  });
  return achado;
}

// ----------------------------------------------------------------------------
// GRAVAR
// ----------------------------------------------------------------------------

/**
 * Traz a base para dentro.
 *
 * Numa gravação só, por `inserirVariosRegistros_`: trezentas chamadas
 * separadas seriam trezentas idas ao serviço e trezentos Ids pedidos um a um.
 *
 * O que a importação acrescenta a cada caso, além do que veio da fonte:
 *
 *   - o ANALISTA, em rodízio entre os escolhidos (ou um só, se for um só);
 *   - o STATUS padrão do canal, quando a fonte não trouxe um — é o
 *     "Não trabalhado" que a RET pediu;
 *   - a ORIGEM DA IMPORTAÇÃO, que é o nome do lote, e a DATA — as duas colunas
 *     que fazem o gráfico da Produtividade RECC existir;
 *   - `_Origem` = PLANILHA, porque o dado veio de fora e não da tela.
 *
 * A auditoria recebe UMA linha por lote, não uma por caso. Trezentas linhas de
 * auditoria dizendo a mesma coisa afogam as que importam.
 *
 * `pedido.envio`: ver cadastrarCaso — o mesmo lote não entra duas vezes.
 */
function importarCasos(idDoCanal, pedido) {
  return comEnvioUnico_((pedido || {}).envio, function () {
    return importarCasosUmaVez_(idDoCanal, pedido);
  });
}

function importarCasosUmaVez_(idDoCanal, pedido) {
  var quem = exigirPermissao_(RECC_ACOES.IMPORTAR);
  exigirTela_('importacao');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  pedido = pedido || {};

  var nomeDoLote = String(pedido.origem || '').trim();
  if (!nomeDoLote) {
    throw new Error('Dê um nome ao lote — "Base de inadimplentes Vida Presente", '
      + 'por exemplo. É por ele que a Produtividade RECC vai mostrar quantos '
      + 'casos entraram em cada dia, e sem ele o gráfico não tem o que dizer.');
  }

  var grade = gradeDaFonte_(pedido.fonte);
  if (grade.length < 2) {
    throw new Error('Preciso de pelo menos duas linhas: a primeira com os '
      + 'nomes das colunas e ao menos uma de dado.');
  }

  var cabecalhosDaFonte = grade[0];
  var corpo = grade.slice(1);
  if (corpo.length > RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO) {
    throw new Error('São no máximo ' + RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO
      + ' linhas por importação, e vieram ' + corpo.length + '. Divida em '
      + 'levas — assim, se o mapeamento estiver errado, o estrago é menor.');
  }

  var dePara = Array.isArray(pedido.dePara) && pedido.dePara.length
    ? pedido.dePara
    : sugerirDeParaDaImportacao_(cabecalhosDaFonte, canal);
  exigirQueODeParaLeveAAlgumLugar_(dePara, canal);

  var regra = regraDeRepeticao_(canal, pedido.colunaQueIdentifica);

  var analistas = analistasEscolhidos_(pedido.analistas, canal);
  var colunaDoAnalista = colunaDoResponsavel_(estruturaDaAba_(canal.aba));
  var agora = new Date();
  var statusPadrao = statusDoLote_(canal, pedido.statusDoLote);

  var paraGravar = [];
  var pulados = novosMotivosParaPular_(regra);
  var premios = premiosDoDePara_(dePara, canal);
  var vistosNestaLeva = {};

  for (var i = 0; i < corpo.length; i++) {
    var caso = linhaDaFonteParaOCaso_(corpo[i], cabecalhosDaFonte, dePara);
    if (!temAlgumValor_(caso)) { pulados.vazia++; continue; }

    // ANTES da divisão: o repetido não chega a analista nenhum. Era o que o
    // PO viu acontecer — a mesma proposta indo para duas pessoas.
    var porque = ehRepetido_(regra, caso, vistosNestaLeva);
    if (porque) {
      anotarORepetido_(pulados, regra, caso, porque);
      continue;
    }
    somarPremios_(premios, caso);
    aplicarDataDeRecepcao_(caso, canal, pedido.dataDeRecepcao, agora);

    if (colunaDoAnalista && analistas.length && !caso[colunaDoAnalista]) {
      // Rodízio pelo número de casos JÁ MONTADOS, e não pelo índice da linha
      // da fonte: linha pulada não pode fazer a fila do rodízio andar, senão a
      // divisão sai torta sempre que a base tem repetição no meio.
      caso[colunaDoAnalista] = analistas[paraGravar.length % analistas.length];
    }
    if (canal.colunaDoStatus && !caso[canal.colunaDoStatus] && statusPadrao) {
      caso[canal.colunaDoStatus] = statusPadrao;
    }
    caso[RECC_COLUNA_ORIGEM_DA_IMPORTACAO] = nomeDoLote;
    caso[RECC_COLUNA_DATA_DA_IMPORTACAO] = agora;

    paraGravar.push(caso);
  }

  if (!paraGravar.length) {
    throw new Error('Nenhuma linha entraria: ' + pulados.vazia + ' em branco, '
      + pulados.jaNoPgo + ' já estão no PGO' + (pulados.mes ? ' em ' + pulados.mes : '')
      + ' e ' + pulados.repetidaNoArquivo + ' repetidas na própria planilha. Nada foi gravado.');
  }

  // _Origem = PLANILHA porque o dado veio de FORA, e não da tela do PGO. É o
  // que permite, meses depois, separar o que a operação digitou do que foi
  // importado — e conferir um contra o outro quando um número não fecha.
  var gravados = inserirVariosRegistros_(canal.aba, paraGravar,
    { origem: RECC_ORIGEM_PLANILHA });
  // Os casos já entraram: lembrar o de-para não pode derrubar a importação —
  // quem visse o erro importaria de novo. Se falhar, a próxima casa pelo nome.
  try {
    lembrarODeParaDoCanal_(canal, dePara);
  } catch (erro) {
    registrarErro_('servidor', 'importação', 'O de-para desta importação não foi lembrado: '
      + erro.message, canal.nome);
  }

  registrarAuditoria_('caso.importar', canal.aba, '',
    canal.nome + ' · ' + nomeDoLote + ' · ' + gravados.length + ' casos'
    + (pulados.repetida ? ' · ' + pulados.repetida + ' repetidos pulados' : ''));

  return {
    canal: canal.nome,
    origem: nomeDoLote,
    entraram: gravados.length,
    pulados: pulados,
    premios: premios,
    analistas: analistas,
    primeiroId: gravados.length ? gravados[0].__id : '',
    ultimoId: gravados.length ? gravados[gravados.length - 1].__id : ''
  };
}

/**
 * Recusa uma importação que não levaria dado a coluna nenhuma.
 *
 * Sem isto, um de-para todo vazio gravaria trezentas linhas contendo só o Id, o
 * analista e a data — trezentas linhas em branco na base operacional, que
 * alguém teria de achar e apagar uma a uma.
 */
function exigirQueODeParaLeveAAlgumLugar_(dePara, canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var destinos = [];
  var inexistentes = [];

  /*
   * A lista do que se ACEITA é conferida AQUI, no servidor, e não só na tela.
   *
   * Antes esta trava só perguntava se a coluna EXISTE na aba — então a origem
   * e a data da importação, que a tela nunca ofereceu, podiam ser escritas por
   * quem montasse o de-para na mão. A proteção do rastro do lote era só um
   * combinado visual, e combinado visual não é trava.
   *
   * Passou a importar agora que o carimbo virou destino escolhível: a linha
   * entre "pode escolher" e "nunca" tem de ser a mesma nos dois lados.
   */
  var aceitas = {};
  colunasQueAImportacaoAceita_(canal).forEach(function (cabecalho) {
    aceitas[normalizarParaComparar_(cabecalho)] = true;
  });
  var proibidas = [];

  dePara.forEach(function (par) {
    var destino = String((par || {}).paraAColuna || '').trim();
    if (!destino) return;
    if (posicaoDaColuna_(estrutura, destino) < 0) {
      inexistentes.push(destino);
      return;
    }
    if (!aceitas[normalizarParaComparar_(destino)]) {
      proibidas.push(destino);
      return;
    }
    destinos.push(destino);
  });

  if (inexistentes.length) {
    throw new Error('Estas colunas não existem na aba ' + canal.aba + ': '
      + inexistentes.join(', ') + '. As colunas dela são: '
      + colunasQueAImportacaoAceita_(canal).join(' | ') + '.');
  }
  if (proibidas.length) {
    throw new Error('Estas colunas são preenchidas pelo sistema e não podem '
      + 'receber dado da origem: ' + proibidas.join(', ') + '. A origem e a '
      + 'data da importação são o rastro do lote — é por elas que se sabe de '
      + 'onde cada caso veio, e a planilha de origem não pode escrevê-las.');
  }
  if (!destinos.length) {
    throw new Error('Nenhuma coluna da planilha de origem está apontando para '
      + 'uma coluna do canal ' + canal.nome + '. Do jeito que está, a '
      + 'importação criaria linhas em branco.');
  }
}

/**
 * Os analistas que vão receber os casos, conferidos contra o cadastro.
 *
 * Nome que não está cadastrado e ativo é RECUSADO, e não aceito calado: um
 * nome digitado errado vira trezentos casos no nome de ninguém, e eles somem
 * da fila de todo mundo — o escopo "próprios" não acha um responsável que não
 * existe. O caso estaria na planilha e invisível no sistema.
 *
 * O que NÃO é conferido é a que canal a pessoa atende: ver
 * analistasParaDistribuir_, que explica por quê.
 */
function analistasEscolhidos_(escolhidos, canal) {
  var lista = Array.isArray(escolhidos) ? escolhidos : [];
  var limpos = [];
  lista.forEach(function (nome) {
    var texto = String(nome || '').trim();
    if (texto && limpos.indexOf(texto) < 0) limpos.push(texto);
  });
  if (!limpos.length) return [];

  var podem = nomesQuePodemReceberCasos_(canal);
  var foraDoCadastro = limpos.filter(function (nome) {
    return !podem.some(function (um) {
      return normalizarParaComparar_(um) === normalizarParaComparar_(nome);
    });
  });
  if (foraDoCadastro.length) {
    /*
     * O RECADO DIZ O MOTIVO CERTO, e isto não é capricho.
     *
     * Antes ele dizia sempre "não estão cadastrados e ativos". Depois que a
     * divisão passou a ser só do canal e só de quem está disponível, esse
     * texto virou mentira em dois dos três casos: a pessoa está cadastrada,
     * está ativa, e mesmo assim não pode receber. Quem lesse iria cadastrar
     * de novo alguém que já existe.
     */
    var indisponiveis = {};
    quemEstaForaDaDivisao_(canal).forEach(function (um) {
      indisponiveis[normalizarParaComparar_(um.nome)] = um.porque || 'indisponível';
    });

    var explicados = foraDoCadastro.map(function (nome) {
      var chave = normalizarParaComparar_(nome);
      if (indisponiveis[chave]) return nome + ' (' + indisponiveis[chave] + ')';
      return nome + ' (não é do canal ' + canal.nome + ', ou não está ativo)';
    });

    throw new Error('Estes nomes não podem receber casos do canal '
      + canal.nome + ': ' + explicados.join('; ') + '. Caso no nome de quem '
      + 'não recebe fica na planilha e invisível na fila. Ajuste em '
      + 'Configurações › Usuários — o canal da pessoa e a disponibilidade '
      + 'dela — e importe depois.');
  }

  // Devolve com a grafia do CADASTRO, e não a que veio da tela: é o nome do
  // cadastro que a coluna de responsável guarda, e é por ele que o escopo
  // "próprios" compara.
  return limpos.map(function (nome) {
    var achado = nome;
    podem.forEach(function (um) {
      if (normalizarParaComparar_(um) === normalizarParaComparar_(nome)) achado = um;
    });
    return achado;
  });
}

/**
 * Os lotes já importados neste canal, do mais recente para o mais antigo.
 *
 * Serve para a tela oferecer um nome que já existe — importar a mesma base toda
 * semana com o nome escrito de um jeito diferente a cada vez faria o gráfico
 * da Produtividade RECC mostrar cinco lotes onde há um.
 */
function lotesJaImportados(idDoCanal) {
  var quem = exigirPermissao_(RECC_ACOES.IMPORTAR);
  exigirTela_('importacao');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  // Coluna ausente devolve lista vazia, e não estoura: quem já tinha o PGO
  // instalado antes da importação não tem esta coluna, e a tela precisa abrir
  // do mesmo jeito para ele — é o diagnóstico que cobra o que falta.
  var estrutura = estruturaDaAba_(canal.aba);
  if (posicaoDaColuna_(estrutura, RECC_COLUNA_ORIGEM_DA_IMPORTACAO) < 0) return [];

  var quantos = {};
  lerColunaInteira_(canal.aba, RECC_COLUNA_ORIGEM_DA_IMPORTACAO).forEach(function (valor) {
    var nome = String(valor === null || valor === undefined ? '' : valor).trim();
    if (!nome) return;
    quantos[nome] = (quantos[nome] || 0) + 1;
  });

  return Object.keys(quantos).map(function (nome) {
    return { origem: nome, casos: quantos[nome] };
  }).sort(function (um, outro) { return outro.casos - um.casos; });
}

/** O que a tela de Importação precisa para abrir. */
function opcoesDaImportacaoDeCasos(idDoCanal) {
  var quem = exigirPermissao_(RECC_ACOES.IMPORTAR);
  exigirTela_('importacao');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var repeticaoPelaProposta = !!partirDaPropostaDoCanal_(canal);

  return {
    canal: { id: canal.id, nome: canal.nome, aba: canal.aba },
    colunasDoCanal: colunasQueAImportacaoAceita_(canal),
    analistas: analistasParaDistribuir_(canal),
    // Quem é deste canal e está de férias ou afastado. A tela diz o nome e o
    // motivo, em vez de deixar a pessoa procurando alguém que não está lá.
    foraDaDivisao: quemEstaForaDaDivisao_(canal),
    statusPadrao: statusDaImportacaoDoCanal_(canal),
    // Os status que a pessoa pode escolher para o lote inteiro.
    statusDoCanal: canal.colunaDoStatus ? situacoesDoCanal_(canal).map(function (situacao) {
      return { valor: situacao.gravadoComo, rotulo: situacao.nome };
    }) : [],
    // Status padrão que a importação NÃO põe (o da Mesa): a tela explica.
    statusQueEsperaAPessoa: statusDaImportacaoDoCanal_(canal) ? '' : statusPadraoDoCanal_(canal),
    lotes: lotesJaImportados(canal.id),
    // Na Mesa, a mesma tela traz também os atendimentos do CHAT (Etapa 39).
    aceitaChat: canal.aba === 'BASE_MESA',
    limite: RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO,
    // Canal com proposta (a RET) ganha a opção "proposta no mesmo mês", e ela
    // já vem MARCADA — escolha do PO. Dá para trocar ou desmarcar na tela.
    repeticaoPelaProposta: repeticaoPelaProposta,
    // Etapa 45: a escolha da data de recepção (hoje / da planilha) — só no
    // canal com proposta, a RET. Vazio: a tela não mostra a escolha.
    dataDeRecepcao: dataDeRecepcaoNaImportacao_(canal),
    repeticaoPadrao: repeticaoPelaProposta ? RECC_REPETIR_PELA_PROPOSTA_NO_MES : ''
  };
}
