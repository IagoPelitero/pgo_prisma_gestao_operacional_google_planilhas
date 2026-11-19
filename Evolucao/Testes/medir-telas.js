/**
 * ============================================================================
 * PGO — medir-telas.js · quanto cada tela custa, antes e depois (Etapa 86, M3)
 * ============================================================================
 *   node Evolucao/Testes/medir-telas.js                        mostra a tabela
 *   node Evolucao/Testes/medir-telas.js --salvar arquivo.json  guarda a linha de base
 *   node Evolucao/Testes/medir-telas.js --comparar arquivo.json  antes × agora
 *
 * A planilha no TAMANHO DA DO PO (18/11/2026): RET com 3.571 casos, Mesa com
 * 527, VG com 119, CORRETORAS com 7.126 linhas, AUDITORIA com 7.126. Cada
 * função das telas prioritárias roda numa EXECUÇÃO NOVA (os memos da execução
 * zerados), com o cache da configuração quente — o clique de todo dia.
 *
 * O que se conta (simulador.js): as idas de leitura e gravação, as células, as
 * buscas do localizador e — desde a M3 — as chamadas de estrutura que a conta
 * de idas não via: getSheetByName, getLastRow e getLastColumn. O tempo é a
 * régua do estresse.js (25 ms por chamada, 0,9 s por milhão de células); a
 * planilha do PO é mais lenta que a régua, e a M1 ("Medir a velocidade", na
 * planilha de verdade) é quem diz quanto. Aqui vale a COMPARAÇÃO.
 *
 * A SEGUNDA RÉGUA (Etapa 88), "RÉGUA PO": uma ESTIMATIVA tirada da aba ERROS
 * do PO (18/11/2026), não uma medição — o Buscar Caso fez 13 leituras pequenas
 * em 0,3 s "lendo" (≈ 25 ms por chamada) e a Produtividade leu suas faixas
 * grandes em 10,1 s (≈ 53 µs por célula, contando as 189 mil células da
 * planilha toda). Na planilha do PO a célula pesa ~60 vezes mais que na régua
 * de cima, e a chamada pesa o mesmo. A busca do localizador: o Buscar Caso
 * passou de 6 a 31 s "procurando" com umas 11 buscas — 0,5 a 2,8 s cada; a régua
 * usa 1 s. Quem confirma é a M1.
 * ============================================================================
 */

const fs = require('fs');
const { carregar } = require('./ferramentas');
const { medidor } = require('./simulador');

function montar() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  const canais = t.chamar('canaisVisiveis_()');
  const ret = canais.find((c) => c.aba === 'BASE_RET');
  const mesa = canais.find((c) => c.aba === 'BASE_MESA');
  const vg = canais.find((c) => c.aba === 'BASE_VG');
  const fechados = ['Retido', 'Não retido', 'Pago', 'Cancelado', 'Sem sucesso de contato'];
  const lote = [];
  for (let i = 0; i < 3571; i++) {
    const d = new Date(2026, 10, 18);
    d.setDate(d.getDate() - Math.floor((3571 - i) / 12));
    lote.push({ 'data de recepção do protocolo': d, 'nome do cliente': 'Cliente ' + i, analista: 'Ana Martins',
      status: i > 3571 - 250 ? ['Pendente', 'Não trabalhado'][i % 2] : fechados[i % 5],
      protocolo: 'RET-' + i, CPF: String(10000000000 + i), SUSEP: 'S' + (i % 7000) });
  }
  t.chamar('inserirVariosRegistros_')('BASE_RET', lote);
  t.chamar('inserirVariosRegistros_')('BASE_MESA', Array.from({ length: 527 }, (_, i) => ({
    Status: i > 480 ? 'Em andamento' : 'Concluído', 'Nome do segurado': 'Seg ' + i, Analista: 'Ana Martins' })));
  t.chamar('inserirVariosRegistros_')('BASE_VG', Array.from({ length: 119 }, (_, i) => ({
    'TK/Assunto': 'VG ' + i, Status: 'Pendente', Analista: 'Ana Martins' })));
  t.chamar('inserirVariosRegistros_')('CORRETORAS', Array.from({ length: 7126 }, (_, i) => ({
    SUSEP: 'S' + i, Corretora: 'Corretora ' + i, Sucursal: 'Suc', Segmento: i % 9 ? 'Ouro' : 'Diamante', Consultor: 'C' })));
  t.chamar('inserirVariosRegistros_')('AUDITORIA', Array.from({ length: 7126 }, () => ({
    DataHora: new Date(), Acao: 'x', Detalhe: 'y' })));
  return { t, ret, mesa, vg };
}

/** Uma execução nova: o que o Apps Script esquece entre um clique e outro. */
function novaExecucao(t) {
  t.chamar('(function(){ estruturasJaLidas = {}; registrosJaLidos = {}; tiposDeclaradosJaLidos = null;'
    + ' cacheDaConfiguracaoLido = null; planilhaDeCadastrosAberta = null; jaTenteiAbrirOsCadastros = false;'
    + ' RECC_DATAS_JA_FORMATADAS = {}; })()');
}

function medirTudo() {
  const { t, ret, mesa, vg } = montar();
  const um = t.chamar('lerRegistros_')('BASE_RET', { ultimas: 1 })[0];
  const versao = () => t.chamar('versaoDoCaso_')(
    t.chamar('buscarRegistros_')('BASE_RET', 'Id', String(um.__id), 1)[0], 'BASE_RET');
  const funcoes = [
    ['Abrir', 'pacoteDePartida', () => t.chamar('pacoteDePartida')()],
    ['Trabalho', 'RET aba 1 (entrar, com aviso)', () => t.chamar('resumoDoCanal')(ret.id, {}, null, '', true, 1)],
    ['Trabalho', 'RET aba 2', () => t.chamar('resumoDoCanal')(ret.id, {}, null, '', false, 2)],
    ['Trabalho', 'RET busca de texto', () => t.chamar('resumoDoCanal')(ret.id, { busca: 'Cliente 3500' }, null, '', false, 1)],
    ['Trabalho', 'Mesa aba 1', () => t.chamar('resumoDoCanal')(mesa.id, {}, null, '', true, 1)],
    ['Trabalho', 'VG', () => t.chamar('resumoDoCanal')(vg.id, {}, null, '', true)],
    ['Trabalho', 'casoParaEditar', () => t.chamar('casoParaEditar')(ret.id, um.__id)],
    ['Trabalho', 'editarCaso', () => t.chamar('editarCaso')(ret.id, um.__id, { nomedocliente: 'Editado', status: 'Pendente' }, versao())],
    ['Trabalho', 'alterarSituacaoDoCaso', () => t.chamar('alterarSituacaoDoCaso')(ret.id, um.__id, 'Não trabalhado', {})],
    ['Cadastrar', 'formularioDoCanal', () => t.chamar('formularioDoCanal')(ret.id)],
    ['Cadastrar', 'consultarSusep (cadastrada)', () => t.chamar('consultarSusep')('S4242', ret.id)],
    ['Cadastrar', 'consultarSusep (não existe)', () => t.chamar('consultarSusep')('ZZ999', ret.id)],
    ['Cadastrar', 'conferirPropostaRepetida', () => t.chamar('conferirPropostaRepetida')('7-1234567', ret.id, '', '')],
    ['Cadastrar', 'cadastrarCaso', () => t.chamar('cadastrarCaso')(ret.id, { nomedocliente: 'Novo', status: 'Pendente' })],
    ['Buscar', 'buscarCasos protocolo', () => t.chamar('buscarCasos')('RET-3333', [], false)],
    ['Buscar', 'buscarCasos nome', () => t.chamar('buscarCasos')('Cliente 1234', [], false)],
    ['Buscar', 'buscarCasos não existe', () => t.chamar('buscarCasos')('zzzznaoexiste', [], false)],
    // Etapa 89: "Pesquisar por", só na RET, ao lado da avançada também só na RET.
    ['Buscar RET', 'avançada (só RET), CPF', () => t.chamar('buscarCasos')('100.000.033-33', [ret.id], false, false, 'avancada')],
    ['Buscar RET', 'por CPF', () => t.chamar('buscarCasos')('100.000.033-33', [ret.id], false, false, 'cpf')],
    ['Buscar RET', 'por Nome do segurado', () => t.chamar('buscarCasos')('Cliente 3333', [ret.id], false, false, 'nome')],
    ['Buscar RET', 'por Proposta', () => t.chamar('buscarCasos')('7-0003333', [ret.id], false, false, 'proposta')],
    ['Buscar RET', 'por Apólice', () => t.chamar('buscarCasos')('12-1391-0003333', [ret.id], false, false, 'apolice')],
    ['Buscar RET', 'busca rápida', () => t.chamar('buscarCasos')('Cliente 3333', [ret.id], false, false, 'rapida')],
    ['Buscar RET', 'por CPF, não existe', () => t.chamar('buscarCasos')('999.999.999-99', [ret.id], false, false, 'cpf')],
    ['Buscar RET', 'avançada (só RET), não existe', () => t.chamar('buscarCasos')('zzzznaoexiste', [ret.id], false, false, 'avancada')],
    ['Config', 'resumoDasConfiguracoes', () => t.chamar('resumoDasConfiguracoes')()],
    ['Config', 'listarCamposDoCanal', () => t.chamar('listarCamposDoCanal')(ret.id)],
    ['Config', 'listarCanaisConfiguraveis', () => t.chamar('listarCanaisConfiguraveis')()],
    ['Produtividade', 'produtividadeDaEquipe RET', () => t.chamar('produtividadeDaEquipe')(ret.id, {}, null)]
  ];
  return funcoes.map(([tela, nome, f]) => {
    novaExecucao(t);
    try { f(); } catch (e) { /* aquece o cache; a medida é a segunda */ }
    novaExecucao(t);
    medidor.zerar();
    let erro = '';
    try { f(); } catch (e) { erro = e.message.slice(0, 80); }
    const m = medidor.retrato();
    return { tela, nome, chamadas: m.chamadasNoTotal, idas: m.idasNoTotal, localizador: m.buscasRapidas,
      estrutura: m.abasPedidas + m.ultimasLinhas + m.ultimasColunas, celulas: m.celulasLidas,
      msNaRegua: Math.round(m.chamadasNoTotal * 25 + m.celulasLidas / 1e6 * 900),
      msNaReguaDoPO: Math.round(m.chamadasNoTotal * 25 + m.celulasLidas * 0.053 + m.buscasRapidas * 1000), erro };
  });
}

function imprimir(agora, antes) {
  const porNome = {};
  (antes || []).forEach((l) => { porNome[l.tela + '|' + l.nome] = l; });
  const dif = (a, b) => (b === undefined ? '' : (a === b ? ' =' : (a < b ? ' ↓' : ' ↑')
    + (Number.isInteger(a) && Number.isInteger(b) ? Math.abs(a - b) : Math.abs(a - b).toFixed(1))));
  console.log('TELA'.padEnd(14) + 'FUNÇÃO'.padEnd(34) + 'CHAMADAS'.padStart(13) + 'LOCALIZ.'.padStart(11)
    + 'CÉLULAS'.padStart(18) + 'RÉGUA'.padStart(10) + 'RÉGUA PO'.padStart(16));
  agora.forEach((l) => {
    const b = porNome[l.tela + '|' + l.nome];
    console.log(l.tela.padEnd(14) + l.nome.padEnd(34)
      + (l.chamadas + dif(l.chamadas, b && b.chamadas)).padStart(13)
      + (l.localizador + dif(l.localizador, b && b.localizador)).padStart(11)
      + (l.celulas.toLocaleString('pt-BR') + dif(l.celulas, b && b.celulas)).padStart(18)
      + ((l.msNaRegua / 1000).toFixed(1) + ' s').padStart(10)
      + (((l.msNaReguaDoPO || 0) / 1000).toFixed(1) + ' s' + (b && b.msNaReguaDoPO !== undefined ? dif(Math.round(l.msNaReguaDoPO / 100) / 10, Math.round(b.msNaReguaDoPO / 100) / 10) : '')).padStart(16)
      + (l.erro ? '  ERRO: ' + l.erro : ''));
  });
}

if (require.main === module) {
  const arg = (nome) => { const i = process.argv.indexOf(nome); return i > 0 ? process.argv[i + 1] : null; };
  const agora = medirTudo();
  const comparar = arg('--comparar');
  imprimir(agora, comparar ? JSON.parse(fs.readFileSync(comparar, 'utf8')).medidas : null);
  const salvar = arg('--salvar');
  if (salvar) {
    fs.writeFileSync(salvar, JSON.stringify({ quando: new Date().toISOString(), medidas: agora }, null, 1));
    console.log('\nLinha de base guardada em ' + salvar);
  }
}

module.exports = { medirTudo, montar };
