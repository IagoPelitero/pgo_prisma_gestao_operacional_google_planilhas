/**
 * ============================================================================
 * PGO — testes-cadastros-de-fora.js · a Etapa 14
 * ============================================================================
 * Duas bases: a OPERACIONAL, que guarda caso, e a de CADASTROS, que guarda
 * corretora, SUSEP bloqueada e as duas listas de analista.
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
        ['Id', 'SUSEP', 'Corretora', 'Sucursal', 'Segmento', 'Consultor',
          '_Visivel', '_ExcluidoEm', '_ExcluidoPor', '_Origem'],
        ['0000000001', 'RETF01', 'Corretora de Fora', '12',
          'Diamante', 'Consultor Um', 'SIM', '', '', 'PLANILHA']
      ],
      SUSEP_BLOQUEADAS: [
        ['Id', 'SUSEP', 'NomeCorretora', 'Sucursal', 'CoordenadorComercial',
          'BloqueadaEm',
          '_Visivel', '_ExcluidoEm', '_ExcluidoPor', '_Origem'],
        ['0000000001', 'RETF99', 'Bloqueada de Fora', '58', 'Coordenação Sul',
          '01/01/2026', 'SIM', '', '', 'PLANILHA']
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
    // Quantas abas podem sair sai do CÓDIGO, e não de um número cravado: a
    // lista encolheu quando PRODUTOS saiu, e um 5 escrito aqui teria
    // reprovado uma mudança que o PO pediu.
    igual(config.abas.length,
      chamar('RECC_ABAS_QUE_PODEM_VIR_DE_FORA').length,
      'a tela mostra todas as abas que podem sair, e só elas');
    verdadeiro(config.abas.length > 0);

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
    const incompleta = planilhaDeCadastros({
      SUSEP_BLOQUEADAS: null, ANALISTAS_CENTRAL: null
    });
    const laudo = chamar('conferirPlanilhaDeCadastros')(incompleta);

    igual(laudo.abre, true, 'ela abre — o problema é outro');
    igual(laudo.faltando.length, 2);
    contem(laudo.faltando.join(' '), 'SUSEP_BLOQUEADAS');
    contem(laudo.faltando.join(' '), 'ANALISTAS_CENTRAL');

    lanca(() => ligar(incompleta), 'não está pronta',
      'e salvar é recusado — ligar uma base incompleta deixaria a tela vazia');
  });

  teste('aba sem as colunas certas é recusada, dizendo quais', () => {
    // Id certo apontando para planilha sem as colunas abre sem reclamar e
    // devolve lista vazia depois — o pior dos dois mundos.
    const semColuna = planilhaDeCadastros({
      CORRETORAS: [['Id', 'SUSEP', 'Corretora'], ['0000000001', 'RETF01', 'X']]
    });
    const laudo = chamar('conferirPlanilhaDeCadastros')(semColuna);

    igual(laudo.abre, true);
    contem(laudo.faltando.join(' '), 'Sucursal');
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
    igual(corretoras[0].Corretora, 'Corretora de Fora');
    igual(corretoras[0].SUSEP, 'RETF01');
  });

  teste('o selo da SUSEP consulta a base de fora', () => {
    // É a consulta mais sensível das que saem daqui: se ela responder errado,
    // um caso que devia sair com selo vermelho sai limpo.
    const bloqueada = chamar('consultarSusep')('RETF99');
    igual(bloqueada.situacao, 'BLOQUEADA');
    igual(bloqueada.coordenadorComercial, 'Coordenação Sul');
    // A pontuação e a caixa dos dois lados: quem digita no formulário escreve
    // como der. Comparar texto cru deixaria toda SUSEP bloqueada passar como
    // liberada.
    igual(chamar('consultarSusep')('ret-f99').situacao, 'BLOQUEADA');

    const noCadastro = chamar('consultarSusep')('RETF01');
    igual(noCadastro.situacao, 'OK',
      'a que está no cadastro de corretoras sai liberada, veio '
      + noCadastro.situacao);
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
    verdadeiro(tabela.corretoras.some((c) => c.corretora === 'Corretora de Fora'));
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

  teste('cadastrar uma corretora grava na planilha de cadastros', () => {
    const novo = chamar('salvarCorretora')({
      susep: 'RETF02', corretora: 'Corretora Nova de Fora', sucursal: '12',
      segmento: 'Diamante'
    });
    verdadeiro(novo, 'o servidor aceitou');

    // Foi gravado LÁ, e não aqui: a aba local continua como estava.
    const deFora = chamar('lerRegistros_("CORRETORAS")');
    verdadeiro(deFora.some((linha) => linha.Corretora === 'Corretora Nova de Fora'),
      'aparece na leitura, que vem da planilha de cadastros');
  });

  teste('editar uma corretora muda a linha de lá', () => {
    const corretora = chamar('tabelaDeCorretoras')('', '').corretoras
      .find((c) => c.corretora === 'Corretora de Fora');
    chamar('salvarCorretora')(Object.assign({}, corretora,
      { segmento: 'Ouro' }));

    const depois = chamar('lerRegistros_("CORRETORAS")')
      .find((linha) => linha.Corretora === 'Corretora de Fora');
    igual(depois.Segmento, 'Ouro');
  });

  teste('base de fora sem a coluna BloqueadaPor: aviso no conferir, recado ao bloquear', () => {
    // A planilha de cadastros que a operação já montou não tem a coluna nova.
    // Ela não pode deixar de ligar por isso: é AVISO, e não falta.
    const laudo = chamar('conferirPlanilhaDeCadastros')(
      chamar('configuracaoDosCadastros()').planilhaId);
    igual(laudo.faltando.length, 0, 'não é falta');
    verdadeiro(laudo.avisos.some((a) => a.indexOf('BloqueadaPor') >= 0),
      'mas avisa');

    // A linha que já existia lá aparece "sem tipo".
    igual(chamar('listarSusepsBloqueadas()')
      .find((uma) => uma.susep === 'RETF99').bloqueadaPor, '');

    // Bloquear pede a coluna — e o recado diz ONDE criar: lá, não aqui.
    lanca(() => chamar('bloquearSusep')({ susep: 'RETF50',
      bloqueadaPor: 'Corretora' }), 'da planilha de cadastros');

    // Quem cuida da planilha de lá acrescenta a coluna, e passa a funcionar.
    const aba = ambiente.planilhaExternaPeloId(
      chamar('configuracaoDosCadastros()').planilhaId)
      .getSheetByName('SUSEP_BLOQUEADAS');
    aba.getRange(1, aba.getLastColumn() + 1).setValue('BloqueadaPor');
    chamar('esquecerEstruturaLida_()');
  });

  teste('bloquear e liberar SUSEP funciona na base de fora', () => {
    chamar('bloquearSusep')({ susep: 'RETF50',
      coordenadorComercial: 'Teste de escrita', bloqueadaPor: 'Corretora' });
    igual(chamar('listarSusepsBloqueadas()')
      .find((uma) => uma.susep === 'RETF50').bloqueadaPor, 'Corretora',
    'o tipo foi gravado lá');
    igual(chamar('consultarSusep')('RETF50').situacao, 'BLOQUEADA',
      'o selo já enxerga o bloqueio gravado lá');

    const bloqueada = chamar('listarSusepsBloqueadas()')
      .find((uma) => uma.susep === 'RETF50');
    chamar('desbloquearSusep')(bloqueada.id);
    verdadeiro(chamar('consultarSusep')('RETF50').situacao !== 'BLOQUEADA',
      'e liberar também');
  });

  teste('a exclusão continua lógica: a linha fica, some da tela', () => {
    // Apagar linha de uma planilha que é de outra área não é decisão do PGO.
    const antes = chamar('lerRegistros_("CORRETORAS", { incluirOcultos: true })')
      .length;
    const corretora = chamar('tabelaDeCorretoras')('', '').corretoras
      .find((uma) => uma.corretora === 'Corretora Nova de Fora');

    chamar('ocultarCorretora')(corretora.id);

    verdadeiro(!chamar('tabelaDeCorretoras')('', '').corretoras
      .some((uma) => uma.id === corretora.id), 'sumiu da tela');
    igual(chamar('lerRegistros_("CORRETORAS", { incluirOcultos: true })').length,
      antes, 'e a linha continua lá, com _Visivel = NAO');
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
    const aba = daPlanilha.getSheetByName('CORRETORAS');
    const linha = aba.getLastRow() + 1;
    aba.getRange(linha, 1).setValue('0000005000');
    aba.getRange(linha, 2).setValue('RETF88');
    aba.getRange(linha, 3).setValue('Corretora posta à mão');
    chamar('esquecerEstruturaLida_()');

    const novo = chamar('salvarCorretora')({
      susep: 'RETF89', corretora: 'Depois do posto', sucursal: '12'
    });
    const gravado = chamar('lerRegistros_("CORRETORAS")')
      .find((um) => um.Corretora === 'Depois do posto');

    verdadeiro(Number(gravado.Id) > 5000,
      'o Id novo tem de passar do maior que já existe lá, e veio ' + gravado.Id);
  });

  teste('o contador local desatualizado não reemite Id', () => {
    // O caso da segunda instalação: contador daqui baixo, planilha de lá alta.
    ambiente.propriedades.set('RECC_SEQ_CORRETORAS', '3');

    const novo = chamar('salvarCorretora')({
      susep: 'RETF90', corretora: 'Com contador atrasado', sucursal: '12'
    });
    const gravado = chamar('lerRegistros_("CORRETORAS")')
      .find((um) => um.Corretora === 'Com contador atrasado');

    verdadeiro(Number(gravado.Id) > 5000,
      'mesmo com o contador em 3, o Id sai acima do que a planilha já tem: '
      + gravado.Id);
  });

  secao('Aba de fora sem as colunas de controle: lê, mas não escreve');

  teste('a aba incompleta continua sendo LIDA normalmente', () => {
    // Uma lista montada por outra área provavelmente não tem _Visivel. Ela
    // continua servindo para ler, que é metade do que se quer dela.
    const semControle = planilhaDeCadastros({
      CORRETORAS: [
        ['Id', 'SUSEP', 'Corretora', 'Sucursal', 'Segmento', 'Consultor'],
        ['0000000001', 'RETG01', 'Corretora sem controle', '12', 'Diamante', '']
      ]
    });
    ligar(semControle);

    igual(chamar('lerRegistros_("CORRETORAS")').length, 1);
    igual(chamar('tabelaDeCorretoras')('', '').corretoras[0].corretora,
      'Corretora sem controle');
  });

  teste('mas escrever nela é recusado, dizendo QUAIS colunas faltam', () => {
    const erro = lanca(() => chamar('salvarCorretora')(
      { susep: 'RETG02', corretora: 'Tentativa' }),
      'ainda não pode ser editada');
    contem(erro.message, '_Visivel', 'o recado nomeia a coluna que falta');
    contem(erro.message, 'continua LENDO',
      'e deixa claro que a leitura segue funcionando');
  });

  teste('o conferidor avisa ANTES de ligar quais abas ficam só de leitura', () => {
    const laudo = chamar('conferirPlanilhaDeCadastros')(
      planilhaDeCadastros({
        CORRETORAS: [
          ['Id', 'SUSEP', 'Corretora', 'Sucursal', 'Segmento', 'Consultor'],
          ['0000000001', 'RETG01', 'X', '12', 'Diamante', '']
        ]
      }));

    igual(laudo.abre, true);
    igual(laudo.faltando.length, 0, 'não é falta: as colunas de dado estão lá');
    verdadeiro(laudo.avisos.length > 0, 'é aviso');
    contem(laudo.avisos.join(' '), 'só para LEITURA');
    contem(laudo.recado, 'leitura');

    const incompleta = laudo.abas.find((uma) => uma.aba === 'CORRETORAS');
    igual(incompleta.podeEditar, false);
    contem(incompleta.faltaParaEditar.join(','), '_Visivel');

    const completa = laudo.abas.find((uma) => uma.aba === 'SUSEP_BLOQUEADAS');
    igual(completa.podeEditar, true, 'as completas aceitam edição');
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
    const erro = lanca(() => chamar('lerRegistros_("SUSEP_BLOQUEADAS")'),
      'não abriu');
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
    const novo = chamar('inserirRegistro_')('CORRETORAS',
      { SUSEP: 'RETH01', Corretora: 'De volta em casa', Sucursal: '12' });
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
    chamar('inserirRegistro_')('CORRETORAS',
      { SUSEP: 'RETH02', Corretora: 'Corretora só daqui', Sucursal: '12' });

    const daqui = () => chamar('lerRegistros_("CORRETORAS")')
      .map((linha) => linha.Corretora);

    verdadeiro(daqui().indexOf('Corretora só daqui') >= 0,
      'desligada, lê a daqui');

    // Liga: a lista passa a ser a de LÁ, inteira e só ela.
    const idDeFora = planilhaDeCadastros();
    ligar(idDeFora);
    chamar('esquecerEstruturaLida_()');

    verdadeiro(daqui().indexOf('Corretora de Fora') >= 0,
      'ligada, lê a de fora');
    verdadeiro(daqui().indexOf('Corretora só daqui') < 0,
      'a linha daqui NÃO aparece misturada com as de fora');

    // Desliga: a linha daqui volta exatamente como estava, e a de fora sai.
    desligar();
    chamar('esquecerEstruturaLida_()');

    verdadeiro(daqui().indexOf('Corretora só daqui') >= 0,
      'desligada de novo, a linha daqui está inteira — nada foi perdido');
    verdadeiro(daqui().indexOf('Corretora de Fora') < 0,
      'e a de fora não ficou copiada aqui');
  });

  teste('gravar com a segunda base desligada não toca na planilha de fora', () => {
    // O contrário do teste acima: com ela desligada, a planilha de cadastros
    // é um arquivo qualquer no Drive. O PGO não pode escrever nela por engano.
    const idDeFora = planilhaDeCadastros();
    const quantasLa = () => ambiente.planilhaExternaPeloId(idDeFora)
      .getSheetByName('CORRETORAS').getLastRow();

    const antes = quantasLa();

    chamar('gravarConfiguracao_')('CADASTROS.PLANILHA_ID', '');
    chamar('esquecerEstruturaLida_()');
    chamar('inserirRegistro_')('CORRETORAS',
      { SUSEP: 'RETH03', Corretora: 'Gravado com ela desligada',
        Sucursal: '12' });

    igual(quantasLa(), antes, 'a planilha de fora ficou intacta');
  });

  teste('ligar e desligar três vezes não duplica nem some com nada', () => {
    // A troca é uma CHAVE, não uma migração: repetir tem de dar no mesmo. Se
    // ligar copiasse, cada volta somaria uma cópia — e é exatamente assim que
    // uma lista de corretora viraria 145, 290 e 435 linhas sem ninguém notar.
    const idDeFora = planilhaDeCadastros();

    // TODAS as abas que podem sair, não só uma: uma cópia acontece numa aba de
    // cada vez, e conferir só CORRETORAS deixaria passar a mesma falha nas
    // SUSEPs bloqueadas. Foi assim que este teste quase não serviu para nada.
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
