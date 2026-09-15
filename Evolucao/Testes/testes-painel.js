/**
 * ============================================================================
 * PGO — testes-painel.js · a Etapa 5
 * ============================================================================
 * O painel só é útil se o número do cartão bater com o que a fila mostra.
 * Boa parte destes testes existe para provar que cartão e fila saem da MESMA
 * lista, já filtrada pelo alcance do nível.
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario, ehData, lerPeca } =
  require('./ferramentas');

function rodarTestesDoPainel() {
  console.log('\nEtapa 5 — Dashboard');

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
    const painel = chamar('listarCardsDoPainel')('dashboard', canal.id);
    igual(painel.cartoes.length, 4);

    const antes = chamar('resumoDoCanal')(canal.id, {}).total;
    const sobrando = painel.cartoes.filter((c) => c.dimensao !== 'naCelula');
    chamar('salvarCardsDoPainel')('dashboard', canal.id, sobrando);

    const depois = chamar('resumoDoCanal')(canal.id, {});
    igual(depois.cartoes.length, 3, 'o cartão sumiu da tela');
    igual(depois.total, antes, 'e os casos continuam todos lá');

    // E volta, porque a linha não foi apagada — foi desligada.
    chamar('salvarCardsDoPainel')('dashboard', canal.id, painel.cartoes);
    igual(chamar('resumoDoCanal')(canal.id, {}).cartoes.length, 4);
  });

  teste('cartão além do teto, sem nome ou de situação inventada é recusado', () => {
    const painel = chamar('listarCardsDoPainel')('dashboard', canal.id);
    igual(painel.maximo, 12);

    const demais = [];
    for (let i = 0; i < 13; i++) {
      demais.push({ titulo: 'Card ' + i, dimensao: 'total', cor: 'neutro' });
    }
    lanca(() => chamar('salvarCardsDoPainel')('dashboard', canal.id, demais),
      'no máximo 12');
    lanca(() => chamar('salvarCardsDoPainel')('dashboard', canal.id,
      [{ titulo: '', dimensao: 'total' }]), 'precisa de um nome');
    lanca(() => chamar('salvarCardsDoPainel')('dashboard', canal.id,
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
    // que recusaria. A fila é leitura: derrubar o Dashboard inteiro porque
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

  teste('a fila abre o caso num modal, e não em outra tela', () => {
    const fs = require('fs');
    const path = require('path');
    const pasta = path.join(__dirname, '..', '..', 'Front-End');
    const dashboard = fs.readFileSync(path.join(pasta, 'Dashboard.html'), 'utf8');
    const modal = lerPeca('CasoEmModal');

    contem(dashboard, 'CasoEmModal.abrir(', 'ver detalhes abre o modal');
    contem(dashboard, 'data-editar', 'e o lápis abre o mesmo modal, já em edição');

    // As quatro ações do caso existem, e todas passam pelo modal: duas na
    // linha (ver e editar) e as outras duas no rodapé dele. Quatro botões por
    // linha comiam a largura da coluna "Responsável".
    contem(modal, "Servidor.chamar('editarCaso'");
    contem(modal, "Servidor.chamar('ocultarCaso'");
    contem(modal, "Servidor.chamar('alterarSituacaoDoCaso'");
    verdadeiro(dashboard.indexOf('data-trocar-situacao') < 0
      && dashboard.indexOf('data-ocultar') < 0,
      'as duas ações menos frequentes não repetem em toda linha');

    // Quatro saídas do modal: Esc, o X, o botão e clicar fora. Modal que
    // prende é modal que a pessoa aprende a não abrir.
    contem(modal, "evento.key === 'Escape'");
    contem(modal, "id=\"modal-x\"");
    contem(modal, 'evento.target === caixa');
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
      igual(resumo.podeOcultar, false, 'a Operação não oculta');
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
      lanca(() => chamar('resumoDoCanal')(canal.id, {}), 'não abre a tela dashboard');
    });

    configuracao.telas = guardadas;
    chamar('atualizarRegistro_')('CATALOGO', operacao.Id, {
      Configuracao: JSON.stringify(configuracao)
    });
  });

  secao('Abrir e ocultar um caso');

  teste('o detalhe traz o caso inteiro, inclusive o que está em branco', () => {
    // Campo vazio APARECE, com um travessão. Sumir faria a pessoa achar que
    // aquele campo não existe neste canal, quando ele existe e está em branco
    // — e "está em branco" é a informação que ela precisava.
    const primeiro = chamar('resumoDoCanal')(canal.id, {}).fila[0];
    const detalhe = chamar('detalhesDoCaso')(canal.id, primeiro.id);

    verdadeiro(detalhe.linhas.length > 0);
    verdadeiro(detalhe.linhas.some((l) => l.valor === ''),
      'o caso de exemplo tem campo em branco, e ele precisa constar');
    verdadeiro(detalhe.linhas.some((l) => l.secao === 'Cliente'));
    verdadeiro(detalhe.linhas.every((l) => l.chave),
      'toda linha diz de que campo veio');
  });

  teste('o detalhe conta a história do caso, tirada da auditoria', () => {
    const primeiro = chamar('resumoDoCanal')(canal.id, {}).fila[0];
    const detalhe = chamar('detalhesDoCaso')(canal.id, primeiro.id);

    verdadeiro(Array.isArray(detalhe.historico));
    verdadeiro(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/.test(detalhe.atualizadoEm)
      || detalhe.atualizadoEm === '',
      'a data de atualização vem formatada, veio ' + detalhe.atualizadoEm);
  });

  teste('trocar a situação é um gesto só, e NÃO vai para a auditoria', () => {
    const novo = chamar('cadastrarCaso')(canal.id, {
      analista: 'Ana Martins', status: 'Em andamento',
      datadeentrada: escrever(hoje), nomedosegurado: 'Caso da troca'
    });

    const opcoes = chamar('situacoesParaTrocar')(canal.id, novo.id);
    igual(opcoes.atual, 'Em andamento');
    verdadeiro(opcoes.opcoes.some((o) => o.valor === 'Concluído'));

    chamar('alterarSituacaoDoCaso')(canal.id, novo.id, 'Concluído');

    const detalhe = chamar('detalhesDoCaso')(canal.id, novo.id);
    igual(detalhe.situacao, 'Concluído');

    // Troca de status é o evento mais frequente do sistema: um caso passa por
    // quatro ou cinco antes de fechar. Guardar cada uma na auditoria são
    // quase um milhão de linhas numa base de 200 mil casos, numa aba da qual
    // ninguém tira relatório. O que interessa — QUANDO cada etapa aconteceu —
    // passou a ser carimbado na própria linha do caso.
    verdadeiro(!detalhe.historico.some((p) => p.acao === 'Situação alterada'),
      'a troca de status não deve mais entrar na auditoria');

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

  teste('o detalhe respeita o alcance do nível', () => {
    const doDiego = chamar('resumoDoCanal')(canal.id, {}).fila
      .find((caso) => JSON.stringify(caso.celulas).includes('Diego Castilho'));

    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      lanca(() => chamar('detalhesDoCaso')(canal.id, doDiego.id), 'Este caso é de Diego Castilho');
    });
  });

  teste('ocultar tira da fila e do cartão ao mesmo tempo', () => {
    const antes = chamar('resumoDoCanal')(canal.id, {});
    chamar('ocultarCaso')(canal.id, antes.fila[0].id);

    const depois = chamar('resumoDoCanal')(canal.id, {});
    igual(depois.total, antes.total - 1);
    igual(depois.fila.length, antes.fila.length - 1);
    igual(depois.cartoes[0].valor, antes.cartoes[0].valor - 1);
  });
}

module.exports = { rodarTestesDoPainel };
