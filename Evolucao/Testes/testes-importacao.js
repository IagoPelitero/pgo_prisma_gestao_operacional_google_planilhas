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

const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario,
  ehData, lerPeca } = require('./ferramentas');

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

  // Com CANAL, agora: a divisão de um lote passou a ser só entre quem é do
  // canal escolhido, a pedido do PO. Analista sem canal não recebe nada.
  ['Marcos Vieira', 'Patrícia Nunes'].forEach((nome) => {
    chamar('salvarUsuario')({
      nome: nome,
      email: nome.split(' ')[0].toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') + '@exemplo.com',
      nivelAcessoId: nivelDaOperacao, canalId: ret.id, ativo: true
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

  secao('A mesma proposta no mesmo mês não vai para a divisão');

  /*
   * Pedido do PO: na RET, a mesma proposta foi incluída duas vezes, para
   * pessoas diferentes. A regra escolhida: código E número iguais, no MESMO
   * MÊS do caso — já na base ou repetidos no próprio arquivo. A opção vem
   * marcada na RET, e dá para desmarcar.
   */
  const cabecalhoDaProposta = ['Código origem da proposta', 'número da proposta',
    'data de recepção do protocolo', 'nome do cliente'];
  const esteMes = new Date();
  const dia = (d) => String(d).padStart(2, '0') + '/'
    + String(esteMes.getMonth() + 1).padStart(2, '0') + '/' + esteMes.getFullYear();
  const mesPassado = '15/' + String(((esteMes.getMonth() + 11) % 12) + 1).padStart(2, '0')
    + '/' + (esteMes.getMonth() === 0 ? esteMes.getFullYear() - 1 : esteMes.getFullYear());

  teste('a RET oferece a regra da proposta, e ela já vem MARCADA', () => {
    const opcoes = chamar('opcoesDaImportacaoDeCasos')(ret.id);
    verdadeiro(opcoes.repeticaoPelaProposta, 'a RET tem proposta em pedaços');
    igual(opcoes.repeticaoPadrao, '@PROPOSTA_NO_MES', 'escolha do PO: já marcado');
  });

  teste('a Mesa não tem proposta, e não ganha a opção', () => {
    const opcoes = chamar('opcoesDaImportacaoDeCasos')(mesa.id);
    igual(opcoes.repeticaoPelaProposta, false);
    igual(opcoes.repeticaoPadrao, '', 'na Mesa nada vem marcado, como antes');
  });

  teste('a mesma proposta repetida no ARQUIVO entra uma vez só', () => {
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
      fonte: colado([
        cabecalhoDaProposta,
        ['7', '4100001', dia(2), 'Primeira vez'],
        ['7', '4100001', dia(3), 'Mesma proposta, mesmo mês'],
        ['7', '4100002', dia(3), 'Outra proposta']
      ]),
      colunaQueIdentifica: '@PROPOSTA_NO_MES'
    });
    igual(laudo.vaoEntrar, 2);
    igual(laudo.motivosParaPular.repetida, 1);
  });

  teste('o repetido NÃO chega a analista nenhum — a divisão é só dos novos', () => {
    const antes = casosDaRet().length;
    const resultado = chamar('importarCasos')(ret.id, {
      fonte: colado([
        cabecalhoDaProposta,
        ['7', '4200001', dia(2), 'Proposta A'],
        ['7', '4200001', dia(2), 'Proposta A de novo'],
        ['7', '4200002', dia(2), 'Proposta B'],
        ['7', '4200002', dia(4), 'Proposta B de novo']
      ]),
      colunaQueIdentifica: '@PROPOSTA_NO_MES',
      analistas: ['Marcos Vieira', 'Patrícia Nunes'],
      origem: 'Leva com proposta repetida'
    });

    igual(resultado.entraram, 2);
    igual(resultado.pulados.repetida, 2);
    igual(casosDaRet().length, antes + 2);

    const daLeva = casosDaRet().filter((caso) =>
      caso['Origem da importação'] === 'Leva com proposta repetida');
    igual(daLeva.map((c) => c['nome do cliente']).sort().join('|'),
      'Proposta A|Proposta B', 'entra a PRIMEIRA de cada proposta');
    igual(daLeva.map((c) => c.analista).sort().join('|'),
      'Marcos Vieira|Patrícia Nunes',
      'uma para cada analista: a duplicata não ocupou a vez de ninguém');
  });

  teste('o que já está na base no mesmo mês é pulado', () => {
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
      fonte: colado([cabecalhoDaProposta, ['7', '4200001', dia(9), 'Já entrou']]),
      colunaQueIdentifica: '@PROPOSTA_NO_MES'
    });
    igual(laudo.vaoEntrar, 0);
    igual(laudo.motivosParaPular.repetida, 1);
  });

  teste('a mesma proposta em OUTRO mês é pedido novo, e entra', () => {
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
      fonte: colado([cabecalhoDaProposta, ['7', '4200001', mesPassado, 'Mês passado']]),
      colunaQueIdentifica: '@PROPOSTA_NO_MES'
    });
    igual(laudo.vaoEntrar, 1);
    igual(laudo.motivosParaPular.repetida, 0);
  });

  teste('mesmo número com OUTRO código é outra proposta, e entra', () => {
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
      fonte: colado([cabecalhoDaProposta, ['8', '4200001', dia(9), 'Outro código']]),
      colunaQueIdentifica: '@PROPOSTA_NO_MES'
    });
    igual(laudo.vaoEntrar, 1);
  });

  teste('a proposta com ponto é a MESMA proposta', () => {
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
      fonte: colado([cabecalhoDaProposta, ['7', '4.200.001', dia(9), 'Com ponto']]),
      colunaQueIdentifica: '@PROPOSTA_NO_MES'
    });
    igual(laudo.motivosParaPular.repetida, 1);
  });

  teste('caso SEM data conta pelo mês em que entrou — e repete o da base', () => {
    // O arquivo sem a data de recepção: o mês do caso é o de hoje, o mês em
    // que ele entra. E o da base que entrou sem data vale pela data da
    // importação — senão a segunda leva do mês passaria.
    const semData = ['Código origem da proposta', 'número da proposta', 'nome do cliente'];
    chamar('importarCasos')(ret.id, {
      fonte: colado([semData, ['7', '4300001', 'Sem data, primeira leva']]),
      colunaQueIdentifica: '@PROPOSTA_NO_MES',
      origem: 'Leva sem data 1'
    });
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
      fonte: colado([semData, ['7', '4300001', 'Sem data, segunda leva']]),
      colunaQueIdentifica: '@PROPOSTA_NO_MES'
    });
    igual(laudo.vaoEntrar, 0, 'a segunda leva do mês não pode dividir a mesma proposta');
    igual(laudo.motivosParaPular.repetida, 1);
  });

  teste('o laudo promete o que a gravação faz, também nesta regra', () => {
    const fonte = colado([
      cabecalhoDaProposta,
      ['7', '4200002', dia(5), 'Já na base'],
      ['7', '4400001', dia(5), 'Nova'],
      ['7', '4400001', dia(6), 'Nova de novo'],
      ['7', '4200002', mesPassado, 'Outro mês']
    ]);
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id,
      { fonte: fonte, colunaQueIdentifica: '@PROPOSTA_NO_MES' });
    const resultado = chamar('importarCasos')(ret.id, {
      fonte: fonte, colunaQueIdentifica: '@PROPOSTA_NO_MES',
      origem: 'Leva conferida pela proposta'
    });
    igual(laudo.vaoEntrar, 2);
    igual(resultado.entraram, laudo.vaoEntrar, 'o laudo prometeu e a base cumpriu');
  });

  teste('DESMARCADA a opção, tudo entra — a escolha é de quem importa', () => {
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
      fonte: colado([cabecalhoDaProposta, ['7', '4200001', dia(9), 'Já entrou']]),
      colunaQueIdentifica: ''
    });
    igual(laudo.vaoEntrar, 1);
  });

  teste('a regra da proposta num canal sem proposta é recusada, dizendo o motivo', () => {
    lanca(() => chamar('conferirImportacaoDeCasos')(mesa.id, {
      fonte: colado([['Título do e-mail'], ['Qualquer']]),
      colunaQueIdentifica: '@PROPOSTA_NO_MES'
    }), 'não tem campo de proposta');
  });

  teste('a tela oferece a opção e a deixa marcada quando o servidor manda', () => {
    const tela = lerPeca('Importacao');
    contem(tela, '@PROPOSTA_NO_MES', 'a opção está na lista da tela');
    contem(tela, 'resposta.repeticaoPadrao', 'a marcação vem do servidor, não da tela');
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
    }), 'não podem receber casos do canal');
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
      nivelAcessoId: operacao.Id, ativo: true
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

  teste('quem é de OUTRO canal não aparece na lista', () => {
    /*
     * A REGRA VIROU, e virou por pedido do PO: "quero que quando for importar
     * escolha o canal e ele distribua apenas para o canal que escolhi".
     *
     * Antes a lista oferecia todo mundo e só MARCAVA quem era de outro canal
     * — proposital, para a operação em formação poder cruzar. Hoje o canal
     * TRAVA: quem não é dele não aparece e não pode ser escolhido.
     */
    chamar('salvarUsuario')({
      nome: 'Sandra da Mesa', email: 'sandra@exemplo.com',
      nivelAcessoId: nivelDaOperacao, canalId: mesa.id, ativo: true
    });

    const daRet = chamar('opcoesDaImportacaoDeCasos')(ret.id).analistas;
    verdadeiro(!daRet.some((p) => p.nome === 'Sandra da Mesa'),
      'ela é da Mesa e não pode aparecer no lote da RET: '
      + daRet.map((p) => p.nome).join(', '));
    verdadeiro(daRet.some((p) => p.nome === 'Marcos Vieira'),
      'e quem é da RET continua aparecendo');

    const daMesa = chamar('opcoesDaImportacaoDeCasos')(mesa.id).analistas;
    verdadeiro(daMesa.some((p) => p.nome === 'Sandra da Mesa'),
      'no canal dela, ela aparece');
    verdadeiro(!daMesa.some((p) => p.nome === 'Marcos Vieira'),
      'e quem é da RET não aparece no lote da Mesa');
  });

  teste('quem NÃO tem canal declarado não recebe lote de canal nenhum', () => {
    /*
     * É o caso de quem administra. Antes ele contava como "de todos os
     * canais" e aparecia no topo de todas as listas; com o canal travando,
     * ele não é de nenhum — e receber lote não é trabalho de quem administra.
     *
     * Quem quiser receber, escolhe o canal dele em Configurações › Usuários.
     * O recado da migração diz isso, para a lista não aparecer vazia sem
     * explicação numa instalação antiga.
     */
    chamar('salvarUsuario')({
      nome: 'Olívia sem canal', email: 'olivia@exemplo.com',
      nivelAcessoId: nivelDaOperacao, ativo: true
    });

    const lista = chamar('opcoesDaImportacaoDeCasos')(ret.id).analistas;
    verdadeiro(!lista.some((p) => p.nome === 'Olívia sem canal'),
      'sem canal, não entra na divisão de nenhum: '
      + lista.map((p) => p.nome).join(', '));
  });

  teste('importar no nome de quem é de outro canal é RECUSADO, com o motivo', () => {
    // E o recado diz o motivo certo. Antes dizia sempre "não estão
    // cadastrados e ativos" — e Sandra está cadastrada E ativa. Quem lesse
    // iria cadastrar de novo alguém que já existe.
    lanca(() => chamar('importarCasos')(ret.id, {
      fonte: colado([['CPF', 'nome do cliente'], ['80000000001', 'De outro canal']]),
      analistas: ['Sandra da Mesa'],
      origem: 'Lote cruzado'
    }), 'não é do canal RET');
  });

  secao('Férias e afastamento tiram da divisão, não do sistema');

  teste('quem está de férias sai da lista, e o acesso dela continua', () => {
    /*
     * Pedido do PO: "pode atribuir um flag de ativo ou férias para que ele
     * NÃO considere o analista e divida apenas por quem está ativo".
     *
     * Disponibilidade é DISTRIBUIÇÃO; `Ativo` é ACESSO. São colunas
     * diferentes de propósito: quem está de férias continua entrando no
     * sistema — quem volta precisa consultar um caso antes de reassumir.
     */
    const patricia = chamar('listarUsuarios()')
      .find((u) => u.nome === 'Patrícia Nunes');
    chamar('salvarUsuario')({
      id: patricia.id, nome: patricia.nome, email: patricia.email,
      nivelAcessoId: patricia.nivelAcessoId, canalId: ret.id, ativo: true,
      disponibilidade: 'Férias'
    });

    const lista = chamar('opcoesDaImportacaoDeCasos')(ret.id).analistas;
    verdadeiro(!lista.some((p) => p.nome === 'Patrícia Nunes'),
      'de férias, ela não recebe: ' + lista.map((p) => p.nome).join(', '));

    const depois = chamar('listarUsuarios()')
      .find((u) => u.nome === 'Patrícia Nunes');
    igual(depois.ativo, true, 'o ACESSO dela não foi tocado');
    igual(depois.recebeCasos, false);
    igual(depois.disponibilidade, 'Férias');
  });

  teste('a tela diz QUEM ficou de fora e por quê', () => {
    // Sem isto, a coordenação procura um nome que ela sabe que trabalha ali,
    // não acha, e a única conclusão possível é "o sistema está errado".
    const fora = chamar('opcoesDaImportacaoDeCasos')(ret.id).foraDaDivisao;
    const patricia = fora.find((p) => p.nome === 'Patrícia Nunes');
    verdadeiro(patricia !== undefined, 'ela precisa aparecer na lista de fora');
    igual(patricia.porque, 'Férias');
  });

  teste('marcar quem está de férias é recusado, dizendo o motivo', () => {
    lanca(() => chamar('importarCasos')(ret.id, {
      fonte: colado([['CPF'], ['80000000003']]),
      analistas: ['Patrícia Nunes'],
      origem: 'Lote para quem está fora'
    }), 'Férias');
  });

  teste('de volta das férias, ela recebe de novo', () => {
    const patricia = chamar('listarUsuarios()')
      .find((u) => u.nome === 'Patrícia Nunes');
    chamar('salvarUsuario')({
      id: patricia.id, nome: patricia.nome, email: patricia.email,
      nivelAcessoId: patricia.nivelAcessoId, canalId: ret.id, ativo: true,
      disponibilidade: 'Disponível'
    });
    const lista = chamar('opcoesDaImportacaoDeCasos')(ret.id).analistas;
    verdadeiro(lista.some((p) => p.nome === 'Patrícia Nunes'));
  });

  teste('disponibilidade em BRANCO recebe — é quem foi cadastrado antes', () => {
    /*
     * A trava da migração. Tratar o vazio como indisponível esvaziaria a
     * distribuição de uma operação inteira na primeira importação depois da
     * atualização, e ninguém ligaria a causa ao efeito.
     */
    const marcos = chamar('lerRegistros_("USUARIOS")')
      .find((u) => String(u.Nome) === 'Marcos Vieira');
    chamar('atualizarRegistro_')('USUARIOS', marcos.Id, { Disponibilidade: '' });
    chamar('esquecerEstruturaLida_()');

    const lista = chamar('opcoesDaImportacaoDeCasos')(ret.id).analistas;
    verdadeiro(lista.some((p) => p.nome === 'Marcos Vieira'),
      'vazio vale disponível');
  });

  teste('quem foi DESATIVADO sai da lista e é recusado', () => {
    // Aqui a recusa é certa: caso no nome de quem não entra mais no sistema
    // fica na planilha e invisível na fila de todo mundo.
    const sandra = chamar('listarUsuarios()')
      .find((u) => u.nome === 'Sandra da Mesa');
    chamar('desativarUsuario')(sandra.id);

    const lista = chamar('opcoesDaImportacaoDeCasos')(mesa.id).analistas;
    verdadeiro(!lista.some((p) => p.nome === 'Sandra da Mesa'),
      'saiu da lista do canal dela');

    lanca(() => chamar('importarCasos')(mesa.id, {
      fonte: colado([['SUSEP'], ['RET00J']]),
      analistas: ['Sandra da Mesa'],
      origem: 'Lote para quem saiu'
    }), 'não podem receber casos do canal');
  });

  teste('a tela mostra quem ficou de fora, e explica a lista vazia', () => {
    const tela = lerPeca('Importacao');
    contem(tela, 'function desenharQuemEstaFora');
    contem(tela, 'opcoes.foraDaDivisao');
    contem(tela, 'Continuam com acesso ao sistema; só não recebem lote.');
    contem(tela, 'CANAL de cada analista',
      'a lista vazia tem de dizer o que fazer');
  });

  teste('a tela de Usuários tem o campo de disponibilidade', () => {
    const tela = lerPeca('Configuracoes');
    contem(tela, 'function caixaDeDisponibilidade');
    contem(tela, "disponibilidade: valorDe('disponibilidade')");
    contem(tela, 'NÃO tiram o acesso',
      'a tela precisa dizer que férias não fecha a entrada');
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

  secao('A lista de quem recebe o lote');

  teste('a lista não marca mais ninguém como ausente', () => {
    /*
     * Houve aqui um bloco inteiro de testes: quem estava de férias ia para o
     * fim da lista, marcado, e o laudo avisava quantos casos ficariam parados.
     * Saiu com o calendário, a pedido do PO — "pelas regras de negócio ela não
     * será mais necessária".
     *
     * O que fica deste lado é o guarda: a marca não pode ter sobrado pela
     * metade. Campo que existe na resposta e nunca é preenchido é pior que
     * campo nenhum — a tela o lê, não encontra nada e não mostra nada, e
     * ninguém descobre que a regra saiu.
     */
    const lista = chamar('analistasParaDistribuir_')(ret);
    verdadeiro(lista.length > 0, 'a lista continua trazendo gente');

    lista.forEach((pessoa) => {
      verdadeiro(pessoa.ausente === undefined,
        pessoa.nome + ' ainda vem com a marca de ausente');
      verdadeiro(pessoa.ausenteAte === undefined);
      verdadeiro(pessoa.motivoDaAusencia === undefined);
    });

    // E a tela não pode ter ficado olhando uma marca que ninguém escreve mais.
    const tela = lerPeca('Importacao');
    verdadeiro(tela.indexOf('pessoa.ausente') < 0,
      'a tela de importação ainda procura a marca de ausente');
    verdadeiro(tela.indexOf('aviso-de-ausencia') < 0,
      'e ainda tem o recado de quantos estão fora');
  });

  teste('o laudo continua com a lista de avisos, agora vazia', () => {
    // `avisos` fica na resposta de propósito: o laudo já sabe desenhar a lista,
    // e o próximo aviso que a operação pedir entra sem mexer na tela. O que
    // não pode é a lista deixar de existir e a tela quebrar ao ler.
    const laudo = chamar('conferirImportacaoDeCasos')(ret.id, {
      fonte: colado([['CPF', 'nome do cliente'], ['11122233305', 'Sem aviso']]),
      analistas: ['Marcos Vieira']
    });
    verdadeiro(Array.isArray(laudo.avisos), 'a lista tem de existir');
    igual(laudo.avisos.length, 0);
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
