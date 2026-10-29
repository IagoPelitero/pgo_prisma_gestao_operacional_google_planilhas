/**
 * ============================================================================
 * PGO — testes-colunas-suas.js · coluna fora do contrato não é problema
 * ============================================================================
 * Pergunta do PO: "por que fica aparecendo as colunas que criei fora do
 * contrato e sinalizando que são ignoradas? Se for preenchido não vai
 * aparecer?"
 *
 * Duas respostas, que os testes seguram:
 *   1. a coluna que ele criou em Cadastrar Caso é CONHECIDA — o formulário grava
 *      nela e o caso a mostra —, e por isso não é "a mais" nem é "ignorada";
 *   2. a que ele escreveu direto na planilha, sem campo, é respeitada; se tiver
 *      valor, aparece em "Trabalhar no caso", só para leitura.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem } = require('./ferramentas');

const lerTela = (nome) => fs.readFileSync(
  path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

function mesaComColunas() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.chamar('definirSenhaDeAdministrador')('segredo123', '');
  t.chamar('liberarComSenha')('segredo123');
  t.mesa = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
  t.laudoDaMesa = () => t.chamar('conferirEstruturaDaPlanilha()').abas
    .find((a) => a.aba === 'BASE_MESA');
  t.doDiagnostico = () => t.chamar('diagnosticoRECC()').blocos
    .find((b) => b.chave === 'estrutura').itens
    .filter((i) => i.oQue.indexOf('BASE_MESA') === 0);
  return t;
}

/** Uma coluna escrita DIRETO na planilha, como o PO faria: nada passa pelo sistema. */
function colunaNaMao(t, cabecalho) {
  const aba = t.ambiente.planilha.getSheetByName('BASE_MESA');
  aba.insertColumnsBefore(3, 1);
  aba.getRange(1, 3).setNumberFormat('@');
  aba.getRange(1, 3).setValue(cabecalho);
  t.chamar('esquecerEstruturaLida_()');
}

function rodarTestesDasColunasSuas() {
  console.log('\nColuna fora do contrato: a do formulário e a que é só sua');

  /* ----------------------------------------------------------------------- */
  secao('A coluna que o PO criou em Cadastrar Caso');

  teste('é do formulário: não aparece como "a mais" no laudo, nem no resumo, nem no diagnóstico', () => {
    const t = mesaComColunas();
    t.chamar('criarCampo')(t.mesa.id, { rotulo: 'Protocolo do chat', tipo: 'texto', secao: 'Caso' });
    t.chamar('criarCampo')(t.mesa.id, { rotulo: 'Valor negociado', tipo: 'moeda', secao: 'Caso' });

    const laudo = t.laudoDaMesa();
    igual(laudo.doFormulario.join(','), 'Protocolo do chat,Valor negociado');
    igual(laudo.aMais.length, 0, 'ninguém declarou nada a mais');
    igual(t.chamar('resumoDasConfiguracoes()').estrutura.colunasForaDoContrato, 0);
    const itens = t.doDiagnostico();
    igual(itens.length, 1, 'um item só: a Mesa está no contrato');
    igual(itens[0].situacao, 'ok');
    verdadeiro(itens[0].oQue.indexOf('fora do contrato') < 0, itens[0].oQue);
  });

  teste('o campo DESLIGADO continua sendo coluna conhecida', () => {
    const t = mesaComColunas();
    t.chamar('criarCampo')(t.mesa.id, { rotulo: 'Protocolo do chat', tipo: 'texto', secao: 'Caso' });
    const campo = t.chamar('listarCamposDoCanal')(t.mesa.id).find((c) => c.rotulo === 'Protocolo do chat');
    t.chamar('salvarCampo')(Object.assign({ id: campo.id, rotulo: 'Protocolo do chat',
      secao: 'Caso', tipo: 'texto', ativo: false }));
    igual(t.laudoDaMesa().doFormulario.join(','), 'Protocolo do chat');
    igual(t.laudoDaMesa().aMais.length, 0);
  });

  teste('as colunas que o contrato já tem não entram em nenhuma das duas listas', () => {
    const t = mesaComColunas();
    const laudo = t.laudoDaMesa();
    igual(laudo.aMais.length + laudo.doFormulario.length, 0);
  });

  /* ----------------------------------------------------------------------- */
  secao('A coluna escrita direto na planilha, sem campo');

  teste('é respeitada: o laudo a cita como SUA, e o diagnóstico não dá alarme', () => {
    const t = mesaComColunas();
    colunaNaMao(t, 'Minha coluna');

    const laudo = t.laudoDaMesa();
    igual(laudo.aMais.join(','), 'Minha coluna');
    igual(laudo.doFormulario.length, 0);
    igual(t.chamar('conferirEstruturaDaPlanilha()').ok, true, 'não reprova a planilha');

    const item = t.doDiagnostico()[0];
    igual(item.situacao, 'ok', 'era atenção; coluna sua não é problema');
    contem(item.oQue, 'coluna(s) suas, fora do contrato');
    contem(item.comoArrumar, 'aparece em "Trabalhar no caso", só para leitura');
    verdadeiro(item.comoArrumar.indexOf('ignora') < 0 && item.comoArrumar.indexOf('vazia para sempre') < 0,
      'as duas frases que erravam saíram');
    igual(t.chamar('diagnosticoRECC()').aprovado, true);
  });

  teste('com valor, ela APARECE em "Trabalhar no caso" — e editável; vazia, não enche a tela', () => {
    const t = mesaComColunas();
    colunaNaMao(t, 'Minha coluna');
    colunaNaMao(t, 'Outra coluna');
    const caso = t.chamar('inserirRegistro_')('BASE_MESA', { Analista: 'Ana Martins',
      Status: 'Em andamento', 'Nome do segurado': 'Segurado', 'Minha coluna': 'valor meu' });

    const aberto = t.chamar('casoParaEditar')(t.mesa.id, caso.__id);
    const doSistema = aberto.doSistema.map((l) => l.rotulo + '=' + l.valor);
    verdadeiro(doSistema.indexOf('Minha coluna=valor meu') >= 0, 'a preenchida aparece');
    igual(aberto.doSistema.find((l) => l.rotulo === 'Minha coluna').editavel, true,
      'e é dela que se corrige o que ficou fora de formato');
    verdadeiro(!doSistema.some((l) => l.indexOf('Outra coluna') === 0), 'a vazia não enche a tela');
    igual(aberto.valores['minhacoluna'], undefined, 'e não vira campo editável sozinha');
  });

  teste('depois de cadastrada como campo, a coluna passa a ser editável e deixa a lista de leitura', () => {
    const t = mesaComColunas();
    t.chamar('criarCampo')(t.mesa.id, { rotulo: 'Protocolo do chat', tipo: 'texto', secao: 'Caso' });
    const caso = t.chamar('inserirRegistro_')('BASE_MESA', { Analista: 'Ana Martins',
      Status: 'Em andamento', 'Nome do segurado': 'S', 'Protocolo do chat': 'CH-1' });
    const aberto = t.chamar('casoParaEditar')(t.mesa.id, caso.__id);
    igual(aberto.valores['protocolodochat'], 'CH-1', 'editável, no formulário');
    verdadeiro(!aberto.doSistema.some((l) => l.rotulo === 'Protocolo do chat'),
      'e não repetida na lista de leitura');
  });

  /* ----------------------------------------------------------------------- */
  secao('Corrigir a coluna sua no "Trabalhar no caso"');

  /** Um caso da Mesa com uma coluna sua preenchida e um carimbo de status. */
  function casoComColunaSua() {
    const t = mesaComColunas();
    colunaNaMao(t, 'Observação minha');
    const { id } = t.chamar('cadastrarCaso')(t.mesa.id, { status: 'Em andamento', nomedosegurado: 'S' });
    t.chamar('atualizarRegistro_')('BASE_MESA', id, { 'Observação minha': 'fora  do  formato ' });
    t.id = id;
    t.abrir = () => t.chamar('casoParaEditar')(t.mesa.id, id);
    t.linha = () => t.chamar('lerRegistros_')('BASE_MESA').find((l) => String(l.__id) === String(id));
    return t;
  }

  teste('só a coluna sua vem editável; o carimbo do sistema, não', () => {
    const t = casoComColunaSua();
    const lista = t.abrir().doSistema;
    igual(lista.find((l) => l.rotulo === 'Observação minha').editavel, true);
    const carimbo = lista.find((l) => l.rotulo === 'Data em andamento');
    verdadeiro(!!carimbo, 'o carimbo está na lista');
    igual(carimbo.editavel, false, 'e continua só leitura');
  });

  teste('o valor corrigido é gravado', () => {
    const t = casoComColunaSua();
    const aberto = t.abrir();
    t.chamar('editarCaso')(t.mesa.id, t.id, aberto.valores, aberto.versao,
      { 'Observação minha': '  corrigido ' });
    igual(t.linha()['Observação minha'], 'corrigido', 'sem os espaços das pontas');
  });

  teste('esvaziar apaga — como no campo do formulário', () => {
    const t = casoComColunaSua();
    const aberto = t.abrir();
    t.chamar('editarCaso')(t.mesa.id, t.id, aberto.valores, aberto.versao, { 'Observação minha': '' });
    igual(String(t.linha()['Observação minha'] || ''), '');
  });

  teste('o servidor recusa o carimbo e a coluna de campo, mesmo mandados por fora', () => {
    const t = casoComColunaSua();
    const aberto = t.abrir();
    const antes = t.linha()['Data em andamento'];
    let erro = null;
    try {
      t.chamar('editarCaso')(t.mesa.id, t.id, aberto.valores, aberto.versao,
        { 'Data em andamento': '01/01/2020' });
    } catch (e) { erro = e; }
    verdadeiro(!!erro, 'carimbo recusado');
    contem(erro.message, '"Data em andamento" não se edita no "Trabalhar no caso"');
    igual(t.linha()['Data em andamento'].getTime(), antes.getTime(), 'e nada mudou');

    erro = null;
    try {
      t.chamar('editarCaso')(t.mesa.id, t.id, aberto.valores, aberto.versao,
        { 'Nome do segurado': 'por fora' });
    } catch (e) { erro = e; }
    verdadeiro(!!erro, 'coluna de campo se edita no formulário, não por aqui');
  });

  teste('salvar sem mandar as colunas suas não mexe nelas', () => {
    const t = casoComColunaSua();
    const aberto = t.abrir();
    t.chamar('editarCaso')(t.mesa.id, t.id, aberto.valores, aberto.versao);
    igual(t.linha()['Observação minha'], 'fora  do  formato ');
  });

  teste('a mesma regra de duas pessoas no caso: quem abriu antes não grava por cima', () => {
    const t = casoComColunaSua();
    const aberto = t.abrir();
    t.chamar('atualizarRegistro_')('BASE_MESA', t.id, { 'Observação minha': 'outra pessoa mexeu' });
    let erro = null;
    try {
      t.chamar('editarCaso')(t.mesa.id, t.id, aberto.valores, aberto.versao,
        { 'Observação minha': 'eu' });
    } catch (e) { erro = e; }
    verdadeiro(!!erro && erro.message.indexOf('alterado por outra pessoa') >= 0);
    igual(t.linha()['Observação minha'], 'outra pessoa mexeu');
  });

  /* ----------------------------------------------------------------------- */
  secao('O que a tela diz');

  teste('"Trabalhar no caso" não diz mais que a coluna é "escrita pelo sistema"', () => {
    const tela = lerTela('Comuns.html');
    contem(tela, 'As suas dá para corrigir aqui; as do sistema são só leitura.');
    verdadeiro(tela.indexOf('escrito pelo sistema, não se edita') < 0);
  });

  teste('a coluna sua vira caixa de texto, e o que está nela vai junto ao salvar', () => {
    const tela = lerTela('Comuns.html');
    contem(tela, 'data-coluna-sua="');
    contem(tela, 'versaoAoAbrir, colunasSuasNaTela(), envio)', 'o salvar manda as colunas suas (e o envio, Etapa 59)');
    verdadeiro(/\.par-do-caso\.coluna-sua > input/.test(lerTela('Estilos.html')),
      'a caixa tem estilo próprio');
  });

  teste('o laudo da Estrutura separa os campos do formulário das colunas suas', () => {
    const tela = lerTela('Configuracoes.html');
    contem(tela, 'campos criados em Cadastrar Caso: ');
    contem(tela, 'colunas suas, fora do contrato (o sistema não mexe nelas): ');
    verdadeiro(tela.indexOf("' · fora do contrato: '") < 0, 'o texto antigo saiu');
  });
}

module.exports = { rodarTestesDasColunasSuas };
