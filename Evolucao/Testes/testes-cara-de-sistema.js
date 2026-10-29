/**
 * ============================================================================
 * PGO — testes-cara-de-sistema.js · a tela inicial e o acabamento (Etapa 67)
 * ============================================================================
 * Decisões do PO: a tela inicial abre o sistema, para todos, com "Meu dia",
 * "O dia da operação", atalhos e novidades; a linha do tempo do caso vem dos
 * carimbos do próprio caso. E o acabamento: o aviso discreto no canto (um só
 * para o sistema), o esqueleto de carregamento e a versão no rodapé.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario } = require('./ferramentas');

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
  t.inicio = () => t.chamar('resumoDoInicio')();
  t.daRet = () => t.inicio().canais.find((c) => c.id === t.ret.id);
  return t;
}

function niveis(t) {
  return t.chamar('lerRegistros_')('CATALOGO').filter((item) => item.Tipo === 'NIVEL_ACESSO')
    .map((item) => ({ item, configuracao: JSON.parse(item.Configuracao) }));
}

function rodarTestesDaCaraDeSistema() {
  console.log('\nEtapa 67: a cara de sistema');

  /* ----------------------------------------------------------------------- */
  secao('A tela inicial abre o sistema, para todos');

  teste('é a primeira tela do sistema, e todo nível nasce com ela', () => {
    const t = preparar();
    igual(t.chamar('RECC_TELAS_DO_SISTEMA')[0].tela, 'inicio');
    niveis(t).forEach(({ item, configuracao }) => igual(configuracao.telas[0], 'inicio', item.Nome));
    igual(t.chamar('pacoteDePartida()').menu[0].tela, 'inicio');
  });

  teste('o atualizarPGO liga a tela nos níveis de antes, uma vez só', () => {
    const t = preparar();
    // Uma planilha de antes da Etapa 67: nenhum nível com a tela.
    niveis(t).forEach(({ item, configuracao }) => {
      configuracao.telas = configuracao.telas.filter((tela) => tela !== 'inicio');
      t.chamar('atualizarRegistro_')('CATALOGO', item.__id, { Configuracao: JSON.stringify(configuracao) });
    });
    contem(t.chamar('atualizarPGO()'), 'a tela inicial passou a abrir o sistema');
    niveis(t).forEach(({ item, configuracao }) => igual(configuracao.telas[0], 'inicio', item.Nome));

    // Quem depois tira a tela de um nível não a vê voltar.
    const consulta = niveis(t).find(({ item }) => item.Nome === 'Consulta');
    consulta.configuracao.telas = consulta.configuracao.telas.filter((tela) => tela !== 'inicio');
    t.chamar('atualizarRegistro_')('CATALOGO', consulta.item.__id,
      { Configuracao: JSON.stringify(consulta.configuracao) });
    t.chamar('atualizarPGO()');
    verdadeiro(niveis(t).find(({ item }) => item.Nome === 'Consulta').configuracao.telas.indexOf('inicio') < 0);
  });

  teste('a tela abre no Início; sem a tela, no primeiro item do menu', () => {
    const aplicacao = tela('Aplicacao');
    contem(aplicacao, "irPara(telaDoEndereco() || 'inicio', true);");
    contem(aplicacao, "inicio: {");
    contem(tela('Index'), "incluir('Inicio')");
  });

  /* ----------------------------------------------------------------------- */
  secao('Meu dia e o dia da operação');

  const t = preparar();
  t.chamar('inserirVariosRegistros_')('BASE_RET', [
    { [COLUNA]: diasAtras(2), analista: 'primeiro.adm', status: 'Pendente', 'nome do cliente': 'Meu atrasado',
      'Data da primeira mudança de status': diasAtras(20) },
    { [COLUNA]: diasAtras(1), analista: 'primeiro.adm', status: 'Não trabalhado', 'nome do cliente': 'Meu novo' },
    { [COLUNA]: diasAtras(1), analista: 'Outra Pessoa', status: 'Pendente', 'nome do cliente': 'Dos outros' },
    { [COLUNA]: new Date(), analista: 'Outra Pessoa', status: 'Pendente', 'nome do cliente': 'Entrou hoje' }
  ]);
  const encerrado = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Encerrado hoje', status: 'Pendente' });
  t.chamar('alterarSituacaoDoCaso')(t.ret.id, encerrado.id, 'Pago', {});

  teste('Meu dia: só os MEUS abertos, e os estourados entre eles', () => {
    const ret = t.daRet();
    igual(ret.meuDia.abertos, 2, 'o atrasado e o novo; o dos outros e o encerrado não');
    igual(ret.meuDia.estourados, 1, 'o de 20 dias passou dos 3 dias úteis');
  });

  teste('o dia da operação: entradas e encerrados de hoje, e os abertos de todos', () => {
    const ret = t.daRet();
    igual(ret.operacao.entradasHoje, 2, 'o que entrou hoje e o cadastrado hoje');
    igual(ret.operacao.encerradosHoje, 1, 'o Pago de hoje');
    igual(ret.operacao.abertos, 4);
  });

  teste('os números contam como o Trabalho conta (perto de vencer e estourados)', () => {
    const canal = t.chamar('canalPeloId_')(t.ret.id);
    const abertos = t.chamar('lerRegistros_')('BASE_RET').filter((r) => r.status !== 'Pago');
    igual(t.daRet().operacao.estourados, t.chamar('casosEstourados_')(abertos, canal).length);
    igual(t.daRet().operacao.pertoDeVencer, t.chamar('casosPertoDeVencer_')(abertos, canal).length);
  });

  teste('quem só vê os próprios casos não recebe o dia da operação', () => {
    const operacao = t.chamar('lerRegistros_')('CATALOGO')
      .find((item) => item.Tipo === 'NIVEL_ACESSO' && item.Nome === 'Operação');
    t.chamar('salvarUsuario')({ nome: 'Outra Pessoa', email: 'outra@exemplo.com',
      nivelAcessoId: operacao.Id, canalId: '', ativo: true });
    comoUsuario(t.ambiente, 'outra@exemplo.com', () => {
      const ret = t.daRet();
      igual(ret.operacao, null);
      igual(ret.meuDia.abertos, 2, 'os dois dela');
    });
  });

  teste('a versão e as novidades vêm junto; o pacote de partida leva o número', () => {
    const resumo = t.inicio();
    verdadeiro(resumo.versao.novidades.length > 0);
    igual(t.chamar('pacoteDePartida()').versao, resumo.versao.numero);
  });

  teste('a tela inicial é só de quem a tem', () => {
    comoUsuario(t.ambiente, 'ninguem@exemplo.com', () => lanca(() => t.inicio()));
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

  teste('o Trabalho, a Produtividade e o Início carregam com o esqueleto', () => {
    contem(tela('Trabalho'), "Moldura.esqueleto('Somando os casos…')");
    contem(tela('Produtividade'), "Moldura.esqueleto('Somando os números…')");
    contem(tela('Inicio'), "Moldura.esqueleto('Preparando o seu dia…', 3)");
  });

  teste('a versão aparece no rodapé do menu', () => {
    contem(tela('Comuns'), "'<div class=\"versao\">Versão '");
  });
}

module.exports = { rodarTestesDaCaraDeSistema };
