/**
 * ============================================================================
 * PGO — testes-cards-filtros-e-busca.js · o Trabalho da Etapa 44
 * ============================================================================
 * Pedido do PO: "na aba trabalho altere os filtros seguindo a sequência: total
 * de casos, aguardando transmissão (que vem da coluna Status proposta que criei
 * depois), pendente, contatando. Os cards não estão funcionando corretamente
 * tanto nas configurações quanto na aba trabalho". E: "mesmo digitando na busca
 * não acha os casos escrevendo aguardando transmissão".
 *
 * Os sintomas que o PO marcou — "clico e a fila fica vazia", "o número do card
 * está errado", "ao editar nas configurações ele não remove o card e fica
 * preso" — tinham três causas, todas seguradas aqui:
 *   1. o status renomeado em Ajustes Gerais deixava o card no nome antigo:
 *      contava zero, filtrava para vazio e TRAVAVA o salvar dos cards;
 *   2. o card filtrava a fila pelo NOME dele, e só o de status filtrava;
 *   3. a tela de cards somava um ouvinte ao Salvar a cada card removido.
 * E uma regressão da Etapa 43: a abertura em "Por data" escondia os casos sem
 * data de recepção.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { secao, teste, igual, verdadeiro, contem, lanca, comAFilaDaTela } = require('./ferramentas');
const { retComStatusProposta } = require('./testes-condicional');

const lerTela = (nome) => fs.readFileSync(
  path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

/** A RET do PO: Status proposta, "Contatando" no lugar do "1º contato realizado", e casos. */
function retDoPO() {
  const t = retComStatusProposta();
  const item = t.chamar('lerRegistros_')('CATALOGO').find((i) => i.Tipo === 'STATUS'
    && i.Nome === '1º contato realizado' && String(i.CanalId) === String(t.ret.id));
  t.renomearStatus = (de, para) => {
    const atual = t.chamar('lerRegistros_')('CATALOGO').find((i) => i.Tipo === 'STATUS'
      && i.Nome === de && String(i.CanalId) === String(t.ret.id));
    t.chamar('salvarItemDoCatalogo')({ id: atual.Id, tipo: 'STATUS', canalId: atual.CanalId,
      nome: para, ordem: atual.Ordem, ativo: true, cor: atual.Cor });
  };
  t.itemDoContato = item;
  t.caso = (extra) => t.chamar('cadastrarCaso')(t.ret.id, Object.assign({}, t.base, extra)).id;
  t.resumo = (filtros, periodo) => comAFilaDaTela(t.chamar('resumoDoCanal')(t.ret.id, filtros || {}, periodo || 30));
  t.cards = () => t.chamar('listarCardsDoPainel')('trabalho', t.ret.id);
  return t;
}

function rodarTestesDosCardsFiltrosEBusca() {
  console.log('\nEtapa 44: os cards, os filtros e a busca do Trabalho');

  /* ----------------------------------------------------------------------- */
  secao('O status renomeado não deixa mais o card preso');

  teste('renomear o status em Ajustes Gerais leva o card junto', () => {
    const t = retDoPO();
    t.renomearStatus('1º contato realizado', 'Contatando');
    const card = t.cards().cartoes.find((c) => c.titulo === '1º contato realizado');
    igual(card.filtro, 'Contatando', 'o card passa a contar o nome novo');
    igual(card.naoExiste, '');
  });

  teste('renomear um item da lista do Status proposta leva o card de valor junto', () => {
    const t = retDoPO();
    const lista = t.chamar('lerRegistros_')('CATALOGO').find((i) => i.Nome === 'Aguardando transmissão'
      && i.Tipo !== 'STATUS');
    t.chamar('salvarCardsDoPainel')('trabalho', t.ret.id, t.cards().cartoes.filter((c) => c.mostrar)
      .concat([{ titulo: 'Aguardando', dimensao: 'valor', coluna: 'Status proposta',
        filtro: 'Aguardando transmissão', cor: 'atencao', mostrar: true }]));
    t.chamar('salvarItemDoCatalogo')({ id: lista.Id, tipo: lista.Tipo, canalId: '',
      nome: 'Aguardando envio', ordem: lista.Ordem, ativo: true });
    igual(t.cards().cartoes.find((c) => c.titulo === 'Aguardando').filtro, 'Aguardando envio');
  });

  teste('o card de um status que não existe mais vem marcado em Configurações, com o motivo', () => {
    const t = retDoPO();
    // Apagado sem passar pelo renomear: o item some do catálogo.
    t.chamar('excluirItemDoCatalogo')(t.itemDoContato.Id);
    const card = t.cards().cartoes.find((c) => c.titulo === '1º contato realizado');
    contem(card.naoExiste, 'não existe mais');
    contem(lerTela('Configuracoes.html'), 'escapar(card.naoExiste)');
  });

  teste('o card que não existe mais NÃO trava o salvar — dá para tirá-lo, e tirar outros', () => {
    const t = retDoPO();
    t.chamar('excluirItemDoCatalogo')(t.itemDoContato.Id);
    const todos = t.cards().cartoes.filter((c) => c.mostrar);
    t.chamar('salvarCardsDoPainel')('trabalho', t.ret.id, todos.filter((c) => c.titulo !== 'Pendente'));
    verdadeiro(!t.cards().cartoes.find((c) => c.titulo === 'Pendente').mostrar, 'tirou outro, com o órfão na lista');
    t.chamar('salvarCardsDoPainel')('trabalho', t.ret.id, t.cards().cartoes.filter((c) => c.mostrar
      && c.titulo !== '1º contato realizado'));
    verdadeiro(!t.cards().cartoes.find((c) => c.titulo === '1º contato realizado').mostrar, 'e tirou o órfão');
  });

  teste('um card NOVO apontando para status inexistente continua sendo recusado', () => {
    const t = retDoPO();
    lanca(() => t.chamar('salvarCardsDoPainel')('trabalho', t.ret.id, [{ titulo: 'X',
      dimensao: 'situacao', filtro: 'Inventado', cor: 'neutro', mostrar: true }]), 'não existe no canal');
  });

  teste('no Trabalho, o card de status que não existe mais some, em vez de mostrar zero', () => {
    const t = retDoPO();
    t.chamar('excluirItemDoCatalogo')(t.itemDoContato.Id);
    verdadeiro(!t.resumo().cartoes.some((c) => c.rotulo === '1º contato realizado'));
  });

  teste('a tela de cards liga o Salvar uma vez só — remover um card não duplica a gravação', () => {
    const tela = lerTela('Configuracoes.html');
    const redesenhar = tela.substring(tela.indexOf('function redesenharCards()'),
      tela.indexOf('function redesenharCards()') + 200);
    contem(redesenhar, 'ligarListaDeCards();');
    verdadeiro(redesenhar.indexOf('ligarPaineis()') < 0, 'o redesenho não religa os botões da tela');
    contem(tela, 'function ligarBotoesDosCards()');
  });

  /* ----------------------------------------------------------------------- */
  secao('Clicar no card filtra a fila pelo que ele conta');

  teste('o card de valor (Status proposta = Aguardando transmissão) filtra a fila', () => {
    const t = retDoPO();
    t.caso({ status: 'Retido', statusproposta: 'Aguardando transmissão' });
    t.caso({ status: 'Retido', statusproposta: 'Transmitido' });
    t.caso({ status: 'Pendente' });
    t.chamar('salvarCardsDoPainel')('trabalho', t.ret.id, [
      { titulo: 'Total de casos', dimensao: 'total', filtro: '', cor: 'neutro', mostrar: true },
      { titulo: 'Aguardando transmissão', dimensao: 'valor', coluna: 'Status proposta',
        filtro: 'Aguardando transmissão', cor: 'atencao', mostrar: true },
      { titulo: 'Pendente', dimensao: 'situacao', filtro: 'Pendente', cor: 'neutro', mostrar: true }]);
    const sem = t.resumo();
    const card = sem.cartoes.find((c) => c.rotulo === 'Aguardando transmissão');
    igual(card.valor, 1);
    verdadeiro(card.filtravel === true && !!card.id);
    const com = t.resumo({ cartao: card.id });
    igual(com.fila.length, 1, 'a fila tem o mesmo número do card');
    igual(com.total, 1);
    igual(com.cartoes.find((c) => c.rotulo === 'Pendente').valor, 1, 'os outros cards não zeram');
    igual(com.cartoes.find((c) => c.rotulo === 'Total de casos').valor, 3);
  });

  teste('o card de status filtra pelo STATUS, mesmo com outro nome no card', () => {
    const t = retDoPO();
    t.caso({ status: 'Pendente' });
    t.caso({ status: 'Pago' });
    t.chamar('salvarCardsDoPainel')('trabalho', t.ret.id, [
      { titulo: 'Esperando o cliente', dimensao: 'situacao', filtro: 'Pendente', cor: 'neutro', mostrar: true }]);
    const card = t.resumo().cartoes[0];
    igual(t.resumo({ cartao: card.id }).fila.length, 1, 'antes, a fila ficava vazia');
  });

  teste('o card "Já passaram por" (coluna preenchida) também filtra', () => {
    const t = retDoPO();
    const id = t.caso({ status: 'Pendente' });
    t.caso({ status: 'Não trabalhado' });
    const coluna = t.chamar('lerRegistros_')('CATALOGO').find((i) => i.Tipo === 'STATUS'
      && i.Nome === 'Pendente' && String(i.CanalId) === String(t.ret.id)).ColunaDeCarimbo
      || 'Data da primeira mudança de status';
    t.chamar('salvarCardsDoPainel')('trabalho', t.ret.id, [
      { titulo: 'Mexidos', dimensao: 'preenchido', filtro: 'Data da primeira mudança de status',
        cor: 'neutro', mostrar: true }]);
    const card = t.resumo().cartoes[0];
    const fila = t.resumo({ cartao: card.id }).fila;
    igual(fila.length, card.valor);
    verdadeiro(!!coluna && fila.some((c) => String(c.id) === String(id)));
  });

  teste('o "Total" e um card que não existe devolvem a fila inteira', () => {
    const t = retDoPO();
    t.caso({ status: 'Pendente' });
    t.caso({ status: 'Pago' });
    const total = t.resumo().cartoes.find((c) => c.dimensao === 'total');
    igual(t.resumo({ cartao: total.id }).fila.length, 2);
    igual(t.resumo({ cartao: '999999' }).fila.length, 2);
  });

  teste('a tela manda o Id do card, e o Total ou o segundo clique desligam', () => {
    const tela = lerTela('Trabalho.html');
    contem(tela, "filtrosEscolhidos.cartao = (this.getAttribute('data-cartao-total') === 'sim'");
  });

  /* ----------------------------------------------------------------------- */
  secao('Os filtros: Status, Status proposta, e os outros até 6');

  teste('o Status proposta vem logo depois do Status', () => {
    const t = retDoPO();
    const filtros = t.resumo().filtrosDisponiveis.map((f) => f.cabecalho);
    igual(filtros[0].toLowerCase(), 'status');
    igual(filtros[1], 'Status proposta');
    verdadeiro(filtros.length <= 6);
  });

  teste('filtrar pelo Status proposta funciona', () => {
    const t = retDoPO();
    t.caso({ status: 'Retido', statusproposta: 'Aguardando transmissão' });
    t.caso({ status: 'Retido', statusproposta: 'Transmitido' });
    const r = t.resumo({ statusproposta: 'Aguardando transmissão' });
    igual(r.fila.length, 1);
  });

  /* ----------------------------------------------------------------------- */
  secao('A busca digitada procura em todas as colunas');

  teste('"aguardando transmissão" acha pelo Status proposta, que não está na fila', () => {
    const t = retDoPO();
    t.caso({ status: 'Retido', statusproposta: 'Aguardando transmissão', nomedocliente: 'Ana' });
    t.caso({ status: 'Retido', statusproposta: 'Transmitido', nomedocliente: 'Bia' });
    const r = t.resumo({ busca: 'aguardando transmissao' });
    igual(r.fila.length, 1);
    contem(JSON.stringify(r.fila), 'Ana');
  });

  teste('texto com número não acha pelo Id; número sozinho acha', () => {
    const t = retDoPO();
    const id = t.caso({ status: 'Pendente', nomedocliente: 'Fulano' });
    t.caso({ status: 'Pendente', nomedocliente: 'Caso número ' + Number(id) });
    igual(t.resumo({ busca: 'Caso número ' + Number(id) }).fila.length, 1, 'só o do nome');
    verdadeiro(t.resumo({ busca: String(Number(id)) }).fila.length >= 1);
  });

  /* ----------------------------------------------------------------------- */
  secao('A abertura em "Por data" volta a mostrar os casos sem data');

  teste('o caso sem data de recepção aparece na abertura, e não num período escolhido', () => {
    const t = retDoPO();
    t.chamar('inserirRegistro_')('BASE_RET', { analista: 'Ana', status: 'Pendente',
      'nome do cliente': 'Sem data' });
    const abertura = t.resumo({}, { tipo: 'intervalo', de: '', ate: '' });
    verdadeiro(JSON.stringify(abertura.fila).indexOf('Sem data') >= 0, 'na abertura, aparece');
    const hoje = new Date();
    const dd = (n) => (n < 10 ? '0' : '') + n;
    const data = dd(hoje.getDate()) + '/' + dd(hoje.getMonth() + 1) + '/' + hoje.getFullYear();
    const escolhido = t.resumo({}, { tipo: 'intervalo', de: data, ate: data });
    verdadeiro(JSON.stringify(escolhido.fila).indexOf('Sem data') < 0, 'num de/até escolhido, não');
  });

  /* ----------------------------------------------------------------------- */
  secao('O atualizarPGO monta os 4 cards da RET — uma vez');

  teste('faltando o "Contatando", não mexe em nada e diz o que falta', () => {
    const t = retDoPO();
    const antes = JSON.stringify(t.cards().cartoes);
    contem(t.chamar('atualizarPGO()'), 'falta o status "Contatando"');
    igual(JSON.stringify(t.cards().cartoes), antes);
  });

  teste('com tudo no lugar, monta Total, Aguardando transmissão, Pendente e Contatando', () => {
    const t = retDoPO();
    t.renomearStatus('1º contato realizado', 'Contatando');
    contem(t.chamar('atualizarPGO()'), 'os cards do Trabalho ficaram Total de casos');
    const ligados = t.cards().cartoes.filter((c) => c.mostrar);
    igual(ligados.map((c) => c.titulo).join('|'), 'Total de casos|Aguardando transmissão|Pendente|Contatando');
    igual(ligados[1].dimensao, 'valor');
    igual(ligados[1].coluna, 'Status proposta');
    igual(ligados[3].filtro, 'Contatando');
  });

  teste('rodar de novo não desfaz o que o PO mudou depois', () => {
    const t = retDoPO();
    t.renomearStatus('1º contato realizado', 'Contatando');
    t.chamar('atualizarPGO()');
    t.chamar('salvarCardsDoPainel')('trabalho', t.ret.id, t.cards().cartoes.filter((c) => c.mostrar
      && c.titulo !== 'Pendente'));
    contem(t.chamar('atualizarPGO()'), 'já foram montados');
    verdadeiro(!t.cards().cartoes.find((c) => c.titulo === 'Pendente' && c.mostrar));
  });
}

module.exports = { rodarTestesDosCardsFiltrosEBusca };
