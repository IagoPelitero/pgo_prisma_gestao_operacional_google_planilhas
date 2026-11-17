/**
 * ============================================================================
 * PGO — testes-busca-com-localizador.js · o Buscar Caso sem ler a coluna (Etapa 82)
 * ============================================================================
 * A aba ERROS do PO (11 a 17/11): 245 buscas lentas, ~7,6 s cada só lendo as
 * colunas de busca inteiras, e picos de 20 a 45 s no histórico, que lia as
 * linhas achadas uma a uma numa planilha de fora. Aprovado pelo PO:
 *
 *   A. o histórico lê as linhas achadas em blocos, como a base própria;
 *   B. a base própria pede ao localizador do Sheets (o da Etapa 63) as linhas
 *      candidatas, e a regra de sempre (casaComOTermo_) confere só essas.
 *
 * O que se prova: a busca acha EXATAMENTE o que achava (com e sem o
 * localizador, nos termos que a operação digita), lendo um punhado de células;
 * "nada encontrado" nunca depende só do localizador; e o histórico deixou de ir
 * à planilha de fora uma vez por linha.
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro } = require('./ferramentas');

const COLUNA = 'data de recepção do protocolo';

function haMeses(meses) {
  const d = new Date();
  d.setMonth(d.getMonth() - meses);
  return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
}

function hoje() { return haMeses(0); }

function preparar() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  const canais = t.chamar('canaisVisiveis_()');
  t.ret = canais.find((c) => c.aba === 'BASE_RET');
  t.mesa = canais.find((c) => c.aba === 'BASE_MESA');
  const casos = [];
  for (let i = 1; i <= 60; i++) {
    casos.push({ [COLUNA]: hoje(), status: 'Pendente', 'nome do cliente': 'Cliente ' + i,
      protocolo: 'RET-2026-' + String(i).padStart(4, '0'), CPF: String(10000000000 + i) });
  }
  casos.push({ [COLUNA]: hoje(), status: 'Pendente', 'nome do cliente': 'José Ângelo Conceição',
    protocolo: 'RET-2026-9001', CPF: '12345678901', Num_apolice: '0000077777' });
  casos.push({ [COLUNA]: hoje(), status: 'Pendente', 'nome do cliente': 'JOSE ANGELO FILHO',
    protocolo: 'RET-2026-9002', CPF: '98765432100' });
  t.chamar('inserirVariosRegistros_')('BASE_RET', casos);
  t.chamar('inserirVariosRegistros_')('BASE_MESA', [
    { 'Nome do segurado': 'Vanessa Duarte Lima', 'Documento (CPF)': '12345678901', SUSEP: 'RET00J' },
    { 'Nome do segurado': 'Otávio Bandeira', 'Documento (CPF)': '99988877766', SUSEP: 'ret-00k' }
  ]);
  t.buscar = (termo, historico) => t.chamar('buscarCasos')(termo, [], false, !!historico);
  t.medir = (fazer) => {
    const antes = t.ambiente.medidor.retrato();
    const resultado = fazer();
    const depois = t.ambiente.medidor.retrato();
    return { resultado, celulas: depois.celulasLidas - antes.celulasLidas,
      idas: depois.idasParaLer - antes.idasParaLer, buscas: depois.buscasRapidas - antes.buscasRapidas };
  };
  t.chave = (valor) => {
    t.chamar('gravarConfiguracao_')('OPERACAO.BUSCA_RAPIDA', valor);
    t.chamar('esquecerCacheDaConfiguracao_()');
  };
  return t;
}

/** O que a pessoa vê: por origem, quais casos e o aviso. */
function retrato(achados) {
  return achados.origens.map((o) => o.tipo + ':' + o.id + '=' + o.casos.map((c) => c.id).join(',')
    + (o.aviso ? ' [' + o.aviso + ']' : '')).join(' | ');
}

const TERMOS = ['RET-2026-0007', '2026-0007', '0007', 'jose angelo', 'JOSÉ ÂNGELO', 'conceicao',
  '123.456.789-01', '12345678901', '77777', 'Cliente', 'cliente 5', 'RET00J', 'ret 00 k', 'otavio',
  'zzzz-nada', '...', 'Duarte'];

function rodarTestesDaBuscaComLocalizador() {
  console.log('\nEtapa 82: o Buscar Caso sem ler a coluna inteira');

  /* ----------------------------------------------------------------------- */
  secao('B. A busca acha o mesmo que achava');

  const t = preparar();

  teste('cada termo acha no Buscar Caso o mesmo que a busca do Trabalho (Etapa 83)', () => {
    // Uma regra só para as duas buscas: o localizador na linha toda e a
    // conferência de aplicarBusca_.
    TERMOS.forEach((termo) => {
      const daBusca = t.buscar(termo).origens.find((o) => o.id === t.ret.id);
      const doTrabalho = t.chamar('resumoDoCanal')(t.ret.id, { busca: termo });
      // Sem nada achado na linha toda, o Buscar Caso volta às colunas da busca
      // (a reserva da Etapa 82) — é ali que os dois podem diferir.
      if (doTrabalho.total) igual(daBusca.casos.length, Math.min(doTrabalho.total, 100), termo);
    });
  });

  teste('desligado na CONFIG, cada termo acha o que achava antes da Etapa 83', () => {
    t.chave('NAO');
    try {
      igual(t.buscar('RET-2026-0007').total, 1);
      igual(t.buscar('jose angelo').total, 2);
      igual(t.buscar('zzzz-nada').total, 0);
    } finally {
      t.chave('SIM');
    }
  });

  teste('o resultado é o esperado: protocolo, nome sem acento, CPF com máscara, SUSEP', () => {
    const contar = (termo) => t.buscar(termo).total;
    igual(contar('RET-2026-0007'), 1);
    igual(contar('jose angelo'), 2, 'sem acento e sem caixa, os dois');
    igual(contar('123.456.789-01'), 2, 'a RET e a Mesa');
    igual(t.buscar('ret 00 k').origens.find((o) => o.id === t.mesa.id).casos.length, 1,
      'na Mesa, a SUSEP escrita de outro jeito');
    igual(contar('zzzz-nada'), 0);
    igual(t.buscar('Cliente').origens.find((o) => o.id === t.ret.id).casos.length, 60);
  });

  /* ----------------------------------------------------------------------- */
  secao('B. Lendo um punhado de células');

  teste('achou: lê só as linhas candidatas, e não as colunas inteiras', () => {
    const ligado = t.medir(() => t.buscar('RET-2026-0007'));
    t.chave('NAO');
    let desligado;
    try { desligado = t.medir(() => t.buscar('RET-2026-0007')); } finally { t.chave('SIM'); }
    verdadeiro(ligado.buscas > 0, 'o localizador foi usado');
    verdadeiro(ligado.celulas * 5 < desligado.celulas,
      'ligado leu ' + ligado.celulas + ' células; desligado, ' + desligado.celulas);
  });

  teste('"nada encontrado" nunca depende só do localizador: aí as colunas são lidas', () => {
    const nada = t.medir(() => t.buscar('zzzz-nada'));
    verdadeiro(nada.celulas >= 62, 'leu as colunas: ' + nada.celulas + ' células');
  });

  teste('o localizador cego (célula que ele não vê) não esconde o caso', () => {
    t.ambiente.localizadorCego = true;
    try {
      igual(t.buscar('RET-2026-0007').total, 1, 'sem candidata nenhuma, as colunas são lidas');
      igual(t.buscar('jose angelo').total, 2);
    } finally {
      t.ambiente.localizadorCego = false;
    }
  });

  teste('o localizador torto não traz caso errado: a conferência de sempre separa', () => {
    t.ambiente.localizadorTorto = true;
    try {
      const achados = t.buscar('RET-2026-0007');
      const daRet = achados.origens.find((o) => o.id === t.ret.id);
      verdadeiro(daRet.casos.length <= 1, 'nada além do caso certo');
      daRet.casos.forEach((c) => verdadeiro(JSON.stringify(c).indexOf('0007') >= 0, 'é o caso certo'));
    } finally {
      t.ambiente.localizadorTorto = false;
    }
  });

  teste('coluna de data na busca é lida inteira; identificador sem dígito não procura', () => {
    const candidatas = t.chamar('candidatasDaBuscaNoCanal_')(t.ret, [
      { cabecalho: 'protocolo', tipo: 'identificador' },
      { cabecalho: COLUNA, tipo: 'data' },
      { cabecalho: 'nome do cliente', tipo: 'texto' }
    ], 'Cliente 7');
    igual(candidatas[1], null, 'a data mostra outro texto: lê a coluna');
    igual(candidatas[0].length, 6, 'o "7" do termo é dígito: 0007, 0017 … 0057 são candidatos');
    verdadeiro(candidatas[2].length >= 1);
    const semDigito = t.chamar('candidatasDaBuscaNoCanal_')(t.ret, [
      { cabecalho: 'protocolo', tipo: 'identificador' },
      { cabecalho: 'nome do cliente', tipo: 'texto' }
    ], 'Conceição');
    igual(JSON.stringify(semDigito[0]), '[]', 'sem dígito, o identificador nem é procurado');
  });

  teste('desligado na CONFIG, volta à leitura das colunas', () => {
    t.chave('NAO');
    try {
      const desligado = t.medir(() => t.buscar('RET-2026-0007'));
      igual(desligado.buscas, 0, 'o localizador não foi chamado');
      igual(desligado.resultado.total, 1);
    } finally {
      t.chave('SIM');
    }
  });

  /* ----------------------------------------------------------------------- */
  secao('Etapa 83: a marcação procura na linha toda da base do canal');

  const e = preparar();
  e.chamar('inserirVariosRegistros_')('BASE_MESA', [
    { 'Nome do segurado': 'Segurado Mesa', 'Título do e-mail': 'Endosso urgente da Prestamista' }]);
  e.chamar('inserirVariosRegistros_')('BASE_RET', [
    { [COLUNA]: hoje(), status: 'Pendente', 'nome do cliente': 'Cliente Telefone',
      'telefones de contato': '(11) 98888-7777', 'e-mail': 'cliente.unico@exemplo.com' }]);

  teste('Mesa: o título do e-mail (fora das colunas da busca) é achado', () => {
    const daMesa = e.buscar('endosso urgente').origens.find((o) => o.id === e.mesa.id);
    igual(daMesa.casos.length, 1);
  });

  teste('RET: o telefone e o e-mail são achados', () => {
    const contar = (termo) => e.buscar(termo).origens.find((o) => o.id === e.ret.id).casos.length;
    igual(contar('98888-7777'), 1, 'telefone com máscara');
    igual(contar('cliente.unico'), 1, 'e-mail');
  });

  teste('cada marcação procura só na base do próprio canal', () => {
    const achados = e.chamar('buscarCasos')('endosso urgente', [e.ret.id], false, false);
    igual(achados.origens.length, 1);
    igual(achados.origens[0].id, e.ret.id);
    igual(achados.total, 0, 'o título é da Mesa: marcando só a RET, não volta');
  });

  teste('o caso ocultado continua fora, e a tela diz a base de cada marcação', () => {
    const caso = e.chamar('lerRegistros_')('BASE_RET').find((r) => r['nome do cliente'] === 'Cliente Telefone');
    e.chamar('atualizarRegistro_')('BASE_RET', caso.__id, { _Visivel: 'NAO' });
    igual(e.buscar('98888-7777').total, 0);
    const opcoes = e.chamar('opcoesDaBusca()');
    igual(opcoes.canais.find((c) => c.id === e.ret.id).aba, 'BASE_RET');
    verdadeiro(require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'Front-End', 'BuscarCaso.html'), 'utf8')
      .indexOf("'<em>procura em todas as colunas de ' + escapar(canal.aba || canal.nome)") >= 0);
  });

  teste('mais de 100 achados: vêm os 100 mais recentes, com o aviso', () => {
    const g = preparar();
    const lote = [];
    for (let i = 1; i <= 120; i++) {
      lote.push({ [COLUNA]: hoje(), status: 'Pendente', 'nome do cliente': 'Lote Grande ' + i,
        protocolo: 'LG-' + String(i).padStart(4, '0') });
    }
    g.chamar('inserirVariosRegistros_')('BASE_RET', lote);
    const daRet = g.buscar('Lote Grande').origens.find((o) => o.id === g.ret.id);
    igual(daRet.casos.length, 100);
    verdadeiro(daRet.aviso.indexOf('achou 120 casos e mostra os 100 mais recentes') >= 0, daRet.aviso);
    const texto = JSON.stringify(daRet.casos);
    verdadeiro(texto.indexOf('Lote Grande 120') >= 0 && texto.indexOf('Lote Grande 21"') >= 0, 'os mais recentes');
    verdadeiro(texto.indexOf('Lote Grande 20"') < 0, 'os 20 mais antigos ficam de fora');
  });

  teste('termo em centenas de linhas: lê das mais recentes e para nos 100', () => {
    const g = preparar();
    const lote = [];
    for (let i = 1; i <= 400; i++) {
      lote.push({ [COLUNA]: hoje(), status: 'Pendente', 'nome do cliente': 'Muitos ' + i,
        analista: 'Analista Repetido' });
    }
    g.chamar('inserirVariosRegistros_')('BASE_RET', lote);
    const medida = g.medir(() => g.buscar('Analista Repetido'));
    const daRet = medida.resultado.origens.find((o) => o.id === g.ret.id);
    igual(daRet.casos.length, 100);
    verdadeiro(JSON.stringify(daRet.casos).indexOf('Muitos 400') >= 0, 'o mais recente veio');
    verdadeiro(daRet.aviso.indexOf('O termo aparece em 400 linhas') >= 0, daRet.aviso);
    const largura = g.chamar('estruturaDaAba_')('BASE_RET').cabecalhos.length;
    verdadeiro(medida.celulas < 300 * largura, 'leu ' + medida.celulas + ' células, menos que as 400 linhas');
  });

  teste('o lote que não basta (ocultos entre os recentes) puxa o lote anterior', () => {
    const g = preparar();
    const lote = [];
    for (let i = 1; i <= 200; i++) {
      // Os 120 mais recentes estão ocultos: o primeiro lote (150) só traz 30.
      lote.push({ [COLUNA]: hoje(), status: 'Pendente', 'nome do cliente': 'Escondido ' + i,
        _Visivel: i > 80 ? 'NAO' : 'SIM' });
    }
    g.chamar('inserirVariosRegistros_')('BASE_RET', lote);
    const daRet = g.buscar('Escondido').origens.find((o) => o.id === g.ret.id);
    igual(daRet.casos.length, 80, 'os 80 visíveis, de dois lotes');
  });

  /* ----------------------------------------------------------------------- */
  secao('A. O histórico lê as linhas achadas em blocos');

  const h = preparar();
  const velhos = [];
  for (let i = 1; i <= 30; i++) {
    velhos.push({ [COLUNA]: haMeses(15), status: 'Retido', 'nome do cliente': 'Velho fechado ' + i,
      protocolo: 'RET-2025-' + String(i).padStart(4, '0') });
  }
  h.chamar('inserirVariosRegistros_')('BASE_RET', velhos);
  h.idDoHistorico = h.ambiente.criarPlanilhaExterna({});
  h.chamar('salvarHistoricoDaBase')(h.idDoHistorico);
  h.chamar('arquivarBaseAgora()');

  teste('os 30 arquivados voltam, todos, do histórico', () => {
    const achados = h.buscar('Velho fechado', true);
    const historico = achados.origens.find((o) => o.tipo === 'historico');
    igual(historico.casos.length, 30);
    igual(historico.somenteLeitura, true);
  });

  teste('trinta linhas achadas não são trinta idas à planilha de fora', () => {
    const com = h.medir(() => h.buscar('Velho fechado', true));
    const sem = h.medir(() => h.buscar('Velho fechado', false));
    const doHistorico = com.idas - sem.idas;
    verdadeiro(doHistorico < 15, 'o histórico custou ' + doHistorico + ' idas (eram 30 só nas linhas)');
  });
}

module.exports = { rodarTestesDaBuscaComLocalizador };
