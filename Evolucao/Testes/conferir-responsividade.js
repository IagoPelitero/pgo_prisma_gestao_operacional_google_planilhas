/**
 * ============================================================================
 * PGO — conferir-responsividade.js · nada pode quebrar em tela estreita
 * ============================================================================
 *   node Evolucao/Testes/conferir-responsividade.js
 *
 * Abre a prévia num navegador de verdade e percorre TODAS as telas em TODAS
 * as larguras que importam — do monitor de 1600 ao celular de 320. Em cada
 * combinação, procura duas coisas:
 *
 *   a página rolando na horizontal, que é o sintoma;
 *   o elemento que escapou da janela, que é a causa.
 *
 * Tabela larga dentro de uma caixa que rola de propósito NÃO conta: rolar a
 * tabela é a solução, e não o problema. A conferência sobe pelos pais do
 * elemento procurando um `overflow-x` que role, e só reclama quando não há.
 *
 * FICA FORA DA SUÍTE de propósito. `rodar.js` roda com `node` puro, sem
 * instalar nada — é o que permite qualquer pessoa conferir o sistema em dez
 * segundos. Esta conferência precisa de um navegador, e por isso é um
 * comando à parte. Quem não tiver Playwright recebe um recado dizendo isso,
 * e não um erro.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const TELAS = ['dashboard', 'cadastrarCaso', 'buscarCaso', 'painelAnalitico',
  'configuracoes', 'minhaPerformance', 'tabelaCorretoras'];

/** As larguras que importam: monitor, notebook, tablet, celular. */
const LARGURAS = [1600, 1280, 1024, 900, 820, 768, 640, 540, 430, 390, 360, 320];

function acharPlaywright() {
  try {
    return require('playwright');
  } catch (erro) {
    // Instalado globalmente é o caso comum de quem só quer conferir.
    for (const pasta of ['/opt/node22/lib/node_modules/playwright',
      '/usr/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright']) {
      try {
        if (fs.existsSync(pasta)) return require(pasta);
      } catch (outro) { /* tenta o próximo */ }
    }
  }
  return null;
}

/** O Chromium que o Playwright baixou, quando ele não se acha sozinho. */
function acharNavegador() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!fs.existsSync(base)) return undefined;
  const pasta = fs.readdirSync(base).find((nome) => nome.indexOf('chromium-') === 0);
  if (!pasta) return undefined;
  const caminho = path.join(base, pasta, 'chrome-linux', 'chrome');
  return fs.existsSync(caminho) ? caminho : undefined;
}

async function conferir() {
  const playwright = acharPlaywright();
  if (!playwright) {
    console.log('\nEsta conferência precisa do Playwright, que não está aqui.');
    console.log('  npm install -g playwright && npx playwright install chromium');
    console.log('A suíte de testes (node Evolucao/Testes/rodar.js) não precisa dele.\n');
    return 0;
  }

  const previa = path.join(__dirname, '..', 'previa', 'sistema.html');
  if (!fs.existsSync(previa)) {
    require('./gerar-previa').gerar(path.join(__dirname, '..', 'previa'));
  }

  const executablePath = acharNavegador();
  const navegador = await playwright.chromium.launch(
    executablePath ? { executablePath } : {});

  console.log('\nResponsividade — ' + TELAS.length + ' telas × '
    + LARGURAS.length + ' larguras');
  console.log('-'.repeat(60));

  const problemas = [];
  let combinacoes = 0;

  for (const largura of LARGURAS) {
    const pagina = await navegador.newPage({ viewport: { width: largura, height: 900 } });
    pagina.on('pageerror', (erro) => {
      problemas.push(largura + 'px · erro de página: ' + erro.message);
    });
    await pagina.goto('file://' + previa);
    await pagina.waitForSelector('.lateral-item', { timeout: 15000 });

    const linha = [];
    for (const tela of TELAS) {
      combinacoes++;
      await pagina.evaluate((qual) => { location.hash = qual; }, tela);
      await pagina.waitForTimeout(900);

      const medida = await pagina.evaluate(() => {
        const escapou = Array.from(document.querySelectorAll('#miolo *')).filter((el) => {
          const caixa = el.getBoundingClientRect();
          if (!caixa.width && !caixa.height) return false;
          // Dentro de uma caixa que rola de propósito não é problema: rolar a
          // tabela é a solução, não o sintoma.
          let pai = el.parentElement;
          while (pai && pai !== document.body) {
            const estilo = getComputedStyle(pai);
            if (estilo.overflowX === 'auto' || estilo.overflowX === 'scroll') return false;
            pai = pai.parentElement;
          }
          return caixa.right > window.innerWidth + 1 || caixa.left < -1;
        });
        // E os BOTÕES CORTADOS PELA PRÓPRIA CÉLULA.
        //
        // A conferência acima ignora, de propósito, o que está dentro de uma
        // caixa que rola — rolar a tabela é a solução. Só que um botão pode
        // ficar cortado sem que nada role: a coluna de ações tem largura fixa,
        // e um botão a mais simplesmente passa da borda dela.
        //
        // Aconteceu ao acrescentar o excluir na fila: o botão existia no HTML,
        // o teste que procurava por ele passava, e na tela aparecia pela
        // metade. É o pior dos dois mundos — verde no teste, quebrado no olho.
        const cortados = Array.from(document.querySelectorAll('td.acoes-coluna'))
          .flatMap((celula) => {
            const borda = celula.getBoundingClientRect().right;
            return Array.from(celula.children).filter((botao) => {
              const caixa = botao.getBoundingClientRect();
              return caixa.width > 0 && caixa.right > borda + 1;
            });
          });

        return {
          rola: document.body.scrollWidth > window.innerWidth,
          fora: escapou.slice(0, 3).map((el) => el.tagName.toLowerCase() + '.'
            + String(el.className.baseVal !== undefined
              ? el.className.baseVal : el.className).split(' ')[0]),
          cortados: cortados.slice(0, 3).map((el) => String(el.className)
            .split(' ')[0] + ' (' + (el.getAttribute('title') || el.textContent)
            .trim().slice(0, 22) + ')')
        };
      });

      if (medida.rola || medida.fora.length || medida.cortados.length) {
        problemas.push(largura + 'px · ' + tela
          + (medida.rola ? ' · a página rola na horizontal' : '')
          + (medida.fora.length ? ' · escapa: ' + medida.fora.join(', ') : '')
          + (medida.cortados.length
            ? ' · botão cortado pela coluna: ' + medida.cortados.join(', ') : ''));
        linha.push('✗ ' + tela);
      } else {
        linha.push('· ' + tela);
      }
    }
    console.log(String(largura).padStart(5) + 'px  ' + linha.join('   '));
    await pagina.close();
  }

  await navegador.close();

  console.log('-'.repeat(60));
  if (problemas.length) {
    console.log(problemas.length + ' problema(s) em ' + combinacoes + ' combinações:\n');
    problemas.forEach((um) => console.log('  ' + um));
    console.log('');
    return 1;
  }
  console.log(combinacoes + ' combinações, nenhuma quebra\n');
  return 0;
}

if (require.main === module) {
  conferir().then((codigo) => { process.exitCode = codigo; });
}

module.exports = { conferir };
