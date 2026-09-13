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
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, celula } =
  require('./ferramentas');

function rodarTestesDeCadastro() {
  console.log('\nEtapa 4 — Cadastrar Caso');

  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');
  const planilha = ambiente.planilha;

  const mesas = chamar('mesasVisiveis_()');
  const mesaDiamante = mesas.find((mesa) => mesa.aba === 'BASE_MESA');
  const mesaRet = mesas.find((mesa) => mesa.aba === 'BASE_RET');

  secao('O formulário vem do servidor, não do código');

  teste('a mesa entrega seções com campos, na ordem do administrador', () => {
    const formulario = chamar('formularioDaMesa')(mesaDiamante.id);
    igual(formulario.mesa.nome, 'Mesa Diamante');
    verdadeiro(formulario.secoes.length >= 4,
      'esperava várias seções, veio ' + formulario.secoes.length);

    const todos = formulario.secoes.reduce((soma, s) => soma.concat(s.campos), []);
    igual(todos.length, 19, 'os 20 cabeçalhos menos o Id, que ninguém digita');
    verdadeiro(!todos.some((campo) => campo.chave === 'id'),
      'o Id não é campo de tela');
  });

  teste('o seletor traz as opções do catálogo, e só as da mesa', () => {
    const formulario = chamar('formularioDaMesa')(mesaDiamante.id);
    const todos = formulario.secoes.reduce((soma, s) => soma.concat(s.campos), []);

    const status = todos.find((campo) => campo.chave === 'status');
    igual(status.tipo, 'seletor');
    igual(status.opcoes.length, 6, 'os seis status da Mesa Diamante');
    igual(status.opcoes[0].valor, 'Transmissão pendente');
    verdadeiro(!status.opcoes.some((o) => o.valor === 'Em tratativa'),
      'status da RET não pode aparecer na Mesa');

    const canal = todos.find((campo) => campo.chave === 'canal');
    verdadeiro(canal.opcoes.length >= 5, 'canal é lista global, serve às duas mesas');
  });

  teste('o CPF nasce com máscara, e a máscara diz quantos dígitos ele quer', () => {
    const formulario = chamar('formularioDaMesa')(mesaDiamante.id);
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

    const analista = chamar('formularioDaMesa')(mesaDiamante.id)
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

  teste('cada mesa aparece com o seu desenho, vindo da aba MESAS', () => {
    const fonte = fs.readFileSync(
      path.join(__dirname, '..', '..', 'Front-End', 'SeletorDeMesa.html'), 'utf8')
      .replace(/^<script>/, '').replace(/<\/script>\s*$/, '');
    const contexto = vm.createContext({
      Moldura: { escapar: (t) => String(t) }, document: {}, console });
    vm.runInContext(fonte, contexto);

    const botoes = contexto.SeletorDeMesa.montar(mesas, mesas[0].id);
    igual((botoes.match(/<svg/g) || []).length, 2, 'um desenho por mesa');
    verdadeiro(botoes.indexOf('M12 15.4c-2-1.3') >= 0, 'o escudo com coração da RET');
    verdadeiro(botoes.indexOf('M7.4 3.6h9.2') >= 0, 'o diamante da Mesa');
    verdadeiro(botoes.indexOf('class="mesa atual"') >= 0, 'a mesa escolhida se marca');
  });

  teste('o seletor de mesa é uma peça só, usada pelas duas telas', () => {
    // Duas cópias divergiriam na primeira mudança.
    const cadastro = fs.readFileSync(
      path.join(__dirname, '..', '..', 'Front-End', 'CadastrarCaso.html'), 'utf8');
    const painel = fs.readFileSync(
      path.join(__dirname, '..', '..', 'Front-End', 'Dashboard.html'), 'utf8');
    contem(cadastro, 'SeletorDeMesa.montar');
    contem(painel, 'SeletorDeMesa.montar');
    verdadeiro(cadastro.indexOf('DESENHOS_DAS_MESAS') < 0,
      'o desenho das mesas não pode estar duplicado na tela de cadastro');
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
    const todos = chamar('formularioDaMesa')(mesaDiamante.id)
      .secoes.reduce((soma, s) => soma.concat(s.campos), []);

    verdadeiro(!todos.some((campo) => campo.chave === 'documentocpf'),
      'o campo oculto não pode vir na resposta');
    igual(todos.find((campo) => campo.chave === 'assunto').somenteLeitura, true);
    ambiente.definirEmail('primeiro.adm@exemplo.com');
  });

  secao('Gravar');

  teste('um caso é gravado e devolve o Id', () => {
    const resposta = chamar('cadastrarCaso')(mesaDiamante.id, {
      status: 'Pendente',
      nomedosegurado: 'Vanessa Duarte Lima',
      documentocpf: '000.123.456-78'
    });
    igual(resposta.id, '0000000000', 'o primeiro caso da aba');
    igual(resposta.mesa, 'Mesa Diamante');
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
    const erro = lanca(() => chamar('cadastrarCaso')(mesaDiamante.id, {
      nomedosegurado: 'Sem status'
    }), 'Status');
    igual(erro.problemas.length, 1);
    igual(erro.problemas[0].campo, 'status');
    igual(erro.problemas[0].erro, 'é obrigatório');
  });

  teste('todos os problemas vêm de uma vez, não um por vez', () => {
    const erro = lanca(() => chamar('cadastrarCaso')(mesaDiamante.id, {
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

    igual(chamar('cadastrarCaso')(mesaDiamante.id, {
      status: 'Pendente', nomedosegurado: 'Caso de ontem', dataresposta: escrita
    }).mesa, 'Mesa Diamante');
  });

  teste('seletor com valor fora da lista é recusado', () => {
    const erro = lanca(() => chamar('cadastrarCaso')(mesaDiamante.id, {
      status: 'Inventado', nomedosegurado: 'Alguém'
    }), 'Confira');
    igual(erro.problemas[0].erro, 'não é uma das opções da lista');
  });

  teste('valor de campo OCULTO mandado pela tela é ignorado', () => {
    // A tela é do lado de lá. Mesmo que alguém monte a chamada à mão com o
    // campo escondido preenchido, o servidor não grava.
    ambiente.definirEmail('ana@exemplo.com');
    const resposta = chamar('cadastrarCaso')(mesaDiamante.id, {
      status: 'Pendente',
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
    lanca(() => chamar('cadastrarCaso')(mesaDiamante.id, { status: 'Pendente' }),
      'não permite criar');
    ambiente.definirEmail('primeiro.adm@exemplo.com');
  });

  secao('Editar e ocultar');

  teste('editar não reescreve a data de entrada', () => {
    const antes = celula(planilha, 'BASE_MESA', 2, 'Data de entrada');
    chamar('editarCaso')(mesaDiamante.id, '0000000000', {
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

    ambiente.definirEmail('ana@exemplo.com');
    lanca(() => chamar('editarCaso')(mesaDiamante.id, '0000000000', {
      status: 'Pendente', nomedosegurado: 'Tentativa'
    }), 'fora do seu alcance');
    ambiente.definirEmail('primeiro.adm@exemplo.com');
  });

  teste('ocultar tira da tela e mantém a linha na planilha', () => {
    const antes = chamar('lerRegistros_("BASE_MESA")').length;
    chamar('ocultarCaso')(mesaDiamante.id, '0000000000');
    igual(chamar('lerRegistros_("BASE_MESA")').length, antes - 1);
    igual(celula(planilha, 'BASE_MESA', 2, 'Nome do segurado'), 'Vanessa Duarte Lima',
      'o dado continua lá');
    igual(celula(planilha, 'BASE_MESA', 2, '_Visivel'), 'NAO');
  });

  secao('O selo da SUSEP');

  teste('SUSEP no cadastro de canais volta liberada, com o segmento', () => {
    chamar('inserirRegistro_')('CANAIS', {
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
    const fonte = fs.readFileSync(
      path.join(__dirname, '..', '..', 'Front-End', 'Formulario.html'), 'utf8')
      .replace(/^<script>/, '').replace(/<\/script>\s*$/, '');
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
    contem(fonte, "Servidor.chamar('formularioDaMesa'", 'o formulário vem do servidor');
    contem(fonte, "Servidor.chamar('cadastrarCaso'", 'quem grava é o servidor');
    contem(fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End',
      'Formulario.html'), 'utf8'),
      "Servidor.chamar('consultarSusep'", 'o selo consulta o servidor');
  });

  teste('o formulário é desenhado num lugar só, e as duas telas o usam', () => {
    // Cadastrar Caso e o modal de edição do Dashboard montam o MESMO
    // formulário. Duas cópias divergiriam no primeiro ajuste de máscara.
    const pasta = path.join(__dirname, '..', '..', 'Front-End');
    const cadastro = fs.readFileSync(path.join(pasta, 'CadastrarCaso.html'), 'utf8');
    const modal = fs.readFileSync(path.join(pasta, 'CasoEmModal.html'), 'utf8');

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
