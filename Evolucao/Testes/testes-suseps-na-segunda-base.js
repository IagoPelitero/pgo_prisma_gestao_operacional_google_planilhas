/**
 * ============================================================================
 * PGO — testes-suseps-na-segunda-base.js · as SUSEPs bloqueadas lá fora (Etapa 55)
 * ============================================================================
 * Pedido do PO: "vou usar a segunda base para as SUSEPs bloqueadas, que somam
 * 151 mil, sendo pela corretora e pela Porto. Por esse motivo preciso que o
 * PGO consiga manter a planilha atual e a segunda base". A escolha dele: só a
 * lista de bloqueadas vai para lá; as corretoras (Diamante) e as listas de
 * analistas ficam na planilha atual.
 *
 * Duas coisas são cobradas aqui. A primeira: a ligação passa a ser POR LISTA —
 * marcar só "SUSEPs bloqueadas" leva só ela. A segunda: com 151 mil linhas a
 * Tabela Corretoras não manda a lista inteira para a tela (até 100, com busca
 * nas 151 mil), e o selo do formulário e o bloqueio conferem a SUSEP sem ler
 * a aba inteira.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca } = require('./ferramentas');

const lerTela = (nome) => fs.readFileSync(
  path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

const CABECALHO_DAS_BLOQUEADAS = ['Id', 'SUSEP', 'NomeCorretora', 'Sucursal', 'CoordenadorComercial',
  'BloqueadaEm', 'BloqueadaPor', '_Visivel', '_ExcluidoEm', '_ExcluidoPor', '_Origem'];

const bloqueada = (n, susep, corretora, por) => [String(n).padStart(10, '0'), susep, corretora,
  String(n % 90 + 10), 'Coordenação ' + (n % 7), '01/01/2026', por || 'Companhia', 'SIM', '', '', 'PLANILHA'];

/** A planilha atual instalada, e uma segunda base só com a aba SUSEP_BLOQUEADAS. */
function duasBases(quantas) {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.mesa = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
  const linhas = [CABECALHO_DAS_BLOQUEADAS];
  for (let n = 1; n <= (quantas || 3); n++) {
    linhas.push(bloqueada(n, 'BLQ' + String(n).padStart(6, '0'), 'Corretora ' + n,
      n % 2 ? 'Companhia' : 'Corretora'));
  }
  t.idDeFora = t.ambiente.criarPlanilhaExterna({ SUSEP_BLOQUEADAS: linhas });
  t.ligar = (abas) => t.chamar('salvarConfiguracaoDosCadastros')(
    abas === undefined ? { planilhaId: t.idDeFora } : { planilhaId: t.idDeFora, abas });
  t.resumo = (procurar) => t.chamar('resumoDasSusepsBloqueadas')(procurar || '');
  return t;
}

function rodarTestesDasSusepsNaSegundaBase() {
  console.log('\nEtapa 55: as SUSEPs bloqueadas na segunda base');

  /* ----------------------------------------------------------------------- */
  secao('A ligação por lista');

  teste('marcar só "SUSEPs bloqueadas" liga com uma planilha que só tem essa aba', () => {
    const t = duasBases();
    t.ligar(['SUSEP_BLOQUEADAS']);
    const origem = t.chamar('origemDosCadastros')();
    igual(origem.SUSEP_BLOQUEADAS.deFora, true, 'as bloqueadas vêm de fora');
    igual(origem.CORRETORAS.deFora, false, 'as corretoras ficam aqui');
    igual(t.chamar('abaVemDeOutraPlanilha_')('ANALISTAS_CENTRAL'), false, 'e os analistas também');
  });

  teste('as corretoras continuam na planilha atual: cadastrar grava aqui', () => {
    const t = duasBases();
    t.ligar(['SUSEP_BLOQUEADAS']);
    t.chamar('inserirRegistro_')('CORRETORAS', { SUSEP: 'DIA001', Corretora: 'Diamante Um',
      Segmento: 'Diamante' });
    const aqui = t.ambiente.planilha.getSheetByName('CORRETORAS');
    contem(JSON.stringify(aqui.getRange(1, 1, aqui.getLastRow(), aqui.getLastColumn()).getValues()), 'DIA001');
    igual(t.chamar('consultarSusep')('DIA001').situacao, 'OK', 'o selo verde da Diamante');
  });

  teste('o "Conferir" só cobra as listas marcadas', () => {
    const t = duasBases();
    const soAsBloqueadas = t.chamar('conferirPlanilhaDeCadastros')(t.idDeFora, ['SUSEP_BLOQUEADAS']);
    igual(soAsBloqueadas.faltando.length, 0, JSON.stringify(soAsBloqueadas.faltando));
    const todas = t.chamar('conferirPlanilhaDeCadastros')(t.idDeFora);
    verdadeiro(todas.faltando.some((f) => f.indexOf('"CORRETORAS"') >= 0),
      'sem escolha, cobra as quatro — como antes');
  });

  teste('ligar sem nenhuma lista marcada é recusado', () => {
    const t = duasBases();
    lanca(() => t.ligar([]), 'Marque pelo menos uma lista');
    igual(t.chamar('configuracaoDosCadastros')().ligada, false);
  });

  teste('a página antiga (sem a escolha) liga as quatro — e por isso cobra as quatro', () => {
    const t = duasBases();
    lanca(() => t.ligar(undefined), 'Falta a aba "CORRETORAS"');
  });

  teste('Configurações mostra o que mora lá; desligar volta tudo para cá', () => {
    const t = duasBases();
    t.ligar(['SUSEP_BLOQUEADAS']);
    const config = t.chamar('configuracaoDosCadastros')();
    igual(config.abas.filter((a) => a.naSegundaBase).map((a) => a.aba).join(','), 'SUSEP_BLOQUEADAS');
    t.chamar('salvarConfiguracaoDosCadastros')({ planilhaId: '' });
    igual(t.chamar('abaVemDeOutraPlanilha_')('SUSEP_BLOQUEADAS'), false);
    igual(t.chamar('valorDaConfiguracao_')('CADASTROS.ABAS', ''), '', 'a escolha some junto');
  });

  teste('um nome que não pode vir de fora é ignorado', () => {
    const t = duasBases();
    t.ligar(['SUSEP_BLOQUEADAS', 'BASE_RET']);
    igual(t.chamar('valorDaConfiguracao_')('CADASTROS.ABAS', ''), 'SUSEP_BLOQUEADAS');
  });

  /* ----------------------------------------------------------------------- */
  secao('Os casos continuam na planilha atual; o selo consulta lá fora');

  teste('o selo diz BLOQUEADA, e quem bloqueou, para uma SUSEP da segunda base', () => {
    const t = duasBases();
    t.ligar(['SUSEP_BLOQUEADAS']);
    const selo = t.chamar('consultarSusep')('BLQ000002');
    igual(selo.situacao, 'BLOQUEADA');
    igual(selo.bloqueadaPor, 'Corretora');
  });

  teste('bloquear pela tela grava na segunda base, não aqui', () => {
    const t = duasBases();
    t.ligar(['SUSEP_BLOQUEADAS']);
    t.chamar('bloquearSusep')({ susep: 'NOVA01', corretora: 'Nova', bloqueadaPor: 'Companhia' });
    const aqui = t.ambiente.planilha.getSheetByName('SUSEP_BLOQUEADAS');
    verdadeiro(JSON.stringify(aqui.getRange(1, 1, aqui.getLastRow(), aqui.getLastColumn()).getValues()).indexOf('NOVA01') < 0, 'nada aqui');
    igual(t.chamar('consultarSusep')('NOVA01').situacao, 'BLOQUEADA', 'e o selo a acha lá');
  });

  /* ----------------------------------------------------------------------- */
  secao('Com 151 mil SUSEPs bloqueadas');

  // Uma vez só: montar 151 mil linhas custa alguns segundos.
  const grande = duasBases(151000);
  grande.ligar(['SUSEP_BLOQUEADAS']);
  grande.chamar('inserirVariosRegistros_')('BASE_MESA', [
    { Analista: 'Ana', Status: 'Em andamento', 'Data de entrada': '10/09/2026',
      SUSEP: 'BLQ150500', Corretora: 'Corretora 150500', 'Nome do segurado': 'c1' },
    { Analista: 'Ana', Status: 'Em andamento', 'Data de entrada': '10/09/2026',
      SUSEP: 'BLQ150500', Corretora: 'Corretora 150500', 'Nome do segurado': 'c2' },
    { Analista: 'Ana', Status: 'Em andamento', 'Data de entrada': '10/09/2026',
      SUSEP: 'BLQ000007', Corretora: 'Corretora 7', 'Nome do segurado': 'c3' }
  ]);

  teste('a tela recebe no máximo 100, e sabe quantas são no total', () => {
    const resumo = grande.resumo();
    igual(resumo.bloqueadas.length, 100);
    igual(resumo.quantasNoTotal, 151000);
    igual(resumo.truncada, true);
  });

  teste('as SUSEPs que aparecem nos casos vêm primeiro; depois, as mais recentes', () => {
    const lista = grande.resumo().bloqueadas;
    igual(lista[0].susep + '=' + lista[0].casos, 'BLQ150500=2');
    igual(lista[1].susep + '=' + lista[1].casos, 'BLQ000007=1');
    igual(lista[2].susep, 'BLQ151000', 'a última linha da aba');
  });

  teste('a busca procura nas 151 mil: pela SUSEP e pela corretora', () => {
    const porSusep = grande.resumo('blq075123');
    igual(porSusep.bloqueadas.map((b) => b.susep).join(','), 'BLQ075123');
    igual(porSusep.truncada, false);
    const porCorretora = grande.resumo('Corretora 99999');
    igual(porCorretora.quantasAchadas, 1);
    igual(porCorretora.bloqueadas[0].susep, 'BLQ099999');
  });

  teste('busca sem resultado devolve vazio, e o total continua lá', () => {
    const resumo = grande.resumo('não existe nenhuma');
    igual(resumo.bloqueadas.length + '|' + resumo.quantasNoTotal, '0|151000');
  });

  teste('a resposta para a tela continua pequena (não as 151 mil)', () => {
    verdadeiro(JSON.stringify(grande.resumo()).length < 60000, 'menos de 60 KB');
  });

  teste('o selo acha uma SUSEP lá no fundo da lista', () => {
    igual(grande.chamar('consultarSusep')('BLQ149998').situacao, 'BLOQUEADA');
  });

  teste('bloquear de novo uma SUSEP lá do fundo é recusado', () => {
    lanca(() => grande.chamar('bloquearSusep')({ susep: 'BLQ140001', bloqueadaPor: 'Companhia' }),
      'já está bloqueada');
  });

  teste('a linha excluída (_Visivel NAO) não conta, não aparece e pode ser bloqueada de novo', () => {
    const t = duasBases(3);
    t.ligar(['SUSEP_BLOQUEADAS']);
    const id = t.chamar('lerRegistros_')('SUSEP_BLOQUEADAS').find((l) => l.SUSEP === 'BLQ000003').__id;
    t.chamar('atualizarRegistro_')('SUSEP_BLOQUEADAS', id, { _Visivel: 'NAO' });
    const resumo = t.resumo();
    igual(resumo.quantasNoTotal, 2);
    verdadeiro(!resumo.bloqueadas.some((b) => b.susep === 'BLQ000003'));
    t.chamar('bloquearSusep')({ susep: 'BLQ000003', bloqueadaPor: 'Corretora' });
    igual(t.resumo().quantasNoTotal, 3);
  });

  teste('listarSusepsBloqueadas segue existindo, com o mesmo corte', () => {
    igual(grande.chamar('listarSusepsBloqueadas')().length, 100);
  });

  /* ----------------------------------------------------------------------- */
  secao('As telas');

  teste('a Tabela Corretoras pede o resumo e tem a busca das bloqueadas', () => {
    const tela = lerTela('TabelaCorretoras.html');
    contem(tela, 'resumoDasSusepsBloqueadas');
    contem(tela, 'procurar-bloqueada');
    contem(tela, "Servidor.chamar('resumoDasSusepsBloqueadas', procurarBloqueada)", 'a busca vai ao servidor');
  });

  teste('Configurações tem a caixa de cada lista', () => {
    const tela = lerTela('Configuracoes.html');
    contem(tela, 'data-aba-de-fora');
    contem(tela, "Servidor.chamar('conferirPlanilhaDeCadastros', valorDe('cadastrosId'), abasDeFora())");
    contem(tela, "{ planilhaId: valorDe('cadastrosId'), abas: abasDeFora() }", 'o salvar leva a escolha');
  });
}

module.exports = { rodarTestesDasSusepsNaSegundaBase };
