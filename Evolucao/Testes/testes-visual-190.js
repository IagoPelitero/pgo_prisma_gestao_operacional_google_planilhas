/**
 * ============================================================================
 * PGO — testes-visual-190.js · a modernização visual aprovada (Etapa 90)
 * ============================================================================
 * A proposta visual aprovada pelo PO (Corporate Modern, azul Porto, os quatro
 * temas) e o F19 (contraste). O que se confere aqui é o que dá para conferir
 * sem olhar: as cores dos temas pelo critério WCAG AA (4,5:1 para texto
 * normal), e as peças que a proposta pede em cada tela. A aparência em si é
 * conferida pelas imagens e pela varredura de responsividade.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { secao, teste, igual, verdadeiro, contem } = require('./ferramentas');

const PASTA = path.join(__dirname, '..', '..', 'Front-End');
const ler = (nome) => fs.readFileSync(path.join(PASTA, nome), 'utf8');

/** Os tokens de cor de um tema, lidos do Estilos.html (só os hexadecimais). */
function tokensDoTema(estilos, marca) {
  const i = estilos.indexOf(marca);
  const bloco = estilos.slice(i, estilos.indexOf('\n}', i));
  const tokens = {};
  bloco.replace(/--([a-z0-9-]+):\s*(?:var\(--cor-da-operacao,\s*)?(#[0-9A-Fa-f]{6})/g, (_, nome, cor) => { tokens[nome] = cor; return ''; });
  return tokens;
}

function luminancia(hex) {
  const c = hex.replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a, b) {
  const x = luminancia(a); const y = luminancia(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const TEMAS = {
  Padrão: ':root, :root[data-tema="padrao"] {',
  Rosa: ':root[data-tema="rosa"] {',
  Dark: ':root[data-tema="dark"] {',
  Brasil: ':root[data-tema="brasil"] {'
};

/** Os pares de texto e fundo que a tela usa — texto normal: 4,5:1. */
const PARES = [
  ['texto', 'fundo'], ['texto', 'superficie'], ['suave', 'fundo'], ['suave', 'superficie'], ['suave', 'superficie-2'],
  ['tenue', 'fundo'], ['tenue', 'superficie'], ['tenue', 'superficie-2'],
  ['destaque', 'superficie'], ['destaque-sobre', 'destaque'],
  ['lateral-texto', 'lateral-fundo'], ['lateral-subtexto', 'lateral-fundo'], ['lateral-ativo-texto', 'lateral-ativo'],
  ['bom', 'bom-tenue'], ['atencao', 'atencao-tenue'], ['ruim', 'ruim-tenue'],
  ['bom', 'superficie'], ['atencao', 'superficie'], ['ruim', 'superficie'],
  ['violeta', 'violeta-tenue']
];

function rodarTestesDoVisual190() {
  console.log('\nEtapa 90: a modernização visual aprovada');

  /* ----------------------------------------------------------------------- */
  secao('F19 — contraste WCAG AA nos quatro temas');

  const estilos = ler('Estilos.html');
  const base = tokensDoTema(estilos, ':root {');
  Object.keys(TEMAS).forEach((tema) => {
    teste(tema + ': todo texto normal tem 4,5:1 ou mais sobre o fundo dele', () => {
      const t = Object.assign({}, base, tokensDoTema(estilos, TEMAS[tema]));
      const abaixo = PARES.filter(([a, b]) => t[a] && t[b] && contraste(t[a], t[b]) < 4.5)
        .map(([a, b]) => a + ' sobre ' + b + ' = ' + contraste(t[a], t[b]).toFixed(2));
      const faltando = PARES.filter(([a, b]) => !t[a] || !t[b]).map(([a, b]) => a + '/' + b);
      igual(faltando.join(', '), '', 'todos os pares têm cor no tema');
      igual(abaixo.join('; '), '');
    });
  });

  teste('o menu lateral ganhou o azul escuro aprovado (era 2,85:1, agora mais de 8:1)', () => {
    const t = tokensDoTema(estilos, TEMAS.Padrão);
    igual(t['lateral-fundo'], '#0B4F94');
    verdadeiro(contraste(t['lateral-texto'], t['lateral-fundo']) > 8);
    igual(tokensDoTema(estilos, TEMAS.Brasil)['lateral-ativo'], '#FFDF00', 'o item atual do Brasil, no amarelo da bandeira');
  });

  /* ----------------------------------------------------------------------- */
  secao('A casca: o seletor de canal na linha do título');

  teste('a casca põe o seletor de canal no cabeçalho da tela, sem mudar o seletor', () => {
    const aplicacao = ler('Aplicacao.html');
    contem(aplicacao, '<div class="titulo-da-tela">');
    contem(aplicacao, "querySelector(':scope > .canais')");
    contem(estilos, '.cabecalho-da-tela .canais {');
  });

  /* ----------------------------------------------------------------------- */
  secao('Trabalho: Proposta A, V1, V2, V3, a faixa do prazo e o F9');

  const trabalho = ler('Trabalho.html');
  teste('a janela do prazo não abre sozinha: a faixa no alto, e "Ver os casos" abre a mesma janela', () => {
    const carregar = trabalho.slice(trabalho.indexOf('function carregar(recado)'), trabalho.indexOf('function ligarPainel'));
    verdadeiro(carregar.indexOf('avisarDosQueVencem()') < 0, 'a carga não abre a janela');
    contem(carregar, 'guardarOPrazo();');
    contem(trabalho, "elemento('ver-casos-do-prazo').addEventListener('click', avisarDosQueVencem);");
  });

  teste('F9: o Mostrar lembra só o número, e nunca o "Todos"', () => {
    contem(trabalho, "if (escolha !== 'todos') {");
    contem(trabalho, "window.localStorage.setItem(CHAVE_DO_MOSTRAR, String(quantosNaFila))");
    contem(trabalho, 'Sua escolha fica salva');
  });

  teste('V1, V2 e V3 estão na fila', () => {
    contem(trabalho, "' class=\"linha-prazo-' + tom + '\"'");
    contem(trabalho, 'Filtrando por');
    contem(trabalho, 'data-tirar-cartao');
    contem(estilos, '.fila-do-trabalho table.fila thead th {');
    contem(ler('Aplicacao.html'), "'--altura-da-barra-superior'");
  });

  teste('a situação vem em cima só no desenho: as colunas da fila continuam as de Configurações', () => {
    contem(trabalho, 'grupo.filter(function (celula) { return celula.ehStatus; })');
  });
}

module.exports = { rodarTestesDoVisual190 };
