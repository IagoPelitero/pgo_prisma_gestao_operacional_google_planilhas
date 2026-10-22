/**
 * ============================================================================
 * PGO — testes-produtividade-da-ret.js · a Produtividade da RET na Etapa 46
 * ============================================================================
 * Pedido do PO (só a RET, por enquanto): "o gráfico que mostra o valor do
 * prêmio anual total, mensal e retido deve ser o primeiro a mostrar, e o
 * restante posterior, ficando por último a produtividade por analista
 * mostrando tudo individualmente. Embaixo de cada status deve ter o valor
 * anual das propostas, sendo apenas o retido que irá trazer o valor total dos
 * retidos da coluna prêmio retido".
 *
 * Anual = "valor do prêmio"; mensal = "prêmio mensal"; retido = "valor do
 * prêmio retido" — confirmado com o PO.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem } = require('./ferramentas');

const lerTela = (nome) => fs.readFileSync(
  path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

function retComPremios() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  t.mesa = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
  const hoje = new Date();
  const caso = (analista, status, anual, mensal, retido) => t.chamar('inserirRegistro_')('BASE_RET', {
    'data de recepção do protocolo': hoje, analista, status, 'nome do cliente': analista + ' ' + status,
    'valor do prêmio': anual, 'prêmio mensal': mensal, 'valor do prêmio retido': retido });
  caso('Ana Martins', 'Retido', 1200, 100, 900);
  caso('Ana Martins', 'Não retido', 2400, 200, '');
  caso('Diego Castilho', 'Retido', 600, 50, 450);
  caso('Diego Castilho', 'Pendente', 300, 25, '');
  t.painel = (filtros) => t.chamar('produtividadeDaEquipe')(t.ret.id, filtros || {}, 30);
  return t;
}

function rodarTestesDaProdutividadeDaRet() {
  console.log('\nEtapa 46: a Produtividade da RET');

  /* ----------------------------------------------------------------------- */
  secao('O gráfico dos prêmios: anual, mensal e retido');

  teste('três barras, com a soma de cada coluna nos casos da tela', () => {
    const t = retComPremios();
    const premios = t.painel().premios;
    igual(premios.titulo, 'Prêmios: anual, mensal e retido');
    igual(premios.unidade, 'dinheiro');
    igual(premios.pontos.map((p) => p.rotulo + '=' + p.valor).join('|'),
      'Prêmio anual=4500|Prêmio mensal=375|Prêmio retido=1350');
    igual(premios.pontos[2].casos, 2, 'casos com prêmio retido');
    igual(premios.total, null, 'anual + mensal + retido não é um total');
  });

  teste('os filtros da tela valem para o gráfico', () => {
    const t = retComPremios();
    const filtroDoStatus = t.painel().filtrosDisponiveis.find((f) => f.cabecalho.toLowerCase() === 'status');
    const filtros = {};
    filtros[filtroDoStatus.chave] = 'Retido';
    igual(t.painel(filtros).premios.pontos[0].valor, 1800);
  });

  teste('só a RET tem o gráfico: a Mesa recebe null', () => {
    const t = retComPremios();
    igual(t.chamar('produtividadeDaEquipe')(t.mesa.id, {}, 30).premios, null);
    igual(t.chamar('produtividadeDaEquipe')(t.mesa.id, {}, 30).porAnalista, null);
  });

  /* ----------------------------------------------------------------------- */
  secao('Embaixo de cada status, o prêmio anual — e no Retido, o prêmio retido');

  teste('o cartão de status traz a soma do prêmio anual dos casos dele', () => {
    const t = retComPremios();
    const cartoes = t.painel().cartoes;
    const naoRetido = cartoes.find((c) => c.rotulo === 'Não retido');
    igual(naoRetido.soma, 2400);
    igual(naoRetido.rotuloDaSoma, 'prêmio anual');
    const pendentes = cartoes.find((c) => c.chave === 'pendente');
    igual(pendentes.soma, 300);
  });

  teste('o cartão do Retido traz a soma do prêmio RETIDO', () => {
    const t = retComPremios();
    const retido = t.painel().cartoes.find((c) => c.rotulo === 'Retido');
    igual(retido.soma, 1350);
    igual(retido.rotuloDaSoma, 'prêmio retido');
  });

  teste('o cartão do Não trabalhado traz a soma do prêmio MENSAL (Etapa 54)', () => {
    const t = retComPremios();
    t.chamar('inserirRegistro_')('BASE_RET', { 'data de recepção do protocolo': new Date(),
      analista: 'Ana Martins', status: 'Não trabalhado', 'nome do cliente': 'Sem anual',
      'valor do prêmio': '', 'prêmio mensal': 87.5 });
    const cartao = t.painel().cartoes.find((c) => c.chave === 'naotrabalhado');
    igual(cartao.soma, 87.5, 'o anual vazio não zera a soma');
    igual(cartao.rotuloDaSoma, 'prêmio mensal');
    igual(t.painel().cartoes.find((c) => c.rotulo === 'Não retido').rotuloDaSoma, 'prêmio anual',
      'os outros status seguem com o anual');
  });

  teste('o cartão que não é de status não ganha soma', () => {
    const t = retComPremios();
    const total = t.painel().cartoes.find((c) => c.dimensao === 'total');
    igual(total.soma, undefined);
  });

  /* ----------------------------------------------------------------------- */
  secao('Por último, a produtividade por analista');

  teste('uma linha por analista: total, cada status e os três prêmios', () => {
    const t = retComPremios();
    const quadro = t.painel().porAnalista;
    igual(quadro.status.join('|'), 'Pendente|Não retido|Retido', 'só os status que aparecem');
    const ana = quadro.linhas.find((l) => l.analista === 'Ana Martins');
    igual(ana.total, 2);
    igual(ana.porStatus.join('|'), '0|1|1');
    igual(ana.anual + '|' + ana.mensal + '|' + ana.retido, '3600|300|900');
    igual(quadro.totais.total, 4);
    igual(quadro.totais.porStatus.join('|'), '1|1|2');
    igual(quadro.totais.retido, 1350);
  });

  teste('quem não tem analista entra como "Sem analista"', () => {
    const t = retComPremios();
    t.chamar('inserirRegistro_')('BASE_RET', { 'data de recepção do protocolo': new Date(),
      status: 'Pendente', 'nome do cliente': 'Sem dono' });
    verdadeiro(t.painel().porAnalista.linhas.some((l) => l.analista === 'Sem analista'));
  });

  /* ----------------------------------------------------------------------- */
  secao('A tela');

  teste('os prêmios vêm logo depois dos cartões; o quadro por analista, por último', () => {
    const tela = lerTela('Produtividade.html');
    const montagem = tela.substring(tela.indexOf("+ desenharCartoes()\n      + desenharPremios()"));
    verdadeiro(montagem.length > 0, 'prêmios logo depois dos cartões');
    contem(tela, "+ desenharPorAnalista()\n      + LUGAR_DO_DETALHE;", 'o quadro por último');
    contem(tela, 'soma-do-cartao');
    contem(lerTela('Estilos.html'), '.indicador .soma-do-cartao');
  });

  teste('com os prêmios, o gráfico "Valor por situação" sai da tela — a soma já está nos cartões', () => {
    contem(lerTela('Produtividade.html'), 'painel.valorPorSituacao && !painel.premios');
  });
}

module.exports = { rodarTestesDaProdutividadeDaRet };
