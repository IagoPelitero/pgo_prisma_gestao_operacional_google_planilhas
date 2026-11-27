/**
 * ============================================================================
 * PGO — testes-desempenho-do-trabalho-e-da-busca.js · Etapa 88 (B3, B2, B4)
 * ============================================================================
 * B3: a régua de custo do Trabalho pela planilha do PO (a ida vale ~1.000
 * células, e não 25 mil) e a memória da carga (o aviso de prazo não relê a
 * coluna do status nem as linhas que a fila acabou de ler). Os resultados têm
 * de ser OS MESMOS; só o caminho até eles muda.
 *
 * B2: o Buscar Caso não repete nas colunas de texto a expressão que a linha
 * toda acabou de procurar sem achar. A prova é comparativa: comparar-busca.js
 * rodou a bateria (82 buscas) na 1.87 e guardou em medicoes/busca-1.87.json;
 * aqui a mesma bateria roda na versão de agora e tem de dar o mesmo.
 *
 * B4: o panorama de Configurações reaproveita o resumo da estrutura por até 5
 * minutos; o que o Prisma muda na estrutura o esquece na hora, e o botão
 * "Aplicar mudanças da planilha agora" também.
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro, lanca, comoUsuario } = require('./ferramentas');
const { medidor } = require('./simulador');

const DA_RET = 'data de recepção do protocolo';

function retComCasos(quantos, abertos) {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  const ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  const fechados = ['Retido', 'Não retido', 'Pago'];
  const lote = [];
  for (let i = 0; i < quantos; i++) {
    const d = new Date(2026, 10, 18); d.setDate(d.getDate() - Math.floor((quantos - i) / 10));
    lote.push({ [DA_RET]: d, 'nome do cliente': 'Cliente ' + i, analista: i % 3 ? 'Ana Martins' : 'Diego Castilho',
      status: i >= quantos - abertos ? ['Pendente', 'Não trabalhado'][i % 2] : fechados[i % 3], protocolo: 'RET-' + i });
  }
  t.chamar('inserirVariosRegistros_')('BASE_RET', lote);
  t.ret = ret;
  t.novaExecucao = () => t.chamar('(function(){ estruturasJaLidas = {}; registrosJaLidos = {};'
    + ' tiposDeclaradosJaLidos = null; cacheDaConfiguracaoLido = null; })()');
  return t;
}

/** O que a tela usa da resposta — sem o que é medida de tempo. */
function oQueImporta(r) {
  return JSON.stringify({ total: r.total, sub: r.subAbas, cartoes: r.cartoes, filtros: r.filtrosDisponiveis,
    fila: r.fila, perto: r.pertoDeVencer, quantosPerto: r.quantosPertoDeVencer, truncada: r.truncada });
}

function rodarTestesDeDesempenhoDoTrabalhoEDaBusca() {
  console.log('\nEtapa 88: desempenho do Trabalho e da busca, com os mesmos resultados');

  /* ----------------------------------------------------------------------- */
  secao('B3: a aba dos concluídos não lê mais a base inteira');

  teste('a aba 2 lê bem menos que a RET inteira, e mostra o mesmo que a leitura das linhas inteiras', () => {
    const t = retComCasos(2000, 150);
    const largura = t.chamar('estruturaDaAba_')('BASE_RET').cabecalhos.length;
    t.novaExecucao(); medidor.zerar();
    const agora = t.chamar('resumoDoCanal')(t.ret.id, {}, null, '', false, 2);
    const celulas = medidor.retrato().celulasLidas;
    verdadeiro(celulas < 2000 * largura * 0.4, celulas + ' células, contra ' + (2000 * largura) + ' da base inteira');
    t.chamar("RECC_LEITURA_DA_SUB_ABA = 'linhas'");
    let inteira;
    try { inteira = t.chamar('resumoDoCanal')(t.ret.id, {}, null, '', false, 2); }
    finally { t.chamar("RECC_LEITURA_DA_SUB_ABA = ''"); }
    const semFila = (r) => JSON.stringify({ total: r.total, sub: r.subAbas, cartoes: r.cartoes, filtros: r.filtrosDisponiveis });
    igual(semFila(agora), semFila(inteira), 'números, cartões e filtros iguais');
    igual(JSON.stringify(agora.fila.map((c) => c.id)), JSON.stringify(inteira.fila.slice(0, agora.fila.length).map((c) => c.id)),
      'a fila, na mesma ordem');
  });

  /* ----------------------------------------------------------------------- */
  secao('B3: a memória da carga');

  teste('com o aviso de prazo, a coluna do status e as linhas abertas são lidas uma vez só', () => {
    // A planilha no tamanho da do PO (a de medir-telas.js): ali o aviso relia
    // as mesmas 249 linhas abertas que a fila acabava de ler.
    const { t, ret } = require('./medir-telas').montar();
    t.ret = ret;
    t.novaExecucao = () => t.chamar('(function(){ estruturasJaLidas = {}; registrosJaLidos = {};'
      + ' tiposDeclaradosJaLidos = null; cacheDaConfiguracaoLido = null; })()');
    const aba = t.chamar('planilhaAtiva_()').getSheetByName('BASE_RET');
    const proto = Object.getPrototypeOf(aba.getRange(1, 1));
    const original = proto.getValues;
    // Conta cada LINHA inteira e cada COLUNA inteira lidas, e não cada faixa: o
    // aviso lê um pedaço das linhas da fila, e o pedaço repetido também conta.
    const linhas = {}; const colunas = {};
    proto.getValues = function () {
      if (this.aba.nome === 'BASE_RET' && this.linha > 1) {
        if (this.nColunas === 1) colunas[this.coluna] = (colunas[this.coluna] || 0) + 1;
        else for (let l = this.linha; l < this.linha + this.nLinhas; l++) linhas[l] = (linhas[l] || 0) + 1;
      }
      return original.apply(this, arguments);
    };
    try {
      t.novaExecucao();
      t.chamar('resumoDoCanal')(t.ret.id, {}, null, '', true, 1);
    } finally { proto.getValues = original; }
    const linhasRepetidas = Object.keys(linhas).filter((l) => linhas[l] > 1);
    const colunasRepetidas = Object.keys(colunas).filter((c) => colunas[c] > 1);
    verdadeiro(Object.keys(linhas).length > 0, 'leu linhas');
    igual(colunasRepetidas.length, 0, 'nenhuma coluna lida duas vezes: ' + colunasRepetidas.join(', '));
    igual(linhasRepetidas.length, 0, 'nenhuma linha lida duas vezes (' + linhasRepetidas.length + ')');
  });

  teste('a resposta é a mesma, com e sem a memória da carga', () => {
    const t = retComCasos(1500, 120);
    [[1, true], [2, false], [1, false]].forEach(([aba, aviso]) => {
      t.novaExecucao();
      const com = oQueImporta(t.chamar('resumoDoCanal')(t.ret.id, {}, null, '', aviso, aba));
      t.novaExecucao();
      const sem = oQueImporta(t.chamar('resumoDoCanalSemRelogio_')(t.ret.id, {}, null, '', aviso, aba));
      igual(com, sem, 'aba ' + aba + (aviso ? ', com o aviso' : ''));
    });
  });

  teste('a memória some no fim da carga — até quando ela dá erro', () => {
    const t = retComCasos(50, 10);
    t.chamar('resumoDoCanal')(t.ret.id, {}, null, '', true, 1);
    igual(t.chamar('RECC_MEMORIA_DA_CARGA'), null, 'depois da carga');
    let deuErro = false;
    try { t.chamar('resumoDoCanal')('canal-que-nao-existe', {}, null, '', true, 1); } catch (e) { deuErro = true; }
    verdadeiro(deuErro, 'o canal que não existe dá erro');
    igual(t.chamar('RECC_MEMORIA_DA_CARGA'), null, 'e a memória sumiu mesmo assim');
  });

  teste('gravar na aba no meio da carga esquece o que estava na memória', () => {
    const t = retComCasos(30, 10);
    const lida = t.contexto.comMemoriaDaCarga_(function () {
      const antes = t.chamar('lerColunaInteira_')('BASE_RET', 'status').slice();
      const um = t.chamar('lerRegistros_')('BASE_RET', { ultimas: 1 })[0];
      t.chamar('atualizarRegistro_')('BASE_RET', um.__id, { status: 'Retido' });
      const depois = t.chamar('lerColunaInteira_')('BASE_RET', 'status');
      const linhas = t.chamar('lerLinhasEspecificas_')('BASE_RET', [um.__linha]);
      return { antes: antes[antes.length - 1], depois: depois[depois.length - 1], linha: String(linhas[0].status) };
    }, []);
    verdadeiro(lida.antes !== 'Retido', 'antes era outro');
    igual(lida.depois, 'Retido', 'a coluna lida de novo vem da planilha');
    igual(lida.linha, 'Retido', 'e a linha também');
  });

  teste('fora da carga do Trabalho, nada é memorizado', () => {
    const t = retComCasos(30, 10);
    igual(t.chamar('RECC_MEMORIA_DA_CARGA'), null);
    medidor.zerar();
    t.chamar('lerColunaInteira_')('BASE_RET', 'status');
    t.chamar('lerColunaInteira_')('BASE_RET', 'status');
    igual(medidor.retrato().idasParaLer, 2, 'duas leituras, duas idas — como antes');
  });

  /* ----------------------------------------------------------------------- */
  secao('B3 — a escolha da leitura nunca sai mais cara que o caminho da 1.87');

  /** Na régua do PO: 25 ms por chamada, 53 µs por célula. */
  const custoNoPO = (m) => m.chamadasNoTotal * 25 + m.celulasLidas * 0.053;

  /** RET larga (52 colunas), com os abertos ESPALHADOS pela base. */
  function retEspalhada(quantos, deCadaQuantosUmAberto, estreita) {
    const t = carregar('primeiro.adm@exemplo.com');
    t.chamar('instalarRECC()');
    t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    if (!estreita) for (let i = 0; i < 12; i++) t.chamar('adicionarColuna_')('BASE_RET', 'Da operação ' + i, 'texto');
    const lote = [];
    for (let i = 0; i < quantos; i++) {
      // As datas se repetem a cada 30 linhas: os mais antigos — os primeiros da
      // fila — ficam a 30 linhas um do outro, pela base toda (como no aviso).
      const d = new Date(2026, 10, 18); d.setDate(d.getDate() - (i % 30));
      lote.push({ [DA_RET]: d, status: i % deCadaQuantosUmAberto ? 'Retido' : ['Pendente', 'Não trabalhado'][i % 2],
        'nome do cliente': 'Cliente ' + i, analista: 'Ana Martins' });
    }
    t.chamar('inserirVariosRegistros_')('BASE_RET', lote);
    return t;
  }

  function lerOsDoisCaminhos(t, aba) {
    const medir = (modo) => {
      t.chamar('(function(m){ RECC_LEITURA_DA_SUB_ABA = m; })')(modo);
      try {
        t.chamar('resumoDoCanal')(t.ret.id, {}, null, '', false, aba);   // a configuração já lida
        medidor.zerar();
        t.chamar('resumoDoCanal')(t.ret.id, {}, null, '', false, aba);
        return custoNoPO(medidor.retrato());
      } finally { t.chamar("RECC_LEITURA_DA_SUB_ABA = ''"); }
    };
    return { escolhida: medir(''), linhas: medir('linhas') };
  }

  [[600, 2, 1], [600, 2, 2], [300, 1, 1], [2000, 9, 1], [2000, 9, 2], [120, 3, 1], [300, 1, 1, true], [600, 2, 1, true]]
    .forEach(([quantos, cada, aba, estreita]) => {
    teste(quantos + ' casos, 1 aberto a cada ' + cada + ', aba ' + aba + (estreita ? ', base estreita' : '')
      + ': a escolhida custa no máximo o caminho da 1.87', () => {
      const t = retEspalhada(quantos, cada, estreita);
      const r = lerOsDoisCaminhos(t, aba);
      verdadeiro(r.escolhida <= r.linhas + 1, Math.round(r.escolhida) + ' ms escolhida, ' + Math.round(r.linhas) + ' ms pelas linhas');
    });
  });

  teste('completar as 20 da fila não lê o meio da base: o buraco é o da régua', () => {
    const t = retEspalhada(600, 2);
    const estrutura = t.chamar('estruturaDaAba_')('BASE_RET');
    igual(t.chamar('buracoDaRegua_')(estrutura), Math.floor(1000 / estrutura.cabecalhos.length));
    t.chamar("RECC_LEITURA_DA_SUB_ABA = 'leve'");
    try {
      t.chamar('resumoDoCanal')(t.ret.id, {}, null, '', false, 1);
      medidor.zerar();
      const r = t.chamar('resumoDoCanal')(t.ret.id, {}, null, '', false, 1);
      igual(r.fila.length, 20);
      verdadeiro(medidor.retrato().celulasLidas < 600 * estrutura.cabecalhos.length / 3,
        medidor.retrato().celulasLidas + ' células — antes, um bloco de quase a base inteira');
    } finally { t.chamar("RECC_LEITURA_DA_SUB_ABA = ''"); }
  });

  /* ----------------------------------------------------------------------- */
  secao('B2 — o Buscar Caso dá os mesmos resultados da 1.87, com menos localizador');

  const path = require('path');
  const { procurarTudo } = require('./comparar-busca');
  const da187 = require('../medicoes/busca-1.87.json');
  let agora = null;
  const comparar = () => { if (!agora) agora = procurarTudo(path.join(__dirname, '..', '..')); return agora; };

  teste('as 82 buscas (adm e Operação) voltam idênticas às da 1.87: origens, casos, avisos e erros', () => {
    const r = comparar();
    const diferentes = Object.keys(da187).filter((k) => JSON.stringify([da187[k].erro, da187[k].resultado, da187[k].total])
      !== JSON.stringify([r[k].erro, r[k].resultado, r[k].total]));
    igual(Object.keys(r).length, Object.keys(da187).length, 'a mesma bateria');
    igual(diferentes.join(' | '), '', 'nenhuma busca com resultado diferente');
  });

  teste('nenhuma busca ficou mais cara: nem mais localizador, nem mais células', () => {
    const r = comparar();
    // Etapa 95: a CANAIS ganhou 3 colunas (o aviso no Chat). Quem lê a CANAIS com o
    // cache frio lê 3 × (cabeçalho + 3 canais) = 12 células a mais — e só isso.
    const daCanais = 12;
    const piores = Object.keys(da187).filter((k) => r[k].localizador > da187[k].localizador
      || r[k].celulas > da187[k].celulas + daCanais);
    igual(piores.join(' | '), '', 'o identificador continua procurando (sem ele, a busca leria a coluna inteira)');
  });

  teste('o termo que não existe: só a linha toda de cada canal (11 → 3 localizadores)', () => {
    const r = comparar();
    igual(da187['adm · zzzznaoexiste'].localizador, 11);
    igual(r['adm · zzzznaoexiste'].localizador, 3);
  });

  teste('a busca que a linha toda acha não muda de caminho', () => {
    const r = comparar();
    igual(r['adm · RET-0007'].total, 1);
    igual(r['adm · cpf 123.456.789-01'].total, 1, 'o identificador acha com letras no meio, como antes');
    verdadeiro(r['adm · RET-0007'].localizador < da187['adm · RET-0007'].localizador,
      'Mesa e VG não repetem nas colunas de texto o que a linha toda não achou');
  });

  /* ----------------------------------------------------------------------- */
  secao('B4 — o resumo da estrutura, reaproveitado por até 5 minutos');

  const CHAVE = 'pgo-estrutura-1|resumo';
  function configuracoes() {
    const t = carregar('primeiro.adm@exemplo.com');
    t.chamar('instalarRECC()');
    t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    t.novaExecucao = () => t.chamar('(function(){ estruturasJaLidas = {}; registrosJaLidos = {};'
      + ' tiposDeclaradosJaLidos = null; cacheDaConfiguracaoLido = null; })()');
    t.abrir = () => { t.novaExecucao(); medidor.zerar(); const r = t.chamar('resumoDasConfiguracoes')();
      r.chamadas = medidor.retrato().chamadasNoTotal; return r; };
    /** Mexe no cabeçalho como o PO mexeria à mão: direto na aba, sem passar pelo Prisma. */
    t.cabecalhoAMao = (aba, cabecalho, novo) => {
      const folha = t.chamar('planilhaAtiva_()').getSheetByName(aba);
      const linha1 = folha.getRange(1, 1, 1, folha.getLastColumn()).getValues()[0];
      folha.getRange(1, linha1.indexOf(cabecalho) + 1).setValue(novo);
    };
    return t;
  }

  teste('a segunda abertura não confere a estrutura de novo, e mostra o mesmo', () => {
    const t = configuracoes();
    t.ambiente.cache.limpar();
    const primeira = t.abrir();
    const segunda = t.abrir();
    igual(JSON.stringify(segunda.estrutura), JSON.stringify(primeira.estrutura));
    verdadeiro(segunda.chamadas * 3 < primeira.chamadas, segunda.chamadas + ' chamadas, contra ' + primeira.chamadas);
    igual(JSON.stringify(segunda.secoes), JSON.stringify(primeira.secoes), 'o resto do panorama, igual');
  });

  teste('o resumo reaproveitado é o mesmo do laudo lido na hora', () => {
    const t = configuracoes();
    t.chamar('adicionarColuna_')('BASE_RET', 'Coluna da operação', 'texto');
    t.abrir();
    const doLaudo = t.chamar('resumoDoLaudo_')(t.chamar('conferirEstrutura_()'));
    igual(JSON.stringify(t.abrir().estrutura), JSON.stringify(doLaudo));
  });

  teste('passados 5 minutos, confere de novo', () => {
    const t = configuracoes();
    t.abrir();
    t.cabecalhoAMao('BASE_MESA', 'Status', 'Status mexido');
    igual(t.abrir().estrutura.emOrdem, true, 'dentro dos 5 minutos, vale o resumo guardado');
    t.ambiente.cache.adiantar(301);
    const depois = t.abrir();
    igual(depois.estrutura.emOrdem, false, 'vencido o prazo, a faixa aparece');
    verdadeiro(depois.estrutura.abasComProblema.some((a) => a.aba === 'BASE_MESA'));
  });

  teste('mudança à mão: o botão "Aplicar mudanças da planilha agora" vale na hora', () => {
    const t = configuracoes();
    t.abrir();
    t.cabecalhoAMao('BASE_MESA', 'Status', 'Status mexido');
    t.chamar('aplicarMudancasDaPlanilha')();
    igual(t.abrir().estrutura.emOrdem, false);
  });

  teste('abrir a seção Estrutura lê na hora e renova o resumo', () => {
    const t = configuracoes();
    t.abrir();
    t.cabecalhoAMao('BASE_MESA', 'Status', 'Status mexido');
    igual(t.chamar('conferirEstruturaDaPlanilha')().ok, false, 'a seção nunca usa o guardado');
    igual(t.abrir().estrutura.emOrdem, false, 'e o panorama já vê o laudo novo');
  });

  teste('o que o Prisma muda na estrutura esquece o resumo na hora', () => {
    const t = configuracoes();
    const igualAoDaHora = (oQue) => {
      const panorama = t.abrir().estrutura;
      const daHora = t.chamar('resumoDoLaudo_')(t.chamar('conferirEstrutura_()'));
      igual(JSON.stringify(panorama), JSON.stringify(daHora), oQue + ': o panorama é o laudo de agora');
    };
    t.abrir();
    t.chamar('adicionarColuna_')('BASE_RET', 'Coluna nova da operação', 'texto');
    igual(t.ambiente.cache.ler(CHAVE), null, 'criar coluna esquece');
    igualAoDaHora('criar coluna');
    t.abrir();
    t.chamar('removerColuna_')('BASE_RET', 'Coluna nova da operação');
    igual(t.ambiente.cache.ler(CHAVE), null, 'apagar coluna esquece');
    igualAoDaHora('apagar coluna');
    t.abrir();
    t.chamar('criarAbaDoContrato_')(t.chamar('planilhaAtiva_()'), t.chamar('esquemaDaAba_')('ERROS'));
    igual(t.ambiente.cache.ler(CHAVE), null, 'criar ou acertar aba do contrato esquece');
    t.cabecalhoAMao('BASE_MESA', 'Status', 'Status mexido');
    t.chamar('atualizarPGO()');
    igualAoDaHora('o atualizarPGO');
  });

  teste('mexer nos campos ou nos canais esquece; gravar um caso, não', () => {
    const t = configuracoes();
    t.abrir();
    verdadeiro(t.ambiente.cache.ler(CHAVE) !== null);
    t.chamar('inserirRegistro_')('BASE_RET', { [DA_RET]: new Date(), status: 'Pendente', 'nome do cliente': 'Caso novo' });
    verdadeiro(t.ambiente.cache.ler(CHAVE) !== null, 'o caso novo não muda a estrutura');
    const campo = t.chamar('lerRegistros_')('CAMPOS')[0];
    t.chamar('atualizarRegistro_')('CAMPOS', campo.__id, { Ordem: Number(campo.Ordem) || 0 });
    igual(t.ambiente.cache.ler(CHAVE), null, 'gravar em CAMPOS esquece');
    t.abrir();
    t.chamar('atualizarRegistro_')('CANAIS', t.ret.id, { Nome: t.ret.nome });
    igual(t.ambiente.cache.ler(CHAVE), null, 'gravar em CANAIS esquece');
  });

  teste('sem o cache, ou com o valor estragado, confere como antes', () => {
    const t = configuracoes();
    t.ambiente.cache.gravar(CHAVE, '{ isto não é json', 300);
    const r = t.abrir();
    igual(r.estrutura.emOrdem, true);
    verdadeiro(r.chamadas > 40, 'conferiu a estrutura: ' + r.chamadas + ' chamadas');
    t.ambiente.cache.gravar(CHAVE, JSON.stringify({ outraCoisa: 1 }), 300);
    verdadeiro(t.abrir().chamadas > 40, 'valor de outro formato também é ignorado');
  });

  teste('a permissão vem antes do cache: a Operação continua recusada', () => {
    const t = configuracoes();
    t.abrir();
    const operacao = t.chamar('lerRegistros_')('CATALOGO').find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id;
    t.chamar('salvarUsuario')({ nome: 'Diego', email: 'diego@exemplo.com', nivelAcessoId: operacao, canalId: t.ret.id, ativo: true });
    comoUsuario(t.ambiente, 'diego@exemplo.com', () => { lanca(() => t.chamar('resumoDasConfiguracoes')()); });
  });

  teste('"Medir a velocidade" continua funcionando, com o resumo guardado ou não', () => {
    const t = configuracoes();
    t.abrir();
    const r = t.chamar('raioXDaVelocidade')();
    verdadeiro(r.abas.length > 10, r.abas.length + ' abas medidas');
    t.ambiente.cache.limpar();
    verdadeiro(t.chamar('raioXDaVelocidade')().abas.length > 10);
  });

  teste('toda função que muda aba ou cabeçalho do contrato avisa que a estrutura mudou', () => {
    const fs = require('fs');
    const pasta = path.join(__dirname, '..', '..', 'Back-End');
    const mexe = /insertSheet|deleteSheet|\.setName\(|insertColumns|deleteColumns|getRange\(1, [^)]*\)\.set(Value|Values)/;
    // Fora do contrato: a planilha do arquivo, as abas ANALISE_* e a PRODUTOS antiga.
    const foraDoContrato = ['copiarParaOArquivo_', 'escreverAbaDeAnalise_', 'ajustarGrade_', 'apagarAAbaDeProdutos_'];
    const caladas = [];
    fs.readdirSync(pasta).filter((f) => f.endsWith('.gs')).forEach((arquivo) => {
      fs.readFileSync(path.join(pasta, arquivo), 'utf8').split(/\n(?=function )/).forEach((trecho) => {
        if (!mexe.test(trecho)) return;
        const nome = (trecho.match(/^function (\w+)/) || [])[1];
        if (foraDoContrato.indexOf(nome) >= 0) return;
        if (!/esquecerEstruturaLida_\(\)|esquecerResumoDaEstrutura_\(\)/.test(trecho)) caladas.push(arquivo + ' ' + nome);
      });
    });
    igual(caladas.join(', '), '');
  });
}

module.exports = { rodarTestesDeDesempenhoDoTrabalhoEDaBusca };
