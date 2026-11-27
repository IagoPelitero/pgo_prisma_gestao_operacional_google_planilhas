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
const { secao, teste, igual, verdadeiro, contem, lanca, carregar, comoUsuario } = require('./ferramentas');
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

  /* ----------------------------------------------------------------------- */
  secao('F3 — o rascunho seguro: no servidor, por e-mail, com consentimento');

  const r = carregar('primeiro.adm@exemplo.com');
  r.chamar('instalarRECC()');
  const operacao = r.chamar('lerRegistros_')('CATALOGO').find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
  r.chamar('salvarUsuario')({ nome: 'Diego Castilho', email: 'diego@exemplo.com', nivelAcessoId: operacao.Id, canalId: '', ativo: true });
  const ret = r.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  // Espia o cache: o que é gravado, com qual chave e por quanto tempo.
  const gravados = [];
  const original = r.chamar('CacheService.getScriptCache');
  r.chamar('CacheService').getScriptCache = function () {
    const cache = original();
    return Object.assign({}, cache, { put: (chave, valor, segundos) => { gravados.push({ chave, valor, segundos }); return cache.put(chave, valor, segundos); } });
  };
  const doDiego = (fazer) => comoUsuario(r.ambiente, 'diego@exemplo.com', fazer);

  teste('guarda por 2 horas, com chave que não tem o e-mail escrito', () => {
    r.chamar('guardarRascunho')(ret.id, { nomedocliente: 'Cliente do rascunho', cpf: '123.456.789-01' });
    const ultimo = gravados[gravados.length - 1];
    igual(ultimo.segundos, 7200, '2 horas');
    verdadeiro(/^PGO_RASCUNHO_[0-9a-f]{64}$/.test(ultimo.chave), 'a chave é o resumo SHA-256: ' + ultimo.chave);
    verdadeiro(ultimo.chave.indexOf('primeiro') < 0 && ultimo.chave.indexOf('@') < 0, 'sem o e-mail na chave');
  });

  teste('volta junto com o formulário do Cadastrar — só para quem guardou', () => {
    const meu = r.chamar('formularioDoCanal')(ret.id, true).rascunho;
    igual(meu.valores.nomedocliente, 'Cliente do rascunho');
    verdadeiro(meu.quando > 0, 'com a hora');
    igual(doDiego(() => r.chamar('formularioDoCanal')(ret.id, true).rascunho), null, 'o Diego, no mesmo canal, não vê');
  });

  teste('o modal do "Trabalhar no caso" (sem o pedido) não recebe rascunho nenhum', () => {
    verdadeiro(!('rascunho' in r.chamar('formularioDoCanal')(ret.id)), 'sem a chave rascunho');
  });

  teste('cada pessoa tem o seu: o do Diego não troca o do administrador', () => {
    doDiego(() => r.chamar('guardarRascunho')(ret.id, { nomedocliente: 'Do Diego' }));
    igual(r.chamar('formularioDoCanal')(ret.id, true).rascunho.valores.nomedocliente, 'Cliente do rascunho');
    igual(doDiego(() => r.chamar('formularioDoCanal')(ret.id, true).rascunho.valores.nomedocliente), 'Do Diego');
  });

  teste('apagar tira só o de quem apagou', () => {
    r.chamar('apagarRascunho')(ret.id);
    igual(r.chamar('formularioDoCanal')(ret.id, true).rascunho, null);
    igual(doDiego(() => r.chamar('formularioDoCanal')(ret.id, true).rascunho.valores.nomedocliente), 'Do Diego');
  });

  teste('quebra de propósito: rascunho enorme é recusado, sem guardar pela metade', () => {
    const antes = gravados.length;
    lanca(() => r.chamar('guardarRascunho')(ret.id, { descricao: 'x'.repeat(60 * 1024) }), 'grande demais');
    igual(gravados.length, antes, 'nada gravado');
  });

  teste('quebra de propósito: sem e-mail na sessão, não há rascunho (recusa antes)', () => {
    lanca(() => comoUsuario(r.ambiente, '', () => r.chamar('guardarRascunho')(ret.id, { nomedocliente: 'x' })), 'Acesso negado');
  });

  teste('nada em log: sem auditoria, sem Logger, sem cronômetro nas funções do rascunho', () => {
    const casos = fs.readFileSync(path.join(__dirname, '..', '..', 'Back-End', 'Casos.gs'), 'utf8');
    // Até onde começa o aviso do Chat (Etapa 95), que é outra coisa e registra erro de propósito.
    const fimDoF3 = casos.indexOf('// O AVISO DE RETENÇÃO NO GOOGLE CHAT');
    const f3 = casos.slice(casos.indexOf('var RECC_RASCUNHO_SEGUNDOS'), fimDoF3 > 0 ? fimDoF3 : undefined);
    ['registrarAuditoria_', 'Logger.', 'console.', 'cronometrado_', 'registrarErro'].forEach((proibido) => {
      igual(f3.indexOf(proibido), -1, proibido + ' não aparece');
    });
    ['function guardarRascunho(', 'function apagarRascunho('].forEach((nome) => {
      const corpo = f3.slice(f3.indexOf(nome), f3.indexOf('\n}', f3.indexOf(nome)));
      contem(corpo, 'exigirPermissao_(RECC_ACOES.CRIAR)', nome + ' exige poder cadastrar');
    });
  });

  teste('a tela: a caixa nasce desmarcada, 30 s entre envios, apaga ao cadastrar/limpar/desmarcar', () => {
    const tela = ler('CadastrarCaso.html');
    contem(tela, '<input type="checkbox" id="guardar-rascunho"> Guardar rascunho deste cadastro');
    contem(tela, 'if (caixa) caixa.checked = false;', 'desmarcada a cada formulário');
    contem(tela, 'var SEGUNDOS_ENTRE_RASCUNHOS = 30;');
    contem(tela, 'if (!caixa || !caixa.checked || relogioDoRascunho) return;', 'uma chamada por janela de 30 s');
    contem(tela, 'apagarORascunho();   // F3: cadastrou');
    contem(tela, 'apagarORascunho();   // F3: limpar');
    contem(tela, 'else apagarORascunho();', 'desmarcar apaga');
    contem(tela, "Servidor.chamar('formularioDoCanal', canalEscolhido, true)", 'na mesma viagem do formulário');
    igual((tela.match(/localStorage|sessionStorage|indexedDB/g) || []).length, 0, 'nada no navegador');
  });

  /* ----------------------------------------------------------------------- */
  secao('B6 — auditoria e ERROS: sem perder e sem repetir');

  const a = carregar('primeiro.adm@exemplo.com');
  a.chamar('instalarRECC()');
  const PS = a.chamar('PropertiesService');
  const propriedadesDeVerdade = PS.getScriptProperties;
  let cair = null;   // 'ao tirar' | 'ao gravar' | null
  PS.getScriptProperties = () => {
    const p = propriedadesDeVerdade();
    return Object.assign({}, p, { deleteProperty: (chave) => {
      if (cair === 'ao tirar' && /\.FILA\./.test(chave)) { cair = null; throw new Error('a execução caiu'); }
      return p.deleteProperty(chave);
    } });
  };
  const linhas = (aba) => a.chamar('lerRegistros_')(aba).length;
  const naFila = (prefixo) => Object.keys(propriedadesDeVerdade().getProperties()).filter((k) => k.indexOf(prefixo) === 0).length;
  const enfileirar = (acao) => a.chamar('entrarNaFilaDaAuditoria_')({ DataHora: new Date(), UsuarioId: 'U1', Acao: acao,
    Entidade: 'BASE_RET', RegistroId: '1', Detalhe: '' });

  teste('quebra de propósito: cai DEPOIS de gravar e antes de tirar da fila — a próxima descarga não repete', () => {
    a.chamar('descarregarAFilaDaAuditoria_')(0);
    const antes = linhas('AUDITORIA');
    ['teste.a', 'teste.b', 'teste.c'].forEach(enfileirar);
    cair = 'ao tirar';
    lanca(() => a.chamar('descarregarAFilaDaAuditoria_')(0), 'caiu');
    igual(linhas('AUDITORIA'), antes + 3, 'o lote foi gravado antes de cair');
    verdadeiro(naFila('AUDITORIA.FILA.') >= 2, 'e ficou (quase todo) na fila');
    verdadeiro(!!propriedadesDeVerdade().getProperty('AUDITORIA.LOTE'), 'com a marca do lote');
    a.chamar('descarregarAFilaDaAuditoria_')(0);
    igual(linhas('AUDITORIA'), antes + 3, 'NADA repetido');
    igual(naFila('AUDITORIA.FILA.'), 0, 'a fila esvaziou');
    igual(propriedadesDeVerdade().getProperty('AUDITORIA.LOTE'), null, 'e a marca saiu');
  });

  teste('quebra de propósito: cai ANTES de gravar — a próxima descarga grava, uma vez só', () => {
    const antes = linhas('AUDITORIA');
    ['teste.d', 'teste.e'].forEach(enfileirar);
    const inserir = a.chamar('inserirComATravaNaMao_');
    a.chamar('(function (f) { inserirComATravaNaMao_ = f; })')(() => { throw new Error('a planilha não respondeu'); });
    lanca(() => a.chamar('descarregarAFilaDaAuditoria_')(0), 'não respondeu');
    a.chamar('(function (f) { inserirComATravaNaMao_ = f; })')(inserir);
    igual(linhas('AUDITORIA'), antes, 'nada gravado');
    igual(naFila('AUDITORIA.FILA.'), 2, 'nada perdido: a fila está inteira');
    a.chamar('descarregarAFilaDaAuditoria_')(0);
    igual(linhas('AUDITORIA'), antes + 2, 'gravado uma vez');
    igual(naFila('AUDITORIA.FILA.'), 0);
  });

  teste('a aba ERROS tem a mesma proteção', () => {
    a.chamar('descarregarAFilaDosErros_')(0);
    const antes = linhas('ERROS');
    a.chamar('registrarErro_')('servidor', 'teste-b6', 'erro de teste ' + Date.now(), '');   // já tenta descarregar
    const depoisDoPrimeiro = linhas('ERROS');
    a.chamar('registrarErro_')('servidor', 'teste-b6', 'outro erro de teste ' + Date.now(), '');
    verdadeiro(linhas('ERROS') >= depoisDoPrimeiro, 'os erros chegam à aba');
    // Cai ao tirar da fila:
    propriedadesDeVerdade().setProperty('ERROS.FILA.9999999999999.0001teste', JSON.stringify({ d: Date.now(), u: '', o: 'servidor', w: 'teste-b6', m: 'na fila', t: '' }));
    const meio = linhas('ERROS');
    cair = 'ao tirar';
    lanca(() => a.chamar('descarregarAFilaDosErros_')(0), 'caiu');
    a.chamar('descarregarAFilaDosErros_')(0);
    igual(linhas('ERROS'), meio + 1, 'gravado uma vez, sem repetir');
    verdadeiro(antes <= linhas('ERROS'));
  });

  teste('a descarga normal não deixa marca sobrando', () => {
    enfileirar('teste.f');
    a.chamar('descarregarAFilaDaAuditoria_')(0);
    igual(propriedadesDeVerdade().getProperty('AUDITORIA.LOTE'), null);
    igual(propriedadesDeVerdade().getProperty('ERROS.LOTE'), null);
  });
  PS.getScriptProperties = propriedadesDeVerdade;
}

module.exports = { rodarTestesDeUX190 };
