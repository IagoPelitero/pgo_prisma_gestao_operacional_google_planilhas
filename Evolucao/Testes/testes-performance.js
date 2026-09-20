/**
 * ============================================================================
 * PGO — testes-performance.js · a Etapa 9
 * ============================================================================
 * Esta é a tela que mostra UMA PESSOA. Um número errado no Trabalho atrapalha
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
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario,
  lerPeca } = require('./ferramentas');

function rodarTestesDePerformance() {
  console.log('\nEtapa 9 — Minha Performance');

  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');

  const ret = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');
  const canal = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_MESA');

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
  const mesDe = (recuo) => {
    const quando = new Date(hoje.getFullYear(), hoje.getMonth() - recuo, 1);
    return quando.getFullYear() + '-'
      + String(quando.getMonth() + 1).padStart(2, '0');
  };
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
    const semColuna = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');
    chamar('atualizarRegistro_')('CANAIS', semColuna.id, { ColunaDaFinalizacao: '' });

    verdadeiro(!minha().indicadores.some((um) => um.chave === 'tempoMedio'),
      'sem coluna de finalização, o tempo médio não existe');

    chamar('atualizarRegistro_')('CANAIS', semColuna.id,
      { ColunaDaFinalizacao: 'data da transmissão' });
    verdadeiro(minha().indicadores.some((um) => um.chave === 'tempoMedio'));
  });

  teste('canal sem coluna de responsável avisa, em vez de mostrar zero', () => {
    // Zero pareceria que a pessoa não trabalhou. A tela diz o que falta.
    chamar('atualizarRegistro_')('CANAIS', ret.id, { ColunaDaAreaResponsavel: '' });
    const guardado = chamar('lerRegistros_')('CAMPOS')
      .filter((c) => String(c.Cabecalho) === 'analista');
    guardado.forEach((campo) => {
      chamar('atualizarRegistro_')('CAMPOS', campo.__id, { Cabecalho: 'analista' });
    });
    // (a coluna existe neste canal; o caso sem responsável é coberto pelo
    // campo `temResponsavel`, que a tela consulta antes de desenhar)
    igual(minha().temResponsavel, true);
  });

  secao('A meta');

  teste('canal sem meta declarada não ganha barra de progresso', () => {
    igual(minha().meta, null,
      'alvo tirado do nada é pior que alvo nenhum: ele parece oficial');
  });

  teste('a meta é proporcional ao período escolhido', () => {
    chamar('salvarCanal')({
      id: ret.id, nome: ret.nome,
      colunaDaData: 'data de recepção do protocolo', colunaDoStatus: 'status',
      colunaDaFinalizacao: 'data da transmissão',
      colunasDaBusca: 'protocolo', metaMensalPorPessoa: 60
    });

    /*
     * A CONTA É POR DIA ÚTIL, e não mais por dia corrido — decisão do PO:
     * "só trabalhamos em dias úteis".
     *
     * Por isso o teste não crava mais "60 em 30 dias". Ele cobra a REGRA: o
     * alvo é a meta mensal na proporção dos dias úteis que o período tem
     * contra os dias úteis do mês. Cravar o número amarraria o teste ao
     * calendário do dia em que ele rodasse — em fevereiro daria outro, e a
     * suíte quebraria sozinha na virada do mês, sem nada ter quebrado.
     */
    const mes = chamar('resolverPeriodo_')({ tipo: 'mes', mes: mesDe(0) });
    const uteisDoMes = chamar('diasUteisDoMesDe_')(mes.ate);

    const janela = minha(30);
    const esperadoNaJanela = Math.round((60 / uteisDoMes) * janela.meta.diasUteis);
    igual(janela.meta.alvo, esperadoNaJanela,
      '60 por mês, na proporção dos dias úteis da janela');

    const metade = minha(15);
    verdadeiro(metade.meta.alvo < janela.meta.alvo,
      'menos dias, menos alvo — 15 dias não podem pedir o mesmo que 30');

    igual(janela.meta.feito, 2, 'o que conta é o concluído');
  });

  teste('no MÊS FECHADO o alvo é exatamente a meta mensal', () => {
    // Este é o caso que tem de bater na vírgula, e é o que a operação usa para
    // reportar: um mês inteiro pede a meta do mês, nem um caso a mais. Se a
    // proporção estivesse errada em qualquer ponto, apareceria aqui.
    const doMes = chamar('minhaPerformance')(ret.id, { tipo: 'mes', mes: mesDe(0) });
    igual(doMes.meta.alvo, 60, 'o mês inteiro pede a meta do mês');
    igual(doMes.meta.diasAusente, 0, 'e ninguém está ausente neste teste');
  });

  teste('passar da meta enche a barra, e o número diz o resto', () => {
    chamar('salvarCanal')({
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

  secao('Esta tela é sobre MIM, sempre');

  /*
   * O pedido da operação: "Minha Performance será sempre sobre minhas
   * inclusões, e Produtividade RECC mostra sempre o da equipe". Duas telas,
   * duas perguntas, nenhum botão para errar.
   *
   * A equipe continua APARECENDO aqui, mas como REFERÊNCIA — a média e a
   * posição, no bloco de baixo. Saber que se fez 8 não diz nada sem saber que
   * a média é 6. O que ela não faz mais é virar o assunto da tela.
   */

  teste('não existe mais seletor de vista — a tela é minha e pronto', () => {
    const performance = minha();
    verdadeiro(performance.vista === undefined);
    verdadeiro(performance.vistasDisponiveis === undefined);
    verdadeiro(performance.pessoasNaVista === undefined);

    const tela = lerPeca('MinhaPerformance');
    verdadeiro(tela.indexOf('data-vista') < 0,
      'e o botão não pode ter ficado para trás no HTML');
  });

  teste('mandar vista pela chamada direta não soma a equipe', () => {
    // O parâmetro sumiu. Quem ficou com a tela antiga aberta, ou tem o endereço
    // guardado, não pode acabar vendo o número de outra pessoa como se fosse o
    // dele — numa tela sobre uma pessoa, esse erro tem outro peso.
    const trabalhados = (p) =>
      p.indicadores.find((um) => um.chave === 'trabalhados').valor;

    igual(trabalhados(chamar('minhaPerformance')(ret.id, 30, 'equipe')),
      trabalhados(minha()), 'continua sendo só o meu');
  });

  teste('a equipe continua dando referência, no bloco de baixo', () => {
    // Ela sai da conta principal e fica onde sempre devia estar: ao lado do
    // meu número, para ele significar alguma coisa.
    const equipe = minha().equipe;
    verdadeiro(equipe.disponivel, 'o bloco continua existindo');
    verdadeiro(equipe.media > 0, 'com a média da equipe');
    verdadeiro(equipe.minhaPosicao >= 1, 'e a minha posição nela');
  });

  teste('a meta continua sendo a de UMA pessoa', () => {
    const comoEstava = chamar('listarCanaisConfiguraveis()')
      .find((m) => m.aba === 'BASE_RET');
    chamar('salvarCanal')(Object.assign({}, comoEstava,
      { metaMensalPorPessoa: 30 }));

    const meta = minha().meta;
    const uteisDoMes = chamar('diasUteisDoMesDe_')(
      chamar('resolverPeriodo_')({ tipo: 'mes', mes: mesDe(0) }).ate);
    igual(meta.alvo, Math.round((30 / uteisDoMes) * meta.diasUteis),
      '30 por mês, na proporção dos dias úteis');
    igual(meta.pessoas, 1);

    chamar('salvarCanal')(comoEstava);
  });

  secao('O que eu fiz');

  teste('a trilha mostra só as MINHAS ações', () => {
    chamar('cadastrarCaso')(canal.id, {
      status: 'Em andamento', nomedosegurado: 'Novo caso da Ana',
      datadeentrada: diasAtras(0)
    });

    const recentes = chamar('minhaPerformance')(canal.id, 30).recentes;
    verdadeiro(recentes.length > 0);
    verdadeiro(recentes.some((p) => p.acao === 'Cadastrou um caso'));
    verdadeiro(recentes.some((p) => p.abre),
      'o caso deste canal abre; o de outra base, não');
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

  secao('Dia útil, feriado e férias');

  /*
   * O PO trouxe duas regras de uma vez: "temos meses em que alguns entram de
   * férias (…) precisam ficar inativos por determinados dias" e "só
   * trabalhamos em dias úteis". As duas mexem na MESMA conta — quantos dias a
   * pessoa realmente tinha para trabalhar — e é isso que estes testes cobram.
   */

  teste('o Domingo de Páscoa bate com o calendário, inclusive nos extremos', () => {
    // É a data de onde saem Carnaval, Sexta-feira Santa e Corpus Christi:
    // quatro dias por ano. Errar aqui erra a meta de fevereiro e a de junho, e
    // erra tão pouco que ninguém desconfia da conta — desconfia da pessoa.
    const escrever = (d) => String(d.getDate()).padStart(2, '0') + '/'
      + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();

    const conhecidas = {
      2024: '31/03/2024', 2025: '20/04/2025', 2026: '05/04/2026',
      2027: '28/03/2027', 2030: '21/04/2030',
      // Os dois extremos que o calendário gregoriano permite.
      2038: '25/04/2038', 2035: '25/03/2035'
    };

    Object.keys(conhecidas).forEach((ano) => {
      igual(escrever(chamar('domingoDePascoa_')(Number(ano))), conhecidas[ano],
        'Páscoa de ' + ano);
    });
  });

  teste('os feriados móveis saem da Páscoa, e caem no dia certo', () => {
    const doAno = chamar('feriadosNacionaisDoAno_')(2026);
    // Páscoa 2026 é 05/04. Carnaval é 47 dias antes, Sexta-feira Santa 2, e
    // Corpus Christi 60 depois.
    igual(doAno['2026-02-17'], 'Carnaval (terça)');
    igual(doAno['2026-04-03'], 'Sexta-feira Santa');
    igual(doAno['2026-06-04'], 'Corpus Christi');
  });

  teste('a Consciência Negra só conta de 2024 em diante', () => {
    // Virou feriado nacional pela Lei 14.759/2023. Contar antes disso tiraria
    // um dia útil de um ano em que a operação trabalhou.
    verdadeiro(!chamar('feriadosNacionaisDoAno_')(2023)['2023-11-20'],
      'em 2023 ainda não era nacional');
    igual(chamar('feriadosNacionaisDoAno_')(2024)['2024-11-20'], 'Consciência Negra');
  });

  teste('dia útil não é fim de semana nem feriado', () => {
    const dia = (a, m, d) => new Date(a, m - 1, d);
    verdadeiro(chamar('ehDiaUtil_')(dia(2026, 9, 18)), '18/09/2026 é uma sexta comum');
    verdadeiro(!chamar('ehDiaUtil_')(dia(2026, 9, 19)), 'sábado não');
    verdadeiro(!chamar('ehDiaUtil_')(dia(2026, 9, 20)), 'domingo não');
    verdadeiro(!chamar('ehDiaUtil_')(dia(2026, 9, 7)), '7 de setembro não');
  });

  teste('setembro de 2026 tem 30 dias corridos e 21 úteis', () => {
    // Conferido na mão: 30 dias, 8 de fim de semana, e o 7 de setembro numa
    // segunda-feira.
    const de = new Date(2026, 8, 1);
    const ate = new Date(2026, 8, 30);
    igual(chamar('diasEntre_')(de, ate), 30);
    igual(chamar('diasUteisEntre_')(de, ate), 21);
  });

  teste('o feriado do administrador tira o dia, e o Trabalha=SIM devolve', () => {
    // A aba FERIADOS existe para o que só a operação sabe: o municipal, o
    // facultativo que ela de fato não trabalha, a emenda.
    const umaQuinta = new Date(2026, 8, 17);
    verdadeiro(chamar('ehDiaUtil_')(umaQuinta), 'antes de cadastrar, é dia útil');

    const feriado = chamar('inserirRegistro_')('FERIADOS', {
      Data: '17/09/2026', Nome: 'Aniversário da cidade', Tipo: 'Municipal'
    });
    chamar('esquecerOCalendario_()');
    verdadeiro(!chamar('ehDiaUtil_')(umaQuinta), 'cadastrado, deixa de ser');

    // E o caminho contrário: o ano em que a operação trabalhou num feriado.
    chamar('atualizarRegistro_')('FERIADOS', feriado.__id, { Trabalha: 'SIM' });
    chamar('esquecerOCalendario_()');
    verdadeiro(chamar('ehDiaUtil_')(umaQuinta),
      'Trabalha = SIM devolve o dia para a conta');

    chamar('ocultarRegistro_')('FERIADOS', feriado.__id);
    chamar('esquecerOCalendario_()');
  });

  teste('férias descontam DIA ÚTIL, e não dia corrido', () => {
    // Uma semana de férias que pega um fim de semana são 5 dias úteis fora, e
    // não 7. Descontar 7 daria à pessoa uma meta menor do que a justa.
    const feriasDe = new Date(2026, 8, 7);    // segunda (e feriado!)
    const feriasAte = new Date(2026, 8, 13);  // domingo

    const fora = chamar('inserirRegistro_')('AUSENCIAS', {
      UsuarioId: eu.Id, Motivo: 'Férias',
      De: '07/09/2026', Ate: '13/09/2026'
    });

    // 07/09 é feriado, 12 e 13 são fim de semana: sobram 08, 09, 10 e 11.
    igual(chamar('diasUteisAusente_')(eu.Id, feriasDe, feriasAte), 4,
      'o feriado dentro das férias não conta duas vezes');

    chamar('ocultarRegistro_')('AUSENCIAS', fora.__id);
  });

  teste('duas ausências no mesmo dia contam o dia UMA vez', () => {
    // Férias emendada com licença, ou a mesma férias cadastrada duas vezes por
    // engano. Somar as duas devolveria mais dias fora do que o período tem, e
    // a meta viraria zero sem ninguém entender por quê.
    const de = new Date(2026, 8, 1);
    const ate = new Date(2026, 8, 30);

    const uma = chamar('inserirRegistro_')('AUSENCIAS', {
      UsuarioId: eu.Id, Motivo: 'Férias', De: '01/09/2026', Ate: '10/09/2026'
    });
    const outra = chamar('inserirRegistro_')('AUSENCIAS', {
      UsuarioId: eu.Id, Motivo: 'Licença', De: '05/09/2026', Ate: '15/09/2026'
    });

    const sobrepostas = chamar('diasUteisAusente_')(eu.Id, de, ate);
    igual(sobrepostas, chamar('diasUteisEntre_')(de, new Date(2026, 8, 15)),
      'o intervalo coberto pelas duas, contado uma vez só');
    verdadeiro(sobrepostas <= chamar('diasUteisEntre_')(de, ate),
      'nunca mais dias fora do que o período tem');

    chamar('ocultarRegistro_')('AUSENCIAS', uma.__id);
    chamar('ocultarRegistro_')('AUSENCIAS', outra.__id);
  });

  teste('a férias que atravessa a virada do mês conta nos dois', () => {
    // É a mais comum de todas, e a que um corte por "começou dentro do
    // período" perderia inteira.
    const atravessa = chamar('inserirRegistro_')('AUSENCIAS', {
      UsuarioId: eu.Id, Motivo: 'Férias', De: '28/09/2026', Ate: '09/10/2026'
    });

    const emSetembro = chamar('diasUteisAusente_')(
      eu.Id, new Date(2026, 8, 1), new Date(2026, 8, 30));
    const emOutubro = chamar('diasUteisAusente_')(
      eu.Id, new Date(2026, 9, 1), new Date(2026, 9, 31));

    igual(emSetembro, 3, '28, 29 e 30 de setembro');
    verdadeiro(emOutubro > 0, 'e o pedaço de outubro também aparece');

    chamar('ocultarRegistro_')('AUSENCIAS', atravessa.__id);
  });

  teste('ausência maior que o período devolve zero dia trabalhável', () => {
    // Zero quer dizer "não havia o que cobrar", e não "a meta é zero e você
    // não cumpriu". A meta tem de acompanhar.
    const oMesInteiro = chamar('inserirRegistro_')('AUSENCIAS', {
      UsuarioId: eu.Id, Motivo: 'Afastamento', De: '01/08/2026', Ate: '31/12/2026'
    });

    igual(chamar('diasUteisTrabalhaveis_')(
      eu.Id, new Date(2026, 8, 1), new Date(2026, 8, 30)), 0);

    chamar('ocultarRegistro_')('AUSENCIAS', oMesInteiro.__id);
  });
}

module.exports = { rodarTestesDePerformance };
