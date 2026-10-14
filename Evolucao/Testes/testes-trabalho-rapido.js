/**
 * ============================================================================
 * PGO — testes-trabalho-rapido.js · o Trabalho que não estoura os 40 segundos
 * ============================================================================
 * Relato do PO: "a aba Trabalho vem demorando para carregar e, quando carrega,
 * traz um erro informando o problema de 40 s para responder".
 *
 * A causa: a fila ia INTEIRA para a tela, e cada célula levava o nome da
 * coluna junto. Com 5.000 casos no período, a resposta tinha 6 MB — o Apps
 * Script leva dezenas de segundos para atravessar isso até o navegador, e a
 * tela desiste nos 40.
 *
 * O que o PO escolheu, e o que estes testes seguram:
 *   A. a fila vai COMPACTA — só os valores; a tela remonta;
 *   B. abre com os 100 mais recentes — 5, 10, 20, 50 e 100 continuam na hora,
 *      e "Todos" vai buscar o resto no servidor.
 * Os cartões, os filtros e o aviso de prazo continuam olhando TODOS os casos.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, comAFilaDaTela,
  pecaRodando } = require('./ferramentas');

const lerTela = (nome) => fs.readFileSync(
  path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

function diasAtras(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** A RET com `quantos` casos no período, do mais antigo ao mais novo. */
function retCom(quantos, extra) {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  const lote = [];
  for (let i = 0; i < quantos; i++) {
    lote.push(Object.assign({ 'data de recepção do protocolo': diasAtras(1),
      analista: 'Ana Martins', 'nome do cliente': 'Cliente ' + i, status: 'Pendente',
      protocolo: 'RET-' + i }, extra ? extra(i) : {}));
  }
  t.chamar('inserirVariosRegistros_')('BASE_RET', lote);
  return t;
}

function rodarTestesDoTrabalhoRapido() {
  console.log('\nO Trabalho que não estoura os 40 segundos');

  /* ----------------------------------------------------------------------- */
  secao('B. Abre com os 100 mais recentes');

  teste('com 250 casos, vêm os 100 mais recentes — e o total diz 250', () => {
    const t = retCom(250);
    const resumo = comAFilaDaTela(t.chamar('resumoDoCanal')(t.ret.id, {}, 30));
    igual(resumo.fila.length, 100, 'a fila que atravessa');
    igual(resumo.total, 250, 'o total é o da fila inteira');
    contem(JSON.stringify(resumo.fila[0].celulas), 'Cliente 249', 'o mais recente em cima');
    contem(JSON.stringify(resumo.fila[99].celulas), 'Cliente 150');
    igual(resumo.mostrarNaFila.naAbertura, 100);
  });

  teste('"Todos" traz a fila inteira', () => {
    const t = retCom(250);
    const resumo = comAFilaDaTela(t.chamar('resumoDoCanal')(t.ret.id, {}, 30, 'todos'));
    igual(resumo.fila.length, 250);
    contem(JSON.stringify(resumo.fila[249].celulas), 'Cliente 0', 'até o mais antigo');
  });

  teste('com menos de 100 casos, vem tudo de uma vez', () => {
    const t = retCom(12);
    igual(t.chamar('resumoDoCanal')(t.ret.id, {}, 30).fila.length, 12);
  });

  teste('os cartões continuam contando TODOS os casos', () => {
    const t = retCom(250);
    const resumo = t.chamar('resumoDoCanal')(t.ret.id, {}, 30);
    const total = resumo.cartoes.find((c) => c.dimensao === 'total');
    if (total) igual(total.valor, 250, 'o card de total');
    const pendente = resumo.cartoes.find((c) => c.rotulo === 'Pendente');
    verdadeiro(!pendente || pendente.valor === 250, 'o card de status conta os 250');
  });

  teste('o filtro e a busca valem para a fila inteira, antes do corte', () => {
    const t = retCom(250);
    // O "Cliente 3" é dos mais antigos — fora dos 100 mais recentes.
    const resumo = comAFilaDaTela(t.chamar('resumoDoCanal')(t.ret.id,
      { busca: 'RET-3' }, 30));
    verdadeiro(resumo.fila.some((c) => JSON.stringify(c.celulas).indexOf('Cliente 3"') >= 0),
      'a busca acha o caso antigo');
  });

  /* ----------------------------------------------------------------------- */
  secao('A. A fila compacta');

  teste('expandida pela tela, é igual à fila de antes, caso a caso', () => {
    const t = retCom(30);
    const resumo = t.chamar('resumoDoCanal')(t.ret.id, {}, 30);
    verdadeiro(resumo.filaCompacta === true);
    const daTela = comAFilaDaTela(resumo).fila;
    const canal = t.chamar('canalPeloId_')(t.ret.id);
    const registros = t.chamar('lerRegistros_')('BASE_RET');
    const comoEra = t.chamar('montarFila_')(registros, canal);
    igual(JSON.stringify(daTela), JSON.stringify(comoEra),
      'o mesmo id, as mesmas células, a mesma situação, o mesmo selo');
  });

  teste('a célula com alerta (a vigência do VG) atravessa com o recado e a cor', () => {
    const tela = pecaRodando('Trabalho', { SeletorDePeriodo: { padrao: () => ({}) } }).TelaTrabalho;
    const colunas = [{ colunas: [{ cabecalho: 'Vigência', ehStatus: false },
      { cabecalho: 'Status', ehStatus: true }] }];
    const fila = tela.expandirFila([{ id: '7', v: [[['12 meses', 'abaixo de 18 meses',
      'ruim'], 'Pago']], situacao: 'Pago', tom: 'bom', sla: null, sinais: [] }], colunas);
    igual(JSON.stringify(fila[0].celulas[0]), JSON.stringify([
      { cabecalho: 'Vigência', valor: '12 meses', ehStatus: false,
        alerta: 'abaixo de 18 meses', tomDoAlerta: 'ruim' },
      { cabecalho: 'Status', valor: 'Pago', ehStatus: true, alerta: '', tomDoAlerta: '' }]));
  });

  teste('com 5.000 casos, a resposta de abertura cabe em poucos KB, e não em MB', () => {
    // Era 6 MB. Com os 100 compactos, fica na casa das dezenas de KB.
    const t = retCom(5000);
    const resposta = JSON.stringify(t.chamar('resumoDoCanal')(t.ret.id, {}, 30));
    verdadeiro(resposta.length < 150 * 1024,
      'a resposta tem ' + Math.round(resposta.length / 1024) + ' KB');
  });

  /* ----------------------------------------------------------------------- */
  secao('O aviso de prazo olha a fila inteira');

  teste('o caso no amarelo fora dos 100 mais recentes entra no aviso', () => {
    // Os primeiros 8 casos começaram o prazo em dias diferentes — algum cai no
    // amarelo, qualquer que seja o dia da semana —; os 150 seguintes são
    // novos, e empurram os 8 para fora dos 100 mais recentes.
    const t = retCom(158, (i) => i < 8
      ? { status: 'Pendente', 'Data da primeira mudança de status': diasAtras(i),
        'data de recepção do protocolo': diasAtras(i) }
      : { status: 'Não trabalhado' });
    const resumo = comAFilaDaTela(t.chamar('resumoDoCanal')(t.ret.id, {}, 30));
    const tela = pecaRodando('Trabalho', { SeletorDePeriodo: { padrao: () => ({}) } }).TelaTrabalho;
    const todos = comAFilaDaTela(t.chamar('resumoDoCanal')(t.ret.id, {}, 30, 'todos'));
    const esperados = tela.casosPertoDeVencer(todos.fila).map((a) => String(a.caso.id));
    verdadeiro(esperados.length > 0, 'algum caso no amarelo');
    igual(resumo.pertoDeVencer.map((c) => String(c.id)).sort().join(','),
      esperados.sort().join(','), 'o aviso é o mesmo que a fila inteira daria');
    const naFila = resumo.fila.map((c) => String(c.id));
    verdadeiro(esperados.some((id) => naFila.indexOf(id) < 0),
      'e inclui caso que não veio na fila');
  });

  teste('a lista do aviso vai com até 100; o número, inteiro', () => {
    // Todos os 300 no amarelo: a lista não pode pesar como a fila.
    const t = retCom(300, () => ({ status: 'Pendente' }));
    const amarelos = t.chamar('lerRegistros_')('BASE_RET').slice(0, 300);
    // O amarelo é decisão do sinalizador; aqui o teste o força, para medir só o corte.
    t.contexto.casosPertoDeVencer_ = () => amarelos;
    const resumo = t.chamar('resumoDoCanal')(t.ret.id, {}, 30);
    igual(resumo.pertoDeVencer.length, 100, 'a lista');
    igual(resumo.quantosPertoDeVencer, 300, 'o número');
    contem(lerTela('Trabalho.html'), "'<p class=\"config-explica\">E mais ' + sobram");
  });

  teste('a tela usa a lista à parte para o aviso', () => {
    contem(lerTela('Trabalho.html'),
      'casosPertoDeVencer(resumo && (resumo.pertoDeVencer || resumo.fila))');
  });

  /* ----------------------------------------------------------------------- */
  secao('A tela');

  teste('"Todos" com mais casos do que vieram vai ao servidor; até 100, não', () => {
    const tela = lerTela('Trabalho.html');
    contem(tela, "if (escolha === 'todos' && resumo.fila.length < totalDaFila()) {");
    contem(tela, "carregar('Trazendo os ' + totalDaFila() + ' casos…');");
    contem(tela, "quantosNaFila === 'todos' ? 'todos' : '')");
  });

  teste('a barra do "Mostrar" fala da fila inteira, e não só do que veio', () => {
    const tela = lerTela('Trabalho.html');
    contem(tela, 'function barraDeMostrar(visiveis) {\n    var total = totalDaFila();');
  });

  teste('a tela remonta a fila assim que a resposta chega', () => {
    const tela = lerTela('Trabalho.html');
    contem(tela, 'resumo.fila = expandirFila(resposta.fila, resposta.colunas);');
  });
}

module.exports = { rodarTestesDoTrabalhoRapido };
