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

  // Quem o navegador chamou, e quantas vezes. É por aqui que se prova que uma
  // viagem ao servidor deixou de acontecer — contar é a única forma, porque
  // uma otimização que silenciosamente não pega continua passando nos testes.
  const chamadasDoNavegador = {};

  // A PONTE. O navegador chama aqui, e aqui roda o servidor de verdade.
  // PGO_GRAVAR_CHAMADAS=arquivo.json guarda o que a tela mandou de verdade —
  // é a matéria-prima da varredura geral (varredura-geral.js), que repete cada
  // chamada estragando um campo de cada vez.
  const gravadas = [];
  await pagina.exposeFunction('__servidorDoPGO', (nome, argumentos) => {
    chamadasDoNavegador[nome] = (chamadasDoNavegador[nome] || 0) + 1;
    if (process.env.PGO_GRAVAR_CHAMADAS) {
      gravadas.push({ nome: nome, args: JSON.parse(JSON.stringify(argumentos)) });
    }
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
            // Atraso sob encomenda (Etapa 86): window.__atrasos = { nome: [ms, ...] }
            // faz a resposta da vez chegar depois — é como se prova que a
            // resposta velha não pinta por cima da nova.
            var fila = window.__atrasos && window.__atrasos[nome];
            var espera = fila && fila.length ? fila.shift() : 0;
            setTimeout(function () {
              if (r && r.erro) { if (ruim) ruim(new Error(r.erro)); }
              else if (ok) ok(r ? r.valor : null);
            }, espera);
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

  /* ------------------------------------------------------------ abertura -- */

  console.log('\nA abertura do sistema');

  await teste('a página já vem com o pacote de partida dentro', async () => {
    const pronto = await pagina.evaluate(() => window.PGO_PACOTE_DE_PARTIDA);
    verdadeiro(pronto && pronto.disponivel === true,
      'o doGet não injetou o pacote na página');
    verdadeiro(Array.isArray(pronto.menu) && pronto.menu.length > 0,
      'o pacote injetado veio sem menu');
  });

  await teste('o sistema abre no Trabalho, com a versão no rodapé (Etapas 67 e 68)', async () => {
    // A abertura não grava endereço (é ela mesma): a prova é a tela no miolo.
    await pagina.waitForSelector('#painel', { timeout: 10000 });
    verdadeiro((await pagina.$$('[data-tela="inicio"]')).length === 0, 'a tela inicial saiu do menu');
    const versao = await pagina.$eval('.lateral-pe .versao', (el) => el.textContent);
    verdadeiro(/Versão 1\.\d+/.test(versao), 'a versão no rodapé do menu: ' + versao);
  });

  await teste('abrir o sistema não pede o pacote ao servidor', async () => {
    // Era a segunda viagem em fila: a página chegava, e só então o navegador
    // perguntava quem é você. Agora a resposta vem junto com a página.
    igual(chamadasDoNavegador.pacoteDePartida || 0, 0,
      'a tela ainda está pedindo o pacoteDePartida ao servidor');
  });

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

    // O nível é obrigatório: é ele que define o acesso.
    const niveis = await pagina.$$eval('#cfg-nivel option',
      (os) => os.map((o) => ({ valor: o.value, nome: o.textContent })));
    const operacao = niveis.find((n) => n.nome.indexOf('Operação') >= 0);
    verdadeiro(!!operacao, 'o seletor de nível veio preenchido');
    await pagina.selectOption('#cfg-nivel', operacao.valor);

    const cargos = await pagina.$$eval('#cfg-cargo option', (os) => os.map((o) => o.value));
    await pagina.selectOption('#cfg-cargo', cargos[1]);

    // O canal: a primeira opção é "todos os canais" (o administrador), e as
    // seguintes são os canais de verdade.
    const canais = await pagina.$$eval('#cfg-canal-da-pessoa option',
      (os) => os.map((o) => ({ valor: o.value, nome: o.textContent })));
    verdadeiro(canais.length >= 3, 'o seletor traz "todos os canais" e os canais');
    igual(canais[0].valor, '', 'a primeira opção é não ter canal');
    contem(canais[0].nome, 'todos os canais');
    await pagina.selectOption('#cfg-canal-da-pessoa', canais[1].valor);

    await pagina.click('#form-usuario button[type="submit"]');
    await pagina.waitForTimeout(900);

    const depois = naPlanilha('USUARIOS');
    igual(depois.length, antes + 1, 'linha nova na aba USUARIOS');

    const gravado = depois[depois.length - 1];
    igual(String(gravado.Nome), 'Iago Pelitero');
    igual(String(gravado.Email), 'p.iago.ip@exemplo.com');
    verdadeiro(String(gravado.NivelAcessoId).length > 0, 'o nível foi gravado');
    verdadeiro(String(gravado.CanalId).length > 0, 'o canal foi gravada');
    igual(String(gravado.Ativo), 'SIM', 'nasce podendo entrar');

    const lista = await pagina.textContent('#config-lista');
    contem(lista, 'Iago Pelitero', 'a lista recarregou e mostra a pessoa nova');
    contem(lista, 'p.iago.ip@exemplo.com', 'com o e-mail');
    contem(lista, canais[1].nome.trim(), 'e com o canal');
  });

  await teste('quem administra aparece como "todos os canais"', async () => {
    // O primeiro usuário, o que instala tudo, não pertence o canal nenhuma.
    // Em branco pareceria cadastro pela metade; dizer é melhor.
    contem(await pagina.textContent('#config-lista'), 'todos os canais');
  });

  await teste('editar a pessoa muda a linha, e não cria outra', async () => {
    const antes = naPlanilha('USUARIOS').length;

    await pagina.click('[data-usuario]:last-of-type');
    await pagina.waitForTimeout(500);
    const abertos = await pagina.$$('[data-usuario]');
    await abertos[abertos.length - 1].click();
    await pagina.waitForTimeout(500);

    const disponibilidades = await pagina.$$eval('#cfg-disponibilidade option',
      (os) => os.map((o) => o.value));
    verdadeiro(disponibilidades.length >= 2,
      'a lista de disponibilidade veio preenchida');
    const outra = disponibilidades[disponibilidades.length - 1];
    await pagina.selectOption('#cfg-disponibilidade', outra);
    await pagina.click('#form-usuario button[type="submit"]');
    await pagina.waitForTimeout(900);

    const depois = naPlanilha('USUARIOS');
    igual(depois.length, antes, 'editar não pode criar linha nova');
    const alvo = depois.find((u) => String(u.Nome) === 'Iago Pelitero');
    igual(String(alvo.Disponibilidade), outra, 'a mudança foi para a linha dela');
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

  await teste('a SUSEP é consultada uma vez só, e só a resposta da atual vale (Etapa 86, F11)', async () => {
    const cadastrada = vm.runInContext(`(function () {
      var uma = lerRegistros_('CORRETORAS')[0];
      if (uma) return { susep: String(uma.SUSEP), criada: '' };
      var nova = inserirRegistro_('CORRETORAS', { SUSEP: 'TST01A', Corretora: 'Corretora do teste',
        Sucursal: '1', Segmento: 'Diamante', Consultor: 'Alguém' });
      return { susep: 'TST01A', criada: String(nova.__id) };
    })()`, contexto);
    await pagina.click('[data-tela="cadastrarCaso"]');
    await pagina.waitForSelector('#campo-susep', { timeout: 10000 });

    // Digitar e sair do campo: o change e o blur juntos eram 2 consultas.
    const antes = chamadasDoNavegador.consultarSusep || 0;
    await pagina.fill('#campo-susep', 'ZZ9999');
    await pagina.press('#campo-susep', 'Tab');
    await pagina.waitForFunction(() => !/Conferindo/.test(document.getElementById('selo-susep').textContent), null, { timeout: 10000 });
    igual((chamadasDoNavegador.consultarSusep || 0) - antes, 1, 'uma consulta por SUSEP digitada');
    await pagina.focus('#campo-susep');
    await pagina.press('#campo-susep', 'Tab');
    await pagina.waitForTimeout(300);
    igual((chamadasDoNavegador.consultarSusep || 0) - antes, 1, 'sair de novo do campo, sem mudar, não consulta de novo');

    // A primeira (a cadastrada) volta DEPOIS da segunda: o selo é da segunda.
    await pagina.evaluate(() => { window.__atrasos = { consultarSusep: [1500, 0] }; });
    await pagina.fill('#campo-susep', cadastrada.susep);
    await pagina.press('#campo-susep', 'Tab');
    await pagina.fill('#campo-susep', 'ZZ8888');
    await pagina.press('#campo-susep', 'Tab');
    await pagina.waitForTimeout(2200);
    const selo = await pagina.textContent('#selo-susep');
    contem(selo, 'não encontrada', 'o selo é da SUSEP que está no campo: ' + selo);
    verdadeiro(selo.indexOf('liberada') < 0, 'a resposta velha (liberada) não pintou por cima');
    await pagina.evaluate(() => { window.__atrasos = {}; });

    await pagina.click('#limpar-caso');
    await pagina.waitForTimeout(900);
    if (cadastrada.criada) vm.runInContext("apagarRegistroDeVez_('CORRETORAS', '" + cadastrada.criada + "')", contexto);
  });

  await teste('o Cadastrar Caso pergunta antes de perder o que foi digitado (Etapa 87, F2)', async () => {
    const irAoCadastro = async () => {
      await pagina.click('[data-tela="cadastrarCaso"]');
      await pagina.waitForFunction(() => {
        const acoes = document.getElementById('acoes-do-caso') || document.getElementById('acoes-da-reuniao');
        return acoes && !acoes.hidden;
      }, null, { timeout: 10000 });
    };
    const livre = (raiz) => pagina.$$eval(raiz + ' input[type="text"], ' + raiz + ' textarea', (es) => {
      const um = es.find((e) => !e.disabled && e.offsetParent !== null); return um ? '#' + um.id : '';
    });
    const perguntou = () => pagina.locator('#dialogo-descarte').count();
    const aoSairDaPagina = () => pagina.evaluate(() => {
      const evento = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(evento);
      return evento.defaultPrevented;
    });
    const retCanal = pagina.locator('.canal', { hasText: 'RET' }).first();
    const mesaCanal = pagina.locator('.canal', { hasText: 'Mesa' }).first();

    // Sem digitar nada: sai sem pergunta, e o navegador não é chamado a avisar.
    await irAoCadastro();
    await retCanal.click(); await pagina.waitForTimeout(600);
    verdadeiro(!(await aoSairDaPagina()), 'formulário intacto: fechar a página não avisa');
    await pagina.click('[data-tela="buscarCaso"]');
    await pagina.waitForTimeout(400);
    igual(await perguntou(), 0, 'sem alteração, troca de tela sem perguntar');
    igual(await pagina.evaluate(() => location.hash), '#buscarCaso');

    // Com algo digitado.
    await irAoCadastro();
    const campo = await livre('#formulario-do-caso');
    verdadeiro(!!campo, 'um campo para digitar');
    await pagina.fill(campo, 'Digitado no teste');
    verdadeiro(await aoSairDaPagina(), 'recarregar ou fechar a página pede o aviso do navegador');

    // 1. Outra tela, pelo menu: pergunta; continuar fica, com o que foi digitado.
    await pagina.click('[data-tela="buscarCaso"]');
    await pagina.waitForSelector('#dialogo-descarte', { timeout: 5000 });
    contem(await pagina.textContent('#dialogo-descarte'), 'Você possui alterações não salvas. Deseja descartá-las?');
    await pagina.click('#continuar-editando'); await pagina.waitForTimeout(200);
    igual(await pagina.evaluate(() => location.hash), '#cadastrarCaso', 'continuou no Cadastrar');
    igual(await pagina.inputValue(campo), 'Digitado no teste', 'com o que foi digitado');

    // 2. O voltar do navegador (o endereço muda): pergunta, e o endereço volta.
    await pagina.evaluate(() => { location.hash = 'trabalho'; });
    await pagina.waitForSelector('#dialogo-descarte', { timeout: 5000 });
    await pagina.click('#continuar-editando'); await pagina.waitForTimeout(300);
    igual(await pagina.evaluate(() => location.hash), '#cadastrarCaso', 'o endereço voltou a ser o do Cadastrar');
    igual(await pagina.inputValue(campo), 'Digitado no teste');

    // 3. O recarregar da tela, no alto: pergunta.
    await pagina.click('#recarregar');
    await pagina.waitForSelector('#dialogo-descarte', { timeout: 5000 });
    await pagina.click('#continuar-editando'); await pagina.waitForTimeout(200);
    igual(await pagina.inputValue(campo), 'Digitado no teste', 'recarregar a tela não apagou');

    // 4. Trocar de canal: pergunta; descartar troca.
    await mesaCanal.click();
    await pagina.waitForSelector('#dialogo-descarte', { timeout: 5000 });
    await pagina.click('#continuar-editando'); await pagina.waitForTimeout(200);
    igual(await pagina.inputValue(campo), 'Digitado no teste', 'continuar: o canal não trocou');
    await mesaCanal.click();
    await pagina.waitForSelector('#dialogo-descarte', { timeout: 5000 });
    await pagina.click('#descartar-alteracoes');
    await pagina.waitForFunction(() => {
      const acoes = document.getElementById('acoes-do-caso');
      return acoes && !acoes.hidden;
    }, null, { timeout: 10000 });
    igual(await perguntou(), 0);

    // 5. Na Mesa, do Caso para a Reunião: pergunta. (A volta, da Reunião para o
    //    Caso, é conferida depois que a Agenda da Mesa existe — ver Etapa 79.)
    const abaReuniao = pagina.locator('[data-o-que-cadastrar="reuniao"]');
    verdadeiro(await abaReuniao.count() > 0, 'a Mesa tem a aba Reunião');
    const daMesa = await livre('#formulario-do-caso');
    await pagina.fill(daMesa, 'Caso da Mesa no teste');
    await abaReuniao.click();
    await pagina.waitForSelector('#dialogo-descarte', { timeout: 5000 });
    await pagina.click('#continuar-editando'); await pagina.waitForTimeout(200);
    igual(await pagina.inputValue(daMesa), 'Caso da Mesa no teste', 'continuar: ficou no Caso');

    // Volta à RET descartando o da Mesa; o formulário novo não tem o que perder.
    await retCanal.click();
    await pagina.waitForSelector('#dialogo-descarte', { timeout: 5000 });
    await pagina.click('#descartar-alteracoes');
    await pagina.waitForFunction(() => {
      const acoes = document.getElementById('acoes-do-caso');
      return acoes && !acoes.hidden;
    }, null, { timeout: 10000 });
    verdadeiro(!(await aoSairDaPagina()), 'formulário novo: nada a avisar');
  });

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
        const dinheiro = await pagina.getAttribute('#' + campo.id, 'data-dinheiro');
        if (tipo === 'date') await pagina.fill('#' + campo.id, '2026-09-14');
        else if (mascara === 'dinheiro' || dinheiro === 'sim') await pagina.fill('#' + campo.id, '1234,56');
        else if (mascara) await pagina.fill('#' + campo.id, '12345678901');
        else await pagina.fill('#' + campo.id, 'Teste ponta a ponta');
      }
    }

    await pagina.click('#salvar-caso');
    await pagina.waitForTimeout(1500);

    igual(naPlanilha('BASE_RET').length, antes + 1, 'linha nova na BASE_RET');

    // Etapa 86 (F7 + F12): gravou, e a pessoa escolhe o próximo passo — nada
    // abre sozinho, e a tela fica no Cadastrar.
    await pagina.waitForSelector('#cadastro-concluido', { timeout: 10000 });
    const novo = String(naPlanilha('BASE_RET').slice(-1)[0].__id);
    contem(await pagina.textContent('#cadastro-concluido'), novo, 'o aviso diz qual caso foi cadastrado');
    igual(await pagina.locator('#modal-do-caso').count(), 0, 'o caso não abre sozinho');
    verdadeiro(await pagina.locator('#ir-para-o-trabalho').count() === 1, 'a volta ao Trabalho continua');
    verdadeiro(await pagina.evaluate(() => document.getElementById('acoes-do-caso').hidden),
      'sem formulário, sem "Cadastrar caso": o Ctrl+Enter não grava de novo');

    // 1. Trabalhar no caso: abre o recém-cadastrado.
    await pagina.click('#trabalhar-no-cadastrado');
    await pagina.waitForFunction(() => {
      const salvar = document.getElementById('modal-salvar');
      return salvar && !salvar.disabled;
    }, { timeout: 10000 });
    contem(await pagina.textContent('#titulo-do-caso'), novo, 'abriu o caso recém-cadastrado');
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(300);
    igual(await pagina.locator('#cadastro-concluido').count(), 1, 'fechou e o aviso continua lá');

    // 2. Cadastrar outro: o formulário limpo, no mesmo canal.
    const canalAntes = await pagina.$eval('[data-canal][aria-pressed="true"], [data-canal].atual, [data-canal][aria-checked="true"]',
      (e) => e.getAttribute('data-canal')).catch(() => '');
    await pagina.click('#cadastrar-outro');
    await pagina.waitForFunction(() => {
      const acoes = document.getElementById('acoes-do-caso');
      return acoes && !acoes.hidden;
    }, { timeout: 10000 });
    const preenchidos = await pagina.$$eval('#formulario-do-caso textarea[id^="campo-"], #formulario-do-caso input[type="text"][id^="campo-"]',
      (es) => es.filter((e) => e.value && !e.disabled).map((e) => e.id + '=' + e.value));
    igual(preenchidos.length, 0, 'formulário limpo: ' + preenchidos.join(', '));
    const canalDepois = await pagina.$eval('[data-canal][aria-pressed="true"], [data-canal].atual, [data-canal][aria-checked="true"]',
      (e) => e.getAttribute('data-canal')).catch(() => '');
    igual(canalDepois, canalAntes, 'o mesmo canal');
    igual(naPlanilha('BASE_RET').length, antes + 1, '"Cadastrar outro" não grava nada sozinho');

    // E a volta normal ao Trabalho, pelo menu — sem pergunta: nada foi digitado (F2).
    await pagina.click('[data-tela="trabalho"]');
    await pagina.waitForTimeout(900);
    igual(await pagina.locator('#dialogo-descarte').count(), 0, 'depois de cadastrar, navegar não pergunta');
    igual(await pagina.evaluate(() => location.hash), '#trabalho');
  });

  await teste('no Trabalho, a resposta de um pedido antigo não pinta por cima do novo (Etapa 86, F6)', async () => {
    await pagina.click('[data-tela="trabalho"]');
    await pagina.waitForSelector('.cartoes .indicador.clicavel', { timeout: 10000 });
    if (await pagina.locator('#dialogo-prazo').count()) await pagina.click('#fechar-aviso-de-prazo');
    await pagina.click('[data-sub-aba="1"]');
    await pagina.waitForSelector('.cartoes .indicador.clicavel', { timeout: 10000 });
    const rotulos = await pagina.$$eval('.cartoes .indicador.clicavel .rotulo', (es) => es.map((e) => e.textContent));
    verdadeiro(rotulos.length >= 2, 'há cartões para clicar: ' + rotulos.join(', '));
    // O clique no cartão demora a voltar; a troca de sub-aba, feita enquanto
    // ele carrega (as abas ficam na tela), volta na hora.
    await pagina.evaluate(() => { window.__atrasos = { resumoDoCanal: [1500, 0] }; });
    await pagina.locator('.cartoes .indicador.clicavel', { hasText: rotulos[1] }).first().click();
    await pagina.waitForTimeout(150);
    await pagina.click('[data-sub-aba="2"]');
    await pagina.waitForTimeout(2400);
    await pagina.evaluate(() => { window.__atrasos = {}; });
    const cartoes = await pagina.$$eval('.cartoes .indicador .rotulo', (es) => es.map((e) => e.textContent));
    verdadeiro(cartoes.some((r) => /concluídos/i.test(r)), 'ficou o painel da aba 2, o pedido mais novo: ' + cartoes.join(', '));
    igual(await pagina.locator('.cartoes .indicador.ligado').count(), 0, 'nenhum cartão do pedido velho voltou marcado');
    igual(await pagina.getAttribute('[data-sub-aba="2"]', 'aria-selected'), 'true', 'e a aba marcada é a 2');
    // Volta ao estado de antes.
    await pagina.click('[data-sub-aba="1"]');
    await pagina.waitForTimeout(900);
  });

  await teste('no Trabalho, filtrar não apaga a tela: esmaece, avisa e troca de uma vez (Etapa 88, F5)', async () => {
    await pagina.click('[data-tela="trabalho"]');
    await pagina.waitForSelector('.cartoes .indicador.clicavel', { timeout: 10000 });
    if (await pagina.locator('#dialogo-prazo').count()) await pagina.click('#fechar-aviso-de-prazo');
    await pagina.click('[data-sub-aba="1"]');
    await pagina.waitForSelector('.cartoes .indicador.clicavel', { timeout: 10000 });
    await pagina.waitForTimeout(300);
    const rotulos = await pagina.$$eval('.cartoes .indicador.clicavel .rotulo', (es) => es.map((e) => e.textContent));
    // Rola um pouco, como quem está olhando a fila.
    await pagina.setViewportSize({ width: 1280, height: 420 });
    await pagina.evaluate(() => window.scrollTo(0, 120));
    const rolagemAntes = await pagina.evaluate(() => window.pageYOffset);
    verdadeiro(rolagemAntes > 50, 'a página rolou de verdade: ' + rolagemAntes);

    await pagina.evaluate(() => { window.__atrasos = { resumoDoCanal: [1500] }; });
    await pagina.locator('.cartoes .indicador.clicavel', { hasText: rotulos[1] }).first().click();
    await pagina.waitForTimeout(250);
    const durante = await pagina.evaluate(() => ({
      cartoes: document.querySelectorAll('#painel .cartoes .indicador').length,
      atualizando: document.getElementById('painel').classList.contains('atualizando'),
      ocupado: document.getElementById('painel').getAttribute('aria-busy'),
      aviso: (document.querySelector('#painel .aviso-atualizando') || {}).textContent,
      somando: document.querySelectorAll('#painel .carregando-campos').length,
      esmaecido: getComputedStyle(document.querySelector('#painel .cartoes')).opacity,
      filtros: getComputedStyle(document.querySelector('#painel .caixa-de-filtros')).opacity,
      rolagem: window.pageYOffset
    }));
    verdadeiro(durante.cartoes > 0, 'os cartões ficam na tela durante a espera');
    igual(durante.atualizando, true);
    igual(durante.ocupado, 'true', 'o leitor de tela sabe que o painel está ocupado');
    igual(durante.aviso, 'Atualizando informações…');
    igual(durante.somando, 0, 'nada de "Somando os casos…" no lugar do painel');
    igual(durante.esmaecido, '0.5', 'os números do pedido anterior ficam esmaecidos');
    igual(durante.filtros, '1', 'os filtros, não');
    verdadeiro(Math.abs(durante.rolagem - rolagemAntes) <= 1, 'a página não pulou: ' + rolagemAntes + ' → ' + durante.rolagem);

    await pagina.waitForTimeout(1700);
    const depois = await pagina.evaluate(() => ({
      atualizando: document.getElementById('painel').classList.contains('atualizando'),
      ocupado: document.getElementById('painel').getAttribute('aria-busy'),
      aviso: document.querySelectorAll('#painel .aviso-atualizando').length,
      ligado: document.querySelectorAll('.cartoes .indicador.ligado').length,
      rolagem: window.pageYOffset
    }));
    igual(depois.atualizando, false, 'trocado de uma vez quando chegou');
    igual(depois.ocupado, null);
    igual(depois.aviso, 0, 'o aviso sai junto');
    igual(depois.ligado, 1, 'e o que está na tela é o resultado do cartão clicado');
    verdadeiro(Math.abs(depois.rolagem - rolagemAntes) <= 1, 'a rolagem ficou: ' + rolagemAntes + ' → ' + depois.rolagem);

    // Dois cliques seguidos: vale o último (F6), e a tela não fica presa esmaecida.
    await pagina.evaluate(() => { window.__atrasos = { resumoDoCanal: [1500, 300] }; });
    await pagina.locator('.cartoes .indicador.clicavel', { hasText: rotulos[0] }).first().click();
    await pagina.waitForTimeout(120);
    await pagina.locator('.cartoes .indicador.clicavel', { hasText: rotulos[1] }).first().click();
    await pagina.waitForTimeout(700);
    igual(await pagina.evaluate(() => document.getElementById('painel').classList.contains('atualizando')), false,
      'a resposta do último clique já chegou');
    await pagina.waitForTimeout(1200);
    const ligado = await pagina.$$eval('.cartoes .indicador.ligado .rotulo', (es) => es.map((e) => e.textContent));
    igual(ligado.join(), rotulos[1], 'a resposta velha não pintou por cima (F6)');

    // Trocar de sub-aba NÃO mantém os números da outra aba na tela.
    await pagina.evaluate(() => { window.__atrasos = { resumoDoCanal: [800] }; });
    await pagina.click('[data-sub-aba="2"]');
    await pagina.waitForTimeout(150);
    igual(await pagina.locator('#painel .cartoes').count(), 0, 'outra aba: a tela limpa, como antes');
    await pagina.waitForTimeout(1000);

    // O erro durante a atualização substitui a tela — nada velho com cara de válido.
    const original = await pagina.evaluate(() => {
      window.__servidorOriginal = window.__servidorOriginal || window.__servidorDoPGO;
      window.__servidorDoPGO = function (nome, argumentos) {
        if (nome === 'resumoDoCanal' && window.__falharUmaVez) {
          window.__falharUmaVez = false;
          return Promise.resolve({ erro: 'Falha simulada na atualização' });
        }
        return window.__servidorOriginal(nome, argumentos);
      };
      window.__falharUmaVez = true;
      window.__atrasos = { resumoDoCanal: [300] };
      return true;
    });
    verdadeiro(original);
    await pagina.locator('.cartoes .indicador.clicavel').first().click();
    await pagina.waitForTimeout(700);
    const comErro = await pagina.evaluate(() => ({
      erro: (document.querySelector('#painel .erro-carga') || {}).textContent || '',
      cartoes: document.querySelectorAll('#painel .cartoes').length,
      atualizando: document.getElementById('painel').classList.contains('atualizando')
    }));
    contem(comErro.erro, 'Falha simulada');
    igual(comErro.cartoes, 0, 'os números velhos saíram');
    igual(comErro.atualizando, false);
    await pagina.evaluate(() => { window.__servidorDoPGO = window.__servidorOriginal; window.__atrasos = {}; });
    await pagina.setViewportSize({ width: 1440, height: 1000 });
    await pagina.click('[data-sub-aba="1"]');
    await pagina.waitForTimeout(900);
  });

  await teste('a consulta que passa de 8 s avisa, sem chamar o servidor de novo, e o aviso sai no fim (Etapa 88, F14)', async () => {
    const TEXTO = 'A consulta está demorando mais que o normal. O Prisma continua aguardando a resposta. '
      + 'Não é necessário clicar novamente.';
    const aviso = () => pagina.evaluate(() => {
      const e = document.getElementById('aviso-de-demora');
      return e ? { texto: e.textContent, papel: e.getAttribute('role') } : null;
    });
    const contarChamadas = () => pagina.evaluate(() => window.__chamadasDeResumo || 0);
    await pagina.evaluate(() => {
      window.__servidorOriginal = window.__servidorOriginal || window.__servidorDoPGO;
      window.__chamadasDeResumo = 0;
      window.__servidorDoPGO = function (nome, argumentos) {
        if (nome === 'resumoDoCanal') window.__chamadasDeResumo++;
        if (nome === 'resumoDoCanal' && window.__falharUmaVez) {
          window.__falharUmaVez = false;
          return Promise.resolve({ erro: 'Falha simulada depois da demora' });
        }
        return window.__servidorOriginal(nome, argumentos);
      };
    });
    await pagina.click('[data-tela="trabalho"]');
    await pagina.waitForSelector('.cartoes .indicador.clicavel', { timeout: 10000 });
    if (await pagina.locator('#dialogo-prazo').count()) await pagina.click('#fechar-aviso-de-prazo');
    await pagina.waitForTimeout(300);

    // 1. Uma consulta rápida não avisa nada.
    await pagina.evaluate(() => { window.__atrasos = { resumoDoCanal: [1000] }; window.__chamadasDeResumo = 0; });
    await pagina.locator('.cartoes .indicador.clicavel').first().click();
    await pagina.waitForTimeout(1500);
    igual(await aviso(), null, 'consulta rápida: nenhum aviso');

    // 2. A demorada: nada antes dos 8 s; o texto pedido depois; some no fim.
    await pagina.evaluate(() => { window.__atrasos = { resumoDoCanal: [9500] }; window.__chamadasDeResumo = 0; });
    await pagina.locator('.cartoes .indicador.clicavel').first().click();
    await pagina.waitForTimeout(7300);
    igual(await aviso(), null, 'antes dos 8 s, nada');
    await pagina.waitForTimeout(1300);
    const durante = await aviso();
    verdadeiro(durante !== null, 'passados 8 s, o aviso aparece');
    igual(durante.texto, TEXTO, 'o texto pedido, exato');
    igual(durante.papel, 'status', 'e o leitor de tela anuncia');
    igual(await contarChamadas(), 1, 'nenhuma chamada nova ao servidor por causa do aviso');
    await pagina.waitForTimeout(1500);
    igual(await aviso(), null, 'a resposta chegou: o aviso saiu');
    verdadeiro(await pagina.locator('#painel .cartoes').count() > 0, 'e a tela mostra a resposta');

    // 3. Demorou e deu erro: o aviso sai, e o erro toma o lugar dele.
    await pagina.evaluate(() => { window.__atrasos = { resumoDoCanal: [9000] }; window.__falharUmaVez = true; });
    await pagina.locator('.cartoes .indicador.clicavel').first().click();
    await pagina.waitForTimeout(8600);
    verdadeiro((await aviso()) !== null, 'esperando o erro, o aviso aparece');
    await pagina.waitForTimeout(1000);
    igual(await aviso(), null, 'o erro chegou: o aviso saiu');
    contem(await pagina.$eval('#painel .erro-carga', (e) => e.textContent), 'Falha simulada depois da demora');

    // 4. Saiu da tela enquanto esperava: o aviso sai junto.
    await pagina.evaluate(() => { window.__atrasos = { resumoDoCanal: [10000] }; });
    await pagina.click('[data-sub-aba="2"]');
    await pagina.waitForTimeout(8600);
    verdadeiro((await aviso()) !== null);
    await pagina.click('[data-tela="buscarCaso"]');
    await pagina.waitForTimeout(300);
    igual(await aviso(), null, 'outra tela: o aviso da anterior saiu');
    await pagina.waitForTimeout(1500);
    igual(await aviso(), null, 'e não volta quando a resposta descartada chega');

    await pagina.evaluate(() => { window.__servidorDoPGO = window.__servidorOriginal; window.__atrasos = {}; });
    await pagina.click('[data-tela="trabalho"]');
    await pagina.waitForSelector('[data-sub-aba="1"]', { timeout: 10000 });
    await pagina.click('[data-sub-aba="1"]');
    await pagina.waitForTimeout(900);
  });

  /* --------------------------------------------------- os sinalizadores -- */

  console.log('\nOs sinalizadores de prazo');

  await teste('o caso cadastrado chega ao Trabalho com o selo de prazo', async () => {
    // A data de recepção é do servidor (hoje), então o caso novo nasce dentro
    // do prazo: o selo existe, e não é vermelho. O selo chega pela ponte real.
    await pagina.waitForTimeout(600);
    const selos = await pagina.$$eval('.selo-prazo', (es) => es.map((e) => e.className));
    verdadeiro(selos.length > 0, 'nenhum selo de prazo na fila do Trabalho');
    verdadeiro(selos.every((c) => c.indexOf('tom-ruim') < 0),
      'o caso de hoje não pode nascer fora do prazo');
  });

  await teste('fechar o "Trabalhar no caso" com alteração não salva pergunta antes; sem alteração, fecha (Etapa 87, F1)', async () => {
    await pagina.click('[data-tela="trabalho"]');
    await pagina.waitForSelector('[data-trabalhar]', { timeout: 10000 });
    if (await pagina.locator('#dialogo-prazo').count()) await pagina.click('#fechar-aviso-de-prazo');
    const abrir = async () => {
      await pagina.click('[data-trabalhar]');
      await pagina.waitForFunction(() => {
        const salvar = document.getElementById('modal-salvar');
        return salvar && !salvar.disabled;
      }, { timeout: 10000 });
    };
    const aberto = () => pagina.locator('#modal-do-caso').count();
    const perguntou = () => pagina.locator('#dialogo-descarte').count();
    const jeitos = {
      'o X': () => pagina.click('#modal-x'),
      'o Esc': () => pagina.keyboard.press('Escape'),
      'clicar fora': () => pagina.mouse.click(5, 5),
      'o Fechar': () => pagina.click('#modal-fechar')
    };

    // Sem alteração: os quatro jeitos fecham na hora, sem pergunta.
    for (const [nome, fazer] of Object.entries(jeitos)) {
      await abrir();
      await fazer();
      await pagina.waitForTimeout(250);
      igual(await perguntou(), 0, nome + ' sem alteração não pergunta');
      igual(await aberto(), 0, nome + ' sem alteração fecha');
    }

    // Com alteração: os quatro jeitos perguntam, e "Continuar editando" mantém tudo.
    await abrir();
    const campo = await pagina.$$eval('#modal-do-caso [data-chave]', (es) => {
      const livre = es.find((e) => (e.tagName === 'TEXTAREA' || (e.tagName === 'INPUT' && e.type === 'text'))
        && !e.disabled && e.getAttribute('aria-required') !== 'true');
      return livre ? livre.id : '';
    });
    verdadeiro(!!campo, 'há um campo livre para mexer');
    const original = await pagina.inputValue('#' + campo);
    await pagina.fill('#' + campo, original + ' (rascunho do teste)');
    for (const [nome, fazer] of Object.entries(jeitos)) {
      await fazer();
      await pagina.waitForSelector('#dialogo-descarte', { timeout: 5000 });
      contem(await pagina.textContent('#dialogo-descarte'), 'Você possui alterações não salvas. Deseja descartá-las?', nome);
      await pagina.click('#continuar-editando');
      await pagina.waitForTimeout(200);
      igual(await aberto(), 1, nome + ': continuar editando mantém o caso aberto');
      igual(await pagina.inputValue('#' + campo), original + ' (rascunho do teste)', nome + ': e o que foi digitado');
    }
    // O Esc na pergunta é "continuar", e não fecha o caso por baixo.
    await pagina.keyboard.press('Escape');
    await pagina.waitForSelector('#dialogo-descarte', { timeout: 5000 });
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(200);
    igual(await perguntou(), 0); igual(await aberto(), 1, 'o Esc da pergunta não fecha o caso');

    // Descartar: fecha, e nada foi gravado.
    const gravacoes = chamadasDoNavegador.editarCaso || 0;
    await pagina.click('#modal-x');
    await pagina.waitForSelector('#dialogo-descarte', { timeout: 5000 });
    await pagina.click('#descartar-alteracoes');
    await pagina.waitForTimeout(250);
    igual(await aberto(), 0, 'descartou e fechou');
    igual(chamadasDoNavegador.editarCaso || 0, gravacoes, 'descartar não grava');
    await abrir();
    igual(await pagina.inputValue('#' + campo), original, 'ao abrir de novo, o valor é o de antes');
    await pagina.click('#modal-fechar');
    await pagina.waitForTimeout(250);
  });

  await teste('apagar um campo no "Trabalhar no caso" apaga na planilha', async () => {
    // Pela tela de verdade: abre o caso, escreve, salva; abre de novo, apaga,
    // salva. A versão do caso vai e volta pela ponte nas duas gravações.
    const ultimoDaRet = () => {
      const linhas = naPlanilha('BASE_RET');
      return linhas[linhas.length - 1];
    };
    const abrirOCaso = async () => {
      await pagina.click('[data-trabalhar]');
      await pagina.waitForFunction(() => {
        const salvar = document.getElementById('modal-salvar');
        return salvar && !salvar.disabled;
      }, { timeout: 10000 });
    };
    const campoLivre = await (async () => {
      await abrirOCaso();
      return pagina.$$eval('#modal-do-caso [data-chave]', (es) => {
        const livre = es.find((e) => e.tagName === 'TEXTAREA' && !e.disabled
          && e.getAttribute('aria-required') !== 'true');
        return livre ? livre.id : '';
      });
    })();
    verdadeiro(!!campoLivre, 'o caso tem um campo de texto livre que não é obrigatório');

    await pagina.fill('#' + campoLivre, 'Texto para apagar');
    await pagina.click('#modal-salvar');
    await pagina.waitForTimeout(1200);
    verdadeiro(Object.values(ultimoDaRet()).indexOf('Texto para apagar') >= 0,
      'gravou o texto');

    await abrirOCaso();
    await pagina.fill('#' + campoLivre, '');
    await pagina.click('#modal-salvar');
    await pagina.waitForTimeout(1200);
    igual(Object.values(ultimoDaRet()).indexOf('Texto para apagar'), -1,
      'apagado na tela, apagado na planilha');
  });

  await teste('a Descrição vem junto no "Trabalhar no caso", mesmo escrita "Descrição" na planilha', async () => {
    // O defeito que o PO relatou: CAMPOS diz "descrição", a planilha diz
    // "Descrição", e a caixa abria vazia — e salvar apagava o texto.
    vm.runInContext(`(function () {
      var aba = planilhaAtiva_().getSheetByName('BASE_RET');
      var cabecalhos = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
      aba.getRange(1, cabecalhos.indexOf('descrição') + 1).setValue('Descrição');
      esquecerEstruturaLida_();
      var ultimo = lerRegistros_('BASE_RET').pop();
      atualizarRegistro_('BASE_RET', ultimo.__id, { 'Descrição': 'Texto que veio da planilha' });
    })()`, contexto);

    await pagina.click('[data-trabalhar]');
    await pagina.waitForFunction(() => {
      const salvar = document.getElementById('modal-salvar');
      return salvar && !salvar.disabled;
    }, { timeout: 10000 });
    igual(await pagina.inputValue('#editar-campo-descricao'), 'Texto que veio da planilha');

    await pagina.click('#modal-salvar');
    await pagina.waitForTimeout(1200);
    const ultimo = naPlanilha('BASE_RET').pop();
    igual(ultimo['Descrição'], 'Texto que veio da planilha', 'salvar sem mexer não apaga');

    vm.runInContext(`(function () {
      var aba = planilhaAtiva_().getSheetByName('BASE_RET');
      var cabecalhos = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
      aba.getRange(1, cabecalhos.indexOf('Descrição') + 1).setValue('descrição');
      esquecerEstruturaLida_();
    })()`, contexto);
  });

  await teste('o Status proposta aparece só com Retido, grava, e o prazo do Retido para', async () => {
    // O PO monta pelas telas de Configurações: lista, campo, "só quando o Status
    // for Retido" e a parada do prazo. Aqui o servidor de verdade faz o mesmo.
    vm.runInContext(`(function () {
      try { definirSenhaDeAdministrador('segredo123', ''); } catch (e) { /* já definida */ }
      liberarComSenha('segredo123');
      var ret = canaisVisiveis_().filter(function (c) { return c.aba === 'BASE_RET'; })[0];
      var lista = criarLista('Status proposta');
      ['Transmitido', 'Aguardando transmissão', 'Sem alteração'].forEach(function (nome, i) {
        salvarItemDoCatalogo({ tipo: lista, canalId: '', nome: nome, ordem: i + 1, ativo: true });
      });
      criarCampo(ret.id, { rotulo: 'Status proposta', tipo: 'seletor', secao: 'Seguro' });
      var campo = listarCamposDoCanal(ret.id).filter(function (c) {
        return c.cabecalho === 'Status proposta'; })[0];
      salvarCampo({ id: campo.id, rotulo: 'Status proposta', secao: 'Seguro', tipo: 'seletor',
        catalogo: lista, obrigatorio: true, ativo: true,
        mostrarSe: { campo: 'status', valores: ['Retido'] } });
      var a = listarSinalizadores().filter(function (k) {
        return String(k.canalId) === String(ret.id); })[0];
      salvarSinalizador({ id: a.id, nome: a.nome, canalId: a.canalId, prazo: a.prazo,
        unidade: a.unidade, aviso: a.aviso, colunaQueLiga: '', colunaDaData: '', colunaDaHora: '',
        inicioDoExpediente: a.inicioDoExpediente, fimDoExpediente: a.fimDoExpediente,
        ordem: a.ordem, ativo: true, statusComCondicao: 'Retido',
        colunaDaCondicao: 'Status proposta', valoresDaCondicao: ['Transmitido', 'Sem alteração'],
        colunaDaDataDaCondicao: 'Data do status proposta' });
    })()`, contexto);

    await pagina.reload();
    await pagina.waitForSelector('.lateral-item', { timeout: 10000 });
    await pagina.click('[data-tela="cadastrarCaso"]');
    await pagina.waitForSelector('#campo-statusproposta', { state: 'attached', timeout: 10000 });
    const bloco = pagina.locator('[data-campo="statusproposta"]');
    igual(await bloco.evaluate((e) => e.hidden), true, 'nasce escondido: o status padrão não é Retido');

    await pagina.selectOption('#campo-status', 'Retido');
    igual(await bloco.evaluate((e) => e.hidden), false, 'com Retido, o campo aparece');
    await pagina.selectOption('#campo-status', 'Pendente');
    igual(await bloco.evaluate((e) => e.hidden), true, 'com Pendente, some');
    await pagina.selectOption('#campo-status', 'Retido');

    // Obrigatório e visível: sem o valor, o botão fica travado como qualquer obrigatório.
    await pagina.selectOption('#campo-statusproposta', 'Transmitido');
    const antes = naPlanilha('BASE_RET').length;
    const obrigatorios = await pagina.$$eval(
      '#formulario-do-caso [aria-required="true"]',
      (es) => es.filter((e) => !e.disabled && !e.closest('[hidden]'))
        .map((e) => ({ id: e.id, tag: e.tagName, valor: e.value })));
    for (const campo of obrigatorios.filter((c) => !c.valor)) {
      if (campo.tag === 'SELECT') {
        const opcoes = await pagina.$$eval('#' + campo.id + ' option',
          (os) => os.map((o) => o.value).filter((v) => v));
        if (opcoes.length) await pagina.selectOption('#' + campo.id, opcoes[0]);
      } else {
        const tipo = await pagina.getAttribute('#' + campo.id, 'type');
        const mascara = await pagina.getAttribute('#' + campo.id, 'data-mascara');
        const dinheiro = await pagina.getAttribute('#' + campo.id, 'data-dinheiro');
        if (tipo === 'date') await pagina.fill('#' + campo.id, '2026-09-14');
        else if (mascara === 'dinheiro' || dinheiro === 'sim') await pagina.fill('#' + campo.id, '1234,56');
        else if (mascara) await pagina.fill('#' + campo.id, '12345678901');
        else await pagina.fill('#' + campo.id, 'Retido de ponta a ponta');
      }
    }
    // Se o botão ficou travado, o teste diz QUAL campo faltou.
    const faltou = await pagina.$$eval('#formulario-do-caso [aria-required="true"]',
      (es) => es.filter((e) => !e.disabled && !(e.closest('[data-campo]') || {}).hidden
        && !String(e.value || '').trim()).map((e) => e.id + '=' + JSON.stringify(e.value)));
    igual(faltou.join(','), '', 'nenhum obrigatório vazio');
    await pagina.click('#salvar-caso');
    await pagina.waitForTimeout(1500);

    const depois = naPlanilha('BASE_RET');
    igual(depois.length, antes + 1, 'o caso Retido foi gravado');
    const gravado = depois[depois.length - 1];
    igual(String(gravado.status), 'Retido');
    igual(String(gravado['Status proposta']), 'Transmitido');
    verdadeiro(!!gravado['Data do status proposta']
      && typeof gravado['Data do status proposta'].getTime === 'function',
    'o servidor carimbou QUANDO o Status proposta encerrou o prazo');
  });

  await teste('"Alterar status" para Retido pede o valor retido no diálogo; a tentativa grava a opção', async () => {
    // Como o PO montou: a tentativa aparece no Retido e no Sem sucesso de
    // contato, com as opções dele no lugar das de fábrica.
    const idDoCaso = vm.runInContext(`(function () {
      var ret = canaisVisiveis_().filter(function (c) { return c.aba === 'BASE_RET'; })[0];
      lerRegistros_('CATALOGO').filter(function (i) { return i.Tipo === 'TENTATIVA'; })
        .forEach(function (i) { excluirItemDoCatalogo(i.Id); });
      ['Caixa postal', 'Não atende'].forEach(function (nome, i) {
        salvarItemDoCatalogo({ tipo: 'TENTATIVA', canalId: '', nome: nome, ordem: i + 1, ativo: true });
      });
      var campo = listarCamposDoCanal(ret.id).filter(function (c) {
        return c.chave === 'tentativasdecontato'; })[0];
      salvarCampo({ id: campo.id, rotulo: campo.rotulo, secao: campo.secao, tipo: campo.tipo,
        catalogo: campo.catalogo, obrigatorio: false, ativo: true,
        mostrarSe: { campo: 'status', valores: ['Retido', 'Sem sucesso de contato'] } });
      return cadastrarCaso(ret.id, { nomedocliente: 'Vai reter', status: 'Pendente' }).id;
    })()`, contexto);
    const doCaso = () => naPlanilha('BASE_RET').find((l) => String(l.__id) === String(idDoCaso));

    await pagina.reload();
    await pagina.waitForSelector('.lateral-item', { timeout: 10000 });
    await pagina.click('[data-tela="trabalho"]');
    await pagina.waitForSelector('[data-status-do-caso="' + idDoCaso + '"]', { timeout: 10000 });
    await pagina.click('[data-status-do-caso="' + idDoCaso + '"]');
    await pagina.waitForSelector('#situacao-nova', { timeout: 10000 });

    // Sem sucesso de contato: só a tentativa, com as opções do PO.
    await pagina.selectOption('#situacao-nova', 'Sem sucesso de contato');
    await pagina.waitForSelector('#situacao-campo-tentativasdecontato', { timeout: 10000 });
    const opcoes = await pagina.$$eval('#situacao-campo-tentativasdecontato option',
      (os) => os.map((o) => o.value).filter((v) => v));
    igual(opcoes.join('|'), 'Caixa postal|Não atende');
    igual(await pagina.locator('#situacao-campo-valordopremioretido').count(), 0,
      'o valor retido não é pedido fora do Retido');

    // Retido: o valor retido aparece, obrigatório.
    await pagina.selectOption('#situacao-nova', 'Retido');
    await pagina.waitForSelector('#situacao-campo-valordopremioretido', { timeout: 10000 });
    igual(await pagina.getAttribute('#situacao-campo-valordopremioretido', 'aria-required'), 'true');
    await pagina.click('#salvar-situacao');
    await pagina.waitForSelector('#erro-situacao:not([hidden])', { timeout: 10000 });
    contem(await pagina.textContent('#erro-situacao'), 'Valor do prêmio retido');
    igual(doCaso().status, 'Pendente', 'sem o valor, o status não muda');

    // O Status proposta (do teste anterior, obrigatório no Retido) também é pedido aqui.
    contem(await pagina.textContent('#erro-situacao'), 'Status proposta');
    await pagina.selectOption('#situacao-campo-statusproposta', 'Transmitido');
    await pagina.fill('#situacao-campo-valordopremioretido', '900,00');
    await pagina.selectOption('#situacao-campo-tentativasdecontato', 'Caixa postal');
    await pagina.click('#salvar-situacao');
    await pagina.waitForFunction(() => !document.getElementById('dialogo-situacao')
      || document.getElementById('erro-situacao').textContent.indexOf('prêmio') < 0
        && !document.getElementById('erro-situacao').hidden, { timeout: 10000 });
    igual(await pagina.locator('#dialogo-situacao').count() ? await pagina.textContent('#erro-situacao') : '',
      '', 'o diálogo fechou sem erro');
    igual(doCaso().status, 'Retido');
    igual(Number(doCaso()['valor do prêmio retido']), 900, 'o valor foi junto');
    igual(doCaso()['tentativas de contato'], 'Caixa postal', 'a opção da lista foi para a planilha');
  });

  await teste('o PO ajusta o prazo da RET pela tela e a planilha guarda', async () => {
    await pagina.click('[data-tela="configuracoes"]');
    await pagina.waitForTimeout(600);
    await pagina.click('[data-secao="sinalizadores"]');
    await pagina.waitForTimeout(800);

    const lista = await pagina.textContent('#config-lista');
    verdadeiro(lista.indexOf('Lendo') < 0, 'a tela ficou presa em "Lendo"');
    contem(lista, 'Prazo de retorno');
    contem(lista, 'Retorno da área');

    const botoes = await pagina.$$('[data-sinalizador]');
    let daRet = null;
    for (const botao of botoes) {
      const texto = await botao.textContent();
      if (texto.indexOf('RET ·') >= 0) daRet = botao;
    }
    verdadeiro(!!daRet, 'o sinalizador da RET aparece na lista');
    await daRet.click();
    await pagina.waitForTimeout(500);

    await pagina.fill('#cfg-sn-prazo', '4');
    await pagina.click('#form-sinalizador button[type="submit"]');
    await pagina.waitForTimeout(900);

    const linha = naPlanilha('SINALIZADORES').find((l) => String(l.Prazo) === '4');
    verdadeiro(!!linha, 'a linha da RET passou a ter prazo 4');
    igual(naPlanilha('SINALIZADORES').length, 3, 'editar não cria linha');
    contem(await pagina.textContent('#config-lista'), '4 dias úteis',
      'a lista recarregou com a regra nova');
  });

  await teste('amarelo igual ao prazo é recusado, com o motivo na tela', async () => {
    await pagina.fill('#cfg-sn-aviso', '4');
    await pagina.click('#form-sinalizador button[type="submit"]');
    await pagina.waitForTimeout(900);
    contem(await pagina.textContent('#config-painel'), 'Use um aviso menor que o prazo');
    verdadeiro(!!naPlanilha('SINALIZADORES').find((l) => String(l.AvisoFaltando) === '1'
      && String(l.Prazo) === '4'), 'a planilha não mudou');
  });

  /* --------------------------------------------- a coluna sua, no modal -- */

  console.log('\nA coluna sua, corrigida no "Trabalhar no caso"');

  await teste('a coluna escrita direto na planilha vem editável no modal, e o carimbo não', async () => {
    const idDoUltimo = vm.runInContext(`(function () {
      var aba = planilhaAtiva_().getSheetByName('BASE_RET');
      aba.insertColumnsBefore(3, 1);
      aba.getRange(1, 3).setNumberFormat('@');
      aba.getRange(1, 3).setValue('Observação minha');
      esquecerEstruturaLida_();
      var ultimo = lerRegistros_('BASE_RET').pop();
      atualizarRegistro_('BASE_RET', ultimo.__id, { 'Observação minha': 'fora  do formato' });
      return String(ultimo.__id);
    })()`, contexto);

    await pagina.click('[data-tela="trabalho"]');
    await pagina.waitForTimeout(900);
    if (await pagina.locator('#dialogo-prazo').count()) await pagina.click('#fechar-aviso-de-prazo');
    await pagina.locator('[data-canal]', { hasText: 'RET' }).first().click();
    await pagina.waitForTimeout(900);
    if (await pagina.locator('#dialogo-prazo').count()) await pagina.click('#fechar-aviso-de-prazo');
    // O caso pelo Id, na busca (Etapa 84: a aba 1 vem na ordem da prioridade, e
    // o último caso da planilha pode estar na aba 2).
    await pagina.fill('#busca-na-fila', idDoUltimo);
    await pagina.press('#busca-na-fila', 'Enter');
    await pagina.waitForTimeout(1200);
    if (!(await pagina.locator('[data-trabalhar="' + idDoUltimo + '"]').count())) {
      await pagina.click('[data-sub-aba="2"]');
      await pagina.waitForSelector('[data-trabalhar="' + idDoUltimo + '"]', { timeout: 10000 });
    }
    await pagina.click('[data-trabalhar="' + idDoUltimo + '"]');
    await pagina.waitForFunction(() => {
      const salvar = document.getElementById('modal-salvar');
      return salvar && !salvar.disabled;
    }, { timeout: 10000 });

    const caixa = pagina.locator('#modal-do-sistema [data-coluna-sua="Observação minha"]');
    igual(await caixa.count(), 1, 'a coluna sua virou caixa de texto');
    igual(await caixa.inputValue(), 'fora  do formato');
    igual(await pagina.locator('#modal-do-sistema [data-coluna-sua="Quem mudou o status"]').count(), 0,
      'o carimbo do sistema continua texto');

    await caixa.fill('Formato certo');
    await pagina.click('#modal-salvar');
    await pagina.waitForTimeout(1200);
    igual(naPlanilha('BASE_RET').pop()['Observação minha'], 'Formato certo', 'gravou na planilha');
  });

  /* ------------------------------------------------- os atendidos da Mesa -- */

  console.log('\nOs atendidos da Mesa');

  await teste('o PO importa o chat pela Importação, e a Produtividade da Mesa soma o chat ao sistema', async () => {
    const hoje = new Date();
    const comZero = (n) => (n < 10 ? '0' : '') + n;
    const dia = comZero(hoje.getDate()) + '/' + comZero(hoje.getMonth() + 1) + '/' + hoje.getFullYear();
    const idDoChat = ambiente.criarPlanilhaExterna('Atendimentos', [
      ['Data', 'Atendente', 'SUSEP', 'Assunto', 'Ramo'],
      [dia, 'Ana Martins', 'RET00J', 'Cobrança', 'VG'],
      [dia, 'Ana Martins', 'RET00J', 'Cancelamento', 'Vida Individual'],
      [dia, 'Bianca Souza', 'RET01A', 'Cobrança', 'VG']
    ]);
    vm.runInContext(`(function () {
      inserirVariosRegistros_('CORRETORAS', [
        { SUSEP: 'RET00J', Corretora: 'Corretora ABC', Sucursal: '12', Segmento: 'Diamante', Consultor: 'Marina Alencar' },
        { SUSEP: 'RET01A', Corretora: 'Corretora Horizonte', Sucursal: '12', Segmento: 'Diamante', Consultor: 'Rogério Pinto' }
      ]);
      inserirRegistro_('BASE_MESA', { Analista: 'Ana Martins', Status: 'Em andamento',
        'Data de entrada': new Date(), 'Nome do segurado': 'Do sistema', SUSEP: 'RET00J',
        Corretora: 'Corretora ABC', Assunto: 'Cobrança', Ramo: 'Vida em grupo' });
    })()`, contexto);

    // Pela tela: Importação › Mesa › "Atendimentos do chat" › link da planilha.
    await pagina.click('[data-tela="importacao"]');
    await pagina.waitForTimeout(600);
    await pagina.locator('[data-canal]', { hasText: 'Mesa' }).first().click();
    await pagina.waitForSelector('[data-o-que-importar="chat"]', { timeout: 10000 });
    await pagina.click('[data-o-que-importar="chat"]');
    await pagina.waitForSelector('[data-fonte="planilha"]', { timeout: 10000 });
    await pagina.click('[data-fonte="planilha"]');
    await pagina.fill('#planilha-id', idDoChat);
    await pagina.fill('#planilha-aba', 'Atendimentos');
    await pagina.click('#conferir-importacao');
    await pagina.waitForSelector('#importar-agora', { timeout: 10000 });
    // Etapa 57: as sinalizações da conferência abrem num pop-up do sistema.
    await pagina.waitForSelector('#dialogo-aviso', { timeout: 10000 });
    contem(await pagina.textContent('#dialogo-aviso'), 'Bianca Souza',
      'o pop-up lista o nome que não está no cadastro');
    await pagina.click('#confirmar-aviso');
    verdadeiro(!(await pagina.locator('#dialogo-aviso').count()), '"Entendi" fecha o pop-up');
    // "Conferir" sugere o de-para pelo nome do cabeçalho: "Atendente" é o Analista.
    const laudo = await pagina.textContent('#importacao');
    contem(laudo, 'Bianca Souza', 'o analista que não é usuário é avisado antes de gravar');
    // Etapa 48: o seletor do de-para vem em ordem alfabética, e a busca da linha
    // filtra o seletor; sobrando uma coluna, ela fica escolhida.
    const linhaDoAtendente = pagina.locator('.importacao-depara tr', { hasText: 'Atendente' });
    const opcoesAntes = await linhaDoAtendente.locator('select option').allTextContents();
    const semNaoTrazer = opcoesAntes.slice(1);
    igual(semNaoTrazer.join('|'), semNaoTrazer.slice().sort((a, b) => a.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLowerCase().localeCompare(b.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLowerCase())).join('|'), 'as colunas em ordem alfabética');
    await linhaDoAtendente.locator('.procurar-coluna').fill('analis');
    igual(await linhaDoAtendente.locator('select option').count(), 2, '"— não trazer —" e Analista');
    igual(await linhaDoAtendente.locator('select').inputValue(), 'Analista');
    contem(await pagina.textContent('#importar-agora'), 'Importar 3');
    await pagina.fill('#nome-do-lote', 'Chat de hoje');
    await pagina.click('#importar-agora');
    // A confirmação é o pop-up do sistema (Etapa 57), e não mais a caixinha do navegador.
    await pagina.waitForSelector('#dialogo-aviso', { timeout: 10000 });
    contem(await pagina.textContent('#dialogo-aviso'), 'Importar 3 atendimento(s)');
    await pagina.click('#confirmar-aviso');
    await pagina.waitForSelector('#importar-outro-lote', { timeout: 10000 });
    const gravados = naPlanilha('ATENDIMENTOS_CHAT');
    igual(gravados.length, 3, 'os três atendimentos foram para a aba do chat');
    igual(gravados.map((l) => l.Analista).join(','), 'Ana Martins,Ana Martins,Bianca Souza');
    igual(gravados[0].Lote, 'Chat de hoje');

    // E a Produtividade da Mesa.
    await pagina.click('[data-tela="produtividade"]');
    await pagina.waitForTimeout(800);
    await pagina.locator('[data-canal]', { hasText: 'Mesa' }).first().click();
    // A Mesa abre na Equipe; os atendidos estão na aba deles.
    await pagina.waitForSelector('[data-aba-da-mesa="atendidos"]', { timeout: 10000 });
    igual(await pagina.locator('.atendimentos').count(), 0, 'a Equipe não mistura os atendidos');
    await pagina.click('[data-aba-da-mesa="atendidos"]');
    await pagina.waitForSelector('.atendimentos', { timeout: 10000 });
    const bloco = await pagina.textContent('.atendimentos');
    contem(bloco, 'Atendidos no total');
    const tiles = await pagina.$$eval('.atendimentos .indicador .numero', (es) => es.map((e) => e.textContent));
    igual(tiles.join(','), '4,1,3', 'total, sistema e chat');

    const titulos = () => pagina.$$eval('.atendimentos + .graficos .grafico h3', (es) => es.map((e) => e.textContent));
    igual((await titulos()).join('|'), 'Atendidos por analista|Top 5 corretoras|Top 5 SUSEPs|Top 5 sucursais'
      + '|Top 5 assuntos|Top 5 consultores|Vida individual ou Vida em grupo|Atendimentos do chat por fila');
    const analistas = () => pagina.$$eval('.atendimentos + .graficos .grafico:first-child tbody tr',
      (es) => es.map((e) => Array.from(e.querySelectorAll('td')).map((c) => c.textContent).join(' ')));
    const numeros = () => pagina.$$eval('.atendimentos .indicador .numero', (es) => es.map((e) => e.textContent));
    // Uma coluna só: o número do atendimento (1 do e-mail + 2 do chat).
    igual((await analistas()).join('|'), 'Ana Martins 3|Bianca Souza 1');
    verdadeiro((await pagina.textContent('.atendimentos + .graficos')).indexOf('Corretora Horizonte') >= 0,
      'o nome da corretora vem do cadastro, pela SUSEP — a planilha do chat não o traz');
    const sucursais = await pagina.$$eval('.atendimentos + .graficos .grafico:nth-child(4) tbody tr',
      (es) => es.map((e) => Array.from(e.querySelectorAll('td')).map((c) => c.textContent).join(' ')));
    igual(sucursais.join('|'), '12 4', 'a sucursal vem do cadastro, e nem o chat nem a Mesa a trazem');

    // Vida em grupo: tudo recalcula na tela, sem voltar ao servidor, e a rosca some.
    await pagina.click('[data-ramo-dos-atendidos="vg"]');
    igual((await numeros()).join(','), '3,1,2', 'total, e-mail e chat só de Vida em grupo');
    igual((await analistas()).join('|'), 'Ana Martins 2|Bianca Souza 1');
    verdadeiro((await titulos()).indexOf('Vida individual ou Vida em grupo') < 0, 'a rosca só existe no Total');

    // E só o chat, ainda de Vida em grupo: um número só.
    await pagina.click('[data-origem-dos-atendidos="chat"]');
    igual((await numeros()).join(','), '2', 'só o chat de Vida em grupo');
    igual((await analistas()).join('|'), 'Ana Martins 1|Bianca Souza 1');
    await pagina.click('[data-origem-dos-atendidos="sistema"]');
    igual((await numeros()).join(','), '1', 'só o e-mail (o caso do sistema) de Vida em grupo');

    // De volta ao começo.
    await pagina.click('[data-origem-dos-atendidos="todos"]');
    await pagina.click('[data-ramo-dos-atendidos="total"]');
    igual((await numeros()).join(','), '4,1,3');
  });

  /* ------------------------------------- as tentativas e os cards novos -- */

  console.log('\nO carimbo da tentativa e o card por valor');

  await teste('a tentativa escolhe no menu onde carimba, e editar o status mantém o canal', async () => {
    // Como o PO montou: o status "Contatando" e, ao lado, a lista de tentativas.
    vm.runInContext(`(function () {
      try { definirSenhaDeAdministrador('segredo123', ''); } catch (e) { /* já definida */ }
      liberarComSenha('segredo123');
      var ret = canaisVisiveis_().filter(function (c) { return c.aba === 'BASE_RET'; })[0];
      var lista = criarLista('Tentativa de contato');
      ['1ª tentativa de contato sem sucesso', '2ª tentativa de contato sem sucesso']
        .forEach(function (nome, i) {
          salvarItemDoCatalogo({ tipo: lista, canalId: '', nome: nome, ordem: i + 1, ativo: true });
        });
      criarCampo(ret.id, { rotulo: 'Tentativa', tipo: 'seletor', secao: 'Situação' });
      var campo = listarCamposDoCanal(ret.id).filter(function (c) {
        return c.cabecalho === 'Tentativa'; })[0];
      salvarCampo({ id: campo.id, rotulo: 'Tentativa', secao: 'Situação', tipo: 'seletor',
        catalogo: lista, obrigatorio: false, ativo: true });
    })()`, contexto);

    await pagina.click('[data-tela="configuracoes"]');
    await pagina.waitForTimeout(600);
    await pagina.click('[data-secao="catalogo"]');
    await pagina.waitForSelector('#tipo-da-lista', { timeout: 10000 });
    await pagina.selectOption('#tipo-da-lista', 'TENTATIVA_DE_CONTATO');
    await pagina.waitForTimeout(900);
    await pagina.locator('[data-item]', { hasText: '1ª tentativa' }).first().click();
    await pagina.waitForSelector('#cfg-coluna-de-carimbo', { timeout: 10000 });

    // O menu traz as colunas de data da RET; texto não entra.
    const oferecidas = await pagina.$$eval('#cfg-coluna-de-carimbo option', (es) => es.map((e) => e.value));
    verdadeiro(oferecidas.indexOf('Data do 1º contato') >= 0, 'a coluna de data é oferecida');
    verdadeiro(oferecidas.every((v) => v.toLowerCase() !== 'nome do cliente'), 'texto fica de fora');
    igual(await pagina.inputValue('#cfg-canal-do-item'), '', 'o item é de todos os canais');

    await pagina.selectOption('#cfg-coluna-de-carimbo', 'Data do 1º contato');
    await pagina.click('#form-item button[type="submit"]');
    await pagina.waitForTimeout(900);
    const item = naPlanilha('CATALOGO').find((l) => l.Nome === '1ª tentativa de contato sem sucesso');
    igual(item.ColunaDeCarimbo, 'Data do 1º contato', 'a escolha ficou na linha do item');

    // Editar um status pela tela não apaga mais o canal dele.
    await pagina.selectOption('#tipo-da-lista', 'STATUS');
    await pagina.waitForTimeout(900);
    await pagina.locator('[data-item]').first().click();
    await pagina.waitForSelector('#form-item', { timeout: 10000 });
    const idDoStatus = await pagina.getAttribute('[data-item]', 'data-item');
    const antes = naPlanilha('CATALOGO').find((l) => String(l.__id) === String(idDoStatus));
    verdadeiro(!!String(antes.CanalId || ''), 'o status de fábrica tem canal');
    igual(await pagina.inputValue('#cfg-canal-do-item'), String(antes.CanalId),
      'o menu vem com o canal do status');
    await pagina.click('#form-item button[type="submit"]');
    await pagina.waitForTimeout(900);
    igual(String(naPlanilha('CATALOGO').find((l) => String(l.__id) === String(idDoStatus)).CanalId),
      String(antes.CanalId), 'salvar pela tela manteve o canal');

    // E o caso: escolher a 1ª tentativa carimba a data.
    const caso = vm.runInContext(`(function () {
      var ret = canaisVisiveis_().filter(function (c) { return c.aba === 'BASE_RET'; })[0];
      return cadastrarCaso(ret.id, { nomedocliente: 'Tentou uma vez',
        tentativa: '1ª tentativa de contato sem sucesso' }).id;
    })()`, contexto);
    const linha = naPlanilha('BASE_RET').find((l) => l.__id === caso);
    verdadeiro(Object.prototype.toString.call(linha['Data do 1º contato']) === '[object Date]',
      'a tentativa carimbou "Data do 1º contato"');
  });

  await teste('o card por valor de campo se cria pela tela, se salva de novo e conta no Trabalho', async () => {
    await pagina.click('[data-tela="configuracoes"]');
    await pagina.waitForTimeout(600);
    await pagina.click('[data-secao="paineis"]');
    await pagina.waitForSelector('#add-card', { timeout: 10000 });
    await pagina.locator('[data-canal-dos-cards]', { hasText: 'RET' }).first().click();
    await pagina.waitForTimeout(900);

    await pagina.click('#add-card');
    await pagina.waitForTimeout(300);
    const ultimo = (await pagina.$$('[data-parte="contar"]')).length - 1;
    const grupos = await pagina.$$eval('[data-parte="contar"]:last-of-type optgroup',
      (es) => es.map((e) => e.label));
    verdadeiro(grupos.indexOf('Valor de um campo') >= 0 && grupos.indexOf('Coluna preenchida') >= 0,
      'o menu tem os grupos novos: ' + grupos.join(', '));
    await pagina.selectOption('[data-card="' + ultimo + '"][data-parte="contar"]',
      { label: 'Tentativa: 1ª tentativa de contato sem sucesso' });
    await pagina.fill('[data-card="' + ultimo + '"][data-parte="titulo"]', '1ª tentativa');
    await pagina.dispatchEvent('[data-card="' + ultimo + '"][data-parte="titulo"]', 'change');
    await pagina.click('#salvar-cards');
    await pagina.waitForTimeout(1000);

    const gravado = naPlanilha('PAINEIS').find((l) => l.Titulo === '1ª tentativa');
    verdadeiro(!!gravado, 'o card foi gravado');
    igual(gravado.CampoDimensao, 'valor');
    igual(gravado.CampoMedida, 'Tentativa', 'a coluna');
    igual(gravado.Filtro, '1ª tentativa de contato sem sucesso', 'o valor');

    // A lista recarregou: o menu do card mostra a opção dele, e salvar de novo
    // (a lista inteira volta ao servidor) não perde a coluna.
    const indice = (await pagina.$$eval('[data-parte="titulo"]', (es) => es.map((e) => e.value)))
      .indexOf('1ª tentativa');
    const marcado = await pagina.$eval('[data-card="' + indice + '"][data-parte="contar"]',
      (e) => e.options[e.selectedIndex].textContent);
    igual(marcado, 'Tentativa: 1ª tentativa de contato sem sucesso', 'o menu marca a opção certa');
    await pagina.click('#salvar-cards');
    await pagina.waitForTimeout(1000);
    const ruins = await pagina.$$eval('.aviso-flutuante.tom-ruim', (es) => es.map((e) => e.textContent));
    igual(ruins.length, 0, 'salvar de novo não dá erro: ' + ruins.join(' | '));
    igual(naPlanilha('PAINEIS').find((l) => l.Titulo === '1ª tentativa').CampoMedida, 'Tentativa');

    await pagina.click('[data-tela="trabalho"]');
    await pagina.waitForTimeout(900);
    const naRet = pagina.locator('[data-canal]', { hasText: 'RET' }).first();
    if (await naRet.count()) await naRet.click();
    await pagina.waitForTimeout(900);
    const lerCards = () => pagina.$$eval('.cartoes .indicador', (es) => es.map((e) =>
      e.querySelector('.rotulo').textContent + '=' + e.querySelector('.numero').textContent
      + (e.tagName === 'BUTTON' ? ' (filtra)' : '')));
    // Com sub-abas (Etapa 84), o card de Painéis fica na aba onde conta caso.
    let cards = await lerCards();
    const primeiros = cards;
    if (cards.indexOf('1ª tentativa=1 (filtra)') < 0) {
      const outra = (await pagina.$eval('[data-sub-aba][aria-selected="true"]',
        (e) => e.getAttribute('data-sub-aba')).catch(() => '2')) === '1' ? '2' : '1';
      await pagina.click('[data-sub-aba="' + outra + '"]');
      await pagina.waitForTimeout(900);
      cards = await lerCards();
    }
    verdadeiro(cards.indexOf('1ª tentativa=1 (filtra)') >= 0, 'o card conta o caso: ' + cards.join(', ')
      + ' | antes de trocar: ' + primeiros.join(', '));
    const totalDaAba = cards.find((c) => /^Total/.test(c)).replace(' (filtra)', '');

    // Etapa 44: clicar no card de valor filtra a fila pelo que ele conta.
    await pagina.locator('.cartoes .indicador.clicavel', { hasText: '1ª tentativa' }).first().click();
    await pagina.waitForTimeout(900);
    const linhas = await pagina.locator('.fila tbody tr').count();
    igual(linhas, 1, 'a fila fica com o caso do card');
    igual(await pagina.locator('.cartoes .indicador.ligado', { hasText: '1ª tentativa' }).count(), 1,
      'e o card fica marcado');
    const outros = await pagina.$$eval('.cartoes .indicador', (es) => es.map((e) =>
      e.querySelector('.rotulo').textContent + '=' + e.querySelector('.numero').textContent));
    verdadeiro(outros.indexOf(totalDaAba) >= 0, 'os outros cards não zeram: ' + outros.join(', '));
    await pagina.locator('.cartoes .indicador.clicavel', { hasText: '1ª tentativa' }).first().click();
    await pagina.waitForTimeout(900);
  });

  /* ------------------------------------------- o Trabalho que não estoura -- */

  console.log('\nO Trabalho com fila grande');

  await teste('a aba 1 abre com parte da fila; "100" e "Todos" mostram mais (Etapa 84)', async () => {
    vm.runInContext(`(function () {
      var lote = [];
      for (var i = 0; i < 150; i++) {
        lote.push({ 'data de recepção do protocolo': new Date(), analista: 'Ana Martins',
          'nome do cliente': 'Fila grande ' + i, status: 'Pendente', protocolo: 'FG-' + i });
      }
      inserirVariosRegistros_('BASE_RET', lote);
    })()`, contexto);
    await pagina.click('[data-tela="trabalho"]');
    await pagina.waitForTimeout(900);
    const naRet = pagina.locator('[data-canal]', { hasText: 'RET' }).first();
    if (await naRet.count()) await naRet.click();
    await pagina.waitForTimeout(900);
    // Os 150 Pendente estão na aba 1, "Casos em aberto" (Etapa 84).
    await pagina.click('[data-sub-aba="1"]');
    await pagina.waitForSelector('.fila-mostrando', { timeout: 10000 });
    const totalDaAba = Number((await pagina.textContent('[data-sub-aba="1"] .numero-da-aba')).replace(/\D/g, ''));
    verdadeiro(totalDaAba >= 150, 'a aba diz quantos casos tem: ' + totalDaAba);
    contem(await pagina.textContent('.fila-mostrando'), 'de ' + totalDaAba,
      'a barra fala da aba inteira');
    contem(await pagina.textContent('table.fila.agrupada tbody'), 'Fila grande', 'os casos novos estão na aba');
    const linhas = () => pagina.$$eval('table.fila.agrupada tbody tr', (es) => es.length);
    const naAbertura = await linhas();
    igual(naAbertura, 5, 'a tela abre mostrando os 5 de sempre');

    const antes = chamadasDoNavegador.resumoDoCanal;
    await pagina.click('[data-mostrar="100"]');
    await pagina.waitForFunction(() =>
      document.querySelectorAll('table.fila.agrupada tbody tr').length === 100, null, { timeout: 10000 });
    // O servidor manda 100 na abertura, ou 20 na leitura leve (Etapa 84): aí o
    // "100" vai buscar o resto, uma vez. Os 20/100 são provados em
    // testes-sub-abas-do-trabalho.
    verdadeiro(chamadasDoNavegador.resumoDoCanal - antes <= 1, 'no máximo uma ida ao servidor');

    await pagina.click('[data-mostrar="todos"]');
    await pagina.waitForFunction((n) =>
      document.querySelectorAll('table.fila.agrupada tbody tr').length === n,
      totalDaAba, { timeout: 10000 });
    contem(await pagina.textContent('table.fila.agrupada tbody'), 'Fila grande 0', 'todos os da aba');
    contem(await pagina.textContent('.fila-mostrando'), 'Mostrando todos os ' + totalDaAba);
  });

  await teste('na Produtividade, a fatia do gráfico abre com 100 e "Mostrar todos" traz o resto', async () => {
    // Os 150 casos "Pendente" do teste anterior estão na RET.
    await pagina.click('[data-tela="produtividade"]');
    await pagina.waitForTimeout(900);
    const naRet = pagina.locator('[data-canal]', { hasText: 'RET' }).first();
    if (await naRet.count()) await naRet.click();
    await pagina.waitForTimeout(900);
    const fatia = pagina.locator('.grafico[data-grafico] .legenda-item[data-ponto="Pendente"]').first();
    verdadeiro(await fatia.count() > 0, 'a fatia "Pendente" existe');
    const antes = chamadasDoNavegador.detalharComponente || 0;
    await fatia.click();
    await pagina.waitForSelector('#detalhe-do-painel table', { timeout: 10000 });
    igual(await pagina.$$eval('#detalhe-do-painel tbody tr', (es) => es.length), 100);
    contem(await pagina.textContent('#detalhe-do-painel'), 'Mostrando os 100 casos mais recentes de');
    await pagina.click('#detalhe-todos');
    await pagina.waitForFunction(() =>
      document.querySelectorAll('#detalhe-do-painel tbody tr').length > 100, null, { timeout: 10000 });
    igual(chamadasDoNavegador.detalharComponente, antes + 2, 'uma ida para abrir, outra para "todos"');
    verdadeiro(!(await pagina.locator('#detalhe-todos').count()), 'com tudo na tela, o botão some');
  });

  await teste('o período abre no dia 1 até hoje, e o "Limpar filtros" volta tudo ao início (Etapa 56)', async () => {
    const agora = new Date();
    const comZero = (n) => (n < 10 ? '0' : '') + n;
    const noCalendario = (dia) => agora.getFullYear() + '-' + comZero(agora.getMonth() + 1) + '-' + comZero(dia);
    const valor = (seletor) => pagina.$eval(seletor, (el) => el.value);

    // Produtividade (a RET do teste anterior): abre do dia 1 até hoje.
    igual(await valor('#analitico [data-periodo="de"]'), noCalendario(1), 'de: dia 1');
    igual(await valor('#analitico [data-periodo="ate"]'), noCalendario(agora.getDate()), 'até: hoje');

    // Muda o período para "Por mês" e escolhe um filtro de lista…
    await pagina.selectOption('#analitico [data-periodo="como"]', 'mes');
    await pagina.waitForSelector('#analitico [data-periodo="mes"]', { timeout: 10000 });
    //    (Etapa 72) a lista aceita várias opções: marca duas e aplica uma vez.
    await pagina.locator('#analitico .filtro-multiplo-botao').first().click();
    await pagina.waitForSelector('#analitico .filtro-multiplo-painel', { timeout: 10000 });
    const marcas = pagina.locator('#analitico .filtro-multiplo-painel input[type="checkbox"]');
    await marcas.nth(0).check();
    await marcas.nth(1).check();
    await pagina.click('#analitico [data-multiplo-acao="aplicar"]');
    await pagina.waitForSelector('#analitico .filtro-etiqueta', { timeout: 10000 });
    igual(await pagina.locator('#analitico .filtro-multiplo-botao b').first().textContent(), '2',
      'o botão diz quantas opções estão marcadas');

    // …e o Limpar volta os dois.
    await pagina.click('#limpar-filtros-da-produtividade');
    await pagina.waitForSelector('#analitico [data-periodo="de"]', { timeout: 10000 });
    igual(await valor('#analitico [data-periodo="como"]'), 'intervalo', 'volta para "Por data"');
    igual(await valor('#analitico [data-periodo="de"]'), noCalendario(1));
    igual(await pagina.locator('#analitico .filtro-etiqueta').count(), 0, 'o filtro de lista volta vazio');

    // Trabalho: a busca digitada sai com o Limpar.
    await pagina.click('[data-tela="trabalho"]');
    await pagina.waitForSelector('#busca-na-fila', { timeout: 10000 });
    await pagina.fill('#busca-na-fila', 'Fila grande 7');
    await pagina.press('#busca-na-fila', 'Enter');
    await pagina.waitForTimeout(900);
    await pagina.waitForSelector('#busca-na-fila', { timeout: 10000 });
    igual(await valor('#busca-na-fila'), 'Fila grande 7', 'a busca ficou valendo');
    await pagina.click('#limpar-filtros');
    await pagina.waitForFunction(() => {
      const campo = document.getElementById('busca-na-fila');
      return campo && campo.value === '';
    }, null, { timeout: 10000 });
    igual(await pagina.locator('#painel [data-periodo]').count(), 0, 'o Trabalho não tem período (Etapa 84)');
  });

  await teste('exportar relatório: escolhe, confere e só então exporta (Etapa 73)', async () => {
    await pagina.click('[data-tela="produtividade"]');
    await pagina.waitForSelector('#exportar-relatorio', { timeout: 10000 });
    await pagina.click('#exportar-relatorio');
    await pagina.waitForSelector('#dialogo-relatorio .relatorio-pronto', { timeout: 10000 });
    await pagina.check('input[name="relatorio-qual"][value="todos"]');
    await pagina.click('[data-relatorio-colunas="todas"]');
    verdadeiro(!(await pagina.locator('#relatorio-exportar').count()), 'sem conferir, não há "Exportar"');
    await pagina.click('#relatorio-conferir');
    await pagina.waitForSelector('#relatorio-exportar', { timeout: 10000 });
    contem(await pagina.textContent('#relatorio-resumo'), 'arquivo CSV');

    // Mudar qualquer escolha pede a conferência de novo.
    await pagina.click('[data-relatorio-colunas="fila"]');
    igual(await pagina.locator('#relatorio-conferir').count(), 1, 'voltou a pedir "Conferir"');
    igual(await pagina.textContent('#relatorio-resumo'), '', 'e o resumo antigo saiu');
    await pagina.click('#relatorio-conferir');
    await pagina.waitForSelector('#relatorio-exportar:not([disabled])', { timeout: 10000 });
    await pagina.click('#relatorio-exportar');
    await pagina.waitForSelector('#texto-do-relatorio', { timeout: 10000 });
    const linhas = (await pagina.$eval('#texto-do-relatorio', (el) => el.value)).split('\n');
    verdadeiro(linhas.length > 1 && linhas[0].indexOf(';') > 0, 'o arquivo tem cabeçalho e casos');
    verdadeiro(await pagina.locator('#baixar-relatorio').count() === 1, 'e o botão de baixar');
    await pagina.click('#fechar-relatorio');
    verdadeiro(!(await pagina.locator('#dialogo-relatorio').count()), 'a caixa fecha');
  });

  /* ---------------------------------------------------- a cara de sistema -- */

  console.log('\nA cara de sistema (Etapa 67)');

  await teste('o "Trabalhar no caso" mostra a linha do tempo do caso', async () => {
    await pagina.click('[data-tela="trabalho"]');
    await pagina.waitForSelector('[data-trabalhar]', { timeout: 10000 });
    await pagina.click('[data-trabalhar]');
    await pagina.waitForSelector('#modal-do-sistema .linha-do-tempo li', { timeout: 10000 });
    const eventos = await pagina.$$eval('#modal-do-sistema .linha-do-tempo .oque', (es) => es.map((e) => e.textContent));
    verdadeiro(eventos.indexOf('Entrada do caso') >= 0, 'a entrada na linha do tempo: ' + eventos.join(' | '));
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(300);
  });

  await teste('o aviso de salvo aparece no canto, e some sozinho', async () => {
    await pagina.evaluate(() => Moldura.toast('Salvo no teste.', 'bom'));
    const aviso = await pagina.$eval('#avisos-flutuantes .aviso-flutuante', (el) => el.textContent);
    igual(aviso, 'Salvo no teste.');
    await pagina.waitForFunction(() => !document.querySelector('#avisos-flutuantes .aviso-flutuante'),
      null, { timeout: 6000 });
  });

  console.log('\nA mudança de status agendada (Etapa 78)');

  await teste('a importação agenda a mudança de status: dias, destino, e as duas colunas gravadas', async () => {
    await pagina.click('[data-tela="importacao"]');
    await pagina.waitForTimeout(600);
    await pagina.locator('[data-canal]', { hasText: 'RET' }).first().click();
    // O teste do chat deixou a fonte em "outra planilha": volta para o texto colado.
    await pagina.waitForSelector('[data-fonte="colado"]', { timeout: 10000 });
    await pagina.click('[data-fonte="colado"]');
    await pagina.waitForSelector('#texto-colado', { timeout: 10000 });
    await pagina.fill('#texto-colado', 'CPF\tnome do cliente\n55500000001\tAgendado Um\n55500000002\tAgendado Dois');
    await pagina.click('#conferir-importacao');
    await pagina.waitForSelector('#importar-agora', { timeout: 10000 });
    if (await pagina.locator('#dialogo-aviso').count()) await pagina.click('#confirmar-aviso');

    await pagina.waitForSelector('#agendar-dias', { timeout: 10000 });
    contem(await pagina.textContent('#importacao'), 'Com 7 dias, o lote importado no dia 1 muda no dia 8.');
    contem(await pagina.getAttribute('#agendar-dias', 'placeholder'), 'em branco: não agenda');
    await pagina.fill('#agendar-dias', '7');
    await pagina.locator('#agendar-dias').dispatchEvent('change');
    await pagina.waitForFunction(() => /Escolha para qual status/.test(document.getElementById('importacao').textContent),
      null, { timeout: 10000 });
    verdadeiro(await pagina.locator('#importar-agora').count() === 1, 'a conferência continua na tela');
    const destinos = await pagina.$$eval('#agendar-para option', (os) => os.map((o) => o.value));
    verdadeiro(destinos.indexOf('Retido') < 0 && destinos.indexOf('Pendente') < 0, destinos.join(' | '));
    await pagina.selectOption('#agendar-para', '1º contato realizado');
    await pagina.waitForFunction(() => /muda sozinho para/.test(document.getElementById('importacao').textContent),
      null, { timeout: 10000 });
    igual(await pagina.inputValue('#agendar-dias'), '7', 'o número digitado continua lá');

    await pagina.fill('#nome-do-lote', 'Lote agendado');
    await pagina.click('#importar-agora');
    await pagina.waitForSelector('#dialogo-aviso', { timeout: 10000 });
    await pagina.click('#confirmar-aviso');
    await pagina.waitForSelector('#importar-outro-lote', { timeout: 10000 });
    contem(await pagina.textContent('#importacao'), 'Mudança de status agendada');

    const gravados = naPlanilha('BASE_RET').filter((l) => /^Agendado /.test(l['nome do cliente']));
    igual(gravados.length, 2);
    igual(gravados.map((l) => l['Mudar status para']).join(','), '1º contato realizado,1º contato realizado');
    const em = new Date(gravados[0]['Mudar status em']);
    const esperado = new Date();
    esperado.setDate(esperado.getDate() + 7);
    igual(em.getDate() + '/' + em.getMonth(), esperado.getDate() + '/' + esperado.getMonth(), 'daqui a 7 dias corridos');
  });

  console.log('\nO acabamento (Etapa 75)');

  await teste('o cadastro diz o que falta preencher, e as ações ficam à vista ao rolar', async () => {
    await pagina.click('[data-tela="cadastrarCaso"]');
    await pagina.waitForSelector('#acoes-do-caso:not([hidden])', { timeout: 10000 });
    const falta = await pagina.textContent('#falta-no-caso');
    verdadeiro(/^Faltam? \d+ obrigatórios?: /.test(falta), 'o que falta: "' + falta + '"');
    verdadeiro(await pagina.$eval('#salvar-caso', (el) => el.disabled), 'e o botão segue apagado');
    igual(await pagina.$eval('#acoes-do-caso', (el) => getComputedStyle(el).position), 'sticky');
    // Preencher os obrigatórios apaga o recado e acende o botão.
    await pagina.evaluate(() => {
      document.querySelectorAll('#corpo-do-formulario [aria-required="true"]').forEach((campo) => {
        if (campo.disabled || String(campo.value || '').trim()) return;
        if (campo.tagName === 'SELECT') campo.selectedIndex = campo.options.length - 1;
        else campo.value = campo.type === 'date' ? '2026-01-05' : '7';
        campo.dispatchEvent(new Event('input', { bubbles: true }));
        campo.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    await pagina.waitForFunction(() => document.getElementById('falta-no-caso').textContent === ''
      || !document.getElementById('salvar-caso').disabled, null, { timeout: 5000 });
    const depois = await pagina.textContent('#falta-no-caso');
    igual(await pagina.$eval('#salvar-caso', (el) => el.disabled), depois !== '',
      'o botão acende exatamente quando o recado some');
    // Sai sem cadastrar: limpa antes, senão a troca de tela pergunta (Etapa 87, F2).
    await pagina.click('#limpar-caso');
    await pagina.waitForSelector('#acoes-do-caso:not([hidden])', { timeout: 10000 });
  });

  await teste('Configurações: a busca acha o campo pelo nome, e os desligados ficam recolhidos', async () => {
    await pagina.click('[data-tela="configuracoes"]');
    await pagina.waitForSelector('[data-secao="campos"]', { timeout: 10000 });
    await pagina.click('[data-secao="campos"]');
    await pagina.waitForSelector('#busca-de-campos', { timeout: 10000 });
    const visiveis = () => pagina.locator('#config-lista .config-item:not([hidden])').count();
    const todos = await pagina.locator('#config-lista .config-item').count();
    const desligados = await pagina.locator('#config-lista .config-item.desligado').count();
    verdadeiro(desligados > 0, 'o canal tem campos desligados');
    igual(await visiveis(), todos - desligados, 'os desligados abrem recolhidos');
    contem(await pagina.textContent('#abrir-desligados'), desligados + ' campo');

    await pagina.click('#abrir-desligados');
    await pagina.waitForSelector('#abrir-desligados[aria-expanded="true"]', { timeout: 5000 });
    igual(await visiveis(), todos, 'e aparecem quando se pede');
    await pagina.click('#abrir-desligados');
    await pagina.waitForSelector('#abrir-desligados[aria-expanded="false"]', { timeout: 5000 });

    // A busca ignora acento e caixa, e alcança o desligado também.
    await pagina.fill('#busca-de-campos', 'PREMIO');
    const achados = await visiveis();
    verdadeiro(achados > 0 && achados < todos, achados + ' de ' + todos);
    contem(await pagina.textContent('#contagem-de-campos'), achados + ' de ' + todos + ' campos');
    igual(await pagina.$eval('#config-lista .config-itens', (el) => el.className), 'config-itens procurando');
    const nomeDeUmDesligado = await pagina.$eval('#config-lista .config-item.desligado .nome', (el) => el.textContent);
    await pagina.fill('#busca-de-campos', nomeDeUmDesligado);
    verdadeiro(await pagina.locator('#config-lista .config-item.desligado:not([hidden])').count() > 0,
      'o desligado se acha pelo nome');
    await pagina.fill('#busca-de-campos', '');
    igual(await visiveis(), todos - desligados, 'sem busca, volta ao que era');
  });

  console.log('\nA Agenda da Mesa (Etapa 79)');

  await teste('Trabalho › Mesa › Reuniões: lista a Agenda da segunda base, registra e edita', async () => {
    // A segunda base, com a aba Agenda já existente e uma reunião antiga.
    const idDeFora = ambiente.criarPlanilhaExterna({
      SUSEP_BLOQUEADAS: [['Id', 'SUSEP', 'NomeCorretora', 'Sucursal', 'CoordenadorComercial', 'BloqueadaEm',
        '_Visivel', '_ExcluidoEm', '_ExcluidoPor', '_Origem']],
      Agenda: [['Data', 'gerente', 'consultor', 'corretora', 'analista', 'área', 'segurado/estipulante',
        'participantes', 'assunto', 'obs', 'ações', 'chamado', 'status', '1 report(15 dias)',
        '2 report (30 dias)', '3 report (45 dias)'],
      [new Date(2026, 8, 10), 'Gerente', 'Consultor', 'Corretora Antiga', 'Ana Martins', 'Comercial', '',
        '', 'Renovação', '', '', '', 'Pendente', '', '', '']]
    });
    vm.runInContext(`(function () {
      gravarConfiguracao_('CADASTROS.PLANILHA_ID', '${idDeFora}');
      gravarConfiguracao_('CADASTROS.ABAS', 'SUSEP_BLOQUEADAS');
      esquecerCacheDaConfiguracao_();
    })()`, contexto);
    const naAgenda = () => {
      const aba = ambiente.planilhaExternaPeloId(idDeFora).getSheetByName('Agenda');
      return aba.getRange(2, 1, aba.getLastRow() - 1, 16).getValues();
    };

    await pagina.click('[data-tela="trabalho"]');
    await pagina.waitForTimeout(600);
    await pagina.locator('[data-canal]', { hasText: 'RET' }).first().click();
    await pagina.waitForTimeout(600);
    igual(await pagina.locator('[data-aba-do-trabalho]').count(), 0, 'na RET não há a aba Reuniões');
    await pagina.locator('[data-canal]', { hasText: 'Mesa' }).first().click();
    await pagina.waitForSelector('[data-aba-do-trabalho="reunioes"]', { timeout: 10000 });
    await pagina.click('[data-aba-do-trabalho="reunioes"]');
    await pagina.waitForSelector('.agenda-tabela', { timeout: 10000 });
    contem(await pagina.textContent('.agenda-tabela'), 'Corretora Antiga');

    // Registrar pela lista: sem o obrigatório, diz o que falta e não grava.
    await pagina.click('#registrar-reuniao');
    await pagina.waitForSelector('#dialogo-da-reuniao #agenda-corretora', { timeout: 10000 });
    await pagina.click('#salvar-reuniao');
    contem(await pagina.textContent('#falta-na-reuniao'), 'Corretora');
    igual(naAgenda().length, 1);
    await pagina.fill('#agenda-corretora', 'Corretora da Tela');
    await pagina.fill('#agenda-assunto', 'Carteira de vida');
    await pagina.selectOption('#agenda-status', 'Acompanhar por 3 meses');
    await pagina.click('#salvar-reuniao');
    await pagina.waitForFunction(() => /Corretora da Tela/.test((document.querySelector('.agenda-tabela') || {}).textContent || ''),
      null, { timeout: 10000 });
    igual(naAgenda().length, 2);
    igual(naAgenda()[1][3] + '|' + naAgenda()[1][12], 'Corretora da Tela|Acompanhar por 3 meses');

    // Editar: o report de 15 dias da reunião antiga.
    await pagina.locator('tr', { hasText: 'Corretora Antiga' }).locator('[data-editar-reuniao]').click();
    await pagina.waitForSelector('#dialogo-da-reuniao #agenda-report1', { timeout: 10000 });
    igual(await pagina.inputValue('#agenda-data'), '2026-09-10', 'abre com o que está gravado');
    await pagina.fill('#agenda-report1', '2026-09-25');
    await pagina.click('#salvar-reuniao');
    await pagina.waitForFunction(() => /15 d ✓/.test((document.querySelector('.agenda-tabela') || {}).textContent || ''),
      null, { timeout: 10000 });
    igual(naAgenda().length, 2, 'editar não cria linha');
    igual(new Date(naAgenda()[0][13]).getDate(), 25);

    // A busca.
    await pagina.fill('#busca-na-agenda', 'renovacao');
    await pagina.press('#busca-na-agenda', 'Enter');
    await pagina.waitForFunction(() => document.querySelectorAll('.agenda-tabela tbody tr').length === 1,
      null, { timeout: 10000 });
  });

  await teste('Cadastrar Caso › Mesa › "Reunião com corretor": o formulário diferente grava na Agenda', async () => {
    await pagina.click('[data-tela="cadastrarCaso"]');
    await pagina.waitForTimeout(600);
    await pagina.locator('[data-canal]', { hasText: 'Mesa' }).first().click();
    await pagina.waitForSelector('[data-o-que-cadastrar="reuniao"]', { timeout: 10000 });
    await pagina.click('[data-o-que-cadastrar="reuniao"]');
    await pagina.waitForSelector('#corpo-da-reuniao #agenda-corretora', { timeout: 10000 });
    verdadeiro(!(await pagina.locator('#formulario-do-caso').count()), 'o formulário do caso sai da tela');
    await pagina.fill('#agenda-corretora', 'Corretora do Cadastro');
    await pagina.fill('#agenda-assunto', 'Sinistro');
    await pagina.click('#registrar-reuniao-nova');
    await pagina.waitForFunction(() => document.getElementById('agenda-corretora')
      && document.getElementById('agenda-corretora').value === '', null, { timeout: 10000 });
    const gravadas = vm.runInContext('agendaDaMesa(canaisVisiveis_().filter(function (c) { return c.aba === "BASE_MESA"; })[0].id, "")', contexto);
    igual(gravadas.reunioes[0].valores.corretora, 'Corretora do Cadastro');
    // E a aba "Caso" volta ao formulário de sempre.
    await pagina.click('[data-o-que-cadastrar="caso"]');
    await pagina.waitForSelector('#formulario-do-caso', { timeout: 10000 });
  });

  await teste('Cadastrar Caso › Mesa: da Reunião para o Caso, com algo digitado, pergunta antes (Etapa 87, F2)', async () => {
    await pagina.click('[data-o-que-cadastrar="reuniao"]');
    await pagina.waitForSelector('#corpo-da-reuniao #agenda-corretora', { timeout: 10000 });
    await pagina.fill('#agenda-corretora', 'Digitada e não registrada');
    await pagina.click('[data-o-que-cadastrar="caso"]');
    await pagina.waitForSelector('#dialogo-descarte', { timeout: 5000 });
    await pagina.click('#continuar-editando'); await pagina.waitForTimeout(200);
    igual(await pagina.inputValue('#agenda-corretora'), 'Digitada e não registrada', 'continuar: a reunião fica');
    await pagina.click('[data-o-que-cadastrar="caso"]');
    await pagina.waitForSelector('#dialogo-descarte', { timeout: 5000 });
    await pagina.click('#descartar-alteracoes');
    await pagina.waitForSelector('#formulario-do-caso', { timeout: 10000 });
    const gravadas = vm.runInContext('agendaDaMesa(canaisVisiveis_().filter(function (c) { return c.aba === "BASE_MESA"; })[0].id, "")', contexto);
    verdadeiro(!gravadas.reunioes.some((r) => r.valores.corretora === 'Digitada e não registrada'), 'descartar não grava a reunião');
  });

  /* ------------------------------------------------------------- o final -- */

  console.log('\nO visual aprovado (Etapa 90)');

  await teste('Trabalho: a faixa do prazo no lugar da janela, e "Ver os casos" abre a mesma janela (Etapa 90)', async () => {
    await pagina.click('[data-tela="trabalho"]');
    await pagina.waitForTimeout(600);
    // A RET, na aba de casos (o teste anterior termina na Agenda da Mesa).
    await pagina.locator('[data-canal]', { hasText: 'RET' }).first().click();
    await pagina.waitForSelector('[data-sub-aba="1"]', { timeout: 10000 });
    await pagina.click('[data-sub-aba="1"]');
    await pagina.waitForSelector('.cartoes .indicador', { timeout: 10000 });
    await pagina.waitForTimeout(500);
    igual(await pagina.locator('#dialogo-prazo').count(), 0, 'a janela não abre sozinha (decisão do PO)');
    if (await pagina.locator('#ver-casos-do-prazo').count()) {
      contem(await pagina.textContent('.faixa-do-prazo'), 'perto de vencer');
      await pagina.click('#ver-casos-do-prazo');
      await pagina.waitForSelector('#dialogo-prazo', { timeout: 5000 });
      contem(await pagina.textContent('#dialogo-prazo'), 'perto de vencer');
      await pagina.click('#fechar-aviso-de-prazo');
      await pagina.waitForTimeout(200);
      igual(await pagina.locator('#dialogo-prazo').count(), 0);
    }
  });

  await teste('Trabalho: "Filtrando por" mostra o cartão escolhido, e o × tira o filtro (Etapa 90, V2)', async () => {
    await pagina.click('[data-sub-aba="1"]');
    await pagina.waitForSelector('.cartoes .indicador.clicavel', { timeout: 10000 });
    await pagina.waitForTimeout(400);
    const rotulos = await pagina.$$eval('.cartoes .indicador.clicavel .rotulo', (es) => es.map((e) => e.textContent));
    await pagina.locator('.cartoes .indicador.clicavel', { hasText: rotulos[1] }).first().click();
    await pagina.waitForSelector('.filtrando-por [data-tirar-cartao]', { timeout: 10000 });
    contem(await pagina.textContent('.filtrando-por'), 'Cartão: ' + rotulos[1]);
    await pagina.click('.filtrando-por [data-tirar-cartao]');
    await pagina.waitForFunction(() => !document.querySelector('.filtrando-por [data-tirar-cartao]')
      && !document.getElementById('painel').classList.contains('atualizando'), null, { timeout: 10000 });
    igual(await pagina.locator('.cartoes .indicador.ligado').count(), 0, 'o cartão desligou');
  });

  await teste('Trabalho: o "Mostrar" fica lembrado neste navegador — só o número (Etapa 90, F9)', async () => {
    const botao = pagina.locator('[data-mostrar]').first();
    if (!await botao.count()) return;
    const escolha = await botao.getAttribute('data-mostrar');
    await botao.click();
    await pagina.waitForTimeout(500);
    contem(await pagina.textContent('.fila-mostrar'), 'Sua escolha fica salva');
    igual(await pagina.evaluate(() => localStorage.getItem('pgo.trabalho.mostrar')), escolha === 'todos' ? null : escolha);
    await pagina.reload();
    await pagina.waitForSelector('.cartoes .indicador', { timeout: 10000 });
    await pagina.waitForTimeout(800);
    igual(await pagina.getAttribute('[data-mostrar="' + escolha + '"]', 'aria-pressed'), 'true', 'depois de recarregar, a mesma escolha');
    await pagina.evaluate(() => localStorage.removeItem('pgo.trabalho.mostrar'));
  });

  await teste('Trabalho: o cabeçalho da fila gruda embaixo da barra ao rolar (Etapa 90, V3)', async () => {
    await pagina.setViewportSize({ width: 1440, height: 520 });
    if (await pagina.locator('[data-mostrar="todos"]').count()) {
      await pagina.click('[data-mostrar="todos"]');
      await pagina.waitForTimeout(800);
    }
    // Rola até o cabeçalho natural da fila passar por baixo da barra.
    await pagina.evaluate(() => {
      const th = document.querySelector('.fila-do-trabalho thead th');
      window.scrollTo(0, th.getBoundingClientRect().top + window.scrollY - 20);
    });
    await pagina.waitForTimeout(300);
    const posicoes = await pagina.evaluate(() => ({
      th: Math.round(document.querySelector('.fila-do-trabalho thead th').getBoundingClientRect().top),
      barra: Math.round(document.getElementById('superior').getBoundingClientRect().bottom),
      deLado: document.documentElement.scrollWidth > window.innerWidth
    }));
    verdadeiro(Math.abs(posicoes.th - posicoes.barra) <= 1, 'o cabeçalho logo abaixo da barra: ' + JSON.stringify(posicoes));
    igual(posicoes.deLado, false, 'e a página não rola de lado');
    await pagina.evaluate(() => { window.scrollTo(0, 0); localStorage.removeItem('pgo.trabalho.mostrar'); });
    await pagina.setViewportSize({ width: 1440, height: 1000 });
  });

  console.log('\nA busca inteligente (Etapa 89)');

  await teste('Buscar Caso: "Pesquisar por" abre na avançada, procura só no campo escolhido e lembra a escolha (Etapa 89)', async () => {
    // Encerrado e antigo: não entra na frente da fila que os testes seguintes usam.
    vm.runInContext("inserirRegistro_('BASE_RET', { 'data de recepção do protocolo': new Date(2025, 0, 2), status: 'Pago',"
      + " analista: 'Ana Martins', 'nome do cliente': 'Teste Pesquisar Por', CPF: '321.654.987-00',"
      + " 'Código origem da proposta': '7', 'número da proposta': '0099887', 'e-mail': 'pesquisarpor@exemplo.invalid' })", contexto);
    await pagina.evaluate(() => {
      try { localStorage.removeItem('pgo-pesquisar-por'); } catch (e) { /* sem armazenamento */ }
      window.__servidorOriginal = window.__servidorOriginal || window.__servidorDoPGO;
      window.__pedidosDeBusca = [];
      window.__servidorDoPGO = function (nome, argumentos) {
        if (nome === 'buscarCasos') window.__pedidosDeBusca.push(argumentos[4]);
        return window.__servidorOriginal(nome, argumentos);
      };
    });
    const daRet = async () => pagina.evaluate(() => {
      const secao = Array.from(document.querySelectorAll('#resultado-da-busca .origem'))
        .find((s) => (s.querySelector('h3') || {}).textContent === 'RET');
      if (!secao) return null;
      return { etiqueta: (secao.querySelector('.origem-cabeca .busca-dica') || {}).textContent || '',
        quantos: Number((secao.querySelector('.quantos') || {}).textContent || 0) };
    });
    const procurar = async (termo) => {
      await pagina.fill('#termo-da-busca', termo);
      await pagina.click('#botao-buscar');
      await pagina.waitForFunction(() => !document.querySelector('#resultado-da-busca .carregando-campos'), null, { timeout: 15000 });
      await pagina.waitForTimeout(200);
    };

    await pagina.click('[data-tela="buscarCaso"]');
    await pagina.waitForSelector('#pesquisar-por', { timeout: 10000 });
    igual(await pagina.inputValue('#pesquisar-por'), 'avancada', 'abre na busca avançada (decisão do PO)');
    const rotulos = await pagina.$$eval('#pesquisar-por option', (es) => es.map((e) => e.textContent));
    igual(rotulos.join(' | '), 'Proposta | Nome do segurado | Apólice | CPF | Busca rápida — os quatro campos | Busca avançada — todas as colunas');
    contem(await pagina.textContent('#dica-da-pesquisa'), 'todas as colunas');

    await pagina.selectOption('#pesquisar-por', 'cpf');
    contem(await pagina.textContent('#dica-da-pesquisa'), 'BASE_RET');
    await procurar('32165498700');
    const porCpf = await daRet();
    verdadeiro(porCpf && porCpf.quantos === 1, 'o CPF sem pontuação acha o caso: ' + JSON.stringify(porCpf));
    igual(porCpf.etiqueta, 'CPF', 'a RET diz onde procurou');

    await procurar('pesquisarpor@exemplo.invalid');
    const peloEmail = await daRet();
    verdadeiro(!peloEmail || peloEmail.quantos === 0, 'por CPF, o e-mail não acha');
    await pagina.selectOption('#pesquisar-por', 'avancada');
    await procurar('pesquisarpor@exemplo.invalid');
    igual((await daRet()).quantos, 1, 'a busca avançada acha em qualquer coluna');

    await pagina.selectOption('#pesquisar-por', 'proposta');
    await procurar('7-0099887');
    igual((await daRet()).quantos, 1, 'a proposta com hífen, juntando as duas colunas');
    igual(JSON.stringify(await pagina.evaluate(() => window.__pedidosDeBusca)), JSON.stringify(['cpf', 'cpf', 'avancada', 'proposta']),
      'cada busca levou a opção escolhida ao servidor, uma vez');

    // A escolha fica lembrada neste navegador.
    await pagina.click('[data-tela="trabalho"]');
    await pagina.waitForTimeout(600);
    await pagina.click('[data-tela="buscarCaso"]');
    await pagina.waitForSelector('#pesquisar-por', { timeout: 10000 });
    igual(await pagina.inputValue('#pesquisar-por'), 'proposta', 'voltou na última escolha');
    const guardado = await pagina.evaluate(() => JSON.stringify(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));
    verdadeiro(guardado.indexOf('0099887') < 0 && guardado.indexOf('Teste Pesquisar Por') < 0, 'nenhum dado do caso no navegador');

    await pagina.selectOption('#pesquisar-por', 'avancada');
    await pagina.evaluate(() => { window.__servidorDoPGO = window.__servidorOriginal; });
    // Volta ao Trabalho, onde os testes seguintes começam.
    await pagina.click('[data-tela="trabalho"]');
    await pagina.waitForSelector('[data-sub-aba="1"]', { timeout: 10000 });
    await pagina.click('[data-sub-aba="1"]');
    await pagina.waitForTimeout(900);
  });

  await navegador.close();
  fs.rmSync(pasta, { recursive: true, force: true });
  if (process.env.PGO_GRAVAR_CHAMADAS) {
    fs.writeFileSync(process.env.PGO_GRAVAR_CHAMADAS, JSON.stringify(gravadas));
    console.log(gravadas.length + ' chamadas da tela gravadas em ' + process.env.PGO_GRAVAR_CHAMADAS);
  }

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
