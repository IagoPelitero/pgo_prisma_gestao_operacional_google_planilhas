/**
 * ============================================================================
 * PGO — testes-cadastros-de-fora.js · a Etapa 14
 * ============================================================================
 * Duas bases: a OPERACIONAL, que guarda caso, e a de CADASTROS, que guarda
 * corretora, SUSEP bloqueada, produto e as duas listas de analista.
 *
 * A segunda existe por dois motivos. O primeiro é tamanho: as 7 mil SUSEPs e
 * as 145 corretoras sozinhas ocupam um pedaço considerável do teto de 10
 * milhões de células, e tirá-las daqui deixa espaço para o que a planilha
 * existe para guardar. O segundo é dono: esses cadastros são mantidos por
 * outras áreas, e manter a mesma lista em dois lugares é garantir que um dia
 * elas divirjam.
 *
 * O QUE ESTES TESTES COBRAM, acima de tudo, é que ligar a segunda base não
 * mude o comportamento de nada: as mesmas telas, as mesmas funções, os mesmos
 * números — lendo de outro lugar. E que, quando ela não abrir, o sistema PARE
 * com o motivo em vez de devolver lista vazia. Lista vazia aqui seria
 * "nenhuma SUSEP está bloqueada": uma afirmação falsa que a operação
 * acreditaria, e que deixaria passar um caso que devia ser barrado.
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro, contem, lanca } =
  require('./ferramentas');

function rodarTestesDeCadastrosDeFora() {
  console.log('\nEtapa 14 — A segunda base');

  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');

  /** Uma planilha de cadastros completa, como a operação vai montar. */
  function planilhaDeCadastros(ajustes) {
    const abas = {
      // As colunas de CONTROLE entram: é o que permite ao PGO gravar nelas.
      // Sem elas a aba abre só para leitura, e há testes para esse caso.
      CORRETORAS: [
        ['Id', 'Nome', 'Canal', 'SUSEP', 'Corretora', 'Segmento', 'Consultor',
          '_Visivel', '_ExcluidoEm', '_ExcluidoPor', '_Origem'],
        ['0000000001', 'Corretora de Fora', 'Corretor', '11122233344',
          'Corretora de Fora', 'Diamante', 'Consultor Um', 'SIM', '', '', 'PLANILHA']
      ],
      SUSEP_BLOQUEADAS: [
        ['Id', 'SUSEP', 'NomeCorretora', 'CpfReincidente', 'Motivo', 'BloqueadaEm',
          '_Visivel', '_ExcluidoEm', '_ExcluidoPor', '_Origem'],
        ['0000000001', '99988877766', 'Bloqueada de Fora', '', 'Fraude',
          '01/01/2026', 'SIM', '', '', 'PLANILHA']
      ],
      PRODUTOS: [
        ['Id', 'Produto', 'CodigoProduto',
          '_Visivel', '_ExcluidoEm', '_ExcluidoPor', '_Origem'],
        ['0000000001', 'Vida de Fora', '9901', 'SIM', '', '', 'PLANILHA']
      ],
      ANALISTAS_CENTRAL: [
        ['Id', 'Nome', 'Matricula', 'Equipe', 'Ativo',
          '_Visivel', '_ExcluidoEm', '_ExcluidoPor', '_Origem'],
        ['0000000001', 'Rita da Central', '12345', 'Central A', 'SIM',
          'SIM', '', '', 'PLANILHA'],
        ['0000000002', 'Quem Saiu', '54321', 'Central A', 'NAO',
          'SIM', '', '', 'PLANILHA']
      ],
      ANALISTAS_COBRANCA: [
        ['Id', 'Nome', 'Matricula', 'Equipe', 'Ativo',
          '_Visivel', '_ExcluidoEm', '_ExcluidoPor', '_Origem'],
        ['0000000001', 'Bruno da Cobrança', '67890', 'Cobrança', 'SIM',
          'SIM', '', '', 'PLANILHA']
      ]
    };
    Object.keys(ajustes || {}).forEach((aba) => {
      if (ajustes[aba] === null) delete abas[aba];
      else abas[aba] = ajustes[aba];
    });
    return ambiente.criarPlanilhaExterna(abas);
  }

  const ligar = (id) => chamar('salvarConfiguracaoDosCadastros')({ planilhaId: id });
  const desligar = () => chamar('salvarConfiguracaoDosCadastros')({ planilhaId: '' });

  secao('Antes de ligar, nada muda');

  teste('sem planilha de cadastros, tudo continua morando aqui', () => {
    const config = chamar('configuracaoDosCadastros()');
    igual(config.ligada, false);
    igual(config.planilhaId, '');
    verdadeiro(config.abas.length >= 5, 'a tela mostra quais abas podem sair');

    // E as abas daqui respondem normalmente.
    verdadeiro(Array.isArray(chamar('lerRegistros_("CORRETORAS")')));
  });

  teste('a tela diz quais colunas cada aba precisa ter', () => {
    // Sem isso, montar a planilha de cadastros vira tentativa e erro.
    const config = chamar('configuracaoDosCadastros()');
    const corretoras = config.abas.find((uma) => uma.aba === 'CORRETORAS');
    contem(corretoras.colunas.join(', '), 'SUSEP');
    verdadeiro(corretoras.colunas.every((c) => c.charAt(0) !== '_'),
      'as colunas de controle são do PGO e não se pede à planilha de fora');
  });

  secao('Conferir antes de ligar');

  teste('Id que não abre é recusado, e o recado fala do acesso', () => {
    const laudo = chamar('conferirPlanilhaDeCadastros')('nao-existe-esse-id');
    igual(laudo.abre, false);
    contem(laudo.recado, 'acesso',
      'o motivo é quase sempre o compartilhamento, e o recado tem de dizer isso');
  });

  teste('Id em branco pede o Id, em vez de estourar', () => {
    igual(chamar('conferirPlanilhaDeCadastros')('').abre, false);
  });

  teste('planilha sem as abas é recusada, dizendo quais faltam', () => {
    const incompleta = planilhaDeCadastros({ PRODUTOS: null, ANALISTAS_CENTRAL: null });
    const laudo = chamar('conferirPlanilhaDeCadastros')(incompleta);

    igual(laudo.abre, true, 'ela abre — o problema é outro');
    igual(laudo.faltando.length, 2);
    contem(laudo.faltando.join(' '), 'PRODUTOS');
    contem(laudo.faltando.join(' '), 'ANALISTAS_CENTRAL');

    lanca(() => ligar(incompleta), 'não está pronta',
      'e salvar é recusado — ligar uma base incompleta deixaria a tela vazia');
  });

  teste('aba sem as colunas certas é recusada, dizendo quais', () => {
    // Id certo apontando para planilha sem as colunas abre sem reclamar e
    // devolve lista vazia depois — o pior dos dois mundos.
    const semColuna = planilhaDeCadastros({
      PRODUTOS: [['Id', 'Produto'], ['0000000001', 'Sem o código']]
    });
    const laudo = chamar('conferirPlanilhaDeCadastros')(semColuna);

    igual(laudo.abre, true);
    contem(laudo.faltando.join(' '), 'CodigoProduto');
    lanca(() => ligar(semColuna), 'não está pronta');
  });

  teste('a planilha completa passa, e o laudo conta as linhas', () => {
    const laudo = chamar('conferirPlanilhaDeCadastros')(planilhaDeCadastros());
    igual(laudo.abre, true);
    igual(laudo.faltando.length, 0);
    contem(laudo.recado, 'Tudo certo');

    const central = laudo.abas.find((uma) => uma.aba === 'ANALISTAS_CENTRAL');
    igual(central.linhas, 2, 'duas pessoas na aba');
    igual(central.completa, true);
  });

  secao('Ligada: as mesmas funções, lendo de outro lugar');

  teste('ligar troca a origem sem mexer em mais nada', () => {
    ligar(planilhaDeCadastros());

    const config = chamar('configuracaoDosCadastros()');
    igual(config.ligada, true);

    // As MESMAS funções de sempre, agora lendo da outra planilha.
    const corretoras = chamar('lerRegistros_("CORRETORAS")');
    igual(corretoras.length, 1);
    igual(corretoras[0].Nome, 'Corretora de Fora');

    igual(chamar('lerRegistros_("PRODUTOS")')[0].Produto, 'Vida de Fora');
  });

  teste('o selo da SUSEP consulta a base de fora', () => {
    // É a consulta mais sensível das que saem daqui: se ela responder errado,
    // um caso que devia sair com selo vermelho sai limpo.
    const bloqueada = chamar('consultarSusep')('999.888.777-66');
    igual(bloqueada.situacao, 'BLOQUEADA');
    contem(bloqueada.motivo, 'Fraude');
    // A máscara dos dois lados: a planilha de fora guarda só dígito, e quem
    // digita no formulário digita com ponto. Comparar texto com texto aqui
    // deixaria toda SUSEP bloqueada passar como liberada.
    igual(chamar('consultarSusep')('99988877766').situacao, 'BLOQUEADA');

    const livre = chamar('consultarSusep')('11122233344');
    verdadeiro(livre.situacao !== 'BLOQUEADA',
      'e a que não está bloqueada passa, veio ' + livre.situacao);
  });

  teste('as listas de analista vêm de fora, já filtradas', () => {
    const central = chamar('opcoesDeUmCadastro_')('analistasCentral');
    igual(central.map((o) => o.valor).join(', '), 'Rita da Central',
      'quem está com Ativo = NAO fica de fora');

    igual(chamar('opcoesDeUmCadastro_')('analistasCobranca')[0].valor,
      'Bruno da Cobrança');
  });

  teste('a Tabela de Corretoras mostra o que veio de fora', () => {
    const tabela = chamar('tabelaDeCorretoras')('', '');
    verdadeiro(tabela.corretoras.some((c) => c.nome === 'Corretora de Fora'));
  });

  teste('as bases de CASO continuam nesta planilha', () => {
    // A linha que não se cruza: caso, auditoria, usuário e configuração são do
    // PGO. Um sistema que depende de outra planilha para saber quem pode
    // entrar para de funcionar quando alguém mexe num compartilhamento.
    ['BASE_RET', 'BASE_MESA', 'USUARIOS', 'CONFIG', 'AUDITORIA', 'CATALOGO']
      .forEach((aba) => {
        igual(chamar('abaVemDeOutraPlanilha_')(aba), false,
          aba + ' não pode sair desta planilha');
      });
  });

  secao('O PGO lê E escreve na segunda base');

  /*
   * A operação pediu para manusear tudo por aqui, em vez de abrir duas
   * planilhas. Então o PGO grava na planilha de cadastros.
   *
   * O que ele precisa que a aba tenha: `Id`, para achar a linha, e as colunas
   * de controle, onde mora a exclusão lógica. Aba que não as tem continua
   * servindo para LER — exigi-las para poder ligar transformaria um cadastro
   * útil em nenhum.
   */

  teste('cadastrar um produto grava na planilha de cadastros', () => {
    const novo = chamar('salvarProduto')({
      produto: 'Vida Nova de Fora', codigo: '9902'
    });
    verdadeiro(novo, 'o servidor aceitou');

    // Foi gravado LÁ, e não aqui: a aba local continua como estava.
    const deFora = chamar('lerRegistros_("PRODUTOS")');
    verdadeiro(deFora.some((linha) => linha.Produto === 'Vida Nova de Fora'),
      'aparece na leitura, que vem da planilha de cadastros');
  });

  teste('editar uma corretora muda a linha de lá', () => {
    const corretora = chamar('tabelaDeCorretoras')('', '').corretoras
      .find((c) => c.nome === 'Corretora de Fora');
    chamar('salvarCorretora')(Object.assign({}, corretora,
      { segmento: 'Ouro' }));

    const depois = chamar('lerRegistros_("CORRETORAS")')
      .find((linha) => linha.Nome === 'Corretora de Fora');
    igual(depois.Segmento, 'Ouro');
  });

  teste('bloquear e liberar SUSEP funciona na base de fora', () => {
    chamar('bloquearSusep')({ susep: '12345678901', motivo: 'Teste de escrita' });
    igual(chamar('consultarSusep')('12345678901').situacao, 'BLOQUEADA',
      'o selo já enxerga o bloqueio gravado lá');

    const bloqueada = chamar('listarSusepsBloqueadas()')
      .find((uma) => uma.susep === '12345678901');
    chamar('desbloquearSusep')(bloqueada.id);
    verdadeiro(chamar('consultarSusep')('12345678901').situacao !== 'BLOQUEADA',
      'e liberar também');
  });

  teste('a exclusão continua lógica: a linha fica, some da tela', () => {
    // Apagar linha de uma planilha que é de outra área não é decisão do PGO.
    const antes = chamar('lerRegistros_("PRODUTOS", { incluirOcultos: true })').length;
    const produto = chamar('listarProdutos()')
      .find((um) => um.produto === 'Vida Nova de Fora');

    chamar('ocultarProduto')(produto.id);

    verdadeiro(!chamar('listarProdutos()').some((um) => um.id === produto.id),
      'sumiu da tela');
    igual(chamar('lerRegistros_("PRODUTOS", { incluirOcultos: true })').length, antes,
      'e a linha continua lá, com _Visivel = NAO');
  });

  secao('O Id, que é onde isto podia corromper em silêncio');

  teste('o Id de aba de fora tem o piso tirado da PRÓPRIA planilha', () => {
    // O contador mora no PropertiesService DESTE projeto; as linhas moram lá.
    // Uma segunda instalação, ou alguém acrescentando linha à mão, separa os
    // dois — e o Id repetido não daria erro na hora, daria uma linha gravada
    // por cima de outra semanas depois.
    //
    // Aqui simulo o caso mais comum: alguém acrescenta uma linha direto na
    // planilha de cadastros, com um Id bem acima do que o contador conhece.
    const daPlanilha = ambiente.planilhaExternaPeloId(
      chamar('configuracaoDosCadastros()').planilhaId);
    const aba = daPlanilha.getSheetByName('PRODUTOS');
    const linha = aba.getLastRow() + 1;
    aba.getRange(linha, 1).setValue('0000005000');
    aba.getRange(linha, 2).setValue('Produto posto à mão');
    aba.getRange(linha, 3).setValue('5000');
    chamar('esquecerEstruturaLida_()');

    const novo = chamar('salvarProduto')({ produto: 'Depois do posto', codigo: '5001' });
    const gravado = chamar('lerRegistros_("PRODUTOS")')
      .find((um) => um.Produto === 'Depois do posto');

    verdadeiro(Number(gravado.Id) > 5000,
      'o Id novo tem de passar do maior que já existe lá, e veio ' + gravado.Id);
  });

  teste('o contador local desatualizado não reemite Id', () => {
    // O caso da segunda instalação: contador daqui baixo, planilha de lá alta.
    ambiente.propriedades.set('RECC_SEQ_PRODUTOS', '3');

    const novo = chamar('salvarProduto')({ produto: 'Com contador atrasado', codigo: '7' });
    const gravado = chamar('lerRegistros_("PRODUTOS")')
      .find((um) => um.Produto === 'Com contador atrasado');

    verdadeiro(Number(gravado.Id) > 5000,
      'mesmo com o contador em 3, o Id sai acima do que a planilha já tem: '
      + gravado.Id);
  });

  secao('Aba de fora sem as colunas de controle: lê, mas não escreve');

  teste('a aba incompleta continua sendo LIDA normalmente', () => {
    // Uma lista montada por outra área provavelmente não tem _Visivel. Ela
    // continua servindo para ler, que é metade do que se quer dela.
    const semControle = planilhaDeCadastros({
      PRODUTOS: [
        ['Id', 'Produto', 'CodigoProduto'],
        ['0000000001', 'Produto sem controle', '1']
      ]
    });
    ligar(semControle);

    igual(chamar('lerRegistros_("PRODUTOS")').length, 1);
    igual(chamar('listarProdutos()')[0].produto, 'Produto sem controle');
  });

  teste('mas escrever nela é recusado, dizendo QUAIS colunas faltam', () => {
    const erro = lanca(() => chamar('salvarProduto')(
      { produto: 'Tentativa', codigo: '2' }), 'ainda não pode ser editada');
    contem(erro.message, '_Visivel', 'o recado nomeia a coluna que falta');
    contem(erro.message, 'continua LENDO',
      'e deixa claro que a leitura segue funcionando');
  });

  teste('o conferidor avisa ANTES de ligar quais abas ficam só de leitura', () => {
    const laudo = chamar('conferirPlanilhaDeCadastros')(
      planilhaDeCadastros({
        PRODUTOS: [['Id', 'Produto', 'CodigoProduto'], ['0000000001', 'X', '1']]
      }));

    igual(laudo.abre, true);
    igual(laudo.faltando.length, 0, 'não é falta: as colunas de dado estão lá');
    verdadeiro(laudo.avisos.length > 0, 'é aviso');
    contem(laudo.avisos.join(' '), 'só para LEITURA');
    contem(laudo.recado, 'leitura');

    const produtos = laudo.abas.find((uma) => uma.aba === 'PRODUTOS');
    igual(produtos.podeEditar, false);
    contem(produtos.faltaParaEditar.join(','), '_Visivel');

    const corretoras = laudo.abas.find((uma) => uma.aba === 'CORRETORAS');
    igual(corretoras.podeEditar, true, 'as completas aceitam edição');
  });

  secao('Quando a outra planilha não abre');

  teste('o sistema PARA com o motivo, em vez de dizer que não há nada', () => {
    // Lista vazia aqui seria "nenhuma SUSEP está bloqueada" — uma afirmação
    // falsa que deixaria passar um caso que devia ser barrado.
    chamar('gravarConfiguracao_')('CADASTROS.PLANILHA_ID', 'id-que-sumiu');
    chamar('esquecerEstruturaLida_()');

    const erro = lanca(() => chamar('lerRegistros_("CORRETORAS")'),
      'planilha de cadastros');
    contem(erro.message, 'acesso', 'e o recado aponta a causa mais provável');
  });

  teste('a segunda leitura da mesma execução não tenta abrir de novo', () => {
    // Uma tela que lê três cadastros tentaria abrir três vezes a planilha que
    // não abre, e o tempo de espera triplicaria antes do recado aparecer.
    const erro = lanca(() => chamar('lerRegistros_("PRODUTOS")'), 'não abriu');
    contem(erro.message, 'nesta execução');
  });

  secao('Desligar traz tudo de volta');

  teste('desligar volta a ler desta planilha, sem perder nada', () => {
    chamar('gravarConfiguracao_')('CADASTROS.PLANILHA_ID', '');
    chamar('esquecerEstruturaLida_()');
    desligar();

    igual(chamar('configuracaoDosCadastros()').ligada, false);
    igual(chamar('abaVemDeOutraPlanilha_')('CORRETORAS'), false);

    // E a escrita volta a funcionar.
    const novo = chamar('inserirRegistro_')('PRODUTOS',
      { Produto: 'De volta em casa', CodigoProduto: '7777' });
    verdadeiro(novo.__id, 'gravou aqui');
  });

  secao('O encaixe das duas: ligada usa a de fora, desligada usa as daqui');

  // Esta seção responde à pergunta que o PO fez com estas palavras: "caso a
  // segunda base esteja inclusa no PGO, ele passa a utilizá-la e caso não seja
  // cadastrada a segunda base segue mantendo nas abas que criou, combinado?".
  //
  // A resposta é sim, e o que precisa ser provado não é a troca — é que
  // NENHUM DOS DOIS LADOS PERDE NADA ao trocar. O PGO não copia, não move e
  // não apaga: ele só muda de onde lê. Uma cópia escondida em qualquer um dos
  // sentidos é o defeito que apareceria meses depois, como duas listas
  // divergentes, e ninguém saberia qual está certa.

  teste('ligada e desligada, cada lado guarda as SUAS linhas', () => {
    // Uma linha que só existe AQUI, gravada com a segunda base desligada.
    chamar('gravarConfiguracao_')('CADASTROS.PLANILHA_ID', '');
    chamar('esquecerEstruturaLida_()');
    chamar('inserirRegistro_')('PRODUTOS',
      { Produto: 'Produto só daqui', CodigoProduto: '1001' });

    const daqui = () => chamar('lerRegistros_("PRODUTOS")')
      .map((linha) => linha.Produto);

    verdadeiro(daqui().indexOf('Produto só daqui') >= 0, 'desligada, lê a daqui');

    // Liga: a lista passa a ser a de LÁ, inteira e só ela.
    const idDeFora = planilhaDeCadastros();
    ligar(idDeFora);
    chamar('esquecerEstruturaLida_()');

    verdadeiro(daqui().indexOf('Vida de Fora') >= 0, 'ligada, lê a de fora');
    verdadeiro(daqui().indexOf('Produto só daqui') < 0,
      'a linha daqui NÃO aparece misturada com as de fora');

    // Desliga: a linha daqui volta exatamente como estava, e a de fora sai.
    desligar();
    chamar('esquecerEstruturaLida_()');

    verdadeiro(daqui().indexOf('Produto só daqui') >= 0,
      'desligada de novo, a linha daqui está inteira — nada foi perdido');
    verdadeiro(daqui().indexOf('Vida de Fora') < 0,
      'e a de fora não ficou copiada aqui');
  });

  teste('gravar com a segunda base desligada não toca na planilha de fora', () => {
    // O contrário do teste acima: com ela desligada, a planilha de cadastros
    // é um arquivo qualquer no Drive. O PGO não pode escrever nela por engano.
    const idDeFora = planilhaDeCadastros();
    const quantasLa = () => ambiente.planilhaExternaPeloId(idDeFora)
      .getSheetByName('PRODUTOS').getLastRow();

    const antes = quantasLa();

    chamar('gravarConfiguracao_')('CADASTROS.PLANILHA_ID', '');
    chamar('esquecerEstruturaLida_()');
    chamar('inserirRegistro_')('PRODUTOS',
      { Produto: 'Gravado com ela desligada', CodigoProduto: '1002' });

    igual(quantasLa(), antes, 'a planilha de fora ficou intacta');
  });

  teste('ligar e desligar três vezes não duplica nem some com nada', () => {
    // A troca é uma CHAVE, não uma migração: repetir tem de dar no mesmo. Se
    // ligar copiasse, cada volta somaria uma cópia — e é exatamente assim que
    // uma lista de corretora viraria 145, 290 e 435 linhas sem ninguém notar.
    const idDeFora = planilhaDeCadastros();

    // TODAS as abas que podem sair, não só uma: uma cópia acontece numa aba de
    // cada vez, e conferir só CORRETORAS deixaria passar a mesma falha em
    // PRODUTOS. Foi assim que este teste quase não serviu para nada.
    const tamanhos = () => chamar('RECC_ABAS_QUE_PODEM_VIR_DE_FORA')
      .map((aba) => aba + '=' + chamar('lerRegistros_')(aba).length).join(', ');

    chamar('gravarConfiguracao_')('CADASTROS.PLANILHA_ID', '');
    chamar('esquecerEstruturaLida_()');
    const aquiNoComeco = tamanhos();

    let laSempre = null;
    for (let volta = 0; volta < 3; volta++) {
      ligar(idDeFora);
      chamar('esquecerEstruturaLida_()');
      if (laSempre === null) laSempre = tamanhos();
      igual(tamanhos(), laSempre, 'a de fora, na volta ' + (volta + 1));

      desligar();
      chamar('esquecerEstruturaLida_()');
      igual(tamanhos(), aquiNoComeco, 'a daqui, na volta ' + (volta + 1));
    }
  });

  teste('quem decide é uma chave só, e a tela mostra qual está valendo', () => {
    // Uma chave só é o que torna a volta possível sem migração. Se a decisão
    // estivesse espalhada — uma marca por aba, um campo por tela — desligar
    // exigiria desfazer tudo em ordem, e meio desfeito é o pior estado.
    const idDeFora = planilhaDeCadastros();
    ligar(idDeFora);
    chamar('esquecerEstruturaLida_()');
    igual(chamar('configuracaoDosCadastros()').planilhaId, idDeFora,
      'a tela mostra o Id que está valendo');

    chamar('gravarConfiguracao_')('CADASTROS.PLANILHA_ID', '');
    chamar('esquecerEstruturaLida_()');
    igual(chamar('abaVemDeOutraPlanilha_')('CORRETORAS'), false,
      'apagada a chave, tudo volta para casa — sem mais nenhum passo');

    // E as abas de CASO nunca entram nessa conversa, ligada ou desligada.
    ['BASE_RET', 'BASE_MESA', 'USUARIOS', 'AUDITORIA'].forEach((aba) => {
      igual(chamar('abaVemDeOutraPlanilha_')(aba), false,
        aba + ' é da base operacional e nunca sai daqui');
    });
  });

  teste('a terceira base, se um dia vier, entra na lista e em nada mais', () => {
    // O PO disse: "pode ser que no futuro, se houver necessidade, teremos uma
    // 3ª base". Este teste guarda o caminho para isso: quem for fazer precisa
    // mexer numa lista, não em trinta chamadas. Se um dia alguém espalhar a
    // decisão por aí, é aqui que vai aparecer.
    const podemSair = chamar('RECC_ABAS_QUE_PODEM_VIR_DE_FORA');
    verdadeiro(podemSair.indexOf('CORRETORAS') >= 0);
    verdadeiro(podemSair.indexOf('ANALISTAS_CENTRAL') >= 0);

    const config = chamar('configuracaoDosCadastros()');
    igual(config.abas.length, podemSair.length,
      'a tela sai da MESMA lista — não de uma cópia dela');
  });
}

module.exports = { rodarTestesDeCadastrosDeFora };
