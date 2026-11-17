// Fotografa as telas da prévia do Prisma e anota onde está cada item a circular.
// Saída: fotos/<id>.jpg e alvos.json  ({ id: { largura, altura, alvos: [{x,y,w,h}] } })
const fs = require('fs');
const R = '/home/user/pgo_prisma_gestao_operacional_google_planilhas/';
const { carregar } = require(R + 'Evolucao/Testes/ferramentas');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SOH = process.argv[2] ? process.argv[2].split(',') : null;

// Um laudo de importação calculado pelo servidor de verdade (a prévia não confere).
const t = carregar('primeiro.adm@exemplo.com');
t.chamar('instalarRECC()');
const ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
const op = t.chamar('lerRegistros_')('CATALOGO').find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação').Id;
['Ana Martins', 'Diego Castilho', 'Marcos Vieira'].forEach((nome, i) =>
  t.chamar('salvarUsuario')({ nome, email: 'a' + i + '@exemplo.com', nivelAcessoId: op, canalId: ret.id, ativo: true }));
const COLADO = ['CPF\tnome do cliente\tnúmero da proposta\tvalor do prêmio\tmotivo\tstatus\tColuna estranha',
  '10000000001\tMaria Souza\t7-0001234\t1200\tPortabilidade\t\tx',
  '10000000002\tJoão Lima\t7-0001235\t980,50\tCoberturas\tPendente\ty',
  '10000000003\tAna Prado\t7-0001236\t\tOutros\t\tz',
  '10000000004\tPedro Alves\t7-0001237\t450\tOutros\t\tw'].join('\n');
const OPCOES = t.chamar('opcoesDaImportacaoDeCasos')(ret.id);
const LAUDO = t.chamar('conferirImportacaoDeCasos')(ret.id, { fonte: { tipo: 'colado', texto: COLADO } });

const tirarAviso = (p) => p.evaluate(() => { const d = document.getElementById('dialogo-prazo'); if (d) d.remove(); });
const ir = async (p, tela) => { await p.click('[data-tela="' + tela + '"] >> nth=0'); await p.waitForTimeout(1300); await tirarAviso(p); };
const canal = async (p, nome) => { await p.locator('[data-canal]', { hasText: nome }).first().click(); await p.waitForTimeout(1300); await tirarAviso(p); };
const rolar = (p, sel, topo) => p.evaluate(([s, t]) => {
  const e = document.querySelector(s); if (!e) return;
  const alvo = e.getBoundingClientRect().top + window.scrollY - t;
  (document.scrollingElement || document.documentElement).scrollTo(0, alvo);
  const m = document.querySelector('main'); if (m && m.scrollHeight > m.clientHeight) m.scrollTop += e.getBoundingClientRect().top - t;
}, [sel, topo || 110]);

// Cada foto: o que fazer antes, e os itens a circular (na ordem dos números do slide).
const FOTOS = [
  { id: 'sem-acesso', pagina: 'sem-acesso.html', antes: async (p) => {}, alvos: ['text=Você entrou como', 'text=Como conseguir acesso >> xpath=..', 'text=Tentar novamente'] },
  { id: 'visao-geral', antes: async (p) => {}, alvos: ['ul.lateral-itens', '#encolher', '#busca-global', '#recarregar', '.temas', '.rotulo-data', 'header >> text=Ana Martins >> xpath=../..'] },
  { id: 'trabalho-topo', antes: async (p) => { await ir(p, 'trabalho'); }, alvos: ['[data-canal] >> nth=0', ['[data-cartao-da-fila] >> nth=0', '[data-cartao-da-fila] >> nth=-1'], '[data-cartao-da-fila] >> nth=2'] },
  { id: 'trabalho-filtros', antes: async (p) => { await ir(p, 'trabalho'); await rolar(p, '#busca-na-fila', 160); }, alvos: ['#busca-na-fila', '[data-periodo] >> nth=0', '[data-multiplo] >> nth=0', '#limpar-filtros'] },
  { id: 'trabalho-fila', antes: async (p) => { await ir(p, 'trabalho'); await rolar(p, '[data-mostrar]', 200); }, alvos: ['[data-mostrar] >> nth=0 >> xpath=..', '.fila tbody tr >> nth=0 >> td >> nth=0', '[data-trabalhar] >> nth=0', '[data-status-do-caso] >> nth=0', '[data-excluir] >> nth=0'] },
  { id: 'aviso-prazo', antes: async (p) => { await p.reload(); await p.waitForTimeout(2200); }, alvos: ['#dialogo-prazo >> text=Prazo de retorno >> nth=0', '#dialogo-prazo >> text=Trabalhar no caso >> nth=0', '#fechar-aviso-de-prazo'] },
  { id: 'trabalhar-no-caso', antes: async (p) => { await ir(p, 'trabalho'); await p.click('[data-trabalhar] >> nth=0'); await p.waitForTimeout(1500); }, alvos: ['#modal-do-caso input >> nth=0', '#modal-salvar', '#modal-x'] },
  { id: 'alterar-status', antes: async (p) => { await ir(p, 'trabalho'); await p.click('[data-status-do-caso] >> nth=0'); await p.waitForTimeout(800); }, alvos: ['#situacao-nova', '#salvar-situacao', '#cancelar-situacao'] },
  { id: 'excluir', antes: async (p) => { await ir(p, 'trabalho'); await p.click('[data-excluir] >> nth=0'); await p.waitForTimeout(800); }, alvos: ['#dialogo-exclusao >> text=Cancelar', '#dialogo-exclusao >> text=Excluir definitivamente'] },
  { id: 'mesa-sla', antes: async (p) => { await ir(p, 'trabalho'); await canal(p, 'Mesa'); await rolar(p, '.fila tbody', 260); }, alvos: ['.fila tbody tr >> nth=0 >> td >> nth=0', '.fila tbody tr >> nth=1 >> td >> nth=0'] },
  { id: 'mesa-reunioes', antes: async (p) => { await ir(p, 'trabalho'); await canal(p, 'Mesa'); await p.click('[data-aba-do-trabalho="reunioes"]'); await p.waitForTimeout(1300); await rolar(p, '[data-aba-do-trabalho="reunioes"]', 200); }, alvos: ['[data-aba-do-trabalho="reunioes"]', 'main >> text=Registrar reunião >> nth=0', 'main >> text=Abrir >> nth=0'] },
  { id: 'cadastrar', antes: async (p) => { await ir(p, 'cadastrarCaso'); }, alvos: ['[data-canal] >> nth=0', '#campo-dataderecepcaodoprotocolo', '[data-campo]:has(#campo-nomedocliente)', 'main >> text=Falta 1 obrigatório >> nth=0'] },
  { id: 'cadastrar-salvar', antes: async (p) => { await ir(p, 'cadastrarCaso'); await p.fill('#campo-nomedocliente', 'Maria Souza'); await p.fill('#campo-susep', 'RET04D'); await p.locator('#campo-susep').blur(); await p.waitForTimeout(1200); await rolar(p, '#campo-susep', 330); }, alvos: ['[data-campo]:has(#campo-susep)', '#salvar-caso'] },
  { id: 'buscar', antes: async (p) => { await ir(p, 'buscarCaso'); await p.fill('#termo-da-busca', 'RET-2026'); await p.click('#botao-buscar'); await p.waitForTimeout(1500); }, alvos: ['#termo-da-busca', '#onde-procurar', '#botao-buscar', '#resultado-da-busca tbody tr >> nth=0'] },
  { id: 'corretoras', antes: async (p) => { await ir(p, 'tabelaCorretoras'); }, alvos: [['[data-aba-corretoras] >> nth=0', '[data-aba-corretoras] >> nth=-1'], '#procurar-corretora', '#nova-corretora', '[data-cadastrar-susep] >> nth=0'] },
  { id: 'importacao-1', antes: async (p) => { await ir(p, 'importacao'); await canal(p, 'RET'); await p.fill('#texto-colado', COLADO); }, alvos: ['[data-canal] >> nth=0', ['[data-fonte] >> nth=0', '[data-fonte] >> nth=-1'], '#texto-colado', '#conferir-importacao'] },
  { id: 'importacao-2', antes: async (p) => { await importar(p); await rolar(p, '.imp-numeros', 230); }, alvos: ['.imp-numeros', '.importacao-depara tbody tr >> nth=0 >> .imp-escolha', '[data-etiqueta-da-coluna="0"]', '.imp-barra'] },
  { id: 'importacao-3', antes: async (p) => { await importar(p); await p.click('[data-analista="Ana Martins"]'); await p.click('[data-analista="Diego Castilho"]'); await p.waitForTimeout(300); await rolar(p, '.imp-quadros', 140); }, alvos: ['#nome-do-lote', '.imp-pessoas', '#status-do-lote', '#agendar-dias', '#importar-agora'] },
  { id: 'produtividade', antes: async (p) => { await ir(p, 'produtividade'); }, alvos: ['[data-canal] >> nth=0', '[data-periodo] >> nth=0', '#exportar-relatorio', '#analitico .cartoes, #analitico [data-cartao-total] >> nth=0'] },
  { id: 'produtividade-prazos', antes: async (p) => { await ir(p, 'produtividade'); await rolar(p, '#titulo-dos-prazos', 120); }, alvos: ['[data-prazo] >> nth=0', 'main >> text=Passaram do prazo >> nth=0', '[data-tabela] >> nth=0'] },
  { id: 'exportar', antes: async (p) => { await ir(p, 'produtividade'); await p.click('#exportar-relatorio'); await p.waitForTimeout(1000); }, alvos: ['select:visible >> nth=-1', 'text=Casos que vieram da Central', 'text=Marcar todas', 'button:has-text("Conferir") >> nth=-1'] },
  { id: 'config', antes: async (p) => { await ir(p, 'configuracoes'); }, alvos: ['#config-secoes', '#canal-da-config', '#novo-campo', '#busca-de-campos', '[data-campo] >> nth=0'] },
  { id: 'config-usuarios', antes: async (p) => { await ir(p, 'configuracoes'); await p.click('[data-secao="usuarios"]'); await p.waitForTimeout(900); }, alvos: ['[data-secao="usuarios"]', '#novo-usuario', '[data-usuario] >> nth=0'] },
  { id: 'config-usuario-form', antes: async (p) => { await ir(p, 'configuracoes'); await p.click('[data-secao="usuarios"]'); await p.waitForTimeout(900); await p.click('[data-usuario] >> nth=0'); await p.waitForTimeout(900); }, alvos: ['#form-usuario input >> nth=1', '#form-usuario select >> nth=0', '#form-usuario select >> nth=2', '#form-usuario >> text=Pode entrar'] },
  { id: 'config-listas', antes: async (p) => { await ir(p, 'configuracoes'); await p.click('[data-secao="catalogo"]'); await p.waitForTimeout(900); }, alvos: ['[data-secao="catalogo"]', '#config-lista select >> nth=0', 'text=Novo item', 'main >> text=Subscrição >> nth=0'] },
  { id: 'config-paineis', antes: async (p) => { await ir(p, 'configuracoes'); await p.click('[data-secao="paineis"]'); await p.waitForTimeout(900); }, alvos: ['[data-secao="paineis"]', ['text=Cards do Trabalho', 'text=Cartões da Produtividade RECC'], 'main >> text=Nome do card >> xpath=..'] },
  { id: 'config-sinalizadores', antes: async (p) => { await ir(p, 'configuracoes'); await p.click('[data-secao="sinalizadores"]'); await p.waitForTimeout(900); }, alvos: ['[data-secao="sinalizadores"]', 'text=Novo sinalizador', 'main >> text=Prazo de retorno >> nth=0'] },
];

async function importar(p) {
  await ir(p, 'importacao'); await canal(p, 'RET');
  await p.evaluate(([laudo, opcoes]) => {
    const original = google.script.run;
    function chamada(ok, erro) {
      const base = original.withSuccessHandler(ok || function () {}).withFailureHandler(erro || function () {});
      return new Proxy({}, { get(_, nome) {
        if (nome === 'withSuccessHandler') return (f) => chamada(f, erro);
        if (nome === 'withFailureHandler') return (f) => chamada(ok, f);
        if (nome === 'conferirImportacaoDeCasos') return () => setTimeout(() => ok(laudo), 60);
        if (nome === 'opcoesDaImportacaoDeCasos') return () => setTimeout(() => ok(opcoes), 60);
        return base[nome];
      } });
    }
    google.script.run = chamada(null, null);
  }, [LAUDO, OPCOES]);
  await canal(p, 'Mesa'); await canal(p, 'RET');
  await p.fill('#texto-colado', COLADO);
  await p.click('#conferir-importacao');
  await p.waitForSelector('#importar-agora', { timeout: 15000 });
  if (await p.locator('#confirmar-aviso').count()) await p.click('#confirmar-aviso');
  await p.waitForTimeout(500);
}

(async () => {
  fs.mkdirSync(__dirname + '/fotos', { recursive: true });
  const arquivo = __dirname + '/alvos.json';
  const saida = fs.existsSync(arquivo) ? JSON.parse(fs.readFileSync(arquivo)) : {};
  const b = await chromium.launch({ args: ['--lang=pt-BR'], env: Object.assign({}, process.env, { LANG: 'pt_BR.UTF-8', LANGUAGE: 'pt_BR' }) });
  for (const foto of FOTOS) {
    if (SOH && SOH.indexOf(foto.id) < 0) continue;
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    const p = await ctx.newPage();
    await p.goto('file://' + R + 'Evolucao/previa/' + (foto.pagina || 'sistema.html'));
    await p.waitForTimeout(2000);
    if (foto.id !== 'aviso-prazo') await tirarAviso(p);
    try {
      await foto.antes(p);
      await p.mouse.move(0, 899);
      await p.waitForTimeout(300);
      const alvos = [];
      for (const sel of foto.alvos) {
        let caixa = null;
        if (Array.isArray(sel)) {
          const cs = []; for (const um of sel) { const c = await p.locator(um).first().boundingBox({ timeout: 2000 }).catch(() => null); if (c) cs.push(c); }
          if (cs.length) { const x = Math.min(...cs.map(c => c.x)), y = Math.min(...cs.map(c => c.y));
            caixa = { x, y, width: Math.max(...cs.map(c => c.x + c.width)) - x, height: Math.max(...cs.map(c => c.y + c.height)) - y }; }
        } else caixa = await p.locator(sel).first().boundingBox({ timeout: 2000 }).catch(() => null);
        if (!caixa) console.log('  sem alvo:', foto.id, sel);
        alvos.push(caixa);
      }
      await p.screenshot({ path: __dirname + '/fotos/' + foto.id + '.jpg', type: 'jpeg', quality: 86 });
      saida[foto.id] = { largura: 1440, altura: 900, alvos };
      console.log('ok', foto.id);
    } catch (e) { console.log('ERRO', foto.id, e.message.split('\n')[0]); }
    await ctx.close();
  }
  fs.writeFileSync(arquivo, JSON.stringify(saida, null, 1));
  await b.close();
})();
