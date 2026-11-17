/**
 * ============================================================================
 * PGO — testes-hora-da-finalizacao.js · o prazo da Mesa que dobrava (Etapa 80)
 * ============================================================================
 * Relato do PO: "o sinalizador de 48 horas da Mesa está contando errado. Um
 * analista respondeu o caso e fechou junto com a SLA de 6 horas, mas o Prisma
 * duplicou o tempo". O caminho: o diálogo grava a "Data da finalização" com a
 * hora; o "Trabalhar no caso" mostra só o dia e, ao salvar, regravava o dia à
 * meia-noite — e sem a hora o prazo contava até o fim do expediente.
 * ============================================================================
 */

const { carregar, secao, teste, igual } = require('./ferramentas');

function preparar() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.mesa = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
  t.canal = t.chamar('canalPeloId_')(t.mesa.id);
  const operacao = t.chamar('lerRegistros_')('CATALOGO')
    .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id;
  t.chamar('salvarUsuario')({ nome: 'Ana Martins', email: 'ana@exemplo.com',
    nivelAcessoId: operacao, canalId: t.mesa.id, ativo: true });
  // Quarta, 11/11/2026: entrou às 12:00, em andamento às 12:00, concluído às 15:15.
  t.id = t.chamar('inserirVariosRegistros_')('BASE_MESA', [{ Analista: 'Ana Martins', Status: 'Concluído',
    'Data de entrada': new Date(2026, 10, 11), 'Horário': '12:00', 'Data em andamento': new Date(2026, 10, 11, 12, 0),
    'Data da finalização': new Date(2026, 10, 11, 15, 15), 'Nome do segurado': 'Teste',
    'Data da última mudança de status': new Date(2026, 10, 11, 15, 15) }])[0].__id;
  t.caso = () => t.chamar('lerRegistros_')('BASE_MESA').find((l) => String(l.__id) === String(t.id));
  t.prazo = () => {
    const sinalizador = t.chamar('sinalizadoresDoCanal_')(t.canal)[0];
    const um = t.chamar('sinalDoCaso_')(t.caso(), t.canal, sinalizador,
      t.chamar('situacoesPorChave_')(t.canal), t.chamar('relogioDeParede_')(new Date(2026, 10, 13, 17, 0)));
    return um.texto;
  };
  t.salvarPeloFormulario = (extras) => {
    const aberto = t.chamar('casoParaEditar')(t.mesa.id, t.id);
    t.chamar('editarCaso')(t.mesa.id, t.id, Object.assign({}, aberto.valores, extras || {}), aberto.versao);
  };
  return t;
}

function rodarTestesDaHoraDaFinalizacao() {
  console.log('\nEtapa 80: o prazo da Mesa que dobrava');

  secao('Salvar o "Trabalhar no caso" não apaga a hora');

  teste('o caso concluído às 15:15 continua com 3h15 depois de salvo pelo formulário', () => {
    const t = preparar();
    igual(t.prazo(), 'Retorno da área · cumprido em 3h15');
    t.salvarPeloFormulario();
    igual(t.prazo(), 'Retorno da área · cumprido em 3h15', 'era 6h30: o dobro');
    const gravada = new Date(t.caso()['Data da finalização']);
    igual(gravada.getHours() + ':' + gravada.getMinutes(), '15:15', 'a hora continua na célula');
  });

  teste('trocar o dia da finalização no formulário vale: a data nova entra', () => {
    const t = preparar();
    t.salvarPeloFormulario({ datadafinalizacao: '12/11/2026' });
    const gravada = new Date(t.caso()['Data da finalização']);
    igual(gravada.getDate(), 12);
  });

  teste('a hora digitada no "horário da finalização" continua mandando', () => {
    const t = preparar();
    t.salvarPeloFormulario({ horariodafinalizacao: '13:00' });
    igual(t.prazo(), 'Retorno da área · cumprido em 1h');
  });

  secao('O caso que já tinha perdido a hora');

  teste('finalização à meia-noite, sem horário: vale a hora da última mudança de status do mesmo dia', () => {
    const t = preparar();
    t.chamar('atualizarRegistro_')('BASE_MESA', t.id, { 'Data da finalização': new Date(2026, 10, 11) });
    igual(t.prazo(), 'Retorno da área · cumprido em 3h15', 'e não até as 18:30');
  });

  teste('finalização à meia-noite com o horário digitado: o horário digitado manda', () => {
    const t = preparar();
    t.chamar('atualizarRegistro_')('BASE_MESA', t.id, { 'Data da finalização': new Date(2026, 10, 11),
      'horário da finalização': '13:00' });
    igual(t.prazo(), 'Retorno da área · cumprido em 1h');
  });

  teste('só a coluna de dia inteiro guarda a hora antiga: data e hora escolhida à meia-noite fica à meia-noite', () => {
    const t = preparar();
    const paraGravar = { 'Data em andamento': new Date(2026, 10, 11, 0, 0) };
    t.chamar('manterAHoraDasDatasQueNaoMudaram_')(t.canal, t.caso(), paraGravar);
    igual(new Date(paraGravar['Data em andamento']).getHours(), 0);
  });

  teste('sem a mudança de status no mesmo dia, segue a regra de antes: o fim do expediente', () => {
    const t = preparar();
    t.chamar('atualizarRegistro_')('BASE_MESA', t.id, { 'Data da finalização': new Date(2026, 10, 11),
      'Data da última mudança de status': new Date(2026, 10, 12, 9, 0) });
    igual(t.prazo(), 'Retorno da área · cumprido em 6h30');
  });
}

module.exports = { rodarTestesDaHoraDaFinalizacao };
