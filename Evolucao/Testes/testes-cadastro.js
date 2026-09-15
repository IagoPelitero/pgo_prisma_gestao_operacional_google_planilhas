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
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, celula, lerPeca, scriptDaPeca } =
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
    // A aba PRODUTOS nasce vazia. Um seletor apontado para ela não pode
    // deixar o campo impossível de preencher e sem explicação.
    igual(chamar('opcoesDeUmCadastro_')('produtos').length, 0);
    igual(chamar('conferirCampo_')(
      { tipo: 'seletor', opcoes: [], obrigatorio: false }, 'Vida Individual'), '');
    igual(chamar('conferirCampo_')(
      { tipo: 'seletor', opcoes: [{ valor: 'A' }], obrigatorio: false }, 'B'),
      'não é uma das opções da lista');
  });

  teste('cadastro desconhecido em listaDe é erro, e diz quais existem', () => {
    lanca(() => chamar('opcoesDeUmCadastro_')('planetas'),
      'Os cadastros são usuarios, produtos e canais');
  });

  teste('cado canal aparece com o seu desenho, vindo da aba CANAIS', () => {
    const fonte = scriptDaPeca('SeletorDeCanal');
    const contexto = vm.createContext({
      Moldura: { escapar: (t) => String(t) }, document: {}, console });
    vm.runInContext(fonte, contexto);

    const botoes = contexto.SeletorDeCanal.montar(canais, canais[0].id);
    igual((botoes.match(/<svg/g) || []).length, 2, 'um desenho por canal');
    verdadeiro(botoes.indexOf('M12 15.4c-2-1.3') >= 0, 'o escudo com coração da RET');
    verdadeiro(botoes.indexOf('M7.4 3.6h9.2') >= 0, 'o diamante da Mesa Diamante');
    verdadeiro(botoes.indexOf('class="canal atual"') >= 0, 'o canal escolhida se marca');
  });

  teste('o seletor de canal é uma peça só, usada pelas duas telas', () => {
    // Duas cópias divergiriam na primeira mudança.
    const cadastro = fs.readFileSync(
      path.join(__dirname, '..', '..', 'Front-End', 'CadastrarCaso.html'), 'utf8');
    const painel = fs.readFileSync(
      path.join(__dirname, '..', '..', 'Front-End', 'Dashboard.html'), 'utf8');
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
    const erro = lanca(() => chamar('cadastrarCaso')(canalDiamante.id, {
      nomedosegurado: 'Sem status'
    }), 'Status');
    igual(erro.problemas.length, 1);
    igual(erro.problemas[0].campo, 'status');
    igual(erro.problemas[0].erro, 'é obrigatório');
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
    igual(porCampo.status, 'é obrigatório');
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

  teste('ocultar tira da tela e mantém a linha na planilha', () => {
    const antes = chamar('lerRegistros_("BASE_MESA")').length;
    chamar('ocultarCaso')(canalDiamante.id, '0000000000');
    igual(chamar('lerRegistros_("BASE_MESA")').length, antes - 1);
    igual(celula(planilha, 'BASE_MESA', 2, 'Nome do segurado'), 'Vanessa Duarte Lima',
      'o dado continua lá');
    igual(celula(planilha, 'BASE_MESA', 2, '_Visivel'), 'NAO');
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

  secao('O selo da SUSEP');

  teste('SUSEP no cadastro de canais volta liberada, com o segmento', () => {
    chamar('inserirRegistro_')('CORRETORAS', {
      Nome: 'Corretora ABC', Canal: 'Corretora', SUSEP: '1234567',
      Corretora: 'Corretora ABC', Segmento: 'Diamante'
    });
    const resposta = chamar('consultarSusep')('123.456-7');
    igual(resposta.situacao, 'OK', 'a busca ignora a máscara');
    igual(resposta.segmento, 'Diamante');
    contem(resposta.mensagem, 'liberada');
  });

  teste('SUSEP bloqueada vence o cadastro de canais', () => {
    chamar('inserirRegistro_')('SUSEP_BLOQUEADAS', {
      SUSEP: '1234567', NomeCorretora: 'Corretora ABC',
      Motivo: 'CPF reincidente'
    });
    const resposta = chamar('consultarSusep')('1234567');
    igual(resposta.situacao, 'BLOQUEADA');
    contem(resposta.mensagem, 'bloqueada');
    igual(resposta.motivo, 'CPF reincidente');
  });

  teste('SUSEP fora do cadastro responde "não encontrada", que não é erro', () => {
    const resposta = chamar('consultarSusep')('9999999');
    igual(resposta.situacao, 'NAO_ENCONTRADA');
    igual(resposta.segmento, 'Não encontrado');
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

  teste('a tela pede ao servidor em vez de desenhar campo fixo', () => {
    const fonte = fs.readFileSync(
      path.join(__dirname, '..', '..', 'Front-End', 'CadastrarCaso.html'), 'utf8');
    contem(fonte, "Servidor.chamar('formularioDoCanal'", 'o formulário vem do servidor');
    contem(fonte, "Servidor.chamar('cadastrarCaso'", 'quem grava é o servidor');
    contem(lerPeca('Formulario'),
      "Servidor.chamar('consultarSusep'", 'o selo consulta o servidor');
  });

  teste('o formulário é desenhado num lugar só, e as duas telas o usam', () => {
    // Cadastrar Caso e o modal de edição do Dashboard montam o MESMO
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
}

module.exports = { rodarTestesDeCadastro };
