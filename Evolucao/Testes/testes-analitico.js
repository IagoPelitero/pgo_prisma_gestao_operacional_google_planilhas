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

function rodarTestesDoAnalitico() {
  console.log('\nEtapa 8 — Painel Analítico');

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
    chamar('painelAnalitico')(ret.id, filtros || {}, dias || 30);
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
    const doTrabalho = chamar('cartoesDoCanal_')(ret, 'dashboard')
      .map((c) => c.titulo).join(' | ');
    const daProdutividade = chamar('cartoesDoCanal_')(ret, 'painelAnalitico')
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
      linha.Tela === 'painelAnalitico' && linha.Titulo === 'Com 2º contato');
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

  secao('A equipe e o individual');

  teste('o painel abre na equipe, e o seletor oferece as duas', () => {
    const painel = painelDaRet();
    igual(painel.vista, 'equipe', 'a visão completa é a de abertura');
    igual(painel.vistasDisponiveis.map((v) => v.valor).join(','), 'equipe,eu');
  });

  teste('"só os meus" corta para os casos de quem está olhando', () => {
    const daEquipe = painelDaRet().total;
    const meus = chamar('painelAnalitico')(ret.id, {}, 30, 'eu').total;
    verdadeiro(meus < daEquipe,
      'o administrador não é o responsável por todos os casos de teste');

    // E o cartão acompanha: número de cartão que não bate com a vista é o
    // tipo de erro que faz a operação parar de confiar na tela inteira.
    const cartaoDaEquipe = painelDaRet().cartoes.find((c) => c.rotulo === 'Casos cadastrados');
    const cartaoMeu = chamar('painelAnalitico')(ret.id, {}, 30, 'eu').cartoes
      .find((c) => c.rotulo === 'Casos cadastrados');
    igual(cartaoDaEquipe.valor, daEquipe);
    igual(cartaoMeu.valor, meus);
  });

  teste('o detalhamento respeita a vista do gráfico que foi clicado', () => {
    // Sem número fixo: os testes acima deste vão criando casos, e um número
    // cravado aqui quebraria a cada caso novo sem que nada tivesse quebrado.
    // O que este teste precisa provar é a RELAÇÃO entre as duas vistas.
    const grafico = acharGrafico('Casos por analista');
    const daEquipe = chamar('detalharComponente')(ret.id, grafico.id,
      'Marcos Vieira', {}, 30, 'equipe').total;
    const meu = chamar('detalharComponente')(ret.id, grafico.id,
      'Marcos Vieira', {}, 30, 'eu').total;
    verdadeiro(daEquipe > 0, 'a equipe tem casos do Marcos, veio ' + daEquipe);
    igual(meu, 0, 'e nenhum deles é do administrador que está olhando');
  });

  teste('vista desconhecida cai na equipe, e não em lista vazia', () => {
    // Pedido torto vindo de um endereço antigo, ou de um clique repetido, não
    // pode devolver zero: zero se lê como "a operação não produziu nada".
    igual(chamar('painelAnalitico')(ret.id, {}, 30, 'sei-la').vista, 'equipe');
    igual(chamar('painelAnalitico')(ret.id, {}, 30, '').vista, 'equipe');
  });

  secao('Alcance, filtros e exportação');

  teste('o painel só soma o que a pessoa pode ver', () => {
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    // O nível de Operação não abre o Painel por padrão; damos a tela a ele
    // para poder conferir o alcance, que é o que este teste investiga.
    const permissoesDaOperacao = JSON.parse(operacao.Configuracao);
    permissoesDaOperacao.telas.push('painelAnalitico');
    chamar('atualizarRegistro_')('CATALOGO', operacao.Id,
      { Configuracao: JSON.stringify(permissoesDaOperacao) });
    chamar('salvarUsuario')({
      nome: 'Patrícia Nunes', email: 'patricia@exemplo.com',
      nivelAcessoId: operacao.Id, ativo: true
    });

    const total = painelDaRet().total;
    comoUsuario(ambiente, 'patricia@exemplo.com', () => {
      const dela = chamar('painelAnalitico')(ret.id, {}, 30);
      verdadeiro(dela.total < total, 'ela vê menos que o administrador');
      igual(dela.total, 1, 'só o caso em que ela é a responsável');

      // E ela NÃO ganha o seletor de vista: as duas vistas mostrariam a mesma
      // coisa para quem já só enxerga os próprios casos, e um controle que não
      // muda nada ensina a não confiar nos outros controles.
      igual(dela.vistasDisponiveis.length, 0);
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
    permissoes.telas = ['painelAnalitico'];
    chamar('atualizarRegistro_')('CATALOGO', consulta.Id,
      { Configuracao: JSON.stringify(permissoes) });
    chamar('salvarUsuario')({
      nome: 'Só Olha', email: 'olha@exemplo.com',
      nivelAcessoId: consulta.Id, ativo: true
    });

    comoUsuario(ambiente, 'olha@exemplo.com', () => {
      verdadeiro(chamar('painelAnalitico')(ret.id, {}, 30).podeExportar === false,
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
      "incluir('PainelAnalitico')");
    contem(fs.readFileSync(path.join(pasta, 'Aplicacao.html'), 'utf8'),
      'TelaPainelAnalitico.montar(pacote)');
  });

  teste('os gráficos são SVG da casa, sem biblioteca de fora', () => {
    // O Apps Script serve a página num quadro isolado: cada dependência
    // externa é mais um ponto que pode não carregar, e gráfico que não
    // carrega é pior que gráfico nenhum — deixa um buraco na tela.
    const pasta = path.join(__dirname, '..', '..', 'Front-End');
    const desenho = lerPeca('Graficos');
    const tela = fs.readFileSync(path.join(pasta, 'PainelAnalitico.html'), 'utf8');

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
    ['PainelAnalitico.html', 'MinhaPerformance.html'].forEach((nome) => {
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

module.exports = { rodarTestesDoAnalitico };
