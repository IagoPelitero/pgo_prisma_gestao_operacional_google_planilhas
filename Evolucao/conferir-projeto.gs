/**
 * PGO — conferir-projeto.gs · qual arquivo ficou para trás na cópia
 * ============================================================================
 * COLE ISTO NUM ARQUIVO .gs NOVO NO APPS SCRIPT E EXECUTE
 * `oQueFaltaNoProjeto`. O resultado sai no log (Ver › Registros de execução).
 *
 * ELA NÃO DEPENDE DE NENHUM OUTRO ARQUIVO DO PGO — e é esse o ponto. O
 * diagnóstico completo (`diagnosticoRECC`) responde muito mais, mas ele mora
 * no `Diagnostico.gs`: se o problema for justamente um arquivo que não foi
 * copiado, pode ser o dele. Esta aqui se vira sozinha.
 *
 * O SINTOMA QUE ELA EXPLICA: a tela fica parada numa mensagem de carregamento
 * — "Lendo o cadastro…", "Somando os casos…" — e não sai dali. Quando a função
 * não existe no servidor, `google.script.run.nomeDela` é `undefined` e a
 * chamada estoura antes de sair do navegador, num ponto em que o tratamento de
 * erro da tela ainda nem foi registrado. Nada aparece: a tela só congela.
 *
 * A lista abaixo é gerada a partir do repositório — é exatamente o que as
 * telas chamam. Depois de copiar o que faltar, pode apagar este arquivo.
 * ============================================================================
 */
function oQueFaltaNoProjeto() {
  var esperado = {
    'Analise.gs': ['gerarAnalise', 'listarAnalises', 'ocultarAnalise', 'opcoesDeAnalise', 'salvarAnalise'],
    'Analitico.gs': ['detalharComponente', 'exportarComponente', 'listarComponentesDoPainel', 'opcoesDoPainelAnalitico', 'painelAnalitico', 'salvarComponentesDoPainel'],
    'Busca.gs': ['buscarCasos', 'configuracaoDoLegado', 'opcoesDaBusca', 'salvarConfiguracaoDoLegado'],
    'Campos.gs': ['formularioDaMesa'],
    'Casos.gs': ['alterarSituacaoDoCaso', 'cadastrarCaso', 'casoParaEditar', 'consultarSusep', 'editarCaso', 'ocultarCaso', 'situacoesParaTrocar'],
    'Config.gs': ['conferirEstruturaDaPlanilha', 'criarCampo', 'definirSenhaDeAdministrador', 'liberarComSenha', 'listarAuditoria', 'listarCamposDaMesa', 'listarCardsDoPainel', 'listarCatalogo', 'listarMesasConfiguraveis', 'listarNiveisDeAcesso', 'opcoesDeConfiguracaoDeCampo', 'opcoesDeNivelDeAcesso', 'reordenarCampos', 'resumoDasConfiguracoes', 'salvarCampo', 'salvarCardsDoPainel', 'salvarIdentidade', 'salvarItemDoCatalogo', 'salvarMesa', 'salvarNivelDeAcesso'],
    'Corretoras.gs': ['bloquearSusep', 'desbloquearSusep', 'exportarCorretoras', 'listarProdutos', 'listarSusepsBloqueadas', 'ocultarCorretora', 'ocultarProduto', 'salvarCorretora', 'salvarProduto', 'tabelaDeCorretoras'],
    'Diagnostico.gs': ['diagnosticoDoSistema'],
    'Importacao.gs': ['aplicarImportacao', 'conferirImportacao', 'opcoesDaImportacao'],
    'Painel.gs': ['detalhesDoCaso', 'resumoDaMesa'],
    'Performance.gs': ['minhaPerformance'],
    'Principal.gs': ['definirLogo', 'pacoteDePartida', 'salvarTemaDoUsuario'],
    'Usuarios.gs': ['desativarUsuario', 'listarUsuarios', 'salvarUsuario']

  };

  var faltando = [];
  var arquivosIncompletos = [];

  Object.keys(esperado).forEach(function (arquivo) {
    var ausentes = esperado[arquivo].filter(function (nome) {
      return typeof globalThis[nome] !== 'function';
    });
    if (!ausentes.length) return;
    arquivosIncompletos.push(arquivo);
    ausentes.forEach(function (nome) { faltando.push(arquivo + ' -> ' + nome); });
  });

  var recado;
  if (!faltando.length) {
    recado = 'TUDO AQUI. As ' + Object.keys(esperado)
      .reduce(function (soma, a) { return soma + esperado[a].length; }, 0)
      + ' funcoes que as telas chamam existem no projeto.';
  } else {
    recado = 'FALTAM ' + faltando.length + ' funcao(oes), em '
      + arquivosIncompletos.length + ' arquivo(s):\n\n'
      + '  COPIE ESTES ARQUIVOS: ' + arquivosIncompletos.join(', ') + '\n\n'
      + faltando.join('\n');
  }
  Logger.log(recado);
  return recado;
}