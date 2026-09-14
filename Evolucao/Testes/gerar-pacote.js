/**
 * ============================================================================
 * PGO — gerar-pacote.js · os 35 arquivos viram 3
 * ============================================================================
 *   node Evolucao/Testes/gerar-pacote.js
 *
 * ---------------------------------------------------------------------------
 * O PROBLEMA QUE ELE RESOLVE
 * ---------------------------------------------------------------------------
 * O repositório tem 18 arquivos `.gs` e 17 `.html`, separados por assunto —
 * e é assim que tem de ser para alguém conseguir ler e consertar. Mas o Apps
 * Script não tem "importar pasta": cada um vira um arquivo criado à mão, com
 * o nome digitado certo. Trinta e cinco vezes.
 *
 * E o custo disso não é o tempo: é que basta UM ficar para trás para a tela
 * congelar num "Lendo o cadastro…" que não explica nada. Já aconteceu duas
 * vezes aqui — os achados 25 e 27.
 *
 * Então este gerador junta tudo em TRÊS arquivos:
 *
 *     Codigo.gs      os 18 arquivos do servidor, na ordem alfabética
 *     Index.html     o esqueleto com as 15 telas já coladas dentro
 *     SemAcesso.html a tela de acesso negado, que o doGet serve sozinha
 *
 * Três colagens em vez de trinta e cinco. O repositório continua separado por
 * assunto — o pacote é SAÍDA, como as abas ANALISE_*, e é refeito a cada
 * mudança.
 *
 * ---------------------------------------------------------------------------
 * O QUE ELE NÃO FAZ
 * ---------------------------------------------------------------------------
 * Não muda uma linha de código. Concatena `.gs` na ordem em que o Apps Script
 * já os avaliaria, e substitui cada `incluir('X')` do Index pelo conteúdo de
 * `X.html`. Se o pacote se comportar diferente dos 35 arquivos, é bug daqui —
 * e há teste comparando os dois.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const SERVIDOR = path.join(RAIZ, 'Back-End');
const TELAS = path.join(RAIZ, 'Front-End');

/** O aviso que vai no alto dos arquivos gerados. */
function cabecalho(oQueEste, deQuais) {
  return '/* ==========================================================================\n'
    + '   ' + oQueEste + '\n'
    + '   --------------------------------------------------------------------------\n'
    + '   ARQUIVO GERADO — não edite aqui.\n'
    + '\n'
    + '   Ele junta ' + deQuais + ' do repositório para caberem numa colagem só no\n'
    + '   Apps Script. Para mudar qualquer coisa, mexa no arquivo original e rode\n'
    + '   de novo:\n'
    + '\n'
    + '       node Evolucao/Testes/gerar-pacote.js\n'
    + '\n'
    + '   Gerado em ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + '\n'
    + '   ========================================================================== */\n\n';
}

/** Os 18 arquivos do servidor, na MESMA ordem em que o Apps Script os avalia. */
function juntarOServidor() {
  const arquivos = fs.readdirSync(SERVIDOR)
    .filter((nome) => nome.endsWith('.gs'))
    .sort();

  const pedacos = arquivos.map((nome) => {
    const fonte = fs.readFileSync(path.join(SERVIDOR, nome), 'utf8');
    return '\n\n/* ==== ' + nome + ' '
      + '='.repeat(Math.max(0, 68 - nome.length)) + ' */\n\n' + fonte.trim();
  });

  return {
    conteudo: cabecalho('PGO — Codigo.gs', 'os ' + arquivos.length
      + ' arquivos .gs') + pedacos.join('\n') + '\n',
    arquivos: arquivos
  };
}

/**
 * O Index com as telas coladas dentro.
 *
 * Os scriptlets `<?= identidade.nome ?>` FICAM: eles são avaliados pelo Apps
 * Script na hora de servir, e continuam sendo. Só o `incluir('X')` some, porque
 * o conteúdo de X passa a estar ali.
 */
function juntarAsTelas() {
  let index = fs.readFileSync(path.join(TELAS, 'Index.html'), 'utf8');
  const coladas = [];

  index = index.replace(/^[ \t]*<\?!=\s*incluir\('([A-Za-z0-9_]+)'\)\s*\?>[ \t]*$/gm,
    function (linhaInteira, nome) {
      const caminho = path.join(TELAS, nome + '.html');
      if (!fs.existsSync(caminho)) {
        throw new Error('O Index inclui "' + nome + '" e o arquivo não existe.');
      }
      coladas.push(nome);
      return '\n<!-- ==== ' + nome + '.html ==== -->\n'
        + fs.readFileSync(caminho, 'utf8').trim() + '\n';
    });

  const sobrou = index.match(/incluir\('([A-Za-z0-9_]+)'\)/g);
  if (sobrou) {
    throw new Error('Sobraram inclusões que não sei colar: ' + sobrou.join(', '));
  }

  return { conteudo: index, coladas: coladas };
}

function gerar(pastaDeSaida) {
  const destino = pastaDeSaida || path.join(RAIZ, 'Evolucao', 'pacote');
  fs.mkdirSync(destino, { recursive: true });

  const servidor = juntarOServidor();
  const telas = juntarAsTelas();
  const semAcesso = fs.readFileSync(path.join(TELAS, 'SemAcesso.html'), 'utf8');

  fs.writeFileSync(path.join(destino, 'Codigo.gs'), servidor.conteudo);
  fs.writeFileSync(path.join(destino, 'Index.html'), telas.conteudo);
  fs.writeFileSync(path.join(destino, 'SemAcesso.html'), semAcesso);

  const comoUsar = [
    'COMO USAR ESTE PACOTE',
    '=====================',
    '',
    'São três arquivos, em vez dos 35 do repositório. No editor do Apps Script:',
    '',
    '  1. Apague os arquivos que já estiverem lá (menu de cada um > Excluir).',
    '     Sobra o Codigo.gs que o Apps Script cria sozinho — use ele no passo 2.',
    '',
    '  2. Arquivo .gs chamado "Codigo"      <- cole Codigo.gs',
    '  3. Arquivo HTML chamado "Index"      <- cole Index.html',
    '  4. Arquivo HTML chamado "SemAcesso"  <- cole SemAcesso.html',
    '',
    'ATENÇÃO AOS NOMES: no Apps Script o arquivo se chama "Index", e não',
    '"Index.html" — sem extensão, sem acento, com as maiúsculas iguais.',
    '',
    '  5. Publique como aplicativo da web (executar como você).',
    '  6. Execute instalarRECC() UMA vez, sobre uma planilha vazia.',
    '  7. Execute diagnosticoRECC() para conferir tudo.',
    '',
    'O QUE TEM DENTRO',
    '----------------',
    'Codigo.gs      ' + servidor.arquivos.length + ' arquivos: '
      + servidor.arquivos.join(', '),
    'Index.html     ' + telas.coladas.length + ' telas: ' + telas.coladas.join(', '),
    'SemAcesso.html a tela de acesso negado, servida sozinha pelo doGet',
    '',
    'NÃO EDITE ESTES TRÊS ARQUIVOS. Eles são gerados. Mexa no repositório e rode',
    'node Evolucao/Testes/gerar-pacote.js de novo.',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(destino, 'COMO-USAR.txt'), comoUsar);

  return {
    destino: destino,
    servidor: servidor.arquivos.length,
    telas: telas.coladas.length,
    bytes: {
      codigo: servidor.conteudo.length,
      index: telas.conteudo.length,
      semAcesso: semAcesso.length
    }
  };
}

module.exports = { gerar };

if (require.main === module) {
  const feito = gerar();
  const kb = (n) => Math.round(n / 1024) + ' KB';
  console.log('\nPacote gerado em ' + feito.destino);
  console.log('  Codigo.gs        ' + kb(feito.bytes.codigo).padStart(7)
    + '   (' + feito.servidor + ' arquivos do servidor)');
  console.log('  Index.html       ' + kb(feito.bytes.index).padStart(7)
    + '   (' + feito.telas + ' telas coladas dentro)');
  console.log('  SemAcesso.html   ' + kb(feito.bytes.semAcesso).padStart(7)
    + '   (a tela de acesso negado)');
  console.log('  COMO-USAR.txt            o passo a passo\n');
  console.log('  35 arquivos para copiar viraram 3.\n');
}
