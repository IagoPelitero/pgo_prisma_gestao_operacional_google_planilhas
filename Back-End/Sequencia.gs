/**
 * ============================================================================
 * RECC — Sequencia.gs · o gerador de Id
 * ============================================================================
 * O Id do RECC é DECIMAL, PROGRESSIVO, de 10 CASAS, começando em 0000000000.
 * Dez casas dão dez bilhões de combinações.
 *
 * Três regras, e cada uma existe por causa de um estrago real no sistema
 * anterior:
 *
 *   1. A sequência mora em Script Properties, NUNCA na planilha.
 *      A planilha é editável à mão; um contador dentro dela seria zerado sem
 *      querer numa tarde qualquer.
 *
 *   2. A sequência NUNCA anda para trás.
 *      Quando o Sheets deformava um Id, o gerador não o reconhecia, rebaixava
 *      o piso da aba e voltava a emitir Id já em uso. Aqui o piso é sempre
 *      max(último guardado, maior Id encontrado na aba).
 *
 *   3. Toda emissão acontece dentro de uma trava.
 *      Sem isso, dois usuários salvando no mesmo segundo recebem o mesmo Id.
 *      Quem chama (Planilha.gs) já segura a trava.
 * ============================================================================
 */

const RECC_PREFIXO_DA_SEQUENCIA = 'RECC_SEQ_';

/** 42 vira "0000000042". */
function formatarIdentificador_(numero) {
  var texto = String(Math.floor(numero));
  while (texto.length < 10) texto = '0' + texto;
  return texto;
}

/**
 * O maior Id já presente na aba, como número. -1 quando a aba está vazia.
 * Ids deformados (texto que não é dígito) são ignorados de propósito: eles
 * não podem rebaixar nem levantar o piso.
 */
function maiorIdentificadorDaAba_(nomeDaAba) {
  var estrutura = estruturaDaAba_(nomeDaAba);
  var iId = posicaoDaColuna_(estrutura, 'Id');
  if (iId < 0) return -1;

  var totalDados = quantidadeDeRegistros_(estrutura);
  if (totalDados <= 0) return -1;

  var coluna = estrutura.aba.getRange(2, iId + 1, totalDados, 1).getValues();
  var maior = -1;
  for (var i = 0; i < coluna.length; i++) {
    var digitos = converterParaIdentificador_(coluna[i][0]);
    if (!digitos) continue;
    var n = Number(digitos);
    if (isFinite(n) && n > maior) maior = n;
  }
  return maior;
}

/**
 * RESERVA UM BLOCO de Ids de uma vez, e devolve todos.
 *
 * DEVE ser chamada dentro de uma trava — inserirVariosRegistros_ já segura a
 * dela.
 *
 * POR QUE EM BLOCO, E NÃO UM POR VEZ. Esta função é a única do sistema que
 * fala com o PropertiesService durante uma gravação, e cada ida lá custa
 * dezenas de milissegundos no Apps Script. Emitindo um Id por vez, gravar
 * cinco mil casos eram DEZ MIL idas — dois minutos só de pedágio, dentro de
 * uma execução que tem seis. Reservando o bloco inteiro são DUAS: uma leitura
 * e uma gravação, para cinco mil linhas ou para uma.
 *
 * O bloco é reservado ANTES de qualquer linha ser escrita na planilha, e a
 * sequência já sai gravada no fim dele. Se a gravação estourar no meio, os
 * Ids reservados se perdem — e é o que tem de acontecer: a sequência nunca
 * anda para trás, mesmo que isso deixe buracos. Buraco na numeração não
 * quebra nada; Id reemitido quebra tudo, e foi o que aconteceu no PGO 5.x.
 */
function proximosIdentificadores_(nomeDaAba, quantos) {
  if (quantos <= 0) return [];

  var props = PropertiesService.getScriptProperties();
  var chave = RECC_PREFIXO_DA_SEQUENCIA + nomeDaAba;
  var guardado = props.getProperty(chave);

  var ultimo;
  if (guardado === null) {
    // Primeira emissão desta aba nesta instalação: alinha com o que já existe
    // na planilha, para nunca reemitir um Id que já está gravado.
    ultimo = maiorIdentificadorDaAba_(nomeDaAba);
  } else {
    ultimo = Number(guardado);
    if (!isFinite(ultimo)) ultimo = maiorIdentificadorDaAba_(nomeDaAba);
  }

  var ultimoDoBloco = ultimo + quantos;
  if (ultimoDoBloco > RECC_MAIOR_IDENTIFICADOR) {
    throw new Error('A sequência da aba "' + nomeDaAba + '" chegou ao teto de 10 ' +
      'casas decimais (' + RECC_MAIOR_IDENTIFICADOR + ').');
  }

  props.setProperty(chave, String(ultimoDoBloco));

  var bloco = [];
  for (var i = 1; i <= quantos; i++) bloco.push(formatarIdentificador_(ultimo + i));
  return bloco;
}

/** Um Id só. É o bloco de tamanho um — não existe segunda regra. */
function proximoIdentificador_(nomeDaAba) {
  return proximosIdentificadores_(nomeDaAba, 1)[0];
}

/**
 * Realinha a sequência com a planilha, sem nunca baixá-la.
 * Chamada depois de uma carga feita direto na planilha.
 */
function realinharSequencia_(nomeDaAba) {
  var props = PropertiesService.getScriptProperties();
  var chave = RECC_PREFIXO_DA_SEQUENCIA + nomeDaAba;
  var guardado = Number(props.getProperty(chave));
  if (!isFinite(guardado)) guardado = -1;

  var naAba = maiorIdentificadorDaAba_(nomeDaAba);
  var piso = Math.max(guardado, naAba);
  props.setProperty(chave, String(piso));
  return { aba: nomeDaAba, guardado: guardado, naAba: naAba, piso: piso };
}

/**
 * NORMALIZAR BASE — carimba Id em linha que entrou direto na planilha.
 *
 * Quem digita uma linha à mão não gera Id. Sem Id não há relacionamento, e
 * a atualização por Id não acha o registro. Esta rotina percorre a aba, dá
 * Id a quem está sem, e realinha a sequência.
 *
 * Só lê e escreve a coluna de Id: não toca em mais nada da linha.
 */
function normalizarIdentificadoresDaAba_(nomeDaAba) {
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(30000)) {
    throw new Error('A planilha está ocupada. Tente de novo.');
  }
  try {
    esquecerEstruturaLida_(nomeDaAba);
    var estrutura = estruturaDaAba_(nomeDaAba, true);
    var iId = posicaoDaColuna_(estrutura, 'Id');
    if (iId < 0) {
      throw new Error('A aba "' + nomeDaAba + '" não tem coluna Id.');
    }

    var totalDados = quantidadeDeRegistros_(estrutura);
    if (totalDados <= 0) {
      return { aba: nomeDaAba, carimbados: 0, repetidos: [], total: 0 };
    }

    realinharSequencia_(nomeDaAba);

    // Lê a aba inteira, e não só a coluna de Id: uma linha sem Id só se
    // distingue de uma linha em branco olhando as outras colunas.
    var bloco = estrutura.aba
      .getRange(2, 1, totalDados, estrutura.cabecalhos.length)
      .getValues();

    var faixa = estrutura.aba.getRange(2, iId + 1, totalDados, 1);
    var coluna = faixa.getValues();
    var vistos = {};
    var repetidos = [];
    var carimbados = 0;

    for (var i = 0; i < coluna.length; i++) {
      var atual = converterParaIdentificador_(coluna[i][0]);
      if (!atual) {
        if (linhaEstaVazia_(bloco[i])) continue;   // linha em branco não ganha Id
        coluna[i][0] = proximoIdentificador_(nomeDaAba);
        carimbados++;
        continue;
      }
      var normalizado = formatarIdentificador_(Number(atual));
      if (vistos[normalizado]) {
        repetidos.push({ linha: i + 2, id: normalizado });
      } else {
        vistos[normalizado] = true;
      }
      coluna[i][0] = normalizado;
    }

    // Texto ANTES do valor: é o que impede 0000000010 de virar 10.
    faixa.setNumberFormat('@');
    faixa.setValues(coluna);

    return {
      aba: nomeDaAba,
      total: totalDados,
      carimbados: carimbados,
      repetidos: repetidos
    };
  } finally {
    trava.releaseLock();
  }
}
