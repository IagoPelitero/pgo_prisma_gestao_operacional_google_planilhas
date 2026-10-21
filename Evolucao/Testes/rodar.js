/**
 * ============================================================================
 * RECC — rodar.js · roda a suíte inteira
 * ============================================================================
 *   node RECC/Testes/rodar.js
 *
 * Cada etapa tem o seu arquivo de testes. Este aqui só chama todos e conta o
 * resultado. O critério de aceite é CINCO execuções seguidas sem falha —
 * rodar uma vez não detecta teste instável.
 * ============================================================================
 */

const { resumo } = require('./ferramentas');
const { rodarTestesDaFundacao } = require('./testes-fundacao');
const { rodarTestesDeAcesso } = require('./testes-acesso');
const { rodarTestesDaCasca } = require('./testes-casca');
const { rodarTestesDeCadastro } = require('./testes-cadastro');
const { rodarTestesDoTrabalho } = require('./testes-trabalho');
const { rodarTestesDeConfiguracoes } = require('./testes-configuracoes');
const { rodarTestesDeBusca } = require('./testes-busca');
const { rodarTestesDaProdutividade } = require('./testes-produtividade');
const { rodarTestesDePerformance } = require('./testes-performance');
const { rodarTestesDeCorretoras } = require('./testes-corretoras');
const { rodarTestesDeAnalise } = require('./testes-analise');
const { rodarTestesDeImportacao } = require('./testes-importacao');
const { rodarTestesDeCadastrosDeFora } = require('./testes-cadastros-de-fora');
const { rodarTestesDeDiagnostico } = require('./testes-diagnostico');
const { rodarTestesDeSinalizadores } = require('./testes-sinalizadores');
const { rodarTestesDaVarredura } = require('./testes-varredura');
const { rodarTestesDoCampoCondicional } = require('./testes-condicional');
const { rodarTestesDaParadaDaRet } = require('./testes-parada-da-ret');
const { rodarTestesDaDescricaoEDoInicioDoPrazo } = require('./testes-descricao-e-inicio-do-prazo');
const { rodarTestesDoChatDaMesa } = require('./testes-chat-da-mesa');
const { rodarTestesDasColunasSuas } = require('./testes-colunas-suas');
const { rodarTestesDosCardsEDosCarimbos } = require('./testes-cards-e-carimbos');
const { rodarTestesDoTrabalhoRapido } = require('./testes-trabalho-rapido');
const { rodarTestesDaVarreduraGeral } = require('./testes-varredura-geral');
const { rodarTestesDoRetidoTentativaELote } = require('./testes-retido-tentativa-e-lote');
const { rodarTestesDeVelocidade } = require('./testes-velocidade');
const { rodarTestesDosCardsFiltrosEBusca } = require('./testes-cards-filtros-e-busca');
const { rodarTestesDaImportacaoDaRet } = require('./testes-importacao-da-ret');
const { rodarTestesDaProdutividadeDaRet } = require('./testes-produtividade-da-ret');
const { rodarTestesDasTentativas } = require('./testes-tentativas');
const { rodarTestesDoDeParaLembrado } = require('./testes-depara-lembrado');
const { rodarTestesDasColunasForaDaRet } = require('./testes-colunas-fora-da-ret');

rodarTestesDaFundacao();
rodarTestesDeAcesso();
rodarTestesDaCasca();
rodarTestesDeCadastro();
rodarTestesDoTrabalho();
rodarTestesDeConfiguracoes();
rodarTestesDeBusca();
rodarTestesDaProdutividade();
rodarTestesDePerformance();
rodarTestesDeCorretoras();
rodarTestesDeAnalise();
rodarTestesDeImportacao();
rodarTestesDeCadastrosDeFora();
rodarTestesDeDiagnostico();
rodarTestesDeSinalizadores();
rodarTestesDaVarredura();
rodarTestesDoCampoCondicional();
rodarTestesDaParadaDaRet();
rodarTestesDaDescricaoEDoInicioDoPrazo();
rodarTestesDoChatDaMesa();
rodarTestesDasColunasSuas();
rodarTestesDosCardsEDosCarimbos();
rodarTestesDoTrabalhoRapido();
rodarTestesDaVarreduraGeral();
rodarTestesDoRetidoTentativaELote();
rodarTestesDeVelocidade();
rodarTestesDosCardsFiltrosEBusca();
rodarTestesDaImportacaoDaRet();
rodarTestesDaProdutividadeDaRet();
rodarTestesDasTentativas();
rodarTestesDoDeParaLembrado();
rodarTestesDasColunasForaDaRet();

const { passaram, falhas } = resumo();
console.log('\n' + '-'.repeat(60));
if (falhas.length) {
  console.log(passaram + ' passaram, ' + falhas.length + ' FALHARAM');
  process.exitCode = 1;
} else {
  console.log(passaram + ' testes, todos passaram');
}
console.log('-'.repeat(60) + '\n');
