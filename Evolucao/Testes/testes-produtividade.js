/**
 * ============================================================================
 * PGO — testes-analitico.js · a Etapa 8
 * ============================================================================
 * Gráfico erra de um jeito perigoso: ele parece certo. Uma conta trocada não
 * dá erro, não trava e não aparece no log — vira uma barra um pouco mais alta
 * do que devia, e alguém decide alguma coisa com base nela.
 *
 * Por isso os testes aqui conferem os NÚMEROS, e não o desenho: a mesma conta
 * alimenta a tela, a exportação e o detalhamento, então basta ela estar certa
 * uma vez.
 *
 * E conferem duas regras de leitura que são fáceis de quebrar sem perceber:
 * a cor seguir a entidade (e não a posição), e a linha do "barras com linha"
 * ser a média móvel na MESMA escala — nunca um segundo eixo.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario, lerPeca } =
  require('./ferramentas');

function rodarTestesDaProdutividade() {
  console.log('\nEtapa 8 — Produtividade RECC');

  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');

  const ret = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');
  const hoje = new Date();
  const comZero = (n) => (n < 10 ? '0' : '') + n;
  const diasAtras = (dias) => {
    const data = new Date(hoje);
    data.setDate(data.getDate() - dias);
    return comZero(data.getDate()) + '/' + comZero(data.getMonth() + 1)
      + '/' + data.getFullYear();
  };

  chamar('inserirVariosRegistros_')('BASE_RET', [
    { analista: 'Marcos Vieira', status: 'Pendente', produto: 'Prestamista',
      canal: 'E-mail', 'motivo do cancelamento': 'Portabilidade',
      'data de recepção do protocolo': diasAtras(1),
      'valor do prêmio retido': 100, 'nome do cliente': 'Um' },
    { analista: 'Marcos Vieira', status: 'Pendente', produto: 'Prestamista',
      canal: 'E-mail', 'motivo do cancelamento': 'Portabilidade',
      'data de recepção do protocolo': diasAtras(1),
      'valor do prêmio retido': 300, 'nome do cliente': 'Dois' },
    { analista: 'Patrícia Nunes', status: 'Concluído', produto: 'Vida Individual',
      canal: 'Chat', 'motivo do cancelamento': 'Coberturas',
      'data de recepção do protocolo': diasAtras(2),
      'valor do prêmio retido': 500, 'nome do cliente': 'Três' }
  ]);

  const painelDaRet = (filtros, dias) =>
    chamar('produtividadeDaEquipe')(ret.id, filtros || {}, dias || 30);
  const acharGrafico = (titulo) =>
    painelDaRet().componentes.find((c) => c.titulo.indexOf(titulo) === 0);

  secao('O painel');

  teste('o canal abre com os gráficos que ela declarou, na ordem', () => {
    const painel = painelDaRet();
    igual(painel.componentes.map((c) => c.tipo).join(' | '),
      'barrasComLinha | pizza | barrasDeitadas | barras | barras | barrasDeitadas'
      + ' | barrasComLinha | barrasDeitadas',
      'os seis de sempre, mais os dois do tombamento');
    igual(painel.total, 3);
    igual(painel.periodo.dias, 30);
  });

  teste('nada aqui está escrito em código: some o gráfico, some da tela', () => {
    const antes = painelDaRet().componentes.length;
    const lista = chamar('listarComponentesDoPainel')(ret.id);
    chamar('salvarComponentesDoPainel')(ret.id, lista.slice(0, 2));
    igual(painelDaRet().componentes.length, 2);

    chamar('salvarComponentesDoPainel')(ret.id, lista);
    igual(painelDaRet().componentes.length, antes, 'e volta inteiro');
  });

  secao('As contas');

  teste('contagem conta casos; soma soma a coluna do valor', () => {
    const porProduto = acharGrafico('Prêmio retido');
    igual(porProduto.agregacao, 'soma');
    const prestamista = porProduto.pontos.find((p) => p.rotulo === 'Prestamista');
    igual(prestamista.valor, 400, '100 + 300');
    igual(prestamista.casos, 2, 'e diz de quantos casos veio');
    igual(porProduto.unidade, 'dinheiro', 'para a tela formatar em R$');

    const porCanal = acharGrafico('Casos por canal');
    igual(porCanal.pontos.find((p) => p.rotulo === 'E-mail').valor, 2);
  });

  teste('média é média, e não soma dividida pelo total de casos', () => {
    const lista = chamar('listarComponentesDoPainel')(ret.id);
    chamar('salvarComponentesDoPainel')(ret.id, lista.concat([{
      titulo: 'Prêmio médio por produto', tipo: 'barras', dimensao: 'produto',
      agregacao: 'media', medida: 'valor do prêmio retido', limite: 0,
      largura: 1, mostrar: true
    }]));

    const medio = acharGrafico('Prêmio médio');
    igual(medio.pontos.find((p) => p.rotulo === 'Prestamista').valor, 200,
      '(100 + 300) / 2, e não dividido pelos três casos do canal');
    chamar('salvarComponentesDoPainel')(ret.id, lista);
  });

  teste('a dimensão de data agrupa por dia, e vem em ordem de tempo', () => {
    const porDia = acharGrafico('Entradas por dia');
    verdadeiro(porDia.ehTempo);
    igual(porDia.pontos.length, 2);
    igual(porDia.pontos[0].valor, 1, 'o dia mais antigo vem primeiro');
    igual(porDia.pontos[1].valor, 2);
  });

  teste('valor em branco vira "Sem informação", e não some da conta', () => {
    chamar('inserirRegistro_')('BASE_RET', {
      analista: 'Marcos Vieira', status: 'Pendente',
      'data de recepção do protocolo': diasAtras(1), 'nome do cliente': 'Sem canal'
    });
    const porCanal = acharGrafico('Casos por canal');
    verdadeiro(porCanal.pontos.some((p) => p.rotulo === 'Sem informação'),
      'sumir da conta faria os números não fecharem com o total');
    igual(porCanal.pontos.reduce((soma, p) => soma + p.casos, 0), 4);
  });

  secao('O TOP N e os "Demais valores"');

  teste('o que passa do limite vira UMA fatia, e não uma cor nova', () => {
    const lista = chamar('listarComponentesDoPainel')(ret.id);
    chamar('salvarComponentesDoPainel')(ret.id, lista.map((grafico) =>
      grafico.titulo.indexOf('Casos por canal') === 0
        ? Object.assign({}, grafico, { limite: 1 }) : grafico));

    const porCanal = acharGrafico('Casos por canal');
    igual(porCanal.pontos.length, 2, 'o primeiro, mais a fatia do resto');
    igual(porCanal.pontos[1].rotulo, 'Demais valores',
      'não "Outros": várias listas da operação já têm um item com esse nome');
    verdadeiro(porCanal.dobradosEmOutros >= 1, 'a tela diz quantos foram somados');

    // A soma tem de continuar fechando com o total.
    igual(porCanal.pontos.reduce((soma, p) => soma + p.casos, 0), 4);
    chamar('salvarComponentesDoPainel')(ret.id, lista);
  });

  teste('a pizza não passa de seis fatias, mesmo pedindo mais', () => {
    const lista = chamar('listarComponentesDoPainel')(ret.id);
    chamar('salvarComponentesDoPainel')(ret.id, lista.map((grafico) =>
      grafico.tipo === 'pizza'
        ? Object.assign({}, grafico, { limite: 20 }) : grafico));

    // Seis situações na RET, todas com caso ou não — a pizza corta em 6.
    const pizza = acharGrafico('Situação dos casos');
    verdadeiro(pizza.pontos.length <= 6,
      'acima de seis fatias a pizza vira confete, e ninguém lê');
    chamar('salvarComponentesDoPainel')(ret.id, lista);
  });

  secao('A cor');

  teste('a cor segue a entidade, e não a posição no gráfico', () => {
    // "Concluído" é verde porque o CATÁLOGO diz que é. Se a cor viesse da
    // posição, um filtro que jogasse Concluído do primeiro para o quarto
    // lugar repintaria o gráfico inteiro, e ninguém compararia duas telas.
    const antes = acharGrafico('Situação dos casos').pontos
      .find((p) => p.rotulo === 'Concluído');
    igual(antes.tom, 'bom');

    chamar('inserirVariosRegistros_')('BASE_RET', [
      { analista: 'Marcos Vieira', status: 'Concluído',
        'data de recepção do protocolo': diasAtras(1), 'nome do cliente': 'A' },
      { analista: 'Marcos Vieira', status: 'Concluído',
        'data de recepção do protocolo': diasAtras(1), 'nome do cliente': 'B' }
    ]);

    const depois = acharGrafico('Situação dos casos').pontos
      .find((p) => p.rotulo === 'Concluído');
    verdadeiro(depois.valor > antes.valor, 'ele mudou de posição no gráfico');
    igual(depois.tom, 'bom', 'e continua verde');
  });

  teste('magnitude vai num tom só, e não em seis cores', () => {
    // Seis cores para dizer "quanto de cada" enterra a informação: o olho
    // passa a comparar cores em vez de alturas.
    acharGrafico('Casos por canal').pontos.forEach((ponto) => {
      igual(ponto.tom, '', 'barra de magnitude não pinta por categoria');
      igual(ponto.serie, 0);
    });
  });

  secao('Barras com linha — um eixo só');

  teste('a linha é a média móvel da própria barra, na mesma escala', () => {
    // Dois eixos no mesmo gráfico fazem a mesma altura significar duas
    // coisas. Aqui a linha é a média dos 7 pontos anteriores das barras.
    const comLinha = acharGrafico('Entradas por dia');
    verdadeiro(Array.isArray(comLinha.tendencia));
    igual(comLinha.tendencia.length, comLinha.pontos.length);

    const media = comLinha.pontos.reduce((soma, p) => soma + p.valor, 0)
      / comLinha.pontos.length;
    igual(Math.round(comLinha.tendencia[comLinha.tendencia.length - 1].valor * 100),
      Math.round(media * 100),
      'com menos de 7 pontos, a média móvel é a média de todos eles');

    const maiorBarra = Math.max.apply(null, comLinha.pontos.map((p) => p.valor));
    const maiorLinha = Math.max.apply(null, comLinha.tendencia.map((p) => p.valor));
    verdadeiro(maiorLinha <= maiorBarra,
      'a linha nunca passa da barra: se passasse, seria outra escala');
  });

  secao('O detalhamento');

  teste('clicar num ponto devolve os casos que o formam', () => {
    const pizza = acharGrafico('Situação dos casos');
    const concluido = pizza.pontos.find((p) => p.rotulo === 'Concluído');

    const detalhe = chamar('detalharComponente')(ret.id, pizza.id,
      concluido.chave, {}, 30);
    igual(detalhe.total, concluido.casos,
      'o número do gráfico e a lista de casos saem da mesma conta');
    igual(detalhe.ponto, 'Concluído');
    verdadeiro(detalhe.colunas.length > 0, 'e vem com as colunas da fila');
  });

  teste('"Demais valores" devolve exatamente o que não está nas outras fatias', () => {
    const lista = chamar('listarComponentesDoPainel')(ret.id);
    chamar('salvarComponentesDoPainel')(ret.id, lista.map((grafico) =>
      grafico.titulo.indexOf('Casos por canal') === 0
        ? Object.assign({}, grafico, { limite: 1 }) : grafico));

    const porCanal = acharGrafico('Casos por canal');
    const resto = porCanal.pontos.find((p) => p.ehOutros);
    const detalhe = chamar('detalharComponente')(ret.id, porCanal.id,
      '__outros', {}, 30);
    igual(detalhe.total, resto.casos);
    chamar('salvarComponentesDoPainel')(ret.id, lista);
  });

  teste('coluna vazia em todos os casos vira recado, e não uma barra só', () => {
    // O estado normal de um gráfico sobre o tombamento ANTES do primeiro
    // tombamento: uma barra única chamada "Sem informação", que não diz nada e
    // parece defeito. O recado explica; o desenho, não.
    const porBase = painelDaRet().componentes.find((c) =>
      c.titulo === 'De qual base os casos vieram');
    igual(porBase.pontos.length, 0, 'nenhum ponto para desenhar');
    contem(porBase.aviso, 'não há o que agrupar');
    contem(porBase.aviso, 'Origem do tombamento', 'e diz qual coluna está vazia');
  });

  teste('basta UM caso com a coluna preenchida para o gráfico voltar', () => {
    // A regra vale só para "TODOS vazios". Com um preenchido, o gráfico desenha
    // esse um e mais a fatia dos vazios — e é assim que tem de ser: o vazio ao
    // lado do preenchido é informação, o vazio sozinho não é.
    chamar('inserirRegistro_')('BASE_RET', {
      analista: 'Marcos Vieira', status: 'Pendente',
      'data de recepção do protocolo': diasAtras(1),
      'nome do cliente': 'Veio de um lote',
      'Origem do tombamento': 'Base de teste'
    });

    const porBase = painelDaRet().componentes.find((c) =>
      c.titulo === 'De qual base os casos vieram');
    verdadeiro(porBase.pontos.length >= 2, 'o lote e os sem informação');
    verdadeiro(porBase.pontos.some((p) => p.rotulo === 'Base de teste'));
    verdadeiro(porBase.pontos.some((p) => p.rotulo === 'Sem informação'));
  });

  secao('Os cartões da Produtividade RECC');

  /*
   * O pedido da operação: reteve, não reteve, quantos já contatou, quantos
   * estão cadastrados e pendentes. Tudo em cartão, antes dos gráficos — o
   * número é a resposta, o gráfico é a explicação.
   */

  teste('a Produtividade RECC abre com os cartões que a RET pediu', () => {
    const rotulos = painelDaRet().cartoes.map((c) => c.rotulo);
    igual(rotulos.join(' | '),
      'Casos cadastrados | Reteve | Não reteve | Já contatados | '
      + 'Com 2º contato | Pendentes | Não trabalhados');
  });

  teste('os cartões do Trabalho e os da Produtividade são listas diferentes', () => {
    // Mesma máquina, duas telas, duas perguntas. O Trabalho mostra o que ainda
    // dá trabalho; a Produtividade, o que já foi entregue. Se a lista fosse uma
    // só, uma das duas telas estaria respondendo a pergunta da outra.
    const doTrabalho = chamar('cartoesDoCanal_')(ret, 'trabalho')
      .map((c) => c.titulo).join(' | ');
    const daProdutividade = chamar('cartoesDoCanal_')(ret, 'produtividade')
      .map((c) => c.titulo).join(' | ');
    verdadeiro(doTrabalho !== daProdutividade, 'as duas listas não podem ser iguais');
    verdadeiro(doTrabalho.indexOf('Reteve') < 0, 'o Trabalho não mostra Reteve');
    verdadeiro(daProdutividade.indexOf('Reteve') >= 0, 'a Produtividade mostra');
  });

  teste('"já contatados" sai do carimbo, e não do status', () => {
    // A diferença que importa: um caso que já passou do "1º contato realizado"
    // e hoje está em "Reteve" continua tendo sido contatado. Contar pelo status
    // diria zero — e a operação concluiria que ninguém ligou para ninguém.
    const novo = chamar('cadastrarCaso')(ret.id, {
      status: 'Não trabalhado', nomedocliente: 'Caso que andou',
      datadereceptodoprotocolo: diasAtras(1)
    });
    chamar('alterarSituacaoDoCaso')(ret.id, novo.id, '1º contato realizado');
    chamar('alterarSituacaoDoCaso')(ret.id, novo.id, 'Reteve');

    const cartoes = painelDaRet().cartoes;
    const acharCartao = (rotulo) => cartoes.find((c) => c.rotulo === rotulo);

    igual(acharCartao('Reteve').valor, 1, 'o status de hoje é Reteve');
    igual(acharCartao('Já contatados').valor, 1,
      'e ele continua contando como contatado, porque o carimbo não some');
  });

  teste('cartão que aponta para coluna inexistente não aparece zerado', () => {
    // Aparecer zerado faria parecer problema da operação — "ninguém contatou
    // ninguém" — quando é problema de instalação. Sumir manda procurar no
    // lugar certo, que é o diagnóstico.
    const lista = chamar('lerRegistros_("PAINEIS")').find((linha) =>
      linha.Tela === 'produtividade' && linha.Titulo === 'Com 2º contato');
    chamar('atualizarRegistro_')('PAINEIS', lista.Id,
      { CampoDimensao: 'preenchido', Filtro: 'Coluna que não existe' });

    const rotulos = painelDaRet().cartoes.map((c) => c.rotulo);
    verdadeiro(rotulos.indexOf('Com 2º contato') < 0, 'o cartão saiu da tela');

    chamar('atualizarRegistro_')('PAINEIS', lista.Id,
      { Filtro: 'Data do 2º contato' });
  });

  teste('salvar os gráficos NÃO desliga os cartões da mesma tela', () => {
    // As duas coisas moram na aba PAINEIS, na mesma tela, e se distinguem só
    // pelo TipoWidget. Quem recolhesse "tudo desta tela" para gravar apagaria
    // os cartões sem avisar.
    const antes = painelDaRet().cartoes.length;
    verdadeiro(antes > 0, 'precisa haver cartões antes, senão o teste não prova nada');

    const graficos = chamar('listarComponentesDoPainel')(ret.id);
    verdadeiro(graficos.every((g) => g.dimensao !== 'total'),
      'a lista de gráficos não pode trazer cartão nenhum');
    chamar('salvarComponentesDoPainel')(ret.id, graficos);

    igual(painelDaRet().cartoes.length, antes, 'os cartões continuam todos lá');
  });

  secao('O período: atalho, de/até e mês fechado');

  /*
   * Quem resolve as três maneiras é o SERVIDOR. A tela escolhe; ela não
   * calcula. Se calculasse, o dia do gráfico sairia do relógio do navegador e
   * o dia da conta sairia do relógio da planilha — num fechamento de mês essa
   * diferença é um dia inteiro de casos.
   */

  const mesDe = (recuo) => {
    const quando = new Date(hoje.getFullYear(), hoje.getMonth() - recuo, 1);
    return quando.getFullYear() + '-'
      + String(quando.getMonth() + 1).padStart(2, '0');
  };

  teste('o atalho continua sendo a abertura, e em dias', () => {
    const painel = painelDaRet();
    igual(painel.periodo.tipo, 'dias');
    igual(painel.periodo.dias, 30);
    contem(painel.periodo.rotulo, 'últimos 30 dias');
  });

  teste('mandar só um número continua funcionando', () => {
    // O Trabalho e a Minha Performance chamam assim, e a pergunta deles é
    // sempre "os últimos N dias". Não havia motivo para mexer neles.
    const painel = chamar('produtividadeDaEquipe')(ret.id, {}, 60);
    igual(painel.periodo.tipo, 'dias');
    igual(painel.periodo.dias, 60);
  });

  teste('de/até recorta exatamente entre as duas datas, inclusive', () => {
    const painel = chamar('produtividadeDaEquipe')(ret.id, {},
      { tipo: 'intervalo', de: diasAtras(2), ate: diasAtras(1) });

    igual(painel.periodo.tipo, 'intervalo');
    igual(painel.periodo.de, diasAtras(2), 'as duas pontas entram');
    igual(painel.periodo.ate, diasAtras(1));
    contem(painel.periodo.rotulo, 'de ' + diasAtras(2));

    // Sem número cravado: os testes acima vão criando casos, e um número fixo
    // quebraria a cada caso novo sem que nada tivesse quebrado. O que importa
    // é a RELAÇÃO — os dois dias somam o que cada dia tem sozinho.
    const primeiro = chamar('produtividadeDaEquipe')(ret.id, {},
      { tipo: 'intervalo', de: diasAtras(2), ate: diasAtras(2) }).total;
    const segundo = chamar('produtividadeDaEquipe')(ret.id, {},
      { tipo: 'intervalo', de: diasAtras(1), ate: diasAtras(1) }).total;

    verdadeiro(primeiro > 0 && segundo > 0, 'os dois dias têm caso');
    igual(painel.total, primeiro + segundo,
      'o intervalo de dois dias é a soma dos dois, com as pontas dentro');
  });

  teste('datas invertidas se endireitam, em vez de devolver zero', () => {
    // Quem digitou "de 30/09 a 01/09" quis setembro. Uma tela zerada faria a
    // pessoa procurar defeito no dado, que é o lugar errado.
    const certo = chamar('produtividadeDaEquipe')(ret.id, {},
      { tipo: 'intervalo', de: diasAtras(2), ate: diasAtras(1) });
    const trocado = chamar('produtividadeDaEquipe')(ret.id, {},
      { tipo: 'intervalo', de: diasAtras(1), ate: diasAtras(2) });
    igual(trocado.total, certo.total);
    igual(trocado.periodo.de, certo.periodo.de);
  });

  teste('o mês fechado vai do dia 1 ao último dia', () => {
    const painel = chamar('produtividadeDaEquipe')(ret.id, {},
      { tipo: 'mes', mes: mesDe(0) });

    igual(painel.periodo.tipo, 'mes');
    igual(painel.periodo.mes, mesDe(0));
    contem(painel.periodo.de, '01/', 'começa no dia 1');

    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    contem(painel.periodo.ate, String(ultimoDia.getDate()).padStart(2, '0') + '/',
      'e termina no último dia do mês, sem tabela de 30 ou 31');
  });

  teste('fevereiro bissexto sai certo, sem ninguém lembrar dele', () => {
    const bissexto = chamar('resolverPeriodo_')({ tipo: 'mes', mes: '2024-02' });
    igual(chamar('comoSeEscreve_')(bissexto.ate), '29/02/2024');

    const comum = chamar('resolverPeriodo_')({ tipo: 'mes', mes: '2023-02' });
    igual(chamar('comoSeEscreve_')(comum.ate), '28/02/2023');
  });

  teste('o mês anterior de um mês é o MÊS anterior, não 30 dias antes', () => {
    // Comparar setembro com "os 30 dias antes de setembro" daria quase agosto,
    // mas não agosto. Em fevereiro o erro é de três dias, todo ano.
    const marco = chamar('resolverPeriodo_')({ tipo: 'mes', mes: '2024-03' });
    const antes = chamar('periodoAnterior_')(marco);

    igual(antes.mes, '2024-02');
    igual(chamar('comoSeEscreve_')(antes.de), '01/02/2024');
    igual(chamar('comoSeEscreve_')(antes.ate), '29/02/2024');
  });

  teste('janeiro volta para dezembro do ano anterior', () => {
    const antes = chamar('periodoAnterior_')(
      chamar('resolverPeriodo_')({ tipo: 'mes', mes: '2025-01' }));
    igual(antes.mes, '2024-12');
  });

  teste('o período anterior de um intervalo encosta antes dele', () => {
    const periodo = chamar('resolverPeriodo_')(
      { tipo: 'intervalo', de: '10/09/2026', ate: '19/09/2026' });
    const antes = chamar('periodoAnterior_')(periodo);

    igual(chamar('comoSeEscreve_')(antes.ate), '09/09/2026',
      'termina no dia anterior ao começo, sem sobrepor um dia');
    // De 10/09 a 19/09 são DEZ datas, com as duas pontas. A janela anterior
    // precisa ter dez também: 31/08 a 09/09. Eu escrevi 30/08 na primeira
    // versão deste teste, que seriam onze — e comparar uma janela de dez com
    // uma de onze é um erro que some dentro de uma variação de 3%.
    igual(chamar('comoSeEscreve_')(antes.de), '31/08/2026',
      'e tem o mesmo tamanho: dez datas, como o período medido');
    igual(chamar('diasEntre_')(antes.de, antes.ate),
      chamar('diasEntre_')(periodo.de, periodo.ate),
      'as duas janelas têm de cobrir o mesmo número de datas');
  });

  teste('pedido torto cai no atalho, e não em erro', () => {
    // Endereço guardado, clique repetido, data digitada pela metade. Uma tela
    // de número que mostra erro em vez de número é uma tela que ninguém abre
    // de novo.
    [{ tipo: 'intervalo', de: '', ate: '' },
     { tipo: 'intervalo', de: 'qualquer coisa', ate: diasAtras(1) },
     { tipo: 'mes', mes: '2026-13' },
     { tipo: 'mes', mes: 'setembro' },
     { tipo: 'sei-la' },
     {}].forEach((pedido) => {
      const painel = chamar('produtividadeDaEquipe')(ret.id, {}, pedido);
      igual(painel.periodo.tipo, 'dias',
        'caiu em ' + painel.periodo.tipo + ' com ' + JSON.stringify(pedido));
      igual(painel.periodo.dias, 30);
    });
  });

  teste('caso sem data fica no atalho e sai do período fechado', () => {
    // No "últimos 30 dias" ele é um caso mal preenchido que precisa aparecer.
    // Num "setembro" ele é um caso sobre o qual não dá para AFIRMAR que é de
    // setembro — e afirmar isso num fechamento é o que não pode acontecer.
    chamar('inserirRegistro_')('BASE_RET', {
      analista: 'Marcos Vieira', status: 'Pendente',
      'nome do cliente': 'Caso sem data nenhuma'
    });

    const noAtalho = painelDaRet().total;
    const noMes = chamar('produtividadeDaEquipe')(ret.id, {},
      { tipo: 'mes', mes: mesDe(0) }).total;
    const noIntervalo = chamar('produtividadeDaEquipe')(ret.id, {},
      { tipo: 'intervalo', de: diasAtras(60), ate: diasAtras(0) }).total;

    verdadeiro(noAtalho > noMes,
      'o atalho guarda o caso sem data: ' + noAtalho + ' contra ' + noMes);
    verdadeiro(noAtalho > noIntervalo, 'e o intervalo também o deixa de fora');
  });

  teste('a tela recebe os meses prontos, e não os calcula', () => {
    const meses = painelDaRet().mesesDisponiveis;
    igual(meses.length, 12, 'um ano para trás');
    igual(meses[0].valor, mesDe(0), 'o corrente vem primeiro');
    igual(meses[11].valor, mesDe(11));
    verdadeiro(/^[a-zçã]+ de \d{4}$/.test(meses[0].rotulo),
      'com o nome por extenso, veio: ' + meses[0].rotulo);
  });

  teste('o detalhamento usa o MESMO período do gráfico', () => {
    // Clicar numa barra de setembro não pode abrir a lista dos últimos 30 dias.
    const doMes = { tipo: 'mes', mes: mesDe(0) };
    const painel = chamar('produtividadeDaEquipe')(ret.id, {}, doMes);
    const grafico = painel.componentes.find((c) => c.titulo.indexOf('Situação') === 0);

    const somaDasListas = grafico.pontos.reduce((soma, ponto) => soma
      + chamar('detalharComponente')(ret.id, grafico.id, ponto.chave, {}, doMes).total,
      0);
    igual(somaDasListas, grafico.pontos.reduce((s, p) => s + p.casos, 0));
  });

  secao('De quem são os números: o nível de acesso decide');

  /*
   * A tela é DA EQUIPE por natureza — não há botão de "só os meus", porque
   * Minha Performance é a tela de uma pessoa e esta é a do grupo.
   *
   * Mas QUEM vê a produtividade de quem é decisão da operação, e por isso é
   * nível de acesso. Quatro respostas: bloqueado, próprios, equipe, canal.
   */

  /** Troca o alcance de um nível e devolve o Id dele. */
  function comAlcance(nomeDoNivel, alcance) {
    const nivel = chamar('listarNiveisDeAcesso()')
      .find((um) => um.nome === nomeDoNivel);
    chamar('salvarNivelDeAcesso')(Object.assign({}, nivel, {
      escopoNaProdutividade: alcance
    }));
    return nivel.id;
  }

  teste('não existe mais seletor de vista na tela — quem decide é o nível', () => {
    const painel = painelDaRet();
    verdadeiro(painel.vista === undefined);
    verdadeiro(painel.vistasDisponiveis === undefined);

    const tela = lerPeca('Produtividade');
    verdadeiro(tela.indexOf('data-vista') < 0,
      'o botão não pode ter ficado para trás no HTML');
  });

  teste('os quatro alcances existem, e cada um explica o que faz', () => {
    const opcoes = chamar('opcoesDeNivelDeAcesso()').produtividade;
    igual(opcoes.opcoes.map((o) => o.chave).join(','),
      'BLOQUEADO,PROPRIOS,EQUIPE,CANAL');
    contem(opcoes.titulo, 'Produtividade',
      'o seletor usa o nome de HOJE da tela, e não um texto fixo');
  });

  teste('a Produtividade sai da lista de "telas que abrem"', () => {
    // Ela tem seletor próprio, que já liga e desliga. Duas caixas para a mesma
    // tela é como alguém desliga a metade e jura que desligou.
    const telas = chamar('opcoesDeNivelDeAcesso()').telas.map((uma) => uma.chave);
    verdadeiro(telas.indexOf('produtividade') < 0);
    verdadeiro(telas.indexOf('trabalho') >= 0, 'as outras continuam lá');
  });

  teste('os níveis de fábrica nascem com o alcance declarado', () => {
    const porNome = {};
    chamar('listarNiveisDeAcesso()').forEach((nivel) => {
      porNome[nivel.nome] = nivel.escopoNaProdutividade;
    });

    igual(porNome['Administrador'], 'CANAL');
    igual(porNome['Coordenação'], 'CANAL');
    igual(porNome['Operação'], 'EQUIPE',
      'a Operação tem escopo PRÓPRIOS no resto e vê a EQUIPE aqui — são duas '
      + 'perguntas diferentes, e não precisam ter a mesma resposta');
  });

  secao('Liberar e bloquear, por nível');

  teste('BLOQUEADO tira a tela do menu, e a chamada direta é recusada', () => {
    // Esconder o item não basta: a função existe e nada impede chamá-la.
    const consulta = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Consulta');
    const permissoes = JSON.parse(consulta.Configuracao);
    permissoes.escopo = 'TODOS';
    chamar('atualizarRegistro_')('CATALOGO', consulta.Id,
      { Configuracao: JSON.stringify(permissoes) });
    chamar('salvarUsuario')({
      nome: 'Só Consulta', email: 'soconsulta@exemplo.com',
      nivelAcessoId: consulta.Id, ativo: true
    });

    comAlcance('Consulta', 'BLOQUEADO');

    comoUsuario(ambiente, 'soconsulta@exemplo.com', () => {
      const menu = chamar('pacoteDePartida()').menu.map((item) => item.tela);
      verdadeiro(menu.indexOf('produtividade') < 0, 'sumiu do menu');
      lanca(() => chamar('produtividadeDaEquipe')(ret.id, {}, 30), 'não abre a tela');
    });
  });

  teste('liberar de volta devolve a tela ao menu', () => {
    comAlcance('Consulta', 'CANAL');
    comoUsuario(ambiente, 'soconsulta@exemplo.com', () => {
      verdadeiro(chamar('pacoteDePartida()').menu
        .some((item) => item.tela === 'produtividade'), 'voltou ao menu');
      verdadeiro(chamar('produtividadeDaEquipe')(ret.id, {}, 30).total > 0);
    });
  });

  teste('o seletor e o menu nunca divergem — a lista de telas manda', () => {
    // Se alguém mexer na lista de telas por fora, o alcance acompanha. Duas
    // fontes de verdade para a mesma coisa é o achado 34.
    const consulta = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Consulta');
    const permissoes = JSON.parse(consulta.Configuracao);
    permissoes.telas = permissoes.telas.filter((t) => t !== 'produtividade');
    chamar('atualizarRegistro_')('CATALOGO', consulta.Id,
      { Configuracao: JSON.stringify(permissoes) });

    igual(chamar('listarNiveisDeAcesso()')
      .find((n) => n.nome === 'Consulta').escopoNaProdutividade, 'BLOQUEADO',
      'tela fora da lista quer dizer alcance bloqueado, sem exceção');

    comAlcance('Consulta', 'CANAL');
  });

  secao('Os três alcances que mostram número');

  teste('cada alcance mostra uma quantidade diferente, e crescente', () => {
    // A prova de que o seletor faz alguma coisa: os três números têm de ser
    // diferentes entre si, e na ordem. Um seletor que não muda o número seria
    // indistinguível de um que não está ligado em nada.
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    const permissoes = JSON.parse(operacao.Configuracao);
    permissoes.telas.push('produtividade');
    chamar('atualizarRegistro_')('CATALOGO', operacao.Id,
      { Configuracao: JSON.stringify(permissoes) });

    // Três pessoas no mesmo canal, e mais gente na base fora dele.
    [['Ana da Equipe', 'ana.eq@exemplo.com'],
     ['Bruno da Equipe', 'bruno.eq@exemplo.com']].forEach((par) => {
      chamar('salvarUsuario')({
        nome: par[0], email: par[1], canalQueAtende: 'Cobrança ativa',
        nivelAcessoId: operacao.Id, ativo: true
      });
    });
    chamar('inserirVariosRegistros_')('BASE_RET', [
      { analista: 'Ana da Equipe', status: 'Pendente',
        'data de recepção do protocolo': diasAtras(1), 'nome do cliente': 'E1' },
      { analista: 'Ana da Equipe', status: 'Pendente',
        'data de recepção do protocolo': diasAtras(1), 'nome do cliente': 'E2' },
      { analista: 'Bruno da Equipe', status: 'Pendente',
        'data de recepção do protocolo': diasAtras(1), 'nome do cliente': 'E3' }
    ]);

    const quantos = {};
    ['PROPRIOS', 'EQUIPE', 'CANAL'].forEach((alcance) => {
      comAlcance('Operação', alcance);
      comoUsuario(ambiente, 'ana.eq@exemplo.com', () => {
        quantos[alcance] = chamar('produtividadeDaEquipe')(ret.id, {}, 30).total;
      });
    });

    igual(quantos.PROPRIOS, 2, 'os dois casos da Ana');
    igual(quantos.EQUIPE, 3, 'os dela mais o do Bruno, que atende o mesmo canal');
    verdadeiro(quantos.CANAL > quantos.EQUIPE,
      'e o canal inteiro traz também quem não é da equipe dela: '
      + quantos.CANAL + ' contra ' + quantos.EQUIPE);
  });

  teste('o alcance daqui NÃO alarga o resto do sistema', () => {
    // É a parte que mais importa. Um analista com escopo "próprios" e
    // Produtividade em "canal" vê o canal AQUI e continua vendo só os casos
    // dele na fila de trabalho. Se isto vazasse, o seletor teria virado uma
    // porta dos fundos para o sistema inteiro.
    comAlcance('Operação', 'CANAL');

    comoUsuario(ambiente, 'ana.eq@exemplo.com', () => {
      const naProdutividade = chamar('produtividadeDaEquipe')(ret.id, {}, 30).total;
      const noTrabalho = chamar('resumoDoCanal')(ret.id, {}).total;

      verdadeiro(naProdutividade > noTrabalho,
        'a Produtividade mostra o canal; o Trabalho, só os dela');
      igual(noTrabalho, 2, 'na fila de trabalho ela continua vendo os dois dela');
    });
  });

  teste('o detalhamento usa o mesmo alcance do gráfico', () => {
    // Clicar numa barra tem de abrir uma lista do tamanho que a barra mostrava.
    comAlcance('Operação', 'EQUIPE');

    comoUsuario(ambiente, 'ana.eq@exemplo.com', () => {
      const painel = chamar('produtividadeDaEquipe')(ret.id, {}, 30);
      const grafico = painel.componentes.find((c) =>
        c.titulo.indexOf('Casos por analista') === 0);

      const somaDasListas = grafico.pontos.reduce((soma, ponto) => soma
        + chamar('detalharComponente')(ret.id, grafico.id, ponto.chave, {}, 30).total,
        0);
      igual(somaDasListas, grafico.pontos.reduce((s, p) => s + p.casos, 0));
    });
  });

  teste('alcance desconhecido é recusado ao salvar, dizendo quais existem', () => {
    const nivel = chamar('listarNiveisDeAcesso()').find((n) => n.nome === 'Operação');
    const erro = lanca(() => chamar('salvarNivelDeAcesso')(
      Object.assign({}, nivel, { escopoNaProdutividade: 'SEI_LA' })),
      'Alcance desconhecido');
    contem(erro.message, 'EQUIPE', 'e o recado lista os que existem');
  });

  teste('nível sem o alcance declarado cai em EQUIPE, e não em bloqueado', () => {
    // Nível antigo, de antes desta regra. Amanhecer sem a tela seria tirar
    // acesso de quem tinha; amanhecer mostrando só os próprios números seria
    // mostrar outra coisa sem ninguém ter escolhido.
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    const permissoes = JSON.parse(operacao.Configuracao);
    delete permissoes.escopoNaProdutividade;
    chamar('atualizarRegistro_')('CATALOGO', operacao.Id,
      { Configuracao: JSON.stringify(permissoes) });

    igual(chamar('listarNiveisDeAcesso()')
      .find((n) => n.nome === 'Operação').escopoNaProdutividade, 'EQUIPE');
  });

  secao('Alcance, filtros e exportação');  secao('Alcance, filtros e exportação');

  teste('o painel só soma o que a pessoa pode ver', () => {
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    // O nível de Operação não abre o Painel por padrão; damos a tela a ele
    // para poder conferir o alcance, que é o que este teste investiga.
    const permissoesDaOperacao = JSON.parse(operacao.Configuracao);
    permissoesDaOperacao.telas.push('produtividade');
    chamar('atualizarRegistro_')('CATALOGO', operacao.Id,
      { Configuracao: JSON.stringify(permissoesDaOperacao) });
    chamar('salvarUsuario')({
      nome: 'Patrícia Nunes', email: 'patricia@exemplo.com',
      nivelAcessoId: operacao.Id, ativo: true
    });

    // A Patrícia tem escopo "próprios" e alcance EQUIPE na Produtividade —
    // e sem canal declarado ela não tem equipe, então o alcance normal vale.
    comoUsuario(ambiente, 'patricia@exemplo.com', () => {
      const dela = chamar('produtividadeDaEquipe')(ret.id, {}, 30);
      igual(dela.total, chamar('resumoDoCanal')(ret.id, {}).total,
        'sem equipe, o alcance normal do nível vale — mostrar a base inteira '
        + 'porque faltou um cadastro seria trocar acesso por descuido');
    });
  });

  teste('o filtro vale para todos os gráficos ao mesmo tempo', () => {
    const filtrado = painelDaRet({ status: 'Concluído' });
    verdadeiro(filtrado.total < painelDaRet().total);
    filtrado.componentes.forEach((componente) => {
      if (componente.aviso || !componente.pontos.length) return;
      verdadeiro(componente.pontos.reduce((soma, p) => soma + p.casos, 0)
        <= filtrado.total,
        'nenhum gráfico pode somar mais casos do que o filtro deixou');
    });
  });

  teste('a exportação sai com ponto e vírgula e vírgula decimal', () => {
    // Ponto e vírgula porque o Excel em português abre assim sem perguntar;
    // vírgula decimal pelo mesmo motivo.
    const arquivo = chamar('exportarComponente')(ret.id,
      acharGrafico('Prêmio retido').id, {}, 30);
    contem(arquivo.nome, '.csv');
    const linhas = arquivo.conteudo.split('\n');
    igual(linhas[0].split(';').length, 3);
    verdadeiro(linhas.some((l) => l.indexOf('400') >= 0),
      'o número exportado é o mesmo do gráfico');
  });

  teste('quem não pode exportar é recusado, mesmo chamando direto', () => {
    const consulta = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Consulta');
    const permissoes = JSON.parse(consulta.Configuracao);
    permissoes.acoes = [];
    permissoes.telas = ['produtividade'];
    chamar('atualizarRegistro_')('CATALOGO', consulta.Id,
      { Configuracao: JSON.stringify(permissoes) });
    chamar('salvarUsuario')({
      nome: 'Só Olha', email: 'olha@exemplo.com',
      nivelAcessoId: consulta.Id, ativo: true
    });

    comoUsuario(ambiente, 'olha@exemplo.com', () => {
      verdadeiro(chamar('produtividadeDaEquipe')(ret.id, {}, 30).podeExportar === false,
        'a tela esconde o botão');
      lanca(() => chamar('exportarComponente')(ret.id, 'x', {}, 30),
        'não permite exportar');
    });
  });

  secao('Recusas na configuração');

  teste('gráfico sem título, sem coluna ou que soma sem medida é recusado', () => {
    lanca(() => chamar('salvarComponentesDoPainel')(ret.id,
      [{ titulo: '', tipo: 'barras', dimensao: 'canal' }]), 'precisa de um título');

    lanca(() => chamar('salvarComponentesDoPainel')(ret.id,
      [{ titulo: 'X', tipo: 'barras', dimensao: 'coluna que não existe' }]),
      'não existe na aba');

    lanca(() => chamar('salvarComponentesDoPainel')(ret.id,
      [{ titulo: 'X', tipo: 'barras', dimensao: 'canal', agregacao: 'soma' }]),
      'não diz qual');
  });

  teste('coluna apagada depois vira aviso no gráfico, e não tela quebrada', () => {
    const lista = chamar('listarComponentesDoPainel')(ret.id);
    // Direto na planilha, como alguém faria à mão — sem passar pela validação.
    const naPlanilha = chamar('lerRegistros_')('PAINEIS')
      .find((l) => String(l.Titulo).indexOf('Casos por canal') === 0);
    chamar('atualizarRegistro_')('PAINEIS', naPlanilha.__id,
      { CampoDimensao: 'coluna que sumiu' });

    const quebrado = acharGrafico('Casos por canal');
    igual(quebrado.pontos.length, 0);
    contem(quebrado.aviso, 'não existe na aba');
    chamar('salvarComponentesDoPainel')(ret.id, lista);
  });

  secao('A tela');

  teste('a página inclui a tela, e a rota chama ela', () => {
    const pasta = path.join(__dirname, '..', '..', 'Front-End');
    contem(fs.readFileSync(path.join(pasta, 'Index.html'), 'utf8'),
      "incluir('Produtividade')");
    contem(fs.readFileSync(path.join(pasta, 'Aplicacao.html'), 'utf8'),
      'TelaProdutividade.montar(pacote)');
  });

  teste('os gráficos são SVG da casa, sem biblioteca de fora', () => {
    // O Apps Script serve a página num quadro isolado: cada dependência
    // externa é mais um ponto que pode não carregar, e gráfico que não
    // carrega é pior que gráfico nenhum — deixa um buraco na tela.
    const pasta = path.join(__dirname, '..', '..', 'Front-End');
    const desenho = lerPeca('Graficos');
    const tela = fs.readFileSync(path.join(pasta, 'Produtividade.html'), 'utf8');

    [desenho, tela].forEach((fonte) => {
      verdadeiro(fonte.indexOf('<script src') < 0 && fonte.indexOf('cdn.') < 0,
        'nenhum arquivo de fora');
    });
    contem(desenho, '<svg viewBox=', 'o desenho é nosso');
    contem(tela, 'CasoEmModal.abrir(', 'e o caso abre no mesmo modal das outras telas');
  });

  teste('quem desenha é um módulo só, usado pelas duas telas', () => {
    // Regra copiada em dois lugares é regra que um dia diverge — e num
    // gráfico a divergência não dá erro: vira uma barra um pouco mais alta
    // do que devia, e alguém decide alguma coisa com base nela.
    const pasta = path.join(__dirname, '..', '..', 'Front-End');
    ['Produtividade.html', 'MinhaPerformance.html'].forEach((nome) => {
      const fonte = fs.readFileSync(path.join(pasta, nome), 'utf8');
      contem(fonte, 'Graficos.desenhar(', nome + ' pede o desenho ao módulo');
      verdadeiro(fonte.indexOf('function desenharPizza') < 0
        && fonte.indexOf('function arcoDaRosca') < 0,
        nome + ' não pode ter a sua própria cópia do desenho');
    });
  });

  teste('todo gráfico tem rótulo direto e uma tabela por baixo', () => {
    // Três dos seis tons da paleta ficam abaixo de 3:1 de contraste com o
    // fundo claro. A regra que compensa isso é esta: o número sempre visível,
    // e uma leitura sem cor nenhuma a um clique de distância.
    const desenho = lerPeca('Graficos');
    contem(desenho, 'valor-da-barra', 'a barra em pé mostra o número');
    contem(desenho, 'valor-deitado', 'a deitada também');
    contem(desenho, 'class="valor"', 'e a legenda da pizza');
    contem(desenho, 'function tabela(', 'e existe a tabela de números');
    contem(desenho, 'data-dica', 'com dica no passar do mouse');
    contem(desenho, 'tabindex="0"', 'e alcançável pelo teclado');
  });

  teste('a paleta dos gráficos é a mesma em todos os quatro temas', () => {
    // Cor escrita à mão num componente foi o que fez o tema rosa nascer com
    // botões azuis. Aqui vale igual: os seis tons são variáveis, e cada tema
    // define os seus — o escuro tem os seus próprios passos, e não a paleta
    // clara reaproveitada.
    const estilos = fs.readFileSync(path.join(__dirname, '..', '..',
      'Front-End', 'Estilos.html'), 'utf8');
    const quantos = (estilos.match(/--serie-1:/g) || []).length;
    igual(quantos, 4, 'os quatro temas declaram a paleta');
    verdadeiro(estilos.indexOf('--serie-1: #3987E5') >= 0,
      'o tema escuro tem os seus próprios passos');
  });
}

module.exports = { rodarTestesDaProdutividade };
