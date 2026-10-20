/**
 * ============================================================================
 * PGO — clicar-com-base-suja.js · clicar em tudo com o servidor de verdade
 * ============================================================================
 *   node Evolucao/Testes/clicar-com-base-suja.js
 *
 * Parte da varredura geral pedida pelo PO ("um teste em todo o sistema para
 * capturar bugs, erros e quebras").
 *
 * O `clicar-em-tudo.js` clica na PRÉVIA, que responde com o que o gerador
 * guardou — dados limpos, escolhidos para a foto sair bonita. Esta clica no
 * sistema de verdade: a página que o `doGet` monta, o servidor respondendo
 * cada clique (pela mesma ponte do ponta a ponta) e a base SUJA da varredura
 * geral — data que não existe, texto em coluna de número, fórmula, linha em
 * branco, texto enorme, emoji.
 *
 * O que ela procura:
 *   - erro de página e `console.error`;
 *   - ERRO INTERNO do servidor ("Cannot read properties…") em qualquer
 *     chamada que um clique disparou — a tela mostraria isso à pessoa;
 *   - "undefined", "[object Object]", "NaN" escritos na tela;
 *   - tela que abre com caixa de erro.
 *
 * Fica fora da suíte, como as outras varreduras de navegador.
 * ============================================================================
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { telasDoSistema } = require('./ferramentas');
const { mundo, ehErroInterno, funcoesPublicas } = require('./varredura-geral');

const TELAS = telasDoSistema();
const CLICAVEIS = [
  '[data-tela]', '[data-secao]', '[data-canal]', '[data-cartao]', '[data-cartao-da-fila]',
  '[data-corretora]', '[data-produto]', '[data-usuario]', '[data-nivel]',
  '[data-item]', '[data-campo-config]', '[data-analise]', '[data-sinalizador]',
  '[data-tela-do-painel]', '[data-canal-dos-cards]', '[data-aba-corretoras]',
  '[data-tipo-de-lista]', '[data-canal-config]', '[data-ver]', '[data-ponto]',
  '[data-componente]', '[data-trocar-situacao]', '[data-mostrar]', '[data-trabalhar]',
  '[data-status-do-caso]', '[data-o-que-importar]', '[data-aba-da-mesa]'
];
const POR_TIPO = 6;
/** O que troca a VISTA (e não só abre um item): a varredura entra em cada uma. */
const NAVEGAM = ['[data-secao]', '[data-canal]', '[data-aba-corretoras]',
  '[data-tela-do-painel]', '[data-canal-dos-cards]', '[data-canal-config]', '[data-tipo-de-lista]',
  '[data-o-que-importar]', '[data-aba-da-mesa]'];
const NUNCA_NA_TELA = ['undefined', '[object Object]', 'NaN', 'não existe no servidor'];

function acharPlaywright() {
  try { return require('playwright'); } catch (erro) { /* procura abaixo */ }
  for (const pasta of ['/opt/node22/lib/node_modules/playwright', '/usr/lib/node_modules/playwright']) {
    try { return require(pasta); } catch (erro) { /* próxima */ }
  }
  return null;
}

function acharNavegador() {
  const fixo = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  return fs.existsSync(fixo) ? fixo : null;
}

async function varrer() {
  const playwright = acharPlaywright();
  if (!playwright) {
    console.log('\nEsta varredura precisa do Playwright, que não está aqui.\n');
    return 0;
  }

  const t = mundo();
  const contexto = t.contexto;
  const html = vm.runInContext('doGet().getContent()', contexto);
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'pgo-suja-'));
  const arquivo = path.join(pasta, 'sistema.html');
  fs.writeFileSync(arquivo, html);

  const navegador = await playwright.chromium.launch(
    acharNavegador() ? { executablePath: acharNavegador() } : {});
  const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });

  const erros = [];
  pagina.on('pageerror', (erro) => erros.push('erro de página: ' + erro));
  pagina.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
  // Recusar todo confirm(): as ações que perguntam antes são as que apagam.
  pagina.on('dialog', (caixa) => caixa.dismiss());

  const nomes = funcoesPublicas().map((f) => f.nome);
  let chamadasAoServidor = 0;
  await pagina.exposeFunction('__servidorDoPGO', (nome, argumentos) => {
    chamadasAoServidor++;
    try {
      const valor = vm.runInContext('(' + nome + ')', contexto).apply(null, argumentos);
      return { valor: JSON.parse(JSON.stringify(valor === undefined ? null : valor)) };
    } catch (erro) {
      if (ehErroInterno(erro)) {
        erros.push('ERRO INTERNO em ' + nome + ': ' + String(erro.message).slice(0, 140));
      }
      return { erro: String(erro.message || erro) };
    }
  });
  await pagina.addInitScript(`(function () {
    var NOMES = ${JSON.stringify(nomes)};
    function novaChamada(ok, ruim) {
      var corrida = {
        withSuccessHandler: function (f) { return novaChamada(f, ruim); },
        withFailureHandler: function (f) { return novaChamada(ok, f); }
      };
      NOMES.forEach(function (nome) {
        corrida[nome] = function () {
          var argumentos = Array.prototype.slice.call(arguments);
          window.__servidorDoPGO(nome, argumentos).then(function (r) {
            if (r && r.erro) { if (ruim) ruim(new Error(r.erro)); }
            else if (ok) ok(r ? r.valor : null);
          });
        };
      });
      return corrida;
    }
    window.google = { script: { run: novaChamada(null, null) } };
  })();`);

  await pagina.goto('file://' + arquivo);
  await pagina.waitForSelector('.lateral-item', { timeout: 10000 });
  await pagina.waitForTimeout(600);

  async function fecharDialogos() {
    for (const botao of ['#fechar-aviso-de-prazo']) {
      if (await pagina.locator(botao).count()) {
        await pagina.click(botao).catch(() => {});
        await pagina.waitForTimeout(150);
      }
    }
    await pagina.keyboard.press('Escape');
  }

  async function textoNaTela() {
    return pagina.evaluate(() => {
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
  }

  console.log('\nClicando em tudo com o servidor de verdade e a base suja — ' + TELAS.length + ' telas');
  console.log('-'.repeat(70));

  let cliques = 0;
  let codigoVistoComoTexto = 0;
  for (const tela of TELAS) {
    await fecharDialogos();
    await pagina.click('[data-tela="' + tela + '"]').catch(() => {});
    await pagina.waitForTimeout(900);
    await fecharDialogos();

    const recados = await pagina.$$eval('.erro-carga, .config-erro, .caixa-de-erro',
      (es) => es.map((e) => e.textContent.trim()).filter(Boolean));
    recados.forEach((r) => erros.push('a tela ' + tela + ' abriu com erro: ' + r.slice(0, 140)));

    const antes = cliques;

    // As FOLHAS: o que se aperta dentro de uma vista.
    async function clicarNasFolhas() {
      for (const seletor of CLICAVEIS) {
        if (seletor === '[data-tela]' || NAVEGAM.indexOf(seletor) >= 0) continue;
        const quantos = await pagina.locator(seletor).count();
        for (let i = 0; i < Math.min(quantos, POR_TIPO); i++) {
          try {
            const alvo = pagina.locator(seletor).nth(i);
            if (!(await alvo.isVisible())) continue;
            await alvo.click({ timeout: 1200 });
            cliques++;
            await pagina.waitForTimeout(220);
            await fecharDialogos();
          } catch (erro) { /* sumiu no redesenho */ }
        }
      }
    }

    // As VISTAS: seção, canal, aba. Entra em cada uma e aperta as folhas dela.
    await clicarNasFolhas();
    for (const seletor of NAVEGAM) {
      const quantos = await pagina.locator(seletor).count();
      for (let i = 0; i < Math.min(quantos, POR_TIPO); i++) {
        try {
          const alvo = pagina.locator(seletor).nth(i);
          if (!(await alvo.isVisible())) continue;
          await alvo.click({ timeout: 1200 });
          cliques++;
          await pagina.waitForTimeout(500);
          await fecharDialogos();
          await clicarNasFolhas();
        } catch (erro) { /* sumiu no redesenho */ }
      }
    }

    const xss = await pagina.evaluate(() => window.__xss || 0);
    if (xss) erros.push('CÓDIGO DA BASE RODOU na tela (a partir de ' + tela + '): ' + xss + ' vez(es)');

    const naTela = await textoNaTela();
    if (naTela.indexOf('<img src=x onerror') >= 0) codigoVistoComoTexto++;
    NUNCA_NA_TELA.forEach((texto) => {
      if (naTela.indexOf(texto) >= 0) {
        const onde = naTela.indexOf(texto);
        erros.push('"' + texto + '" na tela, a partir de ' + tela + ': …'
          + naTela.slice(Math.max(0, onde - 60), onde + 40).replace(/\s+/g, ' ') + '…');
      }
    });
    console.log('  ' + tela.padEnd(22) + (cliques - antes) + ' cliques');
  }

  await navegador.close();
  fs.rmSync(pasta, { recursive: true, force: true });

  // Prova de que a conferência conferiu: o código da base tem de ter
  // APARECIDO escrito em alguma tela — texto, e não HTML.
  if (!codigoVistoComoTexto) {
    erros.push('o nome com código não apareceu escrito em tela nenhuma — a conferência de '
      + '"código da base não roda" não conferiu nada');
  }
  const unicos = erros.filter((e, i) => erros.indexOf(e) === i);
  console.log('-'.repeat(70));
  console.log('o código da base apareceu ESCRITO (e não rodou) em ' + codigoVistoComoTexto + ' tela(s)');
  console.log(cliques + ' cliques, ' + chamadasAoServidor + ' chamadas ao servidor');
  if (unicos.length) {
    console.log(unicos.length + ' PROBLEMA(S):');
    unicos.forEach((e) => console.log('  ' + e));
    return 1;
  }
  console.log('nenhum problema\n');
  return 0;
}

varrer().then((codigo) => { process.exitCode = codigo; });
