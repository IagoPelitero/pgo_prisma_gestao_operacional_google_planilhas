/**
 * ============================================================================
 * PGO — testes-limpar-filtros.js · a abertura no dia 1 e o "Limpar" (Etapa 56)
 * ============================================================================
 * Dois pedidos do PO:
 *
 *   "Notei que os filtros não possuem a limpeza para deixá-los em seu estado
 *   inicial. Crie para todos." — e, perguntado onde: "todas as abas que
 *   possuírem filtros devem ter a função de limpar".
 *
 *   "No filtro de/para, o de deve sempre iniciar no dia 01 de cada mês e o
 *   para deve sempre ser o dia que estamos." — "quero abrir o sistema e ele
 *   já estar no dia 01 do mês trazendo até o dia atual".
 *
 * O "estado inicial" de cada tela é o que ela mostra ao abrir. Por isso o
 * Limpar do Trabalho e da Produtividade volta também o PERÍODO — e o período
 * de abertura é o do dia 1 até hoje.
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro, contem, lerPeca, pecaRodando } =
  require('./ferramentas');

const comZero = (n) => (n < 10 ? '0' : '') + n;
const comoSeEscreve = (data) => comZero(data.getDate()) + '/' + comZero(data.getMonth() + 1)
  + '/' + data.getFullYear();

/** O trecho da tela entre um marcador e o fim do bloco de clique dele. */
function blocoDoClique(tela, id) {
  const inicio = tela.indexOf("addEventListener('click'", tela.indexOf("elemento('" + id + "')"));
  verdadeiro(tela.indexOf("elemento('" + id + "')") >= 0 && inicio >= 0, 'a tela liga o clique de #' + id);
  // O ouvinte fecha na mesma indentação da linha em que abriu; um forEach
  // dentro dele fecha mais para dentro.
  const comecoDaLinha = tela.lastIndexOf('\n', inicio) + 1;
  const recuo = /^ */.exec(tela.substring(comecoDaLinha))[0];
  return tela.substring(inicio, tela.indexOf('\n' + recuo + '});', inicio));
}

function rodarTestesDoLimparFiltros() {
  console.log('\nEtapa 56: o período abre no dia 1 e todo filtro tem "Limpar"');

  const hoje = new Date();
  const dia1 = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  /* ----------------------------------------------------------------------- */
  secao('A abertura: do dia 1 do mês até hoje');

  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  const ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  const abertura = { tipo: 'intervalo', de: '', ate: '' };

  teste('o servidor resolve a abertura do dia 1 até hoje, e marca que é a abertura', () => {
    const periodo = t.chamar('resolverPeriodo_')(abertura);
    igual(comoSeEscreve(periodo.de) + '|' + comoSeEscreve(periodo.ate),
      comoSeEscreve(dia1) + '|' + comoSeEscreve(hoje));
    igual(periodo.dias, hoje.getDate(), 'o dia 1 e hoje entram');
    igual(periodo.abertura, true, 'o caso sem data continua aparecendo na abertura');
    contem(periodo.rotulo, 'de ' + comoSeEscreve(dia1) + ' a ' + comoSeEscreve(hoje));
  });

  teste('o tamanho não depende da hora: as duas pontas são à meia-noite', () => {
    const periodo = t.chamar('resolverPeriodo_')(abertura);
    igual(periodo.ate.getHours() + ':' + periodo.ate.getMinutes(), '0:0');
    igual(periodo.de.getHours() + ':' + periodo.de.getMinutes(), '0:0');
  });

  teste('a comparação dos cartões segue como era: o mesmo tamanho, logo antes do dia 1', () => {
    const periodo = t.chamar('resolverPeriodo_')(abertura);
    const antes = t.chamar('periodoAnterior_')(periodo);
    const vespera = new Date(dia1.getFullYear(), dia1.getMonth(), 0);
    igual(comoSeEscreve(antes.ate), comoSeEscreve(vespera), 'termina na véspera do dia 1');
    igual(t.chamar('diasEntre_')(antes.de, antes.ate), periodo.dias, 'do mesmo tamanho');
  });

  teste('o Trabalho e a Produtividade abrem com essas datas', () => {
    const trabalho = t.chamar('resumoDoCanal')(ret.id, {}, abertura);
    igual(trabalho.periodo.de + '|' + trabalho.periodo.ate, comoSeEscreve(dia1) + '|' + comoSeEscreve(hoje));
    const produtividade = t.chamar('produtividadeDaEquipe')(ret.id, {}, abertura);
    igual(produtividade.periodo.de + '|' + produtividade.periodo.ate,
      comoSeEscreve(dia1) + '|' + comoSeEscreve(hoje));
  });

  teste('na abertura: o caso de hoje entra, o do mês passado não, e o sem data continua', () => {
    const mesPassado = new Date(dia1.getFullYear(), dia1.getMonth() - 1, 15);
    t.chamar('inserirVariosRegistros_')('BASE_RET', [
      { 'data de recepção do protocolo': hoje, status: 'Pendente', 'nome do cliente': 'Caso de hoje' },
      { 'data de recepção do protocolo': mesPassado, status: 'Pendente', 'nome do cliente': 'Caso do mês passado' },
      { status: 'Pendente', 'nome do cliente': 'Caso sem data' }
    ]);
    const fila = JSON.stringify(t.chamar('resumoDoCanal')(ret.id, {}, abertura, 'todos'));
    contem(fila, 'Caso de hoje');
    contem(fila, 'Caso sem data');
    verdadeiro(fila.indexOf('Caso do mês passado') < 0, 'o do mês passado fica fora');
  });

  teste('de "Por mês" para "Por data", a tela volta para a abertura', () => {
    const periodo = pecaRodando('SeletorDePeriodo').SeletorDePeriodo;
    const como = { getAttribute: () => 'como', value: 'intervalo' };
    const novo = periodo.mudou(como, { periodo: { tipo: 'mes', mes: '2026-09' } });
    igual(novo.de + '|' + novo.ate, '|', 'sem datas: quem resolve é o servidor');
  });

  /* ----------------------------------------------------------------------- */
  secao('O "Limpar filtros", em toda tela que filtra');

  teste('é uma peça só, na Moldura', () => {
    const comuns = lerPeca('Comuns');
    contem(comuns, 'function botaoLimparFiltros(id)');
    contem(comuns, "'Limpar filtros</button>'");
    contem(comuns, 'botaoLimparFiltros: botaoLimparFiltros,');
  });

  const telas = [
    ['Trabalho', 'limpar-filtros'],
    ['Produtividade', 'limpar-filtros-da-produtividade'],
    ['TabelaCorretoras', 'limpar-filtros-corretoras'],
    ['TabelaCorretoras', 'limpar-filtros-bloqueadas'],
    ['BuscarCaso', 'limpar-filtros-da-busca']
  ];

  teste('Trabalho, Produtividade, as duas abas da Tabela Corretoras e o Buscar Caso têm o botão', () => {
    telas.forEach(([nome, id]) => {
      contem(lerPeca(nome), "Moldura.botaoLimparFiltros('" + id + "')", nome + ' desenha #' + id);
    });
  });

  teste('o botão fica sempre na tela — não espera haver filtro', () => {
    const trabalho = lerPeca('Trabalho');
    verdadeiro(trabalho.indexOf('algumAtivo') < 0, 'o Trabalho não esconde mais o botão');
  });

  teste('Trabalho: limpa busca, cartão e listas, e volta o período da abertura', () => {
    const bloco = blocoDoClique(lerPeca('Trabalho'), 'limpar-filtros');
    contem(bloco, 'filtrosEscolhidos = {};');
    contem(bloco, 'periodo = SeletorDePeriodo.padrao();');
    contem(bloco, 'carregar();');
    verdadeiro(bloco.indexOf('quantosNaFila') < 0, 'o "Mostrar" não é filtro e fica');
  });

  teste('Produtividade: período, listas e, nos Atendidos da Mesa, Todos e Total', () => {
    const bloco = blocoDoClique(lerPeca('Produtividade'), 'limpar-filtros-da-produtividade');
    contem(bloco, 'filtros = {};');
    contem(bloco, 'periodo = SeletorDePeriodo.padrao();');
    contem(bloco, "origemDosAtendidos = 'todos';");
    contem(bloco, "ramoDosAtendidos = 'total';");
    verdadeiro(bloco.indexOf('abaDaMesa') < 0, 'a aba (Equipe ou Atendidos) fica onde está');
  });

  teste('Tabela Corretoras: a busca e o segmento; e, nas bloqueadas, a busca', () => {
    const tela = lerPeca('TabelaCorretoras');
    const corretoras = blocoDoClique(tela, 'limpar-filtros-corretoras');
    contem(corretoras, "procurar = '';");
    contem(corretoras, "segmento = '';");
    contem(blocoDoClique(tela, 'limpar-filtros-bloqueadas'), "procurarBloqueada = '';");
  });

  teste('Buscar Caso: o termo, todos os canais marcados, a base legada desmarcada e sem resultado', () => {
    const bloco = blocoDoClique(lerPeca('BuscarCaso'), 'limpar-filtros-da-busca');
    contem(bloco, "elemento('termo-da-busca').value = '';");
    contem(bloco, 'canaisEscolhidas[canal.id] = true;');
    contem(bloco, 'incluirLegado = false;');
    contem(bloco, "elemento('resultado-da-busca').innerHTML = '';");
  });

  teste('o botão do Buscar Caso não envia o formulário', () => {
    contem(lerPeca('Comuns'), '<button type="button" class="limpar-filtros"');
  });
}

module.exports = { rodarTestesDoLimparFiltros };
