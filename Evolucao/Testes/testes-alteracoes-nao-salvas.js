/**
 * ============================================================================
 * PGO — testes-alteracoes-nao-salvas.js · não perder o que foi digitado (Etapa 87)
 * ============================================================================
 * F1: o "Trabalhar no caso" pergunta antes de descartar (X, Esc, clicar fora,
 * Fechar). F2: o Cadastrar Caso pergunta ao trocar de canal, entre Caso e
 * Reunião, de tela, e o navegador avisa ao recarregar ou fechar a página. O
 * comportamento é provado no navegador (ponta-a-ponta.js); aqui ficam as regras
 * que o código tem de manter — a do PO sobre dados pessoais incluída.
 * ============================================================================
 */

const { secao, teste, igual, verdadeiro, contem, lerPeca } = require('./ferramentas');

function trecho(texto, de, ate) {
  const i = texto.indexOf(de);
  return i < 0 ? '' : texto.slice(i, ate ? texto.indexOf(ate, i + de.length) : undefined);
}

function rodarTestesDasAlteracoesNaoSalvas() {
  console.log('\nEtapa 87 (F1, F2): não perder o que foi digitado');

  secao('A pergunta');

  teste('o texto e os dois botões são os que o PO pediu, e o padrão é continuar', () => {
    const bloco = trecho(lerPeca('Comuns'), 'function confirmarDescarte(', 'O POP-UP DO SISTEMA');
    contem(bloco, 'Você possui alterações não salvas. Deseja descartá-las?');
    contem(bloco, '>Continuar editando</button>');
    contem(bloco, 'Descartar alterações</button>');
    contem(bloco, "getElementById('continuar-editando').focus()", 'o foco nasce em continuar');
    contem(bloco, "if (evento.target === caixa) continuar();", 'clicar fora é continuar');
    contem(bloco, 'evento.stopPropagation(); continuar();', 'o Esc é continuar, e não chega ao modal');
  });

  secao('F1: o Trabalhar no caso');

  teste('fechar compara com o retrato de quando o caso abriu; gravar fecha sem perguntar', () => {
    const modal = trecho(lerPeca('Comuns'), 'var CasoEmModal', '/* ================================================== alterar o status');
    contem(modal, 'retratoAoAbrir = retratoDaEdicao();', 'o retrato é tirado ao terminar de abrir');
    contem(trecho(modal, 'function fechar(semAvisar)', 'function fecharDeVez'), 'temAlteracaoNaoSalva()');
    contem(modal, "retratoAoAbrir = null;   // gravou", 'depois de gravar, nada a perder');
    contem(modal, "elemento('dialogo-descarte')) return;", 'com a pergunta aberta, o teclado é dela');
  });

  secao('F2: o Cadastrar Caso');

  teste('canal, Caso/Reunião e outra tela passam pela pergunta; o recarregar da tela também', () => {
    const tela = lerPeca('CadastrarCaso');
    const ligar = trecho(tela, '  function ligar() {', 'function atalhoDeSalvar');
    igual((ligar.match(/depoisDePerguntar\(function \(\) \{/g) || []).length, 2, 'o canal e a aba');
    igual((ligar.match(/Aplicacao\.remontar\(true\)/g) || []).length, 2, 'já perguntou: a moldura não pergunta de novo');
    const app = lerPeca('Aplicacao');
    contem(trecho(app, 'function irPara(', 'Servidor.trocouDeTela'), 'saindo.podeSair', 'toda troca de tela pergunta à tela que sai');
    contem(app, "podeSair: function (seguir) { return TelaCadastrarCaso.podeSair(seguir); }");
    contem(trecho(app, 'function remontar(', '}'), 'semPerguntar === true', 'o botão de recarregar do alto pergunta');
  });

  teste('recarregar ou fechar a página: o aviso do navegador, ligado só enquanto a tela está aberta', () => {
    const tela = lerPeca('CadastrarCaso');
    contem(tela, "window.addEventListener('beforeunload', aoSairDaPagina);");
    contem(trecho(tela, 'function desligar()', 'return {'), "window.removeEventListener('beforeunload', aoSairDaPagina);");
    contem(trecho(tela, 'function aoSairDaPagina(', '}\n'), 'if (!temAlteracaoNoCadastro()) return undefined;', 'sem alteração, o navegador não avisa');
  });

  teste('nada de rascunho no navegador: nem CPF, nem nome (decisão do PO)', () => {
    ['CadastrarCaso', 'Comuns'].forEach((peca) => {
      const texto = lerPeca(peca);
      const usos = (texto.match(/(localStorage|sessionStorage|indexedDB)\s*\.\s*setItem|indexedDB\.open/g) || []);
      igual(usos.length, 0, peca + ' não grava nada no navegador');
    });
    contem(lerPeca('CadastrarCaso'), 'Fica SÓ na memória da página');
  });

  teste('o cadastro concluído e o formulário que ainda carrega não têm o que perder', () => {
    const tela = lerPeca('CadastrarCaso');
    const retrato = trecho(tela, 'function retratoDoCadastroAgora()', 'function guardarRetratoDoCadastro');
    contem(retrato, "if (!corpo() || !acoes || acoes.hidden) return null;", 'sem as ações à vista, não há formulário');
    contem(tela, "mostrarAsAcoes(true);\n        guardarRetratoDoCadastro();", 'o retrato é do formulário já montado, com os padrões');
  });
}

module.exports = { rodarTestesDasAlteracoesNaoSalvas };
