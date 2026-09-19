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
    const aba = ambiente.planilha.getSheetByName('PRODUTOS');
    aba.getRange(1, 3).setValue('');
    chamar('esquecerEstruturaLida_()');

    const laudo = chamar('conferirEstruturaDaPlanilha()');
    igual(laudo.ok, false);
    const produtos = laudo.abas.find((a) => a.aba === 'PRODUTOS');
    igual(produtos.faltando.join(','), 'CodigoProduto');

    aba.getRange(1, 3).setNumberFormat('@');
    aba.getRange(1, 3).setValue('CodigoProduto');
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

    igual(opcoes.telas.map((t) => t.chave).join(','), doMenu.join(','),
      'duas listas de telas divergiriam, e a tela nova nasceria inacessível');
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
    igual(canais.length, 2);
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
    const ret = chamar('listarCanaisConfiguraveis()').find((m) => m.aba === 'BASE_RET');
    const comoEstava = { id: ret.id, nome: ret.nome, ordem: ret.ordem,
      colunaDaData: ret.colunaDaData, colunaDaHora: ret.colunaDaHora,
      colunaDoStatus: ret.colunaDoStatus, colunasDaFila: ret.colunasDaFila,
      cartoesDoPainel: ret.cartoesDoPainel,
      colunaDaFinalizacao: ret.colunaDaFinalizacao,
      colunaDaAreaResponsavel: ret.colunaDaAreaResponsavel };

    chamar('salvarCanal')(Object.assign({}, comoEstava, { ativo: false }));

    lanca(() => chamar('salvarCanal')({
      id: canal.id, nome: 'Mesa Diamante', ativo: false
    }), 'último canal ativa');

    chamar('salvarCanal')(Object.assign({}, comoEstava, { ativo: true }));
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
}

module.exports = { rodarTestesDeConfiguracoes };
