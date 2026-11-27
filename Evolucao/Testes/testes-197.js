/**
 * ============================================================================
 * PGO — testes-197.js · menos idas à BASE_RET e a página da fila (Etapa 97)
 * ============================================================================
 * O PO relatou o "não respondeu em 40 segundos" no Trabalho, filtrando e
 * salvando. O "Medir a velocidade" da planilha dele (27/11/2026) mostrou a
 * causa: cada IDA à BASE_RET custa ~1 s (4.292 linhas × 56 colunas), e a
 * célula, quase nada (a aba inteira em 2,2 s). O Trabalho fazia 23 idas; a
 * régua antiga supunha a ida barata. Agora: a última linha é perguntada uma
 * vez por carga, e as colunas que a carga lê vêm juntas.
 *
 * Na mesma versão, o pedido dele: "filtro de 10 com página para próximos 10
 * ou volta os 10 que estava". O "Todos" fica; depois de salvar, a mesma
 * página (se esvaziar, volta uma).
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { secao, teste, igual, verdadeiro, contem, comAFilaDaTela } = require('./ferramentas');
const { retDoPO } = require('./testes-sub-abas-do-trabalho');

const DA_RET = 'data de recepção do protocolo';
const ler = (nome) => fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

/** A RET do tamanho da do PO: 4.291 casos, metade em aberto. */
function retDoTamanhoDaDoPO() {
  const t = retDoPO();
  const lote = []; const hoje = new Date(); let abertos = 0;
  for (let i = 0; i < 4291; i++) {
    const aberto = i % 2 === 0 && abertos < 2130; if (aberto) abertos++;
    lote.push({ [DA_RET]: new Date(hoje.getTime() - (4291 - i) * 14400000), 'nome do cliente': 'C' + i,
      status: aberto ? ['Não trabalhado', 'Pendente', 'Contatando'][i % 3] : ['Pago', 'Cancelado', 'Não retido'][i % 3],
      canal: 'URA' });
  }
  t.chamar('inserirVariosRegistros_')('BASE_RET', lote);
  return t;
}

/** Como uma execução nova do Apps Script: nada lembrado da anterior. */
function novaExecucao(t) {
  t.chamar('(function(){ estruturasJaLidas = {}; registrosJaLidos = {}; tiposDeclaradosJaLidos = null;'
    + ' cacheDaConfiguracaoLido = null; RECC_DATAS_JA_FORMATADAS = {}; })()');
}

/**
 * Quantas vezes `fazer` vai à BASE_RET: as leituras de faixa, a última linha,
 * a última coluna e o pedido da aba. É o que pesa na planilha do PO (~1 s cada).
 */
function idasABaseRet(t, fazer) {
  const planilha = t.chamar('planilhaAtiva_()');
  const aba = planilha.getSheetByName('BASE_RET');
  const AbaP = Object.getPrototypeOf(aba);
  const FaixaP = Object.getPrototypeOf(aba.getRange(1, 1));
  const PlanP = Object.getPrototypeOf(planilha);
  const conta = { leituras: 0, ultimaLinha: 0, ultimaColuna: 0, aba: 0, celulasDeLinhas: 0 };
  const originais = { getValues: FaixaP.getValues, getLastRow: AbaP.getLastRow, getLastColumn: AbaP.getLastColumn,
    getSheetByName: PlanP.getSheetByName };
  const largura = aba.getLastColumn();
  FaixaP.getValues = function () {
    if (this.aba.nome === 'BASE_RET') {
      conta.leituras++;
      if (this.linha > 1 && this.nColunas === largura) conta.celulasDeLinhas += this.nLinhas * this.nColunas;
    }
    return originais.getValues.apply(this, arguments);
  };
  AbaP.getLastRow = function () { if (this.nome === 'BASE_RET') conta.ultimaLinha++; return originais.getLastRow.apply(this, arguments); };
  AbaP.getLastColumn = function () { if (this.nome === 'BASE_RET') conta.ultimaColuna++; return originais.getLastColumn.apply(this, arguments); };
  PlanP.getSheetByName = function (nome) { if (nome === 'BASE_RET') conta.aba++; return originais.getSheetByName.apply(this, arguments); };
  try {
    const resposta = fazer();
    conta.total = conta.leituras + conta.ultimaLinha + conta.ultimaColuna + conta.aba;
    conta.resposta = resposta;
    return conta;
  } finally {
    FaixaP.getValues = originais.getValues; AbaP.getLastRow = originais.getLastRow;
    AbaP.getLastColumn = originais.getLastColumn; PlanP.getSheetByName = originais.getSheetByName;
  }
}

/** Os ids da fila, na ordem da tela. */
const ids = (resumo) => comAFilaDaTela(resumo).fila.map((caso) => String(caso.id));

function rodarTestesDa197() {
  console.log('\nEtapa 97: menos idas à BASE_RET e a página da fila');

  /* ----------------------------------------------------------------------- */
  secao('Menos idas à BASE_RET (a ida custa ~1 s na planilha do PO)');

  const grande = retDoTamanhoDaDoPO();
  const filtrosDoPO = { status: ['Não trabalhado'], canal: ['URA'] };

  teste('o Trabalho do relato (não trabalhados + canal, Mostrar 20): no máximo 7 idas — eram 23', () => {
    novaExecucao(grande); grande.chamar('resumoDoCanal')(grande.ret.id, filtrosDoPO, null, '20', false, 1);
    novaExecucao(grande);
    const medida = idasABaseRet(grande, () => grande.chamar('resumoDoCanal')(grande.ret.id, filtrosDoPO, null, '20', false, 1));
    verdadeiro(medida.total <= 7, medida.total + ' idas: ' + JSON.stringify(medida, (k, v) => (k === 'resposta' ? undefined : v)));
    igual(medida.ultimaLinha, 1, 'a última linha, uma vez por carga');
    verdadeiro(medida.resposta.fila.length > 0, 'e a fila veio');
  });

  teste('a Produtividade da RET: no máximo 7 idas — eram 9', () => {
    novaExecucao(grande); grande.chamar('produtividadeDaEquipe')(grande.ret.id, {}, null);
    novaExecucao(grande);
    const medida = idasABaseRet(grande, () => grande.chamar('produtividadeDaEquipe')(grande.ret.id, {}, null));
    verdadeiro(medida.total <= 7, medida.total + ' idas');
    igual(medida.ultimaLinha, 1, 'a última linha, uma vez por carga');
  });

  teste('as colunas juntas e a última linha lembrada não mudam NADA do que a tela recebe', () => {
    const t = retDoTamanhoDaDoPO();
    const agora = [1, 2].map((aba) => JSON.stringify(t.chamar('resumoDoCanal')(t.ret.id, filtrosDoPO, null, '20', false, aba),
      (k, v) => (k === 'ms' || k === 'tempo' ? undefined : v)));
    const produtividade = JSON.stringify(t.chamar('produtividadeDaEquipe')(t.ret.id, {}, null), (k, v) => (k === 'ms' || k === 'tempo' ? undefined : v));
    // Sem as duas: cada coluna na sua ida e a última linha a cada pergunta.
    t.chamar('(function(){ lerColunasJuntasDeVerdade = lerColunasJuntas_; lerColunasJuntas_ = function () {};'
      + ' lembrarAUltimaLinhaDeVerdade = lembrarAUltimaLinhaDe_; lembrarAUltimaLinhaDe_ = function () {}; })()');
    try {
      const antes = [1, 2].map((aba) => JSON.stringify(t.chamar('resumoDoCanal')(t.ret.id, filtrosDoPO, null, '20', false, aba),
        (k, v) => (k === 'ms' || k === 'tempo' ? undefined : v)));
      // A troca valeu: sem as duas, as idas sobem.
      novaExecucao(t);
      const semAsDuas = idasABaseRet(t, () => t.chamar('resumoDoCanal')(t.ret.id, filtrosDoPO, null, '20', false, 1)).total;
      verdadeiro(semAsDuas > 10, 'sem as duas, ' + semAsDuas + ' idas');
      igual(agora[0], antes[0], 'aba 1 igual');
      igual(agora[1], antes[1], 'aba 2 igual');
      igual(produtividade, JSON.stringify(t.chamar('produtividadeDaEquipe')(t.ret.id, {}, null),
        (k, v) => (k === 'ms' || k === 'tempo' ? undefined : v)), 'Produtividade igual');
    } finally {
      t.chamar('(function(){ lerColunasJuntas_ = lerColunasJuntasDeVerdade; lembrarAUltimaLinhaDe_ = lembrarAUltimaLinhaDeVerdade; })()');
    }
  });

  teste('a última linha lembrada vale só dentro da carga: a próxima vê os casos novos', () => {
    const t = retDoPO();
    t.chamar('inserirVariosRegistros_')('BASE_RET', [{ [DA_RET]: new Date(), status: 'Pendente', 'nome do cliente': 'Caso Antigo' }]);
    const antes = t.chamar('resumoDoCanal')(t.ret.id, {}, null, 'todos', false, 1).total;
    t.chamar('inserirVariosRegistros_')('BASE_RET', [{ [DA_RET]: new Date(), status: 'Pendente', 'nome do cliente': 'Caso Novo' }]);
    igual(t.chamar('resumoDoCanal')(t.ret.id, {}, null, 'todos', false, 1).total, antes + 1);
    igual(t.chamar('RECC_MEMORIA_DA_CARGA'), null, 'fora da carga, não há memória');
  });

  teste('fora da carga, as colunas juntas não leem nada (quem grava nunca usa a memória)', () => {
    const t = retDoPO();
    const medida = idasABaseRet(t, () => t.chamar('lerColunasJuntas_')('BASE_RET', ['status', 'nome do cliente']));
    igual(medida.leituras, 0);
  });

  /* ----------------------------------------------------------------------- */
  secao('A página da fila');

  // 137 casos em aberto: com 10 por página, 14 páginas.
  const t = retDoPO();
  const lote = [];
  for (let i = 0; i < 137; i++) {
    lote.push({ [DA_RET]: new Date(Date.now() - (137 - i) * 3600000), status: ['Pendente', 'Não trabalhado'][i % 2],
      'nome do cliente': 'Caso P' + i, analista: 'Ana Martins' });
  }
  t.chamar('inserirVariosRegistros_')('BASE_RET', lote);
  const resumo = (quantos, pagina, filtros) => t.chamar('resumoDoCanal')(t.ret.id, filtros || {}, null, quantos, false, 1, pagina);
  const todos = ids(resumo('todos'));

  teste('com 10 por página, a página 3 traz do 21º ao 30º caso da fila, na mesma ordem', () => {
    const r = resumo(10, 3);
    const total = r.total;
    igual(r.pagina.atual, 3);
    igual(r.pagina.paginas, Math.ceil(total / 10));
    igual(r.pagina.inicio, 20);
    igual(JSON.stringify(ids(r).slice(0, 10)), JSON.stringify(todos.slice(20, 30)));
  });

  teste('sem a página (a tela aberta antes da atualização), é a página 1 — o mesmo de antes', () => {
    const r = t.chamar('resumoDoCanal')(t.ret.id, {}, null, 10, false, 1);
    igual(r.pagina.atual, 1);
    igual(r.pagina.inicio, 0);
    igual(JSON.stringify(ids(r)), JSON.stringify(todos.slice(0, ids(r).length)));
  });

  teste('com 5 por página, as seguintes vêm junto (virar a página é na hora)', () => {
    const r = resumo(5, 2);
    igual(r.pagina.inicio, 5);
    verdadeiro(ids(r).length >= 15, 'vieram ' + ids(r).length + ' a partir do 6º');
    igual(JSON.stringify(ids(r)), JSON.stringify(todos.slice(5, 5 + ids(r).length)));
  });

  teste('a página além da última vira a última', () => {
    const r = resumo(10, 99);
    igual(r.pagina.atual, r.pagina.paginas);
    igual(JSON.stringify(ids(r)), JSON.stringify(todos.slice((r.pagina.paginas - 1) * 10)));
    igual(resumo(10, 0).pagina.atual, 1, 'zero vira a 1');
    igual(resumo(10, 'x').pagina.atual, 1, 'lixo vira a 1');
  });

  teste('"Todos" não tem página: vem tudo', () => {
    const r = resumo('todos', 4);
    igual(r.pagina.atual, 1);
    igual(r.pagina.paginas, 1);
    igual(ids(r).length, r.total);
  });

  teste('a página vale com o filtro: a 2 do filtro é a 2 da fila filtrada', () => {
    const filtro = { status: ['Pendente'] };
    const daFiltrada = ids(resumo('todos', 1, filtro));
    igual(JSON.stringify(ids(resumo(10, 2, filtro)).slice(0, 10)), JSON.stringify(daFiltrada.slice(10, 20)));
  });

  teste('depois de salvar, a mesma página; se ela esvaziou, a anterior', () => {
    const v = retDoPO();
    const casos = [];
    for (let i = 0; i < 12; i++) casos.push({ [DA_RET]: new Date(Date.now() - (12 - i) * 3600000), status: 'Pendente', 'nome do cliente': 'Caso S' + i });
    v.chamar('inserirVariosRegistros_')('BASE_RET', casos);
    const pagina = (n) => v.chamar('resumoDoCanal')(v.ret.id, {}, null, 10, false, 1, n);
    const segunda = pagina(2);
    igual(segunda.pagina.atual, 2);
    const naSegunda = ids(segunda).slice(0, 10);
    verdadeiro(naSegunda.length >= 1 && naSegunda.length <= 10, naSegunda.length + ' na página 2');
    // Salvar um caso da página 1 como concluído: ela continua existindo.
    const daPrimeira = ids(pagina(1))[0];
    v.chamar('alterarSituacaoDoCaso')(v.ret.id, daPrimeira, 'Não retido', {});
    const depois = pagina(2);
    const quantosAgora = depois.total;
    if (quantosAgora > 10) igual(depois.pagina.atual, 2, 'a mesma página');
    // Concluir até a página 2 esvaziar: volta para a 1.
    let r = depois;
    while (r.total > 10) {
      v.chamar('alterarSituacaoDoCaso')(v.ret.id, ids(pagina(1))[0], 'Não retido', {});
      r = pagina(2);
    }
    igual(r.pagina.atual, 1, 'a página 2 esvaziou: a 1');
    igual(r.pagina.paginas, 1);
  });

  teste('na leitura leve, só as linhas da página pedida vêm inteiras', () => {
    const v = retDoPO();
    const muitos = [];
    for (let i = 0; i < 600; i++) {
      muitos.push({ [DA_RET]: new Date(Date.now() - (600 - i) * 3600000), status: ['Pendente', 'Pago'][i % 2],
        'nome do cliente': 'Caso L' + i });
    }
    v.chamar('inserirVariosRegistros_')('BASE_RET', muitos);
    v.chamar("RECC_LEITURA_DA_SUB_ABA = 'leve'");
    try {
      const largura = v.chamar('estruturaDaAba_')('BASE_RET').cabecalhos.length;
      const buraco = v.chamar('buracoDaRegua_')(v.chamar('estruturaDaAba_')('BASE_RET'));
      const medida = idasABaseRet(v, () => v.chamar('resumoDoCanal')(v.ret.id, {}, null, 20, false, 1, 5));
      igual(medida.resposta.pagina.atual, 5);
      igual(comAFilaDaTela(medida.resposta).fila.length, 20);
      verdadeiro(medida.celulasDeLinhas > 0 && medida.celulasDeLinhas <= 20 * buraco * largura,
        medida.celulasDeLinhas + ' células de linhas inteiras (teto ' + 20 * buraco * largura + ')');
      v.chamar("RECC_LEITURA_DA_SUB_ABA = 'linhas'");
      const inteiras = ids(v.chamar('resumoDoCanal')(v.ret.id, {}, null, 'todos', false, 1));
      igual(JSON.stringify(ids(medida.resposta)), JSON.stringify(inteiras.slice(80, 100)), 'os mesmos casos da leitura inteira');
    } finally { v.chamar("RECC_LEITURA_DA_SUB_ABA = ''"); }
  });

  /* ----------------------------------------------------------------------- */
  secao('A tela');

  teste('o Trabalho pede a página, e trocar filtro, aba, canal ou "Mostrar" volta para a 1', () => {
    const tela = ler('Trabalho.html');
    contem(tela, "quantosNaFila || '', avisarQuandoChegar, subAbaDoCanal(canalEscolhido), paginaDaFila)");
    contem(tela, 'return JSON.stringify([canalEscolhido, subAbaDoCanal(canalEscolhido), quantosNaFila, filtrosEscolhidos]);');
    contem(tela, 'if (chave !== chaveDaPagina) { paginaDaFila = 1; chaveDaPagina = chave; }');
    contem(tela, 'if (resposta.pagina) paginaDaFila = resposta.pagina.atual;');
    const mostrar = tela.substring(tela.indexOf("ligarCliques('[data-mostrar]'"));
    contem(mostrar.substring(0, mostrar.indexOf('\n    });')), 'paginaDaFila = 1;');
  });

  teste('a barra "‹ Anterior · Página X de Y · Próxima ›" mora embaixo da tabela, com estilo', () => {
    const tela = ler('Trabalho.html');
    contem(tela, "+ '<tbody>' + linhas + '</tbody></table></div>'\n      + barraDePaginas() + '</div>';");
    contem(tela, "'<span class=\"fila-pagina-atual\">Página ' + paginaDaFila + ' de ' + paginas + '</span>'");
    contem(tela, "data-pagina=\"anterior\"'\n      + (paginaDaFila <= 1 ? ' disabled' : '')");
    contem(tela, "data-pagina=\"proxima\"'\n      + (paginaDaFila >= paginas ? ' disabled' : '')");
    const estilos = ler('Estilos.html');
    contem(estilos, '.fila-paginas {');
    contem(estilos, '.fila-pagina-atual {');
    contem(estilos, '.mostrar-quantos:disabled {');
  });

  teste('virar para uma página que já veio é na hora; a que não veio vai ao servidor', () => {
    const tela = ler('Trabalho.html');
    const clique = tela.substring(tela.indexOf("ligarCliques('[data-pagina]'"));
    const corpo = clique.substring(0, clique.indexOf('\n    });'));
    contem(corpo, 'if (paginaJaVeio(qual)) { desenharPainel(); return; }');
    contem(corpo, "carregar('Trazendo a página ' + qual + '…');");
  });

  teste('a página não fica guardada no navegador (só o número do "Mostrar", como antes)', () => {
    const tela = ler('Trabalho.html');
    verdadeiro(!/localStorage\.setItem\([^)]*[Pp]agina/.test(tela), 'nenhum setItem da página');
  });
}

module.exports = { rodarTestesDa197 };
