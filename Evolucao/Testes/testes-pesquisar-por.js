/**
 * ============================================================================
 * PGO — testes-pesquisar-por.js · a busca inteligente (Etapa 89)
 * ============================================================================
 * Pedido do PO: "Pesquisar por: Proposta, Nome do segurado, Apólice, CPF,
 * Busca rápida — os quatro campos, Busca avançada — todas as colunas", só na
 * BASE_RET, "sem perder acesso a qualquer registro antigo".
 *
 * O que se prova aqui:
 *   1. a pesquisa dirigida acha EXATAMENTE o que a regra do campo manda —
 *      comparada com um gabarito que olha linha por linha da planilha —, pelos
 *      dois caminhos (lendo as colunas e pelo localizador), como administrador
 *      e como quem só vê os próprios casos;
 *   2. a busca avançada é a da 1.88;
 *   3. os registros nas linhas 10, 1.000, 10.000, 20.000 e 50.000 continuam
 *      sendo achados — na RET, na Mesa, no VG, no histórico e na base legada.
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario } = require('./ferramentas');
const { medidor } = require('./simulador');

const DA_RET = 'data de recepção do protocolo';
const MODOS = ['proposta', 'nome', 'apolice', 'cpf', 'rapida'];

/** As colunas de cada campo (o que o servidor declara) — o gabarito usa as mesmas. */
const CAMPOS = {
  proposta: ['Código origem da proposta', 'número da proposta'],
  nome: ['nome do cliente'],
  apolice: ['cod_sucursal', 'cod_ramo', 'Num_apolice'],
  cpf: ['CPF']
};

function instalada() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.canais = t.chamar('canaisVisiveis_()');
  t.ret = t.canais.find((c) => c.aba === 'BASE_RET');
  const operacao = t.chamar('lerRegistros_')('CATALOGO').find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
  t.chamar('salvarUsuario')({ nome: 'Diego Castilho', email: 'diego@exemplo.com', nivelAcessoId: operacao.Id, canalId: '', ativo: true });
  t.comoDiego = (f) => comoUsuario(t.ambiente, 'diego@exemplo.com', f);
  t.buscar = (termo, modo, extra) => t.chamar('buscarCasos')(termo, (extra && extra.onde) || [],
    !!(extra && extra.legado), !!(extra && extra.historico), modo);
  t.daRet = (resposta) => resposta.origens.find((o) => o.tipo === 'canal' && o.id === t.ret.id);
  t.ids = (origem) => origem.casos.map((c) => String(c.id)).sort();
  t.caminho = (qual) => t.chamar("(function(c){ RECC_CAMINHO_DA_PESQUISA_DIRIGIDA = c; })")(qual);
  return t;
}

/** Uma RET com os formatos difíceis: proposta e apólice partidas, CPF de três jeitos, acentos, ocultos. */
function retVariada() {
  const t = instalada();
  const nomes = ['João Ávila', 'Maria da Silva', 'JOSÉ SILVA', 'Cliente 2', 'Ana Paula Côrtes', 'Zé Ninguém'];
  const lote = [];
  for (let i = 0; i < 400; i++) {
    lote.push({
      [DA_RET]: new Date(2026, 9, 1 + (i % 28)), status: i % 3 ? 'Pendente' : 'Pago',
      analista: i % 2 ? 'Ana Martins' : 'Diego Castilho',
      'nome do cliente': nomes[i % nomes.length] + (i % 5 ? '' : ' ' + i),
      'Código origem da proposta': ['7', '5', ''][i % 3],
      'número da proposta': i % 7 === 0 ? '0000123' : String(1000000 + i).slice(1),
      cod_sucursal: i % 4 ? '12' : '', cod_ramo: i % 4 ? '1391' : '', Num_apolice: i % 11 === 0 ? '0000456' : String(5000000 + i).slice(1),
      CPF: i % 9 === 0 ? '123.456.789-01' : (i % 9 === 1 ? '12345678901' : String(30000000000 + i)),
      protocolo: 'RET-' + i, 'e-mail': 'c' + i + '@exemplo.invalid',
      _Visivel: i % 37 === 0 ? 'NAO' : ''
    });
  }
  t.chamar('inserirVariosRegistros_')('BASE_RET', lote);
  return t;
}

/** O gabarito: linha por linha, a regra do campo (a mesma comparação da busca avançada). */
function gabarito(t, termo, modo, soDoDiego) {
  const norm = t.contexto.normalizarParaComparar_;
  const dig = t.contexto.apenasDigitos_;
  const termoEhNumero = /^[\d\s.\-/]+$/.test(String(termo).trim());
  // As colunas que a fila e a busca do canal declaram comparam sempre; as outras de identificador, só com termo-número.
  const sempre = ['Código origem da proposta', 'número da proposta', 'nome do cliente', 'Num_apolice', 'CPF'];
  const campos = modo === 'rapida' ? Object.keys(CAMPOS) : [modo];
  const contem = (valor, ident) => {
    if (valor === '' || valor === null || valor === undefined) return false;
    if (ident) { const d = dig(termo); return !!d && dig(valor).indexOf(d) >= 0; }
    return norm(valor).indexOf(norm(termo)) >= 0;
  };
  return t.chamar('lerRegistros_')('BASE_RET').filter((r) => {
    if (soDoDiego && r.analista !== 'Diego Castilho') return false;
    return campos.some((campo) => {
      const colunas = CAMPOS[campo];
      const pedaco = colunas.some((c) => {
        const ident = c !== 'nome do cliente';
        if (ident && sempre.indexOf(c) < 0 && !termoEhNumero) return false;
        return contem(r[c], ident);
      });
      if (pedaco || colunas.length < 2) return pedaco;
      const inteira = colunas.map((c) => String(r[c] === undefined || r[c] === null ? '' : r[c])).filter((x) => x !== '').join('-');
      return contem(inteira, false);
    });
  }).map((r) => String(r.__id)).sort();
}

const TERMOS = ['7-0000123', '70000123', '0000123', '5-0000123', '12-1391-0000456', '1391-0000456', '0000456',
  '123.456.789-01', '12345678901', '456.789', 'joão', 'JOAO AVILA', 'ávila', 'silva', 'cliente 2', 'côrtes',
  'zzzz', 'abc 0000123', 'RET-15', '300000000', 'ze ninguem', '12-1391'];

function rodarTestesDePesquisarPor() {
  console.log('\nEtapa 89: Pesquisar por — a busca inteligente');

  /* ----------------------------------------------------------------------- */
  secao('O que a tela oferece');

  teste('as seis opções, na ordem do pedido, e a pesquisa dirigida só na RET', () => {
    const t = instalada();
    const opcoes = t.chamar('opcoesDaBusca()');
    igual(opcoes.pesquisarPor.map((o) => o.rotulo).join(' | '),
      'Proposta | Nome do segurado | Apólice | CPF | Busca rápida — os quatro campos | Busca avançada — todas as colunas');
    igual(opcoes.basesDaPesquisaDirigida.join(), 'BASE_RET');
  });

  teste('opção desconhecida é recusada; sem opção, é a busca avançada', () => {
    const t = retVariada();
    lanca(() => t.buscar('silva', 'qualquer'), 'Não conheço a opção');
    igual(JSON.stringify(t.buscar('silva')), JSON.stringify(t.buscar('silva', 'avancada')));
  });

  /* ----------------------------------------------------------------------- */
  secao('A pesquisa dirigida acha exatamente o que a regra do campo manda');

  const nomeDoCaminho = (c) => (c === 'colunas' ? 'das colunas' : 'do localizador');
  ['colunas', 'localizador'].forEach((caminho) => {
    teste('pelo caminho ' + nomeDoCaminho(caminho) + ': ' + TERMOS.length + ' termos × 5 opções, como administrador', () => {
      const t = retVariada();
      t.caminho(caminho);
      const diferentes = [];
      TERMOS.forEach((termo) => MODOS.forEach((modo) => {
        const esperado = gabarito(t, termo, modo, false);
        const origem = t.daRet(t.buscar(termo, modo));
        const achado = t.ids(origem);
        const certo = esperado.length > 100
          ? achado.length === 100 && achado.every((id) => esperado.indexOf(id) >= 0) && /mostra/.test(origem.aviso)
          : JSON.stringify(achado) === JSON.stringify(esperado);
        if (!certo) diferentes.push(modo + ' "' + termo + '": esperado ' + esperado.length + ', achou ' + achado.length);
      }));
      igual(diferentes.join('; '), '');
    });

    teste('pelo caminho ' + nomeDoCaminho(caminho) + ': quem só vê os próprios casos acha só os seus — e todos eles', () => {
      const t = retVariada();
      t.caminho(caminho);
      const diferentes = [];
      TERMOS.forEach((termo) => MODOS.forEach((modo) => {
        const esperado = gabarito(t, termo, modo, true);
        const achado = t.comoDiego(() => t.ids(t.daRet(t.buscar(termo, modo))));
        if (esperado.length <= 100 && JSON.stringify(achado) !== JSON.stringify(esperado)) {
          diferentes.push(modo + ' "' + termo + '": esperado ' + esperado.length + ', achou ' + achado.length);
        }
      }));
      igual(diferentes.join('; '), '');
    });
  });

  teste('a proposta com e sem hífen, e a apólice completa (decisão do PO)', () => {
    const t = retVariada();
    const umaProposta = gabarito(t, '7-0000123', 'proposta');
    verdadeiro(umaProposta.length > 0);
    igual(t.ids(t.daRet(t.buscar('70000123', 'proposta'))).join(), umaProposta.join(), 'sem hífen, os mesmos');
    verdadeiro(t.ids(t.daRet(t.buscar('12-1391-0000456', 'apolice'))).length > 0, 'a apólice completa acha');
    igual(t.daRet(t.buscar('12-1391-0000456', 'avancada')).casos.length, 0,
      'e a busca avançada continua como na 1.88: a apólice completa não é juntada lá');
  });

  teste('o que só existe em outra coluna: a dirigida não acha, a avançada acha', () => {
    const t = retVariada();
    // Sem dígito no termo: com dígito, o CPF e a proposta comparam pelos dígitos (a regra de sempre).
    igual(t.daRet(t.buscar('exemplo.invalid', 'rapida')).casos.length, 0, 'e-mail não é um dos quatro');
    verdadeiro(t.daRet(t.buscar('exemplo.invalid', 'avancada')).casos.length > 0);
  });

  teste('caso ocultado não volta; linha vazia não volta', () => {
    const t = retVariada();
    const oculto = t.chamar('lerRegistros_')('BASE_RET', { incluirOcultos: true }).find((r) => r._Visivel === 'NAO');
    const achados = t.ids(t.daRet(t.buscar(String(oculto.CPF), 'cpf')));
    verdadeiro(achados.indexOf(String(oculto.__id)) < 0);
  });

  teste('mais de 100: mostra os 100 mais recentes e diz quantos achou', () => {
    const t = retVariada();
    ['colunas', 'localizador'].forEach((caminho) => {
      t.caminho(caminho);
      const origem = t.daRet(t.buscar('1391', 'apolice'));
      igual(origem.casos.length, 100, caminho);
      contem(origem.aviso, 'mais recentes', caminho);
    });
  });

  teste('o localizador nunca procura na linha toda: só nas colunas do campo', () => {
    const t = retVariada();
    t.caminho('localizador');
    const faixas = [];
    const folha = t.chamar('planilhaAtiva_()').getSheetByName('BASE_RET');
    const original = Object.getPrototypeOf(folha.getRange(1, 1)).createTextFinder;
    Object.getPrototypeOf(folha.getRange(1, 1)).createTextFinder = function (e) {
      if (this.aba === folha) faixas.push(this.nColunas);
      return original.call(this, e);
    };
    try { t.buscar('joão', 'nome'); t.buscar('123.456.789-01', 'cpf'); } finally {
      Object.getPrototypeOf(folha.getRange(1, 1)).createTextFinder = original;
    }
    verdadeiro(faixas.length > 0 && faixas.every((n) => n === 1), 'faixas de 1 coluna: ' + faixas.join(','));
  });

  /* ----------------------------------------------------------------------- */
  secao('A busca avançada é a da 1.88');

  teste('as outras bases não recebem as colunas da RET: Mesa e VG procuram como sempre', () => {
    const t = retVariada();
    t.chamar('inserirVariosRegistros_')('BASE_MESA', [{ Status: 'Pendente', 'Nome do segurado': 'Segurado Raro', Analista: 'Ana Martins',
      'Documento (CPF)': '987.654.321-00' }]);
    MODOS.forEach((modo) => {
      const r = t.buscar('Segurado Raro', modo);
      igual(r.origens.find((o) => o.nome === 'Mesa Diamante').casos.length, 1, modo);
      verdadeiro(!r.origens.find((o) => o.nome === 'Mesa Diamante').pesquisouEm, 'sem a etiqueta da pesquisa dirigida');
    });
  });

  teste('a coluna do campo sumiu da planilha: a busca avançada responde, com aviso', () => {
    const t = retVariada();
    t.chamar('removerColuna_')('BASE_RET', 'cod_ramo');
    const origem = t.daRet(t.buscar('0000456', 'apolice'));
    contem(origem.aviso, 'cod_ramo');
    verdadeiro(origem.casos.length > 0, 'e acha pelas outras colunas');
  });

  /* ----------------------------------------------------------------------- */
  secao('Registros antigos: linhas 10, 1.000, 10.000, 20.000 e 50.000');

  const LINHAS = [10, 1000, 10000, 20000, 50000];
  // Com 5 dígitos: "Antiga 10" está contido em "Antiga 1000" — a regra é "contém".
  const rotulo = (n) => String(n).padStart(5, '0');
  // Sem dígito nenhum: no histórico e na base legada, CPF e documento comparam
  // pelos dígitos, e "00010" está dentro de "70000000010".
  const palavra = (n) => ['alfa', 'bravo', 'charlie', 'delta', 'echo'][LINHAS.indexOf(n)];

  /** Uma aba com 50 mil linhas, escrita direto na grade (como uma planilha grande), com os alvos nas linhas pedidas. */
  function encher(t, aba, linhaDoAlvo) {
    const folha = t.chamar('planilhaAtiva_()').getSheetByName(aba);
    const cab = t.chamar('estruturaDaAba_')(aba).cabecalhos;
    const N = 50000;
    const linhas = [];
    for (let i = 0; i < N; i++) {
      const linha = cab.map(() => '');
      const n = i + 2;
      const valores = linhaDoAlvo(n, i);
      Object.keys(valores).forEach((c) => { linha[cab.indexOf(c)] = valores[c]; });
      linhas.push(linha);
    }
    if (folha.getMaxRows() < N + 1) folha.insertRowsAfter(folha.getMaxRows(), N + 1 - folha.getMaxRows());
    folha.getRange(2, 1, N, cab.length).setValues(linhas);
    t.chamar('esquecerEstruturaLida_()');
  }

  function grande() {
    const t = instalada();
    encher(t, 'BASE_RET', (n, i) => {
      const alvo = LINHAS.indexOf(n) >= 0;
      return { id: String(i + 1), [DA_RET]: new Date(2025, 0, 1), status: 'Pago',
        analista: alvo && n !== 20000 ? 'Diego Castilho' : 'Ana Martins',
        'nome do cliente': alvo ? 'Segurada Antiga ' + rotulo(n) : 'Cliente ' + i,
        'Código origem da proposta': '7', 'número da proposta': alvo ? String(8800000 + n) : String(1000000 + i),
        cod_sucursal: '12', cod_ramo: '1391', Num_apolice: alvo ? String(7700000 + n) : String(2000000 + i),
        CPF: alvo ? String(99900000000 + n) : String(10000000000 + i), protocolo: 'P-' + i };
    });
    return t;
  }

  /** O termo de cada jeito de procurar, para o alvo da linha n. */
  const termos = (n) => ({
    proposta: '7-' + (8800000 + n), nome: 'segurada antiga ' + rotulo(n), apolice: '12-1391-' + (7700000 + n),
    cpf: String(99900000000 + n).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
    rapida: String(99900000000 + n), avancada: 'Segurada Antiga ' + rotulo(n)
  });

  ['', 'colunas', 'localizador'].forEach((caminho) => {
    teste('RET com 50 mil linhas' + (caminho ? ', caminho ' + (caminho === 'colunas' ? 'das colunas' : 'do localizador') : ', caminho escolhido pelo custo')
      + ': cada alvo achado de todos os jeitos, como administrador', () => {
      const t = grande();
      t.caminho(caminho);
      const faltou = [];
      LINHAS.forEach((n) => {
        const nomes = termos(n);
        Object.keys(nomes).forEach((modo) => {
          const casos = t.daRet(t.buscar(nomes[modo], modo)).casos;
          if (casos.length !== 1 || String(casos[0].id) !== String(n - 1)) faltou.push('linha ' + n + ' por ' + modo + ' (' + casos.length + ')');
        });
      });
      igual(faltou.join(', '), '');
    });
  });

  teste('RET com 50 mil linhas: quem só vê os próprios casos acha os seus antigos, e não o da colega', () => {
    const t = grande();
    const faltou = [];
    LINHAS.forEach((n) => {
      const nomes = termos(n);
      ['proposta', 'cpf', 'rapida', 'avancada'].forEach((modo) => {
        const quantos = t.comoDiego(() => t.daRet(t.buscar(nomes[modo], modo)).casos.length);
        if (quantos !== (n === 20000 ? 0 : 1)) faltou.push('linha ' + n + ' por ' + modo + ' (' + quantos + ')');
      });
    });
    igual(faltou.join(', '), '', 'a linha 20.000 é da Ana: o Diego não a vê');
  });

  teste('RET com 50 mil linhas: a pesquisa dirigida custa menos que a avançada (simulado)', () => {
    const t = grande();
    // Os dois medidos com o cache da configuração quente — o clique de todo dia.
    t.buscar(termos(10).cpf, 'cpf', { onde: [t.ret.id] }); t.buscar(termos(10).cpf, 'avancada', { onde: [t.ret.id] });
    const medir = (modo) => { medidor.zerar(); t.buscar(termos(10).cpf, modo, { onde: [t.ret.id] }); const m = medidor.retrato();
      return { celulas: m.celulasLidas, localizador: m.buscasRapidas, ms: m.chamadasNoTotal * 25 + m.celulasLidas * 0.053 + m.buscasRapidas * 1000 }; };
    const cpf = medir('cpf');
    const avancada = medir('avancada');
    verdadeiro(cpf.ms <= avancada.ms, 'cpf ' + Math.round(cpf.ms) + ' ms × avançada ' + Math.round(avancada.ms) + ' ms na régua do PO');
  });

  teste('Mesa e VG com 50 mil linhas: os alvos continuam achados, com qualquer opção', () => {
    const t = instalada();
    encher(t, 'BASE_MESA', (n, i) => ({ Status: 'Concluído', Analista: 'Ana Martins',
      'Nome do segurado': LINHAS.indexOf(n) >= 0 ? 'Mesa Antiga ' + rotulo(n) : 'Seg ' + i }));
    encher(t, 'BASE_VG', (n, i) => ({ Status: 'Pendente', Analista: 'Ana Martins',
      'TK/Assunto': LINHAS.indexOf(n) >= 0 ? 'VG Antigo ' + rotulo(n) : 'VG ' + i }));
    const faltou = [];
    LINHAS.forEach((n) => ['proposta', 'rapida', 'avancada'].forEach((modo) => {
      const r = t.buscar('Mesa Antiga ' + rotulo(n), modo);
      if (r.origens.find((o) => o.nome === 'Mesa Diamante').casos.length !== 1) faltou.push('Mesa ' + n + ' ' + modo);
      const v = t.buscar('VG Antigo ' + rotulo(n), modo);
      if (v.origens.find((o) => o.nome === 'VG').casos.length !== 1) faltou.push('VG ' + n + ' ' + modo);
    }));
    igual(faltou.join(', '), '');
  });

  teste('histórico arquivado com 50 mil linhas: os alvos continuam achados, com qualquer opção', () => {
    const t = instalada();
    const cab = t.chamar('estruturaDaAba_')('BASE_RET').cabecalhos;
    const linhas = [cab];
    for (let i = 0; i < 50000; i++) {
      const n = i + 2;
      const linha = cab.map(() => '');
      linha[cab.indexOf('id')] = String(900000 + i);
      linha[cab.indexOf('analista')] = 'Ana Martins';
      linha[cab.indexOf('nome do cliente')] = LINHAS.indexOf(n) >= 0 ? 'Arquivada ' + palavra(n) : 'Velho ' + i;
      linha[cab.indexOf('CPF')] = String(70000000000 + i);
      linhas.push(linha);
    }
    const id = t.ambiente.criarPlanilhaExterna({ HIST_BASE_RET: linhas });
    t.chamar('gravarConfiguracao_')(t.chamar('RECC_CHAVE_DO_HISTORICO_DA_BASE'), id);
    const faltou = [];
    LINHAS.forEach((n) => MODOS.concat('avancada').forEach((modo) => {
      const r = t.buscar('Arquivada ' + palavra(n), modo, { historico: true });
      const hist = r.origens.find((o) => o.tipo === 'historico' && o.id === t.ret.id);
      if (!hist || hist.casos.length !== 1) faltou.push(n + ' ' + modo);
    }));
    igual(faltou.join(', '), '');
  });

  teste('base legada com 50 mil linhas e outras colunas: os alvos continuam achados, com qualquer opção', () => {
    const t = instalada();
    const linhas = [['Protocolo antigo', 'Segurado', 'Documento', 'Situação']];
    for (let i = 0; i < 50000; i++) {
      const n = i + 2;
      linhas.push(['ANT-' + i, LINHAS.indexOf(n) >= 0 ? 'Legado Raro ' + palavra(n) : 'Pessoa ' + i, String(60000000000 + i), 'Encerrado']);
    }
    const id = t.ambiente.criarPlanilhaExterna('Base antiga', linhas);
    t.chamar('salvarConfiguracaoDoLegado')({ planilhaId: id, aba: '', rotulo: 'PGO antigo' });
    const faltou = [];
    LINHAS.forEach((n) => MODOS.concat('avancada').forEach((modo) => {
      const r = t.buscar('Legado Raro ' + palavra(n), modo, { legado: true });
      const legado = r.origens.find((o) => o.tipo === 'legado');
      if (!legado || legado.casos.length !== 1 || legado.casos[0].id !== 'legado-' + n) faltou.push(n + ' ' + modo);
    }));
    igual(faltou.join(', '), '');
  });
}

module.exports = { rodarTestesDePesquisarPor };
