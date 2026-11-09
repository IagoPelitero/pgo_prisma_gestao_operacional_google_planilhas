/**
 * ============================================================================
 * PGO — testes-cronometro.js · o cronômetro das chamadas lentas (Etapa 71)
 * ============================================================================
 * O PO relatou o erro dos 40 segundos atrapalhando a equipe, com a RET em 3 mil
 * linhas — volume em que a conta do código não chega perto disso. O sistema
 * passa a medir: a chamada lenta vai para a aba ERROS dizendo quanto foi
 * esperando a trava e quanto foi lendo a planilha; a tela avisa quanto ELA
 * esperou.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem } = require('./ferramentas');

const tela = (nome) => fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', nome + '.html'), 'utf8');

/** Um sistema em que o teste manda no relógio. */
function preparar() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  t.agora = 1000000;
  t.contexto.agoraEmMs_ = () => t.agora;
  t.lentos = () => {
    t.chamar('descarregarAFilaDosErros_')(0);
    return t.chamar('lerRegistros_')('ERROS').filter((e) => e.Origem === 'lento');
  };
  return t;
}

function rodarTestesDoCronometro() {
  console.log('\nEtapa 71: o cronômetro das chamadas lentas');

  /* ----------------------------------------------------------------------- */
  secao('O servidor mede a própria chamada');

  teste('chamada rápida não deixa rastro', () => {
    const t = preparar();
    t.chamar('resumoDoCanal')(t.ret.id, {});
    igual(t.lentos().length, 0);
  });

  teste('chamada que passa de 8 s vai para a aba ERROS, com o nome dela', () => {
    const t = preparar();
    const ler = t.contexto.lerRegistrosSemRelogio_;
    // A planilha "demora" 9 segundos na primeira leitura.
    let demorou = false;
    t.contexto.lerRegistrosSemRelogio_ = function () {
      if (!demorou) { demorou = true; t.agora += 9000; }
      return ler.apply(null, arguments);
    };
    t.chamar('resumoDoCanal')(t.ret.id, {});
    const lentos = t.lentos();
    igual(lentos.length, 1);
    igual(lentos[0].Onde, 'resumoDoCanal');
    contem(lentos[0].Mensagem, 'Levou 9 s no servidor');
    contem(lentos[0].Mensagem, '9 s lendo a planilha', 'e diz que foi a leitura');
    contem(lentos[0].Mensagem, '0 s esperando a trava');
  });

  teste('a espera pela trava é contada à parte', () => {
    const t = preparar();
    const trava = { tryLock: () => { t.agora += 12000; return true; }, releaseLock: () => {} };
    t.chamar('cronometrado_')('gravacaoDeTeste', () => t.chamar('esperarATrava_')(trava, 25000), []);
    const lentos = t.lentos();
    igual(lentos.length, 1);
    contem(lentos[0].Mensagem, 'Levou 12 s no servidor: 12 s esperando a trava, 0 s lendo a planilha');
  });

  teste('as gravações esperam a trava pelo cronômetro', () => {
    const servidor = ['Base.gs', 'Config.gs'].map((nome) =>
      fs.readFileSync(path.join(__dirname, '..', '..', 'Back-End', nome), 'utf8')).join('\n');
    verdadeiro(!/trava\.tryLock\((25000|30000)\)/.test(servidor), 'nenhuma espera longa fora do cronômetro');
    verdadeiro(servidor.split('esperarATrava_(trava, ').length - 1 >= 9);
  });

  teste('chamada dentro de chamada conta uma vez, a de fora', () => {
    const t = preparar();
    t.chamar('cronometrado_')('deFora', () => {
      t.chamar('cronometrado_')('deDentro', () => { t.agora += 10000; }, []);
    }, []);
    igual(t.lentos().map((e) => e.Onde).join('|'), 'deFora');
  });

  teste('leitura dentro de leitura não conta em dobro', () => {
    const t = preparar();
    t.chamar('cronometrado_')('leituras', () => {
      t.chamar('lendoAPlanilha_')(() => {
        t.agora += 5000;
        t.chamar('lendoAPlanilha_')(() => { t.agora += 5000; }, []);
      }, []);
    }, []);
    contem(t.lentos()[0].Mensagem, '10 s lendo a planilha');
  });

  teste('o erro da chamada passa adiante, e o relógio não fica preso', () => {
    const t = preparar();
    let recado = '';
    try { t.chamar('cronometrado_')('quebra', () => { throw new Error('quebrou'); }, []); }
    catch (erro) { recado = erro.message; }
    igual(recado, 'quebrou');
    igual(t.chamar('RECC_RELOGIO'), null);
  });

  teste('o limite se ajusta na CONFIG', () => {
    const t = preparar();
    t.chamar('gravarConfiguracao_')('OPERACAO.SEGUNDOS_DA_CHAMADA_LENTA', '3');
    t.chamar('cronometrado_')('quatroSegundos', () => { t.agora += 4000; }, []);
    igual(t.lentos().length, 1);
  });

  teste('as chamadas do dia a dia passam pelo cronômetro', () => {
    const t = preparar();
    ['resumoDoCanal', 'produtividadeDaEquipe', 'detalharComponente', 'casoParaEditar', 'editarCaso',
      'alterarSituacaoDoCaso', 'cadastrarCaso', 'buscarCasos', 'formularioDoCanal', 'pacoteDePartida']
      .forEach((nome) => contem(String(t.chamar(nome)), "cronometrado_('" + nome + "'", nome));
  });

  /* ----------------------------------------------------------------------- */
  secao('A tela mede a espera dela');

  teste('a tela avisa quando esperou mais de 8 s — menos nas chamadas sem pressa', () => {
    const aplicacao = tela('Aplicacao');
    contem(aplicacao, 'if (milissegundos < SEGUNDOS_DA_CHAMADA_LENTA * 1000) return;');
    contem(aplicacao, "avisarErro('lento', 'A tela esperou '");
    contem(aplicacao, 'if (segundosAteDesistir === SEGUNDOS_ATE_DESISTIR) avisarSeDemorou(');
  });

  teste('Configurações explica como ler as duas metades', () => {
    contem(tela('Configuracoes'), 'é fila do Google');
  });
}

module.exports = { rodarTestesDoCronometro };
