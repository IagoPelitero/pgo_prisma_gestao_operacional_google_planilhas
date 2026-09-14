/**
 * ============================================================================
 * PGO — Performance.gs · a tela em que o analista se vê
 * ============================================================================
 * As outras telas mostram a operação. Esta mostra UMA PESSOA — e por isso o
 * cuidado aqui é de outra natureza. Um número mal escolhido no Dashboard
 * atrapalha uma decisão; um número mal escolhido aqui atrapalha alguém.
 *
 * QUATRO DECISÕES, e cada uma tem motivo:
 *
 *   1. O RANKING SEGUE O ALCANCE DO NÍVEL. Quem só enxerga os próprios casos
 *      NÃO vê uma lista com o nome dos colegas — vê a própria posição contra
 *      a MÉDIA da equipe. Mostrar a lista a quem não pode ver os casos dos
 *      outros seria uma porta dos fundos, e ainda por cima a mais constrangedora.
 *
 *   2. TODO NÚMERO VEM COM A SUA BASE. "8 casos" sozinho não diz nada; "8 de
 *      uma média de 6" diz. Comparação sem referência é o jeito mais rápido
 *      de transformar um painel em ansiedade.
 *
 *   3. O QUE NÃO DÁ PARA CALCULAR NÃO APARECE. Tempo médio exige que a mesa
 *      declare a coluna de finalização. Sem ela, o indicador some — e não
 *      aparece zerado, que pareceria um desempenho ruim.
 *
 *   4. A META É DECLARADA, NUNCA INVENTADA. Mesa sem meta em `MESAS` não
 *      ganha barra de progresso. Um alvo tirado do nada é pior que alvo
 *      nenhum: ele parece oficial.
 * ============================================================================
 */

/** Quantas pessoas o ranking mostra em volta de quem está olhando. */
const RECC_VIZINHOS_NO_RANKING = 2;

/**
 * Os números de quem está olhando, na mesa e no período escolhidos.
 */
function minhaPerformance(idDaMesa, dias) {
  var quem = exigirTela_('minhaPerformance');
  var mesa = mesaPeloId_(idDaMesa);

  var janela = Number(dias) || Number(valorDaConfiguracao_('OPERACAO.JANELA_DIAS', '30')) || 30;
  var recentes = lerRegistros_(mesa.aba, { ultimas: linhasQueOPainelOlha_() });
  // Bateu no teto de leitura: pode haver caso do período que ficou de fora.
  // Aqui isto pesa mais que nas outras telas — esta é a tela sobre UMA PESSOA,
  // e número incompleto vira julgamento errado sobre alguém.
  var truncada = recentes.length >= linhasQueOPainelOlha_();
  var noPeriodo = filtrarPeloPeriodo_(recentes, mesa, janela, 0);
  var anterior = filtrarPeloPeriodo_(recentes, mesa, janela, janela);

  var coluna = colunaDoResponsavel_(estruturaDaAba_(mesa.aba));
  var meuNome = String(quem.usuario.Nome || '');

  var meus = casosDaPessoa_(noPeriodo, coluna, meuNome);
  var meusAntes = casosDaPessoa_(anterior, coluna, meuNome);

  return {
    mesa: { id: mesa.id, nome: mesa.nome, icone: mesa.icone },
    pessoa: {
      nome: meuNome,
      cargo: quem.cargo,
      nivel: quem.nivel,
      canal: String(quem.usuario['Canal que atende'] || '')
    },
    periodo: { dias: janela, rotulo: 'últimos ' + janela + ' dias' },
    truncada: truncada,
    linhasLidas: recentes.length,
    // Sem coluna de responsável não há "meus casos", e a tela diz isso em vez
    // de mostrar zero — zero pareceria que a pessoa não trabalhou.
    temResponsavel: !!coluna,
    indicadores: indicadoresDaPessoa_(meus, meusAntes, mesa),
    meta: metaDaPessoa_(meus, mesa, janela),
    porDia: serieDoPeriodo_(meus, mesa, janela),
    porSituacao: distribuicao_(meus, mesa, mesa.colunaDoStatus, 'Situação'),
    porCanal: distribuicao_(meus, mesa, colunaDoCanal_(mesa), 'Canal'),
    equipe: comoVaiAEquipe_(noPeriodo, coluna, meuNome, quem, mesa),
    recentes: oQueEuFiz_(quem, mesa)
  };
}

/** Os casos em que a pessoa é a responsável. */
function casosDaPessoa_(registros, coluna, nome) {
  if (!coluna) return [];
  var procurado = normalizarParaComparar_(nome);
  return registros.filter(function (registro) {
    return normalizarParaComparar_(registro[coluna]) === procurado;
  });
}

/** A coluna de canal da mesa, quando ela tem uma. */
function colunaDoCanal_(mesa) {
  var estrutura = estruturaDaAba_(mesa.aba);
  var achada = '';
  estrutura.cabecalhos.forEach(function (cabecalho) {
    if (achada) return;
    if (normalizarParaComparar_(cabecalho) === 'canal') achada = cabecalho;
  });
  return achada;
}

// ============================================================================
// OS INDICADORES
// ============================================================================

/**
 * Os números da pessoa, cada um com o do período anterior ao lado.
 *
 * Todo indicador carrega a comparação: "8 casos" sozinho não diz nada, "8
 * contra 6 no período anterior" diz. E o que não dá para calcular nesta mesa
 * simplesmente não entra na lista.
 */
function indicadoresDaPessoa_(meus, meusAntes, mesa) {
  var lista = [];

  lista.push(indicador_('trabalhados', 'Casos trabalhados',
    meus.length, meusAntes.length, 'casos',
    'Todos os casos em que você é a pessoa responsável no período.'));

  if (mesa.colunaDoStatus) {
    var concluidos = contarConcluidos_(meus, mesa);
    lista.push(indicador_('concluidos', 'Concluídos',
      concluidos, contarConcluidos_(meusAntes, mesa), 'casos',
      'Casos que chegaram a uma situação de conclusão.'));

    lista.push(indicador_('emAberto', 'Ainda em aberto',
      meus.length - concluidos, meusAntes.length - contarConcluidos_(meusAntes, mesa),
      'casos', 'O que continua esperando alguma tratativa sua.'));
  }

  var tempo = tempoMedioDeTratativa_(meus, mesa);
  if (tempo !== null) {
    lista.push(indicador_('tempoMedio', 'Tempo médio até concluir',
      tempo, tempoMedioDeTratativa_(meusAntes, mesa), 'dias',
      'Da entrada do caso até a finalização, nos que você concluiu.',
      // Aqui, MENOS é melhor: a tela precisa saber disso para não pintar de
      // vermelho uma queda que é boa notícia.
      true));
  }

  var naCelula = resolvidosSemEncaminhar_(meus, mesa);
  if (naCelula !== null) {
    lista.push(indicador_('naCelula', 'Resolvidos sem encaminhar',
      naCelula, resolvidosSemEncaminhar_(meusAntes, mesa), 'casos',
      'Concluídos por você, sem passar para outra área.'));
  }

  return lista;
}

function indicador_(chave, rotulo, valor, anterior, unidade, explicacao, menorEhMelhor) {
  var variacao = null;
  if (anterior > 0) {
    variacao = Math.round(((valor - anterior) / anterior) * 100);
  }
  return {
    chave: chave,
    rotulo: rotulo,
    valor: valor,
    anterior: anterior,
    // Sem base de comparação a variação fica VAZIA, e não "+100%": subir de
    // zero para um não é dobrar, e "+100%" ali é ruído que a operação aprende
    // a ignorar — junto com a variação que importa.
    variacao: variacao,
    unidade: unidade,
    explicacao: explicacao,
    menorEhMelhor: !!menorEhMelhor
  };
}

/** Uma situação conta como conclusão quando o nome dela começa com "conclu". */
function contarConcluidos_(casos, mesa) {
  if (!mesa.colunaDoStatus) return 0;
  return casos.filter(function (caso) {
    return normalizarParaComparar_(caso[mesa.colunaDoStatus]).indexOf('conclu') === 0;
  }).length;
}

/**
 * Quantos dias, em média, entre a entrada do caso e a finalização.
 *
 * Devolve null quando a mesa não declara a coluna de finalização, ou quando
 * ninguém concluiu nada no período: um "0 dias" ali pareceria um desempenho
 * excelente, e é só ausência de dado.
 */
function tempoMedioDeTratativa_(casos, mesa) {
  if (!mesa.colunaDaData || !mesa.colunaDaFinalizacao) return null;

  var soma = 0;
  var quantos = 0;
  casos.forEach(function (caso) {
    var entrada = converterParaData_(caso[mesa.colunaDaData]);
    var fim = converterParaData_(caso[mesa.colunaDaFinalizacao]);
    if (!entrada || !fim) return;
    var dias = (fim.getTime() - entrada.getTime()) / (1000 * 60 * 60 * 24);
    if (dias < 0) return;   // data invertida na planilha não vira média negativa
    soma += dias;
    quantos++;
  });

  if (!quantos) return null;
  return Math.round((soma / quantos) * 10) / 10;
}

/** Concluídos sem encaminhar para outra área. Null quando não dá para saber. */
function resolvidosSemEncaminhar_(casos, mesa) {
  return contarFinalizadosNaCelula_(casos, mesa);
}

// ============================================================================
// A META
// ============================================================================

/**
 * O progresso contra a meta da mesa, proporcional ao período escolhido.
 *
 * Devolve null quando a mesa não declarou meta. Alvo tirado do nada é pior
 * que alvo nenhum: ele parece oficial, e ninguém sabe de onde saiu.
 */
function metaDaPessoa_(meus, mesa, dias) {
  var mensal = Number(mesa.metaMensalPorPessoa) || 0;
  if (!mensal) return null;

  var alvo = Math.round((mensal / 30) * dias);
  var feito = contarConcluidos_(meus, mesa);

  return {
    alvo: alvo,
    feito: feito,
    // Passar da meta não vira 140% de barra: a barra enche e o número diz o
    // resto. Barra estourando a caixa é defeito, não conquista.
    percentual: alvo ? Math.min(Math.round((feito / alvo) * 100), 100) : 0,
    percentualReal: alvo ? Math.round((feito / alvo) * 100) : 0,
    mensal: mensal,
    rotulo: alvo + ' caso(s) em ' + dias + ' dias, na proporção da meta de '
      + mensal + ' por mês'
  };
}

// ============================================================================
// A EVOLUÇÃO E A DISTRIBUIÇÃO
// ============================================================================

/**
 * Quantos casos por dia, no formato que o desenho de gráfico já entende.
 *
 * Dia sem caso entra ZERADO, e não some: uma linha que pula os dias vazios
 * mente sobre o ritmo — dois casos em dois dias seguidos e dois casos com
 * uma semana de intervalo desenhariam a mesma linha.
 */
function serieDoPeriodo_(meus, mesa, dias) {
  if (!mesa.colunaDaData) return null;

  var porDia = {};
  meus.forEach(function (caso) {
    var data = converterParaData_(caso[mesa.colunaDaData]);
    if (!data) return;
    var chave = Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
    porDia[chave] = (porDia[chave] || 0) + 1;
  });

  var pontos = [];
  var hoje = new Date();
  // No máximo 45 colunas: acima disso a linha vira um borrão e cada ponto
  // fica menor que o dedo de quem tenta tocar nele.
  var quantos = Math.min(dias, 45);
  for (var i = quantos - 1; i >= 0; i--) {
    var dia = new Date(hoje.getTime() - i * 24 * 60 * 60 * 1000);
    var chave = Utilities.formatDate(dia, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
    pontos.push({
      chave: chave,
      rotulo: Utilities.formatDate(dia, RECC_FUSO_HORARIO, 'dd/MM'),
      valor: porDia[chave] || 0,
      casos: porDia[chave] || 0,
      tom: '',
      serie: 0
    });
  }

  return {
    titulo: 'Seus casos por dia',
    tipo: 'barrasComLinha',
    largura: 2,
    unidade: 'casos',
    agregacao: 'contagem',
    dimensao: 'Dia',
    ehTempo: true,
    pontos: pontos,
    tendencia: mediaMovel_(pontos, 7),
    aviso: ''
  };
}

/** Uma pizza dos casos da pessoa, por uma coluna qualquer. */
function distribuicao_(meus, mesa, coluna, titulo) {
  if (!coluna) return null;

  var cores = coresDoCatalogo_(mesa);
  var ordem = ordemEstavelDaDimensao_(mesa, coluna);
  var soma = {};
  var chaves = [];

  meus.forEach(function (caso) {
    var valor = String(caso[coluna] || '').trim() || 'Sem informação';
    if (!Object.prototype.hasOwnProperty.call(soma, valor)) {
      soma[valor] = 0;
      chaves.push(valor);
    }
    soma[valor]++;
  });

  var pontos = chaves.map(function (chave) {
    var normalizado = normalizarParaComparar_(chave);
    var posicao = ordem.indexOf(normalizado);
    return {
      chave: chave,
      rotulo: chave,
      valor: soma[chave],
      casos: soma[chave],
      // A mesma regra do Painel: a cor segue a entidade, e não a posição.
      tom: cores[normalizado] || '',
      serie: posicao >= 0 ? (posicao % 6) + 1 : 6
    };
  }).sort(function (um, outro) { return outro.valor - um.valor; });

  return {
    titulo: titulo, tipo: 'pizza', largura: 1, unidade: 'casos',
    agregacao: 'contagem', dimensao: titulo, ehTempo: false,
    pontos: pontos.slice(0, RECC_MAXIMO_DE_FATIAS), tendencia: null, aviso: ''
  };
}

// ============================================================================
// A EQUIPE
// ============================================================================

/**
 * Como a pessoa está em relação à equipe — e o que ela pode ver disso.
 *
 * Quem só enxerga os próprios casos NÃO recebe a lista com o nome dos
 * colegas: recebe a própria posição contra a média. Mostrar a lista a quem
 * não pode ver os casos dos outros seria uma porta dos fundos — e, ainda por
 * cima, a mais constrangedora que existe num sistema de trabalho.
 *
 * Quem pode ver recebe a lista, mas com a MÉDIA marcada: "abaixo da média"
 * sem saber qual é a média não é informação, é só desconforto.
 */
function comoVaiAEquipe_(noPeriodo, coluna, meuNome, quem, mesa) {
  if (!coluna) return { podeVerNomes: false, disponivel: false };

  var porPessoa = {};
  var nomes = [];
  noPeriodo.forEach(function (caso) {
    var nome = String(caso[coluna] || '').trim();
    if (!nome) return;
    if (!Object.prototype.hasOwnProperty.call(porPessoa, nome)) {
      porPessoa[nome] = 0;
      nomes.push(nome);
    }
    porPessoa[nome]++;
  });

  if (!nomes.length) return { podeVerNomes: false, disponivel: false };

  var lista = nomes.map(function (nome) {
    return { nome: nome, valor: porPessoa[nome],
      souEu: normalizarParaComparar_(nome) === normalizarParaComparar_(meuNome) };
  }).sort(function (um, outro) { return outro.valor - um.valor; });

  lista.forEach(function (um, i) { um.posicao = i + 1; });

  var soma = lista.reduce(function (total, um) { return total + um.valor; }, 0);
  var media = Math.round((soma / lista.length) * 10) / 10;
  var eu = lista.filter(function (um) { return um.souEu; })[0] || null;

  var podeVerNomes = quem.permissoes.escopo === RECC_ESCOPOS.TODOS
    || quem.permissoes.escopo === RECC_ESCOPOS.MESA
    || quem.permissoes.escopo === RECC_ESCOPOS.EQUIPE;

  return {
    disponivel: true,
    podeVerNomes: podeVerNomes,
    quantasPessoas: lista.length,
    media: media,
    minhaPosicao: eu ? eu.posicao : null,
    meuValor: eu ? eu.valor : 0,
    // A lista sai com os vizinhos de quem está olhando — e não do primeiro ao
    // último. Um pódio completo diz muito pouco a quem está no meio e diz
    // demais sobre quem está embaixo.
    lista: podeVerNomes ? vizinhosNoRanking_(lista, eu) : []
  };
}

function vizinhosNoRanking_(lista, eu) {
  if (!eu) return lista.slice(0, RECC_VIZINHOS_NO_RANKING * 2 + 1);

  var meu = eu.posicao - 1;
  var de = Math.max(0, meu - RECC_VIZINHOS_NO_RANKING);
  var ate = Math.min(lista.length, de + RECC_VIZINHOS_NO_RANKING * 2 + 1);
  de = Math.max(0, ate - (RECC_VIZINHOS_NO_RANKING * 2 + 1));
  return lista.slice(de, ate);
}

// ============================================================================
// O QUE EU FIZ
// ============================================================================

/**
 * As últimas ações da própria pessoa, tiradas da trilha de auditoria.
 *
 * Só as dela: a trilha completa é da tela de Configurações, para quem
 * administra. Aqui é a memória de quem está olhando.
 */
function oQueEuFiz_(quem, mesa) {
  var comoSeChama = {
    'caso.criar': 'Cadastrou um caso',
    'caso.editar': 'Alterou um caso',
    'caso.status': 'Mudou a situação',
    'caso.ocultar': 'Excluiu um caso',
    'busca': 'Procurou um caso'
  };

  var meuId = converterParaIdentificador_(quem.usuario.Id);

  return lerRegistros_('AUDITORIA', { ultimas: 400 })
    .filter(function (linha) {
      if (converterParaIdentificador_(linha.UsuarioId) !== meuId) return false;
      // Só o que é TRABALHO. Mexer numa configuração é ação de quem
      // administra, e a trilha completa dessas está em Configurações — aqui
      // é a memória de quem atende, e ela não pode virar um log de sistema.
      return Object.prototype.hasOwnProperty.call(comoSeChama, String(linha.Acao));
    })
    .reverse()
    .slice(0, 12)
    .map(function (linha) {
      return {
        acao: comoSeChama[String(linha.Acao)] || String(linha.Acao),
        detalhe: String(linha.Detalhe || ''),
        registro: String(linha.RegistroId || ''),
        entidade: String(linha.Entidade || ''),
        // O caso só abre quando é desta mesa: um Id da outra base abriria a
        // tela errada, ou nada.
        abre: normalizarParaComparar_(linha.Entidade)
          === normalizarParaComparar_(mesa.aba) && !!linha.RegistroId,
        quando: linha.DataHora
          ? Utilities.formatDate(new Date(linha.DataHora), RECC_FUSO_HORARIO,
            'dd/MM/yyyy, HH:mm')
          : ''
      };
    });
}
