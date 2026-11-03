/**
 * ============================================================================
 * PGO — testes-aviso-de-prazo-sem-periodo.js · o aviso olha todos os abertos (Etapa 70)
 * ============================================================================
 * Achado da Etapa 69, decisão do PO: o aviso dos casos perto de vencer só
 * olhava o período da tela, e no começo do mês os casos do mês anterior que
 * continuavam abertos sumiam dele. Agora ele olha todos os casos abertos da
 * planilha, de qualquer data — com o alcance e os filtros da tela, como antes.
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

/**
 * Oito casos que entraram há 40 dias ou mais — fora de qualquer período de
 * abertura —, com o prazo começando em dias diferentes: algum cai no amarelo,
 * qualquer que seja o dia da semana de hoje.
 */
function preparar() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  t.vg = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_VG');
  t.casos = (linhas) => t.chamar('inserirVariosRegistros_')('BASE_RET', linhas);
  t.casos(Array.from({ length: 8 }, (_, i) => ({
    [DA_RET]: diasAtras(40 + i), status: 'Pendente', analista: i % 2 ? 'Diego Castilho' : 'Ana Martins',
    'nome do cliente': 'Antigo ' + i, 'Data da primeira mudança de status': diasAtras(i)
  })));
  t.trabalho = (filtros, comOAviso) => t.chamar('resumoDoCanal')(t.ret.id, filtros || {}, undefined, '', comOAviso);
  t.amarelosDe = (registros) => t.chamar('casosPertoDeVencer_')(registros, t.chamar('canalPeloId_')(t.ret.id))
    .map((r) => String(r.__id)).sort().join(',');
  return t;
}

function rodarTestesDoAvisoDePrazoSemPeriodo() {
  console.log('\nEtapa 70: o aviso de prazo olha todos os casos abertos');

  /* ----------------------------------------------------------------------- */
  secao('Todos os abertos, de qualquer data');

  teste('o caso aberto de 40 dias atrás, no amarelo, entra no aviso', () => {
    const t = preparar();
    const resumo = t.trabalho();
    igual(resumo.totalNoPeriodo, 0, 'nenhum deles está no período da tela');
    const esperados = t.amarelosDe(t.chamar('lerRegistros_')('BASE_RET'));
    verdadeiro(esperados.length > 0, 'algum caso no amarelo');
    igual(resumo.pertoDeVencer.map((c) => String(c.id)).sort().join(','), esperados);
    igual(resumo.quantosPertoDeVencer, esperados.split(',').length);
  });

  teste('lê os que ainda correm prazo: o Final fica de fora; o Retido, que tem condição, entra', () => {
    const t = preparar();
    // A condição de parada da RET: o Retido só encerra com a proposta transmitida.
    const linha = t.chamar('lerRegistros_')('SINALIZADORES').find((l) => String(l.CanalId) === String(t.ret.id));
    t.chamar('atualizarRegistro_')('SINALIZADORES', linha.__id, { StatusComCondicao: 'Retido',
      ColunaDaCondicao: 'Status proposta', ValoresDaCondicao: 'Transmitido',
      ColunaDaDataDaCondicao: 'Data do status proposta' });
    t.chamar('esquecerCacheDaConfiguracao_()');
    t.casos([
      { [DA_RET]: diasAtras(60), status: 'Não retido', 'nome do cliente': 'Encerrado' },
      { [DA_RET]: diasAtras(60), status: 'Retido', 'nome do cliente': 'Retido sem transmitir' },
      { [DA_RET]: diasAtras(60), status: '', 'nome do cliente': 'Sem status' },
      { [DA_RET]: diasAtras(60), status: 'Status que saiu do catálogo', 'nome do cliente': 'Fora do catálogo' }
    ]);
    const nomes = t.chamar('casosAbertosDaPlanilha_')(t.chamar('canalPeloId_')(t.ret.id))
      .map((r) => r['nome do cliente']);
    verdadeiro(nomes.indexOf('Encerrado') < 0, 'o Não retido é Final');
    ['Retido sem transmitir', 'Sem status', 'Fora do catálogo', 'Antigo 0'].forEach((nome) =>
      verdadeiro(nomes.indexOf(nome) >= 0, nome));
  });

  teste('o caso excluído não volta pelo aviso', () => {
    const t = preparar();
    t.casos([{ [DA_RET]: diasAtras(50), status: 'Pendente', 'nome do cliente': 'Excluído', _Visivel: 'NAO' }]);
    const nomes = t.chamar('casosAbertosDaPlanilha_')(t.chamar('canalPeloId_')(t.ret.id))
      .map((r) => r['nome do cliente']);
    verdadeiro(nomes.indexOf('Excluído') < 0);
  });

  teste('o alcance e os filtros da tela continuam valendo', () => {
    const t = preparar();
    const analista = t.trabalho().filtrosDisponiveis.find((f) => f.cabecalho.toLowerCase() === 'analista');
    const daAna = t.trabalho({ [analista.chave]: 'Ana Martins' });
    const ids = daAna.pertoDeVencer.map((c) => String(c.id));
    const daAnaNaBase = t.chamar('lerRegistros_')('BASE_RET').filter((r) => r.analista === 'Ana Martins');
    igual(ids.sort().join(','), t.amarelosDe(daAnaNaBase), 'só os da Ana');

    const operacao = t.chamar('lerRegistros_')('CATALOGO')
      .find((item) => item.Tipo === 'NIVEL_ACESSO' && item.Nome === 'Operação');
    t.chamar('salvarUsuario')({ nome: 'Diego Castilho', email: 'diego@exemplo.com',
      nivelAcessoId: operacao.Id, canalId: '', ativo: true });
    comoUsuario(t.ambiente, 'diego@exemplo.com', () => {
      const dele = t.trabalho();
      const doDiego = t.chamar('lerRegistros_')('BASE_RET').filter((r) => r.analista === 'Diego Castilho');
      igual(dele.pertoDeVencer.map((c) => String(c.id)).sort().join(','), t.amarelosDe(doDiego),
        'quem só vê os próprios casos é avisado só dos seus');
    });
  });

  /* ----------------------------------------------------------------------- */
  secao('O custo');

  teste('lê a coluna do status e as linhas abertas — não a planilha inteira', () => {
    const t = preparar();
    const fechados = [];
    for (let i = 0; i < 3000; i++) {
      fechados.push({ [DA_RET]: diasAtras(100 + (i % 200)), status: 'Não retido', 'nome do cliente': 'Fechado ' + i });
    }
    t.casos(fechados);
    const largura = t.chamar('estruturaDaAba_')('BASE_RET').cabecalhos.length;
    t.ambiente.medidor.zerar();
    t.chamar('casosAbertosDaPlanilha_')(t.chamar('canalPeloId_')(t.ret.id));
    const celulas = t.ambiente.medidor.retrato().celulasLidas;
    verdadeiro(celulas < 3008 + 200 * largura, celulas + ' células (a base inteira: ' + 3008 * largura + ')');
  });

  teste('sem o aviso pedido, a coluna do status nem é lida', () => {
    const t = preparar();
    igual(t.trabalho({}, false).pertoDeVencer.length, 0);
    igual(t.trabalho({}, false).quantosPertoDeVencer, 0);
    contem(tela('Trabalho'), "quantosNaFila === 'todos' ? 'todos' : '', avisarQuandoChegar)",
      'a tela só pede o aviso na primeira carga do canal');
  });

  teste('aberto espalhado em mais de 60 pedaços: ficam os mais recentes', () => {
    const t = preparar();
    const linhas = [];
    for (let i = 0; i < 70; i++) {
      for (let k = 0; k < 60; k++) linhas.push({ [DA_RET]: diasAtras(300), status: 'Não retido', 'nome do cliente': 'F' });
      linhas.push({ [DA_RET]: diasAtras(300), status: 'Pendente', 'nome do cliente': 'Aberto ' + i });
    }
    t.casos(linhas);
    const nomes = t.chamar('casosAbertosDaPlanilha_')(t.chamar('canalPeloId_')(t.ret.id))
      .map((r) => r['nome do cliente']);
    verdadeiro(nomes.indexOf('Aberto 69') >= 0, 'o mais recente fica');
    verdadeiro(nomes.indexOf('Antigo 0') < 0, 'o mais antigo, no primeiro pedaço, sai');
    verdadeiro(nomes.filter((nome) => /^Aberto/.test(nome)).length <= 60);
  });

  teste('canal sem sinalizador ligado não lê nada', () => {
    const t = preparar();
    t.chamar('inserirVariosRegistros_')('BASE_VG', [{ CNPJ: '12345678000199' }, { CNPJ: '98765432000188' }]);
    igual(t.chamar('lerRegistros_')('BASE_VG').length, 2, 'o VG tem casos');
    igual(t.chamar('casosAbertosDaPlanilha_')(t.chamar('canalPeloId_')(t.vg.id)).length, 0,
      'mas o prazo do VG está desligado: não há o que avisar');
  });
}

module.exports = { rodarTestesDoAvisoDePrazoSemPeriodo };
