/**
 * ============================================================================
 * PGO — medir-susep.js · B5 (Etapa 90): o selo da SUSEP, três estratégias
 * ============================================================================
 *   node Evolucao/Testes/medir-susep.js [--salvar arquivo.json]
 *
 * O selo da SUSEP responde a cada SUSEP digitada no formulário: procura no
 * cadastro de CORRETORAS e, se o canal pede, nas SUSEP_BLOQUEADAS. Três jeitos
 * de procurar, medidos no SIMULADOR (não na planilha de verdade):
 *
 *   localizador  o TextFinder da planilha aponta as linhas, e só elas são
 *                lidas (o que a 1.89 faz — Etapa 63);
 *   coluna       lê a coluna SUSEP inteira e confere na memória (o plano B
 *                que a 1.89 já usa quando o localizador falha);
 *   parcial      lê a coluna em blocos de 1.000. Como vale a ÚLTIMA linha
 *                visível da SUSEP (bloqueada, desbloqueada, bloqueada de
 *                novo), não dá para parar no primeiro achado: lê tudo igual.
 *
 * Cada medida numa execução nova (os memos zerados), com o cache quente, em
 * 1.000, 7.000, 16.000 e 50.000 linhas em CADA aba. As réguas são as do
 * medir-telas.js: a técnica (25 ms por chamada, 0,9 s por milhão de
 * células) e a "RÉGUA PO" (25 ms por chamada, 53 µs por célula, 1 s por busca
 * do localizador) — ESTIMATIVAS. Quem confirma é a M1, na planilha do PO.
 * ============================================================================
 */

const fs = require('fs');
const { carregar } = require('./ferramentas');
const { medidor } = require('./simulador');

function novaExecucao(t) {
  t.chamar('(function(){ estruturasJaLidas = {}; registrosJaLidos = {}; tiposDeclaradosJaLidos = null;'
    + ' cacheDaConfiguracaoLido = null; planilhaDeCadastrosAberta = null; jaTenteiAbrirOsCadastros = false;'
    + ' RECC_DATAS_JA_FORMATADAS = {}; })()');
}

function montar(n) {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  const ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  t.chamar('inserirVariosRegistros_')('CORRETORAS', Array.from({ length: n }, (_, i) => ({
    SUSEP: 'C' + String(i).padStart(5, '0'), Corretora: 'Corretora ' + i, Sucursal: String(i % 90),
    Segmento: i % 3 ? 'Demais corretoras' : 'Diamante', Consultor: 'Consultor ' + (i % 40) })));
  t.chamar('inserirVariosRegistros_')('SUSEP_BLOQUEADAS', Array.from({ length: n }, (_, i) => ({
    SUSEP: 'B' + String(i).padStart(5, '0'), NomeCorretora: 'Bloqueada ' + i, Sucursal: String(i % 90),
    CoordenadorComercial: 'Coord ' + (i % 12), BloqueadaEm: new Date(2026, 0, 1 + (i % 300)), BloqueadaPor: i % 2 ? 'Companhia' : 'Corretora' })));
  return { t, ret };
}

/** A leitura parcial, em blocos: a mesma resposta, só para medir o custo. */
function parcial(t, susep, ret) {
  return t.chamar(`(function (susep, canal) {
    function naAba(aba) {
      var e = estruturaDaAba_(aba); var i = exigirPosicaoDaColuna_(e, 'SUSEP');
      var total = quantidadeDeRegistros_(e); var alvo = normalizarParaComparar_(susep); var linhas = [];
      for (var inicio = 2; inicio < total + 2; inicio += 1000) {
        var quantas = Math.min(1000, total + 2 - inicio);
        e.aba.getRange(inicio, i + 1, quantas, 1).getValues().forEach(function (l, k) {
          if (normalizarParaComparar_(l[0]) === alvo) linhas.push(inicio + k);
        });
      }
      return lerLinhasEspecificas_(aba, linhas).filter(function (r) { return normalizarParaComparar_(r._Visivel) !== 'nao'; });
    }
    var c = naAba('CORRETORAS'); if (c.length) return 'OK';
    return naAba('SUSEP_BLOQUEADAS').length ? 'BLOQUEADA' : 'NAO_ENCONTRADA';
  })`)(susep, ret.id);
}

function medir() {
  const linhas = [];
  [1000, 7000, 16000, 50000].forEach((n) => {
    const { t, ret } = montar(n);
    const casos = [['cadastrada (meio)', 'C' + String(Math.floor(n / 2)).padStart(5, '0')],
      ['bloqueada (fim)', 'B' + String(n - 1).padStart(5, '0')], ['não existe', 'ZZ999']];
    casos.forEach(([cenario, susep]) => {
      ['localizador', 'coluna', 'parcial'].forEach((estrategia) => {
        t.chamar('gravarConfiguracao_')('OPERACAO.BUSCA_RAPIDA', estrategia === 'localizador' ? 'SIM' : 'NAO');
        const rodar = () => (estrategia === 'parcial' ? parcial(t, susep, ret)
          : t.chamar('consultarSusep')(susep, ret.id).situacao);
        novaExecucao(t); rodar();            // aquece o cache da configuração
        novaExecucao(t); medidor.zerar();
        const resposta = rodar();
        const m = medidor.retrato();
        linhas.push({ linhas: n, cenario, estrategia, resposta, chamadas: m.chamadasNoTotal,
          localizador: m.buscasRapidas, celulas: m.celulasLidas,
          msNaRegua: Math.round(m.chamadasNoTotal * 25 + m.celulasLidas / 1e6 * 900),
          msNaReguaDoPO: Math.round(m.chamadasNoTotal * 25 + m.celulasLidas * 0.053 + m.buscasRapidas * 1000) });
      });
    });
    t.chamar('gravarConfiguracao_')('OPERACAO.BUSCA_RAPIDA', 'SIM');
  });
  return linhas;
}

if (require.main === module) {
  const linhas = medir();
  console.log('LINHAS  CENÁRIO              ESTRATÉGIA   RESPOSTA         CHAMADAS LOCALIZ.  CÉLULAS   RÉGUA   RÉGUA PO');
  linhas.forEach((l) => console.log(String(l.linhas).padStart(6) + '  ' + l.cenario.padEnd(20) + ' ' + l.estrategia.padEnd(12)
    + ' ' + l.resposta.padEnd(16) + String(l.chamadas).padStart(8) + String(l.localizador).padStart(9)
    + String(l.celulas).padStart(10) + (l.msNaRegua / 1000).toFixed(2).padStart(7) + ' s' + (l.msNaReguaDoPO / 1000).toFixed(2).padStart(8) + ' s'));
  const i = process.argv.indexOf('--salvar');
  if (i > 0) { fs.writeFileSync(process.argv[i + 1], JSON.stringify(linhas, null, 1)); console.log('Guardado em ' + process.argv[i + 1]); }
}

module.exports = { medir };
