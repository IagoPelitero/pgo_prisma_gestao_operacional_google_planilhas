/**
 * ============================================================================
 * PGO — testes-busca-na-planilha-toda.js · a busca do Trabalho sem a data (Etapa 69)
 * ============================================================================
 * Pedido do PO: "os filtros de texto da aba Trabalho ficam condicionados à data,
 * prejudicando a busca de todos os canais. Conseguimos permitir que o filtro
 * busque em toda a planilha? Somente o de texto precisa dessa correção."
 *
 * Decisões dele: com texto digitado, os cartões contam os mesmos casos da fila
 * (a planilha toda), e os outros filtros continuam valendo sobre ela.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, comoUsuario } = require('./ferramentas');

const DA_RET = 'data de recepção do protocolo';
const tela = (nome) => fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', nome + '.html'), 'utf8');

function diasAtras(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

/** Uma RET com um caso de hoje e casos antigos, bem fora do período da tela. */
function preparar() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  t.casos = (linhas) => t.chamar('inserirVariosRegistros_')('BASE_RET', linhas);
  t.casos([
    { [DA_RET]: diasAtras(200), analista: 'Ana Martins', status: 'Pendente',
      'nome do cliente': 'João Barba Branca', CPF: '11122233344' },
    { [DA_RET]: diasAtras(90), analista: 'Diego Castilho', status: 'Retido',
      'nome do cliente': 'Marco Fênix' },
    { [DA_RET]: diasAtras(0), analista: 'Ana Martins', status: 'Pendente',
      'nome do cliente': 'Portgas Ace' }
  ]);
  t.trabalho = (filtros) => t.chamar('resumoDoCanal')(t.ret.id, filtros || {});
  return t;
}

function rodarTestesDaBuscaNaPlanilhaToda() {
  console.log('\nEtapa 69: a busca do Trabalho na planilha toda');

  /* ----------------------------------------------------------------------- */
  secao('O texto procura em todas as datas');

  teste('o caso de 200 dias atrás aparece com a busca — sem ela, não', () => {
    const t = preparar();
    igual(t.trabalho().total, 1, 'sem busca, só o caso do período');
    const achado = t.trabalho({ busca: 'barba branca' });
    igual(achado.total, 1);
    igual(achado.buscaNaPlanilhaToda, true);
    igual(t.trabalho().buscaNaPlanilhaToda, false);
  });

  teste('sem acento, sem caixa e o documento com pontuação, como sempre', () => {
    const t = preparar();
    igual(t.trabalho({ busca: 'JOAO' }).total, 1, '"João" sem o acento');
    igual(t.trabalho({ busca: 'fenix' }).total, 1);
    igual(t.trabalho({ busca: '111.222.333-44' }).total, 1, 'o CPF com pontuação');
  });

  teste('a proposta inteira, que junta duas colunas, também acha um caso antigo', () => {
    const t = preparar();
    t.casos([{ [DA_RET]: diasAtras(150), status: 'Pendente', 'nome do cliente': 'Proposta antiga',
      'Código origem da proposta': '7', 'número da proposta': '0004406' }]);
    igual(t.trabalho({ busca: '7-0004406' }).total, 1);
  });

  teste('os cartões contam o que a busca achou, sem a seta do período anterior', () => {
    const t = preparar();
    const achado = t.trabalho({ busca: 'a' });   // "a" está nos três nomes
    igual(achado.total, 3);
    igual(achado.cartoes[0].valor, 3, 'o cartão Total conta os mesmos três da fila');
    verdadeiro(achado.cartoes.every((cartao) => cartao.variacao === null),
      'sem período, não há o que comparar');
  });

  teste('os outros filtros continuam valendo, sobre a planilha toda', () => {
    const t = preparar();
    const analista = t.trabalho().filtrosDisponiveis.find((f) => f.cabecalho.toLowerCase() === 'analista');
    const filtros = { busca: 'a', [analista.chave]: 'Ana Martins' };
    const achado = t.trabalho(filtros);
    igual(achado.total, 2, 'os dois da Ana, o antigo e o de hoje');
    igual(achado.totalNoPeriodo, 3, 'a busca achou três; o filtro deixou dois');
  });

  teste('o caso excluído não volta pela busca', () => {
    const t = preparar();
    t.casos([{ [DA_RET]: diasAtras(120), status: 'Pendente', 'nome do cliente': 'Barba Negra',
      _Visivel: 'NAO' }]);
    igual(t.trabalho({ busca: 'barba negra' }).total, 0);
  });

  teste('quem só vê os próprios casos continua vendo só os seus', () => {
    const t = preparar();
    const operacao = t.chamar('lerRegistros_')('CATALOGO')
      .find((item) => item.Tipo === 'NIVEL_ACESSO' && item.Nome === 'Operação');
    t.chamar('salvarUsuario')({ nome: 'Diego Castilho', email: 'diego@exemplo.com',
      nivelAcessoId: operacao.Id, canalId: '', ativo: true });
    comoUsuario(t.ambiente, 'diego@exemplo.com', () => {
      igual(t.trabalho({ busca: 'barba branca' }).total, 0, 'o caso é da Ana');
      igual(t.trabalho({ busca: 'fenix' }).total, 1, 'o dele, de 90 dias atrás');
    });
  });

  /* ----------------------------------------------------------------------- */
  secao('O custo e as proteções');

  teste('lê só as linhas que o localizador achou — não a planilha inteira', () => {
    const t = preparar();
    const muitas = [];
    for (let i = 0; i < 3000; i++) {
      muitas.push({ [DA_RET]: diasAtras(30 + (i % 300)), status: 'Pendente', 'nome do cliente': 'Outro ' + i });
    }
    t.casos(muitas);
    const largura = t.chamar('estruturaDaAba_')('BASE_RET').cabecalhos.length;
    t.ambiente.medidor.zerar();
    // Como a tela pede depois da primeira carga: sem o aviso de prazo (Etapa 70).
    igual(t.chamar('resumoDoCanal')(t.ret.id, { busca: 'barba branca' }, undefined, '', false).total, 1);
    const celulas = t.ambiente.medidor.retrato().celulasLidas;
    verdadeiro(celulas < 300 * largura, celulas + ' células (a base inteira: ' + 3003 * largura + ')');
  });

  teste('achou mais que o teto: vêm os mais recentes, e a tela avisa', () => {
    const t = preparar();
    t.chamar('gravarConfiguracao_')('OPERACAO.LINHAS_DO_PAINEL', '50');
    const muitas = [];
    for (let i = 0; i < 80; i++) {
      muitas.push({ [DA_RET]: diasAtras(100 - i), status: 'Pendente', 'nome do cliente': 'Chapéu de palha ' + i });
    }
    t.casos(muitas);
    const achado = t.trabalho({ busca: 'chapeu de palha' });
    igual(achado.total, 50);
    igual(achado.truncada, true);
    contem(JSON.stringify(achado.fila), 'Chapéu de palha 79', 'o mais recente veio');
    contem(tela('Trabalho'), "function avisoDaBusca() {\n    if (!resumo.truncada) return '';",
      'o aviso só aparece quando passou do teto');
    contem(tela('Trabalho'), 'A busca achou mais casos do que');
  });

  teste('com a busca rápida desligada, procura nas linhas mais recentes até o teto', () => {
    const t = preparar();
    // O localizador cego não acha nada: só a leitura das recentes acharia.
    t.ambiente.localizadorCego = true;
    try {
      igual(t.trabalho({ busca: 'barba branca' }).total, 0,
        'ligada, a busca confia no localizador (o diagnóstico é que confere ele)');
      t.chamar('gravarConfiguracao_')('OPERACAO.BUSCA_RAPIDA', 'NAO');
      igual(t.trabalho({ busca: 'barba branca' }).total, 1, 'desligada, lê as recentes — a base cabe no teto');
    } finally {
      t.ambiente.localizadorCego = false;
    }
  });

  teste('o localizador torto não traz caso errado: a conferência de sempre separa', () => {
    const t = preparar();
    t.ambiente.localizadorTorto = true;
    try {
      const achado = t.trabalho({ busca: 'barba branca' });
      verdadeiro(achado.total <= 1, 'nada além do caso certo');
      verdadeiro(achado.total === 0 || JSON.stringify(achado.fila).indexOf('Barba Branca') >= 0);
    } finally {
      t.ambiente.localizadorTorto = false;
    }
  });

  teste('a busca vazia volta ao período', () => {
    const t = preparar();
    igual(t.trabalho({ busca: '   ' }).total, 1);
    igual(t.trabalho({ busca: '   ' }).buscaNaPlanilhaToda, false);
  });

  /* ----------------------------------------------------------------------- */
  secao('A tela diz onde procurou');

  teste('a caixa dos filtros diz "planilha toda", e a fila vazia explica a busca', () => {
    const trabalho = tela('Trabalho');
    contem(trabalho, "'busca na planilha toda, de qualquer data'");
    contem(trabalho, 'A busca não achou nenhum caso com esse texto na planilha toda');
    contem(trabalho, 'casos na planilha toda, mas');
  });
}

module.exports = { rodarTestesDaBuscaNaPlanilhaToda };
