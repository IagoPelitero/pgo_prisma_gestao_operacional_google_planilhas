/**
 * ============================================================================
 * PGO — testes-busca.js · a Etapa 7
 * ============================================================================
 * A busca tem uma regra que vale mais que todas as outras: **ler a coluna
 * antes de ler as linhas**. Numa base de 200 mil linhas por 39 colunas, ler
 * tudo são 7,8 milhões de células — o Apps Script não termina.
 *
 * Os testes aqui cobrem essa regra, a comparação que ignora máscara, o
 * alcance do nível e a planilha legada, que é a única coisa deste sistema
 * lida sem contrato nenhum.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario } =
  require('./ferramentas');

function rodarTestesDeBusca() {
  console.log('\nEtapa 7 — Buscar Caso');

  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');

  const canal = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_MESA');
  const ret = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');

  // Casos velhos de propósito: a busca existe justamente para o que a fila
  // dos 30 dias não mostra mais.
  chamar('inserirVariosRegistros_')('BASE_MESA', [
    { Analista: 'Ana Martins', Status: 'Pendente', 'Data de entrada': '02/01/2026',
      'Nome do segurado': 'Vanessa Duarte Lima', 'Documento (CPF)': '12345678901',
      Corretora: 'Corretora ABC', SUSEP: '1234567' },
    { Analista: 'Diego Castilho', Status: 'Concluído', 'Data de entrada': '15/02/2026',
      'Nome do segurado': 'Otávio Bandeira', 'Documento (CPF)': '99988877766',
      Corretora: 'Corretora XYZ' }
  ]);
  chamar('inserirVariosRegistros_')('BASE_RET', [
    { analista: 'Marcos Vieira', status: 'Pendente',
      'data de recepção do protocolo': '10/03/2026',
      'nome do cliente': 'Cliente Antigo', protocolo: 'RET-2026-0042',
      CPF: '12345678901', Num_apolice: '0000077777' }
  ]);

  secao('O que a tela oferece');

  teste('a tela abre sabendo onde dá para procurar', () => {
    const opcoes = chamar('opcoesDaBusca()');
    igual(opcoes.canais.length, 2);
    igual(opcoes.minimo, 3);
    igual(opcoes.legado.ligado, false, 'instalação nova não tem base legada');

    const daRet = opcoes.canais.find((m) => m.nome === 'RET');
    verdadeiro(daRet.procuraEm.indexOf('protocolo') >= 0,
      'o canal diz em quais colunas procura — quem procura precisa saber');
  });

  teste('termo curto demais é recusado, com o motivo', () => {
    lanca(() => chamar('buscarCasos')('ab', [], false), 'ao menos 3 caracteres');
  });

  secao('Achar');

  teste('acha pelo protocolo, no canal certa', () => {
    const achado = chamar('buscarCasos')('RET-2026-0042', [], false);
    igual(achado.total, 1);
    const daRet = achado.origens.find((o) => o.nome === 'RET');
    igual(daRet.casos.length, 1);
    verdadeiro(JSON.stringify(daRet.casos[0].celulas).includes('Cliente Antigo'));
  });

  teste('a comparação ignora ponto e traço, nos dois sentidos', () => {
    // Exigir o formato exato transformaria a busca em adivinhação.
    igual(chamar('buscarCasos')('123.456.789-01', [], false).total, 2,
      'o CPF com máscara acha os dois casos gravados sem máscara');
    igual(chamar('buscarCasos')('12345678901', [], false).total, 2,
      'e sem máscara acha os mesmos');
  });

  teste('acha pedaço do nome, sem acento e sem caixa', () => {
    igual(chamar('buscarCasos')('vanessa duarte', [], false).total, 1);
    igual(chamar('buscarCasos')('OTAVIO', [], false).total, 1,
      'sem acento e em maiúsculas acha o mesmo');
  });

  teste('a busca alcança o que a fila dos 30 dias já não mostra', () => {
    const noPainel = chamar('resumoDoCanal')(canal.id, {}).total;
    igual(noPainel, 0, 'os casos de exemplo são de janeiro e fevereiro');
    verdadeiro(chamar('buscarCasos')('Vanessa', [], false).total > 0,
      'e a busca acha os mesmos casos — é para isso que ela existe');
  });

  teste('dá para procurar só num canal', () => {
    const so = chamar('buscarCasos')('12345678901', [canal.id], false);
    igual(so.origens.length, 1);
    igual(so.origens[0].nome, 'Mesa Diamante');
    igual(so.total, 1);
  });

  teste('caso excluído não volta na busca', () => {
    // Antes a exclusão era lógica e dava para trazer de volta. Agora a linha
    // sai da planilha: por isso este teste cadastra um caso só para apagar,
    // em vez de apagar um que os testes seguintes ainda usam.
    const novo = chamar('cadastrarCaso')(canal.id, {
      status: 'Em andamento', nomedosegurado: 'Apagavel Silva',
      analista: 'primeiro.adm'
    });
    igual(chamar('buscarCasos')('Apagavel', [canal.id], false).total, 1);

    chamar('excluirCaso')(canal.id, novo.id);
    igual(chamar('buscarCasos')('Apagavel', [canal.id], false).total, 0);
  });

  teste('a busca respeita o alcance do nível', () => {
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    chamar('salvarUsuario')({
      nome: 'Ana Martins', email: 'ana@exemplo.com',
      nivelAcessoId: operacao.Id, ativo: true
    });

    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      // A Ana só enxerga os casos dela: acha a Vanessa, que é dela, e não o
      // Otávio, que é do Diego.
      igual(chamar('buscarCasos')('Vanessa', [canal.id], false).total, 1);
      igual(chamar('buscarCasos')('Otávio', [canal.id], false).total, 0,
        'esconder na fila e mostrar na busca seria uma porta dos fundos');
    });
  });

  secao('Só as colunas declaradas');

  teste('a busca procura SÓ nas colunas que o canal declarou', () => {
    // O "sistema" da RET é SIVIDA em todos os casos. Ele não está entre as
    // colunas de busca, então procurar por ele não acha nada — e é assim que
    // a tela não lê a base inteira.
    chamar('atualizarRegistro_')('BASE_RET',
      chamar('lerRegistros_')('BASE_RET')[0].__id, { sistema: 'SIVIDA' });

    igual(chamar('buscarCasos')('SIVIDA', [ret.id], false).total, 0,
      'coluna fora da lista de busca não é lida');

    // E declarando a coluna, passa a achar. Sem programador no meio.
    chamar('salvarCanal')({
      id: ret.id, nome: ret.nome,
      colunaDaData: 'data de recepção do protocolo', colunaDoStatus: 'status',
      colunasDaBusca: 'protocolo, sistema'
    });
    igual(chamar('buscarCasos')('SIVIDA', [ret.id], false).total, 1);
  });

  teste('canal sem coluna de busca declarada avisa, em vez de ler tudo', () => {
    chamar('salvarCanal')({
      id: ret.id, nome: ret.nome,
      colunaDaData: 'data de recepção do protocolo', colunaDoStatus: 'status',
      colunasDaBusca: ''
    });
    const origem = chamar('buscarCasos')('qualquer coisa', [ret.id], false)
      .origens[0];
    igual(origem.casos.length, 0);
    contem(origem.aviso, 'não declarou em quais colunas procurar');
  });

  secao('A planilha legada');

  teste('sem Id apontado, a origem legada nem aparece', () => {
    igual(chamar('buscarCasos')('Vanessa', [], true).origens
      .filter((o) => o.tipo === 'legado').length, 0);
  });

  teste('Id que não abre é recusado na hora de salvar, com o motivo', () => {
    // Guardar um Id quebrado deixaria a busca com um recado de erro para
    // sempre, sem ninguém saber se era o Id ou a planilha que sumiu.
    lanca(() => chamar('salvarConfiguracaoDoLegado')({ planilhaId: 'nao-existe' }),
      'Não consegui abrir a planilha');
  });

  teste('a busca também olha a planilha legada, e diz de onde veio', () => {
    const idDoLegado = ambiente.criarPlanilhaExterna('Legado 4.x', [
      ['Protocolo', 'Cliente', 'CPF', 'Situação'],
      ['ANT-0001', 'Vanessa Duarte Lima', '123.456.789-01', 'Encerrado'],
      ['ANT-0002', 'Outro Cliente', '00000000000', 'Encerrado']
    ]);
    chamar('salvarConfiguracaoDoLegado')({
      planilhaId: idDoLegado, aba: '', rotulo: 'PGO 4.x'
    });

    igual(chamar('opcoesDaBusca()').legado.ligado, true);

    const achado = chamar('buscarCasos')('12345678901', [], true);
    const doLegado = achado.origens.find((o) => o.tipo === 'legado');
    igual(doLegado.nome, 'PGO 4.x');
    igual(doLegado.casos.length, 1, 'o CPF com máscara na planilha antiga casa');
    igual(doLegado.somenteLeitura, true,
      'linha de histórico não é caso do sistema — não abre nem se edita');
    igual(doLegado.cabecalhos.join(', '), 'Protocolo, Cliente, CPF, Situação',
      'a primeira linha é o cabeçalho, e nada mais é assumido');
  });

  teste('a planilha legada fora do ar não derruba a busca na base própria', () => {
    chamar('gravarConfiguracao_')('LEGADO.PLANILHA_ID', 'sumiu-do-drive');

    const achado = chamar('buscarCasos')('Vanessa', [], true);
    verdadeiro(achado.total > 0, 'a base própria continua respondendo');
    const doLegado = achado.origens.find((o) => o.tipo === 'legado');
    contem(doLegado.aviso, 'Não consegui abrir a planilha legada');
  });

  secao('A tela');

  teste('a página inclui a tela, e a rota chama ela', () => {
    const pasta = path.join(__dirname, '..', '..', 'Front-End');
    contem(fs.readFileSync(path.join(pasta, 'Index.html'), 'utf8'),
      "incluir('BuscarCaso')");
    contem(fs.readFileSync(path.join(pasta, 'Aplicacao.html'), 'utf8'),
      'TelaBuscarCaso.montar(pacote)');

    const tela = fs.readFileSync(path.join(pasta, 'BuscarCaso.html'), 'utf8');
    contem(tela, "Servidor.chamar('buscarCasos'");
    contem(tela, "Servidor.chamar('opcoesDaBusca'");
    // O mesmo modal do Trabalho: aprender duas telas para o mesmo caso é
    // uma a mais do que o necessário.
    contem(tela, 'CasoEmModal.abrir(');
  });

  teste('a tela abre sem carregar nada da base', () => {
    const tela = fs.readFileSync(
      path.join(__dirname, '..', '..', 'Front-End', 'BuscarCaso.html'), 'utf8');
    const montar = tela.substring(tela.indexOf('function montar('),
      tela.indexOf('function desenharOnde('));
    verdadeiro(montar.indexOf('Servidor.chamar') < 0,
      'montar não pode pedir dado: abrir a busca tem de custar zero');
  });
}

module.exports = { rodarTestesDeBusca };
