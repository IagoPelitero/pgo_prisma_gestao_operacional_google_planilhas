/**
 * ============================================================================
 * PGO — testes-fuso-do-projeto.js · o fuso do PROJETO, e não só o da planilha (Etapa 60)
 * ============================================================================
 * Achado da análise de 29/10: as datas digitadas viram data no fuso do projeto
 * do Apps Script, e o sistema as lê no de São Paulo. Projeto fora dele faz toda
 * data recuar um dia, sem erro nenhum — e o diagnóstico só conferia o fuso da
 * planilha.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem } = require('./ferramentas');

const RAIZ = path.join(__dirname, '..', '..');

function itemDoFuso(t) {
  const ambiente = t.chamar('diagnosticoDoSistema')().blocos.find((b) => b.chave === 'ambiente');
  return ambiente.itens.find((i) => /fuso do projeto|projeto do Apps Script/.test(i.oQue));
}

function rodarTestesDoFusoDoProjeto() {
  console.log('\nEtapa 60: o fuso do projeto do Apps Script');

  /* ----------------------------------------------------------------------- */
  secao('O diagnóstico confere');

  teste('projeto em São Paulo: OK', () => {
    const t = carregar('primeiro.adm@exemplo.com');
    t.chamar('instalarRECC()');
    const item = itemDoFuso(t);
    igual(item.situacao, 'ok');
    contem(item.oQue, 'America/Sao_Paulo');
  });

  teste('projeto em outro fuso: FALHA, com o que acontece e como acertar', () => {
    const t = carregar('primeiro.adm@exemplo.com');
    t.chamar('instalarRECC()');
    t.ambiente.fusoDoProjeto = 'Etc/UTC';
    const item = itemDoFuso(t);
    igual(item.situacao, 'falha');
    contem(item.detalhe, '"Etc/UTC"');
    contem(item.detalhe, 'recua um dia');
    contem(item.comoArrumar, 'Configurações do projeto');
    contem(item.comoArrumar, 'appsscript.json');
  });

  teste('fuso que não se consegue ler: atenção, e não OK calado', () => {
    const t = carregar('primeiro.adm@exemplo.com');
    t.chamar('instalarRECC()');
    t.ambiente.fusoDoProjeto = '';
    igual(itemDoFuso(t).situacao, 'atencao');
  });

  /* ----------------------------------------------------------------------- */
  secao('O atualizarPGO avisa (o fuso do projeto não se acerta por código)');

  teste('em outro fuso, o laudo diz o que fazer', () => {
    const t = carregar('primeiro.adm@exemplo.com');
    t.chamar('instalarRECC()');
    t.ambiente.fusoDoProjeto = 'America/New_York';
    contem(t.chamar('atualizarPGO()'), 'O projeto do Apps Script está no fuso "America/New_York"');
  });

  teste('em São Paulo, nada a dizer', () => {
    const t = carregar('primeiro.adm@exemplo.com');
    t.chamar('instalarRECC()');
    verdadeiro(t.chamar('atualizarPGO()').indexOf('O projeto do Apps Script está no fuso') < 0);
  });

  /* ----------------------------------------------------------------------- */
  secao('O manifesto vai junto');

  teste('Back-End/appsscript.json: São Paulo e V8', () => {
    const manifesto = JSON.parse(fs.readFileSync(path.join(RAIZ, 'Back-End', 'appsscript.json'), 'utf8'));
    igual(manifesto.timeZone, 'America/Sao_Paulo');
    igual(manifesto.runtimeVersion, 'V8');
  });

  teste('o pacote leva o manifesto, e o passo a passo manda acertar o fuso', () => {
    const pacote = path.join(RAIZ, 'Evolucao', 'pacote');
    igual(fs.readFileSync(path.join(pacote, 'appsscript.json'), 'utf8'),
      fs.readFileSync(path.join(RAIZ, 'Back-End', 'appsscript.json'), 'utf8'));
    const comoUsar = fs.readFileSync(path.join(pacote, 'COMO-USAR.txt'), 'utf8');
    contem(comoUsar, 'O FUSO DO PROJETO');
    contem(comoUsar, 'Horário de Brasília - São Paulo');
  });
}

module.exports = { rodarTestesDoFusoDoProjeto };
