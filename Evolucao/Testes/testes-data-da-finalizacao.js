/**
 * ============================================================================
 * PGO — testes-data-da-finalizacao.js · a finalização que o analista informa (Etapa 58)
 * ============================================================================
 * Relato do PO: "ao ajustar e incluir a data de finalização de casos da Mesa
 * Diamante, o PGO está considerando o dia em que foi salvo e não a data que o
 * analista incluiu como finalizado. Isso está impactando, pois indica que o
 * caso está estourado e muitas vezes não está".
 *
 * A regra, palavra dele: "o que deve prevalecer sempre é, se houver data e
 * hora de finalização, ela; na ausência, o status concluído e o carimbo da
 * data em que foi salvo. Caso seja ajustada depois, a data e hora da
 * finalização deve prevalecer".
 *
 * Eram duas causas: o selo do prazo lia primeiro a "Data da última mudança de
 * status" (o momento do salvamento), e o carimbo do Concluído trocava pela hora
 * de agora a data que o analista digitava no mesmo salvamento.
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro, contem } = require('./ferramentas');

function rodarTestesDaDataDaFinalizacao() {
  console.log('\nEtapa 58: a data e hora da finalização prevalecem');

  const { chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');
  const canais = chamar('canaisVisiveis_()');
  const mesa = canais.find((c) => c.aba === 'BASE_MESA');
  const ret = canais.find((c) => c.aba === 'BASE_RET');

  // O relógio de outubro de 2026: segunda, 5, é o primeiro dia.
  const quando = (dia, hora) => {
    const [h, m] = hora.split(':').map(Number);
    return { dia: Math.round(Date.UTC(2026, 9, dia) / 86400000), minuto: h * 60 + m };
  };

  /* ----------------------------------------------------------------------- */
  secao('O selo das 48 horas úteis da Mesa');

  const sinalDaMesa = chamar('sinalizadoresDoCanal_')(mesa)[0];
  const situacoesDaMesa = chamar('situacoesPorChave_')(mesa);
  // Em andamento na segunda, 05/10, às 09:00. As 48 horas acabam na sexta,
  // 09/10, às 16:00.
  const concluido = (extra) => Object.assign({
    Status: 'Concluído',
    'Data em andamento': new Date(2026, 9, 5, 9, 0),
    // Salvo como concluído só na segunda seguinte, 12/10: estouraria.
    'Data da última mudança de status': new Date(2026, 9, 12, 10, 0)
  }, extra || {});
  const selo = (registro) => chamar('sinalDoCaso_')(registro, mesa, sinalDaMesa,
    situacoesDaMesa, quando(30, '12:00'));

  teste('sem a finalização, vale o dia em que foi salvo como concluído (como antes)', () => {
    const sinal = selo(concluido());
    igual(sinal.tom, 'ruim');
    contem(sinal.texto, 'estourado');
  });

  teste('com a data e a hora da finalização, vale o que o analista informou', () => {
    const sinal = selo(concluido({ 'Data da finalização': new Date(2026, 9, 7),
      'horário da finalização': '10:00' }));
    igual(sinal.tom, 'bom', 'finalizado na quarta, dentro das 48h');
    contem(sinal.texto, 'cumprido em');
  });

  teste('a hora da finalização conta: a mesma data, antes e depois do limite', () => {
    const naSexta = (hora) => selo(concluido({ 'Data da finalização': new Date(2026, 9, 9),
      'horário da finalização': hora }));
    igual(naSexta('15:59').tom, 'bom', 'sexta 15:59: dentro');
    igual(naSexta('16:30').tom, 'ruim', 'sexta 16:30: 30min além');
    contem(naSexta('16:30').texto, '30min além');
  });

  teste('sem a coluna da hora, vale a hora guardada na própria data', () => {
    const sinal = selo(concluido({ 'Data da finalização': new Date(2026, 9, 9, 15, 0),
      'horário da finalização': '' }));
    igual(sinal.tom, 'bom', 'sexta 15:00, do carimbo');
  });

  teste('só a data, sem hora nenhuma: conta até o fim do expediente daquele dia', () => {
    igual(selo(concluido({ 'Data da finalização': new Date(2026, 9, 8) })).tom, 'bom',
      'quinta: o dia inteiro ainda cabe nas 48h');
    igual(selo(concluido({ 'Data da finalização': new Date(2026, 9, 9) })).tom, 'ruim',
      'sexta sem hora: até 18:30, além das 16:00');
  });

  teste('ajustada depois: mudar a finalização muda o resultado, e a data do salvamento não', () => {
    const antes = selo(concluido({ 'Data da finalização': new Date(2026, 9, 12),
      'horário da finalização': '10:00' }));
    igual(antes.tom, 'ruim');
    const depois = selo(concluido({ 'Data da finalização': new Date(2026, 9, 6),
      'horário da finalização': '11:00',
      'Data da última mudança de status': new Date(2026, 9, 20, 9, 0) }));
    igual(depois.tom, 'bom', 'o ajuste vale, mesmo salvo bem depois');
  });

  teste('Concluído na mesa segue a mesma regra', () => {
    igual(selo(concluido({ Status: 'Concluído na mesa', 'Data da finalização': new Date(2026, 9, 7),
      'horário da finalização': '10:00' })).tom, 'bom');
  });

  teste('a Mesa fecha pela finalização; a RET não (lá a coluna é a da transmissão)', () => {
    igual(chamar('fechaPelaFinalizacao_')(mesa, situacoesDaMesa), true);
    igual(chamar('fechaPelaFinalizacao_')(ret, chamar('situacoesPorChave_')(ret)), false);
  });

  teste('na RET nada muda: a data da transmissão não decide o fim do prazo', () => {
    const sinalDaRet = chamar('sinalizadoresDoCanal_')(ret)[0];
    const situacoesDaRet = chamar('situacoesPorChave_')(ret);
    const naoRetido = (extra) => Object.assign({
      status: 'Não retido',
      'data de recepção do protocolo': new Date(2026, 9, 5),
      'Data da primeira mudança de status': new Date(2026, 9, 5),
      'Data da última mudança de status': new Date(2026, 9, 6, 10, 0)
    }, extra || {});
    const semTransmissao = chamar('sinalDoCaso_')(naoRetido(), ret, sinalDaRet, situacoesDaRet,
      quando(30, '12:00'));
    const comTransmissao = chamar('sinalDoCaso_')(naoRetido({ 'data da transmissão': new Date(2026, 9, 20) }),
      ret, sinalDaRet, situacoesDaRet, quando(30, '12:00'));
    igual(comTransmissao.texto, semTransmissao.texto);
  });

  /* ----------------------------------------------------------------------- */
  secao('O SLA da primeira resposta, sem resposta: para na finalização');

  teste('sem resposta, a finalização informada vem antes da mudança de status', () => {
    const finais = { concluido: true, concluidonamesa: true, semretorno: true };
    const registro = {
      Status: 'Concluído', 'Data de entrada': new Date(2026, 9, 5), Horário: '09:00',
      'Data resposta': '', 'Data da última mudança de status': new Date(2026, 9, 12, 10, 0),
      'Data da finalização': new Date(2026, 9, 5), 'horário da finalização': '11:00'
    };
    const sla = chamar('slaDoCaso_')(registro, mesa, finais, quando(30, '12:00'));
    igual(sla.parouEm, 'encerramento');
    igual(sla.minutosUteis, 120, 'das 09:00 às 11:00 da segunda');
    igual(sla.dentro, true);
  });

  /* ----------------------------------------------------------------------- */
  secao('O carimbo não troca a data que o analista digitou');

  const formulario = (extra) => Object.assign({
    status: 'Em andamento', nomedosegurado: 'Finalização de teste' }, extra || {});
  const linha = (id) => chamar('lerRegistros_')('BASE_MESA').find((l) => String(l.__id) === String(id));
  const diaDe = (valor) => {
    const d = new Date(valor);
    return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
  };

  teste('concluir pelo formulário digitando a finalização: fica a data do analista', () => {
    const caso = chamar('cadastrarCaso')(mesa.id, formulario());
    chamar('editarCaso')(mesa.id, caso.id, formulario({ status: 'Concluído',
      datadafinalizacao: '07/10/2026', horariodafinalizacao: '10:00' }));
    const gravado = linha(caso.id);
    igual(diaDe(gravado['Data da finalização']), '7/10/2026', 'não virou a data de hoje');
    verdadeiro(String(gravado['horário da finalização']).indexOf('10:00') >= 0
      || new Date(gravado['horário da finalização']).getHours() === 10, 'a hora digitada ficou');
  });

  teste('concluir sem digitar: o carimbo põe a data em que foi salvo (como antes)', () => {
    const caso = chamar('cadastrarCaso')(mesa.id, formulario());
    chamar('editarCaso')(mesa.id, caso.id, formulario({ status: 'Concluído' }));
    igual(diaDe(linha(caso.id)['Data da finalização']), diaDe(new Date()));
  });

  teste('ajustar a finalização depois de concluído: a nova data fica', () => {
    const caso = chamar('cadastrarCaso')(mesa.id, formulario());
    chamar('editarCaso')(mesa.id, caso.id, formulario({ status: 'Concluído' }));
    chamar('editarCaso')(mesa.id, caso.id, formulario({ status: 'Concluído',
      datadafinalizacao: '06/10/2026', horariodafinalizacao: '11:00' }));
    igual(diaDe(linha(caso.id)['Data da finalização']), '6/10/2026');
  });
}

module.exports = { rodarTestesDaDataDaFinalizacao };
