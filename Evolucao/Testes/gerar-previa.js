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
    + '    return {\n'
    + '      withSuccessHandler: function (f) { return novaChamada(f, aoDarErrado); },\n'
    + '      withFailureHandler: function (f) { return novaChamada(aoDarCerto, f); },\n'
    + '      pacoteDePartida: function () { responder(respostas.pacoteDePartida); },\n'
    + '      salvarTemaDoUsuario: function (tema) { responder(tema); },\n'
    + '      formularioDaMesa: function (idDaMesa) {\n'
    + '        responder(respostas.formularios[idDaMesa]);\n'
    + '      },\n'
    + '      consultarSusep: function (susep) {\n'
    + '        var digitos = String(susep || "").replace(/\\D/g, "");\n'
    + '        responder(respostas.suseps[digitos] || {\n'
    + '          situacao: "NAO_ENCONTRADA", segmento: "Não encontrado",\n'
    + '          mensagem: "SUSEP não encontrada no cadastro de canais"\n'
    + '        });\n'
    + '      },\n'
    + '      resumoDaMesa: function (idDaMesa, filtros) {\n'
    + '        var painel = respostas.paineis[idDaMesa];\n'
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
    + '      detalhesDoCaso: function (idDaMesa, idDoCaso) {\n'
    + '        responder(respostas.paineis[idDaMesa].detalhes[idDoCaso]);\n'
    + '      },\n'
    + '      ocultarCaso: function () {\n'
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
    + '      }\n'
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
      Assunto: 'Cliente pediu revisão do prêmio na renovação' },
    { Analista: 'Ana Martins', Status: 'Pendente', Canal: 'Chat',
      'Data de entrada': diasAtras(5), 'Horário': '11:02',
      'Nome do segurado': 'Otávio Bandeira', 'Documento (CPF)': '00098765432',
      Corretora: 'Corretora XYZ', Ramo: 'Auto' },
    { Analista: 'Diego Castilho', Status: '1º contato realizado', Canal: 'Telefone',
      'Data de entrada': diasAtras(4), 'Horário': '14:36',
      'Nome do segurado': 'Luciana Prado', Corretora: 'Corretora ABC', Ramo: 'Vida' },
    { Analista: 'Diego Castilho', Status: '2º contato realizado', Canal: 'Telefone',
      'Data de entrada': diasAtras(3), 'Horário': '10:20',
      'Nome do segurado': 'Beatriz Nogueira', Corretora: 'Corretora ABC',
      Ramo: 'Residencial' },
    { Analista: 'Ana Martins', Status: 'Não trabalhado', Canal: 'Site',
      'Data de entrada': diasAtras(2), 'Horário': '08:45',
      'Nome do segurado': 'Gustavo Rezende', Corretora: 'Corretora XYZ', Ramo: 'Auto' },
    { Analista: 'Ana Martins', Status: 'Concluído', Canal: 'E-mail',
      'Data de entrada': diasAtras(1), 'Horário': '16:47',
      'Nome do segurado': 'Ricardo Costa', Corretora: 'Corretora ABC', Ramo: 'Vida',
      'Data da finalização': diasAtras(1), 'horário da finalização': '17:30',
      Assunto: 'Resolvido no primeiro contato, sem encaminhar' },
    { Analista: 'Diego Castilho', Status: 'Concluído', Canal: 'Ouvidoria',
      'Data de entrada': diasAtras(1), 'Horário': '13:05',
      'Nome do segurado': 'Juliana Prado', Corretora: 'Corretora XYZ', Ramo: 'Vida',
      'Data da finalização': diasAtras(1), 'Área responsável': 'Sinistro' }
  ]);

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

  const pacote = chamar('pacoteDePartida()');

  // O formulário de cada mesa e alguns exemplos de SUSEP, para a tela de
  // cadastro funcionar de verdade dentro da prévia.
  chamar('inserirRegistro_')('CANAIS', {
    Nome: 'Corretora ABC', Canal: 'Corretora', SUSEP: '1234567',
    Corretora: 'Corretora ABC', Segmento: 'Diamante'
  });
  chamar('inserirRegistro_')('SUSEP_BLOQUEADAS', {
    SUSEP: '7654321', NomeCorretora: 'Corretora XYZ', Motivo: 'CPF reincidente'
  });

  const formularios = {};
  const paineis = {};
  pacote.mesas.forEach((mesa) => {
    formularios[mesa.id] = chamar('formularioDaMesa')(mesa.id);

    // O painel sem filtro, e uma variação por opção de cada filtro. Guardar
    // só o que muda (cartões, fila e totais) evita repetir as listas de
    // opções em dezenas de cópias.
    const base = chamar('resumoDaMesa')(mesa.id, {});
    const variantes = {};
    base.filtrosDisponiveis.forEach((filtro) => {
      filtro.opcoes.forEach((opcao) => {
        const escolha = {};
        escolha[filtro.chave] = opcao.valor;
        const resumo = chamar('resumoDaMesa')(mesa.id, escolha);
        variantes[filtro.chave + '=' + opcao.valor] = {
          cartoes: resumo.cartoes, fila: resumo.fila, total: resumo.total
        };
      });
    });

    const detalhes = {};
    base.fila.forEach((caso) => {
      detalhes[caso.id] = chamar('detalhesDoCaso')(mesa.id, caso.id);
    });

    paineis[mesa.id] = { base: base, variantes: variantes, detalhes: detalhes };
  });
  const suseps = {
    '1234567': chamar('consultarSusep')('1234567'),
    '7654321': chamar('consultarSusep')('7654321')
  };

  // E a mesma instalação vista por quem não está cadastrado.
  ambiente.definirEmail('nao.cadastrado@exemplo.com');
  const telaSemAcesso = chamar('doGet()').getContent();
  ambiente.definirEmail('ana.martins@exemplo.com');

  const paginaDoSistema = chamar('doGet()').getContent().replace(
    '</head>',
    pontePreparada({ pacoteDePartida: pacote, formularios, suseps, paineis })
      + '</head>');

  fs.mkdirSync(pastaDeSaida, { recursive: true });
  fs.writeFileSync(path.join(pastaDeSaida, 'sistema.html'), paginaDoSistema);
  fs.writeFileSync(path.join(pastaDeSaida, 'sem-acesso.html'), telaSemAcesso);

  console.log('Prévia gerada em ' + pastaDeSaida);
  console.log('  sistema.html    ' + paginaDoSistema.length + ' bytes  ('
    + pacote.menu.length + ' itens de menu, nível ' + pacote.usuario.nivelAcesso
    + ', ' + Object.keys(formularios).length + ' formulários, '
    + Object.keys(paineis).length + ' painéis)');
  console.log('  sem-acesso.html ' + telaSemAcesso.length + ' bytes');
  return { paginaDoSistema, telaSemAcesso, pacote };
}

if (require.main === module) {
  gerar(process.argv[2] ? path.resolve(process.argv[2]) : PASTA_PADRAO);
}

module.exports = { gerar };
