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
  await pagina.exposeFunction('__servidorDoPGO', (nome, argumentos) => {
    chamadasDoNavegador[nome] = (chamadasDoNavegador[nome] || 0) + 1;
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

  /* ------------------------------------------------------------ abertura -- */

  console.log('\nA abertura do sistema');

  await teste('a página já vem com o pacote de partida dentro', async () => {
    const pronto = await pagina.evaluate(() => window.PGO_PACOTE_DE_PARTIDA);
    verdadeiro(pronto && pronto.disponivel === true,
      'o doGet não injetou o pacote na página');
    verdadeiro(Array.isArray(pronto.menu) && pronto.menu.length > 0,
      'o pacote injetado veio sem menu');
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
    await pagina.waitForTimeout(1500);

    igual(naPlanilha('BASE_RET').length, antes + 1, 'linha nova na BASE_RET');

    // E a tela foi para o Trabalho — pedido do PO: "após gravar vá para a
    // tela trabalho". O recado de sucesso não é mais conferido aqui porque
    // ele não chega a existir: a tela inteira é trocada na mesma hora.
    const endereco = await pagina.evaluate(() => location.hash);
    igual(endereco, '#trabalho', 'gravou e levou para o Trabalho');
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
        if (tipo === 'date') await pagina.fill('#' + campo.id, '2026-09-14');
        else if (mascara === 'dinheiro') await pagina.fill('#' + campo.id, '1234,56');
        else if (mascara) await pagina.fill('#' + campo.id, '12345678901');
        else await pagina.fill('#' + campo.id, 'Retido de ponta a ponta');
      }
    }
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
