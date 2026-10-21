/**
 * ============================================================================
 * PGO — testes-colunas-fora-da-ret.js · três colunas saem do contrato (Etapa 49)
 * ============================================================================
 * Pedido do PO: "remova do contrato a coluna agente da central. Não estamos
 * usando, remova também a coluna relacionamento. A coluna grupo". Planilha
 * nova nasce sem elas; na planilha em uso a coluna fica, com o dado, e o
 * atualizarPGO tira o campo do formulário — uma vez.
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro, contem } = require('./ferramentas');

const SAIRAM = ['grupo', 'agente da central', 'relacionamento'];

/** Uma planilha "de antes": as três colunas na base, com campo ligado e dado dentro. */
function planilhaEmUso() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  // adicionarColuna_ cria a coluna E o campo, ligado — como era antes.
  SAIRAM.forEach((cabecalho) => t.chamar('adicionarColuna_')('BASE_RET', cabecalho, 'texto'));
  t.chamar('esquecerEstruturaLida_()');
  t.chamar('inserirRegistro_')('BASE_RET', { 'nome do cliente': 'Caso antigo', grupo: 'Vida',
    'agente da central': 'Joana', relacionamento: 'Ouro' });
  t.campo = (cabecalho) => t.chamar('lerRegistros_')('CAMPOS')
    .find((c) => c.Aba === 'BASE_RET' && c.Cabecalho === cabecalho);
  SAIRAM.forEach((cabecalho) => verdadeiro(String(t.campo(cabecalho).Ativo).toUpperCase() === 'SIM',
    'o campo ' + cabecalho + ' começa ligado'));
  return t;
}

function rodarTestesDasColunasForaDaRet() {
  console.log('\nEtapa 49: grupo, agente da central e relacionamento saem do contrato da RET');

  /* ----------------------------------------------------------------------- */
  secao('Planilha nova');

  teste('a RET nasce sem as três colunas, e o formulário sem os três campos', () => {
    const t = carregar('primeiro.adm@exemplo.com');
    t.chamar('instalarRECC()');
    const cabecalhos = t.chamar('estruturaDaAba_')('BASE_RET').cabecalhos.map((c) => c.toLowerCase());
    SAIRAM.forEach((nome) => verdadeiro(cabecalhos.indexOf(nome) < 0, nome + ' não nasce'));
    const campos = t.chamar('lerRegistros_')('CAMPOS').filter((c) => c.Aba === 'BASE_RET')
      .map((c) => c.Cabecalho.toLowerCase());
    SAIRAM.forEach((nome) => verdadeiro(campos.indexOf(nome) < 0, 'nem o campo ' + nome));
  });

  /* ----------------------------------------------------------------------- */
  secao('Planilha em uso: o atualizarPGO');

  teste('desliga os três campos e diz que a coluna continua na planilha', () => {
    const t = planilhaEmUso();
    const laudo = t.chamar('atualizarPGO()');
    SAIRAM.forEach((nome) => igual(String(t.campo(nome).Ativo).toUpperCase(), 'NAO', nome));
    contem(laudo, 'o campo "agente da central" saiu do formulário');
    contem(laudo, 'BASE_RET."relacionamento" saiu do contrato e continua na planilha');
  });

  teste('não apaga a coluna nem o dado', () => {
    const t = planilhaEmUso();
    t.chamar('atualizarPGO()');
    const caso = t.chamar('lerRegistros_')('BASE_RET').find((c) => c['nome do cliente'] === 'Caso antigo');
    igual(caso.grupo + '|' + caso['agente da central'] + '|' + caso.relacionamento, 'Vida|Joana|Ouro');
  });

  teste('roda uma vez: quem religa o campo depois não o vê desligado de novo', () => {
    const t = planilhaEmUso();
    t.chamar('atualizarPGO()');
    t.chamar('atualizarRegistro_')('CAMPOS', t.campo('grupo').__id, { Ativo: 'SIM' });
    contem(t.chamar('atualizarPGO()'), 'já saíram do formulário da RET');
    igual(String(t.campo('grupo').Ativo).toUpperCase(), 'SIM');
  });

  /** Apaga a coluna da base, como a pessoa faz na planilha (o simulador não tem "apagar coluna" em A1). */
  const apagarAColuna = (t, cabecalho) => {
    const folha = t.ambiente.planilha.getSheetByName('BASE_RET');
    const cabecalhos = folha.getRange(1, 1, 1, folha.getLastColumn()).getValues()[0];
    folha.deleteColumns(cabecalhos.indexOf(cabecalho) + 1, 1);
    t.chamar('esquecerEstruturaLida_()');
  };

  teste('apagar a coluna depois de o campo sair do formulário NÃO dá FALHA no diagnóstico (achado 106)', () => {
    const t = planilhaEmUso();
    t.chamar('atualizarPGO()');
    SAIRAM.forEach((nome) => apagarAColuna(t, nome));
    const laudo = JSON.stringify(t.chamar('diagnosticoDoSistema')());
    verdadeiro(laudo.indexOf('apontam para coluna que não existe') < 0, 'sem a FALHA do campo sem coluna');
    contem(laudo, '3 campo(s) desligado(s) sem a coluna na planilha');
    contem(laudo, 'Nada quebra: o campo está desligado');
  });

  teste('o campo LIGADO sem coluna continua dando FALHA — a guarda não foi afrouxada', () => {
    const t = planilhaEmUso();
    apagarAColuna(t, 'agente da central');   // sem rodar o atualizarPGO: o campo segue ligado
    contem(JSON.stringify(t.chamar('diagnosticoDoSistema')()), '1 campo(s) apontam para coluna que não existe');
  });

  teste('apagar também a linha do campo em CAMPOS deixa o laudo limpo, e o atualizarPGO não a recria', () => {
    const t = planilhaEmUso();
    t.chamar('atualizarPGO()');
    SAIRAM.forEach((nome) => apagarAColuna(t, nome));
    const aba = t.ambiente.planilha.getSheetByName('CAMPOS');
    const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
    const dados = aba.getRange(1, 1, aba.getLastRow(), aba.getLastColumn()).getValues();
    const linhas = [];
    dados.forEach((l, i) => { if (i > 0 && l[cab.indexOf('Aba')] === 'BASE_RET'
      && SAIRAM.indexOf(l[cab.indexOf('Cabecalho')]) >= 0) linhas.push(i + 1); });
    igual(linhas.length, 3);
    linhas.reverse().forEach((n) => aba.deleteRows(n, 1));
    t.chamar('esquecerEstruturaLida_()');
    t.chamar('atualizarPGO()');
    t.chamar('esquecerEstruturaLida_()');
    igual(t.chamar('lerRegistros_')('CAMPOS').filter((c) => c.Aba === 'BASE_RET'
      && SAIRAM.indexOf(c.Cabecalho) >= 0).length, 0, 'nenhum campo voltou');
    const laudo = JSON.stringify(t.chamar('diagnosticoDoSistema')());
    verdadeiro(laudo.indexOf('apontam para coluna que não existe') < 0);
    verdadeiro(laudo.indexOf('desligado(s) sem a coluna') < 0, 'e nem o aviso informativo');
  });

  teste('formulário, cadastro e Trabalho seguem funcionando sem as colunas', () => {
    const t = planilhaEmUso();
    t.chamar('atualizarPGO()');
    SAIRAM.forEach((nome) => apagarAColuna(t, nome));
    t.chamar('formularioDoCanal')(t.ret.id);
    t.chamar('cadastrarCaso')(t.ret.id, { 'nome do cliente': 'Sem as colunas', status: 'Não trabalhado',
      'data de recepção do protocolo': '20/10/2026' });
    verdadeiro(t.chamar('resumoDoCanal')(t.ret.id, {}, 30).total >= 1);
  });

  teste('o diagnóstico não dá alarme pelas colunas que ficaram', () => {
    const t = planilhaEmUso();
    t.chamar('atualizarPGO()');
    const laudo = JSON.stringify(t.chamar('diagnosticoDoSistema')());
    verdadeiro(!/agente da central[^"]*(erro|falta)/i.test(laudo), 'sem erro pela coluna que ficou');
  });
}

module.exports = { rodarTestesDasColunasForaDaRet };
