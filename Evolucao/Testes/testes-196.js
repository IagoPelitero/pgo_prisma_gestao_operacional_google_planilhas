/**
 * ============================================================================
 * PGO — testes-196.js · os ajustes do aviso no Chat (Etapa 96)
 * ============================================================================
 * Relatos do PO depois da 1.95: a meta digitada não ia para a mensagem; o
 * endereço não aparecia para saber qual conversa é; sair de Retido não apagava
 * o valor retido, e voltar a Retido não avisava de novo; a mensagem no layout
 * da calculadora, com os analistas da RET disponíveis; o botão de status que
 * crescia; o Buscar Caso sem os botões novos.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { secao, teste, igual, verdadeiro, contem, lanca } = require('./ferramentas');
const { retDoPO } = require('./testes-sub-abas-do-trabalho');

const WEBHOOK = 'https://chat.googleapis.com/v1/spaces/AAAAequipe/messages?key=chave&token=segredo';
const ler = (nome) => fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

function comEquipe() {
  const t = retDoPO();
  t.chamar('salvarWebhookDoChat')(t.ret.id, WEBHOOK, 'Retenção RET');
  const operacao = t.chamar('lerRegistros_')('CATALOGO').find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id;
  ['Kathe', 'Thata', 'Gee', 'Eli', 'Ju Migli'].forEach((nome) => {
    t.chamar('salvarUsuario')({ nome, email: nome.replace(' ', '').toLowerCase() + '@exemplo.com',
      nivelAcessoId: operacao, canalId: t.ret.id, ativo: true });
  });
  // Alguém da Mesa: não é da RET, não entra na lista.
  t.chamar('salvarUsuario')({ nome: 'Diego', email: 'diego@exemplo.com', nivelAcessoId: operacao,
    canalId: t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA').id, ativo: true });
  t.chamar('esquecerCacheDaConfiguracao_()');
  t.envios = () => t.ambiente.enviosDaRede;
  t.texto = () => t.envios()[t.envios().length - 1].corpo.text;
  t.novo = (analista) => t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Cliente Sigiloso', status: 'Pendente',
    analista: analista || 'Eli' }).id;
  t.status = (id, status, campos) => t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, status, campos || {});
  t.reter = (id, valor) => t.status(id, 'Retido', { valordopremioretido: valor || '1.000,00', statusproposta: 'Transmitido' });
  t.avisar = (id) => t.chamar('avisarRetencaoNoChat')(t.ret.id, id);
  t.linha = (id) => t.chamar('lerRegistros_')('BASE_RET').find((l) => String(l.__id) === String(id));
  t.metas = (aviso) => t.chamar('salvarAvisoDoChat')(t.ret.id, aviso);
  return t;
}

function rodarTestesDa196() {
  console.log('\nEtapa 96: os ajustes do aviso no Chat');

  /* ----------------------------------------------------------------------- */
  secao('As metas e a conversa, em Configurações');

  teste('"Salvar metas" grava a meta do mês, e ela vai para a mensagem', () => {
    const t = comEquipe();
    t.metas({ ligado: true, metaDoMes: 'R$ 1.400.000,00', metaDoDia: '6' });
    const chat = t.chamar('listarCanaisConfiguraveis')().find((c) => c.aba === 'BASE_RET').avisoNoChat;
    igual(chat.metaDoMes, 1400000);
    const id = t.novo(); t.reter(id, '616.397,66');
    t.avisar(id);
    contem(t.texto(), '*Meta:* R$ 1.400.000,00');
    contem(t.texto(), 'R$ 783.602,34');
  });

  teste('a meta muda quando o PO quiser, e a próxima mensagem já usa a nova', () => {
    const t = comEquipe();
    t.metas({ ligado: true, metaDoMes: '1.400.000,00', metaDoDia: '6' });
    const a = t.novo(); t.reter(a, '100,00'); t.avisar(a);
    t.metas({ ligado: true, metaDoMes: '1.500.000,00', metaDoDia: '6' });
    const b = t.novo(); t.reter(b, '100,00'); t.avisar(b);
    contem(t.texto(), '*Meta:* R$ 1.500.000,00');
  });

  teste('a conversa: o nome e o começo do endereço aparecem; a chave e o token, nunca', () => {
    const t = comEquipe();
    const chat = t.chamar('listarCanaisConfiguraveis')().find((c) => c.aba === 'BASE_RET').avisoNoChat;
    igual(chat.nomeDaConversa, 'Retenção RET');
    igual(chat.enderecoParcial, 'https://chat.googleapis.com/v1/spaces/AAAAequipe/messages?… (chave e token escondidos)');
    verdadeiro(JSON.stringify(chat).indexOf('segredo') < 0, 'sem o token');
  });

  teste('trocar só o nome mantém o endereço; apagar some com os dois', () => {
    const t = comEquipe();
    const r = t.chamar('salvarWebhookDoChat')(t.ret.id, null, 'Time RET');
    igual(r.nomeDaConversa, 'Time RET');
    igual(t.chamar('webhookDoCanal_')(t.ret.id), WEBHOOK);
    t.chamar('salvarWebhookDoChat')(t.ret.id, '', '');
    igual(t.chamar('webhookDoCanal_')(t.ret.id), '');
    igual(t.chamar('nomeDaConversaDoChat_')(t.ret.id), '');
    lanca(() => t.chamar('salvarWebhookDoChat')(t.ret.id, null, 'Só nome'), 'Cole o endereço');
  });

  /* ----------------------------------------------------------------------- */
  secao('Sair de Retido apaga a retenção; voltar avisa de novo');

  teste('Retido → Não retido: apaga o valor do prêmio retido e a Data reteve', () => {
    const t = comEquipe();
    const id = t.novo(); t.reter(id, '1.234,00');
    verdadeiro(String(t.linha(id)['Data reteve'] || '') !== '', 'carimbou');
    t.status(id, 'Não retido');
    igual(String(t.linha(id)['valor do prêmio retido']), '');
    igual(String(t.linha(id)['Data reteve']), '');
  });

  teste('pelo Trabalhar no caso também', () => {
    const t = comEquipe();
    const id = t.novo(); t.reter(id, '1.234,00');
    const aberto = t.chamar('casoParaEditar')(t.ret.id, id);
    t.chamar('editarCaso')(t.ret.id, id, Object.assign({}, aberto.valores, { status: 'Não retido' }), aberto.versao);
    igual(String(t.linha(id)['valor do prêmio retido']), '');
    igual(String(t.linha(id)['Data reteve']), '');
  });

  teste('voltar a Retido carimba de novo e AVISA de novo', () => {
    const t = comEquipe();
    const id = t.novo(); t.reter(id, '1.000,00');
    igual(t.avisar(id).enviado, true);
    t.status(id, 'Não retido');
    // O relógio anda: a nova retenção ganha outro carimbo.
    const r = t.reter(id, '2.000,00');
    verdadeiro(r.avisoNoChat !== null, 'a gravação pede o aviso');
    const linha = t.linha(id);
    const novaData = new Date(linha['Data reteve']); novaData.setSeconds(novaData.getSeconds() + 1);
    t.chamar('atualizarRegistro_')('BASE_RET', linha.__id, { 'Data reteve': novaData });
    igual(t.avisar(id).enviado, true, 'avisou de novo');
    igual(t.envios().length, 2);
    contem(t.texto(), 'reteve R$ 2.000,00');
  });

  teste('quem não era Retido não perde nada ao trocar de status', () => {
    const t = comEquipe();
    const id = t.novo();
    t.chamar('atualizarRegistro_')('BASE_RET', t.linha(id).__id, { 'valor do prêmio retido': 50 });
    t.status(id, 'Não retido');
    igual(Number(t.linha(id)['valor do prêmio retido']), 50);
  });

  /* ----------------------------------------------------------------------- */
  secao('A mensagem no layout da calculadora');

  teste('a lista: só os analistas da RET disponíveis, em ordem, cada um com X/6', () => {
    const t = comEquipe();
    t.metas({ ligado: true, metaDoMes: '', metaDoDia: '6' });
    const gee = t.chamar('lerRegistros_')('USUARIOS').find((u) => u.Nome === 'Thata');
    t.chamar('atualizarRegistro_')('USUARIOS', gee.Id, { Disponibilidade: 'Férias' });
    t.chamar('esquecerCacheDaConfiguracao_()');
    ['Gee', 'Gee', 'Eli'].forEach((nome) => { const id = t.novo(nome); t.reter(id); });
    const ultimo = t.novo('Gee'); t.reter(ultimo);
    t.avisar(ultimo);
    const texto = t.texto();
    const lista = texto.split('\n').filter((l) => / — \d/.test(l));
    igual(lista.join(' | '), 'Eli — 1/6 | Gee — 3/6 | Ju Migli — 0/6 | Kathe — 0/6');
    verdadeiro(texto.indexOf('Diego') < 0, 'quem é da Mesa não entra');
    verdadeiro(texto.indexOf('Thata') < 0, 'quem está de férias não entra');
    contem(texto, '*Nova retenção — RET* · *Gee* reteve');
  });

  teste('quem bate a meta do dia ganha o 🎯', () => {
    const t = comEquipe();
    t.metas({ ligado: true, metaDoMes: '', metaDoDia: '2' });
    const a = t.novo('Kathe'); t.reter(a);
    const b = t.novo('Kathe'); t.reter(b);
    t.avisar(b);
    contem(t.texto(), 'Kathe — 2/2 🎯');
  });

  /* ----------------------------------------------------------------------- */
  secao('A tela');

  teste('o botão de status gira com a classe "girando", e não com a da tela de abertura', () => {
    const comuns = ler('Comuns.html');
    contem(comuns, "botao.classList.toggle('girando', carregando);");
    verdadeiro(comuns.indexOf("classList.toggle('carregando'") < 0, 'a classe que esticava o botão saiu');
    contem(ler('Estilos.html'), '.acao-secundaria.girando::before');
  });

  teste('o Buscar Caso tem os mesmos botões do Trabalho, e o status gira lá também', () => {
    const busca = ler('BuscarCaso.html');
    contem(busca, '<span>Status</span>');
    contem(busca, '<span>Excluir</span>');
    contem(busca, "'<div class=\"acoes-do-caso\">'");
    contem(busca, 'CasoEmModal.trocarSituacao(canal, caso, procurarDeNovo, botao);');
    verdadeiro(busca.indexOf('acao-icone') < 0, 'sem os botões só de desenho');
  });

  teste('Configurações: "Salvar metas" no bloco do Chat, e a conversa com nome', () => {
    const tela = ler('Configuracoes.html');
    contem(tela, "Servidor.chamar('salvarAvisoDoChat', canal.id, avisoNoChatDaTela(canal))");
    contem(tela, 'id="cfg-chatNome"');
  });
}

module.exports = { rodarTestesDa196 };
