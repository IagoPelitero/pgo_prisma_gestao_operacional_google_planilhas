/**
 * ============================================================================
 * PGO — testes-sem-minha-performance.js · a Etapa 52
 * ============================================================================
 * Pedido do PO: "a aba Minha Performance não será mais necessária. Readeque o
 * sistema, iremos trabalhar somente com as demais". Código morto não dá erro —
 * fica, e alguém o chama achando que ainda vale. Por isso a suíte cobra a saída
 * peça por peça: a tela, o menu, a função do servidor, a permissão nos níveis,
 * a meta (a barra de progresso que só ela mostrava) e o código que só ela usava.
 *
 * Os dois últimos testes do arquivo não eram dela e ficam: o calendário que saiu
 * inteiro e "status final não trava o caso".
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem } = require('./ferramentas');

const lerFonte = (pasta, nome) => fs.readFileSync(
  path.join(__dirname, '..', '..', pasta, nome), 'utf8');
const servidor = () => ['Base.gs', 'Cadastros.gs', 'Casos.gs', 'Config.gs', 'Entrada.gs',
  'Indicadores.gs', 'Instalacao.gs'].map((nome) => lerFonte('Back-End', nome)).join('\n');

function umaInstalacao() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((m) => m.aba === 'BASE_RET');
  t.niveis = () => t.chamar('lerRegistros_')('CATALOGO').filter((i) => i.Tipo === 'NIVEL_ACESSO');
  t.telasDoNivel = (nome) => JSON.parse(t.niveis().find((i) => i.Nome === nome).Configuracao).telas;
  return t;
}

/** Uma planilha "de antes": os níveis ainda com a tela marcada. */
function umaPlanilhaDeAntes() {
  const t = umaInstalacao();
  t.niveis().forEach((nivel) => {
    const configuracao = JSON.parse(nivel.Configuracao);
    configuracao.telas.splice(2, 0, 'minhaPerformance');
    t.chamar('atualizarRegistro_')('CATALOGO', nivel.__id, { Configuracao: JSON.stringify(configuracao) });
  });
  t.chamar('esquecerEstruturaLida_()');
  return t;
}

function rodarTestesSemMinhaPerformance() {
  console.log('\nEtapa 52 — a Minha Performance saiu do sistema');

  // Os dois últimos testes do arquivo usam esta instalação.
  const { chamar, ret } = umaInstalacao();

  /* ----------------------------------------------------------------------- */
  secao('A tela, o menu e a rota');

  teste('o arquivo da tela saiu, e a página não o inclui', () => {
    verdadeiro(!fs.existsSync(path.join(__dirname, '..', '..', 'Front-End', 'MinhaPerformance.html')));
    verdadeiro(lerFonte('Front-End', 'Index.html').indexOf('MinhaPerformance') < 0);
  });

  teste('a rota e o ícone saíram da casca; o estilo dela também', () => {
    const casca = lerFonte('Front-End', 'Aplicacao.html');
    verdadeiro(casca.indexOf('minhaPerformance') < 0 && casca.indexOf('TelaMinhaPerformance') < 0);
    verdadeiro(lerFonte('Front-End', 'Comuns.html').indexOf('minhaPerformance') < 0, 'o ícone');
    verdadeiro(lerFonte('Front-End', 'Estilos.html').indexOf('.barra-da-meta') < 0, 'o estilo da meta');
    verdadeiro(lerFonte('Front-End', 'Estilos.html').indexOf('.ranking') < 0, 'o do ranking');
  });

  teste('o menu de quem administra tem as telas que ficaram (e o Início, da Etapa 67)', () => {
    const t = umaInstalacao();
    igual(t.chamar('pacoteDePartida()').menu.map((m) => m.tela).join(','),
      'inicio,trabalho,cadastrarCaso,buscarCaso,tabelaCorretoras,importacao,produtividade,configuracoes');
  });

  teste('a tela não está na lista de telas do sistema, nem entre os títulos editáveis', () => {
    const t = umaInstalacao();
    verdadeiro(!t.chamar('RECC_TELAS_DO_SISTEMA').some((um) => um.tela === 'minhaPerformance'));
    verdadeiro(!t.chamar('titulosDasTelas()').some((um) => um.tela === 'minhaPerformance'),
      'nem entre os títulos que Configurações deixa renomear');
  });

  /* ----------------------------------------------------------------------- */
  secao('O servidor: a função e o que só ela usava');

  teste('a função da tela e o que só ela usava saíram do servidor', () => {
    const fonte = servidor();
    ['function minhaPerformance', 'metaDaPessoa_', 'comoVaiAEquipe_', 'vizinhosNoRanking_',
      'oQueEuFiz_', 'equipeParaComparar_', 'nomeDoCanalDaPessoa_', 'contarConcluidos_',
      'statusFinaisDoCanal_', 'indicadoresDaPessoa_', 'casosDaPessoa_', 'serieDoPeriodo_',
      'diasDoMesDe_', 'RECC_VIZINHOS_NO_RANKING', 'metaMensalPorPessoa'].forEach((peca) => {
      verdadeiro(fonte.indexOf(peca) < 0, peca + ' ficou para trás');
    });
  });

  teste('o que a Produtividade RECC usa continua: valor por situação, equipe e período', () => {
    const t = umaInstalacao();
    ['valorPorSituacao_', 'situacoesDestacadas_', 'mediaMovel_', 'nomesDaMinhaEquipe_',
      'resolverPeriodo_', 'produtividadeDaEquipe'].forEach((nome) => {
      verdadeiro(servidor().indexOf('function ' + nome) >= 0, nome + ' foi embora junto');
    });
    const painel = t.chamar('produtividadeDaEquipe')(t.ret.id, {}, 30);
    verdadeiro(Array.isArray(painel.cartoes), 'a Produtividade segue abrindo');
  });

  teste('chamar a função antiga, direto, não existe mais', () => {
    const t = umaInstalacao();
    let achou = true;
    try { t.chamar('minhaPerformance'); } catch (erro) { achou = false; }
    verdadeiro(!achou, 'minhaPerformance ainda responde');
  });

  /* ----------------------------------------------------------------------- */
  secao('A meta, que só ela mostrava');

  teste('a coluna da meta saiu do contrato dos canais', () => {
    const t = umaInstalacao();
    const colunas = t.chamar('RECC_ESQUEMA').CANAIS.colunas.map((c) => c.cabecalho);
    verdadeiro(colunas.indexOf('MetaMensalPorPessoa') < 0);
  });

  teste('Configurações › Canais de trabalho não tem mais o campo da meta, e salvar o canal segue funcionando', () => {
    const t = umaInstalacao();
    const tela = lerFonte('Front-End', 'Configuracoes.html');
    verdadeiro(tela.indexOf('metaMensalPorPessoa') < 0 && tela.indexOf('Meta de casos por pessoa') < 0);
    const canal = t.chamar('listarCanaisConfiguraveis()').find((c) => c.aba === 'BASE_RET');
    verdadeiro(canal.metaMensalPorPessoa === undefined, 'a tela nem recebe a meta');
    t.chamar('salvarCanal')(Object.assign({}, canal, { descricao: 'Retenção — outra frase' }));
    igual(t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET').descricao, 'Retenção — outra frase');
  });

  /* ----------------------------------------------------------------------- */
  secao('Os níveis de acesso');

  teste('planilha nova: nenhum nível nasce com a tela', () => {
    const t = umaInstalacao();
    ['Administrador', 'Coordenação', 'Operação', 'Consulta'].forEach((nome) => {
      verdadeiro(t.telasDoNivel(nome).indexOf('minhaPerformance') < 0, nome);
    });
  });

  teste('planilha em uso: o atualizarPGO tira a marca de cada nível e diz qual era', () => {
    const t = umaPlanilhaDeAntes();
    ['Administrador', 'Coordenação', 'Operação', 'Consulta'].forEach((nome) => {
      verdadeiro(t.telasDoNivel(nome).indexOf('minhaPerformance') >= 0, nome + ' começa com a marca');
    });
    const laudo = t.chamar('atualizarPGO()');
    contem(laudo, 'Nível "Administrador": a Minha Performance saiu das telas');
    ['Administrador', 'Coordenação', 'Operação', 'Consulta'].forEach((nome) => {
      verdadeiro(t.telasDoNivel(nome).indexOf('minhaPerformance') < 0, nome + ' sem a marca');
    });
  });

  teste('as outras telas do nível ficam como estavam', () => {
    const t = umaPlanilhaDeAntes();
    const antes = t.telasDoNivel('Operação').filter((tela) => tela !== 'minhaPerformance');
    t.chamar('atualizarPGO()');
    igual(t.telasDoNivel('Operação').join(','), antes.join(','));
  });

  teste('roda uma vez só: quem marcar a tela de novo (à mão) não a vê tirada outra vez', () => {
    const t = umaPlanilhaDeAntes();
    t.chamar('atualizarPGO()');
    contem(t.chamar('atualizarPGO()'), 'já saiu dos níveis de acesso');
  });

  teste('a coluna da meta, numa planilha em uso, fica com o dado e o laudo avisa que sobrou', () => {
    const t = umaInstalacao();
    t.chamar('adicionarColuna_')('CANAIS', 'MetaMensalPorPessoa', 'numero');
    t.chamar('esquecerEstruturaLida_()');
    contem(t.chamar('atualizarPGO()'), 'CANAIS."MetaMensalPorPessoa" saiu do contrato e continua na planilha');
  });

  teste('o diagnóstico não reprova a planilha que ainda tem a coluna da meta', () => {
    const t = umaInstalacao();
    const falhasAntes = t.chamar('diagnosticoDoSistema')().resumo.falhas;
    t.chamar('adicionarColuna_')('CANAIS', 'MetaMensalPorPessoa', 'numero');
    t.chamar('esquecerEstruturaLida_()');
    const depois = t.chamar('diagnosticoDoSistema')();
    igual(depois.resumo.falhas, falhasAntes, 'a coluna que sobrou não vira FALHA');
  });

  secao('O calendário saiu, e não deixou peça solta')

  teste('o calendário saiu INTEIRO: motor, aba, conta e tela', () => {
    /*
     * Código morto não dá erro — fica. E depois alguém o chama achando que
     * ainda vale, porque ele está lá e parece pronto.
     *
     * Este calendário saiu em TRÊS pedidos do PO, em rodadas diferentes:
     * primeiro o motor de dia útil (fim de semana, feriados calculados da
     * Páscoa, a aba FERIADOS); depois ele voltou a meta para dia corrido; e
     * agora o calendário inteiro — "pelas regras de negócio ela não será mais
     * necessária". Em cada rodada sobra o risco de uma peça ficar para trás, e
     * é isso que este teste cobra: a função, a aba, a conta e a tela.
     */
    const servidor = ['Base.gs', 'Casos.gs', 'Config.gs', 'Entrada.gs',
      'Indicadores.gs', 'Instalacao.gs']
      .map((nome) => fs.readFileSync(
        path.join(__dirname, '..', '..', 'Back-End', nome), 'utf8')).join('\n');

    // O motor de dia útil, da primeira rodada.
    ['ehDiaUtil_', 'diasUteisEntre_', 'domingoDePascoa_',
      'feriadosNacionaisDoAno_', 'RECC_FERIADOS_MOVEIS',
      'esquecerOCalendario_'].forEach((peca) => {
      verdadeiro(servidor.indexOf(peca) < 0, peca + ' ficou para trás');
    });

    // E as ausências, desta.
    ['quemEstaAusenteHoje_', 'ausenciasPorNome_', 'ausenciasNoPeriodo_',
      'diasAusente_', 'diasTrabalhaveis_', 'listarAusencias',
      'salvarAusencia', 'excluirAusencia', 'AUSENCIA_MOTIVO'].forEach((peca) => {
      verdadeiro(servidor.indexOf(peca) < 0, peca + ' ficou para trás');
    });

    verdadeiro(!chamar('RECC_ESQUEMA').FERIADOS, 'a aba FERIADOS saiu do contrato');
    verdadeiro(!chamar('RECC_ESQUEMA').AUSENCIAS, 'a aba AUSENCIAS também');

    // E a tela: nem a seção no menu, nem o ícone que ela usava.
    const configuracoes = fs.readFileSync(path.join(__dirname, '..', '..',
      'Front-End', 'Configuracoes.html'), 'utf8');
    verdadeiro(configuracoes.indexOf('carregarCalendario') < 0,
      'a seção do calendário ficou na tela de Configurações');
    verdadeiro(!chamar('resumoDasConfiguracoes()').secoes
      .some((uma) => uma.chave === 'calendario'),
      'e o menu ainda oferece a seção');
  });



  teste('status final NÃO trava o caso: ele continua mudando de status', () => {
    const novo = chamar('cadastrarCaso')(ret.id, { nomedocliente: 'Caso que reabre' });
    chamar('alterarSituacaoDoCaso')(ret.id, novo.id, 'Retido', { valordopremioretido: '100,00' });
    chamar('alterarSituacaoDoCaso')(ret.id, novo.id, 'Pendente');
    igual(chamar('buscarRegistros_')('BASE_RET', 'Id', novo.id, 1)[0].status, 'Pendente');
  });

  teste('o Trabalho e a Produtividade RECC abrem sem a Minha Performance', () => {
    const t = umaInstalacao();
    verdadeiro(t.chamar('resumoDoCanal')(t.ret.id, {}, 30).cartoes !== undefined);
    verdadeiro(t.chamar('produtividadeDaEquipe')(t.ret.id, {}, 30).cartoes !== undefined);
  });
}

module.exports = { rodarTestesSemMinhaPerformance };
