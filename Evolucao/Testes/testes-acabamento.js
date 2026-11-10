/**
 * ============================================================================
 * PGO — testes-acabamento.js · acabamento das telas, sem mexer nas cores (Etapa 75)
 * ============================================================================
 * O que as imagens aprovadas pelo PO mostravam: no Cadastrar Caso, as ações à
 * vista com o que falta preencher; em Configurações, a busca na lista de campos
 * e os desligados recolhidos. O comportamento no navegador está no ponta a
 * ponta; aqui, as regras que não podem se perder numa edição.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { secao, teste, igual, verdadeiro, contem } = require('./ferramentas');

const tela = (nome) => fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', nome + '.html'), 'utf8');

/** Um campo de mentira, com o bloco e o rótulo que o Formulario procura. */
function campo(rotulo, valor, extras) {
  return Object.assign({
    value: valor, disabled: false,
    closest: () => ({ hidden: false, querySelector: () => ({ textContent: rotulo + ' *' }) })
  }, extras || {});
}

/** As três funções dos obrigatórios, rodando fora do navegador. */
function obrigatorios() {
  const comuns = tela('Comuns');
  const trecho = comuns.substring(comuns.indexOf('  function faltaPreencher(raiz) {'),
    comuns.indexOf('  /**\n   * Trava o botão enquanto faltar campo obrigatório'));
  const contexto = vm.createContext({});
  vm.runInContext(trecho + '\nvar saida = { faltaPreencher: faltaPreencher, textoDoQueFalta: textoDoQueFalta };', contexto);
  return contexto.saida;
}

const raizCom = (campos) => ({ querySelectorAll: () => campos });

function rodarTestesDoAcabamento() {
  console.log('\nEtapa 75: acabamento das telas');

  /* ----------------------------------------------------------------------- */
  secao('Cadastrar Caso: o que falta preencher');

  teste('diz quantos faltam e quais, na ordem do formulário', () => {
    const f = obrigatorios();
    igual(f.textoDoQueFalta(raizCom([campo('Nome do cliente', ''), campo('Status', 'Pendente'),
      campo('Canal de origem', '  ')])), 'Faltam 2 obrigatórios: Nome do cliente, Canal de origem');
    igual(f.textoDoQueFalta(raizCom([campo('Nome do cliente', '')])), 'Falta 1 obrigatório: Nome do cliente');
    igual(f.textoDoQueFalta(raizCom([campo('Status', 'Pendente')])), '', 'nada faltando, nada escrito');
  });

  teste('passou de três, mostra três e conta o resto', () => {
    const f = obrigatorios();
    const cinco = ['A', 'B', 'C', 'D', 'E'].map((nome) => campo(nome, ''));
    igual(f.textoDoQueFalta(raizCom(cinco)), 'Faltam 5 obrigatórios: A, B, C e mais 2');
  });

  teste('campo escondido ou travado não é cobrado — a mesma regra do botão', () => {
    const f = obrigatorios();
    const escondido = campo('Escondido', '', { closest: () => ({ hidden: true, querySelector: () => null }) });
    const travado = campo('Travado', '', { disabled: true });
    const cobrado = campo('Cobrado', '');
    igual(f.textoDoQueFalta(raizCom([escondido, travado, cobrado])), 'Falta 1 obrigatório: Cobrado');
    verdadeiro(f.faltaPreencher(raizCom([escondido, travado, cobrado])) === cobrado, 'o primeiro que falta');
    igual(f.faltaPreencher(raizCom([escondido, travado])), null);
  });

  teste('o recado e o botão saem da mesma conferência, e as ações grudam no pé', () => {
    contem(tela('Comuns'), "if (aviso) aviso.textContent = textoDoQueFalta(raiz);\n      botao.disabled = !!falta;");
    contem(tela('CadastrarCaso'),
      "Formulario.vigiarObrigatorios(corpo(), elemento('salvar-caso'), elemento('falta-no-caso'));");
    contem(tela('Estilos'), '#acoes-do-caso {\n  position: sticky; bottom: 0;');
  });

  /* ----------------------------------------------------------------------- */
  secao('Configurações: a lista de campos');

  teste('a busca esconde as linhas sem redesenhar, e alcança os desligados', () => {
    const configuracoes = tela('Configuracoes');
    contem(configuracoes, 'id="busca-de-campos"');
    contem(configuracoes, "busca.addEventListener('input', function () {\n        buscaDeCampos = this.value;\n        filtrarListaDeCampos();");
    contem(configuracoes, ": itens[i].getAttribute('data-recolhido') === 'sim';");
  });

  teste('o desligado escolhido não some da lista', () => {
    contem(tela('Configuracoes'),
      'return campo.ativo || desligadosAbertos || !!(escolhido && escolhido.id === campo.id);');
  });

  teste('a seta troca com o vizinho que está na lista — e some durante a busca', () => {
    const configuracoes = tela('Configuracoes');
    contem(configuracoes, "while (destino >= 0 && destino < dados.campos.length && !campoNaLista(dados.campos[destino])) {\n      destino += passo;");
    contem(configuracoes, "(campo === naLista[0] ? ' disabled' : '')");
    contem(tela('Estilos'), '.config-itens.procurando .mover { visibility: hidden; }');
  });
}

module.exports = { rodarTestesDoAcabamento };
