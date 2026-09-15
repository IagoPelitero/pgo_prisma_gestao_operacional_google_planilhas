/**
 * ============================================================================
 * PGO — Base.gs · como o sistema fala com a planilha
 * ============================================================================
 * A fundação. Nada aqui sabe o que é um caso, uma mesa ou um usuário:
 * são as três peças que todo o resto usa para chegar à planilha.
 *
 * O QUE TEM AQUI DENTRO, nesta ordem:
 *
 *   1. O CONTRATO DAS ABAS   (era Esquema.gs)
 *   2. O GERADOR DE Id   (era Sequencia.gs)
 *   3. A PORTA ÚNICA PARA O GOOGLE PLANILHAS   (era Planilha.gs)
 *
 * Procure pelo banner com ##### para pular de uma seção à outra.
 * ============================================================================
 */

/* ############################################################################
   #
   #  SEÇÃO 1 de 3 · O CONTRATO DAS ABAS
   #
   #  Era o arquivo Back-End/Esquema.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

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
 * planilha não quebra nada. Ver Base.gs.
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
 *                     instalador corta o que sobra. Ver Instalacao.gs.
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

/* ############################################################################
   #
   #  SEÇÃO 2 de 3 · O GERADOR DE Id
   #
   #  Era o arquivo Back-End/Sequencia.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * ============================================================================
 * RECC — Sequencia.gs · o gerador de Id
 * ============================================================================
 * O Id do RECC é DECIMAL, PROGRESSIVO, de 10 CASAS, começando em 0000000000.
 * Dez casas dão dez bilhões de combinações.
 *
 * Três regras, e cada uma existe por causa de um estrago real no sistema
 * anterior:
 *
 *   1. A sequência mora em Script Properties, NUNCA na planilha.
 *      A planilha é editável à mão; um contador dentro dela seria zerado sem
 *      querer numa tarde qualquer.
 *
 *   2. A sequência NUNCA anda para trás.
 *      Quando o Sheets deformava um Id, o gerador não o reconhecia, rebaixava
 *      o piso da aba e voltava a emitir Id já em uso. Aqui o piso é sempre
 *      max(último guardado, maior Id encontrado na aba).
 *
 *   3. Toda emissão acontece dentro de uma trava.
 *      Sem isso, dois usuários salvando no mesmo segundo recebem o mesmo Id.
 *      Quem chama (Base.gs) já segura a trava.
 * ============================================================================
 */

const RECC_PREFIXO_DA_SEQUENCIA = 'RECC_SEQ_';

/** 42 vira "0000000042". */
function formatarIdentificador_(numero) {
  var texto = String(Math.floor(numero));
  while (texto.length < 10) texto = '0' + texto;
  return texto;
}

/**
 * O maior Id já presente na aba, como número. -1 quando a aba está vazia.
 * Ids deformados (texto que não é dígito) são ignorados de propósito: eles
 * não podem rebaixar nem levantar o piso.
 */
function maiorIdentificadorDaAba_(nomeDaAba) {
  var estrutura = estruturaDaAba_(nomeDaAba);
  var iId = posicaoDaColuna_(estrutura, 'Id');
  if (iId < 0) return -1;

  var totalDados = quantidadeDeRegistros_(estrutura);
  if (totalDados <= 0) return -1;

  var coluna = estrutura.aba.getRange(2, iId + 1, totalDados, 1).getValues();
  var maior = -1;
  for (var i = 0; i < coluna.length; i++) {
    var digitos = converterParaIdentificador_(coluna[i][0]);
    if (!digitos) continue;
    var n = Number(digitos);
    if (isFinite(n) && n > maior) maior = n;
  }
  return maior;
}

/**
 * RESERVA UM BLOCO de Ids de uma vez, e devolve todos.
 *
 * DEVE ser chamada dentro de uma trava — inserirVariosRegistros_ já segura a
 * dela.
 *
 * POR QUE EM BLOCO, E NÃO UM POR VEZ. Esta função é a única do sistema que
 * fala com o PropertiesService durante uma gravação, e cada ida lá custa
 * dezenas de milissegundos no Apps Script. Emitindo um Id por vez, gravar
 * cinco mil casos eram DEZ MIL idas — dois minutos só de pedágio, dentro de
 * uma execução que tem seis. Reservando o bloco inteiro são DUAS: uma leitura
 * e uma gravação, para cinco mil linhas ou para uma.
 *
 * O bloco é reservado ANTES de qualquer linha ser escrita na planilha, e a
 * sequência já sai gravada no fim dele. Se a gravação estourar no meio, os
 * Ids reservados se perdem — e é o que tem de acontecer: a sequência nunca
 * anda para trás, mesmo que isso deixe buracos. Buraco na numeração não
 * quebra nada; Id reemitido quebra tudo, e foi o que aconteceu no PGO 5.x.
 */
function proximosIdentificadores_(nomeDaAba, quantos) {
  if (quantos <= 0) return [];

  var props = PropertiesService.getScriptProperties();
  var chave = RECC_PREFIXO_DA_SEQUENCIA + nomeDaAba;
  var guardado = props.getProperty(chave);

  var ultimo;
  if (guardado === null) {
    // Primeira emissão desta aba nesta instalação: alinha com o que já existe
    // na planilha, para nunca reemitir um Id que já está gravado.
    ultimo = maiorIdentificadorDaAba_(nomeDaAba);
  } else {
    ultimo = Number(guardado);
    if (!isFinite(ultimo)) ultimo = maiorIdentificadorDaAba_(nomeDaAba);
  }

  var ultimoDoBloco = ultimo + quantos;
  if (ultimoDoBloco > RECC_MAIOR_IDENTIFICADOR) {
    throw new Error('A sequência da aba "' + nomeDaAba + '" chegou ao teto de 10 ' +
      'casas decimais (' + RECC_MAIOR_IDENTIFICADOR + ').');
  }

  props.setProperty(chave, String(ultimoDoBloco));

  var bloco = [];
  for (var i = 1; i <= quantos; i++) bloco.push(formatarIdentificador_(ultimo + i));
  return bloco;
}

/** Um Id só. É o bloco de tamanho um — não existe segunda regra. */
function proximoIdentificador_(nomeDaAba) {
  return proximosIdentificadores_(nomeDaAba, 1)[0];
}

/**
 * Realinha a sequência com a planilha, sem nunca baixá-la.
 * Chamada depois de uma carga feita direto na planilha.
 */
function realinharSequencia_(nomeDaAba) {
  var props = PropertiesService.getScriptProperties();
  var chave = RECC_PREFIXO_DA_SEQUENCIA + nomeDaAba;
  var guardado = Number(props.getProperty(chave));
  if (!isFinite(guardado)) guardado = -1;

  var naAba = maiorIdentificadorDaAba_(nomeDaAba);
  var piso = Math.max(guardado, naAba);
  props.setProperty(chave, String(piso));
  return { aba: nomeDaAba, guardado: guardado, naAba: naAba, piso: piso };
}

/**
 * NORMALIZAR BASE — carimba Id em linha que entrou direto na planilha.
 *
 * Quem digita uma linha à mão não gera Id. Sem Id não há relacionamento, e
 * a atualização por Id não acha o registro. Esta rotina percorre a aba, dá
 * Id a quem está sem, e realinha a sequência.
 *
 * Só lê e escreve a coluna de Id: não toca em mais nada da linha.
 */
function normalizarIdentificadoresDaAba_(nomeDaAba) {
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(30000)) {
    throw new Error('A planilha está ocupada. Tente de novo.');
  }
  try {
    esquecerEstruturaLida_(nomeDaAba);
    var estrutura = estruturaDaAba_(nomeDaAba, true);
    var iId = posicaoDaColuna_(estrutura, 'Id');
    if (iId < 0) {
      throw new Error('A aba "' + nomeDaAba + '" não tem coluna Id.');
    }

    var totalDados = quantidadeDeRegistros_(estrutura);
    if (totalDados <= 0) {
      return { aba: nomeDaAba, carimbados: 0, repetidos: [], total: 0 };
    }

    realinharSequencia_(nomeDaAba);

    // Lê a aba inteira, e não só a coluna de Id: uma linha sem Id só se
    // distingue de uma linha em branco olhando as outras colunas.
    var bloco = estrutura.aba
      .getRange(2, 1, totalDados, estrutura.cabecalhos.length)
      .getValues();

    var faixa = estrutura.aba.getRange(2, iId + 1, totalDados, 1);
    var coluna = faixa.getValues();
    var vistos = {};
    var repetidos = [];
    var carimbados = 0;

    for (var i = 0; i < coluna.length; i++) {
      var atual = converterParaIdentificador_(coluna[i][0]);
      if (!atual) {
        if (linhaEstaVazia_(bloco[i])) continue;   // linha em branco não ganha Id
        coluna[i][0] = proximoIdentificador_(nomeDaAba);
        carimbados++;
        continue;
      }
      var normalizado = formatarIdentificador_(Number(atual));
      if (vistos[normalizado]) {
        repetidos.push({ linha: i + 2, id: normalizado });
      } else {
        vistos[normalizado] = true;
      }
      coluna[i][0] = normalizado;
    }

    // Texto ANTES do valor: é o que impede 0000000010 de virar 10.
    faixa.setNumberFormat('@');
    faixa.setValues(coluna);

    return {
      aba: nomeDaAba,
      total: totalDados,
      carimbados: carimbados,
      repetidos: repetidos
    };
  } finally {
    trava.releaseLock();
  }
}

/* ############################################################################
   #
   #  SEÇÃO 3 de 3 · A PORTA ÚNICA PARA O GOOGLE PLANILHAS
   #
   #  Era o arquivo Back-End/Planilha.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * ============================================================================
 * RECC — Planilha.gs · a porta única para o Google Planilhas
 * ============================================================================
 * NENHUM outro arquivo chama SpreadsheetApp. Toda leitura e toda gravação
 * passam por aqui — é o que garante, num lugar só, as duas regras que
 * sustentam a integridade do dado:
 *
 *   1. A coluna é encontrada pelo NOME do cabeçalho, nunca pela posição.
 *      Reordenar coluna na planilha não quebra o sistema.
 *
 *   2. A linha é FORMATADA antes de receber o valor.
 *      Identificador vai para célula de texto (@), dinheiro para célula de
 *      moeda, data para célula de data. Formatar depois não desfaz nada:
 *      quando o Sheets converteu 0000000010 em 10, o zero já se foi.
 *
 * Nenhum código de topo depende de outro arquivo: as referências a
 * RECC_ESQUEMA e a Base.gs acontecem dentro de função.
 * ============================================================================
 */

/** A estrutura já lida de cada aba, válida só durante esta execução. */
var estruturasJaLidas = {};

/** O tipo das colunas que NÃO estão no contrato, declarado na aba CAMPOS. */
var tiposDeclaradosJaLidos = null;
var lendoTiposDeclarados = false;

function esquecerEstruturaLida_(nomeDaAba) {
  if (nomeDaAba) {
    delete estruturasJaLidas[nomeDaAba];
    if (nomeDaAba === 'CAMPOS') tiposDeclaradosJaLidos = null;
  } else {
    estruturasJaLidas = {};
    tiposDeclaradosJaLidos = null;
  }
}

/**
 * O tipo das colunas criadas pelo administrador.
 *
 * Coluna do contrato tem tipo no Esquema. Coluna criada depois tem o tipo
 * declarado em CAMPOS — sem isso, uma coluna de moeda criada na tela receberia
 * "R$ 2.500,00" como texto, e o Power BI não somaria nada.
 *
 * A trava de reentrância existe porque ler CAMPOS passa por estruturaDaAba_, que é
 * justamente quem pergunta pelos tipos.
 */
function tiposDeclaradosPeloAdministrador_() {
  if (tiposDeclaradosJaLidos) return tiposDeclaradosJaLidos;
  if (lendoTiposDeclarados) return {};

  lendoTiposDeclarados = true;
  try {
    var mapa = {};
    if (planilhaAtiva_().getSheetByName('CAMPOS')) {
      lerRegistros_('CAMPOS', { incluirOcultos: true }).forEach(function (campo) {
        var aba = String(campo.Aba || '').trim();
        var cabecalho = String(campo.Cabecalho || '').trim();
        if (!aba || !cabecalho) return;
        if (!mapa[aba]) mapa[aba] = {};
        mapa[aba][normalizarParaComparar_(cabecalho)] =
          RECC_DO_CAMPO_PARA_O_DADO[campo.TipoCampo] || RECC_TIPO_DE_DADO.TEXTO;
      });
    }
    tiposDeclaradosJaLidos = mapa;
    return mapa;
  } finally {
    lendoTiposDeclarados = false;
  }
}

// ============================================================================
// NORMALIZAÇÃO — como dois cabeçalhos são considerados o mesmo
// ============================================================================

/**
 * "Código origem da proposta" e "codigo origem da proposta" e
 * "CODIGO_ORIGEM_DA_PROPOSTA" viram a mesma chave.
 *
 * Tolerância deliberada: acento, caixa, espaço, sublinhado e pontuação não
 * distinguem colunas. O que distingue são as letras e os números.
 */
function normalizarParaComparar_(texto) {
  return String(texto === null || texto === undefined ? '' : texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Só os dígitos. É assim que identificador é comparado e gravado. */
function apenasDigitos_(texto) {
  return String(texto === null || texto === undefined ? '' : texto).replace(/\D/g, '');
}

// ============================================================================
// ESTRUTURA — ler a linha 1 e montar o mapa cabeçalho → coluna
// ============================================================================

function planilhaAtiva_() {
  // SpreadsheetApp é o serviço do Google que dá acesso à planilha.
  var planilha = SpreadsheetApp.getActive();
  if (!planilha) {
    throw new Error('Nenhuma planilha vinculada a este projeto do Apps Script.');
  }
  return planilha;
}

/**
 * A estrutura de uma aba: a folha, os cabeçalhos como estão escritos na
 * linha 1, o mapa normalizado e o tipo de cada coluna.
 *
 * Coluna que existe na planilha mas não está no contrato entra como TEXTO —
 * é o caso de uma coluna acrescentada à mão, que o sistema respeita em vez
 * de ignorar.
 */
function estruturaDaAba_(nomeDaAba, recarregar) {
  if (!recarregar && estruturasJaLidas[nomeDaAba]) return estruturasJaLidas[nomeDaAba];

  var aba = planilhaAtiva_().getSheetByName(nomeDaAba);
  if (!aba) {
    throw new Error('A aba "' + nomeDaAba + '" não existe nesta planilha. ' +
      'Rode instalarRECC() numa planilha vazia, ou confira o nome da aba.');
  }

  var largura = aba.getLastColumn();
  if (largura < 1) {
    throw new Error('A aba "' + nomeDaAba + '" está sem cabeçalho na linha 1.');
  }

  var cabecalhos = aba.getRange(1, 1, 1, largura).getValues()[0].map(function (v) {
    return String(v === null || v === undefined ? '' : v).trim();
  });

  var mapa = {};
  var repetidos = [];
  for (var i = 0; i < cabecalhos.length; i++) {
    if (!cabecalhos[i]) continue;
    var chave = normalizarParaComparar_(cabecalhos[i]);
    if (!chave) continue;
    if (mapa[chave] !== undefined) {
      repetidos.push(cabecalhos[i]);
      continue;
    }
    mapa[chave] = i;
  }
  if (repetidos.length) {
    throw new Error('A aba "' + nomeDaAba + '" tem cabeçalho repetido: ' +
      repetidos.join(', ') + '. Dois cabeçalhos iguais tornam a coluna ' +
      'ambígua — renomeie um deles antes de continuar.');
  }

  var tiposDoContrato = {};
  if (RECC_ESQUEMA[nomeDaAba]) {
    var esquema = esquemaDaAba_(nomeDaAba);
    for (var j = 0; j < esquema.colunas.length; j++) {
      tiposDoContrato[normalizarParaComparar_(esquema.colunas[j].cabecalho)] = esquema.colunas[j].tipo;
    }
  }

  // Ordem da decisão: o contrato manda; depois o que o administrador declarou
  // em CAMPOS; e só então texto, que é o padrão seguro.
  var declarados = tiposDeclaradosPeloAdministrador_()[nomeDaAba] || {};
  var tipos = cabecalhos.map(function (cab) {
    var chave = normalizarParaComparar_(cab);
    return tiposDoContrato[chave] || declarados[chave] || RECC_TIPO_DE_DADO.TEXTO;
  });

  var estrutura = {
    nomeDaAba: nomeDaAba,
    aba: aba,
    cabecalhos: cabecalhos,
    mapa: mapa,
    tipos: tipos
  };
  estruturasJaLidas[nomeDaAba] = estrutura;
  return estrutura;
}

/** O índice (base 0) de uma coluna, ou -1 quando ela não existe. */
function posicaoDaColuna_(estrutura, cabecalho) {
  var i = estrutura.mapa[normalizarParaComparar_(cabecalho)];
  return i === undefined ? -1 : i;
}

function exigirPosicaoDaColuna_(estrutura, cabecalho) {
  var i = posicaoDaColuna_(estrutura, cabecalho);
  if (i < 0) {
    throw new Error('A coluna "' + cabecalho + '" não existe na aba "' +
      estrutura.nomeDaAba + '". Colunas encontradas: ' + estrutura.cabecalhos.join(' | '));
  }
  return i;
}

// ============================================================================
// CONVERSÃO — o valor que chega vira o tipo que a célula espera
// ============================================================================

/**
 * Identificador: só dígitos, sempre texto.
 *
 * Lista de valores (o caso de "telefones de contato") preserva o ";" como
 * separador e limpa cada parte — senão dois telefones virariam um número só.
 */
function converterParaIdentificador_(valor) {
  var bruto = String(valor === null || valor === undefined ? '' : valor).trim();
  if (!bruto) return '';
  if (bruto.indexOf(';') >= 0 || bruto.indexOf('/') >= 0) {
    return bruto.split(/[;/]/)
      .map(function (parte) { return apenasDigitos_(parte); })
      .filter(function (parte) { return parte !== ''; })
      .join(';');
  }
  return apenasDigitos_(bruto);
}

/** Aceita 1234.56, "1234,56", "1.234,56" e "R$ 1.234,56". */
function converterParaNumero_(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (typeof valor === 'number') return isFinite(valor) ? valor : '';

  var texto = String(valor)
    .replace(/R\$/gi, '')
    .replace(/ /g, '')
    .replace(/\s/g, '')
    .trim();
  if (!texto) return '';

  var negativo = /^\(.*\)$/.test(texto) || texto.indexOf('-') === 0;
  texto = texto.replace(/[()\-]/g, '');

  if (texto.indexOf(',') >= 0) {
    // Formato brasileiro: ponto é milhar, vírgula é decimal.
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(texto)) {
    // 1.234.567 — só milhar, sem decimal.
    texto = texto.replace(/\./g, '');
  }

  var n = Number(texto);
  if (!isFinite(n)) return '';
  return negativo ? -n : n;
}

/** Aceita Date, "dd/MM/yyyy" e "yyyy-MM-dd". */
function converterParaData_(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return isNaN(valor.getTime()) ? '' : valor;
  }
  var texto = String(valor).trim();
  var br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  var iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return '';
}

/**
 * Hora do dia.
 *
 * A hora é carregada numa data de apoio, porque no Sheets a hora é a parte
 * fracionária de uma data. A data usada é 01/01/1970 de propósito: a época do
 * Sheets (30/12/1899) cai antes da padronização de fuso do Brasil — São Paulo
 * usava -03:06:28 —, e uma hora ancorada ali chega deslocada em minutos.
 */
function converterParaHora_(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return isNaN(valor.getTime()) ? '' : valor;
  }
  var m = String(valor).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return '';
  var h = Number(m[1]);
  var min = Number(m[2]);
  if (h > 23 || min > 59) return '';
  return new Date(1970, 0, 1, h, min, Number(m[3] || 0));
}

function converterParaDataEHora_(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return isNaN(valor.getTime()) ? '' : valor;
  }
  var d = new Date(String(valor));
  return isNaN(d.getTime()) ? '' : d;
}

function converterParaSimOuNao_(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (valor === true) return 'SIM';
  if (valor === false) return 'NAO';
  var t = normalizarParaComparar_(valor);
  if (t === 'sim' || t === 's' || t === 'true' || t === '1' || t === 'verdadeiro') return 'SIM';
  if (t === 'nao' || t === 'n' || t === 'false' || t === '0' || t === 'falso') return 'NAO';
  return '';
}

function converterParaOTipoDaColuna_(valor, tipo) {
  switch (tipo) {
    case RECC_TIPO_DE_DADO.IDENTIFICADOR:
      return converterParaIdentificador_(valor);
    case RECC_TIPO_DE_DADO.NUMERO:
    case RECC_TIPO_DE_DADO.DINHEIRO:
      return converterParaNumero_(valor);
    case RECC_TIPO_DE_DADO.DATA:
      return converterParaData_(valor);
    case RECC_TIPO_DE_DADO.HORA:
      return converterParaHora_(valor);
    case RECC_TIPO_DE_DADO.DATA_HORA:
      return converterParaDataEHora_(valor);
    case RECC_TIPO_DE_DADO.SIM_OU_NAO:
      return converterParaSimOuNao_(valor);
    case RECC_TIPO_DE_DADO.TEXTO:
    case RECC_TIPO_DE_DADO.TEXTO_LONGO:
      if (valor === null || valor === undefined) return '';
      if (Object.prototype.toString.call(valor) === '[object Date]') return valor;
      return String(valor);
    default:
      // Nada de cair em texto silenciosamente. Se um tipo novo for criado no
      // Esquema e esquecido aqui, um CPF viraria texto com pontuação e um
      // valor viraria texto em vez de número — e ninguém perceberia até o
      // Power BI não somar. Erro alto é melhor que dado errado calado.
      throw new Error('Tipo de coluna desconhecido: "' + tipo + '". ' +
        'Todo tipo declarado em RECC_TIPO_DE_DADO precisa ter um caso em ' +
        'converterParaOTipoDaColuna_.');
  }
}

/** O formato de cada célula da linha, na ordem das colunas da aba. */
function formatosDaLinha_(estrutura) {
  return estrutura.tipos.map(function (t) {
    return RECC_FORMATO_DA_CELULA[t] || '@';
  });
}

// ============================================================================
// LEITURA
// ============================================================================

/**
 * Abre uma planilha DE FORA, pelo Id.
 *
 * Mora aqui pela mesma razão que todo o resto: `SpreadsheetApp` é chamado num
 * lugar só. Antes disto, dois pontos da Busca abriam a planilha legada por
 * conta própria, cada um com o seu texto de erro — e o texto de erro é
 * justamente o que importa aqui, porque a causa é quase sempre a mesma e
 * quase nunca óbvia: a conta que roda o sistema não tem acesso à planilha.
 *
 * Nenhum contrato é aplicado ao que vem de fora. Ela é lida como está.
 */
function abrirPlanilhaDeFora_(idDaPlanilha) {
  var id = String(idDaPlanilha || '').trim();
  if (!id) throw new Error('Informe o Id da planilha.');
  try {
    return SpreadsheetApp.openById(id);
  } catch (erro) {
    throw new Error('Não consegui abrir a planilha: ' + (erro.message || erro)
      + ' Confira o Id — ele é o pedaço do endereço entre /d/ e /edit — e se '
      + 'esta conta tem acesso a ela.');
  }
}

/**
 * A última linha com CONTEÚDO na aba.
 *
 * getLastRow() olha conteúdo, não formatação — então a área de reserva que o
 * instalador pré-formata não infla esta conta.
 *
 * E é conteúdo de QUALQUER coluna, deliberadamente: usar a coluna de Id aqui
 * seria mais preciso e daria dois bugs. Uma linha digitada à mão nasce sem Id,
 * então ficaria invisível para o "Normalizar base" — que existe justamente
 * para carimbá-la —, e a próxima inserção do sistema gravaria POR CIMA dela.
 */
function ultimaLinhaComConteudo_(estrutura) {
  return Math.max(estrutura.aba.getLastRow(), 1);
}

/** Quantas linhas de dado a aba tem (sem contar o cabeçalho). */
function quantidadeDeRegistros_(estrutura) {
  return Math.max(ultimaLinhaComConteudo_(estrutura) - 1, 0);
}

/** Buraco no meio da aba não é registro. */
function linhaEstaVazia_(valores) {
  for (var i = 0; i < valores.length; i++) {
    var v = valores[i];
    if (v !== '' && v !== null && v !== undefined) return false;
  }
  return true;
}

/**
 * Uma linha da planilha vira objeto, com as chaves iguais aos cabeçalhos.
 *
 * Além dos cabeçalhos, todo registro carrega `__id` e `__linha`.
 *
 * O `__id` existe porque a coluna de identificador NÃO tem o mesmo nome em
 * toda aba: é `ID` na Mesa Diamante, `id` na RET Vida e `Id` nas abas de
 * sistema. Quem consome o registro não deveria precisar saber a grafia de
 * cada aba para achar o identificador — e quando precisava, lia `undefined`
 * em silêncio e seguia adiante com ele.
 */
function montarRegistro_(estrutura, valores, numeroDaLinha) {
  var reg = {};
  for (var i = 0; i < estrutura.cabecalhos.length; i++) {
    if (!estrutura.cabecalhos[i]) continue;
    reg[estrutura.cabecalhos[i]] = valores[i];
  }
  var iId = posicaoDaColuna_(estrutura, 'Id');
  reg.__id = iId >= 0 ? converterParaIdentificador_(valores[iId]) : '';
  reg.__linha = numeroDaLinha;
  return reg;
}

/**
 * Lê registros de uma aba.
 *
 *   opcoes.ultimas         lê só as N últimas linhas. A a base só acrescenta no fim, nunca reordena,
 *                          então o recente é sempre o fim — é o que permite
 *                          a fila de trabalho não ler 200 mil linhas para
 *                          mostrar 40.
 *   opcoes.incluirOcultos  traz também as linhas com _Visivel = NAO.
 */
function lerRegistros_(nomeDaAba, opcoes) {
  opcoes = opcoes || {};
  var estrutura = estruturaDaAba_(nomeDaAba);
  var totalDados = quantidadeDeRegistros_(estrutura);
  if (totalDados <= 0) return [];

  var primeira = 2;
  var quantas = totalDados;
  if (opcoes.ultimas > 0 && opcoes.ultimas < totalDados) {
    primeira = 2 + (totalDados - opcoes.ultimas);
    quantas = opcoes.ultimas;
  }

  var valores = estrutura.aba
    .getRange(primeira, 1, quantas, estrutura.cabecalhos.length)
    .getValues();

  var iVisivel = posicaoDaColuna_(estrutura, '_Visivel');
  var saida = [];
  for (var i = 0; i < valores.length; i++) {
    if (linhaEstaVazia_(valores[i])) continue;
    if (!opcoes.incluirOcultos && iVisivel >= 0) {
      if (normalizarParaComparar_(valores[i][iVisivel]) === 'nao') continue;
    }
    saida.push(montarRegistro_(estrutura, valores[i], primeira + i));
  }
  return saida;
}

/**
 * Lê UMA coluna inteira. É a primeira metade de toda busca: numa base de
 * 200 mil linhas por 39 colunas, ler tudo são 7,8 milhões de células; ler
 * uma coluna são 200 mil.
 */
function lerColunaInteira_(nomeDaAba, cabecalho) {
  var estrutura = estruturaDaAba_(nomeDaAba);
  var i = exigirPosicaoDaColuna_(estrutura, cabecalho);
  var totalDados = quantidadeDeRegistros_(estrutura);
  if (totalDados <= 0) return [];
  return estrutura.aba.getRange(2, i + 1, totalDados, 1).getValues().map(function (l) {
    return l[0];
  });
}

/** Lê só as linhas indicadas (números de linha da planilha). */
/**
 * Até quantas linhas sem interesse vale a pena ler para não pagar outra ida.
 *
 * A conta é direta: uma ida ao serviço de planilha custa uns 25 ms, e ler uma
 * linha a mais custa a transferência de umas 39 células — menos de um décimo
 * de milissegundo. Ler cinquenta linhas à toa sai muito mais barato do que
 * atravessar a fronteira de novo.
 */
var RECC_BURACO_QUE_VALE_PULAR = 50;

/**
 * Junta os números de linha em BLOCOS contínuos, tolerando buracos pequenos.
 *
 * [12, 13, 14, 900, 901] com tolerância 50 vira dois blocos: 12–14 e 900–901.
 * [12, 30, 40] vira um só: 12–40, porque ler as 27 linhas do meio é mais
 * barato que duas idas a mais.
 */
function blocosDeLinhas_(numerosDeLinha) {
  var ordenados = numerosDeLinha.slice().sort(function (um, outro) {
    return um - outro;
  });
  var blocos = [];
  for (var i = 0; i < ordenados.length; i++) {
    var ultimo = blocos.length ? blocos[blocos.length - 1] : null;
    if (ultimo && ordenados[i] - ultimo.fim <= RECC_BURACO_QUE_VALE_PULAR) {
      ultimo.fim = ordenados[i];
    } else {
      blocos.push({ inicio: ordenados[i], fim: ordenados[i] });
    }
  }
  return blocos;
}

/**
 * Lê linhas escolhidas, agrupadas em blocos.
 *
 * É a segunda metade da busca: a primeira leu só as colunas de procura e
 * anotou em QUAIS linhas o termo apareceu; esta lê essas linhas inteiras.
 *
 * Uma ida por linha era o que fazia antes, e com o limite de 100 resultados
 * isso eram cem idas ao serviço — dois segundos e meio de pedágio numa tela
 * que a operação usa o dia inteiro. Agrupando, uma busca de cem resultados
 * que caem perto costuma sair numa ida só.
 *
 * A ordem de saída é a ordem PEDIDA, e não a da planilha: quem chamou já
 * ordenou por relevância, e reordenar aqui desfaria isso em silêncio.
 */
function lerLinhasEspecificas_(nomeDaAba, numerosDeLinha) {
  if (!numerosDeLinha || !numerosDeLinha.length) return [];

  var estrutura = estruturaDaAba_(nomeDaAba);
  var largura = estrutura.cabecalhos.length;
  var porLinha = {};

  blocosDeLinhas_(numerosDeLinha).forEach(function (bloco) {
    var quantas = bloco.fim - bloco.inicio + 1;
    var valores = estrutura.aba
      .getRange(bloco.inicio, 1, quantas, largura).getValues();
    for (var i = 0; i < valores.length; i++) {
      porLinha[bloco.inicio + i] = valores[i];
    }
  });

  var saida = [];
  for (var j = 0; j < numerosDeLinha.length; j++) {
    var n = numerosDeLinha[j];
    if (porLinha[n]) saida.push(montarRegistro_(estrutura, porLinha[n], n));
  }
  return saida;
}

/**
 * Busca por valor numa coluna e devolve as linhas inteiras.
 * Identificador é comparado só pelos dígitos, então "1-2345678901" e
 * "12345678901" acham a mesma linha.
 */
function buscarRegistros_(nomeDaAba, cabecalho, valor, limite) {
  var estrutura = estruturaDaAba_(nomeDaAba);
  var i = exigirPosicaoDaColuna_(estrutura, cabecalho);
  var tipo = estrutura.tipos[i];
  var ehIdentificador = (tipo === RECC_TIPO_DE_DADO.IDENTIFICADOR);

  var alvo = ehIdentificador
    ? converterParaIdentificador_(valor)
    : normalizarParaComparar_(valor);
  if (alvo === '') return [];

  var coluna = lerColunaInteira_(nomeDaAba, cabecalho);
  var linhas = [];
  for (var k = 0; k < coluna.length; k++) {
    var atual = ehIdentificador
      ? converterParaIdentificador_(coluna[k])
      : normalizarParaComparar_(coluna[k]);
    if (atual === alvo) {
      linhas.push(k + 2);
      if (limite && linhas.length >= limite) break;
    }
  }
  return lerLinhasEspecificas_(nomeDaAba, linhas);
}

/** Encontra a linha de um Id. Id repetido é erro, nunca "usa a primeira". */
function linhaDoRegistro_(estrutura, id) {
  var iId = exigirPosicaoDaColuna_(estrutura, 'Id');
  var totalDados = quantidadeDeRegistros_(estrutura);
  if (totalDados <= 0) return -1;

  var alvo = converterParaIdentificador_(id);
  var coluna = estrutura.aba.getRange(2, iId + 1, totalDados, 1).getValues();
  var achadas = [];
  for (var i = 0; i < coluna.length; i++) {
    if (converterParaIdentificador_(coluna[i][0]) === alvo) achadas.push(i + 2);
  }
  if (achadas.length > 1) {
    throw new Error('O Id ' + alvo + ' aparece em ' + achadas.length +
      ' linhas da aba "' + estrutura.nomeDaAba + '" (linhas ' + achadas.join(', ') +
      '). Gravar assim sobrescreveria o registro errado. ' +
      'Rode "Normalizar base" antes de continuar.');
  }
  return achadas.length ? achadas[0] : -1;
}

// ============================================================================
// GRAVAÇÃO — sempre em bloco, sempre com o formato aplicado antes
// ============================================================================

/**
 * Monta a linha inteira já coagida, na ordem real das colunas da aba.
 * `dados` pode vir com as chaves escritas de qualquer jeito: a busca é
 * normalizada.
 */
function montarLinhaParaGravar_(estrutura, dados, valoresAtuais) {
  var porChave = {};
  var nomeInformado = {};
  Object.keys(dados).forEach(function (chaveInformada) {
    // As chaves internas (__id, __linha) descrevem o registro, não são dele.
    if (chaveInformada.indexOf('__') === 0) return;
    var chave = normalizarParaComparar_(chaveInformada);
    porChave[chave] = dados[chaveInformada];
    nomeInformado[chave] = chaveInformada;
  });

  var usadas = {};
  var linha = [];
  for (var i = 0; i < estrutura.cabecalhos.length; i++) {
    var chave = normalizarParaComparar_(estrutura.cabecalhos[i]);
    if (!estrutura.cabecalhos[i]) {
      linha.push(valoresAtuais ? valoresAtuais[i] : '');
    } else if (Object.prototype.hasOwnProperty.call(porChave, chave)) {
      usadas[chave] = true;
      linha.push(converterParaOTipoDaColuna_(porChave[chave], estrutura.tipos[i]));
    } else {
      linha.push(valoresAtuais ? valoresAtuais[i] : '');
    }
  }

  // Campo que não corresponde a nenhuma coluna vira ERRO, e não descarte.
  // Descartar em silêncio é perda de dado calada: um "Protocolo" digitado
  // "Protocolos" seria jogado fora e a tela ainda diria "salvo".
  var semColuna = Object.keys(porChave)
    .filter(function (chave) { return !usadas[chave]; })
    .map(function (chave) { return nomeInformado[chave]; });
  if (semColuna.length) {
    throw new Error('A aba "' + estrutura.nomeDaAba + '" não tem coluna para: ' +
      semColuna.join(', ') + '. Colunas existentes: ' +
      estrutura.cabecalhos.filter(String).join(' | '));
  }

  return linha;
}

/** Formata a faixa e só então grava. A ordem é a regra inteira. */
function formatarEGravar_(estrutura, primeiraLinha, linhas) {
  var faixa = estrutura.aba.getRange(
    primeiraLinha, 1, linhas.length, estrutura.cabecalhos.length);
  var formatoDaLinha = formatosDaLinha_(estrutura);
  var formatos = linhas.map(function () { return formatoDaLinha; });
  faixa.setNumberFormats(formatos);
  faixa.setValues(linhas);
}

/**
 * Insere um registro. Gera o Id se ele não vier pronto, marca a linha como
 * visível e registra que ela nasceu no sistema.
 */
function inserirRegistro_(nomeDaAba, dados, contexto) {
  return inserirVariosRegistros_(nomeDaAba, [dados], contexto)[0];
}

/** Insere vários registros numa gravação só. */
function inserirVariosRegistros_(nomeDaAba, lista, contexto) {
  if (!lista || !lista.length) return [];
  contexto = contexto || {};

  var trava = LockService.getScriptLock();
  if (!trava.tryLock(25000)) {
    throw new Error('A planilha está ocupada com outra gravação. Tente de novo.');
  }
  try {
    esquecerEstruturaLida_(nomeDaAba);
    var estrutura = estruturaDaAba_(nomeDaAba, true);
    var temControle = posicaoDaColuna_(estrutura, '_Visivel') >= 0;
    var iId = posicaoDaColuna_(estrutura, 'Id');

    // Quantas linhas precisam de Id novo — algumas já vêm com um. O bloco é
    // reservado numa ida só ao PropertiesService, e não uma por linha: com uma
    // por linha, gravar cinco mil casos eram dez mil idas e dois minutos de
    // pedágio dentro de uma execução que tem seis.
    var precisamDeId = 0;
    if (iId >= 0) {
      for (var p = 0; p < lista.length; p++) {
        if (!converterParaIdentificador_(lista[p][estrutura.cabecalhos[iId]])) {
          precisamDeId++;
        }
      }
    }
    var idsReservados = proximosIdentificadores_(nomeDaAba, precisamDeId);
    var proximoDoBloco = 0;

    var linhas = [];
    var gravados = [];
    for (var i = 0; i < lista.length; i++) {
      var dados = {};
      Object.keys(lista[i]).forEach(function (k) { dados[k] = lista[i][k]; });

      if (iId >= 0) {
        var idInformado = converterParaIdentificador_(dados[estrutura.cabecalhos[iId]]);
        if (!idInformado) {
          dados[estrutura.cabecalhos[iId]] = idsReservados[proximoDoBloco];
          proximoDoBloco++;
        }
      }
      if (temControle) {
        if (dados._Visivel === undefined) dados._Visivel = RECC_VISIVEL_SIM;
        if (dados._Origem === undefined) {
          dados._Origem = contexto.origem || RECC_ORIGEM_SISTEMA;
        }
      }
      linhas.push(montarLinhaParaGravar_(estrutura, dados, null));
      gravados.push(dados);
    }

    var primeira = ultimaLinhaComConteudo_(estrutura) + 1;
    if (primeira < 2) primeira = 2;
    garantirLinhasNaGrade_(estrutura.aba, primeira + linhas.length - 1);
    formatarEGravar_(estrutura, primeira, linhas);

    for (var j = 0; j < gravados.length; j++) {
      gravados[j].__linha = primeira + j;
      gravados[j].__id = iId >= 0
        ? converterParaIdentificador_(gravados[j][estrutura.cabecalhos[iId]])
        : '';
    }
    return gravados;
  } finally {
    trava.releaseLock();
  }
}

/**
 * Atualiza um registro pelo Id.
 * Lê a linha, mescla as alterações e regrava a linha inteira já formatada —
 * assim uma coluna nunca fica com o formato de outro tipo.
 */
function atualizarRegistro_(nomeDaAba, id, alteracoes) {
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(25000)) {
    throw new Error('A planilha está ocupada com outra gravação. Tente de novo.');
  }
  try {
    esquecerEstruturaLida_(nomeDaAba);
    var estrutura = estruturaDaAba_(nomeDaAba, true);
    var linha = linhaDoRegistro_(estrutura, id);
    if (linha < 0) {
      throw new Error('Registro ' + converterParaIdentificador_(id) + ' não encontrado na aba "' +
        nomeDaAba + '".');
    }
    var atuais = estrutura.aba.getRange(linha, 1, 1, estrutura.cabecalhos.length).getValues()[0];
    var nova = montarLinhaParaGravar_(estrutura, alteracoes, atuais);
    formatarEGravar_(estrutura, linha, [nova]);
    return montarRegistro_(estrutura, nova, linha);
  } finally {
    trava.releaseLock();
  }
}

/**
 * Exclusão do RECC: some da tela, permanece na planilha.
 * Nenhuma linha de base operacional é apagada — nunca.
 */
function ocultarRegistro_(nomeDaAba, id, usuarioId) {
  if (posicaoDaColuna_(estruturaDaAba_(nomeDaAba), '_Visivel') < 0) {
    throw new Error('A aba "' + nomeDaAba + '" não tem exclusão lógica — ela ' +
      'não possui a coluna _Visivel. Em abas de catálogo, o que desliga um ' +
      'item é a coluna Ativo.');
  }
  return atualizarRegistro_(nomeDaAba, id, {
    _Visivel: RECC_VISIVEL_NAO,
    _ExcluidoEm: new Date(),
    _ExcluidoPor: usuarioId || ''
  });
}

function reexibirRegistro_(nomeDaAba, id) {
  return atualizarRegistro_(nomeDaAba, id, {
    _Visivel: RECC_VISIVEL_SIM,
    _ExcluidoEm: '',
    _ExcluidoPor: ''
  });
}

// ============================================================================
// ESTRUTURA — crescer a aba de propósito, nunca por acidente
// ============================================================================

/** A aba precisa ter linha suficiente na grade para receber a gravação. */
function garantirLinhasNaGrade_(aba, ateLinha) {
  var faltam = ateLinha - aba.getMaxRows();
  if (faltam > 0) aba.insertRowsAfter(aba.getMaxRows(), faltam);
}

/**
 * Acrescenta uma coluna ao FIM da aba.
 *
 * Só é chamada por ação explícita do administrador — jamais durante um
 * salvamento comum. Recusa cabeçalho que já exista, mesmo escrito diferente.
 */
function adicionarColuna_(nomeDaAba, cabecalho, tipo) {
  var texto = String(cabecalho || '').trim();
  if (!texto) throw new Error('Cabeçalho vazio.');
  if (!RECC_FORMATO_DA_CELULA[tipo]) throw new Error('Tipo de coluna desconhecido: ' + tipo);

  var nova;
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(25000)) {
    throw new Error('A planilha está ocupada. Tente de novo.');
  }
  try {
    esquecerEstruturaLida_(nomeDaAba);
    var estrutura = estruturaDaAba_(nomeDaAba, true);
    if (posicaoDaColuna_(estrutura, texto) >= 0) {
      throw new Error('A aba "' + nomeDaAba + '" já tem uma coluna equivalente a "' +
        texto + '".');
    }

    var aba = estrutura.aba;
    nova = estrutura.cabecalhos.length + 1;
    if (aba.getMaxColumns() < nova) {
      aba.insertColumnsAfter(aba.getMaxColumns(), nova - aba.getMaxColumns());
    }
    aba.getRange(1, nova).setNumberFormat('@');
    aba.getRange(1, nova).setValue(texto).setFontWeight('bold');
    var altura = Math.max(aba.getMaxRows() - 1, 1);
    aba.getRange(2, nova, altura, 1).setNumberFormat(RECC_FORMATO_DA_CELULA[tipo]);
    esquecerEstruturaLida_(nomeDaAba);
  } finally {
    trava.releaseLock();
  }

  // Fora da trava, de propósito: inserirVariosRegistros_ pega a dela, e trava dentro
  // de trava é como um deadlock nasce.
  registrarColunaEmCampos_(nomeDaAba, texto, tipo, nova);
  esquecerEstruturaLida_();

  return { aba: nomeDaAba, cabecalho: texto, tipo: tipo, coluna: nova };
}

/**
 * Registra a coluna nova em CAMPOS.
 *
 * Não é burocracia: é onde o tipo da coluna passa a morar. Sem esta linha, na
 * próxima execução a coluna voltaria a ser lida como texto — e uma coluna de
 * moeda guardaria "R$ 2.500,00" em vez de 2500.
 */
function registrarColunaEmCampos_(nomeDaAba, cabecalho, tipo, ordem) {
  if (!planilhaAtiva_().getSheetByName('CAMPOS')) return null;

  var mesaId = '';
  if (planilhaAtiva_().getSheetByName('MESAS')) {
    var mesa = lerRegistros_('MESAS').filter(function (m) {
      return normalizarParaComparar_(m.Aba) === normalizarParaComparar_(nomeDaAba);
    })[0];
    if (mesa) mesaId = mesa.Id;
  }

  return inserirRegistro_('CAMPOS', {
    MesaId: mesaId,
    Aba: nomeDaAba,
    ChaveTecnica: normalizarParaComparar_(cabecalho),
    Cabecalho: cabecalho,
    Rotulo: cabecalho,
    Descricao: '',
    TipoCampo: RECC_DO_DADO_PARA_O_CAMPO[tipo] || 'texto',
    Secao: 'Geral',
    Mascara: '',
    Obrigatorio: false,
    Protegido: false,
    Ativo: true,
    Ordem: ordem,
    VisivelPara: '',
    ValorPadrao: '',
    Configuracao: ''
  });
}

// ============================================================================
// CONFERÊNCIA — o sistema valida, nunca conserta sozinho
// ============================================================================

/**
 * Compara o que o contrato espera com o que a planilha tem.
 * Não cria, não renomeia, não apaga e não reordena nada: devolve o laudo
 * para a tela de reconciliação decidir com o administrador.
 */
function conferirEstrutura_() {
  var planilha = planilhaAtiva_();
  var laudo = { ok: true, abas: [] };

  nomesDasAbasDoContrato_().forEach(function (nomeDaAba) {
    var esquema = esquemaDaAba_(nomeDaAba);
    var item = {
      aba: nomeDaAba,
      existe: false,
      faltando: [],
      aMais: [],
      linhas: 0
    };

    var aba = planilha.getSheetByName(nomeDaAba);
    if (!aba) {
      laudo.ok = false;
      laudo.abas.push(item);
      return;
    }
    item.existe = true;
    var estrutura = estruturaDaAba_(nomeDaAba, true);
    item.linhas = quantidadeDeRegistros_(estrutura);
    var presentes = {};
    estrutura.cabecalhos.forEach(function (c) {
      if (c) presentes[normalizarParaComparar_(c)] = c;
    });

    var esperados = {};
    esquema.colunas.forEach(function (coluna) {
      esperados[normalizarParaComparar_(coluna.cabecalho)] = coluna.cabecalho;
      if (presentes[normalizarParaComparar_(coluna.cabecalho)] === undefined) item.faltando.push(coluna.cabecalho);
    });

    Object.keys(presentes).forEach(function (chave) {
      if (esperados[chave] === undefined) item.aMais.push(presentes[chave]);
    });

    if (item.faltando.length) laudo.ok = false;
    laudo.abas.push(item);
  });

  return laudo;
}
