/**
 * ============================================================================
 * PGO — testes-parada-da-ret.js · quando o prazo da RET para
 * ============================================================================
 * Pedido do PO: "na RET ele irá parar quando o status for não retido, pago,
 * cancelado, sem sucesso — e para os retidos, quando o status proposta
 * aparecer transmitido ou sem alteração."
 *
 * Os quatro primeiros já paravam por serem status finais. O que é novo: o
 * Retido só para com a condição, e o sistema precisa saber QUANDO ela passou a
 * valer — por isso o carimbo `Data do status proposta`.
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comAFilaDaTela } = require('./ferramentas');
const { retComStatusProposta } = require('./testes-condicional');

const CONDICAO = {
  statusComCondicao: 'Retido', colunaDaCondicao: 'Status proposta',
  valoresDaCondicao: ['Transmitido', 'Sem alteração'],
  colunaDaDataDaCondicao: 'Data do status proposta'
};

/** A RET com o Status proposta e a condição de parada do Retido ligada. */
function retComAParada() {
  const t = retComStatusProposta();
  t.salvar({ mostrarSe: { campo: 'status', valores: ['Retido'] } });
  const sinalizador = () => t.chamar('listarSinalizadores')()
    .find((s) => String(s.canalId) === String(t.ret.id));
  const salvarSinalizador = (extra) => {
    const a = sinalizador();
    return t.chamar('salvarSinalizador')(Object.assign({
      id: a.id, nome: a.nome, canalId: a.canalId, prazo: a.prazo, unidade: a.unidade,
      aviso: a.aviso, colunaQueLiga: a.colunaQueLiga, colunaDaData: a.colunaDaData,
      colunaDaHora: a.colunaDaHora, inicioDoExpediente: a.inicioDoExpediente,
      fimDoExpediente: a.fimDoExpediente, ordem: a.ordem, ativo: a.ativo,
      // O que a tela manda: sempre os quatro, com o que o sinalizador já tem.
      statusComCondicao: a.statusComCondicao, colunaDaCondicao: a.colunaDaCondicao,
      valoresDaCondicao: a.valoresDaCondicao,
      colunaDaDataDaCondicao: a.colunaDaDataDaCondicao }, extra));
  };
  salvarSinalizador(CONDICAO);
  return Object.assign({ sinalizador, salvarSinalizador }, t);
}

function rodarTestesDaParadaDaRet() {
  console.log('\nO prazo da RET: o Retido só para com o Status proposta pronto');

  /* ----------------------------------------------------------------------- */
  secao('Configurar a condição de parada');

  teste('a condição se guarda inteira, e a regra sai por extenso', () => {
    const t = retComAParada();
    const s = t.sinalizador();
    igual(s.statusComCondicao, 'Retido');
    igual(s.colunaDaCondicao, 'Status proposta');
    igual(s.valoresDaCondicao.join('|'), 'Transmitido|Sem alteração');
    igual(s.colunaDaDataDaCondicao, 'Data do status proposta');
    contem(s.regra, '"Retido" só encerra quando "Status proposta" for Transmitido ou Sem alteração');
  });

  teste('os quatro juntos, ou nenhum', () => {
    const t = retComAParada();
    contem(lanca(() => t.salvarSinalizador({ colunaDaDataDaCondicao: '' })).message,
      'pede os quatro');
    contem(lanca(() => t.salvarSinalizador({ valoresDaCondicao: [] })).message, 'pede os quatro');
    t.salvarSinalizador({ statusComCondicao: '', colunaDaCondicao: '', valoresDaCondicao: [],
      colunaDaDataDaCondicao: '' });
    igual(t.sinalizador().statusComCondicao, '', 'tudo em branco tira a condição');
  });

  teste('recusa o que nunca encerraria o prazo', () => {
    const t = retComAParada();
    contem(lanca(() => t.salvarSinalizador({ statusComCondicao: 'Inventado' })).message,
      'não existe no canal');
    contem(lanca(() => t.salvarSinalizador({ valoresDaCondicao: ['Transmitidoo'] })).message,
      'não é uma opção de "Status proposta"');
    contem(lanca(() => t.salvarSinalizador({ colunaDaCondicao: 'nao existe' })).message,
      'não existe');
    contem(lanca(() => t.salvarSinalizador({
      colunaDaDataDaCondicao: 'data de recepção do protocolo' })).message,
    'não é uma coluna de data e hora');
    igual(t.sinalizador().valoresDaCondicao.length, 2, 'nada mudou');
  });

  teste('uma tela antiga, que não manda os quatro campos, não tira a condição', () => {
    const t = retComAParada();
    const a = t.sinalizador();
    t.chamar('salvarSinalizador')({ id: a.id, nome: a.nome, canalId: a.canalId, prazo: 5,
      unidade: a.unidade, aviso: a.aviso, colunaQueLiga: '', colunaDaData: '', colunaDaHora: '',
      inicioDoExpediente: a.inicioDoExpediente, fimDoExpediente: a.fimDoExpediente,
      ordem: a.ordem, ativo: true });
    igual(t.sinalizador().prazo, 5, 'o que ela mandou foi salvo');
    igual(t.sinalizador().statusComCondicao, 'Retido', 'e o que ela não conhece, mantido');
    igual(t.sinalizador().valoresDaCondicao.length, 2);
  });

  teste('guarda os valores como a lista os escreve', () => {
    const t = retComAParada();
    t.salvarSinalizador({ valoresDaCondicao: ['transmitido', 'SEM ALTERACAO'] });
    igual(t.sinalizador().valoresDaCondicao.join('|'), 'Transmitido|Sem alteração');
  });

  teste('o texto separado por ponto e vírgula também vale', () => {
    const t = retComAParada();
    t.salvarSinalizador({ valoresDaCondicao: 'Transmitido; Sem alteração' });
    igual(t.sinalizador().valoresDaCondicao.length, 2);
  });

  /* ----------------------------------------------------------------------- */
  secao('O relógio: quem para, e quando');

  // A RET conta da PRIMEIRA MUDANÇA DE STATUS — aqui, SEGUNDA 05/10/2026, só a
  // data: abre às 08:15. Três dias úteis são 1845 minutos, e acabam na QUINTA
  // às 08:15.
  const t = retComAParada();
  const ret = t.ret;
  const sinalizador = t.chamar('sinalizadoresDoCanal_')(ret)[0];
  const situacoes = t.chamar('situacoesPorChave_')(ret);
  const quando = (dia, hora) => {
    const [h, m] = hora.split(':').map(Number);
    return { dia: Math.round(Date.UTC(2026, 9, dia) / 86400000), minuto: h * 60 + m };
  };
  const caso = (extra) => Object.assign({
    'data de recepção do protocolo': new Date(2026, 9, 5), status: 'Retido',
    'Data da primeira mudança de status': new Date(2026, 9, 5),
    'Status proposta': '', 'Data do status proposta': '' }, extra);
  const em = (dia, hora, registro) =>
    t.chamar('sinalDoCaso_')(registro, ret, sinalizador, situacoes, quando(dia, hora));

  teste('Retido com a proposta ainda aguardando: o relógio segue correndo', () => {
    const aguardando = caso({ 'Status proposta': 'Aguardando transmissão' });
    const sinal = em(7, '12:00', aguardando);
    igual(sinal.encerrado, false, 'Retido sozinho não encerra mais');
    igual(sinal.tom, 'atencao', 'quarta: o 3º dia, amarelo');
    igual(em(9, '12:00', aguardando).tom, 'ruim', 'sexta: passou dos 3 dias');
  });

  teste('Retido sem nada no Status proposta também segue correndo', () => {
    igual(em(9, '12:00', caso()).encerrado, false);
    igual(em(9, '12:00', caso()).tom, 'ruim');
  });

  teste('Retido com Transmitido ou Sem alteração para — dentro do prazo', () => {
    ['Transmitido', 'Sem alteração'].forEach((valor) => {
      const sinal = em(30, '12:00', caso({ 'Status proposta': valor,
        'Data do status proposta': new Date(2026, 9, 6, 10, 0) }));
      igual(sinal.encerrado, true, valor);
      igual(sinal.tom, 'bom');
      contem(sinal.texto, 'cumprido em 1 dia útil e 1h');
    });
  });

  teste('Retido transmitido depois dos 3 dias: estourado, e fica assim para sempre', () => {
    const tarde = caso({ 'Status proposta': 'Transmitido',
      'Data do status proposta': new Date(2026, 9, 9, 10, 0) });
    const sinal = em(30, '12:00', tarde);
    igual(sinal.tom, 'ruim');
    contem(sinal.texto, 'estourado, 1 dia útil e 1h além');
    igual(em(12, '09:00', tarde).texto, sinal.texto, 'o dia de hoje não muda o resultado');
  });

  teste('o valor sem a data em que foi preenchido não inventa prazo', () => {
    // Os Retidos de antes do carimbo: o sistema sabe que a proposta foi
    // transmitida, mas não QUANDO. Vermelho ou verde seria chute.
    igual(em(30, '12:00', caso({ 'Status proposta': 'Transmitido' })), null);
  });

  teste('os outros desfechos continuam parando sozinhos, sem olhar o Status proposta', () => {
    ['Não retido', 'Pago', 'Cancelado', 'Sem sucesso de contato'].forEach((status) => {
      const sinal = em(30, '12:00', caso({ status: status,
        'Data da última mudança de status': new Date(2026, 9, 6, 10, 0) }));
      igual(sinal.encerrado, true, status);
      contem(sinal.texto, 'cumprido em 1 dia útil e 1h', status);
    });
  });

  teste('quem não tem condição configurada continua com o Retido parando sozinho', () => {
    const outra = retComAParada();
    outra.salvarSinalizador({ statusComCondicao: '', colunaDaCondicao: '',
      valoresDaCondicao: [], colunaDaDataDaCondicao: '' });
    const semCondicao = outra.chamar('sinalizadoresDoCanal_')(outra.ret)[0];
    const sinal = outra.chamar('sinalDoCaso_')(caso({ 'Data da última mudança de status':
      new Date(2026, 9, 6, 10, 0) }), outra.ret, semCondicao,
    outra.chamar('situacoesPorChave_')(outra.ret), quando(30, '12:00'));
    igual(sinal.encerrado, true);
  });

  /* ----------------------------------------------------------------------- */
  secao('O sistema carimba quando a condição passou a valer');

  const stamp = (x, id) => x.linha(id)['Data do status proposta'];
  const ehData = (v) => !!v && typeof v.getTime === 'function';

  teste('cadastrar já Retido e Transmitido carimba agora', () => {
    const x = retComAParada();
    const novo = x.chamar('cadastrarCaso')(x.ret.id, Object.assign(
      { status: 'Retido', statusproposta: 'Transmitido' }, x.base));
    verdadeiro(ehData(stamp(x, novo.id)), 'gravou data com hora');
    verdadeiro(Math.abs(stamp(x, novo.id).getTime() - Date.now()) < 60000, 'é de agora');
  });

  teste('Aguardando não carimba; passar a Transmitido carimba; voltar limpa', () => {
    const x = retComAParada();
    const novo = x.chamar('cadastrarCaso')(x.ret.id, Object.assign(
      { status: 'Retido', statusproposta: 'Aguardando transmissão' }, x.base));
    igual(stamp(x, novo.id), '', 'aguardando não encerra nada');

    const editar = (proposta) => x.chamar('editarCaso')(x.ret.id, novo.id,
      Object.assign({ status: 'Retido', statusproposta: proposta }, x.base));
    editar('Transmitido');
    verdadeiro(ehData(stamp(x, novo.id)), 'transmitiu: carimbou');
    const primeira = stamp(x, novo.id).getTime();

    editar('Transmitido');
    igual(stamp(x, novo.id).getTime(), primeira, 'salvar sem mexer não recarimba');

    editar('Sem alteração');
    verdadeiro(ehData(stamp(x, novo.id)), 'de um valor que encerra para outro: segue encerrado');

    editar('Aguardando transmissão');
    igual(stamp(x, novo.id), '', 'voltou a aguardar: o prazo volta a correr');
  });

  teste('sair do Retido pelo diálogo esvazia o Status proposta e o carimbo', () => {
    const x = retComAParada();
    const novo = x.chamar('cadastrarCaso')(x.ret.id, Object.assign(
      { status: 'Retido', statusproposta: 'Transmitido' }, x.base));
    verdadeiro(ehData(stamp(x, novo.id)));
    x.chamar('alterarSituacaoDoCaso')(x.ret.id, novo.id, 'Não retido');
    igual(x.linha(novo.id)['Status proposta'], '');
    igual(stamp(x, novo.id), '', 'sem o valor, sem o carimbo');
  });

  teste('o caso gravado antes da condição existir segue sem carimbo e sem erro', () => {
    const x = retComAParada();
    x.chamar('removerColuna_')('BASE_RET', 'Data do status proposta');
    x.chamar('esquecerEstruturaLida_()');
    const novo = x.chamar('cadastrarCaso')(x.ret.id, Object.assign(
      { status: 'Retido', statusproposta: 'Transmitido' }, x.base));
    verdadeiro(!!novo.id, 'gravou sem estourar, antes do atualizarPGO');
  });

  /* ----------------------------------------------------------------------- */
  secao('O Trabalho e a Produtividade usam a regra nova');

  teste('a fila mostra o Retido aguardando em aberto e o transmitido encerrado', () => {
    const x = retComAParada();
    const dias = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); return d; };
    const aguardando = x.chamar('inserirRegistro_')('BASE_RET', { analista: 'Ana Martins',
      'nome do cliente': 'Aguardando', status: 'Retido', 'Status proposta': 'Aguardando transmissão',
      'data de recepção do protocolo': dias(30), 'Data da primeira mudança de status': dias(30) });
    const transmitido = x.chamar('inserirRegistro_')('BASE_RET', { analista: 'Ana Martins',
      'nome do cliente': 'Transmitido', status: 'Retido', 'Status proposta': 'Transmitido',
      'Data do status proposta': dias(29), 'data de recepção do protocolo': dias(30),
      'Data da primeira mudança de status': dias(30) });
    const fila = comAFilaDaTela(x.chamar('resumoDoCanal')(x.ret.id, {}, 90)).fila;
    const sinais = (r) => fila.find((c) => String(c.id) === String(r.__id)).sinais[0];
    igual(sinais(aguardando).encerrado, false);
    igual(sinais(aguardando).tom, 'ruim', 'há 30 dias esperando a transmissão');
    igual(sinais(transmitido).encerrado, true);
    igual(sinais(transmitido).tom, 'bom', 'transmitido em 1 dia');
  });

  teste('a Produtividade conta o Retido aguardando como fora do prazo, e nomeia o analista', () => {
    const x = retComAParada();
    const antigo = new Date(); antigo.setDate(antigo.getDate() - 30);
    x.chamar('inserirRegistro_')('BASE_RET', { analista: 'Ana Martins', 'nome do cliente': 'X',
      status: 'Retido', 'Status proposta': 'Aguardando transmissão',
      'data de recepção do protocolo': antigo, 'Data da primeira mudança de status': antigo });
    const p = x.chamar('produtividadeDaEquipe')(x.ret.id, {}, 90).prazos.sinalizadores[0];
    verdadeiro(p.fora >= 1, 'o Retido que não foi transmitido está fora');
    verdadeiro(p.porAnalista.some((a) => a.analista === 'Ana Martins'),
      'e a analista dele é apontada');
  });

  /* ----------------------------------------------------------------------- */
  secao('O diagnóstico confere a condição');

  const bloco = (x) => x.chamar('diagnosticoRECC()').blocos
    .find((b) => b.titulo === 'Os sinalizadores de prazo');

  teste('condição em ordem: coerente', () => {
    const x = retComAParada();
    igual(bloco(x).situacao, 'ok');
  });

  teste('a coluna do carimbo que sumiu é falha', () => {
    const x = retComAParada();
    x.chamar('removerColuna_')('BASE_RET', 'Data do status proposta');
    x.chamar('esquecerEstruturaLida_()');
    igual(bloco(x).situacao, 'falha');
    contem(JSON.stringify(bloco(x).itens), 'Data do status proposta');
  });

  teste('a condição pela metade é falha', () => {
    const x = retComAParada();
    x.chamar('atualizarRegistro_')('SINALIZADORES', x.sinalizador().id,
      { ColunaDaDataDaCondicao: '' });
    contem(JSON.stringify(bloco(x).itens), 'pela metade');
    igual(bloco(x).situacao, 'falha');
  });

  teste('o item da lista que foi renomeado vira atenção, com o caminho', () => {
    const x = retComAParada();
    const item = x.chamar('lerRegistros_("CATALOGO")').find((i) => i.Nome === 'Transmitido');
    x.chamar('atualizarRegistro_')('CATALOGO', item.Id, { Nome: 'Transmitida' });
    const achados = bloco(x).itens.filter((i) => i.situacao === 'atencao');
    igual(achados.length, 1);
    contem(achados[0].oQue, 'espera valor que a lista de "Status proposta" não tem');
    contem(achados[0].detalhe, 'Transmitido');
    contem(achados[0].comoArrumar, 'Configurações › Sinalizadores');
  });

  /* ----------------------------------------------------------------------- */
  secao('A migração liga a condição quando a coluna já existe');

  /** A RET como a versão anterior a deixou: sem a coluna do carimbo e sem condição. */
  function retDaVersaoAnterior(comOStatusProposta) {
    const x = comOStatusProposta ? retComStatusProposta() : (() => {
      const c = carregar('primeiro.adm@exemplo.com');
      c.chamar('instalarRECC()');
      return Object.assign({ ret: c.chamar('canaisVisiveis_()').find((k) => k.aba === 'BASE_RET'),
        base: { nomedocliente: 'Cliente' } }, c);
    })();
    x.chamar('removerColuna_')('BASE_RET', 'Data do status proposta');
    x.chamar('lerRegistros_("CAMPOS")').forEach((campo) => {
      if (String(campo.Cabecalho) === 'Data do status proposta') {
        x.chamar('apagarRegistroDeVez_')('CAMPOS', campo.Id);
      }
    });
    x.chamar('esquecerEstruturaLida_()');
    return x;
  }

  teste('com o Status proposta criado, a atualização liga a condição sozinha', () => {
    const x = retDaVersaoAnterior(true);
    ['Pendente', 'Aguardando transmissão', 'Transmitido'].forEach((proposta, i) => {
      x.chamar('inserirRegistro_')('BASE_RET', { analista: 'Ana', 'nome do cliente': 'R' + i,
        status: 'Retido', 'Status proposta': proposta === 'Pendente' ? '' : proposta });
    });
    const recado = x.chamar('atualizarPGO()');
    contem(recado, 'BASE_RET.Data do status proposta criada');
    contem(recado, 'RET: o "Retido" só encerra o prazo quando "Status proposta" for '
      + 'Transmitido ou Sem alteração');
    contem(recado, 'dos 3 caso(s) Retido que já existem, 2 ainda não têm');

    const s = x.chamar('listarSinalizadores')().find((k) => String(k.canalId) === String(x.ret.id));
    igual(s.statusComCondicao, 'Retido');
    igual(s.valoresDaCondicao.join('|'), 'Transmitido|Sem alteração');
    igual(s.colunaDaDataDaCondicao, 'Data do status proposta');
  });

  teste('sem o Status proposta, não inventa: diz o que fazer, e o Retido segue parando', () => {
    const x = retDaVersaoAnterior(false);
    const recado = x.chamar('atualizarPGO()');
    contem(recado, 'a base não tem a coluna "Status proposta"');
    contem(recado, 'Cadastrar Caso');
    const s = x.chamar('listarSinalizadores')().find((k) => String(k.canalId) === String(x.ret.id));
    igual(s.statusComCondicao, '');
  });

  teste('a coluna sem a lista certa não vira condição', () => {
    const x = retDaVersaoAnterior(true);
    const campo = x.chamar('lerRegistros_("CAMPOS")')
      .find((c) => String(c.Cabecalho) === 'Status proposta');
    x.chamar('atualizarRegistro_')('CAMPOS', campo.Id, { Configuracao: '' });
    contem(x.chamar('atualizarPGO()'), 'a lista dela não tem "Transmitido" nem "Sem alteração"');
  });

  teste('a condição que o PO já configurou não é tocada', () => {
    const x = retDaVersaoAnterior(true);
    const s = x.chamar('lerRegistros_("SINALIZADORES")')
      .find((k) => String(k.CanalId) === String(x.ret.id));
    x.chamar('atualizarRegistro_')('SINALIZADORES', s.Id, { StatusComCondicao: 'Pago',
      ColunaDaCondicao: 'Status proposta', ValoresDaCondicao: 'Transmitido',
      ColunaDaDataDaCondicao: 'Data do status proposta' });
    const recado = x.chamar('atualizarPGO()');
    contem(recado, 'RET: o sinalizador já tem condição de parada ("Pago")');
    igual(x.chamar('lerRegistros_("SINALIZADORES")')
      .find((k) => String(k.Id) === String(s.Id)).StatusComCondicao, 'Pago');
  });

  teste('rodar de novo não muda nada', () => {
    const x = retDaVersaoAnterior(true);
    x.chamar('atualizarPGO()');
    const segunda = x.chamar('atualizarPGO()');
    contem(segunda, 'Nada a mudar');
    contem(segunda, 'RET: o sinalizador já tem condição de parada');
  });

  teste('a instalação nova nasce sem a condição, e sem a coluna que ela esperaria', () => {
    const c = carregar('primeiro.adm@exemplo.com');
    c.chamar('instalarRECC()');
    const ret2 = c.chamar('canaisVisiveis_()').find((k) => k.aba === 'BASE_RET');
    const s = c.chamar('listarSinalizadores')().find((k) => String(k.canalId) === String(ret2.id));
    igual(s.statusComCondicao, '', 'o Status proposta é do PO criar: o sistema não o inventa');
    verdadeiro(c.chamar('estruturaDaAba_')('BASE_RET').cabecalhos
      .indexOf('Data do status proposta') >= 0, 'mas a coluna do carimbo já existe');
    igual(c.chamar('diagnosticoRECC()').blocos
      .find((b) => b.titulo === 'Os sinalizadores de prazo').situacao, 'ok');
  });

  /* ----------------------------------------------------------------------- */
  secao('Configurações › Sinalizadores: a condição na tela');

  teste('o painel oferece a condição e manda os quatro campos', () => {
    const fs = require('fs');
    const path = require('path');
    const tela = fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End',
      'Configuracoes.html'), 'utf8');
    ['sn-cond-status', 'sn-cond-coluna', 'sn-cond-data'].forEach((id) => contem(tela, id));
    contem(tela, 'data-valor-da-parada');
    contem(tela, 'valoresDaCondicao: lerOsValoresDaParada()');
    contem(tela, "statusComCondicao: valorDe('sn-cond-status')");
    contem(tela, "colunaDaDataDaCondicao: valorDe('sn-cond-data')");
  });

  teste('as opções trazem os status do canal e as listas das colunas', () => {
    const x = retComAParada();
    const canal = x.chamar('opcoesDeSinalizador')().canais.find((k) => k.aba === 'BASE_RET');
    verdadeiro(canal.situacoes.indexOf('Retido') >= 0);
    igual(canal.colunasComLista['Status proposta'].join('|'),
      'Transmitido|Aguardando transmissão|Sem alteração');
    verdadeiro(canal.colunasDeData.indexOf('Data do status proposta') >= 0);
  });
}

module.exports = { rodarTestesDaParadaDaRet, retComAParada };
