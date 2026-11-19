/**
 * ============================================================================
 * PGO — testes-gravacao-simultanea.js · duas pessoas no mesmo caso (Etapa 87, B1)
 * ============================================================================
 * Pedido do PO: "A verificação da versão do registro deve acontecer dentro da
 * mesma trava que protege a gravação. Dois analistas não podem sobrescrever
 * silenciosamente as alterações um do outro."
 *
 * A JANELA QUE EXISTIA: a edição conferia a versão ANTES de pegar a trava, e a
 * troca de status nem conferia. Quem gravasse entre a conferência e a trava
 * tinha a mudança apagada sem aviso. Aqui a outra pessoa grava EXATAMENTE nesse
 * meio: o teste troca `esperarATrava_` por uma que, uma vez, deixa a outra
 * gravação acontecer antes — como se ela tivesse chegado à trava primeiro.
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario } = require('./ferramentas');

const DA_RET = 'data de recepção do protocolo';

function doisAnalistas() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  const ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  // A segunda pessoa tem o mesmo nível da primeira: é a disputa entre iguais.
  const nivel = t.chamar('lerRegistros_')('USUARIOS')[0].NivelAcessoId;
  t.chamar('salvarUsuario')({ nome: 'Bruno Lima', email: 'bruno@exemplo.com', nivelAcessoId: nivel, ativo: true });
  const caso = t.chamar('inserirRegistro_')('BASE_RET', { [DA_RET]: new Date(), status: 'Pendente',
    'nome do cliente': 'Cliente da disputa', analista: 'Ana Martins' });
  const id = String(caso.__id);
  t.ret = ret; t.id = id;
  t.linha = () => t.chamar('buscarRegistros_')('BASE_RET', 'Id', id, 1)[0];
  t.versao = () => t.chamar('casoParaEditar')(ret.id, id).versao;
  t.comoBruno = (corpo) => comoUsuario(t.ambiente, 'bruno@exemplo.com', corpo);
  t.edicoes = () => { t.chamar('descarregarAFilaDaAuditoria_')(0);
    return t.chamar('lerRegistros_')('AUDITORIA').filter((a) => String(a.Acao) === 'caso.editar' && String(a.RegistroId) === id); };
  /** Na próxima espera pela trava, a outra gravação acontece antes. */
  t.noMeio = (outraGravacao) => {
    const original = t.contexto.esperarATrava_;
    let vez = true;
    t.contexto.esperarATrava_ = function (trava, ms) {
      if (vez) { vez = false; outraGravacao(); }
      return original(trava, ms);
    };
    return () => { t.contexto.esperarATrava_ = original; };
  };
  return t;
}

function rodarTestesDaGravacaoSimultanea() {
  console.log('\nEtapa 87 (B1): duas pessoas no mesmo caso');

  /* ----------------------------------------------------------------------- */
  secao('Edição × edição');

  teste('quem salva com a versão velha é recusado, e a mudança da outra pessoa fica', () => {
    const t = doisAnalistas();
    const daAna = t.versao();
    const doBruno = t.comoBruno(() => t.versao());
    t.comoBruno(() => t.chamar('editarCaso')(t.ret.id, t.id, { nomedocliente: 'Nome do Bruno', status: 'Pendente' }, doBruno));
    lanca(() => t.chamar('editarCaso')(t.ret.id, t.id, { nomedocliente: 'Nome da Ana', status: 'Pendente' }, daAna),
      'alterado por outra pessoa');
    igual(String(t.linha()['nome do cliente']), 'Nome do Bruno');
  });

  teste('a outra pessoa grava ENTRE a conferência e a trava: a recusa vem de dentro da trava', () => {
    const t = doisAnalistas();
    const daAna = t.versao();
    const doBruno = t.comoBruno(() => t.versao());
    const desfazer = t.noMeio(() => t.comoBruno(() =>
      t.chamar('editarCaso')(t.ret.id, t.id, { nomedocliente: 'Nome do Bruno', status: 'Pendente' }, doBruno)));
    try {
      const erro = lanca(() => t.chamar('editarCaso')(t.ret.id, t.id, { nomedocliente: 'Nome da Ana', status: 'Pendente' }, daAna),
        'alterado por outra pessoa');
      contem(erro.message, 'nada foi gravado', 'a mensagem diz o que aconteceu');
    } finally { desfazer(); }
    igual(String(t.linha()['nome do cliente']), 'Nome do Bruno', 'a mudança do Bruno não foi apagada');
    igual(t.ambiente.travasSeguradas, 0, 'a trava foi solta mesmo com a recusa');
  });

  teste('a auditoria guarda só a edição que valeu', () => {
    const t = doisAnalistas();
    const antes = t.edicoes().length;
    const daAna = t.versao();
    const doBruno = t.comoBruno(() => t.versao());
    const desfazer = t.noMeio(() => t.comoBruno(() =>
      t.chamar('editarCaso')(t.ret.id, t.id, { nomedocliente: 'Nome do Bruno', status: 'Pendente' }, doBruno)));
    try { lanca(() => t.chamar('editarCaso')(t.ret.id, t.id, { nomedocliente: 'Nome da Ana', status: 'Pendente' }, daAna)); }
    finally { desfazer(); }
    igual(t.edicoes().length - antes, 1, 'uma edição na trilha, a do Bruno');
  });

  /* ----------------------------------------------------------------------- */
  secao('Edição × troca de status');

  teste('a troca de status acontece no meio da edição: a edição é recusada e o status fica', () => {
    const t = doisAnalistas();
    const daAna = t.versao();
    const desfazer = t.noMeio(() => t.comoBruno(() =>
      t.chamar('alterarSituacaoDoCaso')(t.ret.id, t.id, 'Não trabalhado', {})));
    try {
      lanca(() => t.chamar('editarCaso')(t.ret.id, t.id, { nomedocliente: 'Nome da Ana', status: 'Pendente' }, daAna),
        'alterado por outra pessoa');
    } finally { desfazer(); }
    igual(String(t.linha().status), 'Não trabalhado', 'o status do Bruno não voltou para Pendente');
    igual(String(t.linha()['nome do cliente']), 'Cliente da disputa', 'e nada da edição da Ana entrou');
  });

  teste('a edição acontece no meio da troca de status: a troca é recusada com aviso claro', () => {
    const t = doisAnalistas();
    const doBruno = t.comoBruno(() => t.versao());
    const desfazer = t.noMeio(() => t.comoBruno(() =>
      t.chamar('editarCaso')(t.ret.id, t.id, { nomedocliente: 'Nome do Bruno', status: 'Pendente' }, doBruno)));
    let erro;
    try {
      erro = lanca(() => t.chamar('alterarSituacaoDoCaso')(t.ret.id, t.id, 'Não trabalhado', {}),
        'atualizado por outra pessoa');
    } finally { desfazer(); }
    contem(erro.message, 'nada foi gravado');
    igual(String(t.linha()['nome do cliente']), 'Nome do Bruno', 'a edição do Bruno ficou');
    igual(String(t.linha().status), 'Pendente', 'e o status não mudou');
    igual(t.ambiente.travasSeguradas, 0, 'a trava foi solta');
  });

  /* ----------------------------------------------------------------------- */
  secao('Status × status: a contagem de mudanças');

  teste('duas trocas ao mesmo tempo: uma vale, a outra é recusada, e a contagem sobe uma vez só', () => {
    const t = doisAnalistas();
    const coluna = t.chamar('RECC_COLUNA_QUANTAS_MUDANCAS_DE_STATUS');
    const antes = Number(t.linha()[coluna]) || 0;
    const desfazer = t.noMeio(() => t.comoBruno(() =>
      t.chamar('alterarSituacaoDoCaso')(t.ret.id, t.id, 'Não trabalhado', {})));
    try {
      lanca(() => t.chamar('alterarSituacaoDoCaso')(t.ret.id, t.id, 'Pago', {}), 'atualizado por outra pessoa');
    } finally { desfazer(); }
    igual(String(t.linha().status), 'Não trabalhado', 'vale a troca que chegou à trava primeiro');
    igual(Number(t.linha()[coluna]) || 0, antes + 1, 'a contagem de mudanças não se perdeu nem dobrou');
  });

  /* ----------------------------------------------------------------------- */
  secao('Sem disputa, tudo como antes');

  teste('editar e trocar o status gravam normalmente, e a trava é solta', () => {
    const t = doisAnalistas();
    t.chamar('editarCaso')(t.ret.id, t.id, { nomedocliente: 'Só a Ana', status: 'Pendente' }, t.versao());
    igual(String(t.linha()['nome do cliente']), 'Só a Ana');
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, t.id, 'Não trabalhado', {});
    igual(String(t.linha().status), 'Não trabalhado');
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, t.id, 'Pendente', {});
    igual(String(t.linha().status), 'Pendente', 'duas trocas seguidas da mesma pessoa: as duas valem');
    igual(t.ambiente.travasSeguradas, 0);
  });

  teste('editar sem versão (chamada de fora da tela) grava como antes', () => {
    const t = doisAnalistas();
    t.chamar('editarCaso')(t.ret.id, t.id, { nomedocliente: 'Sem versão', status: 'Pendente' }, '');
    igual(String(t.linha()['nome do cliente']), 'Sem versão');
  });

  teste('a conferência na trava não custa ida a mais', () => {
    const t = doisAnalistas();
    const { medidor } = require('./simulador');
    // As duas medidas partem do mesmo lugar: uma execução nova.
    const novaExecucao = () => t.chamar('(function(){ estruturasJaLidas = {}; registrosJaLidos = {};'
      + ' tiposDeclaradosJaLidos = null; cacheDaConfiguracaoLido = null; })()');
    const medir = (versao, nome) => {
      novaExecucao(); medidor.zerar();
      t.chamar('editarCaso')(t.ret.id, t.id, { nomedocliente: nome, status: 'Pendente' }, versao);
      return medidor.retrato().chamadasNoTotal;
    };
    medir('', 'Aquecendo');   // o cache da configuração quente, como no dia a dia
    const semConferencia = medir('', 'Medido');
    const comConferencia = medir(t.versao(), 'Medido de novo');
    igual(comConferencia, semConferencia, 'as mesmas chamadas, com e sem a conferência');
  });

  /* ----------------------------------------------------------------------- */
  secao('Etapa 89: a linha já achada não é procurada de novo — e a trava ainda confere');

  /** Uma RET com vizinhos acima e abaixo do caso da disputa. */
  function comVizinhos() {
    const t = doisAnalistas();
    t.vizinhos = ['Vizinho de cima 1', 'Vizinho de cima 2'].map((nome) =>
      String(t.chamar('inserirRegistro_')('BASE_RET', { [DA_RET]: new Date(), status: 'Pendente', 'nome do cliente': nome,
        analista: 'Ana Martins' }).__id));
    // O caso da disputa vai para o FIM (depois dos vizinhos): excluir um vizinho sobe a linha dele.
    const caso = t.chamar('inserirRegistro_')('BASE_RET', { [DA_RET]: new Date(), status: 'Pendente',
      'nome do cliente': 'Caso que desce', analista: 'Ana Martins' });
    t.id = String(caso.__id);
    t.porId = (id) => t.chamar('buscarRegistros_')('BASE_RET', 'Id', id, 1)[0];
    t.versao = () => t.chamar('casoParaEditar')(t.ret.id, t.id).versao;   // a do caso NOVO
    return t;
  }

  teste('salvar o caso procura o Id uma vez só (eram duas)', () => {
    const t = comVizinhos();
    const { medidor } = require('./simulador');
    t.chamar('editarCaso')(t.ret.id, t.id, { nomedocliente: 'Aquecendo', status: 'Pendente' }, '');
    medidor.zerar();
    t.chamar('editarCaso')(t.ret.id, t.id, { nomedocliente: 'Medido', status: 'Pendente' }, t.versao());
    const comVersao = medidor.retrato().buscasRapidas;
    medidor.zerar();
    t.chamar('editarCaso')(t.ret.id, t.id, { nomedocliente: 'Medido de novo', status: 'Pendente' }, '');
    igual(medidor.retrato().buscasRapidas, 1, 'editar: o localizador uma vez');
    verdadeiro(comVersao >= 1);
    medidor.zerar();
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, t.id, 'Não trabalhado', {});
    igual(medidor.retrato().buscasRapidas, 1, 'trocar o status: o localizador uma vez');
  });

  teste('um caso acima é excluído entre a leitura e a trava: a edição grava no caso certo', () => {
    const t = comVizinhos();
    const linhaAntes = t.porId(t.id).__linha;
    const versao = t.versao();
    const desfazer = t.noMeio(() => t.chamar('apagarRegistroDeVez_')('BASE_RET', t.vizinhos[0]));
    try {
      t.chamar('editarCaso')(t.ret.id, t.id, { nomedocliente: 'Nome certo', status: 'Pendente' }, versao);
    } finally { desfazer(); }
    igual(t.porId(t.id).__linha, linhaAntes - 1, 'a linha do caso subiu');
    igual(String(t.porId(t.id)['nome do cliente']), 'Nome certo', 'e a gravação foi nele');
    igual(String(t.porId(t.vizinhos[1])['nome do cliente']), 'Vizinho de cima 2', 'o vizinho que ocupou a linha antiga ficou intacto');
  });

  teste('um caso acima é excluído entre a leitura e a trava: a troca de status cai no caso certo', () => {
    const t = comVizinhos();
    const desfazer = t.noMeio(() => t.chamar('apagarRegistroDeVez_')('BASE_RET', t.vizinhos[0]));
    try {
      t.chamar('alterarSituacaoDoCaso')(t.ret.id, t.id, 'Não trabalhado', {});
    } finally { desfazer(); }
    igual(String(t.porId(t.id).status), 'Não trabalhado');
    igual(String(t.porId(t.vizinhos[1]).status), 'Pendente', 'o vizinho não teve o status trocado');
  });

  teste('Id repetido (planilha mexida à mão): editar e trocar o status continuam recusando, com o recado', () => {
    const t = comVizinhos();
    const estrutura = t.chamar('estruturaDaAba_')('BASE_RET');
    const coluna = estrutura.cabecalhos.findIndex((c) => c.toLowerCase() === 'id') + 1;
    estrutura.aba.getRange(t.porId(t.vizinhos[1]).__linha, coluna).setValue(t.id);   // o vizinho ganha o mesmo Id
    t.chamar('esquecerEstruturaLida_()');
    contem(lanca(() => t.chamar('editarCaso')(t.ret.id, t.id, { nomedocliente: 'Qual dos dois?', status: 'Pendente' }, '')).message,
      'normalizarBase()');
    contem(lanca(() => t.chamar('alterarSituacaoDoCaso')(t.ret.id, t.id, 'Não trabalhado', {})).message, 'normalizarBase()');
  });

  teste('com a linha já achada, a disputa continua recusada dentro da trava (B1)', () => {
    const t = comVizinhos();
    const daAna = t.versao();
    const doBruno = t.comoBruno(() => t.versao());
    const desfazer = t.noMeio(() => t.comoBruno(() =>
      t.chamar('editarCaso')(t.ret.id, t.id, { nomedocliente: 'Nome do Bruno', status: 'Pendente' }, doBruno)));
    try {
      lanca(() => t.chamar('editarCaso')(t.ret.id, t.id, { nomedocliente: 'Nome da Ana', status: 'Pendente' }, daAna),
        'alterado por outra pessoa');
    } finally { desfazer(); }
    igual(String(t.porId(t.id)['nome do cliente']), 'Nome do Bruno');
    igual(t.ambiente.travasSeguradas, 0);
  });
}

module.exports = { rodarTestesDaGravacaoSimultanea };
