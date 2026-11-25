/**
 * ============================================================================
 * PGO — testes-sub-abas-do-trabalho.js · o Trabalho sem período, em sub-abas (Etapa 84)
 * ============================================================================
 * Pedido do PO: tirar o período do Trabalho; na RET, "Casos em aberto" (1º
 * Retido ainda não transmitido, 2º Pendente, 3º Contatando, 4º Não trabalhado,
 * 5º Acompanhamento; do mais antigo para o mais recente) e "Casos concluídos";
 * na Mesa, "Casos em andamento" (Em andamento) e "Casos concluídos"; o VG sem
 * sub-abas. As abas conversam — o caso que muda de status muda de aba —, e
 * tudo se ajusta em Configurações. Decisões do PO: sem status vai para a aba 1,
 * no fim; a aba 2 mostra os 5.000 mais recentes; número de casos em cada aba,
 * cartões por aba, filtro Status só da aba, lembrar a última aba.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { secao, teste, igual, verdadeiro, contem, lanca, comoUsuario, comAFilaDaTela } = require('./ferramentas');
const { retComStatusProposta } = require('./testes-condicional');

const DA_RET = 'data de recepção do protocolo';
const lerTela = (nome) => fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

function diasAtras(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(10, 0, 0, 0);
  return d;
}

/** A RET do PO: Status proposta, Contatando e Acompanhamento, e as sub-abas montadas como ele pediu. */
function retDoPO() {
  const t = retComStatusProposta();
  ['Contatando', 'Acompanhamento'].forEach((nome, i) => {
    t.chamar('salvarItemDoCatalogo')({ tipo: 'STATUS', canalId: t.ret.id, nome, ordem: 50 + i,
      ativo: true, cor: 'atencao' });
  });
  // Monta de novo, como o atualizarPGO numa planilha que tem tudo.
  t.chamar('gravarConfiguracao_')('MIGRACAO.SUB_ABAS_DO_TRABALHO', '');
  t.chamar('lerRegistros_')('CANAIS').forEach((canal) => {
    t.chamar('atualizarRegistro_')('CANAIS', canal.Id, { SubAbasDoTrabalho: '', FiltrosDoTrabalho: '' });
  });
  t.chamar('esquecerCacheDaConfiguracao_()');
  t.laudo = t.chamar('montarAsSubAbasDoTrabalho_')([], []);
  t.chamar('esquecerCacheDaConfiguracao_()');
  t.resumo = (aba, filtros, quantos) => comAFilaDaTela(t.chamar('resumoDoCanal')(t.ret.id, filtros || {},
    null, quantos || 'todos', false, aba));
  t.nomes = (resumo) => resumo.fila.map((caso) => (JSON.stringify(caso.celulas).match(/Caso [A-Za-z0-9]+/) || [''])[0]);
  t.canal = () => t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  return t;
}

/** Os casos de todos os tipos que a RET tem. */
function comCasos(t) {
  const caso = (nome, status, dias, extra) => Object.assign({ [DA_RET]: diasAtras(dias), status,
    'nome do cliente': 'Caso ' + nome, analista: 'Ana Martins' }, extra || {});
  t.chamar('inserirVariosRegistros_')('BASE_RET', [
    caso('P1', 'Pendente', 5),
    caso('R1', 'Retido', 10, { 'Status proposta': 'Aguardando transmissão', valordopremioretido: 10 }),
    caso('RT', 'Retido', 8, { 'Status proposta': 'Transmitido', valordopremioretido: 10 }),
    caso('R3', 'Retido', 15, { 'Status proposta': '', valordopremioretido: 10 }),
    caso('P2', 'Pendente', 20),
    caso('C1', 'Contatando', 3),
    caso('N1', 'Não trabalhado', 1),
    caso('A1', 'Acompanhamento', 2),
    caso('S1', '', 4),
    caso('X1', 'Não retido', 1, { analista: 'Diego Castilho' }),
    caso('X2', 'Pago', 30)
  ]);
}

function rodarTestesDasSubAbasDoTrabalho() {
  console.log('\nEtapa 84: o Trabalho sem período, em sub-abas');

  /* ----------------------------------------------------------------------- */
  secao('A montagem: RET, Mesa e VG como o PO pediu');

  const t = retDoPO();
  comCasos(t);

  teste('a RET: Aguardando transmissão (Retido não transmitido), Pendente, Contatando, Não trabalhado, Acompanhamento', () => {
    const sub = JSON.parse(t.canal().subAbasDoTrabalho);
    igual(sub.abas.join(' | '), 'Casos em aberto | Casos concluídos');
    igual(sub.status.map((s) => s.rotulo || s.status).join(', '),
      'Aguardando transmissão, Pendente, Contatando, Não trabalhado, Acompanhamento');
    igual(sub.status[0].coluna, 'Status proposta');
    igual(sub.status[0].saiCom.join(', '), 'Transmitido, Sem alteração');
    igual(sub.ordem.join(','), 'antigos,recentes');
  });

  teste('a Mesa: Em andamento; o VG: sem sub-abas', () => {
    const canais = t.chamar('canaisVisiveis_()');
    const mesa = JSON.parse(canais.find((c) => c.aba === 'BASE_MESA').subAbasDoTrabalho);
    igual(mesa.abas.join(' | '), 'Casos em andamento | Casos concluídos');
    igual(mesa.status.map((s) => s.status).join(','), 'Em andamento');
    igual(canais.find((c) => c.aba === 'BASE_VG').subAbasDoTrabalho, '');
  });

  teste('os filtros da RET: Status, Tentativas de contato, Status proposta, Analista, Canal de origem, Cód. do produto', () => {
    const rotulos = t.resumo(1).filtrosDisponiveis.map((f) => f.rotulo);
    igual(rotulos.filter((r) => r !== 'Status').join(' | '),
      'Tentativas de contato | Status proposta | Analista | Canal de origem | Cód. do produto e produto');
  });

  teste('roda uma vez: depois, quem manda é Configurações', () => {
    const pulados = [];
    igual(t.chamar('montarAsSubAbasDoTrabalho_')(pulados, []).length, 0);
    contem(pulados.join(' | '), 'já foram montadas');
  });

  teste('o status que a planilha não tem fica de fora, e o laudo diz', () => {
    const x = retComStatusProposta();   // sem Contatando nem Acompanhamento
    x.chamar('gravarConfiguracao_')('MIGRACAO.SUB_ABAS_DO_TRABALHO', '');
    x.chamar('lerRegistros_')('CANAIS').forEach((c) => x.chamar('atualizarRegistro_')('CANAIS', c.Id, { SubAbasDoTrabalho: '' }));
    x.chamar('esquecerCacheDaConfiguracao_()');
    const paraVoce = [];
    x.chamar('montarAsSubAbasDoTrabalho_')([], paraVoce);
    contem(paraVoce.join(' | '), '"Contatando", "Acompanhamento"');
  });

  /* ----------------------------------------------------------------------- */
  secao('A aba 1: os casos de trabalho, na prioridade do PO');

  teste('a ordem: o status (prioridade) e, dentro dele, do mais antigo para o mais recente; sem status no fim', () => {
    igual(t.nomes(t.resumo(1)).join(','), 'Caso R3,Caso R1,Caso P2,Caso P1,Caso C1,Caso N1,Caso A1,Caso S1');
  });

  teste('o Retido transmitido vai para os concluídos; o não transmitido (e o vazio) fica em aberto', () => {
    const concluidos = t.nomes(t.resumo(2));
    verdadeiro(concluidos.indexOf('Caso RT') >= 0);
    verdadeiro(concluidos.indexOf('Caso R1') < 0 && concluidos.indexOf('Caso R3') < 0);
  });

  teste('a aba 2: os demais, do mais recente para o mais antigo', () => {
    igual(t.nomes(t.resumo(2)).join(','), 'Caso X1,Caso RT,Caso X2');
  });

  teste('o número de cada aba vem na resposta, nas duas', () => {
    igual(JSON.stringify(t.resumo(1).subAbas.contagem), '[8,3]');
    igual(JSON.stringify(t.resumo(2).subAbas.contagem), '[8,3]');
    igual(t.resumo(2).subAbas.atual, 2);
  });

  teste('sem dizer a aba, abre na 1', () => {
    igual(t.chamar('resumoDoCanal')(t.ret.id, {}).subAbas.atual, 1);
  });

  /* ----------------------------------------------------------------------- */
  secao('As abas conversam: o caso que muda de status muda de aba');

  teste('o Pendente que vira Não retido sai da aba 1 e entra na 2', () => {
    const p1 = t.chamar('lerRegistros_')('BASE_RET').find((r) => r['nome do cliente'] === 'Caso P1');
    t.chamar('atualizarRegistro_')('BASE_RET', p1.__id, { status: 'Não retido' });
    verdadeiro(t.nomes(t.resumo(1)).indexOf('Caso P1') < 0, 'saiu da aba 1');
    verdadeiro(t.nomes(t.resumo(2)).indexOf('Caso P1') >= 0, 'está na aba 2');
    igual(JSON.stringify(t.resumo(1).subAbas.contagem), '[7,4]');
    t.chamar('atualizarRegistro_')('BASE_RET', p1.__id, { status: 'Pendente' });
    igual(t.nomes(t.resumo(1)).join(','), 'Caso R3,Caso R1,Caso P2,Caso P1,Caso C1,Caso N1,Caso A1,Caso S1',
      'de volta, no lugar da prioridade');
  });

  teste('o Retido que tem a proposta transmitida vai para os concluídos', () => {
    const r1 = t.chamar('lerRegistros_')('BASE_RET').find((r) => r['nome do cliente'] === 'Caso R1');
    t.chamar('atualizarRegistro_')('BASE_RET', r1.__id, { 'Status proposta': 'Transmitido' });
    verdadeiro(t.nomes(t.resumo(2)).indexOf('Caso R1') >= 0);
    t.chamar('atualizarRegistro_')('BASE_RET', r1.__id, { 'Status proposta': 'Aguardando transmissão' });
  });

  /* ----------------------------------------------------------------------- */
  secao('Cartões e filtros de cada aba');

  teste('aba 1: o total e um cartão por status da lista, na ordem; o Sem status quando há', () => {
    igual(t.resumo(1).cartoes.map((c) => c.rotulo + '=' + c.valor).join(', '),
      'Total em aberto=8, Aguardando transmissão=2, Pendente=2, Contatando=1, Não trabalhado=1, '
      + 'Acompanhamento=1, Sem status=1');
    verdadeiro(t.resumo(1).cartoes.every((c) => c.variacao === null), 'sem período, sem seta');
  });

  teste('aba 2: o total e um cartão por status que tem caso', () => {
    igual(t.resumo(2).cartoes.map((c) => c.rotulo + '=' + c.valor).join(', '),
      'Total concluídos=3, Não retido=1, Retido=1, Pago=1', 'na ordem do catálogo');
  });

  teste('clicar num cartão filtra a fila; o Total desliga', () => {
    const cartao = t.resumo(1).cartoes.find((c) => c.rotulo === 'Pendente');
    igual(t.nomes(t.resumo(1, { cartao: cartao.id })).join(','), 'Caso P2,Caso P1');
    igual(t.resumo(1, { cartao: 'aba:total' }).total, 8);
    const pago = t.resumo(2).cartoes.find((c) => c.rotulo === 'Pago');
    igual(t.nomes(t.resumo(2, { cartao: pago.id })).join(','), 'Caso X2');
  });

  teste('os outros cartões de Painéis (valor de um campo) ficam na aba onde contam caso, e filtram', () => {
    const v = retDoPO();
    comCasos(v);
    const padrao = v.chamar('listarCardsDoPainel')('trabalho', v.ret.id).cartoes.filter((c) => c.mostrar);
    v.chamar('salvarCardsDoPainel')('trabalho', v.ret.id, padrao.concat([{ titulo: 'Transmitidos',
      dimensao: 'valor', coluna: 'Status proposta', filtro: 'Transmitido', cor: 'bom', mostrar: true }]));
    const naAba = (aba) => v.resumo(aba).cartoes.map((c) => c.rotulo + '=' + c.valor);
    verdadeiro(naAba(1).every((c) => c.indexOf('Transmitidos') < 0), 'na aba 1 não conta caso, fica fora: ' + naAba(1));
    verdadeiro(naAba(2).indexOf('Transmitidos=1') >= 0, 'na aba 2 conta o Retido transmitido: ' + naAba(2));
    igual(naAba(2).filter((c) => /^Total/.test(c)).length, 1, 'o Total de Painéis não repete o da aba');
    const cartao = v.resumo(2).cartoes.find((c) => c.rotulo === 'Transmitidos');
    igual(v.nomes(v.resumo(2, { cartao: cartao.id })).join(','), 'Caso RT', 'clicar filtra a fila');
  });

  teste('o filtro Status mostra só os status da aba (o Retido, com condição, nas duas)', () => {
    const opcoes = (aba) => t.resumo(aba).filtrosDisponiveis.find((f) => f.rotulo === 'Status')
      .opcoes.map((o) => o.valor);
    const daAba1 = opcoes(1);
    verdadeiro(daAba1.indexOf('Pendente') >= 0 && daAba1.indexOf('Retido') >= 0);
    verdadeiro(daAba1.indexOf('Pago') < 0, 'o Pago é da aba 2');
    const daAba2 = opcoes(2);
    verdadeiro(daAba2.indexOf('Pago') >= 0 && daAba2.indexOf('Retido') >= 0);
    verdadeiro(daAba2.indexOf('Pendente') < 0, 'o Pendente é da aba 1');
  });

  teste('a Mesa, com um status só na aba 1, não tem o filtro Status — e ganha quando outro entra', () => {
    const mesa = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
    const temStatus = () => t.chamar('resumoDoCanal')(mesa.id, {}, null, '', false, 1).filtrosDisponiveis
      .some((f) => f.cabecalho.toLowerCase() === 'status');
    verdadeiro(!temStatus(), 'um status só: sem filtro');
    const sub = JSON.parse(mesa.subAbasDoTrabalho);
    sub.status.push({ status: 'Concluído' });
    t.chamar('atualizarRegistro_')('CANAIS', mesa.id, { SubAbasDoTrabalho: JSON.stringify(sub) });
    t.chamar('esquecerCacheDaConfiguracao_()');
    verdadeiro(temStatus(), 'dois status: o filtro volta');
    sub.status.pop();
    t.chamar('atualizarRegistro_')('CANAIS', mesa.id, { SubAbasDoTrabalho: JSON.stringify(sub) });
    t.chamar('esquecerCacheDaConfiguracao_()');
  });

  teste('a busca procura na planilha toda e diz quantos achou em cada aba', () => {
    const achado = t.resumo(1, { busca: 'Caso' });
    igual(JSON.stringify(achado.subAbas.contagem), '[8,3]');
    igual(achado.total, 8, 'a aba 1 mostra os dela');
    igual(t.resumo(2, { busca: 'Caso X' }).total, 2);
    igual(JSON.stringify(t.resumo(1, { busca: 'Caso X' }).subAbas.contagem), '[0,2]',
      'na aba 1, a busca diz que os achados estão na 2');
  });

  /* ----------------------------------------------------------------------- */
  secao('O alcance, o caso excluído e o teto');

  teste('quem vê só os próprios casos tem as abas, os números e os cartões só dos dele', () => {
    const operacao = t.chamar('lerRegistros_("CATALOGO")').find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    t.chamar('salvarUsuario')({ nome: 'Diego Castilho', email: 'diego@exemplo.com', nivelAcessoId: operacao.Id, ativo: true });
    comoUsuario(t.ambiente, 'diego@exemplo.com', () => {
      const daAba2 = t.resumo(2);
      igual(JSON.stringify(daAba2.subAbas.contagem), '[0,1]');
      igual(t.nomes(daAba2).join(','), 'Caso X1');
      igual(t.resumo(1).total, 0);
    });
  });

  teste('o caso ocultado não aparece, nem conta na aba aberta', () => {
    const a1 = t.chamar('lerRegistros_')('BASE_RET').find((r) => r['nome do cliente'] === 'Caso A1');
    t.chamar('atualizarRegistro_')('BASE_RET', a1.__id, { _Visivel: 'NAO' });
    const resumo = t.resumo(1);
    verdadeiro(t.nomes(resumo).indexOf('Caso A1') < 0);
    igual(resumo.subAbas.contagem[0], 7, 'a aba aberta conta o que mostra');
    t.chamar('atualizarRegistro_')('BASE_RET', a1.__id, { _Visivel: 'SIM' });
  });

  teste('a aba 2 mostra os mais recentes até o teto, com aviso; o número da aba é o real', () => {
    t.chamar('gravarConfiguracao_')('OPERACAO.LINHAS_DO_PAINEL', '2');
    t.chamar('esquecerCacheDaConfiguracao_()');
    try {
      const resumo = t.resumo(2);
      // As 2 últimas linhas da planilha (as que entraram por último), na ordem da data.
      igual(t.nomes(resumo).join(','), 'Caso X1,Caso X2', 'as 2 mais recentes da planilha');
      igual(resumo.truncada, true);
      igual(resumo.subAbas.contagem[1], 3, 'o número da aba conta todos');
      contem(lerTela('Trabalho.html'), "Moldura.avisoDeJanela(resumo, 'Estes números e esta fila')");
    } finally {
      t.chamar('gravarConfiguracao_')('OPERACAO.LINHAS_DO_PAINEL', '');
      t.chamar('esquecerCacheDaConfiguracao_()');
    }
  });

  /* ----------------------------------------------------------------------- */
  secao('A velocidade');

  teste('a aba 1 não lê os concluídos: com 3.000 encerrados, lê só as colunas e os abertos', () => {
    const v = retDoPO();
    const lote = [];
    for (let i = 0; i < 3000; i++) lote.push({ [DA_RET]: diasAtras(100), status: 'Não retido', 'nome do cliente': 'Velho ' + i });
    for (let i = 0; i < 20; i++) lote.push({ [DA_RET]: diasAtras(i), status: 'Pendente', 'nome do cliente': 'Caso Aberto' + i });
    v.chamar('inserirVariosRegistros_')('BASE_RET', lote);
    v.resumo(1);
    v.ambiente.medidor.zerar();
    const resumo = v.chamar('resumoDoCanal')(v.ret.id, {}, null, '', false, 1);
    const lidas = v.ambiente.medidor.retrato().celulasLidas;
    igual(resumo.total, 20);
    const largura = v.chamar('estruturaDaAba_')('BASE_RET').cabecalhos.length;
    verdadeiro(lidas < 3020 * 4 + 20 * largura + 500,
      'leu ' + lidas + ' células: as colunas do status e da condição, e as 20 linhas abertas');
    verdadeiro(lidas < 3020 * largura / 4, 'muito menos que a base inteira (' + 3020 * largura + ')');
  });

  teste('a aba 1 com abertos espalhados lê em poucas idas', () => {
    const v = retDoPO();
    const lote = [];
    for (let i = 0; i < 200; i++) {
      for (let k = 0; k < 60; k++) lote.push({ [DA_RET]: diasAtras(50), status: 'Não retido', 'nome do cliente': 'F' });
      lote.push({ [DA_RET]: diasAtras(50), status: 'Pendente', 'nome do cliente': 'Caso Espalhado' + i });
    }
    v.chamar('inserirVariosRegistros_')('BASE_RET', lote);
    v.resumo(1);
    v.ambiente.medidor.zerar();
    const resumo = v.chamar('resumoDoCanal')(v.ret.id, {}, null, '', false, 1);
    igual(resumo.total, 200);
    verdadeiro(v.ambiente.medidor.retrato().idasParaLer < 60,
      'idas: ' + v.ambiente.medidor.retrato().idasParaLer + ' (eram 200 pedaços)');
    // E sem trazer a base inteira para economizar idas: junta só o que vale.
    const largura = v.chamar('estruturaDaAba_')('BASE_RET').cabecalhos.length;
    verdadeiro(v.ambiente.medidor.retrato().celulasLidas < 12200 * largura / 2,
      'células: ' + v.ambiente.medidor.retrato().celulasLidas + ' (a base inteira seria ' + 12200 * largura + ')');
  });

  teste('buracos grandes entre os abertos não são lidos: juntar custaria mais que as idas', () => {
    const v = retDoPO();
    const lote = [];
    for (let i = 0; i < 15; i++) {
      for (let k = 0; k < 800; k++) lote.push({ [DA_RET]: diasAtras(90), status: 'Pago', 'nome do cliente': 'F' });
      lote.push({ [DA_RET]: diasAtras(90), status: 'Pendente', 'nome do cliente': 'Caso Longe' + i });
    }
    v.chamar('inserirVariosRegistros_')('BASE_RET', lote);
    v.resumo(1);
    v.ambiente.medidor.zerar();
    igual(v.chamar('resumoDoCanal')(v.ret.id, {}, null, '', false, 1).total, 15);
    const largura = v.chamar('estruturaDaAba_')('BASE_RET').cabecalhos.length;
    verdadeiro(v.ambiente.medidor.retrato().celulasLidas < 12015 * largura / 4,
      'células: ' + v.ambiente.medidor.retrato().celulasLidas + ' (a base inteira seria ' + 12015 * largura + ')');
  });

  teste('a leitura leve dá o mesmo resultado que a leitura das linhas inteiras', () => {
    const v = retDoPO();
    // Um cartão de Painéis numa coluna que não é filtro: a leve tem que lê-la.
    const padrao = v.chamar('listarCardsDoPainel')('trabalho', v.ret.id).cartoes.filter((c) => c.mostrar);
    v.chamar('salvarCardsDoPainel')('trabalho', v.ret.id, padrao.concat([{ titulo: 'Com nome',
      dimensao: 'preenchido', filtro: 'nome do cliente', cor: 'bom', mostrar: true }]));
    const lote = [];
    for (let i = 0; i < 400; i++) {
      lote.push({ [DA_RET]: diasAtras(i % 90), status: ['Pendente', 'Não retido', 'Contatando', 'Pago',
        'Não trabalhado', 'Retido'][i % 6], 'nome do cliente': 'Caso L' + i, analista: i % 3 ? 'Ana Martins' : 'Diego Castilho',
        'Status proposta': i % 12 === 5 ? 'Transmitido' : '', valordopremioretido: 10,
        // Alguns ocultos: a leve os tira pela _Visivel, a inteira pela linha.
        _Visivel: i % 37 === 0 ? 'NAO' : 'SIM' });
    }
    v.chamar('inserirVariosRegistros_')('BASE_RET', lote);
    const oQueImporta = (aba, filtros) => {
      const r = v.chamar('resumoDoCanal')(v.ret.id, filtros || {}, null, '', false, aba);
      return JSON.stringify({ total: r.total, contagem: r.subAbas.contagem,
        cartoes: r.cartoes.map((c) => c.rotulo + '=' + c.valor),
        filtros: r.filtrosDisponiveis.map((f) => f.rotulo + ':' + f.opcoes.map((o) => o.quantos).join('/')),
        fila: r.fila.slice(0, 20).map((c) => c.id) });
    };
    const casos = [[1], [2], [1, { analista: ['Diego Castilho'] }], [2, { status: ['Pago'] }]];
    v.chamar("RECC_LEITURA_DA_SUB_ABA = 'leve'");
    const leve = casos.map((c) => oQueImporta(c[0], c[1]));
    v.ambiente.medidor.zerar();
    v.chamar('resumoDoCanal')(v.ret.id, {}, null, '', false, 1);
    const celulasLeve = v.ambiente.medidor.retrato().celulasLidas;
    v.chamar("RECC_LEITURA_DA_SUB_ABA = 'linhas'");
    const inteira = casos.map((c) => oQueImporta(c[0], c[1]));
    v.chamar("RECC_LEITURA_DA_SUB_ABA = ''");
    casos.forEach((c, i) => igual(leve[i], inteira[i], 'aba ' + c[0] + ' ' + JSON.stringify(c[1] || {})));
    const largura = v.chamar('estruturaDaAba_')('BASE_RET').cabecalhos.length;
    verdadeiro(celulasLeve < 400 * largura, 'a leve leu ' + celulasLeve + ' células, menos que as linhas inteiras');
  });

  teste('na leitura leve, só 20 linhas vêm inteiras; pedir 50 traz 50', () => {
    const v = retDoPO();
    const lote = [];
    for (let i = 0; i < 300; i++) lote.push({ [DA_RET]: diasAtras(i % 60), status: 'Pendente', 'nome do cliente': 'Caso M' + i });
    v.chamar('inserirVariosRegistros_')('BASE_RET', lote);
    v.chamar("RECC_LEITURA_DA_SUB_ABA = 'leve'");
    try {
      igual(v.chamar('resumoDoCanal')(v.ret.id, {}, null, '', false, 1).fila.length, 20);
      igual(v.chamar('resumoDoCanal')(v.ret.id, {}, null, 50, false, 1).fila.length, 50);
      igual(v.chamar('resumoDoCanal')(v.ret.id, {}, null, 'todos', false, 1).fila.length, 300);
    } finally {
      v.chamar("RECC_LEITURA_DA_SUB_ABA = ''");
    }
    v.chamar("RECC_LEITURA_DA_SUB_ABA = 'linhas'");
    try {
      igual(v.chamar('resumoDoCanal')(v.ret.id, {}, null, '', false, 1).fila.length, 100,
        'sem a leitura leve, os 100 de sempre');
    } finally {
      v.chamar("RECC_LEITURA_DA_SUB_ABA = ''");
    }
    // Sem forçar, quem escolhe é a régua da planilha do PO (Etapa 88). 300 casos
    // JUNTOS saem numa ida só pelas linhas inteiras; a conta da leve supõe as 20
    // da fila espalhadas (o pior caso) e fica com o caminho de antes.
    igual(v.chamar('resumoDoCanal')(v.ret.id, {}, null, '', false, 1).fila.length, 100,
      'sem forçar, 300 casos juntos seguem pelas linhas, como na 1.87');
  });

  /* ----------------------------------------------------------------------- */
  secao('Configurações › Canais de trabalho');

  const c = retDoPO();
  const salvar = (extra) => c.chamar('salvarCanal')(Object.assign({ id: c.ret.id, nome: c.ret.nome,
    colunaDaData: c.ret.colunaDaData, colunaDoStatus: c.ret.colunaDoStatus, colunasDaFila: c.ret.colunasDaFila,
    colunasDaBusca: c.ret.colunasDaBusca }, extra));

  teste('a tela de Configurações recebe as sub-abas, os filtros e os campos de lista', () => {
    const canal = c.chamar('listarCanaisConfiguraveis')().find((k) => k.aba === 'BASE_RET');
    igual(JSON.parse(canal.subAbasDoTrabalho).status.length, 5);
    contem(canal.filtrosDoTrabalho, 'tentativasdecontato');
    verdadeiro(canal.camposDeLista.some((k) => k.rotulo === 'Status proposta'));
  });

  teste('mudar a ordem e os status grava, e o Trabalho segue', () => {
    salvar({ subAbasDoTrabalho: { abas: ['Fila', 'Fechados'], status: [{ status: 'Não trabalhado' },
      { status: 'Pendente' }], ordem: ['recentes', 'antigos'] } });
    const sub = JSON.parse(c.chamar('canaisVisiveis_()').find((k) => k.aba === 'BASE_RET').subAbasDoTrabalho);
    igual(sub.abas.join('|') + ' · ' + sub.status.map((s) => s.status).join(',') + ' · ' + sub.ordem.join(','),
      'Fila|Fechados · Não trabalhado,Pendente · recentes,antigos');
  });

  teste('desligar tira as sub-abas; o canal volta a ser uma fila só', () => {
    salvar({ subAbasDoTrabalho: null });
    igual(c.chamar('resumoDoCanal')(c.ret.id, {}).subAbas, null);
  });

  teste('o que não existe é recusado, dizendo o quê', () => {
    lanca(() => salvar({ subAbasDoTrabalho: { status: [{ status: 'Inventado' }] } }), 'não existe neste canal');
    lanca(() => salvar({ subAbasDoTrabalho: { status: [{ status: 'Retido', coluna: 'Coluna que não há',
      saiCom: ['X'] }] } }), 'Coluna que não há');
    lanca(() => salvar({ subAbasDoTrabalho: { status: [{ status: 'Retido', coluna: 'Status proposta',
      saiCom: [] }] } }), 'nenhum valor');
    lanca(() => salvar({ subAbasDoTrabalho: { status: [] } }), 'ao menos um status');
    lanca(() => salvar({ filtrosDoTrabalho: ['naoexiste'] }), 'não é um campo de lista');
    // Etapa 93: a lista escolhida vai até 7 (o Tipo de emissão da RET); a 8ª é recusada.
    lanca(() => salvar({ filtrosDoTrabalho: ['status', 'analista', 'canal', 'codproduto',
      'tentativasdecontato', 'formadepagamento', 'motivodocancelamento', 'statusproposta'] }), 'até 7');
  });

  teste('os filtros escolhidos mandam na ordem; em branco, voltam os de sempre', () => {
    salvar({ filtrosDoTrabalho: ['analista', 'status'] });
    igual(c.chamar('resumoDoCanal')(c.ret.id, {}).filtrosDisponiveis.map((f) => f.rotulo).join(' | '), 'Analista | Status');
    salvar({ filtrosDoTrabalho: [] });
    igual(c.chamar('resumoDoCanal')(c.ret.id, {}).filtrosDisponiveis[0].rotulo, 'Status', 'os de sempre: o Status primeiro');
  });

  teste('a tela que não manda os campos não mexe neles', () => {
    salvar({ subAbasDoTrabalho: { status: [{ status: 'Pendente' }] }, filtrosDoTrabalho: ['analista'] });
    salvar({});
    const canal = c.chamar('canaisVisiveis_()').find((k) => k.aba === 'BASE_RET');
    igual(JSON.parse(canal.subAbasDoTrabalho).status[0].status, 'Pendente');
    igual(canal.filtrosDoTrabalho, 'analista');
  });

  /* ----------------------------------------------------------------------- */
  secao('Etapa 93 · o Tipo de emissão como 7º filtro da RET');

  // A RET do PO com o campo de lista que ele criou na planilha.
  const comEmissao = () => {
    const e = retDoPO();
    const lista = e.chamar('criarLista')('Tipo de emissão');
    ['PPW', 'Emissão manual', 'Salesforce', 'Kivida'].forEach((nome, i) => {
      e.chamar('salvarItemDoCatalogo')({ tipo: lista, canalId: '', nome, ordem: i + 1, ativo: true });
    });
    e.chamar('criarCampo')(e.ret.id, { rotulo: 'Tipo de emissão', tipo: 'seletor', secao: 'Seguro' });
    const campo = e.chamar('listarCamposDoCanal')(e.ret.id).find((k) => k.rotulo === 'Tipo de emissão');
    e.chamar('salvarCampo')({ id: campo.id, rotulo: 'Tipo de emissão', secao: 'Seguro', tipo: 'seletor',
      catalogo: lista, obrigatorio: false, ativo: true });
    e.chamar('esquecerCacheDaConfiguracao_()');
    e.migrar = () => {
      const pulados = []; const paraVoce = [];
      const feito = e.chamar('acrescentarOTipoDeEmissaoNosFiltrosDaRet_')(pulados, paraVoce);
      e.chamar('esquecerCacheDaConfiguracao_()');
      return { feito: feito.join(' | '), pulados: pulados.join(' | '), paraVoce: paraVoce.join(' | ') };
    };
    return e;
  };

  teste('o atualizarPGO põe o Tipo de emissão no FIM dos filtros da RET (7º), com as 4 opções', () => {
    const e = comEmissao();
    contem(e.migrar().feito, 'em 7º lugar');
    const filtros = e.resumo(1).filtrosDisponiveis;
    igual(filtros.length, 7);
    igual(filtros[6].rotulo, 'Tipo de emissão');
    igual(filtros[6].opcoes.map((o) => o.valor).join(', '), 'PPW, Emissão manual, Salesforce, Kivida');
    igual(filtros.slice(0, 6).map((f) => f.rotulo).join(' | '), 'Status | Tentativas de contato | '
      + 'Status proposta | Analista | Canal de origem | Cód. do produto e produto', 'os 6 de antes, na mesma ordem');
  });

  teste('o filtro funciona: só os casos daquele tipo de emissão', () => {
    const e = comEmissao(); e.migrar(); comCasos(e);
    const chave = e.resumo(1).filtrosDisponiveis[6].chave;
    const linha = e.chamar('lerRegistros_')('BASE_RET').find((l) => l.status === 'Pendente');
    e.chamar('atualizarRegistro_')('BASE_RET', linha.__id, { 'Tipo de emissão': 'Kivida' });
    e.chamar('esquecerCacheDaConfiguracao_()');
    const fila = e.resumo(1, { [chave]: ['Kivida'] }).fila;
    igual(fila.length, 1);
    igual(e.resumo(1, { [chave]: ['PPW'] }).fila.length, 0);
  });

  teste('roda uma vez: depois, quem manda é Configurações', () => {
    const e = comEmissao(); e.migrar();
    const segunda = e.migrar();
    igual(segunda.feito, '');
    contem(segunda.pulados, 'já foi acrescentado');
  });

  teste('sem o campo na RET: não mexe, não marca e avisa (tenta de novo na próxima)', () => {
    const e = retDoPO();
    const antes = e.canal().filtrosDoTrabalho;
    const pulados = []; const paraVoce = [];
    igual(e.chamar('acrescentarOTipoDeEmissaoNosFiltrosDaRet_')(pulados, paraVoce).length, 0);
    contem(paraVoce.join(' | '), 'NÃO foi acrescentado');
    igual(e.canal().filtrosDoTrabalho, antes);
    igual(String(e.chamar('valorDaConfiguracao_')('MIGRACAO.FILTRO_TIPO_DE_EMISSAO', '') || ''), '');
  });

  teste('com 7 filtros já escolhidos: não troca nenhum, avisa', () => {
    const e = comEmissao();
    const chaves = e.canal().filtrosDoTrabalho + ', formadepagamento';
    e.chamar('atualizarRegistro_')('CANAIS', e.ret.id, { FiltrosDoTrabalho: chaves });
    e.chamar('esquecerCacheDaConfiguracao_()');
    contem(e.migrar().paraVoce, 'já há 7 filtros');
    igual(e.canal().filtrosDoTrabalho, chaves);
  });

  teste('a regra de sempre (lista em branco) continua com 6: a Mesa e o VG não mudam', () => {
    const e = comEmissao();
    e.chamar('atualizarRegistro_')('CANAIS', e.ret.id, { FiltrosDoTrabalho: '' });
    e.chamar('esquecerCacheDaConfiguracao_()');
    igual(e.chamar('resumoDoCanal')(e.ret.id, {}, null, '', false, 1).filtrosDisponiveis.length, 6);
  });

  /* ----------------------------------------------------------------------- */
  secao('A tela');

  teste('o Trabalho não tem período, e manda a sub-aba ao servidor', () => {
    const tela = lerTela('Trabalho.html');
    verdadeiro(tela.indexOf('SeletorDePeriodo') < 0 && tela.indexOf('resumo.periodo') < 0);
    contem(tela, "quantosNaFila || '', avisarQuandoChegar, subAbaDoCanal(canalEscolhido))");
  });

  teste('as sub-abas com o número de casos; na Mesa, as Reuniões na mesma linha', () => {
    const tela = lerTela('Trabalho.html');
    contem(tela, "abas.push({ atributo: 'data-sub-aba=\"' + (i + 1) + '\"'");
    contem(tela, '<b class="numero-da-aba">');
    contem(tela, "abas.push({ atributo: 'data-aba-do-trabalho=\"reunioes\"'");
    contem(lerTela('Estilos.html'), '.config-aba .numero-da-aba');
  });

  teste('a última aba fica lembrada no navegador, por canal, e sem armazenamento abre na 1', () => {
    const tela = lerTela('Trabalho.html');
    contem(tela, "var CHAVE_DA_SUB_ABA = 'pgo.trabalho.subAba.';");
    contem(tela, "try { window.localStorage.setItem(CHAVE_DA_SUB_ABA + idDoCanal, String(qual)); }");
    contem(tela, 'catch (semArmazenamento) { lembrada = 1; }');
    contem(tela, 'lembrada = Number(window.localStorage.getItem(CHAVE_DA_SUB_ABA + idDoCanal)) === 2 ? 2 : 1;',
      'abrir lê a aba lembrada daquele canal');
  });

  teste('trocar de aba esquece o cartão e o Status da outra aba', () => {
    const tela = lerTela('Trabalho.html');
    const clique = tela.substring(tela.indexOf("ligarCliques('[data-sub-aba]'"));
    contem(clique.substring(0, 1200), "filtrosEscolhidos.cartao = '';");
    contem(clique.substring(0, 1200), 'delete filtrosEscolhidos[filtro.chave];');
  });

  teste('Configurações tem o editor das sub-abas e dos filtros', () => {
    const tela = lerTela('Configuracoes.html');
    contem(tela, "'Dividir o Trabalho deste canal em duas sub-abas'");
    contem(tela, 'Status da aba 1, na ordem de prioridade');
    contem(tela, "subAbasDoTrabalho: subAbasDaTela(),");
    contem(tela, "filtrosDoTrabalho: filtrosDaTela(canal),");
  });
}

module.exports = { rodarTestesDasSubAbasDoTrabalho, retDoPO, comCasos };
