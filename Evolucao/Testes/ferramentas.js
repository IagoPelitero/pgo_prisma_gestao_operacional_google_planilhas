/**
 * ============================================================================
 * RECC — ferramentas.js · o mínimo para escrever um teste
 * ============================================================================
 * Sem biblioteca de fora: quem ler este arquivo entende a suíte inteira.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { criarAmbienteFalso } = require('./simulador');

const PASTA_DO_SERVIDOR = path.join(__dirname, '..', '..', 'Back-End');
const PASTA_DAS_TELAS = path.join(__dirname, '..', '..', 'Front-End');

/**
 * O texto de UMA peça de tela, ache ela onde estiver.
 *
 * As peças que mais de uma tela usa moram juntas no Comuns.html, cada uma
 * atrás de um banner "PEÇA n de m · Nome". Um teste que quer conferir só a
 * Moldura não deveria precisar saber disso: se amanhã as peças se separarem
 * de novo, ou mudarem de vizinho, o teste continua valendo.
 *
 * Então: se existir um arquivo com o nome da peça, é ele. Se não, procura o
 * banner dela dentro dos outros arquivos e devolve só o trecho dela, até o
 * banner seguinte.
 */
function lerPeca(nome) {
  const proprio = path.join(PASTA_DAS_TELAS, nome + '.html');
  if (fs.existsSync(proprio)) return fs.readFileSync(proprio, 'utf8');

  const marca = 'PEÇA ';
  const arquivos = fs.readdirSync(PASTA_DAS_TELAS).filter((n) => n.endsWith('.html'));
  for (const arquivo of arquivos) {
    const texto = fs.readFileSync(path.join(PASTA_DAS_TELAS, arquivo), 'utf8');
    const pedacos = texto.split(marca);
    for (let i = 1; i < pedacos.length; i += 1) {
      // O banner é "PEÇA 1 de 6 · Moldura\n" — o nome vem depois do ponto.
      const primeiraLinha = pedacos[i].split('\n')[0];
      const partes = primeiraLinha.split('· ');
      if (partes.length < 2 || partes[1].trim() !== nome) continue;
      return pedacos[i];
    }
  }
  throw new Error('não achei a peça "' + nome + '" em Front-End/ — '
    + 'nem como arquivo próprio, nem como trecho de outro');
}

/**
 * Só o JavaScript de uma peça, pronto para rodar numa vm.
 *
 * Recorta do primeiro <script> ao último </script>. Tem de ser assim, e não
 * um replace no começo e no fim do texto: quando a peça vem de dentro de um
 * arquivo com outras, ela chega com o banner de comentário em volta.
 */
function scriptDaPeca(nome) {
  const bruto = lerPeca(nome);
  const abre = bruto.indexOf('<script>');
  const fecha = bruto.lastIndexOf('</script>');
  if (abre < 0 || fecha < 0) {
    throw new Error('a peça "' + nome + '" não tem um bloco <script>');
  }
  return bruto.substring(abre + '<script>'.length, fecha);
}

/**
 * Carrega os arquivos .gs num ambiente falso, na MESMA ordem em que o Apps
 * Script os avalia: alfabética. Se algum arquivo tiver código de topo que
 * dependa de outro, o erro aparece aqui — e não em produção.
 */
function carregar(email) {
  const ambiente = criarAmbienteFalso(email);
  const contexto = vm.createContext(ambiente.globais);
  fs.readdirSync(PASTA_DO_SERVIDOR)
    .filter((nome) => nome.endsWith('.gs'))
    .sort()
    .forEach((nome) => {
      const codigo = fs.readFileSync(path.join(PASTA_DO_SERVIDOR, nome), 'utf8');
      vm.runInContext(codigo, contexto, { filename: nome });
    });
  return {
    ambiente,
    contexto,
    chamar: (expressao) => vm.runInContext(expressao, contexto)
  };
}

let passaram = 0;
const falhas = [];

function secao(titulo) {
  console.log('\n' + titulo);
}

function teste(nome, corpo) {
  try {
    corpo();
    passaram++;
    console.log('  ok   ' + nome);
  } catch (erro) {
    falhas.push({ nome, erro });
    console.log('  FALHA ' + nome + '\n        ' + erro.message);
  }
}

function igual(obtido, esperado, oQue) {
  if (obtido !== esperado) {
    throw new Error((oQue || 'valor') + ': esperado ' + JSON.stringify(esperado) +
      ', obtido ' + JSON.stringify(obtido) + ' (' + typeof obtido + ')');
  }
}

function verdadeiro(condicao, oQue) {
  if (!condicao) throw new Error(oQue || 'condição falsa');
}

function contem(texto, trecho, oQue) {
  if (String(texto).indexOf(trecho) < 0) {
    throw new Error((oQue || 'texto') + ': não encontrei "' + trecho + '"');
  }
}

function lanca(funcao, trecho, oQue) {
  try {
    funcao();
  } catch (erro) {
    if (trecho && erro.message.indexOf(trecho) < 0) {
      throw new Error((oQue || '') + ': o erro veio com outra mensagem — ' +
        erro.message);
    }
    return erro;
  }
  throw new Error((oQue || 'esperava um erro') + ', mas nada foi lançado');
}

/**
 * Date criado dentro do ambiente falso tem outro prototype que o Date daqui,
 * então `instanceof Date` mente. Esta é a pergunta que atravessa contextos.
 */
function ehData(valor) {
  return Object.prototype.toString.call(valor) === '[object Date]';
}

/** Lê a célula crua do simulador, sem passar pelo produto. */
function celula(planilha, aba, linha, cabecalho) {
  const folha = planilha.getSheetByName(aba);
  const cabecalhos = folha.getRange(1, 1, 1, folha.getMaxColumns()).getValues()[0];
  const c = cabecalhos.indexOf(cabecalho);
  if (c < 0) throw new Error('Cabeçalho "' + cabecalho + '" não existe em ' + aba);
  return folha.getRange(linha, c + 1).getValue();
}

function formatoDaCelula(planilha, aba, linha, cabecalho) {
  const folha = planilha.getSheetByName(aba);
  const cabecalhos = folha.getRange(1, 1, 1, folha.getMaxColumns()).getValues()[0];
  const c = cabecalhos.indexOf(cabecalho);
  return folha.getRange(linha, c + 1).getNumberFormats()[0][0];
}

/**
 * Roda um trecho como outra pessoa, e devolve o crachá no fim.
 *
 * Sem o `finally`, um teste que estoura deixa a sessão logada como o usuário
 * dele — e os testes seguintes falham por um motivo que não é o deles. Já
 * aconteceu aqui: quatro falhas, uma causa.
 */
function comoUsuario(ambiente, email, corpo) {
  const anterior = ambiente.emailAtual();
  ambiente.definirEmail(email);
  try {
    return corpo();
  } finally {
    ambiente.definirEmail(anterior);
  }
}

function resumo() {
  return { passaram, falhas };
}

/**
 * As telas do sistema, lidas do CÓDIGO.
 *
 * As duas ferramentas de navegador — a de responsividade e a de clicar em tudo
 * — precisam saber quais telas existem. Cada uma tinha a sua lista escrita à
 * mão, e elas já divergiam entre si: uma com sete nomes, a outra com cinco, e
 * as duas dizendo "todas as telas" no cabeçalho. No dia em que nasceu o
 * Importação, as duas continuaram aprovando com a mesma confiança — caladas a
 * respeito da tela nova, que era justamente a que precisava ser olhada.
 *
 * Ferramenta de conferência que não conhece o que existe hoje é pior que
 * nenhuma: quem a rodou já parou de procurar. É o achado 33.
 */
function telasDoSistema() {
  const fonte = fs.readFileSync(
    path.join(__dirname, '..', '..', 'Back-End', 'Entrada.gs'), 'utf8');
  const bloco = fonte.match(/RECC_TELAS_DO_SISTEMA\s*=\s*\[([\s\S]*?)\];/);
  if (!bloco) {
    throw new Error('Não achei RECC_TELAS_DO_SISTEMA no Back-End/Entrada.gs. '
      + 'Sem ela ninguém sabe quais telas existem, e uma varredura que adivinha '
      + 'é pior que nenhuma.');
  }
  const nomes = (bloco[1].match(/tela:\s*'([A-Za-z0-9_]+)'/g) || [])
    .map((achado) => achado.replace(/.*'([A-Za-z0-9_]+)'.*/, '$1'));
  if (!nomes.length) throw new Error('A lista de telas veio vazia.');
  return nomes;
}

/**
 * Um elemento de página de mentira, com o mínimo que as telas usam.
 *
 * POR QUE ELE EXISTE. Três regras pedidas pelo PO moram no navegador, e não no
 * servidor: o botão de cadastrar que fica inativo até os obrigatórios estarem
 * preenchidos, os três pontinhos de "estou gravando", e nenhum botão clicável
 * durante a gravação. Conferir isso lendo o código-fonte com `contem` provaria
 * que a linha está escrita, não que ela funciona — e foi justamente um "está
 * escrito, mas não funciona" que trouxe o defeito do valor em branco.
 *
 * NÃO É UM NAVEGADOR, e não tenta ser: tem `getAttribute`, `querySelectorAll`
 * por atributo, `closest`, ouvinte de evento que sobe para o pai, e nada mais.
 * O navegador de verdade continua sendo olhado pelas varreduras do Playwright;
 * isto aqui é o que caberia numa suíte que roda com node puro.
 *
 * `disparar` sobe o evento pelos pais, como `input` e `change` fazem de
 * verdade — é disso que depende o ouvinte único na raiz do formulário.
 */
function elementoFalso(tag, atributos) {
  const el = {
    tag: tag,
    atributos: Object.assign({}, atributos || {}),
    filhos: [],
    pai: null,
    ouvintes: {},
    value: '',
    disabled: false,
    hidden: false,
    title: '',
    innerHTML: '',
    focado: false,

    getAttribute: (nome) => (Object.prototype.hasOwnProperty.call(el.atributos, nome)
      ? el.atributos[nome] : null),
    setAttribute: (nome, valor) => { el.atributos[nome] = String(valor); },
    removeAttribute: (nome) => { delete el.atributos[nome]; },
    addEventListener: (tipo, oQueFazer) => {
      el.ouvintes[tipo] = (el.ouvintes[tipo] || []).concat(oQueFazer);
    },
    focus: () => { el.focado = true; },

    /** Combina com 'button' ou com [atributo] / [atributo="valor"]. */
    combina: (seletor) => {
      if (seletor === el.tag) return true;
      const porAtributo = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(seletor);
      if (!porAtributo) return false;
      const valor = el.getAttribute(porAtributo[1]);
      if (valor === null) return false;
      return porAtributo[2] === undefined || valor === porAtributo[2];
    },

    querySelectorAll: (seletor) => el.filhos.reduce(
      (achados, filho) => achados
        .concat(filho.combina(seletor) ? [filho] : [])
        .concat(filho.querySelectorAll(seletor)), []),

    querySelector: (seletor) => el.querySelectorAll(seletor)[0] || null,

    closest: (seletor) => {
      let subindo = el;
      while (subindo) {
        if (subindo.combina(seletor)) return subindo;
        subindo = subindo.pai;
      }
      return null;
    },

    /** Põe um filho dentro, e devolve o pai para encadear. */
    por: (...filhos) => {
      filhos.forEach((filho) => { filho.pai = el; el.filhos.push(filho); });
      return el;
    },

    /** Dispara o evento aqui e sobe pelos pais, como o navegador faz. */
    disparar: (tipo) => {
      let subindo = el;
      while (subindo) {
        (subindo.ouvintes[tipo] || []).forEach((oQueFazer) => oQueFazer());
        subindo = subindo.pai;
      }
    }
  };
  return el;
}

/**
 * Uma peça de tela rodando numa vm, com os vizinhos de que ela precisa.
 *
 * Cada teste que precisava de uma peça montava este mesmo contexto à mão, com
 * um `Moldura.escapar` ligeiramente diferente em cada lugar.
 */
function pecaRodando(nome, vizinhos) {
  const vm = require('vm');
  const contexto = vm.createContext(Object.assign({
    document: { getElementById: () => null, createElement: () => elementoFalso('div') },
    Moldura: { escapar: (texto) => String(texto === undefined ? '' : texto) },
    Servidor: { chamar: () => ({ entao: () => ({ senao: () => null }) }) },
    console
  }, vizinhos || {}));
  vm.runInContext(scriptDaPeca(nome), contexto, { filename: nome + '.html' });
  return contexto;
}

module.exports = {
  telasDoSistema,
  carregar, secao, teste, igual, verdadeiro, contem, lanca, ehData,
  celula, formatoDaCelula, comoUsuario, resumo, lerPeca, scriptDaPeca,
  elementoFalso, pecaRodando
};
