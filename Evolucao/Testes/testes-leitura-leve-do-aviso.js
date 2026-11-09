/**
 * ============================================================================
 * PGO — testes-leitura-leve-do-aviso.js · o aviso lê só as colunas do prazo (Etapa 74)
 * ============================================================================
 * A abertura do Trabalho lia todas as linhas abertas, inteiras, para o aviso
 * de prazo — na RET do PO (3 mil casos, 50 colunas), dois terços de tudo o que
 * a abertura lia. Agora lê primeiro só as colunas de que o sinalizador precisa,
 * e inteiras só as linhas que podem estar no amarelo. O que o aviso mostra não
 * pode mudar em nada: é o que estes testes conferem.
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro, comoUsuario } = require('./ferramentas');

const DA_RET = 'data de recepção do protocolo';
const PRIMEIRA_MUDANCA = 'Data da primeira mudança de status';

function atras(dias, hora) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora === undefined ? 10 : hora, 0, 0, 0);
  return d;
}

/**
 * Uma RET com volume: 600 casos, de todo jeito — o prazo começando de hoje a
 * 11 dias atrás (algum cai no amarelo em qualquer dia da semana), prazo que nem
 * começou, encerrados, e o Retido com e sem a proposta transmitida.
 */
function preparar() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  const canais = t.chamar('canaisVisiveis_()');
  t.ret = canais.find((c) => c.aba === 'BASE_RET');
  t.mesa = canais.find((c) => c.aba === 'BASE_MESA');
  // O "Status proposta" é coluna que a operação criou, fora do contrato.
  t.chamar('adicionarColuna_')('BASE_RET', 'Status proposta', 'texto');
  const linha = t.chamar('lerRegistros_')('SINALIZADORES').find((l) => String(l.CanalId) === String(t.ret.id));
  t.chamar('atualizarRegistro_')('SINALIZADORES', linha.__id, { StatusComCondicao: 'Retido',
    ColunaDaCondicao: 'Status proposta', ValoresDaCondicao: 'Transmitido',
    ColunaDaDataDaCondicao: 'Data do status proposta' });
  t.chamar('esquecerCacheDaConfiguracao_()');

  const status = ['Pendente', 'Não trabalhado', 'Retido', 'Não retido', '1º contato realizado', ''];
  t.chamar('inserirVariosRegistros_')('BASE_RET', Array.from({ length: 600 }, (_, i) => ({
    [DA_RET]: atras(40 + (i % 30)),
    status: status[i % 6],
    analista: Math.floor(i / 12) % 2 ? 'Diego Castilho' : 'Ana Martins',
    'nome do cliente': 'Cliente ' + i,
    // Metade dos Retidos com a proposta transmitida: para esses o prazo parou.
    'Status proposta': Math.floor(i / 6) % 2 ? 'Transmitido' : '',
    'Data do status proposta': Math.floor(i / 6) % 2 ? atras(1) : '',
    protocolo: Math.floor(i / 12) % 3 ? 'P-' + i : '',
    [PRIMEIRA_MUDANCA]: i % 5 === 0 ? '' : atras(Math.floor(i / 7) % 12, 8 + (i % 9))
  })));

  t.canal = (um) => t.chamar('canalPeloId_')((um || t.ret).id);
  t.ids = (registros) => registros.map((r) => String(r.__id)).sort().join(',');
  t.amarelos = (registros, um) => t.ids(t.chamar('casosPertoDeVencer_')(registros, t.canal(um)));
  t.quantos = (registros, um) => t.chamar('casosPertoDeVencer_')(registros, t.canal(um)).length;
  t.celulas = (f) => { t.ambiente.medidor.zerar(); f(); return t.ambiente.medidor.retrato().celulasLidas; };
  t.trabalho = (filtros) => t.chamar('resumoDoCanal')(t.ret.id, filtros || {}, undefined, '', true);
  return t;
}

function rodarTestesDaLeituraLeveDoAviso() {
  console.log('\nEtapa 74: o aviso de prazo lê só as colunas do prazo');

  /* ----------------------------------------------------------------------- */
  secao('O aviso não muda');

  teste('RET: os mesmos casos no amarelo, lendo só as linhas que podem avisar', () => {
    const t = preparar();
    const esperados = t.amarelos(t.chamar('lerRegistros_')('BASE_RET'));
    verdadeiro(esperados.split(',').length > 5, 'há casos no amarelo: ' + esperados.split(',').length);
    const lidos = t.chamar('casosAbertosDaPlanilha_')(t.canal(), true);
    igual(t.amarelos(lidos), esperados);
    igual(t.ids(lidos), esperados, 'e só eles foram lidos');
    igual(t.amarelos(t.chamar('casosAbertosDaPlanilha_')(t.canal())), esperados, 'como na leitura de antes');
  });

  teste('o prazo que só vale com uma coluna preenchida: a linha sem ela nem é lida', () => {
    const t = preparar();
    const linha = t.chamar('lerRegistros_')('SINALIZADORES').find((l) => String(l.CanalId) === String(t.ret.id));
    t.chamar('atualizarRegistro_')('SINALIZADORES', linha.__id, { ColunaQueLiga: 'protocolo' });
    t.chamar('esquecerCacheDaConfiguracao_()');
    const todos = t.chamar('lerRegistros_')('BASE_RET');
    const esperados = t.amarelos(todos);
    verdadeiro(esperados.length > 0 && t.quantos(todos) < 40, 'menos casos avisam: ' + t.quantos(todos));
    igual(t.ids(t.chamar('casosAbertosDaPlanilha_')(t.canal(), true)), esperados);
  });

  teste('as linhas chegam inteiras: o que vem depois (alcance, filtros, a lista) tem todas as colunas', () => {
    const t = preparar();
    const lidos = t.chamar('casosAbertosDaPlanilha_')(t.canal(), true);
    const largura = t.chamar('estruturaDaAba_')('BASE_RET').cabecalhos.length;
    verdadeiro(Object.keys(lidos[0]).length >= largura, Object.keys(lidos[0]).length + ' de ' + largura);
    verdadeiro(/^Cliente \d+$/.test(lidos[0]['nome do cliente']), lidos[0]['nome do cliente']);
  });

  teste('a tela recebe o mesmo aviso: os casos, a contagem, o alcance e os filtros', () => {
    const t = preparar();
    const todos = t.chamar('lerRegistros_')('BASE_RET');
    const resumo = t.trabalho();
    const esperados = t.amarelos(todos).split(',');
    const daAna = t.quantos(todos.filter((r) => r.analista === 'Ana Martins'));
    const doDiego = t.quantos(todos.filter((r) => r.analista === 'Diego Castilho'));
    verdadeiro(daAna > 0 && doDiego > 0, 'os dois têm casos no amarelo: ' + daAna + ' e ' + doDiego);
    igual(resumo.quantosPertoDeVencer, esperados.length);
    verdadeiro(resumo.pertoDeVencer.every((c) => esperados.indexOf(String(c.id)) >= 0), 'só casos no amarelo');

    const analista = resumo.filtrosDisponiveis.find((f) => f.cabecalho.toLowerCase() === 'analista');
    igual(t.trabalho({ [analista.chave]: ['Ana Martins'] }).quantosPertoDeVencer,
      daAna, 'o filtro vale');

    const operacao = t.chamar('lerRegistros_')('CATALOGO')
      .find((item) => item.Tipo === 'NIVEL_ACESSO' && item.Nome === 'Operação');
    t.chamar('salvarUsuario')({ nome: 'Diego Castilho', email: 'diego@exemplo.com',
      nivelAcessoId: operacao.Id, canalId: '', ativo: true });
    comoUsuario(t.ambiente, 'diego@exemplo.com', () => {
      igual(t.trabalho().quantosPertoDeVencer, doDiego, 'o alcance vale');
    });
  });

  teste('Mesa: o prazo em horas, que começa no "Em andamento", avisa igual', () => {
    const t = preparar();
    t.chamar('inserirVariosRegistros_')('BASE_MESA', Array.from({ length: 400 }, (_, i) => ({
      Analista: 'Ana Martins', Status: i % 4 === 3 ? 'Concluído' : 'Em andamento',
      'Data de entrada': atras(20), 'Nome do segurado': 'Segurado ' + i,
      'Data em andamento': i % 7 === 0 ? '' : atras(i % 9, 8 + (i % 10))
    })));
    const esperados = t.amarelos(t.chamar('lerRegistros_')('BASE_MESA'), t.mesa);
    verdadeiro(esperados.length > 0, 'há casos da Mesa no amarelo');
    igual(t.amarelos(t.chamar('casosAbertosDaPlanilha_')(t.canal(t.mesa), true), t.mesa), esperados);
  });

  /* ----------------------------------------------------------------------- */
  secao('O custo');

  teste('lê menos da metade do que lia', () => {
    const t = preparar();
    for (let i = 0; i < 12; i++) t.chamar('adicionarColuna_')('BASE_RET', 'Da operação ' + i, 'texto');
    // Como na operação: muitos casos abertos, quase todos já estourados, e os
    // que estão para vencer são poucos e recentes.
    t.chamar('inserirVariosRegistros_')('BASE_RET', Array.from({ length: 2000 }, (_, i) => ({
      [DA_RET]: atras(90), status: i % 3 ? 'Pendente' : 'Não retido', 'nome do cliente': 'Volume ' + i,
      [PRIMEIRA_MUDANCA]: i > 1960 ? atras(i % 6, 8 + (i % 9)) : atras(60)
    })));
    t.chamar('casosAbertosDaPlanilha_')(t.canal());   // a configuração já lida, para medir só a base
    const antes = t.celulas(() => t.chamar('casosAbertosDaPlanilha_')(t.canal()));
    const agora = t.celulas(() => t.chamar('casosAbertosDaPlanilha_')(t.canal(), true));
    verdadeiro(agora * 2 < antes, agora + ' células, contra ' + antes);
  });

  teste('com poucas linhas abertas, lê as linhas direto — as colunas inteiras sairiam mais caro', () => {
    const t = carregar('primeiro.adm@exemplo.com');
    t.chamar('instalarRECC()');
    const ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    const canal = t.chamar('canalPeloId_')(ret.id);
    t.chamar('inserirVariosRegistros_')('BASE_RET', Array.from({ length: 500 }, (_, i) => ({
      [DA_RET]: atras(50), status: i < 6 ? 'Pendente' : 'Não retido', 'nome do cliente': 'C' + i,
      [PRIMEIRA_MUDANCA]: atras(i)
    })));
    const medir = (f) => { t.ambiente.medidor.zerar(); const lido = f(); return [lido, t.ambiente.medidor.retrato().celulasLidas]; };
    t.chamar('casosAbertosDaPlanilha_')(canal);   // a configuração já lida, para medir só a base
    const [todos, custoDeAntes] = medir(() => t.chamar('casosAbertosDaPlanilha_')(canal));
    const [afunilado, custoDeAgora] = medir(() => t.chamar('casosAbertosDaPlanilha_')(canal, true));
    igual(afunilado.length, todos.length, 'as mesmas seis linhas abertas');
    igual(custoDeAgora, custoDeAntes, 'pelo mesmo custo');
  });

  teste('sem o aviso pedido, nada disso é lido', () => {
    const t = preparar();
    t.trabalho();   // a configuração já lida, para medir só a base
    const semAviso = t.celulas(() => t.chamar('resumoDoCanal')(t.ret.id, {}, undefined, '', false));
    const comAviso = t.celulas(() => t.chamar('resumoDoCanal')(t.ret.id, {}, undefined, '', true));
    verdadeiro(comAviso > semAviso, comAviso + ' com o aviso, ' + semAviso + ' sem');
    igual(t.chamar('resumoDoCanal')(t.ret.id, {}, undefined, '', false).quantosPertoDeVencer, 0);
  });
}

module.exports = { rodarTestesDaLeituraLeveDoAviso };
