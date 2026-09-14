/* ==========================================================================
   PGO — Codigo.gs
   --------------------------------------------------------------------------
   ARQUIVO GERADO — não edite aqui.

   Ele junta os 18 arquivos .gs do repositório para caberem numa colagem só no
   Apps Script. Para mudar qualquer coisa, mexa no arquivo original e rode
   de novo:

       node Evolucao/Testes/gerar-pacote.js

   Gerado em 2026-09-14 22:04
   ========================================================================== */



/* ==== Acesso.gs =========================================================== */

/**
 * ============================================================================
 * RECC — Acesso.gs · quem entra, e o que cada um pode
 * ============================================================================
 * Duas coisas diferentes, e confundi-las é o erro mais caro que este sistema
 * pode cometer:
 *
 *   CARGO         é o que a pessoa É na organização. Texto livre, muda quando
 *                 o RH quiser. Aparece embaixo do nome na barra superior e
 *                 NÃO decide nada.
 *
 *   NÍVEL DE      é o que a pessoa PODE. Daqui saem as telas do menu, os
 *   ACESSO        campos que ela enxerga no formulário, os componentes de cada
 *                 painel, as ações permitidas e o alcance sobre os dados.
 *
 * Nunca escreva `if (cargo === 'ADM')`. O nome do cargo é editável pelo
 * próprio administrador; a permissão sumiria junto com o texto.
 *
 * A OUTRA REGRA: esconder botão não é segurança. A tela esconde por educação;
 * o servidor confere por obrigação. Toda função sensível chama
 * exigirPermissao_ antes de fazer qualquer coisa.
 * ============================================================================
 */

/** As ações que um nível de acesso pode conceder. */
const RECC_ACOES = {
  CRIAR: 'criar',
  EDITAR: 'editar',
  OCULTAR: 'ocultar',
  EXPORTAR: 'exportar',
  CONFIGURAR: 'configurar',
  ESTRUTURA: 'estrutura'
};

/** O alcance de cada pessoa sobre os dados. */
const RECC_ESCOPOS = {
  PROPRIOS: 'PROPRIOS',
  EQUIPE: 'EQUIPE',
  MESA: 'MESA',
  TODOS: 'TODOS'
};

/**
 * As telas do sistema, na ordem em que aparecem no menu.
 *
 * Mora AQUI, junto das ações e dos escopos, porque é uma lista de permissão:
 * é ela que a tela de Configurações oferece ao montar um nível de acesso, e é
 * ela que o menu percorre. Ter a lista escrita em dois lugares é como ter dois
 * mapas do mesmo mar: um dia eles divergem, e a tela nova nasce inacessível
 * porque ninguém lembrou de acrescentá-la no segundo.
 *
 * O título aqui é o nome de fábrica. O administrador pode trocá-lo em
 * MENU.TITULOS sem que o sistema perca de vista qual tela é qual — o que
 * identifica a tela é a CHAVE, nunca o texto.
 */
const RECC_TELAS_DO_SISTEMA = [
  { tela: 'dashboard', titulo: 'Dashboard' },
  { tela: 'cadastrarCaso', titulo: 'Cadastrar Caso' },
  { tela: 'minhaPerformance', titulo: 'Minha Performance' },
  { tela: 'buscarCaso', titulo: 'Buscar Caso' },
  { tela: 'tabelaCorretoras', titulo: 'Tabela de Corretoras' },
  { tela: 'painelAnalitico', titulo: 'Painel Analítico' },
  { tela: 'configuracoes', titulo: 'Configurações' }
];

/** Como um campo pode aparecer para um nível de acesso. */
const RECC_VISIBILIDADE = {
  OCULTO: 'oculto',
  LEITURA: 'leitura',
  EDICAO: 'edicao'
};

// ============================================================================
// QUEM ESTÁ ENTRANDO
// ============================================================================

/**
 * A pessoa autenticada no Google, conferida contra a aba USUARIOS.
 *
 * Devolve SEMPRE um objeto, nunca lança: não estar cadastrado é uma resposta
 * legítima do sistema, não um erro. Quem trata isso é a tela.
 *
 *   { cadastrado: false, email: '...', motivo: '...' }
 *   { cadastrado: true,  email, usuario, cargo, nivel, permissoes }
 */
function usuarioAtual_() {
  var email = String(Session.getActiveUser().getEmail() || '').trim();
  if (!email) {
    return {
      cadastrado: false,
      situacao: 'SEM_EMAIL',
      email: '',
      motivo: 'O Google não informou o e-mail de quem está acessando.'
    };
  }

  var encontrado = null;
  var usuarios = lerRegistros_('USUARIOS');
  for (var i = 0; i < usuarios.length; i++) {
    if (normalizarParaComparar_(usuarios[i].Email) === normalizarParaComparar_(email)) {
      encontrado = usuarios[i];
      break;
    }
  }

  if (!encontrado) {
    return {
      cadastrado: false,
      situacao: 'NAO_CADASTRADO',
      email: email,
      motivo: 'Este e-mail não está cadastrado no sistema.'
    };
  }
  if (normalizarParaComparar_(encontrado.Ativo) !== 'sim') {
    return {
      cadastrado: false,
      situacao: 'DESATIVADO',
      email: email,
      motivo: 'Este e-mail está cadastrado, mas o acesso está desativado.'
    };
  }

  var nivel = itemDoCatalogo_(encontrado.NivelAcessoId);
  if (!nivel) {
    return {
      cadastrado: false,
      situacao: 'NIVEL_INEXISTENTE',
      email: email,
      motivo: 'O nível de acesso deste usuário não existe mais no catálogo. ' +
        'Peça a um administrador para reatribuir.'
    };
  }

  if (normalizarParaComparar_(nivel.Ativo) !== 'sim') {
    return {
      cadastrado: false,
      situacao: 'NIVEL_DESLIGADO',
      email: email,
      motivo: 'O nível de acesso "' + nivel.Nome + '" está desligado. ' +
        'Enquanto estiver assim, ninguém que dependa dele entra.'
    };
  }

  var cargo = itemDoCatalogo_(encontrado.CargoId);

  return {
    cadastrado: true,
    email: email,
    usuario: encontrado,
    cargo: cargo ? cargo.Nome : '',
    nivel: nivel.Nome,
    nivelId: nivel.Id,
    permissoes: lerPermissoesDoNivel_(nivel)
  };
}

/** Um item do catálogo pelo Id. Devolve null quando o item foi excluído. */
function itemDoCatalogo_(idDoItem) {
  var alvo = converterParaIdentificador_(idDoItem);
  if (!alvo) return null;
  var itens = lerRegistros_('CATALOGO');
  for (var i = 0; i < itens.length; i++) {
    if (converterParaIdentificador_(itens[i].Id) === alvo) return itens[i];
  }
  return null;
}

// ============================================================================
// O QUE O NÍVEL PERMITE
// ============================================================================

/**
 * Traduz a coluna Configuracao do nível — que é um texto em JSON — no objeto
 * de permissões que o resto do sistema consulta.
 *
 * Configuração quebrada NÃO vira permissão vazia em silêncio. Um menu vazio
 * seria lido como "não tenho acesso", quando na verdade é "a configuração
 * está com defeito" — e alguém passaria a tarde procurando no lugar errado.
 */
function lerPermissoesDoNivel_(nivel) {
  var permissoes = {
    escopo: RECC_ESCOPOS.PROPRIOS,
    telas: [],
    acoes: [],
    campos: {},
    componentes: {},
    defeito: ''
  };

  var texto = String(nivel.Configuracao || '').trim();
  if (!texto) {
    permissoes.defeito = 'O nível "' + nivel.Nome + '" está sem configuração.';
    return permissoes;
  }

  var lido;
  try {
    lido = JSON.parse(texto);
  } catch (erro) {
    permissoes.defeito = 'A configuração do nível "' + nivel.Nome +
      '" não é um JSON válido: ' + erro.message;
    return permissoes;
  }

  permissoes.escopo = RECC_ESCOPOS[lido.escopo] || RECC_ESCOPOS.PROPRIOS;
  permissoes.telas = Array.isArray(lido.telas) ? lido.telas : [];
  permissoes.acoes = Array.isArray(lido.acoes) ? lido.acoes : [];
  permissoes.campos = lido.campos && typeof lido.campos === 'object' ? lido.campos : {};
  permissoes.componentes =
    lido.componentes && typeof lido.componentes === 'object' ? lido.componentes : {};
  return permissoes;
}

function podeVerTela_(permissoes, nomeDaTela) {
  return permissoes.telas.indexOf(nomeDaTela) >= 0;
}

function podeFazer_(permissoes, acao) {
  return permissoes.acoes.indexOf(acao) >= 0;
}

/**
 * A guarda do servidor. Chame no começo de TODA função sensível.
 * Devolve o usuário para quem passou, para a função não precisar buscar de novo.
 */
function exigirPermissao_(acao) {
  var quem = usuarioAtual_();
  if (!quem.cadastrado) {
    throw new Error('Acesso negado: ' + quem.motivo);
  }
  if (quem.permissoes.defeito) {
    throw new Error('Acesso indisponível: ' + quem.permissoes.defeito);
  }
  if (!podeFazer_(quem.permissoes, acao)) {
    throw new Error('Seu nível de acesso ("' + quem.nivel + '") não permite ' +
      acao + '.');
  }
  return quem;
}

/**
 * A guarda de quem só quer VER uma tela.
 *
 * Abrir o Dashboard não é uma ação como criar ou editar — é uma tela. Exigir
 * "criar" para ver o painel tiraria o painel de quem só consulta, e exigir
 * nada deixaria qualquer nível abrir qualquer tela pelo endereço.
 */
function exigirTela_(nomeDaTela) {
  var quem = usuarioAtual_();
  if (!quem.cadastrado) throw new Error('Acesso negado: ' + quem.motivo);
  if (quem.permissoes.defeito) {
    throw new Error('Acesso indisponível: ' + quem.permissoes.defeito);
  }
  if (!podeVerTela_(quem.permissoes, nomeDaTela)) {
    throw new Error('Seu nível de acesso ("' + quem.nivel + '") não abre a tela '
      + nomeDaTela + '.');
  }
  return quem;
}

/**
 * Como cada campo aparece para este nível.
 *
 * O padrão é EDIÇÃO: um campo novo criado pelo administrador nasce visível
 * para todos, e ele restringe se quiser. O contrário — nascer oculto —
 * faria todo campo novo sumir e ninguém entenderia por quê.
 */
function visibilidadeDoCampo_(permissoes, chaveDoCampo) {
  var declarada = permissoes.campos[chaveDoCampo];
  if (declarada === RECC_VISIBILIDADE.OCULTO) return RECC_VISIBILIDADE.OCULTO;
  if (declarada === RECC_VISIBILIDADE.LEITURA) return RECC_VISIBILIDADE.LEITURA;
  return RECC_VISIBILIDADE.EDICAO;
}

// ============================================================================
// ALCANCE SOBRE OS DADOS
// ============================================================================

/**
 * A coluna que diz de quem é o registro.
 *
 * Nas duas bases é o analista, e ela guarda o NOME, não o Id — foi pedido
 * assim. Por isso a comparação é por nome normalizado.
 */
function colunaDoResponsavel_(estrutura) {
  var candidatas = ['analista', 'responsavel'];
  for (var i = 0; i < estrutura.cabecalhos.length; i++) {
    if (candidatas.indexOf(normalizarParaComparar_(estrutura.cabecalhos[i])) >= 0) {
      return estrutura.cabecalhos[i];
    }
  }
  return '';
}

/**
 * Filtra os registros pelo alcance do nível.
 *
 * EQUIPE é definida pelo "Canal que atende" do cadastro do usuário — é a
 * única noção de equipe que existe na estrutura hoje. Se a operação passar a
 * ter hierarquia de supervisão, isso vira uma coluna nova em USUARIOS e só
 * esta função muda.
 */
function filtrarPeloAlcance_(registros, nomeDaAba, quem) {
  if (quem.permissoes.escopo === RECC_ESCOPOS.TODOS) return registros;
  if (quem.permissoes.escopo === RECC_ESCOPOS.MESA) return registros;

  var estrutura = estruturaDaAba_(nomeDaAba);
  var coluna = colunaDoResponsavel_(estrutura);
  if (!coluna) return registros;

  if (quem.permissoes.escopo === RECC_ESCOPOS.PROPRIOS) {
    var meuNome = normalizarParaComparar_(quem.usuario.Nome);
    return registros.filter(function (registro) {
      return normalizarParaComparar_(registro[coluna]) === meuNome;
    });
  }

  // EQUIPE
  var meuCanal = normalizarParaComparar_(quem.usuario['Canal que atende']);
  if (!meuCanal) return [];

  var nomesDaEquipe = {};
  lerRegistros_('USUARIOS').forEach(function (usuario) {
    if (normalizarParaComparar_(usuario['Canal que atende']) === meuCanal) {
      nomesDaEquipe[normalizarParaComparar_(usuario.Nome)] = true;
    }
  });
  return registros.filter(function (registro) {
    return nomesDaEquipe[normalizarParaComparar_(registro[coluna])] === true;
  });
}

// ============================================================================
// SENHA DE ADMINISTRADOR — para o que não tem volta
// ============================================================================

const RECC_CHAVE_DA_SENHA = 'RECC_SENHA_DO_ADMINISTRADOR';
const RECC_CHAVE_DAS_TENTATIVAS = 'RECC_TENTATIVAS_DE_SENHA';
const RECC_CHAVE_DA_LIBERACAO = 'RECC_SENHA_LIBERADA_ATE';
const RECC_MINUTOS_LIBERADOS = 5;
const RECC_TENTATIVAS_ATE_BLOQUEAR = 3;
const RECC_HORAS_DE_BLOQUEIO = 24;

/**
 * A senha NUNCA é guardada. Guarda-se a impressão digital dela.
 *
 * SHA-256 sobre "tempero + senha", e o tempero é sorteado uma vez por
 * instalação. Sem tempero, duas instalações com a mesma senha teriam a mesma
 * impressão digital, e uma tabela pronta de senhas comuns quebraria as duas.
 *
 * Tudo isso mora em Script Properties, FORA da planilha: quem abre a planilha
 * não pode ver nem trocar a senha.
 */
function impressaoDigitalDaSenha_(tempero, senha) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, tempero + '|' + senha, Utilities.Charset.UTF_8);
  var hexadecimal = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] + 256) % 256;
    hexadecimal += (b < 16 ? '0' : '') + b.toString(16);
  }
  return hexadecimal;
}

function existeSenhaDeAdministrador_() {
  return !!PropertiesService.getScriptProperties().getProperty(RECC_CHAVE_DA_SENHA);
}

/**
 * Define ou troca a senha. Trocar exige a senha atual — senão qualquer pessoa
 * com a permissão de configurar poderia se promover sozinha.
 */
function definirSenhaDeAdministrador_(senhaNova, senhaAtual) {
  if (String(senhaNova || '').length < 6) {
    throw new Error('A senha precisa ter ao menos 6 caracteres.');
  }
  var propriedades = PropertiesService.getScriptProperties();
  if (existeSenhaDeAdministrador_()) {
    conferirSenhaDeAdministrador_(senhaAtual);
  }
  var tempero = Utilities.getUuid();
  propriedades.setProperty(RECC_CHAVE_DA_SENHA,
    tempero + ':' + impressaoDigitalDaSenha_(tempero, senhaNova));
  propriedades.deleteProperty(RECC_CHAVE_DAS_TENTATIVAS);
  return true;
}

/**
 * Confere a senha e libera a sessão por alguns minutos.
 * Três erros seguidos bloqueiam por 24 horas.
 */
function conferirSenhaDeAdministrador_(senha) {
  var propriedades = PropertiesService.getScriptProperties();
  var guardado = propriedades.getProperty(RECC_CHAVE_DA_SENHA);
  if (!guardado) {
    throw new Error('Nenhuma senha de administrador foi definida ainda. ' +
      'Defina em Configurações › Segurança.');
  }

  var tentativas = lerTentativasDeSenha_();
  if (tentativas.bloqueadoAte && new Date().getTime() < tentativas.bloqueadoAte) {
    var faltam = Math.ceil(
      (tentativas.bloqueadoAte - new Date().getTime()) / (1000 * 60 * 60));
    throw new Error('Senha bloqueada por ' + faltam + ' hora(s) após ' +
      RECC_TENTATIVAS_ATE_BLOQUEAR + ' tentativas erradas.');
  }

  var partes = guardado.split(':');
  var confere = impressaoDigitalDaSenha_(partes[0], String(senha || '')) === partes[1];

  if (!confere) {
    tentativas.quantidade++;
    if (tentativas.quantidade >= RECC_TENTATIVAS_ATE_BLOQUEAR) {
      tentativas.bloqueadoAte =
        new Date().getTime() + RECC_HORAS_DE_BLOQUEIO * 60 * 60 * 1000;
    }
    gravarTentativasDeSenha_(tentativas);
    var restam = RECC_TENTATIVAS_ATE_BLOQUEAR - tentativas.quantidade;
    throw new Error('Senha incorreta.' +
      (restam > 0 ? ' Restam ' + restam + ' tentativa(s).' : ' Acesso bloqueado.'));
  }

  propriedades.deleteProperty(RECC_CHAVE_DAS_TENTATIVAS);
  PropertiesService.getUserProperties().setProperty(RECC_CHAVE_DA_LIBERACAO,
    String(new Date().getTime() + RECC_MINUTOS_LIBERADOS * 60 * 1000));
  return true;
}

function lerTentativasDeSenha_() {
  var texto = PropertiesService.getScriptProperties()
    .getProperty(RECC_CHAVE_DAS_TENTATIVAS);
  if (!texto) return { quantidade: 0, bloqueadoAte: 0 };
  try {
    var lido = JSON.parse(texto);
    return {
      quantidade: Number(lido.quantidade) || 0,
      bloqueadoAte: Number(lido.bloqueadoAte) || 0
    };
  } catch (erro) {
    return { quantidade: 0, bloqueadoAte: 0 };
  }
}

function gravarTentativasDeSenha_(tentativas) {
  PropertiesService.getScriptProperties()
    .setProperty(RECC_CHAVE_DAS_TENTATIVAS, JSON.stringify(tentativas));
}

/**
 * A guarda das ações sem volta: criar ou remover coluna, apagar mesa, mexer
 * em nível de acesso, gerar aba de análise sobre uma existente, normalizar
 * base, ocultar em massa.
 */
function exigirSenhaDeAdministrador_() {
  var ate = Number(PropertiesService.getUserProperties()
    .getProperty(RECC_CHAVE_DA_LIBERACAO) || 0);
  if (new Date().getTime() > ate) {
    throw new Error('Esta ação exige a senha de administrador. ' +
      'A liberação anterior expirou — informe a senha novamente.');
  }
  return true;
}

// ============================================================================
// AUDITORIA
// ============================================================================

/**
 * Deixa rastro do que foi feito, sem gravar dado pessoal.
 * Nunca derruba a operação: falhar ao auditar não pode desfazer o que já
 * aconteceu — só registra o problema no log do Apps Script.
 */
function registrarAuditoria_(acao, entidade, idDoRegistro, detalhe) {
  try {
    inserirRegistro_('AUDITORIA', {
      DataHora: new Date(),
      UsuarioId: (usuarioAtual_().usuario || {}).Id || '',
      Acao: acao,
      Entidade: entidade || '',
      RegistroId: idDoRegistro || '',
      Detalhe: detalhe || ''
    });
  } catch (erro) {
    Logger.log('Falha ao registrar auditoria: ' + erro.message);
  }
}


/* ==== Analise.gs ========================================================== */

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


/* ==== Analitico.gs ======================================================== */

/**
 * ============================================================================
 * PGO — Analitico.gs · os números por trás da operação
 * ============================================================================
 * O Dashboard responde "o que eu tenho que trabalhar hoje". Esta tela responde
 * outra pergunta: "o que está acontecendo na operação". São coisas diferentes,
 * e por isso são telas diferentes.
 *
 * NADA AQUI É ESCRITO EM CÓDIGO. Cada gráfico é uma linha da aba `PAINEIS`:
 * o tipo, o campo que vira eixo, o que se mede, o limite do TOP N e a ordem.
 * Acrescentar um gráfico é acrescentar uma linha, em Configurações.
 *
 * DUAS REGRAS DE LEITURA que o código obedece, e que valem a pena entender:
 *
 *   UM EIXO SÓ. "Barras com linha" não são duas escalas no mesmo gráfico —
 *   isso faz a mesma altura significar duas coisas, e é o erro mais comum de
 *   gráfico que existe. Aqui a linha é a MÉDIA MÓVEL da própria barra, na
 *   mesma escala: ela mostra a tendência por cima do ruído do dia a dia.
 *
 *   COR SEGUE A ENTIDADE, NUNCA A POSIÇÃO. "Concluído" é verde porque o
 *   catálogo diz que é, e continua verde quando um filtro o joga do primeiro
 *   para o quarto lugar. Cor por posição faria o gráfico inteiro se repintar
 *   a cada filtro, e ninguém conseguiria comparar duas telas.
 * ============================================================================
 */

/** Os tipos de gráfico que a tela sabe desenhar. */
const RECC_TIPOS_DE_GRAFICO = {
  pizza: 'Pizza',
  barras: 'Barras em pé',
  barrasDeitadas: 'Barras deitadas',
  linha: 'Linha',
  barrasComLinha: 'Barras com linha de tendência'
};

/** Como se mede. */
const RECC_AGREGACOES = {
  contagem: 'Contagem de casos',
  soma: 'Soma de um valor',
  media: 'Média de um valor'
};

/**
 * Quantas fatias a pizza aguenta antes de virar confete.
 *
 * Acima disto, o resto vira "Outros" — e não uma cor nova. Cor gerada na hora
 * fica indistinguível das outras para quem não enxerga cor, e quebra a
 * separação que a paleta garante.
 */
const RECC_MAXIMO_DE_FATIAS = 6;

/**
 * O painel inteiro: todos os gráficos da mesa, já calculados.
 *
 * Vem numa chamada só porque a tela abre mostrando todos ao mesmo tempo —
 * seis idas ao servidor fariam a tela montar aos pedaços.
 */
function painelAnalitico(idDaMesa, filtros, dias) {
  var quem = exigirTela_('painelAnalitico');
  var mesa = mesaPeloId_(idDaMesa);

  var janela = Number(dias) || Number(valorDaConfiguracao_('OPERACAO.JANELA_DIAS', '30')) || 30;
  var recentes = lerRegistros_(mesa.aba, { ultimas: linhasQueOPainelOlha_() });
  var truncada = recentes.length >= linhasQueOPainelOlha_();

  var noPeriodo = filtrarPeloPeriodo_(recentes, mesa, janela, 0);
  var meus = filtrarPeloAlcance_(noPeriodo, mesa.aba, quem);

  var disponiveis = filtrosDaMesa_(mesa, quem);
  var casos = aplicarFiltros_(meus, disponiveis, filtros || {});

  var componentes = componentesDaMesa_(mesa).map(function (componente) {
    return calcularComponente_(componente, casos, mesa);
  });

  return {
    mesa: { id: mesa.id, nome: mesa.nome, icone: mesa.icone },
    periodo: { dias: janela, rotulo: 'últimos ' + janela + ' dias' },
    total: casos.length,
    truncada: truncada,
    linhasLidas: recentes.length,
    filtrosDisponiveis: disponiveis,
    componentes: componentes,
    podeExportar: podeFazer_(quem.permissoes, RECC_ACOES.EXPORTAR)
  };
}

/** Os gráficos declarados para esta mesa, na ordem escolhida. */
function componentesDaMesa_(mesa) {
  var daMesa = converterParaIdentificador_(mesa.id);

  return lerRegistros_('PAINEIS')
    .filter(function (linha) {
      if (normalizarParaComparar_(linha.Tela) !== 'painelanalitico') return false;
      if (normalizarParaComparar_(linha.Ativo) !== 'sim') return false;
      var mesaDaLinha = converterParaIdentificador_(linha.MesaId);
      return !mesaDaLinha || mesaDaLinha === daMesa;
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (linha) {
      return {
        id: linha.__id,
        titulo: String(linha.Titulo || ''),
        tipo: tipoDeGraficoValido_(linha.TipoWidget),
        dimensao: String(linha.CampoDimensao || ''),
        medida: String(linha.CampoMedida || ''),
        agregacao: agregacaoValida_(linha.Agregacao),
        limite: Number(linha.Limite) || 0,
        largura: Number(linha.Largura) || 1
      };
    });
}

function tipoDeGraficoValido_(valor) {
  var procurado = normalizarParaComparar_(valor);
  var achado = 'barras';
  Object.keys(RECC_TIPOS_DE_GRAFICO).forEach(function (chave) {
    if (normalizarParaComparar_(chave) === procurado) achado = chave;
  });
  return achado;
}

function agregacaoValida_(valor) {
  var procurado = normalizarParaComparar_(valor);
  var achado = 'contagem';
  Object.keys(RECC_AGREGACOES).forEach(function (chave) {
    if (normalizarParaComparar_(chave) === procurado) achado = chave;
  });
  return achado;
}

// ============================================================================
// O CÁLCULO
// ============================================================================

/**
 * Um gráfico, já somado e ordenado, pronto para a tela desenhar.
 *
 * A tela recebe NÚMEROS, e não decide nada sobre eles: quem escolhe o TOP N,
 * quem dobra o resto em "Outros" e quem calcula a média móvel é aqui. Assim a
 * mesma conta vale para a tela, para a exportação e para o detalhamento.
 */
function calcularComponente_(componente, casos, mesa) {
  var estrutura = estruturaDaAba_(mesa.aba);
  var posicaoDaDimensao = posicaoDaColuna_(estrutura, componente.dimensao);

  if (posicaoDaDimensao < 0) {
    return semDados_(componente, 'A coluna "' + componente.dimensao +
      '" não existe na aba ' + mesa.aba + '. Ajuste em Configurações → Painéis.');
  }

  var tipoDaDimensao = estrutura.tipos[posicaoDaDimensao];
  var ehTempo = (tipoDaDimensao === RECC_TIPO_DE_DADO.DATA
    || tipoDaDimensao === RECC_TIPO_DE_DADO.DATA_HORA);

  if (componente.agregacao !== 'contagem' && !componente.medida) {
    return semDados_(componente, 'Este gráfico soma um valor, mas não diz qual. ' +
      'Escolha a coluna da medida em Configurações → Painéis.');
  }

  var somas = {};
  var quantidades = {};
  var ordemDasChaves = [];

  casos.forEach(function (caso) {
    var chave = ehTempo
      ? diaDoCaso_(caso[componente.dimensao])
      : String(caso[componente.dimensao] || '').trim();
    if (chave === '') chave = 'Sem informação';

    if (!Object.prototype.hasOwnProperty.call(somas, chave)) {
      somas[chave] = 0;
      quantidades[chave] = 0;
      ordemDasChaves.push(chave);
    }
    quantidades[chave]++;
    somas[chave] += componente.agregacao === 'contagem'
      ? 1 : (converterParaNumero_(caso[componente.medida]) || 0);
  });

  var pontos = ordemDasChaves.map(function (chave) {
    return {
      chave: chave,
      rotulo: ehTempo ? rotuloDoDia_(chave) : chave,
      valor: componente.agregacao === 'media'
        ? (quantidades[chave] ? somas[chave] / quantidades[chave] : 0)
        : somas[chave],
      casos: quantidades[chave]
    };
  });

  // Tempo se ordena pelo tempo; o resto, do maior para o menor — é o que a
  // pessoa quer ver primeiro num gráfico de magnitude.
  if (ehTempo) {
    pontos.sort(function (um, outro) {
      return um.chave < outro.chave ? -1 : (um.chave > outro.chave ? 1 : 0);
    });
  } else {
    pontos.sort(function (um, outro) { return outro.valor - um.valor; });
  }

  var dobrados = 0;
  if (!ehTempo) {
    var teto = componente.limite > 0
      ? componente.limite
      : (componente.tipo === 'pizza' ? RECC_MAXIMO_DE_FATIAS : pontos.length);
    if (componente.tipo === 'pizza' && teto > RECC_MAXIMO_DE_FATIAS) {
      teto = RECC_MAXIMO_DE_FATIAS;
    }
    if (pontos.length > teto) {
      var resto = pontos.slice(teto);
      dobrados = resto.length;
      var soma = resto.reduce(function (total, ponto) { return total + ponto.valor; }, 0);
      var casosDoResto = resto.reduce(function (total, ponto) {
        return total + ponto.casos;
      }, 0);
      pontos = pontos.slice(0, teto);
      // "Demais valores", e não "Outros": várias listas da operação já têm
      // um item chamado "Outros", e duas linhas com o mesmo nome no mesmo
      // gráfico — uma real e uma somada — não têm como ser distinguidas.
      //
      // E é uma fatia só, nunca uma cor nova: cor gerada na hora fica igual
      // às outras para quem não enxerga cor.
      pontos.push({ chave: '__outros', rotulo: 'Demais valores', valor: soma,
        casos: casosDoResto, ehOutros: true });
    }
  }

  var pintado = pintarPontos_(pontos, componente, mesa, ehTempo);

  return {
    id: componente.id,
    titulo: componente.titulo,
    tipo: componente.tipo,
    largura: componente.largura,
    dimensao: componente.dimensao,
    medida: componente.medida,
    agregacao: componente.agregacao,
    unidade: unidadeDaMedida_(componente, estrutura),
    ehTempo: ehTempo,
    pontos: pintado,
    tendencia: componente.tipo === 'barrasComLinha'
      ? mediaMovel_(pintado, 7) : null,
    total: pintado.reduce(function (soma, ponto) { return soma + ponto.valor; }, 0),
    dobradosEmOutros: dobrados,
    aviso: ''
  };
}

function semDados_(componente, aviso) {
  return {
    id: componente.id,
    titulo: componente.titulo,
    tipo: componente.tipo,
    largura: componente.largura,
    dimensao: componente.dimensao,
    medida: componente.medida,
    agregacao: componente.agregacao,
    unidade: '',
    ehTempo: false,
    pontos: [],
    tendencia: null,
    total: 0,
    dobradosEmOutros: 0,
    aviso: aviso
  };
}

/**
 * A cor de cada ponto — e ela SEGUE A ENTIDADE, nunca a posição no gráfico.
 *
 * Quando a dimensão é uma lista do catálogo, a cor já está declarada lá:
 * "Concluído" é verde porque o catálogo diz que é, e continua verde quando um
 * filtro o joga do primeiro para o quarto lugar. Sem isso, o gráfico inteiro
 * se repintaria a cada filtro e ninguém conseguiria comparar duas telas.
 *
 * Fora do catálogo, a cor sai da paleta categórica pela posição do valor na
 * lista COMPLETA da dimensão — que também não muda com o filtro.
 */
function pintarPontos_(pontos, componente, mesa, ehTempo) {
  // Magnitude ao longo do tempo, ou barra simples: um tom só. Oito cores para
  // dizer "quanto" é o jeito mais rápido de enterrar a informação.
  if (ehTempo || componente.tipo === 'barras'
    || componente.tipo === 'barrasDeitadas' || componente.tipo === 'linha'
    || componente.tipo === 'barrasComLinha') {
    return pontos.map(function (ponto) {
      return {
        chave: ponto.chave, rotulo: ponto.rotulo, valor: ponto.valor,
        casos: ponto.casos, ehOutros: !!ponto.ehOutros,
        tom: '', serie: 0
      };
    });
  }

  var doCatalogo = coresDoCatalogo_(mesa);
  var ordemEstavel = ordemEstavelDaDimensao_(mesa, componente.dimensao);

  return pontos.map(function (ponto) {
    if (ponto.ehOutros) {
      return {
        chave: ponto.chave, rotulo: ponto.rotulo, valor: ponto.valor,
        casos: ponto.casos, ehOutros: true, tom: 'neutro', serie: 0
      };
    }
    var normalizado = normalizarParaComparar_(ponto.chave);
    var posicao = ordemEstavel.indexOf(normalizado);
    return {
      chave: ponto.chave,
      rotulo: ponto.rotulo,
      valor: ponto.valor,
      casos: ponto.casos,
      ehOutros: false,
      tom: doCatalogo[normalizado] || '',
      // 1 a 6, fixo pela entidade. Fora da lista conhecida, cai no último
      // slot em vez de inventar uma cor.
      serie: posicao >= 0 ? (posicao % 6) + 1 : 6
    };
  });
}

/** O tom que o catálogo já declarou para cada valor desta mesa. */
function coresDoCatalogo_(mesa) {
  var daMesa = converterParaIdentificador_(mesa.id);
  var cores = {};
  lerRegistros_('CATALOGO').forEach(function (item) {
    var mesaDoItem = converterParaIdentificador_(item.MesaId);
    if (mesaDoItem && mesaDoItem !== daMesa) return;
    if (!item.Cor) return;
    cores[normalizarParaComparar_(item.Nome)] = tomValido_(item.Cor);
  });
  return cores;
}

/**
 * A ordem COMPLETA dos valores possíveis de uma dimensão.
 *
 * Sai do catálogo, e não dos casos que sobraram no filtro: é isso que faz a
 * cor de um valor ser sempre a mesma, esteja ele em primeiro ou em último.
 */
function ordemEstavelDaDimensao_(mesa, cabecalho) {
  var campo = null;
  camposAtivosDaMesa_(mesa.id).forEach(function (umCampo) {
    if (normalizarParaComparar_(umCampo.Cabecalho)
      === normalizarParaComparar_(cabecalho)) campo = umCampo;
  });
  if (!campo) return [];

  return opcoesDoCampo_(lerConfiguracaoDoCampo_(campo), mesa.id)
    .map(function (opcao) { return normalizarParaComparar_(opcao.valor); });
}

/** Em que unidade o número é lido, para a tela formatar certo. */
function unidadeDaMedida_(componente, estrutura) {
  if (componente.agregacao === 'contagem') return 'casos';
  var posicao = posicaoDaColuna_(estrutura, componente.medida);
  if (posicao < 0) return '';
  return estrutura.tipos[posicao] === RECC_TIPO_DE_DADO.DINHEIRO ? 'dinheiro' : '';
}

/** A data de um caso, no formato que ordena sozinho. */
function diaDoCaso_(valor) {
  var data = converterParaData_(valor);
  if (!data) return '';
  return Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
}

function rotuloDoDia_(chave) {
  if (!chave) return 'Sem data';
  var partes = String(chave).split('-');
  return partes.length === 3 ? partes[2] + '/' + partes[1] : chave;
}

/**
 * A média móvel, que é a linha do "barras com linha".
 *
 * É a média dos últimos N pontos, na MESMA escala das barras. Não é um
 * segundo eixo: dois eixos no mesmo gráfico fazem a mesma altura significar
 * duas coisas diferentes, e é o erro de gráfico mais comum que existe.
 */
function mediaMovel_(pontos, janela) {
  return pontos.map(function (ponto, i) {
    var de = Math.max(0, i - janela + 1);
    var pedaco = pontos.slice(de, i + 1);
    var soma = pedaco.reduce(function (total, um) { return total + um.valor; }, 0);
    return { chave: ponto.chave, rotulo: ponto.rotulo, valor: soma / pedaco.length };
  });
}

// ============================================================================
// O DETALHAMENTO
// ============================================================================

/**
 * Os casos por trás de uma fatia ou de uma barra.
 *
 * É o que transforma um número numa lista de protocolos para trabalhar — sem
 * isso, o painel só informa, e informar não resolve caso nenhum.
 */
function detalharComponente(idDaMesa, idDoComponente, chaveDoPonto, filtros, dias) {
  var quem = exigirTela_('painelAnalitico');
  var mesa = mesaPeloId_(idDaMesa);

  var componente = null;
  componentesDaMesa_(mesa).forEach(function (um) {
    if (converterParaIdentificador_(um.id)
      === converterParaIdentificador_(idDoComponente)) componente = um;
  });
  if (!componente) {
    throw new Error('Este gráfico não existe mais. Recarregue a tela.');
  }

  var janela = Number(dias) || Number(valorDaConfiguracao_('OPERACAO.JANELA_DIAS', '30')) || 30;
  var recentes = lerRegistros_(mesa.aba, { ultimas: linhasQueOPainelOlha_() });
  var meus = filtrarPeloAlcance_(
    filtrarPeloPeriodo_(recentes, mesa, janela, 0), mesa.aba, quem);
  var casos = aplicarFiltros_(meus, filtrosDaMesa_(mesa, quem), filtros || {});

  var estrutura = estruturaDaAba_(mesa.aba);
  var posicao = posicaoDaColuna_(estrutura, componente.dimensao);
  var ehTempo = posicao >= 0 && (estrutura.tipos[posicao] === RECC_TIPO_DE_DADO.DATA
    || estrutura.tipos[posicao] === RECC_TIPO_DE_DADO.DATA_HORA);

  var procurado = String(chaveDoPonto || '');
  var escolhidos;

  if (procurado === '__outros') {
    // "Outros" é o resto: os casos que NÃO estão em nenhuma das fatias
    // mostradas. Calculamos de novo quais são elas, para a conta bater com o
    // gráfico — e não com uma segunda regra que um dia diverge.
    var mostradas = calcularComponente_(componente, casos, mesa).pontos
      .filter(function (ponto) { return !ponto.ehOutros; })
      .map(function (ponto) { return normalizarParaComparar_(ponto.chave); });

    escolhidos = casos.filter(function (caso) {
      var valor = String(caso[componente.dimensao] || '').trim() || 'Sem informação';
      return mostradas.indexOf(normalizarParaComparar_(valor)) < 0;
    });
  } else {
    escolhidos = casos.filter(function (caso) {
      var valor = ehTempo
        ? diaDoCaso_(caso[componente.dimensao])
        : (String(caso[componente.dimensao] || '').trim() || 'Sem informação');
      return normalizarParaComparar_(valor) === normalizarParaComparar_(procurado);
    });
  }

  return {
    titulo: componente.titulo,
    ponto: ehTempo ? rotuloDoDia_(procurado)
      : (procurado === '__outros' ? 'Demais valores' : procurado),
    colunas: colunasDaFila_(mesa),
    casos: montarFila_(escolhidos, mesa),
    total: escolhidos.length
  };
}

// ============================================================================
// EXPORTAR
// ============================================================================

/**
 * Os números de um gráfico em texto separado por ponto e vírgula.
 *
 * Ponto e vírgula, e não vírgula: o Excel em português abre assim sem pedir
 * nada. Vírgula abriria tudo numa coluna só, e a pessoa desistiria no meio.
 */
function exportarComponente(idDaMesa, idDoComponente, filtros, dias) {
  var quem = exigirPermissao_(RECC_ACOES.EXPORTAR);
  exigirTela_('painelAnalitico');

  var painel = painelAnalitico(idDaMesa, filtros, dias);
  var componente = null;
  painel.componentes.forEach(function (um) {
    if (converterParaIdentificador_(um.id)
      === converterParaIdentificador_(idDoComponente)) componente = um;
  });
  if (!componente) throw new Error('Este gráfico não existe mais.');

  var linhas = [[componente.dimensao, componente.agregacao === 'contagem'
    ? 'Casos' : componente.medida, 'Casos'].join(';')];

  componente.pontos.forEach(function (ponto) {
    linhas.push([ponto.rotulo, formatarParaExportar_(ponto.valor),
      ponto.casos].join(';'));
  });

  registrarAuditoria_('painel.exportar', 'PAINEIS', componente.id, componente.titulo);
  return {
    nome: nomeDeArquivo_(componente.titulo) + '.csv',
    conteudo: linhas.join('\n')
  };
}

/** Número em vírgula decimal, que é como o Excel em português espera. */
function formatarParaExportar_(valor) {
  if (typeof valor !== 'number') return String(valor === undefined ? '' : valor);
  return (Math.round(valor * 100) / 100).toString().replace('.', ',');
}

function nomeDeArquivo_(titulo) {
  var limpo = normalizarParaComparar_(titulo).replace(/[^a-z0-9]+/g, '-');
  return limpo.replace(/^-+|-+$/g, '') || 'painel';
}

// ============================================================================
// CONFIGURAÇÃO DOS COMPONENTES
// ============================================================================

/** O que a tela de Configurações oferece ao montar um gráfico. */
function opcoesDoPainelAnalitico(idDaMesa) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var mesa = mesaPeloId_(idDaMesa);
  var estrutura = estruturaDaAba_(mesa.aba);

  var dimensoes = [];
  var medidas = [];
  estrutura.cabecalhos.forEach(function (cabecalho, i) {
    if (!cabecalho || cabecalho.charAt(0) === '_') return;
    var tipo = estrutura.tipos[i];
    if (tipo === RECC_TIPO_DE_DADO.DINHEIRO || tipo === RECC_TIPO_DE_DADO.NUMERO) {
      medidas.push(cabecalho);
    }
    // Identificador não vira eixo: agrupar por um Id dá um grupo por caso, e
    // um gráfico com trezentas barras de altura 1 não diz nada.
    if (tipo !== RECC_TIPO_DE_DADO.IDENTIFICADOR) dimensoes.push(cabecalho);
  });

  return {
    mesa: { id: mesa.id, nome: mesa.nome },
    tipos: Object.keys(RECC_TIPOS_DE_GRAFICO).map(function (chave) {
      return { chave: chave, rotulo: RECC_TIPOS_DE_GRAFICO[chave] };
    }),
    agregacoes: Object.keys(RECC_AGREGACOES).map(function (chave) {
      return { chave: chave, rotulo: RECC_AGREGACOES[chave] };
    }),
    dimensoes: dimensoes,
    medidas: medidas,
    maximoDeFatias: RECC_MAXIMO_DE_FATIAS
  };
}

/** Os gráficos de uma mesa, para a tela de Configurações editar. */
function listarComponentesDoPainel(idDaMesa) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var mesa = mesaPeloId_(idDaMesa);

  return lerRegistros_('PAINEIS')
    .filter(function (linha) {
      if (normalizarParaComparar_(linha.Tela) !== 'painelanalitico') return false;
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
        tipo: tipoDeGraficoValido_(linha.TipoWidget),
        dimensao: String(linha.CampoDimensao || ''),
        medida: String(linha.CampoMedida || ''),
        agregacao: agregacaoValida_(linha.Agregacao),
        limite: Number(linha.Limite) || 0,
        largura: Number(linha.Largura) || 1,
        mostrar: normalizarParaComparar_(linha.Ativo) === 'sim'
      };
    });
}

/** Grava a lista inteira de gráficos de uma mesa, como os cards do Dashboard. */
function salvarComponentesDoPainel(idDaMesa, componentes) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var mesa = mesaPeloId_(idDaMesa);
  var estrutura = estruturaDaAba_(mesa.aba);
  var lista = Array.isArray(componentes) ? componentes : [];

  if (lista.length > RECC_MAXIMO_DE_CARTOES) {
    throw new Error('São no máximo ' + RECC_MAXIMO_DE_CARTOES + ' gráficos por ' +
      'painel. Acima disso ninguém lê a tela inteira.');
  }

  lista.forEach(function (componente) {
    if (!String(componente.titulo || '').trim()) {
      throw new Error('Todo gráfico precisa de um título — é o que diz o que ' +
        'ele responde.');
    }
    conferirQueAColunaExiste_(estrutura, componente.dimensao, mesa.aba);
    if (agregacaoValida_(componente.agregacao) !== 'contagem') {
      if (!String(componente.medida || '').trim()) {
        throw new Error('"' + componente.titulo + '" soma um valor, mas não diz ' +
          'qual. Escolha a coluna da medida.');
      }
      conferirQueAColunaExiste_(estrutura, componente.medida, mesa.aba);
    }
  });

  var jaGravados = lerRegistros_('PAINEIS').filter(function (linha) {
    if (normalizarParaComparar_(linha.Tela) !== 'painelanalitico') return false;
    return converterParaIdentificador_(linha.MesaId)
      === converterParaIdentificador_(mesa.id);
  });
  var continuam = {};

  lista.forEach(function (componente, posicao) {
    var campos = {
      Tela: 'painelAnalitico',
      MesaId: mesa.id,
      Titulo: String(componente.titulo).trim(),
      TipoWidget: tipoDeGraficoValido_(componente.tipo),
      CampoDimensao: String(componente.dimensao || ''),
      CampoMedida: agregacaoValida_(componente.agregacao) === 'contagem'
        ? '' : String(componente.medida || ''),
      Agregacao: agregacaoValida_(componente.agregacao),
      Limite: Number(componente.limite) || 0,
      Filtro: '',
      Ordem: posicao + 1,
      Largura: Number(componente.largura) === 2 ? 2 : 1,
      Cor: '',
      VisivelPara: '',
      Ativo: componente.mostrar === false ? 'NAO' : 'SIM'
    };

    var id = converterParaIdentificador_(componente.id);
    if (id && buscarRegistros_('PAINEIS', 'Id', id, 1)[0]) {
      atualizarRegistro_('PAINEIS', id, campos);
      continuam[id] = true;
      return;
    }
    continuam[inserirRegistro_('PAINEIS', campos).__id] = true;
  });

  jaGravados.forEach(function (linha) {
    if (!continuam[linha.__id]) {
      atualizarRegistro_('PAINEIS', linha.__id, { Ativo: 'NAO', Ordem: 0 });
    }
  });

  registrarAuditoria_('painel.graficos', 'PAINEIS', '',
    mesa.nome + ' · ' + lista.length + ' gráficos');
  return true;
}


/* ==== Busca.gs ============================================================ */

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


/* ==== Campos.gs =========================================================== */

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


/* ==== Casos.gs ============================================================ */

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


/* ==== Config.gs =========================================================== */

/**
 * ============================================================================
 * PGO — Config.gs · onde o sistema é ajustado sem programador
 *
 * O nome é "Config", e não "Configuracoes", por um motivo da plataforma: no
 * Apps Script os arquivos moram todos num projeto só, sem pasta, e o nome é
 * único INDEPENDENTE da extensão. Já existe um `Configuracoes.html` — a tela
 * —, então um `Configuracoes.gs` simplesmente não pode ser criado ali.
 *
 * No repositório eles ficam em pastas diferentes e a colisão não aparece; no
 * Apps Script, aparece na hora de colar. Um teste da suíte confere que nenhum
 * .gs tenha o mesmo nome de um .html.
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
    /*
      Os títulos são CURTOS de propósito: o menu tem uma coluna só, e um
      título que quebra em duas linhas desalinha a contagem do lado direito.
      O que o título deixou de dizer, a descrição diz — ela aparece inteira
      assim que a seção é escolhida.
    */
    secoes: [
      { chave: 'campos', titulo: 'Campos',
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
      { chave: 'identidade', titulo: 'Identidade',
        descricao: 'Nome, logo, cor e a senha de administrador',
        quantidade: 0 },
      { chave: 'paineis', titulo: 'Painéis',
        descricao: 'Os cards do Dashboard e dos painéis',
        quantidade: lerRegistros_('PAINEIS').filter(function (linha) {
          return normalizarParaComparar_(linha.Ativo) === 'sim';
        }).length },
      { chave: 'analises', titulo: 'Análises',
        descricao: 'As abas ANALISE_* que o sistema gera na planilha',
        quantidade: lerRegistros_('ANALISES').filter(function (linha) {
          return normalizarParaComparar_(linha.Ativo) === 'sim';
        }).length },
      { chave: 'estrutura', titulo: 'Estrutura',
        descricao: 'O laudo da planilha, a auditoria e a base antiga',
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
        colunasDaBusca: String(mesa.ColunasDaBusca || ''),
        metaMensalPorPessoa: Number(mesa.MetaMensalPorPessoa) || 0,
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
  String(dados.colunasDaBusca || '').split(',').forEach(function (pedaco) {
    conferirQueAColunaExiste_(estrutura, pedaco, atual.Aba);
  });
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
    ColunasDaBusca: String(dados.colunasDaBusca || ''),
    MetaMensalPorPessoa: Number(dados.metaMensalPorPessoa) || 0,
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


/* ==== Corretoras.gs ======================================================= */

/**
 * ============================================================================
 * PGO — Corretoras.gs · quem traz o caso para dentro
 * ============================================================================
 * Três cadastros que sustentam o resto do sistema e que, até aqui, só se
 * ajustavam abrindo a planilha:
 *
 *   CANAIS             corretoras, corretores e agentes, com o segmento
 *   PRODUTOS           o que a operação vende
 *   SUSEP_BLOQUEADAS   quem está impedido, e por quê
 *
 * O QUE FAZ ESTA TELA VALER MAIS QUE UMA LISTA: ela cruza o cadastro com os
 * CASOS. Uma tabela de corretoras sem volume é uma agenda telefônica; com o
 * volume ao lado, ela responde "quem me dá trabalho" — e, principalmente,
 * mostra as SUSEPs que aparecem nos casos e NÃO estão cadastradas.
 *
 * Essa última é a informação mais útil daqui. Uma SUSEP fora do cadastro faz
 * o selo do formulário dizer "não encontrada" toda vez, e ninguém descobre
 * por quê — porque o sintoma aparece em outra tela, uma pessoa de cada vez.
 * Aqui elas aparecem juntas, com quantos casos cada uma já trouxe.
 * ============================================================================
 */

/** Quantas corretoras a tela lista de uma vez. */
const RECC_MAXIMO_DE_CORRETORAS = 300;

/**
 * A tela inteira: os três cadastros e o cruzamento com os casos.
 */
function tabelaDeCorretoras(procurar, segmento) {
  var quem = exigirTela_('tabelaCorretoras');

  var volumes = volumePorSusep_();
  var bloqueadas = mapaDeBloqueadas_();
  var termo = normalizarParaComparar_(procurar);
  // Os dígitos do termo, SÓ quando ele tem algum. Sem esta guarda, procurar
  // por "agente" comparava '' contra a SUSEP — e `indexOf('')` é sempre zero,
  // então a busca casava com o cadastro inteiro e parecia não filtrar nada.
  var digitos = apenasDigitos_(procurar);
  var segmentoProcurado = normalizarParaComparar_(segmento);

  var todas = lerRegistros_('CANAIS').map(function (linha) {
    var susep = converterParaIdentificador_(linha.SUSEP);
    var bloqueio = bloqueadas[susep];
    return {
      id: linha.__id,
      nome: String(linha.Nome || ''),
      canal: String(linha.Canal || ''),
      susep: susep,
      corretora: String(linha.Corretora || ''),
      // Cadastro sem segmento não vira "Diamante" por descuido: vira o que
      // ele é, "Não encontrado", e a tela mostra isso.
      segmento: String(linha.Segmento || '') || 'Não encontrado',
      bloqueada: !!bloqueio,
      motivoDoBloqueio: bloqueio ? String(bloqueio.Motivo || '') : '',
      casos: volumes.porSusep[susep] || 0
    };
  });

  var filtradas = todas.filter(function (uma) {
    if (segmentoProcurado
      && normalizarParaComparar_(uma.segmento) !== segmentoProcurado) return false;
    if (!termo) return true;
    if (normalizarParaComparar_(uma.nome).indexOf(termo) >= 0) return true;
    if (normalizarParaComparar_(uma.corretora).indexOf(termo) >= 0) return true;
    if (normalizarParaComparar_(uma.canal).indexOf(termo) >= 0) return true;
    return !!digitos && apenasDigitos_(uma.susep).indexOf(digitos) >= 0;
  }).sort(function (uma, outra) {
    // Quem mais traz caso primeiro: a tela existe para trabalhar, e o volume
    // é o que dá ordem de importância a uma lista de trezentos nomes.
    if (outra.casos !== uma.casos) return outra.casos - uma.casos;
    return uma.corretora < outra.corretora ? -1 : 1;
  });

  return {
    corretoras: filtradas.slice(0, RECC_MAXIMO_DE_CORRETORAS),
    truncada: filtradas.length > RECC_MAXIMO_DE_CORRETORAS,
    quantasNoTotal: todas.length,
    quantasFiltradas: filtradas.length,
    segmentos: segmentosConhecidos_(todas),
    // As SUSEPs que os casos citam e o cadastro não conhece. É o achado desta
    // tela: enquanto elas não entram, o selo do formulário diz "não
    // encontrada" toda vez, e ninguém liga uma coisa à outra.
    foraDoCadastro: susepsForaDoCadastro_(volumes, todas, bloqueadas),
    podeMexer: podeFazer_(quem.permissoes, RECC_ACOES.CONFIGURAR),
    podeExportar: podeFazer_(quem.permissoes, RECC_ACOES.EXPORTAR)
  };
}

/** Quantos casos cada SUSEP trouxe, somando as mesas. */
function volumePorSusep_() {
  var porSusep = {};
  var nomePorSusep = {};

  mesasVisiveis_().forEach(function (mesa) {
    var estrutura;
    try {
      estrutura = estruturaDaAba_(mesa.aba);
    } catch (erro) {
      return;   // aba que sumiu não derruba a tela
    }

    var colunaDaSusep = '';
    var colunaDaCorretora = '';
    estrutura.cabecalhos.forEach(function (cabecalho) {
      var comparavel = normalizarParaComparar_(cabecalho);
      if (comparavel === 'susep') colunaDaSusep = cabecalho;
      if (comparavel === 'corretora') colunaDaCorretora = cabecalho;
    });
    if (!colunaDaSusep) return;

    // Só a coluna da SUSEP, e a da corretora: a mesma regra da busca — ler as
    // 39 colunas de todas as linhas para contar uma coisa não se paga.
    var suseps = lerColunaInteira_(mesa.aba, colunaDaSusep);
    var corretoras = colunaDaCorretora
      ? lerColunaInteira_(mesa.aba, colunaDaCorretora) : [];

    for (var i = 0; i < suseps.length; i++) {
      var susep = converterParaIdentificador_(suseps[i]);
      if (!susep) continue;
      porSusep[susep] = (porSusep[susep] || 0) + 1;
      if (!nomePorSusep[susep] && corretoras[i]) {
        nomePorSusep[susep] = String(corretoras[i]);
      }
    }
  });

  return { porSusep: porSusep, nomePorSusep: nomePorSusep };
}

/** As SUSEPs que aparecem nos casos e não estão no cadastro de canais. */
function susepsForaDoCadastro_(volumes, cadastradas, bloqueadas) {
  var conhecidas = {};
  cadastradas.forEach(function (uma) {
    if (uma.susep) conhecidas[uma.susep] = true;
  });
  // Uma SUSEP BLOQUEADA também é conhecida: o selo do formulário mostra o
  // bloqueio, e não "não encontrada". Listá-la aqui daria um aviso que não
  // corresponde ao que a pessoa vê na outra tela — e aviso que não bate com
  // a realidade é o tipo de coisa que a operação aprende a ignorar.
  Object.keys(bloqueadas || {}).forEach(function (susep) {
    conhecidas[susep] = true;
  });

  var fora = [];
  Object.keys(volumes.porSusep).forEach(function (susep) {
    if (conhecidas[susep]) return;
    fora.push({
      susep: susep,
      // O nome que os próprios casos usam. É um palpite, e a tela diz que é:
      // ele serve para a pessoa reconhecer a corretora, não para cadastrar
      // no automático.
      nomeNosCasos: volumes.nomePorSusep[susep] || '',
      casos: volumes.porSusep[susep]
    });
  });

  return fora.sort(function (uma, outra) { return outra.casos - uma.casos; });
}

function mapaDeBloqueadas_() {
  var mapa = {};
  lerRegistros_('SUSEP_BLOQUEADAS').forEach(function (linha) {
    mapa[converterParaIdentificador_(linha.SUSEP)] = linha;
  });
  return mapa;
}

/** Os segmentos que aparecem, para o filtro não ser uma lista escrita à mão. */
function segmentosConhecidos_(todas) {
  var vistos = {};
  var lista = [];
  todas.forEach(function (uma) {
    var chave = normalizarParaComparar_(uma.segmento);
    if (vistos[chave]) return;
    vistos[chave] = true;
    lista.push(uma.segmento);
  });
  return lista.sort();
}

// ============================================================================
// MEXER NO CADASTRO
// ============================================================================

/**
 * Cria ou altera uma corretora.
 *
 * A SUSEP é única: duas linhas com a mesma SUSEP fariam o selo do formulário
 * escolher uma delas — e a escolha seria a ordem da planilha, que ninguém
 * controla.
 */
function salvarCorretora(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var susep = converterParaIdentificador_(dados.susep);
  if (!susep) throw new Error('Informe a SUSEP — é ela que liga a corretora ao caso.');

  var corretora = String(dados.corretora || '').trim();
  if (!corretora) throw new Error('Informe o nome da corretora.');

  var id = converterParaIdentificador_(dados.id);
  var repetida = lerRegistros_('CANAIS').filter(function (linha) {
    return converterParaIdentificador_(linha.SUSEP) === susep
      && converterParaIdentificador_(linha.Id) !== id;
  })[0];
  if (repetida) {
    throw new Error('A SUSEP ' + susep + ' já está cadastrada para "' +
      repetida.Corretora + '". Duas linhas com a mesma SUSEP fariam o selo do ' +
      'formulário escolher uma delas pela ordem da planilha.');
  }

  var campos = {
    Nome: String(dados.nome || corretora).trim(),
    Canal: String(dados.canal || '').trim(),
    SUSEP: susep,
    Corretora: corretora,
    Segmento: String(dados.segmento || '').trim() || 'Não encontrado'
  };

  if (id) {
    atualizarRegistro_('CANAIS', id, campos);
    registrarAuditoria_('corretora.editar', 'CANAIS', id, corretora);
    return id;
  }
  var criada = inserirRegistro_('CANAIS', campos);
  registrarAuditoria_('corretora.criar', 'CANAIS', criada.__id, corretora);
  return criada.__id;
}

/** Tira a corretora da tela. A linha permanece na planilha. */
function ocultarCorretora(idDaCorretora) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var alvo = converterParaIdentificador_(idDaCorretora);
  var atual = buscarRegistros_('CANAIS', 'Id', alvo, 1)[0];
  if (!atual) throw new Error('A corretora ' + alvo + ' não existe.');

  ocultarRegistro_('CANAIS', alvo, quem.usuario.Id);
  registrarAuditoria_('corretora.ocultar', 'CANAIS', alvo, String(atual.Corretora));
  return true;
}

// ============================================================================
// AS SUSEPs BLOQUEADAS
// ============================================================================

function listarSusepsBloqueadas() {
  exigirTela_('tabelaCorretoras');
  var volumes = volumePorSusep_();

  return lerRegistros_('SUSEP_BLOQUEADAS')
    .map(function (linha) {
      var susep = converterParaIdentificador_(linha.SUSEP);
      return {
        id: linha.__id,
        susep: susep,
        corretora: String(linha.NomeCorretora || ''),
        cpfReincidente: converterParaIdentificador_(linha.CpfReincidente),
        motivo: String(linha.Motivo || ''),
        bloqueadaEm: linha.BloqueadaEm
          ? Utilities.formatDate(new Date(linha.BloqueadaEm), RECC_FUSO_HORARIO,
            'dd/MM/yyyy')
          : '',
        casos: volumes.porSusep[susep] || 0
      };
    })
    .sort(function (uma, outra) { return outra.casos - uma.casos; });
}

/**
 * Bloqueia uma SUSEP.
 *
 * Bloquear não apaga caso nenhum e não impede cadastrar: o formulário passa a
 * mostrar o selo vermelho com o motivo, e quem está atendendo decide. Bloqueio
 * que impedisse o cadastro faria a pessoa registrar o caso em outro lugar —
 * num caderno, num e-mail — e o sistema perderia o caso de vista.
 */
function bloquearSusep(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var susep = converterParaIdentificador_(dados.susep);
  if (!susep) throw new Error('Informe a SUSEP a bloquear.');

  var motivo = String(dados.motivo || '').trim();
  if (!motivo) {
    throw new Error('Diga o motivo do bloqueio. Sem ele, quem vir o selo ' +
      'vermelho daqui a seis meses não vai saber o que fazer com a informação.');
  }

  var id = converterParaIdentificador_(dados.id);
  var jaBloqueada = lerRegistros_('SUSEP_BLOQUEADAS').filter(function (linha) {
    return converterParaIdentificador_(linha.SUSEP) === susep
      && converterParaIdentificador_(linha.Id) !== id;
  })[0];
  if (jaBloqueada) {
    throw new Error('A SUSEP ' + susep + ' já está bloqueada.');
  }

  var campos = {
    SUSEP: susep,
    NomeCorretora: String(dados.corretora || '').trim(),
    CpfReincidente: converterParaIdentificador_(dados.cpfReincidente),
    Motivo: motivo
  };

  if (id) {
    atualizarRegistro_('SUSEP_BLOQUEADAS', id, campos);
    registrarAuditoria_('susep.editar', 'SUSEP_BLOQUEADAS', id, susep);
    return id;
  }
  campos.BloqueadaEm = new Date();
  var criada = inserirRegistro_('SUSEP_BLOQUEADAS', campos);
  registrarAuditoria_('susep.bloquear', 'SUSEP_BLOQUEADAS', criada.__id, susep);
  return criada.__id;
}

/** Libera uma SUSEP. A linha permanece na planilha, com a data do bloqueio. */
function desbloquearSusep(idDoBloqueio) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var alvo = converterParaIdentificador_(idDoBloqueio);
  var atual = buscarRegistros_('SUSEP_BLOQUEADAS', 'Id', alvo, 1)[0];
  if (!atual) throw new Error('Este bloqueio não existe.');

  ocultarRegistro_('SUSEP_BLOQUEADAS', alvo, quem.usuario.Id);
  registrarAuditoria_('susep.desbloquear', 'SUSEP_BLOQUEADAS', alvo,
    converterParaIdentificador_(atual.SUSEP));
  return true;
}

// ============================================================================
// OS PRODUTOS
// ============================================================================

function listarProdutos() {
  exigirTela_('tabelaCorretoras');
  return lerRegistros_('PRODUTOS')
    .map(function (linha) {
      return {
        id: linha.__id,
        produto: String(linha.Produto || ''),
        codigo: converterParaIdentificador_(linha.CodigoProduto)
      };
    })
    .sort(function (um, outro) { return um.produto < outro.produto ? -1 : 1; });
}

function salvarProduto(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var produto = String(dados.produto || '').trim();
  if (!produto) throw new Error('Informe o nome do produto.');

  var codigo = converterParaIdentificador_(dados.codigo);
  var id = converterParaIdentificador_(dados.id);

  if (codigo) {
    var repetido = lerRegistros_('PRODUTOS').filter(function (linha) {
      return converterParaIdentificador_(linha.CodigoProduto) === codigo
        && converterParaIdentificador_(linha.Id) !== id;
    })[0];
    if (repetido) {
      throw new Error('O código ' + codigo + ' já é do produto "' +
        repetido.Produto + '". O código é o que liga o produto ao caso.');
    }
  }

  var campos = { Produto: produto, CodigoProduto: codigo };
  if (id) {
    atualizarRegistro_('PRODUTOS', id, campos);
    registrarAuditoria_('produto.editar', 'PRODUTOS', id, produto);
    return id;
  }
  var criado = inserirRegistro_('PRODUTOS', campos);
  registrarAuditoria_('produto.criar', 'PRODUTOS', criado.__id, produto);
  return criado.__id;
}

function ocultarProduto(idDoProduto) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var alvo = converterParaIdentificador_(idDoProduto);
  var atual = buscarRegistros_('PRODUTOS', 'Id', alvo, 1)[0];
  if (!atual) throw new Error('Este produto não existe.');

  ocultarRegistro_('PRODUTOS', alvo, quem.usuario.Id);
  registrarAuditoria_('produto.ocultar', 'PRODUTOS', alvo, String(atual.Produto));
  return true;
}

// ============================================================================
// EXPORTAR
// ============================================================================

/** As corretoras em texto, do jeito que o Excel em português abre. */
function exportarCorretoras(procurar, segmento) {
  exigirPermissao_(RECC_ACOES.EXPORTAR);
  var tabela = tabelaDeCorretoras(procurar, segmento);

  var linhas = [['SUSEP', 'Corretora', 'Canal', 'Nome', 'Segmento',
    'Situação', 'Casos'].join(';')];

  tabela.corretoras.forEach(function (uma) {
    linhas.push([uma.susep, uma.corretora, uma.canal, uma.nome, uma.segmento,
      uma.bloqueada ? 'Bloqueada' : 'Liberada', uma.casos].join(';'));
  });

  registrarAuditoria_('corretoras.exportar', 'CANAIS', '',
    tabela.corretoras.length + ' linhas');
  return { nome: 'corretoras.csv', conteudo: linhas.join('\n') };
}


/* ==== Diagnostico.gs ====================================================== */

/**
 * RECC — Diagnostico.gs · o laudo que roda DENTRO do Apps Script
 * ============================================================================
 * A suíte de testes prova que o código está certo. Ela não prova que ESTA
 * instalação está certa: a planilha é editável à mão, e o que a suíte conferiu
 * numa planilha de mentira pode não valer na de verdade seis meses depois.
 *
 * Este arquivo é a outra metade. Ele roda na instalação real e responde uma
 * pergunta só: **este sistema, aqui, agora, está inteiro?**
 *
 * Duas portas:
 *
 *   diagnosticoRECC()       no editor do Apps Script, sem abrir o sistema.
 *                           Escreve o laudo no log e devolve o objeto.
 *   diagnosticoDoSistema()  pela tela, em Configurações › Estrutura.
 *
 * Existe ainda `verificarEstruturaRECC()`, no Instalador: ela confere SÓ a
 * estrutura das abas, em dois segundos, e é a que se roda logo depois de
 * copiar os arquivos. As duas leem o mesmo `conferirEstrutura_` — não há duas
 * versões da regra, há uma conferência curta e uma completa.
 *
 * ---------------------------------------------------------------------------
 * A REGRA QUE MANDA NESTE ARQUIVO
 * ---------------------------------------------------------------------------
 * **Bloco que não consegue rodar é FALHA, nunca "pulado".**
 *
 * Está escrito nas armadilhas herdadas do PGO 5.x, e custou caro lá: o
 * diagnóstico antigo, quando um arquivo faltava, pulava o bloco que dependia
 * dele — e terminava aprovando o build. Um verificador que aprova o que não
 * conseguiu verificar é pior que verificador nenhum: ele dá confiança sem
 * base.
 *
 * Por isso `rodarBloco_` embrulha cada bloco: qualquer erro dentro dele vira
 * um item de falha, com o erro escrito. Nunca some.
 *
 * ---------------------------------------------------------------------------
 * TRÊS SITUAÇÕES, E O QUE CADA UMA QUER DIZER
 * ---------------------------------------------------------------------------
 *   ok       está como deveria.
 *   atencao  funciona, mas alguém precisa olhar. Coluna a mais na planilha,
 *            campo obrigatório desligado. Nada quebra hoje.
 *   falha    alguma coisa vai dar errado, ou já está dando. Aba faltando,
 *            Id repetido, mesa apontando para coluna que não existe.
 * ============================================================================
 */

var RECC_SITUACOES_DO_LAUDO = { OK: 'ok', ATENCAO: 'atencao', FALHA: 'falha' };

/**
 * Quantas linhas de exemplo o laudo cita quando encontra muitas iguais.
 * Listar duzentos Ids repetidos não ajuda ninguém a arrumar o primeiro.
 */
var RECC_EXEMPLOS_NO_LAUDO = 5;

// ============================================================================
// AS DUAS PORTAS
// ============================================================================

/**
 * Para rodar no editor do Apps Script, direto, sem abrir o sistema.
 *
 * É a porta que importa quando o sistema NÃO abre: se `doGet` está quebrado,
 * a tela não serve para diagnosticar nada. Esta função não exige permissão
 * nem senha, e não precisa: quem consegue abrir o editor do Apps Script já
 * tem acesso a tudo, e negar aqui só atrapalharia quem foi consertar.
 */
function diagnosticoRECC() {
  var laudo = rodarDiagnostico_();
  Logger.log(laudoEmTexto_(laudo));
  return laudo;
}

/** A mesma coisa, pedida pela tela de Configurações. */
function diagnosticoDoSistema() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var laudo = rodarDiagnostico_();
  registrarAuditoria_('diagnostico.rodar', '', '',
    laudo.resumo.falhas + ' falha(s), ' + laudo.resumo.atencoes + ' atenção(ões)');
  return laudo;
}

// ============================================================================
// O LAUDO
// ============================================================================

function rodarDiagnostico_() {
  var blocos = [
    rodarBloco_('ambiente', 'O ambiente', blocoDoAmbiente_),
    rodarBloco_('estrutura', 'A estrutura da planilha', blocoDaEstrutura_),
    rodarBloco_('sequencias', 'As sequências de Id', blocoDasSequencias_),
    rodarBloco_('identificadores', 'Os identificadores gravados', blocoDosIds_),
    rodarBloco_('mesas', 'As mesas', blocoDasMesas_),
    rodarBloco_('campos', 'Os campos do formulário', blocoDosCampos_),
    rodarBloco_('paineis', 'Os cards e os gráficos', blocoDosPaineis_),
    rodarBloco_('analises', 'As análises', blocoDasAnalises_),
    rodarBloco_('acesso', 'Quem entra e o que pode', blocoDoAcesso_),
    rodarBloco_('tela', 'A ligação entre a tela e o servidor', blocoDaTela_),
    rodarBloco_('estilos', 'A folha de estilos', blocoDosEstilos_)
  ];

  var resumo = { total: 0, oks: 0, atencoes: 0, falhas: 0 };
  blocos.forEach(function (bloco) {
    bloco.itens.forEach(function (item) {
      resumo.total++;
      if (item.situacao === RECC_SITUACOES_DO_LAUDO.FALHA) resumo.falhas++;
      else if (item.situacao === RECC_SITUACOES_DO_LAUDO.ATENCAO) resumo.atencoes++;
      else resumo.oks++;
    });
    bloco.situacao = piorSituacao_(bloco.itens);
  });

  return {
    quando: Utilities.formatDate(new Date(), RECC_FUSO_HORARIO,
      'dd/MM/yyyy HH:mm'),
    aprovado: resumo.falhas === 0,
    resumo: resumo,
    blocos: blocos
  };
}

/**
 * Roda um bloco e garante que ele apareça no laudo aconteça o que acontecer.
 *
 * É AQUI que mora a regra do arquivo. Um bloco que estoura — porque a aba de
 * que ele depende sumiu, porque uma função dele foi renomeada — vira uma
 * falha com o erro escrito, e não um bloco ausente. Bloco ausente passa
 * despercebido; falha escrita, não.
 */
function rodarBloco_(chave, titulo, funcao) {
  try {
    var itens = funcao();
    if (!itens || !itens.length) {
      // Bloco que não produziu item nenhum também é suspeito: ou não rodou,
      // ou não tem o que conferir — e nos dois casos alguém precisa olhar.
      return { chave: chave, titulo: titulo, itens: [item_(
        RECC_SITUACOES_DO_LAUDO.FALHA, 'O bloco não conferiu nada',
        'A verificação rodou e não devolveu nenhum item.',
        'É defeito do próprio diagnóstico. Veja a função do bloco "'
          + chave + '" em Diagnostico.gs.')] };
    }
    return { chave: chave, titulo: titulo, itens: itens };
  } catch (erro) {
    return { chave: chave, titulo: titulo, itens: [item_(
      RECC_SITUACOES_DO_LAUDO.FALHA, 'A verificação não conseguiu rodar',
      erro.message,
      'Este bloco não foi conferido. Um verificador que aprova o que não '
        + 'conseguiu verificar dá confiança sem base — por isso isto conta '
        + 'como falha, e não como bloco pulado.')] };
  }
}

function item_(situacao, oQue, detalhe, comoArrumar) {
  return {
    situacao: situacao,
    oQue: oQue,
    detalhe: detalhe || '',
    comoArrumar: comoArrumar || ''
  };
}

function piorSituacao_(itens) {
  var pior = RECC_SITUACOES_DO_LAUDO.OK;
  itens.forEach(function (item) {
    if (item.situacao === RECC_SITUACOES_DO_LAUDO.FALHA) {
      pior = RECC_SITUACOES_DO_LAUDO.FALHA;
    } else if (item.situacao === RECC_SITUACOES_DO_LAUDO.ATENCAO
      && pior !== RECC_SITUACOES_DO_LAUDO.FALHA) {
      pior = RECC_SITUACOES_DO_LAUDO.ATENCAO;
    }
  });
  return pior;
}

/** 'a, b, c e mais 12' — para não despejar duzentos exemplos no laudo. */
function algunsExemplos_(lista) {
  var mostrados = lista.slice(0, RECC_EXEMPLOS_NO_LAUDO).join(', ');
  var sobram = lista.length - RECC_EXEMPLOS_NO_LAUDO;
  return sobram > 0 ? mostrados + ' e mais ' + sobram : mostrados;
}

// ============================================================================
// OS BLOCOS
// ============================================================================

function blocoDoAmbiente_() {
  var itens = [];
  var planilha = planilhaAtiva_();

  var fuso = planilha.getSpreadsheetTimeZone();
  itens.push(fuso === RECC_FUSO_HORARIO
    ? item_(RECC_SITUACOES_DO_LAUDO.OK, 'O fuso da planilha é ' + fuso)
    : item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'A planilha está em outro fuso',
      'A planilha diz "' + fuso + '" e o sistema conta o dia em "'
        + RECC_FUSO_HORARIO + '".',
      'Arquivo › Configurações da planilha › Fuso horário. Enquanto estiver '
        + 'diferente, um caso registrado depois das 21 h cai no dia seguinte.'));

  // O teto de 10 milhões de células é o único limite duro da plataforma, e o
  // único que não avisa antes: a planilha simplesmente para de aceitar linha
  // nova. Ver a porcentagem subindo é o que dá tempo de planejar a segunda
  // planilha em vez de descobrir numa terça-feira de manhã.
  var orcamento = orcamentoDeCelulas_(planilha);
  itens.push(orcamento.percentual < 80
    ? item_(RECC_SITUACOES_DO_LAUDO.OK,
      'Células: ' + orcamento.percentual + '% do teto da planilha',
      orcamento.usadas.toLocaleString('pt-BR') + ' de '
        + RECC_TETO_DE_CELULAS.toLocaleString('pt-BR') + '.')
    : item_(orcamento.percentual < 95
      ? RECC_SITUACOES_DO_LAUDO.ATENCAO : RECC_SITUACOES_DO_LAUDO.FALHA,
      'Células: ' + orcamento.percentual + '% do teto da planilha',
      orcamento.usadas.toLocaleString('pt-BR') + ' de '
        + RECC_TETO_DE_CELULAS.toLocaleString('pt-BR')
        + '. No teto, a planilha para de aceitar linha nova.',
      'Apague as abas ANALISE_* que ninguém usa mais — elas são as maiores e '
        + 'a próxima geração as refaz. Se não bastar, é hora de mover o '
        + 'histórico antigo para uma planilha de arquivo e apontá-la como '
        + 'planilha legada.'));

  itens.push(existeSenhaDeAdministrador_()
    ? item_(RECC_SITUACOES_DO_LAUDO.OK, 'A senha de administrador está definida')
    : item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
      'Não há senha de administrador',
      'As ações sem desfazer — criar coluna, importar em lote, regerar uma '
        + 'aba de análise — estão travadas.',
      'Configurações › Identidade › Senha de administrador.'));

  return itens;
}

function blocoDaEstrutura_() {
  var itens = [];
  var laudo = conferirEstrutura_();

  laudo.abas.forEach(function (aba) {
    if (!aba.existe) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        'A aba ' + aba.aba + ' não existe',
        'Ela faz parte do contrato e o sistema conta com ela.',
        'Rode instalarRECC() de novo: ela cria o que falta e não mexe no que '
          + 'já está lá.'));
      return;
    }
    if (aba.faltando.length) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        aba.aba + ': ' + aba.faltando.length + ' coluna(s) do contrato faltando',
        algunsExemplos_(aba.faltando),
        'Acrescente a coluna com o cabeçalho exato. O vínculo é pelo NOME do '
          + 'cabeçalho, nunca pela posição — então a ordem não importa.'));
      return;
    }
    if (aba.aMais.length) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
        aba.aba + ': ' + aba.aMais.length + ' coluna(s) fora do contrato',
        algunsExemplos_(aba.aMais),
        'Nada quebra: o sistema ignora o que não conhece. Mas coluna que o '
          + 'sistema não preenche fica vazia para sempre — se ela deveria '
          + 'existir, cadastre em Configurações › Campos.'));
      return;
    }
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      aba.aba + ' está no contrato', aba.linhas + ' linha(s)'));
  });

  return itens;
}

/**
 * A sequência nunca pode estar ABAIXO do maior Id gravado.
 *
 * Foi exatamente isto que reemitiu Id em uso no PGO 5.x: a sequência
 * rebaixada devolvia números que já estavam na planilha, e duas linhas
 * diferentes passavam a responder pelo mesmo identificador.
 */
function blocoDasSequencias_() {
  var itens = [];
  var props = PropertiesService.getScriptProperties();

  nomesDasAbasDoContrato_().forEach(function (nomeDaAba) {
    var esquema = esquemaDaAba_(nomeDaAba);
    var temId = esquema.colunas.filter(function (coluna) {
      return coluna.cabecalho === 'Id';
    }).length > 0;
    if (!temId) return;

    var guardado = props.getProperty(RECC_PREFIXO_DA_SEQUENCIA + nomeDaAba);
    var naAba = maiorIdentificadorDaAba_(nomeDaAba);

    if (guardado === null) {
      itens.push(naAba < 0
        ? item_(RECC_SITUACOES_DO_LAUDO.OK,
          nomeDaAba + ': sequência ainda não usada', 'A aba está vazia.')
        : item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
          nomeDaAba + ': a aba tem Ids e a sequência não foi criada',
          'Maior Id na aba: ' + formatarIdentificador_(naAba) + '.',
          'A primeira gravação se alinha sozinha com a planilha. Se quiser '
            + 'alinhar agora, use "Normalizar base".'));
      return;
    }

    var numero = Number(guardado);
    if (!isFinite(numero)) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        nomeDaAba + ': a sequência está com lixo',
        'Valor guardado: "' + guardado + '".',
        'Use "Normalizar base" nesta aba: ela realinha sem nunca baixar o piso.'));
      return;
    }
    if (numero < naAba) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        nomeDaAba + ': a sequência está ABAIXO do maior Id gravado',
        'Sequência em ' + numero + ', maior Id na aba '
          + formatarIdentificador_(naAba) + '. A próxima gravação vai reemitir '
          + 'um Id que já existe.',
        'Use "Normalizar base" nesta aba, antes de gravar qualquer coisa.'));
      return;
    }
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      nomeDaAba + ': sequência em ' + formatarIdentificador_(numero)));
  });

  return itens;
}

/**
 * Id repetido e Id em célula de formato Geral.
 *
 * As duas metades da armadilha mais cara do PGO 5.x: o Sheets converteu
 * `00000010` em `10` porque a célula era Geral, e daí saíram 4.328 colisões
 * em 200 mil registros. Uma confere a causa, a outra confere o efeito.
 */
function blocoDosIds_() {
  var itens = [];

  nomesDasAbasDoContrato_().forEach(function (nomeDaAba) {
    var estrutura = estruturaDaAba_(nomeDaAba);
    var iId = posicaoDaColuna_(estrutura, 'Id');
    if (iId < 0) return;

    var quantas = quantidadeDeRegistros_(estrutura);
    if (quantas <= 0) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK, nomeDaAba + ': aba vazia'));
      return;
    }

    var faixa = estrutura.aba.getRange(2, iId + 1, quantas, 1);
    var valores = faixa.getValues();
    var formatos = faixa.getNumberFormats();

    var vistos = {};
    var repetidos = [];
    var semId = 0;
    var geral = 0;

    for (var i = 0; i < valores.length; i++) {
      if (formatos[i][0] !== '@') geral++;

      var id = converterParaIdentificador_(valores[i][0]);
      if (!id) { semId++; continue; }
      if (vistos[id]) {
        repetidos.push(id + ' (linhas ' + vistos[id] + ' e ' + (i + 2) + ')');
      } else {
        vistos[id] = i + 2;
      }
    }

    if (geral) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        nomeDaAba + ': ' + geral + ' célula(s) de Id fora do formato texto',
        'Em formato Geral o Sheets lê "0000000010" como o número 10, e os '
          + 'zeros da frente somem. Foi assim que o sistema anterior colidiu '
          + '4.328 Ids.',
        'Selecione a coluna Id e aplique Formatar › Número › Texto simples. '
          + 'Depois confira se algum Id perdeu os zeros.'));
    }

    if (repetidos.length) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        nomeDaAba + ': ' + repetidos.length + ' Id(s) repetido(s)',
        algunsExemplos_(repetidos),
        'Duas linhas com o mesmo Id fazem a edição achar a errada. Corrija na '
          + 'planilha dando um Id novo, acima do maior já usado, à segunda.'));
    }

    if (semId) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
        nomeDaAba + ': ' + semId + ' linha(s) sem Id',
        'Linha digitada direto na planilha nasce sem Id, e sem Id o sistema '
          + 'não consegue editá-la nem ocultá-la.',
        'Use "Normalizar base" nesta aba: ela carimba Id em quem está sem, e '
          + 'não toca em mais nada da linha.'));
    }

    if (!geral && !repetidos.length && !semId) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
        nomeDaAba + ': ' + quantas + ' Id(s), todos únicos e em texto'));
    }
  });

  return itens;
}

/** Toda coluna que uma mesa declara precisa existir na aba dela. */
function blocoDasMesas_() {
  var itens = [];
  var mesas = lerRegistros_('MESAS');

  if (!mesas.length) {
    return [item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Não há nenhuma mesa cadastrada',
      'Sem mesa, o Dashboard, o cadastro e a busca não têm onde procurar.',
      'Rode instalarRECC() ou cadastre em Configurações › Mesas.')];
  }

  var ativas = 0;

  mesas.forEach(function (linha) {
    var nome = String(linha.Nome || linha.Id);
    var ligada = normalizarParaComparar_(linha.Ativo) === 'sim';
    if (ligada) ativas++;

    var nomeDaAba = String(linha.Aba || '');
    if (!planilhaAtiva_().getSheetByName(nomeDaAba)) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        'A mesa "' + nome + '" aponta para uma aba que não existe',
        'Aba declarada: "' + nomeDaAba + '".',
        'Ou a aba foi renomeada na planilha, ou o nome está errado em MESAS. '
          + 'Os dois se resolvem acertando a coluna Aba.'));
      return;
    }

    var estrutura = estruturaDaAba_(nomeDaAba);
    var problemas = [];

    [['ColunaDaData', 'coluna da data'],
     ['ColunaDaHora', 'coluna da hora'],
     ['ColunaDoStatus', 'coluna da situação'],
     ['ColunaDaFinalizacao', 'coluna da finalização'],
     ['ColunaDaAreaResponsavel', 'coluna da área responsável']
    ].forEach(function (par) {
      var cabecalho = String(linha[par[0]] || '').trim();
      if (!cabecalho) return;
      if (posicaoDaColuna_(estrutura, cabecalho) < 0) {
        problemas.push(par[1] + ' "' + cabecalho + '"');
      }
    });

    colunasCitadas_(linha.ColunasDaFila).concat(
      colunasCitadas_(linha.ColunasDaBusca)
    ).forEach(function (cabecalho) {
      if (posicaoDaColuna_(estrutura, cabecalho) < 0) {
        problemas.push('"' + cabecalho + '"');
      }
    });

    if (problemas.length) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        'A mesa "' + nome + '" cita coluna que a aba não tem',
        algunsExemplos_(problemas),
        'Acerte em Configurações › Mesas, ou acrescente a coluna em '
          + nomeDaAba + '. A aba tem: ' + estrutura.cabecalhos.join(', ') + '.'));
      return;
    }

    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      'A mesa "' + nome + '" está coerente com ' + nomeDaAba
        + (ligada ? '' : ' (desligada)')));
  });

  if (!ativas) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Nenhuma mesa está ligada',
      'Existem ' + mesas.length + ' mesa(s) cadastrada(s), e todas desligadas.',
      'Ligue pelo menos uma em Configurações › Mesas. Sem mesa ligada o '
        + 'Dashboard abre vazio.'));
  }

  return itens;
}

/**
 * As colunas citadas num texto de configuração, seja ele plano ou em grupos.
 *
 * ColunasDaFila aceita as duas escritas: "a,b,c" e "Grupo: a,b; Outro: c".
 * Ler só uma delas faria o diagnóstico acusar coluna inexistente numa mesa
 * perfeitamente configurada.
 */
function colunasCitadas_(texto) {
  var declarado = String(texto || '');
  if (!declarado.trim()) return [];

  var pedacos = declarado.indexOf(':') < 0
    ? declarado.split(',')
    : declarado.split(';').map(function (grupo) {
      var corte = grupo.indexOf(':');
      return corte < 0 ? grupo : grupo.substring(corte + 1);
    }).join(',').split(',');

  return pedacos
    .map(function (um) { return um.trim(); })
    .filter(function (um) { return um.length > 0; });
}

function blocoDosCampos_() {
  var itens = [];
  var campos = lerRegistros_('CAMPOS');

  if (!campos.length) {
    return [item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Não há nenhum campo cadastrado',
      'O formulário é montado a partir de CAMPOS. Sem linha nenhuma, o '
        + 'cadastro abre vazio.',
      'Rode instalarRECC(): ele gera os campos a partir do contrato das bases.')];
  }

  var semColuna = [];
  var obrigatoriosDesligados = [];
  var porAba = {};

  campos.forEach(function (campo) {
    var nomeDaAba = String(campo.Aba || '');
    var cabecalho = String(campo.Cabecalho || '');
    if (!nomeDaAba || !cabecalho) return;

    if (!porAba[nomeDaAba]) {
      porAba[nomeDaAba] = planilhaAtiva_().getSheetByName(nomeDaAba)
        ? estruturaDaAba_(nomeDaAba) : null;
    }
    var estrutura = porAba[nomeDaAba];

    if (!estrutura || posicaoDaColuna_(estrutura, cabecalho) < 0) {
      semColuna.push(String(campo.Rotulo || cabecalho) + ' → '
        + nomeDaAba + '.' + cabecalho);
      return;
    }
    if (normalizarParaComparar_(campo.Obrigatorio) === 'sim'
      && normalizarParaComparar_(campo.Ativo) !== 'sim') {
      obrigatoriosDesligados.push(String(campo.Rotulo || cabecalho));
    }
  });

  if (semColuna.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      semColuna.length + ' campo(s) apontam para coluna que não existe',
      algunsExemplos_(semColuna),
      'Cadastrar um caso com um desses campos preenchidos vai estourar. '
        + 'Desligue o campo em Configurações › Campos, ou acrescente a coluna.'));
  }

  if (obrigatoriosDesligados.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
      obrigatoriosDesligados.length + ' campo(s) obrigatório(s) estão desligados',
      algunsExemplos_(obrigatoriosDesligados),
      'Desligado, o campo não aparece no formulário — e a obrigatoriedade '
        + 'deixa de valer. Se ele é mesmo obrigatório, ligue; se não é, tire '
        + 'a marca de obrigatório, para o cadastro não mentir.'));
  }

  if (!semColuna.length && !obrigatoriosDesligados.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      'Os ' + campos.length + ' campos apontam para colunas que existem'));
  }

  return itens;
}

function blocoDosPaineis_() {
  var itens = [];
  var componentes = lerRegistros_('PAINEIS');

  if (!componentes.length) {
    return [item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
      'Não há nenhum card nem gráfico cadastrado',
      'O Dashboard abre só com a fila, e o Painel Analítico abre vazio.',
      'Monte em Configurações › Painéis.')];
  }

  var mesasPorId = {};
  lerRegistros_('MESAS').forEach(function (mesa) {
    mesasPorId[converterParaIdentificador_(mesa.Id)] = mesa;
  });

  var semMesa = [];
  var semColuna = [];

  componentes.forEach(function (componente) {
    var titulo = String(componente.Titulo || componente.Id);
    var mesa = mesasPorId[converterParaIdentificador_(componente.MesaId)];
    if (!mesa) {
      semMesa.push(titulo);
      return;
    }

    // Cartão do Dashboard não cita coluna: a dimensão dele é uma regra de
    // contagem ('total', 'situacao', 'naCelula'), e não um cabeçalho.
    if (normalizarParaComparar_(componente.TipoWidget) === 'cartao') return;

    var estrutura = estruturaDaAba_(String(mesa.Aba || ''));
    [componente.CampoDimensao, componente.CampoMedida].forEach(function (bruto) {
      var cabecalho = String(bruto || '').trim();
      if (!cabecalho) return;
      if (posicaoDaColuna_(estrutura, cabecalho) < 0) {
        semColuna.push(titulo + ' → "' + cabecalho + '"');
      }
    });
  });

  if (semMesa.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      semMesa.length + ' componente(s) apontam para mesa que não existe',
      algunsExemplos_(semMesa),
      'Eles não aparecem em tela nenhuma. Acerte a mesa ou remova em '
        + 'Configurações › Painéis.'));
  }
  if (semColuna.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      semColuna.length + ' gráfico(s) apontam para coluna que não existe',
      algunsExemplos_(semColuna),
      'O gráfico abre vazio, sem dizer por quê. Acerte em Configurações › '
        + 'Painéis › Gráficos.'));
  }
  if (!semMesa.length && !semColuna.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      'Os ' + componentes.length + ' componentes apontam para mesas e colunas '
        + 'que existem'));
  }

  return itens;
}

function blocoDasAnalises_() {
  var receitas = lerRegistros_('ANALISES');
  if (!receitas.length) {
    return [item_(RECC_SITUACOES_DO_LAUDO.OK, 'Nenhuma análise montada')];
  }

  var itens = [];
  var mesasPorId = {};
  lerRegistros_('MESAS').forEach(function (mesa) {
    mesasPorId[converterParaIdentificador_(mesa.Id)] = mesa;
  });

  receitas.forEach(function (receita) {
    var nome = String(receita.Nome || receita.Id);
    var mesa = mesasPorId[converterParaIdentificador_(receita.MesaId)];

    if (!mesa) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        'A análise "' + nome + '" aponta para mesa que não existe',
        'Gerar esta análise vai estourar.',
        'Acerte a mesa em Configurações › Análises, ou tire a análise da lista.'));
      return;
    }

    var estrutura = estruturaDaAba_(String(mesa.Aba || ''));
    var perdidas = colunasCitadas_(receita.Colunas).filter(function (cabecalho) {
      return posicaoDaColuna_(estrutura, cabecalho) < 0;
    });

    if (perdidas.length) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        'A análise "' + nome + '" cita coluna que a mesa não tem',
        algunsExemplos_(perdidas),
        'A coluna sai vazia na aba gerada. Acerte em Configurações › Análises.'));
      return;
    }

    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      'A análise "' + nome + '" está coerente'
        + (receita.GeradaEm ? '' : ' (nunca gerada)')));
  });

  return itens;
}

/**
 * O sistema precisa continuar tendo dono.
 *
 * "Deixar a instalação sem nenhum administrador" está na lista do que o
 * sistema nunca faz — e o jeito mais fácil de acontecer é aos poucos: alguém
 * desativa um usuário, alguém tira uma permissão, e um dia não sobra ninguém
 * que consiga abrir Configurações para desfazer.
 */
function blocoDoAcesso_() {
  var itens = [];
  var usuarios = lerRegistros_('USUARIOS');
  var niveisPorId = {};

  lerRegistros_('CATALOGO').forEach(function (linha) {
    if (normalizarParaComparar_(linha.Tipo) === 'nivelacesso') {
      niveisPorId[converterParaIdentificador_(linha.Id)] = linha;
    }
  });

  var semNivel = [];
  var comDefeito = [];
  var quantosConfiguram = 0;

  usuarios.forEach(function (usuario) {
    if (normalizarParaComparar_(usuario.Ativo) !== 'sim') return;
    var nivel = niveisPorId[converterParaIdentificador_(usuario.NivelAcessoId)];
    if (!nivel) {
      semNivel.push(String(usuario.Email || usuario.Nome));
      return;
    }
    if (normalizarParaComparar_(nivel.Ativo) !== 'sim') return;

    var permissoes = lerPermissoesDoNivel_(nivel);
    if (permissoes.defeito) {
      comDefeito.push(String(nivel.Nome) + ': ' + permissoes.defeito);
      return;
    }
    if (permissoes.acoes.indexOf(RECC_ACOES.CONFIGURAR) >= 0
      && permissoes.telas.indexOf('configuracoes') >= 0) {
      quantosConfiguram++;
    }
  });

  if (comDefeito.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      comDefeito.length + ' nível(is) com a configuração quebrada',
      algunsExemplos_(comDefeito),
      'Quem estiver nesses níveis abre o sistema com o menu vazio. A coluna '
        + 'Configuracao, em CATALOGO, precisa ser um JSON válido — o mais '
        + 'seguro é reeditar o nível por Configurações › Níveis de acesso.'));
  }

  if (semNivel.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      semNivel.length + ' usuário(s) ativo(s) com nível que não existe',
      algunsExemplos_(semNivel),
      'Essas pessoas caem na tela de acesso negado, dizendo que o nível '
        + 'sumiu. Escolha um nível para cada uma em Configurações › Usuários.'));
  }

  itens.push(quantosConfiguram > 0
    ? item_(RECC_SITUACOES_DO_LAUDO.OK,
      quantosConfiguram + ' pessoa(s) conseguem abrir Configurações')
    : item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Ninguém consegue mais abrir Configurações',
      'Nenhum usuário ativo tem, ao mesmo tempo, a permissão de configurar e '
        + 'a tela de Configurações no menu.',
      'Só dá para sair disto pela planilha: em CATALOGO, ache o nível de '
        + 'acesso da pessoa e devolva "configurar" às ações e "configuracoes" '
        + 'às telas, dentro da coluna Configuracao.'));

  var ativos = usuarios.filter(function (usuario) {
    return normalizarParaComparar_(usuario.Ativo) === 'sim';
  }).length;
  itens.push(ativos > 0
    ? item_(RECC_SITUACOES_DO_LAUDO.OK, ativos + ' usuário(s) ativo(s)')
    : item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Não há nenhum usuário ativo',
      'Ninguém entra no sistema.',
      'Cadastre pela planilha, na aba USUARIOS, ou rode instalarRECC(), que '
        + 'cadastra quem executou como administrador.'));

  return itens;
}

/**
 * A ligação entre a tela e o servidor — o "build" desta etapa.
 *
 * A tela chama o servidor pelo NOME da função, em texto. Renomear uma função
 * no servidor não quebra nada na hora: quebra quando alguém clica no botão,
 * semanas depois, e a mensagem que aparece é a do Apps Script, que não diz
 * qual função faltou. Este bloco encontra isso antes.
 */
function blocoDaTela_() {
  var itens = [];
  var telas = telasIncluidasNoIndex_();

  if (!telas.length) {
    return [item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Não consegui ler as inclusões do Index.html',
      'Sem isso não dá para conferir a ligação com o servidor.',
      'Veja se Index.html existe e se as inclusões estão escritas como '
        + "incluir('NomeDaTela').")];
  }

  var chamadas = {};
  var naoLidas = arquivosDeTelaQueFaltam_();

  telas.forEach(function (nomeDaTela) {
    if (naoLidas.indexOf(nomeDaTela) >= 0) return;
    var fonte = HtmlService.createTemplateFromFile(nomeDaTela).getRawContent();
    var achados = fonte.match(/Servidor\.chamar\('([A-Za-z0-9_]+)'/g) || [];
    achados.forEach(function (achado) {
      var nome = achado.replace("Servidor.chamar('", '').replace("'", '');
      if (!chamadas[nome]) chamadas[nome] = [];
      if (chamadas[nome].indexOf(nomeDaTela) < 0) chamadas[nome].push(nomeDaTela);
    });
  });

  if (naoLidas.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      naoLidas.length + ' arquivo(s) de tela incluídos e ausentes',
      naoLidas.join(', '),
      'O Index.html inclui esses arquivos e eles não estão no projeto: a '
        + 'página não carrega, e o Apps Script só diz o nome do primeiro. '
        + 'Copie Front-End/<Nome>.html do repositório para cá, criando cada '
        + 'um como arquivo HTML com o nome exato — sem ".html", sem acento e '
        + 'com as maiúsculas iguais.'));
  }

  var faltando = [];
  Object.keys(chamadas).forEach(function (nome) {
    if (typeof globalThis[nome] !== 'function') {
      faltando.push(nome + ' (usada em ' + chamadas[nome].join(', ') + ')');
    }
  });

  if (faltando.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      faltando.length + ' função(ões) que a tela chama não existem no servidor',
      algunsExemplos_(faltando),
      'O botão que chama uma dessas falha no clique, com a mensagem do Apps '
        + 'Script — que não diz qual função faltou. Ou a função foi renomeada '
        + 'no servidor e a tela não acompanhou, ou o arquivo .gs dela não '
        + 'está no projeto.'));
  } else {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      'As ' + Object.keys(chamadas).length + ' funções que a tela chama existem '
        + 'no servidor'));
  }

  // O menu promete telas; o roteador é quem as monta. Item de menu sem rota
  // leva a uma tela em branco, e em branco ninguém sabe se é erro ou é vazio.
  var roteador = '';
  try {
    roteador = HtmlService.createTemplateFromFile('Aplicacao').getRawContent();
  } catch (erro) {
    roteador = '';
  }

  if (!roteador) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Não consegui ler o roteador (Aplicacao.html)',
      'Sem ele nenhuma tela é montada.',
      'Confira se o arquivo está no projeto.'));
    return itens;
  }

  var semRota = RECC_TELAS_DO_SISTEMA.filter(function (tela) {
    return roteador.indexOf(tela.tela + ':') < 0;
  }).map(function (tela) { return tela.titulo; });

  itens.push(semRota.length
    ? item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      semRota.length + ' tela(s) do menu não têm rota no roteador',
      algunsExemplos_(semRota),
      'Clicar no item do menu abre uma tela em branco. A rota se declara em '
        + 'Aplicacao.html, no mapa de telas.')
    : item_(RECC_SITUACOES_DO_LAUDO.OK,
      'As ' + RECC_TELAS_DO_SISTEMA.length + ' telas do menu têm rota'));

  return itens;
}

/**
 * Os arquivos de tela que o Index manda incluir e que NÃO estão no projeto.
 *
 * Mora aqui, e não no Principal, porque é a mesma conferência que o bloco da
 * tela faz — e duas versões dela acabariam discordando. É usada por três
 * lugares: o bloco do diagnóstico, o recado de erro do `incluir_` e a
 * conferência rápida do Instalador.
 */
function arquivosDeTelaQueFaltam_() {
  return telasIncluidasNoIndex_().filter(function (nome) {
    return !existeArquivoDeTela_(nome);
  });
}

/** O arquivo HTML existe no projeto do Apps Script? */
function existeArquivoDeTela_(nome) {
  try {
    HtmlService.createTemplateFromFile(nome).getRawContent();
    return true;
  } catch (erro) {
    return false;
  }
}

/**
 * A folha de estilos está inteira, e cobre o que as telas usam?
 *
 * NASCEU DE UMA PERGUNTA DA OPERAÇÃO: "desconfigurou a estilização, o que pode
 * ser?". O sistema abria, o conteúdo estava lá, e a aparência não. Desse lado
 * não dava para ver nada: o arquivo aqui estava certo. O que estava
 * desatualizado era a CÓPIA no projeto do Apps Script.
 *
 * É o caso mais comum de todos numa cópia manual: o `Estilos` fica para trás
 * enquanto as telas avançam, e o resultado é uma página que carrega e fica
 * feia — sem erro nenhum no console, porque CSS que não existe não reclama,
 * só não pinta.
 *
 * Então o bloco compara o que as telas USAM com o que o Estilos DEFINE, e diz
 * os nomes que faltam. Com a lista na mão, "está desconfigurado" vira "o
 * Estilos do projeto é mais antigo que as telas".
 */
function blocoDosEstilos_() {
  var itens = [];

  var folha;
  try {
    folha = HtmlService.createTemplateFromFile('Estilos').getRawContent();
  } catch (erro) {
    return [item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'O arquivo Estilos não está no projeto',
      'Sem ele a página carrega sem aparência nenhuma.',
      'Copie Front-End/Estilos.html do repositório e crie aqui um arquivo HTML '
        + 'chamado exatamente "Estilos".')];
  }

  // Truncada no meio é o que acontece quando a colagem de 70 KB não vai
  // inteira. As chaves desequilibradas denunciam isso na hora.
  var semComentario = folha.replace(/\/\*[\s\S]*?\*\//g, '');
  var abre = (semComentario.match(/\{/g) || []).length;
  var fecha = (semComentario.match(/\}/g) || []).length;

  if (folha.indexOf('<style>') < 0 || folha.indexOf('</style>') < 0 || abre !== fecha) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'A folha de estilos está incompleta',
      abre + ' chaves abertas para ' + fecha + ' fechadas'
        + (folha.indexOf('</style>') < 0 ? ', e sem o </style> no fim' : '') + '.',
      'A colagem não foi inteira. Apague o conteúdo do arquivo Estilos e cole '
        + 'de novo, do começo ao fim.'));
  } else {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      'A folha de estilos está inteira',
      Math.round(folha.length / 1024) + ' KB, ' + abre + ' blocos de regras.'));
  }

  var faltando = classesSemEstilo_(folha);
  itens.push(faltando.length
    ? item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      faltando.length + ' classe(s) que as telas usam e o Estilos não define',
      algunsExemplos_(faltando),
      'É quase sempre o mesmo motivo: o Estilos deste projeto é mais antigo '
        + 'que as telas. Copie Front-End/Estilos.html de novo, inteiro.')
    : item_(RECC_SITUACOES_DO_LAUDO.OK,
      'Toda classe que as telas usam está definida'));

  return itens;
}

/**
 * As classes escritas nas telas que a folha não define.
 *
 * Só as ESTÁTICAS — as que aparecem como class="alguma-coisa" no HTML. Classe
 * montada em tempo de execução não dá para conferir daqui, e chutar geraria
 * alarme falso, que é pior que não conferir.
 *
 * A tela de acesso negado fica de fora: ela é servida sozinha, sem o Estilos,
 * e carrega o próprio <style> dentro.
 */
function classesSemEstilo_(folha) {
  var definidas = {};
  (folha.match(/\.[a-z][a-z0-9-]*/g) || []).forEach(function (achado) {
    definidas[achado.substring(1)] = true;
  });

  var faltando = [];
  telasIncluidasNoIndex_().forEach(function (nomeDaTela) {
    if (nomeDaTela === 'Estilos') return;
    if (!existeArquivoDeTela_(nomeDaTela)) return;

    var fonte = HtmlService.createTemplateFromFile(nomeDaTela).getRawContent();
    // Uma tela com <style> próprio define as suas: não são do Estilos.
    var temEstiloProprio = fonte.indexOf('<style>') >= 0;

    (fonte.match(/class="[a-z0-9 _-]+"/g) || []).forEach(function (achado) {
      achado.substring(7, achado.length - 1).split(/\s+/).forEach(function (classe) {
        if (!classe || definidas[classe]) return;
        if (temEstiloProprio && fonte.indexOf('.' + classe) >= 0) return;
        var recado = nomeDaTela + ': .' + classe;
        if (faltando.indexOf(recado) < 0) faltando.push(recado);
      });
    });
  });
  return faltando;
}

/** Os nomes das telas que o Index.html manda incluir. */
function telasIncluidasNoIndex_() {
  var fonte;
  try {
    fonte = HtmlService.createTemplateFromFile('Index').getRawContent();
  } catch (erro) {
    return [];
  }
  var achados = fonte.match(/incluir\('([A-Za-z0-9_]+)'\)/g) || [];
  var nomes = [];
  achados.forEach(function (achado) {
    var nome = achado.replace("incluir('", '').replace("')", '');
    if (nomes.indexOf(nome) < 0) nomes.push(nome);
  });
  return nomes;
}

// ============================================================================
// O LAUDO EM TEXTO, PARA O LOG DO EDITOR
// ============================================================================

/**
 * O mesmo laudo, escrito para caber no log do Apps Script.
 *
 * Quem roda `diagnosticoRECC()` no editor não tem tela: tem o log. Um objeto
 * JSON de trezentas linhas ali é ilegível, e ilegível é o mesmo que ausente.
 */
function laudoEmTexto_(laudo) {
  var marcas = { ok: '  . ', atencao: '  ! ', falha: '  X ' };
  var linhas = [];

  linhas.push('');
  linhas.push('DIAGNOSTICO DO RECC — ' + laudo.quando);
  linhas.push(laudo.aprovado
    ? 'APROVADO — nenhuma falha'
    : 'REPROVADO — ' + laudo.resumo.falhas + ' falha(s)');
  linhas.push(laudo.resumo.total + ' verificações · '
    + laudo.resumo.oks + ' ok · '
    + laudo.resumo.atencoes + ' atenção · '
    + laudo.resumo.falhas + ' falha');
  linhas.push('');

  laudo.blocos.forEach(function (bloco) {
    linhas.push('[' + String(bloco.situacao).toUpperCase() + '] ' + bloco.titulo);
    bloco.itens.forEach(function (item) {
      linhas.push((marcas[item.situacao] || '  ? ') + item.oQue);
      if (item.detalhe) linhas.push('        ' + item.detalhe);
      if (item.comoArrumar && item.situacao !== RECC_SITUACOES_DO_LAUDO.OK) {
        linhas.push('        → ' + item.comoArrumar);
      }
    });
    linhas.push('');
  });

  return linhas.join('\n');
}


/* ==== Esquema.gs ========================================================== */

/**
 * ============================================================================
 * RECC — Esquema.gs · o contrato das abas
 * ============================================================================
 * Plataforma PGO (Pelitero Labs) · operação RECC (Porto Seguro)
 *
 * Este arquivo é só declaração: nomes de aba, cabeçalhos e tipos. Não chama
 * nada e não depende de nenhum outro arquivo — pode ser lido primeiro sem
 * risco.
 *
 * COMO LER
 * --------
 *   c = o Cabeçalho, exatamente como aparece na linha 1 da planilha
 *   t = o Tipo do dado, que decide o formato da célula
 *   p = Protegido: a interface não renomeia nem exclui (no máximo esconde)
 *
 * O cabeçalho é o contrato — não a posição da coluna. Reordenar colunas na
 * planilha não quebra nada. Ver Planilha.gs.
 * ============================================================================
 */

/**
 * Os tipos de dado. Cada um decide, e isso é o ponto do arquivo inteiro,
 * COMO a célula é formatada antes de receber o valor.
 *
 *   ID       0000000010 precisa continuar 0000000010, e não virar o número 10
 *   DINHEIRO a célula guarda 1234.56 e MOSTRA R$ 1.234,56 — formato, não texto
 *   DATA     data de verdade, para o Power BI filtrar sem conversão
 */
const RECC_TIPO_DE_DADO = {
  IDENTIFICADOR: 'identificador',
  TEXTO: 'texto',
  TEXTO_LONGO: 'textoLongo',
  DATA: 'data',
  HORA: 'hora',
  DATA_HORA: 'dataHora',
  DINHEIRO: 'dinheiro',
  NUMERO: 'numero',
  SIM_OU_NAO: 'simOuNao'
};

/** O formato de célula de cada tipo. Aplicado na linha ANTES de gravar. */
const RECC_FORMATO_DA_CELULA = {
  identificador: '@',
  texto: '@',
  textoLongo: '@',
  data: 'dd/MM/yyyy',
  hora: 'HH:mm',
  dataHora: 'dd/MM/yyyy HH:mm',
  dinheiro: '"R$ "#,##0.00',
  numero: '#,##0.##',
  simOuNao: '@'
};

/** Fuso da operação. O Apps Script roda em UTC e viraria o dia às 21 h. */
const RECC_FUSO_HORARIO = 'America/Sao_Paulo';

/** Maior Id possível: 10 casas decimais. */
const RECC_MAIOR_IDENTIFICADOR = 9999999999;

/**
 * Colunas de controle, acrescentadas ao FIM das abas de dado.
 *
 * O prefixo "_" marca coluna de sistema e sinaliza ao Power BI o que ignorar.
 * `_Visivel` é editável na mão, direto na planilha: é assim que uma linha
 * ocultada volta a aparecer.
 */
const RECC_COLUNAS_DE_CONTROLE = [
  { cabecalho: '_Visivel', tipo: 'texto', protegido: true },
  { cabecalho: '_ExcluidoEm', tipo: 'dataHora', protegido: true },
  { cabecalho: '_ExcluidoPor', tipo: 'identificador', protegido: true },
  { cabecalho: '_Origem', tipo: 'texto', protegido: true }
];

const RECC_VISIVEL_SIM = 'SIM';
const RECC_VISIVEL_NAO = 'NAO';
const RECC_ORIGEM_SISTEMA = 'SISTEMA';
const RECC_ORIGEM_PLANILHA = 'PLANILHA';

/**
 * As 13 abas.
 *
 * `controle: true`  → recebe as colunas _Visivel / _ExcluidoEm / _ExcluidoPor /
 *                     _Origem, e exclusão vira ocultação.
 * `reserva`         → quantas linhas a aba nasce tendo. Célula vazia também
 *                     consome o teto de 10 milhões da planilha, então o
 *                     instalador corta o que sobra. Ver Instalador.gs.
 */
const RECC_ESQUEMA = {

  // ------------------------------------------------------------------ bases
  BASE_RET: {
    aba: 'BASE_RET',
    titulo: 'Retenção Vida',
    controle: true,
    reserva: 2000,
    colunas: [
      { cabecalho: 'id', tipo: 'identificador', protegido: true },
      { cabecalho: 'data de recepção do protocolo', tipo: 'data', protegido: true },
      { cabecalho: 'analista', tipo: 'texto', protegido: true },
      { cabecalho: 'SUSEP', tipo: 'identificador', protegido: true },
      { cabecalho: 'segmento', tipo: 'texto', protegido: true },
      { cabecalho: 'Código origem da proposta', tipo: 'identificador', protegido: true },
      { cabecalho: 'número da proposta', tipo: 'identificador', protegido: true },
      { cabecalho: 'nome do cliente', tipo: 'texto', protegido: true },
      { cabecalho: 'cod produto', tipo: 'identificador', protegido: true },
      { cabecalho: 'produto', tipo: 'texto', protegido: true },
      { cabecalho: 'grupo', tipo: 'texto', protegido: true },
      { cabecalho: 'sistema', tipo: 'texto', protegido: true },
      { cabecalho: 'valor do prêmio', tipo: 'dinheiro', protegido: true },
      { cabecalho: 'valor do prêmio retido', tipo: 'dinheiro', protegido: true },
      { cabecalho: 'prêmio mensal retido', tipo: 'dinheiro', protegido: true },
      { cabecalho: 'agente da central', tipo: 'texto', protegido: true },
      { cabecalho: 'canal', tipo: 'texto', protegido: true },
      { cabecalho: 'relacionamento', tipo: 'texto', protegido: true },
      { cabecalho: 'contato', tipo: 'texto', protegido: true },
      // Texto, e não identificador: o protocolo da operação é alfanumérico
      // ("RET-2026-1024"), e como identificador ele perderia as letras — o
      // tipo identificador guarda só dígitos, de propósito.
      { cabecalho: 'protocolo', tipo: 'texto', protegido: true },
      { cabecalho: 'cod_sucursal', tipo: 'identificador', protegido: true },
      { cabecalho: 'cod_ramo', tipo: 'identificador', protegido: true },
      { cabecalho: 'Num_apolice', tipo: 'identificador', protegido: true },
      { cabecalho: 'CPF', tipo: 'identificador', protegido: true },
      { cabecalho: 'status', tipo: 'texto', protegido: true },
      { cabecalho: 'Forma de pagamento', tipo: 'texto', protegido: true },
      { cabecalho: 'dados do pagamento', tipo: 'texto', protegido: true },
      { cabecalho: 'descrição', tipo: 'textoLongo', protegido: true },
      { cabecalho: 'telefones de contato', tipo: 'identificador', protegido: true },
      { cabecalho: 'e-mail', tipo: 'texto', protegido: true },
      { cabecalho: 'Novo cod origem proposta', tipo: 'identificador', protegido: true },
      { cabecalho: 'novo numero da proposta', tipo: 'identificador', protegido: true },
      { cabecalho: 'motivo do cancelamento', tipo: 'texto', protegido: true },
      { cabecalho: 'data da transmissão', tipo: 'data', protegido: true },
      { cabecalho: 'tentativas de contato', tipo: 'numero', protegido: true }
    ]
  },

  BASE_MESA: {
    aba: 'BASE_MESA',
    titulo: 'Mesa Diamante',
    controle: true,
    reserva: 2000,
    colunas: [
      { cabecalho: 'ID', tipo: 'identificador', protegido: true },
      { cabecalho: 'Analista', tipo: 'texto', protegido: true },
      { cabecalho: 'Status', tipo: 'texto', protegido: true },
      { cabecalho: 'Canal', tipo: 'texto', protegido: true },
      { cabecalho: 'Data de entrada', tipo: 'data', protegido: true },
      { cabecalho: 'Horário', tipo: 'hora', protegido: true },
      { cabecalho: 'Tipo', tipo: 'texto', protegido: true },
      { cabecalho: 'Abertura indevida', tipo: 'simOuNao', protegido: true },
      { cabecalho: 'Título do e-mail', tipo: 'texto', protegido: true },
      { cabecalho: 'Nome do segurado', tipo: 'texto', protegido: true },
      { cabecalho: 'Documento (CPF)', tipo: 'identificador', protegido: true },
      { cabecalho: 'Corretora', tipo: 'texto', protegido: true },
      { cabecalho: 'SUSEP', tipo: 'identificador', protegido: true },
      { cabecalho: 'Ramo', tipo: 'texto', protegido: true },
      { cabecalho: 'Assunto', tipo: 'texto', protegido: true },
      { cabecalho: 'Área responsável', tipo: 'texto', protegido: true },
      { cabecalho: 'Data resposta', tipo: 'data', protegido: true },
      { cabecalho: 'Hora resposta', tipo: 'hora', protegido: true },
      { cabecalho: 'Data da finalização', tipo: 'data', protegido: true },
      { cabecalho: 'horário da finalização', tipo: 'hora', protegido: true }
    ]
  },

  // -------------------------------------------------------------- cadastros
  USUARIOS: {
    aba: 'USUARIOS',
    titulo: 'Usuários',
    controle: true,
    reserva: 300,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'Nome', tipo: 'texto', protegido: true },
      { cabecalho: 'Email', tipo: 'texto', protegido: true },
      { cabecalho: 'Canal que atende', tipo: 'texto', protegido: false },
      { cabecalho: 'CargoId', tipo: 'identificador', protegido: true },
      { cabecalho: 'NivelAcessoId', tipo: 'identificador', protegido: true },
      { cabecalho: 'Matricula', tipo: 'identificador', protegido: false },
      { cabecalho: 'Ativo', tipo: 'simOuNao', protegido: true },
      { cabecalho: 'DataCadastro', tipo: 'dataHora', protegido: true },
      { cabecalho: 'UltimoAcesso', tipo: 'dataHora', protegido: true }
    ]
  },

  CANAIS: {
    aba: 'CANAIS',
    titulo: 'Canais, corretores e agentes',
    controle: true,
    reserva: 1000,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'Nome', tipo: 'texto', protegido: true },
      { cabecalho: 'Canal', tipo: 'texto', protegido: true },
      { cabecalho: 'SUSEP', tipo: 'identificador', protegido: true },
      { cabecalho: 'Corretora', tipo: 'texto', protegido: true },
      { cabecalho: 'Segmento', tipo: 'texto', protegido: true }
    ]
  },

  // Código e descrição NUNCA dividem a mesma célula. Vale aqui e vale para
  // proposta, sucursal, ramo e apólice nas bases.
  PRODUTOS: {
    aba: 'PRODUTOS',
    titulo: 'Produtos',
    controle: true,
    reserva: 500,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'Produto', tipo: 'texto', protegido: true },
      { cabecalho: 'CodigoProduto', tipo: 'identificador', protegido: true }
    ]
  },

  SUSEP_BLOQUEADAS: {
    aba: 'SUSEP_BLOQUEADAS',
    titulo: 'SUSEPs bloqueadas',
    controle: true,
    reserva: 500,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'SUSEP', tipo: 'identificador', protegido: true },
      { cabecalho: 'NomeCorretora', tipo: 'texto', protegido: true },
      { cabecalho: 'CpfReincidente', tipo: 'identificador', protegido: true },
      { cabecalho: 'Motivo', tipo: 'texto', protegido: false },
      { cabecalho: 'BloqueadaEm', tipo: 'data', protegido: false }
    ]
  },

  // ---------------------------------------------------------------- sistema
  MESAS: {
    aba: 'MESAS',
    titulo: 'Mesas de trabalho',
    controle: false,
    reserva: 50,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'Nome', tipo: 'texto', protegido: true },
      { cabecalho: 'Descricao', tipo: 'texto', protegido: false },
      { cabecalho: 'Aba', tipo: 'texto', protegido: true },
      // Quais colunas da base guardam quando o caso entrou. É daqui que sai a
      // "data do último registro" da barra superior. Ficam declaradas, e não
      // adivinhadas, porque cada mesa nomeia essa coluna do seu jeito.
      { cabecalho: 'ColunaDaData', tipo: 'texto', protegido: false },
      { cabecalho: 'ColunaDaHora', tipo: 'texto', protegido: false },
      // O painel precisa saber onde a mesa guarda cada coisa. Declarado, e
      // não adivinhado pelo nome: cada mesa batiza a coluna do seu jeito, e
      // adivinhar acerta hoje e erra na mesa que vier depois.
      { cabecalho: 'ColunaDoStatus', tipo: 'texto', protegido: false },
      // As colunas da fila. Aceita duas escritas:
      //
      //   plana      Data de entrada, Status, Nome do segurado
      //   agrupada   Situação: Data, Status; Dados da proposta: Protocolo…
      //
      // A agrupada junta várias colunas debaixo de um título só — é o que
      // deixa a fila legível quando o caso tem trinta e cinco campos e a
      // pessoa precisa achar o dele de relance.
      { cabecalho: 'ColunasDaFila', tipo: 'textoLongo', protegido: false },
      // Em quais colunas a busca procura. É por elas, e só por elas, que o
      // sistema lê a base inteira — ler as 35 colunas de 200 mil linhas são
      // 7 milhões de células, e ler cinco são um milhão.
      { cabecalho: 'ColunasDaBusca', tipo: 'texto', protegido: false },
      // Quantos casos por mês se espera de uma pessoa nesta mesa. Zero
      // desliga a meta: mesa sem meta declarada não inventa uma, e a tela
      // simplesmente não mostra a barra de progresso.
      { cabecalho: 'MetaMensalPorPessoa', tipo: 'numero', protegido: false },
      { cabecalho: 'ColunaDaFinalizacao', tipo: 'texto', protegido: false },
      { cabecalho: 'ColunaDaAreaResponsavel', tipo: 'texto', protegido: false },
      { cabecalho: 'Icone', tipo: 'texto', protegido: false },
      { cabecalho: 'Ordem', tipo: 'numero', protegido: false },
      { cabecalho: 'Ativo', tipo: 'simOuNao', protegido: true }
    ]
  },

  CAMPOS: {
    aba: 'CAMPOS',
    titulo: 'Campos do formulário',
    controle: false,
    reserva: 500,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'MesaId', tipo: 'identificador', protegido: true },
      { cabecalho: 'Aba', tipo: 'texto', protegido: true },
      { cabecalho: 'ChaveTecnica', tipo: 'texto', protegido: true },
      { cabecalho: 'Cabecalho', tipo: 'texto', protegido: true },
      { cabecalho: 'Rotulo', tipo: 'texto', protegido: false },
      { cabecalho: 'Descricao', tipo: 'texto', protegido: false },
      { cabecalho: 'TipoCampo', tipo: 'texto', protegido: true },
      { cabecalho: 'Secao', tipo: 'texto', protegido: false },
      { cabecalho: 'Mascara', tipo: 'texto', protegido: false },
      { cabecalho: 'Obrigatorio', tipo: 'simOuNao', protegido: false },
      { cabecalho: 'Protegido', tipo: 'simOuNao', protegido: true },
      { cabecalho: 'Ativo', tipo: 'simOuNao', protegido: false },
      { cabecalho: 'Ordem', tipo: 'numero', protegido: false },
      { cabecalho: 'VisivelPara', tipo: 'texto', protegido: false },
      { cabecalho: 'ValorPadrao', tipo: 'texto', protegido: false },
      { cabecalho: 'Configuracao', tipo: 'textoLongo', protegido: false }
    ]
  },

  CATALOGO: {
    aba: 'CATALOGO',
    titulo: 'Catálogo',
    controle: false,
    reserva: 1000,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'MesaId', tipo: 'identificador', protegido: false },
      { cabecalho: 'Tipo', tipo: 'texto', protegido: true },
      { cabecalho: 'Codigo', tipo: 'identificador', protegido: false },
      { cabecalho: 'Nome', tipo: 'texto', protegido: true },
      { cabecalho: 'Rotulo', tipo: 'texto', protegido: false },
      { cabecalho: 'PaiId', tipo: 'identificador', protegido: false },
      { cabecalho: 'Cor', tipo: 'texto', protegido: false },
      { cabecalho: 'Ordem', tipo: 'numero', protegido: false },
      { cabecalho: 'Ativo', tipo: 'simOuNao', protegido: false },
      { cabecalho: 'Configuracao', tipo: 'textoLongo', protegido: false }
    ]
  },

  PAINEIS: {
    aba: 'PAINEIS',
    titulo: 'Painéis',
    controle: false,
    reserva: 300,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'Tela', tipo: 'texto', protegido: true },
      { cabecalho: 'MesaId', tipo: 'identificador', protegido: false },
      { cabecalho: 'Titulo', tipo: 'texto', protegido: false },
      // 'cartao' no Dashboard; pizza, linha e barras no Painel Analítico.
      { cabecalho: 'TipoWidget', tipo: 'texto', protegido: true },
      // Para um cartão, é a regra de contagem: 'total', 'situacao' ou
      // 'naCelula'. Para um gráfico, é o campo que vira eixo.
      { cabecalho: 'CampoDimensao', tipo: 'texto', protegido: false },
      { cabecalho: 'CampoMedida', tipo: 'texto', protegido: false },
      { cabecalho: 'Agregacao', tipo: 'texto', protegido: false },
      { cabecalho: 'Limite', tipo: 'numero', protegido: false },
      { cabecalho: 'Filtro', tipo: 'textoLongo', protegido: false },
      { cabecalho: 'Ordem', tipo: 'numero', protegido: false },
      { cabecalho: 'Largura', tipo: 'numero', protegido: false },
      // O tom, por NOME — 'bom', 'ruim', 'atencao'… Guardar '#15794A' aqui
      // deixaria o verde do tema claro aparecendo no tema escuro.
      { cabecalho: 'Cor', tipo: 'texto', protegido: false },
      { cabecalho: 'VisivelPara', tipo: 'texto', protegido: false },
      { cabecalho: 'Ativo', tipo: 'simOuNao', protegido: false }
    ]
  },

  /*
    As análises que o administrador montou.
    Uma ABA, e não um JSON dentro de CONFIG, pela mesma razão que os cartões do
    Dashboard saíram de MESAS: é uma LISTA de coisas configuráveis, cada uma
    com nome, mesa, colunas e filtro próprios. Guardada como texto numa célula,
    dava para escolher "quais" e para mais nada.

    ATENÇÃO: esta aba guarda a RECEITA. A aba gerada — ANALISE_<Nome> — é outra
    coisa, não está no contrato e é recriada a cada geração.
  */
  ANALISES: {
    aba: 'ANALISES',
    titulo: 'Análises',
    controle: true,
    reserva: 100,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      // Vira o nome da aba: 'Diamante' gera ANALISE_Diamante. Só letras,
      // números e _ — é o que o Google Planilhas aceita sem aspas em fórmula.
      { cabecalho: 'Nome', tipo: 'texto', protegido: false },
      { cabecalho: 'Descricao', tipo: 'texto', protegido: false },
      { cabecalho: 'MesaId', tipo: 'identificador', protegido: false },
      // Cabeçalhos separados por vírgula. Vazio = todas as colunas da mesa.
      { cabecalho: 'Colunas', tipo: 'textoLongo', protegido: false },
      // 'Coluna=valor' separados por ponto e vírgula. Vazio = sem filtro.
      { cabecalho: 'Filtros', tipo: 'textoLongo', protegido: false },
      // Janela em dias, contada da coluna de data da mesa. 0 = tudo.
      { cabecalho: 'Dias', tipo: 'numero', protegido: false },
      { cabecalho: 'Ordem', tipo: 'numero', protegido: false },
      { cabecalho: 'Ativo', tipo: 'simOuNao', protegido: false },
      // O retrato: quando foi gerado e quantas linhas saíram. É o que faz a
      // tela dizer "gerada ontem, 1.204 linhas" em vez de só "existe".
      { cabecalho: 'GeradaEm', tipo: 'dataHora', protegido: true },
      { cabecalho: 'GeradaPor', tipo: 'identificador', protegido: true },
      { cabecalho: 'Linhas', tipo: 'numero', protegido: true }
    ]
  },

  CONFIG: {
    aba: 'CONFIG',
    titulo: 'Configurações',
    controle: false,
    reserva: 200,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'Chave', tipo: 'texto', protegido: true },
      { cabecalho: 'Valor', tipo: 'textoLongo', protegido: false },
      { cabecalho: 'Descricao', tipo: 'texto', protegido: false },
      { cabecalho: 'AtualizadoPor', tipo: 'identificador', protegido: false },
      { cabecalho: 'Data', tipo: 'dataHora', protegido: false }
    ]
  },

  AUDITORIA: {
    aba: 'AUDITORIA',
    titulo: 'Auditoria',
    controle: false,
    reserva: 2000,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'DataHora', tipo: 'dataHora', protegido: true },
      { cabecalho: 'UsuarioId', tipo: 'identificador', protegido: true },
      { cabecalho: 'Acao', tipo: 'texto', protegido: true },
      { cabecalho: 'Entidade', tipo: 'texto', protegido: false },
      { cabecalho: 'RegistroId', tipo: 'identificador', protegido: false },
      { cabecalho: 'Detalhe', tipo: 'textoLongo', protegido: false }
    ]
  }
};

/**
 * A ponte entre o tipo de DADO da coluna e o tipo de CAMPO do formulário.
 *
 * Existem os dois porque respondem a perguntas diferentes: o tipo de dado
 * decide o formato da célula; o tipo de campo decide o controle que aparece
 * na tela. "moeda" e "dinheiro" são a mesma coisa vista de dois lados.
 */
const RECC_DO_DADO_PARA_O_CAMPO = {
  identificador: 'identificador',
  texto: 'texto',
  textoLongo: 'textoLongo',
  data: 'data',
  hora: 'hora',
  dataHora: 'dataHora',
  dinheiro: 'moeda',
  numero: 'numero',
  simOuNao: 'simOuNao'
};

/** O caminho de volta, com os apelidos que a configuração aceita. */
const RECC_DO_CAMPO_PARA_O_DADO = {
  identificador: 'identificador',
  documento: 'identificador',
  telefone: 'identificador',
  texto: 'texto',
  textoLongo: 'textoLongo',
  email: 'texto',
  seletor: 'texto',
  seletorMultiplo: 'texto',
  data: 'data',
  hora: 'hora',
  dataHora: 'dataHora',
  moeda: 'dinheiro',
  numero: 'numero',
  percentual: 'numero',
  simOuNao: 'simOuNao'
};

/** Prefixo reservado das abas geradas pelo gerador de análise. */
const RECC_PREFIXO_ANALISE = 'ANALISE_';

/**
 * A definição de uma aba, com as colunas de controle já anexadas.
 * É esta lista, e não `RECC_ESQUEMA[x].colunas`, que representa a aba inteira.
 */
function esquemaDaAba_(nomeDaAba) {
  var definicao = RECC_ESQUEMA[nomeDaAba];
  if (!definicao) {
    throw new Error('Aba "' + nomeDaAba + '" não faz parte do esquema do RECC.');
  }
  var colunas = definicao.colunas.slice();
  if (definicao.controle) {
    for (var i = 0; i < RECC_COLUNAS_DE_CONTROLE.length; i++) {
      colunas.push(RECC_COLUNAS_DE_CONTROLE[i]);
    }
  }
  return {
    aba: definicao.aba,
    titulo: definicao.titulo,
    controle: definicao.controle,
    reserva: definicao.reserva,
    colunas: colunas
  };
}

/** Os nomes das abas do contrato, na ordem em que o instalador as cria. */
function nomesDasAbasDoContrato_() {
  return Object.keys(RECC_ESQUEMA);
}


/* ==== Importacao.gs ======================================================= */

/**
 * RECC — Importacao.gs · trazer listas prontas para dentro do sistema
 * ============================================================================
 * O cadastro de corretoras e a lista de SUSEPs bloqueadas já EXISTEM na
 * operação, em planilha, antes de o PGO nascer. Digitar centenas de linhas
 * uma a uma dentro do sistema não é trabalho: é desperdício, e é o caminho
 * mais curto para o cadastro nascer pela metade.
 *
 * Esta tela resolve isso com três passos, sempre nesta ordem:
 *
 *   1. COLAR    a pessoa copia da planilha dela e cola aqui. Aceita o que o
 *               Excel e o Google Planilhas colocam na área de transferência —
 *               colunas separadas por TAB — e também ponto e vírgula.
 *   2. CONFERIR o servidor lê o texto e devolve o que VAI acontecer com cada
 *               linha, sem gravar nada: nova, atualiza a que existe, ou
 *               recusada — e neste último caso, por quê.
 *   3. APLICAR  só então grava.
 *
 * Duas decisões que valem a pena estar escritas:
 *
 * O SEGUNDO PASSO NÃO É ENFEITE. Importação é a ação com maior alcance do
 * sistema: um erro escreve em quinhentas linhas de uma vez. Ver antes é o que
 * transforma "colei a coluna errada" num susto em vez de num estrago.
 *
 * O TERCEIRO PASSO NÃO CONFIA NO SEGUNDO. `aplicarImportacao` lê o TEXTO
 * de novo e refaz a conferência inteira — não recebe do navegador a lista já
 * conferida. Se recebesse, bastaria alterar a lista no caminho para gravar o
 * que o servidor nunca aprovou.
 *
 * Nada aqui APAGA. Uma SUSEP que está no cadastro e não está no arquivo colado
 * fica onde está: o arquivo é uma correção, não a verdade inteira. Quem quiser
 * tirar uma corretora tira uma a uma, na tabela, e mesmo assim a linha
 * permanece na planilha.
 * ============================================================================
 */

/** Quantas linhas o passo de conferência mostra na tela. */
var RECC_LINHAS_NA_CONFERENCIA = 200;

/** Teto de linhas por importação, para não estourar o tempo do Apps Script. */
var RECC_MAXIMO_DA_IMPORTACAO = 2000;

/**
 * O que dá para importar.
 *
 * Cada tipo diz em que aba grava, qual coluna é a CHAVE (a que decide se a
 * linha é nova ou é atualização) e quais colunas ele entende. A tela desenha o
 * cabeçalho de exemplo a partir daqui — assim o que a tela promete e o que o
 * servidor aceita não podem divergir.
 */
var RECC_IMPORTACOES = {
  corretoras: {
    titulo: 'Corretoras',
    aba: 'CANAIS',
    chave: 'susep',
    explicacao: 'Uma linha por corretora. A SUSEP é o que liga a corretora ao '
      + 'caso, e é por ela que o sistema sabe se a linha é nova ou já existe.',
    colunas: [
      { chave: 'susep', titulo: 'SUSEP', coluna: 'SUSEP',
        tipo: 'identificador', obrigatoria: true },
      { chave: 'corretora', titulo: 'Corretora', coluna: 'Corretora',
        tipo: 'texto', obrigatoria: true },
      { chave: 'canal', titulo: 'Canal', coluna: 'Canal', tipo: 'texto' },
      { chave: 'segmento', titulo: 'Segmento', coluna: 'Segmento',
        tipo: 'texto', padrao: 'Não encontrado' }
    ]
  },

  susepsBloqueadas: {
    titulo: 'SUSEPs bloqueadas',
    aba: 'SUSEP_BLOQUEADAS',
    chave: 'susep',
    explicacao: 'Uma linha por SUSEP bloqueada. O motivo é obrigatório: sem '
      + 'ele, quem vir o selo vermelho daqui a seis meses não saberá o que '
      + 'fazer com a informação.',
    colunas: [
      { chave: 'susep', titulo: 'SUSEP', coluna: 'SUSEP',
        tipo: 'identificador', obrigatoria: true },
      { chave: 'motivo', titulo: 'Motivo', coluna: 'Motivo',
        tipo: 'texto', obrigatoria: true },
      { chave: 'corretora', titulo: 'Corretora', coluna: 'NomeCorretora',
        tipo: 'texto' },
      { chave: 'cpfReincidente', titulo: 'CPF reincidente',
        coluna: 'CpfReincidente', tipo: 'identificador' }
    ]
  }
};

// ============================================================================
// O QUE A TELA PRECISA SABER
// ============================================================================

/**
 * Os tipos de importação e as colunas de cada um.
 *
 * A tela não guarda essa lista: pede aqui. Acrescentar um tipo novo é mexer
 * em RECC_IMPORTACOES e em mais lugar nenhum.
 */
function opcoesDaImportacao() {
  exigirTela_('tabelaCorretoras');

  return Object.keys(RECC_IMPORTACOES).map(function (tipo) {
    var receita = RECC_IMPORTACOES[tipo];
    return {
      tipo: tipo,
      titulo: receita.titulo,
      explicacao: receita.explicacao,
      maximo: RECC_MAXIMO_DA_IMPORTACAO,
      colunas: receita.colunas.map(function (coluna) {
        return {
          chave: coluna.chave,
          titulo: coluna.titulo,
          obrigatoria: !!coluna.obrigatoria
        };
      })
    };
  });
}

// ============================================================================
// LER O TEXTO COLADO
// ============================================================================

/**
 * Descobre o separador das colunas.
 *
 * O Excel e o Google Planilhas colocam TAB na área de transferência. Quem
 * salvou um CSV em português tem ponto e vírgula. Vírgula fica por último de
 * propósito: nome de corretora tem vírgula ("SILVA, SOUZA & CIA"), e chutar
 * vírgula quebraria justamente as linhas mais compridas.
 */
function separadorDoTexto_(primeiraLinha) {
  if (primeiraLinha.indexOf('\t') >= 0) return '\t';
  if (primeiraLinha.indexOf(';') >= 0) return ';';
  return ',';
}

/**
 * Reconhece a linha de cabeçalho.
 *
 * Quem copia da planilha quase sempre traz o cabeçalho junto. Sem reconhecer,
 * ele viraria uma corretora chamada "Corretora" com SUSEP "SUSEP" — recusada
 * por não ter dígito, mas aparecendo como erro numa importação que estava
 * certa.
 */
function ehCabecalho_(pedacos, receita) {
  var conhecidos = 0;
  for (var i = 0; i < pedacos.length; i++) {
    var texto = normalizarParaComparar_(pedacos[i]);
    for (var j = 0; j < receita.colunas.length; j++) {
      if (normalizarParaComparar_(receita.colunas[j].titulo) === texto) {
        conhecidos++;
        break;
      }
    }
  }
  return conhecidos >= 2;
}

/**
 * A ordem das colunas do texto colado.
 *
 * Com cabeçalho, a ordem é a que o cabeçalho disser — a pessoa pode ter
 * colado as colunas em qualquer ordem, e um título que o sistema não conhece
 * vira uma posição vazia, ignorada.
 *
 * Sem cabeçalho, a ordem é a declarada em RECC_IMPORTACOES. É a razão de a
 * primeira coluna de cada tipo ser sempre a chave e a segunda ser sempre a
 * obrigatória: quem cola sem cabeçalho cola o essencial.
 */
function ordemDasColunas_(pedacos, receita) {
  if (!ehCabecalho_(pedacos, receita)) {
    return receita.colunas.map(function (coluna) { return coluna.chave; });
  }
  return pedacos.map(function (pedaco) {
    var texto = normalizarParaComparar_(pedaco);
    var achada = receita.colunas.filter(function (coluna) {
      return normalizarParaComparar_(coluna.titulo) === texto;
    })[0];
    return achada ? achada.chave : '';
  });
}

/**
 * Transforma o texto colado numa lista de linhas com os campos nomeados.
 *
 * Não decide nada sobre gravar: só lê. Quem decide é `conferirImportacao_`.
 */
function lerTextoDaImportacao_(texto, receita) {
  // A linha NÃO é aparada antes de ser partida. Parecia inofensivo, e não é:
  // com TAB como separador, aparar come a primeira coluna quando ela vem
  // vazia — e aí "«vazio» TAB Corretora Alfa" vira uma corretora chamada
  // "Corretora Alfa" com SUSEP "Corretora Alfa", deslocando a linha inteira.
  // Quem apara é cada CÉLULA, depois de partida.
  var linhas = String(texto || '')
    .split(/\r\n|\r|\n/)
    .filter(function (linha) { return linha.trim().length > 0; });

  if (!linhas.length) return { ordem: [], linhas: [], tinhaCabecalho: false };

  var separador = separadorDoTexto_(linhas[0]);
  var primeira = linhas[0].split(separador);
  var ordem = ordemDasColunas_(primeira, receita);
  var tinhaCabecalho = ehCabecalho_(primeira, receita);
  var comeco = tinhaCabecalho ? 1 : 0;

  var lidas = [];
  for (var i = comeco; i < linhas.length; i++) {
    var pedacos = linhas[i].split(separador);
    var valores = {};
    for (var c = 0; c < ordem.length; c++) {
      if (!ordem[c]) continue;
      valores[ordem[c]] = String(pedacos[c] === undefined ? '' : pedacos[c])
        .replace(/^"|"$/g, '')
        .trim();
    }
    lidas.push({ numero: i + 1, valores: valores });
  }
  return { ordem: ordem, linhas: lidas, tinhaCabecalho: tinhaCabecalho };
}

// ============================================================================
// CONFERIR
// ============================================================================

/**
 * O que vai acontecer com cada linha — sem gravar nada.
 *
 * É a mesma função que `aplicarImportacao` usa antes de escrever, e é de
 * propósito: conferência e gravação que seguem regras diferentes acabam
 * discordando, e a tela passa a mentir sobre o que o botão faz.
 */
function conferirImportacao_(tipo, texto) {
  var receita = RECC_IMPORTACOES[tipo];
  if (!receita) {
    throw new Error('Não sei importar "' + tipo + '". Existem: '
      + Object.keys(RECC_IMPORTACOES).join(', ') + '.');
  }

  var lido = lerTextoDaImportacao_(texto, receita);
  if (lido.linhas.length > RECC_MAXIMO_DA_IMPORTACAO) {
    throw new Error('São ' + lido.linhas.length + ' linhas, e o limite por vez '
      + 'é ' + RECC_MAXIMO_DA_IMPORTACAO + '. Divida em partes: o Apps Script '
      + 'tem tempo máximo de execução, e uma importação interrompida no meio '
      + 'grava metade.');
  }

  // Ler o cadastro UMA vez, e não uma por linha. Com quinhentas linhas
  // coladas, uma leitura por linha seriam quinhentas leituras da planilha.
  var colunaChave = colunaChaveDaImportacao_(receita);
  var existentes = {};
  lerRegistros_(receita.aba).forEach(function (linha) {
    var chave = converterParaIdentificador_(linha[colunaChave.coluna]);
    if (chave) existentes[chave] = linha;
  });

  var vistas = {};
  var resultado = lido.linhas.map(function (linha) {
    return conferirUmaLinha_(linha, receita, existentes, vistas);
  });

  return {
    tipo: tipo,
    titulo: receita.titulo,
    colunas: receita.colunas.map(function (coluna) {
      return { chave: coluna.chave, titulo: coluna.titulo };
    }),
    // Com cabeçalho reconhecido, dizer isso na tela evita a dúvida mais comum
    // de todas: "ele contou o meu cabeçalho como corretora?".
    tinhaCabecalho: lido.tinhaCabecalho,
    linhas: resultado.slice(0, RECC_LINHAS_NA_CONFERENCIA),
    naoMostradas: Math.max(0, resultado.length - RECC_LINHAS_NA_CONFERENCIA),
    resumo: {
      total: resultado.length,
      novas: contarSituacao_(resultado, 'nova'),
      atualizadas: contarSituacao_(resultado, 'atualiza'),
      iguais: contarSituacao_(resultado, 'igual'),
      recusadas: contarSituacao_(resultado, 'recusada')
    },
    // A lista completa fica aqui para `aplicarImportacao` usar. A tela recebe
    // só as primeiras — e nem precisaria delas, já que quem grava é o servidor.
    todas: resultado
  };
}

/** A coluna que decide se a linha é nova ou é atualização. */
function colunaChaveDaImportacao_(receita) {
  return receita.colunas.filter(function (coluna) {
    return coluna.chave === receita.chave;
  })[0];
}

function contarSituacao_(linhas, situacao) {
  return linhas.filter(function (linha) {
    return linha.situacao === situacao;
  }).length;
}

/**
 * O veredito de uma linha só.
 *
 * `vistas` guarda as chaves que já apareceram NESTE texto: duas linhas com a
 * mesma SUSEP no mesmo arquivo colado são um erro de quem montou o arquivo, e
 * gravar as duas deixaria o cadastro com a duplicidade que a tela de cadastro
 * recusa uma a uma.
 */
function conferirUmaLinha_(linha, receita, existentes, vistas) {
  var campos = {};
  var problemas = [];

  receita.colunas.forEach(function (coluna) {
    var bruto = linha.valores[coluna.chave];
    var valor = coluna.tipo === 'identificador'
      ? converterParaIdentificador_(bruto)
      : String(bruto === undefined ? '' : bruto).trim();

    if (!valor && coluna.padrao) valor = coluna.padrao;
    if (!valor && coluna.obrigatoria) {
      problemas.push(coluna.tipo === 'identificador' && String(bruto || '').trim()
        ? coluna.titulo + ' sem nenhum dígito ("' + bruto + '")'
        : coluna.titulo + ' em branco');
    }
    campos[coluna.chave] = valor;
  });

  var chave = campos[receita.chave];

  if (problemas.length) {
    return { numero: linha.numero, campos: campos, situacao: 'recusada',
      porque: problemas.join('; ') };
  }
  if (vistas[chave]) {
    return { numero: linha.numero, campos: campos, situacao: 'recusada',
      porque: 'repetida — a linha ' + vistas[chave] + ' já trouxe esta '
        + colunaChaveDaImportacao_(receita).titulo };
  }
  vistas[chave] = linha.numero;

  var atual = existentes[chave];
  if (!atual) {
    return { numero: linha.numero, campos: campos, situacao: 'nova', porque: '' };
  }

  var mudancas = mudancasDaLinha_(campos, atual, receita);
  if (!mudancas.length) {
    return { numero: linha.numero, campos: campos, situacao: 'igual',
      porque: 'já está assim no cadastro', id: atual.__id };
  }
  return { numero: linha.numero, campos: campos, situacao: 'atualiza',
    porque: mudancas.join('; '), id: atual.__id };
}

/**
 * O que muda de fato entre a linha colada e a que já está no cadastro.
 *
 * Campo vazio no arquivo NÃO apaga o que existe. Quem cola só SUSEP e
 * Segmento para reclassificar um lote não quer perder o canal cadastrado —
 * e descobrir isso depois de gravar não tem desfazer.
 */
function mudancasDaLinha_(campos, atual, receita) {
  var mudancas = [];
  receita.colunas.forEach(function (coluna) {
    var novo = campos[coluna.chave];
    if (!novo) return;
    var velho = coluna.tipo === 'identificador'
      ? converterParaIdentificador_(atual[coluna.coluna])
      : String(atual[coluna.coluna] === undefined ? '' : atual[coluna.coluna]).trim();
    if (novo === velho) return;
    mudancas.push(coluna.titulo + ': "' + velho + '" → "' + novo + '"');
  });
  return mudancas;
}

// ============================================================================
// AS DUAS FUNÇÕES QUE A TELA CHAMA
// ============================================================================

/** Passo 2: o que vai acontecer. Não grava nada. */
function conferirImportacao(tipo, texto) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var conferido = conferirImportacao_(tipo, texto);
  delete conferido.todas;   // a tela não precisa da lista inteira
  return conferido;
}

/**
 * Passo 3: grava.
 *
 * Pede a senha de administrador. Não é excesso de zelo: é a única ação do
 * sistema que escreve em centenas de linhas com um clique, e o critério para
 * pedir senha sempre foi o alcance, nunca a dificuldade.
 */
function aplicarImportacao(tipo, texto) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');
  exigirSenhaDeAdministrador_();

  var receita = RECC_IMPORTACOES[tipo];
  var conferido = conferirImportacao_(tipo, texto);

  var paraCriar = [];
  var criadas = 0;
  var atualizadas = 0;

  conferido.todas.forEach(function (linha) {
    if (linha.situacao === 'nova') {
      paraCriar.push(camposParaAAba_(linha.campos, receita, true));
    } else if (linha.situacao === 'atualiza') {
      atualizarRegistro_(receita.aba, linha.id,
        camposParaAAba_(linha.campos, receita, false));
      atualizadas++;
    }
  });

  if (paraCriar.length) {
    criadas = inserirVariosRegistros_(receita.aba, paraCriar).length;
  }

  registrarAuditoria_('importacao.aplicar', receita.aba, '',
    receita.titulo + ': ' + criadas + ' criadas, ' + atualizadas + ' atualizadas, '
    + conferido.resumo.recusadas + ' recusadas');

  return {
    titulo: receita.titulo,
    criadas: criadas,
    atualizadas: atualizadas,
    iguais: conferido.resumo.iguais,
    recusadas: conferido.resumo.recusadas,
    por: quem.usuario.Nome
  };
}

/**
 * Traduz os campos da importação para os nomes de coluna da aba.
 *
 * Numa atualização, campo vazio é OMITIDO — não vai como texto vazio. É o que
 * faz a regra do "vazio não apaga" valer também na hora de escrever, e não só
 * na hora de conferir.
 */
function camposParaAAba_(campos, receita, ehNova) {
  var linha = {};
  receita.colunas.forEach(function (coluna) {
    var valor = campos[coluna.chave];
    if (!valor && !ehNova) return;
    linha[coluna.coluna] = valor || '';
  });

  // As colunas que a importação não pergunta, mas a aba espera.
  if (ehNova && receita.aba === 'CANAIS' && !linha.Nome) {
    linha.Nome = campos.corretora || '';
  }
  if (ehNova && receita.aba === 'SUSEP_BLOQUEADAS') {
    linha.BloqueadaEm = new Date();
  }
  return linha;
}


/* ==== Instalador.gs ======================================================= */

/**
 * ============================================================================
 * RECC — Instalador.gs · a única rotina que cria estrutura
 * ============================================================================
 * Rode `instalarRECC()` UMA vez, no editor do Apps Script, sobre uma planilha
 * VAZIA. Ela recusa rodar se qualquer aba do contrato já tiver dado.
 *
 * Depois da instalação, nenhum caminho do produto cria, renomeia, apaga ou
 * reordena aba e coluna por conta própria. Abrir o sistema apenas VALIDA.
 *
 * O que a instalação faz:
 *   1. acerta o fuso da planilha para America/Sao_Paulo;
 *   2. cria as 13 abas, com cabeçalho, formato de coluna e linha 1 congelada;
 *   3. CORTA cada aba para o tamanho do contrato — célula vazia também consome
 *      o teto de 10 milhões da planilha;
 *   4. semeia catálogo, mesas, campos e configuração — tudo editável depois;
 *   5. cadastra QUEM EXECUTOU como o primeiro Administrador.
 *
 * O passo 5 não é conveniência. O acesso é pelo e-mail autenticado conferido
 * contra a aba USUARIOS: base recém-criada tem essa aba vazia, e sem ninguém
 * dentro ninguém entra — nem para cadastrar o primeiro usuário.
 *
 * NENHUM dado operacional é semeado. As bases, os canais, os produtos e as
 * SUSEPs bloqueadas nascem vazios.
 * ============================================================================
 */

const RECC_TETO_DE_CELULAS = 10000000;

/** Ponto de entrada da instalação. */
function instalarRECC() {
  var planilha = planilhaAtiva_();
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    throw new Error('Não foi possível identificar o e-mail de quem está ' +
      'executando. Rode instalarRECC() pelo editor do Apps Script, ' +
      'autorizando o script.');
  }

  abortarSeAPlanilhaTiverDado_(planilha);

  planilha.setSpreadsheetTimeZone(RECC_FUSO_HORARIO);
  esquecerEstruturaLida_();

  var criadas = [];
  nomesDasAbasDoContrato_().forEach(function (nomeDaAba) {
    criadas.push(criarAbaDoContrato_(planilha, esquemaDaAba_(nomeDaAba)));
  });
  esquecerEstruturaLida_();

  var semente = semearDadosIniciais_(email);
  var orcamento = orcamentoDeCelulas_(planilha);

  var laudo = [
    'RECC instalado.',
    '',
    'Abas criadas: ' + criadas.length,
    'Primeiro administrador: ' + email,
    'Fuso da planilha: ' + planilha.getSpreadsheetTimeZone(),
    '',
    'Semente:',
    '  níveis de acesso ..... ' + semente.niveis,
    '  cargos ............... ' + semente.cargos,
    '  itens de catálogo .... ' + semente.catalogo,
    '  mesas ................ ' + semente.mesas,
    '  campos do formulário . ' + semente.campos,
    '  chaves de configuração ' + semente.config,
    '',
    'Orçamento de células: ' + orcamento.usadas.toLocaleString('pt-BR') +
      ' de ' + RECC_TETO_DE_CELULAS.toLocaleString('pt-BR') +
      ' (' + orcamento.percentual + '%)',
    '',
    'Próximo passo: abrir Configurações › Segurança e definir a senha de ADM.'
  ].join('\n');

  Logger.log(laudo);
  return laudo;
}

/** Instalação sobre planilha em uso não existe. */
function abortarSeAPlanilhaTiverDado_(planilha) {
  var comDado = [];
  nomesDasAbasDoContrato_().forEach(function (nomeDaAba) {
    var aba = planilha.getSheetByName(nomeDaAba);
    if (!aba) return;
    var preenchidas = quantasLinhasPreenchidas_(aba);
    if (preenchidas > 0) comDado.push(nomeDaAba + ' (' + preenchidas + ' linhas)');
  });
  if (comDado.length) {
    throw new Error('Esta planilha já tem dado nas abas: ' + comDado.join(', ') +
      '. A instalação só roda sobre planilha vazia, e não vai apagar nada. ' +
      'Use uma planilha nova.');
  }
}

/**
 * Quantas linhas de DADO a aba tem, de verdade.
 *
 * Conferir só getLastRow() não bastaria numa reinstalação: uma tentativa
 * anterior pode ter deixado a aba criada e formatada, e formato não é dado.
 * Aqui a pergunta é se existe algum valor abaixo do cabeçalho.
 */
function quantasLinhasPreenchidas_(aba) {
  var ultima = aba.getLastRow();
  var largura = aba.getLastColumn();
  if (ultima < 2 || largura < 1) return 0;

  var valores = aba.getRange(2, 1, ultima - 1, largura).getValues();
  var preenchidas = 0;
  for (var i = 0; i < valores.length; i++) {
    for (var j = 0; j < valores[i].length; j++) {
      var v = valores[i][j];
      if (v !== '' && v !== null && v !== undefined) { preenchidas++; break; }
    }
  }
  return preenchidas;
}

/**
 * Cria (ou reaproveita, se estiver vazia) a aba e a deixa no tamanho exato do
 * contrato.
 *
 * O corte importa: uma aba nova nasce com 1.000 linhas × 26 colunas, ou seja
 * 26.000 células do orçamento, todas em branco. Multiplicado por 13 abas isso
 * já seria 312 mil células guardando nada.
 */
function criarAbaDoContrato_(planilha, esquema) {
  var aba = planilha.getSheetByName(esquema.aba);
  if (!aba) aba = planilha.insertSheet(esquema.aba);

  var largura = esquema.colunas.length;
  var altura = esquema.reserva + 1;

  if (aba.getMaxColumns() < largura) {
    aba.insertColumnsAfter(aba.getMaxColumns(), largura - aba.getMaxColumns());
  } else if (aba.getMaxColumns() > largura) {
    aba.deleteColumns(largura + 1, aba.getMaxColumns() - largura);
  }
  if (aba.getMaxRows() < altura) {
    aba.insertRowsAfter(aba.getMaxRows(), altura - aba.getMaxRows());
  } else if (aba.getMaxRows() > altura) {
    aba.deleteRows(altura + 1, aba.getMaxRows() - altura);
  }

  var cabecalhos = esquema.colunas.map(function (coluna) { return coluna.cabecalho; });
  var linha1 = aba.getRange(1, 1, 1, largura);
  linha1.setNumberFormat('@');
  linha1.setValues([cabecalhos]);
  linha1.setFontWeight('bold');
  aba.setFrozenRows(1);

  // Pré-formata a área de dados coluna a coluna. Assim até uma linha digitada
  // à mão, sem passar pelo sistema, já cai na célula com o formato certo.
  for (var i = 0; i < esquema.colunas.length; i++) {
    var formato = RECC_FORMATO_DA_CELULA[esquema.colunas[i].tipo] || '@';
    aba.getRange(2, i + 1, esquema.reserva, 1).setNumberFormat(formato);
  }

  return esquema.aba;
}

// ============================================================================
// SEMENTE — padrão, nunca fixado. Tudo editável e excluível depois.
// ============================================================================

function semearDadosIniciais_(emailDoInstalador) {
  var contagem = { niveis: 0, cargos: 0, catalogo: 0, mesas: 0, campos: 0, config: 0 };

  // --- níveis de acesso -----------------------------------------------------
  // O nível é a unidade de permissão: telas, campos, widgets, ações e escopo
  // saem DAQUI. O cargo é só o rótulo organizacional.
  // Cada nível traz a SUA lista de ações. Dar a mesma lista a todo mundo que
  // não é administrador já deixou um nível chamado "Consulta" podendo criar
  // caso — o nome dizia uma coisa e a permissão fazia outra.
  var niveis = inserirVariosRegistros_('CATALOGO', [
    novoNivelDeAcesso_('Administrador', 1, 'TODOS',
      ['criar', 'editar', 'ocultar', 'exportar', 'configurar', 'estrutura'],
      ['dashboard', 'cadastrarCaso', 'minhaPerformance', 'buscarCaso',
       'tabelaCorretoras', 'painelAnalitico', 'configuracoes']),
    novoNivelDeAcesso_('Coordenação', 2, 'TODOS',
      ['criar', 'editar', 'ocultar', 'exportar'],
      ['dashboard', 'cadastrarCaso', 'minhaPerformance', 'buscarCaso',
       'tabelaCorretoras', 'painelAnalitico']),
    novoNivelDeAcesso_('Operação', 3, 'PROPRIOS',
      ['criar', 'editar', 'exportar'],
      ['dashboard', 'cadastrarCaso', 'minhaPerformance', 'buscarCaso',
       'tabelaCorretoras']),
    novoNivelDeAcesso_('Consulta', 4, 'TODOS',
      ['exportar'],
      ['dashboard', 'buscarCaso', 'painelAnalitico'])
  ]);
  contagem.niveis = niveis.length;
  var idAdministrador = niveis[0]['Id'];

  // --- cargos ---------------------------------------------------------------
  var cargos = inserirVariosRegistros_('CATALOGO', [
    novoItemDeCatalogo_('CARGO', '', 'Analista RET', 1),
    novoItemDeCatalogo_('CARGO', '', 'Analista Mesa Diamante', 2),
    novoItemDeCatalogo_('CARGO', '', 'ADM', 3),
    novoItemDeCatalogo_('CARGO', '', 'Coordenação', 4),
    novoItemDeCatalogo_('CARGO', '', 'Analista Sênior', 5)
  ]);
  contagem.cargos = cargos.length;
  var idCargoAdm = cargos[2]['Id'];

  // --- mesas ----------------------------------------------------------------
  var mesas = inserirVariosRegistros_('MESAS', [
    {
      Nome: 'RET Vida',
      Descricao: 'Relacionamento estratégico de clientes',
      Aba: 'BASE_RET',
      ColunaDaData: 'data de recepção do protocolo',
      ColunaDaHora: '',
      ColunaDoStatus: 'status',
      // Fila agrupada: cinco colunas na tela, e cada uma junta o que a
      // pessoa lê de uma vez só. Trinta e cinco colunas lado a lado não
      // cabem, e escolher seis perde o resto.
      ColunasDaFila: 'Situação: data de recepção do protocolo, status'
        + '; Dados da proposta: protocolo, número da proposta, Num_apolice, produto'
        + '; Dados cadastrais: nome do cliente, CPF, e-mail'
        + '; Motivo / assunto: motivo do cancelamento'
        + '; Responsável: analista',
      ColunasDaBusca: 'protocolo, CPF, Num_apolice, número da proposta, '
        + 'nome do cliente',
      MetaMensalPorPessoa: 0,
      ColunaDaFinalizacao: 'data da transmissão',
      ColunaDaAreaResponsavel: '',
      Icone: 'escudo',
      Ordem: 1,
      Ativo: true
    },
    {
      Nome: 'Mesa Diamante',
      Descricao: 'Atendimento a casos prioritários',
      Aba: 'BASE_MESA',
      ColunaDaData: 'Data de entrada',
      ColunaDaHora: 'Horário',
      ColunaDoStatus: 'Status',
      ColunasDaFila: 'Situação: Data de entrada, Status'
        + '; Dados do caso: Ramo, Assunto'
        + '; Dados cadastrais: Nome do segurado, Documento (CPF)'
        + '; Corretora: Corretora, SUSEP'
        + '; Responsável: Analista',
      ColunasDaBusca: 'Nome do segurado, Documento (CPF), SUSEP, Corretora',
      MetaMensalPorPessoa: 0,
      ColunaDaFinalizacao: 'Data da finalização',
      ColunaDaAreaResponsavel: 'Área responsável',
      Icone: 'diamante',
      Ordem: 2,
      Ativo: true
    }
  ]);
  contagem.mesas = mesas.length;
  var idRet = mesas[0]['Id'];
  var idMesa = mesas[1]['Id'];

  // --- catálogo por mesa ----------------------------------------------------
  var itens = [];
  // Cada situação com a sua cor. A cor não é enfeite: numa fila de trinta
  // linhas, ela é o que faz "não trabalhado" saltar aos olhos sem ninguém
  // precisar ler. As cores válidas estão em RECC_TONS.
  [['Aguardando transmissão', 'destaque'], ['Pendente', 'atencao'],
   ['1º contato realizado', 'violeta'], ['2º contato realizado', 'violeta'],
   ['Não trabalhado', 'ruim'], ['Concluído', 'bom']].forEach(function (par, i) {
    itens.push(novoItemDeCatalogo_('STATUS', idRet, par[0], i + 1, par[1]));
  });
  [['Transmissão pendente', 'destaque'], ['Pendente', 'atencao'],
   ['1º contato realizado', 'violeta'], ['2º contato realizado', 'violeta'],
   ['Não trabalhado', 'ruim'], ['Concluído', 'bom']].forEach(function (par, i) {
    itens.push(novoItemDeCatalogo_('STATUS', idMesa, par[0], i + 1, par[1]));
  });
  ['Diamante', 'Demais corretoras', 'Não encontrado'].forEach(function (nome, i) {
    itens.push(novoItemDeCatalogo_('SEGMENTO', '', nome, i + 1));
  });

  // Listas que o formulário oferece. Padrão, não fixado: o administrador
  // renomeia, reordena, desliga e cria quantas quiser em Configurações.
  var listasGlobais = {
    CANAL: ['E-mail', 'Chat', 'Telefone', 'Site', 'Corretora', 'Ouvidoria', 'URA'],
    TIPO: ['Reclamação', 'Dúvida', 'Solicitação', 'Elogio'],
    RAMO: ['Vida', 'Auto', 'Residencial', 'Prestamista'],
    AREA: ['Subscrição', 'Sinistro', 'Cobrança', 'Comercial', 'Jurídico'],
    MOTIVO: ['Aumento do prêmio na renovação', 'Dificuldade financeira',
      'Portabilidade', 'Proposta de concorrente', 'Insatisfação com atendimento',
      'Coberturas', 'Outros'],
    FORMA_PAGAMENTO: ['Boleto', 'Débito em conta', 'Cartão de crédito', 'PIX'],
    ORIGEM: ['Base de inadimplência', 'Central: Pessoa', 'URA', 'Site', 'Chat',
      'Telefone', 'Corretora']
  };
  Object.keys(listasGlobais).forEach(function (tipo) {
    listasGlobais[tipo].forEach(function (nome, i) {
      itens.push(novoItemDeCatalogo_(tipo, '', nome, i + 1));
    });
  });
  contagem.catalogo = inserirVariosRegistros_('CATALOGO', itens).length +
    contagem.niveis + contagem.cargos;

  // --- cartões do Dashboard -------------------------------------------------
  // Os cartões moram em PAINEIS, e não em MESAS: são uma LISTA de coisas
  // configuráveis, cada uma com nome, cor e ordem próprios. Guardá-los como
  // um texto separado por vírgula dentro da mesa dava conta de escolher
  // QUAIS, e de mais nada — não de renomear um, nem de trocar a cor.
  contagem.paineis = inserirVariosRegistros_('PAINEIS',
    cartoesIniciaisDoPainel_(idRet, idMesa)).length;

  // --- análises de partida --------------------------------------------------
  // Duas, uma por mesa, para a operação ver a ideia funcionando antes de
  // montar as dela. Nascem LIGADAS mas NÃO GERADAS: criar aba na instalação
  // custaria o dobro do tempo, e ninguém pediu a aba ainda.
  contagem.analises = inserirVariosRegistros_('ANALISES', [
    { Nome: 'RetVida', Descricao: 'Tudo da RET Vida dos últimos 90 dias',
      MesaId: idRet, Colunas: '', Filtros: '', Dias: 90, Ordem: 1, Ativo: true },
    { Nome: 'Diamante',
      Descricao: 'Casos da Mesa Diamante dos últimos 90 dias',
      MesaId: idMesa, Colunas: '', Filtros: '', Dias: 90, Ordem: 2, Ativo: true }
  ]).length;

  // --- campos do formulário -------------------------------------------------
  // Gerados a partir do contrato: é isto que faz CAMPOS ser o mapa
  // campo ↔ coluna, e não uma segunda verdade que diverge da planilha.
  var campos = []
    .concat(camposDoFormularioDaBase_('BASE_RET', idRet))
    .concat(camposDoFormularioDaBase_('BASE_MESA', idMesa));
  contagem.campos = inserirVariosRegistros_('CAMPOS', campos).length;

  // --- configuração ---------------------------------------------------------
  var config = inserirVariosRegistros_('CONFIG', [
    novaConfiguracao_('IDENTIDADE.NOME', 'RECC',
      'Nome exibido na barra superior. Editável.'),
    novaConfiguracao_('IDENTIDADE.NOME_LONGO',
      'Relacionamento Estratégico de Clientes e Corretores',
      'Subtítulo da barra superior.'),
    novaConfiguracao_('IDENTIDADE.OPERACAO', 'Porto Seguro',
      'Operação atendida por esta instalação.'),
    novaConfiguracao_('IDENTIDADE.LOGO_URL', '',
      'URL da logo exibida na tela de usuário não cadastrado.'),
    novaConfiguracao_('IDENTIDADE.COR_PRIMARIA', '#0B77CE',
      'Cor do tema Padrão.'),
    novaConfiguracao_('IDENTIDADE.FRASE',
      'Um espaço para cuidar de cada atendimento.',
      'A frase do painel da tela de quem não está cadastrado.'),
    novaConfiguracao_('IDENTIDADE.PLATAFORMA', 'PGO — Prisma Gestão Operacional',
      'A plataforma, exibida no rodapé do menu lateral.'),
    novaConfiguracao_('IDENTIDADE.FABRICANTE', 'by Pelitero labs',
      'Quem construiu, exibido no rodapé do menu lateral.'),
    novaConfiguracao_('LEGADO.PLANILHA_ID', '',
      'Id da planilha antiga, para a busca também olhar lá. Vazio desliga.'),
    novaConfiguracao_('LEGADO.ABA', '',
      'Nome da aba da planilha antiga. Vazio usa a primeira aba dela.'),
    novaConfiguracao_('LEGADO.ROTULO', 'Base legada',
      'Como a origem legada aparece nos resultados da busca.'),
    novaConfiguracao_('OPERACAO.JANELA_DIAS', '30',
      'Quantos dias a fila de trabalho carrega. Acima disso, use Buscar Caso.'),
    novaConfiguracao_('OPERACAO.LINHAS_DO_PAINEL', '5000',
      'Quantas linhas do fim da base os painéis leem antes de filtrar por '
      + 'data. Com muito volume, 5.000 podem não cobrir a janela de dias — as '
      + 'telas avisam quando isso acontece.'),
    novaConfiguracao_('OPERACAO.TEMA_PADRAO', 'padrao',
      'padrao | rosa | dark | brasil'),
    novaConfiguracao_('MENU.TITULOS', JSON.stringify({
      dashboard: 'Dashboard',
      cadastrarCaso: 'Cadastrar Caso',
      minhaPerformance: 'Minha Performance',
      buscarCaso: 'Buscar Caso',
      tabelaCorretoras: 'Tabela de Corretoras',
      painelAnalitico: 'Painel Analítico',
      configuracoes: 'Configurações'
    }), 'Nome de cada tela no menu lateral. Editável.')
  ]);
  contagem.config = config.length;

  // --- primeiro administrador ----------------------------------------------
  inserirVariosRegistros_('USUARIOS', [{
    Nome: emailDoInstalador.split('@')[0],
    Email: emailDoInstalador,
    'Canal que atende': '',
    CargoId: idCargoAdm,
    NivelAcessoId: idAdministrador,
    Matricula: '',
    Ativo: true,
    DataCadastro: new Date(),
    UltimoAcesso: ''
  }]);

  return contagem;
}

function novoNivelDeAcesso_(nome, ordem, escopo, acoes, telas) {
  return {
    MesaId: '',
    Tipo: 'NIVEL_ACESSO',
    Codigo: '',
    Nome: nome,
    Rotulo: nome,
    PaiId: '',
    Cor: '',
    Ordem: ordem,
    Ativo: true,
    Configuracao: JSON.stringify({
      escopo: escopo,
      telas: telas,
      acoes: acoes,
      campos: {},
      widgets: {}
    })
  };
}

/**
 * Os cartões que o Dashboard mostra quando o sistema nasce.
 *
 * A RET Vida mostra todas as situações; a Mesa Diamante mostra duas. Não é
 * capricho: a Mesa tem muito menos volume, e sete cartões de números pequenos
 * viram uma parede que ninguém lê. Tudo isso é editável em Configurações —
 * este é o ponto de partida, não a regra.
 */
function cartoesIniciaisDoPainel_(idRet, idMesa) {
  var cartoes = [];

  function novoCartao(mesaId, titulo, dimensao, filtro, cor, ordem) {
    return {
      Tela: 'dashboard',
      MesaId: mesaId,
      Titulo: titulo,
      TipoWidget: 'cartao',
      CampoDimensao: dimensao,
      CampoMedida: '',
      Agregacao: 'contagem',
      Limite: 0,
      Filtro: filtro,
      Ordem: ordem,
      Largura: 1,
      Cor: cor,
      VisivelPara: '',
      Ativo: true
    };
  }

  // A RET mostra o total e as cinco situações que ainda pedem trabalho.
  // "Concluído" existe como situação, mas NÃO ganha cartão: o Dashboard
  // responde "o que eu tenho que trabalhar hoje", e caso concluído não é
  // trabalho. Quem quiser o número acrescenta o cartão em Configurações.
  cartoes.push(novoCartao(idRet, 'Total de casos', 'total', '', 'destaque', 1));
  [['Aguardando transmissão', 'destaque'], ['Pendente', 'atencao'],
   ['1º contato realizado', 'violeta'], ['2º contato realizado', 'violeta'],
   ['Não trabalhado', 'ruim']].forEach(function (par, i) {
    cartoes.push(novoCartao(idRet, par[0], 'situacao', par[0], par[1], i + 2));
  });

  cartoes.push(novoCartao(idMesa, 'Total de casos', 'total', '', 'destaque', 1));
  cartoes.push(novoCartao(idMesa, 'Pendente', 'situacao', 'Pendente', 'atencao', 2));
  cartoes.push(novoCartao(idMesa, 'Concluído', 'situacao', 'Concluído', 'bom', 3));
  cartoes.push(novoCartao(idMesa, 'Finalizados na célula', 'naCelula', '', 'bom', 4));

  // ---- os gráficos do Painel Analítico ------------------------------------
  // Cada um responde a UMA pergunta. Gráfico que não responde pergunta
  // nenhuma é enfeite, e enfeite numa tela de trabalho é ruído.
  function novoGrafico(mesaId, titulo, tipo, dimensao, agregacao, medida,
    limite, largura, ordem) {
    return {
      Tela: 'painelAnalitico', MesaId: mesaId, Titulo: titulo,
      TipoWidget: tipo, CampoDimensao: dimensao, CampoMedida: medida || '',
      Agregacao: agregacao, Limite: limite || 0, Filtro: '',
      Ordem: ordem, Largura: largura, Cor: '', VisivelPara: '', Ativo: true
    };
  }

  // Barras COM LINHA: a linha é a média móvel da própria barra, na mesma
  // escala. Não são dois eixos — dois eixos fazem a mesma altura significar
  // duas coisas, e é o erro de gráfico mais comum que existe.
  cartoes.push(novoGrafico(idRet, 'Entradas por dia, e a tendência',
    'barrasComLinha', 'data de recepção do protocolo', 'contagem', '', 0, 2, 1));
  // Pizza é parte-do-todo, de relance, com poucas fatias. Para comparar
  // valores próximos ela é péssima — para isso existem as barras abaixo.
  cartoes.push(novoGrafico(idRet, 'Situação dos casos',
    'pizza', 'status', 'contagem', '', 6, 1, 2));
  // Nome comprido pede barra DEITADA: em pé, o rótulo vira uma escadinha
  // ilegível ou é cortado.
  cartoes.push(novoGrafico(idRet, 'Por que pediram o cancelamento',
    'barrasDeitadas', 'motivo do cancelamento', 'contagem', '', 6, 1, 3));
  cartoes.push(novoGrafico(idRet, 'Prêmio retido por produto',
    'barras', 'produto', 'soma', 'valor do prêmio retido', 6, 1, 4));
  cartoes.push(novoGrafico(idRet, 'Casos por canal de entrada',
    'barras', 'canal', 'contagem', '', 6, 1, 5));
  // Por analista: a mesma pergunta do "por área", uma camada abaixo. O
  // recorte por área já existe sem gráfico nenhum — é o seletor de mesa no
  // alto da tela, e cada mesa tem os gráficos dela. O que faltava era ver a
  // distribuição DENTRO da área, e é isto.
  cartoes.push(novoGrafico(idRet, 'Casos por analista',
    'barrasDeitadas', 'analista', 'contagem', '', 6, 1, 6));

  cartoes.push(novoGrafico(idMesa, 'Entradas por dia, e a tendência',
    'barrasComLinha', 'Data de entrada', 'contagem', '', 0, 2, 1));
  cartoes.push(novoGrafico(idMesa, 'Situação dos casos',
    'pizza', 'Status', 'contagem', '', 6, 1, 2));
  cartoes.push(novoGrafico(idMesa, 'Casos por corretora',
    'barrasDeitadas', 'Corretora', 'contagem', '', 6, 1, 3));
  cartoes.push(novoGrafico(idMesa, 'Casos por canal de entrada',
    'barras', 'Canal', 'contagem', '', 6, 1, 4));
  cartoes.push(novoGrafico(idMesa, 'Casos por analista',
    'barrasDeitadas', 'Analista', 'contagem', '', 6, 1, 5));

  return cartoes;
}

function novoItemDeCatalogo_(tipo, mesaId, nome, ordem, cor) {
  return {
    MesaId: mesaId,
    Tipo: tipo,
    Codigo: '',
    Nome: nome,
    Rotulo: nome,
    PaiId: '',
    Cor: cor || '',
    Ordem: ordem,
    Ativo: true,
    Configuracao: ''
  };
}

function novaConfiguracao_(chave, valor, descricao) {
  return {
    Chave: chave,
    Valor: valor,
    Descricao: descricao,
    AtualizadoPor: '',
    Data: new Date()
  };
}

/**
 * Como cada campo NASCE no formulário: em que seção, se é obrigatório, se é
 * uma lista, com que máscara e ocupando quantas colunas da grade.
 *
 * Isto é semente, não regra: tudo aqui é editável em Configurações depois. Só
 * existe para o cadastro já nascer utilizável, em vez de virar uma parede de
 * caixas de texto soltas que alguém teria de organizar à mão.
 *
 * A chave é a ChaveTecnica — o cabeçalho normalizado, sem acento nem espaço.
 */
const RECC_PADRAO_DO_FORMULARIO = {
  // ---------------------------------------------------------- Mesa Diamante
  analista: { tipoCampo: 'seletor', listaDe: 'usuarios', secao: 'Atendimento' },
  status: { tipoCampo: 'seletor', catalogo: 'STATUS', obrigatorio: true, secao: 'Situação' },
  canal: { tipoCampo: 'seletor', catalogo: 'CANAL', secao: 'Situação' },
  datadeentrada: { secao: 'Situação' },
  horario: { secao: 'Situação' },
  tipo: { tipoCampo: 'seletor', catalogo: 'TIPO', secao: 'Situação' },
  aberturaindevida: { secao: 'Situação' },
  titulodoemail: { secao: 'Atendimento', largura: 2 },
  nomedosegurado: { obrigatorio: true, secao: 'Cliente', largura: 2 },
  documentocpf: { tipoCampo: 'documento', mascara: '000.000.000-00', secao: 'Cliente' },
  corretora: { secao: 'Corretora' },
  susep: { secao: 'Corretora' },
  ramo: { tipoCampo: 'seletor', catalogo: 'RAMO', secao: 'Corretora' },
  assunto: { secao: 'Atendimento', largura: 2 },
  arearesponsavel: { tipoCampo: 'seletor', catalogo: 'AREA', secao: 'Encaminhamento' },
  dataresposta: { secao: 'Encaminhamento' },
  horaresposta: { secao: 'Encaminhamento' },
  datadafinalizacao: { secao: 'Encaminhamento' },
  horariodafinalizacao: { secao: 'Encaminhamento' },

  // -------------------------------------------------------------- RET Vida
  dataderecepcaodoprotocolo: { secao: 'Protocolo' },
  protocolo: { obrigatorio: true, secao: 'Protocolo' },
  segmento: { tipoCampo: 'seletor', catalogo: 'SEGMENTO', secao: 'Corretora' },
  nomedocliente: { obrigatorio: true, secao: 'Cliente', largura: 2 },
  cpf: { tipoCampo: 'documento', mascara: '000.000.000-00', secao: 'Cliente' },
  telefonesdecontato: { tipoCampo: 'telefone', secao: 'Cliente' },
  email: { tipoCampo: 'email', secao: 'Cliente' },
  produto: { secao: 'Proposta' },
  codproduto: { secao: 'Proposta' },
  numerodaproposta: { secao: 'Proposta' },
  codigoorigemdaproposta: { secao: 'Proposta' },
  numapolice: { secao: 'Proposta' },
  valordopremio: { secao: 'Valores' },
  valordopremioretido: { secao: 'Valores' },
  premiomensalretido: { secao: 'Valores' },
  formadepagamento: { tipoCampo: 'seletor', catalogo: 'FORMA_PAGAMENTO', secao: 'Valores' },
  motivodocancelamento: { tipoCampo: 'seletor', catalogo: 'MOTIVO', secao: 'Retenção' },
  tentativasdecontato: { secao: 'Retenção' },
  datadatransmissao: { secao: 'Retenção' },
  descricao: { secao: 'Retenção', largura: 3 }
};

/**
 * Um campo de formulário para cada coluna da base.
 *
 * As colunas de controle (_Visivel e companhia) ficam de fora: elas são do
 * sistema, não do formulário. A coluna Id entra desativada — precisa estar no
 * mapa, mas ninguém digita um Id.
 */
function camposDoFormularioDaBase_(nomeDaAba, mesaId) {
  var esquema = esquemaDaAba_(nomeDaAba);
  var campos = [];
  var ordem = 0;

  esquema.colunas.forEach(function (coluna) {
    if (coluna.cabecalho.charAt(0) === '_') return;

    var chave = normalizarParaComparar_(coluna.cabecalho);
    var ehId = (chave === 'id');
    var padrao = RECC_PADRAO_DO_FORMULARIO[chave] || {};
    ordem++;

    var configuracao = {};
    if (padrao.catalogo) configuracao.catalogo = padrao.catalogo;
    if (padrao.listaDe) configuracao.listaDe = padrao.listaDe;
    if (padrao.largura) configuracao.largura = padrao.largura;

    campos.push({
      MesaId: mesaId,
      Aba: nomeDaAba,
      ChaveTecnica: chave,
      Cabecalho: coluna.cabecalho,
      Rotulo: coluna.cabecalho,
      Descricao: '',
      TipoCampo: padrao.tipoCampo || RECC_DO_DADO_PARA_O_CAMPO[coluna.tipo] || 'texto',
      Secao: padrao.secao || 'Geral',
      Mascara: padrao.mascara || '',
      Obrigatorio: padrao.obrigatorio === true,
      Protegido: coluna.protegido === true,
      Ativo: !ehId,
      Ordem: ordem,
      VisivelPara: '',
      ValorPadrao: '',
      Configuracao: Object.keys(configuracao).length ? JSON.stringify(configuracao) : ''
    });
  });

  return campos;
}

// ============================================================================
// CONFERÊNCIA — para rodar no editor depois de publicar
// ============================================================================

/**
 * Confere o que foi copiado, contra o contrato. Só LÊ.
 *
 * É a conferência de DOIS SEGUNDOS, para rodar logo depois de copiar os
 * arquivos. Duas metades, e as duas importam:
 *
 *   as ABAS      contra o contrato do Esquema;
 *   os ARQUIVOS  de tela que o Index manda incluir.
 *
 * A segunda metade nasceu de um caso real: o `Formulario.html` ficou para trás
 * na cópia, e o sistema só disse "nenhum arquivo html com o nome Formulario
 * foi encontrado", com um número de linha. Nenhum teste rodado fora do Apps
 * Script pega isso — os testes leem a PASTA do repositório, onde o arquivo
 * está; quem não tem o arquivo é o PROJETO.
 *
 * Para a conferência completa — sequências, Ids, mesas, campos, permissões —
 * existe `diagnosticoRECC()`. As duas leem o mesmo `conferirEstrutura_`: não
 * há duas versões da regra, há uma curta e uma completa.
 */
function verificarEstruturaRECC() {
  var laudo = conferirEstrutura_();
  var faltamArquivos = arquivosDeTelaQueFaltam_();
  var tudoCerto = laudo.ok && !faltamArquivos.length;
  var linhas = [tudoCerto ? 'ESTRUTURA OK' : 'ESTRUTURA INCOMPLETA', ''];

  laudo.abas.forEach(function (item) {
    if (!item.existe) {
      linhas.push('FALTA A ABA  ' + item.aba);
      return;
    }
    var estado = item.faltando.length ? 'FALTA COLUNA' : 'ok          ';
    linhas.push(estado + ' ' + item.aba + '  (' + item.linhas + ' linhas)');
    if (item.faltando.length) {
      linhas.push('             faltando: ' + item.faltando.join(' | '));
    }
    if (item.aMais.length) {
      linhas.push('             fora do contrato (respeitadas): ' +
        item.aMais.join(' | '));
    }
  });

  linhas.push('');
  if (faltamArquivos.length) {
    linhas.push('FALTAM ' + faltamArquivos.length + ' ARQUIVO(S) DE TELA:');
    faltamArquivos.forEach(function (nome) {
      linhas.push('             ' + nome + '   (copie Front-End/' + nome
        + '.html, e nomeie aqui como "' + nome + '")');
    });
    linhas.push('             Sem eles a página não carrega.');
  } else {
    linhas.push('ok           os arquivos de tela do Index estão todos aqui');
  }

  var orcamento = orcamentoDeCelulas_(planilhaAtiva_());
  linhas.push('');
  linhas.push('Células: ' + orcamento.usadas.toLocaleString('pt-BR') + ' de ' +
    RECC_TETO_DE_CELULAS.toLocaleString('pt-BR') + ' (' + orcamento.percentual + '%)');
  linhas.push('');
  linhas.push('Para a conferência completa, rode diagnosticoRECC().');

  var texto = linhas.join('\n');
  Logger.log(texto);
  return texto;
}

/**
 * Quanto do teto de 10 milhões de células a planilha já ocupa.
 * Conta a GRADE, não o preenchimento: célula vazia também pesa.
 */
function orcamentoDeCelulas_(planilha) {
  var usadas = 0;
  planilha.getSheets().forEach(function (aba) {
    usadas += aba.getMaxRows() * aba.getMaxColumns();
  });
  return {
    usadas: usadas,
    percentual: Math.round((usadas / RECC_TETO_DE_CELULAS) * 1000) / 10
  };
}


/* ==== Painel.gs =========================================================== */

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

/**
 * Quantas linhas do FIM da aba os painéis leem antes de filtrar por data.
 *
 * A base só acrescenta no fim, então o recente está nas últimas linhas: ler o
 * fim e filtrar por data custa uma leitura só, em vez de percorrer tudo.
 *
 * O NÚMERO IMPORTA, E MUDA COM O VOLUME. Com 200 mil casos espalhados em um
 * ano, uma janela de 30 dias tem umas 15 mil linhas — e 5.000 mostrariam um
 * terço do período, calados. Por isso é configurável, e por isso toda tela que
 * usa esta janela devolve `truncada` quando bate no teto.
 *
 * Ler 50 mil linhas por 39 colunas são 1,95 milhão de células, cerca de dois
 * segundos: cabe. O que não cabe é ler a base inteira a cada abertura de tela.
 */
const RECC_LINHAS_DO_PAINEL_PADRAO = 5000;

function linhasQueOPainelOlha_() {
  var declarado = Number(valorDaConfiguracao_('OPERACAO.LINHAS_DO_PAINEL', ''));
  if (isFinite(declarado) && declarado > 0) return Math.floor(declarado);
  return RECC_LINHAS_DO_PAINEL_PADRAO;
}

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
  var recentes = lerRegistros_(mesa.aba, { ultimas: linhasQueOPainelOlha_() });
  var truncada = recentes.length >= linhasQueOPainelOlha_();

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


/* ==== Performance.gs ====================================================== */

/**
 * ============================================================================
 * PGO — Performance.gs · a tela em que o analista se vê
 * ============================================================================
 * As outras telas mostram a operação. Esta mostra UMA PESSOA — e por isso o
 * cuidado aqui é de outra natureza. Um número mal escolhido no Dashboard
 * atrapalha uma decisão; um número mal escolhido aqui atrapalha alguém.
 *
 * QUATRO DECISÕES, e cada uma tem motivo:
 *
 *   1. O RANKING SEGUE O ALCANCE DO NÍVEL. Quem só enxerga os próprios casos
 *      NÃO vê uma lista com o nome dos colegas — vê a própria posição contra
 *      a MÉDIA da equipe. Mostrar a lista a quem não pode ver os casos dos
 *      outros seria uma porta dos fundos, e ainda por cima a mais constrangedora.
 *
 *   2. TODO NÚMERO VEM COM A SUA BASE. "8 casos" sozinho não diz nada; "8 de
 *      uma média de 6" diz. Comparação sem referência é o jeito mais rápido
 *      de transformar um painel em ansiedade.
 *
 *   3. O QUE NÃO DÁ PARA CALCULAR NÃO APARECE. Tempo médio exige que a mesa
 *      declare a coluna de finalização. Sem ela, o indicador some — e não
 *      aparece zerado, que pareceria um desempenho ruim.
 *
 *   4. A META É DECLARADA, NUNCA INVENTADA. Mesa sem meta em `MESAS` não
 *      ganha barra de progresso. Um alvo tirado do nada é pior que alvo
 *      nenhum: ele parece oficial.
 * ============================================================================
 */

/** Quantas pessoas o ranking mostra em volta de quem está olhando. */
const RECC_VIZINHOS_NO_RANKING = 2;

/**
 * Os números de quem está olhando, na mesa e no período escolhidos.
 */
function minhaPerformance(idDaMesa, dias) {
  var quem = exigirTela_('minhaPerformance');
  var mesa = mesaPeloId_(idDaMesa);

  var janela = Number(dias) || Number(valorDaConfiguracao_('OPERACAO.JANELA_DIAS', '30')) || 30;
  var recentes = lerRegistros_(mesa.aba, { ultimas: linhasQueOPainelOlha_() });
  // Bateu no teto de leitura: pode haver caso do período que ficou de fora.
  // Aqui isto pesa mais que nas outras telas — esta é a tela sobre UMA PESSOA,
  // e número incompleto vira julgamento errado sobre alguém.
  var truncada = recentes.length >= linhasQueOPainelOlha_();
  var noPeriodo = filtrarPeloPeriodo_(recentes, mesa, janela, 0);
  var anterior = filtrarPeloPeriodo_(recentes, mesa, janela, janela);

  var coluna = colunaDoResponsavel_(estruturaDaAba_(mesa.aba));
  var meuNome = String(quem.usuario.Nome || '');

  var meus = casosDaPessoa_(noPeriodo, coluna, meuNome);
  var meusAntes = casosDaPessoa_(anterior, coluna, meuNome);

  return {
    mesa: { id: mesa.id, nome: mesa.nome, icone: mesa.icone },
    pessoa: {
      nome: meuNome,
      cargo: quem.cargo,
      nivel: quem.nivel,
      canal: String(quem.usuario['Canal que atende'] || '')
    },
    periodo: { dias: janela, rotulo: 'últimos ' + janela + ' dias' },
    truncada: truncada,
    linhasLidas: recentes.length,
    // Sem coluna de responsável não há "meus casos", e a tela diz isso em vez
    // de mostrar zero — zero pareceria que a pessoa não trabalhou.
    temResponsavel: !!coluna,
    indicadores: indicadoresDaPessoa_(meus, meusAntes, mesa),
    meta: metaDaPessoa_(meus, mesa, janela),
    porDia: serieDoPeriodo_(meus, mesa, janela),
    porSituacao: distribuicao_(meus, mesa, mesa.colunaDoStatus, 'Situação'),
    porCanal: distribuicao_(meus, mesa, colunaDoCanal_(mesa), 'Canal'),
    equipe: comoVaiAEquipe_(noPeriodo, coluna, meuNome, quem, mesa),
    recentes: oQueEuFiz_(quem, mesa)
  };
}

/** Os casos em que a pessoa é a responsável. */
function casosDaPessoa_(registros, coluna, nome) {
  if (!coluna) return [];
  var procurado = normalizarParaComparar_(nome);
  return registros.filter(function (registro) {
    return normalizarParaComparar_(registro[coluna]) === procurado;
  });
}

/** A coluna de canal da mesa, quando ela tem uma. */
function colunaDoCanal_(mesa) {
  var estrutura = estruturaDaAba_(mesa.aba);
  var achada = '';
  estrutura.cabecalhos.forEach(function (cabecalho) {
    if (achada) return;
    if (normalizarParaComparar_(cabecalho) === 'canal') achada = cabecalho;
  });
  return achada;
}

// ============================================================================
// OS INDICADORES
// ============================================================================

/**
 * Os números da pessoa, cada um com o do período anterior ao lado.
 *
 * Todo indicador carrega a comparação: "8 casos" sozinho não diz nada, "8
 * contra 6 no período anterior" diz. E o que não dá para calcular nesta mesa
 * simplesmente não entra na lista.
 */
function indicadoresDaPessoa_(meus, meusAntes, mesa) {
  var lista = [];

  lista.push(indicador_('trabalhados', 'Casos trabalhados',
    meus.length, meusAntes.length, 'casos',
    'Todos os casos em que você é a pessoa responsável no período.'));

  if (mesa.colunaDoStatus) {
    var concluidos = contarConcluidos_(meus, mesa);
    lista.push(indicador_('concluidos', 'Concluídos',
      concluidos, contarConcluidos_(meusAntes, mesa), 'casos',
      'Casos que chegaram a uma situação de conclusão.'));

    lista.push(indicador_('emAberto', 'Ainda em aberto',
      meus.length - concluidos, meusAntes.length - contarConcluidos_(meusAntes, mesa),
      'casos', 'O que continua esperando alguma tratativa sua.'));
  }

  var tempo = tempoMedioDeTratativa_(meus, mesa);
  if (tempo !== null) {
    lista.push(indicador_('tempoMedio', 'Tempo médio até concluir',
      tempo, tempoMedioDeTratativa_(meusAntes, mesa), 'dias',
      'Da entrada do caso até a finalização, nos que você concluiu.',
      // Aqui, MENOS é melhor: a tela precisa saber disso para não pintar de
      // vermelho uma queda que é boa notícia.
      true));
  }

  var naCelula = resolvidosSemEncaminhar_(meus, mesa);
  if (naCelula !== null) {
    lista.push(indicador_('naCelula', 'Resolvidos sem encaminhar',
      naCelula, resolvidosSemEncaminhar_(meusAntes, mesa), 'casos',
      'Concluídos por você, sem passar para outra área.'));
  }

  return lista;
}

function indicador_(chave, rotulo, valor, anterior, unidade, explicacao, menorEhMelhor) {
  var variacao = null;
  if (anterior > 0) {
    variacao = Math.round(((valor - anterior) / anterior) * 100);
  }
  return {
    chave: chave,
    rotulo: rotulo,
    valor: valor,
    anterior: anterior,
    // Sem base de comparação a variação fica VAZIA, e não "+100%": subir de
    // zero para um não é dobrar, e "+100%" ali é ruído que a operação aprende
    // a ignorar — junto com a variação que importa.
    variacao: variacao,
    unidade: unidade,
    explicacao: explicacao,
    menorEhMelhor: !!menorEhMelhor
  };
}

/** Uma situação conta como conclusão quando o nome dela começa com "conclu". */
function contarConcluidos_(casos, mesa) {
  if (!mesa.colunaDoStatus) return 0;
  return casos.filter(function (caso) {
    return normalizarParaComparar_(caso[mesa.colunaDoStatus]).indexOf('conclu') === 0;
  }).length;
}

/**
 * Quantos dias, em média, entre a entrada do caso e a finalização.
 *
 * Devolve null quando a mesa não declara a coluna de finalização, ou quando
 * ninguém concluiu nada no período: um "0 dias" ali pareceria um desempenho
 * excelente, e é só ausência de dado.
 */
function tempoMedioDeTratativa_(casos, mesa) {
  if (!mesa.colunaDaData || !mesa.colunaDaFinalizacao) return null;

  var soma = 0;
  var quantos = 0;
  casos.forEach(function (caso) {
    var entrada = converterParaData_(caso[mesa.colunaDaData]);
    var fim = converterParaData_(caso[mesa.colunaDaFinalizacao]);
    if (!entrada || !fim) return;
    var dias = (fim.getTime() - entrada.getTime()) / (1000 * 60 * 60 * 24);
    if (dias < 0) return;   // data invertida na planilha não vira média negativa
    soma += dias;
    quantos++;
  });

  if (!quantos) return null;
  return Math.round((soma / quantos) * 10) / 10;
}

/** Concluídos sem encaminhar para outra área. Null quando não dá para saber. */
function resolvidosSemEncaminhar_(casos, mesa) {
  return contarFinalizadosNaCelula_(casos, mesa);
}

// ============================================================================
// A META
// ============================================================================

/**
 * O progresso contra a meta da mesa, proporcional ao período escolhido.
 *
 * Devolve null quando a mesa não declarou meta. Alvo tirado do nada é pior
 * que alvo nenhum: ele parece oficial, e ninguém sabe de onde saiu.
 */
function metaDaPessoa_(meus, mesa, dias) {
  var mensal = Number(mesa.metaMensalPorPessoa) || 0;
  if (!mensal) return null;

  var alvo = Math.round((mensal / 30) * dias);
  var feito = contarConcluidos_(meus, mesa);

  return {
    alvo: alvo,
    feito: feito,
    // Passar da meta não vira 140% de barra: a barra enche e o número diz o
    // resto. Barra estourando a caixa é defeito, não conquista.
    percentual: alvo ? Math.min(Math.round((feito / alvo) * 100), 100) : 0,
    percentualReal: alvo ? Math.round((feito / alvo) * 100) : 0,
    mensal: mensal,
    rotulo: alvo + ' caso(s) em ' + dias + ' dias, na proporção da meta de '
      + mensal + ' por mês'
  };
}

// ============================================================================
// A EVOLUÇÃO E A DISTRIBUIÇÃO
// ============================================================================

/**
 * Quantos casos por dia, no formato que o desenho de gráfico já entende.
 *
 * Dia sem caso entra ZERADO, e não some: uma linha que pula os dias vazios
 * mente sobre o ritmo — dois casos em dois dias seguidos e dois casos com
 * uma semana de intervalo desenhariam a mesma linha.
 */
function serieDoPeriodo_(meus, mesa, dias) {
  if (!mesa.colunaDaData) return null;

  var porDia = {};
  meus.forEach(function (caso) {
    var data = converterParaData_(caso[mesa.colunaDaData]);
    if (!data) return;
    var chave = Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
    porDia[chave] = (porDia[chave] || 0) + 1;
  });

  var pontos = [];
  var hoje = new Date();
  // No máximo 45 colunas: acima disso a linha vira um borrão e cada ponto
  // fica menor que o dedo de quem tenta tocar nele.
  var quantos = Math.min(dias, 45);
  for (var i = quantos - 1; i >= 0; i--) {
    var dia = new Date(hoje.getTime() - i * 24 * 60 * 60 * 1000);
    var chave = Utilities.formatDate(dia, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
    pontos.push({
      chave: chave,
      rotulo: Utilities.formatDate(dia, RECC_FUSO_HORARIO, 'dd/MM'),
      valor: porDia[chave] || 0,
      casos: porDia[chave] || 0,
      tom: '',
      serie: 0
    });
  }

  return {
    titulo: 'Seus casos por dia',
    tipo: 'barrasComLinha',
    largura: 2,
    unidade: 'casos',
    agregacao: 'contagem',
    dimensao: 'Dia',
    ehTempo: true,
    pontos: pontos,
    tendencia: mediaMovel_(pontos, 7),
    aviso: ''
  };
}

/** Uma pizza dos casos da pessoa, por uma coluna qualquer. */
function distribuicao_(meus, mesa, coluna, titulo) {
  if (!coluna) return null;

  var cores = coresDoCatalogo_(mesa);
  var ordem = ordemEstavelDaDimensao_(mesa, coluna);
  var soma = {};
  var chaves = [];

  meus.forEach(function (caso) {
    var valor = String(caso[coluna] || '').trim() || 'Sem informação';
    if (!Object.prototype.hasOwnProperty.call(soma, valor)) {
      soma[valor] = 0;
      chaves.push(valor);
    }
    soma[valor]++;
  });

  var pontos = chaves.map(function (chave) {
    var normalizado = normalizarParaComparar_(chave);
    var posicao = ordem.indexOf(normalizado);
    return {
      chave: chave,
      rotulo: chave,
      valor: soma[chave],
      casos: soma[chave],
      // A mesma regra do Painel: a cor segue a entidade, e não a posição.
      tom: cores[normalizado] || '',
      serie: posicao >= 0 ? (posicao % 6) + 1 : 6
    };
  }).sort(function (um, outro) { return outro.valor - um.valor; });

  return {
    titulo: titulo, tipo: 'pizza', largura: 1, unidade: 'casos',
    agregacao: 'contagem', dimensao: titulo, ehTempo: false,
    pontos: pontos.slice(0, RECC_MAXIMO_DE_FATIAS), tendencia: null, aviso: ''
  };
}

// ============================================================================
// A EQUIPE
// ============================================================================

/**
 * Como a pessoa está em relação à equipe — e o que ela pode ver disso.
 *
 * Quem só enxerga os próprios casos NÃO recebe a lista com o nome dos
 * colegas: recebe a própria posição contra a média. Mostrar a lista a quem
 * não pode ver os casos dos outros seria uma porta dos fundos — e, ainda por
 * cima, a mais constrangedora que existe num sistema de trabalho.
 *
 * Quem pode ver recebe a lista, mas com a MÉDIA marcada: "abaixo da média"
 * sem saber qual é a média não é informação, é só desconforto.
 */
function comoVaiAEquipe_(noPeriodo, coluna, meuNome, quem, mesa) {
  if (!coluna) return { podeVerNomes: false, disponivel: false };

  var porPessoa = {};
  var nomes = [];
  noPeriodo.forEach(function (caso) {
    var nome = String(caso[coluna] || '').trim();
    if (!nome) return;
    if (!Object.prototype.hasOwnProperty.call(porPessoa, nome)) {
      porPessoa[nome] = 0;
      nomes.push(nome);
    }
    porPessoa[nome]++;
  });

  if (!nomes.length) return { podeVerNomes: false, disponivel: false };

  var lista = nomes.map(function (nome) {
    return { nome: nome, valor: porPessoa[nome],
      souEu: normalizarParaComparar_(nome) === normalizarParaComparar_(meuNome) };
  }).sort(function (um, outro) { return outro.valor - um.valor; });

  lista.forEach(function (um, i) { um.posicao = i + 1; });

  var soma = lista.reduce(function (total, um) { return total + um.valor; }, 0);
  var media = Math.round((soma / lista.length) * 10) / 10;
  var eu = lista.filter(function (um) { return um.souEu; })[0] || null;

  var podeVerNomes = quem.permissoes.escopo === RECC_ESCOPOS.TODOS
    || quem.permissoes.escopo === RECC_ESCOPOS.MESA
    || quem.permissoes.escopo === RECC_ESCOPOS.EQUIPE;

  return {
    disponivel: true,
    podeVerNomes: podeVerNomes,
    quantasPessoas: lista.length,
    media: media,
    minhaPosicao: eu ? eu.posicao : null,
    meuValor: eu ? eu.valor : 0,
    // A lista sai com os vizinhos de quem está olhando — e não do primeiro ao
    // último. Um pódio completo diz muito pouco a quem está no meio e diz
    // demais sobre quem está embaixo.
    lista: podeVerNomes ? vizinhosNoRanking_(lista, eu) : []
  };
}

function vizinhosNoRanking_(lista, eu) {
  if (!eu) return lista.slice(0, RECC_VIZINHOS_NO_RANKING * 2 + 1);

  var meu = eu.posicao - 1;
  var de = Math.max(0, meu - RECC_VIZINHOS_NO_RANKING);
  var ate = Math.min(lista.length, de + RECC_VIZINHOS_NO_RANKING * 2 + 1);
  de = Math.max(0, ate - (RECC_VIZINHOS_NO_RANKING * 2 + 1));
  return lista.slice(de, ate);
}

// ============================================================================
// O QUE EU FIZ
// ============================================================================

/**
 * As últimas ações da própria pessoa, tiradas da trilha de auditoria.
 *
 * Só as dela: a trilha completa é da tela de Configurações, para quem
 * administra. Aqui é a memória de quem está olhando.
 */
function oQueEuFiz_(quem, mesa) {
  var comoSeChama = {
    'caso.criar': 'Cadastrou um caso',
    'caso.editar': 'Alterou um caso',
    'caso.status': 'Mudou a situação',
    'caso.ocultar': 'Excluiu um caso',
    'busca': 'Procurou um caso'
  };

  var meuId = converterParaIdentificador_(quem.usuario.Id);

  return lerRegistros_('AUDITORIA', { ultimas: 400 })
    .filter(function (linha) {
      if (converterParaIdentificador_(linha.UsuarioId) !== meuId) return false;
      // Só o que é TRABALHO. Mexer numa configuração é ação de quem
      // administra, e a trilha completa dessas está em Configurações — aqui
      // é a memória de quem atende, e ela não pode virar um log de sistema.
      return Object.prototype.hasOwnProperty.call(comoSeChama, String(linha.Acao));
    })
    .reverse()
    .slice(0, 12)
    .map(function (linha) {
      return {
        acao: comoSeChama[String(linha.Acao)] || String(linha.Acao),
        detalhe: String(linha.Detalhe || ''),
        registro: String(linha.RegistroId || ''),
        entidade: String(linha.Entidade || ''),
        // O caso só abre quando é desta mesa: um Id da outra base abriria a
        // tela errada, ou nada.
        abre: normalizarParaComparar_(linha.Entidade)
          === normalizarParaComparar_(mesa.aba) && !!linha.RegistroId,
        quando: linha.DataHora
          ? Utilities.formatDate(new Date(linha.DataHora), RECC_FUSO_HORARIO,
            'dd/MM/yyyy, HH:mm')
          : ''
      };
    });
}


/* ==== Planilha.gs ========================================================= */

/**
 * ============================================================================
 * RECC — Planilha.gs · a porta única para o Google Planilhas
 * ============================================================================
 * NENHUM outro arquivo chama SpreadsheetApp. Toda leitura e toda gravação
 * passam por aqui — é o que garante, num lugar só, as duas regras que
 * sustentam a integridade do dado:
 *
 *   1. A coluna é encontrada pelo NOME do cabeçalho, nunca pela posição.
 *      Reordenar coluna na planilha não quebra o sistema.
 *
 *   2. A linha é FORMATADA antes de receber o valor.
 *      Identificador vai para célula de texto (@), dinheiro para célula de
 *      moeda, data para célula de data. Formatar depois não desfaz nada:
 *      quando o Sheets converteu 0000000010 em 10, o zero já se foi.
 *
 * Nenhum código de topo depende de outro arquivo: as referências a
 * RECC_ESQUEMA e a Sequencia.gs acontecem dentro de função.
 * ============================================================================
 */

/** A estrutura já lida de cada aba, válida só durante esta execução. */
var estruturasJaLidas = {};

/** O tipo das colunas que NÃO estão no contrato, declarado na aba CAMPOS. */
var tiposDeclaradosJaLidos = null;
var lendoTiposDeclarados = false;

function esquecerEstruturaLida_(nomeDaAba) {
  if (nomeDaAba) {
    delete estruturasJaLidas[nomeDaAba];
    if (nomeDaAba === 'CAMPOS') tiposDeclaradosJaLidos = null;
  } else {
    estruturasJaLidas = {};
    tiposDeclaradosJaLidos = null;
  }
}

/**
 * O tipo das colunas criadas pelo administrador.
 *
 * Coluna do contrato tem tipo no Esquema. Coluna criada depois tem o tipo
 * declarado em CAMPOS — sem isso, uma coluna de moeda criada na tela receberia
 * "R$ 2.500,00" como texto, e o Power BI não somaria nada.
 *
 * A trava de reentrância existe porque ler CAMPOS passa por estruturaDaAba_, que é
 * justamente quem pergunta pelos tipos.
 */
function tiposDeclaradosPeloAdministrador_() {
  if (tiposDeclaradosJaLidos) return tiposDeclaradosJaLidos;
  if (lendoTiposDeclarados) return {};

  lendoTiposDeclarados = true;
  try {
    var mapa = {};
    if (planilhaAtiva_().getSheetByName('CAMPOS')) {
      lerRegistros_('CAMPOS', { incluirOcultos: true }).forEach(function (campo) {
        var aba = String(campo.Aba || '').trim();
        var cabecalho = String(campo.Cabecalho || '').trim();
        if (!aba || !cabecalho) return;
        if (!mapa[aba]) mapa[aba] = {};
        mapa[aba][normalizarParaComparar_(cabecalho)] =
          RECC_DO_CAMPO_PARA_O_DADO[campo.TipoCampo] || RECC_TIPO_DE_DADO.TEXTO;
      });
    }
    tiposDeclaradosJaLidos = mapa;
    return mapa;
  } finally {
    lendoTiposDeclarados = false;
  }
}

// ============================================================================
// NORMALIZAÇÃO — como dois cabeçalhos são considerados o mesmo
// ============================================================================

/**
 * "Código origem da proposta" e "codigo origem da proposta" e
 * "CODIGO_ORIGEM_DA_PROPOSTA" viram a mesma chave.
 *
 * Tolerância deliberada: acento, caixa, espaço, sublinhado e pontuação não
 * distinguem colunas. O que distingue são as letras e os números.
 */
function normalizarParaComparar_(texto) {
  return String(texto === null || texto === undefined ? '' : texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Só os dígitos. É assim que identificador é comparado e gravado. */
function apenasDigitos_(texto) {
  return String(texto === null || texto === undefined ? '' : texto).replace(/\D/g, '');
}

// ============================================================================
// ESTRUTURA — ler a linha 1 e montar o mapa cabeçalho → coluna
// ============================================================================

function planilhaAtiva_() {
  // SpreadsheetApp é o serviço do Google que dá acesso à planilha.
  var planilha = SpreadsheetApp.getActive();
  if (!planilha) {
    throw new Error('Nenhuma planilha vinculada a este projeto do Apps Script.');
  }
  return planilha;
}

/**
 * A estrutura de uma aba: a folha, os cabeçalhos como estão escritos na
 * linha 1, o mapa normalizado e o tipo de cada coluna.
 *
 * Coluna que existe na planilha mas não está no contrato entra como TEXTO —
 * é o caso de uma coluna acrescentada à mão, que o sistema respeita em vez
 * de ignorar.
 */
function estruturaDaAba_(nomeDaAba, recarregar) {
  if (!recarregar && estruturasJaLidas[nomeDaAba]) return estruturasJaLidas[nomeDaAba];

  var aba = planilhaAtiva_().getSheetByName(nomeDaAba);
  if (!aba) {
    throw new Error('A aba "' + nomeDaAba + '" não existe nesta planilha. ' +
      'Rode instalarRECC() numa planilha vazia, ou confira o nome da aba.');
  }

  var largura = aba.getLastColumn();
  if (largura < 1) {
    throw new Error('A aba "' + nomeDaAba + '" está sem cabeçalho na linha 1.');
  }

  var cabecalhos = aba.getRange(1, 1, 1, largura).getValues()[0].map(function (v) {
    return String(v === null || v === undefined ? '' : v).trim();
  });

  var mapa = {};
  var repetidos = [];
  for (var i = 0; i < cabecalhos.length; i++) {
    if (!cabecalhos[i]) continue;
    var chave = normalizarParaComparar_(cabecalhos[i]);
    if (!chave) continue;
    if (mapa[chave] !== undefined) {
      repetidos.push(cabecalhos[i]);
      continue;
    }
    mapa[chave] = i;
  }
  if (repetidos.length) {
    throw new Error('A aba "' + nomeDaAba + '" tem cabeçalho repetido: ' +
      repetidos.join(', ') + '. Dois cabeçalhos iguais tornam a coluna ' +
      'ambígua — renomeie um deles antes de continuar.');
  }

  var tiposDoContrato = {};
  if (RECC_ESQUEMA[nomeDaAba]) {
    var esquema = esquemaDaAba_(nomeDaAba);
    for (var j = 0; j < esquema.colunas.length; j++) {
      tiposDoContrato[normalizarParaComparar_(esquema.colunas[j].cabecalho)] = esquema.colunas[j].tipo;
    }
  }

  // Ordem da decisão: o contrato manda; depois o que o administrador declarou
  // em CAMPOS; e só então texto, que é o padrão seguro.
  var declarados = tiposDeclaradosPeloAdministrador_()[nomeDaAba] || {};
  var tipos = cabecalhos.map(function (cab) {
    var chave = normalizarParaComparar_(cab);
    return tiposDoContrato[chave] || declarados[chave] || RECC_TIPO_DE_DADO.TEXTO;
  });

  var estrutura = {
    nomeDaAba: nomeDaAba,
    aba: aba,
    cabecalhos: cabecalhos,
    mapa: mapa,
    tipos: tipos
  };
  estruturasJaLidas[nomeDaAba] = estrutura;
  return estrutura;
}

/** O índice (base 0) de uma coluna, ou -1 quando ela não existe. */
function posicaoDaColuna_(estrutura, cabecalho) {
  var i = estrutura.mapa[normalizarParaComparar_(cabecalho)];
  return i === undefined ? -1 : i;
}

function exigirPosicaoDaColuna_(estrutura, cabecalho) {
  var i = posicaoDaColuna_(estrutura, cabecalho);
  if (i < 0) {
    throw new Error('A coluna "' + cabecalho + '" não existe na aba "' +
      estrutura.nomeDaAba + '". Colunas encontradas: ' + estrutura.cabecalhos.join(' | '));
  }
  return i;
}

// ============================================================================
// CONVERSÃO — o valor que chega vira o tipo que a célula espera
// ============================================================================

/**
 * Identificador: só dígitos, sempre texto.
 *
 * Lista de valores (o caso de "telefones de contato") preserva o ";" como
 * separador e limpa cada parte — senão dois telefones virariam um número só.
 */
function converterParaIdentificador_(valor) {
  var bruto = String(valor === null || valor === undefined ? '' : valor).trim();
  if (!bruto) return '';
  if (bruto.indexOf(';') >= 0 || bruto.indexOf('/') >= 0) {
    return bruto.split(/[;/]/)
      .map(function (parte) { return apenasDigitos_(parte); })
      .filter(function (parte) { return parte !== ''; })
      .join(';');
  }
  return apenasDigitos_(bruto);
}

/** Aceita 1234.56, "1234,56", "1.234,56" e "R$ 1.234,56". */
function converterParaNumero_(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (typeof valor === 'number') return isFinite(valor) ? valor : '';

  var texto = String(valor)
    .replace(/R\$/gi, '')
    .replace(/ /g, '')
    .replace(/\s/g, '')
    .trim();
  if (!texto) return '';

  var negativo = /^\(.*\)$/.test(texto) || texto.indexOf('-') === 0;
  texto = texto.replace(/[()\-]/g, '');

  if (texto.indexOf(',') >= 0) {
    // Formato brasileiro: ponto é milhar, vírgula é decimal.
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(texto)) {
    // 1.234.567 — só milhar, sem decimal.
    texto = texto.replace(/\./g, '');
  }

  var n = Number(texto);
  if (!isFinite(n)) return '';
  return negativo ? -n : n;
}

/** Aceita Date, "dd/MM/yyyy" e "yyyy-MM-dd". */
function converterParaData_(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return isNaN(valor.getTime()) ? '' : valor;
  }
  var texto = String(valor).trim();
  var br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  var iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return '';
}

/**
 * Hora do dia.
 *
 * A hora é carregada numa data de apoio, porque no Sheets a hora é a parte
 * fracionária de uma data. A data usada é 01/01/1970 de propósito: a época do
 * Sheets (30/12/1899) cai antes da padronização de fuso do Brasil — São Paulo
 * usava -03:06:28 —, e uma hora ancorada ali chega deslocada em minutos.
 */
function converterParaHora_(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return isNaN(valor.getTime()) ? '' : valor;
  }
  var m = String(valor).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return '';
  var h = Number(m[1]);
  var min = Number(m[2]);
  if (h > 23 || min > 59) return '';
  return new Date(1970, 0, 1, h, min, Number(m[3] || 0));
}

function converterParaDataEHora_(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return isNaN(valor.getTime()) ? '' : valor;
  }
  var d = new Date(String(valor));
  return isNaN(d.getTime()) ? '' : d;
}

function converterParaSimOuNao_(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (valor === true) return 'SIM';
  if (valor === false) return 'NAO';
  var t = normalizarParaComparar_(valor);
  if (t === 'sim' || t === 's' || t === 'true' || t === '1' || t === 'verdadeiro') return 'SIM';
  if (t === 'nao' || t === 'n' || t === 'false' || t === '0' || t === 'falso') return 'NAO';
  return '';
}

function converterParaOTipoDaColuna_(valor, tipo) {
  switch (tipo) {
    case RECC_TIPO_DE_DADO.IDENTIFICADOR:
      return converterParaIdentificador_(valor);
    case RECC_TIPO_DE_DADO.NUMERO:
    case RECC_TIPO_DE_DADO.DINHEIRO:
      return converterParaNumero_(valor);
    case RECC_TIPO_DE_DADO.DATA:
      return converterParaData_(valor);
    case RECC_TIPO_DE_DADO.HORA:
      return converterParaHora_(valor);
    case RECC_TIPO_DE_DADO.DATA_HORA:
      return converterParaDataEHora_(valor);
    case RECC_TIPO_DE_DADO.SIM_OU_NAO:
      return converterParaSimOuNao_(valor);
    case RECC_TIPO_DE_DADO.TEXTO:
    case RECC_TIPO_DE_DADO.TEXTO_LONGO:
      if (valor === null || valor === undefined) return '';
      if (Object.prototype.toString.call(valor) === '[object Date]') return valor;
      return String(valor);
    default:
      // Nada de cair em texto silenciosamente. Se um tipo novo for criado no
      // Esquema e esquecido aqui, um CPF viraria texto com pontuação e um
      // valor viraria texto em vez de número — e ninguém perceberia até o
      // Power BI não somar. Erro alto é melhor que dado errado calado.
      throw new Error('Tipo de coluna desconhecido: "' + tipo + '". ' +
        'Todo tipo declarado em RECC_TIPO_DE_DADO precisa ter um caso em ' +
        'converterParaOTipoDaColuna_.');
  }
}

/** O formato de cada célula da linha, na ordem das colunas da aba. */
function formatosDaLinha_(estrutura) {
  return estrutura.tipos.map(function (t) {
    return RECC_FORMATO_DA_CELULA[t] || '@';
  });
}

// ============================================================================
// LEITURA
// ============================================================================

/**
 * Abre uma planilha DE FORA, pelo Id.
 *
 * Mora aqui pela mesma razão que todo o resto: `SpreadsheetApp` é chamado num
 * lugar só. Antes disto, dois pontos da Busca abriam a planilha legada por
 * conta própria, cada um com o seu texto de erro — e o texto de erro é
 * justamente o que importa aqui, porque a causa é quase sempre a mesma e
 * quase nunca óbvia: a conta que roda o sistema não tem acesso à planilha.
 *
 * Nenhum contrato é aplicado ao que vem de fora. Ela é lida como está.
 */
function abrirPlanilhaDeFora_(idDaPlanilha) {
  var id = String(idDaPlanilha || '').trim();
  if (!id) throw new Error('Informe o Id da planilha.');
  try {
    return SpreadsheetApp.openById(id);
  } catch (erro) {
    throw new Error('Não consegui abrir a planilha: ' + (erro.message || erro)
      + ' Confira o Id — ele é o pedaço do endereço entre /d/ e /edit — e se '
      + 'esta conta tem acesso a ela.');
  }
}

/**
 * A última linha com CONTEÚDO na aba.
 *
 * getLastRow() olha conteúdo, não formatação — então a área de reserva que o
 * instalador pré-formata não infla esta conta.
 *
 * E é conteúdo de QUALQUER coluna, deliberadamente: usar a coluna de Id aqui
 * seria mais preciso e daria dois bugs. Uma linha digitada à mão nasce sem Id,
 * então ficaria invisível para o "Normalizar base" — que existe justamente
 * para carimbá-la —, e a próxima inserção do sistema gravaria POR CIMA dela.
 */
function ultimaLinhaComConteudo_(estrutura) {
  return Math.max(estrutura.aba.getLastRow(), 1);
}

/** Quantas linhas de dado a aba tem (sem contar o cabeçalho). */
function quantidadeDeRegistros_(estrutura) {
  return Math.max(ultimaLinhaComConteudo_(estrutura) - 1, 0);
}

/** Buraco no meio da aba não é registro. */
function linhaEstaVazia_(valores) {
  for (var i = 0; i < valores.length; i++) {
    var v = valores[i];
    if (v !== '' && v !== null && v !== undefined) return false;
  }
  return true;
}

/**
 * Uma linha da planilha vira objeto, com as chaves iguais aos cabeçalhos.
 *
 * Além dos cabeçalhos, todo registro carrega `__id` e `__linha`.
 *
 * O `__id` existe porque a coluna de identificador NÃO tem o mesmo nome em
 * toda aba: é `ID` na Mesa Diamante, `id` na RET Vida e `Id` nas abas de
 * sistema. Quem consome o registro não deveria precisar saber a grafia de
 * cada aba para achar o identificador — e quando precisava, lia `undefined`
 * em silêncio e seguia adiante com ele.
 */
function montarRegistro_(estrutura, valores, numeroDaLinha) {
  var reg = {};
  for (var i = 0; i < estrutura.cabecalhos.length; i++) {
    if (!estrutura.cabecalhos[i]) continue;
    reg[estrutura.cabecalhos[i]] = valores[i];
  }
  var iId = posicaoDaColuna_(estrutura, 'Id');
  reg.__id = iId >= 0 ? converterParaIdentificador_(valores[iId]) : '';
  reg.__linha = numeroDaLinha;
  return reg;
}

/**
 * Lê registros de uma aba.
 *
 *   opcoes.ultimas         lê só as N últimas linhas. A a base só acrescenta no fim, nunca reordena,
 *                          então o recente é sempre o fim — é o que permite
 *                          a fila de trabalho não ler 200 mil linhas para
 *                          mostrar 40.
 *   opcoes.incluirOcultos  traz também as linhas com _Visivel = NAO.
 */
function lerRegistros_(nomeDaAba, opcoes) {
  opcoes = opcoes || {};
  var estrutura = estruturaDaAba_(nomeDaAba);
  var totalDados = quantidadeDeRegistros_(estrutura);
  if (totalDados <= 0) return [];

  var primeira = 2;
  var quantas = totalDados;
  if (opcoes.ultimas > 0 && opcoes.ultimas < totalDados) {
    primeira = 2 + (totalDados - opcoes.ultimas);
    quantas = opcoes.ultimas;
  }

  var valores = estrutura.aba
    .getRange(primeira, 1, quantas, estrutura.cabecalhos.length)
    .getValues();

  var iVisivel = posicaoDaColuna_(estrutura, '_Visivel');
  var saida = [];
  for (var i = 0; i < valores.length; i++) {
    if (linhaEstaVazia_(valores[i])) continue;
    if (!opcoes.incluirOcultos && iVisivel >= 0) {
      if (normalizarParaComparar_(valores[i][iVisivel]) === 'nao') continue;
    }
    saida.push(montarRegistro_(estrutura, valores[i], primeira + i));
  }
  return saida;
}

/**
 * Lê UMA coluna inteira. É a primeira metade de toda busca: numa base de
 * 200 mil linhas por 39 colunas, ler tudo são 7,8 milhões de células; ler
 * uma coluna são 200 mil.
 */
function lerColunaInteira_(nomeDaAba, cabecalho) {
  var estrutura = estruturaDaAba_(nomeDaAba);
  var i = exigirPosicaoDaColuna_(estrutura, cabecalho);
  var totalDados = quantidadeDeRegistros_(estrutura);
  if (totalDados <= 0) return [];
  return estrutura.aba.getRange(2, i + 1, totalDados, 1).getValues().map(function (l) {
    return l[0];
  });
}

/** Lê só as linhas indicadas (números de linha da planilha). */
/**
 * Até quantas linhas sem interesse vale a pena ler para não pagar outra ida.
 *
 * A conta é direta: uma ida ao serviço de planilha custa uns 25 ms, e ler uma
 * linha a mais custa a transferência de umas 39 células — menos de um décimo
 * de milissegundo. Ler cinquenta linhas à toa sai muito mais barato do que
 * atravessar a fronteira de novo.
 */
var RECC_BURACO_QUE_VALE_PULAR = 50;

/**
 * Junta os números de linha em BLOCOS contínuos, tolerando buracos pequenos.
 *
 * [12, 13, 14, 900, 901] com tolerância 50 vira dois blocos: 12–14 e 900–901.
 * [12, 30, 40] vira um só: 12–40, porque ler as 27 linhas do meio é mais
 * barato que duas idas a mais.
 */
function blocosDeLinhas_(numerosDeLinha) {
  var ordenados = numerosDeLinha.slice().sort(function (um, outro) {
    return um - outro;
  });
  var blocos = [];
  for (var i = 0; i < ordenados.length; i++) {
    var ultimo = blocos.length ? blocos[blocos.length - 1] : null;
    if (ultimo && ordenados[i] - ultimo.fim <= RECC_BURACO_QUE_VALE_PULAR) {
      ultimo.fim = ordenados[i];
    } else {
      blocos.push({ inicio: ordenados[i], fim: ordenados[i] });
    }
  }
  return blocos;
}

/**
 * Lê linhas escolhidas, agrupadas em blocos.
 *
 * É a segunda metade da busca: a primeira leu só as colunas de procura e
 * anotou em QUAIS linhas o termo apareceu; esta lê essas linhas inteiras.
 *
 * Uma ida por linha era o que fazia antes, e com o limite de 100 resultados
 * isso eram cem idas ao serviço — dois segundos e meio de pedágio numa tela
 * que a operação usa o dia inteiro. Agrupando, uma busca de cem resultados
 * que caem perto costuma sair numa ida só.
 *
 * A ordem de saída é a ordem PEDIDA, e não a da planilha: quem chamou já
 * ordenou por relevância, e reordenar aqui desfaria isso em silêncio.
 */
function lerLinhasEspecificas_(nomeDaAba, numerosDeLinha) {
  if (!numerosDeLinha || !numerosDeLinha.length) return [];

  var estrutura = estruturaDaAba_(nomeDaAba);
  var largura = estrutura.cabecalhos.length;
  var porLinha = {};

  blocosDeLinhas_(numerosDeLinha).forEach(function (bloco) {
    var quantas = bloco.fim - bloco.inicio + 1;
    var valores = estrutura.aba
      .getRange(bloco.inicio, 1, quantas, largura).getValues();
    for (var i = 0; i < valores.length; i++) {
      porLinha[bloco.inicio + i] = valores[i];
    }
  });

  var saida = [];
  for (var j = 0; j < numerosDeLinha.length; j++) {
    var n = numerosDeLinha[j];
    if (porLinha[n]) saida.push(montarRegistro_(estrutura, porLinha[n], n));
  }
  return saida;
}

/**
 * Busca por valor numa coluna e devolve as linhas inteiras.
 * Identificador é comparado só pelos dígitos, então "1-2345678901" e
 * "12345678901" acham a mesma linha.
 */
function buscarRegistros_(nomeDaAba, cabecalho, valor, limite) {
  var estrutura = estruturaDaAba_(nomeDaAba);
  var i = exigirPosicaoDaColuna_(estrutura, cabecalho);
  var tipo = estrutura.tipos[i];
  var ehIdentificador = (tipo === RECC_TIPO_DE_DADO.IDENTIFICADOR);

  var alvo = ehIdentificador
    ? converterParaIdentificador_(valor)
    : normalizarParaComparar_(valor);
  if (alvo === '') return [];

  var coluna = lerColunaInteira_(nomeDaAba, cabecalho);
  var linhas = [];
  for (var k = 0; k < coluna.length; k++) {
    var atual = ehIdentificador
      ? converterParaIdentificador_(coluna[k])
      : normalizarParaComparar_(coluna[k]);
    if (atual === alvo) {
      linhas.push(k + 2);
      if (limite && linhas.length >= limite) break;
    }
  }
  return lerLinhasEspecificas_(nomeDaAba, linhas);
}

/** Encontra a linha de um Id. Id repetido é erro, nunca "usa a primeira". */
function linhaDoRegistro_(estrutura, id) {
  var iId = exigirPosicaoDaColuna_(estrutura, 'Id');
  var totalDados = quantidadeDeRegistros_(estrutura);
  if (totalDados <= 0) return -1;

  var alvo = converterParaIdentificador_(id);
  var coluna = estrutura.aba.getRange(2, iId + 1, totalDados, 1).getValues();
  var achadas = [];
  for (var i = 0; i < coluna.length; i++) {
    if (converterParaIdentificador_(coluna[i][0]) === alvo) achadas.push(i + 2);
  }
  if (achadas.length > 1) {
    throw new Error('O Id ' + alvo + ' aparece em ' + achadas.length +
      ' linhas da aba "' + estrutura.nomeDaAba + '" (linhas ' + achadas.join(', ') +
      '). Gravar assim sobrescreveria o registro errado. ' +
      'Rode "Normalizar base" antes de continuar.');
  }
  return achadas.length ? achadas[0] : -1;
}

// ============================================================================
// GRAVAÇÃO — sempre em bloco, sempre com o formato aplicado antes
// ============================================================================

/**
 * Monta a linha inteira já coagida, na ordem real das colunas da aba.
 * `dados` pode vir com as chaves escritas de qualquer jeito: a busca é
 * normalizada.
 */
function montarLinhaParaGravar_(estrutura, dados, valoresAtuais) {
  var porChave = {};
  var nomeInformado = {};
  Object.keys(dados).forEach(function (chaveInformada) {
    // As chaves internas (__id, __linha) descrevem o registro, não são dele.
    if (chaveInformada.indexOf('__') === 0) return;
    var chave = normalizarParaComparar_(chaveInformada);
    porChave[chave] = dados[chaveInformada];
    nomeInformado[chave] = chaveInformada;
  });

  var usadas = {};
  var linha = [];
  for (var i = 0; i < estrutura.cabecalhos.length; i++) {
    var chave = normalizarParaComparar_(estrutura.cabecalhos[i]);
    if (!estrutura.cabecalhos[i]) {
      linha.push(valoresAtuais ? valoresAtuais[i] : '');
    } else if (Object.prototype.hasOwnProperty.call(porChave, chave)) {
      usadas[chave] = true;
      linha.push(converterParaOTipoDaColuna_(porChave[chave], estrutura.tipos[i]));
    } else {
      linha.push(valoresAtuais ? valoresAtuais[i] : '');
    }
  }

  // Campo que não corresponde a nenhuma coluna vira ERRO, e não descarte.
  // Descartar em silêncio é perda de dado calada: um "Protocolo" digitado
  // "Protocolos" seria jogado fora e a tela ainda diria "salvo".
  var semColuna = Object.keys(porChave)
    .filter(function (chave) { return !usadas[chave]; })
    .map(function (chave) { return nomeInformado[chave]; });
  if (semColuna.length) {
    throw new Error('A aba "' + estrutura.nomeDaAba + '" não tem coluna para: ' +
      semColuna.join(', ') + '. Colunas existentes: ' +
      estrutura.cabecalhos.filter(String).join(' | '));
  }

  return linha;
}

/** Formata a faixa e só então grava. A ordem é a regra inteira. */
function formatarEGravar_(estrutura, primeiraLinha, linhas) {
  var faixa = estrutura.aba.getRange(
    primeiraLinha, 1, linhas.length, estrutura.cabecalhos.length);
  var formatoDaLinha = formatosDaLinha_(estrutura);
  var formatos = linhas.map(function () { return formatoDaLinha; });
  faixa.setNumberFormats(formatos);
  faixa.setValues(linhas);
}

/**
 * Insere um registro. Gera o Id se ele não vier pronto, marca a linha como
 * visível e registra que ela nasceu no sistema.
 */
function inserirRegistro_(nomeDaAba, dados, contexto) {
  return inserirVariosRegistros_(nomeDaAba, [dados], contexto)[0];
}

/** Insere vários registros numa gravação só. */
function inserirVariosRegistros_(nomeDaAba, lista, contexto) {
  if (!lista || !lista.length) return [];
  contexto = contexto || {};

  var trava = LockService.getScriptLock();
  if (!trava.tryLock(25000)) {
    throw new Error('A planilha está ocupada com outra gravação. Tente de novo.');
  }
  try {
    esquecerEstruturaLida_(nomeDaAba);
    var estrutura = estruturaDaAba_(nomeDaAba, true);
    var temControle = posicaoDaColuna_(estrutura, '_Visivel') >= 0;
    var iId = posicaoDaColuna_(estrutura, 'Id');

    // Quantas linhas precisam de Id novo — algumas já vêm com um. O bloco é
    // reservado numa ida só ao PropertiesService, e não uma por linha: com uma
    // por linha, gravar cinco mil casos eram dez mil idas e dois minutos de
    // pedágio dentro de uma execução que tem seis.
    var precisamDeId = 0;
    if (iId >= 0) {
      for (var p = 0; p < lista.length; p++) {
        if (!converterParaIdentificador_(lista[p][estrutura.cabecalhos[iId]])) {
          precisamDeId++;
        }
      }
    }
    var idsReservados = proximosIdentificadores_(nomeDaAba, precisamDeId);
    var proximoDoBloco = 0;

    var linhas = [];
    var gravados = [];
    for (var i = 0; i < lista.length; i++) {
      var dados = {};
      Object.keys(lista[i]).forEach(function (k) { dados[k] = lista[i][k]; });

      if (iId >= 0) {
        var idInformado = converterParaIdentificador_(dados[estrutura.cabecalhos[iId]]);
        if (!idInformado) {
          dados[estrutura.cabecalhos[iId]] = idsReservados[proximoDoBloco];
          proximoDoBloco++;
        }
      }
      if (temControle) {
        if (dados._Visivel === undefined) dados._Visivel = RECC_VISIVEL_SIM;
        if (dados._Origem === undefined) {
          dados._Origem = contexto.origem || RECC_ORIGEM_SISTEMA;
        }
      }
      linhas.push(montarLinhaParaGravar_(estrutura, dados, null));
      gravados.push(dados);
    }

    var primeira = ultimaLinhaComConteudo_(estrutura) + 1;
    if (primeira < 2) primeira = 2;
    garantirLinhasNaGrade_(estrutura.aba, primeira + linhas.length - 1);
    formatarEGravar_(estrutura, primeira, linhas);

    for (var j = 0; j < gravados.length; j++) {
      gravados[j].__linha = primeira + j;
      gravados[j].__id = iId >= 0
        ? converterParaIdentificador_(gravados[j][estrutura.cabecalhos[iId]])
        : '';
    }
    return gravados;
  } finally {
    trava.releaseLock();
  }
}

/**
 * Atualiza um registro pelo Id.
 * Lê a linha, mescla as alterações e regrava a linha inteira já formatada —
 * assim uma coluna nunca fica com o formato de outro tipo.
 */
function atualizarRegistro_(nomeDaAba, id, alteracoes) {
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(25000)) {
    throw new Error('A planilha está ocupada com outra gravação. Tente de novo.');
  }
  try {
    esquecerEstruturaLida_(nomeDaAba);
    var estrutura = estruturaDaAba_(nomeDaAba, true);
    var linha = linhaDoRegistro_(estrutura, id);
    if (linha < 0) {
      throw new Error('Registro ' + converterParaIdentificador_(id) + ' não encontrado na aba "' +
        nomeDaAba + '".');
    }
    var atuais = estrutura.aba.getRange(linha, 1, 1, estrutura.cabecalhos.length).getValues()[0];
    var nova = montarLinhaParaGravar_(estrutura, alteracoes, atuais);
    formatarEGravar_(estrutura, linha, [nova]);
    return montarRegistro_(estrutura, nova, linha);
  } finally {
    trava.releaseLock();
  }
}

/**
 * Exclusão do RECC: some da tela, permanece na planilha.
 * Nenhuma linha de base operacional é apagada — nunca.
 */
function ocultarRegistro_(nomeDaAba, id, usuarioId) {
  if (posicaoDaColuna_(estruturaDaAba_(nomeDaAba), '_Visivel') < 0) {
    throw new Error('A aba "' + nomeDaAba + '" não tem exclusão lógica — ela ' +
      'não possui a coluna _Visivel. Em abas de catálogo, o que desliga um ' +
      'item é a coluna Ativo.');
  }
  return atualizarRegistro_(nomeDaAba, id, {
    _Visivel: RECC_VISIVEL_NAO,
    _ExcluidoEm: new Date(),
    _ExcluidoPor: usuarioId || ''
  });
}

function reexibirRegistro_(nomeDaAba, id) {
  return atualizarRegistro_(nomeDaAba, id, {
    _Visivel: RECC_VISIVEL_SIM,
    _ExcluidoEm: '',
    _ExcluidoPor: ''
  });
}

// ============================================================================
// ESTRUTURA — crescer a aba de propósito, nunca por acidente
// ============================================================================

/** A aba precisa ter linha suficiente na grade para receber a gravação. */
function garantirLinhasNaGrade_(aba, ateLinha) {
  var faltam = ateLinha - aba.getMaxRows();
  if (faltam > 0) aba.insertRowsAfter(aba.getMaxRows(), faltam);
}

/**
 * Acrescenta uma coluna ao FIM da aba.
 *
 * Só é chamada por ação explícita do administrador — jamais durante um
 * salvamento comum. Recusa cabeçalho que já exista, mesmo escrito diferente.
 */
function adicionarColuna_(nomeDaAba, cabecalho, tipo) {
  var texto = String(cabecalho || '').trim();
  if (!texto) throw new Error('Cabeçalho vazio.');
  if (!RECC_FORMATO_DA_CELULA[tipo]) throw new Error('Tipo de coluna desconhecido: ' + tipo);

  var nova;
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(25000)) {
    throw new Error('A planilha está ocupada. Tente de novo.');
  }
  try {
    esquecerEstruturaLida_(nomeDaAba);
    var estrutura = estruturaDaAba_(nomeDaAba, true);
    if (posicaoDaColuna_(estrutura, texto) >= 0) {
      throw new Error('A aba "' + nomeDaAba + '" já tem uma coluna equivalente a "' +
        texto + '".');
    }

    var aba = estrutura.aba;
    nova = estrutura.cabecalhos.length + 1;
    if (aba.getMaxColumns() < nova) {
      aba.insertColumnsAfter(aba.getMaxColumns(), nova - aba.getMaxColumns());
    }
    aba.getRange(1, nova).setNumberFormat('@');
    aba.getRange(1, nova).setValue(texto).setFontWeight('bold');
    var altura = Math.max(aba.getMaxRows() - 1, 1);
    aba.getRange(2, nova, altura, 1).setNumberFormat(RECC_FORMATO_DA_CELULA[tipo]);
    esquecerEstruturaLida_(nomeDaAba);
  } finally {
    trava.releaseLock();
  }

  // Fora da trava, de propósito: inserirVariosRegistros_ pega a dela, e trava dentro
  // de trava é como um deadlock nasce.
  registrarColunaEmCampos_(nomeDaAba, texto, tipo, nova);
  esquecerEstruturaLida_();

  return { aba: nomeDaAba, cabecalho: texto, tipo: tipo, coluna: nova };
}

/**
 * Registra a coluna nova em CAMPOS.
 *
 * Não é burocracia: é onde o tipo da coluna passa a morar. Sem esta linha, na
 * próxima execução a coluna voltaria a ser lida como texto — e uma coluna de
 * moeda guardaria "R$ 2.500,00" em vez de 2500.
 */
function registrarColunaEmCampos_(nomeDaAba, cabecalho, tipo, ordem) {
  if (!planilhaAtiva_().getSheetByName('CAMPOS')) return null;

  var mesaId = '';
  if (planilhaAtiva_().getSheetByName('MESAS')) {
    var mesa = lerRegistros_('MESAS').filter(function (m) {
      return normalizarParaComparar_(m.Aba) === normalizarParaComparar_(nomeDaAba);
    })[0];
    if (mesa) mesaId = mesa.Id;
  }

  return inserirRegistro_('CAMPOS', {
    MesaId: mesaId,
    Aba: nomeDaAba,
    ChaveTecnica: normalizarParaComparar_(cabecalho),
    Cabecalho: cabecalho,
    Rotulo: cabecalho,
    Descricao: '',
    TipoCampo: RECC_DO_DADO_PARA_O_CAMPO[tipo] || 'texto',
    Secao: 'Geral',
    Mascara: '',
    Obrigatorio: false,
    Protegido: false,
    Ativo: true,
    Ordem: ordem,
    VisivelPara: '',
    ValorPadrao: '',
    Configuracao: ''
  });
}

// ============================================================================
// CONFERÊNCIA — o sistema valida, nunca conserta sozinho
// ============================================================================

/**
 * Compara o que o contrato espera com o que a planilha tem.
 * Não cria, não renomeia, não apaga e não reordena nada: devolve o laudo
 * para a tela de reconciliação decidir com o administrador.
 */
function conferirEstrutura_() {
  var planilha = planilhaAtiva_();
  var laudo = { ok: true, abas: [] };

  nomesDasAbasDoContrato_().forEach(function (nomeDaAba) {
    var esquema = esquemaDaAba_(nomeDaAba);
    var item = {
      aba: nomeDaAba,
      existe: false,
      faltando: [],
      aMais: [],
      linhas: 0
    };

    var aba = planilha.getSheetByName(nomeDaAba);
    if (!aba) {
      laudo.ok = false;
      laudo.abas.push(item);
      return;
    }
    item.existe = true;
    var estrutura = estruturaDaAba_(nomeDaAba, true);
    item.linhas = quantidadeDeRegistros_(estrutura);
    var presentes = {};
    estrutura.cabecalhos.forEach(function (c) {
      if (c) presentes[normalizarParaComparar_(c)] = c;
    });

    var esperados = {};
    esquema.colunas.forEach(function (coluna) {
      esperados[normalizarParaComparar_(coluna.cabecalho)] = coluna.cabecalho;
      if (presentes[normalizarParaComparar_(coluna.cabecalho)] === undefined) item.faltando.push(coluna.cabecalho);
    });

    Object.keys(presentes).forEach(function (chave) {
      if (esperados[chave] === undefined) item.aMais.push(presentes[chave]);
    });

    if (item.faltando.length) laudo.ok = false;
    laudo.abas.push(item);
  });

  return laudo;
}


/* ==== Principal.gs ======================================================== */

/**
 * ============================================================================
 * RECC — Principal.gs · a porta de entrada
 * ============================================================================
 * doGet é a função que o Google chama quando alguém abre o endereço do
 * sistema. Ela decide entre duas coisas, e só duas:
 *
 *   e-mail cadastrado     → serve o sistema
 *   e-mail não cadastrado → serve a tela institucional, sem carregar dado
 *                           nenhum da planilha
 *
 * Aqui também mora o PACOTE DE PARTIDA: tudo que a tela precisa para se
 * montar chega numa ÚNICA ida ao servidor. Sete chamadas separadas custariam
 * sete viagens de rede e a tela piscaria montando aos pedaços.
 * ============================================================================
 */

/** Chamada pelo Google quando alguém abre o endereço do sistema. */
function doGet() {
  var quem = usuarioAtual_();
  var identidade = lerIdentidadeVisual_();

  if (!quem.cadastrado) {
    var bloqueio = HtmlService.createTemplateFromFile('SemAcesso');
    bloqueio.email = quem.email;
    bloqueio.motivo = quem.motivo;
    // O código da recusa, e não só a frase: o título da tela muda conforme o
    // caso, e comparar texto para decidir isso quebraria no dia em que
    // alguém corrigir uma vírgula na frase.
    bloqueio.situacao = quem.situacao || 'NAO_CADASTRADO';
    bloqueio.identidade = identidade;
    return bloqueio.evaluate()
      .setTitle(identidade.nome + ' — acesso não liberado')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  registrarUltimoAcesso_(quem.usuario);

  // A identidade PRECISA ser entregue ao template: o Index a usa no título e
  // na marca de abertura. Sem isso a página nem chega a ser montada.
  var pagina = HtmlService.createTemplateFromFile('Index');
  pagina.identidade = identidade;
  return pagina.evaluate()
    .setTitle(identidade.nome)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Cola um arquivo .html dentro de outro.
 * É assim que o Apps Script faz "incluir": não existe import de HTML.
 *
 * QUANDO O ARQUIVO NÃO ESTÁ NO PROJETO, o Apps Script diz apenas
 * "nenhum arquivo html com o nome X foi encontrado", com o número da linha —
 * e mais nada. Quem recebe isso não sabe se o nome está errado, se o arquivo
 * ficou para trás na cópia, ou se é defeito do sistema.
 *
 * Então trocamos a mensagem por uma que diz as três coisas que resolvem: o
 * nome EXATO que o projeto espera, a regra de nomenclatura (sem .html, sem
 * acento) e — o que mais poupa tempo — TODOS os arquivos que faltam, e não só
 * o primeiro. Sem isso a pessoa copia um, recarrega, descobre o próximo, e
 * repete quinze vezes.
 */
function incluir_(nomeDoArquivo) {
  try {
    return HtmlService.createHtmlOutputFromFile(nomeDoArquivo).getContent();
  } catch (erro) {
    throw new Error(recadoDoArquivoQueFalta_(nomeDoArquivo));
  }
}

function recadoDoArquivoQueFalta_(nomeDoArquivo) {
  var recado = 'Falta o arquivo HTML "' + nomeDoArquivo + '" no projeto do '
    + 'Apps Script.\n\n'
    + 'Copie Front-End/' + nomeDoArquivo + '.html do repositório e crie aqui '
    + 'um arquivo HTML chamado exatamente "' + nomeDoArquivo + '" — sem '
    + '".html" no nome, sem acento e com as maiúsculas iguais. O Apps Script '
    + 'diferencia maiúsculas de minúsculas.';

  // A lista completa é o que evita descobrir um arquivo por vez. Vai num try
  // próprio: se o Diagnostico.gs também tiver ficado para trás na cópia, o
  // recado principal continua saindo em vez de virar um segundo erro.
  try {
    var faltando = arquivosDeTelaQueFaltam_();
    if (faltando.length > 1) {
      recado += '\n\nNo total faltam ' + faltando.length + ' arquivos: '
        + faltando.join(', ') + '. Copie todos de uma vez.';
    }
  } catch (erro) {
    recado += '\n\n(Não consegui listar os outros que faltam — confira se '
      + 'Diagnostico.gs está no projeto.)';
  }
  return recado;
}

/** Atalho para os templates escreverem <?!= incluir('Estilos') ?> */
function incluir(nomeDoArquivo) {
  return incluir_(nomeDoArquivo);
}

// ============================================================================
// O PACOTE DE PARTIDA
// ============================================================================

/**
 * Tudo que a tela precisa para se montar, numa chamada só.
 *
 * Quando algo dá errado aqui, a resposta diz O QUE deu errado. Devolver uma
 * lista de permissões vazia seria pior do que devolver erro: o menu apareceria
 * vazio e todo mundo leria isso como "não tenho acesso", quando o problema é
 * outro. Já aconteceu no sistema anterior e custou uma tarde.
 */
function pacoteDePartida() {
  var quem = usuarioAtual_();

  if (!quem.cadastrado) {
    return {
      disponivel: false,
      cadastrado: false,
      motivo: quem.motivo,
      email: quem.email,
      identidade: lerIdentidadeVisual_()
    };
  }
  if (quem.permissoes.defeito) {
    return {
      disponivel: false,
      cadastrado: true,
      motivo: quem.permissoes.defeito,
      email: quem.email,
      identidade: lerIdentidadeVisual_()
    };
  }

  return {
    disponivel: true,
    cadastrado: true,
    identidade: lerIdentidadeVisual_(),
    usuario: {
      id: quem.usuario.Id,
      nome: quem.usuario.Nome,
      email: quem.email,
      cargo: quem.cargo,
      nivelAcesso: quem.nivel,
      canalQueAtende: quem.usuario['Canal que atende']
    },
    permissoes: {
      telas: quem.permissoes.telas,
      acoes: quem.permissoes.acoes,
      escopo: quem.permissoes.escopo
    },
    menu: montarMenu_(quem.permissoes),
    mesas: mesasVisiveis_(),
    ultimoRegistro: dataDoUltimoRegistro_(),
    tema: temaDoUsuario_(),
    senhaDeAdministradorDefinida: existeSenhaDeAdministrador_()
  };
}

// ============================================================================
// TEMA
// ============================================================================

const RECC_TEMAS = ['padrao', 'rosa', 'dark', 'brasil'];
const RECC_CHAVE_DO_TEMA = 'RECC_TEMA_ESCOLHIDO';

/**
 * O tema escolhido pela pessoa, ou o padrão da operação.
 *
 * Fica em UserProperties, e não no navegador: assim a escolha acompanha a
 * pessoa em qualquer computador que ela abrir o sistema.
 */
function temaDoUsuario_() {
  var escolhido = PropertiesService.getUserProperties()
    .getProperty(RECC_CHAVE_DO_TEMA);
  if (escolhido && RECC_TEMAS.indexOf(escolhido) >= 0) return escolhido;

  var daOperacao = valorDaConfiguracao_('OPERACAO.TEMA_PADRAO', 'padrao');
  return RECC_TEMAS.indexOf(daOperacao) >= 0 ? daOperacao : 'padrao';
}

/**
 * Guarda o tema escolhido. Chamada pelo navegador.
 *
 * Não exige permissão nenhuma de propósito: escolher a cor da própria tela
 * não é uma decisão sobre dado. Exige apenas estar cadastrado — senão
 * qualquer visitante encheria as propriedades da instalação.
 */
function salvarTemaDoUsuario(tema) {
  var quem = usuarioAtual_();
  if (!quem.cadastrado) {
    throw new Error('Acesso negado: ' + quem.motivo);
  }
  if (RECC_TEMAS.indexOf(tema) < 0) {
    throw new Error('Tema desconhecido: "' + tema + '". Os temas são ' +
      RECC_TEMAS.join(', ') + '.');
  }
  PropertiesService.getUserProperties().setProperty(RECC_CHAVE_DO_TEMA, tema);
  return tema;
}

/** O menu lateral, já filtrado pelo nível e com os nomes que o ADM escolheu. */
function montarMenu_(permissoes) {
  var titulos = {};
  try {
    titulos = JSON.parse(valorDaConfiguracao_('MENU.TITULOS', '{}'));
  } catch (erro) {
    titulos = {};
  }

  // A ordem sai de RECC_TELAS_DO_SISTEMA, a mesma lista que a tela de
  // Configurações oferece ao montar um nível. Uma lista só, um lugar só.
  return RECC_TELAS_DO_SISTEMA
    .filter(function (item) { return podeVerTela_(permissoes, item.tela); })
    .map(function (item) {
      return { tela: item.tela, titulo: titulos[item.tela] || item.titulo };
    });
}

/** As mesas ativas, na ordem definida na aba MESAS. */
function mesasVisiveis_() {
  return lerRegistros_('MESAS')
    .filter(function (mesa) {
      return normalizarParaComparar_(mesa.Ativo) === 'sim';
    })
    .sort(function (uma, outra) {
      return (Number(uma.Ordem) || 0) - (Number(outra.Ordem) || 0);
    })
    .map(function (mesa) {
      return {
        id: mesa.Id,
        nome: mesa.Nome,
        descricao: mesa.Descricao,
        aba: mesa.Aba,
        colunaDaData: mesa.ColunaDaData,
        colunaDaHora: mesa.ColunaDaHora,
        colunaDoStatus: mesa.ColunaDoStatus,
        colunasDaFila: mesa.ColunasDaFila,
        colunasDaBusca: mesa.ColunasDaBusca,
        metaMensalPorPessoa: Number(mesa.MetaMensalPorPessoa) || 0,
        colunaDaFinalizacao: mesa.ColunaDaFinalizacao,
        colunaDaAreaResponsavel: mesa.ColunaDaAreaResponsavel,
        icone: mesa.Icone
      };
    });
}

// ============================================================================
// A DATA DO ÚLTIMO REGISTRO
// ============================================================================

/**
 * Quando entrou o caso mais recente, entre todas as mesas ativas.
 *
 * Fica na barra superior e responde a uma pergunta que a operação faz o dia
 * inteiro: "a base está atualizada?". Data velha ali é aviso de que alguma
 * carga não rodou.
 *
 * Custa pouco: a base só acrescenta no fim, então basta olhar as últimas
 * linhas de cada mesa — não se percorre a base para descobrir isso.
 */
function dataDoUltimoRegistro_() {
  var maisRecente = null;
  var deQualMesa = '';

  mesasVisiveis_().forEach(function (mesa) {
    if (!mesa.aba || !mesa.colunaDaData) return;

    var ultimos;
    try {
      ultimos = lerRegistros_(mesa.aba, { ultimas: 5 });
    } catch (erro) {
      return;   // aba fora do contrato não pode derrubar a barra superior
    }
    if (!ultimos.length) return;

    var registro = ultimos[ultimos.length - 1];
    var momento = juntarDataEHora_(
      registro[mesa.colunaDaData],
      mesa.colunaDaHora ? registro[mesa.colunaDaHora] : '');
    if (!momento) return;

    if (!maisRecente || momento.getTime() > maisRecente.getTime()) {
      maisRecente = momento;
      deQualMesa = mesa.nome;
    }
  });

  if (!maisRecente) {
    return { texto: 'Nenhum registro ainda', mesa: '', existe: false };
  }

  var padrao = deQualMesa && !temHora_(maisRecente) ? 'dd/MM/yyyy' : 'dd/MM/yyyy HH:mm';
  return {
    texto: Utilities.formatDate(maisRecente, RECC_FUSO_HORARIO, padrao),
    mesa: deQualMesa,
    existe: true
  };
}

/** Junta a coluna de data com a de hora, quando a mesa tem as duas. */
function juntarDataEHora_(valorDaData, valorDaHora) {
  var data = converterParaData_(valorDaData);
  if (!data) return null;

  var hora = converterParaHora_(valorDaHora);
  if (!hora) return data;

  return new Date(data.getFullYear(), data.getMonth(), data.getDate(),
    hora.getHours(), hora.getMinutes(), 0);
}

function temHora_(data) {
  return data.getHours() !== 0 || data.getMinutes() !== 0;
}

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

/** Um valor da aba CONFIG, com um padrão para quando a chave não existir. */
function valorDaConfiguracao_(chave, valorPadrao) {
  var alvo = normalizarParaComparar_(chave);
  var linhas = lerRegistros_('CONFIG');
  for (var i = 0; i < linhas.length; i++) {
    if (normalizarParaComparar_(linhas[i].Chave) === alvo) {
      var valor = String(linhas[i].Valor === undefined ? '' : linhas[i].Valor);
      return valor === '' ? valorPadrao : valor;
    }
  }
  return valorPadrao;
}

/**
 * Guarda a logo da operação. Chamada pelo navegador.
 *
 * Aceita duas formas, e as duas evitam hospedar arquivo:
 *
 *   1. um endereço https de uma imagem que a empresa já publica;
 *   2. a própria imagem embutida em texto (data:image/...;base64,...),
 *      que é o caminho sem dependência nenhuma — a imagem passa a morar
 *      dentro da célula de CONFIG.
 *
 * A imagem NUNCA vai para o código. É assim que a mesma plataforma serve
 * outra operação trocando só uma linha da planilha.
 */
function definirLogo(enderecoOuImagem) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var valor = String(enderecoOuImagem || '').trim();
  var ehEndereco = valor.indexOf('https://') === 0;
  var ehImagemEmbutida = valor.indexOf('data:image/') === 0;

  if (valor && !ehEndereco && !ehImagemEmbutida) {
    throw new Error('A logo precisa ser um endereço https:// de imagem ou a ' +
      'própria imagem em texto, começando com data:image/. Recebi: ' +
      valor.substring(0, 40));
  }

  var linhas = lerRegistros_('CONFIG');
  for (var i = 0; i < linhas.length; i++) {
    if (normalizarParaComparar_(linhas[i].Chave) === normalizarParaComparar_('IDENTIDADE.LOGO_URL')) {
      atualizarRegistro_('CONFIG', linhas[i].Id, {
        Valor: valor,
        AtualizadoPor: (usuarioAtual_().usuario || {}).Id || '',
        Data: new Date()
      });
      registrarAuditoria_('identidade.logo', 'CONFIG', linhas[i].Id, '');
      return true;
    }
  }
  throw new Error('A chave IDENTIDADE.LOGO_URL não existe na aba CONFIG.');
}

/**
 * Nome, subtítulo, operação, logo e cor.
 *
 * Mora em CONFIG e não em código de propósito: a plataforma é o PGO, e o RECC
 * é uma operação dela. Servir outra operação é trocar estas linhas.
 */
function lerIdentidadeVisual_() {
  return {
    nome: valorDaConfiguracao_('IDENTIDADE.NOME', 'RECC'),
    nomeLongo: valorDaConfiguracao_('IDENTIDADE.NOME_LONGO', ''),
    operacao: valorDaConfiguracao_('IDENTIDADE.OPERACAO', ''),
    logo: valorDaConfiguracao_('IDENTIDADE.LOGO_URL', ''),
    corPrimaria: valorDaConfiguracao_('IDENTIDADE.COR_PRIMARIA', '#0B77CE'),
    plataforma: valorDaConfiguracao_('IDENTIDADE.PLATAFORMA', ''),
    fabricante: valorDaConfiguracao_('IDENTIDADE.FABRICANTE', ''),
    frase: valorDaConfiguracao_('IDENTIDADE.FRASE', '')
  };
}


/* ==== Sequencia.gs ======================================================== */

/**
 * ============================================================================
 * RECC — Sequencia.gs · o gerador de Id
 * ============================================================================
 * O Id do RECC é DECIMAL, PROGRESSIVO, de 10 CASAS, começando em 0000000000.
 * Dez casas dão dez bilhões de combinações.
 *
 * Três regras, e cada uma existe por causa de um estrago real no sistema
 * anterior:
 *
 *   1. A sequência mora em Script Properties, NUNCA na planilha.
 *      A planilha é editável à mão; um contador dentro dela seria zerado sem
 *      querer numa tarde qualquer.
 *
 *   2. A sequência NUNCA anda para trás.
 *      Quando o Sheets deformava um Id, o gerador não o reconhecia, rebaixava
 *      o piso da aba e voltava a emitir Id já em uso. Aqui o piso é sempre
 *      max(último guardado, maior Id encontrado na aba).
 *
 *   3. Toda emissão acontece dentro de uma trava.
 *      Sem isso, dois usuários salvando no mesmo segundo recebem o mesmo Id.
 *      Quem chama (Planilha.gs) já segura a trava.
 * ============================================================================
 */

const RECC_PREFIXO_DA_SEQUENCIA = 'RECC_SEQ_';

/** 42 vira "0000000042". */
function formatarIdentificador_(numero) {
  var texto = String(Math.floor(numero));
  while (texto.length < 10) texto = '0' + texto;
  return texto;
}

/**
 * O maior Id já presente na aba, como número. -1 quando a aba está vazia.
 * Ids deformados (texto que não é dígito) são ignorados de propósito: eles
 * não podem rebaixar nem levantar o piso.
 */
function maiorIdentificadorDaAba_(nomeDaAba) {
  var estrutura = estruturaDaAba_(nomeDaAba);
  var iId = posicaoDaColuna_(estrutura, 'Id');
  if (iId < 0) return -1;

  var totalDados = quantidadeDeRegistros_(estrutura);
  if (totalDados <= 0) return -1;

  var coluna = estrutura.aba.getRange(2, iId + 1, totalDados, 1).getValues();
  var maior = -1;
  for (var i = 0; i < coluna.length; i++) {
    var digitos = converterParaIdentificador_(coluna[i][0]);
    if (!digitos) continue;
    var n = Number(digitos);
    if (isFinite(n) && n > maior) maior = n;
  }
  return maior;
}

/**
 * RESERVA UM BLOCO de Ids de uma vez, e devolve todos.
 *
 * DEVE ser chamada dentro de uma trava — inserirVariosRegistros_ já segura a
 * dela.
 *
 * POR QUE EM BLOCO, E NÃO UM POR VEZ. Esta função é a única do sistema que
 * fala com o PropertiesService durante uma gravação, e cada ida lá custa
 * dezenas de milissegundos no Apps Script. Emitindo um Id por vez, gravar
 * cinco mil casos eram DEZ MIL idas — dois minutos só de pedágio, dentro de
 * uma execução que tem seis. Reservando o bloco inteiro são DUAS: uma leitura
 * e uma gravação, para cinco mil linhas ou para uma.
 *
 * O bloco é reservado ANTES de qualquer linha ser escrita na planilha, e a
 * sequência já sai gravada no fim dele. Se a gravação estourar no meio, os
 * Ids reservados se perdem — e é o que tem de acontecer: a sequência nunca
 * anda para trás, mesmo que isso deixe buracos. Buraco na numeração não
 * quebra nada; Id reemitido quebra tudo, e foi o que aconteceu no PGO 5.x.
 */
function proximosIdentificadores_(nomeDaAba, quantos) {
  if (quantos <= 0) return [];

  var props = PropertiesService.getScriptProperties();
  var chave = RECC_PREFIXO_DA_SEQUENCIA + nomeDaAba;
  var guardado = props.getProperty(chave);

  var ultimo;
  if (guardado === null) {
    // Primeira emissão desta aba nesta instalação: alinha com o que já existe
    // na planilha, para nunca reemitir um Id que já está gravado.
    ultimo = maiorIdentificadorDaAba_(nomeDaAba);
  } else {
    ultimo = Number(guardado);
    if (!isFinite(ultimo)) ultimo = maiorIdentificadorDaAba_(nomeDaAba);
  }

  var ultimoDoBloco = ultimo + quantos;
  if (ultimoDoBloco > RECC_MAIOR_IDENTIFICADOR) {
    throw new Error('A sequência da aba "' + nomeDaAba + '" chegou ao teto de 10 ' +
      'casas decimais (' + RECC_MAIOR_IDENTIFICADOR + ').');
  }

  props.setProperty(chave, String(ultimoDoBloco));

  var bloco = [];
  for (var i = 1; i <= quantos; i++) bloco.push(formatarIdentificador_(ultimo + i));
  return bloco;
}

/** Um Id só. É o bloco de tamanho um — não existe segunda regra. */
function proximoIdentificador_(nomeDaAba) {
  return proximosIdentificadores_(nomeDaAba, 1)[0];
}

/**
 * Realinha a sequência com a planilha, sem nunca baixá-la.
 * Chamada depois de uma carga feita direto na planilha.
 */
function realinharSequencia_(nomeDaAba) {
  var props = PropertiesService.getScriptProperties();
  var chave = RECC_PREFIXO_DA_SEQUENCIA + nomeDaAba;
  var guardado = Number(props.getProperty(chave));
  if (!isFinite(guardado)) guardado = -1;

  var naAba = maiorIdentificadorDaAba_(nomeDaAba);
  var piso = Math.max(guardado, naAba);
  props.setProperty(chave, String(piso));
  return { aba: nomeDaAba, guardado: guardado, naAba: naAba, piso: piso };
}

/**
 * NORMALIZAR BASE — carimba Id em linha que entrou direto na planilha.
 *
 * Quem digita uma linha à mão não gera Id. Sem Id não há relacionamento, e
 * a atualização por Id não acha o registro. Esta rotina percorre a aba, dá
 * Id a quem está sem, e realinha a sequência.
 *
 * Só lê e escreve a coluna de Id: não toca em mais nada da linha.
 */
function normalizarIdentificadoresDaAba_(nomeDaAba) {
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(30000)) {
    throw new Error('A planilha está ocupada. Tente de novo.');
  }
  try {
    esquecerEstruturaLida_(nomeDaAba);
    var estrutura = estruturaDaAba_(nomeDaAba, true);
    var iId = posicaoDaColuna_(estrutura, 'Id');
    if (iId < 0) {
      throw new Error('A aba "' + nomeDaAba + '" não tem coluna Id.');
    }

    var totalDados = quantidadeDeRegistros_(estrutura);
    if (totalDados <= 0) {
      return { aba: nomeDaAba, carimbados: 0, repetidos: [], total: 0 };
    }

    realinharSequencia_(nomeDaAba);

    // Lê a aba inteira, e não só a coluna de Id: uma linha sem Id só se
    // distingue de uma linha em branco olhando as outras colunas.
    var bloco = estrutura.aba
      .getRange(2, 1, totalDados, estrutura.cabecalhos.length)
      .getValues();

    var faixa = estrutura.aba.getRange(2, iId + 1, totalDados, 1);
    var coluna = faixa.getValues();
    var vistos = {};
    var repetidos = [];
    var carimbados = 0;

    for (var i = 0; i < coluna.length; i++) {
      var atual = converterParaIdentificador_(coluna[i][0]);
      if (!atual) {
        if (linhaEstaVazia_(bloco[i])) continue;   // linha em branco não ganha Id
        coluna[i][0] = proximoIdentificador_(nomeDaAba);
        carimbados++;
        continue;
      }
      var normalizado = formatarIdentificador_(Number(atual));
      if (vistos[normalizado]) {
        repetidos.push({ linha: i + 2, id: normalizado });
      } else {
        vistos[normalizado] = true;
      }
      coluna[i][0] = normalizado;
    }

    // Texto ANTES do valor: é o que impede 0000000010 de virar 10.
    faixa.setNumberFormat('@');
    faixa.setValues(coluna);

    return {
      aba: nomeDaAba,
      total: totalDados,
      carimbados: carimbados,
      repetidos: repetidos
    };
  } finally {
    trava.releaseLock();
  }
}


/* ==== Usuarios.gs ========================================================= */

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

/** A lista de usuários, com cargo e nível já traduzidos para nome. */
function listarUsuarios() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var catalogo = {};
  lerRegistros_('CATALOGO').forEach(function (item) {
    catalogo[converterParaIdentificador_(item.Id)] = item.Nome;
  });

  return lerRegistros_('USUARIOS').map(function (usuario) {
    return {
      id: usuario.Id,
      nome: usuario.Nome,
      email: usuario.Email,
      canalQueAtende: usuario['Canal que atende'],
      cargoId: usuario.CargoId,
      cargo: catalogo[converterParaIdentificador_(usuario.CargoId)] || 'Sem dados',
      nivelAcessoId: usuario.NivelAcessoId,
      nivelAcesso:
        catalogo[converterParaIdentificador_(usuario.NivelAcessoId)] || 'Sem dados',
      matricula: usuario.Matricula,
      ativo: normalizarParaComparar_(usuario.Ativo) === 'sim',
      dataCadastro: usuario.DataCadastro,
      ultimoAcesso: usuario.UltimoAcesso
    };
  });
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
