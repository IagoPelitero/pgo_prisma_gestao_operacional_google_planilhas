/**
 * ============================================================================
 * PGO — testes-chat-da-mesa.js · os atendidos da Mesa: sistema + planilha do chat
 * ============================================================================
 * Pedido do PO: "implemente na Produtividade RECC, para a Mesa Diamante, a
 * leitura de uma planilha apartada de casos atendidos pelo chat" e, na
 * Produtividade da Mesa, "os gráficos de atendidos, somando os casos
 * cadastrados no sistema e os casos atendidos por nome do analista, integrando
 * o nome da corretora para mostrar a quantidade e o top 5; SUSEPs, assuntos,
 * consultor e vida individual ou em grupo, a mesma coisa".
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario } =
  require('./ferramentas');

const lerTela = (nome) => fs.readFileSync(
  path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

const COLUNAS = { data: 'Data', analista: 'Atendente', susep: 'SUSEP',
  assunto: 'Assunto', ramo: 'Ramo' };

const comZero = (n) => (n < 10 ? '0' : '') + n;
const diasAtras = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return comZero(d.getDate()) + '/' + comZero(d.getMonth() + 1) + '/' + d.getFullYear();
};
const dataDe = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
};

/**
 * Uma Mesa com cadastro de corretoras, três analistas e uma planilha de chat.
 * `linhas` são as linhas do chat SEM o cabeçalho.
 */
function mesaComChat(linhas) {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.mesa = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');

  t.chamar('inserirVariosRegistros_')('CORRETORAS', [
    { SUSEP: 'RET00J', Corretora: 'Corretora ABC', Sucursal: '12', Segmento: 'Diamante',
      Consultor: 'Marina Alencar' },
    { SUSEP: 'RET01A', Corretora: 'Corretora Horizonte', Sucursal: '12', Segmento: 'Diamante',
      Consultor: 'Rogério Pinto' },
    { SUSEP: 'RET03C', Corretora: 'Corretora Novo Norte', Sucursal: '58',
      Segmento: 'Demais corretoras', Consultor: '' }
  ]);

  const operacao = t.chamar('lerRegistros_')('CATALOGO')
    .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id;
  [['Ana Martins', 'ana@exemplo.com'], ['Diego Castilho', 'diego@exemplo.com']].forEach(([nome, email]) => {
    t.chamar('salvarUsuario')({ nome, email, nivelAcessoId: operacao, canalId: t.mesa.id, ativo: true });
  });

  t.idDoChat = t.ambiente.criarPlanilhaExterna('Chat', [
    ['Data', 'Atendente', 'SUSEP', 'Assunto', 'Ramo']].concat(linhas || []));
  t.ligar = (extra) => t.chamar('salvarConfiguracaoDoChat')(Object.assign(
    { planilhaId: t.idDoChat, aba: 'Chat', colunas: COLUNAS }, extra || {}));
  t.painel = (periodo) => t.chamar('produtividadeDaEquipe')(t.mesa.id, {}, periodo || 30);
  t.grafico = (painel, titulo) => painel.atendimentos.graficos.find((g) => g.titulo === titulo);
  t.pontos = (grafico) => grafico.pontos.map((p) => p.rotulo + ':' + p.sistema + '+' + p.chat);
  t.caso = (extra) => t.chamar('inserirRegistro_')('BASE_MESA', Object.assign({
    Analista: 'Ana Martins', Status: 'Em andamento', 'Data de entrada': dataDe(1),
    'Nome do segurado': 'Segurado' }, extra));
  return t;
}

function rodarTestesDoChatDaMesa() {
  console.log('\nOs atendidos da Mesa: o sistema e a planilha do chat');

  /* ----------------------------------------------------------------------- */
  secao('Ligar a planilha do chat, em Configurações');

  teste('de fábrica ela está desligada, e a tela sabe quais colunas pedir', () => {
    const t = mesaComChat();
    const configuracao = t.chamar('configuracaoDoChat')();
    igual(configuracao.ligado, false);
    igual(configuracao.definicao.map((d) => d.chave).join(','),
      'data,analista,susep,corretora,assunto,consultor,ramo');
    igual(configuracao.definicao.filter((d) => d.obrigatoria).map((d) => d.chave).join(','),
      'data,analista', 'só a data e o analista são obrigatórios');
  });

  teste('salvar confere a planilha, a aba e as colunas, e guarda', () => {
    const t = mesaComChat();
    const nova = t.ligar();
    igual(nova.ligado, true);
    igual(nova.aba, 'Chat');
    igual(nova.colunas.analista, 'Atendente');
    igual(t.chamar('configuracaoDoChat')().planilhaId, t.idDoChat, 'e relê o que gravou');
  });

  teste('recusa Id que não abre, aba que não existe e coluna que não existe', () => {
    const t = mesaComChat();
    lanca(() => t.ligar({ planilhaId: 'nao-existe' }), 'Não consegui abrir');
    lanca(() => t.ligar({ aba: 'Outra aba' }), 'não tem uma aba chamada "Outra aba"');
    lanca(() => t.ligar({ colunas: Object.assign({}, COLUNAS, { assunto: 'Motivo do contato' }) }),
      'não tem a coluna "Motivo do contato"');
    igual(t.chamar('configuracaoDoChat')().ligado, false, 'nada foi gravado');
  });

  teste('a data e o analista são obrigatórios', () => {
    const t = mesaComChat();
    lanca(() => t.ligar({ colunas: Object.assign({}, COLUNAS, { data: '' }) }),
      'Data do atendimento: escolha a coluna');
    lanca(() => t.ligar({ colunas: Object.assign({}, COLUNAS, { analista: '' }) }),
      'Analista: escolha a coluna');
  });

  teste('com o Id em branco desliga, e as colunas escolhidas ficam guardadas', () => {
    const t = mesaComChat();
    t.ligar();
    const desligada = t.ligar({ planilhaId: '' });
    igual(desligada.ligado, false);
    igual(desligada.colunas.analista, 'Atendente', 'religar não obriga a escolher tudo de novo');
  });

  teste('conferir sugere as colunas pelo cabeçalho e mostra as últimas linhas traduzidas', () => {
    const t = mesaComChat([[diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    const laudo = t.chamar('conferirPlanilhaDoChat')({ planilhaId: t.idDoChat, aba: 'Chat', colunas: {} });
    igual(laudo.abre, true);
    igual(laudo.sugestoes.analista, 'Atendente', '"Atendente" é o analista');
    igual(laudo.sugestoes.susep, 'SUSEP');
    igual(laudo.sugestoes.data, 'Data');
    igual(laudo.faltando.length, 2, 'sem escolher, faltam a data e o analista');

    const completo = t.chamar('conferirPlanilhaDoChat')({ planilhaId: t.idDoChat, aba: 'Chat', colunas: COLUNAS });
    igual(completo.faltando.length, 0);
    igual(completo.linhas, 1);
    igual(completo.amostra[0].analista, 'Ana Martins');
    igual(completo.amostra[0].ramo, 'VG');
  });

  teste('conferir NÃO grava nada', () => {
    const t = mesaComChat();
    t.chamar('conferirPlanilhaDoChat')({ planilhaId: t.idDoChat, aba: 'Chat', colunas: COLUNAS });
    igual(t.chamar('configuracaoDoChat')().ligado, false);
  });

  teste('só quem configura mexe: a Operação é recusada — e nada muda por baixo', () => {
    const t = mesaComChat();
    t.ligar();
    comoUsuario(t.ambiente, 'diego@exemplo.com', () => {
      lanca(() => t.chamar('configuracaoDoChat')());
      lanca(() => t.chamar('salvarConfiguracaoDoChat')({ planilhaId: t.idDoChat, colunas: COLUNAS }));
      lanca(() => t.chamar('salvarConfiguracaoDoChat')({ planilhaId: '' }),
        '', 'nem para DESLIGAR: o Id em branco também não passa sem permissão');
      lanca(() => t.chamar('conferirPlanilhaDoChat')({ planilhaId: t.idDoChat, colunas: COLUNAS }));
    });
    // A recusa tem de vir ANTES de gravar: erro depois de gravar desligaria o
    // chat de todo mundo e ainda diria "não pode".
    igual(t.chamar('configuracaoDoChat')().ligado, true, 'a configuração continua como estava');
  });

  /* ----------------------------------------------------------------------- */
  secao('A soma: o que está no sistema mais o que veio do chat');

  teste('os totais separam o sistema do chat', () => {
    const t = mesaComChat([
      [diasAtras(0), 'Ana Martins', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(1), 'Diego Castilho', 'RET01A', 'Sinistro', 'Vida individual']]);
    t.ligar();
    t.caso(); t.caso(); t.caso({ Analista: 'Diego Castilho' });
    const a = t.painel().atendimentos;
    igual(a.totais.sistema, 3);
    igual(a.totais.chat, 2);
    igual(a.totais.total, 5);
    igual(a.chat.ligado, true);
    igual(a.chat.aviso, '');
  });

  teste('por analista: o mesmo nome em duas grafias é uma barra só, com o nome do cadastro', () => {
    const t = mesaComChat([
      [diasAtras(0), 'diego castilho', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(0), 'DIEGO CASTILHO', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(1), 'Bianca Souza', 'RET00J', 'Cobrança', 'VG']]);
    t.ligar();
    t.caso({ Analista: 'Diego Castilho' });
    const grafico = t.grafico(t.painel(), 'Atendidos por analista');
    igual(t.pontos(grafico).join('|'), 'Diego Castilho:1+2|Bianca Souza:0+1',
      'Bianca não é usuária e entra com o nome da planilha');
    igual(grafico.total, 4);
  });

  teste('a corretora e o consultor vêm do cadastro, pela SUSEP — nos dois lados', () => {
    // O sistema escreveu "Corretora ABC S/A"; o chat nem traz a corretora. As
    // duas viram a mesma barra, com o nome do CADASTRO.
    const t = mesaComChat([
      [diasAtras(0), 'Ana Martins', 'ret00j', 'Cobrança', 'VG'],
      [diasAtras(0), 'Ana Martins', 'RET01A', 'Cobrança', 'VG']]);
    t.ligar();
    t.caso({ Corretora: 'Corretora ABC S/A', SUSEP: 'RET00J' });
    const painel = t.painel();
    igual(t.pontos(t.grafico(painel, 'Top 5 corretoras')).join('|'),
      'Corretora ABC:1+1|Corretora Horizonte:0+1');
    igual(t.pontos(t.grafico(painel, 'Top 5 consultores')).join('|'),
      'Marina Alencar:1+1|Rogério Pinto:0+1');
    igual(t.pontos(t.grafico(painel, 'Top 5 SUSEPs')).join('|'),
      'RET00J:1+1|RET01A:0+1', 'a SUSEP compara sem ligar para a caixa');
  });

  teste('é top 5: o que passa vira "Demais valores", somado — e o total fecha', () => {
    const corretoras = ['Alfa', 'Beta', 'Gama', 'Delta', 'Épsilon', 'Zeta', 'Eta'];
    const t = mesaComChat();
    t.ligar();
    corretoras.forEach((nome, i) => {
      for (let k = 0; k <= 6 - i; k++) t.caso({ Corretora: 'Corretora ' + nome });
    });
    const grafico = t.grafico(t.painel(), 'Top 5 corretoras');
    igual(grafico.pontos.length, 6, 'cinco e o resto');
    igual(grafico.pontos[5].rotulo, 'Demais valores');
    igual(grafico.pontos[5].ehOutros, true);
    igual(grafico.dobradosEmOutros, 2);
    igual(grafico.pontos[0].rotulo, 'Corretora Alfa', 'o maior primeiro');
    igual(grafico.total, 7 + 6 + 5 + 4 + 3 + 2 + 1, 'nada sumiu na dobra');
    igual(grafico.pontos[5].valor, 2 + 1);
  });

  teste('quem não traz a informação não entra no ranking — é contado à parte', () => {
    const t = mesaComChat([[diasAtras(0), 'Ana Martins', '', '', 'VG']]);
    t.ligar();
    t.caso({ Corretora: 'Corretora Sozinha' });
    t.caso();   // sem corretora, sem SUSEP, sem assunto
    const painel = t.painel();
    const corretoras = t.grafico(painel, 'Top 5 corretoras');
    igual(t.pontos(corretoras).join('|'), 'Corretora Sozinha:1+0');
    igual(corretoras.semInformacao, 2, 'a do sistema e a do chat');
    verdadeiro(t.grafico(painel, 'Top 5 consultores').semInformacao >= 3,
      'sem SUSEP não há consultor para ninguém');
  });

  teste('Vida individual e Vida em grupo, seja como cada base escreva', () => {
    const t = mesaComChat([
      [diasAtras(0), 'Ana Martins', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(0), 'Ana Martins', 'RET00J', 'Cobrança', 'Vida Individual'],
      [diasAtras(0), 'Ana Martins', 'RET00J', 'Cobrança', 'vida em grupo'],
      [diasAtras(0), 'Ana Martins', 'RET00J', 'Cobrança', '']]);
    t.ligar();
    t.caso({ Ramo: 'Vida em grupo' });
    t.caso({ Ramo: 'Vida individual' });
    const grafico = t.grafico(t.painel(), 'Vida individual ou Vida em grupo');
    igual(grafico.tipo, 'pizza');
    igual(t.pontos(grafico).join('|'),
      'Vida em grupo:1+2|Vida individual:1+1|Sem informação:0+1');
    verdadeiro(grafico.pontos.every((p) => p.ehOutros || p.serie >= 1),
      'cada fatia tem a sua cor');
  });

  teste('as siglas VG e VI do chat viram os nomes por extenso, mesmo sem caso do sistema', () => {
    // Com caso do sistema no meio, o rótulo dele aparece primeiro e esconde a
    // sigla. Só com o chat é que se vê o que a sigla vira.
    const t = mesaComChat([
      [diasAtras(0), 'Ana Martins', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(0), 'Ana Martins', 'RET00J', 'Cobrança', 'vg'],
      [diasAtras(0), 'Ana Martins', 'RET00J', 'Cobrança', 'VI'],
      [diasAtras(0), 'Ana Martins', 'RET00J', 'Cobrança', 'Seguro Residencial']]);
    t.ligar();
    igual(t.pontos(t.grafico(t.painel(), 'Vida individual ou Vida em grupo')).join('|'),
      'Vida em grupo:0+2|Seguro Residencial:0+1|Vida individual:0+1',
      'outro texto fica como veio');
  });

  teste('assunto e SUSEP: o que a planilha escreve e o sistema escreve conta junto', () => {
    const t = mesaComChat([
      [diasAtras(0), 'Ana Martins', 'RET00J', 'cobrança', 'VG']]);
    t.ligar();
    t.caso({ Assunto: 'Cobrança', SUSEP: 'RET00J' });
    const painel = t.painel();
    igual(t.pontos(t.grafico(painel, 'Top 5 assuntos')).join('|').split(':')[1], '1+1',
      '"cobrança" e "Cobrança" são o mesmo assunto');
    igual(t.grafico(painel, 'Top 5 SUSEPs').pontos[0].valor, 2);
  });

  /* ----------------------------------------------------------------------- */
  secao('O período e o alcance valem para o chat também');

  teste('o chat entra pelo período da tela, e a linha sem data legível fica de fora — dita', () => {
    const t = mesaComChat([
      [diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(40), 'Ana Martins', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(2) + ' 14:30:05', 'Ana Martins', 'RET00J', 'Cobrança', 'VG'],
      ['semana passada', 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    t.ligar();
    const a = t.painel(30).atendimentos;
    igual(a.totais.chat, 2, 'a de 40 dias e a sem data não entram; a com hora entra');
    igual(a.chat.semData, 1, 'e a sem data é contada, para ninguém achar que sumiu');
    igual(t.painel(90).atendimentos.totais.chat, 3, 'um período maior pega a de 40 dias');
  });

  teste('o alcance do nível vale: quem só vê os próprios números vê só os seus no chat', () => {
    const t = mesaComChat([
      [diasAtras(0), 'Ana Martins', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(0), 'Diego Castilho', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(0), 'diego castilho', 'RET00J', 'Cobrança', 'VG']]);
    t.ligar();
    t.caso({ Analista: 'Diego Castilho' });
    t.caso({ Analista: 'Ana Martins' });
    const nivel = t.chamar('listarNiveisDeAcesso()').find((n) => n.nome === 'Operação');
    t.chamar('salvarNivelDeAcesso')(Object.assign({}, nivel, { escopoNaProdutividade: 'PROPRIOS' }));

    const doDiego = comoUsuario(t.ambiente, 'diego@exemplo.com', () => t.painel().atendimentos);
    igual(doDiego.totais.chat, 2, 'as duas linhas dele, nas duas grafias');
    igual(doDiego.totais.sistema, 1);
    igual(t.pontos(doDiego.graficos[0]).join('|'), 'Diego Castilho:1+2', 'a Ana nem aparece');

    t.chamar('salvarNivelDeAcesso')(Object.assign({}, nivel, { escopoNaProdutividade: 'CANAL' }));
    igual(comoUsuario(t.ambiente, 'diego@exemplo.com', () => t.painel().atendimentos.totais.chat), 3,
      'com o canal inteiro, vê todas');
  });

  /* ----------------------------------------------------------------------- */
  secao('Quando o chat falha, o sistema segue');

  teste('chat desligado: só o sistema, e a tela diz', () => {
    const t = mesaComChat();
    t.caso(); t.caso();
    const a = t.painel().atendimentos;
    igual(a.chat.ligado, false);
    igual(a.totais.sistema, 2);
    igual(a.totais.chat, 0);
    verdadeiro(a.graficos.length === 6, 'os seis gráficos existem mesmo assim');
    contem(lerTela('Produtividade.html'), 'A planilha do chat não está ligada');
  });

  teste('planilha que sumiu, aba apagada ou coluna renomeada: recado, e o sistema segue', () => {
    const t = mesaComChat([[diasAtras(0), 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    t.ligar();
    t.caso();

    // A aba some.
    const externa = t.ambiente.planilhaExternaPeloId(t.idDoChat);
    externa.getSheetByName('Chat').setName('Renomeada');
    let a = t.painel().atendimentos;
    igual(a.totais.sistema, 1, 'o sistema continua');
    igual(a.totais.chat, 0);
    contem(a.chat.aviso, 'Chat', 'diz qual aba procurou');
    externa.getSheetByName('Renomeada').setName('Chat');

    // A coluna ganha outro nome.
    const aba = externa.getSheetByName('Chat');
    aba.getRange(1, 2).setValue('Quem atendeu');
    a = t.painel().atendimentos;
    contem(a.chat.aviso, 'Atendente', 'diz qual coluna sumiu');
    igual(a.totais.sistema, 1);
    contem(lerTela('Produtividade.html'), 'A planilha do chat não pôde ser lida');
  });

  teste('chat com a aba vazia (só o cabeçalho) não é erro', () => {
    const t = mesaComChat();
    t.ligar();
    const a = t.painel().atendimentos;
    igual(a.chat.aviso, '');
    igual(a.totais.chat, 0);
  });

  teste('só a Mesa tem o bloco: RET e VG recebem null', () => {
    const t = mesaComChat();
    t.ligar();
    igual(t.chamar('produtividadeDaEquipe')(t.ret.id, {}, 30).atendimentos, null);
    const vg = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_VG');
    igual(t.chamar('produtividadeDaEquipe')(vg.id, {}, 30).atendimentos, null);
  });

  teste('o chat é lido do FIM da aba: com o teto de linhas, as mais antigas ficam de fora, e a tela diz', () => {
    const t = mesaComChat([
      [diasAtras(5), 'Ana Martins', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(4), 'Ana Martins', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(3), 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    t.ligar();
    t.chamar('gravarConfiguracao_')('OPERACAO.LINHAS_DO_PAINEL', 2);
    const a = t.painel().atendimentos;
    igual(a.totais.chat, 2, 'só as duas últimas');
    igual(a.chat.truncada, true);
    contem(lerTela('Produtividade.html'), 'entram só as últimas');
  });

  /* ----------------------------------------------------------------------- */
  secao('A tela');

  teste('a Produtividade desenha o resumo, os seis gráficos e a tabela de onde veio cada número', () => {
    const tela = lerTela('Produtividade.html');
    contem(tela, 'function desenharAtendimentos');
    contem(tela, 'Atendidos — sistema e chat');
    contem(tela, 'function tabelaDeAtendidos');
    contem(tela, '+ desenharAtendimentos()', 'entra na tela, depois dos prazos');
    ['Sistema', 'Chat', 'Total'].forEach((coluna) => contem(tela, coluna));
  });

  teste('Configurações oferece a planilha do chat, com conferir e salvar', () => {
    const tela = lerTela('Configuracoes.html');
    contem(tela, 'Planilha dos atendimentos do chat');
    contem(tela, "Servidor.chamar('conferirPlanilhaDoChat'");
    contem(tela, "Servidor.chamar('salvarConfiguracaoDoChat'");
    contem(tela, "Servidor.chamar('configuracaoDoChat')");
  });
}

module.exports = { rodarTestesDoChatDaMesa };
