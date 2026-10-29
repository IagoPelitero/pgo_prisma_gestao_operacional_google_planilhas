/**
 * ============================================================================
 * PGO — testes-registro-de-erros.js · o erro que ninguém via (Etapa 64)
 * ============================================================================
 * Achado da análise de 29/10: a tela que quebrava num pedaço em branco, a
 * auditoria que não gravava, a análise da madrugada que falhava — tudo ia
 * para o Logger, que ninguém abre. Agora vai para a aba ERROS. Decisões do
 * PO: quem configura vê em Configurações; a aba guarda os 2.000 mais recentes.
 *
 * E as duas conferências que faltavam ao diagnóstico: o acionador do
 * arquivamento da auditoria, e as listas de analistas que não se leem.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario } = require('./ferramentas');

function preparar() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.erros = () => t.chamar('lerRegistros_')('ERROS');
  t.registrar = (onde, mensagem) => t.chamar('registrarErro_')('servidor', onde, mensagem, 'detalhe');
  t.item = (padrao) => t.chamar('diagnosticoDoSistema')().blocos.find((b) => b.chave === 'ambiente')
    .itens.find((i) => padrao.test(i.oQue));
  return t;
}

/** O Servidor da tela, rodando fora do navegador, com a ponte falsa. */
function servidorDaTela(responde) {
  const marcados = [];
  const avisados = [];
  const ouvintes = {};
  const contexto = vm.createContext({
    console: { error: function () {}, info: function () {} },
    setTimeout: function (funcao, atraso) { marcados.push({ funcao, atraso }); return marcados.length; },
    clearTimeout: function () {},
    document: { addEventListener: function () {} },
    window: { addEventListener: function (nome, funcao) { ouvintes[nome] = funcao; } },
    google: { script: { run: {
      withSuccessHandler: function () { return this; },
      withFailureHandler: function () { return this; },
      umaQueSomeNoAr: function () { if (responde) responde(); },
      registrarErroDaTela: function (dados) { avisados.push(dados); }
    } } }
  });
  const fonte = fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', 'Aplicacao.html'), 'utf8')
    .replace(/^<script>/, '').replace(/<\/script>\s*$/, '');
  vm.runInContext(fonte, contexto, { filename: 'Aplicacao.html' });
  return { contexto, marcados, avisados, ouvintes };
}

function rodarTestesDoRegistroDeErros() {
  console.log('\nEtapa 64: o registro de erros');

  /* ----------------------------------------------------------------------- */
  secao('A aba ERROS');

  teste('a instalação cria a aba, com quem, quando, onde e o quê', () => {
    const t = preparar();
    const aba = t.ambiente.planilha.getSheetByName('ERROS');
    verdadeiro(!!aba, 'a aba existe');
    const cabecalhos = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].join(',');
    igual(cabecalhos, 'Id,DataHora,UsuarioId,Origem,Onde,Mensagem,Detalhe');
  });

  teste('o erro chega à aba na hora, com a trava livre', () => {
    const t = preparar();
    t.registrar('teste', 'algo quebrou');
    const erro = t.erros()[0];
    igual(erro.Origem + '|' + erro.Onde + '|' + erro.Mensagem, 'servidor|teste|algo quebrou');
    verdadeiro(String(erro.UsuarioId) !== '', 'quem estava usando');
  });

  teste('o mesmo erro no mesmo lugar entra uma vez por hora; outro lugar entra', () => {
    const t = preparar();
    t.registrar('campo X', 'configuração inválida');
    t.registrar('campo X', 'configuração inválida');
    t.registrar('campo Y', 'configuração inválida');
    igual(t.erros().length, 2);
  });

  teste('com a trava ocupada, o erro espera na fila — e ninguém espera por ele', () => {
    const t = preparar();
    t.ambiente.travaOcupada = true;
    t.ambiente.esperasDaTrava.length = 0;
    t.registrar('fila', 'esperou');
    t.ambiente.travaOcupada = false;
    verdadeiro(t.ambiente.esperasDaTrava.every((ms) => ms === 0), 'não esperou a trava');
    igual(t.erros().length, 0, 'ainda na fila');
    t.registrar('outro', 'descarrega');
    igual(t.erros().map((e) => e.Onde).join(','), 'fila,outro');
  });

  teste('a aba guarda os 2.000 mais recentes: os mais antigos saem', () => {
    const t = preparar();
    const lote = Array.from({ length: 2005 }, (_, i) => ({ DataHora: new Date(2026, 0, 1, 0, i),
      Origem: 'servidor', Onde: 'velho ' + i, Mensagem: 'antigo' }));
    t.chamar('inserirVariosRegistros_')('ERROS', lote);
    t.registrar('novo', 'o mais recente');
    const erros = t.erros();
    igual(erros.length, 2000);
    igual(erros[erros.length - 1].Onde, 'novo');
    igual(erros[0].Onde, 'velho 6', 'saíram os 6 mais antigos');
  });

  /* ----------------------------------------------------------------------- */
  secao('O que antes ia para o Logger');

  teste('a auditoria que não grava vira erro registrado', () => {
    const t = preparar();
    t.chamar('var __fila = entrarNaFilaDaAuditoria_; '
      + 'entrarNaFilaDaAuditoria_ = function () { throw new Error("propriedades fora do ar"); };');
    try {
      t.chamar('registrarAuditoria_')('teste.perdido', 'CASO', '7', '');
    } finally {
      t.chamar('entrarNaFilaDaAuditoria_ = __fila;');
    }
    const erro = t.erros().find((e) => e.Onde === 'auditoria');
    contem(erro.Mensagem, 'propriedades fora do ar');
    contem(erro.Detalhe, 'teste.perdido');
  });

  teste('a configuração quebrada de um campo vira erro, uma vez', () => {
    const t = preparar();
    t.chamar('lerConfiguracaoDoCampo_')({ Cabecalho: 'Quebrado', Configuracao: '{ isto não fecha' });
    t.chamar('lerConfiguracaoDoCampo_')({ Cabecalho: 'Quebrado', Configuracao: '{ isto não fecha' });
    igual(t.erros().filter((e) => e.Onde === 'campo Quebrado').length, 1);
  });

  teste('a lista de analistas que não se lê vira erro — e o diagnóstico dá FALHA', () => {
    const t = preparar();
    t.chamar('var __ler = lerRegistros_; lerRegistros_ = function (aba, opcoes) { '
      + 'if (aba === "ANALISTAS_CENTRAL") throw new Error("segunda base fora do ar"); '
      + 'return __ler(aba, opcoes); };');
    let item;
    try {
      igual(t.chamar("nomesAtivosDoCadastro_('ANALISTAS_CENTRAL')").length, 0, 'o formulário abre');
      item = t.item(/Lista ANALISTAS_CENTRAL/);
    } finally {
      t.chamar('lerRegistros_ = __ler;');
    }
    contem(t.erros().find((e) => e.Onde === 'lista ANALISTAS_CENTRAL').Mensagem, 'segunda base fora do ar');
    igual(item.situacao, 'falha');
  });

  teste('a lista vazia é dita no diagnóstico, sem alarme; com nomes, conta', () => {
    const t = preparar();
    const vazia = t.item(/Lista ANALISTAS_COBRANCA/);
    igual(vazia.situacao + '|' + vazia.oQue, 'ok|Lista ANALISTAS_COBRANCA: vazia');
    t.chamar('inserirVariosRegistros_')('ANALISTAS_COBRANCA', [{ Nome: 'Rita' }, { Nome: 'Caio' }]);
    contem(t.item(/Lista ANALISTAS_COBRANCA/).oQue, '2 nome(s)');
  });

  /* ----------------------------------------------------------------------- */
  secao('A tela avisa');

  teste('a tela registra o erro dela, com a tela e o tipo', () => {
    const t = preparar();
    t.chamar('registrarErroDaTela')({ tela: 'trabalho', tipo: 'javascript', mensagem: 'x is null', detalhe: 'pilha' });
    const erro = t.erros()[0];
    igual(erro.Origem + '|' + erro.Onde + '|' + erro.Mensagem, 'tela|trabalho · javascript|x is null');
  });

  teste('quem não está cadastrado não registra nada', () => {
    const t = preparar();
    comoUsuario(t.ambiente, 'ninguem@exemplo.com', () =>
      lanca(() => t.chamar('registrarErroDaTela')({ mensagem: 'x' }), 'Acesso negado'));
  });

  teste('os 40 segundos sem resposta viram aviso, com o nome da função', () => {
    const tela = servidorDaTela();
    vm.runInContext("Servidor.trocouDeTela('produtividade'); "
      + "Servidor.chamar('umaQueSomeNoAr').senao(function () {});", tela.contexto);
    tela.marcados.find((m) => m.atraso === 40000).funcao();
    igual(tela.avisados.length, 1);
    igual(tela.avisados[0].tela + '|' + tela.avisados[0].tipo, 'produtividade|tempo');
    contem(tela.avisados[0].mensagem, 'umaQueSomeNoAr');
  });

  teste('erro de JavaScript na página vai para o servidor; o mesmo, uma vez; no máximo 10', () => {
    const tela = servidorDaTela();
    verdadeiro(typeof tela.ouvintes.error === 'function', 'ouvinte de erro ligado');
    verdadeiro(typeof tela.ouvintes.unhandledrejection === 'function', 'e o de promessa recusada');
    tela.ouvintes.error({ message: 'Cannot read properties of null', filename: 'x', lineno: 3 });
    tela.ouvintes.error({ message: 'Cannot read properties of null', filename: 'x', lineno: 3 });
    igual(tela.avisados.length, 1, 'o mesmo erro, uma vez');
    for (let i = 0; i < 20; i++) tela.ouvintes.error({ message: 'erro ' + i });
    igual(tela.avisados.length, 10, 'no máximo dez por página');
  });

  /* ----------------------------------------------------------------------- */
  secao('Quem configura vê');

  teste('Configurações lista os erros, o mais recente primeiro, com quem', () => {
    const t = preparar();
    t.registrar('primeiro', 'a');
    t.registrar('segundo', 'b');
    const lista = t.chamar('listarErros')(40);
    igual(lista.map((e) => e.onde).join(','), 'segundo,primeiro');
    verdadeiro(lista[0].quem !== '' && lista[0].dataHora !== '');
  });

  teste('a lista é só de quem configura', () => {
    const t = preparar();
    const operacao = t.chamar('lerRegistros_')('CATALOGO')
      .find((item) => item.Tipo === 'NIVEL_ACESSO' && item.Nome === 'Operação');
    t.chamar('salvarUsuario')({ nome: 'Op', email: 'op@exemplo.com', nivelAcessoId: operacao.Id,
      canalId: '', ativo: true });
    comoUsuario(t.ambiente, 'op@exemplo.com', () =>
      lanca(() => t.chamar('listarErros')(40)));
  });

  teste('a tela de Configurações pede os erros e desenha "Erros recentes"', () => {
    const tela = fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', 'Configuracoes.html'), 'utf8');
    contem(tela, "Servidor.chamar('listarErros', 40)");
    contem(tela, "tituloDoPainel('Erros recentes'");
  });

  /* ----------------------------------------------------------------------- */
  secao('O diagnóstico');

  teste('sem erros na semana: OK; com erro: ATENÇÃO, dizendo onde ver', () => {
    const t = preparar();
    igual(t.item(/^Erros/).situacao, 'ok');
    t.registrar('relatório', 'falhou');
    const item = t.item(/^Erros/);
    igual(item.situacao, 'atencao');
    contem(item.detalhe, 'relatório');
    contem(item.comoArrumar, 'Erros recentes');
  });

  teste('o acionador do arquivamento: sem arquivo, nada a cobrar', () => {
    const t = preparar();
    igual(t.item(/Arquivamento da auditoria/).situacao, 'ok');
  });

  teste('com arquivo e sem o acionador rodar: ATENÇÃO, com o passo a passo', () => {
    const t = preparar();
    t.chamar('gravarConfiguracao_')(t.chamar('RECC_CHAVE_DO_ARQUIVO_DA_AUDITORIA'), 'planilha-de-arquivo');
    const item = t.item(/Arquivamento da auditoria/);
    igual(item.situacao, 'atencao');
    contem(item.comoArrumar, 'arquivarAuditoriaAgendada');
  });

  teste('o acionador que roda deixa o batimento; parado há 40 dias, ATENÇÃO', () => {
    const t = preparar();
    t.chamar('arquivarAuditoriaAgendada()');   // sem arquivo: não arquiva, mas bate
    t.chamar('gravarConfiguracao_')(t.chamar('RECC_CHAVE_DO_ARQUIVO_DA_AUDITORIA'), 'planilha-de-arquivo');
    igual(t.item(/Arquivamento da auditoria/).situacao, 'ok');
    t.ambiente.globais.PropertiesService.getScriptProperties().setProperty('AUDITORIA.ACIONADOR_RODOU',
      String(Date.now() - 40 * 24 * 3600 * 1000));
    const item = t.item(/Arquivamento da auditoria/);
    igual(item.situacao, 'atencao');
    contem(item.oQue, '40 dias');
  });

  /* ----------------------------------------------------------------------- */
  secao('A planilha instalada antes');

  teste('o atualizarPGO cria a aba, e grava a fila que esperava por ela', () => {
    const t = preparar();
    const planilha = t.ambiente.planilha;
    planilha.deleteSheet(planilha.getSheetByName('ERROS'));
    t.chamar('esquecerEstruturaLida_()');
    t.registrar('antes da aba', 'esperou na fila');
    igual(t.item(/^Erros/).situacao, 'atencao', 'o diagnóstico manda criar');
    const laudo = t.chamar('atualizarPGO()');
    contem(laudo, 'aba ERROS criada');
    contem(laudo, '1 erro(s) da fila gravados');
    igual(t.erros()[0].Onde, 'antes da aba');
  });
}

module.exports = { rodarTestesDoRegistroDeErros };
