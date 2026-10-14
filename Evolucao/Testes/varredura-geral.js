/**
 * ============================================================================
 * PGO — varredura-geral.js · o sistema inteiro, atrás do que quebra
 * ============================================================================
 *   node Evolucao/Testes/varredura-geral.js            (tudo)
 *   node Evolucao/Testes/varredura-geral.js resumoDoCanal buscarCasos
 *                                                      (só estas funções)
 *
 * Pedido do PO: "consegue gerar um teste em todo o sistema para capturar bugs,
 * erros e quebras?"
 *
 * A suíte (`rodar.js`) confere o que cada pedido prometeu, com os valores que
 * a tela manda. Esta varredura faz a outra pergunta: e quando chega o que
 * NINGUÉM esperava? Ela chama CADA função pública do servidor — as que a tela
 * alcança por `google.script.run` — e, para cada uma:
 *
 *   1. AS ENTRADAS. Um chamado com valores plausíveis (o canal certo, um caso
 *      que existe) e, um parâmetro de cada vez, o inesperado: vazio, nulo,
 *      número no lugar de texto, objeto no lugar de lista, texto de 5.000
 *      caracteres, `<script>`, fórmula de planilha, Id que não existe.
 *
 *   2. QUEM CHAMA. Os quatro níveis de fábrica (Administrador, Coordenação,
 *      Operação e Consulta) e alguém SEM cadastro.
 *
 *   3. A BASE. Cada canal com casos de verdade e com linhas sujas: data que
 *      não existe, texto em coluna de número, fórmula, linha em branco, texto
 *      enorme, emoji.
 *
 * O que conta como DEFEITO:
 *
 *   ERRO INTERNO   o servidor estourou com um erro do JavaScript — "Cannot
 *                  read properties of undefined", "x is not a function". A
 *                  pessoa leria isso na tela, e é sinal de caminho que o
 *                  código não previu. Recusar é certo; recusar com erro cru,
 *                  não.
 *   NÃO SERIALIZA  a resposta não atravessa até a tela (ciclo, função).
 *   RESPOSTA GRANDE  mais de 500 KB — a lição do achado 95: o que volta
 *                  também pesa, e a tela desiste nos 40 segundos.
 *   SEM CADASTRO   quem não está cadastrado recebeu dado em vez de recusa.
 *
 * Recusa com recado em português ("Informe o canal", "Você não tem permissão")
 * é o comportamento CERTO, e não entra no placar de defeitos.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, comoUsuario } = require('./ferramentas');

const PASTA_DO_SERVIDOR = path.join(__dirname, '..', '..', 'Back-End');

/**
 * As chamadas que a tela fez de verdade, guardadas no repositório — matéria-
 * prima da passada "a fundo". Regravar (quando a tela mudar o que manda):
 *   PGO_GRAVAR_CHAMADAS=/tmp/a.json node Evolucao/Testes/ponta-a-ponta.js
 *   PGO_GRAVAR_CHAMADAS=/tmp/b.json node Evolucao/Testes/gerar-previa.js
 * e juntar as duas listas neste arquivo. Os dados são os inventados dos testes.
 */
const CHAMADAS_GRAVADAS = path.join(__dirname, 'chamadas-gravadas.json');

/* -------------------------------------------------- as funções públicas --- */

/**
 * As funções que a tela alcança: as de topo, sem o "_" do fim (convenção do
 * projeto para as privadas, que `google.script.run` não chama), com os nomes
 * dos parâmetros — é por eles que a varredura escolhe o valor plausível.
 */
function funcoesPublicas() {
  const lista = [];
  fs.readdirSync(PASTA_DO_SERVIDOR).filter((n) => n.endsWith('.gs')).forEach((arquivo) => {
    const fonte = fs.readFileSync(path.join(PASTA_DO_SERVIDOR, arquivo), 'utf8');
    const re = /^function ([A-Za-z0-9]*[A-Za-z0-9])\s*\(([^)]*)\)/gm;
    let m;
    while ((m = re.exec(fonte))) {
      if (m[1].endsWith('_')) continue;
      lista.push({
        nome: m[1],
        arquivo: arquivo,
        parametros: m[2].split(',').map((p) => p.trim()).filter(Boolean)
      });
    }
  });
  return lista;
}

/**
 * Funções que não são chamadas pela tela: montam a página (doGet, incluir) ou
 * rodam no editor do Apps Script e em acionadores de tempo. Elas entram numa
 * passada própria, só como administrador — chamá-las como "Operação" testaria
 * uma porta que não existe.
 */
const DO_EDITOR = ['doGet', 'incluir', 'instalarRECC', 'atualizarPGO', 'migrarParaCanais',
  'normalizarBase', 'verificarEstruturaRECC', 'diagnosticoRECC',
  'arquivarAuditoriaAgendada', 'atualizarAnalisesAgendadas'];

/**
 * Quem pode responder a alguém SEM cadastro, e por quê. Fora desta lista,
 * responder dado a quem não está cadastrado é defeito.
 */
const ABERTAS_A_QUEM_NAO_TEM_CADASTRO = {
  pacoteDePartida: 'é ela que monta a tela de "sem acesso"',
  definirSenhaDeAdministrador: 'só funciona enquanto não há senha nenhuma (primeira instalação)',
  liberarComSenha: 'pede a senha'
};

/* ----------------------------------------------------- o mundo de teste --- */

const ANALISTAS = ['Ana Martins', 'Bruno Dias'];

function diasAtras(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Um sistema instalado, com usuários de cada nível, casos e linhas sujas. */
function mundo() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.chamar('definirSenhaDeAdministrador')('segredo123', '');
  t.chamar('liberarComSenha')('segredo123');

  const canais = t.chamar('canaisVisiveis_()');
  t.ret = canais.find((c) => c.aba === 'BASE_RET');
  t.mesa = canais.find((c) => c.aba === 'BASE_MESA');
  t.vg = canais.find((c) => c.aba === 'BASE_VG');

  const niveis = t.chamar('lerRegistros_("CATALOGO")')
    .filter((i) => String(i.Tipo) === 'NIVEL_ACESSO');
  t.emails = {};
  t.chamar('inserirVariosRegistros_')('USUARIOS', niveis.map((n) => {
    const email = 'nivel.' + n.Nome.toLowerCase().normalize('NFD')
      .replace(/[^a-z]/g, '') + '@exemplo.com';
    t.emails[n.Nome] = email;
    return { Nome: ANALISTAS[0] + ' ' + n.Nome, Email: email, NivelAcessoId: n.Id,
      Ativo: true, CanalId: t.ret.id };
  }));

  // Casos de verdade, pela porta da tela.
  t.casos = {};
  t.casos.ret = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Cliente da varredura',
    susep: 'RET00J' }).id;
  t.casos.mesa = t.chamar('cadastrarCaso')(t.mesa.id, { nomedosegurado: 'Segurado da varredura',
    status: 'Em andamento' }).id;
  try {
    t.casos.vg = t.chamar('cadastrarCaso')(t.vg.id, { cnpj: '12345678000190' }).id;
  } catch (erro) {
    t.casos.vg = '';
  }

  // Linhas sujas, pela porta da importação (grava sem validar).
  const sujas = (extra) => [
    {},
    Object.assign({ status: 'Status que não existe', analista: '=HYPERLINK("x")' }, extra.a),
    Object.assign({ status: 'Pendente', analista: ANALISTAS[1] }, extra.b),
    Object.assign({ status: '   ', analista: 'x'.repeat(5000) }, extra.c)
  ];
  t.chamar('inserirVariosRegistros_')('BASE_RET', sujas({
    a: { 'data de recepção do protocolo': '31/02/2026', 'valor do prêmio': 'mil reais',
      'nome do cliente': '😀 <b>negrito</b>' },
    b: { 'data de recepção do protocolo': diasAtras(2), 'Data da primeira mudança de status': 'ontem' },
    c: { 'data de recepção do protocolo': 'abc', 'Mudanças de status': 'muitas' }
  }));
  // CÓDIGO NA BASE: um nome que, se a tela o escrevesse como HTML, rodaria e
  // marcaria `window.__xss`. A varredura de cliques confere que isso nunca
  // acontece — a tela tem de escrever o texto, e não interpretá-lo.
  const XSS = '<img src=x onerror="window.__xss=(window.__xss||0)+1">';
  t.chamar('inserirVariosRegistros_')('BASE_RET', [{ 'data de recepção do protocolo': diasAtras(0),
    status: 'Pendente', analista: ANALISTAS[0], 'nome do cliente': XSS, protocolo: XSS,
    SUSEP: XSS }]);
  t.chamar('inserirVariosRegistros_')('CORRETORAS', [{ SUSEP: 'XSS01', Corretora: XSS,
    Segmento: 'Diamante', Consultor: XSS }]);
  t.chamar('inserirVariosRegistros_')('SUSEP_BLOQUEADAS', [{ SUSEP: 'XSS02', NomeCorretora: XSS }]);
  t.chamar('inserirVariosRegistros_')('USUARIOS', [{ Nome: XSS, Email: 'xss@exemplo.com',
    NivelAcessoId: niveis[0].Id, Ativo: true }]);
  t.chamar('inserirVariosRegistros_')('BASE_MESA', sujas({
    a: { 'Data de entrada': '99/99/9999', Status: '???' },
    b: { 'Data de entrada': diasAtras(1), Status: 'Em andamento', 'Data em andamento': 'agora' },
    c: { 'Data de entrada': '', Status: '' }
  }));
  t.chamar('inserirVariosRegistros_')('BASE_MESA', [{ 'Data de entrada': diasAtras(0),
    Status: 'Em andamento', Analista: ANALISTAS[0], 'Nome do segurado': XSS, Assunto: XSS }]);
  return t;
}

/* ------------------------------------------------------------- as entradas */

const TEXTO_GRANDE = 'x'.repeat(5000);
// Só o que pode ATRAVESSAR o google.script.run: ele leva os argumentos como
// JSON, então objeto sem protótipo, NaN, Date e função nunca chegam ao servidor
// — testá-los seria testar uma porta que não existe.
const ESTRANHOS = [null, undefined, '', 0, -1, 'abc', TEXTO_GRANDE, '<script>alert(1)</script>',
  '=IMPORTRANGE("x","y")', {}, [], true, '0000099999'];

/**
 * O valor plausível de cada parâmetro, pelo nome — e a lista do inesperado
 * que a varredura tenta no lugar dele.
 */
function valoresDoParametro(nome, t) {
  const n = nome.toLowerCase();
  const plausivel = (() => {
    if (/canal/.test(n)) return t.ret.id;
    if (/caso/.test(n)) return t.casos.ret;
    if (/filtro/.test(n)) return {};
    if (/periodo/.test(n)) return 30;
    if (/tela/.test(n)) return 'trabalho';
    if (/quantos|limite|dias|ultimas/.test(n)) return 10;
    if (/versao/.test(n)) return '';
    if (/colunassuas/.test(n)) return {};
    if (/onde|colunas|ids$|lista$/.test(n)) return [];
    if (/valores|dados|campos|cartoes|componentes|lista|ids|fonte/.test(n)) return {};
    if (/senha/.test(n)) return 'segredo123';
    if (/susep/.test(n)) return 'RET00J';
    if (/termo|procurar|texto|nome|titulo|chave|tipo|ponto|situacao|segmento|tema/.test(n)) return 'Pendente';
    return '';
  })();
  return { plausivel: plausivel, estranhos: ESTRANHOS };
}

/** As chamadas a fazer: a plausível e, um parâmetro de cada vez, o estranho. */
function chamadasDe(funcao, t) {
  const valores = funcao.parametros.map((p) => valoresDoParametro(p, t));
  const base = valores.map((v) => v.plausivel);
  const lista = [{ rotulo: 'plausível', args: base, plausivel: true },
    { rotulo: 'sem argumento nenhum', args: [] }];
  valores.forEach((v, i) => {
    v.estranhos.forEach((estranho) => {
      const args = base.slice();
      args[i] = estranho;
      lista.push({ rotulo: funcao.parametros[i] + ' = ' + descrever(estranho), args: args });
    });
  });
  return lista;
}

function descrever(valor) {
  if (valor === TEXTO_GRANDE) return 'texto de 5.000 caracteres';
  if (valor === undefined) return 'undefined';
  return JSON.stringify(valor);
}

/* ------------------------------------------------------------- o veredito */

const ERRO_DO_JAVASCRIPT = /Cannot read propert|Cannot set propert|is not a function|is not defined|is not iterable|Cannot convert|undefined is not|null is not|Maximum call stack|Invalid array length|Unexpected token|Converting circular|reading '|of undefined|of null/;

function ehErroInterno(erro) {
  const nome = erro && erro.constructor && erro.constructor.name;
  const mensagem = String(erro && erro.message || erro);
  return ['TypeError', 'ReferenceError', 'RangeError', 'SyntaxError'].indexOf(nome) >= 0
    || ERRO_DO_JAVASCRIPT.test(mensagem);
}

/** Roda uma chamada e diz o que aconteceu. */
function rodarChamada(t, funcao, chamada, email) {
  const executar = () => {
    const alvo = t.chamar('(' + funcao.nome + ')');
    return alvo.apply(null, chamada.args);
  };
  try {
    const valor = email ? comoUsuario(t.ambiente, email, executar) : executar();
    let json;
    try {
      json = JSON.stringify(valor === undefined ? null : valor);
    } catch (erro) {
      return { tipo: 'NÃO SERIALIZA', detalhe: erro.message };
    }
    return { tipo: 'respondeu', tamanho: json ? json.length : 0 };
  } catch (erro) {
    if (ehErroInterno(erro)) {
      const pilha = String(erro.stack || '').split('\n')
        .filter((l) => /\.gs:\d+/.test(l)).slice(0, 2).map((l) => l.trim()).join(' ← ');
      return { tipo: 'ERRO INTERNO', detalhe: String(erro.message).slice(0, 160), pilha: pilha };
    }
    return { tipo: 'recusou', detalhe: String(erro.message).slice(0, 120) };
  }
}

/* --------------------------------------------------------------- a corrida */

/**
 * A primeira passada. `opcoes.quieto` não imprime e devolve os defeitos — é
 * como a suíte (testes-varredura-geral.js) a chama; `opcoes.so` limita quem
 * chama ('Administrador (liberado)', 'sem cadastro'…).
 */
function varrerPrimeira(soEstas, opcoes) {
  opcoes = opcoes || {};
  const falar = opcoes.quieto ? () => {} : (texto) => process.stdout.write(texto + '\n');
  const funcoes = funcoesPublicas().filter((f) => !soEstas.length || soEstas.indexOf(f.nome) >= 0);
  const quem = [
    { rotulo: 'Administrador (liberado)', email: null },
    { rotulo: 'Coordenação', nivel: 'Coordenação' },
    { rotulo: 'Operação', nivel: 'Operação' },
    { rotulo: 'Consulta', nivel: 'Consulta' },
    { rotulo: 'sem cadastro', email: 'ninguem.cadastrado@exemplo.com' }
  ].filter((p) => !opcoes.so || opcoes.so.indexOf(p.rotulo) >= 0);

  const defeitos = [];
  let chamadas = 0;
  const inicio = Date.now();

  falar('\nVARREDURA GERAL — ' + funcoes.length + ' funções públicas, '
    + quem.length + ' quem chama, base com linhas sujas');
  falar('-'.repeat(94));

  funcoes.forEach((funcao) => {
    const doEditor = DO_EDITOR.indexOf(funcao.nome) >= 0;
    const pessoas = doEditor ? quem.slice(0, 1).filter((p) => p.email === null) : quem;
    let daFuncao = 0;

    pessoas.forEach((pessoa) => {
      const t = mundo();
      const email = pessoa.nivel ? t.emails[pessoa.nivel] : pessoa.email;
      const lista = chamadasDe(funcao, t);
      lista.forEach((chamada) => {
        chamadas++;
        const r = rodarChamada(t, funcao, chamada, email);
        const registrar = (tipo, detalhe) => {
          daFuncao++;
          defeitos.push({ funcao: funcao.nome, arquivo: funcao.arquivo, quem: pessoa.rotulo,
            chamada: chamada.rotulo, tipo: tipo, detalhe: detalhe, pilha: r.pilha || '',
            comValorPlausivel: chamada.plausivel === true });
        };
        if (r.tipo === 'ERRO INTERNO' || r.tipo === 'NÃO SERIALIZA') registrar(r.tipo, r.detalhe);
        if (r.tipo === 'respondeu' && r.tamanho > 500 * 1024) {
          registrar('RESPOSTA GRANDE', Math.round(r.tamanho / 1024) + ' KB');
        }
        if (r.tipo === 'respondeu' && pessoa.rotulo === 'sem cadastro'
          && !ABERTAS_A_QUEM_NAO_TEM_CADASTRO[funcao.nome] && chamada.plausivel) {
          registrar('SEM CADASTRO', 'respondeu a quem não está cadastrado');
        }
      });
    });
    falar((daFuncao ? '✗ ' : '· ') + funcao.nome + (daFuncao ? ' (' + daFuncao + ')' : ''));
  });
  return { defeitos: defeitos, chamadas: chamadas, inicio: inicio };
}

function rodar(soEstas) {
  const r = varrerPrimeira(soEstas);
  return imprimirDefeitos(r.defeitos, r.chamadas, r.inicio);
}

function imprimirDefeitos(defeitos, chamadas, inicio) {
  // Agrupa: o mesmo defeito em vinte variações é um defeito só.
  const grupos = {};
  defeitos.forEach((d) => {
    const chave = d.funcao + '|' + d.tipo + '|' + d.detalhe.replace(/\d+/g, 'N');
    if (!grupos[chave]) grupos[chave] = Object.assign({ vezes: 0, quemTodos: {}, exemplos: [] }, d);
    grupos[chave].vezes++;
    grupos[chave].quemTodos[d.quem] = true;
    if (grupos[chave].exemplos.length < 3) grupos[chave].exemplos.push(d.chamada);
    if (d.comValorPlausivel) grupos[chave].comValorPlausivel = true;
  });

  const lista = Object.keys(grupos).map((k) => grupos[k]);
  console.log('\n' + '='.repeat(94));
  console.log(chamadas + ' chamadas em ' + ((Date.now() - inicio) / 1000).toFixed(0) + ' s — '
    + lista.length + ' defeito(s) distinto(s)');
  console.log('='.repeat(94));
  lista.forEach((g, i) => {
    console.log('\n' + (i + 1) + '. [' + g.tipo + (g.comValorPlausivel ? ' · COM VALOR PLAUSÍVEL' : '')
      + '] ' + g.funcao + ' (' + g.arquivo + ') — '
      + g.vezes + ' chamada(s)');
    console.log('   ' + g.detalhe);
    if (g.pilha) console.log('   onde: ' + g.pilha);
    console.log('   quem: ' + Object.keys(g.quemTodos).join(', '));
    console.log('   exemplos: ' + g.exemplos.join(' | '));
  });
  return lista.length;
}

/* ----------------------------------------- a segunda passada: a fundo --- */

/**
 * A primeira passada estraga o argumento INTEIRO — e a maioria das funções
 * recusa logo na porta ("Informe o canal"), sem chegar ao miolo. Esta pega as
 * chamadas que a tela fez DE VERDADE (gravadas pelo ponta a ponta e pela
 * prévia, com PGO_GRAVAR_CHAMADAS) e estraga UM CAMPO de cada vez, deixando o
 * resto válido. É o que alcança o código de dentro: o formulário completo com
 * só a data errada, o cartão com a coluna em branco, o filtro com um número no
 * lugar do texto.
 */
const ESTRAGOS = [
  ['tirado', undefined], ['nulo', null], ['vazio', ''], ['texto de 5.000', TEXTO_GRANDE],
  ['número', 12345], ['objeto', {}], ['lista', []], ['script', '<script>x</script>'],
  ['fórmula', '=1+1'], ['verdadeiro', true]
];

/** Os caminhos até cada parte dos argumentos: [0, 'dados', 'nome']… */
function caminhos(valor, prefixo, saida, profundidade) {
  saida = saida || [];
  prefixo = prefixo || [];
  profundidade = profundidade || 0;
  if (prefixo.length) saida.push(prefixo);   // o objeto inteiro também se estraga
  if (profundidade > 3 || valor === null || typeof valor !== 'object') return saida;
  const chaves = Array.isArray(valor) ? valor.map((_, i) => i).slice(0, 3) : Object.keys(valor);
  chaves.forEach((chave) => caminhos(valor[chave], prefixo.concat([chave]), saida, profundidade + 1));
  return saida;
}

function comEstrago(args, caminho, estrago) {
  const copia = JSON.parse(JSON.stringify(args));
  let alvo = copia;
  for (let i = 0; i < caminho.length - 1; i++) alvo = alvo[caminho[i]];
  const ultima = caminho[caminho.length - 1];
  if (estrago === undefined && !Array.isArray(alvo)) delete alvo[ultima];
  else alvo[ultima] = estrago;
  return copia;
}

function varrerAFundo(arquivos, soEstas, opcoes) {
  opcoes = opcoes || {};
  const falar = opcoes.quieto ? () => {} : (texto) => process.stdout.write(texto + '\n');
  const publicas = {};
  funcoesPublicas().forEach((f) => { publicas[f.nome] = f; });
  const vistas = {};
  const porFuncao = {};
  arquivos.forEach((arquivo) => {
    JSON.parse(fs.readFileSync(arquivo, 'utf8')).forEach((g) => {
      if (!publicas[g.nome] || DO_EDITOR.indexOf(g.nome) >= 0) return;
      if (soEstas.length && soEstas.indexOf(g.nome) < 0) return;
      const chave = g.nome + JSON.stringify(g.args);
      if (vistas[chave]) return;
      vistas[chave] = true;
      porFuncao[g.nome] = porFuncao[g.nome] || [];
      if (porFuncao[g.nome].length < (opcoes.porFuncao || 6)) porFuncao[g.nome].push(g.args);
    });
  });

  const defeitos = [];
  let chamadas = 0;
  const inicio = Date.now();
  const nomes = Object.keys(porFuncao).sort();
  falar('\nA FUNDO — ' + nomes.length + ' funções, com as chamadas que a tela fez de verdade');
  falar('-'.repeat(94));

  nomes.forEach((nome) => {
    const funcao = publicas[nome];
    let daFuncao = 0;
    porFuncao[nome].forEach((args) => {
      const t = mundo();
      const lista = [{ rotulo: 'como a tela mandou', args: args, plausivel: true }];
      caminhos(args).forEach((caminho) => {
        ESTRAGOS.forEach((par) => {
          lista.push({ rotulo: caminho.join('.') + ' ' + par[0], args: comEstrago(args, caminho, par[1]) });
        });
      });
      lista.forEach((chamada) => {
        chamadas++;
        const r = rodarChamada(t, funcao, chamada, null);
        if (r.tipo === 'ERRO INTERNO' || r.tipo === 'NÃO SERIALIZA'
          || (r.tipo === 'respondeu' && r.tamanho > 500 * 1024)) {
          daFuncao++;
          defeitos.push({ funcao: nome, arquivo: funcao.arquivo, quem: 'Administrador',
            chamada: chamada.rotulo, tipo: r.tipo === 'respondeu' ? 'RESPOSTA GRANDE' : r.tipo,
            detalhe: r.tipo === 'respondeu' ? Math.round(r.tamanho / 1024) + ' KB' : r.detalhe,
            pilha: r.pilha || '', comValorPlausivel: chamada.plausivel === true });
        }
      });
    });
    falar((daFuncao ? '✗ ' : '· ') + nome + (daFuncao ? ' (' + daFuncao + ')' : ''));
  });
  return { defeitos: defeitos, chamadas: chamadas, inicio: inicio, funcoes: nomes.length };
}

function rodarAFundo(arquivos, soEstas) {
  const r = varrerAFundo(arquivos, soEstas);
  return imprimirDefeitos(r.defeitos, r.chamadas, r.inicio);
}

/* ------------------------------------------ a terceira passada: volume --- */

/**
 * O TAMANHO de cada resposta de leitura, com a base cheia — 5.000 casos na RET
 * e na Mesa, 900 corretoras. É a lição dos itens 95 e 97: o que volta também
 * pesa, e acima de uns poucos MB o Apps Script não atravessa a resposta até a
 * tela antes dos 40 segundos. Usa as chamadas gravadas, com os argumentos de
 * verdade; o limite é 500 KB.
 */
const LEITURAS = /^(listar|opcoes|configuracao|resumo|produtividade|minha|buscar|tabela|detalhar|exportar|formulario|casoPara|situacoes|pacote|conferirEstrutura|diagnosticoDo|titulos|origem|lotes|consultar|conferirProposta)/;

function varrerVolume(arquivos, opcoes) {
  opcoes = opcoes || {};
  const falar = opcoes.quieto ? () => {} : (texto) => process.stdout.write(texto + '\n');
  const inicio = Date.now();
  const t = mundo();
  const quantos = opcoes.casos || 5000;
  const ret = [];
  const mesa = [];
  const corretoras = [];
  for (let i = 0; i < quantos; i++) {
    ret.push({ 'data de recepção do protocolo': diasAtras(i % 30), analista: ANALISTAS[0],
      SUSEP: 'RET' + (i % 900), 'nome do cliente': 'Cliente ' + i,
      status: ['Pendente', 'Retido', 'Não trabalhado'][i % 3], protocolo: 'RET-' + i,
      'Data da primeira mudança de status': i % 2 ? diasAtras(i % 6) : '', canal: 'URA' });
    mesa.push({ 'Data de entrada': diasAtras(i % 30), Analista: ANALISTAS[0], Status: 'Em andamento',
      'Nome do segurado': 'Segurado ' + i, SUSEP: 'RET' + (i % 900),
      Corretora: 'Corretora ' + (i % 900), Assunto: 'Assunto ' + (i % 40),
      'Data em andamento': diasAtras(i % 4) });
  }
  for (let i = 0; i < 900; i++) {
    corretoras.push({ SUSEP: 'RET' + i, Corretora: 'Corretora ' + i, Segmento: 'Diamante' });
  }
  t.chamar('inserirVariosRegistros_')('BASE_RET', ret);
  t.chamar('inserirVariosRegistros_')('BASE_MESA', mesa);
  t.chamar('inserirVariosRegistros_')('CORRETORAS', corretoras);

  const publicas = {};
  funcoesPublicas().forEach((f) => { publicas[f.nome] = f; });
  const vistas = {};
  const defeitos = [];
  let chamadas = 0;
  let maior = { tamanho: 0 };
  falar('\nVOLUME — ' + quantos + ' casos na RET e na Mesa; limite de 500 KB por resposta');
  falar('-'.repeat(94));
  arquivos.forEach((arquivo) => {
    JSON.parse(fs.readFileSync(arquivo, 'utf8')).forEach((g) => {
      if (!publicas[g.nome] || !LEITURAS.test(g.nome)) return;
      // "todos" é a escolha consciente de trazer tudo — fica fora do limite.
      if (g.args.indexOf('todos') >= 0) return;
      const chave = g.nome + JSON.stringify(g.args);
      if (vistas[chave]) return;
      vistas[chave] = true;
      chamadas++;
      const r = rodarChamada(t, publicas[g.nome], { rotulo: 'com a base cheia', args: g.args }, null);
      if (r.tipo === 'respondeu' && r.tamanho > maior.tamanho) maior = { tamanho: r.tamanho, nome: g.nome };
      if (r.tipo === 'respondeu' && r.tamanho > 500 * 1024) {
        defeitos.push({ funcao: g.nome, arquivo: publicas[g.nome].arquivo, quem: 'Administrador',
          chamada: JSON.stringify(g.args).slice(0, 80), tipo: 'RESPOSTA GRANDE',
          detalhe: Math.round(r.tamanho / 1024) + ' KB', pilha: '' });
      }
      if (r.tipo === 'ERRO INTERNO') {
        defeitos.push({ funcao: g.nome, arquivo: publicas[g.nome].arquivo, quem: 'Administrador',
          chamada: 'com a base cheia', tipo: r.tipo, detalhe: r.detalhe, pilha: r.pilha || '' });
      }
    });
  });
  falar('a maior resposta: ' + Math.round(maior.tamanho / 1024) + ' KB (' + (maior.nome || '—') + ')');
  return { defeitos: defeitos, chamadas: chamadas, inicio: inicio, maior: maior };
}

/* -------------------------------------------------------------- a largada */

if (require.main === module) {
  const argumentos = process.argv.slice(2);
  const gravadas = argumentos.filter((a) => a.endsWith('.json'));
  if (!gravadas.length && fs.existsSync(CHAMADAS_GRAVADAS)) gravadas.push(CHAMADAS_GRAVADAS);
  const pedidas = argumentos.filter((a) => !a.endsWith('.json'));
  let distintos = rodar(pedidas);
  if (gravadas.length) distintos += rodarAFundo(gravadas, pedidas);
  if (gravadas.length && !pedidas.length) {
    const v = varrerVolume(gravadas);
    distintos += imprimirDefeitos(v.defeitos, v.chamadas, v.inicio);
  }
  process.exitCode = distintos ? 1 : 0;
}

module.exports = { funcoesPublicas, ehErroInterno, mundo, rodarChamada, chamadasDe,
  varrerPrimeira, varrerAFundo, varrerVolume, CHAMADAS_GRAVADAS };
