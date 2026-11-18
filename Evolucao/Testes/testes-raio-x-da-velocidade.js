/**
 * ============================================================================
 * PGO — testes-raio-x-da-velocidade.js · Ajustes Gerais e o raio-x (Etapa 85)
 * ============================================================================
 * Relato do PO: mudar o nome de um item em Configurações › Ajustes Gerais dava
 * o erro dos 40 segundos e não atualizava; e a aba ERROS tinha 123 lentidões
 * num dia. A planilha é pequena (umas 376 mil células), mas cada ida custava
 * uns 3 s. Decisões do PO: (1) renomear e excluir mexem só na lista, "ignorando
 * que há dados na planilha"; (2) um raio-x que mede quanto tempo cada aba leva
 * — na planilha de verdade, só lendo.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario } = require('./ferramentas');
const { medidor } = require('./simulador');

const lerTela = (nome) => fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

function instalado() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  return t;
}

function rodarTestesDoRaioXDaVelocidade() {
  console.log('\nEtapa 85: Ajustes Gerais sem ler a base, e o raio-x da velocidade');

  /* ----------------------------------------------------------------------- */
  secao('Ajustes Gerais: renomear e excluir mexem só na lista');

  teste('renomear um item de lista que nenhum campo usa não lê a base (eram 49 idas)', () => {
    const t = instalado();
    const lote = [];
    for (let i = 0; i < 300; i++) lote.push({ status: 'Pendente', 'nome do cliente': 'C' + i, analista: 'Ana' });
    t.chamar('inserirVariosRegistros_')('BASE_RET', lote);
    const area = t.chamar('lerRegistros_')('CATALOGO').find((i) => i.Tipo === 'AREA');
    medidor.zerar();
    t.chamar('salvarItemDoCatalogo')({ id: area.Id, tipo: 'AREA', canalId: area.CanalId,
      nome: area.Nome + ' nova', ordem: area.Ordem, ativo: true });
    const custo = medidor.retrato();
    verdadeiro(custo.idasParaLer < 25, custo.idasParaLer + ' idas');
    verdadeiro(custo.celulasLidas < 3000, custo.celulasLidas + ' células — a base não foi lida');
    igual(t.chamar('buscarRegistros_')('CATALOGO', 'Id', String(area.Id), 1)[0].Nome, area.Nome + ' nova');
  });

  teste('o status renomeado vale no formulário; o caso já gravado guarda o texto de antes', () => {
    const t = instalado();
    const ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    const caso = t.chamar('cadastrarCaso')(ret.id, { nomedocliente: 'Antigo', status: 'Não trabalhado' });
    const item = t.chamar('lerRegistros_')('CATALOGO').find((i) => i.Tipo === 'STATUS' && i.Nome === 'Não trabalhado');
    t.chamar('salvarItemDoCatalogo')({ id: item.Id, tipo: 'STATUS', canalId: item.CanalId,
      nome: 'Sem tratativa', rotulo: 'Sem tratativa', ordem: item.Ordem, ativo: true, cor: 'ruim' });
    igual(String(t.chamar('buscarRegistros_')('BASE_RET', 'Id', String(caso.id), 1)[0].status),
      'Não trabalhado', 'sem efeito cascata');
    contem(JSON.stringify(t.chamar('formularioDoCanal')(ret.id)), 'Sem tratativa', 'o formulário oferece o novo');
  });

  teste('o cartão de Painéis que contava o item vai junto com o nome novo', () => {
    const t = instalado();
    const item = t.chamar('lerRegistros_')('CATALOGO').find((i) => i.Tipo === 'STATUS' && i.Nome === 'Pendente');
    t.chamar('salvarItemDoCatalogo')({ id: item.Id, tipo: 'STATUS', canalId: item.CanalId,
      nome: 'Pendente de retorno', rotulo: 'Pendente de retorno', ordem: item.Ordem, ativo: true, cor: 'atencao' });
    verdadeiro(t.chamar('lerRegistros_')('PAINEIS').some((p) => p.Filtro === 'Pendente de retorno'),
      'o cartão acompanhou');
    verdadeiro(!t.chamar('lerRegistros_')('PAINEIS').some((p) => p.Filtro === 'Pendente'
      && String(p.CanalId) === String(item.CanalId)), 'e não ficou apontando para o antigo');
  });

  teste('excluir não conta os casos, e a tela não pergunta mais ao servidor antes do aviso', () => {
    const t = instalado();
    const item = t.chamar('lerRegistros_')('CATALOGO').find((i) => i.Tipo === 'AREA');
    medidor.zerar();
    const saiu = t.chamar('excluirItemDoCatalogo')(item.Id);
    verdadeiro(medidor.retrato().celulasLidas < 3000, 'a base não foi lida');
    igual(saiu.casos, undefined, 'não diz em quantos casos: não contou');
    const tela = lerTela('Configuracoes.html');
    const bloco = tela.slice(tela.indexOf('function excluirOItem'), tela.indexOf('function desenharPainelDoItem'));
    verdadeiro(bloco.indexOf('usoDoItemDoCatalogo') < 0, 'o aviso sai sem ida ao servidor');
    contem(bloco, 'continuam com o texto');
  });

  teste('o texto da tela diz que trocar o nome mexe só na lista', () => {
    const tela = lerTela('Configuracoes.html');
    contem(tela, 'nome ou excluir mexe só na lista');
    verdadeiro(tela.indexOf('é recusado.</p>') < 0, 'o aviso de recusa saiu');
  });

  /* ----------------------------------------------------------------------- */
  secao('O raio-x da velocidade');

  teste('mede cada aba: dados, grade, uma ida pequena, ler tudo, fórmulas e formatação', () => {
    const t = instalado();
    const raio = t.chamar('raioXDaVelocidade')();
    const nomes = t.chamar('planilhaAtiva_()').getSheets().map((a) => a.getName());
    igual(raio.abas.length, nomes.length, 'todas as abas');
    const base = raio.abas.find((a) => a.nome === 'BASE_RET');
    verdadeiro(base.colunas > 10 && base.gradeLinhas >= base.linhas, 'tamanho e grade');
    ['msIdaPequena', 'msAbaInteira', 'formulas', 'regrasDeFormatacao'].forEach((campo) =>
      verdadeiro(typeof base[campo] === 'number', campo));
    verdadeiro(raio.resumo.celulasUsadas > 0 && raio.resumo.celulasDaGrade >= raio.resumo.celulasUsadas);
    verdadeiro(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(raio.quando), raio.quando);
  });

  teste('as abas vêm da mais lenta para a mais rápida, e a ida cara vira aviso', () => {
    const t = instalado();
    // A aba lenta é a ÚLTIMA da planilha: só a ordem a põe em cima.
    const lenta = t.chamar('planilhaAtiva_()').getSheets().slice(-1)[0].getName();
    // Um relógio que anda 700 ms a cada leitura dela: a ida "cara".
    let agora = 0;
    t.contexto.agoraEmMs_ = () => agora;
    const original = t.contexto.raioXDaAba_;
    t.contexto.raioXDaAba_ = function (aba) {
      if (aba.getName() === lenta) {
        const getRange = aba.getRange.bind(aba);
        aba.getRange = function () {
          const faixa = getRange.apply(null, arguments);
          const ler = faixa.getValues.bind(faixa);
          faixa.getValues = () => { agora += 700; return ler(); };
          return faixa;
        };
      }
      return original(aba);
    };
    const raio = t.chamar('raioXDaVelocidade')();
    verdadeiro(raio.abas.map((a) => a.nome).indexOf(lenta) === 0, 'a mais lenta em cima: ' + lenta);
    contem(raio.abas[0].alertas.join(' '), 'cada ida a esta aba está cara');
    igual(raio.abas[0].msIdaPequena, 700);
  });

  teste('fórmulas que recalculam muito e formatação condicional demais viram aviso', () => {
    const t = instalado();
    t.chamar('inserirVariosRegistros_')('BASE_RET', [1, 2, 3, 4].map((i) => ({ status: 'Pendente', 'nome do cliente': 'F' + i })));
    const aba = t.chamar('planilhaAtiva_()').getSheetByName('BASE_RET');
    aba.formulas = { '2,3': '=HOJE()-B2', '3,3': '=IMPORTRANGE("x";"A1")', '4,3': '=A4+1' };
    aba.regrasDeFormatacao = new Array(12).fill({});
    const base = t.chamar('raioXDaVelocidade')().abas.find((a) => a.nome === 'BASE_RET');
    igual(base.formulas, 3);
    const alertas = base.alertas.join(' ');
    contem(alertas, 'HOJE (1)');
    contem(alertas, 'IMPORTRANGE (1)');
    contem(alertas, '12 regras de formatação condicional');
  });

  teste('linhas vazias demais na grade viram aviso', () => {
    const t = instalado();
    const grande = t.chamar('planilhaAtiva_()').insertSheet('MINHA_ABA', 9000, 4);
    grande.getRange(1, 1, 2, 2).setValues([['A', 'B'], ['1', '2']]);
    const aba = t.chamar('raioXDaVelocidade')().abas.find((a) => a.nome === 'MINHA_ABA');
    contem(aba.alertas.join(' '), 'linhas vazias na grade');
  });

  teste('as planilhas de fora: quanto leva para abrir, e a que não abre diz por quê', () => {
    const t = instalado();
    const id = t.ambiente.criarPlanilhaExterna('Legado', [['Protocolo'], ['1']]);
    t.chamar('gravarConfiguracao_')('LEGADO.PLANILHA_ID', id);
    t.chamar('gravarConfiguracao_')('BASE.HISTORICO_ID', 'id-que-nao-existe');
    t.chamar('esquecerCacheDaConfiguracao_()');
    const deFora = t.chamar('raioXDaVelocidade')().deFora;
    const legado = deFora.find((d) => d.rotulo === 'Planilha legada');
    verdadeiro(typeof legado.msParaAbrir === 'number' && !legado.erro, 'abriu');
    verdadeiro(!!deFora.find((d) => d.rotulo === 'Histórico da base').erro, 'a que não abre tem o erro');
  });

  teste('só lê: nenhuma aba de dados muda, e fica o rastro na auditoria', () => {
    const t = instalado();
    t.chamar('inserirVariosRegistros_')('BASE_RET', [{ status: 'Pendente', 'nome do cliente': 'X' }]);
    const antes = JSON.stringify(['BASE_RET', 'CATALOGO', 'CANAIS', 'CAMPOS'].map((a) => t.chamar('lerRegistros_')(a)));
    t.chamar('raioXDaVelocidade')();
    igual(JSON.stringify(['BASE_RET', 'CATALOGO', 'CANAIS', 'CAMPOS'].map((a) => t.chamar('lerRegistros_')(a))), antes);
    t.chamar('descarregarAFilaDaAuditoria_')(0);
    verdadeiro(t.chamar('lerRegistros_')('AUDITORIA').some((a) => String(a.Acao) === 'diagnostico.velocidade'));
  });

  teste('só quem configura roda', () => {
    const t = instalado();
    const operacao = t.chamar('lerRegistros_("CATALOGO")')
      .find((i) => String(i.Tipo) === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    t.chamar('salvarUsuario')({ nome: 'Ana Operação', email: 'ana@exemplo.com', nivelAcessoId: operacao.Id, ativo: true });
    comoUsuario(t.ambiente, 'ana@exemplo.com', () => {
      lanca(() => t.chamar('raioXDaVelocidade')(), 'não permite configurar');
    });
  });

  teste('a tela: o botão ao lado do diagnóstico, sem pressa, e a tabela da mais lenta', () => {
    const tela = lerTela('Configuracoes.html');
    contem(tela, 'id="medir-velocidade"');
    contem(tela, "Servidor.chamarSemPressa('raioXDaVelocidade')");
    contem(tela, 'Cada ida à planilha: ');
    contem(tela, 'Ler a aba inteira');
  });
}

module.exports = { rodarTestesDoRaioXDaVelocidade };
