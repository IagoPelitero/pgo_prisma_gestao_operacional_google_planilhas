/**
 * ============================================================================
 * PGO — testes-ajustes-da-produtividade.js · os 5 pedidos do PO de 29/10
 * ============================================================================
 * Na Produtividade RECC:
 *   1. "Situação dos casos" traz TODOS os status do canal, até os zerados;
 *   2. "Casos importados por dia": o caso cadastrado no sistema não tem a
 *      "Data da importação" — vale a data de entrada do caso e, sem ela, a da
 *      primeira mudança de status (só no gráfico; a planilha não muda);
 *   3. "De qual base os casos vieram": a origem vazia vira "Sistema";
 *   4. a tabela por CPF só com 2 casos ou mais (em testes-tentativas.js);
 *   5. a Mesa ganha a coluna "Fila" no chat — nasce em branco, aparece no
 *      de-para da importação — e um gráfico dela.
 * Os itens 1 a 3 valem nos dois canais (RET e Mesa).
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem } = require('./ferramentas');

const lerTela = (nome) => fs.readFileSync(
  path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

const DA_RET = 'data de recepção do protocolo';
const DA_MESA = 'Data de entrada';
const ABERTURA = { tipo: 'intervalo', de: '', ate: '' };

function diasAtras(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

function preparar() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  t.mesa = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
  t.painel = (canal, periodo) => t.chamar('produtividadeDaEquipe')(canal.id, {}, periodo || 30);
  t.grafico = (canal, titulo, periodo) => t.painel(canal, periodo).componentes.find((c) => c.titulo === titulo);
  t.detalhe = (canal, componente, chave, periodo) => t.chamar('detalharComponente')(
    canal.id, componente.id, chave, {}, periodo || 30, 'todos');
  t.dia = (data) => t.chamar('diaDoCaso_')(data);
  return t;
}

function rodarTestesDosAjustesDaProdutividade() {
  console.log('\nAjustes da Produtividade RECC (29/10)');

  /* ----------------------------------------------------------------------- */
  secao('1. A situação traz todos os status, até os zerados');

  [['RET', 'ret', DA_RET, 'status'], ['Mesa', 'mesa', DA_MESA, 'Status']].forEach(([nome, chave, data, coluna]) => {
    teste(nome + ': todo status do canal aparece, sem corte de top 5, e o zerado com 0', () => {
      const t = preparar();
      const canal = t[chave];
      const situacoes = t.chamar('situacoesDoCanal_')(canal).map((s) => s.gravadoComo);
      verdadeiro(situacoes.length > 3, nome + ' tem ' + situacoes.length + ' status');
      t.chamar('inserirVariosRegistros_')(canal.aba, [
        { [data]: diasAtras(1), [coluna]: situacoes[0] },
        { [data]: diasAtras(1), [coluna]: situacoes[0] },
        { [data]: diasAtras(1), [coluna]: situacoes[1] }]);
      const grafico = t.grafico(canal, 'Situação dos casos');
      igual(grafico.foraDoTopo, 0);
      igual(grafico.pontos.map((p) => p.chave).sort().join('|'), situacoes.slice().sort().join('|'));
      igual(grafico.pontos[0].chave + '=' + grafico.pontos[0].valor, situacoes[0] + '=2', 'o maior primeiro');
      igual(grafico.pontos.filter((p) => p.valor === 0).length, situacoes.length - 2);
      igual(grafico.total, 3);
    });
  });

  teste('o status que não está no catálogo e o vazio também entram', () => {
    const t = preparar();
    t.chamar('inserirVariosRegistros_')('BASE_RET', [
      { [DA_RET]: diasAtras(1), status: 'Status antigo' }, { [DA_RET]: diasAtras(1), status: '' }]);
    const chaves = t.grafico(t.ret, 'Situação dos casos').pontos.map((p) => p.chave);
    verdadeiro(chaves.indexOf('Status antigo') >= 0 && chaves.indexOf('Sem informação') >= 0, chaves.join('|'));
  });

  teste('o mesmo status cadastrado duas vezes (geral e do canal) aparece uma vez só', () => {
    const t = preparar();
    t.chamar('inserirRegistro_')('CATALOGO', { Tipo: 'STATUS', CanalId: '', Nome: 'Pendente',
      Rotulo: 'Pendente', Ordem: 99, Ativo: 'Sim' });
    t.chamar('inserirVariosRegistros_')('BASE_RET', [{ [DA_RET]: diasAtras(1), status: 'Pendente' }]);
    const chaves = t.grafico(t.ret, 'Situação dos casos').pontos.map((p) => p.chave);
    igual(chaves.filter((c) => c === 'Pendente').length, 1, chaves.join('|'));
  });

  teste('período sem caso nenhum: o gráfico vem vazio, sem o recado da coluna vazia', () => {
    const t = preparar();
    const grafico = t.grafico(t.ret, 'Por que pediram o cancelamento');
    igual(grafico.pontos.length, 0);
    igual(grafico.aviso, '', 'não há caso, então não é a coluna que está vazia');
  });

  teste('os outros gráficos continuam no top 5', () => {
    const t = preparar();
    t.chamar('inserirVariosRegistros_')('BASE_RET', ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((motivo) =>
      ({ [DA_RET]: diasAtras(1), status: 'Pendente', 'motivo do cancelamento': motivo })));
    const grafico = t.grafico(t.ret, 'Por que pediram o cancelamento');
    igual(grafico.pontos.length, 5);
    igual(grafico.foraDoTopo, 2);
  });

  teste('a rosca não desenha a fatia zerada; a legenda mostra o 0', () => {
    contem(lerTela('Comuns.html'), "if (!ponto.valor) return '';");
  });

  /* ----------------------------------------------------------------------- */
  secao('2. Casos importados por dia: sem a data da importação, a de entrada');

  [['RET', 'ret', DA_RET], ['Mesa', 'mesa', DA_MESA]].forEach(([nome, chave, data]) => {
    teste(nome + ': o cadastrado no sistema entra no dia da entrada; o importado, no da importação', () => {
      const t = preparar();
      const canal = t[chave];
      t.chamar('inserirVariosRegistros_')(canal.aba, [
        { [data]: diasAtras(3), 'Data da importação': diasAtras(2), 'Origem da importação': 'Vida Presente' },
        { [data]: diasAtras(5) },
        { [data]: diasAtras(5) }]);
      const grafico = t.grafico(canal, 'Casos importados por dia');
      igual(grafico.pontos.map((p) => p.chave + '=' + p.valor).join('|'),
        t.dia(diasAtras(5)) + '=2|' + t.dia(diasAtras(2)) + '=1');
      igual(t.detalhe(canal, grafico, t.dia(diasAtras(5))).total, 2, 'o clique lista o que a barra mostra');
      const planilha = t.chamar('lerRegistros_')(canal.aba);
      igual(planilha.filter((c) => c['Data da importação'] === '' || c['Data da importação'] === undefined
        || c['Data da importação'] === null).length, 2, 'a planilha não muda');
    });
  });

  teste('sem a data de entrada, a da primeira mudança de status', () => {
    const t = preparar();
    t.chamar('inserirVariosRegistros_')('BASE_RET', [
      { [DA_RET]: '', status: 'Pendente', 'Data da primeira mudança de status': diasAtras(4) }]);
    const grafico = t.grafico(t.ret, 'Casos importados por dia', ABERTURA);
    igual(grafico.pontos.map((p) => p.chave).join('|'), t.dia(diasAtras(4)));
    igual(t.detalhe(t.ret, grafico, t.dia(diasAtras(4)), ABERTURA).total, 1);
  });

  teste('o caso cadastrado pela tela já aparece no dia de hoje', () => {
    const t = preparar();
    t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Pela tela', status: 'Pendente' });
    const grafico = t.grafico(t.ret, 'Casos importados por dia');
    igual(grafico.pontos.map((p) => p.chave + '=' + p.valor).join('|'), t.dia(new Date()) + '=1');
  });

  /* ----------------------------------------------------------------------- */
  secao('3. De qual base: a origem vazia é "Sistema"');

  [['RET', 'ret', DA_RET], ['Mesa', 'mesa', DA_MESA]].forEach(([nome, chave, data]) => {
    teste(nome + ': o caso sem origem conta em "Sistema", e o clique lista os mesmos', () => {
      const t = preparar();
      const canal = t[chave];
      t.chamar('inserirVariosRegistros_')(canal.aba, [
        { [data]: diasAtras(1), 'Origem da importação': 'Vida Presente', 'Data da importação': diasAtras(1) },
        { [data]: diasAtras(1) }, { [data]: diasAtras(1), 'Origem da importação': '  ' }]);
      const grafico = t.grafico(canal, 'De qual base os casos vieram');
      igual(grafico.pontos.map((p) => p.chave + '=' + p.valor).join('|'), 'Sistema=2|Vida Presente=1');
      igual(t.detalhe(canal, grafico, 'Sistema').total, 2);
    });
  });

  teste('a substituição é só destas duas colunas: as outras seguem "Sem informação"', () => {
    const t = preparar();
    t.chamar('inserirVariosRegistros_')('BASE_RET', [
      { [DA_RET]: diasAtras(1), status: 'Pendente', 'motivo do cancelamento': 'Preço' },
      { [DA_RET]: diasAtras(1), status: 'Pendente' }]);
    const chaves = t.grafico(t.ret, 'Por que pediram o cancelamento').pontos.map((p) => p.chave);
    igual(chaves.sort().join('|'), 'Preço|Sem informação');
  });

  /* ----------------------------------------------------------------------- */
  secao('5. A Fila no chat da Mesa');

  teste('a coluna nasce em branco na aba do chat e aparece no de-para da importação', () => {
    const t = preparar();
    const estrutura = t.chamar('estruturaDaAba_')('ATENDIMENTOS_CHAT');
    verdadeiro(estrutura.cabecalhos.indexOf('Fila') >= 0, estrutura.cabecalhos.join(','));
    const opcoes = t.chamar('opcoesDaImportacaoDoChat')();
    verdadeiro(opcoes.colunasDoCanal.indexOf('Fila') >= 0);
    verdadeiro(opcoes.obrigatorias.indexOf('Fila') < 0, 'não é obrigatória');
  });

  teste('a atualização acrescenta a Fila numa aba do chat que já existe', () => {
    const t = preparar();
    t.chamar('inserirVariosRegistros_')('ATENDIMENTOS_CHAT', [{ Data: diasAtras(1), Analista: 'Ana' }]);
    t.chamar('removerColuna_')('ATENDIMENTOS_CHAT', 'Fila');
    contem(t.chamar('atualizarPGO()'), 'ATENDIMENTOS_CHAT.Fila criada');
    const linha = t.chamar('lerRegistros_')('ATENDIMENTOS_CHAT')[0];
    igual(linha.Analista, 'Ana');
    igual(String(linha.Fila), '');
  });

  teste('importar sugere a Fila pelo cabeçalho e grava o que veio', () => {
    const t = preparar();
    const comZero = (n) => (n < 10 ? '0' : '') + n;
    const d = diasAtras(1);
    const dia = comZero(d.getDate()) + '/' + comZero(d.getMonth() + 1) + '/' + d.getFullYear();
    const id = t.ambiente.criarPlanilhaExterna('Chat', [['Data', 'Analista', 'Fila'],
      [dia, 'Ana Martins', 'Diamante VG'], [dia, 'Ana Martins', '']]);
    const pedido = { fonte: { tipo: 'planilha', planilhaId: id, aba: 'Chat' }, origem: 'Chat com fila',
      dePara: [{ daFonte: 'Data', paraAColuna: 'Data' }, { daFonte: 'Analista', paraAColuna: 'Analista' },
        { daFonte: 'Fila', paraAColuna: 'Fila' }] };
    const laudo = t.chamar('conferirImportacaoDoChat')(Object.assign({}, pedido, { dePara: [] }));
    igual(laudo.dePara.find((p) => p.daFonte === 'Fila').paraAColuna, 'Fila');
    t.chamar('importarAtendimentosDoChat')(pedido);
    igual(t.chamar('lerRegistros_')('ATENDIMENTOS_CHAT').map((l) => l.Fila).join('|'), 'Diamante VG|');
  });

  teste('o gráfico da fila conta só o chat; a linha sem fila fica de fora e é contada', () => {
    const t = preparar();
    t.chamar('inserirVariosRegistros_')('ATENDIMENTOS_CHAT', [
      { Data: diasAtras(1), Analista: 'Ana', Fila: 'Diamante VG' },
      { Data: diasAtras(1), Analista: 'Ana', Fila: 'Diamante VG' },
      { Data: diasAtras(1), Analista: 'Ana', Fila: 'Diamante VI' },
      { Data: diasAtras(1), Analista: 'Ana', Fila: '' }]);
    t.chamar('inserirVariosRegistros_')('BASE_MESA', [{ [DA_MESA]: diasAtras(1), Analista: 'Ana' }]);
    const atendimentos = t.painel(t.mesa).atendimentos;
    const fila = atendimentos.graficos.find((g) => g.titulo === 'Atendimentos do chat por fila');
    igual(fila.pontos.map((p) => p.rotulo + '=' + p.valor).join('|'), 'Diamante VG=2|Diamante VI=1');
    igual(fila.semInformacao, 1, 'só a linha do chat sem fila; o caso do sistema não entra');
    verdadeiro(atendimentos.visoes['chat|total'].graficos.some((g) => g.titulo === 'Atendimentos do chat por fila'));
    verdadeiro(!atendimentos.visoes['sistema|total'].graficos.some((g) => g.titulo === 'Atendimentos do chat por fila'),
      'a visão E-mail não tem a fila');
  });

  teste('a RET não ganha o gráfico da fila', () => {
    const t = preparar();
    igual(t.painel(t.ret).atendimentos, null);
  });
}

module.exports = { rodarTestesDosAjustesDaProdutividade };
