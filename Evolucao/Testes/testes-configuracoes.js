/**
 * ============================================================================
 * PGO — testes-configuracoes.js · a Etapa 6
 * ============================================================================
 * Esta é a tela que muda todas as outras. Os testes aqui cuidam sobretudo das
 * TRAVAS: as mudanças que, se passassem, deixariam alguém trancado do lado de
 * fora ou apontando para um dado que não existe mais.
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario } =
  require('./ferramentas');

function rodarTestesDeConfiguracoes() {
  console.log('\nEtapa 6 — Configurações');

  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');
  const mesa = chamar('mesasVisiveis_()').find((m) => m.aba === 'BASE_MESA');

  secao('O panorama');

  teste('a tela abre sabendo o tamanho de cada seção', () => {
    const resumo = chamar('resumoDasConfiguracoes()');
    igual(resumo.secoes.length, 6);
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
    const campos = chamar('listarCamposDaMesa')(mesa.id);
    igual(campos.length, 20, 'os 20 cabeçalhos da mesa, inclusive o Id');
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

    const campo = chamar('listarCamposDaMesa')(mesa.id)
      .find((c) => c.chave === 'assunto');
    igual(campo.colunaExiste, false,
      'o campo precisa avisar que perdeu a coluna, em vez de parar de funcionar');

    aba.getRange(1, 15).setNumberFormat('@');
    aba.getRange(1, 15).setValue(guardado);
    chamar('esquecerEstruturaLida_()');
  });

  teste('mudar rótulo, seção e máscara não pede senha — é aparência', () => {
    const campo = chamar('listarCamposDaMesa')(mesa.id)
      .find((c) => c.chave === 'assunto');
    chamar('salvarCampo')({
      id: campo.id, rotulo: 'Assunto do contato', secao: 'Atendimento',
      tipo: 'texto', obrigatorio: true, ativo: true
    });
    const depois = chamar('listarCamposDaMesa')(mesa.id)
      .find((c) => c.chave === 'assunto');
    igual(depois.rotulo, 'Assunto do contato');
    igual(depois.obrigatorio, true);
    igual(depois.cabecalho, 'Assunto', 'o cabeçalho da coluna não muda');
  });

  teste('trocar o cabeçalho por aqui é recusado — é mexer na coluna', () => {
    const campo = chamar('listarCamposDaMesa')(mesa.id)
      .find((c) => c.chave === 'assunto');
    lanca(() => chamar('salvarCampo')({
      id: campo.id, cabecalho: 'Outro nome', rotulo: 'x', tipo: 'texto'
    }), 'nome da coluna na planilha');
  });

  teste('tipo de campo inventado é recusado, e diz quais existem', () => {
    const campo = chamar('listarCamposDaMesa')(mesa.id)[1];
    lanca(() => chamar('salvarCampo')({
      id: campo.id, rotulo: 'x', tipo: 'telepatia'
    }), 'Tipo de campo desconhecido');
  });

  teste('criar campo exige senha de administrador, não só permissão', () => {
    // Criar coluna escreve na planilha de produção e não tem desfazer.
    lanca(() => chamar('criarCampo')(mesa.id, { rotulo: 'Observação interna' }),
      'exige a senha de administrador');
  });

  teste('com a senha liberada, o campo novo vira coluna de verdade', () => {
    chamar('definirSenhaDeAdministrador')('segredo123', '');
    chamar('liberarComSenha')('segredo123');

    const criado = chamar('criarCampo')(mesa.id, {
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
    const campos = chamar('listarCamposDaMesa')(mesa.id);
    const invertidos = campos.map((c) => c.id).reverse();

    chamar('reordenarCampos')(mesa.id, invertidos);
    igual(chamar('estruturaDaAba_')('BASE_MESA').cabecalhos.join('|'), antes,
      'a planilha não pode ter sido tocada');
    igual(chamar('listarCamposDaMesa')(mesa.id)[0].id, invertidos[0],
      'mas a ordem da tela mudou');

    chamar('reordenarCampos')(mesa.id, invertidos.reverse());
  });

  teste('reordenar com campo de outra mesa é recusado', () => {
    const ret = chamar('mesasVisiveis_()').find((m) => m.aba === 'BASE_RET');
    const daRet = chamar('listarCamposDaMesa')(ret.id)[0];
    lanca(() => chamar('reordenarCampos')(mesa.id, [daRet.id]),
      'não é da mesa Mesa Diamante');
  });

  secao('As listas');

  teste('renomear um item em uso é recusado, com o número de casos', () => {
    // Trocar o Nome não renomeia o que já foi gravado: os casos ficariam
    // apontando para um item que não existe mais.
    chamar('inserirRegistro_')('BASE_MESA', {
      Analista: 'Ana Martins', Status: 'Pendente', 'Nome do segurado': 'Alguém'
    });
    const pendente = chamar('listarCatalogo')('STATUS', mesa.id)
      .find((i) => i.nome === 'Pendente');

    const erro = lanca(() => chamar('salvarItemDoCatalogo')({
      id: pendente.id, tipo: 'STATUS', mesaId: mesa.id, nome: 'Em aberto'
    }), 'está gravado em');
    contem(erro.message, 'troque o rótulo', 'a saída precisa ser oferecida');
  });

  teste('trocar só o rótulo é livre — é o que aparece na tela', () => {
    const pendente = chamar('listarCatalogo')('STATUS', mesa.id)
      .find((i) => i.nome === 'Pendente');
    chamar('salvarItemDoCatalogo')({
      id: pendente.id, tipo: 'STATUS', mesaId: mesa.id,
      nome: 'Pendente', rotulo: 'Aguardando ação', cor: 'atencao'
    });
    igual(chamar('listarCatalogo')('STATUS', mesa.id)
      .find((i) => i.nome === 'Pendente').rotulo, 'Aguardando ação');
  });

  teste('item novo entra na lista e aparece no formulário', () => {
    chamar('salvarItemDoCatalogo')({
      tipo: 'STATUS', mesaId: mesa.id, nome: 'Em análise jurídica',
      cor: 'violeta', ordem: 7, ativo: true
    });
    const status = chamar('formularioDaMesa')(mesa.id)
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

  teste('tirar Configurações do único nível que a tem é recusado', () => {
    // Sem esta trava, a saída seria editar a planilha na mão — coisa que nem
    // todo mundo sabe fazer sob pressão.
    const administrador = chamar('listarNiveisDeAcesso()')
      .find((n) => n.nome === 'Administrador');
    lanca(() => chamar('salvarNivelDeAcesso')({
      id: administrador.id, nome: 'Administrador', escopo: 'TODOS',
      telas: ['dashboard'], acoes: administrador.acoes
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
      telas: ['dashboard'], acoes: ['criar']
    }), 'Escopo desconhecido');
    lanca(() => chamar('salvarNivelDeAcesso')({
      id: nivel.id, nome: 'Operação', escopo: 'PROPRIOS',
      telas: ['dashboard'], acoes: ['voar']
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
      const campos = chamar('formularioDaMesa')(mesa.id)
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
    const mesa4 = chamar('conferirEstruturaDaPlanilha()').abas
      .find((a) => a.aba === 'BASE_MESA');
    verdadeiro(mesa4.aMais.indexOf('Valor negociado') >= 0,
      'coluna nova é respeitada, e o laudo diz que ela não é do contrato');
    igual(mesa4.faltando.length, 0);
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
