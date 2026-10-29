/**
 * ============================================================================
 * PGO — testes-varredura.js · o que a varredura de outubro achou, consertado
 * ============================================================================
 * Pedido do PO: "procure bugs, textos que se repetem em vão, funções que não
 * usamos mais, algo que mencione legado diferente do atual, algo que possa
 * quebrar" — e depois, "faça as correções".
 *
 * Cada seção abaixo é um achado do diagnóstico (ver 04-bugs-capturados.md,
 * itens 73 a 83). O teste existe para o achado não voltar.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, comoUsuario,
  lerPeca, elementoFalso, pecaRodando } = require('./ferramentas');

const RAIZ = path.join(__dirname, '..', '..');
const ler = (relativo) => fs.readFileSync(path.join(RAIZ, relativo), 'utf8');
const doServidor = () => fs.readdirSync(path.join(RAIZ, 'Back-End'))
  .map((nome) => ler('Back-End/' + nome)).join('\n');
const dasTelas = () => fs.readdirSync(path.join(RAIZ, 'Front-End'))
  .map((nome) => ler('Front-End/' + nome)).join('\n');

function instalacaoNova() {
  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');
  const canais = chamar('canaisVisiveis_()');
  return {
    ambiente, chamar,
    ret: canais.find((c) => c.aba === 'BASE_RET'),
    mesa: canais.find((c) => c.aba === 'BASE_MESA')
  };
}

function nivel(chamar, nome) {
  return chamar('lerRegistros_("CATALOGO")')
    .find((i) => String(i.Tipo) === 'NIVEL_ACESSO' && i.Nome === nome).Id;
}

function rodarTestesDaVarredura() {
  console.log('\nA varredura: o que o diagnóstico achou, consertado');

  /* ----------------------------------------------------------------------- */
  secao('O login compara o e-mail inteiro (achado 73)');

  teste('e-mail parecido não entra como outra pessoa', () => {
    const { ambiente, chamar } = instalacaoNova();
    ['primeiroadm@exemplo.com', 'primeiro_adm@exemplo.com', 'primeiro-adm@exemplo.com',
      'primeiro.adm@exemplocom', 'primeiroadm@exemplo.co.m'].forEach((outro) => {
      comoUsuario(ambiente, outro, () => {
        igual(chamar('usuarioAtual_()').cadastrado, false, outro + ' não é o administrador');
      });
    });
  });

  teste('maiúscula e espaço nas pontas continuam sendo a mesma pessoa', () => {
    const { ambiente, chamar } = instalacaoNova();
    comoUsuario(ambiente, ' Primeiro.Adm@Exemplo.com ', () => {
      igual(chamar('usuarioAtual_()').cadastrado, true);
    });
  });

  teste('joao.silva e joaosilva são duas pessoas, e as duas se cadastram', () => {
    const { chamar } = instalacaoNova();
    const operacao = nivel(chamar, 'Operação');
    chamar('salvarUsuario')({ nome: 'João Silva', email: 'joao.silva@exemplo.com',
      nivelAcessoId: operacao, ativo: true });
    chamar('salvarUsuario')({ nome: 'João Outro', email: 'joaosilva@exemplo.com',
      nivelAcessoId: operacao, ativo: true });
    const erro = lanca(() => chamar('salvarUsuario')({ nome: 'Repetido',
      email: 'JOAO.SILVA@exemplo.com', nivelAcessoId: operacao, ativo: true }));
    contem(erro.message, 'já está cadastrado', 'o mesmo e-mail em maiúsculas é repetido');
  });

  /* ----------------------------------------------------------------------- */
  secao('O formulário apaga o que a pessoa apagou (achado 74)');

  const formularioDaMesa = (extra) => Object.assign({
    status: 'Em andamento', nomedosegurado: 'Segurado de teste' }, extra || {});

  teste('esvaziar Área, SUSEP e Título apaga na planilha — e o carimbo do encaminhamento', () => {
    const { chamar, mesa } = instalacaoNova();
    const caso = chamar('cadastrarCaso')(mesa.id, formularioDaMesa({
      arearesponsavel: 'Sinistro', susep: 'RET00J', titulodoemail: 'Título errado' }));
    chamar('editarCaso')(mesa.id, caso.id, formularioDaMesa({
      arearesponsavel: '', susep: '', titulodoemail: '' }));
    const linha = chamar('lerRegistros_')('BASE_MESA').find((l) => l.__id === caso.id);
    igual(linha['Área responsável'], '');
    igual(linha.SUSEP, '');
    igual(linha['Título do e-mail'], '');
    igual(linha['Data do encaminhamento'], '', 'voltou para a mesa: sem prazo da área');
  });

  teste('campo que NÃO veio no formulário fica como estava', () => {
    const { chamar, mesa } = instalacaoNova();
    const caso = chamar('cadastrarCaso')(mesa.id, formularioDaMesa({ titulodoemail: 'Fica' }));
    chamar('editarCaso')(mesa.id, caso.id, formularioDaMesa());
    igual(chamar('lerRegistros_')('BASE_MESA').find((l) => l.__id === caso.id)['Título do e-mail'],
      'Fica', 'quem não manda a chave não pediu para apagar');
  });

  teste('o campo partido em colunas é apagado por inteiro', () => {
    const { chamar, ret } = instalacaoNova();
    const base = { status: 'Não trabalhado', nomedocliente: 'Cliente de teste' };
    const caso = chamar('cadastrarCaso')(ret.id, Object.assign({}, base,
      { numerodaproposta: '7-0004406' }));
    const antes = chamar('lerRegistros_')('BASE_RET').find((l) => l.__id === caso.id);
    verdadeiro(String(antes['número da proposta']) !== '', 'a proposta foi gravada em pedaços');
    chamar('editarCaso')(ret.id, caso.id, Object.assign({}, base, { numerodaproposta: '' }));
    const depois = chamar('lerRegistros_')('BASE_RET').find((l) => l.__id === caso.id);
    igual(depois['Código origem da proposta'], '');
    igual(depois['número da proposta'], '');
  });

  teste('no cadastro, vazio continua sendo só vazio', () => {
    const { chamar, mesa } = instalacaoNova();
    const caso = chamar('cadastrarCaso')(mesa.id, formularioDaMesa({ titulodoemail: '' }));
    verdadeiro(!!caso.id);
  });

  teste('a tela não manda vazio o valor que o controle não conseguiu mostrar', () => {
    const form = pecaRodando('Formulario').Formulario;
    const data = elementoFalso('input', { 'data-chave': 'datadeentrada' });
    data.type = 'date';
    let guardado = '';
    Object.defineProperty(data, 'value', {
      get: () => guardado,
      set: (valor) => { guardado = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : ''; }
    });
    const texto = elementoFalso('input', { 'data-chave': 'titulodoemail' });
    const raiz = elementoFalso('form').por(data, texto);

    form.preencher(raiz, { datadeentrada: '2026/10/05', titulodoemail: 'Algum' });
    igual(data.value, '', 'o calendário recusou o formato');
    texto.value = '';
    const lidos = form.valores(raiz);
    verdadeiro(!Object.prototype.hasOwnProperty.call(lidos, 'datadeentrada'),
      'a data que a pessoa nem viu não vai como vazio');
    igual(lidos.titulodoemail, '', 'o campo que a pessoa apagou vai vazio');

    data.value = '2026-10-06';
    igual(form.valores(raiz).datadeentrada, '2026-10-06', 'data escolhida de novo vai');
  });

  /* ----------------------------------------------------------------------- */
  secao('Duas pessoas no mesmo caso (achado 79)');

  teste('quem salva depois de outra pessoa é recusado, e nada se perde', () => {
    const { chamar, mesa } = instalacaoNova();
    const caso = chamar('cadastrarCaso')(mesa.id, formularioDaMesa());
    const daAna = chamar('casoParaEditar')(mesa.id, caso.id);
    const doDiego = chamar('casoParaEditar')(mesa.id, caso.id);
    igual(daAna.versao, doDiego.versao, 'a mesma linha tem a mesma versão');

    chamar('editarCaso')(mesa.id, caso.id, formularioDaMesa({ titulodoemail: 'Da Ana' }),
      daAna.versao);
    const erro = lanca(() => chamar('editarCaso')(mesa.id, caso.id,
      formularioDaMesa({ titulodoemail: 'Do Diego' }), doDiego.versao));
    contem(erro.message, 'alterado por outra pessoa');
    igual(chamar('lerRegistros_')('BASE_MESA').find((l) => l.__id === caso.id)['Título do e-mail'],
      'Da Ana', 'a mudança da Ana ficou');
  });

  teste('abrir de novo traz a versão nova, e aí grava', () => {
    const { chamar, mesa } = instalacaoNova();
    const caso = chamar('cadastrarCaso')(mesa.id, formularioDaMesa());
    const velho = chamar('casoParaEditar')(mesa.id, caso.id).versao;
    chamar('alterarSituacaoDoCaso')(mesa.id, caso.id, 'Concluído');
    const novo = chamar('casoParaEditar')(mesa.id, caso.id).versao;
    verdadeiro(novo !== velho, 'trocar a situação muda a versão');
    chamar('editarCaso')(mesa.id, caso.id, formularioDaMesa({ status: 'Concluído' }), novo);
  });

  teste('a tela guarda a versão ao abrir e devolve ao salvar', () => {
    const peca = lerPeca('CasoEmModal');
    contem(peca, "versaoAoAbrir = caso.versao || '';");
    contem(peca, "Servidor.chamar('editarCaso', canalAtual, idAtual, Formulario.valores(corpo),\n"
      + '      versaoAoAbrir, colunasSuasNaTela(), envio)', 'a versão vai junto (e, depois dela, as colunas suas e o envio)');
  });

  /* ----------------------------------------------------------------------- */
  secao('A busca respeita o alcance antes de cortar (achado 75)');

  function comCasosDeDuasPessoas() {
    const tudo = instalacaoNova();
    const { chamar } = tudo;
    chamar('salvarUsuario')({ nome: 'Ana Martins', email: 'ana@exemplo.com',
      nivelAcessoId: nivel(chamar, 'Operação'), ativo: true });
    const linhas = [];
    for (let i = 0; i < 3; i++) {
      linhas.push({ Analista: 'Ana Martins', Status: 'Pendente',
        'Nome do segurado': 'Maria Silva ' + i, 'Data de entrada': new Date(2026, 9, 1) });
    }
    for (let i = 0; i < 120; i++) {
      linhas.push({ Analista: 'Diego Castilho', Status: 'Pendente',
        'Nome do segurado': 'João Silva ' + i, 'Data de entrada': new Date(2026, 9, 5) });
    }
    chamar('inserirVariosRegistros_')('BASE_MESA', linhas);
    return tudo;
  }

  teste('quem vê só os próprios casos acha os seus, mesmo com 120 de outra pessoa', () => {
    const { ambiente, chamar, mesa } = comCasosDeDuasPessoas();
    comoUsuario(ambiente, 'ana@exemplo.com', () => {
      const achado = chamar('buscarCasos')('Silva', [mesa.id], false);
      igual(achado.total, 3);
      igual(achado.origens[0].aviso, '', 'o aviso não conta casos que ela não pode ver');
    });
  });

  teste('quem vê o canal inteiro continua com o corte nos 100 e o aviso', () => {
    const { chamar, mesa } = comCasosDeDuasPessoas();
    const achado = chamar('buscarCasos')('Silva', [mesa.id], false);
    igual(achado.total, 100);
    contem(achado.origens[0].aviso, 'achou 123 casos');
  });

  teste('a auditoria guarda quantos achou, e não o que foi digitado (achado 76)', () => {
    const { chamar, mesa } = comCasosDeDuasPessoas();
    chamar('buscarCasos')('Maria Silva', [mesa.id], false);
    const ultima = chamar('lerRegistros_("AUDITORIA")').filter((l) => l.Acao === 'busca').pop();
    igual(String(ultima.Detalhe), '3 resultado(s)');
    verdadeiro(String(ultima.Detalhe).indexOf('Maria') < 0, 'nenhum nome de segurado');
  });

  /* ----------------------------------------------------------------------- */
  secao('normalizarBase: a ferramenta que as mensagens prometiam (achado 78)');

  teste('dá Id a quem está sem, em bloco, acima do maior', () => {
    const { chamar } = instalacaoNova();
    chamar('inserirVariosRegistros_')('BASE_MESA', [
      { Analista: 'A', Status: 'Pendente', 'Nome do segurado': 'X' },
      { Analista: 'B', Status: 'Pendente', 'Nome do segurado': 'Y' },
      { Analista: 'C', Status: 'Pendente', 'Nome do segurado': 'Z' }]);
    const estrutura = chamar('estruturaDaAba_')('BASE_MESA');
    const coluna = estrutura.cabecalhos.findIndex((c) => c.toLowerCase() === 'id') + 1;
    estrutura.aba.getRange(3, coluna).setValue('');
    estrutura.aba.getRange(4, coluna).setValue('');
    chamar('esquecerEstruturaLida_()');

    const laudo = chamar('normalizarBase()');
    contem(laudo, 'BASE_MESA: 2 Id(s) novo(s)');
    const ids = chamar('lerRegistros_')('BASE_MESA').map((l) => String(l.ID)).sort();
    igual(ids.join(','), '0000000000,0000000003,0000000004',
      'os novos vêm depois do maior já emitido, sem repetir');
  });

  teste('Id repetido é apontado, e a mensagem diz como resolver', () => {
    const { chamar, mesa } = instalacaoNova();
    const um = chamar('cadastrarCaso')(mesa.id, formularioDaMesa());
    chamar('cadastrarCaso')(mesa.id, formularioDaMesa());
    const estrutura = chamar('estruturaDaAba_')('BASE_MESA');
    const coluna = estrutura.cabecalhos.findIndex((c) => c.toLowerCase() === 'id') + 1;
    estrutura.aba.getRange(3, coluna).setValue(um.id);
    chamar('esquecerEstruturaLida_()');

    contem(chamar('normalizarBase()'), '1 repetido(s)');
    const erro = lanca(() => chamar('editarCaso')(mesa.id, um.id, formularioDaMesa()));
    contem(erro.message, 'apague o Id da linha que é a cópia e rode normalizarBase()');
  });

  teste('nenhuma mensagem fala mais em "Normalizar base", que nunca existiu', () => {
    verdadeiro(doServidor().indexOf('"Normalizar base"') < 0);
    verdadeiro(ler('Evolucao/03-manutencao.md').indexOf('normalizarIdentificadoresDaAba_(') < 0,
      'o manual manda rodar normalizarBase, que aparece na lista do editor');
  });

  /* ----------------------------------------------------------------------- */
  secao('Contar onde um item de lista está gravado, sem ler a base inteira (achado 81)');

  teste('a conta é a mesma, lendo só as colunas dos campos daquela lista', () => {
    const { chamar } = instalacaoNova();
    const linhas = [];
    for (let i = 0; i < 30; i++) {
      linhas.push({ analista: 'Ana', 'nome do cliente': 'Cliente ' + i,
        status: i % 3 === 0 ? 'Pendente' : 'Retido',
        // "Pendente" escrito numa coluna que NÃO é de status: não é o item.
        'descrição': 'Pendente',
        'data de recepção do protocolo': new Date(2026, 9, 1) });
    }
    chamar('inserirVariosRegistros_')('BASE_RET', linhas);
    const pendente = chamar('lerRegistros_("CATALOGO")').find((i) =>
      String(i.Tipo) === 'STATUS' && i.Nome === 'Pendente');
    igual(chamar('quantosCasosUsam_')(pendente), 10,
      'só a coluna de status conta — a descrição com "Pendente" não');
  });

  teste('lista que nenhum campo usa continua procurada na linha inteira', () => {
    const { chamar } = instalacaoNova();
    chamar('inserirVariosRegistros_')('BASE_RET', [{ analista: 'Ana', status: 'Pendente',
      'nome do cliente': 'X', 'Origem da importação': 'Planilha antiga' }]);
    const origem = { Nome: 'Planilha antiga', Tipo: 'ORIGEM', CanalId: '' };
    igual(chamar('quantosCasosUsam_')(origem), 1);
  });

  /* ----------------------------------------------------------------------- */
  secao('A tela espera mais pelo que trabalha de verdade (achado 82)');

  teste('importar, arquivar, gerar análise e diagnosticar usam a espera longa', () => {
    const ponte = ler('Front-End/Aplicacao.html');
    contem(ponte, 'var SEGUNDOS_DAS_CHAMADAS_LONGAS = 380;');
    contem(ponte, 'chamarSemPressa: chamarSemPressa');
    const telas = dasTelas();
    ['importarCasos', 'conferirImportacaoDeCasos', 'conferirImportacao', 'aplicarImportacao',
      'arquivarAuditoriaAgora', 'gerarAnalise', 'diagnosticoDoSistema'].forEach((nome) => {
      contem(telas, "Servidor.chamarSemPressa('" + nome + "'", nome);
      verdadeiro(telas.indexOf("Servidor.chamar('" + nome + "'") < 0, nome + ' sem a espera curta');
    });
  });

  teste('desistir de esperar avisa que a ação pode ter sido feita', () => {
    // Etapa 59: e que repetir não duplica — o envio único reconhece o mesmo código.
    contem(ler('Front-End/Aplicacao.html'), 'o PGO reconhece o mesmo');
  });

  /* ----------------------------------------------------------------------- */
  secao('O laudo do atualizarPGO, sem texto repetido (achado 83)');

  teste('um laudo só, com a frase final uma vez e o que importa primeiro', () => {
    const { chamar } = instalacaoNova();
    const laudo = chamar('atualizarPGO()');
    igual(laudo.split('rode diagnosticoRECC()').length - 1, 1, 'a frase final aparece uma vez');
    verdadeiro(laudo.indexOf('MIGRAÇÃO PARA CANAIS') < 0, 'a migração entra no mesmo laudo');
    verdadeiro(laudo.indexOf('DECISÃO SUA') < laudo.indexOf('JÁ ESTAVA EM DIA'),
      'o que pede ação vem antes do que só foi conferido');
    contem(laudo, 'CATALOGO já tinha: ');
    verdadeiro(laudo.indexOf('CATALOGO.Id já existe') < 0, 'agrupado, e não linha a linha');
    contem(laudo, 'RET já tinha os status: ');
  });

  teste('migrarParaCanais sozinha continua com o laudo dela', () => {
    const { chamar } = instalacaoNova();
    contem(chamar('migrarParaCanais()'), 'MIGRAÇÃO PARA CANAIS');
  });

  teste('a instalação aponta a seção que existe', () => {
    const { chamar } = carregar('primeiro.adm@exemplo.com');
    contem(chamar('instalarRECC()'), 'Configurações › Identidade');
  });

  /* ----------------------------------------------------------------------- */
  secao('Textos que apontavam para o que não existe mais (achado 80)');

  teste('nenhuma mensagem aponta para seção que não existe', () => {
    const tudo = doServidor() + dasTelas();
    ['Configurações › Segurança', 'Configurações › Campos', "Configurações › Canais.'",
      'Configurações › Canais,', 'Configurações › Listas', 'Configurações › Calendário',
      'Configurações →', 'Cadastrar Caso › Listas'].forEach((velho) => {
      verdadeiro(tudo.indexOf(velho) < 0, 'ainda aparece: ' + velho);
    });
  });

  teste('o código não carrega mais o histórico de onde cada trecho morava', () => {
    const tudo = doServidor() + dasTelas();
    verdadeiro(tudo.indexOf('Era o arquivo') < 0, 'o bloco repetido em 24 lugares saiu');
    verdadeiro(!/\(era \w+\.gs\)/.test(tudo), 'os índices sem "(era X.gs)"');
    verdadeiro(tudo.indexOf('canal cadastrada') < 0 && tudo.indexOf('canal ligada') < 0,
      'concordância da troca de mesa por canal');
  });

  teste('o README instala do jeito que o sistema carrega', () => {
    const leia = ler('README.md');
    verdadeiro(leia.indexOf('se chama `Formulario`') < 0,
      'o arquivo das peças se chama Comuns, e é assim que o Index o inclui');
    // O número sai do contrato: uma aba nova (a ATENDIMENTOS_CHAT, na Etapa 39)
    // não deixa o README mentindo em silêncio.
    const instalado = carregar('primeiro.adm@exemplo.com');
    instalado.chamar('instalarRECC()');
    contem(leia, 'Ela cria as ' + instalado.ambiente.planilha.getSheets().length + ' abas');
    contem(leia, 'mesma organização do Google Workspace',
      'a regra do Google que decide quem é reconhecido');
    contem(ler('Front-End/Index.html'), "incluir('Comuns')");
  });
}

module.exports = { rodarTestesDaVarredura };
