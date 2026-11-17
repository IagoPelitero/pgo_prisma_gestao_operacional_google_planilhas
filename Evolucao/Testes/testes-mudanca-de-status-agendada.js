/**
 * ============================================================================
 * PGO — testes-mudanca-de-status-agendada.js · o status que muda sozinho (Etapa 78)
 * ============================================================================
 * Pedido do PO: "o Prisma pode mudar status automaticamente dos casos que não
 * estão com status conclusivos, inserindo uma data programada?". As regras
 * vieram dele, uma a uma: agenda-se na importação, em dias corridos a partir
 * dela ("SLA de 7 dias, no 8 muda sozinho"); o destino é escolhido no lote e é
 * um status próprio; só muda quem ainda está em Pendente, Não trabalhado ou
 * Contatando; vale para todos os canais; e a mudança é do sistema — não conta
 * para o analista nem inicia o prazo de retorno.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca } = require('./ferramentas');

const DESTINO = '1º contato realizado';
const QUANDO = 'Mudar status em';
const PARA = 'Mudar status para';
const tela = (nome) => fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', nome + '.html'), 'utf8');

function daqui(dias) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias);
}
const escrita = (data) => [data.getDate(), data.getMonth() + 1].map((n) => (n < 10 ? '0' : '') + n)
  .concat(data.getFullYear()).join('/');

function preparar() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  const canais = t.chamar('canaisVisiveis_()');
  t.ret = canais.find((c) => c.aba === 'BASE_RET');
  t.mesa = canais.find((c) => c.aba === 'BASE_MESA');
  const operacao = t.chamar('lerRegistros_')('CATALOGO')
    .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id;
  t.chamar('salvarUsuario')({ nome: 'Marcos Vieira', email: 'marcos@exemplo.com',
    nivelAcessoId: operacao, canalId: t.ret.id, ativo: true });

  t.lote = (extra, linhas) => {
    const grade = linhas || [['CPF', 'nome do cliente', 'status'],
      ['10000000001', 'Nao trabalhado', ''], ['10000000002', 'Pendente', 'Pendente'],
      ['10000000003', 'Ja retido', 'Retido']];
    return Object.assign({
      fonte: { tipo: 'colado', texto: grade.map((l) => l.join('\t')).join('\n') },
      analistas: ['Marcos Vieira'], origem: 'Lote agendado' }, extra);
  };
  t.importar = (extra, linhas) => t.chamar('importarCasos')(t.ret.id, t.lote(extra, linhas));
  t.agendado = { agendamento: { dias: 7, para: DESTINO } };
  t.caso = (nome) => t.chamar('lerRegistros_')('BASE_RET').find((l) => l['nome do cliente'] === nome);
  /** Faz a data programada de todos os casos agendados ser `dias` a partir de hoje. */
  t.vencerEm = (dias) => t.chamar('lerRegistros_')('BASE_RET').forEach((l) => {
    if (l[QUANDO]) t.chamar('atualizarRegistro_')('BASE_RET', l.__id, { [QUANDO]: daqui(dias) });
  });
  t.rodar = () => t.chamar('mudarStatusAgendados()');
  return t;
}

function rodarTestesDaMudancaDeStatusAgendada() {
  console.log('\nEtapa 78: a mudança de status agendada');

  /* ----------------------------------------------------------------------- */
  secao('Na importação');

  teste('a tela recebe os destinos possíveis: nem conclusivo, nem um dos que o agendamento muda', () => {
    const t = preparar();
    const opcoes = t.chamar('opcoesDaImportacaoDeCasos')(t.ret.id);
    const destinos = opcoes.statusParaAgendar.map((s) => s.valor);
    verdadeiro(destinos.indexOf(DESTINO) >= 0, destinos.join(', '));
    ['Retido', 'Não retido', 'Pendente', 'Não trabalhado'].forEach((nome) =>
      verdadeiro(destinos.indexOf(nome) < 0, nome + ' não pode ser destino'));
    igual(opcoes.statusQueOAgendamentoMuda, 'Pendente, Não trabalhado, Contatando');
  });

  teste('7 dias corridos: o lote importado hoje muda daqui a 7 dias — dia 1, muda no dia 8', () => {
    const t = preparar();
    const resposta = t.importar(t.agendado);
    igual(resposta.agendamento.em, escrita(daqui(7)));
    igual(resposta.agendamento.para, DESTINO);
    ['Nao trabalhado', 'Pendente', 'Ja retido'].forEach((nome) => {
      const caso = t.caso(nome);
      igual(escrita(new Date(caso[QUANDO])), escrita(daqui(7)), nome);
      igual(caso[PARA], DESTINO, nome);
    });
  });

  teste('sem agendamento pedido, as duas colunas ficam vazias', () => {
    const t = preparar();
    igual(t.importar({}).agendamento, null);
    igual(String(t.caso('Pendente')[QUANDO] || '') + String(t.caso('Pendente')[PARA] || ''), '');
  });

  teste('a conferência mostra a data e o destino, sem gravar nada', () => {
    const t = preparar();
    const laudo = t.chamar('conferirImportacaoDeCasos')(t.ret.id, t.lote(t.agendado));
    igual(laudo.agendamento.em + '|' + laudo.agendamento.para + '|' + laudo.agendamento.dias,
      escrita(daqui(7)) + '|' + DESTINO + '|7');
    igual(t.chamar('lerRegistros_')('BASE_RET').length, 0);
  });

  teste('recusa dias fora de 1 a 365, destino conclusivo, destino que o agendamento muda e destino em branco', () => {
    const t = preparar();
    [0, -3, 1.5, 366, 'sete'].forEach((dias) =>
      lanca(() => t.importar({ agendamento: { dias, para: DESTINO } }), 'número inteiro de 1 a 365'));
    ['Retido', 'Pendente', 'Não trabalhado', 'Inventado', ''].forEach((para) =>
      lanca(() => t.importar({ agendamento: { dias: 7, para } }), 'para qual status'));
    igual(t.chamar('lerRegistros_')('BASE_RET').length, 0, 'e nada entrou');
  });

  teste('as colunas do agendamento não são oferecidas no de-para: quem as preenche é o sistema', () => {
    const t = preparar();
    const aceitas = t.chamar('opcoesDaImportacaoDeCasos')(t.ret.id).colunasDoCanal
      .map((c) => String(c.cabecalho || c));
    verdadeiro(aceitas.indexOf(QUANDO) < 0 && aceitas.indexOf(PARA) < 0, aceitas.join(', '));
  });

  teste('as três bases nascem com as duas colunas', () => {
    const t = preparar();
    ['BASE_RET', 'BASE_MESA', 'BASE_VG'].forEach((aba) => {
      const cabecalhos = t.chamar('estruturaDaAba_')(aba).cabecalhos;
      verdadeiro(cabecalhos.indexOf(QUANDO) >= 0 && cabecalhos.indexOf(PARA) >= 0, aba);
    });
  });

  /* ----------------------------------------------------------------------- */
  secao('No dia programado');

  teste('antes da data, nada muda; no dia, muda', () => {
    const t = preparar();
    t.importar(t.agendado);
    igual(t.rodar().mudaram, 0, 'faltam 7 dias');
    t.vencerEm(1);
    igual(t.rodar().mudaram, 0, 'amanhã ainda não é hoje');
    t.vencerEm(0);
    igual(t.rodar().mudaram, 2, 'hoje: o Não trabalhado e o Pendente');
    igual(t.caso('Pendente').status, DESTINO);
    igual(t.caso('Nao trabalhado').status, DESTINO);
  });

  teste('o caso que já foi trabalhado fica como está, e o agendamento dele é desfeito', () => {
    const t = preparar();
    t.importar(t.agendado);
    t.vencerEm(-1);
    const resultado = t.rodar();
    igual(resultado.mudaram + '|' + resultado.desfeitos, '2|1');
    const retido = t.caso('Ja retido');
    igual(retido.status, 'Retido');
    igual(String(retido[QUANDO] || '') + String(retido[PARA] || ''), '', 'não fica esperando para sempre');
  });

  teste('a mudança é do sistema: diz quem e quando, e não conta para o analista nem inicia o prazo', () => {
    const t = preparar();
    t.importar(t.agendado);
    const antes = t.caso('Pendente');
    t.vencerEm(0);
    t.rodar();
    const caso = t.caso('Pendente');
    igual(caso['Quem mudou o status'], 'Sistema (agendamento)');
    verdadeiro(!!caso['Data da última mudança de status'], 'a data da mudança');
    igual(String(caso['Data da primeira mudança de status'] || ''), '', 'o prazo de retorno não começa');
    igual(String(caso['Mudanças de status'] || ''), String(antes['Mudanças de status'] || ''),
      'a contagem de mudanças é a de antes');
    igual(caso.analista, antes.analista, 'o analista é o mesmo');
    igual(String(caso[QUANDO] || '') + String(caso[PARA] || ''), '', 'e o agendamento se desfaz');
  });

  teste('rodar de novo não muda nada: cada agendamento vale uma vez', () => {
    const t = preparar();
    t.importar(t.agendado);
    t.vencerEm(0);
    t.rodar();
    const depois = t.rodar();
    igual(depois.mudaram + '|' + depois.desfeitos, '0|0');
  });

  teste('o caso excluído não é mexido', () => {
    const t = preparar();
    t.importar(t.agendado);
    t.chamar('atualizarRegistro_')('BASE_RET', t.caso('Pendente').__id, { _Visivel: 'NAO' });
    t.vencerEm(0);
    igual(t.rodar().mudaram, 1, 'só o Não trabalhado');
  });

  teste('um caso que não grava não leva os outros junto, e continua agendado', () => {
    const t = preparar();
    t.importar(t.agendado);
    t.vencerEm(0);
    const gravar = t.contexto.atualizarRegistro_;
    const comDefeito = String(t.caso('Pendente').__id);
    t.contexto.atualizarRegistro_ = function (aba, id) {
      if (aba === 'BASE_RET' && String(id) === comDefeito) throw new Error('não gravou');
      return gravar.apply(null, arguments);
    };
    const resultado = t.rodar();
    t.contexto.atualizarRegistro_ = gravar;
    igual(resultado.mudaram + '|' + resultado.desfeitos + '|' + resultado.falharam.length, '1|1|1');
    contem(resultado.falharam[0], 'não gravou');
    igual(t.caso('Pendente').status, 'Pendente');
    verdadeiro(!!t.caso('Pendente')['Mudar status em'], 'o agendamento dele continua');
    igual(t.rodar().mudaram, 1, 'e a rodada seguinte o muda');
  });

  teste('quais status o agendamento muda se ajusta na CONFIG', () => {
    const t = preparar();
    t.importar({ agendamento: { dias: 3, para: '2º contato realizado' } },
      [['CPF', 'nome do cliente', 'status'], ['1', 'No primeiro contato', DESTINO], ['2', 'Pendente', 'Pendente']]);
    t.chamar('gravarConfiguracao_')('AGENDAMENTO.STATUS_DE_ORIGEM', DESTINO);
    t.chamar('esquecerCacheDaConfiguracao_()');
    t.vencerEm(0);
    const resultado = t.rodar();
    igual(resultado.mudaram + '|' + resultado.desfeitos, '1|1');
    igual(t.caso('No primeiro contato').status, '2º contato realizado');
    igual(t.caso('Pendente').status, 'Pendente');
  });

  teste('uma rodada muda até 300 casos; o resto fica para a próxima', () => {
    const t = preparar();
    const linhas = [['CPF', 'nome do cliente', 'status']];
    for (let i = 0; i < 320; i++) linhas.push([String(20000000000 + i), 'Volume ' + i, 'Pendente']);
    t.importar(t.agendado, linhas);
    t.vencerEm(0);
    const primeira = t.rodar();
    igual(primeira.mudaram + '|' + primeira.ficaramParaDepois, '300|20');
    igual(t.rodar().mudaram, 20);
  });

  teste('vale para todos os canais: a Mesa também muda', () => {
    const t = preparar();
    // A Mesa nasce com um status não conclusivo só. O destino é um status
    // próprio, que o PO cria em Configurações › Ajustes Gerais.
    t.chamar('inserirRegistro_')('CATALOGO',
      t.chamar('novoItemDeCatalogo_')('STATUS', t.mesa.id, 'Aguardando cliente', 9, 'atencao', '', false));
    t.chamar('gravarConfiguracao_')('AGENDAMENTO.STATUS_DE_ORIGEM', 'Em andamento');
    t.chamar('esquecerCacheDaConfiguracao_()');
    const canal = t.chamar('canalPeloId_')(t.mesa.id);
    const destinos = t.chamar('statusParaAgendar_')(canal);
    verdadeiro(destinos.length > 0, 'a Mesa tem destino possível');
    t.chamar('inserirVariosRegistros_')('BASE_MESA', [{ Analista: 'Ana Martins', Status: 'Em andamento',
      'Nome do segurado': 'Da Mesa', [QUANDO]: daqui(-1), [PARA]: destinos[0].valor }]);
    igual(t.rodar().mudaram, 1);
    igual(destinos[0].valor, 'Aguardando cliente');
    igual(t.chamar('lerRegistros_')('BASE_MESA')[0].Status, 'Aguardando cliente');
  });

  /* ----------------------------------------------------------------------- */
  secao('O registro e o acionador');

  teste('a auditoria guarda uma linha por canal, com quantos mudaram e quais', () => {
    const t = preparar();
    t.importar(t.agendado);
    t.vencerEm(0);
    t.rodar();
    t.chamar('descarregarAFilaDaAuditoria_')(0);
    const linhas = t.chamar('lerRegistros_')('AUDITORIA').filter((l) => l.Acao === 'caso.status.agendado');
    igual(linhas.length, 1);
    contem(linhas[0].Detalhe, '2 caso(s) mudaram de status pelo agendamento');
    contem(linhas[0].Detalhe, '1 já tinham sido trabalhados');
    contem(linhas[0].Detalhe, String(t.caso('Pendente').__id));
  });

  teste('a importação agendada também fica na auditoria', () => {
    const t = preparar();
    t.importar(t.agendado);
    t.chamar('descarregarAFilaDaAuditoria_')(0);
    const linha = t.chamar('lerRegistros_')('AUDITORIA').filter((l) => l.Acao === 'caso.importar')[0];
    contem(linha.Detalhe, 'mudança de status agendada para ' + escrita(daqui(7)) + ', para "' + DESTINO + '"');
  });

  teste('o diagnóstico cobra o acionador só quando há caso agendado esperando', () => {
    const t = preparar();
    const item = () => JSON.stringify(t.chamar('itemDoAcionadorDoAgendamento_()'));
    contem(item(), 'nenhum caso agendado');
    t.importar(t.agendado);
    contem(item(), '3 caso(s) agendado(s), e o acionador ainda não rodou');
    contem(item(), 'mudarStatusAgendados');
    t.rodar();
    contem(item(), 'o acionador rodou há 0 dia(s)');
  });

  /* ----------------------------------------------------------------------- */
  secao('A tela da importação');

  teste('em branco não agenda; preenchido, vai para o servidor na conferência e na gravação', () => {
    const importacao = tela('Importacao');
    contem(importacao, "return agendarDias === '' ? undefined : { dias: Number(agendarDias), para: agendarPara };");
    igual(importacao.split('agendamento: agendamentoDoLote(),').length - 1, 2, 'nas duas chamadas');
    contem(importacao, '+ escolhaDoAgendamento()');
  });

  teste('a tela diz a data, de quais status sai e que a mudança é do sistema', () => {
    const importacao = tela('Importacao');
    contem(importacao, "'Em <strong>' + diaDaqui(dias) + '</strong>, quem ainda estiver em ' + deQuais");
    contem(importacao, 'Não conta para o \'\n          + \'analista nem inicia o prazo de retorno.');
    contem(importacao, '+ fraseDoAgendamento(resultado.agendamento)');
  });

  teste('mudar o agendamento redesenha a frase sem perder a conferência, e trocar de canal o esquece', () => {
    const importacao = tela('Importacao');
    contem(importacao, "mudancas('#agendar-dias, #agendar-para', function () {\n      guardarOQueEstaNaTela();\n      desenhar();");
    contem(importacao, "agendarDias = '';             // o agendamento é do lote");
  });
}

module.exports = { rodarTestesDaMudancaDeStatusAgendada };
