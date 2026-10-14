/**
 * ============================================================================
 * PGO — testes-varredura-geral.js · a varredura geral, dentro da suíte
 * ============================================================================
 * Pedido do PO: "consegue gerar um teste em todo o sistema para capturar bugs,
 * erros e quebras?"
 *
 * A ferramenta é `varredura-geral.js` (o comando completo, com os quatro
 * níveis e as seis chamadas gravadas por função). Aqui vai a parte que cabe
 * no dia a dia, para que uma função NOVA seja varrida no mesmo dia em que
 * nasce, sem ninguém lembrar de escrever teste para ela:
 *
 *   - cada função pública, com o inesperado em cada parâmetro, como
 *     administrador: nenhum erro cru do JavaScript;
 *   - as mesmas, por alguém SEM cadastro: nenhum dado entregue;
 *   - as chamadas que a tela fez de verdade, com um campo estragado de cada
 *     vez: nenhum erro cru.
 *
 * E as guardas dos dois achados da varredura (itens 96 e 97).
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comAFilaDaTela,
  lerPeca } = require('./ferramentas');
const varredura = require('./varredura-geral');

function resumoDosDefeitos(defeitos) {
  const vistos = {};
  defeitos.forEach((d) => { vistos[d.funcao + ' — ' + d.tipo + ': ' + d.detalhe] = true; });
  return Object.keys(vistos).slice(0, 6).join(' | ');
}

function instalado() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.chamar('definirSenhaDeAdministrador')('segredo123', '');
  t.chamar('liberarComSenha')('segredo123');
  const canais = t.chamar('canaisVisiveis_()');
  t.ret = canais.find((c) => c.aba === 'BASE_RET');
  return t;
}

function rodarTestesDaVarreduraGeral() {
  console.log('\nA varredura geral: o sistema inteiro, atrás do que quebra');

  /* ----------------------------------------------------------------------- */
  secao('Cada função pública, com o inesperado');

  teste('como administrador: nenhuma função estoura com erro cru do JavaScript', () => {
    const r = varredura.varrerPrimeira([], { quieto: true, so: ['Administrador (liberado)'] });
    verdadeiro(r.chamadas > 1000, 'a varredura chamou de verdade: ' + r.chamadas);
    igual(r.defeitos.length, 0, resumoDosDefeitos(r.defeitos));
  });

  teste('sem cadastro: nenhuma função entrega dado, e nenhuma estoura', () => {
    const r = varredura.varrerPrimeira([], { quieto: true, so: ['sem cadastro'] });
    igual(r.defeitos.length, 0, resumoDosDefeitos(r.defeitos));
  });

  teste('as chamadas que a tela fez de verdade, com um campo estragado de cada vez', () => {
    const r = varredura.varrerAFundo([varredura.CHAMADAS_GRAVADAS], [],
      { quieto: true, porFuncao: 2 });
    verdadeiro(r.funcoes > 40, 'as gravações cobrem ' + r.funcoes + ' funções');
    igual(r.defeitos.length, 0, resumoDosDefeitos(r.defeitos));
  });

  teste('toda função nova entra na varredura sozinha: a lista sai do código', () => {
    const nomes = varredura.funcoesPublicas().map((f) => f.nome);
    verdadeiro(nomes.length >= 100, nomes.length + ' funções públicas');
    verdadeiro(nomes.indexOf('resumoDoCanal') >= 0 && nomes.indexOf('detalharComponente') >= 0);
    verdadeiro(nomes.every((n) => !/_$/.test(n)), 'as privadas (com "_") ficam de fora');
  });

  teste('o erro cru é reconhecido, e o recado em português não', () => {
    verdadeiro(varredura.ehErroInterno(new TypeError("Cannot read properties of null (reading 'nome')")));
    verdadeiro(varredura.ehErroInterno(new Error('x.map is not a function')));
    verdadeiro(!varredura.ehErroInterno(new Error('Dê um nome ao item.')));
  });

  /* ----------------------------------------------------------------------- */
  secao('Item 96 — o formulário que não chega');

  const RECADO = 'Recarregue a página';
  [['salvarCorretora', (t) => [null]], ['bloquearSusep', (t) => [null]],
    ['salvarConfiguracaoDoLegado', (t) => [null]], ['salvarCampo', (t) => [null]],
    ['criarCampo', (t) => [t.ret.id, null]], ['salvarItemDoCatalogo', (t) => [null]],
    ['salvarNivelDeAcesso', (t) => [null]], ['salvarCanal', (t) => [null]],
    ['criarCanal', (t) => [null]], ['salvarIdentidade', (t) => [null]],
    ['salvarAnalise', (t) => [null]], ['salvarSinalizador', (t) => [null]],
    ['salvarUsuario', (t) => [undefined]]
  ].forEach(([nome, args]) => {
    teste(nome + ' sem os dados: recado que manda recarregar, e nada gravado', () => {
      const t = instalado();
      const antes = JSON.stringify(t.ambiente.planilha.getSheets().map((a) => a.getLastRow()));
      const erro = lanca(() => t.chamar(nome).apply(null, args(t)), RECADO);
      verdadeiro(!varredura.ehErroInterno(erro), 'não é erro cru: ' + erro.message);
      igual(JSON.stringify(t.ambiente.planilha.getSheets().map((a) => a.getLastRow())), antes,
        'nenhuma aba mudou');
    });
  });

  teste('a busca com "onde procurar" que não é lista procura em tudo, sem estourar', () => {
    const t = instalado();
    const comTexto = t.chamar('buscarCasos')('Cliente', 'RET', false);
    const semNada = t.chamar('buscarCasos')('Cliente', [], false);
    igual(JSON.stringify(comTexto), JSON.stringify(semNada));
  });

  teste('reordenar com a ordem que não é lista não estoura', () => {
    const t = instalado();
    t.chamar('reordenarCampos')(t.ret.id, 'abc');
  });

  teste('card vazio na lista: recado com o número do card', () => {
    const t = instalado();
    lanca(() => t.chamar('salvarCardsDoPainel')('trabalho', t.ret.id, [null]),
      'O card 1 chegou vazio');
  });

  teste('a permissão continua sendo conferida ANTES dos dados', () => {
    // Quem não pode gravar ouve "não tem permissão", e não "recarregue".
    const t = instalado();
    t.ambiente.definirEmail('ninguem.cadastrado@exemplo.com');
    const erro = lanca(() => t.chamar('salvarUsuario')(null));
    verdadeiro(erro.message.indexOf(RECADO) < 0, 'veio: ' + erro.message);
  });

  /* ----------------------------------------------------------------------- */
  secao('Item 97 — a lista da fatia do gráfico, na Produtividade');

  function retComCasos(quantos) {
    const t = instalado();
    const hoje = new Date();
    const lote = [];
    for (let i = 0; i < quantos; i++) {
      lote.push({ 'data de recepção do protocolo': hoje, analista: 'Ana Martins',
        'nome do cliente': 'Cliente ' + i, status: 'Pendente', canal: 'URA' });
    }
    t.chamar('inserirVariosRegistros_')('BASE_RET', lote);
    t.grafico = t.chamar('produtividadeDaEquipe')(t.ret.id, {}, 30).componentes
      .find((c) => c.titulo === 'Situação dos casos');
    t.ponto = t.grafico.pontos.find((p) => p.rotulo === 'Pendente');
    return t;
  }

  teste('vêm os 100 mais recentes, e o total diz quantos são', () => {
    const t = retComCasos(250);
    const detalhe = comAFilaDaTela(t.chamar('detalharComponente')(t.ret.id, t.grafico.id,
      t.ponto.chave, {}, 30));
    igual(detalhe.casos.length, 100);
    igual(detalhe.total, 250);
    contem(JSON.stringify(detalhe.casos[0].celulas), 'Cliente 249', 'o mais recente em cima');
  });

  teste('"Mostrar todos" traz a fatia inteira', () => {
    const t = retComCasos(250);
    const detalhe = t.chamar('detalharComponente')(t.ret.id, t.grafico.id, t.ponto.chave,
      {}, 30, 'todos');
    igual(detalhe.casos.length, 250);
  });

  teste('com 5.000 casos, a lista cabe em poucos KB', () => {
    const t = retComCasos(5000);
    const tamanho = JSON.stringify(t.chamar('detalharComponente')(t.ret.id, t.grafico.id,
      t.ponto.chave, {}, 30)).length;
    verdadeiro(tamanho < 150 * 1024, 'a lista tem ' + Math.round(tamanho / 1024) + ' KB (era 6,6 MB)');
  });

  teste('a tela remonta a lista e oferece "Mostrar todos"', () => {
    const tela = lerPeca('Produtividade');
    contem(tela, 'resposta.casos = TelaTrabalho.expandirFila(resposta.casos, resposta.colunas);');
    contem(tela, "'Mostrar todos (' + detalhe.total + ')</button></div>'");
    contem(tela, "chaveDoPonto, filtros, periodo, todos ? 'todos' : '')");
    contem(tela, "+ (detalhe.casos.length < detalhe.total",
      'o botão aparece quando vieram menos casos do que o total');
  });
}

module.exports = { rodarTestesDaVarreduraGeral };
