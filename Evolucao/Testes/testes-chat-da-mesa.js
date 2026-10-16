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
      'Data,Analista,SUSEP,Corretora,Assunto,Consultor,Ramo,Sucursal,Tabulação,Sub assunto,TMO');
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
  secao('Etapa 41: sucursal, tabulação, sub assunto e TMO');

  /** Uma planilha de chat com as colunas novas, como a origem do PO as escreve. */
  function chatCompleto(linhas) {
    const t = mesaComChat();
    t.idDoChat = t.ambiente.criarPlanilhaExterna('Completo', [
      ['Data', 'Atendente', 'SUSEP', 'Assunto', 'Ramo', 'Cod Sucursal', 'Tabulação', 'Sub Assunto', 'TMO']]
      .concat(linhas));
    t.pedido = (extra) => Object.assign({ fonte: { tipo: 'planilha', planilhaId: t.idDoChat, aba: 'Completo' },
      dePara: [], origem: 'Chat completo' }, extra || {});
    t.ligar = (extra) => t.chamar('importarAtendimentosDoChat')(t.pedido(extra));
    t.conferir = (extra) => t.chamar('conferirImportacaoDoChat')(t.pedido(extra));
    return t;
  }

  teste('o de-para sugere as quatro colunas novas pelo cabeçalho', () => {
    const t = chatCompleto([[diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG', '12', 'Retenção', '2ª via', '1.152']]);
    const laudo = t.conferir();
    const para = (daFonte) => laudo.dePara.find((p) => p.daFonte === daFonte).paraAColuna;
    igual(para('Cod Sucursal'), 'Sucursal');
    igual(para('Tabulação'), 'Tabulação');
    igual(para('Sub Assunto'), 'Sub assunto');
    igual(para('TMO'), 'TMO');
  });

  teste('importar grava as quatro — e o TMO "1.152" vira 1152 segundos', () => {
    const t = chatCompleto([[diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG', '12', 'Retenção', '2ª via', '1.152']]);
    t.ligar();
    const linha = t.aba()[0];
    igual(String(linha.Sucursal), '12');
    igual(linha['Tabulação'], 'Retenção');
    igual(linha['Sub assunto'], '2ª via');
    igual(linha.TMO, 1152);
  });

  teste('o TMO aceita 1152, 1.152, 12,5 e o número da planilha; vazio fica vazio', () => {
    const t = chatCompleto([
      [diasAtras(1), 'Ana Martins', 'RET00J', 'A', 'VG', '', '', '', '1152'],
      [diasAtras(1), 'Ana Martins', 'RET00J', 'B', 'VG', '', '', '', '12,5'],
      [diasAtras(1), 'Ana Martins', 'RET00J', 'C', 'VG', '', '', '', 300],
      [diasAtras(1), 'Ana Martins', 'RET00J', 'D', 'VG', '', '', '', '']]);
    t.ligar();
    igual(t.aba().map((l) => l.TMO).join('|'), '1152|12.5|300|');
  });

  teste('TMO que não é número: a linha entra, o TMO fica em branco — e o laudo conta', () => {
    const t = chatCompleto([
      [diasAtras(1), 'Ana Martins', 'RET00J', 'A', 'VG', '', '', '', '19 min'],
      [diasAtras(1), 'Ana Martins', 'RET00J', 'B', 'VG', '', '', '', '1.152']]);
    igual(t.conferir().tmoQueNaoENumero, 1);
    const r = t.ligar();
    igual(r.entraram, 2);
    igual(r.tmoQueNaoENumero, 1);
    igual(String(t.aba()[0].TMO), '');
    contem(lerTela('Importacao.html'), 'laudo.tmoQueNaoENumero');
  });

  teste('a planilha de origem sem as colunas novas: elas ficam em branco, para preencher à mão', () => {
    const t = mesaComChat([[diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    t.ligar();
    const linha = t.aba()[0];
    ['Sucursal', 'Tabulação', 'Sub assunto', 'TMO'].forEach((coluna) => igual(String(linha[coluna]), '', coluna));
  });

  teste('reimportar o mesmo arquivo, agora com as colunas novas, não dobra', () => {
    const t = mesaComChat([[diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    t.ligar();
    const outro = t.ambiente.criarPlanilhaExterna('ComNovas', [
      ['Data', 'Atendente', 'SUSEP', 'Assunto', 'Ramo', 'Sucursal', 'TMO'],
      [diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG', '12', '1.152']]);
    lanca(() => t.ligar({ fonte: { tipo: 'planilha', planilhaId: outro, aba: 'ComNovas' }, dePara: [],
      origem: 'De novo' }), 'já estão na aba');
    igual(t.aba().length, 1);
  });

  teste('na Produtividade, a sucursal que o chat trouxe vale; em branco, a do cadastro', () => {
    const t = chatCompleto([
      [diasAtras(0), 'Ana Martins', 'RET00J', 'Cobrança', 'VG', '99', '', '', ''],
      [diasAtras(0), 'Ana Martins', 'RET00J', 'Cobrança', 'VI', '', '', '', '']]);
    t.ligar();
    igual(t.pontos(t.grafico(t.painel(), 'Top 5 sucursais')).join('|'), '12:0+1|99:0+1',
      'a do chat (99) ganha do cadastro (12); a linha em branco usa o cadastro');
  });

  teste('a atualização acrescenta as quatro colunas numa aba do chat que já existe', () => {
    const t = mesaComChat([[diasAtras(1), 'Ana Martins', 'RET00J', 'Cobrança', 'VG']]);
    t.ligar();
    ['TMO', 'Sub assunto', 'Tabulação', 'Sucursal'].forEach((coluna) =>
      t.chamar('removerColuna_')('ATENDIMENTOS_CHAT', coluna));
    const recado = t.chamar('atualizarPGO()');
    contem(recado, 'ATENDIMENTOS_CHAT.Sucursal criada');
    contem(recado, 'ATENDIMENTOS_CHAT.TMO criada');
    const linha = t.aba()[0];
    igual(linha.Analista, 'Ana Martins', 'a linha que já estava continua inteira');
    igual(String(linha.TMO), '');
    verdadeiro(t.chamar('atualizarPGO()').indexOf('ATENDIMENTOS_CHAT.TMO criada') < 0,
      'a segunda vez não mexe');
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
  secao('Sucursal, e Vida em grupo / Vida individual / Total');

  /** A visão pedida: a de sempre vem em `atendimentos`; as outras oito, em `visoes`. */
  const visao = (painel, chave) => (chave === 'todos|total'
    ? painel.atendimentos : painel.atendimentos.visoes[chave]);

  /** Três do chat e três do sistema, com ramo, SUSEP e assunto escolhidos a dedo. */
  function mesaComVidas() {
    const t = mesaComChat([
      [diasAtras(0), 'Ana Martins', 'RET00J', 'Cobrança', 'VG'],
      [diasAtras(0), 'Ana Martins', 'RET01A', 'Cobrança', 'VI'],
      [diasAtras(0), 'Diego Castilho', 'RET03C', 'Sinistro', 'VG']]);
    t.ligar();
    t.caso({ Ramo: 'Vida em grupo', SUSEP: 'RET00J', Assunto: 'Cobrança' });
    t.caso({ Ramo: 'Vida individual', SUSEP: 'RET01A', Assunto: 'Sinistro', Analista: 'Diego Castilho' });
    t.caso({ SUSEP: 'RET00J', Assunto: 'Cobrança' });   // sem ramo: só no Total
    return t;
  }

  teste('a sucursal vem do cadastro, pela SUSEP — nos dois lados', () => {
    const t = mesaComVidas();
    const grafico = t.grafico(t.painel(), 'Top 5 sucursais');
    igual(grafico.dimensao, 'Sucursal');
    igual(t.pontos(grafico).join('|'), '12:3+2|58:0+1',
      'RET00J e RET01A são da 12; RET03C, da 58 — o chat nem traz a coluna');
  });

  teste('SUSEP fora do cadastro, ou sem sucursal, vai para "sem informação"', () => {
    const t = mesaComChat([[diasAtras(0), 'Ana Martins', 'RET99Z', 'Cobrança', 'VG']]);
    t.ligar();
    t.chamar('inserirRegistro_')('CORRETORAS', { SUSEP: 'RET77X', Corretora: 'Sem sucursal', Sucursal: '' });
    t.caso({ SUSEP: 'RET77X' });
    const grafico = t.grafico(t.painel(), 'Top 5 sucursais');
    igual(grafico.pontos.length, 0);
    igual(grafico.semInformacao, 2);
  });

  teste('o Total é a visão de sempre; as outras oito vêm prontas, sem repetir o Total', () => {
    const t = mesaComVidas();
    const a = t.painel().atendimentos;
    igual(Object.keys(a.visoes).sort().join(','),
      'chat|total,chat|vg,chat|vi,sistema|total,sistema|vg,sistema|vi,todos|vg,todos|vi');
    igual(a.totais.total, 6);
    igual(a.graficos.map((g) => g.titulo).join('|'), 'Atendidos por analista|Top 5 corretoras|'
      + 'Top 5 SUSEPs|Top 5 sucursais|Top 5 assuntos|Top 5 consultores|Vida individual ou Vida em grupo');
  });

  teste('Vida em grupo: o top 5 é só dos atendimentos de Vida em grupo', () => {
    const t = mesaComVidas();
    const vg = visao(t.painel(), 'todos|vg');
    igual(vg.totais.total, 3, 'VG: 1 do sistema e 2 do chat');
    igual(vg.totais.sistema, 1);
    igual(vg.totais.chat, 2);
    igual(t.pontos(vg.graficos.find((g) => g.titulo === 'Top 5 sucursais')).join('|'), '12:1+1|58:0+1');
    igual(t.pontos(vg.graficos.find((g) => g.titulo === 'Top 5 SUSEPs')).join('|'),
      'RET00J:1+1|RET03C:0+1');
    igual(t.pontos(vg.graficos.find((g) => g.titulo === 'Top 5 assuntos')).join('|'),
      'Cobrança:1+1|Sinistro:0+1');
    igual(t.pontos(vg.graficos.find((g) => g.titulo === 'Atendidos por analista')).join('|'),
      'Ana Martins:1+1|Diego Castilho:0+1');
  });

  teste('Vida individual: o outro ramo, também isolado', () => {
    const t = mesaComVidas();
    const vi = visao(t.painel(), 'todos|vi');
    igual(vi.totais.total, 2);
    igual(t.pontos(vi.graficos.find((g) => g.titulo === 'Top 5 SUSEPs')).join('|'),
      'RET01A:1+1');
    igual(t.pontos(vi.graficos.find((g) => g.titulo === 'Top 5 assuntos')).join('|'),
      'Cobrança:0+1|Sinistro:1+0');
  });

  teste('a rosca de Vida individual × Vida em grupo só existe no Total', () => {
    const t = mesaComVidas();
    const painel = t.painel();
    const titulos = (chave) => visao(painel, chave).graficos.map((g) => g.titulo);
    verdadeiro(titulos('todos|total').indexOf('Vida individual ou Vida em grupo') >= 0);
    verdadeiro(titulos('chat|total').indexOf('Vida individual ou Vida em grupo') >= 0,
      'com a origem escolhida, o Total continua tendo a rosca');
    verdadeiro(titulos('todos|vg').indexOf('Vida individual ou Vida em grupo') < 0,
      'num ramo só seria uma fatia de 100%');
    verdadeiro(titulos('chat|vi').indexOf('Vida individual ou Vida em grupo') < 0);
  });

  teste('E-mail é o caso do sistema; Chat, o importado — e cada origem some com a outra', () => {
    const t = mesaComVidas();
    const painel = t.painel();
    const email = visao(painel, 'sistema|total');
    igual(email.totais.total, 3);
    igual(email.totais.chat, 0, 'o chat não entra no e-mail');
    igual(t.pontos(email.graficos.find((g) => g.titulo === 'Top 5 sucursais')).join('|'), '12:3+0');
    const chat = visao(painel, 'chat|total');
    igual(chat.totais.total, 3);
    igual(chat.totais.sistema, 0, 'o sistema não entra no chat');
    igual(t.pontos(chat.graficos.find((g) => g.titulo === 'Top 5 sucursais')).join('|'), '12:0+2|58:0+1');
  });

  teste('origem e ramo juntos: só o chat de Vida individual', () => {
    const t = mesaComVidas();
    const v = visao(t.painel(), 'chat|vi');
    igual(v.totais.total, 1);
    igual(t.pontos(v.graficos.find((g) => g.titulo === 'Top 5 assuntos')).join('|'), 'Cobrança:0+1');
  });

  teste('o analista segue com até 15 em cada visão', () => {
    const t = mesaComChat();
    for (let i = 0; i < 17; i++) t.caso({ Analista: 'Analista ' + comZero(i), Ramo: 'Vida em grupo' });
    const grafico = visao(t.painel(), 'todos|vg').graficos[0];
    igual(grafico.titulo, 'Atendidos por analista');
    igual(grafico.pontos.length, 16, '15 e o "Demais valores"');
    igual(grafico.total, 17);
  });

  teste('a soma de VG e VI nunca passa do Total', () => {
    const t = mesaComVidas();
    const painel = t.painel();
    ['sistema', 'chat', 'todos'].forEach((origem) => {
      const total = visao(painel, origem + '|total').totais.total;
      const soma = visao(painel, origem + '|vg').totais.total + visao(painel, origem + '|vi').totais.total;
      verdadeiro(soma <= total, origem + ': ' + soma + ' ≤ ' + total);
    });
    igual(visao(painel, 'todos|total').totais.total - 5, 1, 'o caso sem ramo só conta no Total');
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
    verdadeiro(a.graficos.length === 7, 'os sete gráficos existem mesmo assim');
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

  teste('a Produtividade desenha o resumo, os gráficos e a tabela de atendimentos', () => {
    const tela = lerTela('Produtividade.html');
    contem(tela, 'function desenharAtendimentos');
    contem(tela, "'Atendidos — ' + escapar(nomeDaVisaoDosAtendidos())");
    contem(tela, 'function tabelaDeAtendidos');
    contem(tela, '+ desenharAtendimentos()', 'entra na tela, depois dos prazos');
    contem(tela, "<th class=\"direita\">Atendimentos</th>", 'uma coluna só, como o PO pediu');
    verdadeiro(tela.indexOf('<th class="direita">Sistema</th>') < 0, 'sem Sistema | Chat separados');
  });

  teste('a tela tem os dois seletores — origem e ramo — e trocar não volta ao servidor', () => {
    const tela = lerTela('Produtividade.html');
    contem(tela, 'data-origem-dos-atendidos');
    contem(tela, 'data-ramo-dos-atendidos');
    contem(tela, "[['todos', 'Todos'], ['sistema', 'E-mail'], ['chat', 'Chat']]");
    contem(tela, "[['total', 'Total'], ['vg', 'Vida em grupo'], ['vi', 'Vida individual']]");
    contem(tela, "atendidos.visoes[chave]", 'a visão vem pronta da resposta');
    contem(tela, 'origemDosAtendidos = escolhida;\n      desenhar();', 'trocar a origem redesenha');
    contem(tela, 'ramoDosAtendidos = escolhido;\n      desenhar();', 'trocar o ramo redesenha');
    contem(tela, "var chave = origemDosAtendidos + '|' + ramoDosAtendidos;", 'a visão é a das duas escolhas');
    contem(lerTela('Estilos.html'), '.seletor-de-atendidos', 'a classe existe no estilo');
  });

  teste('a Produtividade da Mesa separa a Equipe dos Atendidos, em abas', () => {
    const tela = lerTela('Produtividade.html');
    contem(tela, "[['equipe', 'Equipe'], ['atendidos', 'Atendidos (e-mail + chat)']]");
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
