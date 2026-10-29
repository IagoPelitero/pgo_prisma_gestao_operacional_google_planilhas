/**
 * ============================================================================
 * PGO — testes-historico-da-base.js · a base que esvazia sem perder nada (Etapa 66)
 * ============================================================================
 * Achado da análise de 29/10: a planilha em metade do teto, metade disso a
 * cópia das análises. Decisões do PO: sai o caso ENCERRADO (status Final) que
 * entrou há mais de 13 meses, para uma planilha de histórico que o Buscar Caso
 * também procura; as abas ANALISE_* moram numa planilha própria.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca } = require('./ferramentas');

const COLUNA = 'data de recepção do protocolo';

function haMeses(meses) {
  const d = new Date();
  d.setMonth(d.getMonth() - meses);
  return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
}

function preparar() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  const canais = t.chamar('canaisVisiveis_()');
  t.ret = canais.find((c) => c.aba === 'BASE_RET');
  t.mesa = canais.find((c) => c.aba === 'BASE_MESA');
  t.base = () => t.chamar('lerRegistros_')('BASE_RET', { incluirOcultos: true });
  t.historico = (aba) => {
    const la = t.ambiente.planilhaExternaPeloId(t.idDoHistorico).getSheetByName('HIST_' + (aba || 'BASE_RET'));
    if (!la || la.getLastRow() < 2) return [];
    const valores = la.getRange(1, 1, la.getLastRow(), la.getLastColumn()).getValues();
    return valores.slice(1).map((linha) => {
      const registro = {};
      valores[0].forEach((cabecalho, i) => { registro[cabecalho] = linha[i]; });
      return registro;
    });
  };
  return t;
}

/** A RET de uma planilha em uso: velhos e novos, abertos e fechados, misturados. */
function comCasos(t) {
  t.chamar('inserirVariosRegistros_')('BASE_RET', [
    { [COLUNA]: haMeses(15), status: 'Retido', 'nome do cliente': 'Velho fechado A' },
    { [COLUNA]: haMeses(2), status: 'Retido', 'nome do cliente': 'Recente fechado' },
    { [COLUNA]: haMeses(16), status: 'Pago', 'nome do cliente': 'Velho fechado B' },
    { [COLUNA]: haMeses(15), status: 'Pendente', 'nome do cliente': 'Velho aberto' },
    { [COLUNA]: haMeses(14), status: 'Não retido', 'nome do cliente': 'Velho fechado C' },
    { [COLUNA]: '', status: 'Pago', 'nome do cliente': 'Sem data' }
  ]);
}

function nomes(registros) {
  return registros.map((r) => r['nome do cliente']).sort().join(',');
}

function rodarTestesDoHistoricoDaBase() {
  console.log('\nEtapa 66: o histórico da base e a planilha das análises');

  /* ----------------------------------------------------------------------- */
  secao('Apontar a planilha de histórico');

  teste('sem a planilha, arquivar pede o Id; o acionador não faz nada, mas bate', () => {
    const t = preparar();
    lanca(() => t.chamar('arquivarBaseAgora()'), 'Informe antes o Id');
    igual(t.chamar('arquivarBaseAgendada()').arquivou, false);
    verdadeiro(!!t.ambiente.globais.PropertiesService.getScriptProperties().getProperty('BASE.ACIONADOR_RODOU'));
  });

  teste('o Id é conferido antes de ser guardado', () => {
    const t = preparar();
    lanca(() => t.chamar('salvarHistoricoDaBase')('nao-existe'), 'Não consegui abrir');
    lanca(() => t.chamar('salvarHistoricoDaBase')('planilha-principal'), 'precisa ser OUTRA');
    igual(t.chamar('configuracaoDoArquivoDaBase()').planilhaId, '');
  });

  /* ----------------------------------------------------------------------- */
  secao('Arquivar: copia, confere, apaga');

  const t = preparar();
  comCasos(t);
  t.idDoHistorico = t.ambiente.criarPlanilhaExterna({});
  t.chamar('salvarHistoricoDaBase')(t.idDoHistorico);
  const idsAntes = {};
  t.base().forEach((r) => { idsAntes[r['nome do cliente']] = String(r.__id); });
  const resultado = t.chamar('arquivarBaseAgora()');

  teste('sai só o encerrado de mais de 13 meses; o aberto, o recente e o sem data ficam', () => {
    igual(resultado.arquivados, 3);
    igual(nomes(t.base()), 'Recente fechado,Sem data,Velho aberto');
  });

  teste('o histórico tem os três, com os mesmos Ids e as colunas pelo nome', () => {
    const la = t.historico();
    igual(nomes(la), 'Velho fechado A,Velho fechado B,Velho fechado C');
    la.forEach((r) => igual(String(r.id), idsAntes[r['nome do cliente']], r['nome do cliente']));
    igual(String(la[0].status !== undefined), 'true', 'a coluna de status foi junto');
  });

  teste('rodar de novo não estraga: nada sai, e nada se repete no histórico', () => {
    igual(t.chamar('arquivarBaseAgora()').arquivados, 0);
    igual(t.historico().length, 3);
  });

  teste('a rodada que cai depois de copiar não duplica na próxima', () => {
    const p = preparar();
    comCasos(p);
    p.idDoHistorico = p.ambiente.criarPlanilhaExterna({});
    p.chamar('salvarHistoricoDaBase')(p.idDoHistorico);
    p.chamar('var __copiar = copiarParaOArquivo_; copiarParaOArquivo_ = function () { '
      + '__copiar.apply(null, arguments); throw new Error("a execução caiu aqui"); };');
    try {
      lanca(() => p.chamar('arquivarBaseAgora()'), 'a execução caiu aqui');
    } finally {
      p.chamar('copiarParaOArquivo_ = __copiar;');
    }
    igual(p.base().length, 6, 'nada foi apagado da base');
    igual(p.chamar('arquivarBaseAgora()').arquivados, 3);
    igual(p.historico().length, 3, 'e o histórico não ficou com seis');
  });

  teste('a Mesa também: Concluído de mais de 13 meses sai', () => {
    const p = preparar();
    p.chamar('inserirVariosRegistros_')('BASE_MESA', [
      { 'Data de entrada': haMeses(20), Status: 'Concluído', 'Nome do segurado': 'Velho' },
      { 'Data de entrada': haMeses(20), Status: 'Em andamento', 'Nome do segurado': 'Aberto' }]);
    p.idDoHistorico = p.ambiente.criarPlanilhaExterna({});
    p.chamar('salvarHistoricoDaBase')(p.idDoHistorico);
    p.chamar('arquivarBaseAgora()');
    igual(p.historico('BASE_MESA').map((r) => r['Nome do segurado']).join(','), 'Velho');
    igual(p.chamar('lerRegistros_')('BASE_MESA').map((r) => r['Nome do segurado']).join(','), 'Aberto');
  });

  teste('uma rodada leva no máximo 5.000 por canal, e diz quantos faltam', () => {
    const p = preparar();
    p.chamar('inserirVariosRegistros_')('BASE_RET', Array.from({ length: 5003 },
      (_, i) => ({ [COLUNA]: haMeses(20), status: 'Pago', 'nome do cliente': 'L' + i })));
    p.idDoHistorico = p.ambiente.criarPlanilhaExterna({});
    p.chamar('salvarHistoricoDaBase')(p.idDoHistorico);
    const primeira = p.chamar('arquivarBase_')(new Date());   // sem tempo: uma rodada só
    igual(primeira.arquivados + '|' + primeira.faltam, '5000|3');
    igual(p.chamar('arquivarBaseAgora()').arquivados, 3);
    igual(p.historico().length, 5003);
  });

  teste('o botão repete rodadas, soltando a trava entre uma e outra', () => {
    const p = preparar();
    // Um aberto a cada dois: 400 pedaços, mais que os 150 de uma rodada.
    p.chamar('inserirVariosRegistros_')('BASE_RET', Array.from({ length: 800 },
      (_, i) => ({ [COLUNA]: haMeses(20), status: i % 2 ? 'Pendente' : 'Pago', 'nome do cliente': 'P' + i })));
    p.idDoHistorico = p.ambiente.criarPlanilhaExterna({});
    p.chamar('salvarHistoricoDaBase')(p.idDoHistorico);
    const umaRodada = p.chamar('arquivarBase_')(new Date());
    igual(umaRodada.arquivados + '|' + umaRodada.faltam, '150|250', 'uma rodada: 150 pedaços');
    const antes = p.ambiente.medidor.retrato().travasPedidas;
    const feito = p.chamar('arquivarBaseAgora()');
    igual(feito.arquivados + '|' + feito.faltam, '250|0');
    verdadeiro(p.ambiente.medidor.retrato().travasPedidas - antes >= 3, 'a trava foi pedida a cada rodada');
    igual(p.base().filter((r) => r.status === 'Pendente').length, 400, 'os abertos ficaram');
  });

  teste('os últimos 12 meses da Produtividade não mudam', () => {
    const p = preparar();
    comCasos(p);
    const mes = { tipo: 'mes', mes: haMeses(2).slice(6) + '-' + haMeses(2).slice(3, 5) };
    const antes = p.chamar('produtividadeDaEquipe')(p.ret.id, {}, mes).total;
    p.idDoHistorico = p.ambiente.criarPlanilhaExterna({});
    p.chamar('salvarHistoricoDaBase')(p.idDoHistorico);
    p.chamar('arquivarBaseAgora()');
    igual(p.chamar('produtividadeDaEquipe')(p.ret.id, {}, mes).total, antes);
  });

  /* ----------------------------------------------------------------------- */
  secao('O Buscar Caso acha o arquivado');

  teste('o caso arquivado volta numa origem "histórico", só leitura', () => {
    const achados = t.chamar('buscarCasos')('Velho fechado', [], false, true);
    const historico = achados.origens.find((o) => o.tipo === 'historico');
    igual(historico.somenteLeitura, true);
    igual(historico.casos.length, 3);
    const daBase = achados.origens.find((o) => o.tipo === 'canal' && o.id === t.ret.id);
    igual(daBase.casos.length, 0, 'na base, não estão mais');
  });

  teste('sem pedir o histórico, ele não entra; e a tela oferece a opção', () => {
    const achados = t.chamar('buscarCasos')('Velho fechado', [], false, false);
    verdadeiro(!achados.origens.some((o) => o.tipo === 'historico'));
    igual(t.chamar('opcoesDaBusca()').historico.ligado, true);
  });

  teste('a tela mostra o histórico sem as ações de editar', () => {
    const tela = fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', 'BuscarCaso.html'), 'utf8');
    contem(tela, 'id="incluir-historico"');
    contem(tela, 'var comAcoes = !origem.somenteLeitura;');
  });

  /* ----------------------------------------------------------------------- */
  secao('A planilha das análises');

  teste('apontada a planilha, gerar escreve lá — e a cópia antiga sai daqui', () => {
    const p = preparar();
    const analise = p.chamar('listarAnalises')()[0];
    p.chamar('gerarAnalise')(analise.id);
    verdadeiro(!!p.ambiente.planilha.getSheetByName(analise.aba), 'antes: aqui');
    const id = p.ambiente.criarPlanilhaExterna({});
    p.chamar('salvarPlanilhaDasAnalises')(id);
    p.chamar('gerarAnalise')(analise.id);
    verdadeiro(!!p.ambiente.planilhaExternaPeloId(id).getSheetByName(analise.aba), 'agora: lá');
    verdadeiro(!p.ambiente.planilha.getSheetByName(analise.aba), 'e não aqui');
    igual(p.chamar('listarAnalises')()[0].abaExiste, true);
  });

  teste('o Id das análises também é conferido', () => {
    const p = preparar();
    lanca(() => p.chamar('salvarPlanilhaDasAnalises')('planilha-principal'), 'precisa ser OUTRA');
  });

  /* ----------------------------------------------------------------------- */
  secao('O diagnóstico e a tela');

  teste('sem histórico: nada a cobrar; com histórico e sem acionador: ATENÇÃO', () => {
    const p = preparar();
    const item = () => p.chamar('diagnosticoDoSistema')().blocos.find((b) => b.chave === 'ambiente')
      .itens.find((i) => /Histórico da base/.test(i.oQue));
    igual(item().situacao, 'ok');
    p.chamar('salvarHistoricoDaBase')(p.ambiente.criarPlanilhaExterna({}));
    igual(item().situacao, 'atencao');
    contem(item().comoArrumar, 'arquivarBaseAgendada');
  });

  teste('Configurações mostra o histórico e a planilha das análises, com o aviso do reapontar', () => {
    const tela = fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', 'Configuracoes.html'), 'utf8');
    contem(tela, "Servidor.chamar('configuracaoDoArquivoDaBase')");
    contem(tela, 'id="form-historico-da-base"');
    contem(tela, 'id="form-planilha-das-analises"');
    contem(tela, 'precisa ser reapontado');
  });
}

module.exports = { rodarTestesDoHistoricoDaBase };
