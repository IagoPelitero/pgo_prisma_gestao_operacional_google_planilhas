/**
 * ============================================================================
 * PGO — testes-retido-acumulado.js · o valor retido acumulado, mês contra mês (Etapa 77)
 * ============================================================================
 * Pedido do PO: "na aba Produtividade RECC eu preciso de um gráfico comparativo
 * com os últimos 3 meses (…) achar a data reteve e o valor (…) no dia 10 de
 * setembro a equipe já tinha 200 mil reais retidos, no dia 10 de outubro tinha
 * 220 mil e no dia 10 de novembro tinha 230 mil". Escolha dele: três linhas.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { carregar, secao, teste, igual, verdadeiro, contem, comoUsuario } = require('./ferramentas');

const DA_RET = 'data de recepção do protocolo';
const tela = (nome) => fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', nome + '.html'), 'utf8');

/** O dia `dia` do mês que está `mesesAtras` meses para trás, às 10h. */
function noMes(mesesAtras, dia) {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() - mesesAtras, dia, 10, 0, 0);
}

function preparar() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  const canais = t.chamar('canaisVisiveis_()');
  t.ret = canais.find((c) => c.aba === 'BASE_RET');
  t.vg = canais.find((c) => c.aba === 'BASE_VG');
  t.casos = (linhas) => t.chamar('inserirVariosRegistros_')('BASE_RET', linhas);
  const reteve = (mesesAtras, dia, valor, extras) => Object.assign({
    [DA_RET]: noMes(3, 5), status: 'Retido', analista: 'Ana Martins', 'nome do cliente': 'R' + valor,
    'Data reteve': noMes(mesesAtras, dia), 'valor do prêmio retido': valor
  }, extras || {});
  t.reteve = reteve;
  t.casos([
    // Dois meses atrás: 100 no dia 1, mais 50 no dia 1, mais 25 no dia 20.
    reteve(2, 1, 100), reteve(2, 1, 50), reteve(2, 20, 25),
    // Mês passado: 300 no dia 1.
    reteve(1, 1, 300),
    // Este mês: 1000 no dia 1.
    reteve(0, 1, 1000),
    // Fora dos três meses, sem valor, e o que reteve e depois virou outro status.
    reteve(3, 10, 9999),
    reteve(0, 1, ''),
    reteve(0, 1, 7000, { status: 'Não retido' })
  ]);
  t.grafico = (filtros) => t.chamar('produtividadeDaEquipe')(t.ret.id, filtros || {}).retidoAcumulado;
  return t;
}

function rodarTestesDoRetidoAcumulado() {
  console.log('\nEtapa 77: o valor retido acumulado, mês contra mês');

  /* ----------------------------------------------------------------------- */
  secao('A conta');

  teste('três meses, do mais antigo ao atual, cada um com a soma até cada dia', () => {
    const t = preparar();
    const grafico = t.grafico();
    igual(grafico.meses.length, 3);
    igual(grafico.meses.map((m) => m.serie).join(','), '1,2,3');
    const [antigo, passado, atual] = grafico.meses;
    igual(antigo.pontos[0].valor, 150, 'dia 1: os dois casos somados');
    igual(antigo.pontos[18].valor, 150, 'dia 19: ainda os mesmos');
    igual(antigo.pontos[19].valor, 175, 'dia 20: acumulou');
    igual(antigo.total, 175);
    igual(antigo.casos, 3);
    igual(passado.pontos[0].valor + '|' + passado.total, '300|300');
    igual(atual.pontos[0].valor, 1000);
  });

  teste('o mês atual vai até hoje; os anteriores, até o último dia deles', () => {
    const t = preparar();
    const [antigo, passado, atual] = t.grafico().meses;
    const hoje = new Date();
    igual(atual.pontos.length, hoje.getDate());
    igual(passado.pontos.length, new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate());
    igual(antigo.pontos.length, new Date(hoje.getFullYear(), hoje.getMonth() - 1, 0).getDate());
    igual(atual.pontos[atual.pontos.length - 1].dia, hoje.getDate());
  });

  teste('fora dos três meses, sem valor, ou que deixou de ser Retido: não entra', () => {
    const t = preparar();
    const total = t.grafico().meses.reduce((soma, mes) => soma + mes.total, 0);
    igual(total, 175 + 300 + 1000);
  });

  teste('não segue o período da tela — o caso que entrou há três meses conta pelo dia em que reteve', () => {
    const t = preparar();
    const painel = t.chamar('produtividadeDaEquipe')(t.ret.id, {});
    igual(painel.total, 0, 'nenhum caso entrou neste mês');
    igual(painel.retidoAcumulado.meses[2].total, 1000, 'e o retido deste mês está no gráfico');
  });

  teste('os filtros de lista e o alcance do nível valem', () => {
    const t = preparar();
    t.casos([t.reteve(0, 1, 40, { analista: 'Diego Castilho' })]);
    igual(t.grafico().meses[2].total, 1040);
    const analista = t.chamar('produtividadeDaEquipe')(t.ret.id, {}).filtrosDisponiveis
      .find((f) => f.cabecalho.toLowerCase() === 'analista');
    igual(t.grafico({ [analista.chave]: ['Diego Castilho'] }).meses[2].total, 40, 'o filtro');

    const operacao = t.chamar('lerRegistros_')('CATALOGO')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    const permissoes = JSON.parse(operacao.Configuracao);
    permissoes.escopoNaProdutividade = 'PROPRIOS';
    t.chamar('atualizarRegistro_')('CATALOGO', operacao.Id, { Configuracao: JSON.stringify(permissoes) });
    t.chamar('salvarUsuario')({ nome: 'Diego Castilho', email: 'diego@exemplo.com',
      nivelAcessoId: operacao.Id, canalId: '', ativo: true });
    t.chamar('esquecerCacheDaConfiguracao_()');
    comoUsuario(t.ambiente, 'diego@exemplo.com', () => igual(t.grafico().meses[2].total, 40, 'o alcance'));
  });

  teste('canal sem a data ou sem o valor retido não ganha o gráfico', () => {
    const t = preparar();
    igual(t.chamar('produtividadeDaEquipe')(t.vg.id, {}).retidoAcumulado, null);
  });

  teste('lê a coluna da data e as linhas dos três meses — não a base inteira', () => {
    const t = preparar();
    const antigos = [];
    for (let i = 0; i < 2000; i++) antigos.push(t.reteve(6, 1 + (i % 27), 10));
    t.casos(antigos);
    const canal = t.chamar('canalPeloId_')(t.ret.id);
    const quem = t.chamar('usuarioAtual_()');
    t.chamar('retidoAcumuladoNosTresMeses_')(canal, quem, [], {});
    const largura = t.chamar('estruturaDaAba_')('BASE_RET').cabecalhos.length;
    t.ambiente.medidor.zerar();
    t.chamar('retidoAcumuladoNosTresMeses_')(canal, quem, [], {});
    const celulas = t.ambiente.medidor.retrato().celulasLidas;
    verdadeiro(celulas < 2008 + 100 * largura, celulas + ' células (a base inteira: ' + 2008 * largura + ')');
  });

  /* ----------------------------------------------------------------------- */
  secao('A tela');

  teste('três linhas na mesma escala, uma dica por dia com os três meses', () => {
    const comuns = tela('Comuns');
    const inicio = comuns.indexOf('var Graficos = (function () {');
    const contexto = vm.createContext({ Moldura: { escapar: (texto) => String(texto) }, document: {} });
    vm.runInContext(comuns.substring(inicio, comuns.indexOf('</script>', inicio)), contexto);
    const t = preparar();
    const html = contexto.Graficos.desenharLinhas(t.grafico());
    igual((html.match(/class="linha-do-grafico serie-/g) || []).length, 3);
    contem(html, 'data-dia="1" data-dica="Dia 1 · ');
    contem(html, ': R$ 150,00 · ');
    contem(html, ': R$ 1.000,00"');
    igual((html.match(/<li><i class="serie-/g) || []).length, 3, 'a legenda dos três meses');
  });

  teste('fica logo depois dos prêmios, com o que cada mês tinha no mesmo dia de hoje', () => {
    const produtividade = tela('Produtividade');
    // Etapa 90 (aprovado): os dois lado a lado, o retido logo depois dos prêmios.
    contem(produtividade, "'<div class=\"dupla-de-graficos\">' + desenharPremios() + desenharRetidoAcumulado() + '</div>'");
    contem(produtividade, "'<thead><tr><th>Mês</th><th class=\"direita\">Até o dia ' + hoje + '</th>'");
    contem(produtividade, 'if (!grafico) return \'\';');
  });
}

module.exports = { rodarTestesDoRetidoAcumulado };
