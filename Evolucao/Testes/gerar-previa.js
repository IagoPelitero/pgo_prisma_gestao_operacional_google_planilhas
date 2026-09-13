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
  chamar('inserirVariosRegistros_')('BASE_MESA', [
    { Analista: 'Ana Martins', Status: 'Pendente',
      'Data de entrada': '12/09/2026', 'Horário': '09:14' },
    { Analista: 'Ana Martins', Status: '1º contato realizado',
      'Data de entrada': '13/09/2026', 'Horário': '16:47' }
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
  pacote.mesas.forEach((mesa) => {
    formularios[mesa.id] = chamar('formularioDaMesa')(mesa.id);
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
    pontePreparada({ pacoteDePartida: pacote, formularios, suseps }) + '</head>');

  fs.mkdirSync(pastaDeSaida, { recursive: true });
  fs.writeFileSync(path.join(pastaDeSaida, 'sistema.html'), paginaDoSistema);
  fs.writeFileSync(path.join(pastaDeSaida, 'sem-acesso.html'), telaSemAcesso);

  console.log('Prévia gerada em ' + pastaDeSaida);
  console.log('  sistema.html    ' + paginaDoSistema.length + ' bytes  ('
    + pacote.menu.length + ' itens de menu, nível ' + pacote.usuario.nivelAcesso
    + ', ' + Object.keys(formularios).length + ' formulários)');
  console.log('  sem-acesso.html ' + telaSemAcesso.length + ' bytes');
  return { paginaDoSistema, telaSemAcesso, pacote };
}

if (require.main === module) {
  gerar(process.argv[2] ? path.resolve(process.argv[2]) : PASTA_PADRAO);
}

module.exports = { gerar };
