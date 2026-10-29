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
const { rodarTestesSemMinhaPerformance } = require('./testes-sem-minha-performance');
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
const { rodarTestesDasSusepsNaSegundaBase } = require('./testes-suseps-na-segunda-base');
const { rodarTestesDoLimparFiltros } = require('./testes-limpar-filtros');
const { rodarTestesDosPopupsDaImportacao } = require('./testes-popups-da-importacao');
const { rodarTestesDaDataDaFinalizacao } = require('./testes-data-da-finalizacao');
const { rodarTestesDoEnvioUnico } = require('./testes-envio-unico');
const { rodarTestesDoFusoDoProjeto } = require('./testes-fuso-do-projeto');
const { rodarTestesDaAuditoriaForaDaTrava } = require('./testes-auditoria-fora-da-trava');
const { rodarTestesDaLimpeza } = require('./testes-limpeza-do-que-nao-e-usado');
const { rodarTestesDaBuscaRapida } = require('./testes-busca-rapida');
const { rodarTestesDoRegistroDeErros } = require('./testes-registro-de-erros');
const { rodarTestesDoPeriodoPelaData } = require('./testes-periodo-pela-data');
const { rodarTestesDoHistoricoDaBase } = require('./testes-historico-da-base');

rodarTestesDaFundacao();
rodarTestesDeAcesso();
rodarTestesDaCasca();
rodarTestesDeCadastro();
rodarTestesDoTrabalho();
rodarTestesDeConfiguracoes();
rodarTestesDeBusca();
rodarTestesDaProdutividade();
rodarTestesSemMinhaPerformance();
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
rodarTestesDasSusepsNaSegundaBase();
rodarTestesDoLimparFiltros();
rodarTestesDosPopupsDaImportacao();
rodarTestesDaDataDaFinalizacao();
rodarTestesDoEnvioUnico();
rodarTestesDoFusoDoProjeto();
rodarTestesDaAuditoriaForaDaTrava();
rodarTestesDaLimpeza();
rodarTestesDaBuscaRapida();
rodarTestesDoRegistroDeErros();
rodarTestesDoPeriodoPelaData();
rodarTestesDoHistoricoDaBase();

const { passaram, falhas } = resumo();
console.log('\n' + '-'.repeat(60));
if (falhas.length) {
  console.log(passaram + ' passaram, ' + falhas.length + ' FALHARAM');
  process.exitCode = 1;
} else {
  console.log(passaram + ' testes, todos passaram');
}
console.log('-'.repeat(60) + '\n');
