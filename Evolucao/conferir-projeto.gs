/**
 * PGO — conferir-projeto.gs · qual arquivo ficou para trás na cópia
 * ============================================================================
 * COLE ISTO NUM ARQUIVO .gs NOVO NO APPS SCRIPT E EXECUTE
 * `oQueFaltaNoProjeto`. O resultado sai no log (Ver › Registros de execução).
 *
 * ELA NÃO DEPENDE DE NENHUM OUTRO ARQUIVO DO PGO — e é esse o ponto. O
 * diagnóstico completo (`diagnosticoRECC`) responde muito mais, mas ele mora
 * no `Instalacao.gs`: se o problema for justamente um arquivo que não foi
 * copiado, pode ser o dele. Esta aqui se vira sozinha.
 *
 * O SINTOMA QUE ELA EXPLICA: a tela fica parada numa mensagem de carregamento
 * — "Lendo o cadastro…", "Somando os casos…" — e não sai dali. Quando a função
 * não existe no servidor, `google.script.run.nomeDela` é `undefined` e a
 * chamada estoura antes de sair do navegador, num ponto em que o tratamento de
 * erro da tela ainda nem foi registrado. Nada aparece: a tela só congela.
 *
 * ----------------------------------------------------------------------------
 * NÃO EDITE ESTE ARQUIVO À MÃO.
 * Ele é escrito por `node Evolucao/Testes/gerar-conferidor.js`, a partir do
 * código de verdade, e há um teste na suíte cobrando que os dois batam. Lista
 * digitada à mão envelhece calada — é o achado 33.
 * ----------------------------------------------------------------------------
 * Depois de copiar o que faltar, pode apagar este arquivo.
 * ============================================================================
 */
function oQueFaltaNoProjeto() {
  var esperado = {
    'Cadastros.gs': ['aplicarImportacao', 'bloquearSusep', 'conferirImportacao', 'desbloquearSusep', 'exportarCorretoras', 'listarProdutos', 'listarSusepsBloqueadas', 'ocultarCorretora', 'ocultarProduto', 'opcoesDaImportacao', 'salvarCorretora', 'salvarProduto', 'tabelaDeCorretoras'],
    'Casos.gs': ['alterarSituacaoDoCaso', 'buscarCasos', 'cadastrarCaso', 'casoParaEditar', 'configuracaoDoLegado', 'consultarSusep', 'editarCaso', 'formularioDaMesa', 'ocultarCaso', 'opcoesDaBusca', 'salvarConfiguracaoDoLegado', 'situacoesParaTrocar'],
    'Config.gs': ['conferirEstruturaDaPlanilha', 'criarCampo', 'definirSenhaDeAdministrador', 'gerarAnalise', 'liberarComSenha', 'listarAnalises', 'listarAuditoria', 'listarCamposDaMesa', 'listarCardsDoPainel', 'listarCatalogo', 'listarMesasConfiguraveis', 'listarNiveisDeAcesso', 'ocultarAnalise', 'opcoesDeAnalise', 'opcoesDeConfiguracaoDeCampo', 'opcoesDeNivelDeAcesso', 'reordenarCampos', 'resumoDasConfiguracoes', 'salvarAnalise', 'salvarCampo', 'salvarCardsDoPainel', 'salvarIdentidade', 'salvarItemDoCatalogo', 'salvarMesa', 'salvarNivelDeAcesso'],
    'Entrada.gs': ['definirLogo', 'desativarUsuario', 'listarUsuarios', 'pacoteDePartida', 'salvarTemaDoUsuario', 'salvarUsuario'],
    'Indicadores.gs': ['detalharComponente', 'detalhesDoCaso', 'exportarComponente', 'listarComponentesDoPainel', 'minhaPerformance', 'opcoesDoPainelAnalitico', 'painelAnalitico', 'resumoDaMesa', 'salvarComponentesDoPainel'],
    'Instalacao.gs': ['diagnosticoDoSistema']
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
    recado = 'TUDO AQUI. As 66 funcoes que as telas chamam existem no projeto.';
  } else {
    recado = 'FALTAM ' + faltando.length + ' funcao(oes), em '
      + arquivosIncompletos.length + ' arquivo(s):\n\n'
      + '  COPIE ESTES ARQUIVOS: ' + arquivosIncompletos.join(', ') + '\n\n'
      + faltando.join('\n');
  }
  Logger.log(recado);
  return recado;
}
