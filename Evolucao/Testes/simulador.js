/**
 * ============================================================================
 * RECC — simulador.js · um Google Planilhas falso que MENTE menos
 * ============================================================================
 * O simulador de testes do sistema anterior gravava string como string. Por
 * isso nenhum teste enxergou o bug que corrompeu 4.328 Ids em produção: no
 * Sheets de verdade, texto "que parece número" numa célula de formato Geral
 * VIRA número.
 *
 *     '00000010'  →  10          (zeros à esquerda perdidos)
 *     '000000E1'  →  0           (notação científica)
 *
 * Este simulador faz exatamente essa conversão, e respeita o formato '@'.
 * É o que permite um teste provar que a proteção funciona.
 * ============================================================================
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/*
  De onde o HtmlService lê as telas. Normalmente é a pasta do repositório; o
  teste ponta a ponta aponta para o PACOTE, e assim as mesmas conferências
  rodam contra os 3 arquivos que a operação vai colar no Apps Script.
*/
const PASTA_DAS_TELAS = process.env.PGO_PASTA_DAS_TELAS
  || path.join(__dirname, '..', '..', 'Front-End');
const PARECE_NUMERO = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/**
 * O motor de template do Apps Script, em miniatura.
 *
 *   <?= expressao ?>   escreve o valor, escapando o HTML
 *   <?!= expressao ?>  escreve o valor cru
 *   <?  codigo     ?>  executa o código
 *
 * Existe para os testes conseguirem montar uma tela de verdade e conferir o
 * que saiu dela — e não só se a função foi chamada.
 */
function escaparHtml(valor) {
  return String(valor === null || valor === undefined ? '' : valor)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function montarTemplate(fonte, variaveis, globaisDoServidor) {
  let corpo = "var __saida = '';\n";
  let posicao = 0;
  const pedacos = /<\?(!?=)?([\s\S]*?)\?>/g;
  let achado;
  while ((achado = pedacos.exec(fonte)) !== null) {
    corpo += '__saida += ' + JSON.stringify(fonte.slice(posicao, achado.index)) + ';\n';
    if (achado[1] === '=') corpo += '__saida += __escapar(' + achado[2] + ');\n';
    else if (achado[1] === '!=') corpo += '__saida += (' + achado[2] + ');\n';
    else corpo += achado[2] + '\n';
    posicao = pedacos.lastIndex;
  }
  corpo += '__saida += ' + JSON.stringify(fonte.slice(posicao)) + ';\nreturn __saida;';

  // No Apps Script, um template enxerga TODAS as funções do servidor — é
  // assim que <?!= incluir('Estilos') ?> funciona. O `with` reproduz esse
  // alcance: sem ele o simulador seria mais restrito que o Apps Script e
  // aprovaria uma página que quebraria em produção.
  const funcao = new Function('__servidor', '__pagina', '__escapar',
    'with (__servidor) { with (__pagina) {\n' + corpo + '\n} }');
  return funcao(globaisDoServidor || {}, variaveis, escaparHtml);
}

function saidaHtml(html) {
  const saida = {
    getContent: () => html,
    setTitle(titulo) { saida.titulo = titulo; return saida; },
    addMetaTag() { return saida; }
  };
  return saida;
}

/** A conversão que o Sheets faz ao receber um valor numa célula. */
function converterComoOPlanilhas(valor, formato) {
  if (valor === null || valor === undefined) return '';
  if (formato === '@') {
    if (valor instanceof Date) return valor;
    return String(valor);
  }
  if (typeof valor !== 'string') return valor;
  const limpo = valor.trim();
  if (limpo === '') return '';
  if (PARECE_NUMERO.test(limpo)) {
    const n = Number(limpo);
    if (Number.isFinite(n)) return n;
  }
  return valor;
}

class Faixa {
  constructor(aba, linha, coluna, nLinhas, nColunas) {
    this.aba = aba;
    this.linha = linha;
    this.coluna = coluna;
    this.nLinhas = nLinhas;
    this.nColunas = nColunas;
  }
  getRow() { return this.linha; }
  getColumn() { return this.coluna; }
  getValues() {
    medidor.idasParaLer++;
    medidor.celulasLidas += this.nLinhas * this.nColunas;
    const saida = [];
    for (let i = 0; i < this.nLinhas; i++) {
      const linha = [];
      for (let j = 0; j < this.nColunas; j++) {
        linha.push(this.aba.valores[this.linha - 1 + i][this.coluna - 1 + j]);
      }
      saida.push(linha);
    }
    return saida;
  }
  getValue() { return this.getValues()[0][0]; }
  setValues(matriz) {
    medidor.idasParaGravar++;
    medidor.celulasGravadas += this.nLinhas * this.nColunas;
    for (let i = 0; i < this.nLinhas; i++) {
      for (let j = 0; j < this.nColunas; j++) {
        const l = this.linha - 1 + i;
        const c = this.coluna - 1 + j;
        this.aba.valores[l][c] = converterComoOPlanilhas(matriz[i][j], this.aba.formatos[l][c]);
      }
    }
    return this;
  }
  setValue(v) { return this.setValues([[v]]); }
  /* Só o conteúdo, sem mexer no formato — é o que o gerador das abas de
     análise usa antes de reescrever a aba inteira. */
  clearContent() {
    for (let i = 0; i < this.nLinhas; i++) {
      for (let j = 0; j < this.nColunas; j++) {
        this.aba.valores[this.linha - 1 + i][this.coluna - 1 + j] = '';
      }
    }
    return this;
  }
  setNumberFormat(formato) {
    for (let i = 0; i < this.nLinhas; i++) {
      for (let j = 0; j < this.nColunas; j++) {
        this.aba.formatos[this.linha - 1 + i][this.coluna - 1 + j] = formato;
      }
    }
    return this;
  }
  setNumberFormats(matriz) {
    medidor.idasParaGravar++;
    for (let i = 0; i < this.nLinhas; i++) {
      for (let j = 0; j < this.nColunas; j++) {
        this.aba.formatos[this.linha - 1 + i][this.coluna - 1 + j] = matriz[i][j];
      }
    }
    return this;
  }
  getNumberFormats() {
    medidor.idasParaLer++;
    medidor.celulasLidas += this.nLinhas * this.nColunas;
    const saida = [];
    for (let i = 0; i < this.nLinhas; i++) {
      const linha = [];
      for (let j = 0; j < this.nColunas; j++) {
        linha.push(this.aba.formatos[this.linha - 1 + i][this.coluna - 1 + j]);
      }
      saida.push(linha);
    }
    return saida;
  }
  setFontWeight() { return this; }
  /** Só o caso usado pelo produto: subir a partir do fundo de uma coluna. */
  getNextDataCell() {
    const c = this.coluna - 1;
    for (let l = this.linha - 1; l >= 0; l--) {
      const v = this.aba.valores[l][c];
      if (v !== '' && v !== null && v !== undefined) {
        return new Faixa(this.aba, l + 1, this.coluna, 1, 1);
      }
    }
    return new Faixa(this.aba, 1, this.coluna, 1, 1);
  }
}

class Aba {
  constructor(nome, linhas = 1000, colunas = 26) {
    this.nome = nome;
    this.valores = Array.from({ length: linhas }, () => new Array(colunas).fill(''));
    this.formatos = Array.from({ length: linhas }, () => new Array(colunas).fill(''));
    this.congeladas = 0;
  }
  getName() { return this.nome; }
  getMaxRows() { return this.valores.length; }
  getMaxColumns() { return this.valores[0] ? this.valores[0].length : 0; }
  getRange(l, c, nl = 1, nc = 1) {
    medidor.faixasPedidas++;
    if (l + nl - 1 > this.getMaxRows() || c + nc - 1 > this.getMaxColumns()) {
      throw new Error('Fora da grade: ' + this.nome + ' (' + l + ',' + c +
        ' por ' + nl + 'x' + nc + ') — grade ' + this.getMaxRows() + 'x' +
        this.getMaxColumns());
    }
    return new Faixa(this, l, c, nl, nc);
  }
  getLastRow() {
    for (let l = this.valores.length - 1; l >= 0; l--) {
      if (this.valores[l].some((v) => v !== '' && v !== null && v !== undefined)) {
        return l + 1;
      }
    }
    return 0;
  }
  getLastColumn() {
    let ultima = 0;
    for (let l = 0; l < this.valores.length; l++) {
      for (let c = this.valores[l].length - 1; c >= ultima; c--) {
        const v = this.valores[l][c];
        if (v !== '' && v !== null && v !== undefined) { ultima = Math.max(ultima, c + 1); break; }
      }
    }
    return ultima;
  }
  setFrozenRows(n) { this.congeladas = n; return this; }
  insertRowsAfter(depois, quantas) {
    const largura = this.getMaxColumns();
    // Um splice só, e não `quantas` splices: inserir 200 mil linhas uma a uma
    // é O(n²) e travaria o teste de estresse sem dizer nada sobre o produto.
    const novasValores = Array.from({ length: quantas },
      () => new Array(largura).fill(''));
    const novasFormatos = Array.from({ length: quantas },
      () => new Array(largura).fill(''));
    this.valores.splice(depois, 0, ...novasValores);
    this.formatos.splice(depois, 0, ...novasFormatos);
    return this;
  }
  deleteRows(inicio, quantas) {
    this.valores.splice(inicio - 1, quantas);
    this.formatos.splice(inicio - 1, quantas);
    return this;
  }
  insertColumnsAfter(depois, quantas) {
    for (let l = 0; l < this.valores.length; l++) {
      for (let i = 0; i < quantas; i++) {
        this.valores[l].splice(depois + i, 0, '');
        this.formatos[l].splice(depois + i, 0, '');
      }
    }
    return this;
  }
  insertColumnsBefore(antes, quantas) { return this.insertColumnsAfter(antes - 1, quantas); }
  deleteColumns(inicio, quantas) {
    for (let l = 0; l < this.valores.length; l++) {
      this.valores[l].splice(inicio - 1, quantas);
      this.formatos[l].splice(inicio - 1, quantas);
    }
    return this;
  }
}

/**
 * O MEDIDOR.
 *
 * No Apps Script o que custa não é a conta em JavaScript: é cada ida ao
 * serviço de planilha e ao de propriedades. Uma chamada dessas leva dezenas de
 * milissegundos, e a execução inteira tem seis minutos. Medir o RELÓGIO do
 * Node não diz nada sobre isso — medir as IDAS diz tudo.
 *
 * Fica sempre ligado: um contador que só incrementa não pesa, e ligar só no
 * teste de estresse daria números diferentes dos do dia a dia.
 */
const medidor = {
  celulasLidas: 0,
  celulasGravadas: 0,
  idasParaLer: 0,
  idasParaGravar: 0,
  faixasPedidas: 0,
  propriedadesLidas: 0,
  propriedadesGravadas: 0,
  travasPedidas: 0,
  zerar() {
    this.celulasLidas = 0; this.celulasGravadas = 0;
    this.idasParaLer = 0; this.idasParaGravar = 0; this.faixasPedidas = 0;
    this.propriedadesLidas = 0; this.propriedadesGravadas = 0;
    this.travasPedidas = 0;
    return this;
  },
  retrato() {
    return {
      celulasLidas: this.celulasLidas, celulasGravadas: this.celulasGravadas,
      idasParaLer: this.idasParaLer, idasParaGravar: this.idasParaGravar,
      faixasPedidas: this.faixasPedidas,
      propriedadesLidas: this.propriedadesLidas,
      propriedadesGravadas: this.propriedadesGravadas,
      travasPedidas: this.travasPedidas,
      // O que o Apps Script realmente cobra: cada ida ao serviço.
      idasNoTotal: this.idasParaLer + this.idasParaGravar
        + this.propriedadesLidas + this.propriedadesGravadas
    };
  }
};

class Planilha {
  constructor() { this.abas = []; this.fuso = 'Etc/GMT'; }
  insertSheet(nome) { const a = new Aba(nome); this.abas.push(a); return a; }
  getSheetByName(nome) { return this.abas.find((a) => a.nome === nome) || null; }
  getSheets() { return this.abas.slice(); }
  setSpreadsheetTimeZone(f) { this.fuso = f; return this; }
  getSpreadsheetTimeZone() { return this.fuso; }
}

/** Monta o ambiente global falso que os arquivos .gs enxergam. */
function criarAmbienteFalso(email = 'analista@exemplo.com') {
  const planilha = new Planilha();
  const propriedades = new Map();
  const propriedadesDoUsuario = new Map();
  const registros = [];
  let emailAtual = email;

  // Outras planilhas, abertas por Id — é assim que o sistema lê a base do
  // sistema anterior. Uma que não existe tem de ESTOURAR, como estoura no
  // Apps Script de verdade: se aqui ela devolvesse null, o teste da planilha
  // fora do ar passaria sem provar nada.
  const planilhasExternas = new Map();

  // Arquivos de tela "não copiados" para o projeto. O caso real: o arquivo
  // está na pasta do repositório — então os testes o enxergam — e não está no
  // projeto do Apps Script. Sem poder simular isso, o caminho de erro mais
  // comum de uma instalação nova ficaria sem teste.
  const telasEscondidas = new Set();
  const telasTrocadas = new Map();

  function exigirTelaCopiada(nome) {
    if (telasEscondidas.has(nome)) {
      throw new Error('Nenhum arquivo HTML com o nome ' + nome
        + ' foi encontrado.');
    }
  }

  const ambiente = {
    medidor,
    planilha,
    propriedades,
    propriedadesDoUsuario,
    registros,
    /** Troca quem está "logado", para testar cada perfil de acesso. */
    definirEmail(novo) { emailAtual = novo; },
    /** Finge que este arquivo de tela não foi copiado para o projeto. */
    esconderTela(nome) { telasEscondidas.add(nome); },
    /**
     * Finge que a cópia deste arquivo no projeto é OUTRA — mais velha, ou
     * cortada no meio. É o caso mais comum de uma cópia manual, e o que a
     * operação relatou como "desconfigurou a estilização".
     */
    trocarTelaPor(nome, conteudo) { telasTrocadas.set(nome, conteudo); },
    emailAtual() { return emailAtual; },
    /**
     * Cria uma planilha "de fora", com uma aba já preenchida, e devolve o Id.
     * Serve para testar a leitura da base legada sem contrato nenhum.
     */
    criarPlanilhaExterna(nomeDaAba, linhas) {
      const outra = new Planilha();
      const aba = outra.insertSheet(nomeDaAba || 'Página1');
      if (linhas && linhas.length) {
        aba.getRange(1, 1, linhas.length, linhas[0].length).setValues(linhas);
      }
      const id = 'planilha-externa-' + (planilhasExternas.size + 1);
      planilhasExternas.set(id, outra);
      return id;
    },
    globais: {
      SpreadsheetApp: {
        getActive: () => planilha,
        openById: (id) => {
          if (!planilhasExternas.has(id)) {
            throw new Error('Unexpected error while getting the method or '
              + 'property openById on object SpreadsheetApp.');
          }
          return planilhasExternas.get(id);
        },
        Direction: { UP: 'UP', DOWN: 'DOWN' }
      },
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (k) => {
            medidor.propriedadesLidas++;
            return propriedades.has(k) ? propriedades.get(k) : null;
          },
          setProperty: (k, v) => {
            medidor.propriedadesGravadas++;
            propriedades.set(k, String(v));
          },
          deleteProperty: (k) => { propriedades.delete(k); }
        }),
        getUserProperties: () => ({
          getProperty: (k) =>
            (propriedadesDoUsuario.has(k) ? propriedadesDoUsuario.get(k) : null),
          setProperty: (k, v) => { propriedadesDoUsuario.set(k, String(v)); },
          deleteProperty: (k) => { propriedadesDoUsuario.delete(k); }
        })
      },
      HtmlService: {
        createTemplateFromFile(nome) {
          exigirTelaCopiada(nome);
          const fonte = telasTrocadas.has(nome) ? telasTrocadas.get(nome)
            : fs.readFileSync(path.join(PASTA_DAS_TELAS, nome + '.html'), 'utf8');
          const template = {
            /* O Apps Script devolve o arquivo cru, sem avaliar os scriptlets.
               É por aqui que o Diagnostico lê as telas para conferir se toda
               função que elas chamam existe no servidor. */
            getRawContent() { return fonte; },
            evaluate() {
              const variaveis = {};
              Object.keys(template).forEach((chave) => {
                if (chave !== 'evaluate' && chave !== 'getRawContent') {
                  variaveis[chave] = template[chave];
                }
              });
              return saidaHtml(montarTemplate(fonte, variaveis, ambiente.globais));
            }
          };
          return template;
        },
        createHtmlOutputFromFile(nome) {
          exigirTelaCopiada(nome);
          return saidaHtml(
            fs.readFileSync(path.join(PASTA_DAS_TELAS, nome + '.html'), 'utf8'));
        }
      },
      LockService: {
        getScriptLock: () => ({
          tryLock: () => { medidor.travasPedidas++; return true; },
          waitLock: () => true,
          releaseLock: () => {}
        })
      },
      Session: { getActiveUser: () => ({ getEmail: () => emailAtual }) },
      Logger: { log: (m) => registros.push(String(m)) },
      Utilities: {
        /**
         * Formatação de verdade, e não String(data).
         *
         * Um formatador que devolve qualquer coisa faria o teste da barra
         * superior passar mostrando "Mon Sep 13 2026 ..." — que é exatamente
         * o que o produto NÃO pode mostrar.
         */
        formatDate: (data, fuso, padrao) => {
          const doisDigitos = (n) => (n < 10 ? '0' : '') + n;
          return String(padrao)
            .replace('yyyy', data.getFullYear())
            .replace('dd', doisDigitos(data.getDate()))
            .replace('MM', doisDigitos(data.getMonth() + 1))
            .replace('HH', doisDigitos(data.getHours()))
            .replace('mm', doisDigitos(data.getMinutes()));
        },
        getUuid: () => crypto.randomUUID(),
        DigestAlgorithm: { SHA_256: 'SHA_256' },
        Charset: { UTF_8: 'UTF_8' },
        /**
         * SHA-256 DE VERDADE, e não um atalho.
         *
         * O simulador do sistema anterior já teve `computeDigest: () => [1]`.
         * Os testes de senha passavam sem testar coisa alguma. Aqui usamos o
         * mesmo algoritmo do Google, e devolvemos bytes com sinal (-128 a 127)
         * como o Apps Script devolve — senão a conversão para hexadecimal
         * seria testada errada.
         */
        computeDigest: (algoritmo, texto) => {
          if (algoritmo !== 'SHA_256') {
            throw new Error('Algoritmo não simulado: ' + algoritmo);
          }
          const resumo = crypto.createHash('sha256').update(String(texto), 'utf8').digest();
          return Array.from(resumo).map((b) => (b > 127 ? b - 256 : b));
        }
      },
      console
    }
  };

  return ambiente;
}

module.exports = { medidor, criarAmbienteFalso, converterComoOPlanilhas };
