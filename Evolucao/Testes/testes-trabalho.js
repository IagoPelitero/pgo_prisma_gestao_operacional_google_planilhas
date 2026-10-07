/**
 * ============================================================================
 * PGO — testes-trabalho.js · a Etapa 5
 * ============================================================================
 * O painel só é útil se o número do cartão bater com o que a fila mostra.
 * Boa parte destes testes existe para provar que cartão e fila saem da MESMA
 * lista, já filtrada pelo alcance do nível.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario,
  ehData, lerPeca, scriptDaPeca, pecaRodando } = require('./ferramentas');

function rodarTestesDoTrabalho() {
  console.log('\nEtapa 5 — Trabalho');

  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');

  const canal = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_MESA');
  const hoje = new Date();
  const comZero = (n) => (n < 10 ? '0' : '') + n;
  const escrever = (data) => comZero(data.getDate()) + '/'
    + comZero(data.getMonth() + 1) + '/' + data.getFullYear();

  function diasAtras(dias) {
    const data = new Date();
    data.setDate(data.getDate() - dias);
    return escrever(data);
  }

  /**
   * O valor de uma coluna, numa linha da fila, procurando pelo nome.
   * Pela posição, cada mudança de agrupamento quebraria os testes sem que
   * nada tivesse quebrado de verdade.
   */
  function valorNaFila(resumo, linha, cabecalho) {
    let achado;
    resumo.fila[linha].celulas.forEach((grupo) => {
      grupo.forEach((celula) => {
        if (celula.cabecalho === cabecalho) achado = celula.valor;
      });
    });
    return achado;
  }

  secao('Os cartões');

  teste('base vazia entrega zeros, não uma tela quebrada', () => {
    const resumo = chamar('resumoDoCanal')(canal.id, {});
    igual(resumo.total, 0);
    igual(resumo.fila.length, 0);
    igual(resumo.cartoes[0].rotulo, 'Total de casos');
    igual(resumo.cartoes[0].valor, 0);
  });

  teste('cado canal tem os seus cartões, declarados em PAINEIS', () => {
    // A Mesa Diamante tem menos demanda que a RET: sete cartões para poucos
    // casos é ruído. Cada cartão é uma LINHA de PAINEIS, com nome, cor e
    // ordem próprios — não um texto separado por vírgula dentro do canal.
    const rotulos = chamar('resumoDoCanal')(canal.id, {}).cartoes.map((c) => c.rotulo);
    igual(rotulos.join(' | '),
      'Total de casos | Em andamento | Concluído | Finalizados na célula');

    const ret = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');
    const daRet = chamar('resumoDoCanal')(ret.id, {}).cartoes.map((c) => c.rotulo);
    igual(daRet.join(' | '),
      'Total de casos | Aguardando transmissão | Pendente | 1º contato realizado'
      + ' | 2º contato realizado | Não trabalhado',
      'o total mais as cinco situações que ainda pedem trabalho');
  });

  teste('desligar um cartão tira ele da tela e não toca em caso nenhum', () => {
    const painel = chamar('listarCardsDoPainel')('trabalho', canal.id);
    igual(painel.cartoes.length, 4);

    const antes = chamar('resumoDoCanal')(canal.id, {}).total;
    const sobrando = painel.cartoes.filter((c) => c.dimensao !== 'naCelula');
    chamar('salvarCardsDoPainel')('trabalho', canal.id, sobrando);

    const depois = chamar('resumoDoCanal')(canal.id, {});
    igual(depois.cartoes.length, 3, 'o cartão sumiu da tela');
    igual(depois.total, antes, 'e os casos continuam todos lá');

    // E volta, porque a linha não foi apagada — foi desligada.
    chamar('salvarCardsDoPainel')('trabalho', canal.id, painel.cartoes);
    igual(chamar('resumoDoCanal')(canal.id, {}).cartoes.length, 4);
  });

  teste('cartão além do teto, sem nome ou de situação inventada é recusado', () => {
    const painel = chamar('listarCardsDoPainel')('trabalho', canal.id);
    igual(painel.maximo, 12);

    const demais = [];
    for (let i = 0; i < 13; i++) {
      demais.push({ titulo: 'Card ' + i, dimensao: 'total', cor: 'neutro' });
    }
    lanca(() => chamar('salvarCardsDoPainel')('trabalho', canal.id, demais),
      'no máximo 12');
    lanca(() => chamar('salvarCardsDoPainel')('trabalho', canal.id,
      [{ titulo: '', dimensao: 'total' }]), 'precisa de um nome');
    lanca(() => chamar('salvarCardsDoPainel')('trabalho', canal.id,
      [{ titulo: 'X', dimensao: 'situacao', filtro: 'Inventada' }]),
      'não existe no canal');
  });

  teste('cor inventada na planilha vira neutro, e não quebra a tela', () => {
    igual(chamar('tomValido_')('arco-íris'), 'neutro');
    igual(chamar('tomValido_')(''), 'neutro');
    igual(chamar('tomValido_')('BOM'), 'bom', 'a comparação ignora caixa');
  });

  teste('há um cartão por situação, e situação sem caso aparece zerada', () => {
    // Sumir do painel esconderia justamente a informação de que ela zerou.
    chamar('inserirVariosRegistros_')('BASE_MESA', [
      { Analista: 'Ana Martins', Status: 'Em andamento',
        'Data de entrada': escrever(hoje), 'Nome do segurado': 'Cliente 1' },
      { Analista: 'Ana Martins', Status: 'Em andamento',
        'Data de entrada': escrever(hoje), 'Nome do segurado': 'Cliente 2' },
      { Analista: 'Diego Castilho', Status: 'Concluído',
        'Data de entrada': escrever(hoje), 'Nome do segurado': 'Cliente 3',
        'Data da finalização': escrever(hoje) }
    ]);

    const resumo = chamar('resumoDoCanal')(canal.id, {});
    const porRotulo = {};
    resumo.cartoes.forEach((c) => { porRotulo[c.rotulo] = c.valor; });

    igual(porRotulo['Total de casos'], 3);
    igual(porRotulo['Em andamento'], 2);
    igual(porRotulo['Concluído'], 1);

    // Na RET, que mostra todas, dá para conferir a situação sem nenhum caso.
    const ret = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');
    const daRet = {};
    chamar('resumoDoCanal')(ret.id, {}).cartoes
      .forEach((c) => { daRet[c.rotulo] = c.valor; });
    igual(daRet['Aguardando transmissão'], 0,
      'situação sem caso vale zero, não some');
    verdadeiro(!Object.prototype.hasOwnProperty.call(daRet, 'Concluído'),
      'a RET não abre com cartão de concluído: o painel é o que falta fazer');
  });

  teste('cada situação leva a sua cor para o cartão e para a fila', () => {
    // A cor mora no CATALOGO como NOME de tom, e não como código: cada tema
    // pinta o seu verde. Gravar #15794A deixaria o verde do tema claro
    // aparecendo no escuro.
    const resumo = chamar('resumoDoCanal')(canal.id, {});
    const porRotulo = {};
    resumo.cartoes.forEach((c) => { porRotulo[c.rotulo] = c.tom; });
    igual(porRotulo['Em andamento'], 'atencao');
    igual(porRotulo['Concluído'], 'bom');

    resumo.fila.forEach((caso) => {
      verdadeiro(chamar('RECC_TONS').indexOf(caso.tom) >= 0,
        'tom desconhecido na fila: ' + caso.tom);
    });
    igual(resumo.fila.find((c) => c.situacao === 'Em andamento').tom, 'atencao');
    igual(resumo.fila.find((c) => c.situacao === 'Concluído').tom, 'bom');
  });

  teste('"finalizado na célula" conta o que não foi encaminhado', () => {
    // Finalização preenchida E área responsável vazia. É conta, não coluna:
    // assim não mente quando alguém edita a área direto na planilha.
    igual(chamar('resumoDoCanal')(canal.id, {}).cartoes
      .find((c) => c.chave === 'naCelula').valor, 1);

    chamar('inserirRegistro_')('BASE_MESA', {
      Analista: 'Ana Martins', Status: 'Concluído',
      'Data de entrada': escrever(hoje), 'Nome do segurado': 'Encaminhado',
      'Data da finalização': escrever(hoje), 'Área responsável': 'Sinistro'
    });

    igual(chamar('resumoDoCanal')(canal.id, {}).cartoes
      .find((c) => c.chave === 'naCelula').valor, 1,
      'o encaminhado não conta como resolvido na célula');
  });

  teste('o canal que não declara as colunas não ganha o cartão', () => {
    const ret = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');
    const resumo = chamar('resumoDoCanal')(ret.id, {});
    verdadeiro(!resumo.cartoes.some((c) => c.chave === 'naCelula'),
      'cartão sempre zerado pareceria um problema — melhor não existir');
  });

  secao('O período e a fila');

  teste('a fila mostra só a janela recente, e o mais novo primeiro', () => {
    chamar('inserirRegistro_')('BASE_MESA', {
      Analista: 'Ana Martins', Status: 'Em andamento',
      'Data de entrada': diasAtras(90), 'Nome do segurado': 'Caso antigo'
    });

    const resumo = chamar('resumoDoCanal')(canal.id, {});
    igual(resumo.periodo.dias, 30);
    verdadeiro(!JSON.stringify(resumo.fila).includes('Caso antigo'),
      'fora da janela não aparece na fila');
    igual(valorNaFila(resumo, 0, 'Nome do segurado'), 'Encaminhado',
      'o registro mais recente encabeça a fila');
  });

  teste('a fila vem em grupos, com várias colunas debaixo de um título', () => {
    // Um caso da RET tem trinta e cinco colunas. Seis lado a lado perdem o
    // resto; trinta e cinco não cabem. Juntar as que se leem de uma vez —
    // proposta com apólice, nome com CPF — resolve as duas coisas.
    const resumo = chamar('resumoDoCanal')(canal.id, {});
    igual(resumo.colunas.map((g) => g.titulo).join(' | '),
      'Situação | Dados do caso | Dados cadastrais | Corretora | Responsável');
    igual(resumo.colunas[0].colunas.map((c) => c.cabecalho).join(', '),
      'Data de entrada, Status');
    verdadeiro(resumo.colunas[0].colunas[1].ehStatus,
      'a coluna de situação se identifica dentro do grupo');
  });

  teste('a escrita plana continua valendo, e vira um grupo por coluna', () => {
    const ret = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');
    chamar('salvarCanal')({ id: ret.id, nome: ret.nome,
      colunaDaData: ret.colunaDaData, colunaDoStatus: ret.colunaDoStatus,
      colunasDaFila: 'nome do cliente, status, protocolo' });

    const grupos = chamar('resumoDoCanal')(ret.id, {}).colunas;
    igual(grupos.map((g) => g.titulo).join(' | '),
      'nome do cliente | status | protocolo',
      'sem dois-pontos, cada coluna é um grupo com o próprio nome');
    igual(grupos[0].colunas.length, 1);
  });

  teste('coluna que não existe some da fila em vez de derrubar a tela', () => {
    const ret = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');
    // Direto na planilha, como alguém faria à mão — sem passar por salvarCanal,
    // que recusaria. A fila é leitura: derrubar o Trabalho inteiro porque
    // uma coluna foi renomeada seria pior do que mostrar o resto.
    chamar('atualizarRegistro_')('CANAIS', ret.id,
      { ColunasDaFila: 'Cliente: nome do cliente, coluna que nao existe' });
    const grupos = chamar('resumoDoCanal')(ret.id, {}).colunas;
    igual(grupos.length, 1);
    igual(grupos[0].colunas.map((c) => c.cabecalho).join(', '), 'nome do cliente');
  });

  teste('a data chega à tela como texto, e no formato brasileiro', () => {
    // Um objeto de data atravessando a ponte chega com o fuso de quem abriu,
    // e o mesmo caso apareceria com dias diferentes para pessoas diferentes.
    const primeira = valorNaFila(chamar('resumoDoCanal')(canal.id, {}), 0,
      'Data de entrada');
    igual(typeof primeira, 'string');
    verdadeiro(/^\d{2}\/\d{2}\/\d{4}$/.test(primeira), 'veio ' + primeira);
  });

  teste('a variação compara com o período anterior, e cala quando não dá', () => {
    // Mostrar "+100%" porque saiu de zero é ruído que a operação aprende a
    // ignorar — e junto com ele ignora a variação que importa.
    const total = chamar('resumoDoCanal')(canal.id, {}).cartoes[0];
    igual(total.anterior, 0, 'não havia nada no período anterior');
    igual(total.variacao, null, 'sem base de comparação, não há variação');

    // Agora com base: um caso no período anterior, quatro no atual.
    chamar('inserirRegistro_')('BASE_MESA', {
      Analista: 'Ana Martins', Status: 'Em andamento',
      'Data de entrada': diasAtras(40), 'Nome do segurado': 'Do mês passado'
    });
    const comBase = chamar('resumoDoCanal')(canal.id, {}).cartoes[0];
    igual(comBase.anterior, 1);
    igual(comBase.variacao, 300, 'de 1 para 4 são +300%');
  });

  secao('A tela');

  teste('a linha tem Trabalhar no caso, Alterar status e Excluir — nesta ordem', () => {
    /*
     * Pedido do PO: "ao invés de ver detalhes substitua pelo nome de trabalhar
     * no caso e ele irá já abrir a opção de editar", o lápis vira "alterar
     * status", e excluir vem por último. A leitura do caso saiu do sistema.
     */
    const fs = require('fs');
    const path = require('path');
    const pasta = path.join(__dirname, '..', '..', 'Front-End');
    const dashboard = fs.readFileSync(path.join(pasta, 'Trabalho.html'), 'utf8');
    const acoes = dashboard.slice(dashboard.indexOf('function acoesDaLinha'),
      dashboard.indexOf('function desenharPainel'));

    const trabalhar = acoes.indexOf('Trabalhar no caso');
    const status = acoes.indexOf('title="Alterar status"');
    const excluir = acoes.indexOf('data-excluir');
    verdadeiro(trabalhar > 0 && status > trabalhar && excluir > status,
      'a ordem tem de ser Trabalhar no caso, Alterar status, Excluir');
    verdadeiro(acoes.indexOf('Ver detalhes') < 0, 'o "Ver detalhes" saiu');
    verdadeiro(acoes.indexOf('data-editar') < 0, 'e o lápis também');

    contem(dashboard, "CasoEmModal.abrir(canalEscolhida, botao.getAttribute('data-trabalhar')",
      'Trabalhar no caso abre o modal');
    contem(dashboard, 'CasoEmModal.trocarSituacao(canalEscolhida',
      'Alterar status abre o diálogo de status, sem o formulário inteiro');
    contem(dashboard, 'Formulario.confirmarExclusao(idDoCaso, function',
      'e excluir pergunta antes, no aviso de atenção');
  });

  teste('o modal abre JÁ NA EDIÇÃO — não há mais estado de leitura', () => {
    const modal = lerPeca('CasoEmModal');
    contem(modal, "Servidor.chamar('casoParaEditar'");
    contem(modal, "Servidor.chamar('editarCaso'");
    contem(modal, "Servidor.chamar('alterarSituacaoDoCaso'");
    verdadeiro(modal.indexOf("'detalhesDoCaso'") < 0,
      'nenhuma chamada à leitura, que saiu do servidor');
    verdadeiro(modal.indexOf('desenharLeitura') < 0, 'nem o desenho dela');

    // Quatro saídas do modal: Esc, o X, o botão e clicar fora. Modal que
    // prende é modal que a pessoa aprende a não abrir.
    contem(modal, "evento.key === 'Escape'");
    contem(modal, "id=\"modal-x\"");
    contem(modal, "id=\"modal-fechar\"");
    contem(modal, 'evento.target === caixa');
  });

  teste('o Salvar do modal nasce travado e só destrava com o formulário preenchido', () => {
    // A regra que o PO pediu para o cadastro: botão que aparece antes do
    // formulário é botão que alguém clica — e aqui gravaria um caso vazio.
    const modal = lerPeca('CasoEmModal');
    contem(modal, 'id="modal-salvar" disabled', 'nasce travado');
    const chegou = modal.slice(modal.indexOf('function quandoAsDuasChegarem'),
      modal.indexOf('function falhou'));
    verdadeiro(chegou.indexOf("elemento('modal-salvar').disabled = false")
      > chegou.indexOf('Formulario.preencher'),
      'destrava só DEPOIS de preencher');
    contem(modal, "if (!corpo || elemento('modal-salvar').disabled) return;",
      'o Ctrl+Enter não passa por cima do botão travado');
  });

  teste('a leitura saiu também do servidor', () => {
    verdadeiro(typeof chamar('typeof detalhesDoCaso === "undefined" ? undefined : 1') === 'undefined',
      'detalhesDoCaso não existe mais');
    verdadeiro(typeof chamar('typeof historicoDoCaso_ === "undefined" ? undefined : 1') === 'undefined',
      'nem o histórico, que só ela usava');
  });

  secao('Os filtros');

  teste('os filtros são os campos que já são lista — nada escrito em código', () => {
    const resumo = chamar('resumoDoCanal')(canal.id, {});
    verdadeiro(resumo.filtrosDisponiveis.length > 0);
    verdadeiro(resumo.filtrosDisponiveis.length <= 4, 'no máximo quatro na tela');
    verdadeiro(resumo.filtrosDisponiveis.some((f) => f.chave === 'status'));
  });

  teste('filtrar muda o cartão e a fila juntos', () => {
    const resumo = chamar('resumoDoCanal')(canal.id, { status: 'Em andamento' });
    igual(resumo.total, 2);
    igual(resumo.fila.length, 2);
    igual(resumo.cartoes[0].valor, 2, 'o total acompanha o filtro');
    igual(resumo.totalNoPeriodo, 4, 'e o período inteiro continua visível');
  });

  teste('filtro sem valor não filtra nada', () => {
    igual(chamar('resumoDoCanal')(canal.id, { status: '' }).total, 4);
  });

  secao('O alcance vale no painel');

  teste('quem enxerga só os próprios casos tem cartões só dos dele', () => {
    // Cartão contando caso que a fila não mostra faria a pessoa procurar um
    // registro que nunca vai aparecer.
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    chamar('salvarUsuario')({
      nome: 'Ana Martins', email: 'ana@exemplo.com',
      nivelAcessoId: operacao.Id, ativo: true
    });

    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      const resumo = chamar('resumoDoCanal')(canal.id, {});
      igual(resumo.escopo, 'PROPRIOS');
      igual(resumo.cartoes[0].valor, 3, 'os três casos da Ana no período');
      igual(resumo.fila.length, 3, 'e a fila mostra exatamente os mesmos');
      // Excluir não tem mais bandeira de permissão: qualquer pessoa
      // cadastrada exclui, em qualquer canal, por decisão do PO. Mandar um
      // `podeOcultar` que a tela não usa e o servidor não checa seria uma
      // bandeira que mente — pior que bandeira nenhuma.
      igual(resumo.podeOcultar, undefined,
        'excluir não depende mais de permissão');
    });
  });

  teste('quem não tem a tela no menu não abre o painel pelo endereço', () => {
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    const configuracao = JSON.parse(operacao.Configuracao);
    const guardadas = configuracao.telas;
    configuracao.telas = ['cadastrarCaso'];
    chamar('atualizarRegistro_')('CATALOGO', operacao.Id, {
      Configuracao: JSON.stringify(configuracao)
    });

    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      lanca(() => chamar('resumoDoCanal')(canal.id, {}), 'não abre a tela trabalho');
    });

    configuracao.telas = guardadas;
    chamar('atualizarRegistro_')('CATALOGO', operacao.Id, {
      Configuracao: JSON.stringify(configuracao)
    });
  });

  secao('Abrir e ocultar um caso');

  teste('Trabalhar no caso traz todos os campos, inclusive os em branco', () => {
    // Campo vazio vem como caixa vazia, e não sumindo: sumir faria a pessoa
    // achar que aquele campo não existe neste canal.
    const primeiro = chamar('resumoDoCanal')(canal.id, {}).fila[0];
    const aberto = chamar('casoParaEditar')(canal.id, primeiro.id);
    const chaves = Object.keys(aberto.valores);

    verdadeiro(chaves.length > 0);
    verdadeiro(chaves.some((chave) => aberto.valores[chave] === ''),
      'o caso de exemplo tem campo em branco, e ele precisa vir');
    verdadeiro(Array.isArray(aberto.doSistema), 'e o resto da planilha, como leitura');
  });

  teste('trocar o status é um gesto só, e NÃO vai para a auditoria', () => {
    const novo = chamar('cadastrarCaso')(canal.id, {
      analista: 'Ana Martins', status: 'Em andamento',
      datadeentrada: escrever(hoje), nomedosegurado: 'Caso da troca'
    });

    const opcoes = chamar('situacoesParaTrocar')(canal.id, novo.id);
    igual(opcoes.atual, 'Em andamento');
    verdadeiro(opcoes.opcoes.some((o) => o.valor === 'Concluído'));

    chamar('alterarSituacaoDoCaso')(canal.id, novo.id, 'Concluído');

    const gravado = chamar('buscarRegistros_')('BASE_MESA', 'Id', String(novo.id), 1)[0];
    igual(gravado.Status, 'Concluído');

    // Troca de status é o evento mais frequente do sistema: um caso passa por
    // quatro ou cinco antes de fechar. Guardar cada uma na auditoria são
    // quase um milhão de linhas numa base de 200 mil casos, numa aba da qual
    // ninguém tira relatório. O que interessa — QUANDO cada etapa aconteceu —
    // passou a ser carimbado na própria linha do caso.
    verdadeiro(!chamar('lerRegistros_("AUDITORIA")').some((linha) =>
      String(linha.Acao) === 'caso.status'
        && String(linha.RegistroId) === String(novo.id)),
    'a troca de status não deve entrar na auditoria');

    lanca(() => chamar('alterarSituacaoDoCaso')(canal.id, novo.id, 'Inventada'),
      'não existe no canal');
  });

  teste('o status carimba data e hora na coluna que ele declarou', () => {
    // É o que mede produtividade: na RET interessa quando o 1º contato
    // aconteceu; na Mesa Diamante, quando o caso foi concluído.
    chamar('adicionarColuna_')(canal.aba, 'Data do 1o contato', 'dataHora');

    const concluido = chamar('lerRegistros_("CATALOGO")').find((item) =>
      item.Tipo === 'STATUS' && item.Nome === 'Concluído'
      && String(item.CanalId) === String(canal.id));
    chamar('atualizarRegistro_')('CATALOGO', concluido.Id,
      { ColunaDeCarimbo: 'Data do 1o contato' });

    const novo = chamar('cadastrarCaso')(canal.id, {
      analista: 'primeiro.adm', status: 'Em andamento',
      datadeentrada: escrever(hoje), nomedosegurado: 'Caso do carimbo'
    });
    chamar('alterarSituacaoDoCaso')(canal.id, novo.id, 'Concluído');

    const gravado = chamar('buscarRegistros_')(canal.aba, 'Id', novo.id, 1)[0];
    // ehData, e não instanceof: o valor atravessa o vm do simulador, e um
    // Date de outro contexto não é instanceof Date aqui. Já mordeu antes.
    verdadeiro(ehData(gravado['Data do 1o contato']),
      'o carimbo tem de ser data de verdade, não texto — o Power BI soma data');
  });

  teste('voltar ao mesmo status NÃO reescreve o carimbo', () => {
    // O que interessa é quando aquilo aconteceu pela PRIMEIRA vez.
    // Reescrever apagaria justamente o dado que se quer medir, em silêncio.
    const novo = chamar('cadastrarCaso')(canal.id, {
      analista: 'primeiro.adm', status: 'Em andamento',
      datadeentrada: escrever(hoje), nomedosegurado: 'Caso do recarimbo'
    });
    chamar('alterarSituacaoDoCaso')(canal.id, novo.id, 'Concluído');
    const primeiro = chamar('buscarRegistros_')(canal.aba, 'Id', novo.id, 1)[0]['Data do 1o contato'];

    chamar('alterarSituacaoDoCaso')(canal.id, novo.id, 'Em andamento');
    chamar('alterarSituacaoDoCaso')(canal.id, novo.id, 'Concluído');
    const depois = chamar('buscarRegistros_')(canal.aba, 'Id', novo.id, 1)[0]['Data do 1o contato'];

    igual(String(depois), String(primeiro), 'o primeiro carimbo tem de sobreviver');
  });

  teste('trocar o status pelo FORMULÁRIO carimba igual ao diálogo', () => {
    // Os dois testes acima usam só o diálogo — e foi por isso que o defeito
    // passou: o carimbo existia, o teste provava que existia, e quem editasse
    // pelo lápis não carimbava nada. Mesmo caso, mesma situação, registro
    // diferente conforme onde a pessoa clicou.
    const novo = chamar('cadastrarCaso')(canal.id, {
      analista: 'primeiro.adm', status: 'Em andamento',
      datadeentrada: escrever(hoje), nomedosegurado: 'Caso editado pelo lápis'
    });

    chamar('editarCaso')(canal.id, novo.id, {
      analista: 'primeiro.adm', status: 'Concluído',
      datadeentrada: escrever(hoje), nomedosegurado: 'Caso editado pelo lápis'
    });

    const gravado = chamar('buscarRegistros_')(canal.aba, 'Id', novo.id, 1)[0];
    verdadeiro(ehData(gravado['Data do 1o contato']),
      'a edição pelo formulário tem de carimbar também');
  });

  teste('as duas portas deixam o MESMO registro', () => {
    // O que se cobra aqui não é cada coluna: é que a escolha da porta não
    // apareça no dado. Se um dia aparecer, esta comparação diz em qual coluna.
    const molde = (nome) => ({
      analista: 'primeiro.adm', status: 'Em andamento',
      datadeentrada: escrever(hoje), nomedosegurado: nome
    });

    const peloDialogo = chamar('cadastrarCaso')(canal.id, molde('Pelo diálogo'));
    chamar('alterarSituacaoDoCaso')(canal.id, peloDialogo.id, 'Concluído');

    const peloFormulario = chamar('cadastrarCaso')(canal.id, molde('Pelo formulário'));
    const comStatusNovo = molde('Pelo formulário');
    comStatusNovo.status = 'Concluído';
    chamar('editarCaso')(canal.id, peloFormulario.id, comStatusNovo);

    const um = chamar('buscarRegistros_')(canal.aba, 'Id', peloDialogo.id, 1)[0];
    const outro = chamar('buscarRegistros_')(canal.aba, 'Id', peloFormulario.id, 1)[0];

    ['Data do 1o contato', 'Quem mudou o status', 'Mudanças de status']
      .forEach((coluna) => {
        if (um[coluna] === undefined) return;   // coluna que este canal não tem
        const temUm = String(um[coluna] || '') !== '';
        const temOutro = String(outro[coluna] || '') !== '';
        igual(temOutro, temUm, coluna + ' tem de ficar igual pelas duas portas');
      });
  });

  teste('salvar sem mexer na situação NÃO conta uma andada', () => {
    // O contador responde "quantas vezes este caso andou". Salvar o formulário
    // para corrigir um telefone não é uma andada, e contar faria o caso
    // parecer muito mais trabalhado do que foi.
    const novo = chamar('cadastrarCaso')(canal.id, {
      analista: 'primeiro.adm', status: 'Em andamento',
      datadeentrada: escrever(hoje), nomedosegurado: 'Caso só corrigido'
    });
    const antes = chamar('buscarRegistros_')(canal.aba, 'Id', novo.id, 1)[0]['Mudanças de status'];

    chamar('editarCaso')(canal.id, novo.id, {
      analista: 'primeiro.adm', status: 'Em andamento',
      datadeentrada: escrever(hoje), nomedosegurado: 'Caso só corrigido, com o nome certo'
    });
    const depois = chamar('buscarRegistros_')(canal.aba, 'Id', novo.id, 1)[0]['Mudanças de status'];

    igual(String(depois || ''), String(antes || ''), 'mesma situação, mesmo contador');
  });

  teste('o caso já NASCE com a situação carimbada', () => {
    // Sem isto, um caso cadastrado hoje em "Não trabalhado" só ganhava data
    // quando alguém trocasse a situação pela primeira vez — e até lá a
    // Produtividade RECC não sabia que ele existia naquela situação.
    const novo = chamar('cadastrarCaso')(canal.id, {
      analista: 'primeiro.adm', status: 'Concluído',
      datadeentrada: escrever(hoje), nomedosegurado: 'Caso nascido concluído'
    });

    const gravado = chamar('buscarRegistros_')(canal.aba, 'Id', novo.id, 1)[0];
    verdadeiro(ehData(gravado['Data do 1o contato']),
      'a situação de nascimento também é uma chegada, e tem hora');
  });

  secao('Trabalhar no caso traz TUDO o que está preenchido');

  /*
    O PO abriu um caso da RET e não viu o que estava gravado. A causa era uma
    só, com três caras: um campo pode morar em MAIS DE UMA coluna da planilha,
    e quem lia pegava uma coluna só.

    O pior dos três não era nem o que ele viu: um caso da RET com produto não
    conseguia ser SALVO. A edição devolvia "1101" para um seletor cuja lista
    só tem "1101 - VIDA INDIVIDUAL", e salvar era recusado — num campo que a
    pessoa nem tinha tocado.
  */

  function umCasoDaRetCompleto(chamarOServidor) {
    const daRet = chamarOServidor('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    const salvo = chamarOServidor('cadastrarCaso')(daRet.id, {
      nomedocliente: 'Monkey D. Luffy',
      numerodaproposta: '58-0000000',
      numapolice: '12-1391-0000000',
      codproduto: '1101 - VIDA INDIVIDUAL',
      susep: 'RET00J',
      status: 'Não trabalhado'
    });
    return { daRet: daRet, id: String(salvo.id || salvo) };
  }

  teste('a proposta e a apólice voltam INTEIRAS, e não só um pedaço', () => {
    const { daRet, id } = umCasoDaRetCompleto(chamar);

    // Na planilha estão partidas — é o que o PO pediu, para o Power BI.
    const linha = chamar('buscarRegistros_')('BASE_RET', 'Id', id, 1)[0];
    igual(String(linha['Código origem da proposta']), '58');
    igual(String(linha['número da proposta']), '0000000');

    // Mas na tela voltam juntas, do jeito que ele digitou.
    const aberto = chamar('casoParaEditar')(daRet.id, id);
    igual(aberto.valores.numerodaproposta, '58-0000000', 'e não só "0000000"');
    igual(aberto.valores.numapolice, '12-1391-0000000');
  });

  teste('o produto volta com o código E o nome', () => {
    const { daRet, id } = umCasoDaRetCompleto(chamar);
    const aberto = chamar('casoParaEditar')(daRet.id, id);
    igual(aberto.valores.codproduto, '1101 - VIDA INDIVIDUAL', 'e não só "1101"');
  });

  teste('abrir e salvar sem mexer em nada não recusa e não perde coluna', () => {
    // O defeito que travava o trabalho: salvar era RECUSADO por um campo que
    // a pessoa não tocou, porque a edição devolvia metade do valor dele.
    const { daRet, id } = umCasoDaRetCompleto(chamar);
    const vindo = chamar('casoParaEditar')(daRet.id, id);

    igual(vindo.valores.codproduto, '1101 - VIDA INDIVIDUAL');
    chamar('editarCaso')(daRet.id, id, vindo.valores);

    const depois = chamar('buscarRegistros_')('BASE_RET', 'Id', id, 1)[0];
    igual(String(depois['cod produto']), '1101', 'o código continua lá');
    igual(String(depois.produto), 'VIDA INDIVIDUAL', 'e o nome também');
    igual(String(depois['Código origem da proposta']), '58');
    igual(String(depois['cod_ramo']), '1391');
  });

  teste('coluna preenchida que o formulário não pergunta também aparece', () => {
    /*
      Palavra do PO: "precisa trazer todos os dados que foram preenchidos na
      planilha". Um caso importado chega com valor em colunas que o formulário
      não pergunta — a origem da importação, a data dela, os carimbos. Antes
      disto esse conteúdo ficava invisível.
    */
    const daRet = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    const novo = chamar('inserirRegistro_')('BASE_RET', {
      'nome do cliente': 'Nami', analista: 'Ana', status: 'Não trabalhado',
      'Origem da importação': 'Base de inadimplentes set/2026',
      'Quem mudou o status': 'Ana'
    });

    const extras = chamar('casoParaEditar')(daRet.id, String(novo.id)).doSistema;

    const origem = extras.find((l) => l.rotulo === 'Origem da importação');
    verdadeiro(origem !== undefined, 'a origem da importação tem de aparecer');
    igual(origem.valor, 'Base de inadimplentes set/2026');
  });

  teste('coluna VAZIA que ninguém declarou NÃO entope a tela', () => {
    // A BASE_RET tem quase cinquenta colunas. Listar as vazias que o
    // formulário não pergunta encheria o detalhe de travessões e esconderia
    // justamente o que está preenchido.
    const daRet = chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    const novo = chamar('inserirRegistro_')('BASE_RET', {
      'nome do cliente': 'Chopper', analista: 'Ana', status: 'Não trabalhado'
    });
    const extras = chamar('casoParaEditar')(daRet.id, String(novo.id)).doSistema;
    verdadeiro(extras.every((l) => String(l.valor).trim() !== ''),
      'só coluna COM valor entra nesta seção');
  });

  teste('a coluna que um campo já mostra não aparece DUAS vezes', () => {
    // Sem esta guarda, a proposta sairia como campo ("58-0000000") e também
    // como coluna solta ("58"), e quem lê não saberia qual é a verdadeira.
    const { daRet, id } = umCasoDaRetCompleto(chamar);
    const extras = chamar('casoParaEditar')(daRet.id, id).doSistema;

    ['Código origem da proposta', 'número da proposta', 'cod_sucursal',
     'cod_ramo', 'Num_apolice', 'cod produto', 'produto'
    ].forEach((cabecalho) => {
      verdadeiro(!extras.some((l) => l.rotulo === cabecalho),
        cabecalho + ' já é mostrada pelo campo, não pode repetir');
    });
  });

  teste('as colunas de controle nunca aparecem', () => {
    const { daRet, id } = umCasoDaRetCompleto(chamar);
    const extras = chamar('casoParaEditar')(daRet.id, id).doSistema;
    verdadeiro(extras.every((l) => String(l.rotulo).charAt(0) !== '_'),
      '_Visivel, _ExcluidoEm e _Origem são do sistema, não do caso');
    verdadeiro(!extras.some((l) => l.rotulo === 'Id'),
      'o Id já vem no título do caso');
  });

  teste('campo OCULTO para o nível não vaza pela lista de leitura', () => {
    /*
     * A lista de leitura mostra o que o formulário não mostra. Um campo
     * escondido do nível também não aparece no formulário — e sem cuidado
     * reapareceria aqui, como "coluna que o formulário não pergunta".
     */
    const { daRet, id } = umCasoDaRetCompleto(chamar);
    const operacao = chamar('lerRegistros_("CATALOGO")')
      .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
    const configuracao = JSON.parse(operacao.Configuracao);
    configuracao.campos = { nomedocliente: 'oculto' };
    chamar('atualizarRegistro_')('CATALOGO', operacao.Id,
      { Configuracao: JSON.stringify(configuracao) });
    chamar('salvarUsuario')({ nome: 'Nami Souza', email: 'nami.oculto@exemplo.com',
      nivelAcessoId: operacao.Id, canalId: daRet.id, ativo: true });
    chamar('atualizarRegistro_')('BASE_RET', id, { analista: 'Nami Souza' });

    comoUsuario(ambiente, 'nami.oculto@exemplo.com', () => {
      const aberto = chamar('casoParaEditar')(daRet.id, id);
      verdadeiro(!aberto.doSistema.some((l) => l.rotulo === 'nome do cliente'),
        'o nome do cliente está oculto para este nível');
    });
  });

  secao('O controle de produtividade da RET');

  /*
   * Os testes acima provam o MECANISMO do carimbo, numa coluna criada à mão no
   * meio do teste. Os de baixo provam a INSTALAÇÃO de fábrica da RET: que os
   * oito status que o instalador semeia apontam para colunas que existem de
   * verdade na BASE_RET.
   *
   * São perguntas diferentes, e a segunda já falhou calada uma vez: um status
   * pode apontar para "Data do 1o contato" enquanto a coluna se chama "Data do
   * 1º contato", e aí carimbarOStatus_ ignora — de propósito, para não impedir
   * o caso de ser salvo. O resultado é um sistema que grava o status e não
   * grava a hora, sem reclamar de nada.
   */

  const ret = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');

  function casoNovoDaRet(nome) {
    return chamar('cadastrarCaso')(ret.id, {
      status: 'Não trabalhado', nomedocliente: nome
    });
  }

  function linhaDaRet(id) {
    return chamar('buscarRegistros_')('BASE_RET', 'id', id, 1)[0];
  }

  teste('todo status de fábrica da RET aponta para uma coluna que existe', () => {
    const estrutura = chamar('estruturaDaAba_')('BASE_RET');
    const statusDaRet = chamar('lerRegistros_("CATALOGO")').filter((item) =>
      item.Tipo === 'STATUS' && String(item.CanalId) === String(ret.id));

    igual(statusDaRet.length, 10, 'os dez status que a operação pediu');
    verdadeiro(!statusDaRet.some((item) => item.Nome === 'Concluído'),
      'a RET não tem "Concluído" — palavra do PO: esse status não existe lá');

    // Os cinco DESFECHOS fecham o caso, palavra do PO: "um caso concluído é
    // cancelado, pago, não retido, retido ou sem sucesso de contato".
    const finais = statusDaRet.filter((item) => String(item.Final) === 'SIM')
      .map((item) => item.Nome);
    igual(finais.join(', '),
      'Não retido, Retido, Sem sucesso de contato, Cancelado, Pago');

    // Quatro não carimbam. "Não trabalhado" é o estado de nascimento, e
    // carimbar a hora em que o caso entrou repetiria a data de recepção. Os
    // outros três o PO pediu sem coluna de data — criar uma coluna que ninguém
    // pediu enche a base para medir o que a operação não decidiu medir.
    const semCarimbo = statusDaRet.filter((item) =>
      !String(item.ColunaDeCarimbo || '').trim()).map((item) => item.Nome);
    igual(semCarimbo.join(', '),
      'Não trabalhado, Sem sucesso de contato, Cancelado, Pago');

    const semSucesso = statusDaRet.find((item) => item.Nome === 'Sem sucesso de contato');
    igual(String(semSucesso.Cor), 'atencao',
      'laranja, como o PO pediu — e pelo TOM, que segue o tema, nunca por uma '
      + 'cor escrita à mão');

    statusDaRet.forEach((item) => {
      const coluna = String(item.ColunaDeCarimbo || '').trim();
      if (!coluna) return;
      verdadeiro(chamar('posicaoDaColuna_')(estrutura, coluna) >= 0,
        'o status "' + item.Nome + '" aponta para a coluna "' + coluna
        + '", que não existe na BASE_RET');
    });
  });

  teste('o caso da RET nasce em Não trabalhado, sem ninguém escolher', () => {
    // É o pedido da operação: o analista cadastra e ajusta o status depois.
    const todos = chamar('formularioDoCanal')(ret.id).secoes
      .reduce((soma, s) => soma.concat(s.campos), []);
    igual(todos.find((c) => c.chave === 'status').valorPadrao, 'Não trabalhado',
      'o formulário já chega com o status preenchido');

    const novo = chamar('cadastrarCaso')(ret.id, { nomedocliente: 'Caso sem status' });
    igual(linhaDaRet(novo.id).status, 'Não trabalhado',
      'e quem não mandar status nenhum também cai em Não trabalhado');
  });

  teste('a jornada da RET fica carimbada coluna a coluna', () => {
    // O caminho que a operação percorre de verdade, do cadastro à retenção.
    const novo = casoNovoDaRet('Caso da jornada');
    const caminho = [
      ['Aguardando transmissão', 'Data aguardando transmissão'],
      ['Pendente', 'Data pendente'],
      ['1º contato realizado', 'Data do 1º contato'],
      ['2º contato realizado', 'Data do 2º contato'],
      // O status se chama "Retido"; a coluna continua "Data reteve" — coluna
      // da base é contrato com o Power BI, e não muda por causa do nome.
      ['Retido', 'Data reteve']
    ];

    caminho.forEach((passo) => {
      chamar('alterarSituacaoDoCaso')(ret.id, novo.id, passo[0]);
      const gravado = linhaDaRet(novo.id);
      igual(gravado.status, passo[0], 'o status ficou gravado');
      verdadeiro(ehData(gravado[passo[1]]),
        'o status "' + passo[0] + '" devia ter carimbado "' + passo[1]
        + '", e a célula veio com: ' + JSON.stringify(gravado[passo[1]]));
    });

    // E os carimbos anteriores continuam lá: é a linha do tempo do caso.
    const fim = linhaDaRet(novo.id);
    caminho.forEach((passo) => {
      verdadeiro(ehData(fim[passo[1]]),
        'o carimbo de "' + passo[0] + '" não podia ter sido apagado no caminho');
    });
    verdadeiro(!fim['Data não reteve'],
      'um caso que reteve não pode ter data de não reteve');
  });

  teste('toda mudança de status deixa rastro, inclusive a repetida', () => {
    // O carimbo grava a PRIMEIRA visita a cada status. Um caso que vai e volta
    // entre dois status não mexe em carimbo nenhum, e pareceria parado. Estas
    // três colunas são o que a operação pediu: toda mudança precisa registrar.
    const novo = casoNovoDaRet('Caso do vai e volta');
    igual(linhaDaRet(novo.id)['Mudanças de status'], '',
      'quem acabou de nascer ainda não mudou de status nenhuma vez');

    chamar('alterarSituacaoDoCaso')(ret.id, novo.id, 'Pendente');
    const primeira = linhaDaRet(novo.id);
    igual(primeira['Mudanças de status'], 1, 'a primeira mudança');
    igual(primeira['Quem mudou o status'], 'primeiro.adm@exemplo.com');
    verdadeiro(ehData(primeira['Data da última mudança de status']),
      'a data da última mudança é data de verdade');

    chamar('alterarSituacaoDoCaso')(ret.id, novo.id, '1º contato realizado');
    chamar('alterarSituacaoDoCaso')(ret.id, novo.id, 'Pendente');
    chamar('alterarSituacaoDoCaso')(ret.id, novo.id, '1º contato realizado');

    const fim = linhaDaRet(novo.id);
    igual(fim['Mudanças de status'], 4,
      'as quatro mudanças, mesmo as que repetiram status');
    igual(String(fim['Data do 1º contato']),
      String(primeira['Data do 1º contato'] || fim['Data do 1º contato']),
      'e o carimbo do 1º contato continua marcando a primeira vez');
  });

  teste('contador estragado na planilha não vira lixo — recomeça do zero', () => {
    // A coluna é editável: alguém pode digitar "três" ali. Number('três') é
    // NaN, e NaN + 1 continua NaN, que gravado na célula não significa nada.
    const novo = casoNovoDaRet('Caso do contador torto');
    chamar('atualizarRegistro_')('BASE_RET', novo.id, { 'Mudanças de status': 'três' });
    chamar('alterarSituacaoDoCaso')(ret.id, novo.id, 'Pendente');
    igual(linhaDaRet(novo.id)['Mudanças de status'], 1,
      'texto que não é número conta como zero, e a mudança vira a primeira');
  });

  teste('as datas de cada etapa continuam gravadas na linha do caso', () => {
    // A tela de leitura, que listava "onde o caso está", saiu do sistema a
    // pedido do PO. Os carimbos NÃO saíram com ela: é deles que sai a
    // produtividade da RET.
    const novo = casoNovoDaRet('Caso da linha do tempo');
    chamar('alterarSituacaoDoCaso')(ret.id, novo.id, 'Pendente');
    chamar('alterarSituacaoDoCaso')(ret.id, novo.id, '1º contato realizado');

    const linha = linhaDaRet(novo.id);
    verdadeiro(ehData(linha['Data pendente']) && ehData(linha['Data do 1º contato']),
      'as datas de cada etapa continuam na base, intactas');
  });

  teste('a troca de status da RET continua fora da auditoria', () => {
    // Um caso passa por quatro ou cinco status antes de fechar. Numa base de
    // 200 mil casos isso seria quase um milhão de linhas de auditoria. O que
    // a operação precisa saber está carimbado na linha do caso.
    const novo = casoNovoDaRet('Caso fora da auditoria');
    const antes = chamar('lerRegistros_("AUDITORIA")').length;
    chamar('alterarSituacaoDoCaso')(ret.id, novo.id, 'Pendente');
    chamar('alterarSituacaoDoCaso')(ret.id, novo.id, 'Retido');
    igual(chamar('lerRegistros_("AUDITORIA")').length, antes,
      'duas trocas de status não podem ter escrito nada na auditoria');
  });

  secao('O carimbo da Mesa Diamante');

  teste('concluir preenche a finalização quando o canal tem essa coluna', () => {
    const novo = chamar('cadastrarCaso')(canal.id, {
      analista: 'Ana Martins', status: 'Em andamento',
      datadeentrada: escrever(hoje), nomedosegurado: 'Caso que conclui'
    });
    chamar('alterarSituacaoDoCaso')(canal.id, novo.id, 'Concluído');

    const gravado = chamar('buscarRegistros_')('BASE_MESA', 'Id', novo.id, 1)[0];
    // Sem `instanceof`: o objeto vem de dentro do simulador, que é outro
    // contexto — e ali `instanceof Date` é falso para uma data de verdade.
    verdadeiro(ehData(gravado['Data da finalização']),
      'a data de finalização é preenchida sozinha, como a operação faria');
  });

  teste('o caso volta pronto para o formulário, pela chave do campo', () => {
    const primeiro = chamar('resumoDoCanal')(canal.id, {}).fila[0];
    const paraEditar = chamar('casoParaEditar')(canal.id, primeiro.id);

    igual(paraEditar.id, primeiro.id);
    verdadeiro(Object.keys(paraEditar.valores).length > 0);
    verdadeiro(Object.prototype.hasOwnProperty.call(paraEditar.valores, 'status'),
      'as chaves são as do formulário, não os cabeçalhos da planilha');
  });

  teste('Trabalhar no caso respeita o alcance do nível', () => {
    // Pela busca: a fila mostra só os cinco mais recentes, e o caso do Diego
    // pode não estar entre eles.
    const doDiego = chamar('resumoDoCanal')(canal.id, { busca: 'Diego Castilho' }).fila
      .find((caso) => JSON.stringify(caso.celulas).includes('Diego Castilho'));

    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      lanca(() => chamar('casoParaEditar')(canal.id, doDiego.id), 'Este caso é de Diego Castilho');
    });
  });

  teste('a fila traz o excluir por último, e pergunta antes', () => {
    // Pedido do PO: excluir na própria fila, como no PGO 5, por último — e
    // com um aviso de atenção, porque apaga de vez.
    const fila = lerPeca('Trabalho');
    contem(fila, "data-excluir=", 'o botão tem de existir na linha');
    contem(fila, "Servidor.chamar('excluirCaso'", 'e chamar a exclusão');
    contem(fila, 'Formulario.confirmarExclusao(idDoCaso, function',
      'só depois do aviso de atenção');
  });

  teste('o aviso de exclusão diz que é definitivo, e não é a caixinha do navegador', () => {
    // Ele promete o contrário de desfazer, e tem de prometer: a linha sai da
    // planilha. Dizer "pode ser trazida de volta" faria a pessoa confirmar
    // tranquila e descobrir depois — que é o pior jeito de descobrir.
    const peca = lerPeca('Formulario');
    const aviso = peca.slice(peca.indexOf('function confirmarExclusao'),
      peca.indexOf('function aplicarPadroes'));
    contem(aviso, 'apagado definitivamente da planilha');
    contem(aviso, 'Não dá para desfazer');
    contem(aviso, 'Excluir definitivamente', 'o botão diz o que faz');
    contem(aviso, 'role="alertdialog"', 'leitor de tela anuncia como alerta');
    contem(aviso, "getElementById('cancelar-exclusao').focus()",
      'o foco nasce em Cancelar: Enter distraído não apaga nada');
    verdadeiro(aviso.indexOf('window.confirm') < 0,
      'a caixinha cinza do navegador saiu');
    verdadeiro(peca.indexOf('pode ser trazida de volta') < 0,
      'a promessa antiga não pode ter sobrado');
  });

  teste('excluir tira da fila e do cartão ao mesmo tempo', () => {
    const antes = chamar('resumoDoCanal')(canal.id, {});
    chamar('excluirCaso')(canal.id, antes.fila[0].id);

    const depois = chamar('resumoDoCanal')(canal.id, {});
    igual(depois.total, antes.total - 1);
    // A fila mostra só os mais recentes: com mais de cinco casos, o sexto
    // sobe para o lugar do que saiu, e ela continua com cinco.
    igual(depois.fila.length, Math.min(antes.total - 1, chamar('RECC_CASOS_NA_FILA')));
    verdadeiro(!depois.fila.some((caso) => caso.id === antes.fila[0].id),
      'o caso excluído não pode continuar na fila');
    igual(depois.cartoes[0].valor, antes.cartoes[0].valor - 1);
  });

  secao('O filtro por data no Trabalho');

  // O PO pediu: "na aba trabalho precisa do filtro por data". Antes o Trabalho
  // só olhava a janela fixa da CONFIG — os mesmos 30 dias para todo mundo.
  // Estes testes provam que as TRÊS formas do período chegam até a fila.

  const mesDe = (recuo) => {
    const quando = new Date(hoje.getFullYear(), hoje.getMonth() - recuo, 1);
    return quando.getFullYear() + '-'
      + String(quando.getMonth() + 1).padStart(2, '0');
  };

  /** Uma data qualquer dentro do mês, longe das duas pontas. */
  const diaNoMes = (recuo) => {
    const quando = new Date(hoje.getFullYear(), hoje.getMonth() - recuo, 10);
    return escrever(quando);
  };

  teste('sem pedido nenhum, o Trabalho abre no atalho da CONFIG', () => {
    const resumo = chamar('resumoDoCanal')(canal.id, {});
    igual(resumo.periodo.tipo, 'dias');
    igual(resumo.periodo.dias, 30);
    contem(resumo.periodo.rotulo, 'últimos 30 dias');
  });

  teste('o Trabalho aceita um mês fechado, e a fila muda com ele', () => {
    // O caso nasce em DOIS meses atrás: fora do atalho de 30 dias, dentro do
    // seu próprio mês. Se o período não chegasse ao filtro, ele nunca
    // apareceria — e é justamente o caso que o filtro por data existe para achar.
    chamar('inserirRegistro_')('BASE_MESA', {
      Analista: 'Ana Martins', Status: 'Em andamento',
      'Data de entrada': diaNoMes(2), 'Nome do segurado': 'Caso de dois meses atras'
    });

    const noMesDele = chamar('resumoDoCanal')(canal.id, {}, { tipo: 'mes', mes: mesDe(2) });
    igual(noMesDele.periodo.tipo, 'mes');
    igual(noMesDele.periodo.mes, mesDe(2));
    verdadeiro(JSON.stringify(noMesDele.fila).includes('Caso de dois meses atras'),
      'escolhido o mês dele, o caso aparece');

    const noMesPassado = chamar('resumoDoCanal')(canal.id, {}, { tipo: 'mes', mes: mesDe(1) });
    verdadeiro(!JSON.stringify(noMesPassado.fila).includes('Caso de dois meses atras'),
      'escolhido outro mês, ele sai');
  });

  teste('o Trabalho aceita de/até, com as duas pontas dentro', () => {
    const resumo = chamar('resumoDoCanal')(canal.id, {},
      { tipo: 'intervalo', de: diasAtras(2), ate: diasAtras(1) });
    igual(resumo.periodo.tipo, 'intervalo');
    igual(resumo.periodo.de, diasAtras(2));
    igual(resumo.periodo.ate, diasAtras(1));
    contem(resumo.periodo.rotulo, 'de ' + diasAtras(2));
  });

  teste('o mês fechado NÃO guarda o caso sem data; o atalho guarda', () => {
    // Num "últimos 30 dias", a linha sem data é um caso mal preenchido que
    // precisa aparecer para alguém arrumar. Num "setembro", ela é um caso
    // sobre o qual não se pode afirmar que é de setembro.
    chamar('inserirRegistro_')('BASE_MESA', {
      Analista: 'Ana Martins', Status: 'Em andamento',
      'Nome do segurado': 'Caso sem data nenhuma'
    });

    const atalho = chamar('resumoDoCanal')(canal.id, {});
    verdadeiro(JSON.stringify(atalho.fila).includes('Caso sem data nenhuma'),
      'no atalho ele aparece, para ser arrumado');

    const mes = chamar('resumoDoCanal')(canal.id, {}, { tipo: 'mes', mes: mesDe(0) });
    verdadeiro(!JSON.stringify(mes.fila).includes('Caso sem data nenhuma'),
      'num mês fechado ele sai');
  });

  teste('o Trabalho entrega os meses para a tela montar a lista', () => {
    const resumo = chamar('resumoDoCanal')(canal.id, {});
    verdadeiro(resumo.mesesDisponiveis.length > 0, 'sem lista, não há o que escolher');
    igual(resumo.mesesDisponiveis[0].valor, mesDe(0), 'o corrente vem primeiro');
  });

  teste('a fila vazia diz o período que olhou, não "os N dias"', () => {
    // Com "setembro de 2026" escolhido, "nada nos 30 dias mais recentes" era
    // mentira — e mandava a pessoa procurar defeito onde não havia.
    const tela = lerPeca('Trabalho');
    contem(tela, 'Nada foi registrado no período escolhido');
    contem(tela, 'escapar(resumo.periodo.rotulo)');
    verdadeiro(tela.indexOf("resumo.periodo.dias + ' dias mais recentes") < 0,
      'o recado antigo não pode ter sobrado');
  });

  secao('A caixa de filtros, nas três telas');

  // Pedido do PO: "envolva tudo que for filtro por uma parte de fundo branca
  // com título de filtro, o mesmo para minha performance e o mesmo para
  // Produtividade". Caixa e seletor moram numa peça só: três cópias
  // divergiriam no primeiro ajuste, e o PO veria três telas diferentes.

  const asTresTelas = ['Trabalho', 'Produtividade', 'MinhaPerformance'];

  teste('as três telas põem os filtros na mesma caixa branca', () => {
    asTresTelas.forEach((nome) => {
      contem(lerPeca(nome), 'Moldura.caixaDeFiltros(',
        nome + ' tem de usar a caixa compartilhada');
    });
    contem(lerPeca('Comuns'), 'Filtros</h3>', 'e a caixa tem o título pedido');
    contem(lerPeca('Estilos'), '.caixa-de-filtros', 'com o fundo branco declarado');
  });

  teste('as três telas usam o MESMO seletor de período', () => {
    asTresTelas.forEach((nome) => {
      const tela = lerPeca(nome);
      contem(tela, 'SeletorDePeriodo.desenhar(', nome + ' desenha pelo seletor');
      contem(tela, 'SeletorDePeriodo.mudou(', nome + ' reage pelo seletor');
      contem(tela, 'SeletorDePeriodo.padrao()', nome + ' abre pelo padrão do seletor');

      // A peça é uma só: nenhuma tela pode ter a sua própria cópia.
      verdadeiro(tela.indexOf('function desenharPeriodo') < 0,
        nome + ' não pode ter o seu próprio seletor');
      verdadeiro(tela.indexOf('RECC_NOMES_DOS_MESES') < 0,
        nome + ' não pode ter a sua própria lista de meses');
    });
  });

  teste('o seletor devolve três respostas, e a do meio evita a busca torta', () => {
    // De/até com UMA data só não é um período: recarregar ali traria a tela
    // zerada e a pessoa acharia que não há caso. Por isso `false` — "é do
    // período, mas ainda não está pronto" — separado de `null`, "não é meu".
    const peca = lerPeca('Comuns');
    contem(peca, 'PEÇA 7 de 7', 'a peça é anunciada como as outras');
    contem(peca, 'var SeletorDePeriodo = (function ()');
    contem(peca, '(intervalo.de && intervalo.ate) ? intervalo : false',
      'só com as DUAS datas o intervalo vale');
    contem(peca, "data-periodo=", 'os campos se identificam para o seletor');

    // E as telas que têm filtro comum PRECISAM separar `false` de `null`: sem
    // isso, mexer no período cairia no `filtrosEscolhidos` e a tela procuraria
    // um filtro chamado "de" — que não existe, e zeraria a fila.
    ['Trabalho', 'Produtividade'].forEach((nome) => {
      contem(lerPeca(nome), 'novoPeriodo !== null',
        nome + ' tem de separar "não é meu" de "ainda incompleto"');
    });
  });

  teste('a caixa de filtros conta o que está sendo mostrado', () => {
    // O número ao lado de "Filtros" é o que impede a leitura errada: filtro
    // esquecido ligado, tela com três casos e ninguém entende o porquê.
    contem(lerPeca('Comuns'), 'caixa-de-filtros-cabeca');
    asTresTelas.forEach((nome) => {
      const chamada = lerPeca(nome).split('Moldura.caixaDeFiltros(')[1];
      verdadeiro(chamada.indexOf(',') > 0,
        nome + ' tem de passar a contagem, não só o conteúdo');
    });
  });

  secao('O VG — o terceiro canal');

  /*
   * O VG nasceu piloto, com formulário próprio, base própria e duas regras
   * que nenhum outro canal tem: uma coluna CALCULADA e um ALERTA na tela.
   *
   * O que estes testes cobram é justamente isso — o resto do canal já é
   * coberto pela máquina que os outros dois usam, e repetir aqui só criaria
   * teste para manter.
   */

  const vg = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_VG');

  const mesesAtras = (meses, dias) => {
    const quando = new Date();
    quando.setMonth(quando.getMonth() - meses);
    if (dias) quando.setDate(quando.getDate() - dias);
    return escrever(quando);
  };

  teste('o canal VG existe, com a base e o desenho dele', () => {
    igual(vg.nome, 'VG');
    igual(vg.aba, 'BASE_VG');
    igual(vg.icone, 'grupo');
    // Sem cartões e sem meta: o PO pediu para começar assim e configurar os
    // indicadores depois. Um cartão inventado estaria na tela dele amanhã.
    igual(chamar('resumoDoCanal')(vg.id, {}).cartoes.length, 0);
  });

  teste('o desenho do VG é dele, e não o padrão de outro canal', () => {
    // Já aconteceu duas vezes neste projeto: chave sem desenho cai num padrão,
    // calada, e o canal sai parecendo outro. E o `icone` do SeletorDeCanal faz
    // toLowerCase, então um 'vidaEmGrupo' aqui nunca seria encontrado.
    const contexto = vm.createContext({ console });
    vm.runInContext(scriptDaPeca('SeletorDeCanal'), contexto,
      { filename: 'SeletorDeCanal' });
    const SeletorDeCanal = contexto.SeletorDeCanal;

    const oPadrao = SeletorDeCanal.icone('chave-que-nao-existe');
    verdadeiro(SeletorDeCanal.icone('grupo') !== oPadrao,
      'o VG tem de ter desenho próprio');
    verdadeiro(SeletorDeCanal.icone('grupo') === SeletorDeCanal.icone('GRUPO'),
      'e a busca ignora maiúscula, como o canal grava');
  });

  teste('o formulário do VG traz as colunas na ordem que o PO ditou', () => {
    const formulario = chamar('formularioDoCanal')(vg.id);
    const emOrdem = [];
    (formulario.secoes || []).forEach((secao) => {
      (secao.campos || []).forEach((campo) => emOrdem.push(campo.rotulo));
    });

    igual(emOrdem.join(' | '),
      'Data do protocolo da solicitação | Analista | TK/Assunto | Entrada | Lead'
      + ' | CNPJ | Subestipulante | SUSEP | Quantidade de vidas'
      + ' | Início da vigência | MOVSINT/MOVESEG | Mensal/anual'
      + ' | Status | Motivo da liberação ou recusa'
      + ' | Prêmio mensal | Prêmio anual | Margem de contribuição (%)'
      + ' | Quantidade de parcelas vencidas'
      + ' | Mês e ano | Obs');
  });

  teste('as três listas do VG têm exatamente as opções pedidas', () => {
    const formulario = chamar('formularioDoCanal')(vg.id);
    const opcoesDe = (rotulo) => {
      let achado = [];
      (formulario.secoes || []).forEach((secao) => {
        (secao.campos || []).forEach((campo) => {
          if (campo.rotulo !== rotulo) return;
          achado = (campo.opcoes || []).map((uma) =>
            (uma && uma.valor !== undefined) ? uma.valor : uma);
        });
      });
      return achado.join(', ');
    };

    igual(opcoesDe('MOVSINT/MOVESEG'), 'MOVSINT, MOVESEG',
      'só as duas do título, como o PO disse');
    igual(opcoesDe('Mensal/anual'), 'Mensal, Trimestral, Semestral, Anual');
    igual(opcoesDe('Lead'),
      'Banguela, Reativação, Inadimplência, Renovação, Cobrança');
    igual(opcoesDe('Status'),
      'Aguardando, Reativado, Retido, Pago, Negado, Cancelado',
      'seis status — o PO confirmou que "pago" e "retido" são dois');
  });

  teste('a margem e o prêmio gravam no tipo certo de célula', () => {
    // O prêmio é dinheiro (soma no Power BI e na planilha); a margem é número
    // simples, gravando 25,5 — decisão do PO, e não porcentagem 0,255.
    const esquema = chamar('esquemaDaAba_')('BASE_VG');
    const tipoDe = (cabecalho) => esquema.colunas
      .find((coluna) => coluna.cabecalho === cabecalho).tipo;

    igual(tipoDe('Prêmio mensal'), 'dinheiro');
    igual(tipoDe('Prêmio anual'), 'dinheiro');
    igual(tipoDe('Margem de contribuição'), 'numero');
    igual(tipoDe('CNPJ'), 'identificador', 'CNPJ não perde o zero à esquerda');
    // A SUSEP é TEXTO em TODAS as abas: ela tem letra — "RET00J", palavra do
    // PO. Com `identificador`, a planilha guardaria só os dígitos e a
    // corretora nunca mais seria encontrada pelo selo.
    igual(tipoDe('SUSEP'), 'texto');
    ['BASE_RET', 'BASE_MESA', 'CORRETORAS', 'SUSEP_BLOQUEADAS']
      .forEach((aba) => {
        const coluna = chamar('esquemaDaAba_')(aba).colunas
          .find((uma) => uma.cabecalho === 'SUSEP');
        igual(coluna.tipo, 'texto', 'a SUSEP da aba ' + aba);
      });
  });

  secao('VG: os meses de vigência, calculados');

  teste('cadastrar calcula os meses a partir do início da vigência', () => {
    const novo = chamar('cadastrarCaso')(vg.id, {
      datadoprotocolodasolicitacao: escrever(hoje),
      analista: 'primeiro.adm',
      status: 'Aguardando',
      subestipulante: 'Empresa de 30 meses',
      iniciodavigencia: mesesAtras(30)
    });

    const gravado = chamar('buscarRegistros_')('BASE_VG', 'Id', novo.id, 1)[0];
    igual(Number(gravado['Meses de vigência']), 30,
      'o analista digita o início; o sistema conta os meses');
  });

  teste('corrigir a data de início refaz a conta', () => {
    const novo = chamar('cadastrarCaso')(vg.id, {
      datadoprotocolodasolicitacao: escrever(hoje),
      analista: 'primeiro.adm', status: 'Aguardando',
      subestipulante: 'Empresa corrigida',
      iniciodavigencia: mesesAtras(30)
    });

    chamar('editarCaso')(vg.id, novo.id, {
      datadoprotocolodasolicitacao: escrever(hoje),
      analista: 'primeiro.adm', status: 'Aguardando',
      subestipulante: 'Empresa corrigida',
      iniciodavigencia: mesesAtras(6)
    });

    const gravado = chamar('buscarRegistros_')('BASE_VG', 'Id', novo.id, 1)[0];
    igual(Number(gravado['Meses de vigência']), 6,
      'o número acompanha a correção da data');
  });

  teste('sem data de início, a coluna fica em branco — e não zero', () => {
    // Zero diria "zero mês de vigência", que é uma afirmação. Em branco diz
    // "não sei", que é a verdade quando a data não foi preenchida.
    const novo = chamar('cadastrarCaso')(vg.id, {
      datadoprotocolodasolicitacao: escrever(hoje),
      analista: 'primeiro.adm', status: 'Aguardando',
      subestipulante: 'Empresa sem vigência'
    });

    const gravado = chamar('buscarRegistros_')('BASE_VG', 'Id', novo.id, 1)[0];
    igual(String(gravado['Meses de vigência'] || ''), '');
  });

  teste('vigência no futuro devolve zero, e não negativo', () => {
    // Negativo cairia no alerta de "menos de 18" e pintaria de vermelho um
    // caso que está só adiantado.
    const daqui = new Date();
    daqui.setMonth(daqui.getMonth() + 3);

    const novo = chamar('cadastrarCaso')(vg.id, {
      datadoprotocolodasolicitacao: escrever(hoje),
      analista: 'primeiro.adm', status: 'Aguardando',
      subestipulante: 'Empresa adiantada',
      iniciodavigencia: escrever(daqui)
    });

    const gravado = chamar('buscarRegistros_')('BASE_VG', 'Id', novo.id, 1)[0];
    igual(Number(gravado['Meses de vigência']), 0);
  });

  teste('o mês só conta quando o DIA chega — 18 meses menos um dia são 17', () => {
    /*
     * A borda que decide o alerta inteiro.
     *
     * Quebrei a conta de propósito para conferir os testes e ela passou verde:
     * todos usavam o mesmo dia do mês, então o ajuste do dia nunca disparava.
     * Um caso que começou em 15/03 tem 17 meses em 14/09 do ano seguinte, e 18
     * só no dia 15 — a diferença entre acender o alerta e não acender.
     */
    const dezoitoMeses = new Date();
    dezoitoMeses.setMonth(dezoitoMeses.getMonth() - 18);
    // Um dia DEPOIS: o mês ainda não fechou.
    const faltaUmDia = new Date(dezoitoMeses);
    faltaUmDia.setDate(faltaUmDia.getDate() + 1);

    igual(chamar('mesesInteirosAteHoje_')(dezoitoMeses), 18,
      'no dia exato, fecham 18');
    igual(chamar('mesesInteirosAteHoje_')(faltaUmDia), 17,
      'um dia antes de fechar, ainda são 17 — e o alerta acende');

    igual(chamar('alertaDaCelula_')('BASE_VG', 'Meses de vigência',
      chamar('mesesInteirosAteHoje_')(faltaUmDia)),
      'Vigência de menos de 18 meses',
      'é esta a borda que a operação olha');
  });

  teste('só a VIGÊNCIA aceita futuro — o resto do sistema continua recusando', () => {
    /*
     * A exceção tinha de ser de UM campo, não uma porta aberta.
     *
     * "Data no futuro é recusada" existe porque 10/09/2027 numa data de
     * protocolo é dedo escorregando no ano — e esse erro passa despercebido
     * por meses. Afrouxar a regra inteira para atender a vigência teria
     * custado essa guarda em todos os canais.
     */
    const daqui = new Date();
    daqui.setMonth(daqui.getMonth() + 2);

    // No VG, a data do protocolo continua recusando.
    lanca(() => chamar('cadastrarCaso')(vg.id, {
      datadoprotocolodasolicitacao: escrever(daqui),
      analista: 'primeiro.adm', status: 'Aguardando',
      subestipulante: 'Protocolo do futuro'
    }), 'não pode ser no futuro', 'a data do protocolo não aceita futuro');

    // E na RET, nenhuma data aceita.
    const ret = chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');
    lanca(() => chamar('cadastrarCaso')(ret.id, {
      analista: 'primeiro.adm',
      'data de recepção do protocolo': escrever(daqui),
      'nome do cliente': 'Cliente do futuro'
    }), 'não pode ser no futuro', 'a RET não ganhou a exceção de tabela');

    // E a marca está em UM campo só, no contrato inteiro.
    const comAExcecao = chamar('lerRegistros_("CAMPOS")').filter((campo) =>
      String(campo.Configuracao || '').indexOf('aceitaFuturo') >= 0);
    igual(comAExcecao.length, 1, 'a exceção é de um campo só');
    igual(String(comAExcecao[0].Cabecalho), 'Início da vigência');
  });

  secao('VG: o alerta vermelho, só nas telas');

  teste('vigência abaixo de 18 meses acende; 18 cravados não', () => {
    const alerta = chamar('alertaDaCelula_');
    igual(alerta('BASE_VG', 'Meses de vigência', 17), 'Vigência de menos de 18 meses');
    igual(alerta('BASE_VG', 'Meses de vigência', 18), '',
      'o limite é ABAIXO de 18 — 18 está dentro');
    igual(alerta('BASE_VG', 'Meses de vigência', ''), '',
      'campo em branco não acende: ainda não foi preenchido');
  });

  teste('margem abaixo de 25,5 acende, e aceita vírgula', () => {
    const alerta = chamar('alertaDaCelula_');
    igual(alerta('BASE_VG', 'Margem de contribuição', '25,4'),
      'Margem abaixo de 25,5%');
    igual(alerta('BASE_VG', 'Margem de contribuição', '25,5'), '');
    igual(alerta('BASE_VG', 'Margem de contribuição', 30), '');
  });

  teste('o alerta é do VG, e não vaza para os outros canais', () => {
    igual(chamar('alertaDaCelula_')('BASE_RET', 'Margem de contribuição', 1), '');
    igual(chamar('alertaDaCelula_')('BASE_MESA', 'Meses de vigência', 1), '');
  });

  teste('a fila do VG entrega o alerta pronto, com o motivo', () => {
    chamar('cadastrarCaso')(vg.id, {
      datadoprotocolodasolicitacao: escrever(hoje),
      analista: 'primeiro.adm', status: 'Aguardando',
      subestipulante: 'Empresa em alerta',
      iniciodavigencia: mesesAtras(5),
      margemdecontribuicao: '20'
    });

    const fila = chamar('resumoDoCanal')(vg.id, {}).fila;
    const emAlerta = fila.find((linha) =>
      JSON.stringify(linha.celulas).indexOf('Empresa em alerta') >= 0);

    const celulas = [];
    emAlerta.celulas.forEach((grupo) => grupo.forEach((c) => celulas.push(c)));

    const vigencia = celulas.find((c) => c.cabecalho === 'Meses de vigência');
    const margem = celulas.find((c) => c.cabecalho === 'Margem de contribuição');

    igual(vigencia.alerta, 'Vigência de menos de 18 meses');
    igual(margem.alerta, 'Margem abaixo de 25,5%');
  });

  teste('número decimal sai em português, com vírgula', () => {
    /*
     * A margem aparecia na fila como "19.8". Estava assim desde sempre, e
     * nenhum canal tinha mostrado: a RET só tem número INTEIRO na fila, e
     * inteiro sai igual nos dois idiomas. O VG foi o primeiro com decimal.
     *
     * Quem pegou foi a foto da tela — de novo.
     */
    igual(chamar('paraTexto_')(19.8, 'numero'), '19,8');
    igual(chamar('paraTexto_')(25.5, 'numero'), '25,5');
    igual(chamar('paraTexto_')(27, 'numero'), '27',
      'inteiro não ganha casas decimais que ninguém pediu');
    igual(chamar('paraTexto_')('', 'numero'), '');

    // E na fila de verdade, que é onde a operação vê.
    const fila = chamar('resumoDoCanal')(vg.id, {}).fila;
    const celulas = [];
    fila.forEach((linha) => linha.celulas.forEach(
      (grupo) => grupo.forEach((c) => celulas.push(c))));

    const comPonto = celulas.filter((c) =>
      c.cabecalho === 'Margem de contribuição' && String(c.valor).indexOf('.') >= 0);
    igual(comPonto.length, 0,
      'nenhuma margem pode sair com ponto: ' + JSON.stringify(comPonto));
  });

  teste('a tela pinta o alerta, e o motivo vai na dica', () => {
    // Cor sozinha não diz por quê, e quem chegou ontem na operação não
    // adivinha que 17 é pouco.
    const tela = lerPeca('Trabalho');
    contem(tela, 'celula.alerta', 'a tela lê o alerta que o servidor mandou');
    contem(tela, 'em-alerta', 'e marca a célula');
    const moldura = pecaRodando('Moldura').Moldura;
    igual(moldura.dicaDaCelula({ cabecalho: 'Meses de vigência', valor: '12',
      alerta: 'abaixo de 18 meses' }), 'Meses de vigência: 12 — abaixo de 18 meses',
    'o motivo entra na dica, junto do nome da coluna');
    contem(lerPeca('Estilos'), '.fila .em-alerta', 'com estilo declarado');
  });

  teste('o vermelho NÃO vai para a planilha — decisão do PO', () => {
    // Ele foi específico: "só nas telas do PGO". Formatação condicional na
    // célula ficaria para trás no dia em que alguém arrastasse uma linha.
    const daInstalacao = fs.readFileSync(
      path.join(__dirname, '..', '..', 'Back-End', 'Instalacao.gs'), 'utf8');
    verdadeiro(daInstalacao.indexOf('ConditionalFormat') < 0,
      'nada de formatação condicional na planilha');
    verdadeiro(daInstalacao.indexOf('setBackground') < 0,
      'nem célula pintada na gravação');
  });

  secao('Os destaques da fila, a pedido do PO');

  /*
   * Ambiente NOVO de propósito: um teste lá de cima reescreve as colunas da
   * fila da RET para provar a escrita plana. Aqui interessa a fila de fábrica.
   */
  const novo = carregar('primeiro.adm@exemplo.com');
  novo.chamar('instalarRECC()');
  const daRet = novo.chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');
  const daMesa = novo.chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_MESA');

  /** Os valores de um grupo da fila, na ordem — o primeiro é o destaque. */
  function grupoNaFila(resumo, titulo, linha) {
    const posicao = resumo.colunas.findIndex((g) => g.titulo === titulo);
    verdadeiro(posicao >= 0, 'o grupo "' + titulo + '" tem de existir');
    return {
      cabecalhos: resumo.colunas[posicao].colunas.map((c) => c.cabecalho),
      valores: resumo.fila[linha].celulas[posicao].map((c) => c.valor)
    };
  }

  function linhaDe(resumo, trecho) {
    return resumo.fila.findIndex((l) => JSON.stringify(l).indexOf(trecho) >= 0);
  }

  novo.chamar('inserirRegistro_')('BASE_RET', {
    analista: 'Ana Martins', status: 'Não trabalhado',
    'data de recepção do protocolo': diasAtras(1),
    protocolo: '998877', 'Código origem da proposta': '7',
    'número da proposta': '0000123', Num_apolice: '555', produto: 'Vida',
    'telefones de contato': '11 98888-7777', 'nome do cliente': 'Cliente da fila'
  });

  teste('RET · "Dados da proposta" abre com a proposta inteira, sem protocolo', () => {
    const resumo = novo.chamar('resumoDoCanal')(daRet.id, {});
    const grupo = grupoNaFila(resumo, 'Dados da proposta', linhaDe(resumo, 'Cliente da fila'));
    igual(grupo.valores[0], '7-0000123', 'código e número juntos, com o hífen');
    igual(grupo.cabecalhos[0], 'Código origem da proposta + número da proposta');
    verdadeiro(grupo.cabecalhos.indexOf('protocolo') < 0,
      'o protocolo saiu do grupo — não é usado no dia a dia');
    igual(grupo.valores.slice(1).join(' | '), '555 | Vida', 'apólice e produto continuam');
  });

  teste('RET · proposta sem código não deixa hífen solto', () => {
    novo.chamar('inserirRegistro_')('BASE_RET', {
      analista: 'Ana Martins', status: 'Não trabalhado',
      'data de recepção do protocolo': diasAtras(0),
      'número da proposta': '0000456', 'nome do cliente': 'Sem código'
    });
    const resumo = novo.chamar('resumoDoCanal')(daRet.id, {});
    igual(grupoNaFila(resumo, 'Dados da proposta', linhaDe(resumo, 'Sem código')).valores[0],
      '0000456');
  });

  teste('RET · "Dados cadastrais" abre com o telefone', () => {
    const resumo = novo.chamar('resumoDoCanal')(daRet.id, {});
    const grupo = grupoNaFila(resumo, 'Dados cadastrais', linhaDe(resumo, 'Cliente da fila'));
    igual(grupo.cabecalhos[0], 'telefones de contato', 'o telefone é o destaque');
    igual(grupo.valores[0], '11988887777', 'só dígitos, como o sistema guarda telefone');
    igual(grupo.cabecalhos[1], 'nome do cliente', 'o nome continua, logo abaixo');
  });

  teste('Mesa · "Dados do caso" abre com o título do e-mail', () => {
    novo.chamar('inserirRegistro_')('BASE_MESA', {
      Analista: 'Ana Martins', Status: 'Em andamento',
      'Data de entrada': diasAtras(0), 'Título do e-mail': 'Endosso urgente — apólice 123',
      Ramo: 'Auto', Assunto: 'Endosso'
    });
    const resumo = novo.chamar('resumoDoCanal')(daMesa.id, {});
    const grupo = grupoNaFila(resumo, 'Dados do caso', linhaDe(resumo, 'Endosso urgente'));
    igual(grupo.cabecalhos.join(', '), 'Título do e-mail, Ramo, Assunto');
    igual(grupo.valores[0], 'Endosso urgente — apólice 123');
  });

  teste('texto grande cortado com "…" aparece inteiro ao passar o cursor', () => {
    /*
     * Pedido do PO: "ser possível arrastar o cursor caso o texto seja grande".
     * O destaque não quebra linha — o título do e-mail longo sai com "…" — e
     * a dica da célula traz o texto inteiro, com o nome da coluna.
     */
    const moldura = pecaRodando('Moldura').Moldura;
    const titulo = 'Endosso urgente da apólice 12-1391-0000111 do segurado Nami';
    igual(moldura.dicaDaCelula({ cabecalho: 'Título do e-mail', valor: titulo }),
      'Título do e-mail: ' + titulo, 'o texto INTEIRO, e não o cortado');
    igual(moldura.dicaDaCelula({ cabecalho: 'Código origem da proposta + número da proposta',
      valor: '7-0000123' }), 'Código origem da proposta e número da proposta: 7-0000123',
    'a junção da fila lê-se com "e"');
    igual(moldura.dicaDaCelula({ cabecalho: 'Ramo', valor: '' }), 'Ramo',
      'célula vazia diz só a coluna');
  });

  teste('as três filas usam a mesma dica — Trabalho, Busca e Produtividade', () => {
    ['Trabalho', 'BuscarCaso', 'Produtividade'].forEach((nome) => {
      contem(lerPeca(nome), 'escapar(Moldura.dicaDaCelula(celula))',
        nome + ' põe a dica com o texto inteiro em cada célula');
    });
  });

  teste('Configurações aceita "A + B" e recusa quando uma das partes não existe', () => {
    const base = { id: daRet.id, nome: daRet.nome, colunaDaData: daRet.colunaDaData,
      colunaDoStatus: daRet.colunaDoStatus };
    novo.chamar('salvarCanal')(Object.assign({}, base, {
      colunasDaFila: 'Proposta: Código origem da proposta + número da proposta' }));
    lanca(() => novo.chamar('salvarCanal')(Object.assign({}, base, {
      colunasDaFila: 'Proposta: Código origem da proposta + coluna inventada' })),
    'coluna inventada');
  });

  teste('o diagnóstico confere cada parte da junção', () => {
    // A fila de fábrica, com "+", não pode virar um aviso falso no diagnóstico.
    const citadas = novo.chamar('colunasCitadas_')(
      'Dados: Código origem da proposta + número da proposta, produto');
    igual(citadas.join(' | '), 'Código origem da proposta | número da proposta | produto');
  });

  secao('Trabalhar no caso abre com o mínimo de leitura');

  teste('abrir o caso não lê a auditoria — ela não tem mais o que mostrar ali', () => {
    /*
     * A tela de leitura lia a trilha de auditoria para montar o histórico do
     * caso, e a auditoria só cresce. Com a leitura fora do sistema, abrir um
     * caso é uma linha da base e o formulário do canal — o tamanho da
     * auditoria não pode mais pesar no clique.
     */
    const caso = novo.chamar('cadastrarCaso')(daMesa.id, {
      status: 'Em andamento', nomedosegurado: 'Caso aberto rápido'
    });
    const medidor = novo.ambiente.medidor;
    function celulasParaAbrir() {
      novo.chamar('esquecerEstruturaLida_()');
      medidor.zerar();
      const aberto = novo.chamar('casoParaEditar')(daMesa.id, String(caso.id));
      igual(aberto.valores.nomedosegurado, 'Caso aberto rápido');
      return medidor.retrato().celulasLidas;
    }

    const antes = celulasParaAbrir();
    // Três mil linhas de outros casos: o barulho de meses de operação.
    const outras = [];
    for (let i = 0; i < 3000; i++) {
      outras.push({ DataHora: new Date(), Acao: 'caso.editar', Entidade: 'BASE_RET',
        RegistroId: String(900000 + i), Detalhe: 'outro caso' });
    }
    novo.chamar('inserirVariosRegistros_')('AUDITORIA', outras);
    const depois = celulasParaAbrir();

    igual(depois, antes, 'três mil linhas a mais na auditoria não podem custar '
      + 'uma célula a mais para abrir o caso (antes ' + antes + ', depois ' + depois + ')');
  });
  secao('A busca digitada no Trabalho');

  /*
   * Pedido do PO: "o filtro por busca digitada para cada canal". Ambiente
   * NOVO: os testes de cima mexem nas colunas da fila e da busca, e aqui
   * interessa a configuração de fábrica.
   */
  const comBusca = carregar('primeiro.adm@exemplo.com');
  comBusca.chamar('instalarRECC()');
  const mesaDaBusca = comBusca.chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_MESA');
  const retDaBusca = comBusca.chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');
  [
    { nomedosegurado: 'Roronoa Zoro', titulodoemail: 'Endosso urgente',
      documentocpf: '123.456.789-01' },
    { nomedosegurado: 'Nami Navegadora', titulodoemail: 'Renovação da apólice' },
    { nomedosegurado: 'Usopp Atirador', titulodoemail: 'Sinistro' }
  ].forEach((caso) => {
    comBusca.chamar('cadastrarCaso')(mesaDaBusca.id,
      Object.assign({ status: 'Em andamento' }, caso));
  });
  comBusca.chamar('cadastrarCaso')(retDaBusca.id, {
    nomedocliente: 'Franky Ciborgue', protocolo: 'PROT-98765',
    numerodaproposta: '7-0004406', status: 'Não trabalhado'
  });

  const buscar = (canalDaBusca, termo) =>
    comBusca.chamar('resumoDoCanal')(canalDaBusca.id, { busca: termo });

  teste('o termo filtra a fila e os cartões juntos', () => {
    const resumo = buscar(mesaDaBusca, 'zoro');
    igual(resumo.total, 1, 'só o caso do Zoro');
    igual(resumo.fila.length, 1);
    contem(JSON.stringify(resumo.fila[0].celulas), 'Roronoa Zoro');
    igual(resumo.cartoes[0].valor, 1,
      'o cartão conta o mesmo recorte que a fila mostra');
  });

  teste('procura no que a fila mostra, sem acento e sem caixa', () => {
    igual(buscar(mesaDaBusca, 'RENOVACAO').total, 1,
      '"Renovação da apólice" é achada sem o acento');
    igual(buscar(mesaDaBusca, 'endosso').total, 1);
  });

  teste('documento acha com ou sem pontuação', () => {
    igual(buscar(mesaDaBusca, '123.456.789-01').total, 1);
    igual(buscar(mesaDaBusca, '12345678901').total, 1);
  });

  teste('procura também nas colunas da busca do canal, fora da fila', () => {
    // O protocolo saiu da fila da RET, mas continua nas colunas da busca.
    igual(buscar(retDaBusca, '98765').total, 1);
  });

  teste('a proposta inteira, do jeito que a fila mostra, também acha', () => {
    igual(buscar(retDaBusca, '7-0004406').total, 1);
    igual(buscar(retDaBusca, '0004406').total, 1);
  });

  teste('data crua não vira resultado falso', () => {
    // Uma data guardada vira "Tue Oct 06 2026 … GMT" se for lida crua; buscar
    // "GMT" acharia todo caso que tem data.
    igual(buscar(mesaDaBusca, 'GMT').total, 0);
    igual(buscar(mesaDaBusca, escrever(hoje)).total, 3,
      'a data como a fila mostra, essa sim, acha');
  });

  teste('termo sem caso nenhum dá fila vazia, e não a fila inteira', () => {
    const resumo = buscar(mesaDaBusca, 'Barba Branca');
    igual(resumo.total, 0);
    igual(resumo.fila.length, 0);
    verdadeiro(resumo.totalNoPeriodo >= 3, 'o período continua com os casos');
  });

  teste('busca vazia ou só com espaços é o mesmo que nenhuma', () => {
    igual(buscar(mesaDaBusca, '').total, 3);
    igual(buscar(mesaDaBusca, '   ').total, 3);
  });

  teste('a tela tem a busca, que aplica no Enter e no "x" do campo', () => {
    const tela = lerPeca('Trabalho');
    contem(tela, 'data-filtro="busca"', 'a busca vai no mesmo pacote dos filtros');
    contem(tela, "addEventListener('search'",
      'o "x" do campo limpa a busca na hora');
    contem(tela, "if (termo === (filtrosEscolhidos.busca || '')) return;",
      'o Enter dispara dois eventos, e o termo igual não vai duas vezes ao servidor');
    const trocaDeCanal = tela.substring(tela.indexOf('SeletorDeCanal.ligar('));
    contem(trocaDeCanal.substring(0, 200), 'filtrosEscolhidos = {};',
      'trocar de canal limpa a busca junto com os filtros');
  });

  teste('a busca da barra superior leva ao Buscar Caso com o termo', () => {
    const aplicacao = lerPeca('Aplicacao');
    contem(aplicacao, 'TelaBuscarCaso.procurarPor(termo)');
    contem(aplicacao, "irPara('buscarCaso')");
    const telaDaBusca = lerPeca('BuscarCaso');
    contem(telaDaBusca, 'procurarPor: procurarPor', 'a tela de busca recebe o termo');
    const moldura = lerPeca('Moldura');
    contem(moldura, 'podeAbrirOBuscar(pacote)',
      'quem não tem o Buscar Caso no menu não vê a caixa');
  });

  secao('A fila: 5, 10, 20, 50, 100 ou todos, à escolha');

  const curta = carregar('primeiro.adm@exemplo.com');
  curta.chamar('instalarRECC()');
  const mesaCurta = curta.chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_MESA');
  for (let i = 1; i <= 7; i++) {
    curta.chamar('cadastrarCaso')(mesaCurta.id, {
      status: 'Em andamento', nomedosegurado: 'Caso número ' + i
    });
  }

  teste('a fila abre com 5, e os cartões contam todos', () => {
    const resumo = curta.chamar('resumoDoCanal')(mesaCurta.id, {});
    igual(curta.chamar('RECC_CASOS_NA_FILA'), 5);
    igual(resumo.fila.length, 5);
    igual(resumo.total, 7, 'o total é de todos — palavra do PO');
    igual(resumo.cartoes[0].valor, 7);
  });

  teste('os 5 são os mais recentes, o mais novo em cima', () => {
    const fila = curta.chamar('resumoDoCanal')(mesaCurta.id, {}).fila;
    contem(JSON.stringify(fila[0].celulas), 'Caso número 7');
    const naFila = JSON.stringify(fila);
    verdadeiro(naFila.indexOf('Caso número 1"') < 0, 'o mais antigo ficou de fora');
    verdadeiro(naFila.indexOf('Caso número 2"') < 0);
  });

  teste('a busca alcança o caso que ficou fora dos 5', () => {
    const resumo = curta.chamar('resumoDoCanal')(mesaCurta.id,
      { busca: 'Caso número 1' });
    igual(resumo.total, 1);
    contem(JSON.stringify(resumo.fila), 'Caso número 1');
  });

  teste('a tela diz quantos ficaram de fora e como chegar neles', () => {
    const tela = lerPeca('Trabalho');
    contem(tela, "Mostrando os ' + resumo.fila.length");
    contem(tela, 'casos mais recentes de');
    contem(tela, 'em "Mostrar", nos filtros — ou use a busca');
  });

  teste('o seletor escolhe quantos: 10, 20, 50, 100 ou todos', () => {
    // Pedido do PO: "deve ser possível escolher 5, 10, 20, 50, 100 ou todos
    // os casos" — e não um limite fixo de cinco.
    for (let i = 8; i <= 25; i++) {
      curta.chamar('cadastrarCaso')(mesaCurta.id, {
        status: 'Em andamento', nomedosegurado: 'Caso número ' + i
      });
    }
    const quantos = (escolha) => curta.chamar('resumoDoCanal')(mesaCurta.id, {}, undefined, escolha);
    igual(quantos(10).fila.length, 10);
    igual(quantos(20).fila.length, 20);
    igual(quantos(50).fila.length, 25, 'pedir 50 com 25 casos traz os 25');
    igual(quantos('todos').fila.length, 25);
    igual(quantos('todos').casosNaFila, 0, 'zero é "todos" na resposta');
    igual(quantos(10).casosNaFila, 10);
    contem(JSON.stringify(quantos(10).fila[0].celulas), 'Caso número 25',
      'sempre os mais recentes, o mais novo em cima');
    igual(JSON.stringify(quantos(5).opcoesDeCasosNaFila), '[5,10,20,50,100]');
  });

  teste('o seletor muda só a fila: os cartões contam o mesmo', () => {
    const cinco = curta.chamar('resumoDoCanal')(mesaCurta.id, {}, undefined, 5);
    const todos = curta.chamar('resumoDoCanal')(mesaCurta.id, {}, undefined, 'todos');
    igual(cinco.total, todos.total);
    igual(cinco.cartoes[0].valor, todos.cartoes[0].valor);
  });

  teste('escolha fora da lista vira o padrão de 5', () => {
    const quantos = (escolha) => curta.chamar('resumoDoCanal')(mesaCurta.id, {}, undefined, escolha)
      .fila.length;
    igual(quantos(undefined), 5, 'sem escolha, o padrão');
    igual(quantos(''), 5);
    igual(quantos(3), 5, 'a tela não inventa opção');
    igual(quantos(1000000), 5, 'um número enorme seria o "todos" por outra porta');
    igual(quantos('Todos'), 25, '"todos" sem ligar para a caixa');
  });

  teste('a tela tem o seletor "Mostrar", que não é filtro', () => {
    const tela = lerPeca('Trabalho');
    contem(tela, 'data-casos-na-fila="sim"');
    contem(tela, 'Mostrar todos os casos');
    contem(tela, "Servidor.chamar('resumoDoCanal', canalEscolhida, filtrosEscolhidos, periodo,\n      quantosNaFila)");
    // "Limpar filtros" e a troca de canal zeram os filtros, não o seletor.
    const limpar = tela.substring(tela.indexOf("addEventListener('click', function () {\n        filtrosEscolhidos = {};"));
    verdadeiro(limpar.substring(0, 150).indexOf('quantosNaFila') < 0,
      'limpar filtros não mexe em quantos mostrar');
    const trocaDeCanal = tela.substring(tela.indexOf('SeletorDeCanal.ligar('));
    verdadeiro(trocaDeCanal.substring(0, 200).indexOf('quantosNaFila') < 0,
      'trocar de canal mantém a escolha');
  });

  secao('O modal no centro da área de trabalho');

  teste('o diálogo desconta a largura do menu, aberto ou encolhido', () => {
    // Pedido do PO: o "Trabalhar no caso" no centro da área de trabalho, à
    // direita do menu, e não da tela inteira.
    const estilos = lerPeca('Estilos');
    contem(estilos, 'body:has(.aplicacao) .dialogo { padding-left: calc(var(--lateral-largura) + 20px); }');
    contem(estilos, 'body:has(.aplicacao.encolhida) .dialogo { padding-left: calc(var(--lateral-encolhida) + 20px); }');
    const estreita = estilos.substring(estilos.indexOf('@media (max-width: 900px) {\n  /* O menu vira gaveta'));
    contem(estreita.substring(0, 300), 'body:has(.aplicacao.encolhida) .dialogo { padding-left: 20px; }',
      'no celular o menu é gaveta, e o diálogo volta ao centro da tela');
  });

  secao('O SLA da Mesa Diamante');

  /*
   * Pedido do PO: 6 horas úteis, das 08:15 às 18:30, de segunda a sexta, até a
   * PRIMEIRA RESPOSTA ("a SLA conta até a data da primeira resposta"). A
   * conta é testada com um "agora" fixo — o relógio de verdade faria o teste
   * passar de manhã e falhar à tarde.
   *
   * Outubro de 2026: dia 2 é sexta, 5 é segunda e 6 é terça.
   */
  const relogio = (dia, hora, minuto) =>
    chamar('relogioDeParede_')(new Date(2026, 9, dia, hora, minuto || 0));
  const ABRE = 8 * 60 + 15;
  const FECHA = 18 * 60 + 30;
  const canalComSla = {
    slaHorasUteis: 6, inicioDoExpediente: '08:15', fimDoExpediente: '18:30',
    colunaDaData: 'Data de entrada', colunaDaHora: 'Horário',
    colunaDaFinalizacao: 'Data da finalização',
    colunaDaPrimeiraResposta: 'Data resposta',
    colunaDaHoraDaPrimeiraResposta: 'Hora resposta', colunaDoStatus: 'Status'
  };
  const sla = (registro, agora, finais) =>
    chamar('slaDoCaso_')(registro, canalComSla, finais || {}, agora);

  teste('as horas úteis pulam a noite e o fim de semana', () => {
    const uteis = chamar('minutosUteisEntre_');
    igual(uteis(relogio(2, 17), relogio(5, 9, 15), ABRE, FECHA), 150,
      'sexta 17:00 até segunda 09:15: 1h30 na sexta e 1h na segunda');
    igual(uteis(relogio(6, 9), relogio(6, 11, 30), ABRE, FECHA), 150,
      'no mesmo dia, dentro do expediente');
  });

  teste('fora do expediente, conta da próxima abertura', () => {
    const uteis = chamar('minutosUteisEntre_');
    igual(uteis(relogio(3, 10), relogio(5, 10, 15), ABRE, FECHA), 120,
      'chegou no sábado: começa segunda às 08:15');
    igual(uteis(relogio(6, 7), relogio(6, 8, 45), ABRE, FECHA), 30,
      'chegou antes de abrir: começa às 08:15');
    igual(uteis(relogio(6, 11), relogio(6, 9), ABRE, FECHA), 0,
      'fim antes do começo não vira número negativo');
  });

  teste('caso aberto, dentro do prazo: verde, com o que falta', () => {
    const r = sla({ 'Data de entrada': '06/10/2026', 'Horário': '09:00' },
      relogio(6, 13, 50));
    igual(r.dentro, true);
    igual(r.tom, 'bom');
    igual(r.texto, 'No prazo · faltam 1h10');
    igual(r.parouEm, 'agora', 'sem resposta, o prazo ainda corre');
  });

  teste('caso aberto, fora do prazo: vermelho, com o quanto passou', () => {
    const r = sla({ 'Data de entrada': '02/10/2026', 'Horário': '10:00' },
      relogio(5, 10));
    igual(r.dentro, false);
    igual(r.tom, 'ruim');
    igual(r.texto, 'Fora do prazo · 4h15 além',
      'sexta 10:00–18:30 (8h30) e segunda 08:15–10:00 (1h45): 10h15, 4h15 além das 6h');
  });

  teste('respondido no prazo: SLA cumprido', () => {
    const r = sla({ 'Data de entrada': '06/10/2026', 'Horário': '09:00',
      'Data resposta': '06/10/2026', 'Hora resposta': '12:00' },
    relogio(6, 23));
    igual(r.parou, true);
    igual(r.parouEm, 'resposta');
    igual(r.texto, 'SLA cumprido · em 3h', 'o relógio parou na primeira resposta');
  });

  teste('respondido fora do prazo: SLA estourado', () => {
    const r = sla({ 'Data de entrada': '05/10/2026', 'Horário': '09:00',
      'Data resposta': '06/10/2026', 'Hora resposta': '12:00' },
    relogio(6, 23));
    igual(r.tom, 'ruim');
    igual(r.texto, 'SLA estourado · 7h15 além');
  });

  teste('a primeira resposta manda, e não a finalização', () => {
    // Respondido às 10h, finalizado só no dia seguinte: o SLA é da resposta.
    const r = sla({ 'Data de entrada': '06/10/2026', 'Horário': '09:00',
      'Data resposta': '06/10/2026', 'Hora resposta': '10:00',
      'Data da finalização': '07/10/2026', Status: 'Concluído' },
    relogio(8, 12));
    igual(r.parouEm, 'resposta');
    igual(r.texto, 'SLA cumprido · em 1h');
  });

  teste('respondido sem a hora: vale o fim do expediente do dia da resposta', () => {
    igual(sla({ 'Data de entrada': '06/10/2026', 'Horário': '09:00',
      'Data resposta': '06/10/2026' }, relogio(7, 12)).texto,
    'SLA estourado · 3h30 além', 'das 09:00 às 18:30: 9h30, 3h30 além das 6h');
  });

  teste('encerrado sem a primeira resposta para na finalização', () => {
    // Decisão do PO: caso encerrado sem resposta não fica "fora do prazo"
    // crescendo para sempre.
    const r = sla({ 'Data de entrada': '06/10/2026', 'Horário': '09:00',
      'Data da finalização': '06/10/2026' }, relogio(20, 12));
    igual(r.parouEm, 'encerramento');
    igual(r.texto, 'SLA estourado · 3h30 além',
      'sem hora na finalização, vale o fim do expediente daquele dia');
  });

  teste('sem a hora de entrada, conta da abertura daquele dia', () => {
    igual(sla({ 'Data de entrada': '06/10/2026' }, relogio(6, 10, 15)).texto,
      'No prazo · faltam 4h');
  });

  teste('status final sem data de finalização para na mudança de status', () => {
    const registro = { 'Data de entrada': '06/10/2026', 'Horário': '09:00',
      Status: 'Sem retorno' };
    registro[chamar('RECC_COLUNA_QUANDO_MUDOU_O_STATUS')] = new Date(2026, 9, 6, 11, 0);
    const finais = {};
    finais[chamar('normalizarParaComparar_')('Sem retorno')] = true;
    const r = sla(registro, relogio(7, 18), finais);
    igual(r.parouEm, 'encerramento');
    igual(r.texto, 'SLA cumprido · em 2h', 'das 09:00 às 11:00, quando o status mudou');
  });

  teste('passou de um expediente inteiro, diz em dias úteis', () => {
    igual(chamar('duracaoParaLer_')(1300, FECHA - ABRE), '2 dias úteis');
    igual(chamar('duracaoParaLer_')(45, FECHA - ABRE), '45min');
  });

  teste('sem data de entrada ou sem expediente, não inventa SLA', () => {
    igual(sla({}, relogio(6, 10)), null);
    igual(chamar('slaDoCaso_')({ 'Data de entrada': '06/10/2026' },
      Object.assign({}, canalComSla, { fimDoExpediente: '' }), {}, relogio(6, 10)), null);
  });

  teste('a fila da Mesa traz o selo; a da RET e a do VG, não', () => {
    const doTeste = carregar('primeiro.adm@exemplo.com');
    doTeste.chamar('instalarRECC()');
    const canais = doTeste.chamar('canaisVisiveis_()');
    const daMesa = canais.find((m) => m.aba === 'BASE_MESA');
    const daRet = canais.find((m) => m.aba === 'BASE_RET');
    igual(daMesa.slaHorasUteis, 6);
    doTeste.chamar('cadastrarCaso')(daMesa.id, {
      status: 'Em andamento', nomedosegurado: 'Caso com prazo' });
    doTeste.chamar('cadastrarCaso')(daRet.id, {
      nomedocliente: 'Caso sem prazo', status: 'Não trabalhado' });

    const linhaDaMesa = doTeste.chamar('resumoDoCanal')(daMesa.id, {}).fila[0];
    verdadeiro(linhaDaMesa.sla !== null, 'a Mesa tem SLA');
    verdadeiro(/^(No prazo|Fora do prazo)/.test(linhaDaMesa.sla.texto), linhaDaMesa.sla.texto);
    igual(doTeste.chamar('resumoDoCanal')(daRet.id, {}).fila[0].sla, null,
      'canal sem SLA não manda nada');
  });

  teste('a tela pinta o selo com a cor que o servidor mandou', () => {
    const tela = lerPeca('Trabalho');
    contem(tela, 'seloDoSla(caso.sla)');
    contem(tela, "resposta: 'contado até a primeira resposta'",
      'a dica diz até onde o prazo foi contado');
    contem(tela, "'<span class=\"selo-sla tom-' + escapar(sla.tom)");
    contem(lerPeca('Estilos'), '.selo-sla');
  });

  secao('VG: a vigência em vermelho, amarelo e verde');

  teste('abaixo de 18 vermelho, 18 amarelo, acima verde', () => {
    const faixa = chamar('faixaDaCelula_');
    igual(faixa('BASE_VG', 'Meses de vigência', 17).tom, 'ruim');
    igual(faixa('BASE_VG', 'Meses de vigência', 18).tom, 'atencao');
    igual(faixa('BASE_VG', 'Meses de vigência', 18).recado, 'Vigência de exatamente 18 meses');
    igual(faixa('BASE_VG', 'Meses de vigência', 19).tom, 'bom');
    igual(faixa('BASE_VG', 'Meses de vigência', ''), null, 'em branco não pinta');
  });

  teste('a margem continua só com o vermelho', () => {
    const faixa = chamar('faixaDaCelula_');
    igual(faixa('BASE_VG', 'Margem de contribuição', 20).tom, 'ruim');
    igual(faixa('BASE_VG', 'Margem de contribuição', 30), null,
      'o PO não pediu verde para a margem');
  });

  teste('o alerta antigo continua sendo só o vermelho', () => {
    igual(chamar('alertaDaCelula_')('BASE_VG', 'Meses de vigência', 18), '');
    igual(chamar('alertaDaCelula_')('BASE_VG', 'Meses de vigência', 24), '');
  });

  teste('a fila do VG abre a Vigência pelos meses, já com a cor', () => {
    const doTeste = carregar('primeiro.adm@exemplo.com');
    doTeste.chamar('instalarRECC()');
    const doVg = doTeste.chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_VG');
    const meses = (quantos) => {
      const quando = new Date();
      quando.setMonth(quando.getMonth() - quantos);
      return escrever(quando);
    };
    [[5, 'Empresa de 5'], [18, 'Empresa de 18'], [24, 'Empresa de 24']]
      .forEach(([quantos, nome]) => {
        doTeste.chamar('cadastrarCaso')(doVg.id, {
          datadoprotocolodasolicitacao: escrever(hoje), analista: 'primeiro.adm',
          status: 'Aguardando', subestipulante: nome, iniciodavigencia: meses(quantos)
        });
      });

    const resumo = doTeste.chamar('resumoDoCanal')(doVg.id, {});
    const posicao = resumo.colunas.findIndex((g) => g.titulo === 'Vigência');
    verdadeiro(posicao >= 0, 'o grupo Vigência existe');
    igual(resumo.colunas[posicao].colunas[0].cabecalho, 'Meses de vigência',
      'os meses abrem o grupo: é o destaque');

    const tomDe = (nome) => {
      const linha = resumo.fila.find((l) => JSON.stringify(l.celulas).indexOf(nome) >= 0);
      return linha.celulas[posicao][0].tomDoAlerta;
    };
    igual(tomDe('Empresa de 5'), 'ruim');
    igual(tomDe('Empresa de 18'), 'atencao');
    igual(tomDe('Empresa de 24'), 'bom');
  });

  teste('a tela pinta as três cores, com estilo declarado', () => {
    const tela = lerPeca('Trabalho');
    contem(tela, "{ atencao: ' em-atencao', bom: ' em-bom' }[celula.tomDoAlerta]");
    const estilos = lerPeca('Estilos');
    contem(estilos, '.fila .em-atencao');
    contem(estilos, '.fila .em-bom');
  });

}

module.exports = { rodarTestesDoTrabalho };
