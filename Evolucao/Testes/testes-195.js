/**
 * ============================================================================
 * PGO — testes-195.js · o aviso de retenção no Google Chat (Etapa 95)
 * ============================================================================
 * Pedido do PO: quando o caso passa a Retido e é salvo, postar no Chat o
 * acumulado do mês da equipe, quanto falta da meta do mês (editável em
 * Configurações) e quantas retenções o analista tem hoje (meta de 6, zera todo
 * dia). Nada vai para a internet de verdade: o simulador guarda os envios.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { secao, teste, igual, verdadeiro, contem, lanca } = require('./ferramentas');
const { retDoPO } = require('./testes-sub-abas-do-trabalho');

const WEBHOOK = 'https://chat.googleapis.com/v1/spaces/AAAAteste/messages?key=chave&token=segredo';
// O mês de hoje, como o cartão escreve ("novembro").
const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro',
  'outubro', 'novembro', 'dezembro'][new Date().getMonth()];
const ler = (nome) => fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

function comChat(semWebhook) {
  const t = retDoPO();
  if (!semWebhook) t.chamar('salvarWebhookDoChat')(t.ret.id, WEBHOOK);
  t.envios = () => t.ambiente.enviosDaRede;
  t.novo = (status) => t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Cliente Sigiloso', status: status || 'Pendente' });
  t.reter = (id, valor) => t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, 'Retido',
    { valordopremioretido: valor || '1.000,00', statusproposta: 'Transmitido' });
  t.avisar = (id) => t.chamar('avisarRetencaoNoChat')(t.ret.id, id);
  t.metas = (mes, dia, ligado) => t.chamar('salvarCanal')({ id: t.ret.id, nome: t.ret.nome,
    colunaDaData: t.ret.colunaDaData, colunaDoStatus: t.ret.colunaDoStatus, colunasDaFila: t.ret.colunasDaFila,
    colunasDaBusca: t.ret.colunasDaBusca, avisoNoChat: { ligado: ligado !== false, metaDoMes: mes, metaDoDia: dia } });
  return t;
}

function rodarTestesDa195() {
  console.log('\nEtapa 95: o aviso de retenção no Google Chat');

  /* ----------------------------------------------------------------------- */
  secao('A configuração');

  teste('a RET nasce com o aviso ligado e a meta do dia 6; a Mesa e o VG, sem', () => {
    const t = comChat(true);
    const canais = t.chamar('lerRegistros_')('CANAIS');
    const ret = canais.find((c) => c.Aba === 'BASE_RET');
    igual(String(ret.AvisoDeRetencaoNoChat), 'SIM');
    igual(Number(ret.MetaDeRetencoesPorDia), 6);
    canais.filter((c) => c.Aba !== 'BASE_RET').forEach((c) => verdadeiro(String(c.AvisoDeRetencaoNoChat || '') !== 'SIM', c.Aba));
  });

  teste('a planilha em uso: o atualizarPGO preenche só o que está vazio', () => {
    const t = comChat(true);
    const ret = t.chamar('lerRegistros_')('CANAIS').find((c) => c.Aba === 'BASE_RET');
    t.chamar('atualizarRegistro_')('CANAIS', ret.Id, { AvisoDeRetencaoNoChat: '', MetaDeRetencoesPorDia: '' });
    t.chamar('esquecerCacheDaConfiguracao_()');
    contem(t.chamar('prepararOAvisoNoChatDaRet_')([]).join(' '), 'meta do dia de 6');
    t.chamar('atualizarRegistro_')('CANAIS', ret.Id, { MetaDeRetencoesPorDia: 8 });
    t.chamar('esquecerCacheDaConfiguracao_()');
    igual(t.chamar('prepararOAvisoNoChatDaRet_')([]).length, 0, 'o que o PO mudou fica');
  });

  teste('o endereço: só o do Google Chat é aceito, e ele nunca volta para a tela', () => {
    const t = comChat(true);
    lanca(() => t.chamar('salvarWebhookDoChat')(t.ret.id, 'https://exemplo.com/roubar?dados=1'), 'não é um endereço de webhook do Google Chat');
    t.chamar('salvarWebhookDoChat')(t.ret.id, WEBHOOK);
    const tela = JSON.stringify(t.chamar('listarCanaisConfiguraveis')());
    // Etapa 96: o começo do endereço (o código do espaço) vai, para saber qual é
    // a conversa; a chave e o token, que dão o poder de postar, nunca.
    verdadeiro(tela.indexOf('segredo') < 0 && tela.indexOf('key=chave') < 0, 'a chave e o token não vão para a tela');
    contem(tela, 'spaces/AAAAteste/messages?… (chave e token escondidos)');
    const ret = t.chamar('listarCanaisConfiguraveis')().find((c) => c.aba === 'BASE_RET');
    igual(ret.avisoNoChat.temWebhook, true);
    igual(t.chamar('listarCanaisConfiguraveis')().find((c) => c.aba === 'BASE_MESA').avisoNoChat, null, 'a Mesa não tem Retido');
    t.chamar('salvarWebhookDoChat')(t.ret.id, '');
    igual(t.chamar('listarCanaisConfiguraveis')().find((c) => c.aba === 'BASE_RET').avisoNoChat.temWebhook, false);
  });

  teste('as metas se gravam no Salvar do canal; número inválido é recusado', () => {
    const t = comChat();
    t.metas('60.000,00', '6');
    const chat = t.chamar('listarCanaisConfiguraveis')().find((c) => c.aba === 'BASE_RET').avisoNoChat;
    igual(chat.metaDoMes, 60000);
    igual(chat.metaDoDia, 6);
    lanca(() => t.metas('abc', '6'), 'meta do mês');
    lanca(() => t.metas('100', '2,5'), 'meta do dia');
  });

  /* ----------------------------------------------------------------------- */
  secao('Quando avisa');

  teste('passar a Retido pelo Alterar status pede o aviso; salvar nada mais não pede', () => {
    const t = comChat();
    const id = t.novo().id;
    const r = t.reter(id);
    igual(JSON.stringify(r.avisoNoChat), JSON.stringify({ canal: t.ret.id, id: String(id) }));
    igual(t.envios().length, 0, 'gravar não vai à internet');
    const de2 = t.chamar('alterarSituacaoDoCaso')(t.ret.id, id, 'Retido', { valordopremioretido: '1.000,00', statusproposta: 'Transmitido' });
    igual(de2.avisoNoChat, null, 'já era Retido');
  });

  teste('pelo Trabalhar no caso e pelo Cadastrar também', () => {
    const t = comChat();
    const id = t.novo().id;
    const aberto = t.chamar('casoParaEditar')(t.ret.id, id);
    const r = t.chamar('editarCaso')(t.ret.id, id, Object.assign({}, aberto.valores,
      { status: 'Retido', valordopremioretido: '500,00', statusproposta: 'Transmitido' }), aberto.versao);
    verdadeiro(r.avisoNoChat && r.avisoNoChat.id === String(id), 'editar');
    const c = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'Nasceu retido', status: 'Retido',
      valordopremioretido: '700,00', statusproposta: 'Transmitido' });
    verdadeiro(c.avisoNoChat && c.avisoNoChat.id === String(c.id), 'cadastrar');
  });

  teste('sem endereço, ou com o aviso desligado, não pede', () => {
    const sem = comChat(true);
    igual(sem.reter(sem.novo().id).avisoNoChat, null, 'sem endereço');
    const desligado = comChat();
    desligado.metas('', '6', false);
    igual(desligado.reter(desligado.novo().id).avisoNoChat, null, 'desligado');
  });

  /* ----------------------------------------------------------------------- */
  secao('O cartão');

  teste('posta uma vez: quem reteve, o valor, o dia do analista, o acumulado e quanto falta', () => {
    const t = comChat();
    t.metas('10.000,00', '6');
    const a = t.novo().id; t.reter(a, '1.000,00');
    const b = t.novo().id; t.reter(b, '2.500,50');
    igual(t.avisar(b).enviado, true);
    igual(t.envios().length, 1);
    const e = t.envios()[0];
    igual(e.url, WEBHOOK);
    igual(e.opcoes.method, 'post');
    const texto = e.corpo.text;
    // Etapa 96: o layout da calculadora do PO.
    contem(texto, '* reteve R$ 2.500,50');
    contem(texto, '*' + MES.charAt(0).toUpperCase() + MES.slice(1) + ':* R$ 3.500,50');
    contem(texto, '*Meta:* R$ 10.000,00');
    contem(texto, '*Quanto falta (meta de ' + MES + '):* R$ 6.499,50');
  });

  teste('nada do cliente no Chat', () => {
    const t = comChat();
    const id = t.novo().id; t.reter(id);
    t.avisar(id);
    verdadeiro(t.envios()[0].corpo.text.indexOf('Sigiloso') < 0, 'sem o nome do cliente');
  });

  teste('a mesma retenção não é avisada duas vezes', () => {
    const t = comChat();
    const id = t.novo().id; t.reter(id);
    t.avisar(id);
    igual(t.avisar(id).motivo, 'já avisado');
    igual(t.envios().length, 1);
  });

  teste('chamar à toa não posta: caso que não está Retido', () => {
    const t = comChat();
    const id = t.novo().id;
    igual(t.avisar(id).enviado, false);
    igual(t.envios().length, 0);
  });

  teste('o caso que volta a Retido (Data reteve antiga) não é avisado de novo', () => {
    const t = comChat();
    const id = t.novo().id; t.reter(id);
    const linha = t.chamar('lerRegistros_')('BASE_RET').find((l) => String(l.__id) === String(id));
    const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
    t.chamar('atualizarRegistro_')('BASE_RET', linha.__id, { 'Data reteve': ontem });
    igual(t.avisar(id).motivo, 'não reteve hoje');
    igual(t.envios().length, 0);
  });

  teste('meta batida e sem meta', () => {
    const t = comChat();
    t.metas('500', '1');
    const id = t.novo().id; t.reter(id, '800,00');
    t.avisar(id);
    const texto = t.envios()[0].corpo.text;
    contem(texto, '*Meta de ' + MES + ' batida!* (+R$ 300,00)');
    const s = comChat();
    s.metas('', '');
    const id2 = s.novo().id; s.reter(id2);
    s.avisar(id2);
    verdadeiro(s.envios()[0].corpo.text.indexOf('*Meta:*') < 0, 'sem meta do mês, sem a linha');
  });

  /* ----------------------------------------------------------------------- */
  secao('Quando o Chat falha');

  teste('o Chat recusa: falhou, vai para a ERROS, e o próximo salvamento tenta de novo', () => {
    const t = comChat();
    const id = t.novo().id; t.reter(id);
    t.ambiente.respostaDaRede = 403;
    const r = t.avisar(id);
    igual(r.falhou, true);
    t.chamar('descarregarAFilaDosErros_')(0);
    contem(JSON.stringify(t.chamar('lerRegistros_')('ERROS')), 'respondeu 403');
    t.ambiente.respostaDaRede = 200;
    igual(t.avisar(id).enviado, true, 'não ficou marcado como avisado');
  });

  teste('sem rede: falhou, sem estourar; a gravação do caso nunca depende do Chat', () => {
    const t = comChat();
    t.ambiente.redeFora = true;
    const id = t.novo().id;
    const r = t.reter(id);
    verdadeiro(r.avisoNoChat !== null, 'o caso gravou e pediu o aviso');
    const aviso = t.avisar(id);
    igual(aviso.falhou, true);
    t.ambiente.redeFora = false;
  });

  teste('o teste de Configurações posta no espaço; sem endereço, diz o que falta', () => {
    const t = comChat();
    igual(t.chamar('testarAvisoNoChat')(t.ret.id).ok, true);
    contem(t.envios()[0].corpo.text, 'Teste do Prisma');
    const s = comChat(true);
    lanca(() => s.chamar('testarAvisoNoChat')(s.ret.id), 'Guarde o endereço');
  });

  /* ----------------------------------------------------------------------- */
  secao('A tela');

  teste('as três gravações chamam o aviso depois de salvar', () => {
    const comuns = ler('Comuns.html');
    igual((comuns.match(/AvisoDeRetencao\.depoisDeSalvar\(resposta\)/g) || []).length, 2, 'modal e Alterar status');
    contem(ler('CadastrarCaso.html'), 'AvisoDeRetencao.depoisDeSalvar(resposta);');
    contem(comuns, "Servidor.chamar('avisarRetencaoNoChat', aviso.canal, aviso.id)");
  });

  teste('Configurações: o endereço é campo de senha e nunca é preenchido pela tela', () => {
    const tela = ler('Configuracoes.html');
    contem(tela, '<input type="password" id="cfg-chatWebhook" autocomplete="off" ');
    contem(tela, "Servidor.chamar('salvarWebhookDoChat', canal.id, endereco, valorDe('chatNome'))");
    contem(tela, "Servidor.chamar('testarAvisoNoChat', canal.id)");
  });
}

module.exports = { rodarTestesDa195 };
