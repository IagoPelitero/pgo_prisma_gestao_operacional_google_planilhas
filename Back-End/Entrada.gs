/**
 * ============================================================================
 * PGO — Entrada.gs · quem entra e o que pode
 * ============================================================================
 * Da porta da rua até o cadastro: o doGet que decide o que servir, os níveis
 * que dizem o que cada um alcança, e a lista de quem pode entrar.
 *
 * O QUE TEM AQUI DENTRO, nesta ordem:
 *
 *   1. A PORTA DE ENTRADA (doGet)   (era Principal.gs)
 *   2. NÍVEIS, ESCOPO E A SENHA DE ADMINISTRADOR   (era Acesso.gs)
 *   3. O CADASTRO DE QUEM PODE ENTRAR   (era Usuarios.gs)
 *
 * Procure pelo banner com ##### para pular de uma seção à outra.
 * ============================================================================
 */

/* ############################################################################
   #
   #  SEÇÃO 1 de 3 · A PORTA DE ENTRADA (doGet)
   #
   #  Era o arquivo Back-End/Principal.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

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

  // E o pacote de partida vai JUNTO, dentro da própria página.
  //
  // Antes, abrir o sistema eram DUAS viagens ao servidor em fila: o doGet
  // trazia a página, e só então o navegador pedia o pacoteDePartida. A
  // segunda recomeçava do zero — outra execução, outro login, outra leitura
  // das mesmas abas — para devolver o que esta execução aqui JÁ TEM na mão.
  //
  // O que a operação sentia disso era a tela de "Conferindo o seu acesso…"
  // parada. Não era a planilha sendo lenta: era uma viagem inteira, com o
  // custo fixo de uma chamada do Apps Script, para repetir trabalho feito.
  //
  // A tela continua sabendo pedir o pacote pelo caminho antigo (ver
  // Aplicacao.html): se a injeção falhar, ela pergunta ao servidor como
  // sempre fez. Atalho que não tem volta vira um jeito novo de quebrar.
  pagina.pacoteDePartida = comoTextoParaDentroDeScript_(montarPacoteDePartida_(quem));

  return pagina.evaluate()
    .setTitle(identidade.nome)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * JSON pronto para morar dentro de uma tag <script> da página.
 *
 * O `<` vira `\u003c` — e isso não é capricho. Um valor de configuração que
 * contivesse o texto de fechamento de script encerraria a tag ali, no meio do
 * JSON, e o resto do pacote viraria HTML solto na página. Escapando o `<`, não
 * existe sequência que feche a tag, e o JSON continua válido: `\u003c` é
 * exatamente o mesmo caractere para quem faz JSON.parse.
 */
function comoTextoParaDentroDeScript_(valor) {
  return JSON.stringify(valor)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
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
  // próprio: se o Instalacao.gs também tiver ficado para trás na cópia, o
  // recado principal continua saindo em vez de virar um segundo erro.
  try {
    var faltando = arquivosDeTelaQueFaltam_();
    if (faltando.length > 1) {
      recado += '\n\nNo total faltam ' + faltando.length + ' arquivos: '
        + faltando.join(', ') + '. Copie todos de uma vez.';
    }
  } catch (erro) {
    recado += '\n\n(Não consegui listar os outros que faltam — confira se '
      + 'Instalacao.gs está no projeto.)';
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
  return montarPacoteDePartida_(usuarioAtual_());
}

/**
 * O pacote de verdade, a partir de um usuário que JÁ foi lido.
 *
 * Existe separado da função acima por um motivo só: o doGet já leu o usuário
 * para decidir qual página servir, e passar esse resultado adiante evita ler
 * tudo de novo. A função pública continua onde estava, com o nome que a tela
 * conhece — quem chama de fora não precisa saber dessa divisão.
 */
function montarPacoteDePartida_(quem) {
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
      escopo: quem.permissoes.escopo,
      canais: quem.permissoes.canais
    },
    menu: montarMenu_(quem.permissoes),
    canais: canaisQueEuVejo_(quem),
    ultimoRegistro: dataDoUltimoRegistro_(quem),
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

/** Os canais ativas, na ordem definida na aba CANAIS. */
/**
 * Os canais que ESTA pessoa enxerga.
 *
 * canaisVisiveis_ responde "quais canais existem e estão ligados". Esta aqui
 * responde outra coisa: "quais deles são desta pessoa". Confundir as duas é o
 * erro que faz um analista da RET abrir a fila da Mesa Diamante.
 *
 * Nível sem canal declarado vê todos — ver lerPermissoesDoNivel_.
 */
function canaisQueEuVejo_(quem) {
  var todos = canaisVisiveis_();
  if (!quem || !quem.cadastrado) return [];

  var escolhidos = (quem.permissoes && quem.permissoes.canais) || [];
  if (!escolhidos.length) return todos;

  return todos.filter(function (canal) {
    return escolhidos.indexOf(converterParaIdentificador_(canal.id)) >= 0;
  });
}

function canaisVisiveis_() {
  return lerRegistros_('CANAIS')
    .filter(function (canal) {
      return normalizarParaComparar_(canal.Ativo) === 'sim';
    })
    .sort(function (uma, outra) {
      return (Number(uma.Ordem) || 0) - (Number(outra.Ordem) || 0);
    })
    .map(function (canal) {
      return {
        id: canal.Id,
        nome: canal.Nome,
        descricao: canal.Descricao,
        aba: canal.Aba,
        colunaDaData: canal.ColunaDaData,
        colunaDaHora: canal.ColunaDaHora,
        colunaDoStatus: canal.ColunaDoStatus,
        colunasDaFila: canal.ColunasDaFila,
        colunasDaBusca: canal.ColunasDaBusca,
        metaMensalPorPessoa: Number(canal.MetaMensalPorPessoa) || 0,
        colunaDaFinalizacao: canal.ColunaDaFinalizacao,
        colunaDaAreaResponsavel: canal.ColunaDaAreaResponsavel,
        icone: canal.Icone
      };
    });
}

// ============================================================================
// A DATA DO ÚLTIMO REGISTRO
// ============================================================================

/**
 * Quando entrou o caso mais recente, entre todas os canais ativas.
 *
 * Fica na barra superior e responde a uma pergunta que a operação faz o dia
 * inteiro: "a base está atualizada?". Data velha ali é aviso de que alguma
 * carga não rodou.
 *
 * Custa pouco: a base só acrescenta no fim, então basta olhar as últimas
 * linhas de cado canal — não se percorre a base para descobrir isso.
 */
function dataDoUltimoRegistro_(quem) {
  // Sem quem, pergunta. Chamar sem argumento e receber "nenhum canal" seria o
  // pior dos dois mundos: a barra ficaria vazia sem ninguém entender por quê,
  // e pareceria base desatualizada — que é exatamente o alarme que ela existe
  // para dar.
  quem = quem || usuarioAtual_();

  var maisRecente = null;
  var deQualCanal = '';

  // Só os canais de quem está olhando. A barra superior responde "a minha
  // base está atualizada?" — trazer a data de um canal que a pessoa nem
  // enxerga responderia a pergunta de outra pessoa.
  canaisQueEuVejo_(quem).forEach(function (canal) {
    if (!canal.aba || !canal.colunaDaData) return;

    var ultimos;
    try {
      ultimos = lerRegistros_(canal.aba, { ultimas: 5 });
    } catch (erro) {
      return;   // aba fora do contrato não pode derrubar a barra superior
    }
    if (!ultimos.length) return;

    var registro = ultimos[ultimos.length - 1];
    var momento = juntarDataEHora_(
      registro[canal.colunaDaData],
      canal.colunaDaHora ? registro[canal.colunaDaHora] : '');
    if (!momento) return;

    if (!maisRecente || momento.getTime() > maisRecente.getTime()) {
      maisRecente = momento;
      deQualCanal = canal.nome;
    }
  });

  if (!maisRecente) {
    return { texto: 'Nenhum registro ainda', canal: '', existe: false };
  }

  var padrao = deQualCanal && !temHora_(maisRecente) ? 'dd/MM/yyyy' : 'dd/MM/yyyy HH:mm';
  return {
    texto: Utilities.formatDate(maisRecente, RECC_FUSO_HORARIO, padrao),
    canal: deQualCanal,
    existe: true
  };
}

/** Junta a coluna de data com a de hora, quando o canal tem as duas. */
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

/* ############################################################################
   #
   #  SEÇÃO 2 de 3 · NÍVEIS, ESCOPO E A SENHA DE ADMINISTRADOR
   #
   #  Era o arquivo Back-End/Acesso.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

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
  // Tombar é trazer uma base inteira de outra planilha para dentro do PGO —
  // cem, trezentos casos de uma vez. É separado de `criar` de propósito: quem
  // cadastra um caso por vez erra um caso; quem tomba errado suja a base toda,
  // e o desfazer é apagar trezentas linhas na mão.
  TOMBAR: 'tombar',
  CONFIGURAR: 'configurar',
  ESTRUTURA: 'estrutura'
};

/** O alcance de cada pessoa sobre os dados. */
const RECC_ESCOPOS = {
  PROPRIOS: 'PROPRIOS',
  EQUIPE: 'EQUIPE',
  CANAL: 'CANAL',
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
  // A CHAVE é o que identifica a tela para sempre; o título é só o que se lê.
  // Por isso "dashboard" continua sendo a chave da tela que hoje se chama
  // "Trabalho": trocar a chave junto com o nome quebraria as rotas gravadas,
  // os níveis de acesso e os endereços que as pessoas guardaram.
  { tela: 'dashboard', titulo: 'Trabalho' },
  { tela: 'cadastrarCaso', titulo: 'Cadastrar Caso' },
  { tela: 'minhaPerformance', titulo: 'Minha Performance' },
  { tela: 'buscarCaso', titulo: 'Buscar Caso' },
  { tela: 'tabelaCorretoras', titulo: 'Tabela de Corretoras' },
  { tela: 'tombamento', titulo: 'Tombamento' },
  { tela: 'painelAnalitico', titulo: 'Produtividade RECC' },
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
    canais: [],
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

  // QUAIS CANAIS ESTE NÍVEL ENXERGA.
  //
  // RET e Mesa Diamante são operações distintas: tratativas diferentes,
  // colunas diferentes, gente diferente. Quem atende a RET não tem o que
  // fazer com a fila da Mesa, e o contrário também vale.
  //
  // LISTA VAZIA QUER DIZER TODOS, e isso é decisão, não descuido. É o caso de
  // quem administra — e é também o que mantém de pé todo nível criado antes
  // desta regra existir: nível antigo continua enxergando o que enxergava, em
  // vez de amanhecer sem canal nenhum e sem ninguém entender por quê.
  permissoes.canais = Array.isArray(lido.canais)
    ? lido.canais.map(function (id) { return converterParaIdentificador_(id); })
      .filter(function (id) { return id !== ''; })
    : [];
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
  if (quem.permissoes.escopo === RECC_ESCOPOS.CANAL) return registros;

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
  var nomesDaEquipe = nomesDaMinhaEquipe_(quem);
  if (nomesDaEquipe === null) return [];

  var indice = {};
  nomesDaEquipe.forEach(function (nome) {
    indice[normalizarParaComparar_(nome)] = true;
  });
  return registros.filter(function (registro) {
    return indice[normalizarParaComparar_(registro[coluna])] === true;
  });
}

/**
 * Quem é da MINHA equipe: as pessoas cadastradas no mesmo canal que eu atendo.
 *
 * Mora aqui, fora do `filtrarPeloAlcance_`, porque duas telas fazem a mesma
 * pergunta por motivos diferentes — o alcance para RECORTAR o que eu vejo, e a
 * Minha Performance para COMPARAR o meu resultado com o do meu grupo. Escrever
 * a regra duas vezes faria as duas divergirem, e aí "a minha equipe" na
 * performance não seria a mesma "minha equipe" que o alcance enxerga.
 *
 * Devolve null — e não lista vazia — para quem NÃO PERTENCE a canal nenhum, que
 * é o caso de quem administra. As duas coisas são diferentes: "a minha equipe
 * não tem ninguém" e "eu não tenho equipe" pedem respostas diferentes na tela.
 */
function nomesDaMinhaEquipe_(quem) {
  var meuCanal = normalizarParaComparar_((quem.usuario || {})['Canal que atende']);
  if (!meuCanal) return null;

  var nomes = [];
  lerRegistros_('USUARIOS').forEach(function (usuario) {
    if (normalizarParaComparar_(usuario.Ativo) !== 'sim') return;
    if (normalizarParaComparar_(usuario['Canal que atende']) !== meuCanal) return;
    nomes.push(String(usuario.Nome));
  });
  return nomes;
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
 * A guarda das ações sem volta: criar ou remover coluna, apagar canal, mexer
 * em nível de acesso, gerar aba de análise sobre uma existente, normalizar
 * base, ocultar em massa.
 *
 * QUEM É ADMINISTRADOR NÃO PRECISA DIGITAR A SENHA. É decisão, e vale a pena
 * estar escrita.
 *
 * A senha nunca foi uma segunda identidade: o sistema já sabe quem está
 * chamando, pela conta Google, e já conferiu a permissão. O que ela é, e
 * sempre foi, é um FREIO — um segundo de parada antes de uma ação que não tem
 * desfazer. Para quem tem a permissão de estrutura, esse freio é atrito sem
 * ganho: a pessoa que pode mexer na estrutura é a mesma que define a senha, e
 * pedir a ela um segredo que ela mesma escolheu não protege nada.
 *
 * Para quem NÃO é administrador e mesmo assim recebeu a ação — porque alguém
 * montou um nível assim —, o freio continua valendo inteiro. É justamente aí
 * que ele serve: a ação é cara, e quem a está fazendo não é quem cuida do
 * sistema.
 *
 * Instalação sem senha definida NÃO libera ninguém: continua barrando, e
 * dizendo onde definir. Do contrário, não definir senha viraria o jeito mais
 * fácil de desligar a guarda.
 */
function exigirSenhaDeAdministrador_() {
  var quem = usuarioAtual_();
  if (quem.cadastrado && podeFazer_(quem.permissoes, RECC_ACOES.ESTRUTURA)) {
    return true;
  }

  if (!existeSenhaDeAdministrador_()) {
    throw new Error('Esta ação exige a senha de administrador, e nenhuma foi '
      + 'definida ainda. Peça a um administrador que defina em '
      + 'Configurações › Identidade.');
  }

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

/* ############################################################################
   #
   #  SEÇÃO 3 de 3 · O CADASTRO DE QUEM PODE ENTRAR
   #
   #  Era o arquivo Back-End/Usuarios.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

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
 * A lista de usuários, com cargo, nível e canal já traduzidos para nome.
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

  var canais = {};
  lerRegistros_('CANAIS').forEach(function (canal) {
    canais[converterParaIdentificador_(canal.Id)] = String(canal.Nome || '');
  });

  return lerRegistros_('USUARIOS').map(function (usuario) {
    var canalId = converterParaIdentificador_(usuario.CanalId);
    return {
      id: String(usuario.Id || ''),
      nome: String(usuario.Nome || ''),
      email: String(usuario.Email || ''),
      canalQueAtende: String(usuario['Canal que atende'] || ''),
      canalId: canalId,
      // Sem canal NÃO é falta de dado: é o administrador, que atende todas.
      canal: canalId ? (canais[canalId] || 'Canal desligada') : '',
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

  // O canal é OPCIONAL — quem administra não pertence a nenhuma. Mas se vier
  // preenchida, tem de existir: um canal que sumiu deixaria a pessoa apontando
  // para o nada, e ninguém descobriria até alguém estranhar o Dashboard vazio.
  var canalEscolhida = converterParaIdentificador_(dados.canalId);
  if (canalEscolhida) {
    var existe = lerRegistros_('CANAIS').filter(function (canal) {
      return converterParaIdentificador_(canal.Id) === canalEscolhida;
    })[0];
    if (!existe) {
      throw new Error('O canal escolhida não existe mais. Escolha outra, ou ' +
        'deixe em branco — quem administra não pertence a um canal.');
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
    // Canal VAZIA é válida: é o administrador, que atende todas e delega.
    CanalId: converterParaIdentificador_(dados.canalId),
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
