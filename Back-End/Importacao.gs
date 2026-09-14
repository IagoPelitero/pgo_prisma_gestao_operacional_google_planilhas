/**
 * RECC — Importacao.gs · trazer listas prontas para dentro do sistema
 * ============================================================================
 * O cadastro de corretoras e a lista de SUSEPs bloqueadas já EXISTEM na
 * operação, em planilha, antes de o PGO nascer. Digitar centenas de linhas
 * uma a uma dentro do sistema não é trabalho: é desperdício, e é o caminho
 * mais curto para o cadastro nascer pela metade.
 *
 * Esta tela resolve isso com três passos, sempre nesta ordem:
 *
 *   1. COLAR    a pessoa copia da planilha dela e cola aqui. Aceita o que o
 *               Excel e o Google Planilhas colocam na área de transferência —
 *               colunas separadas por TAB — e também ponto e vírgula.
 *   2. CONFERIR o servidor lê o texto e devolve o que VAI acontecer com cada
 *               linha, sem gravar nada: nova, atualiza a que existe, ou
 *               recusada — e neste último caso, por quê.
 *   3. APLICAR  só então grava.
 *
 * Duas decisões que valem a pena estar escritas:
 *
 * O SEGUNDO PASSO NÃO É ENFEITE. Importação é a ação com maior alcance do
 * sistema: um erro escreve em quinhentas linhas de uma vez. Ver antes é o que
 * transforma "colei a coluna errada" num susto em vez de num estrago.
 *
 * O TERCEIRO PASSO NÃO CONFIA NO SEGUNDO. `aplicarImportacao` lê o TEXTO
 * de novo e refaz a conferência inteira — não recebe do navegador a lista já
 * conferida. Se recebesse, bastaria alterar a lista no caminho para gravar o
 * que o servidor nunca aprovou.
 *
 * Nada aqui APAGA. Uma SUSEP que está no cadastro e não está no arquivo colado
 * fica onde está: o arquivo é uma correção, não a verdade inteira. Quem quiser
 * tirar uma corretora tira uma a uma, na tabela, e mesmo assim a linha
 * permanece na planilha.
 * ============================================================================
 */

/** Quantas linhas o passo de conferência mostra na tela. */
var RECC_LINHAS_NA_CONFERENCIA = 200;

/** Teto de linhas por importação, para não estourar o tempo do Apps Script. */
var RECC_MAXIMO_DA_IMPORTACAO = 2000;

/**
 * O que dá para importar.
 *
 * Cada tipo diz em que aba grava, qual coluna é a CHAVE (a que decide se a
 * linha é nova ou é atualização) e quais colunas ele entende. A tela desenha o
 * cabeçalho de exemplo a partir daqui — assim o que a tela promete e o que o
 * servidor aceita não podem divergir.
 */
var RECC_IMPORTACOES = {
  corretoras: {
    titulo: 'Corretoras',
    aba: 'CANAIS',
    chave: 'susep',
    explicacao: 'Uma linha por corretora. A SUSEP é o que liga a corretora ao '
      + 'caso, e é por ela que o sistema sabe se a linha é nova ou já existe.',
    colunas: [
      { chave: 'susep', titulo: 'SUSEP', coluna: 'SUSEP',
        tipo: 'identificador', obrigatoria: true },
      { chave: 'corretora', titulo: 'Corretora', coluna: 'Corretora',
        tipo: 'texto', obrigatoria: true },
      { chave: 'canal', titulo: 'Canal', coluna: 'Canal', tipo: 'texto' },
      { chave: 'segmento', titulo: 'Segmento', coluna: 'Segmento',
        tipo: 'texto', padrao: 'Não encontrado' }
    ]
  },

  susepsBloqueadas: {
    titulo: 'SUSEPs bloqueadas',
    aba: 'SUSEP_BLOQUEADAS',
    chave: 'susep',
    explicacao: 'Uma linha por SUSEP bloqueada. O motivo é obrigatório: sem '
      + 'ele, quem vir o selo vermelho daqui a seis meses não saberá o que '
      + 'fazer com a informação.',
    colunas: [
      { chave: 'susep', titulo: 'SUSEP', coluna: 'SUSEP',
        tipo: 'identificador', obrigatoria: true },
      { chave: 'motivo', titulo: 'Motivo', coluna: 'Motivo',
        tipo: 'texto', obrigatoria: true },
      { chave: 'corretora', titulo: 'Corretora', coluna: 'NomeCorretora',
        tipo: 'texto' },
      { chave: 'cpfReincidente', titulo: 'CPF reincidente',
        coluna: 'CpfReincidente', tipo: 'identificador' }
    ]
  }
};

// ============================================================================
// O QUE A TELA PRECISA SABER
// ============================================================================

/**
 * Os tipos de importação e as colunas de cada um.
 *
 * A tela não guarda essa lista: pede aqui. Acrescentar um tipo novo é mexer
 * em RECC_IMPORTACOES e em mais lugar nenhum.
 */
function opcoesDaImportacao() {
  exigirTela_('tabelaCorretoras');

  return Object.keys(RECC_IMPORTACOES).map(function (tipo) {
    var receita = RECC_IMPORTACOES[tipo];
    return {
      tipo: tipo,
      titulo: receita.titulo,
      explicacao: receita.explicacao,
      maximo: RECC_MAXIMO_DA_IMPORTACAO,
      colunas: receita.colunas.map(function (coluna) {
        return {
          chave: coluna.chave,
          titulo: coluna.titulo,
          obrigatoria: !!coluna.obrigatoria
        };
      })
    };
  });
}

// ============================================================================
// LER O TEXTO COLADO
// ============================================================================

/**
 * Descobre o separador das colunas.
 *
 * O Excel e o Google Planilhas colocam TAB na área de transferência. Quem
 * salvou um CSV em português tem ponto e vírgula. Vírgula fica por último de
 * propósito: nome de corretora tem vírgula ("SILVA, SOUZA & CIA"), e chutar
 * vírgula quebraria justamente as linhas mais compridas.
 */
function separadorDoTexto_(primeiraLinha) {
  if (primeiraLinha.indexOf('\t') >= 0) return '\t';
  if (primeiraLinha.indexOf(';') >= 0) return ';';
  return ',';
}

/**
 * Reconhece a linha de cabeçalho.
 *
 * Quem copia da planilha quase sempre traz o cabeçalho junto. Sem reconhecer,
 * ele viraria uma corretora chamada "Corretora" com SUSEP "SUSEP" — recusada
 * por não ter dígito, mas aparecendo como erro numa importação que estava
 * certa.
 */
function ehCabecalho_(pedacos, receita) {
  var conhecidos = 0;
  for (var i = 0; i < pedacos.length; i++) {
    var texto = normalizarParaComparar_(pedacos[i]);
    for (var j = 0; j < receita.colunas.length; j++) {
      if (normalizarParaComparar_(receita.colunas[j].titulo) === texto) {
        conhecidos++;
        break;
      }
    }
  }
  return conhecidos >= 2;
}

/**
 * A ordem das colunas do texto colado.
 *
 * Com cabeçalho, a ordem é a que o cabeçalho disser — a pessoa pode ter
 * colado as colunas em qualquer ordem, e um título que o sistema não conhece
 * vira uma posição vazia, ignorada.
 *
 * Sem cabeçalho, a ordem é a declarada em RECC_IMPORTACOES. É a razão de a
 * primeira coluna de cada tipo ser sempre a chave e a segunda ser sempre a
 * obrigatória: quem cola sem cabeçalho cola o essencial.
 */
function ordemDasColunas_(pedacos, receita) {
  if (!ehCabecalho_(pedacos, receita)) {
    return receita.colunas.map(function (coluna) { return coluna.chave; });
  }
  return pedacos.map(function (pedaco) {
    var texto = normalizarParaComparar_(pedaco);
    var achada = receita.colunas.filter(function (coluna) {
      return normalizarParaComparar_(coluna.titulo) === texto;
    })[0];
    return achada ? achada.chave : '';
  });
}

/**
 * Transforma o texto colado numa lista de linhas com os campos nomeados.
 *
 * Não decide nada sobre gravar: só lê. Quem decide é `conferirImportacao_`.
 */
function lerTextoDaImportacao_(texto, receita) {
  // A linha NÃO é aparada antes de ser partida. Parecia inofensivo, e não é:
  // com TAB como separador, aparar come a primeira coluna quando ela vem
  // vazia — e aí "«vazio» TAB Corretora Alfa" vira uma corretora chamada
  // "Corretora Alfa" com SUSEP "Corretora Alfa", deslocando a linha inteira.
  // Quem apara é cada CÉLULA, depois de partida.
  var linhas = String(texto || '')
    .split(/\r\n|\r|\n/)
    .filter(function (linha) { return linha.trim().length > 0; });

  if (!linhas.length) return { ordem: [], linhas: [], tinhaCabecalho: false };

  var separador = separadorDoTexto_(linhas[0]);
  var primeira = linhas[0].split(separador);
  var ordem = ordemDasColunas_(primeira, receita);
  var tinhaCabecalho = ehCabecalho_(primeira, receita);
  var comeco = tinhaCabecalho ? 1 : 0;

  var lidas = [];
  for (var i = comeco; i < linhas.length; i++) {
    var pedacos = linhas[i].split(separador);
    var valores = {};
    for (var c = 0; c < ordem.length; c++) {
      if (!ordem[c]) continue;
      valores[ordem[c]] = String(pedacos[c] === undefined ? '' : pedacos[c])
        .replace(/^"|"$/g, '')
        .trim();
    }
    lidas.push({ numero: i + 1, valores: valores });
  }
  return { ordem: ordem, linhas: lidas, tinhaCabecalho: tinhaCabecalho };
}

// ============================================================================
// CONFERIR
// ============================================================================

/**
 * O que vai acontecer com cada linha — sem gravar nada.
 *
 * É a mesma função que `aplicarImportacao` usa antes de escrever, e é de
 * propósito: conferência e gravação que seguem regras diferentes acabam
 * discordando, e a tela passa a mentir sobre o que o botão faz.
 */
function conferirImportacao_(tipo, texto) {
  var receita = RECC_IMPORTACOES[tipo];
  if (!receita) {
    throw new Error('Não sei importar "' + tipo + '". Existem: '
      + Object.keys(RECC_IMPORTACOES).join(', ') + '.');
  }

  var lido = lerTextoDaImportacao_(texto, receita);
  if (lido.linhas.length > RECC_MAXIMO_DA_IMPORTACAO) {
    throw new Error('São ' + lido.linhas.length + ' linhas, e o limite por vez '
      + 'é ' + RECC_MAXIMO_DA_IMPORTACAO + '. Divida em partes: o Apps Script '
      + 'tem tempo máximo de execução, e uma importação interrompida no meio '
      + 'grava metade.');
  }

  // Ler o cadastro UMA vez, e não uma por linha. Com quinhentas linhas
  // coladas, uma leitura por linha seriam quinhentas leituras da planilha.
  var colunaChave = colunaChaveDaImportacao_(receita);
  var existentes = {};
  lerRegistros_(receita.aba).forEach(function (linha) {
    var chave = converterParaIdentificador_(linha[colunaChave.coluna]);
    if (chave) existentes[chave] = linha;
  });

  var vistas = {};
  var resultado = lido.linhas.map(function (linha) {
    return conferirUmaLinha_(linha, receita, existentes, vistas);
  });

  return {
    tipo: tipo,
    titulo: receita.titulo,
    colunas: receita.colunas.map(function (coluna) {
      return { chave: coluna.chave, titulo: coluna.titulo };
    }),
    // Com cabeçalho reconhecido, dizer isso na tela evita a dúvida mais comum
    // de todas: "ele contou o meu cabeçalho como corretora?".
    tinhaCabecalho: lido.tinhaCabecalho,
    linhas: resultado.slice(0, RECC_LINHAS_NA_CONFERENCIA),
    naoMostradas: Math.max(0, resultado.length - RECC_LINHAS_NA_CONFERENCIA),
    resumo: {
      total: resultado.length,
      novas: contarSituacao_(resultado, 'nova'),
      atualizadas: contarSituacao_(resultado, 'atualiza'),
      iguais: contarSituacao_(resultado, 'igual'),
      recusadas: contarSituacao_(resultado, 'recusada')
    },
    // A lista completa fica aqui para `aplicarImportacao` usar. A tela recebe
    // só as primeiras — e nem precisaria delas, já que quem grava é o servidor.
    todas: resultado
  };
}

/** A coluna que decide se a linha é nova ou é atualização. */
function colunaChaveDaImportacao_(receita) {
  return receita.colunas.filter(function (coluna) {
    return coluna.chave === receita.chave;
  })[0];
}

function contarSituacao_(linhas, situacao) {
  return linhas.filter(function (linha) {
    return linha.situacao === situacao;
  }).length;
}

/**
 * O veredito de uma linha só.
 *
 * `vistas` guarda as chaves que já apareceram NESTE texto: duas linhas com a
 * mesma SUSEP no mesmo arquivo colado são um erro de quem montou o arquivo, e
 * gravar as duas deixaria o cadastro com a duplicidade que a tela de cadastro
 * recusa uma a uma.
 */
function conferirUmaLinha_(linha, receita, existentes, vistas) {
  var campos = {};
  var problemas = [];

  receita.colunas.forEach(function (coluna) {
    var bruto = linha.valores[coluna.chave];
    var valor = coluna.tipo === 'identificador'
      ? converterParaIdentificador_(bruto)
      : String(bruto === undefined ? '' : bruto).trim();

    if (!valor && coluna.padrao) valor = coluna.padrao;
    if (!valor && coluna.obrigatoria) {
      problemas.push(coluna.tipo === 'identificador' && String(bruto || '').trim()
        ? coluna.titulo + ' sem nenhum dígito ("' + bruto + '")'
        : coluna.titulo + ' em branco');
    }
    campos[coluna.chave] = valor;
  });

  var chave = campos[receita.chave];

  if (problemas.length) {
    return { numero: linha.numero, campos: campos, situacao: 'recusada',
      porque: problemas.join('; ') };
  }
  if (vistas[chave]) {
    return { numero: linha.numero, campos: campos, situacao: 'recusada',
      porque: 'repetida — a linha ' + vistas[chave] + ' já trouxe esta '
        + colunaChaveDaImportacao_(receita).titulo };
  }
  vistas[chave] = linha.numero;

  var atual = existentes[chave];
  if (!atual) {
    return { numero: linha.numero, campos: campos, situacao: 'nova', porque: '' };
  }

  var mudancas = mudancasDaLinha_(campos, atual, receita);
  if (!mudancas.length) {
    return { numero: linha.numero, campos: campos, situacao: 'igual',
      porque: 'já está assim no cadastro', id: atual.__id };
  }
  return { numero: linha.numero, campos: campos, situacao: 'atualiza',
    porque: mudancas.join('; '), id: atual.__id };
}

/**
 * O que muda de fato entre a linha colada e a que já está no cadastro.
 *
 * Campo vazio no arquivo NÃO apaga o que existe. Quem cola só SUSEP e
 * Segmento para reclassificar um lote não quer perder o canal cadastrado —
 * e descobrir isso depois de gravar não tem desfazer.
 */
function mudancasDaLinha_(campos, atual, receita) {
  var mudancas = [];
  receita.colunas.forEach(function (coluna) {
    var novo = campos[coluna.chave];
    if (!novo) return;
    var velho = coluna.tipo === 'identificador'
      ? converterParaIdentificador_(atual[coluna.coluna])
      : String(atual[coluna.coluna] === undefined ? '' : atual[coluna.coluna]).trim();
    if (novo === velho) return;
    mudancas.push(coluna.titulo + ': "' + velho + '" → "' + novo + '"');
  });
  return mudancas;
}

// ============================================================================
// AS DUAS FUNÇÕES QUE A TELA CHAMA
// ============================================================================

/** Passo 2: o que vai acontecer. Não grava nada. */
function conferirImportacao(tipo, texto) {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');

  var conferido = conferirImportacao_(tipo, texto);
  delete conferido.todas;   // a tela não precisa da lista inteira
  return conferido;
}

/**
 * Passo 3: grava.
 *
 * Pede a senha de administrador. Não é excesso de zelo: é a única ação do
 * sistema que escreve em centenas de linhas com um clique, e o critério para
 * pedir senha sempre foi o alcance, nunca a dificuldade.
 */
function aplicarImportacao(tipo, texto) {
  var quem = exigirPermissao_(RECC_ACOES.CONFIGURAR);
  exigirTela_('tabelaCorretoras');
  exigirSenhaDeAdministrador_();

  var receita = RECC_IMPORTACOES[tipo];
  var conferido = conferirImportacao_(tipo, texto);

  var paraCriar = [];
  var criadas = 0;
  var atualizadas = 0;

  conferido.todas.forEach(function (linha) {
    if (linha.situacao === 'nova') {
      paraCriar.push(camposParaAAba_(linha.campos, receita, true));
    } else if (linha.situacao === 'atualiza') {
      atualizarRegistro_(receita.aba, linha.id,
        camposParaAAba_(linha.campos, receita, false));
      atualizadas++;
    }
  });

  if (paraCriar.length) {
    criadas = inserirVariosRegistros_(receita.aba, paraCriar).length;
  }

  registrarAuditoria_('importacao.aplicar', receita.aba, '',
    receita.titulo + ': ' + criadas + ' criadas, ' + atualizadas + ' atualizadas, '
    + conferido.resumo.recusadas + ' recusadas');

  return {
    titulo: receita.titulo,
    criadas: criadas,
    atualizadas: atualizadas,
    iguais: conferido.resumo.iguais,
    recusadas: conferido.resumo.recusadas,
    por: quem.usuario.Nome
  };
}

/**
 * Traduz os campos da importação para os nomes de coluna da aba.
 *
 * Numa atualização, campo vazio é OMITIDO — não vai como texto vazio. É o que
 * faz a regra do "vazio não apaga" valer também na hora de escrever, e não só
 * na hora de conferir.
 */
function camposParaAAba_(campos, receita, ehNova) {
  var linha = {};
  receita.colunas.forEach(function (coluna) {
    var valor = campos[coluna.chave];
    if (!valor && !ehNova) return;
    linha[coluna.coluna] = valor || '';
  });

  // As colunas que a importação não pergunta, mas a aba espera.
  if (ehNova && receita.aba === 'CANAIS' && !linha.Nome) {
    linha.Nome = campos.corretora || '';
  }
  if (ehNova && receita.aba === 'SUSEP_BLOQUEADAS') {
    linha.BloqueadaEm = new Date();
  }
  return linha;
}
