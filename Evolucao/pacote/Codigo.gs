/* ==========================================================================
   PGO — Codigo.gs
   --------------------------------------------------------------------------
   ARQUIVO GERADO — não edite aqui.

   Ele junta os 7 arquivos .gs do repositório para caberem numa colagem só no
   Apps Script. Para mudar qualquer coisa, mexa no arquivo original e rode
   de novo:

       node Evolucao/Testes/gerar-pacote.js

   Gerado em 2026-09-15 21:37
   ========================================================================== */



/* ==== Base.gs ============================================================= */

/**
 * ============================================================================
 * PGO — Base.gs · como o sistema fala com a planilha
 * ============================================================================
 * A fundação. Nada aqui sabe o que é um caso, um canal ou um usuário:
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
      // Quem passou o caso adiante. Só aparece no formulário quando o canal
      // de origem é a Central — ver mostrarSe, em RECC_PADRAO_DO_FORMULARIO.
      { cabecalho: 'nome de quem transferiu', tipo: 'texto', protegido: false },
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
      // O canal em que a pessoa trabalha. VAZIO É VÁLIDO, e é o caso do
      // administrador: quem administra não pertence a um canal, atende as
      // duas e delega para quem for. Exigir canal dele obrigaria a inventar
      // uma resposta para uma pergunta que não se aplica.
      { cabecalho: 'CanalId', tipo: 'identificador', protegido: false },
      { cabecalho: 'CargoId', tipo: 'identificador', protegido: true },
      { cabecalho: 'NivelAcessoId', tipo: 'identificador', protegido: true },
      { cabecalho: 'Matricula', tipo: 'identificador', protegido: false },
      { cabecalho: 'Ativo', tipo: 'simOuNao', protegido: true },
      { cabecalho: 'DataCadastro', tipo: 'dataHora', protegido: true },
      { cabecalho: 'UltimoAcesso', tipo: 'dataHora', protegido: true }
    ]
  },

  CORRETORAS: {
    aba: 'CORRETORAS',
    titulo: 'Canais, corretores e agentes',
    controle: true,
    reserva: 1000,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'Nome', tipo: 'texto', protegido: true },
      { cabecalho: 'Canal', tipo: 'texto', protegido: true },
      { cabecalho: 'SUSEP', tipo: 'identificador', protegido: true },
      { cabecalho: 'Corretora', tipo: 'texto', protegido: true },
      { cabecalho: 'Segmento', tipo: 'texto', protegido: true },
      // Quem atende a corretora. Vem na mesma lista que a operação já mantém
      // fora do sistema — 145 corretoras e mais de 7 mil SUSEPs —, e por isso
      // entra pela importação em lote, não digitado uma linha por vez.
      { cabecalho: 'Consultor', tipo: 'texto', protegido: false }
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
  CANAIS: {
    aba: 'CANAIS',
    titulo: 'Canais de trabalho',
    controle: false,
    reserva: 50,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'Nome', tipo: 'texto', protegido: true },
      { cabecalho: 'Descricao', tipo: 'texto', protegido: false },
      { cabecalho: 'Aba', tipo: 'texto', protegido: true },
      // Quais colunas da base guardam quando o caso entrou. É daqui que sai a
      // "data do último registro" da barra superior. Ficam declaradas, e não
      // adivinhadas, porque cado canal nomeia essa coluna do seu jeito.
      { cabecalho: 'ColunaDaData', tipo: 'texto', protegido: false },
      { cabecalho: 'ColunaDaHora', tipo: 'texto', protegido: false },
      // O painel precisa saber onde o canal guarda cada coisa. Declarado, e
      // não adivinhado pelo nome: cado canal batiza a coluna do seu jeito, e
      // adivinhar acerta hoje e erra no canal que vier depois.
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
      // Quantos casos por mês se espera de uma pessoa neste canal. Zero
      // desliga a meta: canal sem meta declarada não inventa uma, e a tela
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
      { cabecalho: 'CanalId', tipo: 'identificador', protegido: true },
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
      { cabecalho: 'CanalId', tipo: 'identificador', protegido: false },
      { cabecalho: 'Tipo', tipo: 'texto', protegido: true },
      { cabecalho: 'Codigo', tipo: 'identificador', protegido: false },
      { cabecalho: 'Nome', tipo: 'texto', protegido: true },
      { cabecalho: 'Rotulo', tipo: 'texto', protegido: false },
      { cabecalho: 'PaiId', tipo: 'identificador', protegido: false },
      { cabecalho: 'Cor', tipo: 'texto', protegido: false },
      // SÓ PARA ITENS DE STATUS: em qual coluna da base gravar a data e a
      // hora em que o caso CHEGOU a este status.
      //
      // É o que mede produtividade. Na RET interessa quando o 1º contato
      // aconteceu; na Mesa Diamante, quando o caso foi concluído. Antes isso
      // ficava na auditoria, longe do caso — e ninguém cruza auditoria com
      // base para montar um relatório. Aqui o carimbo mora na MESMA linha do
      // caso, na aba do próprio canal, e sai direto para o Power BI.
      //
      // Vazio quer dizer "este status não carimba nada", que é o normal para
      // a maioria deles.
      { cabecalho: 'ColunaDeCarimbo', tipo: 'texto', protegido: false },
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
      { cabecalho: 'CanalId', tipo: 'identificador', protegido: false },
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
    Dashboard saíram de CANAIS: é uma LISTA de coisas configuráveis, cada uma
    com nome, canal, colunas e filtro próprios. Guardada como texto numa célula,
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
      { cabecalho: 'CanalId', tipo: 'identificador', protegido: false },
      // Cabeçalhos separados por vírgula. Vazio = todas as colunas do canal.
      { cabecalho: 'Colunas', tipo: 'textoLongo', protegido: false },
      // 'Coluna=valor' separados por ponto e vírgula. Vazio = sem filtro.
      { cabecalho: 'Filtros', tipo: 'textoLongo', protegido: false },
      // Janela em dias, contada da coluna de data do canal. 0 = tudo.
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

/**
 * ----------------------------------------------------------------------------
 * O MEMO DAS ABAS DE SISTEMA
 * ----------------------------------------------------------------------------
 * Abrir o Dashboard custava 48 idas ao Planilhas, e a maioria era a MESMA aba
 * lida de novo: num pacoteDePartida só, CONFIG era lido 10 vezes; num
 * resumoDoCanal, CATALOGO era lido 7. Ninguém escreveu isso de propósito — são
 * funções pequenas e corretas, cada uma lendo o que precisa, e o custo só
 * aparece quando se conta o total.
 *
 * Como cada chamada da tela é uma EXECUÇÃO NOVA no Apps Script, uma variável
 * de topo dura exatamente uma requisição. É o tempo certo: não há como servir
 * dado velho para a próxima chamada, porque não existe próxima chamada nesta
 * execução.
 *
 * SÓ ABAS DE SISTEMA ENTRAM. As bases operacionais ficam de fora, e não é
 * detalhe: BASE_RET com 200 mil linhas na memória estouraria a execução. A
 * lista é explícita para que ninguém precise adivinhar a regra.
 */
var RECC_ABAS_QUE_VALE_GUARDAR = [
  'CONFIG', 'CATALOGO', 'CORRETORAS', 'CAMPOS', 'PAINEIS', 'ANALISES',
  'NIVEIS_ACESSO', 'USUARIOS', 'PRODUTOS'
];

var registrosJaLidos = {};

/** A chave leva as opções junto: "as últimas 500" não é a mesma coisa que tudo. */
function chaveDoMemo_(nomeDaAba, opcoes) {
  return nomeDaAba + '|' + (Number(opcoes.ultimas) || 0)
    + '|' + (opcoes.incluirOcultos ? 1 : 0);
}

function valeGuardarNaMemoria_(nomeDaAba) {
  return RECC_ABAS_QUE_VALE_GUARDAR.indexOf(nomeDaAba) >= 0;
}

/**
 * Uma cópia rasa de cada registro.
 *
 * Sem isso, duas partes do sistema que pedissem a mesma aba receberiam o
 * MESMO objeto — e uma que mexesse num campo mudaria o que a outra lê, num
 * defeito que só aparece na ordem certa de chamadas. Registro é um mapa
 * chato de valores, então cópia rasa basta, e copiar trezentas linhas custa
 * microssegundos contra os 25 ms de uma ida ao serviço.
 */
function copiarRegistros_(lista) {
  return lista.map(function (registro) {
    var copia = {};
    for (var chave in registro) {
      if (Object.prototype.hasOwnProperty.call(registro, chave)) {
        copia[chave] = registro[chave];
      }
    }
    return copia;
  });
}

/** O tipo das colunas que NÃO estão no contrato, declarado na aba CAMPOS. */
var tiposDeclaradosJaLidos = null;
var lendoTiposDeclarados = false;

function esquecerEstruturaLida_(nomeDaAba) {
  if (nomeDaAba) {
    delete estruturasJaLidas[nomeDaAba];
    esquecerRegistrosLidos_(nomeDaAba);
    if (nomeDaAba === 'CAMPOS') tiposDeclaradosJaLidos = null;
  } else {
    estruturasJaLidas = {};
    esquecerRegistrosLidos_();
    tiposDeclaradosJaLidos = null;
  }
}

/**
 * Joga fora o memo dos registros.
 *
 * Vive colado no esquecerEstruturaLida_ de propósito: TODO caminho de
 * gravação já chamava aquele, então este passa a ser chamado nos mesmos
 * lugares, sem ninguém precisar lembrar de um segundo. Memo que se esquece
 * num lugar e não no outro serve dado velho — e dado velho de configuração é
 * pior que lentidão, porque parece certo.
 */
function esquecerRegistrosLidos_(nomeDaAba) {
  if (!nomeDaAba) { registrosJaLidos = {}; return; }
  Object.keys(registrosJaLidos).forEach(function (chave) {
    if (chave.indexOf(nomeDaAba + '|') === 0) delete registrosJaLidos[chave];
  });
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

  var chave = chaveDoMemo_(nomeDaAba, opcoes);
  var guardar = valeGuardarNaMemoria_(nomeDaAba);
  if (guardar && registrosJaLidos[chave]) {
    return copiarRegistros_(registrosJaLidos[chave]);
  }

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

  if (guardar) registrosJaLidos[chave] = saida;
  return guardar ? copiarRegistros_(saida) : saida;
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

/**
 * Como buscarRegistros_, mas devolvendo só o que está VISÍVEL.
 *
 * buscarRegistros_ devolve a linha esteja ela oculta ou não — e tem de ser
 * assim, porque quem edita um registro precisa achá-lo mesmo depois de
 * excluído. Mas quem PERGUNTA sobre o estado de hoje não quer a linha
 * apagada: uma SUSEP desbloqueada continua na planilha, com _Visivel = NAO, e
 * responder "bloqueada" a partir dela seria ressuscitar o bloqueio.
 *
 * A mesma SUSEP pode ter várias linhas — bloqueada, desbloqueada, bloqueada de
 * novo. A última visível é a que vale, e é por isso que esta função não pede
 * limite: parar na primeira acharia justamente a mais antiga.
 */
function buscarRegistroVisivel_(nomeDaAba, cabecalho, valor) {
  var achados = buscarRegistros_(nomeDaAba, cabecalho, valor)
    .filter(function (registro) {
      if (!('_Visivel' in registro)) return true;   // aba sem exclusão lógica
      return normalizarParaComparar_(registro._Visivel) !== 'nao';
    });
  return achados.length ? achados[achados.length - 1] : null;
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

/**
 * APAGA A LINHA DA PLANILHA. Não tem volta.
 *
 * O sistema inteiro é construído em cima de exclusão LÓGICA: `_Visivel` vira
 * NAO, a linha fica, e um administrador traz de volta. É a regra que protege
 * contra o clique errado, e ela continua valendo para corretora, produto,
 * SUSEP bloqueada e usuário.
 *
 * O CASO é a exceção, e foi decisão do PO: "o caso deve ser excluído
 * definitivamente da planilha". A razão é de operação — caso oculto continua
 * ocupando linha, e a base da RET caminha para 200 mil.
 *
 * Como não há desfazer, duas coisas compensam:
 *
 *   1. Quem chama registra na AUDITORIA o que havia na linha, antes de
 *      apagar. Sem isso, um caso excluído por engano não deixa nem rastro de
 *      que existiu — e alguém vai jurar que cadastrou.
 *   2. A tela pergunta antes, e o texto diz a verdade: não promete desfazer.
 *
 * Devolve o registro que foi apagado, para quem chamou poder registrá-lo.
 */
function apagarRegistroDeVez_(nomeDaAba, id) {
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(25000)) {
    throw new Error('A planilha está ocupada com outra gravação. Tente de novo.');
  }
  try {
    esquecerEstruturaLida_(nomeDaAba);
    var estrutura = estruturaDaAba_(nomeDaAba, true);
    var linha = linhaDoRegistro_(estrutura, id);
    if (linha < 0) {
      throw new Error('Registro ' + converterParaIdentificador_(id)
        + ' não encontrado na aba "' + nomeDaAba + '".');
    }

    // Lido ANTES de apagar: depois não há de onde ler.
    var valores = estrutura.aba
      .getRange(linha, 1, 1, estrutura.cabecalhos.length).getValues()[0];
    var apagado = montarRegistro_(estrutura, valores, linha);

    estrutura.aba.deleteRows(linha, 1);

    // A grade encolheu: toda posição de linha guardada em memória agora
    // aponta para a linha de baixo. Esquecer é obrigatório, não higiene.
    esquecerEstruturaLida_(nomeDaAba);
    return apagado;
  } finally {
    trava.releaseLock();
  }
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

  var canalId = '';
  if (planilhaAtiva_().getSheetByName('CANAIS')) {
    var canal = lerRegistros_('CANAIS').filter(function (m) {
      return normalizarParaComparar_(m.Aba) === normalizarParaComparar_(nomeDaAba);
    })[0];
    if (canal) canalId = canal.Id;
  }

  return inserirRegistro_('CAMPOS', {
    CanalId: canalId,
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


/* ==== Cadastros.gs ======================================================== */

/**
 * ============================================================================
 * PGO — Cadastros.gs · quem traz o caso para dentro
 * ============================================================================
 * Corretoras, produtos e SUSEPs bloqueadas — e o jeito de trazer essas
 * listas de fora sem digitar uma a uma.
 *
 * O QUE TEM AQUI DENTRO, nesta ordem:
 *
 *   1. OS TRÊS CADASTROS   (era Corretoras.gs)
 *   2. COLAR, CONFERIR E APLICAR EM LOTE   (era Importacao.gs)
 *
 * Procure pelo banner com ##### para pular de uma seção à outra.
 * ============================================================================
 */

/* ############################################################################
   #
   #  SEÇÃO 1 de 2 · OS TRÊS CADASTROS
   #
   #  Era o arquivo Back-End/Corretoras.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * ============================================================================
 * PGO — Corretoras.gs · quem traz o caso para dentro
 * ============================================================================
 * Três cadastros que sustentam o resto do sistema e que, até aqui, só se
 * ajustavam abrindo a planilha:
 *
 *   CORRETORAS             corretoras, corretores e agentes, com o segmento
 *   PRODUTOS           o que a operação vende
 *   SUSEP_BLOQUEADAS   quem está impedido, e por quê
 *
 * O QUE FAZ ESTA TELA VALER MAIS QUE UMA LISTA: ela cruza o cadastro com os
 * CASOS. Uma tabela de corretoras sem volume é uma agenda telefônica; com o
 * volume ao lado, ela responde "quem me dá trabalho" — e, principalmente,
 * mostra as SUSEPs que aparecem nos casos e NÃO estão cadastradas.
 *
 * Essa última é a informação mais útil daqui. Uma SUSEP fora do cadastro faz
 * o selo do formulário dizer "não encontrada" toda vez, e ninguém descobre
 * por quê — porque o sintoma aparece em outra tela, uma pessoa de cada vez.
 * Aqui elas aparecem juntas, com quantos casos cada uma já trouxe.
 * ============================================================================
 */

/** Quantas corretoras a tela lista de uma vez. */
const RECC_MAXIMO_DE_CORRETORAS = 300;

/**
 * A tela inteira: os três cadastros e o cruzamento com os casos.
 */
function tabelaDeCorretoras(procurar, segmento) {
  var quem = exigirTela_('tabelaCorretoras');

  var volumes = volumePorSusep_();
  var bloqueadas = mapaDeBloqueadas_();
  var termo = normalizarParaComparar_(procurar);
  // Os dígitos do termo, SÓ quando ele tem algum. Sem esta guarda, procurar
  // por "agente" comparava '' contra a SUSEP — e `indexOf('')` é sempre zero,
  // então a busca casava com o cadastro inteiro e parecia não filtrar nada.
  var digitos = apenasDigitos_(procurar);
  var segmentoProcurado = normalizarParaComparar_(segmento);

  var todas = lerRegistros_('CORRETORAS').map(function (linha) {
    var susep = converterParaIdentificador_(linha.SUSEP);
    var bloqueio = bloqueadas[susep];
    return {
      id: linha.__id,
      nome: String(linha.Nome || ''),
      canal: String(linha.Canal || ''),
      susep: susep,
      corretora: String(linha.Corretora || ''),
      // Cadastro sem segmento não vira "Diamante" por descuido: vira o que
      // ele é, "Não encontrado", e a tela mostra isso.
      segmento: String(linha.Segmento || '') || 'Não encontrado',
      bloqueada: !!bloqueio,
      motivoDoBloqueio: bloqueio ? String(bloqueio.Motivo || '') : '',
      casos: volumes.porSusep[susep] || 0
    };
  });

  var filtradas = todas.filter(function (uma) {
    if (segmentoProcurado
      && normalizarParaComparar_(uma.segmento) !== segmentoProcurado) return false;
    if (!termo) return true;
    if (normalizarParaComparar_(uma.nome).indexOf(termo) >= 0) return true;
    if (normalizarParaComparar_(uma.corretora).indexOf(termo) >= 0) return true;
    if (normalizarParaComparar_(uma.canal).indexOf(termo) >= 0) return true;
    return !!digitos && apenasDigitos_(uma.susep).indexOf(digitos) >= 0;
  }).sort(function (uma, outra) {
    // Quem mais traz caso primeiro: a tela existe para trabalhar, e o volume
    // é o que dá ordem de importância a uma lista de trezentos nomes.
    if (outra.casos !== uma.casos) return outra.casos - uma.casos;
    return uma.corretora < outra.corretora ? -1 : 1;
  });

  return {
    corretoras: filtradas.slice(0, RECC_MAXIMO_DE_CORRETORAS),
    truncada: filtradas.length > RECC_MAXIMO_DE_CORRETORAS,
    quantasNoTotal: todas.length,
    quantasFiltradas: filtradas.length,
    segmentos: segmentosConhecidos_(todas),
    // As SUSEPs que os casos citam e o cadastro não conhece. É o achado desta
    // tela: enquanto elas não entram, o selo do formulário diz "não
    // encontrada" toda vez, e ninguém liga uma coisa à outra.
    foraDoCadastro: susepsForaDoCadastro_(volumes, todas, bloqueadas),
    podeMexer: podeFazer_(quem.permissoes, RECC_ACOES.CONFIGURAR),
    podeExportar: podeFazer_(quem.permissoes, RECC_ACOES.EXPORTAR)
  };
}

/** Quantos casos cada SUSEP trouxe, somando os canais. */
function volumePorSusep_() {
  var porSusep = {};
  var nomePorSusep = {};

  canaisVisiveis_().forEach(function (canal) {
    var estrutura;
    try {
      estrutura = estruturaDaAba_(canal.aba);
    } catch (erro) {
      return;   // aba que sumiu não derruba a tela
    }

    var colunaDaSusep = '';
    var colunaDaCorretora = '';
    estrutura.cabecalhos.forEach(function (cabecalho) {
      var comparavel = normalizarParaComparar_(cabecalho);
      if (comparavel === 'susep') colunaDaSusep = cabecalho;
      if (comparavel === 'corretora') colunaDaCorretora = cabecalho;
    });
    if (!colunaDaSusep) return;

    // Só a coluna da SUSEP, e a da corretora: a mesma regra da busca — ler as
    // 39 colunas de todas as linhas para contar uma coisa não se paga.
    var suseps = lerColunaInteira_(canal.aba, colunaDaSusep);
    var corretoras = colunaDaCorretora
      ? lerColunaInteira_(canal.aba, colunaDaCorretora) : [];

    for (var i = 0; i < suseps.length; i++) {
      var susep = converterParaIdentificador_(suseps[i]);
      if (!susep) continue;
      porSusep[susep] = (porSusep[susep] || 0) + 1;
      if (!nomePorSusep[susep] && corretoras[i]) {
        nomePorSusep[susep] = String(corretoras[i]);
      }
    }
  });

  return { porSusep: porSusep, nomePorSusep: nomePorSusep };
}

/** As SUSEPs que aparecem nos casos e não estão no cadastro de canais. */
function susepsForaDoCadastro_(volumes, cadastradas, bloqueadas) {
  var conhecidas = {};
  cadastradas.forEach(function (uma) {
    if (uma.susep) conhecidas[uma.susep] = true;
  });
  // Uma SUSEP BLOQUEADA também é conhecida: o selo do formulário mostra o
  // bloqueio, e não "não encontrada". Listá-la aqui daria um aviso que não
  // corresponde ao que a pessoa vê na outra tela — e aviso que não bate com
  // a realidade é o tipo de coisa que a operação aprende a ignorar.
  Object.keys(bloqueadas || {}).forEach(function (susep) {
    conhecidas[susep] = true;
  });

  var fora = [];
  Object.keys(volumes.porSusep).forEach(function (susep) {
    if (conhecidas[susep]) return;
    fora.push({
      susep: susep,
      // O nome que os próprios casos usam. É um palpite, e a tela diz que é:
      // ele serve para a pessoa reconhecer a corretora, não para cadastrar
      // no automático.
      nomeNosCasos: volumes.nomePorSusep[susep] || '',
      casos: volumes.porSusep[susep]
    });
  });

  return fora.sort(function (uma, outra) { return outra.casos - uma.casos; });
}

function mapaDeBloqueadas_() {
  var mapa = {};
  lerRegistros_('SUSEP_BLOQUEADAS').forEach(function (linha) {
    mapa[converterParaIdentificador_(linha.SUSEP)] = linha;
  });
  return mapa;
}

/** Os segmentos que aparecem, para o filtro não ser uma lista escrita à mão. */
function segmentosConhecidos_(todas) {
  var vistos = {};
  var lista = [];
  todas.forEach(function (uma) {
    var chave = normalizarParaComparar_(uma.segmento);
    if (vistos[chave]) return;
    vistos[chave] = true;
    lista.push(uma.segmento);
  });
  return lista.sort();
}

// ============================================================================
// MEXER NO CADASTRO
// ============================================================================

/**
 * Cria ou altera uma corretora.
 *
 * A SUSEP é única: duas linhas com a mesma SUSEP fariam o selo do formulário
 * escolher uma delas — e a escolha seria a ordem da planilha, que ninguém
 * controla.
 */
function salvarCorretora(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var susep = converterParaIdentificador_(dados.susep);
  if (!susep) throw new Error('Informe a SUSEP — é ela que liga a corretora ao caso.');

  var corretora = String(dados.corretora || '').trim();
  if (!corretora) throw new Error('Informe o nome da corretora.');

  var id = converterParaIdentificador_(dados.id);
  var repetida = lerRegistros_('CORRETORAS').filter(function (linha) {
    return converterParaIdentificador_(linha.SUSEP) === susep
      && converterParaIdentificador_(linha.Id) !== id;
  })[0];
  if (repetida) {
    throw new Error('A SUSEP ' + susep + ' já está cadastrada para "' +
      repetida.Corretora + '". Duas linhas com a mesma SUSEP fariam o selo do ' +
      'formulário escolher uma delas pela ordem da planilha.');
  }

  var campos = {
    Nome: String(dados.nome || corretora).trim(),
    Canal: String(dados.canal || '').trim(),
    SUSEP: susep,
    Corretora: corretora,
    Segmento: String(dados.segmento || '').trim() || 'Não encontrado'
  };

  if (id) {
    atualizarRegistro_('CORRETORAS', id, campos);
    registrarAuditoria_('corretora.editar', 'CORRETORAS', id, corretora);
    return id;
  }
  var criada = inserirRegistro_('CORRETORAS', campos);
  registrarAuditoria_('corretora.criar', 'CORRETORAS', criada.__id, corretora);
  return criada.__id;
}

/** Tira a corretora da tela. A linha permanece na planilha. */
function ocultarCorretora(idDaCorretora) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var alvo = converterParaIdentificador_(idDaCorretora);
  var atual = buscarRegistros_('CORRETORAS', 'Id', alvo, 1)[0];
  if (!atual) throw new Error('A corretora ' + alvo + ' não existe.');

  ocultarRegistro_('CORRETORAS', alvo, quem.usuario.Id);
  registrarAuditoria_('corretora.ocultar', 'CORRETORAS', alvo, String(atual.Corretora));
  return true;
}

// ============================================================================
// AS SUSEPs BLOQUEADAS
// ============================================================================

function listarSusepsBloqueadas() {
  exigirTela_('tabelaCorretoras');
  var volumes = volumePorSusep_();

  return lerRegistros_('SUSEP_BLOQUEADAS')
    .map(function (linha) {
      var susep = converterParaIdentificador_(linha.SUSEP);
      return {
        id: linha.__id,
        susep: susep,
        corretora: String(linha.NomeCorretora || ''),
        cpfReincidente: converterParaIdentificador_(linha.CpfReincidente),
        motivo: String(linha.Motivo || ''),
        bloqueadaEm: linha.BloqueadaEm
          ? Utilities.formatDate(new Date(linha.BloqueadaEm), RECC_FUSO_HORARIO,
            'dd/MM/yyyy')
          : '',
        casos: volumes.porSusep[susep] || 0
      };
    })
    .sort(function (uma, outra) { return outra.casos - uma.casos; });
}

/**
 * Bloqueia uma SUSEP.
 *
 * Bloquear não apaga caso nenhum e não impede cadastrar: o formulário passa a
 * mostrar o selo vermelho com o motivo, e quem está atendendo decide. Bloqueio
 * que impedisse o cadastro faria a pessoa registrar o caso em outro lugar —
 * num caderno, num e-mail — e o sistema perderia o caso de vista.
 */
function bloquearSusep(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var susep = converterParaIdentificador_(dados.susep);
  if (!susep) throw new Error('Informe a SUSEP a bloquear.');

  var motivo = String(dados.motivo || '').trim();
  if (!motivo) {
    throw new Error('Diga o motivo do bloqueio. Sem ele, quem vir o selo ' +
      'vermelho daqui a seis meses não vai saber o que fazer com a informação.');
  }

  var id = converterParaIdentificador_(dados.id);
  var jaBloqueada = lerRegistros_('SUSEP_BLOQUEADAS').filter(function (linha) {
    return converterParaIdentificador_(linha.SUSEP) === susep
      && converterParaIdentificador_(linha.Id) !== id;
  })[0];
  if (jaBloqueada) {
    throw new Error('A SUSEP ' + susep + ' já está bloqueada.');
  }

  var campos = {
    SUSEP: susep,
    NomeCorretora: String(dados.corretora || '').trim(),
    CpfReincidente: converterParaIdentificador_(dados.cpfReincidente),
    Motivo: motivo
  };

  if (id) {
    atualizarRegistro_('SUSEP_BLOQUEADAS', id, campos);
    registrarAuditoria_('susep.editar', 'SUSEP_BLOQUEADAS', id, susep);
    return id;
  }
  campos.BloqueadaEm = new Date();
  var criada = inserirRegistro_('SUSEP_BLOQUEADAS', campos);
  registrarAuditoria_('susep.bloquear', 'SUSEP_BLOQUEADAS', criada.__id, susep);
  return criada.__id;
}

/** Libera uma SUSEP. A linha permanece na planilha, com a data do bloqueio. */
function desbloquearSusep(idDoBloqueio) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var alvo = converterParaIdentificador_(idDoBloqueio);
  var atual = buscarRegistros_('SUSEP_BLOQUEADAS', 'Id', alvo, 1)[0];
  if (!atual) throw new Error('Este bloqueio não existe.');

  ocultarRegistro_('SUSEP_BLOQUEADAS', alvo, quem.usuario.Id);
  registrarAuditoria_('susep.desbloquear', 'SUSEP_BLOQUEADAS', alvo,
    converterParaIdentificador_(atual.SUSEP));
  return true;
}

// ============================================================================
// OS PRODUTOS
// ============================================================================

function listarProdutos() {
  exigirTela_('tabelaCorretoras');
  return lerRegistros_('PRODUTOS')
    .map(function (linha) {
      return {
        id: linha.__id,
        produto: String(linha.Produto || ''),
        codigo: converterParaIdentificador_(linha.CodigoProduto)
      };
    })
    .sort(function (um, outro) { return um.produto < outro.produto ? -1 : 1; });
}

function salvarProduto(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var produto = String(dados.produto || '').trim();
  if (!produto) throw new Error('Informe o nome do produto.');

  var codigo = converterParaIdentificador_(dados.codigo);
  var id = converterParaIdentificador_(dados.id);

  if (codigo) {
    var repetido = lerRegistros_('PRODUTOS').filter(function (linha) {
      return converterParaIdentificador_(linha.CodigoProduto) === codigo
        && converterParaIdentificador_(linha.Id) !== id;
    })[0];
    if (repetido) {
      throw new Error('O código ' + codigo + ' já é do produto "' +
        repetido.Produto + '". O código é o que liga o produto ao caso.');
    }
  }

  var campos = { Produto: produto, CodigoProduto: codigo };
  if (id) {
    atualizarRegistro_('PRODUTOS', id, campos);
    registrarAuditoria_('produto.editar', 'PRODUTOS', id, produto);
    return id;
  }
  var criado = inserirRegistro_('PRODUTOS', campos);
  registrarAuditoria_('produto.criar', 'PRODUTOS', criado.__id, produto);
  return criado.__id;
}

function ocultarProduto(idDoProduto) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var alvo = converterParaIdentificador_(idDoProduto);
  var atual = buscarRegistros_('PRODUTOS', 'Id', alvo, 1)[0];
  if (!atual) throw new Error('Este produto não existe.');

  ocultarRegistro_('PRODUTOS', alvo, quem.usuario.Id);
  registrarAuditoria_('produto.ocultar', 'PRODUTOS', alvo, String(atual.Produto));
  return true;
}

// ============================================================================
// EXPORTAR
// ============================================================================

/** As corretoras em texto, do jeito que o Excel em português abre. */
function exportarCorretoras(procurar, segmento) {
  exigirPermissao_(RECC_ACOES.EXPORTAR);
  var tabela = tabelaDeCorretoras(procurar, segmento);

  var linhas = [['SUSEP', 'Corretora', 'Canal', 'Nome', 'Segmento',
    'Situação', 'Casos'].join(';')];

  tabela.corretoras.forEach(function (uma) {
    linhas.push([uma.susep, uma.corretora, uma.canal, uma.nome, uma.segmento,
      uma.bloqueada ? 'Bloqueada' : 'Liberada', uma.casos].join(';'));
  });

  registrarAuditoria_('corretoras.exportar', 'CORRETORAS', '',
    tabela.corretoras.length + ' linhas');
  return { nome: 'corretoras.csv', conteudo: linhas.join('\n') };
}

/* ############################################################################
   #
   #  SEÇÃO 2 de 2 · COLAR, CONFERIR E APLICAR EM LOTE
   #
   #  Era o arquivo Back-End/Importacao.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * RECC — Importacao.gs · trazer listas prontas para dentro do sistema
 * ============================================================================
 * O cadastro de corretoras e a lista de SUSEPs bloqueadas já EXISTEM na
 * operação, em planilha, antes de o PGO nascer. Digitar centenas de linhas
 * uma a uma dentro do sistema não é trabalho: é desperdício, e é o caminho
 * mais curto para o cadastro nascer pela metade.
 *
 * Esta tela resolve isso com três passos, sempre nesta ordem:
 *
 *   1. COLAR    a pessoa copia da planilha dela e cola aqui. Aceita o que o
 *               Excel e o Google Planilhas colocam na área de transferência —
 *               colunas separadas por TAB — e também ponto e vírgula.
 *   2. CONFERIR o servidor lê o texto e devolve o que VAI acontecer com cada
 *               linha, sem gravar nada: nova, atualiza a que existe, ou
 *               recusada — e neste último caso, por quê.
 *   3. APLICAR  só então grava.
 *
 * Duas decisões que valem a pena estar escritas:
 *
 * O SEGUNDO PASSO NÃO É ENFEITE. Importação é a ação com maior alcance do
 * sistema: um erro escreve em quinhentas linhas de uma vez. Ver antes é o que
 * transforma "colei a coluna errada" num susto em vez de num estrago.
 *
 * O TERCEIRO PASSO NÃO CONFIA NO SEGUNDO. `aplicarImportacao` lê o TEXTO
 * de novo e refaz a conferência inteira — não recebe do navegador a lista já
 * conferida. Se recebesse, bastaria alterar a lista no caminho para gravar o
 * que o servidor nunca aprovou.
 *
 * Nada aqui APAGA. Uma SUSEP que está no cadastro e não está no arquivo colado
 * fica onde está: o arquivo é uma correção, não a verdade inteira. Quem quiser
 * tirar uma corretora tira uma a uma, na tabela, e mesmo assim a linha
 * permanece na planilha.
 * ============================================================================
 */

/** Quantas linhas o passo de conferência mostra na tela. */
var RECC_LINHAS_NA_CONFERENCIA = 200;

/** Teto de linhas por importação, para não estourar o tempo do Apps Script. */
var RECC_MAXIMO_DA_IMPORTACAO = 2000;

/**
 * O que dá para importar.
 *
 * Cada tipo diz em que aba grava, qual coluna é a CHAVE (a que decide se a
 * linha é nova ou é atualização) e quais colunas ele entende. A tela desenha o
 * cabeçalho de exemplo a partir daqui — assim o que a tela promete e o que o
 * servidor aceita não podem divergir.
 */
var RECC_IMPORTACOES = {
  corretoras: {
    titulo: 'Corretoras',
    aba: 'CORRETORAS',
    chave: 'susep',
    explicacao: 'Uma linha por corretora. A SUSEP é o que liga a corretora ao '
      + 'caso, e é por ela que o sistema sabe se a linha é nova ou já existe.',
    colunas: [
      { chave: 'susep', titulo: 'SUSEP', coluna: 'SUSEP',
        tipo: 'identificador', obrigatoria: true },
      { chave: 'corretora', titulo: 'Corretora', coluna: 'Corretora',
        tipo: 'texto', obrigatoria: true },
      { chave: 'canal', titulo: 'Canal', coluna: 'Canal', tipo: 'texto' },
      { chave: 'segmento', titulo: 'Segmento', coluna: 'Segmento',
        tipo: 'texto', padrao: 'Não encontrado' }
    ]
  },

  susepsBloqueadas: {
    titulo: 'SUSEPs bloqueadas',
    aba: 'SUSEP_BLOQUEADAS',
    chave: 'susep',
    explicacao: 'Uma linha por SUSEP bloqueada. O motivo é obrigatório: sem '
      + 'ele, quem vir o selo vermelho daqui a seis meses não saberá o que '
      + 'fazer com a informação.',
    colunas: [
      { chave: 'susep', titulo: 'SUSEP', coluna: 'SUSEP',
        tipo: 'identificador', obrigatoria: true },
      { chave: 'motivo', titulo: 'Motivo', coluna: 'Motivo',
        tipo: 'texto', obrigatoria: true },
      { chave: 'corretora', titulo: 'Corretora', coluna: 'NomeCorretora',
        tipo: 'texto' },
      { chave: 'cpfReincidente', titulo: 'CPF reincidente',
        coluna: 'CpfReincidente', tipo: 'identificador' }
    ]
  }
};

// ============================================================================
// O QUE A TELA PRECISA SABER
// ============================================================================

/**
 * Os tipos de importação e as colunas de cada um.
 *
 * A tela não guarda essa lista: pede aqui. Acrescentar um tipo novo é mexer
 * em RECC_IMPORTACOES e em mais lugar nenhum.
 */
function opcoesDaImportacao() {
  exigirTela_('tabelaCorretoras');

  return Object.keys(RECC_IMPORTACOES).map(function (tipo) {
    var receita = RECC_IMPORTACOES[tipo];
    return {
      tipo: tipo,
      titulo: receita.titulo,
      explicacao: receita.explicacao,
      maximo: RECC_MAXIMO_DA_IMPORTACAO,
      colunas: receita.colunas.map(function (coluna) {
        return {
          chave: coluna.chave,
          titulo: coluna.titulo,
          obrigatoria: !!coluna.obrigatoria
        };
      })
    };
  });
}

// ============================================================================
// LER O TEXTO COLADO
// ============================================================================

/**
 * Descobre o separador das colunas.
 *
 * O Excel e o Google Planilhas colocam TAB na área de transferência. Quem
 * salvou um CSV em português tem ponto e vírgula. Vírgula fica por último de
 * propósito: nome de corretora tem vírgula ("SILVA, SOUZA & CIA"), e chutar
 * vírgula quebraria justamente as linhas mais compridas.
 */
function separadorDoTexto_(primeiraLinha) {
  if (primeiraLinha.indexOf('\t') >= 0) return '\t';
  if (primeiraLinha.indexOf(';') >= 0) return ';';
  return ',';
}

/**
 * Reconhece a linha de cabeçalho.
 *
 * Quem copia da planilha quase sempre traz o cabeçalho junto. Sem reconhecer,
 * ele viraria uma corretora chamada "Corretora" com SUSEP "SUSEP" — recusada
 * por não ter dígito, mas aparecendo como erro numa importação que estava
 * certa.
 */
function ehCabecalho_(pedacos, receita) {
  var conhecidos = 0;
  for (var i = 0; i < pedacos.length; i++) {
    var texto = normalizarParaComparar_(pedacos[i]);
    for (var j = 0; j < receita.colunas.length; j++) {
      if (normalizarParaComparar_(receita.colunas[j].titulo) === texto) {
        conhecidos++;
        break;
      }
    }
  }
  return conhecidos >= 2;
}

/**
 * A ordem das colunas do texto colado.
 *
 * Com cabeçalho, a ordem é a que o cabeçalho disser — a pessoa pode ter
 * colado as colunas em qualquer ordem, e um título que o sistema não conhece
 * vira uma posição vazia, ignorada.
 *
 * Sem cabeçalho, a ordem é a declarada em RECC_IMPORTACOES. É a razão de a
 * primeira coluna de cada tipo ser sempre a chave e a segunda ser sempre a
 * obrigatória: quem cola sem cabeçalho cola o essencial.
 */
function ordemDasColunas_(pedacos, receita) {
  if (!ehCabecalho_(pedacos, receita)) {
    return receita.colunas.map(function (coluna) { return coluna.chave; });
  }
  return pedacos.map(function (pedaco) {
    var texto = normalizarParaComparar_(pedaco);
    var achada = receita.colunas.filter(function (coluna) {
      return normalizarParaComparar_(coluna.titulo) === texto;
    })[0];
    return achada ? achada.chave : '';
  });
}

/**
 * Transforma o texto colado numa lista de linhas com os campos nomeados.
 *
 * Não decide nada sobre gravar: só lê. Quem decide é `conferirImportacao_`.
 */
function lerTextoDaImportacao_(texto, receita) {
  // A linha NÃO é aparada antes de ser partida. Parecia inofensivo, e não é:
  // com TAB como separador, aparar come a primeira coluna quando ela vem
  // vazia — e aí "«vazio» TAB Corretora Alfa" vira uma corretora chamada
  // "Corretora Alfa" com SUSEP "Corretora Alfa", deslocando a linha inteira.
  // Quem apara é cada CÉLULA, depois de partida.
  var linhas = String(texto || '')
    .split(/\r\n|\r|\n/)
    .filter(function (linha) { return linha.trim().length > 0; });

  if (!linhas.length) return { ordem: [], linhas: [], tinhaCabecalho: false };

  var separador = separadorDoTexto_(linhas[0]);
  var primeira = linhas[0].split(separador);
  var ordem = ordemDasColunas_(primeira, receita);
  var tinhaCabecalho = ehCabecalho_(primeira, receita);
  var comeco = tinhaCabecalho ? 1 : 0;

  var lidas = [];
  for (var i = comeco; i < linhas.length; i++) {
    var pedacos = linhas[i].split(separador);
    var valores = {};
    for (var c = 0; c < ordem.length; c++) {
      if (!ordem[c]) continue;
      valores[ordem[c]] = String(pedacos[c] === undefined ? '' : pedacos[c])
        .replace(/^"|"$/g, '')
        .trim();
    }
    lidas.push({ numero: i + 1, valores: valores });
  }
  return { ordem: ordem, linhas: lidas, tinhaCabecalho: tinhaCabecalho };
}

// ============================================================================
// CONFERIR
// ============================================================================

/**
 * O que vai acontecer com cada linha — sem gravar nada.
 *
 * É a mesma função que `aplicarImportacao` usa antes de escrever, e é de
 * propósito: conferência e gravação que seguem regras diferentes acabam
 * discordando, e a tela passa a mentir sobre o que o botão faz.
 */
function conferirImportacao_(tipo, texto) {
  var receita = RECC_IMPORTACOES[tipo];
  if (!receita) {
    throw new Error('Não sei importar "' + tipo + '". Existem: '
      + Object.keys(RECC_IMPORTACOES).join(', ') + '.');
  }

  var lido = lerTextoDaImportacao_(texto, receita);
  if (lido.linhas.length > RECC_MAXIMO_DA_IMPORTACAO) {
    throw new Error('São ' + lido.linhas.length + ' linhas, e o limite por vez '
      + 'é ' + RECC_MAXIMO_DA_IMPORTACAO + '. Divida em partes: o Apps Script '
      + 'tem tempo máximo de execução, e uma importação interrompida no meio '
      + 'grava metade.');
  }

  // Ler o cadastro UMA vez, e não uma por linha. Com quinhentas linhas
  // coladas, uma leitura por linha seriam quinhentas leituras da planilha.
  var colunaChave = colunaChaveDaImportacao_(receita);
  var existentes = {};
  lerRegistros_(receita.aba).forEach(function (linha) {
    var chave = converterParaIdentificador_(linha[colunaChave.coluna]);
    if (chave) existentes[chave] = linha;
  });

  var vistas = {};
  var resultado = lido.linhas.map(function (linha) {
    return conferirUmaLinha_(linha, receita, existentes, vistas);
  });

  return {
    tipo: tipo,
    titulo: receita.titulo,
    colunas: receita.colunas.map(function (coluna) {
      return { chave: coluna.chave, titulo: coluna.titulo };
    }),
    // Com cabeçalho reconhecido, dizer isso na tela evita a dúvida mais comum
    // de todas: "ele contou o meu cabeçalho como corretora?".
    tinhaCabecalho: lido.tinhaCabecalho,
    linhas: resultado.slice(0, RECC_LINHAS_NA_CONFERENCIA),
    naoMostradas: Math.max(0, resultado.length - RECC_LINHAS_NA_CONFERENCIA),
    resumo: {
      total: resultado.length,
      novas: contarSituacao_(resultado, 'nova'),
      atualizadas: contarSituacao_(resultado, 'atualiza'),
      iguais: contarSituacao_(resultado, 'igual'),
      recusadas: contarSituacao_(resultado, 'recusada')
    },
    // A lista completa fica aqui para `aplicarImportacao` usar. A tela recebe
    // só as primeiras — e nem precisaria delas, já que quem grava é o servidor.
    todas: resultado
  };
}

/** A coluna que decide se a linha é nova ou é atualização. */
function colunaChaveDaImportacao_(receita) {
  return receita.colunas.filter(function (coluna) {
    return coluna.chave === receita.chave;
  })[0];
}

function contarSituacao_(linhas, situacao) {
  return linhas.filter(function (linha) {
    return linha.situacao === situacao;
  }).length;
}

/**
 * O veredito de uma linha só.
 *
 * `vistas` guarda as chaves que já apareceram NESTE texto: duas linhas com a
 * mesma SUSEP no mesmo arquivo colado são um erro de quem montou o arquivo, e
 * gravar as duas deixaria o cadastro com a duplicidade que a tela de cadastro
 * recusa uma a uma.
 */
function conferirUmaLinha_(linha, receita, existentes, vistas) {
  var campos = {};
  var problemas = [];

  receita.colunas.forEach(function (coluna) {
    var bruto = linha.valores[coluna.chave];
    var valor = coluna.tipo === 'identificador'
      ? converterParaIdentificador_(bruto)
      : String(bruto === undefined ? '' : bruto).trim();

    if (!valor && coluna.padrao) valor = coluna.padrao;
    if (!valor && coluna.obrigatoria) {
      problemas.push(coluna.tipo === 'identificador' && String(bruto || '').trim()
        ? coluna.titulo + ' sem nenhum dígito ("' + bruto + '")'
        : coluna.titulo + ' em branco');
    }
    campos[coluna.chave] = valor;
  });

  var chave = campos[receita.chave];

  if (problemas.length) {
    return { numero: linha.numero, campos: campos, situacao: 'recusada',
      porque: problemas.join('; ') };
  }
  if (vistas[chave]) {
    return { numero: linha.numero, campos: campos, situacao: 'recusada',
      porque: 'repetida — a linha ' + vistas[chave] + ' já trouxe esta '
        + colunaChaveDaImportacao_(receita).titulo };
  }
  vistas[chave] = linha.numero;

  var atual = existentes[chave];
  if (!atual) {
    return { numero: linha.numero, campos: campos, situacao: 'nova', porque: '' };
  }

  var mudancas = mudancasDaLinha_(campos, atual, receita);
  if (!mudancas.length) {
    return { numero: linha.numero, campos: campos, situacao: 'igual',
      porque: 'já está assim no cadastro', id: atual.__id };
  }
  return { numero: linha.numero, campos: campos, situacao: 'atualiza',
    porque: mudancas.join('; '), id: atual.__id };
}

/**
 * O que muda de fato entre a linha colada e a que já está no cadastro.
 *
 * Campo vazio no arquivo NÃO apaga o que existe. Quem cola só SUSEP e
 * Segmento para reclassificar um lote não quer perder o canal cadastrado —
 * e descobrir isso depois de gravar não tem desfazer.
 */
function mudancasDaLinha_(campos, atual, receita) {
  var mudancas = [];
  receita.colunas.forEach(function (coluna) {
    var novo = campos[coluna.chave];
    if (!novo) return;
    var velho = coluna.tipo === 'identificador'
      ? converterParaIdentificador_(atual[coluna.coluna])
      : String(atual[coluna.coluna] === undefined ? '' : atual[coluna.coluna]).trim();
    if (novo === velho) return;
    mudancas.push(coluna.titulo + ': "' + velho + '" → "' + novo + '"');
  });
  return mudancas;
}

// ============================================================================
// AS DUAS FUNÇÕES QUE A TELA CHAMA
// ============================================================================

/** Passo 2: o que vai acontecer. Não grava nada. */
function conferirImportacao(tipo, texto) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var conferido = conferirImportacao_(tipo, texto);
  delete conferido.todas;   // a tela não precisa da lista inteira
  return conferido;
}

/**
 * Passo 3: grava.
 *
 * Pede a senha de administrador. Não é excesso de zelo: é a única ação do
 * sistema que escreve em centenas de linhas com um clique, e o critério para
 * pedir senha sempre foi o alcance, nunca a dificuldade.
 */
function aplicarImportacao(tipo, texto) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');
  exigirSenhaDeAdministrador_();

  var receita = RECC_IMPORTACOES[tipo];
  var conferido = conferirImportacao_(tipo, texto);

  var paraCriar = [];
  var criadas = 0;
  var atualizadas = 0;

  conferido.todas.forEach(function (linha) {
    if (linha.situacao === 'nova') {
      paraCriar.push(camposParaAAba_(linha.campos, receita, true));
    } else if (linha.situacao === 'atualiza') {
      atualizarRegistro_(receita.aba, linha.id,
        camposParaAAba_(linha.campos, receita, false));
      atualizadas++;
    }
  });

  if (paraCriar.length) {
    criadas = inserirVariosRegistros_(receita.aba, paraCriar).length;
  }

  registrarAuditoria_('importacao.aplicar', receita.aba, '',
    receita.titulo + ': ' + criadas + ' criadas, ' + atualizadas + ' atualizadas, '
    + conferido.resumo.recusadas + ' recusadas');

  return {
    titulo: receita.titulo,
    criadas: criadas,
    atualizadas: atualizadas,
    iguais: conferido.resumo.iguais,
    recusadas: conferido.resumo.recusadas,
    por: quem.usuario.Nome
  };
}

/**
 * Traduz os campos da importação para os nomes de coluna da aba.
 *
 * Numa atualização, campo vazio é OMITIDO — não vai como texto vazio. É o que
 * faz a regra do "vazio não apaga" valer também na hora de escrever, e não só
 * na hora de conferir.
 */
function camposParaAAba_(campos, receita, ehNova) {
  var linha = {};
  receita.colunas.forEach(function (coluna) {
    var valor = campos[coluna.chave];
    if (!valor && !ehNova) return;
    linha[coluna.coluna] = valor || '';
  });

  // As colunas que a importação não pergunta, mas a aba espera.
  if (ehNova && receita.aba === 'CORRETORAS' && !linha.Nome) {
    linha.Nome = campos.corretora || '';
  }
  if (ehNova && receita.aba === 'SUSEP_BLOQUEADAS') {
    linha.BloqueadaEm = new Date();
  }
  return linha;
}


/* ==== Casos.gs ============================================================ */

/**
 * ============================================================================
 * PGO — Casos.gs · o caso, do formulário à busca
 * ============================================================================
 * A vida de um caso em três tempos: as perguntas que o formulário faz,
 * a gravação na planilha, e como achá-lo meses depois.
 *
 * O QUE TEM AQUI DENTRO, nesta ordem:
 *
 *   1. O MOTOR DO FORMULÁRIO   (era Campos.gs)
 *   2. REGISTRAR, EDITAR E OCULTAR   (era Casos.gs)
 *   3. ACHAR UM CASO QUE A FILA NÃO MOSTRA MAIS   (era Busca.gs)
 *
 * Procure pelo banner com ##### para pular de uma seção à outra.
 * ============================================================================
 */

/* ############################################################################
   #
   #  SEÇÃO 1 de 3 · O MOTOR DO FORMULÁRIO
   #
   #  Era o arquivo Back-End/Campos.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * ============================================================================
 * PGO — Campos.gs · o motor do formulário
 * ============================================================================
 * O formulário NÃO está escrito em lugar nenhum do código. Ele é montado a
 * partir da aba CAMPOS, campo a campo, toda vez que a tela abre.
 *
 * É isso que permite ao administrador criar, esconder, reordenar e mascarar
 * campo sem programador. E é isso que obriga o servidor a revalidar tudo: se o
 * formulário é dado, o que chega da tela também é — e dado não se confia.
 *
 * O caminho de um valor, da tela até a célula:
 *
 *   tela          000.123.456-78     como a pessoa digita, com máscara
 *   servidor      00012345678        só dígitos, conferido contra a máscara
 *   célula        00012345678        texto, formatado ANTES de gravar
 *
 * A máscara é aparência. O que cruza com outro sistema são os dígitos.
 * ============================================================================
 */

/**
 * O formulário de um canal, pronto para a tela desenhar.
 *
 * Já vem filtrado pelo nível de acesso de quem pediu: campo marcado como
 * oculto para o nível não aparece na resposta — e não aparecer na resposta é
 * diferente de vir escondido no HTML. Esconder no HTML é enfeite; quem não
 * pode ver, não recebe.
 */
function formularioDoCanal(idDoCanal) {
  var quem = exigirPermissao_(RECC_ACOES.CRIAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var porSecao = {};
  var ordemDasSecoes = [];

  camposAtivosDoCanal_(canal.id).forEach(function (campo) {
    var visibilidade = visibilidadeDoCampo_(quem.permissoes, campo.ChaveTecnica);
    if (visibilidade === RECC_VISIBILIDADE.OCULTO) return;

    var secao = String(campo.Secao || 'Geral');
    if (!porSecao[secao]) {
      porSecao[secao] = [];
      ordemDasSecoes.push(secao);
    }
    porSecao[secao].push(campoParaATela_(campo, canal.id, visibilidade, quem));
  });

  return {
    canal: canal,
    secoes: ordemDasSecoes.map(function (nome) {
      return { nome: nome, campos: porSecao[nome] };
    })
  };
}

/** Os campos ativos de um canal, na ordem escolhida pelo administrador. */
function camposAtivosDoCanal_(idDoCanal) {
  var alvo = converterParaIdentificador_(idDoCanal);
  return lerRegistros_('CAMPOS')
    .filter(function (campo) {
      return converterParaIdentificador_(campo.CanalId) === alvo
        && normalizarParaComparar_(campo.Ativo) === 'sim';
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    });
}

/** Uma linha de CAMPOS vira a descrição que a tela sabe desenhar. */
function campoParaATela_(campo, idDoCanal, visibilidade, quem) {
  var configuracao = lerConfiguracaoDoCampo_(campo);

  // O campo pode vir TRAVADO por dois motivos diferentes, e vale distinguir:
  // o nível pode dar só leitura (visibilidade), ou o campo pode ser de quem
  // não tem autorização para mexer nele — é o caso do Analista, que um
  // analista não troca para o nome de outra pessoa.
  var travadoPeloCargo = campoTravadoParaMim_(configuracao, quem);

  return {
    chave: String(campo.ChaveTecnica),
    cabecalho: String(campo.Cabecalho),
    rotulo: String(campo.Rotulo || campo.Cabecalho),
    descricao: String(campo.Descricao || ''),
    tipo: String(campo.TipoCampo || 'texto'),
    secao: String(campo.Secao || 'Geral'),
    mascara: String(campo.Mascara || ''),
    obrigatorio: normalizarParaComparar_(campo.Obrigatorio) === 'sim',
    somenteLeitura: visibilidade === RECC_VISIBILIDADE.LEITURA || travadoPeloCargo,
    travadoPeloCargo: travadoPeloCargo,
    valorPadrao: valorPadraoResolvido_(campo.ValorPadrao, quem),
    // Aparece só quando outro campo estiver com um valor específico. Guardado
    // como { campo: 'chave', valor: 'TEXTO' } — ver o formulário na tela.
    mostrarSe: configuracao.mostrarSe || null,
    largura: Number(configuracao.largura) || 1,
    opcoes: opcoesDoCampo_(configuracao, idDoCanal)
  };
}

/**
 * O valor padrão, com os atalhos que dependem de QUEM e de QUANDO resolvidos.
 *
 * Um valor padrão escrito à mão não sabe que dia é hoje. Estes três atalhos
 * sabem, e o servidor é quem os resolve — não a tela. O relógio do navegador
 * é o da máquina de quem está olhando, e uma data de recepção com o fuso
 * errado só aparece semanas depois, num relatório que não fecha.
 *
 *   @HOJE   a data de hoje          (dd/MM/yyyy)
 *   @AGORA  a data e a hora de agora (dd/MM/yyyy HH:mm)
 *   @EU     o nome de quem está cadastrando
 *
 * Qualquer outro texto passa inteiro, como sempre passou.
 */
function valorPadraoResolvido_(valorPadrao, quem) {
  var texto = String(valorPadrao || '').trim();
  if (texto.charAt(0) !== '@') return texto;

  var agora = new Date();
  switch (texto.toUpperCase()) {
    case '@HOJE':
      return Utilities.formatDate(agora, RECC_FUSO_HORARIO, 'dd/MM/yyyy');
    case '@AGORA':
      return Utilities.formatDate(agora, RECC_FUSO_HORARIO, 'dd/MM/yyyy HH:mm');
    case '@EU':
      return quem && quem.usuario ? String(quem.usuario.Nome || '') : '';
    default:
      return texto;
  }
}

/**
 * Este campo está travado para esta pessoa?
 *
 * O pedido da operação: o Analista já vem preenchido com o nome de quem está
 * cadastrando e, se o cargo for analista, não pode ser trocado — cadastrar em
 * nome de outra pessoa é coisa de quem coordena.
 *
 * A trava olha o CARGO, e quem a desfaz é uma AÇÃO do nível (editar). São
 * coisas diferentes de propósito: cargo diz o que a pessoa faz, nível diz o
 * que ela pode. Um analista que precise cadastrar para a equipe ganha a ação,
 * sem precisar trocar de cargo.
 */
function campoTravadoParaMim_(configuracao, quem) {
  var cargos = configuracao.travaPara;
  if (!Array.isArray(cargos) || !cargos.length) return false;
  if (!quem || !quem.cadastrado) return false;

  // Quem pode editar caso dos outros não é travado por cargo nenhum.
  if (podeFazer_(quem.permissoes, RECC_ACOES.EDITAR)
    && quem.permissoes.escopo !== RECC_ESCOPOS.PROPRIOS) {
    return false;
  }

  // COMPARA POR COMEÇO, não por igualdade.
  //
  // Os cargos da operação são "Analista RET" e "Analista Mesa Diamante", não
  // "Analista" seco. Uma comparação exata não travaria ninguém — e não daria
  // erro nenhum: o campo simplesmente ficaria editável, e só se descobriria
  // quando alguém cadastrasse em nome de outra pessoa.
  //
  // Por começo, "Analista" pega os três cargos de analista de hoje e pegará
  // o "Analista Pleno" que vier amanhã, sem ninguém precisar lembrar de
  // acrescentá-lo aqui.
  var meuCargo = normalizarParaComparar_(quem.cargo);
  if (!meuCargo) return false;
  return cargos.some(function (cargo) {
    var alvo = normalizarParaComparar_(cargo);
    return alvo !== '' && meuCargo.indexOf(alvo) === 0;
  });
}

/**
 * A coluna Configuracao guarda um JSON.
 * Vazia ou quebrada devolve objeto vazio: uma configuração com defeito não
 * pode derrubar o formulário inteiro — o campo apenas perde os extras.
 */
function lerConfiguracaoDoCampo_(campo) {
  var texto = String(campo.Configuracao || '').trim();
  if (!texto) return {};
  try {
    var lido = JSON.parse(texto);
    return lido && typeof lido === 'object' ? lido : {};
  } catch (erro) {
    Logger.log('Configuração inválida no campo "' + campo.Cabecalho + '": ' +
      erro.message);
    return {};
  }
}

/**
 * As opções de um seletor. Três origens possíveis:
 *
 *   { "catalogo": "STATUS" }      da aba CATALOGO, do canal ou global
 *   { "listaDe": "usuarios" }     de um cadastro: usuários, produtos, canais
 *   { "opcoes": ["Sim", "Não"] }  lista escrita à mão na configuração
 */
function opcoesDoCampo_(configuracao, idDoCanal) {
  if (Array.isArray(configuracao.opcoes)) {
    return configuracao.opcoes.map(function (opcao) {
      return { valor: String(opcao), rotulo: String(opcao) };
    });
  }
  if (configuracao.listaDe) return opcoesDeUmCadastro_(configuracao.listaDe);
  if (!configuracao.catalogo) return [];

  var tipo = normalizarParaComparar_(configuracao.catalogo);
  var doCanal = converterParaIdentificador_(idDoCanal);

  return lerRegistros_('CATALOGO')
    .filter(function (item) {
      if (normalizarParaComparar_(item.Tipo) !== tipo) return false;
      if (normalizarParaComparar_(item.Ativo) !== 'sim') return false;
      // Item sem canal é global e serve a todas; com canal, só à dela.
      var canalDoItem = converterParaIdentificador_(item.CanalId);
      return !canalDoItem || canalDoItem === doCanal;
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (item) {
      return {
        valor: String(item.Nome),
        rotulo: String(item.Rotulo || item.Nome),
        codigo: String(item.Codigo || '')
      };
    });
}

/**
 * Opções vindas de um cadastro, e não do catálogo.
 *
 * O caso que motivou isto é o analista: a lista de quem atende já existe na
 * aba USUARIOS, e repetir os mesmos nomes no catálogo criaria duas verdades
 * sobre a mesma coisa — bastaria alguém sair da equipe para as duas
 * divergirem.
 */
function opcoesDeUmCadastro_(qualCadastro) {
  var cadastro = String(qualCadastro).toLowerCase();

  if (cadastro === 'usuarios') {
    return lerRegistros_('USUARIOS')
      .filter(function (usuario) {
        return normalizarParaComparar_(usuario.Ativo) === 'sim';
      })
      .map(function (usuario) { return String(usuario.Nome); })
      .sort()
      .map(function (nome) { return { valor: nome, rotulo: nome }; });
  }

  if (cadastro === 'produtos') {
    return lerRegistros_('PRODUTOS').map(function (produto) {
      return {
        valor: String(produto.Produto),
        rotulo: String(produto.Produto),
        codigo: String(produto.CodigoProduto || '')
      };
    });
  }

  if (cadastro === 'canais') {
    return lerRegistros_('CORRETORAS').map(function (canal) {
      return { valor: String(canal.Nome), rotulo: String(canal.Nome) };
    });
  }

  throw new Error('Cadastro desconhecido em listaDe: "' + qualCadastro + '". ' +
    'Os cadastros são usuarios, produtos e canais.');
}

function canalPeloId_(idDoCanal) {
  var alvo = converterParaIdentificador_(idDoCanal);
  var canais = canaisVisiveis_();
  for (var i = 0; i < canais.length; i++) {
    if (converterParaIdentificador_(canais[i].id) === alvo) return canais[i];
  }
  throw new Error('Canal "' + idDoCanal + '" não existe ou está desativado.');
}

/**
 * O canal pedido, SE esta pessoa puder vê-lo.
 *
 * É esta que as telas usam, e não a de cima. A tela não oferecer o canal na
 * lista não protege nada: a chamada ao servidor existe, e basta mandar outro
 * Id. Quem decide é o servidor, sempre — a tela só escolhe o que mostrar.
 *
 * A recusa diz quais canais a pessoa TEM, porque "sem acesso" sozinho manda
 * procurar no lugar errado: quase sempre é o nível que ficou com o canal
 * errado marcado, e quem lê a mensagem precisa saber disso.
 */
function canalQueEuPossoVer_(idDoCanal, quem) {
  var canal = canalPeloId_(idDoCanal);
  var meus = canaisQueEuVejo_(quem);
  var alcanca = meus.some(function (um) {
    return converterParaIdentificador_(um.id)
      === converterParaIdentificador_(canal.id);
  });
  if (alcanca) return canal;

  throw new Error('O seu nível de acesso não enxerga o canal "' + canal.nome
    + '". ' + (meus.length
      ? 'Ele enxerga: ' + meus.map(function (um) { return um.nome; }).join(', ') + '.'
      : 'Ele não enxerga canal nenhum — peça a um administrador para ajustar '
        + 'o nível em Configurações › Níveis de acesso.'));
}

// ============================================================================
// VALIDAÇÃO — no servidor, sempre
// ============================================================================

/**
 * Confere o que veio da tela e devolve os valores prontos para gravar,
 * com as chaves iguais aos cabeçalhos das colunas.
 *
 * Junta todos os problemas antes de reclamar. Devolver um erro por vez faria a
 * pessoa corrigir, salvar, descobrir o segundo, corrigir, salvar de novo.
 */
function validarValores_(idDoCanal, valoresDaTela, quem) {
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var problemas = [];
  var paraGravar = {};

  camposAtivosDoCanal_(canal.id).forEach(function (campo) {
    var visibilidade = visibilidadeDoCampo_(quem.permissoes, campo.ChaveTecnica);

    // Campo que a pessoa não pode ver ou não pode editar é IGNORADO, mesmo
    // que a tela mande um valor. A tela é do lado de lá; ela não decide.
    if (visibilidade !== RECC_VISIBILIDADE.EDICAO) return;

    var descricao = campoParaATela_(campo, canal.id, visibilidade, quem);
    var bruto = valoresDaTela[descricao.chave];
    if (bruto === undefined) bruto = valoresDaTela[descricao.cabecalho];
    if (bruto === undefined || bruto === null) bruto = '';

    var problema = conferirCampo_(descricao, bruto);
    if (problema) {
      problemas.push({ campo: descricao.chave, rotulo: descricao.rotulo, erro: problema });
      return;
    }
    if (String(bruto).trim() === '') return;

    // Um seletor pode alimentar DUAS colunas. É o caso do produto, que a
    // operação escolhe como "1101 - VIDA INDIVIDUAL" e a planilha guarda
    // separado: o código numa coluna, o nome na outra.
    //
    // Escolher uma coisa e gravar duas é de propósito. Uma caixa só é menos
    // uma chance de digitar o código de um produto e o nome de outro; e as
    // colunas separadas são o que deixa o painel agrupar por código e o
    // relatório mostrar o nome.
    var separa = lerConfiguracaoDoCampo_(campo).separaEm;
    if (separa && separa.codigo && separa.nome) {
      var partes = separarCodigoENome_(bruto);
      paraGravar[separa.codigo] = partes.codigo;
      paraGravar[separa.nome] = partes.nome;
      return;
    }

    paraGravar[descricao.cabecalho] = bruto;
  });

  if (problemas.length) {
    var erro = new Error('Confira ' + problemas.length + ' campo(s): '
      + problemas.map(function (p) { return p.rotulo + ' — ' + p.erro; }).join('; '));
    erro.problemas = problemas;
    throw erro;
  }
  return paraGravar;
}

/** Devolve a mensagem do problema, ou string vazia quando está tudo certo. */
function conferirCampo_(campo, valor) {
  var texto = String(valor === null || valor === undefined ? '' : valor).trim();

  if (texto === '') {
    return campo.obrigatorio ? 'é obrigatório' : '';
  }

  if (campo.tipo === 'identificador' || campo.tipo === 'documento') {
    var digitos = converterParaIdentificador_(texto);
    if (!digitos) return 'precisa ter ao menos um dígito';
    var esperados = quantosDigitosAMascaraPede_(campo.mascara);
    if (esperados && digitos.replace(/;/g, '').length !== esperados) {
      return 'precisa ter ' + esperados + ' dígitos (veio com '
        + digitos.replace(/;/g, '').length + ')';
    }
    return '';
  }

  if (campo.tipo === 'numero' || campo.tipo === 'moeda' || campo.tipo === 'percentual') {
    if (converterParaNumero_(texto) === '') return 'precisa ser um número';
    return '';
  }

  if (campo.tipo === 'data') {
    var data = converterParaData_(texto);
    if (!data) return 'precisa ser uma data no formato dd/mm/aaaa';
    if (dataEstaNoFuturo_(data)) {
      return 'não pode ser no futuro — o caso descreve algo que já aconteceu';
    }
    return '';
  }

  if (campo.tipo === 'hora') {
    if (!converterParaHora_(texto)) return 'precisa ser uma hora no formato hh:mm';
    return '';
  }

  if (campo.tipo === 'email' && texto.indexOf('@') < 0) {
    return 'precisa ser um e-mail';
  }

  // Seletor com lista VAZIA aceita o que for digitado. Um cadastro ainda não
  // preenchido não pode travar o campo: sem esta linha, escolher "produtos"
  // como origem antes de cadastrar produto nenhum deixaria o campo
  // impossível de preencher e sem explicação na tela.
  if (campo.tipo === 'seletor' && campo.opcoes.length) {
    for (var i = 0; i < campo.opcoes.length; i++) {
      if (normalizarParaComparar_(campo.opcoes[i].valor) === normalizarParaComparar_(texto)) {
        return '';
      }
    }
    return 'não é uma das opções da lista';
  }

  return '';
}

/** Numa máscara, cada zero é um dígito: 000.000.000-00 pede 11. */
function quantosDigitosAMascaraPede_(mascara) {
  var zeros = String(mascara || '').match(/0/g);
  return zeros ? zeros.length : 0;
}

/**
 * Hoje em São Paulo, e não em UTC.
 * O Apps Script roda em UTC: depois das 21 h, "hoje" viraria amanhã e o
 * sistema recusaria um caso registrado à noite.
 */
function dataEstaNoFuturo_(data) {
  var agora = new Date();
  var hojeAqui = Utilities.formatDate(agora, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
  var aDataDela = Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
  return aDataDela > hojeAqui;
}

/* ############################################################################
   #
   #  SEÇÃO 2 de 3 · REGISTRAR, EDITAR E OCULTAR
   #
   #  Era o arquivo Back-End/Casos.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * ============================================================================
 * PGO — Casos.gs · registrar, editar e ocultar um caso
 * ============================================================================
 * É aqui que o dado entra na planilha. Três coisas acontecem, nesta ordem, e
 * nenhuma pode ser pulada:
 *
 *   1. confere a permissão      quem não pode criar, não cria — mesmo que a
 *                               tela tenha mostrado o botão
 *   2. valida os valores        campo a campo, contra a definição da aba
 *                               CAMPOS, no SERVIDOR
 *   3. grava                    pela porta única, que formata a linha antes
 *
 * A tela também valida, para a pessoa não descobrir o erro só depois de
 * clicar. Mas a validação da tela é cortesia; a que conta é esta.
 * ============================================================================
 */

/**
 * Registra um caso novo.
 *
 * Devolve o Id gerado. A data e a hora de entrada são preenchidas pelo
 * SERVIDOR quando o canal declara essas colunas e a tela não mandou nada —
 * deixar o relógio do navegador decidir daria horários de fusos diferentes na
 * mesma base.
 */
function cadastrarCaso(idDoCanal, valores) {
  var quem = exigirPermissao_(RECC_ACOES.CRIAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var paraGravar = validarValores_(canal.id, valores || {}, quem);
  preencherEntradaAutomatica_(canal, paraGravar);
  preencherResponsavelAutomatico_(canal, paraGravar, quem);

  var gravado = inserirRegistro_(canal.aba, paraGravar, { origem: RECC_ORIGEM_SISTEMA });
  registrarAuditoria_('caso.criar', canal.aba, gravado.__id, canal.nome);

  return { id: gravado.__id, canal: canal.nome, aba: canal.aba };
}

/**
 * Altera um caso existente.
 *
 * A data de entrada NÃO é reescrita: histórico não muda sozinho. Se o campo
 * vier na alteração, ele é respeitado — mas o preenchimento automático só age
 * na criação.
 */
function editarCaso(idDoCanal, idDoCaso, valores) {
  var quem = exigirPermissao_(RECC_ACOES.EDITAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var alvo = converterParaIdentificador_(idDoCaso);
  if (!alvo) throw new Error('Informe qual caso deve ser alterado.');

  var atual = buscarRegistros_(canal.aba, 'Id', alvo, 1)[0];
  if (!atual) {
    throw new Error('O caso ' + alvo + ' não existe no canal ' + canal.nome + '.');
  }
  exigirAlcanceSobre_(atual, canal, quem);

  var paraGravar = validarValores_(canal.id, valores || {}, quem);
  atualizarRegistro_(canal.aba, alvo, paraGravar);
  registrarAuditoria_('caso.editar', canal.aba, alvo, canal.nome);

  return { id: alvo, canal: canal.nome };
}

/**
 * Troca só a situação de um caso.
 *
 * Existe separado de `editarCaso` porque é o gesto mais frequente da
 * operação: o analista atende, muda a situação e segue. Abrir o formulário
 * inteiro de trinta e cinco campos para mexer num só é atrito que se paga
 * dezenas de vezes por dia.
 *
 * Segue a permissão de EDITAR: trocar a situação é editar o caso.
 */
function alterarSituacaoDoCaso(idDoCanal, idDoCaso, situacaoNova) {
  var quem = exigirPermissao_(RECC_ACOES.EDITAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var alvo = converterParaIdentificador_(idDoCaso);

  if (!canal.colunaDoStatus) {
    throw new Error('O canal ' + canal.nome + ' não declarou qual coluna guarda ' +
      'a situação, então não há o que trocar. Isso se ajusta em Configurações.');
  }

  var atual = buscarRegistros_(canal.aba, 'Id', alvo, 1)[0];
  if (!atual) {
    throw new Error('O caso ' + alvo + ' não existe no canal ' + canal.nome + '.');
  }
  exigirAlcanceSobre_(atual, canal, quem);

  var escolhida = String(situacaoNova || '').trim();
  var conhecidas = situacoesDoCanal_(canal);
  var achada = null;
  conhecidas.forEach(function (uma) {
    if (normalizarParaComparar_(uma.gravadoComo)
      === normalizarParaComparar_(escolhida)) achada = uma;
  });
  if (!achada) {
    throw new Error('A situação "' + escolhida + '" não existe no canal ' +
      canal.nome + '. As situações dela são: ' + conhecidas.map(function (uma) {
        return uma.gravadoComo;
      }).join(', ') + '.');
  }

  var alteracao = {};
  alteracao[canal.colunaDoStatus] = achada.gravadoComo;

  // Concluir preenche a data de finalização quando o canal tem essa coluna e
  // ela ainda está vazia — é o que a operação faria à mão logo em seguida.
  if (canal.colunaDaFinalizacao && !atual[canal.colunaDaFinalizacao]
    && normalizarParaComparar_(achada.gravadoComo).indexOf('conclu') === 0) {
    alteracao[canal.colunaDaFinalizacao] = new Date();
  }

  carimbarOStatus_(canal, achada, atual, alteracao);

  atualizarRegistro_(canal.aba, alvo, alteracao);

  // NÃO registra na auditoria, e isso é decisão da operação.
  //
  // Troca de status é o evento mais frequente do sistema: um caso passa por
  // quatro ou cinco antes de fechar. Numa base de 200 mil casos isso são
  // quase um milhão de linhas de auditoria — uma aba enorme, que empurra a
  // planilha para o teto de células, e da qual ninguém tira relatório.
  //
  // O que a operação precisa saber é QUANDO cada etapa aconteceu, e isso
  // agora fica carimbado na própria linha do caso, na aba do canal (ver
  // carimbarOStatus_). Mesma informação, no lugar em que ela é usada.
  //
  // A auditoria continua guardando o que é raro e sem volta: criar, editar,
  // ocultar, mexer em configuração.

  return { id: alvo, situacao: achada.gravadoComo, tom: achada.tom };
}

/**
 * Carimba data e hora na coluna que ESTE status declarou.
 *
 * Cada status diz, no catálogo, em qual coluna da base ele grava o momento em
 * que o caso chegou nele — "Data do 1º contato" na RET, "Data e horário de
 * finalização" na Mesa Diamante. É o que permite medir produtividade sem
 * cruzar duas abas.
 *
 * CARIMBA SÓ SE ESTIVER VAZIO. Um caso que volta para um status por onde já
 * passou não reescreve a data: o que interessa é quando aquilo aconteceu pela
 * primeira vez. Reescrever apagaria justamente o dado que se quer medir, e
 * apagaria em silêncio.
 *
 * Coluna declarada que não existe na base é ignorada, sem estourar: o caso
 * precisa ser salvo de qualquer jeito. Quem cobra isso é o diagnóstico, que
 * enxerga a instalação inteira e sabe explicar.
 */
function carimbarOStatus_(canal, situacao, registroAtual, alteracao) {
  var coluna = String(situacao.colunaDeCarimbo || '').trim();
  if (!coluna) return;

  var estrutura = estruturaDaAba_(canal.aba);
  if (posicaoDaColuna_(estrutura, coluna) < 0) return;

  var jaTem = String(registroAtual[coluna] || '').trim();
  if (jaTem) return;

  alteracao[coluna] = new Date();
}

/**
 * As situações que o canal oferece, para o diálogo de troca.
 *
 * A situação que o caso tem hoje vem marcada. Se ela tiver sido desligada
 * depois, continua aparecendo — a pessoa precisa entender o que o caso tem,
 * mesmo que não possa escolher aquilo de novo.
 */
function situacoesParaTrocar(idDoCanal, idDoCaso) {
  var quem = exigirPermissao_(RECC_ACOES.EDITAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var atual = buscarRegistros_(canal.aba, 'Id',
    converterParaIdentificador_(idDoCaso), 1)[0];
  if (!atual) {
    throw new Error('O caso ' + idDoCaso + ' não existe no canal ' + canal.nome + '.');
  }
  exigirAlcanceSobre_(atual, canal, quem);

  var hoje = canal.colunaDoStatus
    ? String(atual[canal.colunaDoStatus] || '') : '';
  var opcoes = situacoesDoCanal_(canal).map(function (uma) {
    return { valor: uma.gravadoComo, rotulo: uma.nome, tom: uma.tom };
  });

  var conhecida = opcoes.some(function (uma) {
    return normalizarParaComparar_(uma.valor) === normalizarParaComparar_(hoje);
  });
  if (hoje && !conhecida) {
    opcoes.unshift({ valor: hoje, rotulo: hoje + ' (desligada)', tom: 'neutro' });
  }

  return { atual: hoje, opcoes: opcoes };
}

/**
 * Os valores de um caso, prontos para o formulário de edição.
 *
 * Devolve pelo CHAVE TÉCNICA do campo, que é como o formulário identifica
 * cada caixa — o mesmo formato que `cadastrarCaso` recebe de volta.
 */
function casoParaEditar(idDoCanal, idDoCaso) {
  var quem = exigirPermissao_(RECC_ACOES.EDITAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var registro = buscarRegistros_(canal.aba, 'Id',
    converterParaIdentificador_(idDoCaso), 1)[0];
  if (!registro) {
    throw new Error('O caso ' + idDoCaso + ' não existe no canal ' + canal.nome + '.');
  }
  exigirAlcanceSobre_(registro, canal, quem);

  var estrutura = estruturaDaAba_(canal.aba);
  var valores = {};

  camposAtivosDoCanal_(canal.id).forEach(function (campo) {
    var posicao = posicaoDaColuna_(estrutura, campo.Cabecalho);
    if (posicao < 0) return;
    valores[String(campo.ChaveTecnica)] =
      paraTexto_(registro[campo.Cabecalho], estrutura.tipos[posicao]);
  });

  return { id: registro.__id, canal: canal.nome, valores: valores };
}

/** Tira o caso da tela. A linha permanece na planilha, e volta editando _Visivel. */
function excluirCaso(idDoCanal, idDoCaso) {
  // QUALQUER pessoa cadastrada exclui, em QUALQUER canal. Decisão do PO:
  // "todos os canais e níveis de acesso podem excluir um caso criado".
  //
  // É o único ponto do sistema sem trava de nível nem de escopo, e está
  // escrito assim de propósito, para ninguém "consertar" isso achando que foi
  // esquecimento. Continua exigindo estar CADASTRADO: quem não entra no
  // sistema não apaga nada.
  var quem = usuarioAtual_();
  if (!quem.cadastrado) throw new Error(quem.motivo);

  var canal = canalPeloId_(idDoCanal);
  var alvo = converterParaIdentificador_(idDoCaso);

  var atual = buscarRegistros_(canal.aba, 'Id', alvo, 1)[0];
  if (!atual) {
    throw new Error('O caso ' + alvo + ' não existe no canal ' + canal.nome + '.');
  }

  // A auditoria PRIMEIRO, com o conteúdo da linha — porque depois não existe
  // mais de onde tirar. Sem isto, um caso apagado por engano não deixa nem
  // rastro de que existiu, e alguém vai jurar que cadastrou.
  registrarAuditoria_('caso.excluir', canal.aba, alvo,
    canal.nome + ' — ' + resumoDoCasoParaAuditoria_(atual, canal));

  apagarRegistroDeVez_(canal.aba, alvo);
  return true;
}

/**
 * O caso em uma linha de texto, para a auditoria guardar antes de apagar.
 *
 * Não é o registro inteiro: uma linha da RET tem 36 colunas, e despejá-las
 * numa célula de auditoria daria um texto que ninguém lê. São os campos pelos
 * quais alguém procuraria o caso depois — quem era, de quem, e como estava.
 */
function resumoDoCasoParaAuditoria_(registro, canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var pedacos = [];

  var colunaDoDono = colunaDoResponsavel_(estrutura);
  if (colunaDoDono && registro[colunaDoDono]) {
    pedacos.push('analista ' + registro[colunaDoDono]);
  }
  if (canal.colunaDoStatus && registro[canal.colunaDoStatus]) {
    pedacos.push('status ' + registro[canal.colunaDoStatus]);
  }
  (canal.colunasDaBusca || '').split(',').forEach(function (cabecalho) {
    var nome = String(cabecalho).trim();
    if (!nome || !registro[nome]) return;
    if (pedacos.length >= 5) return;
    pedacos.push(nome + ': ' + registro[nome]);
  });

  return pedacos.length ? pedacos.join(' · ') : 'linha sem conteúdo';
}

/**
 * O escopo do nível também vale para escrever, não só para ler.
 *
 * Quem enxerga só os próprios casos não pode editar o caso de outra pessoa
 * mandando o Id direto — a tela não ofereceria o botão, mas a chamada existe.
 */
function exigirAlcanceSobre_(registro, canal, quem) {
  var alcance = filtrarPeloAlcance_([registro], canal.aba, quem);
  if (alcance.length) return;

  // A recusa nomeia o RESPONSÁVEL pelo caso, e não só o escopo.
  //
  // "Fora do seu alcance" sozinho manda a pessoa achar que o canal não
  // permite aquela ação — foi exatamente assim que a operação leu, ao tentar
  // excluir um caso da RET e conseguir na Mesa Diamante. Os dois canais
  // sempre permitiram; o que barrava era o caso ser de outra pessoa.
  var estrutura = estruturaDaAba_(canal.aba);
  var coluna = colunaDoResponsavel_(estrutura);
  var dono = coluna ? String(registro[coluna] || '').trim() : '';

  throw new Error('Este caso é de ' + (dono || 'outra pessoa')
    + ', e o seu nível (escopo ' + quem.permissoes.escopo + ') alcança '
    + (quem.permissoes.escopo === RECC_ESCOPOS.PROPRIOS
      ? 'apenas os casos em que você é a responsável. '
      : 'apenas parte dos casos. ')
    + 'Isso vale para qualquer canal, e não é uma regra do ' + canal.nome
    + '. Para alcançar os casos de outras pessoas, um administrador ajusta o '
    + 'escopo do seu nível em Configurações › Níveis de acesso.');
}

/**
 * Parte "1101 - VIDA INDIVIDUAL" em código e nome.
 *
 * O hífen separa, e só o PRIMEIRO separa: nome de produto pode ter hífen
 * dentro ("VIDA - PLANO A - OURO"), e partir em todos deixaria o nome pela
 * metade. Sem hífen nenhum, o texto inteiro é o nome e o código fica vazio —
 * é o que acontece com um produto antigo, cadastrado antes desta regra.
 */
function separarCodigoENome_(valor) {
  var texto = String(valor || '').trim();
  var corte = texto.indexOf('-');
  if (corte < 0) return { codigo: '', nome: texto };

  var codigo = texto.substring(0, corte).trim();
  var nome = texto.substring(corte + 1).trim();

  // Se o que veio antes do hífen não for um código, não há o que separar:
  // era um nome com hífen, e parti-lo perderia metade dele.
  //
  // O que distingue um código de uma palavra é TER DÍGITO. "1101" e "A12" são
  // códigos; "VIDA", em "VIDA - PLANO A", é o começo do nome. Aceitar
  // qualquer coisa curta guardaria "VIDA" como código do produto, calado.
  var pareceCodigo = codigo.length <= 10
    && /^[0-9A-Za-z.]+$/.test(codigo)
    && /[0-9]/.test(codigo);
  if (!pareceCodigo) return { codigo: '', nome: texto };
  return { codigo: codigo, nome: nome };
}

/** Data e hora de entrada, decididas pelo servidor, só quando faltam. */
function preencherEntradaAutomatica_(canal, paraGravar) {
  var agora = new Date();
  if (canal.colunaDaData && !paraGravar[canal.colunaDaData]) {
    paraGravar[canal.colunaDaData] =
      Utilities.formatDate(agora, RECC_FUSO_HORARIO, 'dd/MM/yyyy');
  }
  if (canal.colunaDaHora && !paraGravar[canal.colunaDaHora]) {
    paraGravar[canal.colunaDaHora] =
      Utilities.formatDate(agora, RECC_FUSO_HORARIO, 'HH:mm');
  }
}

/** O analista do caso é quem o registrou, quando a tela não disse outro. */
function preencherResponsavelAutomatico_(canal, paraGravar, quem) {
  var estrutura = estruturaDaAba_(canal.aba);
  var coluna = colunaDoResponsavel_(estrutura);
  if (coluna && !paraGravar[coluna]) paraGravar[coluna] = quem.usuario.Nome;
}

// ============================================================================
// O SELO DA SUSEP
// ============================================================================

/**
 * A situação de uma SUSEP, para a tela mostrar no instante em que ela é
 * digitada.
 *
 * Três respostas possíveis, e as três são informação — inclusive a terceira:
 *
 *   BLOQUEADA        está na aba SUSEP_BLOQUEADAS
 *   OK               está no cadastro de canais, com o segmento dela
 *   NAO_ENCONTRADA   não está em lugar nenhum. Isso NÃO é erro nem vazio:
 *                    é uma corretora que o cadastro não conhece, e a operação
 *                    precisa saber disso antes de seguir
 */
function consultarSusep(susep) {
  exigirPermissao_(RECC_ACOES.CRIAR);

  var procurada = converterParaIdentificador_(susep);
  if (!procurada) {
    return { situacao: 'VAZIA', mensagem: 'Digite a SUSEP.' };
  }

  // Procura pela COLUNA, não lendo a tabela inteira.
  //
  // Isto é digitado: o selo responde a cada SUSEP que alguém escreve no
  // formulário. Ler as duas tabelas inteiras a cada digitação era ler mais de
  // 140 mil células — com as 16 mil SUSEPs bloqueadas e as 7 mil do cadastro
  // que a operação vai importar, o formulário travaria a cada campo
  // preenchido, e travaria mais a cada corretora nova cadastrada.
  //
  // buscarRegistros_ lê só a coluna da SUSEP, acha em qual linha ela está, e
  // só então lê aquela linha inteira. É a mesma regra que sustenta a busca de
  // casos: ler a coluna antes de ler as linhas.
  var bloqueada = buscarRegistroVisivel_('SUSEP_BLOQUEADAS', 'SUSEP', procurada);

  if (bloqueada) {
    return {
      situacao: 'BLOQUEADA',
      susep: procurada,
      corretora: String(bloqueada.NomeCorretora || ''),
      motivo: String(bloqueada.Motivo || ''),
      mensagem: 'SUSEP bloqueada'
        + (bloqueada.NomeCorretora ? ' — ' + bloqueada.NomeCorretora : '')
    };
  }

  var canal = buscarRegistroVisivel_('CORRETORAS', 'SUSEP', procurada);

  if (!canal) {
    return {
      situacao: 'NAO_ENCONTRADA',
      susep: procurada,
      segmento: 'Não encontrado',
      mensagem: 'SUSEP não encontrada no cadastro de canais'
    };
  }

  return {
    situacao: 'OK',
    susep: procurada,
    corretora: String(canal.Corretora || ''),
    canal: String(canal.Canal || ''),
    segmento: String(canal.Segmento || 'Não encontrado'),
    consultor: String(canal.Consultor || ''),
    mensagem: 'SUSEP liberada'
  };
}

/* ############################################################################
   #
   #  SEÇÃO 3 de 3 · ACHAR UM CASO QUE A FILA NÃO MOSTRA MAIS
   #
   #  Era o arquivo Back-End/Busca.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * ============================================================================
 * PGO — Busca.gs · achar um caso que a fila não mostra mais
 * ============================================================================
 * O Dashboard mostra os últimos 30 dias. Isso é de propósito: ele responde
 * "o que eu tenho que trabalhar hoje". Quando o cliente liga citando um
 * protocolo de abril, é aqui que se procura.
 *
 * A REGRA QUE SUSTENTA ESTA TELA: **ler a coluna antes de ler as linhas.**
 *
 *   Uma base da RET com 200 mil linhas por 39 colunas são 7,8 milhões de
 *   células. Ler tudo para procurar um protocolo estoura o tempo do Apps
 *   Script e a cota da conta. Ler UMA coluna são 200 mil células; ler cinco
 *   colunas de busca é um milhão. Depois de saber QUAIS linhas casam — que
 *   costumam ser uma ou duas —, aí sim se lê a linha inteira.
 *
 * A comparação IGNORA MÁSCARA quando a coluna é identificador ou documento:
 * quem digita "1-2345678901" acha "12345678901", e quem digita
 * "123.456.789-01" acha "12345678901". Exigir o formato exato transformaria
 * a busca em adivinhação.
 *
 * E há a PLANILHA LEGADA: o histórico que ficou no sistema anterior. Ela é
 * lida como está — primeira linha é cabeçalho, e nada mais é assumido —,
 * porque não temos contrato sobre ela e nunca vamos ter.
 * ============================================================================
 */

/** Quantos casos a busca devolve, no máximo, por origem. */
const RECC_MAXIMO_DA_BUSCA = 100;

/** Menos que isto é termo curto demais: acharia meia base. */
const RECC_MINIMO_DO_TERMO = 3;

/**
 * O que a tela precisa saber ao abrir: onde dá para procurar.
 */
function opcoesDaBusca() {
  var quem = exigirTela_('buscarCaso');

  return {
    // Só os canais desta pessoa. Oferecer os outros seria convidar a procurar
    // onde a busca depois vai recusar.
    canais: canaisQueEuVejo_(quem).map(function (canal) {
      return {
        id: canal.id,
        nome: canal.nome,
        icone: canal.icone,
        procuraEm: colunasDaBusca_(canal).map(function (coluna) {
          return coluna.cabecalho;
        })
      };
    }),
    legado: descricaoDoLegado_(),
    minimo: RECC_MINIMO_DO_TERMO,
    maximo: RECC_MAXIMO_DA_BUSCA,
    escopo: quem.permissoes.escopo
  };
}

/**
 * Procura o termo nos canais escolhidas e, se estiver ligada, na base legada.
 *
 * `ondeProcurar` é a lista de ids de canal; vazio procura em todas as que a
 * pessoa enxerga. `incluirLegado` diz se a planilha antiga entra.
 */
function buscarCasos(termo, ondeProcurar, incluirLegado) {
  var quem = exigirTela_('buscarCaso');

  var procurado = String(termo || '').trim();
  if (procurado.length < RECC_MINIMO_DO_TERMO) {
    throw new Error('Digite ao menos ' + RECC_MINIMO_DO_TERMO + ' caracteres. ' +
      'Com menos que isso a busca traria meia base, e nenhuma delas seria a ' +
      'que você procura.');
  }

  var escolhidas = (ondeProcurar || []).map(converterParaIdentificador_);
  var resultados = [];

  // E procura SÓ nos canais desta pessoa. A tela não oferecer os outros não
  // basta: a chamada existe, e nada impede mandar o Id de um canal alheio.
  canaisQueEuVejo_(quem).forEach(function (canal) {
    if (escolhidas.length && escolhidas.indexOf(converterParaIdentificador_(canal.id)) < 0) {
      return;
    }
    resultados.push(procurarNoCanal_(canal, procurado, quem));
  });

  if (incluirLegado) {
    var doLegado = procurarNoLegado_(procurado);
    if (doLegado) resultados.push(doLegado);
  }

  var total = resultados.reduce(function (soma, origem) {
    return soma + origem.casos.length;
  }, 0);

  registrarAuditoria_('busca', 'BUSCA', '', procurado);
  return { termo: procurado, total: total, origens: resultados };
}

// ============================================================================
// A BUSCA NA BASE PRÓPRIA
// ============================================================================

/**
 * As colunas em que o canal procura.
 *
 * Declaradas em `CANAIS.ColunasDaBusca`, e não adivinhadas: adivinhar acerta
 * no canal de hoje e erra na próxima. Sem nada declarado, procura na coluna
 * da situação e na da data — pouco, mas nunca na base inteira.
 */
function colunasDaBusca_(canal) {
  var estrutura = estruturaDaAba_(canal.aba);

  return String(canal.colunasDaBusca || '')
    .split(',')
    .map(function (nome) { return nome.trim(); })
    .filter(function (nome) {
      return nome !== '' && posicaoDaColuna_(estrutura, nome) >= 0;
    })
    .map(function (nome) {
      var posicao = posicaoDaColuna_(estrutura, nome);
      return {
        cabecalho: estrutura.cabecalhos[posicao],
        tipo: estrutura.tipos[posicao]
      };
    });
}

/**
 * Procura num canal, lendo coluna por coluna e só depois as linhas que casam.
 */
function procurarNoCanal_(canal, termo, quem) {
  var colunas = colunasDaBusca_(canal);
  var aviso = '';

  if (!colunas.length) {
    return {
      tipo: 'canal',
      id: canal.id,
      nome: canal.nome,
      icone: canal.icone,
      colunas: [],
      casos: [],
      aviso: 'Esto canal não declarou em quais colunas procurar. ' +
        'Isso se ajusta em Configurações → Canais de trabalho.'
    };
  }

  // Passo 1: ler só as colunas de busca, e anotar em QUAIS linhas o termo
  // aparece. É aqui que a tela não estoura numa base grande.
  var linhasQueCasam = {};
  var ordemDasLinhas = [];

  colunas.forEach(function (coluna) {
    var valores = lerColunaInteira_(canal.aba, coluna.cabecalho);
    for (var i = 0; i < valores.length; i++) {
      var numeroDaLinha = i + 2;   // a linha 1 é o cabeçalho
      if (linhasQueCasam[numeroDaLinha]) continue;
      if (!casaComOTermo_(valores[i], termo, coluna.tipo)) continue;

      linhasQueCasam[numeroDaLinha] = coluna.cabecalho;
      ordemDasLinhas.push(numeroDaLinha);
    }
  });

  if (ordemDasLinhas.length > RECC_MAXIMO_DA_BUSCA) {
    aviso = 'A busca achou ' + ordemDasLinhas.length + ' casos e mostra os ' +
      RECC_MAXIMO_DA_BUSCA + ' mais recentes. Um termo mais específico ' +
      'chega mais perto.';
    // Os mais recentes são os do fim da base, que só acrescenta no fim.
    ordemDasLinhas = ordemDasLinhas.slice(-RECC_MAXIMO_DA_BUSCA);
  }

  // Passo 2: agora sim, ler as linhas inteiras — só essas.
  ordemDasLinhas.sort(function (uma, outra) { return outra - uma; });
  var registros = lerLinhasEspecificas_(canal.aba, ordemDasLinhas)
    .filter(function (registro) {
      // Caso ocultado não volta na busca. A linha continua na planilha, e
      // um administrador ainda a enxerga por lá.
      return normalizarParaComparar_(registro._Visivel) !== 'nao';
    });

  var meus = filtrarPeloAlcance_(registros, canal.aba, quem);

  return {
    tipo: 'canal',
    id: canal.id,
    nome: canal.nome,
    icone: canal.icone,
    colunas: colunasDaFila_(canal),
    casos: montarFila_(meus.slice().reverse(), canal),
    ondeAchou: linhasQueCasam,
    procurouEm: colunas.map(function (coluna) { return coluna.cabecalho; }),
    aviso: aviso
  };
}

/**
 * O valor da célula casa com o que a pessoa digitou?
 *
 * Identificador e documento comparam só os DÍGITOS, dos dois lados: quem
 * digita "123.456.789-01" acha "12345678901", e vice-versa. O resto compara
 * texto sem acento e sem caixa, procurando o termo dentro do valor.
 */
function casaComOTermo_(valor, termo, tipo) {
  if (valor === '' || valor === null || valor === undefined) return false;

  if (tipo === RECC_TIPO_DE_DADO.IDENTIFICADOR) {
    var digitosDoTermo = apenasDigitos_(termo);
    if (!digitosDoTermo) return false;
    return apenasDigitos_(valor).indexOf(digitosDoTermo) >= 0;
  }

  return normalizarParaComparar_(valor)
    .indexOf(normalizarParaComparar_(termo)) >= 0;
}

// ============================================================================
// A PLANILHA LEGADA
// ============================================================================

/** O que está configurado sobre a base antiga, sem tentar abri-la. */
function descricaoDoLegado_() {
  var id = String(valorDaConfiguracao_('LEGADO.PLANILHA_ID', '')).trim();
  return {
    ligado: id !== '',
    rotulo: String(valorDaConfiguracao_('LEGADO.ROTULO', 'Base legada')),
    aba: String(valorDaConfiguracao_('LEGADO.ABA', '')).trim()
  };
}

/**
 * Procura na planilha do sistema anterior.
 *
 * Ela não tem contrato: a primeira linha é entendida como cabeçalho e nada
 * mais é assumido — nem tipo de coluna, nem nome, nem ordem. Procura em
 * TODAS as colunas, porque não há como saber quais importam.
 *
 * Falhar aqui não pode derrubar a busca na base própria: uma planilha que
 * saiu do ar, ou uma permissão que caiu, viram um recado ao lado dos
 * resultados de verdade.
 */
function procurarNoLegado_(termo) {
  var configurado = descricaoDoLegado_();
  if (!configurado.ligado) return null;

  var id = String(valorDaConfiguracao_('LEGADO.PLANILHA_ID', '')).trim();
  var aba;
  try {
    var planilha = abrirPlanilhaDeFora_(id);
    aba = configurado.aba
      ? planilha.getSheetByName(configurado.aba)
      : planilha.getSheets()[0];
    if (!aba) {
      return recadoDoLegado_(configurado, 'A aba "' + configurado.aba +
        '" não existe na planilha legada.');
    }
  } catch (erro) {
    // Aqui a falha NÃO derruba a busca: a base própria já respondeu, e perder
    // o histórico antigo é melhor que perder a busca inteira. O recado sai
    // junto do resultado, na origem "legado".
    return recadoDoLegado_(configurado, 'Não consegui abrir a planilha legada. '
      + (erro.message || erro));
  }

  var totalDeLinhas = aba.getLastRow();
  var totalDeColunas = aba.getLastColumn();
  if (totalDeLinhas < 2 || totalDeColunas < 1) {
    return recadoDoLegado_(configurado, 'A planilha legada está vazia.');
  }

  var tudo = aba.getRange(1, 1, totalDeLinhas, totalDeColunas).getValues();
  var cabecalhos = tudo[0].map(function (celula, i) {
    return String(celula || '').trim() || ('Coluna ' + (i + 1));
  });

  var achados = [];
  for (var linha = 1; linha < tudo.length && achados.length < RECC_MAXIMO_DA_BUSCA; linha++) {
    var casou = false;
    for (var coluna = 0; coluna < cabecalhos.length; coluna++) {
      // Sem tipo declarado, tentamos as duas comparações: por dígitos e por
      // texto. É o preço de ler uma planilha sobre a qual não temos contrato.
      if (casaComOTermo_(tudo[linha][coluna], termo, RECC_TIPO_DE_DADO.TEXTO)
        || casaComOTermo_(tudo[linha][coluna], termo,
          RECC_TIPO_DE_DADO.IDENTIFICADOR)) {
        casou = true;
        break;
      }
    }
    if (!casou) continue;

    achados.push({
      id: 'legado-' + (linha + 1),
      celulas: [cabecalhos.map(function (cabecalho, i) {
        return {
          cabecalho: cabecalho,
          valor: paraTexto_(tudo[linha][i], RECC_TIPO_DE_DADO.TEXTO),
          ehStatus: false
        };
      })],
      situacao: '',
      tom: 'neutro'
    });
  }

  return {
    tipo: 'legado',
    id: 'legado',
    nome: configurado.rotulo,
    icone: '',
    colunas: [{ titulo: 'Registro', colunas: [] }],
    cabecalhos: cabecalhos,
    casos: achados,
    // Um caso do legado NÃO abre no modal: ele não é um caso do sistema, é
    // uma linha de histórico. Prometer edição ali seria mentira.
    somenteLeitura: true,
    aviso: achados.length >= RECC_MAXIMO_DA_BUSCA
      ? 'Mostrando os ' + RECC_MAXIMO_DA_BUSCA + ' primeiros da base legada.'
      : ''
  };
}

function recadoDoLegado_(configurado, mensagem) {
  return {
    tipo: 'legado',
    id: 'legado',
    nome: configurado.rotulo,
    icone: '',
    colunas: [],
    cabecalhos: [],
    casos: [],
    somenteLeitura: true,
    aviso: mensagem
  };
}

// ============================================================================
// CONFIGURAÇÃO DA BASE LEGADA
// ============================================================================

/** O que a tela de Configurações mostra sobre a base antiga. */
function configuracaoDoLegado() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  return {
    planilhaId: String(valorDaConfiguracao_('LEGADO.PLANILHA_ID', '')),
    aba: String(valorDaConfiguracao_('LEGADO.ABA', '')),
    rotulo: String(valorDaConfiguracao_('LEGADO.ROTULO', 'Base legada'))
  };
}

/**
 * Aponta a base legada, conferindo NA HORA se dá para abri-la.
 *
 * Guardar um Id que não abre deixaria a busca com um recado de erro para
 * sempre, e ninguém saberia se o Id estava errado ou se a planilha tinha
 * sumido. Melhor recusar aqui, com o motivo.
 */
function salvarConfiguracaoDoLegado(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var id = String(dados.planilhaId || '').trim();
  var aba = String(dados.aba || '').trim();

  if (id) {
    // Aqui a falha DERRUBA, e é de propósito: guardar um Id que não abre
    // deixaria a busca com um recado de erro para sempre, sem ninguém saber
    // se o Id estava errado ou se a planilha sumiu depois.
    var planilha = abrirPlanilhaDeFora_(id);
    if (aba && !planilha.getSheetByName(aba)) {
      throw new Error('A planilha abriu, mas não tem uma aba chamada "' + aba +
        '". As abas dela são: ' + planilha.getSheets().map(function (uma) {
          return uma.getName();
        }).join(', ') + '.');
    }
  }

  gravarConfiguracao_('LEGADO.PLANILHA_ID', id);
  gravarConfiguracao_('LEGADO.ABA', aba);
  gravarConfiguracao_('LEGADO.ROTULO',
    String(dados.rotulo || '').trim() || 'Base legada');

  registrarAuditoria_('legado.configurar', 'CONFIG', '', id ? 'ligada' : 'desligada');
  return configuracaoDoLegado();
}


/* ==== Config.gs =========================================================== */

/**
 * ============================================================================
 * PGO — Config.gs · o que se ajusta sem programador
 * ============================================================================
 * As nove seções da tela de Configurações, e o gerador das abas ANALISE_*
 * — que é configuração também: a receita mora na aba ANALISES.
 *
 * O nome é "Config", e não "Configuracoes", por um motivo da plataforma: no
 * Apps Script os arquivos moram todos num projeto só, sem pasta, e o nome é
 * único INDEPENDENTE DA EXTENSÃO. Como existe uma tela Configuracoes.html,
 * um Configuracoes.gs não entra. É o achado 26.
 *
 * O QUE TEM AQUI DENTRO, nesta ordem:
 *
 *   1. AS NOVE SEÇÕES   (era Config.gs)
 *   2. AS ABAS ANALISE_* QUE O SISTEMA GERA   (era Analise.gs)
 *
 * Procure pelo banner com ##### para pular de uma seção à outra.
 * ============================================================================
 */

/* ############################################################################
   #
   #  SEÇÃO 1 de 2 · AS NOVE SEÇÕES
   #
   #  Era o arquivo Back-End/Config.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * ============================================================================
 * PGO — Config.gs · onde o sistema é ajustado sem programador
 *
 * O nome é "Config", e não "Configuracoes", por um motivo da plataforma: no
 * Apps Script os arquivos moram todos num projeto só, sem pasta, e o nome é
 * único INDEPENDENTE da extensão. Já existe um `Configuracoes.html` — a tela
 * —, então um `Configuracoes.gs` simplesmente não pode ser criado ali.
 *
 * No repositório eles ficam em pastas diferentes e a colisão não aparece; no
 * Apps Script, aparece na hora de colar. Um teste da suíte confere que nenhum
 * .gs tenha o mesmo nome de um .html.
 * ============================================================================
 * Esta é a tela mais importante do produto. Tudo o que as outras fazem sai
 * daqui: quais campos o formulário pergunta, quais listas ele oferece, quem
 * entra, o que cada nível pode ver, quais situações viram cartão, o nome e a
 * marca da operação.
 *
 * TRÊS NÍVEIS DE RISCO, e cada um com uma guarda diferente:
 *
 *   1. mexer em CONTEÚDO        renomear uma situação, criar um motivo novo,
 *      permissão "configurar"   cadastrar um usuário. Reversível.
 *
 *   2. mexer em REGRA           o que um nível de acesso pode, quem vê qual
 *      permissão "configurar"   campo. Reversível, mas afeta todo mundo.
 *
 *   3. mexer em ESTRUTURA       criar coluna na planilha, apagar canal.
 *      + SENHA DE ADMINISTRADOR Isso não tem desfazer.
 *
 * A senha não é burocracia: criar coluna escreve na planilha de produção, e
 * não existe "Ctrl+Z" ali.
 * ============================================================================
 */

/**
 * O panorama da tela de Configurações: quantos itens há em cada seção e o que
 * está pedindo atenção.
 *
 * Vem numa chamada só porque a tela abre mostrando as seis seções ao mesmo
 * tempo — seis idas ao servidor fariam a tela montar aos pedaços.
 */
function resumoDasConfiguracoes() {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var catalogo = lerRegistros_('CATALOGO');
  var laudo = conferirEstrutura_();

  function quantosDoTipo(tipo) {
    return catalogo.filter(function (item) {
      return normalizarParaComparar_(item.Tipo) === tipo;
    }).length;
  }

  return {
    podeMexerNaEstrutura: podeFazer_(quem.permissoes, RECC_ACOES.ESTRUTURA),
    senhaDefinida: existeSenhaDeAdministrador_(),
    identidade: lerIdentidadeVisual_(),
    /*
      Os títulos são CURTOS de propósito: o menu tem uma coluna só, e um
      título que quebra em duas linhas desalinha a contagem do lado direito.
      O que o título deixou de dizer, a descrição diz — ela aparece inteira
      assim que a seção é escolhida.
    */
    secoes: [
      { chave: 'campos', titulo: 'Campos',
        descricao: 'O que o cadastro pergunta, em cado canal',
        quantidade: lerRegistros_('CAMPOS').length },
      { chave: 'usuarios', titulo: 'Usuários',
        descricao: 'Quem entra no sistema',
        quantidade: lerRegistros_('USUARIOS').length },
      { chave: 'niveis', titulo: 'Níveis de acesso',
        descricao: 'O que cada um pode ver e fazer',
        quantidade: quantosDoTipo('nivelacesso') },
      { chave: 'catalogo', titulo: 'Listas',
        descricao: 'Situações, canais, motivos, ramos e cargos',
        quantidade: catalogo.length - quantosDoTipo('nivelacesso') },
      { chave: 'canais', titulo: 'Canais de trabalho',
        descricao: 'As bases e o que cada painel mostra',
        quantidade: lerRegistros_('CANAIS').length },
      { chave: 'identidade', titulo: 'Identidade',
        descricao: 'Nome, logo, cor e a senha de administrador',
        quantidade: 0 },
      { chave: 'paineis', titulo: 'Painéis',
        descricao: 'Os cards do Dashboard e dos painéis',
        quantidade: lerRegistros_('PAINEIS').filter(function (linha) {
          return normalizarParaComparar_(linha.Ativo) === 'sim';
        }).length },
      { chave: 'analises', titulo: 'Análises',
        descricao: 'As abas ANALISE_* que o sistema gera na planilha',
        quantidade: lerRegistros_('ANALISES').filter(function (linha) {
          return normalizarParaComparar_(linha.Ativo) === 'sim';
        }).length },
      { chave: 'estrutura', titulo: 'Estrutura',
        descricao: 'O laudo da planilha, a auditoria e a base antiga',
        quantidade: 0 }
    ],
    estrutura: {
      emOrdem: laudo.ok,
      abasComProblema: laudo.abas.filter(function (aba) {
        return !aba.existe || aba.faltando.length;
      }),
      colunasForaDoContrato: laudo.abas.reduce(function (soma, aba) {
        return soma + aba.aMais.length;
      }, 0)
    }
  };
}

// ============================================================================
// CAMPOS DO FORMULÁRIO
// ============================================================================

/** Todos os campos de um canal, inclusive os desligados — aqui se administra. */
function listarCamposDoCanal(idDoCanal) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var estrutura = estruturaDaAba_(canal.aba);

  return lerRegistros_('CAMPOS')
    .filter(function (campo) {
      return converterParaIdentificador_(campo.CanalId)
        === converterParaIdentificador_(canal.id);
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (campo) {
      var configuracao = lerConfiguracaoDoCampo_(campo);
      return {
        id: campo.__id,
        chave: String(campo.ChaveTecnica),
        cabecalho: String(campo.Cabecalho),
        rotulo: String(campo.Rotulo || campo.Cabecalho),
        descricao: String(campo.Descricao || ''),
        tipo: String(campo.TipoCampo || 'texto'),
        secao: String(campo.Secao || 'Geral'),
        mascara: String(campo.Mascara || ''),
        obrigatorio: normalizarParaComparar_(campo.Obrigatorio) === 'sim',
        ativo: normalizarParaComparar_(campo.Ativo) === 'sim',
        protegido: normalizarParaComparar_(campo.Protegido) === 'sim',
        ordem: Number(campo.Ordem) || 0,
        catalogo: String(configuracao.catalogo || ''),
        listaDe: String(configuracao.listaDe || ''),
        largura: Number(configuracao.largura) || 1,
        // Coluna que sumiu da planilha aparece marcada, em vez de o campo
        // simplesmente parar de funcionar sem ninguém entender por quê.
        colunaExiste: posicaoDaColuna_(estrutura, campo.Cabecalho) >= 0
      };
    });
}

/** As opções que a tela oferece ao configurar um campo. */
function opcoesDeConfiguracaoDeCampo() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  return {
    tipos: Object.keys(RECC_DO_CAMPO_PARA_O_DADO),
    tons: RECC_TONS,
    cadastros: ['usuarios', 'produtos', 'canais'],
    tiposDeCatalogo: tiposDeCatalogoExistentes_()
  };
}

function tiposDeCatalogoExistentes_() {
  var vistos = {};
  lerRegistros_('CATALOGO').forEach(function (item) {
    var tipo = String(item.Tipo || '').trim();
    if (tipo && tipo !== 'NIVEL_ACESSO') vistos[tipo] = true;
  });
  return Object.keys(vistos).sort();
}

/**
 * Altera um campo que já existe.
 *
 * Não mexe na planilha: mudar rótulo, seção, máscara ou obrigatoriedade é
 * mexer em como o campo APARECE, e não em onde ele mora. Por isso não pede
 * senha. Trocar o CABEÇALHO, sim, seria mexer na coluna — e é recusado.
 */
function salvarCampo(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var id = converterParaIdentificador_(dados.id);
  var atual = buscarRegistros_('CAMPOS', 'Id', id, 1)[0];
  if (!atual) throw new Error('Campo ' + id + ' não encontrado.');

  if (dados.cabecalho && String(dados.cabecalho) !== String(atual.Cabecalho)) {
    throw new Error('O cabeçalho de um campo não muda por aqui: ele é o nome ' +
      'da coluna na planilha. Renomeie a coluna na planilha e use a ' +
      'reconciliação de colunas.');
  }
  if (normalizarParaComparar_(atual.Protegido) === 'sim' && dados.ativo === false) {
    // Campo protegido pode ser escondido, mas nunca desligado do contrato.
    // A distinção existe porque a coluna continua sendo gravada pelo sistema.
  }

  var configuracao = lerConfiguracaoDoCampo_(atual);
  if (dados.catalogo !== undefined) {
    if (dados.catalogo) configuracao.catalogo = String(dados.catalogo);
    else delete configuracao.catalogo;
  }
  if (dados.listaDe !== undefined) {
    if (dados.listaDe) configuracao.listaDe = String(dados.listaDe);
    else delete configuracao.listaDe;
  }
  if (dados.largura !== undefined) {
    var largura = Number(dados.largura) || 1;
    if (largura > 1) configuracao.largura = largura;
    else delete configuracao.largura;
  }

  var tipo = String(dados.tipo || atual.TipoCampo);
  if (!RECC_DO_CAMPO_PARA_O_DADO[tipo]) {
    throw new Error('Tipo de campo desconhecido: "' + tipo + '". Os tipos são ' +
      Object.keys(RECC_DO_CAMPO_PARA_O_DADO).join(', ') + '.');
  }

  atualizarRegistro_('CAMPOS', id, {
    Rotulo: String(dados.rotulo || atual.Cabecalho),
    Descricao: String(dados.descricao === undefined ? atual.Descricao : dados.descricao),
    TipoCampo: tipo,
    Secao: String(dados.secao || 'Geral'),
    Mascara: String(dados.mascara === undefined ? atual.Mascara : dados.mascara),
    Obrigatorio: dados.obrigatorio === true,
    Ativo: dados.ativo === false ? 'NAO' : 'SIM',
    Configuracao: Object.keys(configuracao).length ? JSON.stringify(configuracao) : ''
  });

  esquecerEstruturaLida_();
  registrarAuditoria_('campo.editar', 'CAMPOS', id, String(atual.Cabecalho));
  return true;
}

/**
 * Cria um campo NOVO — e com ele uma coluna nova na planilha.
 *
 * É a ação mais cara da tela: escreve na base de produção e não tem desfazer.
 * Por isso exige senha de administrador, e não só a permissão de configurar.
 */
function criarCampo(idDoCanal, dados) {
  var quem = exigirPermissao_(RECC_ACOES.ESTRUTURA);
  exigirSenhaDeAdministrador_();

  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var rotulo = String(dados.rotulo || '').trim();
  if (!rotulo) throw new Error('Dê um nome ao campo.');

  var tipoDeCampo = String(dados.tipo || 'texto');
  var tipoDeDado = RECC_DO_CAMPO_PARA_O_DADO[tipoDeCampo];
  if (!tipoDeDado) {
    throw new Error('Tipo de campo desconhecido: "' + tipoDeCampo + '".');
  }

  // O cabeçalho da coluna é o rótulo. Um nome para as duas coisas evita a
  // pergunta "por que a planilha chama diferente da tela".
  var criada = adicionarColuna_(canal.aba, rotulo, tipoDeDado);

  var campo = buscarRegistros_('CAMPOS', 'Cabecalho', rotulo, 1)[0];
  if (campo) {
    atualizarRegistro_('CAMPOS', campo.__id, {
      CanalId: canal.id,
      Secao: String(dados.secao || 'Geral'),
      Descricao: String(dados.descricao || ''),
      Mascara: String(dados.mascara || ''),
      Obrigatorio: dados.obrigatorio === true,
      TipoCampo: tipoDeCampo
    });
  }

  esquecerEstruturaLida_();
  registrarAuditoria_('campo.criar', canal.aba, criada.coluna, rotulo);
  return { cabecalho: criada.cabecalho, coluna: criada.coluna, canal: canal.nome };
}

/**
 * Reordena os campos do formulário.
 *
 * Muda a ordem NA TELA, e nunca na planilha: a coluna fica onde está. Foi por
 * reordenar coluna que o sistema anterior corrompeu dado.
 */
function reordenarCampos(idDoCanal, idsNaOrdem) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var doCanal = {};
  listarCamposDoCanal(canal.id).forEach(function (campo) { doCanal[campo.id] = true; });

  var ordem = 0;
  (idsNaOrdem || []).forEach(function (idDoCampo) {
    var id = converterParaIdentificador_(idDoCampo);
    if (!doCanal[id]) {
      throw new Error('O campo ' + id + ' não é do canal ' + canal.nome + '.');
    }
    ordem++;
    atualizarRegistro_('CAMPOS', id, { Ordem: ordem });
  });

  registrarAuditoria_('campo.reordenar', 'CAMPOS', '', canal.nome);
  return true;
}

// ============================================================================
// LISTAS (a aba CATALOGO)
// ============================================================================

function listarCatalogo(tipo, idDoCanal) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var alvo = normalizarParaComparar_(tipo);
  var doCanal = converterParaIdentificador_(idDoCanal);

  return lerRegistros_('CATALOGO')
    .filter(function (item) {
      if (alvo && normalizarParaComparar_(item.Tipo) !== alvo) return false;
      if (!doCanal) return true;
      var canalDoItem = converterParaIdentificador_(item.CanalId);
      return !canalDoItem || canalDoItem === doCanal;
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (item) {
      return {
        id: item.__id,
        tipo: String(item.Tipo),
        canalId: converterParaIdentificador_(item.CanalId),
        codigo: String(item.Codigo || ''),
        nome: String(item.Nome),
        rotulo: String(item.Rotulo || item.Nome),
        cor: tomValido_(item.Cor),
        colunaDeCarimbo: String(item.ColunaDeCarimbo || '').trim(),
        ordem: Number(item.Ordem) || 0,
        ativo: normalizarParaComparar_(item.Ativo) === 'sim'
      };
    });
}

/**
 * Cria ou altera um item de lista.
 *
 * O NOME é o que fica gravado nos casos; o RÓTULO é o que aparece na tela.
 * Trocar o rótulo é seguro. Trocar o nome não renomeia o que já foi gravado —
 * e por isso o sistema avisa em vez de deixar acontecer calado.
 */
function salvarItemDoCatalogo(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var nome = String(dados.nome || '').trim();
  if (!nome) throw new Error('Dê um nome ao item.');

  var tipo = String(dados.tipo || '').trim().toUpperCase();
  if (!tipo) throw new Error('Diga de que lista o item faz parte.');

  var campos = {
    Tipo: tipo,
    CanalId: converterParaIdentificador_(dados.canalId),
    Codigo: converterParaIdentificador_(dados.codigo),
    Nome: nome,
    Rotulo: String(dados.rotulo || nome),
    Cor: tomValido_(dados.cor),
    Ordem: Number(dados.ordem) || 0,
    Ativo: dados.ativo === false ? 'NAO' : 'SIM'
  };

  // Só status carimba. Guardar a coluna num motivo ou num cargo criaria uma
  // configuração que não faz nada — e configuração que não faz nada é pior
  // que configuração faltando, porque alguém a preenche e espera efeito.
  if (tipo === 'STATUS') {
    campos.ColunaDeCarimbo = String(dados.colunaDeCarimbo || '').trim();
  }

  var id = converterParaIdentificador_(dados.id);
  if (id) {
    var atual = buscarRegistros_('CATALOGO', 'Id', id, 1)[0];
    if (!atual) throw new Error('Item ' + id + ' não encontrado.');

    if (normalizarParaComparar_(atual.Nome) !== normalizarParaComparar_(nome)) {
      var emUso = quantosCasosUsam_(atual);
      if (emUso > 0) {
        throw new Error('"' + atual.Nome + '" está gravado em ' + emUso +
          ' caso(s). Trocar o nome aqui NÃO renomeia o que já foi gravado — ' +
          'eles ficariam apontando para um item que não existe mais. ' +
          'Para mudar só o que aparece na tela, troque o rótulo.');
      }
    }
    atualizarRegistro_('CATALOGO', id, campos);
    registrarAuditoria_('catalogo.editar', 'CATALOGO', id, tipo);
    return id;
  }

  var criado = inserirRegistro_('CATALOGO', campos);
  registrarAuditoria_('catalogo.criar', 'CATALOGO', criado.__id, tipo);
  return criado.__id;
}

/** Em quantos casos este item de lista está gravado. */
function quantosCasosUsam_(item) {
  var procurado = normalizarParaComparar_(item.Nome);
  var doCanal = converterParaIdentificador_(item.CanalId);
  var quantos = 0;

  canaisVisiveis_().forEach(function (canal) {
    if (doCanal && converterParaIdentificador_(canal.id) !== doCanal) return;
    var estrutura;
    try {
      estrutura = estruturaDaAba_(canal.aba);
    } catch (erro) {
      return;
    }
    lerRegistros_(canal.aba, { incluirOcultos: true }).forEach(function (registro) {
      for (var i = 0; i < estrutura.cabecalhos.length; i++) {
        var cabecalho = estrutura.cabecalhos[i];
        if (!cabecalho || cabecalho.charAt(0) === '_') continue;
        if (normalizarParaComparar_(registro[cabecalho]) === procurado) {
          quantos++;
          return;
        }
      }
    });
  });
  return quantos;
}

// ============================================================================
// NÍVEIS DE ACESSO
// ============================================================================

function listarNiveisDeAcesso() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var quantosUsam = {};
  lerRegistros_('USUARIOS').forEach(function (usuario) {
    var nivel = converterParaIdentificador_(usuario.NivelAcessoId);
    quantosUsam[nivel] = (quantosUsam[nivel] || 0) + 1;
  });

  return lerRegistros_('CATALOGO')
    .filter(function (item) {
      return normalizarParaComparar_(item.Tipo) === 'nivelacesso';
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (item) {
      var permissoes = lerPermissoesDoNivel_(item);
      return {
        id: item.__id,
        nome: String(item.Nome),
        ativo: normalizarParaComparar_(item.Ativo) === 'sim',
        escopo: permissoes.escopo,
        canais: permissoes.canais,
        telas: permissoes.telas,
        acoes: permissoes.acoes,
        campos: permissoes.campos,
        defeito: permissoes.defeito,
        pessoas: quantosUsam[item.__id] || 0
      };
    });
}

/**
 * Altera o que um nível pode.
 *
 * Duas travas, e as duas existem para ninguém se trancar do lado de fora:
 * o último nível que abre Configurações não pode perder essa tela, e o
 * último que mexe em estrutura não pode perder essa ação.
 */
function salvarNivelDeAcesso(dados) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var id = converterParaIdentificador_(dados.id);
  var atual = buscarRegistros_('CATALOGO', 'Id', id, 1)[0];
  if (!atual) throw new Error('Nível ' + id + ' não encontrado.');

  var telas = Array.isArray(dados.telas) ? dados.telas : [];
  var acoes = Array.isArray(dados.acoes) ? dados.acoes : [];

  acoes.forEach(function (acao) {
    var conhecida = false;
    Object.keys(RECC_ACOES).forEach(function (chave) {
      if (RECC_ACOES[chave] === acao) conhecida = true;
    });
    if (!conhecida) throw new Error('Ação desconhecida: "' + acao + '".');
  });
  if (!RECC_ESCOPOS[dados.escopo]) {
    throw new Error('Escopo desconhecido: "' + dados.escopo + '". Os escopos ' +
      'são ' + Object.keys(RECC_ESCOPOS).join(', ') + '.');
  }

  // Os canais que este nível enxerga. Lista vazia é TODOS, de propósito —
  // ver lerPermissoesDoNivel_. Cada Id é conferido contra os canais que
  // existem: guardar o Id de um canal apagado deixaria o nível enxergando
  // nada, sem nenhuma mensagem dizendo por quê.
  var canaisQueExistem = {};
  canaisVisiveis_().forEach(function (canal) {
    canaisQueExistem[converterParaIdentificador_(canal.id)] = canal.nome;
  });
  var canais = (Array.isArray(dados.canais) ? dados.canais : [])
    .map(function (umId) { return converterParaIdentificador_(umId); })
    .filter(function (umId) { return umId !== ''; });
  canais.forEach(function (umId) {
    if (!canaisQueExistem[umId]) {
      throw new Error('O canal ' + umId + ' não existe mais. Escolha outro, '
        + 'ou deixe nenhum marcado — nenhum marcado quer dizer todos.');
    }
  });

  exigirQueAlguemContinueEntrando_(id, telas, acoes);

  atualizarRegistro_('CATALOGO', id, {
    Nome: String(dados.nome || atual.Nome),
    Ativo: dados.ativo === false ? 'NAO' : 'SIM',
    Configuracao: JSON.stringify({
      escopo: dados.escopo,
      canais: canais,
      telas: telas,
      acoes: acoes,
      campos: dados.campos && typeof dados.campos === 'object' ? dados.campos : {},
      componentes: {}
    })
  });

  registrarAuditoria_('nivel.editar', 'CATALOGO', id, String(atual.Nome));
  return true;
}

/**
 * Impede a mudança que deixaria a instalação sem quem a administre.
 *
 * Não é zelo excessivo: tirar "configurações" do único nível que a tem
 * tranca todo mundo do lado de fora, e a única saída seria editar a planilha
 * na mão — coisa que nem todo mundo sabe fazer sob pressão.
 */
function exigirQueAlguemContinueEntrando_(idAlterado, telas, acoes) {
  var sobraramTelas = 0;
  var sobraramEstruturas = 0;

  listarNiveisDeAcesso().forEach(function (nivel) {
    var suasTelas = nivel.telas;
    var suasAcoes = nivel.acoes;
    var continuaAtivo = nivel.ativo;

    if (nivel.id === idAlterado) {
      suasTelas = telas;
      suasAcoes = acoes;
      continuaAtivo = true;
    }
    if (!continuaAtivo || !nivel.pessoas) return;

    if (suasTelas.indexOf('configuracoes') >= 0) sobraramTelas++;
    if (suasAcoes.indexOf(RECC_ACOES.ESTRUTURA) >= 0) sobraramEstruturas++;
  });

  if (!sobraramTelas) {
    throw new Error('Esta mudança deixaria NINGUÉM com acesso a Configurações. ' +
      'Dê essa tela a outro nível que tenha gente antes de tirá-la deste.');
  }
  if (!sobraramEstruturas) {
    throw new Error('Esta mudança deixaria ninguém podendo mexer na estrutura. ' +
      'Sem isso não é possível criar campo nem canal.');
  }
}

/**
 * O que a tela precisa saber para montar um nível de acesso: quais telas
 * existem, quais ações e quais escopos.
 *
 * A lista de telas NÃO é escrita aqui — vem de RECC_TELAS_DO_SISTEMA, a mesma
 * que o menu percorre. Se um dia nascer uma tela nova, ela aparece nos dois
 * lugares no mesmo instante.
 */
function opcoesDeNivelDeAcesso() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var oQueCadaAcaoFaz = {
    criar: 'Cadastrar casos novos',
    editar: 'Alterar casos já cadastrados',
    ocultar: 'Tirar um caso da tela (a linha permanece na planilha)',
    exportar: 'Baixar o que está vendo',
    configurar: 'Abrir Configurações e mexer em conteúdo e regra',
    estrutura: 'Criar coluna e canal — pede senha de administrador'
  };

  var oQueCadaEscopoAlcanca = {
    PROPRIOS: 'Só os casos em que a pessoa é a responsável',
    EQUIPE: 'Os casos de quem atende o mesmo canal que ela',
    CANAL: 'Todos os casos dos canais que ela enxerga',
    TODOS: 'Todos os casos, de todas os canais'
  };

  return {
    telas: RECC_TELAS_DO_SISTEMA.map(function (item) {
      return { chave: item.tela, titulo: item.titulo };
    }),
    acoes: Object.keys(RECC_ACOES).map(function (chave) {
      var acao = RECC_ACOES[chave];
      return { chave: acao, descricao: oQueCadaAcaoFaz[acao] || '' };
    }),
    escopos: Object.keys(RECC_ESCOPOS).map(function (chave) {
      return { chave: chave, descricao: oQueCadaEscopoAlcanca[chave] || '' };
    }),
    // Quais canais existem, para o nível escolher os dele. Nenhum marcado
    // quer dizer TODOS — é o caso de quem administra.
    canais: canaisVisiveis_().map(function (canal) {
      return { id: canal.id, nome: canal.nome, descricao: canal.descricao || '' };
    })
  };
}

// ============================================================================
// CANAIS DE TRABALHO
// ============================================================================

/**
 * Os canais, inclusive as desligadas — aqui se administra.
 *
 * Vem com as colunas da base junto porque quase toda escolha desta seção é
 * "qual coluna guarda isto": escrever o nome da coluna à mão é como navegar
 * sem Log Pose — funciona até o dia em que você erra uma letra e o painel
 * fica em branco sem dizer por quê.
 */
function listarCanaisConfiguraveis() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  return lerRegistros_('CANAIS')
    .sort(function (uma, outra) {
      return (Number(uma.Ordem) || 0) - (Number(outra.Ordem) || 0);
    })
    .map(function (canal) {
      var colunas = [];
      var situacoes = [];
      try {
        colunas = estruturaDaAba_(String(canal.Aba)).cabecalhos
          .filter(function (cabecalho) {
            return cabecalho && cabecalho.charAt(0) !== '_';
          });
        situacoes = listarCatalogo('STATUS', canal.__id).map(function (item) {
          return item.nome;
        });
      } catch (erro) {
        // Aba que não existe não derruba a tela: o canal aparece marcada, e o
        // administrador vê qual é o problema em vez de uma página branca.
        colunas = [];
      }

      return {
        id: canal.__id,
        nome: String(canal.Nome),
        descricao: String(canal.Descricao || ''),
        aba: String(canal.Aba),
        abaExiste: colunas.length > 0,
        colunaDaData: String(canal.ColunaDaData || ''),
        colunaDaHora: String(canal.ColunaDaHora || ''),
        colunaDoStatus: String(canal.ColunaDoStatus || ''),
        colunasDaFila: String(canal.ColunasDaFila || ''),
        colunasDaBusca: String(canal.ColunasDaBusca || ''),
        metaMensalPorPessoa: Number(canal.MetaMensalPorPessoa) || 0,
        colunaDaFinalizacao: String(canal.ColunaDaFinalizacao || ''),
        colunaDaAreaResponsavel: String(canal.ColunaDaAreaResponsavel || ''),
        icone: String(canal.Icone || ''),
        ordem: Number(canal.Ordem) || 0,
        ativo: normalizarParaComparar_(canal.Ativo) === 'sim',
        colunasDaBase: colunas,
        situacoes: situacoes
      };
    });
}

/**
 * Altera um canal que já existe.
 *
 * Muda o que o canal MOSTRA — nome, ícone, quais colunas viram fila, quais
 * situações viram cartão. Não muda onde ela mora: a aba é escolhida quando a
 * canal nasce, e trocá-la apontaria todos os casos já gravados para o lugar
 * errado. Criar canal nova é estrutura, e ainda não passa por aqui.
 */
function salvarCanal(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var id = converterParaIdentificador_(dados.id);
  var atual = buscarRegistros_('CANAIS', 'Id', id, 1)[0];
  if (!atual) throw new Error('Canal ' + id + ' não encontrada.');

  if (dados.aba && String(dados.aba) !== String(atual.Aba)) {
    throw new Error('A aba de um canal não muda por aqui: os casos já ' +
      'gravados moram nela. Crie outro canal apontando para a aba nova.');
  }

  var nome = String(dados.nome || '').trim();
  if (!nome) throw new Error('Dê um nome ao canal.');

  var estrutura = estruturaDaAba_(String(atual.Aba));
  ['colunaDaData', 'colunaDaHora', 'colunaDoStatus', 'colunaDaFinalizacao',
    'colunaDaAreaResponsavel'].forEach(function (chave) {
    conferirQueAColunaExiste_(estrutura, dados[chave], atual.Aba);
  });
  // As colunas da fila podem vir agrupadas — "Título: col, col; Título: col".
  // Conferimos coluna por coluna, ignorando os títulos: título é texto livre,
  // e é a coluna que precisa existir.
  String(dados.colunasDaBusca || '').split(',').forEach(function (pedaco) {
    conferirQueAColunaExiste_(estrutura, pedaco, atual.Aba);
  });
  String(dados.colunasDaFila || '').split(';').forEach(function (grupo) {
    var lista = grupo.indexOf(':') > 0
      ? grupo.substring(grupo.indexOf(':') + 1) : grupo;
    lista.split(',').forEach(function (pedaco) {
      conferirQueAColunaExiste_(estrutura, pedaco, atual.Aba);
    });
  });

  // Desligar a último canal ativa deixaria o Dashboard sem nada para mostrar,
  // e o cadastro sem formulário — o sistema inteiro pareceria quebrado.
  if (dados.ativo === false) {
    var outrasAtivas = lerRegistros_('CANAIS').filter(function (canal) {
      return converterParaIdentificador_(canal.Id) !== id
        && normalizarParaComparar_(canal.Ativo) === 'sim';
    });
    if (!outrasAtivas.length) {
      throw new Error('Esta é a último canal ativa. Desligá-la deixaria o ' +
        'Dashboard e o cadastro sem nenhuma base para trabalhar.');
    }
  }

  atualizarRegistro_('CANAIS', id, {
    Nome: nome,
    Descricao: String(dados.descricao === undefined ? atual.Descricao : dados.descricao),
    ColunaDaData: String(dados.colunaDaData || ''),
    ColunaDaHora: String(dados.colunaDaHora || ''),
    ColunaDoStatus: String(dados.colunaDoStatus || ''),
    ColunasDaFila: String(dados.colunasDaFila || ''),
    ColunasDaBusca: String(dados.colunasDaBusca || ''),
    MetaMensalPorPessoa: Number(dados.metaMensalPorPessoa) || 0,
    ColunaDaFinalizacao: String(dados.colunaDaFinalizacao || ''),
    ColunaDaAreaResponsavel: String(dados.colunaDaAreaResponsavel || ''),
    Icone: String(dados.icone || atual.Icone || ''),
    Ordem: Number(dados.ordem) || Number(atual.Ordem) || 0,
    Ativo: dados.ativo === false ? 'NAO' : 'SIM'
  });

  esquecerEstruturaLida_();
  registrarAuditoria_('canal.editar', 'CANAIS', id, nome);
  return true;
}

/**
 * Recusa o nome de uma coluna que não existe na base do canal.
 *
 * Sem esta conferência o erro só apareceria no Dashboard, dias depois, como
 * uma coluna em branco — e ninguém ligaria a coisa à letra trocada aqui.
 */
function conferirQueAColunaExiste_(estrutura, nomeDaColuna, nomeDaAba) {
  var nome = String(nomeDaColuna || '').trim();
  if (!nome) return;
  if (posicaoDaColuna_(estrutura, nome) >= 0) return;

  throw new Error('A coluna "' + nome + '" não existe na aba ' + nomeDaAba +
    '. As colunas dela são: ' + estrutura.cabecalhos.filter(function (cabecalho) {
      return cabecalho && cabecalho.charAt(0) !== '_';
    }).join(', ') + '.');
}

// ============================================================================
// CARTÕES DOS PAINÉIS
// ============================================================================

/** Quantos cartões uma operação aguenta antes de virar parede de números. */
const RECC_MAXIMO_DE_CARTOES = 12;

/**
 * Os cartões de uma tela, para um canal, e as opções que a tela oferece.
 *
 * Vem tudo junto porque a tela abre mostrando as duas coisas: a lista de
 * cartões e o que cada um pode contar.
 */
function listarCardsDoPainel(tela, idDoCanal) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var alvo = normalizarParaComparar_(tela) || 'dashboard';

  var oQueContar = [
    { chave: 'total', rotulo: 'Total de casos', filtro: '' }
  ];
  situacoesDoCanal_(canal).forEach(function (situacao) {
    // O cartão aponta para o que está GRAVADO no caso, e mostra o rótulo.
    oQueContar.push({
      chave: 'situacao', rotulo: situacao.nome, filtro: situacao.gravadoComo
    });
  });
  if (canal.colunaDaFinalizacao && canal.colunaDaAreaResponsavel) {
    oQueContar.push({
      chave: 'naCelula', rotulo: 'Finalizados na célula', filtro: ''
    });
  }

  var cartoes = lerRegistros_('PAINEIS')
    .filter(function (linha) {
      if (normalizarParaComparar_(linha.Tela) !== alvo) return false;
      if (normalizarParaComparar_(linha.TipoWidget) !== 'cartao') return false;
      return converterParaIdentificador_(linha.CanalId)
        === converterParaIdentificador_(canal.id);
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (linha) {
      return {
        id: linha.__id,
        titulo: String(linha.Titulo || ''),
        dimensao: dimensaoDoCartao_(linha.CampoDimensao) || 'total',
        filtro: String(linha.Filtro || ''),
        cor: tomValido_(linha.Cor),
        ordem: Number(linha.Ordem) || 0,
        mostrar: normalizarParaComparar_(linha.Ativo) === 'sim'
      };
    });

  return {
    tela: alvo,
    canal: { id: canal.id, nome: canal.nome, icone: canal.icone,
      descricao: canal.descricao },
    maximo: RECC_MAXIMO_DE_CARTOES,
    tons: RECC_TONS,
    oQueContar: oQueContar,
    cartoes: cartoes
  };
}

/**
 * Grava a lista inteira de cartões de uma vez.
 *
 * A tela edita todos juntos e aperta Salvar uma vez só — então o servidor
 * recebe a lista inteira e a torna verdade. Gravar cartão por cartão deixaria
 * a tela e a planilha em estados diferentes se a conexão caísse no meio.
 *
 * Remover um cartão NÃO toca em caso nenhum: o cartão é uma forma de contar,
 * e apagar a conta não apaga o que foi contado.
 */
function salvarCardsDoPainel(tela, idDoCanal, cartoes) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var alvo = normalizarParaComparar_(tela) || 'dashboard';
  var lista = Array.isArray(cartoes) ? cartoes : [];

  if (lista.length > RECC_MAXIMO_DE_CARTOES) {
    throw new Error('São no máximo ' + RECC_MAXIMO_DE_CARTOES + ' cartões por ' +
      'operação, e você mandou ' + lista.length + '. Acima disso a tela vira ' +
      'uma parede de números pequenos, que ninguém lê.');
  }

  var situacoes = situacoesDoCanal_(canal).map(function (s) {
    return s.gravadoComo;
  });

  lista.forEach(function (cartao) {
    if (!String(cartao.titulo || '').trim()) {
      throw new Error('Todo cartão precisa de um nome — é o que a pessoa lê ' +
        'em cima do número.');
    }
    cartao.dimensao = dimensaoDoCartao_(cartao.dimensao);
    if (!cartao.dimensao) {
      throw new Error('Não sei contar isso. As contagens são: total, ' +
        'situacao e naCelula.');
    }
    if (cartao.dimensao === 'situacao') {
      var existe = situacoes.some(function (nome) {
        return normalizarParaComparar_(nome) === normalizarParaComparar_(cartao.filtro);
      });
      if (!existe) {
        throw new Error('A situação "' + cartao.filtro + '" não existe no canal ' +
          canal.nome + '. As situações dela são: ' + situacoes.join(', ') + '.');
      }
    }
  });

  // O que estava lá antes, para saber o que sobrou de fora e desligar.
  var jaGravados = lerRegistros_('PAINEIS').filter(function (linha) {
    if (normalizarParaComparar_(linha.Tela) !== alvo) return false;
    if (normalizarParaComparar_(linha.TipoWidget) !== 'cartao') return false;
    return converterParaIdentificador_(linha.CanalId)
      === converterParaIdentificador_(canal.id);
  });
  var continuam = {};

  lista.forEach(function (cartao, posicao) {
    var campos = {
      Tela: alvo,
      CanalId: canal.id,
      Titulo: String(cartao.titulo).trim(),
      TipoWidget: 'cartao',
      CampoDimensao: cartao.dimensao,
      CampoMedida: '',
      Agregacao: 'contagem',
      Limite: 0,
      Filtro: cartao.dimensao === 'situacao' ? String(cartao.filtro || '') : '',
      Ordem: posicao + 1,
      Largura: 1,
      Cor: tomValido_(cartao.cor),
      VisivelPara: String(cartao.visivelPara || ''),
      Ativo: cartao.mostrar === false ? 'NAO' : 'SIM'
    };

    var id = converterParaIdentificador_(cartao.id);
    if (id && buscarRegistros_('PAINEIS', 'Id', id, 1)[0]) {
      atualizarRegistro_('PAINEIS', id, campos);
      continuam[id] = true;
      return;
    }
    continuam[inserirRegistro_('PAINEIS', campos).__id] = true;
  });

  // Cartão que a tela não mandou de volta foi removido lá. Ele é DESLIGADO,
  // não apagado: a linha continua na planilha, e nenhum caso é tocado — um
  // cartão é uma forma de contar, e apagar a conta não apaga o que foi
  // contado. Em PAINEIS quem desliga é a coluna Ativo, porque a aba não tem
  // exclusão lógica (ela não é base operacional).
  jaGravados.forEach(function (linha) {
    if (!continuam[linha.__id]) {
      atualizarRegistro_('PAINEIS', linha.__id, { Ativo: 'NAO', Ordem: 0 });
    }
  });

  registrarAuditoria_('painel.cartoes', 'PAINEIS', '',
    canal.nome + ' · ' + lista.length + ' cartões');
  return true;
}

// ============================================================================
// IDENTIDADE E SEGURANÇA
// ============================================================================

/** Nome, subtítulo, operação, logo, cor e o rodapé do menu. */
function salvarIdentidade(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var mudancas = {
    'IDENTIDADE.NOME': String(dados.nome || '').trim(),
    'IDENTIDADE.NOME_LONGO': String(dados.nomeLongo || '').trim(),
    'IDENTIDADE.OPERACAO': String(dados.operacao || '').trim(),
    'IDENTIDADE.COR_PRIMARIA': String(dados.corPrimaria || '').trim(),
    'IDENTIDADE.PLATAFORMA': String(dados.plataforma || '').trim(),
    'IDENTIDADE.FABRICANTE': String(dados.fabricante || '').trim(),
    'IDENTIDADE.FRASE': String(dados.frase || '').trim()
  };

  if (!mudancas['IDENTIDADE.NOME']) {
    throw new Error('O sistema precisa de um nome — ele aparece na barra ' +
      'superior e no título da janela.');
  }
  if (mudancas['IDENTIDADE.COR_PRIMARIA']
    && !/^#[0-9A-Fa-f]{6}$/.test(mudancas['IDENTIDADE.COR_PRIMARIA'])) {
    throw new Error('A cor precisa estar no formato #RRGGBB, como #0B77CE.');
  }

  Object.keys(mudancas).forEach(function (chave) {
    gravarConfiguracao_(chave, mudancas[chave]);
  });

  registrarAuditoria_('identidade.editar', 'CONFIG', '', mudancas['IDENTIDADE.NOME']);
  return lerIdentidadeVisual_();
}

/** Grava uma chave da aba CONFIG, criando a linha se ela não existir. */
function gravarConfiguracao_(chave, valor) {
  var alvo = normalizarParaComparar_(chave);
  var linhas = lerRegistros_('CONFIG');

  for (var i = 0; i < linhas.length; i++) {
    if (normalizarParaComparar_(linhas[i].Chave) === alvo) {
      atualizarRegistro_('CONFIG', linhas[i].__id, {
        Valor: valor,
        AtualizadoPor: (usuarioAtual_().usuario || {}).Id || '',
        Data: new Date()
      });
      return linhas[i].__id;
    }
  }
  return inserirRegistro_('CONFIG', {
    Chave: chave,
    Valor: valor,
    Descricao: '',
    AtualizadoPor: (usuarioAtual_().usuario || {}).Id || '',
    Data: new Date()
  }).__id;
}

/** Define ou troca a senha de administrador. Chamada pelo navegador. */
function definirSenhaDeAdministrador(senhaNova, senhaAtual) {
  exigirPermissao_(RECC_ACOES.ESTRUTURA);
  definirSenhaDeAdministrador_(senhaNova, senhaAtual);
  registrarAuditoria_('seguranca.senha', 'CONFIG', '', '');
  return true;
}

/** Libera a sessão para as ações sem volta. Chamada pelo navegador. */
function liberarComSenha(senha) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  return conferirSenhaDeAdministrador_(senha);
}

// ============================================================================
// ESTRUTURA DA PLANILHA
// ============================================================================

/**
 * O laudo da estrutura, pronto para a tela.
 *
 * Só lê. Coluna que sumiu e coluna que apareceu são mostradas lado a lado
 * para o administrador decidir — o sistema não adivinha que uma virou a
 * outra. Adivinhar erraria calado, e o dado iria para a coluna errada.
 */
function conferirEstruturaDaPlanilha() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var laudo = conferirEstrutura_();

  return {
    ok: laudo.ok,
    abas: laudo.abas.map(function (aba) {
      return {
        aba: aba.aba,
        existe: aba.existe,
        linhas: aba.linhas,
        faltando: aba.faltando,
        aMais: aba.aMais
      };
    })
  };
}

/** As últimas ações registradas, da mais recente para a mais antiga. */
function listarAuditoria(quantas) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var limite = Number(quantas) || 50;

  var nomes = {};
  lerRegistros_('USUARIOS').forEach(function (usuario) {
    nomes[usuario.__id] = String(usuario.Nome);
  });

  return lerRegistros_('AUDITORIA', { ultimas: limite })
    .reverse()
    .map(function (linha) {
      return {
        dataHora: linha.DataHora
          ? Utilities.formatDate(new Date(linha.DataHora), RECC_FUSO_HORARIO,
            'dd/MM/yyyy HH:mm')
          : '',
        quem: nomes[converterParaIdentificador_(linha.UsuarioId)] || 'Sem dados',
        acao: String(linha.Acao || ''),
        entidade: String(linha.Entidade || ''),
        registro: String(linha.RegistroId || ''),
        detalhe: String(linha.Detalhe || '')
      };
    });
}

/* ############################################################################
   #
   #  SEÇÃO 2 de 2 · AS ABAS ANALISE_* QUE O SISTEMA GERA
   #
   #  Era o arquivo Back-End/Analise.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * RECC — Analise.gs · as abas ANALISE_* que o sistema gera
 * ============================================================================
 * O pedido: *"permitir criar uma aba exclusiva que irá criar uma aba no
 * planilhas para análise de dados."*
 *
 * O administrador monta uma RECEITA — canal, colunas, filtros, período — e o
 * sistema escreve o resultado numa aba nova, chamada `ANALISE_<Nome>`, pronta
 * para tabela dinâmica ou para o Power BI apontar.
 *
 * ---------------------------------------------------------------------------
 * TRÊS DECISÕES QUE VALEM ESTAR ESCRITAS
 * ---------------------------------------------------------------------------
 *
 * 1. É UM RETRATO, E NÃO UMA FÓRMULA. A aba recebe VALORES gravados de uma
 *    vez. Poderia ser uma aba de `=FILTER(...)`, e seria "sempre atualizada" —
 *    mas uma fórmula que varre 30 mil linhas recalcula a cada abertura da
 *    planilha, e com três abas dessas a planilha inteira fica lenta para todo
 *    mundo, o dia todo. Retrato é estável: pesa uma vez, quando alguém pede.
 *
 * 2. SÓ ESCREVE EM ABA COM O PREFIXO `ANALISE_`. É a trava mais importante
 *    deste arquivo. Uma análise chamada "BASE_RET" apagaria a base de
 *    produção — e nenhuma outra proteção do sistema pegaria isso, porque
 *    apagar seria exatamente o que o código se propôs a fazer.
 *
 * 3. REGERAR PEDE SENHA; CRIAR PELA PRIMEIRA VEZ, NÃO. Criar uma aba nova não
 *    destrói nada. Regerar apaga o retrato anterior — e quem tinha uma tabela
 *    dinâmica apontada para ele vê os números mudarem embaixo dela.
 *
 * ---------------------------------------------------------------------------
 * A ABA GERADA NÃO ESTÁ NO CONTRATO
 * ---------------------------------------------------------------------------
 * `conferirEstrutura_` não reclama dela, e o instalador não a cria. É saída,
 * não é base: pode ser apagada à mão a qualquer momento, e a próxima geração
 * a refaz. A RECEITA é que está no contrato, na aba `ANALISES`.
 * ============================================================================
 */

/** O prefixo obrigatório. Nenhuma aba sem ele é escrita por este arquivo. */
var RECC_PREFIXO_DA_ANALISE = 'ANALISE_';

/**
 * Teto de linhas por aba gerada.
 *
 * Não é medo de dado: é o teto de 10 milhões de células da planilha. Uma
 * análise de 50 mil linhas por 39 colunas são 1,95 milhão de células — um
 * quinto do orçamento inteiro numa aba só, que é saída e não base.
 */
var RECC_MAXIMO_DA_ANALISE = 50000;

// ============================================================================
// A RECEITA
// ============================================================================

/**
 * Traduz a linha da aba ANALISES para o formato que a tela usa.
 *
 * Vem junto o estado da aba GERADA — existe? quantas linhas? de quando? —
 * porque é isso que a tela precisa mostrar, e é o que separa "a análise está
 * configurada" de "a análise está pronta para usar".
 */
function analiseDaLinha_(linha, canais) {
  var canal = canais.filter(function (uma) {
    return String(uma.id) === String(linha.CanalId);
  })[0];

  var nomeDaAba = nomeDaAbaDeAnalise_(linha.Nome);
  var aba = nomeDaAba ? planilhaAtiva_().getSheetByName(nomeDaAba) : null;

  return {
    id: linha.__id,
    nome: String(linha.Nome || ''),
    descricao: String(linha.Descricao || ''),
    canalId: String(linha.CanalId || ''),
    canalNome: canal ? canal.nome : '(canal desligada)',
    colunas: separarPorVirgula_(linha.Colunas),
    filtros: lerFiltrosEscritos_(linha.Filtros),
    dias: Number(linha.Dias) || 0,
    ordem: Number(linha.Ordem) || 0,
    ativo: normalizarParaComparar_(linha.Ativo) === 'sim',
    aba: nomeDaAba,
    abaExiste: !!aba,
    geradaEm: linha.GeradaEm
      ? Utilities.formatDate(new Date(linha.GeradaEm), RECC_FUSO_HORARIO,
        'dd/MM/yyyy HH:mm')
      : '',
    linhasGeradas: Number(linha.Linhas) || 0
  };
}

/** O nome da aba de uma análise. Vazio se o nome não serve. */
function nomeDaAbaDeAnalise_(nome) {
  var limpo = String(nome || '').trim();
  if (!limpo) return '';
  return RECC_PREFIXO_DA_ANALISE + limpo;
}

/** 'a, b , c' → ['a', 'b', 'c']. Pedaço vazio some. */
function separarPorVirgula_(texto) {
  return String(texto || '')
    .split(',')
    .map(function (pedaco) { return pedaco.trim(); })
    .filter(function (pedaco) { return pedaco.length > 0; });
}

/**
 * 'Status=Pendente; Canal=Chat' → [{ coluna: 'Status', valor: 'Pendente' }, …]
 *
 * Pedaço sem '=' é ignorado em silêncio, e é o único silêncio deste arquivo:
 * quem grava o filtro é a tela, com seletores — o texto solto só existe para
 * quem editar a aba ANALISES na mão, e aí meio filtro é melhor que nenhum.
 */
function lerFiltrosEscritos_(texto) {
  return String(texto || '')
    .split(';')
    .map(function (pedaco) {
      var corte = pedaco.indexOf('=');
      if (corte < 0) return null;
      return {
        coluna: pedaco.substring(0, corte).trim(),
        valor: pedaco.substring(corte + 1).trim()
      };
    })
    .filter(function (filtro) { return filtro && filtro.coluna; });
}

/** O caminho de volta: a lista de filtros vira o texto que a aba guarda. */
function escreverFiltros_(filtros) {
  return (filtros || [])
    .filter(function (filtro) {
      return filtro && String(filtro.coluna || '').trim();
    })
    .map(function (filtro) {
      return String(filtro.coluna).trim() + '=' + String(filtro.valor || '').trim();
    })
    .join(';');
}

// ============================================================================
// O QUE A TELA CHAMA
// ============================================================================

/** Todas as análises montadas, com o estado da aba de cada uma. */
function listarAnalises() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var canais = canaisVisiveis_();
  return lerRegistros_('ANALISES')
    .map(function (linha) { return analiseDaLinha_(linha, canais); })
    .sort(function (uma, outra) { return uma.ordem - outra.ordem; });
}

/**
 * O que a tela oferece para montar uma análise: os canais, e de cada uma as
 * colunas e os filtros possíveis.
 *
 * Sai da estrutura da planilha, e não de uma lista escrita aqui: coluna nova
 * na base aparece como opção sozinha, no dia seguinte.
 */
function opcoesDeAnalise() {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);

  return {
    maximo: RECC_MAXIMO_DA_ANALISE,
    prefixo: RECC_PREFIXO_DA_ANALISE,
    canais: canaisQueEuVejo_(quem).map(function (canal) {
      var estrutura = estruturaDaAba_(canal.aba);
      return {
        id: canal.id,
        nome: canal.nome,
        aba: canal.aba,
        temColunaDeData: !!canal.colunaDaData,
        colunaDaData: canal.colunaDaData || '',
        // As de controle ficam de fora da escolha: são do sistema, e numa
        // tabela dinâmica só atrapalham. A geração acrescenta o que precisa.
        colunas: estrutura.cabecalhos.filter(function (cabecalho) {
          return String(cabecalho).charAt(0) !== '_';
        }),
        filtros: filtrosPossiveisDaAnalise_(canal)
      };
    })
  };
}

/**
 * Os campos do canal que dão para usar como filtro: os que já são lista.
 *
 * Não é `filtrosDoCanal_`, do Dashboard, por um motivo só: lá o teto é QUATRO,
 * porque cinco caixas de seleção em cima da fila viram uma parede. Aqui não há
 * parede — escolhe-se um filtro por vez, num formulário —, e cortar em quatro
 * deixaria de fora justamente o campo pelo qual alguém quer recortar.
 */
function filtrosPossiveisDaAnalise_(canal) {
  var achados = [];
  camposAtivosDoCanal_(canal.id).forEach(function (campo) {
    // Sem quem: aqui só interessam os SELETORES e as opções deles, para
    // montar um filtro. Valor padrão e trava por cargo são coisas do
    // formulário de cadastro, e não de uma receita de análise.
    var descricao = campoParaATela_(campo, canal.id, RECC_VISIBILIDADE.EDICAO, null);
    if (descricao.tipo !== 'seletor' || !descricao.opcoes.length) return;
    achados.push({
      cabecalho: descricao.cabecalho,
      rotulo: descricao.rotulo,
      opcoes: descricao.opcoes
    });
  });
  return achados;
}

/**
 * Cria ou altera uma receita de análise. Não gera nada — quem gera é
 * `gerarAnalise`.
 *
 * Salvar e gerar são separados de propósito: montar a receita é ajuste, e
 * ajuste não pode custar trinta segundos de espera a cada campo mexido.
 */
function salvarAnalise(dados) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var nome = String(dados.nome || '').trim();
  conferirNomeDaAnalise_(nome);

  var canal = canalQueEuPossoVer_(dados.canalId, quem);
  var estrutura = estruturaDaAba_(canal.aba);

  var colunas = separarPorVirgula_(dados.colunas);
  colunas.forEach(function (cabecalho) {
    if (posicaoDaColuna_(estrutura, cabecalho) < 0) {
      throw new Error('O canal ' + canal.nome + ' não tem a coluna "' + cabecalho
        + '". As colunas dela são: ' + estrutura.cabecalhos.join(', ') + '.');
    }
  });

  var filtros = dados.filtros || [];
  filtros.forEach(function (filtro) {
    if (posicaoDaColuna_(estrutura, filtro.coluna) < 0) {
      throw new Error('Não dá para filtrar por "' + filtro.coluna
        + '": o canal ' + canal.nome + ' não tem essa coluna.');
    }
  });

  var id = converterParaIdentificador_(dados.id);
  var repetida = lerRegistros_('ANALISES').filter(function (linha) {
    return normalizarParaComparar_(linha.Nome) === normalizarParaComparar_(nome)
      && converterParaIdentificador_(linha.Id) !== id;
  })[0];
  if (repetida) {
    throw new Error('Já existe uma análise chamada "' + nome + '". Duas com o '
      + 'mesmo nome escreveriam na mesma aba, e a segunda apagaria a primeira.');
  }

  var campos = {
    Nome: nome,
    Descricao: String(dados.descricao || '').trim(),
    CanalId: canal.id,
    Colunas: colunas.join(','),
    Filtros: escreverFiltros_(filtros),
    Dias: Math.max(0, Number(dados.dias) || 0),
    Ordem: Number(dados.ordem) || 0,
    Ativo: dados.ativo === false ? false : true
  };

  if (id) {
    atualizarRegistro_('ANALISES', id, campos);
    registrarAuditoria_('analise.editar', 'ANALISES', id, nome);
    return id;
  }
  var criada = inserirRegistro_('ANALISES', campos);
  registrarAuditoria_('analise.criar', 'ANALISES', criada.__id, nome);
  return criada.__id;
}

/**
 * O nome vira nome de aba, e nome de aba tem regra.
 *
 * Espaço, acento e pontuação funcionariam na aba, mas obrigam a citá-la entre
 * aspas simples em toda fórmula — `='ANALISE_Ret Vida'!A1` — e é o tipo de
 * detalhe que ninguém lembra na hora de montar a tabela dinâmica.
 */
function conferirNomeDaAnalise_(nome) {
  if (!nome) throw new Error('Dê um nome à análise. Ele vira o nome da aba.');
  if (!/^[A-Za-z0-9_]+$/.test(nome)) {
    throw new Error('O nome "' + nome + '" tem caractere que complica na '
      + 'planilha. Use só letras sem acento, números e _ — o nome vira o nome '
      + 'da aba, e aba com espaço ou acento precisa de aspas em toda fórmula.');
  }
  if (nome.length > 40) {
    throw new Error('O nome tem ' + nome.length + ' caracteres, e o limite é '
      + '40 — com o prefixo ANALISE_ a aba não pode passar de 50.');
  }
}

/** Tira a análise da tela. A linha e a aba gerada permanecem. */
function ocultarAnalise(idDaAnalise) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var alvo = converterParaIdentificador_(idDaAnalise);
  var atual = buscarRegistros_('ANALISES', 'Id', alvo, 1)[0];
  if (!atual) throw new Error('Esta análise não existe.');

  ocultarRegistro_('ANALISES', alvo, quem.usuario.Id);
  registrarAuditoria_('analise.ocultar', 'ANALISES', alvo, String(atual.Nome));
  return true;
}

// ============================================================================
// A GERAÇÃO
// ============================================================================

/**
 * Escreve a aba `ANALISE_<Nome>`.
 *
 * Pede senha de administrador quando a aba JÁ EXISTE: regerar apaga o retrato
 * anterior, e quem tinha uma tabela dinâmica apontada para ele vê os números
 * mudarem embaixo dela. Criar pela primeira vez não destrói nada, e por isso
 * não pede.
 */
function gerarAnalise(idDaAnalise) {
  var quem = exigirPermissao_(RECC_ACOES.ESTRUTURA);

  var alvo = converterParaIdentificador_(idDaAnalise);
  var linha = buscarRegistros_('ANALISES', 'Id', alvo, 1)[0];
  if (!linha) throw new Error('Esta análise não existe.');

  var receita = analiseDaLinha_(linha, canaisVisiveis_());
  if (!receita.ativo) {
    throw new Error('A análise "' + receita.nome + '" está desligada. '
      + 'Ligue-a antes de gerar.');
  }
  if (receita.abaExiste) exigirSenhaDeAdministrador_();

  var canal = canalQueEuPossoVer_(receita.canalId, quem);
  var conteudo = montarConteudoDaAnalise_(receita, canal);

  escreverAbaDeAnalise_(receita.aba, conteudo.cabecalhos, conteudo.linhas);

  atualizarRegistro_('ANALISES', alvo, {
    GeradaEm: new Date(),
    GeradaPor: quem.usuario.Id,
    Linhas: conteudo.linhas.length
  });
  registrarAuditoria_('analise.gerar', 'ANALISES', alvo,
    receita.aba + ': ' + conteudo.linhas.length + ' linha(s)');

  return {
    nome: receita.nome,
    aba: receita.aba,
    linhas: conteudo.linhas.length,
    colunas: conteudo.cabecalhos.length,
    truncada: conteudo.truncada
  };
}

/**
 * Os dados da análise, já filtrados e recortados nas colunas escolhidas.
 *
 * O ALCANCE DE QUEM GERA NÃO SE APLICA AQUI, e é decisão, não esquecimento.
 * Dois motivos:
 *
 * 1. A aba gerada mora na MESMA planilha que a base. Quem consegue abrir
 *    ANALISE_Diamante consegue abrir BASE_RET ao lado — recortar por alcance
 *    não esconderia nada de ninguém, só deixaria a análise incompleta.
 * 2. O gatilho de horário roda sem ninguém logado. Se o recorte dependesse de
 *    quem gerou, a MESMA análise teria conteúdos diferentes conforme o botão
 *    ou o horário a tivesse gerado — e ninguém saberia qual dos dois está na
 *    aba naquele momento.
 *
 * Quem pode gerar é controlado onde tem de ser: `gerarAnalise` exige a
 * permissão de estrutura.
 */
function montarConteudoDaAnalise_(receita, canal) {
  var estrutura = estruturaDaAba_(canal.aba);

  var cabecalhos = receita.colunas.length
    ? receita.colunas
    : estrutura.cabecalhos.filter(function (cabecalho) {
      return String(cabecalho).charAt(0) !== '_';
    });

  var registros = lerRegistros_(canal.aba);

  if (receita.dias > 0) {
    registros = filtrarPeloPeriodo_(registros, canal, receita.dias, 0);
  }

  receita.filtros.forEach(function (filtro) {
    var procurado = normalizarParaComparar_(filtro.valor);
    registros = registros.filter(function (registro) {
      return normalizarParaComparar_(registro[filtro.coluna]) === procurado;
    });
  });

  var truncada = registros.length > RECC_MAXIMO_DA_ANALISE;
  if (truncada) registros = registros.slice(0, RECC_MAXIMO_DA_ANALISE);

  var linhas = registros.map(function (registro) {
    return cabecalhos.map(function (cabecalho) {
      var valor = registro[cabecalho];
      return valor === undefined || valor === null ? '' : valor;
    });
  });

  return { cabecalhos: cabecalhos, linhas: linhas, truncada: truncada };
}

/**
 * Escreve a aba, do zero.
 *
 * A TRAVA: recusa qualquer nome que não comece com `ANALISE_`. É a única
 * proteção que separa esta função de um apagador de base — e por isso ela é a
 * primeira linha, antes de qualquer outra coisa.
 *
 * A aba é REAPROVEITADA quando já existe, em vez de apagada e recriada. Apagar
 * mudaria o identificador interno dela, e todo Power BI ou tabela dinâmica
 * apontado para aquela aba perderia o alvo em silêncio.
 */
function escreverAbaDeAnalise_(nomeDaAba, cabecalhos, linhas) {
  if (String(nomeDaAba || '').indexOf(RECC_PREFIXO_DA_ANALISE) !== 0) {
    throw new Error('Recusado: "' + nomeDaAba + '" não começa com '
      + RECC_PREFIXO_DA_ANALISE + '. Este é o único lugar do sistema que '
      + 'reescreve uma aba inteira, e ele só faz isso nas abas que ele mesmo '
      + 'gera.');
  }

  var planilha = planilhaAtiva_();
  var aba = planilha.getSheetByName(nomeDaAba);
  if (!aba) aba = planilha.insertSheet(nomeDaAba);

  var totalDeLinhas = linhas.length + 1;
  var totalDeColunas = Math.max(1, cabecalhos.length);

  ajustarGrade_(aba, totalDeLinhas, totalDeColunas);
  aba.getRange(1, 1, aba.getMaxRows(), aba.getMaxColumns()).clearContent();

  aba.getRange(1, 1, 1, totalDeColunas).setValues([cabecalhos]);
  aba.getRange(1, 1, 1, totalDeColunas).setFontWeight('bold');
  if (linhas.length) {
    aba.getRange(2, 1, linhas.length, totalDeColunas).setValues(linhas);
  }
  aba.setFrozenRows(1);
  esquecerEstruturaLida_(nomeDaAba);
  return aba;
}

/**
 * Deixa a grade da aba com exatamente o tamanho pedido.
 *
 * Célula vazia também consome o teto de 10 milhões da planilha. Uma aba nova
 * nasce com 1000 por 26 = 26 mil células; três análises pequenas deixadas no
 * tamanho de fábrica gastam mais espaço do que os dados que elas mostram.
 */
function ajustarGrade_(aba, linhas, colunas) {
  var linhasAgora = aba.getMaxRows();
  if (linhas > linhasAgora) aba.insertRowsAfter(linhasAgora, linhas - linhasAgora);
  // Uma linha tem de sobrar: o Google Planilhas não aceita aba sem nenhuma.
  if (linhas < linhasAgora) aba.deleteRows(linhas + 1, linhasAgora - linhas);

  var colunasAgora = aba.getMaxColumns();
  if (colunas > colunasAgora) {
    aba.insertColumnsAfter(colunasAgora, colunas - colunasAgora);
  }
  if (colunas < colunasAgora) {
    aba.deleteColumns(colunas + 1, colunasAgora - colunas);
  }
}

/**
 * Regera todas as análises ligadas, uma atrás da outra.
 *
 * É esta a função para apontar um gatilho de horário no editor do Apps Script
 * (Acionadores › Adicionar acionador › `atualizarAnalisesAgendadas` › Baseado
 * em tempo). Ela é a única do arquivo que NÃO pede senha nem permissão: um
 * gatilho de horário roda sem ninguém logado, e uma senha ali não teria quem
 * digitar.
 *
 * Uma análise que estoura não derruba as outras: o erro é anotado e a próxima
 * segue. Uma aba com nome inválido não pode deixar as outras cinco sem
 * atualizar.
 */
function atualizarAnalisesAgendadas() {
  var canais = canaisVisiveis_();
  var feitas = [];
  var falharam = [];

  lerRegistros_('ANALISES').forEach(function (linha) {
    var receita = analiseDaLinha_(linha, canais);
    if (!receita.ativo) return;

    try {
      var canal = canalPeloId_(receita.canalId);
      var conteudo = montarConteudoDaAnalise_(receita, canal);
      escreverAbaDeAnalise_(receita.aba, conteudo.cabecalhos, conteudo.linhas);
      atualizarRegistro_('ANALISES', linha.__id, {
        GeradaEm: new Date(),
        GeradaPor: '',
        Linhas: conteudo.linhas.length
      });
      feitas.push(receita.aba + ' (' + conteudo.linhas.length + ')');
    } catch (erro) {
      falharam.push(receita.nome + ': ' + erro.message);
      Logger.log('Análise ' + receita.nome + ' falhou: ' + erro.message);
    }
  });

  registrarAuditoria_('analise.agendada', 'ANALISES', '',
    feitas.length + ' gerada(s)'
    + (falharam.length ? ', ' + falharam.length + ' com erro' : ''));

  return { geradas: feitas, falharam: falharam };
}


/* ==== Entrada.gs ========================================================== */

/**
 * ============================================================================
 * PGO — Entrada.gs · quem entra e o que pode
 * ============================================================================
 * Da porta da rua até o cadastro: o doGet que decide o que servir, os níveis
 * que dizem o que cada um alcança, e a lista de quem pode entrar.
 *
 * O QUE TEM AQUI DENTRO, nesta ordem:
 *
 *   1. A PORTA DE ENTRADA (doGet)   (era Principal.gs)
 *   2. NÍVEIS, ESCOPO E A SENHA DE ADMINISTRADOR   (era Acesso.gs)
 *   3. O CADASTRO DE QUEM PODE ENTRAR   (era Usuarios.gs)
 *
 * Procure pelo banner com ##### para pular de uma seção à outra.
 * ============================================================================
 */

/* ############################################################################
   #
   #  SEÇÃO 1 de 3 · A PORTA DE ENTRADA (doGet)
   #
   #  Era o arquivo Back-End/Principal.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * ============================================================================
 * RECC — Principal.gs · a porta de entrada
 * ============================================================================
 * doGet é a função que o Google chama quando alguém abre o endereço do
 * sistema. Ela decide entre duas coisas, e só duas:
 *
 *   e-mail cadastrado     → serve o sistema
 *   e-mail não cadastrado → serve a tela institucional, sem carregar dado
 *                           nenhum da planilha
 *
 * Aqui também mora o PACOTE DE PARTIDA: tudo que a tela precisa para se
 * montar chega numa ÚNICA ida ao servidor. Sete chamadas separadas custariam
 * sete viagens de rede e a tela piscaria montando aos pedaços.
 * ============================================================================
 */

/** Chamada pelo Google quando alguém abre o endereço do sistema. */
function doGet() {
  var quem = usuarioAtual_();
  var identidade = lerIdentidadeVisual_();

  if (!quem.cadastrado) {
    var bloqueio = HtmlService.createTemplateFromFile('SemAcesso');
    bloqueio.email = quem.email;
    bloqueio.motivo = quem.motivo;
    // O código da recusa, e não só a frase: o título da tela muda conforme o
    // caso, e comparar texto para decidir isso quebraria no dia em que
    // alguém corrigir uma vírgula na frase.
    bloqueio.situacao = quem.situacao || 'NAO_CADASTRADO';
    bloqueio.identidade = identidade;
    return bloqueio.evaluate()
      .setTitle(identidade.nome + ' — acesso não liberado')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  registrarUltimoAcesso_(quem.usuario);

  // A identidade PRECISA ser entregue ao template: o Index a usa no título e
  // na marca de abertura. Sem isso a página nem chega a ser montada.
  var pagina = HtmlService.createTemplateFromFile('Index');
  pagina.identidade = identidade;

  // E o pacote de partida vai JUNTO, dentro da própria página.
  //
  // Antes, abrir o sistema eram DUAS viagens ao servidor em fila: o doGet
  // trazia a página, e só então o navegador pedia o pacoteDePartida. A
  // segunda recomeçava do zero — outra execução, outro login, outra leitura
  // das mesmas abas — para devolver o que esta execução aqui JÁ TEM na mão.
  //
  // O que a operação sentia disso era a tela de "Conferindo o seu acesso…"
  // parada. Não era a planilha sendo lenta: era uma viagem inteira, com o
  // custo fixo de uma chamada do Apps Script, para repetir trabalho feito.
  //
  // A tela continua sabendo pedir o pacote pelo caminho antigo (ver
  // Aplicacao.html): se a injeção falhar, ela pergunta ao servidor como
  // sempre fez. Atalho que não tem volta vira um jeito novo de quebrar.
  pagina.pacoteDePartida = comoTextoParaDentroDeScript_(montarPacoteDePartida_(quem));

  return pagina.evaluate()
    .setTitle(identidade.nome)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * JSON pronto para morar dentro de uma tag <script> da página.
 *
 * O `<` vira `\u003c` — e isso não é capricho. Um valor de configuração que
 * contivesse o texto de fechamento de script encerraria a tag ali, no meio do
 * JSON, e o resto do pacote viraria HTML solto na página. Escapando o `<`, não
 * existe sequência que feche a tag, e o JSON continua válido: `\u003c` é
 * exatamente o mesmo caractere para quem faz JSON.parse.
 */
function comoTextoParaDentroDeScript_(valor) {
  return JSON.stringify(valor)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/**
 * Cola um arquivo .html dentro de outro.
 * É assim que o Apps Script faz "incluir": não existe import de HTML.
 *
 * QUANDO O ARQUIVO NÃO ESTÁ NO PROJETO, o Apps Script diz apenas
 * "nenhum arquivo html com o nome X foi encontrado", com o número da linha —
 * e mais nada. Quem recebe isso não sabe se o nome está errado, se o arquivo
 * ficou para trás na cópia, ou se é defeito do sistema.
 *
 * Então trocamos a mensagem por uma que diz as três coisas que resolvem: o
 * nome EXATO que o projeto espera, a regra de nomenclatura (sem .html, sem
 * acento) e — o que mais poupa tempo — TODOS os arquivos que faltam, e não só
 * o primeiro. Sem isso a pessoa copia um, recarrega, descobre o próximo, e
 * repete quinze vezes.
 */
function incluir_(nomeDoArquivo) {
  try {
    return HtmlService.createHtmlOutputFromFile(nomeDoArquivo).getContent();
  } catch (erro) {
    throw new Error(recadoDoArquivoQueFalta_(nomeDoArquivo));
  }
}

function recadoDoArquivoQueFalta_(nomeDoArquivo) {
  var recado = 'Falta o arquivo HTML "' + nomeDoArquivo + '" no projeto do '
    + 'Apps Script.\n\n'
    + 'Copie Front-End/' + nomeDoArquivo + '.html do repositório e crie aqui '
    + 'um arquivo HTML chamado exatamente "' + nomeDoArquivo + '" — sem '
    + '".html" no nome, sem acento e com as maiúsculas iguais. O Apps Script '
    + 'diferencia maiúsculas de minúsculas.';

  // A lista completa é o que evita descobrir um arquivo por vez. Vai num try
  // próprio: se o Instalacao.gs também tiver ficado para trás na cópia, o
  // recado principal continua saindo em vez de virar um segundo erro.
  try {
    var faltando = arquivosDeTelaQueFaltam_();
    if (faltando.length > 1) {
      recado += '\n\nNo total faltam ' + faltando.length + ' arquivos: '
        + faltando.join(', ') + '. Copie todos de uma vez.';
    }
  } catch (erro) {
    recado += '\n\n(Não consegui listar os outros que faltam — confira se '
      + 'Instalacao.gs está no projeto.)';
  }
  return recado;
}

/** Atalho para os templates escreverem <?!= incluir('Estilos') ?> */
function incluir(nomeDoArquivo) {
  return incluir_(nomeDoArquivo);
}

// ============================================================================
// O PACOTE DE PARTIDA
// ============================================================================

/**
 * Tudo que a tela precisa para se montar, numa chamada só.
 *
 * Quando algo dá errado aqui, a resposta diz O QUE deu errado. Devolver uma
 * lista de permissões vazia seria pior do que devolver erro: o menu apareceria
 * vazio e todo mundo leria isso como "não tenho acesso", quando o problema é
 * outro. Já aconteceu no sistema anterior e custou uma tarde.
 */
function pacoteDePartida() {
  return montarPacoteDePartida_(usuarioAtual_());
}

/**
 * O pacote de verdade, a partir de um usuário que JÁ foi lido.
 *
 * Existe separado da função acima por um motivo só: o doGet já leu o usuário
 * para decidir qual página servir, e passar esse resultado adiante evita ler
 * tudo de novo. A função pública continua onde estava, com o nome que a tela
 * conhece — quem chama de fora não precisa saber dessa divisão.
 */
function montarPacoteDePartida_(quem) {
  if (!quem.cadastrado) {
    return {
      disponivel: false,
      cadastrado: false,
      motivo: quem.motivo,
      email: quem.email,
      identidade: lerIdentidadeVisual_()
    };
  }
  if (quem.permissoes.defeito) {
    return {
      disponivel: false,
      cadastrado: true,
      motivo: quem.permissoes.defeito,
      email: quem.email,
      identidade: lerIdentidadeVisual_()
    };
  }

  return {
    disponivel: true,
    cadastrado: true,
    identidade: lerIdentidadeVisual_(),
    usuario: {
      id: quem.usuario.Id,
      nome: quem.usuario.Nome,
      email: quem.email,
      cargo: quem.cargo,
      nivelAcesso: quem.nivel,
      canalQueAtende: quem.usuario['Canal que atende']
    },
    permissoes: {
      telas: quem.permissoes.telas,
      acoes: quem.permissoes.acoes,
      escopo: quem.permissoes.escopo,
      canais: quem.permissoes.canais
    },
    menu: montarMenu_(quem.permissoes),
    canais: canaisQueEuVejo_(quem),
    ultimoRegistro: dataDoUltimoRegistro_(quem),
    tema: temaDoUsuario_(),
    senhaDeAdministradorDefinida: existeSenhaDeAdministrador_()
  };
}

// ============================================================================
// TEMA
// ============================================================================

const RECC_TEMAS = ['padrao', 'rosa', 'dark', 'brasil'];
const RECC_CHAVE_DO_TEMA = 'RECC_TEMA_ESCOLHIDO';

/**
 * O tema escolhido pela pessoa, ou o padrão da operação.
 *
 * Fica em UserProperties, e não no navegador: assim a escolha acompanha a
 * pessoa em qualquer computador que ela abrir o sistema.
 */
function temaDoUsuario_() {
  var escolhido = PropertiesService.getUserProperties()
    .getProperty(RECC_CHAVE_DO_TEMA);
  if (escolhido && RECC_TEMAS.indexOf(escolhido) >= 0) return escolhido;

  var daOperacao = valorDaConfiguracao_('OPERACAO.TEMA_PADRAO', 'padrao');
  return RECC_TEMAS.indexOf(daOperacao) >= 0 ? daOperacao : 'padrao';
}

/**
 * Guarda o tema escolhido. Chamada pelo navegador.
 *
 * Não exige permissão nenhuma de propósito: escolher a cor da própria tela
 * não é uma decisão sobre dado. Exige apenas estar cadastrado — senão
 * qualquer visitante encheria as propriedades da instalação.
 */
function salvarTemaDoUsuario(tema) {
  var quem = usuarioAtual_();
  if (!quem.cadastrado) {
    throw new Error('Acesso negado: ' + quem.motivo);
  }
  if (RECC_TEMAS.indexOf(tema) < 0) {
    throw new Error('Tema desconhecido: "' + tema + '". Os temas são ' +
      RECC_TEMAS.join(', ') + '.');
  }
  PropertiesService.getUserProperties().setProperty(RECC_CHAVE_DO_TEMA, tema);
  return tema;
}

/** O menu lateral, já filtrado pelo nível e com os nomes que o ADM escolheu. */
function montarMenu_(permissoes) {
  var titulos = {};
  try {
    titulos = JSON.parse(valorDaConfiguracao_('MENU.TITULOS', '{}'));
  } catch (erro) {
    titulos = {};
  }

  // A ordem sai de RECC_TELAS_DO_SISTEMA, a mesma lista que a tela de
  // Configurações oferece ao montar um nível. Uma lista só, um lugar só.
  return RECC_TELAS_DO_SISTEMA
    .filter(function (item) { return podeVerTela_(permissoes, item.tela); })
    .map(function (item) {
      return { tela: item.tela, titulo: titulos[item.tela] || item.titulo };
    });
}

/** Os canais ativas, na ordem definida na aba CANAIS. */
/**
 * Os canais que ESTA pessoa enxerga.
 *
 * canaisVisiveis_ responde "quais canais existem e estão ligados". Esta aqui
 * responde outra coisa: "quais deles são desta pessoa". Confundir as duas é o
 * erro que faz um analista da RET abrir a fila da Mesa Diamante.
 *
 * Nível sem canal declarado vê todos — ver lerPermissoesDoNivel_.
 */
function canaisQueEuVejo_(quem) {
  var todos = canaisVisiveis_();
  if (!quem || !quem.cadastrado) return [];

  var escolhidos = (quem.permissoes && quem.permissoes.canais) || [];
  if (!escolhidos.length) return todos;

  return todos.filter(function (canal) {
    return escolhidos.indexOf(converterParaIdentificador_(canal.id)) >= 0;
  });
}

function canaisVisiveis_() {
  return lerRegistros_('CANAIS')
    .filter(function (canal) {
      return normalizarParaComparar_(canal.Ativo) === 'sim';
    })
    .sort(function (uma, outra) {
      return (Number(uma.Ordem) || 0) - (Number(outra.Ordem) || 0);
    })
    .map(function (canal) {
      return {
        id: canal.Id,
        nome: canal.Nome,
        descricao: canal.Descricao,
        aba: canal.Aba,
        colunaDaData: canal.ColunaDaData,
        colunaDaHora: canal.ColunaDaHora,
        colunaDoStatus: canal.ColunaDoStatus,
        colunasDaFila: canal.ColunasDaFila,
        colunasDaBusca: canal.ColunasDaBusca,
        metaMensalPorPessoa: Number(canal.MetaMensalPorPessoa) || 0,
        colunaDaFinalizacao: canal.ColunaDaFinalizacao,
        colunaDaAreaResponsavel: canal.ColunaDaAreaResponsavel,
        icone: canal.Icone
      };
    });
}

// ============================================================================
// A DATA DO ÚLTIMO REGISTRO
// ============================================================================

/**
 * Quando entrou o caso mais recente, entre todas os canais ativas.
 *
 * Fica na barra superior e responde a uma pergunta que a operação faz o dia
 * inteiro: "a base está atualizada?". Data velha ali é aviso de que alguma
 * carga não rodou.
 *
 * Custa pouco: a base só acrescenta no fim, então basta olhar as últimas
 * linhas de cado canal — não se percorre a base para descobrir isso.
 */
function dataDoUltimoRegistro_(quem) {
  // Sem quem, pergunta. Chamar sem argumento e receber "nenhum canal" seria o
  // pior dos dois mundos: a barra ficaria vazia sem ninguém entender por quê,
  // e pareceria base desatualizada — que é exatamente o alarme que ela existe
  // para dar.
  quem = quem || usuarioAtual_();

  var maisRecente = null;
  var deQualCanal = '';

  // Só os canais de quem está olhando. A barra superior responde "a minha
  // base está atualizada?" — trazer a data de um canal que a pessoa nem
  // enxerga responderia a pergunta de outra pessoa.
  canaisQueEuVejo_(quem).forEach(function (canal) {
    if (!canal.aba || !canal.colunaDaData) return;

    var ultimos;
    try {
      ultimos = lerRegistros_(canal.aba, { ultimas: 5 });
    } catch (erro) {
      return;   // aba fora do contrato não pode derrubar a barra superior
    }
    if (!ultimos.length) return;

    var registro = ultimos[ultimos.length - 1];
    var momento = juntarDataEHora_(
      registro[canal.colunaDaData],
      canal.colunaDaHora ? registro[canal.colunaDaHora] : '');
    if (!momento) return;

    if (!maisRecente || momento.getTime() > maisRecente.getTime()) {
      maisRecente = momento;
      deQualCanal = canal.nome;
    }
  });

  if (!maisRecente) {
    return { texto: 'Nenhum registro ainda', canal: '', existe: false };
  }

  var padrao = deQualCanal && !temHora_(maisRecente) ? 'dd/MM/yyyy' : 'dd/MM/yyyy HH:mm';
  return {
    texto: Utilities.formatDate(maisRecente, RECC_FUSO_HORARIO, padrao),
    canal: deQualCanal,
    existe: true
  };
}

/** Junta a coluna de data com a de hora, quando o canal tem as duas. */
function juntarDataEHora_(valorDaData, valorDaHora) {
  var data = converterParaData_(valorDaData);
  if (!data) return null;

  var hora = converterParaHora_(valorDaHora);
  if (!hora) return data;

  return new Date(data.getFullYear(), data.getMonth(), data.getDate(),
    hora.getHours(), hora.getMinutes(), 0);
}

function temHora_(data) {
  return data.getHours() !== 0 || data.getMinutes() !== 0;
}

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

/** Um valor da aba CONFIG, com um padrão para quando a chave não existir. */
function valorDaConfiguracao_(chave, valorPadrao) {
  var alvo = normalizarParaComparar_(chave);
  var linhas = lerRegistros_('CONFIG');
  for (var i = 0; i < linhas.length; i++) {
    if (normalizarParaComparar_(linhas[i].Chave) === alvo) {
      var valor = String(linhas[i].Valor === undefined ? '' : linhas[i].Valor);
      return valor === '' ? valorPadrao : valor;
    }
  }
  return valorPadrao;
}

/**
 * Guarda a logo da operação. Chamada pelo navegador.
 *
 * Aceita duas formas, e as duas evitam hospedar arquivo:
 *
 *   1. um endereço https de uma imagem que a empresa já publica;
 *   2. a própria imagem embutida em texto (data:image/...;base64,...),
 *      que é o caminho sem dependência nenhuma — a imagem passa a morar
 *      dentro da célula de CONFIG.
 *
 * A imagem NUNCA vai para o código. É assim que a mesma plataforma serve
 * outra operação trocando só uma linha da planilha.
 */
function definirLogo(enderecoOuImagem) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var valor = String(enderecoOuImagem || '').trim();
  var ehEndereco = valor.indexOf('https://') === 0;
  var ehImagemEmbutida = valor.indexOf('data:image/') === 0;

  if (valor && !ehEndereco && !ehImagemEmbutida) {
    throw new Error('A logo precisa ser um endereço https:// de imagem ou a ' +
      'própria imagem em texto, começando com data:image/. Recebi: ' +
      valor.substring(0, 40));
  }

  var linhas = lerRegistros_('CONFIG');
  for (var i = 0; i < linhas.length; i++) {
    if (normalizarParaComparar_(linhas[i].Chave) === normalizarParaComparar_('IDENTIDADE.LOGO_URL')) {
      atualizarRegistro_('CONFIG', linhas[i].Id, {
        Valor: valor,
        AtualizadoPor: (usuarioAtual_().usuario || {}).Id || '',
        Data: new Date()
      });
      registrarAuditoria_('identidade.logo', 'CONFIG', linhas[i].Id, '');
      return true;
    }
  }
  throw new Error('A chave IDENTIDADE.LOGO_URL não existe na aba CONFIG.');
}

/**
 * Nome, subtítulo, operação, logo e cor.
 *
 * Mora em CONFIG e não em código de propósito: a plataforma é o PGO, e o RECC
 * é uma operação dela. Servir outra operação é trocar estas linhas.
 */
function lerIdentidadeVisual_() {
  return {
    nome: valorDaConfiguracao_('IDENTIDADE.NOME', 'RECC'),
    nomeLongo: valorDaConfiguracao_('IDENTIDADE.NOME_LONGO', ''),
    operacao: valorDaConfiguracao_('IDENTIDADE.OPERACAO', ''),
    logo: valorDaConfiguracao_('IDENTIDADE.LOGO_URL', ''),
    corPrimaria: valorDaConfiguracao_('IDENTIDADE.COR_PRIMARIA', '#0B77CE'),
    plataforma: valorDaConfiguracao_('IDENTIDADE.PLATAFORMA', ''),
    fabricante: valorDaConfiguracao_('IDENTIDADE.FABRICANTE', ''),
    frase: valorDaConfiguracao_('IDENTIDADE.FRASE', '')
  };
}

/* ############################################################################
   #
   #  SEÇÃO 2 de 3 · NÍVEIS, ESCOPO E A SENHA DE ADMINISTRADOR
   #
   #  Era o arquivo Back-End/Acesso.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * ============================================================================
 * RECC — Acesso.gs · quem entra, e o que cada um pode
 * ============================================================================
 * Duas coisas diferentes, e confundi-las é o erro mais caro que este sistema
 * pode cometer:
 *
 *   CARGO         é o que a pessoa É na organização. Texto livre, muda quando
 *                 o RH quiser. Aparece embaixo do nome na barra superior e
 *                 NÃO decide nada.
 *
 *   NÍVEL DE      é o que a pessoa PODE. Daqui saem as telas do menu, os
 *   ACESSO        campos que ela enxerga no formulário, os componentes de cada
 *                 painel, as ações permitidas e o alcance sobre os dados.
 *
 * Nunca escreva `if (cargo === 'ADM')`. O nome do cargo é editável pelo
 * próprio administrador; a permissão sumiria junto com o texto.
 *
 * A OUTRA REGRA: esconder botão não é segurança. A tela esconde por educação;
 * o servidor confere por obrigação. Toda função sensível chama
 * exigirPermissao_ antes de fazer qualquer coisa.
 * ============================================================================
 */

/** As ações que um nível de acesso pode conceder. */
const RECC_ACOES = {
  CRIAR: 'criar',
  EDITAR: 'editar',
  OCULTAR: 'ocultar',
  EXPORTAR: 'exportar',
  CONFIGURAR: 'configurar',
  ESTRUTURA: 'estrutura'
};

/** O alcance de cada pessoa sobre os dados. */
const RECC_ESCOPOS = {
  PROPRIOS: 'PROPRIOS',
  EQUIPE: 'EQUIPE',
  CANAL: 'CANAL',
  TODOS: 'TODOS'
};

/**
 * As telas do sistema, na ordem em que aparecem no menu.
 *
 * Mora AQUI, junto das ações e dos escopos, porque é uma lista de permissão:
 * é ela que a tela de Configurações oferece ao montar um nível de acesso, e é
 * ela que o menu percorre. Ter a lista escrita em dois lugares é como ter dois
 * mapas do mesmo mar: um dia eles divergem, e a tela nova nasce inacessível
 * porque ninguém lembrou de acrescentá-la no segundo.
 *
 * O título aqui é o nome de fábrica. O administrador pode trocá-lo em
 * MENU.TITULOS sem que o sistema perca de vista qual tela é qual — o que
 * identifica a tela é a CHAVE, nunca o texto.
 */
const RECC_TELAS_DO_SISTEMA = [
  { tela: 'dashboard', titulo: 'Dashboard' },
  { tela: 'cadastrarCaso', titulo: 'Cadastrar Caso' },
  { tela: 'minhaPerformance', titulo: 'Minha Performance' },
  { tela: 'buscarCaso', titulo: 'Buscar Caso' },
  { tela: 'tabelaCorretoras', titulo: 'Tabela de Corretoras' },
  { tela: 'painelAnalitico', titulo: 'Painel Analítico' },
  { tela: 'configuracoes', titulo: 'Configurações' }
];

/** Como um campo pode aparecer para um nível de acesso. */
const RECC_VISIBILIDADE = {
  OCULTO: 'oculto',
  LEITURA: 'leitura',
  EDICAO: 'edicao'
};

// ============================================================================
// QUEM ESTÁ ENTRANDO
// ============================================================================

/**
 * A pessoa autenticada no Google, conferida contra a aba USUARIOS.
 *
 * Devolve SEMPRE um objeto, nunca lança: não estar cadastrado é uma resposta
 * legítima do sistema, não um erro. Quem trata isso é a tela.
 *
 *   { cadastrado: false, email: '...', motivo: '...' }
 *   { cadastrado: true,  email, usuario, cargo, nivel, permissoes }
 */
function usuarioAtual_() {
  var email = String(Session.getActiveUser().getEmail() || '').trim();
  if (!email) {
    return {
      cadastrado: false,
      situacao: 'SEM_EMAIL',
      email: '',
      motivo: 'O Google não informou o e-mail de quem está acessando.'
    };
  }

  var encontrado = null;
  var usuarios = lerRegistros_('USUARIOS');
  for (var i = 0; i < usuarios.length; i++) {
    if (normalizarParaComparar_(usuarios[i].Email) === normalizarParaComparar_(email)) {
      encontrado = usuarios[i];
      break;
    }
  }

  if (!encontrado) {
    return {
      cadastrado: false,
      situacao: 'NAO_CADASTRADO',
      email: email,
      motivo: 'Este e-mail não está cadastrado no sistema.'
    };
  }
  if (normalizarParaComparar_(encontrado.Ativo) !== 'sim') {
    return {
      cadastrado: false,
      situacao: 'DESATIVADO',
      email: email,
      motivo: 'Este e-mail está cadastrado, mas o acesso está desativado.'
    };
  }

  var nivel = itemDoCatalogo_(encontrado.NivelAcessoId);
  if (!nivel) {
    return {
      cadastrado: false,
      situacao: 'NIVEL_INEXISTENTE',
      email: email,
      motivo: 'O nível de acesso deste usuário não existe mais no catálogo. ' +
        'Peça a um administrador para reatribuir.'
    };
  }

  if (normalizarParaComparar_(nivel.Ativo) !== 'sim') {
    return {
      cadastrado: false,
      situacao: 'NIVEL_DESLIGADO',
      email: email,
      motivo: 'O nível de acesso "' + nivel.Nome + '" está desligado. ' +
        'Enquanto estiver assim, ninguém que dependa dele entra.'
    };
  }

  var cargo = itemDoCatalogo_(encontrado.CargoId);

  return {
    cadastrado: true,
    email: email,
    usuario: encontrado,
    cargo: cargo ? cargo.Nome : '',
    nivel: nivel.Nome,
    nivelId: nivel.Id,
    permissoes: lerPermissoesDoNivel_(nivel)
  };
}

/** Um item do catálogo pelo Id. Devolve null quando o item foi excluído. */
function itemDoCatalogo_(idDoItem) {
  var alvo = converterParaIdentificador_(idDoItem);
  if (!alvo) return null;
  var itens = lerRegistros_('CATALOGO');
  for (var i = 0; i < itens.length; i++) {
    if (converterParaIdentificador_(itens[i].Id) === alvo) return itens[i];
  }
  return null;
}

// ============================================================================
// O QUE O NÍVEL PERMITE
// ============================================================================

/**
 * Traduz a coluna Configuracao do nível — que é um texto em JSON — no objeto
 * de permissões que o resto do sistema consulta.
 *
 * Configuração quebrada NÃO vira permissão vazia em silêncio. Um menu vazio
 * seria lido como "não tenho acesso", quando na verdade é "a configuração
 * está com defeito" — e alguém passaria a tarde procurando no lugar errado.
 */
function lerPermissoesDoNivel_(nivel) {
  var permissoes = {
    escopo: RECC_ESCOPOS.PROPRIOS,
    canais: [],
    telas: [],
    acoes: [],
    campos: {},
    componentes: {},
    defeito: ''
  };

  var texto = String(nivel.Configuracao || '').trim();
  if (!texto) {
    permissoes.defeito = 'O nível "' + nivel.Nome + '" está sem configuração.';
    return permissoes;
  }

  var lido;
  try {
    lido = JSON.parse(texto);
  } catch (erro) {
    permissoes.defeito = 'A configuração do nível "' + nivel.Nome +
      '" não é um JSON válido: ' + erro.message;
    return permissoes;
  }

  permissoes.escopo = RECC_ESCOPOS[lido.escopo] || RECC_ESCOPOS.PROPRIOS;

  // QUAIS CANAIS ESTE NÍVEL ENXERGA.
  //
  // RET Vida e Mesa Diamante são operações distintas: tratativas diferentes,
  // colunas diferentes, gente diferente. Quem atende a RET não tem o que
  // fazer com a fila da Mesa, e o contrário também vale.
  //
  // LISTA VAZIA QUER DIZER TODOS, e isso é decisão, não descuido. É o caso de
  // quem administra — e é também o que mantém de pé todo nível criado antes
  // desta regra existir: nível antigo continua enxergando o que enxergava, em
  // vez de amanhecer sem canal nenhum e sem ninguém entender por quê.
  permissoes.canais = Array.isArray(lido.canais)
    ? lido.canais.map(function (id) { return converterParaIdentificador_(id); })
      .filter(function (id) { return id !== ''; })
    : [];
  permissoes.telas = Array.isArray(lido.telas) ? lido.telas : [];
  permissoes.acoes = Array.isArray(lido.acoes) ? lido.acoes : [];
  permissoes.campos = lido.campos && typeof lido.campos === 'object' ? lido.campos : {};
  permissoes.componentes =
    lido.componentes && typeof lido.componentes === 'object' ? lido.componentes : {};
  return permissoes;
}

function podeVerTela_(permissoes, nomeDaTela) {
  return permissoes.telas.indexOf(nomeDaTela) >= 0;
}

function podeFazer_(permissoes, acao) {
  return permissoes.acoes.indexOf(acao) >= 0;
}

/**
 * A guarda do servidor. Chame no começo de TODA função sensível.
 * Devolve o usuário para quem passou, para a função não precisar buscar de novo.
 */
function exigirPermissao_(acao) {
  var quem = usuarioAtual_();
  if (!quem.cadastrado) {
    throw new Error('Acesso negado: ' + quem.motivo);
  }
  if (quem.permissoes.defeito) {
    throw new Error('Acesso indisponível: ' + quem.permissoes.defeito);
  }
  if (!podeFazer_(quem.permissoes, acao)) {
    throw new Error('Seu nível de acesso ("' + quem.nivel + '") não permite ' +
      acao + '.');
  }
  return quem;
}

/**
 * A guarda de quem só quer VER uma tela.
 *
 * Abrir o Dashboard não é uma ação como criar ou editar — é uma tela. Exigir
 * "criar" para ver o painel tiraria o painel de quem só consulta, e exigir
 * nada deixaria qualquer nível abrir qualquer tela pelo endereço.
 */
function exigirTela_(nomeDaTela) {
  var quem = usuarioAtual_();
  if (!quem.cadastrado) throw new Error('Acesso negado: ' + quem.motivo);
  if (quem.permissoes.defeito) {
    throw new Error('Acesso indisponível: ' + quem.permissoes.defeito);
  }
  if (!podeVerTela_(quem.permissoes, nomeDaTela)) {
    throw new Error('Seu nível de acesso ("' + quem.nivel + '") não abre a tela '
      + nomeDaTela + '.');
  }
  return quem;
}

/**
 * Como cada campo aparece para este nível.
 *
 * O padrão é EDIÇÃO: um campo novo criado pelo administrador nasce visível
 * para todos, e ele restringe se quiser. O contrário — nascer oculto —
 * faria todo campo novo sumir e ninguém entenderia por quê.
 */
function visibilidadeDoCampo_(permissoes, chaveDoCampo) {
  var declarada = permissoes.campos[chaveDoCampo];
  if (declarada === RECC_VISIBILIDADE.OCULTO) return RECC_VISIBILIDADE.OCULTO;
  if (declarada === RECC_VISIBILIDADE.LEITURA) return RECC_VISIBILIDADE.LEITURA;
  return RECC_VISIBILIDADE.EDICAO;
}

// ============================================================================
// ALCANCE SOBRE OS DADOS
// ============================================================================

/**
 * A coluna que diz de quem é o registro.
 *
 * Nas duas bases é o analista, e ela guarda o NOME, não o Id — foi pedido
 * assim. Por isso a comparação é por nome normalizado.
 */
function colunaDoResponsavel_(estrutura) {
  var candidatas = ['analista', 'responsavel'];
  for (var i = 0; i < estrutura.cabecalhos.length; i++) {
    if (candidatas.indexOf(normalizarParaComparar_(estrutura.cabecalhos[i])) >= 0) {
      return estrutura.cabecalhos[i];
    }
  }
  return '';
}

/**
 * Filtra os registros pelo alcance do nível.
 *
 * EQUIPE é definida pelo "Canal que atende" do cadastro do usuário — é a
 * única noção de equipe que existe na estrutura hoje. Se a operação passar a
 * ter hierarquia de supervisão, isso vira uma coluna nova em USUARIOS e só
 * esta função muda.
 */
function filtrarPeloAlcance_(registros, nomeDaAba, quem) {
  if (quem.permissoes.escopo === RECC_ESCOPOS.TODOS) return registros;
  if (quem.permissoes.escopo === RECC_ESCOPOS.CANAL) return registros;

  var estrutura = estruturaDaAba_(nomeDaAba);
  var coluna = colunaDoResponsavel_(estrutura);
  if (!coluna) return registros;

  if (quem.permissoes.escopo === RECC_ESCOPOS.PROPRIOS) {
    var meuNome = normalizarParaComparar_(quem.usuario.Nome);
    return registros.filter(function (registro) {
      return normalizarParaComparar_(registro[coluna]) === meuNome;
    });
  }

  // EQUIPE
  var meuCanal = normalizarParaComparar_(quem.usuario['Canal que atende']);
  if (!meuCanal) return [];

  var nomesDaEquipe = {};
  lerRegistros_('USUARIOS').forEach(function (usuario) {
    if (normalizarParaComparar_(usuario['Canal que atende']) === meuCanal) {
      nomesDaEquipe[normalizarParaComparar_(usuario.Nome)] = true;
    }
  });
  return registros.filter(function (registro) {
    return nomesDaEquipe[normalizarParaComparar_(registro[coluna])] === true;
  });
}

// ============================================================================
// SENHA DE ADMINISTRADOR — para o que não tem volta
// ============================================================================

const RECC_CHAVE_DA_SENHA = 'RECC_SENHA_DO_ADMINISTRADOR';
const RECC_CHAVE_DAS_TENTATIVAS = 'RECC_TENTATIVAS_DE_SENHA';
const RECC_CHAVE_DA_LIBERACAO = 'RECC_SENHA_LIBERADA_ATE';
const RECC_MINUTOS_LIBERADOS = 5;
const RECC_TENTATIVAS_ATE_BLOQUEAR = 3;
const RECC_HORAS_DE_BLOQUEIO = 24;

/**
 * A senha NUNCA é guardada. Guarda-se a impressão digital dela.
 *
 * SHA-256 sobre "tempero + senha", e o tempero é sorteado uma vez por
 * instalação. Sem tempero, duas instalações com a mesma senha teriam a mesma
 * impressão digital, e uma tabela pronta de senhas comuns quebraria as duas.
 *
 * Tudo isso mora em Script Properties, FORA da planilha: quem abre a planilha
 * não pode ver nem trocar a senha.
 */
function impressaoDigitalDaSenha_(tempero, senha) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, tempero + '|' + senha, Utilities.Charset.UTF_8);
  var hexadecimal = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] + 256) % 256;
    hexadecimal += (b < 16 ? '0' : '') + b.toString(16);
  }
  return hexadecimal;
}

function existeSenhaDeAdministrador_() {
  return !!PropertiesService.getScriptProperties().getProperty(RECC_CHAVE_DA_SENHA);
}

/**
 * Define ou troca a senha. Trocar exige a senha atual — senão qualquer pessoa
 * com a permissão de configurar poderia se promover sozinha.
 */
function definirSenhaDeAdministrador_(senhaNova, senhaAtual) {
  if (String(senhaNova || '').length < 6) {
    throw new Error('A senha precisa ter ao menos 6 caracteres.');
  }
  var propriedades = PropertiesService.getScriptProperties();
  if (existeSenhaDeAdministrador_()) {
    conferirSenhaDeAdministrador_(senhaAtual);
  }
  var tempero = Utilities.getUuid();
  propriedades.setProperty(RECC_CHAVE_DA_SENHA,
    tempero + ':' + impressaoDigitalDaSenha_(tempero, senhaNova));
  propriedades.deleteProperty(RECC_CHAVE_DAS_TENTATIVAS);
  return true;
}

/**
 * Confere a senha e libera a sessão por alguns minutos.
 * Três erros seguidos bloqueiam por 24 horas.
 */
function conferirSenhaDeAdministrador_(senha) {
  var propriedades = PropertiesService.getScriptProperties();
  var guardado = propriedades.getProperty(RECC_CHAVE_DA_SENHA);
  if (!guardado) {
    throw new Error('Nenhuma senha de administrador foi definida ainda. ' +
      'Defina em Configurações › Segurança.');
  }

  var tentativas = lerTentativasDeSenha_();
  if (tentativas.bloqueadoAte && new Date().getTime() < tentativas.bloqueadoAte) {
    var faltam = Math.ceil(
      (tentativas.bloqueadoAte - new Date().getTime()) / (1000 * 60 * 60));
    throw new Error('Senha bloqueada por ' + faltam + ' hora(s) após ' +
      RECC_TENTATIVAS_ATE_BLOQUEAR + ' tentativas erradas.');
  }

  var partes = guardado.split(':');
  var confere = impressaoDigitalDaSenha_(partes[0], String(senha || '')) === partes[1];

  if (!confere) {
    tentativas.quantidade++;
    if (tentativas.quantidade >= RECC_TENTATIVAS_ATE_BLOQUEAR) {
      tentativas.bloqueadoAte =
        new Date().getTime() + RECC_HORAS_DE_BLOQUEIO * 60 * 60 * 1000;
    }
    gravarTentativasDeSenha_(tentativas);
    var restam = RECC_TENTATIVAS_ATE_BLOQUEAR - tentativas.quantidade;
    throw new Error('Senha incorreta.' +
      (restam > 0 ? ' Restam ' + restam + ' tentativa(s).' : ' Acesso bloqueado.'));
  }

  propriedades.deleteProperty(RECC_CHAVE_DAS_TENTATIVAS);
  PropertiesService.getUserProperties().setProperty(RECC_CHAVE_DA_LIBERACAO,
    String(new Date().getTime() + RECC_MINUTOS_LIBERADOS * 60 * 1000));
  return true;
}

function lerTentativasDeSenha_() {
  var texto = PropertiesService.getScriptProperties()
    .getProperty(RECC_CHAVE_DAS_TENTATIVAS);
  if (!texto) return { quantidade: 0, bloqueadoAte: 0 };
  try {
    var lido = JSON.parse(texto);
    return {
      quantidade: Number(lido.quantidade) || 0,
      bloqueadoAte: Number(lido.bloqueadoAte) || 0
    };
  } catch (erro) {
    return { quantidade: 0, bloqueadoAte: 0 };
  }
}

function gravarTentativasDeSenha_(tentativas) {
  PropertiesService.getScriptProperties()
    .setProperty(RECC_CHAVE_DAS_TENTATIVAS, JSON.stringify(tentativas));
}

/**
 * A guarda das ações sem volta: criar ou remover coluna, apagar canal, mexer
 * em nível de acesso, gerar aba de análise sobre uma existente, normalizar
 * base, ocultar em massa.
 *
 * QUEM É ADMINISTRADOR NÃO PRECISA DIGITAR A SENHA. É decisão, e vale a pena
 * estar escrita.
 *
 * A senha nunca foi uma segunda identidade: o sistema já sabe quem está
 * chamando, pela conta Google, e já conferiu a permissão. O que ela é, e
 * sempre foi, é um FREIO — um segundo de parada antes de uma ação que não tem
 * desfazer. Para quem tem a permissão de estrutura, esse freio é atrito sem
 * ganho: a pessoa que pode mexer na estrutura é a mesma que define a senha, e
 * pedir a ela um segredo que ela mesma escolheu não protege nada.
 *
 * Para quem NÃO é administrador e mesmo assim recebeu a ação — porque alguém
 * montou um nível assim —, o freio continua valendo inteiro. É justamente aí
 * que ele serve: a ação é cara, e quem a está fazendo não é quem cuida do
 * sistema.
 *
 * Instalação sem senha definida NÃO libera ninguém: continua barrando, e
 * dizendo onde definir. Do contrário, não definir senha viraria o jeito mais
 * fácil de desligar a guarda.
 */
function exigirSenhaDeAdministrador_() {
  var quem = usuarioAtual_();
  if (quem.cadastrado && podeFazer_(quem.permissoes, RECC_ACOES.ESTRUTURA)) {
    return true;
  }

  if (!existeSenhaDeAdministrador_()) {
    throw new Error('Esta ação exige a senha de administrador, e nenhuma foi '
      + 'definida ainda. Peça a um administrador que defina em '
      + 'Configurações › Identidade.');
  }

  var ate = Number(PropertiesService.getUserProperties()
    .getProperty(RECC_CHAVE_DA_LIBERACAO) || 0);
  if (new Date().getTime() > ate) {
    throw new Error('Esta ação exige a senha de administrador. ' +
      'A liberação anterior expirou — informe a senha novamente.');
  }
  return true;
}

// ============================================================================
// AUDITORIA
// ============================================================================

/**
 * Deixa rastro do que foi feito, sem gravar dado pessoal.
 * Nunca derruba a operação: falhar ao auditar não pode desfazer o que já
 * aconteceu — só registra o problema no log do Apps Script.
 */
function registrarAuditoria_(acao, entidade, idDoRegistro, detalhe) {
  try {
    inserirRegistro_('AUDITORIA', {
      DataHora: new Date(),
      UsuarioId: (usuarioAtual_().usuario || {}).Id || '',
      Acao: acao,
      Entidade: entidade || '',
      RegistroId: idDoRegistro || '',
      Detalhe: detalhe || ''
    });
  } catch (erro) {
    Logger.log('Falha ao registrar auditoria: ' + erro.message);
  }
}

/* ############################################################################
   #
   #  SEÇÃO 3 de 3 · O CADASTRO DE QUEM PODE ENTRAR
   #
   #  Era o arquivo Back-End/Usuarios.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * ============================================================================
 * RECC — Usuarios.gs · o cadastro de quem pode entrar
 * ============================================================================
 * Não existe senha própria: a pessoa entra com a conta Google dela, e o
 * sistema confere o e-mail autenticado contra esta aba. Cadastrar alguém é,
 * literalmente, dar acesso.
 *
 * As funções SEM sublinhado no fim são chamadas pelo navegador. Todas elas
 * começam conferindo permissão — a tela esconde o botão por educação, o
 * servidor confere por obrigação.
 * ============================================================================
 */

/**
 * A lista de usuários, com cargo, nível e canal já traduzidos para nome.
 *
 * Tudo sai como TEXTO — inclusive as datas. Elas atravessam a fronteira do
 * `google.script.run` em JSON, e um `Date` atravessa como um texto ISO que a
 * tela teria de reinterpretar; formatar aqui deixa uma regra só, do lado que
 * conhece o fuso da operação.
 */
function listarUsuarios() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var catalogo = {};
  lerRegistros_('CATALOGO').forEach(function (item) {
    catalogo[converterParaIdentificador_(item.Id)] = String(item.Nome || '');
  });

  var canais = {};
  lerRegistros_('CANAIS').forEach(function (canal) {
    canais[converterParaIdentificador_(canal.Id)] = String(canal.Nome || '');
  });

  return lerRegistros_('USUARIOS').map(function (usuario) {
    var canalId = converterParaIdentificador_(usuario.CanalId);
    return {
      id: String(usuario.Id || ''),
      nome: String(usuario.Nome || ''),
      email: String(usuario.Email || ''),
      canalQueAtende: String(usuario['Canal que atende'] || ''),
      canalId: canalId,
      // Sem canal NÃO é falta de dado: é o administrador, que atende todas.
      canal: canalId ? (canais[canalId] || 'Canal desligada') : '',
      cargoId: converterParaIdentificador_(usuario.CargoId),
      cargo: catalogo[converterParaIdentificador_(usuario.CargoId)] || 'Sem cargo',
      nivelAcessoId: converterParaIdentificador_(usuario.NivelAcessoId),
      nivelAcesso:
        catalogo[converterParaIdentificador_(usuario.NivelAcessoId)] || 'Sem dados',
      matricula: converterParaIdentificador_(usuario.Matricula),
      ativo: normalizarParaComparar_(usuario.Ativo) === 'sim',
      administrador: ehAdministrador_(usuario.Id),
      dataCadastro: comoDataEHora_(usuario.DataCadastro),
      ultimoAcesso: comoDataEHora_(usuario.UltimoAcesso)
    };
  });
}

/** Uma data da planilha vira texto legível. Vazio continua vazio. */
function comoDataEHora_(valor) {
  if (!valor) return '';
  var data = converterParaData_(valor);
  if (!data) return '';
  return Utilities.formatDate(data, RECC_FUSO_HORARIO, 'dd/MM/yyyy HH:mm');
}

/**
 * Cria ou atualiza um usuário.
 *
 * "Sem dados" no cargo ou no nível não é aceitável na hora de gravar: nível
 * inexistente deixaria a pessoa cadastrada e sem conseguir entrar, e ela não
 * teria como descobrir o motivo sozinha.
 */
function salvarUsuario(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var email = String(dados.email || '').trim().toLowerCase();
  if (!email || email.indexOf('@') < 0) {
    throw new Error('Informe um e-mail válido — é por ele que a pessoa entra.');
  }
  if (!String(dados.nome || '').trim()) {
    throw new Error('Informe o nome da pessoa.');
  }
  if (!itemDoCatalogo_(dados.nivelAcessoId)) {
    throw new Error('Escolha um nível de acesso que exista. ' +
      'Sem nível válido a pessoa fica cadastrada e não consegue entrar.');
  }

  // O canal é OPCIONAL — quem administra não pertence a nenhuma. Mas se vier
  // preenchida, tem de existir: um canal que sumiu deixaria a pessoa apontando
  // para o nada, e ninguém descobriria até alguém estranhar o Dashboard vazio.
  var canalEscolhida = converterParaIdentificador_(dados.canalId);
  if (canalEscolhida) {
    var existe = lerRegistros_('CANAIS').filter(function (canal) {
      return converterParaIdentificador_(canal.Id) === canalEscolhida;
    })[0];
    if (!existe) {
      throw new Error('O canal escolhida não existe mais. Escolha outra, ou ' +
        'deixe em branco — quem administra não pertence a um canal.');
    }
  }

  var idInformado = converterParaIdentificador_(dados.id);
  var jaCadastrados = lerRegistros_('USUARIOS');
  for (var i = 0; i < jaCadastrados.length; i++) {
    var mesmoEmail =
      normalizarParaComparar_(jaCadastrados[i].Email) === normalizarParaComparar_(email);
    var outraPessoa =
      converterParaIdentificador_(jaCadastrados[i].Id) !== idInformado;
    if (mesmoEmail && outraPessoa) {
      throw new Error('O e-mail ' + email + ' já está cadastrado para ' +
        jaCadastrados[i].Nome + '.');
    }
  }

  var campos = {
    Nome: String(dados.nome).trim(),
    Email: email,
    'Canal que atende': String(dados.canalQueAtende || '').trim(),
    // Canal VAZIA é válida: é o administrador, que atende todas e delega.
    CanalId: converterParaIdentificador_(dados.canalId),
    CargoId: converterParaIdentificador_(dados.cargoId),
    NivelAcessoId: converterParaIdentificador_(dados.nivelAcessoId),
    Matricula: converterParaIdentificador_(dados.matricula),
    Ativo: dados.ativo === false ? 'NAO' : 'SIM'
  };

  var gravado;
  if (idInformado) {
    gravado = atualizarRegistro_('USUARIOS', idInformado, campos);
    registrarAuditoria_('usuario.editar', 'USUARIOS', idInformado, '');
  } else {
    campos.DataCadastro = new Date();
    campos.UltimoAcesso = '';
    gravado = inserirRegistro_('USUARIOS', campos);
    registrarAuditoria_('usuario.criar', 'USUARIOS', gravado.__id, '');
  }
  return gravado.__id;
}

/**
 * Tira o acesso da pessoa sem apagar o histórico dela.
 *
 * Desativar e ocultar são coisas diferentes: desativado continua na tela de
 * usuários, com o acesso fechado; ocultado sai da tela. O que nunca acontece
 * é apagar a linha — os registros que ela criou apontam para este Id.
 */
function desativarUsuario(idDoUsuario) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var alvo = converterParaIdentificador_(idDoUsuario);

  if (alvo === converterParaIdentificador_(quem.usuario.Id)) {
    throw new Error('Você não pode desativar o próprio acesso. ' +
      'Peça a outro administrador.');
  }
  if (contarAdministradoresAtivos_() <= 1 && ehAdministrador_(alvo)) {
    throw new Error('Este é o último administrador ativo. ' +
      'Cadastre outro antes de desativar este — senão ninguém mais consegue ' +
      'configurar o sistema.');
  }

  atualizarRegistro_('USUARIOS', alvo, { Ativo: 'NAO' });
  registrarAuditoria_('usuario.desativar', 'USUARIOS', alvo, '');
  return true;
}

/** O nível de acesso que pode mexer na estrutura é o de administrador. */
function ehAdministrador_(idDoUsuario) {
  var alvo = converterParaIdentificador_(idDoUsuario);
  var usuarios = lerRegistros_('USUARIOS');
  for (var i = 0; i < usuarios.length; i++) {
    if (converterParaIdentificador_(usuarios[i].Id) !== alvo) continue;
    var nivel = itemDoCatalogo_(usuarios[i].NivelAcessoId);
    if (!nivel) return false;
    return podeFazer_(lerPermissoesDoNivel_(nivel), RECC_ACOES.ESTRUTURA);
  }
  return false;
}

function contarAdministradoresAtivos_() {
  var quantidade = 0;
  lerRegistros_('USUARIOS').forEach(function (usuario) {
    if (normalizarParaComparar_(usuario.Ativo) !== 'sim') return;
    if (ehAdministrador_(usuario.Id)) quantidade++;
  });
  return quantidade;
}

/**
 * Carimba o último acesso.
 *
 * Falhar aqui não pode impedir alguém de entrar: é informação de apoio, não
 * de controle. Por isso o erro é engolido e só vai para o log.
 */
function registrarUltimoAcesso_(usuario) {
  try {
    atualizarRegistro_('USUARIOS', usuario.Id, { UltimoAcesso: new Date() });
  } catch (erro) {
    Logger.log('Não consegui carimbar o último acesso: ' + erro.message);
  }
}


/* ==== Indicadores.gs ====================================================== */

/**
 * ============================================================================
 * PGO — Indicadores.gs · os números
 * ============================================================================
 * Três telas que contam os mesmos casos e respondem perguntas diferentes:
 * "o que eu trabalho hoje", "o que está acontecendo na operação" e
 * "como eu estou indo". Por isso moram juntas — mudar a regra de contagem
 * num lugar e esquecer dos outros dois é o erro que este arquivo evita.
 *
 * O QUE TEM AQUI DENTRO, nesta ordem:
 *
 *   1. OS CARTÕES DO DIA E A FILA   (era Painel.gs)
 *   2. OS GRÁFICOS DA OPERAÇÃO   (era Analitico.gs)
 *   3. A TELA EM QUE O ANALISTA SE VÊ   (era Performance.gs)
 *
 * Procure pelo banner com ##### para pular de uma seção à outra.
 * ============================================================================
 */

/* ############################################################################
   #
   #  SEÇÃO 1 de 3 · OS CARTÕES DO DIA E A FILA
   #
   #  Era o arquivo Back-End/Painel.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * ============================================================================
 * PGO — Painel.gs · os números do dia e a fila de trabalho
 * ============================================================================
 * O Dashboard responde três perguntas, nesta ordem de importância:
 *
 *   quanto tem?        os cartões, contados por situação
 *   o que fazer agora? a fila, filtrável
 *   está atualizado?   a data do último registro, na barra superior
 *
 * Tudo respeita o ALCANCE do nível: quem enxerga só os próprios casos vê
 * cartões contando só os dele. Um cartão que conta o que a pessoa não pode
 * abrir é pior que cartão nenhum — ela passaria a tarde procurando um caso
 * que a fila nunca vai mostrar.
 * ============================================================================
 */

/**
 * Quantas linhas do FIM da aba os painéis leem antes de filtrar por data.
 *
 * A base só acrescenta no fim, então o recente está nas últimas linhas: ler o
 * fim e filtrar por data custa uma leitura só, em vez de percorrer tudo.
 *
 * O NÚMERO IMPORTA, E MUDA COM O VOLUME. Com 200 mil casos espalhados em um
 * ano, uma janela de 30 dias tem umas 15 mil linhas — e 5.000 mostrariam um
 * terço do período, calados. Por isso é configurável, e por isso toda tela que
 * usa esta janela devolve `truncada` quando bate no teto.
 *
 * Ler 50 mil linhas por 39 colunas são 1,95 milhão de células, cerca de dois
 * segundos: cabe. O que não cabe é ler a base inteira a cada abertura de tela.
 */
const RECC_LINHAS_DO_PAINEL_PADRAO = 5000;

function linhasQueOPainelOlha_() {
  var declarado = Number(valorDaConfiguracao_('OPERACAO.LINHAS_DO_PAINEL', ''));
  if (isFinite(declarado) && declarado > 0) return Math.floor(declarado);
  return RECC_LINHAS_DO_PAINEL_PADRAO;
}

/**
 * As cores que uma situação pode ter, na coluna Cor da aba CATALOGO.
 *
 * São nomes, e não códigos hexadecimais, de propósito: cada tema pinta o seu
 * "bom" e o seu "ruim". Gravar #15794A na planilha deixaria o verde do tema
 * claro aparecendo no tema escuro.
 */
const RECC_TONS = ['neutro', 'destaque', 'bom', 'atencao', 'ruim', 'violeta'];

function tomValido_(cor) {
  var tom = normalizarParaComparar_(cor);
  return RECC_TONS.indexOf(tom) >= 0 ? tom : 'neutro';
}

/**
 * Tudo que o Dashboard precisa, numa chamada.
 *
 * `filtros` é um objeto simples: { chaveDoCampo: valorEscolhido }. As chaves
 * vêm da própria resposta anterior, em `filtrosDisponiveis` — a tela não
 * inventa filtro, ela oferece o que o canal tem.
 */
function resumoDoCanal(idDoCanal, filtros) {
  var quem = exigirTela_('dashboard');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var dias = Number(valorDaConfiguracao_('OPERACAO.JANELA_DIAS', '30')) || 30;

  // A base só acrescenta no fim, então o recente está nas últimas linhas.
  // Ler por data exigiria percorrer tudo; ler o fim e depois filtrar por data
  // custa uma leitura só, e o `truncada` avisa quando a janela não coube.
  var recentes = lerRegistros_(canal.aba, { ultimas: linhasQueOPainelOlha_() });
  var truncada = recentes.length >= linhasQueOPainelOlha_();

  var noPeriodo = filtrarPeloPeriodo_(recentes, canal, dias, 0);
  var meus = filtrarPeloAlcance_(noPeriodo, canal.aba, quem);

  // O período ANTERIOR, do mesmo tamanho, só para dizer se subiu ou desceu.
  var anterior = filtrarPeloAlcance_(
    filtrarPeloPeriodo_(recentes, canal, dias, dias), canal.aba, quem);

  var disponiveis = filtrosDoCanal_(canal, quem);
  var filtrados = aplicarFiltros_(meus, disponiveis, filtros || {});
  var anterioresFiltrados = aplicarFiltros_(anterior, disponiveis, filtros || {});

  return {
    canal: canal,
    periodo: { dias: dias, rotulo: 'últimos ' + dias + ' dias' },
    cartoes: contarCartoes_(filtrados, anterioresFiltrados, canal),
    filtrosDisponiveis: disponiveis,
    colunas: colunasDaFila_(canal),
    fila: montarFila_(filtrados, canal),
    total: filtrados.length,
    totalNoPeriodo: meus.length,
    truncada: truncada,
    escopo: quem.permissoes.escopo,
    podeEditar: podeFazer_(quem.permissoes, RECC_ACOES.EDITAR)
  };
}

/**
 * Só o que entrou na janela.
 *
 * `recuo` desloca a janela para trás: 0 é o período atual, `dias` é o período
 * imediatamente anterior, do mesmo tamanho — é assim que sai a comparação
 * "vs. período anterior" dos cartões.
 *
 * Registro sem data FICA no período atual. Some-lo por omissão esconderia
 * justamente as linhas mal preenchidas, que são as que precisam de atenção.
 */
function filtrarPeloPeriodo_(registros, canal, dias, recuo) {
  if (!canal.colunaDaData) return recuo ? [] : registros;

  var fim = new Date();
  fim.setDate(fim.getDate() - recuo);
  var inicio = new Date();
  inicio.setDate(inicio.getDate() - recuo - dias);

  var de = Utilities.formatDate(inicio, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
  var ate = Utilities.formatDate(fim, RECC_FUSO_HORARIO, 'yyyy-MM-dd');

  return registros.filter(function (registro) {
    var data = converterParaData_(registro[canal.colunaDaData]);
    if (!data) return !recuo;
    var dela = Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
    return dela >= de && dela <= ate;
  });
}

/**
 * Os filtros que o canal oferece: os campos que já são lista.
 *
 * Não há lista de filtros escrita em código. Se o administrador transformar
 * um campo em seletor, ele vira filtro sozinho; se desligar o campo, o filtro
 * some junto.
 */
function filtrosDoCanal_(canal, quem) {
  var disponiveis = [];

  // O STATUS VEM PRIMEIRO, sempre.
  //
  // O teto de quatro filtros pegava os quatro primeiros seletores na ordem em
  // que os campos aparecem no formulário. Quando a operação reordenou o
  // formulário e o Status foi para o fim — ele é a última coisa que se
  // preenche no atendimento —, ele caiu fora do corte. Sem erro nenhum: o
  // filtro mais usado do sistema simplesmente deixou de existir na tela.
  //
  // A ordem do FORMULÁRIO segue o caminho de quem atende; a ordem dos FILTROS
  // segue o que a operação recorta. Amarrar uma na outra foi o defeito.
  var colunaDoStatus = normalizarParaComparar_(canal.colunaDoStatus || '');
  var campos = camposAtivosDoCanal_(canal.id).slice().sort(function (um, outro) {
    var umEhStatus = normalizarParaComparar_(um.Cabecalho) === colunaDoStatus;
    var outroEhStatus = normalizarParaComparar_(outro.Cabecalho) === colunaDoStatus;
    if (umEhStatus === outroEhStatus) return 0;
    return umEhStatus ? -1 : 1;
  });

  campos.forEach(function (campo) {
    if (disponiveis.length >= 4) return;   // mais que isso vira parede de caixas
    var visibilidade = visibilidadeDoCampo_(quem.permissoes, campo.ChaveTecnica);
    if (visibilidade === RECC_VISIBILIDADE.OCULTO) return;

    var descricao = campoParaATela_(campo, canal.id, visibilidade, quem);
    if (descricao.tipo !== 'seletor' || !descricao.opcoes.length) return;

    disponiveis.push({
      chave: descricao.chave,
      cabecalho: descricao.cabecalho,
      rotulo: descricao.rotulo,
      opcoes: descricao.opcoes
    });
  });

  return disponiveis;
}

function aplicarFiltros_(registros, disponiveis, escolhidos) {
  var ativos = disponiveis.filter(function (filtro) {
    return String(escolhidos[filtro.chave] || '').trim() !== '';
  });
  if (!ativos.length) return registros;

  return registros.filter(function (registro) {
    for (var i = 0; i < ativos.length; i++) {
      var esperado = normalizarParaComparar_(escolhidos[ativos[i].chave]);
      if (normalizarParaComparar_(registro[ativos[i].cabecalho]) !== esperado) {
        return false;
      }
    }
    return true;
  });
}

// ============================================================================
// OS CARTÕES
// ============================================================================

/**
 * Total, um cartão por situação, e — quando o canal tem as colunas para isso —
 * quantos foram finalizados na própria célula.
 *
 * A contagem por situação sai do CATÁLOGO, e não dos valores encontrados na
 * base: assim uma situação sem nenhum caso aparece com zero, em vez de sumir
 * do painel. Sumir esconde justamente a informação de que ela zerou.
 */
/**
 * A regra de contagem de um cartão, na forma canônica.
 *
 * Existe porque a comparação de textos do sistema ignora acento e caixa: sem
 * este mapa, o servidor devolvia `nacelula` para a tela e recusava o mesmo
 * `nacelula` de volta na hora de salvar. O que sai e o que entra têm de ser a
 * mesma coisa.
 */
function dimensaoDoCartao_(valor) {
  var canonicas = ['total', 'situacao', 'naCelula'];
  var procurado = normalizarParaComparar_(valor);
  for (var i = 0; i < canonicas.length; i++) {
    if (normalizarParaComparar_(canonicas[i]) === procurado) return canonicas[i];
  }
  return '';
}

function contarCartoes_(registros, anteriores, canal) {
  var agora = canal.colunaDoStatus ? contarPorSituacao_(registros, canal) : {};
  var antes = canal.colunaDoStatus ? contarPorSituacao_(anteriores, canal) : {};

  var tons = {};
  situacoesDoCanal_(canal).forEach(function (situacao) {
    tons[situacao.chave] = situacao.tom;
  });

  return cartoesDoCanal_(canal).map(function (cartao) {
    if (cartao.dimensao === 'total') {
      return montarCartao_('total', cartao.titulo, registros.length,
        anteriores.length, cartao.cor, '');
    }
    if (cartao.dimensao === 'naCelula') {
      var naCelula = contarFinalizadosNaCelula_(registros, canal);
      if (naCelula === null) return null;
      return montarCartao_('naCelula', cartao.titulo, naCelula,
        contarFinalizadosNaCelula_(anteriores, canal), cartao.cor,
        'Concluídos sem encaminhar para nenhuma área');
    }

    var chave = normalizarParaComparar_(cartao.filtro);
    return montarCartao_(chave, cartao.titulo, agora[chave] || 0,
      antes[chave] || 0, cartao.cor || tons[chave] || 'neutro', '');
  }).filter(function (cartao) { return cartao !== null; });
}

/**
 * Os cartões declarados para o Dashboard deste canal, na ordem escolhida.
 *
 * Cada cartão é uma linha de `PAINEIS`, e não um pedaço de texto dentro de
 * `CANAIS`: assim ele tem nome, cor e ordem próprios, e o administrador
 * renomeia "Concluído" para "Resolvido no primeiro contato" sem que isso
 * mexa no que está gravado nos casos.
 *
 * Desligar um cartão só o tira da tela — nenhum caso é tocado.
 */
function cartoesDoCanal_(canal) {
  var doCanal = converterParaIdentificador_(canal.id);

  return lerRegistros_('PAINEIS')
    .filter(function (linha) {
      if (normalizarParaComparar_(linha.Tela) !== 'dashboard') return false;
      if (normalizarParaComparar_(linha.TipoWidget) !== 'cartao') return false;
      if (normalizarParaComparar_(linha.Ativo) !== 'sim') return false;
      return converterParaIdentificador_(linha.CanalId) === doCanal;
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (linha) {
      return {
        id: linha.__id,
        titulo: String(linha.Titulo || ''),
        dimensao: dimensaoDoCartao_(linha.CampoDimensao) || 'total',
        filtro: String(linha.Filtro || ''),
        cor: tomValido_(linha.Cor)
      };
    });
}


function contarPorSituacao_(registros, canal) {
  var contagem = {};
  registros.forEach(function (registro) {
    var chave = normalizarParaComparar_(registro[canal.colunaDoStatus]);
    contagem[chave] = (contagem[chave] || 0) + 1;
  });
  return contagem;
}

/**
 * A variação vem como número ou como null.
 *
 * Sem nada no período anterior, NÃO existe variação — mostrar "+100%" porque
 * saiu de zero é ruído que a operação aprende a ignorar, e junto com ele
 * ignora a variação que importa.
 */
function montarCartao_(chave, rotulo, valor, valorAnterior, tom, explicacao) {
  var variacao = null;
  if (valorAnterior > 0) {
    variacao = Math.round(((valor - valorAnterior) / valorAnterior) * 100);
  }
  return {
    chave: chave,
    rotulo: rotulo,
    valor: valor,
    anterior: valorAnterior,
    variacao: variacao,
    tom: tom,
    explicacao: explicacao || ''
  };
}


function situacoesDoCanal_(canal) {
  var doCanal = converterParaIdentificador_(canal.id);
  return lerRegistros_('CATALOGO')
    .filter(function (item) {
      if (normalizarParaComparar_(item.Tipo) !== 'status') return false;
      if (normalizarParaComparar_(item.Ativo) !== 'sim') return false;
      var canalDoItem = converterParaIdentificador_(item.CanalId);
      return !canalDoItem || canalDoItem === doCanal;
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (item) {
      return {
        chave: normalizarParaComparar_(item.Nome),
        // O que a pessoa LÊ é o rótulo; o que está GRAVADO no caso é o nome.
        // Um cartão que apontasse para o rótulo pararia de contar no dia em
        // que alguém trocasse o texto da tela.
        nome: String(item.Rotulo || item.Nome),
        gravadoComo: String(item.Nome),
        tom: tomValido_(item.Cor),
        colunaDeCarimbo: String(item.ColunaDeCarimbo || '').trim()
      };
    });
}

/**
 * Quantas demandas foram resolvidas sem sair da célula.
 *
 * A conta é: finalização preenchida E área responsável vazia. Não é coluna
 * gravada, é conta — assim ela não mente quando alguém edita a área
 * responsável direto na planilha.
 *
 * Devolve null quando o canal não declarou as duas colunas: o cartão não
 * aparece, em vez de aparecer sempre zerado e parecer um problema.
 */
function contarFinalizadosNaCelula_(registros, canal) {
  if (!canal.colunaDaFinalizacao || !canal.colunaDaAreaResponsavel) return null;

  var quantos = 0;
  registros.forEach(function (registro) {
    var finalizado = String(registro[canal.colunaDaFinalizacao] || '').trim() !== '';
    var semArea = String(registro[canal.colunaDaAreaResponsavel] || '').trim() === '';
    if (finalizado && semArea) quantos++;
  });
  return quantos;
}

// ============================================================================
// A FILA
// ============================================================================

/** As colunas que o canal escolheu mostrar na fila. */
/**
 * As colunas da fila, agrupadas.
 *
 * `ColunasDaFila` aceita duas escritas, e a diferença é só o dois-pontos:
 *
 *   plana      Data de entrada, Status, Nome do segurado
 *   agrupada   Situação: Data, Status; Dados cadastrais: Nome, CPF
 *
 * A agrupada existe porque um caso da RET tem trinta e cinco colunas. Seis
 * lado a lado perdem o resto; trinta e cinco não cabem na tela. Juntar as que
 * se leem de uma vez só — proposta com apólice, nome com CPF — resolve as
 * duas coisas.
 *
 * Coluna que não existe na aba é DESCARTADA em silêncio aqui, e não é
 * descuido: a fila é leitura, e derrubar o Dashboard inteiro porque alguém
 * renomeou uma coluna seria pior. Quem cobra o nome errado é Configurações,
 * na hora de salvar o canal.
 */
function colunasDaFila_(canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var declarado = String(canal.colunasDaFila || '');

  // Sem nenhum dois-pontos, é a escrita plana: cada coluna vira um grupo com
  // o próprio nome. É o que faz um canal antiga continuar funcionando igual,
  // sem ninguém precisar reescrever a linha dela na planilha.
  var pedacos = declarado.indexOf(':') < 0
    ? declarado.split(',')
    : declarado.split(';');

  return pedacos
    .map(function (pedaco) { return grupoDaFila_(pedaco, estrutura, canal); })
    .filter(function (grupo) { return grupo && grupo.colunas.length; });
}

/** Um pedaço de `ColunasDaFila` vira um grupo com o seu título. */
function grupoDaFila_(pedaco, estrutura, canal) {
  var texto = String(pedaco || '').trim();
  if (!texto) return null;

  var titulo = '';
  var lista = texto;
  var doisPontos = texto.indexOf(':');
  if (doisPontos > 0) {
    titulo = texto.substring(0, doisPontos).trim();
    lista = texto.substring(doisPontos + 1);
  }

  var colunas = lista.split(',')
    .map(function (nome) { return nome.trim(); })
    .filter(function (nome) {
      return nome !== '' && posicaoDaColuna_(estrutura, nome) >= 0;
    })
    .map(function (nome) {
      var posicao = posicaoDaColuna_(estrutura, nome);
      return {
        cabecalho: estrutura.cabecalhos[posicao],
        tipo: estrutura.tipos[posicao],
        ehStatus: normalizarParaComparar_(nome)
          === normalizarParaComparar_(canal.colunaDoStatus)
      };
    });

  return {
    // Sem título declarado, o grupo se chama como a sua única coluna — é o
    // que faz a escrita plana continuar valendo, sem um segundo caminho.
    titulo: titulo || (colunas.length ? colunas[0].cabecalho : ''),
    colunas: colunas
  };
}


function montarFila_(registros, canal) {
  var grupos = colunasDaFila_(canal);

  // A cor de cada situação, para a etiqueta da fila sair pintada. Numa fila
  // de trinta linhas, é a cor que faz "não trabalhado" saltar aos olhos.
  var tons = {};
  situacoesDoCanal_(canal).forEach(function (situacao) {
    tons[situacao.chave] = situacao.tom;
  });

  return registros.slice().reverse().map(function (registro) {
    var celulas = grupos.map(function (grupo) {
      return grupo.colunas.map(function (coluna) {
        return {
          cabecalho: coluna.cabecalho,
          valor: paraTexto_(registro[coluna.cabecalho], coluna.tipo),
          ehStatus: coluna.ehStatus
        };
      });
    });
    var situacao = canal.colunaDoStatus
      ? String(registro[canal.colunaDoStatus] || '') : '';
    return {
      id: registro.__id,
      celulas: celulas,
      situacao: situacao,
      tom: tons[normalizarParaComparar_(situacao)] || 'neutro'
    };
  });
}


/**
 * O valor pronto para a tela.
 *
 * Data vira texto AQUI, no servidor. Um objeto de data atravessando a ponte
 * para o navegador chega com o fuso de quem abriu, e o mesmo caso apareceria
 * com dias diferentes para pessoas diferentes.
 */
function paraTexto_(valor, tipo) {
  if (valor === null || valor === undefined || valor === '') return '';

  if (tipo === RECC_TIPO_DE_DADO.DATA) {
    var data = converterParaData_(valor);
    return data ? Utilities.formatDate(data, RECC_FUSO_HORARIO, 'dd/MM/yyyy') : '';
  }
  if (tipo === RECC_TIPO_DE_DADO.HORA) {
    var hora = converterParaHora_(valor);
    return hora ? Utilities.formatDate(hora, RECC_FUSO_HORARIO, 'HH:mm') : '';
  }
  if (tipo === RECC_TIPO_DE_DADO.DATA_HORA) {
    var momento = converterParaDataEHora_(valor);
    return momento
      ? Utilities.formatDate(momento, RECC_FUSO_HORARIO, 'dd/MM/yyyy HH:mm') : '';
  }
  if (tipo === RECC_TIPO_DE_DADO.DINHEIRO) {
    var numero = converterParaNumero_(valor);
    if (numero === '') return '';
    return 'R$ ' + numero.toFixed(2).replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d)(?=,))/g, '.');
  }
  return String(valor);
}

/**
 * Um caso inteiro, para a fila abrir sem recarregar a tela.
 * Devolve só o que o nível pode ver — a mesma regra do formulário.
 */
function detalhesDoCaso(idDoCanal, idDoCaso) {
  var quem = exigirTela_('dashboard');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var registro = buscarRegistros_(canal.aba, 'Id', idDoCaso, 1)[0];
  if (!registro) {
    throw new Error('O caso ' + idDoCaso + ' não existe no canal ' + canal.nome + '.');
  }
  exigirAlcanceSobre_(registro, canal, quem);

  var estrutura = estruturaDaAba_(canal.aba);
  var linhas = [];

  camposAtivosDoCanal_(canal.id).forEach(function (campo) {
    if (visibilidadeDoCampo_(quem.permissoes, campo.ChaveTecnica)
      === RECC_VISIBILIDADE.OCULTO) return;

    var posicao = posicaoDaColuna_(estrutura, campo.Cabecalho);
    if (posicao < 0) return;

    // Campo vazio aparece com um travessão, e não sumindo. Sumir faria a
    // pessoa achar que o campo não existe naquelo canal, quando na verdade
    // ele existe e está em branco — que é uma informação.
    linhas.push({
      chave: String(campo.ChaveTecnica),
      rotulo: String(campo.Rotulo || campo.Cabecalho),
      valor: paraTexto_(registro[campo.Cabecalho], estrutura.tipos[posicao]),
      secao: String(campo.Secao || 'Geral')
    });
  });

  var situacao = canal.colunaDoStatus
    ? String(registro[canal.colunaDoStatus] || '') : '';
  var tom = 'neutro';
  situacoesDoCanal_(canal).forEach(function (uma) {
    if (uma.chave === normalizarParaComparar_(situacao)) tom = uma.tom;
  });

  return {
    id: registro.__id,
    canal: canal.nome,
    situacao: situacao,
    tom: tom,
    atualizadoEm: quandoFoiMexido_(canal.aba, registro.__id),
    linhas: linhas,
    historico: historicoDoCaso_(canal.aba, registro.__id),
    podeEditar: podeFazer_(quem.permissoes, RECC_ACOES.EDITAR)
  };
}

/**
 * O que já aconteceu com este caso, do mais antigo para o mais recente.
 *
 * Sai da trilha de auditoria, e não de uma coluna de histórico na base: a
 * trilha já registra quem fez o quê e quando, e uma segunda memória da mesma
 * coisa é uma que um dia diverge da outra.
 */
function historicoDoCaso_(nomeDaAba, idDoCaso) {
  var nomes = {};
  lerRegistros_('USUARIOS').forEach(function (usuario) {
    nomes[usuario.__id] = String(usuario.Nome);
  });

  var comoSeChama = {
    'caso.criar': 'Caso cadastrado',
    'caso.editar': 'Caso alterado',
    'caso.status': 'Situação alterada',
    'caso.ocultar': 'Caso ocultado'
  };

  return lerRegistros_('AUDITORIA')
    .filter(function (linha) {
      if (normalizarParaComparar_(linha.Entidade)
        !== normalizarParaComparar_(nomeDaAba)) return false;
      return converterParaIdentificador_(linha.RegistroId)
        === converterParaIdentificador_(idDoCaso);
    })
    .map(function (linha) {
      var acao = String(linha.Acao || '');
      return {
        acao: comoSeChama[acao] || acao,
        detalhe: String(linha.Detalhe || ''),
        quem: nomes[converterParaIdentificador_(linha.UsuarioId)] || 'Sem dados',
        quando: linha.DataHora
          ? Utilities.formatDate(new Date(linha.DataHora), RECC_FUSO_HORARIO,
            'dd/MM/yyyy, HH:mm')
          : ''
      };
    });
}

/** Quando o caso foi mexido pela última vez, segundo a trilha. */
function quandoFoiMexido_(nomeDaAba, idDoCaso) {
  var passos = historicoDoCaso_(nomeDaAba, idDoCaso);
  return passos.length ? passos[passos.length - 1].quando : '';
}

/* ############################################################################
   #
   #  SEÇÃO 2 de 3 · OS GRÁFICOS DA OPERAÇÃO
   #
   #  Era o arquivo Back-End/Analitico.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * ============================================================================
 * PGO — Analitico.gs · os números por trás da operação
 * ============================================================================
 * O Dashboard responde "o que eu tenho que trabalhar hoje". Esta tela responde
 * outra pergunta: "o que está acontecendo na operação". São coisas diferentes,
 * e por isso são telas diferentes.
 *
 * NADA AQUI É ESCRITO EM CÓDIGO. Cada gráfico é uma linha da aba `PAINEIS`:
 * o tipo, o campo que vira eixo, o que se mede, o limite do TOP N e a ordem.
 * Acrescentar um gráfico é acrescentar uma linha, em Configurações.
 *
 * DUAS REGRAS DE LEITURA que o código obedece, e que valem a pena entender:
 *
 *   UM EIXO SÓ. "Barras com linha" não são duas escalas no mesmo gráfico —
 *   isso faz a mesma altura significar duas coisas, e é o erro mais comum de
 *   gráfico que existe. Aqui a linha é a MÉDIA MÓVEL da própria barra, na
 *   mesma escala: ela mostra a tendência por cima do ruído do dia a dia.
 *
 *   COR SEGUE A ENTIDADE, NUNCA A POSIÇÃO. "Concluído" é verde porque o
 *   catálogo diz que é, e continua verde quando um filtro o joga do primeiro
 *   para o quarto lugar. Cor por posição faria o gráfico inteiro se repintar
 *   a cada filtro, e ninguém conseguiria comparar duas telas.
 * ============================================================================
 */

/** Os tipos de gráfico que a tela sabe desenhar. */
const RECC_TIPOS_DE_GRAFICO = {
  pizza: 'Pizza',
  barras: 'Barras em pé',
  barrasDeitadas: 'Barras deitadas',
  linha: 'Linha',
  barrasComLinha: 'Barras com linha de tendência'
};

/** Como se mede. */
const RECC_AGREGACOES = {
  contagem: 'Contagem de casos',
  soma: 'Soma de um valor',
  media: 'Média de um valor'
};

/**
 * Quantas fatias a pizza aguenta antes de virar confete.
 *
 * Acima disto, o resto vira "Outros" — e não uma cor nova. Cor gerada na hora
 * fica indistinguível das outras para quem não enxerga cor, e quebra a
 * separação que a paleta garante.
 */
const RECC_MAXIMO_DE_FATIAS = 6;

/**
 * O painel inteiro: todos os gráficos do canal, já calculados.
 *
 * Vem numa chamada só porque a tela abre mostrando todos ao mesmo tempo —
 * seis idas ao servidor fariam a tela montar aos pedaços.
 */
function painelAnalitico(idDoCanal, filtros, dias) {
  var quem = exigirTela_('painelAnalitico');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var janela = Number(dias) || Number(valorDaConfiguracao_('OPERACAO.JANELA_DIAS', '30')) || 30;
  var recentes = lerRegistros_(canal.aba, { ultimas: linhasQueOPainelOlha_() });
  var truncada = recentes.length >= linhasQueOPainelOlha_();

  var noPeriodo = filtrarPeloPeriodo_(recentes, canal, janela, 0);
  var meus = filtrarPeloAlcance_(noPeriodo, canal.aba, quem);

  var disponiveis = filtrosDoCanal_(canal, quem);
  var casos = aplicarFiltros_(meus, disponiveis, filtros || {});

  var componentes = componentesDoCanal_(canal).map(function (componente) {
    return calcularComponente_(componente, casos, canal);
  });

  return {
    canal: { id: canal.id, nome: canal.nome, icone: canal.icone },
    periodo: { dias: janela, rotulo: 'últimos ' + janela + ' dias' },
    total: casos.length,
    truncada: truncada,
    linhasLidas: recentes.length,
    filtrosDisponiveis: disponiveis,
    componentes: componentes,
    podeExportar: podeFazer_(quem.permissoes, RECC_ACOES.EXPORTAR)
  };
}

/** Os gráficos declarados para este canal, na ordem escolhida. */
function componentesDoCanal_(canal) {
  var doCanal = converterParaIdentificador_(canal.id);

  return lerRegistros_('PAINEIS')
    .filter(function (linha) {
      if (normalizarParaComparar_(linha.Tela) !== 'painelanalitico') return false;
      if (normalizarParaComparar_(linha.Ativo) !== 'sim') return false;
      var canalDaLinha = converterParaIdentificador_(linha.CanalId);
      return !canalDaLinha || canalDaLinha === doCanal;
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (linha) {
      return {
        id: linha.__id,
        titulo: String(linha.Titulo || ''),
        tipo: tipoDeGraficoValido_(linha.TipoWidget),
        dimensao: String(linha.CampoDimensao || ''),
        medida: String(linha.CampoMedida || ''),
        agregacao: agregacaoValida_(linha.Agregacao),
        limite: Number(linha.Limite) || 0,
        largura: Number(linha.Largura) || 1
      };
    });
}

function tipoDeGraficoValido_(valor) {
  var procurado = normalizarParaComparar_(valor);
  var achado = 'barras';
  Object.keys(RECC_TIPOS_DE_GRAFICO).forEach(function (chave) {
    if (normalizarParaComparar_(chave) === procurado) achado = chave;
  });
  return achado;
}

function agregacaoValida_(valor) {
  var procurado = normalizarParaComparar_(valor);
  var achado = 'contagem';
  Object.keys(RECC_AGREGACOES).forEach(function (chave) {
    if (normalizarParaComparar_(chave) === procurado) achado = chave;
  });
  return achado;
}

// ============================================================================
// O CÁLCULO
// ============================================================================

/**
 * Um gráfico, já somado e ordenado, pronto para a tela desenhar.
 *
 * A tela recebe NÚMEROS, e não decide nada sobre eles: quem escolhe o TOP N,
 * quem dobra o resto em "Outros" e quem calcula a média móvel é aqui. Assim a
 * mesma conta vale para a tela, para a exportação e para o detalhamento.
 */
function calcularComponente_(componente, casos, canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var posicaoDaDimensao = posicaoDaColuna_(estrutura, componente.dimensao);

  if (posicaoDaDimensao < 0) {
    return semDados_(componente, 'A coluna "' + componente.dimensao +
      '" não existe na aba ' + canal.aba + '. Ajuste em Configurações → Painéis.');
  }

  var tipoDaDimensao = estrutura.tipos[posicaoDaDimensao];
  var ehTempo = (tipoDaDimensao === RECC_TIPO_DE_DADO.DATA
    || tipoDaDimensao === RECC_TIPO_DE_DADO.DATA_HORA);

  if (componente.agregacao !== 'contagem' && !componente.medida) {
    return semDados_(componente, 'Este gráfico soma um valor, mas não diz qual. ' +
      'Escolha a coluna da medida em Configurações → Painéis.');
  }

  var somas = {};
  var quantidades = {};
  var ordemDasChaves = [];

  casos.forEach(function (caso) {
    var chave = ehTempo
      ? diaDoCaso_(caso[componente.dimensao])
      : String(caso[componente.dimensao] || '').trim();
    if (chave === '') chave = 'Sem informação';

    if (!Object.prototype.hasOwnProperty.call(somas, chave)) {
      somas[chave] = 0;
      quantidades[chave] = 0;
      ordemDasChaves.push(chave);
    }
    quantidades[chave]++;
    somas[chave] += componente.agregacao === 'contagem'
      ? 1 : (converterParaNumero_(caso[componente.medida]) || 0);
  });

  var pontos = ordemDasChaves.map(function (chave) {
    return {
      chave: chave,
      rotulo: ehTempo ? rotuloDoDia_(chave) : chave,
      valor: componente.agregacao === 'media'
        ? (quantidades[chave] ? somas[chave] / quantidades[chave] : 0)
        : somas[chave],
      casos: quantidades[chave]
    };
  });

  // Tempo se ordena pelo tempo; o resto, do maior para o menor — é o que a
  // pessoa quer ver primeiro num gráfico de magnitude.
  if (ehTempo) {
    pontos.sort(function (um, outro) {
      return um.chave < outro.chave ? -1 : (um.chave > outro.chave ? 1 : 0);
    });
  } else {
    pontos.sort(function (um, outro) { return outro.valor - um.valor; });
  }

  var dobrados = 0;
  if (!ehTempo) {
    var teto = componente.limite > 0
      ? componente.limite
      : (componente.tipo === 'pizza' ? RECC_MAXIMO_DE_FATIAS : pontos.length);
    if (componente.tipo === 'pizza' && teto > RECC_MAXIMO_DE_FATIAS) {
      teto = RECC_MAXIMO_DE_FATIAS;
    }
    if (pontos.length > teto) {
      var resto = pontos.slice(teto);
      dobrados = resto.length;
      var soma = resto.reduce(function (total, ponto) { return total + ponto.valor; }, 0);
      var casosDoResto = resto.reduce(function (total, ponto) {
        return total + ponto.casos;
      }, 0);
      pontos = pontos.slice(0, teto);
      // "Demais valores", e não "Outros": várias listas da operação já têm
      // um item chamado "Outros", e duas linhas com o mesmo nome no mesmo
      // gráfico — uma real e uma somada — não têm como ser distinguidas.
      //
      // E é uma fatia só, nunca uma cor nova: cor gerada na hora fica igual
      // às outras para quem não enxerga cor.
      pontos.push({ chave: '__outros', rotulo: 'Demais valores', valor: soma,
        casos: casosDoResto, ehOutros: true });
    }
  }

  var pintado = pintarPontos_(pontos, componente, canal, ehTempo);

  return {
    id: componente.id,
    titulo: componente.titulo,
    tipo: componente.tipo,
    largura: componente.largura,
    dimensao: componente.dimensao,
    medida: componente.medida,
    agregacao: componente.agregacao,
    unidade: unidadeDaMedida_(componente, estrutura),
    ehTempo: ehTempo,
    pontos: pintado,
    tendencia: componente.tipo === 'barrasComLinha'
      ? mediaMovel_(pintado, 7) : null,
    total: pintado.reduce(function (soma, ponto) { return soma + ponto.valor; }, 0),
    dobradosEmOutros: dobrados,
    aviso: ''
  };
}

function semDados_(componente, aviso) {
  return {
    id: componente.id,
    titulo: componente.titulo,
    tipo: componente.tipo,
    largura: componente.largura,
    dimensao: componente.dimensao,
    medida: componente.medida,
    agregacao: componente.agregacao,
    unidade: '',
    ehTempo: false,
    pontos: [],
    tendencia: null,
    total: 0,
    dobradosEmOutros: 0,
    aviso: aviso
  };
}

/**
 * A cor de cada ponto — e ela SEGUE A ENTIDADE, nunca a posição no gráfico.
 *
 * Quando a dimensão é uma lista do catálogo, a cor já está declarada lá:
 * "Concluído" é verde porque o catálogo diz que é, e continua verde quando um
 * filtro o joga do primeiro para o quarto lugar. Sem isso, o gráfico inteiro
 * se repintaria a cada filtro e ninguém conseguiria comparar duas telas.
 *
 * Fora do catálogo, a cor sai da paleta categórica pela posição do valor na
 * lista COMPLETA da dimensão — que também não muda com o filtro.
 */
function pintarPontos_(pontos, componente, canal, ehTempo) {
  // Magnitude ao longo do tempo, ou barra simples: um tom só. Oito cores para
  // dizer "quanto" é o jeito mais rápido de enterrar a informação.
  if (ehTempo || componente.tipo === 'barras'
    || componente.tipo === 'barrasDeitadas' || componente.tipo === 'linha'
    || componente.tipo === 'barrasComLinha') {
    return pontos.map(function (ponto) {
      return {
        chave: ponto.chave, rotulo: ponto.rotulo, valor: ponto.valor,
        casos: ponto.casos, ehOutros: !!ponto.ehOutros,
        tom: '', serie: 0
      };
    });
  }

  var doCatalogo = coresDoCatalogo_(canal);
  var ordemEstavel = ordemEstavelDaDimensao_(canal, componente.dimensao);

  return pontos.map(function (ponto) {
    if (ponto.ehOutros) {
      return {
        chave: ponto.chave, rotulo: ponto.rotulo, valor: ponto.valor,
        casos: ponto.casos, ehOutros: true, tom: 'neutro', serie: 0
      };
    }
    var normalizado = normalizarParaComparar_(ponto.chave);
    var posicao = ordemEstavel.indexOf(normalizado);
    return {
      chave: ponto.chave,
      rotulo: ponto.rotulo,
      valor: ponto.valor,
      casos: ponto.casos,
      ehOutros: false,
      tom: doCatalogo[normalizado] || '',
      // 1 a 6, fixo pela entidade. Fora da lista conhecida, cai no último
      // slot em vez de inventar uma cor.
      serie: posicao >= 0 ? (posicao % 6) + 1 : 6
    };
  });
}

/** O tom que o catálogo já declarou para cada valor deste canal. */
function coresDoCatalogo_(canal) {
  var doCanal = converterParaIdentificador_(canal.id);
  var cores = {};
  lerRegistros_('CATALOGO').forEach(function (item) {
    var canalDoItem = converterParaIdentificador_(item.CanalId);
    if (canalDoItem && canalDoItem !== doCanal) return;
    if (!item.Cor) return;
    cores[normalizarParaComparar_(item.Nome)] = tomValido_(item.Cor);
  });
  return cores;
}

/**
 * A ordem COMPLETA dos valores possíveis de uma dimensão.
 *
 * Sai do catálogo, e não dos casos que sobraram no filtro: é isso que faz a
 * cor de um valor ser sempre a mesma, esteja ele em primeiro ou em último.
 */
function ordemEstavelDaDimensao_(canal, cabecalho) {
  var campo = null;
  camposAtivosDoCanal_(canal.id).forEach(function (umCampo) {
    if (normalizarParaComparar_(umCampo.Cabecalho)
      === normalizarParaComparar_(cabecalho)) campo = umCampo;
  });
  if (!campo) return [];

  return opcoesDoCampo_(lerConfiguracaoDoCampo_(campo), canal.id)
    .map(function (opcao) { return normalizarParaComparar_(opcao.valor); });
}

/** Em que unidade o número é lido, para a tela formatar certo. */
function unidadeDaMedida_(componente, estrutura) {
  if (componente.agregacao === 'contagem') return 'casos';
  var posicao = posicaoDaColuna_(estrutura, componente.medida);
  if (posicao < 0) return '';
  return estrutura.tipos[posicao] === RECC_TIPO_DE_DADO.DINHEIRO ? 'dinheiro' : '';
}

/** A data de um caso, no formato que ordena sozinho. */
function diaDoCaso_(valor) {
  var data = converterParaData_(valor);
  if (!data) return '';
  return Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
}

function rotuloDoDia_(chave) {
  if (!chave) return 'Sem data';
  var partes = String(chave).split('-');
  return partes.length === 3 ? partes[2] + '/' + partes[1] : chave;
}

/**
 * A média móvel, que é a linha do "barras com linha".
 *
 * É a média dos últimos N pontos, na MESMA escala das barras. Não é um
 * segundo eixo: dois eixos no mesmo gráfico fazem a mesma altura significar
 * duas coisas diferentes, e é o erro de gráfico mais comum que existe.
 */
function mediaMovel_(pontos, janela) {
  return pontos.map(function (ponto, i) {
    var de = Math.max(0, i - janela + 1);
    var pedaco = pontos.slice(de, i + 1);
    var soma = pedaco.reduce(function (total, um) { return total + um.valor; }, 0);
    return { chave: ponto.chave, rotulo: ponto.rotulo, valor: soma / pedaco.length };
  });
}

// ============================================================================
// O DETALHAMENTO
// ============================================================================

/**
 * Os casos por trás de uma fatia ou de uma barra.
 *
 * É o que transforma um número numa lista de protocolos para trabalhar — sem
 * isso, o painel só informa, e informar não resolve caso nenhum.
 */
function detalharComponente(idDoCanal, idDoComponente, chaveDoPonto, filtros, dias) {
  var quem = exigirTela_('painelAnalitico');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var componente = null;
  componentesDoCanal_(canal).forEach(function (um) {
    if (converterParaIdentificador_(um.id)
      === converterParaIdentificador_(idDoComponente)) componente = um;
  });
  if (!componente) {
    throw new Error('Este gráfico não existe mais. Recarregue a tela.');
  }

  var janela = Number(dias) || Number(valorDaConfiguracao_('OPERACAO.JANELA_DIAS', '30')) || 30;
  var recentes = lerRegistros_(canal.aba, { ultimas: linhasQueOPainelOlha_() });
  var meus = filtrarPeloAlcance_(
    filtrarPeloPeriodo_(recentes, canal, janela, 0), canal.aba, quem);
  var casos = aplicarFiltros_(meus, filtrosDoCanal_(canal, quem), filtros || {});

  var estrutura = estruturaDaAba_(canal.aba);
  var posicao = posicaoDaColuna_(estrutura, componente.dimensao);
  var ehTempo = posicao >= 0 && (estrutura.tipos[posicao] === RECC_TIPO_DE_DADO.DATA
    || estrutura.tipos[posicao] === RECC_TIPO_DE_DADO.DATA_HORA);

  var procurado = String(chaveDoPonto || '');
  var escolhidos;

  if (procurado === '__outros') {
    // "Outros" é o resto: os casos que NÃO estão em nenhuma das fatias
    // mostradas. Calculamos de novo quais são elas, para a conta bater com o
    // gráfico — e não com uma segunda regra que um dia diverge.
    var mostradas = calcularComponente_(componente, casos, canal).pontos
      .filter(function (ponto) { return !ponto.ehOutros; })
      .map(function (ponto) { return normalizarParaComparar_(ponto.chave); });

    escolhidos = casos.filter(function (caso) {
      var valor = String(caso[componente.dimensao] || '').trim() || 'Sem informação';
      return mostradas.indexOf(normalizarParaComparar_(valor)) < 0;
    });
  } else {
    escolhidos = casos.filter(function (caso) {
      var valor = ehTempo
        ? diaDoCaso_(caso[componente.dimensao])
        : (String(caso[componente.dimensao] || '').trim() || 'Sem informação');
      return normalizarParaComparar_(valor) === normalizarParaComparar_(procurado);
    });
  }

  return {
    titulo: componente.titulo,
    ponto: ehTempo ? rotuloDoDia_(procurado)
      : (procurado === '__outros' ? 'Demais valores' : procurado),
    colunas: colunasDaFila_(canal),
    casos: montarFila_(escolhidos, canal),
    total: escolhidos.length
  };
}

// ============================================================================
// EXPORTAR
// ============================================================================

/**
 * Os números de um gráfico em texto separado por ponto e vírgula.
 *
 * Ponto e vírgula, e não vírgula: o Excel em português abre assim sem pedir
 * nada. Vírgula abriria tudo numa coluna só, e a pessoa desistiria no meio.
 */
function exportarComponente(idDoCanal, idDoComponente, filtros, dias) {
  var quem = exigirPermissao_(RECC_ACOES.EXPORTAR);
  exigirTela_('painelAnalitico');

  var painel = painelAnalitico(idDoCanal, filtros, dias);
  var componente = null;
  painel.componentes.forEach(function (um) {
    if (converterParaIdentificador_(um.id)
      === converterParaIdentificador_(idDoComponente)) componente = um;
  });
  if (!componente) throw new Error('Este gráfico não existe mais.');

  var linhas = [[componente.dimensao, componente.agregacao === 'contagem'
    ? 'Casos' : componente.medida, 'Casos'].join(';')];

  componente.pontos.forEach(function (ponto) {
    linhas.push([ponto.rotulo, formatarParaExportar_(ponto.valor),
      ponto.casos].join(';'));
  });

  registrarAuditoria_('painel.exportar', 'PAINEIS', componente.id, componente.titulo);
  return {
    nome: nomeDeArquivo_(componente.titulo) + '.csv',
    conteudo: linhas.join('\n')
  };
}

/** Número em vírgula decimal, que é como o Excel em português espera. */
function formatarParaExportar_(valor) {
  if (typeof valor !== 'number') return String(valor === undefined ? '' : valor);
  return (Math.round(valor * 100) / 100).toString().replace('.', ',');
}

function nomeDeArquivo_(titulo) {
  var limpo = normalizarParaComparar_(titulo).replace(/[^a-z0-9]+/g, '-');
  return limpo.replace(/^-+|-+$/g, '') || 'painel';
}

// ============================================================================
// CONFIGURAÇÃO DOS COMPONENTES
// ============================================================================

/** O que a tela de Configurações oferece ao montar um gráfico. */
function opcoesDoPainelAnalitico(idDoCanal) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var estrutura = estruturaDaAba_(canal.aba);

  var dimensoes = [];
  var medidas = [];
  estrutura.cabecalhos.forEach(function (cabecalho, i) {
    if (!cabecalho || cabecalho.charAt(0) === '_') return;
    var tipo = estrutura.tipos[i];
    if (tipo === RECC_TIPO_DE_DADO.DINHEIRO || tipo === RECC_TIPO_DE_DADO.NUMERO) {
      medidas.push(cabecalho);
    }
    // Identificador não vira eixo: agrupar por um Id dá um grupo por caso, e
    // um gráfico com trezentas barras de altura 1 não diz nada.
    if (tipo !== RECC_TIPO_DE_DADO.IDENTIFICADOR) dimensoes.push(cabecalho);
  });

  return {
    canal: { id: canal.id, nome: canal.nome },
    tipos: Object.keys(RECC_TIPOS_DE_GRAFICO).map(function (chave) {
      return { chave: chave, rotulo: RECC_TIPOS_DE_GRAFICO[chave] };
    }),
    agregacoes: Object.keys(RECC_AGREGACOES).map(function (chave) {
      return { chave: chave, rotulo: RECC_AGREGACOES[chave] };
    }),
    dimensoes: dimensoes,
    medidas: medidas,
    maximoDeFatias: RECC_MAXIMO_DE_FATIAS
  };
}

/** Os gráficos de um canal, para a tela de Configurações editar. */
function listarComponentesDoPainel(idDoCanal) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  return lerRegistros_('PAINEIS')
    .filter(function (linha) {
      if (normalizarParaComparar_(linha.Tela) !== 'painelanalitico') return false;
      return converterParaIdentificador_(linha.CanalId)
        === converterParaIdentificador_(canal.id);
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (linha) {
      return {
        id: linha.__id,
        titulo: String(linha.Titulo || ''),
        tipo: tipoDeGraficoValido_(linha.TipoWidget),
        dimensao: String(linha.CampoDimensao || ''),
        medida: String(linha.CampoMedida || ''),
        agregacao: agregacaoValida_(linha.Agregacao),
        limite: Number(linha.Limite) || 0,
        largura: Number(linha.Largura) || 1,
        mostrar: normalizarParaComparar_(linha.Ativo) === 'sim'
      };
    });
}

/** Grava a lista inteira de gráficos de um canal, como os cards do Dashboard. */
function salvarComponentesDoPainel(idDoCanal, componentes) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var estrutura = estruturaDaAba_(canal.aba);
  var lista = Array.isArray(componentes) ? componentes : [];

  if (lista.length > RECC_MAXIMO_DE_CARTOES) {
    throw new Error('São no máximo ' + RECC_MAXIMO_DE_CARTOES + ' gráficos por ' +
      'painel. Acima disso ninguém lê a tela inteira.');
  }

  lista.forEach(function (componente) {
    if (!String(componente.titulo || '').trim()) {
      throw new Error('Todo gráfico precisa de um título — é o que diz o que ' +
        'ele responde.');
    }
    conferirQueAColunaExiste_(estrutura, componente.dimensao, canal.aba);
    if (agregacaoValida_(componente.agregacao) !== 'contagem') {
      if (!String(componente.medida || '').trim()) {
        throw new Error('"' + componente.titulo + '" soma um valor, mas não diz ' +
          'qual. Escolha a coluna da medida.');
      }
      conferirQueAColunaExiste_(estrutura, componente.medida, canal.aba);
    }
  });

  var jaGravados = lerRegistros_('PAINEIS').filter(function (linha) {
    if (normalizarParaComparar_(linha.Tela) !== 'painelanalitico') return false;
    return converterParaIdentificador_(linha.CanalId)
      === converterParaIdentificador_(canal.id);
  });
  var continuam = {};

  lista.forEach(function (componente, posicao) {
    var campos = {
      Tela: 'painelAnalitico',
      CanalId: canal.id,
      Titulo: String(componente.titulo).trim(),
      TipoWidget: tipoDeGraficoValido_(componente.tipo),
      CampoDimensao: String(componente.dimensao || ''),
      CampoMedida: agregacaoValida_(componente.agregacao) === 'contagem'
        ? '' : String(componente.medida || ''),
      Agregacao: agregacaoValida_(componente.agregacao),
      Limite: Number(componente.limite) || 0,
      Filtro: '',
      Ordem: posicao + 1,
      Largura: Number(componente.largura) === 2 ? 2 : 1,
      Cor: '',
      VisivelPara: '',
      Ativo: componente.mostrar === false ? 'NAO' : 'SIM'
    };

    var id = converterParaIdentificador_(componente.id);
    if (id && buscarRegistros_('PAINEIS', 'Id', id, 1)[0]) {
      atualizarRegistro_('PAINEIS', id, campos);
      continuam[id] = true;
      return;
    }
    continuam[inserirRegistro_('PAINEIS', campos).__id] = true;
  });

  jaGravados.forEach(function (linha) {
    if (!continuam[linha.__id]) {
      atualizarRegistro_('PAINEIS', linha.__id, { Ativo: 'NAO', Ordem: 0 });
    }
  });

  registrarAuditoria_('painel.graficos', 'PAINEIS', '',
    canal.nome + ' · ' + lista.length + ' gráficos');
  return true;
}

/* ############################################################################
   #
   #  SEÇÃO 3 de 3 · A TELA EM QUE O ANALISTA SE VÊ
   #
   #  Era o arquivo Back-End/Performance.gs antes de os arquivos serem
   #  agrupados por assunto. O cabeçalho original vem logo abaixo,
   #  inteiro — nada foi reescrito, só mudou de endereço.
   #
   ############################################################################ */

/**
 * ============================================================================
 * PGO — Performance.gs · a tela em que o analista se vê
 * ============================================================================
 * As outras telas mostram a operação. Esta mostra UMA PESSOA — e por isso o
 * cuidado aqui é de outra natureza. Um número mal escolhido no Dashboard
 * atrapalha uma decisão; um número mal escolhido aqui atrapalha alguém.
 *
 * QUATRO DECISÕES, e cada uma tem motivo:
 *
 *   1. O RANKING SEGUE O ALCANCE DO NÍVEL. Quem só enxerga os próprios casos
 *      NÃO vê uma lista com o nome dos colegas — vê a própria posição contra
 *      a MÉDIA da equipe. Mostrar a lista a quem não pode ver os casos dos
 *      outros seria uma porta dos fundos, e ainda por cima a mais constrangedora.
 *
 *   2. TODO NÚMERO VEM COM A SUA BASE. "8 casos" sozinho não diz nada; "8 de
 *      uma média de 6" diz. Comparação sem referência é o jeito mais rápido
 *      de transformar um painel em ansiedade.
 *
 *   3. O QUE NÃO DÁ PARA CALCULAR NÃO APARECE. Tempo médio exige que o canal
 *      declare a coluna de finalização. Sem ela, o indicador some — e não
 *      aparece zerado, que pareceria um desempenho ruim.
 *
 *   4. A META É DECLARADA, NUNCA INVENTADA. Canal sem meta em `CANAIS` não
 *      ganha barra de progresso. Um alvo tirado do nada é pior que alvo
 *      nenhum: ele parece oficial.
 * ============================================================================
 */

/** Quantas pessoas o ranking mostra em volta de quem está olhando. */
const RECC_VIZINHOS_NO_RANKING = 2;

/**
 * Os números de quem está olhando, no canal e no período escolhidos.
 */
function minhaPerformance(idDoCanal, dias) {
  var quem = exigirTela_('minhaPerformance');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var janela = Number(dias) || Number(valorDaConfiguracao_('OPERACAO.JANELA_DIAS', '30')) || 30;
  var recentes = lerRegistros_(canal.aba, { ultimas: linhasQueOPainelOlha_() });
  // Bateu no teto de leitura: pode haver caso do período que ficou de fora.
  // Aqui isto pesa mais que nas outras telas — esta é a tela sobre UMA PESSOA,
  // e número incompleto vira julgamento errado sobre alguém.
  var truncada = recentes.length >= linhasQueOPainelOlha_();
  var noPeriodo = filtrarPeloPeriodo_(recentes, canal, janela, 0);
  var anterior = filtrarPeloPeriodo_(recentes, canal, janela, janela);

  var coluna = colunaDoResponsavel_(estruturaDaAba_(canal.aba));
  var meuNome = String(quem.usuario.Nome || '');

  var meus = casosDaPessoa_(noPeriodo, coluna, meuNome);
  var meusAntes = casosDaPessoa_(anterior, coluna, meuNome);

  return {
    canal: { id: canal.id, nome: canal.nome, icone: canal.icone },
    pessoa: {
      nome: meuNome,
      cargo: quem.cargo,
      nivel: quem.nivel,
      canal: String(quem.usuario['Canal que atende'] || '')
    },
    periodo: { dias: janela, rotulo: 'últimos ' + janela + ' dias' },
    truncada: truncada,
    linhasLidas: recentes.length,
    // Sem coluna de responsável não há "meus casos", e a tela diz isso em vez
    // de mostrar zero — zero pareceria que a pessoa não trabalhou.
    temResponsavel: !!coluna,
    indicadores: indicadoresDaPessoa_(meus, meusAntes, canal),
    meta: metaDaPessoa_(meus, canal, janela),
    porDia: serieDoPeriodo_(meus, canal, janela),
    porSituacao: distribuicao_(meus, canal, canal.colunaDoStatus, 'Situação'),
    porCanal: distribuicao_(meus, canal, colunaDoCanal_(canal), 'Canal'),
    equipe: comoVaiAEquipe_(noPeriodo, coluna, meuNome, quem, canal),
    recentes: oQueEuFiz_(quem, canal)
  };
}

/** Os casos em que a pessoa é a responsável. */
function casosDaPessoa_(registros, coluna, nome) {
  if (!coluna) return [];
  var procurado = normalizarParaComparar_(nome);
  return registros.filter(function (registro) {
    return normalizarParaComparar_(registro[coluna]) === procurado;
  });
}

/** A coluna de canal do canal, quando ela tem uma. */
function colunaDoCanal_(canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var achada = '';
  estrutura.cabecalhos.forEach(function (cabecalho) {
    if (achada) return;
    if (normalizarParaComparar_(cabecalho) === 'canal') achada = cabecalho;
  });
  return achada;
}

// ============================================================================
// OS INDICADORES
// ============================================================================

/**
 * Os números da pessoa, cada um com o do período anterior ao lado.
 *
 * Todo indicador carrega a comparação: "8 casos" sozinho não diz nada, "8
 * contra 6 no período anterior" diz. E o que não dá para calcular neste canal
 * simplesmente não entra na lista.
 */
function indicadoresDaPessoa_(meus, meusAntes, canal) {
  var lista = [];

  lista.push(indicador_('trabalhados', 'Casos trabalhados',
    meus.length, meusAntes.length, 'casos',
    'Todos os casos em que você é a pessoa responsável no período.'));

  if (canal.colunaDoStatus) {
    var concluidos = contarConcluidos_(meus, canal);
    lista.push(indicador_('concluidos', 'Concluídos',
      concluidos, contarConcluidos_(meusAntes, canal), 'casos',
      'Casos que chegaram a uma situação de conclusão.'));

    lista.push(indicador_('emAberto', 'Ainda em aberto',
      meus.length - concluidos, meusAntes.length - contarConcluidos_(meusAntes, canal),
      'casos', 'O que continua esperando alguma tratativa sua.'));
  }

  var tempo = tempoMedioDeTratativa_(meus, canal);
  if (tempo !== null) {
    lista.push(indicador_('tempoMedio', 'Tempo médio até concluir',
      tempo, tempoMedioDeTratativa_(meusAntes, canal), 'dias',
      'Da entrada do caso até a finalização, nos que você concluiu.',
      // Aqui, MENOS é melhor: a tela precisa saber disso para não pintar de
      // vermelho uma queda que é boa notícia.
      true));
  }

  var naCelula = resolvidosSemEncaminhar_(meus, canal);
  if (naCelula !== null) {
    lista.push(indicador_('naCelula', 'Resolvidos sem encaminhar',
      naCelula, resolvidosSemEncaminhar_(meusAntes, canal), 'casos',
      'Concluídos por você, sem passar para outra área.'));
  }

  return lista;
}

function indicador_(chave, rotulo, valor, anterior, unidade, explicacao, menorEhMelhor) {
  var variacao = null;
  if (anterior > 0) {
    variacao = Math.round(((valor - anterior) / anterior) * 100);
  }
  return {
    chave: chave,
    rotulo: rotulo,
    valor: valor,
    anterior: anterior,
    // Sem base de comparação a variação fica VAZIA, e não "+100%": subir de
    // zero para um não é dobrar, e "+100%" ali é ruído que a operação aprende
    // a ignorar — junto com a variação que importa.
    variacao: variacao,
    unidade: unidade,
    explicacao: explicacao,
    menorEhMelhor: !!menorEhMelhor
  };
}

/** Uma situação conta como conclusão quando o nome dela começa com "conclu". */
function contarConcluidos_(casos, canal) {
  if (!canal.colunaDoStatus) return 0;
  return casos.filter(function (caso) {
    return normalizarParaComparar_(caso[canal.colunaDoStatus]).indexOf('conclu') === 0;
  }).length;
}

/**
 * Quantos dias, em média, entre a entrada do caso e a finalização.
 *
 * Devolve null quando o canal não declara a coluna de finalização, ou quando
 * ninguém concluiu nada no período: um "0 dias" ali pareceria um desempenho
 * excelente, e é só ausência de dado.
 */
function tempoMedioDeTratativa_(casos, canal) {
  if (!canal.colunaDaData || !canal.colunaDaFinalizacao) return null;

  var soma = 0;
  var quantos = 0;
  casos.forEach(function (caso) {
    var entrada = converterParaData_(caso[canal.colunaDaData]);
    var fim = converterParaData_(caso[canal.colunaDaFinalizacao]);
    if (!entrada || !fim) return;
    var dias = (fim.getTime() - entrada.getTime()) / (1000 * 60 * 60 * 24);
    if (dias < 0) return;   // data invertida na planilha não vira média negativa
    soma += dias;
    quantos++;
  });

  if (!quantos) return null;
  return Math.round((soma / quantos) * 10) / 10;
}

/** Concluídos sem encaminhar para outra área. Null quando não dá para saber. */
function resolvidosSemEncaminhar_(casos, canal) {
  return contarFinalizadosNaCelula_(casos, canal);
}

// ============================================================================
// A META
// ============================================================================

/**
 * O progresso contra a meta do canal, proporcional ao período escolhido.
 *
 * Devolve null quando o canal não declarou meta. Alvo tirado do nada é pior
 * que alvo nenhum: ele parece oficial, e ninguém sabe de onde saiu.
 */
function metaDaPessoa_(meus, canal, dias) {
  var mensal = Number(canal.metaMensalPorPessoa) || 0;
  if (!mensal) return null;

  var alvo = Math.round((mensal / 30) * dias);
  var feito = contarConcluidos_(meus, canal);

  return {
    alvo: alvo,
    feito: feito,
    // Passar da meta não vira 140% de barra: a barra enche e o número diz o
    // resto. Barra estourando a caixa é defeito, não conquista.
    percentual: alvo ? Math.min(Math.round((feito / alvo) * 100), 100) : 0,
    percentualReal: alvo ? Math.round((feito / alvo) * 100) : 0,
    mensal: mensal,
    rotulo: alvo + ' caso(s) em ' + dias + ' dias, na proporção da meta de '
      + mensal + ' por mês'
  };
}

// ============================================================================
// A EVOLUÇÃO E A DISTRIBUIÇÃO
// ============================================================================

/**
 * Quantos casos por dia, no formato que o desenho de gráfico já entende.
 *
 * Dia sem caso entra ZERADO, e não some: uma linha que pula os dias vazios
 * mente sobre o ritmo — dois casos em dois dias seguidos e dois casos com
 * uma semana de intervalo desenhariam a mesma linha.
 */
function serieDoPeriodo_(meus, canal, dias) {
  if (!canal.colunaDaData) return null;

  var porDia = {};
  meus.forEach(function (caso) {
    var data = converterParaData_(caso[canal.colunaDaData]);
    if (!data) return;
    var chave = Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
    porDia[chave] = (porDia[chave] || 0) + 1;
  });

  var pontos = [];
  var hoje = new Date();
  // No máximo 45 colunas: acima disso a linha vira um borrão e cada ponto
  // fica menor que o dedo de quem tenta tocar nele.
  var quantos = Math.min(dias, 45);
  for (var i = quantos - 1; i >= 0; i--) {
    var dia = new Date(hoje.getTime() - i * 24 * 60 * 60 * 1000);
    var chave = Utilities.formatDate(dia, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
    pontos.push({
      chave: chave,
      rotulo: Utilities.formatDate(dia, RECC_FUSO_HORARIO, 'dd/MM'),
      valor: porDia[chave] || 0,
      casos: porDia[chave] || 0,
      tom: '',
      serie: 0
    });
  }

  return {
    titulo: 'Seus casos por dia',
    tipo: 'barrasComLinha',
    largura: 2,
    unidade: 'casos',
    agregacao: 'contagem',
    dimensao: 'Dia',
    ehTempo: true,
    pontos: pontos,
    tendencia: mediaMovel_(pontos, 7),
    aviso: ''
  };
}

/** Uma pizza dos casos da pessoa, por uma coluna qualquer. */
function distribuicao_(meus, canal, coluna, titulo) {
  if (!coluna) return null;

  var cores = coresDoCatalogo_(canal);
  var ordem = ordemEstavelDaDimensao_(canal, coluna);
  var soma = {};
  var chaves = [];

  meus.forEach(function (caso) {
    var valor = String(caso[coluna] || '').trim() || 'Sem informação';
    if (!Object.prototype.hasOwnProperty.call(soma, valor)) {
      soma[valor] = 0;
      chaves.push(valor);
    }
    soma[valor]++;
  });

  var pontos = chaves.map(function (chave) {
    var normalizado = normalizarParaComparar_(chave);
    var posicao = ordem.indexOf(normalizado);
    return {
      chave: chave,
      rotulo: chave,
      valor: soma[chave],
      casos: soma[chave],
      // A mesma regra do Painel: a cor segue a entidade, e não a posição.
      tom: cores[normalizado] || '',
      serie: posicao >= 0 ? (posicao % 6) + 1 : 6
    };
  }).sort(function (um, outro) { return outro.valor - um.valor; });

  return {
    titulo: titulo, tipo: 'pizza', largura: 1, unidade: 'casos',
    agregacao: 'contagem', dimensao: titulo, ehTempo: false,
    pontos: pontos.slice(0, RECC_MAXIMO_DE_FATIAS), tendencia: null, aviso: ''
  };
}

// ============================================================================
// A EQUIPE
// ============================================================================

/**
 * Como a pessoa está em relação à equipe — e o que ela pode ver disso.
 *
 * Quem só enxerga os próprios casos NÃO recebe a lista com o nome dos
 * colegas: recebe a própria posição contra a média. Mostrar a lista a quem
 * não pode ver os casos dos outros seria uma porta dos fundos — e, ainda por
 * cima, a mais constrangedora que existe num sistema de trabalho.
 *
 * Quem pode ver recebe a lista, mas com a MÉDIA marcada: "abaixo da média"
 * sem saber qual é a média não é informação, é só desconforto.
 */
function comoVaiAEquipe_(noPeriodo, coluna, meuNome, quem, canal) {
  if (!coluna) return { podeVerNomes: false, disponivel: false };

  var porPessoa = {};
  var nomes = [];
  noPeriodo.forEach(function (caso) {
    var nome = String(caso[coluna] || '').trim();
    if (!nome) return;
    if (!Object.prototype.hasOwnProperty.call(porPessoa, nome)) {
      porPessoa[nome] = 0;
      nomes.push(nome);
    }
    porPessoa[nome]++;
  });

  if (!nomes.length) return { podeVerNomes: false, disponivel: false };

  var lista = nomes.map(function (nome) {
    return { nome: nome, valor: porPessoa[nome],
      souEu: normalizarParaComparar_(nome) === normalizarParaComparar_(meuNome) };
  }).sort(function (um, outro) { return outro.valor - um.valor; });

  lista.forEach(function (um, i) { um.posicao = i + 1; });

  var soma = lista.reduce(function (total, um) { return total + um.valor; }, 0);
  var media = Math.round((soma / lista.length) * 10) / 10;
  var eu = lista.filter(function (um) { return um.souEu; })[0] || null;

  var podeVerNomes = quem.permissoes.escopo === RECC_ESCOPOS.TODOS
    || quem.permissoes.escopo === RECC_ESCOPOS.CANAL
    || quem.permissoes.escopo === RECC_ESCOPOS.EQUIPE;

  return {
    disponivel: true,
    podeVerNomes: podeVerNomes,
    quantasPessoas: lista.length,
    media: media,
    minhaPosicao: eu ? eu.posicao : null,
    meuValor: eu ? eu.valor : 0,
    // A lista sai com os vizinhos de quem está olhando — e não do primeiro ao
    // último. Um pódio completo diz muito pouco a quem está no meio e diz
    // demais sobre quem está embaixo.
    lista: podeVerNomes ? vizinhosNoRanking_(lista, eu) : []
  };
}

function vizinhosNoRanking_(lista, eu) {
  if (!eu) return lista.slice(0, RECC_VIZINHOS_NO_RANKING * 2 + 1);

  var meu = eu.posicao - 1;
  var de = Math.max(0, meu - RECC_VIZINHOS_NO_RANKING);
  var ate = Math.min(lista.length, de + RECC_VIZINHOS_NO_RANKING * 2 + 1);
  de = Math.max(0, ate - (RECC_VIZINHOS_NO_RANKING * 2 + 1));
  return lista.slice(de, ate);
}

// ============================================================================
// O QUE EU FIZ
// ============================================================================

/**
 * As últimas ações da própria pessoa, tiradas da trilha de auditoria.
 *
 * Só as dela: a trilha completa é da tela de Configurações, para quem
 * administra. Aqui é a memória de quem está olhando.
 */
function oQueEuFiz_(quem, canal) {
  var comoSeChama = {
    'caso.criar': 'Cadastrou um caso',
    'caso.editar': 'Alterou um caso',
    'caso.status': 'Mudou a situação',
    'caso.ocultar': 'Excluiu um caso',
    'busca': 'Procurou um caso'
  };

  var meuId = converterParaIdentificador_(quem.usuario.Id);

  return lerRegistros_('AUDITORIA', { ultimas: 400 })
    .filter(function (linha) {
      if (converterParaIdentificador_(linha.UsuarioId) !== meuId) return false;
      // Só o que é TRABALHO. Mexer numa configuração é ação de quem
      // administra, e a trilha completa dessas está em Configurações — aqui
      // é a memória de quem atende, e ela não pode virar um log de sistema.
      return Object.prototype.hasOwnProperty.call(comoSeChama, String(linha.Acao));
    })
    .reverse()
    .slice(0, 12)
    .map(function (linha) {
      return {
        acao: comoSeChama[String(linha.Acao)] || String(linha.Acao),
        detalhe: String(linha.Detalhe || ''),
        registro: String(linha.RegistroId || ''),
        entidade: String(linha.Entidade || ''),
        // O caso só abre quando é deste canal: um Id da outra base abriria a
        // tela errada, ou nada.
        abre: normalizarParaComparar_(linha.Entidade)
          === normalizarParaComparar_(canal.aba) && !!linha.RegistroId,
        quando: linha.DataHora
          ? Utilities.formatDate(new Date(linha.DataHora), RECC_FUSO_HORARIO,
            'dd/MM/yyyy, HH:mm')
          : ''
      };
    });
}


/* ==== Instalacao.gs ======================================================= */

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

  // --- canais ----------------------------------------------------------------
  var canais = inserirVariosRegistros_('CANAIS', [
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
  contagem.canais = canais.length;
  var idRet = canais[0]['Id'];
  var idCanal = canais[1]['Id'];

  // --- catálogo por canal ----------------------------------------------------
  var itens = [];
  // Cada situação com a sua cor. A cor não é enfeite: numa fila de trinta
  // linhas, ela é o que faz "não trabalhado" saltar aos olhos sem ninguém
  // precisar ler. As cores válidas estão em RECC_TONS.
  [['Aguardando transmissão', 'destaque'], ['Pendente', 'atencao'],
   ['1º contato realizado', 'violeta'], ['2º contato realizado', 'violeta'],
   ['Não trabalhado', 'ruim'], ['Concluído', 'bom']].forEach(function (par, i) {
    itens.push(novoItemDeCatalogo_('STATUS', idRet, par[0], i + 1, par[1]));
  });
  // A Mesa Diamante tem três status, e só três. O formulário nasce com
  // "Em andamento" já escolhido — é o estado em que todo caso começa, e
  // deixar em branco obrigaria a escolher o óbvio em toda abertura.
  //
  // "Concluído na célula" é diferente de "Concluído": a célula resolveu sem
  // devolver para a área. A operação mede os dois separados.
  [['Em andamento', 'atencao'], ['Concluído', 'bom'],
   ['Concluído na célula', 'destaque']].forEach(function (par, i) {
    itens.push(novoItemDeCatalogo_('STATUS', idCanal, par[0], i + 1, par[1]));
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
    { Nome: 'RetVida', Descricao: 'Tudo da RET Vida dos últimos 90 dias',
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
 * A RET Vida mostra todas as situações; a Mesa Diamante mostra duas. Não é
 * capricho: a Canal tem muito menos volume, e sete cartões de números pequenos
 * viram uma parede que ninguém lê. Tudo isso é editável em Configurações —
 * este é o ponto de partida, não a regra.
 */
function cartoesIniciaisDoPainel_(idRet, idCanal) {
  var cartoes = [];

  function novoCartao(canalId, titulo, dimensao, filtro, cor, ordem) {
    return {
      Tela: 'dashboard',
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

  return cartoes;
}

function novoItemDeCatalogo_(tipo, canalId, nome, ordem, cor) {
  return {
    CanalId: canalId,
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
  status: { secao: 'Situação', ordem: 51, rotulo: 'Status', tipoCampo: 'seletor',
    catalogo: 'STATUS', obrigatorio: true },
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
      Secao: padrao.secao || 'Outros',
      Mascara: padrao.mascara || '',
      Obrigatorio: padrao.obrigatorio === true,
      Protegido: coluna.protegido === true,
      Ativo: !ehId && padrao.ativo !== false,
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
