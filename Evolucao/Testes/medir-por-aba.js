/**
 * ============================================================================
 * PGO — medir-por-aba.js · quantas chamadas cada função faz em CADA aba
 * ============================================================================
 *   node Evolucao/Testes/medir-por-aba.js
 *
 * Estudo de 27/11/2026 ("o que pode virar código em vez de ir na planilha"):
 * a mesma planilha do tamanho da do PO que o medir-telas.js monta, cada função
 * numa execução nova, com o cache da configuração QUENTE (o clique de todo dia)
 * e FRIO (o primeiro clique depois que o cache de 5 minutos vence). Conta as
 * leituras, gravações, getSheetByName, getLastRow e getLastColumn, por aba.
 * Números do SIMULADOR: valem para comparar, não como tempo de verdade.
 * ============================================================================
 */



const { montar } = require('./medir-telas');
const { t, ret, mesa } = montar();
const planilha = t.chamar('planilhaAtiva_()');
const umaAba = planilha.getSheetByName('CANAIS');
const AbaP = Object.getPrototypeOf(umaAba);
const FaixaP = Object.getPrototypeOf(umaAba.getRange(1, 1));
const PlanP = Object.getPrototypeOf(planilha);
let conta = {};
const soma = (aba, tipo, celulas) => { const c = conta[aba] = conta[aba] || { ch: 0, cel: 0 }; c.ch++; c.cel += celulas || 0; };
['getValues', 'getFormulas', 'getDisplayValues', 'setValues', 'setValue'].forEach((m) => {
  const orig = FaixaP[m]; if (!orig) return;
  FaixaP[m] = function () { soma(this.aba.nome, m, this.nLinhas * this.nColunas); return orig.apply(this, arguments); };
});
['getLastRow', 'getLastColumn'].forEach((m) => { const o = AbaP[m]; AbaP[m] = function () { soma(this.nome, m); return o.apply(this, arguments); }; });
const gs = PlanP.getSheetByName; PlanP.getSheetByName = function (n) { soma(n, 'sheet'); return gs.apply(this, arguments); };
const tf = AbaP.createTextFinder; if (tf) AbaP.createTextFinder = function () { soma(this.nome, 'tf'); return tf.apply(this, arguments); };
const fr = FaixaP.createTextFinder; if (fr) FaixaP.createTextFinder = function () { const a = this.aba.nome; const r = fr.apply(this, arguments); const fa = r.findAll; r.findAll = function () { soma(a, 'busca'); return fa.apply(this, arguments); }; return r; };

function novaExecucao() {
  t.chamar('(function(){ estruturasJaLidas = {}; registrosJaLidos = {}; tiposDeclaradosJaLidos = null;'
    + ' cacheDaConfiguracaoLido = null; planilhaDeCadastrosAberta = null; jaTenteiAbrirOsCadastros = false;'
    + ' RECC_DATAS_JA_FORMATADAS = {}; })()');
}
const um = t.chamar('lerRegistros_')('BASE_RET', { ultimas: 1 })[0];
const funcoes = [
  ['pacoteDePartida (abrir o sistema)', () => t.chamar('pacoteDePartida')()],
  ['Trabalho RET aba 1', () => t.chamar('resumoDoCanal')(ret.id, {}, null, '', true, 1)],
  ['Trabalho Mesa aba 1', () => t.chamar('resumoDoCanal')(mesa.id, {}, null, '', true, 1)],
  ['casoParaEditar', () => t.chamar('casoParaEditar')(ret.id, um.__id)],
  ['situacoesParaTrocar', () => t.chamar('situacoesParaTrocar')(ret.id, um.__id)],
  ['camposDaSituacao', () => t.chamar('camposDaSituacao')(ret.id, um.__id, 'Retido')],
  ['alterarSituacaoDoCaso', () => t.chamar('alterarSituacaoDoCaso')(ret.id, um.__id, 'Não trabalhado', {})],
  ['formularioDoCanal', () => t.chamar('formularioDoCanal')(ret.id)],
  ['cadastrarCaso', () => t.chamar('cadastrarCaso')(ret.id, { nomedocliente: 'Novo', status: 'Pendente' })],
  ['buscarCasos (RET, CPF)', () => t.chamar('buscarCasos')('100.000.033-33', [ret.id], false, false, 'cpf')],
  ['produtividadeDaEquipe RET', () => t.chamar('produtividadeDaEquipe')(ret.id, {}, null)]
];
const CONFIG = ['CONFIG', 'CANAIS', 'CAMPOS', 'CATALOGO', 'USUARIOS', 'SINALIZADORES', 'PAINEIS', 'ANALISES'];
const linhas = [];
for (const [nome, f] of funcoes) {
  for (const modo of ['quente', 'frio']) {
    novaExecucao(); try { f(); } catch (e) {}
    novaExecucao();
    if (modo === 'frio') t.chamar('esquecerCacheDaConfiguracao_()');
    novaExecucao(); conta = {};
    let erro = ''; try { f(); } catch (e) { erro = e.message.slice(0, 60); }
    const abas = Object.keys(conta).sort((a, b) => conta[b].ch - conta[a].ch);
    const cfg = abas.filter((a) => CONFIG.includes(a)).reduce((s, a) => s + conta[a].ch, 0);
    const tot = abas.reduce((s, a) => s + conta[a].ch, 0);
    linhas.push(nome.padEnd(34) + modo.padEnd(7) + String(tot).padStart(4) + ' chamadas · config ' + String(cfg).padStart(3) + ' · '
      + abas.map((a) => a + ':' + conta[a].ch + (conta[a].cel > 500 ? '(' + conta[a].cel + 'c)' : '')).join(' ') + (erro ? ' ERRO ' + erro : ''));
  }
}
console.log(linhas.join('\n'));
