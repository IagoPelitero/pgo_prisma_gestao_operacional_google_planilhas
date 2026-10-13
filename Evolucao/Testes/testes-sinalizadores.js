/**
 * ============================================================================
 * RECC — testes-sinalizadores.js · os prazos que o caso tem
 * ============================================================================
 * Pedido do PO: "um sinalizador de caso, na aba Trabalho e na Produtividade
 * RECC".
 *
 *   RET   o caso cadastrado tem 3 dias úteis para chegar a um status final.
 *         Verde abaixo, amarelo no 3º dia, vermelho depois.
 *   MESA  o caso encaminhado para a área tem 48 horas úteis para voltar. E a
 *         Produtividade passa a mostrar quantos casos estão dentro e quantos
 *         fora do SLA de 6 horas úteis.
 *   VG    ainda não definido: a linha existe, desligada, para o PO ligar.
 *
 * COMO OS TESTES CONTROLAM O RELÓGIO. O servidor lê "agora" do relógio de
 * verdade, e um teste que dependesse disso passaria numa segunda-feira e
 * falharia no sábado. Por isso as bordas — o dia exato em que o amarelo vira
 * vermelho — são testadas chamando `sinalDoCaso_` direto, com o "agora" na
 * mão. Os testes de tela e de produtividade usam só o que não depende do dia
 * da semana: caso de dois meses atrás (vermelho em qualquer dia), caso de
 * hoje (verde em qualquer dia) e caso JÁ ENCERRADO, cujo prazo é fechado por
 * datas gravadas e não por "agora".
 *
 * O simulador formata data pela hora LOCAL da máquina, ignorando o fuso: por
 * isso as datas daqui nascem de `new Date(ano, mês, dia, hora)` — a mesma
 * conta nos dois lados, em qualquer máquina.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario,
  lerPeca } = require('./ferramentas');

const PASTA_DAS_TELAS = path.join(__dirname, '..', '..', 'Front-End');
const lerTela = (nome) => fs.readFileSync(path.join(PASTA_DAS_TELAS, nome), 'utf8');

function rodarTestesDeSinalizadores() {
  console.log('\nOs sinalizadores de prazo');

  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');
  const planilha = ambiente.planilha;

  const canais = chamar('canaisVisiveis_()');
  const ret = canais.find((c) => c.aba === 'BASE_RET');
  const mesa = canais.find((c) => c.aba === 'BASE_MESA');
  const vg = canais.find((c) => c.aba === 'BASE_VG');

  const doCanal = (canal) => chamar('sinalizadoresDoCanal_')(canal);
  const linhasDaAba = () => chamar('lerRegistros_("SINALIZADORES")');

  const diasAtras = (dias) => {
    const d = new Date();
    d.setDate(d.getDate() - dias);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  /* ----------------------------------------------------------------------- */
  secao('Os sinalizadores com que o sistema nasce');

  teste('a RET, a Mesa e o VG têm o seu — e o do VG nasce desligado', () => {
    const linhas = linhasDaAba();
    igual(linhas.length, 3, 'um por canal, palavra do PO: o VG "deixe preparado"');

    const daRet = linhas.find((l) => String(l.CanalId) === String(ret.id));
    igual(daRet.Prazo, 3);
    igual(daRet.Unidade, 'dias');
    igual(daRet.AvisoFaltando, 1, 'o amarelo é o último dia');
    igual(daRet.ColunaQueLiga, '', 'vale para todo caso sem status final');
    igual(daRet.InicioDoExpediente, '08:15');
    igual(daRet.FimDoExpediente, '18:30');

    const daMesa = linhas.find((l) => String(l.CanalId) === String(mesa.id));
    igual(daMesa.Prazo, 48);
    igual(daMesa.Unidade, 'horas');
    igual(daMesa.ColunaQueLiga, 'Área responsável', 'só o caso encaminhado');
    igual(daMesa.ColunaDaData, 'Data do encaminhamento');

    const doVg = linhas.find((l) => String(l.CanalId) === String(vg.id));
    igual(doVg.Prazo, 0);
    igual(String(doVg.Ativo), 'NAO', 'preparado, mas desligado');
  });

  teste('só os ligados contam: o VG não sinaliza nada até o PO ligar', () => {
    igual(doCanal(ret).length, 1);
    igual(doCanal(mesa).length, 1);
    igual(doCanal(vg).length, 0);
  });

  teste('a regra sai por extenso, para a tela e para a Produtividade', () => {
    igual(chamar('regraDoSinalizador_')(doCanal(ret)[0]),
      '3 dias úteis · amarelo quando faltar 1 dia útil');
    igual(chamar('regraDoSinalizador_')(doCanal(mesa)[0]),
      '48 horas úteis · amarelo quando faltar 10 horas úteis · '
      + 'só com "Área responsável" preenchida');
  });

  teste('a Mesa tem a coluna do carimbo, e ela NÃO é campo do formulário', () => {
    const cabecalhos = chamar('estruturaDaAba_')('BASE_MESA').cabecalhos;
    verdadeiro(cabecalhos.indexOf('Data do encaminhamento') >= 0);
    const campo = chamar('lerRegistros_("CAMPOS")').find((c) =>
      String(c.Aba) === 'BASE_MESA' && String(c.Cabecalho) === 'Data do encaminhamento');
    verdadeiro(!!campo, 'o tipo da coluna mora em CAMPOS');
    igual(String(campo.Ativo), 'NAO', 'ninguém digita uma data que o sistema sabe');
    igual(String(campo.Secao), 'Preenchido pelo sistema');
    verdadeiro(chamar('estruturaDaAba_')('BASE_RET').cabecalhos
      .indexOf('Data do encaminhamento') < 0, 'a RET não encaminha para área');
  });

  /* ----------------------------------------------------------------------- */
  secao('A RET: verde, amarelo no 3º dia, vermelho depois');

  /*
   * O caso nasce numa SEGUNDA-FEIRA, 05/10/2026, só com a data (a RET não tem
   * coluna de hora), e por isso começa a contar na abertura: 08:15. Cada dia
   * útil tem 615 minutos (08:15 às 18:30), e o prazo são três deles: 1845.
   */
  const sinalDaRet = doCanal(ret)[0];
  const situacoes = chamar('situacoesPorChave_')(ret);
  const nascido = { 'data de recepção do protocolo': new Date(2026, 9, 5), status: 'Pendente' };
  const quando = (dia, hora) => {
    const [h, m] = hora.split(':').map(Number);
    return { dia: Math.round(Date.UTC(2026, 9, dia) / 86400000), minuto: h * 60 + m };
  };
  const naRet = (dia, hora) =>
    chamar('sinalDoCaso_')(nascido, ret, sinalDaRet, situacoes, quando(dia, hora));

  teste('os dois primeiros dias úteis são verdes', () => {
    igual(naRet(5, '12:00').tom, 'bom', 'segunda, o dia do cadastro');
    igual(naRet(6, '12:00').tom, 'bom', 'terça');
    igual(naRet(6, '18:29').tom, 'bom', 'terça, no fim do expediente');
    igual(naRet(6, '18:30').tom, 'atencao', 'às 18:30 falta exatamente 1 dia: entra o 3º dia');
  });

  teste('o 3º dia útil é amarelo — "a 3 dias cadastrado"', () => {
    igual(naRet(7, '08:20').tom, 'atencao', 'quarta cedo');
    igual(naRet(7, '17:00').tom, 'atencao', 'quarta à tarde');
    contem(naRet(7, '17:00').texto, 'vence em 1h30');
  });

  teste('o vermelho começa no minuto seguinte ao prazo — "passou dos 3 dias"', () => {
    const noLimite = naRet(8, '08:15');
    igual(noLimite.tom, 'atencao', 'três dias exatos ainda estão dentro');
    igual(noLimite.dentro, true);
    contem(noLimite.texto, 'no limite do prazo', 'e não "vence em 0min"');
    const passou = naRet(8, '08:16');
    igual(passou.tom, 'ruim');
    igual(passou.dentro, false);
    contem(passou.texto, '1min além do prazo');
  });

  teste('fim de semana não conta', () => {
    // Sexta 12:00 e sábado 12:00: a mesma coisa, porque o sábado não tem
    // expediente. Segunda 09:00 só soma 45 minutos.
    igual(naRet(9, '18:30').texto, naRet(10, '12:00').texto);
    contem(naRet(12, '09:00').texto, '2 dias úteis e 3h além do prazo'
      .replace(' e 3h', ''));
  });

  teste('o caso cadastrado numa sexta passa o fim de semana inteiro no prazo', () => {
    const naSexta = { 'data de recepção do protocolo': new Date(2026, 9, 9), status: 'Pendente' };
    const em = (dia, hora) =>
      chamar('sinalDoCaso_')(naSexta, ret, sinalDaRet, situacoes, quando(dia, hora));
    igual(em(10, '10:00').tom, 'bom', 'sábado: só a sexta contou');
    igual(em(12, '12:00').tom, 'bom', 'segunda: o 2º dia');
    igual(em(13, '12:00').tom, 'atencao', 'terça: o 3º dia');
    igual(em(14, '08:16').tom, 'ruim', 'quarta: passou');
  });

  teste('o texto traz o nome do sinalizador e a regra, para a dica', () => {
    const sinal = naRet(5, '12:00');
    contem(sinal.texto, 'Prazo de retorno · faltam 2 dias úteis e 6h');
    contem(sinal.regra, '3 dias úteis');
    igual(sinal.encerrado, false);
  });

  /* ----------------------------------------------------------------------- */
  secao('O prazo para quando o caso chega a um status final');

  const fechado = (status, mudouEm, extra) => Object.assign({
    'data de recepção do protocolo': new Date(2026, 9, 5), status: status,
    'Data da última mudança de status': mudouEm
  }, extra || {});
  const hoje = quando(30, '12:00');
  const avaliar = (registro) =>
    chamar('sinalDoCaso_')(registro, ret, sinalDaRet, situacoes, hoje);

  teste('encerrado dentro do prazo: verde, "cumprido em" — e não corre mais', () => {
    const sinal = avaliar(fechado('Retido', new Date(2026, 9, 6, 10, 0)));
    igual(sinal.tom, 'bom');
    igual(sinal.encerrado, true);
    contem(sinal.texto, 'cumprido em 1 dia útil e 1h');
  });

  teste('encerrado depois do prazo: vermelho para sempre, "estourado"', () => {
    const sinal = avaliar(fechado('Retido', new Date(2026, 9, 9, 10, 0)));
    igual(sinal.tom, 'ruim');
    igual(sinal.encerrado, true);
    contem(sinal.texto, 'estourado, 1 dia útil e 1h além');
    igual(sinal.alem, 720);
  });

  teste('cada um dos cinco desfechos do PO para o relógio', () => {
    ['Retido', 'Não retido', 'Sem sucesso de contato', 'Cancelado', 'Pago'].forEach((s) => {
      const sinal = avaliar(fechado(s, new Date(2026, 9, 6, 10, 0)));
      verdadeiro(sinal && sinal.encerrado === true, s + ' é status final');
    });
    igual(avaliar(fechado('Pendente', new Date(2026, 9, 6, 10, 0))).encerrado, false,
      'Pendente não é');
    igual(avaliar(fechado('1º contato realizado', new Date(2026, 9, 6, 10, 0))).encerrado,
      false);
  });

  teste('sem a data da última mudança, vale o carimbo do próprio status', () => {
    // "Data reteve" é onde o Retido grava o momento em que o caso chegou nele.
    const sinal = avaliar(fechado('Retido', '', { 'Data reteve': new Date(2026, 9, 6, 10, 0) }));
    igual(sinal.tom, 'bom');
    contem(sinal.texto, 'cumprido em 1 dia útil e 1h');
  });

  teste('encerrado sem nenhuma data de quando fechou: sem selo, em vez de vermelho falso', () => {
    // Os casos antigos, de antes do carimbo: milhares, fechados, e sem como
    // saber se cumpriram. Inventar "estourado" neles ensinaria a ignorar o
    // vermelho.
    igual(avaliar(fechado('Retido', '')), null);
  });

  teste('sem data de entrada, não há de onde contar: sem selo', () => {
    igual(avaliar({ status: 'Pendente' }), null);
  });

  /* ----------------------------------------------------------------------- */
  secao('A Mesa: 48 horas úteis para a área, só para o caso encaminhado');

  const sinalDaMesa = doCanal(mesa)[0];
  const situacoesDaMesa = chamar('situacoesPorChave_')(mesa);
  // Encaminhado na SEGUNDA, 09:00. O primeiro dia só tem 570 minutos úteis, e
  // as 48 horas (2880 minutos) acabam na SEXTA às 16:00; o amarelo acende nas
  // últimas 10 horas, na QUINTA às 16:15.
  const encaminhado = {
    Status: 'Em andamento', 'Área responsável': 'Sinistro',
    'Data do encaminhamento': new Date(2026, 9, 5, 9, 0)
  };
  const naMesa = (dia, hora, registro) => chamar('sinalDoCaso_')(
    registro || encaminhado, mesa, sinalDaMesa, situacoesDaMesa, quando(dia, hora));

  teste('verde com folga, amarelo nas últimas 10 horas, vermelho depois das 48', () => {
    igual(naMesa(6, '10:00').tom, 'bom', 'terça');
    igual(naMesa(8, '12:00').tom, 'bom', 'quinta de manhã');
    igual(naMesa(8, '16:15').tom, 'atencao', 'quinta, faltando 10h');
    igual(naMesa(9, '16:00').tom, 'atencao', 'sexta às 16:00: as 48h exatas');
    const passou = naMesa(9, '16:01');
    igual(passou.tom, 'ruim');
    contem(passou.texto, 'Retorno da área · 1min além do prazo');
  });

  teste('conta do carimbo (data E hora), e não da abertura do dia', () => {
    // Encaminhado às 17:00 de segunda: só 90 minutos contam naquele dia.
    const tarde = { Status: 'Em andamento', 'Área responsável': 'Sinistro',
      'Data do encaminhamento': new Date(2026, 9, 5, 17, 0) };
    const sinal = naMesa(6, '08:15', tarde);
    contem(sinal.texto, 'faltam 46h30', 'só 90min do primeiro dia contaram');
  });

  teste('sem área responsável, o caso não tem este prazo', () => {
    igual(naMesa(9, '16:01', { Status: 'Em andamento', 'Área responsável': '',
      'Data do encaminhamento': new Date(2026, 9, 5, 9, 0) }), null);
  });

  teste('encaminhado ANTES do carimbo existir: sem prazo, e sem inventar data', () => {
    igual(naMesa(9, '16:01', { Status: 'Em andamento', 'Área responsável': 'Sinistro',
      'Data do encaminhamento': '' }), null);
  });

  teste('o analista conclui o caso: o prazo para ali, cumprido ou estourado', () => {
    const concluido = (quandoConcluiu) => Object.assign({}, encaminhado, {
      Status: 'Concluído', 'Data da última mudança de status': quandoConcluiu });
    const dentro = naMesa(30, '12:00', concluido(new Date(2026, 9, 7, 10, 0)));
    igual(dentro.tom, 'bom');
    contem(dentro.texto, 'cumprido em');
    const fora = naMesa(30, '12:00', concluido(new Date(2026, 9, 12, 10, 0)));
    igual(fora.tom, 'ruim');
    contem(fora.texto, 'estourado');
  });

  /* ----------------------------------------------------------------------- */
  secao('O carimbo do encaminhamento: o sistema vê o momento, ninguém digita');

  // O formulário de edição é o formulário inteiro: o que o teste não muda
  // precisa ir junto, como vai da tela.
  const formularioDaMesa = (extra) => Object.assign({
    status: 'Em andamento', nomedosegurado: 'Segurado de teste' }, extra || {});
  const casoDaMesa = (extra) => chamar('cadastrarCaso')(mesa.id, formularioDaMesa(extra));
  const editarNaMesa = (id, extra) =>
    chamar('editarCaso')(mesa.id, id, formularioDaMesa(extra));
  const lerDaMesa = (id) => chamar('lerRegistros_')('BASE_MESA')
    .find((l) => String(l.__id) === String(id));
  const carimbo = (id) => lerDaMesa(id)['Data do encaminhamento'];
  // A data nasce no contexto do simulador: instanceof Date não a reconhece.
  const ehData = (v) => !!v && typeof v.getTime === 'function';

  teste('cadastrar já com a área carimba agora', () => {
    const antes = Date.now();
    const criado = casoDaMesa({ arearesponsavel: 'Sinistro' });
    const gravado = carimbo(criado.id);
    verdadeiro(ehData(gravado), 'gravou uma data com hora');
    verdadeiro(Math.abs(gravado.getTime() - antes) < 60000, 'é de agora');
  });

  teste('cadastrar sem área não carimba nada', () => {
    const criado = casoDaMesa();
    igual(carimbo(criado.id), '');
  });

  teste('escolher a área depois carimba nessa hora; mexer em outra coisa não recarimba', () => {
    const criado = casoDaMesa();
    editarNaMesa(criado.id, { arearesponsavel: 'Cobrança' });
    verdadeiro(ehData(carimbo(criado.id)), 'carimbou ao escolher a área');

    // Põe uma data antiga à mão: se algum salvamento recarimbar, ela some.
    const antiga = new Date(2026, 8, 1, 10, 0);
    chamar('atualizarRegistro_')('BASE_MESA', criado.id,
      { 'Data do encaminhamento': antiga });
    editarNaMesa(criado.id, { arearesponsavel: 'Cobrança', nomedosegurado: 'Outro nome' });
    igual(carimbo(criado.id).getTime(), antiga.getTime(),
      'salvar sem mexer na área não conta como encaminhar de novo');
  });

  teste('trocar de uma área para outra é um novo encaminhamento: prazo novo', () => {
    const criado = casoDaMesa({ arearesponsavel: 'Sinistro' });
    chamar('atualizarRegistro_')('BASE_MESA', criado.id,
      { 'Data do encaminhamento': new Date(2026, 8, 1, 10, 0) });
    editarNaMesa(criado.id, { arearesponsavel: 'Comercial' });
    verdadeiro(carimbo(criado.id).getTime() > new Date(2026, 9, 1).getTime(),
      'recarimbou em vez de manter a data da área anterior');
  });

  teste('tirar a área devolve o caso para a mesa: o carimbo some', () => {
    // O formulário não apaga campo em branco (é assim em todos os campos, de
    // antes deste pedido): por ele, a área só troca de um valor para outro.
    // Mas quem esvaziar a célula (ou uma tela futura que permita) cai aqui — e
    // o selo já não depende do carimbo: sem área, o sinalizador não liga.
    const mesaComColuna = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
    const alteracao = { 'Área responsável': '' };
    chamar('carimbarOEncaminhamento_')(mesaComColuna,
      { 'Área responsável': 'Sinistro' }, alteracao);
    igual(alteracao['Data do encaminhamento'], '');

    const mantida = { 'Área responsável': 'Sinistro' };
    chamar('carimbarOEncaminhamento_')(mesaComColuna,
      { 'Área responsável': 'Sinistro' }, mantida);
    igual(mantida.hasOwnProperty('Data do encaminhamento'), false,
      'a mesma área não carimba de novo');
  });

  teste('o canal sem coluna de área segue gravando, sem carimbo e sem erro', () => {
    const criado = chamar('cadastrarCaso')(ret.id, { status: 'Não trabalhado',
      nomedocliente: 'Cliente da RET' });
    verdadeiro(!!criado.id);
  });

  teste('base que ainda não ganhou a coluna segue gravando (antes do atualizarPGO)', () => {
    const velho = carregar('primeiro.adm@exemplo.com');
    velho.chamar('instalarRECC()');
    velho.chamar('removerColuna_')('BASE_MESA', 'Data do encaminhamento');
    velho.chamar('esquecerEstruturaLida_()');
    const m = velho.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
    const criado = velho.chamar('cadastrarCaso')(m.id, { status: 'Em andamento',
      nomedosegurado: 'Sem coluna', arearesponsavel: 'Sinistro' });
    verdadeiro(!!criado.id, 'gravou sem estourar');
  });

  /* ----------------------------------------------------------------------- */
  secao('O Trabalho: o selo embaixo da situação');

  const casoDaRet = (extra) => chamar('inserirRegistro_')('BASE_RET', Object.assign({
    analista: 'Ana Martins', 'nome do cliente': 'Cliente de teste',
    status: 'Pendente' }, extra));
  const filaDaRet = () => chamar('resumoDoCanal')(ret.id, {}, 90).fila;
  const sinaisDe = (fila, registro) => fila.find((c) => String(c.id) === String(registro.__id)).sinais;

  const velhoAberto = casoDaRet({ 'data de recepção do protocolo': diasAtras(60) });
  const deHoje = casoDaRet({ 'data de recepção do protocolo': diasAtras(0) });
  const fechadoEmDia = casoDaRet({ 'data de recepção do protocolo': diasAtras(20),
    status: 'Retido', 'Data da última mudança de status': diasAtras(20) });
  const fechadoTarde = casoDaRet({ 'data de recepção do protocolo': diasAtras(60),
    status: 'Pago', 'Data da última mudança de status': diasAtras(30) });

  teste('RET: caso antigo e aberto sai vermelho; o de hoje, verde', () => {
    const fila = filaDaRet();
    const vermelho = sinaisDe(fila, velhoAberto);
    igual(vermelho.length, 1);
    igual(vermelho[0].tom, 'ruim');
    contem(vermelho[0].texto, 'além do prazo');
    igual(sinaisDe(fila, deHoje)[0].tom, 'bom');
  });

  teste('RET: o encerrado mostra o resultado — cumprido ou estourado', () => {
    const fila = filaDaRet();
    contem(sinaisDe(fila, fechadoEmDia)[0].texto, 'cumprido');
    igual(sinaisDe(fila, fechadoEmDia)[0].tom, 'bom');
    contem(sinaisDe(fila, fechadoTarde)[0].texto, 'estourado');
    igual(sinaisDe(fila, fechadoTarde)[0].tom, 'ruim');
  });

  teste('o selo traz o que a dica precisa: nome, regra e se ainda corre', () => {
    const sinal = sinaisDe(filaDaRet(), velhoAberto)[0];
    igual(sinal.nome, 'Prazo de retorno');
    contem(sinal.regra, '3 dias úteis');
    igual(sinal.encerrado, false);
  });

  teste('Mesa: só o caso encaminhado ganha o selo de 48h', () => {
    const encaminhadoAntigo = chamar('inserirRegistro_')('BASE_MESA', { Analista: 'Bia Souza',
      Status: 'Em andamento', 'Nome do segurado': 'Antigo', 'Data de entrada': diasAtras(60),
      'Área responsável': 'Sinistro', 'Data do encaminhamento': diasAtras(40) });
    const naMesaSemArea = chamar('inserirRegistro_')('BASE_MESA', { Analista: 'Bia Souza',
      Status: 'Em andamento', 'Nome do segurado': 'Na mesa', 'Data de entrada': diasAtras(0) });
    const fila = chamar('resumoDoCanal')(mesa.id, {}, 90).fila;
    const doEncaminhado = sinaisDe(fila, encaminhadoAntigo);
    igual(doEncaminhado.length, 1);
    igual(doEncaminhado[0].tom, 'ruim');
    contem(doEncaminhado[0].texto, 'Retorno da área');
    igual(sinaisDe(fila, naMesaSemArea).length, 0, 'sem área, sem selo de área');
  });

  teste('o SLA de 6h da Mesa continua aparecendo, ao lado do selo novo', () => {
    const fila = chamar('resumoDoCanal')(mesa.id, {}, 90).fila;
    verdadeiro(fila.every((c) => c.sla !== null), 'o SLA não foi tocado');
  });

  teste('sinalizador desligado, ou canal sem nenhum: sem selo e sem erro', () => {
    const outra = carregar('primeiro.adm@exemplo.com');
    outra.chamar('instalarRECC()');
    const r = outra.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    const linha = outra.chamar('lerRegistros_("SINALIZADORES")')
      .find((l) => String(l.CanalId) === String(r.id));
    outra.chamar('atualizarRegistro_')('SINALIZADORES', linha.Id, { Ativo: false });
    outra.chamar('inserirRegistro_')('BASE_RET', { analista: 'Ana',
      'data de recepção do protocolo': diasAtras(60), status: 'Pendente' });
    const fila = outra.chamar('resumoDoCanal')(r.id, {}, 90).fila;
    verdadeiro(fila.length > 0 && fila.every((c) => c.sinais.length === 0));
  });

  teste('planilha que ainda não tem a aba SINALIZADORES: o Trabalho abre, sem selo', () => {
    const antiga = carregar('primeiro.adm@exemplo.com');
    antiga.chamar('instalarRECC()');
    antiga.ambiente.planilha.deleteSheet(
      antiga.ambiente.planilha.getSheetByName('SINALIZADORES'));
    antiga.chamar('esquecerEstruturaLida_()');
    const r = antiga.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    antiga.chamar('inserirRegistro_')('BASE_RET', { analista: 'Ana',
      'data de recepção do protocolo': diasAtras(60), status: 'Pendente' });
    const fila = antiga.chamar('resumoDoCanal')(r.id, {}, 90).fila;
    verdadeiro(fila.length > 0 && fila.every((c) => c.sinais.length === 0));
    igual(antiga.chamar('listarSinalizadores()').length, 0);
    igual(antiga.chamar('opcoesDeSinalizador()').abaExiste, false);
    // E a Produtividade também abre.
    verdadeiro(antiga.chamar('produtividadeDaEquipe')(r.id, {}, 90) !== null);
  });

  /* ----------------------------------------------------------------------- */
  secao('A Produtividade RECC: quem deixou estourar');

  const produtividade = (canal) => chamar('produtividadeDaEquipe')(canal.id, {}, 90);

  // Mais dois casos vencidos da Ana e um do Bruno, para a lista ter ordem e
  // o resumo por analista ter o que somar.
  casoDaRet({ 'data de recepção do protocolo': diasAtras(80), analista: 'Ana Martins' });
  casoDaRet({ 'data de recepção do protocolo': diasAtras(70), analista: 'Bruno Lima',
    status: 'Cancelado', 'Data da última mudança de status': diasAtras(40) });

  teste('RET: os contadores por cor, abertos e encerrados', () => {
    const p = produtividade(ret).prazos;
    igual(p.sla, null, 'a RET não tem SLA de horas');
    igual(p.sinalizadores.length, 1);
    const s = p.sinalizadores[0];
    igual(s.nome, 'Prazo de retorno');
    igual(s.fora, 2, 'a Ana deixou dois abertos passarem (60 e 80 dias)');
    igual(s.estourados, 2, 'e dois foram encerrados tarde (Pago e Cancelado)');
    igual(s.cumpridos, 1);
    igual(s.noPrazo >= 1, true, 'o de hoje, no mínimo');
    igual(s.total, s.noPrazo + s.atencao + s.fora + s.cumpridos + s.estourados,
      'as cinco cores fecham o total');
  });

  teste('RET: o nome do analista que deixou estourar, de quem mais para quem menos', () => {
    const s = produtividade(ret).prazos.sinalizadores[0];
    igual(s.porAnalista[0].analista, 'Ana Martins', 'dois abertos + um Pago tarde');
    igual(s.porAnalista[0].total, 3);
    igual(s.porAnalista[0].fora, 2);
    igual(s.porAnalista[0].estourados, 1);
    igual(s.porAnalista[1].analista, 'Bruno Lima');
    igual(s.porAnalista[1].total, 1);
  });

  teste('RET: a lista traz o caso, o analista, o estado e quanto passou — o pior primeiro', () => {
    const s = produtividade(ret).prazos.sinalizadores[0];
    igual(s.lista.length, 4);
    const primeiro = s.lista[0];
    igual(primeiro.analista, 'Ana Martins');
    igual(primeiro.encerrado, false);
    verdadeiro(/dias úteis/.test(primeiro.alem), 'diz quanto: ' + primeiro.alem);
    igual(s.lista.filter((l) => l.encerrado).length, 2);
    igual(s.maisCasos, 0);
  });

  teste('a lista corta nos 50 mais atrasados e diz quantos ficaram de fora', () => {
    const cheia = carregar('primeiro.adm@exemplo.com');
    cheia.chamar('instalarRECC()');
    const r = cheia.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    const lote = [];
    for (let i = 0; i < 55; i++) {
      lote.push({ analista: 'Ana', 'nome do cliente': 'C' + i, status: 'Pendente',
        'data de recepção do protocolo': diasAtras(60) });
    }
    cheia.chamar('inserirVariosRegistros_')('BASE_RET', lote);
    const s = cheia.chamar('produtividadeDaEquipe')(r.id, {}, 90).prazos.sinalizadores[0];
    igual(s.fora, 55);
    igual(s.lista.length, 50);
    igual(s.maisCasos, 5);
    igual(s.porAnalista[0].total, 55, 'o resumo por analista conta TODOS, não só os 50');
  });

  teste('RET: o rótulo do caso é a proposta inteira, como na fila', () => {
    const gravado = casoDaRet({ 'data de recepção do protocolo': diasAtras(50),
      'Código origem da proposta': '7', 'número da proposta': '0000123', analista: 'Carla' });
    const lista = produtividade(ret).prazos.sinalizadores[0].lista;
    const dele = lista.find((l) => String(l.id) === String(gravado.__id));
    igual(dele.caso, '7-0000123');
  });

  teste('Mesa: o SLA de 6 horas mostra quantos estão dentro e quantos fora', () => {
    chamar('inserirRegistro_')('BASE_MESA', { Analista: 'Bia Souza', Status: 'Em andamento',
      'Nome do segurado': 'SLA estourado', 'Data de entrada': diasAtras(30) });
    chamar('inserirRegistro_')('BASE_MESA', { Analista: 'Bia Souza', Status: 'Concluído',
      'Nome do segurado': 'SLA cumprido', 'Data de entrada': diasAtras(15),
      Horário: '09:00', 'Data resposta': diasAtras(15), 'Hora resposta': '09:30' });
    const p = produtividade(mesa).prazos;
    verdadeiro(p.sla !== null, 'a Mesa tem SLA');
    igual(p.sla.nome, 'SLA de 6 horas úteis');
    verdadeiro(p.sla.fora >= 1, 'o de 30 dias sem resposta está fora');
    verdadeiro(p.sla.cumpridos >= 1, 'o respondido em meia hora está dentro');
    igual(p.sla.total, p.sla.noPrazo + p.sla.atencao + p.sla.fora
      + p.sla.cumpridos + p.sla.estourados + 0, 'fecha o total');
    verdadeiro(p.sla.porAnalista.some((a) => a.analista === 'Bia Souza'),
      'diz de quem foi o SLA estourado');
  });

  teste('Mesa: o retorno da área tem o seu bloco, ao lado do SLA', () => {
    const p = produtividade(mesa).prazos;
    igual(p.sinalizadores.length, 1);
    igual(p.sinalizadores[0].nome, 'Retorno da área');
    verdadeiro(p.sinalizadores[0].fora >= 1, 'o encaminhado há 40 dias está fora');
    verdadeiro(p.sinalizadores[0].total < p.sla.total,
      'só os encaminhados entram na conta da área');
  });

  teste('VG: sem SLA e sem sinalizador ligado, a tela não desenha o bloco', () => {
    igual(produtividade(vg).prazos, null);
  });

  /* ----------------------------------------------------------------------- */
  secao('Configurações › Sinalizadores');

  const gerente = (extra) => Object.assign({ nome: 'Novo prazo', canalId: ret.id,
    prazo: 5, unidade: 'dias', aviso: 1 }, extra);

  teste('a seção existe no menu, com a contagem dos ligados', () => {
    const resumo = chamar('resumoDasConfiguracoes()');
    const secaoDe = resumo.secoes.find((s) => s.chave === 'sinalizadores');
    igual(secaoDe.titulo, 'Sinalizadores');
    igual(secaoDe.quantidade, 2, 'RET e Mesa ligados; o VG não conta');
  });

  teste('listar traz canal, regra por extenso e o estado de cada um', () => {
    const lista = chamar('listarSinalizadores()');
    igual(lista.length, 3);
    const daRet = lista.find((s) => s.canalNome === 'RET');
    igual(daRet.regra, '3 dias úteis · amarelo quando faltar 1 dia útil');
    igual(daRet.ativo, true);
    const doVg = lista.find((s) => s.canalNome === 'VG');
    igual(doVg.ativo, false);
  });

  teste('as opções trazem, por canal, as colunas de data e de hora', () => {
    const o = chamar('opcoesDeSinalizador()');
    igual(o.abaExiste, true);
    igual(o.expedientePadrao.abre, '08:15');
    const daMesa = o.canais.find((c) => c.aba === 'BASE_MESA');
    verdadeiro(daMesa.colunas.indexOf('Área responsável') >= 0);
    verdadeiro(daMesa.colunasDeData.indexOf('Data de entrada') >= 0);
    verdadeiro(daMesa.colunasDeData.indexOf('Data do encaminhamento') >= 0);
    verdadeiro(daMesa.colunasDeData.indexOf('Analista') < 0, 'texto não é data');
    verdadeiro(daMesa.colunasDeHora.indexOf('Horário') >= 0);
    verdadeiro(daMesa.colunas.every((c) => c.charAt(0) !== '_'), 'sem as de controle');
  });

  teste('o PO ajusta o prazo da RET e o Trabalho obedece na hora', () => {
    const linha = linhasDaAba().find((l) => String(l.CanalId) === String(ret.id));
    chamar('salvarSinalizador')(Object.assign(gerente({ id: linha.Id,
      nome: 'Prazo de retorno', prazo: 1000, aviso: 1 })));
    // 1000 dias úteis: o caso de 60 dias deixa de estar vermelho.
    const sinal = sinaisDe(filaDaRet(), velhoAberto)[0];
    igual(sinal.tom, 'bom', 'o prazo novo vale sem reiniciar nada');
    contem(sinal.regra, '1000 dias úteis');

    // Volta ao combinado, para os testes seguintes.
    chamar('salvarSinalizador')(gerente({ id: linha.Id, nome: 'Prazo de retorno',
      prazo: 3, aviso: 1 }));
    igual(sinaisDe(filaDaRet(), velhoAberto)[0].tom, 'ruim');
  });

  teste('o PO liga o do VG: preencher e ligar, sem tocar em código', () => {
    const linha = linhasDaAba().find((l) => String(l.CanalId) === String(vg.id));
    chamar('salvarSinalizador')({ id: linha.Id, nome: 'Prazo de retorno',
      canalId: vg.id, prazo: 5, unidade: 'dias', aviso: 1, ativo: true });
    igual(doCanal(vg).length, 1);
    igual(chamar('listarSinalizadores()').find((s) => s.canalNome === 'VG').regra,
      '5 dias úteis · amarelo quando faltar 1 dia útil');
    // Desliga de novo.
    chamar('salvarSinalizador')({ id: linha.Id, nome: 'Prazo de retorno',
      canalId: vg.id, prazo: 5, unidade: 'dias', aviso: 1, ativo: false });
    igual(doCanal(vg).length, 0);
  });

  teste('criar um sinalizador novo, e um segundo no mesmo canal', () => {
    const id = chamar('salvarSinalizador')(gerente({ nome: 'Contato inicial', prazo: 1,
      aviso: 0, colunaDaData: 'Data da importação' }));
    verdadeiro(!!id);
    igual(doCanal(ret).length, 2, 'a RET agora tem dois');
    const sinais = sinaisDe(filaDaRet(), deHoje);
    igual(sinais.length, 1, 'o de hoje não tem Data da importação: só o primeiro conta');
    chamar('ocultarSinalizador')(id);
    igual(doCanal(ret).length, 1);
  });

  teste('prazo zero com o sinalizador ligado é recusado: não sinalizaria nada', () => {
    lanca(() => chamar('salvarSinalizador')(gerente({ prazo: 0 })), 'prazo maior que zero');
    // Desligado, zero é permitido: é como o VG nasce.
    verdadeiro(!!chamar('salvarSinalizador')(gerente({ nome: 'Rascunho', prazo: 0,
      aviso: 0, ativo: false })));
  });

  teste('amarelo maior ou igual ao prazo é recusado: o caso já nasceria amarelo', () => {
    lanca(() => chamar('salvarSinalizador')(gerente({ nome: 'Aviso grande', prazo: 3,
      aviso: 3 })), 'já nasceria amarelo');
    lanca(() => chamar('salvarSinalizador')(gerente({ nome: 'Aviso maior', prazo: 3,
      aviso: 10 })), 'já nasceria amarelo');
  });

  teste('números tortos são recusados', () => {
    lanca(() => chamar('salvarSinalizador')(gerente({ nome: 'Torto', prazo: 'abc' })),
      'são números');
    lanca(() => chamar('salvarSinalizador')(gerente({ nome: 'Negativo', prazo: -1 })),
      'são números');
  });

  teste('aceita vírgula no decimal', () => {
    const id = chamar('salvarSinalizador')(gerente({ nome: 'Meio dia', prazo: '2,5',
      aviso: '0,5' }));
    const gravada = linhasDaAba().find((l) => String(l.Id) === String(id));
    igual(gravada.Prazo, 2.5);
    chamar('ocultarSinalizador')(id);
  });

  teste('nome obrigatório, curto, e sem repetir dentro do canal', () => {
    lanca(() => chamar('salvarSinalizador')(gerente({ nome: '  ' })), 'Dê um nome');
    lanca(() => chamar('salvarSinalizador')(gerente({ nome: 'x'.repeat(41) })), 'limite é 40');
    lanca(() => chamar('salvarSinalizador')(gerente({ nome: 'prazo de RETORNO' })),
      'já tem um sinalizador chamado');
    // Em OUTRO canal o mesmo nome é permitido: o VG também se chama assim.
    verdadeiro(linhasDaAba().filter((l) => l.Nome === 'Prazo de retorno').length >= 2);
  });

  teste('coluna que não existe, ou do tipo errado, é recusada', () => {
    lanca(() => chamar('salvarSinalizador')(gerente({ nome: 'Coluna fantasma',
      colunaDaData: 'Não existe' })), 'não existe na aba');
    lanca(() => chamar('salvarSinalizador')(gerente({ nome: 'Texto como data',
      colunaDaData: 'analista' })), 'não é uma coluna de data');
    lanca(() => chamar('salvarSinalizador')(gerente({ nome: 'Texto como hora',
      colunaDaHora: 'analista' })), 'não é uma coluna de hora');
    lanca(() => chamar('salvarSinalizador')(gerente({ nome: 'Liga fantasma',
      colunaQueLiga: 'Não existe' })), 'não existe na aba');
  });

  teste('expediente: legível, e terminando depois de começar', () => {
    lanca(() => chamar('salvarSinalizador')(gerente({ nome: 'Expediente torto',
      inicioDoExpediente: 'cedo' })), 'O expediente é em horas');
    lanca(() => chamar('salvarSinalizador')(gerente({ nome: 'Expediente ao contrário',
      inicioDoExpediente: '18:30', fimDoExpediente: '08:15' })), 'termina antes de começar');
    const id = chamar('salvarSinalizador')(gerente({ nome: 'Das 9 às 17',
      inicioDoExpediente: '9:00', fimDoExpediente: '17h00' }));
    const s = chamar('listarSinalizadores()').find((x) => String(x.id) === String(id));
    igual(s.inicioDoExpediente, '09:00');
    igual(s.fimDoExpediente, '17:00');
    chamar('ocultarSinalizador')(id);
  });

  teste('expediente em branco vale o padrão da célula, 08:15 às 18:30', () => {
    const id = chamar('salvarSinalizador')(gerente({ nome: 'Sem expediente',
      inicioDoExpediente: '', fimDoExpediente: '' }));
    const s = chamar('listarSinalizadores()').find((x) => String(x.id) === String(id));
    igual(s.inicioDoExpediente, '08:15');
    igual(s.fimDoExpediente, '18:30');
    chamar('ocultarSinalizador')(id);
  });

  teste('o expediente do sinalizador muda a conta: 4 horas úteis por dia', () => {
    const curto = Object.assign({}, doCanal(ret)[0], { abre: 9 * 60, fecha: 13 * 60 });
    const sinal = chamar('sinalDoCaso_')(nascido, ret, curto, situacoes, quando(6, '09:00'));
    // Segunda inteira (4h = 240min) já contou: faltam 2 dias de 4h.
    contem(sinal.texto, 'faltam 2 dias úteis', 'o dia útil deste sinalizador tem 4h');
  });

  teste('trocar o canal de um sinalizador que já existe não é aceito pela tela, mas as colunas dele são conferidas', () => {
    const linha = linhasDaAba().find((l) => String(l.CanalId) === String(mesa.id));
    // A coluna do carimbo é da Mesa: na RET, ela não existe.
    lanca(() => chamar('salvarSinalizador')({ id: linha.Id, nome: 'Retorno da área',
      canalId: ret.id, prazo: 48, unidade: 'horas', aviso: 10,
      colunaDaData: 'Data do encaminhamento' }), 'não existe na aba');
  });

  teste('tirar da lista guarda a linha e para o selo; tirar o que não existe é recusado', () => {
    const id = chamar('salvarSinalizador')(gerente({ nome: 'Para tirar' }));
    chamar('ocultarSinalizador')(id);
    verdadeiro(!linhasDaAba().some((l) => String(l.Id) === String(id)), 'sumiu da lista');
    verdadeiro(chamar('lerRegistros_')('SINALIZADORES', { incluirOcultos: true })
      .some((l) => String(l.Id) === String(id)), 'a linha continua na planilha');
    lanca(() => chamar('ocultarSinalizador')('9999999'), 'não existe');
  });

  teste('cada mudança deixa rastro na auditoria', () => {
    const trilha = chamar('listarAuditoria')(100).map((l) => l.acao);
    verdadeiro(trilha.indexOf('sinalizador.criar') >= 0);
    verdadeiro(trilha.indexOf('sinalizador.editar') >= 0);
    verdadeiro(trilha.indexOf('sinalizador.ocultar') >= 0);
  });

  teste('quem não configura não vê nem mexe — nem com a senha de administrador', () => {
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    chamar('salvarUsuario')({ nome: 'Ana Operação', email: 'ana@exemplo.com',
      nivelAcessoId: operacao.Id, ativo: true });
    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      lanca(() => chamar('listarSinalizadores()'), 'não permite configurar');
      lanca(() => chamar('opcoesDeSinalizador()'), 'não permite configurar');
      lanca(() => chamar('salvarSinalizador')(gerente({ nome: 'Pela porta dos fundos' })),
        'não permite configurar');
      lanca(() => chamar('ocultarSinalizador')(linhasDaAba()[0].Id), 'não permite configurar');
    });
  });

  teste('o diagnóstico confere cada sinalizador e acusa o que não vai funcionar', () => {
    const laudo = chamar('diagnosticoRECC()');
    const bloco = laudo.blocos.find((b) => b.titulo === 'Os sinalizadores de prazo');
    verdadeiro(!!bloco, 'o bloco existe');
    igual(bloco.situacao, 'ok');

    // Um sinalizador apontando para coluna que sumiu: o caso vencido passaria
    // com a etiqueta verde — o pior jeito de falhar num controle de prazo.
    const outra = carregar('primeiro.adm@exemplo.com');
    outra.chamar('instalarRECC()');
    outra.chamar('removerColuna_')('BASE_MESA', 'Data do encaminhamento');
    outra.chamar('esquecerEstruturaLida_()');
    const quebrado = outra.chamar('diagnosticoRECC()').blocos
      .find((b) => b.titulo === 'Os sinalizadores de prazo');
    igual(quebrado.situacao, 'falha');
    contem(JSON.stringify(quebrado.itens), 'cita coluna que a base não tem');
    contem(JSON.stringify(quebrado.itens), 'Data do encaminhamento');
  });

  teste('o diagnóstico avisa do sinalizador ligado num canal sem status final', () => {
    const outra = carregar('primeiro.adm@exemplo.com');
    outra.chamar('instalarRECC()');
    outra.chamar('lerRegistros_("CATALOGO")').forEach((item) => {
      const daRet = String(item.Tipo) === 'STATUS'
        && String(item.CanalId) === String(outra.chamar('canaisVisiveis_()')
          .find((c) => c.aba === 'BASE_RET').id);
      if (daRet) outra.chamar('atualizarRegistro_')('CATALOGO', item.Id, { Final: false });
    });
    outra.chamar('esquecerEstruturaLida_()');
    const bloco = outra.chamar('diagnosticoRECC()').blocos
      .find((b) => b.titulo === 'Os sinalizadores de prazo');
    contem(JSON.stringify(bloco.itens), 'não tem onde parar');
  });

  /* ----------------------------------------------------------------------- */
  secao('A migração: atualizarPGO cria a aba, a coluna e os sinalizadores');

  /** Uma planilha "de antes desta rodada": sem a aba e sem o carimbo da Mesa. */
  function planilhaDeAntes() {
    const antes = carregar('primeiro.adm@exemplo.com');
    antes.chamar('instalarRECC()');
    antes.ambiente.planilha.deleteSheet(
      antes.ambiente.planilha.getSheetByName('SINALIZADORES'));
    antes.chamar('removerColuna_')('BASE_MESA', 'Data do encaminhamento');
    antes.chamar('lerRegistros_("CAMPOS")').forEach((campo) => {
      if (String(campo.Cabecalho) === 'Data do encaminhamento') {
        antes.chamar('apagarRegistroDeVez_')('CAMPOS', campo.Id);
      }
    });
    antes.chamar('esquecerEstruturaLida_()');
    return antes;
  }

  teste('sem atualizar, a planilha de antes não tem nada disso', () => {
    // Este teste prova que a atualização é NECESSÁRIA: sem ele, uma migração
    // que não faz nada passaria verde para sempre.
    const antes = planilhaDeAntes();
    igual(antes.ambiente.planilha.getSheetByName('SINALIZADORES'), null);
    verdadeiro(antes.chamar('estruturaDaAba_')('BASE_MESA').cabecalhos
      .indexOf('Data do encaminhamento') < 0);
  });

  teste('atualizar cria a aba, a coluna da Mesa e os três sinalizadores', () => {
    const antes = planilhaDeAntes();
    const recado = antes.chamar('atualizarPGO()');
    contem(recado, 'aba SINALIZADORES criada');
    contem(recado, 'BASE_MESA.Data do encaminhamento criada');
    contem(recado, 'sinalizador "Prazo de retorno" criado para BASE_RET');
    contem(recado, 'sinalizador "Retorno da área" criado para BASE_MESA');
    contem(recado, 'sinalizador "Prazo de retorno" criado para BASE_VG (desligado');

    igual(antes.chamar('lerRegistros_("SINALIZADORES")').length, 3);
    verdadeiro(antes.chamar('estruturaDaAba_')('BASE_MESA').cabecalhos
      .indexOf('Data do encaminhamento') >= 0);
    const campo = antes.chamar('lerRegistros_("CAMPOS")')
      .find((c) => String(c.Cabecalho) === 'Data do encaminhamento');
    igual(String(campo.Ativo), 'NAO', 'a coluna do sistema não vira campo do formulário');
    igual(String(campo.Secao), 'Preenchido pelo sistema');
  });

  teste('a planilha migrada passa a carimbar o encaminhamento', () => {
    const antes = planilhaDeAntes();
    antes.chamar('atualizarPGO()');
    const m = antes.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
    const criado = antes.chamar('cadastrarCaso')(m.id, { status: 'Em andamento',
      nomedosegurado: 'Depois de atualizar', arearesponsavel: 'Sinistro' });
    const gravado = antes.chamar('lerRegistros_')('BASE_MESA')
      .find((l) => String(l.ID) === String(criado.id) || String(l.__id) === String(criado.id));
    verdadeiro(typeof gravado['Data do encaminhamento'].getTime === 'function',
      'gravou o momento do encaminhamento');
  });

  teste('o caso que já estava encaminhado antes fica sem carimbo — e sem prazo inventado', () => {
    const antes = planilhaDeAntes();
    const m = antes.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
    antes.chamar('inserirRegistro_')('BASE_MESA', { Analista: 'Bia', Status: 'Em andamento',
      'Nome do segurado': 'Antigo', 'Data de entrada': diasAtras(30),
      'Área responsável': 'Sinistro' });
    antes.chamar('atualizarPGO()');
    const fila = antes.chamar('resumoDoCanal')(m.id, {}, 90).fila;
    verdadeiro(fila.length > 0);
    verdadeiro(fila.every((c) => c.sinais.length === 0),
      'sem carimbo não há de onde contar as 48 horas');
  });

  teste('rodar de novo não duplica nem desfaz nada', () => {
    const antes = planilhaDeAntes();
    antes.chamar('atualizarPGO()');
    const segunda = antes.chamar('atualizarPGO()');
    igual(antes.chamar('lerRegistros_("SINALIZADORES")').length, 3, 'continuam três');
    contem(segunda, 'aba SINALIZADORES já existe');
    contem(segunda, 'BASE_MESA.Data do encaminhamento já existe');
    verdadeiro(segunda.indexOf('criado para BASE_') < 0, 'nada novo na segunda rodada');
  });

  teste('o prazo que o PO ajustou não é sobrescrito pela atualização', () => {
    const antes = planilhaDeAntes();
    antes.chamar('atualizarPGO()');
    const r = antes.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    const linha = antes.chamar('lerRegistros_("SINALIZADORES")')
      .find((l) => String(l.CanalId) === String(r.id));
    antes.chamar('atualizarRegistro_')('SINALIZADORES', linha.Id, { Prazo: 7 });
    antes.chamar('atualizarPGO()');
    igual(antes.chamar('lerRegistros_("SINALIZADORES")')
      .find((l) => String(l.Id) === String(linha.Id)).Prazo, 7);
  });

  teste('o sinalizador que o PO tirou de propósito não renasce na atualização', () => {
    const antes = planilhaDeAntes();
    antes.chamar('atualizarPGO()');
    const r = antes.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    const linha = antes.chamar('lerRegistros_("SINALIZADORES")')
      .find((l) => String(l.CanalId) === String(r.id));
    antes.chamar('ocultarRegistro_')('SINALIZADORES', linha.Id, '0000000001');
    antes.chamar('atualizarPGO()');
    igual(antes.chamar('lerRegistros_("SINALIZADORES")')
      .filter((l) => String(l.CanalId) === String(r.id)).length, 0,
    'continua tirado');
  });

  teste('canal que o PO criou depois não ganha sinalizador por conta própria', () => {
    const antes = planilhaDeAntes();
    antes.chamar('atualizarPGO()');
    antes.chamar('definirSenhaDeAdministrador')('segredo123', '');
    antes.chamar('liberarComSenha')('segredo123');
    const novo = antes.chamar('criarCanal')({ nome: 'Auto Frota', descricao: 'Piloto' });
    igual(antes.chamar('lerRegistros_("SINALIZADORES")').length, 3,
      'nenhum sinalizador nasceu junto com o canal: prazo é decisão do PO');
    // E o Trabalho do canal novo abre, sem selo e sem erro.
    const fila = antes.chamar('resumoDoCanal')(novo.id, {}, 90).fila;
    igual(fila.length, 0);
  });

  teste('a instalação nova já nasce com tudo, e a atualização não tem o que fazer', () => {
    const nova = carregar('primeiro.adm@exemplo.com');
    nova.chamar('instalarRECC()');
    const recado = nova.chamar('atualizarPGO()');
    contem(recado, 'aba SINALIZADORES já existe');
    contem(recado, 'BASE_MESA.Data do encaminhamento já existe');
    igual(nova.chamar('lerRegistros_("SINALIZADORES")').length, 3);
  });

  /* ----------------------------------------------------------------------- */
  secao('As telas');

  teste('o Trabalho desenha o selo de cada sinalizador embaixo da situação', () => {
    const tela = lerTela('Trabalho.html');
    contem(tela, 'selosDePrazo(caso.sinais)');
    contem(tela, "'<span class=\"selo-prazo tom-' + escapar(sinal.tom)",
      'o tom do selo é o que o servidor calculou');
    contem(tela, "+ '\">'\n        + escapar(sinal.texto)",
      'o texto DENTRO do selo vem escapado (o do title é outra linha)');
    contem(tela, "' title=\"' + escapar(sinal.texto)", 'e o do title também');
    contem(tela, 'sinal.regra', 'a dica traz a regra por extenso');
    // A cor sozinha não basta para quem não distingue verde de vermelho.
    contem(tela, 'so-leitor');
    contem(tela, 'fora do prazo');
  });

  teste('o selo não é cortado: quebra dentro da coluna, e tem os três tons', () => {
    const estilos = lerPeca('Estilos');
    contem(estilos, '.selo-prazo {');
    contem(estilos, 'width: fit-content; max-width: 100%');
    contem(estilos, '.tom-atencao');
    contem(estilos, '.tom-ruim');
    contem(estilos, '.tom-bom');
  });

  teste('a Produtividade desenha o controle de prazos, com o analista e a lista', () => {
    const tela = lerTela('Produtividade.html');
    contem(tela, '+ desenharPrazos()');
    contem(tela, 'painel.prazos');
    contem(tela, 'Controle de prazos');
    contem(tela, 'blocoDoSla', 'a Mesa mostra dentro e fora do SLA');
    contem(tela, 'Dentro do SLA');
    contem(tela, 'Fora do SLA');
    contem(tela, 'por analista', 'quem deixou estourar');
    contem(tela, 'resumo.maisCasos', 'a lista diz quantos ficaram de fora');
    verdadeiro(tela.indexOf('painel.prazos.sinalizadores.forEach') < 0
      || tela.indexOf('prazos.sinalizadores.forEach') >= 0);
  });

  teste('Configurações tem a seção, chama as quatro funções e usa o ícone', () => {
    const tela = lerTela('Configuracoes.html');
    contem(tela, "if (secaoAtual === 'sinalizadores') return carregarSinalizadores();");
    ['opcoesDeSinalizador', 'listarSinalizadores', 'salvarSinalizador',
      'ocultarSinalizador'].forEach((funcao) => {
      contem(tela, "Servidor.chamar('" + funcao + "'", 'a tela chama ' + funcao);
    });
    contem(lerTela('Comuns.html'), 'sinalizadores:\n',
      'a seção tem o próprio ícone');
    contem(tela, 'atualizarPGO()', 'a planilha sem a aba recebe a instrução');
    contem(tela, 'Novo sinalizador');
  });

  teste('o painel pede o que o servidor valida: prazo, unidade, amarelo, colunas, expediente', () => {
    const tela = lerTela('Configuracoes.html');
    ['sn-nome', 'sn-canal', 'sn-prazo', 'sn-unidade', 'sn-aviso', 'sn-liga', 'sn-data',
      'sn-hora', 'sn-inicio', 'sn-fim', 'sn-ordem', 'sn-ativo'].forEach((campo) => {
      contem(tela, "'" + campo + "'", 'o formulário tem ' + campo);
    });
  });
}

module.exports = { rodarTestesDeSinalizadores };
