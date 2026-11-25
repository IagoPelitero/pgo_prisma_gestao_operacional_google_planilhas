/**
 * ============================================================================
 * PGO — testes-193.js · a versão 1.93 (Etapa 93)
 * ============================================================================
 * Pedido do PO:
 *  1. o filtro "Tipo de emissão" na RET (os testes estão em
 *     testes-sub-abas-do-trabalho.js, junto dos outros filtros);
 *  2. o modal "Trabalhar no caso" no Estilo B (cabeçalho com o cliente e os
 *     cartões, abas, seções numeradas que recolhem, avisos no pé);
 *  3. na fila, "Status" e "Excluir" com texto, embaixo do "Trabalhar no caso"
 *     (proposta C);
 *  4. o "Alterar status" com carregamento, sem abrir dois e sem salvar antes
 *     de os campos do status chegarem.
 * O comportamento na tela é provado no navegador (ponta-a-ponta.js, "A versão
 * 1.93"); aqui ficam o servidor e o que o código da tela promete.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { secao, teste, igual, verdadeiro, contem } = require('./ferramentas');
const { retDoPO, comCasos } = require('./testes-sub-abas-do-trabalho');

const ler = (nome) => fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

function rodarTestesDa193() {
  console.log('\nEtapa 93: a versão 1.93');

  /* ----------------------------------------------------------------------- */
  secao('O cabeçalho do caso aberto (servidor)');

  const t = retDoPO();
  comCasos(t);
  const casos = t.chamar('lerRegistros_')('BASE_RET');
  const idDe = (nome) => casos.find((c) => c['nome do cliente'] === 'Caso ' + nome).__id;

  teste('o status vem com a cor do catálogo, como na fila', () => {
    const aberto = t.chamar('casoParaEditar')(t.ret.id, idDe('P1'));
    igual(aberto.resumo.status.nome, 'Pendente');
    const daFila = t.resumo(1).fila.find((c) => String(c.id) === String(idDe('P1')));
    igual(aberto.resumo.status.tom, daFila.tom, 'a mesma cor da etiqueta da fila');
  });

  teste('o prazo é o MESMO selo da fila, com o nome do sinalizador como rótulo do cartão', () => {
    let conferidos = 0;
    t.resumo(1).fila.forEach((daFila) => {
      const aberto = t.chamar('casoParaEditar')(t.ret.id, daFila.id);
      igual(aberto.resumo.prazos.length, (daFila.sinais || []).length + (daFila.sla ? 1 : 0));
      (daFila.sinais || []).forEach((sinal, i) => {
        const prazo = aberto.resumo.prazos[i + (daFila.sla ? 1 : 0)];
        igual(prazo.nome + ' · ' + prazo.texto, sinal.texto);
        igual(prazo.tom, sinal.tom);
        conferidos++;
      });
    });
    verdadeiro(conferidos > 0, 'algum caso da RET tem o prazo de retorno');
  });

  teste('o cabeçalho que falha não impede o caso de abrir', () => {
    const original = t.chamar('sinalizadoresDoCanal_');
    t.chamar('globalThis').sinalizadoresDoCanal_ = () => { throw new Error('quebrou'); };
    try {
      const aberto = t.chamar('casoParaEditar')(t.ret.id, idDe('P1'));
      igual(aberto.resumo, null);
      verdadeiro(Object.keys(aberto.valores).length > 0, 'os valores vieram');
    } finally {
      t.chamar('globalThis').sinalizadoresDoCanal_ = original;
    }
  });

  /* ----------------------------------------------------------------------- */
  secao('O que a tela promete (código)');

  const comuns = ler('Comuns.html');
  const trabalho = ler('Trabalho.html');

  teste('modal: cabeçalho com o nome, cartões, abas e o "Caso <id>" de sempre no #titulo-do-caso', () => {
    contem(comuns, '<span id="titulo-do-caso">Caso \' + escapar(idAtual) + \'</span>');
    contem(comuns, 'id="nome-do-caso"');
    contem(comuns, 'id="modal-resumo"');
    contem(comuns, 'role="tablist"');
    contem(comuns, "'aba-linha-do-tempo'");
    contem(comuns, "'aba-da-planilha'");
  });

  teste('modal: o nome e os cartões vêm do formulário que a pessoa vê (o campo oculto não vaza)', () => {
    const corpo = comuns.substring(comuns.indexOf('function campoPeloRotulo'), comuns.indexOf('function desenharAbas'));
    contem(corpo, 'formulario.secoes');
    verdadeiro(corpo.indexOf('doSistema') < 0, 'não lê as colunas da planilha para o cabeçalho');
  });

  teste('modal: as seções nascem abertas; o erro ao salvar abre a seção e volta à aba dos dados', () => {
    contem(comuns, 'aria-expanded="true">');
    const erro = comuns.substring(comuns.indexOf('function mostrarAsSecoesComErro'), comuns.indexOf('function atualizarOsAvisos'));
    contem(erro, "mostrarAba('aba-dados-do-caso')");
    contem(erro, 'Formulario.camposQueFaltam(corpo)');
    contem(comuns, "if (erro.problemas) Formulario.mostrarProblemas(corpo, erro.problemas);\n        mostrarAsSecoesComErro();");
  });

  teste('fila: "Status" e "Excluir" com texto, embaixo do "Trabalhar no caso"', () => {
    const acoes = trabalho.substring(trabalho.indexOf('function acoesDaLinha'), trabalho.indexOf('var focarABusca'));
    contem(acoes, '<span>Status</span>');
    contem(acoes, '<span>Excluir</span>');
    contem(acoes, 'acoes-secundarias');
    verdadeiro(acoes.indexOf('data-trabalhar') < acoes.indexOf('data-excluir'), 'o Excluir por último');
    verdadeiro(acoes.indexOf('acao-icone') < 0, 'os botões só de desenho saíram da fila');
  });

  teste('Alterar status: o botão vai junto e gira; o Salvar trava enquanto os campos não chegam', () => {
    contem(trabalho, "botao.getAttribute('data-status-do-caso'), depoisDeGravar, botao);");
    contem(comuns, 'function trocarSituacao(idDoCanal, idDoCaso, quandoMudar, botaoQueAbriu)');
    contem(comuns, "Carregando o que este status pede…</p>';\n          travarOSalvar(true);");
    contem(comuns, 'if (gravando || camposCarregando) return;');
    contem(comuns, "elemento('situacao-nova').disabled = true;");
  });
}

module.exports = { rodarTestesDa193 };
