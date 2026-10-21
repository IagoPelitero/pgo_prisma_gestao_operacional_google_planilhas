/**
 * ============================================================================
 * PGO — testes-depara-lembrado.js · o de-para da importação, na Etapa 48
 * ============================================================================
 * Relato do PO: "estou tendo dificuldade de localizar determinados nomes para
 * fazer a importação dos casos, e quando altero o nome da coluna o PGO deixa
 * de ler a coluna". A causa era renomear a coluna da BASE para o nome casar;
 * o remédio aprovado: (a) o PGO lembrar o de-para da última importação de cada
 * canal e (b) o seletor em ordem alfabética, com busca digitada.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem } = require('./ferramentas');

const lerTela = (nome) => fs.readFileSync(
  path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

const colado = (linhas) => ({ tipo: 'colado', texto: linhas.map((l) => l.join('\t')).join('\n') });
const CABECALHO = ['Nome do segurado', 'Cod Proposta', 'CPF', 'Coluna da outra operação'];

function ret() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  t.mesa = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
  const operacao = t.chamar('lerRegistros_')('CATALOGO')
    .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id;
  t.chamar('salvarUsuario')({ nome: 'Marcos Vieira', email: 'marcos@exemplo.com',
    nivelAcessoId: operacao, canalId: t.ret.id, ativo: true });
  t.conferir = (cabecalho, extra, canal) => t.chamar('conferirImportacaoDeCasos')((canal || t.ret).id,
    Object.assign({ fonte: colado([cabecalho || CABECALHO, ['Fulano', '123', '11111111111', 'x']]),
      colunaQueIdentifica: '' }, extra || {}));
  t.importar = (dePara, cabecalho) => t.chamar('importarCasos')(t.ret.id, {
    fonte: colado([cabecalho || CABECALHO, ['Fulano ' + Math.random(), '123', '11111111111', 'x']]),
    colunaQueIdentifica: '', analistas: ['Marcos Vieira'], origem: 'Lote', dePara });
  t.para = (laudo, daFonte) => laudo.dePara.find((p) => p.daFonte === daFonte);
  return t;
}

const ESCOLHIDO = [
  { daFonte: 'Nome do segurado', paraAColuna: 'nome do cliente' },
  { daFonte: 'Cod Proposta', paraAColuna: 'número da proposta' },
  { daFonte: 'CPF', paraAColuna: '' },
  { daFonte: 'Coluna da outra operação', paraAColuna: '' }
];

function rodarTestesDoDeParaLembrado() {
  console.log('\nEtapa 48: o de-para lembrado e o seletor com busca');

  /* ----------------------------------------------------------------------- */
  secao('A importação lembra o de-para do canal');

  teste('sem importação anterior, casa só pelo nome — como sempre', () => {
    const t = ret();
    const laudo = t.conferir();
    igual(t.para(laudo, 'Nome do segurado').paraAColuna, '');
    igual(t.para(laudo, 'CPF').paraAColuna, 'CPF');
    igual(t.para(laudo, 'CPF').lembrado, undefined);
  });

  teste('depois de importar, a próxima conferência abre com o que a pessoa escolheu', () => {
    const t = ret();
    t.importar(ESCOLHIDO);
    const laudo = t.conferir();
    igual(t.para(laudo, 'Nome do segurado').paraAColuna, 'nome do cliente');
    igual(t.para(laudo, 'Cod Proposta').paraAColuna, 'número da proposta');
    igual(t.para(laudo, 'Nome do segurado').lembrado, true);
  });

  teste('o "não trazer" também é lembrado, mesmo quando o nome casaria', () => {
    const t = ret();
    t.importar(ESCOLHIDO);
    const cpf = t.para(t.conferir(), 'CPF');
    igual(cpf.paraAColuna, '');
    igual(cpf.lembrado, true);
  });

  teste('sem acento e sem maiúscula: "NOME DO SEGURADO" é o mesmo cabeçalho', () => {
    const t = ret();
    t.importar(ESCOLHIDO);
    const laudo = t.conferir(['NOME DO SEGURADO', 'cod proposta']);
    igual(t.para(laudo, 'NOME DO SEGURADO').paraAColuna, 'nome do cliente');
  });

  teste('a importação seguinte soma: o cabeçalho que não veio continua lembrado', () => {
    const t = ret();
    t.importar(ESCOLHIDO);
    t.importar([{ daFonte: 'Telefone', paraAColuna: 'telefones de contato' }], ['Telefone']);
    const laudo = t.conferir(['Nome do segurado', 'Telefone']);
    igual(t.para(laudo, 'Nome do segurado').paraAColuna, 'nome do cliente');
    igual(t.para(laudo, 'Telefone').paraAColuna, 'telefones de contato');
  });

  teste('cada canal tem o seu: a Mesa não herda o de-para da RET', () => {
    const t = ret();
    t.importar(ESCOLHIDO);
    const laudo = t.conferir(['Nome do segurado'], {}, t.mesa);
    igual(t.para(laudo, 'Nome do segurado').paraAColuna, 'Nome do segurado', 'na Mesa, casa pelo nome');
    igual(t.para(laudo, 'Nome do segurado').lembrado, undefined);
  });

  teste('o que a pessoa mexe na conferência vale sobre o lembrado', () => {
    const t = ret();
    t.importar(ESCOLHIDO);
    const laudo = t.conferir(null, { dePara: [{ daFonte: 'Nome do segurado', paraAColuna: 'e-mail' }] });
    igual(laudo.dePara[0].paraAColuna, 'e-mail');
  });

  teste('coluna lembrada que sumiu da base cai na regra do nome', () => {
    const t = ret();
    t.chamar('gravarConfiguracao_')('IMPORTACAO.DEPARA.' + t.ret.id,
      JSON.stringify({ cpf: 'Coluna que não existe mais' }));
    igual(t.para(t.conferir(), 'CPF').paraAColuna, 'CPF');
  });

  teste('carimbo nunca é sugerido, nem lembrado: a pessoa escolhe de novo, consciente', () => {
    const t = ret();
    t.chamar('gravarConfiguracao_')('IMPORTACAO.DEPARA.' + t.ret.id,
      JSON.stringify({ nomedosegurado: 'Data do 1º contato' }));
    igual(t.para(t.conferir(), 'Nome do segurado').paraAColuna, '');
  });

  teste('texto estragado na CONFIG não quebra a importação', () => {
    const t = ret();
    t.chamar('gravarConfiguracao_')('IMPORTACAO.DEPARA.' + t.ret.id, '{isto não é json');
    igual(t.para(t.conferir(), 'CPF').paraAColuna, 'CPF');
  });

  teste('importação recusada não lembra nada', () => {
    const t = ret();
    try { t.importar([{ daFonte: 'Nome do segurado', paraAColuna: '' }]); } catch (e) { /* recusada */ }
    igual(t.chamar('valorDaConfiguracao_')('IMPORTACAO.DEPARA.' + t.ret.id, ''), '');
  });

  /* ----------------------------------------------------------------------- */
  secao('O seletor: ordem alfabética e busca digitada');

  teste('cada linha do de-para tem a busca e o seletor; a lembrada é marcada', () => {
    const tela = lerTela('Importacao.html');
    contem(tela, 'data-procurar-coluna="');
    contem(tela, 'como na última importação');
    contem(tela, 'function opcoesDeColuna(escolhida, termo)');
    contem(tela, '.localeCompare(');
    contem(lerTela('Estilos.html'), '.importacao-depara .procurar-coluna');
  });
}

module.exports = { rodarTestesDoDeParaLembrado };
