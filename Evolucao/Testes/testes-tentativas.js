/**
 * ============================================================================
 * PGO — testes-tentativas.js · tentativas até o sucesso, na Etapa 47
 * ============================================================================
 * Pedido do PO: "na produtividade RECC seja contabilizada a quantidade de
 * contatos por CPF. Precisamos medir quantas vezes precisamos contatar o
 * cliente para ter sucesso". A regra da operação, palavra dele: a 1ª e a 2ª
 * tentativa ficam carimbadas em "Data do 1º contato" e "Data do 2º contato";
 * na 3ª, o status vira "Sem sucesso de contato"; enquanto tenta, o status é
 * Contatando. Sucesso é Retido ou Não retido.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem } = require('./ferramentas');

const lerTela = (nome) => fs.readFileSync(
  path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

function retComTentativas() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  t.mesa = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
  const hoje = new Date();
  t.caso = (analista, status, tentativas, cpf, nome) => {
    const caso = { 'data de recepção do protocolo': hoje, analista, status, CPF: cpf || '',
      'nome do cliente': nome || analista + ' ' + status };
    if (tentativas >= 1) caso['Data do 1º contato'] = hoje;
    if (tentativas >= 2) caso['Data do 2º contato'] = hoje;
    t.chamar('inserirRegistro_')('BASE_RET', caso);
  };
  t.caso('Ana Martins', 'Retido', 0, '11111111111', 'Cliente A');
  t.caso('Ana Martins', 'Não retido', 1, '22222222222', 'Cliente B');
  t.caso('Diego Castilho', 'Retido', 2, '33333333333', 'Cliente C');
  t.caso('Diego Castilho', 'Sem sucesso de contato', 2, '44444444444', 'Cliente D');
  t.caso('Diego Castilho', 'Pendente', 1, '11111111111', 'Cliente A');
  t.painel = (filtros) => t.chamar('produtividadeDaEquipe')(t.ret.id, filtros || {}, 30);
  return t;
}

function rodarTestesDasTentativas() {
  console.log('\nEtapa 47: tentativas até o sucesso');

  /* ----------------------------------------------------------------------- */
  secao('Em qual contato o cliente atendeu');

  teste('sem tentativa carimbada é sucesso no 1º contato; com a 1ª, no 2º; com as duas, no 3º', () => {
    const t = retComTentativas();
    const tentativas = t.painel().tentativas;
    igual(tentativas.sucessos, 3);
    igual(tentativas.grafico.pontos.map((p) => p.rotulo + '=' + p.valor).join('|'),
      'No 1º contato=1|No 2º contato=1|No 3º contato=1|Sem sucesso=1');
  });

  teste('a média de contatos por sucesso: (1 + 2 + 3) / 3 = 2', () => {
    igual(retComTentativas().painel().tentativas.media, 2);
  });

  teste('"Sem sucesso de contato" não é sucesso; Pendente ainda está tentando', () => {
    const tentativas = retComTentativas().painel().tentativas;
    igual(tentativas.semSucesso, 1);
    igual(tentativas.emAndamento, 1);
  });

  teste('as três faixas aparecem mesmo vazias, e sem sucesso nenhum a média é vazia', () => {
    const t = carregar('primeiro.adm@exemplo.com');
    t.chamar('instalarRECC()');
    const ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    t.chamar('inserirRegistro_')('BASE_RET', { 'data de recepção do protocolo': new Date(),
      status: 'Pendente', 'nome do cliente': 'X' });
    const tentativas = t.chamar('produtividadeDaEquipe')(ret.id, {}, 30).tentativas;
    igual(tentativas.faixas.join('|'), 'No 1º contato|No 2º contato|No 3º contato');
    igual(tentativas.media, null);
  });

  teste('os filtros da tela valem para a conta', () => {
    const t = retComTentativas();
    const analista = t.painel().filtrosDisponiveis.find((f) => f.cabecalho.toLowerCase() === 'analista');
    const filtros = {};
    filtros[analista.chave] = 'Ana Martins';
    const tentativas = t.painel(filtros).tentativas;
    igual(tentativas.sucessos, 2);
    igual(tentativas.media, 1.5);
  });

  teste('só a RET tem a conta: a Mesa recebe null', () => {
    const t = retComTentativas();
    igual(t.chamar('produtividadeDaEquipe')(t.mesa.id, {}, 30).tentativas, null);
  });

  /* ----------------------------------------------------------------------- */
  secao('Por analista');

  teste('cada analista com os sucessos, as faixas, o sem sucesso e a média', () => {
    const quadro = retComTentativas().painel().tentativas.porAnalista;
    const ana = quadro.find((l) => l.analista === 'Ana Martins');
    igual(ana.sucessos + '|' + ana.porContato.join(',') + '|' + ana.semSucesso + '|' + ana.media,
      '2|1,1,0|0|1.5');
    const diego = quadro.find((l) => l.analista === 'Diego Castilho');
    igual(diego.sucessos + '|' + diego.porContato.join(',') + '|' + diego.semSucesso + '|' + diego.media,
      '1|0,0,1|1|3');
  });

  /* ----------------------------------------------------------------------- */
  secao('Contatos por CPF');

  teste('o mesmo CPF em dois casos soma os contatos, e o desfecho diz o contato do sucesso', () => {
    const porCpf = retComTentativas().painel().tentativas.porCpf;
    const a = porCpf.linhas.find((l) => l.cpf === '11111111111');
    igual(a.casos, 2);
    igual(a.contatos, 2, '1 do Retido + 1 tentativa do Pendente');
    igual(a.cliente, 'Cliente A');
    igual(a.desfecho, 'Retido no 1º contato, Pendente');
  });

  teste('o "Sem sucesso" conta a 3ª tentativa: duas carimbadas + o status', () => {
    const d = retComTentativas().painel().tentativas.porCpf.linhas.find((l) => l.cpf === '44444444444');
    igual(d.contatos, 3);
    igual(d.desfecho, 'Sem sucesso de contato');
  });

  teste('os CPFs vêm dos que tiveram mais contatos; caso sem CPF fica fora, e é contado', () => {
    const t = retComTentativas();
    t.caso('Ana Martins', 'Retido', 0, '', 'Sem CPF');
    const porCpf = t.painel().tentativas.porCpf;
    igual(porCpf.linhas[0].contatos, 3);
    igual(porCpf.total, 4);
    igual(porCpf.semCpf, 1);
  });

  teste('CPF com pontuação é o mesmo CPF', () => {
    const t = retComTentativas();
    t.caso('Ana Martins', 'Retido', 0, '111.111.111-11', 'Cliente A');
    igual(t.painel().tentativas.porCpf.linhas.find((l) => l.cpf === '11111111111').casos, 3);
  });

  /* ----------------------------------------------------------------------- */
  secao('A data de contato que vem da importação (achado 104)');

  teste('"03/10/2026" numa coluna de data e hora é 3 de outubro, e não 10 de março', () => {
    const t = carregar('primeiro.adm@exemplo.com');
    const converter = t.chamar('converterParaDataEHora_');
    const d = converter('03/10/2026');
    igual(d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(), '3/10/2026');
    const comHora = converter('25/10/2026 14:30');
    igual(comHora.getDate() + '/' + (comHora.getMonth() + 1) + ' ' + comHora.getHours() + ':'
      + comHora.getMinutes(), '25/10 14:30', 'dia acima de 12, com a hora');
    igual(converter('31/02/2026'), '', 'dia que não existe fica vazio');
    igual(converter('25/10/2026 25:00'), '', 'hora que não existe fica vazia');
    igual(Object.prototype.toString.call(converter('2026-10-03T10:00:00')), '[object Date]',
      'o formato ISO continua valendo');
  });

  teste('importar a "Data do 1º contato" da base antiga grava o dia certo — e a conta o vê', () => {
    const t = retComTentativas();
    const texto = [['nome do cliente', 'CPF', 'status', 'Data do 1º contato', 'data de recepção do protocolo'],
      ['Importado', '55555555555', 'Retido', '25/10/2026 09:15', '20/10/2026']]
      .map((l) => l.join('\t')).join('\n');
    t.chamar('importarCasos')(t.ret.id, { fonte: { tipo: 'colado', texto }, colunaQueIdentifica: '',
      analistas: [], origem: 'Base antiga', dePara: ['nome do cliente', 'CPF', 'status',
        'Data do 1º contato', 'data de recepção do protocolo'].map((c) => ({ daFonte: c, paraAColuna: c })) });
    const caso = t.chamar('lerRegistros_')('BASE_RET').find((c) => c['nome do cliente'] === 'Importado');
    const d = caso['Data do 1º contato'];
    igual(d.getDate() + '/' + (d.getMonth() + 1), '25/10');
    const linha = t.painel().tentativas.porCpf.linhas.find((l) => l.cpf === '55555555555');
    igual(linha.desfecho, 'Retido no 2º contato');
  });

  /* ----------------------------------------------------------------------- */
  secao('A tela');

  teste('o bloco vem antes do quadro por analista, com o resumo, o gráfico e as duas tabelas', () => {
    const tela = lerTela('Produtividade.html');
    contem(tela, "+ desenharTentativas()\n      + desenharPorAnalista()");
    contem(tela, 'Contatos por CPF');
    contem(tela, 'Contatos por sucesso');
    contem(lerTela('Estilos.html'), '.tentativas {');
  });
}

module.exports = { rodarTestesDasTentativas };
