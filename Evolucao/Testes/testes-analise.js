/**
 * ============================================================================
 * PGO — testes-analise.js · a Etapa 11
 * ============================================================================
 * O gerador das abas `ANALISE_*`.
 *
 * O teste mais importante deste arquivo é o da TRAVA DO PREFIXO. Todo o resto
 * pode falhar e o pior que acontece é uma análise errada; se aquele falhar,
 * o sistema apaga uma base de produção. É a única função do PGO que reescreve
 * uma aba inteira, e ela só pode fazer isso nas abas que ela mesma gera.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario, lerPeca } =
  require('./ferramentas');

function rodarTestesDeAnalise() {
  console.log('\nEtapa 11 — Abas de análise');

  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');

  const planilha = ambiente.planilha;
  const canal = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_MESA');

  chamar('inserirVariosRegistros_')('BASE_MESA', [
    { Analista: 'Ana', Status: 'Em andamento', Canal: 'Chat',
      'Data de entrada': '10/09/2026', SUSEP: '1234567',
      Corretora: 'Corretora ABC', 'Nome do segurado': 'Um' },
    { Analista: 'Bruno', Status: 'Concluído', Canal: 'E-mail',
      'Data de entrada': '11/09/2026', SUSEP: '2345678',
      Corretora: 'Agência Central', 'Nome do segurado': 'Dois' },
    { Analista: 'Ana', Status: 'Em andamento', Canal: 'E-mail',
      'Data de entrada': '12/09/2026', SUSEP: '1234567',
      Corretora: 'Corretora ABC', 'Nome do segurado': 'Três' }
  ]);

  const criar = (dados) => chamar('salvarAnalise')(Object.assign({
    nome: 'Teste', canalId: canal.id, colunas: '', filtros: [], dias: 0
  }, dados));

  secao('A trava do prefixo');

  teste('escrever numa aba sem ANALISE_ é recusado', () => {
    // O teste que justifica o arquivo. Sem esta trava, uma análise chamada
    // "BASE_MESA" apagaria a base — e nenhuma outra proteção pegaria, porque
    // apagar seria exatamente o que o código se propôs a fazer.
    lanca(() => chamar('escreverAbaDeAnalise_')('BASE_MESA', ['a'], [['x']]),
      'não começa com ANALISE_');
    lanca(() => chamar('escreverAbaDeAnalise_')('CONFIG', ['a'], [['x']]),
      'não começa com ANALISE_');
    lanca(() => chamar('escreverAbaDeAnalise_')('', ['a'], [['x']]),
      'não começa com ANALISE_');

    igual(chamar('lerRegistros_("BASE_MESA")').length, 3,
      'e a base continua inteira depois das três tentativas');
  });

  teste('o nome vira aba, e nome que complica na planilha é recusado', () => {
    lanca(() => criar({ nome: 'Ret Vida' }), 'caractere que complica');
    lanca(() => criar({ nome: 'Análise' }), 'caractere que complica');
    lanca(() => criar({ nome: 'A/B' }), 'caractere que complica');
    lanca(() => criar({ nome: '' }), 'Dê um nome');
  });

  secao('A receita');

  teste('salvar não gera nada — só guarda a receita', () => {
    const id = criar({ nome: 'CanalToda', descricao: 'Casos do canal' });
    verdadeiro(!!id);
    igual(planilha.getSheetByName('ANALISE_CanalToda'), null,
      'montar a receita não pode custar a espera de gerar');

    const analise = chamar('listarAnalises')().find((u) => u.id === id);
    igual(analise.aba, 'ANALISE_CanalToda');
    igual(analise.abaExiste, false);
    igual(analise.linhasGeradas, 0);
  });

  teste('coluna que o canal não tem é recusada, e diz quais existem', () => {
    lanca(() => criar({ nome: 'Errada', colunas: 'Analista,Coluna Inventada' }),
      'não tem a coluna');
  });

  teste('filtro por coluna que não existe é recusado', () => {
    lanca(() => criar({
      nome: 'Errada2',
      filtros: [{ coluna: 'Não Existe', valor: 'x' }]
    }), 'Não dá para filtrar');
  });

  teste('duas análises com o mesmo nome escreveriam na mesma aba', () => {
    lanca(() => criar({ nome: 'CanalToda' }), 'Já existe uma análise');
    // inclusive contra as que o instalador já semeou
    lanca(() => criar({ nome: 'Diamante' }), 'Já existe uma análise');
  });

  secao('A geração');

  teste('gerar cria a aba com o cabeçalho e os dados', () => {
    const id = criar({ nome: 'Tudo' });
    const feito = chamar('gerarAnalise')(id);

    igual(feito.aba, 'ANALISE_Tudo');
    igual(feito.linhas, 3);

    const aba = planilha.getSheetByName('ANALISE_Tudo');
    verdadeiro(!!aba, 'a aba nasceu');
    igual(aba.getRange(1, 1, 1, 3).getValues()[0].join(','), 'ID,Analista,Status',
      'a primeira linha é o cabeçalho, na ordem do canal');
    igual(aba.getMaxRows(), 4, 'a grade tem exatamente cabeçalho + 3 linhas');
  });

  teste('as colunas de controle ficam de fora', () => {
    const aba = planilha.getSheetByName('ANALISE_Tudo');
    const cabecalho = aba.getRange(1, 1, 1, aba.getMaxColumns()).getValues()[0];
    verdadeiro(cabecalho.indexOf('_Visivel') < 0,
      'coluna de sistema numa tabela dinâmica só atrapalha');
    verdadeiro(cabecalho.indexOf('_Origem') < 0);
    igual(cabecalho.length, 20, 'as 20 colunas da BASE_MESA, sem as 4 de controle');
  });

  teste('a grade fica do tamanho do conteúdo, e não do tamanho de fábrica', () => {
    // Célula vazia também consome o teto de 10 milhões da planilha. Uma aba
    // deixada em 1000 x 26 gasta 26 mil células para mostrar três linhas.
    const aba = planilha.getSheetByName('ANALISE_Tudo');
    igual(aba.getMaxColumns(), 20);
    igual(aba.getMaxRows(), 4);
  });

  teste('só as colunas escolhidas, quando são escolhidas', () => {
    const id = criar({ nome: 'Enxuta', colunas: 'Analista,Status,Corretora' });
    chamar('gerarAnalise')(id);

    const aba = planilha.getSheetByName('ANALISE_Enxuta');
    igual(aba.getMaxColumns(), 3);
    igual(aba.getRange(1, 1, 1, 3).getValues()[0].join(','),
      'Analista,Status,Corretora');
    igual(aba.getRange(2, 1, 1, 3).getValues()[0].join(','),
      'Ana,Em andamento,Corretora ABC');
  });

  teste('o filtro recorta as linhas', () => {
    const id = criar({
      nome: 'SoPendente', colunas: 'Analista,Status',
      filtros: [{ coluna: 'Status', valor: 'Em andamento' }]
    });
    const feito = chamar('gerarAnalise')(id);
    igual(feito.linhas, 2);

    const aba = planilha.getSheetByName('ANALISE_SoPendente');
    igual(aba.getMaxRows(), 3);
    igual(aba.getRange(2, 2, 2, 1).getValues().map((l) => l[0]).join(','),
      'Em andamento,Em andamento');
  });

  teste('dois filtros se somam', () => {
    const id = criar({
      nome: 'PendenteNoChat', colunas: 'Analista',
      filtros: [{ coluna: 'Status', valor: 'Em andamento' },
        { coluna: 'Canal', valor: 'Chat' }]
    });
    igual(chamar('gerarAnalise')(id).linhas, 1);
  });

  teste('linha oculta não entra na análise', () => {
    // __id e não .Id: em BASE_MESA a coluna do identificador chama-se "ID",
    // e em BASE_RET chama-se "id". __id é o nome que vale nas duas.
    const casos = chamar('lerRegistros_("BASE_MESA")');
    chamar('ocultarRegistro_')('BASE_MESA', casos[0].__id, '');

    const id = criar({ nome: 'SemOcultas', colunas: 'Analista' });
    igual(chamar('gerarAnalise')(id).linhas, 2,
      'a linha continua na planilha, mas não é dado de análise');

    chamar('reexibirRegistro_')('BASE_MESA', casos[0].__id);
  });

  secao('Regerar');

  teste('regerar NÃO pede senha ao administrador', () => {
    // Regerar apaga o retrato anterior, e quem tinha uma tabela dinâmica
    // apontada para ele vê os números mudarem embaixo. Mas gerar já exige a
    // permissão de ESTRUTURA: quem chega aqui é quem cuida do sistema, e a
    // senha seria um segredo que ela mesma escolheu.
    const id = chamar('listarAnalises')().find((u) => u.nome === 'Tudo').id;
    const feito = chamar('gerarAnalise')(id);
    igual(feito.aba, 'ANALISE_Tudo');
  });

  teste('com a senha liberada, regerar reaproveita a MESMA aba', () => {
    chamar('definirSenhaDeAdministrador')('segredo123', '');
    chamar('liberarComSenha')('segredo123');

    const antes = planilha.getSheets().length;
    const id = chamar('listarAnalises')().find((u) => u.nome === 'Tudo').id;
    chamar('gerarAnalise')(id);

    igual(planilha.getSheets().length, antes,
      'apagar e recriar mudaria o identificador da aba, e todo Power BI '
      + 'apontado para ela perderia o alvo em silêncio');
  });

  teste('a aba encolhe quando o dado encolhe — não sobra linha velha', () => {
    chamar('liberarComSenha')('segredo123');
    const id = chamar('listarAnalises')().find((u) => u.nome === 'Tudo').id;
    chamar('salvarAnalise')({
      id: id, nome: 'Tudo', canalId: canal.id, colunas: 'Analista',
      filtros: [{ coluna: 'Canal', valor: 'Chat' }], dias: 0
    });
    chamar('gerarAnalise')(id);

    const aba = planilha.getSheetByName('ANALISE_Tudo');
    igual(aba.getMaxRows(), 2, 'cabeçalho + 1');
    igual(aba.getLastRow(), 2, 'e nenhuma sobra da geração anterior');
  });

  teste('a receita guarda quando foi gerada e quantas linhas saíram', () => {
    const analise = chamar('listarAnalises')().find((u) => u.nome === 'Tudo');
    igual(analise.abaExiste, true);
    igual(analise.linhasGeradas, 1);
    verdadeiro(analise.geradaEm.length > 0,
      '"gerada ontem, 1 linha" diz muito mais que "existe"');
  });

  secao('O gatilho de horário');

  teste('atualizarAnalisesAgendadas regera todas as ligadas', () => {
    const feito = chamar('atualizarAnalisesAgendadas()');
    verdadeiro(feito.geradas.length >= 4, 'gerou as ligadas, achei '
      + feito.geradas.length);
    igual(feito.falharam.length, 0);
  });

  teste('a agendada não pede senha — não haveria quem digitasse', () => {
    // Um gatilho de horário roda sem ninguém logado. Se pedisse senha, ele
    // falharia toda madrugada, em silêncio.
    ambiente.propriedadesDoUsuario.clear();
    const feito = chamar('atualizarAnalisesAgendadas()');
    verdadeiro(feito.geradas.length >= 4);
  });

  teste('análise desligada não é gerada pelo gatilho', () => {
    const id = criar({ nome: 'Desligada', colunas: 'Analista' });
    chamar('salvarAnalise')({
      id: id, nome: 'Desligada', canalId: canal.id, colunas: 'Analista',
      filtros: [], dias: 0, ativo: false
    });

    const feito = chamar('atualizarAnalisesAgendadas()');
    verdadeiro(feito.geradas.join(' ').indexOf('ANALISE_Desligada') < 0);
    igual(planilha.getSheetByName('ANALISE_Desligada'), null);
  });

  teste('gerar uma desligada pelo botão também é recusado', () => {
    const id = chamar('listarAnalises')().find((u) => u.nome === 'Desligada').id;
    lanca(() => chamar('gerarAnalise')(id), 'está desligada');
  });

  teste('uma análise quebrada não derruba as outras', () => {
    // Uma receita apontando para um canal que foi desligada. Sem o try, ela
    // deixaria as outras cinco sem atualizar naquela madrugada.
    chamar('inserirRegistro_')('ANALISES', {
      Nome: 'Orfa', CanalId: '9999999999', Colunas: '', Filtros: '',
      Dias: 0, Ordem: 99, Ativo: true
    });

    const feito = chamar('atualizarAnalisesAgendadas()');
    igual(feito.falharam.length, 1);
    contem(feito.falharam[0], 'Orfa');
    verdadeiro(feito.geradas.length >= 4, 'e as boas foram geradas do mesmo jeito');
  });

  secao('A aba gerada não está no contrato');

  teste('o laudo da planilha não reclama das abas ANALISE_', () => {
    // Ela é saída, não é base: pode ser apagada à mão a qualquer momento, e a
    // próxima geração a refaz.
    const laudo = chamar('conferirEstrutura_()');
    igual(laudo.ok, true, 'a estrutura continua em ordem com as abas geradas');
    verdadeiro(laudo.abas.every((aba) => aba.aba.indexOf('ANALISE_') !== 0),
      'o contrato não conhece as abas geradas');
  });

  teste('apagar a aba à mão não quebra nada — a próxima geração refaz', () => {
    const aba = planilha.getSheetByName('ANALISE_Enxuta');
    planilha.abas.splice(planilha.abas.indexOf(aba), 1);

    const analise = chamar('listarAnalises')().find((u) => u.nome === 'Enxuta');
    igual(analise.abaExiste, false, 'a tela mostra que sumiu');

    chamar('gerarAnalise')(analise.id);
    verdadeiro(!!planilha.getSheetByName('ANALISE_Enxuta'), 'e refaz sem senha');
  });

  secao('Permissão');

  teste('quem não configura não monta análise', () => {
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    chamar('salvarUsuario')({
      nome: 'Ana Operação', email: 'ana@exemplo.com',
      nivelAcessoId: operacao.Id, ativo: true
    });

    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      lanca(() => chamar('listarAnalises')(), 'não permite configurar');
      lanca(() => chamar('salvarAnalise')({ nome: 'X', canalId: canal.id }),
        'não permite configurar');
    });
  });

  teste('quem configura mas não mexe na estrutura não gera', () => {
    // Montar a receita é ajuste. Gerar reescreve uma aba inteira — e por isso
    // as duas ações pedem permissões diferentes.
    const consulta = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Consulta');
    chamar('salvarNivelDeAcesso')({
      id: consulta.Id, escopo: 'TODOS',
      acoes: ['exportar', 'configurar'],
      telas: ['dashboard', 'buscarCaso', 'painelAnalitico', 'configuracoes']
    });
    chamar('salvarUsuario')({
      nome: 'Configura Sem Estrutura', email: 'configura@exemplo.com',
      nivelAcessoId: consulta.Id, ativo: true
    });

    const id = chamar('listarAnalises')().find((u) => u.nome === 'Enxuta').id;
    comoUsuario(ambiente, 'configura@exemplo.com', () => {
      verdadeiro(chamar('listarAnalises')().length > 0, 'ela monta a receita');
      lanca(() => chamar('gerarAnalise')(id), 'não permite');
    });
  });

  secao('A tela');

  teste('a seção de análises aparece em Configurações', () => {
    const resumo = chamar('resumoDasConfiguracoes()');
    const secaoDaAnalise = resumo.secoes.find((s) => s.chave === 'analises');
    verdadeiro(!!secaoDaAnalise, 'a seção existe');
    contem(secaoDaAnalise.descricao.toLowerCase(), 'aba');
  });

  teste('a tela desenha a seção, e o ícone dela existe', () => {
    const pasta = path.join(__dirname, '..', '..', 'Front-End');
    const tela = fs.readFileSync(path.join(pasta, 'Configuracoes.html'), 'utf8');
    contem(tela, 'carregarAnalises');
    contem(tela, 'gerarAnalise');
    contem(lerPeca('Moldura'), 'analises:',
      'sem ícone, a linha do menu fica torta ao lado das outras oito');
  });
}

module.exports = { rodarTestesDeAnalise };
