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

module.exports = {
  carregar, secao, teste, igual, verdadeiro, contem, lanca, ehData,
  celula, formatoDaCelula, comoUsuario, resumo, lerPeca, scriptDaPeca
};
