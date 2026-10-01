/**
 * ============================================================================
 * PGO — testes-cadastro.js · a Etapa 4
 * ============================================================================
 * O formulário é dado, não código. Então o que chega da tela é dado também —
 * e dado não se confia. A maior parte destes testes existe para provar que o
 * servidor não acredita no navegador.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, celula, lerPeca, scriptDaPeca, comoUsuario } =
  require('./ferramentas');

function rodarTestesDeCadastro() {
  console.log('\nEtapa 4 — Cadastrar Caso');

  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');
  const planilha = ambiente.planilha;

  const canais = chamar('canaisVisiveis_()');
  const canalDiamante = canais.find((canal) => canal.aba === 'BASE_MESA');
  const canalRet = canais.find((canal) => canal.aba === 'BASE_RET');

  secao('O formulário vem do servidor, não do código');

  teste('o canal entrega seções com campos, na ordem do administrador', () => {
    const formulario = chamar('formularioDoCanal')(canalDiamante.id);
    igual(formulario.canal.nome, 'Mesa Diamante');
    verdadeiro(formulario.secoes.length >= 4,
      'esperava várias seções, veio ' + formulario.secoes.length);

    const todos = formulario.secoes.reduce((soma, s) => soma.concat(s.campos), []);
    igual(todos.length, 19, 'os 20 cabeçalhos menos o Id, que ninguém digita');
    verdadeiro(!todos.some((campo) => campo.chave === 'id'),
      'o Id não é campo de tela');
  });

  teste('o seletor traz as opções do catálogo, e só as do canal', () => {
    const formulario = chamar('formularioDoCanal')(canalDiamante.id);
    const todos = formulario.secoes.reduce((soma, s) => soma.concat(s.campos), []);

    const status = todos.find((campo) => campo.chave === 'status');
    igual(status.tipo, 'seletor');
    igual(status.opcoes.length, 3, 'os três status da Mesa Diamante');
    igual(status.opcoes[0].valor, 'Em andamento');
    igual(status.valorPadrao, 'Em andamento',
      'o caso começa em andamento, sem ninguém escolher o óbvio');
    verdadeiro(!status.opcoes.some((o) => o.valor === 'Aguardando transmissão'),
      'status da RET não pode aparecer na Mesa Diamante');

    // Canal de origem é de CADA canal, não uma lista só: a Mesa Diamante
    // recebe por chat e e-mail; a RET, por URA e Central.
    const canal = todos.find((campo) => campo.chave === 'canal');
    igual(canal.rotulo, 'Canal de origem');
    verdadeiro(canal.opcoes.some((o) => o.valor === 'Chat'),
      'a Mesa Diamante recebe por chat');
    verdadeiro(!canal.opcoes.some((o) => o.valor === 'URA'),
      'URA é da RET, não da Mesa Diamante');
  });

  teste('o CPF nasce com máscara, e a máscara diz quantos dígitos ele quer', () => {
    const formulario = chamar('formularioDoCanal')(canalDiamante.id);
    const todos = formulario.secoes.reduce((soma, s) => soma.concat(s.campos), []);
    const cpf = todos.find((campo) => campo.chave === 'documentocpf');
    igual(cpf.mascara, '000.000.000-00');
    igual(chamar('quantosDigitosAMascaraPede_')(cpf.mascara), 11);
  });

  teste('o analista é um seletor com quem está cadastrado e ativo', () => {
    chamar('salvarUsuario')({
      nome: 'Diego Castilho', email: 'diego@exemplo.com',
      nivelAcessoId: chamar('lerRegistros_("CATALOGO")')
        .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id,
      ativo: true
    });
    const desativado = chamar('salvarUsuario')({
      nome: 'Saiu da Equipe', email: 'saiu@exemplo.com',
      nivelAcessoId: chamar('lerRegistros_("CATALOGO")')
        .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id,
      ativo: true
    });
    chamar('desativarUsuario')(desativado);

    const analista = chamar('formularioDoCanal')(canalDiamante.id)
      .secoes.reduce((soma, s) => soma.concat(s.campos), [])
      .find((campo) => campo.chave === 'analista');

    igual(analista.tipo, 'seletor');
    const nomes = analista.opcoes.map((o) => o.valor);
    verdadeiro(nomes.indexOf('Diego Castilho') >= 0, 'quem está ativo aparece');
    verdadeiro(nomes.indexOf('Saiu da Equipe') < 0, 'quem foi desativado não');
    igual(nomes.slice().sort().join('|'), nomes.join('|'), 'a lista vem em ordem');
  });

  teste('a lista de analistas vem de USUARIOS, e não de uma cópia', () => {
    // Repetir os nomes no catálogo criaria duas verdades sobre a mesma coisa:
    // bastaria alguém sair da equipe para elas divergirem.
    const campo = chamar('lerRegistros_("CAMPOS")')
      .find((c) => c.ChaveTecnica === 'analista' && c.Aba === 'BASE_MESA');
    igual(JSON.parse(campo.Configuracao).listaDe, 'usuarios');
  });

  teste('seletor de lista vazia aceita texto livre, em vez de travar', () => {
    // A aba CORRETORAS nasce vazia. Um seletor apontado para ela não pode
    // deixar o campo impossível de preencher e sem explicação.
    igual(chamar('opcoesDeUmCadastro_')('corretoras').length, 0);
    igual(chamar('conferirCampo_')(
      { tipo: 'seletor', opcoes: [], obrigatorio: false }, 'Vida Individual'), '');
    igual(chamar('conferirCampo_')(
      { tipo: 'seletor', opcoes: [{ valor: 'A' }], obrigatorio: false }, 'B'),
      'não é uma das opções da lista');
  });

  teste('cadastro desconhecido em listaDe é erro, e diz quais existem', () => {
    const erro = lanca(() => chamar('opcoesDeUmCadastro_')('planetas'),
      'Cadastro desconhecido');
    // O recado LISTA os que existem. Sem a lista, quem errou o nome fica
    // adivinhando qual era — e a lista cresce, então ela sai do código.
    ['usuarios', 'corretoras', 'analistasCentral', 'analistasCobranca']
      .forEach((qual) => contem(erro.message, qual));
  });

  teste('a chave antiga "canais" continua achando as corretoras', () => {
    /*
     * A aba CORRETORAS já se chamou CANAIS, e as instalações daquela época
     * gravaram `listaDe: "canais"` em CAMPOS. Trocar a chave sem aceitar a
     * antiga apagaria a lista de um campo que já estava configurado — e o
     * sintoma seria um seletor vazio, sem erro nenhum, numa tela só.
     */
    chamar('inserirRegistro_')('CORRETORAS', {
      SUSEP: 'RET00J', Corretora: 'Corretora de Teste',
      Sucursal: '12', Segmento: 'Diamante'
    });

    const pelaNova = chamar('opcoesDeUmCadastro_')('corretoras');
    const pelaAntiga = chamar('opcoesDeUmCadastro_')('canais');
    igual(pelaNova.map((uma) => uma.valor).join(','), 'Corretora de Teste');
    igual(pelaAntiga.map((uma) => uma.valor).join(','),
      pelaNova.map((uma) => uma.valor).join(','),
      'as duas chaves têm de dar a mesma lista');
  });

  teste('as duas listas de analista viram opções de seletor', () => {
    // Não são usuários do PGO: são as pessoas da Central e da Cobrança Ativa
    // que APARECEM nos casos. Por isso têm cadastro próprio.
    chamar('inserirVariosRegistros_')('ANALISTAS_CENTRAL', [
      { Nome: 'Rita da Central', Ativo: 'SIM' },
      { Nome: 'Aline da Central', Ativo: 'SIM' },
      { Nome: 'Saiu da Central', Ativo: 'NAO' }
    ]);
    chamar('inserirRegistro_')('ANALISTAS_COBRANCA', { Nome: 'Bruno da Cobrança' });

    const daCentral = chamar('opcoesDeUmCadastro_')('analistasCentral');
    igual(daCentral.map((o) => o.valor).join(', '),
      'Aline da Central, Rita da Central', 'em ordem, e sem quem saiu');

    const daCobranca = chamar('opcoesDeUmCadastro_')('analistasCobranca');
    igual(daCobranca.length, 1);
    igual(daCobranca[0].valor, 'Bruno da Cobrança',
      'sem a coluna Ativo preenchida a pessoa CONTA — cadastro recém-colado '
      + 'não vem com ela marcada, e esconder todo mundo pareceria defeito');
  });

  teste('lista de analista sem aba devolve vazio, e não derruba o formulário', () => {
    // Instalação mais antiga não tem estas abas. Derrubar o formulário inteiro
    // por causa de um seletor que ninguém configurou seria trocar um campo
    // vazio por uma tela que não abre.
    const aba = ambiente.planilha.getSheetByName('ANALISTAS_CENTRAL');
    aba.setName('ANALISTAS_CENTRAL_SUMIU');
    chamar('esquecerEstruturaLida_()');

    igual(chamar('opcoesDeUmCadastro_')('analistasCentral').length, 0,
      'sem a aba, a lista vem vazia — e a tela abre');

    aba.setName('ANALISTAS_CENTRAL');
    chamar('esquecerEstruturaLida_()');
  });

  teste('cado canal aparece com o seu desenho, vindo da aba CANAIS', () => {
    const fonte = scriptDaPeca('SeletorDeCanal');
    const contexto = vm.createContext({
      Moldura: { escapar: (t) => String(t) }, document: {}, console });
    vm.runInContext(fonte, contexto);

    const botoes = contexto.SeletorDeCanal.montar(canais, canais[0].id);
    // Conta contra o NÚMERO DE CANAIS, e não contra um 2 escrito aqui: no dia
    // em que o VG nasceu isto dizia 2 enquanto a tela já mostrava 3.
    igual((botoes.match(/<svg/g) || []).length,
      chamar('canaisVisiveis_()').length, 'um desenho por canal');
    verdadeiro(botoes.indexOf('M12 15.4c-2-1.3') >= 0, 'o escudo com coração da RET');
    verdadeiro(botoes.indexOf('M7.4 3.6h9.2') >= 0, 'o diamante da Mesa Diamante');
    verdadeiro(botoes.indexOf('class="canal atual"') >= 0, 'o canal escolhida se marca');
  });

  teste('o seletor de canal é uma peça só, usada pelas duas telas', () => {
    // Duas cópias divergiriam na primeira mudança.
    const cadastro = fs.readFileSync(
      path.join(__dirname, '..', '..', 'Front-End', 'CadastrarCaso.html'), 'utf8');
    const painel = fs.readFileSync(
      path.join(__dirname, '..', '..', 'Front-End', 'Trabalho.html'), 'utf8');
    contem(cadastro, 'SeletorDeCanal.montar');
    contem(painel, 'SeletorDeCanal.montar');
    verdadeiro(cadastro.indexOf('DESENHOS_DAS_CANAIS') < 0,
      'o desenho dos canais não pode estar duplicado na tela de cadastro');
  });

  teste('campo oculto para o nível NÃO chega ao navegador', () => {
    // Não é esconder no HTML: quem não pode ver, não recebe.
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((item) => item.Tipo === 'NIVEL_ACESSO' && item.Nome === 'Operação');
    const configuracao = JSON.parse(operacao.Configuracao);
    configuracao.campos = { documentocpf: 'oculto', assunto: 'leitura' };
    chamar('atualizarRegistro_')('CATALOGO', operacao.Id, {
      Configuracao: JSON.stringify(configuracao)
    });
    chamar('salvarUsuario')({
      nome: 'Ana Martins', email: 'ana@exemplo.com',
      nivelAcessoId: operacao.Id, ativo: true
    });

    ambiente.definirEmail('ana@exemplo.com');
    const todos = chamar('formularioDoCanal')(canalDiamante.id)
      .secoes.reduce((soma, s) => soma.concat(s.campos), []);

    verdadeiro(!todos.some((campo) => campo.chave === 'documentocpf'),
      'o campo oculto não pode vir na resposta');
    igual(todos.find((campo) => campo.chave === 'assunto').somenteLeitura, true);
    ambiente.definirEmail('primeiro.adm@exemplo.com');
  });

  secao('Gravar');

  teste('um caso é gravado e devolve o Id', () => {
    const resposta = chamar('cadastrarCaso')(canalDiamante.id, {
      status: 'Em andamento',
      nomedosegurado: 'Vanessa Duarte Lima',
      documentocpf: '000.123.456-78'
    });
    igual(resposta.id, '0000000000', 'o primeiro caso da aba');
    igual(resposta.canal, 'Mesa Diamante');
  });

  teste('o CPF chega à célula só com dígitos, e como texto', () => {
    const valor = celula(planilha, 'BASE_MESA', 2, 'Documento (CPF)');
    igual(valor, '00012345678');
    igual(typeof valor, 'string', 'o zero à esquerda só sobrevive em texto');
  });

  teste('a data e a hora de entrada são do servidor, não do navegador', () => {
    // O relógio do navegador daria horários de fusos diferentes na mesma base.
    verdadeiro(celula(planilha, 'BASE_MESA', 2, 'Data de entrada') !== '',
      'a data de entrada precisa vir preenchida');
    verdadeiro(celula(planilha, 'BASE_MESA', 2, 'Horário') !== '',
      'a hora de entrada também');
  });

  teste('o analista é quem cadastrou, quando a tela não disse outro', () => {
    igual(celula(planilha, 'BASE_MESA', 2, 'Analista'), 'primeiro.adm');
  });

  secao('O servidor não acredita no navegador');

  teste('campo obrigatório vazio é recusado, dizendo qual', () => {
    // O exemplo é o Nome, e não o Status, de propósito: o Status é obrigatório
    // MAS tem valor padrão, e um obrigatório com padrão nunca chega vazio ao
    // servidor — o próprio servidor preenche. Testar com ele provaria o
    // contrário do que este teste quer provar.
    const erro = lanca(() => chamar('cadastrarCaso')(canalDiamante.id, {
      status: 'Em andamento'
    }), 'Nome');
    igual(erro.problemas.length, 1);
    igual(erro.problemas[0].campo, 'nomedosegurado');
    igual(erro.problemas[0].erro, 'é obrigatório');
  });

  teste('obrigatório COM valor padrão é preenchido, não recusado', () => {
    // É o que a RET pediu: o caso nasce em "Não trabalhado" e o analista
    // ajusta depois. Recusar por falta de um valor que o sistema tem guardado
    // barraria a importação, que não passa por tela nenhuma — e na tela o
    // problema ficaria invisível, porque ela preenche o padrão sozinha.
    const novo = chamar('cadastrarCaso')(canalDiamante.id, {
      nomedosegurado: 'Caso sem status na mão'
    });
    const gravado = chamar('buscarRegistros_')('BASE_MESA', 'ID', novo.id, 1)[0];
    igual(gravado.Status, 'Em andamento', 'o padrão do canal entrou sozinho');
  });

  teste('editar NÃO repõe o padrão: reclama em vez de adivinhar', () => {
    // O padrão vale no NASCIMENTO. Numa edição, um obrigatório que chega vazio
    // é recusado com o nome do campo — repor o padrão calado desfaria o gesto
    // de quem acabou de limpar aquilo, e ela só descobriria depois, no
    // relatório. Entre adivinhar e perguntar, o sistema pergunta.
    const novo = chamar('cadastrarCaso')(canalDiamante.id, {
      nomedosegurado: 'Caso que muda de status', status: 'Concluído'
    });
    const erro = lanca(() => chamar('editarCaso')(canalDiamante.id, novo.id, {
      nomedosegurado: 'Caso que muda de status', status: ''
    }), 'Status');
    igual(erro.problemas[0].erro, 'é obrigatório');

    const gravado = chamar('buscarRegistros_')('BASE_MESA', 'ID', novo.id, 1)[0];
    igual(gravado.Status, 'Concluído', 'e nada foi gravado pela metade');
  });

  teste('todos os problemas vêm de uma vez, não um por vez', () => {
    const erro = lanca(() => chamar('cadastrarCaso')(canalDiamante.id, {
      documentocpf: '123',
      dataresposta: '31/12/2099'
    }), 'Confira');
    verdadeiro(erro.problemas.length >= 3,
      'esperava ao menos 3 problemas, veio ' + erro.problemas.length);
    const porCampo = {};
    erro.problemas.forEach((p) => { porCampo[p.campo] = p.erro; });
    contem(porCampo.documentocpf, 'precisa ter 11 dígitos');
    contem(porCampo.dataresposta, 'não pode ser no futuro');
    igual(porCampo.nomedosegurado, 'é obrigatório');
  });

  teste('data no futuro é recusada; ontem passa', () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const comZero = (n) => (n < 10 ? '0' : '') + n;
    const escrita = comZero(ontem.getDate()) + '/' + comZero(ontem.getMonth() + 1)
      + '/' + ontem.getFullYear();

    igual(chamar('cadastrarCaso')(canalDiamante.id, {
      status: 'Em andamento', nomedosegurado: 'Caso de ontem', dataresposta: escrita
    }).canal, 'Mesa Diamante');
  });

  teste('seletor com valor fora da lista é recusado', () => {
    const erro = lanca(() => chamar('cadastrarCaso')(canalDiamante.id, {
      status: 'Inventado', nomedosegurado: 'Alguém'
    }), 'Confira');
    igual(erro.problemas[0].erro, 'não é uma das opções da lista');
  });

  teste('valor de campo OCULTO mandado pela tela é ignorado', () => {
    // A tela é do lado de lá. Mesmo que alguém monte a chamada à mão com o
    // campo escondido preenchido, o servidor não grava.
    ambiente.definirEmail('ana@exemplo.com');
    const resposta = chamar('cadastrarCaso')(canalDiamante.id, {
      status: 'Em andamento',
      nomedosegurado: 'Cliente da Ana',
      documentocpf: '99999999999'
    });
    const linha = chamar('buscarRegistros_')('BASE_MESA', 'Id', resposta.id, 1)[0];
    igual(linha['Documento (CPF)'], '', 'o campo oculto não podia ser gravado');
    igual(linha['Nome do segurado'], 'Cliente da Ana');
    ambiente.definirEmail('primeiro.adm@exemplo.com');
  });

  teste('quem não pode criar não cria, mesmo chamando direto', () => {
    const consulta = chamar('lerRegistros_("CATALOGO")')
      .find((item) => item.Tipo === 'NIVEL_ACESSO' && item.Nome === 'Consulta');
    chamar('salvarUsuario')({
      nome: 'Só Leitura', email: 'leitura@exemplo.com',
      nivelAcessoId: consulta.Id, ativo: true
    });
    ambiente.definirEmail('leitura@exemplo.com');
    lanca(() => chamar('cadastrarCaso')(canalDiamante.id, { status: 'Em andamento' }),
      'não permite criar');
    ambiente.definirEmail('primeiro.adm@exemplo.com');
  });

  secao('Editar e ocultar');

  teste('editar não reescreve a data de entrada', () => {
    const antes = celula(planilha, 'BASE_MESA', 2, 'Data de entrada');
    chamar('editarCaso')(canalDiamante.id, '0000000000', {
      status: 'Concluído', nomedosegurado: 'Vanessa Duarte Lima'
    });
    igual(celula(planilha, 'BASE_MESA', 2, 'Data de entrada'), antes,
      'histórico não muda sozinho');
    igual(celula(planilha, 'BASE_MESA', 2, 'Status'), 'Concluído');
  });

  teste('o escopo do nível vale para escrever, não só para ler', () => {
    // A Ana enxerga só os próprios casos. O caso 0000000000 é de outra pessoa:
    // a tela não ofereceria o botão, mas a chamada existe.
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((item) => item.Tipo === 'NIVEL_ACESSO' && item.Nome === 'Operação');
    igual(JSON.parse(operacao.Configuracao).escopo, 'PROPRIOS');

    // O try/finally não é enfeite: sem ele, uma asserção que falha deixa a
    // suíte inteira logada como a Ana, e os testes seguintes quebram por um
    // motivo que não é o deles. Aconteceu aqui.
    ambiente.definirEmail('ana@exemplo.com');
    try {
      lanca(() => chamar('editarCaso')(canalDiamante.id, '0000000000', {
        status: 'Em andamento', nomedosegurado: 'Tentativa'
      }), 'e o seu nível (escopo PROPRIOS)');
    } finally {
      ambiente.definirEmail('primeiro.adm@exemplo.com');
    }
  });

  teste('a recusa diz de QUEM é o caso, e que não é regra do canal', () => {
    // A operação leu "fora do seu alcance" como "este canal não deixa
    // excluir", porque na Mesa Diamante conseguia e na RET não — e a
    // diferença era o caso ser de outra pessoa, não o canal. A mensagem
    // precisa fechar essa porta.
    ambiente.definirEmail('ana@exemplo.com');
    try {
      lanca(() => chamar('editarCaso')(canalDiamante.id, '0000000000', {
        status: 'Em andamento'
      }), 'Este caso é de', 'nomeia o responsável');
      lanca(() => chamar('editarCaso')(canalDiamante.id, '0000000000', {
        status: 'Em andamento'
      }), 'não é uma regra do', 'e diz que o canal não tem culpa');
    } finally {
      ambiente.definirEmail('primeiro.adm@exemplo.com');
    }
  });

  teste('excluir APAGA a linha da planilha, não só esconde', () => {
    // O sistema inteiro usa exclusão lógica — a linha fica, _Visivel vira NAO.
    // O CASO é a exceção, por decisão do PO: "o caso deve ser excluído
    // definitivamente da planilha". Este teste é o que garante que a exceção
    // continua sendo exceção, e que ela de fato apaga.
    const antes = chamar('lerRegistros_("BASE_MESA")').length;
    const naLinha2 = celula(planilha, 'BASE_MESA', 2, 'Nome do segurado');
    igual(naLinha2, 'Vanessa Duarte Lima', 'a linha 2 é a que vamos apagar');

    chamar('excluirCaso')(canalDiamante.id, '0000000000');

    igual(chamar('lerRegistros_("BASE_MESA")').length, antes - 1);
    verdadeiro(celula(planilha, 'BASE_MESA', 2, 'Nome do segurado')
      !== 'Vanessa Duarte Lima',
      'a linha saiu da planilha — a de baixo subiu para o lugar dela');
  });

  teste('o que foi apagado fica na auditoria, com o conteúdo', () => {
    // Não há desfazer. Se a auditoria não guardar o que havia, um caso
    // apagado por engano não deixa nem rastro de que existiu.
    const trilha = chamar('lerRegistros_("AUDITORIA")')
      .filter((linha) => String(linha.Acao) === 'caso.excluir');
    verdadeiro(trilha.length > 0, 'a exclusão precisa deixar rastro');
    const ultima = trilha[trilha.length - 1];
    contem(String(ultima.Detalhe), 'Mesa Diamante', 'diz de qual canal era');
    contem(String(ultima.Detalhe), 'Vanessa Duarte Lima',
      'e guarda o conteúdo, porque a linha não existe mais');
  });

  teste('qualquer nível exclui, em qualquer canal', () => {
    // Pedido do PO: "todos os canais e níveis de acesso podem excluir".
    // A Ana é do nível Operação, escopo PROPRIOS — o que antes a barrava.
    const novo = chamar('cadastrarCaso')(canalDiamante.id, {
      status: 'Em andamento', nomedosegurado: 'Caso de outra pessoa',
      analista: 'primeiro.adm'
    });
    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      chamar('excluirCaso')(canalDiamante.id, novo.id);
    });
    igual(chamar('buscarRegistros_')('BASE_MESA', 'Id', novo.id, 1).length, 0,
      'o caso de outra pessoa foi apagado pela Ana');
  });

  teste('excluir na RET também apaga a linha — os DOIS canais', () => {
    // Os testes acima provam a Mesa Diamante. Este prova a RET, e existe porque
    // o pedido foi explícito: "confirme se os casos que forem selecionados para
    // serem excluídos estão pelos dois canais e somem da planilha".
    //
    // Não é a mesma pergunta duas vezes: as duas abas têm colunas diferentes,
    // nomes de Id diferentes ("id" minúsculo na RET, "ID" na Mesa) e formulários
    // diferentes. Já bastou menos que isso para uma valer e a outra não.
    const canalRetAqui = canais.find((canal) => canal.aba === 'BASE_RET');
    const novo = chamar('cadastrarCaso')(canalRetAqui.id, {
      nomedocliente: 'Caso da RET que vai sair'
    });

    const antes = chamar('lerRegistros_("BASE_RET")').length;
    verdadeiro(chamar('buscarRegistros_')('BASE_RET', 'id', novo.id, 1).length === 1,
      'o caso existe antes de ser apagado');

    chamar('excluirCaso')(canalRetAqui.id, novo.id);

    igual(chamar('lerRegistros_("BASE_RET")').length, antes - 1,
      'uma linha a menos na planilha, e não uma linha escondida');
    igual(chamar('buscarRegistros_')('BASE_RET', 'id', novo.id, 1).length, 0);

    // E some da fila do Trabalho, que é onde a pessoa vai conferir.
    const fila = chamar('resumoDoCanal')(canalRetAqui.id, {}).fila;
    verdadeiro(!fila.some((linha) => linha.id === novo.id),
      'o caso apagado não pode continuar na fila');
  });

  teste('o apagado da RET também fica na auditoria, com o conteúdo', () => {
    const trilha = chamar('lerRegistros_("AUDITORIA")')
      .filter((linha) => String(linha.Acao) === 'caso.excluir');
    const daRet = trilha.filter((linha) =>
      String(linha.Detalhe).indexOf('Caso da RET que vai sair') >= 0);
    verdadeiro(daRet.length === 1,
      'sem desfazer, a auditoria é o único rastro de que o caso existiu');
    contem(String(daRet[0].Detalhe), 'RET', 'e diz de qual canal era');
  });

  teste('a busca é oferecida a TODOS os níveis de fábrica', () => {
    // Pedido do PO: "Buscar caso... todos precisam dessa visualização". Ela
    // procura nas bases do PGO E na planilha antiga, quando ela está ligada —
    // não é só do legado.
    const niveis = chamar('lerRegistros_("CATALOGO")')
      .filter((item) => item.Tipo === 'NIVEL_ACESSO');
    verdadeiro(niveis.length >= 4, 'os quatro níveis de fábrica');

    const semBusca = niveis.filter((nivel) => {
      const permissoes = JSON.parse(nivel.Configuracao || '{}');
      return (permissoes.telas || []).indexOf('buscarCaso') < 0;
    }).map((nivel) => nivel.Nome);

    igual(semBusca.join(', '), '',
      'nenhum nível pode nascer sem a busca — estes ficaram de fora');
  });

  secao('O formulário que a operação pediu');

  teste('a RET vem na sequência e nas seções pedidas', () => {
    const ret = canais.find((canal) => canal.aba === 'BASE_RET');
    const formulario = chamar('formularioDoCanal')(ret.id);
    const secoes = formulario.secoes.map((s) => s.nome);
    igual(secoes.slice(0, 5).join(' | '),
      'Caso | Cliente | Seguro | Corretora | Situação',
      'as seções na ordem do atendimento');

    const caso = formulario.secoes[0].campos.map((c) => c.rotulo);
    igual(caso.join(', '),
      'Data, Protocolo, Analista, Canal de origem, Nome de quem transferiu');
  });

  teste('a Mesa Diamante tem as seções dela, não as da RET', () => {
    const formulario = chamar('formularioDoCanal')(canalDiamante.id);
    igual(formulario.secoes.map((s) => s.nome).join(' | '),
      'Caso | Situação | Cliente | Corretora | Encaminhamento');
  });

  teste('a data já vem preenchida com hoje, e o analista com quem cadastra', () => {
    // O valor padrão é resolvido pelo SERVIDOR. O relógio do navegador é o da
    // máquina de quem está olhando, e uma data com o fuso errado só aparece
    // semanas depois, num relatório que não fecha.
    const ret = canais.find((canal) => canal.aba === 'BASE_RET');
    const todos = chamar('formularioDoCanal')(ret.id).secoes
      .reduce((soma, s) => soma.concat(s.campos), []);

    const data = todos.find((c) => c.chave === 'dataderecepcaodoprotocolo');
    verdadeiro(/^\d{2}\/\d{2}\/\d{4}$/.test(data.valorPadrao),
      'a data de hoje, em dd/mm/aaaa — veio "' + data.valorPadrao + '"');

    const analista = todos.find((c) => c.chave === 'analista');
    igual(analista.valorPadrao, 'primeiro.adm',
      'o nome de quem está cadastrando');
  });

  teste('o protocolo deixou de ser obrigatório', () => {
    const ret = canais.find((canal) => canal.aba === 'BASE_RET');
    const todos = chamar('formularioDoCanal')(ret.id).secoes
      .reduce((soma, s) => soma.concat(s.campos), []);
    igual(todos.find((c) => c.chave === 'protocolo').obrigatorio, false);
  });

  teste('o campo condicional viaja com a condição dele', () => {
    // Quem mostra e esconde é a tela, mas a REGRA vem do servidor: escrevê-la
    // no JavaScript da tela a deixaria fora do alcance de Configurações.
    const ret = canais.find((canal) => canal.aba === 'BASE_RET');
    const todos = chamar('formularioDoCanal')(ret.id).secoes
      .reduce((soma, s) => soma.concat(s.campos), []);

    const transferiu = todos.find((c) => c.chave === 'nomedequemtransferiu');
    igual(transferiu.mostrarSe.campo, 'canal');
    igual(transferiu.mostrarSe.valor, 'Central');

    const dados = todos.find((c) => c.chave === 'dadosdopagamento');
    igual(dados.mostrarSe.campo, 'formadepagamento');
    igual(dados.mostrarSe.valor, 'ADC - TODAS PARCELAS');

    // E a opção que dispara existe na lista. Sem esta linha, renomear o item
    // desligaria a regra em silêncio.
    const forma = todos.find((c) => c.chave === 'formadepagamento');
    verdadeiro(forma.opcoes.some((o) => o.valor === 'ADC - TODAS PARCELAS'),
      'a opção que faz o campo aparecer precisa existir na lista');
  });

  teste('o produto é um seletor só, e a planilha recebe código e nome', () => {
    const ret = canais.find((canal) => canal.aba === 'BASE_RET');
    const novo = chamar('cadastrarCaso')(ret.id, {
      status: 'Pendente', nomedocliente: 'Cliente do produto',
      codproduto: '1101 - VIDA INDIVIDUAL'
    });
    const gravado = chamar('buscarRegistros_')('BASE_RET', 'id', novo.id, 1)[0];
    igual(gravado['cod produto'], '1101', 'o código foi para a coluna dele');
    igual(gravado['produto'], 'VIDA INDIVIDUAL', 'e o nome para a dele');
  });

  teste('nome de produto com hífen dentro não é partido ao meio', () => {
    // "VIDA - PLANO A" não tem código: partir no primeiro hífen guardaria
    // "VIDA" como código e perderia metade do nome.
    igual(chamar('separarCodigoENome_')('VIDA - PLANO A').codigo, '');
    igual(chamar('separarCodigoENome_')('VIDA - PLANO A').nome, 'VIDA - PLANO A');
    igual(chamar('separarCodigoENome_')('1101 - VIDA - OURO').codigo, '1101');
    igual(chamar('separarCodigoENome_')('1101 - VIDA - OURO').nome, 'VIDA - OURO');
  });

  teste('o analista NÃO troca o nome de quem cadastra', () => {
    // Pedido do PO: "se o cargo for analista deve estar preenchido com o nome
    // e não deve ser possível alterar".
    //
    // A trava compara o cargo POR COMEÇO. Os cargos da operação são "Analista
    // RET" e "Analista Mesa Diamante", não "Analista" seco — comparar por
    // igualdade não travaria ninguém, e não daria erro nenhum: o campo
    // ficaria editável, e só se descobriria quando alguém cadastrasse em nome
    // de outra pessoa. Foi assim que este teste nasceu.
    const cargos = chamar('lerRegistros_("CATALOGO")').filter((i) => i.Tipo === 'CARGO');
    const niveis = chamar('lerRegistros_("CATALOGO")').filter((i) => i.Tipo === 'NIVEL_ACESSO');
    const analistaRet = cargos.find((c) => c.Nome === 'Analista RET');
    const operacao = niveis.find((n) => n.Nome === 'Operação');
    verdadeiro(!!analistaRet, 'o cargo Analista RET tem de existir');

    chamar('salvarUsuario')({ nome: 'Marta Lopes', email: 'marta@exemplo.com',
      cargoId: analistaRet.Id, nivelAcessoId: operacao.Id, ativo: true });

    comoUsuario(ambiente, 'marta@exemplo.com', () => {
      const todos = chamar('formularioDoCanal')(canalDiamante.id).secoes
        .reduce((soma, s) => soma.concat(s.campos), []);
      const analista = todos.find((c) => c.chave === 'analista');
      igual(analista.travadoPeloCargo, true, 'quem é analista não troca o campo');
      igual(analista.somenteLeitura, true, 'e a tela recebe ele bloqueado');
      igual(analista.valorPadrao, 'Marta Lopes', 'já vem com o nome dela');
    });
  });

  teste('quem coordena continua podendo cadastrar para a equipe', () => {
    // A trava é do CARGO, e quem a desfaz é uma AÇÃO do nível. São coisas
    // diferentes de proposito: cargo diz o que a pessoa faz, nível diz o que
    // ela pode. Quem administra nunca é travado.
    const todos = chamar('formularioDoCanal')(canalDiamante.id).secoes
      .reduce((soma, s) => soma.concat(s.campos), []);
    const analista = todos.find((c) => c.chave === 'analista');
    igual(analista.travadoPeloCargo, false,
      'o administrador cadastra em nome de quem for');
  });

  secao('A SUSEP cola EXATA, e a Mesa não confere bloqueio');

  /*
    Três pedidos do PO, num bloco só, porque são o mesmo campo:

      "todos os campos de susep que peçam esse dado devem aceitar e colar
       exatamente essa susep"
      "o formulário da mesa deve buscar pela susep o nome da corretora
       automaticamente"
      "no formulário de Mesa diamante não há necessidade de verificar se a
       SUSEP está ou não bloqueada, pode remover esse detalhe"
  */

  teste('a SUSEP chega na planilha exatamente como foi colada', () => {
    // Letra, caixa, hífen e dígito ficam intactos. Era `identificador` antes
    // desta rodada, e "RET00J" virava "00" sem dar erro nenhum.
    const escritas = ['RET00J', 'ret00j', 'RET-00J', '1234567', 'R0'];

    canais.forEach((canal) => {
      escritas.forEach((susep) => {
        const salvo = chamar('cadastrarCaso')(canal.id, {
          nomedocliente: 'Teste', nomedosegurado: 'Teste', susep: susep
        });
        const id = String(salvo.id || salvo);
        const linha = chamar('buscarRegistros_')(canal.aba, 'Id', id, 1)[0];
        igual(String(linha.SUSEP), susep,
          canal.aba + ' tem de guardar "' + susep + '" sem mexer');
        igual(chamar('casoParaEditar')(canal.id, id).valores.susep, susep,
          canal.aba + ': e devolver igual para editar');
      });
    });
  });

  teste('espaço colado junto NÃO vai para a planilha', () => {
    /*
      Quem copia a SUSEP de outra planilha traz " RET00J " junto, e o espaço é
      invisível na tela. O selo continuava achando a corretora — ele compara
      normalizado —, então nada parecia errado. O estrago aparecia no Power BI,
      onde o join é pelo texto cru e " RET00J " não casa com "RET00J".
    */
    const salvo = chamar('cadastrarCaso')(canalRet.id, {
      nomedocliente: 'Com espaço', susep: '  RET00J  '
    });
    const linha = chamar('buscarRegistros_')('BASE_RET', 'Id',
      String(salvo.id || salvo), 1)[0];
    igual(String(linha.SUSEP), 'RET00J', 'só as pontas saem');
  });

  teste('o selo devolve o nome da corretora, para a tela preencher', () => {
    chamar('inserirRegistro_')('CORRETORAS', {
      SUSEP: 'RET77X', Corretora: 'Corretora do Selo', Sucursal: '31',
      Segmento: 'Diamante', Consultor: 'Jinbe'
    });
    const resposta = chamar('consultarSusep')('RET77X', canalDiamante.id);
    igual(resposta.situacao, 'OK');
    igual(resposta.corretora, 'Corretora do Selo',
      'é daqui que a tela tira o nome, sem uma segunda ida ao servidor');
    igual(resposta.sucursal, '31');
  });

  teste('a Mesa Diamante NÃO confere a lista de bloqueadas', () => {
    chamar('inserirRegistro_')('SUSEP_BLOQUEADAS', {
      SUSEP: 'RET88Y', NomeCorretora: 'Bloqueada de Verdade'
    });

    igual(chamar('consultarSusep')('RET88Y', canalRet.id).situacao, 'BLOQUEADA',
      'na RET o bloqueio continua valendo');
    igual(chamar('consultarSusep')('RET88Y', canalDiamante.id).situacao,
      'NAO_ENCONTRADA', 'na Mesa Diamante a lista nem é consultada');
  });

  teste('sem canal informado, confere — o lado seguro', () => {
    // Quem chama de fora de um formulário não diz o canal. Na dúvida, a
    // resposta mais completa é a mais segura.
    igual(chamar('consultarSusep')('RET88Y').situacao, 'BLOQUEADA');
  });

  teste('quem decide é a COLUNA do canal, não o nome dele', () => {
    /*
      A regra mora em CANAIS.ConfereSusepBloqueada. Se estivesse escrita no
      código com o nome "Mesa Diamante", mudar a regra — ou criar um canal novo
      que também dispensa a conferência — viraria mexer em código.
    */
    const daTela = chamar('listarCanaisConfiguraveis()')
      .find((c) => c.aba === 'BASE_MESA');
    igual(daTela.confereSusepBloqueada, false,
      'a tela de Configurações mostra o campo, para ele poder trocar');

    chamar('salvarCanal')(Object.assign({}, daTela,
      { confereSusepBloqueada: true }));
    igual(chamar('consultarSusep')('RET88Y', canalDiamante.id).situacao,
      'BLOQUEADA', 'marcado, a Mesa volta a conferir');

    chamar('salvarCanal')(Object.assign({}, daTela,
      { confereSusepBloqueada: false }));
    igual(chamar('consultarSusep')('RET88Y', canalDiamante.id).situacao,
      'NAO_ENCONTRADA', 'e desmarcado, volta a não conferir');
  });

  teste('canal cadastrado ANTES desta coluna continua conferindo', () => {
    // Vazio vale SIM. Um canal que nunca ouviu falar desta coluna não pode
    // deixar de conferir por omissão — ele faria menos do que já fazia.
    const ret = chamar('lerRegistros_("CANAIS")')
      .find((c) => String(c.Aba) === 'BASE_RET');
    chamar('atualizarRegistro_')('CANAIS', ret.Id, { ConfereSusepBloqueada: '' });
    chamar('esquecerEstruturaLida_()');

    igual(chamar('consultarSusep')('RET88Y', canalRet.id).situacao, 'BLOQUEADA');
    chamar('atualizarRegistro_')('CANAIS', ret.Id, { ConfereSusepBloqueada: 'SIM' });
    chamar('esquecerEstruturaLida_()');
  });

  teste('a tela preenche a corretora pela SUSEP, e respeita o que foi digitado', () => {
    const peca = lerPeca('Comuns');
    contem(peca, 'function preencherCorretoraDaSusep');
    contem(peca, "Servidor.chamar('consultarSusep', valor, idDoCanal)");
    contem(peca, 'data-veio-da-susep',
      'é o que distingue "campo vazio" de "a pessoa digitou outro nome"');
    contem(peca, "if (agora !== '' && agora !== oQueEuPreenchi) return;");
  });

  secao('O selo da SUSEP');

  teste('SUSEP com LETRA é aceita, e volta liberada com o segmento', () => {
    /*
     * "Todas as SUSEP's são no formato letras e números, ex: RET00J" — palavra
     * do PO. A SUSEP era `identificador` no sistema, só dígito: "RET00J"
     * entrava e a planilha guardava "00". Não dava erro nenhum — a corretora
     * simplesmente nunca mais era encontrada, e o selo dizia "não encontrada"
     * para uma corretora cadastrada.
     */
    chamar('inserirRegistro_')('CORRETORAS', {
      SUSEP: 'RET00J', Corretora: 'Corretora ABC', Sucursal: '12',
      Segmento: 'Diamante', Consultor: 'Nami'
    });

    const resposta = chamar('consultarSusep')('RET00J');
    igual(resposta.situacao, 'OK');
    igual(resposta.susep, 'RET00J', 'a letra não pode ter sido jogada fora');
    igual(resposta.segmento, 'Diamante');
    igual(resposta.sucursal, '12');
    igual(resposta.consultor, 'Nami');
    contem(resposta.mensagem, 'liberada');
  });

  teste('a busca da SUSEP ignora caixa e pontuação', () => {
    // Quem digita "ret-00j" quer dizer a mesma SUSEP. O que se GRAVA é o que
    // a pessoa escreveu; só a comparação é normalizada.
    igual(chamar('consultarSusep')('ret00j').situacao, 'OK');
    igual(chamar('consultarSusep')('ret-00j').situacao, 'OK');
    igual(chamar('consultarSusep')(' RET00J ').situacao, 'OK');
  });

  teste('CORRETORA DIAMANTE VENCE a lista de bloqueadas', () => {
    /*
     * A regra que o PO pediu nesta rodada, com estas palavras: "corretoras
     * Diamante não podem ter status de bloqueada por gentileza mesmo que o
     * SUSEP esteja na lista de bloqueadas. Pertence a outra lista".
     *
     * Era o contrário: o bloqueio vencia o cadastro. São duas listas, de dois
     * donos — e a ORDEM da consulta é a regra inteira.
     */
    chamar('inserirRegistro_')('SUSEP_BLOQUEADAS', {
      SUSEP: 'RET00J', NomeCorretora: 'Corretora ABC',
      Sucursal: '12', CoordenadorComercial: 'Coordenação Sul'
    });

    const resposta = chamar('consultarSusep')('RET00J');
    igual(resposta.situacao, 'OK',
      'está nas duas listas, e o cadastro de corretoras ganha');
    igual(resposta.segmento, 'Diamante');
  });

  teste('SUSEP que SÓ está bloqueada volta bloqueada, com o coordenador', () => {
    // O outro lado da mesma regra: fora do cadastro de corretoras, o bloqueio
    // vale — senão a lista de bloqueios não serviria para nada.
    chamar('inserirRegistro_')('SUSEP_BLOQUEADAS', {
      SUSEP: 'RET99Z', NomeCorretora: 'Corretora Bloqueada',
      Sucursal: '58', CoordenadorComercial: 'Coordenação Norte'
    });

    const resposta = chamar('consultarSusep')('RET99Z');
    igual(resposta.situacao, 'BLOQUEADA');
    contem(resposta.mensagem, 'bloqueada');
    igual(resposta.sucursal, '58');
    igual(resposta.coordenadorComercial, 'Coordenação Norte',
      'é a quem perguntar quando o selo vermelho aparecer');
  });

  teste('SUSEP fora das duas listas responde "não encontrada", que não é erro', () => {
    const resposta = chamar('consultarSusep')('ZZZ999');
    igual(resposta.situacao, 'NAO_ENCONTRADA');
    igual(resposta.segmento, 'Não encontrado');
    contem(resposta.mensagem, 'cadastro de corretoras');
  });

  secao('A máscara, do lado da tela');

  teste('a máscara desenha enquanto se digita, e só com dígitos', () => {
    const fonte = scriptDaPeca('Formulario');
    const contexto = vm.createContext({ document: { getElementById: () => null },
      Moldura: { escapar: (t) => String(t) }, Servidor: {}, console });
    vm.runInContext(fonte, contexto);
    const form = contexto.Formulario;

    igual(form.aplicarMascara('12345678901', '000.000.000-00'), '123.456.789-01');
    igual(form.aplicarMascara('123', '000.000.000-00'), '123');
    igual(form.aplicarMascara('abc12x34', '000.000.000-00'), '123.4',
      'letra digitada é descartada, não vira caractere da máscara');
    igual(form.aplicarMascara('1234567890123456', '000.000.000-00'),
      '123.456.789-01', 'digitar demais não estoura a máscara');
  });

  teste('o campo de valor só aceita dígito, e cresce da direita', () => {
    // Um "aprox. 1200" no campo de prêmio chega ao servidor, não vira número e
    // a célula fica VAZIA — o caso é gravado com o valor faltando, sem ninguém
    // notar, e o relatório soma menos do que deveria. Barrar a letra na tela é
    // mais barato que achar isso três meses depois.
    const fonte = scriptDaPeca('Formulario');
    const contexto = vm.createContext({ document: { getElementById: () => null },
      Moldura: { escapar: (t) => String(t) }, Servidor: {}, console });
    vm.runInContext(fonte, contexto);
    const form = contexto.Formulario;
    const dinheiro = form.aplicarMascaraDeDinheiro;

    // Cresce da direita, como numa maquininha de cartão.
    igual(dinheiro('1'), 'R$ 0,01');
    igual(dinheiro('12'), 'R$ 0,12');
    igual(dinheiro('123'), 'R$ 1,23');
    igual(dinheiro('123456'), 'R$ 1.234,56');

    // O formato que a operação pediu: de apólice pequena a apólice grande.
    igual(dinheiro('999999999999'), 'R$ 999.999.999,99',
      'para de crescer em nove casas inteiras, e não estoura');
    igual(dinheiro('1290'), 'R$ 12,90');

    // Letra não entra de jeito nenhum.
    igual(dinheiro('aprox. 1200'), 'R$ 12,00', 'as letras somem, os dígitos ficam');
    igual(dinheiro('R$ abc'), '', 'sem dígito nenhum, o campo fica vazio');
    igual(dinheiro(''), '');
    igual(dinheiro('000'), '', 'zero à esquerda não vira R$ 0,00 na tela');
  });

  teste('o valor volta do servidor formatado, e não como 1234.56', () => {
    // Abrir um caso para editar mostrava "1234.56" no campo. Salvar de novo
    // mandaria isso de volta pela máscara, que conta em centavos, e gravaria
    // R$ 123.456,00 — o valor multiplicado por cem, calado.
    const fonte = scriptDaPeca('Formulario');
    contem(fonte, 'function comoNumeroEmCentavos',
      'a conversão de volta precisa existir');

    const contexto = vm.createContext({ document: { getElementById: () => null },
      Moldura: { escapar: (t) => String(t) }, Servidor: {}, console });
    vm.runInContext(fonte, contexto);
    const dinheiro = contexto.Formulario.aplicarMascaraDeDinheiro;

    // Os três formatos que o servidor manda, e que davam três resultados
    // diferentes quando iam direto para a máscara.
    igual(dinheiro(String(Math.round(1234.56 * 100))), 'R$ 1.234,56');
    igual(dinheiro(String(Math.round(1234.5 * 100))), 'R$ 1.234,50');
    igual(dinheiro(String(Math.round(1234 * 100))), 'R$ 1.234,00');
  });

  teste('o campo de dinheiro é marcado no HTML, com teclado numérico', () => {
    const fonte = scriptDaPeca('Formulario');
    contem(fonte, 'data-dinheiro', 'a marca que liga o comportamento');
    contem(fonte, 'inputmode="decimal"',
      'no celular o teclado tem de abrir numérico — metade da operação é telefone');
    contem(fonte, "evento.preventDefault()",
      'a tecla que não é dígito é barrada antes de entrar');
  });

  teste('o servidor recusa valor que não é número, e não grava vazio', () => {
    // A tela barra; o servidor confere de novo. Esconder o campo não é
    // segurança, e impedir a digitação também não: a chamada existe.
    const ret = canais.find((canal) => canal.aba === 'BASE_RET');
    const erro = lanca(() => chamar('cadastrarCaso')(ret.id, {
      nomedocliente: 'Cliente do valor torto',
      valordopremio: 'uns mil e duzentos'
    }), 'Confira');
    contem(erro.problemas.find((p) => p.campo === 'valordopremio').erro,
      'precisa ser um número');
  });

  teste('o valor em reais chega à célula como NÚMERO, com centavos', () => {
    // Texto na célula não soma no Power BI, e é o erro que o PGO 5 cometia.
    const ret = canais.find((canal) => canal.aba === 'BASE_RET');
    const novo = chamar('cadastrarCaso')(ret.id, {
      nomedocliente: 'Cliente do valor certo',
      valordopremio: 'R$ 1.234,56'
    });
    const gravado = chamar('buscarRegistros_')('BASE_RET', 'id', novo.id, 1)[0];
    igual(gravado['valor do prêmio'], 1234.56);
    igual(typeof gravado['valor do prêmio'], 'number');
  });

  teste('todo campo de dinheiro da base é dinheiro de verdade, nos dois canais', () => {
    // "Ou demais que encontrar", disse o PO. Este teste é o "encontrar": ele
    // varre o Esquema procurando coluna cujo NOME fala de valor, prêmio ou
    // preço, e cobra que ela seja do tipo dinheiro. Uma coluna dessas nascendo
    // como texto guardaria "R$ 1.200,00" em texto, e ninguém somaria.
    const esquema = chamar('RECC_ESQUEMA');
    const falamDeDinheiro = /valor|pr[eê]mio|pre[çc]o|montante|sal[áa]rio/i;
    const erradas = [];

    ['BASE_RET', 'BASE_MESA'].forEach((aba) => {
      esquema[aba].colunas.forEach((coluna) => {
        if (!falamDeDinheiro.test(coluna.cabecalho)) return;
        if (coluna.tipo !== 'dinheiro') {
          erradas.push(aba + ' · ' + coluna.cabecalho + ' é ' + coluna.tipo);
        }
      });
    });

    igual(erradas.join(' | '), '',
      'estas colunas falam de dinheiro e não são do tipo dinheiro');
  });

  teste('a célula de dinheiro guarda duas casas, e o R$ é formato', () => {
    // O "R$" é FORMATO da célula, nunca conteúdo: com ele no conteúdo, a
    // célula vira texto e o Power BI não soma.
    igual(chamar('RECC_FORMATO_DA_CELULA')['dinheiro'], '"R$ "#,##0.00',
      'duas casas depois da vírgula, como a operação pediu');
  });

  teste('a tela pede ao servidor em vez de desenhar campo fixo', () => {
    const fonte = fs.readFileSync(
      path.join(__dirname, '..', '..', 'Front-End', 'CadastrarCaso.html'), 'utf8');
    contem(fonte, "Servidor.chamar('formularioDoCanal'", 'o formulário vem do servidor');
    contem(fonte, "Servidor.chamar('cadastrarCaso'", 'quem grava é o servidor');
    contem(lerPeca('Formulario'),
      "Servidor.chamar('consultarSusep'", 'o selo consulta o servidor');
  });

  teste('o formulário é desenhado num lugar só, e as duas telas o usam', () => {
    // Cadastrar Caso e o modal de edição do Trabalho montam o MESMO
    // formulário. Duas cópias divergiriam no primeiro ajuste de máscara.
    const pasta = path.join(__dirname, '..', '..', 'Front-End');
    const cadastro = fs.readFileSync(path.join(pasta, 'CadastrarCaso.html'), 'utf8');
    const modal = lerPeca('CasoEmModal');

    [cadastro, modal].forEach((fonte) => {
      contem(fonte, 'Formulario.desenhar(');
      contem(fonte, 'Formulario.valores(');
      verdadeiro(fonte.indexOf('function aplicarMascara') < 0,
        'nenhuma tela pode ter a sua própria máscara');
    });

    // E o modal usa PREFIXO: com ele aberto por cima da tela de cadastro, os
    // dois formulários existem ao mesmo tempo na página. Sem prefixo, os
    // elementos teriam o mesmo id e editar escreveria no cadastro.
    contem(modal, "Formulario.desenhar(formulario, 'editar-')");
  });

  /*
   * ==========================================================================
   * PROPOSTA E APÓLICE — digitadas inteiras, gravadas em pedaços
   * ==========================================================================
   * "No cadastrar caso da RET já traga por padrão o número da proposta e ele
   * vem separado por 1 hífen ex 7-0000000 ou 58-0000000 podem ser 2 números ou
   * um mas na planilha deve vir em colunas separadas (...) em apólice faremos
   * igual a diferença é que serão 2 hífens ex 12-1391-0000000."
   *
   * Aqui o erro perigoso não é a recusa: é gravar no lugar errado em silêncio.
   * O número da proposta de um caso na coluna do código de outro não dá erro
   * nenhum — só quebra a junção do relatório, meses depois.
   * ==========================================================================
   */
  secao('Proposta e apólice em colunas separadas');

  const campoDaRet = (chave) => chamar('formularioDoCanal')(canalRet.id).secoes
    .reduce((soma, s) => soma.concat(s.campos), [])
    .find((campo) => campo.chave === chave);

  teste('o formulário da RET traz UM campo de proposta, com a dica do formato', () => {
    const proposta = campoDaRet('numerodaproposta');
    verdadeiro(proposta !== undefined, 'o campo tem de estar no formulário');
    igual(proposta.rotulo, 'Número da proposta');
    contem(proposta.descricao, '7-0000000',
      'a dica mostra o formato na hora de digitar — é o único lugar em que '
      + 'ela chega a tempo');

    // E o campo do código fica FORA da tela, porque o pedaço dele vem do
    // mesmo campo. A coluna continua existindo e recebendo o valor.
    verdadeiro(campoDaRet('codigoorigemdaproposta') === undefined,
      'o código não é mais um campo separado na tela');
    verdadeiro(campoDaRet('codsucursal') === undefined);
    verdadeiro(campoDaRet('codramo') === undefined);
    verdadeiro(campoDaRet('novocodorigemproposta') === undefined);
  });

  teste('a proposta com um hífen vai para duas colunas', () => {
    const salvo = chamar('cadastrarCaso')(canalRet.id, {
      nomedocliente: 'Proposta de um dígito',
      numerodaproposta: '7-0000000',
      status: 'Não trabalhado'
    });

    const linha = chamar('buscarRegistros_')('BASE_RET', 'Id',
      String(salvo.id || salvo), 1)[0];
    igual(String(linha['Código origem da proposta']), '7');
    igual(String(linha['número da proposta']), '0000000');
  });

  teste('o código pode ter dois dígitos — era o exemplo do PO', () => {
    const salvo = chamar('cadastrarCaso')(canalRet.id, {
      nomedocliente: 'Proposta de dois dígitos',
      numerodaproposta: '58-0000000',
      status: 'Não trabalhado'
    });
    const linha = chamar('buscarRegistros_')('BASE_RET', 'Id',
      String(salvo.id || salvo), 1)[0];
    igual(String(linha['Código origem da proposta']), '58');
    igual(String(linha['número da proposta']), '0000000');
  });

  teste('a apólice com dois hífens vai para três colunas', () => {
    const salvo = chamar('cadastrarCaso')(canalRet.id, {
      nomedocliente: 'Com apólice',
      numapolice: '12-1391-0000000',
      status: 'Não trabalhado'
    });
    const linha = chamar('buscarRegistros_')('BASE_RET', 'Id',
      String(salvo.id || salvo), 1)[0];
    igual(String(linha['cod_sucursal']), '12');
    igual(String(linha['cod_ramo']), '1391');
    igual(String(linha['Num_apolice']), '0000000');
  });

  teste('a nova proposta segue a mesma regra da proposta', () => {
    const salvo = chamar('cadastrarCaso')(canalRet.id, {
      nomedocliente: 'Com nova proposta',
      novonumerodaproposta: '9-1234567',
      status: 'Não trabalhado'
    });
    const linha = chamar('buscarRegistros_')('BASE_RET', 'Id',
      String(salvo.id || salvo), 1)[0];
    igual(String(linha['Novo cod origem proposta']), '9');
    igual(String(linha['novo numero da proposta']), '1234567');
  });

  teste('o zero à esquerda do número sobrevive à gravação', () => {
    /*
     * A conferência que o Power BI depende. "0000000" lido como número viraria
     * 0, e a junção com a base da seguradora pararia de casar — sem erro
     * nenhum, só sem resultado. As colunas são de identificador justamente
     * por isso, e este teste é o que garante que continuam sendo.
     */
    const salvo = chamar('cadastrarCaso')(canalRet.id, {
      nomedocliente: 'Zero à esquerda',
      numerodaproposta: '7-0012345',
      status: 'Não trabalhado'
    });
    const linha = chamar('buscarRegistros_')('BASE_RET', 'Id',
      String(salvo.id || salvo), 1)[0];
    igual(String(linha['número da proposta']), '0012345',
      'veio "' + linha['número da proposta'] + '"');
  });

  teste('sem hífen é recusado, e o recado mostra o formato e as colunas', () => {
    /*
     * O caso mais importante de todos. "70000000" não dá para partir: ninguém
     * sabe se o código é "7" ou "70". Adivinhar gravaria errado em silêncio, e
     * é exatamente o tipo de defeito que só aparece no relatório, meses
     * depois, quando a junção não casa e ninguém liga uma coisa à outra.
     */
    const erro = lanca(() => chamar('cadastrarCaso')(canalRet.id, {
      nomedocliente: 'Sem hífen', numerodaproposta: '70000000',
      status: 'Não trabalhado'
    }), 'Número da proposta');
    contem(erro.message, '7-0000000', 'o recado mostra o formato certo');
    contem(erro.message, 'Código origem da proposta',
      'e diz para quais colunas cada pedaço vai');
  });

  teste('pedaço a mais, a menos, vazio ou com letra é recusado', () => {
    /*
     * A quantidade de pedaços é cobrada CONTRA O CAMPO, e não em geral:
     * "12-1391" é um valor legítimo para a proposta, que pede dois pedaços, e
     * é inválido para a apólice, que pede três. Foi o que a primeira versão
     * deste teste errou — ela cobrava "12-1391" como torto no campo da
     * proposta, onde ele está certo.
     */
    const tortosDaProposta = ['7-00-000', '7-', '-0000000', '7-ABC0000',
      '7-00-00-00'];
    tortosDaProposta.forEach((torto) => {
      lanca(() => chamar('cadastrarCaso')(canalRet.id, {
        nomedocliente: 'Torto ' + torto,
        numerodaproposta: torto, status: 'Não trabalhado'
      }), 'Escreva com', 'a proposta deveria recusar "' + torto + '"');
    });

    const tortosDaApolice = ['12-1391', '12-1391-0000000-9', '121391000000',
      '12-13A1-0000000'];
    tortosDaApolice.forEach((torto) => {
      lanca(() => chamar('cadastrarCaso')(canalRet.id, {
        nomedocliente: 'Torto ' + torto,
        numapolice: torto, status: 'Não trabalhado'
      }), 'Escreva com', 'a apólice deveria recusar "' + torto + '"');
    });

    // E o mesmo texto que a apólice recusa, a proposta ACEITA: a regra é do
    // campo, não do sistema.
    const valeNaProposta = chamar('cadastrarCaso')(canalRet.id, {
      nomedocliente: 'Dois pedaços', numerodaproposta: '12-1391',
      status: 'Não trabalhado'
    });
    const linha = chamar('buscarRegistros_')('BASE_RET', 'Id',
      String(valeNaProposta.id || valeNaProposta), 1)[0];
    igual(String(linha['Código origem da proposta']), '12');
    igual(String(linha['número da proposta']), '1391');
  });

  teste('recusado é recusado: nada entra pela metade', () => {
    const antes = chamar('lerRegistros_("BASE_RET")').length;
    lanca(() => chamar('cadastrarCaso')(canalRet.id, {
      nomedocliente: 'Não deve entrar', numerodaproposta: '70000000',
      status: 'Não trabalhado'
    }), 'Escreva com');
    igual(chamar('lerRegistros_("BASE_RET")').length, antes,
      'nenhuma linha pode ter sido gravada');
  });

  teste('campo em branco não grava nada, e não recusa', () => {
    // A proposta não é obrigatória: um caso pode chegar sem ela. Recusar o
    // vazio obrigaria a inventar um número para cadastrar.
    const salvo = chamar('cadastrarCaso')(canalRet.id, {
      nomedocliente: 'Sem proposta', status: 'Não trabalhado'
    });
    const linha = chamar('buscarRegistros_')('BASE_RET', 'Id',
      String(salvo.id || salvo), 1)[0];
    igual(String(linha['Código origem da proposta'] || ''), '');
    igual(String(linha['número da proposta'] || ''), '');
  });

  teste('abrir para editar devolve a proposta JUNTA, com o hífen', () => {
    /*
     * Sem isto o campo voltaria VAZIO na edição — ele procura a coluna do
     * próprio campo, e o valor está em duas. A pessoa salvaria achando que não
     * mexeu nele, e o vazio apagaria as duas colunas. É o defeito pior desta
     * mudança: perde dado sem nenhum erro na tela.
     */
    const salvo = chamar('cadastrarCaso')(canalRet.id, {
      nomedocliente: 'Para editar', numerodaproposta: '58-7654321',
      numapolice: '12-1391-0000111', status: 'Não trabalhado'
    });

    const aberto = chamar('casoParaEditar')(canalRet.id, String(salvo.id || salvo));
    igual(aberto.valores.numerodaproposta, '58-7654321');
    igual(aberto.valores.numapolice, '12-1391-0000111');
  });

  teste('editar e salvar de volta mantém as colunas separadas', () => {
    const salvo = chamar('cadastrarCaso')(canalRet.id, {
      nomedocliente: 'Ida e volta', numerodaproposta: '7-1111111',
      status: 'Não trabalhado'
    });
    const id = String(salvo.id || salvo);

    const aberto = chamar('casoParaEditar')(canalRet.id, id);
    chamar('editarCaso')(canalRet.id, id, Object.assign({}, aberto.valores, {
      nomedocliente: 'Ida e volta, editado'
    }));

    const linha = chamar('buscarRegistros_')('BASE_RET', 'Id', id, 1)[0];
    igual(String(linha['Código origem da proposta']), '7',
      'o código não pode ter se perdido na ida e volta');
    igual(String(linha['número da proposta']), '1111111');
    igual(String(linha['nome do cliente']), 'Ida e volta, editado');
  });
}

module.exports = { rodarTestesDeCadastro };
