/**
 * ============================================================================
 * PGO — testes-relatorio-de-casos.js · exportar relatório na Produtividade (Etapa 73)
 * ============================================================================
 * Pedido do PO: "minha sênior precisava emitir um relatório com os casos que
 * vieram da central" — "em Produtividade RECC será onde irá ficar a exportação,
 * onde a sênior irá escolher a data, a coluna ou alguns prontos".
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario } = require('./ferramentas');

const DA_RET = 'data de recepção do protocolo';
const tela = (nome) => fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', nome + '.html'), 'utf8');

function diasAtras(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

const escrita = (data) => [data.getDate(), data.getMonth() + 1].map((n) => (n < 10 ? '0' : '') + n)
  .concat(data.getFullYear()).join('/');

function preparar() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  t.vg = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_VG');
  t.casos = (linhas) => t.chamar('inserirVariosRegistros_')('BASE_RET', linhas);
  const hoje = new Date();
  t.casos([
    { [DA_RET]: hoje, status: 'Pendente', canal: 'Central', analista: 'Ana Martins',
      'nome do cliente': 'Da central', CPF: '00900000007', 'valor do prêmio': 1234.5 },
    { [DA_RET]: hoje, status: 'Retido', canal: 'Central', analista: 'Diego Castilho',
      'nome do cliente': 'Silva; Souza "ME"', CPF: '12345678901' },
    { [DA_RET]: hoje, status: 'Não retido', canal: 'URA', analista: 'Ana Martins',
      'nome do cliente': '=SOMA(A1)' },
    { [DA_RET]: hoje, status: 'Pendente', canal: 'URA', analista: 'Diego Castilho',
      'nome do cliente': 'Duas\nlinhas' },
    // Fora do mês: só entra quando o período do relatório o alcança.
    { [DA_RET]: diasAtras(45), status: 'Pendente', canal: 'Central', analista: 'Ana Martins',
      'nome do cliente': 'Antigo da central', 'Data da primeira mudança de status': diasAtras(40) }
  ]);
  t.opcoes = (canal) => t.chamar('opcoesDoRelatorio')((canal || t.ret).id);
  t.pedir = (pedido) => t.chamar('relatorioDeCasos')(t.ret.id, Object.assign({
    relatorio: 'todos', colunas: ['nome do cliente', 'status', 'canal'] }, pedido));
  t.linhas = (pedido) => t.pedir(pedido).conteudo.split('\n');
  t.longo = { tipo: 'intervalo', de: escrita(diasAtras(60)), ate: escrita(new Date()) };
  return t;
}

function rodarTestesDoRelatorioDeCasos() {
  console.log('\nEtapa 73: exportar relatório na Produtividade');

  /* ----------------------------------------------------------------------- */
  secao('Os relatórios prontos');

  teste('a RET oferece os seis; o canal sem a coluna ou sem prazo não ganha o que não tem', () => {
    const t = preparar();
    igual(t.opcoes().relatorios.map((r) => r.id).join(','),
      'central,todos,foraDoPrazo,retidos,coluna,filtrado');
    const doVg = t.opcoes(t.vg).relatorios.map((r) => r.id);
    verdadeiro(doVg.indexOf('todos') >= 0 && doVg.indexOf('filtrado') >= 0, doVg.join(','));
    verdadeiro(doVg.indexOf('central') < 0 && doVg.indexOf('foraDoPrazo') < 0
      && doVg.indexOf('retidos') < 0, doVg.join(','));
  });

  teste('"vieram da Central": só os casos com a Central no canal de origem', () => {
    const t = preparar();
    const linhas = t.linhas({ relatorio: 'central' });
    igual(linhas[0], 'nome do cliente;canal;status', 'o cabeçalho é o da planilha, na ordem dela');
    igual(linhas.length, 3, 'dois casos do mês');
    verdadeiro(linhas.slice(1).every((l) => /;Central;/.test(l)), linhas.join(' | '));
  });

  teste('a Central com outro nome ("Central de atendimento") continua valendo', () => {
    const t = preparar();
    t.casos([{ [DA_RET]: new Date(), status: 'Pendente', canal: 'Central de atendimento',
      'nome do cliente': 'Nome novo' }]);
    igual(t.pedir({ relatorio: 'central', soConferir: true }).quantos, 3);
  });

  teste('"todos" traz o período inteiro; "retidos e não retidos", só os dois status', () => {
    const t = preparar();
    igual(t.pedir({ soConferir: true }).quantos, 4);
    const retidos = t.linhas({ relatorio: 'retidos' });
    igual(retidos.length, 3);
    verdadeiro(retidos.slice(1).every((l) => /;(Retido|Não retido)$/.test(l)), retidos.join(' | '));
  });

  teste('"fora do prazo": o caso que estourou entra, o de hoje não', () => {
    const t = preparar();
    // O prazo deste começou agora: está correndo, e dentro.
    t.casos([{ [DA_RET]: new Date(), status: 'Pendente', 'nome do cliente': 'No prazo',
      'Data da primeira mudança de status': new Date() }]);
    const fora = t.linhas({ relatorio: 'foraDoPrazo', periodo: t.longo });
    igual(fora.length, 2, fora.join(' | '));
    contem(fora[1], 'Antigo da central');
  });

  teste('"por uma coluna": os valores marcados — e recusa sem coluna ou sem valor', () => {
    const t = preparar();
    const pedido = { relatorio: 'coluna', coluna: 'status', valores: ['Pendente', 'Retido'], soConferir: true };
    const resposta = t.pedir(pedido);
    igual(resposta.quantos, 3);
    contem(resposta.descricao, 'Pendente, Retido');
    lanca(() => t.pedir({ relatorio: 'coluna', coluna: 'status', valores: [] }), 'pelo menos um valor');
    lanca(() => t.pedir({ relatorio: 'coluna', coluna: 'não existe', valores: ['x'] }), 'Escolha a coluna');
  });

  teste('"o que está filtrado na tela": os filtros da tela, com várias opções', () => {
    const t = preparar();
    const status = t.chamar('produtividadeDaEquipe')(t.ret.id, {}).filtrosDisponiveis
      .find((f) => f.cabecalho.toLowerCase() === 'status');
    const resposta = t.pedir({ relatorio: 'filtrado', filtros: { [status.chave]: ['Retido', 'Não retido'] },
      soConferir: true });
    igual(resposta.quantos, 2);
    contem(resposta.descricao, 'Status: ');
    contem(resposta.descricao, 'Não retido');
    contem(t.pedir({ relatorio: 'filtrado', soConferir: true }).descricao, 'Nenhum filtro ligado');
  });

  teste('relatório que não existe, ou que o canal não oferece, é recusado', () => {
    const t = preparar();
    lanca(() => t.pedir({ relatorio: 'inventado' }), 'qual relatório');
    lanca(() => t.chamar('relatorioDeCasos')(t.vg.id, { relatorio: 'central', colunas: ['CNPJ'] }),
      'qual relatório');
  });

  /* ----------------------------------------------------------------------- */
  secao('O período é o do relatório');

  teste('o caso de 45 dias atrás só entra quando o período o alcança', () => {
    const t = preparar();
    igual(t.pedir({ relatorio: 'central', soConferir: true }).quantos, 2, 'na abertura: o mês');
    const longo = t.pedir({ relatorio: 'central', periodo: t.longo, soConferir: true });
    igual(longo.quantos, 3);
    igual(longo.periodo.de + ' a ' + longo.periodo.ate, t.longo.de + ' a ' + t.longo.ate);
  });

  teste('período maior do que o sistema lê de uma vez: a resposta avisa', () => {
    const t = preparar();
    igual(t.pedir({ soConferir: true }).truncada, false);
    t.chamar('gravarConfiguracao_')('OPERACAO.LINHAS_DO_PAINEL', '2');
    t.chamar('esquecerCacheDaConfiguracao_()');
    igual(t.pedir({ soConferir: true }).truncada, true);
  });

  /* ----------------------------------------------------------------------- */
  secao('As colunas');

  teste('saem só as marcadas, na ordem da planilha', () => {
    const t = preparar();
    igual(t.linhas({ colunas: ['status', 'nome do cliente'] })[0], 'nome do cliente;status', 'não na ordem do pedido');
    lanca(() => t.pedir({ colunas: [] }), 'pelo menos uma coluna');
    lanca(() => t.pedir({ colunas: ['coluna que não existe'] }), 'pelo menos uma coluna');
  });

  teste('a coluna criada pela operação aparece; a de controle nunca', () => {
    const t = preparar();
    t.chamar('adicionarColuna_')('BASE_RET', 'Coluna da operação', 'texto');
    const nomes = t.opcoes().colunas.map((c) => c.cabecalho);
    verdadeiro(nomes.indexOf('Coluna da operação') >= 0);
    verdadeiro(nomes.every((nome) => nome.charAt(0) !== '_'), nomes.join(','));
    lanca(() => t.pedir({ colunas: ['_Visivel'] }), 'pelo menos uma coluna');
  });

  teste('o campo oculto para o nível não aparece nem sai, mesmo pedido direto', () => {
    const t = preparar();
    const campo = t.chamar('lerRegistros_')('CAMPOS')
      .find((c) => String(c.CanalId) === String(t.ret.id) && c.Cabecalho === 'CPF');
    const nivel = t.chamar('lerRegistros_')('CATALOGO')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Coordenação');
    const permissoes = JSON.parse(nivel.Configuracao);
    permissoes.campos = { [campo.ChaveTecnica]: 'oculto' };
    t.chamar('atualizarRegistro_')('CATALOGO', nivel.Id, { Configuracao: JSON.stringify(permissoes) });
    t.chamar('salvarUsuario')({ nome: 'Carla Coord', email: 'carla@exemplo.com',
      nivelAcessoId: nivel.Id, canalId: '', ativo: true });
    t.chamar('esquecerCacheDaConfiguracao_()');
    comoUsuario(t.ambiente, 'carla@exemplo.com', () => {
      verdadeiro(t.opcoes().colunas.every((c) => c.cabecalho !== 'CPF'), 'não é oferecida');
      igual(t.linhas({ colunas: ['CPF', 'status'] })[0], 'status', 'e não sai');
    });
  });

  teste('abre com as colunas da fila; depois de exportar, com as que a pessoa marcou', () => {
    const t = preparar();
    const antes = t.opcoes().colunas;
    verdadeiro(antes.some((c) => c.marcada) && antes.every((c) => c.marcada === c.daFila),
      'as da fila, enquanto não há escolha guardada');
    t.pedir({ colunas: ['status', 'CPF'], soConferir: true });
    verdadeiro(t.opcoes().colunas.every((c) => c.marcada === c.daFila), 'conferir não guarda');
    t.pedir({ colunas: ['status', 'CPF'] });
    igual(t.opcoes().colunas.filter((c) => c.marcada).map((c) => c.cabecalho).sort().join(','), 'CPF,status');
  });

  /* ----------------------------------------------------------------------- */
  secao('O arquivo, do jeito que o Excel abre certo');

  teste('CPF com zero à esquerda, ponto e vírgula, aspas, fórmula e quebra de linha', () => {
    const t = preparar();
    const linhas = t.linhas({ colunas: ['nome do cliente', 'CPF', 'valor do prêmio', DA_RET] });
    const de = (nome) => linhas.find((l) => l.indexOf(nome) >= 0);
    contem(de('Da central'), '"=""00900000007"""', 'o zero à esquerda fica');
    contem(de('Da central'), ';1234,5;', 'dinheiro é número, com vírgula');
    igual(de('Da central').indexOf(escrita(new Date()) + ';'), 0, 'data em dd/mm/aaaa');
    contem(de('Silva'), '"Silva; Souza ""ME"""', 'o separador dentro do texto vai entre aspas');
    contem(de('Silva'), ';12345678901', 'o CPF sem zero à esquerda sai como está');
    contem(de('SOMA'), "'=SOMA(A1)", 'o texto que parece fórmula não vira fórmula');
    contem(de('Duas'), 'Duas linhas;', 'uma linha do arquivo é um caso');
    igual(linhas.length, 5);
  });

  teste('o nome do arquivo diz o canal, o relatório e o período', () => {
    const t = preparar();
    const nome = t.pedir({ relatorio: 'central' }).nome;
    verdadeiro(/^relatorio-ret-central-\d{8}-a-\d{8}\.csv$/.test(nome), nome);
  });

  /* ----------------------------------------------------------------------- */
  secao('Quem pode, e o registro');

  teste('conferir não registra; exportar entra na auditoria com o que saiu', () => {
    const t = preparar();
    const exportacoes = () => t.chamar('lerRegistros_')('AUDITORIA')
      .filter((l) => l.Acao === 'relatorio.exportar');
    t.pedir({ relatorio: 'central', soConferir: true });
    t.chamar('descarregarAFilaDaAuditoria_')(0);
    igual(exportacoes().length, 0);
    t.pedir({ relatorio: 'central' });
    t.chamar('descarregarAFilaDaAuditoria_')(0);
    igual(exportacoes().length, 1);
    contem(exportacoes()[0].Detalhe, 'Casos que vieram da Central');
    contem(exportacoes()[0].Detalhe, '2 casos · 3 colunas');
  });

  teste('quem não pode exportar é recusado nas duas chamadas', () => {
    const t = preparar();
    const consulta = t.chamar('lerRegistros_')('CATALOGO')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Consulta');
    const permissoes = JSON.parse(consulta.Configuracao);
    permissoes.acoes = [];
    t.chamar('atualizarRegistro_')('CATALOGO', consulta.Id, { Configuracao: JSON.stringify(permissoes) });
    t.chamar('salvarUsuario')({ nome: 'Só Olha', email: 'olha@exemplo.com',
      nivelAcessoId: consulta.Id, canalId: '', ativo: true });
    t.chamar('esquecerCacheDaConfiguracao_()');
    comoUsuario(t.ambiente, 'olha@exemplo.com', () => {
      lanca(() => t.opcoes(), 'não permite exportar');
      lanca(() => t.pedir({}), 'não permite exportar');
    });
  });

  teste('o alcance da Produtividade vale: quem só vê os seus exporta só os seus', () => {
    const t = preparar();
    const operacao = t.chamar('lerRegistros_')('CATALOGO')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    const permissoes = JSON.parse(operacao.Configuracao);
    permissoes.escopoNaProdutividade = 'PROPRIOS';
    t.chamar('atualizarRegistro_')('CATALOGO', operacao.Id, { Configuracao: JSON.stringify(permissoes) });
    t.chamar('salvarUsuario')({ nome: 'Diego Castilho', email: 'diego@exemplo.com',
      nivelAcessoId: operacao.Id, canalId: '', ativo: true });
    t.chamar('esquecerCacheDaConfiguracao_()');
    comoUsuario(t.ambiente, 'diego@exemplo.com', () => {
      const linhas = t.linhas({ colunas: ['analista'] });
      igual(linhas.slice(1).join(','), 'Diego Castilho,Diego Castilho');
    });
  });

  /* ----------------------------------------------------------------------- */
  secao('A tela');

  teste('o botão fica na caixa de filtros da Produtividade, só para quem pode exportar', () => {
    const produtividade = tela('Produtividade');
    contem(produtividade, 'painel.podeExportar\n        ? \'<button type="button" class="botao pequeno" id="exportar-relatorio">');
    contem(produtividade, "Servidor.chamar('opcoesDoRelatorio', canalEscolhido)");
    contem(tela('Comuns'), 'function caixaDeFiltros(conteudo, contagem, acao)');
  });

  teste('confere antes de exportar, e qualquer mudança pede a conferência de novo', () => {
    const produtividade = tela('Produtividade');
    contem(produtividade, "conferir.addEventListener('click', function () { pedir(true, this); });");
    contem(produtividade, "exportar.addEventListener('click', function () { pedir(false, this); });");
    contem(produtividade, "function mudou() {\n      conferido = null;");
    contem(produtividade, "(conferido.quantos ? '' : ' disabled')");
  });

  teste('o arquivo baixa com a marca dos acentos, e o texto fica para copiar', () => {
    const produtividade = tela('Produtividade');
    contem(produtividade, "new Blob(['\\uFEFF' + arquivo.conteudo]");
    contem(produtividade, 'id="copiar-relatorio"');
  });
}

module.exports = { rodarTestesDoRelatorioDeCasos };
