/**
 * ============================================================================
 * PGO — testes-o-que-a-aba-erros-mostrou.js · os 40 segundos, pela medição (Etapa 76)
 * ============================================================================
 * O PO mandou a aba ERROS da operação, com o cronômetro da Etapa 71 ligado.
 * Em 99 chamadas lentas: nenhum segundo esperando a trava, uns 3,5 s lendo a
 * planilha e 7 s ou mais "no resto". O resto era `Utilities.formatDate` — uma
 * ida ao serviço do Google por linha, mais de 4 mil a cada abertura do
 * Trabalho. E a mesma aba trouxe um erro da tela Buscar Caso, 17 vezes.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar, secao, teste, igual, verdadeiro, contem } = require('./ferramentas');

const DA_RET = 'data de recepção do protocolo';
const ABERTURA = { tipo: 'intervalo', dias: 0, de: '', ate: '', mes: '' };
const tela = (nome) => fs.readFileSync(path.join(__dirname, '..', '..', 'Front-End', nome + '.html'), 'utf8');

function atras(dias, hora) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora === undefined ? 0 : hora, 0, 0, 0);
  return d;
}

/** Um sistema que conta as idas ao formatador do Google. */
function preparar() {
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  t.ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
  const utilitarios = t.ambiente.globais.Utilities;
  const original = utilitarios.formatDate;
  t.idas = 0;
  utilitarios.formatDate = function () { t.idas++; return original.apply(this, arguments); };
  t.googleDiria = (data, formato) => original.call(utilitarios, data, 'America/Sao_Paulo', formato);
  t.formatar = t.chamar('formatarData_');
  t.agora = 1000000;
  t.lentos = () => {
    t.chamar('descarregarAFilaDosErros_')(0);
    return t.chamar('lerRegistros_')('ERROS').filter((e) => e.Origem === 'lento');
  };
  return t;
}

function comTresMilCasos(t) {
  const status = ['Não trabalhado', 'Pendente', '1º contato realizado', 'Retido', 'Não retido'];
  t.chamar('inserirVariosRegistros_')('BASE_RET', Array.from({ length: 3000 }, (_, i) => ({
    [DA_RET]: atras(Math.floor((2999 - i) / 25)), analista: 'Ana Martins', 'nome do cliente': 'Cliente ' + i,
    status: status[i % 5], 'Data da primeira mudança de status': i % 3 ? atras(Math.floor((2999 - i) / 25), 9) : ''
  })));
}

function rodarTestesDoQueAAbaErrosMostrou() {
  console.log('\nEtapa 76: o que a aba ERROS mostrou');

  /* ----------------------------------------------------------------------- */
  secao('A data em texto, lembrada');

  teste('o texto é o mesmo que o Google devolveria, em todo formato que o sistema usa', () => {
    const t = preparar();
    const datas = [new Date(), atras(3, 14), new Date(2018, 10, 4, 0, 0, 0), new Date(2018, 1, 17, 23, 30, 0),
      new Date(2026, 0, 1, 0, 0, 0), new Date(2025, 11, 31, 23, 59, 0)];
    ['yyyy-MM-dd', 'dd/MM/yyyy', 'dd/MM/yyyy HH:mm', 'yyyy-MM-dd HH:mm', 'HH:mm', 'yyyyMMdd'].forEach((formato) => {
      datas.forEach((data) => {
        igual(t.formatar(data, formato), t.googleDiria(data, formato), formato);
        igual(t.formatar(data, formato), t.googleDiria(data, formato), formato + ', da memória');
      });
    });
  });

  teste('o mesmo instante e formato vai ao Google uma vez só', () => {
    const t = preparar();
    const data = atras(2, 10);
    t.idas = 0;
    for (let i = 0; i < 500; i++) t.formatar(new Date(data.getTime()), 'yyyy-MM-dd');
    igual(t.idas, 1);
    t.formatar(data, 'dd/MM/yyyy');
    igual(t.idas, 2, 'outro formato é outra resposta');
    t.formatar(new Date(data.getTime() + 60000), 'yyyy-MM-dd');
    igual(t.idas, 3, 'outro instante também');
  });

  teste('a memória tem teto: passou, recomeça — e continua respondendo certo', () => {
    const t = preparar();
    const teto = t.chamar('RECC_DATAS_LEMBRADAS_NO_MAXIMO');
    const base = atras(1, 8).getTime();
    for (let i = 0; i <= teto; i++) t.formatar(new Date(base + i * 1000), 'HH:mm');
    verdadeiro(t.chamar('RECC_QUANTAS_DATAS_FORMATADAS') <= teto, 'não cresce sem fim');
    igual(t.formatar(new Date(base), 'HH:mm'), t.googleDiria(new Date(base), 'HH:mm'));
  });

  teste('abrir o Trabalho com 3 mil casos: centenas de idas ao formatador, e não milhares', () => {
    const t = preparar();
    comTresMilCasos(t);
    t.chamar('RECC_DATAS_JA_FORMATADAS = {}');
    t.idas = 0;
    const resumo = t.chamar('resumoDoCanal')(t.ret.id, {}, ABERTURA, '', true);
    verdadeiro(resumo.totalNoPeriodo > 0, 'a tela veio com casos');
    verdadeiro(t.idas < 600, t.idas + ' idas (eram mais de 4 mil)');
  });

  teste('o período e os cartões não mudam com a memória ligada', () => {
    const t = preparar();
    comTresMilCasos(t);
    const comMemoria = t.chamar('resumoDoCanal')(t.ret.id, {}, ABERTURA, '', false);
    // A mesma chamada, com a memória esvaziada a cada data: como era antes.
    const formatar = t.contexto.formatarData_;
    t.contexto.formatarData_ = (data, formato) => t.googleDiria(data, formato);
    const semMemoria = t.chamar('resumoDoCanal')(t.ret.id, {}, ABERTURA, '', false);
    t.contexto.formatarData_ = formatar;
    igual(JSON.stringify(comMemoria.cartoes), JSON.stringify(semMemoria.cartoes));
    igual(comMemoria.totalNoPeriodo, semMemoria.totalNoPeriodo);
    igual(JSON.stringify(comMemoria.fila), JSON.stringify(semMemoria.fila));
  });

  teste('nenhuma chamada direta ao formatador sobrou no servidor', () => {
    const pasta = path.join(__dirname, '..', '..', 'Back-End');
    const diretas = [];
    fs.readdirSync(pasta).filter((nome) => nome.endsWith('.gs')).forEach((nome) => {
      fs.readFileSync(path.join(pasta, nome), 'utf8').split('\n').forEach((linha, i) => {
        if (/Utilities\.formatDate\(/.test(linha) && !/^\s*(\*|\/\/)/.test(linha)) diretas.push(nome + ':' + (i + 1));
      });
    });
    igual(diretas.length, 1, 'só a de dentro de formatarData_: ' + diretas.join(', '));
    contem(diretas[0], 'Entrada.gs');
  });

  /* ----------------------------------------------------------------------- */
  secao('O cronômetro diz mais');

  teste('formatar datas e procurar ganham nome na linha do cronômetro', () => {
    const t = preparar();
    t.contexto.agoraEmMs_ = () => t.agora;
    const original = t.ambiente.globais.Utilities.formatDate;
    t.ambiente.globais.Utilities.formatDate = function () { t.agora += 3000; return original.apply(this, arguments); };
    t.chamar('cronometrado_')('chamadaDeTeste', () => {
      t.chamar('formatarData_')(atras(7, 7), 'yyyy-MM-dd');
      t.chamar('formatarData_')(atras(8, 7), 'yyyy-MM-dd');
      t.chamar('procurandoNaPlanilha_')(() => { t.agora += 5000; }, []);
      t.agora += 1000;
    }, []);
    const lentos = t.lentos();
    igual(lentos.length, 1);
    contem(lentos[0].Mensagem, 'Levou 12 s no servidor: 0 s esperando a trava, 0 s lendo a planilha, '
      + '5 s procurando, 6 s formatando datas, 1 s no resto');
  });

  teste('as quatro procuras passam pelo cronômetro', () => {
    const servidor = ['Base', 'Casos', 'Indicadores'].map((nome) =>
      fs.readFileSync(path.join(__dirname, '..', '..', 'Back-End', nome + '.gs'), 'utf8')).join('\n');
    ['linhasDaBuscaRapida', 'linhasDoTermoNaPlanilha', 'procurarNoHistorico', 'procurarNoLegado'].forEach((nome) =>
      contem(servidor, 'return procurandoNaPlanilha_(' + nome + 'SemRelogio_, arguments);', nome));
  });

  teste('data formatada dentro de uma leitura conta na leitura, e não duas vezes', () => {
    const t = preparar();
    t.contexto.agoraEmMs_ = () => t.agora;
    const original = t.ambiente.globais.Utilities.formatDate;
    t.ambiente.globais.Utilities.formatDate = function () { t.agora += 9000; return original.apply(this, arguments); };
    t.chamar('cronometrado_')('chamadaDeTeste', () => {
      t.chamar('lendoAPlanilha_')(() => t.chamar('formatarData_')(atras(9, 6), 'yyyy-MM-dd'), []);
    }, []);
    contem(t.lentos()[0].Mensagem, '9 s lendo a planilha, 0 s procurando, 0 s formatando datas, 0 s no resto');
  });

  /* ----------------------------------------------------------------------- */
  secao('Os erros da tela que a aba trouxe');

  teste('Buscar Caso: procurar antes de as opções chegarem não quebra mais', () => {
    contem(tela('BuscarCaso'), 'incluirHistorico && !!(opcoes && opcoes.historico && opcoes.historico.ligado))');
  });

  teste('o aviso "ResizeObserver loop" do navegador não vai para a aba ERROS', () => {
    contem(tela('Aplicacao'), "if (/^ResizeObserver loop/.test(String(evento.message || ''))) return;");
  });
}

module.exports = { rodarTestesDoQueAAbaErrosMostrou };
