/**
 * ============================================================================
 * PGO — testes-popups-da-importacao.js · as sinalizações em pop-up (Etapa 57)
 * ============================================================================
 * Pedido do PO: "falta pop-ups na aba de importação para sinalizações". A
 * escolha dele: os avisos da conferência num pop-up do sistema, e também a
 * confirmação do "Importar" e as mensagens de erro, que eram a caixinha cinza
 * do navegador.
 * ============================================================================
 */

const { secao, teste, igual, verdadeiro, contem, lerPeca } = require('./ferramentas');

/**
 * A função `avisosDaConferencia` da tela, rodando sozinha: o texto dela é
 * tirado da Importação e recebe o laudo e os vizinhos de que precisa.
 */
function avisosPara(laudo, chat) {
  const tela = lerPeca('Importacao');
  const inicio = tela.indexOf('  function avisosDaConferencia() {');
  verdadeiro(inicio >= 0, 'a tela tem avisosDaConferencia');
  const fim = tela.indexOf('\n  }\n', inicio) + 4;
  const corpo = tela.substring(inicio, fim);
  // eslint-disable-next-line no-new-func
  return new Function('laudo', 'oQue', 'escapar', 'algumCarimboEscolhido',
    corpo + '\nreturn avisosDaConferencia();')(
    laudo,
    (plural) => (chat ? (plural ? 'atendimentos' : 'atendimento') : (plural ? 'casos' : 'caso')),
    (texto) => String(texto).replace(/</g, '&lt;'),
    (dePara) => dePara.some((par) => par.paraAColuna === 'Data do 1º contato'));
}

function rodarTestesDosPopupsDaImportacao() {
  console.log('\nEtapa 57: as sinalizações da Importação em pop-up');

  /* ----------------------------------------------------------------------- */
  secao('O que o pop-up da conferência junta');

  teste('laudo limpo: nenhum aviso, e o pop-up não abre', () => {
    igual(avisosPara({ vaoEntrar: 10, linhasNaFonte: 10, motivosParaPular: {}, dePara: [] }).length, 0);
  });

  teste('as repetidas, separadas pelo motivo — já no PGO e na própria planilha', () => {
    const avisos = avisosPara({ vaoEntrar: 5, linhasNaFonte: 9, dePara: [],
      motivosParaPular: { repetida: 4, jaNoPgo: 3, repetidaNoArquivo: 1, pelaProposta: true, mes: 'outubro de 2026' } });
    igual(avisos.length, 2);
    contem(avisos[0], '3 proposta(s)</strong> vão ficar de fora porque já estão no PGO em outubro de 2026');
    contem(avisos[1], '1 proposta(s)</strong> vão ficar de fora porque se repetem na própria planilha');
  });

  teste('nada vai entrar, passou do limite e linhas em branco', () => {
    const avisos = avisosPara({ vaoEntrar: 0, linhasNaFonte: 6000, limite: 5000, passaDoLimite: true,
      motivosParaPular: { vazia: 2 }, dePara: [] }).join(' | ');
    contem(avisos, 'Nenhum caso vai entrar.');
    contem(avisos, 'São <strong>6000 linhas</strong>, e o limite é 5000');
    contem(avisos, '2 linha(s) em branco</strong> vão ser puladas');
  });

  teste('a coluna de controle de produtividade escolhida no de-para', () => {
    contem(avisosPara({ vaoEntrar: 1, motivosParaPular: {},
      dePara: [{ daFonte: 'Contato', paraAColuna: 'Data do 1º contato' }] }).join(''),
    'controle de produtividade');
  });

  teste('no chat: coluna faltando, nomes fora do cadastro (até 10), sem data e TMO', () => {
    const nomes = Array.from({ length: 12 }, (_, i) => 'Pessoa ' + (i + 1));
    const avisos = avisosPara({ vaoEntrar: 3, motivosParaPular: {}, dePara: [],
      faltando: ['Data'], analistasDesconhecidos: nomes, semDataOuAnalista: 2, tmoQueNaoENumero: 1 }, true)
      .join(' | ');
    contem(avisos, 'Falta ligar no de-para a coluna de: <strong>Data</strong>');
    contem(avisos, '12 nome(s)</strong> não estão no cadastro de usuários: Pessoa 1');
    contem(avisos, 'e mais 2');
    verdadeiro(avisos.indexOf('Pessoa 11') < 0, 'a lista para no 10º nome');
    contem(avisos, '2 linha(s)</strong> sem data ou sem analista');
    contem(avisos, '1 linha(s)</strong> com um TMO que não é número');
  });

  teste('o nome que vem da planilha é escapado', () => {
    contem(avisosPara({ vaoEntrar: 1, motivosParaPular: {}, dePara: [],
      analistasDesconhecidos: ['<b>x</b>'] }, true).join(''), '&lt;b>x');
  });

  /* ----------------------------------------------------------------------- */
  secao('A tela');

  teste('Conferir abre o pop-up depois de desenhar o laudo — os avisos amarelos continuam', () => {
    const tela = lerPeca('Importacao');
    contem(tela, 'desenhar();\n        avisarDaConferencia();');
    contem(tela, "class=\"config-dica aviso-de-carimbo\"", 'os avisos do laudo seguem na tela');
  });

  teste('a confirmação do Importar é o pop-up do sistema, com o número', () => {
    const tela = lerPeca('Importacao');
    contem(tela, "botao: 'Importar ' + laudo.vaoEntrar + ' ' + oQue(false) + '(s)',");
    contem(tela, 'aoConfirmar: function () { gravar(escolhidos); }');
  });

  teste('os erros de conferir e de importar também', () => {
    const tela = lerPeca('Importacao');
    contem(tela, "avisarDoErro('Não deu para conferir', erro);");
    contem(tela, "avisarDoErro('Não deu para importar', erro);");
    verdadeiro(!/window\.(alert|confirm)\(/.test(tela), 'nenhuma caixinha do navegador na Importação');
  });

  teste('o pop-up é uma peça só, com o Cancelar só quando é pergunta', () => {
    const comuns = lerPeca('Comuns');
    contem(comuns, 'function avisar(opcoes)');
    contem(comuns, '    avisar: avisar,');
    contem(comuns, "'<h3 id=\"titulo-aviso\">' + Moldura.escapar(opcoes.titulo) + '</h3>'");
    contem(comuns, "(pergunta ? '<button type=\"button\" class=\"botao vazado\" id=\"cancelar-aviso\">'");
    contem(comuns, 'if (pergunta) opcoes.aoConfirmar();');
    contem(lerPeca('Estilos'), '.dialogo-caixa.aviso-do-sistema {');
  });
}

module.exports = { rodarTestesDosPopupsDaImportacao };
