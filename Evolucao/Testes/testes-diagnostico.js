/**
 * ============================================================================
 * PGO — testes-diagnostico.js · a Etapa 12
 * ============================================================================
 * Um diagnóstico só vale pelo que ele PEGA. Provar que ele aprova uma
 * instalação boa é o teste fácil e o menos útil: um verificador que sempre
 * responde "aprovado" também passaria nele.
 *
 * Por isso quase todo teste daqui QUEBRA alguma coisa de propósito, numa
 * planilha nova, e cobra a falha correspondente. Cada um deles é uma
 * armadilha real — a maioria custou caro no PGO 5.x.
 *
 * O teste mais importante do arquivo é o do bloco que não consegue rodar. O
 * diagnóstico anterior, quando um arquivo faltava, pulava o bloco e terminava
 * aprovando o build. Verificador que aprova o que não conseguiu verificar é
 * pior que verificador nenhum.
 * ============================================================================
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario, lerPeca } =
  require('./ferramentas');

function rodarTestesDeDiagnostico() {
  console.log('\nEtapa 12 — Diagnóstico');

  /** Uma planilha nova, instalada, para cada teste que vai quebrar algo. */
  function instalacaoNova() {
    const tudo = carregar('primeiro.adm@exemplo.com');
    tudo.chamar('instalarRECC()');
    return tudo;
  }

  /** O bloco pedido, pelo nome curto dele. */
  function bloco(laudo, chave) {
    return laudo.blocos.find((um) => um.chave === chave);
  }

  /** Todos os itens de falha do laudo inteiro, em texto, para procurar neles. */
  function falhasEmTexto(laudo) {
    const texto = [];
    laudo.blocos.forEach((b) => b.itens.forEach((item) => {
      if (item.situacao === 'falha') {
        texto.push(item.oQue + ' | ' + item.detalhe + ' | ' + item.comoArrumar);
      }
    }));
    return texto.join('\n');
  }

  secao('A instalação recém-nascida');

  teste('uma instalação nova passa, com a senha de ADM como única pendência', () => {
    const { chamar } = instalacaoNova();
    const laudo = chamar('diagnosticoRECC()');

    igual(laudo.aprovado, true, 'nenhuma falha numa planilha recém-instalada');
    igual(laudo.resumo.falhas, 0);
    igual(laudo.resumo.atencoes, 1, 'só a senha de administrador');
    verdadeiro(laudo.resumo.total > 40,
      'o laudo confere muita coisa, achei ' + laudo.resumo.total);
  });

  teste('os onze blocos aparecem sempre, na mesma ordem', () => {
    const { chamar } = instalacaoNova();
    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.blocos.map((b) => b.chave).join(','),
      'ambiente,estrutura,sequencias,identificadores,canais,campos,paineis,'
      + 'analises,acesso,tela,estilos');
  });

  teste('definir a senha zera a única atenção', () => {
    const { chamar } = instalacaoNova();
    chamar('definirSenhaDeAdministrador')('segredo123', '');
    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.resumo.atencoes, 0);
    igual(laudo.aprovado, true);
  });

  teste('o laudo diz quanto do teto de células a planilha já ocupa', () => {
    // É o único limite duro da plataforma, e o único que não avisa antes: no
    // teto, a planilha simplesmente para de aceitar linha nova.
    const { chamar } = instalacaoNova();
    const item = bloco(chamar('diagnosticoRECC()'), 'ambiente').itens
      .find((u) => u.oQue.indexOf('Células') === 0);
    verdadeiro(!!item, 'o orçamento de células está no laudo');
    igual(item.situacao, 'ok', 'uma instalação nova ocupa quase nada');
    contem(item.detalhe, '10.000.000');
  });

  teste('a conferência curta e a completa concordam', () => {
    // verificarEstruturaRECC() é a de dois segundos, para logo depois de
    // copiar os arquivos. As duas leem o mesmo conferirEstrutura_ — não há
    // duas versões da regra, há uma curta e uma completa. Se elas pudessem
    // discordar, uma das duas estaria mentindo.
    const { ambiente, chamar } = instalacaoNova();
    const corretoras = ambiente.planilha.getSheetByName('CORRETORAS');
    ambiente.planilha.abas.splice(ambiente.planilha.abas.indexOf(corretoras), 1);

    contem(chamar('verificarEstruturaRECC()'), 'FALTA A ABA  CORRETORAS');
    igual(bloco(chamar('diagnosticoRECC()'), 'estrutura').situacao, 'falha');
  });

  secao('O bloco que não consegue rodar');

  teste('função que sumiu derruba o bloco — e vira FALHA, não bloco pulado', () => {
    // A armadilha herdada do PGO 5.x, escrita como teste. Lá, quando um
    // arquivo faltava, o diagnóstico pulava o bloco que dependia dele — e
    // terminava APROVANDO o build.
    //
    // Atribuir undefined, e não delete: função declarada no topo vira
    // propriedade não-configurável do global, e delete devolve false sem
    // fazer nada. O teste passaria sem provar coisa alguma.
    const { chamar } = instalacaoNova();
    chamar("globalThis['conferirEstrutura_'] = undefined");

    const laudo = chamar('diagnosticoRECC()');

    igual(laudo.blocos.length, 11, 'o bloco continua no laudo');
    const oDaEstrutura = bloco(laudo, 'estrutura');
    igual(oDaEstrutura.situacao, 'falha');
    contem(oDaEstrutura.itens[0].oQue, 'não conseguiu rodar');
    contem(oDaEstrutura.itens[0].comoArrumar, 'confiança sem base');
    igual(laudo.aprovado, false, 'e o laudo inteiro reprova');
  });

  teste('bloco que não conferiu nada também é falha', () => {
    // Um bloco que roda e devolve lista vazia é tão suspeito quanto um que
    // estoura: ou não rodou, ou não tem o que conferir.
    const { chamar } = instalacaoNova();
    chamar("globalThis['blocoDosCampos_'] = function () { return []; }");

    const laudo = chamar('diagnosticoRECC()');
    igual(bloco(laudo, 'campos').situacao, 'falha');
    contem(bloco(laudo, 'campos').itens[0].oQue, 'não conferiu nada');
  });

  teste('aba do contrato apagada é falha, e o laudo diz como voltar', () => {
    const { ambiente, chamar } = instalacaoNova();
    const corretoras = ambiente.planilha.getSheetByName('CORRETORAS');
    ambiente.planilha.abas.splice(ambiente.planilha.abas.indexOf(corretoras), 1);

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'A aba CORRETORAS não existe');
    contem(falhasEmTexto(laudo), 'instalarRECC',
      'e diz que rodar de novo cria o que falta sem mexer no resto');
  });

  secao('A estrutura da planilha');

  teste('coluna do contrato que sumiu é falha', () => {
    const { ambiente, chamar } = instalacaoNova();
    const aba = ambiente.planilha.getSheetByName('BASE_MESA');
    aba.deleteColumns(3, 1);              // some com "Status"
    chamar('esquecerEstruturaLida_')('BASE_MESA');

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'coluna(s) do contrato faltando');
    contem(falhasEmTexto(laudo), 'Status');
  });

  teste('coluna a mais é atenção, e não falha', () => {
    // Coluna que alguém acrescentou à mão não quebra nada: o sistema ignora
    // o que não conhece. Reprovar por isso ensinaria a operação a ignorar o
    // laudo inteiro.
    const { chamar } = instalacaoNova();
    const aba = chamar('planilhaAtiva_()').getSheetByName('CORRETORAS');
    aba.insertColumnsAfter(aba.getMaxColumns(), 1);
    aba.getRange(1, aba.getMaxColumns(), 1, 1).setValues([['Anotação minha']]);
    chamar('esquecerEstruturaLida_')('CORRETORAS');

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, true, 'coluna a mais não reprova a instalação');
    const oDaEstrutura = bloco(laudo, 'estrutura');
    igual(oDaEstrutura.situacao, 'atencao');
    const item = oDaEstrutura.itens.find((u) => u.situacao === 'atencao');
    contem(item.detalhe, 'Anotação minha');
  });

  secao('Os identificadores — a armadilha mais cara do PGO 5.x');

  teste('Id repetido é falha, e o laudo diz em quais linhas', () => {
    const { ambiente, chamar } = instalacaoNova();
    const aba = ambiente.planilha.getSheetByName('CANAIS');
    const primeiro = aba.getRange(2, 1, 1, 1).getValues()[0][0];
    aba.getRange(3, 1, 1, 1).setValues([[primeiro]]);

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'Id(s) repetido(s)');
    contem(falhasEmTexto(laudo), 'linhas 2 e 3');
  });

  teste('coluna de Id em formato Geral é falha', () => {
    // A causa das 4.328 colisões: em Geral, o Sheets lê "0000000010" como 10.
    const { ambiente, chamar } = instalacaoNova();
    const aba = ambiente.planilha.getSheetByName('CORRETORAS');
    chamar('inserirVariosRegistros_')('CORRETORAS', [
      { SUSEP: 'RET00J', Corretora: 'Uma', Sucursal: '12' }
    ]);
    aba.getRange(2, 1, 1, 1).setNumberFormat('0');

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'fora do formato texto');
    contem(falhasEmTexto(laudo), '4.328');
  });

  teste('linha sem Id é atenção — ela existe, só não dá para editar', () => {
    const { ambiente, chamar } = instalacaoNova();
    const aba = ambiente.planilha.getSheetByName('CORRETORAS');
    aba.getRange(2, 2, 1, 1).setValues([['Digitado na mão']]);

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, true, 'linha sem Id não é motivo para reprovar');
    const item = bloco(laudo, 'identificadores').itens
      .find((u) => u.situacao === 'atencao');
    contem(item.oQue, 'linha(s) sem Id');
    contem(item.comoArrumar, 'Normalizar base');
  });

  secao('As sequências');

  teste('sequência abaixo do maior Id gravado é falha', () => {
    // Foi assim que o sistema anterior reemitiu Id em uso.
    const { ambiente, chamar } = instalacaoNova();
    ambiente.propriedades.set('RECC_SEQ_CAMPOS', '3');

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'ABAIXO do maior Id gravado');
    contem(falhasEmTexto(laudo), 'reemitir');
  });

  teste('sequência com lixo é falha, e não zero em silêncio', () => {
    const { ambiente, chamar } = instalacaoNova();
    ambiente.propriedades.set('RECC_SEQ_CANAIS', 'sei lá');

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'está com lixo');
  });

  secao('A configuração apontando para o vazio');

  teste('canal apontando para aba que não existe é falha', () => {
    const { chamar } = instalacaoNova();
    const canal = chamar('lerRegistros_("CANAIS")')[0];
    chamar('atualizarRegistro_')('CANAIS', canal.Id, { Aba: 'BASE_QUE_NAO_TEM' });

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'aponta para uma aba que não existe');
  });

  teste('canal citando coluna que a aba não tem é falha', () => {
    const { chamar } = instalacaoNova();
    const canal = chamar('lerRegistros_("CANAIS")')[0];
    chamar('atualizarRegistro_')('CANAIS', canal.Id,
      { ColunaDoStatus: 'coluna inventada' });

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'cita coluna que a aba não tem');
    contem(falhasEmTexto(laudo), 'coluna inventada');
  });

  teste('a fila em GRUPOS é lida certo — e não acusada de coluna inventada', () => {
    // ColunasDaFila aceita duas escritas: plana e em grupos. Ler só a plana
    // faria o diagnóstico reprovar um canal perfeitamente configurada — e um
    // laudo que reclama do que está certo é um laudo que ninguém lê.
    const { chamar } = instalacaoNova();
    const laudo = chamar('diagnosticoRECC()');
    igual(bloco(laudo, 'canais').situacao, 'ok');

    const canais = chamar('lerRegistros_("CANAIS")');
    const comGrupos = canais.filter(
      (m) => String(m.ColunasDaFila).indexOf(':') >= 0);
    verdadeiro(comGrupos.length > 0,
      'pelo menos um canal de partida usa a escrita em grupos');
  });

  teste('todos os canais desligados é falha', () => {
    const { chamar } = instalacaoNova();
    chamar('lerRegistros_("CANAIS")').forEach((canal) => {
      chamar('atualizarRegistro_')('CANAIS', canal.Id, { Ativo: false });
    });

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'Nenhum canal está ligado');
  });

  teste('campo apontando para coluna que não existe é falha', () => {
    const { chamar } = instalacaoNova();
    const campo = chamar('lerRegistros_("CAMPOS")')[0];
    chamar('atualizarRegistro_')('CAMPOS', campo.Id,
      { Cabecalho: 'coluna que sumiu' });

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'apontam para coluna que não existe');
  });

  teste('gráfico apontando para um canal que não existe é falha', () => {
    const { chamar } = instalacaoNova();
    const componente = chamar('lerRegistros_("PAINEIS")')[0];
    chamar('atualizarRegistro_')('PAINEIS', componente.Id,
      { CanalId: '9999999999' });

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'apontam para um canal que não existe');
  });

  teste('análise apontando para um canal que não existe é falha', () => {
    const { chamar } = instalacaoNova();
    const receita = chamar('lerRegistros_("ANALISES")')[0];
    chamar('atualizarRegistro_')('ANALISES', receita.Id, { CanalId: '9999999999' });

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'aponta para um canal que não existe');
  });

  secao('O sistema precisa continuar tendo dono');

  teste('ninguém podendo configurar é falha, e o laudo ensina a sair', () => {
    // O jeito mais fácil de isto acontecer é aos poucos: alguém desativa um
    // usuário, alguém tira uma permissão, e um dia não sobra ninguém que
    // consiga abrir Configurações para desfazer.
    const { chamar } = instalacaoNova();
    chamar('lerRegistros_("CATALOGO")')
      .filter((linha) => String(linha.Tipo) === 'NIVEL_ACESSO')
      .forEach((nivel) => {
        chamar('atualizarRegistro_')('CATALOGO', nivel.Id,
          { Configuracao: JSON.stringify({
            escopo: 'PROPRIOS', telas: ['trabalho'], acoes: [],
            campos: {}, widgets: {} }) });
      });

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'Ninguém consegue mais abrir Configurações');
    contem(falhasEmTexto(laudo), 'CATALOGO',
      'o laudo diz como sair pela planilha, que é o único caminho que sobra');
  });

  teste('nível com configuração quebrada é falha, e não menu vazio', () => {
    const { chamar } = instalacaoNova();
    const nivel = chamar('lerRegistros_("CATALOGO")')
      .find((linha) => String(linha.Tipo) === 'NIVEL_ACESSO');
    chamar('atualizarRegistro_')('CATALOGO', nivel.Id,
      { Configuracao: '{isto não é json' });

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'configuração quebrada');
  });

  teste('usuário ativo com nível inexistente é falha', () => {
    const { chamar } = instalacaoNova();
    const usuario = chamar('lerRegistros_("USUARIOS")')[0];
    chamar('atualizarRegistro_')('USUARIOS', usuario.Id,
      { NivelAcessoId: '9999999999' });

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'nível que não existe');
  });

  secao('A ligação entre a tela e o servidor');

  teste('toda função que a tela chama existe no servidor', () => {
    const { chamar } = instalacaoNova();
    const item = bloco(chamar('diagnosticoRECC()'), 'tela').itens[0];
    igual(item.situacao, 'ok');
    contem(item.oQue, 'existem no servidor');
  });

  teste('função renomeada no servidor é pega antes do clique', () => {
    // O caso real: alguém renomeia uma função no servidor, a tela continua
    // chamando o nome velho, e nada quebra — até alguém apertar o botão,
    // semanas depois, e receber a mensagem do Apps Script, que não diz qual
    // função faltou.
    const { chamar } = instalacaoNova();
    chamar("globalThis['buscarCasos'] = undefined");

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'buscarCasos');
    contem(falhasEmTexto(laudo), 'não existem no servidor');
    contem(falhasEmTexto(laudo), 'BuscarCaso',
      'e diz em qual tela ela é usada');
  });

  teste('todas as telas do menu têm rota no roteador', () => {
    const { chamar } = instalacaoNova();
    const itens = bloco(chamar('diagnosticoRECC()'), 'tela').itens;
    const oDaRota = itens[itens.length - 1];
    igual(oDaRota.situacao, 'ok');
    contem(oDaRota.oQue, 'têm rota');
  });

  secao('Quando o painel lê só uma parte da base');

  teste('as três telas dizem que leram só uma parte, e não deixam calado', () => {
    // Achado do teste de estresse. Com muito volume, os painéis leem só as
    // últimas N linhas — e a Produtividade RECC calculava esse "truncada" e
    // NUNCA mostrava, enquanto Minha Performance nem calculava. Numa base de
    // 200 mil casos, o gráfico mostrava um pedaço e parecia o total.
    const { chamar } = instalacaoNova();
    const ret = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');

    // Uma janela minúscula, para caber no teste: o efeito é o mesmo que 5.000
    // numa base de 200 mil.
    chamar('gravarConfiguracao_')('OPERACAO.LINHAS_DO_PAINEL', '3');

    const hoje = new Date();
    const data = ('0' + hoje.getDate()).slice(-2) + '/'
      + ('0' + (hoje.getMonth() + 1)).slice(-2) + '/' + hoje.getFullYear();
    const casos = [];
    for (let i = 0; i < 8; i++) {
      casos.push({
        'data de recepção do protocolo': data,
        'analista': 'Primeiro Adm',
        'status': 'Pendente',
        'nome do cliente': 'Cliente ' + i
      });
    }
    chamar('inserirVariosRegistros_')('BASE_RET', casos);

    igual(chamar('resumoDoCanal')(ret.id, {}).truncada, true, 'Trabalho');
    igual(chamar('produtividadeDaEquipe')(ret.id, {}, 30).truncada, true,
      'Produtividade RECC');
    igual(chamar('minhaPerformance')(ret.id, 30).truncada, true,
      'Minha Performance');

    // E cada uma diz QUANTAS leu, para o aviso ser concreto em vez de vago.
    igual(chamar('produtividadeDaEquipe')(ret.id, {}, 30).linhasLidas, 3);
    igual(chamar('minhaPerformance')(ret.id, 30).linhasLidas, 3);
  });

  teste('com a base pequena, nenhuma tela avisa nada', () => {
    // Aviso que aparece sempre é aviso que ninguém lê.
    const { chamar } = instalacaoNova();
    const ret = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');
    igual(chamar('resumoDoCanal')(ret.id, {}).truncada, false);
    igual(chamar('produtividadeDaEquipe')(ret.id, {}, 30).truncada, false);
    igual(chamar('minhaPerformance')(ret.id, 30).truncada, false);
  });

  teste('as três telas mostram o aviso, e pelo mesmo texto', () => {
    // Três frases diferentes para o mesmo fato é como a operação aprende que
    // uma delas não é séria.
    const pasta = path.join(__dirname, '..', '..', 'Front-End');
    ['Trabalho.html', 'Produtividade.html', 'MinhaPerformance.html']
      .forEach((arquivo) => {
        const tela = fs.readFileSync(path.join(pasta, arquivo), 'utf8');
        verdadeiro(tela.indexOf('Moldura.avisoDeJanela(') >= 0,
          arquivo + ' não mostra o aviso de janela parcial');
      });
    const moldura = lerPeca('Moldura');
    contem(moldura, 'OPERACAO.LINHAS_DO_PAINEL',
      'o aviso diz onde aumentar a janela, e não só que o número é parcial');
  });

  teste('a janela é configurável, e o padrão continua 5.000', () => {
    const { chamar } = instalacaoNova();
    igual(chamar('linhasQueOPainelOlha_()'), 5000);
    chamar('gravarConfiguracao_')('OPERACAO.LINHAS_DO_PAINEL', '25000');
    igual(chamar('linhasQueOPainelOlha_()'), 25000);
    // Lixo na chave não pode zerar o painel: cai no padrão.
    chamar('gravarConfiguracao_')('OPERACAO.LINHAS_DO_PAINEL', 'sei lá');
    igual(chamar('linhasQueOPainelOlha_()'), 5000);
  });

  secao('O projeto do Apps Script');

  teste('nenhuma função do servidor tem o nome de outra', () => {
    /*
     * NO APPS SCRIPT TODO .gs DIVIDE UM ESCOPO GLOBAL SÓ.
     *
     * Não há módulo, não há import: os arquivos são avaliados em ordem
     * alfabética, um atrás do outro, na mesma gaveta. Duas funções com o mesmo
     * nome não dão erro nenhum — a última avaliada simplesmente APAGA a
     * primeira, e quem chamava a primeira passa a receber a segunda.
     *
     * Foi o que aconteceu ao renomear Tombamento para Importação: já existia
     * um `conferirImportacao` no Cadastros.gs (a importação de corretoras e
     * SUSEPs), e o `conferirTombamento` do Casos.gs virou o mesmo nome. Como
     * Casos.gs vem depois de Cadastros.gs no alfabeto, a importação de
     * corretoras deixou de existir — sem uma linha de erro. Os testes dela
     * quebraram com "Canal 'corretoras' não existe", uma mensagem que aponta
     * para o lugar errado.
     *
     * Esta guarda é barata e pega a classe inteira: qualquer nome repetido
     * entre os .gs, venha de renomeio, de cópia ou de duas pessoas escrevendo
     * a mesma função sem saber.
     */
    const pasta = path.join(__dirname, '..', '..', 'Back-End');
    const ondeMora = {};

    fs.readdirSync(pasta).filter((nome) => nome.endsWith('.gs')).forEach((nome) => {
      const fonte = fs.readFileSync(path.join(pasta, nome), 'utf8');
      const achados = fonte.match(/^function\s+([A-Za-z0-9_]+)/gm) || [];
      achados.forEach((linha) => {
        const funcao = linha.replace(/^function\s+/, '');
        if (!ondeMora[funcao]) ondeMora[funcao] = [];
        ondeMora[funcao].push(nome);
      });
    });

    const repetidas = Object.keys(ondeMora)
      .filter((funcao) => ondeMora[funcao].length > 1)
      .map((funcao) => funcao + ' (' + ondeMora[funcao].join(' e ') + ')');

    igual(repetidas.join(' | '), '',
      'no Apps Script a segunda definição apaga a primeira, sem avisar');
  });

  teste('nenhuma constante do servidor tem o nome de outra', () => {
    // Mesmo motivo, e pior: `const` repetido no mesmo escopo é SyntaxError no
    // V8, e o projeto inteiro para de carregar — a tela abre em branco.
    const pasta = path.join(__dirname, '..', '..', 'Back-End');
    const ondeMora = {};

    fs.readdirSync(pasta).filter((nome) => nome.endsWith('.gs')).forEach((nome) => {
      const fonte = fs.readFileSync(path.join(pasta, nome), 'utf8');
      const achados = fonte.match(/^(?:const|var|let)\s+([A-Za-z0-9_]+)/gm) || [];
      achados.forEach((linha) => {
        const nomeDela = linha.replace(/^(?:const|var|let)\s+/, '');
        if (!ondeMora[nomeDela]) ondeMora[nomeDela] = [];
        ondeMora[nomeDela].push(nome);
      });
    });

    const repetidas = Object.keys(ondeMora)
      .filter((umNome) => ondeMora[umNome].length > 1)
      .map((umNome) => umNome + ' (' + ondeMora[umNome].join(' e ') + ')');

    igual(repetidas.join(' | '), '',
      'const repetido entre .gs derruba o projeto inteiro no carregamento');
  });

  /*
   * OS DOIS MUNDOS.
   *
   * O `.gs` roda no servidor do Google; o `.html` roda no navegador de quem
   * usa. Eles não compartilham NADA além do que passa pela ponte
   * `google.script.run`, e cada um enxerga um conjunto próprio de objetos.
   *
   * Trocar um pelo outro dá um erro que só aparece em produção, porque a suíte
   * roda em Node — onde nem `document` nem `SpreadsheetApp` existem de
   * verdade, e o simulador fornece o que precisa. Os testes abaixo leem o
   * TEXTO dos arquivos, que é o único jeito de pegar isso antes de colar.
   */

  /*
   * Os nomes são procurados como PALAVRA INTEIRA, e não como pedaço de texto.
   *
   * A primeira versão procurava a substring "document" e reprovou três
   * arquivos por causa da palavra portuguesa "documento" — que é um TIPO DE
   * CAMPO do sistema, escrito em português, exatamente como o padrão da casa
   * manda. Uma guarda que reprova o código certo é pior que guarda nenhuma:
   * ensina a ignorar o vermelho.
   */
  const SO_NO_NAVEGADOR = [
    /\bdocument\b/, /\bwindow\b/, /\blocalStorage\b/, /\bsessionStorage\b/,
    /\balert\s*\(/, /\bnavigator\b/, /\bfetch\s*\(/, /\bXMLHttpRequest\b/,
    /google\.script\.run/
  ];

  const SO_NO_SERVIDOR = [
    /\bSpreadsheetApp\b/, /\bPropertiesService\b/, /\bLockService\b/,
    /\bSession\s*\./, /\bDriveApp\b/, /\bHtmlService\b/, /\bScriptApp\b/,
    /\bMailApp\b/, /\bUrlFetchApp\b/
  ];

  const SO_NO_NODE = [
    /\brequire\s*\(/, /\bmodule\.exports\b/, /\bprocess\.env\b/,
    /\b__dirname\b/, /^\s*import\s+/m, /^\s*export\s+/m
  ];

  /** O código de um arquivo, sem comentário nenhum — texto em comentário não roda. */
  function semComentarios(fonte) {
    return String(fonte)
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split('\n')
      .map((linha) => linha.replace(/(^|[^:])\/\/.*$/, '$1'))
      .join('\n');
  }

  function arquivosDe(pasta, extensao) {
    const cheio = path.join(__dirname, '..', '..', pasta);
    return fs.readdirSync(cheio)
      .filter((nome) => nome.endsWith(extensao))
      .map((nome) => ({
        nome: nome,
        fonte: semComentarios(fs.readFileSync(path.join(cheio, nome), 'utf8'))
      }));
  }

  teste('nenhum .gs usa coisa que só existe no navegador', () => {
    // `document.getElementById` num .gs é ReferenceError na primeira execução,
    // e o recado que chega à tela é "erro no servidor" — sem dizer qual.
    const achados = [];
    arquivosDe('Back-End', '.gs').forEach((arquivo) => {
      SO_NO_NAVEGADOR.forEach((proibido) => {
        if (proibido.test(arquivo.fonte)) {
          achados.push(arquivo.nome + ' usa ' + proibido.source);
        }
      });
    });
    igual(achados.join(' | '), '', 'isto roda no Google, não no navegador');
  });

  teste('nenhuma tela chama serviço do Google direto', () => {
    // `SpreadsheetApp` no .html é undefined: a tela trava sem log, porque o
    // erro acontece antes de qualquer tratamento. É o achado 27 de novo.
    const achados = [];
    arquivosDe('Front-End', '.html').forEach((arquivo) => {
      SO_NO_SERVIDOR.forEach((proibido) => {
        if (proibido.test(arquivo.fonte)) {
          achados.push(arquivo.nome + ' usa ' + proibido.source);
        }
      });
    });
    igual(achados.join(' | '), '',
      'a tela fala com o servidor pela ponte, e só por ela');
  });

  teste('nem .gs nem .html usam coisa do Node', () => {
    // A suíte roda em Node e o sistema não. Um `require` que passe despercebido
    // funciona aqui e estoura lá — o pior tipo de teste verde.
    const achados = [];
    arquivosDe('Back-End', '.gs').concat(arquivosDe('Front-End', '.html'))
      .forEach((arquivo) => {
        SO_NO_NODE.forEach((proibido) => {
          if (proibido.test(arquivo.fonte)) {
            achados.push(arquivo.nome + ' usa ' + proibido.source);
          }
        });
      });
    igual(achados.join(' | '), '', 'isto é do Node, e o Apps Script não é Node');
  });

  teste('a guarda dos dois mundos pega de verdade, e não só passa', () => {
    // Uma lista de proibidos que nunca dispara é uma lista que pode estar
    // vazia, escrita errada ou testando nada — e ela passaria verde do mesmo
    // jeito. Este teste é o que separa "não achei nada" de "não procurei".
    const fingido = 'function x() { var a = document.getElementById("z"); '
      + 'window.alert("oi"); SpreadsheetApp.getActive(); require("fs"); }';

    verdadeiro(SO_NO_NAVEGADOR.some((r) => r.test(fingido)),
      'a lista do navegador tem de pegar document e window');
    verdadeiro(SO_NO_SERVIDOR.some((r) => r.test(fingido)),
      'a lista do servidor tem de pegar SpreadsheetApp');
    verdadeiro(SO_NO_NODE.some((r) => r.test(fingido)),
      'a lista do Node tem de pegar require');

    // E o contrário: o código escrito em português não pode disparar nenhuma.
    // Foi "documento" — o tipo de campo do CPF — que reprovou três arquivos na
    // primeira versão desta guarda.
    const emPortugues = 'var tipo = "documento"; var janela = 30; '
      + 'exportarComponente(); var importado = importarCasos();';
    const disparou = []
      .concat(SO_NO_NAVEGADOR, SO_NO_SERVIDOR, SO_NO_NODE)
      .filter((r) => r.test(emPortugues))
      .map((r) => r.source);
    igual(disparou.join(' | '), '',
      'nenhuma pode confundir palavra portuguesa com objeto do navegador');
  });

  teste('toda tela abre e fecha o <script>, e o Index fecha o HTML', () => {
    // Colagem cortada no meio é o defeito mais comum de todos, e o sintoma é
    // uma tela em branco sem erro nenhum.
    const desbalanceados = [];
    arquivosDe('Front-End', '.html').forEach((arquivo) => {
      const cheio = fs.readFileSync(path.join(__dirname, '..', '..',
        'Front-End', arquivo.nome), 'utf8');
      const abre = (cheio.match(/<script(\s|>)/g) || []).length;
      const fecha = (cheio.match(/<\/script>/g) || []).length;
      if (abre !== fecha) {
        desbalanceados.push(arquivo.nome + ': ' + abre + ' <script> e '
          + fecha + ' </script>');
      }
    });
    igual(desbalanceados.join(' | '), '');
  });

  teste('todo arquivo .gs é avaliável do começo ao fim', () => {
    // O simulador já avalia todos para rodar a suíte, então um erro de sintaxe
    // derrubaria tudo antes daqui. O que este teste acrescenta é a CONTAGEM:
    // um arquivo que sumir da pasta, ou que não for copiado, aparece aqui em
    // vez de virar "função não existe" no meio de uma tela.
    const servidor = arquivosDe('Back-End', '.gs');
    igual(servidor.length, 7, 'os sete arquivos do servidor: '
      + servidor.map((a) => a.nome).join(', '));

    const telas = arquivosDe('Front-End', '.html');
    igual(telas.length, 13, 'as treze telas: ' + telas.map((a) => a.nome).join(', '));
  });

  teste('nenhum .gs tem o mesmo nome de um .html', () => {
    // No Apps Script os arquivos moram todos num projeto só, sem pasta, e o
    // nome é único INDEPENDENTE da extensão: com um Configuracoes.html já lá,
    // um Configuracoes.gs não pode ser criado. No repositório eles ficam em
    // pastas diferentes e a colisão não aparece — ela só aparece na hora de
    // colar, quando já é tarde.
    const raiz = path.join(__dirname, '..', '..');
    const semExtensao = (pasta, ext) => fs.readdirSync(path.join(raiz, pasta))
      .filter((nome) => nome.endsWith(ext))
      .map((nome) => nome.slice(0, -ext.length));

    const servidor = semExtensao('Back-End', '.gs');
    const telas = semExtensao('Front-End', '.html');
    const colidem = servidor.filter((nome) => telas.indexOf(nome) >= 0);

    igual(colidem.join(', '), '',
      'estes nomes existem nas duas pastas e o Apps Script só aceita um: '
      + colidem.join(', '));
  });

  teste('e nenhum nome se repete dentro da mesma pasta ignorando maiúsculas', () => {
    // O Apps Script diferencia maiúsculas, mas quem copia à mão não. Dois
    // arquivos que só diferem na caixa são um convite a copiar por cima.
    const raiz = path.join(__dirname, '..', '..');
    const todos = []
      .concat(fs.readdirSync(path.join(raiz, 'Back-End')))
      .concat(fs.readdirSync(path.join(raiz, 'Front-End')))
      .map((nome) => nome.replace(/\.(gs|html)$/, '').toLowerCase());

    const repetidos = todos.filter((nome, i) => todos.indexOf(nome) !== i);
    igual(repetidos.join(', '), '', 'nomes repetidos ignorando a caixa');
  });

  teste('nenhuma tela repete um id de HTML', () => {
    // Dois trechos escrevendo o mesmo id é elemento('salvar') achando o do
    // outro — o achado 21, que já custou uma vez. Aqui não é ativo (um
    // substitui o outro na tela), e a trava existe para continuar não sendo.
    const pasta = path.join(__dirname, '..', '..', 'Front-End');
    const repetidos = [];
    fs.readdirSync(pasta).filter((n) => n.endsWith('.html')).forEach((arquivo) => {
      const tela = fs.readFileSync(path.join(pasta, arquivo), 'utf8');
      const conta = {};
      (tela.match(/\bid="[a-zA-Z0-9_-]+"/g) || []).forEach((achado) => {
        conta[achado] = (conta[achado] || 0) + 1;
      });
      Object.keys(conta).forEach((id) => {
        if (conta[id] > 1) repetidos.push(arquivo + ' ' + id + ' (' + conta[id] + 'x)');
      });
    });
    igual(repetidos.join(' | '), '', 'ids repetidos dentro do mesmo arquivo');
  });

  teste('todo arquivo de tela é incluído por alguém', () => {
    // Arquivo órfão é trabalho que ninguém vê e código que ninguém mantém.
    const pasta = path.join(__dirname, '..', '..', 'Front-End');
    const index = fs.readFileSync(path.join(pasta, 'Index.html'), 'utf8');
    const incluidos = (index.match(/incluir\('([A-Za-z0-9_]+)'\)/g) || [])
      .map((m) => m.replace("incluir('", '').replace("')", ''));
    // Index e SemAcesso são servidos direto pelo doGet, sem incluir.
    const servidosDireto = ['Index', 'SemAcesso'];

    const orfaos = fs.readdirSync(pasta)
      .filter((n) => n.endsWith('.html'))
      .map((n) => n.replace('.html', ''))
      .filter((n) => incluidos.indexOf(n) < 0 && servidosDireto.indexOf(n) < 0);

    igual(orfaos.join(', '), '', 'arquivos de tela que ninguém inclui');
  });

  teste('a prévia responde por TODA função que as telas chamam', () => {
    // A prévia é o que a operação clica para acompanhar a obra. Buraco nela
    // aparece como tela quebrada, e a pessoa não tem como saber que o buraco
    // é da prévia e não do sistema. Foi assim que apareceu: trocar para o
    // editor de gráficos caía num erro que era só falta de resposta gravada.
    const raiz = path.join(__dirname, '..', '..');
    const previa = fs.readFileSync(
      path.join(raiz, 'Evolucao', 'Testes', 'gerar-previa.js'), 'utf8');

    const pasta = path.join(raiz, 'Front-End');
    const chamadas = [];
    fs.readdirSync(pasta).filter((n) => n.endsWith('.html')).forEach((arquivo) => {
      const tela = fs.readFileSync(path.join(pasta, arquivo), 'utf8');
      (tela.match(/Servidor\.chamar\('([a-zA-Z0-9_]+)'/g) || []).forEach((achado) => {
        const nome = achado.replace("Servidor.chamar('", '').replace("'", '');
        if (chamadas.indexOf(nome) < 0) chamadas.push(nome);
      });
    });

    /*
     * A conta é feita SÓ DENTRO DA PONTE, e não no arquivo inteiro.
     *
     * A primeira versão procurava o nome em qualquer lugar do gerador, e por
     * isso aprovou uma função que a ponte não respondia: o nome aparecia numa
     * linha que apenas COLETAVA o dado para a prévia (`chamar('nome')`), longe
     * da ponte. A tela abria com um recado vermelho dizendo que a função não
     * existia no servidor, e o teste continuava verde.
     *
     * Quem pegou foi a foto da tela para o README. Um teste que procura o
     * nome em qualquer lugar não prova que a ponte responde — prova que
     * alguém escreveu aquela palavra no arquivo.
     */
    const dentroDaPonte = previa.slice(
      previa.indexOf('function pontePreparada('),
      previa.indexOf('function gerar('));

    const semResposta = chamadas.filter(function (nome) {
      // Ou a ponte declara a função, ou ela está na lista das que recusam
      // gravação com uma frase. Os dois valem; nada mais vale.
      return dentroDaPonte.indexOf(nome + ': function') < 0
        && dentroDaPonte.indexOf("'" + nome + "'") < 0;
    });
    igual(semResposta.join(', '), '', 'funções que a prévia não sabe responder');
  });

  teste('todo <script> de tela compila', () => {
    // O Apps Script não avisa: ele serve a página, o script morre no
    // navegador, e a tela fica em branco.
    const pasta = path.join(__dirname, '..', '..', 'Front-End');
    const quebrados = [];
    fs.readdirSync(pasta).filter((n) => n.endsWith('.html')).forEach((arquivo) => {
      const bruto = fs.readFileSync(path.join(pasta, arquivo), 'utf8');
      (bruto.match(/<script>[\s\S]*?<\/script>/g) || []).forEach((bloco) => {
        const js = bloco.replace(/^<script>/, '').replace(/<\/script>$/, '')
          // Um scriptlet do Apps Script — <?= algo ?> ou <?!= algo ?> — não é
          // JavaScript: é um buraco que o SERVIDOR preenche antes de a página
          // existir. Aqui ele vira `null`, que é JS válido e de qualquer tipo,
          // para que o resto do bloco possa ser conferido de verdade. Pular o
          // arquivo inteiro por causa de um scriptlet deixaria o Index sem
          // nenhuma conferência — e é justamente ele que monta tudo.
          .replace(/<\?!?=?[\s\S]*?\?>/g, 'null');
        try {
          new vm.Script(js, { filename: arquivo });
        } catch (erro) {
          quebrados.push(arquivo + ': ' + erro.message);
        }
      });
    });
    igual(quebrados.join(' | '), '', 'telas com erro de sintaxe');
  });

  secao('O pacote de três arquivos');

  teste('o pacote junta tudo, e nada fica de fora', () => {
    // 35 arquivos para criar à mão no Apps Script, e basta UM ficar para trás
    // para a tela congelar num "Lendo o cadastro…" que não explica nada. Já
    // aconteceu duas vezes aqui — os achados 25 e 27.
    //
    // O pacote é gerado numa pasta DESCARTÁVEL, nunca por cima do que está
    // no repositório. Duas razões, e a segunda é a que importa: escrever num
    // arquivo versionado deixa o `git status` sujo depois de toda rodada de
    // teste, e — pior — regerar antes de conferir faria o teste examinar
    // sempre um pacote novinho. O pacote commitado poderia estar meses
    // atrasado e este teste passaria assim mesmo. É a mesma armadilha do
    // bloco que se aprova sozinho: conferir o que você acabou de fabricar
    // não é conferir nada.
    const raiz = path.join(__dirname, '..', '..');
    const destino = fs.mkdtempSync(path.join(os.tmpdir(), 'pgo-pacote-'));
    require('./gerar-pacote').gerar(destino);

    const codigo = fs.readFileSync(path.join(destino, 'Codigo.gs'), 'utf8');
    const index = fs.readFileSync(path.join(destino, 'Index.html'), 'utf8');

    // Toda função do servidor está no Codigo.gs.
    fs.readdirSync(path.join(raiz, 'Back-End'))
      .filter((n) => n.endsWith('.gs'))
      .forEach((arquivo) => {
        const fonte = fs.readFileSync(path.join(raiz, 'Back-End', arquivo), 'utf8');
        (fonte.match(/^function ([A-Za-z0-9_]+)\s*\(/gm) || []).forEach((achado) => {
          const nome = achado.replace(/^function /, '').replace(/\s*\($/, '');
          verdadeiro(codigo.indexOf('function ' + nome + '(') >= 0,
            arquivo + ': a função ' + nome + ' não entrou no pacote');
        });
      });

    // Toda tela que o Index incluía está colada dentro dele.
    const original = fs.readFileSync(path.join(raiz, 'Front-End', 'Index.html'), 'utf8');
    (original.match(/incluir\('([A-Za-z0-9_]+)'\)/g) || []).forEach((achado) => {
      const nome = achado.replace("incluir('", '').replace("')", '');
      const tela = fs.readFileSync(
        path.join(raiz, 'Front-End', nome + '.html'), 'utf8').trim();
      // Um pedaço do meio, para não casar por acaso com o comentário do nome.
      const meio = tela.substring(Math.floor(tela.length / 2),
        Math.floor(tela.length / 2) + 80);
      verdadeiro(index.indexOf(meio) >= 0, nome + ' não foi colado no Index');
    });

    // E não sobrou nenhum incluir() sem resolver.
    igual((index.match(/incluir\('/g) || []).length, 0,
      'sobrou inclusão no Index do pacote');

    // Os scriptlets de identidade FICAM: o Apps Script os avalia ao servir.
    contem(index, '<?= identidade.nome ?>');
  });

  teste('o pacote guardado no repositório ainda é o código de hoje', () => {
    // O teste acima prova que o GERADOR funciona. Este prova que o pacote
    // que está no repositório — o que alguém vai baixar e colar — foi gerado
    // depois da última mudança no código. Sem ele, o gerador poderia estar
    // perfeito e o arquivo guardado, velho: quem colasse levaria o sistema
    // de duas semanas atrás sem nenhum aviso.
    //
    // A linha "Gerado em" muda a cada geração e não diz nada sobre o
    // conteúdo, então ela sai dos dois lados antes da comparação.
    const raiz = path.join(__dirname, '..', '..');
    const guardado = path.join(raiz, 'Evolucao', 'pacote');
    if (!fs.existsSync(path.join(guardado, 'Codigo.gs'))) return;  // ainda não gerado

    const fresco = fs.mkdtempSync(path.join(os.tmpdir(), 'pgo-pacote-hoje-'));
    require('./gerar-pacote').gerar(fresco);

    function semOCarimbo(texto) {
      return texto.split('\n')
        .filter((linha) => linha.indexOf('Gerado em ') < 0)
        .join('\n');
    }

    ['Codigo.gs', 'Index.html', 'SemAcesso.html'].forEach((arquivo) => {
      const a = semOCarimbo(fs.readFileSync(path.join(guardado, arquivo), 'utf8'));
      const b = semOCarimbo(fs.readFileSync(path.join(fresco, arquivo), 'utf8'));
      verdadeiro(a === b, 'Evolucao/pacote/' + arquivo + ' está desatualizado — '
        + 'rode: node Evolucao/Testes/gerar-pacote.js');
    });
  });

  teste('o conferidor de resgate ainda conhece os arquivos de hoje', () => {
    // O Evolucao/conferir-projeto.gs é a ferramenta que se cola num projeto
    // do Apps Script que não abre: ela diz qual arquivo ficou para trás. Para
    // isso carrega um mapa "arquivo → funções que as telas chamam".
    //
    // Se esse mapa envelhecer, ela não fica quieta: ela responde com
    // confiança sobre o código de meses atrás, apontando arquivos que não
    // existem mais. Uma ferramenta de resgate que mente é pior que nenhuma,
    // porque quem a usou já parou de procurar. Por isso ela é GERADA, e este
    // teste cobra que o gerado e o guardado sejam o mesmo texto.
    const guardado = path.join(__dirname, '..', 'conferir-projeto.gs');
    const atual = require('./gerar-conferidor').montarArquivo();
    verdadeiro(fs.readFileSync(guardado, 'utf8') === atual,
      'Evolucao/conferir-projeto.gs está desatualizado — '
      + 'rode: node Evolucao/Testes/gerar-conferidor.js');
  });

  teste('a planilha de código não está mais velha que o código', () => {
    // Ela é gerada por python3 Evolucao/Testes/gerar-excel.py — a única
    // ferramenta em Python do projeto, porque openpyxl é quem sabe escrever
    // .xlsx. Como não roda na suíte, o que se confere é a DATA: uma planilha
    // desatualizada é pior que nenhuma, porque parece atual.
    const raiz = path.join(__dirname, '..', '..');
    const planilha = path.join(raiz, 'Evolucao', 'pacote',
      'PGO-codigo-completo.xlsx');
    if (!fs.existsSync(planilha)) return;   // ainda não foi gerada: tudo bem

    const quando = fs.statSync(planilha).mtimeMs;
    const maisNovos = [];
    [['Back-End', '.gs'], ['Front-End', '.html']].forEach((par) => {
      fs.readdirSync(path.join(raiz, par[0]))
        .filter((n) => n.endsWith(par[1]))
        .forEach((nome) => {
          const arquivo = path.join(raiz, par[0], nome);
          // Um segundo de tolerância: gerar tudo na mesma rodada pode deixar
          // o código carimbado um instante depois da planilha.
          if (fs.statSync(arquivo).mtimeMs > quando + 1000) maisNovos.push(nome);
        });
    });

    igual(maisNovos.join(', '), '',
      'estes mudaram depois da planilha — rode gerar-excel.py de novo');
  });

  teste('o pacote traz o passo a passo, com o aviso dos nomes', () => {
    const destino = path.join(__dirname, '..', 'pacote');
    const comoUsar = fs.readFileSync(path.join(destino, 'COMO-USAR.txt'), 'utf8');
    contem(comoUsar, 'sem extensão',
      'o erro de nomear "Index.html" em vez de "Index" é metade dos casos');
    contem(comoUsar, 'instalarRECC');
    contem(comoUsar, 'diagnosticoRECC');
  });

  secao('Quando a estilização "desconfigura"');

  teste('Estilos antigo no projeto: o laudo diz as classes que faltam', () => {
    // Relatado pela operação: "desconfigurou a estilização, o que pode ser?".
    // O sistema abre, o conteúdo está lá e a aparência não — e não há erro
    // nenhum no console, porque CSS que não existe não reclama, só não pinta.
    // É o caso mais comum de uma cópia manual: o Estilos fica para trás
    // enquanto as telas avançam.
    const { ambiente, chamar } = instalacaoNova();
    ambiente.trocarTelaPor('Estilos',
      '<style>\n.aplicacao { display: flex; }\n.lateral { width: 248px; }\n</style>');

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);

    const bloco = laudo.blocos.find((b) => b.chave === 'estilos');
    igual(bloco.situacao, 'falha');
    contem(falhasEmTexto(laudo), 'o Estilos não define');
    contem(falhasEmTexto(laudo), 'mais antigo que as telas',
      'e diz a causa provável, que é quase sempre a mesma');
  });

  teste('Estilos cortado no meio da colagem é falha', () => {
    // 70 KB colados à mão nem sempre vão inteiros. Chave aberta sem fechar
    // denuncia isso na hora.
    const { ambiente, chamar } = instalacaoNova();
    ambiente.trocarTelaPor('Estilos', '<style>\n.aplicacao { display: flex;');

    const laudo = chamar('diagnosticoRECC()');
    contem(falhasEmTexto(laudo), 'folha de estilos está incompleta');
    contem(falhasEmTexto(laudo), 'cole de novo, do começo ao fim');
  });

  teste('com o Estilos certo, o bloco passa', () => {
    const { chamar } = instalacaoNova();
    const bloco = chamar('diagnosticoRECC()').blocos
      .find((b) => b.chave === 'estilos');
    igual(bloco.situacao, 'ok');
  });

  teste('toda classe que as telas usam existe na folha — aqui e agora', () => {
    // A mesma conferência do laudo, rodando contra o repositório. Sem isto,
    // uma classe nova escrita numa tela e esquecida no Estilos passaria, e
    // só apareceria como "desconfigurado" na máquina de alguém.
    const { chamar } = instalacaoNova();
    const bloco = chamar('diagnosticoRECC()').blocos
      .find((b) => b.chave === 'estilos');
    const semEstilo = bloco.itens.find((i) => i.oQue.indexOf('classe(s)') >= 0);
    igual(semEstilo, undefined,
      'há classe usada sem estilo: ' + (semEstilo ? semEstilo.detalhe : ''));
  });

  secao('Quando a função não existe no servidor');

  teste('a ponte avisa em vez de travar a tela no "carregando"', () => {
    // O caso real, e o sintoma não tinha nada a ver com a causa: a tela ficava
    // parada em "Lendo o cadastro…" para sempre. Quando a função não existe no
    // servidor, google.script.run.nomeDela é undefined e o .apply estoura NA
    // HORA — antes de o .senao chegar a ser registrado. O erro escapava por
    // fora do caminho de falha e sobrava uma linha no console que ninguém abre.
    // Uma fila no lugar do setTimeout, esvaziada depois. Rodar na hora
    // quebraria justamente o que está sendo testado: o adiamento existe
    // porque o .senao só é registrado DEPOIS que chamar() retorna.
    const fila = [];
    const contexto = vm.createContext({
      console: { error: function () {} },
      // O ATRASO IMPORTA. A ponte marca DOIS relógios: o adiamento de zero,
      // que entrega a falha, e o de quarenta segundos, que desiste de
      // esperar. Uma fila que ignorasse o atraso dispararia a desistência na
      // hora, e o teste mediria a coisa errada.
      setTimeout: function (funcao, atraso) {
        fila.push({ funcao: funcao, atraso: atraso });
        return fila.length;
      },
      clearTimeout: function () {},
      document: { addEventListener: function () {} },
      // Um google.script.run que só conhece uma função, como o de verdade.
      google: { script: { run: {
        withSuccessHandler: function () { return this; },
        withFailureHandler: function () { return this; },
        umaQueExiste: function () {}
      } } }
    });
    const fonte = fs.readFileSync(
      path.join(__dirname, '..', '..', 'Front-End', 'Aplicacao.html'), 'utf8')
      .replace(/^<script>/, '').replace(/<\/script>\s*$/, '');
    vm.runInContext(fonte, contexto, { filename: 'Aplicacao.html' });

    let estourou = '';
    try {
      vm.runInContext(
        "Servidor.chamar('naoExisteNoServidor')"
        + ".entao(function () {}).senao(function (e) { globalThis.__r = e.message; });",
        contexto);
    } catch (erro) {
      estourou = erro.message;
    }
    igual(estourou, '', 'chamar não pode estourar na cara de quem chamou');

    const imediatos = fila.filter(function (m) { return !m.atraso; });
    igual(imediatos.length, 1,
      'a falha foi adiada, e não disparada no meio da chamada');
    imediatos.forEach(function (m) { m.funcao(); });

    const recado = vm.runInContext('globalThis.__r || ""', contexto);
    contem(recado, 'naoExisteNoServidor', 'o .senao roda, e diz qual função');
    contem(recado, 'não foi copiado', 'e diz a causa mais provável');
    contem(recado, 'diagnóstico', 'e para onde ir ver a lista inteira');
  });

  teste('a resposta que chega depois de trocar de tela é descartada', () => {
    // O Apps Script responde quando responde, e dá tempo de sobra para a
    // pessoa desistir e ir para outra tela. Quando a resposta chegava, quem
    // ia desenhá-la procurava um elemento que não existe mais e estourava
    // com "Cannot set properties of null" — um erro que não diz nada sobre
    // o que a pessoa fez.
    let responder = null;
    const contexto = vm.createContext({
      console: { error: function () {}, info: function () {} },
      // Só o adiamento de zero roda na hora; o relógio de desistência fica
      // parado, como ficaria de verdade.
      setTimeout: function (funcao, atraso) { if (!atraso) funcao(); return 1; },
      clearTimeout: function () {},
      document: { addEventListener: function () {} },
      google: { script: { run: {
        withSuccessHandler: function (f) { responder = f; return this; },
        withFailureHandler: function () { return this; },
        umaQueExiste: function () {}
      } } }
    });
    const fonte = fs.readFileSync(
      path.join(__dirname, '..', '..', 'Front-End', 'Aplicacao.html'), 'utf8')
      .replace(/^<script>/, '').replace(/<\/script>\s*$/, '');
    vm.runInContext(fonte, contexto, { filename: 'Aplicacao.html' });

    vm.runInContext(
      "globalThis.__desenhou = 0;"
      + "Servidor.chamar('umaQueExiste').entao(function () { globalThis.__desenhou++; });",
      contexto);

    responder('a resposta');
    igual(vm.runInContext('globalThis.__desenhou', contexto), 1,
      'sem troca de tela, a resposta é entregue normalmente');

    vm.runInContext(
      "Servidor.chamar('umaQueExiste').entao(function () { globalThis.__desenhou++; });",
      contexto);
    vm.runInContext('Servidor.trocouDeTela();', contexto);
    responder('a resposta atrasada');

    igual(vm.runInContext('globalThis.__desenhou', contexto), 1,
      'depois de trocar de tela, a resposta antiga não é entregue');
  });

  teste('a função que existe é chamada normalmente', () => {
    // A trava não pode ter custado o caminho feliz.
    let chamou = null;
    const contexto = vm.createContext({
      console: { error: function () {} },
      // Só o adiamento de zero roda na hora; o relógio de desistência fica
      // parado, como ficaria de verdade.
      setTimeout: function (funcao, atraso) { if (!atraso) funcao(); return 1; },
      clearTimeout: function () {},
      document: { addEventListener: function () {} },
      google: { script: { run: {
        withSuccessHandler: function () { return this; },
        withFailureHandler: function () { return this; },
        umaQueExiste: function (um, dois) { chamou = [um, dois]; }
      } } }
    });
    const fonte = fs.readFileSync(
      path.join(__dirname, '..', '..', 'Front-End', 'Aplicacao.html'), 'utf8')
      .replace(/^<script>/, '').replace(/<\/script>\s*$/, '');
    vm.runInContext(fonte, contexto, { filename: 'Aplicacao.html' });

    vm.runInContext(
      "Servidor.chamar('umaQueExiste', 'primeiro', 42).entao(function () {});",
      contexto);
    igual(JSON.stringify(chamou), '["primeiro",42]',
      'os argumentos chegam na ordem, e do jeito que saíram');
  });

  teste('cada seção de Configurações só desenha se ainda for a seção da vez', () => {
    // Trocar de TELA a ponte já resolve. Trocar de SEÇÃO dentro de
    // Configurações não: a tela continua a mesma e os elementos continuam
    // existindo, mas carregarSecao zerou o `dados` — e a resposta atrasada
    // tentava desenhar com um `dados` que não era o dela.
    const tela = fs.readFileSync(
      path.join(__dirname, '..', '..', 'Front-End', 'Configuracoes.html'), 'utf8');

    const desenhos = ['desenharCampos', 'desenharUsuarios', 'desenharNiveis',
      'desenharListas', 'desenharCanais', 'desenharGraficos', 'desenharPaineis',
      'desenharAnalises', 'desenharEstrutura'];

    const semGuarda = desenhos.filter(function (nome) {
      const inicio = tela.indexOf('function ' + nome + '() {');
      if (inicio < 0) return true;
      return tela.substring(inicio, inicio + 200).indexOf('respostaAtrasada(') < 0;
    });
    igual(semGuarda.join(', '), '',
      'funções de desenho sem a guarda da seção atrasada');
  });

  teste('quando nada volta, a tela desiste e explica em vez de esperar', () => {
    // Há falha que NÃO chega ao withFailureHandler: a execução morre do outro
    // lado, ou a resposta não atravessa a fronteira. Nada volta — nem sucesso
    // nem erro. A tela ficava no "Lendo o cadastro…" para sempre, sem uma
    // linha no console. É o pior estado possível: não funciona e não avisa.
    const marcados = [];
    const contexto = vm.createContext({
      console: { error: function () {}, info: function () {} },
      setTimeout: function (funcao, atraso) {
        marcados.push({ funcao: funcao, atraso: atraso });
        return marcados.length;
      },
      clearTimeout: function () {},
      document: { addEventListener: function () {} },
      google: { script: { run: {
        withSuccessHandler: function () { return this; },
        withFailureHandler: function () { return this; },
        // Esta nunca responde. É exatamente o caso relatado.
        umaQueSomeNoAr: function () {}
      } } }
    });
    const fonte = fs.readFileSync(
      path.join(__dirname, '..', '..', 'Front-End', 'Aplicacao.html'), 'utf8')
      .replace(/^<script>/, '').replace(/<\/script>\s*$/, '');
    vm.runInContext(fonte, contexto, { filename: 'Aplicacao.html' });

    vm.runInContext(
      "Servidor.chamar('umaQueSomeNoAr')"
      + ".entao(function () {}).senao(function (e) { globalThis.__d = e.message; });",
      contexto);

    const desistencia = marcados.find(function (m) { return m.atraso >= 10000; });
    verdadeiro(!!desistencia, 'a ponte marca um relógio de desistência');
    igual(desistencia.atraso, 40000,
      'quarenta segundos — a chamada mais cara do sistema leva nove');

    desistencia.funcao();
    const recado = vm.runInContext('globalThis.__d || ""', contexto);
    contem(recado, 'umaQueSomeNoAr', 'diz qual função não respondeu');
    contem(recado, 'não foi copiado', 'e a causa mais provável');
    contem(recado, 'diagnosticoRECC', 'e onde ver a lista do que falta');
  });

  secao('O arquivo que ficou para trás na cópia');

  teste('arquivo de tela ausente é falha, com a lista inteira', () => {
    // Caso real, relatado pela operação: um arquivo de tela ficou para trás na
    // cópia para o Apps Script, e tudo o que o sistema disse foi "nenhum
    // arquivo html com o nome X foi encontrado", com um número de linha.
    // Nenhum teste pegava isto: os testes leem a PASTA, onde o arquivo está —
    // quem não tinha o arquivo era o PROJETO.
    const { ambiente, chamar } = instalacaoNova();
    ambiente.esconderTela('Comuns');
    ambiente.esconderTela('Trabalho');

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), '2 arquivo(s) de tela incluídos e ausentes');
    contem(falhasEmTexto(laudo), 'Comuns, Trabalho',
      'a lista inteira, e não só o primeiro');
    contem(falhasEmTexto(laudo), 'sem acento',
      'e a regra de nomenclatura, que é metade dos casos');
  });

  teste('o recado do incluir diz o nome, a regra e TODOS que faltam', () => {
    // Descobrir um arquivo por vez é copiar, recarregar, descobrir o próximo,
    // quinze vezes.
    const { ambiente, chamar } = instalacaoNova();
    ambiente.esconderTela('Comuns');
    ambiente.esconderTela('Trabalho');
    ambiente.esconderTela('Configuracoes');

    const recado = chamar('recadoDoArquivoQueFalta_')('Comuns');
    contem(recado, 'Falta o arquivo HTML "Comuns"');
    contem(recado, 'Front-End/Comuns.html');
    contem(recado, 'sem acento');
    contem(recado, 'No total faltam 3 arquivos');
    contem(recado, 'Trabalho');
    contem(recado, 'Configuracoes');
  });

  teste('abrir o sistema sem o arquivo estoura com o recado, não com o do Apps Script', () => {
    const { ambiente, chamar } = instalacaoNova();
    ambiente.esconderTela('Comuns');
    lanca(() => chamar('doGet()'), 'Falta o arquivo HTML "Comuns"');
  });

  teste('a conferência rápida também pega o arquivo que ficou para trás', () => {
    // É o que o README promete dela: "diz em segundos se algum arquivo ficou
    // para trás na cópia". Antes deste caso ela só olhava as abas.
    const { ambiente, chamar } = instalacaoNova();
    ambiente.esconderTela('Comuns');

    const texto = chamar('verificarEstruturaRECC()');
    contem(texto, 'ESTRUTURA INCOMPLETA');
    contem(texto, 'FALTAM 1 ARQUIVO(S) DE TELA');
    contem(texto, 'copie Front-End/Comuns.html');
    contem(texto, 'diagnosticoRECC', 'e aponta para a conferência completa');
  });

  teste('com tudo copiado, a conferência rápida diz que está tudo aqui', () => {
    const { chamar } = instalacaoNova();
    const texto = chamar('verificarEstruturaRECC()');
    contem(texto, 'ESTRUTURA OK');
    contem(texto, 'os arquivos de tela do Index estão todos aqui');
  });

  secao('A migração de quem já tem o PGO instalado');

  /**
   * Finge uma instalação feita ANTES de mesa virar canal.
   *
   * Desfaz na planilha o que a migração vai refazer: as abas voltam a se
   * chamar MESAS e CANAIS (esta guardando corretoras), a coluna volta a
   * MesaId, as colunas novas somem e as sequências voltam para as chaves
   * antigas. É mais fiel que montar uma planilha à mão, porque parte de uma
   * instalação de verdade.
   */
  function comoEraAntesDosCanais() {
    const tudo = instalacaoNova();
    const planilha = tudo.ambiente.planilha;

    // As colunas novas saem de cena.
    [['CORRETORAS', 'Consultor'], ['CATALOGO', 'ColunaDeCarimbo'],
     ['BASE_RET', 'nome de quem transferiu']].forEach(([nome, coluna]) => {
      const aba = planilha.getSheetByName(nome);
      const cabecalhos = aba.getRange(1, 1, 1, aba.getMaxColumns()).getValues()[0];
      const i = cabecalhos.findIndex((c) => String(c) === coluna);
      if (i >= 0) aba.getRange(1, i + 1).setValue('');
    });

    // CanalId volta a ser MesaId.
    ['USUARIOS', 'CAMPOS', 'PAINEIS', 'ANALISES', 'CATALOGO'].forEach((nome) => {
      const aba = planilha.getSheetByName(nome);
      const cabecalhos = aba.getRange(1, 1, 1, aba.getMaxColumns()).getValues()[0];
      const i = cabecalhos.findIndex((c) => String(c) === 'CanalId');
      if (i >= 0) aba.getRange(1, i + 1).setValue('MesaId');
    });

    // As abas voltam aos nomes antigos, na ordem inversa da migração.
    planilha.getSheetByName('CORRETORAS').setName('CANAIS_CORRETORAS_TEMP');
    planilha.getSheetByName('CANAIS').setName('MESAS');
    planilha.getSheetByName('CANAIS_CORRETORAS_TEMP').setName('CANAIS');

    // E as sequências voltam para as chaves antigas.
    const props = tudo.ambiente.propriedades;
    const mover = (de, para) => {
      if (props.has('RECC_SEQ_' + de)) {
        props.set('RECC_SEQ_' + para, props.get('RECC_SEQ_' + de));
        props.delete('RECC_SEQ_' + de);
      }
    };
    mover('CANAIS', 'MESAS');
    mover('CORRETORAS', 'CANAIS');

    tudo.chamar('esquecerEstruturaLida_()');
    return tudo;
  }

  teste('sem migrar, o sistema abre sem canal nenhum', () => {
    // O sintoma que a operação veria: o Trabalho vazio, sem erro nenhum.
    // Este teste existe para provar que a migração é NECESSÁRIA — sem ele,
    // ninguém saberia dizer se ela resolve algo.
    const { chamar } = comoEraAntesDosCanais();
    igual(chamar('canaisVisiveis_()').length, 0,
      'a aba CANAIS antiga guarda corretoras, não canais');
  });

  teste('migrar devolve os canais sem perder dado', () => {
    const { ambiente, chamar } = comoEraAntesDosCanais();

    // Dado de verdade na planilha antiga.
    chamar('inserirRegistro_')('CANAIS', { SUSEP: 'RET00J',
      Corretora: 'Corretora ABC', Segmento: 'Diamante' });
    chamar('inserirRegistro_')('BASE_RET', { analista: 'Ana',
      'nome do cliente': 'Cliente Antigo' });

    chamar('migrarParaCanais()');

    const canais = chamar('canaisVisiveis_()');
    // Contra o ESQUEMA, e não contra um 2: a migração tem de devolver todas as
    // bases que o contrato declara, sejam duas ou dez.
    const basesDoContrato = Object.keys(chamar('RECC_ESQUEMA'))
      .filter((aba) => aba.indexOf('BASE_') === 0);
    igual(canais.length, basesDoContrato.length,
      'todos os canais do contrato voltaram');
    igual(canais.map((c) => c.aba).join(','), basesDoContrato.join(','),
      'e na ordem em que o contrato as declara');

    igual(chamar('lerRegistros_')('BASE_RET')[0]['nome do cliente'],
      'Cliente Antigo', 'o caso antigo continua lá');
    igual(chamar('lerRegistros_')('CORRETORAS')[0].SUSEP, 'RET00J',
      'a corretora mudou de aba, não sumiu');
    igual(chamar('consultarSusep')('RET00J').situacao, 'OK',
      'e o selo volta a achá-la');
  });

  teste('migrar leva a SEQUÊNCIA de Id junto com a aba', () => {
    // A armadilha mais cara do PGO 5.x, e a menos óbvia desta migração: a
    // sequência mora sob RECC_SEQ_<ABA>. Renomear a aba sem levar a chave
    // faria a contagem recomeçar do zero e REEMITIR um Id já gravado.
    const { ambiente, chamar } = comoEraAntesDosCanais();
    chamar('migrarParaCanais()');

    verdadeiro(ambiente.propriedades.has('RECC_SEQ_CANAIS'),
      'a sequência dos canais tem de existir sob o nome novo');
    verdadeiro(!ambiente.propriedades.has('RECC_SEQ_MESAS'),
      'e a chave antiga não pode ficar para trás');

    const laudo = chamar('diagnosticoRECC()');
    igual(falhasEmTexto(laudo).indexOf('ABAIXO do maior Id'), -1,
      'nenhuma sequência pode ficar abaixo do maior Id gravado');
  });

  teste('a migração aprova no diagnóstico', () => {
    const { chamar } = comoEraAntesDosCanais();
    chamar('migrarParaCanais()');
    igual(chamar('diagnosticoRECC()').aprovado, true,
      falhasEmTexto(chamar('diagnosticoRECC()')));
  });

  /** Quantas bases de caso o contrato declara. Nunca um número escrito. */
  function quantasBasesOContratoTem(chamar) {
    return Object.keys(chamar('RECC_ESQUEMA'))
      .filter((aba) => aba.indexOf('BASE_') === 0).length;
  }

  teste('rodar a migração duas vezes não estraga nada', () => {
    // Ninguém tem certeza se já rodou. Uma migração que só funciona uma vez
    // obriga a lembrar — e quem não lembra, roda de novo.
    const { chamar } = comoEraAntesDosCanais();
    chamar('migrarParaCanais()');
    const recado = chamar('migrarParaCanais()');

    contem(recado, 'JÁ ESTAVA ASSIM', 'a segunda vez não faz nada');
    igual(chamar('canaisVisiveis_()').length, quantasBasesOContratoTem(chamar),
      'e os canais continuam de pé');
    igual(chamar('diagnosticoRECC()').aprovado, true);
  });

  teste('numa instalação nova, migrar não faz nada', () => {
    const { chamar } = instalacaoNova();
    chamar('migrarParaCanais()');
    igual(chamar('canaisVisiveis_()').length, quantasBasesOContratoTem(chamar));
    igual(chamar('diagnosticoRECC()').aprovado, true);
  });


  secao('A atualização de quem já tem dado');

  /**
   * Finge uma instalação feita ANTES desta rodada.
   *
   * Desfaz na planilha o que `atualizarPGO()` vai refazer: as duas colunas
   * novas de CANAIS somem, os status voltam aos nomes antigos (com o
   * "Concluído" na RET, sem Cancelado, Pago e Sem retorno, sem a coluna Final
   * e sem o "Sem sucesso"), os campos de proposta e apólice voltam a ser um
   * por coluna, e a planilha ganha de volta a coluna Matrícula e a aba
   * FERIADOS, que saíram do contrato.
   *
   * Parte de uma instalação DE VERDADE e desfaz, em vez de montar uma planilha
   * à mão: a planilha montada à mão prova que a migração funciona sobre a
   * planilha que eu imaginei, e não sobre a que existe.
   */
  function comoEraAntesDestaRodada() {
    const tudo = instalacaoNova();
    const planilha = tudo.ambiente.planilha;
    const chamar = tudo.chamar;

    // 1. as duas colunas novas de CANAIS somem.
    const canais = planilha.getSheetByName('CANAIS');
    const cabecalhos = canais.getRange(1, 1, 1, canais.getMaxColumns()).getValues()[0];
    ['ColunaDoValor', 'SituacoesDestacadas'].forEach((coluna) => {
      const i = cabecalhos.findIndex((c) => String(c) === coluna);
      if (i >= 0) canais.getRange(1, i + 1).setValue('');
    });
    chamar('esquecerEstruturaLida_()');

    // 2. os status como eram: os nomes antigos, o "Concluído" na RET, sem
    //    Cancelado, Pago e Sem retorno, sem a coluna Final — e, de uma rodada
    //    ainda mais antiga, sem o "Sem sucesso".
    const ret = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    const mesa = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
    const doCanal = (item, canal) => String(item.CanalId) === String(canal.id);
    chamar('lerRegistros_("CATALOGO")').forEach((item) => {
      if (String(item.Tipo) !== 'STATUS') return;
      const nome = String(item.Nome);
      const voltaPara = (doCanal(item, ret) && { 'Não retido': 'Não reteve',
        'Retido': 'Reteve' }[nome])
        || (doCanal(item, mesa) && { 'Concluído na mesa': 'Concluído na célula' }[nome]);
      if (voltaPara) {
        chamar('atualizarRegistro_')('CATALOGO', item.Id, { Nome: voltaPara, Rotulo: voltaPara });
      }
      const naoExistia = (doCanal(item, ret)
        && ['Cancelado', 'Pago', 'Sem sucesso de contato'].indexOf(nome) >= 0)
        || (doCanal(item, mesa) && nome === 'Sem retorno');
      if (naoExistia) chamar('apagarRegistroDeVez_')('CATALOGO', item.Id);
    });
    chamar('inserirRegistro_')('CATALOGO', chamar('novoItemDeCatalogo_')(
      'STATUS', ret.id, 'Concluído', 8, 'bom', 'Data concluído'));
    chamar('lerRegistros_("PAINEIS")').forEach((painel) => {
      const antigo = { 'Retido': 'Reteve', 'Não retido': 'Não reteve',
        'Concluído na mesa': 'Concluído na célula',
        'Concluídos na mesa': 'Concluídos na célula' };
      const mudanca = {};
      if (antigo[String(painel.Filtro)]) mudanca.Filtro = antigo[String(painel.Filtro)];
      if (antigo[String(painel.Titulo)]) mudanca.Titulo = antigo[String(painel.Titulo)];
      if (Object.keys(mudanca).length) chamar('atualizarRegistro_')('PAINEIS', painel.Id, mudanca);
    });
    const catalogo = planilha.getSheetByName('CATALOGO');
    const deCatalogo = catalogo.getRange(1, 1, 1, catalogo.getMaxColumns()).getValues()[0];
    const colunaFinal = deCatalogo.findIndex((c) => String(c) === 'Final');
    if (colunaFinal >= 0) catalogo.getRange(1, colunaFinal + 1).setValue('');
    chamar('esquecerEstruturaLida_()');

    // 3. proposta e apólice voltam a ser um campo por coluna.
    chamar('lerRegistros_("CAMPOS")').forEach((campo) => {
      const configuracao = chamar('lerConfiguracaoDoCampo_')(campo);
      if (!configuracao.partirEm) return;
      const colunas = configuracao.partirEm.colunas;
      delete configuracao.partirEm;
      chamar('atualizarRegistro_')('CAMPOS', campo.Id, {
        Rotulo: String(campo.Cabecalho),
        Descricao: '',
        Configuracao: Object.keys(configuracao).length
          ? JSON.stringify(configuracao) : ''
      });
      // E os companheiros voltam ligados, um campo por coluna.
      colunas.forEach((cabecalho) => {
        const companheiro = chamar('lerRegistros_("CAMPOS")').find((um) =>
          String(um.Cabecalho) === cabecalho);
        if (companheiro) {
          chamar('atualizarRegistro_')('CAMPOS', companheiro.Id, { Ativo: 'SIM' });
        }
      });
    });
    chamar('esquecerEstruturaLida_()');

    // 4. a planilha antiga tinha Matrícula e as abas FERIADOS e AUSENCIAS.
    chamar('adicionarColuna_')('USUARIOS', 'Matricula', 'texto');
    const usuario = chamar('lerRegistros_("USUARIOS")')[0];
    chamar('atualizarRegistro_')('USUARIOS', usuario.Id, { Matricula: 'C123456' });
    const feriados = planilha.insertSheet('FERIADOS');
    feriados.getRange(1, 1, 1, 2).setValues([['Data', 'Nome']]);
    feriados.getRange(2, 1, 1, 2).setValues([['25/12/2026', 'Natal']]);
    const ausencias = planilha.insertSheet('AUSENCIAS');
    ausencias.getRange(1, 1, 1, 2).setValues([['UsuarioId', 'Motivo']]);
    chamar('esquecerEstruturaLida_()');

    // 5. os dois cadastros como o PO os tinha: sem as colunas desta rodada, e
    //    com as de antes, preenchidas. A SUSEP antiga é só de DÍGITO, porque
    //    a coluna era `identificador` e o sistema jogava a letra fora — é o
    //    que está gravado na planilha dele agora, e tem de continuar valendo.
    chamar('removerColuna_')('CORRETORAS', 'Sucursal');
    chamar('adicionarColuna_')('CORRETORAS', 'Nome', 'texto');
    chamar('adicionarColuna_')('CORRETORAS', 'Canal', 'texto');
    chamar('esquecerEstruturaLida_()');
    chamar('inserirRegistro_')('CORRETORAS', { SUSEP: '1234567',
      Corretora: 'Corretora de Antes', Nome: 'Corretora de Antes',
      Canal: 'Mesa Diamante', Segmento: 'Diamante', Consultor: 'Brook' });

    chamar('removerColuna_')('SUSEP_BLOQUEADAS', 'Sucursal');
    chamar('removerColuna_')('SUSEP_BLOQUEADAS', 'CoordenadorComercial');
    chamar('adicionarColuna_')('SUSEP_BLOQUEADAS', 'CpfReincidente', 'texto');
    chamar('adicionarColuna_')('SUSEP_BLOQUEADAS', 'Motivo', 'texto');
    chamar('esquecerEstruturaLida_()');
    chamar('inserirRegistro_')('SUSEP_BLOQUEADAS', { SUSEP: '7654321',
      NomeCorretora: 'Bloqueada de Antes', CpfReincidente: '12345678901',
      Motivo: 'Fraude confirmada', BloqueadaEm: '01/09/2026' });

    // 6. o canal de quem já está cadastrado estava só na coluna de texto.
    chamar('adicionarColuna_')('USUARIOS', 'Canal que atende', 'texto');
    chamar('esquecerEstruturaLida_()');
    const umCanal = chamar('lerRegistros_("CANAIS")')[0];
    chamar('salvarUsuario')({
      nome: 'Nico Robin', email: 'robin@exemplo.com',
      nivelAcessoId: chamar('lerRegistros_("CATALOGO")')
        .find((i) => String(i.Tipo) === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id,
      ativo: true
    });
    const robin = chamar('lerRegistros_("USUARIOS")')
      .find((u) => String(u.Nome) === 'Nico Robin');
    chamar('atualizarRegistro_')('USUARIOS', robin.Id, {
      CanalId: '', 'Canal que atende': String(umCanal.Nome) });
    // E uma pessoa com um canal escrito que não existe em CANAIS: ela não
    // pode ser chutada para o canal mais parecido.
    chamar('salvarUsuario')({
      nome: 'Tony Chopper', email: 'chopper@exemplo.com',
      nivelAcessoId: chamar('lerRegistros_("CATALOGO")')
        .find((i) => String(i.Tipo) === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id,
      ativo: true
    });
    const chopper = chamar('lerRegistros_("USUARIOS")')
      .find((u) => String(u.Nome) === 'Tony Chopper');
    chamar('atualizarRegistro_')('USUARIOS', chopper.Id, {
      CanalId: '', 'Canal que atende': 'Canal Que Nunca Existiu' });
    chamar('esquecerEstruturaLida_()');

    // 6a. a conferência de bloqueio por canal não existia.
    chamar('removerColuna_')('CANAIS', 'ConfereSusepBloqueada');
    chamar('esquecerEstruturaLida_()');

    // 6b. a disponibilidade do analista não existia, nem a lista dela.
    chamar('removerColuna_')('USUARIOS', 'Disponibilidade');
    chamar('lerRegistros_("CATALOGO")').forEach((item) => {
      if (String(item.Tipo) === 'DISPONIBILIDADE') {
        chamar('apagarRegistroDeVez_')('CATALOGO', item.Id);
      }
    });
    chamar('esquecerEstruturaLida_()');

    // 7. a aba PRODUTOS existia, com produto cadastrado.
    const produtos = planilha.insertSheet('PRODUTOS');
    produtos.getRange(1, 1, 1, 3).setValues([['Id', 'Produto', 'CodigoProduto']]);
    produtos.getRange(2, 1, 2, 3).setValues([
      ['1', 'Vida Individual', '101'],
      ['2', 'Auto', '102']
    ]);
    chamar('esquecerEstruturaLida_()');

    // 8. a fila e o campo de documento como eram antes do pedido do PO: o
    //    protocolo abrindo "Dados da proposta", o nome abrindo "Dados
    //    cadastrais", a Mesa sem o título do e-mail e o CPF só CPF.
    const comoEraAFila = {
      BASE_RET: [['Código origem da proposta + número da proposta, Num_apolice, produto',
        'protocolo, número da proposta, Num_apolice, produto'],
      ['telefones de contato, nome do cliente, CPF, e-mail', 'nome do cliente, CPF, e-mail']],
      BASE_MESA: [['Título do e-mail, Ramo, Assunto', 'Ramo, Assunto']]
    };
    chamar('lerRegistros_("CANAIS")').forEach((um) => {
      const trocas = comoEraAFila[String(um.Aba)];
      if (!trocas) return;
      let fila = String(um.ColunasDaFila);
      trocas.forEach(([hoje, antes]) => { fila = fila.replace(hoje, antes); });
      chamar('atualizarRegistro_')('CANAIS', um.Id, { ColunasDaFila: fila });
    });
    const cpfDaMesa = chamar('lerRegistros_("CAMPOS")').find((um) =>
      String(um.ChaveTecnica) === 'documentocpf');
    chamar('atualizarRegistro_')('CAMPOS', cpfDaMesa.Id,
      { Mascara: '000.000.000-00', Rotulo: 'CPF' });
    chamar('esquecerEstruturaLida_()');

    // 9. o SLA e a vigência do VG como eram antes do pedido: CANAIS sem as
    //    cinco colunas do SLA, e a Vigência abrindo pelo início, não pelos
    //    meses.
    ['SlaHorasUteis', 'InicioDoExpediente', 'FimDoExpediente', 'ColunaDaPrimeiraResposta',
      'ColunaDaHoraDaPrimeiraResposta']
      .forEach((coluna) => chamar('removerColuna_')('CANAIS', coluna));
    chamar('esquecerEstruturaLida_()');
    const doVg = chamar('lerRegistros_("CANAIS")').find((um) => String(um.Aba) === 'BASE_VG');
    chamar('atualizarRegistro_')('CANAIS', doVg.Id, { ColunasDaFila: String(doVg.ColunasDaFila)
      .replace('Vigência: Meses de vigência, Início da vigência',
        'Vigência: Início da vigência, Meses de vigência') });
    chamar('esquecerEstruturaLida_()');

    return tudo;
  }

  teste('sem atualizar, o que esta rodada trouxe não está lá', () => {
    // Este teste existe para provar que a atualização é NECESSÁRIA. Sem ele,
    // ninguém saberia dizer se ela resolve alguma coisa — e uma migração que
    // não resolve nada passa verde para sempre.
    const { chamar } = comoEraAntesDestaRodada();
    const ret = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');

    igual(chamar('produtividadeDaEquipe')(ret.id, {}, 30).valorPorSituacao, null,
      'sem a coluna do valor declarada, não há gráfico de valor');
    verdadeiro(!chamar('lerRegistros_("CATALOGO")')
      .some((item) => /^Sem sucesso/.test(String(item.Nome))));
    verdadeiro(chamar('lerRegistros_("CATALOGO")')
      .some((item) => String(item.Nome) === 'Reteve'),
      'o catálogo de antes tinha os nomes antigos');
  });

  teste('atualizar traz o gráfico de valor, o status novo e a proposta', () => {
    const { chamar } = comoEraAntesDestaRodada();
    const recado = chamar('atualizarPGO()');
    contem(recado, 'ATUALIZAÇÃO DO PGO');

    const ret = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');

    // O gráfico de valor por situação, ligado na coluna certa.
    const grafico = chamar('produtividadeDaEquipe')(ret.id, {}, 30).valorPorSituacao;
    verdadeiro(grafico !== null, 'o gráfico de valor tem de existir agora');
    igual(grafico.medida, 'valor do prêmio');
    igual(grafico.pontos.map((p) => p.rotulo).join(' | '),
      'Retido | Não retido | Sem sucesso de contato | Demais situações');

    // O status novo, em laranja e sem carimbo — já com o nome do PO.
    const semSucesso = chamar('lerRegistros_("CATALOGO")')
      .find((item) => String(item.Nome) === 'Sem sucesso de contato');
    verdadeiro(semSucesso !== undefined, 'o status tem de ter nascido');
    igual(String(semSucesso.Cor), 'atencao');
    igual(String(semSucesso.ColunaDeCarimbo || ''), '');

    // E a proposta já grava em colunas separadas.
    const salvo = chamar('cadastrarCaso')(ret.id, {
      nomedocliente: 'Depois de atualizar',
      numerodaproposta: '58-0000000',
      numapolice: '12-1391-0000000',
      status: 'Não trabalhado'
    });
    const linha = chamar('buscarRegistros_')('BASE_RET', 'Id',
      String(salvo.id || salvo), 1)[0];
    igual(String(linha['Código origem da proposta']), '58');
    igual(String(linha['número da proposta']), '0000000');
    igual(String(linha['cod_sucursal']), '12');
    igual(String(linha['cod_ramo']), '1391');
    igual(String(linha['Num_apolice']), '0000000');

    // E os campos dos pedaços saíram do formulário: o valor deles vem do
    // campo único agora. Dois campos pedindo o mesmo pedaço seria a chance de
    // digitar o código de uma proposta e o número de outra.
    const naTela = chamar('formularioDoCanal')(ret.id).secoes
      .reduce((soma, s) => soma.concat(s.campos), []).map((c) => c.chave);
    verdadeiro(naTela.indexOf('codigoorigemdaproposta') < 0);
    verdadeiro(naTela.indexOf('codsucursal') < 0);
    verdadeiro(naTela.indexOf('codramo') < 0);
    verdadeiro(naTela.indexOf('numerodaproposta') >= 0,
      'e o campo que hospeda a digitação continua na tela');
  });

  /*
   * OS STATUS COM OS NOMES DO PO, na planilha que já está em uso.
   *
   * "Exclui da planilha e prepara para que ele altere no código que já tenho
   * funcional aceitando o que te mandei." Trocar um nome é trocar em quatro
   * lugares — catálogo, casos gravados, cartões e destacadas —, e cada um dos
   * quatro tem a sua conferência aqui: trocar só o catálogo deixaria os casos
   * antigos "fora da lista" e o cartão "Reteve" contando zero, sem erro.
   */
  function statusDoCanal(chamar, aba) {
    const canal = chamar('canaisVisiveis_()').find((c) => c.aba === aba);
    return chamar('lerRegistros_("CATALOGO")').filter((item) =>
      String(item.Tipo) === 'STATUS' && String(item.CanalId) === String(canal.id));
  }

  teste('atualizar troca os nomes dos status nos quatro lugares', () => {
    const { chamar } = comoEraAntesDestaRodada();
    const ret = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    const mesa = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
    // Um "Sem sucesso" de quem rodou a atualização da rodada passada.
    chamar('inserirRegistro_')('CATALOGO', chamar('novoItemDeCatalogo_')(
      'STATUS', ret.id, 'Sem sucesso', 20, 'atencao', ''));
    // E as destacadas com os nomes antigos, como a rodada passada deixou. As
    // duas colunas voltam primeiro: o "antes" as tirou, e quem rodou a
    // atualização da rodada passada as tem.
    chamar('adicionarColuna_')('CANAIS', 'ColunaDoValor', 'texto');
    chamar('adicionarColuna_')('CANAIS', 'SituacoesDestacadas', 'textoLongo');
    chamar('esquecerEstruturaLida_()');
    chamar('atualizarRegistro_')('CANAIS', ret.id, {
      ColunaDoValor: 'valor do prêmio',
      SituacoesDestacadas: 'Reteve, Não reteve, Sem sucesso'
    });
    chamar('inserirVariosRegistros_')('BASE_RET', [
      { status: 'Reteve', 'nome do cliente': 'Antigo 1' },
      { status: 'Reteve', 'nome do cliente': 'Antigo 2' },
      { status: 'Não reteve', 'nome do cliente': 'Antigo 3' },
      { status: 'Sem sucesso', 'nome do cliente': 'Antigo 4' },
      { status: 'Pendente', 'nome do cliente': 'Antigo 5' }
    ]);
    chamar('inserirRegistro_')('BASE_MESA', { Status: 'Concluído na célula' });

    const recado = chamar('atualizarPGO()');
    contem(recado, '"Reteve" virou "Retido"');

    // 1. o catálogo
    const nomes = statusDoCanal(chamar, 'BASE_RET').map((item) => String(item.Nome));
    ['Retido', 'Não retido', 'Sem sucesso de contato'].forEach((nome) => {
      verdadeiro(nomes.indexOf(nome) >= 0, 'faltou "' + nome + '" no catálogo');
    });
    ['Reteve', 'Não reteve', 'Sem sucesso'].forEach((nome) => {
      verdadeiro(nomes.indexOf(nome) < 0, '"' + nome + '" continuou no catálogo');
    });

    // 2. os casos já gravados
    const porCliente = {};
    chamar('lerRegistros_("BASE_RET")').forEach((caso) => {
      porCliente[caso['nome do cliente']] = caso.status;
    });
    igual(porCliente['Antigo 1'], 'Retido');
    igual(porCliente['Antigo 2'], 'Retido');
    igual(porCliente['Antigo 3'], 'Não retido');
    igual(porCliente['Antigo 4'], 'Sem sucesso de contato');
    igual(porCliente['Antigo 5'], 'Pendente', 'o que não foi trocado não é tocado');
    verdadeiro(chamar('lerRegistros_("BASE_MESA")')
      .some((caso) => caso.Status === 'Concluído na mesa'), 'e a Mesa também');

    // 3. os cartões e gráficos
    const paineisDaRet = chamar('lerRegistros_("PAINEIS")')
      .filter((p) => String(p.CanalId) === String(ret.id));
    verdadeiro(paineisDaRet.some((p) => p.Titulo === 'Retido' && p.Filtro === 'Retido'),
      'o cartão da Produtividade acompanha — senão contaria zero, calado');
    verdadeiro(!paineisDaRet.some((p) => p.Filtro === 'Reteve' || p.Filtro === 'Não reteve'));
    verdadeiro(chamar('lerRegistros_("PAINEIS")').some((p) =>
      String(p.CanalId) === String(mesa.id) && p.Filtro === 'Concluído na mesa'
      && p.Titulo === 'Concluídos na mesa'),
      'o cartão da Mesa acompanha, no filtro e no título — que está no plural');

    // 4. as destacadas do gráfico de valor
    const destacadas = chamar('listarCanaisConfiguraveis()')
      .find((c) => c.aba === 'BASE_RET').situacoesDestacadas;
    igual(destacadas, 'Retido, Não retido, Sem sucesso de contato');

    // E os números continuam fechando: o cartão Retido conta os dois antigos.
    const cartao = chamar('produtividadeDaEquipe')(ret.id, {}, 400).cartoes
      .find((c) => c.rotulo === 'Retido');
    verdadeiro(cartao && cartao.valor >= 2, 'o cartão Retido conta os casos renomeados');
  });

  teste('atualizar exclui o Concluído da RET, cria o que faltava e marca os finais', () => {
    const { chamar } = comoEraAntesDestaRodada();
    chamar('atualizarPGO()');

    const daRet = statusDoCanal(chamar, 'BASE_RET');
    verdadeiro(!daRet.some((item) => item.Nome === 'Concluído'),
      '"exclui da planilha", palavra do PO');
    igual(daRet.filter((item) => String(item.Final) === 'SIM').map((item) => item.Nome)
      .sort().join(', '),
      'Cancelado, Não retido, Pago, Retido, Sem sucesso de contato');

    const daMesa = statusDoCanal(chamar, 'BASE_MESA');
    igual(daMesa.filter((item) => String(item.Final) === 'SIM').map((item) => item.Nome)
      .sort().join(', '), 'Concluído, Concluído na mesa, Sem retorno');
    verdadeiro(!daMesa.some((item) => item.Nome === 'Em andamento'
      && String(item.Final) === 'SIM'), 'Em andamento não fecha nada');

    verdadeiro(!statusDoCanal(chamar, 'BASE_VG').some((item) => String(item.Final) === 'SIM'),
      'o VG fica sem final até o PO decidir');
  });

  teste('caso que ainda está em "Concluído" vai para a DECISÃO SUA, e não é mexido', () => {
    // Escolher o status novo de um caso é decisão de quem conhece o caso.
    const { chamar } = comoEraAntesDestaRodada();
    chamar('inserirRegistro_')('BASE_RET', { status: 'Concluído', 'nome do cliente': 'Já fechado' });

    const recado = chamar('atualizarPGO()');
    contem(recado, 'DECISÃO SUA');
    contem(recado, '1 caso(s) continuam com o status "Concluído"');
    verdadeiro(chamar('lerRegistros_("BASE_RET")')
      .some((caso) => caso['nome do cliente'] === 'Já fechado' && caso.status === 'Concluído'),
      'o caso continua como estava');
  });

  teste('quem marcou NÃO num status final não é atropelado na segunda rodada', () => {
    const { chamar } = comoEraAntesDestaRodada();
    chamar('atualizarPGO()');
    const pago = statusDoCanal(chamar, 'BASE_RET').find((item) => item.Nome === 'Pago');
    chamar('atualizarRegistro_')('CATALOGO', pago.Id, { Final: 'NAO' });

    const segunda = chamar('atualizarPGO()');
    igual(String(statusDoCanal(chamar, 'BASE_RET').find((item) => item.Nome === 'Pago').Final),
      'NAO', 'a escolha de alguém não se desfaz por rodar a atualização');
    igual(segunda.indexOf('virou'), -1, 'na segunda rodada não há nome a trocar');
    igual(segunda.indexOf('excluído do catálogo'), -1, 'nem status a excluir');
  });

  teste('atualizar NÃO apaga a Matrícula nem a aba de feriados', () => {
    /*
     * A promessa que o PO cobrou: "não precise excluir as abas ou criar do
     * zero". Coluna com dado dentro e aba inteira nunca são apagadas por uma
     * migração — o sistema só para de olhar para elas, e o laudo diz que a
     * decisão de apagar é dele.
     */
    const { ambiente, chamar } = comoEraAntesDestaRodada();
    const recado = chamar('atualizarPGO()');

    const usuario = chamar('lerRegistros_("USUARIOS")')[0];
    igual(String(usuario.Matricula), 'C123456',
      'a matrícula que já estava gravada continua gravada');
    verdadeiro(ambiente.planilha.getSheetByName('FERIADOS') !== null,
      'a aba FERIADOS continua na planilha');
    igual(chamar('lerRegistros_("FERIADOS")').length, 1,
      'com o feriado que estava nela');

    contem(recado, 'DECISÃO SUA', 'e o laudo diz o que sobrou para ele decidir');
    contem(recado, 'Matricula');
    contem(recado, 'FERIADOS');
    contem(recado, 'AUSENCIAS');

    // As colunas que saíram do contrato dos dois cadastros nesta rodada: nem
    // uma delas é apagada, e o dado que estava nelas continua legível.
    igual(String(chamar('lerRegistros_("CORRETORAS")')
      .find((uma) => String(uma.SUSEP) === '1234567').Nome),
      'Corretora de Antes', 'CORRETORAS."Nome" não foi apagada');
    igual(String(chamar('lerRegistros_("SUSEP_BLOQUEADAS")')
      .find((uma) => String(uma.SUSEP) === '7654321').Motivo),
      'Fraude confirmada', 'SUSEP_BLOQUEADAS."Motivo" não foi apagada');
    contem(recado, 'CORRETORAS."Nome"');
    contem(recado, 'CORRETORAS."Canal"');
    contem(recado, 'SUSEP_BLOQUEADAS."Motivo"');
    contem(recado, 'SUSEP_BLOQUEADAS."CpfReincidente"');
  });

  teste('atualizar cria as colunas novas dos dois cadastros', () => {
    const { chamar } = comoEraAntesDestaRodada();

    // Antes: a Sucursal não existe em nenhum dos dois.
    verdadeiro(chamar('posicaoDaColuna_')(
      chamar('estruturaDaAba_')('CORRETORAS'), 'Sucursal') < 0,
      'a coluna não pode existir antes, senão o teste não prova nada');

    const recado = chamar('atualizarPGO()');
    contem(recado, 'CORRETORAS.Sucursal criada');
    contem(recado, 'SUSEP_BLOQUEADAS.Sucursal criada');
    contem(recado, 'SUSEP_BLOQUEADAS.CoordenadorComercial criada');

    // E o cadastro que já estava lá continua lá, inteiro.
    const corretora = chamar('tabelaDeCorretoras')('', '').corretoras
      .find((uma) => uma.susep === '1234567');
    igual(corretora.corretora, 'Corretora de Antes');
    igual(corretora.consultor, 'Brook', 'o consultor de antes não se perdeu');
    igual(corretora.sucursal, '', 'e a sucursal nova nasce vazia, para ele preencher');

    // A SUSEP antiga é só de dígito, porque a coluna era identificador. O selo
    // do formulário tem de continuar achando-a — senão a migração "funciona" e
    // o sistema para de reconhecer o cadastro que já existia.
    igual(chamar('consultarSusep')('1234567').situacao, 'OK');

    // E a de letra e número, que é o formato de verdade, já entra.
    chamar('salvarCorretora')({ susep: 'RET00J', corretora: 'Depois',
      sucursal: '12', segmento: 'Diamante', consultor: 'Nami' });
    igual(chamar('consultarSusep')('RET00J').situacao, 'OK');
  });

  teste('atualizar liga o canal de quem já estava cadastrado', () => {
    /*
      A equipe passou a ser o CANAL. Quem foi cadastrado antes tinha o canal
      escrito na coluna de texto e o CanalId em branco — e sem este passo o
      sistema novo não enxergaria equipe nenhuma para essa pessoa.
    */
    const { chamar } = comoEraAntesDestaRodada();
    const umCanal = chamar('lerRegistros_("CANAIS")')[0];

    const recado = chamar('atualizarPGO()');
    contem(recado, 'Nico Robin ficou no canal ' + String(umCanal.Nome));

    const robin = chamar('lerRegistros_("USUARIOS")')
      .find((u) => String(u.Nome) === 'Nico Robin');
    igual(String(robin.CanalId), String(umCanal.Id),
      'o canal que ele digitou virou o CanalId');
  });

  teste('canal escrito que não existe fica para o PO, e não é chutado', () => {
    // Chutar o canal mais parecido colocaria a pessoa na equipe errada, e
    // ninguém veria: o painel dela simplesmente mostraria outra gente.
    const { chamar } = comoEraAntesDestaRodada();
    const recado = chamar('atualizarPGO()');

    contem(recado, 'Tony Chopper');
    contem(recado, 'Canal Que Nunca Existiu');
    const chopper = chamar('lerRegistros_("USUARIOS")')
      .find((u) => String(u.Nome) === 'Tony Chopper');
    igual(String(chopper.CanalId || ''), '', 'continua sem canal, de propósito');
  });

  teste('quem já tem canal escolhido não é sobrescrito pela coluna antiga', () => {
    const { chamar } = comoEraAntesDestaRodada();
    const canais = chamar('lerRegistros_("CANAIS")');
    const robin = chamar('lerRegistros_("USUARIOS")')
      .find((u) => String(u.Nome) === 'Nico Robin');

    // Ele tem CanalId do segundo canal e a coluna antiga diz o primeiro. A
    // escolha mais nova ganha: a coluna de texto é a que saiu do contrato.
    chamar('atualizarRegistro_')('USUARIOS', robin.Id, {
      CanalId: String(canais[1].Id), 'Canal que atende': String(canais[0].Nome) });
    chamar('esquecerEstruturaLida_()');
    chamar('atualizarPGO()');

    igual(String(chamar('lerRegistros_("USUARIOS")')
      .find((u) => String(u.Nome) === 'Nico Robin').CanalId),
      String(canais[1].Id));
  });

  teste('atualizar apaga a aba PRODUTOS, e diz quantas linhas foram', () => {
    // O único passo que apaga, e está aqui porque o PO pediu as duas pontas:
    // "Produtos pode eliminar" — a aba da tela e a aba da planilha.
    const { ambiente, chamar } = comoEraAntesDestaRodada();
    verdadeiro(ambiente.planilha.getSheetByName('PRODUTOS') !== null,
      'a aba tem de existir antes, senão o teste não prova nada');

    const recado = chamar('atualizarPGO()');
    igual(ambiente.planilha.getSheetByName('PRODUTOS'), null,
      'a aba saiu da planilha');
    contem(recado, 'aba PRODUTOS apagada da planilha, com 2 linha(s)');
    contem(recado, 'Histórico de versões',
      'e o laudo diz de onde ela volta, se ele mudar de ideia');
  });

  teste('atualizar cria a disponibilidade e a lista dela', () => {
    const { chamar } = comoEraAntesDestaRodada();

    verdadeiro(chamar('posicaoDaColuna_')(
      chamar('estruturaDaAba_')('USUARIOS'), 'Disponibilidade') < 0,
      'a coluna não pode existir antes, senão o teste não prova nada');

    const recado = chamar('atualizarPGO()');
    contem(recado, 'USUARIOS.Disponibilidade criada');
    contem(recado, 'disponibilidade "Disponível" criada');
    contem(recado, 'disponibilidade "Férias" criada');

    const lista = chamar('resumoDasConfiguracoes()').disponibilidades;
    igual(lista.map((d) => d.nome).join(', '), 'Disponível, Férias, Afastado');
  });

  teste('quem já estava cadastrado continua recebendo lote', () => {
    /*
      A trava desta migração. A coluna nasce VAZIA para quem já existia, e
      vazio tem de valer "disponível" — senão a primeira importação depois da
      atualização não acharia ninguém para dividir, numa operação inteira, e
      ninguém ligaria a causa ao efeito.
    */
    const { chamar } = comoEraAntesDestaRodada();
    const daRet = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    const nivel = chamar('lerRegistros_("CATALOGO")')
      .find((i) => String(i.Tipo) === 'NIVEL_ACESSO' && i.Nome === 'Operação');

    chamar('salvarUsuario')({ nome: 'Analista De Antes',
      email: 'antes@exemplo.com', nivelAcessoId: nivel.Id,
      canalId: daRet.id, ativo: true });

    chamar('atualizarPGO()');

    const lista = chamar('analistasParaDistribuir_')(daRet);
    verdadeiro(lista.some((p) => p.nome === 'Analista De Antes'),
      'a coluna nasceu vazia, e vazio recebe');
  });

  teste('rodar duas vezes não cria a lista de disponibilidade em dobro', () => {
    const { chamar } = comoEraAntesDestaRodada();
    chamar('atualizarPGO()');
    const segunda = chamar('atualizarPGO()');

    contem(segunda, 'a disponibilidade "Férias" já existe');
    igual(chamar('lerRegistros_("CATALOGO")')
      .filter((i) => String(i.Tipo) === 'DISPONIBILIDADE').length, 3);
  });

  teste('a migração avisa o canal que ficou sem ninguém para receber', () => {
    /*
      A importação passou a dividir só entre quem é DO CANAL. Numa instalação
      em que o canal da pessoa nunca foi preenchido, a lista vira vazia — e a
      coordenação descobriria com o lote já colado na tela.
    */
    const { chamar } = comoEraAntesDestaRodada();
    // Ninguém com canal, e nem com o texto antigo de onde a migração o
    // tiraria: é a instalação em que o campo nunca foi preenchido.
    chamar('lerRegistros_("USUARIOS")').forEach((usuario) => {
      chamar('atualizarRegistro_')('USUARIOS', usuario.Id,
        { CanalId: '', 'Canal que atende': '' });
    });
    chamar('esquecerEstruturaLida_()');

    const recado = chamar('atualizarPGO()');
    contem(recado, 'sem ninguém nessa condição');
    contem(recado, 'RET');
  });

  teste('atualizar NÃO atropela a sequência de Id de quem já migrou', () => {
    /*
      O DEFEITO QUE O ENSAIO PEGOU, horas antes de a equipe rodar.

      O passo das sequências de `migrarParaCanais` rodava SEMPRE, inclusive
      numa planilha já migrada — que é a de quem só está atualizando o código.
      E aí ele fazia o oposto do que existe para evitar: copiava
      RECC_SEQ_CANAIS (a sequência dos canais, em 2) por cima de
      RECC_SEQ_CORRETORAS (em 139) e apagava a dos canais.

      A próxima corretora cadastrada nasceria com um Id que já existe. O
      diagnóstico pegava depois; pegar depois de gravar é tarde.
    */
    const { ambiente, chamar } = instalacaoNova();
    const corretoras = [];
    for (let i = 0; i < 140; i++) {
      corretoras.push({ SUSEP: 'RET' + i, Corretora: 'C' + i, Segmento: 'Diamante' });
    }
    chamar('inserirVariosRegistros_')('CORRETORAS', corretoras);

    const antesCorretoras = ambiente.propriedades.get('RECC_SEQ_CORRETORAS');
    const antesCanais = ambiente.propriedades.get('RECC_SEQ_CANAIS');
    // A sequência guarda o ÚLTIMO índice emitido: 140 linhas param em 139.
    verdadeiro(Number(antesCorretoras) >= 139,
      'a sequência tem de estar adiantada antes, senão o teste não prova nada —'
      + ' está em ' + antesCorretoras);
    verdadeiro(Number(antesCorretoras) > Number(antesCanais),
      'e bem acima da dos canais, que é a que atropelava');

    chamar('atualizarPGO()');

    igual(ambiente.propriedades.get('RECC_SEQ_CORRETORAS'), antesCorretoras,
      'a sequência das corretoras não pode ser atropelada');
    igual(ambiente.propriedades.get('RECC_SEQ_CANAIS'), antesCanais,
      'e a dos canais não pode sumir');

    // E a prova que importa: o próximo Id não colide.
    const novoId = chamar('salvarCorretora')({ susep: 'RETNOVA',
      corretora: 'Depois da atualização', segmento: 'Diamante' });
    const todas = chamar('lerRegistros_("CORRETORAS")');
    const repetidos = todas.filter((uma) =>
      String(uma.Id) === String(novoId.id || novoId));
    igual(repetidos.length, 1, 'o Id novo não pode já existir na aba');

    igual(chamar('diagnosticoRECC()').aprovado, true,
      falhasEmTexto(chamar('diagnosticoRECC()')));
  });

  teste('as colunas novas de ABA DE CONTROLE não viram campo de formulário', () => {
    /*
      CAMPOS é o formulário de Cadastrar Caso: cada linha é um campo de um
      canal. Coluna de USUARIOS, CORRETORAS ou SUSEP_BLOQUEADAS não é campo
      de canal nenhum — e nascia ali com CanalId vazio, invisível para o
      formulário e contada na tela.
    */
    const { chamar } = comoEraAntesDestaRodada();
    chamar('atualizarPGO()');

    const deControle = chamar('lerRegistros_("CAMPOS")').filter((campo) =>
      ['USUARIOS', 'CORRETORAS', 'SUSEP_BLOQUEADAS', 'CANAIS', 'CATALOGO']
        .indexOf(String(campo.Aba)) >= 0);

    igual(deControle.length, 0,
      'sobrou campo de aba de controle: '
      + deControle.map((c) => c.Aba + '.' + c.Cabecalho).join(', '));
  });

  teste('apagar à mão a coluna que saiu do contrato NÃO reprova o sistema', () => {
    /*
      O laudo da migração convida o PO a apagar as colunas que saíram do
      contrato: "apague a coluna na planilha quando quiser". Este teste é o
      que garante que aceitar o convite não quebra nada — foi ensaiando isso
      que o campo solto apareceu.
    */
    const { ambiente, chamar } = comoEraAntesDestaRodada();
    chamar('atualizarPGO()');

    // O PO apaga, na planilha, as que o laudo listou.
    [['USUARIOS', 'Matricula'], ['USUARIOS', 'Canal que atende'],
     ['CORRETORAS', 'Nome'], ['CORRETORAS', 'Canal'],
     ['SUSEP_BLOQUEADAS', 'Motivo'], ['SUSEP_BLOQUEADAS', 'CpfReincidente']
    ].forEach(([nomeDaAba, cabecalho]) => {
      const aba = ambiente.planilha.getSheetByName(nomeDaAba);
      const cabecalhos = aba.getRange(1, 1, 1, aba.getMaxColumns()).getValues()[0];
      const onde = cabecalhos.findIndex((c) => String(c) === cabecalho);
      if (onde >= 0) aba.deleteColumns(onde + 1, 1);
    });
    chamar('esquecerEstruturaLida_()');

    igual(chamar('diagnosticoRECC()').aprovado, true,
      falhasEmTexto(chamar('diagnosticoRECC()')));

    // E o sistema continua funcionando sobre as abas encurtadas.
    const daRet = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    chamar('salvarCorretora')({ susep: 'RET55M', corretora: 'Depois de apagar',
      sucursal: '12', segmento: 'Diamante', consultor: 'Brook' });
    igual(chamar('consultarSusep')('RET55M', daRet.id).situacao, 'OK');

    chamar('bloquearSusep')({ susep: 'RET66N', corretora: 'B',
      sucursal: '1', coordenadorComercial: 'C' });
    verdadeiro(chamar('listarSusepsBloqueadas()')
      .some((uma) => uma.susep === 'RET66N'));

    verdadeiro(chamar('listarUsuarios()').length > 0);
  });

  teste('atualizar tira a conferência de bloqueio da Mesa Diamante', () => {
    /*
      CRIAR A COLUNA NÃO BASTA, e foi o único dos pedidos desta rodada que não
      atravessava a migração.

      A coluna nasce VAZIA, e vazio vale SIM — é o que faz um canal antigo
      continuar conferindo, como já conferia. Então, para a instalação que já
      existe, criar a coluna deixava a Mesa exatamente como estava. O pedido
      do PO valia só para quem instalasse do zero.
    */
    const { chamar } = comoEraAntesDestaRodada();
    const daMesa = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
    const daRet = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    chamar('inserirRegistro_')('SUSEP_BLOQUEADAS',
      { SUSEP: 'RET99Z', NomeCorretora: 'Bloqueada' });

    const recado = chamar('atualizarPGO()');
    contem(recado, 'Mesa Diamante: deixou de conferir');

    igual(chamar('consultarSusep')('RET99Z', daMesa.id).situacao, 'NAO_ENCONTRADA',
      'a Mesa não consulta mais a lista');
    igual(chamar('consultarSusep')('RET99Z', daRet.id).situacao, 'BLOQUEADA',
      'e a RET continua consultando');
  });

  teste('mas respeita quem já escolheu conferir na Mesa', () => {
    // Migração que passa por cima de uma escolha desfaz o trabalho de alguém
    // sem avisar.
    const { chamar } = comoEraAntesDestaRodada();
    const mesa = chamar('lerRegistros_("CANAIS")')
      .find((c) => String(c.Aba) === 'BASE_MESA');
    chamar('adicionarColuna_')('CANAIS', 'ConfereSusepBloqueada', 'simOuNao');
    chamar('esquecerEstruturaLida_()');
    chamar('atualizarRegistro_')('CANAIS', mesa.Id, { ConfereSusepBloqueada: 'SIM' });
    chamar('esquecerEstruturaLida_()');

    const recado = chamar('atualizarPGO()');
    contem(recado, 'a Mesa já tem a conferência de bloqueio escolhida');

    const daMesa = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
    igual(daMesa.confereSusepBloqueada, true, 'a escolha dela ficou de pé');
  });

  /** As colunas de um grupo da fila, como estão na planilha agora. */
  function grupoDaFilaNaPlanilha(chamar, aba, grupo) {
    const canal = chamar('lerRegistros_("CANAIS")').find((um) => String(um.Aba) === aba);
    const pedaco = String(canal.ColunasDaFila).split(';')
      .find((um) => um.split(':')[0].trim() === grupo);
    return pedaco ? pedaco.substring(pedaco.indexOf(':') + 1).trim() : null;
  }

  teste('sem atualizar, a fila e o CPF ainda estão como antes do pedido', () => {
    const { chamar } = comoEraAntesDestaRodada();
    igual(grupoDaFilaNaPlanilha(chamar, 'BASE_RET', 'Dados da proposta'),
      'protocolo, número da proposta, Num_apolice, produto');
    igual(grupoDaFilaNaPlanilha(chamar, 'BASE_MESA', 'Dados do caso'), 'Ramo, Assunto');
    const cpf = chamar('lerRegistros_("CAMPOS")')
      .find((um) => String(um.ChaveTecnica) === 'documentocpf');
    igual(String(cpf.Mascara), '000.000.000-00');
  });

  teste('atualizar põe a proposta inteira, o telefone e o título do e-mail em destaque', () => {
    const { chamar } = comoEraAntesDestaRodada();
    const recado = chamar('atualizarPGO()');
    contem(recado, '"Dados da proposta" agora abre com');

    igual(grupoDaFilaNaPlanilha(chamar, 'BASE_RET', 'Dados da proposta'),
      'Código origem da proposta + número da proposta, Num_apolice, produto');
    igual(grupoDaFilaNaPlanilha(chamar, 'BASE_RET', 'Dados cadastrais'),
      'telefones de contato, nome do cliente, CPF, e-mail');
    igual(grupoDaFilaNaPlanilha(chamar, 'BASE_MESA', 'Dados do caso'),
      'Título do e-mail, Ramo, Assunto');
    igual(grupoDaFilaNaPlanilha(chamar, 'BASE_RET', 'Responsável'), 'analista',
      'os outros grupos ficam exatamente como estavam');
  });

  teste('atualizar faz o CPF da Mesa aceitar CNPJ', () => {
    const { chamar } = comoEraAntesDestaRodada();
    chamar('atualizarPGO()');
    const mesa = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
    const salvo = chamar('cadastrarCaso')(mesa.id, {
      status: 'Em andamento', nomedosegurado: 'Empresa depois de atualizar',
      documentocpf: '12.345.678/0001-90'
    });
    igual(chamar('buscarRegistros_')('BASE_MESA', 'Id', String(salvo.id), 1)[0]
      ['Documento (CPF)'], '12345678000190');
    const cpf = chamar('lerRegistros_("CAMPOS")')
      .find((um) => String(um.ChaveTecnica) === 'documentocpf');
    igual(String(cpf.Rotulo), 'CPF ou CNPJ');
  });

  teste('grupo da fila personalizado vai para a DECISÃO SUA, e não é mexido', () => {
    const { chamar } = comoEraAntesDestaRodada();
    const ret = chamar('lerRegistros_("CANAIS")').find((um) => String(um.Aba) === 'BASE_RET');
    chamar('atualizarRegistro_')('CANAIS', ret.Id, { ColunasDaFila:
      String(ret.ColunasDaFila).replace('nome do cliente, CPF, e-mail', 'CPF, nome do cliente') });
    const cpf = chamar('lerRegistros_("CAMPOS")')
      .find((um) => String(um.ChaveTecnica) === 'documentocpf');
    chamar('atualizarRegistro_')('CAMPOS', cpf.Id, { Mascara: '000.000.000.00' });
    chamar('esquecerEstruturaLida_()');

    const recado = chamar('atualizarPGO()');
    contem(recado, 'DECISÃO SUA');
    contem(recado, '"Dados cadastrais" da fila foi personalizado');
    contem(recado, 'máscara personalizada');
    igual(grupoDaFilaNaPlanilha(chamar, 'BASE_RET', 'Dados cadastrais'),
      'CPF, nome do cliente', 'a escolha de quem personalizou ficou de pé');
    igual(grupoDaFilaNaPlanilha(chamar, 'BASE_RET', 'Dados da proposta'),
      'Código origem da proposta + número da proposta, Num_apolice, produto',
      'e o grupo que estava de fábrica foi trocado normalmente');
  });

  teste('rodar de novo não mexe na fila nem no CPF outra vez', () => {
    const { chamar } = comoEraAntesDestaRodada();
    chamar('atualizarPGO()');
    const filaDepois = chamar('lerRegistros_("CANAIS")').map((um) => String(um.ColunasDaFila));
    const segunda = chamar('atualizarPGO()');
    contem(segunda, 'já está como pedido');
    contem(segunda, 'já aceita CNPJ');
    igual(chamar('lerRegistros_("CANAIS")').map((um) => String(um.ColunasDaFila)).join('#'),
      filaDepois.join('#'));
  });

  teste('sem atualizar, a Mesa não tem SLA e a Vigência abre pelo início', () => {
    const { chamar } = comoEraAntesDestaRodada();
    const mesa = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA');
    igual(mesa.slaHorasUteis, 0, 'sem as colunas, não há SLA');
    igual(grupoDaFilaNaPlanilha(chamar, 'BASE_VG', 'Vigência'),
      'Início da vigência, Meses de vigência');
  });

  teste('atualizar liga o SLA da Mesa e põe os meses de vigência em destaque', () => {
    const { chamar } = comoEraAntesDestaRodada();
    const recado = chamar('atualizarPGO()');
    contem(recado, 'Mesa Diamante: SLA de 6 horas úteis, das 08:15 às 18:30');
    contem(recado, 'até a primeira resposta');

    const canais = chamar('canaisVisiveis_()');
    const mesa = canais.find((c) => c.aba === 'BASE_MESA');
    igual(mesa.slaHorasUteis, 6);
    igual(mesa.inicioDoExpediente, '08:15');
    igual(mesa.fimDoExpediente, '18:30');
    igual(mesa.colunaDaPrimeiraResposta, 'Data resposta');
    igual(mesa.colunaDaHoraDaPrimeiraResposta, 'Hora resposta');
    igual(canais.find((c) => c.aba === 'BASE_RET').slaHorasUteis, 0,
      'a RET não pediu SLA, e continua sem');
    igual(grupoDaFilaNaPlanilha(chamar, 'BASE_VG', 'Vigência'),
      'Meses de vigência, Início da vigência');

    chamar('cadastrarCaso')(mesa.id, { status: 'Em andamento',
      nomedosegurado: 'Caso depois de atualizar' });
    verdadeiro(chamar('resumoDoCanal')(mesa.id, {}).fila[0].sla !== null,
      'e a fila da Mesa já sai com o selo');
  });

  teste('quem já declarou SLA na Mesa não é atropelado', () => {
    const { chamar } = comoEraAntesDestaRodada();
    chamar('adicionarColuna_')('CANAIS', 'SlaHorasUteis', 'numero');
    chamar('esquecerEstruturaLida_()');
    const mesa = chamar('lerRegistros_("CANAIS")').find((c) => String(c.Aba) === 'BASE_MESA');
    chamar('atualizarRegistro_')('CANAIS', mesa.Id, { SlaHorasUteis: 8 });
    chamar('esquecerEstruturaLida_()');

    const recado = chamar('atualizarPGO()');
    contem(recado, 'a Mesa já tem SLA declarado (8 horas úteis)');
    igual(chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_MESA').slaHorasUteis, 8);
  });

  teste('rodar de novo não liga o SLA outra vez', () => {
    const { chamar } = comoEraAntesDestaRodada();
    chamar('atualizarPGO()');
    const segunda = chamar('atualizarPGO()');
    contem(segunda, 'a Mesa já tem SLA declarado (6 horas úteis)');
    verdadeiro(segunda.indexOf('Mesa Diamante: SLA de 6 horas úteis') < 0,
      'na segunda rodada, nada a fazer');
  });

  teste('atualizar não perde usuário, caso nem configuração ajustada', () => {
    const { chamar } = comoEraAntesDestaRodada();

    chamar('inserirRegistro_')('BASE_RET', { analista: 'Ana',
      'nome do cliente': 'Caso de antes' });
    const quantosUsuarios = chamar('lerRegistros_("USUARIOS")').length;

    // Uma configuração ajustada à mão, do tipo que uma migração desastrada
    // sobrescreveria: a meta do canal.
    const ret = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    chamar('atualizarRegistro_')('CANAIS', ret.id, { MetaMensalPorPessoa: 77 });
    chamar('esquecerEstruturaLida_()');

    chamar('atualizarPGO()');

    igual(chamar('lerRegistros_("USUARIOS")').length, quantosUsuarios);
    verdadeiro(chamar('lerRegistros_("BASE_RET")')
      .some((linha) => String(linha['nome do cliente']) === 'Caso de antes'));
    igual(Number(chamar('lerRegistros_("CANAIS")')
      .find((c) => String(c.Aba) === 'BASE_RET').MetaMensalPorPessoa), 77,
      'a meta ajustada à mão não pode ter sido sobrescrita');
  });

  teste('quem já escolheu outra coluna de valor não é atropelado', () => {
    // Uma migração que preenche o que já está preenchido desfaz a escolha de
    // alguém sem avisar. Esta só preenche o que está em branco.
    const { chamar } = comoEraAntesDestaRodada();
    chamar('atualizarPGO()');

    const ret = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    chamar('salvarCanal')(Object.assign({},
      chamar('listarCanaisConfiguraveis()').find((c) => c.aba === 'BASE_RET'),
      { colunaDoValor: 'valor do prêmio retido',
        situacoesDestacadas: 'Retido, Pago' }));

    const recado = chamar('atualizarPGO()');
    contem(recado, 'já tem coluna de valor');

    const depois = chamar('listarCanaisConfiguraveis()')
      .find((c) => c.aba === 'BASE_RET');
    igual(depois.colunaDoValor, 'valor do prêmio retido');
    igual(depois.situacoesDestacadas, 'Retido, Pago');
  });

  teste('rodar a atualização duas vezes não estraga nada', () => {
    // Ninguém tem certeza se já rodou. Quem não lembra, roda de novo.
    const { chamar } = comoEraAntesDestaRodada();
    chamar('atualizarPGO()');
    const segunda = chamar('atualizarPGO()');

    contem(segunda, 'JÁ ESTAVA ASSIM');
    const ret = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    verdadeiro(chamar('produtividadeDaEquipe')(ret.id, {}, 30).valorPorSituacao
      !== null, 'o gráfico continua de pé');
    igual(chamar('lerRegistros_("CATALOGO")')
      .filter((item) => String(item.Nome) === 'Sem sucesso de contato').length, 1,
      'e o status não pode ter nascido duas vezes');
    igual(chamar('lerRegistros_("CATALOGO")')
      .filter((item) => String(item.Nome) === 'Sem sucesso').length, 0,
      'nem voltado com o nome antigo');
  });

  teste('numa instalação nova, atualizar não faz nada', () => {
    const { chamar } = instalacaoNova();
    const recado = chamar('atualizarPGO()');
    igual(recado.indexOf('status "Sem sucesso de contato" criado'), -1,
      'instalação nova já nasce com tudo');
    igual(recado.indexOf('virou'), -1, 'e com os nomes do PO: nada a renomear');
    igual(recado.indexOf('excluído do catálogo'), -1, 'nem a excluir');
    igual(chamar('diagnosticoRECC()').aprovado, true);
  });

  teste('a atualização aprova no diagnóstico', () => {
    const { chamar } = comoEraAntesDestaRodada();
    chamar('atualizarPGO()');
    igual(chamar('diagnosticoRECC()').aprovado, true,
      falhasEmTexto(chamar('diagnosticoRECC()')));
  });

  secao('As duas portas');

  teste('a porta do editor não exige permissão nem login', () => {
    // Quando doGet está quebrado, a tela não serve para diagnosticar nada —
    // e quem abre o editor do Apps Script já tem acesso a tudo mesmo.
    const { ambiente, chamar } = instalacaoNova();
    comoUsuario(ambiente, 'ninguem@exemplo.com', () => {
      const laudo = chamar('diagnosticoRECC()');
      verdadeiro(laudo.resumo.total > 40, 'rodou mesmo sem usuário cadastrado');
    });
  });

  teste('a porta da tela exige permissão de configurar', () => {
    const { ambiente, chamar } = instalacaoNova();
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((i) => String(i.Tipo) === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    chamar('salvarUsuario')({
      nome: 'Ana Operação', email: 'ana@exemplo.com',
      nivelAcessoId: operacao.Id, ativo: true
    });

    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      lanca(() => chamar('diagnosticoDoSistema()'), 'não permite configurar');
    });
  });

  teste('rodar pela tela deixa rastro na auditoria', () => {
    const { chamar } = instalacaoNova();
    chamar('diagnosticoDoSistema()');
    const trilha = chamar('listarAuditoria')(5);
    verdadeiro(trilha.some((linha) => linha.acao === 'diagnostico.rodar'),
      'quem rodou e quando fica registrado');
  });

  secao('O laudo em texto');

  teste('o log do editor sai legível, e não um JSON de trezentas linhas', () => {
    const { ambiente, chamar } = instalacaoNova();
    chamar('diagnosticoRECC()');
    const escrito = ambiente.registros.join('\n');

    contem(escrito, 'DIAGNOSTICO DO RECC');
    contem(escrito, 'APROVADO');
    contem(escrito, '[OK] A estrutura da planilha');
    contem(escrito, '  ! Não há senha de administrador');
    verdadeiro(escrito.indexOf('{"') < 0, 'nada de JSON cru no log');
  });

  teste('reprovado aparece com a contagem de falhas', () => {
    const { chamar } = instalacaoNova();
    const canal = chamar('lerRegistros_("CANAIS")')[0];
    chamar('atualizarRegistro_')('CANAIS', canal.Id, { Aba: 'NAO_EXISTE' });

    const laudo = chamar('diagnosticoRECC()');
    const texto = chamar('laudoEmTexto_')(laudo);
    contem(texto, 'REPROVADO');
    contem(texto, '  X ');
  });
}

module.exports = { rodarTestesDeDiagnostico };
