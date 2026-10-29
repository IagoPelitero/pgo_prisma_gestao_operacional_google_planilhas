/* ==========================================================================
   PGO — Codigo.gs
   --------------------------------------------------------------------------
   ARQUIVO GERADO — não edite aqui.

   Ele junta os 7 arquivos .gs do repositório para caberem numa colagem só no
   Apps Script. Para mudar qualquer coisa, mexa no arquivo original e rode
   de novo:

       node Evolucao/Testes/gerar-pacote.js

   Gerado em 2026-10-29 15:24
   ========================================================================== */



/* ==== Base.gs ============================================================= */

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

const RECC_FUSO_HORARIO = 'America/Sao_Paulo';

const RECC_MAIOR_IDENTIFICADOR = 9999999999;

const RECC_COLUNAS_CALCULADAS = {
  BASE_VG: [
    {
      cabecalho: 'Meses de vigência',
      daColuna: 'Início da vigência',
      conta: 'mesesInteirosAteHoje'
    }
  ]
};

function mesesInteirosAteHoje_(data) {
  if (!data) return '';

  var hoje = new Date();
  var meses = (hoje.getFullYear() - data.getFullYear()) * 12
    + (hoje.getMonth() - data.getMonth());

  if (hoje.getDate() < data.getDate()) meses--;

  return meses > 0 ? meses : 0;
}

function preencherColunasCalculadas_(nomeDaAba, paraGravar, registroAtual) {
  var regras = RECC_COLUNAS_CALCULADAS[nomeDaAba];
  if (!regras) return;

  var estrutura = estruturaDaAba_(nomeDaAba);

  regras.forEach(function (regra) {
    if (posicaoDaColuna_(estrutura, regra.cabecalho) < 0) return;

    var origem = paraGravar.hasOwnProperty(regra.daColuna)
      ? paraGravar[regra.daColuna]
      : (registroAtual || {})[regra.daColuna];

    var quando = converterParaData_(origem);
    if (!quando) return;

    if (regra.conta === 'mesesInteirosAteHoje') {
      paraGravar[regra.cabecalho] = mesesInteirosAteHoje_(quando);
    }
  });
}

const RECC_ALERTAS_DA_LINHA = {
  BASE_VG: [
    {
      cabecalho: 'Meses de vigência',
      abaixoDe: 18,
      recado: 'Vigência de menos de 18 meses',
      noLimite: { tom: 'atencao', recado: 'Vigência de exatamente 18 meses' },
      acima: { tom: 'bom', recado: 'Vigência acima de 18 meses' }
    },
    {
      cabecalho: 'Margem de contribuição',
      abaixoDe: 25.5,
      recado: 'Margem abaixo de 25,5%'
    }
  ]
};

function faixaDaCelula_(nomeDaAba, cabecalho, valor) {
  var regras = RECC_ALERTAS_DA_LINHA[nomeDaAba];
  if (!regras) return null;

  var texto = String(valor === null || valor === undefined ? '' : valor).trim();
  if (!texto) return null;

  var numero = Number(String(texto).replace(',', '.'));
  if (isNaN(numero)) return null;

  var achada = null;
  regras.forEach(function (regra) {
    if (normalizarParaComparar_(regra.cabecalho) === normalizarParaComparar_(cabecalho)) {
      achada = regra;
    }
  });
  if (!achada) return null;

  if (numero < achada.abaixoDe) return { tom: 'ruim', recado: achada.recado };
  if (numero === achada.abaixoDe && achada.noLimite) return achada.noLimite;
  if (numero > achada.abaixoDe && achada.acima) return achada.acima;
  return null;
}

const RECC_COLUNAS_DE_CONTROLE = [
  { cabecalho: '_Visivel', tipo: 'texto', protegido: true },
  { cabecalho: '_ExcluidoEm', tipo: 'dataHora', protegido: true },
  { cabecalho: '_ExcluidoPor', tipo: 'identificador', protegido: true },
  { cabecalho: '_Origem', tipo: 'texto', protegido: true }
];

const RECC_CARIMBO_DE_EXCLUSAO = ['_ExcluidoEm', '_ExcluidoPor'];

function colunasDeControleDe_(ehBaseDeCaso) {
  return RECC_COLUNAS_DE_CONTROLE.filter(function (coluna) {
    return !ehBaseDeCaso || RECC_CARIMBO_DE_EXCLUSAO.indexOf(coluna.cabecalho) < 0;
  });
}

const RECC_COLUNA_QUANDO_MUDOU_O_STATUS = 'Data da última mudança de status';
const RECC_COLUNA_QUEM_MUDOU_O_STATUS = 'Quem mudou o status';
const RECC_COLUNA_QUANTAS_MUDANCAS_DE_STATUS = 'Mudanças de status';

const RECC_COLUNA_ORIGEM_DA_IMPORTACAO = 'Origem da importação';
const RECC_COLUNA_DATA_DA_IMPORTACAO = 'Data da importação';

const RECC_COLUNA_DATA_DO_ENCAMINHAMENTO = 'Data do encaminhamento';

const RECC_COLUNA_DATA_EM_ANDAMENTO = 'Data em andamento';

const RECC_COLUNA_DATA_DO_STATUS_PROPOSTA = 'Data do status proposta';

const RECC_COLUNA_DATA_DA_PRIMEIRA_MUDANCA_DE_STATUS = 'Data da primeira mudança de status';

const RECC_EXPEDIENTE_PADRAO = { abre: '08:15', fecha: '18:30' };

const RECC_VISIVEL_SIM = 'SIM';
const RECC_VISIVEL_NAO = 'NAO';
const RECC_ORIGEM_SISTEMA = 'SISTEMA';
const RECC_ORIGEM_PLANILHA = 'PLANILHA';

const RECC_ESQUEMA = {

  BASE_RET: {
    aba: 'BASE_RET',
    baseDeCaso: true,
    titulo: 'Retenção Vida',
    controle: true,
    reserva: 2000,
    colunas: [
      { cabecalho: 'id', tipo: 'identificador', protegido: true },
      { cabecalho: 'data de recepção do protocolo', tipo: 'data', protegido: true },
      { cabecalho: 'analista', tipo: 'texto', protegido: true },
      { cabecalho: 'SUSEP', tipo: 'texto', protegido: true },
      { cabecalho: 'segmento', tipo: 'texto', protegido: true },
      { cabecalho: 'Código origem da proposta', tipo: 'identificador', protegido: true },
      { cabecalho: 'número da proposta', tipo: 'identificador', protegido: true },
      { cabecalho: 'nome do cliente', tipo: 'texto', protegido: true },
      { cabecalho: 'cod produto', tipo: 'identificador', protegido: true },
      { cabecalho: 'produto', tipo: 'texto', protegido: true },

      { cabecalho: 'sistema', tipo: 'texto', protegido: true },
      { cabecalho: 'valor do prêmio', tipo: 'dinheiro', protegido: true },
      { cabecalho: 'valor do prêmio retido', tipo: 'dinheiro', protegido: true },

      { cabecalho: 'prêmio mensal', tipo: 'dinheiro', protegido: true },

      { cabecalho: 'nome de quem transferiu', tipo: 'texto', protegido: false },
      { cabecalho: 'canal', tipo: 'texto', protegido: true },
      { cabecalho: 'contato', tipo: 'texto', protegido: true },

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

      { cabecalho: 'tentativas de contato', tipo: 'texto', protegido: true },

      { cabecalho: 'Data aguardando transmissão', tipo: 'dataHora', protegido: false, preenchidoPeloSistema: true },
      { cabecalho: 'Data pendente', tipo: 'dataHora', protegido: false, preenchidoPeloSistema: true },
      { cabecalho: 'Data do 1º contato', tipo: 'dataHora', protegido: false, preenchidoPeloSistema: true },
      { cabecalho: 'Data do 2º contato', tipo: 'dataHora', protegido: false, preenchidoPeloSistema: true },
      { cabecalho: 'Data não reteve', tipo: 'dataHora', protegido: false, preenchidoPeloSistema: true },
      { cabecalho: 'Data reteve', tipo: 'dataHora', protegido: false, preenchidoPeloSistema: true },
      { cabecalho: 'Data concluído', tipo: 'dataHora', protegido: false, preenchidoPeloSistema: true },

      { cabecalho: RECC_COLUNA_QUANDO_MUDOU_O_STATUS, tipo: 'dataHora', protegido: false, preenchidoPeloSistema: true },
      { cabecalho: RECC_COLUNA_QUEM_MUDOU_O_STATUS, tipo: 'texto', protegido: false, preenchidoPeloSistema: true },
      { cabecalho: RECC_COLUNA_QUANTAS_MUDANCAS_DE_STATUS, tipo: 'numero', protegido: false, preenchidoPeloSistema: true },

      { cabecalho: RECC_COLUNA_ORIGEM_DA_IMPORTACAO, tipo: 'texto', protegido: false, preenchidoPeloSistema: true },
      { cabecalho: RECC_COLUNA_DATA_DA_IMPORTACAO, tipo: 'dataHora', protegido: false, preenchidoPeloSistema: true },

      { cabecalho: RECC_COLUNA_DATA_DO_STATUS_PROPOSTA, tipo: 'dataHora', protegido: false, preenchidoPeloSistema: true },

      { cabecalho: RECC_COLUNA_DATA_DA_PRIMEIRA_MUDANCA_DE_STATUS, tipo: 'dataHora', protegido: false, preenchidoPeloSistema: true }
    ]
  },

  BASE_MESA: {
    aba: 'BASE_MESA',
    baseDeCaso: true,
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
      { cabecalho: 'SUSEP', tipo: 'texto', protegido: true },
      { cabecalho: 'Ramo', tipo: 'texto', protegido: true },
      { cabecalho: 'Assunto', tipo: 'texto', protegido: true },
      { cabecalho: 'Área responsável', tipo: 'texto', protegido: true },
      { cabecalho: 'Data resposta', tipo: 'data', protegido: true },
      { cabecalho: 'Hora resposta', tipo: 'hora', protegido: true },
      { cabecalho: 'Data da finalização', tipo: 'data', protegido: true },
      { cabecalho: 'horário da finalização', tipo: 'hora', protegido: true },

      { cabecalho: RECC_COLUNA_QUANDO_MUDOU_O_STATUS, tipo: 'dataHora', protegido: false, preenchidoPeloSistema: true },
      { cabecalho: RECC_COLUNA_QUEM_MUDOU_O_STATUS, tipo: 'texto', protegido: false, preenchidoPeloSistema: true },
      { cabecalho: RECC_COLUNA_QUANTAS_MUDANCAS_DE_STATUS, tipo: 'numero', protegido: false, preenchidoPeloSistema: true },

      { cabecalho: RECC_COLUNA_ORIGEM_DA_IMPORTACAO, tipo: 'texto', protegido: false, preenchidoPeloSistema: true },
      { cabecalho: RECC_COLUNA_DATA_DA_IMPORTACAO, tipo: 'dataHora', protegido: false, preenchidoPeloSistema: true },

      { cabecalho: RECC_COLUNA_DATA_DO_ENCAMINHAMENTO, tipo: 'dataHora', protegido: false, preenchidoPeloSistema: true },

      { cabecalho: RECC_COLUNA_DATA_EM_ANDAMENTO, tipo: 'dataHora', protegido: false, preenchidoPeloSistema: true }
    ]
  },

  BASE_VG: {
    aba: 'BASE_VG',
    baseDeCaso: true,
    titulo: 'VG — Vida em Grupo',
    controle: true,
    reserva: 2000,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'Data do protocolo da solicitação', tipo: 'data', protegido: true },
      { cabecalho: 'Analista', tipo: 'texto', protegido: true },
      { cabecalho: 'TK/Assunto', tipo: 'texto', protegido: true },
      { cabecalho: 'Entrada', tipo: 'data', protegido: true },

      { cabecalho: 'CNPJ', tipo: 'identificador', protegido: true },
      { cabecalho: 'Subestipulante', tipo: 'texto', protegido: true },
      { cabecalho: 'Início da vigência', tipo: 'data', protegido: true },

      { cabecalho: 'Meses de vigência', tipo: 'numero', protegido: false, preenchidoPeloSistema: true },

      { cabecalho: 'Quantidade de vidas', tipo: 'numero', protegido: true },
      { cabecalho: 'MOVSINT/MOVESEG', tipo: 'texto', protegido: true },
      { cabecalho: 'SUSEP', tipo: 'texto', protegido: true },
      { cabecalho: 'Periodicidade', tipo: 'texto', protegido: true },
      { cabecalho: 'Lead', tipo: 'texto', protegido: true },
      { cabecalho: 'Status', tipo: 'texto', protegido: true },
      { cabecalho: 'Motivo da liberação ou recusa', tipo: 'texto', protegido: true },
      { cabecalho: 'Prêmio mensal', tipo: 'dinheiro', protegido: true },
      { cabecalho: 'Prêmio anual', tipo: 'dinheiro', protegido: true },

      { cabecalho: 'Margem de contribuição', tipo: 'numero', protegido: true },
      { cabecalho: 'Quantidade de parcelas vencidas', tipo: 'numero', protegido: true },
      { cabecalho: 'Obs', tipo: 'textoLongo', protegido: false },
      { cabecalho: 'Mês e ano', tipo: 'texto', protegido: true },

      { cabecalho: 'Data de inclusão do protocolo', tipo: 'dataHora', protegido: false, preenchidoPeloSistema: true },

      { cabecalho: RECC_COLUNA_QUANDO_MUDOU_O_STATUS, tipo: 'dataHora', protegido: false, preenchidoPeloSistema: true },
      { cabecalho: RECC_COLUNA_QUEM_MUDOU_O_STATUS, tipo: 'texto', protegido: false, preenchidoPeloSistema: true },
      { cabecalho: RECC_COLUNA_QUANTAS_MUDANCAS_DE_STATUS, tipo: 'numero', protegido: false, preenchidoPeloSistema: true },

      { cabecalho: RECC_COLUNA_ORIGEM_DA_IMPORTACAO, tipo: 'texto', protegido: false, preenchidoPeloSistema: true },
      { cabecalho: RECC_COLUNA_DATA_DA_IMPORTACAO, tipo: 'dataHora', protegido: false, preenchidoPeloSistema: true }
    ]
  },

  USUARIOS: {
    aba: 'USUARIOS',
    titulo: 'Usuários',
    controle: true,
    reserva: 300,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'Nome', tipo: 'texto', protegido: true },
      { cabecalho: 'Email', tipo: 'texto', protegido: true },

      { cabecalho: 'CanalId', tipo: 'identificador', protegido: false },
      { cabecalho: 'CargoId', tipo: 'identificador', protegido: true },
      { cabecalho: 'NivelAcessoId', tipo: 'identificador', protegido: true },
      { cabecalho: 'Ativo', tipo: 'simOuNao', protegido: true },

      { cabecalho: 'Disponibilidade', tipo: 'texto', protegido: false },
      { cabecalho: 'DataCadastro', tipo: 'dataHora', protegido: true },
      { cabecalho: 'UltimoAcesso', tipo: 'dataHora', protegido: true }
    ]
  },

  CORRETORAS: {
    aba: 'CORRETORAS',
    titulo: 'Corretoras Diamante',
    controle: true,
    reserva: 1000,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'SUSEP', tipo: 'texto', protegido: true },
      { cabecalho: 'Corretora', tipo: 'texto', protegido: true },
      { cabecalho: 'Sucursal', tipo: 'texto', protegido: false },
      { cabecalho: 'Segmento', tipo: 'texto', protegido: true },

      { cabecalho: 'Consultor', tipo: 'texto', protegido: false }
    ]
  },

  ANALISTAS_CENTRAL: {
    aba: 'ANALISTAS_CENTRAL',
    titulo: 'Analistas da Central',
    controle: true,
    reserva: 500,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'Nome', tipo: 'texto', protegido: true },
      { cabecalho: 'Matricula', tipo: 'identificador', protegido: false },
      { cabecalho: 'Equipe', tipo: 'texto', protegido: false },
      { cabecalho: 'Ativo', tipo: 'simOuNao', protegido: false }
    ]
  },

  ANALISTAS_COBRANCA: {
    aba: 'ANALISTAS_COBRANCA',
    titulo: 'Analistas da cobrança ativa',
    controle: true,
    reserva: 500,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'Nome', tipo: 'texto', protegido: true },
      { cabecalho: 'Matricula', tipo: 'identificador', protegido: false },
      { cabecalho: 'Equipe', tipo: 'texto', protegido: false },
      { cabecalho: 'Ativo', tipo: 'simOuNao', protegido: false }
    ]
  },

  SUSEP_BLOQUEADAS: {
    aba: 'SUSEP_BLOQUEADAS',
    titulo: 'SUSEPs bloqueadas',
    controle: true,
    reserva: 500,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'SUSEP', tipo: 'texto', protegido: true },
      { cabecalho: 'NomeCorretora', tipo: 'texto', protegido: true },
      { cabecalho: 'Sucursal', tipo: 'texto', protegido: false },
      { cabecalho: 'CoordenadorComercial', tipo: 'texto', protegido: false },
      { cabecalho: 'BloqueadaEm', tipo: 'data', protegido: false },

      { cabecalho: 'BloqueadaPor', tipo: 'texto', protegido: false,
        opcionalNaBaseDeFora: true }
    ]
  },

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

      { cabecalho: 'ColunaDaData', tipo: 'texto', protegido: false },
      { cabecalho: 'ColunaDaHora', tipo: 'texto', protegido: false },

      { cabecalho: 'ColunaDoStatus', tipo: 'texto', protegido: false },

      { cabecalho: 'ColunasDaFila', tipo: 'textoLongo', protegido: false },

      { cabecalho: 'ColunasDaBusca', tipo: 'texto', protegido: false },

      { cabecalho: 'ColunaDaFinalizacao', tipo: 'texto', protegido: false },
      { cabecalho: 'ColunaDaAreaResponsavel', tipo: 'texto', protegido: false },

      { cabecalho: 'ColunaDoValor', tipo: 'texto', protegido: false },
      { cabecalho: 'SituacoesDestacadas', tipo: 'textoLongo', protegido: false },

      { cabecalho: 'ConfereSusepBloqueada', tipo: 'simOuNao', protegido: false },

      { cabecalho: 'SlaHorasUteis', tipo: 'numero', protegido: false },
      { cabecalho: 'InicioDoExpediente', tipo: 'texto', protegido: false },
      { cabecalho: 'FimDoExpediente', tipo: 'texto', protegido: false },
      { cabecalho: 'ColunaDaPrimeiraResposta', tipo: 'texto', protegido: false },
      { cabecalho: 'ColunaDaHoraDaPrimeiraResposta', tipo: 'texto', protegido: false },
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

      { cabecalho: 'ColunaDeCarimbo', tipo: 'texto', protegido: false },

      { cabecalho: 'Final', tipo: 'simOuNao', protegido: false },
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

      { cabecalho: 'TipoWidget', tipo: 'texto', protegido: true },

      { cabecalho: 'CampoDimensao', tipo: 'texto', protegido: false },
      { cabecalho: 'CampoMedida', tipo: 'texto', protegido: false },
      { cabecalho: 'Agregacao', tipo: 'texto', protegido: false },
      { cabecalho: 'Limite', tipo: 'numero', protegido: false },
      { cabecalho: 'Filtro', tipo: 'textoLongo', protegido: false },
      { cabecalho: 'Ordem', tipo: 'numero', protegido: false },
      { cabecalho: 'Largura', tipo: 'numero', protegido: false },

      { cabecalho: 'Cor', tipo: 'texto', protegido: false },
      { cabecalho: 'VisivelPara', tipo: 'texto', protegido: false },
      { cabecalho: 'Ativo', tipo: 'simOuNao', protegido: false }
    ]
  },

  ANALISES: {
    aba: 'ANALISES',
    titulo: 'Análises',
    controle: true,
    reserva: 100,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },

      { cabecalho: 'Nome', tipo: 'texto', protegido: false },
      { cabecalho: 'Descricao', tipo: 'texto', protegido: false },
      { cabecalho: 'CanalId', tipo: 'identificador', protegido: false },

      { cabecalho: 'Colunas', tipo: 'textoLongo', protegido: false },

      { cabecalho: 'Filtros', tipo: 'textoLongo', protegido: false },

      { cabecalho: 'Dias', tipo: 'numero', protegido: false },
      { cabecalho: 'Ordem', tipo: 'numero', protegido: false },
      { cabecalho: 'Ativo', tipo: 'simOuNao', protegido: false },

      { cabecalho: 'GeradaEm', tipo: 'dataHora', protegido: true },
      { cabecalho: 'GeradaPor', tipo: 'identificador', protegido: true },
      { cabecalho: 'Linhas', tipo: 'numero', protegido: true }
    ]
  },

  ATENDIMENTOS_CHAT: {
    aba: 'ATENDIMENTOS_CHAT',
    titulo: 'Atendimentos do chat',
    controle: true,
    reserva: 1000,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'Data', tipo: 'data', protegido: true },
      { cabecalho: 'Analista', tipo: 'texto', protegido: true },
      { cabecalho: 'SUSEP', tipo: 'texto', protegido: false },
      { cabecalho: 'Corretora', tipo: 'texto', protegido: false },
      { cabecalho: 'Assunto', tipo: 'texto', protegido: false },
      { cabecalho: 'Consultor', tipo: 'texto', protegido: false },
      { cabecalho: 'Ramo', tipo: 'texto', protegido: false },

      { cabecalho: 'Sucursal', tipo: 'texto', protegido: false },
      { cabecalho: 'Tabulação', tipo: 'texto', protegido: false },
      { cabecalho: 'Sub assunto', tipo: 'texto', protegido: false },
      { cabecalho: 'TMO', tipo: 'numero', protegido: false },

      { cabecalho: 'Lote', tipo: 'texto', protegido: false },
      { cabecalho: 'ImportadoEm', tipo: 'dataHora', protegido: false, preenchidoPeloSistema: true }
    ]
  },

  SINALIZADORES: {
    aba: 'SINALIZADORES',
    titulo: 'Sinalizadores',
    controle: true,
    reserva: 100,
    colunas: [
      { cabecalho: 'Id', tipo: 'identificador', protegido: true },
      { cabecalho: 'CanalId', tipo: 'identificador', protegido: false },

      { cabecalho: 'Nome', tipo: 'texto', protegido: false },

      { cabecalho: 'Prazo', tipo: 'numero', protegido: false },

      { cabecalho: 'Unidade', tipo: 'texto', protegido: false },

      { cabecalho: 'AvisoFaltando', tipo: 'numero', protegido: false },
      { cabecalho: 'ColunaQueLiga', tipo: 'texto', protegido: false },
      { cabecalho: 'ColunaDaData', tipo: 'texto', protegido: false },
      { cabecalho: 'ColunaDaHora', tipo: 'texto', protegido: false },

      { cabecalho: 'InicioDoExpediente', tipo: 'texto', protegido: false },
      { cabecalho: 'FimDoExpediente', tipo: 'texto', protegido: false },
      { cabecalho: 'Ordem', tipo: 'numero', protegido: false },
      { cabecalho: 'Ativo', tipo: 'simOuNao', protegido: false },

      { cabecalho: 'StatusComCondicao', tipo: 'texto', protegido: false },
      { cabecalho: 'ColunaDaCondicao', tipo: 'texto', protegido: false },
      { cabecalho: 'ValoresDaCondicao', tipo: 'texto', protegido: false },
      { cabecalho: 'ColunaDaDataDaCondicao', tipo: 'texto', protegido: false }
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

const RECC_PREFIXO_ANALISE = 'ANALISE_';

function esquemaDaAba_(nomeDaAba) {
  var definicao = RECC_ESQUEMA[nomeDaAba];
  if (!definicao) {
    throw new Error('Aba "' + nomeDaAba + '" não faz parte do esquema do RECC.');
  }
  var colunas = definicao.colunas.slice();
  if (definicao.controle) {
    colunas = colunas.concat(colunasDeControleDe_(definicao.baseDeCaso));
  }
  return {
    aba: definicao.aba,
    titulo: definicao.titulo,
    controle: definicao.controle,
    reserva: definicao.reserva,
    colunas: colunas
  };
}

function nomesDasAbasDoContrato_() {
  return Object.keys(RECC_ESQUEMA);
}

const RECC_PREFIXO_DA_SEQUENCIA = 'RECC_SEQ_';

function formatarIdentificador_(numero) {
  var texto = String(Math.floor(numero));
  while (texto.length < 10) texto = '0' + texto;
  return texto;
}

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

function proximosIdentificadores_(nomeDaAba, quantos) {
  if (quantos <= 0) return [];

  var props = PropertiesService.getScriptProperties();
  var chave = RECC_PREFIXO_DA_SEQUENCIA + nomeDaAba;
  var guardado = props.getProperty(chave);

  var ultimo;
  if (guardado === null) {

    ultimo = maiorIdentificadorDaAba_(nomeDaAba);
  } else {
    ultimo = Number(guardado);
    if (!isFinite(ultimo)) ultimo = maiorIdentificadorDaAba_(nomeDaAba);
  }

  if (abaVemDeOutraPlanilha_(nomeDaAba)) {
    var naPlanilhaDeFora = maiorIdentificadorDaAba_(nomeDaAba);
    if (naPlanilhaDeFora > ultimo) ultimo = naPlanilhaDeFora;
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

    var bloco = estrutura.aba
      .getRange(2, 1, totalDados, estrutura.cabecalhos.length)
      .getValues();

    var faixa = estrutura.aba.getRange(2, iId + 1, totalDados, 1);
    var coluna = faixa.getValues();
    var vistos = {};
    var repetidos = [];
    var carimbados = 0;

    var precisam = 0;
    for (var j = 0; j < coluna.length; j++) {
      if (!converterParaIdentificador_(coluna[j][0]) && !linhaEstaVazia_(bloco[j])) precisam++;
    }
    var novos = proximosIdentificadores_(nomeDaAba, precisam);

    for (var i = 0; i < coluna.length; i++) {
      var atual = converterParaIdentificador_(coluna[i][0]);
      if (!atual) {
        if (linhaEstaVazia_(bloco[i])) continue;
        coluna[i][0] = novos[carimbados];
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

    faixa.setNumberFormat('@');
    faixa.setValues(coluna);
    esquecerCacheDaConfiguracao_(nomeDaAba);

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

var estruturasJaLidas = {};

var RECC_ABAS_QUE_VALE_GUARDAR = [
  'CONFIG', 'CATALOGO', 'CORRETORAS', 'CAMPOS', 'PAINEIS', 'ANALISES',
  'NIVEIS_ACESSO', 'USUARIOS'
];

var registrosJaLidos = {};

function chaveDoMemo_(nomeDaAba, opcoes) {
  return nomeDaAba + '|' + (Number(opcoes.ultimas) || 0)
    + '|' + (opcoes.incluirOcultos ? 1 : 0);
}

function valeGuardarNaMemoria_(nomeDaAba) {
  return RECC_ABAS_QUE_VALE_GUARDAR.indexOf(nomeDaAba) >= 0;
}

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

var tiposDeclaradosJaLidos = null;
var lendoTiposDeclarados = false;

function esquecerEstruturaLida_(nomeDaAba) {
  esquecerCacheDaConfiguracao_(nomeDaAba);
  if (nomeDaAba) {
    delete estruturasJaLidas[nomeDaAba];
    esquecerRegistrosLidos_(nomeDaAba);
    if (nomeDaAba === 'CAMPOS') tiposDeclaradosJaLidos = null;
  } else {
    estruturasJaLidas = {};
    esquecerRegistrosLidos_();
    tiposDeclaradosJaLidos = null;

    planilhaDeCadastrosAberta = null;
    jaTenteiAbrirOsCadastros = false;
  }
}

function esquecerRegistrosLidos_(nomeDaAba) {
  if (!nomeDaAba) { registrosJaLidos = {}; return; }
  Object.keys(registrosJaLidos).forEach(function (chave) {
    if (chave.indexOf(nomeDaAba + '|') === 0) delete registrosJaLidos[chave];
  });
}

var RECC_ABAS_DO_CACHE = ['CONFIG', 'CANAIS', 'CAMPOS', 'CATALOGO', 'USUARIOS',
  'SINALIZADORES', 'PAINEIS'];
var RECC_SEGUNDOS_DO_CACHE = 300;
var RECC_PREFIXO_DO_CACHE = 'pgo-config-1|';

var RECC_TAMANHO_DO_PEDACO = 40000;
var RECC_PEDACOS_POR_ABA = 6;

var cacheDaConfiguracaoLido = null;

function cacheDoScript_() {
  try {
    return typeof CacheService === 'undefined' ? null : CacheService.getScriptCache();
  } catch (erro) {
    return null;
  }
}

function vaiParaOCache_(nomeDaAba, opcoes) {
  return RECC_ABAS_DO_CACHE.indexOf(nomeDaAba) >= 0 && !(Number(opcoes.ultimas) > 0);
}

function chavesDoCache_(nomeDaAba, incluirOcultos) {
  var chaves = [];
  for (var i = 0; i < RECC_PEDACOS_POR_ABA; i++) {
    chaves.push(RECC_PREFIXO_DO_CACHE + nomeDaAba + '|' + (incluirOcultos ? 1 : 0) + '#' + i);
  }
  return chaves;
}

function todasAsChavesDoCache_(abas) {
  var chaves = [];
  (abas || RECC_ABAS_DO_CACHE).forEach(function (aba) {
    chaves = chaves.concat(chavesDoCache_(aba, false), chavesDoCache_(aba, true));
  });
  return chaves;
}

function paraOCache_(chave, valor) {
  var bruto = this[chave];
  if (Object.prototype.toString.call(bruto) === '[object Date]') {
    return { $data: isNaN(bruto.getTime()) ? null : bruto.getTime() };
  }
  return valor;
}

function doCache_(chave, valor) {
  if (valor && typeof valor === 'object' && Object.prototype.hasOwnProperty.call(valor, '$data')) {
    return valor.$data === null ? new Date(NaN) : new Date(valor.$data);
  }
  return valor;
}

function lerDoCacheDaConfiguracao_(nomeDaAba, opcoes) {
  var cache = cacheDoScript_();
  if (!cache) return null;
  try {
    if (cacheDaConfiguracaoLido === null) {
      cacheDaConfiguracaoLido = cache.getAll(todasAsChavesDoCache_()) || {};
    }
    var chaves = chavesDoCache_(nomeDaAba, !!opcoes.incluirOcultos);
    var primeiro = cacheDaConfiguracaoLido[chaves[0]];
    if (!primeiro) return null;
    var separador = primeiro.indexOf('|');
    var quantos = Number(primeiro.substring(0, separador));
    var texto = primeiro.substring(separador + 1);
    for (var i = 1; i < quantos; i++) {
      var pedaco = cacheDaConfiguracaoLido[chaves[i]];
      if (typeof pedaco !== 'string') return null;
      texto += pedaco;
    }
    return JSON.parse(texto, doCache_);
  } catch (erro) {
    return null;
  }
}

function guardarNoCacheDaConfiguracao_(nomeDaAba, opcoes, registros) {
  var cache = cacheDoScript_();
  if (!cache) return;
  try {
    var texto = JSON.stringify(registros, paraOCache_);
    var pedacos = [];
    for (var i = 0; i < texto.length; i += RECC_TAMANHO_DO_PEDACO) {
      pedacos.push(texto.substring(i, i + RECC_TAMANHO_DO_PEDACO));
    }
    if (!pedacos.length) pedacos.push('');
    if (pedacos.length > RECC_PEDACOS_POR_ABA) return;
    var chaves = chavesDoCache_(nomeDaAba, !!opcoes.incluirOcultos);
    var valores = {};
    pedacos.forEach(function (pedaco, j) {
      valores[chaves[j]] = j === 0 ? pedacos.length + '|' + pedaco : pedaco;
    });
    cache.putAll(valores, RECC_SEGUNDOS_DO_CACHE);
    if (cacheDaConfiguracaoLido) {
      Object.keys(valores).forEach(function (k) { cacheDaConfiguracaoLido[k] = valores[k]; });
    }
  } catch (erro) {

  }
}

function esquecerCacheDaConfiguracao_(nomeDaAba) {
  var abas = nomeDaAba ? [nomeDaAba] : RECC_ABAS_DO_CACHE;
  if (nomeDaAba && RECC_ABAS_DO_CACHE.indexOf(nomeDaAba) < 0) return;
  var chaves = todasAsChavesDoCache_(abas);
  if (cacheDaConfiguracaoLido) {
    chaves.forEach(function (k) { delete cacheDaConfiguracaoLido[k]; });
  }
  var cache = cacheDoScript_();
  if (!cache) return;
  try { cache.removeAll(chaves); } catch (erro) {   }
}

const RECC_PREFIXO_DO_ENVIO = 'ENVIO.';
const RECC_ENVIO_EM_ANDAMENTO = '@andamento';
const RECC_SEGUNDOS_DO_ENVIO_FEITO = 21600;
const RECC_SEGUNDOS_DO_ENVIO_EM_ANDAMENTO = 600;
const RECC_SEGUNDOS_ESPERANDO_O_ENVIO = 20;

function comEnvioUnico_(envio, gravar) {
  var codigo = String(envio === null || envio === undefined ? '' : envio).trim();
  var cache = cacheDoScript_();
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(codigo) || !cache) return gravar();

  var chave = RECC_PREFIXO_DO_ENVIO + codigo;
  var visto = cache.get(chave);
  for (var i = 0; visto === RECC_ENVIO_EM_ANDAMENTO && i < RECC_SEGUNDOS_ESPERANDO_O_ENVIO; i++) {
    Utilities.sleep(1000);
    visto = cache.get(chave);
  }
  if (visto === RECC_ENVIO_EM_ANDAMENTO) {
    throw new Error('Esta gravação ainda está em andamento no servidor. Aguarde alguns '
      + 'segundos e confira na fila se ela já entrou antes de tentar de novo.');
  }
  if (visto) {
    try { return JSON.parse(visto).resposta; } catch (erro) { return null; }
  }

  cache.put(chave, RECC_ENVIO_EM_ANDAMENTO, RECC_SEGUNDOS_DO_ENVIO_EM_ANDAMENTO);
  var resposta;
  try {
    resposta = gravar();
  } catch (erro) {
    cache.remove(chave);
    throw erro;
  }
  try {
    cache.put(chave, JSON.stringify({ resposta: resposta === undefined ? null : resposta }),
      RECC_SEGUNDOS_DO_ENVIO_FEITO);
  } catch (erro) {

    cache.put(chave, '{"resposta":null}', RECC_SEGUNDOS_DO_ENVIO_FEITO);
  }
  return resposta;
}

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

        mapa[aba][normalizarParaComparar_(cabecalho)] = ehASusep_(cabecalho)
          ? RECC_TIPO_DE_DADO.TEXTO
          : RECC_DO_CAMPO_PARA_O_DADO[campo.TipoCampo] || RECC_TIPO_DE_DADO.TEXTO;
      });
    }
    tiposDeclaradosJaLidos = mapa;
    return mapa;
  } finally {
    lendoTiposDeclarados = false;
  }
}

function normalizarParaComparar_(texto) {
  return String(texto === null || texto === undefined ? '' : texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function emailParaComparar_(texto) {
  return String(texto === null || texto === undefined ? '' : texto).trim().toLowerCase();
}

function chaveDaSusep_(valor) {
  return normalizarParaComparar_(valor);
}

function susepComoSeEscreve_(valor) {
  return String(valor === null || valor === undefined ? '' : valor).trim();
}

function dadosDaTela_(dados) {
  if (dados && typeof dados === 'object' && !Array.isArray(dados)) return dados;
  throw new Error('A tela não mandou os dados deste formulário. Recarregue a página '
    + '(Ctrl+F5) e tente de novo — se continuar, a página guardada no navegador pode '
    + 'ser de uma versão antiga do sistema.');
}

function listaDaTela_(valor) {
  return Array.isArray(valor) ? valor : [];
}

function ehASusep_(chaveOuCabecalho) {
  return normalizarParaComparar_(chaveOuCabecalho) === 'susep';
}

var RECC_DISPONIBILIDADE_QUE_RECEBE = 'Disponível';

function estaDisponivelParaReceber_(usuario) {
  var situacao = String((usuario || {}).Disponibilidade || '').trim();
  if (!situacao) return true;
  return normalizarParaComparar_(situacao)
    === normalizarParaComparar_(RECC_DISPONIBILIDADE_QUE_RECEBE);
}

function apenasDigitos_(texto) {
  return String(texto === null || texto === undefined ? '' : texto).replace(/\D/g, '');
}

function planilhaAtiva_() {

  var planilha = SpreadsheetApp.getActive();
  if (!planilha) {
    throw new Error('Nenhuma planilha vinculada a este projeto do Apps Script.');
  }
  return planilha;
}

function estruturaDaAba_(nomeDaAba, recarregar) {
  if (!recarregar && estruturasJaLidas[nomeDaAba]) return estruturasJaLidas[nomeDaAba];

  var aba = abaOndeQuerQueElaMore_(nomeDaAba);

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

function posicaoDaColuna_(estrutura, cabecalho) {
  var i = estrutura.mapa[normalizarParaComparar_(cabecalho)];
  return i === undefined ? -1 : i;
}

function grafiaDaColuna_(nomeDaAba, cabecalho) {
  var nome = String(cabecalho === null || cabecalho === undefined ? '' : cabecalho).trim();
  if (!nome || !nomeDaAba) return nome;
  var estrutura;
  try {
    estrutura = estruturaDaAba_(nomeDaAba);
  } catch (erro) {
    return nome;
  }
  var posicao = posicaoDaColuna_(estrutura, nome);
  return posicao < 0 ? nome : estrutura.cabecalhos[posicao];
}

function comAsChavesDaAba_(nomeDaAba, valores) {
  var saida = {};
  Object.keys(valores).forEach(function (chave) {
    saida[grafiaDaColuna_(nomeDaAba, chave)] = valores[chave];
  });
  return saida;
}

function exigirPosicaoDaColuna_(estrutura, cabecalho) {
  var i = posicaoDaColuna_(estrutura, cabecalho);
  if (i < 0) {
    throw new Error('A coluna "' + cabecalho + '" não existe na aba "' +
      estrutura.nomeDaAba + '". Colunas encontradas: ' + estrutura.cabecalhos.join(' | '));
  }
  return i;
}

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

    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(texto)) {

    texto = texto.replace(/\./g, '');
  }

  var n = Number(texto);
  if (!isFinite(n)) return '';
  return negativo ? -n : n;
}

function converterParaData_(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return isNaN(valor.getTime()) ? '' : valor;
  }
  var texto = String(valor).trim();
  var br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return diaQueExiste_(Number(br[3]), Number(br[2]), Number(br[1]));
  var iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return diaQueExiste_(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  return '';
}

function diaQueExiste_(ano, mes, dia) {
  var data = new Date(ano, mes - 1, dia);
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1
    || data.getDate() !== dia) return '';
  return data;
}

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
  var texto = String(valor).trim();

  var br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (br) {
    var dia = diaQueExiste_(Number(br[3]), Number(br[2]), Number(br[1]));
    if (!dia) return '';
    if (br[4] !== undefined) {
      var h = Number(br[4]);
      var min = Number(br[5]);
      if (h > 23 || min > 59) return '';
      dia.setHours(h, min, Number(br[6] || 0));
    }
    return dia;
  }
  var d = new Date(texto);
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

      throw new Error('Tipo de coluna desconhecido: "' + tipo + '". ' +
        'Todo tipo declarado em RECC_TIPO_DE_DADO precisa ter um caso em ' +
        'converterParaOTipoDaColuna_.');
  }
}

function formatosDaLinha_(estrutura) {
  return estrutura.tipos.map(function (t) {
    return RECC_FORMATO_DA_CELULA[t] || '@';
  });
}

const RECC_ABAS_QUE_PODEM_VIR_DE_FORA = [
  'CORRETORAS',
  'SUSEP_BLOQUEADAS',
  'ANALISTAS_CENTRAL',
  'ANALISTAS_COBRANCA'
];

const RECC_CHAVE_DA_PLANILHA_DE_CADASTROS = 'CADASTROS.PLANILHA_ID';

const RECC_CHAVE_DAS_ABAS_DE_FORA = 'CADASTROS.ABAS';

var planilhaDeCadastrosAberta = null;
var jaTenteiAbrirOsCadastros = false;

function idDaPlanilhaDeCadastros_() {
  return String(valorDaConfiguracao_(RECC_CHAVE_DA_PLANILHA_DE_CADASTROS, '') || '').trim();
}

function abasQueVemDeFora_() {
  if (!idDaPlanilhaDeCadastros_()) return [];
  var escolhidas = String(valorDaConfiguracao_(RECC_CHAVE_DAS_ABAS_DE_FORA, '') || '')
    .split(',')
    .map(function (nome) { return String(nome).trim().toUpperCase(); })
    .filter(function (nome) { return RECC_ABAS_QUE_PODEM_VIR_DE_FORA.indexOf(nome) >= 0; });
  return escolhidas.length ? escolhidas : RECC_ABAS_QUE_PODEM_VIR_DE_FORA.slice();
}

function abaVemDeOutraPlanilha_(nomeDaAba) {
  if (RECC_ABAS_QUE_PODEM_VIR_DE_FORA.indexOf(nomeDaAba) < 0) return false;
  return abasQueVemDeFora_().indexOf(nomeDaAba) >= 0;
}

function abaOndeQuerQueElaMore_(nomeDaAba) {
  if (abaVemDeOutraPlanilha_(nomeDaAba)) {
    var deFora = planilhaDeCadastros_().getSheetByName(nomeDaAba);
    if (!deFora) {
      throw new Error('A planilha de cadastros abriu, mas não tem uma aba '
        + 'chamada "' + nomeDaAba + '". Crie a aba lá, ou desligue a planilha '
        + 'de cadastros em Configurações › Estrutura para o PGO voltar a usar '
        + 'a aba daqui.');
    }
    return deFora;
  }

  var aqui = planilhaAtiva_().getSheetByName(nomeDaAba);
  if (!aqui) {
    throw new Error('A aba "' + nomeDaAba + '" não existe nesta planilha. ' +
      'Rode instalarRECC() numa planilha vazia, ou confira o nome da aba.');
  }
  return aqui;
}

function planilhaDeCadastros_() {
  if (planilhaDeCadastrosAberta) return planilhaDeCadastrosAberta;

  var id = idDaPlanilhaDeCadastros_();
  if (!id) throw new Error('Nenhuma planilha de cadastros está configurada.');

  if (jaTenteiAbrirOsCadastros) {
    throw new Error('A planilha de cadastros não abriu nesta execução.');
  }
  jaTenteiAbrirOsCadastros = true;

  try {
    planilhaDeCadastrosAberta = SpreadsheetApp.openById(id);
  } catch (erro) {
    throw new Error('Não consegui abrir a planilha de cadastros (' + id + '): '
      + (erro.message || erro) + ' As corretoras, as SUSEPs bloqueadas e as '
      + 'listas de analistas moram nela. Confira se o Id está certo e se a '
      + 'conta que abre o PGO tem acesso a ela — é quase sempre isso. '
      + 'Em Configurações › Estrutura dá para conferir a ligação ou desligá-la.');
  }
  return planilhaDeCadastrosAberta;
}

const RECC_COLUNAS_PARA_ESCREVER_DE_FORA = ['Id', '_Visivel'];

function abaDeForaAceitaEscrita_(nomeDaAba) {
  if (!abaVemDeOutraPlanilha_(nomeDaAba)) return { aceita: true, faltando: [] };

  var estrutura = estruturaDaAba_(nomeDaAba);
  var faltando = RECC_COLUNAS_PARA_ESCREVER_DE_FORA.filter(function (cabecalho) {
    return posicaoDaColuna_(estrutura, cabecalho) < 0;
  });
  return { aceita: faltando.length === 0, faltando: faltando };
}

function deOndeVemAAba_(nomeDaAba) {
  if (!abaVemDeOutraPlanilha_(nomeDaAba)) {
    return { deFora: false, podeEditar: true, faltaParaEditar: [], planilha: '' };
  }

  var pode = abaDeForaAceitaEscrita_(nomeDaAba);
  var nome = '';
  try {
    nome = planilhaDeCadastros_().getName();
  } catch (erro) {

    nome = '';
  }

  return {
    deFora: true,
    podeEditar: pode.aceita,
    faltaParaEditar: pode.faltando,
    planilha: nome
  };
}

function exigirQuePossaEscreverNaAbaDeFora_(nomeDaAba) {
  if (!abaVemDeOutraPlanilha_(nomeDaAba)) return;

  var pode = abaDeForaAceitaEscrita_(nomeDaAba);
  if (pode.aceita) return;

  throw new Error('A aba "' + nomeDaAba + '" vem da planilha de cadastros e '
    + 'ainda não pode ser editada daqui: faltam as colunas '
    + pode.faltando.join(', ') + '. Acrescente-as na primeira linha da aba, lá '
    + 'na planilha de cadastros, e o PGO passa a gravar nela. Enquanto isso, '
    + 'ele continua LENDO a aba normalmente — e para mudar um cadastro, edite '
    + 'a planilha de cadastros direto.');
}

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

function ultimaLinhaComConteudo_(estrutura) {
  return Math.max(estrutura.aba.getLastRow(), 1);
}

function quantidadeDeRegistros_(estrutura) {
  return Math.max(ultimaLinhaComConteudo_(estrutura) - 1, 0);
}

function linhaEstaVazia_(valores) {
  for (var i = 0; i < valores.length; i++) {
    var v = valores[i];
    if (v !== '' && v !== null && v !== undefined) return false;
  }
  return true;
}

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

function lerRegistros_(nomeDaAba, opcoes) {
  opcoes = opcoes || {};

  var chave = chaveDoMemo_(nomeDaAba, opcoes);
  var cacheavel = vaiParaOCache_(nomeDaAba, opcoes);
  var guardar = valeGuardarNaMemoria_(nomeDaAba) || cacheavel;
  if (guardar && registrosJaLidos[chave]) {
    return copiarRegistros_(registrosJaLidos[chave]);
  }
  if (cacheavel) {
    var doCache = lerDoCacheDaConfiguracao_(nomeDaAba, opcoes);
    if (doCache) {
      registrosJaLidos[chave] = doCache;
      return copiarRegistros_(doCache);
    }
  }

  var estrutura = estruturaDaAba_(nomeDaAba);
  var totalDados = quantidadeDeRegistros_(estrutura);
  if (totalDados <= 0) {
    if (cacheavel) guardarNoCacheDaConfiguracao_(nomeDaAba, opcoes, []);
    return [];
  }

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
  if (cacheavel) guardarNoCacheDaConfiguracao_(nomeDaAba, opcoes, saida);
  return guardar ? copiarRegistros_(saida) : saida;
}

function lerColunaInteira_(nomeDaAba, cabecalho) {
  var estrutura = estruturaDaAba_(nomeDaAba);
  var i = exigirPosicaoDaColuna_(estrutura, cabecalho);
  var totalDados = quantidadeDeRegistros_(estrutura);
  if (totalDados <= 0) return [];
  return estrutura.aba.getRange(2, i + 1, totalDados, 1).getValues().map(function (l) {
    return l[0];
  });
}

var RECC_BURACO_QUE_VALE_PULAR = 50;

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

function buscarRegistroVisivel_(nomeDaAba, cabecalho, valor) {
  var achados = buscarRegistros_(nomeDaAba, cabecalho, valor)
    .filter(function (registro) {
      if (!('_Visivel' in registro)) return true;
      return normalizarParaComparar_(registro._Visivel) !== 'nao';
    });
  return achados.length ? achados[achados.length - 1] : null;
}

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
      'Na planilha, apague o Id da linha que é a cópia e rode normalizarBase() '
      + 'no editor do Apps Script: ela dá um Id novo a quem ficou sem.');
  }
  return achadas.length ? achadas[0] : -1;
}

function montarLinhaParaGravar_(estrutura, dados, valoresAtuais) {
  var porChave = {};
  var nomeInformado = {};
  Object.keys(dados).forEach(function (chaveInformada) {

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

function formatarEGravar_(estrutura, primeiraLinha, linhas) {
  var faixa = estrutura.aba.getRange(
    primeiraLinha, 1, linhas.length, estrutura.cabecalhos.length);
  var formatoDaLinha = formatosDaLinha_(estrutura);
  var formatos = linhas.map(function () { return formatoDaLinha; });
  faixa.setNumberFormats(formatos);
  faixa.setValues(linhas);

  esquecerCacheDaConfiguracao_(estrutura.nomeDaAba);
}

function inserirRegistro_(nomeDaAba, dados, contexto) {
  exigirQuePossaEscreverNaAbaDeFora_(nomeDaAba);
  return inserirVariosRegistros_(nomeDaAba, [dados], contexto)[0];
}

function inserirVariosRegistros_(nomeDaAba, lista, contexto) {
  exigirQuePossaEscreverNaAbaDeFora_(nomeDaAba);
  if (!lista || !lista.length) return [];

  var trava = LockService.getScriptLock();
  if (!trava.tryLock(25000)) {
    throw new Error('A planilha está ocupada com outra gravação. Tente de novo.');
  }
  try {
    return inserirComATravaNaMao_(nomeDaAba, lista, contexto);
  } finally {
    trava.releaseLock();
  }
}

function inserirComATravaNaMao_(nomeDaAba, lista, contexto) {
  if (!lista || !lista.length) return [];
  contexto = contexto || {};
  esquecerEstruturaLida_(nomeDaAba);
  var estrutura = estruturaDaAba_(nomeDaAba, true);
  var temControle = posicaoDaColuna_(estrutura, '_Visivel') >= 0;
  var iId = posicaoDaColuna_(estrutura, 'Id');

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
}

function linhaProcuradaAntesDaTrava_(nomeDaAba, id) {
  try {
    return linhaDoRegistro_(estruturaDaAba_(nomeDaAba), id);
  } catch (erro) {
    return -1;
  }
}

function linhaConferidaNaTrava_(estrutura, id, linhaAchada) {
  if (linhaAchada > 1) {
    try {
      var iId = exigirPosicaoDaColuna_(estrutura, 'Id');
      var naLinha = estrutura.aba.getRange(linhaAchada, iId + 1, 1, 1).getValues()[0][0];
      if (converterParaIdentificador_(naLinha) === converterParaIdentificador_(id)) {
        return linhaAchada;
      }
    } catch (erro) {

    }
  }
  return linhaDoRegistro_(estrutura, id);
}

function atualizarRegistro_(nomeDaAba, id, alteracoes) {
  exigirQuePossaEscreverNaAbaDeFora_(nomeDaAba);
  var linhaAchada = linhaProcuradaAntesDaTrava_(nomeDaAba, id);
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(25000)) {
    throw new Error('A planilha está ocupada com outra gravação. Tente de novo.');
  }
  try {
    esquecerEstruturaLida_(nomeDaAba);
    var estrutura = estruturaDaAba_(nomeDaAba, true);
    var linha = linhaConferidaNaTrava_(estrutura, id, linhaAchada);
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

function ocultarRegistro_(nomeDaAba, id, usuarioId) {
  exigirQuePossaEscreverNaAbaDeFora_(nomeDaAba);
  if (posicaoDaColuna_(estruturaDaAba_(nomeDaAba), '_Visivel') < 0) {
    throw new Error('A aba "' + nomeDaAba + '" não tem exclusão lógica — ela ' +
      'não possui a coluna _Visivel. Em abas de catálogo, o que desliga um ' +
      'item é a coluna Ativo.');
  }
  return atualizarRegistro_(nomeDaAba, id, comCarimboSeHouver_(nomeDaAba, {
    _Visivel: RECC_VISIVEL_NAO,
    _ExcluidoEm: new Date(),
    _ExcluidoPor: usuarioId || ''
  }));
}

function comCarimboSeHouver_(nomeDaAba, campos) {
  var estrutura = estruturaDaAba_(nomeDaAba);
  RECC_CARIMBO_DE_EXCLUSAO.forEach(function (cabecalho) {
    if (posicaoDaColuna_(estrutura, cabecalho) < 0) delete campos[cabecalho];
  });
  return campos;
}

function apagarRegistroDeVez_(nomeDaAba, id) {
  exigirQuePossaEscreverNaAbaDeFora_(nomeDaAba);
  var linhaAchada = linhaProcuradaAntesDaTrava_(nomeDaAba, id);
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(25000)) {
    throw new Error('A planilha está ocupada com outra gravação. Tente de novo.');
  }
  try {
    esquecerEstruturaLida_(nomeDaAba);
    var estrutura = estruturaDaAba_(nomeDaAba, true);
    var linha = linhaConferidaNaTrava_(estrutura, id, linhaAchada);
    if (linha < 0) {
      throw new Error('Registro ' + converterParaIdentificador_(id)
        + ' não encontrado na aba "' + nomeDaAba + '".');
    }

    var valores = estrutura.aba
      .getRange(linha, 1, 1, estrutura.cabecalhos.length).getValues()[0];
    var apagado = montarRegistro_(estrutura, valores, linha);

    estrutura.aba.deleteRows(linha, 1);

    esquecerEstruturaLida_(nomeDaAba);
    return apagado;
  } finally {
    trava.releaseLock();
  }
}

function garantirLinhasNaGrade_(aba, ateLinha) {
  var faltam = ateLinha - aba.getMaxRows();
  if (faltam > 0) aba.insertRowsAfter(aba.getMaxRows(), faltam);
}

function adicionarColuna_(nomeDaAba, cabecalho, tipo) {
  exigirQuePossaEscreverNaAbaDeFora_(nomeDaAba);
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

  registrarColunaEmCampos_(nomeDaAba, texto, tipo, nova);
  esquecerEstruturaLida_();

  return { aba: nomeDaAba, cabecalho: texto, tipo: tipo, coluna: nova };
}

function garantirColunasDeControle_(nomeDaAba, ehBaseDeCaso) {
  exigirQuePossaEscreverNaAbaDeFora_(nomeDaAba);

  var criadas = [];
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(25000)) {
    throw new Error('A planilha está ocupada. Tente de novo.');
  }
  try {
    esquecerEstruturaLida_(nomeDaAba);
    var estrutura = estruturaDaAba_(nomeDaAba, true);
    var aba = estrutura.aba;
    var proxima = estrutura.cabecalhos.length;

    colunasDeControleDe_(ehBaseDeCaso).forEach(function (coluna) {
      if (posicaoDaColuna_(estrutura, coluna.cabecalho) >= 0) return;
      proxima++;
      if (aba.getMaxColumns() < proxima) {
        aba.insertColumnsAfter(aba.getMaxColumns(), proxima - aba.getMaxColumns());
      }
      aba.getRange(1, proxima).setNumberFormat('@');
      aba.getRange(1, proxima).setValue(coluna.cabecalho).setFontWeight('bold');
      var altura = Math.max(aba.getMaxRows() - 1, 1);
      aba.getRange(2, proxima, altura, 1)
        .setNumberFormat(RECC_FORMATO_DA_CELULA[coluna.tipo] || '@');
      criadas.push(coluna.cabecalho);

      esquecerEstruturaLida_(nomeDaAba);
      estrutura = estruturaDaAba_(nomeDaAba, true);
      aba = estrutura.aba;
    });
  } finally {
    trava.releaseLock();
  }

  esquecerEstruturaLida_();
  return criadas;
}

function removerColuna_(nomeDaAba, cabecalho) {
  exigirQuePossaEscreverNaAbaDeFora_(nomeDaAba);
  var texto = String(cabecalho || '').trim();
  if (!texto) throw new Error('Diga qual coluna deve sair.');

  var quantasTinhamValor = 0;
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(25000)) {
    throw new Error('A planilha está ocupada com outra gravação. Tente de novo.');
  }
  try {
    esquecerEstruturaLida_(nomeDaAba);
    var estrutura = estruturaDaAba_(nomeDaAba, true);
    var posicao = posicaoDaColuna_(estrutura, texto);
    if (posicao < 0) {
      throw new Error('A aba "' + nomeDaAba + '" não tem coluna "' + texto + '".');
    }

    var aba = estrutura.aba;
    var altura = Math.max(aba.getMaxRows() - 1, 0);
    if (altura > 0) {
      aba.getRange(2, posicao + 1, altura, 1).getValues().forEach(function (linha) {
        if (String(linha[0] === null || linha[0] === undefined ? '' : linha[0]).trim()) {
          quantasTinhamValor++;
        }
      });
    }

    aba.deleteColumns(posicao + 1, 1);

    esquecerEstruturaLida_(nomeDaAba);
  } finally {
    trava.releaseLock();
  }

  esquecerEstruturaLida_();
  return { aba: nomeDaAba, cabecalho: texto, linhasComValor: quantasTinhamValor };
}

function registrarColunaEmCampos_(nomeDaAba, cabecalho, tipo, ordem) {
  if (!planilhaAtiva_().getSheetByName('CAMPOS')) return null;
  if (!planilhaAtiva_().getSheetByName('CANAIS')) return null;

  var canal = lerRegistros_('CANAIS').filter(function (m) {
    return normalizarParaComparar_(m.Aba) === normalizarParaComparar_(nomeDaAba);
  })[0];
  if (!canal) return null;
  var canalId = canal.Id;

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

function colunasDosCamposPorAba_() {
  var porAba = {};
  try {
    if (!planilhaAtiva_().getSheetByName('CAMPOS')) return porAba;
    lerRegistros_('CAMPOS').forEach(function (campo) {
      var nome = String(campo.Aba || '');
      if (!nome) return;
      porAba[nome] = porAba[nome] || {};
      colunasQueOCampoOcupa_(campo).forEach(function (cabecalho) {
        porAba[nome][normalizarParaComparar_(cabecalho)] = true;
      });
    });
  } catch (erro) {
    return {};
  }
  return porAba;
}

function colunasSuasDaAba_(nomeDaAba) {
  var conhecidas = {};
  if (RECC_ESQUEMA[nomeDaAba]) {
    esquemaDaAba_(nomeDaAba).colunas.forEach(function (coluna) {
      conhecidas[normalizarParaComparar_(coluna.cabecalho)] = true;
    });
  }
  var doFormulario = colunasDosCamposPorAba_()[nomeDaAba] || {};
  var suas = {};
  estruturaDaAba_(nomeDaAba).cabecalhos.forEach(function (cabecalho) {
    var chave = normalizarParaComparar_(cabecalho);
    if (!chave || String(cabecalho).charAt(0) === '_') return;
    if (conhecidas[chave] || doFormulario[chave]) return;
    suas[chave] = true;
  });
  return suas;
}

function conferirEstrutura_() {
  var planilha = planilhaAtiva_();
  var laudo = { ok: true, abas: [] };
  var doFormulario = colunasDosCamposPorAba_();

  nomesDasAbasDoContrato_().forEach(function (nomeDaAba) {
    var esquema = esquemaDaAba_(nomeDaAba);
    var item = {
      aba: nomeDaAba,
      existe: false,
      faltando: [],
      aMais: [],
      doFormulario: [],
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

    var camposDaAba = doFormulario[nomeDaAba] || {};
    Object.keys(presentes).forEach(function (chave) {
      if (esperados[chave] !== undefined) return;
      if (camposDaAba[chave]) item.doFormulario.push(presentes[chave]);
      else item.aMais.push(presentes[chave]);
    });

    if (item.faltando.length) laudo.ok = false;
    laudo.abas.push(item);
  });

  return laudo;
}


/* ==== Cadastros.gs ======================================================== */

const RECC_MAXIMO_DE_CORRETORAS = 300;

function tabelaDeCorretoras(procurar, segmento) {
  var quem = exigirTela_('tabelaCorretoras');

  var volumes = volumePorSusep_();
  var termo = normalizarParaComparar_(procurar);
  var segmentoProcurado = normalizarParaComparar_(segmento);

  var todas = lerRegistros_('CORRETORAS').map(function (linha) {
    var susep = susepComoSeEscreve_(linha.SUSEP);
    return {
      id: linha.__id,
      susep: susep,
      corretora: String(linha.Corretora || ''),
      sucursal: String(linha.Sucursal || ''),

      segmento: String(linha.Segmento || '') || 'Não encontrado',
      consultor: String(linha.Consultor || ''),
      casos: volumes.porSusep[chaveDaSusep_(susep)] || 0
    };
  });

  var filtradas = todas.filter(function (uma) {
    if (segmentoProcurado
      && normalizarParaComparar_(uma.segmento) !== segmentoProcurado) return false;
    if (!termo) return true;
    if (normalizarParaComparar_(uma.corretora).indexOf(termo) >= 0) return true;
    if (normalizarParaComparar_(uma.sucursal).indexOf(termo) >= 0) return true;
    if (normalizarParaComparar_(uma.consultor).indexOf(termo) >= 0) return true;

    return chaveDaSusep_(uma.susep).indexOf(termo) >= 0;
  }).sort(function (uma, outra) {

    if (outra.casos !== uma.casos) return outra.casos - uma.casos;
    return uma.corretora < outra.corretora ? -1 : 1;
  });

  return {
    corretoras: filtradas.slice(0, RECC_MAXIMO_DE_CORRETORAS),
    truncada: filtradas.length > RECC_MAXIMO_DE_CORRETORAS,
    quantasNoTotal: todas.length,
    quantasFiltradas: filtradas.length,
    segmentos: segmentosConhecidos_(todas),

    foraDoCadastro: susepsForaDoCadastro_(volumes, todas),
    podeMexer: podeFazer_(quem.permissoes, RECC_ACOES.CONFIGURAR),
    podeExportar: podeFazer_(quem.permissoes, RECC_ACOES.EXPORTAR),

    origem: {
      corretoras: deOndeVemAAba_('CORRETORAS'),
      suseps: deOndeVemAAba_('SUSEP_BLOQUEADAS')
    }
  };
}

function volumePorSusep_() {
  var porSusep = {};
  var nomePorSusep = {};

  var comoSeEscreve = {};

  canaisVisiveis_().forEach(function (canal) {
    var estrutura;
    try {
      estrutura = estruturaDaAba_(canal.aba);
    } catch (erro) {
      return;
    }

    var colunaDaSusep = '';
    var colunaDaCorretora = '';
    estrutura.cabecalhos.forEach(function (cabecalho) {
      var comparavel = normalizarParaComparar_(cabecalho);
      if (comparavel === 'susep') colunaDaSusep = cabecalho;
      if (comparavel === 'corretora') colunaDaCorretora = cabecalho;
    });
    if (!colunaDaSusep) return;

    var suseps = lerColunaInteira_(canal.aba, colunaDaSusep);
    var corretoras = colunaDaCorretora
      ? lerColunaInteira_(canal.aba, colunaDaCorretora) : [];

    for (var i = 0; i < suseps.length; i++) {

      var susep = chaveDaSusep_(suseps[i]);
      if (!susep) continue;
      porSusep[susep] = (porSusep[susep] || 0) + 1;
      if (!comoSeEscreve[susep]) comoSeEscreve[susep] = susepComoSeEscreve_(suseps[i]);
      if (!nomePorSusep[susep] && corretoras[i]) {
        nomePorSusep[susep] = String(corretoras[i]);
      }
    }
  });

  return {
    porSusep: porSusep,
    nomePorSusep: nomePorSusep,
    comoSeEscreve: comoSeEscreve
  };
}

function susepsForaDoCadastro_(volumes, cadastradas) {
  var conhecidas = {};
  cadastradas.forEach(function (uma) {
    if (uma.susep) conhecidas[chaveDaSusep_(uma.susep)] = true;
  });

  var fora = [];
  Object.keys(volumes.porSusep).forEach(function (susep) {
    if (conhecidas[susep]) return;
    fora.push({
      susep: volumes.comoSeEscreve[susep] || susep,

      nomeNosCasos: volumes.nomePorSusep[susep] || '',
      casos: volumes.porSusep[susep]
    });
  });

  return fora.sort(function (uma, outra) { return outra.casos - uma.casos; });
}

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

function salvarCorretora(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');
  dados = dadosDaTela_(dados);

  var susep = susepComoSeEscreve_(dados.susep);
  if (!susep) throw new Error('Informe a SUSEP — é ela que liga a corretora ao caso.');

  var corretora = String(dados.corretora || '').trim();
  if (!corretora) throw new Error('Informe o nome da corretora.');

  var id = converterParaIdentificador_(dados.id);

  var repetida = lerRegistros_('CORRETORAS').filter(function (linha) {
    return chaveDaSusep_(linha.SUSEP) === chaveDaSusep_(susep)
      && converterParaIdentificador_(linha.Id) !== id;
  })[0];
  if (repetida) {
    throw new Error('A SUSEP ' + susep + ' já está cadastrada para "' +
      repetida.Corretora + '". Duas linhas com a mesma SUSEP fariam o selo do ' +
      'formulário escolher uma delas pela ordem da planilha.');
  }

  var campos = {
    SUSEP: susep,
    Corretora: corretora,
    Sucursal: String(dados.sucursal || '').trim(),
    Segmento: String(dados.segmento || '').trim() || 'Não encontrado',
    Consultor: String(dados.consultor || '').trim()
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

var RECC_QUEM_BLOQUEOU = ['Companhia', 'Corretora'];

function quemBloqueou_(texto) {
  var procurado = normalizarParaComparar_(texto);
  return RECC_QUEM_BLOQUEOU.filter(function (tipo) {
    return normalizarParaComparar_(tipo) === procurado;
  })[0] || '';
}

function abaTemBloqueadaPor_() {
  return posicaoDaColuna_(estruturaDaAba_('SUSEP_BLOQUEADAS'), 'BloqueadaPor') >= 0;
}

function comoCriarAColuna_(nomeDaAba, cabecalho) {
  return abaVemDeOutraPlanilha_(nomeDaAba)
    ? 'A aba ' + nomeDaAba + ' da planilha de cadastros ainda não tem a coluna "'
      + cabecalho + '". Acrescente essa coluna lá, na primeira linha.'
    : 'A aba ' + nomeDaAba + ' ainda não tem a coluna "' + cabecalho
      + '". Peça ao administrador para rodar atualizarPGO().';
}

const RECC_MAXIMO_DE_BLOQUEADAS_NA_TELA = 100;

function resumoDasSusepsBloqueadas(procurar) {
  var quem = exigirTela_('tabelaCorretoras');
  var volumes = volumePorSusep_();
  var termo = normalizarParaComparar_(procurar);
  var estrutura = estruturaDaAba_('SUSEP_BLOQUEADAS');
  var coluna = function (cabecalho) {
    return posicaoDaColuna_(estrutura, cabecalho) >= 0
      ? lerColunaInteira_('SUSEP_BLOQUEADAS', cabecalho) : [];
  };

  var suseps = coluna('SUSEP');
  var visiveis = coluna('_Visivel');

  var deProcura = termo ? ['NomeCorretora', 'Sucursal', 'CoordenadorComercial'].map(coluna) : [];

  var quantasNoTotal = 0;
  var candidatas = [];
  for (var i = 0; i < suseps.length; i++) {
    if (visiveis.length && normalizarParaComparar_(visiveis[i]) === 'nao') continue;
    var chave = chaveDaSusep_(suseps[i]);
    if (!chave) continue;
    quantasNoTotal++;
    if (termo && chave.indexOf(termo) < 0 && !deProcura.some(function (valores) {
      return normalizarParaComparar_(valores[i]).indexOf(termo) >= 0;
    })) continue;
    candidatas.push({ linha: i + 2, casos: volumes.porSusep[chave] || 0 });
  }

  candidatas.sort(function (uma, outra) {
    return outra.casos - uma.casos || outra.linha - uma.linha;
  });
  var escolhidas = candidatas.slice(0, RECC_MAXIMO_DE_BLOQUEADAS_NA_TELA);

  var bloqueadas = lerLinhasEspecificas_('SUSEP_BLOQUEADAS',
    escolhidas.map(function (uma) { return uma.linha; }))
    .map(function (linha) {
      var susep = susepComoSeEscreve_(linha.SUSEP);
      return {
        id: linha.__id,
        susep: susep,
        corretora: String(linha.NomeCorretora || ''),
        sucursal: String(linha.Sucursal || ''),
        coordenadorComercial: String(linha.CoordenadorComercial || ''),
        bloqueadaPor: quemBloqueou_(linha.BloqueadaPor),
        bloqueadaEm: linha.BloqueadaEm
          ? Utilities.formatDate(new Date(linha.BloqueadaEm), RECC_FUSO_HORARIO,
            'dd/MM/yyyy')
          : '',
        casos: volumes.porSusep[chaveDaSusep_(susep)] || 0
      };
    });

  return {
    bloqueadas: bloqueadas,
    quantasNoTotal: quantasNoTotal,
    quantasAchadas: candidatas.length,
    truncada: candidatas.length > bloqueadas.length,
    procurar: String(procurar || ''),
    podeMexer: podeFazer_(quem.permissoes, RECC_ACOES.CONFIGURAR)
  };
}

function bloquearSusep(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');
  dados = dadosDaTela_(dados);

  var susep = susepComoSeEscreve_(dados.susep);
  if (!susep) throw new Error('Informe a SUSEP a bloquear.');

  var id = converterParaIdentificador_(dados.id);

  var jaBloqueada = buscarRegistros_('SUSEP_BLOQUEADAS', 'SUSEP', susep).filter(function (linha) {
    if (normalizarParaComparar_(linha._Visivel) === 'nao') return false;
    return chaveDaSusep_(linha.SUSEP) === chaveDaSusep_(susep)
      && converterParaIdentificador_(linha.Id) !== id;
  })[0];
  if (jaBloqueada) {
    throw new Error('A SUSEP ' + susep + ' já está bloqueada.');
  }

  var campos = {
    SUSEP: susep,
    NomeCorretora: String(dados.corretora || '').trim(),
    Sucursal: String(dados.sucursal || '').trim(),
    CoordenadorComercial: String(dados.coordenadorComercial || '').trim()
  };

  var vieramOTipo = dados.bloqueadaPor !== undefined;
  var tipo = quemBloqueou_(dados.bloqueadaPor);
  if ((!id || vieramOTipo) && !tipo) {
    throw new Error('Informe quem bloqueou a SUSEP: a companhia ou a corretora.');
  }
  if (tipo) {
    if (!abaTemBloqueadaPor_()) {
      throw new Error(comoCriarAColuna_('SUSEP_BLOQUEADAS', 'BloqueadaPor'));
    }
    campos.BloqueadaPor = tipo;
  }

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

function desbloquearSusep(idDoBloqueio) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var alvo = converterParaIdentificador_(idDoBloqueio);
  var atual = buscarRegistros_('SUSEP_BLOQUEADAS', 'Id', alvo, 1)[0];
  if (!atual) throw new Error('Este bloqueio não existe.');

  ocultarRegistro_('SUSEP_BLOQUEADAS', alvo, quem.usuario.Id);
  registrarAuditoria_('susep.desbloquear', 'SUSEP_BLOQUEADAS', alvo,
    susepComoSeEscreve_(atual.SUSEP));
  return true;
}

function origemDosCadastros() {
  exigirTela_('tabelaCorretoras');

  var resposta = {};
  ['CORRETORAS', 'SUSEP_BLOQUEADAS'].forEach(function (aba) {
    resposta[aba] = deOndeVemAAba_(aba);
  });
  return resposta;
}

function exportarCorretoras(procurar, segmento) {
  exigirPermissao_(RECC_ACOES.EXPORTAR);
  var tabela = tabelaDeCorretoras(procurar, segmento);

  var linhas = [['SUSEP', 'Corretora', 'Sucursal', 'Segmento', 'Consultor',
    'Casos'].join(';')];

  tabela.corretoras.forEach(function (uma) {
    linhas.push([uma.susep, uma.corretora, uma.sucursal, uma.segmento,
      uma.consultor, uma.casos].join(';'));
  });

  registrarAuditoria_('corretoras.exportar', 'CORRETORAS', '',
    tabela.corretoras.length + ' linhas');
  return { nome: 'corretoras.csv', conteudo: linhas.join('\n') };
}

var RECC_LINHAS_NA_CONFERENCIA = 200;

var RECC_MAXIMO_DA_IMPORTACAO = 2000;

var RECC_IMPORTACOES = {
  corretoras: {
    titulo: 'Corretoras Diamante',
    aba: 'CORRETORAS',
    chave: 'susep',
    explicacao: 'Uma linha por corretora. A SUSEP é o que liga a corretora ao '
      + 'caso, e é por ela que o sistema sabe se a linha é nova ou já existe. '
      + 'Ela tem letra e número — por exemplo RET00J.',
    colunas: [

      { chave: 'susep', titulo: 'SUSEP', coluna: 'SUSEP',
        tipo: 'texto', obrigatoria: true },
      { chave: 'corretora', titulo: 'Corretora', coluna: 'Corretora',
        tipo: 'texto', obrigatoria: true },
      { chave: 'sucursal', titulo: 'Sucursal', coluna: 'Sucursal',
        tipo: 'texto' },
      { chave: 'segmento', titulo: 'Segmento', coluna: 'Segmento',
        tipo: 'texto', padrao: 'Não encontrado' },
      { chave: 'consultor', titulo: 'Consultor', coluna: 'Consultor',
        tipo: 'texto' }
    ]
  },

  susepsBloqueadas: {
    titulo: 'SUSEPs bloqueadas',
    aba: 'SUSEP_BLOQUEADAS',
    chave: 'susep',
    explicacao: 'Uma linha por SUSEP bloqueada. É outra lista, de outro dono: '
      + 'uma SUSEP que esteja no cadastro de corretoras Diamante continua '
      + 'saindo liberada no selo do formulário.',
    colunas: [
      { chave: 'susep', titulo: 'SUSEP', coluna: 'SUSEP',
        tipo: 'texto', obrigatoria: true },
      { chave: 'corretora', titulo: 'Corretora', coluna: 'NomeCorretora',
        tipo: 'texto' },
      { chave: 'sucursal', titulo: 'Sucursal', coluna: 'Sucursal',
        tipo: 'texto' },
      { chave: 'coordenadorComercial', titulo: 'Coordenador comercial',
        coluna: 'CoordenadorComercial', tipo: 'texto' },

      { chave: 'bloqueadaPor', titulo: 'Bloqueada por', coluna: 'BloqueadaPor',
        tipo: 'quemBloqueou' }
    ]
  }
};

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

function separadorDoTexto_(primeiraLinha) {
  if (primeiraLinha.indexOf('\t') >= 0) return '\t';
  if (primeiraLinha.indexOf(';') >= 0) return ';';
  return ',';
}

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

function gradeDoTextoDaImportacao_(texto) {
  var linhas = String(texto || '').split(/\r\n|\r|\n/);

  var cheias = linhas.filter(function (linha) { return linha.trim().length > 0; });
  if (!cheias.length) return [];
  var separador = separadorDoTexto_(cheias[0]);

  var grade = [];
  for (var i = 0; i < linhas.length; i++) {

    if (!linhas[i].trim().length) continue;
    grade.push({
      numero: i + 1,
      celulas: linhas[i].split(separador).map(function (celula) {
        return String(celula).replace(/^"|"$/g, '').trim();
      })
    });
  }
  return grade;
}

function gradeDaPlanilhaDaImportacao_(planilhaId, nomeDaAba) {
  var lida = gradeDeOutraPlanilha_(planilhaId, nomeDaAba);
  var grade = [];
  for (var i = 0; i < lida.length; i++) {
    var celulas = (lida[i] || []).map(function (celula) {
      return String(celula === null || celula === undefined ? '' : celula).trim();
    });
    if (!celulas.join('').length) continue;
    grade.push({ numero: i + 1, celulas: celulas });
  }
  return grade;
}

function gradeDaFonteDoCadastro_(fonte) {
  if (typeof fonte === 'string' || fonte === null || fonte === undefined) {
    return gradeDoTextoDaImportacao_(fonte);
  }
  if (normalizarParaComparar_(fonte.tipo) === 'planilha') {
    return gradeDaPlanilhaDaImportacao_(fonte.planilhaId, fonte.aba);
  }
  return gradeDoTextoDaImportacao_(fonte.texto);
}

function lerGradeDaImportacao_(grade, receita) {
  if (!grade.length) return { ordem: [], linhas: [], tinhaCabecalho: false };

  var primeira = grade[0].celulas;
  var ordem = ordemDasColunas_(primeira, receita);
  var tinhaCabecalho = ehCabecalho_(primeira, receita);
  var comeco = tinhaCabecalho ? 1 : 0;

  var lidas = [];
  for (var i = comeco; i < grade.length; i++) {
    var celulas = grade[i].celulas;
    var valores = {};
    for (var c = 0; c < ordem.length; c++) {
      if (!ordem[c]) continue;
      valores[ordem[c]] = String(celulas[c] === undefined ? '' : celulas[c]).trim();
    }
    lidas.push({ numero: grade[i].numero, valores: valores });
  }
  return { ordem: ordem, linhas: lidas, tinhaCabecalho: tinhaCabecalho };
}

function conferirImportacao_(tipo, fonte) {
  var receita = RECC_IMPORTACOES[tipo];
  if (!receita) {
    throw new Error('Não sei importar "' + tipo + '". Existem: '
      + Object.keys(RECC_IMPORTACOES).join(', ') + '.');
  }

  var lido = lerGradeDaImportacao_(gradeDaFonteDoCadastro_(fonte), receita);
  if (lido.linhas.length > RECC_MAXIMO_DA_IMPORTACAO) {
    throw new Error('São ' + lido.linhas.length + ' linhas, e o limite por vez '
      + 'é ' + RECC_MAXIMO_DA_IMPORTACAO + '. Divida em partes: o Apps Script '
      + 'tem tempo máximo de execução, e uma importação interrompida no meio '
      + 'grava metade.');
  }

  var colunaChave = colunaChaveDaImportacao_(receita);
  var existentes = {};
  lerRegistros_(receita.aba).forEach(function (linha) {
    var chave = chaveDaLinhaDaImportacao_(linha[colunaChave.coluna], colunaChave);
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

    todas: resultado
  };
}

function chaveDaLinhaDaImportacao_(valor, colunaChave) {
  return colunaChave.tipo === 'identificador'
    ? converterParaIdentificador_(valor)
    : normalizarParaComparar_(valor);
}

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

function conferirUmaLinha_(linha, receita, existentes, vistas) {
  var campos = {};
  var problemas = [];

  receita.colunas.forEach(function (coluna) {
    var bruto = linha.valores[coluna.chave];
    var valor = coluna.tipo === 'identificador'
      ? converterParaIdentificador_(bruto)
      : String(bruto === undefined ? '' : bruto).trim();

    if (coluna.tipo === 'quemBloqueou' && valor) {
      if (!quemBloqueou_(valor)) {
        problemas.push(coluna.titulo + ' "' + valor
          + '" — use Companhia ou Corretora');
      }
      valor = quemBloqueou_(valor);
    }

    if (!valor && coluna.padrao) valor = coluna.padrao;
    if (!valor && coluna.obrigatoria) {
      problemas.push(coluna.tipo === 'identificador' && String(bruto || '').trim()
        ? coluna.titulo + ' sem nenhum dígito ("' + bruto + '")'
        : coluna.titulo + ' em branco');
    }
    campos[coluna.chave] = valor;
  });

  var chave = chaveDaLinhaDaImportacao_(campos[receita.chave],
    colunaChaveDaImportacao_(receita));

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

function conferirImportacao(tipo, fonte) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var conferido = conferirImportacao_(tipo, fonte);
  delete conferido.todas;
  return conferido;
}

function aplicarImportacao(tipo, fonte) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');
  exigirSenhaDeAdministrador_();

  var receita = RECC_IMPORTACOES[tipo];
  var conferido = conferirImportacao_(tipo, fonte);

  var faltando = colunasDaImportacaoQueFaltam_(receita);
  var perderia = faltando.filter(function (coluna) {
    return conferido.todas.some(function (linha) {
      return linha.situacao !== 'recusada' && linha.campos[coluna.chave];
    });
  })[0];
  if (perderia) throw new Error(comoCriarAColuna_(receita.aba, perderia.coluna));

  var paraCriar = [];
  var criadas = 0;
  var atualizadas = 0;

  conferido.todas.forEach(function (linha) {
    if (linha.situacao === 'nova') {
      paraCriar.push(camposParaAAba_(linha.campos, receita, true, faltando));
    } else if (linha.situacao === 'atualiza') {
      atualizarRegistro_(receita.aba, linha.id,
        camposParaAAba_(linha.campos, receita, false, faltando));
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

function colunasDaImportacaoQueFaltam_(receita) {
  var estrutura = estruturaDaAba_(receita.aba);
  return receita.colunas.filter(function (coluna) {
    return posicaoDaColuna_(estrutura, coluna.coluna) < 0;
  });
}

function camposParaAAba_(campos, receita, ehNova, faltando) {
  var linha = {};
  receita.colunas.forEach(function (coluna) {
    if ((faltando || []).indexOf(coluna) >= 0) return;
    var valor = campos[coluna.chave];
    if (!valor && !ehNova) return;
    linha[coluna.coluna] = valor || '';
  });

  if (ehNova && receita.aba === 'SUSEP_BLOQUEADAS') {
    linha.BloqueadaEm = new Date();
  }
  return linha;
}


/* ==== Casos.gs ============================================================ */

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

function campoParaATela_(campo, idDoCanal, visibilidade, quem) {
  var configuracao = lerConfiguracaoDoCampo_(campo);

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

    mostrarSe: condicaoDoCampo_(configuracao),

    obrigatorioSe: condicaoDoCampo_({ mostrarSe: configuracao.obrigatorioSe }),
    largura: Number(configuracao.largura) || 1,

    aceitaFuturo: configuracao.aceitaFuturo === true,
    opcoes: opcoesDoCampo_(configuracao, idDoCanal)
  };
}

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

function campoTravadoParaMim_(configuracao, quem) {
  var cargos = configuracao.travaPara;
  if (!Array.isArray(cargos) || !cargos.length) return false;
  if (!quem || !quem.cadastrado) return false;

  if (podeFazer_(quem.permissoes, RECC_ACOES.EDITAR)
    && quem.permissoes.escopo !== RECC_ESCOPOS.PROPRIOS) {
    return false;
  }

  var meuCargo = normalizarParaComparar_(quem.cargo);
  if (!meuCargo) return false;
  return cargos.some(function (cargo) {
    var alvo = normalizarParaComparar_(cargo);
    return alvo !== '' && meuCargo.indexOf(alvo) === 0;
  });
}

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

function condicaoDoCampo_(configuracao) {
  var regra = configuracao && configuracao.mostrarSe;
  if (!regra || !regra.campo) return null;
  var valores = Array.isArray(regra.valores) ? regra.valores
    : (regra.valor === undefined || regra.valor === null ? [] : [regra.valor]);
  valores = valores.map(String).filter(function (valor) { return valor.trim() !== ''; });
  return valores.length ? { campo: String(regra.campo), valores: valores } : null;
}

function condicaoBate_(condicao, valor) {
  function limpar(texto) {
    return String(texto === null || texto === undefined ? '' : texto).trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  var alvo = limpar(valor);
  return condicao.valores.some(function (esperado) { return limpar(esperado) === alvo; });
}

function dependentesQueSomem_(idDoCanal, atual, alteracao) {
  var ativos = camposAtivosDoCanal_(idDoCanal);
  var cabecalhoDe = {};

  ativos.forEach(function (campo) {
    cabecalhoDe[String(campo.ChaveTecnica)] = grafiaDaColuna_(campo.Aba, campo.Cabecalho);
  });

  var colunas = [];
  ativos.forEach(function (campo) {
    var condicao = condicaoDoCampo_(lerConfiguracaoDoCampo_(campo));
    var quemManda = condicao ? cabecalhoDe[condicao.campo] : '';
    if (!quemManda) return;

    var antes = atual[quemManda];
    var depois = Object.prototype.hasOwnProperty.call(alteracao, quemManda)
      ? alteracao[quemManda] : antes;
    if (condicaoBate_(condicao, antes) && !condicaoBate_(condicao, depois)) {
      colunasDoCampo_(campo, { cabecalho: String(campo.Cabecalho) }).forEach(function (bruta) {
        var coluna = grafiaDaColuna_(campo.Aba, bruta);
        if (colunas.indexOf(coluna) < 0) colunas.push(coluna);
      });
    }
  });
  return colunas;
}

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

  if (cadastro === 'corretoras' || cadastro === 'canais') {
    return lerRegistros_('CORRETORAS').map(function (corretora) {
      var nome = String(corretora.Corretora || '');
      return { valor: nome, rotulo: nome };
    });
  }

  if (cadastro === 'analistascentral') {
    return nomesAtivosDoCadastro_('ANALISTAS_CENTRAL');
  }
  if (cadastro === 'analistascobranca') {
    return nomesAtivosDoCadastro_('ANALISTAS_COBRANCA');
  }

  throw new Error('Cadastro desconhecido em listaDe: "' + qualCadastro + '". ' +
    'Os cadastros são usuarios, corretoras, analistasCentral e ' +
    'analistasCobranca.');
}

function nomesAtivosDoCadastro_(nomeDaAba) {
  var registros;
  try {
    registros = lerRegistros_(nomeDaAba);
  } catch (erro) {
    return [];
  }

  return registros
    .filter(function (linha) {

      var ativo = String(linha.Ativo === null || linha.Ativo === undefined
        ? '' : linha.Ativo).trim();
      return !ativo || normalizarParaComparar_(ativo) === 'sim';
    })
    .map(function (linha) { return String(linha.Nome || '').trim(); })
    .filter(function (nome) { return nome !== ''; })
    .sort()
    .map(function (nome) { return { valor: nome, rotulo: nome }; });
}

function canalPeloId_(idDoCanal) {
  var alvo = converterParaIdentificador_(idDoCanal);
  var canais = canaisVisiveis_();
  for (var i = 0; i < canais.length; i++) {
    if (converterParaIdentificador_(canais[i].id) === alvo) return comAGrafiaDaAba_(canais[i]);
  }
  throw new Error('Canal "' + idDoCanal + '" não existe ou está desativado.');
}

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

function validarValores_(idDoCanal, valoresDaTela, quem, ehCasoNovo, registroAtual) {
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var problemas = [];
  var paraGravar = {};
  var ativos = camposAtivosDoCanal_(canal.id);

  function valorQueVaiValer(chave) {
    var quemManda = ativos.filter(function (campo) {
      return String(campo.ChaveTecnica) === chave;
    })[0];
    if (!quemManda) return '';
    var cabecalho = String(quemManda.Cabecalho);
    var valor = valoresDaTela.hasOwnProperty(chave) ? valoresDaTela[chave]
      : (valoresDaTela.hasOwnProperty(cabecalho) ? valoresDaTela[cabecalho]
        : (registroAtual ? valorPelaGrafiaDaAba_(registroAtual, estruturaDaAba_(canal.aba), cabecalho) : ''));
    if (valor === undefined || valor === null) valor = '';
    if (String(valor).trim() === '' && ehCasoNovo) {
      valor = valorPadraoResolvido_(quemManda.ValorPadrao, quem) || '';
    }
    return valor;
  }

  ativos.forEach(function (campo) {
    var visibilidade = visibilidadeDoCampo_(quem.permissoes, campo.ChaveTecnica);

    if (visibilidade !== RECC_VISIBILIDADE.EDICAO) return;

    var descricao = campoParaATela_(campo, canal.id, visibilidade, quem);

    if (descricao.mostrarSe
      && !condicaoBate_(descricao.mostrarSe, valorQueVaiValer(descricao.mostrarSe.campo))) {
      return;
    }

    if (descricao.obrigatorioSe
      && condicaoBate_(descricao.obrigatorioSe, valorQueVaiValer(descricao.obrigatorioSe.campo))) {
      descricao.obrigatorio = true;
    }

    var veioDaTela = valoresDaTela.hasOwnProperty(descricao.chave)
      || valoresDaTela.hasOwnProperty(descricao.cabecalho);
    var bruto = valoresDaTela[descricao.chave];
    if (bruto === undefined) bruto = valoresDaTela[descricao.cabecalho];
    if (bruto === undefined || bruto === null) bruto = '';

    if (ehCasoNovo && String(bruto).trim() === '') {
      bruto = descricao.valorPadrao === undefined || descricao.valorPadrao === null
        ? '' : descricao.valorPadrao;
    }

    var problema = conferirCampo_(descricao, bruto);
    if (problema) {
      problemas.push({ campo: descricao.chave, rotulo: descricao.rotulo, erro: problema });
      return;
    }

    if (String(bruto).trim() === '') {
      if (!ehCasoNovo && veioDaTela && !descricao.somenteLeitura) {
        colunasDoCampo_(campo, descricao).forEach(function (cabecalho) {
          paraGravar[cabecalho] = '';
        });
      }
      return;
    }

    if (typeof bruto === 'string') bruto = bruto.trim();

    var configuracaoDoCampo = lerConfiguracaoDoCampo_(campo);

    var separa = configuracaoDoCampo.separaEm;
    if (separa && separa.codigo && separa.nome) {
      var partes = separarCodigoENome_(bruto);
      paraGravar[separa.codigo] = partes.codigo;
      paraGravar[separa.nome] = partes.nome;
      return;
    }

    var partir = configuracaoDoCampo.partirEm;
    if (partir && partir.colunas && partir.colunas.length > 1) {
      var pedacos;
      try {
        pedacos = partirPorHifen_(bruto, partir, descricao.rotulo);
      } catch (erro) {
        problemas.push({ campo: descricao.chave, rotulo: descricao.rotulo,
          erro: erro.message });
        return;
      }
      partir.colunas.forEach(function (cabecalho, i) {
        paraGravar[cabecalho] = pedacos[i];
      });
      return;
    }

    if (descricao.tipo === 'documento' && !ehASusep_(descricao.chave)
      && !ehASusep_(descricao.cabecalho)) bruto = apenasDigitos_(bruto);

    var naoCabe = valorQueNaoCabeNaColuna_(canal.aba, descricao.cabecalho, bruto);
    if (naoCabe) {
      problemas.push({ campo: descricao.chave, rotulo: descricao.rotulo, erro: naoCabe });
      return;
    }

    paraGravar[descricao.cabecalho] = bruto;
  });

  paraGravar = comAsChavesDaAba_(canal.aba, paraGravar);

  if (!ehCasoNovo && registroAtual) {
    dependentesQueSomem_(canal.id, registroAtual, paraGravar).forEach(function (coluna) {
      paraGravar[coluna] = '';
    });
  }

  if (problemas.length) {
    var erro = new Error('Confira ' + problemas.length + ' campo(s): '
      + problemas.map(function (p) { return p.rotulo + ' — ' + p.erro; }).join('; '));
    erro.problemas = problemas;
    throw erro;
  }
  return paraGravar;
}

function colunasDoCampo_(campo, descricao) {
  var configuracao = lerConfiguracaoDoCampo_(campo);
  var separa = configuracao.separaEm;
  if (separa && separa.codigo && separa.nome) return [separa.codigo, separa.nome];
  var partir = configuracao.partirEm;
  if (partir && partir.colunas && partir.colunas.length > 1) return partir.colunas.slice();
  return [descricao.cabecalho];
}

function conferirCampo_(campo, valor) {
  var texto = String(valor === null || valor === undefined ? '' : valor).trim();

  if (texto === '') {
    return campo.obrigatorio ? 'é obrigatório' : '';
  }

  if (ehASusep_(campo.chave) || ehASusep_(campo.cabecalho)) return '';

  if (campo.tipo === 'identificador' || campo.tipo === 'documento') {
    var digitos = converterParaIdentificador_(texto);
    if (!digitos) return 'precisa ter ao menos um dígito';

    var aceitos = String(campo.mascara || '').split('|')
      .map(quantosDigitosAMascaraPede_)
      .filter(function (quantos) { return quantos > 0; });
    var veio = digitos.replace(/;/g, '').length;
    if (aceitos.length && aceitos.indexOf(veio) < 0) {
      return 'precisa ter ' + aceitos.join(' ou ') + ' dígitos (veio com '
        + veio + ')';
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
    if (dataEstaNoFuturo_(data) && !campo.aceitaFuturo) {
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

var RECC_O_QUE_A_COLUNA_GUARDA = {
  identificador: 'um código só de dígitos', numero: 'número', dinheiro: 'valor em dinheiro',
  data: 'data', dataHora: 'data e hora', hora: 'hora', simOuNao: 'Sim ou Não'
};

function valorQueNaoCabeNaColuna_(nomeDaAba, cabecalho, valor) {
  if (String(valor === null || valor === undefined ? '' : valor).trim() === '') return '';
  var estrutura = estruturaDaAba_(nomeDaAba);
  var posicao = posicaoDaColuna_(estrutura, cabecalho);
  if (posicao < 0) return '';
  var tipo = estrutura.tipos[posicao];
  if (!RECC_O_QUE_A_COLUNA_GUARDA[tipo]) return '';
  var convertido = converterParaOTipoDaColuna_(valor, tipo);
  if (convertido !== '' && convertido !== null && convertido !== undefined) return '';
  return 'a coluna "' + estrutura.cabecalhos[posicao] + '" da planilha guarda '
    + RECC_O_QUE_A_COLUNA_GUARDA[tipo] + ', e "' + String(valor).trim().slice(0, 60)
    + '" ficaria em branco nela. Escolha outro valor, ou peça para ajustar o tipo da coluna';
}

function quantosDigitosAMascaraPede_(mascara) {
  var zeros = String(mascara || '').match(/0/g);
  return zeros ? zeros.length : 0;
}

function dataEstaNoFuturo_(data) {
  var agora = new Date();
  var hojeAqui = Utilities.formatDate(agora, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
  var aDataDela = Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
  return aDataDela > hojeAqui;
}

function cadastrarCaso(idDoCanal, valores, envio) {
  return comEnvioUnico_(envio, function () { return cadastrarCasoUmaVez_(idDoCanal, valores); });
}

function cadastrarCasoUmaVez_(idDoCanal, valores) {
  var quem = exigirPermissao_(RECC_ACOES.CRIAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var paraGravar = validarValores_(canal.id, valores || {}, quem, true);
  preencherEntradaAutomatica_(canal, paraGravar);
  preencherResponsavelAutomatico_(canal, paraGravar, quem);
  carimbarOStatusDeNascimento_(canal, paraGravar);
  carimbarOEncaminhamento_(canal, null, paraGravar);
  carimbarAParadaDoPrazo_(canal, null, paraGravar);
  carimbarOsItensDeLista_(canal, null, paraGravar);
  preencherColunasCalculadas_(canal.aba, paraGravar, {});

  var gravado = inserirRegistro_(canal.aba, paraGravar, { origem: RECC_ORIGEM_SISTEMA });
  registrarAuditoria_('caso.criar', canal.aba, gravado.__id, canal.nome);

  return { id: gravado.__id, canal: canal.nome, aba: canal.aba };
}

function editarCaso(idDoCanal, idDoCaso, valores, versaoQueAbriu, colunasSuas, envio) {
  return comEnvioUnico_(envio, function () {
    return editarCasoUmaVez_(idDoCanal, idDoCaso, valores, versaoQueAbriu, colunasSuas);
  });
}

function editarCasoUmaVez_(idDoCanal, idDoCaso, valores, versaoQueAbriu, colunasSuas) {
  var quem = exigirPermissao_(RECC_ACOES.EDITAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var alvo = converterParaIdentificador_(idDoCaso);
  if (!alvo) throw new Error('Informe qual caso deve ser alterado.');

  var atual = buscarRegistros_(canal.aba, 'Id', alvo, 1)[0];
  if (!atual) {
    throw new Error('O caso ' + alvo + ' não existe no canal ' + canal.nome + '.');
  }
  exigirAlcanceSobre_(atual, canal, quem);

  if (versaoQueAbriu && versaoQueAbriu !== versaoDoCaso_(atual, canal.aba)) {
    throw new Error('Este caso foi alterado por outra pessoa depois que você o '
      + 'abriu. Para não apagar a mudança dela, nada foi gravado: feche, abra o '
      + 'caso de novo e refaça a sua alteração.');
  }

  var paraGravar = validarValores_(canal.id, valores || {}, quem, false, atual);
  acrescentarColunasSuas_(canal, colunasSuas, paraGravar);

  carimbarSeOStatusMudou_(canal, atual, paraGravar, quem);
  carimbarOEncaminhamento_(canal, atual, paraGravar);
  carimbarAParadaDoPrazo_(canal, atual, paraGravar);
  carimbarOsItensDeLista_(canal, atual, paraGravar);

  preencherColunasCalculadas_(canal.aba, paraGravar, atual);

  atualizarRegistro_(canal.aba, alvo, paraGravar);
  registrarAuditoria_('caso.editar', canal.aba, alvo, canal.nome);

  return { id: alvo, canal: canal.nome };
}

function acrescentarColunasSuas_(canal, colunasSuas, paraGravar) {
  if (!colunasSuas || typeof colunasSuas !== 'object') return;
  var nomes = Object.keys(colunasSuas);
  if (!nomes.length) return;

  var suas = colunasSuasDaAba_(canal.aba);
  nomes.forEach(function (nome) {
    if (!suas[normalizarParaComparar_(nome)]) {
      throw new Error('A coluna "' + nome + '" não se edita no "Trabalhar no caso": ela é '
        + 'do sistema ou de um campo do formulário.');
    }
    var valor = colunasSuas[nome];
    paraGravar[grafiaDaColuna_(canal.aba, nome)] =
      String(valor === null || valor === undefined ? '' : valor).trim();
  });
}

function alterarSituacaoDoCaso(idDoCanal, idDoCaso, situacaoNova, valoresDosCampos, envio) {
  return comEnvioUnico_(envio, function () {
    return alterarSituacaoDoCasoUmaVez_(idDoCanal, idDoCaso, situacaoNova, valoresDosCampos);
  });
}

function alterarSituacaoDoCasoUmaVez_(idDoCanal, idDoCaso, situacaoNova, valoresDosCampos) {
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
  var achada = situacaoDoCanalPeloValor_(canal, escolhida);
  if (!achada) {
    throw new Error('A situação "' + escolhida + '" não existe no canal ' +
      canal.nome + '. As situações dele são: ' + conhecidas.map(function (uma) {
        return uma.gravadoComo;
      }).join(', ') + '.');
  }

  var alteracao = {};
  alteracao[canal.colunaDoStatus] = achada.gravadoComo;

  gravarOsCamposDaSituacao_(canal, quem, atual, achada.gravadoComo,
    valoresDosCampos || {}, alteracao);

  if (canal.colunaDaFinalizacao && !atual[canal.colunaDaFinalizacao]
    && !jaVeioNaAlteracao_(alteracao, canal.colunaDaFinalizacao)
    && normalizarParaComparar_(achada.gravadoComo).indexOf('conclu') === 0) {
    alteracao[canal.colunaDaFinalizacao] = new Date();
  }

  dependentesQueSomem_(canal.id, atual, alteracao).forEach(function (coluna) {
    alteracao[coluna] = '';
  });
  carimbarAParadaDoPrazo_(canal, atual, alteracao);

  carimbarOStatus_(canal, achada, atual, alteracao);
  registrarAMudancaDeStatus_(canal, atual, alteracao, quem);

  atualizarRegistro_(canal.aba, alvo, alteracao);

  return { id: alvo, situacao: achada.gravadoComo, tom: achada.tom };
}

function camposPedidosPelaSituacao_(canal, quem, situacao) {
  var doStatus = '';
  var ativos = camposAtivosDoCanal_(canal.id);
  ativos.forEach(function (campo) {
    if (normalizarParaComparar_(campo.Cabecalho) === normalizarParaComparar_(canal.colunaDoStatus)) {
      doStatus = String(campo.ChaveTecnica);
    }
  });
  if (!doStatus) return [];
  var pedidos = [];
  ativos.forEach(function (campo) {
    if (String(campo.ChaveTecnica) === doStatus) return;
    if (visibilidadeDoCampo_(quem.permissoes, campo.ChaveTecnica) !== RECC_VISIBILIDADE.EDICAO) return;
    var descricao = campoParaATela_(campo, canal.id, RECC_VISIBILIDADE.EDICAO, quem);
    var aparece = descricao.mostrarSe && descricao.mostrarSe.campo === doStatus
      && condicaoBate_(descricao.mostrarSe, situacao);
    var cobrado = descricao.obrigatorioSe && descricao.obrigatorioSe.campo === doStatus
      && condicaoBate_(descricao.obrigatorioSe, situacao);

    if (descricao.mostrarSe && descricao.mostrarSe.campo !== doStatus) return;
    if (!aparece && !cobrado) return;
    if (cobrado) descricao.obrigatorio = true;
    if (descricao.mostrarSe && !aparece) return;
    pedidos.push(descricao);
  });
  return pedidos;
}

function camposDaSituacao(idDoCanal, idDoCaso, situacao) {
  var quem = exigirPermissao_(RECC_ACOES.EDITAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var atual = buscarRegistros_(canal.aba, 'Id', converterParaIdentificador_(idDoCaso), 1)[0];
  if (!atual) throw new Error('O caso ' + idDoCaso + ' não existe no canal ' + canal.nome + '.');
  exigirAlcanceSobre_(atual, canal, quem);
  var estrutura = estruturaDaAba_(canal.aba);
  return camposPedidosPelaSituacao_(canal, quem, String(situacao || '')).map(function (descricao) {

    var valor = valorPelaGrafiaDaAba_(atual, estrutura, descricao.cabecalho);
    var tipoDaColuna = estrutura.tipos[posicaoDaColuna_(estrutura, descricao.cabecalho)];
    descricao.valor = Object.prototype.toString.call(valor) === '[object Date]'
      ? paraTexto_(valor, tipoDaColuna) : (valor === null || valor === undefined ? '' : valor);

    descricao.mostrarSe = null;
    descricao.obrigatorioSe = null;
    return descricao;
  });
}

function gravarOsCamposDaSituacao_(canal, quem, atual, situacao, valores, alteracao) {
  var estrutura = estruturaDaAba_(canal.aba);
  var problemas = [];
  camposPedidosPelaSituacao_(canal, quem, situacao).forEach(function (descricao) {
    var veio = Object.prototype.hasOwnProperty.call(valores, descricao.chave);
    var bruto = veio ? valores[descricao.chave]
      : valorPelaGrafiaDaAba_(atual, estrutura, descricao.cabecalho);
    if (bruto === null || bruto === undefined) bruto = '';
    if (typeof bruto === 'string') bruto = bruto.trim();
    var problema = conferirCampo_(descricao, bruto)
      || valorQueNaoCabeNaColuna_(canal.aba, descricao.cabecalho, bruto);
    if (problema) {
      problemas.push(descricao.rotulo + ' — ' + problema);
      return;
    }
    if (veio) alteracao[grafiaDaColuna_(canal.aba, descricao.cabecalho)] = bruto;
  });
  if (problemas.length) {
    throw new Error('Para "' + situacao + '", confira: ' + problemas.join('; ') + '.');
  }
}

function carimbarOStatus_(canal, situacao, registroAtual, alteracao) {
  var coluna = String(situacao.colunaDeCarimbo || '').trim();
  if (!coluna) return;

  var estrutura = estruturaDaAba_(canal.aba);
  var posicao = posicaoDaColuna_(estrutura, coluna);
  if (posicao < 0) return;
  coluna = estrutura.cabecalhos[posicao];

  var jaTem = String(registroAtual[coluna] || '').trim();
  if (jaTem) return;

  if (jaVeioNaAlteracao_(alteracao, coluna)) return;

  alteracao[coluna] = carimboParaAColuna_(estrutura, posicao);
}

function jaVeioNaAlteracao_(alteracao, coluna) {
  var procurada = normalizarParaComparar_(coluna);
  return Object.keys(alteracao).some(function (chave) {
    var valor = alteracao[chave];
    return normalizarParaComparar_(chave) === procurada
      && String(valor === null || valor === undefined ? '' : valor).trim() !== '';
  });
}

function carimboParaAColuna_(estrutura, posicao) {
  var tipo = estrutura.tipos[posicao];
  var agora = new Date();
  if (tipo === RECC_TIPO_DE_DADO.DATA || tipo === RECC_TIPO_DE_DADO.DATA_HORA) return agora;
  return Utilities.formatDate(agora, RECC_FUSO_HORARIO, 'dd/MM/yyyy HH:mm');
}

function situacaoDoCanalPeloValor_(canal, valor) {
  var procurado = normalizarParaComparar_(String(valor || '').trim());
  if (!procurado) return null;

  var achada = null;
  situacoesDoCanal_(canal).forEach(function (uma) {
    if (normalizarParaComparar_(uma.gravadoComo) === procurado) achada = uma;
  });
  return achada;
}

function carimbarSeOStatusMudou_(canal, registroAtual, alteracao, quem) {
  if (!canal.colunaDoStatus) return;
  if (!alteracao.hasOwnProperty(canal.colunaDoStatus)) return;

  var agora = String(alteracao[canal.colunaDoStatus] || '').trim();
  var antes = String(registroAtual[canal.colunaDoStatus] || '').trim();
  if (!agora) return;
  if (normalizarParaComparar_(agora) === normalizarParaComparar_(antes)) return;

  var achada = situacaoDoCanalPeloValor_(canal, agora);
  if (achada) carimbarOStatus_(canal, achada, registroAtual, alteracao);
  registrarAMudancaDeStatus_(canal, registroAtual, alteracao, quem);
}

function carimbarOStatusDeNascimento_(canal, paraGravar) {
  if (!canal.colunaDoStatus) return;

  var achada = situacaoDoCanalPeloValor_(canal, paraGravar[canal.colunaDoStatus]);
  if (!achada) return;

  carimbarOStatus_(canal, achada, paraGravar, paraGravar);

  carimbarAPrimeiraMudancaDeStatus_(canal, null, paraGravar, estruturaDaAba_(canal.aba));
}

function carimbarOEncaminhamento_(canal, registroAtual, paraGravar) {
  var area = String(canal.colunaDaAreaResponsavel || '').trim();
  if (!area || !paraGravar.hasOwnProperty(area)) return;

  var estrutura = estruturaDaAba_(canal.aba);
  if (posicaoDaColuna_(estrutura, RECC_COLUNA_DATA_DO_ENCAMINHAMENTO) < 0) return;

  var agora = String(paraGravar[area] || '').trim();
  var antes = registroAtual ? String(registroAtual[area] || '').trim() : '';
  if (normalizarParaComparar_(agora) === normalizarParaComparar_(antes)) return;

  paraGravar[RECC_COLUNA_DATA_DO_ENCAMINHAMENTO] = agora ? new Date() : '';
}

function carimbarAParadaDoPrazo_(canal, registroAtual, paraGravar) {
  condicoesDeParadaDoCanal_(canal).forEach(function (sinalizador) {
    var coluna = sinalizador.colunaDaCondicao;
    if (!Object.prototype.hasOwnProperty.call(paraGravar, coluna)) return;

    var estrutura = estruturaDaAba_(canal.aba);
    if (posicaoDaColuna_(estrutura, sinalizador.colunaDaDataDaCondicao) < 0) return;

    var agora = String(paraGravar[coluna] || '').trim();
    var antes = registroAtual ? String(registroAtual[coluna] || '').trim() : '';
    if (normalizarParaComparar_(agora) === normalizarParaComparar_(antes)) return;

    paraGravar[sinalizador.colunaDaDataDaCondicao] =
      condicaoBate_({ valores: sinalizador.valoresDaCondicao }, agora) ? new Date() : '';
  });
}

function carimbarOsItensDeLista_(canal, registroAtual, paraGravar) {
  var estrutura = estruturaDaAba_(canal.aba);
  var doCanal = converterParaIdentificador_(canal.id);
  var catalogo = null;

  lerRegistros_('CAMPOS').forEach(function (campo) {
    if (converterParaIdentificador_(campo.CanalId) !== doCanal) return;
    if (String(campo.TipoCampo || '') !== 'seletor') return;
    var configuracao = lerConfiguracaoDoCampo_(campo);
    var lista = normalizarParaComparar_(configuracao.catalogo);
    if (!lista || lista === 'status') return;
    if (configuracao.separaEm || configuracao.partirEm) return;

    var coluna = grafiaDaColuna_(canal.aba, campo.Cabecalho);
    if (!Object.prototype.hasOwnProperty.call(paraGravar, coluna)) return;
    var agora = String(paraGravar[coluna] || '').trim();
    var antes = registroAtual ? String(registroAtual[coluna] || '').trim() : '';
    if (!agora || normalizarParaComparar_(agora) === normalizarParaComparar_(antes)) return;

    catalogo = catalogo || lerRegistros_('CATALOGO');
    var item = null;
    catalogo.forEach(function (um) {
      if (item) return;
      if (normalizarParaComparar_(um.Tipo) !== lista) return;
      var canalDoItem = converterParaIdentificador_(um.CanalId);
      if (canalDoItem && canalDoItem !== doCanal) return;
      if (normalizarParaComparar_(um.Nome) === normalizarParaComparar_(agora)) item = um;
    });
    if (!item || !String(item.ColunaDeCarimbo || '').trim()) return;

    var posicao = posicaoDaColuna_(estrutura, item.ColunaDeCarimbo);
    if (posicao < 0) return;
    var destino = estrutura.cabecalhos[posicao];

    var jaTem = registroAtual ? String(registroAtual[destino] || '').trim() : '';
    if (jaTem || String(paraGravar[destino] || '').trim()) return;
    paraGravar[destino] = carimboParaAColuna_(estrutura, posicao);
  });
}

function registrarAMudancaDeStatus_(canal, registroAtual, alteracao, quem) {
  var estrutura = estruturaDaAba_(canal.aba);

  function temAColuna(cabecalho) {
    return posicaoDaColuna_(estrutura, cabecalho) >= 0;
  }

  if (temAColuna(RECC_COLUNA_QUANDO_MUDOU_O_STATUS)) {
    alteracao[RECC_COLUNA_QUANDO_MUDOU_O_STATUS] = new Date();
  }
  if (temAColuna(RECC_COLUNA_QUEM_MUDOU_O_STATUS)) {

    alteracao[RECC_COLUNA_QUEM_MUDOU_O_STATUS] = quem.email || '';
  }
  carimbarAPrimeiraMudancaDeStatus_(canal, registroAtual, alteracao, estrutura);
  if (temAColuna(RECC_COLUNA_QUANTAS_MUDANCAS_DE_STATUS)) {

    var quantas = Number(registroAtual[RECC_COLUNA_QUANTAS_MUDANCAS_DE_STATUS]);
    if (!quantas || quantas < 0) quantas = 0;
    alteracao[RECC_COLUNA_QUANTAS_MUDANCAS_DE_STATUS] = Math.floor(quantas) + 1;
  }
}

function carimbarAPrimeiraMudancaDeStatus_(canal, registroAtual, alteracao, estrutura) {
  var coluna = RECC_COLUNA_DATA_DA_PRIMEIRA_MUDANCA_DE_STATUS;
  if (!canal.colunaDoStatus || posicaoDaColuna_(estrutura, coluna) < 0) return;
  if (registroAtual && String(registroAtual[coluna] || '').trim()) return;
  if (String(alteracao[coluna] || '').trim()) return;

  var novo = normalizarParaComparar_(alteracao[canal.colunaDoStatus]);
  if (!novo || novo === normalizarParaComparar_(statusPadraoDoCanal_(canal))) return;
  alteracao[coluna] = new Date();
}

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

  var deAlgumCampo = {};

  camposAtivosDoCanal_(canal.id).forEach(function (campo) {
    colunasQueOCampoOcupa_(campo).forEach(function (cabecalho) {
      deAlgumCampo[normalizarParaComparar_(cabecalho)] = true;
    });

    var valor = valorDoCampoNaLinha_(registro, campo, estrutura);
    if (valor === null) return;
    valores[String(campo.ChaveTecnica)] = valor;
  });

  var suas = colunasSuasDaAba_(canal.aba);
  var doSistema = [];
  estrutura.cabecalhos.forEach(function (cabecalho, posicao) {
    var nome = String(cabecalho || '');
    if (!nome || nome.charAt(0) === '_') return;
    if (normalizarParaComparar_(nome) === 'id') return;
    if (deAlgumCampo[normalizarParaComparar_(nome)]) return;

    var valor = paraTexto_(registro[nome], estrutura.tipos[posicao]);
    if (!String(valor).trim()) return;
    doSistema.push({ rotulo: nome, valor: valor,
      editavel: suas[normalizarParaComparar_(nome)] === true });
  });

  return { id: registro.__id, canal: canal.nome, valores: valores, doSistema: doSistema,
    versao: versaoDoCaso_(registro, canal.aba) };
}

function versaoDoCaso_(registro, nomeDaAba) {
  var texto = estruturaDaAba_(nomeDaAba).cabecalhos.map(function (cabecalho) {
    var valor = registro[cabecalho];
    if (Object.prototype.toString.call(valor) === '[object Date]') return String(valor.getTime());
    return valor === null || valor === undefined ? '' : String(valor);
  }).join('\u0001');

  var resumo = 0x811c9dc5;
  for (var i = 0; i < texto.length; i++) {
    resumo ^= texto.charCodeAt(i);
    resumo = Math.imul(resumo, 0x01000193) >>> 0;
  }
  return texto.length + '-' + resumo.toString(16);
}

function excluirCaso(idDoCanal, idDoCaso) {

  var quem = usuarioAtual_();
  if (!quem.cadastrado) throw new Error(quem.motivo);

  var canal = canalPeloId_(idDoCanal);
  var alvo = converterParaIdentificador_(idDoCaso);

  var atual = buscarRegistros_(canal.aba, 'Id', alvo, 1)[0];
  if (!atual) {
    throw new Error('O caso ' + alvo + ' não existe no canal ' + canal.nome + '.');
  }

  registrarAuditoria_('caso.excluir', canal.aba, alvo,
    canal.nome + ' — ' + resumoDoCasoParaAuditoria_(atual, canal));

  apagarRegistroDeVez_(canal.aba, alvo);
  return true;
}

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

function exigirAlcanceSobre_(registro, canal, quem) {
  var alcance = filtrarPeloAlcance_([registro], canal.aba, quem);
  if (alcance.length) return;

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

function separarCodigoENome_(valor) {
  var texto = String(valor || '').trim();
  var corte = texto.indexOf('-');
  if (corte < 0) return { codigo: '', nome: texto };

  var codigo = texto.substring(0, corte).trim();
  var nome = texto.substring(corte + 1).trim();

  var pareceCodigo = codigo.length <= 10
    && /^[0-9A-Za-z.]+$/.test(codigo)
    && /[0-9]/.test(codigo);
  if (!pareceCodigo) return { codigo: '', nome: texto };
  return { codigo: codigo, nome: nome };
}

function partirPorHifen_(valor, partir, rotulo) {
  var quantas = partir.colunas.length;
  var texto = String(valor || '').trim();
  var pedacos = texto.split('-').map(function (pedaco) {
    return String(pedaco).trim();
  });

  function recusar(porque) {
    return new Error(porque + ' Escreva com '
      + (quantas - 1) + ' hífen' + (quantas > 2 ? 's' : '')
      + (partir.exemplo ? ', assim: ' + partir.exemplo : '')
      + '. Cada pedaço vai para uma coluna da planilha: '
      + partir.colunas.join(', ') + '.');
  }

  if (pedacos.length !== quantas) {
    throw recusar('"' + texto + '" tem ' + pedacos.length + ' pedaço(s), e o '
      + 'campo "' + rotulo + '" pede ' + quantas + '.');
  }

  for (var i = 0; i < quantas; i++) {
    if (!pedacos[i]) {
      throw recusar('O ' + (i + 1) + 'º pedaço de "' + texto + '" está vazio.');
    }
    if (!/^[0-9]+$/.test(pedacos[i])) {
      throw recusar('O pedaço "' + pedacos[i] + '" tem algo que não é dígito.');
    }
  }
  return pedacos;
}

function juntarComHifen_(registro, partir, estrutura) {
  var pedacos = partir.colunas.map(function (cabecalho) {
    var valor = valorPelaGrafiaDaAba_(registro, estrutura, cabecalho);
    return String(valor === null || valor === undefined ? '' : valor).trim();
  }).filter(function (pedaco) { return pedaco !== ''; });

  return pedacos.join('-');
}

function juntarCodigoENome_(registro, separa, estrutura) {
  var noCodigo = valorPelaGrafiaDaAba_(registro, estrutura, separa.codigo);
  var noNome = valorPelaGrafiaDaAba_(registro, estrutura, separa.nome);
  var codigo = String(noCodigo === null || noCodigo === undefined ? '' : noCodigo).trim();
  var nome = String(noNome === null || noNome === undefined ? '' : noNome).trim();

  if (codigo && nome) return codigo + ' - ' + nome;
  return codigo || nome;
}

function valorDoCampoNaLinha_(registro, campo, estrutura) {
  var configuracao = lerConfiguracaoDoCampo_(campo);

  var separa = configuracao.separaEm;
  if (separa && separa.codigo && separa.nome) {
    return juntarCodigoENome_(registro, separa, estrutura);
  }

  var partir = configuracao.partirEm;
  if (partir && partir.colunas && partir.colunas.length > 1) {
    return juntarComHifen_(registro, partir, estrutura);
  }

  var posicao = posicaoDaColuna_(estrutura, campo.Cabecalho);
  if (posicao < 0) return null;
  return paraTexto_(registro[estrutura.cabecalhos[posicao]], estrutura.tipos[posicao]);
}

function valorPelaGrafiaDaAba_(registro, estrutura, cabecalho) {
  if (!estrutura) return registro[cabecalho];
  var posicao = posicaoDaColuna_(estrutura, cabecalho);
  return posicao < 0 ? undefined : registro[estrutura.cabecalhos[posicao]];
}

function colunasQueOCampoOcupa_(campo) {
  var configuracao = lerConfiguracaoDoCampo_(campo);

  var separa = configuracao.separaEm;
  if (separa && separa.codigo && separa.nome) return [separa.codigo, separa.nome];

  var partir = configuracao.partirEm;
  if (partir && partir.colunas && partir.colunas.length > 1) {
    return partir.colunas.slice();
  }

  return [String(campo.Cabecalho)];
}

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

function preencherResponsavelAutomatico_(canal, paraGravar, quem) {
  var estrutura = estruturaDaAba_(canal.aba);
  var coluna = colunaDoResponsavel_(estrutura);
  if (coluna && !paraGravar[coluna]) paraGravar[coluna] = quem.usuario.Nome;
}

function consultarSusep(susep, idDoCanal) {
  var quem = exigirPermissao_(RECC_ACOES.CRIAR);

  var procurada = susepComoSeEscreve_(susep);
  if (!chaveDaSusep_(procurada)) {
    return { situacao: 'VAZIA', mensagem: 'Digite a SUSEP.' };
  }

  var corretora = buscarRegistroVisivel_('CORRETORAS', 'SUSEP', procurada);

  if (corretora) {
    return {
      situacao: 'OK',
      susep: susepComoSeEscreve_(corretora.SUSEP) || procurada,
      corretora: String(corretora.Corretora || ''),
      sucursal: String(corretora.Sucursal || ''),
      segmento: String(corretora.Segmento || 'Não encontrado'),
      consultor: String(corretora.Consultor || ''),
      mensagem: 'SUSEP liberada'
    };
  }

  if (!deveConferirOBloqueio_(idDoCanal, quem)) {
    return {
      situacao: 'NAO_ENCONTRADA',
      susep: procurada,
      segmento: 'Não encontrado',
      mensagem: 'SUSEP não encontrada no cadastro de corretoras'
    };
  }

  var bloqueada = buscarRegistroVisivel_('SUSEP_BLOQUEADAS', 'SUSEP', procurada);

  if (bloqueada) {

    var por = quemBloqueou_(bloqueada.BloqueadaPor);
    return {
      situacao: 'BLOQUEADA',
      bloqueadaPor: por,
      susep: susepComoSeEscreve_(bloqueada.SUSEP) || procurada,
      corretora: String(bloqueada.NomeCorretora || ''),
      sucursal: String(bloqueada.Sucursal || ''),
      coordenadorComercial: String(bloqueada.CoordenadorComercial || ''),
      mensagem: 'SUSEP bloqueada'
        + (por ? ' pela ' + por.toLowerCase() : '')
        + (bloqueada.NomeCorretora ? ' — ' + bloqueada.NomeCorretora : '')
    };
  }

  return {
    situacao: 'NAO_ENCONTRADA',
    susep: procurada,
    segmento: 'Não encontrado',
    mensagem: 'SUSEP não encontrada no cadastro de corretoras'
  };
}

function deveConferirOBloqueio_(idDoCanal, quem) {
  var alvo = converterParaIdentificador_(idDoCanal);
  if (!alvo) return true;

  var canal = canaisQueEuVejo_(quem).filter(function (um) {
    return converterParaIdentificador_(um.id) === alvo;
  })[0];

  return canal ? canal.confereSusepBloqueada !== false : true;
}

function conferirPropostaRepetida(proposta, idDoCanal, dataDoCaso, idDoCasoAberto) {
  var quem = exigirPermissao_(RECC_ACOES.CRIAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var partir = partirDaPropostaDoCanal_(canal);
  if (!partir) return { situacao: 'SEM_PROPOSTA', mensagem: '' };

  var pedacos;
  try {
    pedacos = partirPorHifen_(proposta, partir, 'Número da proposta');
  } catch (erro) {
    return { situacao: 'VAZIA', mensagem: '' };
  }

  var mes = converterParaData_(dataDoCaso) || new Date();
  var nomeDoMes = RECC_NOMES_DOS_MESES[mes.getMonth()] + ' de ' + mes.getFullYear();

  var colunaDoNumero = partir.colunas[partir.colunas.length - 1];
  var numero = pedacos[pedacos.length - 1];
  var linhas = [];
  lerColunaInteira_(canal.aba, colunaDoNumero).forEach(function (valor, i) {
    if (converterParaIdentificador_(valor) === numero) linhas.push(i + 2);
  });

  var estrutura = estruturaDaAba_(canal.aba);
  var colunaDoAnalista = colunaDoResponsavel_(estrutura);
  var abertoAgora = converterParaIdentificador_(idDoCasoAberto);

  var repetidas = lerLinhasEspecificas_(canal.aba, linhas).filter(function (registro) {
    if (normalizarParaComparar_(registro._Visivel) === 'nao') return false;
    if (abertoAgora && registro.__id === abertoAgora) return false;

    var mesmosPedacos = partir.colunas.every(function (cabecalho, i) {
      return converterParaIdentificador_(registro[cabecalho]) === pedacos[i];
    });
    if (!mesmosPedacos) return false;

    var quando = canal.colunaDaData ? converterParaData_(registro[canal.colunaDaData]) : '';
    return quando !== '' && quando.getMonth() === mes.getMonth()
      && quando.getFullYear() === mes.getFullYear();
  }).map(function (registro) {
    return {
      id: registro.__id,
      analista: colunaDoAnalista ? String(registro[colunaDoAnalista] || '').trim() : '',
      situacao: canal.colunaDoStatus
        ? String(registro[canal.colunaDoStatus] || '').trim() : ''
    };
  });

  if (!repetidas.length) {
    return {
      situacao: 'UNICA',
      mensagem: 'Nenhuma outra com esta proposta em ' + nomeDoMes + '.'
    };
  }

  var quais = repetidas.map(function (uma) {
    return (uma.analista ? 'com ' + uma.analista : 'sem analista')
      + ' (caso ' + uma.id + (uma.situacao ? ', ' + uma.situacao : '') + ')';
  });
  return {
    situacao: 'REPETIDA',
    mensagem: 'Já cadastrada em ' + nomeDoMes + ': ' + quais.join('; ') + '.',
    casos: repetidas
  };
}

function partirDaPropostaDoCanal_(canal) {
  var campo = camposAtivosDoCanal_(canal.id).filter(function (um) {
    return normalizarParaComparar_(um.ChaveTecnica) === 'numerodaproposta';
  })[0];
  if (!campo) return null;

  var partir = lerConfiguracaoDoCampo_(campo).partirEm;
  if (!partir || !partir.colunas || partir.colunas.length < 2) return null;

  var estrutura = estruturaDaAba_(canal.aba);
  var todasExistem = partir.colunas.every(function (cabecalho) {
    return posicaoDaColuna_(estrutura, cabecalho) >= 0;
  });
  return todasExistem ? partir : null;
}

const RECC_MAXIMO_DA_BUSCA = 100;

const RECC_MINIMO_DO_TERMO = 3;

function opcoesDaBusca() {
  var quem = exigirTela_('buscarCaso');

  return {

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

function buscarCasos(termo, ondeProcurar, incluirLegado) {
  var quem = exigirTela_('buscarCaso');

  var procurado = String(termo || '').trim();
  if (procurado.length < RECC_MINIMO_DO_TERMO) {
    throw new Error('Digite ao menos ' + RECC_MINIMO_DO_TERMO + ' caracteres. ' +
      'Com menos que isso a busca traria meia base, e nenhuma delas seria a ' +
      'que você procura.');
  }

  var escolhidas = listaDaTela_(ondeProcurar).map(converterParaIdentificador_);
  var resultados = [];

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

  registrarAuditoria_('busca', 'BUSCA', '', total + ' resultado(s)');
  return {
    termo: procurado,
    total: total,
    origens: resultados,

    podeEditar: podeFazer_(quem.permissoes, RECC_ACOES.EDITAR)
  };
}

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

function procurarNoCanal_(canal, termo, quem) {
  comAGrafiaDaAba_(canal);
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
      aviso: 'Este canal não declarou em quais colunas procurar. ' +
        'Isso se ajusta em Configurações › Canais de trabalho.'
    };
  }

  var linhasQueCasam = {};
  var ordemDasLinhas = [];

  colunas.forEach(function (coluna) {
    var valores = lerColunaInteira_(canal.aba, coluna.cabecalho);
    for (var i = 0; i < valores.length; i++) {
      var numeroDaLinha = i + 2;
      if (linhasQueCasam[numeroDaLinha]) continue;
      if (!casaComOTermo_(valores[i], termo, coluna.tipo)) continue;

      linhasQueCasam[numeroDaLinha] = coluna.cabecalho;
      ordemDasLinhas.push(numeroDaLinha);
    }
  });

  ordemDasLinhas = linhasNoMeuAlcance_(canal.aba, ordemDasLinhas, quem);

  if (ordemDasLinhas.length > RECC_MAXIMO_DA_BUSCA) {
    aviso = 'A busca achou ' + ordemDasLinhas.length + ' casos e mostra os ' +
      RECC_MAXIMO_DA_BUSCA + ' mais recentes. Um termo mais específico ' +
      'chega mais perto.';

    ordemDasLinhas = ordemDasLinhas.slice(-RECC_MAXIMO_DA_BUSCA);
  }

  ordemDasLinhas.sort(function (uma, outra) { return outra - uma; });
  var registros = lerLinhasEspecificas_(canal.aba, ordemDasLinhas)
    .filter(function (registro) {

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

function descricaoDoLegado_() {
  var id = String(valorDaConfiguracao_('LEGADO.PLANILHA_ID', '')).trim();
  return {
    ligado: id !== '',
    rotulo: String(valorDaConfiguracao_('LEGADO.ROTULO', 'Base legada')),
    aba: String(valorDaConfiguracao_('LEGADO.ABA', '')).trim()
  };
}

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

function configuracaoDoLegado() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  return {
    planilhaId: String(valorDaConfiguracao_('LEGADO.PLANILHA_ID', '')),
    aba: String(valorDaConfiguracao_('LEGADO.ABA', '')),
    rotulo: String(valorDaConfiguracao_('LEGADO.ROTULO', 'Base legada'))
  };
}

function salvarConfiguracaoDoLegado(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  dados = dadosDaTela_(dados);

  var id = String(dados.planilhaId || '').trim();
  var aba = String(dados.aba || '').trim();

  if (id) {

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

const RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO = 2000;

const RECC_LINHAS_DE_AMOSTRA = 3;

function separarTextoColado_(texto) {
  var inteiro = String(texto || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  var linhas = inteiro.split('\n').filter(function (uma) {
    return String(uma).trim() !== '';
  });
  if (!linhas.length) return [];

  var separador = linhas[0].indexOf('\t') >= 0 ? '\t' : ';';
  return linhas.map(function (uma) {
    return uma.split(separador).map(function (celula) {

      var valor = String(celula).trim();
      if (valor.length > 1 && valor.charAt(0) === '"'
        && valor.charAt(valor.length - 1) === '"') {
        valor = valor.substring(1, valor.length - 1).replace(/""/g, '"');
      }
      return valor;
    });
  });
}

function gradeDeOutraPlanilha_(idDaPlanilha, nomeDaAba) {
  var planilha = abrirPlanilhaDeFora_(idDaPlanilha);
  var procurado = String(nomeDaAba || '').trim();

  var aba = procurado ? planilha.getSheetByName(procurado) : planilha.getSheets()[0];
  if (!aba) {
    throw new Error('A planilha abriu, mas não tem uma aba chamada "' + procurado
      + '". As abas dela são: ' + planilha.getSheets().map(function (uma) {
        return uma.getName();
      }).join(', ') + '.');
  }

  var ultima = aba.getLastRow();
  var largura = aba.getLastColumn();
  if (ultima < 1 || largura < 1) return [];

  return aba.getRange(1, 1, ultima, largura).getDisplayValues();
}

function gradeDaFonte_(fonte) {
  var tipo = normalizarParaComparar_((fonte || {}).tipo);
  if (tipo === 'planilha') {
    return gradeDeOutraPlanilha_(fonte.planilhaId, fonte.aba);
  }
  return separarTextoColado_((fonte || {}).texto);
}

function sugerirDeParaDaImportacao_(cabecalhosDaFonte, canal) {

  var porNome = {};
  colunasQueAImportacaoSugere_(canal).forEach(function (cabecalho) {
    porNome[normalizarParaComparar_(cabecalho)] = cabecalho;
  });
  var lembrado = deParaLembrado_(canal);

  return cabecalhosDaFonte.map(function (cabecalho) {
    var daFonte = normalizarParaComparar_(cabecalho);

    if (Object.prototype.hasOwnProperty.call(lembrado, daFonte)) {
      var escolhida = normalizarParaComparar_(lembrado[daFonte]);
      if (!escolhida || porNome[escolhida]) {
        return { daFonte: String(cabecalho || ''), paraAColuna: escolhida ? porNome[escolhida] : '',
          lembrado: true };
      }
    }
    return {
      daFonte: String(cabecalho || ''),
      paraAColuna: porNome[daFonte] || ''
    };
  });
}

const RECC_CHAVE_DO_DE_PARA_LEMBRADO = 'IMPORTACAO.DEPARA.';

function deParaLembrado_(canal) {
  var texto = valorDaConfiguracao_(RECC_CHAVE_DO_DE_PARA_LEMBRADO + canal.id, '');
  if (!texto) return {};
  try {
    var lido = JSON.parse(texto);
    return lido && typeof lido === 'object' && !Array.isArray(lido) ? lido : {};
  } catch (erro) {

    return {};
  }
}

function lembrarODeParaDoCanal_(canal, dePara) {
  var lembrado = deParaLembrado_(canal);
  (dePara || []).forEach(function (par) {
    var daFonte = normalizarParaComparar_((par || {}).daFonte);
    if (!daFonte) return;
    lembrado[daFonte] = String(par.paraAColuna || '').trim();
  });
  gravarConfiguracao_(RECC_CHAVE_DO_DE_PARA_LEMBRADO + canal.id, JSON.stringify(lembrado));
}

function colunasQueAImportacaoSugere_(canal) {
  var doSistema = colunasPreenchidasPeloSistema_(canal);

  return estruturaDaAba_(canal.aba).cabecalhos.filter(function (cabecalho) {
    if (!cabecalho || cabecalho.charAt(0) === '_') return false;
    return !doSistema[normalizarParaComparar_(cabecalho)];
  });
}

function colunasQueAImportacaoAceita_(canal) {
  var carimbos = colunasDeCarimboDoCanal_(canal);
  var doSistema = colunasPreenchidasPeloSistema_(canal);

  return estruturaDaAba_(canal.aba).cabecalhos.filter(function (cabecalho) {
    if (!cabecalho || cabecalho.charAt(0) === '_') return false;
    var chave = normalizarParaComparar_(cabecalho);
    if (carimbos[chave]) return true;
    return !doSistema[chave];
  });
}

function colunasPreenchidasPeloSistema_(canal) {
  var doSistema = {};
  esquemaDaAba_(canal.aba).colunas.forEach(function (coluna) {
    if (coluna.preenchidoPeloSistema === true) {
      doSistema[normalizarParaComparar_(coluna.cabecalho)] = true;
    }
  });
  return doSistema;
}

function colunasDeCarimboDoCanal_(canal) {
  var nunca = {};
  nunca[normalizarParaComparar_(RECC_COLUNA_ORIGEM_DA_IMPORTACAO)] = true;
  nunca[normalizarParaComparar_(RECC_COLUNA_DATA_DA_IMPORTACAO)] = true;

  var carimbos = {};
  situacoesDoCanal_(canal).forEach(function (situacao) {
    var coluna = normalizarParaComparar_(situacao.colunaDeCarimbo);
    if (coluna && !nunca[coluna]) carimbos[coluna] = true;
  });
  return carimbos;
}

function conferirImportacaoDeCasos(idDoCanal, pedido) {
  var quem = exigirPermissao_(RECC_ACOES.IMPORTAR);
  exigirTela_('importacao');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  pedido = pedido || {};

  var grade = gradeDaFonte_(pedido.fonte);
  if (grade.length < 2) {
    throw new Error('Preciso de pelo menos duas linhas: a primeira com os '
      + 'nomes das colunas e ao menos uma de dado. Recebi ' + grade.length + '.');
  }

  var cabecalhosDaFonte = grade[0];
  var corpo = grade.slice(1);
  var deParaEscolhido = Array.isArray(pedido.dePara) && pedido.dePara.length
    ? pedido.dePara
    : sugerirDeParaDaImportacao_(cabecalhosDaFonte, canal);

  var regra = regraDeRepeticao_(canal, pedido.colunaQueIdentifica);
  var premios = premiosDoDePara_(deParaEscolhido, canal);
  var contagem = contarOQueEntraEOQuePula_(corpo, cabecalhosDaFonte,
    deParaEscolhido, regra, premios);

  return {
    canal: { id: canal.id, nome: canal.nome, aba: canal.aba },
    cabecalhosDaFonte: cabecalhosDaFonte,
    colunasDoCanal: colunasQueAImportacaoAceita_(canal),

    colunasDeCarimbo: Object.keys(colunasDeCarimboDoCanal_(canal)).length
      ? colunasQueAImportacaoAceita_(canal).filter(function (cabecalho) {
        return colunasDeCarimboDoCanal_(canal)[normalizarParaComparar_(cabecalho)];
      })
      : [],
    dePara: deParaEscolhido,
    linhasNaFonte: corpo.length,
    vaoEntrar: contagem.entram,
    vaoSerPuladas: contagem.pulam,
    motivosParaPular: contagem.motivos,
    limite: RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO,
    passaDoLimite: corpo.length > RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO,
    amostra: contagem.amostra,
    analistas: analistasParaDistribuir_(canal),
    foraDaDivisao: quemEstaForaDaDivisao_(canal),
    statusPadrao: statusDoLote_(canal, pedido.statusDoLote),
    premios: premios,
    dataDeRecepcao: dataDeRecepcaoNaImportacao_(canal)
  };
}

const RECC_REPETIR_PELA_PROPOSTA_NO_MES = '@PROPOSTA_NO_MES';

function regraDeRepeticao_(canal, escolha) {
  var escolhida = String(escolha || '').trim();
  if (!escolhida) return null;

  if (escolhida !== RECC_REPETIR_PELA_PROPOSTA_NO_MES) {
    return { coluna: escolhida, jaDentro: jaEstaNaBase_(canal, escolhida) };
  }

  var partir = partirDaPropostaDoCanal_(canal);
  if (!partir) {
    throw new Error('O canal ' + canal.nome + ' não tem campo de proposta, então '
      + 'não dá para conferir repetição pela proposta. Escolha uma coluna.');
  }

  var reserva = posicaoDaColuna_(estruturaDaAba_(canal.aba),
    RECC_COLUNA_DATA_DA_IMPORTACAO) >= 0 ? RECC_COLUNA_DATA_DA_IMPORTACAO : '';

  var colunas = {};
  partir.colunas
    .concat(canal.colunaDaData ? [canal.colunaDaData] : [])
    .concat(reserva ? [reserva] : [])
    .forEach(function (cabecalho) {
      colunas[cabecalho] = lerColunaInteira_(canal.aba, cabecalho);
    });

  var jaDentro = {};
  var quantas = colunas[partir.colunas[0]].length;
  for (var i = 0; i < quantas; i++) {
    var naBase = {};
    partir.colunas.forEach(function (cabecalho) {
      naBase[cabecalho] = colunas[cabecalho][i];
    });
    var daData = canal.colunaDaData ? converterParaData_(colunas[canal.colunaDaData][i]) : '';
    naBase.__mes = daData || (reserva ? converterParaData_(colunas[reserva][i]) : '');

    var chave = chaveDaPropostaNoMes_(naBase, partir, '__mes', null);
    if (chave) jaDentro[chave] = true;
  }

  var hoje = new Date();
  return {
    partir: partir,

    colunaDaData: '',
    hoje: hoje,
    mes: RECC_NOMES_DOS_MESES[hoje.getMonth()] + ' de ' + hoje.getFullYear(),
    jaDentro: jaDentro
  };
}

function chaveDaPropostaNoMes_(registro, partir, colunaDaData, hoje) {
  var pedacos = partir.colunas.map(function (cabecalho) {
    return converterParaIdentificador_(registro[cabecalho]);
  });
  if (!pedacos[pedacos.length - 1]) return '';

  var quando = colunaDaData ? converterParaData_(registro[colunaDaData]) : '';
  if (!quando) quando = hoje;
  if (!quando) return '';
  return pedacos.join('-') + '|' + quando.getFullYear() + '-' + (quando.getMonth() + 1);
}

function ehRepetido_(regra, caso, vistosNestaLeva) {
  if (!regra) return '';

  if (regra.partir) {
    var chaveDoMes = chaveDaPropostaNoMes_(caso, regra.partir, regra.colunaDaData,
      regra.hoje);
    if (!chaveDoMes) return '';
    if (regra.jaDentro[chaveDoMes]) return 'base';
    if (vistosNestaLeva[chaveDoMes]) return 'arquivo';
    vistosNestaLeva[chaveDoMes] = true;
    return '';
  }

  var chave = normalizarParaComparar_(caso[regra.coluna]);
  var soDigitos = apenasDigitos_(caso[regra.coluna]);

  if (regra.jaDentro[chave] || (soDigitos && regra.jaDentro[soDigitos])) return 'base';
  if (vistosNestaLeva[chave || soDigitos]) return 'arquivo';
  vistosNestaLeva[chave || soDigitos] = true;
  return '';
}

function comoMostrarORepetido_(regra, caso) {
  if (regra.partir) {
    return regra.partir.colunas.map(function (cabecalho) {
      return converterParaIdentificador_(caso[cabecalho]);
    }).join('-');
  }
  return String(caso[regra.coluna] === undefined ? '' : caso[regra.coluna]).trim();
}

const RECC_REPETIDOS_LISTADOS = 50;

function novosMotivosParaPular_(regra) {
  return { vazia: 0, repetida: 0, repetidaNoArquivo: 0, jaNoPgo: 0,
    listaNoArquivo: [], listaNoPgo: [], mes: regra && regra.mes ? regra.mes : '',
    pelaProposta: !!(regra && regra.partir) };
}

function anotarORepetido_(motivos, regra, caso, porque) {
  motivos.repetida++;
  var mostrar = comoMostrarORepetido_(regra, caso);
  if (porque === 'base') {
    motivos.jaNoPgo++;
    if (motivos.listaNoPgo.length < RECC_REPETIDOS_LISTADOS) motivos.listaNoPgo.push(mostrar);
  } else {
    motivos.repetidaNoArquivo++;
    if (motivos.listaNoArquivo.length < RECC_REPETIDOS_LISTADOS) motivos.listaNoArquivo.push(mostrar);
  }
}

function aplicarDataDeRecepcao_(caso, canal, escolha, agora) {
  var coluna = dataDeRecepcaoNaImportacao_(canal);
  if (!coluna) return;
  var qual = normalizarParaComparar_(escolha);
  if (qual === 'hoje') { caso[coluna] = agora; return; }
  if (qual === 'planilha' && String(caso[coluna] === undefined || caso[coluna] === null
    ? '' : caso[coluna]).trim() === '') {
    caso[coluna] = agora;
  }
}

function dataDeRecepcaoNaImportacao_(canal) {
  if (!canal.colunaDaData || !partirDaPropostaDoCanal_(canal)) return '';
  var estrutura = estruturaDaAba_(canal.aba);
  return posicaoDaColuna_(estrutura, canal.colunaDaData) >= 0
    ? grafiaDaColuna_(canal.aba, canal.colunaDaData) : '';
}

const RECC_PREMIOS_DA_IMPORTACAO = [
  { rotulo: 'Prêmio anual', coluna: 'valor do prêmio' },
  { rotulo: 'Prêmio mensal', coluna: 'prêmio mensal' }
];

function somarPremios_(premios, caso) {
  premios.forEach(function (premio) {
    var bruto = caso[premio.coluna];
    if (bruto === undefined || bruto === null || String(bruto).trim() === '') return;
    var numero = converterParaNumero_(bruto);
    if (numero === '' || numero === null || isNaN(numero)) return;
    premio.total += Number(numero);
    premio.casos++;
  });
}

function premiosDoDePara_(dePara, canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var destinos = {};
  (dePara || []).forEach(function (par) {
    if (par && par.paraAColuna) destinos[normalizarParaComparar_(par.paraAColuna)] = true;
  });
  return RECC_PREMIOS_DA_IMPORTACAO.filter(function (premio) {
    return posicaoDaColuna_(estrutura, premio.coluna) >= 0
      && destinos[normalizarParaComparar_(premio.coluna)];
  }).map(function (premio) {
    return { rotulo: premio.rotulo, coluna: premio.coluna, total: 0, casos: 0 };
  });
}

function jaEstaNaBase_(canal, cabecalho) {
  var dentro = {};
  if (!cabecalho) return dentro;

  var estrutura = estruturaDaAba_(canal.aba);
  var posicao = posicaoDaColuna_(estrutura, cabecalho);
  if (posicao < 0) {
    throw new Error('A coluna "' + cabecalho + '" não existe na aba '
      + canal.aba + ', então não dá para saber o que já entrou. '
      + 'Escolha uma das colunas do canal.');
  }

  lerColunaInteira_(canal.aba, cabecalho).forEach(function (valor) {

    var texto = normalizarParaComparar_(valor);
    if (texto) dentro[texto] = true;
    var soDigitos = apenasDigitos_(valor);
    if (soDigitos) dentro[soDigitos] = true;
  });
  return dentro;
}

function contarOQueEntraEOQuePula_(corpo, cabecalhosDaFonte, dePara, regra, premios) {
  var motivos = novosMotivosParaPular_(regra);
  var amostra = [];
  var entram = 0;
  var vistosNestaLeva = {};

  for (var i = 0; i < corpo.length; i++) {
    var caso = linhaDaFonteParaOCaso_(corpo[i], cabecalhosDaFonte, dePara);

    if (!temAlgumValor_(caso)) { motivos.vazia++; continue; }

    var porque = ehRepetido_(regra, caso, vistosNestaLeva);
    if (porque) {
      anotarORepetido_(motivos, regra, caso, porque);
      continue;
    }

    entram++;
    if (premios) somarPremios_(premios, caso);
    if (amostra.length < RECC_LINHAS_DE_AMOSTRA) amostra.push(caso);
  }

  return {
    entram: entram,
    pulam: motivos.vazia + motivos.repetida,
    motivos: motivos,
    amostra: amostra
  };
}

function linhaDaFonteParaOCaso_(linha, cabecalhosDaFonte, dePara) {
  var paraOnde = {};
  dePara.forEach(function (par) {
    if (!par || !par.paraAColuna) return;
    paraOnde[normalizarParaComparar_(par.daFonte)] = par.paraAColuna;
  });

  var caso = {};
  for (var i = 0; i < cabecalhosDaFonte.length; i++) {
    var destino = paraOnde[normalizarParaComparar_(cabecalhosDaFonte[i])];
    if (!destino) continue;
    var valor = linha[i];
    if (valor === undefined || valor === null) continue;
    if (String(valor).trim() === '') continue;
    caso[destino] = valor;
  }
  return caso;
}

function temAlgumValor_(caso) {
  return Object.keys(caso).some(function (chave) {
    return String(caso[chave]).trim() !== '';
  });
}

function analistasParaDistribuir_(canal) {
  var doCanal = converterParaIdentificador_(canal.id);

  return lerRegistros_('USUARIOS')
    .filter(function (usuario) {
      if (normalizarParaComparar_(usuario.Ativo) !== 'sim') return false;
      if (!String(usuario.Nome || '').trim()) return false;
      if (converterParaIdentificador_(usuario.CanalId) !== doCanal) return false;
      return estaDisponivelParaReceber_(usuario);
    })
    .map(function (usuario) {
      return {
        nome: String(usuario.Nome),

        atendeEsteCanal: true
      };
    })
    .sort(function (um, outro) {
      return um.nome < outro.nome ? -1 : (um.nome > outro.nome ? 1 : 0);
    });
}

function quemEstaForaDaDivisao_(canal) {
  var doCanal = converterParaIdentificador_(canal.id);

  return lerRegistros_('USUARIOS')
    .filter(function (usuario) {
      return normalizarParaComparar_(usuario.Ativo) === 'sim'
        && String(usuario.Nome || '').trim()
        && converterParaIdentificador_(usuario.CanalId) === doCanal
        && !estaDisponivelParaReceber_(usuario);
    })
    .map(function (usuario) {
      return {
        nome: String(usuario.Nome),
        porque: String(usuario.Disponibilidade || '').trim()
      };
    })
    .sort(function (um, outro) {
      return um.nome < outro.nome ? -1 : (um.nome > outro.nome ? 1 : 0);
    });
}

function nomesQuePodemReceberCasos_(canal) {
  return analistasParaDistribuir_(canal).map(function (um) { return um.nome; });
}

function statusDaImportacaoDoCanal_(canal) {
  var padrao = statusPadraoDoCanal_(canal);
  var situacao = padrao ? situacaoDoCanalPeloValor_(canal, padrao) : null;
  if (situacao && String(situacao.colunaDeCarimbo || '').trim()) return '';
  return padrao;
}

function statusDoLote_(canal, escolhido) {
  if (escolhido === undefined || escolhido === null) return statusDaImportacaoDoCanal_(canal);
  var texto = String(escolhido).trim();
  if (!texto) return '';
  var achada = situacaoDoCanalPeloValor_(canal, texto);
  if (!achada) {
    throw new Error('O status "' + texto + '" não existe no canal ' + canal.nome + '. Os status '
      + 'dele são: ' + situacoesDoCanal_(canal).map(function (s) { return s.gravadoComo; }).join(', ')
      + '.');
  }
  return achada.gravadoComo;
}

function statusPadraoDoCanal_(canal) {
  if (!canal.colunaDoStatus) return '';
  var achado = '';
  camposAtivosDoCanal_(canal.id).forEach(function (campo) {
    if (normalizarParaComparar_(campo.Cabecalho)
      === normalizarParaComparar_(canal.colunaDoStatus)) {
      achado = String(campo.ValorPadrao || '');
    }
  });
  return achado;
}

function importarCasos(idDoCanal, pedido) {
  return comEnvioUnico_((pedido || {}).envio, function () {
    return importarCasosUmaVez_(idDoCanal, pedido);
  });
}

function importarCasosUmaVez_(idDoCanal, pedido) {
  var quem = exigirPermissao_(RECC_ACOES.IMPORTAR);
  exigirTela_('importacao');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  pedido = pedido || {};

  var nomeDoLote = String(pedido.origem || '').trim();
  if (!nomeDoLote) {
    throw new Error('Dê um nome ao lote — "Base de inadimplentes Vida Presente", '
      + 'por exemplo. É por ele que a Produtividade RECC vai mostrar quantos '
      + 'casos entraram em cada dia, e sem ele o gráfico não tem o que dizer.');
  }

  var grade = gradeDaFonte_(pedido.fonte);
  if (grade.length < 2) {
    throw new Error('Preciso de pelo menos duas linhas: a primeira com os '
      + 'nomes das colunas e ao menos uma de dado.');
  }

  var cabecalhosDaFonte = grade[0];
  var corpo = grade.slice(1);
  if (corpo.length > RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO) {
    throw new Error('São no máximo ' + RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO
      + ' linhas por importação, e vieram ' + corpo.length + '. Divida em '
      + 'levas — assim, se o mapeamento estiver errado, o estrago é menor.');
  }

  var dePara = Array.isArray(pedido.dePara) && pedido.dePara.length
    ? pedido.dePara
    : sugerirDeParaDaImportacao_(cabecalhosDaFonte, canal);
  exigirQueODeParaLeveAAlgumLugar_(dePara, canal);

  var regra = regraDeRepeticao_(canal, pedido.colunaQueIdentifica);

  var analistas = analistasEscolhidos_(pedido.analistas, canal);
  var colunaDoAnalista = colunaDoResponsavel_(estruturaDaAba_(canal.aba));
  var agora = new Date();
  var statusPadrao = statusDoLote_(canal, pedido.statusDoLote);

  var paraGravar = [];
  var pulados = novosMotivosParaPular_(regra);
  var premios = premiosDoDePara_(dePara, canal);
  var vistosNestaLeva = {};

  for (var i = 0; i < corpo.length; i++) {
    var caso = linhaDaFonteParaOCaso_(corpo[i], cabecalhosDaFonte, dePara);
    if (!temAlgumValor_(caso)) { pulados.vazia++; continue; }

    var porque = ehRepetido_(regra, caso, vistosNestaLeva);
    if (porque) {
      anotarORepetido_(pulados, regra, caso, porque);
      continue;
    }
    somarPremios_(premios, caso);
    aplicarDataDeRecepcao_(caso, canal, pedido.dataDeRecepcao, agora);

    if (colunaDoAnalista && analistas.length && !caso[colunaDoAnalista]) {

      caso[colunaDoAnalista] = analistas[paraGravar.length % analistas.length];
    }
    if (canal.colunaDoStatus && !caso[canal.colunaDoStatus] && statusPadrao) {
      caso[canal.colunaDoStatus] = statusPadrao;
    }
    caso[RECC_COLUNA_ORIGEM_DA_IMPORTACAO] = nomeDoLote;
    caso[RECC_COLUNA_DATA_DA_IMPORTACAO] = agora;

    paraGravar.push(caso);
  }

  if (!paraGravar.length) {
    throw new Error('Nenhuma linha entraria: ' + pulados.vazia + ' em branco, '
      + pulados.jaNoPgo + ' já estão no PGO' + (pulados.mes ? ' em ' + pulados.mes : '')
      + ' e ' + pulados.repetidaNoArquivo + ' repetidas na própria planilha. Nada foi gravado.');
  }

  var gravados = inserirVariosRegistros_(canal.aba, paraGravar,
    { origem: RECC_ORIGEM_PLANILHA });

  try {
    lembrarODeParaDoCanal_(canal, dePara);
  } catch (erro) {
    Logger.log('O de-para desta importação não foi lembrado: ' + erro.message);
  }

  registrarAuditoria_('caso.importar', canal.aba, '',
    canal.nome + ' · ' + nomeDoLote + ' · ' + gravados.length + ' casos'
    + (pulados.repetida ? ' · ' + pulados.repetida + ' repetidos pulados' : ''));

  return {
    canal: canal.nome,
    origem: nomeDoLote,
    entraram: gravados.length,
    pulados: pulados,
    premios: premios,
    analistas: analistas,
    primeiroId: gravados.length ? gravados[0].__id : '',
    ultimoId: gravados.length ? gravados[gravados.length - 1].__id : ''
  };
}

function exigirQueODeParaLeveAAlgumLugar_(dePara, canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var destinos = [];
  var inexistentes = [];

  var aceitas = {};
  colunasQueAImportacaoAceita_(canal).forEach(function (cabecalho) {
    aceitas[normalizarParaComparar_(cabecalho)] = true;
  });
  var proibidas = [];

  dePara.forEach(function (par) {
    var destino = String((par || {}).paraAColuna || '').trim();
    if (!destino) return;
    if (posicaoDaColuna_(estrutura, destino) < 0) {
      inexistentes.push(destino);
      return;
    }
    if (!aceitas[normalizarParaComparar_(destino)]) {
      proibidas.push(destino);
      return;
    }
    destinos.push(destino);
  });

  if (inexistentes.length) {
    throw new Error('Estas colunas não existem na aba ' + canal.aba + ': '
      + inexistentes.join(', ') + '. As colunas dela são: '
      + colunasQueAImportacaoAceita_(canal).join(' | ') + '.');
  }
  if (proibidas.length) {
    throw new Error('Estas colunas são preenchidas pelo sistema e não podem '
      + 'receber dado da origem: ' + proibidas.join(', ') + '. A origem e a '
      + 'data da importação são o rastro do lote — é por elas que se sabe de '
      + 'onde cada caso veio, e a planilha de origem não pode escrevê-las.');
  }
  if (!destinos.length) {
    throw new Error('Nenhuma coluna da planilha de origem está apontando para '
      + 'uma coluna do canal ' + canal.nome + '. Do jeito que está, a '
      + 'importação criaria linhas em branco.');
  }
}

function analistasEscolhidos_(escolhidos, canal) {
  var lista = Array.isArray(escolhidos) ? escolhidos : [];
  var limpos = [];
  lista.forEach(function (nome) {
    var texto = String(nome || '').trim();
    if (texto && limpos.indexOf(texto) < 0) limpos.push(texto);
  });
  if (!limpos.length) return [];

  var podem = nomesQuePodemReceberCasos_(canal);
  var foraDoCadastro = limpos.filter(function (nome) {
    return !podem.some(function (um) {
      return normalizarParaComparar_(um) === normalizarParaComparar_(nome);
    });
  });
  if (foraDoCadastro.length) {

    var indisponiveis = {};
    quemEstaForaDaDivisao_(canal).forEach(function (um) {
      indisponiveis[normalizarParaComparar_(um.nome)] = um.porque || 'indisponível';
    });

    var explicados = foraDoCadastro.map(function (nome) {
      var chave = normalizarParaComparar_(nome);
      if (indisponiveis[chave]) return nome + ' (' + indisponiveis[chave] + ')';
      return nome + ' (não é do canal ' + canal.nome + ', ou não está ativo)';
    });

    throw new Error('Estes nomes não podem receber casos do canal '
      + canal.nome + ': ' + explicados.join('; ') + '. Caso no nome de quem '
      + 'não recebe fica na planilha e invisível na fila. Ajuste em '
      + 'Configurações › Usuários — o canal da pessoa e a disponibilidade '
      + 'dela — e importe depois.');
  }

  return limpos.map(function (nome) {
    var achado = nome;
    podem.forEach(function (um) {
      if (normalizarParaComparar_(um) === normalizarParaComparar_(nome)) achado = um;
    });
    return achado;
  });
}

function lotesJaImportados(idDoCanal) {
  var quem = exigirPermissao_(RECC_ACOES.IMPORTAR);
  exigirTela_('importacao');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var estrutura = estruturaDaAba_(canal.aba);
  if (posicaoDaColuna_(estrutura, RECC_COLUNA_ORIGEM_DA_IMPORTACAO) < 0) return [];

  var quantos = {};
  lerColunaInteira_(canal.aba, RECC_COLUNA_ORIGEM_DA_IMPORTACAO).forEach(function (valor) {
    var nome = String(valor === null || valor === undefined ? '' : valor).trim();
    if (!nome) return;
    quantos[nome] = (quantos[nome] || 0) + 1;
  });

  return Object.keys(quantos).map(function (nome) {
    return { origem: nome, casos: quantos[nome] };
  }).sort(function (um, outro) { return outro.casos - um.casos; });
}

function opcoesDaImportacaoDeCasos(idDoCanal) {
  var quem = exigirPermissao_(RECC_ACOES.IMPORTAR);
  exigirTela_('importacao');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var repeticaoPelaProposta = !!partirDaPropostaDoCanal_(canal);

  return {
    canal: { id: canal.id, nome: canal.nome, aba: canal.aba },
    colunasDoCanal: colunasQueAImportacaoAceita_(canal),
    analistas: analistasParaDistribuir_(canal),

    foraDaDivisao: quemEstaForaDaDivisao_(canal),
    statusPadrao: statusDaImportacaoDoCanal_(canal),

    statusDoCanal: canal.colunaDoStatus ? situacoesDoCanal_(canal).map(function (situacao) {
      return { valor: situacao.gravadoComo, rotulo: situacao.nome };
    }) : [],

    statusQueEsperaAPessoa: statusDaImportacaoDoCanal_(canal) ? '' : statusPadraoDoCanal_(canal),
    lotes: lotesJaImportados(canal.id),

    aceitaChat: canal.aba === 'BASE_MESA',
    limite: RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO,

    repeticaoPelaProposta: repeticaoPelaProposta,

    dataDeRecepcao: dataDeRecepcaoNaImportacao_(canal),
    repeticaoPadrao: repeticaoPelaProposta ? RECC_REPETIR_PELA_PROPOSTA_NO_MES : ''
  };
}


/* ==== Config.gs =========================================================== */

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
    titulosDasTelas: titulosDasTelas(),

    disponibilidades: catalogo
      .filter(function (item) {
        return normalizarParaComparar_(item.Tipo) === 'disponibilidade'
          && normalizarParaComparar_(item.Ativo) === 'sim';
      })
      .sort(function (um, outro) {
        return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
      })
      .map(function (item) {
        return { nome: String(item.Nome), cor: String(item.Cor || '') };
      }),

    disponibilidadeQueRecebe: RECC_DISPONIBILIDADE_QUE_RECEBE,

    secoes: [

      { chave: 'campos', titulo: 'Cadastrar Caso',
        descricao: 'Os campos que o formulário pergunta, em cada canal',
        quantidade: lerRegistros_('CAMPOS').length },
      { chave: 'usuarios', titulo: 'Usuários',
        descricao: 'Quem entra no sistema',
        quantidade: lerRegistros_('USUARIOS').length },
      { chave: 'niveis', titulo: 'Níveis de acesso',
        descricao: 'O que cada um pode ver e fazer',
        quantidade: quantosDoTipo('nivelacesso') },
      { chave: 'catalogo', titulo: 'Ajustes Gerais',
        descricao: 'Situações, canais, motivos, ramos e cargos — as listas que '
          + 'os formulários oferecem',
        quantidade: catalogo.length - quantosDoTipo('nivelacesso') - quantosDoTipo('lista') },
      { chave: 'canais', titulo: 'Canais de trabalho',
        descricao: 'As bases e o que cada painel mostra',
        quantidade: lerRegistros_('CANAIS').length },
      { chave: 'sinalizadores', titulo: 'Sinalizadores',
        descricao: 'Os prazos que os casos têm, com verde, amarelo e vermelho',
        quantidade: planilhaAtiva_().getSheetByName('SINALIZADORES')
          ? lerRegistros_('SINALIZADORES').filter(function (linha) {
            return normalizarParaComparar_(linha.Ativo) === 'sim';
          }).length : 0 },
      { chave: 'identidade', titulo: 'Identidade',
        descricao: 'Nome, logo, cor e a senha de administrador',
        quantidade: 0 },
      { chave: 'paineis', titulo: 'Painéis',
        descricao: 'Os cards do Trabalho e dos painéis',
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

function listarCamposDoCanal(idDoCanal) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var estrutura = estruturaDaAba_(canal.aba);

  var jaLido = {
    linhaDoCanal: buscarRegistros_('CANAIS', 'Id',
      converterParaIdentificador_(canal.id), 1)[0],
    catalogo: lerRegistros_('CATALOGO')
  };

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

        mostrarSe: condicaoDoCampo_(configuracao),
        obrigatorioSe: condicaoDoCampo_({ mostrarSe: configuracao.obrigatorioSe }),
        opcoes: String(campo.TipoCampo || '') === 'seletor'
          ? opcoesDoCampo_(configuracao, canal.id).map(function (opcao) { return opcao.valor; })
          : [],

        colunaExiste: posicaoDaColuna_(estrutura, campo.Cabecalho) >= 0,

        usadoPeloCanal: quemApontaParaAColuna_(canal, campo.Cabecalho, jaLido)
      };
    });
}

function opcoesDeConfiguracaoDeCampo() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  return {
    tipos: Object.keys(RECC_DO_CAMPO_PARA_O_DADO),
    tons: RECC_TONS,
    cadastros: ['usuarios', 'corretoras'],
    tiposDeCatalogo: tiposDeCatalogoExistentes_(),
    listas: listasDeAjustes_()
  };
}

function tiposDeCatalogoExistentes_() {
  return listasDeAjustes_().map(function (lista) { return lista.chave; });
}

function salvarCampo(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  dados = dadosDaTela_(dados);

  var id = converterParaIdentificador_(dados.id);
  var atual = buscarRegistros_('CAMPOS', 'Id', id, 1)[0];
  if (!atual) throw new Error('Campo ' + id + ' não encontrado.');

  if (dados.cabecalho && String(dados.cabecalho) !== String(atual.Cabecalho)) {
    throw new Error('O cabeçalho de um campo não muda por aqui: ele é o nome ' +
      'da coluna na planilha. Renomeie a coluna na planilha e use a ' +
      'reconciliação de colunas.');
  }
  if (normalizarParaComparar_(atual.Protegido) === 'sim' && dados.ativo === false) {

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
  if (dados.mostrarSe !== undefined) {
    var condicao = conferirACondicaoDoCampo_(atual, dados.mostrarSe);
    if (condicao) configuracao.mostrarSe = condicao;
    else delete configuracao.mostrarSe;
  }

  if (dados.obrigatorioSe !== undefined) {
    var obrigacao = conferirACondicaoDoCampo_(atual, dados.obrigatorioSe, true);
    if (obrigacao) configuracao.obrigatorioSe = obrigacao;
    else delete configuracao.obrigatorioSe;
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

function conferirACondicaoDoCampo_(campo, pedido, ehObrigacao) {
  if (!pedido || !pedido.campo) return null;

  var oQue = ehObrigacao ? 'é obrigatório' : 'aparece';

  var doCanal = lerRegistros_('CAMPOS').filter(function (outro) {
    return converterParaIdentificador_(outro.CanalId) === converterParaIdentificador_(campo.CanalId);
  });
  var chaveDele = String(campo.ChaveTecnica);
  var quemManda = doCanal.filter(function (outro) {
    return String(outro.ChaveTecnica) === String(pedido.campo);
  })[0];
  if (!quemManda || String(quemManda.ChaveTecnica) === chaveDele) {
    throw new Error('O campo que decide quando este ' + oQue + ' precisa ser OUTRO '
      + 'campo do mesmo canal.');
  }

  var pedidos = (Array.isArray(pedido.valores) ? pedido.valores : [])
    .map(function (valor) { return String(valor).trim(); })
    .filter(function (valor) { return valor !== ''; });
  if (!pedidos.length) {
    throw new Error('Escolha em quais valores de "' + String(quemManda.Rotulo || quemManda.Cabecalho)
      + '" este campo ' + oQue + ' — ou deixe "' + (ehObrigacao ? 'Nunca' : 'Aparece sempre') + '".');
  }

  var opcoes = opcoesDoCampo_(lerConfiguracaoDoCampo_(quemManda), campo.CanalId)
    .map(function (opcao) { return opcao.valor; });
  var valores = pedidos.map(function (valor) {
    if (!opcoes.length) return valor;
    var achada = opcoes.filter(function (opcao) {
      return condicaoBate_({ valores: [opcao] }, valor);
    })[0];
    if (achada === undefined) {
      throw new Error('"' + valor + '" não é uma opção de "'
        + String(quemManda.Rotulo || quemManda.Cabecalho) + '". As opções são: '
        + opcoes.join(', ') + '.');
    }
    return achada;
  });

  var subindo = ehObrigacao ? null : quemManda;
  for (var passo = 0; subindo && passo < 20; passo++) {
    var acima = condicaoDoCampo_(lerConfiguracaoDoCampo_(subindo));
    if (!acima) break;
    if (acima.campo === chaveDele) {
      throw new Error('"' + String(quemManda.Rotulo || quemManda.Cabecalho) + '" já só aparece '
        + 'quando este campo tem valor: um esperaria o outro, e nenhum dos dois apareceria.');
    }
    subindo = doCanal.filter(function (outro) {
      return String(outro.ChaveTecnica) === acima.campo;
    })[0];
  }

  return { campo: String(quemManda.ChaveTecnica), valores: valores };
}

function criarCampo(idDoCanal, dados) {
  var quem = exigirPermissao_(RECC_ACOES.ESTRUTURA);
  exigirSenhaDeAdministrador_();
  dados = dadosDaTela_(dados);

  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var rotulo = String(dados.rotulo || '').trim();
  if (!rotulo) throw new Error('Dê um nome ao campo.');

  var tipoDeCampo = String(dados.tipo || 'texto');
  var tipoDeDado = RECC_DO_CAMPO_PARA_O_DADO[tipoDeCampo];
  if (!tipoDeDado) {
    throw new Error('Tipo de campo desconhecido: "' + tipoDeCampo + '".');
  }

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

function reordenarCampos(idDoCanal, idsNaOrdem) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var doCanal = {};
  listarCamposDoCanal(canal.id).forEach(function (campo) { doCanal[campo.id] = true; });

  var ordem = 0;
  listaDaTela_(idsNaOrdem).forEach(function (idDoCampo) {
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

function excluirCampo(idDoCanal, idDoCampo, apagarAColuna) {
  var quem = exigirPermissao_(RECC_ACOES.ESTRUTURA);
  exigirSenhaDeAdministrador_();

  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var id = converterParaIdentificador_(idDoCampo);
  var campo = buscarRegistros_('CAMPOS', 'Id', id, 1)[0];
  if (!campo) throw new Error('Campo ' + id + ' não encontrado.');

  if (converterParaIdentificador_(campo.CanalId)
    !== converterParaIdentificador_(canal.id)) {
    throw new Error('O campo "' + campo.Rotulo + '" não é do canal '
      + canal.nome + '. Escolha o canal dele antes de excluir.');
  }

  var cabecalho = String(campo.Cabecalho || '');

  if (normalizarParaComparar_(campo.Protegido) === 'sim') {
    throw new Error('O campo "' + campo.Rotulo + '" faz parte do contrato da '
      + 'aba ' + canal.aba + ': o próprio sistema grava na coluna "' + cabecalho
      + '", e os relatórios contam com ela. Ele não pode ser excluído — mas '
      + 'pode sair do formulário: abra o campo e ponha "Aparece no formulário" '
      + 'em Não.');
  }

  var apontando = quemApontaParaAColuna_(canal, cabecalho);
  if (apontando.length) {
    throw new Error('A coluna "' + cabecalho + '" é usada pela configuração do '
      + 'canal ' + canal.nome + ' em: ' + apontando.join(', ') + '. Troque '
      + 'essas referências em Configurações › Canais de trabalho e exclua '
      + 'depois — senão a tela de Trabalho fica sem esse chão.');
  }

  var apagada = null;
  if (apagarAColuna === true) {
    apagada = removerColuna_(canal.aba, cabecalho);
  }

  apagarRegistroDeVez_('CAMPOS', id);
  esquecerEstruturaLida_();

  registrarAuditoria_('campo.excluir', 'CAMPOS', id,
    cabecalho + (apagada
      ? ' — coluna apagada da aba ' + canal.aba + ', com '
        + apagada.linhasComValor + ' valor(es)'
      : ' — a coluna continua na planilha'));

  return {
    rotulo: String(campo.Rotulo || cabecalho),
    cabecalho: cabecalho,
    canal: canal.nome,
    colunaApagada: !!apagada,
    linhasComValor: apagada ? apagada.linhasComValor : 0
  };
}

function quemApontaParaAColuna_(canal, cabecalho, jaLido) {

  var pronto = jaLido || {};
  var linha = pronto.linhaDoCanal || buscarRegistros_('CANAIS', 'Id',
    converterParaIdentificador_(canal.id), 1)[0];
  if (!linha) return [];

  var procurado = normalizarParaComparar_(cabecalho);
  var achados = [];

  [['ColunaDaData', 'Coluna da data'],
   ['ColunaDaHora', 'Coluna da hora'],
   ['ColunaDoStatus', 'Coluna do status'],
   ['ColunaDaFinalizacao', 'Coluna da finalização'],
   ['ColunaDaAreaResponsavel', 'Coluna do responsável']].forEach(function (par) {
    if (normalizarParaComparar_(linha[par[0]]) === procurado) achados.push(par[1]);
  });

  [['ColunasDaFila', 'Colunas da fila'],
   ['ColunasDaBusca', 'Colunas da busca']].forEach(function (par) {
    var lista = String(linha[par[0]] || '').split(',');
    for (var i = 0; i < lista.length; i++) {
      if (normalizarParaComparar_(lista[i]) === procurado) {
        achados.push(par[1]);
        return;
      }
    }
  });

  (pronto.catalogo || lerRegistros_('CATALOGO')).forEach(function (item) {
    var canalDoItem = converterParaIdentificador_(item.CanalId);
    if (canalDoItem && canalDoItem !== converterParaIdentificador_(canal.id)) return;
    if (normalizarParaComparar_(item.ColunaDeCarimbo) !== procurado) return;
    achados.push(normalizarParaComparar_(item.Tipo) === 'status'
      ? 'o carimbo do status "' + item.Nome + '"'
      : 'o carimbo do item "' + item.Nome + '" (lista ' + item.Tipo + ')');
  });

  return achados;
}

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
        final: normalizarParaComparar_(item.Final) === 'sim',
        ordem: Number(item.Ordem) || 0,
        ativo: normalizarParaComparar_(item.Ativo) === 'sim'
      };
    });
}

function salvarItemDoCatalogo(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  dados = dadosDaTela_(dados);

  var nome = String(dados.nome || '').trim();
  if (!nome) throw new Error('Dê um nome ao item.');

  var tipo = String(dados.tipo || '').trim().toUpperCase();
  if (!tipo) throw new Error('Diga de que lista o item faz parte.');

  var id = converterParaIdentificador_(dados.id);
  var atual = id ? buscarRegistros_('CATALOGO', 'Id', id, 1)[0] : null;
  if (id && !atual) throw new Error('Item ' + id + ' não encontrado.');

  var campos = {
    Tipo: tipo,

    CanalId: dados.canalId === undefined && atual
      ? converterParaIdentificador_(atual.CanalId)
      : converterParaIdentificador_(dados.canalId),
    Codigo: converterParaIdentificador_(dados.codigo),
    Nome: nome,
    Rotulo: String(dados.rotulo || nome),
    Cor: tomValido_(dados.cor),
    Ordem: Number(dados.ordem) || 0,
    Ativo: dados.ativo === false ? 'NAO' : 'SIM'
  };

  if (tipo === 'STATUS' || listaUsadaPorCampo_(tipo)) {
    campos.ColunaDeCarimbo = String(dados.colunaDeCarimbo || '').trim();
    var mudouOCarimbo = !atual || normalizarParaComparar_(atual.ColunaDeCarimbo)
      !== normalizarParaComparar_(campos.ColunaDeCarimbo);
    if (campos.ColunaDeCarimbo && mudouOCarimbo) {
      conferirColunaDoCarimbo_(tipo, campos.CanalId, campos.ColunaDeCarimbo);
    }
  }
  if (tipo === 'STATUS') {

    if (posicaoDaColuna_(estruturaDaAba_('CATALOGO'), 'Final') >= 0) {
      campos.Final = dados.final === true ? 'SIM' : 'NAO';
    }
  }

  if (id) {
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
    if (normalizarParaComparar_(atual.Nome) !== normalizarParaComparar_(nome)) {
      renomearNosCartoes_(atual.Nome, nome, tipo, campos.CanalId);
    }
    registrarAuditoria_('catalogo.editar', 'CATALOGO', id, tipo);
    return id;
  }

  var criado = inserirRegistro_('CATALOGO', campos);
  registrarAuditoria_('catalogo.criar', 'CATALOGO', criado.__id, tipo);
  return criado.__id;
}

function renomearNosCartoes_(antigo, novo, tipo, canalDoItem) {
  var velho = normalizarParaComparar_(antigo);
  var doItem = converterParaIdentificador_(canalDoItem);
  var listaDaColuna = {};
  lerRegistros_('CAMPOS').forEach(function (campo) {
    var catalogo = String(lerConfiguracaoDoCampo_(campo).catalogo || '').toUpperCase();
    if (!catalogo) return;
    listaDaColuna[converterParaIdentificador_(campo.CanalId) + '|'
      + normalizarParaComparar_(campo.Cabecalho)] = catalogo;
  });
  lerRegistros_('PAINEIS').forEach(function (linha) {
    if (normalizarParaComparar_(linha.TipoWidget) !== 'cartao') return;
    if (normalizarParaComparar_(linha.Filtro) !== velho) return;
    var canal = converterParaIdentificador_(linha.CanalId);
    if (doItem && canal !== doItem) return;
    var dimensao = dimensaoDoCartao_(linha.CampoDimensao);
    var dele = (dimensao === 'situacao' && tipo === 'STATUS')
      || (dimensao === 'valor'
        && listaDaColuna[canal + '|' + normalizarParaComparar_(linha.CampoMedida)] === tipo);
    if (dele) atualizarRegistro_('PAINEIS', linha.__id, { Filtro: novo });
  });
}

function listaUsadaPorCampo_(tipo) {
  var procurada = normalizarParaComparar_(tipo);
  return lerRegistros_('CAMPOS').some(function (campo) {
    if (String(campo.TipoCampo || '') !== 'seletor') return false;
    return normalizarParaComparar_(lerConfiguracaoDoCampo_(campo).catalogo) === procurada;
  });
}

function canaisDoCarimbo_(tipo, canalId) {
  var doItem = converterParaIdentificador_(canalId);
  var ehStatus = normalizarParaComparar_(tipo) === 'status';
  var usam = {};
  if (!ehStatus) {
    lerRegistros_('CAMPOS').forEach(function (campo) {
      if (String(campo.TipoCampo || '') !== 'seletor') return;
      if (normalizarParaComparar_(lerConfiguracaoDoCampo_(campo).catalogo)
        !== normalizarParaComparar_(tipo)) return;
      usam[converterParaIdentificador_(campo.CanalId)] = true;
    });
  }
  return canaisVisiveis_().filter(function (canal) {
    var id = converterParaIdentificador_(canal.id);
    if (doItem) return id === doItem;
    return ehStatus || usam[id];
  });
}

function colunasQueRecebemCarimbo_(nomeDaAba) {
  var estrutura = estruturaDaAba_(nomeDaAba);
  var suas = colunasSuasDaAba_(nomeDaAba);
  return estrutura.cabecalhos.filter(function (cabecalho, posicao) {
    if (!cabecalho || String(cabecalho).charAt(0) === '_') return false;
    var tipo = estrutura.tipos[posicao];
    return tipo === 'data' || tipo === 'dataHora'
      || suas[normalizarParaComparar_(cabecalho)] === true;
  });
}

function opcoesDoCarimboDoItem(tipo) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var ehStatus = normalizarParaComparar_(tipo) === 'status';
  var carimba = ehStatus || listaUsadaPorCampo_(tipo);
  var usam = carimba ? canaisDoCarimbo_(tipo, '').map(function (canal) {
    return converterParaIdentificador_(canal.id);
  }) : [];

  return {
    carimba: carimba,
    canais: canaisVisiveis_().map(function (canal) {
      var colunas = [];
      try {
        colunas = carimba ? colunasQueRecebemCarimbo_(canal.aba) : [];
      } catch (erro) {
        colunas = [];
      }
      return {
        id: converterParaIdentificador_(canal.id),
        nome: String(canal.nome),
        usaALista: usam.indexOf(converterParaIdentificador_(canal.id)) >= 0,
        colunas: colunas
      };
    })
  };
}

function conferirColunaDoCarimbo_(tipo, canalId, coluna) {
  var canais = canaisDoCarimbo_(tipo, canalId);
  var aceitas = [];
  var serve = canais.some(function (canal) {
    var daBase = [];
    try { daBase = colunasQueRecebemCarimbo_(canal.aba); } catch (erro) { daBase = []; }
    daBase.forEach(function (uma) { if (aceitas.indexOf(uma) < 0) aceitas.push(uma); });
    return daBase.some(function (uma) {
      return normalizarParaComparar_(uma) === normalizarParaComparar_(coluna);
    });
  });
  if (serve) return;
  throw new Error('A coluna "' + coluna + '" não recebe carimbo '
    + (canais.length === 1 ? 'em ' + canais[0].nome : 'nos canais deste item')
    + '. Escolha uma coluna de data, ou uma coluna sua'
    + (aceitas.length ? ': ' + aceitas.join(', ') : '') + '.');
}

function quantosCasosUsam_(item) {
  var procurado = normalizarParaComparar_(item.Nome);
  var lista = String(item.Tipo || '').trim().toUpperCase();
  var doCanal = converterParaIdentificador_(item.CanalId);
  var campos = lerRegistros_('CAMPOS');
  var quantos = 0;

  canaisVisiveis_().forEach(function (canal) {
    if (doCanal && converterParaIdentificador_(canal.id) !== doCanal) return;
    var estrutura;
    try {
      estrutura = estruturaDaAba_(canal.aba);
    } catch (erro) {
      return;
    }

    var colunas = [];
    campos.forEach(function (campo) {
      if (converterParaIdentificador_(campo.CanalId) !== converterParaIdentificador_(canal.id)) return;
      if (String(lerConfiguracaoDoCampo_(campo).catalogo || '').trim().toUpperCase() !== lista) return;
      colunasDoCampo_(campo, { cabecalho: String(campo.Cabecalho || '') }).forEach(function (cabecalho) {
        if (posicaoDaColuna_(estrutura, cabecalho) >= 0 && colunas.indexOf(cabecalho) < 0) {
          colunas.push(cabecalho);
        }
      });
    });
    if (!colunas.length) {
      colunas = estrutura.cabecalhos.filter(function (cabecalho) {
        return cabecalho && String(cabecalho).charAt(0) !== '_';
      });
    }

    var linhasQueTem = {};
    colunas.forEach(function (cabecalho) {
      lerColunaInteira_(canal.aba, cabecalho).forEach(function (valor, i) {
        if (!linhasQueTem[i] && normalizarParaComparar_(valor) === procurado) {
          linhasQueTem[i] = true;
          quantos++;
        }
      });
    });
  });
  return quantos;
}

const RECC_TIPO_LISTA = 'LISTA';

const RECC_LISTAS_DO_SISTEMA = ['STATUS', 'CARGO', 'DISPONIBILIDADE', 'SEGMENTO'];

const RECC_TIPOS_FORA_DAS_LISTAS = ['NIVEL_ACESSO', RECC_TIPO_LISTA];

function nomeLegivelDaLista_(chave) {
  var texto = String(chave || '').toLowerCase().replace(/_/g, ' ');
  return texto.charAt(0).toUpperCase() + texto.substring(1);
}

function chaveDaLista_(nome) {
  return String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function listasDeAjustes_() {
  var catalogo = lerRegistros_('CATALOGO');
  var porChave = {};
  function lista(chave) {
    if (!porChave[chave]) {
      porChave[chave] = { chave: chave, nome: '', idDoRegistro: '', quantos: 0,
        usadaEm: [], doSistema: RECC_LISTAS_DO_SISTEMA.indexOf(chave) >= 0 };
    }
    return porChave[chave];
  }

  catalogo.forEach(function (item) {
    var tipo = String(item.Tipo || '').trim().toUpperCase();
    if (!tipo || tipo === 'NIVEL_ACESSO') return;
    if (tipo === RECC_TIPO_LISTA) {
      var registrada = lista(String(item.Nome || '').trim().toUpperCase());
      registrada.nome = String(item.Rotulo || '').trim();
      registrada.idDoRegistro = item.__id;
      return;
    }
    lista(tipo).quantos++;
  });

  var nomesDosCanais = {};
  lerRegistros_('CANAIS').forEach(function (canal) {
    nomesDosCanais[converterParaIdentificador_(canal.Id)] = String(canal.Nome || '');
  });
  lerRegistros_('CAMPOS').forEach(function (campo) {
    var chave = String(lerConfiguracaoDoCampo_(campo).catalogo || '').trim().toUpperCase();
    if (!chave || !porChave[chave]) return;
    var canal = nomesDosCanais[converterParaIdentificador_(campo.CanalId)];
    porChave[chave].usadaEm.push(String(campo.Rotulo || campo.Cabecalho)
      + (canal ? ' (' + canal + ')' : ''));
  });

  return Object.keys(porChave).map(function (chave) {
    var uma = porChave[chave];
    if (!uma.nome) uma.nome = nomeLegivelDaLista_(chave);
    return uma;
  }).sort(function (uma, outra) { return uma.nome.localeCompare(outra.nome, 'pt-BR'); });
}

function acharLista_(chave) {
  var procurada = String(chave || '').trim().toUpperCase();
  var achada = listasDeAjustes_().filter(function (lista) {
    return lista.chave === procurada;
  })[0];
  if (!achada) throw new Error('A lista ' + procurada + ' não existe.');
  return achada;
}

function criarLista(nome) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var legivel = String(nome || '').trim();
  if (!legivel) throw new Error('Dê um nome à lista.');
  var chave = chaveDaLista_(legivel);
  if (!chave) throw new Error('O nome da lista precisa ter ao menos uma letra ou número.');
  if (RECC_TIPOS_FORA_DAS_LISTAS.indexOf(chave) >= 0) {
    throw new Error('"' + legivel + '" é um nome reservado do sistema. Escolha outro.');
  }
  var existente = listasDeAjustes_().filter(function (lista) {
    return lista.chave === chave;
  })[0];
  if (existente) {
    throw new Error('Já existe a lista "' + existente.nome + '". Escolha outro nome.');
  }

  var criado = inserirRegistro_('CATALOGO', novoItemDeCatalogo_(RECC_TIPO_LISTA, '',
    chave, 0, ''));
  atualizarRegistro_('CATALOGO', criado.__id, { Rotulo: legivel });
  registrarAuditoria_('lista.criar', 'CATALOGO', criado.__id, chave + ' — ' + legivel);
  return chave;
}

function renomearLista(chave, nome) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var legivel = String(nome || '').trim();
  if (!legivel) throw new Error('Dê um nome à lista.');
  var lista = acharLista_(chave);
  if (lista.idDoRegistro) {
    atualizarRegistro_('CATALOGO', lista.idDoRegistro, { Rotulo: legivel });
  } else {

    var criado = inserirRegistro_('CATALOGO', novoItemDeCatalogo_(RECC_TIPO_LISTA, '',
      lista.chave, 0, ''));
    atualizarRegistro_('CATALOGO', criado.__id, { Rotulo: legivel });
  }
  registrarAuditoria_('lista.renomear', 'CATALOGO', lista.idDoRegistro, lista.chave
    + ' — ' + lista.nome + ' → ' + legivel);
  return true;
}

function excluirLista(chave) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var lista = acharLista_(chave);
  if (lista.doSistema) {
    throw new Error('A lista "' + lista.nome + '" é usada por dentro do sistema e não '
      + 'pode ser excluída. Os itens dela se editam e se excluem um a um.');
  }
  if (lista.usadaEm.length) {
    throw new Error('A lista "' + lista.nome + '" é usada pelo campo ' + lista.usadaEm.join(', ')
      + '. Troque a lista desse campo em Cadastrar Caso, e exclua depois.');
  }
  var apagados = 0;
  lerRegistros_('CATALOGO').forEach(function (item) {
    var tipo = String(item.Tipo || '').trim().toUpperCase();
    var ehOItem = tipo === lista.chave;
    var ehORegistro = tipo === RECC_TIPO_LISTA
      && String(item.Nome || '').trim().toUpperCase() === lista.chave;
    if (!ehOItem && !ehORegistro) return;
    apagarRegistroDeVez_('CATALOGO', item.__id);
    if (ehOItem) apagados++;
  });
  registrarAuditoria_('lista.excluir', 'CATALOGO', '', lista.chave + ' — ' + lista.nome
    + ', com ' + apagados + ' item(ns)');
  return { nome: lista.nome, itens: apagados };
}

function usoDoItemDoCatalogo(id) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var item = buscarRegistros_('CATALOGO', 'Id', converterParaIdentificador_(id), 1)[0];
  if (!item) throw new Error('Item ' + id + ' não encontrado.');
  return { nome: String(item.Rotulo || item.Nome), casos: quantosCasosUsam_(item) };
}

function excluirItemDoCatalogo(id) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var alvo = converterParaIdentificador_(id);
  var item = buscarRegistros_('CATALOGO', 'Id', alvo, 1)[0];
  if (!item) throw new Error('Item ' + id + ' não encontrado.');
  var tipo = String(item.Tipo || '').trim().toUpperCase();
  if (RECC_TIPOS_FORA_DAS_LISTAS.indexOf(tipo) >= 0) {
    throw new Error('Este registro não é um item de lista.');
  }
  var casos = quantosCasosUsam_(item);
  apagarRegistroDeVez_('CATALOGO', alvo);
  registrarAuditoria_('catalogo.excluir', 'CATALOGO', alvo, tipo + ' — ' + item.Nome
    + (casos ? ' (gravado em ' + casos + ' caso(s), que mantêm o texto)' : ''));
  return { nome: String(item.Rotulo || item.Nome), casos: casos };
}

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
        escopoNaProdutividade: permissoes.escopoNaProdutividade,
        campos: permissoes.campos,
        defeito: permissoes.defeito,
        pessoas: quantosUsam[item.__id] || 0
      };
    });
}

function salvarNivelDeAcesso(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  dados = dadosDaTela_(dados);
  var id = converterParaIdentificador_(dados.id);
  var atual = id ? buscarRegistros_('CATALOGO', 'Id', id, 1)[0] : null;
  if (id && !atual) throw new Error('Nível ' + id + ' não encontrado.');

  var nome = String(dados.nome || (atual ? atual.Nome : '')).trim();
  if (!nome) {
    throw new Error('Dê um nome ao nível de acesso — é por ele que a pessoa '
      + 'escolhe o nível ao cadastrar alguém, e é ele que define a EQUIPE.');
  }

  lerRegistros_('CATALOGO').forEach(function (item) {
    if (normalizarParaComparar_(item.Tipo) !== 'nivelacesso') return;
    if (converterParaIdentificador_(item.Id) === id) return;
    if (normalizarParaComparar_(item.Nome) !== normalizarParaComparar_(nome)) return;
    throw new Error('Já existe um nível chamado "' + item.Nome + '". '
      + 'Como o nível também define a equipe, dois com o mesmo nome seriam '
      + 'duas equipes indistinguíveis na tela.');
  });

  var telas = Array.isArray(dados.telas) ? dados.telas : [];
  var acoes = Array.isArray(dados.acoes) ? dados.acoes : [];

  acoes.forEach(function (acao) {
    var conhecida = false;
    Object.keys(RECC_ACOES).forEach(function (chave) {
      if (RECC_ACOES[chave] === acao) conhecida = true;
    });
    if (!conhecida) throw new Error('Ação desconhecida: "' + acao + '".');
  });

  var naProdutividade = String(dados.escopoNaProdutividade || 'EQUIPE').toUpperCase();
  if (!RECC_ESCOPOS_DA_PRODUTIVIDADE[naProdutividade]) {
    throw new Error('Alcance desconhecido na Produtividade RECC: "' +
      naProdutividade + '". Os alcances são ' +
      Object.keys(RECC_ESCOPOS_DA_PRODUTIVIDADE).join(', ') + '.');
  }

  telas = telas.filter(function (tela) { return tela !== 'produtividade'; });
  if (naProdutividade !== 'BLOQUEADO') telas.push('produtividade');
  if (!RECC_ESCOPOS[dados.escopo]) {
    throw new Error('Escopo desconhecido: "' + dados.escopo + '". Os escopos ' +
      'são ' + Object.keys(RECC_ESCOPOS).join(', ') + '.');
  }

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

  var configuracao = JSON.stringify({
    escopo: dados.escopo,
    canais: canais,
    telas: telas,
    acoes: acoes,
    escopoNaProdutividade: naProdutividade,
    campos: dados.campos && typeof dados.campos === 'object' ? dados.campos : {},
    componentes: {}
  });

  if (!atual) {

    var ultima = 0;
    lerRegistros_('CATALOGO').forEach(function (item) {
      if (normalizarParaComparar_(item.Tipo) !== 'nivelacesso') return;
      ultima = Math.max(ultima, Number(item.Ordem) || 0);
    });

    var criado = inserirRegistro_('CATALOGO', {
      Tipo: 'NIVEL_ACESSO',
      CanalId: '',
      Codigo: '',
      Nome: nome,
      Rotulo: nome,
      PaiId: '',
      Cor: '',
      Ordem: ultima + 1,
      Ativo: dados.ativo === false ? 'NAO' : 'SIM',
      Configuracao: configuracao
    });
    registrarAuditoria_('nivel.criar', 'CATALOGO', criado.__id, nome);
    return criado.__id;
  }

  atualizarRegistro_('CATALOGO', id, {
    Nome: nome,
    Rotulo: nome,
    Ativo: dados.ativo === false ? 'NAO' : 'SIM',
    Configuracao: configuracao
  });

  registrarAuditoria_('nivel.editar', 'CATALOGO', id, String(atual.Nome));
  return id;
}

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

function opcoesDeNivelDeAcesso() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var oQueCadaAcaoFaz = {
    criar: 'Cadastrar casos novos',
    editar: 'Alterar casos já cadastrados',
    ocultar: 'Tirar um caso da tela (a linha permanece na planilha)',
    exportar: 'Baixar o que está vendo',
    importar: 'Trazer uma base inteira de outra planilha, de uma vez',
    configurar: 'Abrir Configurações e mexer em conteúdo e regra',
    estrutura: 'Criar coluna e canal — pede senha de administrador'
  };

  var oQueCadaEscopoAlcanca = {
    PROPRIOS: 'Só os casos em que a pessoa é a responsável',
    EQUIPE: 'Os casos de quem atende o mesmo canal que ela',
    CANAL: 'Todos os casos dos canais que ela enxerga',
    TODOS: 'Todos os casos, de todos os canais'
  };

  return {

    telas: RECC_TELAS_DO_SISTEMA
      .filter(function (item) { return item.tela !== 'produtividade'; })
      .map(function (item) {
        return { chave: item.tela, titulo: item.titulo };
      }),
    produtividade: {

      titulo: (titulosDasTelas().filter(function (uma) {
        return uma.tela === 'produtividade';
      })[0] || {}).titulo || 'Produtividade RECC',
      opcoes: Object.keys(RECC_ESCOPOS_DA_PRODUTIVIDADE).map(function (chave) {
        return { chave: chave, descricao: RECC_ESCOPOS_DA_PRODUTIVIDADE[chave] };
      })
    },
    acoes: Object.keys(RECC_ACOES).map(function (chave) {
      var acao = RECC_ACOES[chave];
      return { chave: acao, descricao: oQueCadaAcaoFaz[acao] || '' };
    }),
    escopos: Object.keys(RECC_ESCOPOS).map(function (chave) {
      return { chave: chave, descricao: oQueCadaEscopoAlcanca[chave] || '' };
    }),

    canais: canaisVisiveis_().map(function (canal) {
      return { id: canal.id, nome: canal.nome, descricao: canal.descricao || '' };
    })
  };
}

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
        colunaDaFinalizacao: String(canal.ColunaDaFinalizacao || ''),
        colunaDaAreaResponsavel: String(canal.ColunaDaAreaResponsavel || ''),
        colunaDoValor: String(canal.ColunaDoValor || ''),
        situacoesDestacadas: String(canal.SituacoesDestacadas || ''),

        confereSusepBloqueada:
          normalizarParaComparar_(canal.ConfereSusepBloqueada) !== 'nao',
        slaHorasUteis: Number(canal.SlaHorasUteis) || 0,
        inicioDoExpediente: horaDoExpediente_(canal.InicioDoExpediente),
        fimDoExpediente: horaDoExpediente_(canal.FimDoExpediente),
        colunaDaPrimeiraResposta: String(canal.ColunaDaPrimeiraResposta || ''),
        colunaDaHoraDaPrimeiraResposta: String(canal.ColunaDaHoraDaPrimeiraResposta || ''),
        icone: String(canal.Icone || ''),
        ordem: Number(canal.Ordem) || 0,
        ativo: normalizarParaComparar_(canal.Ativo) === 'sim',
        colunasDaBase: colunas,
        situacoes: situacoes
      };
    });
}

function salvarCanal(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  dados = dadosDaTela_(dados);

  var id = converterParaIdentificador_(dados.id);
  var atual = buscarRegistros_('CANAIS', 'Id', id, 1)[0];
  if (!atual) throw new Error('Canal ' + id + ' não encontrado.');

  if (dados.aba && String(dados.aba) !== String(atual.Aba)) {
    throw new Error('A aba de um canal não muda por aqui: os casos já ' +
      'gravados moram nela. Crie outro canal apontando para a aba nova.');
  }

  var nome = String(dados.nome || '').trim();
  if (!nome) throw new Error('Dê um nome ao canal.');

  var estrutura = estruturaDaAba_(String(atual.Aba));
  ['colunaDaData', 'colunaDaHora', 'colunaDoStatus', 'colunaDaFinalizacao',
    'colunaDaAreaResponsavel', 'colunaDoValor',
    'colunaDaPrimeiraResposta', 'colunaDaHoraDaPrimeiraResposta'].forEach(function (chave) {
    conferirQueAColunaExiste_(estrutura, dados[chave], atual.Aba);
  });

  String(dados.colunasDaBusca || '').split(',').forEach(function (pedaco) {
    conferirQueAColunaExiste_(estrutura, pedaco, atual.Aba);
  });
  String(dados.colunasDaFila || '').split(';').forEach(function (grupo) {
    var lista = grupo.indexOf(':') > 0
      ? grupo.substring(grupo.indexOf(':') + 1) : grupo;

    lista.split(',').forEach(function (pedaco) {
      pedaco.split('+').forEach(function (parte) {
        conferirQueAColunaExiste_(estrutura, parte, atual.Aba);
      });
    });
  });

  if (dados.ativo === false) {
    var outrasAtivas = lerRegistros_('CANAIS').filter(function (canal) {
      return converterParaIdentificador_(canal.Id) !== id
        && normalizarParaComparar_(canal.Ativo) === 'sim';
    });
    if (!outrasAtivas.length) {
      throw new Error('Este é o último canal ativo. Desligá-lo deixaria o ' +
        'Trabalho e o cadastro sem nenhuma base para trabalhar.');
    }
  }

  var sla = slaDoFormulario_(dados, atual);

  atualizarRegistro_('CANAIS', id, Object.assign(sla, {
    Nome: nome,
    Descricao: String(dados.descricao === undefined ? atual.Descricao : dados.descricao),
    ColunaDaData: String(dados.colunaDaData || ''),
    ColunaDaHora: String(dados.colunaDaHora || ''),
    ColunaDoStatus: String(dados.colunaDoStatus || ''),
    ColunasDaFila: String(dados.colunasDaFila || ''),
    ColunasDaBusca: String(dados.colunasDaBusca || ''),
    ColunaDaFinalizacao: String(dados.colunaDaFinalizacao || ''),
    ColunaDaAreaResponsavel: String(dados.colunaDaAreaResponsavel || ''),
    ColunaDoValor: String(dados.colunaDoValor || ''),
    SituacoesDestacadas: String(dados.situacoesDestacadas || ''),

    ConfereSusepBloqueada: dados.confereSusepBloqueada === undefined
      ? String(atual.ConfereSusepBloqueada === undefined ? '' : atual.ConfereSusepBloqueada)
      : (dados.confereSusepBloqueada === false ? 'NAO' : 'SIM'),
    Icone: String(dados.icone || atual.Icone || ''),
    Ordem: Number(dados.ordem) || Number(atual.Ordem) || 0,
    Ativo: dados.ativo === false ? 'NAO' : 'SIM'
  }));

  esquecerEstruturaLida_();
  registrarAuditoria_('canal.editar', 'CANAIS', id, nome);
  return true;
}

function slaDoFormulario_(dados, atual) {
  var colunasDeCanais = estruturaDaAba_('CANAIS');
  if (posicaoDaColuna_(colunasDeCanais, 'SlaHorasUteis') < 0) return {};

  function ouOAtual(chave, cabecalho) {
    return dados[chave] === undefined ? atual[cabecalho] : dados[chave];
  }
  var horas = Number(String(ouOAtual('slaHorasUteis', 'SlaHorasUteis') || 0)
    .replace(',', '.'));
  if (!isFinite(horas) || horas < 0) {
    throw new Error('O SLA é em horas úteis: um número, como 6. Zero desliga.');
  }
  var inicio = horaDoExpediente_(ouOAtual('inicioDoExpediente', 'InicioDoExpediente'));
  var fim = horaDoExpediente_(ouOAtual('fimDoExpediente', 'FimDoExpediente'));
  if (horas > 0) {
    if (!inicio || !fim) {
      throw new Error('Com SLA, o expediente precisa de início e fim, no formato '
        + '08:15 e 18:30 — é só dentro dele que o prazo corre.');
    }
    if (minutosDaHoraDoExpediente_(inicio) >= minutosDaHoraDoExpediente_(fim)) {
      throw new Error('O expediente termina antes de começar: ' + inicio + ' até ' + fim + '.');
    }
  }
  return {
    SlaHorasUteis: horas,
    InicioDoExpediente: inicio,
    FimDoExpediente: fim,
    ColunaDaPrimeiraResposta: String(ouOAtual('colunaDaPrimeiraResposta',
      'ColunaDaPrimeiraResposta') || ''),
    ColunaDaHoraDaPrimeiraResposta: String(ouOAtual('colunaDaHoraDaPrimeiraResposta',
      'ColunaDaHoraDaPrimeiraResposta') || '')
  };
}

function horaDoExpediente_(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return isNaN(valor.getTime()) ? ''
      : Utilities.formatDate(valor, RECC_FUSO_HORARIO, 'HH:mm');
  }
  var partes = /^(\d{1,2})[:h](\d{2})$/.exec(String(valor).trim());
  if (!partes) return '';
  var hora = Number(partes[1]);
  var minuto = Number(partes[2]);
  if (hora > 23 || minuto > 59) return '';
  return (hora < 10 ? '0' : '') + hora + ':' + partes[2];
}

function minutosDaHoraDoExpediente_(texto) {
  var partes = String(texto || '').split(':');
  return Number(partes[0]) * 60 + Number(partes[1]);
}

function criarCanal(dados) {
  exigirPermissao_(RECC_ACOES.ESTRUTURA);
  exigirSenhaDeAdministrador_();
  dados = dadosDaTela_(dados);

  var nome = String(dados.nome || '').trim();
  if (!nome) {
    throw new Error('Dê um nome ao canal — é ele que aparece no seletor do '
      + 'Trabalho e em todo relatório.');
  }

  var aproveitar = dados.aproveitarAAba === true;
  var nomeDaAba = String(dados.aba || '').trim() || nomeDeAbaSugerido_(nome);

  conferirQueONomeDaAbaServe_(nomeDaAba);

  lerRegistros_('CANAIS').forEach(function (canal) {
    if (normalizarParaComparar_(canal.Nome) === normalizarParaComparar_(nome)) {
      throw new Error('Já existe um canal chamado "' + canal.Nome + '".');
    }
    if (normalizarParaComparar_(canal.Aba) === normalizarParaComparar_(nomeDaAba)) {
      throw new Error('A aba "' + nomeDaAba + '" já é a base do canal "'
        + canal.Nome + '". Duas canais na mesma aba mostrariam os mesmos casos '
        + 'em dois lugares, e cada uma com as suas regras.');
    }
  });

  var planilha = planilhaAtiva_();
  var abaExistente = planilha.getSheetByName(nomeDaAba);
  var temDado = abaExistente && quantasLinhasPreenchidas_(abaExistente) > 0;

  if (temDado && !aproveitar) {
    throw new Error('A aba "' + nomeDaAba + '" já existe e tem dado dentro. '
      + 'Escolha outro nome de aba, ou marque "aproveitar a aba que já existe" '
      + '— aí o canal passa a trabalhar essa base como ela está, sem mexer no '
      + 'cabeçalho dela.');
  }

  if (temDado) {

    var estrutura = estruturaDaAba_(nomeDaAba, true);
    if (posicaoDaColuna_(estrutura, 'Id') < 0) {
      throw new Error('A aba "' + nomeDaAba + '" não tem coluna de Id, e sem '
        + 'ela o sistema não sabe de qual linha cada caso é — nem para abrir, '
        + 'nem para editar. Crie uma coluna chamada "id" na aba e tente de '
        + 'novo.');
    }
    garantirColunasDeControle_(nomeDaAba, true);
  } else {

    criarAbaDoContrato_(planilha, {
      aba: nomeDaAba,
      titulo: nome,
      controle: true,

      reserva: 200,
      colunas: [{ cabecalho: 'id', tipo: 'identificador', protegido: true }]
        .concat(colunasDeControleDe_(true))
    });
  }

  esquecerEstruturaLida_();

  var ultima = 0;
  lerRegistros_('CANAIS').forEach(function (canal) {
    ultima = Math.max(ultima, Number(canal.Ordem) || 0);
  });

  var criado = inserirRegistro_('CANAIS', {
    Nome: nome,
    Descricao: String(dados.descricao || ''),
    Aba: nomeDaAba,
    ColunaDaData: '',
    ColunaDaHora: '',
    ColunaDoStatus: '',
    ColunasDaFila: '',
    ColunasDaBusca: '',
    ColunaDaFinalizacao: '',
    ColunaDaAreaResponsavel: '',
    ColunaDoValor: '',
    SituacoesDestacadas: '',

    ConfereSusepBloqueada: true,
    Icone: String(dados.icone || ''),
    Ordem: ultima + 1,
    Ativo: true
  });

  esquecerEstruturaLida_();

  var colunasRegistradas = temDado ? registrarColunasQueJaExistem_(nomeDaAba) : [];

  esquecerEstruturaLida_();
  registrarAuditoria_('canal.criar', 'CANAIS', criado.__id,
    nome + ' — aba ' + nomeDaAba + (temDado ? ' (aba aproveitada)' : ''));

  return {
    id: criado.__id,
    nome: nome,
    aba: nomeDaAba,
    abaAproveitada: !!temDado,
    colunasRegistradas: colunasRegistradas,
    proximosPassos: [
      'Em Cadastrar Caso, crie os campos do formulário deste canal.',
      'Volte aqui e aponte a coluna da data e a coluna da situação.',
      'Em Configurações › Ajustes Gerais, cadastre as situações deste canal.',
      'Em Níveis de acesso, marque quem enxerga este canal.'
    ]
  };
}

function nomeDeAbaSugerido_(nome) {

  var semAcento = String(nome || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  var limpo = semAcento.toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return 'BASE_' + (limpo || 'NOVO');
}

function conferirQueONomeDaAbaServe_(nomeDaAba) {
  var nome = String(nomeDaAba || '').trim();
  if (!nome) throw new Error('Diga em que aba este canal vai gravar.');

  if (nome.indexOf(RECC_PREFIXO_ANALISE) === 0) {
    throw new Error('O prefixo "' + RECC_PREFIXO_ANALISE + '" é das abas de '
      + 'análise, que o sistema apaga e refaz. Um canal ali perderia os casos '
      + 'na próxima geração. Escolha outro nome.');
  }
  if (RECC_ESQUEMA[nome]) {
    throw new Error('A aba "' + nome + '" é do contrato do sistema. Escolha '
      + 'outro nome: duas coisas na mesma aba sempre acabam em dado perdido.');
  }
  if (nome.charAt(0) === '_') {
    throw new Error('Nome de aba não começa com "_": esse prefixo marca o que '
      + 'é de sistema, e o Power BI o usa para saber o que ignorar.');
  }
}

function registrarColunasQueJaExistem_(nomeDaAba) {
  var estrutura = estruturaDaAba_(nomeDaAba, true);
  var jaEmCampos = {};
  lerRegistros_('CAMPOS').forEach(function (campo) {
    if (normalizarParaComparar_(campo.Aba) !== normalizarParaComparar_(nomeDaAba)) return;
    jaEmCampos[normalizarParaComparar_(campo.Cabecalho)] = true;
  });

  var registradas = [];
  estrutura.cabecalhos.forEach(function (cabecalho, posicao) {
    var texto = String(cabecalho || '').trim();
    if (!texto || texto.charAt(0) === '_') return;
    if (normalizarParaComparar_(texto) === 'id') return;
    if (jaEmCampos[normalizarParaComparar_(texto)]) return;

    registrarColunaEmCampos_(nomeDaAba, texto, RECC_TIPO_DE_DADO.TEXTO, posicao + 1);
    registradas.push(texto);
  });
  return registradas;
}

function conferirQueAColunaExiste_(estrutura, nomeDaColuna, nomeDaAba) {
  var nome = String(nomeDaColuna || '').trim();
  if (!nome) return;
  if (posicaoDaColuna_(estrutura, nome) >= 0) return;

  throw new Error('A coluna "' + nome + '" não existe na aba ' + nomeDaAba +
    '. As colunas dela são: ' + estrutura.cabecalhos.filter(function (cabecalho) {
      return cabecalho && cabecalho.charAt(0) !== '_';
    }).join(', ') + '.');
}

const RECC_MAXIMO_DE_CARTOES = 12;

function listarCardsDoPainel(tela, idDoCanal) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var alvo = normalizarParaComparar_(tela) || 'trabalho';

  var oQueContar = [
    { chave: 'total', rotulo: 'Total de casos', filtro: '', grupo: 'Status' }
  ];
  situacoesDoCanal_(canal).forEach(function (situacao) {

    oQueContar.push({
      chave: 'situacao', rotulo: situacao.nome, filtro: situacao.gravadoComo,
      grupo: 'Status'
    });
  });
  if (canal.colunaDaFinalizacao && canal.colunaDaAreaResponsavel) {
    oQueContar.push({
      chave: 'naCelula', rotulo: 'Finalizados na célula', filtro: '',
      grupo: 'Status'
    });
  }

  var estruturaDaBase = estruturaDaAba_(canal.aba);
  situacoesDoCanal_(canal).forEach(function (situacao) {
    if (!situacao.colunaDeCarimbo) return;
    if (posicaoDaColuna_(estruturaDaBase, situacao.colunaDeCarimbo) < 0) return;
    oQueContar.push({
      chave: 'preenchido',
      rotulo: 'Já passaram por: ' + situacao.nome,
      filtro: situacao.colunaDeCarimbo,
      grupo: 'Já passaram por (carimbo)'
    });
  });

  oQueContar = oQueContar.concat(opcoesDeCartaoPelasColunas_(canal, oQueContar));

  var cartoes = lerRegistros_('PAINEIS')
    .filter(function (linha) {
      if (normalizarParaComparar_(linha.Tela) !== alvo) return false;
      if (normalizarParaComparar_(linha.TipoWidget) !== 'cartao') return false;
      if (converterParaIdentificador_(linha.CanalId)
        !== converterParaIdentificador_(canal.id)) return false;
      return !cartaoFoiRemovido_(linha);
    })
    .sort(function (um, outro) {
      return (Number(um.Ordem) || 0) - (Number(outro.Ordem) || 0);
    })
    .map(function (linha) {
      var cartao = {
        id: linha.__id,
        titulo: String(linha.Titulo || ''),
        dimensao: dimensaoDoCartao_(linha.CampoDimensao) || 'total',
        filtro: String(linha.Filtro || ''),
        coluna: String(linha.CampoMedida || ''),
        cor: tomValido_(linha.Cor),
        ordem: Number(linha.Ordem) || 0,
        mostrar: normalizarParaComparar_(linha.Ativo) === 'sim'
      };

      cartao.naoExiste = motivoDoCartaoQueNaoExiste_(cartao, canal, estruturaDaBase);
      return cartao;
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

function cartaoFoiRemovido_(linha) {
  return normalizarParaComparar_(linha.Ativo) !== 'sim' && !(Number(linha.Ordem) > 0);
}

function motivoDoCartaoQueNaoExiste_(cartao, canal, estrutura) {
  if (cartao.dimensao === 'situacao') {
    var existe = situacoesDoCanal_(canal).some(function (situacao) {
      return normalizarParaComparar_(situacao.gravadoComo) === normalizarParaComparar_(cartao.filtro);
    });
    return existe ? '' : 'O status "' + cartao.filtro + '" não existe mais no canal. Troque o '
      + 'que o cartão conta, ou remova o cartão.';
  }
  var coluna = cartao.dimensao === 'valor' ? cartao.coluna
    : (cartao.dimensao === 'preenchido' ? cartao.filtro : '');
  if (coluna && posicaoDaColuna_(estrutura, coluna) < 0) {
    return 'A coluna "' + coluna + '" não existe mais na aba ' + canal.aba + '. Troque o que o '
      + 'cartão conta, ou remova o cartão.';
  }
  return '';
}

const RECC_TIPOS_DE_DATA_PARA_OS_CARTOES = ['data', 'dataHora', 'hora'];

function opcoesDeCartaoPelasColunas_(canal, jaOferecidas) {
  var estrutura = estruturaDaAba_(canal.aba);
  var doStatus = normalizarParaComparar_(canal.colunaDoStatus);

  var cobertas = {};
  jaOferecidas.forEach(function (opcao) {
    if (opcao.chave === 'preenchido') cobertas[normalizarParaComparar_(opcao.filtro)] = true;
  });

  var campoDaColuna = {};
  lerRegistros_('CAMPOS').forEach(function (campo) {
    if (converterParaIdentificador_(campo.CanalId)
      !== converterParaIdentificador_(canal.id)) return;
    campoDaColuna[normalizarParaComparar_(campo.Cabecalho)] = campo;
  });

  var valores = [];
  var preenchidas = [];
  estrutura.cabecalhos.forEach(function (cabecalho, posicao) {
    var chave = normalizarParaComparar_(cabecalho);
    if (!chave || String(cabecalho).charAt(0) === '_') return;

    if (chave === doStatus || chave === 'id' || cobertas[chave]) return;
    var tipo = estrutura.tipos[posicao];
    if (RECC_TIPOS_DE_DATA_PARA_OS_CARTOES.indexOf(tipo) >= 0) return;

    var campo = campoDaColuna[chave];
    var nome = campo ? String(campo.Rotulo || cabecalho) : cabecalho;
    var opcoes = opcoesDeValorDoCartao_(campo, tipo, canal);

    if (opcoes.length) {
      opcoes.forEach(function (opcao) {
        valores.push({ chave: 'valor', rotulo: nome + ': ' + opcao.rotulo,
          filtro: opcao.valor, coluna: cabecalho, grupo: 'Valor de um campo' });
      });
      return;
    }
    preenchidas.push({ chave: 'preenchido', rotulo: 'Preenchida: ' + nome,
      filtro: cabecalho, grupo: 'Coluna preenchida' });
  });
  return valores.concat(preenchidas);
}

function opcoesDeValorDoCartao_(campo, tipo, canal) {
  var tipoDoCampo = campo ? String(campo.TipoCampo || '') : '';
  if (tipo === 'simOuNao' || tipoDoCampo === 'simOuNao') {
    return [{ valor: 'SIM', rotulo: 'Sim' }, { valor: 'NAO', rotulo: 'Não' }];
  }
  if (!campo || tipoDoCampo !== 'seletor') return [];

  var configuracao = lerConfiguracaoDoCampo_(campo);

  if (configuracao.separaEm || configuracao.partirEm || configuracao.listaDe) return [];
  return opcoesDoCampo_(configuracao, canal.id);
}

function salvarCardsDoPainel(tela, idDoCanal, cartoes) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);
  var alvo = normalizarParaComparar_(tela) || 'trabalho';
  var lista = Array.isArray(cartoes) ? cartoes : [];

  if (lista.length > RECC_MAXIMO_DE_CARTOES) {
    throw new Error('São no máximo ' + RECC_MAXIMO_DE_CARTOES + ' cartões por ' +
      'operação, e você mandou ' + lista.length + '. Acima disso a tela vira ' +
      'uma parede de números pequenos, que ninguém lê.');
  }

  var situacoes = situacoesDoCanal_(canal).map(function (s) {
    return s.gravadoComo;
  });

  var comoEstava = {};
  lerRegistros_('PAINEIS').forEach(function (linha) {
    comoEstava[converterParaIdentificador_(linha.__id)] = [
      normalizarParaComparar_(dimensaoDoCartao_(linha.CampoDimensao)),
      normalizarParaComparar_(linha.Filtro), normalizarParaComparar_(linha.CampoMedida)].join('|');
  });
  function mudou(cartao) {
    var id = converterParaIdentificador_(cartao.id);
    if (!id || !comoEstava[id]) return true;
    return comoEstava[id] !== [normalizarParaComparar_(cartao.dimensao),
      normalizarParaComparar_(cartao.filtro),
      normalizarParaComparar_(cartao.dimensao === 'valor' ? cartao.coluna : '')].join('|');
  }

  lista.forEach(function (cartao, posicao) {

    if (!cartao || typeof cartao !== 'object') {
      throw new Error('O card ' + (posicao + 1) + ' chegou vazio da tela. Recarregue a '
        + 'página (Ctrl+F5) e tente de novo.');
    }
    if (!String(cartao.titulo || '').trim()) {
      throw new Error('Todo cartão precisa de um nome — é o que a pessoa lê ' +
        'em cima do número.');
    }
    cartao.dimensao = dimensaoDoCartao_(cartao.dimensao);
    if (!cartao.dimensao) {
      throw new Error('Não sei contar isso. As contagens são: total, ' +
        'situacao, naCelula, preenchido e valor.');
    }
    if (!mudou(cartao)) return;
    if (cartao.dimensao === 'preenchido') {

      conferirQueAColunaExiste_(estruturaDaAba_(canal.aba), cartao.filtro, canal.aba);
    }
    if (cartao.dimensao === 'valor') {

      if (!String(cartao.coluna || '').trim() || !String(cartao.filtro || '').trim()) {
        throw new Error('O card "' + String(cartao.titulo).trim() + '" conta um '
          + 'valor de campo, e precisa da coluna e do valor.');
      }
      conferirQueAColunaExiste_(estruturaDaAba_(canal.aba), cartao.coluna, canal.aba);
    }
    if (cartao.dimensao === 'situacao') {
      var existe = situacoes.some(function (nome) {
        return normalizarParaComparar_(nome) === normalizarParaComparar_(cartao.filtro);
      });
      if (!existe) {
        throw new Error('A situação "' + cartao.filtro + '" não existe no canal ' +
          canal.nome + '. As situações dele são: ' + situacoes.join(', ') + '.');
      }
    }
  });

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

      CampoMedida: cartao.dimensao === 'valor' ? String(cartao.coluna).trim() : '',
      Agregacao: 'contagem',
      Limite: 0,

      Filtro: (cartao.dimensao === 'situacao' || cartao.dimensao === 'preenchido'
        || cartao.dimensao === 'valor')
        ? String(cartao.filtro || '') : '',
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

  jaGravados.forEach(function (linha) {
    if (!continuam[linha.__id]) {
      atualizarRegistro_('PAINEIS', linha.__id, { Ativo: 'NAO', Ordem: 0 });
    }
  });

  registrarAuditoria_('painel.cartoes', 'PAINEIS', '',
    canal.nome + ' · ' + lista.length + ' cartões');
  return true;
}

function salvarIdentidade(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  dados = dadosDaTela_(dados);

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

  if (dados.titulosDasTelas && typeof dados.titulosDasTelas === 'object') {
    var titulos = {};
    RECC_TELAS_DO_SISTEMA.forEach(function (item) {
      var escolhido = String(dados.titulosDasTelas[item.tela] || '').trim();

      titulos[item.tela] = escolhido || item.titulo;
    });
    gravarConfiguracao_('MENU.TITULOS', JSON.stringify(titulos));
  }

  registrarAuditoria_('identidade.editar', 'CONFIG', '', mudancas['IDENTIDADE.NOME']);
  return lerIdentidadeVisual_();
}

function titulosDasTelas() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var guardados = {};
  try {
    guardados = JSON.parse(valorDaConfiguracao_('MENU.TITULOS', '{}'));
  } catch (erro) {
    guardados = {};
  }

  return RECC_TELAS_DO_SISTEMA.map(function (item) {
    return {
      tela: item.tela,
      titulo: guardados[item.tela] || item.titulo,
      deFabrica: item.titulo
    };
  });
}

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

function definirSenhaDeAdministrador(senhaNova, senhaAtual) {
  exigirPermissao_(RECC_ACOES.ESTRUTURA);
  definirSenhaDeAdministrador_(senhaNova, senhaAtual);
  registrarAuditoria_('seguranca.senha', 'CONFIG', '', '');
  return true;
}

function liberarComSenha(senha) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  return conferirSenhaDeAdministrador_(senha);
}

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
        aMais: aba.aMais,
        doFormulario: aba.doFormulario || []
      };
    })
  };
}

function listarAuditoria(quantas) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var limite = Number(quantas) || 50;

  descarregarAFilaDaAuditoria_(5000);

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

var RECC_CHAVE_DO_ARQUIVO_DA_AUDITORIA = 'AUDITORIA.ARQUIVO_ID';
var RECC_CHAVE_DO_ULTIMO_ARQUIVAMENTO = 'AUDITORIA.ARQUIVADA_EM';
var RECC_CHAVE_DO_QUANTO_FOI_ARQUIVADO = 'AUDITORIA.ARQUIVADAS';
var RECC_MESES_QUE_A_AUDITORIA_GUARDA = 2;

function configuracaoDoArquivoDaAuditoria() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var ultimo = dataDoUltimoArquivamento_();
  return {
    planilhaId: String(valorDaConfiguracao_(RECC_CHAVE_DO_ARQUIVO_DA_AUDITORIA, '')).trim(),
    meses: RECC_MESES_QUE_A_AUDITORIA_GUARDA,
    ultimoEm: ultimo
      ? Utilities.formatDate(ultimo, RECC_FUSO_HORARIO, 'dd/MM/yyyy HH:mm') : '',
    ultimoQuantas: Number(valorDaConfiguracao_(RECC_CHAVE_DO_QUANTO_FOI_ARQUIVADO, 0)) || 0,
    linhasNaAuditoria: Math.max(
      ultimaLinhaComConteudo_(estruturaDaAba_('AUDITORIA')) - 1, 0),
    arquivariaAte: Utilities.formatDate(limiteDoArquivamento_(new Date()),
      RECC_FUSO_HORARIO, 'dd/MM/yyyy')
  };
}

function salvarArquivoDaAuditoria(planilhaId) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirSenhaDeAdministrador_();

  var id = String(planilhaId || '').trim();
  if (id) abrirArquivoDaAuditoria_(id);

  gravarConfiguracao_(RECC_CHAVE_DO_ARQUIVO_DA_AUDITORIA, id);
  registrarAuditoria_('auditoria.configurar', 'CONFIG', '',
    id ? 'arquivo em ' + id : 'arquivo desligado');
  return configuracaoDoArquivoDaAuditoria();
}

function arquivarAuditoriaAgora() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirSenhaDeAdministrador_();

  var resultado = arquivarAuditoria_(new Date());
  return {
    arquivadas: resultado.arquivadas,
    ate: resultado.ate,
    configuracao: configuracaoDoArquivoDaAuditoria()
  };
}

function arquivarAuditoriaAgendada() {
  var id = String(valorDaConfiguracao_(RECC_CHAVE_DO_ARQUIVO_DA_AUDITORIA, '')).trim();
  if (!id) return { arquivou: false, motivo: 'sem planilha de arquivo' };

  var agora = new Date();
  var ultimo = dataDoUltimoArquivamento_();
  if (ultimo) {
    var meses = (agora.getFullYear() * 12 + agora.getMonth())
      - (ultimo.getFullYear() * 12 + ultimo.getMonth());
    if (meses < RECC_MESES_QUE_A_AUDITORIA_GUARDA) {
      return { arquivou: false, motivo: 'o último foi há menos de 2 meses' };
    }
  }

  var resultado = arquivarAuditoria_(agora);
  return { arquivou: true, arquivadas: resultado.arquivadas, ate: resultado.ate };
}

function limiteDoArquivamento_(agora) {
  return new Date(agora.getFullYear(),
    agora.getMonth() - RECC_MESES_QUE_A_AUDITORIA_GUARDA, agora.getDate());
}

function dataDoUltimoArquivamento_() {
  var guardado = valorDaConfiguracao_(RECC_CHAVE_DO_ULTIMO_ARQUIVAMENTO, '');
  if (Object.prototype.toString.call(guardado) === '[object Date]') return guardado;
  var m = String(guardado).match(/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?/);
  if (!m) return '';
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    Number(m[4] || 0), Number(m[5] || 0));
}

function abrirArquivoDaAuditoria_(id) {
  var planilha;
  try {
    planilha = SpreadsheetApp.openById(id);
  } catch (erro) {
    throw new Error('Não consegui abrir a planilha de arquivo da auditoria: '
      + (erro.message || erro) + ' Confira o Id (o pedaço do endereço entre '
      + '/d/ e /edit) e se esta conta tem acesso a ela.');
  }

  if (planilha.getId() === planilhaAtiva_().getId()) {
    throw new Error('Esse é o Id desta mesma planilha. O arquivo da auditoria '
      + 'precisa ser OUTRA planilha.');
  }
  return planilha;
}

function arquivarAuditoria_(agora) {
  var id = String(valorDaConfiguracao_(RECC_CHAVE_DO_ARQUIVO_DA_AUDITORIA, '')).trim();
  if (!id) {
    throw new Error('Informe antes o Id da planilha de arquivo da auditoria.');
  }
  var destino = abrirArquivoDaAuditoria_(id);
  var limite = limiteDoArquivamento_(agora);
  var quantas = 0;
  descarregarAFilaDaAuditoria_(10000);

  var trava = LockService.getScriptLock();
  if (!trava.tryLock(30000)) {
    throw new Error('A planilha está ocupada com outra gravação. Tente de novo.');
  }
  try {
    esquecerEstruturaLida_('AUDITORIA');
    var estrutura = estruturaDaAba_('AUDITORIA', true);
    var iData = exigirPosicaoDaColuna_(estrutura, 'DataHora');
    var iId = exigirPosicaoDaColuna_(estrutura, 'Id');
    var total = ultimaLinhaComConteudo_(estrutura) - 1;
    var largura = estrutura.cabecalhos.length;

    var valores = total > 0
      ? estrutura.aba.getRange(2, 1, total, largura).getValues() : [];
    while (quantas < valores.length) {
      var quando = converterParaDataEHora_(valores[quantas][iData]);
      if (!quando || quando.getTime() >= limite.getTime()) break;
      quantas++;
    }

    if (quantas) {
      var velhas = valores.slice(0, quantas);
      copiarParaOArquivo_(destino, estrutura, velhas, iId);

      garantirLinhasNaGrade_(estrutura.aba, quantas + 2);
      estrutura.aba.deleteRows(2, quantas);

      esquecerEstruturaLida_('AUDITORIA');
    }
  } finally {
    trava.releaseLock();
  }

  var ate = Utilities.formatDate(limite, RECC_FUSO_HORARIO, 'dd/MM/yyyy');
  gravarConfiguracao_(RECC_CHAVE_DO_ULTIMO_ARQUIVAMENTO,
    Utilities.formatDate(agora, RECC_FUSO_HORARIO, 'yyyy-MM-dd HH:mm'));
  gravarConfiguracao_(RECC_CHAVE_DO_QUANTO_FOI_ARQUIVADO, String(quantas));
  registrarAuditoria_('auditoria.arquivar', 'AUDITORIA', '',
    quantas + ' linha(s) de antes de ' + ate + ' → ' + id);

  return { arquivadas: quantas, ate: ate };
}

function copiarParaOArquivo_(destino, estrutura, linhas, iId) {
  var aba = destino.getSheetByName('AUDITORIA')
    || destino.insertSheet('AUDITORIA');

  var larguraLa = aba.getLastColumn();
  var cabecalhoLa = larguraLa
    ? aba.getRange(1, 1, 1, larguraLa).getValues()[0].map(function (v) {
      return String(v === null || v === undefined ? '' : v).trim();
    })
    : [];
  var ondeLa = {};
  cabecalhoLa.forEach(function (cab, i) {
    if (cab) ondeLa[normalizarParaComparar_(cab)] = i;
  });

  var formatosDaqui = formatosDaLinha_(estrutura);
  var formatosLa = cabecalhoLa.map(function () { return '@'; });
  estrutura.cabecalhos.forEach(function (cab, i) {
    var chave = normalizarParaComparar_(cab);
    if (!cab || ondeLa[chave] !== undefined) {
      if (cab) formatosLa[ondeLa[chave]] = formatosDaqui[i];
      return;
    }
    ondeLa[chave] = cabecalhoLa.length;
    cabecalhoLa.push(cab);
    formatosLa.push(formatosDaqui[i]);
  });

  if (aba.getMaxColumns() < cabecalhoLa.length) {
    aba.insertColumnsAfter(aba.getMaxColumns(),
      cabecalhoLa.length - aba.getMaxColumns());
  }
  aba.getRange(1, 1, 1, cabecalhoLa.length).setNumberFormat('@')
    .setValues([cabecalhoLa]);

  var paraEscrever = linhas.map(function (linha) {
    var saida = cabecalhoLa.map(function () { return ''; });
    estrutura.cabecalhos.forEach(function (cab, i) {
      if (cab) saida[ondeLa[normalizarParaComparar_(cab)]] = linha[i];
    });
    return saida;
  });

  var inicio = Math.max(aba.getLastRow(), 1) + 1;
  garantirLinhasNaGrade_(aba, inicio + linhas.length - 1);
  var faixa = aba.getRange(inicio, 1, linhas.length, cabecalhoLa.length);
  faixa.setNumberFormats(paraEscrever.map(function () { return formatosLa; }));
  faixa.setValues(paraEscrever);

  var iIdLa = ondeLa[normalizarParaComparar_(estrutura.cabecalhos[iId])];
  var lidos = aba.getRange(inicio, iIdLa + 1, linhas.length, 1).getValues();
  for (var i = 0; i < linhas.length; i++) {
    if (converterParaIdentificador_(lidos[i][0])
      !== converterParaIdentificador_(linhas[i][iId])) {
      throw new Error('A cópia para a planilha de arquivo não confere na linha '
        + (inicio + i) + '. Nada foi apagado da auditoria.');
    }
  }
}

var RECC_PREFIXO_DA_ANALISE = 'ANALISE_';

var RECC_MAXIMO_DA_ANALISE = 50000;

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

function nomeDaAbaDeAnalise_(nome) {
  var limpo = String(nome || '').trim();
  if (!limpo) return '';
  return RECC_PREFIXO_DA_ANALISE + limpo;
}

function separarPorVirgula_(texto) {
  return String(texto || '')
    .split(',')
    .map(function (pedaco) { return pedaco.trim(); })
    .filter(function (pedaco) { return pedaco.length > 0; });
}

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

function listarAnalises() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var canais = canaisVisiveis_();
  return lerRegistros_('ANALISES')
    .map(function (linha) { return analiseDaLinha_(linha, canais); })
    .sort(function (uma, outra) { return uma.ordem - outra.ordem; });
}

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

        colunas: estrutura.cabecalhos.filter(function (cabecalho) {
          return String(cabecalho).charAt(0) !== '_';
        }),
        filtros: filtrosPossiveisDaAnalise_(canal)
      };
    })
  };
}

function filtrosPossiveisDaAnalise_(canal) {
  var achados = [];
  camposAtivosDoCanal_(canal.id).forEach(function (campo) {

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

function salvarAnalise(dados) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  dados = dadosDaTela_(dados);

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

function ocultarAnalise(idDaAnalise) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var alvo = converterParaIdentificador_(idDaAnalise);
  var atual = buscarRegistros_('ANALISES', 'Id', alvo, 1)[0];
  if (!atual) throw new Error('Esta análise não existe.');

  ocultarRegistro_('ANALISES', alvo, quem.usuario.Id);
  registrarAuditoria_('analise.ocultar', 'ANALISES', alvo, String(atual.Nome));
  return true;
}

function listarSinalizadores() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  if (!planilhaAtiva_().getSheetByName('SINALIZADORES')) return [];

  var nomes = {};
  canaisVisiveis_().forEach(function (canal) {
    nomes[converterParaIdentificador_(canal.id)] = canal.nome;
  });
  return lerRegistros_('SINALIZADORES')
    .map(function (linha) {
      var sinalizador = sinalizadorDaLinha_(linha);
      sinalizador.canalNome = nomes[sinalizador.canalId] || '(canal que não existe mais)';
      sinalizador.regra = regraDoSinalizador_(sinalizador);
      return sinalizador;
    })
    .sort(function (um, outro) {
      return um.canalNome.localeCompare(outro.canalNome) || um.ordem - outro.ordem;
    });
}

function opcoesDeSinalizador() {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);

  return {

    abaExiste: !!planilhaAtiva_().getSheetByName('SINALIZADORES'),
    expedientePadrao: RECC_EXPEDIENTE_PADRAO,
    canais: canaisQueEuVejo_(quem).map(function (canal) {
      var estrutura = estruturaDaAba_(canal.aba);
      var colunas = [];
      var deData = [];
      var deHora = [];
      estrutura.cabecalhos.forEach(function (cabecalho, i) {
        if (!cabecalho || cabecalho.charAt(0) === '_') return;
        colunas.push(cabecalho);
        var tipo = estrutura.tipos[i];
        if (tipo === RECC_TIPO_DE_DADO.DATA || tipo === RECC_TIPO_DE_DADO.DATA_HORA) {
          deData.push(cabecalho);
        }
        if (tipo === RECC_TIPO_DE_DADO.HORA) deHora.push(cabecalho);
      });

      var comLista = {};
      lerRegistros_('CAMPOS').forEach(function (campo) {
        if (String(campo.Aba) !== canal.aba) return;
        var opcoes = opcoesDoCampo_(lerConfiguracaoDoCampo_(campo), canal.id)
          .map(function (opcao) { return opcao.valor; });
        if (opcoes.length) comLista[String(campo.Cabecalho)] = opcoes;
      });
      return {
        id: canal.id, nome: canal.nome, aba: canal.aba,
        colunaDaData: canal.colunaDaData || '',
        colunas: colunas, colunasDeData: deData, colunasDeHora: deHora,
        situacoes: situacoesDoCanal_(canal).map(function (uma) { return uma.gravadoComo; }),
        colunasComLista: comLista
      };
    })
  };
}

function salvarSinalizador(dados) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  dados = dadosDaTela_(dados);
  if (!planilhaAtiva_().getSheetByName('SINALIZADORES')) {
    throw new Error('A aba SINALIZADORES ainda não existe nesta planilha. '
      + 'Rode atualizarPGO() no editor do Apps Script.');
  }

  if (posicaoDaColuna_(estruturaDaAba_('SINALIZADORES'), 'StatusComCondicao') < 0) {
    throw new Error('A aba SINALIZADORES desta planilha ainda não tem as colunas da '
      + 'condição de parada. Rode atualizarPGO() no editor do Apps Script.');
  }

  var nome = String(dados.nome || '').trim();
  if (!nome) throw new Error('Dê um nome ao sinalizador: é ele que aparece no selo.');
  if (nome.length > 40) {
    throw new Error('O nome tem ' + nome.length + ' caracteres, e o limite é 40 — '
      + 'o selo fica embaixo da situação, numa coluna estreita.');
  }

  var canal = canalQueEuPossoVer_(dados.canalId, quem);
  var estrutura = estruturaDaAba_(canal.aba);

  var prazo = Number(String(dados.prazo === undefined ? 0 : dados.prazo).replace(',', '.'));
  var aviso = Number(String(dados.aviso === undefined ? 0 : dados.aviso).replace(',', '.'));
  if (!isFinite(prazo) || prazo < 0 || !isFinite(aviso) || aviso < 0) {
    throw new Error('Prazo e aviso são números, como 3 ou 48. Zero no prazo desliga.');
  }
  var ligado = dados.ativo === false ? false : true;
  if (ligado && prazo <= 0) {
    throw new Error('Um sinalizador ligado precisa de prazo maior que zero — com '
      + 'zero ele não sinaliza nada. Defina o prazo, ou deixe-o desligado.');
  }

  if (prazo > 0 && aviso >= prazo) {
    throw new Error('O amarelo acende quando faltam ' + aviso + ' para o prazo '
      + 'acabar, mas o prazo todo é ' + prazo + ': o caso já nasceria amarelo. '
      + 'Use um aviso menor que o prazo.');
  }

  var unidade = normalizarParaComparar_(dados.unidade).indexOf('hora') === 0 ? 'horas' : 'dias';

  var quandoVale = String(dados.colunaQueLiga || '').trim();
  var colunaDaData = String(dados.colunaDaData || '').trim();
  var colunaDaHora = String(dados.colunaDaHora || '').trim();
  [quandoVale, colunaDaData, colunaDaHora].forEach(function (coluna) {
    conferirQueAColunaExiste_(estrutura, coluna, canal.aba);
  });
  function tipoDe(coluna) { return estrutura.tipos[posicaoDaColuna_(estrutura, coluna)]; }
  if (colunaDaData && tipoDe(colunaDaData) !== RECC_TIPO_DE_DADO.DATA
    && tipoDe(colunaDaData) !== RECC_TIPO_DE_DADO.DATA_HORA) {
    throw new Error('"' + colunaDaData + '" não é uma coluna de data, e é de uma data '
      + 'que o prazo começa a contar.');
  }
  if (colunaDaHora && tipoDe(colunaDaHora) !== RECC_TIPO_DE_DADO.HORA) {
    throw new Error('"' + colunaDaHora + '" não é uma coluna de hora.');
  }

  var idDoSinalizador = converterParaIdentificador_(dados.id);
  var existente = idDoSinalizador
    ? buscarRegistros_('SINALIZADORES', 'Id', idDoSinalizador, 1)[0] : null;
  var semCondicaoNoPedido = ['statusComCondicao', 'colunaDaCondicao', 'valoresDaCondicao',
    'colunaDaDataDaCondicao'].every(function (chave) { return dados[chave] === undefined; });
  var condicao = semCondicaoNoPedido && existente
    ? { status: String(existente.StatusComCondicao || ''),
      coluna: String(existente.ColunaDaCondicao || ''),
      valores: valoresDaCondicaoDoSinalizador_(existente.ValoresDaCondicao),
      data: String(existente.ColunaDaDataDaCondicao || '') }
    : conferirACondicaoDeParada_(canal, estrutura, dados);

  var inicio = horaDoExpediente_(dados.inicioDoExpediente) || RECC_EXPEDIENTE_PADRAO.abre;
  var fim = horaDoExpediente_(dados.fimDoExpediente) || RECC_EXPEDIENTE_PADRAO.fecha;
  if (String(dados.inicioDoExpediente || '').trim() && !horaDoExpediente_(dados.inicioDoExpediente)
    || String(dados.fimDoExpediente || '').trim() && !horaDoExpediente_(dados.fimDoExpediente)) {
    throw new Error('O expediente é em horas, como 08:15 e 18:30.');
  }
  if (minutosDaHoraDoExpediente_(inicio) >= minutosDaHoraDoExpediente_(fim)) {
    throw new Error('O expediente termina antes de começar: ' + inicio + ' até ' + fim + '.');
  }

  var id = converterParaIdentificador_(dados.id);
  var repetido = lerRegistros_('SINALIZADORES').filter(function (linha) {
    return converterParaIdentificador_(linha.CanalId) === converterParaIdentificador_(canal.id)
      && normalizarParaComparar_(linha.Nome) === normalizarParaComparar_(nome)
      && converterParaIdentificador_(linha.Id) !== id;
  })[0];
  if (repetido) {
    throw new Error('O canal ' + canal.nome + ' já tem um sinalizador chamado "' + nome
      + '". Dois com o mesmo nome apareceriam iguais embaixo da situação.');
  }

  var campos = {
    CanalId: canal.id, Nome: nome, Prazo: prazo, Unidade: unidade,
    AvisoFaltando: aviso, ColunaQueLiga: quandoVale, ColunaDaData: colunaDaData,
    ColunaDaHora: colunaDaHora, InicioDoExpediente: inicio, FimDoExpediente: fim,
    Ordem: Number(dados.ordem) || 0, Ativo: ligado,
    StatusComCondicao: condicao.status, ColunaDaCondicao: condicao.coluna,
    ValoresDaCondicao: condicao.valores.join('; '),
    ColunaDaDataDaCondicao: condicao.data
  };

  if (id) {
    atualizarRegistro_('SINALIZADORES', id, campos);
    registrarAuditoria_('sinalizador.editar', 'SINALIZADORES', id, canal.nome + ': ' + nome);
    return id;
  }
  var criado = inserirRegistro_('SINALIZADORES', campos);
  registrarAuditoria_('sinalizador.criar', 'SINALIZADORES', criado.__id,
    canal.nome + ': ' + nome);
  return criado.__id;
}

function conferirACondicaoDeParada_(canal, estrutura, dados) {
  var vazio = { status: '', coluna: '', valores: [], data: '' };
  var status = String(dados.statusComCondicao || '').trim();
  var coluna = String(dados.colunaDaCondicao || '').trim();
  var data = String(dados.colunaDaDataDaCondicao || '').trim();
  var valores = (Array.isArray(dados.valoresDaCondicao) ? dados.valoresDaCondicao
    : String(dados.valoresDaCondicao || '').split(';'))
    .map(function (valor) { return String(valor).trim(); })
    .filter(function (valor) { return valor !== ''; });

  if (!status && !coluna && !data && !valores.length) return vazio;
  if (!status || !coluna || !data || !valores.length) {
    throw new Error('A condição de parada pede os quatro: o status, a coluna, os '
      + 'valores e a coluna da data. Preencha todos, ou deixe todos em branco.');
  }

  var situacoes = situacoesDoCanal_(canal);
  var doStatus = situacoes.filter(function (uma) {
    return condicaoBate_({ valores: [uma.gravadoComo] }, status);
  })[0];
  if (!doStatus) {
    throw new Error('O status "' + status + '" não existe no canal ' + canal.nome
      + '. Os status são: ' + situacoes.map(function (uma) { return uma.gravadoComo; }).join(', ') + '.');
  }

  conferirQueAColunaExiste_(estrutura, coluna, canal.aba);
  conferirQueAColunaExiste_(estrutura, data, canal.aba);
  if (estrutura.tipos[posicaoDaColuna_(estrutura, data)] !== RECC_TIPO_DE_DADO.DATA_HORA) {
    throw new Error('"' + data + '" não é uma coluna de data e hora. É nela que o '
      + 'sistema anota QUANDO a condição passou a valer.');
  }

  var campo = lerRegistros_('CAMPOS').filter(function (outro) {
    return String(outro.Aba) === canal.aba
      && normalizarParaComparar_(outro.Cabecalho) === normalizarParaComparar_(coluna);
  })[0];
  var opcoes = campo ? opcoesDoCampo_(lerConfiguracaoDoCampo_(campo), canal.id)
    .map(function (opcao) { return opcao.valor; }) : [];
  var certos = valores.map(function (valor) {
    if (!opcoes.length) return valor;
    var achada = opcoes.filter(function (opcao) {
      return condicaoBate_({ valores: [opcao] }, valor);
    })[0];
    if (achada === undefined) {
      throw new Error('"' + valor + '" não é uma opção de "' + coluna + '". As opções são: '
        + opcoes.join(', ') + '.');
    }
    return achada;
  });

  return { status: doStatus.gravadoComo, coluna: coluna, valores: certos, data: data };
}

function ocultarSinalizador(idDoSinalizador) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var alvo = converterParaIdentificador_(idDoSinalizador);
  var atual = buscarRegistros_('SINALIZADORES', 'Id', alvo, 1)[0];
  if (!atual) throw new Error('Este sinalizador não existe.');

  ocultarRegistro_('SINALIZADORES', alvo, quem.usuario.Id);
  registrarAuditoria_('sinalizador.ocultar', 'SINALIZADORES', alvo, String(atual.Nome));
  return true;
}

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

function ajustarGrade_(aba, linhas, colunas) {
  var linhasAgora = aba.getMaxRows();
  if (linhas > linhasAgora) aba.insertRowsAfter(linhasAgora, linhas - linhasAgora);

  if (linhas < linhasAgora) aba.deleteRows(linhas + 1, linhasAgora - linhas);

  var colunasAgora = aba.getMaxColumns();
  if (colunas > colunasAgora) {
    aba.insertColumnsAfter(colunasAgora, colunas - colunasAgora);
  }
  if (colunas < colunasAgora) {
    aba.deleteColumns(colunas + 1, colunasAgora - colunas);
  }
}

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

function configuracaoDosCadastros() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var id = String(valorDaConfiguracao_(RECC_CHAVE_DA_PLANILHA_DE_CADASTROS, '')).trim();
  var deFora = abasQueVemDeFora_();

  return {
    planilhaId: id,
    ligada: !!id,
    abas: RECC_ABAS_QUE_PODEM_VIR_DE_FORA.map(function (nome) {
      var esquema = RECC_ESQUEMA[nome];
      return {
        aba: nome,
        titulo: esquema ? esquema.titulo : nome,

        naSegundaBase: deFora.indexOf(nome) >= 0,

        colunas: esquema
          ? esquema.colunas.filter(function (coluna) {
            return coluna.cabecalho.charAt(0) !== '_';
          }).map(function (coluna) { return coluna.cabecalho; })
          : []
      };
    })
  };
}

function salvarConfiguracaoDosCadastros(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  exigirSenhaDeAdministrador_();

  var id = String((dados || {}).planilhaId || '').trim();

  var abas = Array.isArray((dados || {}).abas)
    ? dados.abas.map(function (nome) { return String(nome).trim().toUpperCase(); })
      .filter(function (nome) { return RECC_ABAS_QUE_PODEM_VIR_DE_FORA.indexOf(nome) >= 0; })
    : RECC_ABAS_QUE_PODEM_VIR_DE_FORA.slice();
  if (id && !abas.length) {
    throw new Error('Marque pelo menos uma lista para morar na planilha de cadastros — '
      + 'ou apague o Id para desligá-la.');
  }

  if (id) {
    var laudo = conferirPlanilhaDeCadastros(id, abas);
    if (!laudo.abre) throw new Error(laudo.recado);
    if (laudo.faltando.length) {
      throw new Error('A planilha abriu, mas não está pronta:\n\n'
        + laudo.faltando.join('\n')
        + '\n\nAcerte a planilha de cadastros e tente de novo. Enquanto isso, '
        + 'os cadastros continuam onde estão.');
    }
  }

  gravarConfiguracao_(RECC_CHAVE_DA_PLANILHA_DE_CADASTROS, id);
  gravarConfiguracao_(RECC_CHAVE_DAS_ABAS_DE_FORA, id ? abas.join(',') : '');
  registrarAuditoria_('cadastros.configurar', 'CONFIG', '',
    id ? 'ligada em ' + id + ' · ' + abas.join(', ') : 'desligada');

  esquecerEstruturaLida_();
  return configuracaoDosCadastros();
}

function conferirPlanilhaDeCadastros(planilhaId, abasEscolhidas) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);

  var abasParaConferir = Array.isArray(abasEscolhidas) && abasEscolhidas.length
    ? RECC_ABAS_QUE_PODEM_VIR_DE_FORA.filter(function (nome) {
      return abasEscolhidas.map(function (uma) { return String(uma).trim().toUpperCase(); })
        .indexOf(nome) >= 0;
    })
    : RECC_ABAS_QUE_PODEM_VIR_DE_FORA;

  var id = String(planilhaId || '').trim();
  if (!id) {
    return { abre: false, recado: 'Informe o Id da planilha de cadastros. '
      + 'Ele é o pedaço do endereço entre /d/ e /edit.', abas: [], faltando: [] };
  }

  var planilha;
  try {
    planilha = SpreadsheetApp.openById(id);
  } catch (erro) {
    return {
      abre: false,
      recado: 'Não consegui abrir: ' + (erro.message || erro)
        + ' Confira o Id e se esta conta tem acesso à planilha — é quase '
        + 'sempre o acesso.',
      abas: [],
      faltando: []
    };
  }

  var faltando = [];
  var avisos = [];
  var achadas = [];

  abasParaConferir.forEach(function (nome) {
    var aba = planilha.getSheetByName(nome);
    if (!aba) {
      faltando.push('• Falta a aba "' + nome + '".');
      return;
    }

    var largura = aba.getLastColumn();
    var cabecalhos = largura
      ? aba.getRange(1, 1, 1, largura).getValues()[0].map(function (v) {
        return normalizarParaComparar_(v);
      })
      : [];

    var esquema = RECC_ESQUEMA[nome];
    var ausentes = (esquema ? esquema.colunas : [])
      .filter(function (coluna) {
        if (coluna.cabecalho.charAt(0) === '_') return false;
        return cabecalhos.indexOf(normalizarParaComparar_(coluna.cabecalho)) < 0;
      });

    ausentes.filter(function (coluna) { return coluna.opcionalNaBaseDeFora; })
      .forEach(function (coluna) {
        avisos.push('• A aba "' + nome + '" está sem a coluna ' + coluna.cabecalho
          + '. Ela funciona sem; acrescente a coluna para usar o que ela guarda.');
      });
    ausentes = ausentes
      .filter(function (coluna) { return !coluna.opcionalNaBaseDeFora; })
      .map(function (coluna) { return coluna.cabecalho; });

    if (ausentes.length) {
      faltando.push('• A aba "' + nome + '" está sem: ' + ausentes.join(', ') + '.');
    }

    var semEscrita = RECC_COLUNAS_PARA_ESCREVER_DE_FORA.filter(function (coluna) {
      return cabecalhos.indexOf(normalizarParaComparar_(coluna)) < 0;
    });
    if (semEscrita.length) {
      avisos.push('• A aba "' + nome + '" vai abrir só para LEITURA: faltam '
        + semEscrita.join(', ') + '. Acrescente essas colunas se quiser '
        + 'cadastrar e editar por aqui.');
    }

    achadas.push({
      aba: nome,
      linhas: Math.max(aba.getLastRow() - 1, 0),
      completa: ausentes.length === 0,
      podeEditar: semEscrita.length === 0,
      faltaParaEditar: semEscrita
    });
  });

  var soLeitura = achadas.filter(function (uma) { return !uma.podeEditar; }).length;

  return {
    abre: true,
    recado: faltando.length
      ? 'A planilha abriu, mas ' + faltando.length + ' aba(s) precisam de ajuste.'
      : 'Tudo certo: as ' + achadas.length + ' abas estão lá, com as colunas '
        + 'que o PGO procura.'
        + (soLeitura
          ? ' ' + soLeitura + ' delas vão abrir só para leitura — veja abaixo.'
          : ' E todas aceitam cadastrar e editar por aqui.'),
    nome: planilha.getName(),
    abas: achadas,
    faltando: faltando,
    avisos: avisos,

    colunasParaEditar: RECC_COLUNAS_PARA_ESCREVER_DE_FORA
  };
}

function aplicarMudancasDaPlanilha() {
  exigirPermissao_(RECC_ACOES.ESTRUTURA);
  esquecerEstruturaLida_();
  registrarAuditoria_('cache.limpar', 'CONFIG', '', 'Aplicou as mudanças feitas direto na planilha');
  return { abas: RECC_ABAS_DO_CACHE.slice(), minutos: RECC_SEGUNDOS_DO_CACHE / 60 };
}


/* ==== Entrada.gs ========================================================== */

function doGet() {
  var quem = usuarioAtual_();
  var identidade = lerIdentidadeVisual_();

  if (!quem.cadastrado) {
    var bloqueio = HtmlService.createTemplateFromFile('SemAcesso');
    bloqueio.email = quem.email;
    bloqueio.motivo = quem.motivo;

    bloqueio.situacao = quem.situacao || 'NAO_CADASTRADO';
    bloqueio.identidade = identidade;
    return bloqueio.evaluate()
      .setTitle(identidade.nome + ' — acesso não liberado')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  registrarUltimoAcesso_(quem.usuario);

  var pagina = HtmlService.createTemplateFromFile('Index');
  pagina.identidade = identidade;

  pagina.pacoteDePartida = comoTextoParaDentroDeScript_(montarPacoteDePartida_(quem));

  return pagina.evaluate()
    .setTitle(identidade.nome)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function comoTextoParaDentroDeScript_(valor) {
  return JSON.stringify(valor)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

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

function incluir(nomeDoArquivo) {
  return incluir_(nomeDoArquivo);
}

function pacoteDePartida() {
  return montarPacoteDePartida_(usuarioAtual_());
}

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

const RECC_TEMAS = ['padrao', 'rosa', 'dark', 'brasil'];
const RECC_CHAVE_DO_TEMA = 'RECC_TEMA_ESCOLHIDO';

function temaDoUsuario_() {
  var escolhido = PropertiesService.getUserProperties()
    .getProperty(RECC_CHAVE_DO_TEMA);
  if (escolhido && RECC_TEMAS.indexOf(escolhido) >= 0) return escolhido;

  var daOperacao = valorDaConfiguracao_('OPERACAO.TEMA_PADRAO', 'padrao');
  return RECC_TEMAS.indexOf(daOperacao) >= 0 ? daOperacao : 'padrao';
}

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

function montarMenu_(permissoes) {
  var titulos = {};
  try {
    titulos = JSON.parse(valorDaConfiguracao_('MENU.TITULOS', '{}'));
  } catch (erro) {
    titulos = {};
  }

  return RECC_TELAS_DO_SISTEMA
    .filter(function (item) { return podeVerTela_(permissoes, item.tela); })
    .map(function (item) {
      return { tela: item.tela, titulo: titulos[item.tela] || item.titulo };
    });
}

function canaisQueEuVejo_(quem) {
  var todos = canaisVisiveis_();
  if (!quem || !quem.cadastrado) return [];

  var escolhidos = (quem.permissoes && quem.permissoes.canais) || [];
  if (!escolhidos.length) return todos;

  return todos.filter(function (canal) {
    return escolhidos.indexOf(converterParaIdentificador_(canal.id)) >= 0;
  });
}

var RECC_COLUNAS_QUE_O_CANAL_DECLARA = ['colunaDaData', 'colunaDaHora', 'colunaDoStatus',
  'colunaDaFinalizacao', 'colunaDaAreaResponsavel', 'colunaDoValor',
  'colunaDaPrimeiraResposta', 'colunaDaHoraDaPrimeiraResposta'];

function comAGrafiaDaAba_(canal) {
  if (!canal || canal.grafiaConferida || !canal.aba
    || !planilhaAtiva_().getSheetByName(String(canal.aba))) return canal;
  RECC_COLUNAS_QUE_O_CANAL_DECLARA.forEach(function (chave) {
    if (canal[chave]) canal[chave] = grafiaDaColuna_(canal.aba, canal[chave]);
  });
  canal.grafiaConferida = true;
  return canal;
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
        colunaDaFinalizacao: canal.ColunaDaFinalizacao,
        colunaDaAreaResponsavel: canal.ColunaDaAreaResponsavel,
        colunaDoValor: String(canal.ColunaDoValor || ''),
        situacoesDestacadas: String(canal.SituacoesDestacadas || ''),

        confereSusepBloqueada:
          normalizarParaComparar_(canal.ConfereSusepBloqueada) !== 'nao',

        slaHorasUteis: Number(canal.SlaHorasUteis) || 0,
        inicioDoExpediente: canal.InicioDoExpediente,
        fimDoExpediente: canal.FimDoExpediente,
        colunaDaPrimeiraResposta: String(canal.ColunaDaPrimeiraResposta || ''),
        colunaDaHoraDaPrimeiraResposta: String(canal.ColunaDaHoraDaPrimeiraResposta || ''),
        icone: canal.Icone
      };
    });
}

function dataDoUltimoRegistro_(quem) {

  quem = quem || usuarioAtual_();

  var maisRecente = null;
  var deQualCanal = '';

  canaisQueEuVejo_(quem).forEach(function (canal) {
    comAGrafiaDaAba_(canal);
    if (!canal.aba || !canal.colunaDaData) return;

    var ultimos;
    try {
      ultimos = lerRegistros_(canal.aba, { ultimas: 5 });
    } catch (erro) {
      return;
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

const RECC_ACOES = {
  CRIAR: 'criar',
  EDITAR: 'editar',
  OCULTAR: 'ocultar',
  EXPORTAR: 'exportar',

  IMPORTAR: 'importar',
  CONFIGURAR: 'configurar',
  ESTRUTURA: 'estrutura'
};

const RECC_ESCOPOS = {
  PROPRIOS: 'PROPRIOS',
  EQUIPE: 'EQUIPE',
  CANAL: 'CANAL',
  TODOS: 'TODOS'
};

const RECC_TELAS_DO_SISTEMA = [

  { tela: 'trabalho', titulo: 'Trabalho' },
  { tela: 'cadastrarCaso', titulo: 'Cadastrar Caso' },
  { tela: 'buscarCaso', titulo: 'Buscar Caso' },
  { tela: 'tabelaCorretoras', titulo: 'Tabela de Corretoras' },
  { tela: 'importacao', titulo: 'Importação' },
  { tela: 'produtividade', titulo: 'Produtividade RECC' },
  { tela: 'configuracoes', titulo: 'Configurações' }
];

const RECC_ESCOPOS_DA_PRODUTIVIDADE = {
  BLOQUEADO: 'Não abre a Produtividade RECC',
  PROPRIOS: 'Só os casos da própria pessoa',
  EQUIPE: 'A equipe dela — quem atende o mesmo canal',
  CANAL: 'O canal inteiro, de todos os analistas'
};

const RECC_VISIBILIDADE = {
  OCULTO: 'oculto',
  LEITURA: 'leitura',
  EDICAO: 'edicao'
};

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
    if (emailParaComparar_(usuarios[i].Email) === emailParaComparar_(email)) {
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

function itemDoCatalogo_(idDoItem) {
  var alvo = converterParaIdentificador_(idDoItem);
  if (!alvo) return null;
  var itens = lerRegistros_('CATALOGO');
  for (var i = 0; i < itens.length; i++) {
    if (converterParaIdentificador_(itens[i].Id) === alvo) return itens[i];
  }
  return null;
}

function lerPermissoesDoNivel_(nivel) {
  var permissoes = {
    escopo: RECC_ESCOPOS.PROPRIOS,
    escopoNaProdutividade: 'BLOQUEADO',
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

  permissoes.canais = Array.isArray(lido.canais)
    ? lido.canais.map(function (id) { return converterParaIdentificador_(id); })
      .filter(function (id) { return id !== ''; })
    : [];
  permissoes.telas = Array.isArray(lido.telas) ? lido.telas : [];

  if (permissoes.telas.indexOf('produtividade') < 0) {
    permissoes.escopoNaProdutividade = 'BLOQUEADO';
  } else {
    var pedido = String(lido.escopoNaProdutividade || '').toUpperCase();
    permissoes.escopoNaProdutividade =
      (pedido && pedido !== 'BLOQUEADO' && RECC_ESCOPOS_DA_PRODUTIVIDADE[pedido])
        ? pedido : 'EQUIPE';
  }

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

function visibilidadeDoCampo_(permissoes, chaveDoCampo) {
  var declarada = permissoes.campos[chaveDoCampo];
  if (declarada === RECC_VISIBILIDADE.OCULTO) return RECC_VISIBILIDADE.OCULTO;
  if (declarada === RECC_VISIBILIDADE.LEITURA) return RECC_VISIBILIDADE.LEITURA;
  return RECC_VISIBILIDADE.EDICAO;
}

function colunaDoResponsavel_(estrutura) {
  var candidatas = ['analista', 'responsavel'];
  for (var i = 0; i < estrutura.cabecalhos.length; i++) {
    if (candidatas.indexOf(normalizarParaComparar_(estrutura.cabecalhos[i])) >= 0) {
      return estrutura.cabecalhos[i];
    }
  }
  return '';
}

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

  var nomesDaEquipe = nomesDaMinhaEquipe_(quem);
  if (nomesDaEquipe === null) return [];

  var indice = {};
  nomesDaEquipe.forEach(function (nome) {
    indice[normalizarParaComparar_(nome)] = true;
  });
  return registros.filter(function (registro) {
    return indice[normalizarParaComparar_(registro[coluna])] === true;
  });
}

function linhasNoMeuAlcance_(nomeDaAba, numerosDeLinha, quem) {
  var escopo = quem.permissoes.escopo;
  if (escopo === RECC_ESCOPOS.TODOS || escopo === RECC_ESCOPOS.CANAL) return numerosDeLinha;
  if (!numerosDeLinha.length) return numerosDeLinha;

  var coluna = colunaDoResponsavel_(estruturaDaAba_(nomeDaAba));
  if (!coluna) return numerosDeLinha;

  var responsaveis = lerColunaInteira_(nomeDaAba, coluna);
  var leves = numerosDeLinha.map(function (numero) {
    var registro = { __linha: numero };
    registro[coluna] = responsaveis[numero - 2];
    return registro;
  });
  return filtrarPeloAlcance_(leves, nomeDaAba, quem).map(function (registro) {
    return registro.__linha;
  });
}

function nomesDaMinhaEquipe_(quem) {

  var meuCanal = converterParaIdentificador_((quem.usuario || {}).CanalId);
  if (!meuCanal) return null;

  var nomes = [];
  lerRegistros_('USUARIOS').forEach(function (usuario) {
    if (normalizarParaComparar_(usuario.Ativo) !== 'sim') return;
    if (converterParaIdentificador_(usuario.CanalId) !== meuCanal) return;
    nomes.push(String(usuario.Nome));
  });
  return nomes;
}

const RECC_CHAVE_DA_SENHA = 'RECC_SENHA_DO_ADMINISTRADOR';
const RECC_CHAVE_DAS_TENTATIVAS = 'RECC_TENTATIVAS_DE_SENHA';
const RECC_CHAVE_DA_LIBERACAO = 'RECC_SENHA_LIBERADA_ATE';
const RECC_MINUTOS_LIBERADOS = 5;
const RECC_TENTATIVAS_ATE_BLOQUEAR = 3;
const RECC_HORAS_DE_BLOQUEIO = 24;

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

function conferirSenhaDeAdministrador_(senha) {
  var propriedades = PropertiesService.getScriptProperties();
  var guardado = propriedades.getProperty(RECC_CHAVE_DA_SENHA);
  if (!guardado) {
    throw new Error('Nenhuma senha de administrador foi definida ainda. ' +
      'Defina em Configurações › Identidade.');
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

function registrarAuditoria_(acao, entidade, idDoRegistro, detalhe) {
  try {
    var registro = {
      DataHora: new Date(),
      UsuarioId: (usuarioAtual_().usuario || {}).Id || '',
      Acao: acao,
      Entidade: entidade || '',
      RegistroId: idDoRegistro || '',
      Detalhe: detalhe || ''
    };
    if (entrarNaFilaDaAuditoria_(registro)) {
      descarregarAFilaDaAuditoria_(0);
      return;
    }

    inserirRegistro_('AUDITORIA', registro);
  } catch (erro) {
    Logger.log('Falha ao registrar auditoria: ' + erro.message);
  }
}

const RECC_PREFIXO_DA_FILA_DA_AUDITORIA = 'AUDITORIA.FILA.';
const RECC_MAIOR_REGISTRO_NA_FILA = 8000;
const RECC_DESCARGA_DA_AUDITORIA = 500;

function entrarNaFilaDaAuditoria_(registro) {
  var texto = JSON.stringify({
    d: registro.DataHora.getTime(), u: registro.UsuarioId, a: registro.Acao,
    e: registro.Entidade, r: registro.RegistroId, t: registro.Detalhe
  });
  if (texto.length > RECC_MAIOR_REGISTRO_NA_FILA) return false;
  var chave = RECC_PREFIXO_DA_FILA_DA_AUDITORIA + ('0000000000000' + registro.DataHora.getTime()).slice(-13)
    + '.' + Math.random().toString(36).slice(2, 10);
  try {
    PropertiesService.getScriptProperties().setProperty(chave, texto);
    return true;
  } catch (erro) {
    return false;
  }
}

function descarregarAFilaDaAuditoria_(esperarMs) {
  var props = PropertiesService.getScriptProperties();
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(esperarMs || 0)) return 0;
  try {
    var todas = props.getProperties();
    var chaves = Object.keys(todas)
      .filter(function (chave) { return chave.indexOf(RECC_PREFIXO_DA_FILA_DA_AUDITORIA) === 0; })
      .sort()
      .slice(0, RECC_DESCARGA_DA_AUDITORIA);
    if (!chaves.length) return 0;

    var registros = [];
    chaves.forEach(function (chave) {
      var lido;
      try { lido = JSON.parse(todas[chave]); } catch (erro) { return; }
      registros.push({
        DataHora: new Date(Number(lido.d)), UsuarioId: lido.u || '', Acao: lido.a || '',
        Entidade: lido.e || '', RegistroId: lido.r || '', Detalhe: lido.t || ''
      });
    });
    if (registros.length) inserirComATravaNaMao_('AUDITORIA', registros);
    chaves.forEach(function (chave) { props.deleteProperty(chave); });
    return registros.length;
  } finally {
    trava.releaseLock();
  }
}

function tamanhoDaFilaDaAuditoria_() {
  return Object.keys(PropertiesService.getScriptProperties().getProperties())
    .filter(function (chave) { return chave.indexOf(RECC_PREFIXO_DA_FILA_DA_AUDITORIA) === 0; })
    .length;
}

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
      canalId: canalId,

      canal: canalId ? (canais[canalId] || 'Canal desligada') : '',
      cargoId: converterParaIdentificador_(usuario.CargoId),
      cargo: catalogo[converterParaIdentificador_(usuario.CargoId)] || 'Sem cargo',
      nivelAcessoId: converterParaIdentificador_(usuario.NivelAcessoId),
      nivelAcesso:
        catalogo[converterParaIdentificador_(usuario.NivelAcessoId)] || 'Sem dados',
      ativo: normalizarParaComparar_(usuario.Ativo) === 'sim',

      disponibilidade: String(usuario.Disponibilidade || '').trim()
        || RECC_DISPONIBILIDADE_QUE_RECEBE,
      recebeCasos: estaDisponivelParaReceber_(usuario),
      administrador: ehAdministrador_(usuario.Id),
      dataCadastro: comoDataEHora_(usuario.DataCadastro),
      ultimoAcesso: comoDataEHora_(usuario.UltimoAcesso)
    };
  });
}

function comoDataEHora_(valor) {
  if (!valor) return '';
  var data = converterParaData_(valor);
  if (!data) return '';
  return Utilities.formatDate(data, RECC_FUSO_HORARIO, 'dd/MM/yyyy HH:mm');
}

function salvarUsuario(dados) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  dados = dadosDaTela_(dados);

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

  var canalEscolhido = converterParaIdentificador_(dados.canalId);
  if (canalEscolhido) {
    var existe = lerRegistros_('CANAIS').filter(function (canal) {
      return converterParaIdentificador_(canal.Id) === canalEscolhido;
    })[0];
    if (!existe) {
      throw new Error('O canal escolhido não existe mais. Escolha outro, ou ' +
        'deixe em branco — quem administra não pertence a um canal.');
    }
  }

  var idInformado = converterParaIdentificador_(dados.id);
  var jaCadastrados = lerRegistros_('USUARIOS');
  for (var i = 0; i < jaCadastrados.length; i++) {
    var mesmoEmail =
      emailParaComparar_(jaCadastrados[i].Email) === emailParaComparar_(email);
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

    CanalId: converterParaIdentificador_(dados.canalId),
    CargoId: converterParaIdentificador_(dados.cargoId),
    NivelAcessoId: converterParaIdentificador_(dados.nivelAcessoId),
    Ativo: dados.ativo === false ? 'NAO' : 'SIM'
  };

  if (posicaoDaColuna_(estruturaDaAba_('USUARIOS'), 'Disponibilidade') >= 0) {
    campos.Disponibilidade = String(dados.disponibilidade || '').trim()
      || RECC_DISPONIBILIDADE_QUE_RECEBE;
  }

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

function registrarUltimoAcesso_(usuario) {
  try {
    atualizarRegistro_('USUARIOS', usuario.Id, { UltimoAcesso: new Date() });
  } catch (erro) {
    Logger.log('Não consegui carimbar o último acesso: ' + erro.message);
  }
}


/* ==== Indicadores.gs ====================================================== */

const RECC_LINHAS_DO_PAINEL_PADRAO = 5000;

const RECC_CASOS_NA_FILA = 5;
const RECC_OPCOES_DE_CASOS_NA_FILA = [5, 10, 20, 50, 100];

const RECC_FILA_NA_ABERTURA = RECC_OPCOES_DE_CASOS_NA_FILA[RECC_OPCOES_DE_CASOS_NA_FILA.length - 1];

function linhasQueOPainelOlha_() {
  var declarado = Number(valorDaConfiguracao_('OPERACAO.LINHAS_DO_PAINEL', ''));
  if (isFinite(declarado) && declarado > 0) return Math.floor(declarado);
  return RECC_LINHAS_DO_PAINEL_PADRAO;
}

const RECC_TONS = ['neutro', 'destaque', 'bom', 'atencao', 'ruim', 'violeta'];

function tomValido_(cor) {
  var tom = normalizarParaComparar_(cor);
  return RECC_TONS.indexOf(tom) >= 0 ? tom : 'neutro';
}

function resumoDoCanal(idDoCanal, filtros, periodoPedido, quantosNaFila) {
  var quem = exigirTela_('trabalho');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var periodo = resolverPeriodo_(periodoPedido);
  var antes = periodoAnterior_(periodo);

  var recentes = lerRegistros_(canal.aba, { ultimas: linhasQueOPainelOlha_() });
  var truncada = recentes.length >= linhasQueOPainelOlha_();

  var guardarSemData = guardaOsSemData_(periodo);

  var noPeriodo = entreDuasDatas_(recentes, canal, periodo.de, periodo.ate,
    guardarSemData);
  var meus = filtrarPeloAlcance_(noPeriodo, canal.aba, quem);

  var anterior = filtrarPeloAlcance_(
    entreDuasDatas_(recentes, canal, antes.de, antes.ate, false), canal.aba, quem);

  var disponiveis = filtrosDoCanal_(canal, quem);

  var termo = String((filtros || {}).busca || '').trim();
  var filtrados = aplicarBusca_(aplicarFiltros_(meus, disponiveis, filtros || {}),
    canal, termo);
  var anterioresFiltrados = aplicarBusca_(
    aplicarFiltros_(anterior, disponiveis, filtros || {}), canal, termo);
  var pertoDeVencer = casosPertoDeVencer_(filtrados, canal);

  var naFila = filtrarPeloCartao_(filtrados, canal, (filtros || {}).cartao);

  return {
    canal: canal,
    periodo: {
      tipo: periodo.tipo,
      dias: periodo.dias,
      mes: periodo.mes || '',
      de: comoSeEscreve_(periodo.de),
      ate: comoSeEscreve_(periodo.ate),
      rotulo: periodo.rotulo
    },
    mesesDisponiveis: mesesParaEscolher_(),
    cartoes: contarCartoes_(filtrados, anterioresFiltrados, canal),
    filtrosDisponiveis: disponiveis,
    colunas: colunasDaFila_(canal),

    fila: compactarFila_(montarFila_(quantosNaFila === 'todos'
      ? naFila : naFila.slice(-RECC_FILA_NA_ABERTURA), canal)),
    filaCompacta: true,

    pertoDeVencer: compactarFila_(montarFila_(
      pertoDeVencer.slice(-RECC_FILA_NA_ABERTURA), canal)),
    quantosPertoDeVencer: pertoDeVencer.length,
    mostrarNaFila: { padrao: RECC_CASOS_NA_FILA, opcoes: RECC_OPCOES_DE_CASOS_NA_FILA,
      naAbertura: RECC_FILA_NA_ABERTURA },
    total: naFila.length,
    totalNoPeriodo: meus.length,
    truncada: truncada,
    escopo: quem.permissoes.escopo,
    podeEditar: podeFazer_(quem.permissoes, RECC_ACOES.EDITAR)
  };
}

function filtrarPeloPeriodo_(registros, canal, dias, recuo) {
  if (!canal.colunaDaData) return recuo ? [] : registros;

  var fim = new Date();
  fim.setDate(fim.getDate() - recuo);
  var inicio = new Date();
  inicio.setDate(inicio.getDate() - recuo - dias);

  return entreDuasDatas_(registros, canal, inicio, fim, !recuo);
}

function entreDuasDatas_(registros, canal, inicio, fim, guardarSemData) {
  var de = Utilities.formatDate(inicio, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
  var ate = Utilities.formatDate(fim, RECC_FUSO_HORARIO, 'yyyy-MM-dd');

  return registros.filter(function (registro) {
    var data = converterParaData_(registro[canal.colunaDaData]);
    if (!data) return guardarSemData === true;
    var dela = Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
    return dela >= de && dela <= ate;
  });
}

const RECC_MESES_PARA_TRAS = 12;

const RECC_NOMES_DOS_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio',
  'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function resolverPeriodo_(pedido, diasPadrao) {
  var padrao = Number(diasPadrao)
    || Number(valorDaConfiguracao_('OPERACAO.JANELA_DIAS', '30')) || 30;
  pedido = pedido || {};

  if (typeof pedido === 'number' || typeof pedido === 'string') {
    return periodoPorDias_(Number(pedido) || padrao);
  }

  var tipo = normalizarParaComparar_(pedido.tipo);

  if (tipo === 'intervalo') {
    var de = converterParaData_(pedido.de);
    var ate = converterParaData_(pedido.ate);

    if (!pedido.de && !pedido.ate) {

      var agora = new Date();
      var hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
      var doDia1 = new Date(agora.getFullYear(), agora.getMonth(), 1);
      return {
        tipo: 'intervalo',

        abertura: true,
        de: doDia1,
        ate: hoje,
        dias: diasEntre_(doDia1, hoje),
        rotulo: 'de ' + comoSeEscreve_(doDia1) + ' a ' + comoSeEscreve_(hoje)
      };
    }
    if (de && ate) {

      if (de > ate) { var troca = de; de = ate; ate = troca; }
      return {
        tipo: 'intervalo',
        de: de,
        ate: ate,
        dias: diasEntre_(de, ate),
        rotulo: 'de ' + comoSeEscreve_(de) + ' a ' + comoSeEscreve_(ate)
      };
    }
  }

  if (tipo === 'mes') {
    var escolhido = mesValido_(pedido.mes);
    if (escolhido) return periodoDoMes_(escolhido);
  }

  return periodoPorDias_(Number(pedido.dias) || padrao);
}

function guardaOsSemData_(periodo) {
  return periodo.tipo === 'dias' || periodo.abertura === true;
}

function periodoPorDias_(dias) {
  var ate = new Date();
  var de = new Date();
  de.setDate(de.getDate() - dias);
  return {
    tipo: 'dias',
    de: de,
    ate: ate,
    dias: dias,
    rotulo: 'últimos ' + dias + ' dias'
  };
}

function periodoDoMes_(mes) {
  var partes = mes.split('-');
  var ano = Number(partes[0]);
  var numero = Number(partes[1]);

  var de = new Date(ano, numero - 1, 1);

  var ate = new Date(ano, numero, 0);

  return {
    tipo: 'mes',
    mes: mes,
    de: de,
    ate: ate,
    dias: diasEntre_(de, ate),
    rotulo: RECC_NOMES_DOS_MESES[numero - 1] + ' de ' + ano
  };
}

function periodoAnterior_(periodo) {
  if (periodo.tipo === 'mes') {
    var partes = periodo.mes.split('-');
    var ano = Number(partes[0]);
    var numero = Number(partes[1]) - 1;
    if (numero < 1) { numero = 12; ano = ano - 1; }
    return periodoDoMes_(ano + '-' + (numero < 10 ? '0' : '') + numero);
  }

  var quantos = diasEntre_(periodo.de, periodo.ate);

  var ate = new Date(periodo.de.getTime());
  ate.setDate(ate.getDate() - 1);
  var de = new Date(ate.getTime());
  de.setDate(de.getDate() - (quantos - 1));

  return { tipo: periodo.tipo, de: de, ate: ate, dias: periodo.dias, rotulo: '' };
}

function diasEntre_(de, ate) {
  var umDia = 24 * 60 * 60 * 1000;
  var cru = Math.round((ate.getTime() - de.getTime()) / umDia);
  return Math.max(cru + 1, 1);
}

function comoSeEscreve_(data) {
  return Utilities.formatDate(data, RECC_FUSO_HORARIO, 'dd/MM/yyyy');
}

function mesValido_(texto) {
  var limpo = String(texto || '').trim();
  if (!/^\d{4}-\d{2}$/.test(limpo)) return '';
  var numero = Number(limpo.split('-')[1]);
  return (numero >= 1 && numero <= 12) ? limpo : '';
}

function mesesParaEscolher_() {
  var lista = [];
  var hoje = new Date();
  for (var i = 0; i < RECC_MESES_PARA_TRAS; i++) {
    var quando = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    var numero = quando.getMonth() + 1;
    var chave = quando.getFullYear() + '-' + (numero < 10 ? '0' : '') + numero;
    lista.push({
      valor: chave,
      rotulo: RECC_NOMES_DOS_MESES[numero - 1] + ' de ' + quando.getFullYear()
    });
  }
  return lista;
}

const RECC_FILTROS_NO_TRABALHO = 6;

function filtrosDoCanal_(canal, quem) {
  var disponiveis = [];

  var colunaDoStatus = normalizarParaComparar_(canal.colunaDoStatus || '');
  var ativos = camposAtivosDoCanal_(canal.id);
  var chaveDoStatus = '';
  ativos.forEach(function (campo) {
    if (normalizarParaComparar_(campo.Cabecalho) === colunaDoStatus) {
      chaveDoStatus = String(campo.ChaveTecnica);
    }
  });
  function prioridade(campo) {
    if (normalizarParaComparar_(campo.Cabecalho) === colunaDoStatus) return 0;
    var condicao = lerConfiguracaoDoCampo_(campo).mostrarSe;
    if (chaveDoStatus && condicao && String(condicao.campo) === chaveDoStatus) return 1;
    return 2;
  }
  var campos = ativos.map(function (campo, ordem) {
    return { campo: campo, prioridade: prioridade(campo), ordem: ordem };
  }).sort(function (um, outro) {
    return um.prioridade - outro.prioridade || um.ordem - outro.ordem;
  }).map(function (item) { return item.campo; });

  campos.forEach(function (campo) {
    if (disponiveis.length >= RECC_FILTROS_NO_TRABALHO) return;
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

function aplicarBusca_(registros, canal, termo) {
  if (!termo) return registros;

  var onde = [];
  var jaTem = {};
  function guardar(coluna) {
    var chave = normalizarParaComparar_(coluna.cabecalho);
    if (jaTem[chave]) return;
    jaTem[chave] = true;
    onde.push(coluna);
  }
  colunasDaFila_(canal).forEach(function (grupo) {
    grupo.colunas.forEach(function (coluna) {
      if (coluna.juntar) {
        coluna.juntar.forEach(guardar);
        onde.push({ juntar: coluna.juntar });
      } else {
        guardar(coluna);
      }
    });
  });
  colunasDaBusca_(canal).forEach(guardar);

  var termoEhNumero = /^[\d\s.\-\/]+$/.test(String(termo).trim());
  var estrutura = estruturaDaAba_(canal.aba);
  estrutura.cabecalhos.forEach(function (cabecalho, posicao) {
    if (!cabecalho || String(cabecalho).charAt(0) === '_') return;
    var tipo = estrutura.tipos[posicao];
    if (tipo === RECC_TIPO_DE_DADO.IDENTIFICADOR && !termoEhNumero) return;
    guardar({ cabecalho: cabecalho, tipo: tipo });
  });

  return registros.filter(function (registro) {
    return onde.some(function (coluna) {
      if (coluna.juntar) {
        var inteira = coluna.juntar.map(function (pedaco) {
          return String(registro[pedaco.cabecalho] === undefined
            ? '' : registro[pedaco.cabecalho]);
        }).filter(function (texto) { return texto !== ''; }).join('-');
        return casaComOTermo_(inteira, termo, '');
      }

      var valor = coluna.tipo === RECC_TIPO_DE_DADO.IDENTIFICADOR
        ? registro[coluna.cabecalho]
        : paraTexto_(registro[coluna.cabecalho], coluna.tipo);
      return casaComOTermo_(valor, termo, coluna.tipo);
    });
  });
}

function dimensaoDoCartao_(valor) {
  var canonicas = ['total', 'situacao', 'naCelula', 'preenchido', 'valor'];
  var procurado = normalizarParaComparar_(valor);
  for (var i = 0; i < canonicas.length; i++) {
    if (normalizarParaComparar_(canonicas[i]) === procurado) return canonicas[i];
  }
  return '';
}

function contarCartoes_(registros, anteriores, canal, tela) {
  var agora = canal.colunaDoStatus ? contarPorSituacao_(registros, canal) : {};
  var antes = canal.colunaDoStatus ? contarPorSituacao_(anteriores, canal) : {};

  var tons = {};
  situacoesDoCanal_(canal).forEach(function (situacao) {
    tons[situacao.chave] = situacao.tom;
  });

  var existentes = {};
  situacoesDoCanal_(canal).forEach(function (situacao) {
    existentes[normalizarParaComparar_(situacao.gravadoComo)] = true;
  });

  return cartoesDoCanal_(canal, tela).map(function (cartao) {

    if (cartao.dimensao === 'situacao' && !existentes[normalizarParaComparar_(cartao.filtro)]) {
      return null;
    }
    var feito = umCartao(cartao);
    if (feito) {
      feito.dimensao = cartao.dimensao;

      feito.id = cartao.id;
      feito.filtravel = cartao.dimensao !== 'naCelula';
    }
    return feito;
  }).filter(function (cartao) { return cartao !== null; });

  function umCartao(cartao) {
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
    if (cartao.dimensao === 'preenchido') {
      var quantos = contarComColunaPreenchida_(registros, canal, cartao.filtro);
      if (quantos === null) return null;
      return montarCartao_(normalizarParaComparar_(cartao.filtro), cartao.titulo,
        quantos, contarComColunaPreenchida_(anteriores, canal, cartao.filtro),
        cartao.cor, 'Casos com "' + cartao.filtro + '" preenchida');
    }
    if (cartao.dimensao === 'valor') {
      var comOValor = contarComOValor_(registros, canal, cartao.coluna, cartao.filtro);
      if (comOValor === null) return null;
      return montarCartao_('valor:' + normalizarParaComparar_(cartao.coluna) + ':'
        + normalizarParaComparar_(cartao.filtro), cartao.titulo, comOValor,
        contarComOValor_(anteriores, canal, cartao.coluna, cartao.filtro),
        cartao.cor, 'Casos com "' + cartao.coluna + '" igual a "' + cartao.filtro + '"');
    }

    var chave = normalizarParaComparar_(cartao.filtro);
    return montarCartao_(chave, cartao.titulo, agora[chave] || 0,
      antes[chave] || 0, cartao.cor || tons[chave] || 'neutro', '');
  }
}

function filtrarPeloCartao_(registros, canal, idDoCartao) {
  var id = converterParaIdentificador_(idDoCartao);
  if (!id) return registros;
  var cartao = cartoesDoCanal_(canal, 'trabalho').filter(function (um) {
    return converterParaIdentificador_(um.id) === id;
  })[0];
  if (!cartao || cartao.dimensao === 'total' || cartao.dimensao === 'naCelula') return registros;

  var estrutura = estruturaDaAba_(canal.aba);
  var coluna = cartao.dimensao === 'situacao' ? canal.colunaDoStatus
    : (cartao.dimensao === 'valor' ? cartao.coluna : cartao.filtro);
  if (!coluna || posicaoDaColuna_(estrutura, coluna) < 0) return [];
  coluna = grafiaDaColuna_(canal.aba, coluna);

  if (cartao.dimensao === 'preenchido') {
    return registros.filter(function (registro) {
      return String(registro[coluna] === null || registro[coluna] === undefined
        ? '' : registro[coluna]).trim() !== '';
    });
  }
  var procurado = normalizarParaComparar_(cartao.filtro);
  return registros.filter(function (registro) {
    return normalizarParaComparar_(registro[coluna]) === procurado;
  });
}

function contarComOValor_(registros, canal, cabecalho, valor) {
  var coluna = String(cabecalho || '').trim();
  var procurado = normalizarParaComparar_(valor);
  if (!coluna || !procurado) return null;
  if (posicaoDaColuna_(estruturaDaAba_(canal.aba), coluna) < 0) return null;
  coluna = grafiaDaColuna_(canal.aba, coluna);

  var quantos = 0;
  registros.forEach(function (registro) {
    if (normalizarParaComparar_(registro[coluna]) === procurado) quantos++;
  });
  return quantos;
}

function contarComColunaPreenchida_(registros, canal, cabecalho) {
  var coluna = String(cabecalho || '').trim();
  if (!coluna) return null;
  if (posicaoDaColuna_(estruturaDaAba_(canal.aba), coluna) < 0) return null;

  var quantos = 0;
  registros.forEach(function (registro) {
    if (String(registro[coluna] === null || registro[coluna] === undefined
      ? '' : registro[coluna]).trim() !== '') quantos++;
  });
  return quantos;
}

function cartoesDoCanal_(canal, tela) {
  var doCanal = converterParaIdentificador_(canal.id);
  var qual = normalizarParaComparar_(tela || 'trabalho');

  return lerRegistros_('PAINEIS')
    .filter(function (linha) {
      if (normalizarParaComparar_(linha.Tela) !== qual) return false;
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

        coluna: String(linha.CampoMedida || ''),
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

        nome: String(item.Rotulo || item.Nome),
        gravadoComo: String(item.Nome),
        tom: tomValido_(item.Cor),
        colunaDeCarimbo: String(item.ColunaDeCarimbo || '').trim(),
        final: normalizarParaComparar_(item.Final) === 'sim'
      };
    });
}

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

function colunasDaFila_(canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var declarado = String(canal.colunasDaFila || '');

  var pedacos = declarado.indexOf(':') < 0
    ? declarado.split(',')
    : declarado.split(';');

  return pedacos
    .map(function (pedaco) { return grupoDaFila_(pedaco, estrutura, canal); })
    .filter(function (grupo) { return grupo && grupo.colunas.length; });
}

function colunaDaFila_(texto, estrutura, canal) {
  var existentes = String(texto || '').split('+')
    .map(function (nome) { return nome.trim(); })
    .filter(function (nome) {
      return nome !== '' && posicaoDaColuna_(estrutura, nome) >= 0;
    })
    .map(function (nome) {
      var posicao = posicaoDaColuna_(estrutura, nome);
      return { cabecalho: estrutura.cabecalhos[posicao], tipo: estrutura.tipos[posicao] };
    });
  if (!existentes.length) return null;

  if (existentes.length === 1) {
    return {
      cabecalho: existentes[0].cabecalho,
      tipo: existentes[0].tipo,
      ehStatus: normalizarParaComparar_(existentes[0].cabecalho)
        === normalizarParaComparar_(canal.colunaDoStatus)
    };
  }
  return {
    cabecalho: existentes.map(function (uma) { return uma.cabecalho; }).join(' + '),
    tipo: existentes[0].tipo,
    ehStatus: false,
    juntar: existentes
  };
}

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
    .map(function (nome) { return colunaDaFila_(nome, estrutura, canal); })
    .filter(function (coluna) { return coluna !== null; });

  return {

    titulo: titulo || (colunas.length ? colunas[0].cabecalho : ''),
    colunas: colunas
  };
}

function montarFila_(registros, canal) {
  var grupos = colunasDaFila_(canal);

  var comSla = Number(canal.slaHorasUteis) > 0;
  var finais = {};

  var sinalizadores = sinalizadoresDoCanal_(canal);
  var situacoes = sinalizadores.length ? situacoesPorChave_(canal) : null;
  var agora = (comSla || sinalizadores.length) ? relogioDeParede_(new Date()) : null;

  var tons = {};
  situacoesDoCanal_(canal).forEach(function (situacao) {
    tons[situacao.chave] = situacao.tom;
    if (situacao.final) finais[situacao.chave] = true;
  });

  return registros.slice().reverse().map(function (registro) {
    var celulas = grupos.map(function (grupo) {
      return grupo.colunas.map(function (coluna) {

        var faixa = faixaDaCelula_(canal.aba, coluna.cabecalho,
          registro[coluna.cabecalho]);

        var valor = coluna.juntar
          ? coluna.juntar.map(function (pedaco) {
            return paraTexto_(registro[pedaco.cabecalho], pedaco.tipo);
          }).filter(function (texto) { return texto !== ''; }).join('-')
          : paraTexto_(registro[coluna.cabecalho], coluna.tipo);

        return {
          cabecalho: coluna.cabecalho,
          valor: valor,
          ehStatus: coluna.ehStatus,

          alerta: faixa ? faixa.recado : '',
          tomDoAlerta: faixa ? faixa.tom : ''
        };
      });
    });
    var situacao = canal.colunaDoStatus
      ? String(registro[canal.colunaDoStatus] || '') : '';
    return {
      id: registro.__id,
      celulas: celulas,
      situacao: situacao,
      tom: tons[normalizarParaComparar_(situacao)] || 'neutro',

      sla: comSla ? slaDoCaso_(registro, canal, finais, agora) : null,

      sinais: sinalizadores.map(function (sinalizador) {
        return sinalDoCaso_(registro, canal, sinalizador, situacoes, agora);
      }).filter(function (sinal) { return sinal !== null; })
    };
  });
}

function compactarFila_(fila) {
  return fila.map(function (caso) {
    return {
      id: caso.id,
      v: caso.celulas.map(function (grupo) {
        return grupo.map(function (celula) {
          return celula.alerta || celula.tomDoAlerta
            ? [celula.valor, celula.alerta, celula.tomDoAlerta] : celula.valor;
        });
      }),
      situacao: caso.situacao,
      tom: caso.tom,
      sla: caso.sla,
      sinais: caso.sinais
    };
  });
}

function casosPertoDeVencer_(registros, canal) {
  var sinalizadores = sinalizadoresDoCanal_(canal);
  if (!sinalizadores.length) return [];
  var situacoes = situacoesPorChave_(canal);
  var agora = relogioDeParede_(new Date());
  return registros.filter(function (registro) {
    return sinalizadores.some(function (sinalizador) {
      var sinal = sinalDoCaso_(registro, canal, sinalizador, situacoes, agora);
      return sinal !== null && sinal.tom === 'atencao' && !sinal.encerrado;
    });
  });
}

function relogioDeParede_(data) {
  var texto = Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd HH:mm');
  var partes = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(texto);
  return {
    dia: Math.round(Date.UTC(Number(partes[1]), Number(partes[2]) - 1,
      Number(partes[3])) / 86400000),
    minuto: Number(partes[4]) * 60 + Number(partes[5])
  };
}

function minutoDaHora_(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return isNaN(valor.getTime()) ? null : relogioDeParede_(valor).minuto;
  }
  var partes = /^(\d{1,2}):(\d{2})/.exec(String(valor).trim());
  return partes ? Number(partes[1]) * 60 + Number(partes[2]) : null;
}

function minutosUteisEntre_(de, ate, abre, fecha) {
  if (ate.dia < de.dia || (ate.dia === de.dia && ate.minuto <= de.minuto)) return 0;
  var total = 0;
  for (var dia = de.dia; dia <= ate.dia; dia++) {
    var semana = new Date(dia * 86400000).getUTCDay();
    if (semana === 0 || semana === 6) continue;
    var inicio = dia === de.dia ? Math.max(abre, de.minuto) : abre;
    var fim = dia === ate.dia ? Math.min(fecha, ate.minuto) : fecha;
    if (fim > inicio) total += fim - inicio;
  }
  return total;
}

function pontoDoFim_(data, hora, fecha) {
  var relogio = relogioDeParede_(data);
  var minuto = minutoDaHora_(hora);
  if (minuto === null) minuto = relogio.minuto || fecha;
  return { dia: relogio.dia, minuto: minuto };
}

const RECC_COLUNA_HORA_DA_FINALIZACAO = 'horário da finalização';

function pontoDaFinalizacao_(registro, canal, fecha) {
  if (!canal.colunaDaFinalizacao) return null;
  var data = converterParaDataEHora_(registro[canal.colunaDaFinalizacao]);
  if (!data) return null;
  var colunaDaHora = grafiaDaColuna_(canal.aba, RECC_COLUNA_HORA_DA_FINALIZACAO);
  return pontoDoFim_(data, registro[colunaDaHora], fecha);
}

function fechaPelaFinalizacao_(canal, situacoes) {
  if (!canal.colunaDaFinalizacao) return false;
  var finalizacao = normalizarParaComparar_(canal.colunaDaFinalizacao);
  return Object.keys(situacoes || {}).some(function (chave) {
    var situacao = situacoes[chave];
    return situacao.final && normalizarParaComparar_(situacao.colunaDeCarimbo) === finalizacao;
  });
}

function duracaoParaLer_(minutos, expediente) {
  if (minutos >= expediente) {
    var dias = Math.floor(minutos / expediente);
    return dias + (dias === 1 ? ' dia útil' : ' dias úteis');
  }
  if (minutos < 60) return minutos + 'min';
  var horas = Math.floor(minutos / 60);
  var resto = minutos % 60;
  return horas + 'h' + (resto ? (resto < 10 ? '0' : '') + resto : '');
}

function slaDoCaso_(registro, canal, finais, agora) {
  var abre = minutoDaHora_(canal.inicioDoExpediente);
  var fecha = minutoDaHora_(canal.fimDoExpediente);
  if (abre === null || fecha === null || fecha <= abre) return null;

  var entrada = converterParaData_(registro[canal.colunaDaData]);
  if (!entrada) return null;
  var horaDaEntrada = canal.colunaDaHora
    ? minutoDaHora_(registro[canal.colunaDaHora]) : null;
  var de = {
    dia: relogioDeParede_(entrada).dia,
    minuto: horaDaEntrada === null ? abre : horaDaEntrada
  };

  var ate = agora;
  var parouEm = 'agora';
  var resposta = canal.colunaDaPrimeiraResposta
    ? converterParaData_(registro[canal.colunaDaPrimeiraResposta]) : '';
  if (resposta) {
    parouEm = 'resposta';
    ate = pontoDoFim_(resposta, canal.colunaDaHoraDaPrimeiraResposta
      ? registro[canal.colunaDaHoraDaPrimeiraResposta] : '', fecha);
  } else {
    var situacao = canal.colunaDoStatus
      ? normalizarParaComparar_(registro[canal.colunaDoStatus]) : '';
    var mudou = converterParaDataEHora_(registro[RECC_COLUNA_QUANDO_MUDOU_O_STATUS]);

    var finalizado = pontoDaFinalizacao_(registro, canal, fecha);
    if (finalizado) {
      parouEm = 'encerramento';
      ate = finalizado;
    } else if (finais[situacao] && mudou) {
      parouEm = 'encerramento';
      ate = relogioDeParede_(mudou);
    }
  }
  var parou = parouEm !== 'agora';

  var prazo = Math.round(Number(canal.slaHorasUteis) * 60);
  var gasto = minutosUteisEntre_(de, ate, abre, fecha);
  var expediente = fecha - abre;
  var dentro = gasto <= prazo;

  var texto;
  if (parou) {
    texto = dentro ? 'SLA cumprido · em ' + duracaoParaLer_(gasto, expediente)
      : 'SLA estourado · ' + duracaoParaLer_(gasto - prazo, expediente) + ' além';
  } else {
    texto = dentro ? 'No prazo · faltam ' + duracaoParaLer_(prazo - gasto, expediente)
      : 'Fora do prazo · ' + duracaoParaLer_(gasto - prazo, expediente) + ' além';
  }
  return {
    dentro: dentro,
    parou: parou,
    parouEm: parouEm,
    tom: dentro ? 'bom' : 'ruim',
    texto: texto,
    minutosUteis: gasto,
    prazo: prazo
  };
}

function sinalizadoresDoCanal_(canal) {

  if (!planilhaAtiva_().getSheetByName('SINALIZADORES')) return [];

  var doCanal = converterParaIdentificador_(canal.id);
  return lerRegistros_('SINALIZADORES')
    .filter(function (linha) {
      return converterParaIdentificador_(linha.CanalId) === doCanal
        && normalizarParaComparar_(linha.Ativo) === 'sim';
    })
    .map(sinalizadorDaLinha_)
    .filter(function (sinalizador) { return sinalizador.prazo > 0; })
    .sort(function (um, outro) { return um.ordem - outro.ordem; })
    .map(function (sinalizador) { return colunasDoSinalizadorPelaGrafia_(sinalizador, canal); })
    .map(function (sinalizador) {

      if (normalizarParaComparar_(sinalizador.colunaDaData)
        === normalizarParaComparar_(RECC_COLUNA_DATA_DA_PRIMEIRA_MUDANCA_DE_STATUS)) {
        sinalizador.statusDeNascimento = normalizarParaComparar_(statusPadraoDoCanal_(canal));
      }
      return sinalizador;
    });
}

function condicoesDeParadaDoCanal_(canal) {
  if (!planilhaAtiva_().getSheetByName('SINALIZADORES')) return [];
  var doCanal = converterParaIdentificador_(canal.id);
  return lerRegistros_('SINALIZADORES')
    .filter(function (linha) { return converterParaIdentificador_(linha.CanalId) === doCanal; })
    .map(sinalizadorDaLinha_)
    .filter(temCondicaoDeParada_)
    .map(function (sinalizador) { return colunasDoSinalizadorPelaGrafia_(sinalizador, canal); });
}

function colunasDoSinalizadorPelaGrafia_(sinalizador, canal) {
  ['colunaQueLiga', 'colunaDaData', 'colunaDaHora', 'colunaDaCondicao',
    'colunaDaDataDaCondicao'].forEach(function (chave) {
    if (sinalizador[chave]) sinalizador[chave] = grafiaDaColuna_(canal.aba, sinalizador[chave]);
  });
  return sinalizador;
}

function sinalizadorDaLinha_(linha) {
  var abre = minutoDaHora_(linha.InicioDoExpediente);
  var fecha = minutoDaHora_(linha.FimDoExpediente);

  if (abre === null || fecha === null || fecha <= abre) {
    abre = minutoDaHora_(RECC_EXPEDIENTE_PADRAO.abre);
    fecha = minutoDaHora_(RECC_EXPEDIENTE_PADRAO.fecha);
  }
  return {
    id: linha.__id,
    canalId: converterParaIdentificador_(linha.CanalId),
    nome: String(linha.Nome || '').trim() || 'Prazo',
    prazo: Math.max(0, Number(linha.Prazo) || 0),
    unidade: normalizarParaComparar_(linha.Unidade).indexOf('hora') === 0 ? 'horas' : 'dias',
    aviso: Math.max(0, Number(linha.AvisoFaltando) || 0),
    colunaQueLiga: String(linha.ColunaQueLiga || '').trim(),
    colunaDaData: String(linha.ColunaDaData || '').trim(),
    colunaDaHora: String(linha.ColunaDaHora || '').trim(),
    inicioDoExpediente: horaDoMinuto_(abre),
    fimDoExpediente: horaDoMinuto_(fecha),
    abre: abre,
    fecha: fecha,
    ordem: Number(linha.Ordem) || 0,
    ativo: normalizarParaComparar_(linha.Ativo) === 'sim',

    statusComCondicao: String(linha.StatusComCondicao || '').trim(),
    colunaDaCondicao: String(linha.ColunaDaCondicao || '').trim(),
    valoresDaCondicao: valoresDaCondicaoDoSinalizador_(linha.ValoresDaCondicao),
    colunaDaDataDaCondicao: String(linha.ColunaDaDataDaCondicao || '').trim()
  };
}

function valoresDaCondicaoDoSinalizador_(texto) {
  return String(texto === undefined || texto === null ? '' : texto).split(';')
    .map(function (valor) { return valor.trim(); })
    .filter(function (valor) { return valor !== ''; });
}

function temCondicaoDeParada_(sinalizador) {
  return !!(sinalizador.statusComCondicao && sinalizador.colunaDaCondicao
    && sinalizador.valoresDaCondicao.length && sinalizador.colunaDaDataDaCondicao);
}

function condicaoDeParadaCumprida_(sinalizador, registro) {
  return condicaoBate_({ valores: sinalizador.valoresDaCondicao },
    registro[sinalizador.colunaDaCondicao]);
}

function horaDoMinuto_(minutos) {
  var horas = Math.floor(minutos / 60);
  var resto = minutos % 60;
  return (horas < 10 ? '0' : '') + horas + ':' + (resto < 10 ? '0' : '') + resto;
}

function minutosDeUmaUnidade_(sinalizador) {
  return sinalizador.unidade === 'dias' ? sinalizador.fecha - sinalizador.abre : 60;
}

function duracaoDoPrazo_(minutos, expediente, emHoras) {
  if (emHoras) return duracaoParaLer_(minutos, Number.MAX_VALUE);
  if (minutos < 60) return minutos + 'min';
  if (minutos < expediente) return duracaoParaLer_(minutos, expediente);
  var dias = Math.floor(minutos / expediente);
  var horas = Math.floor((minutos - dias * expediente) / 60);
  return dias + (dias === 1 ? ' dia útil' : ' dias úteis') + (horas ? ' e ' + horas + 'h' : '');
}

function regraDoSinalizador_(sinalizador) {
  var unidade = sinalizador.unidade === 'dias' ? 'dia útil' : 'hora útil';
  var plural = sinalizador.unidade === 'dias' ? 'dias úteis' : 'horas úteis';
  function quanto(n) {
    return String(n).replace('.', ',') + ' ' + (n === 1 ? unidade : plural);
  }
  return quanto(sinalizador.prazo)
    + (sinalizador.aviso > 0 ? ' · amarelo quando faltar ' + quanto(sinalizador.aviso) : '')
    + (normalizarParaComparar_(sinalizador.colunaDaData)
      === normalizarParaComparar_(RECC_COLUNA_DATA_DA_PRIMEIRA_MUDANCA_DE_STATUS)
      ? ' · conta da primeira mudança de status (antes dela, prazo cheio)' : '')
    + (sinalizador.colunaQueLiga
      ? ' · só com "' + sinalizador.colunaQueLiga + '" preenchida' : '')
    + (temCondicaoDeParada_(sinalizador)
      ? ' · "' + sinalizador.statusComCondicao + '" só encerra quando "'
        + sinalizador.colunaDaCondicao + '" for ' + sinalizador.valoresDaCondicao.join(' ou ')
      : '');
}

function sinalDoCaso_(registro, canal, sinalizador, situacoes, agora) {

  if (sinalizador.colunaQueLiga && String(
    registro[sinalizador.colunaQueLiga] === undefined ? '' : registro[sinalizador.colunaQueLiga]
  ).trim() === '') return null;

  var colunaDaData = sinalizador.colunaDaData || canal.colunaDaData;
  var colunaDaHora = sinalizador.colunaDaHora
    || (sinalizador.colunaDaData ? '' : canal.colunaDaHora);
  var inicio = colunaDaData ? converterParaData_(registro[colunaDaData]) : '';
  if (!inicio) return prazoQueNaoComecou_(registro, canal, sinalizador);

  var relogio = relogioDeParede_(inicio);
  var minutoDaHora = colunaDaHora ? minutoDaHora_(registro[colunaDaHora]) : null;
  var de = {
    dia: relogio.dia,

    minuto: minutoDaHora !== null ? minutoDaHora : (relogio.minuto > 0 ? relogio.minuto : sinalizador.abre)
  };

  var situacao = canal.colunaDoStatus
    ? situacoes[normalizarParaComparar_(registro[canal.colunaDoStatus])] : null;
  var comCondicao = temCondicaoDeParada_(sinalizador) && canal.colunaDoStatus
    && normalizarParaComparar_(registro[canal.colunaDoStatus])
      === normalizarParaComparar_(sinalizador.statusComCondicao);
  var encerrado = comCondicao
    ? condicaoDeParadaCumprida_(sinalizador, registro)
    : !!(situacao && situacao.final);
  var ate = agora;
  if (encerrado) {

    var quandoFechou;
    var finalizado = !comCondicao && fechaPelaFinalizacao_(canal, situacoes)
      ? pontoDaFinalizacao_(registro, canal, sinalizador.fecha) : null;
    if (finalizado) {
      ate = finalizado;
    } else {
      if (comCondicao) {
        quandoFechou = converterParaDataEHora_(registro[sinalizador.colunaDaDataDaCondicao]);
      } else {
        var mudou = converterParaDataEHora_(registro[RECC_COLUNA_QUANDO_MUDOU_O_STATUS]);
        var carimbo = situacao.colunaDeCarimbo
          ? converterParaDataEHora_(registro[situacao.colunaDeCarimbo]) : '';
        quandoFechou = mudou || carimbo;
      }
      if (!quandoFechou) return null;
      ate = relogioDeParede_(quandoFechou);
    }
  }

  var porUnidade = minutosDeUmaUnidade_(sinalizador);
  var prazo = Math.round(sinalizador.prazo * porUnidade);
  var aviso = Math.round(sinalizador.aviso * porUnidade);
  var gasto = minutosUteisEntre_(de, ate, sinalizador.abre, sinalizador.fecha);
  var expediente = sinalizador.fecha - sinalizador.abre;
  var dentro = gasto <= prazo;
  var emHoras = sinalizador.unidade === 'horas';

  var tom, resto;
  if (encerrado) {
    tom = dentro ? 'bom' : 'ruim';
    resto = dentro ? 'cumprido em ' + duracaoDoPrazo_(gasto, expediente, emHoras)
      : 'estourado, ' + duracaoDoPrazo_(gasto - prazo, expediente, emHoras) + ' além';
  } else if (!dentro) {
    tom = 'ruim';
    resto = duracaoDoPrazo_(gasto - prazo, expediente, emHoras) + ' além do prazo';
  } else if (prazo - gasto <= aviso) {
    tom = 'atencao';

    resto = prazo - gasto <= 0 ? 'no limite do prazo'
      : 'vence em ' + duracaoDoPrazo_(prazo - gasto, expediente, emHoras);
  } else {
    tom = 'bom';
    resto = 'faltam ' + duracaoDoPrazo_(prazo - gasto, expediente, emHoras);
  }

  return {
    id: sinalizador.id,
    nome: sinalizador.nome,
    tom: tom,
    texto: sinalizador.nome + ' · ' + resto,
    regra: regraDoSinalizador_(sinalizador),
    dentro: dentro,
    encerrado: encerrado,
    alem: dentro ? 0 : gasto - prazo,
    expediente: expediente
  };
}

function prazoQueNaoComecou_(registro, canal, sinalizador) {
  if (sinalizador.statusDeNascimento === undefined || !canal.colunaDoStatus) return null;
  var status = normalizarParaComparar_(registro[canal.colunaDoStatus]);
  if (status && status !== sinalizador.statusDeNascimento) return null;

  var expediente = sinalizador.fecha - sinalizador.abre;
  var prazo = Math.round(sinalizador.prazo * minutosDeUmaUnidade_(sinalizador));
  return {
    id: sinalizador.id,
    nome: sinalizador.nome,
    tom: 'bom',
    texto: sinalizador.nome + ' · prazo cheio, '
      + duracaoDoPrazo_(prazo, expediente, sinalizador.unidade === 'horas'),
    regra: regraDoSinalizador_(sinalizador),
    dentro: true,
    encerrado: false,
    naoComecou: true,
    alem: 0,
    expediente: expediente
  };
}

function situacoesPorChave_(canal) {
  var porChave = {};
  situacoesDoCanal_(canal).forEach(function (situacao) {

    if (situacao.colunaDeCarimbo) {
      situacao.colunaDeCarimbo = grafiaDaColuna_(canal.aba, situacao.colunaDeCarimbo);
    }
    porChave[situacao.chave] = situacao;
  });
  return porChave;
}

function rotuloDoCasoNaFila_(registro, grupos) {
  var grupo = grupos.length > 1 ? grupos[1] : grupos[0];
  var coluna = grupo && grupo.colunas[0];
  if (!coluna) return String(registro.__id || '');
  var valor = coluna.juntar
    ? coluna.juntar.map(function (pedaco) {
      return paraTexto_(registro[pedaco.cabecalho], pedaco.tipo);
    }).filter(function (texto) { return texto !== ''; }).join('-')
    : paraTexto_(registro[coluna.cabecalho], coluna.tipo);
  return valor || String(registro.__id || '');
}

const RECC_MAXIMO_NA_LISTA_DE_PRAZOS = 50;

function resumirPrazos_(avaliados, canal, expediente, emHoras) {
  var grupos = colunasDaFila_(canal);
  var colunaDoAnalista = colunaDoResponsavel_(estruturaDaAba_(canal.aba));
  var r = { total: avaliados.length, noPrazo: 0, atencao: 0, fora: 0,
    cumpridos: 0, estourados: 0, lista: [], maisCasos: 0, porAnalista: [] };

  var passaram = [];
  avaliados.forEach(function (um) {
    if (um.tom === 'ruim') {
      if (um.encerrado) r.estourados++; else r.fora++;
      passaram.push(um);
    } else if (um.encerrado) {
      r.cumpridos++;
    } else if (um.tom === 'atencao') {
      r.atencao++;
    } else {
      r.noPrazo++;
    }
  });

  passaram.sort(function (um, outro) { return outro.alem - um.alem; });
  r.maisCasos = Math.max(0, passaram.length - RECC_MAXIMO_NA_LISTA_DE_PRAZOS);
  var quem = {};
  passaram.forEach(function (um, i) {
    var nome = colunaDoAnalista ? String(um.registro[colunaDoAnalista] || '').trim() : '';
    nome = nome || 'Sem analista';
    var linha = quem[nome] = quem[nome] || { analista: nome, fora: 0, estourados: 0, total: 0 };
    if (um.encerrado) linha.estourados++; else linha.fora++;
    linha.total++;
    if (i < RECC_MAXIMO_NA_LISTA_DE_PRAZOS) {
      r.lista.push({
        id: um.registro.__id,
        caso: rotuloDoCasoNaFila_(um.registro, grupos),
        analista: nome,
        situacao: canal.colunaDoStatus ? String(um.registro[canal.colunaDoStatus] || '') : '',
        encerrado: um.encerrado,
        alem: duracaoDoPrazo_(um.alem, expediente, emHoras)
      });
    }
  });
  r.porAnalista = Object.keys(quem).map(function (nome) { return quem[nome]; })
    .sort(function (um, outro) {
      return outro.total - um.total || um.analista.localeCompare(outro.analista);
    });
  return r;
}

function controleDePrazos_(casos, canal) {
  var situacoes = situacoesPorChave_(canal);
  var finais = {};
  Object.keys(situacoes).forEach(function (chave) {
    if (situacoes[chave].final) finais[chave] = true;
  });
  var agora = relogioDeParede_(new Date());

  var sla = null;
  if (Number(canal.slaHorasUteis) > 0) {
    var abre = minutoDaHora_(canal.inicioDoExpediente);
    var fecha = minutoDaHora_(canal.fimDoExpediente);
    var contados = [];
    var semConta = 0;
    casos.forEach(function (registro) {
      var um = slaDoCaso_(registro, canal, finais, agora);
      if (!um) { semConta++; return; }
      contados.push({ registro: registro, tom: um.tom, encerrado: um.parou,
        alem: Math.max(0, um.minutosUteis - um.prazo) });
    });
    sla = resumirPrazos_(contados, canal,
      (fecha !== null && abre !== null) ? fecha - abre : 615, true);
    sla.nome = 'SLA de ' + String(Number(canal.slaHorasUteis)).replace('.', ',')
      + ' horas úteis';
    sla.semConta = semConta;
  }

  var sinalizadores = sinalizadoresDoCanal_(canal).map(function (sinalizador) {
    var avaliados = [];
    var semPrazo = 0;
    casos.forEach(function (registro) {
      var um = sinalDoCaso_(registro, canal, sinalizador, situacoes, agora);
      if (um) avaliados.push({ registro: registro, tom: um.tom, encerrado: um.encerrado, alem: um.alem });
    });
    semPrazo = casos.length - avaliados.length;
    var resumo = resumirPrazos_(avaliados, canal, sinalizador.fecha - sinalizador.abre,
      sinalizador.unidade === 'horas');
    resumo.id = sinalizador.id;
    resumo.nome = sinalizador.nome;
    resumo.regra = regraDoSinalizador_(sinalizador);
    resumo.semPrazo = semPrazo;
    return resumo;
  });

  if (!sla && !sinalizadores.length) return null;
  return { sla: sla, sinalizadores: sinalizadores };
}

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

  if (tipo === RECC_TIPO_DE_DADO.NUMERO) {
    var quanto = converterParaNumero_(valor);
    if (quanto === '') return '';
    return String(quanto).replace('.', ',');
  }

  return String(valor);
}

const RECC_TIPOS_DE_GRAFICO = {
  pizza: 'Pizza',
  barras: 'Barras em pé',
  barrasDeitadas: 'Barras deitadas',
  linha: 'Linha',
  barrasComLinha: 'Barras com linha de tendência'
};

const RECC_AGREGACOES = {
  contagem: 'Contagem de casos',
  soma: 'Soma de um valor',
  media: 'Média de um valor'
};

const RECC_TOPO_DOS_GRAFICOS = 5;

function colunasDosPremios_(canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var achar = function (nome) {
    var posicao = posicaoDaColuna_(estrutura, nome);
    return posicao < 0 ? '' : estrutura.cabecalhos[posicao];
  };
  var colunas = { anual: achar('valor do prêmio'), mensal: achar('prêmio mensal'),
    retido: achar('valor do prêmio retido') };
  return colunas.anual && colunas.mensal && colunas.retido ? colunas : null;
}

function somaDaColuna_(casos, coluna) {
  return casos.reduce(function (soma, caso) {
    var numero = converterParaNumero_(caso[coluna]);
    return soma + (numero === '' || numero === null || isNaN(numero) ? 0 : Number(numero));
  }, 0);
}

function graficoDosPremios_(casos, colunas) {
  var pontos = [['anual', 'Prêmio anual', colunas.anual], ['mensal', 'Prêmio mensal', colunas.mensal],
    ['retido', 'Prêmio retido', colunas.retido]].map(function (par) {
    var comValor = casos.filter(function (caso) {
      var numero = converterParaNumero_(caso[par[2]]);
      return numero !== '' && numero !== null && !isNaN(numero) && Number(numero) !== 0;
    }).length;
    return { chave: par[0], rotulo: par[1], valor: somaDaColuna_(casos, par[2]), casos: comValor,
      ehOutros: false, tom: par[0] === 'retido' ? 'bom' : '', serie: 0 };
  });
  return {
    titulo: 'Prêmios: anual, mensal e retido',
    tipo: 'barras',
    largura: 2,
    dimensao: 'Prêmio',
    medida: 'Valor',
    agregacao: 'soma',
    unidade: 'dinheiro',
    ehTempo: false,
    pontos: pontos,
    tendencia: null,

    total: null,
    aviso: ''
  };
}

function somarPremiosNosCartoes_(cartoes, casos, canal, colunas) {
  var colunaDoStatus = canal.colunaDoStatus ? grafiaDaColuna_(canal.aba, canal.colunaDoStatus) : '';
  if (!colunaDoStatus) return;
  var porChave = {};
  situacoesDoCanal_(canal).forEach(function (situacao) {
    porChave[normalizarParaComparar_(situacao.gravadoComo)] = situacao.gravadoComo;
  });
  cartoes.forEach(function (cartao) {
    if (cartao.dimensao !== 'situacao') return;
    var doStatus = casos.filter(function (caso) {
      return normalizarParaComparar_(caso[colunaDoStatus]) === cartao.chave;
    });
    var qual = cartao.chave === 'retido' ? 'retido'
      : (cartao.chave === 'naotrabalhado' ? 'mensal' : 'anual');
    cartao.soma = somaDaColuna_(doStatus, colunas[qual]);
    cartao.rotuloDaSoma = 'prêmio ' + qual;
  });
}

function quadroPorAnalista_(casos, canal, colunas) {
  var estrutura = estruturaDaAba_(canal.aba);
  var colunaDoAnalista = colunaDoResponsavel_(estrutura);
  var colunaDoStatus = canal.colunaDoStatus ? grafiaDaColuna_(canal.aba, canal.colunaDoStatus) : '';
  var status = situacoesDoCanal_(canal).map(function (situacao) {
    return { chave: normalizarParaComparar_(situacao.gravadoComo), nome: situacao.nome };
  });
  var porAnalista = {};
  var ordem = [];
  casos.forEach(function (caso) {
    var nome = String((colunaDoAnalista ? caso[colunaDoAnalista] : '') || '').trim() || 'Sem analista';
    var chave = normalizarParaComparar_(nome);
    if (!porAnalista[chave]) {
      porAnalista[chave] = { analista: nome, total: 0, porStatus: {}, casos: [] };
      ordem.push(chave);
    }
    var linha = porAnalista[chave];
    linha.total++;
    linha.casos.push(caso);
    var doStatus = colunaDoStatus ? normalizarParaComparar_(caso[colunaDoStatus]) : '';
    linha.porStatus[doStatus] = (linha.porStatus[doStatus] || 0) + 1;
  });

  var usados = status.filter(function (s) {
    return ordem.some(function (chave) { return porAnalista[chave].porStatus[s.chave]; });
  });
  var linhas = ordem.map(function (chave) {
    var linha = porAnalista[chave];
    return {
      analista: linha.analista,
      total: linha.total,
      porStatus: usados.map(function (s) { return linha.porStatus[s.chave] || 0; }),
      anual: somaDaColuna_(linha.casos, colunas.anual),
      mensal: somaDaColuna_(linha.casos, colunas.mensal),
      retido: somaDaColuna_(linha.casos, colunas.retido)
    };
  }).sort(function (um, outro) {
    return outro.total - um.total || (um.analista < outro.analista ? -1 : 1);
  });
  return {
    status: usados.map(function (s) { return s.nome; }),
    linhas: linhas,
    totais: {
      total: casos.length,
      porStatus: usados.map(function (s) {
        return ordem.reduce(function (soma, chave) {
          return soma + (porAnalista[chave].porStatus[s.chave] || 0);
        }, 0);
      }),
      anual: somaDaColuna_(casos, colunas.anual),
      mensal: somaDaColuna_(casos, colunas.mensal),
      retido: somaDaColuna_(casos, colunas.retido)
    }
  };
}

const RECC_COLUNAS_DAS_TENTATIVAS = ['Data do 1º contato', 'Data do 2º contato'];
const RECC_STATUS_DE_SUCESSO = ['Retido', 'Não retido'];
const RECC_STATUS_SEM_SUCESSO = 'Sem sucesso de contato';

const RECC_CPFS_LISTADOS = 100;

function tentativasAteOSucesso_(casos, canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var achar = function (nome) {
    var posicao = posicaoDaColuna_(estrutura, nome);
    return posicao < 0 ? '' : estrutura.cabecalhos[posicao];
  };
  var colunasDasTentativas = RECC_COLUNAS_DAS_TENTATIVAS.map(achar);
  var colunaDoStatus = canal.colunaDoStatus ? grafiaDaColuna_(canal.aba, canal.colunaDoStatus) : '';
  if (colunasDasTentativas.some(function (coluna) { return !coluna; }) || !colunaDoStatus) return null;
  var colunaDoCpf = achar('CPF');
  var colunaDoCliente = achar('nome do cliente');
  var colunaDoAnalista = colunaDoResponsavel_(estrutura);

  var nomeDoStatus = {};
  situacoesDoCanal_(canal).forEach(function (situacao) {
    nomeDoStatus[normalizarParaComparar_(situacao.gravadoComo)] = situacao.nome;
  });
  var deSucesso = RECC_STATUS_DE_SUCESSO.map(normalizarParaComparar_);
  var semSucesso = normalizarParaComparar_(RECC_STATUS_SEM_SUCESSO);

  var lidos = casos.map(function (caso) {
    var status = normalizarParaComparar_(caso[colunaDoStatus]);
    var tentativas = colunasDasTentativas.filter(function (coluna) {
      return String(caso[coluna] === null || caso[coluna] === undefined ? '' : caso[coluna]).trim() !== '';
    }).length;
    var desfecho = deSucesso.indexOf(status) >= 0 ? 'sucesso'
      : (status === semSucesso ? 'semSucesso' : 'emAndamento');
    return {
      caso: caso,
      status: nomeDoStatus[status] || String(caso[colunaDoStatus] || '').trim() || 'Sem status',
      desfecho: desfecho,
      contatos: tentativas + (desfecho === 'emAndamento' ? 0 : 1)
    };
  });

  function faixas(grupo) {
    var porContato = [];
    grupo.forEach(function (lido) {
      if (lido.desfecho !== 'sucesso') return;
      porContato[lido.contatos - 1] = (porContato[lido.contatos - 1] || 0) + 1;
    });
    for (var i = 0; i < Math.max(porContato.length, 3); i++) porContato[i] = porContato[i] || 0;
    return porContato;
  }
  function resumo(grupo) {
    var sucessos = grupo.filter(function (lido) { return lido.desfecho === 'sucesso'; });
    var contatos = sucessos.reduce(function (soma, lido) { return soma + lido.contatos; }, 0);
    return {
      sucessos: sucessos.length,
      porContato: faixas(grupo),
      semSucesso: grupo.filter(function (lido) { return lido.desfecho === 'semSucesso'; }).length,
      emAndamento: grupo.filter(function (lido) { return lido.desfecho === 'emAndamento'; }).length,

      media: sucessos.length ? Math.round(contatos / sucessos.length * 10) / 10 : null
    };
  }

  var geral = resumo(lidos);
  var ordinal = function (n) { return 'No ' + n + 'º contato'; };
  var pontos = geral.porContato.map(function (quantos, i) {
    return { chave: 'contato' + (i + 1), rotulo: ordinal(i + 1), valor: quantos, casos: quantos,
      ehOutros: false, tom: 'bom', serie: 0 };
  }).concat([{ chave: 'semsucesso', rotulo: 'Sem sucesso', valor: geral.semSucesso,
    casos: geral.semSucesso, ehOutros: false, tom: 'atencao', serie: 0 }]);

  var porAnalista = {};
  var ordem = [];
  lidos.forEach(function (lido) {
    var nome = String((colunaDoAnalista ? lido.caso[colunaDoAnalista] : '') || '').trim() || 'Sem analista';
    var chave = normalizarParaComparar_(nome);
    if (!porAnalista[chave]) { porAnalista[chave] = { analista: nome, lidos: [] }; ordem.push(chave); }
    porAnalista[chave].lidos.push(lido);
  });
  var analistas = ordem.map(function (chave) {
    var linha = resumo(porAnalista[chave].lidos);
    linha.analista = porAnalista[chave].analista;
    return linha;
  });

  analistas.forEach(function (linha) {
    for (var i = 0; i < geral.porContato.length; i++) linha.porContato[i] = linha.porContato[i] || 0;
  });
  analistas.sort(function (um, outro) {
    return outro.sucessos - um.sucessos || (um.analista < outro.analista ? -1 : 1);
  });

  var porCpf = {};
  var cpfs = [];
  var semCpf = 0;
  lidos.forEach(function (lido) {
    var cpf = colunaDoCpf ? converterParaIdentificador_(lido.caso[colunaDoCpf]) : '';
    if (!cpf) { semCpf++; return; }
    if (!porCpf[cpf]) {
      porCpf[cpf] = { cpf: cpf, cliente: '', casos: 0, contatos: 0, desfechos: [] };
      cpfs.push(cpf);
    }
    var linha = porCpf[cpf];
    linha.casos++;
    linha.contatos += lido.contatos;
    var cliente = colunaDoCliente ? String(lido.caso[colunaDoCliente] || '').trim() : '';
    if (cliente) linha.cliente = cliente;
    var desfecho = lido.desfecho === 'sucesso'
      ? lido.status + ' no ' + lido.contatos + 'º contato' : lido.status;
    if (linha.desfechos.indexOf(desfecho) < 0) linha.desfechos.push(desfecho);
  });
  var linhasDosCpfs = cpfs.map(function (cpf) {
    var linha = porCpf[cpf];
    return { cpf: linha.cpf, cliente: linha.cliente, casos: linha.casos, contatos: linha.contatos,
      desfecho: linha.desfechos.join(', ') };
  }).sort(function (um, outro) {
    return outro.contatos - um.contatos || outro.casos - um.casos || (um.cpf < outro.cpf ? -1 : 1);
  });

  return {
    titulo: 'Tentativas até o sucesso',
    sucessos: geral.sucessos,
    semSucesso: geral.semSucesso,
    emAndamento: geral.emAndamento,
    media: geral.media,
    grafico: {
      titulo: 'Em qual contato o cliente atendeu',
      tipo: 'barras', largura: 2, dimensao: 'Contato', medida: 'Casos',
      agregacao: 'contagem', unidade: 'casos', ehTempo: false,
      pontos: pontos, tendencia: null, total: null, aviso: ''
    },
    faixas: geral.porContato.map(function (quantos, i) { return ordinal(i + 1); }),
    porAnalista: analistas.map(function (linha) {
      return { analista: linha.analista, sucessos: linha.sucessos, porContato: linha.porContato,
        semSucesso: linha.semSucesso, media: linha.media };
    }),
    porCpf: {
      linhas: linhasDosCpfs.slice(0, RECC_CPFS_LISTADOS),
      total: linhasDosCpfs.length,
      semCpf: semCpf
    }
  };
}

function produtividadeDaEquipe(idDoCanal, filtros, periodoPedido) {
  var quem = exigirTela_('produtividade');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var periodo = resolverPeriodo_(periodoPedido);
  var antes = periodoAnterior_(periodo);

  var recentes = lerRegistros_(canal.aba, { ultimas: linhasQueOPainelOlha_() });
  var truncada = recentes.length >= linhasQueOPainelOlha_();

  var guardarSemData = guardaOsSemData_(periodo);

  var noPeriodo = alcanceDaProdutividade_(
    entreDuasDatas_(recentes, canal, periodo.de, periodo.ate, guardarSemData),
    canal, quem);

  var anterior = alcanceDaProdutividade_(
    entreDuasDatas_(recentes, canal, antes.de, antes.ate, false), canal, quem);

  var disponiveis = filtrosDoCanal_(canal, quem);
  var casos = aplicarFiltros_(noPeriodo, disponiveis, filtros || {});
  var casosDeAntes = aplicarFiltros_(anterior, disponiveis, filtros || {});

  var componentes = componentesDoCanal_(canal).map(function (componente) {
    return calcularComponente_(componente, casos, canal);
  });
  var colunasDosPremios = colunasDosPremios_(canal);
  var cartoes = contarCartoes_(casos, casosDeAntes, canal, 'produtividade');
  if (colunasDosPremios) somarPremiosNosCartoes_(cartoes, casos, canal, colunasDosPremios);

  return {
    canal: { id: canal.id, nome: canal.nome, icone: canal.icone },
    periodo: {
      tipo: periodo.tipo,
      dias: periodo.dias,
      mes: periodo.mes || '',
      de: comoSeEscreve_(periodo.de),
      ate: comoSeEscreve_(periodo.ate),
      rotulo: periodo.rotulo
    },

    mesesDisponiveis: mesesParaEscolher_(),
    total: casos.length,
    truncada: truncada,
    linhasLidas: recentes.length,
    filtrosDisponiveis: disponiveis,
    cartoes: cartoes,
    componentes: componentes,

    premios: colunasDosPremios ? graficoDosPremios_(casos, colunasDosPremios) : null,
    porAnalista: colunasDosPremios ? quadroPorAnalista_(casos, canal, colunasDosPremios) : null,

    tentativas: tentativasAteOSucesso_(casos, canal),

    valorPorSituacao: valorPorSituacao_(casos, canal),

    prazos: controleDePrazos_(casos, canal),

    atendimentos: atendimentosDaMesa_(noPeriodo, canal, quem, periodo),
    podeExportar: podeFazer_(quem.permissoes, RECC_ACOES.EXPORTAR)
  };
}

function alcanceDaProdutividade_(registros, canal, quem) {
  var alcance = quem.permissoes.escopoNaProdutividade || 'EQUIPE';

  if (alcance === 'CANAL') return registros;

  var coluna = colunaDoResponsavel_(estruturaDaAba_(canal.aba));

  if (!coluna) return filtrarPeloAlcance_(registros, canal.aba, quem);

  if (alcance === 'PROPRIOS') {
    var meuNome = normalizarParaComparar_((quem.usuario || {}).Nome);
    if (!meuNome) return [];
    return registros.filter(function (registro) {
      return normalizarParaComparar_(registro[coluna]) === meuNome;
    });
  }

  var minhaEquipe = nomesDaMinhaEquipe_(quem);

  if (!minhaEquipe || !minhaEquipe.length) {
    return filtrarPeloAlcance_(registros, canal.aba, quem);
  }

  var indice = {};
  minhaEquipe.forEach(function (nome) {
    indice[normalizarParaComparar_(nome)] = true;
  });
  return registros.filter(function (registro) {
    return indice[normalizarParaComparar_(registro[coluna])] === true;
  });
}

function componentesDoCanal_(canal) {
  var doCanal = converterParaIdentificador_(canal.id);

  return lerRegistros_('PAINEIS')
    .filter(function (linha) {
      if (normalizarParaComparar_(linha.Ativo) !== 'sim') return false;

      var canalDaLinha = converterParaIdentificador_(linha.CanalId);
      if (canalDaLinha && canalDaLinha !== doCanal) return false;
      return ehGraficoDoPainel_(linha, canalDaLinha || doCanal);
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

function calcularComponente_(componente, casos, canal) {
  var estrutura = estruturaDaAba_(canal.aba);
  var posicaoDaDimensao = posicaoDaColuna_(estrutura, componente.dimensao);

  if (posicaoDaDimensao < 0) {
    return semDados_(componente, 'A coluna "' + componente.dimensao +
      '" não existe na aba ' + canal.aba + '. Ajuste em Configurações › Painéis.');
  }

  var tipoDaDimensao = estrutura.tipos[posicaoDaDimensao];
  var ehTempo = (tipoDaDimensao === RECC_TIPO_DE_DADO.DATA
    || tipoDaDimensao === RECC_TIPO_DE_DADO.DATA_HORA);

  if (componente.agregacao !== 'contagem' && !componente.medida) {
    return semDados_(componente, 'Este gráfico soma um valor, mas não diz qual. ' +
      'Escolha a coluna da medida em Configurações › Painéis.');
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

  if (ordemDasChaves.length === 1 && ordemDasChaves[0] === 'Sem informação') {
    return semDados_(componente, 'Nenhum caso do período tem "'
      + componente.dimensao + '" preenchida, então não há o que agrupar.');
  }

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

  if (ehTempo) {
    pontos.sort(function (um, outro) {
      return um.chave < outro.chave ? -1 : (um.chave > outro.chave ? 1 : 0);
    });
  } else {
    pontos.sort(function (um, outro) { return outro.valor - um.valor; });
  }

  var foraDoTopo = 0;
  if (!ehTempo) {
    var teto = componente.limite > 0
      ? Math.min(componente.limite, RECC_TOPO_DOS_GRAFICOS) : RECC_TOPO_DOS_GRAFICOS;
    if (pontos.length > teto) {
      foraDoTopo = pontos.length - teto;
      pontos = pontos.slice(0, teto);
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

    foraDoTopo: foraDoTopo,
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
    foraDoTopo: 0,
    aviso: aviso
  };
}

function pintarPontos_(pontos, componente, canal, ehTempo) {

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

      serie: posicao >= 0 ? (posicao % 6) + 1 : 6
    };
  });
}

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

function unidadeDaMedida_(componente, estrutura) {
  if (componente.agregacao === 'contagem') return 'casos';
  var posicao = posicaoDaColuna_(estrutura, componente.medida);
  if (posicao < 0) return '';
  return estrutura.tipos[posicao] === RECC_TIPO_DE_DADO.DINHEIRO ? 'dinheiro' : '';
}

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

function mediaMovel_(pontos, janela) {
  return pontos.map(function (ponto, i) {
    var de = Math.max(0, i - janela + 1);
    var pedaco = pontos.slice(de, i + 1);
    var soma = pedaco.reduce(function (total, um) { return total + um.valor; }, 0);
    return { chave: ponto.chave, rotulo: ponto.rotulo, valor: soma / pedaco.length };
  });
}

function detalharComponente(idDoCanal, idDoComponente, chaveDoPonto, filtros,
  periodoPedido, quantos) {
  var quem = exigirTela_('produtividade');
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  var componente = null;
  componentesDoCanal_(canal).forEach(function (um) {
    if (converterParaIdentificador_(um.id)
      === converterParaIdentificador_(idDoComponente)) componente = um;
  });
  if (!componente) {
    throw new Error('Este gráfico não existe mais. Recarregue a tela.');
  }

  var periodo = resolverPeriodo_(periodoPedido);
  var recentes = lerRegistros_(canal.aba, { ultimas: linhasQueOPainelOlha_() });

  var meus = alcanceDaProdutividade_(
    entreDuasDatas_(recentes, canal, periodo.de, periodo.ate,
      guardaOsSemData_(periodo)),
    canal, quem);
  var casos = aplicarFiltros_(meus, filtrosDoCanal_(canal, quem), filtros || {});

  var estrutura = estruturaDaAba_(canal.aba);
  var posicao = posicaoDaColuna_(estrutura, componente.dimensao);
  var ehTempo = posicao >= 0 && (estrutura.tipos[posicao] === RECC_TIPO_DE_DADO.DATA
    || estrutura.tipos[posicao] === RECC_TIPO_DE_DADO.DATA_HORA);

  var procurado = String(chaveDoPonto || '');

  var escolhidos = casos.filter(function (caso) {
    var valor = ehTempo
      ? diaDoCaso_(caso[componente.dimensao])
      : (String(caso[componente.dimensao] || '').trim() || 'Sem informação');
    return normalizarParaComparar_(valor) === normalizarParaComparar_(procurado);
  });

  return {
    titulo: componente.titulo,
    ponto: ehTempo ? rotuloDoDia_(procurado) : procurado,
    colunas: colunasDaFila_(canal),

    casos: compactarFila_(montarFila_(quantos === 'todos'
      ? escolhidos : escolhidos.slice(-RECC_FILA_NA_ABERTURA), canal)),
    filaCompacta: true,
    total: escolhidos.length,

    podeEditar: podeFazer_(quem.permissoes, RECC_ACOES.EDITAR)
  };
}

function exportarComponente(idDoCanal, idDoComponente, filtros, periodoPedido) {
  exigirPermissao_(RECC_ACOES.EXPORTAR);
  exigirTela_('produtividade');

  var painel = produtividadeDaEquipe(idDoCanal, filtros, periodoPedido);
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

function formatarParaExportar_(valor) {
  if (typeof valor !== 'number') return String(valor === undefined ? '' : valor);
  return (Math.round(valor * 100) / 100).toString().replace('.', ',');
}

function nomeDeArquivo_(titulo) {
  var limpo = normalizarParaComparar_(titulo).replace(/[^a-z0-9]+/g, '-');
  return limpo.replace(/^-+|-+$/g, '') || 'painel';
}

function opcoesDosGraficos(idDoCanal) {
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
    topoDosGraficos: RECC_TOPO_DOS_GRAFICOS
  };
}

function ehGraficoDoPainel_(linha, idDoCanal) {
  if (normalizarParaComparar_(linha.Tela) !== 'produtividade') return false;
  if (normalizarParaComparar_(linha.TipoWidget) === 'cartao') return false;
  return converterParaIdentificador_(linha.CanalId)
    === converterParaIdentificador_(idDoCanal);
}

function listarComponentesDoPainel(idDoCanal) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var canal = canalQueEuPossoVer_(idDoCanal, quem);

  return lerRegistros_('PAINEIS')
    .filter(function (linha) { return ehGraficoDoPainel_(linha, canal.id); })
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
    return ehGraficoDoPainel_(linha, canal.id);
  });
  var continuam = {};

  lista.forEach(function (componente, posicao) {
    var campos = {
      Tela: 'produtividade',
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

function valorPorSituacao_(casos, canal) {
  var colunaDoValor = String(canal.colunaDoValor || '').trim();
  var colunaDoStatus = String(canal.colunaDoStatus || '').trim();
  var destacadas = situacoesDestacadas_(canal);

  if (!colunaDoValor || !colunaDoStatus || !destacadas.length) return null;

  var estrutura = estruturaDaAba_(canal.aba);
  if (posicaoDaColuna_(estrutura, colunaDoValor) < 0) {
    return {
      titulo: 'Valor por situação', tipo: 'barras', largura: 2,
      dimensao: colunaDoStatus, medida: colunaDoValor, agregacao: 'soma',
      unidade: 'dinheiro', ehTempo: false, pontos: [], tendencia: null,
      total: 0, totalDeCasos: 0,
      aviso: 'A coluna "' + colunaDoValor + '" não existe mais na aba '
        + canal.aba + '. Ajuste em Configurações › Canais de trabalho.'
    };
  }

  var baldes = destacadas.map(function (nome) {
    return { chave: nome, rotulo: nome, valor: 0, casos: 0 };
  });
  var porNome = {};
  baldes.forEach(function (balde) {
    porNome[normalizarParaComparar_(balde.chave)] = balde;
  });

  var demais = { chave: '__outros', rotulo: 'Demais situações', valor: 0,
    casos: 0, ehOutros: true };

  casos.forEach(function (caso) {
    var quanto = converterParaNumero_(caso[colunaDoValor]) || 0;
    var balde = porNome[normalizarParaComparar_(caso[colunaDoStatus])] || demais;
    balde.valor += quanto;
    balde.casos++;
  });

  var pontos = baldes.concat([demais]);
  var cores = coresDoCatalogo_(canal);

  return {
    titulo: 'Valor por situação',
    tipo: 'barras',
    largura: 2,
    dimensao: colunaDoStatus,
    medida: colunaDoValor,
    agregacao: 'soma',
    unidade: 'dinheiro',
    ehTempo: false,
    pontos: pontos.map(function (ponto) {
      return {
        chave: ponto.chave,
        rotulo: ponto.rotulo,
        valor: ponto.valor,
        casos: ponto.casos,
        ehOutros: !!ponto.ehOutros,

        tom: cores[normalizarParaComparar_(ponto.chave)] || '',
        serie: 0
      };
    }),
    tendencia: null,

    total: pontos.reduce(function (soma, ponto) { return soma + ponto.valor; }, 0),
    totalDeCasos: pontos.reduce(function (soma, ponto) { return soma + ponto.casos; }, 0),
    aviso: ''
  };
}

function situacoesDestacadas_(canal) {
  return String(canal.situacoesDestacadas || '')
    .split(',')
    .map(function (pedaco) { return String(pedaco).trim(); })
    .filter(function (pedaco) { return pedaco !== ''; });
}

const RECC_COLUNAS_DO_CHAT = [
  { chave: 'data', cabecalho: 'Data', rotulo: 'Data do atendimento', obrigatoria: true,
    palavras: ['data', 'dataatendimento', 'datadoatendimento', 'dia'] },
  { chave: 'analista', cabecalho: 'Analista', rotulo: 'Analista', obrigatoria: true,
    palavras: ['analista', 'atendente', 'agente', 'operador', 'nomedoanalista'] },
  { chave: 'susep', cabecalho: 'SUSEP', rotulo: 'SUSEP', obrigatoria: false, palavras: ['susep'] },
  { chave: 'corretora', cabecalho: 'Corretora', rotulo: 'Corretora', obrigatoria: false,
    palavras: ['corretora', 'nomecorretora', 'nomedacorretora'] },
  { chave: 'assunto', cabecalho: 'Assunto', rotulo: 'Assunto', obrigatoria: false,
    palavras: ['assunto', 'motivo', 'tema', 'tipodeatendimento'] },
  { chave: 'consultor', cabecalho: 'Consultor', rotulo: 'Consultor', obrigatoria: false,
    palavras: ['consultor'] },
  { chave: 'ramo', cabecalho: 'Ramo', rotulo: 'Vida individual ou em grupo', obrigatoria: false,
    palavras: ['ramo', 'produto', 'segmento', 'vidaindividualougrupo'] },
  { chave: 'sucursal', cabecalho: 'Sucursal', rotulo: 'Sucursal', obrigatoria: false,
    palavras: ['sucursal', 'codsucursal', 'codigodasucursal'] },
  { chave: 'tabulacao', cabecalho: 'Tabulação', rotulo: 'Tabulação', obrigatoria: false,
    palavras: ['tabulacao', 'tabulacoes'] },
  { chave: 'subassunto', cabecalho: 'Sub assunto', rotulo: 'Sub assunto', obrigatoria: false,
    palavras: ['subassunto', 'submotivo'] },
  { chave: 'tmo', cabecalho: 'TMO', rotulo: 'TMO (em segundos)', obrigatoria: false,
    palavras: ['tmo', 'tempomedio', 'tempomediodeatendimento', 'tempodeatendimento'] }
];

const RECC_TEXTOS_DO_CHAT = ['SUSEP', 'Corretora', 'Assunto', 'Consultor', 'Ramo', 'Sucursal',
  'Tabulação', 'Sub assunto'];

function segundosDoTmo_(valor) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'number') return isFinite(valor) && valor >= 0 ? valor : null;
  var texto = String(valor).trim().replace(/\s/g, '');
  if (!texto) return '';
  if (/^\d{1,3}(\.\d{3})+$/.test(texto)) return Number(texto.replace(/\./g, ''));
  if (/^\d+$/.test(texto)) return Number(texto);
  if (/^\d+,\d+$/.test(texto)) return Number(texto.replace(',', '.'));
  return null;
}

const RECC_ABA_DO_CHAT = 'ATENDIMENTOS_CHAT';

function sugerirDeParaDoChat_(cabecalhosDaFonte) {
  var usadas = {};
  var porPosicao = {};
  RECC_COLUNAS_DO_CHAT.forEach(function (definicao) {
    var palavras = definicao.palavras.concat([normalizarParaComparar_(definicao.cabecalho)]);
    palavras.some(function (palavra) {
      return cabecalhosDaFonte.some(function (cabecalho, i) {
        if (usadas[i] || normalizarParaComparar_(cabecalho) !== palavra) return false;
        usadas[i] = true;
        porPosicao[i] = definicao.cabecalho;
        return true;
      });
    });
  });
  return cabecalhosDaFonte.map(function (cabecalho, i) {
    return { daFonte: String(cabecalho), paraAColuna: porPosicao[i] || '' };
  });
}

function opcoesDaImportacaoDoChat() {
  exigirPermissao_(RECC_ACOES.IMPORTAR);
  exigirTela_('importacao');
  var existe = !!planilhaAtiva_().getSheetByName(RECC_ABA_DO_CHAT);
  return {
    canal: { id: '', nome: 'Atendimentos do chat (Mesa)', aba: RECC_ABA_DO_CHAT },
    abaExiste: existe,
    colunasDoCanal: RECC_COLUNAS_DO_CHAT.map(function (d) { return d.cabecalho; }),
    obrigatorias: RECC_COLUNAS_DO_CHAT.filter(function (d) { return d.obrigatoria; })
      .map(function (d) { return d.cabecalho; }),
    colunasDeCarimbo: [],
    analistas: [],
    foraDaDivisao: [],
    statusDoCanal: [],
    statusPadrao: '',
    lotes: existe ? lotesDoChat_() : [],
    limite: RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO,
    repeticaoPelaProposta: false,
    repeticaoPadrao: ''
  };
}

function lotesDoChat_() {
  var porLote = {};
  lerRegistros_(RECC_ABA_DO_CHAT).forEach(function (linha) {
    var lote = String(linha.Lote || '').trim();
    if (!lote) return;
    porLote[lote] = (porLote[lote] || 0) + 1;
  });
  return Object.keys(porLote).map(function (lote) {
    return { origem: lote, casos: porLote[lote] };
  });
}

function linhasDoChatDaFonte_(pedido) {
  var grade = gradeDaFonte_(pedido.fonte);
  if (grade.length < 2) {
    throw new Error('Preciso de pelo menos duas linhas: a primeira com os nomes das '
      + 'colunas e ao menos uma de atendimento. Recebi ' + grade.length + '.');
  }
  var cabecalhosDaFonte = grade[0];
  var corpo = grade.slice(1);
  var dePara = Array.isArray(pedido.dePara) && pedido.dePara.length
    ? pedido.dePara : sugerirDeParaDoChat_(cabecalhosDaFonte);

  var destinos = {};
  dePara.forEach(function (par) { if (par && par.paraAColuna) destinos[par.paraAColuna] = true; });
  var faltando = RECC_COLUNAS_DO_CHAT.filter(function (d) {
    return d.obrigatoria && !destinos[d.cabecalho];
  }).map(function (d) { return d.rotulo; });

  var chave = function (linha) {
    return [linha.Data ? Utilities.formatDate(linha.Data, RECC_FUSO_HORARIO, 'yyyy-MM-dd') : '',
      linha.Analista, linha.SUSEP, linha.Corretora, linha.Assunto, linha.Consultor, linha.Ramo]
      .map(normalizarParaComparar_).join('|');
  };
  var jaNaAba = {};
  if (planilhaAtiva_().getSheetByName(RECC_ABA_DO_CHAT)) {
    lerRegistros_(RECC_ABA_DO_CHAT).forEach(function (linha) {
      var data = linha.Data;
      var a = chave({ Data: Object.prototype.toString.call(data) === '[object Date]' ? data : '',
        Analista: linha.Analista, SUSEP: linha.SUSEP, Corretora: linha.Corretora,
        Assunto: linha.Assunto, Consultor: linha.Consultor, Ramo: linha.Ramo });
      jaNaAba[a] = (jaNaAba[a] || 0) + 1;
    });
  }

  var entram = [];
  var motivos = { vazia: 0, repetida: 0, semDataOuAnalista: 0 };
  var tmoQueNaoENumero = 0;
  corpo.forEach(function (bruta) {
    var linha = linhaDaFonteParaOCaso_(bruta, cabecalhosDaFonte, dePara);
    if (!temAlgumValor_(linha)) { motivos.vazia++; return; }
    var data = dataDoAtendimentoDoChat_(linha.Data);
    var analista = String(linha.Analista || '').trim();
    if (!data || !analista) { motivos.semDataOuAnalista++; return; }
    var pronta = { Data: data, Analista: analista };
    RECC_TEXTOS_DO_CHAT.forEach(function (coluna) {
      pronta[coluna] = String(linha[coluna] === undefined || linha[coluna] === null
        ? '' : linha[coluna]).trim();
    });

    var a = chave(pronta);
    if (jaNaAba[a] > 0) { jaNaAba[a]--; motivos.repetida++; return; }
    var tmo = segundosDoTmo_(linha.TMO);
    if (tmo === null) { tmoQueNaoENumero++; tmo = ''; }
    pronta.TMO = tmo;
    entram.push(pronta);
  });

  var conhecidos = {};
  lerRegistros_('USUARIOS').forEach(function (usuario) {
    conhecidos[normalizarParaComparar_(usuario.Nome)] = true;
  });
  var desconhecidos = [];
  entram.forEach(function (linha) {
    var nome = linha.Analista;
    if (!conhecidos[normalizarParaComparar_(nome)] && desconhecidos.indexOf(nome) < 0) {
      desconhecidos.push(nome);
    }
  });

  return { cabecalhosDaFonte: cabecalhosDaFonte, corpo: corpo, dePara: dePara,
    faltando: faltando, entram: entram, motivos: motivos, desconhecidos: desconhecidos,
    tmoQueNaoENumero: tmoQueNaoENumero };
}

function conferirImportacaoDoChat(pedido) {
  exigirPermissao_(RECC_ACOES.IMPORTAR);
  exigirTela_('importacao');
  var montado = linhasDoChatDaFonte_(dadosDaTela_(pedido || {}));
  var pulam = montado.motivos.vazia + montado.motivos.repetida + montado.motivos.semDataOuAnalista;
  return {
    canal: { id: '', nome: 'Atendimentos do chat (Mesa)', aba: RECC_ABA_DO_CHAT },
    cabecalhosDaFonte: montado.cabecalhosDaFonte,
    colunasDoCanal: RECC_COLUNAS_DO_CHAT.map(function (d) { return d.cabecalho; }),
    colunasDeCarimbo: [],
    dePara: montado.dePara,
    linhasNaFonte: montado.corpo.length,
    vaoEntrar: montado.faltando.length ? 0 : montado.entram.length,
    vaoSerPuladas: pulam,
    motivosParaPular: { vazia: montado.motivos.vazia + montado.motivos.semDataOuAnalista,
      repetida: montado.motivos.repetida },
    semDataOuAnalista: montado.motivos.semDataOuAnalista,
    faltando: montado.faltando,
    analistasDesconhecidos: montado.desconhecidos,
    tmoQueNaoENumero: montado.tmoQueNaoENumero,
    limite: RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO,
    passaDoLimite: montado.corpo.length > RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO,
    amostra: montado.entram.slice(0, 3).map(function (linha) {
      var vista = {};
      Object.keys(linha).forEach(function (coluna) {
        vista[coluna] = coluna === 'Data'
          ? Utilities.formatDate(linha.Data, RECC_FUSO_HORARIO, 'dd/MM/yyyy') : linha[coluna];
      });
      return vista;
    }),
    analistas: [],
    foraDaDivisao: [],
    statusPadrao: ''
  };
}

function importarAtendimentosDoChat(pedido) {
  return comEnvioUnico_((pedido || {}).envio, function () {
    return importarAtendimentosDoChatUmaVez_(pedido);
  });
}

function importarAtendimentosDoChatUmaVez_(pedido) {
  exigirPermissao_(RECC_ACOES.IMPORTAR);
  exigirTela_('importacao');
  pedido = dadosDaTela_(pedido || {});
  if (!planilhaAtiva_().getSheetByName(RECC_ABA_DO_CHAT)) {
    throw new Error('A aba ' + RECC_ABA_DO_CHAT + ' ainda não existe nesta planilha. Rode '
      + 'atualizarPGO() no editor do Apps Script.');
  }
  var lote = String(pedido.origem || '').trim();
  if (!lote) {
    throw new Error('Dê um nome ao lote — "Chat de outubro", por exemplo. É por ele que se '
      + 'acha uma leva importada errada.');
  }
  var montado = linhasDoChatDaFonte_(pedido);
  if (montado.corpo.length > RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO) {
    throw new Error('São no máximo ' + RECC_MAXIMO_DE_LINHAS_POR_IMPORTACAO + ' linhas por '
      + 'importação, e vieram ' + montado.corpo.length + '. Divida em levas.');
  }
  if (montado.faltando.length) {
    throw new Error('Diga qual coluna da origem é: ' + montado.faltando.join(' e ')
      + '. Sem a data não há como recortar o período, e sem o analista não há de quem somar.');
  }
  if (!montado.entram.length) {
    throw new Error('Nenhuma linha entraria: ' + montado.motivos.repetida + ' já estão na aba, '
      + montado.motivos.semDataOuAnalista + ' sem data ou sem analista e '
      + montado.motivos.vazia + ' em branco. Nada foi gravado.');
  }
  var agora = new Date();
  var gravados = inserirVariosRegistros_(RECC_ABA_DO_CHAT, montado.entram.map(function (linha) {
    return Object.assign({ Lote: lote, ImportadoEm: agora }, linha);
  }), { origem: RECC_ORIGEM_PLANILHA });
  registrarAuditoria_('chat.importar', RECC_ABA_DO_CHAT, '', lote + ' · ' + gravados.length
    + ' atendimentos');
  return {
    canal: 'Atendimentos do chat (Mesa)',
    origem: lote,
    entraram: gravados.length,
    pulados: { vazia: montado.motivos.vazia + montado.motivos.semDataOuAnalista,
      repetida: montado.motivos.repetida },
    analistas: [],
    analistasDesconhecidos: montado.desconhecidos,
    tmoQueNaoENumero: montado.tmoQueNaoENumero,
    primeiroId: gravados.length ? gravados[0].__id : '',
    ultimoId: gravados.length ? gravados[gravados.length - 1].__id : ''
  };
}

function lerAtendimentosDoChat_() {
  var vazio = { ligado: false, linhas: [], aviso: '', truncada: false, lidas: 0 };
  try {
    if (!planilhaAtiva_().getSheetByName(RECC_ABA_DO_CHAT)) return vazio;
    var teto = linhasQueOPainelOlha_();
    var registros = lerRegistros_(RECC_ABA_DO_CHAT, { ultimas: teto });
    var linhas = registros.map(function (r) {
      return { data: r.Data, analista: String(r.Analista || '').trim(), susep: r.SUSEP,
        corretora: r.Corretora, assunto: r.Assunto, consultor: r.Consultor, ramo: r.Ramo,
        sucursal: r.Sucursal, tabulacao: r['Tabulação'], subassunto: r['Sub assunto'], tmo: r.TMO };
    }).filter(function (linha) { return linha.data || linha.analista; });
    return { ligado: linhas.length > 0, linhas: linhas, aviso: '',
      truncada: registros.length >= teto, lidas: registros.length };
  } catch (erro) {
    return { ligado: true, linhas: [], aviso: erro.message || String(erro), truncada: false, lidas: 0 };
  }
}

function dataDoAtendimentoDoChat_(texto) {
  if (Object.prototype.toString.call(texto) === '[object Date]') {
    return isNaN(texto.getTime()) ? '' : texto;
  }
  var achou = String(texto || '').trim().match(/^(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
  return achou ? converterParaData_(achou[1]) : '';
}

function ramoDoAtendimento_(texto) {
  var bruto = String(texto === null || texto === undefined ? '' : texto).trim();
  if (!bruto) return { chave: '', rotulo: '' };
  var n = normalizarParaComparar_(bruto);
  if (n === 'vi' || n.indexOf('individual') >= 0) return { chave: 'vi', rotulo: 'Vida individual' };
  if (n === 'vg' || n.indexOf('grupo') >= 0) return { chave: 'vg', rotulo: 'Vida em grupo' };
  return { chave: n, rotulo: bruto };
}

function indiceDeCorretorasPorSusep_() {
  var indice = {};
  lerRegistros_('CORRETORAS').forEach(function (linha) {
    var chave = chaveDaSusep_(linha.SUSEP);
    if (!chave) return;
    var atual = indice[chave] || { corretora: '', consultor: '', sucursal: '' };
    if (!atual.corretora) atual.corretora = String(linha.Corretora || '').trim();
    if (!atual.consultor) atual.consultor = String(linha.Consultor || '').trim();
    if (!atual.sucursal) atual.sucursal = String(linha.Sucursal === undefined || linha.Sucursal === null
      ? '' : linha.Sucursal).trim();
    indice[chave] = atual;
  });
  return indice;
}

function atendimentosDaMesa_(casosDoSistema, canal, quem, periodo) {
  if (!canal || canal.aba !== 'BASE_MESA') return null;

  var estrutura = estruturaDaAba_(canal.aba);
  var achar = function (nome) {
    var posicao = posicaoDaColuna_(estrutura, nome);
    return posicao < 0 ? '' : estrutura.cabecalhos[posicao];
  };
  var colunaDoAnalista = colunaDoResponsavel_(estrutura) || 'Analista';
  var colunas = { susep: achar('SUSEP'), corretora: achar('Corretora'),
    assunto: achar('Assunto'), ramo: achar('Ramo') };

  var doChat = lerAtendimentosDoChat_();
  var de = Utilities.formatDate(periodo.de, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
  var ate = Utilities.formatDate(periodo.ate, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
  var semData = 0;
  var doChatNoPeriodo = doChat.linhas.filter(function (linha) {
    var data = dataDoAtendimentoDoChat_(linha.data);
    if (!data) { semData++; return false; }
    var dela = Utilities.formatDate(data, RECC_FUSO_HORARIO, 'yyyy-MM-dd');
    return dela >= de && dela <= ate;
  });
  var comoRegistros = doChatNoPeriodo.map(function (linha) {
    var registro = { __chat: linha };
    registro[colunaDoAnalista] = linha.analista;
    return registro;
  });
  doChatNoPeriodo = alcanceDaProdutividade_(comoRegistros, canal, quem)
    .map(function (registro) { return registro.__chat; });

  var cadastro = indiceDeCorretorasPorSusep_();
  var nomesDosUsuarios = {};
  lerRegistros_('USUARIOS').forEach(function (usuario) {
    var chave = normalizarParaComparar_(usuario.Nome);
    if (chave) nomesDosUsuarios[chave] = String(usuario.Nome).trim();
  });

  var atendimentos = [];
  function acrescentar(origem, bruto) {
    var susep = susepComoSeEscreve_(bruto.susep);
    var doCadastro = susep ? cadastro[chaveDaSusep_(susep)] : null;
    var analista = String(bruto.analista || '').trim();
    var ramo = ramoDoAtendimento_(bruto.ramo);
    atendimentos.push({
      origem: origem,
      analista: [normalizarParaComparar_(analista),
        nomesDosUsuarios[normalizarParaComparar_(analista)] || analista],
      susep: [chaveDaSusep_(susep), susep],

      corretora: (function () {
        var nome = (doCadastro && doCadastro.corretora) || String(bruto.corretora || '').trim();
        return [normalizarParaComparar_(nome), nome];
      })(),
      assunto: [normalizarParaComparar_(bruto.assunto), String(bruto.assunto || '').trim()],
      consultor: (function () {
        var nome = (doCadastro && doCadastro.consultor) || String(bruto.consultor || '').trim();
        return [normalizarParaComparar_(nome), nome];
      })(),

      sucursal: (function () {
        var doChat = String(bruto.sucursal === undefined || bruto.sucursal === null
          ? '' : bruto.sucursal).trim();
        var nome = doChat || (doCadastro && doCadastro.sucursal) || '';
        return [normalizarParaComparar_(nome), nome];
      })(),
      ramo: [ramo.chave, ramo.rotulo]
    });
  }

  casosDoSistema.forEach(function (caso) {
    acrescentar('sistema', {
      analista: caso[colunaDoAnalista],
      susep: colunas.susep ? caso[colunas.susep] : '',
      corretora: colunas.corretora ? caso[colunas.corretora] : '',
      assunto: colunas.assunto ? caso[colunas.assunto] : '',
      ramo: colunas.ramo ? caso[colunas.ramo] : ''
    });
  });
  doChatNoPeriodo.forEach(function (linha) { acrescentar('chat', linha); });

  var ORIGENS = [['todos', null], ['sistema', 'sistema'], ['chat', 'chat']];
  var RAMOS = [['total', null], ['vg', 'vg'], ['vi', 'vi']];
  var visoes = {};
  var padrao = null;
  ORIGENS.forEach(function (origem) {
    RAMOS.forEach(function (ramo) {
      var recorte = atendimentos.filter(function (atendimento) {
        return (!origem[1] || atendimento.origem === origem[1])
          && (!ramo[1] || atendimento.ramo[0] === ramo[1]);
      });
      var daOrigem = function (nome) {
        return recorte.filter(function (atendimento) { return atendimento.origem === nome; }).length;
      };
      var visao = {
        totais: { sistema: daOrigem('sistema'), chat: daOrigem('chat'), total: recorte.length },
        graficos: [
          graficoDeAtendidos_(recorte, 'analista', 'Atendidos por analista', 'Analista',
            'barrasDeitadas', 2, 15, 'Sem analista'),
          graficoDeAtendidos_(recorte, 'corretora', 'Top 5 corretoras', 'Corretora',
            'barrasDeitadas', 1, 5, ''),
          graficoDeAtendidos_(recorte, 'susep', 'Top 5 SUSEPs', 'SUSEP',
            'barrasDeitadas', 1, 5, ''),
          graficoDeAtendidos_(recorte, 'sucursal', 'Top 5 sucursais', 'Sucursal',
            'barrasDeitadas', 1, 5, ''),
          graficoDeAtendidos_(recorte, 'assunto', 'Top 5 assuntos', 'Assunto',
            'barrasDeitadas', 1, 5, ''),
          graficoDeAtendidos_(recorte, 'consultor', 'Top 5 consultores', 'Consultor',
            'barrasDeitadas', 1, 5, '')
        ]
      };

      if (!ramo[1]) {
        visao.graficos.push(graficoDeAtendidos_(recorte, 'ramo', 'Vida individual ou Vida em grupo',
          'Ramo', 'pizza', 1, 6, 'Sem informação'));
      }
      if (origem[0] === 'todos' && ramo[0] === 'total') padrao = visao;
      else visoes[origem[0] + '|' + ramo[0]] = visao;
    });
  });

  return {
    chat: {
      ligado: doChat.ligado,
      aviso: doChat.aviso,
      truncada: doChat.truncada,
      linhasLidas: doChat.lidas,
      semData: semData
    },
    totais: padrao.totais,
    graficos: padrao.graficos,
    visoes: visoes
  };
}

function graficoDeAtendidos_(atendimentos, dimensao, titulo, rotuloDaDimensao, tipo, largura,
  topo, semNome) {
  var baldes = {};
  var ordem = [];
  var semInformacao = 0;

  atendimentos.forEach(function (atendimento) {
    var chave = atendimento[dimensao][0];
    var rotulo = atendimento[dimensao][1];
    if (!chave) {
      if (!semNome) { semInformacao++; return; }
      chave = '__sem';
      rotulo = semNome;
    }
    if (!Object.prototype.hasOwnProperty.call(baldes, chave)) {
      baldes[chave] = { chave: chave, rotulo: rotulo, sistema: 0, chat: 0 };
      ordem.push(chave);
    }
    baldes[chave][atendimento.origem]++;
  });

  var pontos = ordem.map(function (chave) {
    var balde = baldes[chave];
    return { chave: balde.chave, rotulo: balde.rotulo, sistema: balde.sistema, chat: balde.chat,
      valor: balde.sistema + balde.chat, casos: balde.sistema + balde.chat, ehOutros: false };
  }).sort(function (um, outro) {

    if ((um.chave === '__sem') !== (outro.chave === '__sem')) return um.chave === '__sem' ? 1 : -1;
    return outro.valor - um.valor || (um.rotulo < outro.rotulo ? -1 : (um.rotulo > outro.rotulo ? 1 : 0));
  });

  var foraDoTopo = 0;
  if (topo && pontos.length > topo) {
    foraDoTopo = pontos.length - topo;
    pontos = pontos.slice(0, topo);
  }

  pontos = pontos.map(function (ponto, i) {

    return Object.assign(ponto, {
      tom: ponto.ehOutros ? 'neutro' : '',
      serie: tipo === 'pizza' ? (ponto.ehOutros ? 0 : (i % 6) + 1) : 0
    });
  });

  return {
    titulo: titulo,
    tipo: tipo,
    largura: largura,
    dimensao: rotuloDaDimensao,
    medida: 'Atendimentos',
    agregacao: 'contagem',
    unidade: '',
    ehTempo: false,
    pontos: pontos,
    tendencia: null,
    total: pontos.reduce(function (soma, ponto) { return soma + ponto.valor; }, 0),
    foraDoTopo: foraDoTopo,
    semInformacao: semInformacao,
    aviso: ''
  };
}


/* ==== Instalacao.gs ======================================================= */

const RECC_TETO_DE_CELULAS = 10000000;

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
    'Próximo passo: abrir Configurações › Identidade e definir a senha de administrador.'
  ].join('\n');

  Logger.log(laudo);
  return laudo;
}

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

  for (var i = 0; i < esquema.colunas.length; i++) {
    var formato = RECC_FORMATO_DA_CELULA[esquema.colunas[i].tipo] || '@';
    aba.getRange(2, i + 1, esquema.reserva, 1).setNumberFormat(formato);
  }

  return esquema.aba;
}

function semearDadosIniciais_(emailDoInstalador) {
  var contagem = { niveis: 0, cargos: 0, catalogo: 0, canais: 0, campos: 0, config: 0 };

  var niveis = inserirVariosRegistros_('CATALOGO', [

    novoNivelDeAcesso_('Administrador', 1, 'TODOS',
      ['criar', 'editar', 'ocultar', 'exportar', 'importar', 'configurar', 'estrutura'],
      ['trabalho', 'cadastrarCaso', 'buscarCaso',
       'tabelaCorretoras', 'importacao', 'produtividade', 'configuracoes'],
      'CANAL'),

    novoNivelDeAcesso_('Coordenação', 2, 'TODOS',
      ['criar', 'editar', 'ocultar', 'exportar', 'importar'],
      ['trabalho', 'cadastrarCaso', 'buscarCaso',
       'tabelaCorretoras', 'importacao', 'produtividade'],
      'CANAL'),

    novoNivelDeAcesso_('Operação', 3, 'PROPRIOS',
      ['criar', 'editar', 'exportar'],
      ['trabalho', 'cadastrarCaso', 'buscarCaso',
       'tabelaCorretoras', 'produtividade'],
      'EQUIPE'),
    novoNivelDeAcesso_('Consulta', 4, 'TODOS',
      ['exportar'],
      ['trabalho', 'buscarCaso', 'produtividade'],
      'CANAL')
  ]);
  contagem.niveis = niveis.length;
  var idAdministrador = niveis[0]['Id'];

  var cargos = inserirVariosRegistros_('CATALOGO', [
    novoItemDeCatalogo_('CARGO', '', 'Analista RET', 1),
    novoItemDeCatalogo_('CARGO', '', 'Analista Mesa Diamante', 2),
    novoItemDeCatalogo_('CARGO', '', 'ADM', 3),
    novoItemDeCatalogo_('CARGO', '', 'Coordenação', 4),
    novoItemDeCatalogo_('CARGO', '', 'Analista Sênior', 5)
  ]);
  contagem.cargos = cargos.length;
  var idCargoAdm = cargos[2]['Id'];

  var disponibilidades = inserirVariosRegistros_('CATALOGO', [
    novoItemDeCatalogo_('DISPONIBILIDADE', '',
      RECC_DISPONIBILIDADE_QUE_RECEBE, 1, 'bom'),
    novoItemDeCatalogo_('DISPONIBILIDADE', '', 'Férias', 2, 'atencao'),
    novoItemDeCatalogo_('DISPONIBILIDADE', '', 'Afastado', 3, 'atencao')
  ]);
  contagem.disponibilidades = disponibilidades.length;

  var canais = inserirVariosRegistros_('CANAIS', [
    {
      Nome: 'RET',
      Descricao: 'Relacionamento estratégico de clientes',
      Aba: 'BASE_RET',
      ColunaDaData: 'data de recepção do protocolo',
      ColunaDaHora: '',
      ColunaDoStatus: 'status',

      ColunasDaFila: 'Situação: data de recepção do protocolo, status'
        + '; Dados da proposta: Código origem da proposta + número da proposta'
        + ', Num_apolice, produto'
        + '; Dados cadastrais: telefones de contato, nome do cliente, CPF, e-mail'
        + '; Motivo / assunto: motivo do cancelamento'
        + '; Responsável: analista',
      ColunasDaBusca: 'protocolo, CPF, Num_apolice, número da proposta, '
        + 'nome do cliente',
      ColunaDaFinalizacao: 'data da transmissão',
      ColunaDaAreaResponsavel: '',

      ColunaDoValor: 'valor do prêmio',
      SituacoesDestacadas: 'Retido, Não retido, Sem sucesso de contato',

      ConfereSusepBloqueada: true,

      SlaHorasUteis: 0,
      InicioDoExpediente: '',
      FimDoExpediente: '',
      ColunaDaPrimeiraResposta: '',
      ColunaDaHoraDaPrimeiraResposta: '',
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
        + '; Dados do caso: Título do e-mail, Ramo, Assunto'
        + '; Dados cadastrais: Nome do segurado, Documento (CPF)'
        + '; Corretora: Corretora, SUSEP'
        + '; Responsável: Analista',
      ColunasDaBusca: 'Nome do segurado, Documento (CPF), SUSEP, Corretora',
      ColunaDaFinalizacao: 'Data da finalização',
      ColunaDaAreaResponsavel: 'Área responsável',

      ColunaDoValor: '',
      SituacoesDestacadas: '',

      ConfereSusepBloqueada: false,

      SlaHorasUteis: 6,
      InicioDoExpediente: '08:15',
      FimDoExpediente: '18:30',
      ColunaDaPrimeiraResposta: 'Data resposta',
      ColunaDaHoraDaPrimeiraResposta: 'Hora resposta',
      Icone: 'diamante',
      Ordem: 2,
      Ativo: true
    },

    {
      Nome: 'VG',
      Descricao: 'Vida em Grupo',
      Aba: 'BASE_VG',
      ColunaDaData: 'Data do protocolo da solicitação',
      ColunaDaHora: '',
      ColunaDoStatus: 'Status',

      ColunasDaFila: 'Situação: Data do protocolo da solicitação, Status'
        + '; Vigência: Meses de vigência, Início da vigência'
        + '; Cliente: CNPJ, Subestipulante, Quantidade de vidas'
        + '; Financeiro: Prêmio mensal, Margem de contribuição'
        + '; Responsável: Analista',
      ColunasDaBusca: 'CNPJ, Subestipulante, SUSEP, TK/Assunto',

      ColunaDaFinalizacao: '',
      ColunaDaAreaResponsavel: '',

      ColunaDoValor: '',
      SituacoesDestacadas: '',

      ConfereSusepBloqueada: true,
      SlaHorasUteis: 0,
      InicioDoExpediente: '',
      FimDoExpediente: '',
      ColunaDaPrimeiraResposta: '',
      ColunaDaHoraDaPrimeiraResposta: '',
      Icone: 'grupo',
      Ordem: 3,
      Ativo: true
    }
  ]);
  contagem.canais = canais.length;
  var idRet = canais[0]['Id'];
  var idCanal = canais[1]['Id'];
  var idVg = canais[2]['Id'];

  contagem.sinalizadores = inserirVariosRegistros_('SINALIZADORES',
    sinalizadoresDeFabrica_(idRet, idCanal, idVg)).length;

  var itens = [];

  [['Não trabalhado', 'ruim', ''],
   ['Aguardando transmissão', 'destaque', 'Data aguardando transmissão'],
   ['Pendente', 'atencao', 'Data pendente'],
   ['1º contato realizado', 'violeta', 'Data do 1º contato'],
   ['2º contato realizado', 'violeta', 'Data do 2º contato'],
   ['Não retido', 'ruim', 'Data não reteve', true],
   ['Retido', 'bom', 'Data reteve', true],
   ['Sem sucesso de contato', 'atencao', '', true],
   ['Cancelado', 'ruim', '', true],
   ['Pago', 'bom', '', true]].forEach(function (linha, i) {
    itens.push(novoItemDeCatalogo_('STATUS', idRet, linha[0], i + 1, linha[1],
      linha[2], linha[3]));
  });

  [['Em andamento', 'atencao', RECC_COLUNA_DATA_EM_ANDAMENTO],
   ['Concluído', 'bom', 'Data da finalização', true],
   ['Concluído na mesa', 'destaque', 'Data da finalização', true],
   ['Sem retorno', 'atencao', '', true]].forEach(function (linha, i) {
    itens.push(novoItemDeCatalogo_('STATUS', idCanal, linha[0], i + 1, linha[1],
      linha[2], linha[3]));
  });

  [['Aguardando', 'atencao', ''],
   ['Reativado', 'bom', ''],
   ['Retido', 'bom', ''],
   ['Pago', 'destaque', ''],
   ['Negado', 'ruim', ''],
   ['Cancelado', 'ruim', '']].forEach(function (trio, i) {
    itens.push(novoItemDeCatalogo_('STATUS', idVg, trio[0], i + 1, trio[1], trio[2]));
  });

  ['Diamante', 'Demais corretoras', 'Não encontrado'].forEach(function (nome, i) {
    itens.push(novoItemDeCatalogo_('SEGMENTO', '', nome, i + 1));
  });

  var listasGlobais = {

    CANAL_ORIGEM: ['URA', 'Central', 'Base de Inadimplentes',
      'Piloto Formulário - Cancelamento'],

    CANAL: ['Chat', 'Retorno | chat', 'E-mail'],
    TIPO: ['Consultas', 'Problemas', 'Solicitações'],
    RAMO: ['Vida em grupo', 'Vida individual'],
    ASSUNTO: ['Cancelamento', 'Cobrança', 'Alteração cadastral', 'Sinistro',
      'Segunda via', 'Outros'],
    AREA: ['Subscrição', 'Sinistro', 'Cobrança', 'Comercial', 'Jurídico'],
    MOTIVO: ['Aumento do prêmio na renovação', 'Dificuldade financeira',
      'Portabilidade', 'Proposta de concorrente', 'Insatisfação com atendimento',
      'Coberturas', 'Outros'],

    FORMA_PAGAMENTO: ['ADC - TODAS PARCELAS', 'Boleto', 'Débito em conta',
      'Cartão de crédito', 'PIX'],

    TENTATIVA: ['1ª tentativa', '2ª tentativa', '3ª tentativa',
      'Contato efetivado', 'Sem contato'],

    PRODUTO: ['1101 - VIDA INDIVIDUAL', '1102 - VIDA EM GRUPO',
      '1103 - PRESTAMISTA', '1104 - ACIDENTES PESSOAIS'],
    ORIGEM: ['Base de inadimplência', 'Central: Pessoa', 'URA', 'Site', 'Chat',
      'Telefone', 'Corretora'],

    MOVIMENTACAO: ['MOVSINT', 'MOVESEG'],

    PERIODICIDADE: ['Mensal', 'Trimestral', 'Semestral', 'Anual'],

    LEAD: ['Banguela', 'Reativação', 'Inadimplência', 'Renovação', 'Cobrança']
  };
  Object.keys(listasGlobais).forEach(function (tipo) {
    listasGlobais[tipo].forEach(function (nome, i) {
      itens.push(novoItemDeCatalogo_(tipo, '', nome, i + 1));
    });
  });
  contagem.catalogo = inserirVariosRegistros_('CATALOGO', itens).length +
    contagem.niveis + contagem.cargos;

  contagem.paineis = inserirVariosRegistros_('PAINEIS',
    cartoesIniciaisDoPainel_(idRet, idCanal)).length;

  contagem.analises = inserirVariosRegistros_('ANALISES', [
    { Nome: 'RET', Descricao: 'Tudo da RET dos últimos 90 dias',
      CanalId: idRet, Colunas: '', Filtros: '', Dias: 90, Ordem: 1, Ativo: true },
    { Nome: 'Diamante',
      Descricao: 'Casos da Mesa Diamante dos últimos 90 dias',
      CanalId: idCanal, Colunas: '', Filtros: '', Dias: 90, Ordem: 2, Ativo: true }
  ]).length;

  var campos = []
    .concat(camposDoFormularioDaBase_('BASE_RET', idRet))
    .concat(camposDoFormularioDaBase_('BASE_MESA', idCanal))
    .concat(camposDoFormularioDaBase_('BASE_VG', idVg));
  contagem.campos = inserirVariosRegistros_('CAMPOS', campos).length;

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

    novaConfiguracao_('MENU.TITULOS', JSON.stringify(
      RECC_TELAS_DO_SISTEMA.reduce(function (mapa, item) {
        mapa[item.tela] = item.titulo;
        return mapa;
      }, {})
    ), 'Nome de cada tela no menu lateral. Editável em '
      + 'Configurações › Identidade.')
  ]);
  contagem.config = config.length;

  inserirVariosRegistros_('USUARIOS', [{
    Nome: emailDoInstalador.split('@')[0],
    Email: emailDoInstalador,
    CargoId: idCargoAdm,
    NivelAcessoId: idAdministrador,
    Ativo: true,
    DataCadastro: new Date(),
    UltimoAcesso: ''
  }]);

  return contagem;
}

function novoNivelDeAcesso_(nome, ordem, escopo, acoes, telas, naProdutividade) {
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

      escopoNaProdutividade: naProdutividade || 'EQUIPE',
      campos: {},
      widgets: {}
    })
  };
}

function cartoesIniciaisDoPainel_(idRet, idCanal) {
  var cartoes = [];

  function novoCartao(canalId, titulo, dimensao, filtro, cor, ordem, tela) {
    return {
      Tela: tela || 'trabalho',
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

  cartoes.push(novoCartao(idRet, 'Total de casos', 'total', '', 'destaque', 1));
  [['Aguardando transmissão', 'destaque'], ['Pendente', 'atencao'],
   ['1º contato realizado', 'violeta'], ['2º contato realizado', 'violeta'],
   ['Não trabalhado', 'ruim']].forEach(function (par, i) {
    cartoes.push(novoCartao(idRet, par[0], 'situacao', par[0], par[1], i + 2));
  });

  cartoes.push(novoCartao(idCanal, 'Total de casos', 'total', '', 'destaque', 1));
  cartoes.push(novoCartao(idCanal, 'Em andamento', 'situacao', 'Em andamento', 'atencao', 2));
  cartoes.push(novoCartao(idCanal, 'Concluído', 'situacao', 'Concluído', 'bom', 3));

  cartoes.push(novoCartao(idCanal, 'Finalizados na célula', 'naCelula', '', 'bom', 4));

  function cartaoDaProdutividade(canalId, titulo, dimensao, filtro, cor, ordem) {
    return novoCartao(canalId, titulo, dimensao, filtro, cor, ordem,
      'produtividade');
  }

  cartoes.push(cartaoDaProdutividade(idRet, 'Casos cadastrados', 'total', '', 'destaque', 1));
  cartoes.push(cartaoDaProdutividade(idRet, 'Retido', 'situacao', 'Retido', 'bom', 2));
  cartoes.push(cartaoDaProdutividade(idRet, 'Não retido', 'situacao', 'Não retido', 'ruim', 3));
  cartoes.push(cartaoDaProdutividade(idRet, 'Já contatados', 'preenchido',
    'Data do 1º contato', 'violeta', 4));
  cartoes.push(cartaoDaProdutividade(idRet, 'Com 2º contato', 'preenchido',
    'Data do 2º contato', 'violeta', 5));
  cartoes.push(cartaoDaProdutividade(idRet, 'Pendentes', 'situacao', 'Pendente', 'atencao', 6));
  cartoes.push(cartaoDaProdutividade(idRet, 'Não trabalhados', 'situacao',
    'Não trabalhado', 'ruim', 7));

  cartoes.push(cartaoDaProdutividade(idCanal, 'Casos cadastrados', 'total', '', 'destaque', 1));
  cartoes.push(cartaoDaProdutividade(idCanal, 'Concluídos', 'situacao', 'Concluído', 'bom', 2));
  cartoes.push(cartaoDaProdutividade(idCanal, 'Concluídos na mesa', 'situacao',
    'Concluído na mesa', 'bom', 3));
  cartoes.push(cartaoDaProdutividade(idCanal, 'Em andamento', 'situacao',
    'Em andamento', 'atencao', 4));

  function novoGrafico(canalId, titulo, tipo, dimensao, agregacao, medida,
    limite, largura, ordem) {
    return {
      Tela: 'produtividade', CanalId: canalId, Titulo: titulo,
      TipoWidget: tipo, CampoDimensao: dimensao, CampoMedida: medida || '',
      Agregacao: agregacao, Limite: limite || 0, Filtro: '',
      Ordem: ordem, Largura: largura, Cor: '', VisivelPara: '', Ativo: true
    };
  }

  cartoes.push(novoGrafico(idRet, 'Entradas por dia, e a tendência',
    'barrasComLinha', 'data de recepção do protocolo', 'contagem', '', 0, 2, 1));

  cartoes.push(novoGrafico(idRet, 'Situação dos casos',
    'pizza', 'status', 'contagem', '', 6, 1, 2));

  cartoes.push(novoGrafico(idRet, 'Por que pediram o cancelamento',
    'barrasDeitadas', 'motivo do cancelamento', 'contagem', '', 6, 1, 3));
  cartoes.push(novoGrafico(idRet, 'Prêmio retido por produto',
    'barras', 'produto', 'soma', 'valor do prêmio retido', 6, 1, 4));
  cartoes.push(novoGrafico(idRet, 'Casos por canal de entrada',
    'barras', 'canal', 'contagem', '', 6, 1, 5));

  cartoes.push(novoGrafico(idRet, 'Casos por analista',
    'barrasDeitadas', 'analista', 'contagem', '', 6, 1, 6));

  cartoes.push(novoGrafico(idRet, 'Casos importados por dia',
    'barrasComLinha', 'Data da importação', 'contagem', '', 0, 2, 7));
  cartoes.push(novoGrafico(idRet, 'De qual base os casos vieram',
    'barrasDeitadas', 'Origem da importação', 'contagem', '', 6, 1, 8));

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

  cartoes.push(novoGrafico(idCanal, 'Casos importados por dia',
    'barrasComLinha', 'Data da importação', 'contagem', '', 0, 2, 6));
  cartoes.push(novoGrafico(idCanal, 'De qual base os casos vieram',
    'barrasDeitadas', 'Origem da importação', 'contagem', '', 6, 1, 7));

  return cartoes;
}

function novoItemDeCatalogo_(tipo, canalId, nome, ordem, cor, colunaDeCarimbo, ehFinal) {
  var item = {
    CanalId: canalId,
    Tipo: tipo,
    Codigo: '',
    Nome: nome,
    Rotulo: nome,
    PaiId: '',
    Cor: cor || '',

    ColunaDeCarimbo: colunaDeCarimbo || '',
    Ordem: ordem,
    Ativo: true,
    Configuracao: ''
  };

  if (ehFinal) item.Final = true;
  return item;
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

const RECC_PADRAO_DO_FORMULARIO = {

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

  nomedocliente: { secao: 'Cliente', ordem: 10, rotulo: 'Nome do cliente',
    obrigatorio: true, largura: 2 },
  cpf: { secao: 'Cliente', ordem: 11, rotulo: 'CPF', tipoCampo: 'documento',
    mascara: '000.000.000-00' },
  telefonesdecontato: { secao: 'Cliente', ordem: 12,
    rotulo: 'Telefone de contato', tipoCampo: 'telefone' },
  email: { secao: 'Cliente', ordem: 13, rotulo: 'E-mail', tipoCampo: 'email' },

  codigoorigemdaproposta: { secao: 'Seguro', ordem: 20,
    rotulo: 'Código origem da proposta', ativo: false },
  numerodaproposta: { secao: 'Seguro', ordem: 21, rotulo: 'Número da proposta',
    tipoCampo: 'texto', largura: 2,
    descricao: 'Com o hífen, como está na proposta: 7-0000000 ou 58-0000000. '
      + 'O código e o número vão para colunas separadas na planilha.',
    partirEm: {
      colunas: ['Código origem da proposta', 'número da proposta'],
      exemplo: '7-0000000'
    } },

  codproduto: { secao: 'Seguro', ordem: 22, rotulo: 'Cód. do produto e produto',
    tipoCampo: 'seletor', catalogo: 'PRODUTO', largura: 2,
    separaEm: { codigo: 'cod produto', nome: 'produto' } },
  produto: { secao: 'Seguro', ordem: 23, ativo: false },

  codsucursal: { secao: 'Seguro', ordem: 24, rotulo: 'Cod_sucursal',
    ativo: false },
  codramo: { secao: 'Seguro', ordem: 25, rotulo: 'Cod_ramo', ativo: false },

  numapolice: { secao: 'Seguro', ordem: 26, rotulo: 'Apólice',
    tipoCampo: 'texto', largura: 2,
    descricao: 'Com os dois hífens, como está na apólice: 12-1391-0000000. '
      + 'A sucursal, o ramo e o número vão para colunas separadas.',
    partirEm: {
      colunas: ['cod_sucursal', 'cod_ramo', 'Num_apolice'],
      exemplo: '12-1391-0000000'
    } },
  valordopremio: { secao: 'Seguro', ordem: 27, rotulo: 'Valor do prêmio anual' },
  premiomensal: { secao: 'Seguro', ordem: 28,
    rotulo: 'Valor do prêmio mensal' },

  valordopremioretido: { secao: 'Seguro', ordem: 29,
    rotulo: 'Valor do prêmio retido',
    obrigatorioSe: { campo: 'status', valores: ['Retido'] } },
  formadepagamento: { secao: 'Seguro', ordem: 30, rotulo: 'Forma de pagamento',
    tipoCampo: 'seletor', catalogo: 'FORMA_PAGAMENTO' },
  dadosdopagamento: { secao: 'Seguro', ordem: 31, rotulo: 'Dados de pagamento',
    mostrarSe: { campo: 'formadepagamento', valor: 'ADC - TODAS PARCELAS' } },

  susep: { secao: 'Corretora', ordem: 40, rotulo: 'SUSEP', tipoCampo: 'texto',
    descricao: 'Letras e números, como a SUSEP é escrita — por exemplo RET00J.' },
  segmento: { secao: 'Corretora', ordem: 41, rotulo: 'Segmento',
    tipoCampo: 'seletor', catalogo: 'SEGMENTO' },

  motivodocancelamento: { secao: 'Situação', ordem: 50,
    rotulo: 'Motivo do cancelamento', tipoCampo: 'seletor', catalogo: 'MOTIVO' },

  status: { secao: 'Situação', ordem: 51, rotulo: 'Status', tipoCampo: 'seletor',
    catalogo: 'STATUS', obrigatorio: true, valorPadrao: 'Não trabalhado' },
  tentativasdecontato: { secao: 'Situação', ordem: 52,
    rotulo: 'Tentativas de contato', tipoCampo: 'seletor', catalogo: 'TENTATIVA' },
  datadatransmissao: { secao: 'Situação', ordem: 53,
    rotulo: 'Data da transmissão' },

  novocodorigemproposta: { secao: 'Situação', ordem: 54,
    rotulo: 'Cód. origem da nova proposta', ativo: false },
  novonumerodaproposta: { secao: 'Situação', ordem: 55,
    rotulo: 'Nova proposta', tipoCampo: 'texto', largura: 2,
    descricao: 'Mesma regra da proposta, com o hífen: 7-0000000.',
    partirEm: {
      colunas: ['Novo cod origem proposta', 'novo numero da proposta'],
      exemplo: '7-0000000'
    } },

  sistema: { secao: 'Outros', ordem: 91 },
  contato: { secao: 'Outros', ordem: 94 },
  descricao: { secao: 'Outros', ordem: 95, largura: 3 },

  datadeentrada: { secao: 'Caso', ordem: 1,
    rotulo: 'Data de recepção do caso', valorPadrao: '@HOJE' },
  horario: { secao: 'Caso', ordem: 2, rotulo: 'Horário de recepção' },
  titulodoemail: { secao: 'Caso', ordem: 4, rotulo: 'Título do e-mail',
    largura: 2 },
  assunto: { secao: 'Caso', ordem: 5, tipoCampo: 'seletor',
    catalogo: 'ASSUNTO', largura: 2 },

  aberturaindevida: { secao: 'Situação', ordem: 13,
    rotulo: 'Abertura indevida?' },

  nomedosegurado: { secao: 'Cliente', ordem: 20, rotulo: 'Nome',
    obrigatorio: true, largura: 2 },

  documentocpf: { secao: 'Cliente', ordem: 21, rotulo: 'CPF ou CNPJ',
    tipoCampo: 'documento', mascara: '000.000.000-00|00.000.000/0000-00' },

  corretora: { secao: 'Corretora', ordem: 31, rotulo: 'Nome da corretora' },
  ramo: { secao: 'Corretora', ordem: 32, tipoCampo: 'seletor', catalogo: 'RAMO' },

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

const RECC_PADRAO_POR_ABA = {

  BASE_VG: {
    datadoprotocolodasolicitacao: { secao: 'Caso', ordem: 1,
      rotulo: 'Data do protocolo da solicitação', obrigatorio: true,
      valorPadrao: '@HOJE' },
    analista: { secao: 'Caso', ordem: 2, tipoCampo: 'seletor',
      listaDe: 'usuarios', valorPadrao: '@EU', travaPara: ['Analista'] },
    tkassunto: { secao: 'Caso', ordem: 3, rotulo: 'TK/Assunto' },
    entrada: { secao: 'Caso', ordem: 4, rotulo: 'Entrada' },
    lead: { secao: 'Caso', ordem: 5, tipoCampo: 'seletor', catalogo: 'LEAD' },

    cnpj: { secao: 'Cliente', ordem: 10, rotulo: 'CNPJ' },
    subestipulante: { secao: 'Cliente', ordem: 11 },
    susep: { secao: 'Cliente', ordem: 12, rotulo: 'SUSEP', tipoCampo: 'texto' },
    quantidadedevidas: { secao: 'Cliente', ordem: 13 },

    iniciodavigencia: { secao: 'Vigência', ordem: 20,
      rotulo: 'Início da vigência', aceitaFuturo: true },
    movsintmoveseg: { secao: 'Vigência', ordem: 21, rotulo: 'MOVSINT/MOVESEG',
      tipoCampo: 'seletor', catalogo: 'MOVIMENTACAO' },
    periodicidade: { secao: 'Vigência', ordem: 22,
      rotulo: 'Mensal/anual', tipoCampo: 'seletor', catalogo: 'PERIODICIDADE' },

    status: { secao: 'Situação', ordem: 30, tipoCampo: 'seletor',
      catalogo: 'STATUS', obrigatorio: true, valorPadrao: 'Aguardando' },
    motivodaliberacaoourecusa: { secao: 'Situação', ordem: 31,
      rotulo: 'Motivo da liberação ou recusa' },

    premiomensal: { secao: 'Financeiro', ordem: 40, rotulo: 'Prêmio mensal' },
    premioanual: { secao: 'Financeiro', ordem: 41, rotulo: 'Prêmio anual' },

    margemdecontribuicao: { secao: 'Financeiro', ordem: 42,
      rotulo: 'Margem de contribuição (%)' },
    quantidadedeparcelasvencidas: { secao: 'Financeiro', ordem: 43 },

    meseano: { secao: 'Outros', ordem: 50, rotulo: 'Mês e ano' },
    obs: { secao: 'Outros', ordem: 51, rotulo: 'Obs' }
  },

  BASE_MESA: {
    analista: { secao: 'Caso', ordem: 3, tipoCampo: 'seletor',
      listaDe: 'usuarios', valorPadrao: '@EU', travaPara: ['Analista'] },
    status: { secao: 'Situação', ordem: 10, tipoCampo: 'seletor',
      catalogo: 'STATUS', obrigatorio: true, valorPadrao: 'Em andamento' },
    canal: { secao: 'Situação', ordem: 11, rotulo: 'Canal de origem',
      tipoCampo: 'seletor', catalogo: 'CANAL' },
    tipo: { secao: 'Situação', ordem: 12, tipoCampo: 'seletor',
      catalogo: 'TIPO' },
    susep: { secao: 'Corretora', ordem: 30, rotulo: 'SUSEP', tipoCampo: 'texto' }
  }
};

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

    var padrao = daAba[chave] || RECC_PADRAO_DO_FORMULARIO[chave] || {};

    var configuracao = {};
    if (padrao.catalogo) configuracao.catalogo = padrao.catalogo;
    if (padrao.listaDe) configuracao.listaDe = padrao.listaDe;
    if (padrao.largura) configuracao.largura = padrao.largura;
    if (padrao.mostrarSe) configuracao.mostrarSe = padrao.mostrarSe;
    if (padrao.obrigatorioSe) configuracao.obrigatorioSe = padrao.obrigatorioSe;
    if (padrao.travaPara) configuracao.travaPara = padrao.travaPara;
    if (padrao.separaEm) configuracao.separaEm = padrao.separaEm;
    if (padrao.partirEm) configuracao.partirEm = padrao.partirEm;
    if (padrao.aceitaFuturo) configuracao.aceitaFuturo = true;

    campos.push({
      CanalId: canalId,
      Aba: nomeDaAba,
      ChaveTecnica: chave,
      Cabecalho: coluna.cabecalho,

      Rotulo: padrao.rotulo || coluna.cabecalho,

      Descricao: padrao.descricao || '',
      TipoCampo: padrao.tipoCampo || RECC_DO_DADO_PARA_O_CAMPO[coluna.tipo] || 'texto',
      Secao: padrao.secao || (quemPreencheEhOSistema ? 'Preenchido pelo sistema' : 'Outros'),
      Mascara: padrao.mascara || '',
      Obrigatorio: padrao.obrigatorio === true,
      Protegido: coluna.protegido === true,
      Ativo: !ehId && !quemPreencheEhOSistema && padrao.ativo !== false,

      Ordem: padrao.ordem || (semLugarNaLista++),
      VisivelPara: '',
      ValorPadrao: padrao.valorPadrao || '',
      Configuracao: Object.keys(configuracao).length ? JSON.stringify(configuracao) : ''
    });
  });

  return campos;
}

function atualizarPGO() {
  exigirPortaDoEditor_('atualizarPGO');
  var feito = [];
  var pulados = [];
  var paraVoce = [];

  var fusoDoProjeto = fusoDoProjeto_();
  if (fusoDoProjeto && fusoDoProjeto !== RECC_FUSO_HORARIO) {
    paraVoce.push('O projeto do Apps Script está no fuso "' + fusoDoProjeto + '", e não em "'
      + RECC_FUSO_HORARIO + '": toda data digitada recua um dia. '
      + RECC_COMO_ACERTAR_O_FUSO_DO_PROJETO);
  }

  esquecerCacheDaConfiguracao_();

  var daFila = descarregarAFilaDaAuditoria_(10000);
  if (daFila) feito.push(daFila + ' registro(s) da fila da auditoria gravados na aba AUDITORIA');

  var deCanais = migrarParaCanais_();
  feito = feito.concat(deCanais.feito);
  pulados = pulados.concat(deCanais.pulados);

  [['CANAIS', 'ColunaDoValor', 'texto'],
   ['CANAIS', 'SituacoesDestacadas', 'textoLongo'],
   ['CANAIS', 'ConfereSusepBloqueada', 'simOuNao'],

   ['CANAIS', 'SlaHorasUteis', 'numero'],
   ['CANAIS', 'InicioDoExpediente', 'texto'],
   ['CANAIS', 'FimDoExpediente', 'texto'],
   ['CANAIS', 'ColunaDaPrimeiraResposta', 'texto'],
   ['CANAIS', 'ColunaDaHoraDaPrimeiraResposta', 'texto']].forEach(function (trio) {
    var aba = planilhaAtiva_().getSheetByName(trio[0]);
    if (!aba) { pulados.push('aba ' + trio[0] + ' não existe'); return; }
    if (posicaoDaColuna_(estruturaDaAba_(trio[0]), trio[1]) >= 0) {
      pulados.push(trio[0] + '.' + trio[1] + ' já existe');
      return;
    }
    adicionarColuna_(trio[0], trio[1], trio[2]);
    feito.push(trio[0] + '.' + trio[1] + ' criada');
  });

  esquecerEstruturaLida_();

  feito = feito.concat(criarColunasDoContrato_('CATALOGO', pulados));
  feito = feito.concat(ligarOValorPorSituacaoDaRet_(pulados));
  feito = feito.concat(tirarAConferenciaDeBloqueioDaMesa_(pulados));
  feito = feito.concat(criarOStatusSemSucesso_(pulados));
  feito = feito.concat(aplicarOsStatusDoPO_(pulados, paraVoce));
  feito = feito.concat(ligarAPropostaEAApoliceEmPedacos_(pulados));
  feito = feito.concat(ajustarAsColunasDaFila_(pulados, paraVoce));
  feito = feito.concat(aceitarCnpjNaMesa_(pulados, paraVoce));
  feito = feito.concat(ligarOSlaDaMesa_(pulados));

  feito = feito.concat(criarColunasDoContrato_('CORRETORAS', pulados));
  feito = feito.concat(criarColunasDoContrato_('SUSEP_BLOQUEADAS', pulados));

  feito = feito.concat(ligarOCanalDeQuemJaEstaCadastrado_(pulados, paraVoce));

  feito = feito.concat(criarColunasDoContrato_('USUARIOS', pulados));
  feito = feito.concat(criarAListaDeDisponibilidade_(pulados));
  feito = feito.concat(avisarQuemPodeFicarSemLote_(canaisSemAnalista_(), paraVoce));

  feito = feito.concat(apagarAAbaDeProdutos_(pulados, paraVoce));

  feito = feito.concat(limparCamposSemCanal_(pulados));

  feito = feito.concat(criarOsSinalizadores_(pulados));
  feito = feito.concat(criarColunasDoContrato_('SINALIZADORES', pulados));
  feito = feito.concat(criarOCarimboDoEncaminhamento_(pulados));

  feito = feito.concat(criarUmaColunaDoSistema_('BASE_MESA', RECC_COLUNA_DATA_EM_ANDAMENTO,
    'o sistema carimba quando o caso entra em Em andamento', pulados));
  feito = feito.concat(ligarOPrazoDaMesaAoEmAndamento_(pulados, paraVoce));

  feito = feito.concat(criarUmaColunaDoSistema_('BASE_RET', RECC_COLUNA_DATA_DO_STATUS_PROPOSTA,
    'o sistema carimba quando o Status proposta encerra o prazo', pulados));
  feito = feito.concat(ligarAParadaDoRetido_(pulados, paraVoce));

  feito = feito.concat(criarUmaColunaDoSistema_('BASE_RET',
    RECC_COLUNA_DATA_DA_PRIMEIRA_MUDANCA_DE_STATUS,
    'o sistema carimba quando o caso sai de "Não trabalhado"', pulados));
  feito = feito.concat(ligarOPrazoDaRetAPrimeiraMudanca_(pulados, paraVoce));

  feito = feito.concat(renomearOPremioMensalDaRet_(pulados, paraVoce));

  feito = feito.concat(ligarOValorRetidoNoRetido_(pulados, paraVoce));

  feito = feito.concat(criarAAbaDoChat_(pulados, paraVoce));

  feito = feito.concat(tirarOCarimboDasBasesDeCaso_(pulados, paraVoce));

  [['BASE_RET', RECC_COLUNAS_QUE_SAIRAM_DA_RET,
    'Não estavam em uso, a seu pedido (Etapa 49); o campo saiu do formulário.'],
   ['CANAIS', ['MetaMensalPorPessoa'],
    'Só a Minha Performance a lia, e a tela saiu do sistema (Etapa 52).'],
   ['USUARIOS', ['Matricula', 'Canal que atende'],
    'A equipe agora é o CANAL: quem atende o mesmo canal aparece junto, e o '
    + 'canal já está na coluna CanalId.'],
   ['CORRETORAS', ['Nome', 'Canal'],
    'O cadastro agora é SUSEP, Corretora, Sucursal, Segmento e Consultor — '
    + '"Nome" duplicava "Corretora", e o canal não é da corretora.'],
   ['SUSEP_BLOQUEADAS', ['Motivo', 'CpfReincidente'],
    'O bloqueio agora pede SUSEP, Corretora, Sucursal e Coordenador '
    + 'comercial.']
  ].forEach(function (trio) {
    if (!planilhaAtiva_().getSheetByName(trio[0])) return;
    var estrutura = estruturaDaAba_(trio[0]);
    trio[1].forEach(function (cabecalho) {
      if (posicaoDaColuna_(estrutura, cabecalho) < 0) return;
      paraVoce.push(trio[0] + '."' + cabecalho + '" saiu do contrato e continua '
        + 'na planilha, com o que estava nela. ' + trio[2]
        + ' Apague a coluna na planilha quando quiser.');
    });
  });

  [['FERIADOS', 'A meta voltou a contar dias corridos, a seu pedido.'],
   ['AUSENCIAS', 'O calendário saiu do sistema pelas regras de negócio, a seu '
     + 'pedido: nada mais é descontado por ausência.']
  ].forEach(function (par) {
    if (!planilhaAtiva_().getSheetByName(par[0])) return;
    paraVoce.push('A aba ' + par[0] + ' saiu do sistema e continua aí, intacta. '
      + par[1] + ' Apague a aba quando quiser.');
  });

  feito = feito.concat(montarOsCardsDaRet_(pulados, paraVoce));

  feito = feito.concat(tirarDoFormularioOQueSaiuDaRet_(pulados));

  feito = feito.concat(tirarAMinhaPerformanceDosNiveis_(pulados));

  esquecerCacheDaConfiguracao_();
  var recado = laudoDaAtualizacao_('ATUALIZAÇÃO DO PGO', feito, pulados, paraVoce);
  Logger.log(recado);
  return recado;
}

function exigirPortaDoEditor_(nomeDaFuncao) {
  var quemChama = emailParaComparar_(Session.getActiveUser().getEmail());
  var quemExecuta = emailParaComparar_(Session.getEffectiveUser().getEmail());
  if (quemChama && quemChama === quemExecuta) return true;

  var quem = usuarioAtual_();
  if (quem.cadastrado && podeFazer_(quem.permissoes, RECC_ACOES.ESTRUTURA)) return true;
  throw new Error(nomeDaFuncao + '() é para o editor do Apps Script: rode por '
    + 'lá, ou peça a um administrador.');
}

function tirarOCarimboDasBasesDeCaso_(pulados, paraVoce) {
  var feito = [];
  if (!planilhaAtiva_().getSheetByName('CANAIS')) {
    pulados.push('aba CANAIS não existe');
    return feito;
  }
  var abas = [];
  lerRegistros_('CANAIS').forEach(function (canal) {
    var aba = String(canal.Aba || '').trim();
    if (aba && abas.indexOf(aba) < 0 && planilhaAtiva_().getSheetByName(aba)) abas.push(aba);
  });

  abas.forEach(function (aba) {
    RECC_CARIMBO_DE_EXCLUSAO.forEach(function (cabecalho) {
      esquecerEstruturaLida_(aba);
      if (posicaoDaColuna_(estruturaDaAba_(aba, true), cabecalho) < 0) {
        pulados.push(aba + '.' + cabecalho + ' já não existe');
        return;
      }
      var preenchidas = lerColunaInteira_(aba, cabecalho).filter(function (valor) {
        return String(valor === null || valor === undefined ? '' : valor).trim() !== '';
      }).length;
      if (preenchidas) {
        paraVoce.push(aba + '."' + cabecalho + '" tem ' + preenchidas + ' linha(s) '
          + 'preenchida(s) — casos ocultados antes da exclusão definitiva — e por '
          + 'isso ficou. Apague a coluna na planilha quando decidir.');
        return;
      }
      removerColuna_(aba, cabecalho);
      feito.push(aba + '.' + cabecalho + ' removida (estava vazia)');
    });
  });
  return feito;
}

function criarColunasDoContrato_(nomeDaAba, pulados) {
  var feito = [];
  var esquema = RECC_ESQUEMA[nomeDaAba];
  if (!esquema) {
    pulados.push(nomeDaAba + ' não está no contrato');
    return feito;
  }
  if (!planilhaAtiva_().getSheetByName(nomeDaAba)) {
    pulados.push('aba ' + nomeDaAba + ' não existe');
    return feito;
  }

  esquecerEstruturaLida_(nomeDaAba);
  esquema.colunas.forEach(function (coluna) {
    var estrutura = estruturaDaAba_(nomeDaAba, true);
    if (posicaoDaColuna_(estrutura, coluna.cabecalho) >= 0) {
      pulados.push(nomeDaAba + '.' + coluna.cabecalho + ' já existe');
      return;
    }
    adicionarColuna_(nomeDaAba, coluna.cabecalho, coluna.tipo);
    feito.push(nomeDaAba + '.' + coluna.cabecalho + ' criada');
    esquecerEstruturaLida_(nomeDaAba);
  });

  esquecerEstruturaLida_(nomeDaAba);
  return feito;
}

function ligarOCanalDeQuemJaEstaCadastrado_(pulados, paraVoce) {
  var feito = [];
  if (!planilhaAtiva_().getSheetByName('USUARIOS')) {
    pulados.push('aba USUARIOS não existe');
    return feito;
  }

  var estrutura = estruturaDaAba_('USUARIOS');
  if (posicaoDaColuna_(estrutura, 'Canal que atende') < 0) {
    pulados.push('USUARIOS não tem a coluna antiga "Canal que atende"');
    return feito;
  }

  var canaisPorNome = {};
  lerRegistros_('CANAIS').forEach(function (canal) {
    canaisPorNome[normalizarParaComparar_(canal.Nome)] =
      converterParaIdentificador_(canal.Id);
  });

  var semCanal = [];
  lerRegistros_('USUARIOS').forEach(function (usuario) {
    if (converterParaIdentificador_(usuario.CanalId)) return;

    var digitado = String(usuario['Canal que atende'] || '').trim();
    if (!digitado) return;

    var idDoCanal = canaisPorNome[normalizarParaComparar_(digitado)];
    if (!idDoCanal) {
      semCanal.push(String(usuario.Nome) + ' ("' + digitado + '")');
      return;
    }

    atualizarRegistro_('USUARIOS', usuario.__id, { CanalId: idDoCanal });
    feito.push(String(usuario.Nome) + ' ficou no canal ' + digitado);
  });

  if (semCanal.length) {
    paraVoce.push('Estas pessoas têm um canal escrito que não existe na aba '
      + 'CANAIS, e por isso continuam sem equipe: ' + semCanal.join(', ')
      + '. Abra Configurações › Usuários e escolha o canal de cada uma.');
  }
  if (!feito.length && !semCanal.length) {
    pulados.push('todo mundo já tinha canal ligado');
  }
  return feito;
}

function apagarAAbaDeProdutos_(pulados, paraVoce) {
  var feito = [];
  var aba = planilhaAtiva_().getSheetByName('PRODUTOS');
  if (!aba) {
    pulados.push('aba PRODUTOS já não existe');
    return feito;
  }

  var quantas = Math.max(aba.getLastRow() - 1, 0);
  planilhaAtiva_().deleteSheet(aba);
  esquecerEstruturaLida_('PRODUTOS');

  feito.push('aba PRODUTOS apagada da planilha, com ' + quantas + ' linha(s)');
  paraVoce.push('A aba PRODUTOS foi apagada, a seu pedido, com ' + quantas
    + ' linha(s). Se precisar dela de volta, ela está em Arquivo › Histórico '
    + 'de versões do Google Planilhas por 30 dias.');
  return feito;
}

function tirarAConferenciaDeBloqueioDaMesa_(pulados) {
  var feito = [];
  var mesa = lerRegistros_('CANAIS').filter(function (canal) {
    return normalizarParaComparar_(canal.Aba) === 'basemesa';
  })[0];

  if (!mesa) {
    pulados.push('não há canal apontando para a BASE_MESA');
    return feito;
  }
  if (String(mesa.ConfereSusepBloqueada || '').trim()) {
    pulados.push('a Mesa já tem a conferência de bloqueio escolhida ('
      + mesa.ConfereSusepBloqueada + ')');
    return feito;
  }

  atualizarRegistro_('CANAIS', mesa.Id, { ConfereSusepBloqueada: 'NAO' });
  esquecerEstruturaLida_('CANAIS');
  feito.push('Mesa Diamante: deixou de conferir a lista de SUSEPs bloqueadas');
  return feito;
}

function limparCamposSemCanal_(pulados) {
  var feito = [];
  if (!planilhaAtiva_().getSheetByName('CAMPOS')) {
    pulados.push('aba CAMPOS não existe');
    return feito;
  }

  var deControle = {};
  Object.keys(RECC_ESQUEMA).forEach(function (chave) {
    if (RECC_ESQUEMA[chave].controle === true) {
      deControle[normalizarParaComparar_(RECC_ESQUEMA[chave].aba)] = true;
    }
  });

  var sobrando = lerRegistros_('CAMPOS').filter(function (campo) {
    return deControle[normalizarParaComparar_(campo.Aba)]
      && !converterParaIdentificador_(campo.CanalId);
  });

  if (!sobrando.length) {
    pulados.push('não há campo apontando para aba de controle');
    return feito;
  }

  sobrando.forEach(function (campo) {
    apagarRegistroDeVez_('CAMPOS', campo.Id);
    feito.push('campo solto removido: ' + campo.Aba + '.' + campo.Cabecalho);
  });
  esquecerEstruturaLida_('CAMPOS');
  return feito;
}

function sinalizadoresDeFabrica_(idRet, idMesa, idVg) {
  function linha(canalId, nome, prazo, unidade, aviso, quandoVale, desde, ordem, ligado) {
    return {
      CanalId: canalId, Nome: nome, Prazo: prazo, Unidade: unidade,
      AvisoFaltando: aviso, ColunaQueLiga: quandoVale, ColunaDaData: desde,
      ColunaDaHora: '',
      InicioDoExpediente: RECC_EXPEDIENTE_PADRAO.abre,
      FimDoExpediente: RECC_EXPEDIENTE_PADRAO.fecha,
      Ordem: ordem, Ativo: ligado
    };
  }
  return [
    linha(idRet, 'Prazo de retorno', 3, 'dias', 1,
      '', RECC_COLUNA_DATA_DA_PRIMEIRA_MUDANCA_DE_STATUS, 1, true),
    linha(idMesa, 'Retorno da área', 48, 'horas', 10,
      '', RECC_COLUNA_DATA_EM_ANDAMENTO, 1, true),
    linha(idVg, 'Prazo de retorno', 0, 'dias', 1, '', '', 1, false)
  ];
}

function criarOsSinalizadores_(pulados) {
  var feito = [];
  var planilha = planilhaAtiva_();

  if (!planilha.getSheetByName('SINALIZADORES')) {
    criarAbaDoContrato_(planilha, esquemaDaAba_('SINALIZADORES'));
    esquecerEstruturaLida_();
    feito.push('aba SINALIZADORES criada');
  } else {
    pulados.push('aba SINALIZADORES já existe');
  }
  if (!planilha.getSheetByName('CANAIS')) return feito;

  var temLinha = {};
  lerRegistros_('SINALIZADORES', { incluirOcultos: true }).forEach(function (linha) {
    temLinha[converterParaIdentificador_(linha.CanalId)] = true;
  });
  var idDaAba = {};
  lerRegistros_('CANAIS').forEach(function (canal) {
    idDaAba[String(canal.Aba)] = canal.Id;
  });

  var padroes = sinalizadoresDeFabrica_(idDaAba.BASE_RET, idDaAba.BASE_MESA, idDaAba.BASE_VG);
  var abas = ['BASE_RET', 'BASE_MESA', 'BASE_VG'];
  padroes.forEach(function (padrao, i) {
    var canalId = idDaAba[abas[i]];
    if (!canalId) return;
    if (temLinha[converterParaIdentificador_(canalId)]) {
      pulados.push('o canal ' + abas[i] + ' já tem sinalizador');
      return;
    }
    inserirRegistro_('SINALIZADORES', padrao);
    feito.push('sinalizador "' + padrao.Nome + '" criado para ' + abas[i]
      + (padrao.Ativo ? '' : ' (desligado, para você definir)'));
  });
  return feito;
}

function criarOCarimboDoEncaminhamento_(pulados) {
  return criarUmaColunaDoSistema_('BASE_MESA', RECC_COLUNA_DATA_DO_ENCAMINHAMENTO,
    'o sistema carimba quando a área é escolhida', pulados);
}

function criarUmaColunaDoSistema_(nomeDaAba, cabecalho, oQueFaz, pulados) {
  var feito = [];
  if (!planilhaAtiva_().getSheetByName(nomeDaAba)) {
    pulados.push('aba ' + nomeDaAba + ' não existe');
    return feito;
  }
  esquecerEstruturaLida_(nomeDaAba);
  if (posicaoDaColuna_(estruturaDaAba_(nomeDaAba, true), cabecalho) >= 0) {
    pulados.push(nomeDaAba + '.' + cabecalho + ' já existe');
    return feito;
  }

  adicionarColuna_(nomeDaAba, cabecalho, RECC_TIPO_DE_DADO.DATA_HORA);
  esquecerEstruturaLida_();

  var chave = normalizarParaComparar_(cabecalho);
  lerRegistros_('CAMPOS').forEach(function (campo) {
    if (String(campo.Aba) === nomeDaAba && normalizarParaComparar_(campo.Cabecalho) === chave) {
      atualizarRegistro_('CAMPOS', campo.__id, {
        Ativo: false, Secao: 'Preenchido pelo sistema'
      });
    }
  });
  feito.push(nomeDaAba + '.' + cabecalho + ' criada (' + oQueFaz + ')');
  return feito;
}

function ligarOPrazoDaMesaAoEmAndamento_(pulados, paraVoce) {
  var feito = [];
  var planilha = planilhaAtiva_();
  if (!planilha.getSheetByName('CANAIS') || !planilha.getSheetByName('BASE_MESA')
    || !planilha.getSheetByName('SINALIZADORES')) {
    pulados.push('a Mesa ainda não tem as abas do prazo');
    return feito;
  }
  var mesa = lerRegistros_('CANAIS').filter(function (canal) {
    return String(canal.Aba) === 'BASE_MESA';
  })[0];
  if (!mesa) { pulados.push('o canal BASE_MESA não está cadastrado'); return feito; }
  var idDaMesa = converterParaIdentificador_(mesa.Id);

  var status = lerRegistros_('CATALOGO').filter(function (item) {
    return normalizarParaComparar_(item.Tipo) === 'status'
      && converterParaIdentificador_(item.CanalId) === idDaMesa
      && normalizarParaComparar_(item.Nome) === 'emandamento';
  })[0];
  if (!status) {
    pulados.push('Mesa: o status "Em andamento" não existe');
  } else if (!String(status.ColunaDeCarimbo || '').trim()) {
    atualizarRegistro_('CATALOGO', status.__id, { ColunaDeCarimbo: RECC_COLUNA_DATA_EM_ANDAMENTO });
    feito.push('Mesa: o status "Em andamento" passou a carimbar "'
      + RECC_COLUNA_DATA_EM_ANDAMENTO + '"');
  } else if (String(status.ColunaDeCarimbo).trim() === RECC_COLUNA_DATA_EM_ANDAMENTO) {
    pulados.push('Mesa: o status "Em andamento" já carimba "' + RECC_COLUNA_DATA_EM_ANDAMENTO + '"');
  } else {
    paraVoce.push('Mesa: o status "Em andamento" carimba em "' + status.ColunaDeCarimbo
      + '", e o prazo da Mesa conta de "' + RECC_COLUNA_DATA_EM_ANDAMENTO + '". Para o prazo '
      + 'contar certo, escolha essa coluna em Configurações › Ajustes Gerais › Situações.');
  }

  var linhas = lerRegistros_('SINALIZADORES').filter(function (linha) {
    return converterParaIdentificador_(linha.CanalId) === idDaMesa;
  });
  var deFabricaDeAntes = linhas.filter(function (linha) {
    return String(linha.ColunaDaData || '').trim() === RECC_COLUNA_DATA_DO_ENCAMINHAMENTO
      && String(linha.ColunaQueLiga || '').trim() === 'Área responsável'
      && !String(linha.ColunaDaHora || '').trim();
  })[0];
  if (deFabricaDeAntes) {
    atualizarRegistro_('SINALIZADORES', deFabricaDeAntes.__id, {
      ColunaQueLiga: '', ColunaDaData: RECC_COLUNA_DATA_EM_ANDAMENTO
    });
    feito.push('Mesa: o sinalizador "' + deFabricaDeAntes.Nome + '" passou a contar de "'
      + RECC_COLUNA_DATA_EM_ANDAMENTO + '", e não mais do encaminhamento para a área');
  } else if (linhas.some(function (linha) {
    return String(linha.ColunaDaData || '').trim() === RECC_COLUNA_DATA_EM_ANDAMENTO;
  })) {
    pulados.push('Mesa: o sinalizador já conta de "' + RECC_COLUNA_DATA_EM_ANDAMENTO + '"');
  } else if (linhas.length) {
    paraVoce.push('Mesa: o sinalizador "' + linhas[0].Nome + '" foi ajustado por você e '
      + 'continua contando de "' + (linhas[0].ColunaDaData || 'a data de entrada')
      + '". Para contar do status Em andamento, escolha em Configurações › '
      + 'Sinalizadores a data "' + RECC_COLUNA_DATA_EM_ANDAMENTO
      + '" e deixe "Só vale quando…" em branco.');
  }

  var canal = comAGrafiaDaAba_(canaisVisiveis_().filter(function (c) { return c.aba === 'BASE_MESA'; })[0]);
  var situacoes = canal ? situacoesPorChave_(canal) : {};
  var semData = lerRegistros_('BASE_MESA').filter(function (registro) {
    var situacao = situacoes[normalizarParaComparar_(registro[canal.colunaDoStatus])];
    return situacao && !situacao.final && !String(registro[RECC_COLUNA_DATA_EM_ANDAMENTO] || '').trim();
  }).length;
  if (semData) {
    paraVoce.push('Mesa: ' + semData + ' caso(s) em andamento não têm "'
      + RECC_COLUNA_DATA_EM_ANDAMENTO + '" e ficam SEM selo de prazo — o sistema não '
      + 'inventa a data deles. Para contarem, preencha a coluna na planilha (por '
      + 'exemplo, copiando a Data de entrada). Os cadastrados pela tela já nascem '
      + 'carimbados; os importados entram sem status e ganham a data quando alguém os '
      + 'põe em Em andamento.');
  }
  return feito;
}

function ligarAParadaDoRetido_(pulados, paraVoce) {
  var feito = [];
  var planilha = planilhaAtiva_();
  if (!planilha.getSheetByName('CANAIS') || !planilha.getSheetByName('BASE_RET')
    || !planilha.getSheetByName('SINALIZADORES')) {
    pulados.push('a RET ainda não tem as abas do prazo');
    return feito;
  }
  var ret = lerRegistros_('CANAIS').filter(function (canal) {
    return String(canal.Aba) === 'BASE_RET';
  })[0];
  if (!ret) { pulados.push('o canal BASE_RET não está cadastrado'); return feito; }

  var linha = lerRegistros_('SINALIZADORES').filter(function (outra) {
    return converterParaIdentificador_(outra.CanalId) === converterParaIdentificador_(ret.Id);
  })[0];
  if (!linha) { pulados.push('a RET não tem sinalizador'); return feito; }
  if (String(linha.StatusComCondicao || '').trim()) {
    pulados.push('RET: o sinalizador já tem condição de parada ("' + linha.StatusComCondicao + '")');
    return feito;
  }

  var coluna = estruturaDaAba_('BASE_RET', true).cabecalhos.filter(function (cabecalho) {
    return normalizarParaComparar_(cabecalho) === 'statusproposta';
  })[0];
  var comoLigar = 'Para o Retido só encerrar o prazo com o Status proposta Transmitido ou Sem '
    + 'alteração: crie a lista "Status proposta" em Configurações › Ajustes Gerais; crie o campo '
    + '"Status proposta" em Configurações › Cadastrar Caso, com essa lista e "Só quando Status for '
    + 'Retido"; e rode atualizarPGO() de novo — ou preencha a condição em Configurações › '
    + 'Sinalizadores. Até lá o Retido encerra o prazo sozinho, como antes.';
  if (!coluna) {
    paraVoce.push('RET: a base não tem a coluna "Status proposta". ' + comoLigar);
    return feito;
  }

  var campo = lerRegistros_('CAMPOS').filter(function (outro) {
    return String(outro.Aba) === 'BASE_RET'
      && normalizarParaComparar_(outro.Cabecalho) === 'statusproposta';
  })[0];
  var opcoes = campo ? opcoesDoCampo_(lerConfiguracaoDoCampo_(campo), ret.Id) : [];
  var valores = ['transmitido', 'semalteracao'].map(function (procurado) {
    return opcoes.filter(function (opcao) {
      return normalizarParaComparar_(opcao.valor) === procurado;
    })[0];
  }).filter(Boolean).map(function (opcao) { return opcao.valor; });
  if (!valores.length) {
    paraVoce.push('RET: a coluna "' + coluna + '" existe, mas a lista dela não tem "Transmitido" '
      + 'nem "Sem alteração". Escolha a lista certa no campo e rode atualizarPGO() de novo, ou '
      + 'preencha a condição em Configurações › Sinalizadores.');
    return feito;
  }

  var canal = comAGrafiaDaAba_(canaisVisiveis_().filter(function (c) { return c.aba === 'BASE_RET'; })[0]);
  var retido = canal ? situacoesDoCanal_(canal).filter(function (uma) {
    return normalizarParaComparar_(uma.gravadoComo) === 'retido';
  })[0] : null;
  if (!retido) {
    paraVoce.push('RET: não achei o status "Retido" para ligar a condição. Preencha-a em '
      + 'Configurações › Sinalizadores.');
    return feito;
  }

  atualizarRegistro_('SINALIZADORES', linha.__id, {
    StatusComCondicao: retido.gravadoComo, ColunaDaCondicao: coluna,
    ValoresDaCondicao: valores.join('; '),
    ColunaDaDataDaCondicao: RECC_COLUNA_DATA_DO_STATUS_PROPOSTA
  });
  feito.push('RET: o "' + retido.gravadoComo + '" só encerra o prazo quando "' + coluna
    + '" for ' + valores.join(' ou '));

  var retidos = lerRegistros_('BASE_RET').filter(function (registro) {
    return normalizarParaComparar_(registro[canal.colunaDoStatus]) === 'retido';
  });
  var abertos = retidos.filter(function (registro) {
    return !condicaoBate_({ valores: valores }, registro[coluna]);
  }).length;
  if (retidos.length) {
    paraVoce.push('RET: dos ' + retidos.length + ' caso(s) Retido que já existem, ' + abertos
      + ' ainda não têm o Status proposta Transmitido ou Sem alteração: passam a contar como em '
      + 'ABERTO (e vermelhos, se já passaram de ' + linha.Prazo + ' ' + linha.Unidade
      + ' úteis). Os outros ' + (retidos.length - abertos) + ' ficam sem selo, porque o sistema '
      + 'não sabe QUANDO o Status proposta foi preenchido. O que for preenchido de agora em '
      + 'diante já é carimbado.');
  }
  return feito;
}

function criarAAbaDoChat_(pulados, paraVoce) {
  var feito = [];
  var planilha = planilhaAtiva_();
  if (!planilha.getSheetByName('ATENDIMENTOS_CHAT')) {
    criarAbaDoContrato_(planilha, esquemaDaAba_('ATENDIMENTOS_CHAT'));
    esquecerEstruturaLida_();
    feito.push('aba ATENDIMENTOS_CHAT criada — os atendimentos do chat entram pela Importação');
  } else {
    pulados.push('aba ATENDIMENTOS_CHAT já existe');

    feito = feito.concat(criarColunasDoContrato_('ATENDIMENTOS_CHAT', pulados));
  }
  var antiga = '';
  try { antiga = String(valorDaConfiguracao_('CHAT.PLANILHA_ID', '') || '').trim(); }
  catch (erro) { antiga = ''; }
  if (antiga) {
    paraVoce.push('A planilha do chat que estava ligada em Configurações › Estrutura NÃO é mais '
      + 'lida. Traga os atendimentos pela tela de Importação: escolha a Mesa Diamante, '
      + '"Atendimentos do chat", e use "Ler outra planilha pelo link" com o mesmo Id ('
      + antiga + '). A linha repetida é pulada, então dá para importar de novo sem contar dobrado.');
  }
  return feito;
}

function ligarOValorRetidoNoRetido_(pulados, paraVoce) {
  var feito = [];
  if (!planilhaAtiva_().getSheetByName('CAMPOS') || !planilhaAtiva_().getSheetByName('CANAIS')) {
    pulados.push('o valor retido: as abas de configuração ainda não existem');
    return feito;
  }
  var ret = lerRegistros_('CANAIS').filter(function (canal) {
    return String(canal.Aba) === 'BASE_RET';
  })[0];
  if (!ret) { pulados.push('o canal BASE_RET não está cadastrado'); return feito; }
  var campo = lerRegistros_('CAMPOS').filter(function (um) {
    return converterParaIdentificador_(um.CanalId) === converterParaIdentificador_(ret.Id)
      && String(um.ChaveTecnica) === 'valordopremioretido';
  })[0];
  if (!campo) { pulados.push('RET: o campo do valor retido não existe'); return feito; }

  var configuracao = lerConfiguracaoDoCampo_(campo);
  if (configuracao.obrigatorioSe) {
    pulados.push('RET: o valor retido já tem a condição de obrigatório');
    return feito;
  }
  if (normalizarParaComparar_(campo.Obrigatorio) === 'sim') {
    paraVoce.push('RET: o valor retido está marcado como obrigatório SEMPRE, e ficou assim. '
      + 'Para cobrar só no Retido, desmarque "Obrigatório" e escolha "Só quando Status for '
      + 'Retido" em "Quando este campo é obrigatório", em Configurações › Cadastrar Caso.');
    return feito;
  }
  configuracao.obrigatorioSe = { campo: 'status', valores: ['Retido'] };
  atualizarRegistro_('CAMPOS', campo.__id, { Configuracao: JSON.stringify(configuracao) });
  feito.push('RET: o valor retido passou a ser obrigatório quando o Status é Retido '
    + '(no formulário e no "Alterar status")');
  return feito;
}

function ligarOPrazoDaRetAPrimeiraMudanca_(pulados, paraVoce) {
  var feito = [];
  var planilha = planilhaAtiva_();
  if (!planilha.getSheetByName('CANAIS') || !planilha.getSheetByName('BASE_RET')
    || !planilha.getSheetByName('SINALIZADORES')) {
    pulados.push('a RET ainda não tem as abas do prazo');
    return feito;
  }
  var COLUNA = RECC_COLUNA_DATA_DA_PRIMEIRA_MUDANCA_DE_STATUS;
  var ret = lerRegistros_('CANAIS').filter(function (canal) {
    return String(canal.Aba) === 'BASE_RET';
  })[0];
  if (!ret) { pulados.push('o canal BASE_RET não está cadastrado'); return feito; }

  var linha = lerRegistros_('SINALIZADORES').filter(function (outra) {
    return converterParaIdentificador_(outra.CanalId) === converterParaIdentificador_(ret.Id);
  })[0];
  if (!linha) {
    pulados.push('a RET não tem sinalizador');
  } else {
    var desde = String(linha.ColunaDaData || '').trim();
    var hora = String(linha.ColunaDaHora || '').trim();
    var mesmaColuna = function (uma, outra) {
      return normalizarParaComparar_(uma) === normalizarParaComparar_(outra);
    };
    if (mesmaColuna(desde, COLUNA)) {
      pulados.push('RET: o prazo já conta da primeira mudança de status');
    } else if ((!desde || mesmaColuna(desde, ret.ColunaDaData))
      && (!hora || mesmaColuna(hora, ret.ColunaDaHora))) {
      atualizarRegistro_('SINALIZADORES', linha.__id, { ColunaDaData: COLUNA, ColunaDaHora: '' });
      feito.push('RET: o "' + linha.Nome + '" conta da primeira mudança de status; caso em '
        + '"Não trabalhado" fica com o prazo cheio');
    } else {
      paraVoce.push('RET: o "' + linha.Nome + '" conta de "' + desde + '", que você escolheu, e '
        + 'ficou assim. Para os 3 dias úteis contarem só depois que o caso muda de status, '
        + 'escolha "' + COLUNA + '" em Configurações › Sinalizadores.');
    }
  }

  var canal = comAGrafiaDaAba_(canaisVisiveis_().filter(function (c) { return c.aba === 'BASE_RET'; })[0]);
  esquecerEstruturaLida_('BASE_RET');
  var estrutura = estruturaDaAba_('BASE_RET', true);
  var posicaoDaData = posicaoDaColuna_(estrutura, COLUNA);
  if (!canal || !canal.colunaDoStatus || posicaoDaData < 0
    || posicaoDaColuna_(estrutura, canal.colunaDoStatus) < 0) {
    pulados.push('RET: sem coluna de status ou de data para datar os casos antigos');
    return feito;
  }
  var total = quantidadeDeRegistros_(estrutura);
  if (total <= 0) return feito;

  var nascimento = normalizarParaComparar_(statusPadraoDoCanal_(canal));
  var deOndeTirar = [RECC_COLUNA_QUANDO_MUDOU_O_STATUS];
  situacoesDoCanal_(canal).forEach(function (situacao) {
    if (situacao.colunaDeCarimbo) deOndeTirar.push(situacao.colunaDeCarimbo);
  });
  deOndeTirar = deOndeTirar.filter(function (cabecalho, i) {
    return posicaoDaColuna_(estrutura, cabecalho) >= 0 && deOndeTirar.indexOf(cabecalho) === i;
  });

  var status = lerColunaInteira_('BASE_RET', canal.colunaDoStatus);
  var datas = lerColunaInteira_('BASE_RET', COLUNA);
  var fontes = deOndeTirar.map(function (cabecalho) {
    return lerColunaInteira_('BASE_RET', cabecalho);
  });
  function comoMomento(valor) {
    if (Object.prototype.toString.call(valor) === '[object Date]') {
      return isNaN(valor.getTime()) ? null : valor;
    }
    var data = converterParaData_(valor);
    return data ? data : null;
  }

  var datados = 0;
  var semData = 0;
  var novas = datas.map(function (atual, i) {
    if (String(atual === null || atual === undefined ? '' : atual).trim()) return [atual];
    var oStatus = normalizarParaComparar_(status[i]);
    if (!oStatus || oStatus === nascimento) return [atual];
    var maisAntiga = null;
    fontes.forEach(function (coluna) {
      var momento = comoMomento(coluna[i]);
      if (momento && (!maisAntiga || momento.getTime() < maisAntiga.getTime())) maisAntiga = momento;
    });
    if (!maisAntiga) { semData++; return [atual]; }
    datados++;
    return [maisAntiga];
  });
  if (datados) {
    estrutura.aba.getRange(2, posicaoDaData + 1, total, 1).setValues(novas);
    feito.push('RET: ' + datados + ' caso(s) que já tinham saído de "Não trabalhado" ganharam a '
      + 'data da primeira mudança de status (a mais antiga que a linha já guardava)');
  }
  if (semData) {
    paraVoce.push('RET: ' + semData + ' caso(s) já saíram de "Não trabalhado", mas a linha não '
      + 'guarda data nenhuma de mudança de status. Ficam sem selo de prazo — o sistema não '
      + 'inventa a data. A próxima mudança de status de cada um carimba a data, e o prazo '
      + 'passa a contar dali; se quiser antes, preencha "' + COLUNA + '" na planilha.');
  }
  return feito;
}

function renomearOPremioMensalDaRet_(pulados, paraVoce) {
  var feito = [];
  var planilha = planilhaAtiva_();
  var aba = planilha.getSheetByName('BASE_RET');
  if (!aba) { pulados.push('aba BASE_RET não existe'); return feito; }

  var ANTIGO = 'prêmio mensal retido';
  var NOVO = 'prêmio mensal';
  var CHAVE_ANTIGA = normalizarParaComparar_(ANTIGO);
  var CHAVE_NOVA = normalizarParaComparar_(NOVO);

  esquecerEstruturaLida_('BASE_RET');
  var estrutura = estruturaDaAba_('BASE_RET', true);
  var naAntiga = posicaoDaColuna_(estrutura, ANTIGO);
  var naNova = posicaoDaColuna_(estrutura, NOVO);
  if (naAntiga >= 0 && naNova >= 0) {
    paraVoce.push('RET: a base tem as DUAS colunas, "' + estrutura.cabecalhos[naAntiga]
      + '" e "' + estrutura.cabecalhos[naNova] + '". Nada foi mexido: passe o que estiver '
      + 'na antiga para a nova, apague a antiga e rode atualizarPGO() de novo.');
    return feito;
  }
  if (naAntiga >= 0) {
    aba.getRange(1, naAntiga + 1).setValue(NOVO);
    esquecerEstruturaLida_();
    feito.push('RET: a coluna "' + estrutura.cabecalhos[naAntiga] + '" agora se chama "'
      + NOVO + '" (o dado dentro dela não mudou)');
    paraVoce.push('RET: a coluna "' + estrutura.cabecalhos[naAntiga] + '" passou a se chamar "'
      + NOVO + '". Relatório que lê a planilha pelo nome da coluna — o Power BI, por exemplo — '
      + 'precisa do nome novo.');
  } else if (naNova >= 0) {
    pulados.push('BASE_RET."' + NOVO + '" já existe');
  } else {
    pulados.push('a RET não tem a coluna "' + ANTIGO + '" nem "' + NOVO + '"');
    return feito;
  }

  var chaveTrocou = false;
  lerRegistros_('CAMPOS').forEach(function (campo) {
    if (String(campo.Aba) !== 'BASE_RET'
      || normalizarParaComparar_(campo.Cabecalho) !== CHAVE_ANTIGA) return;
    var mudanca = { Cabecalho: NOVO };
    if (normalizarParaComparar_(campo.ChaveTecnica) === CHAVE_ANTIGA) {
      mudanca.ChaveTecnica = CHAVE_NOVA;
      chaveTrocou = true;
    }

    if (normalizarParaComparar_(campo.Rotulo) === CHAVE_ANTIGA) mudanca.Rotulo = NOVO;
    atualizarRegistro_('CAMPOS', campo.__id, mudanca);
    feito.push('CAMPOS: o campo da RET aponta para "' + NOVO + '"');
  });

  if (chaveTrocou) {

    lerRegistros_('CATALOGO').forEach(function (nivel) {
      if (normalizarParaComparar_(nivel.Tipo) !== 'nivelacesso') return;
      var lido;
      try { lido = JSON.parse(String(nivel.Configuracao || '')); } catch (erro) { return; }
      if (!lido || !lido.campos || !(CHAVE_ANTIGA in lido.campos)) return;
      if (!(CHAVE_NOVA in lido.campos)) lido.campos[CHAVE_NOVA] = lido.campos[CHAVE_ANTIGA];
      delete lido.campos[CHAVE_ANTIGA];
      atualizarRegistro_('CATALOGO', nivel.__id, { Configuracao: JSON.stringify(lido) });
      feito.push('Nível "' + nivel.Nome + '" mantém a permissão do campo, com a chave nova');
    });
    lerRegistros_('CAMPOS').forEach(function (campo) {
      if (String(campo.Aba) !== 'BASE_RET') return;
      var configuracao = lerConfiguracaoDoCampo_(campo);
      if (!configuracao.mostrarSe || configuracao.mostrarSe.campo !== CHAVE_ANTIGA) return;
      configuracao.mostrarSe.campo = CHAVE_NOVA;
      atualizarRegistro_('CAMPOS', campo.__id, { Configuracao: JSON.stringify(configuracao) });
      feito.push('CAMPOS: "' + (campo.Rotulo || campo.Cabecalho)
        + '" continua aparecendo conforme o prêmio mensal');
    });
  }

  var nomeAntigo = /pr[eê]mio mensal retido/gi;
  [['CANAIS', ['ColunasDaFila', 'ColunasDaBusca', 'ColunaDoValor', 'ColunaDaData',
    'ColunaDaFinalizacao', 'ColunaDaAreaResponsavel']],
   ['PAINEIS', ['CampoDimensao', 'CampoMedida']],
   ['ANALISES', ['Colunas', 'Filtros']],
   ['SINALIZADORES', ['ColunaQueLiga', 'ColunaDaData', 'ColunaDaHora',
     'ColunaDaCondicao', 'ColunaDaDataDaCondicao']]].forEach(function (par) {
    if (!planilha.getSheetByName(par[0])) return;
    var daAba = estruturaDaAba_(par[0]);
    lerRegistros_(par[0]).forEach(function (linha) {
      var mudanca = {};
      par[1].forEach(function (coluna) {
        var posicao = posicaoDaColuna_(daAba, coluna);
        if (posicao < 0) return;
        var texto = String(linha[daAba.cabecalhos[posicao]] || '');
        if (texto.search(nomeAntigo) < 0) return;
        mudanca[daAba.cabecalhos[posicao]] = texto.replace(nomeAntigo, NOVO);
      });
      if (!Object.keys(mudanca).length) return;
      atualizarRegistro_(par[0], linha.__id, mudanca);
      feito.push(par[0] + ': "' + (linha.Nome || linha.Titulo || linha.__id)
        + '" passou a citar "' + NOVO + '"');
    });
  });

  return feito;
}

function criarAListaDeDisponibilidade_(pulados) {
  var feito = [];
  var jaTem = {};
  lerRegistros_('CATALOGO').forEach(function (item) {
    if (normalizarParaComparar_(item.Tipo) !== 'disponibilidade') return;
    jaTem[normalizarParaComparar_(item.Nome)] = true;
  });

  var ordem = 0;
  [[RECC_DISPONIBILIDADE_QUE_RECEBE, 'bom'],
   ['Férias', 'atencao'],
   ['Afastado', 'atencao']].forEach(function (par) {
    ordem++;
    if (jaTem[normalizarParaComparar_(par[0])]) {
      pulados.push('a disponibilidade "' + par[0] + '" já existe');
      return;
    }
    inserirRegistro_('CATALOGO',
      novoItemDeCatalogo_('DISPONIBILIDADE', '', par[0], ordem, par[1]));
    feito.push('disponibilidade "' + par[0] + '" criada');
  });
  return feito;
}

function canaisSemAnalista_() {
  var vazios = [];
  canaisVisiveis_().forEach(function (canal) {
    if (!analistasParaDistribuir_(canal).length) vazios.push(canal.nome);
  });
  return vazios;
}

function avisarQuemPodeFicarSemLote_(vazios, paraVoce) {
  if (!vazios.length) return [];
  paraVoce.push('A importação agora divide o lote SÓ entre quem é do canal '
    + 'escolhido e está disponível, a seu pedido. Estes canais estão sem '
    + 'ninguém nessa condição: ' + vazios.join(', ') + '. Abra Configurações › '
    + 'Usuários e escolha o canal de cada analista — sem isso a tela de '
    + 'Importação vai abrir com a lista vazia.');
  return [];
}

function ligarOValorPorSituacaoDaRet_(pulados) {
  var feito = [];
  var ret = lerRegistros_('CANAIS').filter(function (canal) {
    return normalizarParaComparar_(canal.Aba) === 'baseret';
  })[0];
  if (!ret) {
    pulados.push('não há canal apontando para a BASE_RET');
    return feito;
  }

  if (String(ret.ColunaDoValor || '').trim()) {
    pulados.push('a RET já tem coluna de valor ("' + ret.ColunaDoValor + '")');
    return feito;
  }

  var estrutura = estruturaDaAba_(String(ret.Aba));
  if (posicaoDaColuna_(estrutura, 'valor do prêmio') < 0) {
    pulados.push('a BASE_RET não tem a coluna "valor do prêmio" — o gráfico de '
      + 'valor por situação fica desligado até você apontar uma coluna em '
      + 'Configurações › Canais de trabalho');
    return feito;
  }

  atualizarRegistro_('CANAIS', ret.Id, {
    ColunaDoValor: 'valor do prêmio',
    SituacoesDestacadas: String(ret.SituacoesDestacadas || '').trim()
      || 'Retido, Não retido, Sem sucesso de contato'
  });
  esquecerEstruturaLida_();
  feito.push('RET: gráfico de valor por situação ligado em "valor do prêmio", '
    + 'destacando Retido, Não retido e Sem sucesso de contato');
  return feito;
}

function criarOStatusSemSucesso_(pulados) {
  var feito = [];
  var ret = lerRegistros_('CANAIS').filter(function (canal) {
    return normalizarParaComparar_(canal.Aba) === 'baseret';
  })[0];
  if (!ret) return feito;

  var doCanal = converterParaIdentificador_(ret.Id);
  var jaExiste = false;
  var ultimaOrdem = 0;
  lerRegistros_('CATALOGO').forEach(function (item) {
    if (normalizarParaComparar_(item.Tipo) !== 'status') return;
    if (converterParaIdentificador_(item.CanalId) !== doCanal) return;
    ultimaOrdem = Math.max(ultimaOrdem, Number(item.Ordem) || 0);

    var nome = normalizarParaComparar_(item.Nome);
    if (nome === normalizarParaComparar_('Sem sucesso')
      || nome === normalizarParaComparar_('Sem sucesso de contato')) jaExiste = true;
  });

  if (jaExiste) {
    pulados.push('o status "Sem sucesso de contato" já existe na RET');
    return feito;
  }

  inserirRegistro_('CATALOGO', novoItemDeCatalogo_('STATUS', ret.Id,
    'Sem sucesso de contato', ultimaOrdem + 1, 'atencao', '', true));
  esquecerEstruturaLida_();
  feito.push('RET: status "Sem sucesso de contato" criado, em laranja');
  return feito;
}

const RECC_STATUS_DO_PO = [
  {
    aba: 'BASE_RET',
    trocar: [['Não reteve', 'Não retido'], ['Reteve', 'Retido'],
      ['Sem sucesso', 'Sem sucesso de contato']],
    excluir: ['Concluído'],
    criar: [['Cancelado', 'ruim'], ['Pago', 'bom']],
    finais: ['Não retido', 'Retido', 'Sem sucesso de contato', 'Cancelado', 'Pago']
  },
  {
    aba: 'BASE_MESA',
    trocar: [['Concluído na célula', 'Concluído na mesa']],

    titulos: [['Concluídos na célula', 'Concluídos na mesa']],
    excluir: [],
    criar: [['Sem retorno', 'atencao']],
    finais: ['Concluído', 'Concluído na mesa', 'Sem retorno']
  }
];

function aplicarOsStatusDoPO_(pulados, paraVoce) {
  var feito = [];

  RECC_STATUS_DO_PO.forEach(function (regra) {
    var canal = lerRegistros_('CANAIS').filter(function (um) {
      return normalizarParaComparar_(um.Aba) === normalizarParaComparar_(regra.aba);
    })[0];
    if (!canal) {
      pulados.push('não há canal apontando para a ' + regra.aba);
      return;
    }
    var nomeDoCanal = String(canal.Nome);
    var doCanal = converterParaIdentificador_(canal.Id);

    function acharStatus(nome) {
      return lerRegistros_('CATALOGO').filter(function (item) {
        return normalizarParaComparar_(item.Tipo) === 'status'
          && converterParaIdentificador_(item.CanalId) === doCanal
          && normalizarParaComparar_(item.Nome) === normalizarParaComparar_(nome);
      })[0];
    }

    regra.trocar.forEach(function (par) {
      var antigo = par[0];
      var novo = par[1];
      if (acharStatus(novo)) {
        pulados.push(nomeDoCanal + ': o status "' + novo + '" já existe');
        return;
      }
      var item = acharStatus(antigo);
      if (!item) return;

      var rotulo = String(item.Rotulo || '').trim();
      atualizarRegistro_('CATALOGO', item.__id, {
        Nome: novo,
        Rotulo: !rotulo || normalizarParaComparar_(rotulo) === normalizarParaComparar_(antigo)
          ? novo : rotulo
      });
      var casos = trocarStatusNosCasos_(canal, antigo, novo);
      var paineis = trocarStatusNosPaineis_(doCanal, antigo, novo, regra.titulos);
      trocarStatusNasDestacadas_(canal, antigo, novo);
      esquecerEstruturaLida_();
      feito.push(nomeDoCanal + ': "' + antigo + '" virou "' + novo + '" — no catálogo, em '
        + casos + ' caso(s) e em ' + paineis + ' cartão(ões)/gráfico(s)');
    });

    regra.excluir.forEach(function (nome) {
      var item = acharStatus(nome);
      if (!item) {
        pulados.push(nomeDoCanal + ': o status "' + nome + '" já não existe');
        return;
      }
      apagarRegistroDeVez_('CATALOGO', item.__id);
      trocarStatusNasDestacadas_(canal, nome, '');
      esquecerEstruturaLida_();
      feito.push(nomeDoCanal + ': status "' + nome + '" excluído do catálogo');

      var aindaNele = contarCasosNoStatus_(canal, nome);
      if (aindaNele) {
        paraVoce.push(nomeDoCanal + ': ' + aindaNele + ' caso(s) continuam com o status "'
          + nome + '", que saiu do catálogo. Eles aparecem como "fora da lista" até '
          + 'alguém escolher o status certo de cada um no Trabalho.');
      }
    });

    regra.criar.forEach(function (par) {
      if (acharStatus(par[0])) {
        pulados.push(nomeDoCanal + ': o status "' + par[0] + '" já existe');
        return;
      }
      var ultimaOrdem = 0;
      lerRegistros_('CATALOGO').forEach(function (item) {
        if (normalizarParaComparar_(item.Tipo) !== 'status') return;
        if (converterParaIdentificador_(item.CanalId) !== doCanal) return;
        ultimaOrdem = Math.max(ultimaOrdem, Number(item.Ordem) || 0);
      });
      inserirRegistro_('CATALOGO', novoItemDeCatalogo_('STATUS', canal.Id,
        par[0], ultimaOrdem + 1, par[1], '', true));
      esquecerEstruturaLida_();
      feito.push(nomeDoCanal + ': status "' + par[0] + '" criado');
    });

    var marcados = [];
    regra.finais.forEach(function (nome) {
      var item = acharStatus(nome);
      if (!item || String(item.Final === null || item.Final === undefined
        ? '' : item.Final).trim() !== '') return;
      atualizarRegistro_('CATALOGO', item.__id, { Final: true });
      marcados.push(nome);
    });
    esquecerEstruturaLida_();
    if (marcados.length) {
      feito.push(nomeDoCanal + ': status finais marcados — ' + marcados.join(', '));
    } else {
      pulados.push(nomeDoCanal + ': os status finais já estavam decididos');
    }
  });

  return feito;
}

function trocarStatusNosCasos_(canal, antigo, novo) {
  var aba = String(canal.Aba);
  var coluna = String(canal.ColunaDoStatus || '');
  var estrutura = estruturaDaAba_(aba);
  var posicao = coluna ? posicaoDaColuna_(estrutura, coluna) : -1;
  if (posicao < 0) return 0;

  var procurado = normalizarParaComparar_(antigo);
  var trocados = 0;
  var valores = lerColunaInteira_(aba, coluna).map(function (valor) {
    if (normalizarParaComparar_(valor) !== procurado) return [valor];
    trocados++;
    return [novo];
  });
  if (trocados) {
    estrutura.aba.getRange(2, posicao + 1, valores.length, 1).setValues(valores);
    esquecerEstruturaLida_(aba);
  }
  return trocados;
}

function contarCasosNoStatus_(canal, nome) {
  var coluna = String(canal.ColunaDoStatus || '');
  if (!coluna || posicaoDaColuna_(estruturaDaAba_(String(canal.Aba)), coluna) < 0) return 0;
  var procurado = normalizarParaComparar_(nome);
  return lerColunaInteira_(String(canal.Aba), coluna).filter(function (valor) {
    return normalizarParaComparar_(valor) === procurado;
  }).length;
}

function trocarStatusNosPaineis_(doCanal, antigo, novo, titulos) {
  var procurado = normalizarParaComparar_(antigo);
  var titulosTrocados = {};
  (titulos || []).forEach(function (par) {
    titulosTrocados[normalizarParaComparar_(par[0])] = par[1];
  });
  var trocados = 0;
  lerRegistros_('PAINEIS').forEach(function (painel) {
    if (converterParaIdentificador_(painel.CanalId) !== doCanal) return;
    var mudanca = {};
    var titulo = normalizarParaComparar_(painel.Titulo);
    if (normalizarParaComparar_(painel.Filtro) === procurado) mudanca.Filtro = novo;
    if (titulo === procurado) mudanca.Titulo = novo;
    else if (titulosTrocados[titulo]) mudanca.Titulo = titulosTrocados[titulo];
    if (!Object.keys(mudanca).length) return;
    atualizarRegistro_('PAINEIS', painel.__id, mudanca);
    trocados++;
  });
  return trocados;
}

function trocarStatusNasDestacadas_(canal, antigo, novo) {
  var lista = String(canal.SituacoesDestacadas || '').trim();
  if (!lista) return;
  var procurado = normalizarParaComparar_(antigo);
  var mexeu = false;
  var nova = lista.split(',').map(function (nome) { return nome.trim(); })
    .map(function (nome) {
      if (normalizarParaComparar_(nome) !== procurado) return nome;
      mexeu = true;
      return novo;
    })
    .filter(function (nome) { return nome !== ''; });
  if (!mexeu) return;
  canal.SituacoesDestacadas = nova.join(', ');
  atualizarRegistro_('CANAIS', canal.Id, { SituacoesDestacadas: canal.SituacoesDestacadas });
}

const RECC_FILA_DO_PO = [
  { aba: 'BASE_RET', grupo: 'Dados da proposta',
    de: 'protocolo, número da proposta, Num_apolice, produto',
    para: 'Código origem da proposta + número da proposta, Num_apolice, produto' },
  { aba: 'BASE_RET', grupo: 'Dados cadastrais',
    de: 'nome do cliente, CPF, e-mail',
    para: 'telefones de contato, nome do cliente, CPF, e-mail' },
  { aba: 'BASE_MESA', grupo: 'Dados do caso',
    de: 'Ramo, Assunto',
    para: 'Título do e-mail, Ramo, Assunto' },

  { aba: 'BASE_VG', grupo: 'Vigência',
    de: 'Início da vigência, Meses de vigência',
    para: 'Meses de vigência, Início da vigência' }
];

function ajustarAsColunasDaFila_(pulados, paraVoce) {
  var feito = [];
  function comoLista(texto) {
    return String(texto || '').split(',').map(function (nome) {
      return normalizarParaComparar_(nome);
    }).filter(function (nome) { return nome !== ''; }).join(',');
  }

  RECC_FILA_DO_PO.forEach(function (regra) {
    var canal = lerRegistros_('CANAIS').filter(function (um) {
      return normalizarParaComparar_(um.Aba) === normalizarParaComparar_(regra.aba);
    })[0];
    if (!canal) {
      pulados.push('não há canal apontando para a ' + regra.aba);
      return;
    }
    var nome = String(canal.Nome);
    var pedido = '"' + regra.grupo + ': ' + regra.para + '"';

    var pedacos = String(canal.ColunasDaFila || '').split(';');
    var onde = -1;
    pedacos.forEach(function (pedaco, i) {
      var corte = pedaco.indexOf(':');
      if (corte > 0 && normalizarParaComparar_(pedaco.substring(0, corte))
        === normalizarParaComparar_(regra.grupo)) onde = i;
    });
    if (onde < 0) {
      paraVoce.push(nome + ': a fila não tem o grupo "' + regra.grupo + '". Para '
        + 'ficar como o PO pediu, acrescente em Configurações › Canais de trabalho '
        + '› Colunas da fila: ' + pedido + '.');
      return;
    }

    var corte = pedacos[onde].indexOf(':');
    var titulo = pedacos[onde].substring(0, corte).trim();
    var lista = pedacos[onde].substring(corte + 1);
    if (comoLista(lista) === comoLista(regra.para)) {
      pulados.push(nome + ': o grupo "' + regra.grupo + '" da fila já está como pedido');
      return;
    }
    if (comoLista(lista) !== comoLista(regra.de)) {
      paraVoce.push(nome + ': o grupo "' + regra.grupo + '" da fila foi personalizado '
        + '("' + lista.trim() + '") e ficou como está. Para ficar como o PO pediu, '
        + 'escreva em Configurações › Canais de trabalho › Colunas da fila: '
        + pedido + '.');
      return;
    }

    pedacos[onde] = titulo + ': ' + regra.para;
    atualizarRegistro_('CANAIS', canal.Id, {
      ColunasDaFila: pedacos.map(function (pedaco) { return pedaco.trim(); })
        .filter(function (pedaco) { return pedaco !== ''; }).join('; ')
    });
    esquecerEstruturaLida_();
    feito.push(nome + ': fila — "' + regra.grupo + '" agora abre com '
      + regra.para.split(',')[0].trim());
  });
  return feito;
}

function ligarOSlaDaMesa_(pulados) {
  var feito = [];
  var mesa = lerRegistros_('CANAIS').filter(function (canal) {
    return normalizarParaComparar_(canal.Aba) === 'basemesa';
  })[0];
  if (!mesa) {
    pulados.push('não há canal apontando para a BASE_MESA');
    return feito;
  }
  if (String(mesa.SlaHorasUteis === undefined ? '' : mesa.SlaHorasUteis).trim()) {
    pulados.push('a Mesa já tem SLA declarado (' + mesa.SlaHorasUteis + ' horas úteis)');
    return feito;
  }

  var estruturaDaMesa = estruturaDaAba_(String(mesa.Aba));
  function seExistir(cabecalho) {
    return posicaoDaColuna_(estruturaDaMesa, cabecalho) >= 0 ? cabecalho : '';
  }
  atualizarRegistro_('CANAIS', mesa.Id, {
    SlaHorasUteis: 6,
    InicioDoExpediente: String(mesa.InicioDoExpediente || '').trim() || '08:15',
    FimDoExpediente: String(mesa.FimDoExpediente || '').trim() || '18:30',
    ColunaDaPrimeiraResposta: String(mesa.ColunaDaPrimeiraResposta || '').trim()
      || seExistir('Data resposta'),
    ColunaDaHoraDaPrimeiraResposta: String(mesa.ColunaDaHoraDaPrimeiraResposta || '').trim()
      || seExistir('Hora resposta')
  });
  esquecerEstruturaLida_('CANAIS');
  feito.push('Mesa Diamante: SLA de 6 horas úteis, das 08:15 às 18:30, de segunda a sexta, '
    + 'até a primeira resposta');
  return feito;
}

function aceitarCnpjNaMesa_(pulados, paraVoce) {
  var feito = [];
  var novaMascara = '000.000.000-00|00.000.000/0000-00';
  var mesa = lerRegistros_('CANAIS').filter(function (canal) {
    return normalizarParaComparar_(canal.Aba) === 'basemesa';
  })[0];
  if (!mesa) {
    pulados.push('não há canal apontando para a BASE_MESA');
    return feito;
  }
  var campo = lerRegistros_('CAMPOS').filter(function (um) {
    return converterParaIdentificador_(um.CanalId) === converterParaIdentificador_(mesa.Id)
      && normalizarParaComparar_(um.ChaveTecnica) === 'documentocpf';
  })[0];
  if (!campo) {
    pulados.push('a Mesa Diamante não tem o campo do CPF');
    return feito;
  }

  var mascara = String(campo.Mascara || '').trim();
  if (mascara === novaMascara) {
    pulados.push('o campo CPF da Mesa Diamante já aceita CNPJ');
    return feito;
  }
  if (mascara && mascara !== '000.000.000-00') {
    paraVoce.push('Mesa Diamante: o campo CPF tem uma máscara personalizada ("'
      + mascara + '") e ficou como está. Para aceitar CNPJ, use em Configurações › '
      + 'Cadastrar Caso a máscara ' + novaMascara + '.');
    return feito;
  }

  var mudanca = { Mascara: novaMascara };
  var rotulo = String(campo.Rotulo || '').trim();
  if (!rotulo || normalizarParaComparar_(rotulo) === 'cpf') mudanca.Rotulo = 'CPF ou CNPJ';
  atualizarRegistro_('CAMPOS', campo.__id, mudanca);
  esquecerEstruturaLida_();
  feito.push('Mesa Diamante: o campo do CPF aceita CNPJ'
    + (mudanca.Rotulo ? ', com o nome "CPF ou CNPJ"' : ''));
  return feito;
}

function ligarAPropostaEAApoliceEmPedacos_(pulados) {
  var feito = [];

  lerRegistros_('CANAIS').forEach(function (canal) {
    var nomeDaAba = String(canal.Aba || '').trim();
    if (!nomeDaAba) return;
    if (!planilhaAtiva_().getSheetByName(nomeDaAba)) return;

    var daAba = {};
    Object.keys(RECC_PADRAO_DO_FORMULARIO).forEach(function (chave) {
      daAba[chave] = RECC_PADRAO_DO_FORMULARIO[chave];
    });
    var soDesta = RECC_PADRAO_POR_ABA[nomeDaAba] || {};
    Object.keys(soDesta).forEach(function (chave) {
      daAba[chave] = soDesta[chave];
    });

    var estrutura = estruturaDaAba_(nomeDaAba);

    Object.keys(daAba).forEach(function (chave) {
      var padrao = daAba[chave];
      if (!padrao.partirEm || !padrao.partirEm.colunas) return;

      var hospede = camposDaAbaPorChave_(nomeDaAba)[chave];
      if (!hospede) return;

      var faltando = padrao.partirEm.colunas.filter(function (cabecalho) {
        return posicaoDaColuna_(estrutura, cabecalho) < 0;
      });
      if (faltando.length) {
        pulados.push(nomeDaAba + '.' + chave + ': faltam as colunas '
          + faltando.join(', ') + ' — o campo continua como estava');
        return;
      }

      var configuracao = lerConfiguracaoDoCampo_(hospede);
      if (configuracao.partirEm) {
        pulados.push(nomeDaAba + '.' + chave + ' já parte em colunas');
        return;
      }
      configuracao.partirEm = padrao.partirEm;
      if (padrao.largura) configuracao.largura = padrao.largura;

      atualizarRegistro_('CAMPOS', hospede.__id, {
        Rotulo: padrao.rotulo || hospede.Rotulo,
        Descricao: padrao.descricao || hospede.Descricao,
        TipoCampo: padrao.tipoCampo || hospede.TipoCampo,
        Ativo: 'SIM',
        Configuracao: JSON.stringify(configuracao)
      });
      feito.push(nomeDaAba + ': "' + (padrao.rotulo || chave) + '" passa a ser '
        + 'um campo só, gravando em ' + padrao.partirEm.colunas.join(' + '));

      padrao.partirEm.colunas.forEach(function (cabecalho) {
        if (normalizarParaComparar_(cabecalho)
          === normalizarParaComparar_(hospede.Cabecalho)) return;
        var companheiro = camposDaAbaPorCabecalho_(nomeDaAba)[
          normalizarParaComparar_(cabecalho)];
        if (!companheiro) return;
        if (normalizarParaComparar_(companheiro.Ativo) !== 'sim') return;
        atualizarRegistro_('CAMPOS', companheiro.__id, { Ativo: 'NAO' });
        feito.push(nomeDaAba + ': campo "' + companheiro.Rotulo + '" saiu do '
          + 'formulário — a coluna continua sendo gravada');
      });

      esquecerEstruturaLida_();
    });
  });

  return feito;
}

const RECC_COLUNAS_QUE_SAIRAM_DA_RET = ['grupo', 'agente da central', 'relacionamento'];
const RECC_CHAVE_DAS_COLUNAS_QUE_SAIRAM_DA_RET = 'MIGRACAO.COLUNAS_FORA_DA_RET';

function tirarDoFormularioOQueSaiuDaRet_(pulados) {
  var feito = [];
  if (!planilhaAtiva_().getSheetByName('CAMPOS') || !planilhaAtiva_().getSheetByName('CONFIG')) {
    pulados.push('os campos que saíram da RET: as abas ainda não existem');
    return feito;
  }
  if (String(valorDaConfiguracao_(RECC_CHAVE_DAS_COLUNAS_QUE_SAIRAM_DA_RET, '') || '').trim()) {
    pulados.push('grupo, agente da central e relacionamento já saíram do formulário da RET');
    return feito;
  }
  var sairam = RECC_COLUNAS_QUE_SAIRAM_DA_RET.map(normalizarParaComparar_);

  lerRegistros_('CAMPOS').forEach(function (campo) {
    if (normalizarParaComparar_(campo.Aba) !== 'baseret') return;
    if (sairam.indexOf(normalizarParaComparar_(campo.Cabecalho)) < 0) return;
    if (normalizarParaComparar_(campo.Ativo) !== 'sim') return;
    atualizarRegistro_('CAMPOS', campo.__id, { Ativo: 'NAO' });
    feito.push('RET: o campo "' + (campo.Rotulo || campo.Cabecalho) + '" saiu do formulário — a '
      + 'coluna continua na planilha, com o que estava nela');
  });
  gravarConfiguracao_(RECC_CHAVE_DAS_COLUNAS_QUE_SAIRAM_DA_RET, 'Etapa 49 — '
    + Utilities.formatDate(new Date(), RECC_FUSO_HORARIO, 'dd/MM/yyyy HH:mm'));
  return feito;
}

const RECC_TELA_QUE_SAIU = 'minhaPerformance';
const RECC_CHAVE_DA_TELA_QUE_SAIU = 'MIGRACAO.SEM_MINHA_PERFORMANCE';

function tirarAMinhaPerformanceDosNiveis_(pulados) {
  var feito = [];
  if (!planilhaAtiva_().getSheetByName('CATALOGO') || !planilhaAtiva_().getSheetByName('CONFIG')) {
    pulados.push('a Minha Performance dos níveis: as abas ainda não existem');
    return feito;
  }
  if (String(valorDaConfiguracao_(RECC_CHAVE_DA_TELA_QUE_SAIU, '') || '').trim()) {
    pulados.push('a Minha Performance já saiu dos níveis de acesso');
    return feito;
  }
  lerRegistros_('CATALOGO').forEach(function (item) {
    if (normalizarParaComparar_(item.Tipo) !== 'nivelacesso') return;
    var configuracao;
    try { configuracao = JSON.parse(String(item.Configuracao || '{}')); } catch (erro) { return; }
    if (!configuracao || !Array.isArray(configuracao.telas)) return;
    if (configuracao.telas.indexOf(RECC_TELA_QUE_SAIU) < 0) return;
    configuracao.telas = configuracao.telas.filter(function (tela) {
      return tela !== RECC_TELA_QUE_SAIU;
    });
    atualizarRegistro_('CATALOGO', item.__id, { Configuracao: JSON.stringify(configuracao) });
    feito.push('Nível "' + (item.Rotulo || item.Nome) + '": a Minha Performance saiu das telas '
      + 'que ele abre (a tela deixou de existir)');
  });
  gravarConfiguracao_(RECC_CHAVE_DA_TELA_QUE_SAIU, 'Etapa 52 — '
    + Utilities.formatDate(new Date(), RECC_FUSO_HORARIO, 'dd/MM/yyyy HH:mm'));
  return feito;
}

function camposDaAbaPorChave_(nomeDaAba) {
  var porChave = {};
  lerRegistros_('CAMPOS').forEach(function (campo) {
    if (normalizarParaComparar_(campo.Aba) !== normalizarParaComparar_(nomeDaAba)) return;
    porChave[String(campo.ChaveTecnica)] = campo;
  });
  return porChave;
}

function camposDaAbaPorCabecalho_(nomeDaAba) {
  var porCabecalho = {};
  lerRegistros_('CAMPOS').forEach(function (campo) {
    if (normalizarParaComparar_(campo.Aba) !== normalizarParaComparar_(nomeDaAba)) return;
    porCabecalho[normalizarParaComparar_(campo.Cabecalho)] = campo;
  });
  return porCabecalho;
}

function migrarParaCanais() {
  exigirPortaDoEditor_('migrarParaCanais');
  var migracao = migrarParaCanais_();
  var recado = laudoDaAtualizacao_('MIGRAÇÃO PARA CANAIS', migracao.feito,
    migracao.pulados, []);
  Logger.log(recado);
  return recado;
}

function migrarParaCanais_() {
  var planilha = planilhaAtiva_();
  var feito = [];
  var pulados = [];

  var corretoras = planilha.getSheetByName('CANAIS');
  var mesas = planilha.getSheetByName('MESAS');

  var renomeouCorretoras = false;
  var renomeouCanais = false;

  if (corretoras && !planilha.getSheetByName('CORRETORAS')
    && ehAAbaDeCorretoras_(corretoras)) {
    corretoras.setName('CORRETORAS');
    renomeouCorretoras = true;
    feito.push('aba CANAIS (corretoras) renomeada para CORRETORAS');
  } else if (planilha.getSheetByName('CORRETORAS')) {
    pulados.push('CORRETORAS já existe');
  }

  if (mesas && !planilha.getSheetByName('CANAIS')) {
    mesas.setName('CANAIS');
    renomeouCanais = true;
    feito.push('aba MESAS renomeada para CANAIS');
  } else if (!mesas) {
    pulados.push('MESAS não existe (já migrada?)');
  }

  esquecerEstruturaLida_();

  ['USUARIOS', 'CAMPOS', 'PAINEIS', 'ANALISES', 'CATALOGO'].forEach(function (nome) {
    var aba = planilha.getSheetByName(nome);
    if (!aba) return;
    var cabecalhos = aba.getRange(1, 1, 1, aba.getMaxColumns()).getValues()[0];
    for (var i = 0; i < cabecalhos.length; i++) {
      if (normalizarParaComparar_(cabecalhos[i]) === 'mesaid') {

        aba.getRange(1, i + 1).setValue('CanalId');
        feito.push(nome + '.MesaId renomeada para CanalId');
        return;
      }
    }
  });

  esquecerEstruturaLida_();

  var propriedades = PropertiesService.getScriptProperties();
  [['CANAIS', 'CORRETORAS', renomeouCorretoras],
   ['MESAS', 'CANAIS', renomeouCanais]].forEach(function (trio) {
    var chaveVelha = RECC_PREFIXO_DA_SEQUENCIA + trio[0];
    var chaveNova = RECC_PREFIXO_DA_SEQUENCIA + trio[1];

    if (!trio[2]) {
      pulados.push('a aba ' + trio[0] + ' não foi renomeada agora, então a '
        + 'sequência ' + chaveVelha + ' fica onde está');
      return;
    }

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

  return { feito: feito, pulados: pulados };
}

var RECC_GRUPOS_DO_LAUDO = [
  [/^([A-Z][A-Z0-9_]*)\.(.+) já existe$/,
    function (m) { return m[1] + ' já tinha'; }, function (m) { return m[2]; }],
  [/^([A-Z][A-Z0-9_]*)\.(.+) já não existe$/,
    function (m) { return m[1] + ' já não tinha'; }, function (m) { return m[2]; }],
  [/^([A-Z][A-Z0-9_]*)\.(.+) já parte em colunas$/,
    function (m) { return m[1] + ' já partia em colunas'; }, function (m) { return m[2]; }],
  [/^(.+): o status "(.+)" já existe$/,
    function (m) { return m[1] + ' já tinha os status'; }, function (m) { return m[2]; }],
  [/^o status "(.+)" já existe na (.+)$/,
    function (m) { return m[2] + ' já tinha os status'; }, function (m) { return m[1]; }],
  [/^(.+): o status "(.+)" já não existe$/,
    function (m) { return m[1] + ' já não tinha os status'; }, function (m) { return m[2]; }],
  [/^(.+): o grupo "(.+)" da fila já está como pedido$/,
    function () { return 'Grupos da fila já como pedido'; },
    function (m) { return m[1] + ' › ' + m[2]; }],
  [/^a disponibilidade "(.+)" já existe$/,
    function () { return 'Disponibilidades que já existiam'; }, function (m) { return m[1]; }],
  [/^o canal (.+) já tem sinalizador$/,
    function () { return 'Canais que já tinham sinalizador'; }, function (m) { return m[1]; }]
];

function laudoDaAtualizacao_(titulo, feito, pulados, paraVoce) {
  var grupos = {};
  var ordem = [];
  pulados.forEach(function (texto) {
    var regra = null;
    var achado = null;
    for (var i = 0; i < RECC_GRUPOS_DO_LAUDO.length && !achado; i++) {
      achado = RECC_GRUPOS_DO_LAUDO[i][0].exec(texto);
      if (achado) regra = RECC_GRUPOS_DO_LAUDO[i];
    }
    var chave = achado ? regra[1](achado) : texto;
    if (!grupos[chave]) { grupos[chave] = []; ordem.push(chave); }
    if (achado && grupos[chave].indexOf(regra[2](achado)) < 0) {
      grupos[chave].push(regra[2](achado));
    }
  });
  var emDia = ordem.map(function (chave) {
    return grupos[chave].length ? chave + ': ' + grupos[chave].join(', ') : chave;
  });

  return titulo + '\n\n'
    + (feito.length ? 'FEITO:\n  ' + feito.join('\n  ')
      : 'Nada a mudar: a planilha já estava em dia.')
    + (paraVoce.length ? '\n\nDECISÃO SUA:\n  ' + paraVoce.join('\n  ') : '')
    + (emDia.length ? '\n\nJÁ ESTAVA EM DIA (' + pulados.length + ' conferências):\n  '
      + emDia.join('\n  ') : '')
    + '\n\nPara conferir o sistema inteiro, rode diagnosticoRECC().';
}

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

function normalizarBase() {
  exigirPortaDoEditor_('normalizarBase');
  var linhas = [];
  nomesDasAbasDoContrato_().forEach(function (nomeDaAba) {
    var laudo;
    try {
      if (posicaoDaColuna_(estruturaDaAba_(nomeDaAba), 'Id') < 0) return;
      if (!abaDeForaAceitaEscrita_(nomeDaAba).aceita) {
        linhas.push(nomeDaAba + ': fica de fora — mora na planilha de cadastros, '
          + 'que não aceita escrita.');
        return;
      }
      laudo = normalizarIdentificadoresDaAba_(nomeDaAba);
    } catch (erro) {
      linhas.push(nomeDaAba + ': não deu — ' + erro.message);
      return;
    }
    linhas.push(nomeDaAba + ': ' + laudo.carimbados + ' Id(s) novo(s)'
      + (laudo.repetidos.length
        ? '; ' + laudo.repetidos.length + ' repetido(s) — '
          + algunsExemplos_(laudo.repetidos.map(function (um) {
            return 'linha ' + um.linha + ' (Id ' + um.id + ')';
          }))
        : ''));
  });
  var recado = 'normalizarBase()\n\n' + linhas.join('\n');
  Logger.log(recado);
  return recado;
}

function verificarEstruturaRECC() {
  exigirPortaDoEditor_('verificarEstruturaRECC');
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

var RECC_SITUACOES_DO_LAUDO = { OK: 'ok', ATENCAO: 'atencao', FALHA: 'falha' };

var RECC_EXEMPLOS_NO_LAUDO = 5;

function diagnosticoRECC() {
  exigirPortaDoEditor_('diagnosticoRECC');
  var laudo = rodarDiagnostico_();
  Logger.log(laudoEmTexto_(laudo));
  return laudo;
}

function diagnosticoDoSistema() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var laudo = rodarDiagnostico_();
  registrarAuditoria_('diagnostico.rodar', '', '',
    laudo.resumo.falhas + ' falha(s), ' + laudo.resumo.atencoes + ' atenção(ões)');
  return laudo;
}

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
    rodarBloco_('sinalizadores', 'Os sinalizadores de prazo', blocoDosSinalizadores_),
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

function rodarBloco_(chave, titulo, funcao) {
  try {
    var itens = funcao();
    if (!itens || !itens.length) {

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

function algunsExemplos_(lista) {
  var mostrados = lista.slice(0, RECC_EXEMPLOS_NO_LAUDO).join(', ');
  var sobram = lista.length - RECC_EXEMPLOS_NO_LAUDO;
  return sobram > 0 ? mostrados + ' e mais ' + sobram : mostrados;
}

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

  itens.push(itemDoFusoDoProjeto_());

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

  itens.push(itemDaFilaDaAuditoria_());

  return itens;
}

const RECC_FILA_DA_AUDITORIA_QUE_PREOCUPA = 200;

function itemDaFilaDaAuditoria_() {
  var naFila = tamanhoDaFilaDaAuditoria_();
  return naFila < RECC_FILA_DA_AUDITORIA_QUE_PREOCUPA
    ? item_(RECC_SITUACOES_DO_LAUDO.OK, 'Fila da auditoria: ' + naFila + ' registro(s) esperando')
    : item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
      'Fila da auditoria: ' + naFila + ' registro(s) esperando',
      'Os registros estão guardados e não se perdem, mas não estão chegando à aba AUDITORIA: '
        + 'a trava de gravação vive ocupada.',
      'Execute atualizarPGO() no editor: ele descarrega a fila. Se ela voltar a crescer, '
        + 'confira se há uma importação ou rotina presa.');
}

function fusoDoProjeto_() {
  try {
    return typeof Session !== 'undefined' && Session.getScriptTimeZone
      ? String(Session.getScriptTimeZone() || '') : '';
  } catch (erro) {
    return '';
  }
}

function itemDoFusoDoProjeto_() {
  var fuso = fusoDoProjeto_();
  if (!fuso) {
    return item_(RECC_SITUACOES_DO_LAUDO.ATENCAO, 'Não consegui ler o fuso do projeto',
      'O Apps Script não respondeu qual é o fuso do projeto.',
      RECC_COMO_ACERTAR_O_FUSO_DO_PROJETO);
  }
  return fuso === RECC_FUSO_HORARIO
    ? item_(RECC_SITUACOES_DO_LAUDO.OK, 'O fuso do projeto é ' + fuso)
    : item_(RECC_SITUACOES_DO_LAUDO.FALHA, 'O projeto do Apps Script está em outro fuso',
      'O projeto diz "' + fuso + '" e o sistema conta o dia em "' + RECC_FUSO_HORARIO
        + '". Toda data digitada recua um dia: filtros, prazos e o mês dos relatórios.',
      RECC_COMO_ACERTAR_O_FUSO_DO_PROJETO);
}

const RECC_COMO_ACERTAR_O_FUSO_DO_PROJETO = 'No editor do Apps Script: Configurações do projeto '
  + '(a engrenagem) › Fuso horário › (GMT-03:00) Horário de Brasília - São Paulo. Ou cole o '
  + 'appsscript.json do pacote, que já vem com "America/Sao_Paulo".';

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

      itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
        aba.aba + ': ' + aba.aMais.length + ' coluna(s) suas, fora do contrato',
        algunsExemplos_(aba.aMais),
        'Nada quebra, e o sistema não mexe nelas. O formulário não pergunta essas '
          + 'colunas: o que estiver preenchido nelas aparece em "Trabalhar no caso", '
          + 'só para leitura. Para digitar nelas pelo sistema, cadastre em '
          + 'Configurações › Cadastrar Caso.'));
      return;
    }
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      aba.aba + ' está no contrato', aba.linhas + ' linha(s)'));
  });

  return itens;
}

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
            + 'alinhar agora, rode normalizarBase() no editor do Apps Script.'));
      return;
    }

    var numero = Number(guardado);
    if (!isFinite(numero)) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        nomeDaAba + ': a sequência está com lixo',
        'Valor guardado: "' + guardado + '".',
        'Rode normalizarBase() no editor do Apps Script: ela realinha sem nunca '
          + 'baixar o piso.'));
      return;
    }
    if (numero < naAba) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        nomeDaAba + ': a sequência está ABAIXO do maior Id gravado',
        'Sequência em ' + numero + ', maior Id na aba '
          + formatarIdentificador_(naAba) + '. A próxima gravação vai reemitir '
          + 'um Id que já existe.',
        'Rode normalizarBase() no editor do Apps Script antes de gravar qualquer '
          + 'coisa.'));
      return;
    }
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      nomeDaAba + ': sequência em ' + formatarIdentificador_(numero)));
  });

  return itens;
}

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
        'Duas linhas com o mesmo Id fazem a edição achar a errada. Na planilha, '
          + 'apague o Id da linha que é a cópia e rode normalizarBase() no editor: '
          + 'ela dá um Id novo a quem ficou sem.'));
    }

    if (semId) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
        nomeDaAba + ': ' + semId + ' linha(s) sem Id',
        'Linha digitada direto na planilha nasce sem Id, e sem Id o sistema '
          + 'não consegue editá-la nem ocultá-la.',
        'Rode normalizarBase() no editor do Apps Script: ela carimba Id em quem '
          + 'está sem, e '
          + 'não toca em mais nada da linha.'));
    }

    if (!geral && !repetidos.length && !semId) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
        nomeDaAba + ': ' + quantas + ' Id(s), todos únicos e em texto'));
    }
  });

  return itens;
}

function blocoDasCanais_() {
  var itens = [];
  var canais = lerRegistros_('CANAIS');

  if (!canais.length) {
    return [item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Não há nenhum canal cadastrado',
      'Sem canal, o Trabalho, o cadastro e a busca não têm onde procurar.',
      'Rode instalarRECC() ou cadastre em Configurações › Canais de trabalho.')];
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
     ['ColunaDaPrimeiraResposta', 'coluna da primeira resposta'],
     ['ColunaDaHoraDaPrimeiraResposta', 'coluna da hora da primeira resposta'],
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
        'Acerte em Configurações › Canais de trabalho, ou acrescente a coluna em '
          + nomeDaAba + '. A aba tem: ' + estrutura.cabecalhos.join(', ') + '.'));
      return;
    }

    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      'O canal "' + nome + '" está coerente com ' + nomeDaAba
        + (ligada ? '' : ' (desligada)')));
  });

  var statusSemCanal = lerRegistros_('CATALOGO').filter(function (item) {
    return normalizarParaComparar_(item.Tipo) === 'status'
      && !converterParaIdentificador_(item.CanalId);
  }).map(function (item) { return String(item.Nome); });
  if (statusSemCanal.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
      statusSemCanal.length + ' status sem canal: aparecem em todos os canais',
      algunsExemplos_(statusSemCanal),
      'Se cada um é de um canal só, escolha o canal dele em Configurações › Ajustes '
        + 'Gerais › Status, no menu "Canal". Se é mesmo de todos, pode deixar.'));
  }

  if (!ativas) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Nenhum canal está ligado',
      'Existem ' + canais.length + ' canal(is) cadastrado(s), e todos desligados.',
      'Ligue pelo menos um em Configurações › Canais de trabalho. Sem canal ligado o '
        + 'Trabalho abre vazio.'));
  }

  return itens;
}

function colunasCitadas_(texto) {
  var declarado = String(texto || '');
  if (!declarado.trim()) return [];

  var pedacos = declarado.indexOf(':') < 0
    ? declarado.split(',')
    : declarado.split(';').map(function (grupo) {
      var corte = grupo.indexOf(':');
      return corte < 0 ? grupo : grupo.substring(corte + 1);
    }).join(',').split(',');

  return pedacos.join('+').split('+')
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
  var desligadosSemColuna = [];
  var obrigatoriosDesligados = [];
  var grafiaDiferente = [];
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
      var qual = String(campo.Rotulo || cabecalho) + ' → ' + nomeDaAba + '.' + cabecalho;

      if (normalizarParaComparar_(campo.Ativo) === 'sim') semColuna.push(qual);
      else desligadosSemColuna.push(qual);
      return;
    }
    var naPlanilha = estrutura.cabecalhos[posicaoDaColuna_(estrutura, cabecalho)];
    if (naPlanilha !== cabecalho) {
      grafiaDiferente.push(nomeDaAba + ': "' + cabecalho + '" no CAMPOS, "' + naPlanilha
        + '" na planilha');
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
        + 'Desligue o campo em Configurações › Cadastrar Caso, ou acrescente a coluna.'));
  }

  if (obrigatoriosDesligados.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
      obrigatoriosDesligados.length + ' campo(s) obrigatório(s) estão desligados',
      algunsExemplos_(obrigatoriosDesligados),
      'Desligado, o campo não aparece no formulário — e a obrigatoriedade '
        + 'deixa de valer. Se ele é mesmo obrigatório, ligue; se não é, tire '
        + 'a marca de obrigatório, para o cadastro não mentir.'));
  }

  if (grafiaDiferente.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
      grafiaDiferente.length + ' campo(s) com o nome escrito diferente da planilha',
      algunsExemplos_(grafiaDiferente),
      'Nada quebra: o sistema acha a coluna nos dois jeitos. Se quiser os dois iguais, '
        + 'acerte o cabeçalho na planilha ou a coluna Cabecalho na aba CAMPOS — lembrando '
        + 'que o Power BI lê o nome que está na planilha.'));
  }

  if (!semColuna.length && !obrigatoriosDesligados.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      'Os ' + (campos.length - desligadosSemColuna.length)
        + ' campos apontam para colunas que existem'));
  }

  if (desligadosSemColuna.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      desligadosSemColuna.length + ' campo(s) desligado(s) sem a coluna na planilha',
      algunsExemplos_(desligadosSemColuna),
      'Nada quebra: o campo está desligado e não aparece no formulário. Se quiser '
        + 'a aba CAMPOS limpa, exclua a linha dele — e depois aperte "Aplicar '
        + 'mudanças da planilha agora", em Configurações › Estrutura.'));
  }

  return itens;
}

function blocoDosPaineis_() {
  var itens = [];
  var componentes = lerRegistros_('PAINEIS');

  if (!componentes.length) {
    return [item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
      'Não há nenhum card nem gráfico cadastrado',
      'O Trabalho abre só com a fila, e a Produtividade RECC abre vazio.',
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

function blocoDosSinalizadores_() {
  if (!planilhaAtiva_().getSheetByName('SINALIZADORES')) {
    return [item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
      'A aba SINALIZADORES não existe',
      'Sem ela os selos de prazo não aparecem no Trabalho nem na Produtividade RECC.',
      'Rode atualizarPGO() no editor do Apps Script.')];
  }

  var linhas = lerRegistros_('SINALIZADORES');
  if (!linhas.length) {
    return [item_(RECC_SITUACOES_DO_LAUDO.OK, 'Nenhum sinalizador cadastrado')];
  }

  var canaisPorId = {};
  lerRegistros_('CANAIS').forEach(function (canal) {
    canaisPorId[converterParaIdentificador_(canal.Id)] = canal;
  });

  var itens = [];
  linhas.forEach(function (linha) {
    var sinalizador = sinalizadorDaLinha_(linha);
    var nome = '"' + sinalizador.nome + '"';
    var canal = canaisPorId[sinalizador.canalId];

    if (!canal) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        'O sinalizador ' + nome + ' aponta para um canal que não existe',
        'Ele não sinaliza caso nenhum.',
        'Tire-o da lista em Configurações › Sinalizadores.'));
      return;
    }
    var rotulo = 'O sinalizador ' + nome + ' (' + String(canal.Nome) + ')';

    if (!sinalizador.ativo) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK, rotulo + ' está desligado'));
      return;
    }
    if (sinalizador.prazo <= 0) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.ATENCAO, rotulo + ' está ligado sem prazo',
        'Com prazo zero ele não sinaliza nada.',
        'Defina o prazo em Configurações › Sinalizadores, ou desligue-o.'));
      return;
    }

    var estrutura = estruturaDaAba_(String(canal.Aba || ''));
    var perdidas = [sinalizador.colunaQueLiga, sinalizador.colunaDaData,
      sinalizador.colunaDaHora, sinalizador.colunaDaCondicao,
      sinalizador.colunaDaDataDaCondicao].filter(function (coluna) {
      return coluna && posicaoDaColuna_(estrutura, coluna) < 0;
    });
    if (perdidas.length) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        rotulo + ' cita coluna que a base não tem',
        algunsExemplos_(perdidas),
        'Sem ela o caso vencido passa sem selo. Acerte em Configurações › '
        + 'Sinalizadores — ou, se é a "' + RECC_COLUNA_DATA_DO_ENCAMINHAMENTO
        + '", rode atualizarPGO().'));
      return;
    }

    var preenchidos = [sinalizador.statusComCondicao, sinalizador.colunaDaCondicao,
      sinalizador.valoresDaCondicao.length, sinalizador.colunaDaDataDaCondicao]
      .filter(Boolean).length;
    if (preenchidos && preenchidos < 4) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        rotulo + ' tem a condição de parada pela metade',
        'Ela pede o status, a coluna, os valores e a coluna da data — os quatro.',
        'Complete ou limpe a condição em Configurações › Sinalizadores.'));
      return;
    }
    if (temCondicaoDeParada_(sinalizador)) {
      var statusDoCanal = situacoesDoCanal_({ id: canal.Id });
      if (!statusDoCanal.some(function (situacao) {
        return condicaoBate_({ valores: [situacao.gravadoComo] }, sinalizador.statusComCondicao);
      })) {
        itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
          rotulo + ' cita o status "' + sinalizador.statusComCondicao + '", que o canal não tem',
          'A condição nunca valeria, e o status encerraria como qualquer outro.',
          'Escolha um status do canal em Configurações › Sinalizadores.'));
        return;
      }
      var campoDaCondicao = lerRegistros_('CAMPOS').filter(function (campo) {
        return String(campo.Aba) === String(canal.Aba)
          && normalizarParaComparar_(campo.Cabecalho)
            === normalizarParaComparar_(sinalizador.colunaDaCondicao);
      })[0];
      var opcoesDaCondicao = campoDaCondicao
        ? opcoesDoCampo_(lerConfiguracaoDoCampo_(campoDaCondicao), canal.Id) : [];
      var foraDaLista = opcoesDaCondicao.length ? sinalizador.valoresDaCondicao.filter(function (valor) {
        return !opcoesDaCondicao.some(function (opcao) {
          return condicaoBate_({ valores: [opcao.valor] }, valor);
        });
      }) : [];
      if (foraDaLista.length) {
        itens.push(item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
          rotulo + ' espera valor que a lista de "' + sinalizador.colunaDaCondicao + '" não tem',
          algunsExemplos_(foraDaLista),
          'Renomeou um item da lista? Acerte os valores em Configurações › Sinalizadores: '
          + 'sem isso o prazo do ' + sinalizador.statusComCondicao + ' nunca para.'));
        return;
      }
    }

    var deOndeContar = sinalizador.colunaDaData || String(canal.ColunaDaData || '').trim();
    if (!deOndeContar) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        rotulo + ' não tem de onde começar a contar',
        'Nem ele nem o canal declaram uma coluna de data.',
        'Escolha a data em Configurações › Sinalizadores.'));
      return;
    }

    var temFinal = situacoesDoCanal_({ id: canal.Id }).some(function (situacao) {
      return situacao.final;
    });
    if (!temFinal) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
        rotulo + ' não tem onde parar',
        'O canal não tem nenhum status marcado como final, e o prazo só para num '
        + 'status final: todo caso acabaria vermelho.',
        'Marque os status finais em Configurações › Ajustes Gerais.'));
      return;
    }

    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK, rotulo + ' está coerente',
      regraDoSinalizador_(sinalizador)));
  });
  return itens;
}

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

function arquivosDeTelaQueFaltam_() {
  return telasIncluidasNoIndex_().filter(function (nome) {
    return !existeArquivoDeTela_(nome);
  });
}

function existeArquivoDeTela_(nome) {
  try {
    HtmlService.createTemplateFromFile(nome).getRawContent();
    return true;
  } catch (erro) {
    return false;
  }
}

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

const RECC_CHAVE_DOS_CARDS_DA_RET = 'MIGRACAO.CARDS_DA_RET';

function montarOsCardsDaRet_(pulados, paraVoce) {
  var feito = [];
  if (!planilhaAtiva_().getSheetByName('PAINEIS') || !planilhaAtiva_().getSheetByName('CANAIS')) {
    pulados.push('os cards da RET: as abas ainda não existem');
    return feito;
  }
  if (String(valorDaConfiguracao_(RECC_CHAVE_DOS_CARDS_DA_RET, '') || '').trim()) {
    pulados.push('os cards da RET já foram montados (agora quem manda é Configurações)');
    return feito;
  }
  var ret = canaisVisiveis_().filter(function (canal) { return canal.aba === 'BASE_RET'; })[0];
  if (!ret) { pulados.push('o canal BASE_RET não está ligado'); return feito; }

  var faltando = [];
  var situacoes = situacoesDoCanal_(ret);
  function status(nome) {
    var achado = situacoes.filter(function (s) {
      return normalizarParaComparar_(s.gravadoComo) === normalizarParaComparar_(nome)
        || normalizarParaComparar_(s.nome) === normalizarParaComparar_(nome);
    })[0];
    if (!achado) faltando.push('o status "' + nome + '"');
    return achado;
  }
  var pendente = status('Pendente');
  var contatando = status('Contatando');

  var aguardando = null;
  var campo = camposAtivosDoCanal_(ret.id).filter(function (um) {
    return normalizarParaComparar_(um.Cabecalho) === 'statusproposta';
  })[0];
  if (!campo) {
    faltando.push('o campo "Status proposta"');
  } else {
    var opcao = opcoesDoCampo_(lerConfiguracaoDoCampo_(campo), ret.id).filter(function (o) {
      return normalizarParaComparar_(o.valor) === 'aguardandotransmissao';
    })[0];
    if (!opcao) faltando.push('o item "Aguardando transmissão" na lista do Status proposta');
    else aguardando = { coluna: grafiaDaColuna_(ret.aba, campo.Cabecalho), valor: opcao.valor };
  }

  if (faltando.length) {
    paraVoce.push('Os cards do Trabalho da RET NÃO foram montados, porque falta ' + faltando.join(', ')
      + '. Crie o que falta (ou ajuste o nome) e rode atualizarPGO() de novo — ou monte os '
      + 'cards em Configurações › Painéis › Cards do Trabalho.');
    return feito;
  }

  salvarCardsDoPainel('trabalho', ret.id, [
    { titulo: 'Total de casos', dimensao: 'total', filtro: '', cor: 'neutro', mostrar: true },
    { titulo: 'Aguardando transmissão', dimensao: 'valor', coluna: aguardando.coluna,
      filtro: aguardando.valor, cor: 'atencao', mostrar: true },
    { titulo: pendente.nome, dimensao: 'situacao', filtro: pendente.gravadoComo,
      cor: pendente.tom || 'neutro', mostrar: true },
    { titulo: contatando.nome, dimensao: 'situacao', filtro: contatando.gravadoComo,
      cor: contatando.tom || 'neutro', mostrar: true }
  ]);
  gravarConfiguracao_(RECC_CHAVE_DOS_CARDS_DA_RET, 'Etapa 44 — '
    + Utilities.formatDate(new Date(), RECC_FUSO_HORARIO, 'dd/MM/yyyy HH:mm'));
  feito.push('RET: os cards do Trabalho ficaram Total de casos, Aguardando transmissão (do '
    + 'Status proposta), Pendente e Contatando — os outros foram desligados');
  return feito;
}
