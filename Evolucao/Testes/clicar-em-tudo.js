/**
 * ============================================================================
 * PGO — clicar-em-tudo.js · a varredura que aperta tudo que é apertável
 * ============================================================================
 *   node Evolucao/Testes/clicar-em-tudo.js
 *
 * Abre a prévia num navegador de verdade, percorre TODAS as telas e clica em
 * tudo que tem um atributo de ação, ouvindo `pageerror` e `console.error`.
 *
 * POR QUE ELA EXISTE. Os dois defeitos de "resposta atrasada" — o achado 27 —
 * só aparecem quando alguém clica rápido e desiste no meio, que é o que as
 * pessoas fazem o dia inteiro. Nenhum teste de servidor chegaria perto deles:
 * nos dois, o servidor estava certo e a tela estava certa, e errado era o
 * ENCONTRO, num instante específico.
 *
 * Ela também procura três textos que nunca deveriam chegar à tela:
 * "undefined", "[object Object]" e o recado de função ausente. Os três são
 * sintoma de dado que passou por um lugar errado — e os três a operação
 * enxerga antes de qualquer desenvolvedor.
 *
 * Fica FORA da suíte, pela mesma razão que a conferência de responsividade:
 * `rodar.js` roda com node puro, sem instalar nada, e essa promessa vale mais
 * do que ter tudo num comando só.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

// As telas saem do CÓDIGO, e não de uma lista aqui: ver telasDoSistema, no
// ferramentas.js, que explica por quê e serve às duas varreduras.
const { telasDoSistema } = require('./ferramentas');

const TELAS = telasDoSistema();

/**
 * Tudo que a operação aperta. São os atributos que as telas usam para marcar
 * um elemento clicável — a lista sai do próprio código, não de um chute.
 */
const CLICAVEIS = [
  '[data-tela]', '[data-secao]', '[data-canal]', '[data-cartao]',
  '[data-corretora]', '[data-produto]', '[data-usuario]', '[data-nivel]',
  '[data-item]', '[data-campo-config]', '[data-analise]',
  '[data-tela-do-painel]', '[data-canal-dos-cards]', '[data-aba-corretoras]',
  '[data-tipo-de-lista]', '[data-canal-config]', '[data-ver]', '[data-ponto]',
  '[data-componente]', '[data-trocar-situacao]'
];

/** Quantos elementos de cada tipo apertar. Passar disso só repete o caminho. */
const POR_TIPO = 14;

/** Textos que nunca deveriam aparecer na tela. */
const NUNCA_NA_TELA = ['undefined', '[object Object]', 'não existe no servidor',
  'NaN'];

function acharPlaywright() {
  try {
    return require('playwright');
  } catch (erro) {
    for (const pasta of ['/opt/node22/lib/node_modules/playwright',
      '/usr/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright']) {
      try {
        if (fs.existsSync(pasta)) return require(pasta);
      } catch (outro) { /* tenta o próximo */ }
    }
  }
  return null;
}

function acharNavegador() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!fs.existsSync(base)) return undefined;
  const pasta = fs.readdirSync(base).find((nome) => nome.indexOf('chromium-') === 0);
  if (!pasta) return undefined;
  const caminho = path.join(base, pasta, 'chrome-linux', 'chrome');
  return fs.existsSync(caminho) ? caminho : undefined;
}

async function varrer() {
  const playwright = acharPlaywright();
  if (!playwright) {
    console.log('\nEsta varredura precisa do Playwright, que não está aqui.');
    console.log('  npm install -g playwright && npx playwright install chromium');
    console.log('A suíte (node Evolucao/Testes/rodar.js) não precisa dele.\n');
    return 0;
  }

  const previa = path.join(__dirname, '..', 'previa', 'sistema.html');
  if (!fs.existsSync(previa)) {
    require('./gerar-previa').gerar(path.join(__dirname, '..', 'previa'));
  }

  const executablePath = acharNavegador();
  const navegador = await playwright.chromium.launch(
    executablePath ? { executablePath } : {});
  const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });

  const erros = [];
  pagina.on('pageerror', (erro) => erros.push('erro de página: ' + erro));
  pagina.on('console', (msg) => {
    if (msg.type() === 'error') erros.push('console: ' + msg.text());
  });
  // Um confirm() aberto trava o roteiro. Recusar é o caminho seguro: as ações
  // que perguntam antes são justamente as que apagam alguma coisa.
  pagina.on('dialog', (caixa) => caixa.dismiss());

  await pagina.goto('file://' + previa);
  await pagina.waitForTimeout(700);

  console.log('\nClicando em tudo — ' + TELAS.length + ' telas');
  console.log('-'.repeat(60));

  let cliques = 0;
  for (const tela of TELAS) {
    await pagina.click('[data-tela="' + tela + '"]');
    await pagina.waitForTimeout(700);
    const antes = cliques;

    for (const seletor of CLICAVEIS) {
      const quantos = await pagina.locator(seletor).count();
      for (let i = 0; i < Math.min(quantos, POR_TIPO); i++) {
        try {
          const alvo = pagina.locator(seletor).nth(i);
          if (!(await alvo.isVisible())) continue;
          await alvo.click({ timeout: 1500 });
          cliques++;
          await pagina.waitForTimeout(160);
          await pagina.keyboard.press('Escape');
        } catch (erro) {
          // O elemento sumiu no redesenho. É o esperado, não é falha.
        }
      }
    }

    // Só o texto RENDERIZADO: document.body.textContent inclui o conteúdo das
    // tags <script>, e o próprio código tem a palavra "undefined".
    const naTela = await pagina.evaluate(() => {
      const fora = ['SCRIPT', 'STYLE', 'TEMPLATE'];
      let junto = '';
      const caminhante = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let no;
      while ((no = caminhante.nextNode())) {
        if (fora.indexOf(no.parentElement.tagName) >= 0) continue;
        junto += no.textContent + ' ';
      }
      return junto;
    });
    NUNCA_NA_TELA.forEach((texto) => {
      if (naTela.indexOf(texto) >= 0) {
        erros.push('"' + texto + '" apareceu na tela ' + tela);
      }
    });

    console.log('  ' + tela.padEnd(20) + (cliques - antes) + ' cliques');
  }

  await navegador.close();

  const unicos = erros.filter((e, i) => erros.indexOf(e) === i);
  console.log('-'.repeat(60));
  if (unicos.length) {
    console.log(cliques + ' cliques, ' + unicos.length + ' PROBLEMA(S):');
    unicos.forEach((e) => console.log('  ' + e));
    return 1;
  }
  console.log(cliques + ' cliques, nenhum erro\n');
  return 0;
}

varrer().then((codigo) => { process.exitCode = codigo; });
