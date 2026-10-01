/**
 * ============================================================================
 * PGO — testes-corretoras.js · a Etapa 10
 * ============================================================================
 * Dois cadastros que sustentam o resto do sistema e que, até esta etapa, só se
 * ajustavam abrindo a planilha: as corretoras Diamante e as SUSEPs bloqueadas.
 *
 * SÃO DUAS LISTAS DIFERENTES, de dois donos — decisão do PO. Uma SUSEP que
 * esteja no cadastro de corretoras sai LIBERADA no selo, mesmo constando na
 * lista de bloqueios. Vários testes aqui existem só para guardar essa ordem.
 *
 * E a SUSEP tem LETRA: "RET00J", formato que ele confirmou. Toda SUSEP destes
 * testes é escrita assim de propósito — SUSEP só de dígito passaria mesmo com
 * o campo de volta a `identificador`, e o teste não provaria nada.
 *
 * O que os testes cuidam com mais atenção é o CRUZAMENTO com os casos — em
 * especial as SUSEPs que aparecem nos casos e não estão cadastradas. É a
 * informação mais útil desta tela, e a mais fácil de quebrar em silêncio.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario, lerPeca } =
  require('./ferramentas');

function rodarTestesDeCorretoras() {
  console.log('\nEtapa 10 — Tabela de Corretoras');

  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');

  const canal = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_MESA');

  chamar('inserirVariosRegistros_')('CORRETORAS', [
    { SUSEP: 'RET00J', Corretora: 'Corretora ABC', Sucursal: '12',
      Segmento: 'Diamante', Consultor: 'Marina Alencar' },
    { SUSEP: 'RET01A', Corretora: 'Agência Central', Sucursal: '58',
      Segmento: 'Demais corretoras', Consultor: 'Posto Central' }
  ]);

  chamar('inserirVariosRegistros_')('BASE_MESA', [
    { Analista: 'Ana', Status: 'Em andamento', 'Data de entrada': '10/09/2026',
      SUSEP: 'RET00J', Corretora: 'Corretora ABC', 'Nome do segurado': 'c1' },
    { Analista: 'Ana', Status: 'Em andamento', 'Data de entrada': '10/09/2026',
      SUSEP: 'RET00J', Corretora: 'Corretora ABC', 'Nome do segurado': 'c2' },
    { Analista: 'Ana', Status: 'Em andamento', 'Data de entrada': '10/09/2026',
      SUSEP: 'RET99Z', Corretora: 'Nunca Vista', 'Nome do segurado': 'c3' }
  ]);

  secao('A tabela');

  teste('cada corretora vem com o volume de casos ao lado', () => {
    // Uma tabela de corretoras sem volume é uma agenda telefônica. Com ele,
    // ela responde "quem me dá trabalho".
    const tabela = chamar('tabelaDeCorretoras')('', '');
    const abc = tabela.corretoras.find((uma) => uma.susep === 'RET00J');
    igual(abc.casos, 2);
    igual(abc.segmento, 'Diamante');
    igual(abc.sucursal, '12');
    igual(abc.consultor, 'Marina Alencar');
    verdadeiro(abc.bloqueada === undefined,
      'a tabela Diamante não tem mais status de bloqueio: é outra lista');
  });

  teste('a lista vem de quem mais traz caso, e não em ordem alfabética', () => {
    const tabela = chamar('tabelaDeCorretoras')('', '');
    igual(tabela.corretoras[0].susep, 'RET00J',
      'quem tem mais casos encabeça — é o que dá ordem de importância');
  });

  teste('cadastro sem segmento vira "Não encontrado", e não Diamante', () => {
    const id = chamar('salvarCorretora')({
      susep: 'RET05E', corretora: 'Sem Segmento', sucursal: '12'
    });
    const semSegmento = chamar('tabelaDeCorretoras')('', '').corretoras
      .find((uma) => uma.id === id);
    igual(semSegmento.segmento, 'Não encontrado',
      'virar Diamante por descuido mudaria o atendimento de quem não é');
  });

  teste('procurar acha por corretora, sucursal, consultor e SUSEP', () => {
    igual(chamar('tabelaDeCorretoras')('corretora abc', '').quantasFiltradas, 1);
    igual(chamar('tabelaDeCorretoras')('posto central', '').quantasFiltradas, 1,
      'pelo consultor');
    igual(chamar('tabelaDeCorretoras')('ret00j', '').quantasFiltradas, 1,
      'a SUSEP em minúscula acha a mesma corretora');
    igual(chamar('tabelaDeCorretoras')('ret-00j', '').quantasFiltradas, 1,
      'e com pontuação também');
    verdadeiro(chamar('tabelaDeCorretoras')('RET', '').quantasFiltradas >= 2,
      'um pedaço da SUSEP acha todas as que começam por ele');
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
    igual(fora[0].susep, 'RET99Z', 'e com a letra, como ela aparece nos casos');
    igual(fora[0].casos, 1);
    igual(fora[0].nomeNosCasos, 'Nunca Vista',
      'o nome vem dos próprios casos, como palpite para reconhecer a corretora');
  });

  teste('bloquear NÃO tira a SUSEP da lista de fora do cadastro', () => {
    /*
     * ESTA REGRA VIROU, nesta rodada. Antes, bloquear já contava como
     * "conhecida" — o selo mostrava o bloqueio, e avisar aqui seria um recado
     * que não batia com a outra tela.
     *
     * Agora são DUAS LISTAS, de dois donos: "corretoras Diamante não podem ter
     * status de bloqueada (...) pertence a outra lista". Uma SUSEP que só está
     * na lista de bloqueios continua FORA do cadastro de corretoras, e é
     * exatamente isso que esta lista existe para dizer.
     */
    chamar('inserirRegistro_')('BASE_MESA', {
      Analista: 'Ana', Status: 'Em andamento', 'Data de entrada': '10/09/2026',
      SUSEP: 'RET98Y', Corretora: 'Bloqueada Ltda', 'Nome do segurado': 'c9'
    });
    verdadeiro(chamar('tabelaDeCorretoras')('', '').foraDoCadastro
      .some((uma) => uma.susep === 'RET98Y'), 'antes de bloquear, ela aparece');

    chamar('bloquearSusep')({ susep: 'RET98Y', corretora: 'Bloqueada Ltda',
      sucursal: '12', coordenadorComercial: 'Coordenação Sul' });
    verdadeiro(chamar('tabelaDeCorretoras')('', '').foraDoCadastro
      .some((uma) => uma.susep === 'RET98Y'),
      'depois de bloquear, ela CONTINUA fora do cadastro de corretoras');
  });

  teste('cadastrar a SUSEP tira ela da lista de fora do cadastro', () => {
    chamar('salvarCorretora')({
      susep: 'RET99Z', corretora: 'Nunca Vista', sucursal: '58',
      segmento: 'Demais corretoras'
    });
    verdadeiro(!chamar('tabelaDeCorretoras')('', '').foraDoCadastro
      .some((uma) => uma.susep === 'RET99Z'));

    // E o selo do formulário para de dizer "não encontrada".
    igual(chamar('consultarSusep')('RET99Z').situacao, 'OK');
  });

  secao('As travas do cadastro');

  teste('duas corretoras com a mesma SUSEP são recusadas', () => {
    // O selo do formulário escolheria uma delas pela ordem da planilha, que
    // ninguém controla.
    lanca(() => chamar('salvarCorretora')({
      susep: 'RET00J', corretora: 'Outra Qualquer'
    }), 'já está cadastrada');

    // E a repetição é pela CHAVE, não pelo texto: "ret00j" é a mesma SUSEP.
    // Sem isto, o selo escolheria uma das duas pela ordem da planilha.
    lanca(() => chamar('salvarCorretora')({
      susep: 'ret-00j', corretora: 'Outra Qualquer'
    }), 'já está cadastrada');
  });

  teste('corretora sem SUSEP ou sem nome é recusada', () => {
    lanca(() => chamar('salvarCorretora')({ corretora: 'Sem SUSEP' }),
      'Informe a SUSEP');
    lanca(() => chamar('salvarCorretora')({ susep: 'RET08H' }),
      'Informe o nome da corretora');
  });

  teste('tirar do cadastro some da tela e mantém a linha na planilha', () => {
    const id = chamar('salvarCorretora')({
      susep: 'RET07G', corretora: 'Some Daqui', sucursal: '12'
    });
    igual(chamar('tabelaDeCorretoras')('some daqui', '').quantasFiltradas, 1);

    chamar('ocultarCorretora')(id);
    igual(chamar('tabelaDeCorretoras')('some daqui', '').quantasFiltradas, 0);

    const naPlanilha = chamar('lerRegistros_')('CORRETORAS', { incluirOcultos: true })
      .find((linha) => linha.__id === id);
    verdadeiro(!!naPlanilha, 'a linha continua lá, como em todo o resto do sistema');
  });

  secao('As SUSEPs bloqueadas');

  teste('bloquear pede SUSEP, corretora, sucursal e coordenador', () => {
    /*
     * Os quatro campos que o PO pediu: "SUSEP's bloqueadas deve pedir: SUSEP,
     * Corretora, Sucursal e coordenador comercial".
     *
     * O MOTIVO saiu, e era obrigatório. O argumento dele era bom — quem vê o
     * selo vermelho seis meses depois precisa saber o que fazer. Quem responde
     * por isso agora é o coordenador comercial: tem nome, e dá para perguntar.
     */
    chamar('bloquearSusep')({
      susep: 'RET01A', corretora: 'Agência Central',
      sucursal: '58', coordenadorComercial: 'Coordenação Norte'
    });

    const uma = chamar('listarSusepsBloqueadas()')
      .find((linha) => linha.susep === 'RET01A');
    verdadeiro(!!uma, 'entrou na lista');
    igual(uma.sucursal, '58');
    igual(uma.coordenadorComercial, 'Coordenação Norte');
    verdadeiro(uma.motivo === undefined, 'o motivo não é mais pedido nem lido');
  });

  teste('bloquear sem SUSEP é recusado; sem o resto, aceito', () => {
    // A SUSEP é a única coisa sem a qual o bloqueio não quer dizer nada: é por
    // ela que o selo acha a linha.
    lanca(() => chamar('bloquearSusep')({ corretora: 'Sem SUSEP' }),
      'Informe a SUSEP a bloquear');
    const id = chamar('bloquearSusep')({ susep: 'RET50M' });
    verdadeiro(!!id, 'o resto a operação completa depois');
  });

  teste('bloqueio NÃO vence o cadastro de corretoras Diamante', () => {
    /*
     * A regra que virou nesta rodada, e a mais importante deste arquivo.
     *
     * A RET01A está no cadastro de corretoras E acabou de ser bloqueada. O
     * selo tem de sair VERDE: "corretoras Diamante não podem ter status de
     * bloqueada por gentileza mesmo que o SUSEP esteja na lista de bloqueadas.
     * Pertence a outra lista."
     */
    const selo = chamar('consultarSusep')('RET01A');
    igual(selo.situacao, 'OK', 'está nas duas listas, e o cadastro ganha');
    igual(selo.segmento, 'Demais corretoras');
  });

  teste('fora do cadastro, o bloqueio vale — senão a lista não serviria', () => {
    const selo = chamar('consultarSusep')('RET50M');
    igual(selo.situacao, 'BLOQUEADA');
  });

  teste('bloquear não impede cadastrar caso', () => {
    // Bloqueio que impedisse faria a pessoa registrar num caderno, e o sistema
    // perderia o caso de vista.
    const novo = chamar('cadastrarCaso')(canal.id, {
      status: 'Em andamento', nomedosegurado: 'Caso de bloqueada',
      datadeentrada: '10/09/2026', susep: 'RET50M'
    });
    verdadeiro(!!novo.id);
  });

  teste('a lista de bloqueadas mostra o volume e a data', () => {
    const lista = chamar('listarSusepsBloqueadas()');
    const bloqueada = lista.find((uma) => uma.susep === 'RET01A');
    verdadeiro(!!bloqueada);
    verdadeiro(/^\d{2}\/\d{2}\/\d{4}$/.test(bloqueada.bloqueadaEm),
      'a data vem formatada, veio ' + bloqueada.bloqueadaEm);
  });

  teste('bloquear a mesma SUSEP duas vezes é recusado', () => {
    lanca(() => chamar('bloquearSusep')({ susep: 'RET01A' }),
      'já está bloqueada');
    // E pela CHAVE: a mesma SUSEP escrita de outro jeito é a mesma SUSEP.
    lanca(() => chamar('bloquearSusep')({ susep: 'ret-01a' }),
      'já está bloqueada');
  });

  teste('liberar guarda o histórico, e o selo volta ao que o cadastro diz', () => {
    const bloqueada = chamar('listarSusepsBloqueadas()')
      .find((uma) => uma.susep === 'RET50M');
    chamar('desbloquearSusep')(bloqueada.id);

    igual(chamar('consultarSusep')('RET50M').situacao, 'NAO_ENCONTRADA',
      'liberada e fora do cadastro de corretoras, ela é desconhecida');
    const naPlanilha = chamar('lerRegistros_')('SUSEP_BLOQUEADAS',
      { incluirOcultos: true }).find((linha) => linha.__id === bloqueada.id);
    verdadeiro(!!naPlanilha, 'o registro do bloqueio permanece, com a data');
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
        susep: 'RET11K', corretora: 'Pela porta dos fundos'
      }), 'não permite configurar');
      lanca(() => chamar('bloquearSusep')({ susep: 'RET11K' }),
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
      'SUSEP\tCorretora\tSucursal\tSegmento',
      'RET60N\tCorretora Nova\t12\tDiamante',
      'RET00J\tCorretora ABC\t12\tDiamante'
    ].join('\n');

    const conferido = chamar('conferirImportacao')('corretoras', colado);
    verdadeiro(conferido.tinhaCabecalho, 'o cabeçalho foi reconhecido');
    igual(conferido.resumo.total, 2, 'e não entrou na conta como corretora');
    igual(conferido.resumo.novas, 1);
    igual(conferido.resumo.iguais, 1, 'a ABC já está assim no cadastro');
  });

  teste('sem cabeçalho, vale a ordem declarada', () => {
    const conferido = chamar('conferirImportacao')('corretoras',
      'RET61O;Corretora Sem Cabeçalho;12;Demais corretoras');
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
      'Diamante;Fora de Ordem;RET62P'
    ].join('\n'));
    igual(conferido.linhas[0].campos.susep, 'RET62P');
    igual(conferido.linhas[0].campos.corretora, 'Fora de Ordem');
    igual(conferido.linhas[0].campos.segmento, 'Diamante');
  });

  teste('conferir não grava nada', () => {
    const antes = chamar('tabelaDeCorretoras')('', '').corretoras.length;
    chamar('conferirImportacao')('corretoras', 'RET63Q;Fantasma');
    igual(chamar('tabelaDeCorretoras')('', '').corretoras.length, antes,
      'o passo do meio é só para ver — se gravasse, não haveria como desistir');
  });

  teste('linha sem o obrigatório é recusada, e diz por quê', () => {
    const conferido = chamar('conferirImportacao')('corretoras', [
      ';Sem SUSEP;12;Diamante',
      'RET64R;;12;Diamante'
    ].join('\n'));
    igual(conferido.resumo.recusadas, 2);
    contem(conferido.linhas[0].porque, 'SUSEP em branco');
    contem(conferido.linhas[1].porque, 'Corretora em branco');
  });

  teste('SUSEP só de letra é aceita: ela não é mais identificador', () => {
    // Era recusada por "sem nenhum dígito", quando a SUSEP ainda era campo de
    // dígito. O PO corrigiu o formato, e uma SUSEP que a operação usa não pode
    // ser recusada pelo sistema por causa de uma suposição antiga.
    const conferido = chamar('conferirImportacao')('corretoras',
      'SOLETRAS;Corretora de Letra;12;Diamante');
    igual(conferido.resumo.recusadas, 0);
    igual(conferido.linhas[0].campos.susep, 'SOLETRAS');
  });

  teste('coluna vazia no começo não desloca a linha inteira', () => {
    // Bug 23. A linha era aparada ANTES de ser partida, e com TAB o corte
    // comia a primeira coluna quando ela vinha vazia: a corretora ia parar
    // na SUSEP, o canal na corretora, e a recusa apontava para o campo
    // errado. Quem apara é cada célula, depois de partida.
    const conferido = chamar('conferirImportacao')('corretoras', [
      'SUSEP\tCorretora\tSucursal\tSegmento',
      '\tSem SUSEP nenhuma\t12\tDiamante'
    ].join('\n'));

    igual(conferido.linhas[0].campos.susep, '');
    igual(conferido.linhas[0].campos.corretora, 'Sem SUSEP nenhuma',
      'a corretora continua na coluna dela');
    igual(conferido.linhas[0].campos.sucursal, '12');
    igual(conferido.linhas[0].campos.segmento, 'Diamante');
    contem(conferido.linhas[0].porque, 'SUSEP em branco',
      'e a recusa aponta o campo certo');
  });

  teste('a mesma SUSEP duas vezes no texto colado é recusada na segunda', () => {
    const conferido = chamar('conferirImportacao')('corretoras', [
      'RET65S;Primeira',
      'ret-65s;Segunda'
    ].join('\n'));
    igual(conferido.resumo.novas, 1);
    igual(conferido.resumo.recusadas, 1);
    contem(conferido.linhas[1].porque, 'repetida',
      'a segunda é a mesma SUSEP escrita de outro jeito');
  });

  teste('aplicar NÃO pede senha ao administrador', () => {
    const feito = chamar('aplicarImportacao')('corretoras', 'RET66T;Qualquer');
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
      telas: ['trabalho', 'buscarCaso', 'produtividade', 'configuracoes',
        'tabelaCorretoras']
    });
    chamar('salvarUsuario')({
      nome: 'Configura Sem Estrutura', email: 'configura.sem@exemplo.com',
      nivelAcessoId: consulta.Id, ativo: true
    });

    comoUsuario(ambiente, 'configura.sem@exemplo.com', () => {
      lanca(() => chamar('aplicarImportacao')('corretoras', 'RET67U;Outra'),
        'senha de administrador');
    });
  });

  teste('com a senha liberada, aplicar cadastra e atualiza', () => {
    chamar('definirSenhaDeAdministrador')('segredo123', '');
    chamar('liberarComSenha')('segredo123');

    const feito = chamar('aplicarImportacao')('corretoras', [
      'SUSEP\tCorretora\tSucursal\tSegmento\tConsultor',
      'RET60N\tCorretora Nova\t12\tDiamante\tMarina Alencar',
      'RET01A\tAgência Central\t58\tDiamante\tPosto Central'
    ].join('\n'));

    igual(feito.criadas, 1);
    igual(feito.atualizadas, 1, 'a Central passou de Demais para Diamante');

    const tabela = chamar('tabelaDeCorretoras')('', '');
    igual(tabela.corretoras.find((u) => u.susep === 'RET60N').corretora,
      'Corretora Nova');
    igual(tabela.corretoras.find((u) => u.susep === 'RET60N').consultor,
      'Marina Alencar');
    igual(tabela.corretoras.find((u) => u.susep === 'RET01A').segmento,
      'Diamante');
  });

  teste('campo vazio no texto colado não apaga o que já existe', () => {
    // Quem cola só SUSEP e Segmento para reclassificar um lote não quer
    // perder o canal cadastrado — e isso não teria desfazer.
    chamar('liberarComSenha')('segredo123');
    chamar('aplicarImportacao')('corretoras',
      'SUSEP;Corretora;Sucursal;Segmento\n'
      + 'RET60N;Corretora Nova;;Demais corretoras');

    const corretora = chamar('lerRegistros_("CORRETORAS")')
      .find((linha) => String(linha.SUSEP) === 'RET60N');
    igual(corretora.Sucursal, '12', 'a sucursal que já estava lá continua lá');
    igual(corretora.Segmento, 'Demais corretoras',
      'e o que veio preenchido mudou');
  });

  teste('quem está no cadastro e não veio no texto continua no cadastro', () => {
    // O texto colado é uma correção, não a verdade inteira. Sumir com o que
    // não veio transformaria "colei metade da planilha" num apagamento.
    const antes = chamar('tabelaDeCorretoras')('', '').corretoras.length;
    chamar('liberarComSenha')('segredo123');
    chamar('aplicarImportacao')('corretoras', 'RET00J;Corretora ABC');
    igual(chamar('tabelaDeCorretoras')('', '').corretoras.length, antes);
  });

  teste('importar SUSEPs bloqueadas exige só a SUSEP, linha a linha', () => {
    const conferido = chamar('conferirImportacao')('susepsBloqueadas', [
      'SUSEP;Corretora;Sucursal;Coordenador comercial',
      'RET70V;Corretora Ruim;12;Coordenação Sul',
      ';Sem SUSEP;12;Coordenação Sul'
    ].join('\n'));
    igual(conferido.resumo.novas, 1);
    igual(conferido.resumo.recusadas, 1);
    contem(conferido.linhas[1].porque, 'SUSEP em branco');
  });

  teste('a SUSEP importada como bloqueada entra com o coordenador', () => {
    chamar('liberarComSenha')('segredo123');
    chamar('aplicarImportacao')('susepsBloqueadas',
      'SUSEP;Corretora;Sucursal;Coordenador comercial\n'
      + 'RET71W;Corretora Fora;58;Coordenação Norte');

    const uma = chamar('listarSusepsBloqueadas')()
      .find((b) => b.susep === 'RET71W');
    verdadeiro(!!uma, 'entrou na lista de bloqueadas');
    igual(uma.coordenadorComercial, 'Coordenação Norte');
    verdadeiro(!!uma.bloqueadaEm, 'e nasceu com a data do bloqueio');

    // E o selo dela sai vermelho: não está no cadastro de corretoras.
    igual(chamar('consultarSusep')('RET71W').situacao, 'BLOQUEADA');
  });

  teste('bloquear por importação NÃO marca a corretora Diamante', () => {
    // A mesma regra das duas listas, agora pelo caminho da importação em
    // lote: colar a planilha de bloqueios não pode pintar de vermelho uma
    // corretora que está no cadastro Diamante.
    chamar('liberarComSenha')('segredo123');
    chamar('aplicarImportacao')('susepsBloqueadas',
      'SUSEP;Corretora;Sucursal;Coordenador comercial\n'
      + 'RET00J;Corretora ABC;12;Coordenação Sul');

    igual(chamar('consultarSusep')('RET00J').situacao, 'OK',
      'está no cadastro de corretoras, e o cadastro ganha');
  });

  teste('acima do teto, recusa antes de gravar metade', () => {
    // Apps Script tem tempo máximo de execução. Uma importação interrompida
    // no meio grava metade, e ninguém sabe qual metade.
    const muitas = [];
    for (let i = 0; i < 2100; i++) muitas.push('RET' + i + ';Corretora ' + i);
    lanca(() => chamar('conferirImportacao')('corretoras', muitas.join('\n')),
      'o limite por vez');
  });

  teste('tipo desconhecido diz quais existem', () => {
    lanca(() => chamar('conferirImportacao')('inventado', 'x;y'),
      'Não sei importar');
  });

  teste('quem não configura não importa', () => {
    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      lanca(() => chamar('conferirImportacao')('corretoras', 'RET80X;a'),
        'não permite configurar');
      lanca(() => chamar('aplicarImportacao')('corretoras', 'RET80X;a'),
        'não permite configurar');
    });
  });

  secao('A importação vindo de OUTRA planilha, pelo Id');

  /*
    O PO pediu o caminho do Id para as duas listas, e a razão é de volume:
    colar sete mil SUSEPs bloqueadas numa caixa de texto é o que ninguém faz
    duas vezes. Daqui para baixo, a conferência é a MESMA do texto colado — e
    é esse "mesma" que estes testes cobram, um por um.
  */

  teste('corretoras de outra planilha passam pela mesma conferência', () => {
    // A corretora "já cadastrada" é cadastrada AQUI, e não a ABC do começo do
    // arquivo: os testes de aplicar que vêm antes alteram a ABC, e um teste
    // que depende do que outro teste deixou passa a falhar por um motivo que
    // não é o dele.
    chamar('salvarCorretora')({
      susep: 'RET69O', corretora: 'Corretora Já Cadastrada', sucursal: '19',
      segmento: 'Diamante', consultor: 'Franky'
    });

    const idDeFora = ambiente.criarPlanilhaExterna('Minhas corretoras', [
      ['SUSEP', 'Corretora', 'Sucursal', 'Segmento', 'Consultor'],
      ['RET70P', 'Corretora da Planilha', '31', 'Diamante', 'Nami'],
      ['RET69O', 'Corretora Já Cadastrada', '19', 'Diamante', 'Franky']
    ]);

    const conferido = chamar('conferirImportacao')('corretoras',
      { tipo: 'planilha', planilhaId: idDeFora, aba: 'Minhas corretoras' });

    verdadeiro(conferido.tinhaCabecalho, 'o cabeçalho de lá é reconhecido');
    igual(conferido.resumo.total, 2, 'e não conta como corretora');
    igual(conferido.resumo.novas, 1, 'a da planilha é nova');
    igual(conferido.resumo.iguais, 1, 'a outra já está assim no cadastro');
    igual(conferido.linhas[0].campos.consultor, 'Nami',
      'e o consultor veio junto');
  });

  teste('a aba em branco vale a PRIMEIRA aba, como a importação de casos', () => {
    const idDeFora = ambiente.criarPlanilhaExterna('Qualquer nome', [
      ['SUSEP', 'Corretora'],
      ['RET71Q', 'Corretora Sem Nome de Aba']
    ]);
    const conferido = chamar('conferirImportacao')('corretoras',
      { tipo: 'planilha', planilhaId: idDeFora, aba: '' });
    igual(conferido.resumo.novas, 1);
  });

  teste('ponto e vírgula DENTRO da célula não parte a linha', () => {
    // A razão de a grade existir. Remontar as células num texto com separador
    // para reaproveitar o leitor antigo estragaria a primeira corretora
    // chamada "SILVA; SOUZA & CIA" — e seria um estrago silencioso, porque a
    // linha seguinte entraria deslocada e ainda assim pareceria válida.
    const idDeFora = ambiente.criarPlanilhaExterna('Com pontuação', [
      ['SUSEP', 'Corretora', 'Sucursal'],
      ['RET72R', 'SILVA; SOUZA & CIA', '44']
    ]);
    const conferido = chamar('conferirImportacao')('corretoras',
      { tipo: 'planilha', planilhaId: idDeFora, aba: 'Com pontuação' });

    igual(conferido.linhas[0].campos.corretora, 'SILVA; SOUZA & CIA',
      'o nome chegou inteiro');
    igual(conferido.linhas[0].campos.sucursal, '44',
      'e a sucursal não andou de lugar');
  });

  teste('linha vazia no meio é pulada, e o número da linha é o de VERDADE', () => {
    // Quem vai conferir o recado "a linha 4 está sem SUSEP" procura a linha 4
    // DA PLANILHA. Contar só as linhas aproveitadas mandaria a pessoa para a
    // linha errada — e numa planilha de mil linhas ninguém acha o erro assim.
    const idDeFora = ambiente.criarPlanilhaExterna('Com buraco', [
      ['SUSEP', 'Corretora'],
      ['', ''],
      ['', 'Corretora Sem SUSEP']
    ]);
    const conferido = chamar('conferirImportacao')('corretoras',
      { tipo: 'planilha', planilhaId: idDeFora, aba: 'Com buraco' });

    igual(conferido.resumo.total, 1, 'a linha vazia não virou linha recusada');
    igual(conferido.linhas[0].numero, 3, 'e a recusada é a linha 3 da planilha');
    contem(conferido.linhas[0].porque, 'SUSEP em branco');
  });

  teste('no texto colado o número também é o da linha de verdade', () => {
    const colado = ['SUSEP;Corretora', '', ';Corretora Sem SUSEP'].join('\n');
    const conferido = chamar('conferirImportacao')('corretoras', colado);
    igual(conferido.linhas[0].numero, 3,
      'a linha em branco conta na numeração, mas não entra na importação');
  });

  teste('aplicar pela planilha grava, como pelo texto colado', () => {
    const idDeFora = ambiente.criarPlanilhaExterna('Para aplicar', [
      ['SUSEP', 'Corretora', 'Sucursal', 'Segmento', 'Consultor'],
      ['RET73S', 'Corretora Gravada De Fora', '77', 'Diamante', 'Zoro']
    ]);

    const feito = chamar('aplicarImportacao')('corretoras',
      { tipo: 'planilha', planilhaId: idDeFora, aba: 'Para aplicar' });
    igual(feito.criadas, 1);

    const gravada = chamar('tabelaDeCorretoras')('', '').corretoras
      .find((uma) => uma.susep === 'RET73S');
    igual(gravada.corretora, 'Corretora Gravada De Fora');
    igual(gravada.sucursal, '77');
    igual(gravada.consultor, 'Zoro');
  });

  teste('SUSEPs bloqueadas também vêm de outra planilha', () => {
    const idDeFora = ambiente.criarPlanilhaExterna('Bloqueadas', [
      ['SUSEP', 'Corretora', 'Sucursal', 'Coordenador comercial'],
      ['RET74T', 'Corretora Bloqueada De Fora', '88', 'Usopp']
    ]);

    const feito = chamar('aplicarImportacao')('susepsBloqueadas',
      { tipo: 'planilha', planilhaId: idDeFora, aba: 'Bloqueadas' });
    igual(feito.criadas, 1);

    const bloqueada = chamar('listarSusepsBloqueadas')()
      .find((uma) => uma.susep === 'RET74T');
    igual(bloqueada.coordenadorComercial, 'Usopp');
    igual(bloqueada.sucursal, '88');
    igual(chamar('consultarSusep')('RET74T').situacao, 'BLOQUEADA',
      'e o selo do formulário já a vê bloqueada');
  });

  teste('aba que não existe diz quais existem', () => {
    const idDeFora = ambiente.criarPlanilhaExterna('Corretoras 2026', [
      ['SUSEP', 'Corretora'], ['RET75U', 'Alguma']
    ]);
    lanca(() => chamar('conferirImportacao')('corretoras',
      { tipo: 'planilha', planilhaId: idDeFora, aba: 'Corretoras 2025' }),
      'As abas dela são');
  });

  teste('Id que não abre explica o que conferir', () => {
    // A causa é quase sempre a mesma e quase nunca óbvia: a conta que roda o
    // sistema não tem acesso à planilha.
    lanca(() => chamar('conferirImportacao')('corretoras',
      { tipo: 'planilha', planilhaId: 'nao-existe', aba: '' }),
      'Confira o Id');
  });

  teste('o teto de linhas vale pela planilha também', () => {
    const linhas = [['SUSEP', 'Corretora']];
    for (let i = 0; i < 2100; i++) linhas.push(['RETX' + i, 'Corretora ' + i]);
    const idDeFora = ambiente.criarPlanilhaExterna('Grande', linhas);

    lanca(() => chamar('conferirImportacao')('corretoras',
      { tipo: 'planilha', planilhaId: idDeFora, aba: 'Grande' }),
      'o limite por vez');
  });

  teste('a tela oferece as duas fontes, e manda a fonte inteira ao servidor', () => {
    const tela = lerPeca('TabelaCorretoras');
    contem(tela, 'data-fonte-da-importacao="colado"');
    contem(tela, 'data-fonte-da-importacao="planilha"');
    contem(tela, 'planilha-da-importacao');
    contem(tela, 'aba-da-importacao');
    contem(tela, "Servidor.chamar('conferirImportacao', tipoDaImportacao, fonte)");
    contem(tela, "Servidor.chamar('aplicarImportacao', tipoDaImportacao, fonte)");
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
      corretoras.push({ SUSEP: 'RETA' + i, Corretora: 'Corretora ' + i,
        Sucursal: '12', Segmento: 'Demais corretoras' });
    }
    const bloqueadas = [];
    for (let i = 0; i < 400; i++) {
      bloqueadas.push({ SUSEP: 'RETB' + i, CoordenadorComercial: 'Sul' });
    }
    chamar('inserirVariosRegistros_')('CORRETORAS', corretoras);
    chamar('inserirVariosRegistros_')('SUSEP_BLOQUEADAS', bloqueadas);

    chamar('esquecerEstruturaLida_')();
    ambiente.medidor.celulasLidas = 0;
    const selo = chamar('consultarSusep')('RETA399');
    const lidas = ambiente.medidor.celulasLidas;

    igual(selo.situacao, 'OK', 'achou a última corretora da lista');

    // As duas tabelas inteiras seriam 400x10 + 400x10 = 8.000 células só
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
