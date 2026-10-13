/**
 * ============================================================================
 * PGO — testes-condicional.js · o campo que aparece conforme outro campo
 * ============================================================================
 * Pedido do PO: "quando eu seleciono o status como retido, pago, cancelado, ou
 * quantos forem necessários, seja permitido gerar outro campo seletor" — o
 * Status proposta, com a lista que ele mesmo criou.
 *
 * O que existia: uma condição de UM valor, só escrita pelo código, só
 * respeitada pela tela. O que os testes daqui cobram: vários valores,
 * configurável em Configurações › Cadastrar Caso, e respeitada pelo servidor.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario,
  elementoFalso, pecaRodando } = require('./ferramentas');

const lerTela = (nome) => fs.readFileSync(
  path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

/** A RET com o Status proposta, montado como o PO monta: lista, campo, condição. */
function retComStatusProposta(obrigatorio) {
  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');
  chamar('definirSenhaDeAdministrador')('segredo123', '');
  chamar('liberarComSenha')('segredo123');
  const ret = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');

  const lista = chamar('criarLista')('Status proposta');
  ['Transmitido', 'Aguardando transmissão', 'Sem alteração'].forEach((nome, i) => {
    chamar('salvarItemDoCatalogo')({ tipo: lista, canalId: '', nome: nome, ordem: i + 1, ativo: true });
  });
  chamar('criarCampo')(ret.id, { rotulo: 'Status proposta', tipo: 'seletor', secao: 'Seguro' });

  const campo = () => chamar('listarCamposDoCanal')(ret.id)
    .find((c) => c.cabecalho === 'Status proposta');
  const salvar = (extra) => chamar('salvarCampo')(Object.assign({
    id: campo().id, rotulo: 'Status proposta', secao: 'Seguro', tipo: 'seletor',
    catalogo: lista, obrigatorio: obrigatorio === true, ativo: true }, extra));
  salvar({ mostrarSe: { campo: 'status', valores: ['Retido', 'Pago', 'Cancelado'] } });

  const base = { nomedocliente: 'Cliente de teste' };
  const linha = (id) => chamar('lerRegistros_')('BASE_RET').find((l) => l.__id === id);
  return { ambiente, chamar, ret, lista, campo, salvar, base, linha };
}

function rodarTestesDoCampoCondicional() {
  console.log('\nO campo que aparece conforme outro campo');

  /* ----------------------------------------------------------------------- */
  secao('A condição aceita quantos valores forem necessários');

  teste('o formulário leva a condição com todos os valores', () => {
    const { chamar, ret } = retComStatusProposta();
    const campo = chamar('formularioDoCanal')(ret.id).secoes
      .reduce((soma, s) => soma.concat(s.campos), [])
      .find((c) => c.chave === 'statusproposta');
    igual(campo.mostrarSe.campo, 'status');
    igual(campo.mostrarSe.valores.join('|'), 'Retido|Pago|Cancelado');
    igual(campo.opcoes.map((o) => o.valor).join('|'),
      'Transmitido|Aguardando transmissão|Sem alteração', 'a lista que o PO criou');
  });

  teste('a forma antiga, de um valor só, continua valendo', () => {
    const { chamar } = carregar('primeiro.adm@exemplo.com');
    igual(chamar('condicaoDoCampo_')({ mostrarSe: { campo: 'canal', valor: 'Central' } })
      .valores.join('|'), 'Central');
    igual(chamar('condicaoDoCampo_')({}), null);
    igual(chamar('condicaoDoCampo_')({ mostrarSe: { campo: 'canal', valores: [] } }), null,
      'sem valor nenhum não há condição: o campo aparece sempre');
  });

  teste('compara sem acento e sem caixa, como a tela', () => {
    const { chamar } = carregar('primeiro.adm@exemplo.com');
    const condicao = { campo: 'status', valores: ['Sem alteração'] };
    verdadeiro(chamar('condicaoBate_')(condicao, ' SEM ALTERACAO '));
    verdadeiro(!chamar('condicaoBate_')(condicao, 'Sem alterações'));
  });

  /* ----------------------------------------------------------------------- */
  secao('O servidor respeita a condição');

  teste('com o status que mostra o campo, o campo obrigatório é cobrado', () => {
    const { chamar, ret, base } = retComStatusProposta(true);
    ['Retido', 'Pago', 'Cancelado'].forEach((status) => {
      const erro = lanca(() => chamar('cadastrarCaso')(ret.id,
        Object.assign({ status: status }, base)));
      contem(erro.message, 'Status proposta — é obrigatório', status);
    });
  });

  teste('com outro status, o campo escondido não trava nem grava', () => {
    const { chamar, ret, base, linha } = retComStatusProposta(true);
    const novo = chamar('cadastrarCaso')(ret.id, Object.assign(
      { status: 'Não retido', statusproposta: 'Transmitido' }, base));
    igual(linha(novo.id)['Status proposta'], '',
      'o valor que veio de um campo escondido não é gravado');
  });

  teste('o status padrão do cadastro também decide: Não trabalhado não cobra', () => {
    const { chamar, ret, base } = retComStatusProposta(true);
    verdadeiro(!!chamar('cadastrarCaso')(ret.id, base).id);
  });

  teste('Retido com o Status proposta escolhido grava os dois', () => {
    const { chamar, ret, base, linha } = retComStatusProposta(true);
    const novo = chamar('cadastrarCaso')(ret.id, Object.assign(
      { status: 'Retido', statusproposta: 'Aguardando transmissão' }, base));
    igual(linha(novo.id)['Status proposta'], 'Aguardando transmissão');
  });

  teste('o valor fora da lista é recusado como em qualquer seletor', () => {
    const { chamar, ret, base } = retComStatusProposta();
    lanca(() => chamar('cadastrarCaso')(ret.id, Object.assign(
      { status: 'Retido', statusproposta: 'Inventado' }, base)), 'lista');
  });

  /* ----------------------------------------------------------------------- */
  secao('Sair do status que mostrava o campo esvazia o campo');

  function retidoTransmitido() {
    const tudo = retComStatusProposta();
    const novo = tudo.chamar('cadastrarCaso')(tudo.ret.id, Object.assign(
      { status: 'Retido', statusproposta: 'Transmitido' }, tudo.base));
    return Object.assign({ id: novo.id }, tudo);
  }

  teste('trocar pelo diálogo rápido de Retido para Não retido esvazia', () => {
    const t = retidoTransmitido();
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, t.id, 'Não retido');
    igual(t.linha(t.id)['Status proposta'], '');
  });

  teste('trocar pelo formulário também esvazia', () => {
    const t = retidoTransmitido();
    t.chamar('editarCaso')(t.ret.id, t.id, Object.assign({ status: 'Cancelado',
      statusproposta: 'Transmitido' }, t.base));
    verdadeiro(t.linha(t.id)['Status proposta'] === 'Transmitido',
      'Cancelado também mostra o campo: ele fica');
    t.chamar('editarCaso')(t.ret.id, t.id, Object.assign({ status: 'Pendente' }, t.base));
    igual(t.linha(t.id)['Status proposta'], '');
  });

  teste('trocar entre dois status que mostram o campo NÃO esvazia', () => {
    const t = retidoTransmitido();
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, t.id, 'Pago');
    igual(t.linha(t.id)['Status proposta'], 'Transmitido');
  });

  teste('abrir e salvar um caso que já tinha o valor com o campo escondido não apaga', () => {
    // Um caso importado pode trazer valor numa coluna cujo campo hoje está
    // escondido. Mostrar o caso não é pedir para apagar: só a TROCA limpa.
    const t = retComStatusProposta();
    const novo = t.chamar('inserirRegistro_')('BASE_RET', { analista: 'Ana', status: 'Pendente',
      'nome do cliente': 'Importado', 'Status proposta': 'Transmitido' });
    t.chamar('editarCaso')(t.ret.id, novo.__id, Object.assign({ status: 'Pendente' }, t.base));
    igual(t.linha(novo.__id)['Status proposta'], 'Transmitido');
  });

  /* ----------------------------------------------------------------------- */
  secao('Configurações › Cadastrar Caso: "Aparece quando…"');

  teste('a lista dos campos traz a condição e as opções de cada seletor', () => {
    const { chamar, ret } = retComStatusProposta();
    const campos = chamar('listarCamposDoCanal')(ret.id);
    const status = campos.find((c) => c.chave === 'status');
    verdadeiro(status.opcoes.indexOf('Retido') >= 0, 'o campo que manda traz as opções dele');
    igual(campos.find((c) => c.chave === 'statusproposta').mostrarSe.valores.length, 3);
    igual(campos.find((c) => c.chave === 'protocolo').opcoes.length, 0, 'texto não tem opções');
  });

  teste('guarda os nomes das opções como a lista os escreve', () => {
    const { chamar, campo, salvar } = retComStatusProposta();
    salvar({ mostrarSe: { campo: 'status', valores: ['retido', 'CANCELADO'] } });
    igual(campo().mostrarSe.valores.join('|'), 'Retido|Cancelado');
  });

  teste('"Aparece sempre" tira a condição', () => {
    const { campo, salvar } = retComStatusProposta();
    salvar({ mostrarSe: null });
    igual(campo().mostrarSe, null);
  });

  teste('quem salva sem falar da condição não mexe nela', () => {
    const { campo, salvar } = retComStatusProposta();
    salvar({});
    igual(campo().mostrarSe.valores.length, 3, 'o painel antigo, sem o bloco, não apaga a regra');
  });

  teste('recusa o que faria o campo nunca aparecer', () => {
    const { campo, salvar, chamar, ret } = retComStatusProposta();
    contem(lanca(() => salvar({ mostrarSe: { campo: 'status', valores: ['Retidoo'] } })).message,
      'não é uma opção de "Status"', 'valor que a lista não tem');
    contem(lanca(() => salvar({ mostrarSe: { campo: 'status', valores: [] } })).message,
      'Escolha em quais valores', 'nenhum valor marcado');
    contem(lanca(() => salvar({ mostrarSe: { campo: 'statusproposta', valores: ['Transmitido'] } }))
      .message, 'OUTRO campo', 'o campo mandando em si mesmo');
    contem(lanca(() => salvar({ mostrarSe: { campo: 'nao-existe', valores: ['x'] } })).message,
      'OUTRO campo', 'campo que não existe');

    const status = chamar('listarCamposDoCanal')(ret.id).find((c) => c.chave === 'status');
    const ciclo = lanca(() => chamar('salvarCampo')({ id: status.id, rotulo: 'Status',
      secao: status.secao, tipo: 'seletor', catalogo: status.catalogo, ativo: true,
      mostrarSe: { campo: 'statusproposta', valores: ['Transmitido'] } }));
    contem(ciclo.message, 'um esperaria o outro');
    igual(campo().mostrarSe.valores.length, 3, 'nada mudou');
  });

  teste('campo que manda sem lista (texto) aceita o valor escrito', () => {
    const { campo, salvar } = retComStatusProposta();
    salvar({ mostrarSe: { campo: 'protocolo', valores: ['URGENTE'] } });
    igual(campo().mostrarSe.valores.join('|'), 'URGENTE');
  });

  teste('só quem configura mexe', () => {
    const { ambiente, chamar, campo, salvar } = retComStatusProposta();
    chamar('salvarUsuario')({ nome: 'Ana Operação', email: 'ana@exemplo.com',
      nivelAcessoId: chamar('lerRegistros_("CATALOGO")').find((i) =>
        String(i.Tipo) === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id, ativo: true });
    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      lanca(() => salvar({ mostrarSe: null }), 'configurar');
    });
    igual(campo().mostrarSe.valores.length, 3);
  });

  /* ----------------------------------------------------------------------- */
  secao('A tela: vários valores, sem limpar ao abrir o caso');

  function formularioComCondicao() {
    const form = pecaRodando('Formulario').Formulario;
    const manda = elementoFalso('select', { 'data-chave': 'status' });
    const obedece = elementoFalso('select', { 'data-chave': 'statusproposta' });
    const bloco = elementoFalso('div', {
      'data-campo': 'statusproposta', 'data-mostrar-se-campo': 'status',
      'data-mostrar-se-valores': JSON.stringify(['Retido', 'Pago', 'Cancelado'])
    }).por(obedece);
    const raiz = elementoFalso('div').por(manda, bloco);
    form.ligar(raiz, 'editar-', '1', false, '1');
    return { form, manda, obedece, bloco, raiz };
  }

  teste('qualquer um dos valores mostra o campo', () => {
    const { manda, bloco } = formularioComCondicao();
    verdadeiro(bloco.hidden, 'nasce escondido');
    ['Retido', 'Pago', 'cancelado'].forEach((valor) => {
      manda.value = valor; manda.disparar('change');
      igual(bloco.hidden, false, valor);
    });
    manda.value = 'Pendente'; manda.disparar('change');
    igual(bloco.hidden, true);
  });

  teste('abrir um caso mostra o campo que vale para ele, e guarda o valor', () => {
    const { form, raiz, obedece, bloco } = formularioComCondicao();
    form.preencher(raiz, { status: 'Pago', statusproposta: 'Transmitido' });
    igual(bloco.hidden, false, 'antes só aparecia depois de mexer no status');
    igual(obedece.value, 'Transmitido');
  });

  teste('abrir um caso que não mostra o campo não apaga o valor guardado', () => {
    const { form, raiz, obedece, bloco } = formularioComCondicao();
    form.preencher(raiz, { status: 'Pendente', statusproposta: 'Transmitido' });
    igual(bloco.hidden, true);
    igual(obedece.value, 'Transmitido');
  });

  teste('só a pessoa trocando o status esvazia o campo escondido', () => {
    const { form, raiz, manda, obedece } = formularioComCondicao();
    form.preencher(raiz, { status: 'Retido', statusproposta: 'Transmitido' });
    manda.value = 'Pendente'; manda.disparar('change');
    igual(obedece.value, '');
  });

  teste('a tela desenha a condição como lista, e a de Configurações a oferece', () => {
    const peca = pecaRodando('Formulario').Formulario;
    const html = peca.desenhar({ canal: {}, secoes: [{ nome: 'Seguro', campos: [{
      chave: 'statusproposta', rotulo: 'Status proposta', tipo: 'seletor', largura: 1,
      opcoes: [{ valor: 'Transmitido', rotulo: 'Transmitido' }],
      mostrarSe: { campo: 'status', valores: ['Retido', 'Pago'] } }] }] }, '');
    // O escapar da peça de teste não escapa: o que importa é a lista inteira
    // viajar no atributo, e não só o primeiro valor.
    contem(html, 'data-mostrar-se-valores=');
    contem(html, '["Retido","Pago"]');

    const tela = lerTela('Configuracoes.html');
    contem(tela, 'id="cfg-mostrar-campo"');
    contem(tela, 'data-valor-da-condicao');
    contem(tela, 'mostrarSe: lerACondicao()', 'a condição vai no salvar do campo');
  });
}

module.exports = { rodarTestesDoCampoCondicional, retComStatusProposta };
