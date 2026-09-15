/**
 * ============================================================================
 * RECC — Usuarios.gs · o cadastro de quem pode entrar
 * ============================================================================
 * Não existe senha própria: a pessoa entra com a conta Google dela, e o
 * sistema confere o e-mail autenticado contra esta aba. Cadastrar alguém é,
 * literalmente, dar acesso.
 *
 * As funções SEM sublinhado no fim são chamadas pelo navegador. Todas elas
 * começam conferindo permissão — a tela esconde o botão por educação, o
 * servidor confere por obrigação.
 * ============================================================================
 */

/**
 * A lista de usuários, com cargo, nível e mesa já traduzidos para nome.
 *
 * Tudo sai como TEXTO — inclusive as datas. Elas atravessam a fronteira do
 * `google.script.run` em JSON, e um `Date` atravessa como um texto ISO que a
 * tela teria de reinterpretar; formatar aqui deixa uma regra só, do lado que
 * conhece o fuso da operação.
 */
function listarUsuarios() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var catalogo = {};
  lerRegistros_('CATALOGO').forEach(function (item) {
    catalogo[converterParaIdentificador_(item.Id)] = String(item.Nome || '');
  });

  var mesas = {};
  lerRegistros_('MESAS').forEach(function (mesa) {
    mesas[converterParaIdentificador_(mesa.Id)] = String(mesa.Nome || '');
  });

  return lerRegistros_('USUARIOS').map(function (usuario) {
    var mesaId = converterParaIdentificador_(usuario.MesaId);
    return {
      id: String(usuario.Id || ''),
      nome: String(usuario.Nome || ''),
      email: String(usuario.Email || ''),
      canalQueAtende: String(usuario['Canal que atende'] || ''),
      mesaId: mesaId,
      // Sem mesa NÃO é falta de dado: é o administrador, que atende todas.
      mesa: mesaId ? (mesas[mesaId] || 'Mesa desligada') : '',
      cargoId: converterParaIdentificador_(usuario.CargoId),
      cargo: catalogo[converterParaIdentificador_(usuario.CargoId)] || 'Sem cargo',
      nivelAcessoId: converterParaIdentificador_(usuario.NivelAcessoId),
      nivelAcesso:
        catalogo[converterParaIdentificador_(usuario.NivelAcessoId)] || 'Sem dados',
      matricula: converterParaIdentificador_(usuario.Matricula),
      ativo: normalizarParaComparar_(usuario.Ativo) === 'sim',
      administrador: ehAdministrador_(usuario.Id),
      dataCadastro: comoDataEHora_(usuario.DataCadastro),
      ultimoAcesso: comoDataEHora_(usuario.UltimoAcesso)
    };
  });
}

/** Uma data da planilha vira texto legível. Vazio continua vazio. */
function comoDataEHora_(valor) {
  if (!valor) return '';
  var data = converterParaData_(valor);
  if (!data) return '';
  return Utilities.formatDate(data, RECC_FUSO_HORARIO, 'dd/MM/yyyy HH:mm');
}

/**
 * Cria ou atualiza um usuário.
 *
 * "Sem dados" no cargo ou no nível não é aceitável na hora de gravar: nível
 * inexistente deixaria a pessoa cadastrada e sem conseguir entrar, e ela não
 * teria como descobrir o motivo sozinha.
 */
function salvarUsuario(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var email = String(dados.email || '').trim().toLowerCase();
  if (!email || email.indexOf('@') < 0) {
    throw new Error('Informe um e-mail válido — é por ele que a pessoa entra.');
  }
  if (!String(dados.nome || '').trim()) {
    throw new Error('Informe o nome da pessoa.');
  }
  if (!itemDoCatalogo_(dados.nivelAcessoId)) {
    throw new Error('Escolha um nível de acesso que exista. ' +
      'Sem nível válido a pessoa fica cadastrada e não consegue entrar.');
  }

  // A mesa é OPCIONAL — quem administra não pertence a nenhuma. Mas se vier
  // preenchida, tem de existir: uma mesa que sumiu deixaria a pessoa apontando
  // para o nada, e ninguém descobriria até alguém estranhar o Dashboard vazio.
  var mesaEscolhida = converterParaIdentificador_(dados.mesaId);
  if (mesaEscolhida) {
    var existe = lerRegistros_('MESAS').filter(function (mesa) {
      return converterParaIdentificador_(mesa.Id) === mesaEscolhida;
    })[0];
    if (!existe) {
      throw new Error('A mesa escolhida não existe mais. Escolha outra, ou ' +
        'deixe em branco — quem administra não pertence a uma mesa.');
    }
  }

  var idInformado = converterParaIdentificador_(dados.id);
  var jaCadastrados = lerRegistros_('USUARIOS');
  for (var i = 0; i < jaCadastrados.length; i++) {
    var mesmoEmail =
      normalizarParaComparar_(jaCadastrados[i].Email) === normalizarParaComparar_(email);
    var outraPessoa =
      converterParaIdentificador_(jaCadastrados[i].Id) !== idInformado;
    if (mesmoEmail && outraPessoa) {
      throw new Error('O e-mail ' + email + ' já está cadastrado para ' +
        jaCadastrados[i].Nome + '.');
    }
  }

  var campos = {
    Nome: String(dados.nome).trim(),
    Email: email,
    'Canal que atende': String(dados.canalQueAtende || '').trim(),
    // Mesa VAZIA é válida: é o administrador, que atende todas e delega.
    MesaId: converterParaIdentificador_(dados.mesaId),
    CargoId: converterParaIdentificador_(dados.cargoId),
    NivelAcessoId: converterParaIdentificador_(dados.nivelAcessoId),
    Matricula: converterParaIdentificador_(dados.matricula),
    Ativo: dados.ativo === false ? 'NAO' : 'SIM'
  };

  var gravado;
  if (idInformado) {
    gravado = atualizarRegistro_('USUARIOS', idInformado, campos);
    registrarAuditoria_('usuario.editar', 'USUARIOS', idInformado, '');
  } else {
    campos.DataCadastro = new Date();
    campos.UltimoAcesso = '';
    gravado = inserirRegistro_('USUARIOS', campos);
    registrarAuditoria_('usuario.criar', 'USUARIOS', gravado.__id, '');
  }
  return gravado.__id;
}

/**
 * Tira o acesso da pessoa sem apagar o histórico dela.
 *
 * Desativar e ocultar são coisas diferentes: desativado continua na tela de
 * usuários, com o acesso fechado; ocultado sai da tela. O que nunca acontece
 * é apagar a linha — os registros que ela criou apontam para este Id.
 */
function desativarUsuario(idDoUsuario) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var alvo = converterParaIdentificador_(idDoUsuario);

  if (alvo === converterParaIdentificador_(quem.usuario.Id)) {
    throw new Error('Você não pode desativar o próprio acesso. ' +
      'Peça a outro administrador.');
  }
  if (contarAdministradoresAtivos_() <= 1 && ehAdministrador_(alvo)) {
    throw new Error('Este é o último administrador ativo. ' +
      'Cadastre outro antes de desativar este — senão ninguém mais consegue ' +
      'configurar o sistema.');
  }

  atualizarRegistro_('USUARIOS', alvo, { Ativo: 'NAO' });
  registrarAuditoria_('usuario.desativar', 'USUARIOS', alvo, '');
  return true;
}

/** O nível de acesso que pode mexer na estrutura é o de administrador. */
function ehAdministrador_(idDoUsuario) {
  var alvo = converterParaIdentificador_(idDoUsuario);
  var usuarios = lerRegistros_('USUARIOS');
  for (var i = 0; i < usuarios.length; i++) {
    if (converterParaIdentificador_(usuarios[i].Id) !== alvo) continue;
    var nivel = itemDoCatalogo_(usuarios[i].NivelAcessoId);
    if (!nivel) return false;
    return podeFazer_(lerPermissoesDoNivel_(nivel), RECC_ACOES.ESTRUTURA);
  }
  return false;
}

function contarAdministradoresAtivos_() {
  var quantidade = 0;
  lerRegistros_('USUARIOS').forEach(function (usuario) {
    if (normalizarParaComparar_(usuario.Ativo) !== 'sim') return;
    if (ehAdministrador_(usuario.Id)) quantidade++;
  });
  return quantidade;
}

/**
 * Carimba o último acesso.
 *
 * Falhar aqui não pode impedir alguém de entrar: é informação de apoio, não
 * de controle. Por isso o erro é engolido e só vai para o log.
 */
function registrarUltimoAcesso_(usuario) {
  try {
    atualizarRegistro_('USUARIOS', usuario.Id, { UltimoAcesso: new Date() });
  } catch (erro) {
    Logger.log('Não consegui carimbar o último acesso: ' + erro.message);
  }
}
