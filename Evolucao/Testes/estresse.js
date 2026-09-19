/**
 * ============================================================================
 * PGO — estresse.js · o sistema com volume de operação de verdade
 * ============================================================================
 *   node Evolucao/Testes/estresse.js            (padrão: até 50 mil casos)
 *   node Evolucao/Testes/estresse.js 200000     (o volume que a RET terá)
 *
 * ---------------------------------------------------------------------------
 * O QUE ESTE TESTE MEDE, E POR QUÊ NÃO É O RELÓGIO
 * ---------------------------------------------------------------------------
 * No Apps Script o que custa não é a conta em JavaScript: é cada IDA ao
 * serviço de planilha e ao de propriedades. Uma ida dessas leva dezenas de
 * milissegundos, e a execução inteira tem SEIS MINUTOS de teto. Medir o
 * relógio do Node não diz nada sobre isso, porque o Node não paga o pedágio.
 *
 * Então o que se mede aqui é:
 *
 *   IDAS AO SERVIÇO   quantas vezes a operação atravessa a fronteira. É o que
 *                     determina se ela cabe nos seis minutos.
 *   CÉLULAS LIDAS     quanto trafega. Uma leitura de 7,8 milhões de células
 *                     não cabe na memória de uma execução.
 *   CÉLULAS DA GRADE  quanto do teto de 10 milhões da planilha já foi.
 *
 * A conversão para tempo real usa uma régua conservadora — ver ORCAMENTO.
 * Ela não é exata, e não precisa ser: serve para dizer "isto cabe com folga",
 * "isto é apertado" ou "isto não cabe".
 * ============================================================================
 */

const { carregar } = require('./ferramentas');
const { medidor } = require('./simulador');

/**
 * A régua. Números conservadores, medidos pela comunidade do Apps Script e
 * arredondados para cima: é melhor o teste dizer "apertado" numa coisa que
 * passa do que "cabe" numa que estoura.
 */
const ORCAMENTO = {
  msPorIdaAoServico: 25,      // getValues/setValues: ida e volta pela fronteira
  msPorMilhaoDeCelulas: 900,  // o custo de transferir o conteúdo
  msPorPropriedade: 12,       // PropertiesService, por leitura ou gravação
  tetoDaExecucao: 6 * 60 * 1000,
  tetoDeCelulas: 10000000
};

function tempoEstimado(r) {
  return Math.round(
    (r.idasParaLer + r.idasParaGravar) * ORCAMENTO.msPorIdaAoServico
    + ((r.celulasLidas + r.celulasGravadas) / 1e6) * ORCAMENTO.msPorMilhaoDeCelulas
    + (r.propriedadesLidas + r.propriedadesGravadas) * ORCAMENTO.msPorPropriedade);
}

function comoTempo(ms) {
  if (ms < 1000) return ms + ' ms';
  if (ms < 60000) return (ms / 1000).toFixed(1) + ' s';
  return (ms / 60000).toFixed(1) + ' min';
}

function comoNumero(n) {
  return Number(n).toLocaleString('pt-BR');
}

/* -------------------------------------------------------------- o placar -- */

const resultados = [];

/**
 * Roda uma operação medindo o que ela custa, e guarda o veredito.
 *
 * `limite` é a fração do teto de execução que a operação pode ocupar. Uma
 * tela que a pessoa abre e espera pode usar mais; uma que roda dentro de
 * outra coisa, menos.
 */
function medir(nome, limite, oQueFazer) {
  medidor.zerar();
  const relogio = Date.now();
  let saida = null;
  let estourou = null;
  try {
    saida = oQueFazer();
  } catch (erro) {
    estourou = erro.message;
  }
  const noNode = Date.now() - relogio;
  const r = medidor.retrato();
  const estimado = tempoEstimado(r);
  const teto = ORCAMENTO.tetoDaExecucao * limite;

  resultados.push({
    nome: nome,
    idas: r.idasNoTotal,
    celulas: r.celulasLidas + r.celulasGravadas,
    estimado: estimado,
    teto: teto,
    noNode: noNode,
    estourou: estourou,
    veredito: estourou ? 'ESTOUROU'
      : estimado > teto ? 'NÃO CABE'
        : estimado > teto * 0.6 ? 'apertado' : 'ok',
    saida: saida
  });
  return saida;
}

function imprimirPlacar() {
  console.log('\n' + '-'.repeat(94));
  console.log('OPERAÇÃO'.padEnd(42) + 'IDAS'.padStart(8) + 'CÉLULAS'.padStart(12)
    + 'TEMPO EST.'.padStart(12) + 'LIMITE'.padStart(10) + '   VEREDITO');
  console.log('-'.repeat(94));
  resultados.forEach((r) => {
    console.log(r.nome.padEnd(42)
      + comoNumero(r.idas).padStart(8)
      + comoNumero(r.celulas).padStart(12)
      + comoTempo(r.estimado).padStart(12)
      + comoTempo(r.teto).padStart(10)
      + '   ' + r.veredito
      + (r.estourou ? '  → ' + r.estourou.slice(0, 60) : ''));
  });
  console.log('-'.repeat(94));
}

/* ------------------------------------------------------------ a massa ----- */

const SITUACOES = ['Aguardando transmissão', 'Pendente', '1º contato realizado',
  '2º contato realizado', 'Não trabalhado', 'Concluído'];
// Os valores TÊM de ser os do catálogo: o cadastro recusa o que não está na
// lista, e um teste de estresse com dado que o sistema recusaria não mede
// nada. Vieram de chamar('formularioDoCanal'), não de memória.
const CORRETORAS = ['E-mail', 'Chat', 'Telefone', 'Site', 'Corretora', 'Ouvidoria', 'URA'];
const PRODUTOS = ['Vida Individual', 'Vida em Grupo', 'Prestamista', 'Acidentes'];
const ANALISTAS = ['Ana Martins', 'Bruno Dias', 'Carla Souza', 'Diego Castilho',
  'Elisa Prado', 'Fábio Nunes', 'Gisele Antunes', 'Hugo Barros'];

/** Datas espalhadas nos últimos N dias, para a janela da fila ter o que cortar. */
function dataDeDiasAtras(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return ('0' + d.getDate()).slice(-2) + '/'
    + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
}

function casoDaRet(i) {
  return {
    'data de recepção do protocolo': dataDeDiasAtras(i % 400),
    'analista': ANALISTAS[i % ANALISTAS.length],
    'SUSEP': String(1000000 + (i % 900)),
    'segmento': i % 7 === 0 ? 'Diamante' : 'Demais corretoras',
    'número da proposta': String(70000000 + i),
    'nome do cliente': 'Cliente ' + i,
    'produto': PRODUTOS[i % PRODUTOS.length],
    'canal': CORRETORAS[i % CORRETORAS.length],
    'status': SITUACOES[i % SITUACOES.length],
    'protocolo': 'RET-2026-' + (100000 + i),
    'valor do prêmio retido': (i % 900) * 13.7,
    'CPF': String(10000000000 + i)
  };
}

/* ------------------------------------------------------------ a corrida --- */

function rodar(alvo) {
  console.log('\n' + '='.repeat(94));
  console.log('TESTE DE ESTRESSE — ' + comoNumero(alvo) + ' casos na RET');
  console.log('='.repeat(94));
  console.log('Régua: ' + ORCAMENTO.msPorIdaAoServico + ' ms por ida ao serviço, '
    + ORCAMENTO.msPorMilhaoDeCelulas + ' ms por milhão de células, '
    + ORCAMENTO.msPorPropriedade + ' ms por propriedade.');
  console.log('Teto de uma execução do Apps Script: 6 minutos.');

  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');
  const ret = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');

  // Os analistas precisam existir: o campo "analista" é um seletor cujas
  // opções são as pessoas cadastradas, e cadastrar um caso com um nome que
  // não está na lista é recusado — como tem de ser.
  const nivelOperacao = chamar('lerRegistros_("CATALOGO")')
    .find((i) => String(i.Tipo) === 'NIVEL_ACESSO' && i.Nome === 'Operação');
  chamar('inserirVariosRegistros_')('USUARIOS', ANALISTAS.map((nome, i) => ({
    Nome: nome,
    Email: nome.toLowerCase().replace(/[^a-z]/g, '.') + '@exemplo.com',
    NivelAcessoId: nivelOperacao.Id,
    'Canal que atende': CORRETORAS[i % CORRETORAS.length],
    Ativo: true
  })));

  /* -- carga ------------------------------------------------------------- */
  console.log('\nCarregando ' + comoNumero(alvo) + ' casos…');
  const carga = Date.now();
  const LOTE = 5000;
  for (let feito = 0; feito < alvo; feito += LOTE) {
    const lote = [];
    for (let i = feito; i < Math.min(feito + LOTE, alvo); i++) lote.push(casoDaRet(i));
    if (feito === 0) {
      // O primeiro lote é medido: é o custo de uma importação de verdade.
      medir('Gravar ' + comoNumero(lote.length) + ' casos de uma vez', 1,
        () => chamar('inserirVariosRegistros_')('BASE_RET', lote));
    } else {
      chamar('inserirVariosRegistros_')('BASE_RET', lote);
    }
    process.stdout.write('\r  ' + comoNumero(Math.min(feito + LOTE, alvo)) + '…   ');
  }
  console.log('\r  pronto em ' + comoTempo(Date.now() - carga) + '            ');

  /* -- as telas ---------------------------------------------------------- */
  medir('Dashboard: abrir a RET', 0.5,
    () => chamar('resumoDoCanal')(ret.id, {}));

  medir('Dashboard: filtrar por situação', 0.5,
    () => chamar('resumoDoCanal')(ret.id, { status: 'Pendente' }));

  medir('Buscar: por protocolo (só dígitos)', 0.5,
    () => chamar('buscarCasos')('RET-2026-100777', [], false));

  medir('Buscar: por nome do cliente', 0.5,
    () => chamar('buscarCasos')('Cliente 4242', [], false));

  medir('Buscar: termo que não existe', 0.5,
    () => chamar('buscarCasos')('zzzzznaoexiste', [], false));

  // O pior caso da busca: um termo que casa com MUITA coisa e bate no teto de
  // 100 resultados. Antes de agrupar as leituras, eram cem idas ao serviço.
  medir('Buscar: termo que casa com milhares', 0.5,
    () => chamar('buscarCasos')('Cliente', [], false));

  medir('Painel Analítico: os 6 gráficos', 0.5,
    () => chamar('painelAnalitico')(ret.id, {}, 30));

  medir('Minha Performance: 30 dias', 0.5,
    () => chamar('minhaPerformance')(ret.id, 30));

  medir('Tabela de Corretoras', 0.5,
    () => chamar('tabelaDeCorretoras')('', ''));

  medir('Cadastrar UM caso', 0.25,
    () => chamar('cadastrarCaso')(ret.id, casoDaRet(0)));

  medir('Barra superior: data do último registro', 0.1,
    () => chamar('dataDoUltimoRegistro_()'));

  /* -- o diagnóstico e a análise ------------------------------------------ */
  medir('Diagnóstico completo', 1,
    () => chamar('diagnosticoRECC()'));

  const analise = chamar('lerRegistros_("ANALISES")')
    .find((a) => String(a.Nome) === 'RET');
  chamar('atualizarRegistro_')('ANALISES', analise.Id, { Dias: 0 });
  chamar('definirSenhaDeAdministrador')('segredo123', '');
  chamar('liberarComSenha')('segredo123');
  medir('Gerar ANALISE_RET (tudo)', 1,
    () => chamar('gerarAnalise')(analise.Id));

  /* -- a importação no teto ----------------------------------------------- */
  const linhasColadas = [];
  for (let i = 0; i < 2000; i++) {
    linhasColadas.push((5000000 + i) + ';Corretora ' + i + ';Corretora;Diamante');
  }
  const colado = linhasColadas.join('\n');
  medir('Importar: conferir 2.000 corretoras', 1,
    () => chamar('conferirImportacao')('corretoras', colado));
  chamar('liberarComSenha')('segredo123');
  medir('Importar: aplicar 2.000 corretoras', 1,
    () => chamar('aplicarImportacao')('corretoras', colado));

  /* -- dois salvando no mesmo segundo ------------------------------------- */
  // A trava é o que impede dois cadastros simultâneos de receberem o mesmo Id.
  // Foi assim que o sistema anterior colidiu 4.328 identificadores.
  medir('Dez cadastros em sequência imediata', 0.5, function () {
    var ids = [];
    for (var i = 0; i < 10; i++) {
      ids.push(chamar('cadastrarCaso')(ret.id, casoDaRet(i)).id);
    }
    var unicos = {};
    ids.forEach(function (id) { unicos[id] = true; });
    if (Object.keys(unicos).length !== ids.length) {
      throw new Error('Id repetido entre cadastros seguidos: ' + ids.join(', '));
    }
    return ids;
  });

  /* -- dado sujo, digitado direto na planilha ------------------------------ */
  // Linha sem Id, data como texto solto, dinheiro com vírgula, coluna de
  // controle em branco: é o que acontece quando alguém edita a aba na mão.
  const aba = ambiente.planilha.getSheetByName('BASE_RET');
  const linhaSuja = aba.getMaxRows();
  aba.getRange(linhaSuja, 2, 1, 4).setValues([['não é data', 'Ana Martins',
    'SUSEP inválida', 'Diamante']]);

  medir('Dashboard com linha suja na base', 0.5,
    () => chamar('resumoDoCanal')(ret.id, {}));
  medir('Buscar com linha suja na base', 0.5,
    () => chamar('buscarCasos')('Ana Martins', [], false));
  const laudoComSujeira = medir('Diagnóstico com linha suja na base', 1,
    () => chamar('diagnosticoRECC()'));

  console.log('\nO QUE O DIAGNÓSTICO VIU NESTE VOLUME');
  laudoComSujeira.blocos.forEach(function (bloco) {
    if (bloco.situacao === 'ok') return;
    console.log('  [' + bloco.situacao.toUpperCase() + '] ' + bloco.titulo);
    bloco.itens.filter(function (i) { return i.situacao !== 'ok'; })
      .forEach(function (i) { console.log('      ' + i.oQue); });
  });
  if (laudoComSujeira.aprovado) {
    console.log('  (nenhuma falha — o diagnóstico aprovou a base suja)');
  }

  /* -- o orçamento de células --------------------------------------------- */
  const orcamento = chamar('orcamentoDeCelulas_')(ambiente.planilha);
  imprimirPlacar();

  console.log('\nO ESPAÇO — o limite que não é tempo');
  console.log('  grade da planilha: ' + comoNumero(orcamento.usadas) + ' de '
    + comoNumero(ORCAMENTO.tetoDeCelulas) + ' células ('
    + orcamento.percentual + '% do teto)');
  ambiente.planilha.getSheets()
    .map((a) => ({ nome: a.getName(), celulas: a.getMaxRows() * a.getMaxColumns() }))
    .sort((um, outro) => outro.celulas - um.celulas)
    .slice(0, 4)
    .forEach((a) => console.log('    ' + a.nome.padEnd(22)
      + comoNumero(a.celulas).padStart(12) + '  ('
      + Math.round(a.celulas / orcamento.usadas * 100) + '% do que está em uso)'));

  const geracao = resultados.find((r) => r.nome.indexOf('Gerar ANALISE') === 0);
  if (geracao && geracao.saida && geracao.saida.truncada) {
    console.log('  a análise foi CORTADA no teto de ' + comoNumero(50000)
      + ' linhas — a aba mostra só uma parte da base');
  }

  /* -- o veredito ---------------------------------------------------------- */
  const naoCabem = resultados.filter((r) => r.veredito === 'NÃO CABE'
    || r.veredito === 'ESTOUROU');
  const apertados = resultados.filter((r) => r.veredito === 'apertado');

  console.log('');
  if (orcamento.percentual >= 80) {
    console.log('ATENÇÃO NO ESPAÇO — a grade está em ' + orcamento.percentual
      + '% do teto da planilha. O limite aqui não é tempo, é célula: no teto,');
    console.log('a planilha simplesmente para de aceitar linha nova. Ver a '
      + 'seção do espaço acima.');
    console.log('');
  }
  if (naoCabem.length) {
    console.log('REPROVADO — ' + naoCabem.length + ' operação(ões) não cabem:');
    naoCabem.forEach((r) => console.log('  ' + r.nome + ' — ' + r.veredito
      + (r.estourou ? ': ' + r.estourou : '')));
  } else if (apertados.length) {
    console.log('PASSA, com ' + apertados.length + ' operação(ões) apertada(s):');
    apertados.forEach((r) => console.log('  ' + r.nome + ' — '
      + comoTempo(r.estimado) + ' de ' + comoTempo(r.teto)));
  } else {
    console.log('APROVADO — todas as operações cabem com folga em '
      + comoNumero(alvo) + ' casos.');
  }
  console.log('');

  return naoCabem.length ? 1 : 0;
}

const alvo = Number(process.argv[2]) || 50000;
process.exitCode = rodar(alvo);
