/**
 * ============================================================================
 * PGO — Instalacao.gs · criar e conferir a instalação
 * ============================================================================
 * As duas rotinas que se rodam NO EDITOR do Apps Script, não pela tela:
 * a que cria a planilha do zero e a que diz o que está errado nela.
 * São as duas pontas da mesma pergunta — "esta instalação está de pé?".
 *
 * O QUE TEM AQUI DENTRO, nesta ordem:
 *
 *   1. A ÚNICA ROTINA QUE CRIA ESTRUTURA   (era Instalador.gs)
 *   2. O LAUDO QUE RODA DENTRO DO APPS SCRIPT   (era Diagnostico.gs)
 *
 * Procure pelo banner com ##### para pular de uma seção à outra.
 * ============================================================================
 */

/* ############################################################################
   #
   #  SEÇÃO 1 de 2 · A ÚNICA ROTINA QUE CRIA ESTRUTURA
   #
   #  Era o arquivo Back-End/Instalador.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

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
 *   4. semeia catálogo, canais, campos e configuração — tudo editável depois;
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
    '  canais ................ ' + semente.canais,
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
  var contagem = { niveis: 0, cargos: 0, catalogo: 0, canais: 0, campos: 0, config: 0 };

  // --- níveis de acesso -----------------------------------------------------
  // O nível é a unidade de permissão: telas, campos, widgets, ações e escopo
  // saem DAQUI. O cargo é só o rótulo organizacional.
  // Cada nível traz a SUA lista de ações. Dar a mesma lista a todo mundo que
  // não é administrador já deixou um nível chamado "Consulta" podendo criar
  // caso — o nome dizia uma coisa e a permissão fazia outra.
  var niveis = inserirVariosRegistros_('CATALOGO', [
    novoNivelDeAcesso_('Administrador', 1, 'TODOS',
      ['criar', 'editar', 'ocultar', 'exportar', 'tombar', 'configurar', 'estrutura'],
      ['dashboard', 'cadastrarCaso', 'minhaPerformance', 'buscarCaso',
       'tabelaCorretoras', 'tombamento', 'painelAnalitico', 'configuracoes']),
    // A Coordenação tomba: é ela quem recebe a base de inadimplentes e
    // distribui. A Operação não — um analista não traz trezentos casos para
    // dentro da base, ele trabalha os que chegaram.
    novoNivelDeAcesso_('Coordenação', 2, 'TODOS',
      ['criar', 'editar', 'ocultar', 'exportar', 'tombar'],
      ['dashboard', 'cadastrarCaso', 'minhaPerformance', 'buscarCaso',
       'tabelaCorretoras', 'tombamento', 'painelAnalitico']),
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

  // --- canais ----------------------------------------------------------------
  var canais = inserirVariosRegistros_('CANAIS', [
    {
      Nome: 'RET',
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
  contagem.canais = canais.length;
  var idRet = canais[0]['Id'];
  var idCanal = canais[1]['Id'];

  // --- catálogo por canal ----------------------------------------------------
  var itens = [];
  // Cada situação com a sua cor. A cor não é enfeite: numa fila de trinta
  // linhas, ela é o que faz "não trabalhado" saltar aos olhos sem ninguém
  // precisar ler. As cores válidas estão em RECC_TONS.
  // OS STATUS DA RET, cada um com a coluna onde carimba data e hora.
  //
  // É daqui que sai o controle de produtividade da RET: toda vez que um caso
  // muda de status, o momento fica gravado na PRÓPRIA LINHA do caso, na
  // coluna que o status declarou. É isso que permite ao painel responder
  // "quantos contatou, e quando foi cada contato" sem cruzar duas abas.
  //
  // "Não trabalhado" é o estado de nascimento e não carimba nada: carimbar a
  // hora em que o caso entrou seria repetir a data de recepção.
  [['Não trabalhado', 'ruim', ''],
   ['Aguardando transmissão', 'destaque', 'Data aguardando transmissão'],
   ['Pendente', 'atencao', 'Data pendente'],
   ['1º contato realizado', 'violeta', 'Data do 1º contato'],
   ['2º contato realizado', 'violeta', 'Data do 2º contato'],
   ['Não reteve', 'ruim', 'Data não reteve'],
   ['Reteve', 'bom', 'Data reteve'],
   ['Concluído', 'bom', 'Data concluído']].forEach(function (trio, i) {
    itens.push(novoItemDeCatalogo_('STATUS', idRet, trio[0], i + 1, trio[1], trio[2]));
  });
  // A Mesa Diamante tem três status, e só três. O formulário nasce com
  // "Em andamento" já escolhido — é o estado em que todo caso começa, e
  // deixar em branco obrigaria a escolher o óbvio em toda abertura.
  //
  // "Concluído na célula" é diferente de "Concluído": a célula resolveu sem
  // devolver para a área. A operação mede os dois separados.
  [['Em andamento', 'atencao', ''],
   ['Concluído', 'bom', 'Data da finalização'],
   ['Concluído na célula', 'destaque', 'Data da finalização']].forEach(function (trio, i) {
    itens.push(novoItemDeCatalogo_('STATUS', idCanal, trio[0], i + 1, trio[1], trio[2]));
  });
  ['Diamante', 'Demais corretoras', 'Não encontrado'].forEach(function (nome, i) {
    itens.push(novoItemDeCatalogo_('SEGMENTO', '', nome, i + 1));
  });

  // Listas que o formulário oferece. Padrão, não fixado: o administrador
  // renomeia, reordena, desliga e cria quantas quiser em Configurações.
  var listasGlobais = {
    // Por onde o caso chegou na RET. A operação pediu estes quatro.
    CANAL_ORIGEM: ['URA', 'Central', 'Base de Inadimplentes',
      'Piloto Formulário - Cancelamento'],
    // Por onde o caso chegou na Mesa Diamante.
    CANAL: ['Chat', 'Retorno | chat', 'E-mail'],
    TIPO: ['Consultas', 'Problemas', 'Solicitações'],
    RAMO: ['Vida em grupo', 'Vida individual'],
    ASSUNTO: ['Cancelamento', 'Cobrança', 'Alteração cadastral', 'Sinistro',
      'Segunda via', 'Outros'],
    AREA: ['Subscrição', 'Sinistro', 'Cobrança', 'Comercial', 'Jurídico'],
    MOTIVO: ['Aumento do prêmio na renovação', 'Dificuldade financeira',
      'Portabilidade', 'Proposta de concorrente', 'Insatisfação com atendimento',
      'Coberturas', 'Outros'],
    // "ADC - TODAS PARCELAS" é a opção que faz aparecer o campo "Dados de
    // pagamento" — ver mostrarSe, em RECC_PADRAO_DO_FORMULARIO. Renomear
    // este item aqui sem ajustar lá desligaria a regra em silêncio.
    FORMA_PAGAMENTO: ['ADC - TODAS PARCELAS', 'Boleto', 'Débito em conta',
      'Cartão de crédito', 'PIX'],
    // Quantas vezes já se tentou falar com o cliente. É seletor, e não número
    // digitado, porque a operação vai pendurar regra nisso mais para a frente.
    TENTATIVA: ['1ª tentativa', '2ª tentativa', '3ª tentativa',
      'Contato efetivado', 'Sem contato'],
    // O produto vem no formato "código - nome", num seletor só. O sistema
    // separa os dois ao gravar, para o painel agrupar por código.
    // A RET trata Vida Individual e, agora, Vida em Grupo. A lista é ponto de
    // partida: a operação acrescenta produto em Configurações › Listas, sem
    // programador — é o que mantém o sistema aberto enquanto ela se forma.
    PRODUTO: ['1101 - VIDA INDIVIDUAL', '1102 - VIDA EM GRUPO',
      '1103 - PRESTAMISTA', '1104 - ACIDENTES PESSOAIS'],
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
  // Os cartões moram em PAINEIS, e não em CANAIS: são uma LISTA de coisas
  // configuráveis, cada uma com nome, cor e ordem próprios. Guardá-los como
  // um texto separado por vírgula dentro do canal dava conta de escolher
  // QUAIS, e de mais nada — não de renomear um, nem de trocar a cor.
  contagem.paineis = inserirVariosRegistros_('PAINEIS',
    cartoesIniciaisDoPainel_(idRet, idCanal)).length;

  // --- análises de partida --------------------------------------------------
  // Duas, uma por canal, para a operação ver a ideia funcionando antes de
  // montar as dela. Nascem LIGADAS mas NÃO GERADAS: criar aba na instalação
  // custaria o dobro do tempo, e ninguém pediu a aba ainda.
  contagem.analises = inserirVariosRegistros_('ANALISES', [
    { Nome: 'RET', Descricao: 'Tudo da RET dos últimos 90 dias',
      CanalId: idRet, Colunas: '', Filtros: '', Dias: 90, Ordem: 1, Ativo: true },
    { Nome: 'Diamante',
      Descricao: 'Casos da Mesa Diamante dos últimos 90 dias',
      CanalId: idCanal, Colunas: '', Filtros: '', Dias: 90, Ordem: 2, Ativo: true }
  ]).length;

  // --- campos do formulário -------------------------------------------------
  // Gerados a partir do contrato: é isto que faz CAMPOS ser o mapa
  // campo ↔ coluna, e não uma segunda verdade que diverge da planilha.
  var campos = []
    .concat(camposDoFormularioDaBase_('BASE_RET', idRet))
    .concat(camposDoFormularioDaBase_('BASE_MESA', idCanal));
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
    novaConfiguracao_('OPERACAO.LINHAS_DO_PAINEL', '5000',
      'Quantas linhas do fim da base os painéis leem antes de filtrar por '
      + 'data. Com muito volume, 5.000 podem não cobrir a janela de dias — as '
      + 'telas avisam quando isso acontece.'),
    novaConfiguracao_('OPERACAO.TEMA_PADRAO', 'padrao',
      'padrao | rosa | dark | brasil'),
    // Semeado A PARTIR de RECC_TELAS_DO_SISTEMA, e não digitado de novo aqui.
    // Escrever a lista duas vezes é ter dois mapas do mesmo mar: um dia eles
    // divergem, e a tela nova nasce com o nome errado no menu — ou sem nome.
    novaConfiguracao_('MENU.TITULOS', JSON.stringify(
      RECC_TELAS_DO_SISTEMA.reduce(function (mapa, item) {
        mapa[item.tela] = item.titulo;
        return mapa;
      }, {})
    ), 'Nome de cada tela no menu lateral. Editável em '
      + 'Configurações › Identidade.')
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
    CanalId: '',
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
 * A RET mostra todas as situações; a Mesa Diamante mostra duas. Não é
 * capricho: a Canal tem muito menos volume, e sete cartões de números pequenos
 * viram uma parede que ninguém lê. Tudo isso é editável em Configurações —
 * este é o ponto de partida, não a regra.
 */
function cartoesIniciaisDoPainel_(idRet, idCanal) {
  var cartoes = [];

  function novoCartao(canalId, titulo, dimensao, filtro, cor, ordem, tela) {
    return {
      Tela: tela || 'dashboard',
      CanalId: canalId,
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

  // A Mesa Diamante tem menos volume: quatro cartões bastam, e sete seriam
  // ruído. Os nomes acompanham os três status que ela usa.
  cartoes.push(novoCartao(idCanal, 'Total de casos', 'total', '', 'destaque', 1));
  cartoes.push(novoCartao(idCanal, 'Em andamento', 'situacao', 'Em andamento', 'atencao', 2));
  cartoes.push(novoCartao(idCanal, 'Concluído', 'situacao', 'Concluído', 'bom', 3));
  // "Finalizados na célula" é CALCULADO — conta o que fechou sem passar por
  // outra área —, e por isso vale mais que um cartão preso ao status de mesmo
  // nome: ele continua certo se alguém renomear o status. O status existe
  // para quem atende marcar; o cartão, para a operação medir.
  cartoes.push(novoCartao(idCanal, 'Finalizados na célula', 'naCelula', '', 'bom', 4));

  // ---- os cartões da Produtividade RECC -----------------------------------
  //
  // São OUTRA pergunta, e por isso outros cartões. O Trabalho responde "o que
  // eu tenho que fazer hoje" e por isso só mostra o que ainda dá trabalho. A
  // Produtividade responde "o que a gente entregou", e aí o que interessa é
  // justamente o que já fechou: quantos reteve, quantos não reteve, quantos
  // foram contatados.
  //
  // Contatados sai do CARIMBO, e não do status. Um caso que já passou do "1º
  // contato realizado" e hoje está em "Reteve" continua tendo sido contatado —
  // mas não conta mais em status nenhum. A coluna de carimbo não esquece.

  function cartaoDaProdutividade(canalId, titulo, dimensao, filtro, cor, ordem) {
    return novoCartao(canalId, titulo, dimensao, filtro, cor, ordem,
      'painelAnalitico');
  }

  cartoes.push(cartaoDaProdutividade(idRet, 'Casos cadastrados', 'total', '', 'destaque', 1));
  cartoes.push(cartaoDaProdutividade(idRet, 'Reteve', 'situacao', 'Reteve', 'bom', 2));
  cartoes.push(cartaoDaProdutividade(idRet, 'Não reteve', 'situacao', 'Não reteve', 'ruim', 3));
  cartoes.push(cartaoDaProdutividade(idRet, 'Já contatados', 'preenchido',
    'Data do 1º contato', 'violeta', 4));
  cartoes.push(cartaoDaProdutividade(idRet, 'Com 2º contato', 'preenchido',
    'Data do 2º contato', 'violeta', 5));
  cartoes.push(cartaoDaProdutividade(idRet, 'Pendentes', 'situacao', 'Pendente', 'atencao', 6));
  cartoes.push(cartaoDaProdutividade(idRet, 'Não trabalhados', 'situacao',
    'Não trabalhado', 'ruim', 7));

  cartoes.push(cartaoDaProdutividade(idCanal, 'Casos cadastrados', 'total', '', 'destaque', 1));
  cartoes.push(cartaoDaProdutividade(idCanal, 'Concluídos', 'situacao', 'Concluído', 'bom', 2));
  cartoes.push(cartaoDaProdutividade(idCanal, 'Concluídos na célula', 'situacao',
    'Concluído na célula', 'bom', 3));
  cartoes.push(cartaoDaProdutividade(idCanal, 'Em andamento', 'situacao',
    'Em andamento', 'atencao', 4));

  // ---- os gráficos do Painel Analítico ------------------------------------
  // Cada um responde a UMA pergunta. Gráfico que não responde pergunta
  // nenhuma é enfeite, e enfeite numa tela de trabalho é ruído.
  function novoGrafico(canalId, titulo, tipo, dimensao, agregacao, medida,
    limite, largura, ordem) {
    return {
      Tela: 'painelAnalitico', CanalId: canalId, Titulo: titulo,
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
  // recorte por área já existe sem gráfico nenhum — é o seletor de canal no
  // alto da tela, e cado canal tem os gráficos dela. O que faltava era ver a
  // distribuição DENTRO da área, e é isto.
  cartoes.push(novoGrafico(idRet, 'Casos por analista',
    'barrasDeitadas', 'analista', 'contagem', '', 6, 1, 6));
  // OS DOIS DO TOMBAMENTO, que a operação pediu: "no dia 05 incluímos 100
  // casos da base de inadimplentes Vida Presente". São duas perguntas, e por
  // isso dois gráficos — QUANDO entraram, e DE QUAL base.
  //
  // Largura 2 no de datas: uma barra por dia ao longo de um mês não cabe em
  // meia tela sem as datas virarem uma escadinha ilegível.
  cartoes.push(novoGrafico(idRet, 'Casos tombados por dia',
    'barrasComLinha', 'Data do tombamento', 'contagem', '', 0, 2, 7));
  cartoes.push(novoGrafico(idRet, 'De qual base os casos vieram',
    'barrasDeitadas', 'Origem do tombamento', 'contagem', '', 6, 1, 8));

  cartoes.push(novoGrafico(idCanal, 'Entradas por dia, e a tendência',
    'barrasComLinha', 'Data de entrada', 'contagem', '', 0, 2, 1));
  cartoes.push(novoGrafico(idCanal, 'Situação dos casos',
    'pizza', 'Status', 'contagem', '', 6, 1, 2));
  cartoes.push(novoGrafico(idCanal, 'Casos por corretora',
    'barrasDeitadas', 'Corretora', 'contagem', '', 6, 1, 3));
  cartoes.push(novoGrafico(idCanal, 'Casos por canal de entrada',
    'barras', 'Canal', 'contagem', '', 6, 1, 4));
  cartoes.push(novoGrafico(idCanal, 'Casos por analista',
    'barrasDeitadas', 'Analista', 'contagem', '', 6, 1, 5));
  // A Mesa também tomba: casos planilhados de corretoras, para ação
  // diferenciada. Mesmos dois gráficos, mesma pergunta.
  cartoes.push(novoGrafico(idCanal, 'Casos tombados por dia',
    'barrasComLinha', 'Data do tombamento', 'contagem', '', 0, 2, 6));
  cartoes.push(novoGrafico(idCanal, 'De qual base os casos vieram',
    'barrasDeitadas', 'Origem do tombamento', 'contagem', '', 6, 1, 7));

  return cartoes;
}

function novoItemDeCatalogo_(tipo, canalId, nome, ordem, cor, colunaDeCarimbo) {
  return {
    CanalId: canalId,
    Tipo: tipo,
    Codigo: '',
    Nome: nome,
    Rotulo: nome,
    PaiId: '',
    Cor: cor || '',
    // Em qual coluna da base gravar data e hora quando o caso CHEGAR a este
    // status. Só status usa; o resto do catálogo ignora.
    ColunaDeCarimbo: colunaDeCarimbo || '',
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
  /*
   * A SEQUÊNCIA E AS SEÇÕES SÃO AS QUE A OPERAÇÃO PEDIU, campo a campo.
   *
   * `ordem` manda na posição na tela — não a ordem das colunas na planilha.
   * São coisas diferentes de propósito: a coluna nasce onde o histórico a
   * deixou, e o formulário segue o caminho que quem atende percorre ao
   * telefone. Amarrar um ao outro obrigaria a mexer na base para mudar a tela.
   *
   * Campo da base que a operação não listou não é apagado: vai para a seção
   * "Outros" no fim, ligado. Apagar perderia dado já gravado, e desligar
   * calado esconderia o que alguém ainda usa. Tudo isso é editável em
   * Configurações › Campos — aqui é só o ponto de partida.
   */

  // ==========================================================================
  // RET VIDA
  // ==========================================================================

  // --- Caso
  dataderecepcaodoprotocolo: { secao: 'Caso', ordem: 1, rotulo: 'Data',
    valorPadrao: '@HOJE' },
  protocolo: { secao: 'Caso', ordem: 2, rotulo: 'Protocolo', obrigatorio: false },
  analista: { secao: 'Caso', ordem: 3, rotulo: 'Analista', tipoCampo: 'seletor',
    listaDe: 'usuarios', valorPadrao: '@EU', travaPara: ['Analista'] },
  canal: { secao: 'Caso', ordem: 4, rotulo: 'Canal de origem',
    tipoCampo: 'seletor', catalogo: 'CANAL_ORIGEM' },
  nomedequemtransferiu: { secao: 'Caso', ordem: 5,
    rotulo: 'Nome de quem transferiu', obrigatorio: false,
    mostrarSe: { campo: 'canal', valor: 'Central' } },

  // --- Cliente
  nomedocliente: { secao: 'Cliente', ordem: 10, rotulo: 'Nome do cliente',
    obrigatorio: true, largura: 2 },
  cpf: { secao: 'Cliente', ordem: 11, rotulo: 'CPF', tipoCampo: 'documento',
    mascara: '000.000.000-00' },
  telefonesdecontato: { secao: 'Cliente', ordem: 12,
    rotulo: 'Telefone de contato', tipoCampo: 'telefone' },
  email: { secao: 'Cliente', ordem: 13, rotulo: 'E-mail', tipoCampo: 'email' },

  // --- Seguro
  codigoorigemdaproposta: { secao: 'Seguro', ordem: 20,
    rotulo: 'Código origem da proposta' },
  numerodaproposta: { secao: 'Seguro', ordem: 21, rotulo: 'Número da proposta' },
  // Um seletor só para código e nome do produto, no formato "1234 - VIDA
  // INDIVIDUAL". Quem atende escolhe uma coisa; a planilha recebe duas, em
  // colunas separadas, porque o painel agrupa por código e o relatório mostra
  // o nome. Quem separa é o servidor, ao gravar — ver separarCodigoENome_.
  codproduto: { secao: 'Seguro', ordem: 22, rotulo: 'Cód. do produto e produto',
    tipoCampo: 'seletor', catalogo: 'PRODUTO', largura: 2,
    separaEm: { codigo: 'cod produto', nome: 'produto' } },
  produto: { secao: 'Seguro', ordem: 23, ativo: false },
  // Sem o underscore: a chave técnica sai de normalizarParaComparar_, que
  // tira acento, caixa e pontuação. "cod_sucursal" na planilha vira
  // "codsucursal" aqui — escrever com underscore faria o campo cair em
  // "Outros" sem nenhum erro, que foi o que aconteceu na primeira tentativa.
  codsucursal: { secao: 'Seguro', ordem: 24, rotulo: 'Cod_sucursal' },
  codramo: { secao: 'Seguro', ordem: 25, rotulo: 'Cod_ramo' },
  numapolice: { secao: 'Seguro', ordem: 26, rotulo: 'Número da apólice' },
  valordopremio: { secao: 'Seguro', ordem: 27, rotulo: 'Valor do prêmio anual' },
  premiomensalretido: { secao: 'Seguro', ordem: 28,
    rotulo: 'Valor do prêmio mensal' },
  valordopremioretido: { secao: 'Seguro', ordem: 29,
    rotulo: 'Valor do prêmio retido' },
  formadepagamento: { secao: 'Seguro', ordem: 30, rotulo: 'Forma de pagamento',
    tipoCampo: 'seletor', catalogo: 'FORMA_PAGAMENTO' },
  dadosdopagamento: { secao: 'Seguro', ordem: 31, rotulo: 'Dados de pagamento',
    mostrarSe: { campo: 'formadepagamento', valor: 'ADC - TODAS PARCELAS' } },

  // --- Corretora
  // A SUSEP não tem campo "bloqueada?" para digitar, e isso é decisão: a
  // resposta está na base de SUSEPs bloqueadas, e o selo ao lado do campo já
  // a mostra no instante em que a SUSEP é digitada — verde para liberada,
  // vermelho para bloqueada. Um campo digitado ao lado de um selo automático
  // seria a mesma informação em dois lugares, divergindo no primeiro dia.
  susep: { secao: 'Corretora', ordem: 40, rotulo: 'SUSEP' },
  segmento: { secao: 'Corretora', ordem: 41, rotulo: 'Segmento',
    tipoCampo: 'seletor', catalogo: 'SEGMENTO' },

  // --- Situação
  motivodocancelamento: { secao: 'Situação', ordem: 50,
    rotulo: 'Motivo do cancelamento', tipoCampo: 'seletor', catalogo: 'MOTIVO' },
  // Nasce NÃO TRABALHADO, por decisão da operação: quem cadastra registra o
  // caso; quem trabalha ajusta o status depois. Deixar em branco obrigaria a
  // escolher na hora do cadastro, que é justamente quando ainda não se sabe.
  status: { secao: 'Situação', ordem: 51, rotulo: 'Status', tipoCampo: 'seletor',
    catalogo: 'STATUS', obrigatorio: true, valorPadrao: 'Não trabalhado' },
  tentativasdecontato: { secao: 'Situação', ordem: 52,
    rotulo: 'Tentativas de contato', tipoCampo: 'seletor', catalogo: 'TENTATIVA' },
  datadatransmissao: { secao: 'Situação', ordem: 53,
    rotulo: 'Data da transmissão' },
  novocodorigemproposta: { secao: 'Situação', ordem: 54,
    rotulo: 'Cód. origem da nova proposta' },
  novonumerodaproposta: { secao: 'Situação', ordem: 55,
    rotulo: 'Nº da nova proposta' },

  // --- Outros: da base, fora da lista da operação. Ficam ligados.
  grupo: { secao: 'Outros', ordem: 90 },
  sistema: { secao: 'Outros', ordem: 91 },
  agentedacentral: { secao: 'Outros', ordem: 92 },
  relacionamento: { secao: 'Outros', ordem: 93 },
  contato: { secao: 'Outros', ordem: 94 },
  descricao: { secao: 'Outros', ordem: 95, largura: 3 },

  // ==========================================================================
  // MESA DIAMANTE
  // ==========================================================================

  // --- Caso
  datadeentrada: { secao: 'Caso', ordem: 1,
    rotulo: 'Data de recepção do caso', valorPadrao: '@HOJE' },
  horario: { secao: 'Caso', ordem: 2, rotulo: 'Horário de recepção' },
  titulodoemail: { secao: 'Caso', ordem: 4, rotulo: 'Título do e-mail',
    largura: 2 },
  assunto: { secao: 'Caso', ordem: 5, tipoCampo: 'seletor',
    catalogo: 'ASSUNTO', largura: 2 },

  // --- Situação
  aberturaindevida: { secao: 'Situação', ordem: 13,
    rotulo: 'Abertura indevida?' },

  // --- Cliente
  nomedosegurado: { secao: 'Cliente', ordem: 20, rotulo: 'Nome',
    obrigatorio: true, largura: 2 },
  documentocpf: { secao: 'Cliente', ordem: 21, rotulo: 'CPF',
    tipoCampo: 'documento', mascara: '000.000.000-00' },

  // --- Corretora
  corretora: { secao: 'Corretora', ordem: 31, rotulo: 'Nome da corretora' },
  ramo: { secao: 'Corretora', ordem: 32, tipoCampo: 'seletor', catalogo: 'RAMO' },

  // --- Encaminhamento
  arearesponsavel: { secao: 'Encaminhamento', ordem: 40, tipoCampo: 'seletor',
    catalogo: 'AREA' },
  dataresposta: { secao: 'Encaminhamento', ordem: 41,
    rotulo: 'Data da resposta' },
  horaresposta: { secao: 'Encaminhamento', ordem: 42,
    rotulo: 'Horário da resposta' },
  datadafinalizacao: { secao: 'Encaminhamento', ordem: 43,
    rotulo: 'Data da finalização' },
  horariodafinalizacao: { secao: 'Encaminhamento', ordem: 44,
    rotulo: 'Horário da finalização' }
};

/*
 * Os campos que as DUAS bases têm com o mesmo nome técnico, e que precisam de
 * seção e ordem diferentes em cada uma.
 *
 * `analista`, `status`, `canal`, `susep` e `tipo` existem nos dois canais. O
 * mapa acima guarda um valor por chave, então o que difere mora aqui, por
 * aba. Sem isto, a Mesa Diamante herdaria as seções da RET — e o Status
 * apareceria numa seção "Situação" que na Mesa vem antes do Cliente.
 */
const RECC_PADRAO_POR_ABA = {
  BASE_MESA: {
    analista: { secao: 'Caso', ordem: 3, tipoCampo: 'seletor',
      listaDe: 'usuarios', valorPadrao: '@EU', travaPara: ['Analista'] },
    status: { secao: 'Situação', ordem: 10, tipoCampo: 'seletor',
      catalogo: 'STATUS', obrigatorio: true, valorPadrao: 'Em andamento' },
    canal: { secao: 'Situação', ordem: 11, rotulo: 'Canal de origem',
      tipoCampo: 'seletor', catalogo: 'CANAL' },
    tipo: { secao: 'Situação', ordem: 12, tipoCampo: 'seletor',
      catalogo: 'TIPO' },
    susep: { secao: 'Corretora', ordem: 30, rotulo: 'SUSEP' }
  }
};

/**
 * Um campo de formulário para cada coluna da base.
 *
 * As colunas de controle (_Visivel e companhia) ficam de fora: elas são do
 * sistema, não do formulário. A coluna Id entra desativada — precisa estar no
 * mapa, mas ninguém digita um Id.
 *
 * Também entram desativadas as colunas marcadas `preenchidoPeloSistema` no
 * Esquema: os carimbos de status e as duas do tombamento. Elas PRECISAM estar
 * em CAMPOS — é lá que mora o tipo da coluna, e sem isso a data do carimbo
 * voltaria a ser lida como texto — mas não são campo de tela. Quem quiser
 * ligar uma delas no formulário liga em Configurações; ninguém precisa mexer
 * em código para isso.
 */
function camposDoFormularioDaBase_(nomeDaAba, canalId) {
  var esquema = esquemaDaAba_(nomeDaAba);
  var campos = [];
  var daAba = RECC_PADRAO_POR_ABA[nomeDaAba] || {};
  var semLugarNaLista = 900;

  esquema.colunas.forEach(function (coluna) {
    if (coluna.cabecalho.charAt(0) === '_') return;

    var chave = normalizarParaComparar_(coluna.cabecalho);
    var ehId = (chave === 'id');
    var quemPreencheEhOSistema = (coluna.preenchidoPeloSistema === true);

    // O que vale para ESTA aba vence o que vale para todas: `status` e
    // `canal` existem nos dois canais, em seções diferentes.
    var padrao = daAba[chave] || RECC_PADRAO_DO_FORMULARIO[chave] || {};

    var configuracao = {};
    if (padrao.catalogo) configuracao.catalogo = padrao.catalogo;
    if (padrao.listaDe) configuracao.listaDe = padrao.listaDe;
    if (padrao.largura) configuracao.largura = padrao.largura;
    if (padrao.mostrarSe) configuracao.mostrarSe = padrao.mostrarSe;
    if (padrao.travaPara) configuracao.travaPara = padrao.travaPara;
    if (padrao.separaEm) configuracao.separaEm = padrao.separaEm;

    campos.push({
      CanalId: canalId,
      Aba: nomeDaAba,
      ChaveTecnica: chave,
      Cabecalho: coluna.cabecalho,
      // O rótulo é o que a pessoa LÊ; o cabeçalho é o que está gravado. Poder
      // trocar um sem mexer no outro é o que permite escrever "Valor do
      // prêmio anual" na tela sem renomear uma coluna com dado dentro.
      Rotulo: padrao.rotulo || coluna.cabecalho,
      Descricao: '',
      TipoCampo: padrao.tipoCampo || RECC_DO_DADO_PARA_O_CAMPO[coluna.tipo] || 'texto',
      Secao: padrao.secao || (quemPreencheEhOSistema ? 'Preenchido pelo sistema' : 'Outros'),
      Mascara: padrao.mascara || '',
      Obrigatorio: padrao.obrigatorio === true,
      Protegido: coluna.protegido === true,
      Ativo: !ehId && !quemPreencheEhOSistema && padrao.ativo !== false,
      // A ordem vem da LISTA da operação, não da posição da coluna na
      // planilha. Coluna sem lugar declarado cai no fim, junto das outras.
      Ordem: padrao.ordem || (semLugarNaLista++),
      VisivelPara: '',
      ValorPadrao: padrao.valorPadrao || '',
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
 * A segunda metade nasceu de um caso real: o `Comuns.html` ficou para trás
 * na cópia, e o sistema só disse "nenhum arquivo html com o nome Formulario
 * foi encontrado", com um número de linha. Nenhum teste rodado fora do Apps
 * Script pega isso — os testes leem a PASTA do repositório, onde o arquivo
 * está; quem não tem o arquivo é o PROJETO.
 *
 * Para a conferência completa — sequências, Ids, canais, campos, permissões —
 * existe `diagnosticoRECC()`. As duas leem o mesmo `conferirEstrutura_`: não
 * há duas versões da regra, há uma curta e uma completa.
 */
/**
 * ----------------------------------------------------------------------------
 * A MIGRAÇÃO DE QUEM JÁ TEM O PGO INSTALADO
 * ----------------------------------------------------------------------------
 * Rode `migrarParaCanais()` UMA vez, no editor do Apps Script, sobre uma
 * planilha que já tem dado. Ela NÃO apaga nada.
 *
 * POR QUE ELA EXISTE. Numa rodada, "mesa" virou "canal" em todo o sistema, e
 * a aba CANAIS — que guardava CORRETORAS — cedeu o nome. Uma instalação feita
 * antes disso continua com as abas antigas, e o código novo procura as novas:
 * o sistema abre, mas sem canal nenhum, e o Dashboard nasce vazio.
 *
 * O `instalarRECC()` não serve aqui: ele recusa rodar sobre planilha com dado,
 * de propósito. Sem esta função, a única saída seria apagar tudo e recomeçar —
 * e quem já cadastrou usuários e casos perderia os dois.
 *
 * O QUE ELA FAZ, e só isso: renomeia as duas abas, renomeia a coluna que
 * mudou de nome e acrescenta as colunas novas do contrato.
 *
 * O QUE ELA NÃO FAZ, de propósito: não mexe em CAMPOS, PAINEIS nem CATALOGO
 * além do nome da coluna. O formulário, os cartões e as listas ganharam
 * padrões novos, mas a sua instalação pode ter sido ajustada à mão — e
 * sobrescrever ajuste de configuração é perder trabalho em silêncio. Para
 * pegar os padrões novos, use Configurações, ou reinstale numa planilha vazia.
 *
 * É SEGURO RODAR DE NOVO: cada passo confere antes de agir, e uma segunda
 * execução não faz nada.
 * ----------------------------------------------------------------------------
 */
function migrarParaCanais() {
  var planilha = planilhaAtiva_();
  var feito = [];
  var pulados = [];

  // --- 1. as abas, NESTA ORDEM -------------------------------------------
  // CANAIS (corretoras) tem de sair do caminho ANTES de MESAS assumir o nome.
  // Invertendo, a segunda renomeação encontraria o nome ocupado — e o Sheets
  // aceitaria criar "CANAIS 2", deixando duas abas parecidas e nenhuma certa.
  var corretoras = planilha.getSheetByName('CANAIS');
  var canaisNovo = planilha.getSheetByName('CANAIS');
  var mesas = planilha.getSheetByName('MESAS');

  // Só é a aba de corretoras se tiver a cara dela: uma instalação já migrada
  // tem uma CANAIS que é de canais, e renomeá-la seria desfazer a migração.
  if (corretoras && !planilha.getSheetByName('CORRETORAS')
    && ehAAbaDeCorretoras_(corretoras)) {
    corretoras.setName('CORRETORAS');
    feito.push('aba CANAIS (corretoras) renomeada para CORRETORAS');
  } else if (planilha.getSheetByName('CORRETORAS')) {
    pulados.push('CORRETORAS já existe');
  }

  if (mesas && !planilha.getSheetByName('CANAIS')) {
    mesas.setName('CANAIS');
    feito.push('aba MESAS renomeada para CANAIS');
  } else if (!mesas) {
    pulados.push('MESAS não existe (já migrada?)');
  }

  esquecerEstruturaLida_();

  // --- 2. a coluna que mudou de nome -------------------------------------
  ['USUARIOS', 'CAMPOS', 'PAINEIS', 'ANALISES', 'CATALOGO'].forEach(function (nome) {
    var aba = planilha.getSheetByName(nome);
    if (!aba) return;
    var cabecalhos = aba.getRange(1, 1, 1, aba.getMaxColumns()).getValues()[0];
    for (var i = 0; i < cabecalhos.length; i++) {
      if (normalizarParaComparar_(cabecalhos[i]) === 'mesaid') {
        // Só o CABEÇALHO muda. Os Ids gravados nas linhas continuam os
        // mesmos — é a mesma coluna, com outro nome.
        aba.getRange(1, i + 1).setValue('CanalId');
        feito.push(nome + '.MesaId renomeada para CanalId');
        return;
      }
    }
  });

  esquecerEstruturaLida_();

  // --- 3. AS SEQUÊNCIAS DE Id, que carregam o nome da aba ----------------
  //
  // Este é o passo que não pode faltar, e é o menos óbvio de todos.
  //
  // A sequência de cada aba mora no PropertiesService sob a chave
  // RECC_SEQ_<NOME DA ABA>. Ao renomear a aba, a chave antiga fica órfã e a
  // nova não existe — então a sequência recomeça do zero e a próxima gravação
  // REEMITE UM Id JÁ EM USO.
  //
  // Foi exatamente isso que custou 4.328 colisões no PGO 5.x. Aqui o
  // diagnóstico pega ("a sequência está ABAIXO do maior Id gravado"), mas
  // pegar depois de gravar é tarde: o Id duplicado já está na planilha.
  //
  // A ordem é a mesma das abas, e pelo mesmo motivo: CANAIS precisa ceder a
  // chave antes de MESAS assumi-la.
  var propriedades = PropertiesService.getScriptProperties();
  [['CANAIS', 'CORRETORAS'], ['MESAS', 'CANAIS']].forEach(function (par) {
    var chaveVelha = RECC_PREFIXO_DA_SEQUENCIA + par[0];
    var chaveNova = RECC_PREFIXO_DA_SEQUENCIA + par[1];
    var valor = propriedades.getProperty(chaveVelha);
    if (valor === null || valor === undefined) {
      pulados.push('sequência ' + chaveVelha + ' não existe');
      return;
    }
    propriedades.setProperty(chaveNova, valor);
    propriedades.deleteProperty(chaveVelha);
    feito.push('sequência ' + chaveVelha + ' virou ' + chaveNova
      + ' (em ' + valor + ')');
  });

  // --- 4. as colunas novas do contrato -----------------------------------
  [['CORRETORAS', 'Consultor', 'texto'],
   ['CATALOGO', 'ColunaDeCarimbo', 'texto'],
   ['BASE_RET', 'nome de quem transferiu', 'texto']].forEach(function (par) {
    var aba = planilha.getSheetByName(par[0]);
    if (!aba) { pulados.push('aba ' + par[0] + ' não existe'); return; }
    if (posicaoDaColuna_(estruturaDaAba_(par[0]), par[1]) >= 0) {
      pulados.push(par[0] + '.' + par[1] + ' já existe');
      return;
    }
    adicionarColuna_(par[0], par[1], par[2]);
    feito.push(par[0] + '.' + par[1] + ' criada');
  });

  esquecerEstruturaLida_();

  var recado = 'MIGRAÇÃO PARA CANAIS\n\n'
    + (feito.length ? 'FEITO:\n  ' + feito.join('\n  ') : 'Nada a fazer.')
    + (pulados.length ? '\n\nJÁ ESTAVA ASSIM:\n  ' + pulados.join('\n  ') : '')
    + '\n\nAgora rode diagnosticoRECC() para conferir o que sobrou.';
  Logger.log(recado);
  return recado;
}

/**
 * Esta aba é o cadastro de corretoras, e não o de canais?
 *
 * As duas se chamaram CANAIS em momentos diferentes. O que as distingue é a
 * coluna SUSEP: corretora tem, canal de atendimento não. Decidir pelo nome
 * seria decidir pelo que é ambíguo — e renomear a aba errada trocaria o
 * cadastro de canais pelo de corretoras, sem erro nenhum na hora.
 */
function ehAAbaDeCorretoras_(aba) {
  var cabecalhos = aba.getRange(1, 1, 1, aba.getMaxColumns()).getValues()[0];
  var temSusep = false;
  var temAba = false;
  cabecalhos.forEach(function (texto) {
    var chave = normalizarParaComparar_(texto);
    if (chave === 'susep') temSusep = true;
    if (chave === 'aba') temAba = true;
  });
  return temSusep && !temAba;
}

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

/* ############################################################################
   #
   #  SEÇÃO 2 de 2 · O LAUDO QUE RODA DENTRO DO APPS SCRIPT
   #
   #  Era o arquivo Back-End/Diagnostico.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * ============================================================================
 * RECC — Diagnostico.gs · o laudo que roda DENTRO do Apps Script
 * ============================================================================
 * A suíte de testes prova que o código está certo. Ela não prova que ESTA
 * instalação está certa: a planilha é editável à mão, e o que a suíte conferiu
 * numa planilha de mentira pode não valer na de verdade seis meses depois.
 *
 * Este arquivo é a outra metade. Ele roda na instalação real e responde uma
 * pergunta só: **este sistema, aqui, agora, está inteiro?**
 *
 * Duas portas:
 *
 *   diagnosticoRECC()       no editor do Apps Script, sem abrir o sistema.
 *                           Escreve o laudo no log e devolve o objeto.
 *   diagnosticoDoSistema()  pela tela, em Configurações › Estrutura.
 *
 * Existe ainda `verificarEstruturaRECC()`, no Instalador: ela confere SÓ a
 * estrutura das abas, em dois segundos, e é a que se roda logo depois de
 * copiar os arquivos. As duas leem o mesmo `conferirEstrutura_` — não há duas
 * versões da regra, há uma conferência curta e uma completa.
 *
 * ---------------------------------------------------------------------------
 * A REGRA QUE MANDA NESTE ARQUIVO
 * ---------------------------------------------------------------------------
 * **Bloco que não consegue rodar é FALHA, nunca "pulado".**
 *
 * Está escrito nas armadilhas herdadas do PGO 5.x, e custou caro lá: o
 * diagnóstico antigo, quando um arquivo faltava, pulava o bloco que dependia
 * dele — e terminava aprovando o build. Um verificador que aprova o que não
 * conseguiu verificar é pior que verificador nenhum: ele dá confiança sem
 * base.
 *
 * Por isso `rodarBloco_` embrulha cada bloco: qualquer erro dentro dele vira
 * um item de falha, com o erro escrito. Nunca some.
 *
 * ---------------------------------------------------------------------------
 * TRÊS SITUAÇÕES, E O QUE CADA UMA QUER DIZER
 * ---------------------------------------------------------------------------
 *   ok       está como deveria.
 *   atencao  funciona, mas alguém precisa olhar. Coluna a mais na planilha,
 *            campo obrigatório desligado. Nada quebra hoje.
 *   falha    alguma coisa vai dar errado, ou já está dando. Aba faltando,
 *            Id repetido, canal apontando para coluna que não existe.
 * ============================================================================
 */

var RECC_SITUACOES_DO_LAUDO = { OK: 'ok', ATENCAO: 'atencao', FALHA: 'falha' };

/**
 * Quantas linhas de exemplo o laudo cita quando encontra muitas iguais.
 * Listar duzentos Ids repetidos não ajuda ninguém a arrumar o primeiro.
 */
var RECC_EXEMPLOS_NO_LAUDO = 5;

// ============================================================================
// AS DUAS PORTAS
// ============================================================================

/**
 * Para rodar no editor do Apps Script, direto, sem abrir o sistema.
 *
 * É a porta que importa quando o sistema NÃO abre: se `doGet` está quebrado,
 * a tela não serve para diagnosticar nada. Esta função não exige permissão
 * nem senha, e não precisa: quem consegue abrir o editor do Apps Script já
 * tem acesso a tudo, e negar aqui só atrapalharia quem foi consertar.
 */
function diagnosticoRECC() {
  var laudo = rodarDiagnostico_();
  Logger.log(laudoEmTexto_(laudo));
  return laudo;
}

/** A mesma coisa, pedida pela tela de Configurações. */
function diagnosticoDoSistema() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var laudo = rodarDiagnostico_();
  registrarAuditoria_('diagnostico.rodar', '', '',
    laudo.resumo.falhas + ' falha(s), ' + laudo.resumo.atencoes + ' atenção(ões)');
  return laudo;
}

// ============================================================================
// O LAUDO
// ============================================================================

function rodarDiagnostico_() {
  var blocos = [
    rodarBloco_('ambiente', 'O ambiente', blocoDoAmbiente_),
    rodarBloco_('estrutura', 'A estrutura da planilha', blocoDaEstrutura_),
    rodarBloco_('sequencias', 'As sequências de Id', blocoDasSequencias_),
    rodarBloco_('identificadores', 'Os identificadores gravados', blocoDosIds_),
    rodarBloco_('canais', 'Os canais', blocoDasCanais_),
    rodarBloco_('campos', 'Os campos do formulário', blocoDosCampos_),
    rodarBloco_('paineis', 'Os cards e os gráficos', blocoDosPaineis_),
    rodarBloco_('analises', 'As análises', blocoDasAnalises_),
    rodarBloco_('acesso', 'Quem entra e o que pode', blocoDoAcesso_),
    rodarBloco_('tela', 'A ligação entre a tela e o servidor', blocoDaTela_),
    rodarBloco_('estilos', 'A folha de estilos', blocoDosEstilos_)
  ];

  var resumo = { total: 0, oks: 0, atencoes: 0, falhas: 0 };
  blocos.forEach(function (bloco) {
    bloco.itens.forEach(function (item) {
      resumo.total++;
      if (item.situacao === RECC_SITUACOES_DO_LAUDO.FALHA) resumo.falhas++;
      else if (item.situacao === RECC_SITUACOES_DO_LAUDO.ATENCAO) resumo.atencoes++;
      else resumo.oks++;
    });
    bloco.situacao = piorSituacao_(bloco.itens);
  });

  return {
    quando: Utilities.formatDate(new Date(), RECC_FUSO_HORARIO,
      'dd/MM/yyyy HH:mm'),
    aprovado: resumo.falhas === 0,
    resumo: resumo,
    blocos: blocos
  };
}

/**
 * Roda um bloco e garante que ele apareça no laudo aconteça o que acontecer.
 *
 * É AQUI que mora a regra do arquivo. Um bloco que estoura — porque a aba de
 * que ele depende sumiu, porque uma função dele foi renomeada — vira uma
 * falha com o erro escrito, e não um bloco ausente. Bloco ausente passa
 * despercebido; falha escrita, não.
 */
function rodarBloco_(chave, titulo, funcao) {
  try {
    var itens = funcao();
    if (!itens || !itens.length) {
      // Bloco que não produziu item nenhum também é suspeito: ou não rodou,
      // ou não tem o que conferir — e nos dois casos alguém precisa olhar.
      return { chave: chave, titulo: titulo, itens: [item_(
        RECC_SITUACOES_DO_LAUDO.FALHA, 'O bloco não conferiu nada',
        'A verificação rodou e não devolveu nenhum item.',
        'É defeito do próprio diagnóstico. Veja a função do bloco "'
          + chave + '" em Instalacao.gs.')] };
    }
    return { chave: chave, titulo: titulo, itens: itens };
  } catch (erro) {
    return { chave: chave, titulo: titulo, itens: [item_(
      RECC_SITUACOES_DO_LAUDO.FALHA, 'A verificação não conseguiu rodar',
      erro.message,
      'Este bloco não foi conferido. Um verificador que aprova o que não '
        + 'conseguiu verificar dá confiança sem base — por isso isto conta '
        + 'como falha, e não como bloco pulado.')] };
  }
}

function item_(situacao, oQue, detalhe, comoArrumar) {
  return {
    situacao: situacao,
    oQue: oQue,
    detalhe: detalhe || '',
    comoArrumar: comoArrumar || ''
  };
}

function piorSituacao_(itens) {
  var pior = RECC_SITUACOES_DO_LAUDO.OK;
  itens.forEach(function (item) {
    if (item.situacao === RECC_SITUACOES_DO_LAUDO.FALHA) {
      pior = RECC_SITUACOES_DO_LAUDO.FALHA;
    } else if (item.situacao === RECC_SITUACOES_DO_LAUDO.ATENCAO
      && pior !== RECC_SITUACOES_DO_LAUDO.FALHA) {
      pior = RECC_SITUACOES_DO_LAUDO.ATENCAO;
    }
  });
  return pior;
}

/** 'a, b, c e mais 12' — para não despejar duzentos exemplos no laudo. */
function algunsExemplos_(lista) {
  var mostrados = lista.slice(0, RECC_EXEMPLOS_NO_LAUDO).join(', ');
  var sobram = lista.length - RECC_EXEMPLOS_NO_LAUDO;
  return sobram > 0 ? mostrados + ' e mais ' + sobram : mostrados;
}

// ============================================================================
// OS BLOCOS
// ============================================================================

function blocoDoAmbiente_() {
  var itens = [];
  var planilha = planilhaAtiva_();

  var fuso = planilha.getSpreadsheetTimeZone();
  itens.push(fuso === RECC_FUSO_HORARIO
    ? item_(RECC_SITUACOES_DO_LAUDO.OK, 'O fuso da planilha é ' + fuso)
    : item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'A planilha está em outro fuso',
      'A planilha diz "' + fuso + '" e o sistema conta o dia em "'
        + RECC_FUSO_HORARIO + '".',
      'Arquivo › Configurações da planilha › Fuso horário. Enquanto estiver '
        + 'diferente, um caso registrado depois das 21 h cai no dia seguinte.'));

  // O teto de 10 milhões de células é o único limite duro da plataforma, e o
  // único que não avisa antes: a planilha simplesmente para de aceitar linha
  // nova. Ver a porcentagem subindo é o que dá tempo de planejar a segunda
  // planilha em vez de descobrir numa terça-feira de manhã.
  var orcamento = orcamentoDeCelulas_(planilha);
  itens.push(orcamento.percentual < 80
    ? item_(RECC_SITUACOES_DO_LAUDO.OK,
      'Células: ' + orcamento.percentual + '% do teto da planilha',
      orcamento.usadas.toLocaleString('pt-BR') + ' de '
        + RECC_TETO_DE_CELULAS.toLocaleString('pt-BR') + '.')
    : item_(orcamento.percentual < 95
      ? RECC_SITUACOES_DO_LAUDO.ATENCAO : RECC_SITUACOES_DO_LAUDO.FALHA,
      'Células: ' + orcamento.percentual + '% do teto da planilha',
      orcamento.usadas.toLocaleString('pt-BR') + ' de '
        + RECC_TETO_DE_CELULAS.toLocaleString('pt-BR')
        + '. No teto, a planilha para de aceitar linha nova.',
      'Apague as abas ANALISE_* que ninguém usa mais — elas são as maiores e '
        + 'a próxima geração as refaz. Se não bastar, é hora de mover o '
        + 'histórico antigo para uma planilha de arquivo e apontá-la como '
        + 'planilha legada.'));

  itens.push(existeSenhaDeAdministrador_()
    ? item_(RECC_SITUACOES_DO_LAUDO.OK, 'A senha de administrador está definida')
    : item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
      'Não há senha de administrador',
      'As ações sem desfazer — criar coluna, importar em lote, regerar uma '
        + 'aba de análise — estão travadas.',
      'Configurações › Identidade › Senha de administrador.'));

  return itens;
}

function blocoDaEstrutura_() {
  var itens = [];
  var laudo = conferirEstrutura_();

  laudo.abas.forEach(function (aba) {
    if (!aba.existe) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        'A aba ' + aba.aba + ' não existe',
        'Ela faz parte do contrato e o sistema conta com ela.',
        'Rode instalarRECC() de novo: ela cria o que falta e não mexe no que '
          + 'já está lá.'));
      return;
    }
    if (aba.faltando.length) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        aba.aba + ': ' + aba.faltando.length + ' coluna(s) do contrato faltando',
        algunsExemplos_(aba.faltando),
        'Acrescente a coluna com o cabeçalho exato. O vínculo é pelo NOME do '
          + 'cabeçalho, nunca pela posição — então a ordem não importa.'));
      return;
    }
    if (aba.aMais.length) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
        aba.aba + ': ' + aba.aMais.length + ' coluna(s) fora do contrato',
        algunsExemplos_(aba.aMais),
        'Nada quebra: o sistema ignora o que não conhece. Mas coluna que o '
          + 'sistema não preenche fica vazia para sempre — se ela deveria '
          + 'existir, cadastre em Configurações › Campos.'));
      return;
    }
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      aba.aba + ' está no contrato', aba.linhas + ' linha(s)'));
  });

  return itens;
}

/**
 * A sequência nunca pode estar ABAIXO do maior Id gravado.
 *
 * Foi exatamente isto que reemitiu Id em uso no PGO 5.x: a sequência
 * rebaixada devolvia números que já estavam na planilha, e duas linhas
 * diferentes passavam a responder pelo mesmo identificador.
 */
function blocoDasSequencias_() {
  var itens = [];
  var props = PropertiesService.getScriptProperties();

  nomesDasAbasDoContrato_().forEach(function (nomeDaAba) {
    var esquema = esquemaDaAba_(nomeDaAba);
    var temId = esquema.colunas.filter(function (coluna) {
      return coluna.cabecalho === 'Id';
    }).length > 0;
    if (!temId) return;

    var guardado = props.getProperty(RECC_PREFIXO_DA_SEQUENCIA + nomeDaAba);
    var naAba = maiorIdentificadorDaAba_(nomeDaAba);

    if (guardado === null) {
      itens.push(naAba < 0
        ? item_(RECC_SITUACOES_DO_LAUDO.OK,
          nomeDaAba + ': sequência ainda não usada', 'A aba está vazia.')
        : item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
          nomeDaAba + ': a aba tem Ids e a sequência não foi criada',
          'Maior Id na aba: ' + formatarIdentificador_(naAba) + '.',
          'A primeira gravação se alinha sozinha com a planilha. Se quiser '
            + 'alinhar agora, use "Normalizar base".'));
      return;
    }

    var numero = Number(guardado);
    if (!isFinite(numero)) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        nomeDaAba + ': a sequência está com lixo',
        'Valor guardado: "' + guardado + '".',
        'Use "Normalizar base" nesta aba: ela realinha sem nunca baixar o piso.'));
      return;
    }
    if (numero < naAba) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        nomeDaAba + ': a sequência está ABAIXO do maior Id gravado',
        'Sequência em ' + numero + ', maior Id na aba '
          + formatarIdentificador_(naAba) + '. A próxima gravação vai reemitir '
          + 'um Id que já existe.',
        'Use "Normalizar base" nesta aba, antes de gravar qualquer coisa.'));
      return;
    }
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      nomeDaAba + ': sequência em ' + formatarIdentificador_(numero)));
  });

  return itens;
}

/**
 * Id repetido e Id em célula de formato Geral.
 *
 * As duas metades da armadilha mais cara do PGO 5.x: o Sheets converteu
 * `00000010` em `10` porque a célula era Geral, e daí saíram 4.328 colisões
 * em 200 mil registros. Uma confere a causa, a outra confere o efeito.
 */
function blocoDosIds_() {
  var itens = [];

  nomesDasAbasDoContrato_().forEach(function (nomeDaAba) {
    var estrutura = estruturaDaAba_(nomeDaAba);
    var iId = posicaoDaColuna_(estrutura, 'Id');
    if (iId < 0) return;

    var quantas = quantidadeDeRegistros_(estrutura);
    if (quantas <= 0) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK, nomeDaAba + ': aba vazia'));
      return;
    }

    var faixa = estrutura.aba.getRange(2, iId + 1, quantas, 1);
    var valores = faixa.getValues();
    var formatos = faixa.getNumberFormats();

    var vistos = {};
    var repetidos = [];
    var semId = 0;
    var geral = 0;

    for (var i = 0; i < valores.length; i++) {
      if (formatos[i][0] !== '@') geral++;

      var id = converterParaIdentificador_(valores[i][0]);
      if (!id) { semId++; continue; }
      if (vistos[id]) {
        repetidos.push(id + ' (linhas ' + vistos[id] + ' e ' + (i + 2) + ')');
      } else {
        vistos[id] = i + 2;
      }
    }

    if (geral) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        nomeDaAba + ': ' + geral + ' célula(s) de Id fora do formato texto',
        'Em formato Geral o Sheets lê "0000000010" como o número 10, e os '
          + 'zeros da frente somem. Foi assim que o sistema anterior colidiu '
          + '4.328 Ids.',
        'Selecione a coluna Id e aplique Formatar › Número › Texto simples. '
          + 'Depois confira se algum Id perdeu os zeros.'));
    }

    if (repetidos.length) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        nomeDaAba + ': ' + repetidos.length + ' Id(s) repetido(s)',
        algunsExemplos_(repetidos),
        'Duas linhas com o mesmo Id fazem a edição achar a errada. Corrija na '
          + 'planilha dando um Id novo, acima do maior já usado, à segunda.'));
    }

    if (semId) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
        nomeDaAba + ': ' + semId + ' linha(s) sem Id',
        'Linha digitada direto na planilha nasce sem Id, e sem Id o sistema '
          + 'não consegue editá-la nem ocultá-la.',
        'Use "Normalizar base" nesta aba: ela carimba Id em quem está sem, e '
          + 'não toca em mais nada da linha.'));
    }

    if (!geral && !repetidos.length && !semId) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
        nomeDaAba + ': ' + quantas + ' Id(s), todos únicos e em texto'));
    }
  });

  return itens;
}

/** Toda coluna que um canal declara precisa existir na aba dela. */
function blocoDasCanais_() {
  var itens = [];
  var canais = lerRegistros_('CANAIS');

  if (!canais.length) {
    return [item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Não há nenhum canal cadastrada',
      'Sem canal, o Dashboard, o cadastro e a busca não têm onde procurar.',
      'Rode instalarRECC() ou cadastre em Configurações › Canais.')];
  }

  var ativas = 0;

  canais.forEach(function (linha) {
    var nome = String(linha.Nome || linha.Id);
    var ligada = normalizarParaComparar_(linha.Ativo) === 'sim';
    if (ligada) ativas++;

    var nomeDaAba = String(linha.Aba || '');
    if (!planilhaAtiva_().getSheetByName(nomeDaAba)) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        'O canal "' + nome + '" aponta para uma aba que não existe',
        'Aba declarada: "' + nomeDaAba + '".',
        'Ou a aba foi renomeada na planilha, ou o nome está errado em CANAIS. '
          + 'Os dois se resolvem acertando a coluna Aba.'));
      return;
    }

    var estrutura = estruturaDaAba_(nomeDaAba);
    var problemas = [];

    [['ColunaDaData', 'coluna da data'],
     ['ColunaDaHora', 'coluna da hora'],
     ['ColunaDoStatus', 'coluna da situação'],
     ['ColunaDaFinalizacao', 'coluna da finalização'],
     ['ColunaDaAreaResponsavel', 'coluna da área responsável']
    ].forEach(function (par) {
      var cabecalho = String(linha[par[0]] || '').trim();
      if (!cabecalho) return;
      if (posicaoDaColuna_(estrutura, cabecalho) < 0) {
        problemas.push(par[1] + ' "' + cabecalho + '"');
      }
    });

    colunasCitadas_(linha.ColunasDaFila).concat(
      colunasCitadas_(linha.ColunasDaBusca)
    ).forEach(function (cabecalho) {
      if (posicaoDaColuna_(estrutura, cabecalho) < 0) {
        problemas.push('"' + cabecalho + '"');
      }
    });

    if (problemas.length) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        'O canal "' + nome + '" cita coluna que a aba não tem',
        algunsExemplos_(problemas),
        'Acerte em Configurações › Canais, ou acrescente a coluna em '
          + nomeDaAba + '. A aba tem: ' + estrutura.cabecalhos.join(', ') + '.'));
      return;
    }

    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      'O canal "' + nome + '" está coerente com ' + nomeDaAba
        + (ligada ? '' : ' (desligada)')));
  });

  if (!ativas) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Nenhum canal está ligado',
      'Existem ' + canais.length + ' canal(is) cadastrado(s), e todos desligados.',
      'Ligue pelo menos uma em Configurações › Canais. Sem canal ligada o '
        + 'Dashboard abre vazio.'));
  }

  return itens;
}

/**
 * As colunas citadas num texto de configuração, seja ele plano ou em grupos.
 *
 * ColunasDaFila aceita as duas escritas: "a,b,c" e "Grupo: a,b; Outro: c".
 * Ler só uma delas faria o diagnóstico acusar coluna inexistente num canal
 * perfeitamente configurada.
 */
function colunasCitadas_(texto) {
  var declarado = String(texto || '');
  if (!declarado.trim()) return [];

  var pedacos = declarado.indexOf(':') < 0
    ? declarado.split(',')
    : declarado.split(';').map(function (grupo) {
      var corte = grupo.indexOf(':');
      return corte < 0 ? grupo : grupo.substring(corte + 1);
    }).join(',').split(',');

  return pedacos
    .map(function (um) { return um.trim(); })
    .filter(function (um) { return um.length > 0; });
}

function blocoDosCampos_() {
  var itens = [];
  var campos = lerRegistros_('CAMPOS');

  if (!campos.length) {
    return [item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Não há nenhum campo cadastrado',
      'O formulário é montado a partir de CAMPOS. Sem linha nenhuma, o '
        + 'cadastro abre vazio.',
      'Rode instalarRECC(): ele gera os campos a partir do contrato das bases.')];
  }

  var semColuna = [];
  var obrigatoriosDesligados = [];
  var porAba = {};

  campos.forEach(function (campo) {
    var nomeDaAba = String(campo.Aba || '');
    var cabecalho = String(campo.Cabecalho || '');
    if (!nomeDaAba || !cabecalho) return;

    if (!porAba[nomeDaAba]) {
      porAba[nomeDaAba] = planilhaAtiva_().getSheetByName(nomeDaAba)
        ? estruturaDaAba_(nomeDaAba) : null;
    }
    var estrutura = porAba[nomeDaAba];

    if (!estrutura || posicaoDaColuna_(estrutura, cabecalho) < 0) {
      semColuna.push(String(campo.Rotulo || cabecalho) + ' → '
        + nomeDaAba + '.' + cabecalho);
      return;
    }
    if (normalizarParaComparar_(campo.Obrigatorio) === 'sim'
      && normalizarParaComparar_(campo.Ativo) !== 'sim') {
      obrigatoriosDesligados.push(String(campo.Rotulo || cabecalho));
    }
  });

  if (semColuna.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      semColuna.length + ' campo(s) apontam para coluna que não existe',
      algunsExemplos_(semColuna),
      'Cadastrar um caso com um desses campos preenchidos vai estourar. '
        + 'Desligue o campo em Configurações › Campos, ou acrescente a coluna.'));
  }

  if (obrigatoriosDesligados.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
      obrigatoriosDesligados.length + ' campo(s) obrigatório(s) estão desligados',
      algunsExemplos_(obrigatoriosDesligados),
      'Desligado, o campo não aparece no formulário — e a obrigatoriedade '
        + 'deixa de valer. Se ele é mesmo obrigatório, ligue; se não é, tire '
        + 'a marca de obrigatório, para o cadastro não mentir.'));
  }

  if (!semColuna.length && !obrigatoriosDesligados.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      'Os ' + campos.length + ' campos apontam para colunas que existem'));
  }

  return itens;
}

function blocoDosPaineis_() {
  var itens = [];
  var componentes = lerRegistros_('PAINEIS');

  if (!componentes.length) {
    return [item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
      'Não há nenhum card nem gráfico cadastrado',
      'O Dashboard abre só com a fila, e o Painel Analítico abre vazio.',
      'Monte em Configurações › Painéis.')];
  }

  var canaisPorId = {};
  lerRegistros_('CANAIS').forEach(function (canal) {
    canaisPorId[converterParaIdentificador_(canal.Id)] = canal;
  });

  var semCanal = [];
  var semColuna = [];

  componentes.forEach(function (componente) {
    var titulo = String(componente.Titulo || componente.Id);
    var canal = canaisPorId[converterParaIdentificador_(componente.CanalId)];
    if (!canal) {
      semCanal.push(titulo);
      return;
    }

    // Cartão do Dashboard não cita coluna: a dimensão dele é uma regra de
    // contagem ('total', 'situacao', 'naCelula'), e não um cabeçalho.
    if (normalizarParaComparar_(componente.TipoWidget) === 'cartao') return;

    var estrutura = estruturaDaAba_(String(canal.Aba || ''));
    [componente.CampoDimensao, componente.CampoMedida].forEach(function (bruto) {
      var cabecalho = String(bruto || '').trim();
      if (!cabecalho) return;
      if (posicaoDaColuna_(estrutura, cabecalho) < 0) {
        semColuna.push(titulo + ' → "' + cabecalho + '"');
      }
    });
  });

  if (semCanal.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      semCanal.length + ' componente(s) apontam para um canal que não existe',
      algunsExemplos_(semCanal),
      'Eles não aparecem em tela nenhuma. Acerte o canal ou remova em '
        + 'Configurações › Painéis.'));
  }
  if (semColuna.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      semColuna.length + ' gráfico(s) apontam para coluna que não existe',
      algunsExemplos_(semColuna),
      'O gráfico abre vazio, sem dizer por quê. Acerte em Configurações › '
        + 'Painéis › Gráficos.'));
  }
  if (!semCanal.length && !semColuna.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      'Os ' + componentes.length + ' componentes apontam para canais e colunas '
        + 'que existem'));
  }

  return itens;
}

function blocoDasAnalises_() {
  var receitas = lerRegistros_('ANALISES');
  if (!receitas.length) {
    return [item_(RECC_SITUACOES_DO_LAUDO.OK, 'Nenhuma análise montada')];
  }

  var itens = [];
  var canaisPorId = {};
  lerRegistros_('CANAIS').forEach(function (canal) {
    canaisPorId[converterParaIdentificador_(canal.Id)] = canal;
  });

  receitas.forEach(function (receita) {
    var nome = String(receita.Nome || receita.Id);
    var canal = canaisPorId[converterParaIdentificador_(receita.CanalId)];

    if (!canal) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        'A análise "' + nome + '" aponta para um canal que não existe',
        'Gerar esta análise vai estourar.',
        'Acerte o canal em Configurações › Análises, ou tire a análise da lista.'));
      return;
    }

    var estrutura = estruturaDaAba_(String(canal.Aba || ''));
    var perdidas = colunasCitadas_(receita.Colunas).filter(function (cabecalho) {
      return posicaoDaColuna_(estrutura, cabecalho) < 0;
    });

    if (perdidas.length) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        'A análise "' + nome + '" cita coluna que o canal não tem',
        algunsExemplos_(perdidas),
        'A coluna sai vazia na aba gerada. Acerte em Configurações › Análises.'));
      return;
    }

    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      'A análise "' + nome + '" está coerente'
        + (receita.GeradaEm ? '' : ' (nunca gerada)')));
  });

  return itens;
}

/**
 * O sistema precisa continuar tendo dono.
 *
 * "Deixar a instalação sem nenhum administrador" está na lista do que o
 * sistema nunca faz — e o jeito mais fácil de acontecer é aos poucos: alguém
 * desativa um usuário, alguém tira uma permissão, e um dia não sobra ninguém
 * que consiga abrir Configurações para desfazer.
 */
function blocoDoAcesso_() {
  var itens = [];
  var usuarios = lerRegistros_('USUARIOS');
  var niveisPorId = {};

  lerRegistros_('CATALOGO').forEach(function (linha) {
    if (normalizarParaComparar_(linha.Tipo) === 'nivelacesso') {
      niveisPorId[converterParaIdentificador_(linha.Id)] = linha;
    }
  });

  var semNivel = [];
  var comDefeito = [];
  var quantosConfiguram = 0;

  usuarios.forEach(function (usuario) {
    if (normalizarParaComparar_(usuario.Ativo) !== 'sim') return;
    var nivel = niveisPorId[converterParaIdentificador_(usuario.NivelAcessoId)];
    if (!nivel) {
      semNivel.push(String(usuario.Email || usuario.Nome));
      return;
    }
    if (normalizarParaComparar_(nivel.Ativo) !== 'sim') return;

    var permissoes = lerPermissoesDoNivel_(nivel);
    if (permissoes.defeito) {
      comDefeito.push(String(nivel.Nome) + ': ' + permissoes.defeito);
      return;
    }
    if (permissoes.acoes.indexOf(RECC_ACOES.CONFIGURAR) >= 0
      && permissoes.telas.indexOf('configuracoes') >= 0) {
      quantosConfiguram++;
    }
  });

  if (comDefeito.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      comDefeito.length + ' nível(is) com a configuração quebrada',
      algunsExemplos_(comDefeito),
      'Quem estiver nesses níveis abre o sistema com o menu vazio. A coluna '
        + 'Configuracao, em CATALOGO, precisa ser um JSON válido — o mais '
        + 'seguro é reeditar o nível por Configurações › Níveis de acesso.'));
  }

  if (semNivel.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      semNivel.length + ' usuário(s) ativo(s) com nível que não existe',
      algunsExemplos_(semNivel),
      'Essas pessoas caem na tela de acesso negado, dizendo que o nível '
        + 'sumiu. Escolha um nível para cada uma em Configurações › Usuários.'));
  }

  itens.push(quantosConfiguram > 0
    ? item_(RECC_SITUACOES_DO_LAUDO.OK,
      quantosConfiguram + ' pessoa(s) conseguem abrir Configurações')
    : item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Ninguém consegue mais abrir Configurações',
      'Nenhum usuário ativo tem, ao mesmo tempo, a permissão de configurar e '
        + 'a tela de Configurações no menu.',
      'Só dá para sair disto pela planilha: em CATALOGO, ache o nível de '
        + 'acesso da pessoa e devolva "configurar" às ações e "configuracoes" '
        + 'às telas, dentro da coluna Configuracao.'));

  var ativos = usuarios.filter(function (usuario) {
    return normalizarParaComparar_(usuario.Ativo) === 'sim';
  }).length;
  itens.push(ativos > 0
    ? item_(RECC_SITUACOES_DO_LAUDO.OK, ativos + ' usuário(s) ativo(s)')
    : item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Não há nenhum usuário ativo',
      'Ninguém entra no sistema.',
      'Cadastre pela planilha, na aba USUARIOS, ou rode instalarRECC(), que '
        + 'cadastra quem executou como administrador.'));

  return itens;
}

/**
 * A ligação entre a tela e o servidor — o "build" desta etapa.
 *
 * A tela chama o servidor pelo NOME da função, em texto. Renomear uma função
 * no servidor não quebra nada na hora: quebra quando alguém clica no botão,
 * semanas depois, e a mensagem que aparece é a do Apps Script, que não diz
 * qual função faltou. Este bloco encontra isso antes.
 */
function blocoDaTela_() {
  var itens = [];
  var telas = telasIncluidasNoIndex_();

  if (!telas.length) {
    return [item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Não consegui ler as inclusões do Index.html',
      'Sem isso não dá para conferir a ligação com o servidor.',
      'Veja se Index.html existe e se as inclusões estão escritas como '
        + "incluir('NomeDaTela').")];
  }

  var chamadas = {};
  var naoLidas = arquivosDeTelaQueFaltam_();

  telas.forEach(function (nomeDaTela) {
    if (naoLidas.indexOf(nomeDaTela) >= 0) return;
    var fonte = HtmlService.createTemplateFromFile(nomeDaTela).getRawContent();
    var achados = fonte.match(/Servidor\.chamar\('([A-Za-z0-9_]+)'/g) || [];
    achados.forEach(function (achado) {
      var nome = achado.replace("Servidor.chamar('", '').replace("'", '');
      if (!chamadas[nome]) chamadas[nome] = [];
      if (chamadas[nome].indexOf(nomeDaTela) < 0) chamadas[nome].push(nomeDaTela);
    });
  });

  if (naoLidas.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      naoLidas.length + ' arquivo(s) de tela incluídos e ausentes',
      naoLidas.join(', '),
      'O Index.html inclui esses arquivos e eles não estão no projeto: a '
        + 'página não carrega, e o Apps Script só diz o nome do primeiro. '
        + 'Copie Front-End/<Nome>.html do repositório para cá, criando cada '
        + 'um como arquivo HTML com o nome exato — sem ".html", sem acento e '
        + 'com as maiúsculas iguais.'));
  }

  var faltando = [];
  Object.keys(chamadas).forEach(function (nome) {
    if (typeof globalThis[nome] !== 'function') {
      faltando.push(nome + ' (usada em ' + chamadas[nome].join(', ') + ')');
    }
  });

  if (faltando.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      faltando.length + ' função(ões) que a tela chama não existem no servidor',
      algunsExemplos_(faltando),
      'O botão que chama uma dessas falha no clique, com a mensagem do Apps '
        + 'Script — que não diz qual função faltou. Ou a função foi renomeada '
        + 'no servidor e a tela não acompanhou, ou o arquivo .gs dela não '
        + 'está no projeto.'));
  } else {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      'As ' + Object.keys(chamadas).length + ' funções que a tela chama existem '
        + 'no servidor'));
  }

  // O menu promete telas; o roteador é quem as monta. Item de menu sem rota
  // leva a uma tela em branco, e em branco ninguém sabe se é erro ou é vazio.
  var roteador = '';
  try {
    roteador = HtmlService.createTemplateFromFile('Aplicacao').getRawContent();
  } catch (erro) {
    roteador = '';
  }

  if (!roteador) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Não consegui ler o roteador (Aplicacao.html)',
      'Sem ele nenhuma tela é montada.',
      'Confira se o arquivo está no projeto.'));
    return itens;
  }

  var semRota = RECC_TELAS_DO_SISTEMA.filter(function (tela) {
    return roteador.indexOf(tela.tela + ':') < 0;
  }).map(function (tela) { return tela.titulo; });

  itens.push(semRota.length
    ? item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      semRota.length + ' tela(s) do menu não têm rota no roteador',
      algunsExemplos_(semRota),
      'Clicar no item do menu abre uma tela em branco. A rota se declara em '
        + 'Aplicacao.html, no mapa de telas.')
    : item_(RECC_SITUACOES_DO_LAUDO.OK,
      'As ' + RECC_TELAS_DO_SISTEMA.length + ' telas do menu têm rota'));

  return itens;
}

/**
 * Os arquivos de tela que o Index manda incluir e que NÃO estão no projeto.
 *
 * Mora aqui, e não no Principal, porque é a mesma conferência que o bloco da
 * tela faz — e duas versões dela acabariam discordando. É usada por três
 * lugares: o bloco do diagnóstico, o recado de erro do `incluir_` e a
 * conferência rápida do Instalador.
 */
function arquivosDeTelaQueFaltam_() {
  return telasIncluidasNoIndex_().filter(function (nome) {
    return !existeArquivoDeTela_(nome);
  });
}

/** O arquivo HTML existe no projeto do Apps Script? */
function existeArquivoDeTela_(nome) {
  try {
    HtmlService.createTemplateFromFile(nome).getRawContent();
    return true;
  } catch (erro) {
    return false;
  }
}

/**
 * A folha de estilos está inteira, e cobre o que as telas usam?
 *
 * NASCEU DE UMA PERGUNTA DA OPERAÇÃO: "desconfigurou a estilização, o que pode
 * ser?". O sistema abria, o conteúdo estava lá, e a aparência não. Desse lado
 * não dava para ver nada: o arquivo aqui estava certo. O que estava
 * desatualizado era a CÓPIA no projeto do Apps Script.
 *
 * É o caso mais comum de todos numa cópia manual: o `Estilos` fica para trás
 * enquanto as telas avançam, e o resultado é uma página que carrega e fica
 * feia — sem erro nenhum no console, porque CSS que não existe não reclama,
 * só não pinta.
 *
 * Então o bloco compara o que as telas USAM com o que o Estilos DEFINE, e diz
 * os nomes que faltam. Com a lista na mão, "está desconfigurado" vira "o
 * Estilos do projeto é mais antigo que as telas".
 */
function blocoDosEstilos_() {
  var itens = [];

  var folha;
  try {
    folha = HtmlService.createTemplateFromFile('Estilos').getRawContent();
  } catch (erro) {
    return [item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'O arquivo Estilos não está no projeto',
      'Sem ele a página carrega sem aparência nenhuma.',
      'Copie Front-End/Estilos.html do repositório e crie aqui um arquivo HTML '
        + 'chamado exatamente "Estilos".')];
  }

  // Truncada no meio é o que acontece quando a colagem de 70 KB não vai
  // inteira. As chaves desequilibradas denunciam isso na hora.
  var semComentario = folha.replace(/\/\*[\s\S]*?\*\//g, '');
  var abre = (semComentario.match(/\{/g) || []).length;
  var fecha = (semComentario.match(/\}/g) || []).length;

  if (folha.indexOf('<style>') < 0 || folha.indexOf('</style>') < 0 || abre !== fecha) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'A folha de estilos está incompleta',
      abre + ' chaves abertas para ' + fecha + ' fechadas'
        + (folha.indexOf('</style>') < 0 ? ', e sem o </style> no fim' : '') + '.',
      'A colagem não foi inteira. Apague o conteúdo do arquivo Estilos e cole '
        + 'de novo, do começo ao fim.'));
  } else {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      'A folha de estilos está inteira',
      Math.round(folha.length / 1024) + ' KB, ' + abre + ' blocos de regras.'));
  }

  var faltando = classesSemEstilo_(folha);
  itens.push(faltando.length
    ? item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      faltando.length + ' classe(s) que as telas usam e o Estilos não define',
      algunsExemplos_(faltando),
      'É quase sempre o mesmo motivo: o Estilos deste projeto é mais antigo '
        + 'que as telas. Copie Front-End/Estilos.html de novo, inteiro.')
    : item_(RECC_SITUACOES_DO_LAUDO.OK,
      'Toda classe que as telas usam está definida'));

  return itens;
}

/**
 * As classes escritas nas telas que a folha não define.
 *
 * Só as ESTÁTICAS — as que aparecem como class="alguma-coisa" no HTML. Classe
 * montada em tempo de execução não dá para conferir daqui, e chutar geraria
 * alarme falso, que é pior que não conferir.
 *
 * A tela de acesso negado fica de fora: ela é servida sozinha, sem o Estilos,
 * e carrega o próprio <style> dentro.
 */
function classesSemEstilo_(folha) {
  var definidas = {};
  (folha.match(/\.[a-z][a-z0-9-]*/g) || []).forEach(function (achado) {
    definidas[achado.substring(1)] = true;
  });

  var faltando = [];
  telasIncluidasNoIndex_().forEach(function (nomeDaTela) {
    if (nomeDaTela === 'Estilos') return;
    if (!existeArquivoDeTela_(nomeDaTela)) return;

    var fonte = HtmlService.createTemplateFromFile(nomeDaTela).getRawContent();
    // Uma tela com <style> próprio define as suas: não são do Estilos.
    var temEstiloProprio = fonte.indexOf('<style>') >= 0;

    (fonte.match(/class="[a-z0-9 _-]+"/g) || []).forEach(function (achado) {
      achado.substring(7, achado.length - 1).split(/\s+/).forEach(function (classe) {
        if (!classe || definidas[classe]) return;
        if (temEstiloProprio && fonte.indexOf('.' + classe) >= 0) return;
        var recado = nomeDaTela + ': .' + classe;
        if (faltando.indexOf(recado) < 0) faltando.push(recado);
      });
    });
  });
  return faltando;
}

/** Os nomes das telas que o Index.html manda incluir. */
function telasIncluidasNoIndex_() {
  var fonte;
  try {
    fonte = HtmlService.createTemplateFromFile('Index').getRawContent();
  } catch (erro) {
    return [];
  }
  var achados = fonte.match(/incluir\('([A-Za-z0-9_]+)'\)/g) || [];
  var nomes = [];
  achados.forEach(function (achado) {
    var nome = achado.replace("incluir('", '').replace("')", '');
    if (nomes.indexOf(nome) < 0) nomes.push(nome);
  });
  return nomes;
}

// ============================================================================
// O LAUDO EM TEXTO, PARA O LOG DO EDITOR
// ============================================================================

/**
 * O mesmo laudo, escrito para caber no log do Apps Script.
 *
 * Quem roda `diagnosticoRECC()` no editor não tem tela: tem o log. Um objeto
 * JSON de trezentas linhas ali é ilegível, e ilegível é o mesmo que ausente.
 */
function laudoEmTexto_(laudo) {
  var marcas = { ok: '  . ', atencao: '  ! ', falha: '  X ' };
  var linhas = [];

  linhas.push('');
  linhas.push('DIAGNOSTICO DO RECC — ' + laudo.quando);
  linhas.push(laudo.aprovado
    ? 'APROVADO — nenhuma falha'
    : 'REPROVADO — ' + laudo.resumo.falhas + ' falha(s)');
  linhas.push(laudo.resumo.total + ' verificações · '
    + laudo.resumo.oks + ' ok · '
    + laudo.resumo.atencoes + ' atenção · '
    + laudo.resumo.falhas + ' falha');
  linhas.push('');

  laudo.blocos.forEach(function (bloco) {
    linhas.push('[' + String(bloco.situacao).toUpperCase() + '] ' + bloco.titulo);
    bloco.itens.forEach(function (item) {
      linhas.push((marcas[item.situacao] || '  ? ') + item.oQue);
      if (item.detalhe) linhas.push('        ' + item.detalhe);
      if (item.comoArrumar && item.situacao !== RECC_SITUACOES_DO_LAUDO.OK) {
        linhas.push('        → ' + item.comoArrumar);
      }
    });
    linhas.push('');
  });

  return linhas.join('\n');
}
