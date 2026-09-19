/**
 * ============================================================================
 * PGO — gerar-imagens.js · as telas do README, tiradas do sistema de verdade
 * ============================================================================
 *   node Evolucao/Testes/gerar-imagens.js
 *
 * ---------------------------------------------------------------------------
 * POR QUE ISTO É GERADO
 * ---------------------------------------------------------------------------
 * As imagens do README eram tiradas à mão, uma a uma. Elas envelhecem calado:
 * o README continua mostrando uma tela que não existe mais — com o nome
 * antigo, sem o botão novo — e quem abre o repositório acredita, porque foto
 * de tela é a coisa mais convincente que existe num README.
 *
 * É o achado 33 outra vez, no lugar mais visível do projeto: artefato que
 * repete informação do código não se digita, se gera.
 *
 * As fotos saem da PRÉVIA, que é montada pelo mesmo código do servidor — só a
 * ponte com o Google é substituída. Então o que aparece aqui é o que a
 * operação vai ver, e não uma maquete.
 *
 * Fica FORA da suíte pelo mesmo motivo que as outras varreduras de navegador:
 * `rodar.js` roda com node puro, sem instalar nada.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const RAIZ = path.join(__dirname, '..', '..');
const PREVIA = path.join(RAIZ, 'Evolucao', 'previa');
const DESTINO = path.join(RAIZ, 'Evolucao', 'imagens');
const NAVEGADOR = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

/** Monitor de trabalho: é onde a operação abre o sistema. */
const TELA_CHEIA = { width: 1440, height: 900 };
/** Celular: metade da operação trabalha no telefone. */
const CELULAR = { width: 390, height: 844 };

/**
 * O que cada foto mostra.
 *
 * `tela` é a CHAVE da tela, a mesma que o menu usa. `inteira` tira a página
 * toda, e não só a primeira dobra — vale para as telas que se leem rolando.
 */
const FOTOS = [
  { arquivo: 'sistema-tema-padrao', tela: 'trabalho', tema: 'padrao' },
  { arquivo: 'sistema-tema-rosa', tela: 'trabalho', tema: 'rosa' },
  { arquivo: 'sistema-tema-escuro', tela: 'trabalho', tema: 'dark' },
  { arquivo: 'sistema-tema-brasil', tela: 'trabalho', tema: 'brasil' },

  { arquivo: 'tela-trabalho', tela: 'trabalho', inteira: true },
  { arquivo: 'tela-cadastrar-caso', tela: 'cadastrarCaso', inteira: true },
  { arquivo: 'tela-minha-performance', tela: 'minhaPerformance', inteira: true },
  { arquivo: 'tela-buscar-caso', tela: 'buscarCaso' },
  { arquivo: 'tela-tabela-corretoras', tela: 'tabelaCorretoras', inteira: true },
  { arquivo: 'tela-tombamento', tela: 'tombamento', inteira: true },
  { arquivo: 'tela-produtividade', tela: 'produtividade', inteira: true },
  { arquivo: 'tela-configuracoes', tela: 'configuracoes', inteira: true },

  { arquivo: 'sistema-no-celular', tela: 'trabalho', janela: CELULAR, inteira: true }
];

async function esperarATelaMontar(pagina) {
  // A prévia responde na hora, mas o desenho dos gráficos acontece depois. Sem
  // esta espera, metade das fotos sai com o esqueleto de carregamento.
  await pagina.waitForTimeout(1200);
  await pagina.waitForFunction(() => {
    const carregando = document.querySelectorAll('.carregando-campos');
    return carregando.length === 0;
  }, { timeout: 15000 }).catch(() => {});
  await pagina.waitForTimeout(400);
}

async function gerar() {
  if (!fs.existsSync(path.join(PREVIA, 'sistema.html'))) {
    throw new Error('A prévia não existe. Rode antes:\n'
      + '  node Evolucao/Testes/gerar-previa.js');
  }
  fs.mkdirSync(DESTINO, { recursive: true });

  const navegador = await chromium.launch({ executablePath: NAVEGADOR });
  const endereco = 'file://' + path.join(PREVIA, 'sistema.html');
  const feitas = [];

  for (const foto of FOTOS) {
    const pagina = await navegador.newPage({ viewport: foto.janela || TELA_CHEIA });
    await pagina.goto(endereco + '#' + foto.tela);
    await esperarATelaMontar(pagina);

    if (foto.tema) {
      await pagina.click('[data-tema="' + foto.tema + '"]');
      await pagina.waitForTimeout(500);
    }

    const caminho = path.join(DESTINO, foto.arquivo + '.png');
    await pagina.screenshot({ path: caminho, fullPage: foto.inteira === true });
    feitas.push({
      arquivo: foto.arquivo + '.png',
      bytes: fs.statSync(caminho).size
    });
    await pagina.close();
  }

  // A tela de quem não está cadastrado mora noutro arquivo: ela é servida
  // antes de o sistema existir, e é justamente esse o ponto dela.
  const semAcesso = await navegador.newPage({ viewport: TELA_CHEIA });
  await semAcesso.goto('file://' + path.join(PREVIA, 'sem-acesso.html'));
  await semAcesso.waitForTimeout(800);
  const caminhoSemAcesso = path.join(DESTINO, 'tela-sem-acesso.png');
  await semAcesso.screenshot({ path: caminhoSemAcesso });
  feitas.push({
    arquivo: 'tela-sem-acesso.png',
    bytes: fs.statSync(caminhoSemAcesso).size
  });

  await navegador.close();
  return feitas;
}

if (require.main === module) {
  gerar().then((feitas) => {
    console.log('\nImagens em ' + DESTINO);
    feitas.forEach((uma) => {
      console.log('  ' + uma.arquivo.padEnd(32)
        + Math.round(uma.bytes / 1024) + ' KB');
    });
    console.log('  ' + feitas.length + ' imagens\n');
  }).catch((erro) => {
    console.error('\nNão deu para gerar as imagens: ' + erro.message + '\n');
    process.exitCode = 1;
  });
}

module.exports = { gerar, FOTOS };
