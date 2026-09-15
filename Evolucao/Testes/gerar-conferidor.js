/**
 * ============================================================================
 * PGO — gerar-conferidor.js · escreve o Evolucao/conferir-projeto.gs
 * ============================================================================
 *   node Evolucao/Testes/gerar-conferidor.js
 *
 * ---------------------------------------------------------------------------
 * POR QUE ISTO É GERADO, E NÃO ESCRITO À MÃO
 * ---------------------------------------------------------------------------
 * O `conferir-projeto.gs` carrega uma lista: qual arquivo .gs traz quais
 * funções que as telas chamam. É uma ferramenta de resgate — cola-se num
 * projeto do Apps Script que não abre, e ela diz qual arquivo ficou para trás
 * na cópia.
 *
 * Uma lista dessas escrita à mão não avisa quando envelhece. Ela continua
 * respondendo com confiança, só que sobre o código de meses atrás: aponta um
 * arquivo que não existe mais, ou deixa de cobrar uma função nova. Uma
 * ferramenta de resgate que mente é pior do que nenhuma, porque quem a usou
 * já parou de procurar.
 *
 * É o achado 33 outra vez, e a resposta é a mesma: gerar em vez de digitar, e
 * ter um teste que compara o gerado com o guardado.
 *
 * ---------------------------------------------------------------------------
 * COMO ELE MONTA A LISTA
 * ---------------------------------------------------------------------------
 * Do mesmo jeito que o bloco "a ligação entre a tela e o servidor" do
 * diagnóstico monta a dele, e de propósito: se os dois lessem o código de
 * maneiras diferentes, um poderia aprovar o que o outro reprova.
 *
 *   1. procura `Servidor.chamar('nome')` em todo Front-End/*.html
 *   2. procura `function nome(` em todo Back-End/*.gs
 *   3. cruza os dois — cada função chamada, no arquivo que a declara
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const SERVIDOR = path.join(RAIZ, 'Back-End');
const TELAS = path.join(RAIZ, 'Front-End');
const DESTINO = path.join(RAIZ, 'Evolucao', 'conferir-projeto.gs');

/** Toda função que alguma tela pede ao servidor, sem repetição e em ordem. */
function funcoesQueAsTelasChamam() {
  const nomes = new Set();
  fs.readdirSync(TELAS)
    .filter((nome) => nome.endsWith('.html'))
    .forEach((nome) => {
      const fonte = fs.readFileSync(path.join(TELAS, nome), 'utf8');
      (fonte.match(/Servidor\.chamar\('([A-Za-z0-9_]+)'/g) || [])
        .forEach((achado) => {
          nomes.add(achado.replace("Servidor.chamar('", '').replace("'", ''));
        });
    });
  return Array.from(nomes).sort();
}

/** Em que arquivo .gs cada função está declarada. */
function ondeCadaFuncaoMora() {
  const casa = {};
  fs.readdirSync(SERVIDOR)
    .filter((nome) => nome.endsWith('.gs'))
    .sort()
    .forEach((arquivo) => {
      const fonte = fs.readFileSync(path.join(SERVIDOR, arquivo), 'utf8');
      (fonte.match(/^function ([A-Za-z0-9_]+)\s*\(/gm) || []).forEach((achado) => {
        const nome = achado.replace(/^function /, '').replace(/\s*\($/, '');
        if (!casa[nome]) casa[nome] = arquivo;
      });
    });
  return casa;
}

/** O mapa arquivo → funções, na ordem em que vai ser escrito. */
function montarMapa() {
  const casa = ondeCadaFuncaoMora();
  const semCasa = [];
  const mapa = {};

  funcoesQueAsTelasChamam().forEach((nome) => {
    const arquivo = casa[nome];
    if (!arquivo) { semCasa.push(nome); return; }
    if (!mapa[arquivo]) mapa[arquivo] = [];
    mapa[arquivo].push(nome);
  });

  // Uma tela que chama função que não existe em lugar nenhum é defeito de
  // verdade, e cabe ao diagnóstico apontar. Aqui só não podemos inventar um
  // arquivo para ela: gerar um conferidor com nome errado seria pior.
  if (semCasa.length) {
    throw new Error('estas funções a tela chama e nenhum .gs declara: '
      + semCasa.join(', ') + '\n'
      + 'Rode diagnosticoRECC() — é ele quem explica o que fazer.');
  }
  return mapa;
}

/** O texto completo do arquivo, pronto para gravar. */
function montarArquivo() {
  const mapa = montarMapa();
  const arquivos = Object.keys(mapa).sort();
  const quantas = arquivos.reduce((soma, a) => soma + mapa[a].length, 0);

  const linhas = arquivos.map((arquivo) => "    '" + arquivo + "': ["
    + mapa[arquivo].map((n) => "'" + n + "'").join(', ') + '],');
  // a última sem vírgula, para não deixar sobra
  linhas[linhas.length - 1] = linhas[linhas.length - 1].replace(/,$/, '');

  return `/**
 * PGO — conferir-projeto.gs · qual arquivo ficou para trás na cópia
 * ============================================================================
 * COLE ISTO NUM ARQUIVO .gs NOVO NO APPS SCRIPT E EXECUTE
 * \`oQueFaltaNoProjeto\`. O resultado sai no log (Ver › Registros de execução).
 *
 * ELA NÃO DEPENDE DE NENHUM OUTRO ARQUIVO DO PGO — e é esse o ponto. O
 * diagnóstico completo (\`diagnosticoRECC\`) responde muito mais, mas ele mora
 * no \`Instalacao.gs\`: se o problema for justamente um arquivo que não foi
 * copiado, pode ser o dele. Esta aqui se vira sozinha.
 *
 * O SINTOMA QUE ELA EXPLICA: a tela fica parada numa mensagem de carregamento
 * — "Lendo o cadastro…", "Somando os casos…" — e não sai dali. Quando a função
 * não existe no servidor, \`google.script.run.nomeDela\` é \`undefined\` e a
 * chamada estoura antes de sair do navegador, num ponto em que o tratamento de
 * erro da tela ainda nem foi registrado. Nada aparece: a tela só congela.
 *
 * ----------------------------------------------------------------------------
 * NÃO EDITE ESTE ARQUIVO À MÃO.
 * Ele é escrito por \`node Evolucao/Testes/gerar-conferidor.js\`, a partir do
 * código de verdade, e há um teste na suíte cobrando que os dois batam. Lista
 * digitada à mão envelhece calada — é o achado 33.
 * ----------------------------------------------------------------------------
 * Depois de copiar o que faltar, pode apagar este arquivo.
 * ============================================================================
 */
function oQueFaltaNoProjeto() {
  var esperado = {
${linhas.join('\n')}
  };

  var faltando = [];
  var arquivosIncompletos = [];

  Object.keys(esperado).forEach(function (arquivo) {
    var ausentes = esperado[arquivo].filter(function (nome) {
      return typeof globalThis[nome] !== 'function';
    });
    if (!ausentes.length) return;
    arquivosIncompletos.push(arquivo);
    ausentes.forEach(function (nome) { faltando.push(arquivo + ' -> ' + nome); });
  });

  var recado;
  if (!faltando.length) {
    recado = 'TUDO AQUI. As ${quantas} funcoes que as telas chamam existem no projeto.';
  } else {
    recado = 'FALTAM ' + faltando.length + ' funcao(oes), em '
      + arquivosIncompletos.length + ' arquivo(s):\\n\\n'
      + '  COPIE ESTES ARQUIVOS: ' + arquivosIncompletos.join(', ') + '\\n\\n'
      + faltando.join('\\n');
  }
  Logger.log(recado);
  return recado;
}
`;
}

function gerar() {
  const texto = montarArquivo();
  fs.writeFileSync(DESTINO, texto);
  return texto;
}

module.exports = { gerar, montarArquivo };

if (require.main === module) {
  const texto = gerar();
  const mapa = montarMapa();
  const arquivos = Object.keys(mapa).sort();
  const quantas = arquivos.reduce((soma, a) => soma + mapa[a].length, 0);
  console.log('\nEscrito ' + DESTINO);
  console.log('  ' + quantas + ' funções que as telas chamam, em '
    + arquivos.length + ' arquivos:');
  arquivos.forEach((a) => {
    console.log('    ' + a.padEnd(18) + String(mapa[a].length).padStart(3));
  });
  console.log('  ' + texto.split('\n').length + ' linhas\n');
}
