/**
 * ============================================================================
 * PGO — testes-envio-unico.js · a mesma gravação não entra duas vezes (Etapa 59)
 * ============================================================================
 * Achado da análise de 29/10: a tela desiste em 40 segundos, o servidor
 * termina de gravar, o botão volta, e o segundo clique gravava o caso em dobro.
 * Cada formulário manda agora um código de envio, o mesmo até dar certo; o
 * servidor não grava duas vezes o mesmo código.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, lerPeca } = require('./ferramentas');

function preparar() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  t.mesa = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
  t.cadastrar = (nome, envio) => t.chamar('cadastrarCaso')(t.ret.id,
    { nomedocliente: nome, status: 'Pendente' }, envio);
  t.quantos = (nome) => t.chamar('lerRegistros_')('BASE_RET')
    .filter((l) => l['nome do cliente'] === nome).length;
  t.cache = () => t.ambiente.globais.CacheService.getScriptCache();
  return t;
}

function rodarTestesDoEnvioUnico() {
  console.log('\nEtapa 59: a mesma gravação não entra duas vezes');

  /* ----------------------------------------------------------------------- */
  secao('Cadastrar');

  teste('o mesmo código duas vezes: um caso só, e a segunda resposta é a da primeira', () => {
    const t = preparar();
    const primeira = t.cadastrar('Envio repetido', 'envio-teste-0001');
    const segunda = t.cadastrar('Envio repetido', 'envio-teste-0001');
    igual(t.quantos('Envio repetido'), 1);
    igual(segunda.id, primeira.id);
  });

  teste('códigos diferentes são casos diferentes', () => {
    const t = preparar();
    t.cadastrar('Dois envios', 'envio-teste-0002');
    t.cadastrar('Dois envios', 'envio-teste-0003');
    igual(t.quantos('Dois envios'), 2);
  });

  teste('sem código (quem chama de fora da tela), grava como sempre', () => {
    const t = preparar();
    t.cadastrar('Sem envio');
    t.cadastrar('Sem envio');
    igual(t.quantos('Sem envio'), 2);
  });

  teste('código fora do formato é ignorado, e não vira chave de cache', () => {
    const t = preparar();
    t.cadastrar('Formato ruim', 'curto');
    t.cadastrar('Formato ruim', 'curto');
    igual(t.quantos('Formato ruim'), 2);
    t.cadastrar('Formato ruim 2', '<script>alert(1)</script>');
    igual(t.cache().get('ENVIO.<script>alert(1)</script>'), null);
  });

  teste('deu erro: o código é esquecido, e a pessoa corrige e manda de novo', () => {
    const t = preparar();
    lanca(() => t.chamar('cadastrarCaso')(t.ret.id,
      { nomedocliente: 'Corrigido', status: 'Status que não existe' }, 'envio-teste-0004'));
    igual(t.cache().get('ENVIO.envio-teste-0004'), null, 'o erro não ficou guardado');
    t.cadastrar('Corrigido', 'envio-teste-0004');
    igual(t.quantos('Corrigido'), 1);
  });

  teste('ainda em andamento: não grava a segunda vez, e diz para aguardar', () => {
    const t = preparar();
    t.cache().put('ENVIO.envio-teste-0005', '@andamento', 600);
    lanca(() => t.cadastrar('Em andamento', 'envio-teste-0005'), 'ainda está em andamento');
    igual(t.quantos('Em andamento'), 0);
  });

  /* ----------------------------------------------------------------------- */
  secao('Trabalhar no caso, mudar status e importar');

  teste('editar com o mesmo código: a segunda não esbarra em "outra pessoa alterou"', () => {
    const t = preparar();
    const novo = t.cadastrar('Para editar');
    const aberto = t.chamar('casoParaEditar')(t.ret.id, novo.id);
    const valores = Object.assign({}, aberto.valores, { observacoes: 'primeira' });
    t.chamar('editarCaso')(t.ret.id, novo.id, valores, aberto.versao, undefined, 'envio-teste-0006');
    // A segunda volta a resposta guardada, sem passar de novo pela conferência
    // da versão — antes, ela dizia que "outra pessoa alterou o caso".
    const segunda = t.chamar('editarCaso')(t.ret.id, novo.id, valores, aberto.versao, undefined,
      'envio-teste-0006');
    igual(String(segunda.id), String(novo.id));
  });

  teste('mudar status com o mesmo código conta uma mudança só', () => {
    const t = preparar();
    const novo = t.cadastrar('Status uma vez');
    const mudancas = () => Number(t.chamar('lerRegistros_')('BASE_RET')
      .find((l) => String(l.__id) === String(novo.id))['Mudanças de status']) || 0;
    const antes = mudancas();
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, novo.id, 'Pago', {}, 'envio-teste-0008');
    t.chamar('alterarSituacaoDoCaso')(t.ret.id, novo.id, 'Pago', {}, 'envio-teste-0008');
    igual(mudancas(), antes + 1);
  });

  teste('importar o mesmo lote duas vezes com o mesmo código: entra uma vez', () => {
    const t = preparar();
    const texto = [['nome do cliente', 'status'], ['Lote único A', 'Pendente'], ['Lote único B', 'Pendente']]
      .map((l) => l.join('\t')).join('\n');
    const pedido = { envio: 'envio-teste-0009', fonte: { tipo: 'colado', texto }, colunaQueIdentifica: '',
      analistas: [], origem: 'Lote', dePara: ['nome do cliente', 'status'].map((c) => ({ daFonte: c, paraAColuna: c })) };
    t.chamar('importarCasos')(t.ret.id, pedido);
    t.chamar('importarCasos')(t.ret.id, pedido);
    igual(t.quantos('Lote único A') + t.quantos('Lote único B'), 2);
  });

  teste('a importação do chat também', () => {
    const t = preparar();
    const id = t.ambiente.criarPlanilhaExterna('Chat', [['Data', 'Atendente', 'Assunto'],
      ['20/10/2026', 'Ana Martins', 'Cobrança']]);
    const pedido = { envio: 'envio-teste-0010', fonte: { tipo: 'planilha', planilhaId: id, aba: 'Chat' },
      origem: 'Chat', dePara: [{ daFonte: 'Data', paraAColuna: 'Data' },
        { daFonte: 'Atendente', paraAColuna: 'Analista' }, { daFonte: 'Assunto', paraAColuna: 'Assunto' }] };
    t.chamar('importarAtendimentosDoChat')(pedido);
    t.chamar('importarAtendimentosDoChat')(pedido);
    igual(t.chamar('lerRegistros_')('ATENDIMENTOS_CHAT').length, 1);
  });

  /* ----------------------------------------------------------------------- */
  secao('As telas mandam o código, e o guardam até dar certo');

  teste('o código que a tela gera passa no formato que o servidor aceita', () => {
    const contexto = vm.createContext({ console, setTimeout, clearTimeout, google: undefined,
      document: { addEventListener: function () {} } });
    const fonte = fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', 'Aplicacao.html'), 'utf8')
      .replace(/^<script>/, '').replace(/<\/script>\s*$/, '');
    vm.runInContext(fonte, contexto, { filename: 'Aplicacao.html' });
    const um = vm.runInContext('Servidor.novoEnvio()', contexto);
    const outro = vm.runInContext('Servidor.novoEnvio()', contexto);
    verdadeiro(/^[A-Za-z0-9_-]{8,64}$/.test(um), um);
    verdadeiro(um !== outro, 'cada chamada é um código novo');
  });

  teste('Cadastrar: manda o código, zera ao gravar e ao limpar', () => {
    const tela = lerPeca('CadastrarCaso');
    contem(tela, "if (!envio) envio = Servidor.novoEnvio();");
    contem(tela, "Formulario.valores(corpo()), envio)");
    contem(tela, "salvando = false;\n        envio = '';");
    contem(tela, "envio = '';   // formulário limpo é caso novo");
  });

  teste('Trabalhar no caso: um código por caso aberto', () => {
    const comuns = lerPeca('Comuns');
    contem(comuns, "versaoAoAbrir = '';\n    envio = '';");
    contem(comuns, "versaoAoAbrir, colunasSuasNaTela(), envio)");
  });

  teste('Mudar status: um código por status escolhido', () => {
    const comuns = lerPeca('Comuns');
    contem(comuns, "if (!envio || statusDoEnvio !== elemento('situacao-nova').value) {");
    contem(comuns, "Formulario.valores(elemento('campos-da-situacao')), envio)");
  });

  teste('Importação: um código por lote conferido', () => {
    const tela = lerPeca('Importacao');
    contem(tela, "laudo = resposta;\n        envioDoLote = Servidor.novoEnvio();");
    igual(tela.split('envio: envioDoLote,').length - 1, 2, 'casos e chat');
  });
}

module.exports = { rodarTestesDoEnvioUnico };
