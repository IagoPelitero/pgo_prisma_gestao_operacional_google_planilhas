/**
 * ============================================================================
 * PGO — testes-descricao-e-inicio-do-prazo.js · os pedidos da rodada 32
 * ============================================================================
 * Cinco pedidos do PO, numa mensagem só:
 *
 *   1. "na aba Trabalho, ao clicar em Trabalhar no caso, a Descrição não vem
 *      junto para ser editada" — e "todos os canais devem poder editar as
 *      descrições";
 *   2. "a coluna prêmio mensal retido está com nome errado e deve ser prêmio
 *      mensal";
 *   3. "a SLA de 3 dias úteis da RET deve ser somente se o caso mudar de
 *      status. Casos não trabalhados ficam com a SLA cheia";
 *   4. "confira se a Mesa está contando a SLA de 48 horas úteis quando o
 *      status for Em andamento";
 *   5. "todo canal que tiver com a SLA próxima deve ter um pop-up sinalizando
 *      qual caso está próximo de vencer".
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, pecaRodando, comAFilaDaTela } = require('./ferramentas');
const { retComAParada } = require('./testes-parada-da-ret');

const lerTela = (nome) => fs.readFileSync(
  path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

function instalado() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  const canal = (aba) => t.chamar('canaisVisiveis_()').find((c) => c.aba === aba);
  t.ret = canal('BASE_RET');
  t.mesa = canal('BASE_MESA');
  t.vg = canal('BASE_VG');
  t.linha = (aba, id) => t.chamar('lerRegistros_')(aba).find((l) => String(l.__id) === String(id));
  /** Troca o texto de um cabeçalho na planilha, como o PO poderia ter escrito. */
  t.reescreverCabecalho = (aba, de, para) => {
    const folha = t.ambiente.planilha.getSheetByName(aba);
    const cabecalhos = folha.getRange(1, 1, 1, folha.getLastColumn()).getValues()[0];
    const i = cabecalhos.indexOf(de);
    if (i < 0) throw new Error('não achei "' + de + '" em ' + aba);
    folha.getRange(1, i + 1).setValue(para);
    t.chamar('esquecerEstruturaLida_()');
  };
  return t;
}

function rodarTestesDaDescricaoEDoInicioDoPrazo() {
  console.log('\nRodada 32: a Descrição na edição, o prêmio mensal, o início do prazo da RET e o aviso');

  /* ----------------------------------------------------------------------- */
  secao('A Descrição vem junto no "Trabalhar no caso"');

  teste('a coluna escrita "Descrição" na planilha volta preenchida para editar', () => {
    // O defeito: CAMPOS diz "descrição", a planilha diz "Descrição". Gravar
    // sempre funcionou; abrir para editar devolvia vazio.
    const t = instalado();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id,
      { nomedocliente: 'Cliente', descricao: 'Cliente pediu retorno na segunda.' });
    t.reescreverCabecalho('BASE_RET', 'descrição', 'Descrição');
    const caso = t.chamar('casoParaEditar')(t.ret.id, id);
    igual(caso.valores.descricao, 'Cliente pediu retorno na segunda.');
  });

  teste('salvar o caso sem mexer na Descrição não a apaga mais', () => {
    const t = instalado();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id,
      { nomedocliente: 'Cliente', descricao: 'Texto que não pode sumir' });
    t.reescreverCabecalho('BASE_RET', 'descrição', 'DESCRIÇÃO');
    const caso = t.chamar('casoParaEditar')(t.ret.id, id);
    // A tela devolve o formulário inteiro, com o que abriu.
    t.chamar('editarCaso')(t.ret.id, id, caso.valores, caso.versao);
    igual(t.linha('BASE_RET', id)['DESCRIÇÃO'], 'Texto que não pode sumir');
  });

  teste('a Descrição editada na tela é gravada', () => {
    const t = instalado();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Cliente', descricao: 'antes' });
    const caso = t.chamar('casoParaEditar')(t.ret.id, id);
    t.chamar('editarCaso')(t.ret.id, id,
      Object.assign({}, caso.valores, { descricao: 'depois' }), caso.versao);
    igual(t.chamar('casoParaEditar')(t.ret.id, id).valores.descricao, 'depois');
  });

  teste('a proposta em dois pedaços também volta com o cabeçalho de outra grafia', () => {
    const t = instalado();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id,
      { nomedocliente: 'Cliente', numerodaproposta: '7-0000123' });
    t.reescreverCabecalho('BASE_RET', 'número da proposta', 'Número da Proposta');
    igual(t.chamar('casoParaEditar')(t.ret.id, id).valores.numerodaproposta, '7-0000123');
  });

  teste('VG: a Obs volta e é editável', () => {
    const t = instalado();
    const form = t.chamar('formularioDoCanal')(t.vg.id).secoes
      .reduce((todos, s) => todos.concat(s.campos), []);
    const obs = form.find((c) => c.chave === 'obs');
    igual(obs.tipo, 'textoLongo');
    igual(obs.somenteLeitura, false);
    const obrigatorios = {};
    form.filter((c) => c.obrigatorio).forEach((c) => {
      if (c.tipo === 'data') obrigatorios[c.chave] = '05/10/2026';
      else obrigatorios[c.chave] = c.opcoes && c.opcoes.length ? c.opcoes[0].valor : 'X';
    });
    const { id } = t.chamar('cadastrarCaso')(t.vg.id, Object.assign(obrigatorios, { obs: 'anotação do VG' }));
    igual(t.chamar('casoParaEditar')(t.vg.id, id).valores.obs, 'anotação do VG');
  });

  teste('Mesa: a base não tem descrição; o campo que o PO criar volta e é editável', () => {
    // A Mesa nasce só com "Assunto" (um seletor). O sistema não cria coluna
    // por conta própria: o PO cria em Configurações › Cadastrar Caso.
    const t = instalado();
    t.chamar('definirSenhaDeAdministrador')('segredo123', '');
    t.chamar('liberarComSenha')('segredo123');
    t.chamar('criarCampo')(t.mesa.id, { rotulo: 'Descrição', tipo: 'textoLongo', secao: 'Caso' });
    const campo = t.chamar('formularioDoCanal')(t.mesa.id).secoes
      .reduce((todos, s) => todos.concat(s.campos), []).find((c) => c.rotulo === 'Descrição');
    verdadeiro(!!campo, 'o campo aparece no formulário da Mesa');
    const { id } = t.chamar('cadastrarCaso')(t.mesa.id, { status: 'Em andamento',
      nomedosegurado: 'Segurado', [campo.chave]: 'primeira versão' });
    const caso = t.chamar('casoParaEditar')(t.mesa.id, id);
    igual(caso.valores[campo.chave], 'primeira versão');
    t.chamar('editarCaso')(t.mesa.id, id,
      Object.assign({}, caso.valores, { [campo.chave]: 'segunda versão' }), caso.versao);
    igual(t.chamar('casoParaEditar')(t.mesa.id, id).valores[campo.chave], 'segunda versão');
  });

  /* ----------------------------------------------------------------------- */
  secao('A coluna "prêmio mensal retido" passa a ser "prêmio mensal"');

  teste('a instalação nova já nasce com o nome certo', () => {
    const t = instalado();
    const cabecalhos = t.chamar('estruturaDaAba_')('BASE_RET').cabecalhos;
    verdadeiro(cabecalhos.indexOf('prêmio mensal') >= 0, 'tem "prêmio mensal"');
    verdadeiro(cabecalhos.indexOf('prêmio mensal retido') < 0, 'não tem mais o nome errado');
    verdadeiro(cabecalhos.indexOf('valor do prêmio retido') >= 0, 'o retido continua na coluna dele');
    const campo = t.chamar('lerRegistros_')('CAMPOS').find((c) =>
      c.Aba === 'BASE_RET' && c.Cabecalho === 'prêmio mensal');
    igual(campo.ChaveTecnica, 'premiomensal');
    igual(campo.Rotulo, 'Valor do prêmio mensal', 'o rótulo da tela não mudou');
  });

  function planilhaComONomeAntigo() {
    const t = instalado();
    t.reescreverCabecalho('BASE_RET', 'prêmio mensal', 'prêmio mensal retido');
    const campo = t.chamar('lerRegistros_')('CAMPOS').find((c) =>
      c.Aba === 'BASE_RET' && c.ChaveTecnica === 'premiomensal');
    t.chamar('atualizarRegistro_')('CAMPOS', campo.__id,
      { Cabecalho: 'prêmio mensal retido', ChaveTecnica: 'premiomensalretido' });
    const nivel = t.chamar('lerRegistros_')('CATALOGO').find((i) => i.Tipo === 'NIVEL_ACESSO');
    const configuracao = JSON.parse(nivel.Configuracao);
    configuracao.campos = Object.assign({}, configuracao.campos, { premiomensalretido: 'LEITURA' });
    t.chamar('atualizarRegistro_')('CATALOGO', nivel.__id, { Configuracao: JSON.stringify(configuracao) });
    const canal = t.chamar('lerRegistros_')('CANAIS').find((c) => c.Aba === 'BASE_RET');
    t.chamar('atualizarRegistro_')('CANAIS', canal.__id,
      { ColunasDaBusca: canal.ColunasDaBusca + ', prêmio mensal retido' });
    // Um caso gravado na coluna antiga: o dado tem de atravessar a troca de nome.
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'C', premiomensalretido: 'R$ 107,08' });
    return Object.assign(t, { idDoCampo: campo.__id, idDoNivel: nivel.__id, idDoCanal: canal.__id, idDoCaso: id });
  }

  teste('o caso gravado antes segue funcionando, antes mesmo de atualizar', () => {
    const t = planilhaComONomeAntigo();
    igual(t.chamar('casoParaEditar')(t.ret.id, t.idDoCaso).valores.premiomensalretido, 'R$ 107,08');
  });

  teste('atualizarPGO renomeia a coluna, o campo, a permissão e o que cita o nome', () => {
    const t = planilhaComONomeAntigo();
    const recado = t.chamar('atualizarPGO()');
    contem(recado, 'agora se chama "prêmio mensal" (o dado dentro dela não mudou)');
    contem(recado, 'Power BI');

    const cabecalhos = t.chamar('estruturaDaAba_')('BASE_RET').cabecalhos;
    verdadeiro(cabecalhos.indexOf('prêmio mensal') >= 0 && cabecalhos.indexOf('prêmio mensal retido') < 0);
    const campo = t.chamar('lerRegistros_')('CAMPOS').find((c) => String(c.__id) === String(t.idDoCampo));
    igual(campo.Cabecalho, 'prêmio mensal');
    igual(campo.ChaveTecnica, 'premiomensal');
    const nivel = t.chamar('lerRegistros_')('CATALOGO').find((i) => String(i.__id) === String(t.idDoNivel));
    const campos = JSON.parse(nivel.Configuracao).campos;
    igual(campos.premiomensal, 'LEITURA', 'a permissão do nível acompanhou');
    igual(campos.premiomensalretido, undefined);
    const canal = t.chamar('lerRegistros_')('CANAIS').find((c) => String(c.__id) === String(t.idDoCanal));
    contem(canal.ColunasDaBusca, 'prêmio mensal');
    verdadeiro(canal.ColunasDaBusca.indexOf('retido') < 0, 'a busca não cita mais o nome antigo');
    igual(t.chamar('casoParaEditar')(t.ret.id, t.idDoCaso).valores.premiomensal, 'R$ 107,08',
      'o valor que já estava na coluna continua lá');
  });

  teste('rodar de novo não muda nada', () => {
    const t = planilhaComONomeAntigo();
    t.chamar('atualizarPGO()');
    const recado = t.chamar('atualizarPGO()');
    verdadeiro(recado.indexOf('agora se chama "prêmio mensal"') < 0, 'não renomeia duas vezes');
  });

  teste('com as duas colunas na planilha, nada é mexido: vira decisão do PO', () => {
    const t = instalado();
    t.chamar('adicionarColuna_')('BASE_RET', 'prêmio mensal retido', 'dinheiro');
    t.chamar('esquecerEstruturaLida_()');
    const recado = t.chamar('atualizarPGO()');
    contem(recado, 'a base tem as DUAS colunas');
    const cabecalhos = t.chamar('estruturaDaAba_')('BASE_RET').cabecalhos;
    verdadeiro(cabecalhos.indexOf('prêmio mensal retido') >= 0, 'nenhuma coluna com dado é apagada');
  });

  /* ----------------------------------------------------------------------- */
  secao('RET: os 3 dias úteis só começam quando o caso muda de status');

  const COLUNA = 'Data da primeira mudança de status';
  const prazoDe = (t, id) => {
    const fila = comAFilaDaTela(t.chamar('resumoDoCanal')(t.ret.id, {}, 90)).fila;
    const caso = fila.find((c) => String(c.id) === String(id));
    return caso ? caso.sinais[0] : undefined;
  };

  teste('o caso que nasce em "Não trabalhado" fica com o prazo cheio, sem data', () => {
    const t = instalado();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Parado' });
    igual(t.linha('BASE_RET', id).status, 'Não trabalhado');
    igual(String(t.linha('BASE_RET', id)[COLUNA] || ''), '', 'o prazo não começou');
    const sinal = prazoDe(t, id);
    igual(sinal.tom, 'bom');
    igual(sinal.texto, 'Prazo de retorno · prazo cheio, 3 dias úteis');
    igual(sinal.encerrado, false);
  });

  teste('o caso antigo parado em "Não trabalhado" continua com o prazo cheio', () => {
    // "Casos não trabalhados ficam com a SLA cheia": a data de recepção, por
    // mais velha que seja, não conta mais.
    const t = instalado();
    const velho = new Date(); velho.setDate(velho.getDate() - 60);
    const caso = t.chamar('inserirRegistro_')('BASE_RET', { analista: 'Ana', 'nome do cliente': 'Velho',
      status: 'Não trabalhado', 'data de recepção do protocolo': velho });
    igual(prazoDe(t, caso.__id).texto, 'Prazo de retorno · prazo cheio, 3 dias úteis');
  });

  teste('o caso em outro status sem a data não ganha "prazo cheio": fica sem selo', () => {
    // Uma linha antiga que já andou e que ninguém soube datar. Dizer "prazo
    // cheio" para ela seria mentir; o selo some, como sempre sumiu sem data.
    const t = instalado();
    const caso = t.chamar('inserirRegistro_')('BASE_RET', { analista: 'Ana', 'nome do cliente': 'Sem data',
      status: 'Pendente', 'data de recepção do protocolo': new Date() });
    igual(prazoDe(t, caso.__id), undefined);
  });

  teste('mudar de status carimba a data, e o prazo começa a correr', () => {
    const t = instalado();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Cliente' });
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, 'Pendente');
    const carimbo = t.linha('BASE_RET', id)[COLUNA];
    verdadeiro(carimbo && typeof carimbo.getTime === 'function', 'carimbou data e hora');
    verdadeiro(prazoDe(t, id).texto.indexOf('prazo cheio') < 0, 'o selo passou a contar');
  });

  teste('a primeira data não muda nas trocas seguintes — nem voltando a "Não trabalhado"', () => {
    const t = instalado();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Cliente' });
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, 'Pendente');
    const primeira = t.linha('BASE_RET', id)[COLUNA].getTime();
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, '1º contato realizado');
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, 'Não trabalhado');
    igual(t.linha('BASE_RET', id)[COLUNA].getTime(), primeira);
    verdadeiro(prazoDe(t, id).texto.indexOf('prazo cheio') < 0,
      'voltar a "Não trabalhado" não devolve o prazo cheio: ele já começou');
  });

  teste('trocar o status pelo formulário inteiro também carimba', () => {
    const t = instalado();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Cliente' });
    const caso = t.chamar('casoParaEditar')(t.ret.id, id);
    t.chamar('editarCaso')(t.ret.id, id,
      Object.assign({}, caso.valores, { status: '1º contato realizado' }), caso.versao);
    verdadeiro(!!t.linha('BASE_RET', id)[COLUNA], 'carimbou');
  });

  teste('salvar o formulário sem trocar o status não carimba', () => {
    const t = instalado();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Cliente' });
    const caso = t.chamar('casoParaEditar')(t.ret.id, id);
    t.chamar('editarCaso')(t.ret.id, id,
      Object.assign({}, caso.valores, { nomedocliente: 'Outro nome' }), caso.versao);
    igual(String(t.linha('BASE_RET', id)[COLUNA] || ''), '');
  });

  teste('o caso que já nasce trabalhado começa o prazo no cadastro', () => {
    const t = instalado();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id,
      { nomedocliente: 'Cliente', status: '1º contato realizado' });
    verdadeiro(!!t.linha('BASE_RET', id)[COLUNA], 'carimbou no cadastro');
  });

  teste('o caso que fecha conta da primeira mudança até o desfecho', () => {
    const t = instalado();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Cliente' });
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, 'Pendente');
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, 'Pago');
    const sinal = prazoDe(t, id);
    igual(sinal.encerrado, true);
    contem(sinal.texto, 'cumprido em');
  });

  teste('a importação não carimba: o caso importado em "Não trabalhado" fica com o prazo cheio', () => {
    const t = instalado();
    const operacao = t.chamar('lerRegistros_')('CATALOGO')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id;
    t.chamar('salvarUsuario')({ nome: 'Marcos Vieira', email: 'marcos@exemplo.com',
      nivelAcessoId: operacao, canalId: t.ret.id, ativo: true });
    const linhas = [['CPF', 'nome do cliente'], ['10000000001', 'Importado']];
    t.chamar('importarCasos')(t.ret.id, {
      fonte: { tipo: 'colado', texto: linhas.map((l) => l.join('\t')).join('\n') },
      analistas: ['Marcos Vieira'], origem: 'Lote de teste'
    });
    const importado = t.chamar('lerRegistros_')('BASE_RET').find((l) => l['nome do cliente'] === 'Importado');
    igual(String(importado[COLUNA] || ''), '');
    igual(prazoDe(t, importado.__id).texto, 'Prazo de retorno · prazo cheio, 3 dias úteis');
  });

  teste('a regra por extenso diz de onde o prazo conta', () => {
    const t = instalado();
    const sinalizador = t.chamar('sinalizadoresDoCanal_')(t.ret)[0];
    contem(t.chamar('regraDoSinalizador_')(sinalizador), 'conta da primeira mudança de status');
  });

  teste('o prazo cheio vale só para a RET: a Mesa sem data continua sem selo', () => {
    const t = instalado();
    const caso = t.chamar('inserirRegistro_')('BASE_MESA',
      { 'Nome do segurado': 'Sem data', Status: 'Em andamento' });
    const fila = comAFilaDaTela(t.chamar('resumoDoCanal')(t.mesa.id, {}, 90)).fila;
    igual(fila.find((c) => String(c.id) === String(caso.__id)).sinais.length, 0);
  });

  /* ----------------------------------------------------------------------- */
  secao('A atualização liga a regra nova numa RET que já está em uso');

  function retDaVersaoAnterior() {
    const t = instalado();
    t.chamar('removerColuna_')('BASE_RET', COLUNA);
    t.chamar('lerRegistros_')('CAMPOS').forEach((campo) => {
      if (String(campo.Cabecalho) === COLUNA) t.chamar('apagarRegistroDeVez_')('CAMPOS', campo.Id);
    });
    const linha = t.chamar('lerRegistros_')('SINALIZADORES').find((l) => String(l.CanalId) === String(t.ret.id));
    t.chamar('atualizarRegistro_')('SINALIZADORES', linha.Id, { ColunaDaData: '' });
    t.chamar('esquecerEstruturaLida_()');
    const dia = (n, h) => new Date(2026, 9, n, h || 10, 0);
    t.idDoSinalizador = linha.Id;
    t.parado = t.chamar('inserirRegistro_')('BASE_RET', { analista: 'Ana', 'nome do cliente': 'Parado',
      status: 'Não trabalhado', 'data de recepção do protocolo': dia(1) });
    t.comCarimbos = t.chamar('inserirRegistro_')('BASE_RET', { analista: 'Ana', 'nome do cliente': 'Andou',
      status: 'Pendente', 'data de recepção do protocolo': dia(1),
      'Data do 1º contato': dia(5), 'Data pendente': dia(7), 'Data da última mudança de status': dia(7) });
    t.semNada = t.chamar('inserirRegistro_')('BASE_RET', { analista: 'Ana', 'nome do cliente': 'Sem nada',
      status: 'Pendente', 'data de recepção do protocolo': dia(1) });
    return t;
  }

  teste('cria a coluna, e o sinalizador de fábrica passa a contar dela', () => {
    const t = retDaVersaoAnterior();
    const recado = t.chamar('atualizarPGO()');
    contem(recado, 'BASE_RET.Data da primeira mudança de status criada');
    contem(recado, 'conta da primeira mudança de status');
    const linha = t.chamar('lerRegistros_')('SINALIZADORES').find((l) => String(l.Id) === String(t.idDoSinalizador));
    igual(linha.ColunaDaData, COLUNA);
    const campo = t.chamar('lerRegistros_')('CAMPOS').find((c) => c.Aba === 'BASE_RET' && c.Cabecalho === COLUNA);
    igual(String(campo.Ativo), 'NAO', 'é coluna do sistema, fora do formulário');
  });

  teste('o caso que já andou ganha a data mais antiga que a linha guardava', () => {
    const t = retDaVersaoAnterior();
    t.chamar('atualizarPGO()');
    const andou = t.linha('BASE_RET', t.comCarimbos.__id)[COLUNA];
    igual(andou.getTime(), new Date(2026, 9, 5, 10, 0).getTime(), 'o 1º contato, e não a última mudança');
  });

  teste('o caso parado continua sem data; o que não tem data nenhuma vira aviso', () => {
    const t = retDaVersaoAnterior();
    const recado = t.chamar('atualizarPGO()');
    igual(String(t.linha('BASE_RET', t.parado.__id)[COLUNA] || ''), '', 'Não trabalhado: prazo cheio');
    igual(String(t.linha('BASE_RET', t.semNada.__id)[COLUNA] || ''), '', 'o sistema não inventa');
    contem(recado, '1 caso(s) já saíram de "Não trabalhado", mas a linha não guarda data nenhuma');
  });

  teste('o sinalizador que o PO apontou para outra coluna não é tocado', () => {
    const t = retDaVersaoAnterior();
    t.chamar('atualizarRegistro_')('SINALIZADORES', t.idDoSinalizador, { ColunaDaData: 'Data do 1º contato' });
    const recado = t.chamar('atualizarPGO()');
    contem(recado, 'conta de "Data do 1º contato", que você escolheu');
    const linha = t.chamar('lerRegistros_')('SINALIZADORES').find((l) => String(l.Id) === String(t.idDoSinalizador));
    igual(linha.ColunaDaData, 'Data do 1º contato');
  });

  teste('rodar de novo não muda as datas', () => {
    const t = retDaVersaoAnterior();
    t.chamar('atualizarPGO()');
    const antes = t.linha('BASE_RET', t.comCarimbos.__id)[COLUNA].getTime();
    const recado = t.chamar('atualizarPGO()');
    igual(t.linha('BASE_RET', t.comCarimbos.__id)[COLUNA].getTime(), antes);
    contem(recado, 'o prazo já conta da primeira mudança de status');
  });

  /* ----------------------------------------------------------------------- */
  secao('Mesa: as 48 horas úteis contam enquanto o caso está Em andamento');

  teste('o caso cadastrado nasce Em andamento, carimbado, e o selo conta 48 horas úteis', () => {
    const t = instalado();
    const { id } = t.chamar('cadastrarCaso')(t.mesa.id, { status: 'Em andamento', nomedosegurado: 'Segurado' });
    const linha = t.linha('BASE_MESA', id);
    verdadeiro(linha['Data em andamento'] && typeof linha['Data em andamento'].getTime === 'function',
      'carimbou "Data em andamento"');
    const sinalizador = t.chamar('sinalizadoresDoCanal_')(t.mesa)[0];
    igual(sinalizador.prazo, 48);
    igual(sinalizador.unidade, 'horas');
    const fila = comAFilaDaTela(t.chamar('resumoDoCanal')(t.mesa.id, {}, 90)).fila;
    const sinal = fila.find((c) => String(c.id) === String(id)).sinais[0];
    igual(sinal.encerrado, false, 'Em andamento: o relógio corre');
    verdadeiro(sinal.tom === 'bom' || sinal.tom === 'atencao', 'acabou de nascer: não está vermelho');
  });

  teste('48 horas úteis são 2.880 minutos de expediente, de segunda a sexta', () => {
    const t = instalado();
    const sinalizador = t.chamar('sinalizadoresDoCanal_')(t.mesa)[0];
    const situacoes = t.chamar('situacoesPorChave_')(t.mesa);
    const caso = { Status: 'Em andamento', 'Data em andamento': new Date(2026, 9, 5, 8, 15) };
    const quando = (dia, hora) => {
      const [h, m] = hora.split(':').map(Number);
      return { dia: Math.round(Date.UTC(2026, 9, dia) / 86400000), minuto: h * 60 + m };
    };
    // Segunda 08:15 + 2880 min úteis (615 por dia) = 4 dias e 420 min: sexta 15:15.
    const noLimite = t.chamar('sinalDoCaso_')(caso, t.mesa, sinalizador, situacoes, quando(9, '15:15'));
    igual(noLimite.dentro, true);
    const passou = t.chamar('sinalDoCaso_')(caso, t.mesa, sinalizador, situacoes, quando(9, '15:16'));
    igual(passou.tom, 'ruim');
    const naSegunda = t.chamar('sinalDoCaso_')(caso, t.mesa, sinalizador, situacoes, quando(12, '08:15'));
    contem(naSegunda.texto, '3h15', 'o fim de semana não contou: só sexta 15:15–18:30');
  });

  teste('concluir encerra o relógio', () => {
    const t = instalado();
    const { id } = t.chamar('cadastrarCaso')(t.mesa.id, { status: 'Em andamento', nomedosegurado: 'Segurado' });
    t.chamar('alterarSituacaoDoCaso')(t.mesa.id, id, 'Concluído');
    const fila = comAFilaDaTela(t.chamar('resumoDoCanal')(t.mesa.id, {}, 90)).fila;
    const sinal = fila.find((c) => String(c.id) === String(id)).sinais[0];
    igual(sinal.encerrado, true);
    contem(sinal.texto, 'cumprido em');
  });

  /* ----------------------------------------------------------------------- */
  secao('O aviso dos casos perto de vencer');

  const tela = () => pecaRodando('Trabalho', { SeletorDePeriodo: { padrao: () => ({}) } }).TelaTrabalho;

  teste('entram só os amarelos que ainda correm', () => {
    const fila = [
      { id: '1', sinais: [{ tom: 'atencao', encerrado: false, texto: 'vence em 1h' }] },
      { id: '2', sinais: [{ tom: 'ruim', encerrado: false, texto: 'além do prazo' }] },
      { id: '3', sinais: [{ tom: 'bom', encerrado: false, texto: 'prazo cheio, 3 dias úteis' }] },
      { id: '4', sinais: [{ tom: 'atencao', encerrado: true, texto: 'encerrado' }] },
      { id: '5', sinais: [] }
    ];
    const achados = tela().casosPertoDeVencer(fila);
    igual(achados.length, 1);
    igual(achados[0].caso.id, '1');
  });

  teste('fila vazia ou sem sinalizador: aviso nenhum', () => {
    igual(tela().casosPertoDeVencer([]).length, 0);
    igual(tela().casosPertoDeVencer(undefined).length, 0);
  });

  teste('o aviso sai uma vez por canal, na entrada — e cada caso tem "Trabalhar no caso"', () => {
    const codigo = lerTela('Trabalho.html');
    contem(codigo, 'avisarQuandoChegar = !jaAvisouNoCanal[canalEscolhido]');
    contem(codigo, 'jaAvisouNoCanal[canalEscolhido] = true');
    contem(codigo, 'data-trabalhar-do-aviso');
    contem(codigo, 'CasoEmModal.abrir(canalEscolhido, idDoCaso, carregar)');
  });

  teste('o caso no amarelo chega na fila com o que o aviso precisa', () => {
    // Pôr um caso no amarelo de verdade dependeria do relógio da máquina; aqui
    // basta conferir que o selo que a fila manda traz o que o aviso lê.
    const t = instalado();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Cliente', status: 'Pendente' });
    const fila = comAFilaDaTela(t.chamar('resumoDoCanal')(t.ret.id, {}, 90)).fila;
    const caso = fila.find((c) => String(c.id) === String(id));
    ['tom', 'texto', 'encerrado'].forEach((chave) => {
      verdadeiro(chave in caso.sinais[0], 'o selo traz ' + chave);
    });
    verdadeiro(Array.isArray(caso.celulas) && caso.celulas.length > 0, 'e as células, para o rótulo');
  });

  teste('Mesa: o caso nas últimas 10 horas úteis fica amarelo — e entra no aviso', () => {
    const t = instalado();
    const sinalizador = t.chamar('sinalizadoresDoCanal_')(t.mesa)[0];
    const situacoes = t.chamar('situacoesPorChave_')(t.mesa);
    const caso = { Status: 'Em andamento', 'Data em andamento': new Date(2026, 9, 5, 8, 15) };
    const quando = { dia: Math.round(Date.UTC(2026, 9, 9) / 86400000), minuto: 8 * 60 + 15 };
    // Segunda 08:15 até sexta 08:15: 2.460 dos 2.880 minutos — faltam 7h.
    const sinal = t.chamar('sinalDoCaso_')(caso, t.mesa, sinalizador, situacoes, quando);
    igual(sinal.tom, 'atencao');
    contem(sinal.texto, 'vence em 7h');
    const achados = tela().casosPertoDeVencer([{ id: '9', celulas: [[]], sinais: [sinal] }]);
    igual(achados.length, 1, 'a Mesa também tem o aviso');
  });

  /* ----------------------------------------------------------------------- */
  secao('Mesa: o caso importado entra sem status e só conta ao ir para Em andamento');

  function mesaComAnalista() {
    const t = instalado();
    const operacao = t.chamar('lerRegistros_')('CATALOGO')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id;
    t.chamar('salvarUsuario')({ nome: 'Diego Castilho', email: 'diego@exemplo.com',
      nivelAcessoId: operacao, canalId: t.mesa.id, ativo: true });
    t.importar = (nome) => {
      const linhas = [['Nome do segurado', 'Documento (CPF)'], [nome, '12345678901']];
      t.chamar('importarCasos')(t.mesa.id, {
        fonte: { tipo: 'colado', texto: linhas.map((l) => l.join('\t')).join('\n') },
        analistas: ['Diego Castilho'], origem: 'Lote da Mesa'
      });
      return t.chamar('lerRegistros_')('BASE_MESA').find((l) => l['Nome do segurado'] === nome);
    };
    return t;
  }

  teste('o caso importado nasce sem status, sem data e sem selo', () => {
    const t = mesaComAnalista();
    const caso = t.importar('Importado da Mesa');
    igual(String(caso.Status || ''), '', 'a importação não põe "Em andamento"');
    igual(String(caso['Data em andamento'] || ''), '');
    const fila = comAFilaDaTela(t.chamar('resumoDoCanal')(t.mesa.id, {}, 90)).fila;
    igual(fila.find((c) => String(c.id) === String(caso.__id)).sinais.length, 0);
  });

  teste('ao ir para Em andamento, o sistema carimba e as 48 horas começam', () => {
    const t = mesaComAnalista();
    const caso = t.importar('Vai andar');
    t.chamar('alterarSituacaoDoCaso')(t.mesa.id, caso.__id, 'Em andamento');
    const depois = t.linha('BASE_MESA', caso.__id);
    verdadeiro(depois['Data em andamento'] && typeof depois['Data em andamento'].getTime === 'function',
      'carimbou "Data em andamento"');
    const fila = comAFilaDaTela(t.chamar('resumoDoCanal')(t.mesa.id, {}, 90)).fila;
    const sinal = fila.find((c) => String(c.id) === String(caso.__id)).sinais[0];
    igual(sinal.encerrado, false);
    contem(sinal.texto, 'Retorno da área');
  });

  teste('a tela da importação diz que a Mesa entra sem status; a RET, com "Não trabalhado"', () => {
    const t = mesaComAnalista();
    const daMesa = t.chamar('opcoesDaImportacaoDeCasos')(t.mesa.id);
    igual(daMesa.statusPadrao, '');
    igual(daMesa.statusQueEsperaAPessoa, 'Em andamento');
    const daRet = t.chamar('opcoesDaImportacaoDeCasos')(t.ret.id);
    igual(daRet.statusPadrao, 'Não trabalhado');
    igual(daRet.statusQueEsperaAPessoa, '');
    contem(lerTela('Importacao.html'), 'Os casos vão nascer <strong>sem status</strong>');
  });

  teste('o cadastro pela tela continua nascendo Em andamento, carimbado', () => {
    const t = instalado();
    const { id } = t.chamar('cadastrarCaso')(t.mesa.id, { status: 'Em andamento', nomedosegurado: 'S' });
    igual(t.linha('BASE_MESA', id).Status, 'Em andamento');
    verdadeiro(!!t.linha('BASE_MESA', id)['Data em andamento']);
  });

  /* ----------------------------------------------------------------------- */
  secao('Cabeçalho com outra maiúscula ou acento na planilha não quebra nada');

  /** Troca um cabeçalho de uma aba de `t` (montado por outro ajudante). */
  const reescrever = (t, aba, de, para) => {
    const folha = t.ambiente.planilha.getSheetByName(aba);
    const cabecalhos = folha.getRange(1, 1, 1, folha.getLastColumn()).getValues()[0];
    folha.getRange(1, cabecalhos.indexOf(de) + 1).setValue(para);
    t.chamar('esquecerEstruturaLida_()');
  };

  teste('RET com "Status" na planilha (CANAIS e CAMPOS dizem "status"): trocar o status funciona e carimba', () => {
    const t = instalado();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Cliente' });
    t.reescreverCabecalho('BASE_RET', 'status', 'Status');
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, '1º contato realizado');
    const linha = t.linha('BASE_RET', id);
    igual(linha.Status, '1º contato realizado');
    verdadeiro(!!linha['Data do 1º contato'], 'o carimbo do status');
    verdadeiro(!!linha[COLUNA], 'a primeira mudança de status');
    igual(Number(linha['Mudanças de status']), 1);
  });

  teste('RET com "Status": a fila mostra o status e o selo, e o formulário troca e carimba', () => {
    const t = instalado();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Cliente' });
    t.reescreverCabecalho('BASE_RET', 'status', 'Status');
    let caso = comAFilaDaTela(t.chamar('resumoDoCanal')(t.ret.id, {}, 90)).fila.find((c) => String(c.id) === String(id));
    igual(caso.situacao, 'Não trabalhado');
    igual(caso.sinais[0].texto, 'Prazo de retorno · prazo cheio, 3 dias úteis');
    const aberto = t.chamar('casoParaEditar')(t.ret.id, id);
    igual(aberto.valores.status, 'Não trabalhado');
    t.chamar('editarCaso')(t.ret.id, id,
      Object.assign({}, aberto.valores, { status: 'Pendente' }), aberto.versao);
    const linha = t.linha('BASE_RET', id);
    igual(linha.Status, 'Pendente');
    verdadeiro(!!linha['Data pendente'] && !!linha[COLUNA], 'carimbou pelo formulário também');
    caso = comAFilaDaTela(t.chamar('resumoDoCanal')(t.ret.id, {}, 90)).fila.find((c) => String(c.id) === String(id));
    verdadeiro(caso.sinais[0].texto.indexOf('prazo cheio') < 0, 'o prazo começou');
  });

  teste('carimbo de status escrito de outro jeito ("DATA DO 1º CONTATO") é achado', () => {
    const t = instalado();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Cliente' });
    t.reescreverCabecalho('BASE_RET', 'Data do 1º contato', 'DATA DO 1º CONTATO');
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, '1º contato realizado');
    verdadeiro(!!t.linha('BASE_RET', id)['DATA DO 1º CONTATO']);
  });

  teste('data de entrada com outra grafia: o cadastro preenche, e não cria coluna nem chave dupla', () => {
    const t = instalado();
    t.reescreverCabecalho('BASE_RET', 'data de recepção do protocolo', 'Data de Recepção do Protocolo');
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Cliente' });
    verdadeiro(!!t.linha('BASE_RET', id)['Data de Recepção do Protocolo'], 'a data automática foi gravada');
  });

  teste('Mesa com "STATUS": o caso importado sem status vai para Em andamento e as 48 horas começam', () => {
    const t = mesaComAnalista();
    t.reescreverCabecalho('BASE_MESA', 'Status', 'STATUS');
    const caso = t.importar('Mesa maiúscula');
    t.chamar('alterarSituacaoDoCaso')(t.mesa.id, caso.__id, 'Em andamento');
    const linha = t.linha('BASE_MESA', caso.__id);
    igual(linha.STATUS, 'Em andamento');
    verdadeiro(!!linha['Data em andamento']);
    const fila = comAFilaDaTela(t.chamar('resumoDoCanal')(t.mesa.id, {}, 90)).fila;
    igual(fila.find((c) => String(c.id) === String(caso.__id)).sinais.length, 1);
  });

  teste('"STATUS PROPOSTA" na planilha: o Retido continua parando com Transmitido', () => {
    const t = retComAParada();
    reescrever(t, 'BASE_RET', 'Status proposta', 'STATUS PROPOSTA');
    const { id } = t.chamar('cadastrarCaso')(t.ret.id,
      Object.assign({}, t.base, { status: 'Retido', statusproposta: 'Transmitido' }));
    const linha = t.chamar('lerRegistros_')('BASE_RET').find((l) => l.__id === id);
    verdadeiro(!!linha['Data do status proposta'], 'carimbou a parada');
    const fila = comAFilaDaTela(t.chamar('resumoDoCanal')(t.ret.id, {}, 90)).fila;
    igual(fila.find((c) => String(c.id) === String(id)).sinais[0].encerrado, true);
  });

  teste('sair do Retido transmitido limpa o Status proposta e o carimbo da parada, com outra grafia', () => {
    const t = retComAParada();
    reescrever(t, 'BASE_RET', 'Status proposta', 'STATUS PROPOSTA');
    const { id } = t.chamar('cadastrarCaso')(t.ret.id,
      Object.assign({}, t.base, { status: 'Retido', statusproposta: 'Transmitido' }));
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, 'Não retido');
    const linha = t.chamar('lerRegistros_')('BASE_RET').find((l) => l.__id === id);
    igual(String(linha['STATUS PROPOSTA'] || ''), '');
    igual(String(linha['Data do status proposta'] || ''), '', 'o carimbo sai junto');
  });

  teste('o carimbo de status com outra grafia guarda a PRIMEIRA visita', () => {
    const t = instalado();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Cliente' });
    t.reescreverCabecalho('BASE_RET', 'Data pendente', 'DATA PENDENTE');
    // A primeira visita, numa data conhecida: a segunda não pode reescrevê-la.
    const primeira = new Date(2026, 8, 1, 9, 0);
    t.chamar('atualizarRegistro_')('BASE_RET', id, { 'DATA PENDENTE': primeira });
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, 'Pendente');
    igual(t.linha('BASE_RET', id)['DATA PENDENTE'].getTime(), primeira.getTime(), 'não regravou');
  });

  teste('o aviso mostra o caso pela 1ª coluna do 2º grupo, e o Id quando ela está vazia', () => {
    const rotulo = tela().rotuloDoCaso;
    igual(rotulo({ id: '7', celulas: [[{ valor: '12/10' }], [{ valor: '7-0000123' }, { valor: 'Vida' }]] }),
      '7-0000123');
    igual(rotulo({ id: '7', celulas: [[{ valor: '12/10' }], [{ valor: '' }, { valor: 'Auto' }]] }), '7',
      'vazia: o Id, e não a coluna seguinte');
  });

  teste('o diagnóstico avisa o campo escrito diferente da planilha — como atenção, não falha', () => {
    const t = instalado();
    t.reescreverCabecalho('BASE_RET', 'descrição', 'Descrição');
    const campos = t.chamar('diagnosticoRECC()').blocos.find((b) => b.chave === 'campos');
    const aviso = campos.itens.find((i) => i.oQue.indexOf('escrito diferente da planilha') >= 0);
    igual(aviso.situacao, 'atencao', 'nada quebra: é atenção, não falha');
    contem(aviso.detalhe, 'BASE_RET: "descrição" no CAMPOS, "Descrição" na planilha');
    const limpo = instalado().chamar('diagnosticoRECC()').blocos.find((b) => b.chave === 'campos');
    verdadeiro(!limpo.itens.some((i) => i.oQue.indexOf('escrito diferente') >= 0),
      'planilha igual: sem aviso');
  });

  teste('sair do Retido esvazia o Status proposta mesmo com outra grafia', () => {
    const t = retComAParada();
    reescrever(t, 'BASE_RET', 'status', 'Status');
    reescrever(t, 'BASE_RET', 'Status proposta', 'STATUS PROPOSTA');
    const { id } = t.chamar('cadastrarCaso')(t.ret.id,
      Object.assign({}, t.base, { status: 'Retido', statusproposta: 'Aguardando transmissão' }));
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, 'Não retido');
    const linha = t.chamar('lerRegistros_')('BASE_RET').find((l) => l.__id === id);
    igual(String(linha['STATUS PROPOSTA'] || ''), '');
  });
}

module.exports = { rodarTestesDaDescricaoEDoInicioDoPrazo };
