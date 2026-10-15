/**
 * ============================================================================
 * PGO — testes-retido-tentativa-e-lote.js · a rodada da Etapa 39
 * ============================================================================
 * Pedidos do PO, palavra por palavra:
 *   1. "quando o status for preenchido como retido o valor retido deve ser
 *      obrigatório incluir" — e ele escolheu: "pede no próprio diálogo".
 *   2. "ajustei o PGO para que quando o status for retido ou for sem sucesso
 *      de contato ele mostre a caixinha da tentativa de contato. Nela apaguei
 *      e coloquei outras opções, mas notei que ele não está carimbando a opção
 *      da lista na planilha. Tanto no botão da aba trabalho quanto em
 *      cadastrar caso".
 *   3. "Escolher importação deve permitir que eu delegue o status de origem
 *      para todos os casos" — e ele escolheu: "status para todos, sem carimbar".
 *
 * A causa do 2 (achado 98): o contrato da BASE_RET dizia que a coluna
 * "tentativas de contato" guarda NÚMERO. O valor da lista — "Caixa postal",
 * e até o "1ª tentativa" de fábrica — passava pela conversão para número,
 * virava vazio e era gravado vazio, sem erro nenhum.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, pecaRodando } =
  require('./ferramentas');

const lerTela = (nome) => fs.readFileSync(
  path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

/** A RET instalada, com o que o PO fez: a tentativa aparecendo no Retido e no Sem sucesso. */
function retDoPO() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.chamar('definirSenhaDeAdministrador')('segredo123', '');
  t.chamar('liberarComSenha')('segredo123');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  t.mesa = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
  t.campo = (chave) => t.chamar('listarCamposDoCanal')(t.ret.id).find((c) => c.chave === chave);
  t.linha = (id) => t.chamar('lerRegistros_')('BASE_RET').find((l) => String(l.__id) === String(id));
  t.salvarCampo = (chave, extra) => {
    const c = t.campo(chave);
    return t.chamar('salvarCampo')(Object.assign({ id: c.id, rotulo: c.rotulo, secao: c.secao,
      tipo: c.tipo, catalogo: c.catalogo, obrigatorio: c.obrigatorio, ativo: true }, extra));
  };
  return t;
}

/** O que o PO fez na lista: apagou as opções de fábrica e pôs as dele. */
function trocarAsOpcoesDaTentativa(t) {
  t.chamar('lerRegistros_')('CATALOGO').filter((i) => i.Tipo === 'TENTATIVA')
    .forEach((i) => t.chamar('excluirItemDoCatalogo')(i.Id));
  ['Caixa postal', 'Não atende', 'Número errado'].forEach((nome, i) => {
    t.chamar('salvarItemDoCatalogo')({ tipo: 'TENTATIVA', canalId: '', nome, ordem: i + 1, ativo: true });
  });
  t.salvarCampo('tentativasdecontato',
    { mostrarSe: { campo: 'status', valores: ['Retido', 'Sem sucesso de contato'] } });
}

function rodarTestesDoRetidoTentativaELote() {
  console.log('\nEtapa 39: o valor retido no Retido, a tentativa de contato e o status do lote');

  /* ----------------------------------------------------------------------- */
  secao('O valor retido é obrigatório no Retido — no cadastro e na edição');

  teste('de fábrica, o campo traz a condição "obrigatório quando Status for Retido"', () => {
    const t = retDoPO();
    const campo = t.campo('valordopremioretido');
    igual(JSON.stringify(campo.obrigatorioSe), JSON.stringify({ campo: 'status', valores: ['Retido'] }));
    igual(campo.obrigatorio, false, 'nos outros status não é cobrado');
    verdadeiro(!campo.mostrarSe, 'e continua aparecendo em todos os status');
  });

  teste('cadastrar Retido sem o valor é recusado, com o nome do campo', () => {
    const t = retDoPO();
    lanca(() => t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'C', status: 'Retido' }),
      'Valor do prêmio retido — é obrigatório');
  });

  teste('cadastrar Retido com o valor grava o valor', () => {
    const t = retDoPO();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id,
      { nomedocliente: 'C', status: 'Retido', valordopremioretido: '900,00' });
    igual(Number(t.linha(id)['valor do prêmio retido']), 900);
  });

  teste('nos outros status o valor não é cobrado — e, se vier, é gravado', () => {
    const t = retDoPO();
    verdadeiro(!!t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'C', status: 'Pendente' }).id);
    const { id } = t.chamar('cadastrarCaso')(t.ret.id,
      { nomedocliente: 'C', status: 'Pendente', valordopremioretido: '50,00' });
    igual(Number(t.linha(id)['valor do prêmio retido']), 50, 'o campo aparece em todos');
  });

  teste('editar para Retido sem o valor é recusado', () => {
    const t = retDoPO();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'C', status: 'Pendente' });
    lanca(() => t.chamar('editarCaso')(t.ret.id, id, { nomedocliente: 'C', status: 'Retido' }),
      'Valor do prêmio retido');
    igual(t.linha(id).status, 'Pendente', 'nada mudou');
  });

  teste('"Obrigatório" marcado continua valendo para todos os status', () => {
    const t = retDoPO();
    t.salvarCampo('valordopremioretido', { obrigatorio: true });
    lanca(() => t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'C', status: 'Pendente' }),
      'Valor do prêmio retido');
  });

  /* ----------------------------------------------------------------------- */
  secao('O "Alterar status" pede o valor no próprio diálogo');

  teste('o diálogo pergunta ao servidor quais campos o status pede', () => {
    const t = retDoPO();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'C', status: 'Pendente' });
    const pedidos = t.chamar('camposDaSituacao')(t.ret.id, id, 'Retido');
    igual(pedidos.map((c) => c.chave).join(','), 'valordopremioretido');
    igual(pedidos[0].obrigatorio, true);
    igual(t.chamar('camposDaSituacao')(t.ret.id, id, 'Pendente').length, 0,
      'o Pendente não pede nada');
  });

  teste('o campo que o status mostra também vem — com o valor que o caso já tem', () => {
    const t = retDoPO();
    trocarAsOpcoesDaTentativa(t);
    const { id } = t.chamar('cadastrarCaso')(t.ret.id,
      { nomedocliente: 'C', status: 'Pendente', valordopremioretido: '75,00' });
    const pedidos = t.chamar('camposDaSituacao')(t.ret.id, id, 'Retido');
    igual(pedidos.map((c) => c.chave).sort().join(','), 'tentativasdecontato,valordopremioretido');
    igual(Number(pedidos.find((c) => c.chave === 'valordopremioretido').valor), 75);
    igual(pedidos.find((c) => c.chave === 'tentativasdecontato').opcoes
      .map((o) => (typeof o === 'object' ? o.valor : o)).join('|'),
      'Caixa postal|Não atende|Número errado', 'com as opções da lista do PO');
    igual(t.chamar('camposDaSituacao')(t.ret.id, id, 'Sem sucesso de contato')
      .map((c) => c.chave).join(','), 'tentativasdecontato');
  });

  teste('os campos vão ao diálogo sem a condição — senão o formulário os esconderia', () => {
    // Achado no navegador: no diálogo o status é o seletor dele, e não um
    // campo "status". Com a condição junto, o formulário não achava quem manda
    // e escondia a tentativa que o status tinha acabado de pedir.
    const t = retDoPO();
    trocarAsOpcoesDaTentativa(t);
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'C', status: 'Pendente' });
    const pedidos = t.chamar('camposDaSituacao')(t.ret.id, id, 'Retido');
    verdadeiro(pedidos.every((c) => !c.mostrarSe && !c.obrigatorioSe));
    const html = pecaRodando('Formulario').Formulario.desenhar(
      { secoes: [{ nome: 'Retido', campos: pedidos }], canal: {} }, 'situacao-');
    verdadeiro(html.indexOf('data-mostrar-se-campo') < 0 && html.indexOf('data-obrigatorio-se-campo') < 0);
    contem(html, 'id="situacao-campo-tentativasdecontato"');
  });

  teste('trocar para Retido sem o valor é recusado — e o status não muda', () => {
    const t = retDoPO();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'C', status: 'Pendente' });
    lanca(() => t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, 'Retido', {}),
      'Para "Retido", confira: Valor do prêmio retido — é obrigatório');
    lanca(() => t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, 'Retido'),
      'é obrigatório', 'quem chama sem mandar nada também é cobrado');
    igual(t.linha(id).status, 'Pendente');
  });

  teste('trocar para Retido com o valor grava os dois', () => {
    const t = retDoPO();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'C', status: 'Pendente' });
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, 'Retido', { valordopremioretido: '900,00' });
    igual(t.linha(id).status, 'Retido');
    igual(Number(t.linha(id)['valor do prêmio retido']), 900);
  });

  teste('o caso que já tem o valor troca para Retido sem pedir de novo', () => {
    const t = retDoPO();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id,
      { nomedocliente: 'C', status: 'Pendente', valordopremioretido: '120,00' });
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, 'Retido');
    igual(t.linha(id).status, 'Retido');
  });

  teste('valor que não é dinheiro é recusado no diálogo como no formulário', () => {
    const t = retDoPO();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'C', status: 'Pendente' });
    lanca(() => t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, 'Retido',
      { valordopremioretido: 'muito' }), 'Valor do prêmio retido');
  });

  teste('a tela do diálogo desenha os campos e manda os valores junto', () => {
    const comuns = lerTela('Comuns.html');
    contem(comuns, 'id="campos-da-situacao"');
    contem(comuns, "'camposDaSituacao'");
    contem(comuns, "Formulario.valores(elemento('campos-da-situacao'))");
  });

  teste('o formulário põe e tira o asterisco conforme o status', () => {
    const tela = pecaRodando('Formulario').Formulario;
    const html = tela.desenhar({ secoes: [{ nome: 'S', campos: [
      { chave: 'status', rotulo: 'Status', tipo: 'seletor', opcoes: ['Pendente', 'Retido'] },
      { chave: 'valordopremioretido', rotulo: 'Valor', tipo: 'moeda',
        obrigatorioSe: { campo: 'status', valores: ['Retido'] } }] }] }, '');
    contem(html, 'data-obrigatorio-se-campo="status"');
    contem(html, 'data-exigido-condicional');
  });

  /* ----------------------------------------------------------------------- */
  secao('Configurações: "Quando este campo é obrigatório"');

  teste('a condição de obrigatório se guarda, e "sempre" a tira', () => {
    const t = retDoPO();
    t.salvarCampo('valordopremioretido',
      { obrigatorioSe: { campo: 'status', valores: ['Retido', 'Pago'] } });
    igual(t.campo('valordopremioretido').obrigatorioSe.valores.join('|'), 'Retido|Pago');
    t.salvarCampo('valordopremioretido', { obrigatorioSe: null });
    verdadeiro(!t.campo('valordopremioretido').obrigatorioSe);
  });

  teste('quem salva sem falar da condição não mexe nela', () => {
    const t = retDoPO();
    t.salvarCampo('valordopremioretido', {});
    igual(t.campo('valordopremioretido').obrigatorioSe.valores.join('|'), 'Retido');
  });

  teste('recusa valor que o campo que manda não tem', () => {
    const t = retDoPO();
    contem(lanca(() => t.salvarCampo('valordopremioretido',
      { obrigatorioSe: { campo: 'status', valores: ['Retidoo'] } })).message, 'Retidoo');
  });

  teste('a tela oferece as duas condições, com a mesma função', () => {
    const tela = lerTela('Configuracoes.html');
    contem(tela, "obrigatorioSe: { prefixo: 'obrigar', marca: 'data-valor-da-obrigacao'");
    contem(tela, "obrigatorioSe: lerACondicao('obrigatorioSe')");
    contem(tela, 'Quando este campo é obrigatório');
  });

  /* ----------------------------------------------------------------------- */
  secao('A tentativa de contato grava a opção da lista (achado 98)');

  teste('a coluna "tentativas de contato" guarda texto, no contrato', () => {
    const t = retDoPO();
    const coluna = t.chamar('RECC_ESQUEMA').BASE_RET.colunas
      .find((c) => c.cabecalho === 'tentativas de contato');
    igual(coluna.tipo, 'texto');
  });

  teste('cadastrar caso grava a opção que o PO criou', () => {
    const t = retDoPO();
    trocarAsOpcoesDaTentativa(t);
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'C',
      status: 'Sem sucesso de contato', tentativasdecontato: 'Caixa postal' });
    igual(t.linha(id)['tentativas de contato'], 'Caixa postal');
  });

  teste('a opção de fábrica também grava (antes ia em branco)', () => {
    const t = retDoPO();
    const { id } = t.chamar('cadastrarCaso')(t.ret.id,
      { nomedocliente: 'C', status: 'Pendente', tentativasdecontato: '1ª tentativa' });
    igual(t.linha(id)['tentativas de contato'], '1ª tentativa');
  });

  teste('o botão da aba Trabalho ("Alterar status") grava a opção', () => {
    const t = retDoPO();
    trocarAsOpcoesDaTentativa(t);
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'C', status: 'Pendente' });
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, 'Sem sucesso de contato',
      { tentativasdecontato: 'Não atende' });
    igual(t.linha(id).status, 'Sem sucesso de contato');
    igual(t.linha(id)['tentativas de contato'], 'Não atende');
  });

  teste('o "Trabalhar no caso" (editar) grava a opção', () => {
    const t = retDoPO();
    trocarAsOpcoesDaTentativa(t);
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'C', status: 'Pendente' });
    t.chamar('editarCaso')(t.ret.id, id, { nomedocliente: 'C', status: 'Retido',
      valordopremioretido: '10,00', tentativasdecontato: 'Número errado' });
    igual(t.linha(id)['tentativas de contato'], 'Número errado');
  });

  teste('valor que a coluna não guardaria é recusado alto, e não gravado em branco', () => {
    // A rede de segurança: se outra coluna ainda disser número e o campo for
    // lista, a pessoa fica sabendo — o sistema não engole o valor calado.
    const t = retDoPO();
    t.chamar('RECC_ESQUEMA').BASE_RET.colunas
      .find((c) => c.cabecalho === 'tentativas de contato').tipo = 'numero';
    t.chamar('esquecerEstruturaLida_')();
    trocarAsOpcoesDaTentativa(t);
    contem(lanca(() => t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'C',
      status: 'Sem sucesso de contato', tentativasdecontato: 'Caixa postal' })).message,
      'guarda número, e "Caixa postal" ficaria em branco');
    const { id } = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'C', status: 'Pendente' });
    lanca(() => t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, 'Sem sucesso de contato',
      { tentativasdecontato: 'Caixa postal' }), 'ficaria em branco');
  });

  /* ----------------------------------------------------------------------- */
  secao('A importação: um status para todos os casos do lote');

  function lote(t, extra, linhas) {
    if (!t.chamar('lerRegistros_')('USUARIOS').some((u) => u.Nome === 'Marcos Vieira')) {
      const operacao = t.chamar('lerRegistros_')('CATALOGO')
        .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id;
      t.chamar('salvarUsuario')({ nome: 'Marcos Vieira', email: 'marcos@exemplo.com',
        nivelAcessoId: operacao, canalId: t.ret.id, ativo: true });
    }
    const grade = linhas || [['CPF', 'nome do cliente', 'status'],
      ['10000000001', 'Sem status', ''], ['10000000002', 'Já pago', 'Pago']];
    return Object.assign({
      fonte: { tipo: 'colado', texto: grade.map((l) => l.join('\t')).join('\n') },
      analistas: ['Marcos Vieira'], origem: 'Lote de teste' }, extra);
  }
  const doLote = (t, nome) => t.chamar('lerRegistros_')('BASE_RET')
    .find((l) => l['nome do cliente'] === nome);

  teste('a tela recebe os status do canal para escolher', () => {
    const t = retDoPO();
    const opcoes = t.chamar('opcoesDaImportacaoDeCasos')(t.ret.id);
    verdadeiro(opcoes.statusDoCanal.some((s) => s.valor === 'Pendente'));
    verdadeiro(opcoes.statusDoCanal.some((s) => s.valor === 'Não trabalhado'));
  });

  teste('sem escolher, vale o de antes: a RET nasce "Não trabalhado"', () => {
    const t = retDoPO();
    t.chamar('importarCasos')(t.ret.id, lote(t, {}));
    igual(doLote(t, 'Sem status').status, 'Não trabalhado');
  });

  teste('escolhido, o status vale para os casos que vieram sem status — o da planilha fica', () => {
    const t = retDoPO();
    const laudo = t.chamar('conferirImportacaoDeCasos')(t.ret.id, lote(t, { statusDoLote: 'Pendente' }));
    igual(laudo.statusPadrao, 'Pendente', 'a conferência já diz');
    t.chamar('importarCasos')(t.ret.id, lote(t, { statusDoLote: 'Pendente' }));
    igual(doLote(t, 'Sem status').status, 'Pendente');
    igual(doLote(t, 'Já pago').status, 'Pago', 'o status que a planilha trouxe não é trocado');
  });

  teste('o status do lote não carimba: o caso importado não ganha data de status', () => {
    const t = retDoPO();
    t.chamar('importarCasos')(t.ret.id, lote(t, { statusDoLote: 'Pendente' }));
    const caso = doLote(t, 'Sem status');
    igual(String(caso['Data da primeira mudança de status'] || ''), '');
  });

  teste('"sem status" também é uma escolha', () => {
    const t = retDoPO();
    t.chamar('importarCasos')(t.ret.id, lote(t, { statusDoLote: '' }));
    igual(String(doLote(t, 'Sem status').status || ''), '');
  });

  teste('status que o canal não tem é recusado, com a lista dos que tem', () => {
    const t = retDoPO();
    contem(lanca(() => t.chamar('importarCasos')(t.ret.id, lote(t, { statusDoLote: 'Inventado' })))
      .message, 'O status "Inventado" não existe no canal');
    igual(doLote(t, 'Sem status'), undefined, 'nada foi gravado');
  });

  teste('a tela oferece a escolha e a manda na conferência e na importação', () => {
    const tela = lerTela('Importacao.html');
    contem(tela, 'id="status-do-lote"');
    contem(tela, 'function statusQueVale');
  });

  /* ----------------------------------------------------------------------- */
  secao('A atualização (atualizarPGO) leva tudo para a planilha que já existe');

  teste('liga a condição do valor retido numa RET antiga, sem condição', () => {
    const t = retDoPO();
    const campo = t.chamar('lerRegistros_')('CAMPOS')
      .find((c) => c.ChaveTecnica === 'valordopremioretido' && String(c.CanalId) === String(t.ret.id));
    const configuracao = JSON.parse(campo.Configuracao || '{}');
    delete configuracao.obrigatorioSe;
    t.chamar('atualizarRegistro_')('CAMPOS', campo.__id, { Configuracao: JSON.stringify(configuracao) });
    verdadeiro(!t.campo('valordopremioretido').obrigatorioSe, 'a RET antiga');
    contem(t.chamar('atualizarPGO()'), 'o valor retido passou a ser obrigatório quando o Status é Retido');
    igual(t.campo('valordopremioretido').obrigatorioSe.valores.join('|'), 'Retido');
    contem(t.chamar('atualizarPGO()'), 'o valor retido já tem a condição de obrigatório',
      'a segunda vez não mexe');
  });

  teste('não mexe na condição que o PO já escolheu', () => {
    const t = retDoPO();
    t.salvarCampo('valordopremioretido', { obrigatorioSe: { campo: 'status', valores: ['Pago'] } });
    t.chamar('atualizarPGO()');
    igual(t.campo('valordopremioretido').obrigatorioSe.valores.join('|'), 'Pago');
  });

  teste('o campo marcado "Obrigatório" sempre fica assim, e o laudo explica', () => {
    const t = retDoPO();
    t.salvarCampo('valordopremioretido', { obrigatorio: true, obrigatorioSe: null });
    contem(t.chamar('atualizarPGO()'), 'está marcado como obrigatório SEMPRE');
    verdadeiro(!t.campo('valordopremioretido').obrigatorioSe);
  });

  teste('cria a aba ATENDIMENTOS_CHAT, e avisa da planilha do chat que estava ligada', () => {
    const t = retDoPO();
    t.ambiente.planilha.deleteSheet(t.ambiente.planilha.getSheetByName('ATENDIMENTOS_CHAT'));
    t.chamar('gravarConfiguracao_')('CHAT.PLANILHA_ID', 'id-antigo-do-chat');
    const recado = t.chamar('atualizarPGO()');
    contem(recado, 'aba ATENDIMENTOS_CHAT criada');
    contem(recado, 'NÃO é mais lida');
    contem(recado, 'id-antigo-do-chat');
    verdadeiro(!!t.ambiente.planilha.getSheetByName('ATENDIMENTOS_CHAT'));
  });
}

module.exports = { rodarTestesDoRetidoTentativaELote };
