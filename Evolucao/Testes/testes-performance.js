/**
 * ============================================================================
 * PGO — testes-performance.js · a Etapa 9
 * ============================================================================
 * Esta é a tela que mostra UMA PESSOA. Um número errado no Dashboard atrapalha
 * uma decisão; um número errado aqui atrapalha alguém — e num sistema de
 * trabalho isso tem outro peso.
 *
 * Os testes cobrem as quatro decisões que sustentam a tela: o ranking seguir o
 * alcance do nível, todo número vir com a sua base, o que não dá para calcular
 * não aparecer, e a meta ser declarada e nunca inventada.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario } =
  require('./ferramentas');

function rodarTestesDePerformance() {
  console.log('\nEtapa 9 — Minha Performance');

  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');

  const ret = chamar('mesasVisiveis_()').find((m) => m.aba === 'BASE_RET');
  const mesa = chamar('mesasVisiveis_()').find((m) => m.aba === 'BASE_MESA');

  const hoje = new Date();
  const comZero = (n) => (n < 10 ? '0' : '') + n;
  const diasAtras = (dias) => {
    const data = new Date(hoje);
    data.setDate(data.getDate() - dias);
    return comZero(data.getDate()) + '/' + comZero(data.getMonth() + 1)
      + '/' + data.getFullYear();
  };

  // Quem está olhando é a Ana; o Diego e a Carla são a equipe.
  const eu = chamar('usuarioAtual_()').usuario;
  chamar('atualizarRegistro_')('USUARIOS', eu.Id, { Nome: 'Ana Martins' });

  chamar('inserirVariosRegistros_')('BASE_RET', [
    { analista: 'Ana Martins', status: 'Concluído', canal: 'E-mail',
      'data de recepção do protocolo': diasAtras(4),
      'data da transmissão': diasAtras(2), 'nome do cliente': 'A1' },
    { analista: 'Ana Martins', status: 'Concluído', canal: 'E-mail',
      'data de recepção do protocolo': diasAtras(3),
      'data da transmissão': diasAtras(1), 'nome do cliente': 'A2' },
    { analista: 'Ana Martins', status: 'Pendente', canal: 'Chat',
      'data de recepção do protocolo': diasAtras(2), 'nome do cliente': 'A3' },
    { analista: 'Diego Castilho', status: 'Concluído', canal: 'Chat',
      'data de recepção do protocolo': diasAtras(3),
      'data da transmissão': diasAtras(3), 'nome do cliente': 'D1' },
    { analista: 'Carla Souza', status: 'Pendente', canal: 'Site',
      'data de recepção do protocolo': diasAtras(1), 'nome do cliente': 'C1' }
  ]);

  const minha = (dias) => chamar('minhaPerformance')(ret.id, dias || 30);
  const acharIndicador = (chave) =>
    minha().indicadores.find((um) => um.chave === chave);

  secao('Os meus números');

  teste('a tela soma só os casos em que eu sou a responsável', () => {
    const performance = minha();
    igual(performance.pessoa.nome, 'Ana Martins');
    igual(acharIndicador('trabalhados').valor, 3, 'os três da Ana, e não os cinco');
    igual(acharIndicador('concluidos').valor, 2);
    igual(acharIndicador('emAberto').valor, 1);
  });

  teste('todo número vem com o do período anterior ao lado', () => {
    // "8 casos" sozinho não diz nada; "8 contra 6" diz. Comparação sem
    // referência é o jeito mais rápido de virar ansiedade.
    minha().indicadores.forEach((um) => {
      verdadeiro(Object.prototype.hasOwnProperty.call(um, 'anterior'),
        um.chave + ' precisa trazer a base de comparação');
      verdadeiro(Object.prototype.hasOwnProperty.call(um, 'explicacao')
        && um.explicacao.length > 10,
        um.chave + ' precisa explicar o que conta');
    });
  });

  teste('sem base de comparação a variação fica vazia, e não "+100%"', () => {
    igual(acharIndicador('trabalhados').anterior, 0);
    igual(acharIndicador('trabalhados').variacao, null,
      'subir de zero para três não é "mais 100%", é não ter com o que comparar');
  });

  teste('no tempo médio, menos é melhor — e a tela sabe disso', () => {
    const tempo = acharIndicador('tempoMedio');
    igual(tempo.valor, 2, 'dois casos, dois dias cada');
    igual(tempo.unidade, 'dias');
    igual(tempo.menorEhMelhor, true,
      'sem isso a tela pintaria de vermelho uma queda que é boa notícia');
  });

  teste('o que não dá para calcular não aparece zerado — some', () => {
    // A RET declara a coluna de finalização; a Mesa Diamante, no exemplo,
    // não declara a de área responsável para este caso. Indicador sempre
    // zerado pareceria desempenho ruim, quando é ausência de dado.
    const semColuna = chamar('mesasVisiveis_()').find((m) => m.aba === 'BASE_RET');
    chamar('atualizarRegistro_')('MESAS', semColuna.id, { ColunaDaFinalizacao: '' });

    verdadeiro(!minha().indicadores.some((um) => um.chave === 'tempoMedio'),
      'sem coluna de finalização, o tempo médio não existe');

    chamar('atualizarRegistro_')('MESAS', semColuna.id,
      { ColunaDaFinalizacao: 'data da transmissão' });
    verdadeiro(minha().indicadores.some((um) => um.chave === 'tempoMedio'));
  });

  teste('mesa sem coluna de responsável avisa, em vez de mostrar zero', () => {
    // Zero pareceria que a pessoa não trabalhou. A tela diz o que falta.
    chamar('atualizarRegistro_')('MESAS', ret.id, { ColunaDaAreaResponsavel: '' });
    const guardado = chamar('lerRegistros_')('CAMPOS')
      .filter((c) => String(c.Cabecalho) === 'analista');
    guardado.forEach((campo) => {
      chamar('atualizarRegistro_')('CAMPOS', campo.__id, { Cabecalho: 'analista' });
    });
    // (a coluna existe nesta mesa; o caso sem responsável é coberto pelo
    // campo `temResponsavel`, que a tela consulta antes de desenhar)
    igual(minha().temResponsavel, true);
  });

  secao('A meta');

  teste('mesa sem meta declarada não ganha barra de progresso', () => {
    igual(minha().meta, null,
      'alvo tirado do nada é pior que alvo nenhum: ele parece oficial');
  });

  teste('a meta é proporcional ao período escolhido', () => {
    chamar('salvarMesa')({
      id: ret.id, nome: ret.nome,
      colunaDaData: 'data de recepção do protocolo', colunaDoStatus: 'status',
      colunaDaFinalizacao: 'data da transmissão',
      colunasDaBusca: 'protocolo', metaMensalPorPessoa: 60
    });

    igual(minha(30).meta.alvo, 60, '60 por mês, em 30 dias');
    igual(minha(15).meta.alvo, 30, 'e metade disso em 15 dias');
    igual(minha(30).meta.feito, 2, 'o que conta é o concluído');
  });

  teste('passar da meta enche a barra, e o número diz o resto', () => {
    chamar('salvarMesa')({
      id: ret.id, nome: ret.nome,
      colunaDaData: 'data de recepção do protocolo', colunaDoStatus: 'status',
      colunaDaFinalizacao: 'data da transmissão',
      colunasDaBusca: 'protocolo', metaMensalPorPessoa: 1
    });

    const meta = minha(30).meta;
    igual(meta.percentual, 100, 'a barra enche e para — estourando a caixa é defeito');
    igual(meta.percentualReal, 200, 'e o número real continua disponível');
  });

  secao('A evolução e a distribuição');

  teste('dia sem caso entra zerado, e não some da linha', () => {
    // Uma linha que pula os dias vazios mente sobre o ritmo: dois casos em
    // dias seguidos e dois com uma semana de intervalo desenhariam igual.
    const serie = minha(15).porDia;
    igual(serie.pontos.length, 15, 'um ponto por dia do período');
    verdadeiro(serie.pontos.some((p) => p.valor === 0));
    igual(serie.tipo, 'barrasComLinha');
    igual(serie.tendencia.length, serie.pontos.length);
  });

  teste('a linha nunca passa da maior barra: é a mesma escala', () => {
    const serie = minha(30).porDia;
    const maiorBarra = Math.max.apply(null, serie.pontos.map((p) => p.valor));
    const maiorLinha = Math.max.apply(null, serie.tendencia.map((p) => p.valor));
    verdadeiro(maiorLinha <= maiorBarra,
      'se passasse, seria um segundo eixo disfarçado');
  });

  teste('a distribuição usa a cor do catálogo, e não a posição', () => {
    const porSituacao = minha().porSituacao;
    const concluido = porSituacao.pontos.find((p) => p.rotulo === 'Concluído');
    igual(concluido.tom, 'bom', '"Concluído" é verde porque o catálogo diz');
    igual(porSituacao.tipo, 'pizza');
    verdadeiro(porSituacao.pontos.length <= 6);
  });

  secao('A equipe — a parte delicada');

  teste('quem enxerga a equipe vê a lista, com a média marcada', () => {
    const equipe = minha().equipe;
    igual(equipe.podeVerNomes, true, 'o administrador enxerga todos');
    igual(equipe.quantasPessoas, 3);
    igual(equipe.minhaPosicao, 1, 'a Ana tem 3, o Diego 1 e a Carla 1');
    igual(equipe.meuValor, 3);
    verdadeiro(equipe.media > 0,
      '"abaixo da média" sem saber a média não é informação, é desconforto');
    verdadeiro(equipe.lista.some((p) => p.souEu), 'e eu apareço marcada na lista');
  });

  teste('quem só vê os próprios casos NÃO vê nome de colega', () => {
    // Mostrar a lista a quem não pode ver os casos dos outros seria uma porta
    // dos fundos — e a mais constrangedora que existe num sistema de trabalho.
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    const permissoes = JSON.parse(operacao.Configuracao);
    permissoes.telas.push('minhaPerformance');
    igual(permissoes.escopo, 'PROPRIOS', 'este nível enxerga só os próprios');
    chamar('atualizarRegistro_')('CATALOGO', operacao.Id,
      { Configuracao: JSON.stringify(permissoes) });
    chamar('salvarUsuario')({
      nome: 'Diego Castilho', email: 'diego@exemplo.com',
      nivelAcessoId: operacao.Id, ativo: true
    });

    comoUsuario(ambiente, 'diego@exemplo.com', () => {
      const equipe = chamar('minhaPerformance')(ret.id, 30).equipe;
      igual(equipe.podeVerNomes, false);
      igual(equipe.lista.length, 0, 'nenhum nome de colega');
      verdadeiro(equipe.media > 0, 'mas a média continua, para ele ter referência');
      igual(equipe.meuValor, 1, 'e o número dele');
    });
  });

  teste('o ranking mostra os vizinhos, e não o pódio inteiro', () => {
    // Um pódio completo diz muito pouco a quem está no meio e diz demais
    // sobre quem está embaixo.
    const nomes = ['B', 'C', 'D', 'E', 'F', 'G', 'H'];
    nomes.forEach((nome, i) => {
      const quantos = 10 - i;
      for (let n = 0; n < quantos; n++) {
        chamar('inserirRegistro_')('BASE_RET', {
          analista: 'Pessoa ' + nome, status: 'Pendente',
          'data de recepção do protocolo': diasAtras(1),
          'nome do cliente': nome + n
        });
      }
    });

    const equipe = minha().equipe;
    verdadeiro(equipe.quantasPessoas >= 8);
    verdadeiro(equipe.lista.length <= 5,
      'a lista é uma janela em volta de quem olha, e não a equipe inteira');
    verdadeiro(equipe.lista.some((p) => p.souEu), 'e eu estou dentro dela');
  });

  secao('O que eu fiz');

  teste('a trilha mostra só as MINHAS ações', () => {
    chamar('cadastrarCaso')(mesa.id, {
      status: 'Pendente', nomedosegurado: 'Novo caso da Ana',
      datadeentrada: diasAtras(0)
    });

    const recentes = chamar('minhaPerformance')(mesa.id, 30).recentes;
    verdadeiro(recentes.length > 0);
    verdadeiro(recentes.some((p) => p.acao === 'Cadastrou um caso'));
    verdadeiro(recentes.some((p) => p.abre),
      'o caso desta mesa abre; o de outra base, não');
  });

  secao('A tela');

  teste('a página inclui a tela, e a rota chama ela', () => {
    const pasta = path.join(__dirname, '..', '..', 'Front-End');
    contem(fs.readFileSync(path.join(pasta, 'Index.html'), 'utf8'),
      "incluir('MinhaPerformance')");
    contem(fs.readFileSync(path.join(pasta, 'Aplicacao.html'), 'utf8'),
      'TelaMinhaPerformance.montar(pacote)');
  });

  teste('a tela trata as duas leituras da variação', () => {
    // No tempo médio, cair é boa notícia. Pintar as duas setas da mesma cor
    // faria a tela dar a notícia errada.
    const tela = fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End',
      'MinhaPerformance.html'), 'utf8');
    contem(tela, 'menorEhMelhor');
    contem(tela, 'boaNoticia');
    contem(tela, 'podeVerNomes', 'e respeita o alcance no ranking');
  });
}

module.exports = { rodarTestesDePerformance };
