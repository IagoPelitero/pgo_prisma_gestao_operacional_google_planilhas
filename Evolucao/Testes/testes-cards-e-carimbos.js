/**
 * ============================================================================
 * PGO — testes-cards-e-carimbos.js · cards por coluna, carimbo por item, SUSEP
 * ============================================================================
 * Três pedidos do PO, na mesma rodada:
 *
 *   1. "os cards estão limitados apenas a status? Vamos aumentar o leque para
 *      demais colunas, menos as de data, e corrigir o bug mencionado" — o menu
 *      "O que contar" marcava a opção errada quando havia dois cards "Já
 *      passaram por".
 *
 *   2. Os status "1º/2º contato realizado" viraram "Contatando", com uma lista
 *      de tentativas ao lado, e "Data do 1º contato"/"Data do 2º contato"
 *      pararam de receber data. "Não consigo ter uma forma de escolher em qual
 *      coluna carimba? Assim evitamos troca de nomes no meio do caminho, e
 *      igual para status." No caminho apareceu o bug do canal: editar um item
 *      em Ajustes Gerais apagava o canal dele.
 *
 *   3. "A SUSEP não aceita apenas letras. Aceitar ou só números ou só letras ou
 *      o código: 7dmd8gs, jamjamm, 77777777."
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, ehData } = require('./ferramentas');

const lerTela = (nome) => fs.readFileSync(
  path.join(__dirname, '..', '..', 'Front-End', nome), 'utf8');

function instalado() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.chamar('definirSenhaDeAdministrador')('segredo123', '');
  t.chamar('liberarComSenha')('segredo123');
  const canais = t.chamar('canaisVisiveis_()');
  t.ret = canais.find((c) => c.aba === 'BASE_RET');
  t.mesa = canais.find((c) => c.aba === 'BASE_MESA');
  t.linha = (aba, id) => t.chamar('lerRegistros_')(aba).find((l) => l.__id === id);
  return t;
}

/**
 * A RET como o PO montou: a lista de tentativas e o campo "Tentativa" que a usa.
 * As tentativas carimbam nas colunas que eram dos status antigos.
 */
function retComTentativas() {
  const t = instalado();
  t.lista = t.chamar('criarLista')('Tentativa de contato');
  ['1ª tentativa de contato sem sucesso', '2ª tentativa de contato sem sucesso']
    .forEach((nome, i) => {
      t.chamar('salvarItemDoCatalogo')({ tipo: t.lista, canalId: '', nome: nome,
        ordem: i + 1, ativo: true });
    });
  t.chamar('criarCampo')(t.ret.id, { rotulo: 'Tentativa', tipo: 'seletor', secao: 'Situação' });
  const campo = t.chamar('listarCamposDoCanal')(t.ret.id).find((c) => c.cabecalho === 'Tentativa');
  t.chamar('salvarCampo')({ id: campo.id, rotulo: 'Tentativa', secao: 'Situação',
    tipo: 'seletor', catalogo: t.lista, obrigatorio: false, ativo: true });
  // A edição manda o formulário inteiro, como a tela: o status vai junto.
  t.editar = (id, valores) => t.chamar('editarCaso')(t.ret.id, id, Object.assign({
    nomedocliente: 'A', status: t.linha('BASE_RET', id).status }, valores));
  t.item = (nome) => t.chamar('listarCatalogo')(t.lista, '').find((i) => i.nome === nome);
  t.carimbarEm = (nome, coluna, extra) => {
    const item = t.item(nome);
    t.chamar('salvarItemDoCatalogo')(Object.assign({}, item,
      { tipo: t.lista, colunaDeCarimbo: coluna }, extra || {}));
  };
  return t;
}

function rodarTestesDosCardsEDosCarimbos() {
  console.log('\nCards por coluna, carimbo por item de lista, SUSEP de letra');

  /* ----------------------------------------------------------------------- */
  secao('SUSEP: só números, só letras ou os dois');

  const suseps = ['7dmd8gs', 'jamjamm', '77777777'];

  teste('as três formas entram com o campo como vem de fábrica', () => {
    const t = instalado();
    suseps.forEach((susep) => {
      const r = t.chamar('cadastrarCaso')(t.ret.id, { susep: susep, nomedocliente: 'A' });
      igual(t.linha('BASE_RET', r.id).SUSEP, susep, 'gravada exatamente como digitada');
    });
  });

  teste('e entram com o campo SUSEP em QUALQUER tipo — era aí que "jamjamm" voltava', () => {
    // O erro do PO: com o campo como identificador, "jamjamm" voltava com
    // "precisa ter ao menos um dígito", e "7dmd8gs" passava.
    ['identificador', 'documento', 'numero'].forEach((tipo) => {
      const t = instalado();
      const campo = t.chamar('listarCamposDoCanal')(t.ret.id).find((c) => c.chave === 'susep');
      t.chamar('salvarCampo')({ id: campo.id, tipo: tipo });
      suseps.forEach((susep) => {
        const r = t.chamar('cadastrarCaso')(t.ret.id, { susep: susep, nomedocliente: 'A' });
        igual(t.linha('BASE_RET', r.id).SUSEP, susep,
          'tipo ' + tipo + ': a SUSEP "' + susep + '" não perde letra nem dígito');
      });
    });
  });

  teste('editar o caso com SUSEP só de letras também passa', () => {
    const t = instalado();
    const campo = t.chamar('listarCamposDoCanal')(t.ret.id).find((c) => c.chave === 'susep');
    t.chamar('salvarCampo')({ id: campo.id, tipo: 'identificador' });
    const r = t.chamar('cadastrarCaso')(t.ret.id, { susep: '77777777', nomedocliente: 'A' });
    t.chamar('editarCaso')(t.ret.id, r.id, { susep: 'jamjamm', nomedocliente: 'A',
      status: t.linha('BASE_RET', r.id).status });
    igual(t.linha('BASE_RET', r.id).SUSEP, 'jamjamm');
  });

  teste('o selo confere a SUSEP só de letras no cadastro de corretoras', () => {
    const t = instalado();
    t.chamar('salvarCorretora')({ susep: 'jamjamm', corretora: 'Corretora J', sucursal: 'X' });
    igual(t.chamar('consultarSusep')('JAMJAMM', t.ret.id).corretora, 'Corretora J');
  });

  teste('na base fora do contrato, a coluna SUSEP continua sendo texto', () => {
    // O contrato das bases de fábrica já diz "texto". Um canal novo não tem
    // contrato: quem decide é o tipo do campo, e identificador guardaria só o
    // dígito — "jamjamm" iria vazio para a célula.
    const t = instalado();
    const campo = t.chamar('listarCamposDoCanal')(t.ret.id).find((c) => c.chave === 'susep');
    t.chamar('salvarCampo')({ id: campo.id, tipo: 'identificador' });
    const declarados = t.chamar('tiposDeclaradosPeloAdministrador_()');
    igual(declarados.BASE_RET.susep, 'texto');
  });

  teste('a tela não põe máscara na SUSEP: a máscara guarda só dígito', () => {
    const tela = lerTela('Comuns.html');
    contem(tela, "var mascara = campo.chave === 'susep' ? '' : campo.mascara;");
  });

  teste('os outros campos continuam conferidos pelo tipo deles', () => {
    const t = instalado();
    igual(t.chamar('conferirCampo_')({ chave: 'cpf', cabecalho: 'CPF', tipo: 'documento',
      mascara: '' }, 'abc'), 'precisa ter ao menos um dígito');
    igual(t.chamar('conferirCampo_')({ chave: 'susep', cabecalho: 'SUSEP',
      tipo: 'identificador', mascara: '' }, 'jamjamm'), '');
  });

  /* ----------------------------------------------------------------------- */
  secao('Cards: o leque vai além do status');

  teste('o menu oferece o valor de cada campo de lista e Sim/Não', () => {
    const t = retComTentativas();
    const opcoes = t.chamar('listarCardsDoPainel')('trabalho', t.ret.id).oQueContar;
    const valores = opcoes.filter((o) => o.chave === 'valor');
    const tentativa = valores.filter((o) => o.coluna === 'Tentativa');
    igual(tentativa.map((o) => o.filtro).join('|'),
      '1ª tentativa de contato sem sucesso|2ª tentativa de contato sem sucesso');
    igual(tentativa[0].rotulo, 'Tentativa: 1ª tentativa de contato sem sucesso');
    igual(t.chamar('opcoesDeValorDoCartao_')(null, 'simOuNao', t.ret)
      .map((o) => o.valor + '=' + o.rotulo).join('|'), 'SIM=Sim|NAO=Não',
      'coluna Sim/Não vira dois cards possíveis');
  });

  teste('as outras colunas viram "Preenchida", menos data, status e id', () => {
    const t = retComTentativas();
    const opcoes = t.chamar('listarCardsDoPainel')('trabalho', t.ret.id).oQueContar;
    const preenchidas = opcoes.filter((o) => o.grupo === 'Coluna preenchida');
    verdadeiro(preenchidas.some((o) => o.filtro.toLowerCase() === 'nome do cliente'),
      'texto entra');
    verdadeiro(preenchidas.some((o) => o.filtro === 'SUSEP'), 'a SUSEP entra');
    const estrutura = t.chamar('estruturaDaAba_')('BASE_RET');
    const datas = estrutura.cabecalhos.filter((c, i) =>
      ['data', 'dataHora', 'hora'].indexOf(estrutura.tipos[i]) >= 0);
    verdadeiro(datas.length > 0, 'a base tem colunas de data');
    verdadeiro(preenchidas.every((o) => datas.indexOf(o.filtro) < 0),
      'nenhuma coluna de data vira "Preenchida"');
    verdadeiro(opcoes.every((o) => String(o.coluna || '').toLowerCase() !== 'status'
      && String(o.filtro).toLowerCase() !== 'status'),
      'o status já tem os cards dele');
    verdadeiro(preenchidas.every((o) => o.filtro.toLowerCase() !== 'id'),
      '"Preenchida: id" seria o Total com outro nome');
  });

  teste('lista de cadastro (usuários, corretoras) não vira um card por valor', () => {
    const t = instalado();
    const campo = { TipoCampo: 'seletor', Configuracao: JSON.stringify({ listaDe: 'corretoras' }) };
    igual(t.chamar('opcoesDeValorDoCartao_')(campo, 'texto', t.ret).length, 0);
  });

  teste('o card de valor conta quantos casos têm o valor HOJE', () => {
    const t = retComTentativas();
    const um = '1ª tentativa de contato sem sucesso';
    t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'A', tentativa: um });
    t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'B', tentativa: um });
    t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'C',
      tentativa: '2ª tentativa de contato sem sucesso' });
    t.chamar('salvarCardsDoPainel')('trabalho', t.ret.id, [
      { titulo: 'Total', dimensao: 'total', cor: 'neutro', mostrar: true },
      { titulo: '1ª tentativa', dimensao: 'valor', coluna: 'Tentativa', filtro: um,
        cor: 'atencao', mostrar: true }
    ]);
    const lidos = t.chamar('listarCardsDoPainel')('trabalho', t.ret.id).cartoes;
    igual(lidos.find((c) => c.titulo === '1ª tentativa').coluna, 'Tentativa',
      'a coluna volta para a tela');
    const canal = t.chamar('canalPeloId_')(t.ret.id);
    const cartoes = t.chamar('contarCartoes_')(t.chamar('lerRegistros_')('BASE_RET'), [], canal);
    const card = cartoes.find((c) => c.rotulo === '1ª tentativa');
    igual(card.valor, 2);
    igual(card.dimensao, 'valor', 'o card diz a regra pela qual contou');
    igual(cartoes.find((c) => c.rotulo === 'Total').dimensao, 'total');
  });

  teste('o card de valor compara sem acento e sem caixa, como o resto do sistema', () => {
    // O valor pode ter sido digitado direto na planilha.
    const t = retComTentativas();
    const canal = t.chamar('canalPeloId_')(t.ret.id);
    const registros = [{ Tentativa: '1ª TENTATIVA DE CONTATO SEM SUCESSO ' },
      { Tentativa: '2ª tentativa de contato sem sucesso' }, { Tentativa: '' }];
    igual(t.chamar('contarComOValor_')(registros, canal, 'tentativa',
      '1ª tentativa de contato sem sucesso'), 1);
  });

  teste('card de valor sem a coluna ou sem o valor é recusado', () => {
    const t = retComTentativas();
    lanca(() => t.chamar('salvarCardsDoPainel')('trabalho', t.ret.id, [
      { titulo: 'Sem coluna', dimensao: 'valor', coluna: '', filtro: 'x', mostrar: true }
    ]), 'precisa da coluna e do valor');
    lanca(() => t.chamar('salvarCardsDoPainel')('trabalho', t.ret.id, [
      { titulo: 'Coluna que não existe', dimensao: 'valor', coluna: 'Não existe',
        filtro: 'x', mostrar: true }
    ]), 'não existe');
  });

  teste('a coluna do card de valor que sumiu da base faz o card sumir, sem estourar', () => {
    const t = retComTentativas();
    const canal = t.chamar('canalPeloId_')(t.ret.id);
    igual(t.chamar('contarComOValor_')([], canal, 'Coluna que saiu', 'x'), null);
  });

  teste('no Trabalho, só o card de status filtra a fila', () => {
    // Um "Já passaram por" clicado filtrava a fila por um status com o nome do
    // card: fila vazia, sem erro.
    const tela = lerTela('Trabalho.html');
    contem(tela, "var filtravel = cartao.dimensao === 'situacao'");
  });

  /* ----------------------------------------------------------------------- */
  secao('O bug do menu "O que contar"');

  teste('a opção marcada é a que bate em regra, filtro E coluna', () => {
    const tela = lerTela('Configuracoes.html');
    contem(tela, 'function opcoesDoQueContar(card)');
    contem(tela, 'normalizarTexto(opcao.filtro) === normalizarTexto(card.filtro)');
    verdadeiro(tela.indexOf("&& (opcao.chave !== 'situacao'") < 0,
      'a comparação antiga, que olhava só a regra, saiu');
  });

  teste('a cópia do card na tela leva a coluna: salvar de novo não perde o card de valor', () => {
    contem(lerTela('Configuracoes.html'), "filtro: card.filtro, coluna: card.coluna || '',");
  });

  teste('card cuja opção sumiu aparece como tal, e não cai na primeira opção', () => {
    const tela = lerTela('Configuracoes.html');
    contem(tela, 'Não está mais disponível: ');
    contem(tela, "if (parte === 'contar' && this.value !== '')");
  });

  /* ----------------------------------------------------------------------- */
  secao('O canal do item em Ajustes Gerais');

  teste('editar sem mandar o canal mantém o canal do item', () => {
    // O bug: a tela não mandava o canal, e o status da Mesa virava de todos.
    const t = instalado();
    const item = t.chamar('listarCatalogo')('STATUS', '')
      .find((i) => i.nome === 'Em andamento' && i.canalId === String(t.mesa.id));
    t.chamar('salvarItemDoCatalogo')({ id: item.id, tipo: 'STATUS', nome: item.nome,
      rotulo: 'Trabalhando', cor: item.cor, colunaDeCarimbo: item.colunaDeCarimbo,
      final: item.final, ordem: item.ordem, ativo: true });
    igual(t.chamar('listarCatalogo')('STATUS', '').find((i) => i.id === item.id).canalId,
      String(t.mesa.id));
  });

  teste('a tela manda o canal escolhido, e "Todos os canais" é escolha', () => {
    const t = instalado();
    const item = t.chamar('listarCatalogo')('STATUS', '')
      .find((i) => i.nome === 'Em andamento' && i.canalId === String(t.mesa.id));
    t.chamar('salvarItemDoCatalogo')(Object.assign({}, item, { tipo: 'STATUS', canalId: '' }));
    igual(t.chamar('listarCatalogo')('STATUS', '').find((i) => i.id === item.id).canalId, '');
    t.chamar('salvarItemDoCatalogo')(Object.assign({}, item,
      { tipo: 'STATUS', canalId: String(t.mesa.id) }));
    igual(t.chamar('listarCatalogo')('STATUS', '').find((i) => i.id === item.id).canalId,
      String(t.mesa.id), 'e o canal volta pelo menu');
    const tela = lerTela('Configuracoes.html');
    contem(tela, "canalId: valorDe('canal-do-item'),");
  });

  teste('o diagnóstico lista os status sem canal', () => {
    const t = instalado();
    const blocoDosCanais = () => t.chamar('diagnosticoRECC()').blocos
      .find((b) => b.chave === 'canais').itens;
    verdadeiro(!blocoDosCanais().some((i) => i.oQue.indexOf('status sem canal') > 0),
      'de fábrica, todo status tem canal');
    const item = t.chamar('listarCatalogo')('STATUS', '')
      .find((i) => i.nome === 'Em andamento' && i.canalId === String(t.mesa.id));
    t.chamar('salvarItemDoCatalogo')(Object.assign({}, item, { tipo: 'STATUS', canalId: '' }));
    const aviso = blocoDosCanais().find((i) => i.oQue.indexOf('status sem canal') > 0);
    verdadeiro(!!aviso, 'o status que perdeu o canal aparece no laudo');
    igual(aviso.situacao, 'atencao');
    contem(aviso.detalhe, 'Em andamento');
  });

  /* ----------------------------------------------------------------------- */
  secao('O carimbo pelo item da lista — as tentativas de contato');

  teste('escolher a 1ª tentativa carimba "Data do 1º contato"', () => {
    const t = retComTentativas();
    t.carimbarEm('1ª tentativa de contato sem sucesso', 'Data do 1º contato');
    const r = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'A',
      tentativa: '1ª tentativa de contato sem sucesso' });
    verdadeiro(ehData(t.linha('BASE_RET', r.id)['Data do 1º contato']),
      'o cadastro já carimba');
  });

  teste('passar para a 2ª carimba a 2ª e mantém a data da 1ª', () => {
    const t = retComTentativas();
    t.carimbarEm('1ª tentativa de contato sem sucesso', 'Data do 1º contato');
    t.carimbarEm('2ª tentativa de contato sem sucesso', 'Data do 2º contato');
    const r = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'A' });
    igual(String(t.linha('BASE_RET', r.id)['Data do 1º contato'] || ''), '',
      'sem tentativa, sem carimbo');
    t.editar(r.id, { nomedocliente: 'A', tentativa: '1ª tentativa de contato sem sucesso' });
    const primeira = t.linha('BASE_RET', r.id)['Data do 1º contato'];
    verdadeiro(ehData(primeira), 'a 1ª carimbou na edição');
    t.editar(r.id, { nomedocliente: 'A', tentativa: '2ª tentativa de contato sem sucesso' });
    const linha = t.linha('BASE_RET', r.id);
    verdadeiro(ehData(linha['Data do 2º contato']), 'a 2ª carimbou');
    igual(linha['Data do 1º contato'].getTime(), primeira.getTime(), 'a 1ª não mudou');
  });

  teste('voltar a um item por onde já passou não reescreve a data', () => {
    const t = retComTentativas();
    t.carimbarEm('1ª tentativa de contato sem sucesso', 'Data do 1º contato');
    const r = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'A',
      tentativa: '1ª tentativa de contato sem sucesso' });
    const marca = new Date(2026, 0, 2, 10, 0, 0);
    t.chamar('atualizarRegistro_')('BASE_RET', r.id, { 'Data do 1º contato': marca });
    t.editar(r.id, { nomedocliente: 'A', tentativa: '2ª tentativa de contato sem sucesso' });
    t.editar(r.id, { nomedocliente: 'A', tentativa: '1ª tentativa de contato sem sucesso' });
    igual(t.linha('BASE_RET', r.id)['Data do 1º contato'].getTime(), marca.getTime());
  });

  teste('salvar sem mexer na tentativa não carimba nada', () => {
    const t = retComTentativas();
    const r = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'A',
      tentativa: '1ª tentativa de contato sem sucesso' });
    // O carimbo foi ligado DEPOIS: o caso já estava na 1ª tentativa.
    t.carimbarEm('1ª tentativa de contato sem sucesso', 'Data do 1º contato');
    t.editar(r.id, { nomedocliente: 'A mudado', tentativa: '1ª tentativa de contato sem sucesso' });
    igual(String(t.linha('BASE_RET', r.id)['Data do 1º contato'] || ''), '');
  });

  teste('trocar o RÓTULO do item não muda onde ele carimba', () => {
    // O pedido: "como as tentativas podem mudar de nome…". A escolha mora na
    // linha do item, pelo Id.
    const t = retComTentativas();
    t.carimbarEm('1ª tentativa de contato sem sucesso', 'Data do 1º contato',
      { rotulo: 'Primeira tentativa (sem sucesso)' });
    const item = t.item('1ª tentativa de contato sem sucesso');
    igual(item.rotulo, 'Primeira tentativa (sem sucesso)');
    igual(item.colunaDeCarimbo, 'Data do 1º contato');
    const r = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'A',
      tentativa: '1ª tentativa de contato sem sucesso' });
    verdadeiro(ehData(t.linha('BASE_RET', r.id)['Data do 1º contato']));
  });

  teste('"Já contatados" volta a contar, pelo carimbo da tentativa', () => {
    const t = retComTentativas();
    t.carimbarEm('1ª tentativa de contato sem sucesso', 'Data do 1º contato');
    t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'A',
      tentativa: '1ª tentativa de contato sem sucesso' });
    t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'B' });
    const canal = t.chamar('canalPeloId_')(t.ret.id);
    const cartoes = t.chamar('contarCartoes_')(t.chamar('lerRegistros_')('BASE_RET'), [],
      canal, 'produtividade');
    igual(cartoes.find((c) => c.rotulo === 'Já contatados').valor, 1);
  });

  teste('a coluna precisa ser de data, ou uma coluna sua', () => {
    const t = retComTentativas();
    lanca(() => t.carimbarEm('1ª tentativa de contato sem sucesso', 'nome do cliente'),
      'não recebe carimbo');
    // Uma coluna escrita direto na planilha: o sistema não sabe o tipo dela.
    const aba = t.ambiente.planilha.getSheetByName('BASE_RET');
    aba.insertColumnsBefore(3, 1);
    aba.getRange(1, 3).setNumberFormat('@');
    aba.getRange(1, 3).setValue('Data da 1ª tentativa');
    t.chamar('esquecerEstruturaLida_()');
    t.carimbarEm('1ª tentativa de contato sem sucesso', 'Data da 1ª tentativa');
    const r = t.chamar('cadastrarCaso')(t.ret.id, { nomedocliente: 'A',
      tentativa: '1ª tentativa de contato sem sucesso' });
    // A coluna sua é texto para o sistema: o carimbo vai como "dd/MM/aaaa HH:mm",
    // e não como "Wed Oct 14 2026 14:50:59 GMT+0000".
    verdadeiro(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(
      String(t.linha('BASE_RET', r.id)['Data da 1ª tentativa'])),
      'o carimbo na coluna sua é legível: ' + t.linha('BASE_RET', r.id)['Data da 1ª tentativa']);
  });

  teste('lista que nenhum campo usa não guarda coluna de carimbo', () => {
    const t = instalado();
    const lista = t.chamar('criarLista')('Lista solta');
    const id = t.chamar('salvarItemDoCatalogo')({ tipo: lista, canalId: '', nome: 'Um',
      colunaDeCarimbo: 'Data do 1º contato', ordem: 1, ativo: true });
    igual(t.chamar('listarCatalogo')(lista, '').find((i) => i.id === id).colunaDeCarimbo, '');
    igual(t.chamar('opcoesDoCarimboDoItem')(lista).carimba, false);
  });

  teste('o menu da coluna traz as colunas de data de cada canal', () => {
    const t = retComTentativas();
    const opcoes = t.chamar('opcoesDoCarimboDoItem')(t.lista);
    igual(opcoes.carimba, true);
    const ret = opcoes.canais.find((c) => c.id === String(t.ret.id));
    verdadeiro(ret.usaALista, 'a RET usa a lista de tentativas');
    verdadeiro(ret.colunas.indexOf('Data do 1º contato') >= 0);
    verdadeiro(ret.colunas.every((c) => c.toLowerCase() !== 'nome do cliente'),
      'texto fica de fora');
    verdadeiro(!opcoes.canais.find((c) => c.id === String(t.mesa.id)).usaALista,
      'a Mesa não usa a lista');
  });

  teste('o status antigo, com coluna de antes desta regra, continua salvando', () => {
    const t = instalado();
    const item = t.chamar('listarCatalogo')('STATUS', '')
      .find((i) => i.nome === 'Em andamento' && i.canalId === String(t.mesa.id));
    t.chamar('atualizarRegistro_')('CATALOGO', item.id, { ColunaDeCarimbo: 'Analista' });
    t.chamar('salvarItemDoCatalogo')(Object.assign({}, item,
      { tipo: 'STATUS', rotulo: 'Outro rótulo', colunaDeCarimbo: 'Analista' }));
    igual(t.chamar('listarCatalogo')('STATUS', '').find((i) => i.id === item.id).rotulo,
      'Outro rótulo', 'a regra nova só vale quando a coluna MUDA');
  });

  teste('a coluna que um item carimba não pode ser excluída calada', () => {
    const t = retComTentativas();
    t.carimbarEm('1ª tentativa de contato sem sucesso', 'Data do 1º contato');
    const canal = { id: t.ret.id };
    const quem = t.chamar('quemApontaParaAColuna_')(canal, 'Data do 1º contato');
    verdadeiro(quem.some((q) => q.indexOf('1ª tentativa de contato sem sucesso') >= 0),
      'o item da lista aparece entre quem aponta para a coluna');
  });

  teste('a tela troca a caixa de texto por um menu, para status e listas', () => {
    const tela = lerTela('Configuracoes.html');
    contem(tela, '<select id="cfg-coluna-de-carimbo">');
    contem(tela, "Servidor.chamar('opcoesDoCarimboDoItem', tipoDeListaEscolhido)");
    verdadeiro(tela.indexOf("campoDeTexto('coluna-de-carimbo'") < 0,
      'a caixa de texto livre saiu');
  });
}

module.exports = { rodarTestesDosCardsEDosCarimbos };
