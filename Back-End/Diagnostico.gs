/**
 * RECC — Diagnostico.gs · o laudo que roda DENTRO do Apps Script
 * ============================================================================
 * A suíte de testes prova que o código está certo. Ela não prova que ESTA
 * instalação está certa: a planilha é editável à mão, e o que a suíte conferiu
 * numa planilha de mentira pode não valer na de verdade seis meses depois.
 *
 * Este arquivo é a outra metade. Ele roda na instalação real e responde uma
 * pergunta só: **este sistema, aqui, agora, está inteiro?**
 *
 * Duas portas:
 *
 *   diagnosticoRECC()       no editor do Apps Script, sem abrir o sistema.
 *                           Escreve o laudo no log e devolve o objeto.
 *   diagnosticoDoSistema()  pela tela, em Configurações › Estrutura.
 *
 * Existe ainda `verificarEstruturaRECC()`, no Instalador: ela confere SÓ a
 * estrutura das abas, em dois segundos, e é a que se roda logo depois de
 * copiar os arquivos. As duas leem o mesmo `conferirEstrutura_` — não há duas
 * versões da regra, há uma conferência curta e uma completa.
 *
 * ---------------------------------------------------------------------------
 * A REGRA QUE MANDA NESTE ARQUIVO
 * ---------------------------------------------------------------------------
 * **Bloco que não consegue rodar é FALHA, nunca "pulado".**
 *
 * Está escrito nas armadilhas herdadas do PGO 5.x, e custou caro lá: o
 * diagnóstico antigo, quando um arquivo faltava, pulava o bloco que dependia
 * dele — e terminava aprovando o build. Um verificador que aprova o que não
 * conseguiu verificar é pior que verificador nenhum: ele dá confiança sem
 * base.
 *
 * Por isso `rodarBloco_` embrulha cada bloco: qualquer erro dentro dele vira
 * um item de falha, com o erro escrito. Nunca some.
 *
 * ---------------------------------------------------------------------------
 * TRÊS SITUAÇÕES, E O QUE CADA UMA QUER DIZER
 * ---------------------------------------------------------------------------
 *   ok       está como deveria.
 *   atencao  funciona, mas alguém precisa olhar. Coluna a mais na planilha,
 *            campo obrigatório desligado. Nada quebra hoje.
 *   falha    alguma coisa vai dar errado, ou já está dando. Aba faltando,
 *            Id repetido, mesa apontando para coluna que não existe.
 * ============================================================================
 */

var RECC_SITUACOES_DO_LAUDO = { OK: 'ok', ATENCAO: 'atencao', FALHA: 'falha' };

/**
 * Quantas linhas de exemplo o laudo cita quando encontra muitas iguais.
 * Listar duzentos Ids repetidos não ajuda ninguém a arrumar o primeiro.
 */
var RECC_EXEMPLOS_NO_LAUDO = 5;

// ============================================================================
// AS DUAS PORTAS
// ============================================================================

/**
 * Para rodar no editor do Apps Script, direto, sem abrir o sistema.
 *
 * É a porta que importa quando o sistema NÃO abre: se `doGet` está quebrado,
 * a tela não serve para diagnosticar nada. Esta função não exige permissão
 * nem senha, e não precisa: quem consegue abrir o editor do Apps Script já
 * tem acesso a tudo, e negar aqui só atrapalharia quem foi consertar.
 */
function diagnosticoRECC() {
  var laudo = rodarDiagnostico_();
  Logger.log(laudoEmTexto_(laudo));
  return laudo;
}

/** A mesma coisa, pedida pela tela de Configurações. */
function diagnosticoDoSistema() {
  exigirPermissao_(RECC_ACOES.CONFIGURAR);
  var laudo = rodarDiagnostico_();
  registrarAuditoria_('diagnostico.rodar', '', '',
    laudo.resumo.falhas + ' falha(s), ' + laudo.resumo.atencoes + ' atenção(ões)');
  return laudo;
}

// ============================================================================
// O LAUDO
// ============================================================================

function rodarDiagnostico_() {
  var blocos = [
    rodarBloco_('ambiente', 'O ambiente', blocoDoAmbiente_),
    rodarBloco_('estrutura', 'A estrutura da planilha', blocoDaEstrutura_),
    rodarBloco_('sequencias', 'As sequências de Id', blocoDasSequencias_),
    rodarBloco_('identificadores', 'Os identificadores gravados', blocoDosIds_),
    rodarBloco_('mesas', 'As mesas', blocoDasMesas_),
    rodarBloco_('campos', 'Os campos do formulário', blocoDosCampos_),
    rodarBloco_('paineis', 'Os cards e os gráficos', blocoDosPaineis_),
    rodarBloco_('analises', 'As análises', blocoDasAnalises_),
    rodarBloco_('acesso', 'Quem entra e o que pode', blocoDoAcesso_),
    rodarBloco_('tela', 'A ligação entre a tela e o servidor', blocoDaTela_)
  ];

  var resumo = { total: 0, oks: 0, atencoes: 0, falhas: 0 };
  blocos.forEach(function (bloco) {
    bloco.itens.forEach(function (item) {
      resumo.total++;
      if (item.situacao === RECC_SITUACOES_DO_LAUDO.FALHA) resumo.falhas++;
      else if (item.situacao === RECC_SITUACOES_DO_LAUDO.ATENCAO) resumo.atencoes++;
      else resumo.oks++;
    });
    bloco.situacao = piorSituacao_(bloco.itens);
  });

  return {
    quando: Utilities.formatDate(new Date(), RECC_FUSO_HORARIO,
      'dd/MM/yyyy HH:mm'),
    aprovado: resumo.falhas === 0,
    resumo: resumo,
    blocos: blocos
  };
}

/**
 * Roda um bloco e garante que ele apareça no laudo aconteça o que acontecer.
 *
 * É AQUI que mora a regra do arquivo. Um bloco que estoura — porque a aba de
 * que ele depende sumiu, porque uma função dele foi renomeada — vira uma
 * falha com o erro escrito, e não um bloco ausente. Bloco ausente passa
 * despercebido; falha escrita, não.
 */
function rodarBloco_(chave, titulo, funcao) {
  try {
    var itens = funcao();
    if (!itens || !itens.length) {
      // Bloco que não produziu item nenhum também é suspeito: ou não rodou,
      // ou não tem o que conferir — e nos dois casos alguém precisa olhar.
      return { chave: chave, titulo: titulo, itens: [item_(
        RECC_SITUACOES_DO_LAUDO.FALHA, 'O bloco não conferiu nada',
        'A verificação rodou e não devolveu nenhum item.',
        'É defeito do próprio diagnóstico. Veja a função do bloco "'
          + chave + '" em Diagnostico.gs.')] };
    }
    return { chave: chave, titulo: titulo, itens: itens };
  } catch (erro) {
    return { chave: chave, titulo: titulo, itens: [item_(
      RECC_SITUACOES_DO_LAUDO.FALHA, 'A verificação não conseguiu rodar',
      erro.message,
      'Este bloco não foi conferido. Um verificador que aprova o que não '
        + 'conseguiu verificar dá confiança sem base — por isso isto conta '
        + 'como falha, e não como bloco pulado.')] };
  }
}

function item_(situacao, oQue, detalhe, comoArrumar) {
  return {
    situacao: situacao,
    oQue: oQue,
    detalhe: detalhe || '',
    comoArrumar: comoArrumar || ''
  };
}

function piorSituacao_(itens) {
  var pior = RECC_SITUACOES_DO_LAUDO.OK;
  itens.forEach(function (item) {
    if (item.situacao === RECC_SITUACOES_DO_LAUDO.FALHA) {
      pior = RECC_SITUACOES_DO_LAUDO.FALHA;
    } else if (item.situacao === RECC_SITUACOES_DO_LAUDO.ATENCAO
      && pior !== RECC_SITUACOES_DO_LAUDO.FALHA) {
      pior = RECC_SITUACOES_DO_LAUDO.ATENCAO;
    }
  });
  return pior;
}

/** 'a, b, c e mais 12' — para não despejar duzentos exemplos no laudo. */
function algunsExemplos_(lista) {
  var mostrados = lista.slice(0, RECC_EXEMPLOS_NO_LAUDO).join(', ');
  var sobram = lista.length - RECC_EXEMPLOS_NO_LAUDO;
  return sobram > 0 ? mostrados + ' e mais ' + sobram : mostrados;
}

// ============================================================================
// OS BLOCOS
// ============================================================================

function blocoDoAmbiente_() {
  var itens = [];
  var planilha = planilhaAtiva_();

  var fuso = planilha.getSpreadsheetTimeZone();
  itens.push(fuso === RECC_FUSO_HORARIO
    ? item_(RECC_SITUACOES_DO_LAUDO.OK, 'O fuso da planilha é ' + fuso)
    : item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'A planilha está em outro fuso',
      'A planilha diz "' + fuso + '" e o sistema conta o dia em "'
        + RECC_FUSO_HORARIO + '".',
      'Arquivo › Configurações da planilha › Fuso horário. Enquanto estiver '
        + 'diferente, um caso registrado depois das 21 h cai no dia seguinte.'));

  // O teto de 10 milhões de células é o único limite duro da plataforma, e o
  // único que não avisa antes: a planilha simplesmente para de aceitar linha
  // nova. Ver a porcentagem subindo é o que dá tempo de planejar a segunda
  // planilha em vez de descobrir numa terça-feira de manhã.
  var orcamento = orcamentoDeCelulas_(planilha);
  itens.push(orcamento.percentual < 80
    ? item_(RECC_SITUACOES_DO_LAUDO.OK,
      'Células: ' + orcamento.percentual + '% do teto da planilha',
      orcamento.usadas.toLocaleString('pt-BR') + ' de '
        + RECC_TETO_DE_CELULAS.toLocaleString('pt-BR') + '.')
    : item_(orcamento.percentual < 95
      ? RECC_SITUACOES_DO_LAUDO.ATENCAO : RECC_SITUACOES_DO_LAUDO.FALHA,
      'Células: ' + orcamento.percentual + '% do teto da planilha',
      orcamento.usadas.toLocaleString('pt-BR') + ' de '
        + RECC_TETO_DE_CELULAS.toLocaleString('pt-BR')
        + '. No teto, a planilha para de aceitar linha nova.',
      'Apague as abas ANALISE_* que ninguém usa mais — elas são as maiores e '
        + 'a próxima geração as refaz. Se não bastar, é hora de mover o '
        + 'histórico antigo para uma planilha de arquivo e apontá-la como '
        + 'planilha legada.'));

  itens.push(existeSenhaDeAdministrador_()
    ? item_(RECC_SITUACOES_DO_LAUDO.OK, 'A senha de administrador está definida')
    : item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
      'Não há senha de administrador',
      'As ações sem desfazer — criar coluna, importar em lote, regerar uma '
        + 'aba de análise — estão travadas.',
      'Configurações › Identidade › Senha de administrador.'));

  return itens;
}

function blocoDaEstrutura_() {
  var itens = [];
  var laudo = conferirEstrutura_();

  laudo.abas.forEach(function (aba) {
    if (!aba.existe) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        'A aba ' + aba.aba + ' não existe',
        'Ela faz parte do contrato e o sistema conta com ela.',
        'Rode instalarRECC() de novo: ela cria o que falta e não mexe no que '
          + 'já está lá.'));
      return;
    }
    if (aba.faltando.length) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        aba.aba + ': ' + aba.faltando.length + ' coluna(s) do contrato faltando',
        algunsExemplos_(aba.faltando),
        'Acrescente a coluna com o cabeçalho exato. O vínculo é pelo NOME do '
          + 'cabeçalho, nunca pela posição — então a ordem não importa.'));
      return;
    }
    if (aba.aMais.length) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
        aba.aba + ': ' + aba.aMais.length + ' coluna(s) fora do contrato',
        algunsExemplos_(aba.aMais),
        'Nada quebra: o sistema ignora o que não conhece. Mas coluna que o '
          + 'sistema não preenche fica vazia para sempre — se ela deveria '
          + 'existir, cadastre em Configurações › Campos.'));
      return;
    }
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      aba.aba + ' está no contrato', aba.linhas + ' linha(s)'));
  });

  return itens;
}

/**
 * A sequência nunca pode estar ABAIXO do maior Id gravado.
 *
 * Foi exatamente isto que reemitiu Id em uso no PGO 5.x: a sequência
 * rebaixada devolvia números que já estavam na planilha, e duas linhas
 * diferentes passavam a responder pelo mesmo identificador.
 */
function blocoDasSequencias_() {
  var itens = [];
  var props = PropertiesService.getScriptProperties();

  nomesDasAbasDoContrato_().forEach(function (nomeDaAba) {
    var esquema = esquemaDaAba_(nomeDaAba);
    var temId = esquema.colunas.filter(function (coluna) {
      return coluna.cabecalho === 'Id';
    }).length > 0;
    if (!temId) return;

    var guardado = props.getProperty(RECC_PREFIXO_DA_SEQUENCIA + nomeDaAba);
    var naAba = maiorIdentificadorDaAba_(nomeDaAba);

    if (guardado === null) {
      itens.push(naAba < 0
        ? item_(RECC_SITUACOES_DO_LAUDO.OK,
          nomeDaAba + ': sequência ainda não usada', 'A aba está vazia.')
        : item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
          nomeDaAba + ': a aba tem Ids e a sequência não foi criada',
          'Maior Id na aba: ' + formatarIdentificador_(naAba) + '.',
          'A primeira gravação se alinha sozinha com a planilha. Se quiser '
            + 'alinhar agora, use "Normalizar base".'));
      return;
    }

    var numero = Number(guardado);
    if (!isFinite(numero)) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        nomeDaAba + ': a sequência está com lixo',
        'Valor guardado: "' + guardado + '".',
        'Use "Normalizar base" nesta aba: ela realinha sem nunca baixar o piso.'));
      return;
    }
    if (numero < naAba) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        nomeDaAba + ': a sequência está ABAIXO do maior Id gravado',
        'Sequência em ' + numero + ', maior Id na aba '
          + formatarIdentificador_(naAba) + '. A próxima gravação vai reemitir '
          + 'um Id que já existe.',
        'Use "Normalizar base" nesta aba, antes de gravar qualquer coisa.'));
      return;
    }
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      nomeDaAba + ': sequência em ' + formatarIdentificador_(numero)));
  });

  return itens;
}

/**
 * Id repetido e Id em célula de formato Geral.
 *
 * As duas metades da armadilha mais cara do PGO 5.x: o Sheets converteu
 * `00000010` em `10` porque a célula era Geral, e daí saíram 4.328 colisões
 * em 200 mil registros. Uma confere a causa, a outra confere o efeito.
 */
function blocoDosIds_() {
  var itens = [];

  nomesDasAbasDoContrato_().forEach(function (nomeDaAba) {
    var estrutura = estruturaDaAba_(nomeDaAba);
    var iId = posicaoDaColuna_(estrutura, 'Id');
    if (iId < 0) return;

    var quantas = quantidadeDeRegistros_(estrutura);
    if (quantas <= 0) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK, nomeDaAba + ': aba vazia'));
      return;
    }

    var faixa = estrutura.aba.getRange(2, iId + 1, quantas, 1);
    var valores = faixa.getValues();
    var formatos = faixa.getNumberFormats();

    var vistos = {};
    var repetidos = [];
    var semId = 0;
    var geral = 0;

    for (var i = 0; i < valores.length; i++) {
      if (formatos[i][0] !== '@') geral++;

      var id = converterParaIdentificador_(valores[i][0]);
      if (!id) { semId++; continue; }
      if (vistos[id]) {
        repetidos.push(id + ' (linhas ' + vistos[id] + ' e ' + (i + 2) + ')');
      } else {
        vistos[id] = i + 2;
      }
    }

    if (geral) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        nomeDaAba + ': ' + geral + ' célula(s) de Id fora do formato texto',
        'Em formato Geral o Sheets lê "0000000010" como o número 10, e os '
          + 'zeros da frente somem. Foi assim que o sistema anterior colidiu '
          + '4.328 Ids.',
        'Selecione a coluna Id e aplique Formatar › Número › Texto simples. '
          + 'Depois confira se algum Id perdeu os zeros.'));
    }

    if (repetidos.length) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        nomeDaAba + ': ' + repetidos.length + ' Id(s) repetido(s)',
        algunsExemplos_(repetidos),
        'Duas linhas com o mesmo Id fazem a edição achar a errada. Corrija na '
          + 'planilha dando um Id novo, acima do maior já usado, à segunda.'));
    }

    if (semId) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
        nomeDaAba + ': ' + semId + ' linha(s) sem Id',
        'Linha digitada direto na planilha nasce sem Id, e sem Id o sistema '
          + 'não consegue editá-la nem ocultá-la.',
        'Use "Normalizar base" nesta aba: ela carimba Id em quem está sem, e '
          + 'não toca em mais nada da linha.'));
    }

    if (!geral && !repetidos.length && !semId) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
        nomeDaAba + ': ' + quantas + ' Id(s), todos únicos e em texto'));
    }
  });

  return itens;
}

/** Toda coluna que uma mesa declara precisa existir na aba dela. */
function blocoDasMesas_() {
  var itens = [];
  var mesas = lerRegistros_('MESAS');

  if (!mesas.length) {
    return [item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Não há nenhuma mesa cadastrada',
      'Sem mesa, o Dashboard, o cadastro e a busca não têm onde procurar.',
      'Rode instalarRECC() ou cadastre em Configurações › Mesas.')];
  }

  var ativas = 0;

  mesas.forEach(function (linha) {
    var nome = String(linha.Nome || linha.Id);
    var ligada = normalizarParaComparar_(linha.Ativo) === 'sim';
    if (ligada) ativas++;

    var nomeDaAba = String(linha.Aba || '');
    if (!planilhaAtiva_().getSheetByName(nomeDaAba)) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        'A mesa "' + nome + '" aponta para uma aba que não existe',
        'Aba declarada: "' + nomeDaAba + '".',
        'Ou a aba foi renomeada na planilha, ou o nome está errado em MESAS. '
          + 'Os dois se resolvem acertando a coluna Aba.'));
      return;
    }

    var estrutura = estruturaDaAba_(nomeDaAba);
    var problemas = [];

    [['ColunaDaData', 'coluna da data'],
     ['ColunaDaHora', 'coluna da hora'],
     ['ColunaDoStatus', 'coluna da situação'],
     ['ColunaDaFinalizacao', 'coluna da finalização'],
     ['ColunaDaAreaResponsavel', 'coluna da área responsável']
    ].forEach(function (par) {
      var cabecalho = String(linha[par[0]] || '').trim();
      if (!cabecalho) return;
      if (posicaoDaColuna_(estrutura, cabecalho) < 0) {
        problemas.push(par[1] + ' "' + cabecalho + '"');
      }
    });

    colunasCitadas_(linha.ColunasDaFila).concat(
      colunasCitadas_(linha.ColunasDaBusca)
    ).forEach(function (cabecalho) {
      if (posicaoDaColuna_(estrutura, cabecalho) < 0) {
        problemas.push('"' + cabecalho + '"');
      }
    });

    if (problemas.length) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        'A mesa "' + nome + '" cita coluna que a aba não tem',
        algunsExemplos_(problemas),
        'Acerte em Configurações › Mesas, ou acrescente a coluna em '
          + nomeDaAba + '. A aba tem: ' + estrutura.cabecalhos.join(', ') + '.'));
      return;
    }

    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      'A mesa "' + nome + '" está coerente com ' + nomeDaAba
        + (ligada ? '' : ' (desligada)')));
  });

  if (!ativas) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Nenhuma mesa está ligada',
      'Existem ' + mesas.length + ' mesa(s) cadastrada(s), e todas desligadas.',
      'Ligue pelo menos uma em Configurações › Mesas. Sem mesa ligada o '
        + 'Dashboard abre vazio.'));
  }

  return itens;
}

/**
 * As colunas citadas num texto de configuração, seja ele plano ou em grupos.
 *
 * ColunasDaFila aceita as duas escritas: "a,b,c" e "Grupo: a,b; Outro: c".
 * Ler só uma delas faria o diagnóstico acusar coluna inexistente numa mesa
 * perfeitamente configurada.
 */
function colunasCitadas_(texto) {
  var declarado = String(texto || '');
  if (!declarado.trim()) return [];

  var pedacos = declarado.indexOf(':') < 0
    ? declarado.split(',')
    : declarado.split(';').map(function (grupo) {
      var corte = grupo.indexOf(':');
      return corte < 0 ? grupo : grupo.substring(corte + 1);
    }).join(',').split(',');

  return pedacos
    .map(function (um) { return um.trim(); })
    .filter(function (um) { return um.length > 0; });
}

function blocoDosCampos_() {
  var itens = [];
  var campos = lerRegistros_('CAMPOS');

  if (!campos.length) {
    return [item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Não há nenhum campo cadastrado',
      'O formulário é montado a partir de CAMPOS. Sem linha nenhuma, o '
        + 'cadastro abre vazio.',
      'Rode instalarRECC(): ele gera os campos a partir do contrato das bases.')];
  }

  var semColuna = [];
  var obrigatoriosDesligados = [];
  var porAba = {};

  campos.forEach(function (campo) {
    var nomeDaAba = String(campo.Aba || '');
    var cabecalho = String(campo.Cabecalho || '');
    if (!nomeDaAba || !cabecalho) return;

    if (!porAba[nomeDaAba]) {
      porAba[nomeDaAba] = planilhaAtiva_().getSheetByName(nomeDaAba)
        ? estruturaDaAba_(nomeDaAba) : null;
    }
    var estrutura = porAba[nomeDaAba];

    if (!estrutura || posicaoDaColuna_(estrutura, cabecalho) < 0) {
      semColuna.push(String(campo.Rotulo || cabecalho) + ' → '
        + nomeDaAba + '.' + cabecalho);
      return;
    }
    if (normalizarParaComparar_(campo.Obrigatorio) === 'sim'
      && normalizarParaComparar_(campo.Ativo) !== 'sim') {
      obrigatoriosDesligados.push(String(campo.Rotulo || cabecalho));
    }
  });

  if (semColuna.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      semColuna.length + ' campo(s) apontam para coluna que não existe',
      algunsExemplos_(semColuna),
      'Cadastrar um caso com um desses campos preenchidos vai estourar. '
        + 'Desligue o campo em Configurações › Campos, ou acrescente a coluna.'));
  }

  if (obrigatoriosDesligados.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
      obrigatoriosDesligados.length + ' campo(s) obrigatório(s) estão desligados',
      algunsExemplos_(obrigatoriosDesligados),
      'Desligado, o campo não aparece no formulário — e a obrigatoriedade '
        + 'deixa de valer. Se ele é mesmo obrigatório, ligue; se não é, tire '
        + 'a marca de obrigatório, para o cadastro não mentir.'));
  }

  if (!semColuna.length && !obrigatoriosDesligados.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      'Os ' + campos.length + ' campos apontam para colunas que existem'));
  }

  return itens;
}

function blocoDosPaineis_() {
  var itens = [];
  var componentes = lerRegistros_('PAINEIS');

  if (!componentes.length) {
    return [item_(RECC_SITUACOES_DO_LAUDO.ATENCAO,
      'Não há nenhum card nem gráfico cadastrado',
      'O Dashboard abre só com a fila, e o Painel Analítico abre vazio.',
      'Monte em Configurações › Painéis.')];
  }

  var mesasPorId = {};
  lerRegistros_('MESAS').forEach(function (mesa) {
    mesasPorId[converterParaIdentificador_(mesa.Id)] = mesa;
  });

  var semMesa = [];
  var semColuna = [];

  componentes.forEach(function (componente) {
    var titulo = String(componente.Titulo || componente.Id);
    var mesa = mesasPorId[converterParaIdentificador_(componente.MesaId)];
    if (!mesa) {
      semMesa.push(titulo);
      return;
    }

    // Cartão do Dashboard não cita coluna: a dimensão dele é uma regra de
    // contagem ('total', 'situacao', 'naCelula'), e não um cabeçalho.
    if (normalizarParaComparar_(componente.TipoWidget) === 'cartao') return;

    var estrutura = estruturaDaAba_(String(mesa.Aba || ''));
    [componente.CampoDimensao, componente.CampoMedida].forEach(function (bruto) {
      var cabecalho = String(bruto || '').trim();
      if (!cabecalho) return;
      if (posicaoDaColuna_(estrutura, cabecalho) < 0) {
        semColuna.push(titulo + ' → "' + cabecalho + '"');
      }
    });
  });

  if (semMesa.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      semMesa.length + ' componente(s) apontam para mesa que não existe',
      algunsExemplos_(semMesa),
      'Eles não aparecem em tela nenhuma. Acerte a mesa ou remova em '
        + 'Configurações › Painéis.'));
  }
  if (semColuna.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      semColuna.length + ' gráfico(s) apontam para coluna que não existe',
      algunsExemplos_(semColuna),
      'O gráfico abre vazio, sem dizer por quê. Acerte em Configurações › '
        + 'Painéis › Gráficos.'));
  }
  if (!semMesa.length && !semColuna.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      'Os ' + componentes.length + ' componentes apontam para mesas e colunas '
        + 'que existem'));
  }

  return itens;
}

function blocoDasAnalises_() {
  var receitas = lerRegistros_('ANALISES');
  if (!receitas.length) {
    return [item_(RECC_SITUACOES_DO_LAUDO.OK, 'Nenhuma análise montada')];
  }

  var itens = [];
  var mesasPorId = {};
  lerRegistros_('MESAS').forEach(function (mesa) {
    mesasPorId[converterParaIdentificador_(mesa.Id)] = mesa;
  });

  receitas.forEach(function (receita) {
    var nome = String(receita.Nome || receita.Id);
    var mesa = mesasPorId[converterParaIdentificador_(receita.MesaId)];

    if (!mesa) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        'A análise "' + nome + '" aponta para mesa que não existe',
        'Gerar esta análise vai estourar.',
        'Acerte a mesa em Configurações › Análises, ou tire a análise da lista.'));
      return;
    }

    var estrutura = estruturaDaAba_(String(mesa.Aba || ''));
    var perdidas = colunasCitadas_(receita.Colunas).filter(function (cabecalho) {
      return posicaoDaColuna_(estrutura, cabecalho) < 0;
    });

    if (perdidas.length) {
      itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
        'A análise "' + nome + '" cita coluna que a mesa não tem',
        algunsExemplos_(perdidas),
        'A coluna sai vazia na aba gerada. Acerte em Configurações › Análises.'));
      return;
    }

    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      'A análise "' + nome + '" está coerente'
        + (receita.GeradaEm ? '' : ' (nunca gerada)')));
  });

  return itens;
}

/**
 * O sistema precisa continuar tendo dono.
 *
 * "Deixar a instalação sem nenhum administrador" está na lista do que o
 * sistema nunca faz — e o jeito mais fácil de acontecer é aos poucos: alguém
 * desativa um usuário, alguém tira uma permissão, e um dia não sobra ninguém
 * que consiga abrir Configurações para desfazer.
 */
function blocoDoAcesso_() {
  var itens = [];
  var usuarios = lerRegistros_('USUARIOS');
  var niveisPorId = {};

  lerRegistros_('CATALOGO').forEach(function (linha) {
    if (normalizarParaComparar_(linha.Tipo) === 'nivelacesso') {
      niveisPorId[converterParaIdentificador_(linha.Id)] = linha;
    }
  });

  var semNivel = [];
  var comDefeito = [];
  var quantosConfiguram = 0;

  usuarios.forEach(function (usuario) {
    if (normalizarParaComparar_(usuario.Ativo) !== 'sim') return;
    var nivel = niveisPorId[converterParaIdentificador_(usuario.NivelAcessoId)];
    if (!nivel) {
      semNivel.push(String(usuario.Email || usuario.Nome));
      return;
    }
    if (normalizarParaComparar_(nivel.Ativo) !== 'sim') return;

    var permissoes = lerPermissoesDoNivel_(nivel);
    if (permissoes.defeito) {
      comDefeito.push(String(nivel.Nome) + ': ' + permissoes.defeito);
      return;
    }
    if (permissoes.acoes.indexOf(RECC_ACOES.CONFIGURAR) >= 0
      && permissoes.telas.indexOf('configuracoes') >= 0) {
      quantosConfiguram++;
    }
  });

  if (comDefeito.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      comDefeito.length + ' nível(is) com a configuração quebrada',
      algunsExemplos_(comDefeito),
      'Quem estiver nesses níveis abre o sistema com o menu vazio. A coluna '
        + 'Configuracao, em CATALOGO, precisa ser um JSON válido — o mais '
        + 'seguro é reeditar o nível por Configurações › Níveis de acesso.'));
  }

  if (semNivel.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      semNivel.length + ' usuário(s) ativo(s) com nível que não existe',
      algunsExemplos_(semNivel),
      'Essas pessoas caem na tela de acesso negado, dizendo que o nível '
        + 'sumiu. Escolha um nível para cada uma em Configurações › Usuários.'));
  }

  itens.push(quantosConfiguram > 0
    ? item_(RECC_SITUACOES_DO_LAUDO.OK,
      quantosConfiguram + ' pessoa(s) conseguem abrir Configurações')
    : item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Ninguém consegue mais abrir Configurações',
      'Nenhum usuário ativo tem, ao mesmo tempo, a permissão de configurar e '
        + 'a tela de Configurações no menu.',
      'Só dá para sair disto pela planilha: em CATALOGO, ache o nível de '
        + 'acesso da pessoa e devolva "configurar" às ações e "configuracoes" '
        + 'às telas, dentro da coluna Configuracao.'));

  var ativos = usuarios.filter(function (usuario) {
    return normalizarParaComparar_(usuario.Ativo) === 'sim';
  }).length;
  itens.push(ativos > 0
    ? item_(RECC_SITUACOES_DO_LAUDO.OK, ativos + ' usuário(s) ativo(s)')
    : item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Não há nenhum usuário ativo',
      'Ninguém entra no sistema.',
      'Cadastre pela planilha, na aba USUARIOS, ou rode instalarRECC(), que '
        + 'cadastra quem executou como administrador.'));

  return itens;
}

/**
 * A ligação entre a tela e o servidor — o "build" desta etapa.
 *
 * A tela chama o servidor pelo NOME da função, em texto. Renomear uma função
 * no servidor não quebra nada na hora: quebra quando alguém clica no botão,
 * semanas depois, e a mensagem que aparece é a do Apps Script, que não diz
 * qual função faltou. Este bloco encontra isso antes.
 */
function blocoDaTela_() {
  var itens = [];
  var telas = telasIncluidasNoIndex_();

  if (!telas.length) {
    return [item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Não consegui ler as inclusões do Index.html',
      'Sem isso não dá para conferir a ligação com o servidor.',
      'Veja se Index.html existe e se as inclusões estão escritas como '
        + "incluir('NomeDaTela').")];
  }

  var chamadas = {};
  var naoLidas = arquivosDeTelaQueFaltam_();

  telas.forEach(function (nomeDaTela) {
    if (naoLidas.indexOf(nomeDaTela) >= 0) return;
    var fonte = HtmlService.createTemplateFromFile(nomeDaTela).getRawContent();
    var achados = fonte.match(/Servidor\.chamar\('([A-Za-z0-9_]+)'/g) || [];
    achados.forEach(function (achado) {
      var nome = achado.replace("Servidor.chamar('", '').replace("'", '');
      if (!chamadas[nome]) chamadas[nome] = [];
      if (chamadas[nome].indexOf(nomeDaTela) < 0) chamadas[nome].push(nomeDaTela);
    });
  });

  if (naoLidas.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      naoLidas.length + ' arquivo(s) de tela incluídos e ausentes',
      naoLidas.join(', '),
      'O Index.html inclui esses arquivos e eles não estão no projeto: a '
        + 'página não carrega, e o Apps Script só diz o nome do primeiro. '
        + 'Copie Front-End/<Nome>.html do repositório para cá, criando cada '
        + 'um como arquivo HTML com o nome exato — sem ".html", sem acento e '
        + 'com as maiúsculas iguais.'));
  }

  var faltando = [];
  Object.keys(chamadas).forEach(function (nome) {
    if (typeof globalThis[nome] !== 'function') {
      faltando.push(nome + ' (usada em ' + chamadas[nome].join(', ') + ')');
    }
  });

  if (faltando.length) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      faltando.length + ' função(ões) que a tela chama não existem no servidor',
      algunsExemplos_(faltando),
      'O botão que chama uma dessas falha no clique, com a mensagem do Apps '
        + 'Script — que não diz qual função faltou. Ou a função foi renomeada '
        + 'no servidor e a tela não acompanhou, ou o arquivo .gs dela não '
        + 'está no projeto.'));
  } else {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.OK,
      'As ' + Object.keys(chamadas).length + ' funções que a tela chama existem '
        + 'no servidor'));
  }

  // O menu promete telas; o roteador é quem as monta. Item de menu sem rota
  // leva a uma tela em branco, e em branco ninguém sabe se é erro ou é vazio.
  var roteador = '';
  try {
    roteador = HtmlService.createTemplateFromFile('Aplicacao').getRawContent();
  } catch (erro) {
    roteador = '';
  }

  if (!roteador) {
    itens.push(item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      'Não consegui ler o roteador (Aplicacao.html)',
      'Sem ele nenhuma tela é montada.',
      'Confira se o arquivo está no projeto.'));
    return itens;
  }

  var semRota = RECC_TELAS_DO_SISTEMA.filter(function (tela) {
    return roteador.indexOf(tela.tela + ':') < 0;
  }).map(function (tela) { return tela.titulo; });

  itens.push(semRota.length
    ? item_(RECC_SITUACOES_DO_LAUDO.FALHA,
      semRota.length + ' tela(s) do menu não têm rota no roteador',
      algunsExemplos_(semRota),
      'Clicar no item do menu abre uma tela em branco. A rota se declara em '
        + 'Aplicacao.html, no mapa de telas.')
    : item_(RECC_SITUACOES_DO_LAUDO.OK,
      'As ' + RECC_TELAS_DO_SISTEMA.length + ' telas do menu têm rota'));

  return itens;
}

/**
 * Os arquivos de tela que o Index manda incluir e que NÃO estão no projeto.
 *
 * Mora aqui, e não no Principal, porque é a mesma conferência que o bloco da
 * tela faz — e duas versões dela acabariam discordando. É usada por três
 * lugares: o bloco do diagnóstico, o recado de erro do `incluir_` e a
 * conferência rápida do Instalador.
 */
function arquivosDeTelaQueFaltam_() {
  return telasIncluidasNoIndex_().filter(function (nome) {
    return !existeArquivoDeTela_(nome);
  });
}

/** O arquivo HTML existe no projeto do Apps Script? */
function existeArquivoDeTela_(nome) {
  try {
    HtmlService.createTemplateFromFile(nome).getRawContent();
    return true;
  } catch (erro) {
    return false;
  }
}

/** Os nomes das telas que o Index.html manda incluir. */
function telasIncluidasNoIndex_() {
  var fonte;
  try {
    fonte = HtmlService.createTemplateFromFile('Index').getRawContent();
  } catch (erro) {
    return [];
  }
  var achados = fonte.match(/incluir\('([A-Za-z0-9_]+)'\)/g) || [];
  var nomes = [];
  achados.forEach(function (achado) {
    var nome = achado.replace("incluir('", '').replace("')", '');
    if (nomes.indexOf(nome) < 0) nomes.push(nome);
  });
  return nomes;
}

// ============================================================================
// O LAUDO EM TEXTO, PARA O LOG DO EDITOR
// ============================================================================

/**
 * O mesmo laudo, escrito para caber no log do Apps Script.
 *
 * Quem roda `diagnosticoRECC()` no editor não tem tela: tem o log. Um objeto
 * JSON de trezentas linhas ali é ilegível, e ilegível é o mesmo que ausente.
 */
function laudoEmTexto_(laudo) {
  var marcas = { ok: '  . ', atencao: '  ! ', falha: '  X ' };
  var linhas = [];

  linhas.push('');
  linhas.push('DIAGNOSTICO DO RECC — ' + laudo.quando);
  linhas.push(laudo.aprovado
    ? 'APROVADO — nenhuma falha'
    : 'REPROVADO — ' + laudo.resumo.falhas + ' falha(s)');
  linhas.push(laudo.resumo.total + ' verificações · '
    + laudo.resumo.oks + ' ok · '
    + laudo.resumo.atencoes + ' atenção · '
    + laudo.resumo.falhas + ' falha');
  linhas.push('');

  laudo.blocos.forEach(function (bloco) {
    linhas.push('[' + String(bloco.situacao).toUpperCase() + '] ' + bloco.titulo);
    bloco.itens.forEach(function (item) {
      linhas.push((marcas[item.situacao] || '  ? ') + item.oQue);
      if (item.detalhe) linhas.push('        ' + item.detalhe);
      if (item.comoArrumar && item.situacao !== RECC_SITUACOES_DO_LAUDO.OK) {
        linhas.push('        → ' + item.comoArrumar);
      }
    });
    linhas.push('');
  });

  return linhas.join('\n');
}
