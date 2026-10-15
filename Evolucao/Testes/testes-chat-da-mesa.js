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
 *
 * Etapa 39: "ler uma planilha de chat ficou confuso e não consegui fazer a
 * junção". O chat deixou de ser LIDO de outra planilha configurada em
 * Estrutura: os atendimentos são IMPORTADOS pela tela de Importação, como os
 * casos, para a aba ATENDIMENTOS_CHAT — e a Produtividade lê de lá.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario } =
  require('./ferramentas');

const lerTela = (nome) => fs.readFileSync(
  path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

/** O de-para que a pessoa confirma na tela: "Atendente" da origem é o Analista. */
const DE_PARA = [{ daFonte: 'Data', paraAColuna: 'Data' },
  { daFonte: 'Atendente', paraAColuna: 'Analista' }, { daFonte: 'SUSEP', paraAColuna: 'SUSEP' },
  { daFonte: 'Assunto', paraAColuna: 'Assunto' }, { daFonte: 'Ramo', paraAColuna: 'Ramo' }];

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
  t.pedido = (extra) => Object.assign({
    fonte: { tipo: 'planilha', planilhaId: t.idDoChat, aba: 'Chat' },
    dePara: DE_PARA, origem: 'Chat de outubro' }, extra || {});
  // "Ligar" o chat agora é importar a planilha dele pela Importação.
  t.ligar = (extra) => t.chamar('importarAtendimentosDoChat')(t.pedido(extra));
  t.conferir = (extra) => t.chamar('conferirImportacaoDoChat')(t.pedido(extra));
  t.aba = () => t.chamar('lerRegistros_')('ATENDIMENTOS_CHAT');
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
  secao('Trazer o chat pela Importação');

  teste('a Importação da Mesa oferece o chat; RET e VG, não', () => {
    const t = mesaComChat();
    igual(t.chamar('opcoesDaImportacaoDeCasos')(t.mesa.id).aceitaChat, true);
    igual(t.chamar('opcoesDaImportacaoDeCasos')(t.ret.id).aceitaChat, false);
    const opcoes = t.chamar('opcoesDaImportacaoDoChat')();
    igual(opcoes.abaExiste, true, 'a instalação cria a aba ATENDIMENTOS_CHAT');
    igual(opcoes.colunasDoCanal.join(','),
      'Data,Analista,SUSEP,Corretora,Assunto,Consultor,Ramo');
    igual(opcoes.obrigatorias.join(','), 'Data,Analista', 'só a data e o analista são obrigatórios');
    igual(opcoes.lotes.length, 0);
  });

  teste('conferir sugere o de-para pelo cabeçalho e mostra as primeiras linhas', () => {
    const t = mesaComChat([[diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    const laudo = t.conferir({ dePara: [] });
    const para = (daFonte) => laudo.dePara.find((p) => p.daFonte === daFonte).paraAColuna;
    igual(para('Atendente'), 'Analista', '"Atendente" é o analista');
    igual(para('SUSEP'), 'SUSEP');
    igual(para('Data'), 'Data');
    igual(laudo.faltando.length, 0);
    igual(laudo.vaoEntrar, 1);
    igual(laudo.amostra[0].Analista, 'Ana Martins');
    igual(laudo.amostra[0].Ramo, 'VG');
    igual(laudo.amostra[0].Data, diasAtras(1));
  });

  teste('conferir NÃO grava nada', () => {
    const t = mesaComChat([[diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    t.conferir();
    igual(t.aba().length, 0);
  });

  teste('importar grava na aba, com o lote e a data de verdade', () => {
    const t = mesaComChat([[diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    const resultado = t.ligar();
    igual(resultado.entraram, 1);
    const linha = t.aba()[0];
    igual(linha.Analista, 'Ana Martins');
    igual(linha.Lote, 'Chat de outubro');
    verdadeiro(linha.Data instanceof Date || Object.prototype.toString.call(linha.Data) === '[object Date]',
      'a data vira data, e não texto');
    verdadeiro(!!linha.ImportadoEm, 'e o sistema carimba quando entrou');
    igual(t.chamar('opcoesDaImportacaoDoChat')().lotes[0].origem, 'Chat de outubro');
    verdadeiro(t.chamar('lerRegistros_')('AUDITORIA').some((a) => a.Acao === 'chat.importar'),
      'e fica na auditoria');
  });

  teste('a data e o analista são obrigatórios no de-para', () => {
    const t = mesaComChat([[diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    const semAnalista = DE_PARA.filter((p) => p.paraAColuna !== 'Analista');
    igual(t.conferir({ dePara: semAnalista }).faltando.join(','), 'Analista');
    igual(t.conferir({ dePara: semAnalista }).vaoEntrar, 0);
    lanca(() => t.ligar({ dePara: semAnalista }), 'Diga qual coluna da origem é: Analista');
    lanca(() => t.ligar({ dePara: DE_PARA.filter((p) => p.paraAColuna !== 'Data') }),
      'Data do atendimento');
    igual(t.aba().length, 0, 'nada foi gravado');
  });

  teste('sem nome de lote não grava', () => {
    const t = mesaComChat([[diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    lanca(() => t.ligar({ origem: '  ' }), 'Dê um nome ao lote');
    igual(t.aba().length, 0);
  });

  teste('reimportar o mesmo arquivo não dobra nada', () => {
    const t = mesaComChat([
      [diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(2), 'Diego Castilho', 'RET01A', 'Sinistro', 'VI']]);
    t.ligar();
    igual(t.conferir().vaoEntrar, 0, 'a conferência já avisa');
    igual(t.conferir().motivosParaPular.repetida, 2);
    lanca(() => t.ligar({ origem: 'De novo' }), 'Nenhuma linha entraria: 2 já estão na aba');
    igual(t.aba().length, 2);
  });

  teste('duas linhas iguais no mesmo arquivo são dois atendimentos — e entram as duas', () => {
    // O corretor que chamou duas vezes no dia, pelo mesmo assunto.
    const t = mesaComChat([
      [diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    igual(t.ligar().entraram, 2);
  });

  teste('o arquivo que repete parte do anterior traz só o que é novo', () => {
    const t = mesaComChat([[diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    t.ligar();
    const outro = t.ambiente.criarPlanilhaExterna('Chat2', [
      ['Data', 'Atendente', 'SUSEP', 'Assunto', 'Ramo'],
      [diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(0), 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    const r = t.ligar({ fonte: { tipo: 'planilha', planilhaId: outro, aba: 'Chat2' },
      origem: 'Chat de novembro' });
    igual(r.entraram, 2, 'a que já estava fica; a segunda igual e a nova entram');
    igual(r.pulados.repetida, 1);
    igual(t.aba().length, 3);
  });

  teste('a linha sem data legível ou sem analista não entra — e o laudo diz', () => {
    const t = mesaComChat([
      [diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG'],
      ['semana passada', 'Ana Martins', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(1), '', 'RET00J', 'Cobrança', 'VG']]);
    const laudo = t.conferir();
    igual(laudo.vaoEntrar, 1);
    igual(laudo.semDataOuAnalista, 2);
    igual(t.ligar().entraram, 1);
  });

  teste('o analista que o cadastro de usuários não conhece é avisado, sem impedir', () => {
    const t = mesaComChat([
      [diasAtras(1), 'ana martins', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(1), 'Bianca Souza', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(2), 'Bianca Souza', 'RET00J', 'Cobrança', 'VG']]);
    igual(t.conferir().analistasDesconhecidos.join(','), 'Bianca Souza',
      'a Ana, em outra grafia, é conhecida; a Bianca aparece uma vez só');
    igual(t.ligar().entraram, 3, 'avisa, mas grava');
    contem(lerTela('Importacao.html'), 'laudo.analistasDesconhecidos');
  });

  teste('o texto colado também vale', () => {
    const t = mesaComChat();
    const r = t.chamar('importarAtendimentosDoChat')({
      fonte: { tipo: 'colar', texto: 'Data\tAtendente\n' + diasAtras(1) + '\tAna Martins' },
      dePara: [], origem: 'Colado' });
    igual(r.entraram, 1);
  });

  teste('só quem importa mexe: a Operação é recusada — e nada muda por baixo', () => {
    const t = mesaComChat([[diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    const operacao = t.chamar('listarNiveisDeAcesso()').find((n) => n.nome === 'Operação');
    t.chamar('salvarNivelDeAcesso')(Object.assign({}, operacao, { telas: (operacao.telas || [])
      .filter((tela) => tela !== 'importacao') }));
    comoUsuario(t.ambiente, 'diego@exemplo.com', () => {
      lanca(() => t.chamar('opcoesDaImportacaoDoChat')());
      lanca(() => t.conferir());
      lanca(() => t.ligar());
    });
    igual(t.aba().length, 0);
  });

  teste('sem a aba ATENDIMENTOS_CHAT, importar ensina a criar', () => {
    const t = mesaComChat([[diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    t.ambiente.planilha.deleteSheet(t.ambiente.planilha.getSheetByName('ATENDIMENTOS_CHAT'));
    igual(t.chamar('opcoesDaImportacaoDoChat')().abaExiste, false);
    lanca(() => t.ligar(), 'atualizarPGO()');
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

  teste('o chat entra pelo período da tela; a data com hora também vale', () => {
    const t = mesaComChat([
      [diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(40), 'Ana Martins', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(2) + ' 14:30:05', 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    t.ligar();
    const a = t.painel(30).atendimentos;
    igual(a.totais.chat, 2, 'a de 40 dias não entra; a com hora entra');
    igual(t.painel(90).atendimentos.totais.chat, 3, 'um período maior pega a de 40 dias');
  });

  teste('a linha da aba sem data (escrita à mão) fica fora do período — dita', () => {
    const t = mesaComChat([[diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    t.ligar();
    t.chamar('inserirRegistro_')('ATENDIMENTOS_CHAT', { Analista: 'Ana Martins', Lote: 'À mão' });
    const a = t.painel(30).atendimentos;
    igual(a.totais.chat, 1);
    igual(a.chat.semData, 1, 'contada, para ninguém achar que sumiu');
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

  teste('nada importado ainda: só o sistema, e a tela diz como trazer', () => {
    const t = mesaComChat();
    t.caso(); t.caso();
    const a = t.painel().atendimentos;
    igual(a.chat.ligado, false);
    igual(a.totais.sistema, 2);
    igual(a.totais.chat, 0);
    verdadeiro(a.graficos.length === 6, 'os seis gráficos existem mesmo assim');
    contem(lerTela('Produtividade.html'), 'Traga o chat pela tela de Importação');
  });

  teste('aba ATENDIMENTOS_CHAT apagada: o sistema segue', () => {
    const t = mesaComChat([[diasAtras(0), 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    t.ligar();
    t.caso();
    t.ambiente.planilha.deleteSheet(t.ambiente.planilha.getSheetByName('ATENDIMENTOS_CHAT'));
    const a = t.painel().atendimentos;
    igual(a.totais.sistema, 1, 'o sistema continua');
    igual(a.totais.chat, 0);
  });

  teste('a aba do chat que não se deixa ler vira recado, e o sistema segue', () => {
    const t = mesaComChat([[diasAtras(0), 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    t.ligar();
    t.caso();
    const original = t.contexto.lerRegistros_;
    t.contexto.lerRegistros_ = function (aba, opcoes) {
      if (aba === 'ATENDIMENTOS_CHAT') throw new Error('a aba está protegida');
      return original(aba, opcoes);
    };
    const a = t.painel().atendimentos;
    igual(a.totais.sistema, 1);
    contem(a.chat.aviso, 'protegida');
    contem(lerTela('Produtividade.html'), 'Os atendimentos do chat não puderam ser lidos');
  });

  teste('chat com a aba vazia (só o cabeçalho) não é erro', () => {
    const t = mesaComChat();
    const a = t.painel().atendimentos;
    igual(a.chat.aviso, '');
    igual(a.totais.chat, 0);
  });

  teste('só a Mesa tem o bloco: RET e VG recebem null', () => {
    const t = mesaComChat();
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
    contem(lerTela('Produtividade.html'), 'Do chat entram só os últimos');
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

  teste('a Produtividade da Mesa separa a Equipe dos Atendidos, em abas', () => {
    const tela = lerTela('Produtividade.html');
    contem(tela, "[['equipe', 'Equipe'], ['atendidos', 'Atendidos (sistema + chat)']]");
    contem(tela, 'data-aba-da-mesa');
  });

  teste('a Importação oferece "Atendimentos do chat" e chama as funções do chat', () => {
    const tela = lerTela('Importacao.html');
    contem(tela, 'data-o-que-importar');
    contem(tela, "'conferirImportacaoDoChat'");
    contem(tela, "'importarAtendimentosDoChat'");
    contem(tela, "'opcoesDaImportacaoDoChat'");
  });

  teste('Configurações já não pede a planilha do chat — diz onde ela foi parar', () => {
    const tela = lerTela('Configuracoes.html');
    verdadeiro(tela.indexOf("Servidor.chamar('salvarConfiguracaoDoChat'") < 0);
    contem(tela, 'Os atendimentos do chat da Mesa Diamante agora entram');
  });
}

module.exports = { rodarTestesDoChatDaMesa };
