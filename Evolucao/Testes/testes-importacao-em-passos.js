/**
 * ============================================================================
 * PGO — testes-importacao-em-passos.js · a Importação em passos (Etapa 81)
 * ============================================================================
 * Pedido do PO: "melhore o visual da aba importação (…) hoje os textos ficam
 * juntos e bagunçados". A proposta aprovada: quatro passos no alto, cada passo
 * num cartão, as opções do lote em quadros com uma linha de explicação, e uma
 * faixa no pé que diz o que vai acontecer, ao lado do botão de importar.
 * Nada muda no que a importação grava — só no desenho.
 *
 * As funções da tela rodam aqui sozinhas: o texto delas é tirado da
 * Importação e recebe o estado de que precisa.
 * ============================================================================
 */

const { secao, teste, igual, verdadeiro, contem, lerPeca } = require('./ferramentas');

/** O texto de uma função da tela, do `function nome(` até o fecho dela. */
function corpoDe(tela, nome) {
  const inicio = tela.indexOf('  function ' + nome + '(');
  verdadeiro(inicio >= 0, 'a tela tem ' + nome);
  return tela.substring(inicio, tela.indexOf('\n  }\n', inicio) + 4);
}

/**
 * Monta um pedaço da tela com o estado dado e devolve as funções pedidas.
 * `estado` vira as variáveis do módulo (laudo, resultado, opcoes…).
 */
function pedaco(nomes, estado) {
  const tela = lerPeca('Importacao');
  const base = {
    laudo: null, resultado: null, opcoes: { analistas: [], statusDoCanal: [] },
    analistasMarcados: {}, nomeDoLote: '', agendarDias: '', agendarPara: '',
    oQueImportar: 'casos', statusQueVale: () => '', diaDaqui: (d) => 'D+' + d,
  };
  const tudo = Object.assign(base, estado || {});
  const vars = Object.keys(tudo);
  const corpo = nomes.map((n) => corpoDe(tela, n)).join('\n')
    + "\nfunction ehChat() { return oQueImportar === 'chat'; }"
    + "\nfunction oQue(p) { return ehChat() ? (p ? 'atendimentos' : 'atendimento') : (p ? 'casos' : 'caso'); }"
    + "\nfunction escapar(t) { return String(t).replace(/</g, '&lt;'); }"
    + '\nreturn {' + nomes.join(',') + '};';
  // eslint-disable-next-line no-new-func
  return new Function(...vars, corpo)(...vars.map((v) => tudo[v]));
}

function rodarTestesDaImportacaoEmPassos() {
  console.log('\nEtapa 81: a Importação em passos');

  /* ----------------------------------------------------------------------- */
  secao('Os passos no alto dizem onde a pessoa está');

  function passos(estado) {
    return pedaco(['desenharPassos'], estado).desenharPassos();
  }

  teste('antes de conferir: o passo 1 é o atual, e nenhum está feito', () => {
    const html = passos();
    igual((html.match(/class="imp-passo /g) || []).length, 4, 'quatro passos');
    contem(html, '<li class="imp-passo atual" aria-current="step"><b>1</b>De onde vêm</li>');
    verdadeiro(html.indexOf('feito') < 0, 'nada feito ainda');
  });

  teste('conferido: o 1 vira ✓ e o 2 é o atual', () => {
    const html = passos({ laudo: {} });
    contem(html, '<li class="imp-passo feito"><b>✓</b>De onde vêm</li>');
    contem(html, '<li class="imp-passo atual" aria-current="step"><b>2</b>Conferir as colunas</li>');
    contem(html, '<li class="imp-passo "><b>4</b>Importar</li>');
  });

  teste('gravado: os quatro feitos, nenhum atual', () => {
    const html = passos({ laudo: {}, resultado: {} });
    igual((html.match(/imp-passo feito/g) || []).length, 4);
    verdadeiro(html.indexOf('aria-current') < 0, 'não sobra passo atual');
  });

  /* ----------------------------------------------------------------------- */
  secao('A faixa do pé resume o lote antes de importar');

  function resumo(estado) {
    return pedaco(['resumoDoLote'], estado).resumoDoLote();
  }

  teste('ninguém marcado: diz que fica o analista da planilha', () => {
    igual(resumo(), 'Sem divisão: fica o analista que vier na planilha');
  });

  teste('marcados, status e agendamento entram no resumo, nessa ordem', () => {
    igual(resumo({
      analistasMarcados: { Ana: true, Diego: true, Marcos: false },
      opcoes: { statusDoCanal: ['Não trabalhado'] }, statusQueVale: () => 'Não trabalhado',
      agendarDias: '7', agendarPara: 'Pendente',
    }), 'Divididos entre Ana, Diego · status Não trabalhado · muda sozinho em D+7');
  });

  teste('canal com status e nenhum escolhido: "sem status"; sem destino, o agendamento não aparece', () => {
    igual(resumo({ opcoes: { statusDoCanal: ['Em andamento'] }, agendarDias: '7', agendarPara: '' }),
      'Sem divisão: fica o analista que vier na planilha · sem status');
  });

  teste('no chat, o resumo é o nome do lote — ou o lembrete de dar um', () => {
    igual(resumo({ oQueImportar: 'chat' }), 'Dê um nome ao lote antes de importar.');
    igual(resumo({ oQueImportar: 'chat', nomeDoLote: 'Novembro' }), 'Lote "Novembro"');
  });

  teste('o botão diz quantos entram e fica desligado quando nenhum entra', () => {
    const laudo = { vaoEntrar: 0 };
    const html = pedaco(['desenharBarra', 'resumoDoLote'], { laudo, opcoes: { canal: { nome: 'RET' }, analistas: [] } })
      .desenharBarra();
    contem(html, '<strong>0 casos vão entrar em RET</strong>');
    contem(html, 'id="importar-agora" disabled>Importar 0 caso(s)</button>');
    contem(html, 'id="imp-resumo-do-lote"');
    contem(html, 'id="recomecar-da-barra"');
    const um = pedaco(['desenharBarra', 'resumoDoLote'], { laudo: { vaoEntrar: 1 }, opcoes: { analistas: [] } })
      .desenharBarra();
    contem(um, '<strong>1 caso vai entrar</strong>');
    verdadeiro(um.indexOf('disabled') < 0, 'com um caso, o botão vale');
  });

  /* ----------------------------------------------------------------------- */
  secao('O passo 2: os números e cada coluna com a etiqueta');

  teste('cada coluna diz se entra, e a lembrada diz de onde veio', () => {
    const { etiquetaDaColuna } = pedaco(['etiquetaDaColuna']);
    contem(etiquetaDaColuna({ paraAColuna: 'CPF' }), '>ligada<');
    contem(etiquetaDaColuna({ paraAColuna: 'CPF', lembrado: true }), '>como na última importação<');
    contem(etiquetaDaColuna({ paraAColuna: '' }), 'imp-etiqueta fora">não entra<');
  });

  teste('"Ficam de fora" só aparece quando alguma linha fica de fora', () => {
    const contagem = (laudo) => pedaco(['desenharContagem'], {
      laudo, porQueRepetem: () => '', emReais: (v) => 'R$ ' + v,
    }).desenharContagem();
    const limpo = contagem({ linhasNaFonte: 3, vaoEntrar: 3, vaoSerPuladas: 0, motivosParaPular: {} });
    verdadeiro(limpo.indexOf('Ficam de fora') < 0, 'nada fica de fora');
    contem(limpo, '<span>Vão entrar</span><strong>3</strong>');
    const sujo = contagem({ linhasNaFonte: 5, vaoEntrar: 3, vaoSerPuladas: 2,
      motivosParaPular: { vazia: 1, repetida: 1 } });
    contem(sujo, 'title="1 em branco, 1 repetidas"><span>Ficam de fora</span><strong>2</strong>');
  });

  teste('escolher a coluna no de-para troca a etiqueta da linha na hora', () => {
    const tela = lerPeca('Importacao');
    contem(tela, '<td data-etiqueta-da-coluna="\' + i + \'">\' + etiquetaDaColuna(par) + \'</td>');
    contem(corpoDe(tela, 'escolherColuna'), '[data-etiqueta-da-coluna=');
    contem(corpoDe(tela, 'escolherColuna'), 'if (etiqueta) etiqueta.innerHTML = etiquetaDaColuna(par);');
  });

  /* ----------------------------------------------------------------------- */
  secao('O passo 3: cada opção num quadro com a explicação embaixo');

  teste('o quadro junta título, controle e explicação; "largo" ocupa a linha', () => {
    const { quadro } = pedaco(['quadro']);
    igual(quadro('Status', '<select></select>', 'Uma linha.'),
      '<div class="imp-quadro"><strong>Status</strong><select></select><small>Uma linha.</small></div>');
    contem(quadro('Dividir entre', '', '', true), 'class="imp-quadro largo"');
    verdadeiro(quadro('X', '<i></i>').indexOf('<small>') < 0, 'sem explicação, sem linha vazia');
  });

  teste('cada analista é um botão marcável; marcar não redesenha a tela', () => {
    const { desenharAnalistas } = pedaco(['desenharAnalistas', 'quadro'], {
      opcoes: { analistas: [{ nome: 'Ana' }, { nome: 'Diego' }] },
      analistasMarcados: { Diego: true }, desenharQuemEstaFora: () => '', quemEstaFora: () => [],
    });
    const html = desenharAnalistas();
    contem(html, '<label class="imp-pessoa"><input type="checkbox" data-analista="Ana"><span>Ana</span></label>');
    contem(html, '<label class="imp-pessoa marcada"><input type="checkbox" data-analista="Diego" checked>');
    const ligar = corpoDe(lerPeca('Importacao'), 'ligar');
    const trecho = ligar.substring(ligar.indexOf("mudancas('[data-analista]'"), ligar.indexOf("elemento('nome-do-lote')"));
    contem(trecho, "caixa.parentNode.className = 'imp-pessoa' + (caixa.checked ? ' marcada' : '');");
    contem(trecho, 'atualizarResumoDoLote();');
    verdadeiro(trecho.indexOf('desenhar()') < 0, 'redesenhar apagaria as buscas do de-para');
  });

  teste('o nome do lote atualiza o resumo do pé enquanto se digita', () => {
    contem(corpoDe(lerPeca('Importacao'), 'ligar'),
      "if (nome) nome.addEventListener('input', function () { nomeDoLote = this.value; atualizarResumoDoLote(); });");
  });

  /* ----------------------------------------------------------------------- */
  secao('Voltar ao passo 1, e o estilo');

  teste('"trocar", "Recomeçar" e "Importar outro lote" voltam ao início, cada um com seu id', () => {
    const tela = lerPeca('Importacao');
    contem(tela, "cliques('#recomecar-do-laudo, #recomecar-da-barra, #importar-outro-lote', function () {");
    contem(tela, 'id="recomecar-do-laudo">trocar</button>');
    const desenho = pedaco(['desenhar'], {});
    verdadeiro(typeof desenho.desenhar === 'function');
  });

  teste('os cartões têm a classe certa (a antiga "cartaa" nunca pegava estilo)', () => {
    const tela = lerPeca('Importacao');
    verdadeiro(tela.indexOf('cartaa') < 0, 'o erro de digitação sumiu');
    const estilos = lerPeca('Estilos');
    ['.imp-passos', '.imp-cartao', '.imp-quadro', '.imp-pessoa.marcada', '.imp-barra'].forEach((regra) => {
      contem(estilos, regra);
    });
  });

  teste('a faixa do pé fica grudada embaixo enquanto se rola', () => {
    const estilos = lerPeca('Estilos');
    const regra = estilos.substring(estilos.indexOf('.imp-barra {'), estilos.indexOf('}', estilos.indexOf('.imp-barra {')));
    contem(regra, 'position: sticky');
    contem(regra, 'bottom: 0');
  });
}

module.exports = { rodarTestesDaImportacaoEmPassos };
