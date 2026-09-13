/**
 * ============================================================================
 * PGO — testes-painel.js · a Etapa 5
 * ============================================================================
 * O painel só é útil se o número do cartão bater com o que a fila mostra.
 * Boa parte destes testes existe para provar que cartão e fila saem da MESMA
 * lista, já filtrada pelo alcance do nível.
 * ============================================================================
 */

const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario } =
  require('./ferramentas');

function rodarTestesDoPainel() {
  console.log('\nEtapa 5 — Dashboard');

  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');

  const mesa = chamar('mesasVisiveis_()').find((m) => m.aba === 'BASE_MESA');
  const hoje = new Date();
  const comZero = (n) => (n < 10 ? '0' : '') + n;
  const escrever = (data) => comZero(data.getDate()) + '/'
    + comZero(data.getMonth() + 1) + '/' + data.getFullYear();

  function diasAtras(dias) {
    const data = new Date();
    data.setDate(data.getDate() - dias);
    return escrever(data);
  }

  secao('Os cartões');

  teste('base vazia entrega zeros, não uma tela quebrada', () => {
    const resumo = chamar('resumoDaMesa')(mesa.id, {});
    igual(resumo.total, 0);
    igual(resumo.fila.length, 0);
    igual(resumo.cartoes[0].rotulo, 'Total de casos');
    igual(resumo.cartoes[0].valor, 0);
  });

  teste('a mesa escolhe quais situações viram cartão', () => {
    // A Mesa Diamante tem menos demanda que a RET: sete cartões para poucos
    // casos é ruído. Ela pede só pendente e concluído, na aba MESAS.
    igual(mesa.cartoesDoPainel, 'Pendente, Concluído');
    const rotulos = chamar('resumoDaMesa')(mesa.id, {}).cartoes.map((c) => c.rotulo);
    igual(rotulos.join(' | '),
      'Total de casos | Pendente | Concluído | Finalizados na célula');

    const ret = chamar('mesasVisiveis_()').find((m) => m.aba === 'BASE_RET');
    igual(ret.cartoesDoPainel, '', 'a RET não escolheu, então mostra todas');
    igual(chamar('resumoDaMesa')(ret.id, {}).cartoes.length, 6,
      'total mais as cinco situações da RET');
  });

  teste('cor inventada na planilha vira neutro, e não quebra a tela', () => {
    igual(chamar('tomValido_')('arco-íris'), 'neutro');
    igual(chamar('tomValido_')(''), 'neutro');
    igual(chamar('tomValido_')('BOM'), 'bom', 'a comparação ignora caixa');
  });

  teste('há um cartão por situação, e situação sem caso aparece zerada', () => {
    // Sumir do painel esconderia justamente a informação de que ela zerou.
    chamar('inserirVariosRegistros_')('BASE_MESA', [
      { Analista: 'Ana Martins', Status: 'Pendente',
        'Data de entrada': escrever(hoje), 'Nome do segurado': 'Cliente 1' },
      { Analista: 'Ana Martins', Status: 'Pendente',
        'Data de entrada': escrever(hoje), 'Nome do segurado': 'Cliente 2' },
      { Analista: 'Diego Castilho', Status: 'Concluído',
        'Data de entrada': escrever(hoje), 'Nome do segurado': 'Cliente 3',
        'Data da finalização': escrever(hoje) }
    ]);

    const resumo = chamar('resumoDaMesa')(mesa.id, {});
    const porRotulo = {};
    resumo.cartoes.forEach((c) => { porRotulo[c.rotulo] = c.valor; });

    igual(porRotulo['Total de casos'], 3);
    igual(porRotulo['Pendente'], 2);
    igual(porRotulo['Concluído'], 1);

    // Na RET, que mostra todas, dá para conferir a situação sem nenhum caso.
    const ret = chamar('mesasVisiveis_()').find((m) => m.aba === 'BASE_RET');
    const daRet = {};
    chamar('resumoDaMesa')(ret.id, {}).cartoes
      .forEach((c) => { daRet[c.rotulo] = c.valor; });
    igual(daRet['Em tratativa'], 0, 'situação sem caso vale zero, não some');
  });

  teste('cada situação leva a sua cor para o cartão e para a fila', () => {
    // A cor mora no CATALOGO como NOME de tom, e não como código: cada tema
    // pinta o seu verde. Gravar #15794A deixaria o verde do tema claro
    // aparecendo no escuro.
    const resumo = chamar('resumoDaMesa')(mesa.id, {});
    const porRotulo = {};
    resumo.cartoes.forEach((c) => { porRotulo[c.rotulo] = c.tom; });
    igual(porRotulo['Pendente'], 'atencao');
    igual(porRotulo['Concluído'], 'bom');

    resumo.fila.forEach((caso) => {
      verdadeiro(chamar('RECC_TONS').indexOf(caso.tom) >= 0,
        'tom desconhecido na fila: ' + caso.tom);
    });
    igual(resumo.fila.find((c) => c.situacao === 'Pendente').tom, 'atencao');
    igual(resumo.fila.find((c) => c.situacao === 'Concluído').tom, 'bom');
  });

  teste('"finalizado na célula" conta o que não foi encaminhado', () => {
    // Finalização preenchida E área responsável vazia. É conta, não coluna:
    // assim não mente quando alguém edita a área direto na planilha.
    igual(chamar('resumoDaMesa')(mesa.id, {}).cartoes
      .find((c) => c.chave === 'naCelula').valor, 1);

    chamar('inserirRegistro_')('BASE_MESA', {
      Analista: 'Ana Martins', Status: 'Concluído',
      'Data de entrada': escrever(hoje), 'Nome do segurado': 'Encaminhado',
      'Data da finalização': escrever(hoje), 'Área responsável': 'Sinistro'
    });

    igual(chamar('resumoDaMesa')(mesa.id, {}).cartoes
      .find((c) => c.chave === 'naCelula').valor, 1,
      'o encaminhado não conta como resolvido na célula');
  });

  teste('a mesa que não declara as colunas não ganha o cartão', () => {
    const ret = chamar('mesasVisiveis_()').find((m) => m.aba === 'BASE_RET');
    const resumo = chamar('resumoDaMesa')(ret.id, {});
    verdadeiro(!resumo.cartoes.some((c) => c.chave === 'naCelula'),
      'cartão sempre zerado pareceria um problema — melhor não existir');
  });

  secao('O período e a fila');

  teste('a fila mostra só a janela recente, e o mais novo primeiro', () => {
    chamar('inserirRegistro_')('BASE_MESA', {
      Analista: 'Ana Martins', Status: 'Pendente',
      'Data de entrada': diasAtras(90), 'Nome do segurado': 'Caso antigo'
    });

    const resumo = chamar('resumoDaMesa')(mesa.id, {});
    igual(resumo.periodo.dias, 30);
    verdadeiro(!JSON.stringify(resumo.fila).includes('Caso antigo'),
      'fora da janela não aparece na fila');
    igual(resumo.fila[0].valores[2], 'Encaminhado',
      'o registro mais recente encabeça a fila');
  });

  teste('as colunas da fila são as que a mesa declarou', () => {
    const resumo = chamar('resumoDaMesa')(mesa.id, {});
    igual(resumo.colunas.map((c) => c.cabecalho).join(' | '),
      'Data de entrada | Status | Nome do segurado | Documento (CPF) | '
      + 'Corretora | Analista');
    verdadeiro(resumo.colunas[1].ehStatus, 'a coluna de situação se identifica');
  });

  teste('a data chega à tela como texto, e no formato brasileiro', () => {
    // Um objeto de data atravessando a ponte chega com o fuso de quem abriu,
    // e o mesmo caso apareceria com dias diferentes para pessoas diferentes.
    const primeira = chamar('resumoDaMesa')(mesa.id, {}).fila[0].valores[0];
    igual(typeof primeira, 'string');
    verdadeiro(/^\d{2}\/\d{2}\/\d{4}$/.test(primeira), 'veio ' + primeira);
  });

  teste('a variação compara com o período anterior, e cala quando não dá', () => {
    // Mostrar "+100%" porque saiu de zero é ruído que a operação aprende a
    // ignorar — e junto com ele ignora a variação que importa.
    const total = chamar('resumoDaMesa')(mesa.id, {}).cartoes[0];
    igual(total.anterior, 0, 'não havia nada no período anterior');
    igual(total.variacao, null, 'sem base de comparação, não há variação');

    // Agora com base: um caso no período anterior, quatro no atual.
    chamar('inserirRegistro_')('BASE_MESA', {
      Analista: 'Ana Martins', Status: 'Pendente',
      'Data de entrada': diasAtras(40), 'Nome do segurado': 'Do mês passado'
    });
    const comBase = chamar('resumoDaMesa')(mesa.id, {}).cartoes[0];
    igual(comBase.anterior, 1);
    igual(comBase.variacao, 300, 'de 1 para 4 são +300%');
  });

  secao('Os filtros');

  teste('os filtros são os campos que já são lista — nada escrito em código', () => {
    const resumo = chamar('resumoDaMesa')(mesa.id, {});
    verdadeiro(resumo.filtrosDisponiveis.length > 0);
    verdadeiro(resumo.filtrosDisponiveis.length <= 4, 'no máximo quatro na tela');
    verdadeiro(resumo.filtrosDisponiveis.some((f) => f.chave === 'status'));
  });

  teste('filtrar muda o cartão e a fila juntos', () => {
    const resumo = chamar('resumoDaMesa')(mesa.id, { status: 'Pendente' });
    igual(resumo.total, 2);
    igual(resumo.fila.length, 2);
    igual(resumo.cartoes[0].valor, 2, 'o total acompanha o filtro');
    igual(resumo.totalNoPeriodo, 4, 'e o período inteiro continua visível');
  });

  teste('filtro sem valor não filtra nada', () => {
    igual(chamar('resumoDaMesa')(mesa.id, { status: '' }).total, 4);
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
      const resumo = chamar('resumoDaMesa')(mesa.id, {});
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
      lanca(() => chamar('resumoDaMesa')(mesa.id, {}), 'não abre a tela dashboard');
    });

    configuracao.telas = guardadas;
    chamar('atualizarRegistro_')('CATALOGO', operacao.Id, {
      Configuracao: JSON.stringify(configuracao)
    });
  });

  secao('Abrir e ocultar um caso');

  teste('o detalhe mostra só o que tem valor, agrupado por seção', () => {
    const primeiro = chamar('resumoDaMesa')(mesa.id, {}).fila[0];
    const detalhe = chamar('detalhesDoCaso')(mesa.id, primeiro.id);

    verdadeiro(detalhe.linhas.length > 0);
    verdadeiro(detalhe.linhas.every((l) => l.valor !== ''),
      'campo vazio não ocupa espaço no detalhe');
    verdadeiro(detalhe.linhas.some((l) => l.secao === 'Cliente'));
  });

  teste('o detalhe respeita o alcance do nível', () => {
    const doDiego = chamar('resumoDaMesa')(mesa.id, {}).fila
      .find((caso) => JSON.stringify(caso.valores).includes('Diego Castilho'));

    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      lanca(() => chamar('detalhesDoCaso')(mesa.id, doDiego.id), 'fora do seu alcance');
    });
  });

  teste('ocultar tira da fila e do cartão ao mesmo tempo', () => {
    const antes = chamar('resumoDaMesa')(mesa.id, {});
    chamar('ocultarCaso')(mesa.id, antes.fila[0].id);

    const depois = chamar('resumoDaMesa')(mesa.id, {});
    igual(depois.total, antes.total - 1);
    igual(depois.fila.length, antes.fila.length - 1);
    igual(depois.cartoes[0].valor, antes.cartoes[0].valor - 1);
  });
}

module.exports = { rodarTestesDoPainel };
