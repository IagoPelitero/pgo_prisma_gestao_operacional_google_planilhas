/**
 * ============================================================================
 * PGO — testes-velocidade.js · o cache da configuração (Etapa 42)
 * ============================================================================
 * Relato do PO: lentidão no Trabalho, no "Trabalhar no caso" e no Cadastrar
 * Caso, com 9 pessoas mexendo ao mesmo tempo, e o erro dos 40 segundos.
 *
 * A medição: cada ação da tela fazia de 30 a 60 idas ao Planilhas, e a maior
 * parte era reler a configuração — CANAIS, CAMPOS, listas, prazos, usuários.
 * O remédio: o CacheService guarda a configuração por 5 minutos para todas as
 * execuções. As regras, escolhidas pelo PO:
 *   - salvar pelo sistema limpa o cache na hora;
 *   - mexer direto na planilha vale em até 5 minutos, ou na hora pelo botão
 *     "Aplicar mudanças da planilha agora".
 *
 * Cada clique no Apps Script é uma EXECUÇÃO NOVA: nada fica em memória. O
 * `novaExecucao` daqui zera a memória de dentro da chamada, para o teste ver o
 * que o cache — e só ele — leva de um clique para o outro.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario } =
  require('./ferramentas');

const lerTela = (nome) => fs.readFileSync(
  path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

/** O que o Apps Script faz entre um clique e outro: esquece a memória da execução. */
function novaExecucao(t) {
  t.contexto.cacheDaConfiguracaoLido = null;
  t.contexto.registrosJaLidos = {};
  t.contexto.estruturasJaLidas = {};
  t.contexto.tiposDeclaradosJaLidos = null;
}

function instalado() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  t.medir = (f) => {
    novaExecucao(t);
    t.ambiente.medidor.zerar();
    const r = f();
    return Object.assign({ resultado: r }, t.ambiente.medidor.retrato());
  };
  /** Escreve direto numa célula da planilha, como o PO faz à mão. */
  t.escreverNaPlanilha = (aba, id, cabecalho, valor) => {
    const folha = t.ambiente.planilha.getSheetByName(aba);
    const cabecalhos = folha.getRange(1, 1, 1, folha.getLastColumn()).getValues()[0];
    const coluna = cabecalhos.indexOf(cabecalho) + 1;
    const ids = folha.getRange(1, 1, folha.getLastRow(), 1).getValues().map((l) => String(l[0]));
    const linha = ids.indexOf(String(id)) + 1;
    if (coluna < 1 || linha < 1) throw new Error('célula não achada: ' + aba + ' ' + id + ' ' + cabecalho);
    folha.getRange(linha, coluna).setValue(valor);
  };
  return t;
}

const nomeDoCanal = (t) => {
  novaExecucao(t);
  return t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET').nome;
};

function rodarTestesDeVelocidade() {
  console.log('\nEtapa 42: o cache da configuração');

  /* ----------------------------------------------------------------------- */
  secao('Menos idas à planilha');

  teste('o segundo clique lê a configuração do cache, e não da planilha', () => {
    const t = instalado();
    const primeiro = t.medir(() => t.chamar('formularioDoCanal')(t.ret.id));
    const segundo = t.medir(() => t.chamar('formularioDoCanal')(t.ret.id));
    verdadeiro(primeiro.idasParaLer >= 6, 'o primeiro clique lê a planilha: ' + primeiro.idasParaLer);
    verdadeiro(segundo.idasParaLer <= 2, 'o segundo, quase nada: ' + segundo.idasParaLer + ' ida(s)');
    igual(segundo.cacheLidos, 1, 'e o cache inteiro vem numa ida só');
    igual(JSON.stringify(segundo.resultado), JSON.stringify(primeiro.resultado),
      'e o formulário é o mesmo');
  });

  teste('abrir o Trabalho: com o cache, só a base do canal vem da planilha', () => {
    const t = instalado();
    t.medir(() => t.chamar('resumoDoCanal')(t.ret.id, {}, 30));
    const quente = t.medir(() => t.chamar('resumoDoCanal')(t.ret.id, {}, 30));
    verdadeiro(quente.idasParaLer <= 3, 'idas à planilha: ' + quente.idasParaLer);
  });

  teste('cadastrar e trocar status também saem mais leves', () => {
    const t = instalado();
    const frio = t.medir(() => t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'A', status: 'Pendente' }));
    const quente = t.medir(() => t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'B', status: 'Pendente' }));
    verdadeiro(quente.idasParaLer < frio.idasParaLer / 2,
      'cadastrar: ' + frio.idasParaLer + ' → ' + quente.idasParaLer + ' leituras');
    const id = quente.resultado.id;
    const status = t.medir(() => t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, 'Pago', {}));
    verdadeiro(status.idasParaLer <= 8, 'trocar status: ' + status.idasParaLer + ' leituras');
  });

  teste('a base de casos NUNCA vai para o cache', () => {
    const t = instalado();
    t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'A', status: 'Pendente' });
    t.medir(() => t.chamar('resumoDoCanal')(t.ret.id, {}, 30));
    verdadeiro(t.ambiente.cache.chaves().every((k) => k.indexOf('BASE_') < 0));
    verdadeiro(t.ambiente.cache.chaves().some((k) => k.indexOf('CANAIS') >= 0), 'a configuração vai');
  });

  /* ----------------------------------------------------------------------- */
  secao('Salvar pelo sistema vale na hora');

  teste('salvar um item de lista: o próximo clique já vê', () => {
    const t = instalado();
    t.medir(() => t.chamar('formularioDoCanal')(t.ret.id));
    t.chamar('definirSenhaDeAdministrador')('segredo123', '');
    t.chamar('liberarComSenha')('segredo123');
    t.chamar('salvarItemDoCatalogo')({ tipo: 'TENTATIVA', canalId: '', nome: 'Caixa postal', ordem: 99, ativo: true });
    const depois = t.medir(() => t.chamar('formularioDoCanal')(t.ret.id)).resultado;
    const tentativa = depois.secoes.reduce((todos, s) => todos.concat(s.campos), [])
      .find((c) => c.chave === 'tentativasdecontato');
    verdadeiro(JSON.stringify(tentativa.opcoes).indexOf('Caixa postal') >= 0);
  });

  teste('toda gravação numa aba de configuração esquece o cache dela — e só dela', () => {
    const t = instalado();
    t.medir(() => t.chamar('resumoDoCanal')(t.ret.id, {}, 30));
    verdadeiro(t.ambiente.cache.chaves().some((k) => k.indexOf('|CATALOGO|') >= 0));
    const item = t.chamar('lerRegistros_')('CATALOGO')[0];
    t.chamar('atualizarRegistro_')('CATALOGO', item.__id, { Nome: item.Nome });
    verdadeiro(!t.ambiente.cache.chaves().some((k) => k.indexOf('|CATALOGO|') >= 0), 'CATALOGO saiu');
    verdadeiro(t.ambiente.cache.chaves().some((k) => k.indexOf('|CANAIS|') >= 0), 'CANAIS ficou');
  });

  teste('o dado guardado por uma leitura no meio da gravação não sobrevive a ela', () => {
    // Outra execução lê ENTRE o "esquecer" do começo da gravação e a escrita, e
    // guarda o valor de antes. A limpeza depois de escrever o tira.
    const t = instalado();
    const item = t.chamar('lerRegistros_')('CATALOGO')[0];
    const original = t.contexto.formatarEGravar_;
    t.contexto.formatarEGravar_ = function (estrutura, linha, linhas) {
      t.chamar('guardarNoCacheDaConfiguracao_')('CATALOGO', {}, [{ Nome: 'VELHO' }]);
      return original(estrutura, linha, linhas);
    };
    try {
      t.chamar('atualizarRegistro_')('CATALOGO', item.__id, { Nome: 'Novo nome' });
    } finally {
      t.contexto.formatarEGravar_ = original;
    }
    novaExecucao(t);
    igual(t.chamar('lerRegistros_')('CATALOGO')[0].Nome, 'Novo nome');
  });

  teste('o atualizarPGO esquece o cache inteiro', () => {
    const t = instalado();
    t.medir(() => t.chamar('resumoDoCanal')(t.ret.id, {}, 30));
    verdadeiro(t.ambiente.cache.chaves().length > 0);
    t.chamar('atualizarPGO()');
    verdadeiro(!t.ambiente.cache.chaves().some((k) => k.indexOf('pgo-config-1|') === 0
      && k.indexOf('|USUARIOS|') < 0 && k.indexOf('|CATALOGO|') < 0 && k.indexOf('|CAMPOS|') < 0),
    'o que ele não releu no fim não ficou guardado de antes');
  });

  /* ----------------------------------------------------------------------- */
  secao('Mexer direto na planilha: até 5 minutos, ou o botão');

  teste('a mudança feita à mão aparece quando os 5 minutos vencem', () => {
    const t = instalado();
    const antes = nomeDoCanal(t);
    t.escreverNaPlanilha('CANAIS', t.ret.id, 'Nome', 'RET renomeada à mão');
    igual(nomeDoCanal(t), antes, 'dentro dos 5 minutos, o cache ainda vale');
    t.ambiente.cache.adiantar(301);
    igual(nomeDoCanal(t), 'RET renomeada à mão', 'passados 5 minutos, vale a planilha');
  });

  teste('o botão "Aplicar mudanças da planilha agora" faz valer na hora', () => {
    const t = instalado();
    nomeDoCanal(t);
    t.escreverNaPlanilha('CANAIS', t.ret.id, 'Nome', 'RET do botão');
    const r = t.chamar('aplicarMudancasDaPlanilha')();
    igual(r.minutos, 5);
    verdadeiro(r.abas.indexOf('CANAIS') >= 0);
    igual(nomeDoCanal(t), 'RET do botão');
    verdadeiro(t.chamar('lerRegistros_')('AUDITORIA').some((l) => l.Acao === 'cache.limpar'),
      'e fica na auditoria');
  });

  teste('o botão é de quem mexe na estrutura: a Operação é recusada', () => {
    const t = instalado();
    const operacao = t.chamar('lerRegistros_')('CATALOGO')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id;
    t.chamar('salvarUsuario')({ nome: 'Diego', email: 'diego@exemplo.com', nivelAcessoId: operacao,
      canalId: t.ret.id, ativo: true });
    comoUsuario(t.ambiente, 'diego@exemplo.com', () => {
      lanca(() => t.chamar('aplicarMudancasDaPlanilha')());
    });
  });

  teste('a tela de Estrutura tem o botão e explica os 5 minutos', () => {
    const tela = lerTela('Configuracoes.html');
    contem(tela, 'id="aplicar-mudancas-da-planilha"');
    contem(tela, "Servidor.chamar('aplicarMudancasDaPlanilha')");
    contem(tela, 'por até <strong>5 minutos</strong>');
  });

  /* ----------------------------------------------------------------------- */
  secao('O cache nunca derruba a tela');

  teste('a data volta como data, e não como texto', () => {
    const t = instalado();
    novaExecucao(t);
    t.chamar('lerRegistros_')('USUARIOS');
    novaExecucao(t);
    const usuario = t.chamar('lerRegistros_')('USUARIOS')[0];
    verdadeiro(Object.prototype.toString.call(usuario.DataCadastro) === '[object Date]',
      'DataCadastro veio do cache como Date');
  });

  teste('o CacheService fora do ar: o sistema lê a planilha, como sempre', () => {
    const t = instalado();
    t.contexto.CacheService = { getScriptCache: () => { throw new Error('serviço indisponível'); } };
    novaExecucao(t);
    verdadeiro(t.chamar('formularioDoCanal')(t.ret.id).secoes.length > 0);
    verdadeiro(!!t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'A', status: 'Pendente' }).id);
  });

  teste('o cache que falha ao ler ou gravar também não atrapalha', () => {
    const t = instalado();
    t.contexto.CacheService = { getScriptCache: () => ({
      getAll: () => { throw new Error('falhou'); },
      putAll: () => { throw new Error('falhou'); },
      removeAll: () => { throw new Error('falhou'); }
    }) };
    novaExecucao(t);
    verdadeiro(t.chamar('formularioDoCanal')(t.ret.id).secoes.length > 0);
    verdadeiro(!!t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'A', status: 'Pendente' }).id);
  });

  teste('a aba grande demais para o cache não é guardada — e é lida da planilha', () => {
    const t = instalado();
    t.contexto.RECC_TAMANHO_DO_PEDACO = 100;
    t.contexto.RECC_PEDACOS_POR_ABA = 2;
    novaExecucao(t);
    const lido = t.chamar('lerRegistros_')('CAMPOS');
    verdadeiro(lido.length > 0);
    verdadeiro(!t.ambiente.cache.chaves().some((k) => k.indexOf('|CAMPOS|') >= 0), 'não guardou');
  });

  teste('a aba dividida em pedaços volta inteira — e pedaço que sumiu manda ler a planilha', () => {
    const t = instalado();
    t.contexto.RECC_TAMANHO_DO_PEDACO = 2000;
    t.contexto.RECC_PEDACOS_POR_ABA = 40;
    novaExecucao(t);
    const daPlanilha = t.chamar('lerRegistros_')('CAMPOS');
    const pedacos = t.ambiente.cache.chaves().filter((k) => k.indexOf('|CAMPOS|0#') >= 0);
    verdadeiro(pedacos.length > 1, 'em ' + pedacos.length + ' pedaços');
    novaExecucao(t);
    igual(JSON.stringify(t.chamar('lerRegistros_')('CAMPOS')), JSON.stringify(daPlanilha));
    t.ambiente.cache.limpar();
    t.chamar('guardarNoCacheDaConfiguracao_')('CAMPOS', {}, daPlanilha);
    const segundo = t.ambiente.cache.chaves().find((k) => /\|CAMPOS\|0#1$/.test(k));
    t.contexto.CacheService.getScriptCache().removeAll([segundo]);
    novaExecucao(t);
    igual(JSON.stringify(t.chamar('lerRegistros_')('CAMPOS')), JSON.stringify(daPlanilha),
      'sem um pedaço, leu a planilha — e não meia aba');
  });
}

module.exports = { rodarTestesDeVelocidade };
