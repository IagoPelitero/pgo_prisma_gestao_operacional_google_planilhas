/**
 * ============================================================================
 * PGO — testes-limpeza-do-que-nao-e-usado.js · o que ninguém usa sai (Etapa 62)
 * ============================================================================
 * Pedido do PO: "acrescente uma análise detalhada de funções e exclua funções,
 * textos, variáveis ou códigos que não são utilizados no PGO". A análise está
 * em Evolucao/05-progresso.md; aqui ficam as duas garantias:
 *
 *   1. o que saiu não volta calado, e quem o usava passou a usar o que ficou;
 *   2. o pacote, que agora vai SEM os comentários, faz exatamente o mesmo que
 *      os arquivos do repositório — que continuam comentados.
 * ============================================================================
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { criarAmbienteFalso } = require('./simulador');
const { carregar, secao, teste, igual, verdadeiro, contem } = require('./ferramentas');
const { gerar, semComentariosNoJs } = require('./gerar-pacote');

const RAIZ = path.join(__dirname, '..', '..');
const SERVIDOR = path.join(RAIZ, 'Back-End');

/** O servidor carregado a partir de uma lista de arquivos, como no Apps Script. */
function carregarDe(caminhos) {
  const ambiente = criarAmbienteFalso('primeiro.adm@exemplo.com');
  const contexto = vm.createContext(ambiente.globais);
  caminhos.forEach((caminho) => {
    vm.runInContext(fs.readFileSync(caminho, 'utf8'), contexto, { filename: path.basename(caminho) });
  });
  return { chamar: (expressao) => vm.runInContext(expressao, contexto) };
}

/** Um dia de trabalho resumido: o que a tela veria, sem hora nem carimbo. */
function umDiaDeTrabalho(t) {
  t.chamar('instalarRECC()');
  const ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  const caso = t.chamar('cadastrarCaso')(ret.id, { nomedocliente: 'Pacote igual', status: 'Pendente' });
  t.chamar('alterarSituacaoDoCaso')(ret.id, caso.id, 'Pago', {});
  const busca = t.chamar('buscarCasos')('Pacote igual', [], false);
  const resumo = t.chamar('resumoDoCanal')(ret.id, {}, null);
  const diagnostico = t.chamar('diagnosticoDoSistema')();
  return JSON.stringify({
    id: caso.id,
    achados: busca.total,
    status: JSON.stringify(busca.origens).indexOf('"Pago"') >= 0,
    cartoes: resumo.cartoes.map((c) => c.rotulo + '=' + c.valor),
    total: resumo.total,
    diagnostico: diagnostico.blocos.map((b) => b.chave + ':'
      + b.itens.map((i) => i.situacao).join(','))
  });
}

function rodarTestesDaLimpeza() {
  console.log('\nEtapa 62: o que ninguém usa sai — e o pacote vai sem comentários');

  /* ----------------------------------------------------------------------- */
  secao('O que saiu não volta calado');

  teste('as funções do servidor sem quem as chamasse não existem mais', () => {
    const t = carregar('primeiro.adm@exemplo.com');
    ['proximoIdentificador_', 'reexibirRegistro_', 'listarSusepsBloqueadas', 'avisosDaImportacao_']
      .forEach((nome) => igual(t.chamar('typeof ' + nome), 'undefined', nome));
  });

  teste('quem ficou faz o trabalho delas: o bloco de Ids e o resumo das bloqueadas', () => {
    const t = carregar('primeiro.adm@exemplo.com');
    t.chamar('instalarRECC()');
    igual(t.chamar('proximosIdentificadores_')('BASE_RET', 1).length, 1);
    verdadeiro(Array.isArray(t.chamar("resumoDasSusepsBloqueadas('')").bloqueadas));
  });

  teste('o laudo da importação não carrega mais a lista de avisos sempre vazia', () => {
    const t = carregar('primeiro.adm@exemplo.com');
    t.chamar('instalarRECC()');
    const ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    const laudo = t.chamar('conferirImportacaoDeCasos')(ret.id, {
      fonte: { tipo: 'colado', texto: 'CPF\tnome do cliente\n11122233305\tSem aviso' },
      analistas: []
    });
    igual(laudo.avisos, undefined);
  });

  /* ----------------------------------------------------------------------- */
  secao('O pacote vai sem comentários, e faz o mesmo');

  const destino = fs.mkdtempSync(path.join(os.tmpdir(), 'pgo-pacote-limpo-'));
  gerar(destino);
  const codigo = fs.readFileSync(path.join(destino, 'Codigo.gs'), 'utf8');
  const index = fs.readFileSync(path.join(destino, 'Index.html'), 'utf8');
  const soltos = fs.readdirSync(SERVIDOR).filter((n) => n.endsWith('.gs')).sort();

  teste('nenhuma linha de comentário no Codigo.gs, fora o aviso do alto e os marcadores', () => {
    const corpo = codigo.slice(codigo.indexOf('*/') + 2)
      .split('\n').filter((linha) => !/^\/\* ==== .* \*\/$/.test(linha));
    igual(corpo.filter((linha) => /^\s*(\/\/|\/\*|\* )/.test(linha)).length, 0);
  });

  teste('o Codigo.gs pesa bem menos que os arquivos somados', () => {
    const somados = soltos.reduce((soma, n) => soma + fs.statSync(path.join(SERVIDOR, n)).size, 0);
    verdadeiro(codigo.length < somados * 0.7, codigo.length + ' de ' + somados);
  });

  teste('tirar de novo não muda nada: o que sobrou é só código', () => {
    const corpo = codigo.slice(codigo.indexOf('*/') + 2).replace(/^\/\* ==== .* \*\/$/gm, '');
    igual(semComentariosNoJs(corpo), corpo.replace(/\n{3,}/g, '\n\n'));
  });

  teste('"//" dentro de texto não é comentário: o texto continua inteiro', () => {
    contem(codigo, "valor.indexOf('https://') === 0");
  });

  teste('um dia de trabalho dá o mesmo resultado nos arquivos soltos e no pacote', () => {
    const dosSoltos = umDiaDeTrabalho(carregarDe(soltos.map((n) => path.join(SERVIDOR, n))));
    const doPacote = umDiaDeTrabalho(carregarDe([path.join(destino, 'Codigo.gs')]));
    igual(doPacote, dosSoltos);
  });

  teste('todo <script> do Index compila, e os scriptlets ficam intactos', () => {
    const scripts = index.match(/<script\b[^>]*>[\s\S]*?<\/script>/g) || [];
    verdadeiro(scripts.length >= 10, scripts.length + ' scripts');
    scripts.forEach((script, i) => {
      const js = script.replace(/^<script\b[^>]*>|<\/script>$/g, '').replace(/<\?[\s\S]*?\?>/g, 'null');
      new vm.Script(js, { filename: 'script ' + i });
    });
    contem(index, '<?= identidade.nome ?>');
    contem(index, '<?!= pacoteDePartida ?>');
  });

  teste('o repositório continua comentado', () => {
    const base = fs.readFileSync(path.join(SERVIDOR, 'Base.gs'), 'utf8');
    verdadeiro((base.match(/\/\*\*/g) || []).length > 100);
  });
}

module.exports = { rodarTestesDaLimpeza };
