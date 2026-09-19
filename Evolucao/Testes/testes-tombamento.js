/**
 * ============================================================================
 * PGO — testes-tombamento.js · a Etapa 13
 * ============================================================================
 * Tombar é o gesto mais caro de errar do sistema. Cadastrar um caso errado se
 * conserta abrindo o caso; tombar trezentos errados se conserta apagando
 * trezentas linhas na mão, numa base que já está sendo trabalhada.
 *
 * Por isso os testes aqui cobram, acima de tudo, as RECUSAS: o de-para que não
 * leva a lugar nenhum, o analista que não existe, o lote sem nome, o limite de
 * linhas. Um tombamento que recusa cedo custa um minuto; um que aceita e grava
 * errado custa uma tarde.
 *
 * E cobram a promessa central do laudo: o número que `conferirTombamento`
 * promete é o número que `tombarCasos` grava. Se os dois contassem por regras
 * diferentes, a tela prometeria 98 e a base receberia 112 — e ninguém
 * descobriria isso olhando.
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro, lanca, comoUsuario, ehData } =
  require('./ferramentas');

function rodarTestesDeTombamento() {
  console.log('\nEtapa 13 — Tombamento');

  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');

  const ret = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');
  const mesa = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_MESA');

  // Dois analistas da RET, para o rodízio ter entre quem dividir. Sem nível
  // válido a pessoa fica cadastrada e não entra — o servidor recusa, e com
  // razão: usuário sem nível é usuário que não consegue abrir o sistema.
  const nivelDaOperacao = chamar('lerRegistros_("CATALOGO")')
    .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id;

  ['Marcos Vieira', 'Patrícia Nunes'].forEach((nome) => {
    chamar('salvarUsuario')({
      nome: nome,
      email: nome.split(' ')[0].toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') + '@exemplo.com',
      canalQueAtende: ret.nome, nivelAcessoId: nivelDaOperacao, ativo: true
    });
  });

  /** Uma base colada da outra planilha, do jeito que ela chega: com tabulação. */
  function colado(linhas) {
    return { tipo: 'colado', texto: linhas.map((l) => l.join('\t')).join('\n') };
  }

  const casosDaRet = () => chamar('lerRegistros_("BASE_RET")')
    .filter((linha) => String(linha._Visivel) !== 'NAO');

  secao('Ler a fonte');

  teste('o texto colado vira linhas e colunas, por tabulação', () => {
    const grade = chamar('separarTextoColado_')(
      'CPF\tNome\n12345678900\tMaria\n98765432100\tJoão');
    igual(grade.length, 3);
    igual(grade[0].join('|'), 'CPF|Nome');
    igual(grade[2].join('|'), '98765432100|João');
  });

  teste('ponto e vírgula também serve — é o CSV em português', () => {
    const grade = chamar('separarTextoColado_')('CPF;Nome\n12345678900;Maria');
    igual(grade[1].join('|'), '12345678900|Maria');
  });

  teste('vírgula NÃO separa: "R$ 1.234,56" é dado, não duas colunas', () => {
    // Um separador que parte o valor no meio desloca todas as colunas da linha
    // em diante — e faz isso calado, linha sim, linha não.
    const grade = chamar('separarTextoColado_')('Valor\tNome\n1234,56\tSilva, João');
    igual(grade[1].length, 2, 'duas colunas, e não quatro');
    igual(grade[1][0], '1234,56');
    igual(grade[1][1], 'Silva, João');
  });

  teste('aspas em volta do valor saem, e linha em branco não vira linha', () => {
    const grade = chamar('separarTextoColado_')('Nome;Obs\n"Maria";"disse ""oi"""\n\n');
    igual(grade.length, 2, 'a linha vazia do fim não conta');
    igual(grade[1][0], 'Maria');
    igual(grade[1][1], 'disse "oi"');
  });

  secao('Casar as colunas');

  teste('o de-para se sugere sozinho, casando nome com nome', () => {
    const laudo = chamar('conferirTombamento')(ret.id, {
      fonte: colado([
        ['CPF', 'nome do cliente', 'Coluna que o PGO não tem'],
        ['12345678900', 'Maria Silva', 'qualquer coisa']
      ])
    });

    const porFonte = {};
    laudo.dePara.forEach((par) => { porFonte[par.daFonte] = par.paraAColuna; });
    igual(porFonte['CPF'], 'CPF', 'acento e caixa não contam, como no resto');
    igual(porFonte['nome do cliente'], 'nome do cliente');
    igual(porFonte['Coluna que o PGO não tem'], '',
      'o que não casa fica em branco, e a pessoa decide');
  });

  teste('coluna preenchida pelo sistema NÃO é sugerida nem oferecida', () => {
    // Deixar a fonte escrever no carimbo do 1º contato apagaria o controle de
    // produtividade com dado de outra planilha — e apagaria calado.
    const laudo = chamar('conferirTombamento')(ret.id, {
      fonte: colado([['Data do 1º contato', 'CPF'], ['01/01/2025', '12345678900']])
    });

    const porFonte = {};
    laudo.dePara.forEach((par) => { porFonte[par.daFonte] = par.paraAColuna; });
    igual(porFonte['Data do 1º contato'], '',
      'o carimbo não pode ser sugerido como destino');
    verdadeiro(laudo.colunasDoCanal.indexOf('Data do 1º contato') < 0,
      'nem aparecer na lista que a tela oferece');
    verdadeiro(laudo.colunasDoCanal.indexOf('Origem do tombamento') < 0);
    verdadeiro(laudo.colunasDoCanal.indexOf('CPF') >= 0,
      'as colunas normais continuam lá');
  });

  secao('O laudo antes de gravar');

  teste('o laudo conta o que entra e mostra as primeiras já traduzidas', () => {
    const laudo = chamar('conferirTombamento')(ret.id, {
      fonte: colado([
        ['CPF', 'nome do cliente'],
        ['11111111111', 'Um'],
        ['22222222222', 'Dois'],
        ['33333333333', 'Três'],
        ['44444444444', 'Quatro']
      ])
    });

    igual(laudo.linhasNaFonte, 4);
    igual(laudo.vaoEntrar, 4);
    igual(laudo.vaoSerPuladas, 0);
    igual(laudo.amostra.length, 3, 'três linhas de amostra bastam para conferir');
    igual(laudo.amostra[0]['nome do cliente'], 'Um',
      'a amostra vem TRADUZIDA: é aqui que um de-para trocado aparece');
    igual(laudo.statusPadrao, 'Não trabalhado',
      'o laudo avisa com que status os casos vão nascer');
  });

  teste('linha toda em branco nem chega a ser uma linha', () => {
    // Ela cai já na separação do texto, e por isso não aparece como "pulada":
    // o laudo diz "2 linhas, 2 entram", que é a verdade. Contá-la como pulada
    // faria a pessoa procurar um problema que não existe.
    const laudo = chamar('conferirTombamento')(ret.id, {
      fonte: colado([
        ['CPF', 'nome do cliente'],
        ['11111111111', 'Um'],
        ['', ''],
        ['33333333333', 'Três']
      ])
    });
    igual(laudo.linhasNaFonte, 2, 'a linha vazia não entra na conta');
    igual(laudo.vaoEntrar, 2);
    igual(laudo.vaoSerPuladas, 0);
  });

  teste('linha com dado FORA das colunas mapeadas conta como vazia', () => {
    // Esta é a que importa: a linha existe, tem texto, mas nada dela vai para
    // coluna nenhuma do canal. Gravar isso criaria um caso em branco com Id e
    // data — uma linha que alguém teria de achar e apagar depois.
    const laudo = chamar('conferirTombamento')(ret.id, {
      fonte: colado([
        ['CPF', 'Observação que o PGO não guarda'],
        ['11111111112', 'tem dado aqui'],
        ['', 'só nesta coluna, que não vai a lugar nenhum']
      ])
    });
    igual(laudo.linhasNaFonte, 2);
    igual(laudo.vaoEntrar, 1);
    igual(laudo.motivosParaPular.vazia, 1,
      'a segunda linha não leva nada para a base');
  });

  teste('conferir NÃO grava nada', () => {
    const antes = casosDaRet().length;
    chamar('conferirTombamento')(ret.id, {
      fonte: colado([['CPF', 'nome do cliente'], ['55555555555', 'Cinco']])
    });
    igual(casosDaRet().length, antes, 'o laudo é só um laudo');
  });

  secao('Tombar');

  teste('a base entra, dividida entre os analistas em rodízio', () => {
    const antes = casosDaRet().length;
    const resultado = chamar('tombarCasos')(ret.id, {
      fonte: colado([
        ['CPF', 'nome do cliente'],
        ['10000000001', 'Cliente Um'],
        ['10000000002', 'Cliente Dois'],
        ['10000000003', 'Cliente Três'],
        ['10000000004', 'Cliente Quatro']
      ]),
      analistas: ['Marcos Vieira', 'Patrícia Nunes'],
      origem: 'Base de inadimplentes Vida Presente'
    });

    igual(resultado.entraram, 4);
    igual(casosDaRet().length, antes + 4);

    const tombados = casosDaRet().filter((linha) =>
      linha['Origem do tombamento'] === 'Base de inadimplentes Vida Presente');
    igual(tombados.length, 4);

    const porAnalista = {};
    tombados.forEach((caso) => {
      porAnalista[caso.analista] = (porAnalista[caso.analista] || 0) + 1;
    });
    igual(porAnalista['Marcos Vieira'], 2, 'divisão em partes iguais');
    igual(porAnalista['Patrícia Nunes'], 2);
  });

  teste('o caso tombado nasce com o status padrão do canal', () => {
    // É por isso que o valor padrão tem de valer no SERVIDOR: o tombamento não
    // passa por tela nenhuma, e a tela é quem preenchia o padrão antes.
    const tombados = casosDaRet().filter((linha) =>
      linha['Origem do tombamento'] === 'Base de inadimplentes Vida Presente');
    verdadeiro(tombados.every((caso) => caso.status === 'Não trabalhado'),
      'todos nascem em Não trabalhado, como a RET pediu');
  });

  teste('o lote e a data ficam gravados — é o que faz o gráfico existir', () => {
    const caso = casosDaRet().find((linha) =>
      linha['nome do cliente'] === 'Cliente Um');
    igual(caso['Origem do tombamento'], 'Base de inadimplentes Vida Presente');
    verdadeiro(ehData(caso['Data do tombamento']),
      'data de verdade, e não texto: o gráfico agrupa por dia');
  });

  teste('o caso tombado é marcado como vindo de FORA, e não da tela', () => {
    const caso = casosDaRet().find((linha) =>
      linha['nome do cliente'] === 'Cliente Um');
    igual(caso._Origem, 'PLANILHA',
      'meses depois, é isto que separa o que foi digitado do que foi tombado');
  });

  teste('a auditoria leva UMA linha por lote, não uma por caso', () => {
    // Trezentas linhas de auditoria dizendo a mesma coisa afogam as que
    // importam — e a aba de auditoria é a que mais cresce no sistema.
    const doLote = chamar('lerRegistros_("AUDITORIA")').filter((linha) =>
      String(linha.Acao) === 'caso.tombar');
    igual(doLote.length, 1);
    verdadeiro(String(doLote[0].Detalhe).indexOf('4 casos') >= 0,
      'e a linha diz quantos entraram: ' + doLote[0].Detalhe);
  });

  secao('Não repetir o que já entrou');

  teste('o que já está na base é pulado quando há coluna que identifica', () => {
    // A base é atualizada toda semana e boa parte dela repete. Sem isto, o
    // segundo tombamento duplica tudo.
    const laudo = chamar('conferirTombamento')(ret.id, {
      fonte: colado([
        ['CPF', 'nome do cliente'],
        ['10000000001', 'Cliente Um'],          // já entrou
        ['10000000009', 'Cliente Novo']         // esse não
      ]),
      colunaQueIdentifica: 'CPF'
    });
    igual(laudo.vaoEntrar, 1);
    igual(laudo.motivosParaPular.repetida, 1);
  });

  teste('CPF com máscara e sem máscara são o MESMO caso', () => {
    // A outra planilha formata do jeito dela. Tratar "100.000.000-01" como
    // diferente de "10000000001" duplicaria o caso justamente aí.
    const laudo = chamar('conferirTombamento')(ret.id, {
      fonte: colado([['CPF', 'nome do cliente'], ['100.000.000-01', 'Cliente Um']]),
      colunaQueIdentifica: 'CPF'
    });
    igual(laudo.vaoEntrar, 0);
    igual(laudo.motivosParaPular.repetida, 1);
  });

  teste('repetido DENTRO da própria leva também é pulado', () => {
    // A base de origem tem duplicata dela mesma com frequência. Conferir só
    // contra a base deixaria entrar duas cópias na mesma leva.
    const laudo = chamar('conferirTombamento')(ret.id, {
      fonte: colado([
        ['CPF', 'nome do cliente'],
        ['20000000001', 'Novo'],
        ['20000000001', 'Novo de novo']
      ]),
      colunaQueIdentifica: 'CPF'
    });
    igual(laudo.vaoEntrar, 1);
    igual(laudo.motivosParaPular.repetida, 1);
  });

  teste('o número que o laudo promete é o número que a gravação faz', () => {
    // A promessa central do laudo. Contar por uma regra e gravar por outra
    // prometeria 98 e gravaria 112, sem ninguém perceber.
    const fonte = colado([
      ['CPF', 'nome do cliente'],
      ['10000000002', 'Repetido'],      // já está na base
      ['', ''],                          // em branco
      ['30000000001', 'Novo A'],
      ['30000000002', 'Novo B'],
      ['30000000001', 'Novo A de novo']  // repetido na própria leva
    ]);
    const laudo = chamar('conferirTombamento')(ret.id,
      { fonte: fonte, colunaQueIdentifica: 'CPF' });

    const antes = casosDaRet().length;
    const resultado = chamar('tombarCasos')(ret.id, {
      fonte: fonte, colunaQueIdentifica: 'CPF', origem: 'Leva conferida'
    });

    igual(resultado.entraram, laudo.vaoEntrar, 'o laudo prometeu e a base cumpriu');
    igual(casosDaRet().length - antes, laudo.vaoEntrar);
    igual(laudo.vaoEntrar, 2, 'só os dois realmente novos');
  });

  teste('sem coluna que identifica, tudo entra — inclusive o repetido', () => {
    // É uma escolha, e às vezes a certa: a mesma pessoa pode ter dois casos.
    const antes = casosDaRet().length;
    chamar('tombarCasos')(ret.id, {
      fonte: colado([['CPF', 'nome do cliente'], ['10000000001', 'Cliente Um']]),
      origem: 'Leva sem conferir repetido'
    });
    igual(casosDaRet().length, antes + 1);
  });

  secao('As recusas');

  teste('lote sem nome é recusado — o gráfico não teria o que dizer', () => {
    lanca(() => chamar('tombarCasos')(ret.id, {
      fonte: colado([['CPF'], ['40000000001']])
    }), 'Dê um nome ao lote');
  });

  teste('de-para que não leva a coluna nenhuma é recusado', () => {
    // Sem isto, seriam trezentas linhas em branco na base operacional, que
    // alguém teria de achar e apagar uma a uma.
    lanca(() => chamar('tombarCasos')(ret.id, {
      fonte: colado([['Coluna A', 'Coluna B'], ['x', 'y']]),
      origem: 'Lote perdido'
    }), 'criaria linhas em branco');
  });

  teste('de-para apontando para coluna inexistente é recusado, dizendo quais', () => {
    lanca(() => chamar('tombarCasos')(ret.id, {
      fonte: colado([['Coluna A'], ['x']]),
      dePara: [{ daFonte: 'Coluna A', paraAColuna: 'Coluna que nunca existiu' }],
      origem: 'Lote torto'
    }), 'Coluna que nunca existiu');
  });

  teste('analista que não está cadastrado é recusado', () => {
    // Caso no nome de quem não existe some da fila de todo mundo: o escopo
    // "próprios" não acha um responsável que não está no cadastro. O caso
    // estaria na planilha e invisível no sistema.
    lanca(() => chamar('tombarCasos')(ret.id, {
      fonte: colado([['CPF'], ['50000000001']]),
      analistas: ['Fulano Que Não Existe'],
      origem: 'Lote sem dono'
    }), 'não estão cadastrados e ativos');
  });

  teste('base em que nada entraria recusa em vez de gravar zero', () => {
    lanca(() => chamar('tombarCasos')(ret.id, {
      fonte: colado([['CPF', 'nome do cliente'], ['10000000001', 'Cliente Um']]),
      colunaQueIdentifica: 'CPF',
      origem: 'Leva toda repetida'
    }), 'Nenhuma linha entraria');
  });

  teste('acima do limite de linhas, recusa e manda dividir em levas', () => {
    const muitas = [['CPF', 'nome do cliente']];
    for (let i = 0; i < 2001; i++) {
      muitas.push(['9' + String(i).padStart(9, '0'), 'Cliente ' + i]);
    }
    lanca(() => chamar('tombarCasos')(ret.id, {
      fonte: colado(muitas), origem: 'Leva gigante'
    }), 'no máximo 2000 linhas');
  });

  teste('fonte com só o cabeçalho é recusada', () => {
    lanca(() => chamar('conferirTombamento')(ret.id, {
      fonte: colado([['CPF', 'nome do cliente']])
    }), 'pelo menos duas linhas');
  });

  teste('coluna que identifica inexistente é recusada, e não ignorada', () => {
    // Ignorar deixaria o tombamento duplicar tudo em silêncio, que é
    // exatamente o que a pessoa pediu para não acontecer.
    lanca(() => chamar('conferirTombamento')(ret.id, {
      fonte: colado([['CPF'], ['60000000001']]),
      colunaQueIdentifica: 'Coluna inventada'
    }), 'não existe na aba');
  });

  secao('Quem pode tombar');

  teste('quem não tem a ação "tombar" é recusado, mesmo chamando direto', () => {
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    const permissoes = JSON.parse(operacao.Configuracao);
    verdadeiro(permissoes.acoes.indexOf('tombar') < 0,
      'a Operação não tomba: um analista não traz 300 casos para dentro');

    // E mesmo com a TELA liberada, sem a AÇÃO não passa: esconder o menu não
    // impede ninguém de chamar a função.
    permissoes.telas.push('tombamento');
    chamar('atualizarRegistro_')('CATALOGO', operacao.Id,
      { Configuracao: JSON.stringify(permissoes) });
    chamar('salvarUsuario')({
      nome: 'Analista Comum', email: 'comum@exemplo.com',
      canalQueAtende: ret.nome, nivelAcessoId: operacao.Id, ativo: true
    });

    comoUsuario(ambiente, 'comum@exemplo.com', () => {
      lanca(() => chamar('tombarCasos')(ret.id, {
        fonte: colado([['CPF'], ['70000000001']]), origem: 'Lote proibido'
      }), 'não permite');
    });
  });

  teste('a Coordenação tomba — é ela quem recebe a base e distribui', () => {
    const coordenacao = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Coordenação');
    const permissoes = JSON.parse(coordenacao.Configuracao);
    verdadeiro(permissoes.acoes.indexOf('tombar') >= 0);
    verdadeiro(permissoes.telas.indexOf('tombamento') >= 0);
  });

  secao('Quem aparece na lista de analistas');

  teste('"Canal que atende" livre não esvazia a lista de analistas', () => {
    // O bug que só o navegador mostrou: a lista só oferecia quem tivesse
    // "Canal que atende" IGUAL ao nome do canal. O campo é de digitar livre, e
    // a operação escreve nele "Vida Individual", "Vida em Grupo" — quase nunca
    // o nome do canal do PGO. A tela dizia "nenhum analista cadastrado" numa
    // operação cheia de analistas.
    chamar('salvarUsuario')({
      nome: 'Sandra do Vida em Grupo', email: 'sandra@exemplo.com',
      canalQueAtende: 'Vida em Grupo',     // não é o nome de canal nenhum
      nivelAcessoId: nivelDaOperacao, ativo: true
    });

    const lista = chamar('opcoesDoTombamento')(ret.id).analistas;
    const sandra = lista.find((p) => p.nome === 'Sandra do Vida em Grupo');
    verdadeiro(sandra !== undefined,
      'ela precisa aparecer: ' + lista.map((p) => p.nome).join(', '));
    igual(sandra.atendeEsteCanal, false, 'marcada como de outro canal');

    const marcos = lista.find((p) => p.nome === 'Marcos Vieira');
    igual(marcos.atendeEsteCanal, true, 'e quem é do canal vem marcado');
  });

  teste('quem é do canal vem primeiro na lista', () => {
    // A ordem é a sugestão. Quem atende este canal é a escolha esperada; os
    // outros continuam disponíveis, mais abaixo.
    const lista = chamar('opcoesDoTombamento')(ret.id).analistas;
    const primeiroDeFora = lista.findIndex((p) => !p.atendeEsteCanal);
    const ultimoDeDentro = lista.map((p) => p.atendeEsteCanal).lastIndexOf(true);
    verdadeiro(primeiroDeFora < 0 || ultimoDeDentro < primeiroDeFora,
      'ninguém de fora pode aparecer antes de alguém de dentro');
  });

  teste('tombar no nome de quem é de outro canal é PERMITIDO', () => {
    // Enquanto a operação está se formando, um analista da RET pode receber um
    // lote da Mesa. Quem decide isso é a coordenação, não o sistema.
    const resultado = chamar('tombarCasos')(ret.id, {
      fonte: colado([['CPF', 'nome do cliente'], ['80000000001', 'De outro canal']]),
      analistas: ['Sandra do Vida em Grupo'],
      origem: 'Lote cruzado'
    });
    igual(resultado.entraram, 1);
    const caso = casosDaRet().find((linha) =>
      linha['nome do cliente'] === 'De outro canal');
    igual(caso.analista, 'Sandra do Vida em Grupo');
  });

  teste('quem foi DESATIVADO sai da lista e é recusado', () => {
    // Aqui a recusa é certa: caso no nome de quem não entra mais no sistema
    // fica na planilha e invisível na fila de todo mundo.
    const sandra = chamar('listarUsuarios()')
      .find((u) => u.nome === 'Sandra do Vida em Grupo');
    chamar('desativarUsuario')(sandra.id);

    const lista = chamar('opcoesDoTombamento')(ret.id).analistas;
    verdadeiro(!lista.some((p) => p.nome === 'Sandra do Vida em Grupo'),
      'saiu da lista');

    lanca(() => chamar('tombarCasos')(ret.id, {
      fonte: colado([['CPF'], ['80000000002']]),
      analistas: ['Sandra do Vida em Grupo'],
      origem: 'Lote para quem saiu'
    }), 'não estão cadastrados e ativos');
  });

  secao('A Mesa Diamante também tomba');

  teste('a Mesa tomba casos de corretoras, com as colunas dela', () => {
    const resultado = chamar('tombarCasos')(mesa.id, {
      fonte: colado([
        ['Corretora', 'Nome do segurado', 'SUSEP'],
        ['Corretora Alfa', 'Segurado Um', '12345678901'],
        ['Corretora Beta', 'Segurado Dois', '10987654321']
      ]),
      origem: 'Corretoras para ação diferenciada'
    });

    igual(resultado.entraram, 2);
    const tombados = chamar('lerRegistros_("BASE_MESA")').filter((linha) =>
      linha['Origem do tombamento'] === 'Corretoras para ação diferenciada');
    igual(tombados.length, 2);
    igual(tombados[0].Corretora, 'Corretora Alfa');
    igual(tombados[0].Status, 'Em andamento', 'o padrão da Mesa, não o da RET');
  });

  secao('Os lotes já tombados');

  teste('a tela sabe quais lotes já entraram, e quantos casos cada um', () => {
    // Serve para oferecer o nome que já existe: tombar a mesma base toda
    // semana com o nome escrito diferente mostraria cinco lotes onde há um.
    const lotes = chamar('lotesJaTombados')(ret.id);
    const porNome = {};
    lotes.forEach((lote) => { porNome[lote.origem] = lote.casos; });

    igual(porNome['Base de inadimplentes Vida Presente'], 4);
    igual(porNome['Leva conferida'], 2);
    verdadeiro(lotes[0].casos >= lotes[lotes.length - 1].casos,
      'o maior lote vem primeiro');
  });

  teste('a Produtividade RECC mostra o tombamento por dia e por base', () => {
    // O pedido literal: "no dia 05 incluímos 100 casos da base de
    // inadimplentes Vida Presente". São duas perguntas, e dois gráficos.
    const painel = chamar('painelAnalitico')(ret.id, {}, 30);
    const titulos = painel.componentes.map((c) => c.titulo);
    verdadeiro(titulos.indexOf('Casos tombados por dia') >= 0, titulos.join(' | '));
    verdadeiro(titulos.indexOf('De qual base os casos vieram') >= 0);

    const porBase = painel.componentes.find((c) =>
      c.titulo === 'De qual base os casos vieram');
    const doLote = porBase.pontos.find((p) =>
      p.rotulo === 'Base de inadimplentes Vida Presente');
    verdadeiro(doLote !== undefined,
      'o lote precisa aparecer no gráfico: ' + porBase.pontos.map((p) => p.rotulo));
    igual(doLote.valor, 4);
  });
}

module.exports = { rodarTestesDeTombamento };
