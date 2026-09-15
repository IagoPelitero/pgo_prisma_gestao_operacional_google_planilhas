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
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario } =
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
      'ambiente,estrutura,sequencias,identificadores,mesas,campos,paineis,'
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
    const produtos = ambiente.planilha.getSheetByName('PRODUTOS');
    ambiente.planilha.abas.splice(ambiente.planilha.abas.indexOf(produtos), 1);

    contem(chamar('verificarEstruturaRECC()'), 'FALTA A ABA  PRODUTOS');
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
    const produtos = ambiente.planilha.getSheetByName('PRODUTOS');
    ambiente.planilha.abas.splice(ambiente.planilha.abas.indexOf(produtos), 1);

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'A aba PRODUTOS não existe');
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
    const aba = chamar('planilhaAtiva_()').getSheetByName('PRODUTOS');
    aba.insertColumnsAfter(aba.getMaxColumns(), 1);
    aba.getRange(1, aba.getMaxColumns(), 1, 1).setValues([['Anotação minha']]);
    chamar('esquecerEstruturaLida_')('PRODUTOS');

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
    const aba = ambiente.planilha.getSheetByName('MESAS');
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
    const aba = ambiente.planilha.getSheetByName('CANAIS');
    chamar('inserirVariosRegistros_')('CANAIS', [
      { Nome: 'Uma', Canal: 'Corretora', SUSEP: '1234567', Corretora: 'Uma' }
    ]);
    aba.getRange(2, 1, 1, 1).setNumberFormat('0');

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'fora do formato texto');
    contem(falhasEmTexto(laudo), '4.328');
  });

  teste('linha sem Id é atenção — ela existe, só não dá para editar', () => {
    const { ambiente, chamar } = instalacaoNova();
    const aba = ambiente.planilha.getSheetByName('PRODUTOS');
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
    ambiente.propriedades.set('RECC_SEQ_MESAS', 'sei lá');

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'está com lixo');
  });

  secao('A configuração apontando para o vazio');

  teste('mesa apontando para aba que não existe é falha', () => {
    const { chamar } = instalacaoNova();
    const mesa = chamar('lerRegistros_("MESAS")')[0];
    chamar('atualizarRegistro_')('MESAS', mesa.Id, { Aba: 'BASE_QUE_NAO_TEM' });

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'aponta para uma aba que não existe');
  });

  teste('mesa citando coluna que a aba não tem é falha', () => {
    const { chamar } = instalacaoNova();
    const mesa = chamar('lerRegistros_("MESAS")')[0];
    chamar('atualizarRegistro_')('MESAS', mesa.Id,
      { ColunaDoStatus: 'coluna inventada' });

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'cita coluna que a aba não tem');
    contem(falhasEmTexto(laudo), 'coluna inventada');
  });

  teste('a fila em GRUPOS é lida certo — e não acusada de coluna inventada', () => {
    // ColunasDaFila aceita duas escritas: plana e em grupos. Ler só a plana
    // faria o diagnóstico reprovar uma mesa perfeitamente configurada — e um
    // laudo que reclama do que está certo é um laudo que ninguém lê.
    const { chamar } = instalacaoNova();
    const laudo = chamar('diagnosticoRECC()');
    igual(bloco(laudo, 'mesas').situacao, 'ok');

    const mesas = chamar('lerRegistros_("MESAS")');
    const comGrupos = mesas.filter(
      (m) => String(m.ColunasDaFila).indexOf(':') >= 0);
    verdadeiro(comGrupos.length > 0,
      'pelo menos uma mesa de partida usa a escrita em grupos');
  });

  teste('todas as mesas desligadas é falha', () => {
    const { chamar } = instalacaoNova();
    chamar('lerRegistros_("MESAS")').forEach((mesa) => {
      chamar('atualizarRegistro_')('MESAS', mesa.Id, { Ativo: false });
    });

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'Nenhuma mesa está ligada');
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

  teste('gráfico apontando para mesa que não existe é falha', () => {
    const { chamar } = instalacaoNova();
    const componente = chamar('lerRegistros_("PAINEIS")')[0];
    chamar('atualizarRegistro_')('PAINEIS', componente.Id,
      { MesaId: '9999999999' });

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'apontam para mesa que não existe');
  });

  teste('análise apontando para mesa que não existe é falha', () => {
    const { chamar } = instalacaoNova();
    const receita = chamar('lerRegistros_("ANALISES")')[0];
    chamar('atualizarRegistro_')('ANALISES', receita.Id, { MesaId: '9999999999' });

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), 'aponta para mesa que não existe');
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
            escopo: 'PROPRIOS', telas: ['dashboard'], acoes: [],
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
    // últimas N linhas — e o Painel Analítico calculava esse "truncada" e
    // NUNCA mostrava, enquanto Minha Performance nem calculava. Numa base de
    // 200 mil casos, o gráfico mostrava um pedaço e parecia o total.
    const { chamar } = instalacaoNova();
    const ret = chamar('mesasVisiveis_()').find((m) => m.aba === 'BASE_RET');

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

    igual(chamar('resumoDaMesa')(ret.id, {}).truncada, true, 'Dashboard');
    igual(chamar('painelAnalitico')(ret.id, {}, 30).truncada, true,
      'Painel Analítico');
    igual(chamar('minhaPerformance')(ret.id, 30).truncada, true,
      'Minha Performance');

    // E cada uma diz QUANTAS leu, para o aviso ser concreto em vez de vago.
    igual(chamar('painelAnalitico')(ret.id, {}, 30).linhasLidas, 3);
    igual(chamar('minhaPerformance')(ret.id, 30).linhasLidas, 3);
  });

  teste('com a base pequena, nenhuma tela avisa nada', () => {
    // Aviso que aparece sempre é aviso que ninguém lê.
    const { chamar } = instalacaoNova();
    const ret = chamar('mesasVisiveis_()').find((m) => m.aba === 'BASE_RET');
    igual(chamar('resumoDaMesa')(ret.id, {}).truncada, false);
    igual(chamar('painelAnalitico')(ret.id, {}, 30).truncada, false);
    igual(chamar('minhaPerformance')(ret.id, 30).truncada, false);
  });

  teste('as três telas mostram o aviso, e pelo mesmo texto', () => {
    // Três frases diferentes para o mesmo fato é como a operação aprende que
    // uma delas não é séria.
    const pasta = path.join(__dirname, '..', '..', 'Front-End');
    ['Dashboard.html', 'PainelAnalitico.html', 'MinhaPerformance.html']
      .forEach((arquivo) => {
        const tela = fs.readFileSync(path.join(pasta, arquivo), 'utf8');
        verdadeiro(tela.indexOf('Moldura.avisoDeJanela(') >= 0,
          arquivo + ' não mostra o aviso de janela parcial');
      });
    const moldura = fs.readFileSync(path.join(pasta, 'Moldura.html'), 'utf8');
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

    // A prévia responde de dois jeitos: gravando a resposta (o nome aparece
    // como chave) ou recusando com uma frase (o nome entra na lista de
    // gravações recusadas). Os dois valem.
    const semResposta = chamadas.filter(function (nome) {
      return previa.indexOf("'" + nome + "'") < 0
        && previa.indexOf(nome + ': function') < 0;
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
        const js = bloco.replace(/^<script>/, '').replace(/<\/script>$/, '');
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
      'desenharListas', 'desenharMesas', 'desenharGraficos', 'desenharPaineis',
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
    // Caso real, relatado pela operação: o Formulario.html ficou para trás na
    // cópia para o Apps Script, e tudo o que o sistema disse foi "nenhum
    // arquivo html com o nome Formulario foi encontrado", com um número de
    // linha. Nenhum teste pegava isto: os testes leem a PASTA, onde o arquivo
    // está — quem não tinha o arquivo era o PROJETO.
    const { ambiente, chamar } = instalacaoNova();
    ambiente.esconderTela('Formulario');
    ambiente.esconderTela('Graficos');

    const laudo = chamar('diagnosticoRECC()');
    igual(laudo.aprovado, false);
    contem(falhasEmTexto(laudo), '2 arquivo(s) de tela incluídos e ausentes');
    contem(falhasEmTexto(laudo), 'Formulario, Graficos',
      'a lista inteira, e não só o primeiro');
    contem(falhasEmTexto(laudo), 'sem acento',
      'e a regra de nomenclatura, que é metade dos casos');
  });

  teste('o recado do incluir diz o nome, a regra e TODOS que faltam', () => {
    // Descobrir um arquivo por vez é copiar, recarregar, descobrir o próximo,
    // quinze vezes.
    const { ambiente, chamar } = instalacaoNova();
    ambiente.esconderTela('Formulario');
    ambiente.esconderTela('CasoEmModal');
    ambiente.esconderTela('SenhaDeAdministrador');

    const recado = chamar('recadoDoArquivoQueFalta_')('Formulario');
    contem(recado, 'Falta o arquivo HTML "Formulario"');
    contem(recado, 'Front-End/Formulario.html');
    contem(recado, 'sem acento');
    contem(recado, 'No total faltam 3 arquivos');
    contem(recado, 'CasoEmModal');
    contem(recado, 'SenhaDeAdministrador');
  });

  teste('abrir o sistema sem o arquivo estoura com o recado, não com o do Apps Script', () => {
    const { ambiente, chamar } = instalacaoNova();
    ambiente.esconderTela('Formulario');
    lanca(() => chamar('doGet()'), 'Falta o arquivo HTML "Formulario"');
  });

  teste('a conferência rápida também pega o arquivo que ficou para trás', () => {
    // É o que o README promete dela: "diz em segundos se algum arquivo ficou
    // para trás na cópia". Antes deste caso ela só olhava as abas.
    const { ambiente, chamar } = instalacaoNova();
    ambiente.esconderTela('Formulario');

    const texto = chamar('verificarEstruturaRECC()');
    contem(texto, 'ESTRUTURA INCOMPLETA');
    contem(texto, 'FALTAM 1 ARQUIVO(S) DE TELA');
    contem(texto, 'copie Front-End/Formulario.html');
    contem(texto, 'diagnosticoRECC', 'e aponta para a conferência completa');
  });

  teste('com tudo copiado, a conferência rápida diz que está tudo aqui', () => {
    const { chamar } = instalacaoNova();
    const texto = chamar('verificarEstruturaRECC()');
    contem(texto, 'ESTRUTURA OK');
    contem(texto, 'os arquivos de tela do Index estão todos aqui');
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
    const mesa = chamar('lerRegistros_("MESAS")')[0];
    chamar('atualizarRegistro_')('MESAS', mesa.Id, { Aba: 'NAO_EXISTE' });

    const laudo = chamar('diagnosticoRECC()');
    const texto = chamar('laudoEmTexto_')(laudo);
    contem(texto, 'REPROVADO');
    contem(texto, '  X ');
  });
}

module.exports = { rodarTestesDeDiagnostico };
