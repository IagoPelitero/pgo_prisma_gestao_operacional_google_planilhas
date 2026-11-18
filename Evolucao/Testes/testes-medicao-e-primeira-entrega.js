/**
 * ============================================================================
 * PGO — testes-medicao-e-primeira-entrega.js · Etapa 86
 * ============================================================================
 * Etapa 0 (medição): M2 — consultarSusep, conferirPropostaRepetida e
 * listarCamposDoCanal no cronômetro; M3 — o simulador conta as chamadas de
 * estrutura (getSheetByName, getLastRow, getLastColumn) que a conta de idas não
 * via, e medir-telas.js compara antes e depois.
 * Etapa 1: F11 (SUSEP uma vez, só a resposta da atual), F6 (só a resposta do
 * último pedido no Trabalho), F7 + F12 (o cadastro concluído oferece Trabalhar
 * no caso e Cadastrar outro). O comportamento de F11, F6 e F7 + F12 é provado
 * no navegador (ponta-a-ponta.js); aqui ficam as regras que a tela precisa ter.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lerPeca } = require('./ferramentas');
const { medidor } = require('./simulador');

function trecho(texto, de, ate) {
  const i = texto.indexOf(de);
  return i < 0 ? '' : texto.slice(i, ate ? texto.indexOf(ate, i + de.length) : undefined);
}

function rodarTestesDaMedicaoEPrimeiraEntrega() {
  console.log('\nEtapa 86: medição (M2, M3) e a primeira entrega (F11, F6, F7 + F12)');

  /* ----------------------------------------------------------------------- */
  secao('M3: o simulador conta as chamadas de estrutura');

  teste('getSheetByName, getLastRow e getLastColumn entram na conta, à parte das idas', () => {
    const t = carregar('primeiro.adm@exemplo.com');
    t.chamar('instalarRECC()');
    t.chamar('esquecerEstruturaLida_()');
    medidor.zerar();
    const estrutura = t.chamar('estruturaDaAba_')('BASE_RET', true);
    t.chamar('quantidadeDeRegistros_')(estrutura);
    const m = medidor.retrato();
    verdadeiro(m.abasPedidas >= 1, 'getSheetByName: ' + m.abasPedidas);
    verdadeiro(m.ultimasColunas >= 1, 'getLastColumn: ' + m.ultimasColunas);
    verdadeiro(m.ultimasLinhas >= 1, 'getLastRow: ' + m.ultimasLinhas);
    igual(m.chamadasNoTotal, m.idasNoTotal + m.buscasRapidas + m.abasPedidas + m.ultimasLinhas + m.ultimasColunas,
      'chamadasNoTotal soma tudo');
    medidor.zerar();
    igual(medidor.retrato().abasPedidas + medidor.retrato().ultimasLinhas + medidor.retrato().ultimasColunas, 0, 'e zera');
  });

  teste('a linha de base de antes das mudanças está guardada, com as telas prioritárias', () => {
    const arquivo = path.join(__dirname, '..', 'medicoes', 'linha-de-base-1.85.json');
    const base = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    const telas = new Set(base.medidas.map((m) => m.tela));
    ['Trabalho', 'Cadastrar', 'Buscar', 'Config'].forEach((tela) => verdadeiro(telas.has(tela), tela));
    verdadeiro(base.medidas.every((m) => typeof m.chamadas === 'number' && !m.erro), 'todas mediram sem erro');
    igual(typeof require('./medir-telas').medirTudo, 'function');
  });

  /* ----------------------------------------------------------------------- */
  secao('M2: as funções que só a tela media agora passam pelo cronômetro');

  teste('consultarSusep, conferirPropostaRepetida e listarCamposDoCanal continuam respondendo igual', () => {
    const t = carregar('primeiro.adm@exemplo.com');
    t.chamar('instalarRECC()');
    const ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    t.chamar('inserirRegistro_')('CORRETORAS', { SUSEP: 'TST01A', Corretora: 'Corretora T', Sucursal: '1', Segmento: 'Diamante', Consultor: 'C' });
    const r = t.chamar('consultarSusep')('TST01A', ret.id);
    igual(r.situacao, 'OK'); igual(r.segmento, 'Diamante', 'a regra Diamante intacta');
    igual(t.chamar('consultarSusep')('ZZ0000', ret.id).situacao, 'NAO_ENCONTRADA');
    igual(t.chamar('conferirPropostaRepetida')('7-0000001', ret.id, '', '').situacao, 'UNICA');
    verdadeiro(t.chamar('listarCamposDoCanal')(ret.id).length > 5);
  });

  /* ----------------------------------------------------------------------- */
  secao('F11, F6 e F7 + F12: as regras que a tela tem de ter');

  teste('F11: a SUSEP já consultada não vai de novo, e a resposta velha é descartada nas duas saídas', () => {
    const bloco = trecho(lerPeca('Comuns'), 'function consultarSusep(', 'O selo da proposta');
    contem(bloco, "selo.getAttribute('data-consultada') === texto) return;");
    igual((bloco.match(/if \(!aindaEAMesma\(\)\) return;/g) || []).length, 2, 'no sucesso e na falha');
    contem(bloco, "selo.removeAttribute('data-consultada');", 'falhou ou esvaziou: pode consultar de novo');
  });

  teste('F6: a carga do painel e a da Agenda descartam a resposta de pedido velho', () => {
    const tela = lerPeca('Trabalho');
    igual((tela.match(/var meuPedido = \+\+pedidoDoPainel;/g) || []).length, 2, 'carregar e carregarAgenda');
    igual((tela.match(/if \(meuPedido !== pedidoDoPainel\) return;/g) || []).length, 4, 'sucesso e falha de cada uma');
  });

  teste('F7 + F12: os botões respeitam as permissões, e nada abre sozinho', () => {
    const tela = lerPeca('CadastrarCaso');
    const bloco = trecho(tela, 'function mostrarCadastroConcluido(', 'function ligar(');
    contem(bloco, "acoes.indexOf('editar') >= 0", 'Trabalhar no caso só para quem edita');
    contem(bloco, "telas.indexOf('trabalho') >= 0", 'Ir para o Trabalho só para quem vê o Trabalho');
    contem(bloco, 'id="cadastrar-outro"', 'Cadastrar outro para todos');
    // O caso só abre no clique: CasoEmModal.abrir dentro do listener.
    const abre = bloco.indexOf('CasoEmModal.abrir');
    verdadeiro(abre > bloco.indexOf("addEventListener('click'"), 'abrir o caso está dentro do clique');
    contem(trecho(bloco, "elemento('cadastrar-outro')", '});'), 'carregarFormulario()', 'o mesmo canal, formulário limpo');
    const sucesso = trecho(tela, ".entao(function (resposta) {\n        salvando = false;", '.senao(');
    verdadeiro(sucesso.indexOf('irPara') < 0 && sucesso.indexOf('CasoEmModal') < 0, 'gravar não navega nem abre o caso');
  });

  teste('F7 + F12: o cartão do cadastro concluído tem estilo nos quatro temas', () => {
    const estilos = lerPeca('Estilos');
    ['.cadastro-concluido {', '.cadastro-concluido-icone {', '.cadastro-concluido-acoes {'].forEach((c) => contem(estilos, c));
    contem(trecho(estilos, '.cadastro-concluido-icone {', '}'), 'var(--bom)', 'a cor vem do tema, não fixa');
  });
}

module.exports = { rodarTestesDaMedicaoEPrimeiraEntrega };
