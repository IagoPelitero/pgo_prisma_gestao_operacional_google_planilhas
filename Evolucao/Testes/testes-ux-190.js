/**
 * ============================================================================
 * PGO — testes-ux-190.js · as melhorias de uso da Etapa 90
 * ============================================================================
 * F8  depois de gravar, a tela diz onde o caso foi parar ("Agora está em
 *     Casos concluídos"), pela MESMA regra que monta a fila.
 * F15 mensagens claras (o tempo esgotado ao salvar não manda repetir às cegas).
 * F16 o erro fica até a pessoa fechar; o sucesso some sozinho.
 * F17 o foco fica preso no modal e volta para onde estava ao fechar.
 * F18 ARIA nos carregamentos, avisos, confirmações, obrigatórios e modais.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { secao, teste, igual, verdadeiro, contem } = require('./ferramentas');
const { retDoPO, comCasos } = require('./testes-sub-abas-do-trabalho');

const ler = (nome) => fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

function rodarTestesDeUX190() {
  console.log('\nEtapa 90: as melhorias de uso');

  /* ----------------------------------------------------------------------- */
  secao('F8 — o caso diz para onde foi');

  const t = retDoPO();
  comCasos(t);
  const idDe = (nome) => t.chamar('lerRegistros_')('BASE_RET').find((c) => c['nome do cliente'] === 'Caso ' + nome).__id;
  const [aba1, aba2] = JSON.parse(t.canal().SubAbasDoTrabalho || t.canal().subAbasDoTrabalho || '{"abas":[]}').abas;

  teste('Alterar status: de Pendente para Pago, o caso vai para a aba 2 — e a resposta diz o nome dela', () => {
    const r = t.chamar('alterarSituacaoDoCaso')(t.ret.id, idDe('P1'), 'Pago', {});
    igual(r.destino, aba2 || 'Casos concluídos');
    // A fila confirma: o caso está mesmo na aba 2.
    verdadeiro(t.nomes(t.resumo(2)).indexOf('Caso P1') >= 0, 'a fila da aba 2 tem o caso');
  });

  teste('e voltando para Pendente, volta para a aba 1 — o destino acompanha', () => {
    const r = t.chamar('alterarSituacaoDoCaso')(t.ret.id, idDe('P1'), 'Pendente', {});
    igual(r.destino, aba1 || 'Casos em aberto');
    verdadeiro(t.nomes(t.resumo(1)).indexOf('Caso P1') >= 0, 'a fila da aba 1 tem o caso');
  });

  teste('Trabalhar no caso (o formulário inteiro) também devolve o destino', () => {
    const id = idDe('P2');
    const caso = t.chamar('casoParaEditar')(t.ret.id, id);
    const valores = Object.assign({}, caso.valores || caso);
    valores.status = 'Pago';
    // O analista do caso de teste não é um usuário deste cenário: uma opção válida da lista.
    const form = t.chamar('formularioDoCanal')(t.ret.id);
    const analista = [].concat.apply([], form.secoes.map((s) => s.campos)).find((c) => c.chave === 'analista');
    if (analista && analista.opcoes && analista.opcoes.length) valores.analista = analista.opcoes[0].valor;
    const r = t.chamar('editarCaso')(t.ret.id, id, valores, caso.versao || '', {}, '');
    igual(r.destino, aba2 || 'Casos concluídos');
  });

  teste('o destino é calculado DEPOIS de gravar e nunca derruba a gravação', () => {
    const casos = fs.readFileSync(path.join(__dirname, '..', '..', 'Back-End', 'Casos.gs'), 'utf8');
    const funcao = casos.slice(casos.indexOf('function destinoDepoisDeGravar_'), casos.indexOf('\n}\n', casos.indexOf('function destinoDepoisDeGravar_')));
    contem(funcao, 'try {');
    contem(funcao, "} catch (semDestino) {\n    return '';");
    contem(funcao, 'lugarDoRegistro_(depois, canal, sub)', 'a mesma regra da fila');
  });

  teste('a tela do Trabalho diz "Caso N atualizado. Agora está em …"; as outras telas seguem como antes', () => {
    const trabalho = ler('Trabalho.html');
    contem(trabalho, "Moldura.toast('Caso ' + gravado.id + ' atualizado.'");
    contem(trabalho, "(gravado.destino ? ' Agora está em ' + gravado.destino + '.' : '')");
    contem(ler('Comuns.html'), 'oQueGravou: oQueGravou');
  });

  /* ----------------------------------------------------------------------- */
  secao('F16 — o erro fica até fechar; o sucesso some sozinho');

  teste('o aviso de erro é persistente, com ✕ e role="alert"; os outros somem', () => {
    const comuns = ler('Comuns.html');
    contem(comuns, "var persistente = tom === 'ruim';");
    contem(comuns, "aviso.setAttribute('role', persistente ? 'alert' : 'status');");
    contem(comuns, "fechar.setAttribute('aria-label', 'Fechar aviso');");
    contem(comuns, 'if (!persistente) window.setTimeout(tirar, 4500);');
  });

  /* ----------------------------------------------------------------------- */
  secao('F15 — o tempo esgotado em palavras de quem usa');

  teste('a gravação "pode ter sido concluída" e pede para conferir; o técnico só para quem configura', () => {
    const app = ler('Aplicacao.html');
    contem(app, 'A gravação está demorando mais que o normal e pode ter sido concluída.');
    contem(app, 'Antes de salvar de novo, atualize a tela e confira se a alteração já aparece.');
    contem(app, "Servidor.comDetalheTecnico(podeVer('configuracoes'));");
    contem(app, "avisarErro('tempo',", 'o detalhe técnico vai para a aba ERROS');
  });

  /* ----------------------------------------------------------------------- */
  secao('F17 — o foco preso no diálogo, e devolvido ao fechar');

  teste('um guardião só, para todos os diálogos: só a tecla Tab, e a volta do foco', () => {
    const comuns = ler('Comuns.html');
    contem(comuns, "if (evento.key !== 'Tab') return;", 'Esc, Ctrl+Enter e os atalhos não passam por aqui');
    contem(comuns, "document.querySelectorAll('.dialogo [aria-modal=\"true\"]')", 'o diálogo de cima');
    contem(comuns, 'new MutationObserver(quandoODomMudar)');
    contem(comuns, "alvo.focus({ preventScroll: true });");
  });

  /* ----------------------------------------------------------------------- */
  secao('F18 — ARIA');

  teste('todo "carregando" das telas tem role; o erro do campo é a descrição dele', () => {
    ['Trabalho.html', 'CadastrarCaso.html', 'BuscarCaso.html', 'Produtividade.html', 'Configuracoes.html',
      'Importacao.html', 'TabelaCorretoras.html', 'Comuns.html', 'Aplicacao.html'].forEach((nome) => {
      igual((ler(nome).match(/<p class="carregando-campos">/g) || []).length, 0, nome + ' sem carregando mudo');
    });
    const comuns = ler('Comuns.html');
    contem(comuns, "' aria-describedby=\"' + id + '-erro\" data-chave=\"'");
    contem(comuns, "'<small class=\"erro\" id=\"' + id + '-erro\" hidden></small>'");
    contem(comuns, "controle.setAttribute('aria-invalid', 'true');   // F18");
  });

  teste('todo diálogo tem nome (aria-labelledby)', () => {
    ['Comuns.html', 'Produtividade.html', 'TabelaCorretoras.html', 'Trabalho.html'].forEach((nome) => {
      const texto = ler(nome);
      // Sem contar o seletor do guardião do foco ([aria-modal="true"]), que não é diálogo.
      const dialogos = texto.split('aria-modal="true"').length - 1 - texto.split('[aria-modal="true"]').length + 1;
      const comNome = (texto.match(/aria-modal="true"[^>]{0,40}?'?\s*\+?\s*'?\s*aria-labelledby=|aria-labelledby="[^"]+"[^>]{0,40}aria-modal="true"|aria-modal="true"'\s*\n\s*\+ ' aria-labelledby=/g) || []).length;
      verdadeiro(comNome >= dialogos, nome + ': ' + comNome + ' de ' + dialogos + ' diálogos com nome');
    });
  });

  /* ----------------------------------------------------------------------- */
  secao('F10 — Salvar e abrir o próximo');

  teste('o próximo é decidido no clique, pela fila da tela, e só abre depois de gravar', () => {
    const comuns = ler('Comuns.html');
    const salvar = comuns.slice(comuns.indexOf('function salvar(eAbrirOProximo)'), comuns.indexOf('function destravarOsBotoes'));
    verdadeiro(salvar.indexOf('qualOProximo(idAtual)') < salvar.indexOf("Servidor.chamar('editarCaso'"), 'decidido antes de gravar');
    const entao = salvar.slice(salvar.indexOf('.entao('), salvar.indexOf('.senao('));
    contem(entao, 'abrir(canal, proximo, retorno, proximoDe);', 'abre no sucesso');
    contem(entao, 'Este era o último caso da fila desta tela', 'sem próximo, avisa');
    verdadeiro(salvar.slice(salvar.indexOf('.senao(')).indexOf('abrir(') < 0, 'no erro (e no conflito), não abre nada');
    contem(comuns, "elemento('modal-salvar').addEventListener('click', function () { salvar(false); });",
      'o Salvar de sempre continua o de sempre');
  });

  teste('só o Trabalho oferece o botão: a ordem é a da fila que está na tela', () => {
    const trabalho = ler('Trabalho.html');
    contem(trabalho, "document.querySelectorAll('.fila-do-trabalho [data-trabalhar]')");
    contem(trabalho, "CasoEmModal.abrir(canalEscolhido, botao.getAttribute('data-trabalhar'), depoisDeGravar,\n        proximoDaFila);");
    contem(ler('BuscarCaso.html'), 'CasoEmModal.abrir(canal, caso, procurarDeNovo);', 'a Busca sem o botão');
  });
}

module.exports = { rodarTestesDeUX190 };
