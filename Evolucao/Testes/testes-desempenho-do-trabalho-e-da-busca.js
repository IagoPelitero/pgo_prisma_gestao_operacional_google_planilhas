/**
 * ============================================================================
 * PGO — testes-desempenho-do-trabalho-e-da-busca.js · Etapa 88 (B3, B2, B4)
 * ============================================================================
 * B3: a régua de custo do Trabalho pela planilha do PO (a ida vale ~1.000
 * células, e não 25 mil) e a memória da carga (o aviso de prazo não relê a
 * coluna do status nem as linhas que a fila acabou de ler). Os resultados têm
 * de ser OS MESMOS; só o caminho até eles muda.
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro } = require('./ferramentas');
const { medidor } = require('./simulador');

const DA_RET = 'data de recepção do protocolo';

function retComCasos(quantos, abertos) {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  const ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  const fechados = ['Retido', 'Não retido', 'Pago'];
  const lote = [];
  for (let i = 0; i < quantos; i++) {
    const d = new Date(2026, 10, 18); d.setDate(d.getDate() - Math.floor((quantos - i) / 10));
    lote.push({ [DA_RET]: d, 'nome do cliente': 'Cliente ' + i, analista: i % 3 ? 'Ana Martins' : 'Diego Castilho',
      status: i >= quantos - abertos ? ['Pendente', 'Não trabalhado'][i % 2] : fechados[i % 3], protocolo: 'RET-' + i });
  }
  t.chamar('inserirVariosRegistros_')('BASE_RET', lote);
  t.ret = ret;
  t.novaExecucao = () => t.chamar('(function(){ estruturasJaLidas = {}; registrosJaLidos = {};'
    + ' tiposDeclaradosJaLidos = null; cacheDaConfiguracaoLido = null; })()');
  return t;
}

/** O que a tela usa da resposta — sem o que é medida de tempo. */
function oQueImporta(r) {
  return JSON.stringify({ total: r.total, sub: r.subAbas, cartoes: r.cartoes, filtros: r.filtrosDisponiveis,
    fila: r.fila, perto: r.pertoDeVencer, quantosPerto: r.quantosPertoDeVencer, truncada: r.truncada });
}

function rodarTestesDeDesempenhoDoTrabalhoEDaBusca() {
  console.log('\nEtapa 88: desempenho do Trabalho e da busca, com os mesmos resultados');

  /* ----------------------------------------------------------------------- */
  secao('B3: a aba dos concluídos não lê mais a base inteira');

  teste('a aba 2 lê bem menos que a RET inteira, e mostra o mesmo que a leitura das linhas inteiras', () => {
    const t = retComCasos(2000, 150);
    const largura = t.chamar('estruturaDaAba_')('BASE_RET').cabecalhos.length;
    t.novaExecucao(); medidor.zerar();
    const agora = t.chamar('resumoDoCanal')(t.ret.id, {}, null, '', false, 2);
    const celulas = medidor.retrato().celulasLidas;
    verdadeiro(celulas < 2000 * largura * 0.4, celulas + ' células, contra ' + (2000 * largura) + ' da base inteira');
    t.chamar("RECC_LEITURA_DA_SUB_ABA = 'linhas'");
    let inteira;
    try { inteira = t.chamar('resumoDoCanal')(t.ret.id, {}, null, '', false, 2); }
    finally { t.chamar("RECC_LEITURA_DA_SUB_ABA = ''"); }
    const semFila = (r) => JSON.stringify({ total: r.total, sub: r.subAbas, cartoes: r.cartoes, filtros: r.filtrosDisponiveis });
    igual(semFila(agora), semFila(inteira), 'números, cartões e filtros iguais');
    igual(JSON.stringify(agora.fila.map((c) => c.id)), JSON.stringify(inteira.fila.slice(0, agora.fila.length).map((c) => c.id)),
      'a fila, na mesma ordem');
  });

  /* ----------------------------------------------------------------------- */
  secao('B3: a memória da carga');

  teste('com o aviso de prazo, a coluna do status e as linhas abertas são lidas uma vez só', () => {
    // A planilha no tamanho da do PO (a de medir-telas.js): ali o aviso relia
    // as mesmas 249 linhas abertas que a fila acabava de ler.
    const { t, ret } = require('./medir-telas').montar();
    t.ret = ret;
    t.novaExecucao = () => t.chamar('(function(){ estruturasJaLidas = {}; registrosJaLidos = {};'
      + ' tiposDeclaradosJaLidos = null; cacheDaConfiguracaoLido = null; })()');
    const aba = t.chamar('planilhaAtiva_()').getSheetByName('BASE_RET');
    const proto = Object.getPrototypeOf(aba.getRange(1, 1));
    const original = proto.getValues;
    // Conta cada LINHA inteira e cada COLUNA inteira lidas, e não cada faixa: o
    // aviso lê um pedaço das linhas da fila, e o pedaço repetido também conta.
    const linhas = {}; const colunas = {};
    proto.getValues = function () {
      if (this.aba.nome === 'BASE_RET' && this.linha > 1) {
        if (this.nColunas === 1) colunas[this.coluna] = (colunas[this.coluna] || 0) + 1;
        else for (let l = this.linha; l < this.linha + this.nLinhas; l++) linhas[l] = (linhas[l] || 0) + 1;
      }
      return original.apply(this, arguments);
    };
    try {
      t.novaExecucao();
      t.chamar('resumoDoCanal')(t.ret.id, {}, null, '', true, 1);
    } finally { proto.getValues = original; }
    const linhasRepetidas = Object.keys(linhas).filter((l) => linhas[l] > 1);
    const colunasRepetidas = Object.keys(colunas).filter((c) => colunas[c] > 1);
    verdadeiro(Object.keys(linhas).length > 0, 'leu linhas');
    igual(colunasRepetidas.length, 0, 'nenhuma coluna lida duas vezes: ' + colunasRepetidas.join(', '));
    igual(linhasRepetidas.length, 0, 'nenhuma linha lida duas vezes (' + linhasRepetidas.length + ')');
  });

  teste('a resposta é a mesma, com e sem a memória da carga', () => {
    const t = retComCasos(1500, 120);
    [[1, true], [2, false], [1, false]].forEach(([aba, aviso]) => {
      t.novaExecucao();
      const com = oQueImporta(t.chamar('resumoDoCanal')(t.ret.id, {}, null, '', aviso, aba));
      t.novaExecucao();
      const sem = oQueImporta(t.chamar('resumoDoCanalSemRelogio_')(t.ret.id, {}, null, '', aviso, aba));
      igual(com, sem, 'aba ' + aba + (aviso ? ', com o aviso' : ''));
    });
  });

  teste('a memória some no fim da carga — até quando ela dá erro', () => {
    const t = retComCasos(50, 10);
    t.chamar('resumoDoCanal')(t.ret.id, {}, null, '', true, 1);
    igual(t.chamar('RECC_MEMORIA_DA_CARGA'), null, 'depois da carga');
    let deuErro = false;
    try { t.chamar('resumoDoCanal')('canal-que-nao-existe', {}, null, '', true, 1); } catch (e) { deuErro = true; }
    verdadeiro(deuErro, 'o canal que não existe dá erro');
    igual(t.chamar('RECC_MEMORIA_DA_CARGA'), null, 'e a memória sumiu mesmo assim');
  });

  teste('gravar na aba no meio da carga esquece o que estava na memória', () => {
    const t = retComCasos(30, 10);
    const lida = t.contexto.comMemoriaDaCarga_(function () {
      const antes = t.chamar('lerColunaInteira_')('BASE_RET', 'status').slice();
      const um = t.chamar('lerRegistros_')('BASE_RET', { ultimas: 1 })[0];
      t.chamar('atualizarRegistro_')('BASE_RET', um.__id, { status: 'Retido' });
      const depois = t.chamar('lerColunaInteira_')('BASE_RET', 'status');
      const linhas = t.chamar('lerLinhasEspecificas_')('BASE_RET', [um.__linha]);
      return { antes: antes[antes.length - 1], depois: depois[depois.length - 1], linha: String(linhas[0].status) };
    }, []);
    verdadeiro(lida.antes !== 'Retido', 'antes era outro');
    igual(lida.depois, 'Retido', 'a coluna lida de novo vem da planilha');
    igual(lida.linha, 'Retido', 'e a linha também');
  });

  teste('fora da carga do Trabalho, nada é memorizado', () => {
    const t = retComCasos(30, 10);
    igual(t.chamar('RECC_MEMORIA_DA_CARGA'), null);
    medidor.zerar();
    t.chamar('lerColunaInteira_')('BASE_RET', 'status');
    t.chamar('lerColunaInteira_')('BASE_RET', 'status');
    igual(medidor.retrato().idasParaLer, 2, 'duas leituras, duas idas — como antes');
  });
}

module.exports = { rodarTestesDeDesempenhoDoTrabalhoEDaBusca };
