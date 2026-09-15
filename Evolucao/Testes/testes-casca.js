/**
 * ============================================================================
 * RECC — testes-casca.js · a Etapa 3
 * ============================================================================
 * A casca é o que aparece em toda tela: menu lateral, barra superior, os
 * quatro temas e a troca de telas. Os testes aqui cobrem duas frentes:
 *
 *   o que o SERVIDOR entrega — a página montada, com a identidade dentro;
 *   o que o CSS promete      — que nenhum componente escreve cor à mão, que
 *                              é o que faz a troca de tema funcionar inteira.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { carregar, secao, teste, igual, verdadeiro, contem, lanca, lerPeca } =
  require('./ferramentas');
const { gerar } = require('./gerar-previa');

const PASTA_DAS_TELAS = path.join(__dirname, '..', '..', 'Front-End');

/**
 * O texto de uma tela ou de uma peça, pelo nome do arquivo ou da peça.
 *
 * Passa o serviço para lerPeca, das ferramentas: as peças que mais de uma
 * tela usa moram todas no Comuns.html, e nenhum teste daqui precisa saber
 * disso. Aceita 'Moldura' e 'Moldura.html' — os dois.
 */
function lerTela(nome) {
  return lerPeca(nome.replace(/\.html$/, ''));
}

/**
 * Carrega o script de uma tela para chamar as funções dele de verdade.
 *
 * Conferir se o HTML "tem a palavra tal" prova pouco. Chamar a função e olhar
 * o que ela devolve prova o que o usuário vai ver.
 */
function carregarScriptDaTela(nome) {
  // Pega do primeiro <script> ao último </script>: quando a peça vem de
  // dentro do Comuns.html, ela chega com o banner de comentário em volta.
  const bruto = lerTela(nome);
  const fonte = bruto.substring(
    bruto.indexOf('<script>') + '<script>'.length,
    bruto.lastIndexOf('</script>'));
  const contexto = vm.createContext({ console });
  vm.runInContext(fonte, contexto, { filename: nome });
  return contexto;
}

function rodarTestesDaCasca() {
  console.log('\nEtapa 3 — Casca');

  const { ambiente, chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');

  secao('A página que o servidor entrega');

  teste('doGet monta o sistema para quem está cadastrado', () => {
    const html = chamar('doGet()').getContent();
    contem(html, 'id="aplicacao"', 'a casca precisa estar na página');
    contem(html, 'id="lateral"', 'o menu lateral');
    contem(html, 'id="superior"', 'a barra superior');
    verdadeiro(html.indexOf('Seu usuário ainda') < 0,
      'quem está cadastrado não pode receber a tela de bloqueio');
  });

  teste('a identidade chega ao template — o Index a usa no título', () => {
    const html = chamar('doGet()').getContent();
    contem(html, '<title>RECC</title>', 'o título vem de CONFIG');
    contem(html, 'class="carregando-marca">RECC', 'a marca de abertura');
  });

  teste('os estilos e os scripts foram colados na página', () => {
    // No Apps Script não existe importar HTML: o servidor cola um arquivo
    // dentro do outro. Se o incluir falhar, a página sai sem CSS e sem JS.
    const html = chamar('doGet()').getContent();
    contem(html, '<style>', 'os estilos');
    contem(html, 'var Moldura', 'o script da moldura');
    contem(html, 'var Aplicacao', 'o script da aplicação');
    verdadeiro(html.indexOf('incluir(') < 0,
      'nenhum scriptlet pode sobrar sem ser executado');
  });

  teste('o atributo hidden vence o display do CSS', () => {
    // As telas de abertura usam display:grid, que ganha do `hidden` do
    // navegador. Sem esta regra elas continuavam ocupando 100vh cada uma
    // depois de escondidas, e o sistema abria com duas telas mortas acima.
    contem(lerTela('Estilos.html'), '[hidden] { display: none !important; }');
  });

  teste('cada item do menu tem o seu próprio desenho', () => {
    const { Moldura } = carregarScriptDaTela('Moldura');
    const lateral = Moldura.montarLateral(chamar('pacoteDePartida()'), 'dashboard');

    // Só os desenhos dos ITENS: o botão de encolher também tem um svg, e ele
    // não faz parte do conjunto.
    const listaDeItens = lateral.substring(
      lateral.indexOf('lateral-itens'), lateral.indexOf('</ul>'));
    const doMenu = listaDeItens.match(/<svg[\s\S]*?<\/svg>/g) || [];
    igual(doMenu.length, 7, 'um desenho por item do menu');

    const unicos = {};
    doMenu.forEach((d) => { unicos[d] = true; });
    igual(Object.keys(unicos).length, 7,
      'dois itens com o mesmo desenho deixam o menu ilegível');
    doMenu.forEach((d) => {
      contem(d, 'viewBox="0 0 24 24"', 'todos na mesma grade');
      contem(d, 'stroke-width="1.5"', 'todos com a mesma espessura, e fina');
    });
  });

  teste('o menu não usa peso de fonte que canse a vista', () => {
    // Texto grosso em cima de fundo saturado, lido de relance o dia inteiro,
    // cansa. Só o item atual ganha peso.
    const estilos = lerTela('Estilos.html');
    const item = estilos.substring(estilos.indexOf('.lateral-item {'),
      estilos.indexOf('.lateral-item:hover'));
    contem(item, 'font-weight: 400', 'o item comum vai em peso normal');
    const atual = estilos.substring(
      estilos.indexOf('.lateral-item[aria-current="page"]'),
      estilos.indexOf('.lateral-item svg'));
    contem(atual, 'font-weight: 600', 'e o atual em seminegrito, não em negrito');
  });

  secao('Tela estreita');

  teste('nenhuma largura fixa prende a tela num tamanho', () => {
    // O sintoma de tela quebrada no celular é quase sempre o mesmo: alguém
    // escreveu uma largura em pixels que não cabe. Aqui procuramos por isso
    // no CSS inteiro — e as exceções são só as peças que TÊM tamanho próprio
    // (o menu lateral, um ícone, uma bolinha de tema).
    const estilos = lerTela('Estilos.html');
    const largurasFixas = estilos.match(/(?<!max-|min-)width:\s*(\d{3,})px/g) || [];
    const grandesDemais = largurasFixas.filter((achado) => {
      return Number(achado.match(/(\d+)px/)[1]) > 320;
    });
    igual(grandesDemais.length, 0,
      'largura fixa acima de 320px no CSS: ' + grandesDemais.join(', '));
  });

  teste('toda tabela mora dentro de uma caixa que rola', () => {
    // Tabela é a única coisa que legitimamente não cabe num celular. A saída
    // é ela rolar sozinha, dentro da caixa — e nunca a PÁGINA rolar, que
    // arrasta o menu e o cabeçalho junto.
    const pasta = path.join(__dirname, '..', '..', 'Front-End');
    ['Dashboard.html', 'BuscarCaso.html', 'PainelAnalitico.html',
      'Configuracoes.html'].forEach((nome) => {
      const fonte = fs.readFileSync(path.join(pasta, nome), 'utf8');
      const tabelas = (fonte.match(/<table/g) || []).length;
      const caixas = (fonte.match(/rolagem-tabela|rolagem/g) || []).length;
      verdadeiro(tabelas === 0 || caixas >= tabelas,
        nome + ' tem ' + tabelas + ' tabela(s) e ' + caixas + ' caixa(s) de rolagem');
    });
    contem(lerTela('Estilos.html'), '.rolagem-tabela');
  });

  teste('a grade dos gráficos encolhe sozinha, sem media query', () => {
    // `minmax(min(100%, 340px), 1fr)`: numa tela larga cabem dois gráficos
    // lado a lado; numa estreita eles empilham sem ninguém escrever regra.
    // O `min(100%, ...)` é o que impede a coluna de ficar maior que a tela.
    contem(lerTela('Estilos.html'), 'minmax(min(100%, 340px), 1fr)');
  });

  teste('existe uma conferência de responsividade, e ela é um comando', () => {
    // Fora da suíte de propósito: `rodar.js` roda com node puro, sem
    // instalar nada, e essa promessa vale mais que ter tudo num comando só.
    const conferencia = fs.readFileSync(path.join(__dirname,
      'conferir-responsividade.js'), 'utf8');
    contem(conferencia, '320');
    contem(conferencia, 'overflowX', 'ela ignora o que rola de propósito');
    contem(fs.readFileSync(path.join(__dirname, '..', '..', 'README.md'), 'utf8'),
      'conferir-responsividade',
      'e o README diz como rodar');
  });

  secao('Os quatro temas');

  teste('os quatro temas existem e definem as mesmas variáveis', () => {
    const estilos = lerTela('Estilos.html');
    const temas = ['padrao', 'rosa', 'dark', 'brasil'];
    const variaveisPorTema = {};

    temas.forEach((tema) => {
      const marca = tema === 'padrao'
        ? ':root, :root[data-tema="padrao"] {'
        : ':root[data-tema="' + tema + '"] {';
      const inicio = estilos.indexOf(marca);
      verdadeiro(inicio >= 0, 'falta o bloco do tema ' + tema);
      const bloco = estilos.substring(inicio, estilos.indexOf('}', inicio));
      variaveisPorTema[tema] = (bloco.match(/--[a-z-]+:/g) || [])
        .map((v) => v.replace(':', '')).sort();
      verdadeiro(variaveisPorTema[tema].length >= 15,
        'o tema ' + tema + ' define poucas variáveis: '
        + variaveisPorTema[tema].length);
    });

    // O padrão é a referência: todo tema precisa redefinir tudo o que ele
    // define, senão sobra cor do tema anterior ao trocar.
    variaveisPorTema.padrao.forEach((variavel) => {
      temas.slice(1).forEach((tema) => {
        verdadeiro(variaveisPorTema[tema].indexOf(variavel) >= 0,
          'o tema ' + tema + ' não redefine ' + variavel);
      });
    });
  });

  teste('nenhum componente escreve cor à mão — só variável', () => {
    // Esta é a trava da regra escrita no topo do Estilos.html. Uma cor solta
    // num componente sobrevive à troca de tema, e o rosa fica com um pedaço
    // azul. As bolinhas do seletor são a exceção declarada: elas SÃO as
    // amostras das cores, então precisam da cor literal.
    // Os comentários saem ANTES de procurar. Um "#095CA1" escrito num
    // comentário não pinta nada — e é justamente assim que se registra a
    // medição de contraste que levou à escolha da variável. A trava é para
    // cor que a regra usa, não para cor que o comentário cita.
    const estilos = lerTela('Estilos.html').replace(/\/\*[\s\S]*?\*\//g, '');
    const semTokens = estilos.replace(/:root[^{]*\{[\s\S]*?\}/g, '');
    const regras = semTokens.split('}');
    const infratores = [];

    regras.forEach((regra) => {
      const seletor = regra.split('{')[0].trim();
      if (!seletor || seletor.indexOf('.tema-') >= 0) return;
      const cores = (regra.match(/#[0-9A-Fa-f]{3,8}\b/g) || []);
      if (cores.length) infratores.push(seletor.replace(/\s+/g, ' ') + ' → ' + cores.join(' '));
    });

    igual(infratores.length, 0, 'cores fora das variáveis: ' + infratores.join(' | '));
  });

  teste('a cor da operação vale só no tema padrão', () => {
    // Injetar a cor de CONFIG direto em --destaque pintaria os quatro temas:
    // o rosa ficaria com o pilar do usuário azul. Ela entra numa variável que
    // só o tema padrão consome.
    const aplicacao = lerTela('Aplicacao.html');
    contem(aplicacao, "'--cor-da-operacao', pacote.identidade.corPrimaria");
    verdadeiro(aplicacao.indexOf("setProperty(\n            '--destaque'") < 0
      && aplicacao.indexOf("'--destaque',") < 0,
      'a cor da operação não pode ser escrita direto em --destaque');

    const estilos = lerTela('Estilos.html');
    contem(estilos, '--destaque: var(--cor-da-operacao,',
      'só o tema padrão consome a cor da operação');
    ['rosa', 'dark', 'brasil'].forEach((tema) => {
      const inicio = estilos.indexOf(':root[data-tema="' + tema + '"] {');
      const bloco = estilos.substring(inicio, estilos.indexOf('}', inicio));
      verdadeiro(bloco.indexOf('--cor-da-operacao') < 0,
        'o tema ' + tema + ' precisa trazer o próprio destaque');
    });
  });

  teste('a marca do menu usa a logo quando ela existe', () => {
    const moldura = lerTela('Moldura');
    contem(moldura, 'if (identidade.logo)', 'a logo de CONFIG tem prioridade');
    contem(moldura, 'class="escrito"', 'sem logo, o nome faz as vezes dela');
  });

  secao('Guardar o tema escolhido');

  teste('pacoteDePartida devolve o tema, e o padrão é o azul', () => {
    igual(chamar('pacoteDePartida()').tema, 'padrao');
  });

  teste('o tema escolhido é guardado e volta na próxima abertura', () => {
    igual(chamar('salvarTemaDoUsuario')('brasil'), 'brasil');
    igual(chamar('pacoteDePartida()').tema, 'brasil');
    chamar('salvarTemaDoUsuario')('padrao');
  });

  teste('tema desconhecido é recusado, e diz quais existem', () => {
    lanca(() => chamar('salvarTemaDoUsuario')('roxo'),
      'Os temas são padrao, rosa, dark, brasil');
  });

  teste('tema estragado na propriedade cai no padrão em vez de quebrar', () => {
    ambiente.propriedadesDoUsuario.set('RECC_TEMA_ESCOLHIDO', 'lixo');
    igual(chamar('pacoteDePartida()').tema, 'padrao');
  });

  teste('quem não está cadastrado não guarda tema', () => {
    ambiente.definirEmail('estranho@exemplo.com');
    lanca(() => chamar('salvarTemaDoUsuario')('dark'), 'Acesso negado');
    ambiente.definirEmail('primeiro.adm@exemplo.com');
  });

  secao('O menu e a guarda de rota');

  teste('o menu do Administrador traz as sete telas', () => {
    const pacote = chamar('pacoteDePartida()');
    igual(pacote.menu.length, 7);
    igual(pacote.menu[0].tela, 'dashboard');
    igual(pacote.menu[6].titulo, 'Configurações');
  });

  teste('a guarda de rota vive no roteador, não no menu', () => {
    // Esconder o item não impede ninguém de digitar #configuracoes no
    // endereço. Quem barra é o irPara, conferindo contra o menu recebido.
    const aplicacao = lerTela('Aplicacao.html');
    contem(aplicacao, 'if (!Rotas.existe(tela) || !podeVer(tela))',
      'a troca de tela precisa conferir a permissão');
  });

  teste('toda tela do menu tem uma rota correspondente', () => {
    const aplicacao = lerTela('Aplicacao.html');
    chamar('pacoteDePartida()').menu.forEach((item) => {
      contem(aplicacao, item.tela + ': {', 'falta a rota de ' + item.tela);
    });
  });

  secao('A barra superior e o menu');

  teste('a barra superior traz as peças na ordem pedida', () => {
    const { Moldura } = carregarScriptDaTela('Moldura');
    const barra = Moldura.montarSuperior(chamar('pacoteDePartida()'));

    const ordem = [
      ['identidade', 'class="identidade"'],
      ['busca', 'class="busca"'],
      ['bolinhas de cor', 'class="temas"'],
      ['data do último registro', 'class="ultimo-registro'],
      ['pessoa', 'class="pessoa"']
    ];

    let anterior = -1;
    ordem.forEach((peca) => {
      const posicao = barra.indexOf(peca[1]);
      verdadeiro(posicao >= 0, 'falta a peça: ' + peca[0]);
      verdadeiro(posicao > anterior, peca[0] + ' está fora de ordem na barra');
      anterior = posicao;
    });
  });

  teste('a barra mostra a identidade do sistema, não o nome da tela', () => {
    const { Moldura } = carregarScriptDaTela('Moldura');
    const barra = Moldura.montarSuperior(chamar('pacoteDePartida()'));
    contem(barra, 'RECC — Relacionamento Estratégico de Clientes e Corretores');
    contem(barra, 'Porto Seguro', 'a operação vem embaixo');
    verdadeiro(barra.indexOf('Dashboard') < 0,
      'o nome da tela pertence ao conteúdo, não à barra');
  });

  teste('o nome da tela vai para o topo do conteúdo', () => {
    const aplicacao = lerTela('Aplicacao.html');
    contem(aplicacao, 'class="cabecalho-da-tela"');
    contem(aplicacao, 'Moldura.escapar(definicao.titulo)');
  });

  teste('a pessoa aparece com nome e cargo, e o canal quando existe', () => {
    const { Moldura } = carregarScriptDaTela('Moldura');
    const pacote = chamar('pacoteDePartida()');
    pacote.usuario.nome = 'Ana Martins';
    pacote.usuario.cargo = 'Analista RET';
    pacote.usuario.canalQueAtende = 'Vida Individual';

    const barra = Moldura.montarSuperior(pacote);
    contem(barra, '<strong>Ana Martins</strong>');
    contem(barra, 'Analista RET · Vida Individual');
    contem(barra, '>AM<', 'as iniciais no círculo');
  });

  teste('o menu traz o rodapé da plataforma, que vem de CONFIG', () => {
    const { Moldura } = carregarScriptDaTela('Moldura');
    const lateral = Moldura.montarLateral(chamar('pacoteDePartida()'), 'dashboard');
    contem(lateral, 'PGO — Prisma Gestão Operacional');
    contem(lateral, 'by Pelitero labs');
    contem(lateral, 'id="encolher"', 'o botão de encolher fica junto da marca');
    contem(lateral, 'aria-current="page"', 'o item atual precisa se marcar');
  });

  secao('A data do último registro');

  teste('base vazia avisa que ainda não há registro, sem inventar data', () => {
    const informacao = chamar('dataDoUltimoRegistro_()');
    igual(informacao.existe, false);
    igual(informacao.texto, 'Nenhum registro ainda');
  });

  teste('com registro, mostra dia e hora no formato brasileiro', () => {
    chamar('inserirRegistro_')('BASE_MESA', {
      Analista: 'Ana Martins',
      'Data de entrada': '13/09/2026',
      'Horário': '14:32'
    });
    const informacao = chamar('dataDoUltimoRegistro_()');
    igual(informacao.existe, true);
    igual(informacao.texto, '13/09/2026 14:32');
    igual(informacao.canal, 'Mesa Diamante');
  });

  teste('vence o registro mais recente entre os canais', () => {
    chamar('inserirRegistro_')('BASE_RET', {
      analista: 'Diego Castilho',
      'data de recepção do protocolo': '20/09/2026'
    });
    const informacao = chamar('dataDoUltimoRegistro_()');
    igual(informacao.canal, 'RET Vida', 'a RET tem o registro mais novo');
    igual(informacao.texto, '20/09/2026', 'sem hora, mostra só o dia');
  });

  teste('a data do último registro chega no pacote de partida', () => {
    igual(chamar('pacoteDePartida()').ultimoRegistro.texto, '20/09/2026');
  });

  secao('A prévia navegável');

  teste('a prévia é gerada com o pacote de verdade dentro', () => {
    const pasta = fs.mkdtempSync(path.join(require('os').tmpdir(), 'recc-previa-'));
    const gerada = gerar(pasta);

    contem(gerada.paginaDoSistema, 'var google = { script:',
      'a ponte substituta precisa entrar na página');
    contem(gerada.paginaDoSistema, '"disponivel": true',
      'o pacote embutido é o que o servidor devolveu');
    igual(gerada.pacote.menu.length, 7, 'o menu da prévia é o menu de verdade');
    contem(gerada.telaSemAcesso, 'Seu usuário ainda');

    verdadeiro(fs.existsSync(path.join(pasta, 'sistema.html')));
    fs.rmSync(pasta, { recursive: true, force: true });
  });
}

module.exports = { rodarTestesDaCasca };
