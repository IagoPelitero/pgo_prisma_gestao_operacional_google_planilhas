/**
 * ============================================================================
 * RECC — testes-acesso.js · a Etapa 2
 * ============================================================================
 * Prova quem entra, o que cada nível pode, e — o mais importante — que toda
 * recusa DIZ O MOTIVO. Menu vazio e permissão vazia são a mesma tela para
 * quem está do outro lado, e levam a pessoa a procurar no lugar errado.
 * ============================================================================
 */

const {
  carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario
} = require('./ferramentas');

function rodarTestesDeAcesso() {
  console.log('\nEtapa 2 — Acesso');

  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');

  /** Cadastra alguém e devolve o Id, para os testes não repetirem isso. */
  function cadastrar(nome, email, nivel, canal) {
    const niveis = chamar('lerRegistros_("CATALOGO")')
      .filter((item) => item.Tipo === 'NIVEL_ACESSO');
    const escolhido = niveis.find((item) => item.Nome === nivel);
    if (!escolhido) throw new Error('nível inexistente no teste: ' + nivel);
    return chamar('salvarUsuario')({
      nome: nome,
      email: email,
      nivelAcessoId: escolhido.Id,
      canalQueAtende: canal || '',
      ativo: true
    });
  }

  secao('Quem entra');

  teste('quem instalou entra, e entra como Administrador', () => {
    const quem = chamar('usuarioAtual_()');
    igual(quem.cadastrado, true, 'deveria estar cadastrado');
    igual(quem.nivel, 'Administrador');
    igual(quem.permissoes.escopo, 'TODOS');
    igual(quem.permissoes.defeito, '', 'não deveria haver defeito de configuração');
  });

  teste('e-mail não cadastrado não entra, e a recusa diz por quê', () => {
    ambiente.definirEmail('estranho@exemplo.com');
    const quem = chamar('usuarioAtual_()');
    igual(quem.cadastrado, false);
    contem(quem.motivo, 'não está cadastrado', 'motivo da recusa');
    ambiente.definirEmail('primeiro.adm@exemplo.com');
  });

  teste('usuário desativado é recusado com motivo diferente de não cadastrado', () => {
    const id = cadastrar('Ana Martins', 'ana@exemplo.com', 'Operação', 'Corretora ABC');
    chamar('atualizarRegistro_')('USUARIOS', id, { Ativo: 'NAO' });

    ambiente.definirEmail('ana@exemplo.com');
    const quem = chamar('usuarioAtual_()');
    igual(quem.cadastrado, false);
    contem(quem.motivo, 'desativado', 'a mensagem precisa distinguir os dois casos');

    chamar('atualizarRegistro_')('USUARIOS', id, { Ativo: 'SIM' });
    ambiente.definirEmail('primeiro.adm@exemplo.com');
  });

  teste('nível desligado se anuncia em vez de virar menu vazio', () => {
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((item) => item.Tipo === 'NIVEL_ACESSO' && item.Nome === 'Operação');
    chamar('atualizarRegistro_')('CATALOGO', operacao.Id, { Ativo: 'NAO' });

    ambiente.definirEmail('ana@exemplo.com');
    const quem = chamar('usuarioAtual_()');
    igual(quem.cadastrado, false);
    contem(quem.motivo, 'está desligado', 'motivo específico');

    chamar('atualizarRegistro_')('CATALOGO', operacao.Id, { Ativo: 'SIM' });
    ambiente.definirEmail('primeiro.adm@exemplo.com');
  });

  teste('nível apagado à mão na planilha também se anuncia', () => {
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((item) => item.Tipo === 'NIVEL_ACESSO' && item.Nome === 'Operação');
    const aba = ambiente.planilha.getSheetByName('CATALOGO');
    const largura = aba.getMaxColumns();
    const guardada = aba.getRange(operacao.__linha, 1, 1, largura).getValues();

    aba.getRange(operacao.__linha, 1, 1, largura)
      .setValues([guardada[0].map(() => '')]);
    chamar('esquecerEstruturaLida_()');

    ambiente.definirEmail('ana@exemplo.com');
    contem(chamar('usuarioAtual_()').motivo, 'não existe mais no catálogo');

    aba.getRange(operacao.__linha, 1, 1, largura).setValues(guardada);
    chamar('esquecerEstruturaLida_()');
    ambiente.definirEmail('primeiro.adm@exemplo.com');
  });

  teste('gravar campo sem coluna é erro, não descarte silencioso', () => {
    lanca(() => chamar('inserirRegistro_')('PRODUTOS', {
      Produto: 'Vida Individual', CodigoProdutoo: '1234'
    }), 'não tem coluna para: CodigoProdutoo',
    'um cabeçalho digitado errado jogaria o dado fora dizendo "salvo"');
  });

  teste('ocultar numa aba de catálogo explica o que usar no lugar', () => {
    const item = chamar('lerRegistros_("CATALOGO")')[0];
    lanca(() => chamar('ocultarRegistro_')('CATALOGO', item.Id, ''), 'a coluna Ativo');
  });

  teste('configuração de nível quebrada vira defeito declarado, não silêncio', () => {
    const niveis = chamar('lerRegistros_("CATALOGO")')
      .filter((item) => item.Tipo === 'NIVEL_ACESSO');
    const operacao = niveis.find((item) => item.Nome === 'Operação');
    chamar('atualizarRegistro_')('CATALOGO', operacao.Id, { Configuracao: '{ isso não é json' });

    ambiente.definirEmail('ana@exemplo.com');
    const quem = chamar('usuarioAtual_()');
    igual(quem.cadastrado, true, 'a pessoa está cadastrada; o defeito é da configuração');
    contem(quem.permissoes.defeito, 'não é um JSON válido');
    lanca(() => chamar('exigirPermissao_')('criar'), 'Acesso indisponível',
      'com defeito, a guarda precisa recusar dizendo que é defeito');

    chamar('atualizarRegistro_')('CATALOGO', operacao.Id, {
      Configuracao: JSON.stringify({
        escopo: 'PROPRIOS',
        telas: ['dashboard', 'cadastrarCaso', 'minhaPerformance', 'buscarCaso',
          'tabelaCorretoras'],
        acoes: ['criar', 'editar', 'exportar'],
        campos: {},
        componentes: {}
      })
    });
    ambiente.definirEmail('primeiro.adm@exemplo.com');
  });

  secao('O que cada nível pode');

  teste('o menu vem filtrado pelo nível, com os nomes que o ADM escolheu', () => {
    ambiente.definirEmail('ana@exemplo.com');
    const daOperacao = chamar('pacoteDePartida()');
    igual(daOperacao.disponivel, true);
    igual(daOperacao.menu.length, 5, 'a Operação não vê Painel Analítico nem Configurações');
    igual(daOperacao.menu[0].titulo, 'Dashboard', 'o título vem de CONFIG');

    ambiente.definirEmail('primeiro.adm@exemplo.com');
    igual(chamar('pacoteDePartida()').menu.length, 7, 'o Administrador vê tudo');
  });

  teste('a guarda do servidor barra a ação que o nível não tem', () => {
    ambiente.definirEmail('ana@exemplo.com');
    lanca(() => chamar('exigirPermissao_')('configurar'), 'não permite configurar');
    verdadeiro(chamar('exigirPermissao_')('criar').cadastrado, 'criar é permitido');
    ambiente.definirEmail('primeiro.adm@exemplo.com');
  });

  teste('esconder botão não é segurança: listarUsuarios recusa quem não configura', () => {
    ambiente.definirEmail('ana@exemplo.com');
    lanca(() => chamar('listarUsuarios')(), 'não permite configurar');
    ambiente.definirEmail('primeiro.adm@exemplo.com');
    verdadeiro(chamar('listarUsuarios')().length >= 2, 'o Administrador lista');
  });

  teste('campo sem regra nasce editável; oculto só quando declarado', () => {
    const permissoes = { campos: { cpf: 'oculto', protocolo: 'leitura' } };
    igual(chamar('visibilidadeDoCampo_')(permissoes, 'cpf'), 'oculto');
    igual(chamar('visibilidadeDoCampo_')(permissoes, 'protocolo'), 'leitura');
    igual(chamar('visibilidadeDoCampo_')(permissoes, 'qualquerCampoNovo'), 'edicao',
      'campo novo precisa nascer visível, senão some sem ninguém entender');
  });

  teste('cada nível traz a sua lista de ações, não uma lista comum', () => {
    // Um nível chamado "Consulta" que pode criar caso é um nome mentindo
    // sobre a permissão. Já aconteceu: todo nível não-administrador recebia
    // a mesma lista.
    const porNome = {};
    chamar('lerRegistros_("CATALOGO")')
      .filter((item) => item.Tipo === 'NIVEL_ACESSO')
      .forEach((item) => { porNome[item.Nome] = JSON.parse(item.Configuracao).acoes; });

    verdadeiro(porNome['Consulta'].indexOf('criar') < 0, 'Consulta não cria');
    verdadeiro(porNome['Consulta'].indexOf('editar') < 0, 'Consulta não edita');
    verdadeiro(porNome['Operação'].indexOf('criar') >= 0, 'Operação cria');
    verdadeiro(porNome['Operação'].indexOf('ocultar') < 0, 'Operação não oculta');
    verdadeiro(porNome['Coordenação'].indexOf('ocultar') >= 0, 'Coordenação oculta');
    verdadeiro(porNome['Coordenação'].indexOf('estrutura') < 0,
      'só o administrador mexe em estrutura');
    verdadeiro(porNome['Administrador'].indexOf('estrutura') >= 0);
  });

  secao('Alcance sobre os dados');

  teste('escopo PROPRIOS mostra só os casos da própria pessoa', () => {
    chamar('inserirVariosRegistros_')('BASE_MESA', [
      { Analista: 'Ana Martins', Status: 'Pendente' },
      { Analista: 'Ana Martins', Status: 'Concluído' },
      { Analista: 'Diego Castilho', Status: 'Pendente' }
    ]);

    ambiente.definirEmail('ana@exemplo.com');
    const quem = chamar('usuarioAtual_()');
    const todos = chamar('lerRegistros_("BASE_MESA")');
    const meus = chamar('filtrarPeloAlcance_')(todos, 'BASE_MESA', quem);
    igual(todos.length, 3, 'a base tem três casos');
    igual(meus.length, 2, 'a Ana enxerga os dois dela');
    ambiente.definirEmail('primeiro.adm@exemplo.com');
  });

  teste('escopo TODOS não filtra nada', () => {
    const quem = chamar('usuarioAtual_()');
    const todos = chamar('lerRegistros_("BASE_MESA")');
    igual(chamar('filtrarPeloAlcance_')(todos, 'BASE_MESA', quem).length, todos.length);
  });

  teste('escopo EQUIPE é o canal que a pessoa atende', () => {
    cadastrar('Diego Castilho', 'diego@exemplo.com', 'Operação', 'Corretora ABC');
    const niveis = chamar('lerRegistros_("CATALOGO")')
      .filter((item) => item.Tipo === 'NIVEL_ACESSO');
    const operacao = niveis.find((item) => item.Nome === 'Operação');
    const configuracao = JSON.parse(operacao.Configuracao);
    configuracao.escopo = 'EQUIPE';
    chamar('atualizarRegistro_')('CATALOGO', operacao.Id, {
      Configuracao: JSON.stringify(configuracao)
    });

    ambiente.definirEmail('ana@exemplo.com');
    const quem = chamar('usuarioAtual_()');
    igual(quem.permissoes.escopo, 'EQUIPE');
    const todos = chamar('lerRegistros_("BASE_MESA")');
    igual(chamar('filtrarPeloAlcance_')(todos, 'BASE_MESA', quem).length, 3,
      'Ana e Diego atendem o mesmo canal, então ela vê os três');
    ambiente.definirEmail('primeiro.adm@exemplo.com');
  });

  secao('Cadastro de usuários');

  teste('e-mail repetido é recusado com o nome de quem já usa', () => {
    lanca(() => cadastrar('Outra Pessoa', 'ana@exemplo.com', 'Operação'),
      'já está cadastrado para Ana Martins');
  });

  teste('nível de acesso inexistente é recusado na hora de gravar', () => {
    lanca(() => chamar('salvarUsuario')({
      nome: 'Sem Nível', email: 'semnivel@exemplo.com', nivelAcessoId: '0009999999'
    }), 'nível de acesso que exista',
    'cadastrar sem nível deixaria a pessoa presa do lado de fora');
  });

  teste('ninguém desativa o próprio acesso', () => {
    const eu = chamar('usuarioAtual_()');
    lanca(() => chamar('desativarUsuario')(eu.usuario.Id), 'próprio acesso');
  });

  teste('o último administrador não pode ser desativado', () => {
    // O risco real não é o administrador se desativar — isso já é barrado.
    // É um nível que pode CONFIGURAR sem poder mexer na ESTRUTURA: quem tem
    // esse nível consegue mexer em usuários e poderia desligar o único
    // administrador, trancando todo mundo do lado de fora.
    const gestor = chamar('inserirRegistro_')('CATALOGO', {
      Tipo: 'NIVEL_ACESSO',
      Nome: 'Gestor de pessoas',
      Ativo: true,
      Configuracao: JSON.stringify({
        escopo: 'TODOS',
        telas: ['dashboard', 'configuracoes'],
        acoes: ['criar', 'editar', 'configurar'],
        campos: {},
        componentes: {}
      })
    });
    chamar('salvarUsuario')({
      nome: 'Gustavo Rezende',
      email: 'gustavo@exemplo.com',
      nivelAcessoId: gestor.Id,
      ativo: true
    });

    const administrador = chamar('usuarioAtual_()').usuario.Id;
    ambiente.definirEmail('gustavo@exemplo.com');
    igual(chamar('usuarioAtual_()').permissoes.acoes.indexOf('estrutura'), -1,
      'o gestor não é administrador');
    lanca(() => chamar('desativarUsuario')(administrador), 'último administrador',
      'deixar a base sem administrador tranca todo mundo do lado de fora');

    ambiente.definirEmail('primeiro.adm@exemplo.com');
  });

  secao('Senha de administrador');

  teste('a impressão digital é SHA-256 de verdade', () => {
    // Valor conferido fora do sistema: sha256("teste") em hexadecimal.
    const bytes = chamar('Utilities').computeDigest('SHA_256', 'teste');
    let hexadecimal = '';
    bytes.forEach((b) => {
      const semSinal = (b + 256) % 256;
      hexadecimal += (semSinal < 16 ? '0' : '') + semSinal.toString(16);
    });
    igual(hexadecimal,
      '46070d4bf934fb0d4b06d9e2c46e346944e322444900a435d7d9a95e6d7435f5',
      'se isto falhar, o simulador está fingindo e nenhum teste de senha vale');
  });

  teste('a senha não é guardada — só a impressão digital, com tempero', () => {
    chamar('definirSenhaDeAdministrador_')('segredo123', '');
    const guardado = ambiente.propriedades.get('RECC_SENHA_DO_ADMINISTRADOR');
    verdadeiro(guardado.indexOf('segredo123') < 0, 'a senha não pode aparecer');
    igual(guardado.split(':').length, 2, 'tempero e impressão digital');
    igual(guardado.split(':')[1].length, 64, 'SHA-256 dá 64 caracteres hexadecimais');
  });

  teste('senha certa libera; senha errada recusa', () => {
    igual(chamar('conferirSenhaDeAdministrador_')('segredo123'), true);
    lanca(() => chamar('conferirSenhaDeAdministrador_')('errada'), 'Senha incorreta');
  });

  teste('quem administra não precisa digitar a senha', () => {
    // A senha nunca foi uma segunda identidade: o sistema já sabe quem está
    // chamando, pela conta Google, e já conferiu a permissão. Ela é um FREIO
    // antes de uma ação sem desfazer — e pedir a quem CUIDA do sistema um
    // segredo que ela mesma escolheu é atrito sem ganho.
    ambiente.propriedadesDoUsuario.set('RECC_SENHA_LIBERADA_ATE', '1');
    igual(chamar('exigirSenhaDeAdministrador_')(), true,
      'o administrador passa mesmo com a liberação expirada');
  });

  teste('quem NÃO administra continua parando na senha, e ela expira', () => {
    // Aqui o freio serve para o que foi feito: a ação é cara, e quem a está
    // fazendo não é quem cuida do sistema.
    const consulta = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Consulta');
    chamar('salvarUsuario')({
      nome: 'Sem Estrutura', email: 'sem.estrutura@exemplo.com',
      nivelAcessoId: consulta.Id, ativo: true
    });

    comoUsuario(ambiente, 'sem.estrutura@exemplo.com', () => {
      ambiente.propriedadesDoUsuario.set('RECC_SENHA_LIBERADA_ATE', '1');
      lanca(() => chamar('exigirSenhaDeAdministrador_')(),
        'liberação anterior expirou');

      chamar('conferirSenhaDeAdministrador_')('segredo123');
      igual(chamar('exigirSenhaDeAdministrador_')(), true,
        'com a senha na mão, passa');
    });
  });

  teste('sem senha definida, quem não administra continua barrado', () => {
    // Do contrário, não definir senha viraria o jeito mais fácil de desligar
    // a guarda.
    const { ambiente: outro, chamar: chamarOutro } = carregar('primeiro.adm@exemplo.com');
    chamarOutro('instalarRECC()');
    const consulta = chamarOutro('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Consulta');
    chamarOutro('salvarUsuario')({
      nome: 'Sem Nada', email: 'sem.nada@exemplo.com',
      nivelAcessoId: consulta.Id, ativo: true
    });

    comoUsuario(outro, 'sem.nada@exemplo.com', () => {
      lanca(() => chamarOutro('exigirSenhaDeAdministrador_')(),
        'nenhuma foi definida');
    });
  });

  teste('três tentativas erradas bloqueiam', () => {
    chamar('definirSenhaDeAdministrador_')('outraSenha1', 'segredo123');
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      lanca(() => chamar('conferirSenhaDeAdministrador_')('nao'), 'Senha incorreta');
    }
    lanca(() => chamar('conferirSenhaDeAdministrador_')('nao'), 'Acesso bloqueado');
    lanca(() => chamar('conferirSenhaDeAdministrador_')('outraSenha1'), 'Senha bloqueada',
      'nem a senha certa passa enquanto o bloqueio durar');
    ambiente.propriedades.delete('RECC_TENTATIVAS_DE_SENHA');
  });

  teste('trocar a senha exige a senha atual', () => {
    lanca(() => chamar('definirSenhaDeAdministrador_')('novaSenha1', 'chuteErrado'),
      'Senha incorreta',
      'sem isso, quem pode configurar se promoveria sozinho');
  });

  secao('A tela de quem não está cadastrado');

  teste('doGet serve a tela institucional, com o e-mail e o motivo', () => {
    ambiente.definirEmail('estranho@exemplo.com');
    const html = chamar('doGet()').getContent();
    contem(html, 'Seu usuário ainda', 'título da tela');
    contem(html, 'estranho@exemplo.com', 'o e-mail usado precisa aparecer');
    contem(html, 'não está cadastrado', 'o motivo precisa aparecer');
    contem(html, 'RECC', 'o nome do sistema vem de CONFIG');
    contem(html, 'Um espaço para cuidar de cada atendimento',
      'a frase do painel vem de CONFIG');
    contem(html, 'Tentar novamente', 'a saída da tela');
    ambiente.definirEmail('primeiro.adm@exemplo.com');
  });

  teste('o título muda conforme o motivo, e não é a mesma frase para tudo', () => {
    // Quatro recusas diferentes levam a quatro lugares diferentes. Decidimos
    // pelo CÓDIGO da recusa, nunca comparando a frase: corrigir uma vírgula
    // no texto não pode mudar o comportamento da tela.
    const desativado = chamar('salvarUsuario')({
      nome: 'Bruno Sales', email: 'bruno@exemplo.com', ativo: true,
      nivelAcessoId: chamar('lerRegistros_("CATALOGO")')
        .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Administrador').Id
    });
    chamar('desativarUsuario')(desativado);

    comoUsuario(ambiente, 'bruno@exemplo.com', () => {
      igual(chamar('usuarioAtual_()').situacao, 'DESATIVADO');
      contem(chamar('doGet()').getContent(), 'Seu acesso foi desativado');
    });
    comoUsuario(ambiente, 'ninguem@exemplo.com', () => {
      igual(chamar('usuarioAtual_()').situacao, 'NAO_CADASTRADO');
      contem(chamar('doGet()').getContent(), 'Seu usuário ainda');
    });
  });

  teste('sem imagem, quem assina a tela é a OPERAÇÃO, não o sistema', () => {
    // Quem chega aqui foi barrado antes de entrar: precisa reconhecer a casa,
    // não o software. E é tipografia, não um desenho da marca.
    comoUsuario(ambiente, 'estranho@exemplo.com', () => {
      const html = chamar('doGet()').getContent();
      verdadeiro(html.indexOf('<img') < 0, 'não deveria haver imagem sem logo definida');
      // A última palavra em negrito, como marcas de duas palavras se escrevem.
      // É TIPOGRAFIA, e não um desenho da marca de outra empresa: para isso
      // existe o campo da logo, com um botão que escolhe a imagem do
      // computador e a embute na própria planilha.
      contem(html, '<span class="leve">Porto</span>',
        'a operação assina a tela, e a primeira palavra vai mais leve');
      contem(html, 'Seguro', 'e a última em negrito');
      contem(html, 'Acesso ao RECC',
        'e o nome do sistema abre o recado, do outro lado');
    });
  });

  teste('com logo configurada a tela usa a imagem', () => {
    const configuracoes = chamar('lerRegistros_("CONFIG")');
    const logo = configuracoes.find((linha) => linha.Chave === 'IDENTIDADE.LOGO_URL');
    chamar('atualizarRegistro_')('CONFIG', logo.Id, {
      Valor: 'https://exemplo.com/marca.png'
    });

    ambiente.definirEmail('estranho@exemplo.com');
    const html = chamar('doGet()').getContent();
    contem(html, '<img src="https://exemplo.com/marca.png"', 'a logo vem de CONFIG');
    ambiente.definirEmail('primeiro.adm@exemplo.com');
  });

  teste('pacoteDePartida não estoura para quem não está cadastrado', () => {
    ambiente.definirEmail('estranho@exemplo.com');
    const pacote = chamar('pacoteDePartida()');
    igual(pacote.disponivel, false);
    igual(pacote.cadastrado, false);
    contem(pacote.motivo, 'não está cadastrado');
    verdadeiro(pacote.identidade.nome === 'RECC', 'a identidade continua vindo');
    ambiente.definirEmail('primeiro.adm@exemplo.com');
  });

  secao('Auditoria');

  teste('as ações relevantes deixam rastro', () => {
    const antes = chamar('lerRegistros_("AUDITORIA")').length;
    cadastrar('Luciana Prado', 'luciana@exemplo.com', 'Consulta', 'Site');
    const depois = chamar('lerRegistros_("AUDITORIA")');
    igual(depois.length, antes + 1, 'uma linha de auditoria');
    igual(depois[depois.length - 1].Acao, 'usuario.criar');
    verdadeiro(String(depois[depois.length - 1].Detalhe).indexOf('@') < 0,
      'a auditoria não guarda dado pessoal');
  });
}

module.exports = { rodarTestesDeAcesso };
