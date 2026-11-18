/**
 * ============================================================================
 * PGO — testes-agenda-da-mesa.js · as reuniões com corretores (Etapa 79)
 * ============================================================================
 * Pedido do PO: "a Mesa faz reuniões com corretores (…) eu queria que a Mesa
 * registrasse isso e fosse para a segunda base, onde ficam as SUSEPs" — "um
 * formulário diferente em Cadastrar Caso, e na aba Trabalho tem que ter uma
 * sub aba de reunião ao clicar em Mesa Diamante". A aba se chama Agenda, já
 * existe e já tem dados; os dezesseis cabeçalhos são os que ele mandou.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario } = require('./ferramentas');

const tela = (nome) => fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', nome + '.html'), 'utf8');
// A data vem de outro contexto de execução: `instanceof Date` não a reconhece.
const ehData = (valor) => Object.prototype.toString.call(valor) === '[object Date]';

// Como o PO escreveu — com as diferenças de caixa e de espaço que a planilha dele tem.
const CABECALHOS = ['Data', 'gerente', 'consultor', 'corretora', 'analista', 'área',
  'segurado/estipulante', 'participantes', 'assunto', 'obs', 'ações', 'chamado', 'status',
  '1 report(15 dias)', '2 report (30 dias)', '3 report (45 dias)'];

const ANTIGA = [new Date(2026, 8, 10), 'Gerente Um', 'Consultor Um', 'Corretora Antiga', 'Quem Saiu', 'Comercial',
  'Estipulante Um', 'Fulano; Beltrano', 'Renovação', 'obs antiga', 'ligar de novo', 'CH-1', 'Status de antes',
  new Date(2026, 8, 25), '', ''];

function preparar(ajustes) {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  const canais = t.chamar('canaisVisiveis_()');
  t.mesa = canais.find((c) => c.aba === 'BASE_MESA');
  t.ret = canais.find((c) => c.aba === 'BASE_RET');
  const opcoes = Object.assign({ cabecalhos: CABECALHOS, linhas: [ANTIGA], nomeDaAba: 'Agenda' }, ajustes || {});
  const abas = { SUSEP_BLOQUEADAS: [['Id', 'SUSEP', 'NomeCorretora', 'Sucursal', 'CoordenadorComercial',
    'BloqueadaEm', '_Visivel', '_ExcluidoEm', '_ExcluidoPor', '_Origem']] };
  if (opcoes.nomeDaAba) abas[opcoes.nomeDaAba] = [opcoes.cabecalhos].concat(opcoes.linhas);
  t.idDeFora = t.ambiente.criarPlanilhaExterna(abas);
  if (opcoes.ligar !== false) {
    t.chamar('gravarConfiguracao_')('CADASTROS.PLANILHA_ID', t.idDeFora);
    t.chamar('gravarConfiguracao_')('CADASTROS.ABAS', 'SUSEP_BLOQUEADAS');
    t.chamar('esquecerCacheDaConfiguracao_()');
  }
  t.agenda = (procurar) => t.chamar('agendaDaMesa')(t.mesa.id, procurar || '');
  t.naPlanilha = () => {
    const aba = t.ambiente.planilhaExternaPeloId(t.idDeFora).getSheetByName(opcoes.nomeDaAba);
    return aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getValues();
  };
  t.nova = (extras) => Object.assign({ data: '12/11/2026', corretora: 'Corretora Nova', assunto: 'Carteira',
    status: 'Pendente', analista: '', obs: 'duas\nlinhas' }, extras || {});
  t.registrar = (extras) => t.chamar('registrarReuniao')(t.mesa.id, t.nova(extras));
  return t;
}

function rodarTestesDaAgendaDaMesa() {
  console.log('\nEtapa 79: a Agenda da Mesa — reuniões com corretores');

  /* ----------------------------------------------------------------------- */
  secao('Ler a aba que já existe');

  teste('acha os dezesseis cabeçalhos do jeito que o PO escreveu, e lê a reunião antiga', () => {
    const t = preparar();
    const resposta = t.agenda();
    igual(resposta.campos.length, 16);
    igual(resposta.total, 1);
    const antiga = resposta.reunioes[0];
    igual(antiga.linha, 2);
    igual(antiga.valores.data + '|' + antiga.valores.corretora + '|' + antiga.valores.assunto,
      '10/09/2026|Corretora Antiga|Renovação');
    igual(antiga.valores.report1, '25/09/2026', 'o report é a data em que foi feito');
    igual(antiga.valores.report2, '');
    igual(antiga.valores.status, 'Status de antes', 'o status antigo aparece como está');
  });

  teste('colunas em outra ordem, e colunas a mais na aba, não atrapalham', () => {
    const invertidos = CABECALHOS.slice().reverse().concat(['Coluna do PO']);
    const t = preparar({ cabecalhos: invertidos, linhas: [ANTIGA.slice().reverse().concat(['não mexer'])] });
    igual(t.agenda().reunioes[0].valores.corretora, 'Corretora Antiga');
    t.registrar();
    const gravada = t.naPlanilha()[2];
    igual(gravada[invertidos.indexOf('corretora')], 'Corretora Nova');
    igual(gravada[invertidos.indexOf('Coluna do PO')], '', 'a coluna que não é da reunião fica em branco');
  });

  teste('as mais recentes primeiro, e a busca olha qualquer coluna, sem acento nem caixa', () => {
    const t = preparar();
    t.registrar();
    t.registrar({ corretora: 'Outra Corretora', assunto: 'Sinistro' });
    igual(t.agenda().reunioes.map((r) => r.valores.corretora).join(','),
      'Outra Corretora,Corretora Nova,Corretora Antiga');
    igual(t.agenda('RENOVACAO').reunioes.map((r) => r.linha).join(','), '2');
    igual(t.agenda('sinistro').total, 1);
    igual(t.agenda('nada disso').total, 0);
  });

  teste('linha em branco no meio da planilha não vira reunião', () => {
    const vazia = CABECALHOS.map(() => '');
    const t = preparar({ linhas: [ANTIGA, vazia, ANTIGA] });
    igual(t.agenda().reunioes.map((r) => r.linha).join(','), '4,2');
  });

  teste('sem a segunda base, sem a aba ou sem uma coluna: diz o que falta, e não "nenhuma reunião"', () => {
    lanca(() => preparar({ ligar: false }).agenda(), 'nenhuma está');
    lanca(() => preparar({ nomeDaAba: 'Outra' }).agenda(), 'não tem uma aba chamada "Agenda"');
    const semDuas = CABECALHOS.filter((c) => c !== 'chamado' && c !== 'ações');
    lanca(() => preparar({ cabecalhos: semDuas, linhas: [] }).agenda(), 'as colunas: ações, chamado');
  });

  teste('a aba com outro nome se aponta na CONFIG', () => {
    const t = preparar({ nomeDaAba: 'Reunioes 2026' });
    t.chamar('gravarConfiguracao_')('AGENDA.ABA', 'Reunioes 2026');
    t.chamar('esquecerCacheDaConfiguracao_()');
    igual(t.agenda().total, 1);
  });

  /* ----------------------------------------------------------------------- */
  secao('Registrar');

  teste('a reunião vira uma linha nova no fim, e o que já estava não muda', () => {
    const t = preparar();
    const antes = JSON.stringify(t.naPlanilha().slice(0, 2));
    igual(t.registrar({ report1: '27/11/2026' }).linha, 3);
    const linhas = t.naPlanilha();
    igual(JSON.stringify(linhas.slice(0, 2)), antes, 'o cabeçalho e a reunião antiga, iguais');
    igual(linhas.length, 3);
    const nova = linhas[2];
    verdadeiro(ehData(nova[0]) && nova[0].getDate() === 12 && nova[0].getMonth() === 10,
      'a data entra como data, e não como texto');
    igual(nova[3] + '|' + nova[8] + '|' + nova[12], 'Corretora Nova|Carteira|Pendente');
    verdadeiro(ehData(nova[13]) && nova[13].getDate() === 27, 'o report também é data');
  });

  teste('o formulário já vem com a data de hoje, o status Pendente e o nome de quem registra', () => {
    const t = preparar();
    const campo = (chave) => t.chamar('formularioDaReuniao')(t.mesa.id).campos.find((c) => c.chave === chave);
    const hoje = new Date();
    igual(campo('data').padrao.slice(0, 2), (hoje.getDate() < 10 ? '0' : '') + hoje.getDate());
    igual(campo('status').padrao, 'Pendente');
    igual(campo('status').opcoes.join(','), 'Pendente,Em andamento,Concluído,Acompanhar por 3 meses');
    igual(['data', 'corretora', 'assunto'].every((c) => campo(c).obrigatorio), true);
    igual(campo('gerente').obrigatorio, false);
  });

  teste('o analista é digitado, e não escolhido numa lista (Etapa 80)', () => {
    const t = preparar();
    const analista = t.chamar('formularioDaReuniao')(t.mesa.id).campos.find((c) => c.chave === 'analista');
    igual(analista.tipo + '|' + analista.opcoes.length, 'texto|0');
    igual(analista.padrao, String(t.chamar('usuarioAtual_()').usuario.Nome), 'já vem com quem registra');
    t.registrar({ analista: 'Alguém de Fora da Mesa' });
    igual(t.naPlanilha()[2][4], 'Alguém de Fora da Mesa');
  });

  teste('o status é uma lista de Ajustes Gerais: o que se muda lá aparece na Agenda (Etapa 80)', () => {
    const t = preparar();
    const lista = t.chamar('listasDeAjustes_()').find((l) => l.chave === 'STATUS_DA_REUNIAO');
    igual(lista.nome, 'Status da reunião');
    igual(lista.doSistema, true, 'a lista não se exclui; os itens, sim');
    contem(lista.usadaEm.join(','), 'Agenda da Mesa Diamante');
    t.chamar('salvarItemDoCatalogo')({ tipo: 'STATUS_DA_REUNIAO', nome: 'Remarcada', ordem: 5, ativo: true });
    const pendente = t.chamar('lerRegistros_')('CATALOGO')
      .find((i) => i.Tipo === 'STATUS_DA_REUNIAO' && i.Nome === 'Pendente');
    t.chamar('atualizarRegistro_')('CATALOGO', pendente.__id, { Ativo: false });
    t.chamar('esquecerCacheDaConfiguracao_()');
    const status = t.chamar('formularioDaReuniao')(t.mesa.id).campos.find((c) => c.chave === 'status');
    igual(status.opcoes.join(','), 'Em andamento,Concluído,Acompanhar por 3 meses,Remarcada');
    igual(status.padrao, 'Em andamento', 'o primeiro da lista vira o padrão');
  });

  teste('instalação em uso: o atualizarPGO cria a lista só se ela ainda não existe', () => {
    const t = preparar();
    const itens = () => t.chamar('lerRegistros_')('CATALOGO').filter((i) => i.Tipo === 'STATUS_DA_REUNIAO');
    const pulados = [];
    igual(t.chamar('criarAListaDoStatusDaReuniao_')(pulados).length, 0, 'já tem: não mexe');
    contem(pulados.join(','), 'já existe');
    // Como uma planilha de antes da Etapa 80: sem os itens.
    itens().forEach((i) => t.chamar('atualizarRegistro_')('CATALOGO', i.__id, { Tipo: 'OUTRA_LISTA' }));
    contem(t.chamar('criarAListaDoStatusDaReuniao_')([]).join(','), 'lista do status da reunião criada');
    igual(itens().map((i) => i.Nome).join(','), 'Pendente,Em andamento,Concluído,Acompanhar por 3 meses');
  });

  teste('recusa sem data, sem corretora ou sem assunto, e a data que não existe', () => {
    const t = preparar();
    lanca(() => t.registrar({ corretora: '  ' }), 'Corretora é obrigatório');
    lanca(() => t.registrar({ assunto: '' }), 'Assunto é obrigatório');
    lanca(() => t.registrar({ data: '' }), 'Data da reunião é obrigatório');
    lanca(() => t.registrar({ report2: '31/02/2026' }), 'não é uma data');
    igual(t.naPlanilha().length, 2, 'nada entrou');
  });

  teste('o mesmo envio duas vezes grava uma reunião só', () => {
    const t = preparar();
    const envio = 'envio-da-reuniao-0001';
    t.chamar('registrarReuniao')(t.mesa.id, t.nova(), envio);
    t.chamar('registrarReuniao')(t.mesa.id, t.nova(), envio);
    igual(t.naPlanilha().length, 3);
  });

  /* ----------------------------------------------------------------------- */
  secao('Editar');

  teste('salva na mesma linha, só nas colunas da reunião', () => {
    const cabecalhos = CABECALHOS.concat(['Coluna do PO']);
    const t = preparar({ cabecalhos, linhas: [ANTIGA.concat(['não mexer'])] });
    const antiga = t.agenda().reunioes[0];
    const editada = Object.assign({}, antiga.valores, { status: 'Concluído', report2: '10/10/2026' });
    t.chamar('salvarReuniao')(t.mesa.id, antiga.linha, editada, antiga.valores);
    const linha = t.naPlanilha()[1];
    igual(linha[12], 'Concluído');
    verdadeiro(ehData(linha[14]) && linha[14].getMonth() === 9, 'o 2º report gravado como data');
    igual(linha[3] + '|' + linha[9], 'Corretora Antiga|obs antiga', 'o resto da reunião continua');
    igual(linha[16], 'não mexer', 'e a coluna que não é da reunião também');
    igual(t.naPlanilha().length, 2, 'não criou linha');
  });

  teste('se a planilha mudou de lugar por baixo, recusa em vez de gravar em outra reunião', () => {
    const t = preparar();
    t.registrar();
    const lista = t.agenda().reunioes;
    const antiga = lista.find((r) => r.valores.corretora === 'Corretora Antiga');
    // Alguém ordenou a planilha: a linha 2 agora é a outra reunião.
    const aba = t.ambiente.planilhaExternaPeloId(t.idDeFora).getSheetByName('Agenda');
    const duas = aba.getRange(2, 1, 2, CABECALHOS.length).getValues();
    aba.getRange(2, 1, 2, CABECALHOS.length).setValues([duas[1], duas[0]]);
    lanca(() => t.chamar('salvarReuniao')(t.mesa.id, antiga.linha,
      Object.assign({}, antiga.valores, { status: 'Concluído' }), antiga.valores), 'já é outra reunião');
    igual(t.naPlanilha()[1][12], 'Pendente', 'a reunião que estava na linha 2 não foi tocada');
    lanca(() => t.chamar('salvarReuniao')(t.mesa.id, 99, antiga.valores, antiga.valores), 'não está mais na Agenda');
  });

  /* ----------------------------------------------------------------------- */
  secao('Quem pode, e o registro');

  teste('a Agenda é da Mesa: outro canal é recusado', () => {
    const t = preparar();
    lanca(() => t.chamar('agendaDaMesa')(t.ret.id, ''), 'é da Mesa Diamante');
    lanca(() => t.chamar('registrarReuniao')(t.ret.id, t.nova()), 'é da Mesa Diamante');
    lanca(() => t.chamar('formularioDaReuniao')(t.ret.id), 'é da Mesa Diamante');
  });

  teste('quem só consulta vê a lista, mas não registra nem edita', () => {
    const t = preparar();
    const consulta = t.chamar('lerRegistros_')('CATALOGO')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Consulta');
    t.chamar('salvarUsuario')({ nome: 'Só Olha', email: 'olha@exemplo.com',
      nivelAcessoId: consulta.Id, canalId: '', ativo: true });
    comoUsuario(t.ambiente, 'olha@exemplo.com', () => {
      const resposta = t.agenda();
      igual(resposta.total, 1);
      igual(resposta.podeRegistrar + '|' + resposta.podeEditar, 'false|false');
      lanca(() => t.registrar(), 'não permite criar');
      lanca(() => t.chamar('salvarReuniao')(t.mesa.id, 2, t.nova(), {}), 'não permite editar');
    });
  });

  teste('registrar e editar ficam na auditoria, com a corretora e o assunto', () => {
    const t = preparar();
    t.registrar();
    const antiga = t.agenda().reunioes.find((r) => r.linha === 2);
    t.chamar('salvarReuniao')(t.mesa.id, 2, antiga.valores, antiga.valores);
    t.chamar('descarregarAFilaDaAuditoria_')(0);
    const linhas = t.chamar('lerRegistros_')('AUDITORIA').filter((l) => /^agenda\./.test(l.Acao));
    igual(linhas.map((l) => l.Acao).join(','), 'agenda.registrar,agenda.editar');
    contem(linhas[0].Detalhe, 'Corretora Nova · Carteira');
    contem(linhas[1].Detalhe, 'Corretora Antiga · Renovação');
  });

  /* ----------------------------------------------------------------------- */
  secao('A tela');

  function peca() {
    const comuns = tela('Comuns');
    const trecho = comuns.substring(comuns.indexOf('var Agenda = (function () {'),
      comuns.indexOf('var SeletorDeCanal = (function () {'));
    const contexto = vm.createContext({
      Moldura: { escapar: (texto) => String(texto === undefined ? '' : texto) },
      SeletorDePeriodo: {
        paraOCampo: (t) => { const p = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(t || '')); return p ? p[3] + '-' + p[2] + '-' + p[1] : ''; },
        paraOServidor: (t) => { const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(t || '')); return p ? p[3] + '/' + p[2] + '/' + p[1] : ''; }
      }
    });
    vm.runInContext(trecho, contexto);
    return contexto.Agenda;
  }

  teste('só a Mesa Diamante tem Agenda', () => {
    const canais = [{ id: '1', aba: 'BASE_RET' }, { id: '2', aba: 'BASE_MESA' }];
    igual(peca().ehDaMesa(canais, '2'), true);
    igual(peca().ehDaMesa(canais, '1'), false);
    igual(peca().ehDaMesa(canais, ''), false);
  });

  teste('o formulário novo abre com os padrões; o da edição, com o que está gravado — até o status antigo', () => {
    const t = preparar();
    const resposta = t.agenda();
    const novo = peca().formulario(resposta.campos, null);
    contem(novo, '<option value="Pendente" selected>Pendente</option>');
    contem(novo, 'id="agenda-corretora" data-agenda="corretora" aria-required="true" value=""');
    const edicao = peca().formulario(resposta.campos, resposta.reunioes[0].valores);
    contem(edicao, 'id="agenda-data" data-agenda="data" aria-required="true" value="2026-09-10"');
    contem(edicao, '<option value="Status de antes" selected>Status de antes</option>');
    contem(edicao, 'id="agenda-analista" data-agenda="analista" value="Quem Saiu"', 'o analista, como texto');
  });

  teste('a lista mostra os três reports: o feito com a data, o que falta com um traço', () => {
    const t = preparar();
    const html = peca().lista(t.agenda(), '');
    contem(html, 'Report de 15 dias feito em 25/09/2026">15 d ✓');
    contem(html, 'Report de 30 dias ainda não feito">30 d —');
    contem(html, 'data-editar-reuniao="2"');
    contem(html, 'id="registrar-reuniao"');
    contem(peca().lista({ reunioes: [], total: 0, podeRegistrar: false, podeEditar: false }, 'xyz'),
      'Nenhuma reunião com esse texto.');
  });

  teste('o Cadastrar Caso e o Trabalho ganham a aba da reunião só na Mesa', () => {
    const cadastrar = tela('CadastrarCaso');
    contem(cadastrar, "temAgenda = Agenda.ehDaMesa(pacote.canais, canalEscolhido);\n    if (!temAgenda) oQueCadastrar = 'caso';");
    contem(cadastrar, "[['caso', 'Caso'], ['reuniao', 'Reunião com corretor']]");
    contem(cadastrar, "Servidor.chamar('registrarReuniao', canalEscolhido, lidos, envioDaReuniao)");
    const trabalho = tela('Trabalho');
    contem(trabalho, "temAgenda = Agenda.ehDaMesa(pacote.canais, canalEscolhido);\n    if (!temAgenda) abaDaMesa = 'casos';");
    // Etapa 84: as Reuniões entram na mesma linha das sub-abas da Mesa.
    contem(trabalho, "abas.push({ atributo: 'data-aba-do-trabalho=\"reunioes\"', rotulo: 'Reuniões', atual: abaDaMesa === 'reunioes' });");
    contem(trabalho, "if (temAgenda) {");
    contem(trabalho, "if (abaDaMesa === 'reunioes') { carregarAgenda(); return; }");
  });

  teste('a edição manda junto o que a lista mostrava, para o servidor conferir a linha', () => {
    contem(tela('Comuns'), "Servidor.chamar('salvarReuniao', idDoCanal, reuniao.linha, lidos, reuniao.valores)");
  });
}

module.exports = { rodarTestesDaAgendaDaMesa };
