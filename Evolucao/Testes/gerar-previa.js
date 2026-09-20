/**
 * ============================================================================
 * RECC — gerar-previa.js · o sistema rodando fora do Apps Script
 * ============================================================================
 *   node RECC/Testes/gerar-previa.js [pasta-de-saida]
 *
 * Monta as telas com o MESMO código do servidor e escreve arquivos .html que
 * abrem em qualquer navegador. Serve para ver e clicar sem precisar publicar
 * no Apps Script a cada mudança.
 *
 * A única coisa trocada é a ponte: no lugar do google.script.run, entra um
 * substituto que responde com o pacote de partida de verdade — o mesmo que a
 * função pacoteDePartida devolveria. Assim a prévia mostra o menu já filtrado
 * pelo nível de acesso, e não uma maquete desenhada à mão.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { carregar } = require('./ferramentas');

const PASTA_PADRAO = path.join(__dirname, '..', 'previa');

/**
 * Substitui o google.script.run por respostas vindas do servidor de verdade.
 *
 * As respostas NÃO são inventadas: cada uma é o que a função do servidor
 * devolveu durante a geração. É por isso que a prévia mostra o formulário
 * real, com os campos, as seções e as listas que o administrador veria.
 *
 * CADA CHAMADA GANHA O SEU PRÓPRIO PAR DE RETORNOS, como no Apps Script de
 * verdade — `withSuccessHandler` devolve um objeto novo, não o mesmo. A
 * primeira versão guardava um par só, e duas chamadas ao mesmo tempo se
 * atropelavam: a resposta da consulta de SUSEP chegava na mão de quem tinha
 * pedido o formulário. O produto estava certo; o substituto é que mentia.
 */
/**
 * As funções que GRAVAM, todas recusando com a mesma frase.
 *
 * Uma prévia que fingisse ter salvo seria pior do que uma que não salva:
 * a pessoa fecharia a aba achando que mudou a configuração da operação.
 */
function gravacoesRecusadas(nomes) {
  return nomes.map(function (nome) {
    return "      " + nome + ": function () {\n"
      + "        setTimeout(function () {\n"
      + "          if (aoDarErrado) {\n"
      + "            aoDarErrado(new Error(\"Esta é uma prévia: ela lê o "
      + "servidor de verdade, mas não grava. No sistema publicado esta ação "
      + "seria gravada na planilha e registrada na auditoria.\"));\n"
      + "          }\n"
      + "        }, 160);\n"
      + "      },\n";
  }).join('');
}

/**
 * As conferências de importação que a prévia sabe responder.
 *
 * Cada uma é chamada no servidor de verdade, com o mesmo texto que a tela vai
 * mandar — a prévia guarda a RESPOSTA, não uma imitação dela. É a mesma ideia
 * do resto do arquivo: o que aparece na prévia saiu do sistema, e não de um
 * JSON escrito à mão que envelhece sozinho.
 */
function conferenciasDeExemplo(chamar) {
  const exemplos = {
    corretoras: [
      'SUSEP\tCorretora\tCanal\tSegmento',
      '9012345\tCorretora Aurora\tCorretora\tDiamante',
      '9012346\tSouza & Filhos Seguros\tCorretora\tDiamante',
      '9012347\tAgência Litoral\tAgente\tDemais corretoras',
      '\tSem SUSEP nenhuma\tCorretora\tDiamante'
    ].join('\n'),
    susepsBloqueadas: [
      'SUSEP;Motivo;Corretora',
      '9012348;Fraude comprovada em 3 propostas;Corretora Meridiano',
      '9012349;Documentação reincidente;Corretora Sul',
      '9012350;;Sem motivo declarado'
    ].join('\n')
  };

  const conferidos = {};
  Object.keys(exemplos).forEach((tipo) => {
    conferidos[tipo + '|' + exemplos[tipo]] =
      chamar('conferirImportacao')(tipo, exemplos[tipo]);
  });
  return conferidos;
}

function pontePreparada(respostas) {
  return '<script>\n'
    + '/* Substituto do google.script.run, só para a prévia. No Apps Script\n'
    + '   de verdade este trecho não existe. */\n'
    + 'var google = { script: { run: (function () {\n'
    + '  var respostas = ' + JSON.stringify(respostas, null, 2) + ';\n'
    + '\n'
    + '  function novaChamada(aoDarCerto, aoDarErrado) {\n'
    + '    function responder(valor) {\n'
    + '      setTimeout(function () { if (aoDarCerto) aoDarCerto(valor); }, 90);\n'
    + '    }\n'
    + '    function recusar(mensagem) {\n'
    + '      setTimeout(function () {\n'
    + '        if (aoDarErrado) aoDarErrado(new Error(mensagem));\n'
    + '      }, 90);\n'
    + '    }\n'
    + '    return {\n'
    + '      withSuccessHandler: function (f) { return novaChamada(f, aoDarErrado); },\n'
    + '      withFailureHandler: function (f) { return novaChamada(aoDarCerto, f); },\n'
    + '      pacoteDePartida: function () { responder(respostas.pacoteDePartida); },\n'
    + '      salvarTemaDoUsuario: function (tema) { responder(tema); },\n'
    + '      formularioDoCanal: function (idDoCanal) {\n'
    + '        responder(respostas.formularios[idDoCanal]);\n'
    + '      },\n'
    + '      consultarSusep: function (susep) {\n'
    + '        var digitos = String(susep || "").replace(/\\D/g, "");\n'
    + '        responder(respostas.suseps[digitos] || {\n'
    + '          situacao: "NAO_ENCONTRADA", segmento: "Não encontrado",\n'
    + '          mensagem: "SUSEP não encontrada no cadastro de canais"\n'
    + '        });\n'
    + '      },\n'
    + '      resumoDoCanal: function (idDoCanal, filtros) {\n'
    + '        var painel = respostas.paineis[idDoCanal];\n'
    + '        var chave = "";\n'
    + '        Object.keys(filtros || {}).forEach(function (campo) {\n'
    + '          if (filtros[campo]) chave = campo + "=" + filtros[campo];\n'
    + '        });\n'
    + '        var variante = painel.variantes[chave];\n'
    + '        var resumo = {};\n'
    + '        Object.keys(painel.base).forEach(function (k) { resumo[k] = painel.base[k]; });\n'
    + '        if (variante) {\n'
    + '          resumo.cartoes = variante.cartoes;\n'
    + '          resumo.fila = variante.fila;\n'
    + '          resumo.total = variante.total;\n'
    + '        }\n'
    + '        responder(resumo);\n'
    + '      },\n'
    + '      detalhesDoCaso: function (idDoCanal, idDoCaso) {\n'
    + '        responder(respostas.paineis[idDoCanal].detalhes[idDoCaso]);\n'
    + '      },\n'
    + '      casoParaEditar: function (idDoCanal, idDoCaso) {\n'
    + '        responder(respostas.paineis[idDoCanal].paraEditar[idDoCaso]);\n'
    + '      },\n'
    + '      situacoesParaTrocar: function (idDoCanal, idDoCaso) {\n'
    + '        responder(respostas.paineis[idDoCanal].situacoes[idDoCaso]);\n'
    + '      },\n'
    + '      listarCardsDoPainel: function (tela, idDoCanal) {\n'
    + '        responder(respostas.configuracoes.cards[idDoCanal]);\n'
    + '      },\n'
    + '      opcoesDaImportacaoDeCasos: function (idDoCanal) {\n'
    + '        responder(respostas.importacao[idDoCanal]);\n'
    + '      },\n'
    // Conferir e importar dependem do que a pessoa COLA na hora, e a prévia não
    // tem servidor para ler aquilo. Recusam com o motivo, em vez de devolver
    // um laudo inventado: um laudo falso na prévia ensinaria a confiar nele.
    + '      conferirImportacaoDeCasos: function () {\n'
    + '        recusar("Na prévia não dá para conferir uma importação: o laudo '
    + 'sai de ler o que você colou, e aqui não há servidor para ler.");\n'
    + '      },\n'
    + '      configuracaoDosCadastros: function () {\n'
    + '        responder(respostas.configuracoes.cadastros);\n'
    + '      },\n'
    // Conferir abre uma planilha DE VERDADE, e a prévia não tem servidor para
    // isso. Recusa com o motivo, em vez de inventar um laudo — laudo falso
    // numa prévia ensinaria a confiar nele.
    + '      conferirPlanilhaDeCadastros: function () {\n'
    + '        recusar("Na prévia não dá para conferir a planilha de '
    + 'cadastros: isso abre outra planilha de verdade, e aqui não há '
    + 'servidor para abrir.");\n'
    + '      },\n'
    + '      configuracaoDoLegado: function () {\n'
    + '        responder(respostas.busca.legado);\n'
    + '      },\n'
    + '      opcoesDaBusca: function () {\n'
    + '        responder(respostas.busca.opcoes);\n'
    + '      },\n'
    + '      tabelaDeCorretoras: function (procurar, segmento) {\n'
    + '        var chave = String(procurar || "") + "|" + String(segmento || "");\n'
    + '        responder(respostas.corretoras.tabelas[chave]\n'
    + '          || respostas.corretoras.tabelas["|"]);\n'
    + '      },\n'
    + '      origemDosCadastros: function () {\n'
    + '        responder(respostas.corretoras.origem);\n'
    + '      },\n'
    + '      listarProdutos: function () {\n'
    + '        responder(respostas.corretoras.produtos);\n'
    + '      },\n'
    + '      listarSusepsBloqueadas: function () {\n'
    + '        responder(respostas.corretoras.bloqueadas);\n'
    + '      },\n'
    + '      exportarCorretoras: function () {\n'
    + '        responder(respostas.corretoras.exportado);\n'
    + '      },\n'
    + '      opcoesDaImportacao: function () {\n'
    + '        responder(respostas.corretoras.importacoes);\n'
    + '      },\n'
    // A prévia confere de verdade: o texto colado vai para a MESMA função do
    // servidor que confere na produção, gravada aqui com as respostas de
    // alguns textos de exemplo. Colar outra coisa responde honestamente que a
    // prévia não tem essa resposta, em vez de inventar uma.
    + '      conferirImportacao: function (tipo, texto) {\n'
    + '        var chave = tipo + "|" + String(texto || "").trim();\n'
    + '        var achado = respostas.corretoras.conferidos[chave];\n'
    + '        if (achado) return responder(achado);\n'
    + '        return recusar("Esta é uma prévia: ela responde pelos exemplos "\n'
    + '          + "gravados. No sistema de verdade, qualquer texto colado é "\n'
    + '          + "conferido na hora.");\n'
    + '      },\n'
    + '      aplicarImportacao: function () {\n'
    + '        return recusar("A prévia não grava — ela é uma cópia estática "\n'
    + '          + "do sistema, sem planilha por trás.");\n'
    + '      },\n'
    + '      minhaPerformance: function (idDoCanal) {\n'
    + '        responder(respostas.performance[idDoCanal]);\n'
    + '      },\n'
    + '      produtividadeDaEquipe: function (idDoCanal) {\n'
    + '        responder(respostas.analitico.paineis[idDoCanal]);\n'
    + '      },\n'
    + '      detalharComponente: function (idDoCanal, idDoComponente, ponto) {\n'
    + '        var chave = idDoCanal + "|" + idDoComponente + "|" + ponto;\n'
    + '        responder(respostas.analitico.detalhes[chave]\n'
    + '          || { titulo: "", ponto: ponto, colunas: [], casos: [], total: 0 });\n'
    + '      },\n'
    + '      exportarComponente: function (idDoCanal, idDoComponente) {\n'
    + '        responder(respostas.analitico.exportados[idDoComponente]);\n'
    + '      },\n'
    // A busca da prévia procura nos resultados que o servidor de verdade
    // devolveu para alguns termos. Termo que não foi gravado responde vazio,
    // e a tela diz honestamente que não achou — em vez de fingir.
    + '      buscarCasos: function (termo) {\n'
    + '        var chave = String(termo || "").toLowerCase().trim();\n'
    + '        responder(respostas.busca.resultados[chave]\n'
    + '          || { termo: termo, total: 0,\n'
    + '               origens: respostas.busca.origensVazias });\n'
    + '      },\n'
    + '      excluirCaso: function () {\n'
    + '        setTimeout(function () {\n'
    + '          if (aoDarErrado) {\n'
    + '            aoDarErrado(new Error("Esta é uma prévia: nada é alterado."));\n'
    + '          }\n'
    + '        }, 150);\n'
    + '      },\n'
    + '      cadastrarCaso: function () {\n'
    + '        setTimeout(function () {\n'
    + '          if (aoDarErrado) {\n'
    + '            aoDarErrado(new Error("Esta é uma prévia: nada é gravado. '
    + 'No sistema publicado, o caso seria registrado na planilha."));\n'
    + '          }\n'
    + '        }, 200);\n'
    + '      },\n'
    // A tela de Configurações: tudo o que ela LÊ vem do servidor de verdade,
    // e tudo o que ela GRAVA é recusado com uma frase só. Assim dá para
    // navegar as sete seções e ver as propriedades de cada item sem que a
    // prévia finja ter gravado algo que não gravou.
    + '      resumoDasConfiguracoes: function () {\n'
    + '        responder(respostas.configuracoes.resumo);\n'
    + '      },\n'
    + '      opcoesDeConfiguracaoDeCampo: function () {\n'
    + '        responder(respostas.configuracoes.opcoesDeCampo);\n'
    + '      },\n'
    + '      opcoesDeNivelDeAcesso: function () {\n'
    + '        responder(respostas.configuracoes.opcoesDeNivel);\n'
    + '      },\n'
    + '      listarCamposDoCanal: function (idDoCanal) {\n'
    + '        responder(respostas.configuracoes.campos[idDoCanal]);\n'
    + '      },\n'
    + '      listarUsuarios: function () {\n'
    + '        responder(respostas.configuracoes.usuarios);\n'
    + '      },\n'
    + '      listarNiveisDeAcesso: function () {\n'
    + '        responder(respostas.configuracoes.niveis);\n'
    + '      },\n'
    + '      listarCatalogo: function (tipo) {\n'
    + '        responder(respostas.configuracoes.listas[tipo] || []);\n'
    + '      },\n'
    + '      listarCanaisConfiguraveis: function () {\n'
    + '        responder(respostas.configuracoes.canais);\n'
    + '      },\n'
    + '      opcoesDosGraficos: function (idDoCanal) {\n'
    + '        responder(respostas.configuracoes.opcoesDoGrafico[idDoCanal]);\n'
    + '      },\n'
    + '      listarComponentesDoPainel: function (idDoCanal) {\n'
    + '        responder(respostas.configuracoes.componentes[idDoCanal]);\n'
    + '      },\n'
    + '      opcoesDeAnalise: function () {\n'
    + '        responder(respostas.configuracoes.opcoesDeAnalise);\n'
    + '      },\n'
    + '      listarAnalises: function () {\n'
    + '        responder(respostas.configuracoes.analises);\n'
    + '      },\n'
    + '      listarAusencias: function () {\n'
    + '        responder(respostas.configuracoes.ausencias);\n'
    + '      },\n'
    + '      listarFeriados: function (ano) {\n'
    + '        responder(respostas.configuracoes.feriados[String(ano)]\n'
    + '          || respostas.configuracoes.feriados[respostas.configuracoes.anoDoCalendario]);\n'
    + '      },\n'
    + '      conferirEstruturaDaPlanilha: function () {\n'
    + '        responder(respostas.configuracoes.laudo);\n'
    + '      },\n'
    + '      diagnosticoDoSistema: function () {\n'
    + '        responder(respostas.configuracoes.diagnostico);\n'
    + '      },\n'
    + '      listarAuditoria: function () {\n'
    + '        responder(respostas.configuracoes.trilha);\n'
    + '      },\n'
    + gravacoesRecusadas(['salvarCampo', 'criarCampo', 'reordenarCampos',
      'salvarItemDoCatalogo', 'salvarNivelDeAcesso', 'salvarUsuario',
      'desativarUsuario', 'salvarCanal', 'salvarIdentidade', 'definirLogo',
      'definirSenhaDeAdministrador', 'liberarComSenha', 'salvarCardsDoPainel',
      'editarCaso', 'alterarSituacaoDoCaso', 'salvarComponentesDoPainel',
      'salvarCorretora', 'ocultarCorretora', 'bloquearSusep',
      'desbloquearSusep', 'salvarProduto', 'ocultarProduto',
      'salvarAnalise', 'gerarAnalise', 'ocultarAnalise',
      'salvarConfiguracaoDoLegado', 'importarCasos',
      'salvarConfiguracaoDosCadastros',
      'salvarAusencia', 'excluirAusencia', 'salvarFeriado', 'excluirFeriado'])
    + '    };\n'
    + '  }\n'
    + '\n'
    + '  return novaChamada(null, null);\n'
    + '})() } };\n'
    + '<\/script>\n';
}

function gerar(pastaDeSaida) {
  const { ambiente, chamar } = carregar('ana.martins@exemplo.com');

  // Uma instalação inteira, do zero, igual à que o PO vai rodar no editor.
  chamar('instalarRECC()');

  // Dois casos DE EXEMPLO, só na prévia. O instalador de verdade não semeia
  // dado nenhum — mas uma prévia com a barra dizendo "nenhum registro ainda"
  // não mostraria como a data do último registro se comporta.
  const hoje = new Date();
  const comZero = (n) => (n < 10 ? '0' : '') + n;
  const diasAtras = (dias) => {
    const data = new Date(hoje);
    data.setDate(data.getDate() - dias);
    return comZero(data.getDate()) + '/' + comZero(data.getMonth() + 1)
      + '/' + data.getFullYear();
  };

  // Alguns casos no período ANTERIOR, para os cartões terem com o que
  // comparar — senão a prévia mostraria a variação sempre em branco.
  // ------------------------------------------------------------------ CANAL
  // A Mesa Diamante trata CORRETORA: transmissão de proposta, contato com o
  // corretor, prioridade. Poucos casos, e cada um com nome e sobrenome.
  chamar('inserirVariosRegistros_')('BASE_MESA', [
    { Analista: 'Ana Martins', Status: 'Concluído', Canal: 'E-mail',
      'Data de entrada': diasAtras(44), 'Nome do segurado': 'Caso do mês passado',
      'Data da finalização': diasAtras(43) },
    { Analista: 'Diego Castilho', Status: 'Pendente', Canal: 'Chat',
      'Data de entrada': diasAtras(38), 'Nome do segurado': 'Outro do mês passado' }
  ]);

  chamar('inserirVariosRegistros_')('BASE_MESA', [
    { Analista: 'Ana Martins', Status: 'Transmissão pendente', Canal: 'E-mail',
      'Data de entrada': diasAtras(6), 'Horário': '09:14',
      'Nome do segurado': 'Vanessa Duarte Lima', 'Documento (CPF)': '00012345678',
      Corretora: 'Corretora ABC', SUSEP: '1234567', Ramo: 'Vida',
      Assunto: 'Proposta parada na transmissão há três dias' },
    { Analista: 'Ana Martins', Status: 'Pendente', Canal: 'Chat',
      'Data de entrada': diasAtras(5), 'Horário': '11:02',
      'Nome do segurado': 'Otávio Bandeira', 'Documento (CPF)': '00098765432',
      Corretora: 'Corretora XYZ', Ramo: 'Auto',
      Assunto: 'Corretor pede prioridade na análise' },
    { Analista: 'Diego Castilho', Status: '1º contato realizado', Canal: 'Telefone',
      'Data de entrada': diasAtras(4), 'Horário': '14:36',
      'Nome do segurado': 'Luciana Prado', 'Documento (CPF)': '00033344455',
      Corretora: 'Corretora ABC', SUSEP: '1234567', Ramo: 'Vida',
      Assunto: 'Retorno sobre documentação pendente' },
    { Analista: 'Diego Castilho', Status: '2º contato realizado', Canal: 'Telefone',
      'Data de entrada': diasAtras(3), 'Horário': '10:20',
      'Nome do segurado': 'Beatriz Nogueira', 'Documento (CPF)': '00077788899',
      Corretora: 'Corretora ABC', SUSEP: '1234567', Ramo: 'Residencial',
      Assunto: 'Segunda tentativa — corretor não retornou' },
    { Analista: 'Ana Martins', Status: 'Não trabalhado', Canal: 'Site',
      'Data de entrada': diasAtras(2), 'Horário': '08:45',
      'Nome do segurado': 'Gustavo Rezende', 'Documento (CPF)': '00011122233',
      Corretora: 'Corretora XYZ', Ramo: 'Auto',
      Assunto: 'Entrou hoje, ainda sem tratativa' },
    // De propósito com uma SUSEP que NÃO está no cadastro de canais: é o
    // achado da Tabela de Corretoras, e a prévia precisa mostrá-lo.
    { Analista: 'Diego Castilho', Status: 'Pendente', Canal: 'Corretora',
      'Data de entrada': diasAtras(2), 'Horário': '15:10',
      'Nome do segurado': 'Helena Braga', 'Documento (CPF)': '00044455566',
      Corretora: 'Corretora Sul Atlântico', SUSEP: '8123456', Ramo: 'Vida',
      Assunto: 'Corretora que ainda não está no cadastro' },
    { Analista: 'Ana Martins', Status: 'Concluído', Canal: 'E-mail',
      'Data de entrada': diasAtras(1), 'Horário': '16:47',
      'Nome do segurado': 'Ricardo Costa', 'Documento (CPF)': '00055566677',
      Corretora: 'Corretora ABC', SUSEP: '1234567', Ramo: 'Vida',
      'Data da finalização': diasAtras(1), 'horário da finalização': '17:30',
      Assunto: 'Resolvido no primeiro contato, sem encaminhar' },
    { Analista: 'Diego Castilho', Status: 'Concluído', Canal: 'Ouvidoria',
      'Data de entrada': diasAtras(1), 'Horário': '13:05',
      'Nome do segurado': 'Juliana Prado', 'Documento (CPF)': '00099900011',
      Corretora: 'Corretora XYZ', Ramo: 'Vida',
      'Data da finalização': diasAtras(1), 'Área responsável': 'Sinistro',
      Assunto: 'Encaminhado para Sinistro' }
  ]);

  // ------------------------------------------------------------------- RET
  // A RET trata RETENÇÃO: o cliente pediu para cancelar, e o analista
  // tenta manter. A demanda é outra, e por isso as colunas são outras —
  // proposta, apólice, prêmio, motivo do cancelamento, tentativas de contato.
  chamar('inserirVariosRegistros_')('BASE_RET', [
    { analista: 'Marcos Vieira', status: 'Concluído',
      'data de recepção do protocolo': diasAtras(41),
      'nome do cliente': 'Retenção do mês passado', protocolo: 'RET-2026-0891' },
    { analista: 'Patrícia Nunes', status: 'Pendente',
      'data de recepção do protocolo': diasAtras(36),
      'nome do cliente': 'Outra do mês passado', protocolo: 'RET-2026-0892' }
  ]);

  chamar('inserirVariosRegistros_')('BASE_RET', [
    {
      'data de recepção do protocolo': diasAtras(7), analista: 'Ana Martins',
      SUSEP: '1234567', segmento: 'Diamante',
      'Código origem da proposta': '0000000101', 'número da proposta': '0000010024',
      'nome do cliente': 'Cliente Fictício 024', 'cod produto': '0000000031',
      produto: 'Prestamista', grupo: 'Vida', sistema: 'SIVIDA',
      'valor do prêmio': 1284.9, 'valor do prêmio retido': 1284.9,
      'prêmio mensal retido': 107.08, canal: 'Corretora',
      protocolo: 'RET-2026-1024', cod_sucursal: '0000000012', cod_ramo: '0000000993',
      Num_apolice: '0000020024', CPF: '00900000001', status: 'Concluído',
      'Forma de pagamento': 'Débito em conta',
      'motivo do cancelamento': 'Outros', 'e-mail': 'cliente24@example.invalid',
      'telefones de contato': '11900000024', 'tentativas de contato': 2,
      'data da transmissão': diasAtras(2),
      descrição: 'Cliente aceitou manter com desconto na renovação.'
    },
    {
      'data de recepção do protocolo': diasAtras(6), analista: 'Patrícia Nunes',
      SUSEP: '7654321', segmento: 'Demais corretoras',
      'Código origem da proposta': '0000000102', 'número da proposta': '0000010023',
      'nome do cliente': 'Cliente Fictício 023', 'cod produto': '0000000032',
      produto: 'Vida Coletiva', grupo: 'Vida', sistema: 'SIVIDA',
      'valor do prêmio': 3410.5, 'valor do prêmio retido': 0,
      'prêmio mensal retido': 0, canal: 'Telefone',
      protocolo: 'RET-2026-1023', cod_sucursal: '0000000012', cod_ramo: '0000000993',
      Num_apolice: '0000020023', CPF: '00900000002', status: 'Não trabalhado',
      'Forma de pagamento': 'Boleto',
      'motivo do cancelamento': 'Coberturas', 'e-mail': 'cliente23@example.invalid',
      'telefones de contato': '11900000023', 'tentativas de contato': 0,
      descrição: 'Entrou na fila hoje, sem contato ainda.'
    },
    {
      'data de recepção do protocolo': diasAtras(5), analista: 'Marcos Vieira',
      SUSEP: '1234567', segmento: 'Diamante',
      'Código origem da proposta': '0000000103', 'número da proposta': '0000010022',
      'nome do cliente': 'Cliente Fictício 022', 'cod produto': '0000000033',
      produto: 'Vida Individual', grupo: 'Vida', sistema: 'SIVIDA',
      'valor do prêmio': 890, 'valor do prêmio retido': 0,
      'prêmio mensal retido': 0, canal: 'E-mail',
      protocolo: 'RET-2026-1022', cod_sucursal: '0000000012', cod_ramo: '0000000993',
      Num_apolice: '0000020022', CPF: '00900000003', status: '2º contato realizado',
      'Forma de pagamento': 'Cartão de crédito',
      'motivo do cancelamento': 'Dificuldade financeira',
      'e-mail': 'cliente22@example.invalid',
      'telefones de contato': '11900000022', 'tentativas de contato': 1,
      descrição: 'Cliente pediu para retornar na segunda-feira.'
    },
    {
      'data de recepção do protocolo': diasAtras(4), analista: 'Ana Martins',
      SUSEP: '1234567', segmento: 'Diamante',
      'Código origem da proposta': '0000000104', 'número da proposta': '0000010021',
      'nome do cliente': 'Cliente Fictício 021', 'cod produto': '0000000031',
      produto: 'Prestamista', grupo: 'Vida', sistema: 'SIVIDA',
      'valor do prêmio': 2140.75, 'valor do prêmio retido': 2140.75,
      'prêmio mensal retido': 178.4, canal: 'Corretora',
      protocolo: 'RET-2026-1021', cod_sucursal: '0000000012', cod_ramo: '0000000993',
      Num_apolice: '0000020021', CPF: '00900000004', status: '1º contato realizado',
      'Forma de pagamento': 'PIX',
      'motivo do cancelamento': 'Aumento do prêmio na renovação',
      'e-mail': 'cliente21@example.invalid',
      'telefones de contato': '11900000021', 'tentativas de contato': 3,
      descrição: 'Negociação em andamento com a área comercial.'
    },
    {
      'data de recepção do protocolo': diasAtras(3), analista: 'Marcos Vieira',
      SUSEP: '7654321', segmento: 'Demais corretoras',
      'Código origem da proposta': '0000000105', 'número da proposta': '0000010020',
      'nome do cliente': 'Cliente Fictício 020', 'cod produto': '0000000032',
      produto: 'Vida Coletiva', grupo: 'Vida', sistema: 'SIVIDA',
      'valor do prêmio': 5620, 'valor do prêmio retido': 0,
      'prêmio mensal retido': 0, canal: 'Ouvidoria',
      protocolo: 'RET-2026-1020', cod_sucursal: '0000000012', cod_ramo: '0000000993',
      Num_apolice: '0000020020', CPF: '00900000005', status: 'Pendente',
      'Forma de pagamento': 'Boleto',
      'motivo do cancelamento': 'Proposta de concorrente',
      'e-mail': 'cliente20@example.invalid',
      'telefones de contato': '11900000020', 'tentativas de contato': 2,
      descrição: 'Enviada proposta de contraoferta; aguardando resposta.'
    },
    {
      'data de recepção do protocolo': diasAtras(2), analista: 'Ana Martins',
      SUSEP: '1234567', segmento: 'Diamante',
      'Código origem da proposta': '0000000106', 'número da proposta': '0000010019',
      'nome do cliente': 'Cliente Fictício 019', 'cod produto': '0000000033',
      produto: 'Vida Individual', grupo: 'Vida', sistema: 'SIVIDA',
      'valor do prêmio': 1180.4, 'valor do prêmio retido': 1180.4,
      'prêmio mensal retido': 98.37, canal: 'Site',
      protocolo: 'RET-2026-1019', cod_sucursal: '0000000012', cod_ramo: '0000000993',
      Num_apolice: '0000020019', CPF: '00900000006', status: 'Concluído',
      'Forma de pagamento': 'Débito em conta',
      'motivo do cancelamento': 'Portabilidade',
      'e-mail': 'cliente19@example.invalid',
      'telefones de contato': '11900000019', 'tentativas de contato': 1,
      'data da transmissão': diasAtras(1),
      'Novo cod origem proposta': '0000000201', 'novo numero da proposta': '0000010119',
      descrição: 'Portabilidade revertida; nova proposta emitida.'
    },
    {
      'data de recepção do protocolo': diasAtras(1), analista: 'Marcos Vieira',
      SUSEP: '1234567', segmento: 'Diamante',
      'Código origem da proposta': '0000000107', 'número da proposta': '0000010018',
      'nome do cliente': 'Cliente Fictício 018', 'cod produto': '0000000031',
      produto: 'Prestamista', grupo: 'Vida', sistema: 'SIVIDA',
      'valor do prêmio': 760.2, 'valor do prêmio retido': 0,
      'prêmio mensal retido': 0, canal: 'URA',
      protocolo: 'RET-2026-1018', cod_sucursal: '0000000012', cod_ramo: '0000000993',
      Num_apolice: '0000020018', CPF: '00900000007', status: 'Aguardando transmissão',
      'Forma de pagamento': 'Boleto',
      'motivo do cancelamento': 'Insatisfação com atendimento',
      'e-mail': 'cliente18@example.invalid',
      'telefones de contato': '11900000018', 'tentativas de contato': 0,
      descrição: 'Chegou pela URA; sem tratativa até agora.'
    }
  ]);

  // A história de cada caso. Na prévia os casos entram direto na base, sem
  // passar pelo cadastro — então a trilha ficaria vazia, e o modal abriria
  // sem histórico nenhum. Aqui escrevemos os passos que o cadastro teria
  // escrito, para a prévia mostrar como a tela fica com um caso vivido.
  const donos = chamar('lerRegistros_("USUARIOS")');
  const porNome = {};
  donos.forEach((usuario) => { porNome[usuario.Nome] = usuario.Id; });

  [['BASE_RET', 'analista'], ['BASE_MESA', 'Analista']].forEach(([aba, coluna]) => {
    chamar('lerRegistros_')(aba).forEach((caso) => {
      chamar('inserirRegistro_')('AUDITORIA', {
        DataHora: new Date(), UsuarioId: porNome[caso[coluna]] || '',
        Acao: 'caso.criar', Entidade: aba, RegistroId: caso.__id, Detalhe: aba
      });
      if (String(caso.status || caso.Status || '').indexOf('Conclu') === 0) {
        chamar('inserirRegistro_')('AUDITORIA', {
          DataHora: new Date(), UsuarioId: porNome[caso[coluna]] || '',
          Acao: 'caso.status', Entidade: aba, RegistroId: caso.__id,
          Detalhe: 'de "1º contato realizado" para "Concluído"'
        });
      }
    });
  });

  // Nome, cargo e canal de EXEMPLO, para a barra superior mostrar como fica
  // na operação. O instalador cria o primeiro administrador com o nome tirado
  // do e-mail, e quem ajusta depois é o próprio administrador.
  const eu = chamar('usuarioAtual_()').usuario;
  const cargo = chamar('lerRegistros_("CATALOGO")')
    .find((item) => item.Tipo === 'CARGO' && item.Nome === 'Analista RET');
  chamar('atualizarRegistro_')('USUARIOS', eu.Id, {
    Nome: 'Ana Martins',
    CargoId: cargo.Id,
    'Canal que atende': 'Vida Individual'
  });

  // Os outros analistas, para os seletores de responsável terem gente dentro.
  // Só na prévia: o instalador de verdade cadastra um administrador e mais
  // ninguém — quem cadastra o time é o administrador, em Configurações.
  const nivelOperacao = chamar('lerRegistros_("CATALOGO")')
    .find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
  [['Diego Castilho', 'diego@exemplo.com', 'Corretoras Diamante'],
   ['Marcos Vieira', 'marcos@exemplo.com', 'Vida Individual'],
   ['Patrícia Nunes', 'patricia@exemplo.com', 'Vida Coletiva']]
    .forEach(([nome, email, canal]) => {
      chamar('salvarUsuario')({
        nome, email, canalQueAtende: canal,
        nivelAcessoId: nivelOperacao.Id, ativo: true
      });
    });

  const pacote = chamar('pacoteDePartida()');

  // O formulário de cado canal e alguns exemplos de SUSEP, para a tela de
  // cadastro funcionar de verdade dentro da prévia.
  chamar('inserirRegistro_')('CORRETORAS', {
    Nome: 'Corretora ABC', Canal: 'Corretora', SUSEP: '1234567',
    Corretora: 'Corretora ABC', Segmento: 'Diamante'
  });
  chamar('inserirVariosRegistros_')('CORRETORAS', [
    { Nome: 'Marina Alencar', Canal: 'Corretora', SUSEP: '2345678',
      Corretora: 'Corretora Horizonte', Segmento: 'Diamante' },
    { Nome: 'Posto Central', Canal: 'Agente', SUSEP: '3456789',
      Corretora: 'Agência Central', Segmento: 'Demais corretoras' },
    { Nome: '', Canal: 'Corretora', SUSEP: '4567890',
      Corretora: 'Corretora Novo Norte', Segmento: 'Demais corretoras' }
  ]);
  chamar('inserirVariosRegistros_')('PRODUTOS', [
    { Produto: 'Prestamista', CodigoProduto: '0000000031' },
    { Produto: 'Vida Individual', CodigoProduto: '0000000033' },
    { Produto: 'Vida Coletiva', CodigoProduto: '0000000032' }
  ]);
  chamar('inserirRegistro_')('SUSEP_BLOQUEADAS', {
    SUSEP: '7654321', NomeCorretora: 'Corretora XYZ',
    Motivo: 'CPF reincidente em três propostas no mesmo mês',
    CpfReincidente: '00011122233', BloqueadaEm: new Date()
  });

  const formularios = {};
  const paineis = {};
  pacote.canais.forEach((canal) => {
    formularios[canal.id] = chamar('formularioDoCanal')(canal.id);

    // O painel sem filtro, e uma variação por opção de cada filtro. Guardar
    // só o que muda (cartões, fila e totais) evita repetir as listas de
    // opções em dezenas de cópias.
    const base = chamar('resumoDoCanal')(canal.id, {});
    const variantes = {};
    base.filtrosDisponiveis.forEach((filtro) => {
      filtro.opcoes.forEach((opcao) => {
        const escolha = {};
        escolha[filtro.chave] = opcao.valor;
        const resumo = chamar('resumoDoCanal')(canal.id, escolha);
        variantes[filtro.chave + '=' + opcao.valor] = {
          cartoes: resumo.cartoes, fila: resumo.fila, total: resumo.total
        };
      });
    });

    const detalhes = {};
    const paraEditar = {};
    const situacoes = {};
    base.fila.forEach((caso) => {
      detalhes[caso.id] = chamar('detalhesDoCaso')(canal.id, caso.id);
      paraEditar[caso.id] = chamar('casoParaEditar')(canal.id, caso.id);
      situacoes[caso.id] = chamar('situacoesParaTrocar')(canal.id, caso.id);
    });

    paineis[canal.id] = { base, variantes, detalhes, paraEditar, situacoes };
  });
  const suseps = {
    '1234567': chamar('consultarSusep')('1234567'),
    '7654321': chamar('consultarSusep')('7654321')
  };

  // Uma senha de administrador, só na prévia, para o diálogo das ações sem
  // desfazer aparecer. O instalador de verdade não define senha nenhuma —
  // quem define é o primeiro administrador, na própria tela.
  chamar('definirSenhaDeAdministrador_')('previa-do-recc', '');

  // A tela de Configurações, respondida pelo servidor de verdade.
  const opcoesDeCampo = chamar('opcoesDeConfiguracaoDeCampo()');
  const camposPorCanal = {};
  pacote.canais.forEach((canal) => {
    camposPorCanal[canal.id] = chamar('listarCamposDoCanal')(canal.id);
  });
  const listas = {};
  opcoesDeCampo.tiposDeCatalogo.forEach((tipo) => {
    listas[tipo] = chamar('listarCatalogo')(tipo, '');
  });

  const cards = {};
  const opcoesDoGrafico = {};
  const componentes = {};
  const importacao = {};
  pacote.canais.forEach((canal) => {
    cards[canal.id] = chamar('listarCardsDoPainel')('trabalho', canal.id);
    opcoesDoGrafico[canal.id] = chamar('opcoesDosGraficos')(canal.id);
    componentes[canal.id] = chamar('listarComponentesDoPainel')(canal.id);
    importacao[canal.id] = chamar('opcoesDaImportacaoDeCasos')(canal.id);
  });

  const calendarioPorAno = {};
  chamar('listarFeriados()').anos.forEach((ano) => {
    calendarioPorAno[String(ano)] = chamar('listarFeriados')(ano);
  });

  const configuracoes = {
    cards: cards,
    cadastros: chamar('configuracaoDosCadastros()'),
    resumo: chamar('resumoDasConfiguracoes()'),
    opcoesDeCampo: opcoesDeCampo,
    opcoesDeNivel: chamar('opcoesDeNivelDeAcesso()'),
    campos: camposPorCanal,
    usuarios: chamar('listarUsuarios()'),
    niveis: chamar('listarNiveisDeAcesso()'),
    listas: listas,
    canais: chamar('listarCanaisConfiguraveis()'),
    laudo: chamar('conferirEstruturaDaPlanilha()'),
    trilha: chamar('listarAuditoria')(40),
    opcoesDoGrafico: opcoesDoGrafico,
    componentes: componentes,
    opcoesDeAnalise: chamar('opcoesDeAnalise()'),
    analises: chamar('listarAnalises()'),
    ausencias: chamar('listarAusencias()'),
    // Os TRÊS anos que o seletor oferece, e não só o corrente: na prévia não
    // há servidor para responder quando alguém troca o ano, e um seletor que
    // não responde é pior que seletor nenhum.
    anoDoCalendario: String((new Date()).getFullYear()),
    feriados: calendarioPorAno,
    diagnostico: chamar('diagnosticoDoSistema()')
  };

  // A busca, com alguns termos já procurados de verdade. A prévia é estática:
  // guardamos a resposta que o servidor deu para cada um.
  const termosDeExemplo = ['ret-2026', 'cliente fictício 021', '00900000001',
    'vanessa', 'corretora abc', '1234567'];
  const resultadosDaBusca = {};
  termosDeExemplo.forEach((termo) => {
    resultadosDaBusca[termo] = chamar('buscarCasos')(termo, [], false);
  });
  const opcoesDaBusca = chamar('opcoesDaBusca()');

  const busca = {
    opcoes: opcoesDaBusca,
    legado: chamar('configuracaoDoLegado()'),
    resultados: resultadosDaBusca,
    origensVazias: opcoesDaBusca.canais.map((canal) => ({
      tipo: 'canal', id: canal.id, nome: canal.nome, icone: canal.icone,
      colunas: [], casos: [], aviso: ''
    }))
  };

  // A Produtividade RECC, calculado de verdade para cado canal — e o
  // detalhamento de cada ponto de cada gráfico, para os cliques funcionarem.
  const paineisAnaliticos = {};
  const detalhesDoPainel = {};
  const exportados = {};
  pacote.canais.forEach((canal) => {
    const analitico = chamar('produtividadeDaEquipe')(canal.id, {}, 30);
    paineisAnaliticos[canal.id] = analitico;
    analitico.componentes.forEach((componente) => {
      exportados[componente.id] =
        chamar('exportarComponente')(canal.id, componente.id, {}, 30);
      componente.pontos.forEach((ponto) => {
        detalhesDoPainel[canal.id + '|' + componente.id + '|' + ponto.chave] =
          chamar('detalharComponente')(canal.id, componente.id, ponto.chave, {}, 30);
      });
    });
  });
  const analitico = {
    paineis: paineisAnaliticos,
    detalhes: detalhesDoPainel,
    exportados: exportados
  };

  // Uma meta na RET, só na prévia, para a barra de progresso ter o que
  // mostrar. O instalador de verdade deixa a meta em zero — canal sem meta
  // declarada não inventa uma.
  chamar('salvarCanal')(Object.assign(
    {}, chamar('listarCanaisConfiguraveis()').find((m) => m.aba === 'BASE_RET'),
    { metaMensalPorPessoa: 40 }));

  // Minha Performance, de quem está entrando na prévia.
  const performance = {};
  pacote.canais.forEach((canal) => {
    performance[canal.id] = chamar('minhaPerformance')(canal.id, 30);
  });

  // Uma dos canais da prévia mostra o aviso de janela parcial, para ele poder
  // ser VISTO. Sem isto, o aviso mais importante do sistema em volume alto
  // seria o único pedaço que ninguém consegue olhar antes de a base crescer.
  const canalDoAviso = pacote.canais[0].id;
  [paineis, analitico.paineis, performance].forEach(() => {});
  performance[canalDoAviso].truncada = true;
  performance[canalDoAviso].linhasLidas = 5000;
  analitico.paineis[canalDoAviso].truncada = true;
  analitico.paineis[canalDoAviso].linhasLidas = 5000;

  // A Tabela de Corretoras, com alguns filtros já respondidos.
  const tabelasDeCorretoras = { '|': chamar('tabelaDeCorretoras')('', '') };
  tabelasDeCorretoras['|'].segmentos.forEach((seg) => {
    tabelasDeCorretoras['|' + seg] = chamar('tabelaDeCorretoras')('', seg);
  });
  const corretoras = {
    tabelas: tabelasDeCorretoras,
    origem: chamar('origemDosCadastros()'),
    produtos: chamar('listarProdutos()'),
    bloqueadas: chamar('listarSusepsBloqueadas()'),
    exportado: chamar('exportarCorretoras')('', ''),
    importacoes: chamar('opcoesDaImportacao()'),
    conferidos: conferenciasDeExemplo(chamar)
  };

  // E a mesma instalação vista por quem não está cadastrado.
  ambiente.definirEmail('nao.cadastrado@exemplo.com');
  const telaSemAcesso = chamar('doGet()').getContent();
  ambiente.definirEmail('ana.martins@exemplo.com');

  const paginaDoSistema = chamar('doGet()').getContent().replace(
    '</head>',
    pontePreparada({
      pacoteDePartida: pacote, formularios, suseps, paineis, configuracoes,
      busca, analitico, performance, corretoras, importacao
    })
      + '</head>');

  fs.mkdirSync(pastaDeSaida, { recursive: true });
  fs.writeFileSync(path.join(pastaDeSaida, 'sistema.html'), paginaDoSistema);
  fs.writeFileSync(path.join(pastaDeSaida, 'sem-acesso.html'), telaSemAcesso);

  console.log('Prévia gerada em ' + pastaDeSaida);
  console.log('  sistema.html    ' + paginaDoSistema.length + ' bytes  ('
    + pacote.menu.length + ' itens de menu, nível ' + pacote.usuario.nivelAcesso
    + ', ' + Object.keys(formularios).length + ' formulários, '
    + Object.keys(paineis).length + ' painéis, '
    + configuracoes.resumo.secoes.length + ' seções de configuração)');
  console.log('  sem-acesso.html ' + telaSemAcesso.length + ' bytes');
  return { paginaDoSistema, telaSemAcesso, pacote };
}

if (require.main === module) {
  gerar(process.argv[2] ? path.resolve(process.argv[2]) : PASTA_PADRAO);
}

module.exports = { gerar };
