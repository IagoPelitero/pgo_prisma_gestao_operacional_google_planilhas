/**
 * ============================================================================
 * PGO — ponta-a-ponta.js · o navegador de verdade falando com o servidor de verdade
 * ============================================================================
 *   node Evolucao/Testes/ponta-a-ponta.js
 *
 * ---------------------------------------------------------------------------
 * O BURACO QUE ELE FECHA
 * ---------------------------------------------------------------------------
 * A suíte prova o SERVIDOR. A prévia mostra a TELA — mas recusa toda gravação,
 * de propósito, para não fingir ter gravado algo que não gravou. Resultado: o
 * caminho mais importante do sistema nunca era exercitado inteiro —
 *
 *     formulário preenchido → servidor grava → planilha muda → tela recarrega
 *
 * e é justamente ali que moram os defeitos que nenhum dos dois lados vê: o
 * campo que a tela chama de `nivel` e o servidor espera como `nivelAcessoId`,
 * a caixa de marcar que volta como texto em vez de booleano, o id do elemento
 * que mudou num lado e não no outro.
 *
 * ---------------------------------------------------------------------------
 * COMO
 * ---------------------------------------------------------------------------
 * A página é gerada pelo `doGet` DE VERDADE. No navegador, `google.script.run`
 * é substituído por uma ponte que devolve a chamada para o Node, onde o
 * servidor roda no simulador — com a planilha falsa que converte igual ao
 * Sheets. Os valores atravessam em JSON, que é exatamente o que o Apps Script
 * faz.
 *
 * Então: DOM de verdade, servidor de verdade, planilha que se comporta como a
 * de verdade. O que este teste diz que funciona, funciona.
 * ============================================================================
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { criarAmbienteFalso } = require('./simulador');

const PASTA_DO_SERVIDOR = path.join(__dirname, '..', '..', 'Back-End');
const PASTA_DO_PACOTE = path.join(__dirname, '..', 'pacote');

/*
  O teste roda DUAS vezes: contra os 35 arquivos do repositório e contra os 3
  do pacote. Se o pacote se comportasse diferente, teríamos duas verdades — e
  a que a operação usa seria a que ninguém testa.
*/
const COMO_PACOTE = process.argv.indexOf('--pacote') >= 0;

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

/** O servidor carregado, como o Apps Script carrega: em ordem alfabética. */
function servidorNovo(email) {
  // O simulador serve as telas da pasta que o PGO_PASTA_DAS_TELAS apontar —
  // é o que permite rodar contra o pacote sem tocar em nada.
  if (COMO_PACOTE) process.env.PGO_PASTA_DAS_TELAS = PASTA_DO_PACOTE;
  const ambiente = criarAmbienteFalso(email);
  const contexto = vm.createContext(ambiente.globais);

  const arquivos = COMO_PACOTE
    ? [{ pasta: PASTA_DO_PACOTE, nome: 'Codigo.gs' }]
    : fs.readdirSync(PASTA_DO_SERVIDOR)
      .filter((nome) => nome.endsWith('.gs')).sort()
      .map((nome) => ({ pasta: PASTA_DO_SERVIDOR, nome: nome }));

  arquivos.forEach((a) => {
    vm.runInContext(fs.readFileSync(path.join(a.pasta, a.nome), 'utf8'),
      contexto, { filename: a.nome });
  });
  return { ambiente, contexto };
}

/** Os nomes de todas as funções públicas do servidor, para a ponte conhecer. */
function funcoesDoServidor() {
  const nomes = [];
  fs.readdirSync(PASTA_DO_SERVIDOR)
    .filter((nome) => nome.endsWith('.gs'))
    .forEach((nome) => {
      const fonte = fs.readFileSync(path.join(PASTA_DO_SERVIDOR, nome), 'utf8');

      (fonte.match(/^function ([A-Za-z0-9]+[a-z0-9])\s*\(/gm) || []).forEach((m) => {
        nomes.push(m.replace(/^function /, '').replace(/\s*\($/, ''));
      });
    });
  return nomes;
}

/* ------------------------------------------------------------- o placar --- */

let passaram = 0;
const falhas = [];

async function teste(nome, corpo) {
  try {
    await corpo();
    passaram++;
    console.log('  ok   ' + nome);
  } catch (erro) {
    falhas.push({ nome, erro });
    console.log('  FALHA ' + nome + '\n        ' + (erro.message || erro));
  }
}

function igual(obtido, esperado, oQue) {
  if (obtido !== esperado) {
    throw new Error((oQue || 'valor') + ': esperado ' + JSON.stringify(esperado)
      + ', obtido ' + JSON.stringify(obtido));
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

/* ------------------------------------------------------------- a corrida -- */

async function rodar() {
  const playwright = acharPlaywright();
  if (!playwright) {
    console.log('\nEste teste precisa do Playwright, que não está aqui.');
    console.log('  npm install -g playwright && npx playwright install chromium');
    console.log('A suíte (node Evolucao/Testes/rodar.js) não precisa dele.\n');
    return 0;
  }

  console.log('\nPonta a ponta — navegador de verdade, servidor de verdade'
    + (COMO_PACOTE ? '  [PACOTE de 3 arquivos]' : '  [os 35 arquivos]'));
  console.log('-'.repeat(62));

  const { ambiente, contexto } = servidorNovo('primeiro.adm@exemplo.com');
  vm.runInContext('instalarRECC()', contexto);

  // A página como o Apps Script a serve, com os scriptlets já avaliados.
  const html = vm.runInContext('doGet().getContent()', contexto);
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'pgo-ponta-'));
  const arquivo = path.join(pasta, 'sistema.html');
  fs.writeFileSync(arquivo, html);

  const navegador = await playwright.chromium.launch(
    acharNavegador() ? { executablePath: acharNavegador() } : {});
  const pagina = await navegador.newPage({ viewport: { width: 1440, height: 1000 } });

  const erros = [];
  pagina.on('pageerror', (erro) => erros.push('erro de página: ' + erro));
  pagina.on('console', (m) => {
    if (m.type() === 'error') erros.push('console: ' + m.text());
  });
  pagina.on('dialog', (caixa) => caixa.accept());

  // A PONTE. O navegador chama aqui, e aqui roda o servidor de verdade.
  await pagina.exposeFunction('__servidorDoPGO', (nome, argumentos) => {
    try {
      const chamada = vm.runInContext('(' + nome + ')', contexto);
      const valor = chamada.apply(null, argumentos);
      // JSON é exatamente o que o Apps Script faz ao atravessar a fronteira:
      // Date vira texto, undefined some. Fingir diferente esconderia bugs.
      return { valor: JSON.parse(JSON.stringify(valor === undefined ? null : valor)) };
    } catch (erro) {
      return { erro: String(erro.message || erro) };
    }
  });

  await pagina.addInitScript(`(function () {
    var NOMES = ${JSON.stringify(funcoesDoServidor())};
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
  await pagina.waitForTimeout(500);

  const naPlanilha = (aba) => vm.runInContext('lerRegistros_("' + aba + '")', contexto);

  /* ---------------------------------------------------- cadastrar pessoa -- */

  console.log('\nO cadastro de pessoas');

  await teste('a aba Usuários carrega e sai do "Lendo o cadastro"', async () => {
    await pagina.click('[data-tela="configuracoes"]');
    await pagina.waitForTimeout(600);
    await pagina.click('[data-secao="usuarios"]');
    await pagina.waitForTimeout(800);

    const texto = await pagina.textContent('#config-lista');
    verdadeiro(texto.indexOf('Lendo o cadastro') < 0,
      'a tela ficou presa em "Lendo o cadastro…"');
    contem(texto, 'pessoa', 'a lista de pessoas apareceu');
  });

  await teste('cadastrar uma pessoa grava na planilha e aparece na lista', async () => {
    const antes = naPlanilha('USUARIOS').length;

    await pagina.click('#novo-usuario');
    await pagina.waitForTimeout(400);
    await pagina.fill('#cfg-nome', 'Iago Pelitero');
    await pagina.fill('#cfg-email', 'p.iago.ip@exemplo.com');
    await pagina.fill('#cfg-canal', 'Corretora');
    await pagina.fill('#cfg-matricula', '778899');

    // O nível é obrigatório: é ele que define o acesso.
    const niveis = await pagina.$$eval('#cfg-nivel option',
      (os) => os.map((o) => ({ valor: o.value, nome: o.textContent })));
    const operacao = niveis.find((n) => n.nome.indexOf('Operação') >= 0);
    verdadeiro(!!operacao, 'o seletor de nível veio preenchido');
    await pagina.selectOption('#cfg-nivel', operacao.valor);

    const cargos = await pagina.$$eval('#cfg-cargo option', (os) => os.map((o) => o.value));
    await pagina.selectOption('#cfg-cargo', cargos[1]);

    // A mesa: a primeira opção é "todas as mesas" (o administrador), e as
    // seguintes são as mesas de verdade.
    const mesas = await pagina.$$eval('#cfg-mesa-da-pessoa option',
      (os) => os.map((o) => ({ valor: o.value, nome: o.textContent })));
    verdadeiro(mesas.length >= 3, 'o seletor traz "todas as mesas" e as mesas');
    igual(mesas[0].valor, '', 'a primeira opção é não ter mesa');
    contem(mesas[0].nome, 'todas as mesas');
    await pagina.selectOption('#cfg-mesa-da-pessoa', mesas[1].valor);

    await pagina.click('#form-usuario button[type="submit"]');
    await pagina.waitForTimeout(900);

    const depois = naPlanilha('USUARIOS');
    igual(depois.length, antes + 1, 'linha nova na aba USUARIOS');

    const gravado = depois[depois.length - 1];
    igual(String(gravado.Nome), 'Iago Pelitero');
    igual(String(gravado.Email), 'p.iago.ip@exemplo.com');
    igual(String(gravado['Canal que atende']), 'Corretora');
    igual(String(gravado.Matricula), '778899');
    verdadeiro(String(gravado.NivelAcessoId).length > 0, 'o nível foi gravado');
    verdadeiro(String(gravado.MesaId).length > 0, 'a mesa foi gravada');
    igual(String(gravado.Ativo), 'SIM', 'nasce podendo entrar');

    const lista = await pagina.textContent('#config-lista');
    contem(lista, 'Iago Pelitero', 'a lista recarregou e mostra a pessoa nova');
    contem(lista, 'p.iago.ip@exemplo.com', 'com o e-mail');
    contem(lista, mesas[1].nome.trim(), 'e com a mesa');
  });

  await teste('quem administra aparece como "todas as mesas"', async () => {
    // O primeiro usuário, o que instala tudo, não pertence a mesa nenhuma.
    // Em branco pareceria cadastro pela metade; dizer é melhor.
    contem(await pagina.textContent('#config-lista'), 'todas as mesas');
  });

  await teste('editar a pessoa muda a linha, e não cria outra', async () => {
    const antes = naPlanilha('USUARIOS').length;

    await pagina.click('[data-usuario]:last-of-type');
    await pagina.waitForTimeout(500);
    const abertos = await pagina.$$('[data-usuario]');
    await abertos[abertos.length - 1].click();
    await pagina.waitForTimeout(500);

    await pagina.fill('#cfg-matricula', '112233');
    await pagina.click('#form-usuario button[type="submit"]');
    await pagina.waitForTimeout(900);

    const depois = naPlanilha('USUARIOS');
    igual(depois.length, antes, 'editar não pode criar linha nova');
    const alvo = depois.find((u) => String(u.Nome) === 'Iago Pelitero');
    igual(String(alvo.Matricula), '112233');
  });

  await teste('tirar o acesso desliga a pessoa e mantém a linha', async () => {
    const antes = naPlanilha('USUARIOS').length;

    const pessoas = await pagina.$$('[data-usuario]');
    await pessoas[pessoas.length - 1].click();
    await pagina.waitForTimeout(500);

    const tirar = await pagina.$('#desativar');
    verdadeiro(!!tirar, 'o botão de tirar o acesso aparece para quem já existe');
    await tirar.click();
    await pagina.waitForTimeout(900);

    const depois = naPlanilha('USUARIOS');
    igual(depois.length, antes, 'a linha permanece na planilha');
    const alvo = depois.find((u) => String(u.Nome) === 'Iago Pelitero');
    igual(String(alvo.Ativo), 'NAO', 'e a pessoa deixa de entrar');
  });

  await teste('e-mail repetido é recusado, com o motivo na tela', async () => {
    await pagina.click('#novo-usuario');
    await pagina.waitForTimeout(400);
    await pagina.fill('#cfg-nome', 'Outra Pessoa');
    await pagina.fill('#cfg-email', 'primeiro.adm@exemplo.com');
    const niveis = await pagina.$$eval('#cfg-nivel option', (os) => os.map((o) => o.value));
    await pagina.selectOption('#cfg-nivel', niveis[1]);
    await pagina.click('#form-usuario button[type="submit"]');
    await pagina.waitForTimeout(900);

    const painel = await pagina.textContent('#config-painel');
    verdadeiro(painel.toLowerCase().indexOf('mail') >= 0
      || painel.toLowerCase().indexOf('cadastrad') >= 0,
      'a recusa aparece no painel: ' + painel.slice(0, 120));
  });

  /* ------------------------------------------------------- cadastrar caso -- */

  console.log('\nO cadastro de casos');

  await teste('cadastrar um caso grava na base', async () => {
    const antes = naPlanilha('BASE_RET').length;

    await pagina.click('[data-tela="cadastrarCaso"]');
    await pagina.waitForTimeout(900);

    // Os ids saem da peça Formulario: prefixo + 'campo-' + chave. O
    // CadastrarCaso não usa prefixo, então são 'campo-*'.
    const campos = await pagina.$$eval(
      '#formulario-do-caso input[id^="campo-"], #formulario-do-caso select[id^="campo-"],'
      + ' #formulario-do-caso textarea[id^="campo-"]',
      (es) => es.map((e) => ({
        id: e.id, tag: e.tagName, travado: e.disabled,
        // aria-required, e não `required`: o formulário é novalidate de
        // propósito — quem valida é o servidor, com mensagem melhor.
        obrig: e.getAttribute('aria-required') === 'true'
      })));
    verdadeiro(campos.length > 10, 'o formulário veio montado, achei '
      + campos.length + ' campos');

    verdadeiro(campos.filter((c) => c.obrig).length > 0,
      'os campos obrigatórios se anunciam com aria-required');

    // Preenche só o obrigatório: é o caminho mínimo que tem de funcionar.
    for (const campo of campos.filter((c) => c.obrig && !c.travado)) {
      if (campo.tag === 'SELECT') {
        const opcoes = await pagina.$$eval('#' + campo.id + ' option',
          (os) => os.map((o) => o.value).filter((v) => v));
        if (opcoes.length) await pagina.selectOption('#' + campo.id, opcoes[0]);
      } else {
        const tipo = await pagina.getAttribute('#' + campo.id, 'type');
        const mascara = await pagina.getAttribute('#' + campo.id, 'data-mascara');
        if (tipo === 'date') await pagina.fill('#' + campo.id, '2026-09-14');
        else if (mascara === 'dinheiro') await pagina.fill('#' + campo.id, '1234,56');
        else if (mascara) await pagina.fill('#' + campo.id, '12345678901');
        else await pagina.fill('#' + campo.id, 'Teste ponta a ponta');
      }
    }

    await pagina.click('#salvar-caso');
    await pagina.waitForTimeout(1200);

    const recado = await pagina.textContent('#recado-do-caso');
    igual(naPlanilha('BASE_RET').length, antes + 1,
      'linha nova na BASE_RET — a tela disse: ' + recado);
  });

  /* ------------------------------------------------------------- o final -- */

  await navegador.close();
  fs.rmSync(pasta, { recursive: true, force: true });

  const unicos = erros.filter((e, i) => erros.indexOf(e) === i);
  console.log('\n' + '-'.repeat(62));
  if (unicos.length) {
    console.log('ERROS DE PÁGINA durante o percurso:');
    unicos.forEach((e) => console.log('  ' + e));
  }
  if (falhas.length) {
    console.log(passaram + ' passaram, ' + falhas.length + ' FALHARAM');
  } else {
    console.log(passaram + ' testes ponta a ponta, todos passaram'
      + (unicos.length ? ' — mas houve erro de página acima' : ''));
  }
  console.log('-'.repeat(62) + '\n');
  return (falhas.length || unicos.length) ? 1 : 0;
}

rodar().then((codigo) => { process.exitCode = codigo; });
