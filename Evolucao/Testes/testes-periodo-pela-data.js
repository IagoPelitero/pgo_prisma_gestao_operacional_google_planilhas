/**
 * ============================================================================
 * PGO — testes-periodo-pela-data.js · qualquer mês completo (Etapa 65)
 * ============================================================================
 * Achado da análise de 29/10: o Trabalho e a Produtividade só olhavam as
 * últimas 5.000 linhas, e um mês de três meses atrás saía pela metade. A
 * escolha do PO: ler pela coluna da data — acha as linhas do período e lê só
 * elas, com a mesma conta de antes.
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro } = require('./ferramentas');

const COLUNA = 'data de recepção do protocolo';

function dia(diasAtras) {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
}

function mesDe(diasAtras) {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return { tipo: 'mes', mes: d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) };
}

function preparar() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  t.casos = (quantos, diasAtras, extra) => t.chamar('inserirVariosRegistros_')('BASE_RET',
    Array.from({ length: quantos }, (_, i) => Object.assign({ [COLUNA]: dia(diasAtras),
      analista: 'Ana Martins', status: i % 2 ? 'Pendente' : 'Retido', 'nome do cliente': 'C' + i }, extra || {})));
  t.medir = (fazer) => {
    const antes = t.ambiente.medidor.retrato();
    const resultado = fazer();
    return { resultado, celulas: t.ambiente.medidor.retrato().celulasLidas - antes.celulasLidas };
  };
  return t;
}

/** O jeito de antes, para comparar: a base inteira, filtrada pela mesma conta. */
function comOJeitoDeAntes(t, fazer) {
  t.chamar('var __porData = registrosDosPeriodos_; registrosDosPeriodos_ = function (canal) { '
    + 'return { registros: lerRegistros_(canal.aba, { ultimas: 1000000 }), truncada: false }; };');
  try { return fazer(); } finally { t.chamar('registrosDosPeriodos_ = __porData;'); }
}

function semOQueMudaDeLeitura(resposta) {
  const copia = JSON.parse(JSON.stringify(resposta));
  delete copia.linhasLidas;
  delete copia.truncada;
  return JSON.stringify(copia);
}

function rodarTestesDoPeriodoPelaData() {
  console.log('\nEtapa 65: o período lido pela coluna da data');

  /* ----------------------------------------------------------------------- */
  secao('Qualquer mês, completo');

  const t = preparar();
  // O teto acima do mês mais cheio: aqui se compara a conta, e não o corte.
  t.chamar('gravarConfiguracao_')('OPERACAO.LINHAS_DO_PAINEL', '20000');
  t.casos(1200, 150);                          // um mês de 5 meses atrás, lá no começo da base
  t.casos(5200, 3);                            // e muito caso recente depois dele
  t.casos(3, 3, { [COLUNA]: '' });             // sem data
  t.chamar('inserirVariosRegistros_')('BASE_RET', [{ [COLUNA]: dia(150), status: 'Pago',
    'nome do cliente': 'Excluído', _Visivel: 'NAO' }]);

  teste('o mês de 5 meses atrás vem inteiro, sem aviso de parte', () => {
    const produtividade = t.chamar('produtividadeDaEquipe')(t.ret.id, {}, mesDe(150));
    igual(produtividade.total, 1200, 'antes: 0, porque as últimas 5.000 linhas eram todas recentes');
    igual(produtividade.truncada, false);
    const trabalho = t.chamar('resumoDoCanal')(t.ret.id, {}, mesDe(150));
    igual(trabalho.totalNoPeriodo, 1200);
  });

  teste('a mesma conta de antes: a resposta é igual à da base inteira', () => {
    [mesDe(150), mesDe(3), { tipo: 'intervalo', de: '', ate: '' }].forEach((periodo) => {
      const agora = t.chamar('produtividadeDaEquipe')(t.ret.id, {}, periodo);
      const antes = comOJeitoDeAntes(t, () => t.chamar('produtividadeDaEquipe')(t.ret.id, {}, periodo));
      verdadeiro(semOQueMudaDeLeitura(agora) === semOQueMudaDeLeitura(antes),
        'Produtividade ' + JSON.stringify(periodo) + ': ' + agora.total + ' contra ' + antes.total);
      const filtros = { status: 'Retido' };
      verdadeiro(semOQueMudaDeLeitura(t.chamar('resumoDoCanal')(t.ret.id, filtros, periodo))
        === semOQueMudaDeLeitura(comOJeitoDeAntes(t, () => t.chamar('resumoDoCanal')(t.ret.id, filtros, periodo))),
        'Trabalho ' + JSON.stringify(periodo));
    });
  });

  teste('o caso excluído e a linha sem data seguem as regras de sempre', () => {
    const doMes = t.chamar('produtividadeDaEquipe')(t.ret.id, {}, mesDe(150));
    verdadeiro(doMes.total === 1200, 'o excluído não conta');
    const abertura = t.chamar('resumoDoCanal')(t.ret.id, {}, { tipo: 'intervalo', de: '', ate: '' });
    const fechado = t.chamar('resumoDoCanal')(t.ret.id, {}, mesDe(3));
    igual(abertura.totalNoPeriodo - fechado.totalNoPeriodo, 3, 'os 3 sem data, só na abertura');
    igual(comOJeitoDeAntes(t, () => t.chamar('resumoDoCanal')(t.ret.id, {}, { tipo: 'intervalo', de: '', ate: '' }))
      .totalNoPeriodo, abertura.totalNoPeriodo, 'a abertura guarda os sem data, como antes');
  });

  teste('clicar num gráfico do mês antigo lista o mesmo tanto que a barra mostra', () => {
    const produtividade = t.chamar('produtividadeDaEquipe')(t.ret.id, {}, mesDe(150));
    const componente = produtividade.componentes.find((c) => c.pontos && c.pontos.length);
    const ponto = componente.pontos[0];
    const detalhe = t.chamar('detalharComponente')(t.ret.id, componente.id, ponto.chave, {}, mesDe(150), 'todos');
    igual(detalhe.total, ponto.valor);
  });

  /* ----------------------------------------------------------------------- */
  secao('O custo');

  teste('o mês antigo lê a coluna da data e as linhas dele — não a base inteira', () => {
    const medido = t.medir(() => t.chamar('produtividadeDaEquipe')(t.ret.id, {}, mesDe(150)));
    const largura = t.chamar('estruturaDaAba_')('BASE_RET').cabecalhos.length;
    verdadeiro(medido.celulas < 6404 + 2600 * largura,
      medido.celulas + ' células (a base inteira: ' + 6404 * largura + ')');
  });

  teste('passou do teto: as linhas do período vêm primeiro, e a tela avisa', () => {
    const p = preparar();
    p.chamar('gravarConfiguracao_')('OPERACAO.LINHAS_DO_PAINEL', '50');
    p.casos(40, 40);   // o mês anterior
    p.casos(40, 5);    // o mês da tela: 40 mais antigos...
    p.casos(40, 2);    // ...e 40 mais recentes
    const mes = mesDe(3);
    const lido = p.chamar('registrosDosPeriodos_')(p.ret, [
      { de: new Date(Date.now() - 10 * 864e5), ate: new Date() },
      { de: new Date(Date.now() - 60 * 864e5), ate: new Date(Date.now() - 20 * 864e5) }]);
    igual(lido.registros.length, 50);
    igual(lido.truncada, true);
    const doDia = (n) => lido.registros.filter((r) => p.chamar('comoSeEscreve_')(r[COLUNA]) === dia(n)).length;
    igual(doDia(2) + '|' + doDia(5) + '|' + doDia(40), '40|10|0',
      'as mais recentes do período da tela; o anterior não entra');
    igual(p.chamar('produtividadeDaEquipe')(p.ret.id, {}, mes).truncada, true);
  });

  teste('base colada fora da ordem das datas: volta a ler o fim, e avisa se faltou caso', () => {
    const p = preparar();
    const linhas = [];
    for (let i = 0; i < 6000; i++) {
      linhas.push({ [COLUNA]: dia(i % 120), status: 'Pendente', 'nome do cliente': 'F' + i });
    }
    p.chamar('inserirVariosRegistros_')('BASE_RET', linhas);
    p.chamar('gravarConfiguracao_')('OPERACAO.LINHAS_DO_PAINEL', '2000');
    const antes = p.ambiente.medidor.retrato().idasParaLer;
    const resposta = p.chamar('produtividadeDaEquipe')(p.ret.id, {}, mesDe(30));
    const idas = p.ambiente.medidor.retrato().idasParaLer - antes;
    verdadeiro(idas < 15, idas + ' idas — cada pedaço espalhado seria uma');
    igual(resposta.linhasLidas, 2000, 'leu o fim, como antes');
    igual(resposta.truncada, true, 'e sabe que ficou caso do período de fora');
  });
}

module.exports = { rodarTestesDoPeriodoPelaData };
