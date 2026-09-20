/**
 * ============================================================================
 * PGO — testes-importacao.js · a Etapa 13
 * ============================================================================
 * Importar é o gesto mais caro de errar do sistema. Cadastrar um caso errado se
 * conserta abrindo o caso; importar trezentos errados se conserta apagando
 * trezentas linhas na mão, numa base que já está sendo trabalhada.
 *
 * Por isso os testes aqui cobram, acima de tudo, as RECUSAS: o de-para que não
 * leva a lugar nenhum, o analista que não existe, o lote sem nome, o limite de
 * linhas. Uma importação que recusa cedo custa um minuto; um que aceita e grava
 * errado custa uma tarde.
 *
 * E cobram a promessa central do laudo: o número que `conferirImportacaoDeCasos`
 * promete é o número que `importarCasos` grava. Se os dois contassem por regras
 * diferentes, a tela prometeria 98 e a base receberia 112 — e ninguém
 * descobriria isso olhando.
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro, lanca, comoUsuario, ehData,
  lerPeca } = require('./ferramentas');

function rodarTestesDeImportacao() {
  console.log('\nEtapa 13 — Importação');

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
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
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

  teste('o carimbo NÃO é sugerido sozinho, mas PODE ser escolhido', () => {
    /*
     * Esta era uma regra só, e o PO pediu para separá-la em duas.
     *
     * SUGERIR continua proibido: uma coluna da fonte chamada "Data do 1º
     * contato" casando sozinha escreveria no controle de produtividade sem
     * ninguém decidir isso.
     *
     * ESCOLHER passou a poder. Sem isso, 300 casos trazidos da base antiga
     * entravam sem data de contato, e a Produtividade RECC dizia "Já
     * contatados: 0" para uma leva inteira que TINHA sido contatada — com a
     * data guardada na planilha de origem, sem forma de entrar.
     */
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
      fonte: colado([['Data do 1º contato', 'CPF'], ['01/01/2025', '12345678900']])
    });

    const porFonte = {};
    laudo.dePara.forEach((par) => { porFonte[par.daFonte] = par.paraAColuna; });
    igual(porFonte['Data do 1º contato'], '',
      'o carimbo não pode ser SUGERIDO como destino');
    verdadeiro(laudo.colunasDoCanal.indexOf('Data do 1º contato') >= 0,
      'mas tem de estar na lista que a tela OFERECE');
    verdadeiro(laudo.colunasDoCanal.indexOf('CPF') >= 0,
      'as colunas normais continuam lá');
  });

  teste('o rastro do próprio lote continua fora das DUAS listas', () => {
    // Origem e Data da importação são como o sistema sabe de onde cada caso
    // veio. Deixar a fonte escrevê-las apagaria a única resposta que existe
    // para "de que lote é este caso?".
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
      fonte: colado([
        ['Origem da importação', 'Data da importação', 'CPF'],
        ['Lote falso', '01/01/2025', '12345678900']
      ])
    });

    const porFonte = {};
    laudo.dePara.forEach((par) => { porFonte[par.daFonte] = par.paraAColuna; });
    igual(porFonte['Origem da importação'], '', 'não sugerida');
    igual(porFonte['Data da importação'], '', 'não sugerida');
    verdadeiro(laudo.colunasDoCanal.indexOf('Origem da importação') < 0,
      'nem oferecida');
    verdadeiro(laudo.colunasDoCanal.indexOf('Data da importação') < 0,
      'nem oferecida');
  });



  secao('O laudo antes de gravar');

  teste('o laudo conta o que entra e mostra as primeiras já traduzidas', () => {
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
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
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
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
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
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
    chamar('conferirImportacaoDeCasos')(ret.id, {
      fonte: colado([['CPF', 'nome do cliente'], ['55555555555', 'Cinco']])
    });
    igual(casosDaRet().length, antes, 'o laudo é só um laudo');
  });

  secao('Importar');

  teste('a base entra, dividida entre os analistas em rodízio', () => {
    const antes = casosDaRet().length;
    const resultado = chamar('importarCasos')(ret.id, {
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

    const importados = casosDaRet().filter((linha) =>
      linha['Origem da importação'] === 'Base de inadimplentes Vida Presente');
    igual(importados.length, 4);

    const porAnalista = {};
    importados.forEach((caso) => {
      porAnalista[caso.analista] = (porAnalista[caso.analista] || 0) + 1;
    });
    igual(porAnalista['Marcos Vieira'], 2, 'divisão em partes iguais');
    igual(porAnalista['Patrícia Nunes'], 2);
  });

  teste('o caso importado nasce com o status padrão do canal', () => {
    // É por isso que o valor padrão tem de valer no SERVIDOR: a importação não
    // passa por tela nenhuma, e a tela é quem preenchia o padrão antes.
    const importados = casosDaRet().filter((linha) =>
      linha['Origem da importação'] === 'Base de inadimplentes Vida Presente');
    verdadeiro(importados.every((caso) => caso.status === 'Não trabalhado'),
      'todos nascem em Não trabalhado, como a RET pediu');
  });

  teste('o lote e a data ficam gravados — é o que faz o gráfico existir', () => {
    const caso = casosDaRet().find((linha) =>
      linha['nome do cliente'] === 'Cliente Um');
    igual(caso['Origem da importação'], 'Base de inadimplentes Vida Presente');
    verdadeiro(ehData(caso['Data da importação']),
      'data de verdade, e não texto: o gráfico agrupa por dia');
  });

  teste('o caso importado é marcado como vindo de FORA, e não da tela', () => {
    const caso = casosDaRet().find((linha) =>
      linha['nome do cliente'] === 'Cliente Um');
    igual(caso._Origem, 'PLANILHA',
      'meses depois, é isto que separa o que foi digitado do que foi importado');
  });

  teste('a auditoria leva UMA linha por lote, não uma por caso', () => {
    // Trezentas linhas de auditoria dizendo a mesma coisa afogam as que
    // importam — e a aba de auditoria é a que mais cresce no sistema.
    const doLote = chamar('lerRegistros_("AUDITORIA")').filter((linha) =>
      String(linha.Acao) === 'caso.importar');
    igual(doLote.length, 1);
    verdadeiro(String(doLote[0].Detalhe).indexOf('4 casos') >= 0,
      'e a linha diz quantos entraram: ' + doLote[0].Detalhe);
  });

  secao('Não repetir o que já entrou');

  teste('o que já está na base é pulado quando há coluna que identifica', () => {
    // A base é atualizada toda semana e boa parte dela repete. Sem isto, o
    // segunda importação duplica tudo.
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
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
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
      fonte: colado([['CPF', 'nome do cliente'], ['100.000.000-01', 'Cliente Um']]),
      colunaQueIdentifica: 'CPF'
    });
    igual(laudo.vaoEntrar, 0);
    igual(laudo.motivosParaPular.repetida, 1);
  });

  teste('repetido DENTRO da própria leva também é pulado', () => {
    // A base de origem tem duplicata dela mesma com frequência. Conferir só
    // contra a base deixaria entrar duas cópias na mesma leva.
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
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
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id,
      { fonte: fonte, colunaQueIdentifica: 'CPF' });

    const antes = casosDaRet().length;
    const resultado = chamar('importarCasos')(ret.id, {
      fonte: fonte, colunaQueIdentifica: 'CPF', origem: 'Leva conferida'
    });

    igual(resultado.entraram, laudo.vaoEntrar, 'o laudo prometeu e a base cumpriu');
    igual(casosDaRet().length - antes, laudo.vaoEntrar);
    igual(laudo.vaoEntrar, 2, 'só os dois realmente novos');
  });

  teste('sem coluna que identifica, tudo entra — inclusive o repetido', () => {
    // É uma escolha, e às vezes a certa: a mesma pessoa pode ter dois casos.
    const antes = casosDaRet().length;
    chamar('importarCasos')(ret.id, {
      fonte: colado([['CPF', 'nome do cliente'], ['10000000001', 'Cliente Um']]),
      origem: 'Leva sem conferir repetido'
    });
    igual(casosDaRet().length, antes + 1);
  });

  secao('As recusas');

  teste('lote sem nome é recusado — o gráfico não teria o que dizer', () => {
    lanca(() => chamar('importarCasos')(ret.id, {
      fonte: colado([['CPF'], ['40000000001']])
    }), 'Dê um nome ao lote');
  });

  teste('de-para que não leva a coluna nenhuma é recusado', () => {
    // Sem isto, seriam trezentas linhas em branco na base operacional, que
    // alguém teria de achar e apagar uma a uma.
    lanca(() => chamar('importarCasos')(ret.id, {
      fonte: colado([['Coluna A', 'Coluna B'], ['x', 'y']]),
      origem: 'Lote perdido'
    }), 'criaria linhas em branco');
  });

  teste('de-para apontando para coluna inexistente é recusado, dizendo quais', () => {
    lanca(() => chamar('importarCasos')(ret.id, {
      fonte: colado([['Coluna A'], ['x']]),
      dePara: [{ daFonte: 'Coluna A', paraAColuna: 'Coluna que nunca existiu' }],
      origem: 'Lote torto'
    }), 'Coluna que nunca existiu');
  });

  teste('analista que não está cadastrado é recusado', () => {
    // Caso no nome de quem não existe some da fila de todo mundo: o escopo
    // "próprios" não acha um responsável que não está no cadastro. O caso
    // estaria na planilha e invisível no sistema.
    lanca(() => chamar('importarCasos')(ret.id, {
      fonte: colado([['CPF'], ['50000000001']]),
      analistas: ['Fulano Que Não Existe'],
      origem: 'Lote sem dono'
    }), 'não estão cadastrados e ativos');
  });

  teste('base em que nada entraria recusa em vez de gravar zero', () => {
    lanca(() => chamar('importarCasos')(ret.id, {
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
    lanca(() => chamar('importarCasos')(ret.id, {
      fonte: colado(muitas), origem: 'Leva gigante'
    }), 'no máximo 2000 linhas');
  });

  teste('fonte com só o cabeçalho é recusada', () => {
    lanca(() => chamar('conferirImportacaoDeCasos')(ret.id, {
      fonte: colado([['CPF', 'nome do cliente']])
    }), 'pelo menos duas linhas');
  });

  teste('coluna que identifica inexistente é recusada, e não ignorada', () => {
    // Ignorar deixaria a importação duplicar tudo em silêncio, que é
    // exatamente o que a pessoa pediu para não acontecer.
    lanca(() => chamar('conferirImportacaoDeCasos')(ret.id, {
      fonte: colado([['CPF'], ['60000000001']]),
      colunaQueIdentifica: 'Coluna inventada'
    }), 'não existe na aba');
  });

  secao('Quem pode importar');

  teste('quem não tem a ação "importar" é recusado, mesmo chamando direto', () => {
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    const permissoes = JSON.parse(operacao.Configuracao);
    verdadeiro(permissoes.acoes.indexOf('importar') < 0,
      'a Operação não importa: um analista não traz 300 casos para dentro');

    // E mesmo com a TELA liberada, sem a AÇÃO não passa: esconder o menu não
    // impede ninguém de chamar a função.
    permissoes.telas.push('importacao');
    chamar('atualizarRegistro_')('CATALOGO', operacao.Id,
      { Configuracao: JSON.stringify(permissoes) });
    chamar('salvarUsuario')({
      nome: 'Analista Comum', email: 'comum@exemplo.com',
      canalQueAtende: ret.nome, nivelAcessoId: operacao.Id, ativo: true
    });

    comoUsuario(ambiente, 'comum@exemplo.com', () => {
      lanca(() => chamar('importarCasos')(ret.id, {
        fonte: colado([['CPF'], ['70000000001']]), origem: 'Lote proibido'
      }), 'não permite');
    });
  });

  teste('a Coordenação importa — é ela quem recebe a base e distribui', () => {
    const coordenacao = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Coordenação');
    const permissoes = JSON.parse(coordenacao.Configuracao);
    verdadeiro(permissoes.acoes.indexOf('importar') >= 0);
    verdadeiro(permissoes.telas.indexOf('importacao') >= 0);
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

    const lista = chamar('opcoesDaImportacaoDeCasos')(ret.id).analistas;
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
    const lista = chamar('opcoesDaImportacaoDeCasos')(ret.id).analistas;
    const primeiroDeFora = lista.findIndex((p) => !p.atendeEsteCanal);
    const ultimoDeDentro = lista.map((p) => p.atendeEsteCanal).lastIndexOf(true);
    verdadeiro(primeiroDeFora < 0 || ultimoDeDentro < primeiroDeFora,
      'ninguém de fora pode aparecer antes de alguém de dentro');
  });

  teste('importar no nome de quem é de outro canal é PERMITIDO', () => {
    // Enquanto a operação está se formando, um analista da RET pode receber um
    // lote da Mesa. Quem decide isso é a coordenação, não o sistema.
    const resultado = chamar('importarCasos')(ret.id, {
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

    const lista = chamar('opcoesDaImportacaoDeCasos')(ret.id).analistas;
    verdadeiro(!lista.some((p) => p.nome === 'Sandra do Vida em Grupo'),
      'saiu da lista');

    lanca(() => chamar('importarCasos')(ret.id, {
      fonte: colado([['CPF'], ['80000000002']]),
      analistas: ['Sandra do Vida em Grupo'],
      origem: 'Lote para quem saiu'
    }), 'não estão cadastrados e ativos');
  });

  secao('A Mesa Diamante também importa');

  teste('a Mesa importa casos de corretoras, com as colunas dela', () => {
    const resultado = chamar('importarCasos')(mesa.id, {
      fonte: colado([
        ['Corretora', 'Nome do segurado', 'SUSEP'],
        ['Corretora Alfa', 'Segurado Um', '12345678901'],
        ['Corretora Beta', 'Segurado Dois', '10987654321']
      ]),
      origem: 'Corretoras para ação diferenciada'
    });

    igual(resultado.entraram, 2);
    const importados = chamar('lerRegistros_("BASE_MESA")').filter((linha) =>
      linha['Origem da importação'] === 'Corretoras para ação diferenciada');
    igual(importados.length, 2);
    igual(importados[0].Corretora, 'Corretora Alfa');
    igual(importados[0].Status, 'Em andamento', 'o padrão da Mesa, não o da RET');
  });

  secao('Os lotes já importados');

  teste('a tela sabe quais lotes já entraram, e quantos casos cada um', () => {
    // Serve para oferecer o nome que já existe: importar a mesma base toda
    // semana com o nome escrito diferente mostraria cinco lotes onde há um.
    const lotes = chamar('lotesJaImportados')(ret.id);
    const porNome = {};
    lotes.forEach((lote) => { porNome[lote.origem] = lote.casos; });

    igual(porNome['Base de inadimplentes Vida Presente'], 4);
    igual(porNome['Leva conferida'], 2);
    verdadeiro(lotes[0].casos >= lotes[lotes.length - 1].casos,
      'o maior lote vem primeiro');
  });

  teste('a Produtividade RECC mostra a importação por dia e por base', () => {
    // O pedido literal: "no dia 05 incluímos 100 casos da base de
    // inadimplentes Vida Presente". São duas perguntas, e dois gráficos.
    const painel = chamar('produtividadeDaEquipe')(ret.id, {}, 30);
    const titulos = painel.componentes.map((c) => c.titulo);
    verdadeiro(titulos.indexOf('Casos importados por dia') >= 0, titulos.join(' | '));
    verdadeiro(titulos.indexOf('De qual base os casos vieram') >= 0);

    const porBase = painel.componentes.find((c) =>
      c.titulo === 'De qual base os casos vieram');
    const doLote = porBase.pontos.find((p) =>
      p.rotulo === 'Base de inadimplentes Vida Presente');
    verdadeiro(doLote !== undefined,
      'o lote precisa aparecer no gráfico: ' + porBase.pontos.map((p) => p.rotulo));
    igual(doLote.valor, 4);
  });

  secao('Quem está de férias não entra no rodízio');

  /*
   * Pedido do PO, depois que o calendário nasceu. O problema é concreto:
   * importar 300 casos numa segunda com dois analistas fora deixa 75 casos
   * parados três semanas — e NADA no sistema avisa. Os casos estão lá, no nome
   * de alguém, dentro do prazo, e ninguém os trabalha. Quem descobre é o
   * cliente, ligando.
   */

  const hoje = new Date();
  const escreverData = (d) => String(d.getDate()).padStart(2, '0') + '/'
    + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  const daquiADias = (dias) => {
    const quando = new Date(hoje);
    quando.setDate(quando.getDate() + dias);
    return escreverData(quando);
  };

  /** Põe alguém de férias a partir de hoje, e devolve como desfazer. */
  function ferias(nome, dias) {
    const pessoa = chamar('lerRegistros_("USUARIOS")')
      .find((u) => String(u.Nome) === nome);
    const criada = chamar('salvarAusencia')({
      usuarioId: pessoa.Id, motivo: 'Férias',
      de: escreverData(hoje), ate: daquiADias(dias)
    });
    return () => chamar('excluirAusencia')(criada.id);
  }

  teste('quem está fora hoje vai para o FIM da lista, marcado', () => {
    const desfazer = ferias('Marcos Vieira', 12);

    const lista = chamar('analistasParaDistribuir_')(ret);
    const marcos = lista.find((um) => um.nome === 'Marcos Vieira');

    igual(marcos.ausente, true);
    igual(marcos.ausenteAte, daquiADias(12));
    igual(marcos.motivoDaAusencia, 'Férias');
    igual(lista[lista.length - 1].nome, 'Marcos Vieira',
      'a ordem é o primeiro aviso, antes de alguém ler a marca');

    desfazer();
  });

  teste('quem NÃO está fora continua limpo, sem marca nenhuma', () => {
    // O contrário também precisa ser verdade: uma marca que aparece em todo
    // mundo não marca ninguém.
    const desfazer = ferias('Marcos Vieira', 12);

    const patricia = chamar('analistasParaDistribuir_')(ret)
      .find((um) => um.nome === 'Patrícia Nunes');
    igual(patricia.ausente, false);
    igual(patricia.ausenteAte, '');

    desfazer();
  });

  teste('a ausência que JÁ PASSOU não marca ninguém', () => {
    // Férias do mês passado não impedem ninguém de receber caso hoje.
    const pessoa = chamar('lerRegistros_("USUARIOS")')
      .find((u) => String(u.Nome) === 'Marcos Vieira');
    const passada = chamar('salvarAusencia')({
      usuarioId: pessoa.Id, motivo: 'Férias',
      de: daquiADias(-40), ate: daquiADias(-20)
    });

    const marcos = chamar('analistasParaDistribuir_')(ret)
      .find((um) => um.nome === 'Marcos Vieira');
    igual(marcos.ausente, false, 'férias que acabou não tira ninguém do rodízio');

    chamar('excluirAusencia')(passada.id);
  });

  teste('marcar quem está fora NÃO é recusado — mas o laudo diz', () => {
    /*
     * Recusar seria errado: o lote pode ser justamente para quando a pessoa
     * voltar, e quem decide isso é a coordenação. O que o sistema faz é o que
     * esta tela inteira existe para fazer — mostrar antes de gravar.
     */
    const desfazer = ferias('Marcos Vieira', 12);

    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
      fonte: colado([
        ['CPF', 'nome do cliente'],
        ['11122233301', 'Cliente de férias 1'],
        ['11122233302', 'Cliente de férias 2'],
        ['11122233303', 'Cliente de férias 3'],
        ['11122233304', 'Cliente de férias 4']
      ]),
      analistas: ['Marcos Vieira', 'Patrícia Nunes']
    });

    igual(laudo.avisos.length, 1, 'um aviso, para a pessoa que está fora');
    verdadeiro(laudo.avisos[0].indexOf('Marcos Vieira') === 0,
      'o aviso começa pelo nome: ' + laudo.avisos[0]);
    verdadeiro(laudo.avisos[0].indexOf(daquiADias(12)) > 0,
      'e diz até quando');
    verdadeiro(laudo.avisos[0].indexOf('2 caso(s)') > 0,
      'e quantos casos ficam parados: ' + laudo.avisos[0]);
    verdadeiro(laudo.vaoEntrar > 0, 'e a importação segue possível');

    desfazer();
  });

  teste('sem ninguém de férias, o laudo não inventa aviso', () => {
    // Aviso que aparece sempre deixa de ser lido — e aí o dia em que ele
    // importa passa batido.
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
      fonte: colado([['CPF', 'nome do cliente'], ['11122233305', 'Sem aviso']]),
      analistas: ['Marcos Vieira', 'Patrícia Nunes']
    });
    igual(laudo.avisos.length, 0);
  });

  teste('a tela mostra a marca, e avisa quantos estão fora', () => {
    const tela = lerPeca('Importacao');
    verdadeiro(tela.indexOf('pessoa.ausente') > 0, 'a tela olha a marca');
    verdadeiro(tela.indexOf('pessoa.ausenteAte') > 0, 'e mostra até quando');
    verdadeiro(tela.indexOf('aviso-de-ausencia') > 0, 'com o recado de quantos');
    verdadeiro(lerPeca('Estilos').indexOf('.config-chave.esta-fora') > 0,
      'e a marca tem estilo declarado');
  });

  secao('O carimbo trazido da base antiga');

  // Estes dois GRAVAM, e por isso estão no fim do arquivo: teste que escreve
  // muda a contagem de quem vem depois, e vários aqui conferem total. Pôr no
  // meio quebrou três testes alheios que não tinham nada de errado.

  teste('o servidor diz QUAIS colunas são carimbo, e a tela marca cada uma', () => {
    /*
     * As duas pontas, porque só uma não serve de nada: se o servidor mandasse
     * a lista e a tela não a lesse, a pessoa escolheria "Data do 1º contato"
     * achando que é uma coluna qualquer — e escreveria no controle de
     * produtividade sem saber.
     *
     * Este passo da tela NÃO aparece na prévia: o de-para só existe depois de
     * conferir, e a prévia recusa conferir de propósito (não há servidor para
     * ler o que foi colado, e um laudo inventado ensinaria a confiar nele).
     * Então aqui é o único lugar que olha para isso.
     */
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
      fonte: colado([['CPF', 'nome do cliente'], ['44455566677', 'Alguém']])
    });

    verdadeiro(laudo.colunasDeCarimbo.indexOf('Data do 1º contato') >= 0,
      'o carimbo tem de vir marcado: ' + laudo.colunasDeCarimbo.join(', '));
    verdadeiro(laudo.colunasDeCarimbo.indexOf('CPF') < 0,
      'e uma coluna comum não pode entrar na lista');
    laudo.colunasDeCarimbo.forEach((coluna) => {
      verdadeiro(laudo.colunasDoCanal.indexOf(coluna) >= 0,
        coluna + ' está marcada como carimbo mas nem é oferecida');
    });

    const tela = lerPeca('Importacao');
    verdadeiro(tela.indexOf('opcoes.colunasDeCarimbo') > 0,
      'a tela tem de ler a lista que o servidor manda');
    verdadeiro(tela.indexOf('controle de produtividade') > 0,
      'e dizer isso na própria opção');
    verdadeiro(tela.indexOf('aviso-de-carimbo') > 0,
      'com o recado quando alguém escolhe uma');
  });

  teste('e o SERVIDOR recusa, mesmo com o de-para montado na mão', () => {
    /*
     * A trava só perguntava se a coluna EXISTE na aba. A origem e a data da
     * importação, que a tela nunca ofereceu, podiam ser escritas por quem
     * montasse o de-para por fora — a proteção do rastro do lote era um
     * combinado visual, e combinado visual não é trava.
     *
     * Passou a importar de verdade agora que o carimbo virou destino
     * escolhível: a linha entre "pode escolher" e "nunca" tem de ser a mesma
     * na tela e no servidor.
     */
    lanca(() => chamar('importarCasos')(ret.id, {
      fonte: colado([['de onde veio', 'CPF'], ['Lote inventado', '77788899900']]),
      dePara: [
        { daFonte: 'de onde veio', paraAColuna: 'Origem da importação' },
        { daFonte: 'CPF', paraAColuna: 'CPF' }
      ],
      origem: 'Lote de verdade'
    }), 'rastro do lote', 'a origem da importação não pode vir da fonte');

    // E o carimbo, que É permitido, continua passando pela mesma trava.
    chamar('importarCasos')(ret.id, {
      fonte: colado([['quando falamos', 'CPF'], ['11/07/2026', '77788899901']]),
      dePara: [
        { daFonte: 'quando falamos', paraAColuna: 'Data do 1º contato' },
        { daFonte: 'CPF', paraAColuna: 'CPF' }
      ],
      origem: 'Lote com carimbo'
    });

    const gravado = chamar('lerRegistros_("BASE_RET")')
      .find((linha) => String(linha.CPF) === '77788899901');
    igual(String(gravado[chamar('RECC_COLUNA_ORIGEM_DA_IMPORTACAO')]),
      'Lote com carimbo',
      'o rastro continua sendo o que o SISTEMA escreveu');
  });

  teste('escolhido o carimbo, o caso importado JÁ CONTA como contatado', () => {
    /*
     * É o pedido inteiro, de ponta a ponta: o número que estava errado tem de
     * ficar certo. Não basta a coluna ser escolhível — o dado tem de chegar na
     * base e a Produtividade RECC tem de contá-lo.
     */
    const antes = chamar('produtividadeDaEquipe')(ret.id, {}, 3650)
      .cartoes.find((c) => c.chave === 'datado1contato');

    chamar('importarCasos')(ret.id, {
      fonte: colado([
        ['quando falamos', 'CPF', 'nome do cliente'],
        ['10/07/2026', '99911122233', 'Contatado na base antiga']
      ]),
      dePara: [
        { daFonte: 'quando falamos', paraAColuna: 'Data do 1º contato' },
        { daFonte: 'CPF', paraAColuna: 'CPF' },
        { daFonte: 'nome do cliente', paraAColuna: 'nome do cliente' }
      ],
      origem: 'Base antiga com contatos'
    });

    const gravado = chamar('lerRegistros_("BASE_RET")')
      .find((linha) => String(linha['nome do cliente']) === 'Contatado na base antiga');
    verdadeiro(ehData(gravado['Data do 1º contato']),
      'a data da base antiga tem de chegar como DATA, não como texto');

    const depois = chamar('produtividadeDaEquipe')(ret.id, {}, 3650)
      .cartoes.find((c) => c.chave === 'datado1contato');
    igual(depois.valor, antes.valor + 1,
      'e o cartão "Já contatados" tem de subir — era isso que estava errado');
  });

}

module.exports = { rodarTestesDeImportacao };
