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
      CORRETORAS: [
        ['Id', 'Nome', 'Canal', 'SUSEP', 'Corretora', 'Segmento', 'Consultor'],
        ['0000000001', 'Corretora de Fora', 'Corretor', '11122233344',
          'Corretora de Fora', 'Diamante', 'Consultor Um']
      ],
      SUSEP_BLOQUEADAS: [
        ['Id', 'SUSEP', 'NomeCorretora', 'CpfReincidente', 'Motivo', 'BloqueadaEm'],
        ['0000000001', '99988877766', 'Bloqueada de Fora', '', 'Fraude', '01/01/2026']
      ],
      PRODUTOS: [
        ['Id', 'Produto', 'CodigoProduto'],
        ['0000000001', 'Vida de Fora', '9901']
      ],
      ANALISTAS_CENTRAL: [
        ['Id', 'Nome', 'Matricula', 'Equipe', 'Ativo'],
        ['0000000001', 'Rita da Central', '12345', 'Central A', 'SIM'],
        ['0000000002', 'Quem Saiu', '54321', 'Central A', 'NAO']
      ],
      ANALISTAS_COBRANCA: [
        ['Id', 'Nome', 'Matricula', 'Equipe', 'Ativo'],
        ['0000000001', 'Bruno da Cobrança', '67890', 'Cobrança', 'SIM']
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

  secao('O PGO lê, e não escreve');

  teste('gravar numa aba de fora é recusado, dizendo onde editar', () => {
    // A planilha de cadastros é a FONTE DE VERDADE. Duas mãos escrevendo na
    // mesma lista, uma sem saber da outra, é como um cadastro diverge.
    const erro = lanca(() => chamar('inserirRegistro_')('PRODUTOS',
      { Produto: 'Tentativa', CodigoProduto: '1' }), 'vem da planilha de cadastros');
    contem(erro.message, 'edite a planilha de cadastros',
      'o recado tem de dizer ONDE editar — "não permitido" manda procurar '
      + 'uma permissão que não é o problema');
  });

  teste('as quatro portas de escrita recusam, e não só uma', () => {
    // Inserir, atualizar, ocultar e apagar. Fechar uma porta e esquecer as
    // outras é pior que não fechar nenhuma: dá a sensação de estar protegido.
    lanca(() => chamar('atualizarRegistro_')('CORRETORAS', '0000000001',
      { Nome: 'X' }), 'vem da planilha de cadastros');
    lanca(() => chamar('ocultarRegistro_')('CORRETORAS', '0000000001', ''),
      'vem da planilha de cadastros');
    lanca(() => chamar('apagarRegistroDeVez_')('CORRETORAS', '0000000001'),
      'vem da planilha de cadastros');
    lanca(() => chamar('adicionarColuna_')('CORRETORAS', 'Nova', 'texto'),
      'vem da planilha de cadastros');
  });

  teste('bloquear SUSEP pela tela é recusado com o mesmo recado', () => {
    // O botão existe na Tabela de Corretoras. Ele tem de recusar com uma
    // frase que explique, e não com um erro técnico.
    lanca(() => chamar('bloquearSusep')({ susep: '12345678901', motivo: 'Teste' }),
      'planilha de cadastros');
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
}

module.exports = { rodarTestesDeCadastrosDeFora };
