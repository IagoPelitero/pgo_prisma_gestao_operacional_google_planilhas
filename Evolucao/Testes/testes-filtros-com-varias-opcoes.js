/**
 * ============================================================================
 * PGO — testes-filtros-com-varias-opcoes.js · mais de uma opção por filtro (Etapa 72)
 * ============================================================================
 * Pedido do PO: "melhorar os filtros para ser possível selecionar mais de um
 * filtro", em todas as telas que filtram. Dentro do filtro, o caso passa com
 * QUALQUER uma das opções marcadas; entre filtros, precisa passar em todos.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem } = require('./ferramentas');

const DA_RET = 'data de recepção do protocolo';
const tela = (nome) => fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', nome + '.html'), 'utf8');

function preparar() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  const hoje = new Date();
  t.chamar('inserirVariosRegistros_')('BASE_RET', [
    { [DA_RET]: hoje, status: 'Pendente', canal: 'Telefone', 'nome do cliente': 'A' },
    { [DA_RET]: hoje, status: 'Pendente', canal: 'E-mail', 'nome do cliente': 'B' },
    { [DA_RET]: hoje, status: 'Retido', canal: 'Telefone', 'nome do cliente': 'C' },
    { [DA_RET]: hoje, status: 'Não retido', canal: 'Site', 'nome do cliente': 'D' },
    { [DA_RET]: hoje, status: 'Não trabalhado', canal: 'E-mail', 'nome do cliente': 'E' }
  ]);
  t.trabalho = (filtros) => t.chamar('resumoDoCanal')(t.ret.id, filtros || {}, undefined, '', false);
  t.produtividade = (filtros) => t.chamar('produtividadeDaEquipe')(t.ret.id, filtros || {});
  t.disponiveis = t.trabalho().filtrosDisponiveis;
  t.filtro = (cabecalho) => t.disponiveis.find((f) => f.cabecalho.toLowerCase() === cabecalho);
  t.chaveDe = (cabecalho) => t.filtro(cabecalho).chave;
  return t;
}

function rodarTestesDosFiltrosComVariasOpcoes() {
  console.log('\nEtapa 72: filtros com várias opções');

  /* ----------------------------------------------------------------------- */
  secao('A conta');

  teste('duas opções no mesmo filtro: passa quem tem qualquer uma', () => {
    const t = preparar();
    igual(t.trabalho({ [t.chaveDe('status')]: ['Pendente', 'Retido'] }).total, 3);
    igual(t.produtividade({ [t.chaveDe('status')]: ['Pendente', 'Retido'] }).total, 3);
  });

  teste('dois filtros: precisa passar nos dois', () => {
    const t = preparar();
    const filtros = { [t.chaveDe('status')]: ['Pendente', 'Retido'], [t.chaveDe('canal')]: ['Telefone'] };
    igual(t.trabalho(filtros).total, 2, 'A e C');
    igual(t.produtividade(filtros).total, 2);
  });

  teste('um valor só, como a tela mandava antes, continua valendo', () => {
    const t = preparar();
    igual(t.trabalho({ [t.chaveDe('status')]: 'Pendente' }).total, 2);
    igual(t.trabalho({ [t.chaveDe('status')]: ['Pendente'] }).total, 2);
  });

  teste('lista vazia, texto vazio e opção em branco não filtram nada', () => {
    const t = preparar();
    [[], '', [''], ['  '], null, undefined].forEach((vazio) =>
      igual(t.trabalho({ [t.chaveDe('status')]: vazio }).total, 5, JSON.stringify(vazio)));
  });

  teste('a comparação ignora acento e caixa, como sempre', () => {
    const t = preparar();
    igual(t.trabalho({ [t.chaveDe('status')]: ['NAO RETIDO', 'pendente'] }).total, 3);
  });

  teste('os cartões contam o mesmo recorte da fila', () => {
    const t = preparar();
    const resumo = t.trabalho({ [t.chaveDe('canal')]: ['Telefone', 'Site'] });
    igual(resumo.total, 3);
    igual(resumo.cartoes[0].valor, 3);
  });

  /* ----------------------------------------------------------------------- */
  secao('Quantos casos cada opção tem');

  teste('cada opção vem com o número de casos do período, antes dos filtros', () => {
    const t = preparar();
    const quantos = (nome) => t.filtro('status').opcoes.find((o) => o.valor === nome).quantos;
    igual(quantos('Pendente') + '|' + quantos('Retido') + '|' + quantos('Cancelado'), '2|1|0');
    // Marcar uma opção não zera o número das outras.
    const filtrado = t.trabalho({ [t.chaveDe('status')]: ['Retido'] }).filtrosDisponiveis
      .find((f) => f.cabecalho.toLowerCase() === 'status');
    igual(filtrado.opcoes.find((o) => o.valor === 'Pendente').quantos, 2);
  });

  teste('a Produtividade também manda a contagem', () => {
    const t = preparar();
    const status = t.produtividade().filtrosDisponiveis.find((f) => f.cabecalho.toLowerCase() === 'status');
    igual(status.opcoes.find((o) => o.valor === 'Pendente').quantos, 2);
  });

  /* ----------------------------------------------------------------------- */
  secao('A Tabela de Corretoras');

  teste('o segmento aceita vários — e um só, como antes', () => {
    const t = preparar();
    t.chamar('inserirVariosRegistros_')('CORRETORAS', [
      { SUSEP: 'A1', Corretora: 'Um', Segmento: 'Diamante' },
      { SUSEP: 'B2', Corretora: 'Dois', Segmento: 'Demais corretoras' },
      { SUSEP: 'C3', Corretora: 'Três', Segmento: 'Ouro' }]);
    const quantas = (segmento) => t.chamar('tabelaDeCorretoras')('', segmento).corretoras.length;
    igual(quantas(['Diamante', 'Ouro']), 2);
    igual(quantas('Diamante'), 1);
    igual(quantas([]), 3);
    igual(quantas(''), 3);
  });

  /* ----------------------------------------------------------------------- */
  secao('A peça da tela');

  teste('as três telas que filtram usam a mesma peça', () => {
    ['Trabalho', 'Produtividade', 'TabelaCorretoras'].forEach((nome) => {
      contem(tela(nome), 'FiltroMultiplo.desenhar(', nome);
      contem(tela(nome), 'FiltroMultiplo.ligar(', nome);
    });
    ['Trabalho', 'Produtividade'].forEach((nome) => contem(tela(nome), 'FiltroMultiplo.etiquetas(', nome));
  });

  teste('a lista só vai ao servidor quando fecha com escolha diferente', () => {
    const comuns = tela('Comuns');
    contem(comuns, 'if (!iguais(escolha, lista(escolhidos[chave]))) aoMudar(chave, escolha);');
    contem(comuns, "if (acao === 'aplicar') { fechar(); return; }");
    contem(comuns, "if (evento.key === 'Escape')");
  });

  teste('a peça desenha o botão com a quantidade e as etiquetas com o "×"', () => {
    // O Comuns tem vários blocos de script: roda só o trecho da peça.
    const comuns = tela('Comuns');
    const trecho = comuns.substring(comuns.indexOf('var FiltroMultiplo'), comuns.indexOf('var SeletorDeCanal'));
    const contexto = require('vm').createContext({ Moldura: { escapar: (texto) => String(texto) } });
    require('vm').runInContext(trecho, contexto);
    const peca = contexto.FiltroMultiplo;
    const filtro = { chave: 'status', rotulo: 'Status', opcoes: [{ valor: 'P', rotulo: 'Pendente', quantos: 2 },
      { valor: 'R', rotulo: 'Retido', quantos: 1 }] };
    contem(peca.desenhar(filtro, { status: ['P', 'R'] }), '<b>2</b>');
    verdadeiro(peca.desenhar(filtro, {}).indexOf('<b>') < 0, 'sem escolha, sem número');
    contem(peca.etiquetas([filtro], { status: ['P', 'R'] }), 'Status: Pendente, Retido');
    contem(peca.etiquetas([filtro], { status: ['P'] }), 'data-tirar-filtro="status"');
    igual(peca.etiquetas([filtro], {}), '');
  });
}

module.exports = { rodarTestesDosFiltrosComVariasOpcoes };
