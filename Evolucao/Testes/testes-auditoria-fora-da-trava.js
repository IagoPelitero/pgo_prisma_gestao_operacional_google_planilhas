/**
 * ============================================================================
 * PGO — testes-auditoria-fora-da-trava.js · ninguém espera pela auditoria (Etapa 61)
 * ============================================================================
 * Achado da análise de 29/10: a trava de gravação é uma só para o sistema
 * inteiro, e a auditoria passava por ela. Quem só buscava um caso esperava na
 * fila de quem gravava, e quem cadastrava passava pela trava duas vezes — até
 * 50 segundos, mais que os 40 da tela. A escolha do PO: buscar e exportar
 * continuam na auditoria, mas fora da fila, gravados em lote.
 *
 * E a segunda metade: achar a linha de um caso (ler a coluna de Id inteira)
 * saiu de dentro da trava; lá dentro, só se confere uma célula.
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro, contem } = require('./ferramentas');

function preparar() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  t.auditoria = () => t.chamar('lerRegistros_')('AUDITORIA');
  t.fila = () => t.chamar('tamanhoDaFilaDaAuditoria_()');
  t.registrar = (acao, detalhe) => t.chamar('registrarAuditoria_')(acao, 'TESTE', '', detalhe || '');
  return t;
}

/** Quantas células cada ação lê ENQUANTO segura a trava. */
function medirDentroDaTrava(t, fazer) {
  const original = t.ambiente.globais.LockService;
  const medidor = t.ambiente.medidor;
  const dentro = { celulas: 0, vezes: 0 };
  let inicio = null;
  t.ambiente.globais.LockService = { getScriptLock: () => ({
    tryLock: () => { inicio = medidor.retrato().celulasLidas; dentro.vezes++; return true; },
    waitLock: () => true,
    releaseLock: () => {
      if (inicio !== null) { dentro.celulas += medidor.retrato().celulasLidas - inicio; inicio = null; }
    }
  }) };
  try { fazer(); } finally { t.ambiente.globais.LockService = original; }
  return dentro;
}

function rodarTestesDaAuditoriaForaDaTrava() {
  console.log('\nEtapa 61: a auditoria fora da trava, em lote');

  /* ----------------------------------------------------------------------- */
  secao('Com a trava livre, nada muda para quem olha');

  teste('o registro chega à aba na hora, e a fila fica vazia', () => {
    const t = preparar();
    const antes = t.auditoria().length;
    t.registrar('teste.livre');
    igual(t.auditoria().length, antes + 1);
    igual(t.fila(), 0);
  });

  /* ----------------------------------------------------------------------- */
  secao('Com a trava ocupada, ninguém espera');

  teste('buscar com a planilha ocupada: não espera a trava, e o registro vai para a fila', () => {
    const t = preparar();
    const antes = t.auditoria().length;
    t.ambiente.travaOcupada = true;
    t.ambiente.esperasDaTrava.length = 0;
    t.chamar('buscarCasos')('qualquer coisa', [], false);
    t.ambiente.travaOcupada = false;
    verdadeiro(t.ambiente.esperasDaTrava.length > 0, 'a auditoria tentou a trava');
    verdadeiro(t.ambiente.esperasDaTrava.every((ms) => ms === 0), 'e não esperou: '
      + t.ambiente.esperasDaTrava.join(','));
    igual(t.auditoria().length, antes, 'a aba não foi tocada');
    igual(t.fila(), 1, 'o registro está guardado na fila');
  });

  teste('o próximo registro com a trava livre grava a fila inteira, em ordem de hora', () => {
    const t = preparar();
    t.ambiente.travaOcupada = true;
    t.registrar('teste.primeiro');
    t.registrar('teste.segundo');
    t.ambiente.travaOcupada = false;
    igual(t.fila(), 2);
    t.registrar('teste.terceiro');
    igual(t.fila(), 0);
    const acoes = t.auditoria().map((l) => l.Acao).filter((a) => /^teste\./.test(a));
    igual(acoes.join(','), 'teste.primeiro,teste.segundo,teste.terceiro');
  });

  teste('cadastrar espera a trava UMA vez (o caso), e não duas (o caso e a auditoria)', () => {
    const t = preparar();
    t.ambiente.esperasDaTrava.length = 0;
    t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Uma trava', status: 'Pendente' });
    igual(t.ambiente.esperasDaTrava.filter((ms) => ms > 0).length, 1,
      'esperas: ' + t.ambiente.esperasDaTrava.join(','));
  });

  teste('o registro grande demais para a fila (o caso excluído inteiro) vai direto, como era', () => {
    const t = preparar();
    const antes = t.auditoria().length;
    t.registrar('teste.grande', 'x'.repeat(9000));
    igual(t.auditoria().length, antes + 1);
    igual(t.fila(), 0);
  });

  teste('a gravação que falha deixa a fila inteira para a próxima vez', () => {
    const t = preparar();
    t.ambiente.travaOcupada = true;
    t.registrar('teste.guardado');
    t.ambiente.travaOcupada = false;
    t.chamar('var __gravarDeVerdade = inserirComATravaNaMao_; '
      + 'inserirComATravaNaMao_ = function () { throw new Error("planilha fora do ar"); };');
    t.registrar('teste.outro');   // não estoura: a auditoria nunca derruba a operação
    igual(t.fila(), 2, 'nada se perdeu');
    t.chamar('inserirComATravaNaMao_ = __gravarDeVerdade;');
    t.registrar('teste.volta');
    igual(t.fila(), 0);
    contem(t.auditoria().map((l) => l.Acao).join(','), 'teste.guardado,teste.outro,teste.volta');
  });

  teste('lixo na fila sai sem derrubar a descarga', () => {
    const t = preparar();
    t.ambiente.globais.PropertiesService.getScriptProperties()
      .setProperty('AUDITORIA.FILA.0000000000001.lixo', '{isto não é json');
    t.registrar('teste.depois-do-lixo');
    igual(t.fila(), 0);
    contem(t.auditoria().map((l) => l.Acao).join(','), 'teste.depois-do-lixo');
  });

  /* ----------------------------------------------------------------------- */
  secao('Quem lê a auditoria descarrega antes');

  teste('a trilha de Configurações mostra o que estava na fila', () => {
    const t = preparar();
    t.ambiente.travaOcupada = true;
    t.registrar('teste.na-fila');
    t.ambiente.travaOcupada = false;
    contem(JSON.stringify(t.chamar('listarAuditoria')(20)), 'teste.na-fila');
    igual(t.fila(), 0);
  });

  teste('o atualizarPGO descarrega a fila e diz quantos', () => {
    const t = preparar();
    t.ambiente.travaOcupada = true;
    t.registrar('teste.a');
    t.registrar('teste.b');
    t.ambiente.travaOcupada = false;
    contem(t.chamar('atualizarPGO()'), '2 registro(s) da fila da auditoria gravados');
  });

  teste('o diagnóstico mostra a fila — e avisa quando ela não se esvazia', () => {
    const t = preparar();
    const itemDaFila = () => t.chamar('diagnosticoDoSistema')().blocos
      .find((b) => b.chave === 'ambiente').itens.find((i) => /Fila da auditoria/.test(i.oQue));
    igual(itemDaFila().situacao, 'ok');
    const props = t.ambiente.globais.PropertiesService.getScriptProperties();
    for (let i = 0; i < 205; i++) {
      props.setProperty('AUDITORIA.FILA.' + String(1000 + i).padStart(13, '0') + '.x', '{"a":"x"}');
    }
    t.ambiente.travaOcupada = true;   // o diagnóstico não consegue descarregar
    const item = itemDaFila();
    t.ambiente.travaOcupada = false;
    igual(item.situacao, 'atencao');
    contem(item.comoArrumar, 'atualizarPGO');
  });

  /* ----------------------------------------------------------------------- */
  secao('Menos tempo dentro da trava');

  teste('mudar o status lê só um punhado de células com a trava na mão', () => {
    const t = preparar();
    const lote = Array.from({ length: 3000 }, (_, i) => ({ 'nome do cliente': 'Volume ' + i, status: 'Pendente' }));
    t.chamar('inserirVariosRegistros_')('BASE_RET', lote);
    const caso = t.chamar('lerRegistros_')('BASE_RET', { ultimas: 1 })[0];
    const dentro = medirDentroDaTrava(t, () =>
      t.chamar('alterarSituacaoDoCaso')(t.ret.id, caso.__id, 'Pago', {}));
    verdadeiro(dentro.vezes >= 1);
    verdadeiro(dentro.celulas < 500, dentro.celulas + ' células dentro da trava (antes: a coluna de Id inteira, 3.000+)');
  });

  teste('a linha achada antes da trava é conferida dentro: com exclusão no meio, acha a certa', () => {
    const t = preparar();
    const a = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Fica em cima', status: 'Pendente' });
    const b = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Desce uma', status: 'Pendente' });
    const antes = t.chamar('linhaProcuradaAntesDaTrava_')('BASE_RET', b.id);
    t.chamar('apagarRegistroDeVez_')('BASE_RET', a.id);   // a linha de B sobe
    t.chamar('esquecerEstruturaLida_')('BASE_RET');
    const estrutura = t.chamar('estruturaDaAba_')('BASE_RET', true);
    const conferida = t.chamar('linhaConferidaNaTrava_')(estrutura, b.id, antes);
    igual(conferida, antes - 1, 'subiu uma linha, e a conferência percebeu');
    t.chamar('atualizarRegistro_')('BASE_RET', b.id, { status: 'Pago' });
    igual(t.chamar('lerRegistros_')('BASE_RET').find((l) => String(l.__id) === String(b.id)).status, 'Pago');
  });
}

module.exports = { rodarTestesDaAuditoriaForaDaTrava };
