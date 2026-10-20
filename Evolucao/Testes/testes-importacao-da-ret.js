/**
 * ============================================================================
 * PGO — testes-importacao-da-ret.js · a importação da RET na Etapa 45
 * ============================================================================
 * Pedidos do PO, palavra por palavra:
 *   - "Na importação da RET traga um flag para que a data de recepção dos
 *     protocolos seja do dia. Muitas bases não têm uma data de recepção e
 *     podemos escolher que venha com a data de hoje ou deixar escolhido da
 *     planilha" — e ele escolheu: "Hoje para todos" ou "A da planilha" (o caso
 *     sem data fica com a de hoje);
 *   - "Quando vamos tombar casos sempre colocamos prêmio mensal ou anual. Crie
 *     que mostre o valor que está sendo importado, caso tenha uma coluna ou
 *     ambas";
 *   - "Ao invés de 30 dias vamos limitar apenas no mês vigente da importação
 *     (...) e deve ficar claro o porquê não foram importadas, se é pela
 *     planilha importada ou porque já tem no PGO naquele mês".
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, ehData } = require('./ferramentas');

const lerTela = (nome) => fs.readFileSync(
  path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

const colado = (linhas) => ({ tipo: 'colado', texto: linhas.map((l) => l.join('\t')).join('\n') });
const CABECALHO = ['Código origem da proposta', 'número da proposta', 'data de recepção do protocolo',
  'nome do cliente', 'valor do prêmio', 'prêmio mensal'];

function ret() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  t.mesa = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
  const operacao = t.chamar('lerRegistros_')('CATALOGO')
    .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id;
  t.chamar('salvarUsuario')({ nome: 'Marcos Vieira', email: 'marcos@exemplo.com',
    nivelAcessoId: operacao, canalId: t.ret.id, ativo: true });
  t.pedido = (linhas, extra) => Object.assign({ fonte: colado([CABECALHO].concat(linhas)),
    colunaQueIdentifica: '@PROPOSTA_NO_MES', analistas: ['Marcos Vieira'], origem: 'Lote' }, extra || {});
  t.conferir = (linhas, extra) => t.chamar('conferirImportacaoDeCasos')(t.ret.id, t.pedido(linhas, extra));
  t.importar = (linhas, extra) => t.chamar('importarCasos')(t.ret.id, t.pedido(linhas, extra));
  t.caso = (nome) => t.chamar('lerRegistros_')('BASE_RET').find((c) => c['nome do cliente'] === nome);
  return t;
}

const hoje = new Date();
const dd = (n) => String(n).padStart(2, '0');
const dataDeHoje = dd(hoje.getDate()) + '/' + dd(hoje.getMonth() + 1) + '/' + hoje.getFullYear();
const mesmoDia = (data) => ehData(data) && data.getDate() === hoje.getDate()
  && data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear();

function rodarTestesDaImportacaoDaRet() {
  console.log('\nEtapa 45: a importação da RET');

  /* ----------------------------------------------------------------------- */
  secao('A data de recepção: hoje para todos, ou a da planilha');

  teste('a RET oferece a escolha; a Mesa, não', () => {
    const t = ret();
    igual(t.chamar('opcoesDaImportacaoDeCasos')(t.ret.id).dataDeRecepcao, 'data de recepção do protocolo');
    igual(t.chamar('opcoesDaImportacaoDeCasos')(t.mesa.id).dataDeRecepcao, '');
  });

  teste('"A da planilha": quem trouxe data fica com a dela; quem veio sem, com a de hoje', () => {
    const t = ret();
    t.importar([['7', '5000001', '03/01/2026', 'Com data', '', ''],
      ['7', '5000002', '', 'Sem data', '', '']], { dataDeRecepcao: 'planilha' });
    const com = t.caso('Com data')['data de recepção do protocolo'];
    verdadeiro(ehData(com) && com.getDate() === 3 && com.getMonth() === 0, 'a da planilha');
    verdadeiro(mesmoDia(t.caso('Sem data')['data de recepção do protocolo']), 'a de hoje');
  });

  teste('"Hoje para todos": a data da planilha é ignorada', () => {
    const t = ret();
    t.importar([['7', '5100001', '03/01/2026', 'Com data', '', ''],
      ['7', '5100002', '', 'Sem data', '', '']], { dataDeRecepcao: 'hoje' });
    verdadeiro(mesmoDia(t.caso('Com data')['data de recepção do protocolo']));
    verdadeiro(mesmoDia(t.caso('Sem data')['data de recepção do protocolo']));
  });

  teste('sem escolha (uma página antiga), nada muda: quem veio sem data fica sem', () => {
    const t = ret();
    t.importar([['7', '5200001', '', 'Sem data', '', '']]);
    igual(String(t.caso('Sem data')['data de recepção do protocolo'] || ''), '');
  });

  teste('a escolha não vale para a Mesa, mesmo se for mandada', () => {
    const t = ret();
    t.chamar('salvarUsuario')({ nome: 'Diego', email: 'diego@exemplo.com',
      nivelAcessoId: t.chamar('lerRegistros_')('CATALOGO').find((i) => i.Tipo === 'NIVEL_ACESSO'
        && i.Nome === 'Operação').Id, canalId: t.mesa.id, ativo: true });
    t.chamar('importarCasos')(t.mesa.id, { fonte: colado([['Nome do segurado'], ['Mesa sem data']]),
      analistas: ['Diego'], origem: 'Mesa', dataDeRecepcao: 'hoje' });
    const caso = t.chamar('lerRegistros_')('BASE_MESA').find((c) => c['Nome do segurado'] === 'Mesa sem data');
    igual(String(caso['Data de entrada'] || ''), '');
  });

  teste('a tela mostra a escolha e a manda na conferência e na importação', () => {
    const tela = lerTela('Importacao.html');
    contem(tela, 'id="data-de-recepcao"');
    contem(tela, "dataDeRecepcao: opcoes.dataDeRecepcao ? dataDeRecepcao : ''");
    contem(tela, 'A data de hoje, para todos os casos');
  });

  /* ----------------------------------------------------------------------- */
  secao('O prêmio que está sendo importado');

  teste('a conferência soma o prêmio anual e o mensal dos casos que vão entrar', () => {
    const t = ret();
    const laudo = t.conferir([['7', '5300001', dataDeHoje, 'A', '1.200,50', '100'],
      ['7', '5300002', dataDeHoje, 'B', 'R$ 800,00', ''],
      ['7', '5300001', dataDeHoje, 'A repetida', '9.999,00', '999']]);
    const anual = laudo.premios.find((p) => p.rotulo === 'Prêmio anual');
    const mensal = laudo.premios.find((p) => p.rotulo === 'Prêmio mensal');
    igual(anual.total, 2000.5, 'a repetida não soma');
    igual(anual.casos, 2);
    igual(mensal.total, 100);
    igual(mensal.casos, 1, 'quem não trouxe valor não conta');
  });

  teste('só o prêmio que o de-para ligou aparece', () => {
    const t = ret();
    const laudo = t.chamar('conferirImportacaoDeCasos')(t.ret.id, {
      fonte: colado([['Código origem da proposta', 'número da proposta', 'prêmio mensal'],
        ['7', '5400001', '50']]), colunaQueIdentifica: '@PROPOSTA_NO_MES' });
    igual(laudo.premios.map((p) => p.rotulo).join(','), 'Prêmio mensal');
  });

  teste('o resultado da importação também diz o prêmio que entrou', () => {
    const t = ret();
    const r = t.importar([['7', '5500001', dataDeHoje, 'A', '1.000,00', '']]);
    igual(r.premios.find((p) => p.rotulo === 'Prêmio anual').total, 1000);
  });

  teste('a tela mostra os prêmios, em reais', () => {
    const tela = lerTela('Importacao.html');
    contem(tela, "' importado'");
    contem(tela, 'function emReais(valor)');
  });

  /* ----------------------------------------------------------------------- */
  secao('Por que ficou de fora: a planilha ou o PGO no mês');

  teste('a conferência separa "já está no PGO" de "repete na planilha", com as propostas', () => {
    const t = ret();
    t.importar([['7', '5600001', dataDeHoje, 'Já entrou', '', '']], { origem: 'Primeiro' });
    const laudo = t.conferir([['7', '5600001', dataDeHoje, 'De novo', '', ''],
      ['7', '5600002', dataDeHoje, 'Nova', '', ''], ['7', '5600002', dataDeHoje, 'Nova de novo', '', '']]);
    igual(laudo.vaoEntrar, 1);
    igual(laudo.motivosParaPular.jaNoPgo, 1);
    igual(laudo.motivosParaPular.listaNoPgo.join(','), '7-5600001');
    igual(laudo.motivosParaPular.repetidaNoArquivo, 1);
    igual(laudo.motivosParaPular.listaNoArquivo.join(','), '7-5600002');
    contem(laudo.motivosParaPular.mes, String(hoje.getFullYear()), 'e diz o mês: "outubro de 2026"');
    igual(laudo.motivosParaPular.pelaProposta, true);
  });

  teste('o recado de "nada entraria" separa os dois motivos', () => {
    const t = ret();
    t.importar([['7', '5700001', dataDeHoje, 'Já entrou', '', '']], { origem: 'Primeiro' });
    let recado = '';
    try { t.importar([['7', '5700001', dataDeHoje, 'De novo', '', '']]); } catch (e) { recado = e.message; }
    contem(recado, '1 já estão no PGO em');
    contem(recado, '0 repetidas na própria planilha');
  });

  teste('a lista do laudo para nas 50 primeiras de cada motivo', () => {
    const t = ret();
    const linhas = [];
    for (let i = 0; i < 60; i++) linhas.push(['7', '5800001', dataDeHoje, 'Repetida ' + i, '', '']);
    const laudo = t.conferir(linhas);
    igual(laudo.motivosParaPular.repetidaNoArquivo, 59);
    igual(laudo.motivosParaPular.listaNoArquivo.length, 50);
  });

  teste('a tela escreve o porquê, com as propostas e o mês', () => {
    const tela = lerTela('Importacao.html');
    contem(tela, 'function porQueRepetem(motivos, verbo)');
    contem(tela, 'já estão no PGO');
    contem(tela, 'se repetem na própria planilha');
  });
}

module.exports = { rodarTestesDaImportacaoDaRet };
