// Gera o "Manual do Prisma" em .pptx (abre no Google Apresentações).
const fs = require('fs');
const pptxgen = require('pptxgenjs');
const { applyTheme } = require('/root/.claude/skills/synced/c7e4c598-13b7-4d96-a76e-552037ff45a5_c805e611-e6f8-4821-86bb-6ddff72eccfe/pptx/scripts/apply_theme.js');

const AQUI = __dirname;
const ALVOS = JSON.parse(fs.readFileSync(AQUI + '/alvos.json'));
const ZOOM = JSON.parse(fs.readFileSync(AQUI + '/zoom.json'));
const SAIDA = AQUI + '/Manual-do-Prisma.pptx';

const HEX = { navy: '0B2545', azul: '1A8FE3', laranja: 'E8590C', claro: 'F2F6FA', texto: '1B2433', cinza: '5B6575', dica: 'FFF0E6', branco: 'FFFFFF' };
const THEME = {
  name: 'Prisma', headFontFace: 'Arial', bodyFontFace: 'Arial',
  colors: { dk1: HEX.texto, lt1: HEX.branco, dk2: HEX.navy, lt2: HEX.claro, accent1: HEX.azul, accent2: HEX.laranja,
    accent3: '2E9E5B', accent4: 'D9A400', accent5: 'C62828', accent6: HEX.cinza, hlink: HEX.azul, folHlink: '6A4C93' },
};

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.title = 'Manual do Prisma';
pres.author = 'Pelitero labs';
pres.theme = { headFontFace: 'Arial', bodyFontFace: 'Arial' };
const C = pres.SchemeColor;

/* ------------------------------------------------------------ layouts */
pres.defineSlideMaster({
  title: 'CAPA', background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: 'titulo', type: 'title', x: 0.7, y: 1.55, w: 8.6, h: 1.1, fontSize: 44, bold: true, color: C.background1, align: 'left', valign: 'bottom', margin: 0 }, text: '' } },
    { placeholder: { options: { name: 'sub', type: 'body', x: 0.7, y: 2.8, w: 8.0, h: 1.0, fontSize: 18, color: 'CADCF0', valign: 'top', margin: 0 }, text: '' } },
    { text: { text: 'PGO — Prisma Gestão Operacional · by Pelitero labs', options: { x: 0.7, y: 4.9, w: 8, h: 0.3, fontSize: 11, color: '9FB4CC', margin: 0 } } },
  ],
});
pres.defineSlideMaster({
  title: 'SECAO', background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: 'titulo', type: 'title', x: 0.7, y: 2.0, w: 8.6, h: 0.9, fontSize: 34, bold: true, color: C.background1, align: 'left', valign: 'bottom', margin: 0 }, text: '' } },
    { placeholder: { options: { name: 'sub', type: 'body', x: 0.7, y: 3.0, w: 8.0, h: 0.9, fontSize: 16, color: 'CADCF0', valign: 'top', margin: 0 }, text: '' } },
  ],
});
pres.defineSlideMaster({
  title: 'PASSO', background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: 'titulo', type: 'title', x: 0.35, y: 0.22, w: 9.3, h: 0.6, fontSize: 24, bold: true, color: C.text2, align: 'left', valign: 'middle', margin: 0 }, text: '' } },
    { text: { text: 'Manual do Prisma · versão 1.81', options: { x: 0.35, y: 5.32, w: 5, h: 0.22, fontSize: 9, color: C.accent6, margin: 0 } } },
  ],
  slideNumber: { x: 9.15, y: 5.32, w: 0.5, h: 0.22, fontSize: 9, color: HEX.cinza, align: 'right' },
});

/* ------------------------------------------------------------ peças */
const IMG = { x: 0.35, y: 0.95, w: 5.75 };
IMG.h = IMG.w * 900 / 1440;

function selo(slide, n, x, y, d) {
  d = d || 0.28;
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: C.accent2 }, line: { color: C.background1, width: 1.25 }, objectName: 'Número ' + n });
  slide.addText(String(n), { x, y, w: d, h: d, fontSize: d > 0.3 ? 14 : 11, bold: true, color: C.background1, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
}

function foto(slide, id) {
  const a = ALVOS[id]; if (!a) throw new Error('sem foto ' + id);
  slide.addShape(pres.shapes.RECTANGLE, { x: IMG.x - 0.02, y: IMG.y - 0.02, w: IMG.w + 0.04, h: IMG.h + 0.04, fill: { color: 'D5DEE8' }, line: { color: 'D5DEE8', width: 0.5 }, objectName: 'Moldura' });
  slide.addImage({ path: AQUI + '/fotos/' + id + '-z.jpg', x: IMG.x, y: IMG.y, w: IMG.w, h: IMG.h, altText: 'Tela do Prisma: ' + id });
  const z = ZOOM[id]; const s = IMG.w / z.w;
  const postos = [];
  a.alvos.forEach((c, i) => {
    if (!c) return;
    const pad = 6;
    let x = (c.x - z.x - pad) * s, y = (c.y - z.y - pad) * s, w = (c.width + 2 * pad) * s, h = (c.height + 2 * pad) * s;
    x = Math.max(0.02, x); y = Math.max(0.02, y);
    w = Math.min(w, IMG.w - 0.02 - x); h = Math.min(h, IMG.h - 0.02 - y);
    const longo = w / h > 3.2 || w > 2.4 || h > 1.6;
    const forma = longo ? pres.shapes.ROUNDED_RECTANGLE : pres.shapes.OVAL;
    if (!longo) { const cx = x + w / 2, cy = y + h / 2; w *= 1.18; h *= 1.25; x = cx - w / 2; y = cy - h / 2; }
    const op = { x: IMG.x + x, y: IMG.y + y, w, h, fill: { type: 'none' }, line: { color: C.accent2, width: 2.25 }, objectName: 'Destaque ' + (i + 1) };
    if (longo) op.rectRadius = 0.08;
    slide.addShape(forma, op);
    const dentro = (vx, vy) => [Math.min(Math.max(vx, IMG.x + 0.02), IMG.x + IMG.w - 0.3), Math.min(Math.max(vy, IMG.y + 0.02), IMG.y + IMG.h - 0.3)];
    const X = IMG.x + x, Y = IMG.y + y;
    const cantos = [[X - 0.14, Y - 0.14], [X + w - 0.14, Y - 0.14], [X + w - 0.1, Y + h - 0.2], [X - 0.14, Y + h - 0.2]].map(([a, b]) => dentro(a, b));
    const livre = ([qx, qy]) => !postos.some(([ox, oy]) => Math.abs(ox - qx) < 0.3 && Math.abs(oy - qy) < 0.3);
    let [px, py] = cantos.find(livre) || cantos[0];
    postos.push([px, py]);
    selo(slide, i + 1, px, py);
  });
}

function itens(slide, lista) {
  const x = 6.32, w = 3.33, topo = 0.95, fundo = 4.6;
  const passo = Math.min(1.22, (fundo - topo) / lista.length);
  lista.forEach((it, i) => {
    const y = topo + i * passo;
    selo(slide, i + 1, x, y + 0.02, 0.3);
    slide.addText([
      { text: it[0], options: { bold: true, fontSize: 12.5, color: C.text2, breakLine: true } },
      { text: it[1], options: { fontSize: 11, color: C.text1 } },
    ], { x: x + 0.42, y, w: w - 0.42, h: passo - 0.06, valign: 'top', margin: 0, paraSpaceAfter: 2, isTextBox: true });
  });
}

function dica(slide, texto, alerta) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.35, y: 4.72, w: 9.3, h: 0.5, rectRadius: 0.08, fill: { color: alerta ? 'FDECEC' : HEX.dica }, line: { type: 'none' }, objectName: 'Dica' });
  slide.addText([
    { text: alerta ? 'Atenção: ' : 'Dica: ', options: { bold: true, color: alerta ? C.accent5 : C.accent2 } },
    { text: texto, options: { color: C.text1 } },
  ], { x: 0.5, y: 4.72, w: 9.05, h: 0.5, fontSize: 11.5, valign: 'middle', margin: 0, isTextBox: true });
}

let secao = '';
function passo(titulo, id, lista, textoDaDica, notas, alerta) {
  const s = pres.addSlide({ masterName: 'PASSO', sectionTitle: secao });
  s.addText(titulo, { placeholder: 'titulo' });
  foto(s, id);
  itens(s, lista);
  if (textoDaDica) dica(s, textoDaDica, alerta);
  s.addNotes(notas || lista.map((it, i) => (i + 1) + '. ' + it[0] + ': ' + it[1]).join('\n'));
  return s;
}
function divisor(titulo, sub) {
  pres.addSection({ title: titulo }); secao = titulo;
  const s = pres.addSlide({ masterName: 'SECAO', sectionTitle: secao });
  s.addText(titulo, { placeholder: 'titulo' });
  s.addText(sub, { placeholder: 'sub' });
  return s;
}

/* ------------------------------------------------------------ capa */
pres.addSection({ title: 'Abertura' }); secao = 'Abertura';
{
  const s = pres.addSlide({ masterName: 'CAPA', sectionTitle: secao });
  s.addText('Manual do Prisma', { placeholder: 'titulo' });
  s.addText('Passo a passo, com as telas, para quem usa o sistema no dia a dia e para quem cobre o gestor', { placeholder: 'sub' });
  [[7.55, 0.55, 1.15], [8.55, 1.15, 0.7], [7.95, 3.85, 0.55]].forEach(([x, y, d], i) => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { type: 'none' }, line: { color: C.accent2, width: 2.5 }, objectName: 'Círculo ' + (i + 1) });
  });
  selo(s, 1, 7.45, 0.47, 0.36);
  s.addNotes('Manual de uso do Prisma (PGO), versão 1.81. Parte 1: o dia a dia do analista. Parte 2: o que faz quem cobre o gestor.');
}
{
  const s = pres.addSlide({ masterName: 'PASSO', sectionTitle: secao });
  s.addText('Como ler este manual', { placeholder: 'titulo' });
  const blocos = [
    ['Os círculos laranja mostram onde olhar', 'Cada círculo tem um número. Ele aponta o botão, o campo ou a área da tela de que o texto fala.'],
    ['O texto à direita segue os números', 'Leia na ordem: o item 1 do texto explica o círculo 1, o item 2 explica o círculo 2, e assim por diante.'],
    ['A faixa de baixo traz uma dica', 'Um cuidado ou um atalho que poupa trabalho. Quando a faixa é vermelha, é um aviso importante.'],
  ];
  blocos.forEach((b, i) => {
    const y = 1.05 + i * 1.12;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.35, y, w: 5.6, h: 0.95, rectRadius: 0.1, fill: { color: C.background2 }, line: { type: 'none' }, objectName: 'Bloco ' + (i + 1) });
    selo(s, i + 1, 0.55, y + 0.3, 0.36);
    s.addText([{ text: b[0], options: { bold: true, fontSize: 14, color: C.text2, breakLine: true } }, { text: b[1], options: { fontSize: 12, color: C.text1 } }],
      { x: 1.1, y: y + 0.08, w: 4.7, h: 0.8, valign: 'middle', margin: 0, isTextBox: true });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.3, y: 1.05, w: 3.35, h: 3.19, rectRadius: 0.1, fill: { color: C.text2 }, line: { type: 'none' }, objectName: 'Partes' });
  s.addText([
    { text: 'Parte 1 · O dia a dia', options: { bold: true, fontSize: 15, color: C.background1, breakLine: true } },
    { text: 'Entrar, a tela do Trabalho, os prazos, trabalhar e cadastrar casos, buscar, reuniões da Mesa e corretoras.', options: { fontSize: 12, color: 'CADCF0', breakLine: true } },
    { text: ' ', options: { fontSize: 8, breakLine: true } },
    { text: 'Parte 2 · Para quem cobre o gestor', options: { bold: true, fontSize: 15, color: C.background1, breakLine: true } },
    { text: 'Importação de bases, Produtividade RECC, relatórios e Configurações.', options: { fontSize: 12, color: 'CADCF0' } },
  ], { x: 6.55, y: 1.2, w: 2.9, h: 2.9, valign: 'top', margin: 0, isTextBox: true });
  dica(s, 'Você só vê no menu as telas que o seu nível de acesso permite. Se faltar uma tela, fale com o administrador.');
  s.addNotes('Explique a lógica dos números: círculo na foto = item com o mesmo número no texto.');
}

/* ------------------------------------------------------------ parte 1 */
divisor('Parte 1 · O dia a dia', 'Tudo o que o analista usa para trabalhar os casos');

passo('Entrar no Prisma', 'sem-acesso', [
  ['Abra o link com a sua conta Google', 'O Prisma reconhece você pelo e-mail. Esta tela mostra com qual e-mail você entrou.'],
  ['Apareceu "não está cadastrado"?', 'Peça ao administrador para cadastrar o seu e-mail, informando o seu cargo e o canal que você atende.'],
  ['Depois do cadastro, clique aqui', '"Tentar novamente" abre o sistema. Não precisa entrar de novo.'],
], 'Se a conta mostrada não é a do trabalho, troque de conta no Google e abra o link de novo.');

passo('Conhecendo a tela', 'visao-geral', [
  ['Menu', 'Clique para trocar de tela.'],
  ['Encolher o menu', 'Ganha espaço. Clique de novo para abrir.'],
  ['Busca rápida', 'Digite e aperte Enter para procurar.'],
  ['Atualizar', 'Recarrega os dados da tela.'],
  ['Cores', 'Padrão, Rosa, Escuro ou Brasil.'],
  ['Data de hoje', 'A data que o sistema está usando.'],
  ['Você', 'Seu nome e seu cargo.'],
], 'A busca rápida aceita protocolo, apólice ou nome e abre o Buscar Caso. A cor escolhida fica guardada para você.');

passo('Trabalho: escolha o canal e veja os números', 'trabalho-topo', [
  ['Escolha o canal', 'RET, Mesa Diamante ou VG. A tela inteira passa a mostrar só aquele canal.'],
  ['Os cartões', 'Quantos casos há em cada situação, no período escolhido.'],
  ['Clique num cartão', 'A fila mostra só os casos daquele cartão. Clique de novo (ou em "Total") para ver todos.'],
], 'O número do cartão sempre bate com a quantidade de casos que aparece na fila.');

passo('Trabalho: os filtros', 'trabalho-filtros', [
  ['Busca no canal', 'Digite e aperte Enter. Procura na planilha toda, de qualquer data.'],
  ['Período', '"Por data" (abre do dia 1 do mês até hoje) ou "Por mês".'],
  ['Filtros de lista', 'Marque uma ou várias opções e clique em "Aplicar".'],
  ['Limpar filtros', 'Volta tudo ao começo: busca, listas e período.'],
], 'A fila parece vazia? Veja no canto da caixa "Filtros" quantos casos estão aparecendo: pode ter ficado um filtro ligado.');

passo('Trabalho: a fila de casos', 'trabalho-fila', [
  ['Quantos mostrar', 'A fila abre com os 5 mais recentes. Clique em 10, 20 ou "Todos".'],
  ['Situação', 'O status do caso e o selo do prazo (verde, amarelo ou vermelho).'],
  ['Trabalhar no caso', 'Abre o formulário do caso para editar.'],
  ['Alterar status', 'O jeito rápido de só trocar o status.'],
  ['Excluir', 'Apaga o caso de vez. Use com cuidado.'],
], 'Texto cortado com "…"? Passe o mouse por cima para ler inteiro.');

passo('Os selos de prazo', 'mesa-sla', [
  ['Verde: dentro do prazo', 'Há folga. Na Mesa, o selo do SLA mostra quanto falta para a primeira resposta (6 horas úteis).'],
  ['Amarelo e vermelho', 'Amarelo: está perto de vencer. Vermelho: passou do prazo. Trabalhe primeiro os amarelos.'],
], 'O relógio só conta horas úteis: de segunda a sexta, das 08:15 às 18:30. Na RET o prazo é de 3 dias úteis; na Mesa, 48 horas úteis.',
'Selos: verde = no prazo; amarelo = perto de vencer; vermelho = passou. RET: 3 dias úteis, começa na primeira mudança de status (caso "Não trabalhado" fica com prazo cheio). Mesa: 48 horas úteis desde "Em andamento", para na finalização; SLA de 6 horas úteis até a primeira resposta.');

passo('O aviso de casos perto de vencer', 'aviso-prazo', [
  ['Quanto falta', 'Cada linha mostra um caso no amarelo e quanto tempo ainda resta.'],
  ['Trabalhar no caso', 'Abre o caso direto, sem procurar na fila.'],
  ['Entendi', 'Fecha o aviso e mostra a tela do Trabalho.'],
], 'O aviso aparece uma vez por canal enquanto a página estiver aberta. Ele olha todos os casos abertos, de qualquer data.');

passo('Trabalhar no caso', 'trabalhar-no-caso', [
  ['Os campos já vêm preenchidos', 'Com o que está gravado na planilha. Mude só o que precisa.'],
  ['Salvar alterações', 'Grava, fecha a janela e atualiza a fila.'],
  ['Fechar (X)', 'Sai sem gravar nada.'],
], 'Enquanto grava, o botão mostra três pontinhos. Espere: clicar de novo não adianta.');

passo('Alterar status', 'alterar-status', [
  ['Escolha o novo status', 'Abra a lista e clique no status certo.'],
  ['Salvar', 'Grava na hora. O prazo e os cartões se atualizam.'],
  ['Cancelar', 'Fecha sem mudar nada.'],
], 'Alguns status pedem uma informação a mais. Quando pedem, o campo aparece logo abaixo da lista.');

passo('Excluir um caso', 'excluir', [
  ['Cancelar', 'É o botão que já vem marcado. Enter e Esc também cancelam.'],
  ['Excluir definitivamente', 'Apaga o caso da planilha.'],
], 'Não dá para desfazer pela tela. Na dúvida, não exclua: fale com o gestor.', null, true);

passo('Cadastrar um caso novo', 'cadastrar', [
  ['Escolha o canal', 'O formulário muda conforme o canal.'],
  ['A data já vem com hoje', 'Pode mudar, mas o sistema não aceita data no futuro.'],
  ['Campos com * são obrigatórios', 'Sem eles o caso não é cadastrado.'],
  ['O que falta preencher', 'O aviso diz qual campo falta. O botão "Cadastrar caso" só libera com tudo preenchido.'],
], 'A data aparece no formato dia/mês/ano quando o Chrome está em português.');

passo('Cadastrar: SUSEP e gravar', 'cadastrar-salvar', [
  ['SUSEP', 'Cole do jeito que vier. O selo diz: liberada, bloqueada ou não encontrada, e preenche o nome da corretora.'],
  ['Cadastrar caso', 'Grava e leva você para o Trabalho, onde o caso aparece.'],
], 'Atalho: Ctrl + Enter também cadastra. "Não encontrada" não é erro: só quer dizer que a corretora ainda não está no cadastro.');

passo('Mesa Diamante: reuniões com corretores', 'mesa-reunioes', [
  ['Aba Reuniões', 'No Trabalho, com a Mesa Diamante escolhida.'],
  ['Registrar reunião', 'Data, corretora e assunto são obrigatórios.'],
  ['Abrir', 'Edite a reunião: marque a data de cada report (15, 30 e 45 dias) e troque o status.'],
], 'Também dá para registrar em Cadastrar Caso, com a Mesa escolhida, na aba "Reunião com corretor".');

passo('Buscar um caso', 'buscar', [
  ['O que procurar', 'Protocolo, apólice, proposta, CPF ou nome.'],
  ['Onde procurar', 'Marque os canais em que quer procurar.'],
  ['Buscar', 'Procura em todas as datas, não só no mês.'],
  ['O resultado', 'Cada caso achado tem o botão "Trabalhar no caso".'],
], 'Não precisa digitar pontos e traços: 123.456.789-01 e 12345678901 acham o mesmo caso.');

passo('Tabela de Corretoras', 'corretoras', [
  ['As abas', 'Corretoras Diamante, SUSEPs bloqueadas e Importar.'],
  ['Procurar', 'Por corretora, sucursal, consultor ou SUSEP.'],
  ['Cadastrar corretora', 'Abre o formulário à direita.'],
  ['SUSEPs fora do cadastro', 'Aparecem nos casos mas não estão cadastradas. Clique para cadastrar.'],
], 'SUSEP bloqueada não impede de cadastrar o caso: o selo avisa, e quem atende decide.');

/* ------------------------------------------------------------ parte 2 */
divisor('Parte 2 · Para quem cobre o gestor', 'Importar bases, acompanhar a produtividade e ajustar o sistema');

passo('Importação 1/3: de onde vêm os casos', 'importacao-1', [
  ['Escolha o canal', 'Para onde os casos vão.'],
  ['Colar ou ler pelo link', '"Colar da planilha" ou "Ler outra planilha pelo link".'],
  ['Cole com o cabeçalho', 'Copie da planilha incluindo a primeira linha, a dos nomes das colunas.'],
  ['Conferir antes de importar', 'O sistema lê e mostra como vai ficar. Ainda não grava nada.'],
], 'Nada é gravado antes de você conferir. Os passos no alto mostram em qual etapa você está.');

passo('Importação 2/3: confira as colunas', 'importacao-2', [
  ['Os números', 'Linhas na origem, quantas vão entrar e quantas ficam de fora.'],
  ['Para onde vai cada coluna', 'Ajuste se estiver errado. A caixa "procurar…" ajuda a achar a coluna.'],
  ['A etiqueta', '"ligada" entra; "não entra" fica de fora; "como na última importação" foi lembrada.'],
  ['A faixa do pé', 'Resume o que vai acontecer e tem o botão de importar.'],
], 'Coluna que não interessa? Deixe em "— não trazer —".');

passo('Importação 3/3: opções do lote e importar', 'importacao-3', [
  ['Nome do lote', 'Aparece nos filtros, em "Origem da importação".'],
  ['Dividir entre', 'Marque quem recebe: divide em partes iguais.'],
  ['Status dos casos', 'Vale só para quem veio sem status na planilha.'],
  ['Mudar o status sozinho', 'Opcional: muda depois de X dias corridos.'],
  ['Importar', 'Confirme no aviso que aparece. Pronto.'],
], 'Ninguém marcado em "Dividir entre"? Fica o analista que veio na planilha. Leia a faixa do pé antes de importar.');

passo('Produtividade RECC', 'produtividade', [
  ['Canal', 'Escolha o canal para ver os números.'],
  ['Período', 'Por data ou por mês, igual ao Trabalho.'],
  ['Exportar relatório', 'Baixa os casos num arquivo que abre no Excel.'],
  ['Os cartões', 'O que a equipe entregou: cadastrados, retidos, contatados, pendentes…'],
], 'Para ver uma pessoa só, use o filtro "Analista".');

passo('Produtividade: o controle de prazos', 'produtividade-prazos', [
  ['Os cartões do prazo', 'Quantos casos estão no prazo, vencendo, fora e encerrados.'],
  ['Passaram do prazo', 'Quem deixou estourar, de quem mais para quem menos, e a lista dos casos.'],
  ['Ver os números', 'Mostra a tabela por trás de cada gráfico.'],
], 'Os casos da lista abrem com "Trabalhar no caso", igual ao Trabalho.');

passo('Exportar relatório', 'exportar', [
  ['Período', 'O do relatório. Pode ser diferente do da tela.'],
  ['Qual relatório', 'Escolha um pronto ou "O que está filtrado na tela".'],
  ['As colunas', 'Marque o que vai no arquivo. A escolha fica guardada.'],
  ['Conferir', 'Mostra o resumo. Depois o botão vira "Exportar N casos".'],
], 'O arquivo abre direto no Excel. Se o navegador bloquear o download, o texto aparece logo abaixo para copiar.');

passo('Configurações: como a tela funciona', 'config', [
  ['Os assuntos', 'À esquerda: campos, usuários, listas, painéis, prazos…'],
  ['O canal', 'Escolha de qual canal são os campos.'],
  ['Criar campo', 'Uma pergunta nova no formulário.'],
  ['Procurar campo', 'Acha o campo pelo nome, sem rolar a lista.'],
  ['Clique num item', 'As propriedades dele abrem à direita.'],
], 'Nada é gravado sem apertar "Salvar". Criar coluna na planilha pede a senha de administrador.');

passo('Configurações: usuários', 'config-usuarios', [
  ['Usuários', 'A lista de quem entra no sistema.'],
  ['Cadastrar pessoa', 'Dá acesso a alguém novo pelo e-mail Google dela.'],
  ['Clique numa pessoa', 'Abre os dados dela para mudar.'],
], 'Nova pessoa na equipe? Cadastre aqui antes de ela abrir o link.');

passo('Configurações: os dados da pessoa', 'config-usuario-form', [
  ['E-mail Google', 'É com ele que a pessoa entra.'],
  ['Canal', 'O canal que ela atende (a equipe dela).'],
  ['Nível de acesso', 'Define quais telas e ações ela tem.'],
  ['Pode entrar', 'Desmarque para tirar o acesso ao sistema.'],
], 'Férias? Use "Recebendo casos", logo abaixo: a pessoa continua com acesso, só não recebe lote na importação.');

passo('Configurações: as listas (Ajustes Gerais)', 'config-listas', [
  ['Ajustes Gerais', 'As opções que aparecem nos campos de lista.'],
  ['Escolha a lista', 'Área, motivo, produto, status da reunião…'],
  ['Novo item', 'Acrescenta uma opção à lista.'],
  ['Clique num item', 'Para renomear, desligar ou mudar a ordem.'],
], 'Excluir um item já usado em casos mostra em quantos ele está. Os casos guardam o texto.');

passo('Configurações: os cartões (Painéis)', 'config-paineis', [
  ['Painéis', 'Os cartões que aparecem no alto das telas.'],
  ['Trabalho ou Produtividade', 'Duas listas: o que dá trabalho e o que foi entregue.'],
  ['Cada cartão', 'Nome, o que conta, cor, ordem e "Mostrar".'],
], 'Até 12 cartões por tela. Remover um cartão não apaga nenhum caso.');

passo('Configurações: os prazos (Sinalizadores)', 'config-sinalizadores', [
  ['Sinalizadores', 'Os prazos de cada canal.'],
  ['Novo sinalizador', 'Cria um prazo novo.'],
  ['Clique num prazo', 'Ajuste quantos dias ou horas, e quando o amarelo acende.'],
], 'O sistema recusa prazo zero ligado e amarelo maior que o prazo.');

/* ------------------------------------------------------------ fecho */
pres.addSection({ title: 'Problemas comuns' }); secao = 'Problemas comuns';
{
  const s = pres.addSlide({ masterName: 'PASSO', sectionTitle: secao });
  s.addText('Problemas comuns e o que fazer', { placeholder: 'titulo' });
  const casos = [
    ['Não vejo uma tela no menu', 'O seu nível de acesso não inclui essa tela. Fale com o administrador.'],
    ['O botão de cadastrar está cinza', 'Falta um campo obrigatório (*). O aviso ao lado do botão diz qual.'],
    ['O caso sumiu da fila', 'Confira o período e os filtros, ou procure em Buscar Caso.'],
    ['A tela diz "não está cadastrado"', 'O e-mail ainda não foi liberado. Peça ao administrador.'],
    ['Escolhi o status errado', 'Use "Alterar status" de novo e escolha o certo.'],
    ['A tela parece desatualizada', 'Clique no botão de atualizar, no alto da tela.'],
  ];
  casos.forEach((c, i) => {
    const col = i % 2, lin = Math.floor(i / 2);
    const x = 0.35 + col * 4.7, y = 1.0 + lin * 1.22;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 4.55, h: 1.08, rectRadius: 0.1, fill: { color: C.background2 }, line: { type: 'none' }, objectName: 'Problema ' + (i + 1) });
    selo(s, i + 1, x + 0.18, y + 0.36, 0.36);
    s.addText([{ text: c[0], options: { bold: true, fontSize: 13, color: C.text2, breakLine: true } }, { text: c[1], options: { fontSize: 11.5, color: C.text1 } }],
      { x: x + 0.7, y: y + 0.08, w: 3.7, h: 0.92, valign: 'middle', margin: 0, isTextBox: true });
  });
  s.addNotes('Os problemas mais comuns de quem está começando e a saída de cada um.');
}
{
  const s = pres.addSlide({ masterName: 'SECAO', sectionTitle: secao });
  s.addText('Ficou alguma dúvida?', { placeholder: 'titulo' });
  s.addText('Volte ao slide da tela em que você está e siga os números. Se ainda assim travar, fale com o gestor ou com o administrador do Prisma.', { placeholder: 'sub' });
  s.addNotes('Encerramento.');
}

(async () => {
  await pres.writeFile({ fileName: SAIDA });
  await applyTheme(SAIDA, THEME);
  console.log('ok', SAIDA);
})();
