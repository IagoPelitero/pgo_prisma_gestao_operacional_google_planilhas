/**
 * ============================================================================
 * PGO — testes-cara-de-sistema.js · o acabamento (Etapa 67) e a versão
 * ============================================================================
 * A linha do tempo do caso vem dos carimbos do próprio caso (decisão do PO). E
 * o acabamento: o aviso discreto no canto (um só para o sistema), o esqueleto
 * de carregamento e a versão no rodapé. A tela inicial, que nasceu aqui, saiu
 * na Etapa 68 a pedido do PO ("vai deixar minha operação confusa").
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem } = require('./ferramentas');

const TELAS = path.join(__dirname, '..', '..', 'Front-End');
const tela = (nome) => fs.readFileSync(path.join(TELAS, nome + '.html'), 'utf8');
const COLUNA = 'data de recepção do protocolo';

function diasAtras(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function preparar() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  return t;
}

function niveis(t) {
  return t.chamar('lerRegistros_')('CATALOGO').filter((item) => item.Tipo === 'NIVEL_ACESSO')
    .map((item) => ({ item, configuracao: JSON.parse(item.Configuracao) }));
}

const PROGRESSO = path.join(__dirname, '..', '05-progresso.md');

function rodarTestesDaCaraDeSistema() {
  console.log('\nEtapa 67: a cara de sistema (a tela inicial saiu na Etapa 68)');

  /* ----------------------------------------------------------------------- */
  secao('A tela inicial saiu (Etapa 68, pedido do PO)');

  teste('não há mais tela inicial: o menu começa no Trabalho, e o sistema abre nele', () => {
    const t = preparar();
    verdadeiro(!t.chamar('RECC_TELAS_DO_SISTEMA').some((uma) => uma.tela === 'inicio'));
    niveis(t).forEach(({ item, configuracao }) =>
      verdadeiro(configuracao.telas.indexOf('inicio') < 0, item.Nome + ' sem a tela inicial'));
    igual(t.chamar('pacoteDePartida()').menu[0].tela, 'trabalho');
    contem(tela('Aplicacao'), "irPara(telaDoEndereco() || 'trabalho', true);");
    verdadeiro(tela('Aplicacao').indexOf('TelaInicio') < 0, 'a rota saiu');
    verdadeiro(tela('Index').indexOf("incluir('Inicio')") < 0, 'o arquivo saiu do esqueleto');
    verdadeiro(!fs.existsSync(path.join(TELAS, 'Inicio.html')), 'e do repositório');
  });

  teste('o código só dela saiu junto', () => {
    const t = preparar();
    ['resumoDoInicio', 'casosEstourados_'].forEach((nome) =>
      igual(t.chamar('typeof ' + nome), 'undefined', nome));
    verdadeiro(tela('Trabalho').indexOf('abrirNoCanal') < 0, 'o atalho do Trabalho');
    verdadeiro(tela('Estilos').indexOf('.inicio-') < 0, 'os estilos');
  });

  teste('o atualizarPGO tira a tela dos níveis de quem rodou a Etapa 67', () => {
    const t = preparar();
    // Uma planilha da Etapa 67: todo nível com a tela inicial na frente.
    niveis(t).forEach(({ item, configuracao }) => {
      configuracao.telas = ['inicio'].concat(configuracao.telas);
      t.chamar('atualizarRegistro_')('CATALOGO', item.__id, { Configuracao: JSON.stringify(configuracao) });
    });
    contem(t.chamar('atualizarPGO()'), 'a tela inicial saiu das telas que ele abre');
    niveis(t).forEach(({ item, configuracao }) => {
      verdadeiro(configuracao.telas.indexOf('inicio') < 0, item.Nome);
      verdadeiro(configuracao.telas.length > 0, item.Nome + ' continua com as outras telas');
    });
    verdadeiro(t.chamar('atualizarPGO()').indexOf('a tela inicial saiu das telas') < 0,
      'a segunda vez não acha nada para tirar');
  });

  teste('um nível que só tinha a tela inicial cai no que sobrar, sem quebrar o menu', () => {
    const t = preparar();
    const consulta = niveis(t).find(({ item }) => item.Nome === 'Consulta');
    consulta.configuracao.telas = ['inicio', 'buscarCaso'];
    t.chamar('atualizarRegistro_')('CATALOGO', consulta.item.__id,
      { Configuracao: JSON.stringify(consulta.configuracao) });
    t.chamar('atualizarPGO()');
    igual(niveis(t).find(({ item }) => item.Nome === 'Consulta').configuracao.telas.join(','), 'buscarCaso');
  });

  /* ----------------------------------------------------------------------- */
  secao('A versão no rodapé');

  teste('a versão vai no pacote de partida e aparece no rodapé do menu', () => {
    const t = preparar();
    igual(t.chamar('pacoteDePartida()').versao, t.chamar('RECC_VERSAO').numero);
    contem(tela('Comuns'), "'<div class=\"versao\">Versão '");
  });

  teste('o número condiz com o que foi entregue: "1." e a última etapa do progresso', () => {
    // A regra do número: "1" é este sistema, construído do zero; depois do
    // ponto, a última etapa registrada em 05-progresso.md. Etapa nova sem
    // trocar a versão — ou versão nova sem a etapa registrada — falha aqui.
    const t = preparar();
    const etapas = (fs.readFileSync(PROGRESSO, 'utf8').match(/^## Etapa (\d+)\b/gm) || [])
      .map((linha) => Number(linha.replace(/\D/g, '')));
    const ultima = Math.max.apply(null, etapas);
    igual(t.chamar('RECC_VERSAO').numero, '1.' + ultima);
  });

  /* ----------------------------------------------------------------------- */
  secao('A linha do tempo do caso');

  teste('os carimbos do caso, em ordem, com a entrada primeiro', () => {
    const p = preparar();
    const caso = p.chamar('cadastrarCaso')(p.ret.id, { nomedocliente: 'Com história', status: 'Pendente' });
    p.chamar('alterarSituacaoDoCaso')(p.ret.id, caso.id, 'Pago', {});
    const linha = p.chamar('casoParaEditar')(p.ret.id, caso.id).linhaDoTempo;
    igual(linha[0].oQue, 'Entrada do caso');
    verdadeiro(linha.some((evento) => /pendente/i.test(evento.oQue)), 'o carimbo do Pendente');
    verdadeiro(linha.some((evento) => /primeira mudança de status/i.test(evento.oQue)), 'a primeira mudança');
  });

  teste('acontecimento antigo vem antes do novo, pela data', () => {
    const p = preparar();
    p.chamar('inserirVariosRegistros_')('BASE_RET', [{ [COLUNA]: diasAtras(10), status: 'Pendente',
      'nome do cliente': 'Antigo', 'Data do 1º contato': diasAtras(5), 'Data do 2º contato': diasAtras(2) }]);
    const caso = p.chamar('lerRegistros_')('BASE_RET', { ultimas: 1 })[0];
    const linha = p.chamar('casoParaEditar')(p.ret.id, caso.__id).linhaDoTempo.map((e) => e.oQue);
    verdadeiro(linha.indexOf('Entrada do caso') < linha.indexOf('Data do 1º contato')
      && linha.indexOf('Data do 1º contato') < linha.indexOf('Data do 2º contato'), linha.join(' | '));
  });

  teste('o "Trabalhar no caso" desenha a linha do tempo', () => {
    contem(tela('Comuns'), 'desenharLinhaDoTempo(osValores.linhaDoTempo)');
  });

  /* ----------------------------------------------------------------------- */
  secao('O acabamento');

  teste('um aviso no canto só, para o sistema inteiro', () => {
    contem(tela('Comuns'), 'function toast(mensagem, tom)');
    ['Configuracoes', 'TabelaCorretoras'].forEach((nome) => {
      contem(tela(nome), 'Moldura.toast(mensagem, tom);');
      verdadeiro(tela(nome).indexOf("aviso.className = 'aviso-flutuante") < 0, nome + ' sem a cópia antiga');
    });
  });

  teste('o Trabalho e a Produtividade carregam com o esqueleto', () => {
    contem(tela('Trabalho'), "Moldura.esqueleto('Somando os casos…')");
    contem(tela('Produtividade'), "Moldura.esqueleto('Somando os números…')");
  });
}

module.exports = { rodarTestesDaCaraDeSistema };
