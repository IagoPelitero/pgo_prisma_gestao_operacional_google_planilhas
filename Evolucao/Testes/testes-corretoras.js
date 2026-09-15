/**
 * ============================================================================
 * PGO — testes-corretoras.js · a Etapa 10
 * ============================================================================
 * Três cadastros que sustentam o resto do sistema e que, até esta etapa, só se
 * ajustavam abrindo a planilha: canais, produtos e SUSEPs bloqueadas.
 *
 * O que os testes cuidam com mais atenção é o CRUZAMENTO com os casos — em
 * especial as SUSEPs que aparecem nos casos e não estão cadastradas. É a
 * informação mais útil desta tela, e a mais fácil de quebrar em silêncio.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario } =
  require('./ferramentas');

function rodarTestesDeCorretoras() {
  console.log('\nEtapa 10 — Tabela de Corretoras');

  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');

  const canal = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_MESA');

  chamar('inserirVariosRegistros_')('CORRETORAS', [
    { Nome: 'Marina Alencar', Canal: 'Corretora', SUSEP: '1234567',
      Corretora: 'Corretora ABC', Segmento: 'Diamante' },
    { Nome: 'Posto Central', Canal: 'Agente', SUSEP: '2345678',
      Corretora: 'Agência Central', Segmento: 'Demais corretoras' }
  ]);

  chamar('inserirVariosRegistros_')('BASE_MESA', [
    { Analista: 'Ana', Status: 'Em andamento', 'Data de entrada': '10/09/2026',
      SUSEP: '1234567', Corretora: 'Corretora ABC', 'Nome do segurado': 'c1' },
    { Analista: 'Ana', Status: 'Em andamento', 'Data de entrada': '10/09/2026',
      SUSEP: '1234567', Corretora: 'Corretora ABC', 'Nome do segurado': 'c2' },
    { Analista: 'Ana', Status: 'Em andamento', 'Data de entrada': '10/09/2026',
      SUSEP: '9999999', Corretora: 'Nunca Vista', 'Nome do segurado': 'c3' }
  ]);

  secao('A tabela');

  teste('cada corretora vem com o volume de casos ao lado', () => {
    // Uma tabela de corretoras sem volume é uma agenda telefônica. Com ele,
    // ela responde "quem me dá trabalho".
    const tabela = chamar('tabelaDeCorretoras')('', '');
    const abc = tabela.corretoras.find((uma) => uma.susep === '1234567');
    igual(abc.casos, 2);
    igual(abc.segmento, 'Diamante');
    igual(abc.bloqueada, false);
  });

  teste('a lista vem de quem mais traz caso, e não em ordem alfabética', () => {
    const tabela = chamar('tabelaDeCorretoras')('', '');
    igual(tabela.corretoras[0].susep, '1234567',
      'quem tem mais casos encabeça — é o que dá ordem de importância');
  });

  teste('cadastro sem segmento vira "Não encontrado", e não Diamante', () => {
    const id = chamar('salvarCorretora')({
      susep: '5555555', corretora: 'Sem Segmento', canal: 'Corretora'
    });
    const semSegmento = chamar('tabelaDeCorretoras')('', '').corretoras
      .find((uma) => uma.id === id);
    igual(semSegmento.segmento, 'Não encontrado',
      'virar Diamante por descuido mudaria o atendimento de quem não é');
  });

  teste('procurar acha por nome, canal e SUSEP — e ignora máscara', () => {
    igual(chamar('tabelaDeCorretoras')('corretora abc', '').quantasFiltradas, 1);
    igual(chamar('tabelaDeCorretoras')('agente', '').quantasFiltradas, 1);
    igual(chamar('tabelaDeCorretoras')('123.4567', '').quantasFiltradas, 1,
      'a SUSEP com pontuação acha a mesma corretora');
  });

  teste('o filtro de segmento sai dos segmentos que existem', () => {
    const tabela = chamar('tabelaDeCorretoras')('', '');
    verdadeiro(tabela.segmentos.indexOf('Diamante') >= 0);
    igual(chamar('tabelaDeCorretoras')('', 'Diamante').quantasFiltradas, 1);
  });

  secao('As SUSEPs fora do cadastro — o achado da tela');

  teste('a tela mostra as SUSEPs que os casos citam e ninguém cadastrou', () => {
    // Enquanto uma SUSEP fica de fora, o selo do formulário diz "não
    // encontrada" toda vez — e o sintoma aparece em outra tela, uma pessoa de
    // cada vez, sem ninguém ligar à causa.
    const fora = chamar('tabelaDeCorretoras')('', '').foraDoCadastro;
    igual(fora.length, 1);
    igual(fora[0].susep, '9999999');
    igual(fora[0].casos, 1);
    igual(fora[0].nomeNosCasos, 'Nunca Vista',
      'o nome vem dos próprios casos, como palpite para reconhecer a corretora');
  });

  teste('SUSEP bloqueada não conta como fora do cadastro', () => {
    // O selo do formulário mostra o BLOQUEIO, e não "não encontrada". Avisar
    // aqui daria um recado que não corresponde ao que a pessoa vê na outra
    // tela — e aviso que não bate com a realidade a operação aprende a ignorar.
    chamar('inserirRegistro_')('BASE_MESA', {
      Analista: 'Ana', Status: 'Em andamento', 'Data de entrada': '10/09/2026',
      SUSEP: '8765432', Corretora: 'Bloqueada Ltda', 'Nome do segurado': 'c9'
    });
    verdadeiro(chamar('tabelaDeCorretoras')('', '').foraDoCadastro
      .some((uma) => uma.susep === '8765432'), 'antes de bloquear, ela aparece');

    chamar('bloquearSusep')({ susep: '8765432', corretora: 'Bloqueada Ltda',
      motivo: 'Fraude confirmada' });
    verdadeiro(!chamar('tabelaDeCorretoras')('', '').foraDoCadastro
      .some((uma) => uma.susep === '8765432'), 'depois de bloquear, não');
  });

  teste('cadastrar a SUSEP tira ela da lista de fora do cadastro', () => {
    chamar('salvarCorretora')({
      susep: '9999999', corretora: 'Nunca Vista', canal: 'Corretora',
      segmento: 'Demais corretoras'
    });
    igual(chamar('tabelaDeCorretoras')('', '').foraDoCadastro.length, 0);

    // E o selo do formulário para de dizer "não encontrada".
    igual(chamar('consultarSusep')('9999999').situacao, 'OK');
  });

  secao('As travas do cadastro');

  teste('duas corretoras com a mesma SUSEP são recusadas', () => {
    // O selo do formulário escolheria uma delas pela ordem da planilha, que
    // ninguém controla.
    lanca(() => chamar('salvarCorretora')({
      susep: '1234567', corretora: 'Outra Qualquer'
    }), 'já está cadastrada');
  });

  teste('corretora sem SUSEP ou sem nome é recusada', () => {
    lanca(() => chamar('salvarCorretora')({ corretora: 'Sem SUSEP' }),
      'Informe a SUSEP');
    lanca(() => chamar('salvarCorretora')({ susep: '8888888' }),
      'Informe o nome da corretora');
  });

  teste('tirar do cadastro some da tela e mantém a linha na planilha', () => {
    const id = chamar('salvarCorretora')({
      susep: '7777777', corretora: 'Some Daqui', canal: 'Corretora'
    });
    igual(chamar('tabelaDeCorretoras')('some daqui', '').quantasFiltradas, 1);

    chamar('ocultarCorretora')(id);
    igual(chamar('tabelaDeCorretoras')('some daqui', '').quantasFiltradas, 0);

    const naPlanilha = chamar('lerRegistros_')('CORRETORAS', { incluirOcultos: true })
      .find((linha) => linha.__id === id);
    verdadeiro(!!naPlanilha, 'a linha continua lá, como em todo o resto do sistema');
  });

  secao('As SUSEPs bloqueadas');

  teste('bloquear exige motivo', () => {
    // Quem vir o selo vermelho daqui a seis meses precisa saber o que fazer
    // com a informação.
    lanca(() => chamar('bloquearSusep')({ susep: '1234567' }),
      'Diga o motivo do bloqueio');
  });

  teste('bloquear marca o selo, e não impede cadastrar caso', () => {
    chamar('bloquearSusep')({
      susep: '2345678', corretora: 'Agência Central',
      motivo: 'CPF reincidente em três propostas'
    });

    const selo = chamar('consultarSusep')('2345678');
    igual(selo.situacao, 'BLOQUEADA');
    contem(selo.motivo, 'CPF reincidente');

    // E o caso continua podendo ser cadastrado: bloqueio que impedisse faria
    // a pessoa registrar num caderno, e o sistema perderia o caso de vista.
    const novo = chamar('cadastrarCaso')(canal.id, {
      status: 'Em andamento', nomedosegurado: 'Caso de bloqueada',
      datadeentrada: '10/09/2026', susep: '2345678'
    });
    verdadeiro(!!novo.id);
  });

  teste('a lista de bloqueadas mostra o volume e a data', () => {
    const lista = chamar('listarSusepsBloqueadas()');
    const bloqueada = lista.find((uma) => uma.susep === '2345678');
    verdadeiro(!!bloqueada);
    contem(bloqueada.motivo, 'reincidente');
    verdadeiro(/^\d{2}\/\d{2}\/\d{4}$/.test(bloqueada.bloqueadaEm),
      'a data vem formatada, veio ' + bloqueada.bloqueadaEm);
  });

  teste('bloquear a mesma SUSEP duas vezes é recusado', () => {
    lanca(() => chamar('bloquearSusep')({ susep: '2345678', motivo: 'de novo' }),
      'já está bloqueada');
  });

  teste('liberar devolve o selo verde e guarda o histórico', () => {
    const bloqueada = chamar('listarSusepsBloqueadas()')
      .find((uma) => uma.susep === '2345678');
    chamar('desbloquearSusep')(bloqueada.id);

    igual(chamar('consultarSusep')('2345678').situacao, 'OK');
    const naPlanilha = chamar('lerRegistros_')('SUSEP_BLOQUEADAS',
      { incluirOcultos: true }).find((linha) => linha.__id === bloqueada.id);
    verdadeiro(!!naPlanilha, 'o registro do bloqueio permanece, com a data');
  });

  secao('Os produtos');

  teste('o código do produto é único', () => {
    chamar('salvarProduto')({ produto: 'Prestamista', codigo: '31' });
    lanca(() => chamar('salvarProduto')({ produto: 'Outro', codigo: '31' }),
      'já é do produto');
  });

  teste('produto sem nome é recusado; sem código, aceito', () => {
    lanca(() => chamar('salvarProduto')({ codigo: '99' }), 'Informe o nome');
    const id = chamar('salvarProduto')({ produto: 'Sem código' });
    verdadeiro(!!id, 'nem toda operação usa código de produto');
  });

  secao('Permissão');

  teste('quem não configura vê a tela e não mexe nela', () => {
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    const permissoes = JSON.parse(operacao.Configuracao);
    permissoes.telas.push('tabelaCorretoras');
    chamar('atualizarRegistro_')('CATALOGO', operacao.Id,
      { Configuracao: JSON.stringify(permissoes) });
    chamar('salvarUsuario')({
      nome: 'Ana Martins', email: 'ana@exemplo.com',
      nivelAcessoId: operacao.Id, ativo: true
    });

    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      const tabela = chamar('tabelaDeCorretoras')('', '');
      verdadeiro(tabela.corretoras.length > 0, 'ela consulta o cadastro');
      igual(tabela.podeMexer, false, 'e a tela esconde os botões');

      lanca(() => chamar('salvarCorretora')({
        susep: '1111111', corretora: 'Pela porta dos fundos'
      }), 'não permite configurar');
      lanca(() => chamar('bloquearSusep')({ susep: '1111111', motivo: 'x' }),
        'não permite configurar');
    });
  });

  teste('quem não tem a tela no menu não abre pelo endereço', () => {
    const consulta = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Consulta');
    chamar('salvarUsuario')({
      nome: 'Só Olha', email: 'olha@exemplo.com',
      nivelAcessoId: consulta.Id, ativo: true
    });
    comoUsuario(ambiente, 'olha@exemplo.com', () => {
      lanca(() => chamar('tabelaDeCorretoras')('', ''), 'não abre a tela');
    });
  });

  secao('A importação');

  teste('cola do Excel: separado por TAB, com o cabeçalho junto', () => {
    // É exatamente o que a área de transferência traz quando alguém seleciona
    // um pedaço da planilha e aperta Ctrl+C.
    const colado = [
      'SUSEP\tCorretora\tCanal\tSegmento',
      '7654321\tCorretora Nova\tCorretora\tDiamante',
      '1234567\tCorretora ABC\tCorretora\tDiamante'
    ].join('\n');

    const conferido = chamar('conferirImportacao')('corretoras', colado);
    verdadeiro(conferido.tinhaCabecalho, 'o cabeçalho foi reconhecido');
    igual(conferido.resumo.total, 2, 'e não entrou na conta como corretora');
    igual(conferido.resumo.novas, 1);
    igual(conferido.resumo.iguais, 1, 'a ABC já está assim no cadastro');
  });

  teste('sem cabeçalho, vale a ordem declarada', () => {
    const conferido = chamar('conferirImportacao')('corretoras',
      '8888888;Corretora Sem Cabeçalho;Corretora;Demais corretoras');
    igual(conferido.tinhaCabecalho, false);
    igual(conferido.resumo.novas, 1);
    igual(conferido.linhas[0].campos.corretora, 'Corretora Sem Cabeçalho');
  });

  teste('com cabeçalho, a ordem das colunas pode ser qualquer uma', () => {
    // Quem exporta de outro sistema não recebe as colunas na ordem do PGO.
    // Exigir a ordem certa faria a pessoa reorganizar a planilha antes —
    // e é justamente o trabalho manual que esta tela veio tirar.
    const conferido = chamar('conferirImportacao')('corretoras', [
      'Segmento;Corretora;SUSEP',
      'Diamante;Fora de Ordem;7777777'
    ].join('\n'));
    igual(conferido.linhas[0].campos.susep, '7777777');
    igual(conferido.linhas[0].campos.corretora, 'Fora de Ordem');
    igual(conferido.linhas[0].campos.segmento, 'Diamante');
  });

  teste('conferir não grava nada', () => {
    const antes = chamar('tabelaDeCorretoras')('', '').corretoras.length;
    chamar('conferirImportacao')('corretoras', '5555555;Fantasma');
    igual(chamar('tabelaDeCorretoras')('', '').corretoras.length, antes,
      'o passo do meio é só para ver — se gravasse, não haveria como desistir');
  });

  teste('linha sem o obrigatório é recusada, e diz por quê', () => {
    const conferido = chamar('conferirImportacao')('corretoras', [
      ';Sem SUSEP;Corretora;Diamante',
      'ABC;Susep sem dígito;Corretora;Diamante',
      '4444444;;Corretora;Diamante'
    ].join('\n'));
    igual(conferido.resumo.recusadas, 3);
    contem(conferido.linhas[0].porque, 'SUSEP em branco');
    contem(conferido.linhas[1].porque, 'sem nenhum dígito',
      'SUSEP é identificador: texto sem dígito não vira SUSEP');
    contem(conferido.linhas[2].porque, 'Corretora em branco');
  });

  teste('coluna vazia no começo não desloca a linha inteira', () => {
    // Bug 23. A linha era aparada ANTES de ser partida, e com TAB o corte
    // comia a primeira coluna quando ela vinha vazia: a corretora ia parar
    // na SUSEP, o canal na corretora, e a recusa apontava para o campo
    // errado. Quem apara é cada célula, depois de partida.
    const conferido = chamar('conferirImportacao')('corretoras', [
      'SUSEP\tCorretora\tCanal\tSegmento',
      '\tSem SUSEP nenhuma\tCorretora\tDiamante'
    ].join('\n'));

    igual(conferido.linhas[0].campos.susep, '');
    igual(conferido.linhas[0].campos.corretora, 'Sem SUSEP nenhuma',
      'a corretora continua na coluna dela');
    igual(conferido.linhas[0].campos.canal, 'Corretora');
    igual(conferido.linhas[0].campos.segmento, 'Diamante');
    contem(conferido.linhas[0].porque, 'SUSEP em branco',
      'e a recusa aponta o campo certo');
  });

  teste('a mesma SUSEP duas vezes no texto colado é recusada na segunda', () => {
    const conferido = chamar('conferirImportacao')('corretoras', [
      '3333333;Primeira',
      '3333333;Segunda'
    ].join('\n'));
    igual(conferido.resumo.novas, 1);
    igual(conferido.resumo.recusadas, 1);
    contem(conferido.linhas[1].porque, 'repetida');
  });

  teste('aplicar NÃO pede senha ao administrador', () => {
    const feito = chamar('aplicarImportacao')('corretoras', '9876543;Qualquer');
    igual(feito.criadas, 1);
  });

  teste('mas quem configura sem administrar continua parando na senha', () => {
    // Esta é a ação em que o freio ainda serve: importar exige CONFIGURAR, e
    // não ESTRUTURA — então é a mais provável de ser delegada a alguém que
    // não cuida do sistema. E ela escreve em centenas de linhas de uma vez.
    const consulta = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Consulta');
    chamar('salvarNivelDeAcesso')({
      id: consulta.Id, escopo: 'TODOS',
      acoes: ['exportar', 'configurar'],
      telas: ['dashboard', 'buscarCaso', 'painelAnalitico', 'configuracoes',
        'tabelaCorretoras']
    });
    chamar('salvarUsuario')({
      nome: 'Configura Sem Estrutura', email: 'configura.sem@exemplo.com',
      nivelAcessoId: consulta.Id, ativo: true
    });

    comoUsuario(ambiente, 'configura.sem@exemplo.com', () => {
      lanca(() => chamar('aplicarImportacao')('corretoras', '9876544;Outra'),
        'senha de administrador');
    });
  });

  teste('com a senha liberada, aplicar cadastra e atualiza', () => {
    chamar('definirSenhaDeAdministrador')('segredo123', '');
    chamar('liberarComSenha')('segredo123');

    const feito = chamar('aplicarImportacao')('corretoras', [
      'SUSEP\tCorretora\tCanal\tSegmento',
      '7654321\tCorretora Nova\tCorretora\tDiamante',
      '2345678\tAgência Central\tAgente\tDiamante'
    ].join('\n'));

    igual(feito.criadas, 1);
    igual(feito.atualizadas, 1, 'a Central passou de Demais para Diamante');

    const tabela = chamar('tabelaDeCorretoras')('', '');
    igual(tabela.corretoras.find((u) => u.susep === '7654321').corretora,
      'Corretora Nova');
    igual(tabela.corretoras.find((u) => u.susep === '2345678').segmento,
      'Diamante');
  });

  teste('campo vazio no texto colado não apaga o que já existe', () => {
    // Quem cola só SUSEP e Segmento para reclassificar um lote não quer
    // perder o canal cadastrado — e isso não teria desfazer.
    chamar('liberarComSenha')('segredo123');
    chamar('aplicarImportacao')('corretoras', 'SUSEP;Corretora;Canal;Segmento\n'
      + '7654321;Corretora Nova;;Demais corretoras');

    const canal = chamar('lerRegistros_("CORRETORAS")')
      .find((linha) => String(linha.SUSEP) === '7654321');
    igual(canal.Canal, 'Corretora', 'o canal que já estava lá continua lá');
    igual(canal.Segmento, 'Demais corretoras', 'e o que veio preenchido mudou');
  });

  teste('quem está no cadastro e não veio no texto continua no cadastro', () => {
    // O texto colado é uma correção, não a verdade inteira. Sumir com o que
    // não veio transformaria "colei metade da planilha" num apagamento.
    const antes = chamar('tabelaDeCorretoras')('', '').corretoras.length;
    chamar('liberarComSenha')('segredo123');
    chamar('aplicarImportacao')('corretoras', '1234567;Corretora ABC');
    igual(chamar('tabelaDeCorretoras')('', '').corretoras.length, antes);
  });

  teste('importar SUSEPs bloqueadas exige o motivo, linha a linha', () => {
    const conferido = chamar('conferirImportacao')('susepsBloqueadas', [
      'SUSEP;Motivo;Corretora',
      '6666666;Fraude comprovada;Corretora Ruim',
      '5555555;;Sem motivo'
    ].join('\n'));
    igual(conferido.resumo.novas, 1);
    igual(conferido.resumo.recusadas, 1);
    contem(conferido.linhas[1].porque, 'Motivo em branco');
  });

  teste('a SUSEP importada como bloqueada aparece com o selo', () => {
    chamar('liberarComSenha')('segredo123');
    chamar('aplicarImportacao')('susepsBloqueadas',
      'SUSEP;Motivo;Corretora\n1234567;Fraude comprovada;Corretora ABC');

    const bloqueadas = chamar('listarSusepsBloqueadas')();
    const uma = bloqueadas.find((b) => b.susep === '1234567');
    verdadeiro(!!uma, 'entrou na lista de bloqueadas');
    igual(uma.motivo, 'Fraude comprovada');
    verdadeiro(!!uma.bloqueadaEm, 'e nasceu com a data do bloqueio');

    const tabela = chamar('tabelaDeCorretoras')('', '');
    igual(tabela.corretoras.find((c) => c.susep === '1234567').bloqueada, true);
  });

  teste('acima do teto, recusa antes de gravar metade', () => {
    // Apps Script tem tempo máximo de execução. Uma importação interrompida
    // no meio grava metade, e ninguém sabe qual metade.
    const muitas = [];
    for (let i = 0; i < 2100; i++) muitas.push((1000000 + i) + ';Corretora ' + i);
    lanca(() => chamar('conferirImportacao')('corretoras', muitas.join('\n')),
      'o limite por vez');
  });

  teste('tipo desconhecido diz quais existem', () => {
    lanca(() => chamar('conferirImportacao')('inventado', 'x;y'),
      'Não sei importar');
  });

  teste('quem não configura não importa', () => {
    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      lanca(() => chamar('conferirImportacao')('corretoras', '1;a'),
        'não permite configurar');
      lanca(() => chamar('aplicarImportacao')('corretoras', '1;a'),
        'não permite configurar');
    });
  });

  secao('O selo da SUSEP em escala');

  teste('consultar uma SUSEP lê a COLUNA, nunca a tabela inteira', () => {
    // O selo responde a cada SUSEP digitada no formulário. A operação tem
    // mais de 7 mil SUSEPs cadastradas e mais de 16 mil bloqueadas: ler as
    // duas tabelas inteiras a cada digitação era mandar centenas de milhares
    // de células pela rede, e o campo travava enquanto isso.
    //
    // Este teste não mede o relógio — mede o que foi LIDO. É a mesma regra
    // que sustenta a busca de casos: ler a coluna antes de ler as linhas.
    const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
    chamar('instalarRECC()');

    const corretoras = [];
    for (let i = 0; i < 400; i++) {
      corretoras.push({ Nome: 'Corretora ' + i, SUSEP: String(2000000 + i),
        Corretora: 'Corretora ' + i, Segmento: 'Demais corretoras' });
    }
    const bloqueadas = [];
    for (let i = 0; i < 400; i++) {
      bloqueadas.push({ SUSEP: String(8000000 + i), Motivo: 'fraude' });
    }
    chamar('inserirVariosRegistros_')('CORRETORAS', corretoras);
    chamar('inserirVariosRegistros_')('SUSEP_BLOQUEADAS', bloqueadas);

    chamar('esquecerEstruturaLida_')();
    ambiente.medidor.celulasLidas = 0;
    const selo = chamar('consultarSusep')('2000399');
    const lidas = ambiente.medidor.celulasLidas;

    igual(selo.situacao, 'OK', 'achou a última corretora da lista');

    // As duas tabelas inteiras seriam 400x11 + 400x10 = 8.400 células só
    // delas. Lendo por coluna, são 800 — mais o que a checagem de permissão
    // lê, que é fixo e pequeno. O limite é folgado de propósito: ele pega a
    // volta da leitura de tabela inteira, não variações de uma coluna a mais.
    verdadeiro(lidas < 4000,
      'consultar uma SUSEP leu ' + lidas + ' células — isso é leitura de '
      + 'tabela inteira voltando. Deve ler a coluna da SUSEP e só a linha '
      + 'que casar (buscarRegistroVisivel_).');
  });

  secao('A tela');

  teste('a página inclui a tela, e a rota chama ela', () => {
    const pasta = path.join(__dirname, '..', '..', 'Front-End');
    contem(fs.readFileSync(path.join(pasta, 'Index.html'), 'utf8'),
      "incluir('TabelaCorretoras')");
    contem(fs.readFileSync(path.join(pasta, 'Aplicacao.html'), 'utf8'),
      'TelaTabelaCorretoras.montar(pacote)');
  });

  teste('"não encontrado" é atenção, e não erro', () => {
    // Cadastro incompleto não é corretora irregular. Pintar de vermelho faria
    // a operação achar que há um problema com quem trouxe o caso.
    const tela = fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End',
      'TabelaCorretoras.html'), 'utf8');
    contem(tela, 'tom-atencao');
    contem(tela, 'corretora irregular',
      'o motivo fica escrito junto da regra, para quem mexer daqui a um ano');
    contem(tela, 'tom-destaque', 'e Diamante tem o seu próprio tom');
  });
}

module.exports = { rodarTestesDeCorretoras };
