/**
 * ============================================================================
 * PGO — testes-configuracoes.js · a Etapa 6
 * ============================================================================
 * Esta é a tela que muda todas as outras. Os testes aqui cuidam sobretudo das
 * TRAVAS: as mudanças que, se passassem, deixariam alguém trancado do lado de
 * fora ou apontando para um dado que não existe mais.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario, scriptDaPeca } =
  require('./ferramentas');

const PASTA_DAS_TELAS = path.join(__dirname, '..', '..', 'Front-End');

function lerTela(nome) {
  return fs.readFileSync(path.join(PASTA_DAS_TELAS, nome), 'utf8');
}

/**
 * Carrega os scripts de uma ou mais telas no mesmo contexto.
 *
 * A tela de Configurações usa o Moldura para escapar texto, então as duas
 * precisam morar juntas — como moram na página de verdade.
 */
function carregarTelas(nomes) {
  const contexto = vm.createContext({ console });
  nomes.forEach((nome) => {
    const curto = nome.replace(/\.html$/, '');
    vm.runInContext(scriptDaPeca(curto), contexto, { filename: curto });
  });
  return contexto;
}

function rodarTestesDeConfiguracoes() {
  console.log('\nEtapa 6 — Configurações');

  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');
  const canal = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_MESA');

  secao('O panorama');

  teste('a tela abre sabendo o tamanho de cada seção', () => {
    const resumo = chamar('resumoDasConfiguracoes()');
    // Conferimos as CHAVES, e não só quantas são: contar 7 continuaria
    // passando se uma seção sumisse e outra nascesse no mesmo commit.
    igual(resumo.secoes.map((s) => s.chave).join(','),
      'campos,usuarios,niveis,catalogo,canais,identidade,paineis,analises,estrutura');
    // As CHAVES são de código e não mudam; os TÍTULOS são de tela e mudaram a
    // pedido do PO: "Campos" virou "Cadastrar Caso" ("assim saberei que é onde
    // ajusto o formulário") e "Listas" virou "Ajustes Gerais" ("que vou
    // entender que são outros tipos de ajuste").
    igual(resumo.secoes.find((s) => s.chave === 'campos').titulo,
      'Cadastrar Caso');
    igual(resumo.secoes.find((s) => s.chave === 'catalogo').titulo,
      'Ajustes Gerais');
    igual(resumo.podeMexerNaEstrutura, true);
    igual(resumo.senhaDefinida, false, 'instalação nova ainda não tem senha');
    verdadeiro(resumo.secoes.find((s) => s.chave === 'campos').quantidade >= 55);
    igual(resumo.estrutura.emOrdem, true);
  });

  teste('quem não configura não abre a tela, nem chamando direto', () => {
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    chamar('salvarUsuario')({
      nome: 'Ana Martins', email: 'ana@exemplo.com',
      nivelAcessoId: operacao.Id, ativo: true
    });
    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      lanca(() => chamar('resumoDasConfiguracoes()'), 'não permite configurar');
    });
  });

  secao('Campos do formulário');

  teste('a lista traz protegidos, desligados e o estado da coluna', () => {
    const campos = chamar('listarCamposDoCanal')(canal.id);
    igual(campos.length, 25, 'os 25 cabeçalhos do canal, inclusive o Id');
    verdadeiro(campos.every((c) => c.colunaExiste), 'todas as colunas existem');
    verdadeiro(campos.find((c) => c.chave === 'id').protegido);
    igual(campos.find((c) => c.chave === 'id').ativo, false);
    igual(campos[0].ordem, 1, 'vem na ordem do administrador');
  });

  teste('coluna apagada na planilha aparece marcada, não some calada', () => {
    const aba = ambiente.planilha.getSheetByName('BASE_MESA');
    const guardado = aba.getRange(1, 15).getValue();     // Assunto
    aba.getRange(1, 15).setValue('');
    chamar('esquecerEstruturaLida_()');

    const campo = chamar('listarCamposDoCanal')(canal.id)
      .find((c) => c.chave === 'assunto');
    igual(campo.colunaExiste, false,
      'o campo precisa avisar que perdeu a coluna, em vez de parar de funcionar');

    aba.getRange(1, 15).setNumberFormat('@');
    aba.getRange(1, 15).setValue(guardado);
    chamar('esquecerEstruturaLida_()');
  });

  teste('mudar rótulo, seção e máscara não pede senha — é aparência', () => {
    const campo = chamar('listarCamposDoCanal')(canal.id)
      .find((c) => c.chave === 'assunto');
    chamar('salvarCampo')({
      id: campo.id, rotulo: 'Assunto do contato', secao: 'Atendimento',
      tipo: 'texto', obrigatorio: true, ativo: true
    });
    const depois = chamar('listarCamposDoCanal')(canal.id)
      .find((c) => c.chave === 'assunto');
    igual(depois.rotulo, 'Assunto do contato');
    igual(depois.obrigatorio, true);
    igual(depois.cabecalho, 'Assunto', 'o cabeçalho da coluna não muda');
  });

  teste('trocar o cabeçalho por aqui é recusado — é mexer na coluna', () => {
    const campo = chamar('listarCamposDoCanal')(canal.id)
      .find((c) => c.chave === 'assunto');
    lanca(() => chamar('salvarCampo')({
      id: campo.id, cabecalho: 'Outro nome', rotulo: 'x', tipo: 'texto'
    }), 'nome da coluna na planilha');
  });

  teste('tipo de campo inventado é recusado, e diz quais existem', () => {
    const campo = chamar('listarCamposDoCanal')(canal.id)[1];
    lanca(() => chamar('salvarCampo')({
      id: campo.id, rotulo: 'x', tipo: 'telepatia'
    }), 'Tipo de campo desconhecido');
  });

  teste('criar campo NÃO pede senha ao administrador', () => {
    // Criar coluna escreve na planilha de produção e não tem desfazer — mas
    // a ação já exige a permissão de ESTRUTURA, que só o administrador tem.
    // Pedir a ele um segredo que ele mesmo escolheu é atrito sem ganho: o
    // sistema já sabe quem está chamando, pela conta Google.
    const criado = chamar('criarCampo')(canal.id, { rotulo: 'Observação interna' });
    igual(criado.cabecalho, 'Observação interna');
  });

  teste('e quem não administra não chega nem perto dela', () => {
    // O freio de verdade desta ação não é a senha: é a permissão.
    //
    // A Ana já existe, no nível Operação — reaproveitá-la em vez de cadastrar
    // mais alguém é de propósito: um teste adiante conta quantas pessoas
    // dependem de cada nível, e um usuário a mais aqui o quebraria sem que
    // nada tivesse quebrado de verdade.
    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      lanca(() => chamar('criarCampo')(canal.id, { rotulo: 'Pela porta dos fundos' }),
        'não permite');
    });
  });

  teste('com a senha liberada, o campo novo vira coluna de verdade', () => {
    chamar('definirSenhaDeAdministrador')('segredo123', '');
    chamar('liberarComSenha')('segredo123');

    const criado = chamar('criarCampo')(canal.id, {
      rotulo: 'Valor negociado', tipo: 'moeda', secao: 'Encaminhamento'
    });
    igual(criado.cabecalho, 'Valor negociado');

    const estrutura = chamar('estruturaDaAba_')('BASE_MESA');
    verdadeiro(estrutura.cabecalhos.indexOf('Valor negociado') >= 0,
      'a coluna precisa existir na planilha');

    // E o tipo tem de valer na gravação, não só no cadastro do campo.
    chamar('inserirRegistro_')('BASE_MESA', {
      Analista: 'Ana Martins', 'Valor negociado': 'R$ 2.500,00'
    });
    const gravado = chamar('lerRegistros_("BASE_MESA")').pop();
    igual(gravado['Valor negociado'], 2500, 'chegou como número, não como texto');
  });

  teste('reordenar muda a tela, e não a planilha', () => {
    // Foi reordenando coluna que o sistema anterior corrompeu dado.
    const antes = chamar('estruturaDaAba_')('BASE_MESA').cabecalhos.join('|');
    const campos = chamar('listarCamposDoCanal')(canal.id);
    const invertidos = campos.map((c) => c.id).reverse();

    chamar('reordenarCampos')(canal.id, invertidos);
    igual(chamar('estruturaDaAba_')('BASE_MESA').cabecalhos.join('|'), antes,
      'a planilha não pode ter sido tocada');
    igual(chamar('listarCamposDoCanal')(canal.id)[0].id, invertidos[0],
      'mas a ordem da tela mudou');

    chamar('reordenarCampos')(canal.id, invertidos.reverse());
  });

  teste('reordenar com campo de outro canal é recusado', () => {
    const ret = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');
    const daRet = chamar('listarCamposDoCanal')(ret.id)[0];
    lanca(() => chamar('reordenarCampos')(canal.id, [daRet.id]),
      'não é do canal Mesa Diamante');
  });

  secao('As listas');

  teste('renomear um item em uso é recusado, com o número de casos', () => {
    // Trocar o Nome não renomeia o que já foi gravado: os casos ficariam
    // apontando para um item que não existe mais.
    chamar('inserirRegistro_')('BASE_MESA', {
      Analista: 'Ana Martins', Status: 'Em andamento', 'Nome do segurado': 'Alguém'
    });
    const pendente = chamar('listarCatalogo')('STATUS', canal.id)
      .find((i) => i.nome === 'Em andamento');

    const erro = lanca(() => chamar('salvarItemDoCatalogo')({
      id: pendente.id, tipo: 'STATUS', canalId: canal.id, nome: 'Em aberto'
    }), 'está gravado em');
    contem(erro.message, 'troque o rótulo', 'a saída precisa ser oferecida');
  });

  teste('trocar só o rótulo é livre — é o que aparece na tela', () => {
    const pendente = chamar('listarCatalogo')('STATUS', canal.id)
      .find((i) => i.nome === 'Em andamento');
    chamar('salvarItemDoCatalogo')({
      id: pendente.id, tipo: 'STATUS', canalId: canal.id,
      nome: 'Em andamento', rotulo: 'Aguardando ação', cor: 'atencao'
    });
    igual(chamar('listarCatalogo')('STATUS', canal.id)
      .find((i) => i.nome === 'Em andamento').rotulo, 'Aguardando ação');
  });

  teste('item novo entra na lista e aparece no formulário', () => {
    chamar('salvarItemDoCatalogo')({
      tipo: 'STATUS', canalId: canal.id, nome: 'Em análise jurídica',
      cor: 'violeta', ordem: 7, ativo: true
    });
    const status = chamar('formularioDoCanal')(canal.id)
      .secoes.reduce((soma, s) => soma.concat(s.campos), [])
      .find((c) => c.chave === 'status');
    verdadeiro(status.opcoes.some((o) => o.valor === 'Em análise jurídica'),
      'o item novo precisa aparecer no seletor sem passar por código');
  });

  secao('Níveis de acesso');

  teste('a lista diz quantas pessoas dependem de cada nível', () => {
    const niveis = chamar('listarNiveisDeAcesso()');
    igual(niveis.length, 4);
    igual(niveis.find((n) => n.nome === 'Administrador').pessoas, 1);
    igual(niveis.find((n) => n.nome === 'Operação').pessoas, 1);
    igual(niveis.find((n) => n.nome === 'Consulta').pessoas, 0);
  });

  teste('a pessoa pode não ter canal — é o caso de quem administra', () => {
    // O primeiro usuário, o que instala o sistema, não pertence o canal
    // nenhuma: ele atende as duas e delega. Exigir canal dele obrigaria a
    // inventar uma resposta para uma pergunta que não se aplica.
    const eu = chamar('listarUsuarios()')
      .find((u) => u.email === 'primeiro.adm@exemplo.com');
    igual(eu.canalId, '', 'nasce sem canal');
    igual(eu.canal, '', 'e a tela mostra isso como "todas os canais"');
    igual(eu.administrador, true);
  });

  teste('quem tem canal vem com o nome dela, e não com o Id', () => {
    const ret = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');
    const id = chamar('salvarUsuario')({
      nome: 'Analista da RET', email: 'analista.ret@exemplo.com',
      nivelAcessoId: chamar('lerRegistros_("CATALOGO")')
        .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id,
      canalId: ret.id, ativo: true
    });
    const pessoa = chamar('listarUsuarios()').find((u) => u.id === id);
    igual(pessoa.canalId, ret.id);
    igual(pessoa.canal, 'RET', 'o Id não diz nada a quem lê a tela');
    igual(pessoa.administrador, false);

    // E dá para voltar a não ter canal: a pessoa foi promovida, ou passou a
    // atender as duas.
    chamar('salvarUsuario')({
      id: id, nome: 'Analista da RET', email: 'analista.ret@exemplo.com',
      nivelAcessoId: pessoa.nivelAcessoId, canalId: '', ativo: true
    });
    igual(chamar('listarUsuarios()').find((u) => u.id === id).canal, '');
  });

  teste('canal que não existe é recusada, e diz que dá para deixar em branco', () => {
    lanca(() => chamar('salvarUsuario')({
      nome: 'Canal Fantasma', email: 'fantasma@exemplo.com',
      nivelAcessoId: chamar('lerRegistros_("CATALOGO")')
        .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id,
      canalId: '9999999999', ativo: true
    }), 'não existe mais');
  });

  teste('as datas saem como texto, e não como objeto de data', () => {
    // Elas atravessam a fronteira do google.script.run em JSON. Formatar aqui
    // deixa uma regra só, do lado que conhece o fuso da operação.
    const eu = chamar('listarUsuarios()')
      .find((u) => u.email === 'primeiro.adm@exemplo.com');
    igual(typeof eu.dataCadastro, 'string');
    verdadeiro(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(eu.dataCadastro),
      'formato dd/MM/yyyy HH:mm, achei "' + eu.dataCadastro + '"');
  });

  teste('a tela do cadastro tem os cinco campos que a operação pediu', () => {
    // Os ids são MONTADOS ('cfg-' + nome), então o que se procura é a chamada
    // que os monta — procurar o id pronto passaria sem provar nada.
    const tela = lerTela('Configuracoes.html');
    [["campoDeTexto('nome'", 'Nome'],
     ["campoDeTexto('email'", 'E-mail'],
     ["caixaDeItens('cargo'", 'Cargo'],
     ['caixaDeCanalDaPessoa(', 'Canal'],
     ["caixaDeItens('nivel'", 'Nível de acesso']
    ].forEach((par) => {
      contem(tela, par[0], 'falta o campo "' + par[1] + '" no formulário');
    });
    contem(tela, 'todas os canais',
      'e a opção de não ter canal aparece por escrito');
  });

  teste('tirar Configurações do único nível que a tem é recusado', () => {
    // Sem esta trava, a saída seria editar a planilha na mão — coisa que nem
    // todo mundo sabe fazer sob pressão.
    const administrador = chamar('listarNiveisDeAcesso()')
      .find((n) => n.nome === 'Administrador');
    lanca(() => chamar('salvarNivelDeAcesso')({
      id: administrador.id, nome: 'Administrador', escopo: 'TODOS',
      telas: ['trabalho'], acoes: administrador.acoes
    }), 'deixaria NINGUÉM com acesso a Configurações');
  });

  teste('tirar a estrutura do único nível que a tem também é recusado', () => {
    const administrador = chamar('listarNiveisDeAcesso()')
      .find((n) => n.nome === 'Administrador');
    lanca(() => chamar('salvarNivelDeAcesso')({
      id: administrador.id, nome: 'Administrador', escopo: 'TODOS',
      telas: administrador.telas, acoes: ['criar', 'editar', 'configurar']
    }), 'ninguém podendo mexer na estrutura');
  });

  teste('escopo e ação inventados são recusados, dizendo quais existem', () => {
    const nivel = chamar('listarNiveisDeAcesso()')
      .find((n) => n.nome === 'Operação');
    lanca(() => chamar('salvarNivelDeAcesso')({
      id: nivel.id, nome: 'Operação', escopo: 'GALAXIA',
      telas: ['trabalho'], acoes: ['criar']
    }), 'Escopo desconhecido');
    lanca(() => chamar('salvarNivelDeAcesso')({
      id: nivel.id, nome: 'Operação', escopo: 'PROPRIOS',
      telas: ['trabalho'], acoes: ['voar']
    }), 'Ação desconhecida');
  });

  teste('esconder um campo de um nível vale na hora seguinte', () => {
    const operacao = chamar('listarNiveisDeAcesso()')
      .find((n) => n.nome === 'Operação');
    chamar('salvarNivelDeAcesso')({
      id: operacao.id, nome: 'Operação', escopo: 'PROPRIOS',
      telas: operacao.telas, acoes: operacao.acoes,
      campos: { documentocpf: 'oculto' }
    });

    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      const campos = chamar('formularioDoCanal')(canal.id)
        .secoes.reduce((soma, s) => soma.concat(s.campos), []);
      verdadeiro(!campos.some((c) => c.chave === 'documentocpf'),
        'o campo escondido não pode chegar ao navegador');
    });
  });

  secao('Identidade e segurança');

  teste('a identidade é gravada e volta no pacote de partida', () => {
    chamar('salvarIdentidade')({
      nome: 'RECC', nomeLongo: 'Relacionamento Estratégico de Clientes',
      operacao: 'Porto Seguro', corPrimaria: '#0B77CE',
      plataforma: 'PGO — Prisma Gestão Operacional', fabricante: 'by Pelitero labs'
    });
    igual(chamar('pacoteDePartida()').identidade.nomeLongo,
      'Relacionamento Estratégico de Clientes');
  });

  teste('sistema sem nome e cor fora do formato são recusados', () => {
    lanca(() => chamar('salvarIdentidade')({ nome: '' }), 'precisa de um nome');
    lanca(() => chamar('salvarIdentidade')({ nome: 'RECC', corPrimaria: 'azul' }),
      '#RRGGBB');
  });

  teste('a logo aceita endereço e imagem embutida, e recusa o resto', () => {
    chamar('definirLogo')('https://exemplo.com/porto.png');
    igual(chamar('lerIdentidadeVisual_()').logo, 'https://exemplo.com/porto.png');

    chamar('definirLogo')('data:image/png;base64,iVBORw0KGgo=');
    contem(chamar('lerIdentidadeVisual_()').logo, 'data:image/png');

    lanca(() => chamar('definirLogo')('C:\\Users\\eu\\porto.png'), 'endereço https');
    chamar('definirLogo')('');
  });

  secao('A estrutura da planilha');

  teste('o laudo mostra o que falta e o que apareceu, sem consertar', () => {
    const aba = ambiente.planilha.getSheetByName('SUSEP_BLOQUEADAS');
    const onde = chamar('posicaoDaColuna_')(
      chamar('estruturaDaAba_')('SUSEP_BLOQUEADAS'), 'CoordenadorComercial') + 1;
    aba.getRange(1, onde).setValue('');
    chamar('esquecerEstruturaLida_()');

    const laudo = chamar('conferirEstruturaDaPlanilha()');
    igual(laudo.ok, false);
    const bloqueadas = laudo.abas.find((a) => a.aba === 'SUSEP_BLOQUEADAS');
    igual(bloqueadas.faltando.join(','), 'CoordenadorComercial');

    aba.getRange(1, onde).setNumberFormat('@');
    aba.getRange(1, onde).setValue('CoordenadorComercial');
    chamar('esquecerEstruturaLida_()');
  });

  teste('a coluna criada pelo administrador consta como fora do contrato', () => {
    const canal4 = chamar('conferirEstruturaDaPlanilha()').abas
      .find((a) => a.aba === 'BASE_MESA');
    verdadeiro(canal4.aMais.indexOf('Valor negociado') >= 0,
      'coluna nova é respeitada, e o laudo diz que ela não é do contrato');
    igual(canal4.faltando.length, 0);
  });

  secao('Níveis — o que a tela oferece');

  teste('as telas oferecidas são as MESMAS que o menu percorre', () => {
    const opcoes = chamar('opcoesDeNivelDeAcesso()');
    const doMenu = chamar('RECC_TELAS_DO_SISTEMA').map((t) => t.tela);

    // A Produtividade RECC sai desta lista porque tem seletor PRÓPRIO — ela
    // liga, desliga e escolhe o alcance num lugar só. Duas caixas para a mesma
    // tela é como alguém desliga a metade e jura que desligou.
    //
    // O que o teste continua cobrando é que NENHUMA OUTRA falte: duas listas
    // divergindo é como uma tela nova nasce inacessível.
    const esperadas = doMenu.filter((tela) => tela !== 'produtividade');
    igual(opcoes.telas.map((t) => t.chave).join(','), esperadas.join(','),
      'duas listas de telas divergiriam, e a tela nova nasceria inacessível');

    verdadeiro(opcoes.produtividade !== undefined,
      'e a Produtividade tem o seletor dela, com os alcances');
    igual(opcoes.produtividade.opcoes.map((o) => o.chave).join(','),
      'BLOQUEADO,PROPRIOS,EQUIPE,CANAL');
    verdadeiro(opcoes.produtividade.opcoes.every((o) => o.descricao.length > 10),
      'cada alcance explica o que faz');
    igual(opcoes.acoes.length, 7);
    igual(opcoes.escopos.length, 4);
    opcoes.acoes.forEach((acao) => {
      verdadeiro(acao.descricao.length > 10,
        'toda ação explica o que faz: "estrutura" não diz nada sozinho');
    });
  });

  secao('Canais de trabalho');

  teste('o canal vem com as colunas da base, para não digitar nome à mão', () => {
    const canais = chamar('listarCanaisConfiguraveis()');
    igual(canais.length, chamar('lerRegistros_("CANAIS")').length,
      'a tela lista todos os canais da aba, sem perder nenhum');
    const diamante = canais.find((m) => m.aba === 'BASE_MESA');
    verdadeiro(diamante.abaExiste);
    verdadeiro(diamante.colunasDaBase.indexOf('Status') >= 0);
    verdadeiro(diamante.colunasDaBase.every((c) => c.charAt(0) !== '_'),
      'as colunas de controle não são para escolher');
    verdadeiro(diamante.situacoes.indexOf('Concluído') >= 0);
  });

  teste('coluna que não existe é recusada, dizendo quais existem', () => {
    const erro = lanca(() => chamar('salvarCanal')({
      id: canal.id, nome: 'Mesa Diamante', colunaDoStatus: 'Sittuação'
    }), 'não existe na aba');
    contem(erro, 'Status', 'o recado lista as colunas de verdade');
  });

  teste('trocar a aba de um canal é recusado — os casos moram nela', () => {
    lanca(() => chamar('salvarCanal')({
      id: canal.id, nome: 'Mesa Diamante', aba: 'BASE_RET'
    }), 'não muda por aqui');
  });

  teste('desligar a último canal ativa é recusado', () => {
    /*
     * O teste desligava UM canal e esperava que o segundo fosse recusado —
     * premissa de quando o sistema tinha exatamente dois. No dia em que o VG
     * nasceu ele passou a desligar dois e deixar um de pé, a recusa não veio,
     * e a Mesa ficou DESLIGADA para os testes seguintes: quatro falharam
     * depois com "canal não existe ou está desativado", apontando para longe
     * daqui.
     *
     * Agora desliga TODOS menos um, seja lá quantos existam, e cobra a recusa
     * no último. É a regra de verdade, e ela continua valendo no quarto canal.
     */
    const todos = chamar('listarCanaisConfiguraveis()');
    const comoEstavam = todos.map((um) => ({
      id: um.id, nome: um.nome, ordem: um.ordem,
      colunaDaData: um.colunaDaData, colunaDaHora: um.colunaDaHora,
      colunaDoStatus: um.colunaDoStatus, colunasDaFila: um.colunasDaFila,
      cartoesDoPainel: um.cartoesDoPainel,
      colunaDaFinalizacao: um.colunaDaFinalizacao,
      colunaDaAreaResponsavel: um.colunaDaAreaResponsavel,
      ativo: um.ativo
    }));

    // Desliga todos menos o último da lista — e guarda quais foram.
    const desligados = comoEstavam.slice(0, -1).filter((um) => um.ativo);
    desligados.forEach((um) => {
      chamar('salvarCanal')(Object.assign({}, um, { ativo: false }));
    });

    const ultimo = comoEstavam[comoEstavam.length - 1];
    lanca(() => chamar('salvarCanal')(Object.assign({}, ultimo, { ativo: false })),
      'último canal ativa');

    // Religa SÓ o que este teste desligou. Regravar os outros "por garantia"
    // enche a auditoria de linhas que não aconteceram — e empurra para fora da
    // janela as que outro teste vai procurar. Foi o que aconteceu aqui.
    desligados.forEach((um) => { chamar('salvarCanal')(um); });
  });

  teste('mexer nos cartões muda o painel na hora seguinte', () => {
    const painel = chamar('listarCardsDoPainel')('trabalho', canal.id);
    // "O que contar" oferece o total, cada situação do canal e, quando ela
    // declara as colunas, os finalizados na célula.
    verdadeiro(painel.oQueContar.some((o) => o.chave === 'total'));
    verdadeiro(painel.oQueContar.some((o) => o.chave === 'naCelula'));

    chamar('salvarCardsDoPainel')('trabalho', canal.id, [
      { titulo: 'Só o que falta fazer', dimensao: 'situacao',
        filtro: 'Em andamento', cor: 'ruim', mostrar: true }
    ]);

    const cartoes = chamar('resumoDoCanal')(canal.id, {}).cartoes;
    igual(cartoes.length, 1);
    igual(cartoes[0].rotulo, 'Só o que falta fazer',
      'o nome do cartão é livre — não precisa ser o nome da situação');
    igual(cartoes[0].tom, 'ruim');

    // E o que foi tirado da tela não sumiu da planilha: volta inteiro.
    chamar('salvarCardsDoPainel')('trabalho', canal.id, painel.cartoes);
    igual(chamar('resumoDoCanal')(canal.id, {}).cartoes.length,
      painel.cartoes.length);
  });

  teste('os cartões da Produtividade RECC se editam pela mesma máquina', () => {
    // A tela é outra, a lista é outra, o código é o mesmo. Duas máquinas para
    // a mesma coisa seriam duas para consertar quando uma delas errasse.
    const doTrabalho = chamar('listarCardsDoPainel')('trabalho', canal.id);
    const daProdutividade = chamar('listarCardsDoPainel')('produtividade', canal.id);

    igual(daProdutividade.tela, 'produtividade');
    verdadeiro(daProdutividade.cartoes.length > 0,
      'a Produtividade RECC nasce com cartões próprios');
    verdadeiro(doTrabalho.cartoes.map((c) => c.titulo).join() !==
      daProdutividade.cartoes.map((c) => c.titulo).join(),
      'as duas listas não podem ser a mesma');

    // Mexer numa não mexe na outra. A conta é feita sobre o que a TELA desenha,
    // e não sobre o que o editor lista: o editor mostra de propósito também os
    // cartões desligados, para dar como religá-los, então a lista dele não
    // encurta quando um cartão sai de cena.
    const naTela = () => chamar('produtividadeDaEquipe')(canal.id, {}, 30).cartoes.length;
    const noTrabalho = () => chamar('resumoDoCanal')(canal.id, {}).cartoes.length;
    const cardsDoTrabalhoAntes = noTrabalho();

    chamar('salvarCardsDoPainel')('produtividade', canal.id, [
      { titulo: 'Só isto', dimensao: 'total', filtro: '', cor: 'bom', mostrar: true }
    ]);
    igual(naTela(), 1, 'a Produtividade RECC ficou com um cartão');
    igual(noTrabalho(), cardsDoTrabalhoAntes, 'os cards do Trabalho ficaram intactos');

    chamar('salvarCardsDoPainel')('produtividade', canal.id,
      daProdutividade.cartoes);
    igual(naTela(), daProdutividade.cartoes.length, 'e volta inteiro');
  });

  teste('"já passaram por" é oferecido por status que carimba', () => {
    // A opção existe porque a coluna existe. Oferecer uma contagem sobre coluna
    // que não está na base criaria um cartão que nunca aparece, e quem o
    // criasse ia jurar que salvou.
    const opcoes = chamar('listarCardsDoPainel')('produtividade', canal.id).oQueContar;
    const porCarimbo = opcoes.filter((o) => o.chave === 'preenchido');
    verdadeiro(porCarimbo.length > 0, 'a Mesa Diamante carimba a finalização');
    verdadeiro(porCarimbo.every((o) => o.rotulo.indexOf('Já passaram por: ') === 0),
      'o rótulo diz que é jornada, e não estado de hoje');
    verdadeiro(porCarimbo.every((o) => o.filtro), 'cada uma aponta para uma coluna');
  });

  teste('cartão por carimbo apontando para coluna inexistente é recusado', () => {
    lanca(() => chamar('salvarCardsDoPainel')('produtividade', canal.id, [
      { titulo: 'Já contatados', dimensao: 'preenchido',
        filtro: 'Coluna que nunca existiu', cor: 'bom', mostrar: true }
    ]), 'não existe', 'recusar na hora de salvar, e não na hora de desenhar');
  });

  secao('A tela');

  teste('a página inclui a tela, e a rota chama ela', () => {
    contem(lerTela('Index.html'), "incluir('Configuracoes')",
      'tela fora do Index não existe para o Apps Script');
    const rotas = lerTela('Aplicacao.html');
    contem(rotas, 'TelaConfiguracoes.montar(pacote)');
    contem(rotas, 'TelaConfiguracoes.desligar()',
      'sair da tela precisa fechar o diálogo da senha');
  });

  teste('a tela monta as três colunas e escolhe a primeiro canal sozinha', () => {
    const { TelaConfiguracoes } = carregarTelas(['Moldura', 'Configuracoes']);
    const casca = TelaConfiguracoes.montar(chamar('pacoteDePartida()'));
    contem(casca, 'id="config"');
    contem(casca, 'Abrindo as configurações',
      'a tela avisa que está carregando em vez de ficar branca');
  });

  teste('toda função que QUALQUER tela chama existe e confere quem chama', () => {
    // Antes esta conferência olhava só a Configuracoes.html, e a razão de ela
    // ter crescido é simples: o risco não é dessa tela, é do ACOPLAMENTO — a
    // tela chama o servidor pelo NOME, em texto. Renomear no servidor não
    // quebra nada até alguém clicar no botão, semanas depois.
    const pastaDasTelas = path.join(__dirname, '..', '..', 'Front-End');
    const pastaDoServidor = path.join(__dirname, '..', '..', 'Back-End');

    // TODOS os arquivos do servidor, e não uma lista escrita à mão: a lista
    // fica desatualizada no dia em que nasce um arquivo novo.
    const servidor = fs.readdirSync(pastaDoServidor)
      .filter((nome) => nome.endsWith('.gs'))
      .map((nome) => fs.readFileSync(path.join(pastaDoServidor, nome), 'utf8'))
      .join('\n');

    const chamadas = {};
    fs.readdirSync(pastaDasTelas)
      .filter((nome) => nome.endsWith('.html'))
      .forEach((arquivo) => {
        const tela = fs.readFileSync(path.join(pastaDasTelas, arquivo), 'utf8');
        (tela.match(/Servidor\.chamar\('([a-zA-Z0-9_]+)'/g) || []).forEach((achado) => {
          const nome = achado.replace("Servidor.chamar('", '').replace("'", '');
          if (!chamadas[nome]) chamadas[nome] = [];
          if (chamadas[nome].indexOf(arquivo) < 0) chamadas[nome].push(arquivo);
        });
      });

    const nomes = Object.keys(chamadas);
    verdadeiro(nomes.length >= 60,
      'as telas conversam com o servidor em muitas frentes, achei ' + nomes.length);

    const semFuncao = [];
    const semGuarda = [];
    nomes.forEach((nome) => {
      const inicio = servidor.indexOf('function ' + nome + '(');
      if (inicio < 0) {
        semFuncao.push(nome + ' (em ' + chamadas[nome].join(', ') + ')');
        return;
      }
      const corpo = servidor.substring(inicio, inicio + 900);
      if (corpo.indexOf('exigirPermissao_') < 0
        && corpo.indexOf('exigirTela_') < 0
        && corpo.indexOf('usuarioAtual_') < 0) {
        semGuarda.push(nome);
      }
    });

    igual(semFuncao.join(' | '), '', 'a tela chama função que não existe');
    igual(semGuarda.join(' | '), '', 'função chamada pela tela sem conferir quem chama');
  });

  teste('toda chamada ao servidor trata a falha — senão a tela trava no "carregando"', () => {
    // Sem .senao, o erro vai só para o console e a tela fica parada na
    // mensagem de carregamento para sempre. O sintoma não tem nada a ver com
    // a causa, e é o pior tipo de defeito para diagnosticar de longe.
    const pastaDasTelas = path.join(__dirname, '..', '..', 'Front-End');

    // Da palavra 'Servidor.chamar' até o ';' que fecha a instrução, contando
    // parênteses e chaves — a chamada quase sempre ocupa várias linhas.
    function instrucaoInteira(texto, comeco) {
      let prof = 0;
      for (let i = comeco; i < texto.length; i++) {
        const c = texto[i];
        if (c === "'" || c === '"') {
          const aspa = c;
          i++;
          while (i < texto.length && texto[i] !== aspa) {
            if (texto[i] === '\\') i++;
            i++;
          }
        } else if ('([{'.indexOf(c) >= 0) prof++;
        else if (')]}'.indexOf(c) >= 0) {
          prof--;
          if (prof < 0) return texto.substring(comeco, i);
        } else if (c === ';' && prof === 0) return texto.substring(comeco, i + 1);
      }
      return texto.substring(comeco);
    }

    const semTratamento = [];
    let total = 0;
    fs.readdirSync(pastaDasTelas)
      .filter((nome) => nome.endsWith('.html'))
      .forEach((arquivo) => {
        const tela = fs.readFileSync(path.join(pastaDasTelas, arquivo), 'utf8');
        const busca = /Servidor\.chamar\('([a-zA-Z0-9_]+)'/g;
        let achado;
        while ((achado = busca.exec(tela)) !== null) {
          total++;
          const instrucao = instrucaoInteira(tela, achado.index);
          if (instrucao.indexOf('.senao(') < 0) {
            const linha = tela.substring(0, achado.index).split('\n').length;
            semTratamento.push(arquivo + ':' + linha + ' ' + achado[1]);
          }
        }
      });

    verdadeiro(total >= 60, 'achei ' + total + ' chamadas ao servidor');
    igual(semTratamento.join(' | '), '', 'chamadas sem .senao');
  });

  teste('o menu da lateral vai em branco, como a operação aprovou', () => {
    const estilos = lerTela('Estilos.html');
    ['padrao', 'rosa', 'brasil'].forEach((tema) => {
      const marca = estilos.indexOf(tema === 'padrao'
        ? ':root, :root[data-tema="padrao"] {'
        : ':root[data-tema="' + tema + '"] {');
      verdadeiro(marca >= 0, 'falta o bloco do tema ' + tema);
      const bloco = estilos.substring(marca, estilos.indexOf('}', marca));
      contem(bloco, '--lateral-texto: #FFFFFF',
        'no tema ' + tema + ' o texto do menu é branco sobre o fundo saturado');
    });
  });

  secao('Auditoria');

  teste('a trilha mostra o que foi feito, e por quem', () => {
    const trilha = chamar('listarAuditoria')(20);
    verdadeiro(trilha.length > 0);
    igual(trilha[0].quem, 'primeiro.adm', 'a mais recente vem primeiro');
    verdadeiro(trilha.some((l) => l.acao === 'campo.criar'));
    verdadeiro(trilha.some((l) => l.acao === 'nivel.editar'));
    verdadeiro(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(trilha[0].dataHora),
      'a data vem formatada, veio ' + trilha[0].dataHora);
  });

  /*
   * ==========================================================================
   * EXCLUIR CAMPO — pedido do PO: "devo conseguir excluir definitivamente"
   * ==========================================================================
   * Estes testes ficam NO FIM do arquivo de propósito. Eles APAGAM campo e
   * apagam coluna; posto no meio, um deles mudaria a contagem de campos que
   * meia dúzia de testes acima confere, e a falha apareceria longe da causa.
   * Já aconteceu, com os testes de importação.
   * ==========================================================================
   */
  secao('O custo de abrir Cadastrar Caso');

  teste('listar os campos não custa uma ida ao serviço POR CAMPO', () => {
    /*
      A DEMORA QUE A OPERAÇÃO RELATOU, e a função que a causava.

      `listarCamposDoCanal` chamava `quemApontaParaAColuna_` uma vez por campo,
      e cada chamada relia a aba CANAIS e o CATÁLOGO inteiro. Com os 48 campos
      da RET eram 98 idas ao serviço. No Apps Script cada ida custa cerca de
      25 ms de pedágio — dois segundos e meio parado, só para a tela abrir.

      O número não aparece lendo `quemApontaParaAColuna_`: ela é barata sozinha.
      Aparece no LAÇO em volta dela, e é por isso que este teste conta IDAS e
      não milissegundos. Medir o relógio do Node não diria nada sobre o Apps
      Script; medir as idas diz tudo.
    */
    const daRet = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');

    chamar('esquecerEstruturaLida_')();
    const antes = ambiente.medidor.idasParaLer + ambiente.medidor.idasParaGravar;
    const campos = chamar('listarCamposDoCanal')(daRet.id);
    const idas = ambiente.medidor.idasParaLer + ambiente.medidor.idasParaGravar - antes;

    verdadeiro(campos.length > 30,
      'esperava a lista cheia da RET, veio ' + campos.length);

    // O limite é por LISTA, não por campo: sobe se alguém acrescentar uma
    // leitura fixa, e estoura na hora em que uma leitura voltar para dentro do
    // laço — que é exatamente o defeito que este teste existe para pegar.
    verdadeiro(idas < 15,
      'abrir Cadastrar Caso custou ' + idas + ' idas ao serviço para '
      + campos.length + ' campos. Mais de uma dezena quer dizer que voltou a '
      + 'haver leitura DENTRO do laço dos campos — leia uma vez antes e passe '
      + 'em `jaLido`.');

    // E a informação continua certa: é o que impede "otimizar" devolvendo
    // lista vazia.
    const status = campos.find((c) => c.cabecalho === 'status');
    verdadeiro(status.usadoPeloCanal.indexOf('Coluna do status') >= 0,
      'o campo do status continua dizendo que o canal aponta para ele');
  });

  teste('quem chama uma vez só continua funcionando sem o `jaLido`', () => {
    // `excluirCampo` chama a função uma vez, sem passar nada. Ela tem de ler
    // por conta dela — senão a recusa do excluir pararia de dizer o motivo.
    const daRet = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    const apontando = chamar('quemApontaParaAColuna_')(daRet, 'status');
    verdadeiro(apontando.indexOf('Coluna do status') >= 0,
      'sem jaLido, a função lê sozinha e responde igual');
  });

  secao('Excluir campo de vez');

  teste('campo que eu criei sai do sistema, e a coluna fica na planilha', () => {
    chamar('liberarComSenha')('segredo123');
    const criado = chamar('criarCampo')(canal.id, { rotulo: 'Para excluir' });
    igual(criado.cabecalho, 'Para excluir');

    // Com dado dentro, para a conferência valer: o que se promete é que a
    // coluna e o conteúdo dela continuam lá.
    chamar('inserirRegistro_')('BASE_MESA', {
      Analista: 'Ana Martins', 'Para excluir': 'não me apague'
    });

    const campo = chamar('listarCamposDoCanal')(canal.id)
      .find((um) => um.cabecalho === 'Para excluir');
    verdadeiro(campo !== undefined, 'o campo precisa existir antes de sair');

    chamar('liberarComSenha')('segredo123');
    const saiu = chamar('excluirCampo')(canal.id, campo.id, false);
    igual(saiu.colunaApagada, false);

    verdadeiro(!chamar('listarCamposDoCanal')(canal.id)
      .some((um) => um.cabecalho === 'Para excluir'),
      'o campo não pode mais aparecer na lista');
    verdadeiro(chamar('estruturaDaAba_')('BASE_MESA').cabecalhos
      .indexOf('Para excluir') >= 0,
      'mas a coluna fica: desmarcado, nada é apagado da planilha');
    igual(chamar('lerRegistros_("BASE_MESA")').pop()['Para excluir'],
      'não me apague', 'e o que estava gravado continua gravado');
  });

  teste('marcando a caixa, a coluna sai da aba e o dado vai com ela', () => {
    chamar('liberarComSenha')('segredo123');
    chamar('criarCampo')(canal.id, { rotulo: 'Some comigo' });
    chamar('inserirRegistro_')('BASE_MESA', {
      Analista: 'Ana Martins', 'Some comigo': 'vai embora'
    });

    const campo = chamar('listarCamposDoCanal')(canal.id)
      .find((um) => um.cabecalho === 'Some comigo');

    chamar('liberarComSenha')('segredo123');
    const saiu = chamar('excluirCampo')(canal.id, campo.id, true);
    igual(saiu.colunaApagada, true);
    igual(saiu.linhasComValor, 1,
      'o recado diz quantos valores foram embora — é o único vestígio');

    verdadeiro(chamar('estruturaDaAba_')('BASE_MESA').cabecalhos
      .indexOf('Some comigo') < 0, 'a coluna saiu da aba');
  });

  teste('sai a coluna PEDIDA, e só ela — a vizinha fica inteira', () => {
    /*
     * A conferência é "qual coluna saiu", e não "o dado escorregou".
     *
     * Escorregar não é possível aqui: `lerRegistros_` lê por CABEÇALHO, e o
     * cabeçalho sai junto com a coluna — o dado nunca troca de nome. O risco
     * real é outro e mais banal: errar a posição por um e apagar a coluna
     * VIZINHA, que é exatamente o que um `posicao` em vez de `posicao + 1`
     * faz, porque a lista de cabeçalhos começa em 0 e a planilha em 1.
     *
     * Por isso o teste cobra as duas metades: a pedida saiu, a vizinha ficou,
     * e o que estava escrito nela continua escrito.
     */
    chamar('liberarComSenha')('segredo123');
    chamar('criarCampo')(canal.id, { rotulo: 'Do meio' });
    chamar('criarCampo')(canal.id, { rotulo: 'Depois do meio' });
    chamar('inserirRegistro_')('BASE_MESA', {
      Analista: 'Zoro Testador', 'Do meio': 'eu saio',
      'Depois do meio': 'eu fico'
    });

    const doMeio = chamar('listarCamposDoCanal')(canal.id)
      .find((um) => um.cabecalho === 'Do meio');
    chamar('liberarComSenha')('segredo123');
    chamar('excluirCampo')(canal.id, doMeio.id, true);

    const cabecalhos = chamar('estruturaDaAba_')('BASE_MESA').cabecalhos;
    verdadeiro(cabecalhos.indexOf('Do meio') < 0, 'a coluna pedida saiu');
    verdadeiro(cabecalhos.indexOf('Depois do meio') >= 0,
      'e a vizinha ficou: errar a posição por um apagaria a coluna errada');

    const linha = chamar('lerRegistros_("BASE_MESA")')
      .filter((um) => String(um.Analista) === 'Zoro Testador').pop();
    igual(linha['Depois do meio'], 'eu fico',
      'com o que estava escrito nela');
  });

  teste('campo do contrato é recusado, e o recado ensina o que fazer', () => {
    // Quase toda coluna das bases é do contrato: é ela que o relatório junta.
    // Recusar sem explicar faria a pessoa achar que é falta de permissão.
    const protegido = chamar('listarCamposDoCanal')(canal.id)
      .find((um) => um.protegido);
    verdadeiro(protegido !== undefined, 'o canal precisa ter campo protegido');

    chamar('liberarComSenha')('segredo123');
    const erro = lanca(() => chamar('excluirCampo')(canal.id, protegido.id, false),
      'contrato da aba');
    contem(erro.message, 'Aparece no formulário',
      'o recado precisa dizer o caminho que FUNCIONA, e não só o que não dá');
  });

  teste('coluna que o canal aponta é recusada, dizendo qual ajuste a usa', () => {
    /*
     * O caso perigoso. A coluna do status pode não ser protegida — e apagá-la
     * deixaria o Trabalho sem o chão dele: sem cartão, sem situação, sem
     * troca de status. O sistema não quebraria na hora da exclusão; quebraria
     * amanhã, na tela de quem trabalha.
     */
    chamar('liberarComSenha')('segredo123');
    const criado = chamar('criarCampo')(canal.id, { rotulo: 'Situação de teste' });
    const comoEstava = chamar('lerRegistros_("CANAIS")')
      .find((um) => String(um.Id) === String(canal.id)).ColunaDoStatus;
    chamar('atualizarRegistro_')('CANAIS', canal.id,
      { ColunaDoStatus: 'Situação de teste' });
    chamar('esquecerEstruturaLida_')();

    const campo = chamar('listarCamposDoCanal')(canal.id)
      .find((um) => um.cabecalho === 'Situação de teste');
    igual(campo.usadoPeloCanal.join(', '), 'Coluna do status',
      'a lista já diz onde a coluna é usada, para a tela explicar ANTES');

    chamar('liberarComSenha')('segredo123');
    const erro = lanca(() => chamar('excluirCampo')(canal.id, campo.id, true),
      'Coluna do status');
    contem(erro.message, 'Canais de trabalho', 'e diz onde trocar a referência');

    verdadeiro(chamar('estruturaDaAba_')('BASE_MESA').cabecalhos
      .indexOf('Situação de teste') >= 0,
      'recusado é recusado: a coluna não pode ter saído antes do erro');

    // Devolve o canal ao que era e tira o campo de teste, para não deixar a
    // configuração do canal apontando para uma coluna de teste.
    chamar('atualizarRegistro_')('CANAIS', canal.id,
      { ColunaDoStatus: comoEstava });
    chamar('esquecerEstruturaLida_')();
    chamar('liberarComSenha')('segredo123');
    chamar('excluirCampo')(canal.id, campo.id, true);
    igual(criado.cabecalho, 'Situação de teste');
  });

  teste('o carimbo de um status também segura a exclusão da coluna', () => {
    /*
     * O mais silencioso de todos. Um status com carimbo apontando para uma
     * coluna que não existe mais não dá erro NENHUM: o caso muda de status, o
     * carimbo não é escrito, e a produtividade conta menos do que aconteceu.
     * Foi exatamente assim que o achado 43 apareceu — pela tela, semanas
     * depois.
     */
    chamar('liberarComSenha')('segredo123');
    chamar('criarCampo')(canal.id, { rotulo: 'Data de teste', tipo: 'dataHora' });

    const status = chamar('lerRegistros_("CATALOGO")').find((item) =>
      String(item.Tipo) === 'STATUS'
      && String(item.CanalId) === String(canal.id));
    verdadeiro(status !== undefined, 'o canal precisa ter status para carimbar');
    const carimboAntigo = status.ColunaDeCarimbo;
    chamar('atualizarRegistro_')('CATALOGO', status.Id,
      { ColunaDeCarimbo: 'Data de teste' });

    const campo = chamar('listarCamposDoCanal')(canal.id)
      .find((um) => um.cabecalho === 'Data de teste');
    contem(campo.usadoPeloCanal.join(', '), 'carimbo do status');

    chamar('liberarComSenha')('segredo123');
    lanca(() => chamar('excluirCampo')(canal.id, campo.id, true), 'carimbo do status');

    chamar('atualizarRegistro_')('CATALOGO', status.Id,
      { ColunaDeCarimbo: carimboAntigo });
    chamar('liberarComSenha')('segredo123');
    chamar('excluirCampo')(canal.id, campo.id, true);
  });

  teste('quem não administra não exclui campo nenhum', () => {
    const algum = chamar('listarCamposDoCanal')(canal.id)[0];
    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      lanca(() => chamar('excluirCampo')(canal.id, algum.id, false), 'não permite');
    });
  });

  teste('a exclusão fica na trilha, dizendo se a coluna foi com ela', () => {
    // Sem desfazer, a trilha é o único lugar onde "havia um campo chamado X"
    // continua escrito. Sem ela, alguém vai jurar que o campo nunca existiu.
    const trilha = chamar('listarAuditoria')(60);
    const comColuna = trilha.filter((linha) => linha.acao === 'campo.excluir'
      && String(linha.detalhe || '').indexOf('coluna apagada') >= 0);
    const semColuna = trilha.filter((linha) => linha.acao === 'campo.excluir'
      && String(linha.detalhe || '').indexOf('continua na planilha') >= 0);
    verdadeiro(comColuna.length > 0, 'falta o registro da exclusão COM a coluna');
    verdadeiro(semColuna.length > 0, 'falta o registro da exclusão SEM a coluna');
  });

  /*
   * ==========================================================================
   * CRIAR NÍVEL — pedido do PO: "não consigo cadastrar novos níveis de acesso"
   * ==========================================================================
   * Ficam no FIM pelo mesmo motivo dos testes de excluir campo: eles
   * ACRESCENTAM nível, e um teste acima confere quantos níveis existem.
   * ==========================================================================
   */
  secao('Criar nível de acesso');

  teste('nível novo nasce da mesma função que edita, e já aparece na lista', () => {
    const antes = chamar('listarNiveisDeAcesso()').length;

    const id = chamar('salvarNivelDeAcesso')({
      nome: 'Supervisão de teste', escopo: 'EQUIPE',
      telas: ['trabalho', 'buscarCaso'], acoes: ['criar', 'editar'],
      escopoNaProdutividade: 'EQUIPE'
    });
    verdadeiro(String(id) !== '', 'criar devolve o Id do nível novo');

    const lista = chamar('listarNiveisDeAcesso()');
    igual(lista.length, antes + 1);

    const criado = lista.find((um) => um.nome === 'Supervisão de teste');
    verdadeiro(criado !== undefined, 'o nível novo tem de aparecer na lista');
    igual(criado.escopo, 'EQUIPE');
    igual(criado.pessoas, 0, 'nível novo não tem gente');
    igual(criado.telas.indexOf('produtividade') >= 0, true,
      'alcance diferente de BLOQUEADO põe a tela, igual na edição');
    igual(lista[lista.length - 1].nome, 'Supervisão de teste',
      'e nasce no FIM da ordem, não misturado com os antigos');
  });

  teste('a pessoa cadastrada no nível novo entra com o que ele permite', () => {
    // Criar o nível e ninguém conseguir usá-lo seria meio caminho. A prova é
    // alguém entrar por ele.
    const nivel = chamar('listarNiveisDeAcesso()')
      .find((um) => um.nome === 'Supervisão de teste');
    chamar('salvarUsuario')({
      nome: 'Nami Supervisora', email: 'nami@exemplo.com',
      nivelAcessoId: nivel.id, ativo: true
    });

    comoUsuario(ambiente, 'nami@exemplo.com', () => {
      const partida = chamar('pacoteDePartida()');
      igual(partida.disponivel, true, 'ela precisa conseguir entrar');
      igual(partida.usuario.nivelAcesso, 'Supervisão de teste');
      verdadeiro(partida.menu.some((uma) => uma.tela === 'trabalho'),
        'o Trabalho abre, que é o que o nível marcou');
      verdadeiro(!partida.menu.some((uma) => uma.tela === 'configuracoes'),
        'e Configurações não, que é o que ele NÃO marcou');
    });
  });

  teste('nome repetido é recusado — nível é equipe, e equipe precisa de nome', () => {
    const erro = lanca(() => chamar('salvarNivelDeAcesso')({
      nome: 'Supervisão de teste', escopo: 'PROPRIOS',
      telas: ['trabalho'], acoes: ['criar']
    }), 'Já existe um nível chamado');
    contem(erro.message, 'equipe',
      'o recado precisa dizer POR QUE o nome repetido incomoda');

    // E não é só o nome igualzinho: a comparação ignora acento e caixa, como
    // todo o resto do sistema.
    lanca(() => chamar('salvarNivelDeAcesso')({
      nome: 'SUPERVISAO DE TESTE', escopo: 'PROPRIOS',
      telas: ['trabalho'], acoes: ['criar']
    }), 'Já existe um nível chamado');
  });

  teste('nível sem nome é recusado, dizendo para que o nome serve', () => {
    const erro = lanca(() => chamar('salvarNivelDeAcesso')({
      nome: '   ', escopo: 'PROPRIOS', telas: ['trabalho'], acoes: ['criar']
    }), 'Dê um nome ao nível');
    contem(erro.message, 'EQUIPE');
  });

  teste('criar com escopo ou ação inventados é recusado igual à edição', () => {
    // A trava não pode valer só no caminho da edição: se criar validasse
    // menos, bastaria criar o nível errado em vez de editar um certo.
    lanca(() => chamar('salvarNivelDeAcesso')({
      nome: 'Nível torto', escopo: 'GALAXIA',
      telas: ['trabalho'], acoes: ['criar']
    }), 'Escopo desconhecido');
    lanca(() => chamar('salvarNivelDeAcesso')({
      nome: 'Nível torto', escopo: 'PROPRIOS',
      telas: ['trabalho'], acoes: ['voar']
    }), 'Ação desconhecida');
    lanca(() => chamar('salvarNivelDeAcesso')({
      nome: 'Nível torto', escopo: 'PROPRIOS',
      telas: ['trabalho'], acoes: ['criar'], escopoNaProdutividade: 'SEI_LA'
    }), 'Alcance desconhecido');
    lanca(() => chamar('salvarNivelDeAcesso')({
      nome: 'Nível torto', escopo: 'PROPRIOS',
      telas: ['trabalho'], acoes: ['criar'], canais: ['9999999999']
    }), 'não existe mais');

    verdadeiro(!chamar('listarNiveisDeAcesso()').some((um) => um.nome === 'Nível torto'),
      'recusado é recusado: nada do nível torto pode ter ficado gravado');
  });

  teste('quem não configura não cria nível, nem chamando direto', () => {
    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      lanca(() => chamar('salvarNivelDeAcesso')({
        nome: 'Pela porta dos fundos', escopo: 'TODOS',
        telas: ['configuracoes'], acoes: ['configurar', 'estrutura']
      }), 'não permite');
    });
  });

  teste('a criação fica na trilha, separada da edição', () => {
    const trilha = chamar('listarAuditoria')(60);
    verdadeiro(trilha.some((linha) => linha.acao === 'nivel.criar'),
      'sem "nivel.criar" na trilha, nível que apareceu do nada não tem autor');
  });

  /*
   * ==========================================================================
   * CRIAR CANAL — pedido do PO: "devo conseguir cadastrar novos canais"
   * ==========================================================================
   * No FIM do arquivo, como os outros que escrevem: eles criam ABA, e meia
   * dúzia de testes acima conta quantos canais e quantas abas existem.
   * ==========================================================================
   */
  secao('Criar canal de trabalho');

  teste('canal novo nasce com a aba, a coluna id e as de controle', () => {
    chamar('liberarComSenha')('segredo123');
    const criado = chamar('criarCanal')({
      nome: 'Auto Frota', descricao: 'Piloto de teste', icone: 'escudo'
    });

    igual(criado.aba, 'BASE_AUTO_FROTA',
      'a aba nasce com prefixo BASE_ e o nome sem acento nem espaço');
    verdadeiro(criado.abaAproveitada === false);

    const cabecalhos = chamar('estruturaDaAba_')(criado.aba).cabecalhos;
    igual(cabecalhos.join('|'),
      'id|_Visivel|_ExcluidoEm|_ExcluidoPor|_Origem',
      'só o id e as de controle: os campos do formulário vêm depois, um a um');

    const naLista = chamar('listarCanaisConfiguraveis()')
      .find((um) => um.nome === 'Auto Frota');
    verdadeiro(naLista !== undefined, 'e o canal aparece na lista de canais');
    igual(naLista.icone, 'escudo');
    igual(naLista.ativo, true);
    igual(naLista.colunaDoStatus, '',
      'nada é chutado: coluna da situação nasce em branco, para alguém '
      + 'escolher');
    verdadeiro(criado.proximosPassos.length >= 3,
      'e a tela recebe o que fazer em seguida, senão fica um canal órfão');
  });

  teste('o canal novo já aceita caso, e o caso aparece na fila dele', () => {
    /*
     * A prova de que o canal nasceu FUNCIONANDO, e não só cadastrado. Sem
     * isto, "criar canal" poderia ser só uma linha numa aba — e o defeito
     * apareceria no primeiro dia de uso, na mão de quem trabalha.
     */
    const novo = chamar('listarCanaisConfiguraveis()')
      .find((um) => um.nome === 'Auto Frota');

    chamar('liberarComSenha')('segredo123');
    chamar('criarCampo')(novo.id, { rotulo: 'Placa' });
    chamar('liberarComSenha')('segredo123');
    chamar('criarCampo')(novo.id, { rotulo: 'Responsavel' });

    chamar('salvarCanal')(Object.assign({},
      chamar('listarCanaisConfiguraveis()').find((um) => um.nome === 'Auto Frota'),
      { colunasDaFila: 'Placa, Responsavel', colunaDaAreaResponsavel: 'Responsavel' }));

    const salvo = chamar('cadastrarCaso')(novo.id, {
      placa: 'ABC1D23', responsavel: 'Ana Martins'
    });
    verdadeiro(String(salvo.id || salvo) !== '', 'o caso precisa ser gravado');

    const fila = chamar('resumoDoCanal')(novo.id, {});
    igual(fila.total, 1, 'e aparecer na fila do canal novo');
  });

  teste('nome de canal ou aba repetidos são recusados', () => {
    chamar('liberarComSenha')('segredo123');
    lanca(() => chamar('criarCanal')({ nome: 'Auto Frota' }),
      'Já existe um canal chamado');

    chamar('liberarComSenha')('segredo123');
    lanca(() => chamar('criarCanal')({
      nome: 'Outro nome', aba: 'BASE_AUTO_FROTA'
    }), 'já é a base do canal');
  });

  teste('aba reservada do sistema é recusada, dizendo por quê', () => {
    chamar('liberarComSenha')('segredo123');
    lanca(() => chamar('criarCanal')({ nome: 'Pela porta', aba: 'BASE_RET' }),
      'é do contrato do sistema');

    chamar('liberarComSenha')('segredo123');
    const erro = lanca(() => chamar('criarCanal')({
      nome: 'Pela porta', aba: 'ANALISE_QUALQUER'
    }), 'abas de análise');
    contem(erro.message, 'apaga e refaz',
      'o recado precisa dizer o que aconteceria, e não só que não dá');

    verdadeiro(!chamar('listarCanaisConfiguraveis()')
      .some((um) => um.nome === 'Pela porta'),
      'recusado é recusado: nenhum canal pode ter ficado gravado');
  });

  teste('aba que já existe com dado só entra se alguém pedir', () => {
    /*
     * A trava que protege a base de alguém. `criarAbaDoContrato_` REESCREVE o
     * cabeçalho e corta a grade no tamanho do contrato — rodar isso sobre uma
     * aba cheia transformaria os casos de alguém em lixo, em silêncio. Então
     * aba com dado só entra se quem está criando disser que é isso que quer.
     */
    const planilha = chamar('planilhaAtiva_()');
    const aba = planilha.insertSheet('BASE_COM_DADO');
    aba.getRange(1, 1, 1, 2).setValues([['id', 'cliente']]);
    aba.getRange(2, 1, 1, 2).setValues([['1000000001', 'Chopper']]);
    chamar('esquecerEstruturaLida_')();

    chamar('liberarComSenha')('segredo123');
    const erro = lanca(() => chamar('criarCanal')({
      nome: 'Em cima do que existe', aba: 'BASE_COM_DADO'
    }), 'já existe e tem dado dentro');
    contem(erro.message, 'aproveitar a aba que já existe',
      'e o recado diz qual é o caminho que funciona');

    igual(chamar('estruturaDaAba_')('BASE_COM_DADO').cabecalhos.join('|'),
      'id|cliente', 'recusado é recusado: o cabeçalho não pode ter mudado');
    igual(chamar('lerRegistros_("BASE_COM_DADO")')[0].cliente, 'Chopper',
      'nem o dado');
  });

  teste('aproveitando a aba, o cabeçalho dela não é tocado', () => {
    /*
     * O caminho de quem JÁ TEM a base na planilha — o caso do PO, que não
     * quer "excluir as abas ou criar do zero". O compromisso é explícito: a
     * aba fica como está, e o que o sistema faz é registrar as colunas dela
     * como campos e acrescentar as de controle que faltarem.
     */
    const planilha = chamar('planilhaAtiva_()');
    const aba = planilha.insertSheet('BASE_JA_EXISTIA');
    aba.getRange(1, 1, 1, 3).setValues([['id', 'cliente', 'valor']]);
    aba.getRange(2, 1, 1, 3).setValues([['1000000001', 'Luffy', '500']]);
    chamar('esquecerEstruturaLida_')();

    chamar('liberarComSenha')('segredo123');
    const criado = chamar('criarCanal')({
      nome: 'Base antiga', aba: 'BASE_JA_EXISTIA', aproveitarAAba: true
    });
    igual(criado.abaAproveitada, true);
    igual(criado.colunasRegistradas.join(', '), 'cliente, valor',
      'as colunas que já estavam lá viram campos — menos o id e as de controle');

    const cabecalhos = chamar('estruturaDaAba_')('BASE_JA_EXISTIA').cabecalhos;
    igual(cabecalhos.slice(0, 3).join('|'), 'id|cliente|valor',
      'as três primeiras colunas ficam onde estavam, na mesma ordem');
    verdadeiro(cabecalhos.indexOf('_Visivel') >= 0,
      'e as de controle foram acrescentadas no fim');

    const linha = chamar('lerRegistros_("BASE_JA_EXISTIA")')[0];
    igual(linha.cliente, 'Luffy', 'o dado que já estava lá continua lá');

    const campos = chamar('listarCamposDoCanal')(criado.id).map((um) => um.cabecalho);
    igual(campos.join(', '), 'cliente, valor');
  });

  teste('aba sem coluna de id é recusada ao aproveitar', () => {
    // Sem id o sistema não sabe de que linha é cada caso: não abre, não edita
    // e não exclui. Aceitar seria criar um canal que parece funcionar.
    const planilha = chamar('planilhaAtiva_()');
    const aba = planilha.insertSheet('BASE_SEM_ID');
    aba.getRange(1, 1, 1, 2).setValues([['cliente', 'valor']]);
    aba.getRange(2, 1, 1, 2).setValues([['Zoro', '10']]);
    chamar('esquecerEstruturaLida_')();

    chamar('liberarComSenha')('segredo123');
    const erro = lanca(() => chamar('criarCanal')({
      nome: 'Sem identidade', aba: 'BASE_SEM_ID', aproveitarAAba: true
    }), 'não tem coluna de Id');
    contem(erro.message, 'Crie uma coluna chamada "id"',
      'e o recado diz exatamente o que fazer');
  });

  teste('trocar o nome do canal não mexe na aba nem nos casos', () => {
    // Renomear já existia, e continua sendo a operação segura: o nome é da
    // tela, a aba é de onde o dado mora.
    const novo = chamar('listarCanaisConfiguraveis()')
      .find((um) => um.nome === 'Auto Frota');
    const casosAntes = chamar('lerRegistros_("BASE_AUTO_FROTA")').length;

    chamar('salvarCanal')(Object.assign({}, novo, { nome: 'Auto e Frota' }));

    const depois = chamar('listarCanaisConfiguraveis()')
      .find((um) => um.id === novo.id);
    igual(depois.nome, 'Auto e Frota');
    igual(depois.aba, 'BASE_AUTO_FROTA', 'a aba é a mesma');
    igual(chamar('lerRegistros_("BASE_AUTO_FROTA")').length, casosAntes,
      'e nenhum caso se perdeu no caminho');
  });

  teste('quem não mexe na estrutura não cria canal', () => {
    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      lanca(() => chamar('criarCanal')({ nome: 'Pela porta dos fundos' }),
        'não permite');
    });
  });

  teste('a criação do canal fica na trilha, com a aba no detalhe', () => {
    const trilha = chamar('listarAuditoria')(80);
    const criacoes = trilha.filter((linha) => linha.acao === 'canal.criar');
    verdadeiro(criacoes.length >= 2, 'duas criações, as duas na trilha');
    verdadeiro(criacoes.some((linha) =>
      String(linha.detalhe || '').indexOf('aba aproveitada') >= 0),
      'e a trilha diz quando a aba foi APROVEITADA, que é o caso delicado');
  });
}

module.exports = { rodarTestesDeConfiguracoes };
