/**
 * ============================================================================
 * PGO — testes-busca-rapida.js · achar sem ler a coluna inteira (Etapa 63)
 * ============================================================================
 * Achado da análise de 29/10: cada SUSEP digitada no formulário lia a coluna
 * inteira das 151 mil bloqueadas, e cada caso aberto, salvo ou com status
 * trocado lia a coluna de Id inteira da base. Agora o localizador do próprio
 * Sheets (TextFinder) aponta as linhas, do lado do Google.
 *
 * O que se prova aqui:
 *   1. o localizador acha EXATAMENTE o que a comparação de sempre achava —
 *      sem acento, sem caixa, sem separador, e o identificador só pelos dígitos;
 *   2. as duas proteções pedidas pelo PO: a chave OPERACAO.BUSCA_RAPIDA e a
 *      conferência do diagnóstico; e o Id que nunca depende só do localizador.
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro, contem, lanca } = require('./ferramentas');

function preparar(desligada) {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  t.medir = (fazer) => {
    const antes = t.ambiente.medidor.retrato();
    const resultado = fazer();
    const depois = t.ambiente.medidor.retrato();
    return {
      resultado,
      celulas: depois.celulasLidas - antes.celulasLidas,
      buscas: depois.buscasRapidas - antes.buscasRapidas
    };
  };
  if (desligada) mudarAChave(t, 'NAO');
  return t;
}

function mudarAChave(t, valor) {
  const linha = t.chamar('lerRegistros_')('CONFIG').find((l) => l.Chave === 'OPERACAO.BUSCA_RAPIDA');
  t.chamar('atualizarRegistro_')('CONFIG', linha.__id, { Valor: valor });
  t.chamar('esquecerCacheDaConfiguracao_()');
}

/** SUSEPs escritas de todo jeito — o que a planilha real tem. */
const ESCRITAS = ['RET00J', 'ret-00k', ' RET 00 L ', 'Ré00M', 77777777, '7dmd8gs', 'JAMJAMM', 'BLQ.123.456'];

function comBloqueadas(t, quantas) {
  const lote = ESCRITAS.map((susep, i) => ({ SUSEP: susep, NomeCorretora: 'Corretora São ' + i,
    Sucursal: 'Sucursal ' + (i % 3), BloqueadaPor: 'Companhia' }));
  for (let i = 0; i < quantas; i++) {
    lote.push({ SUSEP: 'VOL' + String(i).padStart(6, '0'), NomeCorretora: 'Volume ' + i,
      Sucursal: 'Sucursal ' + (i % 7), BloqueadaPor: 'Corretora' });
  }
  t.chamar('inserirVariosRegistros_')('SUSEP_BLOQUEADAS', lote);
}

function rodarTestesDaBuscaRapida() {
  console.log('\nEtapa 63: a busca rápida, pelo localizador do Sheets');

  /* ----------------------------------------------------------------------- */
  secao('Acha o mesmo que a comparação de sempre');

  const rapida = preparar(false);
  const lenta = preparar(true);
  comBloqueadas(rapida, 300);
  comBloqueadas(lenta, 300);

  teste('cada SUSEP, digitada de outro jeito, é achada — e só ela', () => {
    const digitadas = ['ret00j', 'RET00K', 'ret-00-l', 'RE00M', '77777777', '7DMD8GS', 'jamjamm',
      'blq123456', 'VOL000150', 'NAOEXISTE', 'RET00', 'ET00J', '7777777'];
    digitadas.forEach((digitada) => {
      const daRapida = rapida.chamar('buscarRegistros_')('SUSEP_BLOQUEADAS', 'SUSEP', digitada)
        .map((r) => r.__linha).join(',');
      const daLenta = lenta.chamar('buscarRegistros_')('SUSEP_BLOQUEADAS', 'SUSEP', digitada)
        .map((r) => r.__linha).join(',');
      igual(daRapida, daLenta, digitada);
    });
    igual(rapida.chamar('buscarRegistros_')('SUSEP_BLOQUEADAS', 'SUSEP', 'RET00').length, 0,
      'pedaço de SUSEP não é a SUSEP');
  });

  teste('o selo da SUSEP: BLOQUEADA com 300 linhas, lendo só a linha achada', () => {
    rapida.chamar('consultarSusep')('JAMJAMM');   // a configuração já lida, como no dia a dia
    const medido = rapida.medir(() => rapida.chamar('consultarSusep')(' ret 00 j'));
    igual(medido.resultado.situacao, 'BLOQUEADA');
    verdadeiro(medido.buscas > 0, 'usou o localizador');
    verdadeiro(medido.celulas < 200, medido.celulas + ' células (a coluna tem 300+)');
    igual(rapida.chamar('consultarSusep')('NAOEXISTE').situacao, 'NAO_ENCONTRADA');
  });

  teste('a busca das bloqueadas devolve o mesmo, com acento, espaço ou pedaço', () => {
    ['sao', 'São 3', 'corretorasao', 'sucursal 2', 'vol0001', 'ret', 'zzz', '777'].forEach((termo) => {
      const a = rapida.chamar('resumoDasSusepsBloqueadas')(termo);
      const b = lenta.chamar('resumoDasSusepsBloqueadas')(termo);
      igual(a.quantasAchadas + '|' + a.bloqueadas.map((x) => x.susep).join(','),
        b.quantasAchadas + '|' + b.bloqueadas.map((x) => x.susep).join(','), termo);
    });
  });

  teste('abrir e trocar o status de um caso lê só um punhado de células', () => {
    const lote = Array.from({ length: 3000 }, (_, i) => ({ 'nome do cliente': 'Volume ' + i, status: 'Pendente' }));
    rapida.chamar('inserirVariosRegistros_')('BASE_RET', lote);
    const [outro, caso] = rapida.chamar('lerRegistros_')('BASE_RET', { ultimas: 2 });
    rapida.chamar('casoParaEditar')(rapida.ret.id, outro.__id);   // a configuração já lida
    const aberto = rapida.medir(() => rapida.chamar('casoParaEditar')(rapida.ret.id, caso.__id));
    verdadeiro(aberto.celulas < 500, 'abrir: ' + aberto.celulas + ' células (a coluna tem 3.000)');
    const trocado = rapida.medir(() => rapida.chamar('alterarSituacaoDoCaso')(rapida.ret.id, caso.__id, 'Pago', {}));
    verdadeiro(trocado.celulas < 500, 'trocar: ' + trocado.celulas + ' células');
    igual(rapida.chamar('lerRegistros_')('BASE_RET', { ultimas: 1 })[0].status, 'Pago');
  });

  teste('Id repetido na planilha continua sendo erro, e não "usa o primeiro"', () => {
    const t = preparar(false);
    const a = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Original', status: 'Pendente' });
    t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Cópia', status: 'Pendente' });
    const aba = t.ambiente.planilha.getSheetByName('BASE_RET');
    const cabecalhos = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
    aba.getRange(3, cabecalhos.indexOf('id') + 1).setValue(a.id);   // a cópia ganha o Id do original
    t.chamar('esquecerEstruturaLida_')('BASE_RET');
    lanca(() => t.chamar('atualizarRegistro_')('BASE_RET', a.id, { status: 'Pago' }), 'aparece em 2 linhas');
  });

  teste('a proposta repetida no mês é achada sem ler a coluna do número', () => {
    const t = preparar(false);
    const lote = Array.from({ length: 2000 }, (_, i) => ({ 'Código origem da proposta': '7',
      'número da proposta': String(100000 + i), 'data de recepção do protocolo': new Date(),
      analista: 'Ana Martins', status: 'Pendente', 'nome do cliente': 'P' + i }));
    t.chamar('inserirVariosRegistros_')('BASE_RET', lote);
    t.chamar('conferirPropostaRepetida')('7-100001', t.ret.id, '', '');   // a configuração já lida
    const medido = t.medir(() => t.chamar('conferirPropostaRepetida')('7-101234', t.ret.id, '', ''));
    igual(medido.resultado.situacao, 'REPETIDA');
    verdadeiro(medido.celulas < 500, medido.celulas + ' células (a coluna tem 2.000)');
    igual(t.chamar('conferirPropostaRepetida')('7-0999999', t.ret.id, '', '').situacao, 'UNICA');
  });

  /* ----------------------------------------------------------------------- */
  secao('As proteções');

  teste('a instalação traz a chave OPERACAO.BUSCA_RAPIDA, ligada', () => {
    const t = preparar(false);
    igual(t.chamar('valorDaConfiguracao_')('OPERACAO.BUSCA_RAPIDA', ''), 'SIM');
  });

  teste('NAO na chave: nenhuma busca pelo localizador, e as mesmas respostas', () => {
    const medido = lenta.medir(() => lenta.chamar('consultarSusep')('RET00J'));
    igual(medido.resultado.situacao, 'BLOQUEADA');
    igual(medido.buscas, 0);
  });

  teste('localizador que não acha nada: o caso ainda abre e grava (a coluna é lida)', () => {
    const t = preparar(false);
    const caso = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Sem localizador', status: 'Pendente' });
    t.ambiente.localizadorCego = true;
    try {
      igual(String(t.chamar('casoParaEditar')(t.ret.id, caso.id).id || caso.id), String(caso.id));
      t.chamar('alterarSituacaoDoCaso')(t.ret.id, caso.id, 'Pago', {});
    } finally {
      t.ambiente.localizadorCego = false;
    }
    igual(t.chamar('lerRegistros_')('BASE_RET').find((l) => String(l.__id) === String(caso.id)).status, 'Pago');
  });

  teste('localizador que aponta a linha errada: a conferência recusa, e acha a certa', () => {
    const t = preparar(false);
    const casos = ['Primeiro', 'Segundo', 'Terceiro'].map((nome) =>
      t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: nome, status: 'Pendente' }));
    comBloqueadas(t, 5);
    t.ambiente.localizadorTorto = true;
    try {
      igual(t.chamar('casoParaEditar')(t.ret.id, casos[1].id).valores.nomedocliente, 'Segundo',
        'abriu o caso pedido, e não o vizinho');
      t.chamar('alterarSituacaoDoCaso')(t.ret.id, casos[1].id, 'Pago', {});
      // A SUSEP vizinha nunca responde pela pedida: na dúvida, "não encontrada"
      // — e é o diagnóstico que avisa que o localizador está torto.
      const selo = t.chamar('consultarSusep')('JAMJAMM');
      verdadeiro(selo.situacao !== 'BLOQUEADA' || selo.susep === 'JAMJAMM',
        'respondeu com a SUSEP ' + selo.susep);
    } finally {
      t.ambiente.localizadorTorto = false;
    }
    const base = t.chamar('lerRegistros_')('BASE_RET');
    igual(base.map((l) => l['nome do cliente'] + ':' + l.status).join(','),
      'Primeiro:Pendente,Segundo:Pago,Terceiro:Pendente', 'só o Segundo mudou');
  });

  teste('o diagnóstico confere linhas reais: OK quando o localizador acha', () => {
    const item = itemDoDiagnostico(rapida);
    igual(item.situacao, 'ok');
    contem(item.oQue, 'achou as');
  });

  teste('o diagnóstico dá FALHA quando o localizador não acha, e diz como desligar', () => {
    rapida.ambiente.localizadorCego = true;
    let item;
    try { item = itemDoDiagnostico(rapida); } finally { rapida.ambiente.localizadorCego = false; }
    igual(item.situacao, 'falha');
    contem(item.detalhe, 'SUSEP_BLOQUEADAS');
    contem(item.comoArrumar, 'OPERACAO.BUSCA_RAPIDA');
  });

  teste('o diagnóstico lembra quando a busca rápida está desligada', () => {
    const item = itemDoDiagnostico(lenta);
    igual(item.situacao, 'atencao');
    contem(item.comoArrumar, 'SIM');
  });
}

function itemDoDiagnostico(t) {
  return t.chamar('diagnosticoDoSistema')().blocos.find((b) => b.chave === 'ambiente')
    .itens.find((i) => /Busca rápida/.test(i.oQue));
}

module.exports = { rodarTestesDaBuscaRapida };
