/**
 * ============================================================================
 * PGO — Configuracoes.gs · onde o sistema é ajustado sem programador
 * ============================================================================
 * Esta é a tela mais importante do produto. Tudo o que as outras fazem sai
 * daqui: quais campos o formulário pergunta, quais listas ele oferece, quem
 * entra, o que cada nível pode ver, quais situações viram cartão, o nome e a
 * marca da operação.
 *
 * TRÊS NÍVEIS DE RISCO, e cada um com uma guarda diferente:
 *
 *   1. mexer em CONTEÚDO        renomear uma situação, criar um motivo novo,
 *      permissão "configurar"   cadastrar um usuário. Reversível.
 *
 *   2. mexer em REGRA           o que um nível de acesso pode, quem vê qual
 *      permissão "configurar"   campo. Reversível, mas afeta todo mundo.
 *
 *   3. mexer em ESTRUTURA       criar coluna na planilha, apagar mesa.
 *      + SENHA DE ADMINISTRADOR Isso não tem desfazer.
 *
 * A senha não é burocracia: criar coluna escreve na planilha de produção, e
 * não existe "Ctrl+Z" ali.
 * ============================================================================
 */

/**
 * O panorama da tela de Configurações: quantos itens há em cada seção e o que
 * está pedindo atenção.
 *
 * Vem numa chamada só porque a tela abre mostrando as seis seções ao mesmo
 * tempo — seis idas ao servidor fariam a tela montar aos pedaços.
 */
function resumoDasConfiguracoes() {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var catalogo = lerRegistros_('CATALOGO');
  var laudo = conferirEstrutura_();

  function quantosDoTipo(tipo) {
    return catalogo.filter(function (item) {
      return normalizarParaComparar_(item.Tipo) === tipo;
    }).length;
  }

  return {
    podeMexerNaEstrutura: podeFazer_(quem.permissoes, RECC_ACOES.ESTRUTURA),
    senhaDefinida: existeSenhaDeAdministrador_(),
    identidade: lerIdentidadeVisual_(),
    secoes: [
      { chave: 'campos', titulo: 'Campos do formulário',
        descricao: 'O que o cadastro pergunta, em cada mesa',
        quantidade: lerRegistros_('CAMPOS').length },
      { chave: 'usuarios', titulo: 'Usuários',
        descricao: 'Quem entra no sistema',
        quantidade: lerRegistros_('USUARIOS').length },
      { chave: 'niveis', titulo: 'Níveis de acesso',
        descricao: 'O que cada um pode ver e fazer',
        quantidade: quantosDoTipo('nivelacesso') },
      { chave: 'catalogo', titulo: 'Listas',
        descricao: 'Situações, canais, motivos, ramos e cargos',
        quantidade: catalogo.length - quantosDoTipo('nivelacesso') },
      { chave: 'mesas', titulo: 'Mesas de trabalho',
        descricao: 'As bases e o que cada painel mostra',
        quantidade: lerRegistros_('MESAS').length },
      { chave: 'identidade', titulo: 'Identidade e segurança',
        descricao: 'Nome, logo, cor e a senha de administrador',
        quantidade: 0 },
      { chave: 'paineis', titulo: 'Painéis',
        descricao: 'Os cards do Dashboard e dos painéis',
        quantidade: lerRegistros_('PAINEIS').filter(function (linha) {
          return normalizarParaComparar_(linha.Ativo) === 'sim';
        }).length },
      { chave: 'estrutura', titulo: 'Estrutura e auditoria',
        descricao: 'O laudo da planilha e o que foi feito no sistema',
        quantidade: 0 }
    ],
    estrutura: {
      emOrdem: laudo.ok,
      abasComProblema: laudo.abas.filter(function (aba) {
        return !aba.existe || aba.faltando.length;
      }),
      colunasForaDoContrato: laudo.abas.reduce(function (soma, aba) {
        return soma + aba.aMais.length;
      }, 0)
    }
  };
}

// ============================================================================
// CAMPOS DO FORMULÁRIO
// ============================================================================

/** Todos os campos de uma mesa, inclusive os desligados — aqui se administra. */
function listarCamposDaMesa(idDaMesa) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var mesa = mesaPeloId_(idDaMesa);
  var estrutura = estruturaDaAba_(mesa.aba);

  return lerRegistros_('CAMPOS')
    .filter(function (campo) {
      return converterParaIdentificador_(campo.MesaId)
        === converterParaIdentificador_(mesa.id);
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (campo) {
      var configuracao = lerConfiguracaoDoCampo_(campo);
      return {
        id: campo.__id,
        chave: String(campo.ChaveTecnica),
        cabecalho: String(campo.Cabecalho),
        rotulo: String(campo.Rotulo || campo.Cabecalho),
        descricao: String(campo.Descricao || ''),
        tipo: String(campo.TipoCampo || 'texto'),
        secao: String(campo.Secao || 'Geral'),
        mascara: String(campo.Mascara || ''),
        obrigatorio: normalizarParaComparar_(campo.Obrigatorio) === 'sim',
        ativo: normalizarParaComparar_(campo.Ativo) === 'sim',
        protegido: normalizarParaComparar_(campo.Protegido) === 'sim',
        ordem: Number(campo.Ordem) || 0,
        catalogo: String(configuracao.catalogo || ''),
        listaDe: String(configuracao.listaDe || ''),
        largura: Number(configuracao.largura) || 1,
        // Coluna que sumiu da planilha aparece marcada, em vez de o campo
        // simplesmente parar de funcionar sem ninguém entender por quê.
        colunaExiste: posicaoDaColuna_(estrutura, campo.Cabecalho) >= 0
      };
    });
}

/** As opções que a tela oferece ao configurar um campo. */
function opcoesDeConfiguracaoDeCampo() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  return {
    tipos: Object.keys(RECC_DO_CAMPO_PARA_O_DADO),
    tons: RECC_TONS,
    cadastros: ['usuarios', 'produtos', 'canais'],
    tiposDeCatalogo: tiposDeCatalogoExistentes_()
  };
}

function tiposDeCatalogoExistentes_() {
  var vistos = {};
  lerRegistros_('CATALOGO').forEach(function (item) {
    var tipo = String(item.Tipo || '').trim();
    if (tipo && tipo !== 'NIVEL_ACESSO') vistos[tipo] = true;
  });
  return Object.keys(vistos).sort();
}

/**
 * Altera um campo que já existe.
 *
 * Não mexe na planilha: mudar rótulo, seção, máscara ou obrigatoriedade é
 * mexer em como o campo APARECE, e não em onde ele mora. Por isso não pede
 * senha. Trocar o CABEÇALHO, sim, seria mexer na coluna — e é recusado.
 */
function salvarCampo(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var id = converterParaIdentificador_(dados.id);
  var atual = buscarRegistros_('CAMPOS', 'Id', id, 1)[0];
  if (!atual) throw new Error('Campo ' + id + ' não encontrado.');

  if (dados.cabecalho && String(dados.cabecalho) !== String(atual.Cabecalho)) {
    throw new Error('O cabeçalho de um campo não muda por aqui: ele é o nome ' +
      'da coluna na planilha. Renomeie a coluna na planilha e use a ' +
      'reconciliação de colunas.');
  }
  if (normalizarParaComparar_(atual.Protegido) === 'sim' && dados.ativo === false) {
    // Campo protegido pode ser escondido, mas nunca desligado do contrato.
    // A distinção existe porque a coluna continua sendo gravada pelo sistema.
  }

  var configuracao = lerConfiguracaoDoCampo_(atual);
  if (dados.catalogo !== undefined) {
    if (dados.catalogo) configuracao.catalogo = String(dados.catalogo);
    else delete configuracao.catalogo;
  }
  if (dados.listaDe !== undefined) {
    if (dados.listaDe) configuracao.listaDe = String(dados.listaDe);
    else delete configuracao.listaDe;
  }
  if (dados.largura !== undefined) {
    var largura = Number(dados.largura) || 1;
    if (largura > 1) configuracao.largura = largura;
    else delete configuracao.largura;
  }

  var tipo = String(dados.tipo || atual.TipoCampo);
  if (!RECC_DO_CAMPO_PARA_O_DADO[tipo]) {
    throw new Error('Tipo de campo desconhecido: "' + tipo + '". Os tipos são ' +
      Object.keys(RECC_DO_CAMPO_PARA_O_DADO).join(', ') + '.');
  }

  atualizarRegistro_('CAMPOS', id, {
    Rotulo: String(dados.rotulo || atual.Cabecalho),
    Descricao: String(dados.descricao === undefined ? atual.Descricao : dados.descricao),
    TipoCampo: tipo,
    Secao: String(dados.secao || 'Geral'),
    Mascara: String(dados.mascara === undefined ? atual.Mascara : dados.mascara),
    Obrigatorio: dados.obrigatorio === true,
    Ativo: dados.ativo === false ? 'NAO' : 'SIM',
    Configuracao: Object.keys(configuracao).length ? JSON.stringify(configuracao) : ''
  });

  esquecerEstruturaLida_();
  registrarAuditoria_('campo.editar', 'CAMPOS', id, String(atual.Cabecalho));
  return true;
}

/**
 * Cria um campo NOVO — e com ele uma coluna nova na planilha.
 *
 * É a ação mais cara da tela: escreve na base de produção e não tem desfazer.
 * Por isso exige senha de administrador, e não só a permissão de configurar.
 */
function criarCampo(idDaMesa, dados) {
  var quem = exigirPermissao_(RECC_ACOES.ESTRUTURA);
  exigirSenhaDeAdministrador_();

  var mesa = mesaPeloId_(idDaMesa);
  var rotulo = String(dados.rotulo || '').trim();
  if (!rotulo) throw new Error('Dê um nome ao campo.');

  var tipoDeCampo = String(dados.tipo || 'texto');
  var tipoDeDado = RECC_DO_CAMPO_PARA_O_DADO[tipoDeCampo];
  if (!tipoDeDado) {
    throw new Error('Tipo de campo desconhecido: "' + tipoDeCampo + '".');
  }

  // O cabeçalho da coluna é o rótulo. Um nome para as duas coisas evita a
  // pergunta "por que a planilha chama diferente da tela".
  var criada = adicionarColuna_(mesa.aba, rotulo, tipoDeDado);

  var campo = buscarRegistros_('CAMPOS', 'Cabecalho', rotulo, 1)[0];
  if (campo) {
    atualizarRegistro_('CAMPOS', campo.__id, {
      MesaId: mesa.id,
      Secao: String(dados.secao || 'Geral'),
      Descricao: String(dados.descricao || ''),
      Mascara: String(dados.mascara || ''),
      Obrigatorio: dados.obrigatorio === true,
      TipoCampo: tipoDeCampo
    });
  }

  esquecerEstruturaLida_();
  registrarAuditoria_('campo.criar', mesa.aba, criada.coluna, rotulo);
  return { cabecalho: criada.cabecalho, coluna: criada.coluna, mesa: mesa.nome };
}

/**
 * Reordena os campos do formulário.
 *
 * Muda a ordem NA TELA, e nunca na planilha: a coluna fica onde está. Foi por
 * reordenar coluna que o sistema anterior corrompeu dado.
 */
function reordenarCampos(idDaMesa, idsNaOrdem) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var mesa = mesaPeloId_(idDaMesa);

  var daMesa = {};
  listarCamposDaMesa(mesa.id).forEach(function (campo) { daMesa[campo.id] = true; });

  var ordem = 0;
  (idsNaOrdem || []).forEach(function (idDoCampo) {
    var id = converterParaIdentificador_(idDoCampo);
    if (!daMesa[id]) {
      throw new Error('O campo ' + id + ' não é da mesa ' + mesa.nome + '.');
    }
    ordem++;
    atualizarRegistro_('CAMPOS', id, { Ordem: ordem });
  });

  registrarAuditoria_('campo.reordenar', 'CAMPOS', '', mesa.nome);
  return true;
}

// ============================================================================
// LISTAS (a aba CATALOGO)
// ============================================================================

function listarCatalogo(tipo, idDaMesa) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var alvo = normalizarParaComparar_(tipo);
  var daMesa = converterParaIdentificador_(idDaMesa);

  return lerRegistros_('CATALOGO')
    .filter(function (item) {
      if (alvo && normalizarParaComparar_(item.Tipo) !== alvo) return false;
      if (!daMesa) return true;
      var mesaDoItem = converterParaIdentificador_(item.MesaId);
      return !mesaDoItem || mesaDoItem === daMesa;
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (item) {
      return {
        id: item.__id,
        tipo: String(item.Tipo),
        mesaId: converterParaIdentificador_(item.MesaId),
        codigo: String(item.Codigo || ''),
        nome: String(item.Nome),
        rotulo: String(item.Rotulo || item.Nome),
        cor: tomValido_(item.Cor),
        ordem: Number(item.Ordem) || 0,
        ativo: normalizarParaComparar_(item.Ativo) === 'sim'
      };
    });
}

/**
 * Cria ou altera um item de lista.
 *
 * O NOME é o que fica gravado nos casos; o RÓTULO é o que aparece na tela.
 * Trocar o rótulo é seguro. Trocar o nome não renomeia o que já foi gravado —
 * e por isso o sistema avisa em vez de deixar acontecer calado.
 */
function salvarItemDoCatalogo(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var nome = String(dados.nome || '').trim();
  if (!nome) throw new Error('Dê um nome ao item.');

  var tipo = String(dados.tipo || '').trim().toUpperCase();
  if (!tipo) throw new Error('Diga de que lista o item faz parte.');

  var campos = {
    Tipo: tipo,
    MesaId: converterParaIdentificador_(dados.mesaId),
    Codigo: converterParaIdentificador_(dados.codigo),
    Nome: nome,
    Rotulo: String(dados.rotulo || nome),
    Cor: tomValido_(dados.cor),
    Ordem: Number(dados.ordem) || 0,
    Ativo: dados.ativo === false ? 'NAO' : 'SIM'
  };

  var id = converterParaIdentificador_(dados.id);
  if (id) {
    var atual = buscarRegistros_('CATALOGO', 'Id', id, 1)[0];
    if (!atual) throw new Error('Item ' + id + ' não encontrado.');

    if (normalizarParaComparar_(atual.Nome) !== normalizarParaComparar_(nome)) {
      var emUso = quantosCasosUsam_(atual);
      if (emUso > 0) {
        throw new Error('"' + atual.Nome + '" está gravado em ' + emUso +
          ' caso(s). Trocar o nome aqui NÃO renomeia o que já foi gravado — ' +
          'eles ficariam apontando para um item que não existe mais. ' +
          'Para mudar só o que aparece na tela, troque o rótulo.');
      }
    }
    atualizarRegistro_('CATALOGO', id, campos);
    registrarAuditoria_('catalogo.editar', 'CATALOGO', id, tipo);
    return id;
  }

  var criado = inserirRegistro_('CATALOGO', campos);
  registrarAuditoria_('catalogo.criar', 'CATALOGO', criado.__id, tipo);
  return criado.__id;
}

/** Em quantos casos este item de lista está gravado. */
function quantosCasosUsam_(item) {
  var procurado = normalizarParaComparar_(item.Nome);
  var daMesa = converterParaIdentificador_(item.MesaId);
  var quantos = 0;

  mesasVisiveis_().forEach(function (mesa) {
    if (daMesa && converterParaIdentificador_(mesa.id) !== daMesa) return;
    var estrutura;
    try {
      estrutura = estruturaDaAba_(mesa.aba);
    } catch (erro) {
      return;
    }
    lerRegistros_(mesa.aba, { incluirOcultos: true }).forEach(function (registro) {
      for (var i = 0; i < estrutura.cabecalhos.length; i++) {
        var cabecalho = estrutura.cabecalhos[i];
        if (!cabecalho || cabecalho.charAt(0) === '_') continue;
        if (normalizarParaComparar_(registro[cabecalho]) === procurado) {
          quantos++;
          return;
        }
      }
    });
  });
  return quantos;
}

// ============================================================================
// NÍVEIS DE ACESSO
// ============================================================================

function listarNiveisDeAcesso() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var quantosUsam = {};
  lerRegistros_('USUARIOS').forEach(function (usuario) {
    var nivel = converterParaIdentificador_(usuario.NivelAcessoId);
    quantosUsam[nivel] = (quantosUsam[nivel] || 0) + 1;
  });

  return lerRegistros_('CATALOGO')
    .filter(function (item) {
      return normalizarParaComparar_(item.Tipo) === 'nivelacesso';
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (item) {
      var permissoes = lerPermissoesDoNivel_(item);
      return {
        id: item.__id,
        nome: String(item.Nome),
        ativo: normalizarParaComparar_(item.Ativo) === 'sim',
        escopo: permissoes.escopo,
        telas: permissoes.telas,
        acoes: permissoes.acoes,
        campos: permissoes.campos,
        defeito: permissoes.defeito,
        pessoas: quantosUsam[item.__id] || 0
      };
    });
}

/**
 * Altera o que um nível pode.
 *
 * Duas travas, e as duas existem para ninguém se trancar do lado de fora:
 * o último nível que abre Configurações não pode perder essa tela, e o
 * último que mexe em estrutura não pode perder essa ação.
 */
function salvarNivelDeAcesso(dados) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var id = converterParaIdentificador_(dados.id);
  var atual = buscarRegistros_('CATALOGO', 'Id', id, 1)[0];
  if (!atual) throw new Error('Nível ' + id + ' não encontrado.');

  var telas = Array.isArray(dados.telas) ? dados.telas : [];
  var acoes = Array.isArray(dados.acoes) ? dados.acoes : [];

  acoes.forEach(function (acao) {
    var conhecida = false;
    Object.keys(RECC_ACOES).forEach(function (chave) {
      if (RECC_ACOES[chave] === acao) conhecida = true;
    });
    if (!conhecida) throw new Error('Ação desconhecida: "' + acao + '".');
  });
  if (!RECC_ESCOPOS[dados.escopo]) {
    throw new Error('Escopo desconhecido: "' + dados.escopo + '". Os escopos ' +
      'são ' + Object.keys(RECC_ESCOPOS).join(', ') + '.');
  }

  exigirQueAlguemContinueEntrando_(id, telas, acoes);

  atualizarRegistro_('CATALOGO', id, {
    Nome: String(dados.nome || atual.Nome),
    Ativo: dados.ativo === false ? 'NAO' : 'SIM',
    Configuracao: JSON.stringify({
      escopo: dados.escopo,
      telas: telas,
      acoes: acoes,
      campos: dados.campos && typeof dados.campos === 'object' ? dados.campos : {},
      componentes: {}
    })
  });

  registrarAuditoria_('nivel.editar', 'CATALOGO', id, String(atual.Nome));
  return true;
}

/**
 * Impede a mudança que deixaria a instalação sem quem a administre.
 *
 * Não é zelo excessivo: tirar "configurações" do único nível que a tem
 * tranca todo mundo do lado de fora, e a única saída seria editar a planilha
 * na mão — coisa que nem todo mundo sabe fazer sob pressão.
 */
function exigirQueAlguemContinueEntrando_(idAlterado, telas, acoes) {
  var sobraramTelas = 0;
  var sobraramEstruturas = 0;

  listarNiveisDeAcesso().forEach(function (nivel) {
    var suasTelas = nivel.telas;
    var suasAcoes = nivel.acoes;
    var continuaAtivo = nivel.ativo;

    if (nivel.id === idAlterado) {
      suasTelas = telas;
      suasAcoes = acoes;
      continuaAtivo = true;
    }
    if (!continuaAtivo || !nivel.pessoas) return;

    if (suasTelas.indexOf('configuracoes') >= 0) sobraramTelas++;
    if (suasAcoes.indexOf(RECC_ACOES.ESTRUTURA) >= 0) sobraramEstruturas++;
  });

  if (!sobraramTelas) {
    throw new Error('Esta mudança deixaria NINGUÉM com acesso a Configurações. ' +
      'Dê essa tela a outro nível que tenha gente antes de tirá-la deste.');
  }
  if (!sobraramEstruturas) {
    throw new Error('Esta mudança deixaria ninguém podendo mexer na estrutura. ' +
      'Sem isso não é possível criar campo nem mesa.');
  }
}

/**
 * O que a tela precisa saber para montar um nível de acesso: quais telas
 * existem, quais ações e quais escopos.
 *
 * A lista de telas NÃO é escrita aqui — vem de RECC_TELAS_DO_SISTEMA, a mesma
 * que o menu percorre. Se um dia nascer uma tela nova, ela aparece nos dois
 * lugares no mesmo instante.
 */
function opcoesDeNivelDeAcesso() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var oQueCadaAcaoFaz = {
    criar: 'Cadastrar casos novos',
    editar: 'Alterar casos já cadastrados',
    ocultar: 'Tirar um caso da tela (a linha permanece na planilha)',
    exportar: 'Baixar o que está vendo',
    configurar: 'Abrir Configurações e mexer em conteúdo e regra',
    estrutura: 'Criar coluna e mesa — pede senha de administrador'
  };

  var oQueCadaEscopoAlcanca = {
    PROPRIOS: 'Só os casos em que a pessoa é a responsável',
    EQUIPE: 'Os casos de quem atende o mesmo canal que ela',
    MESA: 'Todos os casos das mesas que ela enxerga',
    TODOS: 'Todos os casos, de todas as mesas'
  };

  return {
    telas: RECC_TELAS_DO_SISTEMA.map(function (item) {
      return { chave: item.tela, titulo: item.titulo };
    }),
    acoes: Object.keys(RECC_ACOES).map(function (chave) {
      var acao = RECC_ACOES[chave];
      return { chave: acao, descricao: oQueCadaAcaoFaz[acao] || '' };
    }),
    escopos: Object.keys(RECC_ESCOPOS).map(function (chave) {
      return { chave: chave, descricao: oQueCadaEscopoAlcanca[chave] || '' };
    })
  };
}

// ============================================================================
// MESAS DE TRABALHO
// ============================================================================

/**
 * As mesas, inclusive as desligadas — aqui se administra.
 *
 * Vem com as colunas da base junto porque quase toda escolha desta seção é
 * "qual coluna guarda isto": escrever o nome da coluna à mão é como navegar
 * sem Log Pose — funciona até o dia em que você erra uma letra e o painel
 * fica em branco sem dizer por quê.
 */
function listarMesasConfiguraveis() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  return lerRegistros_('MESAS')
    .sort(function (uma, outra) {
      return (Number(uma.Ordem) || 0) - (Number(outra.Ordem) || 0);
    })
    .map(function (mesa) {
      var colunas = [];
      var situacoes = [];
      try {
        colunas = estruturaDaAba_(String(mesa.Aba)).cabecalhos
          .filter(function (cabecalho) {
            return cabecalho && cabecalho.charAt(0) !== '_';
          });
        situacoes = listarCatalogo('STATUS', mesa.__id).map(function (item) {
          return item.nome;
        });
      } catch (erro) {
        // Aba que não existe não derruba a tela: a mesa aparece marcada, e o
        // administrador vê qual é o problema em vez de uma página branca.
        colunas = [];
      }

      return {
        id: mesa.__id,
        nome: String(mesa.Nome),
        descricao: String(mesa.Descricao || ''),
        aba: String(mesa.Aba),
        abaExiste: colunas.length > 0,
        colunaDaData: String(mesa.ColunaDaData || ''),
        colunaDaHora: String(mesa.ColunaDaHora || ''),
        colunaDoStatus: String(mesa.ColunaDoStatus || ''),
        colunasDaFila: String(mesa.ColunasDaFila || ''),
        colunaDaFinalizacao: String(mesa.ColunaDaFinalizacao || ''),
        colunaDaAreaResponsavel: String(mesa.ColunaDaAreaResponsavel || ''),
        icone: String(mesa.Icone || ''),
        ordem: Number(mesa.Ordem) || 0,
        ativo: normalizarParaComparar_(mesa.Ativo) === 'sim',
        colunasDaBase: colunas,
        situacoes: situacoes
      };
    });
}

/**
 * Altera uma mesa que já existe.
 *
 * Muda o que a mesa MOSTRA — nome, ícone, quais colunas viram fila, quais
 * situações viram cartão. Não muda onde ela mora: a aba é escolhida quando a
 * mesa nasce, e trocá-la apontaria todos os casos já gravados para o lugar
 * errado. Criar mesa nova é estrutura, e ainda não passa por aqui.
 */
function salvarMesa(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var id = converterParaIdentificador_(dados.id);
  var atual = buscarRegistros_('MESAS', 'Id', id, 1)[0];
  if (!atual) throw new Error('Mesa ' + id + ' não encontrada.');

  if (dados.aba && String(dados.aba) !== String(atual.Aba)) {
    throw new Error('A aba de uma mesa não muda por aqui: os casos já ' +
      'gravados moram nela. Crie outra mesa apontando para a aba nova.');
  }

  var nome = String(dados.nome || '').trim();
  if (!nome) throw new Error('Dê um nome à mesa.');

  var estrutura = estruturaDaAba_(String(atual.Aba));
  ['colunaDaData', 'colunaDaHora', 'colunaDoStatus', 'colunaDaFinalizacao',
    'colunaDaAreaResponsavel'].forEach(function (chave) {
    conferirQueAColunaExiste_(estrutura, dados[chave], atual.Aba);
  });
  // As colunas da fila podem vir agrupadas — "Título: col, col; Título: col".
  // Conferimos coluna por coluna, ignorando os títulos: título é texto livre,
  // e é a coluna que precisa existir.
  String(dados.colunasDaFila || '').split(';').forEach(function (grupo) {
    var lista = grupo.indexOf(':') > 0
      ? grupo.substring(grupo.indexOf(':') + 1) : grupo;
    lista.split(',').forEach(function (pedaco) {
      conferirQueAColunaExiste_(estrutura, pedaco, atual.Aba);
    });
  });

  // Desligar a última mesa ativa deixaria o Dashboard sem nada para mostrar,
  // e o cadastro sem formulário — o sistema inteiro pareceria quebrado.
  if (dados.ativo === false) {
    var outrasAtivas = lerRegistros_('MESAS').filter(function (mesa) {
      return converterParaIdentificador_(mesa.Id) !== id
        && normalizarParaComparar_(mesa.Ativo) === 'sim';
    });
    if (!outrasAtivas.length) {
      throw new Error('Esta é a última mesa ativa. Desligá-la deixaria o ' +
        'Dashboard e o cadastro sem nenhuma base para trabalhar.');
    }
  }

  atualizarRegistro_('MESAS', id, {
    Nome: nome,
    Descricao: String(dados.descricao === undefined ? atual.Descricao : dados.descricao),
    ColunaDaData: String(dados.colunaDaData || ''),
    ColunaDaHora: String(dados.colunaDaHora || ''),
    ColunaDoStatus: String(dados.colunaDoStatus || ''),
    ColunasDaFila: String(dados.colunasDaFila || ''),
    ColunaDaFinalizacao: String(dados.colunaDaFinalizacao || ''),
    ColunaDaAreaResponsavel: String(dados.colunaDaAreaResponsavel || ''),
    Icone: String(dados.icone || atual.Icone || ''),
    Ordem: Number(dados.ordem) || Number(atual.Ordem) || 0,
    Ativo: dados.ativo === false ? 'NAO' : 'SIM'
  });

  esquecerEstruturaLida_();
  registrarAuditoria_('mesa.editar', 'MESAS', id, nome);
  return true;
}

/**
 * Recusa o nome de uma coluna que não existe na base da mesa.
 *
 * Sem esta conferência o erro só apareceria no Dashboard, dias depois, como
 * uma coluna em branco — e ninguém ligaria a coisa à letra trocada aqui.
 */
function conferirQueAColunaExiste_(estrutura, nomeDaColuna, nomeDaAba) {
  var nome = String(nomeDaColuna || '').trim();
  if (!nome) return;
  if (posicaoDaColuna_(estrutura, nome) >= 0) return;

  throw new Error('A coluna "' + nome + '" não existe na aba ' + nomeDaAba +
    '. As colunas dela são: ' + estrutura.cabecalhos.filter(function (cabecalho) {
      return cabecalho && cabecalho.charAt(0) !== '_';
    }).join(', ') + '.');
}

// ============================================================================
// CARTÕES DOS PAINÉIS
// ============================================================================

/** Quantos cartões uma operação aguenta antes de virar parede de números. */
const RECC_MAXIMO_DE_CARTOES = 12;

/**
 * Os cartões de uma tela, para uma mesa, e as opções que a tela oferece.
 *
 * Vem tudo junto porque a tela abre mostrando as duas coisas: a lista de
 * cartões e o que cada um pode contar.
 */
function listarCardsDoPainel(tela, idDaMesa) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var mesa = mesaPeloId_(idDaMesa);
  var alvo = normalizarParaComparar_(tela) || 'dashboard';

  var oQueContar = [
    { chave: 'total', rotulo: 'Total de casos', filtro: '' }
  ];
  situacoesDaMesa_(mesa).forEach(function (situacao) {
    // O cartão aponta para o que está GRAVADO no caso, e mostra o rótulo.
    oQueContar.push({
      chave: 'situacao', rotulo: situacao.nome, filtro: situacao.gravadoComo
    });
  });
  if (mesa.colunaDaFinalizacao && mesa.colunaDaAreaResponsavel) {
    oQueContar.push({
      chave: 'naCelula', rotulo: 'Finalizados na célula', filtro: ''
    });
  }

  var cartoes = lerRegistros_('PAINEIS')
    .filter(function (linha) {
      if (normalizarParaComparar_(linha.Tela) !== alvo) return false;
      if (normalizarParaComparar_(linha.TipoWidget) !== 'cartao') return false;
      return converterParaIdentificador_(linha.MesaId)
        === converterParaIdentificador_(mesa.id);
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
        cor: tomValido_(linha.Cor),
        ordem: Number(linha.Ordem) || 0,
        mostrar: normalizarParaComparar_(linha.Ativo) === 'sim'
      };
    });

  return {
    tela: alvo,
    mesa: { id: mesa.id, nome: mesa.nome, icone: mesa.icone,
      descricao: mesa.descricao },
    maximo: RECC_MAXIMO_DE_CARTOES,
    tons: RECC_TONS,
    oQueContar: oQueContar,
    cartoes: cartoes
  };
}

/**
 * Grava a lista inteira de cartões de uma vez.
 *
 * A tela edita todos juntos e aperta Salvar uma vez só — então o servidor
 * recebe a lista inteira e a torna verdade. Gravar cartão por cartão deixaria
 * a tela e a planilha em estados diferentes se a conexão caísse no meio.
 *
 * Remover um cartão NÃO toca em caso nenhum: o cartão é uma forma de contar,
 * e apagar a conta não apaga o que foi contado.
 */
function salvarCardsDoPainel(tela, idDaMesa, cartoes) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var mesa = mesaPeloId_(idDaMesa);
  var alvo = normalizarParaComparar_(tela) || 'dashboard';
  var lista = Array.isArray(cartoes) ? cartoes : [];

  if (lista.length > RECC_MAXIMO_DE_CARTOES) {
    throw new Error('São no máximo ' + RECC_MAXIMO_DE_CARTOES + ' cartões por ' +
      'operação, e você mandou ' + lista.length + '. Acima disso a tela vira ' +
      'uma parede de números pequenos, que ninguém lê.');
  }

  var situacoes = situacoesDaMesa_(mesa).map(function (s) {
    return s.gravadoComo;
  });

  lista.forEach(function (cartao) {
    if (!String(cartao.titulo || '').trim()) {
      throw new Error('Todo cartão precisa de um nome — é o que a pessoa lê ' +
        'em cima do número.');
    }
    cartao.dimensao = dimensaoDoCartao_(cartao.dimensao);
    if (!cartao.dimensao) {
      throw new Error('Não sei contar isso. As contagens são: total, ' +
        'situacao e naCelula.');
    }
    if (cartao.dimensao === 'situacao') {
      var existe = situacoes.some(function (nome) {
        return normalizarParaComparar_(nome) === normalizarParaComparar_(cartao.filtro);
      });
      if (!existe) {
        throw new Error('A situação "' + cartao.filtro + '" não existe na mesa ' +
          mesa.nome + '. As situações dela são: ' + situacoes.join(', ') + '.');
      }
    }
  });

  // O que estava lá antes, para saber o que sobrou de fora e desligar.
  var jaGravados = lerRegistros_('PAINEIS').filter(function (linha) {
    if (normalizarParaComparar_(linha.Tela) !== alvo) return false;
    if (normalizarParaComparar_(linha.TipoWidget) !== 'cartao') return false;
    return converterParaIdentificador_(linha.MesaId)
      === converterParaIdentificador_(mesa.id);
  });
  var continuam = {};

  lista.forEach(function (cartao, posicao) {
    var campos = {
      Tela: alvo,
      MesaId: mesa.id,
      Titulo: String(cartao.titulo).trim(),
      TipoWidget: 'cartao',
      CampoDimensao: cartao.dimensao,
      CampoMedida: '',
      Agregacao: 'contagem',
      Limite: 0,
      Filtro: cartao.dimensao === 'situacao' ? String(cartao.filtro || '') : '',
      Ordem: posicao + 1,
      Largura: 1,
      Cor: tomValido_(cartao.cor),
      VisivelPara: String(cartao.visivelPara || ''),
      Ativo: cartao.mostrar === false ? 'NAO' : 'SIM'
    };

    var id = converterParaIdentificador_(cartao.id);
    if (id && buscarRegistros_('PAINEIS', 'Id', id, 1)[0]) {
      atualizarRegistro_('PAINEIS', id, campos);
      continuam[id] = true;
      return;
    }
    continuam[inserirRegistro_('PAINEIS', campos).__id] = true;
  });

  // Cartão que a tela não mandou de volta foi removido lá. Ele é DESLIGADO,
  // não apagado: a linha continua na planilha, e nenhum caso é tocado — um
  // cartão é uma forma de contar, e apagar a conta não apaga o que foi
  // contado. Em PAINEIS quem desliga é a coluna Ativo, porque a aba não tem
  // exclusão lógica (ela não é base operacional).
  jaGravados.forEach(function (linha) {
    if (!continuam[linha.__id]) {
      atualizarRegistro_('PAINEIS', linha.__id, { Ativo: 'NAO', Ordem: 0 });
    }
  });

  registrarAuditoria_('painel.cartoes', 'PAINEIS', '',
    mesa.nome + ' · ' + lista.length + ' cartões');
  return true;
}

// ============================================================================
// IDENTIDADE E SEGURANÇA
// ============================================================================

/** Nome, subtítulo, operação, logo, cor e o rodapé do menu. */
function salvarIdentidade(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var mudancas = {
    'IDENTIDADE.NOME': String(dados.nome || '').trim(),
    'IDENTIDADE.NOME_LONGO': String(dados.nomeLongo || '').trim(),
    'IDENTIDADE.OPERACAO': String(dados.operacao || '').trim(),
    'IDENTIDADE.COR_PRIMARIA': String(dados.corPrimaria || '').trim(),
    'IDENTIDADE.PLATAFORMA': String(dados.plataforma || '').trim(),
    'IDENTIDADE.FABRICANTE': String(dados.fabricante || '').trim(),
    'IDENTIDADE.FRASE': String(dados.frase || '').trim()
  };

  if (!mudancas['IDENTIDADE.NOME']) {
    throw new Error('O sistema precisa de um nome — ele aparece na barra ' +
      'superior e no título da janela.');
  }
  if (mudancas['IDENTIDADE.COR_PRIMARIA']
    && !/^#[0-9A-Fa-f]{6}$/.test(mudancas['IDENTIDADE.COR_PRIMARIA'])) {
    throw new Error('A cor precisa estar no formato #RRGGBB, como #0B77CE.');
  }

  Object.keys(mudancas).forEach(function (chave) {
    gravarConfiguracao_(chave, mudancas[chave]);
  });

  registrarAuditoria_('identidade.editar', 'CONFIG', '', mudancas['IDENTIDADE.NOME']);
  return lerIdentidadeVisual_();
}

/** Grava uma chave da aba CONFIG, criando a linha se ela não existir. */
function gravarConfiguracao_(chave, valor) {
  var alvo = normalizarParaComparar_(chave);
  var linhas = lerRegistros_('CONFIG');

  for (var i = 0; i < linhas.length; i++) {
    if (normalizarParaComparar_(linhas[i].Chave) === alvo) {
      atualizarRegistro_('CONFIG', linhas[i].__id, {
        Valor: valor,
        AtualizadoPor: (usuarioAtual_().usuario || {}).Id || '',
        Data: new Date()
      });
      return linhas[i].__id;
    }
  }
  return inserirRegistro_('CONFIG', {
    Chave: chave,
    Valor: valor,
    Descricao: '',
    AtualizadoPor: (usuarioAtual_().usuario || {}).Id || '',
    Data: new Date()
  }).__id;
}

/** Define ou troca a senha de administrador. Chamada pelo navegador. */
function definirSenhaDeAdministrador(senhaNova, senhaAtual) {
  exigirPermissao_(RECC_ACOES.ESTRUTURA);
  definirSenhaDeAdministrador_(senhaNova, senhaAtual);
  registrarAuditoria_('seguranca.senha', 'CONFIG', '', '');
  return true;
}

/** Libera a sessão para as ações sem volta. Chamada pelo navegador. */
function liberarComSenha(senha) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  return conferirSenhaDeAdministrador_(senha);
}

// ============================================================================
// ESTRUTURA DA PLANILHA
// ============================================================================

/**
 * O laudo da estrutura, pronto para a tela.
 *
 * Só lê. Coluna que sumiu e coluna que apareceu são mostradas lado a lado
 * para o administrador decidir — o sistema não adivinha que uma virou a
 * outra. Adivinhar erraria calado, e o dado iria para a coluna errada.
 */
function conferirEstruturaDaPlanilha() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var laudo = conferirEstrutura_();

  return {
    ok: laudo.ok,
    abas: laudo.abas.map(function (aba) {
      return {
        aba: aba.aba,
        existe: aba.existe,
        linhas: aba.linhas,
        faltando: aba.faltando,
        aMais: aba.aMais
      };
    })
  };
}

/** As últimas ações registradas, da mais recente para a mais antiga. */
function listarAuditoria(quantas) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var limite = Number(quantas) || 50;

  var nomes = {};
  lerRegistros_('USUARIOS').forEach(function (usuario) {
    nomes[usuario.__id] = String(usuario.Nome);
  });

  return lerRegistros_('AUDITORIA', { ultimas: limite })
    .reverse()
    .map(function (linha) {
      return {
        dataHora: linha.DataHora
          ? Utilities.formatDate(new Date(linha.DataHora), RECC_FUSO_HORARIO,
            'dd/MM/yyyy HH:mm')
          : '',
        quem: nomes[converterParaIdentificador_(linha.UsuarioId)] || 'Sem dados',
        acao: String(linha.Acao || ''),
        entidade: String(linha.Entidade || ''),
        registro: String(linha.RegistroId || ''),
        detalhe: String(linha.Detalhe || '')
      };
    });
}
