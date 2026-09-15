/**
 * ============================================================================
 * RECC — Esquema.gs · o contrato das abas
 * ============================================================================
 * Plataforma PGO (Pelitero Labs) · operação RECC (Porto Seguro)
 *
 * Este arquivo é só declaração: nomes de aba, cabeçalhos e tipos. Não chama
 * nada e não depende de nenhum outro arquivo — pode ser lido primeiro sem
 * risco.
 *
 * COMO LER
 * --------
 *   c = o Cabeçalho, exatamente como aparece na linha 1 da planilha
 *   t = o Tipo do dado, que decide o formato da célula
 *   p = Protegido: a interface não renomeia nem exclui (no máximo esconde)
 *
 * O cabeçalho é o contrato — não a posição da coluna. Reordenar colunas na
 * planilha não quebra nada. Ver Planilha.gs.
 * ============================================================================
 */

/**
 * Os tipos de dado. Cada um decide, e isso é o ponto do arquivo inteiro,
 * COMO a célula é formatada antes de receber o valor.
 *
 *   ID       0000000010 precisa continuar 0000000010, e não virar o número 10
 *   DINHEIRO a célula guarda 1234.56 e MOSTRA R$ 1.234,56 — formato, não texto
 *   DATA     data de verdade, para o Power BI filtrar sem conversão
 */
const RECC_TIPO_DE_DADO = {
  IDENTIFICADOR: 'identificador',
  TEXTO: 'texto',
  TEXTO_LONGO: 'textoLongo',
  DATA: 'data',
  HORA: 'hora',
  DATA_HORA: 'dataHora',
  DINHEIRO: 'dinheiro',
  NUMERO: 'numero',
  SIM_OU_NAO: 'simOuNao'
};

/** O formato de célula de cada tipo. Aplicado na linha ANTES de gravar. */
const RECC_FORMATO_DA_CELULA = {
  identificador: '@',
  texto: '@',
  textoLongo: '@',
  data: 'dd/MM/yyyy',
  hora: 'HH:mm',
  dataHora: 'dd/MM/yyyy HH:mm',
  dinheiro: '"R$ "#,##0.00',
  numero: '#,##0.##',
  simOuNao: '@'
};

/** Fuso da operação. O Apps Script roda em UTC e viraria o dia às 21 h. */
const RECC_FUSO_HORARIO = 'America/Sao_Paulo';

/** Maior Id possível: 10 casas decimais. */
const RECC_MAIOR_IDENTIFICADOR = 9999999999;

/**
 * Colunas de controle, acrescentadas ao FIM das abas de dado.
 *
 * O prefixo "_" marca coluna de sistema e sinaliza ao Power BI o que ignorar.
 * `_Visivel` é editável na mão, direto na planilha: é assim que uma linha
 * ocultada volta a aparecer.
 */
const RECC_COLUNAS_DE_CONTROLE = [
  { cabecalho: '_Visivel', tipo: 'texto', protegido: true },
  { cabecalho: '_ExcluidoEm', tipo: 'dataHora', protegido: true },
  { cabecalho: '_ExcluidoPor', tipo: 'identificador', protegido: true },
  { cabecalho: '_Origem', tipo: 'texto', protegido: true }
];

const RECC_VISIVEL_SIM = 'SIM';
const RECC_VISIVEL_NAO = 'NAO';
const RECC_ORIGEM_SISTEMA = 'SISTEMA';
const RECC_ORIGEM_PLANILHA = 'PLANILHA';

/**
 * As 13 abas.
 *
 * `controle: true`  → recebe as colunas _Visivel / _ExcluidoEm / _ExcluidoPor /
 *                     _Origem, e exclusão vira ocultação.
 * `reserva`         → quantas linhas a aba nasce tendo. Célula vazia também
 *                     consome o teto de 10 milhões da planilha, então o
 *                     instalador corta o que sobra. Ver Instalador.gs.
 */
const RECC_ESQUEMA = {

  // ------------------------------------------------------------------ bases
  BASE_RET: {
    aba: 'BASE_RET',
    titulo: 'Retenção Vida',
    controle: true,
    reserva: 2000,
    colunas: [
      { cabecalho: 'id', tipo: 'identificador', protegido: true },
      { cabecalho: 'data de recepção do protocolo', tipo: 'data', protegido: true },
      { cabecalho: 'analista', tipo: 'texto', protegido: true },
      { cabecalho: 'SUSEP', tipo: 'identificador', protegido: true },
      { cabecalho: 'segmento', tipo: 'texto', protegido: true },
      { cabecalho: 'Código origem da proposta', tipo: 'identificador', protegido: true },
      { cabecalho: 'número da proposta', tipo: 'identificador', protegido: true },
      { cabecalho: 'nome do cliente', tipo: 'texto', protegido: true },
      { cabecalho: 'cod produto', tipo: 'identificador', protegido: true },
      { cabecalho: 'produto', tipo: 'texto', protegido: true },
      { cabecalho: 'grupo', tipo: 'texto', protegido: true },
      { cabecalho: 'sistema', tipo: 'texto', protegido: true },
      { cabecalho: 'valor do prêmio', tipo: 'dinheiro', protegido: true },
      { cabecalho: 'valor do prêmio retido', tipo: 'dinheiro', protegido: true },
      { cabecalho: 'prêmio mensal retido', tipo: 'dinheiro', protegido: true },
      { cabecalho: 'agente da central', tipo: 'texto', protegido: true },
      { cabecalho: 'canal', tipo: 'texto', protegido: true },
      { cabecalho: 'relacionamento', tipo: 'texto', protegido: true },
      { cabecalho: 'contato', tipo: 'texto', protegido: true },
      // Texto, e não identificador: o protocolo da operação é alfanumérico
      // ("RET-2026-1024"), e como identificador ele perderia as letras — o
      // tipo identificador guarda só dígitos, de propósito.
      { cabecalho: 'protocolo', tipo: 'texto', protegido: true },
      { cabecalho: 'cod_sucursal', tipo: 'identificador', protegido: true },
      { cabecalho: 'cod_ramo', tipo: 'identificador', protegido: true },
      { cabecalho: 'Num_apolice', tipo: 'identificador', protegido: true },
      { cabecalho: 'CPF', tipo: 'identificador', protegido: true },
      { cabecalho: 'status', tipo: 'texto', protegido: true },
      { cabecalho: 'Forma de pagamento', tipo: 'texto', protegido: true },
      { cabecalho: 'dados do pagamento', tipo: 'texto', protegido: true },
      { cabecalho: 'descrição', tipo: 'textoLongo', protegido: true },
      { cabecalho: 'telefones de contato', tipo: 'identificador', protegido: true },
      { cabecalho: 'e-mail', tipo: 'texto', protegido: true },
      { cabecalho: 'Novo cod origem proposta', tipo: 'identificador', protegido: true },
      { cabecalho: 'novo numero da proposta', tipo: 'identificador', protegido: true },
      { cabecalho: 'motivo do cancelamento', tipo: 'texto', protegido: true },
      { cabecalho: 'data da transmissão', tipo: 'data', protegido: true },
      { cabecalho: 'tentativas de contato', tipo: 'numero', protegido: true }
    ]
  },

  BASE_MESA: {
    aba: 'BASE_MESA',
    titulo: 'Mesa Diamante',
    controle: true,
    reserva: 2000,
    colunas: [
      { cabecalho: 'ID', tipo: 'identificador', protegido: true },
      { cabecalho: 'Analista', tipo: 'texto', protegido: true },
      { cabecalho: 'Status', tipo: 'texto', protegido: true },
      { cabecalho: 'Canal', tipo: 'texto', protegido: true },
      { cabecalho: 'Data de entrada', tipo: 'data', protegido: true },
      { cabecalho: 'Horário', tipo: 'hora', protegido: true },
      { cabecalho: 'Tipo', tipo: 'texto', protegido: true },
      { cabecalho: 'Abertura indevida', tipo: 'simOuNao', protegido: true },
      { cabecalho: 'Título do e-mail', tipo: 'texto', protegido: true },
      { cabecalho: 'Nome do segurado', tipo: 'texto', protegido: true },
      { cabecalho: 'Documento (CPF)', tipo: 'identificador', protegido: true },
      { cabecalho: 'Corretora', tipo: 'texto', protegido: true },
      { cabecalho: 'SUSEP', tipo: 'identificador', protegido: true },
      { cabecalho: 'Ramo', tipo: 'texto', protegido: true },
      { cabecalho: 'Assunto', tipo: 'texto', protegido: true },
      { cabecalho: 'Área responsável', tipo: 'texto', protegido: true },
      { cabecalho: 'Data resposta', tipo: 'data', protegido: true },
      { cabecalho: 'Hora resposta', tipo: 'hora', protegido: true },
      { cabecalho: 'Data da finalização', tipo: 'data', protegido: true },
      { cabecalho: 'horário da finalização', tipo: 'hora', protegido: true }
    ]
  },

  // -------------------------------------------------------------- cadastros
  USUARIOS: {
    aba: 'USUARIOS',
    titulo: 'Usuários',
    controle: true,
    reserva: 300,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'Nome', tipo: 'texto', protegido: true },
      { cabecalho: 'Email', tipo: 'texto', protegido: true },
      { cabecalho: 'Canal que atende', tipo: 'texto', protegido: false },
      // A mesa em que a pessoa trabalha. VAZIO É VÁLIDO, e é o caso do
      // administrador: quem administra não pertence a uma mesa, atende as
      // duas e delega para quem for. Exigir mesa dele obrigaria a inventar
      // uma resposta para uma pergunta que não se aplica.
      { cabecalho: 'MesaId', tipo: 'identificador', protegido: false },
      { cabecalho: 'CargoId', tipo: 'identificador', protegido: true },
      { cabecalho: 'NivelAcessoId', tipo: 'identificador', protegido: true },
      { cabecalho: 'Matricula', tipo: 'identificador', protegido: false },
      { cabecalho: 'Ativo', tipo: 'simOuNao', protegido: true },
      { cabecalho: 'DataCadastro', tipo: 'dataHora', protegido: true },
      { cabecalho: 'UltimoAcesso', tipo: 'dataHora', protegido: true }
    ]
  },

  CANAIS: {
    aba: 'CANAIS',
    titulo: 'Canais, corretores e agentes',
    controle: true,
    reserva: 1000,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'Nome', tipo: 'texto', protegido: true },
      { cabecalho: 'Canal', tipo: 'texto', protegido: true },
      { cabecalho: 'SUSEP', tipo: 'identificador', protegido: true },
      { cabecalho: 'Corretora', tipo: 'texto', protegido: true },
      { cabecalho: 'Segmento', tipo: 'texto', protegido: true }
    ]
  },

  // Código e descrição NUNCA dividem a mesma célula. Vale aqui e vale para
  // proposta, sucursal, ramo e apólice nas bases.
  PRODUTOS: {
    aba: 'PRODUTOS',
    titulo: 'Produtos',
    controle: true,
    reserva: 500,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'Produto', tipo: 'texto', protegido: true },
      { cabecalho: 'CodigoProduto', tipo: 'identificador', protegido: true }
    ]
  },

  SUSEP_BLOQUEADAS: {
    aba: 'SUSEP_BLOQUEADAS',
    titulo: 'SUSEPs bloqueadas',
    controle: true,
    reserva: 500,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'SUSEP', tipo: 'identificador', protegido: true },
      { cabecalho: 'NomeCorretora', tipo: 'texto', protegido: true },
      { cabecalho: 'CpfReincidente', tipo: 'identificador', protegido: true },
      { cabecalho: 'Motivo', tipo: 'texto', protegido: false },
      { cabecalho: 'BloqueadaEm', tipo: 'data', protegido: false }
    ]
  },

  // ---------------------------------------------------------------- sistema
  MESAS: {
    aba: 'MESAS',
    titulo: 'Mesas de trabalho',
    controle: false,
    reserva: 50,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'Nome', tipo: 'texto', protegido: true },
      { cabecalho: 'Descricao', tipo: 'texto', protegido: false },
      { cabecalho: 'Aba', tipo: 'texto', protegido: true },
      // Quais colunas da base guardam quando o caso entrou. É daqui que sai a
      // "data do último registro" da barra superior. Ficam declaradas, e não
      // adivinhadas, porque cada mesa nomeia essa coluna do seu jeito.
      { cabecalho: 'ColunaDaData', tipo: 'texto', protegido: false },
      { cabecalho: 'ColunaDaHora', tipo: 'texto', protegido: false },
      // O painel precisa saber onde a mesa guarda cada coisa. Declarado, e
      // não adivinhado pelo nome: cada mesa batiza a coluna do seu jeito, e
      // adivinhar acerta hoje e erra na mesa que vier depois.
      { cabecalho: 'ColunaDoStatus', tipo: 'texto', protegido: false },
      // As colunas da fila. Aceita duas escritas:
      //
      //   plana      Data de entrada, Status, Nome do segurado
      //   agrupada   Situação: Data, Status; Dados da proposta: Protocolo…
      //
      // A agrupada junta várias colunas debaixo de um título só — é o que
      // deixa a fila legível quando o caso tem trinta e cinco campos e a
      // pessoa precisa achar o dele de relance.
      { cabecalho: 'ColunasDaFila', tipo: 'textoLongo', protegido: false },
      // Em quais colunas a busca procura. É por elas, e só por elas, que o
      // sistema lê a base inteira — ler as 35 colunas de 200 mil linhas são
      // 7 milhões de células, e ler cinco são um milhão.
      { cabecalho: 'ColunasDaBusca', tipo: 'texto', protegido: false },
      // Quantos casos por mês se espera de uma pessoa nesta mesa. Zero
      // desliga a meta: mesa sem meta declarada não inventa uma, e a tela
      // simplesmente não mostra a barra de progresso.
      { cabecalho: 'MetaMensalPorPessoa', tipo: 'numero', protegido: false },
      { cabecalho: 'ColunaDaFinalizacao', tipo: 'texto', protegido: false },
      { cabecalho: 'ColunaDaAreaResponsavel', tipo: 'texto', protegido: false },
      { cabecalho: 'Icone', tipo: 'texto', protegido: false },
      { cabecalho: 'Ordem', tipo: 'numero', protegido: false },
      { cabecalho: 'Ativo', tipo: 'simOuNao', protegido: true }
    ]
  },

  CAMPOS: {
    aba: 'CAMPOS',
    titulo: 'Campos do formulário',
    controle: false,
    reserva: 500,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'MesaId', tipo: 'identificador', protegido: true },
      { cabecalho: 'Aba', tipo: 'texto', protegido: true },
      { cabecalho: 'ChaveTecnica', tipo: 'texto', protegido: true },
      { cabecalho: 'Cabecalho', tipo: 'texto', protegido: true },
      { cabecalho: 'Rotulo', tipo: 'texto', protegido: false },
      { cabecalho: 'Descricao', tipo: 'texto', protegido: false },
      { cabecalho: 'TipoCampo', tipo: 'texto', protegido: true },
      { cabecalho: 'Secao', tipo: 'texto', protegido: false },
      { cabecalho: 'Mascara', tipo: 'texto', protegido: false },
      { cabecalho: 'Obrigatorio', tipo: 'simOuNao', protegido: false },
      { cabecalho: 'Protegido', tipo: 'simOuNao', protegido: true },
      { cabecalho: 'Ativo', tipo: 'simOuNao', protegido: false },
      { cabecalho: 'Ordem', tipo: 'numero', protegido: false },
      { cabecalho: 'VisivelPara', tipo: 'texto', protegido: false },
      { cabecalho: 'ValorPadrao', tipo: 'texto', protegido: false },
      { cabecalho: 'Configuracao', tipo: 'textoLongo', protegido: false }
    ]
  },

  CATALOGO: {
    aba: 'CATALOGO',
    titulo: 'Catálogo',
    controle: false,
    reserva: 1000,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'MesaId', tipo: 'identificador', protegido: false },
      { cabecalho: 'Tipo', tipo: 'texto', protegido: true },
      { cabecalho: 'Codigo', tipo: 'identificador', protegido: false },
      { cabecalho: 'Nome', tipo: 'texto', protegido: true },
      { cabecalho: 'Rotulo', tipo: 'texto', protegido: false },
      { cabecalho: 'PaiId', tipo: 'identificador', protegido: false },
      { cabecalho: 'Cor', tipo: 'texto', protegido: false },
      { cabecalho: 'Ordem', tipo: 'numero', protegido: false },
      { cabecalho: 'Ativo', tipo: 'simOuNao', protegido: false },
      { cabecalho: 'Configuracao', tipo: 'textoLongo', protegido: false }
    ]
  },

  PAINEIS: {
    aba: 'PAINEIS',
    titulo: 'Painéis',
    controle: false,
    reserva: 300,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'Tela', tipo: 'texto', protegido: true },
      { cabecalho: 'MesaId', tipo: 'identificador', protegido: false },
      { cabecalho: 'Titulo', tipo: 'texto', protegido: false },
      // 'cartao' no Dashboard; pizza, linha e barras no Painel Analítico.
      { cabecalho: 'TipoWidget', tipo: 'texto', protegido: true },
      // Para um cartão, é a regra de contagem: 'total', 'situacao' ou
      // 'naCelula'. Para um gráfico, é o campo que vira eixo.
      { cabecalho: 'CampoDimensao', tipo: 'texto', protegido: false },
      { cabecalho: 'CampoMedida', tipo: 'texto', protegido: false },
      { cabecalho: 'Agregacao', tipo: 'texto', protegido: false },
      { cabecalho: 'Limite', tipo: 'numero', protegido: false },
      { cabecalho: 'Filtro', tipo: 'textoLongo', protegido: false },
      { cabecalho: 'Ordem', tipo: 'numero', protegido: false },
      { cabecalho: 'Largura', tipo: 'numero', protegido: false },
      // O tom, por NOME — 'bom', 'ruim', 'atencao'… Guardar '#15794A' aqui
      // deixaria o verde do tema claro aparecendo no tema escuro.
      { cabecalho: 'Cor', tipo: 'texto', protegido: false },
      { cabecalho: 'VisivelPara', tipo: 'texto', protegido: false },
      { cabecalho: 'Ativo', tipo: 'simOuNao', protegido: false }
    ]
  },

  /*
    As análises que o administrador montou.
    Uma ABA, e não um JSON dentro de CONFIG, pela mesma razão que os cartões do
    Dashboard saíram de MESAS: é uma LISTA de coisas configuráveis, cada uma
    com nome, mesa, colunas e filtro próprios. Guardada como texto numa célula,
    dava para escolher "quais" e para mais nada.

    ATENÇÃO: esta aba guarda a RECEITA. A aba gerada — ANALISE_<Nome> — é outra
    coisa, não está no contrato e é recriada a cada geração.
  */
  ANALISES: {
    aba: 'ANALISES',
    titulo: 'Análises',
    controle: true,
    reserva: 100,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      // Vira o nome da aba: 'Diamante' gera ANALISE_Diamante. Só letras,
      // números e _ — é o que o Google Planilhas aceita sem aspas em fórmula.
      { cabecalho: 'Nome', tipo: 'texto', protegido: false },
      { cabecalho: 'Descricao', tipo: 'texto', protegido: false },
      { cabecalho: 'MesaId', tipo: 'identificador', protegido: false },
      // Cabeçalhos separados por vírgula. Vazio = todas as colunas da mesa.
      { cabecalho: 'Colunas', tipo: 'textoLongo', protegido: false },
      // 'Coluna=valor' separados por ponto e vírgula. Vazio = sem filtro.
      { cabecalho: 'Filtros', tipo: 'textoLongo', protegido: false },
      // Janela em dias, contada da coluna de data da mesa. 0 = tudo.
      { cabecalho: 'Dias', tipo: 'numero', protegido: false },
      { cabecalho: 'Ordem', tipo: 'numero', protegido: false },
      { cabecalho: 'Ativo', tipo: 'simOuNao', protegido: false },
      // O retrato: quando foi gerado e quantas linhas saíram. É o que faz a
      // tela dizer "gerada ontem, 1.204 linhas" em vez de só "existe".
      { cabecalho: 'GeradaEm', tipo: 'dataHora', protegido: true },
      { cabecalho: 'GeradaPor', tipo: 'identificador', protegido: true },
      { cabecalho: 'Linhas', tipo: 'numero', protegido: true }
    ]
  },

  CONFIG: {
    aba: 'CONFIG',
    titulo: 'Configurações',
    controle: false,
    reserva: 200,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'Chave', tipo: 'texto', protegido: true },
      { cabecalho: 'Valor', tipo: 'textoLongo', protegido: false },
      { cabecalho: 'Descricao', tipo: 'texto', protegido: false },
      { cabecalho: 'AtualizadoPor', tipo: 'identificador', protegido: false },
      { cabecalho: 'Data', tipo: 'dataHora', protegido: false }
    ]
  },

  AUDITORIA: {
    aba: 'AUDITORIA',
    titulo: 'Auditoria',
    controle: false,
    reserva: 2000,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'DataHora', tipo: 'dataHora', protegido: true },
      { cabecalho: 'UsuarioId', tipo: 'identificador', protegido: true },
      { cabecalho: 'Acao', tipo: 'texto', protegido: true },
      { cabecalho: 'Entidade', tipo: 'texto', protegido: false },
      { cabecalho: 'RegistroId', tipo: 'identificador', protegido: false },
      { cabecalho: 'Detalhe', tipo: 'textoLongo', protegido: false }
    ]
  }
};

/**
 * A ponte entre o tipo de DADO da coluna e o tipo de CAMPO do formulário.
 *
 * Existem os dois porque respondem a perguntas diferentes: o tipo de dado
 * decide o formato da célula; o tipo de campo decide o controle que aparece
 * na tela. "moeda" e "dinheiro" são a mesma coisa vista de dois lados.
 */
const RECC_DO_DADO_PARA_O_CAMPO = {
  identificador: 'identificador',
  texto: 'texto',
  textoLongo: 'textoLongo',
  data: 'data',
  hora: 'hora',
  dataHora: 'dataHora',
  dinheiro: 'moeda',
  numero: 'numero',
  simOuNao: 'simOuNao'
};

/** O caminho de volta, com os apelidos que a configuração aceita. */
const RECC_DO_CAMPO_PARA_O_DADO = {
  identificador: 'identificador',
  documento: 'identificador',
  telefone: 'identificador',
  texto: 'texto',
  textoLongo: 'textoLongo',
  email: 'texto',
  seletor: 'texto',
  seletorMultiplo: 'texto',
  data: 'data',
  hora: 'hora',
  dataHora: 'dataHora',
  moeda: 'dinheiro',
  numero: 'numero',
  percentual: 'numero',
  simOuNao: 'simOuNao'
};

/** Prefixo reservado das abas geradas pelo gerador de análise. */
const RECC_PREFIXO_ANALISE = 'ANALISE_';

/**
 * A definição de uma aba, com as colunas de controle já anexadas.
 * É esta lista, e não `RECC_ESQUEMA[x].colunas`, que representa a aba inteira.
 */
function esquemaDaAba_(nomeDaAba) {
  var definicao = RECC_ESQUEMA[nomeDaAba];
  if (!definicao) {
    throw new Error('Aba "' + nomeDaAba + '" não faz parte do esquema do RECC.');
  }
  var colunas = definicao.colunas.slice();
  if (definicao.controle) {
    for (var i = 0; i < RECC_COLUNAS_DE_CONTROLE.length; i++) {
      colunas.push(RECC_COLUNAS_DE_CONTROLE[i]);
    }
  }
  return {
    aba: definicao.aba,
    titulo: definicao.titulo,
    controle: definicao.controle,
    reserva: definicao.reserva,
    colunas: colunas
  };
}

/** Os nomes das abas do contrato, na ordem em que o instalador as cria. */
function nomesDasAbasDoContrato_() {
  return Object.keys(RECC_ESQUEMA);
}
