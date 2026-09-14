/**
 * ============================================================================
 * RECC — Instalador.gs · a única rotina que cria estrutura
 * ============================================================================
 * Rode `instalarRECC()` UMA vez, no editor do Apps Script, sobre uma planilha
 * VAZIA. Ela recusa rodar se qualquer aba do contrato já tiver dado.
 *
 * Depois da instalação, nenhum caminho do produto cria, renomeia, apaga ou
 * reordena aba e coluna por conta própria. Abrir o sistema apenas VALIDA.
 *
 * O que a instalação faz:
 *   1. acerta o fuso da planilha para America/Sao_Paulo;
 *   2. cria as 13 abas, com cabeçalho, formato de coluna e linha 1 congelada;
 *   3. CORTA cada aba para o tamanho do contrato — célula vazia também consome
 *      o teto de 10 milhões da planilha;
 *   4. semeia catálogo, mesas, campos e configuração — tudo editável depois;
 *   5. cadastra QUEM EXECUTOU como o primeiro Administrador.
 *
 * O passo 5 não é conveniência. O acesso é pelo e-mail autenticado conferido
 * contra a aba USUARIOS: base recém-criada tem essa aba vazia, e sem ninguém
 * dentro ninguém entra — nem para cadastrar o primeiro usuário.
 *
 * NENHUM dado operacional é semeado. As bases, os canais, os produtos e as
 * SUSEPs bloqueadas nascem vazios.
 * ============================================================================
 */

const RECC_TETO_DE_CELULAS = 10000000;

/** Ponto de entrada da instalação. */
function instalarRECC() {
  var planilha = planilhaAtiva_();
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    throw new Error('Não foi possível identificar o e-mail de quem está ' +
      'executando. Rode instalarRECC() pelo editor do Apps Script, ' +
      'autorizando o script.');
  }

  abortarSeAPlanilhaTiverDado_(planilha);

  planilha.setSpreadsheetTimeZone(RECC_FUSO_HORARIO);
  esquecerEstruturaLida_();

  var criadas = [];
  nomesDasAbasDoContrato_().forEach(function (nomeDaAba) {
    criadas.push(criarAbaDoContrato_(planilha, esquemaDaAba_(nomeDaAba)));
  });
  esquecerEstruturaLida_();

  var semente = semearDadosIniciais_(email);
  var orcamento = orcamentoDeCelulas_(planilha);

  var laudo = [
    'RECC instalado.',
    '',
    'Abas criadas: ' + criadas.length,
    'Primeiro administrador: ' + email,
    'Fuso da planilha: ' + planilha.getSpreadsheetTimeZone(),
    '',
    'Semente:',
    '  níveis de acesso ..... ' + semente.niveis,
    '  cargos ............... ' + semente.cargos,
    '  itens de catálogo .... ' + semente.catalogo,
    '  mesas ................ ' + semente.mesas,
    '  campos do formulário . ' + semente.campos,
    '  chaves de configuração ' + semente.config,
    '',
    'Orçamento de células: ' + orcamento.usadas.toLocaleString('pt-BR') +
      ' de ' + RECC_TETO_DE_CELULAS.toLocaleString('pt-BR') +
      ' (' + orcamento.percentual + '%)',
    '',
    'Próximo passo: abrir Configurações › Segurança e definir a senha de ADM.'
  ].join('\n');

  Logger.log(laudo);
  return laudo;
}

/** Instalação sobre planilha em uso não existe. */
function abortarSeAPlanilhaTiverDado_(planilha) {
  var comDado = [];
  nomesDasAbasDoContrato_().forEach(function (nomeDaAba) {
    var aba = planilha.getSheetByName(nomeDaAba);
    if (!aba) return;
    var preenchidas = quantasLinhasPreenchidas_(aba);
    if (preenchidas > 0) comDado.push(nomeDaAba + ' (' + preenchidas + ' linhas)');
  });
  if (comDado.length) {
    throw new Error('Esta planilha já tem dado nas abas: ' + comDado.join(', ') +
      '. A instalação só roda sobre planilha vazia, e não vai apagar nada. ' +
      'Use uma planilha nova.');
  }
}

/**
 * Quantas linhas de DADO a aba tem, de verdade.
 *
 * Conferir só getLastRow() não bastaria numa reinstalação: uma tentativa
 * anterior pode ter deixado a aba criada e formatada, e formato não é dado.
 * Aqui a pergunta é se existe algum valor abaixo do cabeçalho.
 */
function quantasLinhasPreenchidas_(aba) {
  var ultima = aba.getLastRow();
  var largura = aba.getLastColumn();
  if (ultima < 2 || largura < 1) return 0;

  var valores = aba.getRange(2, 1, ultima - 1, largura).getValues();
  var preenchidas = 0;
  for (var i = 0; i < valores.length; i++) {
    for (var j = 0; j < valores[i].length; j++) {
      var v = valores[i][j];
      if (v !== '' && v !== null && v !== undefined) { preenchidas++; break; }
    }
  }
  return preenchidas;
}

/**
 * Cria (ou reaproveita, se estiver vazia) a aba e a deixa no tamanho exato do
 * contrato.
 *
 * O corte importa: uma aba nova nasce com 1.000 linhas × 26 colunas, ou seja
 * 26.000 células do orçamento, todas em branco. Multiplicado por 13 abas isso
 * já seria 312 mil células guardando nada.
 */
function criarAbaDoContrato_(planilha, esquema) {
  var aba = planilha.getSheetByName(esquema.aba);
  if (!aba) aba = planilha.insertSheet(esquema.aba);

  var largura = esquema.colunas.length;
  var altura = esquema.reserva + 1;

  if (aba.getMaxColumns() < largura) {
    aba.insertColumnsAfter(aba.getMaxColumns(), largura - aba.getMaxColumns());
  } else if (aba.getMaxColumns() > largura) {
    aba.deleteColumns(largura + 1, aba.getMaxColumns() - largura);
  }
  if (aba.getMaxRows() < altura) {
    aba.insertRowsAfter(aba.getMaxRows(), altura - aba.getMaxRows());
  } else if (aba.getMaxRows() > altura) {
    aba.deleteRows(altura + 1, aba.getMaxRows() - altura);
  }

  var cabecalhos = esquema.colunas.map(function (coluna) { return coluna.cabecalho; });
  var linha1 = aba.getRange(1, 1, 1, largura);
  linha1.setNumberFormat('@');
  linha1.setValues([cabecalhos]);
  linha1.setFontWeight('bold');
  aba.setFrozenRows(1);

  // Pré-formata a área de dados coluna a coluna. Assim até uma linha digitada
  // à mão, sem passar pelo sistema, já cai na célula com o formato certo.
  for (var i = 0; i < esquema.colunas.length; i++) {
    var formato = RECC_FORMATO_DA_CELULA[esquema.colunas[i].tipo] || '@';
    aba.getRange(2, i + 1, esquema.reserva, 1).setNumberFormat(formato);
  }

  return esquema.aba;
}

// ============================================================================
// SEMENTE — padrão, nunca fixado. Tudo editável e excluível depois.
// ============================================================================

function semearDadosIniciais_(emailDoInstalador) {
  var contagem = { niveis: 0, cargos: 0, catalogo: 0, mesas: 0, campos: 0, config: 0 };

  // --- níveis de acesso -----------------------------------------------------
  // O nível é a unidade de permissão: telas, campos, widgets, ações e escopo
  // saem DAQUI. O cargo é só o rótulo organizacional.
  // Cada nível traz a SUA lista de ações. Dar a mesma lista a todo mundo que
  // não é administrador já deixou um nível chamado "Consulta" podendo criar
  // caso — o nome dizia uma coisa e a permissão fazia outra.
  var niveis = inserirVariosRegistros_('CATALOGO', [
    novoNivelDeAcesso_('Administrador', 1, 'TODOS',
      ['criar', 'editar', 'ocultar', 'exportar', 'configurar', 'estrutura'],
      ['dashboard', 'cadastrarCaso', 'minhaPerformance', 'buscarCaso',
       'tabelaCorretoras', 'painelAnalitico', 'configuracoes']),
    novoNivelDeAcesso_('Coordenação', 2, 'TODOS',
      ['criar', 'editar', 'ocultar', 'exportar'],
      ['dashboard', 'cadastrarCaso', 'minhaPerformance', 'buscarCaso',
       'tabelaCorretoras', 'painelAnalitico']),
    novoNivelDeAcesso_('Operação', 3, 'PROPRIOS',
      ['criar', 'editar', 'exportar'],
      ['dashboard', 'cadastrarCaso', 'minhaPerformance', 'buscarCaso',
       'tabelaCorretoras']),
    novoNivelDeAcesso_('Consulta', 4, 'TODOS',
      ['exportar'],
      ['dashboard', 'buscarCaso', 'painelAnalitico'])
  ]);
  contagem.niveis = niveis.length;
  var idAdministrador = niveis[0]['Id'];

  // --- cargos ---------------------------------------------------------------
  var cargos = inserirVariosRegistros_('CATALOGO', [
    novoItemDeCatalogo_('CARGO', '', 'Analista RET', 1),
    novoItemDeCatalogo_('CARGO', '', 'Analista Mesa Diamante', 2),
    novoItemDeCatalogo_('CARGO', '', 'ADM', 3),
    novoItemDeCatalogo_('CARGO', '', 'Coordenação', 4),
    novoItemDeCatalogo_('CARGO', '', 'Analista Sênior', 5)
  ]);
  contagem.cargos = cargos.length;
  var idCargoAdm = cargos[2]['Id'];

  // --- mesas ----------------------------------------------------------------
  var mesas = inserirVariosRegistros_('MESAS', [
    {
      Nome: 'RET Vida',
      Descricao: 'Relacionamento estratégico de clientes',
      Aba: 'BASE_RET',
      ColunaDaData: 'data de recepção do protocolo',
      ColunaDaHora: '',
      ColunaDoStatus: 'status',
      // Fila agrupada: cinco colunas na tela, e cada uma junta o que a
      // pessoa lê de uma vez só. Trinta e cinco colunas lado a lado não
      // cabem, e escolher seis perde o resto.
      ColunasDaFila: 'Situação: data de recepção do protocolo, status'
        + '; Dados da proposta: protocolo, número da proposta, Num_apolice, produto'
        + '; Dados cadastrais: nome do cliente, CPF, e-mail'
        + '; Motivo / assunto: motivo do cancelamento'
        + '; Responsável: analista',
      ColunasDaBusca: 'protocolo, CPF, Num_apolice, número da proposta, '
        + 'nome do cliente',
      MetaMensalPorPessoa: 0,
      ColunaDaFinalizacao: 'data da transmissão',
      ColunaDaAreaResponsavel: '',
      Icone: 'escudo',
      Ordem: 1,
      Ativo: true
    },
    {
      Nome: 'Mesa Diamante',
      Descricao: 'Atendimento a casos prioritários',
      Aba: 'BASE_MESA',
      ColunaDaData: 'Data de entrada',
      ColunaDaHora: 'Horário',
      ColunaDoStatus: 'Status',
      ColunasDaFila: 'Situação: Data de entrada, Status'
        + '; Dados do caso: Ramo, Assunto'
        + '; Dados cadastrais: Nome do segurado, Documento (CPF)'
        + '; Corretora: Corretora, SUSEP'
        + '; Responsável: Analista',
      ColunasDaBusca: 'Nome do segurado, Documento (CPF), SUSEP, Corretora',
      MetaMensalPorPessoa: 0,
      ColunaDaFinalizacao: 'Data da finalização',
      ColunaDaAreaResponsavel: 'Área responsável',
      Icone: 'diamante',
      Ordem: 2,
      Ativo: true
    }
  ]);
  contagem.mesas = mesas.length;
  var idRet = mesas[0]['Id'];
  var idMesa = mesas[1]['Id'];

  // --- catálogo por mesa ----------------------------------------------------
  var itens = [];
  // Cada situação com a sua cor. A cor não é enfeite: numa fila de trinta
  // linhas, ela é o que faz "não trabalhado" saltar aos olhos sem ninguém
  // precisar ler. As cores válidas estão em RECC_TONS.
  [['Aguardando transmissão', 'destaque'], ['Pendente', 'atencao'],
   ['1º contato realizado', 'violeta'], ['2º contato realizado', 'violeta'],
   ['Não trabalhado', 'ruim'], ['Concluído', 'bom']].forEach(function (par, i) {
    itens.push(novoItemDeCatalogo_('STATUS', idRet, par[0], i + 1, par[1]));
  });
  [['Transmissão pendente', 'destaque'], ['Pendente', 'atencao'],
   ['1º contato realizado', 'violeta'], ['2º contato realizado', 'violeta'],
   ['Não trabalhado', 'ruim'], ['Concluído', 'bom']].forEach(function (par, i) {
    itens.push(novoItemDeCatalogo_('STATUS', idMesa, par[0], i + 1, par[1]));
  });
  ['Diamante', 'Demais corretoras', 'Não encontrado'].forEach(function (nome, i) {
    itens.push(novoItemDeCatalogo_('SEGMENTO', '', nome, i + 1));
  });

  // Listas que o formulário oferece. Padrão, não fixado: o administrador
  // renomeia, reordena, desliga e cria quantas quiser em Configurações.
  var listasGlobais = {
    CANAL: ['E-mail', 'Chat', 'Telefone', 'Site', 'Corretora', 'Ouvidoria', 'URA'],
    TIPO: ['Reclamação', 'Dúvida', 'Solicitação', 'Elogio'],
    RAMO: ['Vida', 'Auto', 'Residencial', 'Prestamista'],
    AREA: ['Subscrição', 'Sinistro', 'Cobrança', 'Comercial', 'Jurídico'],
    MOTIVO: ['Aumento do prêmio na renovação', 'Dificuldade financeira',
      'Portabilidade', 'Proposta de concorrente', 'Insatisfação com atendimento',
      'Coberturas', 'Outros'],
    FORMA_PAGAMENTO: ['Boleto', 'Débito em conta', 'Cartão de crédito', 'PIX'],
    ORIGEM: ['Base de inadimplência', 'Central: Pessoa', 'URA', 'Site', 'Chat',
      'Telefone', 'Corretora']
  };
  Object.keys(listasGlobais).forEach(function (tipo) {
    listasGlobais[tipo].forEach(function (nome, i) {
      itens.push(novoItemDeCatalogo_(tipo, '', nome, i + 1));
    });
  });
  contagem.catalogo = inserirVariosRegistros_('CATALOGO', itens).length +
    contagem.niveis + contagem.cargos;

  // --- cartões do Dashboard -------------------------------------------------
  // Os cartões moram em PAINEIS, e não em MESAS: são uma LISTA de coisas
  // configuráveis, cada uma com nome, cor e ordem próprios. Guardá-los como
  // um texto separado por vírgula dentro da mesa dava conta de escolher
  // QUAIS, e de mais nada — não de renomear um, nem de trocar a cor.
  contagem.paineis = inserirVariosRegistros_('PAINEIS',
    cartoesIniciaisDoPainel_(idRet, idMesa)).length;

  // --- análises de partida --------------------------------------------------
  // Duas, uma por mesa, para a operação ver a ideia funcionando antes de
  // montar as dela. Nascem LIGADAS mas NÃO GERADAS: criar aba na instalação
  // custaria o dobro do tempo, e ninguém pediu a aba ainda.
  contagem.analises = inserirVariosRegistros_('ANALISES', [
    { Nome: 'RetVida', Descricao: 'Tudo da RET Vida dos últimos 90 dias',
      MesaId: idRet, Colunas: '', Filtros: '', Dias: 90, Ordem: 1, Ativo: true },
    { Nome: 'Diamante',
      Descricao: 'Casos da Mesa Diamante dos últimos 90 dias',
      MesaId: idMesa, Colunas: '', Filtros: '', Dias: 90, Ordem: 2, Ativo: true }
  ]).length;

  // --- campos do formulário -------------------------------------------------
  // Gerados a partir do contrato: é isto que faz CAMPOS ser o mapa
  // campo ↔ coluna, e não uma segunda verdade que diverge da planilha.
  var campos = []
    .concat(camposDoFormularioDaBase_('BASE_RET', idRet))
    .concat(camposDoFormularioDaBase_('BASE_MESA', idMesa));
  contagem.campos = inserirVariosRegistros_('CAMPOS', campos).length;

  // --- configuração ---------------------------------------------------------
  var config = inserirVariosRegistros_('CONFIG', [
    novaConfiguracao_('IDENTIDADE.NOME', 'RECC',
      'Nome exibido na barra superior. Editável.'),
    novaConfiguracao_('IDENTIDADE.NOME_LONGO',
      'Relacionamento Estratégico de Clientes e Corretores',
      'Subtítulo da barra superior.'),
    novaConfiguracao_('IDENTIDADE.OPERACAO', 'Porto Seguro',
      'Operação atendida por esta instalação.'),
    novaConfiguracao_('IDENTIDADE.LOGO_URL', '',
      'URL da logo exibida na tela de usuário não cadastrado.'),
    novaConfiguracao_('IDENTIDADE.COR_PRIMARIA', '#0B77CE',
      'Cor do tema Padrão.'),
    novaConfiguracao_('IDENTIDADE.FRASE',
      'Um espaço para cuidar de cada atendimento.',
      'A frase do painel da tela de quem não está cadastrado.'),
    novaConfiguracao_('IDENTIDADE.PLATAFORMA', 'PGO — Prisma Gestão Operacional',
      'A plataforma, exibida no rodapé do menu lateral.'),
    novaConfiguracao_('IDENTIDADE.FABRICANTE', 'by Pelitero labs',
      'Quem construiu, exibido no rodapé do menu lateral.'),
    novaConfiguracao_('LEGADO.PLANILHA_ID', '',
      'Id da planilha antiga, para a busca também olhar lá. Vazio desliga.'),
    novaConfiguracao_('LEGADO.ABA', '',
      'Nome da aba da planilha antiga. Vazio usa a primeira aba dela.'),
    novaConfiguracao_('LEGADO.ROTULO', 'Base legada',
      'Como a origem legada aparece nos resultados da busca.'),
    novaConfiguracao_('OPERACAO.JANELA_DIAS', '30',
      'Quantos dias a fila de trabalho carrega. Acima disso, use Buscar Caso.'),
    novaConfiguracao_('OPERACAO.TEMA_PADRAO', 'padrao',
      'padrao | rosa | dark | brasil'),
    novaConfiguracao_('MENU.TITULOS', JSON.stringify({
      dashboard: 'Dashboard',
      cadastrarCaso: 'Cadastrar Caso',
      minhaPerformance: 'Minha Performance',
      buscarCaso: 'Buscar Caso',
      tabelaCorretoras: 'Tabela de Corretoras',
      painelAnalitico: 'Painel Analítico',
      configuracoes: 'Configurações'
    }), 'Nome de cada tela no menu lateral. Editável.')
  ]);
  contagem.config = config.length;

  // --- primeiro administrador ----------------------------------------------
  inserirVariosRegistros_('USUARIOS', [{
    Nome: emailDoInstalador.split('@')[0],
    Email: emailDoInstalador,
    'Canal que atende': '',
    CargoId: idCargoAdm,
    NivelAcessoId: idAdministrador,
    Matricula: '',
    Ativo: true,
    DataCadastro: new Date(),
    UltimoAcesso: ''
  }]);

  return contagem;
}

function novoNivelDeAcesso_(nome, ordem, escopo, acoes, telas) {
  return {
    MesaId: '',
    Tipo: 'NIVEL_ACESSO',
    Codigo: '',
    Nome: nome,
    Rotulo: nome,
    PaiId: '',
    Cor: '',
    Ordem: ordem,
    Ativo: true,
    Configuracao: JSON.stringify({
      escopo: escopo,
      telas: telas,
      acoes: acoes,
      campos: {},
      widgets: {}
    })
  };
}

/**
 * Os cartões que o Dashboard mostra quando o sistema nasce.
 *
 * A RET Vida mostra todas as situações; a Mesa Diamante mostra duas. Não é
 * capricho: a Mesa tem muito menos volume, e sete cartões de números pequenos
 * viram uma parede que ninguém lê. Tudo isso é editável em Configurações —
 * este é o ponto de partida, não a regra.
 */
function cartoesIniciaisDoPainel_(idRet, idMesa) {
  var cartoes = [];

  function novoCartao(mesaId, titulo, dimensao, filtro, cor, ordem) {
    return {
      Tela: 'dashboard',
      MesaId: mesaId,
      Titulo: titulo,
      TipoWidget: 'cartao',
      CampoDimensao: dimensao,
      CampoMedida: '',
      Agregacao: 'contagem',
      Limite: 0,
      Filtro: filtro,
      Ordem: ordem,
      Largura: 1,
      Cor: cor,
      VisivelPara: '',
      Ativo: true
    };
  }

  // A RET mostra o total e as cinco situações que ainda pedem trabalho.
  // "Concluído" existe como situação, mas NÃO ganha cartão: o Dashboard
  // responde "o que eu tenho que trabalhar hoje", e caso concluído não é
  // trabalho. Quem quiser o número acrescenta o cartão em Configurações.
  cartoes.push(novoCartao(idRet, 'Total de casos', 'total', '', 'destaque', 1));
  [['Aguardando transmissão', 'destaque'], ['Pendente', 'atencao'],
   ['1º contato realizado', 'violeta'], ['2º contato realizado', 'violeta'],
   ['Não trabalhado', 'ruim']].forEach(function (par, i) {
    cartoes.push(novoCartao(idRet, par[0], 'situacao', par[0], par[1], i + 2));
  });

  cartoes.push(novoCartao(idMesa, 'Total de casos', 'total', '', 'destaque', 1));
  cartoes.push(novoCartao(idMesa, 'Pendente', 'situacao', 'Pendente', 'atencao', 2));
  cartoes.push(novoCartao(idMesa, 'Concluído', 'situacao', 'Concluído', 'bom', 3));
  cartoes.push(novoCartao(idMesa, 'Finalizados na célula', 'naCelula', '', 'bom', 4));

  // ---- os gráficos do Painel Analítico ------------------------------------
  // Cada um responde a UMA pergunta. Gráfico que não responde pergunta
  // nenhuma é enfeite, e enfeite numa tela de trabalho é ruído.
  function novoGrafico(mesaId, titulo, tipo, dimensao, agregacao, medida,
    limite, largura, ordem) {
    return {
      Tela: 'painelAnalitico', MesaId: mesaId, Titulo: titulo,
      TipoWidget: tipo, CampoDimensao: dimensao, CampoMedida: medida || '',
      Agregacao: agregacao, Limite: limite || 0, Filtro: '',
      Ordem: ordem, Largura: largura, Cor: '', VisivelPara: '', Ativo: true
    };
  }

  // Barras COM LINHA: a linha é a média móvel da própria barra, na mesma
  // escala. Não são dois eixos — dois eixos fazem a mesma altura significar
  // duas coisas, e é o erro de gráfico mais comum que existe.
  cartoes.push(novoGrafico(idRet, 'Entradas por dia, e a tendência',
    'barrasComLinha', 'data de recepção do protocolo', 'contagem', '', 0, 2, 1));
  // Pizza é parte-do-todo, de relance, com poucas fatias. Para comparar
  // valores próximos ela é péssima — para isso existem as barras abaixo.
  cartoes.push(novoGrafico(idRet, 'Situação dos casos',
    'pizza', 'status', 'contagem', '', 6, 1, 2));
  // Nome comprido pede barra DEITADA: em pé, o rótulo vira uma escadinha
  // ilegível ou é cortado.
  cartoes.push(novoGrafico(idRet, 'Por que pediram o cancelamento',
    'barrasDeitadas', 'motivo do cancelamento', 'contagem', '', 6, 1, 3));
  cartoes.push(novoGrafico(idRet, 'Prêmio retido por produto',
    'barras', 'produto', 'soma', 'valor do prêmio retido', 6, 1, 4));
  cartoes.push(novoGrafico(idRet, 'Casos por canal de entrada',
    'barras', 'canal', 'contagem', '', 6, 1, 5));
  // Por analista: a mesma pergunta do "por área", uma camada abaixo. O
  // recorte por área já existe sem gráfico nenhum — é o seletor de mesa no
  // alto da tela, e cada mesa tem os gráficos dela. O que faltava era ver a
  // distribuição DENTRO da área, e é isto.
  cartoes.push(novoGrafico(idRet, 'Casos por analista',
    'barrasDeitadas', 'analista', 'contagem', '', 6, 1, 6));

  cartoes.push(novoGrafico(idMesa, 'Entradas por dia, e a tendência',
    'barrasComLinha', 'Data de entrada', 'contagem', '', 0, 2, 1));
  cartoes.push(novoGrafico(idMesa, 'Situação dos casos',
    'pizza', 'Status', 'contagem', '', 6, 1, 2));
  cartoes.push(novoGrafico(idMesa, 'Casos por corretora',
    'barrasDeitadas', 'Corretora', 'contagem', '', 6, 1, 3));
  cartoes.push(novoGrafico(idMesa, 'Casos por canal de entrada',
    'barras', 'Canal', 'contagem', '', 6, 1, 4));
  cartoes.push(novoGrafico(idMesa, 'Casos por analista',
    'barrasDeitadas', 'Analista', 'contagem', '', 6, 1, 5));

  return cartoes;
}

function novoItemDeCatalogo_(tipo, mesaId, nome, ordem, cor) {
  return {
    MesaId: mesaId,
    Tipo: tipo,
    Codigo: '',
    Nome: nome,
    Rotulo: nome,
    PaiId: '',
    Cor: cor || '',
    Ordem: ordem,
    Ativo: true,
    Configuracao: ''
  };
}

function novaConfiguracao_(chave, valor, descricao) {
  return {
    Chave: chave,
    Valor: valor,
    Descricao: descricao,
    AtualizadoPor: '',
    Data: new Date()
  };
}

/**
 * Como cada campo NASCE no formulário: em que seção, se é obrigatório, se é
 * uma lista, com que máscara e ocupando quantas colunas da grade.
 *
 * Isto é semente, não regra: tudo aqui é editável em Configurações depois. Só
 * existe para o cadastro já nascer utilizável, em vez de virar uma parede de
 * caixas de texto soltas que alguém teria de organizar à mão.
 *
 * A chave é a ChaveTecnica — o cabeçalho normalizado, sem acento nem espaço.
 */
const RECC_PADRAO_DO_FORMULARIO = {
  // ---------------------------------------------------------- Mesa Diamante
  analista: { tipoCampo: 'seletor', listaDe: 'usuarios', secao: 'Atendimento' },
  status: { tipoCampo: 'seletor', catalogo: 'STATUS', obrigatorio: true, secao: 'Situação' },
  canal: { tipoCampo: 'seletor', catalogo: 'CANAL', secao: 'Situação' },
  datadeentrada: { secao: 'Situação' },
  horario: { secao: 'Situação' },
  tipo: { tipoCampo: 'seletor', catalogo: 'TIPO', secao: 'Situação' },
  aberturaindevida: { secao: 'Situação' },
  titulodoemail: { secao: 'Atendimento', largura: 2 },
  nomedosegurado: { obrigatorio: true, secao: 'Cliente', largura: 2 },
  documentocpf: { tipoCampo: 'documento', mascara: '000.000.000-00', secao: 'Cliente' },
  corretora: { secao: 'Corretora' },
  susep: { secao: 'Corretora' },
  ramo: { tipoCampo: 'seletor', catalogo: 'RAMO', secao: 'Corretora' },
  assunto: { secao: 'Atendimento', largura: 2 },
  arearesponsavel: { tipoCampo: 'seletor', catalogo: 'AREA', secao: 'Encaminhamento' },
  dataresposta: { secao: 'Encaminhamento' },
  horaresposta: { secao: 'Encaminhamento' },
  datadafinalizacao: { secao: 'Encaminhamento' },
  horariodafinalizacao: { secao: 'Encaminhamento' },

  // -------------------------------------------------------------- RET Vida
  dataderecepcaodoprotocolo: { secao: 'Protocolo' },
  protocolo: { obrigatorio: true, secao: 'Protocolo' },
  segmento: { tipoCampo: 'seletor', catalogo: 'SEGMENTO', secao: 'Corretora' },
  nomedocliente: { obrigatorio: true, secao: 'Cliente', largura: 2 },
  cpf: { tipoCampo: 'documento', mascara: '000.000.000-00', secao: 'Cliente' },
  telefonesdecontato: { tipoCampo: 'telefone', secao: 'Cliente' },
  email: { tipoCampo: 'email', secao: 'Cliente' },
  produto: { secao: 'Proposta' },
  codproduto: { secao: 'Proposta' },
  numerodaproposta: { secao: 'Proposta' },
  codigoorigemdaproposta: { secao: 'Proposta' },
  numapolice: { secao: 'Proposta' },
  valordopremio: { secao: 'Valores' },
  valordopremioretido: { secao: 'Valores' },
  premiomensalretido: { secao: 'Valores' },
  formadepagamento: { tipoCampo: 'seletor', catalogo: 'FORMA_PAGAMENTO', secao: 'Valores' },
  motivodocancelamento: { tipoCampo: 'seletor', catalogo: 'MOTIVO', secao: 'Retenção' },
  tentativasdecontato: { secao: 'Retenção' },
  datadatransmissao: { secao: 'Retenção' },
  descricao: { secao: 'Retenção', largura: 3 }
};

/**
 * Um campo de formulário para cada coluna da base.
 *
 * As colunas de controle (_Visivel e companhia) ficam de fora: elas são do
 * sistema, não do formulário. A coluna Id entra desativada — precisa estar no
 * mapa, mas ninguém digita um Id.
 */
function camposDoFormularioDaBase_(nomeDaAba, mesaId) {
  var esquema = esquemaDaAba_(nomeDaAba);
  var campos = [];
  var ordem = 0;

  esquema.colunas.forEach(function (coluna) {
    if (coluna.cabecalho.charAt(0) === '_') return;

    var chave = normalizarParaComparar_(coluna.cabecalho);
    var ehId = (chave === 'id');
    var padrao = RECC_PADRAO_DO_FORMULARIO[chave] || {};
    ordem++;

    var configuracao = {};
    if (padrao.catalogo) configuracao.catalogo = padrao.catalogo;
    if (padrao.listaDe) configuracao.listaDe = padrao.listaDe;
    if (padrao.largura) configuracao.largura = padrao.largura;

    campos.push({
      MesaId: mesaId,
      Aba: nomeDaAba,
      ChaveTecnica: chave,
      Cabecalho: coluna.cabecalho,
      Rotulo: coluna.cabecalho,
      Descricao: '',
      TipoCampo: padrao.tipoCampo || RECC_DO_DADO_PARA_O_CAMPO[coluna.tipo] || 'texto',
      Secao: padrao.secao || 'Geral',
      Mascara: padrao.mascara || '',
      Obrigatorio: padrao.obrigatorio === true,
      Protegido: coluna.protegido === true,
      Ativo: !ehId,
      Ordem: ordem,
      VisivelPara: '',
      ValorPadrao: '',
      Configuracao: Object.keys(configuracao).length ? JSON.stringify(configuracao) : ''
    });
  });

  return campos;
}

// ============================================================================
// CONFERÊNCIA — para rodar no editor depois de publicar
// ============================================================================

/**
 * Confere o que foi copiado, contra o contrato. Só LÊ.
 *
 * É a conferência de DOIS SEGUNDOS, para rodar logo depois de copiar os
 * arquivos. Duas metades, e as duas importam:
 *
 *   as ABAS      contra o contrato do Esquema;
 *   os ARQUIVOS  de tela que o Index manda incluir.
 *
 * A segunda metade nasceu de um caso real: o `Formulario.html` ficou para trás
 * na cópia, e o sistema só disse "nenhum arquivo html com o nome Formulario
 * foi encontrado", com um número de linha. Nenhum teste rodado fora do Apps
 * Script pega isso — os testes leem a PASTA do repositório, onde o arquivo
 * está; quem não tem o arquivo é o PROJETO.
 *
 * Para a conferência completa — sequências, Ids, mesas, campos, permissões —
 * existe `diagnosticoRECC()`. As duas leem o mesmo `conferirEstrutura_`: não
 * há duas versões da regra, há uma curta e uma completa.
 */
function verificarEstruturaRECC() {
  var laudo = conferirEstrutura_();
  var faltamArquivos = arquivosDeTelaQueFaltam_();
  var tudoCerto = laudo.ok && !faltamArquivos.length;
  var linhas = [tudoCerto ? 'ESTRUTURA OK' : 'ESTRUTURA INCOMPLETA', ''];

  laudo.abas.forEach(function (item) {
    if (!item.existe) {
      linhas.push('FALTA A ABA  ' + item.aba);
      return;
    }
    var estado = item.faltando.length ? 'FALTA COLUNA' : 'ok          ';
    linhas.push(estado + ' ' + item.aba + '  (' + item.linhas + ' linhas)');
    if (item.faltando.length) {
      linhas.push('             faltando: ' + item.faltando.join(' | '));
    }
    if (item.aMais.length) {
      linhas.push('             fora do contrato (respeitadas): ' +
        item.aMais.join(' | '));
    }
  });

  linhas.push('');
  if (faltamArquivos.length) {
    linhas.push('FALTAM ' + faltamArquivos.length + ' ARQUIVO(S) DE TELA:');
    faltamArquivos.forEach(function (nome) {
      linhas.push('             ' + nome + '   (copie Front-End/' + nome
        + '.html, e nomeie aqui como "' + nome + '")');
    });
    linhas.push('             Sem eles a página não carrega.');
  } else {
    linhas.push('ok           os arquivos de tela do Index estão todos aqui');
  }

  var orcamento = orcamentoDeCelulas_(planilhaAtiva_());
  linhas.push('');
  linhas.push('Células: ' + orcamento.usadas.toLocaleString('pt-BR') + ' de ' +
    RECC_TETO_DE_CELULAS.toLocaleString('pt-BR') + ' (' + orcamento.percentual + '%)');
  linhas.push('');
  linhas.push('Para a conferência completa, rode diagnosticoRECC().');

  var texto = linhas.join('\n');
  Logger.log(texto);
  return texto;
}

/**
 * Quanto do teto de 10 milhões de células a planilha já ocupa.
 * Conta a GRADE, não o preenchimento: célula vazia também pesa.
 */
function orcamentoDeCelulas_(planilha) {
  var usadas = 0;
  planilha.getSheets().forEach(function (aba) {
    usadas += aba.getMaxRows() * aba.getMaxColumns();
  });
  return {
    usadas: usadas,
    percentual: Math.round((usadas / RECC_TETO_DE_CELULAS) * 1000) / 10
  };
}
